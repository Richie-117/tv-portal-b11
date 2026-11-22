'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  AlertCircle,
  XCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { DayOfWeek, CourseScope, TimetableSlot, TimetableOverride } from '@/types';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function AdminTimetablePage() {
  const [selectedCourse, setSelectedCourse] = useState<CourseScope>('TPOPT');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Monday');
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [overrides, setOverrides] = useState<TimetableOverride[]>([]);
  const [loading, setLoading] = useState(true);

  // New Slot Form
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [newStartTime, setNewStartTime] = useState('08:30');
  const [newEndTime, setNewEndTime] = useState('09:30');
  const [newSubject, setNewSubject] = useState('');
  const [newGroup, setNewGroup] = useState('A/L & NVQ Students');
  const [newSlotType, setNewSlotType] = useState<'class' | 'break' | 'lunch'>('class');

  // Override Form
  const [overrideDate, setOverrideDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [overrideAction, setOverrideAction] = useState<'cancel' | 'postpone' | 'reschedule'>('cancel');
  const [overrideSubject, setOverrideSubject] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  const fetchTimetable = async () => {
    try {
      const [entriesRes, overRes] = await Promise.all([
        fetch('/api/timetable/entries'),
        fetch('/api/timetable/override'),
      ]);
      const entriesData = await entriesRes.json();
      const overData = await overRes.json();

      if (entriesData.success) setSlots(entriesData.entries || []);
      if (overData.success) setOverrides(overData.overrides || []);
    } catch (err) {
      console.error('Failed to load timetable:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, []);

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject && newSlotType === 'class') {
      alert('Subject name is required for class slots');
      return;
    }

    const slotId = `tt-${selectedCourse.toLowerCase()}-${selectedDay.toLowerCase()}-${newStartTime.replace(':', '')}`;
    const newEntry: TimetableSlot = {
      id: slotId,
      course: selectedCourse,
      dayOfWeek: selectedDay,
      startTime: newStartTime,
      endTime: newEndTime,
      subject: newSubject || (newSlotType === 'lunch' ? 'Lunch Break' : 'Break'),
      studentGroup: newGroup,
      slotType: newSlotType,
      sortOrder: slots.length + 1,
    };

    try {
      const res = await fetch('/api/timetable/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry),
      });
      if (res.ok) {
        setShowAddSlot(false);
        setNewSubject('');
        await fetchTimetable();
      }
    } catch {
      alert('Failed to save slot');
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('Delete this timetable slot?')) return;
    await fetch(`/api/timetable/entries?id=${id}`, { method: 'DELETE' });
    await fetchTimetable();
  };

  const handleCreateOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideSubject) {
      alert('Please enter affected lecture/subject');
      return;
    }

    try {
      const res = await fetch('/api/timetable/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course: selectedCourse,
          date: overrideDate,
          action: overrideAction,
          subject: overrideSubject,
          reason: overrideReason,
        }),
      });
      if (res.ok) {
        setOverrideSubject('');
        setOverrideReason('');
        await fetchTimetable();
        alert('Override applied successfully! Home and Timetable views are updated.');
      }
    } catch {
      alert('Failed to apply override');
    }
  };

  const daySlots = slots.filter(
    (s) => (s.course === selectedCourse || s.course === 'ALL') && s.dayOfWeek === selectedDay
  );

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
            onClick={() => setShowAddSlot(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0088FF] hover:bg-[#0055CC] text-white text-xs font-heading font-black tracking-wider uppercase shadow-md shadow-[#0088FF]/30 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Timetable Slot</span>
          </button>
        </div>

        {/* Timetable Editor Container */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 hud-box">
          <span className="hud-corner-tl" />
          <span className="hud-corner-tr" />
          <span className="hud-corner-bl" />
          <span className="hud-corner-br" />

          <div className="border-b border-slate-100 pb-4">
            <h1 className="font-heading font-black text-xl text-slate-900 tracking-tight">
              Timetable & Schedule Editor
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Configure weekly slots and publish date-specific lecture overrides
            </p>
          </div>

          {/* Course Selector Tabs */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedCourse('TPOPT')}
              className={`py-3 rounded-2xl border-2 font-heading font-black text-xs uppercase tracking-wider transition-all ${
                selectedCourse === 'TPOPT'
                  ? 'bg-gradient-to-r from-[#FF7900] to-[#E66C00] text-white border-[#FF7900] shadow-md shadow-[#FF7900]/25'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              TPOPT Timetable
            </button>
            <button
              onClick={() => setSelectedCourse('TPRPT')}
              className={`py-3 rounded-2xl border-2 font-heading font-black text-xs uppercase tracking-wider transition-all ${
                selectedCourse === 'TPRPT'
                  ? 'bg-gradient-to-r from-[#0088FF] to-[#0055CC] text-white border-[#0088FF] shadow-md shadow-[#0088FF]/25'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              TPRPT Timetable
            </button>
          </div>

          {/* Weekday Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {DAYS.map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all ${
                  selectedDay === d
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Slots List */}
          <div className="space-y-2.5">
            {daySlots.map((s) => (
              <div
                key={s.id}
                className="border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {s.startTime} – {s.endTime}
                  </span>
                  <div>
                    <div className="font-heading font-black text-sm text-slate-900">
                      {s.subject}
                    </div>
                    <div className="font-mono text-[11px] text-slate-500">
                      {s.course === 'ALL' ? 'Common Module' : s.course} · {s.slotType} · {s.studentGroup || 'All'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteSlot(s.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  title="Delete slot"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

        </div>

        {/* Lecture Overrides Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <h2 className="font-heading font-black text-lg">
              Apply Date-Specific Lecture Override
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Cancel or postpone a lecture on a specific date. Changes will automatically reflect on Home and Timetable views.
          </p>

          <form onSubmit={handleCreateOverride} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase mb-1">
                Date
              </label>
              <input
                type="date"
                value={overrideDate}
                onChange={(e) => setOverrideDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase mb-1">
                Action
              </label>
              <select
                value={overrideAction}
                onChange={(e) => setOverrideAction(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
              >
                <option value="cancel">Cancel Lecture</option>
                <option value="postpone">Postpone Lecture</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase mb-1">
                Subject
              </label>
              <input
                type="text"
                placeholder="e.g. ENGLISH or ICT"
                value={overrideSubject}
                onChange={(e) => setOverrideSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold transition-all cursor-pointer"
              >
                Publish Override
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* Add Slot Modal */}
      {showAddSlot && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="font-heading font-black text-lg text-slate-900">
              Add New Timetable Slot ({selectedCourse} · {selectedDay})
            </h3>
            <form onSubmit={handleAddSlot} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase">Start Time</label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase">End Time</label>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase">Slot Type</label>
                <select
                  value={newSlotType}
                  onChange={(e) => setNewSlotType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                >
                  <option value="class">Class / Academic Lecture</option>
                  <option value="break">Interval / Short Break</option>
                  <option value="lunch">Lunch Break</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase">Subject / Module Title</label>
                <input
                  type="text"
                  placeholder="e.g. Non-Linear Video Editing"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase">Student Group</label>
                <input
                  type="text"
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSlot(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#0088FF] hover:bg-[#0055CC] text-white font-mono text-xs font-bold"
                >
                  Save Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
