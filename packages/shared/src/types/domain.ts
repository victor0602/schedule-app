import type { Role, ScheduleType, Weekday } from "../constants";

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface Schedule {
  id: string;
  name: string;
  type: ScheduleType;
  ownerId: string;
  groupId: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface Group {
  id: string;
  name: string;
  scheduleId: string;
  inviteCode: string;
  createdAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: Role;
  joinedAt: string;
  user?: Pick<User, "id" | "email" | "displayName">;
}

export interface Course {
  id: string;
  scheduleId: string;
  title: string;
  teacher: string | null;
  location: string | null;
  color: string;
  note: string | null;
  startTime: string;
  endTime: string;
  rrule: string;
  dtstart: string;
  exdates: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CourseOccurrence {
  courseId: string;
  title: string;
  teacher: string | null;
  location: string | null;
  color: string;
  start: string;
  end: string;
  date: string;
}
