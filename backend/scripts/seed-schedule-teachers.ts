import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Branch from '../src/models/Branch';
import Teacher from '../src/models/Teacher';

dotenv.config();

// Teachers found in the real weekly schedule (Betnua.xlsx) that aren't part of the curated
// "our teachers" bios scraped from betnua.co.il (see seed-real-teachers.ts). No bios/photos
// exist for these yet, so only name + branch scoping is set; fill in the rest via the
// Teachers admin page whenever available. Branch scoping is derived from where each name
// actually appears in the schedule.
const TEACHERS = [
  { name: 'מיכלי', branches: ['גבעתיים', 'כפר סבא'] },
  { name: 'גיל', branches: ['גבעתיים'] },
  { name: 'דניאלה', branches: ['כפר סבא'] },
  { name: 'שובל ביטון', branches: ['כפר סבא'] },
  { name: 'נועם קרייצמן', branches: ['כפר סבא'] },
  { name: 'איתי לביא', branches: ['כפר סבא', 'אורנית'] },
  { name: 'יוסף אקאילו', branches: ['אורנית'] },
  { name: 'יקיר אלישע', branches: ['אורנית'] },
  { name: 'אלה', branches: ['כפר סבא'] },
  { name: 'מחלב', branches: ['כפר סבא'] },
  // Placeholder for schedule slots explicitly marked "פרוייקט מתחלף" (rotating/no fixed
  // teacher assigned yet) — not a real person, kept so those sessions still show on the
  // schedule instead of being silently dropped.
  { name: 'מורה מתחלף', branches: ['אורנית'] },
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/betnua');
  console.log('Connected. Seeding schedule-only teachers...');

  const branches = await Branch.find();
  const branchByName = new Map(branches.map((b) => [b.name, b._id]));

  let created = 0;
  let skipped = 0;

  for (const t of TEACHERS) {
    const existing = await Teacher.findOne({ name: t.name });
    if (existing) {
      skipped++;
      continue;
    }

    const branchIds = t.branches.map((b) => branchByName.get(b)).filter(Boolean);
    if (branchIds.length !== t.branches.length) {
      console.warn(`  ! ${t.name}: could not resolve all branches (${t.branches.join(', ')})`);
    }

    await Teacher.create({ name: t.name, branchIds, isActive: true });
    created++;
  }

  console.log(`Done. Created ${created} teacher(s), skipped ${skipped} already-existing.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
