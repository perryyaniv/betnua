import mongoose, { Schema, Document } from 'mongoose';

export interface ICourseType extends Document {
  name: string;
  colorTag: string;
}

const CourseTypeSchema = new Schema<ICourseType>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    colorTag: { type: String, default: '#b26ca1' },
  },
  { timestamps: true }
);

export default mongoose.model<ICourseType>('CourseType', CourseTypeSchema);
