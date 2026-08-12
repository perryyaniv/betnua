import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User';
import Branch from './models/Branch';
import CourseType from './models/CourseType';
import Season from './models/Season';
import AppSettings from './models/AppSettings';
import DropoutReason from './models/DropoutReason';

dotenv.config();

const COURSE_TYPES = [
  { name: 'מחול יצירתי לגיל הרך', colorTag: '#F4B6C2' },
  { name: 'שיעורי בוגרים 20+', colorTag: '#B26CA1' },
  { name: 'ברייקדאנס', colorTag: '#6C8CB2' },
  { name: 'פוינט', colorTag: '#D4AF37' },
  { name: 'היפ הופ', colorTag: '#8C6CB2' },
  { name: "ג'אז וג'אז לירי", colorTag: '#C27CA6' },
  { name: 'בלט קלאסי', colorTag: '#DCBABC' },
  { name: 'מחול מודרני', colorTag: '#7C9CB2' },
  { name: 'אקרודאנס', colorTag: '#B2A16C' },
  { name: 'להקות ייצוגיות', colorTag: '#9C5389' },
];

const DROPOUT_REASONS = ['מחיר', 'חוסר זמן / התנגשות זמנים', 'מעבר מגורים', 'חוסר שביעות רצון', 'סיום עונה / גיל טבעי', 'אחר'];

const BRANCHES = [
  {
    name: 'כפר סבא',
    address: "רח' ויצמן 64, קומה 1 (מול קניון ערים)",
    phone: '053-5573267',
    hoursOpen: '15:00',
    hoursClose: '22:00',
    rooms: [{ name: 'אולם 1' }, { name: 'אולם 2' }],
  },
  {
    name: 'אורנית',
    address: "מרכז חוגים אורנית, רח' השקד 7",
    phone: '053-5573267',
    hoursOpen: '15:00',
    hoursClose: '22:00',
    rooms: [{ name: 'אולם 1' }, { name: 'אולם 2' }],
  },
  {
    name: 'גבעתיים',
    address: "בית ספר בן גוריון, פועלי הרכבת 30",
    phone: '053-5573267',
    hoursOpen: '15:00',
    hoursClose: '22:00',
    rooms: [{ name: 'אולם 1' }, { name: 'אולם 2' }],
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/betnua');
  console.log('Connected. Seeding...');

  for (const branch of BRANCHES) {
    await Branch.findOneAndUpdate({ name: branch.name }, branch, { upsert: true, new: true });
  }
  console.log(`Seeded ${BRANCHES.length} branches.`);

  for (const type of COURSE_TYPES) {
    await CourseType.findOneAndUpdate({ name: type.name }, type, { upsert: true, new: true });
  }
  console.log(`Seeded ${COURSE_TYPES.length} course types.`);

  for (const name of DROPOUT_REASONS) {
    await DropoutReason.findOneAndUpdate({ name }, { name }, { upsert: true, new: true });
  }
  console.log(`Seeded ${DROPOUT_REASONS.length} dropout reasons.`);

  const existingSeason = await Season.findOne({ label: 'שנת הריקודים 2026-2027' });
  if (!existingSeason) {
    await Season.create({
      label: 'שנת הריקודים 2026-2027',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-07-24'),
      isActive: true,
    });
    console.log('Seeded active season.');
  }

  const existingSettings = await AppSettings.findOne();
  if (!existingSettings) {
    await AppSettings.create({ eventPrepareAlertThresholdDays: 14, taskDueAlertThresholdDays: 7, leadSlaThresholdHours: 4 });
    console.log('Seeded default alert thresholds.');
  }

  const existingAdmin = await User.findOne({ username: 'admin' });
  if (!existingAdmin) {
    await User.create({
      name: 'מנהל מערכת',
      username: 'admin',
      password: 'Betnua2026!',
      role: 'admin',
      branchIds: [],
      forcePasswordChange: true,
    });
    console.log('Seeded default admin user (username: admin, password: Betnua2026!) — change on first login.');
  }

  console.log('Seed complete.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
