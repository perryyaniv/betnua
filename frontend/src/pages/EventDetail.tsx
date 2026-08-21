import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getEvent, updateEvent, addTask, updateTask, deleteTask } from '../api/events';
import { getUsers } from '../api/users';
import { getSettings } from '../api/settings';
import { StudioEvent, User, AppSettings, EVENT_STATUSES, TASK_STATUSES } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { hasWriteAccess } from '../utils/roles';
import { formatDate, toDateInputValue } from '../utils/date';
import { daysUntil } from '../utils/alerts';
import { EVENT_STATUS_COLORS, TASK_STATUS_COLORS } from '../utils/statusColors';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
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

  const handleStatusChange = async (status: string) => {
    const updated = await updateEvent(event._id, { status } as never);
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

  const handleTaskStatus = async (taskId: string, status: string) => {
    const updated = await updateTask(event._id, taskId, { status });
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
            <h2 className="text-lg font-bold text-gray-800">{event.title}</h2>
            {event.description && <p className="text-sm text-gray-600 mt-1">{event.description}</p>}
          </div>
          {canWrite ? (
            <select className="input max-w-[160px]" value={event.status} onChange={(e) => handleStatusChange(e.target.value)}>
              {EVENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`eventStatus.${s}`)}
                </option>
              ))}
            </select>
          ) : (
            <Badge label={t(`eventStatus.${event.status}`)} color={EVENT_STATUS_COLORS[event.status]} />
          )}
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
            return (
            <Card
              key={task._id}
              className={`flex items-center justify-between gap-3 ${
                urgency === 'overdue'
                  ? 'bg-red-600 border-red-600 border-r-red-800'
                  : urgency === 'upcoming'
                    ? 'bg-orange-700 border-orange-700 border-r-orange-900'
                    : ''
              }`}
            >
              <div>
                <p className={`font-medium ${urgency ? 'text-white' : 'text-gray-800'}`}>{task.title}</p>
                <p className={`text-xs ${urgency ? 'text-white/90' : 'text-gray-500'}`}>
                  {t('events.assignee')}: {assigneeName(task.assigneeId)}
                  {task.dueDate ? ` · ${t('events.dueDate')}: ${formatDate(task.dueDate)}` : ''}
                  {urgency === 'overdue' ? ` · ${t('events.taskOverdue')}` : ''}
                  {urgency === 'upcoming' ? ` · ${t('events.taskUpcoming')}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canWrite ? (
                  <select className="input max-w-[130px]" value={task.status} onChange={(e) => handleTaskStatus(task._id, e.target.value)}>
                    {TASK_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {t(`taskStatus.${s}`)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Badge label={t(`taskStatus.${task.status}`)} color={TASK_STATUS_COLORS[task.status]} />
                )}
                {canWrite && (
                  <button className="text-xs text-red-500" onClick={() => handleDeleteTask(task._id)}>
                    {t('common.delete')}
                  </button>
                )}
              </div>
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
