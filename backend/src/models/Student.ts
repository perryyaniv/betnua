import mongoose, { Schema, Document, Types } from 'mongoose';

export type EnrollmentStatus = 'פעיל' | 'פרש';

export interface IEnrollment {
  _id: Types.ObjectId;
  courseId: Types.ObjectId;
  status: EnrollmentStatus;
  enrolledAt: Date;
  droppedAt?: Date | null;
  dropoutReasonId?: Types.ObjectId | null;
  dropoutNote?: string;
}

export interface IStudent extends Document {
  name: string;
  guardianPhone: string;
  enrollments: IEnrollment[];
}

const EnrollmentSchema = new Schema<IEnrollment>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    status: { type: String, enum: ['פעיל', 'פרש'], default: 'פעיל' },
    enrolledAt: { type: Date, default: Date.now },
    droppedAt: { type: Date, default: null },
    dropoutReasonId: { type: Schema.Types.ObjectId, ref: 'DropoutReason', default: null },
    dropoutNote: { type: String, default: '' },
  },
  { timestamps: true }
);

const StudentSchema = new Schema<IStudent>(
  {
    name: { type: String, required: true, trim: true },
    guardianPhone: { type: String, default: '', trim: true },
    enrollments: [EnrollmentSchema],
  },
  { timestamps: true }
);

StudentSchema.index({ 'enrollments.courseId': 1 });

export default mongoose.model<IStudent>('Student', StudentSchema);
