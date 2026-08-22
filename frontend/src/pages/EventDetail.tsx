import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getEvent, updateEvent, addTask, updateTask, deleteTask } from '../api/events';
import { getUsers } from '../api/users';
import { getSettings } from '../api/settings';
import { StudioEvent, User, AppSettings } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { hasWriteAccess } from '../utils/roles';
import { formatDate, toDateInputValue } from '../utils/date';
import { daysUntil } from '../utils/alerts';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';

const OPEN_TASK_STATUSES = ['לביצוע', 'בתהליך'];

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canWrite = hasWriteAccess(user?.role);

  const [event, setEvent] = useState<StudioEvent | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState({ title: '', assigneeId: '', dueDate: '' });

  useEffect(() => {
    if (!id) return;
    getEvent(id).then(setEvent).finally(() => setLoading(false));
    getSettings().then(setSettings).catch(() => {});
    if (user?.role === 'admin') getUsers().then(setUsers).catch(() => {});
  }, [id, user?.role]);

  if (loading || !event) return <Spinner />;

  const taskUrgency = (task: StudioEvent['tasks'][number]): 'overdue' | 'upcoming' | null => {
    if (!task.dueDate || !OPEN_TASK_STATUSES.includes(task.status)) return null;
    const days = daysUntil(task.dueDate);
    if (days < 0) return 'overdue';
    if (settings && days <= settings.taskDueAlertThresholdDays) return 'upcoming';
    return null;
  };

  const handleToggleEventDone = async () => {
    const nextStatus = event.status === 'הושלם' ? 'מתוכנן' : 'הושלם';
    const updated = await updateEvent(event._id, { status: nextStatus } as never);
    setEvent(updated);
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;
    const updated = await addTask(event._id, {
      title: newTask.title,
      assigneeId: newTask.assigneeId || null,
      dueDate: newTask.dueDate || null,
    });
    setEvent(updated);
    setNewTask({ title: '', assigneeId: '', dueDate: '' });
  };

  const handleToggleTask = async (task: StudioEvent['tasks'][number]) => {
    const nextStatus = task.status === 'הושלם' ? 'לביצוע' : 'הושלם';
    const updated = await updateTask(event._id, task._id, { status: nextStatus });
    setEvent(updated);
  };

  const handleDeleteTask = async (taskId: string) => {
    const updated = await deleteTask(event._id, taskId);
    setEvent(updated);
  };

  const assigneeName = (assigneeId?: string | User | null) => {
    if (!assigneeId) return '—';
    if (typeof assigneeId === 'string') return users.find((u) => u._id === assigneeId)?.name ?? '—';
    return assigneeId.name;
  };

  return (
    <div className="space-y-4">
      <button onClick={() => navigate('/events')} className="text-sm text-primary">
        ← {t('nav.events')}
      </button>

      <Card>
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h2 className={`text-lg font-bold ${event.status === 'הושלם' ? 'text-green-600 line-through' : 'text-gray-800'}`}>{event.title}</h2>
            {event.description && <p className="text-sm text-gray-600 mt-1">{event.description}</p>}
          </div>
          <label className="flex items-center gap-1.5 text-sm text-gray-600">
            <input
              type="checkbox"
              className="w-4 h-4 accent-green-600"
              checked={event.status === 'הושלם'}
              disabled={!canWrite}
              onChange={handleToggleEventDone}
            />
            {t('events.done')}
          </label>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
          <div>
            <p className="label mb-0.5">{t('events.eventType')}</p>
            <p className="text-gray-700">{t(`eventTypes.${event.eventType}`)}</p>
          </div>
          <div>
            <p className="label mb-0.5">{t('events.eventDate')}</p>
            <p className="text-gray-700">{formatDate(event.eventDate)}</p>
          </div>
          <div>
            <p className="label mb-0.5">{t('events.prepareDate')}</p>
            <p className="text-gray-700">{formatDate(event.prepareDate)}</p>
          </div>
          <div>
            <p className="label mb-0.5">{t('events.addedDate')}</p>
            <p className="text-gray-700">{formatDate(event.createdAt)}</p>
          </div>
        </div>
      </Card>

      <div>
        <h3 className="section-title">{t('events.tasks')}</h3>
        <div className="space-y-2">
          {event.tasks.map((task) => {
            const urgency = taskUrgency(task);
            const done = task.status === 'הושלם';
            return (
            <Card
              key={task._id}
              className={`flex items-center justify-between gap-3 ${
                done
                  ? ''
                  : urgency === 'overdue'
                    ? 'border-red-300 border-r-red-500 bg-red-50'
                    : urgency === 'upcoming'
                      ? 'border-yellow-300 border-r-yellow-500 bg-yellow-50'
                      : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-green-600 flex-shrink-0"
                  checked={done}
                  disabled={!canWrite}
                  onChange={() => handleToggleTask(task)}
                />
                <div>
                  <p className={`font-medium ${done ? 'text-green-600 line-through' : 'text-gray-800'}`}>{task.title}</p>
                  <p className={`text-xs ${done ? 'text-gray-500' : urgency === 'overdue' ? 'text-red-600 font-semibold' : urgency === 'upcoming' ? 'text-yellow-700 font-medium' : 'text-gray-500'}`}>
                    {t('events.assignee')}: {assigneeName(task.assigneeId)}
                    {task.dueDate ? ` · ${t('events.dueDate')}: ${formatDate(task.dueDate)}` : ''}
                    {!done && urgency === 'overdue' ? ` · ${t('events.taskOverdue')}` : ''}
                    {!done && urgency === 'upcoming' ? ` · ${t('events.taskUpcoming')}` : ''}
                  </p>
                </div>
              </div>
              {canWrite && (
                <button className="text-xs text-red-500" onClick={() => handleDeleteTask(task._id)}>
                  {t('common.delete')}
                </button>
              )}
            </Card>
            );
          })}
          {event.tasks.length === 0 && <p className="text-sm text-gray-400">{t('common.noData')}</p>}
        </div>

        {canWrite && (
          <Card className="mt-3">
            <div className="grid sm:grid-cols-4 gap-2">
              <input
                className="input sm:col-span-2"
                placeholder={t('events.taskTitle')}
                value={newTask.title}
                onChange={(e) => setNewTask((f) => ({ ...f, title: e.target.value }))}
              />
              <select className="input" value={newTask.assigneeId} onChange={(e) => setNewTask((f) => ({ ...f, assigneeId: e.target.value }))}>
                <option value="">{t('events.assignee')}</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className="input"
                value={toDateInputValue(newTask.dueDate)}
                onChange={(e) => setNewTask((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
            <div className="flex justify-end mt-2">
              <Button size="sm" onClick={handleAddTask} disabled={!newTask.title.trim()}>
                + {t('events.addTask')}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
