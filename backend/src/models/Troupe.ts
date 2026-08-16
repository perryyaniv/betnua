import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITroupeMembership {
  _id: Types.ObjectId;
  studentId: Types.ObjectId;
  joinedAt: Date;
  leftAt?: Date | null;
  isActive: boolean;
}

export interface ITroupe extends Document {
  name: string;
  branchId: mongoose.Types.ObjectId;
  members: ITroupeMembership[];
  isActive: boolean;
}

const TroupeMembershipSchema = new Schema<ITroupeMembership>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const TroupeSchema = new Schema<ITroupe>(
  {
    name: { type: String, required: true, trim: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    members: [TroupeMembershipSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

TroupeSchema.index({ branchId: 1, name: 1 }, { unique: true });
TroupeSchema.index({ 'members.studentId': 1 });

export default mongoose.model<ITroupe>('Troupe', TroupeSchema);
