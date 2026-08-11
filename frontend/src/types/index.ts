export type UserRole = 'admin' | 'editor' | 'viewer';

export interface Room {
  _id: string;
  name: string;
}

export interface Branch {
  _id: string;
  name: string;
  address: string;
  phone: string;
  hoursOpen: string;
  hoursClose: string;
  rooms: Room[];
  isActive: boolean;
}

export interface User {
  _id: string;
  name: string;
  username: string;
  role: UserRole;
  branchIds: string[] | Branch[];
  active: boolean;
  forcePasswordChange: boolean;
  createdAt: string;
}

export interface Season {
  _id: string;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export type ClosureScope = 'all' | 'branch';

export interface Closure {
  _id: string;
  date: string;
  scope: ClosureScope;
  branchId?: string | null;
  reason: string;
}

export interface CourseType {
  _id: string;
  name: string;
  colorTag: string;
}

export interface Teacher {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  photoUrl?: string;
  bio?: string;
  specialtyCourseTypeIds: string[] | CourseType[];
  branchIds: string[] | Branch[];
  isActive: boolean;
}

export interface Course {
  _id: string;
  branchId: string | Branch;
  courseTypeId: string | CourseType;
  teacherId: string | Teacher;
  seasonId: string | Season;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roomName: string;
  ageGroupLevel: string;
  capacity?: number;
  price?: number;
  isActive: boolean;
}

export const DAY_NAMES = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'יום שבת'];

export type EventType = 'מופע' | 'תחרות' | 'סדנה' | 'פגישת_צוות' | 'אחר';
export const EVENT_TYPES: EventType[] = ['מופע', 'תחרות', 'סדנה', 'פגישת_צוות', 'אחר'];

export type EventStatus = 'מתוכנן' | 'בהכנה' | 'הושלם' | 'בוטל';
export const EVENT_STATUSES: EventStatus[] = ['מתוכנן', 'בהכנה', 'הושלם', 'בוטל'];

export type TaskStatus = 'לביצוע' | 'בתהליך' | 'הושלם' | 'בוטל';
export const TASK_STATUSES: TaskStatus[] = ['לביצוע', 'בתהליך', 'הושלם', 'בוטל'];

export interface EventTask {
  _id: string;
  title: string;
  status: TaskStatus;
  assigneeId?: string | User | null;
  dueDate?: string | null;
  createdAt?: string;
}

export interface StudioEvent {
  _id: string;
  title: string;
  description?: string;
  branchId?: string | Branch | null;
  eventType: EventType;
  eventDate: string;
  prepareDate: string;
  status: EventStatus;
  addedBy: string | User;
  tasks: EventTask[];
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  _id: string;
  eventPrepareAlertThresholdDays: number;
  taskDueAlertThresholdDays: number;
}

export interface AuditLogEntry {
  _id: string;
  userId: string;
  userName: string;
  entityType: string;
  entityId?: string;
  action: string;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
}
