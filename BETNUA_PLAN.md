# Betnua Project Plan

## Overview
Betnua ("בתנועה") is an internal Hebrew RTL web app for staff at a 3-branch dance studio to manage branches, teachers, weekly course schedules, and upcoming events that need advance preparation (with alerts).

The app is built with a stack closely aligned to the reference projects C:\Development\Projects\CourseManager and C:\Development\Projects\bookflow:
- Frontend: React + TypeScript + Vite + Tailwind + React Router + i18next + Socket.IO client, built as an installable PWA
- Backend: Node.js + Express + TypeScript + Mongoose + MongoDB + Socket.IO + JWT + bcrypt, plus `web-push` (VAPID) for push notifications and a scheduled job for threshold checks
- Deployment: Vercel for frontend, Render for backend (with a background worker/cron for alert checks), MongoDB Atlas for database

Branding source: https://www.betnua.co.il/ — dusty-rose logo (~#DCBABC), mauve accent (#b26ca1), Lato font. Site currently has no populated teacher profiles, schedules, or events — this app is greenfield for that data, not a migration.

## Product decisions locked

### Core product shape
- Internal staff app only — no public registration, no payments, no attendance-taking
- **Superseded by the Phase 2 addendum below**: a real Student/enrollment roster and a Leads module were added to support the digital-marketing plan (lead SLA tracking, dropout reporting). The "no student data" line above described v1 only.
- Hebrew RTL UI, no other locales
- Roles: `admin` / `editor` / `viewer`, each user has one global role plus an assigned set of branches; admins implicitly see/manage all 3 branches regardless of assignment
- Admin creates all accounts directly and resets passwords manually — no self-registration, no self-service "forgot password" email flow
- 3 fixed branches, seeded from real data: כפר סבא, אורנית, גבעתיים
- Build approach: single continuous build (no phase gating for review), but implemented in the sensible order listed below

### Branding / theme
- Base UI: neutral grays/white for data density (tables, forms, dashboards)
- Accent: mauve #b26ca1 (consider a slightly deepened shade for AA contrast on button text) — used for primary buttons, active nav, links, headers
- Logo: reused as-is from the live site (dusty-rose mark), used in header, login screen, and as the PWA icon
- Font: Lato
- Tailwind config structured like CourseManager's (`primary`/`accent`/`bg`/`surface`/`dark`/`status.*` tokens)

### Branch model
- Fields: name, address, phone, operating hours (open/close), managed list of rooms/studios, isActive
- Seed data (real): 
  - כפר סבא — רח' ויצמן 64, קומה 1 (מול קניון ערים)
  - אורנית — מרכז חוגים אורנית, רח' השקד 7
  - גבעתיים — בית ספר בן גוריון, פועלי הרכבת 30
  - All: hours 15:00–22:00
- Rooms are a managed list per branch (not free text) — required for room-conflict detection to mean anything

### Season & closures
- `Season` (dance-year) has a label, start date, end date, isActive; recurring courses belong to a season
- `Closure` entries mark specific dates/ranges that skip the normal weekly schedule — scoped either studio-wide (all branches) or to one specific branch (e.g. renovation closure)

### Course-type glossary + course model
- Shared reference list `CourseType` (like CourseManager's CourseName/CourseType) ensures consistent naming across branches, with a color tag for the weekly grid
- Seed data (real, from the site): מחול יצירתי לגיל הרך, שיעורי בוגרים 20+, ברייקדאנס, פוינט, היפ הופ, ג'אז וג'אז לירי, בלט קלאסי, מחול מודרני, אקרודאנס, להקות ייצוגיות
- `Course` is a branch-specific recurring weekly slot: branch, course type, teacher, day-of-week, start/end time, room, season, age-group/level tag, capacity (informational number, no roster behind it), price (informational, no billing), isActive
- Room-conflict detection: block/warn on saving a course if the same branch+room has an overlapping day+time in the same active season

### Teacher model
- Fields: name, phone, email (optional), photo, bio, specialties (tags into CourseType), assigned branches (many-to-many), isActive toggle
- No pay-rate field — the hours report shows raw hours only, not money
- Teacher-hours report: computed weekly/season hours per teacher (sum of course durations), filterable by branch — reference-only, not a payroll system

### Event model
- Fields: title, description, branch (nullable = studio-wide, e.g. an all-branch recital), event type, event date, **prepare date**, status, added date (auto), added-by user (auto)
- Event types: מופע (recital), תחרות (competition), סדנה (workshop), פגישת צוות (staff meeting), אחר (other) — studio/branch *closures* are handled by the Closure model above, not as an event type
- Status lifecycle: מתוכנן → בהכנה → הושלם, or בוטל at any point
- Each event has a list of **tasks**: title, status (לביצוע/בתהליך/הושלם/בוטל), assignee (a specific user), due date, created date
- Sort/filter on the events table: branch, type, status, date range, assignee — table/list layout only (like BookFlow's orders list), no calendar view in v1

### Alerts (push notifications)
- Two independent alert triggers, both using one global admin-configurable threshold each (no per-event override):
  - Event **prepare-date** approaching/passed → notifies the event's creator + all admins
  - Task **due-date** approaching/passed → notifies the task's assignee
- Delivery: Web Push (VAPID) to subscribed devices, **and** always-visible in-app alert panels/badges on the dashboard regardless of push subscription status
- A scheduled check (cron, e.g. hourly) evaluates thresholds and sends push notifications only once per newly-crossed threshold (track `lastAlertedAt` on events/tasks to avoid repeat spam)
- **iOS caveat**: Safari only delivers web push to an installed (home-screen) PWA, not a plain browser tab. Since staff device mix is unknown, build an explicit "install this app" onboarding prompt for everyone so push works reliably regardless of device.

### Dashboard
- Summary cards: events needing preparation soon, overdue/upcoming tasks, course counts per branch, active teacher count
- Two alert panels (mirroring bookflow): "Events needing preparation" and "Tasks due/overdue"

### Views
- **Courses**: weekly grid/timetable per branch (day × time, color-coded by course type) as the primary visual view, plus a filterable/sortable table with group-by (branch, teacher, type, age-group) for management
- **Events**: sortable/filterable table only
- **Teachers**: profile cards (photo, name, specialties, branches, active state) + detail page showing their hours report
- **Branches**: management page per branch (address/phone/hours, rooms, closures)
- **Settings** (admin only): alert thresholds, course-type glossary, seasons, closures
- **User Management** (admin only): create/edit/deactivate users, assign role + branches, reset password — mirrors bookflow's UserManagement
- **Audit Log** (admin only): who changed what, when — mirrors bookflow's AuditLogEntry, extended to cover branches/teachers/courses/events/tasks

### Testing / CI
- Diverges from both reference apps (which have neither): add unit tests for the highest-risk logic — role/branch-access middleware, alert-threshold calculations, room-conflict detection — plus a basic CI workflow (lint + test on push). No exhaustive UI testing.

---

## Recommended architecture

### Frontend structure
- src/
  - api/
  - components/
    - layout/ (Sidebar, BottomNav, Header)
    - ui/
    - courses/ (WeeklyGrid, CourseTable, CourseForm)
    - teachers/
    - events/ (EventTable, EventForm, TaskList)
    - branches/
  - contexts/ (AuthContext, ToastContext)
  - hooks/
  - i18n/ (he.json)
  - pages/
  - types/
  - utils/
  - App.tsx
  - main.tsx
  - index.css
  - service-worker / PWA manifest

### Backend structure
- src/
  - index.ts
  - config/
  - middleware/ (auth.ts, requireRole, requireBranchAccess)
  - models/
  - routes/
  - controllers/
  - services/ (alertScheduler, roomConflict, hoursReport)
  - utils/ (auditLogger)
  - socket/

---

## Data model draft

### User
```ts
{
  name, email, passwordHash,
  role,           // 'admin' | 'editor' | 'viewer'
  branchIds: [],  // assigned branches; ignored/all for admin
  isActive,
  createdAt, updatedAt
}
```

### Branch
```ts
{
  name, address, phone,
  hoursOpen, hoursClose,
  rooms: [{ name }],
  isActive,
  createdAt, updatedAt
}
```

### Season
```ts
{ label, startDate, endDate, isActive }
```

### Closure
```ts
{ date, scope, branchId, reason }   // scope: 'all' | 'branch'
```

### CourseType
```ts
{ name, colorTag }
```

### Course
```ts
{
  branchId, courseTypeId, teacherId, seasonId,
  dayOfWeek, startTime, endTime, roomId,
  ageGroupLevel, capacity, price,
  isActive,
  createdAt, updatedAt
}
```

### Teacher
```ts
{
  name, phone, email, photoUrl, bio,
  specialtyCourseTypeIds: [],
  branchIds: [],
  isActive,
  createdAt, updatedAt
}
```

### Event
```ts
{
  title, description,
  branchId,        // null = studio-wide
  eventType,        // 'מופע' | 'תחרות' | 'סדנה' | 'פגישת_צוות' | 'אחר'
  eventDate, prepareDate,
  status,           // 'מתוכנן' | 'בהכנה' | 'הושלם' | 'בוטל'
  addedBy, addedAt,
  lastAlertedAt,
  createdAt, updatedAt
}
```

### Task
```ts
{
  eventId, title,
  status,      // 'לביצוע' | 'בתהליך' | 'הושלם' | 'בוטל'
  assigneeId, dueDate,
  lastAlertedAt,
  createdAt, updatedAt
}
```

### AppSettings
```ts
{
  eventPrepareAlertThresholdDays,  // default 14
  taskDueAlertThresholdDays,       // default 7
  updatedAt
}
```

### PushSubscription
```ts
{ userId, endpoint, keys: { p256dh, auth }, deviceLabel, createdAt }
```

### AuditLogEntry
```ts
{ entityType, entityId, action, userId, userName, changedAt, before, after }
```

---

## Suggested API endpoints

#### Auth
- POST /api/auth/login
- GET /api/auth/me
- PUT /api/auth/change-password

#### Users
- GET / POST / PUT / DELETE /api/users
- PUT /api/users/:id/reset-password

#### Branches
- GET / POST / PUT /api/branches
- GET / POST / PUT / DELETE /api/branches/:id/rooms

#### Seasons & Closures
- GET / POST / PUT /api/seasons
- GET / POST / DELETE /api/closures

#### Course types
- GET / POST / PUT / DELETE /api/course-types

#### Courses
- GET / POST / PUT / DELETE /api/courses
- Room-conflict validation runs server-side on create/update, returns 409 with conflicting course info

#### Teachers
- GET / POST / PUT / DELETE /api/teachers
- GET /api/teachers/:id/hours-report

#### Events & Tasks
- GET / POST / PUT / DELETE /api/events
- PATCH /api/events/:id/status
- POST / PUT / DELETE /api/events/:id/tasks
- PATCH /api/events/:id/tasks/:taskId/status

#### Settings
- GET / PUT /api/settings

#### Audit log
- GET /api/audit-log

#### Push
- POST /api/push/subscribe
- DELETE /api/push/subscribe

---

## Frontend pages to build
- Login, Change Password
- Dashboard
- Courses (weekly grid + table view, create/edit)
- Teachers (list + detail w/ hours report, create/edit)
- Branches (detail w/ rooms + closures, create/edit)
- Events (table, create/edit/detail w/ tasks)
- Settings (thresholds, course types, seasons/closures)
- User Management
- Audit Log

---

## Suggested initial seed data
- Branches: כפר סבא, אורנית, גבעתיים (real addresses/hours above)
- Course types: the 10 real types listed above
- Default admin user
- Default thresholds: eventPrepareAlertThresholdDays = 14, taskDueAlertThresholdDays = 7
- One active season for the current dance year

---

## Suggested implementation order
1. Bootstrap backend and frontend shells (git init, PWA scaffold, Tailwind theme)
2. Auth, roles, branch-scoping middleware, User Management
3. Branches (+ rooms) and Course-type glossary
4. Courses: weekly grid view, table view, room-conflict validation
5. Teachers: profiles, branch assignment, hours report
6. Events + Tasks: table view, filters/sort, CRUD
7. AppSettings (thresholds), Seasons/Closures
8. Push notification infra (VAPID, subscribe endpoint, install-prompt onboarding) + scheduled threshold job
9. Dashboard summary cards + two alert panels
10. Audit log across all entities
11. Socket.IO real-time refresh on dashboard/list/detail views
12. Core unit tests (role/branch access, alert thresholds, room conflict) + CI workflow

---

## Important implementation notes
- Capacity on a course is still an informational max; price is still informational display only, no billing (student/enrollment tracking added in Phase 2 is about roster + dropouts, not payments)
- No self-registration, no self-service password reset — admin manages all accounts
- Rooms, course types, and branches are managed reference data, not free text, so filtering and conflict detection stay reliable
- Build the PWA install-prompt for all users, not just suspected iPhone users — required for push to work on iOS, cheap to include for everyone
- Avoid duplicate alert spam — gate push sends on `lastAlertedAt`
- Reuse CourseManager/bookflow conventions throughout: custom Tailwind components (no external UI kit), i18next Hebrew-only, JWT + bcrypt auth, Socket.IO for live updates

---

## Addendum: Leads & Student Enrollment/Dropout Tracking (Phase 2)

Driven by the studio's digital-marketing plan (lead funnel + SLA, retention). Two additions, deliberately scoped to reuse existing patterns rather than becoming a full CRM:

### Leads
- **Entry**: manual only for v1 — staff log every inbound inquiry (phone, WhatsApp, a website submission that currently arrives by email) themselves. `source` is a controlled field so a future website-form webhook can populate it automatically without a model change.
- Fields: name (free text, not gender-specific), phone, branch of interest, source (`אתר` / `טלפון` / `רשתות_חברתיות` / `הפניה` / `אחר`), status, notes, who created it, timestamps.
- Status lifecycle: `חדש` → `נוצר_קשר` → `בטיפול` → `נרשם` or `לא_רלוונטי`.
- **SLA alert**: reuses the existing threshold/push pattern — if a lead sits in `חדש` past `leadSlaThresholdHours` (admin-configurable, default 4) with no contact logged, push-alert the branch's assigned editors + admins. Same `lastAlertedAt` dedup approach as events/tasks, extended to hours instead of days.
- Access: branch-scoped, no per-lead assignee — any editor/admin assigned to that branch sees and can act on it (matches how courses/teachers are already scoped). Viewers read-only.
- **Conversion**: marking a lead `נרשם` offers a "create student" action that pre-fills a new Student record (name, phone, branch) from the lead — the actual bridge between marketing and the roster.

### Students & dropout tracking
- Reverses the earlier "no student records" v1 decision — the studio wants real counts of who dropped, from which course/branch, and why.
- A student can be enrolled in **multiple courses at once** (real-world case), and drop status is tracked **per enrollment**, not globally — a student can drop one course while staying in another.
- Fields: name, guardian/parent phone (kept — this is the only realistic way staff can act on the data), and an embedded `enrollments` array (course, status, enrolled date, and — only when dropped — drop date/reason/note).
- **Dropout reasons are an admin-managed reference list** (like CourseType), not a hardcoded enum — seeded with מחיר / חוסר זמן־התנגשות זמנים / מעבר מגורים / חוסר שביעות רצון / סיום עונה־גיל טבעי / אחר, editable (add/remove) from Settings.
- **Reporting only, no automatic alerts** — a filterable dropout report (by branch/course/reason/time period) showing raw counts. No dropout-rate/percentage metric (would need a maintained "currently enrolled" denominator beyond what's needed here) and no push notification on dropout patterns — deliberately kept simple per the studio's own call.
- Bonus, low-cost given the new data: the Courses view can now show real "enrolled / capacity" (e.g. "12/15") computed from active enrollments, instead of just the static capacity number.
- Access: admin+editor branch-scoped CRUD (add student, manage enrollments, mark dropped); viewer read-only. Dropout-reason glossary is admin-only, in Settings. All changes audit-logged like every other entity.

### New data models
```ts
// Lead
{
  name, phone,
  branchId,          // ref Branch
  source,            // 'אתר' | 'טלפון' | 'רשתות_חברתיות' | 'הפניה' | 'אחר'
  status,            // 'חדש' | 'נוצר_קשר' | 'בטיפול' | 'נרשם' | 'לא_רלוונטי'
  notes,
  convertedStudentId, // ref Student, set once status = 'נרשם' and conversion happens
  createdBy,          // ref User
  lastAlertedAt,      // SLA dedup
  createdAt, updatedAt
}
```
```ts
// DropoutReason
{ name, isActive }
```
```ts
// Student
{
  name, guardianPhone,
  enrollments: [{
    courseId,          // ref Course
    status,            // 'פעיל' | 'פרש'
    enrolledAt,
    droppedAt,
    dropoutReasonId,   // ref DropoutReason, set when status = 'פרש'
    dropoutNote,
  }],
  createdAt, updatedAt
}
```
```ts
// AppSettings addition
{ leadSlaThresholdHours }  // default 4
```

### New API endpoints
- `GET/POST/PUT/DELETE /api/leads`, `PATCH /api/leads/:id/status`, `POST /api/leads/:id/convert` (creates the linked Student)
- `GET/POST/PUT/DELETE /api/dropout-reasons`
- `GET/POST/PUT/DELETE /api/students`, `POST /api/students/:id/enrollments`, `PATCH /api/students/:id/enrollments/:enrollmentId`
- `GET /api/reports/dropouts` — aggregated counts, filterable by branch/course/reason/date range

### New/changed views
- **Leads**: table (name, phone, branch, source, status, created date), filters by branch/status/source, SLA badge when overdue, status dropdown per row, "המר לתלמיד/ה" action
- **Students**: roster list (name, guardian phone, enrolled courses with status chips), filters by branch/course/status, add/edit, per-enrollment "סמן כפרש/ה" action (reason + note + date)
- **Dropout report**: filterable counts table by branch/course/reason/month — no charts required for v1
- **Courses**: capacity column becomes "נרשמים/מקסימום", computed from active enrollments
- **Settings**: new "סיבות פרישה" tab (admin-managed list) alongside the existing thresholds/course-types/seasons/closures tabs; add `leadSlaThresholdHours` next to the existing two thresholds

### Implementation order addendum
13. DropoutReason glossary + Student model + roster UI + per-enrollment drop flow
14. Dropout report (filterable, counts only, no alerts)
15. Lead model + SLA alert (extends the existing alert scheduler) + Leads UI + lead→student conversion
16. Courses view: real enrolled/capacity display from Student enrollments

---

## Current repository status
Initial scaffold is built and verified (git initialized, not yet committed):
- **Backend**: all models, middleware, routes, services (room-conflict, hours-report, alert-threshold, push sender, cron scheduler), seed script, and unit tests are in place. `npm run build` and `npm test` (28 tests) pass. Requires a running MongoDB to actually serve requests.
- **Frontend**: Vite/Tailwind/i18next scaffold, PWA manifest + custom service worker (push + notification-click handling), AuthContext/routing/RequireRole, and all pages (Login, ChangePassword, Dashboard, Branches, Teachers, TeacherDetail, Courses [grid+list], Events, EventDetail, Settings, UserManagement, AuditLog) are implemented against the API contract above. `npm run build` passes.
- **CI**: `.github/workflows/ci.yml` runs backend build+test and frontend build on push/PR.
- Not yet done: seeding real teacher/course/room data (rooms are seeded as generic placeholders "אולם 1"/"אולם 2" per branch — real room names need confirming with each branch), generating and configuring real VAPID keys, deploying to Vercel/Render/Atlas.
- **Phase 2 addendum (Leads, Students, dropout tracking) is now built**: `Lead`/`Student`/`DropoutReason` models, branch-scoped routes, the lead-SLA cron extension, the dropout aggregation service, and the Leads/Students/DropoutReport pages + Settings tabs are all in place. `npm run build` and `npm test` (41 tests) pass on the backend; frontend build passes. Verified live end-to-end against a seeded ephemeral MongoDB: lead creation, student enrollment, marking an enrollment dropped (with reason/note), the resulting `enrolledCount` on courses, and the dropout report's branch/reason aggregation all behaved correctly, and the new pages (Leads, Students, DropoutReport, Settings → סיבות פרישה, Courses list) render with zero console errors.
- Not committed to git yet.
