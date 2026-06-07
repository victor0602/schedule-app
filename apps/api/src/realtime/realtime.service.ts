import { Injectable, Logger } from "@nestjs/common";
import { Server } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { SOCKET_EVENTS } from "@schedule/shared";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  Course,
  Schedule,
} from "@schedule/shared";

export type TypedServer = Server<
  ClientToServerEvents,
  ServerToClientEvents
>;

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private server: TypedServer | null = null;

  setServer(server: TypedServer) {
    this.server = server;
    this.logger.log("Socket.io server attached");
  }

  scheduleRoom(scheduleId: string) {
    return `schedule:${scheduleId}`;
  }

  emitCourseCreated(scheduleId: string, course: Course) {
    this.server?.to(this.scheduleRoom(scheduleId)).emit(
      SOCKET_EVENTS.COURSE_CREATED,
      { scheduleId, course },
    );
  }

  emitCourseUpdated(scheduleId: string, course: Course) {
    this.server?.to(this.scheduleRoom(scheduleId)).emit(
      SOCKET_EVENTS.COURSE_UPDATED,
      { scheduleId, course },
    );
  }

  emitCourseDeleted(scheduleId: string, courseId: string) {
    this.server?.to(this.scheduleRoom(scheduleId)).emit(
      SOCKET_EVENTS.COURSE_DELETED,
      { scheduleId, courseId },
    );
  }

  emitScheduleUpdated(schedule: Schedule) {
    this.server?.to(this.scheduleRoom(schedule.id)).emit(
      SOCKET_EVENTS.SCHEDULE_UPDATED,
      { schedule },
    );
  }
}
