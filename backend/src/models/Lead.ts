import mongoose, { Schema, Document, Types } from 'mongoose';

export type LeadSource = 'אתר' | 'טלפון' | 'רשתות_חברתיות' | 'הפניה' | 'אחר';
export type LeadStatus = 'חדש' | 'נוצר_קשר' | 'בטיפול' | 'נרשם' | 'לא_רלוונטי';

export interface ILead extends Document {
  name: string;
  phone: string;
  branchId: Types.ObjectId;
  source: LeadSource;
  status: LeadStatus;
  notes: string;
  convertedStudentId?: Types.ObjectId | null;
  createdBy: Types.ObjectId;
  lastAlertedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    source: { type: String, enum: ['אתר', 'טלפון', 'רשתות_חברתיות', 'הפניה', 'אחר'], default: 'אחר' },
    status: { type: String, enum: ['חדש', 'נוצר_קשר', 'בטיפול', 'נרשם', 'לא_רלוונטי'], default: 'חדש' },
    notes: { type: String, default: '' },
    convertedStudentId: { type: Schema.Types.ObjectId, ref: 'Student', default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lastAlertedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

LeadSchema.index({ branchId: 1, status: 1 });

export default mongoose.model<ILead>('Lead', LeadSchema);
