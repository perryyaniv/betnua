import mongoose, { Schema, Document } from 'mongoose';

export interface ICourse extends Document {
  branchId: mongoose.Types.ObjectId;
  courseTypeId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  seasonId: mongoose.Types.ObjectId;
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  roomName: string;
  ageGroupLevel: string;
  capacity?: number;
  price?: number;
  isActive: boolean;
}

const CourseSchema = new Schema<ICourse>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    courseTypeId: { type: Schema.Types.ObjectId, ref: 'CourseType', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
    seasonId: { type: Schema.Types.ObjectId, ref: 'Season', required: true },
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    roomName: { type: String, required: true, trim: true },
    ageGroupLevel: { type: String, default: '', trim: true },
    capacity: { type: Number },
    price: { type: Number },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CourseSchema.index({ branchId: 1, dayOfWeek: 1 });

export default mongoose.model<ICourse>('Course', CourseSchema);
