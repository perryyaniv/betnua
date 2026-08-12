import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../src/models/User';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/betnua');

  const hash = await bcrypt.hash('admin', 10);
  const result = await User.updateOne(
    { username: 'admin' },
    { $set: { password: hash, forcePasswordChange: false, active: true } }
  );
  console.log('updateOne result:', result.matchedCount, 'matched,', result.modifiedCount, 'modified');

  const fresh = await User.findOne({ username: 'admin' });
  console.log('Re-fetched hash looks like a bcrypt hash:', fresh!.password.startsWith('$2b$'));
  const matches = await fresh!.comparePassword('admin');
  console.log('comparePassword("admin") =', matches);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
