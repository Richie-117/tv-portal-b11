# TV B11 — New Mobile-First Portal
## Antigravity Master Build README

**Project:** Division of Television Studies — UCR, Batch 11  
**Purpose:** Build a **completely new website and database**, not a reskin or in-place rewrite of the existing UCR portal.  
**Design:** White-theme, cyber-futuristic, premium, clean, highly responsive mobile-first interface inspired by the supplied check-in screenshots.  
**Hosting target:** Render  
**Database:** Brand-new Supabase project  
**Source for limited reusable information:** `D:\UCR-Portal-New` (read-only)

> **Important:** The screenshots are design and workflow references, not evidence that their displayed records, dates, or attendance counts are current. Inspect the screenshots supplied to Antigravity. Do not copy real student names or the example lecture status into demo data.

---

## 1. Project boundaries and first steps

1. Inspect the existing project at `D:\UCR-Portal-New` **read-only**. Identify student names, index numbers, course assignments, module names, existing timetable data, and any reusable check-in/attendance logic. Confirm the actual fields and source of truth; do not assume the old data is correct.
2. Extract **only** the student fields needed for this new system: student identifier/index, display name, course (`TPOPT` or `TPRPT`), and any essential linkage IDs. Do not import addresses, telephone numbers, parent contacts, or other unnecessary personal information.
3. Inspect the four supplied reference screenshots: (a) active student check-in terminal, (b) standby terminal, (c) admin check-in broadcast controls, and (d) admin attendance record editor.
4. Create a **separate new project folder** on `D:\`, with a distinct name such as `D:\TV-B11-Portal`. Never overwrite `D:\UCR-Portal-New`. If the proposed destination already exists, ask before changing it.
5. Use a **new Supabase project/database**, never the existing portal's production Supabase project. Do not copy old credentials.
6. Write `PROJECT_DISCOVERY.md` with verified source files, reusable data fields, course/module inventory, existing check-in behaviour, technical decisions, and unresolved questions.
7. Before any live student-data import, show a proposed migration preview and obtain user approval. Do not publish private student data in Git.
8. Implement the new application independently, using the old site only as a reference for useful data and proven behaviour.

### Scope discipline

This is intentionally a small portal. Do **not** reintroduce unrelated pages from the old portal, such as a general student directory, gallery, events, workspace, chat, or complex module-management suite. The primary public navigation is **Home, Check-in, Timetable**, with **Profile/Login** and **Admin** available in their appropriate contexts.

---

## 2. Suggested architecture

Choose a straightforward, maintainable stack compatible with Render and Supabase. Prefer TypeScript and reusable UI components. A React frontend with a secure Node/Express backend is acceptable, but inspect the developer environment and justify the final stack. Use Supabase Postgres and appropriate authentication, Row Level Security (RLS), constraints, and server-side access controls.

- Mobile-first, responsive web application; PWA-ready if practical, but no APK required now.
- Separate frontend components for Home, Check-in, Timetable, Profile, Admin and shared UI.
- Server-side or protected database operations for attendance submissions, admin mutations, exports, and invitation redemption.
- Minimal dependencies, efficient queries, sensible indexes, and no unnecessary continuous polling.
- Environment-based configuration for local development and Render.
- No service-role keys, invitation secrets, or database passwords exposed to browsers.
- Use `Asia/Colombo` as the academic display timezone. Store timestamps consistently and avoid date rollover bugs.

Provide `.env.example`, safe migrations, seed instructions using synthetic data, a `.gitignore`, local run commands, and Render deployment instructions. Do not deploy or push code without user approval.

---

## 3. Design system — inspired by the uploaded screenshots

Create a **new cohesive visual identity** using the supplied TV B11 check-in terminal references, rather than copying the previous portal's dark dashboard.

### Visual language

- White and near-white cards, pale icy-blue backgrounds, subtle blueprint/grid patterns.
- Electric-blue accents, bright cyan details, selective orange for active selections or alerts, green for verified/success states.
- Deep navy text, strong legibility, refined typography, compact mono-style technical labels for statuses/timestamps.
- Rounded cards, fine borders, clean shadows, subtle corner brackets and small futuristic interface details.
- Crisp mobile tap targets, generous spacing, comfortable form controls, accessible contrast.
- Tasteful micro-interactions only; avoid heavy animation or visual clutter.
- Distinct **LIVE**, **STANDBY**, **CANCELLED**, **POSTPONED**, **VERIFIED**, **SUBMITTED**, and **CLOSED** states.

### Reference-specific components

1. **Active terminal:** TV B11 header, status indicator, active module card, course choice, last-index-digits field, verified student card, prominent Confirm & Check In action.
2. **Standby terminal:** radar/broadcast visual, no-active-check-in message, manual Check Now button, clear idle state.
3. **Admin broadcast modal:** module/date/course, session status, check-in close time, counts, duration selector and close-window control.
4. **Admin attendance editor:** student list, Present/Absent/Excused controls, search, save, PDF and Excel export actions.

Adapt these to a consistent modern UI. Do not show fake “live sync” claims; statuses must reflect actual backend state.

### Responsive requirements

Design at 360–430 px widths first, then tablet and desktop. No horizontal overflow; ensure long student names, course labels, date ranges and tables remain usable. Use sticky actions where appropriate, bottom sheets or full-screen dialogs on mobile, and accessible desktop layouts. Test actual narrow viewport behaviour.

---

## 4. Pages and navigation

### Home (`/`)

- TV B11 / Division of Television Studies / UCR identity.
- Three prominent actions: **Profile**, **Check-in**, **Timetables**.
- **Live Lecture** showcase automatically derived from the currently active timetable for the current weekday/time and the relevant course(s).
- Show module name, course applicability (`TPOPT`, `TPRPT`, or `COMMON`), start/end time and status.
- If two courses have different simultaneous modules, show both appropriately.
- If multiple modules overlap, show all relevant lectures rather than silently selecting one.
- When no lecture is scheduled, show a clean standby/upcoming state, not an invented live lecture.
- Admin overrides (cancel, postpone, reschedule) must update the Home live-lecture display and Timetable status correctly.
- **A scheduled live lecture does not automatically open student check-in.** A separate authorized admin broadcast controls the check-in window.

### Check-in (`/check-in`)

Public student check-in terminal, no full account login required for this action, matching the previous proven check-in concept.

### Timetables (`/timetable` or `/timetables`)

- Public readable full timetables for both courses.
- Course switcher: TPOPT / TPRPT, with common modules represented correctly.
- Clear day/time/module layout, responsive on mobile.
- Display current lecture and overrides (cancelled, postponed, rescheduled).
- Admin timetable editing is in the Admin area, not the public view.

### Profile (`/profile`) and Login (`/login`)

- Student profile requires authenticated account.
- First-time account creation uses a securely issued **one-time invite code** tied to that student's record.
- After activation, student logs in with their configured credentials and views their own profile and attendance calendar.
- If invitation-based accounts are deferred, show a proper unavailable/coming-soon state and build the schema securely; do not expose an unprotected profile route.

### Admin (`/admin`)

- Protected admin/representative login and role-aware interface.
- Timetable editor, lecture overrides, check-in broadcast creation/control, attendance session editor, reports and exports, invite management (appropriate roles only).
- Keep the admin interface efficient and mobile-friendly; use clear sections instead of many unnecessary public tabs.

---

## 5. Student dataset and courses

Only two courses are in scope:

- **TPOPT** — Television & Digital Media Post-Production Technology.
- **TPRPT** — Television & Digital Media Production Technology.

Import the minimal verified student data from `D:\UCR-Portal-New` after review:

- Internal student ID.
- Full/display name.
- Full index number (example format `RT/TPOPT/26/02`).
- Course identifier.

Do not assume a fixed student count. Verify every index is unique and maps to exactly one student and course. Preserve leading zeroes in index suffixes. Keep course and index data consistent. Do not import unrelated profile data.

---

## 6. Timetable editor and lecture synchronization

The administrator must be able to **create and edit a separate timetable for each course**. Inspect the old timetable data, but do not force the old time ranges into the new site.

### Timetable editor

- Choose course: TPOPT, TPRPT, or a common module applicable to both.
- Choose weekday/date applicability.
- Choose module from imported/verified module list; allow authorized creation/editing of modules if required.
- Select start and end times with a simple time-range picker.
- Edit existing entries and change module or time range.
- Support multiple sessions in a day and simultaneous sessions for different courses.
- Validate start before end; warn about unintended overlaps.
- Save to new Supabase database and show confirmed persistence.
- Support effective dates/versions if timetable changes during the term, so previous sessions and attendance retain their correct historical context.

### Automatic Live Lecture feature

- Derive live/upcoming lecture cards from saved timetable entries using `Asia/Colombo` time.
- Respect date-specific admin overrides.
- Cancelled lecture: show cancelled, never active.
- Postponed lecture: show postponed; new date/time only when confirmed.
- Rescheduled lecture: show the updated slot while preserving original history.
- Do not create attendance records just because a lecture is scheduled.
- Use a lightweight refresh strategy appropriate for a mobile site; avoid aggressive backend polling. Ensure the display changes at time boundaries without requiring an excessive request rate.

---

## 7. Check-in: student terminal workflow

This workflow is a core requirement. Match the supplied terminal screenshots while improving clarity and reliability.

### 7.1 Standby state

When there is **no open admin-pushed check-in session**:

- Show the TV B11 terminal header and `STANDBY` status.
- Show a radar-style standby visual and “No attendance check-in available” message.
- Provide **Check Now** to fetch current open sessions.
- Do not show the student verification form for a closed/nonexistent session.
- If a check-in window opens, update the terminal appropriately using a lightweight mechanism (e.g. manual refresh plus modest, bounded foreground checks if approved). Avoid wasteful background polling.

### 7.2 Active session state

When an admin opens a check-in broadcast:

1. Show the open module/session, date, time window and applicable course(s).
2. Student selects **TPOPT** or **TPRPT** (for a common session, either applicable course can be selected).
3. Student enters **only the final digits** of their index, e.g. `02` from `RT/TPOPT/26/02`.
4. Resolve the student using the selected course and verified index suffix. Never resolve from suffix alone across both courses.
5. Show the matching student's name, full index and course in a **Verified Student** card.
6. Student taps **Confirm & Check In**.
7. Submit to the secure backend; return confirmed success, already-checked-in, expired, invalid-course or other accurate status.
8. Disable duplicate submissions during processing.

**Important:** A matching name/index is only an identification convenience, **not strong authentication**. Do not expose extra personal information through the public lookup. Add rate limiting, input validation, abuse controls, and consider a stronger verification option if the campus requires resistance to impersonation. Clearly document the security trade-off of index-suffix-only check-in.

### 7.3 One check-in per student per session

- A student may successfully check in **once per session**.
- Enforce uniqueness at the database level (`session_id`, `student_id`) and through atomic backend operations.
- Repeated clicks, refreshes, multiple tabs and simultaneous requests must not create duplicate attendance rows.
- If the same student attends different modules/sessions on one day, each session is a separate valid attendance opportunity.
- Validate session is open, within its time window, and applies to the student's course.
- Never trust a student ID sent by the browser without validating it against the selected course/index lookup.

---

## 8. Admin check-in broadcasts and session lifecycle

### Create new record / push check-in

Admin clicks **New Check-in Record** and selects:

- Course scope: `TPOPT`, `TPRPT`, or **BOTH / COMMON**.
- Module (validate compatibility with selected course scope).
- Date, and optional linked timetable lecture.
- Check-in window duration (reference offers **15 / 30 / 60 / 120 minutes**; allow appropriate configuration).
- Optional notes.

Admin then presses **Push / Open Check-in**. The session becomes visible in `/check-in` only after the database confirms it is open. Show opening time, closing time, status and live submission counts. Permit early closure by authorized admin.

### State model

Use clear states such as `draft`, `open`, `closed`, `cancelled` and `finalized` (adjust to actual implementation). Ensure expiration is enforced server-side even if a UI timer is stale. Opening or closing a session must not delete records. Track creator, timestamps and changes.

### Multiple broadcasts

Define deterministic behaviour if more than one session is open simultaneously. The student terminal should let the student select the applicable open session/module, or otherwise show all valid choices; never silently check into the wrong module.

### Admin monitoring

- Show session name, module, date, applicable course(s), check-in open/close time and status.
- Show submitted, confirmed, withdrawn (if supported), present, absent and excused counts with clearly defined meanings.
- Provide session search, filter, close-window action and entry into attendance editing.
- Do not claim a student is present merely because their index was looked up; count only successful confirmed submissions or authorized manual updates.

---

## 9. Attendance recording and admin review

For every check-in session, build the expected roster from its applicable course(s). A common session includes eligible students from both courses.

### Attendance statuses

- **Present** — confirmed check-in or authorized manual mark.
- **Absent** — deliberately finalized as absent after the check-in window closes.
- **Excused** — admin-approved exception, with optional reason; distinguish from Absent in reporting.
- **Pending / Unmarked** — no final decision yet; do **not** automatically equate this with Absent while a session is still open.

### Finalization rule

After the check-in window closes, admin reviews the roster. Provide a clear **Finalize Attendance** action that can convert remaining eligible Pending entries to Absent, with confirmation and a preview of how many students will be affected. Alternatively allow admin to mark individuals manually. Do not silently mark missing students Absent while the session is still open. An explicitly cancelled lecture/session should not count as an absence.

### Edit and save

- Search students by name or index.
- Present / Absent / Excused selection per student, matching the screenshot.
- Save Updated Session button.
- Persist changes to Supabase, including the editor and timestamp.
- Reopen saved sessions and display the latest database values.
- Prevent partial writes and duplicate rows; handle conflicting edits safely.
- Preserve audit history for manual corrections and excused reasons.
- Allow appropriate admin correction of a finalized session without altering unrelated sessions.

### Reports and exports

- **Export Session Excel** and **Export Session PDF**, as in the screenshot.
- Support date/week/month/custom range, module, course, student, and attendance status filters where practical.
- Provide current records from Supabase at download time, not stale static exports.
- Show present, absent, excused and pending counts clearly.
- Use a consistent attendance percentage rule; document whether Excused is excluded from the denominator (recommended: exclude Excused and cancelled sessions).
- A student with no recorded eligible session should show “No attendance data”, not a misleading 0%.
- Show “Calculating attendance…” or “Preparing export…” for slow operations.
- Excel/PDF exports must respect role permissions and must not contain unrelated personal data.

---

## 10. Student profile and attendance calendar

The **Profile** feature is separate from public check-in. Public check-in does not automatically log a student into their profile.

### Invite-based account creation

- An authorized admin generates a **single-use, expiring invitation** tied to a specific student record.
- Student redeems the invitation to create a secure account (e.g. Supabase Auth with password and appropriate recovery flow).
- Store invitation tokens securely (hashed where appropriate); do not expose them in public listings or Git.
- Prevent an invitation being redeemed twice.
- After login, bind the authenticated account to the correct student record.
- Protect routes and backend/RLS queries so students can view **only their own data**.
- Admins can manage invitations according to role permissions.

### Profile screen

- Display student name, full index and course.
- Display a **monthly attendance calendar visualizer** with previous/next month navigation.
- Tap a date to view module-specific attendance results for that date.
- Clearly distinguish Present, Absent, Excused, Cancelled and No Session/Pending.
- Support multiple modules on the same day.
- Show monthly summary and attendance percentage using only valid finalized sessions.
- Do not count dates without sessions, cancelled lectures, or pending records as absences.
- Keep the UI clean and mobile-first; students cannot edit attendance.

### Academic stages

Support a future-proof stage/semester relationship for **Foundation, Level 5, Level 6**, with schedules and modules varying by stage. Only activate stages actually underway. Do not invent Level 5/6 schedules. Preserve historic attendance by stage and avoid deleting Foundation records when the active stage changes. If relevant to the imported records, distinguish the Foundation academic start (**25 October 2026**) from this portal's attendance tracking start (**16 November 2026**), and do not manufacture earlier absences. Confirm any current deployment-specific start dates with the user before enforcing them globally.

---

## 11. Proposed Supabase data model

Inspect the actual requirements and refine this model before writing migrations:

- `courses` — code, name.
- `students` — ID, index number, index suffix, name, course ID, active flag.
- `modules` — ID, code/name, applicable course(s), optional stage/semester.
- `academic_stages` / `semesters` — configurable future stages and terms.
- `timetable_entries` — course applicability, module, weekday, time range, effective dates, version/status.
- `lecture_overrides` — affected timetable entry/date, cancel/postpone/reschedule status, reason, new date/time, editor.
- `checkin_sessions` — module, date, scope, status, window start/end, linked lecture, creator, timestamps.
- `session_eligible_students` or a reliably reproducible eligible roster snapshot — preserves who was expected for historical sessions.
- `attendance_records` — session ID, student ID, status, submission source (self-check-in/admin), submitted/updated times, editor, optional excuse reason.
- `attendance_audit` — corrections and session changes.
- `profiles` / `account_student_links` — authenticated user mapped to exactly one student or authorized admin identity.
- `invitations` — student link, token hash, expiry, redemption status.
- `admin_roles` / `representative_scopes` — role-based permissions and course/batch scope.

**Required constraints:** unique full student index; course + normalized index suffix lookup; unique attendance (`session_id`, `student_id`); valid foreign keys; check-in window and state validation; indexes for course/module/date/session/student queries. Prefer transaction-safe server operations for creating sessions, check-ins, finalization and bulk edits.

**Security:** RLS for student self-access, scoped admin access, protected invite redemption, no client-side privileged secrets, rate-limited public check-in lookup/submission, and robust server-side validation.

**Important:** Do not assume that only knowing the last two digits of an index is sufficient for strong identity proof. Document this risk and suggest optional safeguards without breaking the requested simple workflow.

---

## 12. Correctness rules and edge cases

1. Same index suffix may exist in both courses: course selection disambiguates.
2. Preserve suffix leading zeros: `02` is not accidentally stored as `2` without normalization rules.
3. Common sessions accept both courses but only one record per student/session.
4. Two modules on the same date require two separate attendance records.
5. Student lookup alone does not count as a check-in.
6. Check-in after window closure is rejected server-side.
7. A repeated check-in returns a clear “Already checked in” response and does not duplicate data.
8. Cancelled sessions do not produce absences; postponement does not double-count.
9. Missing/pending status is not silently counted as Absent before finalization.
10. If no active check-in exists, the public terminal shows Standby even if a lecture is live on the timetable.
11. The Home live lecture must respect the current Colombo date/time and overrides.
12. Editing a timetable must not rewrite past attendance history.
13. If the connection fails, never display a false success message.
14. Role checks must work on the backend, not only through hidden buttons.
15. Public lookup should reveal only the minimal information needed for student confirmation; implement rate limiting.
16. Reports, profile summaries and session editor must use consistent attendance calculations.

---

## 13. Performance and deployment

- Optimize for Render and Supabase free/low-cost tiers.
- Fetch only the required data; avoid fetching the entire student list on public pages.
- Cache public timetable reads where safe; invalidate after admin edits.
- Keep check-in status refresh lightweight, especially on mobile; pause unnecessary requests when the page is hidden.
- Debounce student lookup, prevent repeated submission, and provide loading/error states.
- Index frequent database filters and avoid N+1 queries.
- Use responsive loading skeletons, informative empty states and error recovery.
- Provide Render build/start instructions, health check, environment variable list, database migration commands and Supabase RLS setup instructions.
- Do not commit `.env`, secret tokens, real student exports or backups.

---

## 14. Required end-to-end demo and testing

Use a **separate test Supabase project or isolated safe test database**, with synthetic student names/indexes. Do not insert fake records into production or delete real records.

Verify the following against the database, not just mocked UI:

1. Create TPOPT and TPRPT timetable entries and a common module.
2. Confirm Home displays correct live/upcoming lecture for the configured test time.
3. Cancel/postpone a lecture and verify Home and Timetable reflect the override.
4. Open `/check-in` with no active broadcast; confirm Standby UI.
5. Admin creates a TPOPT-only check-in; terminal shows Active.
6. Enter `02` for the correct course; verify name/index and submit.
7. Reload and verify saved attendance persists in Supabase.
8. Attempt duplicate check-in; verify database uniqueness and clear response.
9. Attempt the same suffix under the wrong course; ensure no incorrect student is matched.
10. Open a common session; confirm eligible students from both courses can check in once each.
11. Close the window; verify late submissions fail.
12. Finalize a session; verify unmarked students become Absent only through the explicit confirmed finalization action.
13. Admin changes a record to Excused or Present, saves, reloads, and verifies persistence and audit trail.
14. Export session PDF and Excel; verify counts and current values.
15. Redeem a one-time invite and log in to a student profile.
16. Verify the student monthly calendar shows only that student's attendance and correct per-module dates.
17. Attempt another student's profile/API access and verify denial.
18. Verify unauthorized users cannot create broadcasts or edit attendance.
19. Test mobile layout at narrow widths and slow/failed network states.
20. Verify Render-ready build and startup locally.

If the isolated test database is unavailable, stop before the database demo, explain what is needed, and do not falsely claim the demo passed.

---

## 15. Implementation order

**Phase 1 — Discovery and architecture**
- Inspect old project and screenshots, inventory minimal data, create `PROJECT_DISCOVERY.md`, confirm new project folder and Supabase setup.

**Phase 2 — New UI foundation**
- Build responsive white cyber-futuristic design system, Home, Check-in Standby, Timetable views and navigation.

**Phase 3 — Database and timetable**
- Create new Supabase schema, secure policies, import approved minimal student/module data, implement admin timetable editor, Home live lecture synchronization and overrides.

**Phase 4 — Check-in and attendance**
- Implement admin broadcasts, student verification/check-in, uniqueness, window expiry, roster finalization, manual attendance editing, reports and exports.

**Phase 5 — Profile and invites**
- Implement secure invitation-based account activation, login, personal profile and monthly attendance calendar.

**Phase 6 — Testing and Render readiness**
- Run isolated database demo, verify permissions, mobile UI, PDF/Excel and build/deployment instructions.

Do not silently skip any phase. Report blockers, ask for missing credentials through secure local setup (never paste secrets into reports), and keep the user informed of any decisions that affect student data or attendance semantics.

---

## 16. Required deliverables

At completion, provide:

1. A completely separate new project on the user's machine.
2. `PROJECT_DISCOVERY.md` — old-source inventory and minimal data mapping.
3. `DATABASE_SCHEMA.md` — schema, relationships, constraints, RLS and migration steps.
4. `CHECKIN_WORKFLOW.md` — states, verification, duplicate prevention, finalization and security caveats.
5. `TEST_REPORT.md` — each end-to-end test with actual results and pass/fail status.
6. `.env.example` and `RENDER_DEPLOYMENT.md` — safe configuration and deployment steps.
7. Exact local setup, migration, seed and run commands.
8. Screenshots of mobile Home, active/standby Check-in, Timetable, Admin and Profile where feasible.
9. List of changed files and any unfinished tasks.

**Success means the new website looks excellent on mobile AND its timetable, lecture overrides, student check-in, attendance edits, profile calendar and exports work correctly with the new Supabase database. A visually finished mockup is not sufficient.**
