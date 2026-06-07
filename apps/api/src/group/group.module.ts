import { Module } from "@nestjs/common";
import { GroupController } from "./group.controller";
import { GroupService } from "./group.service";
import { AuthModule } from "../auth/auth.module";
import { CommonModule } from "../common/common.module";

@Module({
  imports: [AuthModule, CommonModule],
  controllers: [GroupController],
  providers: [GroupService],
  exports: [GroupService],
})
export class GroupModule {}
