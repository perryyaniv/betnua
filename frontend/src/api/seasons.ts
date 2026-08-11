import client from './client';
import { Season } from '../types';

export const getSeasons = () => client.get<Season[]>('/seasons').then((r) => r.data);
export const createSeason = (data: Partial<Season>) => client.post<Season>('/seasons', data).then((r) => r.data);
export const updateSeason = (id: string, data: Partial<Season>) =>
  client.put<Season>(`/seasons/${id}`, data).then((r) => r.data);
