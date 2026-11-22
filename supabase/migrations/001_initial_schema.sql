-- =============================================================================
-- TV B11 Mobile-First Academic Portal — Migration 001: Initial Schema
-- Target: Supabase PostgreSQL
-- Timezone: Asia/Colombo
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Courses
CREATE TABLE IF NOT EXISTS public.courses (
    id VARCHAR(16) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Students (Minimal Privacy Footprint)
CREATE TABLE IF NOT EXISTS public.students (
    id VARCHAR(64) PRIMARY KEY,
    student_number VARCHAR(32) NOT NULL UNIQUE,
    index_suffix VARCHAR(4) NOT NULL,
    full_name VARCHAR(128) NOT NULL,
    course VARCHAR(16) NOT NULL REFERENCES public.courses(id) ON UPDATE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_course_suffix ON public.students(course, index_suffix);
CREATE INDEX IF NOT EXISTS idx_students_number ON public.students(student_number);

-- 3. Academic Modules
CREATE TABLE IF NOT EXISTS public.academic_modules (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    title VARCHAR(128) NOT NULL,
    course_scope VARCHAR(16) NOT NULL, -- 'TPOPT', 'TPRPT', 'ALL'
    stage VARCHAR(32) DEFAULT 'Foundation',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Timetable Entries
CREATE TABLE IF NOT EXISTS public.timetable_entries (
    id VARCHAR(64) PRIMARY KEY,
    course VARCHAR(16) NOT NULL,
    day_of_week VARCHAR(16) NOT NULL,
    start_time VARCHAR(8) NOT NULL,
    end_time VARCHAR(8) NOT NULL,
    subject VARCHAR(128) NOT NULL,
    module_code VARCHAR(32),
    student_group VARCHAR(64),
    slot_type VARCHAR(16) NOT NULL, -- 'class', 'break', 'lunch', 'empty'
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_time_order CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_timetable_lookup ON public.timetable_entries(course, day_of_week, start_time);

-- 5. Lecture Overrides
CREATE TABLE IF NOT EXISTS public.lecture_overrides (
    id VARCHAR(64) PRIMARY KEY,
    course VARCHAR(16) NOT NULL,
    date DATE NOT NULL,
    slot_id VARCHAR(64) REFERENCES public.timetable_entries(id) ON DELETE SET NULL,
    action VARCHAR(16) NOT NULL, -- 'cancel', 'postpone', 'reschedule'
    subject VARCHAR(128) NOT NULL,
    reason TEXT,
    new_date DATE,
    new_start_time VARCHAR(8),
    new_end_time VARCHAR(8),
    updated_by VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_overrides_date ON public.lecture_overrides(date, course);

-- 6. Check-in Broadcast Sessions
CREATE TABLE IF NOT EXISTS public.checkin_sessions (
    id VARCHAR(64) PRIMARY KEY,
    course VARCHAR(16) NOT NULL, -- 'TPOPT', 'TPRPT', 'ALL'
    module_id VARCHAR(64) NOT NULL,
    module_code VARCHAR(32) NOT NULL,
    module_title VARCHAR(128) NOT NULL,
    session_type VARCHAR(16) NOT NULL DEFAULT 'lecture',
    date DATE NOT NULL,
    start_time VARCHAR(8) NOT NULL,
    end_time VARCHAR(8) NOT NULL,
    checkin_status VARCHAR(16) NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'closed', 'expired', 'finalized'
    session_status VARCHAR(16) NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'active', 'cancelled', 'postponed', 'completed'
    checkin_window_minutes INTEGER NOT NULL DEFAULT 30,
    checkin_opened_at TIMESTAMPTZ,
    checkin_expires_at TIMESTAMPTZ,
    notes TEXT,
    created_by VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_active ON public.checkin_sessions(checkin_status, date);

-- 7. Attendance Records (Official Roll-Call)
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL REFERENCES public.checkin_sessions(id) ON DELETE CASCADE,
    student_id VARCHAR(64) NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    student_number VARCHAR(32) NOT NULL,
    student_name VARCHAR(128) NOT NULL,
    course VARCHAR(16) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'present', -- 'present', 'absent', 'excused', 'pending'
    submission_source VARCHAR(16) NOT NULL DEFAULT 'self_checkin', -- 'self_checkin', 'admin_manual', 'finalized'
    marked_at TIMESTAMPTZ DEFAULT NOW(),
    marked_by VARCHAR(64),
    excuse_reason TEXT,
    CONSTRAINT unique_session_student UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_records_session ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_records_student ON public.attendance_records(student_id);

-- 8. Attendance Check-ins (Submissions Stream)
CREATE TABLE IF NOT EXISTS public.attendance_checkins (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL REFERENCES public.checkin_sessions(id) ON DELETE CASCADE,
    student_id VARCHAR(64) NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    student_number VARCHAR(32) NOT NULL,
    student_name VARCHAR(128) NOT NULL,
    course VARCHAR(16) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'confirmed',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    device_fingerprint VARCHAR(64),
    CONSTRAINT unique_checkin_session_student UNIQUE (session_id, student_id)
);

-- 9. Single-Use Invitations
CREATE TABLE IF NOT EXISTS public.invitations (
    id VARCHAR(64) PRIMARY KEY,
    student_id VARCHAR(64) NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    student_number VARCHAR(32) NOT NULL,
    course VARCHAR(16) NOT NULL,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    is_redeemed BOOLEAN DEFAULT FALSE,
    redeemed_by VARCHAR(64),
    redeemed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. User Accounts
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    role VARCHAR(16) NOT NULL DEFAULT 'student', -- 'student', 'admin', 'representative'
    student_id VARCHAR(64) REFERENCES public.students(id) ON DELETE SET NULL,
    student_number VARCHAR(32),
    course VARCHAR(16),
    full_name VARCHAR(128) NOT NULL,
    email VARCHAR(128),
    password_hash VARCHAR(128) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

