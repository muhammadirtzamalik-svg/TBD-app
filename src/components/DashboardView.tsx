import React from 'react';
import {
  Building2,
  Users,
  Wrench,
  Package,
  Calendar,
  FileSpreadsheet,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
  HardHat,
  Download,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import { ConstructionAppData } from '../types';
import { formatCurrency, calculateSubcontractorLedger } from '../utils/constructionMath';

interface DashboardViewProps {
  data: ConstructionAppData;
  onNavigate: (tab: string) => void;
  onOpenSiteSheet: (siteId: string) => void;
  onOpenApkModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  onNavigate,
  onOpenSiteSheet,
  onOpenApkModal,
}) => {
  // Aggregate statistics
  const activeSites = data.sites.filter((s) => s.status === 'active');
  const totalContractPortfolio = activeSites.reduce((sum, s) => sum + s.contractValue, 0);

  // Client Receipts received
  const totalClientReceipts = data.clientReceipts.reduce((sum, r) => sum + r.amount, 0);
  const totalClientReceivables = Math.max(0, totalContractPortfolio - totalClientReceipts);

  // Labor statistics
  const totalActiveWorkers = data.workers.filter((w) => w.isActive).length;
  const totalLaborWages = data.attendance.reduce((sum, a) => sum + (a.wage || 0), 0);
  const totalLaborPaid = data.workerPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalLaborDue = Math.max(0, totalLaborWages - totalLaborPaid);

  // Subcontractor statistics
  const subStats = data.subcontractors.reduce(
    (acc, sub) => {
      const payments = data.subcontractorPayments.filter((p) => p.subcontractorId === sub.id);
      const ledger = calculateSubcontractorLedger(sub.contractValue, payments);
      acc.totalContracts += sub.contractValue;
      acc.totalPaid += ledger.totalPaid;
      acc.totalRemaining += ledger.remainingBalance;
      return acc;
    },
    { totalContracts: 0, totalPaid: 0, totalRemaining: 0 }
  );

  // Material cost
  const totalMaterialsCost = data.materials.reduce((sum, m) => sum + m.total, 0);

  return (
    <div className="space-y-6">
      {/* Hero Welcome & Quick Alert Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
            <HardHat className="w-4 h-4 text-amber-400" />
            <span>Tahir Builders &amp; Developers (TBD) • Construction Control</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Daily Construction & Site Sheet Control
          </h1>
          <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
            Automates the weekly handwritten site sheets, mason & helper daily toll, subcontractor balances, materials ledger, and activity milestone dates.
          </p>

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 pt-2">
            <button
              onClick={() => onOpenSiteSheet('site-813d')}
              className="flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 active:scale-[0.98] transition shadow-md w-full sm:w-auto"
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              <span>Open 813-D Weekly Sheet</span>
            </button>
            <button
              onClick={() => onNavigate('daily_attendance')}
              className="flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold text-white bg-white/10 hover:bg-white/20 active:scale-[0.98] transition border border-white/20 w-full sm:w-auto"
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span>Mark Today's Attendance</span>
            </button>
            <button
              onClick={onOpenApkModal}
              className="flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold text-amber-200 bg-amber-900/40 hover:bg-amber-900/60 active:scale-[0.98] transition border border-amber-500/30 w-full sm:w-auto"
            >
              <Download className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Install App &amp; Offline</span>
            </button>
          </div>
        </div>

        {/* Decorative background hardhat outline */}
        <div className="absolute right-4 -bottom-8 opacity-10 pointer-events-none">
          <HardHat className="w-72 h-72 text-amber-400" />
        </div>
      </div>

      {/* Top Level Financial KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-500 block truncate">
            Portfolio Contract Value
          </span>
          <div className="text-lg sm:text-2xl font-black font-mono text-stone-900 truncate">
            {formatCurrency(totalContractPortfolio)}
          </div>
          <span className="text-[11px] sm:text-xs text-stone-500 block">Across {activeSites.length} active sites</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-500 block truncate">
            Client Receivables Due
          </span>
          <div className="text-lg sm:text-2xl font-black font-mono text-blue-900 truncate">
            {formatCurrency(totalClientReceivables)}
          </div>
          <span className="text-[11px] sm:text-xs text-emerald-600 font-semibold block truncate">
            {formatCurrency(totalClientReceipts)} received
          </span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-500 block truncate">
            Subcontractors Outstanding
          </span>
          <div className="text-lg sm:text-2xl font-black font-mono text-amber-900 truncate">
            {formatCurrency(subStats.totalRemaining)}
          </div>
          <span className="text-[11px] sm:text-xs text-stone-500 block truncate">
            {formatCurrency(subStats.totalPaid)} paid of {formatCurrency(subStats.totalContracts)}
          </span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-500 block truncate">
            Workforce Active
          </span>
          <div className="text-lg sm:text-2xl font-black font-mono text-stone-900 truncate">
            {totalActiveWorkers} Workers
          </div>
          <span className="text-[11px] sm:text-xs text-amber-800 font-semibold block truncate">
            Masons, Helpers &amp; Laborers
          </span>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Project Sites & Milestone Countdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Sites Cards */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-600" />
                <h3 className="font-extrabold text-base text-stone-900">Active Construction Sites</h3>
              </div>
              <button
                onClick={() => onNavigate('projects')}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
              >
                View All Sites <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {activeSites.map((site) => (
                <div
                  key={site.id}
                  className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 hover:bg-stone-50 hover:border-amber-400 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-blue-900 bg-blue-100/70 px-2 py-0.5 rounded">
                        {site.code}
                      </span>
                      <span className="font-bold text-stone-900 text-sm">{site.name}</span>
                      <span className="text-xs text-stone-500 font-medium">({site.details})</span>
                    </div>
                    <div className="text-xs text-stone-600">
                      Client: <strong>{site.clientName || 'Private Client'}</strong> • Contract:{' '}
                      <strong className="font-mono">{formatCurrency(site.contractValue)}</strong>
                    </div>

                    {/* Milestones preview */}
                    <div className="text-[11px] text-stone-500 flex flex-wrap gap-2 pt-1">
                      {site.nextSignificantActivity && (
                        <span className="text-blue-900 font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          Next: {site.nextSignificantActivity.description} ({site.nextSignificantActivity.date})
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenSiteSheet(site.id)}
                    className="w-full sm:w-auto min-h-[44px] sm:min-h-[38px] px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-[0.98] rounded-xl shadow-xs transition flex items-center justify-center shrink-0"
                  >
                    Open Weekly Sheet
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Milestone Tracker */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                <h3 className="font-extrabold text-sm sm:text-base text-stone-900">
                  Critical Project Milestones (Last &amp; Next Activity)
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              {activeSites.map((site) => (
                <div key={site.id} className="p-3.5 rounded-xl border border-stone-200 space-y-2">
                  <div className="font-bold text-xs text-stone-800 flex items-center justify-between">
                    <span>{site.code} — {site.name}</span>
                    <button
                      onClick={() => onOpenSiteSheet(site.id)}
                      className="text-[11px] font-bold text-amber-700 hover:underline min-h-[32px] flex items-center"
                    >
                      Update on Site Sheet
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                      <span className="text-[10px] font-bold uppercase text-emerald-800 block">
                        Last Significant Activity:
                      </span>
                      <span className="text-emerald-950 font-medium">
                        {site.lastSignificantActivity?.date || 'N/A'}: {site.lastSignificantActivity?.description || 'N/A'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                      <span className="text-[10px] font-bold uppercase text-blue-800 block">
                        Next Scheduled Activity:
                      </span>
                      <span className="text-blue-950 font-medium">
                        {site.nextSignificantActivity?.date || 'N/A'}: {site.nextSignificantActivity?.description || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Navigation & Subcontractors Snapshot */}
        <div className="space-y-6">
          {/* Quick Shortcuts */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-5 space-y-3">
            <h3 className="font-extrabold text-xs sm:text-sm uppercase tracking-wider text-stone-700">
              Navigation Shortcuts
            </h3>
            <div className="space-y-2 text-xs">
              <button
                onClick={() => onNavigate('weekly_site_sheet')}
                className="w-full min-h-[48px] flex items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-amber-50 active:bg-amber-100 text-stone-800 hover:text-amber-900 border border-stone-200 font-bold transition text-left"
              >
                <span className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Weekly Site Sheet (Handwritten Layout)</span>
                </span>
                <ArrowUpRight className="w-4 h-4 text-stone-400 shrink-0" />
              </button>

              <button
                onClick={() => onNavigate('labor_master')}
                className="w-full min-h-[48px] flex items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-amber-50 active:bg-amber-100 text-stone-800 hover:text-amber-900 border border-stone-200 font-bold transition text-left"
              >
                <span className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Labor Master Toll &amp; Weekly Payroll</span>
                </span>
                <ArrowUpRight className="w-4 h-4 text-stone-400 shrink-0" />
              </button>

              <button
                onClick={() => onNavigate('daily_attendance')}
                className="w-full min-h-[48px] flex items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-amber-50 active:bg-amber-100 text-stone-800 hover:text-amber-900 border border-stone-200 font-bold transition text-left"
              >
                <span className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-orange-600 shrink-0" />
                  <span>Daily Attendance 1-Tap Marker</span>
                </span>
                <ArrowUpRight className="w-4 h-4 text-stone-400 shrink-0" />
              </button>

              <button
                onClick={() => onNavigate('subcontractors')}
                className="w-full min-h-[48px] flex items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-amber-50 active:bg-amber-100 text-stone-800 hover:text-amber-900 border border-stone-200 font-bold transition text-left"
              >
                <span className="flex items-center gap-2.5">
                  <Wrench className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Subcontractor Ledger &amp; Balances</span>
                </span>
                <ArrowUpRight className="w-4 h-4 text-stone-400 shrink-0" />
              </button>

              <button
                onClick={() => onNavigate('materials')}
                className="w-full min-h-[48px] flex items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-amber-50 active:bg-amber-100 text-stone-800 hover:text-amber-900 border border-stone-200 font-bold transition text-left"
              >
                <span className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-stone-700 shrink-0" />
                  <span>Materials Delivery &amp; Cost Ledger</span>
                </span>
                <ArrowUpRight className="w-4 h-4 text-stone-400 shrink-0" />
              </button>
            </div>
          </div>

          {/* Subcontractors Balance Snapshot */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-stone-700">
                Subcontractors Snapshot
              </h3>
              <button
                onClick={() => onNavigate('subcontractors')}
                className="text-xs text-amber-700 font-bold hover:underline"
              >
                Manage
              </button>
            </div>
            <div className="space-y-2 text-xs">
              {data.subcontractors.slice(0, 4).map((sub) => {
                const payments = data.subcontractorPayments.filter((p) => p.subcontractorId === sub.id);
                const ledger = calculateSubcontractorLedger(sub.contractValue, payments);
                return (
                  <div key={sub.id} className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
                    <div className="flex justify-between font-bold text-stone-900">
                      <span>{sub.name}</span>
                      <span className="font-mono text-amber-900">{formatCurrency(ledger.remainingBalance)} rem.</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-stone-500 font-mono">
                      <span>{sub.category.replace('_', ' ')}</span>
                      <span>Paid {ledger.percentagePaid}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
