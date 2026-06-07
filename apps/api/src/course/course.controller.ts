import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { CourseRole, CourseRoleGuard } from "../common/course-role.guard";
import { ScheduleRole, ScheduleRoleGuard } from "../common/schedule-role.guard";
import { ROLES, type CreateCourseDto, type UpdateCourseDto } from "@schedule/shared";
import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from "class-validator";
import { CourseService } from "./course.service";

class CreateCourseBody implements CreateCourseDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString() @IsOptional() teacher?: string;
  @IsString() @IsOptional() location?: string;
  @IsString() @IsOptional() color?: string;

  @Matches(/^\d{2}:\d{2}$/)
  startTime!: string;

  @Matches(/^\d{2}:\d{2}$/)
  endTime!: string;

  @IsString()
  @MinLength(1)
  rrule!: string;

  @IsDateString()
  dtstart!: string;

  @IsArray() @IsOptional() exdates?: string[];
}

class UpdateCourseBody implements UpdateCourseDto {
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() teacher?: string;
  @IsString() @IsOptional() location?: string;
  @IsString() @IsOptional() color?: string;
  @Matches(/^\d{2}:\d{2}$/) @IsOptional() startTime?: string;
  @Matches(/^\d{2}:\d{2}$/) @IsOptional() endTime?: string;
  @IsString() @IsOptional() rrule?: string;
  @IsDateString() @IsOptional() dtstart?: string;
  @IsArray() @IsOptional() exdates?: string[];
}

@Controller()
@UseGuards(JwtAuthGuard)
export class CourseController {
  constructor(private readonly courses: CourseService) {}

  @Get("schedules/:id/courses")
  @UseGuards(ScheduleRoleGuard)
  @ScheduleRole(ROLES.VIEWER)
  list(@Param("id") scheduleId: string) {
    return this.courses.list(scheduleId);
  }

  @Post("schedules/:id/courses")
  @UseGuards(ScheduleRoleGuard)
  @ScheduleRole(ROLES.EDITOR)
  create(
    @Param("id") scheduleId: string,
    @Body() body: CreateCourseBody,
  ) {
    return this.courses.create(scheduleId, body);
  }

  @Patch("courses/:courseId")
  @UseGuards(CourseRoleGuard)
  @CourseRole(ROLES.EDITOR)
  update(
    @Param("courseId") courseId: string,
    @Body() body: UpdateCourseBody,
  ) {
    return this.courses.update(courseId, body);
  }

  @Delete("courses/:courseId")
  @UseGuards(CourseRoleGuard)
  @CourseRole(ROLES.EDITOR)
  remove(@Param("courseId") courseId: string) {
    return this.courses.remove(courseId);
  }
}
