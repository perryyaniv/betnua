import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLogEntry extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  entityType: string;
  entityId?: mongoose.Types.ObjectId;
  action: string;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  timestamp: Date;
}

const AuditLogEntrySchema = new Schema<IAuditLogEntry>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: { type: Schema.Types.ObjectId },
  action: { type: String, required: true },
  fieldChanged: { type: String },
  oldValue: { type: String },
  newValue: { type: String },
  timestamp: { type: Date, default: Date.now },
});

AuditLogEntrySchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
AuditLogEntrySchema.index({ timestamp: -1 });

export default mongoose.model<IAuditLogEntry>('AuditLogEntry', AuditLogEntrySchema);
