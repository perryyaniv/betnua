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

export type AgeCategory = 'youngest' | 'midElementary' | 'teens' | 'adultWomen';
export const AGE_CATEGORIES: AgeCategory[] = ['youngest', 'midElementary', 'teens', 'adultWomen'];
export const AGE_CATEGORY_COLORS: Record<AgeCategory, string> = {
  youngest: '#EAD1DC',
  midElementary: '#CFE2F3',
  teens: '#455C75',
  adultWomen: '#C27BA0',
};
// Text/icon color for legible contrast against the full AGE_CATEGORY_COLORS background
// (WCAG-checked: teens' dark navy needs light text, the other three need dark text).
export const AGE_CATEGORY_TEXT_COLORS: Record<AgeCategory, string> = {
  youngest: '#1f2937',
  midElementary: '#1f2937',
  teens: '#ffffff',
  adultWomen: '#1f2937',
};
export const AGE_CATEGORY_SECONDARY_TEXT_COLORS: Record<AgeCategory, string> = {
  youngest: '#4b5563',
  midElementary: '#4b5563',
  teens: '#d1d5db',
  adultWomen: '#4b5563',
};

export interface TroupeMembership {
  _id: string;
  studentId: string | Student;
  joinedAt: string;
  leftAt?: string | null;
  isActive: boolean;
}

export interface Troupe {
  _id: string;
  name: string;
  branchId: string | Branch;
  members: TroupeMembership[];
  isActive: boolean;
}

export interface Course {
  _id: string;
  branchId: string | Branch;
  courseTypeId: string | CourseType;
  teacherIds: string[] | Teacher[];
  seasonId: string | Season;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roomName: string;
  ageGroupLevel: string;
  ageCategory?: AgeCategory;
  notes: string;
  isOpen: boolean;
  troupeId?: string | Troupe;
  mandatoryForTroupeIds: string[] | Troupe[];
  capacity?: number;
  price?: number;
  isActive: boolean;
  enrolledCount?: number;
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
  leadSlaThresholdHours: number;
}

export interface DropoutReason {
  _id: string;
  name: string;
  isActive: boolean;
}

export type EnrollmentStatus = 'פעיל' | 'פרש';

export interface Enrollment {
  _id: string;
  courseId: string | Course;
  status: EnrollmentStatus;
  enrolledAt: string;
  droppedAt?: string | null;
  dropoutReasonId?: string | DropoutReason | null;
  dropoutNote?: string;
}

export interface Student {
  _id: string;
  name: string;
  guardianPhone: string;
  enrollments: Enrollment[];
  createdAt: string;
  updatedAt: string;
}

export type LeadSource = 'אתר' | 'טלפון' | 'רשתות_חברתיות' | 'הפניה' | 'אחר';
export const LEAD_SOURCES: LeadSource[] = ['אתר', 'טלפון', 'רשתות_חברתיות', 'הפניה', 'אחר'];

export type LeadStatus = 'חדש' | 'נוצר_קשר' | 'בטיפול' | 'נרשם' | 'לא_רלוונטי';
export const LEAD_STATUSES: LeadStatus[] = ['חדש', 'נוצר_קשר', 'בטיפול', 'נרשם', 'לא_רלוונטי'];

export interface Lead {
  _id: string;
  name: string;
  phone: string;
  branchId: string | Branch;
  source: LeadSource;
  status: LeadStatus;
  notes: string;
  convertedStudentId?: string | Student | null;
  createdBy: string | User;
  createdAt: string;
  updatedAt: string;
}

export interface DropoutReportRow {
  studentName: string;
  branchName: string;
  reasonName: string;
  dropoutNote?: string;
  droppedAt: string;
}

export interface DropoutReport {
  total: number;
  byBranch: Record<string, number>;
  byReason: Record<string, number>;
  rows: DropoutReportRow[];
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
