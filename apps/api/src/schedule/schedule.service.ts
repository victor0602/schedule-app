import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeService } from "../realtime/realtime.service";
import type { CreateScheduleDto, Schedule } from "@schedule/shared";

@Injectable()
export class ScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async listForUser(userId: string): Promise<Schedule[]> {
    const owned = await this.prisma.schedule.findMany({
      where: { ownerId: userId },
    });
    const memberGroups = await this.prisma.groupMember.findMany({
      where: { userId },
      include: { group: true },
    });
    const shared = await this.prisma.schedule.findMany({
      where: {
        id: { in: memberGroups.map((m) => m.group.scheduleId) },
      },
    });
    // 去重：用户可能同时是 owner 和 group member
    const seen = new Set<string>();
    const unique = [...owned, ...shared].filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
    return unique.map(this.toDto);
  }

  async create(userId: string, dto: CreateScheduleDto): Promise<Schedule> {
    const existing = await this.prisma.schedule.findFirst({
      where: { name: dto.name, ownerId: userId },
    });
    if (existing) {
      throw new ConflictException(`课表「${dto.name}」已存在`);
    }
    const created = await this.prisma.schedule.create({
      data: {
        name: dto.name,
        type: dto.type,
        ownerId: userId,
      },
    });
    return this.toDto(created);
  }

  async getOne(userId: string, id: string): Promise<Schedule> {
    const s = await this.prisma.schedule.findUnique({
      where: { id },
      include: { group: true },
    });
    if (!s) throw new NotFoundException();
    return this.toDto(s);
  }

  async update(
    userId: string,
    id: string,
    patch: { name?: string },
    expectedVersion?: number,
  ): Promise<Schedule> {
    if (patch.name) {
      const existing = await this.prisma.schedule.findFirst({
        where: { name: patch.name, ownerId: userId, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`课表「${patch.name}」已存在`);
      }
    }
    // 乐观锁：当客户端传入 expectedVersion 时做冲突检测
    if (expectedVersion !== undefined) {
      const current = await this.prisma.schedule.findUnique({
        where: { id },
        select: { version: true },
      });
      if (current && current.version !== expectedVersion) {
        throw new ConflictException(
          `课表已被他人修改（当前版本 ${current.version}，预期 ${expectedVersion}），请刷新后重试`,
        );
      }
    }
    const updated = await this.prisma.schedule.update({
      where: { id },
      data: { ...patch, version: { increment: 1 } },
    });
    const dto = this.toDto(updated);
    this.realtime.emitScheduleUpdated(dto);
    return dto;
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.prisma.schedule.delete({ where: { id } });
  }

  private toDto(
    s: {
      id: string;
      name: string;
      type: string;
      ownerId: string;
      createdAt: Date;
      updatedAt: Date;
      version: number;
    } & { group?: { id: string } | null },
  ): Schedule {
    return {
      id: s.id,
      name: s.name,
      type: s.type as Schedule["type"],
      ownerId: s.ownerId,
      groupId: s.group?.id ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      version: s.version,
    };
  }
}
