import { EventStatus, TaskStatus } from '../types';

export const EVENT_STATUS_COLORS: Record<EventStatus, string> = {
  מתוכנן: '#0EA5E9',
  בהכנה: '#F59E0B',
  הושלם: '#16A34A',
  בוטל: '#EF4444',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  לביצוע: '#9CA3AF',
  בתהליך: '#3B82F6',
  הושלם: '#16A34A',
  בוטל: '#EF4444',
};
