import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Clock,
  DollarSign,
  Calendar,
  CheckCircle,
  FileText,
  MapPin,
  User,
  Phone,
  ArrowUpRight,
  X,
  CreditCard,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { ConstructionAppData, ProjectSite, ClientReceipt } from '../types';
import { formatCurrency } from '../utils/constructionMath';

interface ProjectsViewProps {
  data: ConstructionAppData;
  onUpdateData: (newData: ConstructionAppData) => void;
  onOpenWeeklySheet: (siteId: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  data,
  onUpdateData,
  onOpenWeeklySheet,
}) => {
  const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false);
  const [receiptSite, setReceiptSite] = useState<ProjectSite | null>(null);
  const [siteToDelete, setSiteToDelete] = useState<ProjectSite | null>(null);

  // New site form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');
  const [contractValue, setContractValue] = useState('');
  const [location, setLocation] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [lastActDate, setLastActDate] = useState('');
  const [lastActDesc, setLastActDesc] = useState('');
  const [nextActDate, setNextActDate] = useState('');
  const [nextActDesc, setNextActDesc] = useState('');

  // Receipt form state
  const [receiptAmount, setReceiptAmount] = useState('');
  const [receiptMethod, setReceiptMethod] = useState('Bank Transfer');
  const [receiptRef, setReceiptRef] = useState('');
  const [receiptNotes, setReceiptNotes] = useState('');

  const handleAddSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name) return;

    const newSite: ProjectSite = {
      id: `site-${Date.now()}`,
      code: code.trim().toUpperCase(),
      name,
      details: details || `${code} Construction Project`,
      contractValue: parseFloat(contractValue) || 0,
      status: 'active',
      location,
      clientName,
      clientPhone,
      startDate: new Date().toISOString().split('T')[0],
      lastSignificantActivity: lastActDesc
        ? { date: lastActDate || new Date().toISOString().split('T')[0], description: lastActDesc, status: 'completed' }
        : undefined,
      nextSignificantActivity: nextActDesc
        ? { date: nextActDate || '', description: nextActDesc, status: 'planned' }
        : undefined,
    };

    onUpdateData({
      ...data,
      sites: [...data.sites, newSite],
    });

    setCode('');
    setName('');
    setDetails('');
    setContractValue('');
    setLocation('');
    setClientName('');
    setClientPhone('');
    setLastActDate('');
    setLastActDesc('');
    setNextActDate('');
    setNextActDesc('');
    setIsAddSiteModalOpen(false);
  };

  const handleAddReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptSite || !receiptAmount) return;

    const newReceipt: ClientReceipt = {
      id: `cr-${Date.now()}`,
      siteId: receiptSite.id,
      date: new Date().toISOString().split('T')[0],
      amount: parseFloat(receiptAmount) || 0,
      paymentMethod: receiptMethod,
      referenceNo: receiptRef,
      notes: receiptNotes,
    };

    onUpdateData({
      ...data,
      clientReceipts: [...data.clientReceipts, newReceipt],
    });

    setReceiptSite(null);
    setReceiptAmount('');
    setReceiptRef('');
    setReceiptNotes('');
  };

  const handleDeleteSite = (siteId: string) => {
    const updatedSites = data.sites.filter((s) => s.id !== siteId);
    const updatedAttendance = data.attendance.filter((a) => a.siteId !== siteId);
    const updatedAdditional = data.additionalPayments.filter((a) => a.siteId !== siteId);
    const updatedSubPayments = data.subcontractorPayments.filter((p) => p.siteId !== siteId);
    const updatedMaterials = data.materials.filter((m) => m.siteId !== siteId);
    const updatedReceipts = data.clientReceipts.filter((r) => r.siteId !== siteId);
    const updatedWeeklyNotes = data.weeklyNotes.filter((w) => w.siteId !== siteId);
    const updatedSubcontractors = data.subcontractors.filter((sub) => sub.siteId !== siteId);

    onUpdateData({
      ...data,
      sites: updatedSites,
      attendance: updatedAttendance,
      additionalPayments: updatedAdditional,
      subcontractorPayments: updatedSubPayments,
      materials: updatedMaterials,
      clientReceipts: updatedReceipts,
      weeklyNotes: updatedWeeklyNotes,
      subcontractors: updatedSubcontractors,
    });
    setSiteToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-stone-900 uppercase">Construction Project Sites</h2>
          <p className="text-xs text-stone-500">
            Active construction sites, client contract values, cumulative financial outlays, and activity milestones.
          </p>
        </div>
        <button
          onClick={() => setIsAddSiteModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-[0.98] rounded-xl shadow-sm transition shrink-0"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Add New Project / Site</span>
        </button>
      </div>

      {/* Projects List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {data.sites.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border-2 border-dashed border-stone-300 p-8 text-center space-y-3">
            <Building2 className="w-12 h-12 text-stone-300 mx-auto" />
            <h3 className="font-bold text-stone-700 text-base">No Construction Sites</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              All sites have been removed. Click &quot;Add New Project / Site&quot; above to create a new active project site.
            </p>
            <button
              onClick={() => setIsAddSiteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Add Project Site
            </button>
          </div>
        )}
        {data.sites.map((site) => {
          // Calculate site financials
          const siteAttendance = data.attendance.filter((a) => a.siteId === site.id && a.units > 0);
          const laborCost = siteAttendance.reduce((sum, a) => sum + (a.wage || 0), 0);

          const additionalCost = data.additionalPayments
            .filter((a) => a.siteId === site.id)
            .reduce((sum, a) => sum + a.amount, 0);

          const subPayments = data.subcontractorPayments
            .filter((p) => p.siteId === site.id)
            .reduce((sum, p) => sum + p.amount, 0);

          const materialsCost = data.materials
            .filter((m) => m.siteId === site.id)
            .reduce((sum, m) => sum + m.total, 0);

          const totalCostsIncurred = laborCost + additionalCost + subPayments + materialsCost;

          const receipts = data.clientReceipts.filter((r) => r.siteId === site.id);
          const totalReceipts = receipts.reduce((sum, r) => sum + r.amount, 0);
          const clientBalanceRemaining = Math.max(0, site.contractValue - totalReceipts);

          return (
            <div
              key={site.id}
              className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-6 space-y-5 hover:border-amber-400 transition"
            >
              {/* Site Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="text-base font-black font-mono text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 shrink-0 whitespace-nowrap">
                    {site.code}
                  </span>
                  <div>
                    <h3 className="font-extrabold text-stone-900 text-base leading-snug">{site.name}</h3>
                    <div className="text-xs text-stone-500 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span className="font-semibold text-stone-700">{site.details}</span>
                      {site.location && (
                        <span className="flex items-center gap-1 text-stone-500">
                          <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" /> {site.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 pt-1 sm:pt-0">
                  <button
                    onClick={() => onOpenWeeklySheet(site.id)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3.5 py-2 min-h-[44px] sm:min-h-[38px] text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 border border-amber-300 rounded-xl transition shadow-2xs"
                  >
                    <span>Open Sheet</span>
                    <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                  </button>
                  <button
                    onClick={() => setSiteToDelete(site)}
                    title={`Delete project ${site.code}`}
                    aria-label={`Delete project ${site.code}`}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-400 hover:text-red-600 hover:bg-red-50 border border-stone-200 hover:border-red-300 rounded-xl transition shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Client Info & Contract Progress */}
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Client:</span>
                  <span className="font-bold text-stone-900">
                    {site.clientName || 'Private Owner'} {site.clientPhone ? `(${site.clientPhone})` : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-stone-500">Agreed Contract Value:</span>
                  <span className="font-black text-sm text-stone-900">{formatCurrency(site.contractValue)}</span>
                </div>
                <div className="flex items-center justify-between font-mono text-emerald-800">
                  <span className="text-stone-500">Client Receipts Received:</span>
                  <span className="font-bold">{formatCurrency(totalReceipts)}</span>
                </div>
                <div className="flex items-center justify-between font-mono text-amber-900 font-bold border-t border-stone-200 pt-1.5">
                  <span className="text-stone-600">Client Receivable Due:</span>
                  <span>{formatCurrency(clientBalanceRemaining)}</span>
                </div>
                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() => setReceiptSite(site)}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Record Client Receipt
                  </button>
                </div>
              </div>

              {/* Cost Incurred Breakdown */}
              <div className="space-y-1.5 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                  Cumulative Cost Incurred On Site
                </span>
                <div className="grid grid-cols-2 gap-2 text-stone-700 font-mono text-[11px]">
                  <div className="bg-stone-100/70 p-2 rounded-lg">
                    <span className="text-stone-500 block text-[10px]">Labor Wages:</span>
                    <strong>{formatCurrency(laborCost)}</strong>
                  </div>
                  <div className="bg-stone-100/70 p-2 rounded-lg">
                    <span className="text-stone-500 block text-[10px]">Additional Lifting:</span>
                    <strong>{formatCurrency(additionalCost)}</strong>
                  </div>
                  <div className="bg-stone-100/70 p-2 rounded-lg">
                    <span className="text-stone-500 block text-[10px]">Materials Delivered:</span>
                    <strong>{formatCurrency(materialsCost)}</strong>
                  </div>
                  <div className="bg-stone-100/70 p-2 rounded-lg">
                    <span className="text-stone-500 block text-[10px]">Subcontractors Paid:</span>
                    <strong>{formatCurrency(subPayments)}</strong>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-stone-200 font-mono text-xs font-black">
                  <span className="text-stone-800">Total Spent to Date:</span>
                  <span className="text-amber-950 text-sm">{formatCurrency(totalCostsIncurred)}</span>
                </div>
              </div>

              {/* Activity Milestones (Requested missing control) */}
              <div className="space-y-2 pt-2 border-t border-stone-200 text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <span className="text-[10px] font-bold uppercase text-emerald-800 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Last Significant Activity
                  </span>
                  <p className="font-semibold text-emerald-950 mt-0.5">
                    {site.lastSignificantActivity?.date || 'N/A'}: {site.lastSignificantActivity?.description || 'Lintel casting completed'}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200">
                  <span className="text-[10px] font-bold uppercase text-blue-800 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Next Significant Activity (Scheduled)
                  </span>
                  <p className="font-semibold text-blue-950 mt-0.5">
                    {site.nextSignificantActivity?.date || 'N/A'}: {site.nextSignificantActivity?.description || 'Roof slab shuttering & pouring'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: Add New Project Site */}
      {isAddSiteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-stone-200 my-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-stone-900 text-base">Add New Construction Project Site</h3>
              <button
                onClick={() => setIsAddSiteModalOpen(false)}
                aria-label="Close project modal"
                className="p-2 text-stone-400 hover:text-stone-700 min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSite} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Site Identity / Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. 813-D, 402-B"
                    className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl font-mono font-bold uppercase text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Plot Details / Size</label>
                  <input
                    type="text"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="e.g. 10 marla, 1 Kanal"
                    className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Project Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sector D Luxury Spanish Villa"
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Contract Value (Rs)</label>
                  <input
                    type="number"
                    value={contractValue}
                    onChange={(e) => setContractValue(e.target.value)}
                    placeholder="e.g. 12500000"
                    className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl font-mono font-bold text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Site Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Block D, Phase 5"
                    className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Client Name</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Malik Tahir"
                    className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Client Phone</label>
                  <input
                    type="text"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="e.g. +92 300 9876543"
                    className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200">
                <span className="font-bold text-stone-900 block mb-2">Initial Activity Milestones</span>
                <div className="space-y-3">
                  <div>
                    <label className="text-stone-600 block mb-1">Last Significant Activity</label>
                    <input
                      type="text"
                      value={lastActDesc}
                      onChange={(e) => setLastActDesc(e.target.value)}
                      placeholder="e.g. Foundation excavation and PCC completed"
                      className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-stone-600 block mb-1">Next Significant Activity (Scheduled)</label>
                    <input
                      type="text"
                      value={nextActDesc}
                      onChange={(e) => setNextActDesc(e.target.value)}
                      placeholder="e.g. Plinth beam casting &amp; brickwork start"
                      className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddSiteModalOpen(false)}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl text-stone-600 bg-stone-100 hover:bg-stone-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 min-h-[44px] rounded-xl text-white bg-amber-600 hover:bg-amber-700 font-bold active:scale-[0.98] transition shadow-sm"
                >
                  Create Project Site
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Record Client Receipt */}
      {receiptSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 my-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-stone-900 text-base">Record Client Payment ({receiptSite.code})</h3>
              <button
                onClick={() => setReceiptSite(null)}
                aria-label="Close client receipt modal"
                className="p-2 text-stone-400 hover:text-stone-700 min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddReceipt} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Receipt Amount (Rs)</label>
                <input
                  type="number"
                  value={receiptAmount}
                  onChange={(e) => setReceiptAmount(e.target.value)}
                  placeholder="e.g. 2000000"
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl font-mono font-bold text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Payment Method</label>
                <select
                  value={receiptMethod}
                  onChange={(e) => setReceiptMethod(e.target.value)}
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl font-semibold text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Online Transfer">Online Bank Transfer</option>
                  <option value="Bank Cheque">Bank Cheque</option>
                  <option value="Cash">Cash Receipt</option>
                  <option value="Pay Order">Pay Order / Demand Draft</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Cheque / Reference Number</label>
                <input
                  type="text"
                  value={receiptRef}
                  onChange={(e) => setReceiptRef(e.target.value)}
                  placeholder="e.g. CHQ-890123"
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Milestone / Notes</label>
                <input
                  type="text"
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                  placeholder="e.g. Milestone 2: Ground floor slab completion payment"
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setReceiptSite(null)}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl text-stone-600 bg-stone-100 hover:bg-stone-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 min-h-[44px] rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 font-bold active:scale-[0.98] transition shadow-sm"
                >
                  Record Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Project Confirmation */}
      {siteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4 my-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-100 text-red-700 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-stone-900 text-base">Delete Project Site?</h3>
                <p className="text-xs text-stone-500">This action cannot be undone.</p>
              </div>
            </div>
            <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-xl text-xs text-red-950 space-y-1">
              <p className="font-bold">
                Are you sure you want to delete <span className="font-mono underline">{siteToDelete.code}</span> ({siteToDelete.name})?
              </p>
              <p className="text-[11px] text-red-800">
                All associated weekly attendance, notes, subcontractor contracts, and ledger entries for this site will be permanently removed.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSiteToDelete(null)}
                className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSite(siteToDelete.id)}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] transition shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Delete Project</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
