import client from './client';
import { AgeCategory, Course } from '../types';

export interface CourseFilters {
  branchId?: string;
  teacherId?: string;
  courseTypeId?: string;
  seasonId?: string;
  dayOfWeek?: number;
  isActive?: boolean;
  troupeId?: string;
  isOpen?: boolean;
  ageCategory?: AgeCategory;
}

export const getCourses = (filters: CourseFilters = {}) =>
  client.get<Course[]>('/courses', { params: filters }).then((r) => r.data);

export const createCourse = (data: Partial<Course>) => client.post<Course>('/courses', data).then((r) => r.data);
export const updateCourse = (id: string, data: Partial<Course>) =>
  client.put<Course>(`/courses/${id}`, data).then((r) => r.data);
export const deleteCourse = (id: string) => client.delete(`/courses/${id}`).then((r) => r.data);
