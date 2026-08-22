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
import Spinner from '../components/ui/Spinner';

const OPEN_EVENT_STATUSES = ['מתוכנן', 'בהכנה'];
const OPEN_TASK_STATUSES = ['לביצוע', 'בתהליך'];

function AlertIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
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

  const branchKpis = branches.map((b) => ({
    label: b.name,
    count: courses.filter((c) => (typeof c.branchId === 'string' ? c.branchId : c.branchId._id) === b._id).length,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2">
        <Card className={`flex items-center gap-2 !py-1.5 !px-3 ${overdueCount > 0 ? 'border-r-red-500' : 'border-r-green-500'}`}>
          <div className="flex-1 text-center">
            <p className={`text-2xl font-bold leading-none ${overdueCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{overdueCount}</p>
            <p className="text-xs text-gray-500 mt-1">{t('dashboard.tasksDue')}</p>
          </div>
          {overdueCount > 0 && (
            <div className="flex-shrink-0 border-r border-gray-100 pr-2">
              <AlertIcon className="w-6 h-6 text-red-500" />
            </div>
          )}
        </Card>
        <Card className={`flex items-center gap-2 !py-1.5 !px-3 ${upcomingCount > 0 ? 'border-r-yellow-500' : 'border-r-green-500'}`}>
          <div className="flex-1 text-center">
            <p className={`text-2xl font-bold leading-none ${upcomingCount > 0 ? 'text-yellow-600' : 'text-green-600'}`}>{upcomingCount}</p>
            <p className="text-xs text-gray-500 mt-1">{t('dashboard.tasksAlert')}</p>
          </div>
          {upcomingCount > 0 && (
            <div className="flex-shrink-0 border-r border-gray-100 pr-2">
              <AlertIcon className="w-6 h-6 text-yellow-500" />
            </div>
          )}
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
                  className={`flex items-center gap-3 !py-2 !px-3 ${
                    urgency === 'overdue' ? 'border-r-red-500' : urgency === 'upcoming' ? 'border-r-yellow-500' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-primary flex-shrink-0"
                    checked={false}
                    onChange={() => handleToggleTask(event._id, task)}
                  />
                  <Link to={`/events/${event._id}`} className="flex-1 min-w-0 hover:opacity-80">
                    <p
                      className={`font-medium flex items-center gap-1 ${
                        urgency === 'overdue' ? 'text-red-600 font-semibold' : urgency === 'upcoming' ? 'text-yellow-600 font-semibold' : 'text-gray-800'
                      }`}
                    >
                      {urgency && <AlertIcon className="w-3.5 h-3.5 flex-shrink-0" />}
                      {task.title}
                    </p>
                    <p className="text-sm font-semibold text-gray-700">{event.title}</p>
                    <p className="text-xs text-gray-500">{t('events.dueDate')}: {formatDate(task.dueDate)}</p>
                    {urgency === 'overdue' && <p className="text-xs text-red-600 font-medium">{t('events.taskOverdue')}</p>}
                    {urgency === 'upcoming' && <p className="text-xs text-yellow-600 font-medium">{t('events.taskUpcoming')}</p>}
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="section-title">{t('dashboard.coursesPerBranch')}</h2>
        <Card className="text-center !py-1.5 !px-2 mb-3">
          <p className="text-xl font-bold leading-none text-primary">{courses.length}</p>
          <p className="text-xs text-gray-600 mt-1">{t('dashboard.total')}</p>
        </Card>
        <div className="grid grid-cols-3 gap-3">
          {branchKpis.map((row) => (
            <Card key={row.label} className="text-center !py-1.5 !px-2">
              <p className="text-xl font-bold leading-none text-primary">{row.count}</p>
              <p className="text-xs text-gray-600 mt-1">{row.label}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
