import client from './client';
import { CourseType } from '../types';

export const getCourseTypes = () => client.get<CourseType[]>('/course-types').then((r) => r.data);
export const createCourseType = (data: Partial<CourseType>) =>
  client.post<CourseType>('/course-types', data).then((r) => r.data);
export const updateCourseType = (id: string, data: Partial<CourseType>) =>
  client.put<CourseType>(`/course-types/${id}`, data).then((r) => r.data);
export const deleteCourseType = (id: string) => client.delete(`/course-types/${id}`).then((r) => r.data);
