import client from './client';
import { Closure } from '../types';

export const getClosures = () => client.get<Closure[]>('/closures').then((r) => r.data);
export const createClosure = (data: Partial<Closure>) => client.post<Closure>('/closures', data).then((r) => r.data);
export const deleteClosure = (id: string) => client.delete(`/closures/${id}`).then((r) => r.data);
