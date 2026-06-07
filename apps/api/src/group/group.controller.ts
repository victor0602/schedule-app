import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { GroupService } from "./group.service";
import { IsOptional, IsString, MinLength } from "class-validator";

class CreateGroupBody {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @IsOptional()
  scheduleName?: string;
}

class JoinGroupBody {
  @IsString()
  @MinLength(1)
  inviteCode!: string;
}

class AddMemberBody {
  @IsString()
  userId!: string;
}

@Controller("groups")
@UseGuards(JwtAuthGuard)
export class GroupController {
  constructor(private readonly groups: GroupService) {}

  @Get()
  list(@Req() req: { userId: string }) {
    return this.groups.listForUser(req.userId);
  }

  @Post()
  create(@Req() req: { userId: string }, @Body() body: CreateGroupBody) {
    return this.groups.create(req.userId, body.name, body.scheduleName);
  }

  @Post("join")
  @Throttle({ medium: { limit: 3, ttl: 60000 } })
  join(@Req() req: { userId: string }, @Body() body: JoinGroupBody) {
    return this.groups.joinByCode(req.userId, body.inviteCode);
  }

  @Get(":id")
  getOne(@Req() req: { userId: string }, @Param("id") groupId: string) {
    return this.groups.getById(req.userId, groupId);
  }

  @Get(":id/members")
  members(@Req() req: { userId: string }, @Param("id") groupId: string) {
    return this.groups.listMembers(req.userId, groupId);
  }

  @Post(":id/members")
  addMember(
    @Req() req: { userId: string },
    @Param("id") groupId: string,
    @Body() body: AddMemberBody,
  ) {
    return this.groups.addMember(req.userId, groupId, body.userId);
  }

  @Delete(":id/members/me")
  leave(
    @Req() req: { userId: string },
    @Param("id") groupId: string,
  ) {
    return this.groups.removeMember(req.userId, groupId, req.userId);
  }

  @Delete(":id/members/:userId")
  removeMember(
    @Req() req: { userId: string },
    @Param("id") groupId: string,
    @Param("userId") userId: string,
  ) {
    return this.groups.removeMember(req.userId, groupId, userId);
  }
}
