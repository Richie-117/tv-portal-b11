'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Ticket,
  Copy,
  Check,
  Sparkles,
  ArrowLeft,
  UserCheck,
  Clock,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  AlertTriangle,
  UserX,
  Filter,
} from 'lucide-react';

export default function AdminInvitesPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState<'ALL' | 'TPOPT' | 'TPRPT'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVATED' | 'PENDING' | 'UNINVITED'>('ALL');

  const fetchInvites = async () => {
    try {
      const res = await fetch('/api/admin/invites', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setStudents(data.students || []);
      }
    } catch (err) {
      console.error('Failed to load invites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const handleGenerateInvite = async (studentId: string) => {
    setActionId(studentId);
    try {
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, expiresInDays: 14 }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchInvites();
      } else {
        alert(data.error || 'Failed to generate invite');
      }
    } catch {
      alert('Failed to generate invite');
    } finally {
      setActionId(null);
    }
  };

  const handleRevokeAccount = async (student: any) => {
    const confirmed = confirm(
      `Revoke student account for ${student.fullName} (${student.studentNumber})?\n\nThis will remove their active login credentials and allow issuing a new invite code if needed.`
    );
    if (!confirmed) return;

    setActionId(student.id);
    try {
      const res = await fetch(`/api/admin/invites?action=revoke_account&id=${student.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        await fetchInvites();
      } else {
        alert(data.error || 'Failed to revoke account');
      }
    } catch {
      alert('Failed to revoke student account');
    } finally {
      setActionId(null);
    }
  };

  const handleRevokeInvite = async (student: any) => {
    const targetId = student.inviteId || student.id;
    const confirmed = confirm(
      `Revoke invitation code ${student.inviteToken} for ${student.fullName}?`
    );
    if (!confirmed) return;

    setActionId(student.id);
    try {
      const res = await fetch(`/api/admin/invites?action=revoke_invite&id=${targetId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        await fetchInvites();
      } else {
        alert(data.error || 'Failed to revoke invitation code');
      }
    } catch {
      alert('Failed to revoke invitation code');
    } finally {
      setActionId(null);
    }
  };

  const copyToClipboard = (token: string, id: string) => {
    navigator.clipboard.writeText(token);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Course scope filter
      if (courseFilter !== 'ALL' && s.course !== courseFilter) return false;

      // Status filter
      if (statusFilter === 'ACTIVATED' && !s.isActivated) return false;
      if (statusFilter === 'PENDING' && (!s.hasPendingInvite || s.isActivated)) return false;
      if (statusFilter === 'UNINVITED' && (s.isActivated || s.hasPendingInvite)) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchName = s.fullName.toLowerCase().includes(query);
        const matchNum = s.studentNumber.toLowerCase().includes(query);
        const matchSuffix = s.indexSuffix?.toLowerCase().includes(query);
        const matchToken = s.inviteToken?.toLowerCase().includes(query);
        return matchName || matchNum || matchSuffix || matchToken;
      }

      return true;
    });
  }, [students, courseFilter, statusFilter, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = students.length;
    const activated = students.filter((s) => s.isActivated).length;
    const pending = students.filter((s) => !s.isActivated && s.hasPendingInvite).length;
    const uninvited = students.filter((s) => !s.isActivated && !s.hasPendingInvite).length;
    return { total, activated, pending, uninvited };
  }, [students]);

  return (
    <main className="min-h-[calc(100vh-8rem)] cyber-grid px-4 py-6 sm:py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-xs font-mono font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Admin Suite</span>
          </Link>

          <button
            onClick={fetchInvites}
            className="p-2 text-slate-400 hover:text-[#0088FF] bg-white border border-slate-200 rounded-xl"
            title="Refresh invites"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="text-[11px] font-mono font-bold text-slate-500 uppercase">
              Total Students
            </div>
            <div className="font-heading font-black text-2xl text-slate-900">
              {stats.total}
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              26 TPOPT · 22 TPRPT
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="text-[11px] font-mono font-bold text-slate-500 uppercase">
              Activated
            </div>
            <div className="font-heading font-black text-2xl text-emerald-600">
              {stats.activated}
            </div>
            <div className="text-[10px] font-mono text-emerald-700">
              Active student logins
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="text-[11px] font-mono font-bold text-slate-500 uppercase">
              Pending Invites
            </div>
            <div className="font-heading font-black text-2xl text-[#0088FF]">
              {stats.pending}
            </div>
            <div className="text-[10px] font-mono text-blue-600">
              Active one-time codes
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="text-[11px] font-mono font-bold text-slate-500 uppercase">
              Uninvited
            </div>
            <div className="font-heading font-black text-2xl text-slate-600">
              {stats.uninvited}
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              Awaiting token generation
            </div>
          </div>
        </div>

        {/* Invites Container */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 hud-box">
          <span className="hud-corner-tl" />
          <span className="hud-corner-tr" />
          <span className="hud-corner-bl" />
          <span className="hud-corner-br" />

          <div className="border-b border-slate-100 pb-4">
            <h1 className="font-heading font-black text-xl text-slate-900 tracking-tight">
              Single-Use Account Invitations & Student Registry
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Issue tokens, search students, revoke codes, and manage account access connected directly to database
            </p>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by student name, index (e.g. 02, TPOPT/26/02), or invite code..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 text-xs font-mono focus:outline-none focus:border-[#0088FF]"
              />
            </div>

            {/* Course Filter Tabs */}
            <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
              {(['ALL', 'TPOPT', 'TPRPT'] as const).map((course) => (
                <button
                  key={course}
                  onClick={() => setCourseFilter(course)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all text-center ${
                    courseFilter === course
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {course}
                </button>
              ))}
            </div>

            {/* Status Filter Tabs */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
              {[
                { key: 'ALL', label: 'All' },
                { key: 'ACTIVATED', label: 'Activated' },
                { key: 'PENDING', label: 'Pending' },
                { key: 'UNINVITED', label: 'Uninvited' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setStatusFilter(item.key as any)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono font-bold transition-all text-center ${
                    statusFilter === item.key
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Student List */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 font-mono text-xs animate-pulse">
              Loading student invitation status from database...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-mono text-xs">
              No students found matching your search and filter criteria.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStudents.map((student) => {
                const isWorking = actionId === student.id;

                return (
                  <div
                    key={student.id}
                    className="border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-[#0088FF]">
                          {student.studentNumber}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="font-mono text-[11px] text-slate-500 font-semibold">
                          {student.course}
                        </span>

                        {student.isRepresentative && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-[10px] font-black uppercase tracking-wider">
                            <Shield className="w-3 h-3 text-indigo-600" />
                            <span>Course Rep · Built-in Admin</span>
                          </span>
                        )}
                      </div>

                      <div className="font-heading font-black text-base text-slate-900">
                        {student.fullName}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {student.isActivated ? (
                        <>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-xs font-bold">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Account Activated</span>
                          </span>

                          <button
                            onClick={() => handleRevokeAccount(student)}
                            disabled={isWorking}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-mono text-xs font-bold transition-all active:scale-95 cursor-pointer"
                            title="Revoke login access and reset invite for this student"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>{isWorking ? 'Revoking...' : 'Revoke Account'}</span>
                          </button>
                        </>
                      ) : student.hasPendingInvite && student.inviteToken ? (
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <span className="font-mono text-xs font-black bg-blue-50 text-[#0088FF] border border-blue-200 px-3 py-1.5 rounded-xl tracking-wider">
                            {student.inviteToken}
                          </span>
                          <button
                            onClick={() => copyToClipboard(student.inviteToken, student.id)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors active:scale-95"
                            title="Copy Code"
                          >
                            {copiedId === student.id ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleRevokeInvite(student)}
                            disabled={isWorking}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 font-mono text-xs font-bold transition-all active:scale-95 cursor-pointer"
                            title="Revoke and cancel this invite code"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{isWorking ? '...' : 'Revoke Code'}</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleGenerateInvite(student.id)}
                          disabled={isWorking}
                          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold transition-all active:scale-95 cursor-pointer touch-target"
                        >
                          {isWorking ? 'Issuing...' : 'Generate Invite'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>
    </main>
  );
}
