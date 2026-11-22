'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  Shield,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { calculateStudentAttendanceMetrics } from '@/lib/attendanceCalculations';
import { TimetableOverride, CourseScope } from '@/types';

export default function ProfilePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<TimetableOverride[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar Month Navigation — Locked to start at November 2026
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 10, 1)); // November 2026
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Admin Day State Manager (Available to Admin and Course Representatives)
  const [adminDayAction, setAdminDayAction] = useState<'holiday' | 'cancel' | 'postpone'>('holiday');
  const [adminDayScope, setAdminDayScope] = useState<CourseScope>('ALL');
  const [adminDayTitle, setAdminDayTitle] = useState('');
  const [adminDayReason, setAdminDayReason] = useState('');
  const [isSavingAdminDay, setIsSavingAdminDay] = useState(false);

  const fetchAllProfileData = async () => {
    try {
      const [sessRes, attRes, ovrRes] = await Promise.all([
        fetch('/api/admin/broadcast'),
        fetch('/api/admin/attendance'),
        fetch('/api/timetable/override'),
      ]);
      const [sessData, attData, ovrData] = await Promise.all([
        sessRes.json(),
        attRes.json(),
        ovrRes.json(),
      ]);
      if (sessData.success) setSessions(sessData.sessions || []);
      if (attData.success) setRecords(attData.records || []);
      if (ovrData.success) setOverrides(ovrData.overrides || []);
    } catch (err) {
      console.error('Failed to load profile data:', err);
    }
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || !data.user) {
          router.push('/login');
        } else {
          setCurrentUser(data.user);
          try {
            localStorage.setItem('tv_saved_user', JSON.stringify(data.user));
          } catch {}

          fetchAllProfileData().finally(() => setLoading(false));
        }
      })
      .catch(() => {
        router.push('/login');
      });
  }, [router]);

  const handleLogout = async () => {
    try {
      localStorage.removeItem('tv_saved_index');
      localStorage.removeItem('tv_saved_user');
    } catch {}
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  // Compute metrics for logged-in student
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

  // Strict Lock: Cannot go back prior to November 2026
  const isAtMinMonth = year === 2026 && month <= 10;

  const prevMonth = () => {
    if (isAtMinMonth) return;
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

  const selectedDateOverrides = useMemo(() => {
    if (!selectedCalendarDate) return [];
    return overrides.filter(
      (o) =>
        o.date === selectedCalendarDate &&
        (o.course === currentUser?.course || o.course === 'ALL' || !currentUser?.course)
    );
  }, [selectedCalendarDate, overrides, currentUser]);

  const handleSetAdminDayState = async () => {
    if (!selectedCalendarDate) return;
    setIsSavingAdminDay(true);
    try {
      const res = await fetch('/api/timetable/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course: adminDayScope,
          date: selectedCalendarDate,
          action: adminDayAction,
          subject:
            adminDayTitle.trim() ||
            (adminDayAction === 'holiday'
              ? 'Public / Academic Holiday'
              : adminDayAction === 'cancel'
              ? 'All Lectures Canceled'
              : 'Lectures Postponed'),
          reason: adminDayReason.trim() || undefined,
          updatedBy: currentUser?.fullName || 'Representative',
        }),
      });
      if (res.ok) {
        setAdminDayTitle('');
        setAdminDayReason('');
        await fetchAllProfileData();
        alert(`Date override saved successfully for ${selectedCalendarDate}`);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to set date override');
      }
    } catch {
      alert('Failed to set date override');
    } finally {
      setIsSavingAdminDay(false);
    }
  };

  const handleRemoveOverride = async (id: string) => {
    if (!confirm('Revert this date override? This will restore the date as a regular day.')) return;
    try {
      const res = await fetch(`/api/timetable/override?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchAllProfileData();
      } else {
        alert('Failed to remove override');
      }
    } catch {
      alert('Failed to remove override');
    }
  };

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-8rem)] cyber-grid px-4 py-12 flex justify-center items-center">
        <div className="font-mono text-xs text-slate-400 animate-pulse">
          Loading student profile telemetry...
        </div>
      </main>
    );
  }

  const isAdminOrRep =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'representative' ||
    currentUser?.isRepresentative;

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
                  {isAdminOrRep ? 'REPRESENTATIVE / ADMIN' : 'STUDENT ENROLLED'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-500 pt-0.5">
                <span className="text-[#0088FF]">{currentUser.studentNumber || currentUser.username}</span>
                <span>·</span>
                <span>{currentUser.course || 'Batch 11'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdminOrRep && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-bold transition-all active:scale-95 shadow-sm touch-target"
              >
                <Shield className="w-3.5 h-3.5 text-[#0088FF]" />
                <span>Admin Suite</span>
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer touch-target"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Metrics Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm">
            <div className="text-[11px] font-mono font-bold text-slate-500 uppercase">
              ATTENDANCE RATE
            </div>
            <div className="font-heading font-black text-2xl text-slate-900">
              {studentMetrics?.formattedRate || 'No attendance data'}
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

        {/* Monthly Attendance Calendar Visualizer (Locked to November 2026 onwards) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-black text-lg text-slate-900 tracking-tight">
                  Monthly Attendance Calendar
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#0088FF] border border-blue-200">
                  Nov 2026 Locked
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Official attendance tracking begins November 2026. Tap any calendar date to view module records.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                disabled={isAtMinMonth}
                title={isAtMinMonth ? 'Tracking starts November 2026' : 'Previous Month'}
                className={`p-2 rounded-xl border border-slate-200 transition-all touch-target ${
                  isAtMinMonth
                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-50'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 active:scale-95 cursor-pointer'
                }`}
                aria-label="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-xs font-bold text-slate-800 px-2 min-w-36 text-center">
                {monthName}
              </span>
              <button
                onClick={nextMonth}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 active:scale-95 transition-all touch-target cursor-pointer"
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

                const dayOverrides = overrides.filter(
                  (o) =>
                    o.date === cell.dateStr &&
                    (o.course === currentUser?.course || o.course === 'ALL' || !currentUser?.course)
                );
                const hasHoliday = dayOverrides.some((o) => o.action === 'holiday');
                const hasCanceled = dayOverrides.some((o) => o.action === 'cancel');
                const hasPostponed = dayOverrides.some((o) => o.action === 'postpone');

                const hasPresent = daySessions.some((s: any) => s.status === 'present');
                const hasAbsent = daySessions.some((s: any) => s.status === 'absent');
                const hasExcused = daySessions.some((s: any) => s.status === 'excused');

                let cellBgClass = 'border-slate-200 hover:border-slate-300 bg-white';
                let dayNumClass = 'text-slate-800';

                if (hasHoliday) {
                  cellBgClass = 'bg-purple-50/80 border-purple-300 hover:border-purple-400';
                  dayNumClass = 'text-purple-900 font-black';
                } else if (hasCanceled) {
                  cellBgClass = 'bg-rose-50/80 border-rose-300 hover:border-rose-400';
                  dayNumClass = 'text-rose-900 font-black';
                } else if (hasPostponed) {
                  cellBgClass = 'bg-amber-50/80 border-amber-300 hover:border-amber-400';
                  dayNumClass = 'text-amber-900 font-black';
                }

                if (isSelected) {
                  cellBgClass += ' ring-2 ring-[#0088FF] shadow-sm';
                }

                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    onClick={() => setSelectedCalendarDate(cell.dateStr)}
                    className={`h-14 sm:h-16 rounded-xl p-1.5 flex flex-col justify-between text-left transition-all relative border touch-target cursor-pointer ${cellBgClass}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`font-mono text-xs font-bold ${dayNumClass}`}>
                        {cell.dayNumber}
                      </span>
                      {hasHoliday && (
                        <span className="hidden sm:inline-block px-1 py-0.2 rounded text-[7px] font-mono font-black bg-purple-100 text-purple-800 border border-purple-200 uppercase">
                          HOLIDAY
                        </span>
                      )}
                      {hasCanceled && !hasHoliday && (
                        <span className="hidden sm:inline-block px-1 py-0.2 rounded text-[7px] font-mono font-black bg-rose-100 text-rose-800 border border-rose-200 uppercase">
                          CANCELED
                        </span>
                      )}
                    </div>

                    {/* Status Badges & Dots */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {hasHoliday && (
                        <span className="w-2 h-2 rounded-full bg-purple-500 sm:hidden" title="Holiday" />
                      )}
                      {hasCanceled && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 sm:hidden" title="Lectures Canceled" />
                      )}
                      {hasPresent && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Present" />}
                      {hasAbsent && <span className="w-2 h-2 rounded-full bg-rose-500" title="Absent" />}
                      {hasExcused && <span className="w-2 h-2 rounded-full bg-amber-500" title="Excused" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Calendar Status Legend */}
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-[11px] font-mono text-slate-500 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Present</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Absent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Excused</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-purple-100 border border-purple-300" />
                <span className="text-purple-700 font-bold">Holiday / Off Day</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-rose-100 border border-rose-300" />
                <span className="text-rose-700 font-bold">Lectures Canceled</span>
              </div>
            </div>
          </div>

          {/* Date Details Drawer / Card */}
          {selectedCalendarDate && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-[#0088FF]" />
                  <span className="font-mono text-xs font-bold text-slate-800">
                    Date Details & Schedule for {selectedCalendarDate}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCalendarDate(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
                  aria-label="Close"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              {/* Active Overrides for this Date */}
              {selectedDateOverrides.length > 0 && (
                <div className="space-y-2">
                  {selectedDateOverrides.map((ovr) => (
                    <div
                      key={ovr.id}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        ovr.action === 'holiday'
                          ? 'bg-purple-100/70 border-purple-300 text-purple-900'
                          : ovr.action === 'cancel'
                          ? 'bg-rose-100/70 border-rose-300 text-rose-900'
                          : 'bg-amber-100/70 border-amber-300 text-amber-900'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-white/90 border shadow-xs">
                            {ovr.action === 'holiday'
                              ? '🌴 Academic / Public Holiday'
                              : ovr.action === 'cancel'
                              ? '🛑 Lectures Canceled'
                              : '⚠️ Lectures Postponed'}
                          </span>
                          <span className="font-heading font-black text-xs">{ovr.subject}</span>
                          <span className="text-[10px] font-mono opacity-80">({ovr.course})</span>
                        </div>
                        {ovr.reason && (
                          <p className="text-xs font-medium pl-1 text-slate-700">
                            Note: {ovr.reason}
                          </p>
                        )}
                      </div>

                      {isAdminOrRep && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOverride(ovr.id)}
                          className="self-end sm:self-center px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-mono font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Revert</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Admin Date Override Manager (Shown if Admin or Representative) */}
              {isAdminOrRep && (
                <div className="bg-white border border-blue-200 rounded-xl p-3.5 space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#0088FF]" />
                      <span>Representative / Admin Date Control</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Syncs to all student calendar profiles
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-slate-600 uppercase mb-1">
                        Status Type
                      </label>
                      <select
                        value={adminDayAction}
                        onChange={(e) => setAdminDayAction(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-slate-50"
                      >
                        <option value="holiday">🌴 Public / Academic Holiday</option>
                        <option value="cancel">🛑 All Lectures Canceled</option>
                        <option value="postpone">⚠️ Lectures Postponed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-bold text-slate-600 uppercase mb-1">
                        Course Scope
                      </label>
                      <select
                        value={adminDayScope}
                        onChange={(e) => setAdminDayScope(e.target.value as CourseScope)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-slate-50"
                      >
                        <option value="ALL">All TV Studies (Both Courses)</option>
                        <option value="TPOPT">TPOPT Only</option>
                        <option value="TPRPT">TPRPT Only</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-bold text-slate-600 uppercase mb-1">
                        Title / Notice
                      </label>
                      <input
                        type="text"
                        value={adminDayTitle}
                        onChange={(e) => setAdminDayTitle(e.target.value)}
                        placeholder={adminDayAction === 'holiday' ? 'e.g. Public Holiday' : 'e.g. All Lectures Canceled'}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleSetAdminDayState}
                        disabled={isSavingAdminDay}
                        className="w-full py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-mono text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        {isSavingAdminDay ? 'Saving...' : 'Set Date State'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Attendance Session Roll-Call Details */}
              <div className="space-y-2">
                <span className="font-mono text-[11px] font-bold text-slate-600 uppercase">
                  Roll-Call Sessions ({selectedDateSessions.length})
                </span>

                {selectedDateSessions.length === 0 ? (
                  <p className="text-xs text-slate-500 font-medium py-1">
                    No attendance session roll-calls recorded on this date.
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
            </div>
          )}

        </div>

      </div>
    </main>
  );
}
