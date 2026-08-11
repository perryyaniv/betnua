import mongoose, { Schema, Document } from 'mongoose';

export interface IPushSubscription extends Document {
  userId: mongoose.Types.ObjectId;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  deviceLabel?: string;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    deviceLabel: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<IPushSubscription>('PushSubscription', PushSubscriptionSchema);
