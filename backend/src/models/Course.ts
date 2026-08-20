import mongoose, { Schema, Document, Types } from 'mongoose';

export type AgeCategory = 'youngest' | 'midElementary' | 'teens' | 'adultWomen';
export const AGE_CATEGORIES: AgeCategory[] = ['youngest', 'midElementary', 'teens', 'adultWomen'];

export type CourseLinkType = 'whatsapp' | 'image' | 'registration' | 'generic';
export const COURSE_LINK_TYPES: CourseLinkType[] = ['whatsapp', 'image', 'registration', 'generic'];

export interface ICourseLink {
  _id: Types.ObjectId;
  name: string;
  url: string;
  type: CourseLinkType;
}

export interface ICourse extends Document {
  branchId: mongoose.Types.ObjectId;
  courseTypeId: mongoose.Types.ObjectId;
  teacherIds: mongoose.Types.ObjectId[];
  seasonId: mongoose.Types.ObjectId;
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  roomName: string;
  ageGroupLevel: string;
  ageCategory?: AgeCategory;
  notes: string;
  isOpen: boolean;
  troupeId?: mongoose.Types.ObjectId;
  mandatoryForTroupeIds: mongoose.Types.ObjectId[];
  links: ICourseLink[];
  capacity?: number;
  price?: number;
  isActive: boolean;
}

const CourseLinkSchema = new Schema<ICourseLink>(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    type: { type: String, enum: COURSE_LINK_TYPES, default: 'generic' },
  },
  { _id: true }
);

const CourseSchema = new Schema<ICourse>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    courseTypeId: { type: Schema.Types.ObjectId, ref: 'CourseType', required: true },
    teacherIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Teacher' }], required: true, validate: (v: unknown[]) => v.length > 0 },
    seasonId: { type: Schema.Types.ObjectId, ref: 'Season', required: true },
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    roomName: { type: String, required: true, trim: true },
    ageGroupLevel: { type: String, default: '', trim: true },
    ageCategory: { type: String, enum: AGE_CATEGORIES },
    notes: { type: String, default: '', trim: true },
    isOpen: { type: Boolean, default: true },
    troupeId: { type: Schema.Types.ObjectId, ref: 'Troupe' },
    mandatoryForTroupeIds: [{ type: Schema.Types.ObjectId, ref: 'Troupe' }],
    links: { type: [CourseLinkSchema], default: [] },
    capacity: { type: Number },
    price: { type: Number },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CourseSchema.index({ branchId: 1, dayOfWeek: 1 });
CourseSchema.index({ branchId: 1, ageCategory: 1 });
CourseSchema.index({ mandatoryForTroupeIds: 1 });

export default mongoose.model<ICourse>('Course', CourseSchema);
