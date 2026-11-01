import React, { useState } from 'react';
import {
  Wrench,
  Plus,
  CreditCard,
  Building2,
  DollarSign,
  Search,
  CheckCircle,
  Clock,
  Phone,
  FileText,
  X,
  TrendingUp,
} from 'lucide-react';
import {
  ConstructionAppData,
  Subcontractor,
  SubcontractorCategory,
  SubcontractorPayment,
} from '../types';
import { calculateSubcontractorLedger, formatCurrency } from '../utils/constructionMath';

interface SubcontractorsViewProps {
  data: ConstructionAppData;
  onUpdateData: (newData: ConstructionAppData) => void;
  selectedSiteId: string;
}

export const SubcontractorsView: React.FC<SubcontractorsViewProps> = ({
  data,
  onUpdateData,
  selectedSiteId,
}) => {
  const [siteFilter, setSiteFilter] = useState<string>(selectedSiteId || 'all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isAddSubModalOpen, setIsAddSubModalOpen] = useState(false);
  const [payingSub, setPayingSub] = useState<Subcontractor | null>(null);

  // New sub form state
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<SubcontractorCategory>('shuttering');
  const [newSiteId, setNewSiteId] = useState(data.sites[0]?.id || '');
  const [newContractValue, setNewContractValue] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('2026-10-16');
  const [paymentWeek, setPaymentWeek] = useState('2026-10-12');
  const [paymentDesc, setPaymentDesc] = useState('');
  const [paymentPaidBy, setPaymentPaidBy] = useState('Site Cash');

  // Filter subcontractors
  const filteredSubs = data.subcontractors.filter((sub) => {
    if (siteFilter !== 'all' && sub.siteId !== siteFilter) return false;
    if (categoryFilter !== 'all' && sub.category !== categoryFilter) return false;
    return true;
  });

  // Calculate totals
  const overallTotals = filteredSubs.reduce(
    (acc, sub) => {
      const payments = data.subcontractorPayments.filter((p) => p.subcontractorId === sub.id);
      const ledger = calculateSubcontractorLedger(sub.contractValue, payments);
      acc.totalContract += sub.contractValue;
      acc.totalPaid += ledger.totalPaid;
      acc.totalRemaining += ledger.remainingBalance;
      return acc;
    },
    { totalContract: 0, totalPaid: 0, totalRemaining: 0 }
  );

  const handleAddSubcontractor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newContractValue || !newSiteId) return;

    const newSub: Subcontractor = {
      id: `sub-${Date.now()}`,
      name: newName,
      category: newCategory,
      siteId: newSiteId,
      contractValue: parseFloat(newContractValue) || 0,
      phone: newPhone,
      notes: newNotes,
    };

    onUpdateData({
      ...data,
      subcontractors: [...data.subcontractors, newSub],
    });

    setNewName('');
    setNewContractValue('');
    setNewPhone('');
    setNewNotes('');
    setIsAddSubModalOpen(false);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingSub || !paymentAmount) return;

    const newPayment: SubcontractorPayment = {
      id: `subpay-${Date.now()}`,
      subcontractorId: payingSub.id,
      siteId: payingSub.siteId,
      weekStartDate: paymentWeek,
      date: paymentDate,
      amount: parseFloat(paymentAmount) || 0,
      description: paymentDesc || 'Contract progress payment',
      paidBy: paymentPaidBy,
    };

    onUpdateData({
      ...data,
      subcontractorPayments: [...data.subcontractorPayments, newPayment],
    });

    setPayingSub(null);
    setPaymentAmount('');
    setPaymentDesc('');
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Action Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 w-full sm:w-auto">
            {/* Site Filter */}
            <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 min-h-[44px]">
              <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
              <label htmlFor="sub-site-filter" className="text-[11px] font-bold text-stone-500 uppercase tracking-wider shrink-0">
                Site:
              </label>
              <select
                id="sub-site-filter"
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value)}
                className="w-full bg-transparent font-bold text-stone-800 text-base sm:text-sm focus:outline-none cursor-pointer truncate"
              >
                <option value="all">All Project Sites</option>
                {data.sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} ({s.details || s.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Trade / Category Filter */}
            <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 min-h-[44px]">
              <Wrench className="w-4 h-4 text-stone-500 shrink-0" />
              <label htmlFor="sub-category-filter" className="text-[11px] font-bold text-stone-500 uppercase tracking-wider shrink-0">
                Trade:
              </label>
              <select
                id="sub-category-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full bg-transparent font-semibold text-stone-800 text-base sm:text-sm focus:outline-none cursor-pointer truncate"
              >
                <option value="all">All Trades</option>
                <option value="shuttering">Shuttering &amp; Formwork</option>
                <option value="electrician">Electrician</option>
                <option value="steel_fixer">Steel Fixer (Rebar)</option>
                <option value="plumber">Plumbing &amp; Sanitary</option>
                <option value="paint">Paint &amp; Polish</option>
                <option value="tiles">Tile &amp; Marble</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => setIsAddSubModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-[0.98] rounded-xl shadow-sm transition shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Add Subcontractor Contract</span>
          </button>
        </div>
      </div>

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-500 block truncate">
            Total Subcontract Value
          </span>
          <div className="text-xl sm:text-2xl font-black text-stone-900 font-mono mt-1 truncate">
            {formatCurrency(overallTotals.totalContract)}
          </div>
          <span className="text-xs text-stone-500">{filteredSubs.length} Subcontractors on record</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-500 block truncate">
            Total Paid So Far
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-800 font-mono mt-1 truncate">
            {formatCurrency(overallTotals.totalPaid)}
          </div>
          <span className="text-xs text-emerald-600 font-semibold truncate block">
            {overallTotals.totalContract > 0
              ? `${Math.round((overallTotals.totalPaid / overallTotals.totalContract) * 100)}% of contracts cleared`
              : '0%'}
          </span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-500 block truncate">
            Remaining Contract Balances
          </span>
          <div className="text-xl sm:text-2xl font-black text-amber-900 font-mono mt-1 truncate">
            {formatCurrency(overallTotals.totalRemaining)}
          </div>
          <span className="text-xs text-amber-700 font-semibold truncate block">Outstanding liability due on completion</span>
        </div>
      </div>

      {/* Subcontractors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSubs.map((sub) => {
          const site = data.sites.find((s) => s.id === sub.siteId);
          const payments = data.subcontractorPayments.filter((p) => p.subcontractorId === sub.id);
          const ledger = calculateSubcontractorLedger(sub.contractValue, payments);

          return (
            <div
              key={sub.id}
              className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-sm space-y-4 hover:border-amber-400 transition"
            >
              {/* Card Header - Responsive layout */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-stone-900">{sub.name}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                      {sub.category.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-semibold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Site: {site?.code} ({site?.details})
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setPayingSub(sub);
                    setPaymentAmount('');
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[44px] sm:min-h-[38px] text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 active:scale-[0.98] rounded-xl shadow-sm transition shrink-0"
                >
                  <CreditCard className="w-3.5 h-3.5 shrink-0" />
                  <span>Record Payment</span>
                </button>
              </div>

              {/* Financial Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-stone-500">
                    Paid: <strong className="text-emerald-800">{formatCurrency(ledger.totalPaid)}</strong>
                  </span>
                  <span className="text-stone-500">
                    Remaining: <strong className="text-amber-900">{formatCurrency(ledger.remainingBalance)}</strong>
                  </span>
                </div>
                <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden border border-stone-200">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full"
                    style={{ width: `${ledger.percentagePaid}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-stone-500">
                  <span>Contract: {formatCurrency(sub.contractValue)}</span>
                  <span className="font-bold text-stone-700">{ledger.percentagePaid}% Completed</span>
                </div>
              </div>

              {/* Notes */}
              {sub.notes && (
                <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-200 italic">
                  {sub.notes}
                </p>
              )}

              {/* Payment History Log */}
              <div className="space-y-2 pt-2 border-t border-stone-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  Payment Transactions ({payments.length})
                </h4>
                {payments.length === 0 ? (
                  <p className="text-xs text-stone-400 italic">No payments recorded yet</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {payments.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-stone-50 border border-stone-200"
                      >
                        <div>
                          <span className="font-semibold text-stone-800 block">{p.description}</span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {p.date} • Paid via {p.paidBy || 'Site Cash'}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-sm text-emerald-800">
                          {formatCurrency(p.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: Add New Subcontractor */}
      {isAddSubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 my-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-stone-900 text-base">Add New Subcontractor Contract</h3>
              <button
                onClick={() => setIsAddSubModalOpen(false)}
                aria-label="Close subcontractor modal"
                className="p-2 text-stone-400 hover:text-stone-700 min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubcontractor} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Contractor / Firm Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Asghar Shuttering, Tariq Steel Fixer"
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Trade Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as SubcontractorCategory)}
                    className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl font-semibold text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="shuttering">Shuttering &amp; Formwork</option>
                    <option value="electrician">Electrician</option>
                    <option value="steel_fixer">Steel Fixer (Rebar)</option>
                    <option value="plumber">Plumber &amp; Sanitary</option>
                    <option value="paint">Paint &amp; Polish</option>
                    <option value="tiles">Tile &amp; Flooring</option>
                    <option value="other">Other Trade</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Assigned Site</label>
                  <select
                    value={newSiteId}
                    onChange={(e) => setNewSiteId(e.target.value)}
                    className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl font-semibold text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {data.sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} ({s.details})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Total Agreed Contract Value (Rs)</label>
                <input
                  type="number"
                  value={newContractValue}
                  onChange={(e) => setNewContractValue(e.target.value)}
                  placeholder="e.g. 320000"
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl font-mono font-bold text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Contact Phone (Optional)</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="e.g. +92 321 4455667"
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Scope / Contract Notes</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Complete grey structure shuttering for slab and columns"
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddSubModalOpen(false)}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl text-stone-600 bg-stone-100 hover:bg-stone-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 min-h-[44px] rounded-xl text-white bg-amber-600 hover:bg-amber-700 font-bold active:scale-[0.98] transition shadow-sm"
                >
                  Add Subcontractor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Record Subcontractor Payment */}
      {payingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 my-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-stone-900 text-base">Record Payment to {payingSub.name}</h3>
              <button
                onClick={() => setPayingSub(null)}
                aria-label="Close pay subcontractor modal"
                className="p-2 text-stone-400 hover:text-stone-700 min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-600">Total Contract:</span>
                  <span className="font-bold font-mono text-stone-900">{formatCurrency(payingSub.contractValue)}</span>
                </div>
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Payment Amount (Rs)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="e.g. 10000"
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl font-mono font-bold text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl font-semibold text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">For Reporting Week</label>
                  <input
                    type="date"
                    value={paymentWeek}
                    onChange={(e) => setPaymentWeek(e.target.value)}
                    className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl font-semibold text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Milestone Description</label>
                <input
                  type="text"
                  value={paymentDesc}
                  onChange={(e) => setPaymentDesc(e.target.value)}
                  placeholder="e.g. Ground floor slab shuttering advance"
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Paid From</label>
                <input
                  type="text"
                  value={paymentPaidBy}
                  onChange={(e) => setPaymentPaidBy(e.target.value)}
                  placeholder="e.g. Site Cash, Bank Transfer, Office"
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setPayingSub(null)}
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
    </div>
  );
};
