import React, { useRef } from 'react';
import {
  HardHat,
  Smartphone,
  Download,
  Upload,
  Wifi,
  WifiOff,
  Building2,
  FileSpreadsheet,
  Users,
  Clock,
  Wrench,
  Package,
  Layers,
} from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../utils/pwa';
import { exportBackupData, importBackupData } from '../utils/storage';
import { ConstructionAppData } from '../types';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  data: ConstructionAppData;
  onUpdateData: (newData: ConstructionAppData) => void;
  onOpenApkModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  data,
  onUpdateData,
  onOpenApkModal,
}) => {
  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    exportBackupData(data);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importBackupData(
        file,
        (imported) => {
          onUpdateData(imported);
          alert('Database restored successfully from backup!');
        },
        (err) => {
          alert('Error restoring backup: ' + err);
        }
      );
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers },
    { id: 'weekly_site_sheet', label: 'Weekly Site Sheet', icon: FileSpreadsheet, highlight: true },
    { id: 'labor_master', label: 'Labor Master Toll', icon: Users },
    { id: 'daily_attendance', label: 'Daily Attendance', icon: Clock },
    { id: 'projects', label: 'Projects & Sites', icon: Building2 },
    { id: 'subcontractors', label: 'Subcontractors', icon: Wrench },
    { id: 'materials', label: 'Materials Ledger', icon: Package },
  ];

  return (
    <header className="bg-stone-900 text-white shadow-md sticky top-0 z-40 print:hidden border-b border-stone-800">
      {/* Top Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <div
          onClick={() => onSelectTab('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 shadow-md">
            <HardHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm sm:text-base tracking-tight text-white font-sans uppercase">
                Tahir Builders &amp; Developers
              </span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                TBD PRO
              </span>
            </div>
            <p className="text-[10px] text-stone-400 font-medium hidden sm:block">
              Engineers &amp; Contractors • Construction Control System
            </p>
          </div>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          {/* Offline / Online Status Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-800/80 border border-stone-700 text-[11px]">
            {isOnline ? (
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden md:inline">Offline Ready</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400 font-medium">
                <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                <span>Offline Mode</span>
              </span>
            )}
          </div>

          {/* Install App / Standalone Status Trigger */}
          {isInstalled ? (
            <button
              onClick={onOpenApkModal}
              title="App is installed and running in standalone offline mode"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-emerald-950/70 text-emerald-400 hover:bg-emerald-900/80 border border-emerald-500/40 transition cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Installed</span>
            </button>
          ) : (
            <button
              onClick={onOpenApkModal}
              title="Install Tahir Builders as an app on your phone or computer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 hover:from-amber-400 hover:to-orange-400 shadow-md shadow-orange-500/20 transition active:scale-[0.98] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Install App</span>
            </button>
          )}

          {/* Backup & Restore Dropdown / Buttons */}
          <button
            onClick={handleExport}
            title="Download full JSON backup of sites, workers, and attendance"
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={handleImportClick}
            title="Restore from JSON backup file"
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition"
          >
            <Upload className="w-4 h-4" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
        </div>
      </div>

      {/* Navigation Sub-bar */}
      <nav aria-label="Main Navigation" className="border-t border-stone-800 bg-stone-950/70 overflow-x-auto no-scrollbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 py-1 min-w-max">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition select-none ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-sm'
                    : item.highlight
                    ? 'text-amber-300 hover:bg-stone-800'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
};
