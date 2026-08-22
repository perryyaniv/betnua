import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getEvents, createEvent, deleteEvent, addTask, updateTask } from '../api/events';
import { getBranches } from '../api/branches';
import { getSettings } from '../api/settings';
import { getUsers } from '../api/users';
import { StudioEvent, Branch, AppSettings, User, EventTask, EVENT_TYPES, EVENT_STATUSES } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { hasWriteAccess } from '../utils/roles';
import { formatDate, toDateInputValue } from '../utils/date';
import { daysUntil } from '../utils/alerts';
import { EVENT_STATUS_COLORS } from '../utils/statusColors';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';

const emptyForm = { title: '', description: '', branchId: '', eventType: 'אחר', eventDate: '', prepareDate: '' };

function AlertIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.947-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
}

function XIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

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
  const [addTaskEventId, setAddTaskEventId] = useState<string | null>(null);
  const [newTaskForm, setNewTaskForm] = useState({ title: '', assigneeId: '', dueDate: '' });
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

  const openAddTask = (eventId: string) => {
    setNewTaskForm({ title: '', assigneeId: '', dueDate: '' });
    setAddTaskEventId(eventId);
  };

  const handleAddTask = async () => {
    const title = newTaskForm.title.trim();
    if (!title || !addTaskEventId) return;
    const updated = await addTask(addTaskEventId, {
      title,
      assigneeId: newTaskForm.assigneeId || null,
      dueDate: newTaskForm.dueDate || null,
    });
    setEvents((prev) => prev.map((e) => (e._id === addTaskEventId ? updated : e)));
    setAddTaskEventId(null);
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

  const eventSeverity = (e: StudioEvent): 'overdue' | 'upcoming' | null => {
    let upcoming = false;
    for (const task of e.tasks) {
      const urgency = taskUrgency(task);
      if (urgency === 'overdue') return 'overdue';
      if (urgency === 'upcoming') upcoming = true;
    }
    return upcoming ? 'upcoming' : null;
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div className="flex flex-nowrap gap-2 min-w-0">
          <div className="flex-1 min-w-0">
            <label className="label text-right">{t('events.branch')}</label>
            <select
              className="input w-full"
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
          </div>
          <div className="flex-1 min-w-0">
            <label className="label text-right">{t('events.eventType')}</label>
            <select
              className="input w-full"
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
          </div>
          <div className="flex-1 min-w-0">
            <label className="label text-right">{t('events.status')}</label>
            <select
              className="input w-full"
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
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            aria-pressed={viewMode === 'table'}
            onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              viewMode === 'table' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-300'
            }`}
          >
            {t('events.tableToggle')}
          </button>
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
            const severity = eventSeverity(e);
            return (
              <div
                key={e._id}
                className="rounded-md border border-gray-200 bg-white p-2 cursor-pointer"
                onClick={() => toggleExpanded(e._id)}
              >
                <div className="flex items-center gap-2">
                  {canWrite && (
                    <button
                      type="button"
                      className="text-gray-400 hover:text-red-500 flex-shrink-0"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        handleDelete(e._id);
                      }}
                      aria-label={t('common.delete')}
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/events/${e._id}`}
                        className="text-sm font-semibold text-gray-800 hover:text-primary"
                        onClick={(ev) => ev.stopPropagation()}
                      >
                        {e.title}
                      </Link>
                      {severity && (
                        <span
                          className={severity === 'overdue' ? 'text-red-500' : 'text-yellow-500'}
                          title={t(severity === 'overdue' ? 'events.taskOverdue' : 'events.taskUpcoming')}
                        >
                          <AlertIcon className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {branchName(e)} · {t(`eventTypes.${e.eventType}`)} · {t('events.eventDate')}: {formatDate(e.eventDate)}
                    </p>
                  </div>
                  <Badge label={t(`eventStatus.${e.status}`)} color={EVENT_STATUS_COLORS[e.status]} />
                </div>
                {expanded && (
                  <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5" onClick={(ev) => ev.stopPropagation()}>
                    {e.tasks.length === 0 ? (
                      <p className="text-sm text-gray-400">{t('common.noData')}</p>
                    ) : (
                      e.tasks.map((task) => {
                        const urgency = taskUrgency(task);
                        const done = task.status === 'הושלם';
                        return (
                          <div key={task._id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              className="w-4 h-4 accent-primary flex-shrink-0"
                              checked={done}
                              disabled={!canWrite}
                              onChange={() => handleToggleTask(e._id, task)}
                            />
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm flex items-center gap-1 ${
                                  done
                                    ? 'text-gray-400 line-through'
                                    : urgency === 'overdue'
                                      ? 'text-red-600 font-semibold'
                                      : urgency === 'upcoming'
                                        ? 'text-yellow-600 font-semibold'
                                        : 'text-gray-800'
                                }`}
                              >
                                {!done && urgency && <AlertIcon className="w-3.5 h-3.5 flex-shrink-0" />}
                                {task.title}
                              </p>
                              <p className="text-xs text-gray-500">{t('events.assignee')}: {assigneeName(task.assigneeId)}</p>
                              {task.dueDate && <p className="text-xs text-gray-500">{t('events.dueDate')}: {formatDate(task.dueDate)}</p>}
                            </div>
                          </div>
                        );
                      })
                    )}
                    {canWrite && (
                      <div className="pt-1">
                        <Button size="sm" variant="secondary" onClick={() => openAddTask(e._id)}>
                          + {t('events.addTask')}
                        </Button>
                      </div>
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

      <Modal open={!!addTaskEventId} onClose={() => setAddTaskEventId(null)} title={t('events.addTask')}>
        <div className="space-y-4">
          <div>
            <label className="label">{t('events.taskTitle')}</label>
            <input
              className="input"
              value={newTaskForm.title}
              onChange={(ev) => setNewTaskForm((f) => ({ ...f, title: ev.target.value }))}
            />
          </div>
          <div>
            <label className="label">{t('events.assignee')}</label>
            <select
              className="input"
              value={newTaskForm.assigneeId}
              onChange={(ev) => setNewTaskForm((f) => ({ ...f, assigneeId: ev.target.value }))}
            >
              <option value="">—</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('events.dueDate')}</label>
            <input
              type="date"
              className="input"
              value={toDateInputValue(newTaskForm.dueDate)}
              onChange={(ev) => setNewTaskForm((f) => ({ ...f, dueDate: ev.target.value }))}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setAddTaskEventId(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddTask} disabled={!newTaskForm.title.trim()}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
