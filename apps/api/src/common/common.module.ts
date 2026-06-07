import { Global, Module } from "@nestjs/common";
import { ScheduleRoleGuard } from "./schedule-role.guard";
import { CourseRoleGuard } from "./course-role.guard";

@Global()
@Module({
  providers: [ScheduleRoleGuard, CourseRoleGuard],
  exports: [ScheduleRoleGuard, CourseRoleGuard],
})
export class CommonModule {}
