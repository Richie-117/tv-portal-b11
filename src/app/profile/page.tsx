'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  LogOut,
  Info,
} from 'lucide-react';
import { calculateStudentAttendanceMetrics } from '@/lib/attendanceCalculations';

export default function ProfilePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar Month Navigation
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 10, 1)); // November 2026 default
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || !data.user) {
          router.push('/login');
        } else {
          setCurrentUser(data.user);
          // Fetch attendance data
          Promise.all([
            fetch('/api/admin/broadcast').then((r) => r.json()),
            fetch('/api/admin/attendance').then((r) => r.json()),
          ]).then(([sessData, attData]) => {
            if (sessData.success) setSessions(sessData.sessions || []);
            if (attData.success) setRecords(attData.records || []);
            setLoading(false);
          });
        }
      })
      .catch(() => {
        router.push('/login');
      });
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  // Compute metrics for logged in student
  const studentMetrics = useMemo(() => {
    if (!currentUser) return null;
    return calculateStudentAttendanceMetrics(
      {
        id: currentUser.studentId || currentUser.id,
        studentNumber: currentUser.studentNumber || '',
        course: currentUser.course,
      },
      sessions,
      records
    );
  }, [currentUser, sessions, records]);

  // Calendar Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedCalendarDate(null);
  };
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedCalendarDate(null);
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Generate days in month
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: null, dateStr: null });
    }
    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${year}-${mStr}-${dStr}`;
      days.push({ dayNumber: d, dateStr });
    }
    return days;
  }, [year, month]);

  // Date lookup for session details
  const sessionByDate = useMemo(() => {
    if (!studentMetrics) return new Map();
    const map = new Map<string, any[]>();
    studentMetrics.sessionDetails.forEach((item) => {
      const arr = map.get(item.date) || [];
      arr.push(item);
      map.set(item.date, arr);
    });
    return map;
  }, [studentMetrics]);

  const selectedDateSessions = useMemo(() => {
    if (!selectedCalendarDate) return [];
    return sessionByDate.get(selectedCalendarDate) || [];
  }, [selectedCalendarDate, sessionByDate]);

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-8rem)] cyber-grid px-4 py-12 flex justify-center items-center">
        <div className="font-mono text-xs text-slate-400 animate-pulse">
          Loading student profile telemetry...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-8rem)] cyber-grid px-4 py-6 sm:py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Profile Header HUD */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hud-box">
          <span className="hud-corner-tl" />
          <span className="hud-corner-tr" />
          <span className="hud-corner-bl" />
          <span className="hud-corner-br" />

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0088FF] to-[#004DB3] text-white flex items-center justify-center font-heading font-black text-xl shadow-md shadow-[#0088FF]/30">
              {currentUser.fullName ? currentUser.fullName.charAt(0) : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading font-black text-xl sm:text-2xl text-slate-900 tracking-tight">
                  {currentUser.fullName}
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                  ACTIVE
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-500 pt-0.5">
                <span className="text-[#0088FF]">{currentUser.studentNumber || 'Student User'}</span>
                <span>·</span>
                <span>{currentUser.course || 'Batch 11'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer touch-target"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Metrics Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm">
            <div className="text-[11px] font-mono font-bold text-slate-500 uppercase">
              ATTENDANCE RATE
            </div>
            <div className="font-heading font-black text-2xl text-slate-900">
              {studentMetrics?.formattedRate || '0%'}
            </div>
            <div className="text-[10px] font-mono text-emerald-600 font-bold">
              Strict Valid Finalized
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm">
            <div className="text-[11px] font-mono font-bold text-slate-500 uppercase">
              SESSIONS ATTENDED
            </div>
            <div className="font-heading font-black text-2xl text-emerald-600">
              {studentMetrics?.presentCount || 0}
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              Confirmed Present
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm">
            <div className="text-[11px] font-mono font-bold text-slate-500 uppercase">
              ABSENT SESSIONS
            </div>
            <div className="font-heading font-black text-2xl text-rose-600">
              {studentMetrics?.absentCount || 0}
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              Finalized Absences
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm">
            <div className="text-[11px] font-mono font-bold text-slate-500 uppercase">
              EXCUSED SESSIONS
            </div>
            <div className="font-heading font-black text-2xl text-amber-600">
              {studentMetrics?.excusedCount || 0}
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              Approved Exceptions
            </div>
          </div>
        </div>

        {/* Monthly Attendance Calendar Visualizer */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-heading font-black text-lg text-slate-900 tracking-tight">
                Monthly Attendance Calendar
              </h2>
              <p className="text-xs text-slate-500">
                Tap any calendar date to view module roll-call records
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 active:scale-95 transition-all touch-target"
                aria-label="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-xs font-bold text-slate-800 px-2 min-w-32 text-center">
                {monthName}
              </span>
              <button
                onClick={nextMonth}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 active:scale-95 transition-all touch-target"
                aria-label="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="space-y-2">
            <div className="grid grid-cols-7 gap-1 text-center font-mono text-[11px] font-bold text-slate-400 pb-1">
              <span>SUN</span>
              <span>MON</span>
              <span>TUE</span>
              <span>WED</span>
              <span>THU</span>
              <span>FRI</span>
              <span>SAT</span>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {calendarDays.map((cell, idx) => {
                if (!cell.dayNumber) {
                  return <div key={`empty-${idx}`} className="h-14 sm:h-16 rounded-xl bg-slate-50/50" />;
                }

                const daySessions = sessionByDate.get(cell.dateStr) || [];
                const isSelected = selectedCalendarDate === cell.dateStr;

                const hasPresent = daySessions.some((s: any) => s.status === 'present');
                const hasAbsent = daySessions.some((s: any) => s.status === 'absent');
                const hasExcused = daySessions.some((s: any) => s.status === 'excused');

                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    onClick={() => setSelectedCalendarDate(cell.dateStr)}
                    className={`h-14 sm:h-16 rounded-xl p-1.5 flex flex-col justify-between text-left transition-all relative border touch-target cursor-pointer ${
                      isSelected
                        ? 'border-[#0088FF] bg-blue-50/80 ring-2 ring-[#0088FF]/20 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="font-mono text-xs font-bold text-slate-800">
                      {cell.dayNumber}
                    </span>

                    {/* Status Dots */}
                    <div className="flex items-center gap-1">
                      {hasPresent && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Present" />}
                      {hasAbsent && <span className="w-2 h-2 rounded-full bg-rose-500" title="Absent" />}
                      {hasExcused && <span className="w-2 h-2 rounded-full bg-amber-500" title="Excused" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Details Drawer / Card */}
          {selectedCalendarDate && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-mono text-xs font-bold text-slate-800">
                  Lecture Details for {selectedCalendarDate}
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {selectedDateSessions.length} session(s) recorded
                </span>
              </div>

              {selectedDateSessions.length === 0 ? (
                <p className="text-xs text-slate-500 font-medium py-1">
                  No attendance session was conducted or scheduled on this date.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedDateSessions.map((sess: any, sIdx: number) => (
                    <div
                      key={sIdx}
                      className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-heading font-black text-slate-900">
                          {sess.moduleTitle}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {sess.moduleCode || 'LEC'} · {sess.sessionType}
                        </div>
                      </div>

                      <div>
                        {sess.status === 'present' ? (
                          <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-mono font-bold">
                            PRESENT ✓
                          </span>
                        ) : sess.status === 'absent' ? (
                          <span className="px-2.5 py-1 rounded-md bg-rose-100 text-rose-800 font-mono font-bold">
                            ABSENT ✗
                          </span>
                        ) : sess.status === 'excused' ? (
                          <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 font-mono font-bold">
                            EXCUSED
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-mono font-bold">
                            PENDING
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </main>
  );
}
