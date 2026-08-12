import client from './client';
import { Student } from '../types';

export interface StudentFilters {
  courseId?: string;
  status?: string;
}

export const getStudents = (filters: StudentFilters = {}) =>
  client.get<Student[]>('/students', { params: filters }).then((r) => r.data);
export const getStudent = (id: string) => client.get<Student>(`/students/${id}`).then((r) => r.data);

export const createStudent = (data: { name: string; guardianPhone?: string; courseId: string }) =>
  client.post<Student>('/students', data).then((r) => r.data);
export const updateStudent = (id: string, data: Partial<Pick<Student, 'name' | 'guardianPhone'>>) =>
  client.put<Student>(`/students/${id}`, data).then((r) => r.data);
export const deleteStudent = (id: string) => client.delete(`/students/${id}`).then((r) => r.data);

export const addEnrollment = (studentId: string, courseId: string) =>
  client.post<Student>(`/students/${studentId}/enrollments`, { courseId }).then((r) => r.data);
export const updateEnrollment = (
  studentId: string,
  enrollmentId: string,
  data: { status: string; dropoutReasonId?: string | null; dropoutNote?: string }
) => client.patch<Student>(`/students/${studentId}/enrollments/${enrollmentId}`, data).then((r) => r.data);
export const deleteEnrollment = (studentId: string, enrollmentId: string) =>
  client.delete<Student>(`/students/${studentId}/enrollments/${enrollmentId}`).then((r) => r.data);
