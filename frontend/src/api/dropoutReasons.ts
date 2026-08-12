import client from './client';
import { DropoutReason } from '../types';

export const getDropoutReasons = () => client.get<DropoutReason[]>('/dropout-reasons').then((r) => r.data);
export const createDropoutReason = (name: string) =>
  client.post<DropoutReason>('/dropout-reasons', { name }).then((r) => r.data);
export const deleteDropoutReason = (id: string) => client.delete(`/dropout-reasons/${id}`).then((r) => r.data);
