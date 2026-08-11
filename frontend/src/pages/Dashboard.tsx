import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getEvents } from '../api/events';
import { getSettings } from '../api/settings';
import { getBranches } from '../api/branches';
import { getTeachers } from '../api/teachers';
import { getCourses } from '../api/courses';
import { StudioEvent, Branch, Teacher, Course, AppSettings, EventTask } from '../types';
import { isWithinThreshold } from '../utils/alerts';
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

  const coursesPerBranch = branches.map((b) => ({
    branch: b.name,
    count: courses.filter((c) => (typeof c.branchId === 'string' ? c.branchId : c.branchId._id) === b._id).length,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="text-center">
          <p className="text-2xl font-bold text-primary">{eventsNeedingPrep.length}</p>
          <p className="text-xs text-gray-500 mt-1">{t('dashboard.eventsNeedingPrep')}</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-primary">{tasksDue.length}</p>
          <p className="text-xs text-gray-500 mt-1">{t('dashboard.tasksDue')}</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-primary">{courses.length}</p>
          <p className="text-xs text-gray-500 mt-1">{t('nav.courses')}</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-primary">{teachers.filter((te) => te.isActive).length}</p>
          <p className="text-xs text-gray-500 mt-1">{t('dashboard.activeTeachers')}</p>
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
              {tasksDue.map(({ event, task }) => (
                <Link key={task._id} to={`/events/${event._id}`}>
                  <Card className="flex items-center justify-between gap-3 hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-800">{task.title}</p>
                      <p className="text-xs text-gray-500">
                        {event.title} · {t('events.dueDate')}: {formatDate(task.dueDate)}
                      </p>
                    </div>
                    <Badge label={task.status} color={TASK_STATUS_COLORS[task.status]} />
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="section-title">{t('dashboard.coursesPerBranch')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {coursesPerBranch.map((row) => (
            <Card key={row.branch} className="text-center">
              <p className="text-xl font-bold text-primary">{row.count}</p>
              <p className="text-xs text-gray-500 mt-1">{row.branch}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
