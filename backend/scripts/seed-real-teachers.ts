import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Branch from '../src/models/Branch';
import CourseType from '../src/models/CourseType';
import Teacher from '../src/models/Teacher';

dotenv.config();

const TEACHERS = [
  {
    name: 'עפרי שש',
    branches: ['אורנית'],
    specialties: ['היפ הופ'],
    bio: 'רקדנית ומורה מקצועית, מלמדת היפ הופ וסגנונותיו.',
  },
  {
    name: 'מיכאלי גבעתי',
    branches: ['כפר סבא'],
    specialties: ['ברייקדאנס'],
    bio: 'שחקן ורקדן ישראלי צעיר ומבטיח. זכה בתואר אלוף אירופה בריקוד ברייקדאנס. בוגר מסלול המשחק בסטודיו לאמנויות התיאטרון של יורם לוינשטיין. מלמד ברייקדאנס ומשחק.',
  },
  {
    name: 'טלי נאחמני אכשטיין',
    branches: ['כפר סבא', 'אורנית', 'גבעתיים'],
    specialties: ["ג'אז וג'אז לירי", 'מחול מודרני', 'מחול יצירתי לגיל הרך'],
    bio: 'מנהלת ומייסדת בתנועה - הבית למחול. בעלת תואר ראשון במדעי ההתנהגות ותואר שני כמטפלת בתנועה ומחול מאוניברסיטת חיפה. מורה למחול ולפילאטיס, מלמדת ג\'אז, מודרני, מחול יצירתי וקומפוזיציה. מתעמלת מקצועית לשעבר וכוריאוגרפית של מופעים שונים.',
  },
  {
    name: 'יעלי נאמני',
    branches: ['כפר סבא', 'אורנית'],
    specialties: ['מחול מודרני', 'אקרודאנס', 'מחול יצירתי לגיל הרך'],
    bio: 'מנהלת מקצועית של סניף כפר סבא. רקדנית בהפקות מובילות בארץ, בעלת תעודת הסמכה ממכון וינגייט. מלמדת שיעורי טכניקה מודרני, אקרודאנס ומחול יצירתי.',
  },
  {
    name: 'אדר ריקליס',
    branches: ['כפר סבא', 'אורנית'],
    specialties: ['בלט קלאסי', 'פוינט', 'להקות ייצוגיות'],
    bio: 'מנהלת אמנותית להקות ייצוגיות. רקדנית מקצועית בהפקות מובילות בארץ, בעלת תואר ראשון בהוראת המחול. מלמדת בלט קלאסי, פוינט ומחזות זמר.',
  },
  {
    name: 'ליסה מנייץ דורחין',
    branches: ['כפר סבא'],
    specialties: ['בלט קלאסי', 'פוינט'],
    bio: 'ילידת שווייץ, בוגרת אקדמיית האופרה בציריך. רקדנית באופרה של ציריך ובבז\'אר בלט לוזאן, ומ-2005 סולנית בבלט הישראלי. מורה בכירה במגמת מחול תלמה ילין, מלמדת בלט קלאסי ופוינט.',
  },
  {
    name: 'עמית ויינר',
    branches: ['אורנית', 'כפר סבא'],
    specialties: ["ג'אז וג'אז לירי", 'היפ הופ'],
    bio: 'מנהלת מקצועית של סניף אורנית. בוגרת סטודיו בתנועה, מורה לג\'אז, היפ הופ, קומפוזיציה ופיוז\'ן, ומדריכת פילאטיס.',
  },
  {
    name: 'שי מזרחי',
    branches: ['אורנית'],
    specialties: ['היפ הופ'],
    bio: 'רקדן וכוריאוגרף מוביל בהפקות גדולות בארץ. כוריאוגרף ראשי ויחיד - פסטיגל 2022, כוריאוגרף של אגם בוחבוט ושל קליפים ופרסומות רבות. מלמד היפ הופ וסגנונותיו.',
  },
  {
    name: 'דניאל סטוק',
    branches: ['כפר סבא'],
    specialties: ["ג'אז וג'אז לירי", 'בלט קלאסי'],
    bio: 'בעלת תואר ראשון בהוראת מחול מטעם סמינר הקיבוצים. מלמדת ג\'אז מודרני לגילאי יסודי-חטיבה ובלט קלאסי לגילאים הצעירים.',
  },
  {
    name: 'ספיר מאור',
    branches: ['גבעתיים'],
    specialties: ['מחול יצירתי לגיל הרך', "ג'אז וג'אז לירי", 'מחול מודרני'],
    bio: 'מנהלת מקצועית סניף גבעתיים. מטפלת בתנועה ובעלת תואר שני בטיפול באומנויות. רקדה וליוותה אמנים בהפקות שונות בארץ, מורה למחול יצירתי, ג\'אז ומודרני.',
  },
  {
    name: 'מיקה כהן',
    branches: ['כפר סבא', 'גבעתיים'],
    specialties: ['היפ הופ'],
    bio: 'מורה ורקדנית מקצועית, רקדה עם אמנים רבים על מיטב הבמות בתוכניות טלוויזיה, בפרסומות ובקליפים. מלמדת היפ הופ וסגנונותיו ומכינה את להקות ההיפ הופ לתחרויות.',
  },
  {
    name: 'לימאי חייקין',
    branches: ['גבעתיים'],
    specialties: ['היפ הופ'],
    bio: 'רקדנית ומורה מקצועית, מלמדת היפ הופ וסגנונותיו.',
  },
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/betnua');
  console.log('Connected. Seeding real teachers from betnua.co.il...');

  const branches = await Branch.find();
  const courseTypes = await CourseType.find();
  const branchByName = new Map(branches.map((b) => [b.name, b._id]));
  const courseTypeByName = new Map(courseTypes.map((c) => [c.name, c._id]));

  let created = 0;
  let skipped = 0;

  for (const t of TEACHERS) {
    const existing = await Teacher.findOne({ name: t.name });
    if (existing) {
      skipped++;
      continue;
    }

    const branchIds = t.branches.map((b) => branchByName.get(b)).filter(Boolean);
    const specialtyCourseTypeIds = t.specialties.map((s) => courseTypeByName.get(s)).filter(Boolean);

    if (branchIds.length !== t.branches.length) {
      console.warn(`  ! ${t.name}: could not resolve all branches (${t.branches.join(', ')})`);
    }
    if (specialtyCourseTypeIds.length !== t.specialties.length) {
      console.warn(`  ! ${t.name}: could not resolve all specialties (${t.specialties.join(', ')})`);
    }

    await Teacher.create({
      name: t.name,
      bio: t.bio,
      branchIds,
      specialtyCourseTypeIds,
      isActive: true,
    });
    created++;
  }

  console.log(`Done. Created ${created} teacher(s), skipped ${skipped} already-existing.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
