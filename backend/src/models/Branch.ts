import mongoose, { Schema, Document } from 'mongoose';

export interface IRoom {
  _id: mongoose.Types.ObjectId;
  name: string;
}

export interface IBranch extends Document {
  name: string;
  address: string;
  phone: string;
  hoursOpen: string;
  hoursClose: string;
  rooms: IRoom[];
  isActive: boolean;
}

const RoomSchema = new Schema<IRoom>({
  name: { type: String, required: true, trim: true },
});

const BranchSchema = new Schema<IBranch>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    address: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    hoursOpen: { type: String, default: '15:00' },
    hoursClose: { type: String, default: '22:00' },
    rooms: [RoomSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IBranch>('Branch', BranchSchema);
