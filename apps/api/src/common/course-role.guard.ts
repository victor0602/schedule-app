import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../prisma/prisma.service";
import { ROLES, type Role } from "@schedule/shared";

export const COURSE_ROLE_KEY = "courseRole";
export const CourseRole = (minRole: Role) =>
  Reflect.metadata(COURSE_ROLE_KEY, minRole);

const RANK: Record<Role, number> = {
  [ROLES.VIEWER]: 1,
  [ROLES.EDITOR]: 2,
  [ROLES.OWNER]: 3,
};

@Injectable()
export class CourseRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const minRole = this.reflector.get<Role>(
      COURSE_ROLE_KEY,
      ctx.getHandler(),
    );
    if (!minRole) return true;

    const req = ctx
      .switchToHttp()
      .getRequest<{ userId: string; params: { courseId?: string } }>();
    if (!req.userId) throw new ForbiddenException();

    const courseId = req.params.courseId;
    if (!courseId) throw new NotFoundException();

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        schedule: {
          include: { group: { include: { members: true } } },
        },
      },
    });
    if (!course) throw new NotFoundException();

    const schedule = course.schedule;
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

    throw new ForbiddenException("No access");
  }
}
