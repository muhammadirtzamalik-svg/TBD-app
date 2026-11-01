import React, { useState } from 'react';
import {
  Calendar,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Users,
  HardHat,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import {
  ConstructionAppData,
  Worker,
  WorkerRole,
  AttendanceStatus,
  AttendanceRecord,
} from '../types';
import {
  calculateDayWage,
  formatCurrency,
  isFriday,
  parseLocalDate,
  getSaturdayOfWeek,
} from '../utils/constructionMath';

interface DailyAttendanceTollViewProps {
  data: ConstructionAppData;
  onUpdateData: (newData: ConstructionAppData) => void;
  selectedSiteId: string;
  onSelectSiteId: (siteId: string) => void;
}

export const DailyAttendanceTollView: React.FC<DailyAttendanceTollViewProps> = ({
  data,
  onUpdateData,
  selectedSiteId,
  onSelectSiteId,
}) => {
  const [selectedDate, setSelectedDate] = useState('2026-10-16');
  const [activeTab, setActiveTab] = useState<'all' | WorkerRole>('all');

  const site = data.sites.find((s) => s.id === selectedSiteId) || data.sites[0];

  // Workers filtered by role
  const activeWorkers = data.workers.filter(
    (w) => w.isActive && (activeTab === 'all' || w.role === activeTab)
  );

  // Get attendance status for a worker on the selected date and site
  const getWorkerRecord = (workerId: string) => {
    return data.attendance.find(
      (a) => a.workerId === workerId && a.date === selectedDate && a.siteId === site?.id
    );
  };

  // Check if worker was marked on ANY OTHER site on this date
  const getOtherSiteRecord = (workerId: string) => {
    return data.attendance.find(
      (a) => a.workerId === workerId && a.date === selectedDate && a.siteId !== site?.id && a.units > 0
    );
  };

  // Set attendance for a worker
  const handleSetAttendance = (
    worker: Worker,
    status: AttendanceStatus,
    units: number
  ) => {
    const existing = getWorkerRecord(worker.id);
    let updatedAttendance = [...data.attendance];

    if (units === 0) {
      if (existing) {
        updatedAttendance = updatedAttendance.filter((a) => a.id !== existing.id);
      }
    } else {
      const wage = calculateDayWage(units, worker.dailyWage);
      if (existing) {
        updatedAttendance = updatedAttendance.map((a) =>
          a.id === existing.id ? { ...a, status, units, wage } : a
        );
      } else {
        const newRecord: AttendanceRecord = {
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          workerId: worker.id,
          siteId: site.id,
          date: selectedDate,
          status,
          units,
          wage,
        };
        updatedAttendance.push(newRecord);
      }
    }

    onUpdateData({ ...data, attendance: updatedAttendance });
  };

  // Daily statistics for selected site & date
  const siteDayRecords = data.attendance.filter(
    (a) => a.siteId === site?.id && a.date === selectedDate && a.units > 0
  );

  const stats = siteDayRecords.reduce(
    (acc, record) => {
      const worker = data.workers.find((w) => w.id === record.workerId);
      if (!worker) return acc;
      acc.totalHeadcount += 1;
      acc.totalUnits += record.units;
      acc.totalCost += record.wage || calculateDayWage(record.units, worker.dailyWage);
      if (worker.role === 'mason') {
        acc.masonsCount += 1;
        acc.masonsCost += record.wage || calculateDayWage(record.units, worker.dailyWage);
      } else if (worker.role === 'helper') {
        acc.helpersCount += 1;
        acc.helpersCost += record.wage || calculateDayWage(record.units, worker.dailyWage);
      } else if (worker.role === 'laborer') {
        acc.laborersCount += 1;
        acc.laborersCost += record.wage || calculateDayWage(record.units, worker.dailyWage);
      }
      return acc;
    },
    {
      totalHeadcount: 0,
      totalUnits: 0,
      totalCost: 0,
      masonsCount: 0,
      masonsCost: 0,
      helpersCount: 0,
      helpersCost: 0,
      laborersCount: 0,
      laborersCost: 0,
    }
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Site/Date controls */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          {/* Site Selector */}
          <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 min-h-[44px]">
            <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
            <label htmlFor="daily-site-select" className="text-[11px] font-bold text-stone-500 uppercase tracking-wider shrink-0">
              Project Site:
            </label>
            <select
              id="daily-site-select"
              value={selectedSiteId}
              onChange={(e) => onSelectSiteId(e.target.value)}
              className="w-full bg-transparent font-bold text-stone-800 text-base sm:text-sm focus:outline-none cursor-pointer truncate"
            >
              {data.sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.details || s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Selector with Day of Week indicator */}
          <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 min-h-[44px]">
            <Calendar className="w-4 h-4 text-stone-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <label htmlFor="daily-date-select" className="text-[11px] font-bold text-stone-500 uppercase tracking-wider shrink-0">
                  Work Date:
                </label>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                  isFriday(selectedDate)
                    ? 'bg-amber-200 text-amber-950 font-black'
                    : 'bg-stone-200 text-stone-700'
                }`}>
                  {(() => {
                    const d = parseLocalDate(selectedDate);
                    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const dayShort = days[d.getDay()];
                    return isFriday(selectedDate) ? `${dayShort} (Off)` : dayShort;
                  })()}
                </span>
              </div>
              <input
                id="daily-date-select"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-transparent font-bold text-stone-800 text-base sm:text-sm focus:outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Friday Weekly Off Notification Banner */}
        {isFriday(selectedDate) && (
          <div className="flex items-start gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-300 text-amber-950 text-xs">
            <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Friday is standard weekly off (Jummah holiday)</span>
              <p className="text-[11px] text-amber-900 mt-0.5">
                Normal construction shifts run <strong>Saturday to Thursday</strong>. Any emergency or overtime attendance recorded today will still be added to the worker's earnings and weekly site totals.
              </p>
            </div>
          </div>
        )}

        {/* Quick Date Shortcuts */}
        <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 pt-1 border-t border-stone-100">
          <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider shrink-0">Work Week Days:</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedDate(getSaturdayOfWeek(selectedDate))}
              className="px-2.5 py-1.5 rounded-lg border border-stone-300 font-mono text-xs font-bold bg-stone-50 hover:bg-stone-100 text-stone-800 transition"
            >
              Sat (Week Start)
            </button>
            <button
              onClick={() => setSelectedDate('2026-10-15')}
              className={`px-2.5 py-1.5 rounded-lg border font-mono text-xs font-bold transition ${
                selectedDate === '2026-10-15'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              Thu Oct 15 (Handwritten Sheet)
            </button>
            <button
              onClick={() => setSelectedDate('2026-10-16')}
              className={`px-2.5 py-1.5 rounded-lg border font-mono text-xs font-bold transition ${
                selectedDate === '2026-10-16'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              Fri Oct 16 (Full Day)
            </button>
          </div>
        </div>
      </div>

      {/* Daily Toll Live Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-amber-50/80 p-3.5 sm:p-4 rounded-2xl border border-amber-200">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-800 block truncate">
            {site.code} Daily Headcount
          </span>
          <div className="text-xl sm:text-2xl font-black text-amber-950 font-mono mt-0.5 truncate">
            {stats.totalHeadcount} Workers
          </div>
          <span className="text-xs text-amber-800">{stats.totalUnits} Man-Days</span>
        </div>

        <div className="bg-blue-50/80 p-3.5 sm:p-4 rounded-2xl border border-blue-200">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-800 block truncate">
            Daily Labor Cost
          </span>
          <div className="text-xl sm:text-2xl font-black text-blue-950 font-mono mt-0.5 truncate">
            {formatCurrency(stats.totalCost)}
          </div>
          <span className="text-xs text-blue-800 truncate block">Directly feeds {site.code} Sheet</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-500 block truncate">
            Masons Present
          </span>
          <div className="text-base sm:text-lg font-black text-stone-900 font-mono mt-1 truncate">
            {stats.masonsCount} Mistri ({formatCurrency(stats.masonsCost)})
          </div>
          <span className="text-[11px] text-stone-500">Brickwork &amp; Columns</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-500 block truncate">
            Laborers &amp; Helpers
          </span>
          <div className="text-base sm:text-lg font-black text-stone-900 font-mono mt-1 truncate">
            {stats.laborersCount + stats.helpersCount} Mazdoor ({formatCurrency(stats.laborersCost + stats.helpersCost)})
          </div>
          <span className="text-[11px] text-stone-500">Mixing &amp; Carrying</span>
        </div>
      </div>

      {/* Worker Role Filter Tabs - Scrollable on narrow mobile */}
      <div className="overflow-x-auto no-scrollbar py-0.5">
        <div className="flex bg-stone-200/80 p-1 rounded-xl w-full sm:max-w-md text-xs font-bold min-w-max">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-2 min-h-[40px] rounded-lg transition flex items-center justify-center shrink-0 ${
              activeTab === 'all' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            All ({data.workers.filter((w) => w.isActive).length})
          </button>
          <button
            onClick={() => setActiveTab('mason')}
            className={`px-3 py-2 min-h-[40px] rounded-lg transition flex items-center justify-center shrink-0 ${
              activeTab === 'mason' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Masons ({data.workers.filter((w) => w.role === 'mason' && w.isActive).length})
          </button>
          <button
            onClick={() => setActiveTab('helper')}
            className={`px-3 py-2 min-h-[40px] rounded-lg transition flex items-center justify-center shrink-0 ${
              activeTab === 'helper' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Helpers ({data.workers.filter((w) => w.role === 'helper' && w.isActive).length})
          </button>
          <button
            onClick={() => setActiveTab('laborer')}
            className={`px-3 py-2 min-h-[40px] rounded-lg transition flex items-center justify-center shrink-0 ${
              activeTab === 'laborer' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Laborers ({data.workers.filter((w) => w.role === 'laborer' && w.isActive).length})
          </button>
        </div>
      </div>

      {/* 1-Tap Attendance Marker List */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden divide-y divide-stone-200">
        {activeWorkers.map((worker) => {
          const record = getWorkerRecord(worker.id);
          const currentStatus = record?.status || '';
          const otherSiteRecord = getOtherSiteRecord(worker.id);
          const otherSite = otherSiteRecord ? data.sites.find((s) => s.id === otherSiteRecord.siteId) : null;

          return (
            <div
              key={worker.id}
              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                currentStatus === 'P'
                  ? 'bg-amber-50/40'
                  : currentStatus === 'P/2'
                  ? 'bg-orange-50/30'
                  : currentStatus === '2P'
                  ? 'bg-purple-50/30'
                  : ''
              }`}
            >
              {/* Worker Name & Wage info */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base text-stone-900">{worker.name}</span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      worker.role === 'mason'
                        ? 'bg-amber-100 text-amber-900'
                        : worker.role === 'helper'
                        ? 'bg-blue-100 text-blue-900'
                        : 'bg-stone-200 text-stone-800'
                    }`}
                  >
                    {worker.role}
                  </span>
                  <span className="text-xs font-mono font-semibold text-stone-500">
                    Rs {worker.dailyWage.toLocaleString()}/day
                  </span>
                </div>

                {/* Subtext info */}
                <div className="flex items-center gap-3 text-xs text-stone-500">
                  {worker.phone && <span>{worker.phone}</span>}
                  {otherSiteRecord && otherSite && (
                    <span className="flex items-center gap-1 text-orange-700 font-semibold bg-orange-100/60 px-2 py-0.5 rounded">
                      <AlertTriangle className="w-3 h-3" /> Also marked on {otherSite.code} ({otherSiteRecord.status})
                    </span>
                  )}
                  {record && record.units > 0 && (
                    <span className="text-emerald-700 font-bold font-mono">
                      Site Earned: Rs {(record.wage || calculateDayWage(record.units, worker.dailyWage)).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick 1-Tap Attendance Buttons - Grid on mobile, flex on desktop */}
              <div className="grid grid-cols-4 sm:flex items-center gap-1.5 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-stone-200">
                {/* Full Day (P) */}
                <button
                  onClick={() => handleSetAttendance(worker, 'P', 1.0)}
                  className={`px-3 py-2.5 min-h-[44px] rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition active:scale-[0.97] ${
                    currentStatus === 'P'
                      ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400'
                      : 'bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-700'
                  }`}
                  title="Full day present (1.0)"
                >
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Full (P)</span>
                </button>

                {/* Half Day (P/2) */}
                <button
                  onClick={() => handleSetAttendance(worker, 'P/2', 0.5)}
                  className={`px-3 py-2.5 min-h-[44px] rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition active:scale-[0.97] ${
                    currentStatus === 'P/2'
                      ? 'bg-orange-600 text-white shadow-md ring-2 ring-orange-400'
                      : 'bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-700'
                  }`}
                  title="Half day present (0.5)"
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Half (P/2)</span>
                </button>

                {/* Double Shift (2P) */}
                <button
                  onClick={() => handleSetAttendance(worker, '2P', 2.0)}
                  className={`px-2.5 py-2.5 min-h-[44px] rounded-xl font-bold text-xs flex items-center justify-center transition active:scale-[0.97] ${
                    currentStatus === '2P'
                      ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400'
                      : 'bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-600'
                  }`}
                  title="Double shift / Overtime full day (2.0)"
                >
                  <span className="truncate">Double (2P)</span>
                </button>

                {/* Absent (A) / Clear */}
                <button
                  onClick={() => handleSetAttendance(worker, 'A', 0)}
                  className={`px-2.5 py-2.5 min-h-[44px] rounded-xl font-bold text-xs flex items-center justify-center transition active:scale-[0.97] ${
                    currentStatus === 'A' || !currentStatus
                      ? 'bg-stone-300 text-stone-800'
                      : 'bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-500'
                  }`}
                  title="Absent or off"
                >
                  <XCircle className="w-4 h-4 shrink-0 text-stone-700" />
                  <span className="sr-only sm:not-sr-only text-[10px] ml-1">Off</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
