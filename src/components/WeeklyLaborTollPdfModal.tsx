import React, { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import {
  FileDown,
  Printer,
  X,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Info,
  ShieldCheck,
  Building2,
  Loader2,
  Check,
  CreditCard,
  UserCheck,
} from 'lucide-react';
import {
  ProjectSite,
  Worker,
  AttendanceRecord,
  WorkerPayment,
  AttendanceStatus,
} from '../types';
import {
  calculateDayWage,
  formatCurrency,
  getWorkerWeeklyAdvance,
  WeekDateInfo,
} from '../utils/constructionMath';

interface WeeklyLaborTollPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: ProjectSite;
  weekStartDate: string;
  weekDates: { date: string; formatted: string; dayNumber: number; dayShort: string }[];
  masons: Worker[];
  helpers: Worker[];
  laborers: Worker[];
  siteAttendance: AttendanceRecord[];
  workerPayments: WorkerPayment[];
}

export const WeeklyLaborTollPdfModal: React.FC<WeeklyLaborTollPdfModalProps> = ({
  isOpen,
  onClose,
  site,
  weekStartDate,
  weekDates,
  masons,
  helpers,
  laborers,
  siteAttendance,
  workerPayments,
}) => {
  // Report options & fields - All hooks at the very top of component
  const defaultRef = `TBD-LTS-${site.code || 'SITE'}-${weekStartDate.replace(/-/g, '').slice(2)}`;
  const [reportRef, setReportRef] = useState(defaultRef);
  const [supervisorName, setSupervisorName] = useState('Engr. M. Tahir (Site Incharge)');
  const [disbursementNote, setDisbursementNote] = useState(
    'Weekly labor wages calculated after adjusting mid-week advances. All balances payable in cash on Thursday closing.'
  );

  // PDF Generation States
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Conditional early return ONLY after all hooks are declared
  if (!isOpen) return null;

  // Calculate worker stats for this site and week
  const getWorkerStats = (worker: Worker) => {
    let totalUnits = 0;
    let totalGrossWage = 0;
    const daysRecord: Record<string, { status: AttendanceStatus; units: number; wage: number }> = {};

    weekDates.forEach((w) => {
      const record = siteAttendance.find((a) => a.workerId === worker.id && a.date === w.date);
      if (record && record.units > 0) {
        totalUnits += record.units;
        const wage = record.wage || calculateDayWage(record.units, worker.dailyWage);
        totalGrossWage += wage;
        daysRecord[w.date] = {
          status: record.status,
          units: record.units,
          wage,
        };
      } else {
        daysRecord[w.date] = { status: '', units: 0, wage: 0 };
      }
    });

    const advanceTaken = getWorkerWeeklyAdvance(worker.id, weekStartDate, workerPayments, site.id);
    const balanceDue = totalGrossWage - advanceTaken;

    return {
      totalUnits,
      totalGrossWage,
      advanceTaken,
      balanceDue,
      daysRecord,
    };
  };

  const getCategoryStats = (workers: Worker[]) => {
    let activeHeadcount = 0;
    let totalDays = 0;
    let totalGrossWages = 0;
    let totalAdvances = 0;
    let totalBalanceDue = 0;

    workers.forEach((w) => {
      const stats = getWorkerStats(w);
      if (stats.totalUnits > 0 || stats.advanceTaken > 0) {
        activeHeadcount += 1;
        totalDays += stats.totalUnits;
        totalGrossWages += stats.totalGrossWage;
        totalAdvances += stats.advanceTaken;
        totalBalanceDue += stats.balanceDue;
      }
    });

    return {
      activeHeadcount,
      totalDays,
      totalGrossWages,
      totalAdvances,
      totalBalanceDue,
    };
  };

  const masonsStats = getCategoryStats(masons);
  const helpersStats = getCategoryStats(helpers);
  const laborersStats = getCategoryStats(laborers);

  const grandTotalHeadcount = masonsStats.activeHeadcount + helpersStats.activeHeadcount + laborersStats.activeHeadcount;
  const grandTotalDays = masonsStats.totalDays + helpersStats.totalDays + laborersStats.totalDays;
  const grandTotalWages = masonsStats.totalGrossWages + helpersStats.totalGrossWages + laborersStats.totalGrossWages;
  const grandTotalAdvances = masonsStats.totalAdvances + helpersStats.totalAdvances + laborersStats.totalAdvances;
  const grandTotalBalanceDue = masonsStats.totalBalanceDue + helpersStats.totalBalanceDue + laborersStats.totalBalanceDue;

  // Direct PDF Download via html2canvas-pro & jsPDF
  const handleDownloadPdf = async () => {
    const reportElem = document.getElementById('labor-toll-pdf-document');
    if (!reportElem) return;

    try {
      setIsGeneratingPdf(true);
      setDownloadError(null);
      setDownloadSuccess(false);

      const canvas = await html2canvas(reportElem, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1080,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const margin = 8;
      const usableWidth = pdfWidth - margin * 2;
      const imgHeight = (canvas.height * usableWidth) / canvas.width;
      const usableHeight = pdfHeight - margin * 2;

      let heightLeft = imgHeight;
      let position = margin;

      // First page
      pdf.addImage(imgData, 'JPEG', margin, position, usableWidth, imgHeight);
      heightLeft -= usableHeight;

      // Additional pages if needed
      while (heightLeft > 0) {
        position = margin - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position, usableWidth, imgHeight);
        heightLeft -= usableHeight;
      }

      const cleanSiteCode = site.code ? site.code.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Site';
      const fileName = `TBD_Labor_Toll_Statement_${cleanSiteCode}_Week_${weekStartDate}.pdf`;
      pdf.save(fileName);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err: any) {
      console.error('Error generating Labor Toll PDF:', err);
      setDownloadError('Direct PDF generation failed. Falling back to browser print dialog...');
      setTimeout(() => {
        handlePrint();
      }, 800);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Browser Print
  const handlePrint = () => {
    const originalTitle = document.title;
    const cleanSiteCode = site.code.replace(/[^a-zA-Z0-9_-]/g, '_');
    document.title = `TBD_Labor_Toll_Statement_${cleanSiteCode}_Week_${weekStartDate}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4 overflow-y-auto modal-print-backdrop">
      <div className="bg-white rounded-2xl max-w-5xl w-full p-4 sm:p-7 shadow-2xl border border-stone-300 my-4 max-h-[94vh] overflow-y-auto modal-print-card text-stone-900">
        {/* Top Control Bar (Hidden on print) */}
        <div className="print:hidden space-y-4 mb-6 pb-5 border-b border-stone-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                  <Users className="w-5 h-5" />
                </span>
                <h2 className="text-lg sm:text-xl font-black text-stone-900 font-sans tracking-tight">
                  Labor Toll &amp; Wage Payout Statement
                </h2>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Site: <strong>{site.code}</strong> ({site.details || site.name}) • Week: <strong>{weekDates[0]?.formatted} — {weekDates[weekDates.length - 1]?.formatted}</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.98] text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition disabled:opacity-60 cursor-pointer"
                title="Download Labor Toll statement as PDF"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating PDF...</span>
                  </>
                ) : downloadSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-200 stroke-[3]" />
                    <span>Labor Toll PDF Saved!</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4 stroke-[2.5]" />
                    <span>Download Labor Toll PDF</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs sm:text-sm rounded-xl border border-stone-300 transition cursor-pointer"
                title="Print Labor Toll sheet"
              >
                <Printer className="w-4 h-4 text-stone-600" />
                <span>Print Dialog</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {downloadSuccess && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Labor Toll PDF successfully downloaded to your device! Check your downloads folder.</span>
            </div>
          )}

          {downloadError && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs font-semibold text-amber-900">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{downloadError}</span>
            </div>
          )}

          {/* Configuration Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs">
            <div>
              <label className="font-bold text-stone-700 block mb-1 uppercase text-[10px] tracking-wider">
                Statement Ref. No.
              </label>
              <input
                type="text"
                value={reportRef}
                onChange={(e) => setReportRef(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 font-mono text-xs bg-white text-stone-800"
              />
            </div>
            <div>
              <label className="font-bold text-stone-700 block mb-1 uppercase text-[10px] tracking-wider">
                Site Supervisor / Incharge
              </label>
              <input
                type="text"
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white text-stone-800"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="font-bold text-stone-700 block mb-1 text-xs">
                Disbursement &amp; Settlement Remarks:
              </label>
              <input
                type="text"
                value={disbursementNote}
                onChange={(e) => setDisbursementNote(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white text-stone-800"
                placeholder="e.g. All advances settled. Balances paid in cash on Thursday closing."
              />
            </div>
          </div>
        </div>

        {/* =========================================================================
            PRINTABLE LABOR TOLL STATEMENT (What gets captured for PDF & printed)
            ========================================================================= */}
        <div id="labor-toll-pdf-document" className="sheet-paper bg-white text-stone-900 font-sans p-2 sm:p-5 space-y-4">
          {/* Header */}
          <div className="border-b-4 border-stone-900 pb-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <div className="text-[10px] font-extrabold tracking-widest uppercase text-amber-700">
                  Engineers &amp; General Contractors • Labor Control Division
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-950 font-serif uppercase">
                  TAHIR BUILDERS &amp; DEVELOPERS
                </h1>
                <div className="text-xs font-bold text-emerald-800 tracking-wider uppercase">
                  Weekly Labor Toll &amp; Wage Settlement Statement
                </div>
              </div>

              <div className="text-left sm:text-right font-mono text-xs text-stone-700 border-t sm:border-t-0 sm:border-l-2 border-stone-300 pt-1 sm:pt-0 sm:pl-4">
                <div className="font-bold text-stone-950 text-sm">REF: {reportRef}</div>
                <div className="text-[11px] text-stone-500">Date: {new Date().toLocaleDateString('en-GB')}</div>
                <div className="text-[11px] font-bold text-stone-800 mt-0.5">
                  Week: {weekDates[0]?.formatted} — {weekDates[weekDates.length - 1]?.formatted}
                </div>
                <div className="text-[10px] text-amber-900 font-semibold">Saturday to Thursday (Friday Off)</div>
              </div>
            </div>
          </div>

          {/* Project Site Details Banner */}
          <div className="avoid-break bg-stone-50 border-2 border-stone-800 rounded-xl p-3 flex flex-wrap justify-between items-center gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black font-mono text-blue-900">{site.code}</span>
              <div>
                <span className="font-bold text-stone-900 text-sm block">{site.name}</span>
                <span className="text-[11px] text-stone-600">{site.details || 'Site Scope'} • {site.location || 'On-site'}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-stone-500 block">Client Dossier</span>
              <span className="font-bold text-stone-800 text-xs">{site.clientName || 'Private Client'}</span>
            </div>
          </div>

          {/* High-Level Financial Summary Cards */}
          <div className="avoid-break grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="border border-stone-300 rounded-xl p-2.5 bg-stone-50">
              <span className="text-[10px] uppercase font-bold text-stone-500 block">Total Headcount</span>
              <span className="text-lg font-mono font-black text-blue-950">
                {grandTotalHeadcount} Workers
              </span>
              <span className="text-[10px] text-stone-500 block">{grandTotalDays} Active Day Shifts</span>
            </div>

            <div className="border border-stone-300 rounded-xl p-2.5 bg-stone-50">
              <span className="text-[10px] uppercase font-bold text-stone-500 block">Gross Wages Earned</span>
              <span className="text-lg font-mono font-black text-stone-950">
                Rs {grandTotalWages.toLocaleString()}
              </span>
              <span className="text-[10px] text-stone-500 block">Total Work Output</span>
            </div>

            <div className="border border-stone-300 rounded-xl p-2.5 bg-amber-50/70 border-amber-300">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">Advances Disbursed</span>
              <span className="text-lg font-mono font-black text-amber-950">
                Rs {grandTotalAdvances.toLocaleString()}
              </span>
              <span className="text-[10px] text-amber-700 block">Deducted from wages</span>
            </div>

            <div className="border-2 border-emerald-800 rounded-xl p-2.5 bg-emerald-50">
              <span className="text-[10px] uppercase font-extrabold text-emerald-800 block">Net Company Owes</span>
              <span className="text-lg font-mono font-black text-emerald-950">
                Rs {grandTotalBalanceDue.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-emerald-700 block">Net Cash Payable</span>
            </div>
          </div>

          {/* The Labor Toll Table */}
          <div className="avoid-break border-2 border-stone-800 rounded-xl overflow-hidden text-xs">
            <div className="bg-stone-900 text-white px-3 py-2 flex justify-between items-center">
              <span className="font-black uppercase tracking-wider text-[11px]">
                Labor Attendance, Gross Wages, Advances &amp; Net Balance Owed
              </span>
              <span className="text-[10px] font-mono text-amber-400">
                Work Week: Saturday to Thursday (6 Days)
              </span>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-200 border-b-2 border-stone-800 font-bold text-stone-900">
                  <th className="py-2.5 px-3 border-r-2 border-stone-800 w-36">Worker Name &amp; Role</th>
                  <th className="py-2.5 px-2 text-center border-r border-stone-300 w-16">Rate/d</th>
                  {weekDates.map((w) => (
                    <th key={w.date} className="py-2.5 px-1 text-center border-r border-stone-300 font-mono w-11">
                      <div>{w.dayNumber}</div>
                      <div className="text-[9px] font-normal text-stone-500 uppercase">{w.dayShort}</div>
                    </th>
                  ))}
                  <th className="py-2.5 px-1 text-center border-r border-stone-300 w-12">Days</th>
                  <th className="py-2.5 px-2 text-right border-r border-stone-300 font-bold w-20">Earned</th>
                  <th className="py-2.5 px-2 text-right border-r border-stone-300 font-bold text-amber-900 w-20">Advance</th>
                  <th className="py-2.5 px-2 text-right border-r border-stone-300 font-black text-emerald-950 w-24">Net Owed</th>
                  <th className="py-2.5 px-2 text-center font-normal text-stone-500 text-[10px] w-24">Recipient Sign</th>
                </tr>
              </thead>
              <tbody>
                {/* 1. MASONS SECTION */}
                <tr className="bg-stone-100 font-bold text-stone-800 border-b border-stone-400">
                  <td colSpan={weekDates.length + 6} className="py-1 px-3 uppercase tracking-wider text-[10px] bg-stone-200/60">
                    Masons (Mistri)
                  </td>
                </tr>
                {masons.map((worker) => {
                  const stats = getWorkerStats(worker);
                  return (
                    <tr key={worker.id} className="border-b border-stone-200">
                      <td className="py-1.5 px-3 font-semibold text-blue-900 border-r-2 border-stone-800">
                        {worker.name}
                      </td>
                      <td className="py-1.5 px-1 text-center font-mono text-[11px] text-stone-600 border-r border-stone-200">
                        {worker.dailyWage}
                      </td>
                      {weekDates.map((w) => {
                        const rec = stats.daysRecord[w.date];
                        return (
                          <td
                            key={w.date}
                            className={`py-1.5 px-1 text-center font-bold font-mono border-r border-stone-200 ${
                              rec.units > 0 ? 'bg-amber-100/40 text-stone-900' : 'text-stone-300'
                            }`}
                          >
                            {rec.status || '-'}
                          </td>
                        );
                      })}
                      <td className="py-1.5 px-1 text-center font-mono font-bold text-stone-800 border-r border-stone-200">
                        {stats.totalUnits > 0 ? stats.totalUnits : '-'}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-semibold text-stone-900 border-r border-stone-200">
                        {stats.totalGrossWage > 0 ? stats.totalGrossWage.toLocaleString() : '-'}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold text-amber-900 border-r border-stone-200">
                        {stats.advanceTaken > 0 ? stats.advanceTaken.toLocaleString() : '-'}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-black text-emerald-950 border-r border-stone-200">
                        {stats.balanceDue > 0 ? (
                          <span>{stats.balanceDue.toLocaleString()}</span>
                        ) : stats.balanceDue === 0 && stats.totalGrossWage > 0 ? (
                          <span className="text-[9px] uppercase text-stone-400">Settled</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-center text-stone-300 font-mono text-[10px]">
                        _________
                      </td>
                    </tr>
                  );
                })}
                {/* Masons Subtotal */}
                <tr className="bg-stone-100/80 border-b-2 border-stone-800 font-semibold text-[11px]">
                  <td colSpan={weekDates.length + 2} className="py-1 px-3 text-right text-stone-600 font-bold uppercase text-[10px]">
                    Masons Subtotal ({masonsStats.activeHeadcount} Workers):
                  </td>
                  <td className="py-1 px-1 text-center font-mono font-bold text-stone-800 border-r border-stone-300">
                    {masonsStats.totalDays}
                  </td>
                  <td className="py-1 px-2 text-right font-mono font-bold text-stone-900 border-r border-stone-300">
                    {masonsStats.totalGrossWages.toLocaleString()}
                  </td>
                  <td className="py-1 px-2 text-right font-mono font-bold text-amber-900 border-r border-stone-300">
                    {masonsStats.totalAdvances > 0 ? masonsStats.totalAdvances.toLocaleString() : '-'}
                  </td>
                  <td className="py-1 px-2 text-right font-mono font-black text-emerald-950 border-r border-stone-300">
                    {masonsStats.totalBalanceDue.toLocaleString()}
                  </td>
                  <td></td>
                </tr>

                {/* 2. HELPERS SECTION */}
                <tr className="bg-stone-100 font-bold text-stone-800 border-b border-stone-400">
                  <td colSpan={weekDates.length + 6} className="py-1 px-3 uppercase tracking-wider text-[10px] bg-stone-200/60">
                    Helpers
                  </td>
                </tr>
                {helpers.length === 0 ? (
                  <tr className="border-b border-stone-200">
                    <td colSpan={weekDates.length + 6} className="py-1 px-3 text-stone-400 italic text-center text-xs">
                      No helpers assigned this week
                    </td>
                  </tr>
                ) : (
                  helpers.map((worker) => {
                    const stats = getWorkerStats(worker);
                    return (
                      <tr key={worker.id} className="border-b border-stone-200">
                        <td className="py-1.5 px-3 font-semibold text-blue-900 border-r-2 border-stone-800">
                          {worker.name}
                        </td>
                        <td className="py-1.5 px-1 text-center font-mono text-[11px] text-stone-600 border-r border-stone-200">
                          {worker.dailyWage}
                        </td>
                        {weekDates.map((w) => {
                          const rec = stats.daysRecord[w.date];
                          return (
                            <td
                              key={w.date}
                              className={`py-1.5 px-1 text-center font-bold font-mono border-r border-stone-200 ${
                                rec.units > 0 ? 'bg-amber-100/40 text-stone-900' : 'text-stone-300'
                              }`}
                            >
                              {rec.status || '-'}
                            </td>
                          );
                        })}
                        <td className="py-1.5 px-1 text-center font-mono font-bold text-stone-800 border-r border-stone-200">
                          {stats.totalUnits > 0 ? stats.totalUnits : '-'}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-semibold text-stone-900 border-r border-stone-200">
                          {stats.totalGrossWage > 0 ? stats.totalGrossWage.toLocaleString() : '-'}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-bold text-amber-900 border-r border-stone-200">
                          {stats.advanceTaken > 0 ? stats.advanceTaken.toLocaleString() : '-'}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-black text-emerald-950 border-r border-stone-200">
                          {stats.balanceDue > 0 ? (
                            <span>{stats.balanceDue.toLocaleString()}</span>
                          ) : stats.balanceDue === 0 && stats.totalGrossWage > 0 ? (
                            <span className="text-[9px] uppercase text-stone-400">Settled</span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-center text-stone-300 font-mono text-[10px]">
                          _________
                        </td>
                      </tr>
                    );
                  })
                )}
                {helpers.length > 0 && (
                  <tr className="bg-stone-100/80 border-b-2 border-stone-800 font-semibold text-[11px]">
                    <td colSpan={weekDates.length + 2} className="py-1 px-3 text-right text-stone-600 font-bold uppercase text-[10px]">
                      Helpers Subtotal ({helpersStats.activeHeadcount} Workers):
                    </td>
                    <td className="py-1 px-1 text-center font-mono font-bold text-stone-800 border-r border-stone-300">
                      {helpersStats.totalDays}
                    </td>
                    <td className="py-1 px-2 text-right font-mono font-bold text-stone-900 border-r border-stone-300">
                      {helpersStats.totalGrossWages.toLocaleString()}
                    </td>
                    <td className="py-1 px-2 text-right font-mono font-bold text-amber-900 border-r border-stone-300">
                      {helpersStats.totalAdvances > 0 ? helpersStats.totalAdvances.toLocaleString() : '-'}
                    </td>
                    <td className="py-1 px-2 text-right font-mono font-black text-emerald-950 border-r border-stone-300">
                      {helpersStats.totalBalanceDue.toLocaleString()}
                    </td>
                    <td></td>
                  </tr>
                )}

                {/* 3. LABORERS SECTION */}
                <tr className="bg-stone-100 font-bold text-stone-800 border-b border-stone-400">
                  <td colSpan={weekDates.length + 6} className="py-1 px-3 uppercase tracking-wider text-[10px] bg-stone-200/60">
                    Laborers (Mazdoor)
                  </td>
                </tr>
                {laborers.map((worker) => {
                  const stats = getWorkerStats(worker);
                  return (
                    <tr key={worker.id} className="border-b border-stone-200">
                      <td className="py-1.5 px-3 font-semibold text-blue-900 border-r-2 border-stone-800">
                        {worker.name}
                      </td>
                      <td className="py-1.5 px-1 text-center font-mono text-[11px] text-stone-600 border-r border-stone-200">
                        {worker.dailyWage}
                      </td>
                      {weekDates.map((w) => {
                        const rec = stats.daysRecord[w.date];
                        return (
                          <td
                            key={w.date}
                            className={`py-1.5 px-1 text-center font-bold font-mono border-r border-stone-200 ${
                              rec.units > 0 ? 'bg-amber-100/40 text-stone-900' : 'text-stone-300'
                            }`}
                          >
                            {rec.status || '-'}
                          </td>
                        );
                      })}
                      <td className="py-1.5 px-1 text-center font-mono font-bold text-stone-800 border-r border-stone-200">
                        {stats.totalUnits > 0 ? stats.totalUnits : '-'}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-semibold text-stone-900 border-r border-stone-200">
                        {stats.totalGrossWage > 0 ? stats.totalGrossWage.toLocaleString() : '-'}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold text-amber-900 border-r border-stone-200">
                        {stats.advanceTaken > 0 ? stats.advanceTaken.toLocaleString() : '-'}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-black text-emerald-950 border-r border-stone-200">
                        {stats.balanceDue > 0 ? (
                          <span>{stats.balanceDue.toLocaleString()}</span>
                        ) : stats.balanceDue === 0 && stats.totalGrossWage > 0 ? (
                          <span className="text-[9px] uppercase text-stone-400">Settled</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-center text-stone-300 font-mono text-[10px]">
                        _________
                      </td>
                    </tr>
                  );
                })}
                {/* Laborers Subtotal */}
                <tr className="bg-stone-100/80 border-b-2 border-stone-800 font-semibold text-[11px]">
                  <td colSpan={weekDates.length + 2} className="py-1 px-3 text-right text-stone-600 font-bold uppercase text-[10px]">
                    Laborers Subtotal ({laborersStats.activeHeadcount} Workers):
                  </td>
                  <td className="py-1 px-1 text-center font-mono font-bold text-stone-800 border-r border-stone-300">
                    {laborersStats.totalDays}
                  </td>
                  <td className="py-1 px-2 text-right font-mono font-bold text-stone-900 border-r border-stone-300">
                    {laborersStats.totalGrossWages.toLocaleString()}
                  </td>
                  <td className="py-1 px-2 text-right font-mono font-bold text-amber-900 border-r border-stone-300">
                    {laborersStats.totalAdvances > 0 ? laborersStats.totalAdvances.toLocaleString() : '-'}
                  </td>
                  <td className="py-1 px-2 text-right font-mono font-black text-emerald-950 border-r border-stone-300">
                    {laborersStats.totalBalanceDue.toLocaleString()}
                  </td>
                  <td></td>
                </tr>

                {/* GRAND TOTAL LABOR TOLL ROW */}
                <tr className="bg-stone-200/90 border-t-2 border-stone-900 font-black text-xs text-stone-950">
                  <td colSpan={weekDates.length + 2} className="py-2.5 px-3 text-right uppercase tracking-wider">
                    GRAND TOTAL LABOR TOLL ({grandTotalHeadcount} Workers):
                  </td>
                  <td className="py-2.5 px-1 text-center font-mono font-black border-r border-stone-400">
                    {grandTotalDays}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono font-black border-r border-stone-400">
                    Rs {grandTotalWages.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono font-black text-amber-950 border-r border-stone-400">
                    Rs {grandTotalAdvances.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono font-black text-emerald-950 border-r border-stone-400 text-sm">
                    Rs {grandTotalBalanceDue.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 text-center text-[10px] text-stone-600 font-bold">
                    PAID IN FULL
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Settlement Cash & Disbursement Statement */}
          <div className="avoid-break grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 space-y-1">
              <span className="font-bold text-amber-900 uppercase text-[10px] tracking-wider block">
                Weekly Cash Disbursement Directive:
              </span>
              <p className="text-stone-700 leading-relaxed text-xs">
                {disbursementNote}
              </p>
              <div className="pt-2 flex items-center justify-between text-xs font-mono font-bold text-stone-800 border-t border-amber-200/60">
                <span>Net Cash Required for Payout:</span>
                <span className="text-sm font-black text-emerald-900 font-mono">
                  {formatCurrency(grandTotalBalanceDue)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <span className="font-bold text-stone-700 uppercase text-[10px] tracking-wider block">
                Accounting &amp; Audit Summary:
              </span>
              <div className="space-y-1 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className="text-stone-600">Gross Wage Liability:</span>
                  <span className="font-bold text-stone-900">{formatCurrency(grandTotalWages)}</span>
                </div>
                <div className="flex justify-between text-amber-900">
                  <span>Less: Mid-Week Advances:</span>
                  <span className="font-bold">- {formatCurrency(grandTotalAdvances)}</span>
                </div>
                <div className="flex justify-between text-emerald-900 font-black border-t border-stone-300 pt-1 text-xs">
                  <span>Net Disbursed to Workers:</span>
                  <span>{formatCurrency(grandTotalBalanceDue)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Formal Sign-off Row */}
          <div className="avoid-break mt-6 pt-4 border-t-2 border-stone-300 grid grid-cols-3 gap-4 text-xs text-stone-700">
            <div>
              <div className="text-[10px] uppercase font-bold text-stone-400">Prepared &amp; Verified By:</div>
              <div className="font-bold text-stone-900 mt-5">{supervisorName}</div>
              <div className="text-[10px] text-stone-500">Site Supervisor / Resident Engineer</div>
            </div>

            <div className="text-center">
              <div className="text-[10px] uppercase font-bold text-stone-400">Worker Rep. / Jamadar:</div>
              <div className="font-bold text-stone-900 mt-5">_______________________</div>
              <div className="text-[10px] text-stone-500">Attendance &amp; Advance Confirmation</div>
            </div>

            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-stone-400">Authorized &amp; Disbursed:</div>
              <div className="font-bold text-stone-900 mt-5">Tahir Builders &amp; Developers</div>
              <div className="text-[10px] text-stone-500">Managing Partner / Accounts Approval</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
