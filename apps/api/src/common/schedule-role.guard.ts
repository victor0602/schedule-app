import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../prisma/prisma.service";
import { ROLES } from "@schedule/shared";
import type { Role } from "@schedule/shared";

export const SCHEDULE_ROLE_KEY = "scheduleRole";
export const ScheduleRole = (minRole: Role) =>
  Reflect.metadata(SCHEDULE_ROLE_KEY, minRole);

const RANK: Record<Role, number> = {
  [ROLES.VIEWER]: 1,
  [ROLES.EDITOR]: 2,
  [ROLES.OWNER]: 3,
};

@Injectable()
export class ScheduleRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const minRole = this.reflector.get<Role>(
      SCHEDULE_ROLE_KEY,
      ctx.getHandler(),
    );
    if (!minRole) return true;

    const req = ctx
      .switchToHttp()
      .getRequest<{ userId: string; params: { id?: string }; body: any }>();
    if (!req.userId) throw new ForbiddenException();

    const scheduleId = req.params.id;
    if (!scheduleId) throw new NotFoundException();

    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: { group: { include: { members: true } } },
    });
    if (!schedule) throw new NotFoundException();

    if (schedule.ownerId === req.userId) return true;

    if (schedule.group) {
      const member = schedule.group.members.find(
        (m) => m.userId === req.userId,
      );
      if (!member) throw new ForbiddenException("Not a group member");
      if (RANK[member.role as Role] < RANK[minRole]) {
        throw new ForbiddenException(`Requires role ${minRole}`);
      }
      return true;
    }

    throw new ForbiddenException("No access to this schedule");
  }
}
