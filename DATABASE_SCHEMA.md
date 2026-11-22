# TV B11 Portal — Database Schema & Architecture Specification

**Database Target:** Supabase PostgreSQL & Local Resilient Fallback Engine (`data/db.json`)  
**Timezone Reference:** `Asia/Colombo`  
**Security Model:** Row-Level Security (RLS) with Role-Based Scopes  

---

## 1. Schema Entity Relationship

```
+----------------+       1:N       +-------------------+
|    courses     |----------------<|     students      |
+----------------+                 +-------------------+
        |                                    | 1:N
        | 1:N                                v
+----------------+                 +-------------------+       1:N       +------------------+
|    modules     |                 |attendance_records |<----------------| checkin_sessions |
+----------------+                 +-------------------+                 +------------------+
        |                                    ^                                     ^
        | 1:N                                | 1:N                                 | 0:1
+--------------------+                       |                                     |
| timetable_entries  |                       |                           +--------------------+
+--------------------+                       |                           | lecture_overrides  |
                                             |                           +--------------------+
                                   +-------------------+
                                   |attendance_checkins|
                                   +-------------------+
```

---

## 2. Table Specifications & Constraints

### 2.1 `courses`
Stores academic course definitions.
- `id` (VARCHAR(16), PRIMARY KEY): e.g. `'TPOPT'`, `'TPRPT'`, `'COMMON'`.
- `name` (VARCHAR(128), NOT NULL): Full official title.
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()).

### 2.2 `students`
Stores official enrolled student records with minimal necessary privacy footprint.
- `id` (VARCHAR(64), PRIMARY KEY): System ID, e.g. `'student-tpopt-002'`.
- `student_number` (VARCHAR(32), NOT NULL, UNIQUE): Full index, e.g. `'RT/TPOPT/26/02'`.
- `index_suffix` (VARCHAR(4), NOT NULL): Normalized two-digit numeric suffix, e.g. `'02'`.
- `full_name` (VARCHAR(128), NOT NULL): Official display name.
- `course` (VARCHAR(16), NOT NULL, REFERENCES courses(id)): `'TPOPT'` or `'TPRPT'`.
- `is_active` (BOOLEAN, DEFAULT TRUE).
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()).
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW()).
- **Index:** `idx_students_course_suffix` ON `(course, index_suffix)` for sub-millisecond lookup.

### 2.3 `academic_modules`
Official course subjects and foundation modules.
- `id` (VARCHAR(64), PRIMARY KEY): e.g. `'sub-ict'`, `'POST-5101'`.
- `code` (VARCHAR(32), NOT NULL, UNIQUE): e.g. `'ICT'`, `'POST-5101'`.
- `title` (VARCHAR(128), NOT NULL): Module title.
- `course_scope` (VARCHAR(16), NOT NULL): `'TPOPT'`, `'TPRPT'`, or `'ALL'`.
- `stage` (VARCHAR(32), DEFAULT 'Foundation'): Academic stage.
- `sort_order` (INTEGER, DEFAULT 0).
- `is_active` (BOOLEAN, DEFAULT TRUE).

### 2.4 `timetable_entries`
Scheduled lecture slots representing weekly academic timetable.
- `id` (VARCHAR(64), PRIMARY KEY).
- `course` (VARCHAR(16), NOT NULL): `'TPOPT'`, `'TPRPT'`, or `'ALL'`.
- `day_of_week` (VARCHAR(16), NOT NULL): `'Monday'`, `'Tuesday'`, etc.
- `start_time` (VARCHAR(8), NOT NULL): 24-hr format `'08:30'`.
- `end_time` (VARCHAR(8), NOT NULL): 24-hr format `'09:30'`.
- `subject` (VARCHAR(128), NOT NULL).
- `module_code` (VARCHAR(32)).
- `student_group` (VARCHAR(64)): e.g. `'A/L & NVQ Students'`.
- `slot_type` (VARCHAR(16), NOT NULL): `'class'`, `'break'`, `'lunch'`, `'empty'`.
- `sort_order` (INTEGER, DEFAULT 0).
- **Constraint:** `check_time_order CHECK (start_time < end_time)`.

### 2.5 `lecture_overrides`
Date-specific administrative adjustments to scheduled lectures.
- `id` (VARCHAR(64), PRIMARY KEY).
- `course` (VARCHAR(16), NOT NULL): `'TPOPT'`, `'TPRPT'`, or `'ALL'`.
- `date` (DATE, NOT NULL): Date of override.
- `slot_id` (VARCHAR(64), REFERENCES timetable_entries(id)).
- `action` (VARCHAR(16), NOT NULL): `'cancel'`, `'postpone'`, `'reschedule'`.
- `subject` (VARCHAR(128), NOT NULL).
- `reason` (TEXT).
- `new_date` (DATE): For postponed/rescheduled sessions.
- `new_start_time` (VARCHAR(8)).
- `new_end_time` (VARCHAR(8)).
- `updated_by` (VARCHAR(64)).
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()).

### 2.6 `checkin_sessions`
Active and historical attendance roll-call broadcasts.
- `id` (VARCHAR(64), PRIMARY KEY).
- `course` (VARCHAR(16), NOT NULL): Scope `'TPOPT'`, `'TPRPT'`, or `'ALL'`.
- `module_id` (VARCHAR(64), NOT NULL): Target subject.
- `module_code` (VARCHAR(32), NOT NULL).
- `module_title` (VARCHAR(128), NOT NULL).
- `session_type` (VARCHAR(16), NOT NULL): `'lecture'`, `'practical'`, `'workshop'`, `'other'`.
- `date` (DATE, NOT NULL): Session date.
- `start_time` (VARCHAR(8), NOT NULL).
- `end_time` (VARCHAR(8), NOT NULL).
- `checkin_status` (VARCHAR(16), NOT NULL): `'draft'`, `'active'`, `'closed'`, `'expired'`, `'finalized'`.
- `session_status` (VARCHAR(16), NOT NULL): `'scheduled'`, `'active'`, `'cancelled'`, `'postponed'`, `'completed'`.
- `checkin_window_minutes` (INTEGER, NOT NULL): 15, 30, 60, or 120.
- `checkin_opened_at` (TIMESTAMPTZ).
- `checkin_expires_at` (TIMESTAMPTZ).
- `notes` (TEXT).
- `created_by` (VARCHAR(64)).
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()).

### 2.7 `attendance_records`
Official finalized or manually marked attendance records per student per session.
- `id` (VARCHAR(64), PRIMARY KEY).
- `session_id` (VARCHAR(64), NOT NULL, REFERENCES checkin_sessions(id) ON DELETE CASCADE).
- `student_id` (VARCHAR(64), NOT NULL, REFERENCES students(id) ON DELETE CASCADE).
- `student_number` (VARCHAR(32), NOT NULL).
- `student_name` (VARCHAR(128), NOT NULL).
- `course` (VARCHAR(16), NOT NULL).
- `status` (VARCHAR(16), NOT NULL): `'present'`, `'absent'`, `'excused'`, `'pending'`.
- `submission_source` (VARCHAR(16), NOT NULL): `'self_checkin'`, `'admin_manual'`, `'finalized'`.
- `marked_at` (TIMESTAMPTZ, DEFAULT NOW()).
- `marked_by` (VARCHAR(64)).
- `excuse_reason` (TEXT).
- **Unique Constraint:** `unique_session_student UNIQUE (session_id, student_id)` — strictly prevents double-recording.

### 2.8 `attendance_checkins`
Real-time atomic queue of student self-check-in submissions.
- `id` (VARCHAR(64), PRIMARY KEY).
- `session_id` (VARCHAR(64), NOT NULL, REFERENCES checkin_sessions(id) ON DELETE CASCADE).
- `student_id` (VARCHAR(64), NOT NULL, REFERENCES students(id) ON DELETE CASCADE).
- `student_number` (VARCHAR(32), NOT NULL).
- `student_name` (VARCHAR(128), NOT NULL).
- `course` (VARCHAR(16), NOT NULL).
- `status` (VARCHAR(16), NOT NULL): `'submitted'`, `'confirmed'`.
- `timestamp` (TIMESTAMPTZ, DEFAULT NOW()).
- `device_fingerprint` (VARCHAR(64)).
- **Unique Constraint:** `unique_checkin UNIQUE (session_id, student_id)`.

### 2.9 `invitations`
Single-use secure account generation tokens.
- `id` (VARCHAR(64), PRIMARY KEY).
- `student_id` (VARCHAR(64), NOT NULL, REFERENCES students(id) ON DELETE CASCADE).
- `student_number` (VARCHAR(32), NOT NULL).
- `course` (VARCHAR(16), NOT NULL).
- `token_hash` (VARCHAR(128), NOT NULL, UNIQUE).
- `is_redeemed` (BOOLEAN, DEFAULT FALSE).
- `redeemed_by` (VARCHAR(64)).
- `redeemed_at` (TIMESTAMPTZ).
- `expires_at` (TIMESTAMPTZ, NOT NULL).
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()).

### 2.10 `users`
Authenticated student and administrator accounts.
- `id` (VARCHAR(64), PRIMARY KEY).
- `username` (VARCHAR(64), NOT NULL, UNIQUE).
- `role` (VARCHAR(16), NOT NULL): `'student'`, `'admin'`, `'representative'`.
- `student_id` (VARCHAR(64), REFERENCES students(id)).
- `student_number` (VARCHAR(32)).
- `course` (VARCHAR(16)).
- `full_name` (VARCHAR(128), NOT NULL).
- `email` (VARCHAR(128)).
- `password_hash` (VARCHAR(128), NOT NULL).
- `is_active` (BOOLEAN, DEFAULT TRUE).
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()).

---

## 3. Migration Instructions
All migrations are located in `supabase/migrations/`:
1. `001_initial_schema.sql` — Schema definition, relationships, and unique constraints.
2. `002_rls_policies.sql` — Row Level Security rules isolating student profiles and safeguarding mutations.
3. `003_seed_data.sql` — Minimal 48-student roster, foundation timetable slots, modules, and admin bootstrap.

Execute via Supabase SQL Editor or Supabase CLI:
```bash
supabase db push
```

