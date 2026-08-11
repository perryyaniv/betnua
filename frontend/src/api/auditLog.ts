import client from './client';
import { AuditLogEntry } from '../types';

export const getAuditLog = (filters: { entityType?: string; entityId?: string } = {}) =>
  client.get<AuditLogEntry[]>('/audit-log', { params: filters }).then((r) => r.data);
