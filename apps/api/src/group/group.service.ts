import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ROLES, type Group, type GroupMember } from "@schedule/shared";
import { randomBytes } from "crypto";

@Injectable()
export class GroupService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<(Group & { role: string; memberCount: number })[]> {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: { include: { members: true } },
      },
    });
    return memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      scheduleId: m.group.scheduleId,
      inviteCode: m.group.inviteCode,
      createdAt: m.group.createdAt.toISOString(),
      role: m.role,
      memberCount: m.group.members.length,
    }));
  }

  async create(
    userId: string,
    name: string,
    scheduleName?: string,
  ): Promise<Group> {
    return this.prisma.$transaction(async (tx) => {
      const schedule = await tx.schedule.create({
        data: {
          name: scheduleName ?? name,
          type: "group",
          ownerId: userId,
        },
      });
      const group = await tx.group.create({
        data: {
          name,
          scheduleId: schedule.id,
          inviteCode: generateInviteCode(),
        },
      });
      await tx.groupMember.create({
        data: {
          groupId: group.id,
          userId,
          role: ROLES.OWNER,
        },
      });
      return {
        id: group.id,
        name: group.name,
        scheduleId: group.scheduleId,
        inviteCode: group.inviteCode,
        createdAt: group.createdAt.toISOString(),
      };
    });
  }

  async joinByCode(userId: string, inviteCode: string): Promise<Group> {
    const group = await this.prisma.group.findUnique({
      where: { inviteCode },
    });
    if (!group) throw new NotFoundException("Invalid invite code");
    const existing = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId } },
    });
    if (existing) {
      throw new BadRequestException("Already a member");
    }
    await this.prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId,
        role: ROLES.VIEWER,
      },
    });
    return {
      id: group.id,
      name: group.name,
      scheduleId: group.scheduleId,
      inviteCode: group.inviteCode,
      createdAt: group.createdAt.toISOString(),
    };
  }

  async addMember(
    actorId: string,
    groupId: string,
    memberUserId: string,
  ): Promise<GroupMember> {
    await this.assertOwner(actorId, groupId);
    // 校验被添加的用户存在
    const targetUser = await this.prisma.user.findUnique({
      where: { id: memberUserId },
    });
    if (!targetUser) {
      throw new NotFoundException("User not found");
    }
    const m = await this.prisma.groupMember.create({
      data: {
        groupId,
        userId: memberUserId,
        role: ROLES.EDITOR,
      },
    });
    return {
      id: m.id,
      groupId: m.groupId,
      userId: m.userId,
      role: m.role as GroupMember["role"],
      joinedAt: m.joinedAt.toISOString(),
    };
  }

  async removeMember(
    actorId: string,
    groupId: string,
    memberUserId: string,
  ): Promise<void> {
    await this.assertOwner(actorId, groupId);
    await this.prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId: memberUserId } },
    });
  }

  async listMembers(actorId: string, groupId: string) {
    await this.assertMember(actorId, groupId);
    // 注意：select 显式指定了字段，passwordHash 不会被返回
    return this.prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
      },
    });
  }

  async getById(
    actorId: string,
    groupId: string,
  ): Promise<Group & { role: string; memberCount: number }> {
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: actorId } },
      include: {
        group: { include: { _count: { select: { members: true } } } },
      },
    });
    if (!membership) throw new NotFoundException("Group not found");
    return {
      id: membership.group.id,
      name: membership.group.name,
      scheduleId: membership.group.scheduleId,
      inviteCode: membership.group.inviteCode,
      createdAt: membership.group.createdAt.toISOString(),
      role: membership.role,
      memberCount: membership.group._count.members,
    };
  }

  private async assertOwner(actorId: string, groupId: string) {
    const m = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: actorId } },
    });
    if (!m || m.role !== ROLES.OWNER) {
      throw new NotFoundException("Group not found or no permission");
    }
  }

  private async assertMember(actorId: string, groupId: string) {
    const m = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: actorId } },
    });
    if (!m) throw new NotFoundException();
    return m;
  }
}

function generateInviteCode() {
  return randomBytes(6).toString("hex");
}
