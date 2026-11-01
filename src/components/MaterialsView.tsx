import React, { useState } from 'react';
import {
  Package,
  Plus,
  Building2,
  DollarSign,
  Search,
  CheckCircle,
  Clock,
  Filter,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { ConstructionAppData, MaterialEntry, MaterialUnit } from '../types';
import { formatCurrency } from '../utils/constructionMath';

interface MaterialsViewProps {
  data: ConstructionAppData;
  onUpdateData: (newData: ConstructionAppData) => void;
  selectedSiteId: string;
}

export const MaterialsView: React.FC<MaterialsViewProps> = ({
  data,
  onUpdateData,
  selectedSiteId,
}) => {
  const [siteFilter, setSiteFilter] = useState<string>(selectedSiteId || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state
  const [materialName, setMaterialName] = useState('');
  const [siteId, setSiteId] = useState(data.sites[0]?.id || '');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<MaterialUnit>('bags');
  const [rate, setRate] = useState('');
  const [supplier, setSupplier] = useState('');
  const [isPaid, setIsPaid] = useState(true);
  const [notes, setNotes] = useState('');

  const filteredMaterials = data.materials.filter((m) => {
    if (siteFilter !== 'all' && m.siteId !== siteFilter) return false;
    if (searchQuery && !m.material.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const totals = filteredMaterials.reduce(
    (acc, m) => {
      acc.totalCost += m.total;
      if (m.isPaid) acc.totalPaid += m.total;
      else acc.totalPending += m.total;
      return acc;
    },
    { totalCost: 0, totalPaid: 0, totalPending: 0 }
  );

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialName || !quantity || !rate) return;

    const q = parseFloat(quantity) || 0;
    const r = parseFloat(rate) || 0;
    const total = q * r;

    const newEntry: MaterialEntry = {
      id: `mat-${Date.now()}`,
      siteId,
      date: new Date().toISOString().split('T')[0],
      material: materialName,
      quantity: q,
      unit,
      rate: r,
      total,
      supplier,
      isPaid,
      notes,
    };

    onUpdateData({
      ...data,
      materials: [...data.materials, newEntry],
    });

    setMaterialName('');
    setQuantity('');
    setRate('');
    setSupplier('');
    setNotes('');
    setIsAddModalOpen(false);
  };

  const handleTogglePaid = (matId: string) => {
    const updated = data.materials.map((m) =>
      m.id === matId ? { ...m, isPaid: !m.isPaid } : m
    );
    onUpdateData({ ...data, materials: updated });
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
            {/* Site Filter */}
            <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 min-h-[44px]">
              <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
              <label htmlFor="material-site-filter" className="text-[11px] font-bold text-stone-500 uppercase tracking-wider shrink-0">
                Site:
              </label>
              <select
                id="material-site-filter"
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

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="Search cement, steel, bricks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 min-h-[44px] text-base sm:text-xs rounded-xl border border-stone-300 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-[0.98] rounded-xl shadow-sm transition shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Add Material Delivery</span>
          </button>
        </div>
      </div>

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-500 block truncate">
            Total Material Incurred
          </span>
          <div className="text-xl sm:text-2xl font-black text-stone-900 font-mono mt-1 truncate">
            {formatCurrency(totals.totalCost)}
          </div>
          <span className="text-xs text-stone-500">{filteredMaterials.length} Deliveries recorded</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-500 block truncate">
            Paid to Suppliers
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-800 font-mono mt-1 truncate">
            {formatCurrency(totals.totalPaid)}
          </div>
          <span className="text-xs text-emerald-600 font-semibold truncate block">Invoices settled</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-500 block truncate">
            Supplier Balance Due
          </span>
          <div className="text-xl sm:text-2xl font-black text-amber-900 font-mono mt-1 truncate">
            {formatCurrency(totals.totalPending)}
          </div>
          <span className="text-xs text-amber-700 font-semibold truncate block">Pending invoice payments</span>
        </div>
      </div>

      {/* Materials Table with Horizontal Swipe container */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="block sm:hidden bg-stone-100 text-stone-600 text-[11px] font-semibold py-1.5 px-3 border-b border-stone-200 text-center">
          ← Swipe horizontally to view all deliveries, rates &amp; suppliers →
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-100 border-b border-stone-200 font-bold text-stone-700">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Site</th>
                <th className="py-3 px-4">Material Item</th>
                <th className="py-3 px-3 text-right">Quantity</th>
                <th className="py-3 px-3 text-right">Rate</th>
                <th className="py-3 px-4 text-right">Total (Rs)</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredMaterials.map((m) => {
                const site = data.sites.find((s) => s.id === m.siteId);
                return (
                  <tr key={m.id} className="hover:bg-amber-50/30 transition">
                    <td className="py-3 px-4 font-mono text-stone-500 whitespace-nowrap">{m.date}</td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-900 whitespace-nowrap">{site?.code || 'Site'}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-stone-900">{m.material}</div>
                      {m.notes && <div className="text-[10px] text-stone-400 italic">{m.notes}</div>}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-stone-700 whitespace-nowrap">
                      {m.quantity.toLocaleString()} {m.unit}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-stone-600 whitespace-nowrap">
                      Rs {m.rate.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-stone-900 text-sm whitespace-nowrap">
                      {formatCurrency(m.total)}
                    </td>
                    <td className="py-3 px-4 text-stone-600">{m.supplier || 'Local Kiln/Store'}</td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleTogglePaid(m.id)}
                        className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-[0.95] ${
                          m.isPaid
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {m.isPaid ? 'Paid' : 'Unpaid'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Add Material Delivery */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 my-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-stone-900 text-base">Record Material Delivery</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close material modal"
                className="p-2 text-stone-400 hover:text-stone-700 min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddMaterial} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Project Site</label>
                <select
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl font-semibold text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                >
                  {data.sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} ({s.details || s.name})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Material Description</label>
                <input
                  type="text"
                  value={materialName}
                  onChange={(e) => setMaterialName(e.target.value)}
                  placeholder="e.g. Bestway Cement 53-Grade, Deformed Rebar 60, Awal Bricks"
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Quantity</label>
                  <input
                    type="number"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 150"
                    className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl font-mono font-bold text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Unit of Measurement</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as MaterialUnit)}
                    className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl font-semibold text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="bags">Bags (Cement)</option>
                    <option value="tons">Tons (Steel Rebar)</option>
                    <option value="pieces">Pieces (Bricks/Blocks)</option>
                    <option value="trips">Trips / Trucks (Sand/Rori)</option>
                    <option value="cft">CFT (Cubic Feet)</option>
                    <option value="rft">RFT (Running Feet)</option>
                    <option value="sft">SFT (Square Feet)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="litres">Litres (Chemicals/Paint)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Rate per Unit (Rs)</label>
                  <input
                    type="number"
                    step="any"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder="e.g. 1380 per bag"
                    className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl font-mono font-bold text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Payment Status</label>
                  <select
                    value={isPaid ? 'paid' : 'unpaid'}
                    onChange={(e) => setIsPaid(e.target.value === 'paid')}
                    className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl font-semibold text-base sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="paid">Paid to Supplier</option>
                    <option value="unpaid">Credit / Unpaid</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Supplier / Kiln Name (Optional)</label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="e.g. Askari Building Materials"
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Delivery Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Unloaded at front porch"
                  className="w-full p-2.5 min-h-[44px] border border-stone-300 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl text-stone-600 bg-stone-100 hover:bg-stone-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 min-h-[44px] rounded-xl text-white bg-amber-600 hover:bg-amber-700 font-bold active:scale-[0.98] transition shadow-sm"
                >
                  Record Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
