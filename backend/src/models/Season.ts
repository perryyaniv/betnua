import mongoose, { Schema, Document } from 'mongoose';

export interface ISeason extends Document {
  label: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

const SeasonSchema = new Schema<ISeason>(
  {
    label: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<ISeason>('Season', SeasonSchema);
