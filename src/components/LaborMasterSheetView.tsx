import React, { useState } from 'react';
import {
  Users,
  Search,
  Printer,
  DollarSign,
  UserPlus,
  CheckCircle,
  Clock,
  Briefcase,
  X,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Filter,
  Sparkles,
  Tag,
  Calendar,
} from 'lucide-react';
import {
  ConstructionAppData,
  Worker,
  WorkerRole,
  WorkerPayment,
  AttendanceStatus,
} from '../types';
import {
  generateWeekDates,
  calculateDayWage,
  formatCurrency,
  getSaturdayOfWeek,
  getPreviousWorkWeekSaturday,
  getNextWorkWeekSaturday,
  formatWorkWeekSummary,
  isFriday,
} from '../utils/constructionMath';

export const TRADE_INFO: Record<
  WorkerRole,
  { code: string; label: string; aliases: string[]; badgeBg: string; badgeBorder: string; badgeText: string }
> = {
  mason: {
    code: 'M',
    label: 'Mason',
    aliases: ['m', 'mas', 'mason', 'masons', 'raj', 'mistri'],
    badgeBg: 'bg-amber-100',
    badgeBorder: 'border-amber-300',
    badgeText: 'text-amber-900',
  },
  helper: {
    code: 'H',
    label: 'Helper',
    aliases: ['h', 'hlp', 'help', 'helper', 'helpers', 'shagird', 'half-mason', 'half mason'],
    badgeBg: 'bg-blue-100',
    badgeBorder: 'border-blue-300',
    badgeText: 'text-blue-900',
  },
  laborer: {
    code: 'L',
    label: 'Laborer',
    aliases: ['l', 'lab', 'labor', 'labour', 'laborer', 'laborers', 'mazdoor', 'beldar'],
    badgeBg: 'bg-stone-200',
    badgeBorder: 'border-stone-400',
    badgeText: 'text-stone-900',
  },
};

export const isWorkerMatchingSearch = (worker: Worker, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  // 1. Worker Name match
  if (worker.name.toLowerCase().includes(q)) return true;

  // 2. Trade Code match (e.g. "M", "H", "L", "MAS", "HLP", "LAB", "Mason", "Helper", "Laborer", "Raj", "Mazdoor")
  const trade = TRADE_INFO[worker.role];
  if (trade) {
    if (trade.code.toLowerCase() === q) return true;
    if (trade.label.toLowerCase().includes(q)) return true;
    if (trade.aliases.some((alias) => alias.toLowerCase() === q || alias.toLowerCase().startsWith(q) || q.startsWith(alias))) {
      return true;
    }
  }

  // 3. Phone, ID, or notes match
  if (worker.phone && worker.phone.toLowerCase().includes(q)) return true;
  if (worker.notes && worker.notes.toLowerCase().includes(q)) return true;
  if (worker.id && worker.id.toLowerCase().includes(q)) return true;

  return false;
};

interface LaborMasterSheetViewProps {
  data: ConstructionAppData;
  onUpdateData: (newData: ConstructionAppData) => void;
  weekStartDate: string;
  onSelectWeekStartDate: (date: string) => void;
}

export const LaborMasterSheetView: React.FC<LaborMasterSheetViewProps> = ({
  data,
  onUpdateData,
  weekStartDate,
  onSelectWeekStartDate,
}) => {
  const [roleFilter, setRoleFilter] = useState<'all' | WorkerRole>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddWorkerModalOpen, setIsAddWorkerModalOpen] = useState(false);
  const [payingWorker, setPayingWorker] = useState<Worker | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState<WorkerPayment['paymentType']>('weekly_settlement');
  const [paymentNotes, setPaymentNotes] = useState('');

  // 6 Days in the reporting work week (Saturday through Thursday, Friday off)
  const weekDates = generateWeekDates(weekStartDate, 6);

  // Active workers count
  const activeWorkersCount = data.workers.filter((w) => w.isActive).length;

  // Filtered workers by role AND search query (name or trade code)
  const filteredWorkers = data.workers.filter((w) => {
    if (!w.isActive) return false;
    if (roleFilter !== 'all' && w.role !== roleFilter) return false;
    if (searchQuery.trim() && !isWorkerMatchingSearch(w, searchQuery)) return false;
    return true;
  });

  // Calculate worker's multi-site toll and earnings for the chosen week
  const getWorkerWeekReport = (worker: Worker) => {
    let totalUnits = 0;
    let totalGrossEarnings = 0;
    const dailySiteToll: Record<
      string,
      Array<{
        siteCode: string;
        siteName: string;
        status: AttendanceStatus;
        units: number;
        wage: number;
      }>
    > = {};

    weekDates.forEach((w) => {
      const records = data.attendance.filter(
        (a) => a.workerId === worker.id && a.date === w.date && a.units > 0
      );

      dailySiteToll[w.date] = records.map((rec) => {
        const site = data.sites.find((s) => s.id === rec.siteId);
        const wage = rec.wage || calculateDayWage(rec.units, worker.dailyWage);
        totalUnits += rec.units;
        totalGrossEarnings += wage;
        return {
          siteCode: site?.code || 'Site',
          siteName: site?.name || '',
          status: rec.status,
          units: rec.units,
          wage,
        };
      });
    });

    // Worker payments recorded for this week or in general
    const workerPayments = data.workerPayments.filter(
      (p) => p.workerId === worker.id && p.weekStartDate === weekStartDate
    );
    const totalPaidThisWeek = workerPayments.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = Math.max(0, totalGrossEarnings - totalPaidThisWeek);

    return {
      totalUnits,
      totalGrossEarnings,
      dailySiteToll,
      totalPaidThisWeek,
      balanceDue,
    };
  };

  // High-level aggregates
  const grandStats = filteredWorkers.reduce(
    (acc, worker) => {
      const report = getWorkerWeekReport(worker);
      acc.totalDays += report.totalUnits;
      acc.totalEarnings += report.totalGrossEarnings;
      acc.totalPaid += report.totalPaidThisWeek;
      acc.totalDue += report.balanceDue;
      return acc;
    },
    { totalDays: 0, totalEarnings: 0, totalPaid: 0, totalDue: 0 }
  );

  // Handle Pay Worker
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingWorker || !paymentAmount) return;

    const newPayment: WorkerPayment = {
      id: `wp-${Date.now()}`,
      workerId: payingWorker.id,
      date: new Date().toISOString().split('T')[0],
      amount: parseFloat(paymentAmount) || 0,
      weekStartDate,
      paymentType,
      notes: paymentNotes || `Payment for week ${weekStartDate}`,
    };

    onUpdateData({
      ...data,
      workerPayments: [...data.workerPayments, newPayment],
    });

    setPayingWorker(null);
    setPaymentAmount('');
    setPaymentNotes('');
  };

  // Handle Add New Worker
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerRole, setNewWorkerRole] = useState<WorkerRole>('mason');
  const [newWorkerWage, setNewWorkerWage] = useState('');
  const [newWorkerPhone, setNewWorkerPhone] = useState('');

  const handleAddWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName || !newWorkerWage) return;
    const wageNum = parseFloat(newWorkerWage) || 0;
    const newWorker: Worker = {
      id: `w-${Date.now()}`,
      name: newWorkerName,
      role: newWorkerRole,
      dailyWage: wageNum,
      phone: newWorkerPhone,
      isActive: true,
      wageHistory: [
        {
          effectiveDate: new Date().toISOString().split('T')[0],
          dailyWage: wageNum,
        },
      ],
    };

    onUpdateData({
      ...data,
      workers: [...data.workers, newWorker],
    });

    setNewWorkerName('');
    setNewWorkerWage('');
    setNewWorkerPhone('');
    setIsAddWorkerModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Controls Bar */}
      <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4 print:hidden">
        {/* Row 1: Week Navigation and Work Week Info */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Week navigation with Saturday-to-Thursday awareness */}
            <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-xl p-1 min-h-[44px]">
              <button
                type="button"
                onClick={() => onSelectWeekStartDate(getPreviousWorkWeekSaturday(weekStartDate))}
                title="Previous Work Week (Saturday)"
                className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center transition"
                aria-label="Previous work week"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 px-2">
                <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                <label htmlFor="labor-week-select" className="text-[11px] font-bold text-stone-500 uppercase tracking-wider shrink-0">
                  Week (Sat):
                </label>
                <input
                  id="labor-week-select"
                  type="date"
                  value={weekStartDate}
                  onChange={(e) => {
                    const chosen = e.target.value;
                    if (chosen) {
                      onSelectWeekStartDate(getSaturdayOfWeek(chosen));
                    }
                  }}
                  className="bg-transparent font-bold text-stone-800 text-sm focus:outline-none cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={() => onSelectWeekStartDate(getNextWorkWeekSaturday(weekStartDate))}
                title="Next Work Week (Saturday)"
                className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center transition"
                aria-label="Next work week"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Standard Work Week Notice Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200/80 rounded-xl text-xs font-semibold text-amber-900">
              <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>Sat — Thu Work Week</span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-950">
                Friday Off
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddWorkerModalOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-[0.98] rounded-xl shadow-sm transition"
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>Add Worker</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 active:scale-[0.98] border border-stone-300 rounded-xl transition"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>Print Toll</span>
            </button>
          </div>
        </div>

        {/* Row 2: Search Bar & Trade Code Quick Filter */}
        <div className="space-y-2.5 pt-2 border-t border-stone-100">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input Bar */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="labor-search-bar"
                type="text"
                placeholder="Search laborers by name or trade code (e.g. Sultan, Nasir, Mason, M, H, L)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search laborers by name or trade code"
                className="w-full pl-10 pr-10 py-2.5 min-h-[44px] text-sm rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition text-stone-900 placeholder:text-stone-400 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search query"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Role Filter Tabs */}
            <div className="overflow-x-auto no-scrollbar py-0.5">
              <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs font-semibold min-w-max">
                <button
                  onClick={() => setRoleFilter('all')}
                  className={`px-3 py-2 min-h-[40px] rounded-lg transition flex items-center justify-center shrink-0 ${
                    roleFilter === 'all'
                      ? 'bg-amber-600 text-white shadow-sm font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  All ({data.workers.filter((w) => w.isActive).length})
                </button>
                <button
                  onClick={() => setRoleFilter('mason')}
                  className={`px-3 py-2 min-h-[40px] rounded-lg transition flex items-center gap-1.5 shrink-0 ${
                    roleFilter === 'mason'
                      ? 'bg-amber-600 text-white shadow-sm font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <span className="font-mono text-[10px] bg-white/20 px-1 py-0.2 rounded font-black">M</span>
                  <span>Masons ({data.workers.filter((w) => w.role === 'mason' && w.isActive).length})</span>
                </button>
                <button
                  onClick={() => setRoleFilter('helper')}
                  className={`px-3 py-2 min-h-[40px] rounded-lg transition flex items-center gap-1.5 shrink-0 ${
                    roleFilter === 'helper'
                      ? 'bg-amber-600 text-white shadow-sm font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <span className="font-mono text-[10px] bg-white/20 px-1 py-0.2 rounded font-black">H</span>
                  <span>Helpers ({data.workers.filter((w) => w.role === 'helper' && w.isActive).length})</span>
                </button>
                <button
                  onClick={() => setRoleFilter('laborer')}
                  className={`px-3 py-2 min-h-[40px] rounded-lg transition flex items-center gap-1.5 shrink-0 ${
                    roleFilter === 'laborer'
                      ? 'bg-amber-600 text-white shadow-sm font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <span className="font-mono text-[10px] bg-white/20 px-1 py-0.2 rounded font-black">L</span>
                  <span>Laborers ({data.workers.filter((w) => w.role === 'laborer' && w.isActive).length})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Trade Code shortcuts & active search summary */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mr-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-amber-600" /> Quick Codes:
              </span>
              <button
                type="button"
                onClick={() => setSearchQuery(searchQuery === 'M' ? '' : 'M')}
                className={`px-2 py-1 rounded-md text-xs font-semibold border transition flex items-center gap-1 min-h-[32px] ${
                  searchQuery.toUpperCase() === 'M' || searchQuery.toLowerCase() === 'mason'
                    ? 'bg-amber-600 text-white border-amber-700 shadow-2xs font-bold'
                    : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <span className="font-mono font-black text-[10px] bg-amber-200/80 px-1 rounded text-amber-950">M</span>
                <span>Mason (Raj)</span>
              </button>
              <button
                type="button"
                onClick={() => setSearchQuery(searchQuery === 'H' ? '' : 'H')}
                className={`px-2 py-1 rounded-md text-xs font-semibold border transition flex items-center gap-1 min-h-[32px] ${
                  searchQuery.toUpperCase() === 'H' || searchQuery.toLowerCase() === 'helper'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-2xs font-bold'
                    : 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
                }`}
              >
                <span className="font-mono font-black text-[10px] bg-blue-200/80 px-1 rounded text-blue-950">H</span>
                <span>Helper (Shagird)</span>
              </button>
              <button
                type="button"
                onClick={() => setSearchQuery(searchQuery === 'L' ? '' : 'L')}
                className={`px-2 py-1 rounded-md text-xs font-semibold border transition flex items-center gap-1 min-h-[32px] ${
                  searchQuery.toUpperCase() === 'L' || searchQuery.toLowerCase() === 'laborer'
                    ? 'bg-stone-800 text-white border-stone-900 shadow-2xs font-bold'
                    : 'bg-stone-100 text-stone-800 border-stone-300 hover:bg-stone-200'
                }`}
              >
                <span className="font-mono font-black text-[10px] bg-stone-300 px-1 rounded text-stone-900">L</span>
                <span>Laborer (Mazdoor)</span>
              </button>
            </div>

            {/* Results Count & Clear */}
            <div className="flex items-center gap-2 ml-auto text-xs">
              <span className="text-stone-500">
                Showing <strong className="text-stone-900 font-mono font-bold">{filteredWorkers.length}</strong> of{' '}
                <span className="font-mono">{activeWorkersCount}</span> workers
              </span>
              {(searchQuery || roleFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setRoleFilter('all');
                  }}
                  className="text-amber-700 hover:text-amber-900 font-semibold underline text-[11px] min-h-[32px] flex items-center"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
        <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Active Workforce</span>
          <p className="text-xl font-black text-stone-900 mt-1 font-mono">{filteredWorkers.length} Workers</p>
          <span className="text-[11px] text-stone-500">{grandStats.totalDays} Total Man-Days</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Total Wages Earned</span>
          <p className="text-xl font-black text-blue-900 mt-1 font-mono">{formatCurrency(grandStats.totalEarnings)}</p>
          <span className="text-[11px] text-stone-500">As per daily wage rates</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Paid / Settled</span>
          <p className="text-xl font-black text-emerald-800 mt-1 font-mono">{formatCurrency(grandStats.totalPaid)}</p>
          <span className="text-[11px] text-emerald-600 font-semibold">Cleared this week</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Net Balance Due</span>
          <p className="text-xl font-black text-amber-900 mt-1 font-mono">{formatCurrency(grandStats.totalDue)}</p>
          <span className="text-[11px] text-amber-700 font-semibold">Pending payroll payout</span>
        </div>
      </div>

      {/* THE MASTER LABOR TOLL & PAYROLL SHEET */}
      <div className="bg-white rounded-2xl border-2 border-stone-400 p-3 sm:p-6 shadow-xl max-w-5xl mx-auto font-sans text-stone-900 print:shadow-none print:border-none print:p-0">
        {/* Header */}
        <div className="border-b-2 border-stone-800 pb-3 mb-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-stone-900 uppercase">
              Labor Master Sheet &amp; Daily Site Toll
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Tracks multi-site daily attendance allocations, total man-days, daily wage computation, and payment settlement.
            </p>
          </div>
          <div className="sm:text-right">
            <span className="text-[10px] sm:text-xs uppercase tracking-widest text-stone-500 font-semibold block">Reporting Week</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-stone-800">
              {weekDates[0]?.formatted} — {weekDates[weekDates.length - 1]?.formatted}
            </span>
          </div>
        </div>

        {/* Master Toll Table Container with Mobile Swipe indicator */}
        <div className="border-2 border-stone-800 rounded-lg overflow-hidden">
          <div className="block sm:hidden bg-stone-100 text-stone-600 text-[11px] font-semibold py-1.5 px-3 border-b border-stone-200 text-center">
            ← Swipe horizontally to view all week days, daily wages &amp; payout →
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-xs">
              <thead>
                <tr className="bg-stone-200 border-b-2 border-stone-800 text-stone-800 font-bold">
                  <th className="py-2.5 px-3 border-r-2 border-stone-800 w-36">Worker &amp; Role</th>
                  <th className="py-2.5 px-2 text-right border-r border-stone-400 w-24">Daily Wage</th>
                  {weekDates.map((w) => (
                    <th key={w.date} className="py-2.5 px-1.5 text-center border-r border-stone-400 font-mono w-24">
                      <div>{w.dayNumber}</div>
                      <div className="text-[10px] font-normal text-stone-500 uppercase">{w.dayShort}</div>
                    </th>
                  ))}
                  <th className="py-2.5 px-2 text-center border-r border-stone-400 w-16">Days</th>
                  <th className="py-2.5 px-2 text-right border-r border-stone-400 w-24">Earned</th>
                  <th className="py-2.5 px-2 text-right border-r border-stone-400 w-20">Paid</th>
                  <th className="py-2.5 px-2 text-right border-r border-stone-400 w-20">Due</th>
                  <th className="py-2.5 px-2 text-center w-20 print:hidden">Action</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-stone-300">
              {filteredWorkers.length === 0 ? (
                <tr>
                  <td
                    colSpan={weekDates.length + 6}
                    className="py-12 px-4 text-center text-stone-500 bg-stone-50/60"
                  >
                    <Users className="w-10 h-10 text-stone-400 mx-auto mb-2 opacity-70" />
                    <p className="font-bold text-stone-800 text-sm">
                      {searchQuery
                        ? `No laborers found matching "${searchQuery}"`
                        : 'No active laborers found in this category.'}
                    </p>
                    <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                      Search quickly by name (e.g. Nasir, Sultan) or trade code (<strong>M</strong> for Mason, <strong>H</strong> for Helper, <strong>L</strong> for Laborer).
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setRoleFilter('all');
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-xl border border-amber-300 transition"
                    >
                      Clear Search &amp; Show All Workers
                    </button>
                  </td>
                </tr>
              ) : (
                filteredWorkers.map((worker) => {
                  const report = getWorkerWeekReport(worker);
                  const trade = TRADE_INFO[worker.role];
                  return (
                    <tr key={worker.id} className="hover:bg-amber-50/30 transition">
                      {/* Worker Info with Trade Code Badge */}
                      <td className="py-2 px-3 border-r-2 border-stone-800">
                        <div className="flex items-baseline justify-between gap-1">
                          <span className="font-bold text-stone-900">{worker.name}</span>
                          <span
                            className={`font-mono text-[10px] font-black px-1.5 py-0.5 rounded border ${trade.badgeBg} ${trade.badgeBorder} ${trade.badgeText}`}
                            title={`Trade Code: ${trade.code} (${trade.label})`}
                          >
                            [{trade.code}]
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                              worker.role === 'mason'
                                ? 'bg-amber-100 text-amber-800'
                                : worker.role === 'helper'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-stone-200 text-stone-700'
                            }`}
                          >
                            {worker.role}
                          </span>
                          {worker.phone && <span className="text-[9px] text-stone-400 font-mono">{worker.phone}</span>}
                        </div>
                      </td>

                    {/* Daily Wage */}
                    <td className="py-2 px-2 text-right font-mono font-semibold text-stone-700 border-r border-stone-300">
                      Rs {worker.dailyWage.toLocaleString()}
                    </td>

                    {/* Daily Toll columns: Shows Site code and Status! */}
                    {weekDates.map((w) => {
                      const sitesWorked = report.dailySiteToll[w.date] || [];
                      const hasWorked = sitesWorked.length > 0;
                      return (
                        <td
                          key={w.date}
                          className={`py-1.5 px-1 text-center border-r border-stone-300 ${
                            hasWorked ? 'bg-amber-100/40 font-bold' : 'text-stone-300'
                          }`}
                        >
                          {hasWorked ? (
                            <div className="space-y-0.5">
                              {sitesWorked.map((s, idx) => (
                                <div key={idx} className="leading-tight">
                                  <span className="font-mono text-[10px] text-blue-900 font-extrabold block">
                                    {s.siteCode}
                                  </span>
                                  <span className="text-[10px] text-amber-900 font-bold font-mono">
                                    {s.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-stone-300">-</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Total Days */}
                    <td className="py-2 px-2 text-center font-mono font-bold text-stone-800 border-r border-stone-300">
                      {report.totalUnits}
                    </td>

                    {/* Gross Earned */}
                    <td className="py-2 px-2 text-right font-mono font-bold text-blue-900 border-r border-stone-300">
                      Rs {report.totalGrossEarnings.toLocaleString()}
                    </td>

                    {/* Paid */}
                    <td className="py-2 px-2 text-right font-mono text-emerald-800 border-r border-stone-300">
                      {report.totalPaidThisWeek > 0 ? `Rs ${report.totalPaidThisWeek.toLocaleString()}` : '-'}
                    </td>

                    {/* Due */}
                    <td className="py-2 px-2 text-right font-mono font-extrabold text-amber-950 border-r border-stone-300">
                      Rs {report.balanceDue.toLocaleString()}
                    </td>

                    {/* Action */}
                    <td className="py-2 px-2 text-center print:hidden">
                      {report.balanceDue > 0 ? (
                        <button
                          onClick={() => {
                            setPayingWorker(worker);
                            setPaymentAmount(String(report.balanceDue));
                          }}
                          className="px-2 py-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition"
                        >
                          Pay
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center justify-center gap-0.5">
                          <CheckCircle className="w-3 h-3" /> Paid
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
            <tfoot>
              <tr className="bg-stone-200 border-t-2 border-stone-800 font-bold text-xs">
                <td className="py-2.5 px-3 border-r-2 border-stone-800">
                  Total Summary ({filteredWorkers.length} workers)
                </td>
                <td className="py-2.5 px-2 border-r border-stone-400"></td>
                <td colSpan={weekDates.length} className="py-2.5 px-2 text-right border-r border-stone-400 text-stone-600 font-normal">
                  All active sites combined
                </td>
                <td className="py-2.5 px-2 text-center font-mono font-black border-r border-stone-400">
                  {grandStats.totalDays}
                </td>
                <td className="py-2.5 px-2 text-right font-mono font-black text-blue-900 border-r border-stone-400">
                  Rs {grandStats.totalEarnings.toLocaleString()}
                </td>
                <td className="py-2.5 px-2 text-right font-mono font-black text-emerald-800 border-r border-stone-400">
                  Rs {grandStats.totalPaid.toLocaleString()}
                </td>
                <td className="py-2.5 px-2 text-right font-mono font-black text-amber-950 border-r border-stone-400">
                  Rs {grandStats.totalDue.toLocaleString()}
                </td>
                <td className="print:hidden"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

      {/* MODAL: Settle / Pay Worker */}
      {payingWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 my-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600 shrink-0" />
                <h3 className="font-bold text-stone-900 text-base">Record Payment to {payingWorker.name}</h3>
              </div>
              <button
                onClick={() => setPayingWorker(null)}
                aria-label="Close pay worker modal"
                className="p-2 text-stone-400 hover:text-stone-700 min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-600">Worker Role:</span>
                  <span className="font-bold capitalize text-stone-900">{payingWorker.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">Daily Wage:</span>
                  <span className="font-bold font-mono text-stone-900">Rs {payingWorker.dailyWage.toLocaleString()}</span>
                </div>
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Amount to Pay (Rs)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl font-mono font-bold text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Payment Type</label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value as any)}
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl font-semibold text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="weekly_settlement">Full Weekly Settlement</option>
                  <option value="partial">Partial Payment</option>
                  <option value="advance">Advance Payment</option>
                  <option value="bonus">Bonus / Overtime Cash</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Payment Reference / Notes</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Paid in cash at 813-D site"
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setPayingWorker(null)}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl text-stone-600 bg-stone-100 hover:bg-stone-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 min-h-[44px] rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 font-bold active:scale-[0.98] transition shadow-sm"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add New Worker */}
      {isAddWorkerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 my-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-stone-900 text-base">Add New Construction Worker</h3>
              <button
                onClick={() => setIsAddWorkerModalOpen(false)}
                aria-label="Close add worker modal"
                className="p-2 text-stone-400 hover:text-stone-700 min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddWorker} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  placeholder="e.g. Nasir, Asif, Sultan"
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Category / Role</label>
                <select
                  value={newWorkerRole}
                  onChange={(e) => setNewWorkerRole(e.target.value as WorkerRole)}
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl font-semibold text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="mason">Mason (Mistri - Brickwork & Finishing)</option>
                  <option value="helper">Helper (Mortar mixer & Scaffolder)</option>
                  <option value="laborer">Laborer (Mazdoor - Excavation & Lifting)</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Daily Wage (Rs)</label>
                <input
                  type="number"
                  value={newWorkerWage}
                  onChange={(e) => setNewWorkerWage(e.target.value)}
                  placeholder="e.g. 1650 for mason, 1100 for laborer"
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl font-mono font-bold text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Phone Number (Optional)</label>
                <input
                  type="text"
                  value={newWorkerPhone}
                  onChange={(e) => setNewWorkerPhone(e.target.value)}
                  placeholder="e.g. +92 300 1234567"
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddWorkerModalOpen(false)}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl text-stone-600 bg-stone-100 hover:bg-stone-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 min-h-[44px] rounded-xl text-white bg-amber-600 hover:bg-amber-700 font-bold active:scale-[0.98] transition shadow-sm"
                >
                  Add Worker to Roster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
