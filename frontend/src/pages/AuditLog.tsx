import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAuditLog } from '../api/auditLog';
import { AuditLogEntry } from '../types';
import { formatDateTime } from '../utils/date';
import Spinner from '../components/ui/Spinner';

export default function AuditLog() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuditLog().then(setEntries).finally(() => setLoading(false));
  }, []);

  const filtered = entries.filter(
    (e) => !search || e.userName.includes(search) || e.action.includes(search) || e.entityType.includes(search)
  );

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <input className="input max-w-sm" placeholder={t('auditLog.search')} value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('auditLog.timestamp')}</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('auditLog.user')}</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('auditLog.entityType')}</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('auditLog.action')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((e) => (
              <tr key={e._id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500 text-xs">{formatDateTime(e.timestamp)}</td>
                <td className="px-3 py-2 text-gray-700">{e.userName}</td>
                <td className="px-3 py-2 text-gray-500">{e.entityType}</td>
                <td className="px-3 py-2 text-gray-700">{e.action}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  {t('common.noData')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
