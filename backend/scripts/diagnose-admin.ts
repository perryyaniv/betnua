import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../src/models/User';

dotenv.config();

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/betnua';
  console.log('Connecting to db:', uri.split('@')[1]?.split('?')[0]);
  await mongoose.connect(uri);

  const admins = await User.find({ username: 'admin' });
  console.log(`Found ${admins.length} user(s) with username 'admin'`);

  for (const u of admins) {
    const matchesAdmin = await u.comparePassword('admin');
    console.log({
      _id: u._id.toString(),
      active: u.active,
      forcePasswordChange: u.forcePasswordChange,
      role: u.role,
      passwordMatchesLiteralAdmin: matchesAdmin,
    });
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
