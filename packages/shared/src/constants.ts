export const ROLES = {
  OWNER: "owner",
  EDITOR: "editor",
  VIEWER: "viewer",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const SCHEDULE_TYPES = {
  PRIVATE: "private",
  GROUP: "group",
} as const;

export type ScheduleType =
  (typeof SCHEDULE_TYPES)[keyof typeof SCHEDULE_TYPES];

export const DAYS = {
  MO: "MO",
  TU: "TU",
  WE: "WE",
  TH: "TH",
  FR: "FR",
  SA: "SA",
  SU: "SU",
} as const;

export type Weekday = (typeof DAYS)[keyof typeof DAYS];

export const SOCKET_EVENTS = {
  SUBSCRIBE: "subscribe",
  UNSUBSCRIBE: "unsubscribe",
  COURSE_CREATED: "course.created",
  COURSE_UPDATED: "course.updated",
  COURSE_DELETED: "course.deleted",
  SCHEDULE_UPDATED: "schedule.updated",
} as const;
