'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Radio,
  Tv,
  ArrowRight,
  UserCheck,
  ShieldCheck,
  Activity,
  Layers,
} from 'lucide-react';
import { CourseType } from '@/types';

interface ActiveSession {
  id: string;
  course: 'TPOPT' | 'TPRPT' | 'ALL';
  moduleId: string;
  moduleCode: string;
  moduleTitle: string;
  sessionType: string;
  date: string;
  startTime: string;
  endTime: string;
  checkinExpiresAt?: string;
}

interface StudentInfo {
  id: string;
  studentNumber: string;
  fullName: string;
  course: CourseType;
  indexSuffix: string;
}

export default function CheckInPage() {
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [checkedInNumbers, setCheckedInNumbers] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseType>('TPOPT');
  const userChosenCourseRef = useRef<boolean>(false);
  const lastActiveSessionIdRef = useRef<string | null>(null);
  const [inputDigits, setInputDigits] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    fullName: string;
    studentNumber: string;
    moduleTitle: string;
    timestamp: string;
    alreadyCheckedIn?: boolean;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchActiveStatus = async (showInitialLoading = false) => {
    if (showInitialLoading) setLoading(true);
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/checkin/active', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        if (data.hasActiveSession && (data.activeSession || data.activeSessions?.length > 0)) {
          const main = data.activeSession || data.activeSessions[0];
          const isNewSession = lastActiveSessionIdRef.current !== main.id;
          lastActiveSessionIdRef.current = main.id;
          const activeList: ActiveSession[] = data.activeSessions || [main];
          setActiveSession(main);
          setActiveSessions(activeList);

          // Device lock recovery from localStorage
          let foundReceipt = false;
          try {
            const savedReceipt = localStorage.getItem(`tv_checkin_${main.id}`);
            if (savedReceipt) {
              const parsed = JSON.parse(savedReceipt);
              if (parsed && parsed.studentNumber) {
                setSuccessResult(parsed);
                foundReceipt = true;
              }
            }
          } catch {}
          if (isNewSession && !foundReceipt) {
            setSuccessResult(null);
          }

          const hasTpopt = activeList.some((s) => s.course === 'TPOPT' || s.course === 'ALL');
          const hasTprpt = activeList.some((s) => s.course === 'TPRPT' || s.course === 'ALL');
          if (hasTpopt && !hasTprpt) {
            setSelectedCourse('TPOPT');
          } else if (hasTprpt && !hasTpopt) {
            setSelectedCourse('TPRPT');
          } else if (!userChosenCourseRef.current) {
            if (main.course === 'TPRPT') setSelectedCourse('TPRPT');
            else if (main.course === 'TPOPT') setSelectedCourse('TPOPT');
          }
        } else {
          lastActiveSessionIdRef.current = null;
          setActiveSession(null);
          setActiveSessions([]);
        }
        setStudents(data.students || []);
        setCheckedInNumbers(data.checkedInStudentNumbers || []);
      }
    } catch (err) {
      console.error('Failed to sync check-in broadcast:', err);
    } finally {
      if (showInitialLoading) setLoading(false);
      setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  useEffect(() => {
    fetchActiveStatus(true);
    const interval = setInterval(() => fetchActiveStatus(false), 15000);
    return () => clearInterval(interval);
  }, []);

  const allowsTpopt = useMemo(() => {
    const list = activeSessions.length > 0 ? activeSessions : activeSession ? [activeSession] : [];
    return list.some((s) => s.course === 'TPOPT' || s.course === 'ALL');
  }, [activeSessions, activeSession]);

  const allowsTprpt = useMemo(() => {
    const list = activeSessions.length > 0 ? activeSessions : activeSession ? [activeSession] : [];
    return list.some((s) => s.course === 'TPRPT' || s.course === 'ALL');
  }, [activeSessions, activeSession]);

  const currentSession = useMemo(() => {
    if (!activeSessions || activeSessions.length === 0) return activeSession;
    const forSelected = activeSessions.find(
      (s) => s.course === selectedCourse || s.course === 'ALL'
    );
    return forSelected || activeSessions[0] || activeSession;
  }, [activeSessions, activeSession, selectedCourse]);

  const paddedDigits = useMemo(() => {
    const cleaned = inputDigits.replace(/\D/g, '');
    if (!cleaned) return '';
    return cleaned.padStart(2, '0');
  }, [inputDigits]);

  const matchedStudent = useMemo(() => {
    if (!paddedDigits) return null;
    return (
      students.find(
        (s) =>
          s.course === selectedCourse &&
          (s.indexSuffix === paddedDigits ||
            s.studentNumber.toUpperCase().endsWith(`/${paddedDigits}`) ||
            s.studentNumber.toUpperCase().endsWith(`/${inputDigits.trim()}`))
      ) || null
    );
  }, [students, selectedCourse, paddedDigits, inputDigits]);

  const isAlreadyPresent = useMemo(() => {
    if (!matchedStudent) return false;
    return checkedInNumbers.includes(matchedStudent.studentNumber.toUpperCase());
  }, [matchedStudent, checkedInNumbers]);

  const handleSelectCourse = (course: CourseType) => {
    if (course === 'TPOPT' && !allowsTpopt) return;
    if (course === 'TPRPT' && !allowsTprpt) return;
    userChosenCourseRef.current = true;
    setSelectedCourse(course);
    setErrorMessage(null);
  };

  const handleCheckIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const sessionToUse = currentSession || activeSession;
    if (!sessionToUse) return;

    if (!matchedStudent) {
      setErrorMessage(`Please enter a valid student number for ${selectedCourse}.`);
      return;
    }

    if (isAlreadyPresent) {
      setErrorMessage(
        `Duplicate Check-In Blocked: ${matchedStudent.fullName} (${matchedStudent.studentNumber}) is already marked Present.`
      );
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/checkin/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionToUse.id,
          studentNumber: matchedStudent.studentNumber,
          course: selectedCourse,
          lastNumber: paddedDigits,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to complete check-in.');
        if (data.alreadyCheckedIn) {
          setCheckedInNumbers((prev) => [...prev, matchedStudent.studentNumber.toUpperCase()]);
        }
      } else {
        const finalResult = {
          fullName: data.student?.fullName || matchedStudent.fullName,
          studentNumber: data.student?.studentNumber || matchedStudent.studentNumber,
          moduleTitle: sessionToUse.moduleTitle,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          alreadyCheckedIn: false,
        };
        setSuccessResult(finalResult);
        setCheckedInNumbers((prev) => [...prev, matchedStudent.studentNumber.toUpperCase()]);

        try {
          localStorage.setItem(`tv_checkin_${sessionToUse.id}`, JSON.stringify(finalResult));
        } catch {}
      }
    } catch {
      setErrorMessage('Network error. Please check your connection and retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-slate-100 cyber-grid py-6 px-4 flex flex-col justify-center">
      <div className="w-full max-w-xl mx-auto space-y-4">
        
        {/* Terminal Header */}
        <header className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0088FF] to-[#004DB3] text-white flex items-center justify-center shadow-md shadow-[#0088FF]/30">
              <Tv className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-black text-base text-slate-900 tracking-tight">
                  TV B11
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-blue-50 text-[#0088FF] border border-blue-200">
                  TERMINAL v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold tracking-tight">
                Division of Television Studies · UCR
              </p>
            </div>
          </div>

          {/* Sync Status Pill */}
          <button
            type="button"
            onClick={() => fetchActiveStatus(false)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-mono font-bold shadow-inner cursor-pointer transition-all active:scale-95"
            title="Tap to sync broadcast now"
          >
            {activeSession ? (
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-emerald-700 font-bold uppercase tracking-wider text-[11px]">
                  LIVE SYNC
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 animate-pulse" />
                <span className="text-slate-600 font-medium text-[11px]">
                  STANDBY
                </span>
              </div>
            )}
            <RefreshCw className={`w-3 h-3 text-slate-400 hover:text-[#0088FF] ${isRefreshing ? 'animate-spin text-[#0088FF]' : ''}`} />
          </button>
        </header>

        {/* Dynamic State Views */}
        {loading ? (
          /* Connecting HUD */
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center space-y-4 hud-box">
            <span className="hud-corner-tl" />
            <span className="hud-corner-tr" />
            <span className="hud-corner-bl" />
            <span className="hud-corner-br" />

            <div className="w-12 h-12 mx-auto rounded-full border-4 border-slate-100 border-t-[#0088FF] animate-spin" />
            <h3 className="font-heading text-lg font-black text-slate-900 tracking-tight">
              INITIALIZING ATTENDANCE TERMINAL...
            </h3>
            <p className="text-xs font-mono text-slate-500">
              CONNECTING TO SECURE TELEMETRY
            </p>
          </div>
        ) : successResult ? (
          /* Verified Success Screen */
          <div className="bg-white border-2 border-emerald-300 rounded-3xl p-6 sm:p-8 shadow-lg shadow-emerald-500/10 text-center space-y-6 hud-box animate-in fade-in zoom-in-95 duration-200">
            <span className="absolute top-2.5 left-2.5 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-500 rounded-tl-sm" />
            <span className="absolute top-2.5 right-2.5 w-3.5 h-3.5 border-t-2 border-r-2 border-emerald-500 rounded-tr-sm" />
            <span className="absolute bottom-2.5 left-2.5 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-500 rounded-bl-sm" />
            <span className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-500 rounded-br-sm" />

            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-mono font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                {successResult.alreadyCheckedIn ? 'RECORD VERIFIED' : 'ATTENDANCE CONFIRMED'}
              </div>
              <h2 className="font-heading text-2xl sm:text-3xl font-black text-slate-900 tracking-tight pt-1">
                {successResult.fullName}
              </h2>
              <div className="inline-block px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 font-mono text-sm font-black text-[#0088FF]">
                {successResult.studentNumber}
              </div>
            </div>

            {/* Verification Telemetry */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2.5 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Lecture Session:</span>
                <span className="font-bold text-slate-900 text-right">{successResult.moduleTitle}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Status:</span>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  PRESENT ✓
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Timestamp:</span>
                <span className="font-bold text-slate-700">{successResult.timestamp}</span>
              </div>
            </div>

            {/* Anti-Proxy Device Lock Badge */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-bold text-xs uppercase tracking-wider font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Attendance Secured · Device Locked</span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium">
                Your roll-call is officially registered. Single-student device policy is active.
              </p>
            </div>

            <button
              type="button"
              onClick={() => fetchActiveStatus(false)}
              className="w-full py-3.5 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-heading font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 touch-target cursor-pointer border border-slate-300 active:scale-[0.98]"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing Registry...' : 'Refresh Status'}</span>
            </button>
          </div>
        ) : !activeSession ? (
          /* Standby Terminal Screen (Radar HUD) */
          <div className="bg-white border border-slate-200 rounded-3xl p-7 sm:p-10 shadow-sm text-center space-y-6 hud-box">
            <span className="hud-corner-tl" />
            <span className="hud-corner-tr" />
            <span className="hud-corner-bl" />
            <span className="hud-corner-br" />

            {/* Holographic Radar Scanner Animation */}
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-full border-2 border-dashed border-[#0088FF]/35 animate-spin"
                style={{ animationDuration: '18s' }}
              />
              <div className="absolute inset-3 rounded-full border border-[#0088FF]/40" />
              <div className="absolute inset-7 rounded-full border border-slate-200" />

              <div className="absolute inset-0 rounded-full overflow-hidden">
                <div
                  className="w-full h-full animate-radar origin-center"
                  style={{
                    background:
                      'conic-gradient(from 0deg, transparent 0deg, transparent 280deg, rgba(0, 136, 255, 0.35) 360deg)',
                  }}
                />
              </div>

              <div className="relative z-10 w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0088FF] to-[#0055CC] text-white flex items-center justify-center shadow-lg shadow-[#0088FF]/30">
                <Radio className="w-6 h-6 animate-pulse text-white" />
              </div>
            </div>

            <div className="space-y-2 max-w-sm mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-mono font-bold uppercase tracking-wider">
                <Activity className="w-3.5 h-3.5 text-[#0088FF]" />
                RADAR ACTIVE · STANDBY
              </div>

              <h2 className="font-heading text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase leading-snug">
                No Attendance Check-In Available
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                There are currently no active lecture broadcasts open. The terminal is actively listening and will automatically display the roll-call window when opened.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-slate-700 font-bold">
                <div className="flex items-end gap-0.5 h-4">
                  <span className="w-1 bg-[#0088FF] rounded-full wave-bar" style={{ animationDelay: '0s' }} />
                  <span className="w-1 bg-[#0088FF] rounded-full wave-bar" style={{ animationDelay: '0.2s' }} />
                  <span className="w-1 bg-[#0088FF] rounded-full wave-bar" style={{ animationDelay: '0.4s' }} />
                  <span className="w-1 bg-[#0088FF] rounded-full wave-bar" style={{ animationDelay: '0.1s' }} />
                </div>
                <span>Listening for Broadcasts...</span>
              </div>

              <button
                type="button"
                onClick={() => fetchActiveStatus(false)}
                className="font-bold text-[#0088FF] hover:text-[#0055CC] inline-flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm active:scale-95 transition-all text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Checking...' : 'Check Now'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Active Check-in Form Screen */
          <div className="bg-white border border-slate-200 rounded-3xl shadow-lg p-5 sm:p-7 space-y-6 hud-box">
            <span className="hud-corner-tl" />
            <span className="hud-corner-tr" />
            <span className="hud-corner-bl" />
            <span className="hud-corner-br" />

            {/* Active Lecture Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200 rounded-2xl p-4 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-mono font-black uppercase tracking-wider shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  ROLL-CALL ACTIVE
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-800 font-bold bg-white/90 px-2.5 py-0.5 rounded-md border border-blue-200">
                  <Clock className="w-3.5 h-3.5 text-[#0088FF]" />
                  <span>
                    {(currentSession || activeSession)?.startTime} - {(currentSession || activeSession)?.endTime}
                  </span>
                </div>
              </div>

              <div>
                <h2 className="font-heading text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                  {(currentSession || activeSession)?.moduleTitle}
                </h2>
                <div className="flex items-center gap-2 pt-1 text-xs text-slate-700 font-semibold flex-wrap">
                  <span className="font-mono text-[11px] font-bold text-[#0088FF] bg-white px-2 py-0.5 rounded-md border border-blue-200">
                    {allowsTpopt && allowsTprpt
                      ? `ALL BATCH 11 (COMMON) · ${selectedCourse} ACTIVE`
                      : `${selectedCourse} ONLY · OTHER COHORT LOCKED`}
                  </span>
                  <span>·</span>
                  <span className="text-slate-800">{(currentSession || activeSession)?.sessionType}</span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Step 1: Select Programme */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                  [01] SELECT YOUR PROGRAMME
                </label>
                {!(allowsTpopt && allowsTprpt) && (
                  <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                    {allowsTpopt ? 'TPOPT Only' : 'TPRPT Only'}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={!allowsTpopt}
                  onClick={() => handleSelectCourse('TPOPT')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all touch-target ${
                    !allowsTpopt
                      ? 'bg-slate-100 text-slate-400 border-slate-200 opacity-50 cursor-not-allowed'
                      : selectedCourse === 'TPOPT'
                      ? 'bg-gradient-to-br from-[#FF7900] to-[#E66C00] text-white border-[#FF7900] shadow-md shadow-[#FF7900]/30 scale-[1.01] cursor-pointer'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 cursor-pointer'
                  }`}
                >
                  <div className="text-base font-black font-heading leading-tight">
                    TPOPT
                  </div>
                  <div
                    className={`text-[11px] font-semibold leading-tight ${
                      !allowsTpopt
                        ? 'text-slate-400'
                        : selectedCourse === 'TPOPT'
                        ? 'text-white'
                        : 'text-slate-500'
                    }`}
                  >
                    {allowsTpopt ? 'Post Production' : 'Not open'}
                  </div>
                </button>

                <button
                  type="button"
                  disabled={!allowsTprpt}
                  onClick={() => handleSelectCourse('TPRPT')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all touch-target ${
                    !allowsTprpt
                      ? 'bg-slate-100 text-slate-400 border-slate-200 opacity-50 cursor-not-allowed'
                      : selectedCourse === 'TPRPT'
                      ? 'bg-gradient-to-br from-[#0088FF] to-[#0055CC] text-white border-[#0088FF] shadow-md shadow-[#0088FF]/30 scale-[1.01] cursor-pointer'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 cursor-pointer'
                  }`}
                >
                  <div className="text-base font-black font-heading leading-tight">
                    TPRPT
                  </div>
                  <div
                    className={`text-[11px] font-semibold leading-tight ${
                      !allowsTprpt
                        ? 'text-slate-400'
                        : selectedCourse === 'TPRPT'
                        ? 'text-white'
                        : 'text-slate-500'
                    }`}
                  >
                    {allowsTprpt ? 'Production Tech' : 'Not open'}
                  </div>
                </button>
              </div>
            </div>

            {/* Step 2: Enter Index Last Number */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                  [02] ENTER LAST DIGITS OF INDEX ({selectedCourse})
                </label>
                <span className="text-[11px] text-slate-500 font-mono font-bold">
                  e.g. &quot;02&quot; or &quot;2&quot;
                </span>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-600 font-mono text-sm font-bold">
                  RT/{selectedCourse}/26/
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={inputDigits}
                  onChange={(e) => {
                    setInputDigits(e.target.value.slice(0, 3));
                    setErrorMessage(null);
                  }}
                  placeholder="02"
                  className="w-full pl-36 pr-4 py-3.5 rounded-2xl bg-white border-2 border-slate-300 text-xl font-mono font-black text-slate-900 placeholder-slate-300 focus:outline-none focus:border-[#0088FF] focus:ring-2 focus:ring-[#0088FF]/20 transition-all text-left shadow-sm"
                  autoFocus
                />
              </div>
            </div>

            {/* Verified Student Match Preview */}
            {paddedDigits && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-150">
                {matchedStudent ? (
                  <div
                    className={`p-4 rounded-2xl border-2 space-y-2 ${
                      isAlreadyPresent
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-blue-50/90 border-blue-300 text-slate-900 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-600">
                        VERIFIED STUDENT MATCH
                      </span>
                      {isAlreadyPresent ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-black text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
                          ALREADY RECORDED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
                          <UserCheck className="w-3.5 h-3.5" />
                          VERIFIED READY
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="font-heading font-black text-lg text-slate-900 leading-tight">
                        {matchedStudent.fullName}
                      </div>
                      <div className="font-mono text-xs font-black text-[#0088FF] pt-0.5">
                        {matchedStudent.studentNumber} · {matchedStudent.course}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-mono">
                    No student matching RT/{selectedCourse}/26/{paddedDigits} found.
                  </div>
                )}
              </div>
            )}

            {/* Submit Action */}
            <button
              type="button"
              disabled={isSubmitting || !matchedStudent || isAlreadyPresent}
              onClick={handleCheckIn}
              className={`w-full py-4 px-6 rounded-2xl font-heading font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 touch-target cursor-pointer ${
                isAlreadyPresent
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed opacity-80'
                  : !matchedStudent
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-[#0088FF] hover:bg-[#0055CC] text-white shadow-lg shadow-[#0088FF]/30 active:scale-[0.98]'
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>TRANSMITTING TELEMETRY...</span>
                </div>
              ) : isAlreadyPresent ? (
                <span>ALREADY RECORDED FOR THIS LECTURE</span>
              ) : (
                <div className="flex items-center gap-2">
                  <span>CONFIRM & CHECK IN</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </button>

          </div>
        )}

      </div>
    </div>
  );
}

