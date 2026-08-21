import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getEvents, updateTask } from '../api/events';
import { getSettings } from '../api/settings';
import { getBranches } from '../api/branches';
import { getTeachers } from '../api/teachers';
import { getCourses } from '../api/courses';
import { StudioEvent, Branch, Teacher, Course, AppSettings, EventTask } from '../types';
import { daysUntil, isWithinThreshold } from '../utils/alerts';
import { formatDate } from '../utils/date';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import { EVENT_STATUS_COLORS, TASK_STATUS_COLORS } from '../utils/statusColors';

const OPEN_EVENT_STATUSES = ['מתוכנן', 'בהכנה'];
const OPEN_TASK_STATUSES = ['לביצוע', 'בתהליך'];

export default function Dashboard() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<StudioEvent[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getEvents(), getSettings(), getBranches(), getTeachers(), getCourses({ isActive: true })])
      .then(([e, s, b, te, c]) => {
        setEvents(e);
        setSettings(s);
        setBranches(b);
        setTeachers(te);
        setCourses(c);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !settings) return <Spinner />;

  const openEvents = events.filter((e) => OPEN_EVENT_STATUSES.includes(e.status));
  const eventsNeedingPrep = openEvents
    .filter((e) => isWithinThreshold(e.prepareDate, settings.eventPrepareAlertThresholdDays))
    .sort((a, b) => new Date(a.prepareDate).getTime() - new Date(b.prepareDate).getTime());

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

  const coursesPerBranch = branches.map((b) => ({
    branch: b.name,
    count: courses.filter((c) => (typeof c.branchId === 'string' ? c.branchId : c.branchId._id) === b._id).length,
  }));

  const eventsPrepSeverity: 'red' | 'amber' | null =
    eventsNeedingPrep.length === 0 ? null : eventsNeedingPrep.some((e) => daysUntil(e.prepareDate) < 0) ? 'red' : 'amber';
  const tasksDueSeverity: 'red' | 'amber' | null =
    tasksDue.length === 0 ? null : tasksDue.some(({ task }) => taskUrgency(task) === 'overdue') ? 'red' : 'amber';

  const kpiClasses = (severity: 'red' | 'amber' | null) => {
    if (severity === 'red') return { card: 'bg-red-50 border-red-200 border-r-red-500', text: 'text-red-600' };
    if (severity === 'amber') return { card: 'bg-amber-50 border-amber-200 border-r-amber-500', text: 'text-amber-600' };
    return { card: '', text: 'text-primary' };
  };
  const prepKpi = kpiClasses(eventsPrepSeverity);
  const tasksKpi = kpiClasses(tasksDueSeverity);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-2">
        <Card className={`text-center !p-1.5 ${prepKpi.card}`}>
          <p className={`text-base font-bold leading-none ${prepKpi.text}`}>{eventsNeedingPrep.length}</p>
          <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{t('dashboard.eventsNeedingPrep')}</p>
        </Card>
        <Card className={`text-center !p-1.5 ${tasksKpi.card}`}>
          <p className={`text-base font-bold leading-none ${tasksKpi.text}`}>{tasksDue.length}</p>
          <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{t('dashboard.tasksDue')}</p>
        </Card>
        <Card className="text-center !p-1.5">
          <p className="text-base font-bold leading-none text-primary">{courses.length}</p>
          <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{t('nav.courses')}</p>
        </Card>
        <Card className="text-center !p-1.5">
          <p className="text-base font-bold leading-none text-primary">{teachers.filter((te) => te.isActive).length}</p>
          <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{t('dashboard.activeTeachers')}</p>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h2 className="section-title">{t('dashboard.eventsNeedingPrep')}</h2>
          {eventsNeedingPrep.length === 0 ? (
            <Card className="text-sm text-gray-500">{t('dashboard.noAlerts')}</Card>
          ) : (
            <div className="space-y-2">
              {eventsNeedingPrep.map((e) => (
                <Link key={e._id} to={`/events/${e._id}`}>
                  <Card className="flex items-center justify-between gap-3 hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-800">{e.title}</p>
                      <p className="text-xs text-gray-500">
                        {t('events.prepareDate')}: {formatDate(e.prepareDate)}
                        {e.branchId && typeof e.branchId !== 'string' ? ` · ${e.branchId.name}` : ''}
                      </p>
                    </div>
                    <Badge label={e.status} color={EVENT_STATUS_COLORS[e.status]} />
                  </Card>
                </Link>
              ))}
            </div>
          )}
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
                      <p className="font-medium text-gray-800">{task.title}</p>
                      <p className={`text-xs ${urgency === 'overdue' ? 'text-red-600 font-semibold' : urgency === 'upcoming' ? 'text-amber-700 font-medium' : 'text-gray-500'}`}>
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
      </div>

      <div>
        <h2 className="section-title">{t('dashboard.coursesPerBranch')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {coursesPerBranch.map((row) => (
            <Card key={row.branch} className="text-center !p-1.5">
              <p className="text-base font-bold leading-none text-primary">{row.count}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{row.branch}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
