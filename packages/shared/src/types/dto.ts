import type { Course, Group, Schedule, User } from "./domain";

export interface RegisterDto {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface CreateScheduleDto {
  name: string;
  type: "private" | "group";
}

export interface UpdateScheduleDto {
  name?: string;
}

export interface CreateCourseDto {
  title: string;
  teacher?: string;
  location?: string;
  color?: string;
  startTime: string;
  endTime: string;
  rrule: string;
  dtstart: string;
  exdates?: string[];
}

export interface UpdateCourseDto {
  title?: string;
  teacher?: string;
  location?: string;
  color?: string;
  startTime?: string;
  endTime?: string;
  rrule?: string;
  dtstart?: string;
  exdates?: string[];
}

export interface CreateGroupDto {
  name: string;
  scheduleName?: string;
}

export interface JoinGroupDto {
  inviteCode: string;
}

export interface OccurrencesQuery {
  from: string;
  to: string;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export type {
  Course,
  Group,
  Schedule,
  User,
} from "./domain";
