import mongoose, { Schema, Document } from 'mongoose';

export interface ITeacher extends Document {
  name: string;
  phone: string;
  email?: string;
  photoUrl?: string;
  bio?: string;
  specialtyCourseTypeIds: mongoose.Types.ObjectId[];
  branchIds: mongoose.Types.ObjectId[];
  isActive: boolean;
}

const TeacherSchema = new Schema<ITeacher>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true },
    photoUrl: { type: String, default: '' },
    bio: { type: String, default: '' },
    specialtyCourseTypeIds: [{ type: Schema.Types.ObjectId, ref: 'CourseType' }],
    branchIds: [{ type: Schema.Types.ObjectId, ref: 'Branch' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<ITeacher>('Teacher', TeacherSchema);
