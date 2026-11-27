'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Radio,
  Plus,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Save,
  FileDown,
  FileSpreadsheet,
  X,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  CheckSquare,
  Users,
  Calendar as CalendarIcon,
  User,
  Shield,
  Info,
  Trash2,
} from 'lucide-react';
import { CheckinSession, CourseScope, AttendanceStatus, TimetableOverride } from '@/types';
import { calculateStudentAttendanceMetrics } from '@/lib/attendanceCalculations';

export default function AdminAttendancePage() {
  const router = useRouter();

  // Top-level View Mode: 'sessions' | 'inspector'
  const [viewMode, setViewMode] = useState<'sessions' | 'inspector'>('sessions');

  const [sessions, setSessions] = useState<CheckinSession[]>([]);
  const [allRecords, setAllRecords] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<TimetableOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Admin Day State Manager (Mark day as Canceled or Holiday)
  const [adminDayAction, setAdminDayAction] = useState<'holiday' | 'cancel' | 'postpone'>('holiday');
  const [adminDayScope, setAdminDayScope] = useState<CourseScope>('ALL');
  const [adminDayTitle, setAdminDayTitle] = useState('');
  const [adminDayReason, setAdminDayReason] = useState('');
  const [isSavingAdminDay, setIsSavingAdminDay] = useState(false);

  // Broadcast Modal State
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastCourse, setBroadcastCourse] = useState<CourseScope>('ALL');
  const [broadcastModuleId, setBroadcastModuleId] = useState('sub-ict');
  const [broadcastDate, setBroadcastDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [broadcastStartTime, setBroadcastStartTime] = useState('08:30');
  const [broadcastEndTime, setBroadcastEndTime] = useState('16:30');
  const [broadcastNotes, setBroadcastNotes] = useState('');
  const [isPushing, setIsPushing] = useState(false);

  // Editor Session State
  const [activeEditorSession, setActiveEditorSession] = useState<CheckinSession | null>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus>>({});
  const [excuseMap, setExcuseMap] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Finalize Confirmation Modal
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const isSavingRef = useRef(false);
  const isFinalizingRef = useRef(false);
  isSavingRef.current = isSaving;
  isFinalizingRef.current = isFinalizing;

  // Broadcast Course Filter: 'ALL' | 'COMMON' | 'TPOPT' | 'TPRPT'
  const [broadcastCourseFilter, setBroadcastCourseFilter] = useState<'ALL' | 'COMMON' | 'TPOPT' | 'TPRPT'>('ALL');

  // Student Attendance Inspector State
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [inspectorSearch, setInspectorSearch] = useState('');
  const [inspectorCourse, setInspectorCourse] = useState<'ALL' | 'TPOPT' | 'TPRPT'>('ALL');

  // Inspector Calendar Navigation (Strictly locked to November 2026 onwards)
  const [calendarDate, setCalendarDate] = useState(() => new Date(2026, 10, 1)); // November 2026
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  const fetchAllData = async (showIndicator = true) => {
    if (showIndicator) setIsRefreshing(true);
    try {
      const [sessRes, recRes, stuRes, ovrRes] = await Promise.all([
        fetch('/api/admin/broadcast', { cache: 'no-store' }),
        fetch('/api/admin/attendance', { cache: 'no-store' }),
        fetch('/api/admin/invites', { cache: 'no-store' }),
        fetch('/api/timetable/override', { cache: 'no-store' }),
      ]);
      const [sessData, recData, stuData, ovrData] = await Promise.all([
        sessRes.json(),
        recRes.json(),
        stuRes.json(),
        ovrRes.json(),
      ]);

      if (sessData.success) setSessions(sessData.sessions || []);
      if (recData.success) setAllRecords(recData.records || []);
      if (ovrData.success) setOverrides(ovrData.overrides || []);
      if (stuData.success) {
        const stuList = stuData.students || [];
        setStudents(stuList);
        if (stuList.length > 0) {
          setSelectedStudentId((prev) =>
            prev && stuList.some((s: any) => s.id === prev) ? prev : stuList[0].id
          );
        }
      }
    } catch (err) {
      console.error('Failed to load attendance data:', err);
    } finally {
      if (showIndicator) {
        setLoading(false);
        setTimeout(() => setIsRefreshing(false), 300);
      }
    }
  };

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
          updatedBy: 'Admin',
        }),
      });
      if (res.ok) {
        setAdminDayTitle('');
        setAdminDayReason('');
        await fetchAllData();
        alert(`Date override saved: ${selectedCalendarDate} marked as ${adminDayAction.toUpperCase()}`);
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
    if (!confirm('Revert this date override? This will restore the date as a regular day for all users.')) return;
    try {
      const res = await fetch(`/api/timetable/override?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchAllData();
      } else {
        alert('Failed to remove override');
      }
    } catch {
      alert('Failed to remove override');
    }
  };

  useEffect(() => {
    fetchAllData();
    setModules([
      { id: 'sub-english', code: 'ENGLISH', title: 'English' },
      { id: 'sub-dm7', code: 'DM7', title: 'DM7 — Digital Media Fundamentals' },
      { id: 'sub-dm10', code: 'DM10', title: 'DM10 — Television Technology' },
      { id: 'sub-ict', code: 'ICT', title: 'ICT — Information & Communication' },
      { id: 'sub-gaffer', code: 'GAFFER', title: 'Gaffer & Studio Lighting' },
      { id: 'sub-maths', code: 'MATHS', title: 'Applied Mathematics' },
      { id: 'sub-drawing', code: 'ENG-DRAW', title: 'Engineering Drawing' },
      { id: 'sub-physics', code: 'NVQ-PHYS', title: 'NVQ Applied Physics I & II' },
      { id: 'sub-graphic', code: 'CGD', title: 'Computer Graphic Design' },
      { id: 'sub-osh', code: 'OSH', title: 'Occupational Safety & Health' },
    ]);

    // Live Telemetry Auto-Poll: Silently refresh records every 4s so student submissions update live
    const interval = setInterval(() => {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible' &&
        !isSavingRef.current &&
        !isFinalizingRef.current
      ) {
        fetchAllData(false);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const openSessionEditor = async (session: CheckinSession) => {
    setActiveEditorSession(session);
    setSearchTerm('');
    setSaveFeedback(null);
    try {
      const res = await fetch(`/api/admin/attendance?sessionId=${session.id}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        if (data.session) setActiveEditorSession(data.session);
        setRoster(data.roster || []);
        const sMap: Record<string, AttendanceStatus> = {};
        const eMap: Record<string, string> = {};
        (data.roster || []).forEach((item: any) => {
          sMap[item.studentId] = item.status;
          if (item.excuseReason) eMap[item.studentId] = item.excuseReason;
        });
        setStatusMap(sMap);
        setExcuseMap(eMap);
      }
    } catch (err) {
      console.error('Failed to load session roster:', err);
    }
  };

  const handlePushBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPushing(true);
    const mod = modules.find((m) => m.id === broadcastModuleId);

    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course: broadcastCourse,
          moduleId: broadcastModuleId,
          moduleCode: mod?.code || 'LEC',
          moduleTitle: mod?.title || 'Academic Session',
          sessionType: 'lecture',
          date: broadcastDate,
          startTime: broadcastStartTime,
          endTime: broadcastEndTime,
          notes: broadcastNotes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowBroadcastModal(false);
        await fetchAllData();
        if (data.session) openSessionEditor(data.session);
      } else {
        alert(data.error || 'Failed to push check-in broadcast');
      }
    } catch {
      alert('Failed to push check-in broadcast');
    } finally {
      setIsPushing(false);
    }
  };

  const handleCloseSessionEarly = async (sessionId: string) => {
    if (!confirm('Close this check-in window? Students will no longer be able to self-check in.')) return;
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, status: 'closed' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to close check-in window');
        return;
      }
      await fetchAllData();
      if (activeEditorSession?.id === sessionId) {
        setActiveEditorSession((prev) =>
          data.session ? data.session : prev ? { ...prev, checkinStatus: 'closed' } : null
        );
      }
    } catch {
      alert('Failed to close check-in window');
    }
  };

  const handleReopenSession = async (sessionId: string) => {
    if (!confirm('Reopen this check-in window? Students will be able to submit check-in again until you close it.')) return;
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, status: 'active' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to reopen check-in window');
        return;
      }
      await fetchAllData();
      if (activeEditorSession?.id === sessionId) {
        setActiveEditorSession((prev) =>
          data.session
            ? data.session
            : prev
            ? { ...prev, checkinStatus: 'active', sessionStatus: 'active', checkinExpiresAt: undefined }
            : null
        );
      }
    } catch {
      alert('Failed to reopen check-in window');
    }
  };

  const handleDeleteSession = async (sessionId: string, title?: string) => {
    if (
      !confirm(
        `Delete attendance record for "${title || 'this session'}"?\n\nThis will permanently remove this session card and any student roll-call records marked for it.`
      )
    )
      return;

    try {
      const res = await fetch(`/api/admin/broadcast?sessionId=${sessionId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        if (activeEditorSession?.id === sessionId) {
          setActiveEditorSession(null);
        }
        await fetchAllData();
      } else {
        alert(data.error || 'Failed to delete broadcast record');
      }
    } catch {
      alert('Failed to delete broadcast record');
    }
  };

  const handleSaveRoster = async (closeWindowAfterSave = false) => {
    if (!activeEditorSession) return;
    setIsSaving(true);
    setSaveFeedback(null);

    try {
      const updates = roster
        .filter((student) => {
          const newStatus = statusMap[student.studentId] || student.status;
          const newExcuse = (excuseMap[student.studentId] || '').trim();
          const oldExcuse = (student.excuseReason || '').trim();
          return newStatus !== student.status || newExcuse !== oldExcuse;
        })
        .map((student) => ({
          studentId: student.studentId,
          status: statusMap[student.studentId] || student.status,
          excuseReason: (excuseMap[student.studentId] || '').trim(),
        }));

      if (updates.length > 0) {
        const saveRes = await fetch('/api/admin/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: activeEditorSession.id,
            updates,
          }),
        });
        const saveData = await saveRes.json();
        if (!saveRes.ok || !saveData.success) {
          throw new Error(saveData.error || 'Failed to save attendance updates');
        }
      }

      if (closeWindowAfterSave) {
        const closeRes = await fetch('/api/admin/broadcast', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: activeEditorSession.id, status: 'closed' }),
        });
        const closeData = await closeRes.json();
        if (!closeRes.ok || !closeData.success) {
          throw new Error(closeData.error || 'Saved attendance, but failed to close check-in window');
        }
        setActiveEditorSession((prev) =>
          closeData.session ? closeData.session : prev ? { ...prev, checkinStatus: 'closed' } : null
        );
        setSaveFeedback('Session saved & check-in window successfully closed!');
      } else {
        setSaveFeedback(
          updates.length > 0
            ? `Saved ${updates.length} student update${updates.length === 1 ? '' : 's'} to database!`
            : 'No changes to save — attendance is up to date.'
        );
      }

      await openSessionEditor(activeEditorSession);
      await fetchAllData();
    } catch (err: any) {
      setSaveFeedback(`Error: ${err?.message || 'Failed saving updates'}`);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveFeedback(null), 4000);
    }
  };

  const handleFinalizeAttendance = async () => {
    if (!activeEditorSession) return;
    setIsFinalizing(true);
    try {
      const res = await fetch('/api/admin/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeEditorSession.id }),
      });
      const data = await res.json();
      if (data.success) {
        setShowFinalizeModal(false);
        await fetchAllData();
        await openSessionEditor(activeEditorSession);
      }
    } catch {
      alert('Failed to finalize attendance');
    } finally {
      setIsFinalizing(false);
    }
  };

  // Calculate real-time submission statistics for any session card
  const getSessionSubmissionStats = (sess: CheckinSession) => {
    const sessionRecords = allRecords.filter((r) => r.sessionId === sess.id);
    const presentRecords = sessionRecords.filter((r) => r.status === 'present');
    const excusedRecords = sessionRecords.filter((r) => r.status === 'excused');
    const absentRecords = sessionRecords.filter((r) => r.status === 'absent');

    const tpoptStudents = students.filter((s) => s.course === 'TPOPT');
    const tprptStudents = students.filter((s) => s.course === 'TPRPT');
    const totalTpopt = tpoptStudents.length || 26;
    const totalTprpt = tprptStudents.length || 22;

    const tpoptPresent = presentRecords.filter((r) => r.course === 'TPOPT').length;
    const tprptPresent = presentRecords.filter((r) => r.course === 'TPRPT').length;

    let totalEligible = totalTpopt + totalTprpt;
    let submittedCount = presentRecords.length;

    if (sess.course === 'TPOPT') {
      totalEligible = totalTpopt;
      submittedCount = tpoptPresent;
    } else if (sess.course === 'TPRPT') {
      totalEligible = totalTprpt;
      submittedCount = tprptPresent;
    }

    const percentage = totalEligible > 0 ? Math.round((submittedCount / totalEligible) * 100) : 0;

    return {
      submittedCount,
      totalEligible,
      percentage,
      excusedCount: excusedRecords.length,
      absentCount: absentRecords.length,
      isCommon: sess.course === 'ALL',
      tpopt: { submitted: tpoptPresent, total: totalTpopt },
      tprpt: { submitted: tprptPresent, total: totalTprpt },
    };
  };

  // Filtered broadcast sessions by Course Tab (ALL, COMMON, TPOPT, TPRPT)
  const filteredBroadcastSessions = useMemo(() => {
    if (broadcastCourseFilter === 'ALL') return sessions;
    if (broadcastCourseFilter === 'COMMON') return sessions.filter((s) => s.course === 'ALL');
    return sessions.filter((s) => s.course === broadcastCourseFilter);
  }, [sessions, broadcastCourseFilter]);

  // Filter roster by search
  const filteredRoster = useMemo(() => {
    if (!searchTerm) return roster;
    const term = searchTerm.toLowerCase();
    return roster.filter(
      (s) =>
        s.fullName.toLowerCase().includes(term) ||
        s.studentNumber.toLowerCase().includes(term) ||
        s.indexSuffix.includes(term)
    );
  }, [roster, searchTerm]);

  const pendingCount = useMemo(() => {
    return roster.filter((s) => statusMap[s.studentId] === 'pending').length;
  }, [roster, statusMap]);

  // Selected Student for Inspector
  const selectedStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || students[0] || null;
  }, [students, selectedStudentId]);

  // Filtered Students list for Inspector selection
  const filteredStudentsForInspector = useMemo(() => {
    return students.filter((s) => {
      if (inspectorCourse !== 'ALL' && s.course !== inspectorCourse) return false;
      if (inspectorSearch.trim()) {
        const query = inspectorSearch.toLowerCase().trim();
        const matchName = s.fullName.toLowerCase().includes(query);
        const matchNum = s.studentNumber.toLowerCase().includes(query);
        const matchSuffix = s.indexSuffix?.toLowerCase().includes(query);
        return matchName || matchNum || matchSuffix;
      }
      return true;
    });
  }, [students, inspectorCourse, inspectorSearch]);

  // Inspector Student Metrics
  const inspectedStudentMetrics = useMemo(() => {
    if (!selectedStudent) return null;
    return calculateStudentAttendanceMetrics(
      {
        id: selectedStudent.id,
        studentNumber: selectedStudent.studentNumber,
        course: selectedStudent.course,
      },
      sessions,
      allRecords
    );
  }, [selectedStudent, sessions, allRecords]);

  // Inspector Calendar Navigation (Strictly locked to November 2026 onwards)
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const isAtMinMonth = calYear === 2026 && calMonth <= 10;

  const prevMonth = () => {
    if (isAtMinMonth) return;
    setCalendarDate(new Date(calYear, calMonth - 1, 1));
    setSelectedCalendarDate(null);
  };

  const nextMonth = () => {
    setCalendarDate(new Date(calYear, calMonth + 1, 1));
    setSelectedCalendarDate(null);
  };

  const calMonthName = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
    const totalDays = new Date(calYear, calMonth + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: null, dateStr: null });
    }
    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(calMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${calYear}-${mStr}-${dStr}`;
      days.push({ dayNumber: d, dateStr });
    }
    return days;
  }, [calYear, calMonth]);

  // Date sessions map for inspector
  const dateSessionsMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    if (!inspectedStudentMetrics?.sessionDetails) return map;

    inspectedStudentMetrics.sessionDetails.forEach((sess) => {
      if (!map[sess.date]) map[sess.date] = [];
      map[sess.date].push(sess);
    });
    return map;
  }, [inspectedStudentMetrics]);

  return (
    <main className="min-h-[calc(100vh-8rem)] cyber-grid px-4 py-6 sm:py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Navigation & View Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-xs font-mono font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Admin Suite</span>
            </Link>

            {/* View Switcher Pills */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm flex-1 sm:flex-initial justify-center">
              <button
                onClick={() => {
                  setViewMode('sessions');
                  setActiveEditorSession(null);
                }}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  viewMode === 'sessions'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Broadcasts</span>
              </button>
              <button
                onClick={() => setViewMode('inspector')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  viewMode === 'inspector'
                    ? 'bg-[#0088FF] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Student Inspector</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => fetchAllData()}
              className="p-2 text-slate-400 hover:text-[#0088FF] rounded-xl hover:bg-slate-50 bg-white border border-slate-200"
              title="Refresh attendance records"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {viewMode === 'sessions' && !activeEditorSession && (
              <button
                onClick={() => setShowBroadcastModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0088FF] hover:bg-[#0055CC] text-white text-xs font-heading font-black tracking-wider uppercase shadow-md shadow-[#0088FF]/30 active:scale-95 transition-all cursor-pointer touch-target"
              >
                <Plus className="w-4 h-4" />
                <span>New Check-in Record</span>
              </button>
            )}
          </div>
        </div>

        {/* VIEW 1: SESSIONS & BROADCASTS */}
        {viewMode === 'sessions' && (
          <>
            {!activeEditorSession ? (
              /* Broadcasts Overview */
              <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-8 shadow-sm space-y-6 hud-box overflow-hidden">
                <span className="hud-corner-tl" />
                <span className="hud-corner-tr" />
                <span className="hud-corner-bl" />
                <span className="hud-corner-br" />

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="min-w-0">
                    <h1 className="font-heading font-black text-xl text-slate-900 tracking-tight">
                      Attendance Roll-Call Broadcasts
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">
                      Live student check-in telemetry and submitted roll-call rates
                    </p>
                  </div>

                  {/* Course Filter Tabs */}
                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200 w-full lg:w-auto">
                    {[
                      { key: 'ALL', label: 'All Broadcasts' },
                      { key: 'COMMON', label: 'Common (Both)' },
                      { key: 'TPOPT', label: 'TPOPT' },
                      { key: 'TPRPT', label: 'TPRPT' },
                    ].map((tab) => {
                      const count =
                        tab.key === 'ALL'
                          ? sessions.length
                          : tab.key === 'COMMON'
                          ? sessions.filter((s) => s.course === 'ALL').length
                          : sessions.filter((s) => s.course === tab.key).length;
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setBroadcastCourseFilter(tab.key as any)}
                          className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                            broadcastCourseFilter === tab.key
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            broadcastCourseFilter === tab.key ? 'bg-slate-100 text-slate-900' : 'bg-slate-200/60 text-slate-500'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-slate-400 font-mono text-xs animate-pulse">
                    Loading session broadcasts and student telemetry...
                  </div>
                ) : filteredBroadcastSessions.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <Radio className="w-12 h-12 mx-auto text-slate-300" />
                    <p className="font-heading font-bold text-base text-slate-700">
                      No attendance sessions found
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      {broadcastCourseFilter !== 'ALL'
                        ? `No broadcasts found for ${broadcastCourseFilter}. Click "New Check-in Record" to create one.`
                        : 'Click "New Check-in Record" to open a live check-in broadcast for TPOPT or TPRPT.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredBroadcastSessions.map((sess) => {
                      const stats = getSessionSubmissionStats(sess);

                      return (
                        <div
                          key={sess.id}
                          className="border border-slate-200 rounded-2xl p-4 sm:p-5 hover:border-blue-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white"
                        >
                          <div className="space-y-2.5 flex-1">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase ${
                                  sess.checkinStatus === 'active'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse'
                                    : sess.checkinStatus === 'finalized'
                                    ? 'bg-blue-100 text-[#0088FF] border border-blue-200'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {sess.checkinStatus}
                                </span>
                                <span className="font-mono text-[11px] font-bold text-slate-500">
                                  {sess.date} · {sess.startTime} – {sess.endTime}
                                </span>
                                {sess.checkinStatus === 'active' && (
                                  <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                    Live Submitting
                                  </span>
                                )}
                              </div>

                              <h3 className="font-heading font-black text-lg text-slate-900 leading-tight">
                                {sess.moduleTitle}
                              </h3>

                              <div className="text-xs font-mono text-slate-500 font-semibold">
                                Scope: <span className="text-slate-800">{sess.course === 'ALL' ? 'COMMON (Both Courses)' : sess.course}</span> · Window: {sess.checkinStatus === 'active' || !sess.checkinWindowMinutes ? 'Manual (Open until closed)' : `${sess.checkinWindowMinutes} mins`}
                              </div>
                            </div>

                            {/* Submitted Count & Filtered Course Breakdown on Card Surface */}
                            <div className="pt-2 border-t border-slate-100 space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* Submitted Count Pill */}
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white font-mono text-xs font-bold shadow-sm">
                                    <Users className="w-3.5 h-3.5 text-[#0088FF]" />
                                    <span>Submitted:</span>
                                    <span className="text-emerald-400 font-black text-sm">
                                      {stats.submittedCount} / {stats.totalEligible}
                                    </span>
                                  </span>

                                  {/* Percentage Badge */}
                                  <span className="font-mono text-xs font-black text-[#0088FF] bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-xl">
                                    {stats.percentage}%
                                  </span>
                                </div>

                                {/* Common / Individual Course Filtered Breakdown */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {stats.isCommon ? (
                                    <>
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-orange-50 text-[#FF7900] border border-orange-200 font-mono text-[11px] font-bold">
                                        <span>TPOPT:</span>
                                        <span className="font-black">{stats.tpopt.submitted} / {stats.tpopt.total}</span>
                                      </span>
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 text-[#0088FF] border border-blue-200 font-mono text-[11px] font-bold">
                                        <span>TPRPT:</span>
                                        <span className="font-black">{stats.tprpt.submitted} / {stats.tprpt.total}</span>
                                      </span>
                                    </>
                                  ) : (
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-mono text-[11px] font-bold ${
                                      sess.course === 'TPOPT'
                                        ? 'bg-orange-50 text-[#FF7900] border border-orange-200'
                                        : 'bg-blue-50 text-[#0088FF] border border-blue-200'
                                    }`}>
                                      <span>{sess.course} Cohort:</span>
                                      <span className="font-black">{stats.submittedCount} / {stats.totalEligible}</span>
                                    </span>
                                  )}

                                  {stats.excusedCount > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[10px] font-bold">
                                      Excused: {stats.excusedCount}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Responsive Visual Progress Bar */}
                              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/80">
                                <div
                                  className={`h-full transition-all duration-500 rounded-full ${
                                    stats.percentage === 100
                                      ? 'bg-emerald-500'
                                      : stats.percentage > 0
                                      ? 'bg-[#0088FF]'
                                      : 'bg-slate-300'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(0, stats.percentage))}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end md:self-center">
                            {sess.checkinStatus === 'active' ? (
                              <button
                                onClick={() => handleCloseSessionEarly(sess.id)}
                                className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-mono text-xs font-bold transition-all active:scale-95 cursor-pointer"
                                title="Close check-in window so students cannot self-check in"
                              >
                                Close Window
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReopenSession(sess.id)}
                                className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono text-xs font-bold transition-all active:scale-95 cursor-pointer"
                                title="Reopen check-in window"
                              >
                                Reopen
                              </button>
                            )}

                            <button
                              onClick={() => openSessionEditor(sess)}
                              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer touch-target"
                            >
                              <span>Edit Attendance</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteSession(sess.id, sess.moduleTitle)}
                              className="p-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
                              title="Delete this record card"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Session Editor */
              <div className="space-y-5">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 hud-box">
                  <span className="hud-corner-tl" />
                  <span className="hud-corner-tr" />
                  <span className="hud-corner-bl" />
                  <span className="hud-corner-br" />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <button
                        onClick={() => setActiveEditorSession(null)}
                        className="inline-flex items-center gap-1 text-xs font-mono font-bold text-[#0088FF] hover:underline mb-1"
                      >
                        ← Back to Broadcasts
                      </button>
                      <h2 className="font-heading font-black text-2xl text-slate-900 tracking-tight leading-tight">
                        {activeEditorSession.moduleTitle}
                      </h2>
                      <div className="text-xs font-mono text-slate-500 font-semibold pt-0.5">
                        Date: {activeEditorSession.date} ({activeEditorSession.startTime} – {activeEditorSession.endTime}) · Scope: {activeEditorSession.course}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Close or Reopen Window Button */}
                      {activeEditorSession.checkinStatus === 'active' ? (
                        <button
                          onClick={() => handleCloseSessionEarly(activeEditorSession.id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-mono text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                          title="Close check-in window so students cannot self-check in"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Close Window</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReopenSession(activeEditorSession.id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                          title="Reopen check-in window for late student arrivals"
                        >
                          <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                          <span>Reopen Window</span>
                        </button>
                      )}

                      <a
                        href={`/api/admin/export/pdf?sessionId=${activeEditorSession.id}`}
                        download
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs font-bold border border-slate-300 transition-all active:scale-95"
                      >
                        <FileDown className="w-3.5 h-3.5 text-rose-600" />
                        <span>Export PDF</span>
                      </a>

                      <a
                        href={`/api/admin/export/excel?sessionId=${activeEditorSession.id}`}
                        download
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs font-bold border border-slate-300 transition-all active:scale-95"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Export Excel</span>
                      </a>

                      {pendingCount > 0 && (
                        <button
                          onClick={() => setShowFinalizeModal(true)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-mono text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Finalize Attendance ({pendingCount})</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteSession(activeEditorSession.id, activeEditorSession.moduleTitle)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-mono text-xs font-bold border border-rose-200 transition-all active:scale-95 cursor-pointer"
                        title="Delete this session record card"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Record</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-72">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Search className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by name or index..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:border-[#0088FF]"
                      />
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
                      {saveFeedback && (
                        <span
                          className={`text-xs font-mono font-bold animate-fade-in mr-1 ${
                            saveFeedback.startsWith('Error:') ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {saveFeedback}
                        </span>
                      )}

                      <button
                        onClick={() => handleSaveRoster(false)}
                        disabled={isSaving}
                        className="flex-1 sm:flex-initial justify-center px-4 py-2.5 rounded-xl bg-[#0088FF] hover:bg-[#0055CC] text-white font-heading font-black text-xs uppercase tracking-wider shadow-md shadow-[#0088FF]/30 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer touch-target"
                        title="Save session attendance updates to database"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSaving ? 'Saving...' : 'Save Updates'}</span>
                      </button>

                      <button
                        onClick={() => handleSaveRoster(true)}
                        disabled={isSaving}
                        className="flex-1 sm:flex-initial justify-center px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-heading font-black text-xs uppercase tracking-wider shadow-md shadow-slate-900/25 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer touch-target"
                        title="Save attendance and immediately close the check-in window"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Save &amp; Close Window</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mobile Card Roster View */}
                <div className="md:hidden space-y-2.5">
                  {filteredRoster.map((student) => {
                    const curStatus = statusMap[student.studentId] || 'pending';
                    return (
                      <div
                        key={student.studentId}
                        className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-[#0088FF]">
                                {student.studentNumber}
                              </span>
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                                {student.course}
                              </span>
                            </div>
                            <div className="font-heading font-bold text-sm text-slate-900 truncate mt-0.5">
                              {student.fullName}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setStatusMap((prev) => ({ ...prev, [student.studentId]: 'present' }))}
                            className={`py-2 rounded-lg font-mono text-xs font-bold transition-all ${
                              curStatus === 'present'
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-white'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatusMap((prev) => ({ ...prev, [student.studentId]: 'absent' }))}
                            className={`py-2 rounded-lg font-mono text-xs font-bold transition-all ${
                              curStatus === 'absent'
                                ? 'bg-rose-500 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-white'
                            }`}
                          >
                            Absent
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatusMap((prev) => ({ ...prev, [student.studentId]: 'excused' }))}
                            className={`py-2 rounded-lg font-mono text-xs font-bold transition-all ${
                              curStatus === 'excused'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-white'
                            }`}
                          >
                            Excused
                          </button>
                        </div>

                        <input
                          type="text"
                          value={excuseMap[student.studentId] || ''}
                          onChange={(e) => setExcuseMap((prev) => ({ ...prev, [student.studentId]: e.target.value }))}
                          placeholder={curStatus === 'excused' ? 'Excuse reason...' : 'Optional note...'}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#0088FF]"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table Roster View */}
                <div className="hidden md:block bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 font-mono text-[11px] font-bold text-slate-600 uppercase">
                          <th className="py-3 px-4">Index No</th>
                          <th className="py-3 px-4">Student Name</th>
                          <th className="py-3 px-4">Course</th>
                          <th className="py-3 px-4 text-center">Attendance Status</th>
                          <th className="py-3 px-4">Excuse Reason / Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans text-xs">
                        {filteredRoster.map((student) => {
                          const curStatus = statusMap[student.studentId] || 'pending';
                          return (
                            <tr key={student.studentId} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-[#0088FF] whitespace-nowrap">
                                {student.studentNumber}
                              </td>
                              <td className="py-3 px-4 font-heading font-bold text-slate-900 whitespace-nowrap">
                                {student.fullName}
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                {student.course}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1 bg-slate-100 p-1 rounded-xl w-fit mx-auto border border-slate-200">
                                  <button
                                    type="button"
                                    onClick={() => setStatusMap((prev) => ({ ...prev, [student.studentId]: 'present' }))}
                                    className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all ${
                                      curStatus === 'present'
                                        ? 'bg-emerald-500 text-white shadow-sm'
                                        : 'text-slate-600 hover:bg-white'
                                    }`}
                                  >
                                    Present
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setStatusMap((prev) => ({ ...prev, [student.studentId]: 'absent' }))}
                                    className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all ${
                                      curStatus === 'absent'
                                        ? 'bg-rose-500 text-white shadow-sm'
                                        : 'text-slate-600 hover:bg-white'
                                    }`}
                                  >
                                    Absent
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setStatusMap((prev) => ({ ...prev, [student.studentId]: 'excused' }))}
                                    className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all ${
                                      curStatus === 'excused'
                                        ? 'bg-amber-500 text-white shadow-sm'
                                        : 'text-slate-600 hover:bg-white'
                                    }`}
                                  >
                                    Excused
                                  </button>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <input
                                  type="text"
                                  value={excuseMap[student.studentId] || ''}
                                  onChange={(e) => setExcuseMap((prev) => ({ ...prev, [student.studentId]: e.target.value }))}
                                  placeholder={curStatus === 'excused' ? 'Required excuse reason...' : 'Optional remark...'}
                                  className="w-full min-w-[150px] px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#0088FF]"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* VIEW 2: STUDENT ATTENDANCE INSPECTOR */}
        {viewMode === 'inspector' && (
          <div className="space-y-6">
            
            {/* Student Selector Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5 hud-box">
              <span className="hud-corner-tl" />
              <span className="hud-corner-tr" />
              <span className="hud-corner-bl" />
              <span className="hud-corner-br" />

              <div className="border-b border-slate-100 pb-3">
                <h1 className="font-heading font-black text-xl text-slate-900 tracking-tight">
                  Student Attendance Inspector
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Select any student in Batch 11 to view their verified attendance rate, roll-call breakdown, and visualized calendar
                </p>
              </div>

              {/* Selector Toolbar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Search */}
                <div className="relative md:col-span-2">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={inspectorSearch}
                    onChange={(e) => setInspectorSearch(e.target.value)}
                    placeholder="Search by student name or index number (e.g. 02, TPOPT/26/02)..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 text-xs font-mono focus:outline-none focus:border-[#0088FF]"
                  />
                </div>

                {/* Course Filter */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                  {(['ALL', 'TPOPT', 'TPRPT'] as const).map((course) => (
                    <button
                      key={course}
                      onClick={() => setInspectorCourse(course)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                        inspectorCourse === course
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {course}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Select Grid / Pills */}
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1 border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
                {filteredStudentsForInspector.map((stu) => {
                  const isSelected = stu.id === selectedStudent?.id;
                  return (
                    <button
                      key={stu.id}
                      onClick={() => {
                        setSelectedStudentId(stu.id);
                        setSelectedCalendarDate(null);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#0088FF] text-white shadow-sm font-bold'
                          : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className={`font-mono text-xs font-bold ${isSelected ? 'text-white' : 'text-[#0088FF]'}`}>
                          {stu.studentNumber}
                        </span>
                        <span className="truncate">{stu.fullName}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {stu.isRepresentative && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'
                          }`}>
                            Rep
                          </span>
                        )}
                        <span className={`font-mono text-[11px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                          {stu.course}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Student Dashboard */}
            {selectedStudent && inspectedStudentMetrics && (
              <div className="space-y-6 animate-fade-in">
                
                {/* Student Profile Identity Card */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0088FF] to-[#004DB3] text-white flex items-center justify-center font-heading font-black text-xl shadow-md shadow-[#0088FF]/30">
                      {selectedStudent.indexSuffix || selectedStudent.studentNumber.slice(-2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-[#0088FF]">
                          {selectedStudent.studentNumber}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="font-mono text-xs font-bold text-slate-600">
                          {selectedStudent.course}
                        </span>
                        {selectedStudent.isRepresentative && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-[10px] font-black uppercase tracking-wider">
                            <Shield className="w-3 h-3 text-indigo-600" />
                            <span>Course Rep · Admin</span>
                          </span>
                        )}
                      </div>
                      <h2 className="font-heading font-black text-2xl text-slate-900 tracking-tight">
                        {selectedStudent.fullName}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 font-mono text-[11px] sm:text-xs font-bold text-slate-700 break-all">
                      Batch 11 · Registry ID: {selectedStudent.id}
                    </span>
                  </div>
                </div>

                {/* 4 Attendance Metric Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-1 shadow-sm min-w-0">
                    <div className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-500 uppercase">
                      Attendance Rate
                    </div>
                    <div
                      className={`font-heading font-black text-slate-900 tracking-tight break-words ${
                        inspectedStudentMetrics.hasData
                          ? 'text-2xl sm:text-3xl'
                          : 'text-base sm:text-xl leading-snug'
                      }`}
                    >
                      {inspectedStudentMetrics.formattedRate}
                    </div>
                    <div className="text-[10px] font-mono text-emerald-600 font-semibold">
                      Strict Valid Finalized
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-1 shadow-sm">
                    <div className="text-[11px] font-mono font-bold text-slate-500 uppercase">
                      Sessions Attended
                    </div>
                    <div className="font-heading font-black text-3xl text-emerald-600 tracking-tight">
                      {inspectedStudentMetrics.presentCount}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      Confirmed Present
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-1 shadow-sm">
                    <div className="text-[11px] font-mono font-bold text-slate-500 uppercase">
                      Absent Sessions
                    </div>
                    <div className="font-heading font-black text-3xl text-rose-600 tracking-tight">
                      {inspectedStudentMetrics.absentCount}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      Finalized Absences
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-1 shadow-sm">
                    <div className="text-[11px] font-mono font-bold text-slate-500 uppercase">
                      Excused Sessions
                    </div>
                    <div className="font-heading font-black text-3xl text-amber-600 tracking-tight">
                      {inspectedStudentMetrics.excusedCount}
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
                        Official attendance tracking begins November 2026. Tap any calendar date to view roll-call records.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={prevMonth}
                        disabled={isAtMinMonth}
                        title={isAtMinMonth ? 'Tracking starts November 2026' : 'Previous Month'}
                        className={`p-2 rounded-xl border transition-all ${
                          isAtMinMonth
                            ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50'
                            : 'border-slate-300 text-slate-700 hover:bg-slate-50 active:scale-95 cursor-pointer'
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <span className="font-mono text-xs font-bold text-slate-800 min-w-32 text-center">
                        {calMonthName}
                      </span>

                      <button
                        onClick={nextMonth}
                        title="Next Month"
                        className="p-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
                      <div key={d} className="text-center font-mono text-[10px] font-bold text-slate-400 py-1">
                        {d}
                      </div>
                    ))}

                    {calendarDays.map((day, idx) => {
                      if (!day.dayNumber) {
                        return <div key={`empty-${idx}`} className="h-14 sm:h-20 rounded-2xl bg-slate-50/40" />;
                      }

                      const daySessions = dateSessionsMap[day.dateStr!] || [];
                      const hasPresent = daySessions.some((s) => s.status === 'present');
                      const hasAbsent = daySessions.some((s) => s.status === 'absent');
                      const hasExcused = daySessions.some((s) => s.status === 'excused');
                      const isSelected = selectedCalendarDate === day.dateStr;

                      const dayOverrides = overrides.filter(
                        (o) =>
                          o.date === day.dateStr &&
                          (o.course === selectedStudent?.course || o.course === 'ALL' || !selectedStudent)
                      );
                      const hasHoliday = dayOverrides.some((o) => o.action === 'holiday');
                      const hasCanceled = dayOverrides.some((o) => o.action === 'cancel');
                      const hasPostponed = dayOverrides.some((o) => o.action === 'postpone');

                      let cellBorderBg = 'border-slate-200 hover:border-slate-300 bg-white';
                      let dayNumColor = isSelected ? 'text-[#0088FF]' : 'text-slate-700';

                      if (hasHoliday) {
                        cellBorderBg = 'bg-purple-50/80 border-purple-300 hover:border-purple-400';
                        dayNumColor = 'text-purple-900 font-black';
                      } else if (hasCanceled) {
                        cellBorderBg = 'bg-rose-50/80 border-rose-300 hover:border-rose-400';
                        dayNumColor = 'text-rose-900 font-black';
                      } else if (hasPostponed) {
                        cellBorderBg = 'bg-amber-50/80 border-amber-300 hover:border-amber-400';
                        dayNumColor = 'text-amber-900 font-black';
                      }

                      if (isSelected) {
                        cellBorderBg += ' ring-2 ring-[#0088FF] shadow-sm';
                      }

                      return (
                        <button
                          key={day.dateStr}
                          onClick={() => setSelectedCalendarDate(day.dateStr)}
                          className={`h-14 sm:h-20 rounded-2xl p-1.5 sm:p-2 border text-left flex flex-col justify-between transition-all cursor-pointer ${cellBorderBg}`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={`font-mono text-xs font-bold ${dayNumColor}`}>
                              {day.dayNumber}
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

                          <div className="flex items-center gap-1 flex-wrap">
                            {hasHoliday && (
                              <span className="w-2 h-2 rounded-full bg-purple-500 sm:hidden" title="Holiday" />
                            )}
                            {hasCanceled && (
                              <span className="w-2 h-2 rounded-full bg-rose-500 sm:hidden" title="Canceled" />
                            )}
                            {hasPresent && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Present" />
                            )}
                            {hasAbsent && (
                              <span className="w-2 h-2 rounded-full bg-rose-500" title="Absent" />
                            )}
                            {hasExcused && (
                              <span className="w-2 h-2 rounded-full bg-amber-500" title="Excused" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Calendar Legend */}
                  <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-100">
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

                  {/* Selected Date Drawer/Details */}
                  {selectedCalendarDate && (
                    <div className="border border-blue-200 rounded-2xl p-4 sm:p-5 bg-blue-50/20 space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-[#0088FF]" />
                          <span className="font-heading font-black text-sm text-slate-900">
                            Calendar & Override Controls for {selectedCalendarDate}
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedCalendarDate(null)}
                          className="text-slate-400 hover:text-slate-600 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Active Overrides on this Date */}
                      {overrides.filter((o) => o.date === selectedCalendarDate).length > 0 && (
                        <div className="space-y-2">
                          {overrides
                            .filter((o) => o.date === selectedCalendarDate)
                            .map((ovr) => (
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

                                <button
                                  type="button"
                                  onClick={() => handleRemoveOverride(ovr.id)}
                                  className="self-end sm:self-center px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-mono font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Revert</span>
                                </button>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Admin Day State Control Box */}
                      <div className="bg-white border border-blue-200 rounded-xl p-3.5 space-y-2.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-heading font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-[#0088FF]" />
                            <span>Set Date State (Canceled or Holiday)</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            Updates all student calendars live
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

                      {/* Roll-call records for selected student */}
                      <div className="space-y-2 pt-1">
                        <span className="font-mono text-[11px] font-bold text-slate-600 uppercase">
                          Roll-Call Records for {selectedStudent?.fullName} ({dateSessionsMap[selectedCalendarDate]?.length || 0})
                        </span>

                        {(!dateSessionsMap[selectedCalendarDate] || dateSessionsMap[selectedCalendarDate].length === 0) ? (
                          <p className="text-xs font-mono text-slate-500">
                            No roll-call sessions scheduled or recorded on this date.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {dateSessionsMap[selectedCalendarDate].map((sess, i) => (
                              <div
                                key={i}
                                className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                              >
                                <div>
                                  <div className="font-heading font-bold text-slate-900">
                                    {sess.moduleTitle}
                                  </div>
                                  <div className="font-mono text-[11px] text-slate-500">
                                    {sess.startTime && sess.endTime ? `${sess.startTime} – ${sess.endTime} · ` : ''}{sess.moduleCode || 'LEC'} · {sess.sessionType}
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold ${
                                    sess.status === 'present'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : sess.status === 'absent'
                                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                      : sess.status === 'excused'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {sess.status.toUpperCase()}
                                  </span>
                                  {sess.excuseReason && (
                                    <div className="text-[10px] text-slate-500 mt-1">
                                      {sess.excuseReason}
                                    </div>
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

                {/* Complete Roll-Call History Table for this student */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-heading font-black text-base text-slate-900">
                      Complete Attendance History ({inspectedStudentMetrics.sessionDetails.length} Sessions)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Chronological roll-call records for {selectedStudent.fullName}
                    </p>
                  </div>

                  {inspectedStudentMetrics.sessionDetails.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 font-mono text-xs">
                      No roll-call sessions recorded yet for {selectedStudent.course}.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse font-sans text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 font-mono text-[11px] font-bold text-slate-600 uppercase">
                            <th className="py-3 px-4">Date</th>
                            <th className="py-3 px-4">Module Code</th>
                            <th className="py-3 px-4">Module Title</th>
                            <th className="py-3 px-4">Type</th>
                            <th className="py-3 px-4 text-center">Status</th>
                            <th className="py-3 px-4">Excuse Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {inspectedStudentMetrics.sessionDetails.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                                {item.date}
                              </td>
                              <td className="py-3 px-4 font-mono text-[#0088FF] font-bold whitespace-nowrap">
                                {item.moduleCode || 'LEC'}
                              </td>
                              <td className="py-3 px-4 font-heading font-bold text-slate-900 whitespace-nowrap">
                                {item.moduleTitle}
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px] text-slate-500 uppercase whitespace-nowrap">
                                {item.sessionType}
                              </td>
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                <span className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold ${
                                  item.status === 'present'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : item.status === 'absent'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : item.status === 'excused'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {item.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-500">
                                {item.excuseReason || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        )}

      </div>

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-[#0088FF] animate-pulse" />
                <h3 className="font-heading font-black text-lg text-slate-900">
                  New Check-In Record
                </h3>
              </div>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePushBroadcast} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase">
                  Target Course Scope
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ALL', 'TPOPT', 'TPRPT'] as CourseScope[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setBroadcastCourse(c)}
                      className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                        broadcastCourse === c
                          ? 'bg-[#0088FF] text-white border-[#0088FF] shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {c === 'ALL' ? 'COMMON (Both)' : c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase">
                  Subject / Module
                </label>
                <select
                  value={broadcastModuleId}
                  onChange={(e) => setBroadcastModuleId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:border-[#0088FF]"
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} — {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="block text-xs font-mono font-bold text-slate-700 uppercase">
                    Date
                  </label>
                  <input
                    type="date"
                    value={broadcastDate}
                    onChange={(e) => setBroadcastDate(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-mono font-bold text-slate-700 uppercase">
                    Start
                  </label>
                  <input
                    type="time"
                    value={broadcastStartTime}
                    onChange={(e) => setBroadcastStartTime(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-mono font-bold text-slate-700 uppercase">
                    End
                  </label>
                  <input
                    type="time"
                    value={broadcastEndTime}
                    onChange={(e) => setBroadcastEndTime(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs font-mono text-blue-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0088FF] flex-shrink-0" />
                <span>
                  <span className="font-bold">Manual Window Control:</span> Check-in stays open until an admin explicitly closes it.
                </span>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase">
                  Optional Notes / Remarks
                </label>
                <input
                  type="text"
                  value={broadcastNotes}
                  onChange={(e) => setBroadcastNotes(e.target.value)}
                  placeholder="e.g. Studio Practical session floor 2"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-[#0088FF]"
                />
              </div>

              <button
                type="submit"
                disabled={isPushing}
                className="w-full py-3.5 rounded-2xl bg-[#0088FF] hover:bg-[#0055CC] text-white font-heading font-black text-xs uppercase tracking-wider shadow-md shadow-[#0088FF]/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer touch-target"
              >
                <Radio className="w-4 h-4 animate-pulse" />
                <span>{isPushing ? 'Broadcasting...' : 'Push / Open Check-in'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Finalize Confirmation Modal */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-heading font-black text-lg text-slate-900">
                Finalize Session Attendance?
              </h3>
              <p className="text-xs text-slate-600">
                This will automatically mark all remaining <span className="font-bold text-amber-600">{pendingCount} unrecorded students</span> for this session as <span className="font-bold text-amber-700">Excused</span> and conclude roll-call. You can still mark individual students <span className="font-bold text-rose-600">Absent</span> manually in the student list.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowFinalizeModal(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalizeAttendance}
                disabled={isFinalizing}
                className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-heading font-black text-xs uppercase tracking-wider shadow-md shadow-amber-600/30 transition-all cursor-pointer"
              >
                {isFinalizing ? 'Finalizing...' : 'Confirm Finalize'}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
