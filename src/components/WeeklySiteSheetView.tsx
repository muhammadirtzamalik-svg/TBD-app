import React, { useState, useEffect } from 'react';
import {
  Printer,
  Calendar,
  Building2,
  Plus,
  Edit3,
  Clock,
  Sparkles,
  FileSpreadsheet,
  AlertCircle,
  X,
  Save,
  Trash2,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Users,
  CreditCard,
  Banknote,
  CheckCircle,
} from 'lucide-react';
import { WeeklyProgressPdfModal } from './WeeklyProgressPdfModal';
import { WeeklyLaborTollPdfModal } from './WeeklyLaborTollPdfModal';
import {
  ConstructionAppData,
  ProjectSite,
  Worker,
  WorkerRole,
  AttendanceStatus,
  AdditionalLaborPayment,
  SubcontractorPayment,
  WorkerPayment,
} from '../types';
import {
  generateWeekDates,
  parseAttendanceUnits,
  calculateDayWage,
  calculateWeeklySiteTotals,
  calculateSubcontractorLedger,
  formatCurrency,
  getSaturdayOfWeek,
  getPreviousWorkWeekSaturday,
  getNextWorkWeekSaturday,
  formatWorkWeekSummary,
  isFriday,
  getWorkerWeeklyAdvance,
} from '../utils/constructionMath';

interface WeeklySiteSheetViewProps {
  data: ConstructionAppData;
  onUpdateData: (newData: ConstructionAppData) => void;
  selectedSiteId: string;
  onSelectSiteId: (siteId: string) => void;
  weekStartDate: string;
  onSelectWeekStartDate: (date: string) => void;
}

export const WeeklySiteSheetView: React.FC<WeeklySiteSheetViewProps> = ({
  data,
  onUpdateData,
  selectedSiteId,
  onSelectSiteId,
  weekStartDate,
  onSelectWeekStartDate,
}) => {
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isAddSubPaymentModalOpen, setIsAddSubPaymentModalOpen] = useState(false);
  const [isNotesEditMode, setIsNotesEditMode] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isLaborTollPdfModalOpen, setIsLaborTollPdfModalOpen] = useState(false);

  // Advance modal states
  const [isAddAdvanceModalOpen, setIsAddAdvanceModalOpen] = useState(false);
  const [advanceWorkerId, setAdvanceWorkerId] = useState('');
  const [advanceAmountInput, setAdvanceAmountInput] = useState('');
  const [advanceDateInput, setAdvanceDateInput] = useState(weekStartDate);
  const [advanceNotesInput, setAdvanceNotesInput] = useState('');

  // Find currently selected site
  const site = data.sites.find((s) => s.id === selectedSiteId) || data.sites[0];

  // 6 Days of reporting work week (Saturday through Thursday, Friday off)
  const weekDates = generateWeekDates(weekStartDate, 6);

  // Normalized Saturday date for resilient matching across historic entries
  const normalizedSatWeek = getSaturdayOfWeek(weekStartDate);

  // Filter attendance for this site and week
  const siteAttendance = data.attendance.filter(
    (a) => a.siteId === site?.id && weekDates.some((w) => w.date === a.date)
  );

  // Group workers by role
  const masons = data.workers.filter((w) => w.role === 'mason' && w.isActive);
  const helpers = data.workers.filter((w) => w.role === 'helper' && w.isActive);
  const laborers = data.workers.filter((w) => w.role === 'laborer' && w.isActive);

  // Filter additional payments for this site and week (supporting both direct and Saturday-aligned matching)
  const additionalLabor = data.additionalPayments.filter(
    (ap) =>
      ap.siteId === site?.id &&
      (ap.weekStartDate === weekStartDate || getSaturdayOfWeek(ap.weekStartDate) === normalizedSatWeek)
  );

  // Filter subcontractor payments for this site and week
  const subPaymentsThisWeek = data.subcontractorPayments.filter(
    (sp) =>
      sp.siteId === site?.id &&
      (sp.weekStartDate === weekStartDate || getSaturdayOfWeek(sp.weekStartDate) === normalizedSatWeek)
  );

  // Weekly notes for this site and week
  const currentWeeklyNotes = data.weeklyNotes.find(
    (n) =>
      n.siteId === site?.id &&
      (n.weekStartDate === weekStartDate || getSaturdayOfWeek(n.weekStartDate) === normalizedSatWeek)
  );

  // Set or update individual worker advance for this site and week
  const handleSetWorkerAdvance = (workerId: string, amount: number) => {
    const existingIndex = data.workerPayments.findIndex(
      (p) =>
        p.workerId === workerId &&
        p.weekStartDate === weekStartDate &&
        (!p.siteId || p.siteId === site?.id) &&
        (p.paymentType === 'advance' || p.paymentType === 'partial')
    );

    let updatedPayments = [...data.workerPayments];
    if (existingIndex >= 0) {
      if (amount <= 0) {
        updatedPayments.splice(existingIndex, 1);
      } else {
        updatedPayments[existingIndex] = {
          ...updatedPayments[existingIndex],
          amount,
        };
      }
    } else if (amount > 0) {
      updatedPayments.push({
        id: `wp-adv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        workerId,
        siteId: site?.id,
        date: weekStartDate,
        weekStartDate,
        amount,
        paymentType: 'advance',
        notes: `Weekly advance for site ${site?.code || ''}`,
      });
    }

    onUpdateData({ ...data, workerPayments: updatedPayments });
  };

  // Record an advance via the modal dialog
  const handleRecordAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceWorkerId || !advanceAmountInput) return;
    const amount = parseFloat(advanceAmountInput) || 0;
    if (amount <= 0) return;

    handleSetWorkerAdvance(advanceWorkerId, amount);

    setAdvanceWorkerId('');
    setAdvanceAmountInput('');
    setAdvanceNotesInput('');
    setIsAddAdvanceModalOpen(false);
  };

  // Calculate worker wages, advances and net company owes for this site & week
  const getWorkerWeekStats = (worker: Worker) => {
    let totalUnits = 0;
    let totalWage = 0;
    const daysRecord: Record<string, { status: AttendanceStatus; units: number; wage: number }> = {};

    weekDates.forEach((w) => {
      const record = siteAttendance.find((a) => a.workerId === worker.id && a.date === w.date);
      if (record && record.units > 0) {
        totalUnits += record.units;
        const wage = record.wage || calculateDayWage(record.units, worker.dailyWage);
        totalWage += wage;
        daysRecord[w.date] = {
          status: record.status,
          units: record.units,
          wage,
        };
      } else {
        daysRecord[w.date] = { status: '', units: 0, wage: 0 };
      }
    });

    const advance = getWorkerWeeklyAdvance(worker.id, weekStartDate, data.workerPayments, site?.id);
    const balanceDue = totalWage - advance;

    return { totalUnits, totalWage, advance, balanceDue, daysRecord };
  };

  // Category totals with advance and balance accumulation
  const getCategoryStats = (workers: Worker[]) => {
    let activeHeadcount = 0;
    let totalWages = 0;
    let totalAdvance = 0;
    let totalBalance = 0;
    workers.forEach((worker) => {
      const stats = getWorkerWeekStats(worker);
      if (stats.totalUnits > 0 || stats.advance > 0) {
        activeHeadcount += 1;
        totalWages += stats.totalWage;
        totalAdvance += stats.advance;
        totalBalance += stats.balanceDue;
      }
    });
    return { activeHeadcount, totalWages, totalAdvance, totalBalance };
  };

  const masonsStats = getCategoryStats(masons);
  const helpersStats = getCategoryStats(helpers);
  const laborersStats = getCategoryStats(laborers);

  // Direct labor wages sum and advance totals
  const directLaborWages = masonsStats.totalWages + helpersStats.totalWages + laborersStats.totalWages;
  const totalLaborAdvances = masonsStats.totalAdvance + helpersStats.totalAdvance + laborersStats.totalAdvance;
  const totalLaborBalanceOwed = masonsStats.totalBalance + helpersStats.totalBalance + laborersStats.totalBalance;

  const additionalPaymentsSum = additionalLabor.reduce((sum, item) => sum + item.amount, 0);
  const subPaymentsSum = subPaymentsThisWeek.reduce((sum, item) => sum + item.amount, 0);
  const advancePaidByTBD = currentWeeklyNotes?.advancePaidByTBD ?? (additionalLabor.find((a) => a.item.toLowerCase().includes('rori'))?.amount || 10500);

  // Bricks/Rait editable money state
  const [bricksRaitInput, setBricksRaitInput] = useState<string>(
    currentWeeklyNotes?.bricksRaitLabor !== undefined ? String(currentWeeklyNotes.bricksRaitLabor) : '0'
  );

  useEffect(() => {
    setBricksRaitInput(
      currentWeeklyNotes?.bricksRaitLabor !== undefined ? String(currentWeeklyNotes.bricksRaitLabor) : '0'
    );
  }, [site?.id, weekStartDate, currentWeeklyNotes?.bricksRaitLabor]);

  const handleBricksRaitChange = (val: string) => {
    setBricksRaitInput(val);
    const num = parseFloat(val) || 0;
    const existingIndex = data.weeklyNotes.findIndex(
      (n) => n.siteId === site?.id && n.weekStartDate === weekStartDate
    );
    let updatedNotes = [...data.weeklyNotes];
    if (existingIndex >= 0) {
      updatedNotes[existingIndex] = {
        ...updatedNotes[existingIndex],
        bricksRaitLabor: num,
      };
    } else {
      updatedNotes.push({
        id: `notes-${site?.id}-${weekStartDate}`,
        siteId: site?.id || '',
        weekStartDate,
        bricksRaitLabor: num,
      });
    }
    onUpdateData({ ...data, weeklyNotes: updatedNotes });
  };

  const bricksRaitLabor = parseFloat(bricksRaitInput) || 0;

  // Calculate reconciliation figures
  const siteTotals = calculateWeeklySiteTotals({
    directLaborWages,
    bricksRaitLabor,
    additionalPaymentsSum,
    paidByTBD: advancePaidByTBD,
    subcontractorsSum: subPaymentsSum,
  });

  // Handle cell click to cycle attendance: empty -> P -> P/2 -> A -> empty
  const handleToggleAttendance = (worker: Worker, dateStr: string) => {
    const existing = data.attendance.find(
      (a) => a.workerId === worker.id && a.date === dateStr && a.siteId === site?.id
    );

    let nextStatus: AttendanceStatus = 'P';
    let nextUnits = 1.0;

    if (!existing || existing.status === '' || existing.units === 0) {
      nextStatus = 'P';
      nextUnits = 1.0;
    } else if (existing.status === 'P') {
      nextStatus = 'P/2';
      nextUnits = 0.5;
    } else if (existing.status === 'P/2') {
      nextStatus = 'A';
      nextUnits = 0;
    } else {
      nextStatus = '';
      nextUnits = 0;
    }

    const wage = calculateDayWage(nextUnits, worker.dailyWage);

    let updatedAttendance = [...data.attendance];
    if (existing) {
      if (nextUnits === 0 && nextStatus === '') {
        updatedAttendance = updatedAttendance.filter((a) => a.id !== existing.id);
      } else {
        updatedAttendance = updatedAttendance.map((a) =>
          a.id === existing.id ? { ...a, status: nextStatus, units: nextUnits, wage } : a
        );
      }
    } else if (nextUnits > 0) {
      updatedAttendance.push({
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        workerId: worker.id,
        siteId: site?.id || '',
        date: dateStr,
        status: nextStatus,
        units: nextUnits,
        wage,
      });
    }

    onUpdateData({ ...data, attendance: updatedAttendance });
  };

  // Add Additional Expense
  const [expenseItem, setExpenseItem] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePaidBy, setExpensePaidBy] = useState('TBD');

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseItem || !expenseAmount) return;
    const newEntry: AdditionalLaborPayment = {
      id: `add-${Date.now()}`,
      siteId: site.id,
      weekStartDate,
      date: weekDates[0].date,
      item: expenseItem,
      amount: parseFloat(expenseAmount) || 0,
      paidBy: expensePaidBy,
    };
    onUpdateData({
      ...data,
      additionalPayments: [...data.additionalPayments, newEntry],
    });
    setExpenseItem('');
    setExpenseAmount('');
    setIsAddExpenseModalOpen(false);
  };

  // Add Subcontractor Payment
  const [selectedSubId, setSelectedSubId] = useState('');
  const [subAmount, setSubAmount] = useState('');
  const [subDesc, setSubDesc] = useState('');
  const [subPaidBy, setSubPaidBy] = useState('Site Cash');

  const handleAddSubPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubId || !subAmount) return;
    const newEntry: SubcontractorPayment = {
      id: `subpay-${Date.now()}`,
      subcontractorId: selectedSubId,
      siteId: site.id,
      weekStartDate,
      date: weekDates[weekDates.length - 1].date,
      amount: parseFloat(subAmount) || 0,
      description: subDesc || 'Weekly subcontractor payment',
      paidBy: subPaidBy,
    };
    onUpdateData({
      ...data,
      subcontractorPayments: [...data.subcontractorPayments, newEntry],
    });
    setSelectedSubId('');
    setSubAmount('');
    setSubDesc('');
    setIsAddSubPaymentModalOpen(false);
  };

  // Edit Activities Modal State
  const [lastActDate, setLastActDate] = useState(site?.lastSignificantActivity?.date || '');
  const [lastActDesc, setLastActDesc] = useState(site?.lastSignificantActivity?.description || '');
  const [nextActDate, setNextActDate] = useState(site?.nextSignificantActivity?.date || '');
  const [nextActDesc, setNextActDesc] = useState(site?.nextSignificantActivity?.description || '');

  const handleSaveActivities = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSites = data.sites.map((s) => {
      if (s.id === site.id) {
        return {
          ...s,
          lastSignificantActivity: {
            date: lastActDate,
            description: lastActDesc,
            status: 'completed' as const,
          },
          nextSignificantActivity: {
            date: nextActDate,
            description: nextActDesc,
            status: 'planned' as const,
          },
        };
      }
      return s;
    });
    onUpdateData({ ...data, sites: updatedSites });
    setIsActivityModalOpen(false);
  };

  // Notes state
  const [editableNotes, setEditableNotes] = useState(
    currentWeeklyNotes?.notesText ||
      `Total = ${siteTotals.totalPaymentDue}\nPaid by TBD = ${siteTotals.paidByTBD}\nRem. Payable = ${siteTotals.remainingPayable}\n+ Asghar Shuttering = ${siteTotals.subcontractorsSum}\nNew Total = ${siteTotals.newWeeklyTotal}`
  );
  const [editableRemarks, setEditableRemarks] = useState(
    currentWeeklyNotes?.siteRemarks ||
      'Mason work on lintel was finished smoothly on Friday. Rori lifting completed for foundation fill. Ready for next activity slab shuttering.'
  );

  const handleSaveNotes = () => {
    const existingIndex = data.weeklyNotes.findIndex(
      (n) => n.siteId === site.id && n.weekStartDate === weekStartDate
    );
    let updatedNotes = [...data.weeklyNotes];
    const newRecord = {
      id: currentWeeklyNotes?.id || `notes-${site.id}-${weekStartDate}`,
      siteId: site.id,
      weekStartDate,
      notesText: editableNotes,
      advancePaidByTBD: siteTotals.paidByTBD,
      siteRemarks: editableRemarks,
    };
    if (existingIndex >= 0) {
      updatedNotes[existingIndex] = newRecord;
    } else {
      updatedNotes.push(newRecord);
    }
    onUpdateData({ ...data, weeklyNotes: updatedNotes });
    setIsNotesEditMode(false);
  };

  // Quick Print function for handwritten field sheet
  const handlePrint = () => {
    const originalTitle = document.title;
    const cleanSiteCode = site?.code ? site.code.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Site';
    document.title = `TBD_Weekly_Site_Sheet_${cleanSiteCode}_Week_${weekStartDate}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1200);
  };

  // Site Subcontractors for ledger
  const siteSubs = site ? data.subcontractors.filter((sub) => sub.siteId === site.id) : [];

  if (!site) {
    return (
      <div className="bg-white rounded-2xl border-2 border-dashed border-stone-300 p-8 text-center space-y-3 max-w-md mx-auto my-8">
        <Building2 className="w-12 h-12 text-stone-300 mx-auto" />
        <h3 className="font-bold text-stone-800 text-base">No Construction Projects Available</h3>
        <p className="text-xs text-stone-500">
          No project sites found. Please add a new site in the Projects &amp; Sites tab.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Toolbar / Controls */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-stone-200 shadow-sm space-y-3 print:hidden">
        {/* Row 1: Site Selector and Week Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          {/* Site Selector */}
          <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">
            <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
            <label htmlFor="site-select" className="text-[11px] font-bold text-stone-500 uppercase tracking-wider shrink-0">
              Site:
            </label>
            <select
              id="site-select"
              value={selectedSiteId}
              onChange={(e) => onSelectSiteId(e.target.value)}
              className="w-full bg-transparent font-bold text-stone-800 text-xs sm:text-sm focus:outline-none cursor-pointer truncate"
            >
              {data.sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} ({s.details || s.name})
                </option>
              ))}
            </select>
          </div>

          {/* Week Selector with Saturday-to-Thursday navigation */}
          <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-xl p-1 min-h-[44px]">
            <button
              type="button"
              onClick={() => onSelectWeekStartDate(getPreviousWorkWeekSaturday(weekStartDate))}
              title="Previous Work Week (Saturday)"
              className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center transition"
              aria-label="Previous work week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 px-2 flex-1 min-w-0">
              <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
              <label htmlFor="week-select" className="text-[11px] font-bold text-stone-500 uppercase tracking-wider shrink-0">
                Week (Sat):
              </label>
              <input
                id="week-select"
                type="date"
                value={weekStartDate}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    onSelectWeekStartDate(getSaturdayOfWeek(val));
                  }
                }}
                className="w-full bg-transparent font-bold text-stone-800 text-xs sm:text-sm focus:outline-none cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => onSelectWeekStartDate(getNextWorkWeekSaturday(weekStartDate))}
              title="Next Work Week (Saturday)"
              className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center transition"
              aria-label="Next work week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Work Week Schedule Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-amber-50/80 rounded-xl border border-amber-200/70 text-xs">
          <div className="flex items-center gap-1.5 text-amber-900 font-semibold">
            <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>Standard Work Week: <strong>Saturday to Thursday</strong> (6 active work days)</span>
          </div>
          <span className="font-bold text-[11px] px-2 py-0.5 rounded-md bg-amber-200 text-amber-950 uppercase tracking-wide">
            Friday Off (Jummah)
          </span>
        </div>

        {/* Row 2: Action Buttons - Responsive grid on mobile, flex on desktop */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2">
          <button
            onClick={() => setIsAddAdvanceModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 text-xs font-bold text-amber-900 bg-amber-100/80 hover:bg-amber-200 active:scale-[0.98] border border-amber-300 rounded-xl transition text-center shadow-2xs"
          >
            <CreditCard className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span className="truncate">+ Worker Advance</span>
          </button>
          <button
            onClick={() => setIsLaborTollPdfModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 active:scale-[0.98] rounded-xl shadow-md transition text-center"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Labor Toll PDF</span>
          </button>
          <button
            onClick={() => setIsAddExpenseModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 text-xs font-bold text-stone-800 bg-stone-100 hover:bg-stone-200 active:scale-[0.98] border border-stone-300 rounded-xl transition text-center shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate">+ Labor / Expense</span>
          </button>
          <button
            onClick={() => setIsAddSubPaymentModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 text-xs font-bold text-stone-800 bg-stone-100 hover:bg-stone-200 active:scale-[0.98] border border-stone-300 rounded-xl transition text-center shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-orange-600 shrink-0" />
            <span className="truncate">+ Subcontractor</span>
          </button>
          <button
            onClick={() => setIsActivityModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 active:scale-[0.98] border border-amber-300 rounded-xl transition text-center shadow-2xs"
          >
            <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span className="truncate">Site Milestones</span>
          </button>
          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-[0.98] rounded-xl shadow-md transition text-center col-span-2 sm:col-span-1"
          >
            <FileDown className="w-4 h-4 shrink-0" />
            <span className="truncate">Site Progress PDF</span>
          </button>
          <button
            onClick={handlePrint}
            className="hidden sm:flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 active:scale-[0.98] border border-stone-300 rounded-xl shadow-2xs transition text-center"
            title="Quick print current screen as field sheet"
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Quick Print</span>
          </button>
        </div>
      </div>

      {/* Labor Wage Settlement KPI Strip (Advances vs Net Company Owes) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
        <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Gross Wages Earned</div>
            <div className="text-base sm:text-lg font-mono font-black text-blue-950">Rs {directLaborWages.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-amber-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Advances Disbursed</span>
              <button
                onClick={() => setIsAddAdvanceModalOpen(true)}
                className="text-[10px] font-bold text-amber-700 hover:text-amber-900 underline"
              >
                + Record
              </button>
            </div>
            <div className="text-base sm:text-lg font-mono font-black text-amber-900">Rs {totalLaborAdvances.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-emerald-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <Banknote className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Net Company Owes</span>
              <button
                onClick={() => setIsLaborTollPdfModalOpen(true)}
                className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 underline"
              >
                PDF Statement
              </button>
            </div>
            <div className="text-base sm:text-lg font-mono font-black text-emerald-850">Rs {totalLaborBalanceOwed.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* THE PRINTABLE SHEET CONTAINER (Replicating user's handwritten paper) */}
      <div className={`sheet-paper bg-white rounded-2xl border-2 border-stone-400 p-3 sm:p-6 shadow-xl max-w-5xl mx-auto font-sans text-stone-900 print:shadow-none print:border-none print:p-0 ${isPdfModalOpen || isLaborTollPdfModalOpen ? 'print:hidden' : ''}`}>
        {/* Company Branding Banner */}
        <div className="text-center border-b-2 border-stone-800 pb-2 mb-3">
          <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-700">
            Engineers &amp; General Contractors
          </div>
          <h1 className="text-xl sm:text-3xl font-black tracking-wider uppercase text-stone-900 font-serif">
            TAHIR BUILDERS &amp; DEVELOPERS
          </h1>
          <p className="text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase text-stone-600">
            Weekly Construction Site Control &amp; Labor Toll Ledger
          </p>
        </div>

        {/* Top Header of the Handwritten Sheet: "813-D", "10 marla" */}
        <div className="border-b-2 border-stone-800 pb-3 mb-4 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-4">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-blue-900 uppercase font-mono whitespace-nowrap">
                {site?.code || '813-D'}
              </span>
              <span className="text-lg sm:text-xl font-bold text-stone-700 tracking-wide">
                {site?.details || '10 marla'}
              </span>
            </div>
            <div className="sm:text-right">
              <span className="text-[10px] sm:text-xs uppercase tracking-widest text-stone-500 font-semibold block">
                Weekly Site Sheet
              </span>
              <span className="text-xs sm:text-sm font-bold text-stone-800">
                Week: {weekDates[0]?.formatted} — {weekDates[weekDates.length - 1]?.formatted}
              </span>
            </div>
          </div>
          <div className="text-[11px] sm:text-xs text-stone-500 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span>Project: {site?.name} ({site?.location || 'On-site'})</span>
            <span>Client: {site?.clientName || 'Private Client'}</span>
          </div>
        </div>

        {/* Informative Hint for Digital Usage */}
        <div className="mb-3 text-[11px] text-stone-600 flex flex-col sm:flex-row sm:items-center justify-between gap-1 bg-amber-50/70 px-3 py-1.5 rounded-lg border border-amber-200/60 print:hidden">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Tap any cell to cycle <strong>P (Full)</strong> → <strong>P/2 (Half)</strong> → <strong>A (Absent)</strong></span>
          </span>
          <span className="font-mono text-[10px] text-amber-800">Auto real-time calculation</span>
        </div>

        {/* Main Attendance & Labor Table */}
        <div className="border-2 border-stone-800 rounded-lg overflow-hidden">
          <div className="block sm:hidden bg-stone-100 text-stone-600 text-[11px] font-semibold py-1.5 px-3 border-b border-stone-200 text-center">
            ← Swipe horizontally to view all week dates (12 to 17) &amp; wages →
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-left text-xs">
              <thead>
                <tr className="bg-stone-200/90 border-b-2 border-stone-800 text-stone-800 font-bold">
                  <th className="py-2.5 px-3 border-r-2 border-stone-800 w-36">Worker / Trade</th>
                  {weekDates.map((w) => (
                    <th key={w.date} className="py-2.5 px-2 text-center border-r border-stone-400 font-mono text-sm w-14">
                      <div>{w.dayNumber}</div>
                      <div className="text-[10px] font-normal text-stone-500 uppercase">{w.dayShort}</div>
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-right font-bold w-28">Total Wages</th>
                  <th className="py-2.5 px-2.5 text-right font-bold w-28 border-l border-stone-400 bg-amber-50/50">Advance (Rs)</th>
                  <th className="py-2.5 px-3 text-right font-bold w-32 border-l border-stone-400 bg-emerald-50/50">Company Owes</th>
                </tr>
              </thead>
              <tbody>
                {/* SECTION 1: MASONS */}
                <tr className="bg-stone-100 font-bold text-stone-800 border-b border-stone-400">
                  <td colSpan={weekDates.length + 4} className="py-1.5 px-3 uppercase tracking-wider text-[11px] bg-stone-200/50">
                    Masons (Mistri)
                  </td>
                </tr>
                {masons.map((mason) => {
                  const stats = getWorkerWeekStats(mason);
                  return (
                    <tr key={mason.id} className="border-b border-stone-300 hover:bg-amber-50/40 transition">
                      <td className="py-2.5 px-3 font-semibold text-blue-900 border-r-2 border-stone-800">
                        <div>{mason.name}</div>
                        <div className="text-[10px] text-stone-400 font-normal font-mono">Rs {mason.dailyWage}/d</div>
                      </td>
                      {weekDates.map((w) => {
                        const dayRec = stats.daysRecord[w.date];
                        const isPresent = dayRec.units > 0;
                        return (
                          <td
                            key={w.date}
                            onClick={() => handleToggleAttendance(mason, w.date)}
                            className={`py-2 px-1 text-center font-bold border-r border-stone-300 cursor-pointer select-none transition min-w-[42px] min-h-[44px] ${
                              isPresent ? 'bg-amber-100/60 text-amber-950 font-mono' : 'text-stone-300 hover:bg-stone-50'
                            }`}
                            title={`Click to toggle attendance for ${mason.name} on ${w.formatted}`}
                          >
                            <span className="inline-block min-h-[32px] min-w-[32px] leading-8">{dayRec.status || '-'}</span>
                          </td>
                        );
                      })}
                      <td className="py-2 px-3 text-right font-mono font-bold text-stone-900">
                        {stats.totalWage > 0 ? stats.totalWage.toLocaleString() : '-'}
                      </td>
                      {/* Advance taken column */}
                      <td className="py-1 px-2 text-right border-l border-stone-300 font-mono bg-amber-50/30">
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={stats.advance > 0 ? stats.advance : ''}
                            onChange={(e) => handleSetWorkerAdvance(mason.id, parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            aria-label={`Advance for ${mason.name}`}
                            className="w-20 text-right font-mono font-bold text-amber-900 bg-amber-100/60 border border-amber-300 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-amber-500 focus:bg-white print:hidden"
                          />
                          <span className="hidden print:inline font-bold font-mono text-amber-900">
                            {stats.advance > 0 ? stats.advance.toLocaleString() : '-'}
                          </span>
                        </div>
                      </td>
                      {/* Net Company Owes column */}
                      <td className="py-2 px-3 text-right border-l border-stone-300 font-mono font-bold whitespace-nowrap bg-emerald-50/30">
                        <span className={stats.balanceDue > 0 ? 'text-emerald-800 font-black' : stats.balanceDue < 0 ? 'text-red-600 font-black' : 'text-stone-400'}>
                          {stats.balanceDue !== 0 ? stats.balanceDue.toLocaleString() : '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {/* Masons Subtotal Row */}
                <tr className="bg-stone-100/80 border-b-2 border-stone-800 font-semibold text-xs">
                  <td colSpan={weekDates.length} className="py-2 px-3 text-right text-stone-600"></td>
                  <td className="py-2 px-2 text-center border-r border-stone-400 font-mono font-bold text-stone-800 whitespace-nowrap">
                    Total No. = {String(masonsStats.activeHeadcount).padStart(2, '0')}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-stone-900 whitespace-nowrap">
                    Wages = {masonsStats.totalWages.toLocaleString()}
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono font-bold text-amber-900 border-l border-stone-300 whitespace-nowrap bg-amber-50/50">
                    Adv = {masonsStats.totalAdvance.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-emerald-850 border-l border-stone-300 whitespace-nowrap bg-emerald-50/50">
                    Owes = {masonsStats.totalBalance.toLocaleString()}
                  </td>
                </tr>

                {/* SECTION 2: HELPERS */}
                <tr className="bg-stone-100 font-bold text-stone-800 border-b border-stone-400">
                  <td colSpan={weekDates.length + 4} className="py-1.5 px-3 uppercase tracking-wider text-[11px] bg-stone-200/50">
                    Helpers
                  </td>
                </tr>
                {helpers.length === 0 ? (
                  <tr className="border-b border-stone-300">
                    <td colSpan={weekDates.length + 4} className="py-2 px-3 text-stone-400 italic text-center">
                      No helpers assigned this week
                    </td>
                  </tr>
                ) : (
                  helpers.map((helper) => {
                    const stats = getWorkerWeekStats(helper);
                    return (
                      <tr key={helper.id} className="border-b border-stone-300 hover:bg-amber-50/40 transition">
                        <td className="py-2 px-3 font-semibold text-blue-900 border-r-2 border-stone-800">
                          <div>{helper.name}</div>
                          <div className="text-[10px] text-stone-400 font-normal font-mono">Rs {helper.dailyWage}/d</div>
                        </td>
                        {weekDates.map((w) => {
                          const dayRec = stats.daysRecord[w.date];
                          const isPresent = dayRec.units > 0;
                          return (
                            <td
                              key={w.date}
                              onClick={() => handleToggleAttendance(helper, w.date)}
                              className={`py-2 px-1 text-center font-bold border-r border-stone-300 cursor-pointer select-none transition min-w-[42px] min-h-[44px] ${
                                isPresent ? 'bg-amber-100/60 text-amber-950 font-mono' : 'text-stone-300 hover:bg-stone-50'
                              }`}
                              title={`Click to toggle attendance for ${helper.name} on ${w.formatted}`}
                            >
                              <span className="inline-block min-h-[32px] min-w-[32px] leading-8">{dayRec.status || '-'}</span>
                            </td>
                          );
                        })}
                        <td className="py-2 px-3 text-right font-mono font-bold text-stone-900">
                          {stats.totalWage > 0 ? stats.totalWage.toLocaleString() : '-'}
                        </td>
                        <td className="py-1 px-2 text-right border-l border-stone-300 font-mono bg-amber-50/30">
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={stats.advance > 0 ? stats.advance : ''}
                              onChange={(e) => handleSetWorkerAdvance(helper.id, parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              aria-label={`Advance for ${helper.name}`}
                              className="w-20 text-right font-mono font-bold text-amber-900 bg-amber-100/60 border border-amber-300 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-amber-500 focus:bg-white print:hidden"
                            />
                            <span className="hidden print:inline font-bold font-mono text-amber-900">
                              {stats.advance > 0 ? stats.advance.toLocaleString() : '-'}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right border-l border-stone-300 font-mono font-bold whitespace-nowrap bg-emerald-50/30">
                          <span className={stats.balanceDue > 0 ? 'text-emerald-800 font-black' : stats.balanceDue < 0 ? 'text-red-600 font-black' : 'text-stone-400'}>
                            {stats.balanceDue !== 0 ? stats.balanceDue.toLocaleString() : '-'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
                {/* Helpers Subtotal Row */}
                <tr className="bg-stone-100/80 border-b-2 border-stone-800 font-semibold text-xs">
                  <td colSpan={weekDates.length} className="py-2 px-3 text-right text-stone-600"></td>
                  <td className="py-2 px-2 text-center border-r border-stone-400 font-mono font-bold text-stone-800 whitespace-nowrap">
                    Total No. = {helpersStats.activeHeadcount > 0 ? String(helpersStats.activeHeadcount).padStart(2, '0') : '__'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-stone-900 whitespace-nowrap">
                    Wages = {helpersStats.totalWages > 0 ? helpersStats.totalWages.toLocaleString() : '___'}
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono font-bold text-amber-900 border-l border-stone-300 whitespace-nowrap bg-amber-50/50">
                    Adv = {helpersStats.totalAdvance.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-emerald-850 border-l border-stone-300 whitespace-nowrap bg-emerald-50/50">
                    Owes = {helpersStats.totalBalance.toLocaleString()}
                  </td>
                </tr>

                {/* SECTION 3: LABORER */}
                <tr className="bg-stone-100 font-bold text-stone-800 border-b border-stone-400">
                  <td colSpan={weekDates.length + 4} className="py-1.5 px-3 uppercase tracking-wider text-[11px] bg-stone-200/50">
                    Laborers (Mazdoor)
                  </td>
                </tr>
                {laborers.map((laborer) => {
                  const stats = getWorkerWeekStats(laborer);
                  return (
                    <tr key={laborer.id} className="border-b border-stone-300 hover:bg-amber-50/40 transition">
                      <td className="py-2.5 px-3 font-semibold text-blue-900 border-r-2 border-stone-800">
                        <div>{laborer.name}</div>
                        <div className="text-[10px] text-stone-400 font-normal font-mono">Rs {laborer.dailyWage}/d</div>
                      </td>
                      {weekDates.map((w) => {
                        const dayRec = stats.daysRecord[w.date];
                        const isPresent = dayRec.units > 0;
                        return (
                          <td
                            key={w.date}
                            onClick={() => handleToggleAttendance(laborer, w.date)}
                            className={`py-2 px-1 text-center font-bold border-r border-stone-300 cursor-pointer select-none transition min-w-[42px] min-h-[44px] ${
                              isPresent ? 'bg-amber-100/60 text-amber-950 font-mono' : 'text-stone-300 hover:bg-stone-50'
                            }`}
                            title={`Click to toggle attendance for ${laborer.name} on ${w.formatted}`}
                          >
                            <span className="inline-block min-h-[32px] min-w-[32px] leading-8">{dayRec.status || '-'}</span>
                          </td>
                        );
                      })}
                      <td className="py-2 px-3 text-right font-mono font-bold text-stone-900">
                        {stats.totalWage > 0 ? stats.totalWage.toLocaleString() : '-'}
                      </td>
                      <td className="py-1 px-2 text-right border-l border-stone-300 font-mono bg-amber-50/30">
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={stats.advance > 0 ? stats.advance : ''}
                            onChange={(e) => handleSetWorkerAdvance(laborer.id, parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            aria-label={`Advance for ${laborer.name}`}
                            className="w-20 text-right font-mono font-bold text-amber-900 bg-amber-100/60 border border-amber-300 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-amber-500 focus:bg-white print:hidden"
                          />
                          <span className="hidden print:inline font-bold font-mono text-amber-900">
                            {stats.advance > 0 ? stats.advance.toLocaleString() : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right border-l border-stone-300 font-mono font-bold whitespace-nowrap bg-emerald-50/30">
                        <span className={stats.balanceDue > 0 ? 'text-emerald-800 font-black' : stats.balanceDue < 0 ? 'text-red-600 font-black' : 'text-stone-400'}>
                          {stats.balanceDue !== 0 ? stats.balanceDue.toLocaleString() : '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {/* Laborer Subtotal Row */}
                <tr className="bg-stone-100/80 font-semibold text-xs border-b border-stone-400">
                  <td colSpan={weekDates.length} className="py-2 px-3 text-right text-stone-600"></td>
                  <td className="py-2 px-2 text-center border-r border-stone-400 font-mono font-bold text-stone-800 whitespace-nowrap">
                    Total No. = {String(laborersStats.activeHeadcount).padStart(2, '0')}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-stone-900 whitespace-nowrap">
                    Wages = {laborersStats.totalWages.toLocaleString()}
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono font-bold text-amber-900 border-l border-stone-300 whitespace-nowrap bg-amber-50/50">
                    Adv = {laborersStats.totalAdvance.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-emerald-850 border-l border-stone-300 whitespace-nowrap bg-emerald-50/50">
                    Owes = {laborersStats.totalBalance.toLocaleString()}
                  </td>
                </tr>

                {/* GRAND LABOR TOLL SUB-TOTAL ROW */}
                <tr className="bg-stone-200/90 border-t-2 border-stone-900 font-bold text-xs">
                  <td colSpan={weekDates.length} className="py-2.5 px-3 text-right uppercase tracking-wider text-stone-700 font-bold">
                    Active Workforce:
                  </td>
                  <td className="py-2.5 px-2 text-center border-r border-stone-400 font-mono font-black text-stone-900 whitespace-nowrap">
                    {String(masonsStats.activeHeadcount + helpersStats.activeHeadcount + laborersStats.activeHeadcount).padStart(2, '0')} Workers
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-blue-950 whitespace-nowrap">
                    Rs {directLaborWages.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono font-black text-amber-950 border-l border-stone-400 whitespace-nowrap bg-amber-100/70">
                    Rs {totalLaborAdvances.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-950 border-l border-stone-400 whitespace-nowrap bg-emerald-100/70">
                    Rs {totalLaborBalanceOwed.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* BOTTOM FINANCIAL RECONCILIATION SECTIONS (Exact match to paper layout) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* LEFT SIDE: Total Labor Payment + Additional Payments */}
          <div className="space-y-4">
            {/* Box 1: Total Labor Payment */}
            <div className="border-2 border-stone-800 rounded-lg p-3 bg-stone-50/50">
              <div className="flex items-center justify-between border-b border-stone-300 pb-1 mb-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-stone-700">
                  Total Labor Payment
                </h4>
                <span className="text-[10px] text-amber-800 font-semibold print:hidden">Editable Bricks/Rait</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-stone-200">
                  <span className="font-semibold text-stone-700">Direct Labor Wages =</span>
                  <span className="font-mono font-bold text-blue-900 text-sm">
                    {directLaborWages.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200 text-amber-900">
                  <span className="font-semibold">Less: Advances Taken =</span>
                  <span className="font-mono font-bold text-sm">
                    - {totalLaborAdvances.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200 text-emerald-900 bg-emerald-50/60 px-1 rounded">
                  <span className="font-bold">Net Direct Labor Balance Owes =</span>
                  <span className="font-mono font-black text-sm">
                    {totalLaborBalanceOwed.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-stone-200">
                  <label htmlFor="bricks-rait-input" className="font-semibold text-stone-700 flex items-center gap-1 cursor-pointer">
                    <span>Bricks/Rait Labor =</span>
                    <Edit3 className="w-3.5 h-3.5 text-amber-600 print:hidden" />
                  </label>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="text-stone-400 text-xs font-semibold print:hidden">Rs</span>
                    <input
                      id="bricks-rait-input"
                      type="number"
                      value={bricksRaitInput}
                      onChange={(e) => handleBricksRaitChange(e.target.value)}
                      placeholder="0"
                      title="Enter labor payment for Bricks / Rait (sand) lifting or piece-rate work"
                      className="w-28 text-right font-mono font-bold text-stone-900 border border-stone-300 rounded-lg px-2.5 py-1.5 min-h-[40px] text-base sm:text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner print:border-none print:shadow-none print:bg-transparent print:w-auto"
                    />
                  </div>
                </div>
                <div className="flex justify-between py-1.5 font-bold bg-stone-100/80 px-1.5 rounded-md">
                  <span className="text-stone-900">Total Labor Payout Required =</span>
                  <span className="font-mono font-black text-stone-900 text-sm">
                    {(totalLaborBalanceOwed + (parseFloat(bricksRaitInput) || 0)).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Box 2: Additional Payments (e.g. Rori: 10500 TBD) */}
            <div className="border-2 border-stone-800 rounded-lg p-3 bg-stone-50/50">
              <div className="flex items-center justify-between border-b border-stone-300 pb-1 mb-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-stone-700">
                  Additional Payments
                </h4>
                <button
                  onClick={() => setIsAddExpenseModalOpen(true)}
                  className="text-[10px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 print:hidden"
                >
                  <Plus className="w-3 h-3" /> Add Item
                </button>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-stone-500 text-[10px] border-b border-stone-200">
                    <th className="text-left py-1">Item</th>
                    <th className="text-right py-1">Amount</th>
                    <th className="text-right py-1">Paid By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {additionalLabor.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-2 text-stone-400 italic text-center">
                        No additional payments recorded
                      </td>
                    </tr>
                  ) : (
                    additionalLabor.map((item) => (
                      <tr key={item.id} className="font-medium">
                        <td className="py-1.5 font-semibold text-blue-900">{item.item}</td>
                        <td className="py-1.5 text-right font-mono font-bold">{item.amount.toLocaleString()}</td>
                        <td className="py-1.5 text-right font-mono font-bold text-amber-700">
                          {item.paidBy || 'TBD'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-stone-800 font-bold">
                    <td className="py-2 text-stone-900">Total Amount =</td>
                    <td className="py-2 text-right font-mono font-bold text-sm">
                      {additionalPaymentsSum.toLocaleString()}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* RIGHT SIDE: Item / Payment Summary + NOTES */}
          <div className="space-y-4">
            {/* Box 3: ITEM / PAYMENT Summary */}
            <div className="border-2 border-stone-800 rounded-lg p-3 bg-stone-50/50">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-stone-300 font-bold uppercase text-[10px] text-stone-700">
                    <th className="text-left py-1">Item</th>
                    <th className="text-right py-1">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 font-semibold">
                  <tr>
                    <td className="py-1.5 text-stone-700">Grand Total Labor</td>
                    <td className="py-1.5 text-right font-mono font-bold text-blue-900">
                      {siteTotals.grandTotalLabor.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-stone-700">Additional Payments</td>
                    <td className="py-1.5 text-right font-mono font-bold text-stone-800">
                      {additionalPaymentsSum.toLocaleString()}
                    </td>
                  </tr>
                  <tr className="border-t-2 border-stone-800 font-extrabold text-sm text-stone-900">
                    <td className="py-2">Total Payment Due</td>
                    <td className="py-2 text-right font-mono">
                      = {siteTotals.totalPaymentDue.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Box 4: NOTES (The handwritten notes recreation) */}
            <div className="border-2 border-stone-800 rounded-lg p-4 bg-amber-50/30 relative">
              <div className="flex items-center justify-between border-b border-stone-300 pb-1 mb-2">
                <h4 className="font-extrabold text-xs uppercase tracking-widest text-stone-800">
                  NOTES:
                </h4>
                <button
                  onClick={() => setIsNotesEditMode(!isNotesEditMode)}
                  className="text-[10px] font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1 print:hidden"
                >
                  <Edit3 className="w-3 h-3" /> {isNotesEditMode ? 'Done' : 'Edit Notes'}
                </button>
              </div>

              {isNotesEditMode ? (
                <div className="space-y-2 print:hidden">
                  <textarea
                    value={editableNotes}
                    onChange={(e) => setEditableNotes(e.target.value)}
                    rows={5}
                    className="w-full text-xs font-mono p-2 rounded border border-stone-300 bg-white"
                  />
                  <textarea
                    value={editableRemarks}
                    onChange={(e) => setEditableRemarks(e.target.value)}
                    rows={2}
                    placeholder="Site remarks..."
                    className="w-full text-xs p-2 rounded border border-stone-300 bg-white"
                  />
                  <button
                    onClick={handleSaveNotes}
                    className="flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold"
                  >
                    <Save className="w-3 h-3" /> Save Notes
                  </button>
                </div>
              ) : (
                <div className="font-mono text-sm leading-relaxed text-blue-950 font-bold space-y-1">
                  <div className="text-base font-extrabold text-stone-900">
                    Total = {siteTotals.totalPaymentDue.toLocaleString()}
                  </div>
                  <div className="text-stone-800">
                    Paid by TBD (Tahir Builders &amp; Developers) = {siteTotals.paidByTBD.toLocaleString()}
                  </div>
                  <div className="text-emerald-900 font-extrabold pt-1 border-t border-stone-300">
                    Rem. Payable = {siteTotals.remainingPayable.toLocaleString()}
                  </div>
                  {subPaymentsThisWeek.length > 0 ? (
                    subPaymentsThisWeek.map((sp) => {
                      const sub = data.subcontractors.find((s) => s.id === sp.subcontractorId);
                      return (
                        <div key={sp.id} className="text-orange-900">
                          + {sub?.name || 'Subcontractor'} = {sp.amount.toLocaleString()}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-stone-500 text-xs italic">
                      + Subcontractors = 0
                    </div>
                  )}
                  <div className="text-lg font-black text-amber-900 border-t-2 border-stone-800 pt-1 mt-1">
                    New Total = {siteTotals.newWeeklyTotal.toLocaleString()}
                  </div>
                </div>
              )}

              {/* Remarks block */}
              {currentWeeklyNotes?.siteRemarks && (
                <div className="mt-3 pt-2 border-t border-stone-300 text-xs text-stone-700 italic">
                  <strong>Remarks:</strong> {currentWeeklyNotes.siteRemarks}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 5: SIGNIFICANT ACTIVITIES & SUBCONTRACTORS PROGRESS (Specifically requested missing controls) */}
        <div className="mt-6 pt-4 border-t-2 border-stone-800 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Activity Tracking */}
          <div className="border border-stone-300 rounded-xl p-3.5 bg-stone-50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                Significant Activity Milestones
              </h4>
              <button
                onClick={() => setIsActivityModalOpen(true)}
                className="text-[10px] font-bold text-amber-700 hover:text-amber-800 print:hidden"
              >
                Update
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                  Last Significant Activity (Completed):
                </span>
                <span className="font-semibold text-emerald-950">
                  {site?.lastSignificantActivity?.date || 'N/A'}: {site?.lastSignificantActivity?.description || 'Lintel casting completed'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                <span className="text-[10px] uppercase font-bold text-blue-800 block">
                  Next Significant Activity (Scheduled):
                </span>
                <span className="font-semibold text-blue-950">
                  {site?.nextSignificantActivity?.date || 'N/A'}: {site?.nextSignificantActivity?.description || 'Roof slab shuttering & pouring'}
                </span>
              </div>
            </div>
          </div>

          {/* Subcontractor Remaining Balances */}
          <div className="border border-stone-300 rounded-xl p-3.5 bg-stone-50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-stone-800">
                Subcontractors Contract Ledger
              </h4>
              <span className="text-[10px] text-stone-500 font-mono">Contract vs Remaining</span>
            </div>
            <div className="space-y-1.5 text-xs">
              {siteSubs.length === 0 ? (
                <div className="text-stone-400 italic text-center py-2">No subcontractors linked to this site</div>
              ) : (
                siteSubs.map((sub) => {
                  const payments = data.subcontractorPayments.filter((p) => p.subcontractorId === sub.id);
                  const ledger = calculateSubcontractorLedger(sub.contractValue, payments);
                  return (
                    <div key={sub.id} className="flex items-center justify-between py-1 border-b border-stone-200 text-xs">
                      <div>
                        <span className="font-semibold text-stone-900 block">{sub.name}</span>
                        <span className="text-[10px] text-stone-500 uppercase">{sub.category.replace('_', ' ')}</span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-stone-500 text-[10px] block">
                          Paid: {formatCurrency(ledger.totalPaid)} / {formatCurrency(sub.contractValue)}
                        </span>
                        <span className="font-bold text-amber-900">
                          Rem: {formatCurrency(ledger.remainingBalance)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer Signature row on printed paper */}
        <div className="mt-8 pt-4 border-t border-stone-400 flex justify-between items-end text-xs text-stone-600">
          <div>
            <div className="font-semibold text-stone-800">Site Supervisor / In-Charge: ______________________</div>
            <div className="text-[10px] text-stone-400 mt-1">Verified on site &amp; recorded</div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-stone-800">Tahir Builders &amp; Developers (TBD)</div>
            <div className="text-[10px] text-stone-400 mt-1">Authorized Contractor &amp; Managing Partner</div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Edit Significant Activities */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 my-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-stone-900 text-base">Update Site Activities ({site.code})</h3>
              <button
                onClick={() => setIsActivityModalOpen(false)}
                aria-label="Close activity modal"
                className="p-2 text-stone-400 hover:text-stone-700 min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveActivities} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Last Significant Activity Date</label>
                <input
                  type="date"
                  value={lastActDate}
                  onChange={(e) => setLastActDate(e.target.value)}
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl font-semibold text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Last Activity Description</label>
                <input
                  type="text"
                  value={lastActDesc}
                  onChange={(e) => setLastActDesc(e.target.value)}
                  placeholder="e.g. Ground floor lintel casting"
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
              <div className="pt-2 border-t border-stone-200">
                <label className="font-bold text-stone-700 block mb-1">Next Significant Activity Scheduled Date</label>
                <input
                  type="date"
                  value={nextActDate}
                  onChange={(e) => setNextActDate(e.target.value)}
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl font-semibold text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Next Activity Description</label>
                <input
                  type="text"
                  value={nextActDesc}
                  onChange={(e) => setNextActDesc(e.target.value)}
                  placeholder="e.g. First floor slab shuttering and concrete pouring"
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsActivityModalOpen(false)}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl text-stone-600 bg-stone-100 hover:bg-stone-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 min-h-[44px] rounded-xl text-white bg-amber-600 hover:bg-amber-700 font-bold active:scale-[0.98] transition shadow-sm"
                >
                  Save Activities
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Additional Labor / Expense */}
      {isAddExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 my-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-stone-900 text-base">Add Additional Labor / Lifting Expense</h3>
              <button
                onClick={() => setIsAddExpenseModalOpen(false)}
                aria-label="Close expense modal"
                className="p-2 text-stone-400 hover:text-stone-700 min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Item / Work Description</label>
                <input
                  type="text"
                  value={expenseItem}
                  onChange={(e) => setExpenseItem(e.target.value)}
                  placeholder="e.g. Rori lifting, Bricks unloading, Sand carrying"
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Amount (Rs)</label>
                <input
                  type="number"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="e.g. 10500"
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl font-mono font-bold text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Paid By (Entity / Account)</label>
                <input
                  type="text"
                  value={expensePaidBy}
                  onChange={(e) => setExpensePaidBy(e.target.value)}
                  placeholder="e.g. TBD, Cash, Office"
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseModalOpen(false)}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl text-stone-600 bg-stone-100 hover:bg-stone-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 min-h-[44px] rounded-xl text-white bg-amber-600 hover:bg-amber-700 font-bold active:scale-[0.98] transition shadow-sm"
                >
                  Add Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Subcontractor Payment */}
      {isAddSubPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 my-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-stone-900 text-base">Add Weekly Subcontractor Payment</h3>
              <button
                onClick={() => setIsAddSubPaymentModalOpen(false)}
                aria-label="Close subcontractor modal"
                className="p-2 text-stone-400 hover:text-stone-700 min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubPayment} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Select Subcontractor</label>
                <select
                  value={selectedSubId}
                  onChange={(e) => setSelectedSubId(e.target.value)}
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl font-semibold text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="">-- Choose Subcontractor --</option>
                  {data.subcontractors.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.category.replace('_', ' ')}) — Contract: Rs {sub.contractValue.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Weekly Payment Amount (Rs)</label>
                <input
                  type="number"
                  value={subAmount}
                  onChange={(e) => setSubAmount(e.target.value)}
                  placeholder="e.g. 10000"
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl font-mono font-bold text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Payment Description / Milestone</label>
                <input
                  type="text"
                  value={subDesc}
                  onChange={(e) => setSubDesc(e.target.value)}
                  placeholder="e.g. Shuttering installment for roof slab"
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Paid From</label>
                <input
                  type="text"
                  value={subPaidBy}
                  onChange={(e) => setSubPaidBy(e.target.value)}
                  placeholder="e.g. Site Cash, Bank Transfer, Office"
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddSubPaymentModalOpen(false)}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl text-stone-600 bg-stone-100 hover:bg-stone-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 min-h-[44px] rounded-xl text-white bg-orange-600 hover:bg-orange-700 font-bold active:scale-[0.98] transition shadow-sm"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Record Worker Advance Dialog */}
      {isAddAdvanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 my-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">Record Weekly Labor Advance</h3>
                  <p className="text-xs text-stone-500">Site: {site?.code} — Week of {weekStartDate}</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddAdvanceModalOpen(false)}
                aria-label="Close advance modal"
                className="p-2 text-stone-400 hover:text-stone-700 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRecordAdvance} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Select Laborer / Worker</label>
                <select
                  value={advanceWorkerId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setAdvanceWorkerId(id);
                    if (id) {
                      const existing = getWorkerWeeklyAdvance(id, weekStartDate, data.workerPayments, site?.id);
                      if (existing > 0) {
                        setAdvanceAmountInput(String(existing));
                      }
                    }
                  }}
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl font-semibold text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                >
                  <option value="">-- Choose Worker --</option>
                  <optgroup label="Masons (Mistri)">
                    {masons.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (Rs {m.dailyWage}/d)
                      </option>
                    ))}
                  </optgroup>
                  {helpers.length > 0 && (
                    <optgroup label="Helpers">
                      {helpers.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} (Rs {h.dailyWage}/d)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Laborers (Mazdoor)">
                    {laborers.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} (Rs {l.dailyWage}/d)
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Advance Amount (PKR / Rs)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-stone-400">Rs</span>
                  <input
                    type="number"
                    min="1"
                    step="50"
                    value={advanceAmountInput}
                    onChange={(e) => setAdvanceAmountInput(e.target.value)}
                    placeholder="e.g. 2000"
                    className="w-full pl-10 pr-3 py-2.5 min-h-[44px] border border-stone-300 rounded-xl font-mono font-bold text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  This cash advance will be deducted from the worker's gross weekly wage, displaying the net balance the company owes them.
                </p>
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Notes / Cash Disbursed By</label>
                <input
                  type="text"
                  value={advanceNotesInput}
                  onChange={(e) => setAdvanceNotesInput(e.target.value)}
                  placeholder="e.g. Paid in cash by Site Supervisor on Monday"
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddAdvanceModalOpen(false)}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl text-stone-600 bg-stone-100 hover:bg-stone-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 min-h-[44px] rounded-xl text-white bg-amber-600 hover:bg-amber-700 font-bold active:scale-[0.98] transition shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Save Advance</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Dedicated Labor Toll PDF Report */}
      <WeeklyLaborTollPdfModal
        isOpen={isLaborTollPdfModalOpen}
        onClose={() => setIsLaborTollPdfModalOpen(false)}
        site={site}
        weekStartDate={weekStartDate}
        weekDates={weekDates}
        masons={masons}
        helpers={helpers}
        laborers={laborers}
        siteAttendance={siteAttendance}
        workerPayments={data.workerPayments}
      />

      {/* MODAL 6: Full Weekly Site Progress PDF Report */}
      <WeeklyProgressPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        site={site}
        weekStartDate={weekStartDate}
        weekDates={weekDates}
        masons={masons}
        helpers={helpers}
        laborers={laborers}
        siteAttendance={siteAttendance}
        additionalLabor={additionalLabor}
        subPaymentsThisWeek={subPaymentsThisWeek}
        currentWeeklyNotes={currentWeeklyNotes}
        siteTotals={siteTotals}
        directLaborWages={directLaborWages}
        bricksRaitLabor={bricksRaitLabor}
        additionalPaymentsSum={additionalPaymentsSum}
        subcontractors={data.subcontractors}
        subcontractorPayments={data.subcontractorPayments}
        materials={data.materials}
        workerPayments={data.workerPayments}
      />
    </div>
  );
};
