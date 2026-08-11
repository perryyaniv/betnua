import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Branch from '../src/models/Branch';
import CourseType from '../src/models/CourseType';
import Season from '../src/models/Season';
import Teacher from '../src/models/Teacher';
import Course from '../src/models/Course';
import User from '../src/models/User';
import Event from '../src/models/Event';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27117/betnua');

  const branches = await Branch.find();
  const courseTypes = await CourseType.find();
  const season = await Season.findOne({ isActive: true });
  const admin = await User.findOne({ username: 'admin' });
  if (!branches.length || !courseTypes.length || !season || !admin) {
    throw new Error('Run `npm run seed` first.');
  }

  const kfarSaba = branches.find((b) => b.name === 'כפר סבא')!;
  const ornit = branches.find((b) => b.name === 'אורנית')!;
  const givatayim = branches.find((b) => b.name === 'גבעתיים')!;

  const byName = (n: string) => courseTypes.find((c) => c.name === n)!;

  const teacherDefs = [
    { name: 'נועה כהן', phone: '050-1234567', bio: 'מורה לבלט קלאסי ופוינט עם 12 שנות ניסיון.', specialties: ['בלט קלאסי', 'פוינט'], branches: [kfarSaba, ornit] },
    { name: 'איתי לוי', phone: '052-2345678', bio: 'מורה להיפ הופ וברייקדאנס, רקדן תחרותי.', specialties: ['היפ הופ', 'ברייקדאנס'], branches: [kfarSaba, givatayim] },
    { name: 'שירה מזרחי', phone: '054-3456789', bio: 'מורה למחול יצירתי ומחול מודרני.', specialties: ['מחול יצירתי לגיל הרך', 'מחול מודרני'], branches: [ornit, givatayim] },
    { name: 'דנה אברהם', phone: '053-4567890', bio: "מורה לג'אז ולהקות ייצוגיות.", specialties: ["ג'אז וג'אז לירי", 'להקות ייצוגיות'], branches: [kfarSaba] },
  ];

  const teachers = [];
  for (const def of teacherDefs) {
    const existing = await Teacher.findOne({ name: def.name });
    if (existing) {
      teachers.push(existing);
      continue;
    }
    const teacher = await Teacher.create({
      name: def.name,
      phone: def.phone,
      bio: def.bio,
      specialtyCourseTypeIds: def.specialties.map((n) => byName(n)._id),
      branchIds: def.branches.map((b) => b._id),
      isActive: true,
    });
    teachers.push(teacher);
  }

  const [noa, itay, shira, dana] = teachers;

  const courseDefs = [
    { branch: kfarSaba, type: 'בלט קלאסי', teacher: noa, day: 1, start: '16:00', end: '17:00', room: 'אולם 1', age: 'גילאי 7-9', capacity: 14 },
    { branch: kfarSaba, type: 'פוינט', teacher: noa, day: 1, start: '17:00', end: '18:00', room: 'אולם 1', age: 'מתקדמות', capacity: 10 },
    { branch: kfarSaba, type: 'היפ הופ', teacher: itay, day: 2, start: '17:00', end: '18:00', room: 'אולם 2', age: 'גילאי 10-13', capacity: 16 },
    { branch: kfarSaba, type: "ג'אז וג'אז לירי", teacher: dana, day: 3, start: '16:30', end: '17:30', room: 'אולם 1', age: 'גילאי 11-14', capacity: 14 },
    { branch: kfarSaba, type: 'להקות ייצוגיות', teacher: dana, day: 4, start: '18:00', end: '19:30', room: 'אולם 2', age: 'נבחרת', capacity: 12 },
    { branch: ornit, type: 'מחול יצירתי לגיל הרך', teacher: shira, day: 0, start: '16:00', end: '16:45', room: 'אולם 1', age: 'גן טרום חובה', capacity: 12 },
    { branch: ornit, type: 'מחול מודרני', teacher: shira, day: 0, start: '17:00', end: '18:00', room: 'אולם 1', age: 'גילאי 12-15', capacity: 14 },
    { branch: ornit, type: 'בלט קלאסי', teacher: noa, day: 2, start: '16:00', end: '17:00', room: 'אולם 2', age: 'גילאי 8-10', capacity: 14 },
    { branch: givatayim, type: 'ברייקדאנס', teacher: itay, day: 3, start: '17:30', end: '18:30', room: 'אולם 1', age: 'גילאי 9-13', capacity: 16 },
    { branch: givatayim, type: 'שיעורי בוגרים 20+', teacher: shira, day: 4, start: '20:00', end: '21:00', room: 'אולם 2', age: 'בוגרות 20+', capacity: 18 },
  ];

  for (const def of courseDefs) {
    const exists = await Course.findOne({ branchId: def.branch._id, roomName: def.room, dayOfWeek: def.day, startTime: def.start });
    if (exists) continue;
    await Course.create({
      branchId: def.branch._id,
      courseTypeId: byName(def.type)._id,
      teacherId: def.teacher._id,
      seasonId: season._id,
      dayOfWeek: def.day,
      startTime: def.start,
      endTime: def.end,
      roomName: def.room,
      ageGroupLevel: def.age,
      capacity: def.capacity,
      isActive: true,
    });
  }
  console.log(`Seeded ${courseDefs.length} demo courses.`);

  const now = new Date('2026-08-11');
  const inDays = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

  const eventDefs = [
    {
      title: 'מופע סוף שנה - כפר סבא',
      description: 'מופע סוף השנה השנתי של סניף כפר סבא באולם התרבות',
      branchId: kfarSaba._id,
      eventType: 'מופע',
      eventDate: inDays(60),
      prepareDate: inDays(10),
      status: 'בהכנה',
      tasks: [
        { title: 'הזמנת אולם התרבות', status: 'הושלם', assigneeId: admin._id, dueDate: inDays(5) },
        { title: 'תיאום תלבושות עם הקבוצות', status: 'בתהליך', assigneeId: admin._id, dueDate: inDays(20) },
        { title: 'הפקת פלייליסט מוזיקה', status: 'לביצוע', assigneeId: admin._id, dueDate: inDays(30) },
      ],
    },
    {
      title: 'תחרות מחול אזורית',
      description: 'להקת הייצוג נוסעת לתחרות האזורית',
      branchId: null,
      eventType: 'תחרות',
      eventDate: inDays(45),
      prepareDate: inDays(3),
      status: 'בהכנה',
      tasks: [
        { title: 'רישום להקה לתחרות', status: 'הושלם', assigneeId: admin._id, dueDate: inDays(1) },
        { title: 'הזמנת הסעה', status: 'לביצוע', assigneeId: admin._id, dueDate: inDays(15) },
      ],
    },
    {
      title: 'סדנת ברייקדאנס אורחת',
      description: 'סדנה עם רקדן אורח בסניף גבעתיים',
      branchId: givatayim._id,
      eventType: 'סדנה',
      eventDate: inDays(20),
      prepareDate: inDays(-2),
      status: 'בהכנה',
      tasks: [{ title: 'תיאום עם הרקדן האורח', status: 'בתהליך', assigneeId: admin._id, dueDate: inDays(-1) }],
    },
    {
      title: 'ישיבת צוות מורים - פתיחת עונה',
      description: '',
      branchId: null,
      eventType: 'פגישת_צוות',
      eventDate: inDays(14),
      prepareDate: inDays(7),
      status: 'מתוכנן',
      tasks: [],
    },
  ];

  for (const def of eventDefs) {
    const exists = await Event.findOne({ title: def.title });
    if (exists) continue;
    await Event.create({ ...def, addedBy: admin._id });
  }
  console.log(`Seeded ${eventDefs.length} demo events.`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
