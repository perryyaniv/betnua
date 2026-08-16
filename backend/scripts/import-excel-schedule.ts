import dotenv from 'dotenv';
import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import Branch, { IBranch } from '../src/models/Branch';
import CourseType, { ICourseType } from '../src/models/CourseType';
import Teacher, { ITeacher } from '../src/models/Teacher';
import Season from '../src/models/Season';
import Troupe, { ITroupe } from '../src/models/Troupe';
import Course, { AgeCategory } from '../src/models/Course';

dotenv.config();

const DEFAULT_EXCEL_PATH = 'C:/Temp/Betnua/Betnua.xlsx';

const DAY_NAME_TO_INDEX: Record<string, number> = {
  ראשון: 0,
  שני: 1,
  שלישי: 2,
  רביעי: 3,
  חמישי: 4,
  שישי: 5,
  שבת: 6,
};

// Confirmed against the actual fill colors in the source file (see plan doc for the full derivation).
const COLOR_TO_AGE_CATEGORY: Record<string, AgeCategory> = {
  EAD1DC: 'youngest',
  CFE2F3: 'midElementary',
  '455C75': 'teens',
  C27BA0: 'adultWomen',
};

// The 12 known troupe (להקה) names seen across all 3 sheets. Branch-scoped: two branches can
// have same-named troupes without collision since Troupe is unique per {branchId, name}.
const KNOWN_TROUPE_NAMES = [
  "אנוצ'י",
  'מובימנטו',
  'אינמוטו',
  'קוניסי',
  'לייקה',
  'קיימיל',
  'הרקט',
  'מאוואדו',
  'איקם',
  'גאטי',
  'פלואו',
  'מובמנט',
  "מוצ'ינה",
  'אידו',
  'אינדונג',
];

// Spelling variants observed directly in the source file, mapped to one canonical name.
const TROUPE_NAME_ALIASES: Record<string, string> = {
  מוואדו: 'מאוואדו',
};

interface SheetConfig {
  branchName: string;
  dayHeaderRow: number;
  roomLabelRow: number | null; // null => sheet has no per-column room split (use branch's first room)
  dataStartRow: number;
  dataEndRow: number; // inclusive; chosen to stop before each sheet's hand-maintained legend tables
}

const SHEET_CONFIGS: Record<string, SheetConfig> = {
  גבעתיים: { branchName: 'גבעתיים', dayHeaderRow: 1, roomLabelRow: null, dataStartRow: 2, dataEndRow: 10 },
  'כפ"ס': { branchName: 'כפר סבא', dayHeaderRow: 1, roomLabelRow: 3, dataStartRow: 4, dataEndRow: 12 },
  אורנית: { branchName: 'אורנית', dayHeaderRow: 1, roomLabelRow: 3, dataStartRow: 4, dataEndRow: 9 },
};

const TIME_RE = /^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/;
const MANDATORY_RE = /חובה ל([\u05D0-\u05EA'"]+)/g;

const normalize = (s: unknown) => String(s ?? '').trim().replace(/\s+/g, ' ');

function resolveTroupeName(raw: string): string | null {
  const norm = normalize(raw);
  if (!norm) return null;
  const canonical = TROUPE_NAME_ALIASES[norm] ?? norm;
  return KNOWN_TROUPE_NAMES.includes(canonical) ? canonical : null;
}

/** Exact full-name match first, then a first-or-last-name token match against known teachers. */
function resolveTeacherToken(raw: string, teachers: ITeacher[]): ITeacher | null {
  const norm = normalize(raw);
  if (!norm) return null;
  const exact = teachers.find((t) => t.name.trim() === norm);
  if (exact) return exact;
  return teachers.find((t) => t.name.split(/\s+/).some((tok) => tok === norm)) ?? null;
}

/** "אלה ומחלב" -> two independent teacher-name candidates; anything else -> the original string alone.
 * Deliberately tries the WHOLE line as one name first (see caller) so surnames like "עמית ויינר"
 * (second token genuinely starts with the letter ו) are never mis-split. */
function splitCoTeachers(raw: string): string[] {
  const parts = raw.split(/\s+/);
  if (parts.length === 2 && parts[1].startsWith('ו')) {
    return [parts[0], parts[1].slice(1)];
  }
  return [raw];
}

interface ParsedCell {
  timeRange: string;
  startTime: string;
  endTime: string;
  courseTypeName: string;
  ageOrTroupeRaw: string;
  isOpen: boolean;
  mandatoryTroupeNamesRaw: string[];
  teacherNamesRaw: string[];
}

function parseCell(text: string): ParsedCell | null {
  const lines = text
    .split('\n')
    .map(normalize)
    .filter(Boolean)
    // Parenthetical asides (e.g. "(11:45-12:30 אם יש פרוייקט)") are footnotes, never a real
    // field, and would otherwise shift every positional line that follows them.
    .filter((l) => !/^\(.*\)$/.test(l));
  if (!lines.length || !TIME_RE.test(lines[0])) return null;
  const [startTime, endTime] = lines[0].split('-');

  // "Project" cells collapse the usual 5-line shape into 4: time / troupe / "פרוייקט <teacher>" / status.
  if (lines.length === 4 && lines[2].startsWith('פרוייקט')) {
    return {
      timeRange: lines[0],
      startTime,
      endTime,
      courseTypeName: 'פרוייקט',
      ageOrTroupeRaw: lines[1],
      isOpen: /פתוח/.test(lines[3]),
      mandatoryTroupeNamesRaw: [],
      teacherNamesRaw: [lines[2].replace(/^פרוייקט\s*/, '').trim()].filter(Boolean),
    };
  }

  const courseTypeName = lines[1] ?? '';
  const ageOrTroupeRaw = lines[2] ?? '';
  const rest = lines.slice(3);
  const statusLines = rest.filter((l) => /סגור|פתוח|חובה ל/.test(l));
  const projectLine = rest.find((l) => l.startsWith('פרוייקט'));
  // Teacher is always the LAST line when present; some cells carry extra free-text notes
  // (e.g. "ללא מופע סוף שנה") between the status and the teacher, so take the last
  // unclassified line rather than the first.
  const unclassified = rest.filter((l) => l !== projectLine && !statusLines.includes(l));
  const teacherLine = unclassified[unclassified.length - 1];
  const statusText = statusLines.join(' ');

  let teacherNamesRaw: string[] = [];
  if (projectLine) {
    const afterProject = projectLine.replace(/^פרוייקט\s*/, '').trim();
    if (afterProject) teacherNamesRaw = [afterProject];
  } else if (teacherLine) {
    teacherNamesRaw = [teacherLine];
  }

  return {
    timeRange: lines[0],
    startTime,
    endTime,
    courseTypeName,
    ageOrTroupeRaw,
    isOpen: /פתוח/.test(statusText),
    mandatoryTroupeNamesRaw: Array.from(statusText.matchAll(MANDATORY_RE)).map((m) => m[1]),
    teacherNamesRaw,
  };
}

async function ensureBranchRoom(branch: IBranch, roomName: string, warnings: Set<string>) {
  if (branch.rooms.some((r) => r.name === roomName)) return;
  branch.rooms.push({ name: roomName } as never);
  await branch.save();
  warnings.add(`[branch] added room "${roomName}" to ${branch.name}`);
}

async function getOrCreateTroupe(
  name: string,
  branch: IBranch,
  cache: Map<string, ITroupe>,
  warnings: Set<string>
): Promise<ITroupe> {
  const key = `${branch._id}:${name}`;
  const cached = cache.get(key);
  if (cached) return cached;
  let troupe = await Troupe.findOne({ branchId: branch._id, name });
  if (!troupe) {
    troupe = await Troupe.create({ name, branchId: branch._id });
    warnings.add(`[created troupe] ${name} @ ${branch.name}`);
  }
  cache.set(key, troupe);
  return troupe;
}

async function getOrCreateCourseType(
  name: string,
  cache: Map<string, ICourseType>,
  warnings: Set<string>
): Promise<ICourseType> {
  const cached = cache.get(name);
  if (cached) return cached;
  let ct = await CourseType.findOne({ name });
  if (!ct) {
    ct = await CourseType.create({ name, colorTag: '#B26CA1' });
    warnings.add(`[created course type] ${name}`);
  }
  cache.set(name, ct);
  return ct;
}

async function run() {
  const filePath = process.argv[2] || DEFAULT_EXCEL_PATH;
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/betnua');
  console.log(`Connected. Reading ${filePath} ...`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const branches = await Branch.find();
  const branchByName = new Map(branches.map((b) => [b.name, b]));
  const teachers = await Teacher.find();
  const courseTypeCache = new Map<string, ICourseType>();
  const troupeCache = new Map<string, ITroupe>();
  const season = await Season.findOne({ isActive: true });
  if (!season) {
    throw new Error('No active Season found. Run `npm run seed` first, or mark a season active.');
  }

  const warnings = new Set<string>();
  let created = 0;
  let updated = 0;
  let skippedNonStandard = 0;
  let skippedUnresolvedTeacher = 0;

  for (const [sheetName, cfg] of Object.entries(SHEET_CONFIGS)) {
    const ws = workbook.getWorksheet(sheetName);
    if (!ws) {
      warnings.add(`[sheet missing] ${sheetName}`);
      continue;
    }
    const branch = branchByName.get(cfg.branchName);
    if (!branch) {
      warnings.add(`[branch missing] ${cfg.branchName} (sheet ${sheetName})`);
      continue;
    }

    const columnMap = new Map<number, { dayOfWeek: number; roomName: string }>();
    for (let col = 1; col <= ws.columnCount; col++) {
      const dayName = normalize(ws.getRow(cfg.dayHeaderRow).getCell(col).value);
      const dayOfWeek = DAY_NAME_TO_INDEX[dayName];
      if (dayOfWeek === undefined) continue;
      const roomName = cfg.roomLabelRow
        ? normalize(ws.getRow(cfg.roomLabelRow).getCell(col).value)
        : branch.rooms[0]?.name ?? '';
      if (!roomName) {
        warnings.add(`[${sheetName}] column ${col}: no room name resolvable, skipping column`);
        continue;
      }
      await ensureBranchRoom(branch, roomName, warnings);
      columnMap.set(col, { dayOfWeek, roomName });
    }

    for (let row = cfg.dataStartRow; row <= cfg.dataEndRow; row++) {
      for (const [col, { dayOfWeek, roomName }] of columnMap) {
        const cell = ws.getRow(row).getCell(col);
        const raw = cell.value;
        if (raw === null || raw === undefined || normalize(raw) === '') continue;
        const addr = `${sheetName}!${cell.address}`;
        const text = String(raw);

        const parsed = parseCell(text);
        if (!parsed) {
          warnings.add(`[skip: non-standard cell] ${addr}: ${text.slice(0, 60).replace(/\n/g, ' / ')}`);
          skippedNonStandard++;
          continue;
        }

        const argbRaw = (cell.fill as { fgColor?: { argb?: string } } | undefined)?.fgColor?.argb;
        const hex = argbRaw ? argbRaw.replace(/^FF/i, '').toUpperCase() : undefined;
        const ageCategory = hex ? COLOR_TO_AGE_CATEGORY[hex] : undefined;
        if (hex && !ageCategory) {
          warnings.add(`[unrecognized fill color] ${addr}: #${hex}`);
        }

        let troupeId: mongoose.Types.ObjectId | undefined;
        const labelParts = parsed.ageOrTroupeRaw.split('+').map(normalize).filter(Boolean);
        for (const part of labelParts) {
          const resolvedName = resolveTroupeName(part);
          if (resolvedName) {
            const troupe = await getOrCreateTroupe(resolvedName, branch, troupeCache, warnings);
            troupeId = troupe._id;
            break;
          }
        }

        const mandatoryForTroupeIds: mongoose.Types.ObjectId[] = [];
        for (const rawName of parsed.mandatoryTroupeNamesRaw) {
          const resolvedName = resolveTroupeName(rawName);
          if (!resolvedName) {
            warnings.add(`[unrecognized mandatory-troupe reference] ${addr}: "${rawName}"`);
            continue;
          }
          const troupe = await getOrCreateTroupe(resolvedName, branch, troupeCache, warnings);
          mandatoryForTroupeIds.push(troupe._id);
        }

        const teacherIds: mongoose.Types.ObjectId[] = [];
        let teacherResolutionFailed = parsed.teacherNamesRaw.length === 0;
        for (const rawTeacher of parsed.teacherNamesRaw) {
          const whole = resolveTeacherToken(rawTeacher, teachers);
          if (whole) {
            teacherIds.push(whole._id);
            continue;
          }
          const candidates = splitCoTeachers(rawTeacher);
          if (candidates.length === 2) {
            const [a, b] = candidates.map((c) => resolveTeacherToken(c, teachers));
            if (a && b) {
              teacherIds.push(a._id, b._id);
              continue;
            }
            if (!a) warnings.add(`[unresolved teacher] ${addr}: "${candidates[0]}"`);
            if (!b) warnings.add(`[unresolved teacher] ${addr}: "${candidates[1]}"`);
          } else {
            warnings.add(`[unresolved teacher] ${addr}: "${rawTeacher}"`);
          }
          teacherResolutionFailed = true;
        }
        if (teacherResolutionFailed || teacherIds.length === 0) {
          skippedUnresolvedTeacher++;
          continue;
        }

        const courseType = await getOrCreateCourseType(parsed.courseTypeName, courseTypeCache, warnings);

        const dedupeKey = {
          branchId: branch._id,
          roomName,
          dayOfWeek,
          startTime: parsed.startTime,
          endTime: parsed.endTime,
          seasonId: season._id,
        };
        const doc = {
          ...dedupeKey,
          courseTypeId: courseType._id,
          teacherIds,
          ageGroupLevel: parsed.ageOrTroupeRaw,
          ageCategory,
          isOpen: parsed.isOpen,
          troupeId,
          mandatoryForTroupeIds,
          isActive: true,
        };

        const existing = await Course.findOne(dedupeKey);
        if (existing) {
          await Course.updateOne({ _id: existing._id }, { $set: doc });
          updated++;
        } else {
          await Course.create(doc);
          created++;
        }
      }
    }
  }

  console.log(`\nDone. Created ${created}, updated ${updated}.`);
  console.log(`Skipped ${skippedNonStandard} non-standard cell(s), ${skippedUnresolvedTeacher} cell(s) with an unresolved teacher.`);
  if (warnings.size) {
    console.log(`\n${warnings.size} warning(s):`);
    for (const w of warnings) console.log(`  ${w}`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
