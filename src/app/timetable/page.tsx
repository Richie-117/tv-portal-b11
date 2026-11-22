'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Layers,
  Sparkles,
  AlertCircle,
  XCircle,
  Coffee,
  Utensils,
  BookOpen,
  RefreshCw,
} from 'lucide-react';
import { CourseScope, DayOfWeek, TimetableSlot, TimetableOverride } from '@/types';

const DAYS: { full: DayOfWeek; short: string }[] = [
  { full: 'Monday', short: 'Mon' },
  { full: 'Tuesday', short: 'Tue' },
  { full: 'Wednesday', short: 'Wed' },
  { full: 'Thursday', short: 'Thu' },
  { full: 'Friday', short: 'Fri' },
  { full: 'Saturday', short: 'Sat' },
  { full: 'Sunday', short: 'Sun' },
];

export default function TimetablePage() {
  const [selectedCourse, setSelectedCourse] = useState<'TPOPT' | 'TPRPT'>('TPOPT');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Monday');
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [overrides, setOverrides] = useState<TimetableOverride[]>([]);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [currentMinutesNow, setCurrentMinutesNow] = useState<number>(0);
  const [todayDayOfWeek, setTodayDayOfWeek] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchTimetableData = async () => {
    try {
      const [entriesRes, liveRes] = await Promise.all([
        fetch('/api/timetable/entries'),
        fetch('/api/timetable/live'),
      ]);

      const entriesData = await entriesRes.json();
      const liveData = await liveRes.json();

      if (entriesData.success) {
        setSlots(entriesData.entries || []);
      }
      if (liveData.success) {
        setCurrentTimeStr(liveData.timeContext?.displayTime || '');
        setCurrentMinutesNow(liveData.timeContext?.minutesNow || 0);
        setTodayDayOfWeek(liveData.timeContext?.dayOfWeek || 'Monday');
        setOverrides(liveData.overridesToday || []);

        if (loading && liveData.timeContext?.dayOfWeek) {
          setSelectedDay(liveData.timeContext.dayOfWeek as DayOfWeek);
        }
      }
    } catch (err) {
      console.error('Failed to load timetable:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetableData();
    const interval = setInterval(fetchTimetableData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Filter slots for selected course and day
  const displayedSlots = useMemo(() => {
    return slots
      .filter(
        (s) =>
          (s.course === selectedCourse || s.course === 'ALL') &&
          s.dayOfWeek.toLowerCase() === selectedDay.toLowerCase()
      )
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [slots, selectedCourse, selectedDay]);

  const parseTimeToMinutes = (t: string) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  return (
    <main className="min-h-[calc(100vh-8rem)] cyber-grid px-4 py-6 sm:py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header HUD */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hud-box">
          <span className="hud-corner-tl" />
          <span className="hud-corner-tr" />
          <span className="hud-corner-bl" />
          <span className="hud-corner-br" />

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0088FF] text-[11px] font-mono font-bold uppercase">
              <Calendar className="w-3.5 h-3.5" />
              <span>Foundation Academic Schedule</span>
            </div>
            <h1 className="font-heading font-black text-2xl sm:text-3xl text-slate-900 tracking-tight mt-1">
              Course Timetables
            </h1>
            <p className="text-xs text-slate-500 font-semibold">
              Division of Television Studies · Batch 11
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 font-mono text-xs text-slate-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0088FF]" />
            <span>Today: {todayDayOfWeek} · {currentTimeStr}</span>
          </div>
        </div>

        {/* Course Selector Tabs */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setSelectedCourse('TPOPT')}
            className={`py-3.5 px-4 rounded-2xl border-2 font-heading font-black text-sm tracking-tight transition-all text-left flex items-center justify-between touch-target ${
              selectedCourse === 'TPOPT'
                ? 'bg-gradient-to-r from-[#FF7900] to-[#E66C00] text-white border-[#FF7900] shadow-md shadow-[#FF7900]/25'
                : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div>
              <div className="text-base font-black">TPOPT</div>
              <div className="text-[11px] font-semibold opacity-90">Post-Production Technology</div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/20">
              26 Students
            </span>
          </button>

          <button
            onClick={() => setSelectedCourse('TPRPT')}
            className={`py-3.5 px-4 rounded-2xl border-2 font-heading font-black text-sm tracking-tight transition-all text-left flex items-center justify-between touch-target ${
              selectedCourse === 'TPRPT'
                ? 'bg-gradient-to-r from-[#0088FF] to-[#0055CC] text-white border-[#0088FF] shadow-md shadow-[#0088FF]/25'
                : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div>
              <div className="text-base font-black">TPRPT</div>
              <div className="text-[11px] font-semibold opacity-90">Production Technology</div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/20">
              22 Students
            </span>
          </button>
        </div>

        {/* Weekday Selector - 7-column responsive grid with shortened names for mobile */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {DAYS.map(({ full, short }) => {
            const isSelected = selectedDay === full;
            const isToday = todayDayOfWeek.toLowerCase() === full.toLowerCase();
            return (
              <button
                key={full}
                type="button"
                onClick={() => setSelectedDay(full)}
                className={`py-2 px-1 rounded-xl text-xs font-mono font-bold text-center transition-all relative ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-sm'
                    : isToday
                    ? 'bg-blue-50 text-[#0088FF] border border-blue-200'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
                title={`${full}${isToday ? ' (Today)' : ''}`}
              >
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{full}</span>
                {isToday && (
                  <span className={`block text-[8px] uppercase tracking-tighter ${isSelected ? 'text-blue-200' : 'text-[#0088FF]'}`}>
                    NOW
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Slots Timeline */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 font-mono text-xs animate-pulse">
            Loading timetable schedule...
          </div>
        ) : displayedSlots.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-2">
            <p className="font-heading font-black text-lg text-slate-800">
              No Lectures Scheduled for {selectedDay}
            </p>
            <p className="text-xs text-slate-500 font-medium">
              Check another weekday or refer to institutional notifications.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedSlots.map((slot) => {
              const startMin = parseTimeToMinutes(slot.startTime);
              const endMin = parseTimeToMinutes(slot.endTime);
              const isToday = todayDayOfWeek.toLowerCase() === selectedDay.toLowerCase();
              const isOngoing = isToday && currentMinutesNow >= startMin && currentMinutesNow < endMin;

              const slotOverride = overrides.find(
                (o) =>
                  (o.course === selectedCourse || o.course === 'ALL') &&
                  (o.slotId === slot.id || (slot.subject && o.subject.toLowerCase() === slot.subject.toLowerCase()))
              );

              const isCancelled = slotOverride?.action === 'cancel';
              const isPostponed = slotOverride?.action === 'postpone';
              const isLunch = slot.slotType === 'lunch';
              const isBreak = slot.slotType === 'break';
              const isClass = slot.slotType === 'class' || (!isLunch && !isBreak);

              // Responsive color styling synced to live lecture status
              let cardContainerClass = 'border-slate-200 hover:border-slate-300 bg-white';
              let iconBoxClass = 'bg-blue-50 text-[#0088FF] border border-blue-200';
              let subjectColorClass = 'text-slate-900';

              if (isCancelled) {
                cardContainerClass = 'bg-rose-50/70 border-rose-300 text-rose-900';
                iconBoxClass = 'bg-rose-100 text-rose-700 border border-rose-200';
                subjectColorClass = 'line-through text-rose-600';
              } else if (isPostponed) {
                cardContainerClass = 'bg-amber-50/70 border-amber-300 text-amber-900';
                iconBoxClass = 'bg-amber-100 text-amber-800 border border-amber-200';
                subjectColorClass = 'text-amber-900';
              } else if (isOngoing && isClass) {
                // Ongoing class lecture -> TURN TO GREEN COLOR!
                cardContainerClass =
                  'bg-gradient-to-r from-emerald-50 via-emerald-50/50 to-white border-2 border-emerald-500 ring-2 ring-emerald-500/25 shadow-md shadow-emerald-500/15';
                iconBoxClass = 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30';
                subjectColorClass = 'text-emerald-950 font-black';
              } else if (isOngoing && isLunch) {
                // Ongoing lunch -> TURN TO VIBRANT YELLOW / AMBER!
                cardContainerClass =
                  'bg-gradient-to-r from-amber-50 via-yellow-50/70 to-white border-2 border-amber-400 ring-2 ring-amber-400/25 shadow-md shadow-amber-400/15';
                iconBoxClass = 'bg-amber-400 text-amber-950 shadow-md shadow-amber-400/20';
                subjectColorClass = 'text-amber-950 font-black';
              } else if (isOngoing && isBreak) {
                cardContainerClass =
                  'bg-amber-50/60 border-2 border-amber-300 ring-1 ring-amber-300/30';
                iconBoxClass = 'bg-amber-200 text-amber-900';
                subjectColorClass = 'text-amber-950 font-bold';
              } else if (isLunch) {
                // Static lunch -> Distinct warm YELLOW / AMBER styling!
                cardContainerClass = 'bg-amber-50/40 border border-amber-200 hover:border-amber-300';
                iconBoxClass = 'bg-amber-100 text-amber-800 border border-amber-200';
                subjectColorClass = 'text-amber-950 font-bold';
              } else if (isBreak) {
                cardContainerClass = 'border-slate-200/70 bg-slate-50/60 hover:border-slate-300';
                iconBoxClass = 'bg-slate-100 text-slate-600 border border-slate-200';
                subjectColorClass = 'text-slate-700 font-bold';
              }

              return (
                <div
                  key={slot.id}
                  className={`rounded-2xl p-4 transition-all relative overflow-hidden ${cardContainerClass}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    {/* Time & Type Indicator */}
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl font-mono text-xs font-black ${iconBoxClass}`}>
                        {isLunch ? (
                          <Utensils className="w-4 h-4" />
                        ) : isBreak ? (
                          <Coffee className="w-4 h-4" />
                        ) : (
                          <BookOpen className="w-4 h-4" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-mono text-xs font-bold ${isOngoing && isClass ? 'text-emerald-950 font-black' : isOngoing && isLunch ? 'text-amber-950 font-black' : 'text-slate-900'}`}>
                            {slot.startTime} – {slot.endTime}
                          </span>

                          {/* Live Status Indicators */}
                          {isOngoing && isClass && !isCancelled && !isPostponed && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-emerald-600 text-white animate-pulse flex items-center gap-1.5 shadow-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                              LIVE LECTURE NOW
                            </span>
                          )}
                          {isOngoing && isLunch && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-amber-400 text-amber-950 animate-pulse flex items-center gap-1.5 shadow-xs">
                              <Utensils className="w-3 h-3" />
                              LUNCH BREAK NOW
                            </span>
                          )}
                          {isOngoing && isBreak && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-amber-200 text-amber-900 animate-pulse">
                              INTERVAL BREAK
                            </span>
                          )}
                          {isCancelled && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase bg-rose-100 text-rose-700 border border-rose-200">
                              CANCELLED TODAY
                            </span>
                          )}
                          {isPostponed && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
                              POSTPONED
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                          {slot.course === 'ALL' ? 'Common Module (TPOPT & TPRPT)' : `${slot.course} Exclusive`}
                        </div>
                      </div>
                    </div>

                    {/* Subject Details */}
                    <div className="text-left sm:text-right">
                      {isLunch ? (
                        <div>
                          <div className="font-heading font-black text-base text-amber-950 flex sm:justify-end items-center gap-2">
                            <span>Lunch Break</span>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                              Recess & Meals
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-amber-800/80">
                            Mid-day break for TV Studies Batch 11
                          </div>
                        </div>
                      ) : isBreak ? (
                        <div className="font-heading font-bold text-sm text-slate-600">
                          {slot.subject || 'Break Interval'}
                        </div>
                      ) : (
                        <div>
                          <div className={`font-heading font-black text-base ${subjectColorClass}`}>
                            {slot.subject || 'Practical / Study Period'}
                          </div>
                          {slot.studentGroup && (
                            <div className={`text-[11px] font-mono ${isOngoing && isClass ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                              Target: {slot.studentGroup}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Override Notice if present */}
                      {slotOverride && (
                        <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          <span>
                            {slotOverride.action.toUpperCase()}: {slotOverride.reason || 'Notice by Admin'}
                          </span>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
}

