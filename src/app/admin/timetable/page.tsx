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
  Pencil,
  BookOpen,
  Layers,
  X,
} from 'lucide-react';
import { DayOfWeek, CourseScope, TimetableSlot, TimetableOverride, AcademicModule } from '@/types';

const DAYS: { full: DayOfWeek; short: string }[] = [
  { full: 'Monday', short: 'Mon' },
  { full: 'Tuesday', short: 'Tue' },
  { full: 'Wednesday', short: 'Wed' },
  { full: 'Thursday', short: 'Thu' },
  { full: 'Friday', short: 'Fri' },
  { full: 'Saturday', short: 'Sat' },
  { full: 'Sunday', short: 'Sun' },
];

export default function AdminTimetablePage() {
  const [selectedCourse, setSelectedCourse] = useState<CourseScope>('TPOPT');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Monday');
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [modules, setModules] = useState<AcademicModule[]>([]);
  const [overrides, setOverrides] = useState<TimetableOverride[]>([]);
  const [loading, setLoading] = useState(true);

  // New Slot Form Modal
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [slotStartTime, setSlotStartTime] = useState('08:30');
  const [slotEndTime, setSlotEndTime] = useState('09:30');
  const [slotSubject, setSlotSubject] = useState('');
  const [slotGroup, setSlotGroup] = useState('A/L & NVQ Students');
  const [slotType, setSlotType] = useState<'class' | 'break' | 'lunch'>('class');

  // New Module Modal
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [newModuleCode, setNewModuleCode] = useState('');
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleScope, setNewModuleScope] = useState<CourseScope>('ALL');
  const [newModuleStage, setNewModuleStage] = useState('Foundation');
  const [isSavingModule, setIsSavingModule] = useState(false);

  // Override Form
  const [overrideDate, setOverrideDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [overrideAction, setOverrideAction] = useState<'cancel' | 'postpone' | 'reschedule'>('cancel');
  const [overrideSubject, setOverrideSubject] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  const fetchTimetableData = async () => {
    try {
      const [entriesRes, modRes, overRes] = await Promise.all([
        fetch('/api/timetable/entries'),
        fetch('/api/timetable/modules'),
        fetch('/api/timetable/override'),
      ]);
      const entriesData = await entriesRes.json();
      const modData = await modRes.json();
      const overData = await overRes.json();

      if (entriesData.success) setSlots(entriesData.entries || []);
      if (modData.success) setModules(modData.modules || []);
      if (overData.success) setOverrides(overData.overrides || []);
    } catch (err) {
      console.error('Failed to load timetable:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetableData();
  }, []);

  const openAddSlotModal = () => {
    setEditingSlot(null);
    setSlotStartTime('08:30');
    setSlotEndTime('09:30');
    setSlotSubject('');
    setSlotGroup('A/L & NVQ Students');
    setSlotType('class');
    setShowAddSlot(true);
  };

  const openEditSlotModal = (slot: TimetableSlot) => {
    setEditingSlot(slot);
    setSlotStartTime(slot.startTime);
    setSlotEndTime(slot.endTime);
    setSlotSubject(slot.subject);
    setSlotGroup(slot.studentGroup || 'A/L & NVQ Students');
    setSlotType(slot.slotType === 'empty' ? 'class' : (slot.slotType as any));
    setShowAddSlot(true);
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotSubject && slotType === 'class') {
      alert('Subject name is required for class slots');
      return;
    }

    const slotId = editingSlot
      ? editingSlot.id
      : `tt-${selectedCourse.toLowerCase()}-${selectedDay.toLowerCase()}-${slotStartTime.replace(':', '')}-${Math.random().toString(36).slice(2, 6)}`;

    const entryToSave: TimetableSlot = {
      id: slotId,
      course: editingSlot ? editingSlot.course : selectedCourse,
      dayOfWeek: editingSlot ? editingSlot.dayOfWeek : selectedDay,
      startTime: slotStartTime,
      endTime: slotEndTime,
      subject: slotSubject || (slotType === 'lunch' ? 'Lunch Break' : 'Interval'),
      studentGroup: slotGroup,
      slotType,
      sortOrder: editingSlot ? editingSlot.sortOrder : slots.length + 1,
    };

    try {
      const res = await fetch('/api/timetable/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entryToSave),
      });
      if (res.ok) {
        setShowAddSlot(false);
        setEditingSlot(null);
        await fetchTimetableData();
      }
    } catch {
      alert('Failed to save timetable slot to database');
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('Are you sure you want to delete this timetable slot?')) return;
    await fetch(`/api/timetable/entries?id=${id}`, { method: 'DELETE' });
    await fetchTimetableData();
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleCode || !newModuleTitle) {
      alert('Module code and title are required');
      return;
    }
    setIsSavingModule(true);
    try {
      const res = await fetch('/api/timetable/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newModuleCode.trim().toUpperCase(),
          title: newModuleTitle.trim(),
          courseScope: newModuleScope,
          stage: newModuleStage,
        }),
      });
      if (res.ok) {
        setShowModuleModal(false);
        setNewModuleCode('');
        setNewModuleTitle('');
        await fetchTimetableData();
        alert('New module successfully added and synced to database!');
      }
    } catch {
      alert('Failed to save module');
    } finally {
      setIsSavingModule(false);
    }
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
        await fetchTimetableData();
        alert('Override applied successfully! Home and Timetable views are updated.');
      }
    } catch {
      alert('Failed to apply override');
    }
  };

  const daySlots = slots.filter(
    (s) => (s.course === selectedCourse || s.course === 'ALL') && s.dayOfWeek.toLowerCase() === selectedDay.toLowerCase()
  );

  return (
    <main className="min-h-[calc(100vh-8rem)] cyber-grid px-4 py-6 sm:py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Navigation & Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-xs font-mono font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Admin Suite</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowModuleModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-mono font-bold border border-slate-200 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#0088FF]" />
              <span>+ Add Module</span>
            </button>

            <button
              onClick={openAddSlotModal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0088FF] hover:bg-[#0055CC] text-white text-xs font-heading font-black tracking-wider uppercase shadow-md shadow-[#0088FF]/30 active:scale-95 transition-all cursor-pointer touch-target"
            >
              <Plus className="w-4 h-4" />
              <span>Add Timetable Slot</span>
            </button>
          </div>
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
              Configure weekly slots, edit existing entries, and publish date-specific lecture overrides
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

          {/* Weekday Selector - 7-column responsive grid with shortened names for mobile */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {DAYS.map(({ full, short }) => (
              <button
                key={full}
                type="button"
                onClick={() => setSelectedDay(full)}
                className={`py-2 px-1 rounded-xl font-mono text-xs font-bold text-center transition-all ${
                  selectedDay === full
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
                title={full}
              >
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{full}</span>
              </button>
            ))}
          </div>

          {/* Slots List with Edit & Delete Actions */}
          {loading ? (
            <div className="py-10 text-center text-slate-400 font-mono text-xs animate-pulse">
              Loading slots matrix...
            </div>
          ) : daySlots.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <p className="font-heading font-bold text-sm text-slate-700">
                No slots configured for {selectedDay}
              </p>
              <p className="text-xs text-slate-500">
                Click &quot;Add Timetable Slot&quot; to create a new slot for this day.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {daySlots.map((s) => (
                <div
                  key={s.id}
                  className="border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg whitespace-nowrap">
                      {s.startTime} – {s.endTime}
                    </span>
                    <div>
                      <div className="font-heading font-black text-sm text-slate-900">
                        {s.subject || (s.slotType === 'lunch' ? 'Lunch Break' : s.slotType === 'break' ? 'Break' : 'Empty Slot')}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {s.course === 'ALL' ? 'Common Module' : s.course} · {s.slotType} · {s.studentGroup || 'All'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Edit Button */}
                    <button
                      onClick={() => openEditSlotModal(s)}
                      className="p-2 text-slate-500 hover:text-[#0088FF] rounded-lg hover:bg-blue-50 transition-colors"
                      title="Edit slot"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteSlot(s.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete slot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

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

      {/* Add / Edit Slot Modal */}
      {showAddSlot && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-heading font-black text-lg text-slate-900">
                {editingSlot ? 'Edit Timetable Slot' : `Add Timetable Slot (${selectedCourse} · ${selectedDay})`}
              </h3>
              <button onClick={() => setShowAddSlot(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase">Start Time</label>
                  <input
                    type="time"
                    value={slotStartTime}
                    onChange={(e) => setSlotStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase">End Time</label>
                  <input
                    type="time"
                    value={slotEndTime}
                    onChange={(e) => setSlotEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase">Slot Type</label>
                <select
                  value={slotType}
                  onChange={(e) => setSlotType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                >
                  <option value="class">Class / Academic Lecture</option>
                  <option value="break">Interval / Short Break</option>
                  <option value="lunch">Lunch Break</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase">
                    Subject / Module Title
                  </label>
                  {modules.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) setSlotSubject(e.target.value);
                      }}
                      className="text-[10px] font-mono text-[#0088FF] bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5"
                    >
                      <option value="">Select from modules...</option>
                      {modules.map((m) => (
                        <option key={m.id} value={m.code}>
                          {m.code} — {m.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="e.g. ENGLISH or Non-Linear Video Editing"
                  value={slotSubject}
                  onChange={(e) => setSlotSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase">Student Group</label>
                <input
                  type="text"
                  value={slotGroup}
                  onChange={(e) => setSlotGroup(e.target.value)}
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
                  className="flex-1 py-2.5 rounded-xl bg-[#0088FF] hover:bg-[#0055CC] text-white font-mono text-xs font-bold cursor-pointer"
                >
                  {editingSlot ? 'Update Slot' : 'Save Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Module Modal */}
      {showModuleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#0088FF]" />
                <h3 className="font-heading font-black text-lg text-slate-900">
                  Add Academic Module
                </h3>
              </div>
              <button onClick={() => setShowModuleModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateModule} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase mb-1">
                  Module Code (e.g. POST-5106 or DM12)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AUD-5104"
                  value={newModuleCode}
                  onChange={(e) => setNewModuleCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase mb-1">
                  Module Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Advanced Sound Design & Foley"
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase mb-1">
                    Course Scope
                  </label>
                  <select
                    value={newModuleScope}
                    onChange={(e) => setNewModuleScope(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                  >
                    <option value="ALL">ALL (Common)</option>
                    <option value="TPOPT">TPOPT Exclusive</option>
                    <option value="TPRPT">TPRPT Exclusive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase mb-1">
                    Academic Stage
                  </label>
                  <select
                    value={newModuleStage}
                    onChange={(e) => setNewModuleStage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                  >
                    <option value="Foundation">Foundation</option>
                    <option value="NVQ Level 5">NVQ Level 5</option>
                    <option value="NVQ Level 6">NVQ Level 6</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModuleModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingModule}
                  className="flex-1 py-2.5 rounded-xl bg-[#0088FF] hover:bg-[#0055CC] text-white font-mono text-xs font-bold cursor-pointer"
                >
                  {isSavingModule ? 'Syncing...' : 'Save & Sync to DB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
