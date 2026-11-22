'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

export default function AdminInvitesPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generatingForId, setGeneratingForId] = useState<string | null>(null);

  const fetchInvites = async () => {
    try {
      const res = await fetch('/api/admin/invites');
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
    setGeneratingForId(studentId);
    try {
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, expiresInDays: 14 }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchInvites();
      }
    } catch {
      alert('Failed to generate invite');
    } finally {
      setGeneratingForId(null);
    }
  };

  const copyToClipboard = (token: string, id: string) => {
    navigator.clipboard.writeText(token);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <main className="min-h-[calc(100vh-8rem)] cyber-grid px-4 py-6 sm:py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        
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

        {/* Invites Container */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 hud-box">
          <span className="hud-corner-tl" />
          <span className="hud-corner-tr" />
          <span className="hud-corner-bl" />
          <span className="hud-corner-br" />

          <div className="border-b border-slate-100 pb-4">
            <h1 className="font-heading font-black text-xl text-slate-900 tracking-tight">
              Single-Use Account Invitations
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Issue secure activation tokens tied to student records for personal profile creation
            </p>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 font-mono text-xs animate-pulse">
              Loading student invitation status...
            </div>
          ) : (
            <div className="space-y-3">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#0088FF]">
                        {student.studentNumber}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="font-mono text-[11px] text-slate-500 font-semibold">
                        {student.course}
                      </span>
                    </div>
                    <div className="font-heading font-black text-base text-slate-900">
                      {student.fullName}
                    </div>
                  </div>

                  <div>
                    {student.isActivated ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-xs font-bold">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Account Activated</span>
                      </span>
                    ) : student.hasPendingInvite && student.inviteToken ? (
                      <div className="flex items-center gap-2">
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
                      </div>
                    ) : (
                      <button
                        onClick={() => handleGenerateInvite(student.id)}
                        disabled={generatingForId === student.id}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold transition-all active:scale-95 cursor-pointer touch-target"
                      >
                        {generatingForId === student.id ? 'Issuing...' : 'Generate Invite'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>
    </main>
  );
}
