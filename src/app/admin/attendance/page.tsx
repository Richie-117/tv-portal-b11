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
  ShieldCheck,
  CheckSquare,
} from 'lucide-react';
import { CheckinSession, CourseScope, AttendanceStatus } from '@/types';

export default function AdminAttendancePage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<CheckinSession[]>([]);
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

  const fetchSessions = async () => {
    setIsRefreshing(true);
    try {
      const [sessRes, modRes] = await Promise.all([
        fetch('/api/admin/broadcast'),
        fetch('/api/timetable/entries'),
      ]);
      const sessData = await sessRes.json();
      if (sessData.success) {
        setSessions(sessData.sessions || []);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  useEffect(() => {
    fetchSessions();
    // Default academic modules
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
        await fetchSessions();
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
    await fetchSessions();
    if (activeEditorSession?.id === sessionId) {
      setActiveEditorSession((prev) => (prev ? { ...prev, checkinStatus: 'closed' } : null));
    }
  };

  const handleSaveRoster = async () => {
    if (!activeEditorSession) return;
    setIsSaving(true);
    setSaveFeedback(null);

    try {
      // Save all updated students
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
        await fetchSessions();
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

  return (
    <main className="min-h-[calc(100vh-8rem)] cyber-grid px-4 py-6 sm:py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-xs font-mono font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Admin Suite</span>
          </Link>

          <button
            onClick={() => setShowBroadcastModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0088FF] hover:bg-[#0055CC] text-white text-xs font-heading font-black tracking-wider uppercase shadow-md shadow-[#0088FF]/30 active:scale-95 transition-all cursor-pointer touch-target"
          >
            <Plus className="w-4 h-4" />
            <span>New Check-in Record</span>
          </button>
        </div>

        {/* View Mode: Session List vs Session Editor */}
        {!activeEditorSession ? (
          /* Session Broadcast Overview List */
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

              <button
                onClick={fetchSessions}
                className="p-2 text-slate-400 hover:text-[#0088FF] rounded-xl hover:bg-slate-50"
                title="Refresh sessions"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
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
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        ) : (
          /* Session Attendance Record Editor (Matching Screenshot 4) */
          <div className="space-y-5">
            
            {/* Editor Header Banner */}
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

                {/* Export & Action Buttons */}
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
                </div>
              </div>

              {/* Live Search & Save Control */}
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

            {/* Student Roster Table (Matching Screenshot 4) */}
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

      </div>

      {/* Broadcast Modal (Matching Screenshot 3) */}
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
              {/* Course Scope */}
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

              {/* Module Selector */}
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

              {/* Date & Time Range */}
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

              {/* Duration Window Selector (15, 30, 60, 120 min) */}
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

              {/* Optional Notes */}
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
