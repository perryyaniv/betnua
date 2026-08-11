import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getEvents, createEvent, deleteEvent } from '../api/events';
import { getBranches } from '../api/branches';
import { StudioEvent, Branch, EVENT_TYPES, EVENT_STATUSES } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { hasWriteAccess } from '../utils/roles';
import { formatDate } from '../utils/date';
import { EVENT_STATUS_COLORS } from '../utils/statusColors';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';

const emptyForm = { title: '', description: '', branchId: '', eventType: 'אחר', eventDate: '', prepareDate: '' };

export default function Events() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canWrite = hasWriteAccess(user?.role);

  const [events, setEvents] = useState<StudioEvent[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ branchId: '', eventType: '', status: '' });
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getEvents(), getBranches()]).then(([e, b]) => {
      setEvents(e);
      setBranches(b);
      setLoading(false);
    });
  }, []);

  const idOf = (v?: string | { _id: string } | null) => (!v ? null : typeof v === 'string' ? v : v._id);

  const filtered = useMemo(
    () =>
      events.filter(
        (e) =>
          (!filters.branchId || idOf(e.branchId) === filters.branchId) &&
          (!filters.eventType || e.eventType === filters.eventType) &&
          (!filters.status || e.status === filters.status)
      ),
    [events, filters]
  );

  const handleCreate = async () => {
    setSaving(true);
    try {
      const created = await createEvent({ ...form, branchId: form.branchId || null } as never);
      setEvents((prev) => [...prev, created]);
      setAddModal(false);
      setForm(emptyForm);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('events.deleteConfirm'))) return;
    await deleteEvent(id);
    setEvents((prev) => prev.filter((e) => e._id !== id));
  };

  const branchName = (e: StudioEvent) => {
    if (!e.branchId) return t('events.studioWide');
    return typeof e.branchId === 'string' ? branches.find((b) => b._id === e.branchId)?.name : e.branchId.name;
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-wrap gap-2">
          <select className="input max-w-[160px]" value={filters.branchId} onChange={(e) => setFilters((f) => ({ ...f, branchId: e.target.value }))}>
            <option value="">{t('events.filterAllBranches')}</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
          <select className="input max-w-[160px]" value={filters.eventType} onChange={(e) => setFilters((f) => ({ ...f, eventType: e.target.value }))}>
            <option value="">{t('events.filterAllTypes')}</option>
            {EVENT_TYPES.map((et) => (
              <option key={et} value={et}>
                {t(`eventTypes.${et}`)}
              </option>
            ))}
          </select>
          <select className="input max-w-[160px]" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="">{t('events.filterAllStatuses')}</option>
            {EVENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`eventStatus.${s}`)}
              </option>
            ))}
          </select>
        </div>
        {canWrite && (
          <Button size="sm" onClick={() => setAddModal(true)}>
            + {t('events.addEvent')}
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('events.eventTitle')}</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('events.branch')}</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('events.eventType')}</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('events.eventDate')}</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('events.prepareDate')}</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('events.status')}</th>
              {canWrite && <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('common.actions')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered
              .slice()
              .sort((a, b) => new Date(a.prepareDate).getTime() - new Date(b.prepareDate).getTime())
              .map((e) => (
                <tr key={e._id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <Link to={`/events/${e._id}`} className="font-medium text-gray-800 hover:text-primary">
                      {e.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{branchName(e)}</td>
                  <td className="px-3 py-2 text-gray-600">{t(`eventTypes.${e.eventType}`)}</td>
                  <td className="px-3 py-2 text-gray-600">{formatDate(e.eventDate)}</td>
                  <td className="px-3 py-2 text-gray-600">{formatDate(e.prepareDate)}</td>
                  <td className="px-3 py-2">
                    <Badge label={t(`eventStatus.${e.status}`)} color={EVENT_STATUS_COLORS[e.status]} />
                  </td>
                  {canWrite && (
                    <td className="px-3 py-2">
                      <button className="text-xs text-red-500" onClick={() => handleDelete(e._id)}>
                        {t('common.delete')}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  {t('common.noData')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={addModal} onClose={() => setAddModal(false)} title={t('events.addEvent')} size="lg">
        <div className="space-y-4">
          <div>
            <label className="label">{t('events.eventTitle')}</label>
            <input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="label">{t('events.description')}</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t('events.branch')}</label>
              <select className="input" value={form.branchId} onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}>
                <option value="">{t('events.studioWide')}</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('events.eventType')}</label>
              <select className="input" value={form.eventType} onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value }))}>
                {EVENT_TYPES.map((et) => (
                  <option key={et} value={et}>
                    {t(`eventTypes.${et}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('events.eventDate')}</label>
              <input type="date" className="input" value={form.eventDate} onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))} />
            </div>
            <div>
              <label className="label">{t('events.prepareDate')}</label>
              <input type="date" className="input" value={form.prepareDate} onChange={(e) => setForm((f) => ({ ...f, prepareDate: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setAddModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button loading={saving} onClick={handleCreate} disabled={!form.title || !form.eventDate || !form.prepareDate}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
