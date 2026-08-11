import mongoose, { Schema, Document, Types } from 'mongoose';

export type EventType = 'מופע' | 'תחרות' | 'סדנה' | 'פגישת_צוות' | 'אחר';
export type EventStatus = 'מתוכנן' | 'בהכנה' | 'הושלם' | 'בוטל';
export type TaskStatus = 'לביצוע' | 'בתהליך' | 'הושלם' | 'בוטל';

export interface ITask {
  _id: Types.ObjectId;
  title: string;
  status: TaskStatus;
  assigneeId?: Types.ObjectId | null;
  dueDate?: Date | null;
  lastAlertedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IEvent extends Document {
  title: string;
  description?: string;
  branchId?: Types.ObjectId | null; // null = studio-wide
  eventType: EventType;
  eventDate: Date;
  prepareDate: Date;
  status: EventStatus;
  addedBy: Types.ObjectId;
  lastAlertedAt?: Date | null;
  tasks: ITask[];
}

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true },
    status: { type: String, enum: ['לביצוע', 'בתהליך', 'הושלם', 'בוטל'], default: 'לביצוע' },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    dueDate: { type: Date, default: null },
    lastAlertedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const EventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    eventType: {
      type: String,
      enum: ['מופע', 'תחרות', 'סדנה', 'פגישת_צוות', 'אחר'],
      default: 'אחר',
    },
    eventDate: { type: Date, required: true },
    prepareDate: { type: Date, required: true },
    status: { type: String, enum: ['מתוכנן', 'בהכנה', 'הושלם', 'בוטל'], default: 'מתוכנן' },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lastAlertedAt: { type: Date, default: null },
    tasks: [TaskSchema],
  },
  { timestamps: true }
);

EventSchema.index({ branchId: 1, eventDate: 1 });
EventSchema.index({ prepareDate: 1 });

export default mongoose.model<IEvent>('Event', EventSchema);
