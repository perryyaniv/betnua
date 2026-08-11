import mongoose, { Schema, Document } from 'mongoose';

export type ClosureScope = 'all' | 'branch';

export interface IClosure extends Document {
  date: Date;
  scope: ClosureScope;
  branchId?: mongoose.Types.ObjectId | null;
  reason: string;
}

const ClosureSchema = new Schema<IClosure>(
  {
    date: { type: Date, required: true },
    scope: { type: String, enum: ['all', 'branch'], required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    reason: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

ClosureSchema.pre('validate', function (next) {
  if (this.scope === 'branch' && !this.branchId) {
    next(new Error('branchId required when scope is "branch"'));
    return;
  }
  next();
});

ClosureSchema.index({ date: 1 });

export default mongoose.model<IClosure>('Closure', ClosureSchema);
