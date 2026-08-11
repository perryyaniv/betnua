import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return; // push disabled until keys are set
  webpush.setVapidDetails(process.env.VAPID_CONTACT_EMAIL || 'mailto:admin@example.com', publicKey, privateKey);
  configured = true;
}

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  ensureConfigured();
  if (!configured) return;

  const subscriptions = await PushSubscription.find({ userId });
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify(payload)
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await sub.deleteOne(); // expired/invalid subscription
        } else {
          console.error('Push send error:', err);
        }
      }
    })
  );
}
