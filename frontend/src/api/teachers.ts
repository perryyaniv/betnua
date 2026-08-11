import client from './client';
import { Teacher } from '../types';

export interface TeacherHoursRow {
  teacherId: string;
  branchId: string;
  weeklyHours: number;
  courseCount: number;
}

export const getTeachers = () => client.get<Teacher[]>('/teachers').then((r) => r.data);
export const getTeacher = (id: string) => client.get<Teacher>(`/teachers/${id}`).then((r) => r.data);
export const getTeacherHoursReport = (id: string) =>
  client.get<TeacherHoursRow[]>(`/teachers/${id}/hours-report`).then((r) => r.data);

export const createTeacher = (data: Partial<Teacher>) => client.post<Teacher>('/teachers', data).then((r) => r.data);
export const updateTeacher = (id: string, data: Partial<Teacher>) =>
  client.put<Teacher>(`/teachers/${id}`, data).then((r) => r.data);
export const deleteTeacher = (id: string) => client.delete(`/teachers/${id}`).then((r) => r.data);
