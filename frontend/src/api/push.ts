import client from './client';

export const getPushPublicKey = () => client.get<{ publicKey: string }>('/push/public-key').then((r) => r.data.publicKey);

export const subscribePush = (subscription: PushSubscriptionJSON, deviceLabel?: string) =>
  client.post('/push/subscribe', { ...subscription, deviceLabel }).then((r) => r.data);

export const unsubscribePush = (endpoint: string) =>
  client.delete('/push/subscribe', { data: { endpoint } }).then((r) => r.data);
