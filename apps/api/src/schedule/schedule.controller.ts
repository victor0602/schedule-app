import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import {
  ScheduleRole,
  ScheduleRoleGuard,
} from "../common/schedule-role.guard";
import { ROLES } from "@schedule/shared";
import { IsIn, IsNumber, IsOptional, IsString, MinLength } from "class-validator";
import { ScheduleService } from "./schedule.service";
import { PrismaService } from "../prisma/prisma.service";
import { OccurrenceService } from "./occurrence.service";
import type { CreateScheduleDto } from "@schedule/shared";

class CreateScheduleBody implements CreateScheduleDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsIn(["private", "group"])
  type!: "private" | "group";
}

class UpdateScheduleBody {
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsNumber()
  expectedVersion?: number;
}

@Controller("schedules")
@UseGuards(JwtAuthGuard)
export class ScheduleController {
  constructor(
    private readonly schedules: ScheduleService,
    private readonly occurrences: OccurrenceService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  list(@Req() req: { userId: string }) {
    return this.schedules.listForUser(req.userId);
  }

  @Post()
  create(@Req() req: { userId: string }, @Body() body: CreateScheduleBody) {
    return this.schedules.create(req.userId, body);
  }

  @Get(":id")
  @UseGuards(ScheduleRoleGuard)
  @ScheduleRole(ROLES.VIEWER)
  getOne(@Param("id") id: string, @Req() req: { userId: string }) {
    return this.schedules.getOne(req.userId, id);
  }

  @Patch(":id")
  @UseGuards(ScheduleRoleGuard)
  @ScheduleRole(ROLES.OWNER)
  update(
    @Param("id") id: string,
    @Req() req: { userId: string },
    @Body() body: UpdateScheduleBody,
  ) {
    return this.schedules.update(req.userId, id, body, body.expectedVersion);
  }

  @Delete(":id")
  @UseGuards(ScheduleRoleGuard)
  @ScheduleRole(ROLES.OWNER)
  remove(@Param("id") id: string, @Req() req: { userId: string }) {
    return this.schedules.remove(req.userId, id);
  }

  @Get(":id/occurrences")
  @UseGuards(ScheduleRoleGuard)
  @ScheduleRole(ROLES.VIEWER)
  async getOccurrences(
    @Param("id") id: string,
    @Query("from") from: string,
    @Query("to") to: string,
  ) {
    const courses = await this.prisma.course.findMany({
      where: { scheduleId: id },
    });
    return this.occurrences.expand(courses, from, to);
  }
}
