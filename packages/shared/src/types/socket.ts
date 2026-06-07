import type { Course, Schedule } from "./domain";
import { SOCKET_EVENTS } from "../constants";

export interface SubscribePayload {
  scheduleId: string;
}

export interface CourseCreatedEvent {
  scheduleId: string;
  course: Course;
}

export interface CourseUpdatedEvent {
  scheduleId: string;
  course: Course;
}

export interface CourseDeletedEvent {
  scheduleId: string;
  courseId: string;
}

export interface ScheduleUpdatedEvent {
  schedule: Schedule;
}

export interface ServerToClientEvents {
  [SOCKET_EVENTS.COURSE_CREATED]: (payload: CourseCreatedEvent) => void;
  [SOCKET_EVENTS.COURSE_UPDATED]: (payload: CourseUpdatedEvent) => void;
  [SOCKET_EVENTS.COURSE_DELETED]: (payload: CourseDeletedEvent) => void;
  [SOCKET_EVENTS.SCHEDULE_UPDATED]: (payload: ScheduleUpdatedEvent) => void;
}

export interface ClientToServerEvents {
  [SOCKET_EVENTS.SUBSCRIBE]: (payload: SubscribePayload) => void;
  [SOCKET_EVENTS.UNSUBSCRIBE]: (payload: SubscribePayload) => void;
}
