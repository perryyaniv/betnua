import mongoose, { Schema, Document } from 'mongoose';

export interface IDropoutReason extends Document {
  name: string;
  isActive: boolean;
}

const DropoutReasonSchema = new Schema<IDropoutReason>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IDropoutReason>('DropoutReason', DropoutReasonSchema);
