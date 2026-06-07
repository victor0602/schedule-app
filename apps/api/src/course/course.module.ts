import { Module } from "@nestjs/common";
import { CourseController } from "./course.controller";
import { CourseService } from "./course.service";
import { AuthModule } from "../auth/auth.module";
import { CommonModule } from "../common/common.module";

@Module({
  imports: [AuthModule, CommonModule],
  controllers: [CourseController],
  providers: [CourseService],
})
export class CourseModule {}
