import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getEvents, createEvent, deleteEvent, updateTask } from '../api/events';
import { getBranches } from '../api/branches';
import { getSettings } from '../api/settings';
import { getUsers } from '../api/users';
import { StudioEvent, Branch, AppSettings, User, EventTask, EVENT_TYPES, EVENT_STATUSES } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { hasWriteAccess } from '../utils/roles';
import { formatDate } from '../utils/date';
import { daysUntil } from '../utils/alerts';
import { EVENT_STATUS_COLORS, TASK_STATUS_COLORS } from '../utils/statusColors';
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
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ branchId: '', eventType: '', status: '' });
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getEvents(), getBranches(), getSettings()]).then(([e, b, s]) => {
      setEvents(e);
      setBranches(b);
      setSettings(s);
      setLoading(false);
    });
    if (user?.role === 'admin') getUsers().then(setUsers).catch(() => {});
  }, [user?.role]);

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

  const sorted = useMemo(
    () => filtered.slice().sort((a, b) => new Date(a.prepareDate).getTime() - new Date(b.prepareDate).getTime()),
    [filtered]
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

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleTask = async (eventId: string, task: EventTask) => {
    const nextStatus = task.status === 'הושלם' ? 'לביצוע' : 'הושלם';
    const updated = await updateTask(eventId, task._id, { status: nextStatus });
    setEvents((prev) => prev.map((e) => (e._id === eventId ? updated : e)));
  };

  const branchName = (e: StudioEvent) => {
    if (!e.branchId) return t('events.studioWide');
    return typeof e.branchId === 'string' ? branches.find((b) => b._id === e.branchId)?.name : e.branchId.name;
  };

  const assigneeName = (assigneeId?: string | User | null) => {
    if (!assigneeId) return '—';
    if (typeof assigneeId === 'string') return users.find((u) => u._id === assigneeId)?.name ?? '—';
    return assigneeId.name;
  };

  const taskUrgency = (task: EventTask): 'overdue' | 'upcoming' | null => {
    if (!task.dueDate || task.status === 'הושלם' || task.status === 'בוטל' || !settings) return null;
    const days = daysUntil(task.dueDate);
    if (days < 0) return 'overdue';
    if (days <= settings.taskDueAlertThresholdDays) return 'upcoming';
    return null;
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-nowrap gap-2 flex-1 min-w-0">
          <select
            className="input flex-1 min-w-0"
            value={filters.branchId}
            onChange={(e) => setFilters((f) => ({ ...f, branchId: e.target.value }))}
          >
            <option value="">{t('events.filterAllBranches')}</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            className="input flex-1 min-w-0"
            value={filters.eventType}
            onChange={(e) => setFilters((f) => ({ ...f, eventType: e.target.value }))}
          >
            <option value="">{t('events.filterAllTypes')}</option>
            {EVENT_TYPES.map((et) => (
              <option key={et} value={et}>
                {t(`eventTypes.${et}`)}
              </option>
            ))}
          </select>
          <select
            className="input flex-1 min-w-0"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">{t('events.filterAllStatuses')}</option>
            {EVENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`eventStatus.${s}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
            <button
              type="button"
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'cards' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'
              }`}
              onClick={() => setViewMode('cards')}
            >
              {t('events.cardView')}
            </button>
            <button
              type="button"
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'table' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'
              }`}
              onClick={() => setViewMode('table')}
            >
              {t('events.tableView')}
            </button>
          </div>
          {canWrite && (
            <Button size="sm" onClick={() => setAddModal(true)}>
              + {t('events.addEvent')}
            </Button>
          )}
        </div>
      </div>

      {viewMode === 'cards' ? (
        <div className="space-y-3">
          {sorted.map((e) => {
            const expanded = expandedIds.has(e._id);
            return (
              <div key={e._id} className="card !p-0 overflow-hidden">
                <div
                  className="flex items-center justify-between gap-3 p-4 cursor-pointer"
                  onClick={() => toggleExpanded(e._id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-gray-400 text-xs flex-shrink-0 w-3">{expanded ? '▲' : '▼'}</span>
                    <div className="min-w-0">
                      <Link
                        to={`/events/${e._id}`}
                        className="font-medium text-gray-800 hover:text-primary"
                        onClick={(ev) => ev.stopPropagation()}
                      >
                        {e.title}
                      </Link>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {branchName(e)} · {t(`eventTypes.${e.eventType}`)} · {t('events.eventDate')}: {formatDate(e.eventDate)} ·{' '}
                        {t('events.prepareDate')}: {formatDate(e.prepareDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(ev) => ev.stopPropagation()}>
                    <Badge label={t(`eventStatus.${e.status}`)} color={EVENT_STATUS_COLORS[e.status]} />
                    {canWrite && (
                      <button className="text-xs text-red-500" onClick={() => handleDelete(e._id)}>
                        {t('common.delete')}
                      </button>
                    )}
                  </div>
                </div>
                {expanded && (
                  <div className="border-t border-gray-100 divide-y divide-gray-100">
                    {e.tasks.length === 0 ? (
                      <p className="text-sm text-gray-400 px-4 py-3">{t('common.noData')}</p>
                    ) : (
                      e.tasks.map((task) => {
                        const urgency = taskUrgency(task);
                        const done = task.status === 'הושלם';
                        return (
                          <div
                            key={task._id}
                            className={`flex items-center gap-3 px-4 py-2.5 ${
                              urgency === 'overdue' ? 'bg-red-50' : urgency === 'upcoming' ? 'bg-amber-50' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="w-4 h-4 accent-primary flex-shrink-0"
                              checked={done}
                              disabled={!canWrite}
                              onChange={() => handleToggleTask(e._id, task)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{task.title}</p>
                              <p
                                className={`text-xs ${
                                  urgency === 'overdue'
                                    ? 'text-red-600 font-semibold'
                                    : urgency === 'upcoming'
                                      ? 'text-amber-700 font-medium'
                                      : 'text-gray-500'
                                }`}
                              >
                                {t('events.assignee')}: {assigneeName(task.assigneeId)}
                                {task.dueDate ? ` · ${t('events.dueDate')}: ${formatDate(task.dueDate)}` : ''}
                                {urgency === 'overdue' ? ` · ${t('events.taskOverdue')}` : ''}
                                {urgency === 'upcoming' ? ` · ${t('events.taskUpcoming')}` : ''}
                              </p>
                            </div>
                            {!done && task.status !== 'לביצוע' && (
                              <Badge label={t(`taskStatus.${task.status}`)} color={TASK_STATUS_COLORS[task.status]} />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {sorted.length === 0 && <p className="text-sm text-gray-400 text-center py-6">{t('common.noData')}</p>}
        </div>
      ) : (
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
              {sorted.map((e) => (
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
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                    {t('common.noData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

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
