'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Tv,
  Radio,
  Calendar,
  User,
  Menu,
  X,
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

  // Clean navigation links: Home, Check-in Terminal, Timetables, My Profile / Login
  // "Admin Suite" is explicitly hidden from public nav bars per requirements
  const navLinks = [
    { href: '/', label: 'Home', icon: Tv },
    { href: '/check-in', label: 'Check-in Terminal', icon: Radio },
    { href: '/timetable', label: 'Timetables', icon: Calendar },
    {
      href: currentUser ? '/profile' : '/login',
      label: currentUser ? 'My Profile' : 'Login / Join',
      icon: User,
    },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/90 pt-[env(safe-area-inset-top,0px)]">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Brand Identity */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0 select-none">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#0088FF] to-[#004DB3] text-white flex items-center justify-center shadow-md shadow-[#0088FF]/30 group-hover:scale-105 active:scale-95 transition-transform shrink-0">
              <Tv className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-heading font-black text-slate-900 text-base sm:text-lg tracking-tight">
                  TV B11
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#0088FF] border border-blue-200 uppercase">
                  UCR
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 font-semibold tracking-tight truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none">
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

          {/* Mobile Action Controls */}
          <div className="md:hidden flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/check-in"
              className="h-10 px-3 rounded-xl bg-gradient-to-r from-[#0088FF] to-[#0070D8] text-white font-mono text-[11px] font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all select-none"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>TERMINAL</span>
            </Link>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-90 text-slate-700 border border-slate-200/90 transition-all shadow-xs select-none touch-manipulation cursor-pointer"
              aria-label="Toggle navigation"
              aria-expanded={isOpen}
            >
              {isOpen ? <X className="w-5 h-5 text-slate-800" /> : <Menu className="w-5 h-5 text-slate-800" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu with Generous Touch Targets */}
      {isOpen && (
        <div className="md:hidden border-t border-slate-200/90 bg-white px-3.5 pt-2.5 pb-4 space-y-1.5 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-bold transition-all select-none active:scale-[0.98] ${
                  isActive
                    ? 'bg-blue-50 text-[#0088FF] border border-blue-200/90 shadow-xs'
                    : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-blue-100/80 text-[#0088FF]' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
