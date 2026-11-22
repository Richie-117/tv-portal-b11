'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { CheckinSession, CourseScope, AttendanceStatus } from '@/types';
import { calculateStudentAttendanceMetrics } from '@/lib/attendanceCalculations';

export default function AdminAttendancePage() {
  const router = useRouter();

  // Top-level View Mode: 'sessions' | 'inspector'
  const [viewMode, setViewMode] = useState<'sessions' | 'inspector'>('sessions');

  const [sessions, setSessions] = useState<CheckinSession[]>([]);
  const [allRecords, setAllRecords] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Broadcast Modal State
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastCourse, setBroadcastCourse] = useState<CourseScope>('ALL');
  const [broadcastModuleId, setBroadcastModuleId] = useState('sub-ict');
  const [broadcastDate, setBroadcastDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [broadcastStartTime, setBroadcastStartTime] = useState('08:30');
  const [broadcastEndTime, setBroadcastEndTime] = useState('16:30');
  const [broadcastDuration, setBroadcastDuration] = useState<number>(30);
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

  // Student Attendance Inspector State
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [inspectorSearch, setInspectorSearch] = useState('');
  const [inspectorCourse, setInspectorCourse] = useState<'ALL' | 'TPOPT' | 'TPRPT'>('ALL');

  // Inspector Calendar Navigation (Strictly locked to November 2026 onwards)
  const [calendarDate, setCalendarDate] = useState(() => new Date(2026, 10, 1)); // November 2026
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  const fetchAllData = async () => {
    setIsRefreshing(true);
    try {
      const [sessRes, recRes, stuRes] = await Promise.all([
        fetch('/api/admin/broadcast'),
        fetch('/api/admin/attendance'),
        fetch('/api/admin/invites'),
      ]);
      const [sessData, recData, stuData] = await Promise.all([
        sessRes.json(),
        recRes.json(),
        stuRes.json(),
      ]);

      if (sessData.success) setSessions(sessData.sessions || []);
      if (recData.success) setAllRecords(recData.records || []);
      if (stuData.success) {
        const stuList = stuData.students || [];
        setStudents(stuList);
        if (stuList.length > 0 && !selectedStudentId) {
          setSelectedStudentId(stuList[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load attendance data:', err);
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 300);
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
  }, []);

  const openSessionEditor = async (session: CheckinSession) => {
    setActiveEditorSession(session);
    setSearchTerm('');
    setSaveFeedback(null);
    try {
      const res = await fetch(`/api/admin/attendance?sessionId=${session.id}`);
      const data = await res.json();
      if (data.success) {
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
          durationMinutes: broadcastDuration,
          notes: broadcastNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowBroadcastModal(false);
        await fetchAllData();
        if (data.session) openSessionEditor(data.session);
      }
    } catch {
      alert('Failed to push check-in broadcast');
    } finally {
      setIsPushing(false);
    }
  };

  const handleCloseSessionEarly = async (sessionId: string) => {
    if (!confirm('Close this check-in window early? Students will no longer be able to self-check in.')) return;
    await fetch('/api/admin/broadcast', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, status: 'closed' }),
    });
    await fetchAllData();
    if (activeEditorSession?.id === sessionId) {
      setActiveEditorSession((prev) => (prev ? { ...prev, checkinStatus: 'closed' } : null));
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

  const handleSaveRoster = async () => {
    if (!activeEditorSession) return;
    setIsSaving(true);
    setSaveFeedback(null);

    try {
      for (const student of roster) {
        const newStatus = statusMap[student.studentId];
        const newExcuse = excuseMap[student.studentId];
        if (newStatus && newStatus !== student.status) {
          await fetch('/api/admin/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: activeEditorSession.id,
              studentId: student.studentId,
              status: newStatus,
              excuseReason: newExcuse || '',
            }),
          });
        }
      }
      setSaveFeedback('Session attendance successfully saved to database!');
      await openSessionEditor(activeEditorSession);
      await fetchAllData();
    } catch {
      setSaveFeedback('Error saving updates');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveFeedback(null), 3000);
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
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-xs font-mono font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Admin Suite</span>
            </Link>

            {/* View Switcher Pills */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
              <button
                onClick={() => {
                  setViewMode('sessions');
                  setActiveEditorSession(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
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
              onClick={fetchAllData}
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
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 hud-box">
                <span className="hud-corner-tl" />
                <span className="hud-corner-tr" />
                <span className="hud-corner-bl" />
                <span className="hud-corner-br" />

                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h1 className="font-heading font-black text-xl text-slate-900 tracking-tight">
                      Attendance Roll-Call Broadcasts
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">
                      Push mobile check-ins and monitor incoming student roll-call telemetry
                    </p>
                  </div>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-slate-400 font-mono text-xs animate-pulse">
                    Loading session broadcasts...
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <Radio className="w-12 h-12 mx-auto text-slate-300" />
                    <p className="font-heading font-bold text-base text-slate-700">
                      No attendance sessions created yet
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Click &quot;New Check-in Record&quot; to open a live check-in broadcast for TPOPT or TPRPT.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((sess) => (
                      <div
                        key={sess.id}
                        className="border border-slate-200 rounded-2xl p-4 sm:p-5 hover:border-blue-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
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
                          </div>

                          <h3 className="font-heading font-black text-lg text-slate-900 leading-tight">
                            {sess.moduleTitle}
                          </h3>

                          <div className="text-xs font-mono text-slate-500 font-semibold">
                            Scope: <span className="text-slate-800">{sess.course === 'ALL' ? 'COMMON (Both Courses)' : sess.course}</span> · Window: {sess.checkinWindowMinutes} mins
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {sess.checkinStatus === 'active' && (
                            <button
                              onClick={() => handleCloseSessionEarly(sess.id)}
                              className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-mono text-xs font-bold transition-all active:scale-95 cursor-pointer"
                            >
                              Close Window
                            </button>
                          )}

                          <button
                            onClick={() => openSessionEditor(sess)}
                            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer touch-target"
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
                    ))}
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

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                      {saveFeedback && (
                        <span className="text-xs font-mono font-bold text-emerald-600 animate-fade-in">
                          {saveFeedback}
                        </span>
                      )}
                      <button
                        onClick={handleSaveRoster}
                        disabled={isSaving}
                        className="px-5 py-2.5 rounded-xl bg-[#0088FF] hover:bg-[#0055CC] text-white font-heading font-black text-xs uppercase tracking-wider shadow-md shadow-[#0088FF]/30 transition-all flex items-center gap-2 active:scale-95 cursor-pointer touch-target"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSaving ? 'Saving Updates...' : 'Save Updated Session'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
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
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#0088FF]"
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

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 font-mono text-xs font-bold text-slate-700">
                      Batch 11 · Registry ID: {selectedStudent.id}
                    </span>
                  </div>
                </div>

                {/* 4 Attendance Metric Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-1 shadow-sm">
                    <div className="text-[11px] font-mono font-bold text-slate-500 uppercase">
                      Attendance Rate
                    </div>
                    <div className="font-heading font-black text-3xl text-slate-900 tracking-tight">
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

                      return (
                        <button
                          key={day.dateStr}
                          onClick={() => setSelectedCalendarDate(day.dateStr)}
                          className={`h-14 sm:h-20 rounded-2xl p-1.5 sm:p-2 border text-left flex flex-col justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#0088FF] ring-2 ring-[#0088FF]/30 bg-blue-50/40'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <span className={`font-mono text-xs font-bold ${
                            isSelected ? 'text-[#0088FF]' : 'text-slate-700'
                          }`}>
                            {day.dayNumber}
                          </span>

                          <div className="flex items-center gap-1 flex-wrap">
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

                  {/* Selected Date Drawer/Details */}
                  {selectedCalendarDate && (
                    <div className="border border-blue-200 rounded-2xl p-4 bg-blue-50/30 space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-[#0088FF]" />
                          <span className="font-heading font-black text-sm text-slate-900">
                            Roll-Call Records for {selectedCalendarDate}
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedCalendarDate(null)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

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
                                  {sess.moduleCode || 'LEC'} · {sess.sessionType}
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

              <div className="space-y-1">
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase">
                  Check-In Window Duration
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 60, 120].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setBroadcastDuration(d)}
                      className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                        broadcastDuration === d
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
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
                This will automatically convert all remaining <span className="font-bold text-amber-600">{pendingCount} unrecorded students</span> for this session into <span className="font-bold text-rose-600">Absent</span> and conclude roll-call.
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
