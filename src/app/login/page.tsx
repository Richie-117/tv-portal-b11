'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  KeyRound,
  User,
  Lock,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Tv,
  Ticket,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'redeem'>('login');

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Redeem form state
  const [inviteCode, setInviteCode] = useState('');
  const [redeemUsername, setRedeemUsername] = useState('');
  const [redeemPassword, setRedeemPassword] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Authentication failed');
      } else {
        if (data.user.role === 'admin' || data.user.role === 'representative') {
          router.push('/admin');
        } else {
          router.push('/profile');
        }
        router.refresh();
      }
    } catch {
      setLoginError('Network connection error');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setRedeemError(null);
    setRedeemSuccess(null);
    setRedeemLoading(true);

    try {
      const res = await fetch('/api/auth/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteCode: inviteCode.trim().toUpperCase(),
          username: redeemUsername.trim().toLowerCase(),
          password: redeemPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRedeemError(data.error || 'Failed to activate account');
      } else {
        setRedeemSuccess('Account successfully activated! Redirecting...');
        setTimeout(() => {
          router.push('/profile');
          router.refresh();
        }, 1200);
      }
    } catch {
      setRedeemError('Network error');
    } finally {
      setRedeemLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-8rem)] cyber-grid px-4 py-8 flex flex-col justify-center items-center">
      <div className="w-full max-w-md space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-[#0088FF] to-[#004DB3] text-white flex items-center justify-center shadow-md shadow-[#0088FF]/30">
            <Tv className="w-6 h-6" />
          </div>
          <h1 className="font-heading font-black text-2xl text-slate-900 tracking-tight">
            TV Studies Portal
          </h1>
          <p className="text-xs text-slate-500 font-semibold">
            Batch 11 Student Accounts & Academic Admin Suite
          </p>
        </div>

        {/* Tab Controls */}
        <div className="bg-slate-200/80 p-1 rounded-2xl grid grid-cols-2 gap-1 text-xs font-mono font-bold">
          <button
            onClick={() => setTab('login')}
            className={`py-2.5 rounded-xl transition-all ${
              tab === 'login'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setTab('redeem')}
            className={`py-2.5 rounded-xl transition-all ${
              tab === 'redeem'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Redeem Invite Code
          </button>
        </div>

        {/* Form Container */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm hud-box">
          <span className="hud-corner-tl" />
          <span className="hud-corner-tr" />
          <span className="hud-corner-bl" />
          <span className="hud-corner-br" />

          {tab === 'login' ? (
            /* Sign In Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <h2 className="font-heading font-black text-lg text-slate-900 tracking-tight">
                  Account Sign In
                </h2>
                <p className="text-xs text-slate-500">
                  Enter your student or administrator credentials
                </p>
              </div>

              {loginError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. hesansamudika"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 text-sm focus:outline-none focus:border-[#0088FF] focus:ring-2 focus:ring-[#0088FF]/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 text-sm focus:outline-none focus:border-[#0088FF] focus:ring-2 focus:ring-[#0088FF]/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3.5 rounded-2xl bg-[#0088FF] hover:bg-[#0055CC] text-white font-heading font-black text-xs uppercase tracking-wider shadow-md shadow-[#0088FF]/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 touch-target cursor-pointer"
              >
                <span>{loginLoading ? 'Authenticating...' : 'Sign In to Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* Invite Redemption Form */
            <form onSubmit={handleRedeem} className="space-y-4">
              <div className="space-y-1">
                <h2 className="font-heading font-black text-lg text-slate-900 tracking-tight">
                  Activate Student Account
                </h2>
                <p className="text-xs text-slate-500">
                  Enter the one-time invite code provided by your batch representative
                </p>
              </div>

              {redeemError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{redeemError}</span>
                </div>
              )}

              {redeemSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                  <span>{redeemSuccess}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase">
                  One-Time Invite Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Ticket className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="B11-XXXX-XXXX"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 font-mono text-sm uppercase tracking-wider focus:outline-none focus:border-[#0088FF] focus:ring-2 focus:ring-[#0088FF]/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase">
                  Choose Username
                </label>
                <input
                  type="text"
                  required
                  value={redeemUsername}
                  onChange={(e) => setRedeemUsername(e.target.value)}
                  placeholder="e.g. hesansamudika"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-sm focus:outline-none focus:border-[#0088FF] focus:ring-2 focus:ring-[#0088FF]/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase">
                  Set Secure Password
                </label>
                <input
                  type="password"
                  required
                  value={redeemPassword}
                  onChange={(e) => setRedeemPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-sm focus:outline-none focus:border-[#0088FF] focus:ring-2 focus:ring-[#0088FF]/20"
                />
              </div>

              <button
                type="submit"
                disabled={redeemLoading}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 touch-target cursor-pointer"
              >
                <span>{redeemLoading ? 'Activating Profile...' : 'Redeem Code & Activate'}</span>
                <Sparkles className="w-4 h-4" />
              </button>
            </form>
          )}

        </div>

      </div>
    </main>
  );
}
