import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface IUser extends Document {
  name: string;
  username: string;
  password: string;
  role: UserRole;
  branchIds: mongoose.Types.ObjectId[];
  active: boolean;
  forcePasswordChange: boolean;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'editor', 'viewer'], default: 'editor', required: true },
    branchIds: [{ type: Schema.Types.ObjectId, ref: 'Branch' }],
    active: { type: Boolean, default: true },
    forcePasswordChange: { type: Boolean, default: true },
  },
  { timestamps: true }
);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);
