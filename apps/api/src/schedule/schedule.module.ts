import { Module } from "@nestjs/common";
import { ScheduleController } from "./schedule.controller";
import { ScheduleService } from "./schedule.service";
import { OccurrenceService } from "./occurrence.service";
import { AuthModule } from "../auth/auth.module";
import { CommonModule } from "../common/common.module";

@Module({
  imports: [AuthModule, CommonModule],
  controllers: [ScheduleController],
  providers: [ScheduleService, OccurrenceService],
  exports: [ScheduleService, OccurrenceService],
})
export class ScheduleModule {}
