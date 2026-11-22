'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Radio,
  Calendar,
  Users,
  Ticket,
  FileSpreadsheet,
  FileDown,
  ArrowRight,
  Sparkles,
  LogOut,
  Clock,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalStudents: 48,
    activeSessions: 0,
    totalSessions: 0,
    totalInvites: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || !data.user || (data.user.role !== 'admin' && data.user.role !== 'representative')) {
          router.push('/login');
        } else {
          setCurrentUser(data.user);
          // Fetch stats
          Promise.all([
            fetch('/api/admin/broadcast').then((r) => r.json()),
            fetch('/api/admin/invites').then((r) => r.json()),
          ]).then(([sessData, invData]) => {
            const allSess = sessData.sessions || [];
            const active = allSess.filter((s: any) => s.checkinStatus === 'active').length;
            setStats({
              totalStudents: 48,
              activeSessions: active,
              totalSessions: allSess.length,
              totalInvites: (invData.invitations || []).length,
            });
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

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-8rem)] cyber-grid px-4 py-12 flex justify-center items-center">
        <div className="font-mono text-xs text-slate-400 animate-pulse">
          Verifying administrative authorization...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-8rem)] cyber-grid px-4 py-6 sm:py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Admin Header */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hud-box">
          <span className="hud-corner-tl" />
          <span className="hud-corner-tr" />
          <span className="hud-corner-bl" />
          <span className="hud-corner-br" />

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white flex items-center justify-center shadow-md">
              <Shield className="w-6 h-6 text-[#0088FF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading font-black text-xl sm:text-2xl text-slate-900 tracking-tight">
                  Academic Admin Suite
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-blue-50 text-[#0088FF] border border-blue-200">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold">
                Welcome back, {currentUser.fullName} ({currentUser.username})
              </p>
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

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm">
            <div className="text-[11px] font-mono font-bold text-slate-500 uppercase">
              ENROLLED STUDENTS
            </div>
            <div className="font-heading font-black text-2xl text-slate-900">
              {stats.totalStudents}
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              26 TPOPT · 22 TPRPT
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm">
            <div className="text-[11px] font-mono font-bold text-slate-500 uppercase">
              ACTIVE BROADCASTS
            </div>
            <div className="font-heading font-black text-2xl text-emerald-600">
              {stats.activeSessions}
            </div>
            <div className="text-[10px] font-mono text-emerald-600 font-bold">
              Check-in Window Open
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm">
            <div className="text-[11px] font-mono font-bold text-slate-500 uppercase">
              RECORDED SESSIONS
            </div>
            <div className="font-heading font-black text-2xl text-slate-900">
              {stats.totalSessions}
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              Historical Roll-Calls
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm">
            <div className="text-[11px] font-mono font-bold text-slate-500 uppercase">
              INVITATIONS ISSUED
            </div>
            <div className="font-heading font-black text-2xl text-[#0088FF]">
              {stats.totalInvites}
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              Single-Use Account Tokens
            </div>
          </div>
        </div>

        {/* Management Portals */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Card 1: Attendance & Roll-Call */}
          <Link
            href="/admin/attendance"
            className="group bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all active:scale-[0.98] flex flex-col justify-between h-48"
          >
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0088FF] border border-blue-200 flex items-center justify-center">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="font-heading font-black text-lg text-slate-900 tracking-tight">
                Roll-Call & Broadcasts
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Push check-ins, edit records, finalize absences, export PDF & Excel.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#0088FF] group-hover:translate-x-1 transition-transform">
              <span>Open Attendance Suite</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 2: Timetable & Overrides */}
          <Link
            href="/admin/timetable"
            className="group bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all active:scale-[0.98] flex flex-col justify-between h-48"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-black text-lg text-slate-900 tracking-tight">
                Timetable & Overrides
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Edit weekly slot schedules, apply date-specific cancellations & postponements.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-600 group-hover:translate-x-1 transition-transform">
              <span>Edit Schedules</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 3: Student Invites */}
          <Link
            href="/admin/invites"
            className="group bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all active:scale-[0.98] flex flex-col justify-between h-48"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-black text-lg text-slate-900 tracking-tight">
                Student Invitations
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Issue single-use invite codes to unactivated students for profile access.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
              <span>Manage Invites</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

        </div>

      </div>
    </main>
  );
}
