import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../src/models/User';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/betnua');

  const admin = await User.findOne({ username: 'admin' });
  if (!admin) {
    console.log('No admin user found.');
    process.exit(1);
  }

  admin.password = 'admin';
  admin.forcePasswordChange = false;
  await admin.save();

  console.log('Admin password updated. Login: admin / admin');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
