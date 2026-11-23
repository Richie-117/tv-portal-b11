'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import {
  isAcademicLecture,
  isStudyOrEmptySlot,
  mergeTimetableSlots,
  normalizeSubject,
  MergedTimetableSlot,
  getCurrentWeekDates,
  findMatchingOverride,
} from '@/lib/timetableSlotUtils';

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
  const [editorViewMode, setEditorViewMode] = useState<'combined' | 'hourly'>('combined');
  const [loading, setLoading] = useState(true);

  // New Slot Form Modal
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [slotStartTime, setSlotStartTime] = useState('08:30');
  const [slotEndTime, setSlotEndTime] = useState('09:30');
  const [slotSubject, setSlotSubject] = useState('');
  const [slotGroup, setSlotGroup] = useState('A/L & NVQ Students');
  const [slotType, setSlotType] = useState<'class' | 'break' | 'lunch' | 'empty'>('class');

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
  const [overrideScope, setOverrideScope] = useState<CourseScope>('TPOPT');
  const [overrideSubject, setOverrideSubject] = useState('');
  const [overrideSlotId, setOverrideSlotId] = useState('');
  const [selectedOverrideOption, setSelectedOverrideOption] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  // Live Time Context
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [currentMinutesNow, setCurrentMinutesNow] = useState<number>(0);
  const [todayDayOfWeek, setTodayDayOfWeek] = useState<string>('');

  const parseTimeToMinutes = (t: string) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const fetchTimetableData = async () => {
    try {
      const [entriesRes, modRes, overRes, liveRes] = await Promise.all([
        fetch('/api/timetable/entries'),
        fetch('/api/timetable/modules'),
        fetch('/api/timetable/override'),
        fetch('/api/timetable/live'),
      ]);
      const entriesData = await entriesRes.json();
      const modData = await modRes.json();
      const overData = await overRes.json();
      const liveData = await liveRes.json();

      if (entriesData.success) setSlots(entriesData.entries || []);
      if (modData.success) setModules(modData.modules || []);
      if (overData.success) setOverrides(overData.overrides || []);
      if (liveData.success) {
        setCurrentTimeStr(liveData.timeContext?.displayTime || '');
        setCurrentMinutesNow(liveData.timeContext?.minutesNow || 0);
        setTodayDayOfWeek(liveData.timeContext?.dayOfWeek || 'Monday');
      }
    } catch (err) {
      console.error('Failed to load timetable:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetableData();

    // Local Colombo clock updater every 30s (eliminates console API flood)
    const timer = setInterval(() => {
      try {
        const now = new Date();
        const colomboFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Colombo',
          hour: 'numeric',
          minute: 'numeric',
          hour12: true,
        });
        const hourFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Colombo',
          hour: 'numeric',
          minute: 'numeric',
          hour12: false,
        });
        const parts = hourFormatter.formatToParts(now);
        let h = 0;
        let m = 0;
        for (const p of parts) {
          if (p.type === 'hour') h = parseInt(p.value, 10);
          if (p.type === 'minute') m = parseInt(p.value, 10);
        }
        setCurrentMinutesNow(h * 60 + m);
        setCurrentTimeStr(colomboFormatter.format(now));
      } catch {}
    }, 30000);

    return () => clearInterval(timer);
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

  const handleDeleteSlot = async (id: string, slotIds?: string[]) => {
    const ids = slotIds && slotIds.length > 0 ? slotIds : [id];
    const msg =
      ids.length > 1
        ? `Delete this combined session and all its ${ids.length} hourly entries from the timetable?`
        : 'Are you sure you want to delete this timetable slot?';
    if (!confirm(msg)) return;
    for (const sId of ids) {
      await fetch(`/api/timetable/entries?id=${sId}`, { method: 'DELETE' });
    }
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

  const getDayOfWeekFromDate = (dateStr: string): DayOfWeek => {
    if (!dateStr) return 'Monday';
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3) return 'Monday';
    const [y, m, d] = parts;
    const date = new Date(y, m - 1, d, 12, 0, 0);
    return date.toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek;
  };

  const handleOverrideOptionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedOverrideOption(val);
    if (!val) {
      setOverrideSubject('');
      setOverrideSlotId('');
      return;
    }
    if (val.startsWith('merged:')) {
      const parts = val.split(':');
      // Format: "merged:SUBJECT:SLOTID"
      const subj = parts[1];
      const slotId = parts[2] || '';
      setOverrideSubject(subj);
      setOverrideSlotId(slotId);
      return;
    }
    if (val.startsWith('slot:')) {
      const slotId = val.replace('slot:', '');
      const foundSlot = slots.find((s) => s.id === slotId);
      if (foundSlot) {
        setOverrideSlotId(foundSlot.id);
        setOverrideSubject(foundSlot.subject);
        if (foundSlot.course) {
          setOverrideScope((foundSlot.course as CourseScope) || selectedCourse);
        }
      }
    } else if (val.startsWith('mod:')) {
      const modCode = val.replace('mod:', '');
      const foundMod = modules.find((m) => m.code === modCode);
      setOverrideSlotId('');
      setOverrideSubject(modCode);
      if (foundMod && foundMod.courseScope) {
        setOverrideScope(foundMod.courseScope);
      }
    } else if (val === 'custom') {
      setOverrideSlotId('');
      setOverrideSubject('');
    }
  };

  const handleCreateOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideSubject.trim()) {
      alert('Please select or specify the lecture module for this override.');
      return;
    }

    setIsSubmittingOverride(true);
    try {
      const res = await fetch('/api/timetable/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course: overrideScope,
          date: overrideDate,
          slotId: overrideSlotId || undefined,
          action: overrideAction,
          subject: overrideSubject.trim(),
          reason: overrideReason.trim(),
        }),
      });
      if (res.ok) {
        setOverrideSubject('');
        setOverrideSlotId('');
        setSelectedOverrideOption('');
        setOverrideReason('');
        await fetchTimetableData();
        alert('Date-specific lecture override published successfully! Live status is updated.');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to apply override');
      }
    } catch {
      alert('Failed to apply override');
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  const handleDeleteOverride = async (id: string) => {
    if (!confirm('Revert this lecture override? The regular timetable will resume.')) return;
    try {
      const res = await fetch(`/api/timetable/override?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchTimetableData();
      } else {
        alert('Failed to delete override');
      }
    } catch {
      alert('Failed to delete override');
    }
  };

  const overrideDayOfWeek = getDayOfWeekFromDate(overrideDate);
  const scheduledMergedOnOverrideDay = useMemo(() => {
    const dayRaw = slots.filter(
      (s) =>
        (s.course === overrideScope || overrideScope === 'ALL' || s.course === 'ALL') &&
        s.dayOfWeek.toLowerCase() === overrideDayOfWeek.toLowerCase()
    );
    return mergeTimetableSlots(dayRaw).filter(isAcademicLecture);
  }, [slots, overrideScope, overrideDayOfWeek]);

  const scheduledSlotsOnOverrideDay = slots.filter(
    (s) =>
      (s.course === overrideScope || overrideScope === 'ALL' || s.course === 'ALL') &&
      s.dayOfWeek.toLowerCase() === overrideDayOfWeek.toLowerCase() &&
      isAcademicLecture(s)
  );

  const daySlots = slots.filter(
    (s) => (s.course === selectedCourse || s.course === 'ALL') && s.dayOfWeek.toLowerCase() === selectedDay.toLowerCase()
  );

  const combinedDaySlots = useMemo(() => mergeTimetableSlots(daySlots), [daySlots]);
  const activeSlotsToDisplay = editorViewMode === 'combined' ? combinedDaySlots : daySlots;

  const weekDates = useMemo(() => getCurrentWeekDates(), []);
  const selectedDayDate = weekDates[selectedDay] || '';

  const dayWideOverride = useMemo(() => {
    return overrides.find(
      (o) =>
        o.date === selectedDayDate &&
        (o.course === selectedCourse || o.course === 'ALL') &&
        (o.action === 'holiday' ||
          (!o.slotId &&
            (normalizeSubject(o.subject).includes('postpone') ||
              normalizeSubject(o.subject).includes('cancel') ||
              normalizeSubject(o.subject).includes('all'))))
    );
  }, [overrides, selectedDayDate, selectedCourse]);

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

          {/* Editor Mode Control Bar: Combined Sessions vs Released Hourly Breakdown */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="text-xs font-mono text-slate-500">
              Schedule for <span className="font-bold text-slate-800">{selectedDay}</span> ({activeSlotsToDisplay.length} {editorViewMode === 'combined' ? 'Sessions' : 'Hourly Slots'})
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setEditorViewMode('combined')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    editorViewMode === 'combined'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  🔀 Combined Sessions View
                </button>
                <button
                  type="button"
                  onClick={() => setEditorViewMode('hourly')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    editorViewMode === 'hourly'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  📋 Hourly Breakdown (Released)
                </button>
              </div>
            </div>
          </div>

          {/* Day-wide Override Banner for Editor */}
          {dayWideOverride && (
            <div
              className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs font-mono font-bold shadow-xs ${
                dayWideOverride.action === 'holiday'
                  ? 'bg-purple-50/90 border-purple-300 text-purple-900'
                  : dayWideOverride.action === 'cancel'
                  ? 'bg-rose-50/90 border-rose-300 text-rose-900'
                  : 'bg-amber-50/90 border-amber-300 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>
                  {dayWideOverride.action === 'holiday'
                    ? '🌴 Academic / Public Holiday'
                    : dayWideOverride.action === 'cancel'
                    ? '🛑 All Lectures Canceled'
                    : '⚠️ Lectures Postponed'}{' '}
                  on {selectedDay} ({selectedDayDate}): {dayWideOverride.subject}
                  {dayWideOverride.reason ? ` · ${dayWideOverride.reason}` : ''}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-white/80 border text-[10px] uppercase font-black">
                {dayWideOverride.action}
              </span>
            </div>
          )}

          {/* Slots List with Edit & Delete Actions */}
          {loading ? (
            <div className="py-10 text-center text-slate-400 font-mono text-xs animate-pulse">
              Loading slots matrix...
            </div>
          ) : activeSlotsToDisplay.length === 0 ? (
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
              {activeSlotsToDisplay.map((s: any) => {
                const startMin = parseTimeToMinutes(s.startTime);
                const endMin = parseTimeToMinutes(s.endTime);
                const isToday = todayDayOfWeek.toLowerCase() === selectedDay.toLowerCase();
                const isOngoing = isToday && currentMinutesNow >= startMin && currentMinutesNow < endMin;

                const slotOverride = findMatchingOverride(
                  s,
                  overrides,
                  selectedDayDate,
                  selectedCourse
                );

                const isCancelled = slotOverride?.action === 'cancel';
                const isPostponed = slotOverride?.action === 'postpone';
                const isHoliday = slotOverride?.action === 'holiday';
                const isLunch = s.slotType === 'lunch';
                const isBreak = s.slotType === 'break';
                const isStudyOrEmpty = isStudyOrEmptySlot(s);
                const isClass = isAcademicLecture(s);

                let containerStyle = 'border-slate-200 hover:border-blue-300 bg-white';
                let timeBadgeStyle = 'bg-slate-100 text-slate-800';
                let subjectStyle = 'text-slate-900';

                if (isCancelled) {
                  containerStyle =
                    'bg-rose-50/90 border-2 border-rose-400 text-rose-950 shadow-md shadow-rose-500/10';
                  timeBadgeStyle = 'bg-rose-600 text-white font-black';
                  subjectStyle = 'line-through text-rose-700 font-black';
                } else if (isPostponed) {
                  containerStyle =
                    'bg-amber-50/90 border-2 border-amber-400 text-amber-950 shadow-md shadow-amber-500/10';
                  timeBadgeStyle = 'bg-amber-500 text-amber-950 font-black';
                  subjectStyle = 'text-amber-950 font-black';
                } else if (isHoliday) {
                  containerStyle =
                    'bg-purple-50/90 border-2 border-purple-400 text-purple-950 shadow-md shadow-purple-500/10';
                  timeBadgeStyle = 'bg-purple-600 text-white font-black';
                  subjectStyle = 'text-purple-950 font-black';
                } else if (isOngoing && isClass) {
                  containerStyle =
                    'bg-emerald-50/80 border-2 border-emerald-500 ring-2 ring-emerald-500/25 shadow-md shadow-emerald-500/10';
                  timeBadgeStyle = 'bg-emerald-600 text-white font-black';
                  subjectStyle = 'text-emerald-950 font-black';
                } else if (isOngoing && isLunch) {
                  containerStyle =
                    'bg-amber-50 border-2 border-amber-400 ring-2 ring-amber-400/25 shadow-md shadow-amber-400/10';
                  timeBadgeStyle = 'bg-amber-400 text-amber-950 font-black';
                  subjectStyle = 'text-amber-950 font-black';
                } else if (isLunch) {
                  containerStyle = 'bg-amber-50/40 border border-amber-200/80 hover:border-amber-300';
                  timeBadgeStyle = 'bg-amber-100 text-amber-900 font-bold';
                  subjectStyle = 'text-amber-950 font-bold';
                } else if (isStudyOrEmpty) {
                  containerStyle = isOngoing
                    ? 'bg-slate-50 border-2 border-slate-300'
                    : 'bg-slate-50/60 border border-slate-200 hover:border-slate-300';
                  timeBadgeStyle = 'bg-slate-100 text-slate-600 font-medium';
                  subjectStyle = 'text-slate-700 font-bold';
                } else if (isBreak) {
                  containerStyle = 'bg-slate-50/60 border border-slate-200 hover:border-slate-300';
                  timeBadgeStyle = 'bg-slate-100 text-slate-700';
                  subjectStyle = 'text-slate-700 font-bold';
                }

                return (
                  <div
                    key={s.id}
                    className={`rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${containerStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`font-mono text-xs font-bold px-2.5 py-1 rounded-lg whitespace-nowrap ${timeBadgeStyle}`}>
                          {s.startTime} – {s.endTime}
                        </span>

                        {isCancelled && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase bg-rose-600 text-white shadow-xs">
                            CANCELLED: {slotOverride?.subject || 'CANCELLED'}
                          </span>
                        )}
                        {isPostponed && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase bg-amber-500 text-amber-950 shadow-xs">
                            POSTPONED: {slotOverride?.subject || 'POSTPONED'}
                          </span>
                        )}
                        {isHoliday && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase bg-purple-600 text-white shadow-xs">
                            HOLIDAY
                          </span>
                        )}
                        {isOngoing && isClass && !isCancelled && !isPostponed && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase bg-emerald-600 text-white animate-pulse">
                            LIVE NOW
                          </span>
                        )}
                        {isOngoing && isLunch && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase bg-amber-400 text-amber-950 animate-pulse">
                            LUNCH NOW
                          </span>
                        )}
                        {isOngoing && isStudyOrEmpty && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-slate-200 text-slate-700">
                            STUDY INTERVAL
                          </span>
                        )}
                        {s.isMerged && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-50 text-[#0088FF] border border-blue-200">
                            {s.subSlotCount} Hours Combined
                          </span>
                        )}
                      </div>

                      <div>
                        <div className={`font-heading font-black text-sm ${subjectStyle}`}>
                          {s.subject || (s.slotType === 'lunch' ? 'Lunch Break' : s.slotType === 'break' ? 'Break' : 'Practical / Study Period')}
                        </div>
                        <div className={`font-mono text-[11px] ${isOngoing && isClass ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                          {s.course === 'ALL' ? 'Common Module' : s.course} · {isStudyOrEmpty ? 'Practical / Study' : s.slotType} · {s.studentGroup || 'All'}
                        </div>
                        {s.breaksIncluded && s.breaksIncluded.length > 0 && (
                          <div className="text-[10px] font-mono text-blue-600 font-semibold mt-0.5">
                            Includes {s.breaksIncluded[0].label} ({s.breaksIncluded[0].startTime} – {s.breaksIncluded[0].endTime})
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      {/* Release combined session into hourly slots button */}
                      {s.isMerged && (
                        <button
                          type="button"
                          onClick={() => setEditorViewMode('hourly')}
                          className="px-2.5 py-1 text-[11px] font-mono font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          title="Release this combined block into separate hourly slots"
                        >
                          <span>Release Hourly</span>
                        </button>
                      )}

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => openEditSlotModal(s.rawSlots ? s.rawSlots[0] : s)}
                        className="p-2 text-slate-500 hover:text-[#0088FF] rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                        title={s.isMerged ? 'Edit base slot' : 'Edit slot'}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteSlot(s.id, s.slotIds)}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title={s.isMerged ? 'Delete combined session' : 'Delete slot'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Lecture Overrides Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <h2 className="font-heading font-black text-lg">
                Apply Date-Specific Lecture Override
              </h2>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold">
              {overrideDayOfWeek} Schedule Active
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Cancel or postpone a lecture on a specific date. Select from scheduled lectures on that day or available curriculum modules. Changes synchronize live to Home and Timetable views.
          </p>

          <form onSubmit={handleCreateOverride} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-semibold"
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
                  Scope
                </label>
                <select
                  value={overrideScope}
                  onChange={(e) => setOverrideScope(e.target.value as CourseScope)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                >
                  <option value={selectedCourse}>{selectedCourse} Only</option>
                  <option value="ALL">All TV Courses (Both TPOPT & TPRPT)</option>
                  <option value={selectedCourse === 'TPOPT' ? 'TPRPT' : 'TPOPT'}>
                    {selectedCourse === 'TPOPT' ? 'TPRPT Only' : 'TPOPT Only'}
                  </option>
                </select>
              </div>
            </div>

            {/* Subject Selector & Live Sync */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase">
                  Selective Subject / Module
                </label>
                <span className="text-[10px] font-mono text-slate-500">
                  {overrideDayOfWeek} · {scheduledMergedOnOverrideDay.length} scheduled lecture session(s)
                </span>
              </div>
              <select
                value={selectedOverrideOption}
                onChange={handleOverrideOptionChange}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-[#0088FF] focus:border-[#0088FF] outline-none bg-slate-50/50"
              >
                <option value="">-- Choose Module or Scheduled Lecture --</option>
                
                {/* 1. Scheduled lectures on that specific day (Merged continuous sessions) */}
                {scheduledMergedOnOverrideDay.length > 0 && (
                  <optgroup label={`📅 Scheduled Lectures on ${overrideDayOfWeek} (${overrideDate})`}>
                    {scheduledMergedOnOverrideDay.map((m) => (
                      <option key={m.id} value={`merged:${m.subject}:${m.id}`}>
                        ⭐ {m.subject} ({m.startTime} – {m.endTime}){m.isMerged ? ` · ${m.subSlotCount}hr Block` : ''} ({m.course})
                      </option>
                    ))}
                  </optgroup>
                )}

                {/* 2. Available curriculum modules */}
                <optgroup label="📚 Available Curriculum Modules (Database)">
                  {modules.map((m) => (
                    <option key={m.id} value={`mod:${m.code}`}>
                      {m.code} — {m.title} ({m.courseScope})
                    </option>
                  ))}
                </optgroup>

                {/* 3. Manual entry */}
                <optgroup label="✏️ Custom / Manual">
                  <option value="custom">Manual Subject Entry...</option>
                </optgroup>
              </select>
            </div>

            {/* If custom or refined subject */}
            {(selectedOverrideOption === 'custom' || overrideSubject) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase mb-1">
                    Selected Subject / Module {overrideSlotId && <span className="text-emerald-600 lowercase font-normal">(synchronized to scheduled slot)</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ENGLISH or DM10"
                    value={overrideSubject}
                    onChange={(e) => setOverrideSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase mb-1">
                    Reason / Notice (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Visiting lecturer unavailable, postponed"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={!overrideSubject || isSubmittingOverride}
                className="py-2.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{isSubmittingOverride ? 'Publishing...' : 'Publish Override & Sync'}</span>
              </button>
            </div>
          </form>

          {/* Active Overrides List with Delete button */}
          {overrides.length > 0 && (
            <div className="border-t border-slate-100 pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span>Active Lecture Overrides</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 text-slate-600">
                    {overrides.length}
                  </span>
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {overrides.map((ovr) => {
                  const isForSelectedDate = ovr.date === overrideDate;
                  return (
                    <div
                      key={ovr.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isForSelectedDate
                          ? 'bg-amber-50/50 border-amber-200/80 ring-1 ring-amber-300/30'
                          : 'bg-slate-50/50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase ${
                            ovr.action === 'cancel'
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {ovr.action}
                        </span>
                        <div>
                          <div className="font-heading font-bold text-sm text-slate-900 flex items-center gap-2">
                            <span>{ovr.subject}</span>
                            <span className="text-[10px] font-mono font-normal text-slate-500">
                              ({ovr.course})
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>📅 {ovr.date}</span>
                            {ovr.reason && (
                              <>
                                <span>·</span>
                                <span className="italic">{ovr.reason}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteOverride(ovr.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all self-end sm:self-center cursor-pointer"
                        title="Delete / Revert Override"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
                  <option value="empty">Practical / Self-Study Period</option>
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
