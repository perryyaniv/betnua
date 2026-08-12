import mongoose, { Schema, Document } from 'mongoose';

export interface IAppSettings extends Document {
  eventPrepareAlertThresholdDays: number;
  taskDueAlertThresholdDays: number;
  leadSlaThresholdHours: number;
}

const AppSettingsSchema = new Schema<IAppSettings>(
  {
    eventPrepareAlertThresholdDays: { type: Number, default: 14 },
    taskDueAlertThresholdDays: { type: Number, default: 7 },
    leadSlaThresholdHours: { type: Number, default: 4 },
  },
  { timestamps: true }
);

export default mongoose.model<IAppSettings>('AppSettings', AppSettingsSchema);
