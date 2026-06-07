import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeService } from "../realtime/realtime.service";
import { z } from "zod";
import type { Course, CreateCourseDto, UpdateCourseDto } from "@schedule/shared";

const exdateSchema = z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

@Injectable()
export class CourseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async list(scheduleId: string): Promise<Course[]> {
    const courses = await this.prisma.course.findMany({
      where: { scheduleId },
      orderBy: { startTime: "asc" },
    });
    return courses.map(this.toDto);
  }

  async create(scheduleId: string, dto: CreateCourseDto): Promise<Course> {
    if (dto.exdates) {
      exdateSchema.parse(dto.exdates);
    }
    const c = await this.prisma.course.create({
      data: {
        scheduleId,
        title: dto.title,
        teacher: dto.teacher ?? null,
        location: dto.location ?? null,
        color: dto.color ?? "#3b82f6",
        note: null,
        startTime: dto.startTime,
        endTime: dto.endTime,
        rrule: dto.rrule,
        dtstart: new Date(dto.dtstart),
        exdates: JSON.stringify(dto.exdates ?? []),
      },
    });
    const dtoOut = this.toDto(c);
    await this.prisma.schedule.update({
      where: { id: scheduleId },
      data: { version: { increment: 1 } },
    });
    this.realtime.emitCourseCreated(scheduleId, dtoOut);
    return dtoOut;
  }

  async update(
    courseId: string,
    dto: UpdateCourseDto,
  ): Promise<Course> {
    const existing = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!existing) throw new NotFoundException();
    if (dto.exdates !== undefined) {
      exdateSchema.parse(dto.exdates);
    }
    const updated = await this.prisma.course.update({
      where: { id: courseId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.teacher !== undefined && { teacher: dto.teacher }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.startTime !== undefined && { startTime: dto.startTime }),
        ...(dto.endTime !== undefined && { endTime: dto.endTime }),
        ...(dto.rrule !== undefined && { rrule: dto.rrule }),
        ...(dto.dtstart !== undefined && { dtstart: new Date(dto.dtstart) }),
        ...(dto.exdates !== undefined && {
          exdates: JSON.stringify(dto.exdates),
        }),
      },
    });
    const dtoOut = this.toDto(updated);
    await this.prisma.schedule.update({
      where: { id: updated.scheduleId },
      data: { version: { increment: 1 } },
    });
    this.realtime.emitCourseUpdated(updated.scheduleId, dtoOut);
    return dtoOut;
  }

  async remove(courseId: string): Promise<void> {
    const c = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!c) throw new NotFoundException();
    await this.prisma.course.delete({ where: { id: courseId } });
    await this.prisma.schedule.update({
      where: { id: c.scheduleId },
      data: { version: { increment: 1 } },
    });
    this.realtime.emitCourseDeleted(c.scheduleId, courseId);
  }

  private toDto = (c: {
    id: string;
    scheduleId: string;
    title: string;
    teacher: string | null;
    location: string | null;
    color: string;
    note: string | null;
    startTime: string;
    endTime: string;
    rrule: string;
    dtstart: Date;
    exdates: string;
    createdAt: Date;
    updatedAt: Date;
  }): Course => ({
    id: c.id,
    scheduleId: c.scheduleId,
    title: c.title,
    teacher: c.teacher,
    location: c.location,
    color: c.color,
    note: c.note,
    startTime: c.startTime,
    endTime: c.endTime,
    rrule: c.rrule,
    dtstart: c.dtstart.toISOString(),
    exdates: JSON.parse(c.exdates || "[]"),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  });
}
