import client from './client';
import { StudioEvent } from '../types';

export interface EventFilters {
  branchId?: string;
  eventType?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  assigneeId?: string;
}

export const getEvents = (filters: EventFilters = {}) =>
  client.get<StudioEvent[]>('/events', { params: filters }).then((r) => r.data);
export const getEvent = (id: string) => client.get<StudioEvent>(`/events/${id}`).then((r) => r.data);

export const createEvent = (data: Partial<StudioEvent>) =>
  client.post<StudioEvent>('/events', data).then((r) => r.data);
export const updateEvent = (id: string, data: Partial<StudioEvent>) =>
  client.put<StudioEvent>(`/events/${id}`, data).then((r) => r.data);
export const deleteEvent = (id: string) => client.delete(`/events/${id}`).then((r) => r.data);

export const addTask = (eventId: string, data: { title: string; assigneeId?: string | null; dueDate?: string | null }) =>
  client.post<StudioEvent>(`/events/${eventId}/tasks`, data).then((r) => r.data);
export const updateTask = (
  eventId: string,
  taskId: string,
  data: { title?: string; status?: string; assigneeId?: string | null; dueDate?: string | null }
) => client.put<StudioEvent>(`/events/${eventId}/tasks/${taskId}`, data).then((r) => r.data);
export const deleteTask = (eventId: string, taskId: string) =>
  client.delete<StudioEvent>(`/events/${eventId}/tasks/${taskId}`).then((r) => r.data);
