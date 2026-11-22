'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Tv,
  Radio,
  Calendar,
  User,
  Shield,
  Menu,
  X,
  LogOut,
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.user) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, [pathname]);

  const navLinks = [
    { href: '/', label: 'Home', icon: Tv },
    { href: '/check-in', label: 'Check-in Terminal', icon: Radio },
    { href: '/timetable', label: 'Timetables', icon: Calendar },
    {
      href: currentUser ? '/profile' : '/login',
      label: currentUser ? 'My Profile' : 'Login / Join',
      icon: User,
    },
    ...(currentUser && (currentUser.role === 'admin' || currentUser.role === 'representative')
      ? [{ href: '/admin', label: 'Admin Suite', icon: Shield }]
      : []),
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand Identity */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0088FF] to-[#004DB3] text-white flex items-center justify-center shadow-md shadow-[#0088FF]/30 group-hover:scale-105 transition-transform">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-black text-slate-900 text-base tracking-tight">
                  TV B11
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#0088FF] border border-blue-200 uppercase">
                  UCR
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-semibold tracking-tight">
                Division of Television Studies
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1.5">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-blue-50 text-[#0088FF] border border-blue-200 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#0088FF]' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <Link
              href="/check-in"
              className="px-3 py-1.5 rounded-xl bg-[#0088FF] text-white font-mono text-[11px] font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>TERMINAL</span>
            </Link>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 touch-target"
              aria-label="Toggle navigation"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold ${
                  isActive
                    ? 'bg-blue-50 text-[#0088FF] border border-blue-200'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#0088FF]' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
