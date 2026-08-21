import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getEvents, updateTask } from '../api/events';
import { getSettings } from '../api/settings';
import { getBranches } from '../api/branches';
import { getCourses } from '../api/courses';
import { StudioEvent, Branch, Course, AppSettings, EventTask } from '../types';
import { daysUntil, isWithinThreshold } from '../utils/alerts';
import { formatDate } from '../utils/date';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import { TASK_STATUS_COLORS } from '../utils/statusColors';

const OPEN_EVENT_STATUSES = ['מתוכנן', 'בהכנה'];
const OPEN_TASK_STATUSES = ['לביצוע', 'בתהליך'];

export default function Dashboard() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<StudioEvent[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getEvents(), getSettings(), getBranches(), getCourses({ isActive: true })])
      .then(([e, s, b, c]) => {
        setEvents(e);
        setSettings(s);
        setBranches(b);
        setCourses(c);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !settings) return <Spinner />;

  const openEvents = events.filter((e) => OPEN_EVENT_STATUSES.includes(e.status));

  const tasksDue: { event: StudioEvent; task: EventTask }[] = [];
  for (const event of openEvents) {
    for (const task of event.tasks) {
      if (OPEN_TASK_STATUSES.includes(task.status) && task.dueDate && isWithinThreshold(task.dueDate, settings.taskDueAlertThresholdDays)) {
        tasksDue.push({ event, task });
      }
    }
  }
  tasksDue.sort((a, b) => new Date(a.task.dueDate!).getTime() - new Date(b.task.dueDate!).getTime());

  const taskUrgency = (task: EventTask): 'overdue' | 'upcoming' | null => {
    if (!task.dueDate) return null;
    const days = daysUntil(task.dueDate);
    if (days < 0) return 'overdue';
    if (days <= settings.taskDueAlertThresholdDays) return 'upcoming';
    return null;
  };

  const handleToggleTask = async (eventId: string, task: EventTask) => {
    const nextStatus = task.status === 'הושלם' ? 'לביצוע' : 'הושלם';
    const updated = await updateTask(eventId, task._id, { status: nextStatus });
    setEvents((prev) => prev.map((e) => (e._id === eventId ? updated : e)));
  };

  const overdueCount = tasksDue.filter(({ task }) => taskUrgency(task) === 'overdue').length;
  const upcomingCount = tasksDue.filter(({ task }) => taskUrgency(task) === 'upcoming').length;

  const branchKpis = [
    { label: t('dashboard.total'), count: courses.length },
    ...branches.map((b) => ({
      label: b.name,
      count: courses.filter((c) => (typeof c.branchId === 'string' ? c.branchId : c.branchId._id) === b._id).length,
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2">
        <Card className={`text-center !py-1.5 !px-2 ${overdueCount > 0 ? 'bg-red-50 border-red-200 border-r-red-500' : ''}`}>
          <p className={`text-xl font-bold leading-none ${overdueCount > 0 ? 'text-red-600' : 'text-primary'}`}>{overdueCount}</p>
          <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">{t('dashboard.tasksDue')}</p>
        </Card>
        <Card className={`text-center !py-1.5 !px-2 ${upcomingCount > 0 ? 'bg-amber-50 border-amber-200 border-r-amber-500' : ''}`}>
          <p className={`text-xl font-bold leading-none ${upcomingCount > 0 ? 'text-amber-600' : 'text-primary'}`}>{upcomingCount}</p>
          <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">{t('dashboard.tasksAlert')}</p>
        </Card>
      </div>

      <div>
        <h2 className="section-title">{t('dashboard.tasksDue')}</h2>
        {tasksDue.length === 0 ? (
          <Card className="text-sm text-gray-500">{t('dashboard.noAlerts')}</Card>
        ) : (
          <div className="space-y-2">
            {tasksDue.map(({ event, task }) => {
              const urgency = taskUrgency(task);
              return (
                <Card
                  key={task._id}
                  className={`flex items-center gap-3 ${
                    urgency === 'overdue'
                      ? 'border-red-300 border-r-red-500 bg-red-50'
                      : urgency === 'upcoming'
                        ? 'border-amber-300 border-r-amber-500 bg-amber-50'
                        : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-primary flex-shrink-0"
                    checked={false}
                    onChange={() => handleToggleTask(event._id, task)}
                  />
                  <Link to={`/events/${event._id}`} className="flex-1 min-w-0 hover:opacity-80">
                    <p className="font-medium text-gray-800 truncate">{task.title}</p>
                    <p className={`text-xs truncate ${urgency === 'overdue' ? 'text-red-600 font-semibold' : urgency === 'upcoming' ? 'text-amber-700 font-medium' : 'text-gray-500'}`}>
                      {event.title} · {t('events.dueDate')}: {formatDate(task.dueDate)}
                      {urgency === 'overdue' ? ` · ${t('events.taskOverdue')}` : ''}
                      {urgency === 'upcoming' ? ` · ${t('events.taskUpcoming')}` : ''}
                    </p>
                  </Link>
                  <Badge label={task.status} color={TASK_STATUS_COLORS[task.status]} />
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="section-title">{t('dashboard.coursesPerBranch')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {branchKpis.map((row) => (
            <Card key={row.label} className="text-center !py-1.5 !px-2">
              <p className="text-lg font-bold leading-none text-primary">{row.count}</p>
              <p className="text-[11px] text-gray-600 mt-0.5 leading-tight">{row.label}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
