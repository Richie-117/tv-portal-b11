-- =============================================================================
-- TV B11 Mobile-First Academic Portal — Migration 002: Row Level Security (RLS)
-- Target: Supabase PostgreSQL
-- =============================================================================

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 1. Public Read Policies
CREATE POLICY "Public can view courses" ON public.courses
    FOR SELECT TO public USING (true);

CREATE POLICY "Public can view active modules" ON public.academic_modules
    FOR SELECT TO public USING (is_active = true);

CREATE POLICY "Public can view timetable entries" ON public.timetable_entries
    FOR SELECT TO public USING (true);

CREATE POLICY "Public can view lecture overrides" ON public.lecture_overrides
    FOR SELECT TO public USING (true);

CREATE POLICY "Public can view checkin sessions" ON public.checkin_sessions
    FOR SELECT TO public USING (checkin_status IN ('active', 'closed', 'finalized'));

-- 2. Student Minimal Verification (Read-Only for index suffix lookup)
CREATE POLICY "Public can lookup student minimal info for checkin" ON public.students
    FOR SELECT TO public USING (is_active = true);

-- 3. Check-in Submissions (Allowed for anyone while session is active)
CREATE POLICY "Public can submit check-in to active session" ON public.attendance_checkins
    FOR INSERT TO public WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.checkin_sessions
            WHERE id = session_id AND checkin_status = 'active'
              AND (checkin_expires_at IS NULL OR checkin_expires_at > NOW())
        )
    );

CREATE POLICY "Public can read own session checkins" ON public.attendance_checkins
    FOR SELECT TO public USING (true);

-- 4. Attendance Records
-- Public can view confirmed present counts
CREATE POLICY "Public can read session attendance records" ON public.attendance_records
    FOR SELECT TO public USING (true);

-- 5. Admin / Service Role Overrides
-- Supabase service_role bypasses RLS automatically.
-- For authenticated admins:
CREATE POLICY "Admins have full access to checkin_sessions" ON public.checkin_sessions
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Admins have full access to attendance_records" ON public.attendance_records
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Admins have full access to timetable_entries" ON public.timetable_entries
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Admins have full access to lecture_overrides" ON public.lecture_overrides
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Admins have full access to invitations" ON public.invitations
    FOR ALL TO authenticated USING (true);

