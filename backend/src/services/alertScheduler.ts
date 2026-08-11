import cron from 'node-cron';
import Event from '../models/Event';
import User from '../models/User';
import AppSettings from '../models/AppSettings';
import { isDueForAlert } from './alertThresholds';
import { sendPushToUser } from './pushSender';

async function getThresholds() {
  const settings = await AppSettings.findOne();
  return {
    eventPrepareAlertThresholdDays: settings?.eventPrepareAlertThresholdDays ?? 14,
    taskDueAlertThresholdDays: settings?.taskDueAlertThresholdDays ?? 7,
  };
}

/** Evaluates prepare-date and task-due-date thresholds and sends push alerts for newly-crossed ones. */
export async function runAlertCheck(now = new Date()) {
  const { eventPrepareAlertThresholdDays, taskDueAlertThresholdDays } = await getThresholds();
  const adminIds = (await User.find({ role: 'admin', active: true }).select('_id')).map((u) => String(u._id));

  const openEvents = await Event.find({ status: { $nin: ['הושלם', 'בוטל'] } });

  for (const event of openEvents) {
    let dirty = false;

    if (isDueForAlert(event.prepareDate, eventPrepareAlertThresholdDays, event.lastAlertedAt, now)) {
      const recipients = new Set([String(event.addedBy), ...adminIds]);
      await Promise.all(
        Array.from(recipients).map((userId) =>
          sendPushToUser(userId, {
            title: 'אירוע דורש הכנה',
            body: event.title,
            url: `/events/${event._id}`,
          })
        )
      );
      event.lastAlertedAt = now;
      dirty = true;
    }

    for (const task of event.tasks) {
      if (
        task.status !== 'הושלם' &&
        task.status !== 'בוטל' &&
        task.dueDate &&
        task.assigneeId &&
        isDueForAlert(task.dueDate, taskDueAlertThresholdDays, task.lastAlertedAt, now)
      ) {
        await sendPushToUser(String(task.assigneeId), {
          title: 'משימה מתקרבת',
          body: `${task.title} (${event.title})`,
          url: `/events/${event._id}`,
        });
        task.lastAlertedAt = now;
        dirty = true;
      }
    }

    if (dirty) await event.save();
  }
}

export function startAlertScheduler() {
  // Hourly is frequent enough for day-granularity thresholds without hammering the DB.
  cron.schedule('0 * * * *', () => {
    runAlertCheck().catch((err) => console.error('Alert check failed:', err));
  });
}
