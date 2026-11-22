'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Tv,
  Radio,
  Calendar,
  User,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface LiveStatus {
  timeContext?: {
    displayDate: string;
    displayTime: string;
    dayOfWeek: string;
  };
  tpopt?: {
    course: string;
    status: string;
    statusLabel: string;
    currentSlot: any;
    nextSlot: any;
    override: any;
  };
  tprpt?: {
    course: string;
    status: string;
    statusLabel: string;
    currentSlot: any;
    nextSlot: any;
    override: any;
  };
}

export default function HomePage() {
  const [liveData, setLiveData] = useState<LiveStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLiveStatus = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/timetable/live');
      const data = await res.json();
      if (data.success) {
        setLiveData(data);
      }
    } catch (err) {
      console.error('Failed to load live status:', err);
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  useEffect(() => {
    fetchLiveStatus();
    // Bounded 30s background check
    const interval = setInterval(fetchLiveStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-[calc(100vh-8rem)] cyber-grid px-4 py-6 sm:py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Hero Section */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <span className="hud-corner-tl" />
          <span className="hud-corner-tr" />
          <span className="hud-corner-bl" />
          <span className="hud-corner-br" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0088FF] text-xs font-mono font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Batch 11 · Academic Year 2026</span>
              </div>
              <h1 className="font-heading font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
                Division of Television Studies
              </h1>
              <p className="text-sm font-semibold text-slate-500">
                University College of Ratmalana · Official Portal
              </p>
            </div>

            {/* Colombo Time HUD */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3 font-mono text-xs shadow-inner">
              <Clock className="w-4 h-4 text-[#0088FF]" />
              <div>
                <div className="font-bold text-slate-800">
                  {liveData?.timeContext?.displayTime || 'Colombo Time'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {liveData?.timeContext?.displayDate || 'Synchronizing...'}
                </div>
              </div>
              <button
                onClick={fetchLiveStatus}
                title="Refresh Live Status"
                className="p-1.5 text-slate-400 hover:text-[#0088FF] rounded-lg hover:bg-white transition-all active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Primary Action Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Tile 1: Check-in Terminal */}
          <Link
            href="/check-in"
            className="group bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl p-6 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all active:scale-[0.98] flex flex-col justify-between h-44 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Radio className="w-5 h-5 text-white animate-pulse" />
              </div>
              <span className="font-mono text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full">
                TERMINAL v2.0
              </span>
            </div>
            <div>
              <h2 className="font-heading font-black text-xl tracking-tight leading-snug">
                Student Check-In
              </h2>
              <p className="text-xs text-blue-100 font-medium mt-1">
                Active roll-call terminal & standby radar
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold group-hover:translate-x-1 transition-transform">
              <span>Open Terminal</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Tile 2: Timetables */}
          <Link
            href="/timetable"
            className="group bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all active:scale-[0.98] flex flex-col justify-between h-44 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0088FF] border border-blue-200 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">
                TPOPT / TPRPT
              </span>
            </div>
            <div>
              <h2 className="font-heading font-black text-xl text-slate-900 tracking-tight leading-snug">
                Timetables
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Weekly schedules & room sessions
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#0088FF] group-hover:translate-x-1 transition-transform">
              <span>View Schedules</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Tile 3: Student Profile */}
          <Link
            href="/profile"
            className="group bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all active:scale-[0.98] flex flex-col justify-between h-44 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">
                PORTAL
              </span>
            </div>
            <div>
              <h2 className="font-heading font-black text-xl text-slate-900 tracking-tight leading-snug">
                Student Profile
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Attendance calendar & monthly rate
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
              <span>Access Profile</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>

        {/* Live Lecture Showcase Section */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <div className="inline-flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <h2 className="font-heading font-black text-xl text-slate-900 tracking-tight uppercase">
                  Live Timetable Telemetry
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Automatically calculated from active schedules for {liveData?.timeContext?.dayOfWeek || 'Today'}
              </p>
            </div>

            <div className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              Timezone: <span className="font-bold text-slate-800">Asia/Colombo</span>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 font-mono text-xs animate-pulse">
              Evaluating timetable matrix...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* TPOPT Showcase Card */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-black bg-[#FF7900]/10 text-[#FF7900] border border-[#FF7900]/30 uppercase">
                    TPOPT Cohort
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${
                    liveData?.tpopt?.status === 'LECTURE_ONGOING'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : liveData?.tpopt?.status === 'CANCELLED'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {liveData?.tpopt?.statusLabel}
                  </span>
                </div>

                {liveData?.tpopt?.currentSlot ? (
                  <div className="space-y-1">
                    <h3 className="font-heading font-black text-lg text-slate-900 leading-tight">
                      {liveData.tpopt.currentSlot.subject}
                    </h3>
                    <p className="text-xs font-mono text-slate-500 font-semibold">
                      {liveData.tpopt.currentSlot.startTime} – {liveData.tpopt.currentSlot.endTime} · {liveData.tpopt.currentSlot.studentGroup || 'All Students'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1 py-1">
                    <p className="font-heading font-bold text-base text-slate-800">
                      {liveData?.tpopt?.nextSlot
                        ? `Upcoming: ${liveData.tpopt.nextSlot.subject}`
                        : 'No session currently ongoing'}
                    </p>
                    {liveData?.tpopt?.nextSlot && (
                      <p className="text-xs font-mono text-slate-500">
                        Scheduled at {liveData.tpopt.nextSlot.startTime} – {liveData.tpopt.nextSlot.endTime}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* TPRPT Showcase Card */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-black bg-blue-50 text-[#0088FF] border border-blue-200 uppercase">
                    TPRPT Cohort
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${
                    liveData?.tprpt?.status === 'LECTURE_ONGOING'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : liveData?.tprpt?.status === 'CANCELLED'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {liveData?.tprpt?.statusLabel}
                  </span>
                </div>

                {liveData?.tprpt?.currentSlot ? (
                  <div className="space-y-1">
                    <h3 className="font-heading font-black text-lg text-slate-900 leading-tight">
                      {liveData.tprpt.currentSlot.subject}
                    </h3>
                    <p className="text-xs font-mono text-slate-500 font-semibold">
                      {liveData.tprpt.currentSlot.startTime} – {liveData.tprpt.currentSlot.endTime} · {liveData.tprpt.currentSlot.studentGroup || 'All Students'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1 py-1">
                    <p className="font-heading font-bold text-base text-slate-800">
                      {liveData?.tprpt?.nextSlot
                        ? `Upcoming: ${liveData.tprpt.nextSlot.subject}`
                        : 'No session currently ongoing'}
                    </p>
                    {liveData?.tprpt?.nextSlot && (
                      <p className="text-xs font-mono text-slate-500">
                        Scheduled at {liveData.tprpt.nextSlot.startTime} – {liveData.tprpt.nextSlot.endTime}
                      </p>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Operational Clarification Callout */}
          <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-blue-900">
            <Info className="w-5 h-5 text-[#0088FF] flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Administrative Check-In Rule: </span>
              A scheduled live lecture does not automatically open student roll-call. Student check-in becomes available only when authorized administrators officially push an active broadcast window.
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
