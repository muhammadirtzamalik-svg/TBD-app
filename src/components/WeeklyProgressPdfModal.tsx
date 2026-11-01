import React, { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import {
  Printer,
  FileDown,
  X,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Wrench,
  Package,
  Info,
  ShieldCheck,
  UserCheck,
  Sparkles,
  Loader2,
  Check,
} from 'lucide-react';
import {
  ProjectSite,
  Worker,
  AttendanceRecord,
  AdditionalLaborPayment,
  SubcontractorPayment,
  Subcontractor,
  MaterialEntry,
  WeeklySiteNotes,
  AttendanceStatus,
  WorkerPayment,
} from '../types';
import {
  calculateDayWage,
  calculateSubcontractorLedger,
  formatCurrency,
  getWorkerWeeklyAdvance,
} from '../utils/constructionMath';

interface WeeklyProgressPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: ProjectSite;
  weekStartDate: string;
  weekDates: { date: string; formatted: string; dayNumber: number; dayShort: string }[];
  masons: Worker[];
  helpers: Worker[];
  laborers: Worker[];
  siteAttendance: AttendanceRecord[];
  additionalLabor: AdditionalLaborPayment[];
  subPaymentsThisWeek: SubcontractorPayment[];
  currentWeeklyNotes?: WeeklySiteNotes;
  siteTotals: {
    totalLabor: number;
    grandTotalLabor: number;
    additionalPaymentsSum: number;
    totalPaymentDue: number;
    paidByTBD: number;
    remainingPayable: number;
    subcontractorsSum: number;
    newWeeklyTotal: number;
  };
  directLaborWages: number;
  bricksRaitLabor: number;
  additionalPaymentsSum: number;
  subcontractors: Subcontractor[];
  subcontractorPayments: SubcontractorPayment[];
  materials: MaterialEntry[];
  workerPayments?: WorkerPayment[];
}

export const WeeklyProgressPdfModal: React.FC<WeeklyProgressPdfModalProps> = ({
  isOpen,
  onClose,
  site,
  weekStartDate,
  weekDates,
  masons,
  helpers,
  laborers,
  siteAttendance,
  additionalLabor,
  subPaymentsThisWeek,
  currentWeeklyNotes,
  siteTotals,
  directLaborWages,
  bricksRaitLabor,
  additionalPaymentsSum,
  subcontractors,
  subcontractorPayments,
  materials,
  workerPayments = [],
}) => {
  // Report customization options
  const [reportFormat, setReportFormat] = useState<'executive' | 'field_sheet'>('executive');
  const [includeMilestones, setIncludeMilestones] = useState(true);
  const [includeSubcontractors, setIncludeSubcontractors] = useState(true);
  const [includeMaterials, setIncludeMaterials] = useState(true);
  const [includeSignatures, setIncludeSignatures] = useState(true);

  // Editable report details
  const defaultRef = `TBD-WSR-${site.code}-${weekStartDate.replace(/-/g, '').slice(2)}`;
  const [reportRef, setReportRef] = useState(defaultRef);
  const [engineerName, setEngineerName] = useState('Engr. M. Tahir (Resident Engineer)');
  const [reportRemarks, setReportRemarks] = useState(
    currentWeeklyNotes?.siteRemarks ||
      'Mason work on lintel was finished smoothly on Friday. Rori lifting completed for foundation fill. Ready for next scheduled activity roof slab shuttering.'
  );

  // PDF Generation States (all hooks MUST be declared before any conditional return)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate worker wages, advances & attendance for this site & week
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

    const advance = getWorkerWeeklyAdvance(worker.id, weekStartDate, workerPayments, site.id);
    const balanceDue = totalWage - advance;

    return { totalUnits, totalWage, advance, balanceDue, daysRecord };
  };

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

  const totalLaborAdvances = masonsStats.totalAdvance + helpersStats.totalAdvance + laborersStats.totalAdvance;
  const totalLaborBalanceOwed = masonsStats.totalBalance + helpersStats.totalBalance + laborersStats.totalBalance;

  // Materials delivered this week to this site
  const siteMaterialsThisWeek = materials.filter(
    (m) => m.siteId === site.id && weekDates.some((w) => w.date === m.date)
  );
  const materialsTotalCost = siteMaterialsThisWeek.reduce((sum, m) => sum + m.total, 0);

  // Subcontractors linked to this site
  const siteSubs = subcontractors.filter((sub) => sub.siteId === site.id);

  // Client-side PDF generation & direct download
  const handleDownloadPdf = async () => {
    const reportElem = document.getElementById('weekly-progress-pdf-document');
    if (!reportElem) return;

    try {
      setIsGeneratingPdf(true);
      setDownloadError(null);
      setDownloadSuccess(false);

      // Render the report card to canvas with 2x scale for crisp print-grade resolution
      const canvas = await html2canvas(reportElem, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1024,
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

      // Subsequent pages if long document
      while (heightLeft > 0) {
        position = margin - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position, usableWidth, imgHeight);
        heightLeft -= usableHeight;
      }

      const cleanSiteCode = site.code ? site.code.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Site';
      const fileName = `TBD_Weekly_Progress_Report_${cleanSiteCode}_Week_${weekStartDate}.pdf`;
      pdf.save(fileName);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      setDownloadError('Direct PDF generation failed. Falling back to browser print dialog...');
      setTimeout(() => {
        handlePrint();
      }, 800);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Browser print fallback
  const handlePrint = () => {
    const originalTitle = document.title;
    const cleanSiteCode = site.code.replace(/[^a-zA-Z0-9_-]/g, '_');
    document.title = `TBD_Weekly_Progress_Report_${cleanSiteCode}_Week_${weekStartDate}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 overflow-y-auto modal-print-backdrop">
      <div className="bg-white rounded-2xl max-w-5xl w-full p-4 sm:p-7 shadow-2xl border border-stone-300 my-4 max-h-[94vh] overflow-y-auto modal-print-card text-stone-900">
        {/* MODAL CONTROLS & REPORT CONFIGURATION (HIDDEN ON PRINT) */}
        <div className="print:hidden space-y-4 mb-6 pb-5 border-b border-stone-200">
          {/* Top Bar with Title and Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                  <FileDown className="w-5 h-5" />
                </span>
                <h2 className="text-lg sm:text-xl font-black text-stone-900 font-sans tracking-tight">
                  Generate Weekly Site Progress Report
                </h2>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Site: <strong>{site.code}</strong> ({site.details || site.name}) • Week: <strong>{weekDates[0]?.formatted} — {weekDates[weekDates.length - 1]?.formatted}</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Primary Direct Download PDF Button */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 active:scale-[0.98] text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition disabled:opacity-60 cursor-pointer"
                title="Directly download a formatted .pdf file to your phone or computer"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating PDF...</span>
                  </>
                ) : downloadSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
                    <span>PDF Downloaded!</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4 stroke-[2.5]" />
                    <span>Download PDF File</span>
                  </>
                )}
              </button>

              {/* Secondary Print Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs sm:text-sm rounded-xl border border-stone-300 transition cursor-pointer"
                title="Open browser print dialog"
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

          {/* Download Success or Error Notification */}
          {downloadSuccess && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Report PDF successfully downloaded to your device! Check your downloads folder.</span>
            </div>
          )}

          {downloadError && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs font-semibold text-amber-900">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{downloadError}</span>
            </div>
          )}

          {/* Quick PDF Instructions Banner */}
          <div className="flex items-start gap-2.5 bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Instant PDF Save:</span> Tap <strong>&ldquo;Download PDF File&rdquo;</strong> to generate and save a real <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-300 text-amber-950 font-bold">.pdf</code> document directly to your device storage or phone. Or use <strong>&ldquo;Print Dialog&rdquo;</strong> for paper printer output.
            </div>
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs">
            {/* Column 1: Format Style */}
            <div>
              <label className="font-bold text-stone-700 block mb-1.5 uppercase text-[10px] tracking-wider">
                Report Style
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setReportFormat('executive')}
                  className={`py-2 px-2.5 rounded-lg text-center font-bold transition text-xs border ${
                    reportFormat === 'executive'
                      ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  Executive Report
                </button>
                <button
                  type="button"
                  onClick={() => setReportFormat('field_sheet')}
                  className={`py-2 px-2.5 rounded-lg text-center font-bold transition text-xs border ${
                    reportFormat === 'field_sheet'
                      ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  Field Sheet Replica
                </button>
              </div>
            </div>

            {/* Column 2: Sections to include */}
            <div>
              <label className="font-bold text-stone-700 block mb-1.5 uppercase text-[10px] tracking-wider">
                Include Sections
              </label>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-[11px]">
                <label className="flex items-center gap-1.5 cursor-pointer text-stone-700">
                  <input
                    type="checkbox"
                    checked={includeMilestones}
                    onChange={(e) => setIncludeMilestones(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>Milestone Activities</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-stone-700">
                  <input
                    type="checkbox"
                    checked={includeSubcontractors}
                    onChange={(e) => setIncludeSubcontractors(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>Subcontractors Ledger</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-stone-700">
                  <input
                    type="checkbox"
                    checked={includeMaterials}
                    onChange={(e) => setIncludeMaterials(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>Material Deliveries</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-stone-700">
                  <input
                    type="checkbox"
                    checked={includeSignatures}
                    onChange={(e) => setIncludeSignatures(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>Sign-off &amp; Stamps</span>
                </label>
              </div>
            </div>

            {/* Column 3: Report Ref & Engineer Name */}
            <div className="space-y-1.5">
              <div>
                <label className="font-bold text-stone-700 block uppercase text-[10px] tracking-wider">
                  Report Ref / Serial No.
                </label>
                <input
                  type="text"
                  value={reportRef}
                  onChange={(e) => setReportRef(e.target.value)}
                  className="w-full px-2.5 py-1 rounded-lg border border-stone-300 font-mono text-xs bg-white text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="font-bold text-stone-700 block uppercase text-[10px] tracking-wider">
                  Prepared By (Resident Engineer)
                </label>
                <input
                  type="text"
                  value={engineerName}
                  onChange={(e) => setEngineerName(e.target.value)}
                  className="w-full px-2.5 py-1 rounded-lg border border-stone-300 text-xs bg-white text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Editable Remarks for the Report */}
          <div>
            <label className="font-bold text-stone-700 block mb-1 text-xs">
              Weekly Progress &amp; Inspection Remarks (Printed in Report):
            </label>
            <textarea
              rows={2}
              value={reportRemarks}
              onChange={(e) => setReportRemarks(e.target.value)}
              className="w-full p-2 rounded-xl border border-stone-300 text-xs text-stone-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Enter site inspection commentary, work progress notes, or special directives..."
            />
          </div>
        </div>

        {/* =========================================================================
            THE PRINTABLE REPORT DOCUMENT (RENDERS FOR DISPLAY PREVIEW & PRINTER/PDF)
            ========================================================================= */}
        <div id="weekly-progress-pdf-document" className="sheet-paper bg-white text-stone-900 font-sans">
          {reportFormat === 'executive' ? (
            /* ==========================================================
               LAYOUT A: EXECUTIVE PROGRESS & FINANCIAL CONTROL REPORT
               ========================================================== */
            <div className="space-y-5">
              {/* Formal Company Header & Letterhead */}
              <div className="border-b-4 border-stone-900 pb-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <div className="text-[10px] font-extrabold tracking-widest uppercase text-amber-700">
                      Engineers &amp; General Contractors • Project Control Division
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-950 font-serif uppercase">
                      TAHIR BUILDERS &amp; DEVELOPERS
                    </h1>
                    <div className="text-[11px] font-semibold text-stone-600 tracking-wide uppercase">
                      Official Weekly Site Progress &amp; Financial Control Report
                    </div>
                  </div>
                  <div className="text-left sm:text-right font-mono text-xs text-stone-700 border-t sm:border-t-0 sm:border-l-2 border-stone-300 pt-1 sm:pt-0 sm:pl-4">
                    <div className="font-bold text-stone-950 text-sm">REF: {reportRef}</div>
                    <div className="text-[11px] text-stone-500">Date: {new Date().toLocaleDateString('en-GB')}</div>
                    <div className="text-[11px] font-semibold text-amber-900">
                      Week: {weekDates[0]?.formatted} — {weekDates[weekDates.length - 1]?.formatted}
                      <span className="text-[10px] text-stone-500 font-normal block">Work Week: Saturday to Thursday (Friday Off)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Project & Site Profile Card */}
              <div className="avoid-break bg-stone-50 border-2 border-stone-800 rounded-xl p-3.5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-500 block">Site Code &amp; Name</span>
                    <span className="font-black text-blue-900 text-sm">{site.code}</span>
                    <span className="text-[11px] text-stone-600 block">{site.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-500 block">Scope / Plot Size</span>
                    <span className="font-bold text-stone-800 text-sm">{site.details || 'N/A'}</span>
                    <span className="text-[11px] text-stone-500 block">{site.location || 'Active Site'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-500 block">Client Dossier</span>
                    <span className="font-bold text-stone-900">{site.clientName || 'Private Client'}</span>
                    <span className="text-[11px] text-stone-500 block font-mono">{site.clientPhone || 'Confidential'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-500 block">Contract Status</span>
                    <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold uppercase text-[10px]">
                      {site.status.toUpperCase()}
                    </span>
                    <span className="text-[11px] font-mono text-stone-700 block mt-0.5">
                      Contract: {formatCurrency(site.contractValue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Executive Financial KPI Cards */}
              <div className="avoid-break grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="border border-stone-300 rounded-xl p-2.5 bg-stone-50">
                  <span className="text-[10px] uppercase font-bold text-stone-500 block">Direct Labor Wages</span>
                  <span className="text-base sm:text-lg font-mono font-black text-blue-950">
                    Rs {directLaborWages.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-stone-500 block">Masons + Helpers + Laborers</span>
                </div>
                <div className="border border-stone-300 rounded-xl p-2.5 bg-stone-50">
                  <span className="text-[10px] uppercase font-bold text-stone-500 block">Additional Lifting</span>
                  <span className="text-base sm:text-lg font-mono font-black text-amber-900">
                    Rs {(bricksRaitLabor + additionalPaymentsSum).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-stone-500 block">Bricks/Rait &amp; Material Tasks</span>
                </div>
                <div className="border border-stone-300 rounded-xl p-2.5 bg-stone-50">
                  <span className="text-[10px] uppercase font-bold text-stone-500 block">Subcontractors Paid</span>
                  <span className="text-base sm:text-lg font-mono font-black text-orange-950">
                    Rs {siteTotals.subcontractorsSum.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-stone-500 block">Shuttering, Electrical, etc.</span>
                </div>
                <div className="border-2 border-stone-900 rounded-xl p-2.5 bg-stone-100">
                  <span className="text-[10px] uppercase font-extrabold text-stone-700 block">Total Weekly Outlay</span>
                  <span className="text-base sm:text-lg font-mono font-black text-stone-950">
                    Rs {siteTotals.newWeeklyTotal.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 block">
                    Rem. Due: Rs {siteTotals.remainingPayable.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Milestone Activities Section */}
              {includeMilestones && (
                <div className="avoid-break border border-stone-300 rounded-xl p-3.5 bg-stone-50/50 space-y-2">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-1.5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      Site Significant Activity Milestones
                    </h3>
                    <span className="text-[10px] text-stone-500 font-semibold">Critical Path Progress</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-extrabold uppercase text-emerald-800">
                          Last Significant Activity (Completed)
                        </span>
                        <span className="text-[10px] font-mono font-bold text-emerald-900">
                          {site.lastSignificantActivity?.date || 'N/A'}
                        </span>
                      </div>
                      <p className="font-semibold text-emerald-950 text-xs">
                        {site.lastSignificantActivity?.description || 'Lintel casting and curing completed.'}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-extrabold uppercase text-blue-800">
                          Next Significant Activity (Scheduled)
                        </span>
                        <span className="text-[10px] font-mono font-bold text-blue-900">
                          {site.nextSignificantActivity?.date || 'N/A'}
                        </span>
                      </div>
                      <p className="font-semibold text-blue-950 text-xs">
                        {site.nextSignificantActivity?.description || 'Roof slab shuttering, steel binding & pouring.'}
                      </p>
                    </div>
                  </div>

                  {reportRemarks && (
                    <div className="pt-2 text-xs text-stone-700 border-t border-stone-200">
                      <span className="font-bold text-stone-900">Field Progress Remarks: </span>
                      <span className="italic">{reportRemarks}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Labor Attendance & Daily Toll Table */}
              <div className="avoid-break border-2 border-stone-800 rounded-xl overflow-hidden">
                <div className="bg-stone-800 text-white px-3 py-1.5 flex justify-between items-center text-xs">
                  <span className="font-bold uppercase tracking-wider text-[11px]">
                    Labor Daily Toll &amp; Wage Distribution
                  </span>
                  <span className="font-mono text-[10px] text-stone-300">
                    Week Span: {weekDates[0]?.dayNumber} to {weekDates[weekDates.length - 1]?.dayNumber}
                  </span>
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-200/90 border-b-2 border-stone-800 font-bold text-stone-800">
                      <th className="py-2 px-3 border-r-2 border-stone-800 w-36">Worker Name &amp; Role</th>
                      {weekDates.map((w) => (
                        <th key={w.date} className="py-2 px-1 text-center border-r border-stone-300 font-mono w-14">
                          <div>{w.dayNumber}</div>
                          <div className="text-[9px] font-normal text-stone-600 uppercase">{w.dayShort}</div>
                        </th>
                      ))}
                      <th className="py-2 px-2.5 text-right font-bold w-24">Gross Wages</th>
                      <th className="py-2 px-2 text-right font-bold w-20 border-l border-stone-300 bg-amber-50/50">Advance</th>
                      <th className="py-2 px-2.5 text-right font-bold w-24 border-l border-stone-300 bg-emerald-50/50">Net Owed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* MASONS */}
                    <tr className="bg-stone-100 font-bold text-stone-800 border-b border-stone-400">
                      <td colSpan={weekDates.length + 4} className="py-1 px-3 uppercase tracking-wider text-[10px] bg-stone-200/60">
                        Masons (Mistri)
                      </td>
                    </tr>
                    {masons.map((mason) => {
                      const stats = getWorkerWeekStats(mason);
                      return (
                        <tr key={mason.id} className="border-b border-stone-200">
                          <td className="py-1.5 px-3 font-semibold text-blue-900 border-r-2 border-stone-800">
                            <div>{mason.name}</div>
                            <div className="text-[9px] text-stone-500 font-mono font-normal">Rs {mason.dailyWage}/d</div>
                          </td>
                          {weekDates.map((w) => {
                            const rec = stats.daysRecord[w.date];
                            return (
                              <td
                                key={w.date}
                                className={`py-1.5 px-1 text-center font-bold border-r border-stone-200 font-mono ${
                                  rec.units > 0 ? 'bg-amber-100/50 text-stone-900' : 'text-stone-300'
                                }`}
                              >
                                {rec.status || '-'}
                              </td>
                            );
                          })}
                          <td className="py-1.5 px-2.5 text-right font-mono font-bold text-stone-900">
                            {stats.totalWage > 0 ? stats.totalWage.toLocaleString() : '-'}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono font-bold text-amber-900 border-l border-stone-200 bg-amber-50/30">
                            {stats.advance > 0 ? stats.advance.toLocaleString() : '-'}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-bold border-l border-stone-200 bg-emerald-50/30">
                            <span className={stats.balanceDue > 0 ? 'text-emerald-800 font-bold' : stats.balanceDue < 0 ? 'text-red-600 font-bold' : 'text-stone-400'}>
                              {stats.balanceDue !== 0 ? stats.balanceDue.toLocaleString() : '-'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-stone-100/70 border-b-2 border-stone-800 font-semibold text-[11px]">
                      <td colSpan={weekDates.length} className="py-1 px-3 text-right text-stone-600"></td>
                      <td className="py-1 px-2 text-center border-r border-stone-300 font-mono font-bold text-stone-800">
                        Total = {String(masonsStats.activeHeadcount).padStart(2, '0')}
                      </td>
                      <td className="py-1 px-2.5 text-right font-mono font-bold text-stone-900">
                        {masonsStats.totalWages.toLocaleString()}
                      </td>
                      <td className="py-1 px-2 text-right font-mono font-bold text-amber-900 border-l border-stone-200 bg-amber-50/50">
                        {masonsStats.totalAdvance.toLocaleString()}
                      </td>
                      <td className="py-1 px-2.5 text-right font-mono font-bold text-emerald-850 border-l border-stone-200 bg-emerald-50/50">
                        {masonsStats.totalBalance.toLocaleString()}
                      </td>
                    </tr>

                    {/* HELPERS */}
                    <tr className="bg-stone-100 font-bold text-stone-800 border-b border-stone-400">
                      <td colSpan={weekDates.length + 4} className="py-1 px-3 uppercase tracking-wider text-[10px] bg-stone-200/60">
                        Helpers
                      </td>
                    </tr>
                    {helpers.length === 0 ? (
                      <tr className="border-b border-stone-200">
                        <td colSpan={weekDates.length + 4} className="py-1 px-3 text-stone-400 italic text-center text-xs">
                          No helpers assigned
                        </td>
                      </tr>
                    ) : (
                      helpers.map((helper) => {
                        const stats = getWorkerWeekStats(helper);
                        return (
                          <tr key={helper.id} className="border-b border-stone-200">
                            <td className="py-1.5 px-3 font-semibold text-blue-900 border-r-2 border-stone-800">
                              <div>{helper.name}</div>
                              <div className="text-[9px] text-stone-500 font-mono font-normal">Rs {helper.dailyWage}/d</div>
                            </td>
                            {weekDates.map((w) => {
                              const rec = stats.daysRecord[w.date];
                              return (
                                <td
                                  key={w.date}
                                  className={`py-1.5 px-1 text-center font-bold border-r border-stone-200 font-mono ${
                                    rec.units > 0 ? 'bg-amber-100/50 text-stone-900' : 'text-stone-300'
                                  }`}
                                >
                                  {rec.status || '-'}
                                </td>
                              );
                            })}
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold text-stone-900">
                              {stats.totalWage > 0 ? stats.totalWage.toLocaleString() : '-'}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold text-amber-900 border-l border-stone-200 bg-amber-50/30">
                              {stats.advance > 0 ? stats.advance.toLocaleString() : '-'}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold border-l border-stone-200 bg-emerald-50/30">
                              <span className={stats.balanceDue > 0 ? 'text-emerald-800 font-bold' : stats.balanceDue < 0 ? 'text-red-600 font-bold' : 'text-stone-400'}>
                                {stats.balanceDue !== 0 ? stats.balanceDue.toLocaleString() : '-'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                    <tr className="bg-stone-100/70 border-b-2 border-stone-800 font-semibold text-[11px]">
                      <td colSpan={weekDates.length} className="py-1 px-3 text-right text-stone-600"></td>
                      <td className="py-1 px-2 text-center border-r border-stone-300 font-mono font-bold text-stone-800">
                        Total = {helpersStats.activeHeadcount > 0 ? String(helpersStats.activeHeadcount).padStart(2, '0') : '__'}
                      </td>
                      <td className="py-1 px-2.5 text-right font-mono font-bold text-stone-900">
                        {helpersStats.totalWages > 0 ? helpersStats.totalWages.toLocaleString() : '___'}
                      </td>
                      <td className="py-1 px-2 text-right font-mono font-bold text-amber-900 border-l border-stone-200 bg-amber-50/50">
                        {helpersStats.totalAdvance.toLocaleString()}
                      </td>
                      <td className="py-1 px-2.5 text-right font-mono font-bold text-emerald-850 border-l border-stone-200 bg-emerald-50/50">
                        {helpersStats.totalBalance.toLocaleString()}
                      </td>
                    </tr>

                    {/* LABORERS */}
                    <tr className="bg-stone-100 font-bold text-stone-800 border-b border-stone-400">
                      <td colSpan={weekDates.length + 4} className="py-1 px-3 uppercase tracking-wider text-[10px] bg-stone-200/60">
                        Laborers (Mazdoor)
                      </td>
                    </tr>
                    {laborers.map((laborer) => {
                      const stats = getWorkerWeekStats(laborer);
                      return (
                        <tr key={laborer.id} className="border-b border-stone-200">
                          <td className="py-1.5 px-3 font-semibold text-blue-900 border-r-2 border-stone-800">
                            <div>{laborer.name}</div>
                            <div className="text-[9px] text-stone-500 font-mono font-normal">Rs {laborer.dailyWage}/d</div>
                          </td>
                          {weekDates.map((w) => {
                            const rec = stats.daysRecord[w.date];
                            return (
                              <td
                                key={w.date}
                                className={`py-1.5 px-1 text-center font-bold border-r border-stone-200 font-mono ${
                                  rec.units > 0 ? 'bg-amber-100/50 text-stone-900' : 'text-stone-300'
                                }`}
                              >
                                {rec.status || '-'}
                              </td>
                            );
                          })}
                          <td className="py-1.5 px-2.5 text-right font-mono font-bold text-stone-900">
                            {stats.totalWage > 0 ? stats.totalWage.toLocaleString() : '-'}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono font-bold text-amber-900 border-l border-stone-200 bg-amber-50/30">
                            {stats.advance > 0 ? stats.advance.toLocaleString() : '-'}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-bold border-l border-stone-200 bg-emerald-50/30">
                            <span className={stats.balanceDue > 0 ? 'text-emerald-800 font-bold' : stats.balanceDue < 0 ? 'text-red-600 font-bold' : 'text-stone-400'}>
                              {stats.balanceDue !== 0 ? stats.balanceDue.toLocaleString() : '-'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-stone-100/70 border-b-2 border-stone-800 font-semibold text-[11px]">
                      <td colSpan={weekDates.length} className="py-1 px-3 text-right text-stone-600"></td>
                      <td className="py-1 px-2 text-center border-r border-stone-300 font-mono font-bold text-stone-800">
                        Total = {String(laborersStats.activeHeadcount).padStart(2, '0')}
                      </td>
                      <td className="py-1 px-2.5 text-right font-mono font-bold text-stone-900">
                        {laborersStats.totalWages.toLocaleString()}
                      </td>
                      <td className="py-1 px-2 text-right font-mono font-bold text-amber-900 border-l border-stone-200 bg-amber-50/50">
                        {laborersStats.totalAdvance.toLocaleString()}
                      </td>
                      <td className="py-1 px-2.5 text-right font-mono font-bold text-emerald-850 border-l border-stone-200 bg-emerald-50/50">
                        {laborersStats.totalBalance.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Lower Section Grid: Financial Reconciliation & Subcontractor Progress */}
              <div className="avoid-break grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Left: Financial Statement & Additional Work */}
                <div className="space-y-3">
                  {/* Total Labor Payment Box */}
                  <div className="border-2 border-stone-800 rounded-xl p-3 bg-stone-50">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-stone-800 border-b border-stone-300 pb-1 mb-2">
                      Labor Financial Breakdown
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between py-1 border-b border-stone-200">
                        <span className="text-stone-700">Direct Labor Attendance Wages</span>
                        <span className="font-mono font-bold text-blue-900">
                          Rs {directLaborWages.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-stone-200 text-amber-900">
                        <span>Less: Weekly Advances Deducted</span>
                        <span className="font-mono font-bold">
                          - Rs {totalLaborAdvances.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-stone-200 text-emerald-900 bg-emerald-50/60 px-1 rounded">
                        <span className="font-bold">Net Direct Labor Balance Owed</span>
                        <span className="font-mono font-black">
                          Rs {totalLaborBalanceOwed.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-stone-200">
                        <span className="text-stone-700">Bricks / Rait (Sand) Lifting</span>
                        <span className="font-mono font-bold text-stone-800">
                          Rs {bricksRaitLabor.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-stone-300 font-bold bg-amber-50/60 px-2 rounded">
                        <span className="text-stone-900">Gross Total Labor Incurred</span>
                        <span className="font-mono font-bold text-stone-900">
                          Rs {siteTotals.grandTotalLabor.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 text-stone-700">
                        <span>Additional Payments (Rori, Tasks)</span>
                        <span className="font-mono font-bold">
                          Rs {additionalPaymentsSum.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-t-2 border-stone-800 font-black text-sm">
                        <span className="text-stone-900">Total Payment Due</span>
                        <span className="font-mono text-stone-950">
                          Rs {siteTotals.totalPaymentDue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Additional Labor Table */}
                  <div className="border border-stone-300 rounded-xl p-3 bg-white">
                    <h4 className="font-bold text-[11px] uppercase tracking-wider text-stone-700 mb-1.5">
                      Additional Itemized Tasks &amp; Lifting
                    </h4>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-stone-500 text-[10px] border-b border-stone-200">
                          <th className="text-left py-1">Item Description</th>
                          <th className="text-right py-1">Amount</th>
                          <th className="text-right py-1">Paid By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {additionalLabor.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-1 text-stone-400 italic text-center">
                              No additional payments
                            </td>
                          </tr>
                        ) : (
                          additionalLabor.map((item) => (
                            <tr key={item.id}>
                              <td className="py-1 font-semibold text-blue-900">{item.item}</td>
                              <td className="py-1 text-right font-mono font-bold">{item.amount.toLocaleString()}</td>
                              <td className="py-1 text-right font-mono font-bold text-amber-700">{item.paidBy || 'TBD'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right: Notes / Reconciliation Statement & Subcontractor Progress */}
                <div className="space-y-3">
                  {/* Settlement Ledger Notes Box */}
                  <div className="border-2 border-stone-800 rounded-xl p-3.5 bg-amber-50/40">
                    <h4 className="font-black text-xs uppercase tracking-widest text-stone-900 border-b border-stone-300 pb-1 mb-2">
                      Weekly Site Settlement Ledger
                    </h4>
                    <div className="font-mono text-xs leading-relaxed space-y-1.5">
                      <div className="flex justify-between">
                        <span className="font-semibold text-stone-700">Total Labor &amp; Expense Due:</span>
                        <span className="font-bold text-stone-900">Rs {siteTotals.totalPaymentDue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-blue-950 font-semibold">
                        <span>Paid by TBD (Tahir Builders):</span>
                        <span className="font-bold">Rs {siteTotals.paidByTBD.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-emerald-900 font-extrabold border-t border-stone-300 pt-1">
                        <span>Net Remaining Payable:</span>
                        <span className="font-black">Rs {siteTotals.remainingPayable.toLocaleString()}</span>
                      </div>
                      {subPaymentsThisWeek.length > 0 && (
                        <div className="pt-1 border-t border-stone-300 space-y-1">
                          {subPaymentsThisWeek.map((sp) => {
                            const sub = subcontractors.find((s) => s.id === sp.subcontractorId);
                            return (
                              <div key={sp.id} className="flex justify-between text-orange-900 font-semibold text-[11px]">
                                <span>+ {sub?.name || 'Subcontractor'}:</span>
                                <span className="font-bold">Rs {sp.amount.toLocaleString()}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="flex justify-between text-stone-950 font-black text-sm border-t-2 border-stone-800 pt-1.5 mt-1">
                        <span>Grand Weekly Total:</span>
                        <span>Rs {siteTotals.newWeeklyTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Subcontractor Ledger */}
                  {includeSubcontractors && (
                    <div className="border border-stone-300 rounded-xl p-3 bg-white">
                      <h4 className="font-bold text-[11px] uppercase tracking-wider text-stone-800 mb-1.5 flex items-center justify-between">
                        <span>Subcontractor Contract Balances</span>
                        <span className="text-[10px] text-stone-500 font-normal">Active Contracts</span>
                      </h4>
                      <div className="space-y-1.5 text-xs">
                        {siteSubs.length === 0 ? (
                          <div className="text-stone-400 italic text-center py-1">No subcontractors linked to site</div>
                        ) : (
                          siteSubs.map((sub) => {
                            const payments = subcontractorPayments.filter((p) => p.subcontractorId === sub.id);
                            const ledger = calculateSubcontractorLedger(sub.contractValue, payments);
                            return (
                              <div key={sub.id} className="flex justify-between items-center py-1 border-b border-stone-100 text-[11px]">
                                <div>
                                  <span className="font-bold text-stone-900 block">{sub.name}</span>
                                  <span className="text-[10px] text-stone-500 uppercase">{sub.category.replace('_', ' ')}</span>
                                </div>
                                <div className="text-right font-mono">
                                  <span className="text-[10px] text-stone-500 block">
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
                  )}
                </div>
              </div>

              {/* Weekly Materials Received Section */}
              {includeMaterials && siteMaterialsThisWeek.length > 0 && (
                <div className="avoid-break border border-stone-300 rounded-xl p-3 bg-white space-y-1.5">
                  <div className="flex justify-between items-center border-b border-stone-200 pb-1">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-amber-700" />
                      Materials Received on Site This Week
                    </h4>
                    <span className="font-mono text-xs font-bold text-stone-900">
                      Total: Rs {materialsTotalCost.toLocaleString()}
                    </span>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-stone-500 text-[10px] border-b border-stone-200">
                        <th className="text-left py-1">Date</th>
                        <th className="text-left py-1">Material</th>
                        <th className="text-left py-1">Quantity</th>
                        <th className="text-left py-1">Supplier</th>
                        <th className="text-right py-1">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-medium">
                      {siteMaterialsThisWeek.map((m) => (
                        <tr key={m.id}>
                          <td className="py-1 font-mono text-[11px] text-stone-600">{m.date}</td>
                          <td className="py-1 font-semibold text-stone-900">{m.material}</td>
                          <td className="py-1 text-stone-700">
                            {m.quantity} {m.unit}
                          </td>
                          <td className="py-1 text-stone-600">{m.supplier || 'Site Direct'}</td>
                          <td className="py-1 text-right font-mono font-bold text-stone-900">
                            Rs {m.total.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Official Verification Sign-off & Stamps Block */}
              {includeSignatures && (
                <div className="avoid-break pt-6 border-t-2 border-stone-800 text-xs">
                  <div className="grid grid-cols-2 gap-8 text-stone-800">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-stone-500 mb-6">
                        Site In-Charge / Resident Engineer Verification:
                      </div>
                      <div className="border-b border-stone-900 pb-1">
                        <span className="font-bold text-stone-900">{engineerName}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-stone-500 mt-1">
                        <span>Signature &amp; Stamp</span>
                        <span>Date: {new Date().toLocaleDateString('en-GB')}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-stone-500 mb-6">
                        Authorized Executive Approval:
                      </div>
                      <div className="border-b border-stone-900 pb-1">
                        <span className="font-bold text-stone-950">Tahir Builders &amp; Developers (TBD)</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-stone-500 mt-1">
                        <span>Managing Partner / Director</span>
                        <span>Official Seal</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-center text-[10px] text-stone-400 mt-4">
                    Authentic computerized construction progress &amp; financial report generated by TBD Construction Control System.
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ==========================================================
               LAYOUT B: FIELD SHEET REPLICA (Exact match to paper form)
               ========================================================== */
            <div className="space-y-4">
              {/* Company Branding Banner */}
              <div className="text-center border-b-2 border-stone-800 pb-2 mb-3">
                <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-700">
                  Engineers &amp; General Contractors
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-wider uppercase text-stone-900 font-serif">
                  TAHIR BUILDERS &amp; DEVELOPERS
                </h1>
                <p className="text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase text-stone-600">
                  Weekly Construction Site Control &amp; Labor Toll Ledger
                </p>
              </div>

              {/* Header: Site Code, Details, Dates */}
              <div className="border-b-2 border-stone-800 pb-2 mb-3 flex justify-between items-baseline">
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-extrabold tracking-tight text-blue-900 uppercase font-mono">
                    {site.code}
                  </span>
                  <span className="text-lg font-bold text-stone-700">{site.details || site.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-stone-800">
                    Week: {weekDates[0]?.formatted} — {weekDates[weekDates.length - 1]?.formatted}
                  </span>
                </div>
              </div>

              {/* Attendance Table */}
              <div className="border-2 border-stone-800 rounded-lg overflow-hidden">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-stone-200 border-b-2 border-stone-800 text-stone-800 font-bold">
                      <th className="py-2 px-3 border-r-2 border-stone-800 w-36">Date</th>
                      {weekDates.map((w) => (
                        <th key={w.date} className="py-2 px-2 text-center border-r border-stone-400 font-mono text-sm w-16">
                          <div>{w.dayNumber}</div>
                          <div className="text-[10px] font-normal text-stone-500 uppercase">{w.dayShort}</div>
                        </th>
                      ))}
                      <th className="py-2 px-3 text-right font-bold w-32">Total Wages</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* MASONS */}
                    <tr className="bg-stone-100 font-bold text-stone-800 border-b border-stone-400">
                      <td colSpan={weekDates.length + 2} className="py-1 px-3 uppercase tracking-wider text-[11px] bg-stone-200/50">
                        Masons
                      </td>
                    </tr>
                    {masons.map((mason) => {
                      const stats = getWorkerWeekStats(mason);
                      return (
                        <tr key={mason.id} className="border-b border-stone-300">
                          <td className="py-2 px-3 font-semibold text-blue-900 border-r-2 border-stone-800">
                            <div>{mason.name}</div>
                            <div className="text-[10px] text-stone-400 font-mono">Rs {mason.dailyWage}/d</div>
                          </td>
                          {weekDates.map((w) => (
                            <td key={w.date} className="py-2 px-1 text-center font-bold border-r border-stone-300 font-mono">
                              {stats.daysRecord[w.date]?.status || '-'}
                            </td>
                          ))}
                          <td className="py-2 px-3 text-right font-mono font-bold text-stone-900">
                            {stats.totalWage > 0 ? stats.totalWage.toLocaleString() : '-'}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-stone-100/80 border-b-2 border-stone-800 font-semibold text-xs">
                      <td colSpan={weekDates.length} className="py-1.5 px-3 text-right"></td>
                      <td className="py-1.5 px-3 text-center border-r border-stone-400 font-mono font-bold text-stone-800">
                        Total No. = {String(masonsStats.activeHeadcount).padStart(2, '0')}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold text-stone-900">
                        Wages = {masonsStats.totalWages.toLocaleString()}
                      </td>
                    </tr>

                    {/* HELPERS */}
                    <tr className="bg-stone-100 font-bold text-stone-800 border-b border-stone-400">
                      <td colSpan={weekDates.length + 2} className="py-1 px-3 uppercase tracking-wider text-[11px] bg-stone-200/50">
                        Helpers
                      </td>
                    </tr>
                    {helpers.length === 0 ? (
                      <tr className="border-b border-stone-300">
                        <td colSpan={weekDates.length + 2} className="py-2 px-3 text-stone-400 italic text-center">
                          No helpers assigned this week
                        </td>
                      </tr>
                    ) : (
                      helpers.map((helper) => {
                        const stats = getWorkerWeekStats(helper);
                        return (
                          <tr key={helper.id} className="border-b border-stone-300">
                            <td className="py-2 px-3 font-semibold text-blue-900 border-r-2 border-stone-800">
                              <div>{helper.name}</div>
                              <div className="text-[10px] text-stone-400 font-mono">Rs {helper.dailyWage}/d</div>
                            </td>
                            {weekDates.map((w) => (
                              <td key={w.date} className="py-2 px-1 text-center font-bold border-r border-stone-300 font-mono">
                                {stats.daysRecord[w.date]?.status || '-'}
                              </td>
                            ))}
                            <td className="py-2 px-3 text-right font-mono font-bold text-stone-900">
                              {stats.totalWage > 0 ? stats.totalWage.toLocaleString() : '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                    <tr className="bg-stone-100/80 border-b-2 border-stone-800 font-semibold text-xs">
                      <td colSpan={weekDates.length} className="py-1.5 px-3 text-right"></td>
                      <td className="py-1.5 px-3 text-center border-r border-stone-400 font-mono font-bold text-stone-800">
                        Total No. = {helpersStats.activeHeadcount > 0 ? String(helpersStats.activeHeadcount).padStart(2, '0') : '__'}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold text-stone-900">
                        Wages = {helpersStats.totalWages > 0 ? helpersStats.totalWages.toLocaleString() : '___'}
                      </td>
                    </tr>

                    {/* LABORERS */}
                    <tr className="bg-stone-100 font-bold text-stone-800 border-b border-stone-400">
                      <td colSpan={weekDates.length + 2} className="py-1 px-3 uppercase tracking-wider text-[11px] bg-stone-200/50">
                        Laborer
                      </td>
                    </tr>
                    {laborers.map((laborer) => {
                      const stats = getWorkerWeekStats(laborer);
                      return (
                        <tr key={laborer.id} className="border-b border-stone-300">
                          <td className="py-2 px-3 font-semibold text-blue-900 border-r-2 border-stone-800">
                            <div>{laborer.name}</div>
                            <div className="text-[10px] text-stone-400 font-mono">Rs {laborer.dailyWage}/d</div>
                          </td>
                          {weekDates.map((w) => (
                            <td key={w.date} className="py-2 px-1 text-center font-bold border-r border-stone-300 font-mono">
                              {stats.daysRecord[w.date]?.status || '-'}
                            </td>
                          ))}
                          <td className="py-2 px-3 text-right font-mono font-bold text-stone-900">
                            {stats.totalWage > 0 ? stats.totalWage.toLocaleString() : '-'}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-stone-100/80 font-semibold text-xs">
                      <td colSpan={weekDates.length} className="py-1.5 px-3 text-right"></td>
                      <td className="py-1.5 px-3 text-center border-r border-stone-400 font-mono font-bold text-stone-800">
                        Total No. = {String(laborersStats.activeHeadcount).padStart(2, '0')}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold text-stone-900">
                        Wages = {laborersStats.totalWages.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Lower Reconciliation Blocks */}
              <div className="avoid-break grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                {/* Left Side: Total Labor Payment + Additional Payments */}
                <div className="space-y-3">
                  <div className="border-2 border-stone-800 rounded-lg p-3 bg-stone-50/50">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-stone-700 border-b border-stone-300 pb-1 mb-2">
                      Total Labor Payment
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between py-1 border-b border-stone-200">
                        <span className="font-semibold text-stone-700">Total Labor =</span>
                        <span className="font-mono font-bold text-blue-900">{directLaborWages.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-stone-200">
                        <span className="font-semibold text-stone-700">Bricks/Rait =</span>
                        <span className="font-mono font-bold text-stone-900">{bricksRaitLabor.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1 font-bold">
                        <span className="text-stone-900">Grand Total =</span>
                        <span className="font-mono font-bold text-stone-900">
                          {siteTotals.grandTotalLabor.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-2 border-stone-800 rounded-lg p-3 bg-stone-50/50">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-stone-700 border-b border-stone-300 pb-1 mb-2">
                      Additional Payments
                    </h4>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-stone-500 text-[10px] border-b border-stone-200">
                          <th className="text-left py-1">Item</th>
                          <th className="text-right py-1">Amount</th>
                          <th className="text-right py-1">Paid By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200">
                        {additionalLabor.map((item) => (
                          <tr key={item.id} className="font-medium">
                            <td className="py-1 text-blue-900 font-semibold">{item.item}</td>
                            <td className="py-1 text-right font-mono font-bold">{item.amount.toLocaleString()}</td>
                            <td className="py-1 text-right font-mono font-bold text-amber-700">{item.paidBy || 'TBD'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-stone-800 font-bold">
                          <td className="py-1.5 text-stone-900">Total Amount =</td>
                          <td className="py-1.5 text-right font-mono text-sm">
                            {additionalPaymentsSum.toLocaleString()}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Right Side: ITEM/PAYMENT + NOTES */}
                <div className="space-y-3">
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
                          <td className="py-1.5">Total Payment Due</td>
                          <td className="py-1.5 text-right font-mono">
                            = {siteTotals.totalPaymentDue.toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="border-2 border-stone-800 rounded-lg p-4 bg-amber-50/30">
                    <h4 className="font-extrabold text-xs uppercase tracking-widest text-stone-800 border-b border-stone-300 pb-1 mb-2">
                      NOTES:
                    </h4>
                    <div className="font-mono text-sm leading-relaxed text-blue-950 font-bold space-y-1">
                      <div className="text-base font-extrabold text-stone-900">
                        Total = {siteTotals.totalPaymentDue.toLocaleString()}
                      </div>
                      <div className="text-stone-800">
                        Paid by TBD = {siteTotals.paidByTBD.toLocaleString()}
                      </div>
                      <div className="text-emerald-900 font-extrabold pt-1 border-t border-stone-300">
                        Rem. Payable = {siteTotals.remainingPayable.toLocaleString()}
                      </div>
                      {subPaymentsThisWeek.map((sp) => {
                        const sub = subcontractors.find((s) => s.id === sp.subcontractorId);
                        return (
                          <div key={sp.id} className="text-orange-900">
                            + {sub?.name || 'Subcontractor'} = {sp.amount.toLocaleString()}
                          </div>
                        );
                      })}
                      <div className="text-lg font-black text-amber-900 border-t-2 border-stone-800 pt-1 mt-1">
                        New Total = {siteTotals.newWeeklyTotal.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Signature Row */}
              <div className="avoid-break mt-6 pt-4 border-t border-stone-400 flex justify-between items-end text-xs text-stone-600">
                <div>
                  <div className="font-semibold text-stone-800">Site Supervisor: ______________________</div>
                  <div className="text-[10px] text-stone-400 mt-1">Verified on site &amp; recorded</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-stone-800">Tahir Builders &amp; Developers (TBD)</div>
                  <div className="text-[10px] text-stone-400 mt-1">Authorized Contractor &amp; Managing Partner</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
