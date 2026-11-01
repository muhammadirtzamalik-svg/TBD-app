/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { WeeklySiteSheetView } from './components/WeeklySiteSheetView';
import { LaborMasterSheetView } from './components/LaborMasterSheetView';
import { DailyAttendanceTollView } from './components/DailyAttendanceTollView';
import { ProjectsView } from './components/ProjectsView';
import { SubcontractorsView } from './components/SubcontractorsView';
import { MaterialsView } from './components/MaterialsView';
import { AndroidApkModal } from './components/AndroidApkModal';
import { loadAppData, saveAppData, exportBackupData } from './utils/storage';
import { useOnlineStatus } from './utils/pwa';
import { ConstructionAppData } from './types';
import { WifiOff, FileSpreadsheet, HardHat } from 'lucide-react';

export default function App() {
  const [data, setData] = useState<ConstructionAppData>(() => loadAppData());
  const [currentTab, setCurrentTab] = useState<string>('weekly_site_sheet');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('site-813d');
  const [weekStartDate, setWeekStartDate] = useState<string>('2026-10-10');
  const [isApkModalOpen, setIsApkModalOpen] = useState<boolean>(false);
  const isOnline = useOnlineStatus();

  // Keep LocalStorage synchronized
  const handleUpdateData = (newData: ConstructionAppData) => {
    setData(newData);
    saveAppData(newData);
    if (selectedSiteId && !newData.sites.some((s) => s.id === selectedSiteId)) {
      setSelectedSiteId(newData.sites[0]?.id || '');
    }
  };

  const handleOpenSiteSheet = (siteId: string) => {
    setSelectedSiteId(siteId);
    setCurrentTab('weekly_site_sheet');
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans">
      {/* Top Header & Navigation */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        data={data}
        onUpdateData={handleUpdateData}
        onOpenApkModal={() => setIsApkModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-16">
        {currentTab === 'dashboard' && (
          <DashboardView
            data={data}
            onNavigate={setCurrentTab}
            onOpenSiteSheet={handleOpenSiteSheet}
            onOpenApkModal={() => setIsApkModalOpen(true)}
          />
        )}

        {currentTab === 'weekly_site_sheet' && (
          <WeeklySiteSheetView
            data={data}
            onUpdateData={handleUpdateData}
            selectedSiteId={selectedSiteId}
            onSelectSiteId={setSelectedSiteId}
            weekStartDate={weekStartDate}
            onSelectWeekStartDate={setWeekStartDate}
          />
        )}

        {currentTab === 'labor_master' && (
          <LaborMasterSheetView
            data={data}
            onUpdateData={handleUpdateData}
            weekStartDate={weekStartDate}
            onSelectWeekStartDate={setWeekStartDate}
          />
        )}

        {currentTab === 'daily_attendance' && (
          <DailyAttendanceTollView
            data={data}
            onUpdateData={handleUpdateData}
            selectedSiteId={selectedSiteId}
            onSelectSiteId={setSelectedSiteId}
          />
        )}

        {currentTab === 'projects' && (
          <ProjectsView
            data={data}
            onUpdateData={handleUpdateData}
            onOpenWeeklySheet={handleOpenSiteSheet}
          />
        )}

        {currentTab === 'subcontractors' && (
          <SubcontractorsView
            data={data}
            onUpdateData={handleUpdateData}
            selectedSiteId={selectedSiteId}
          />
        )}

        {currentTab === 'materials' && (
          <MaterialsView
            data={data}
            onUpdateData={handleUpdateData}
            selectedSiteId={selectedSiteId}
          />
        )}
      </main>

      {/* Offline Toast if network drops */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xl border border-amber-400">
          <WifiOff className="w-4 h-4 text-white" />
          <span>Offline Mode: All edits are safely saved in local phone storage.</span>
        </div>
      )}

      {/* Android Sideload & APK Modal */}
      <AndroidApkModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
        onExportBackup={() => exportBackupData(data)}
      />

      {/* Subtle Mobile Bottom Navigation for small screens */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-stone-900 border-t border-stone-800 flex justify-around py-2 px-1 z-30 print:hidden text-[10px] text-stone-400">
        <button
          onClick={() => setCurrentTab('weekly_site_sheet')}
          className={`flex flex-col items-center gap-1 ${currentTab === 'weekly_site_sheet' ? 'text-amber-400 font-bold' : ''}`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Site Sheet</span>
        </button>
        <button
          onClick={() => setCurrentTab('daily_attendance')}
          className={`flex flex-col items-center gap-1 ${currentTab === 'daily_attendance' ? 'text-amber-400 font-bold' : ''}`}
        >
          <HardHat className="w-4 h-4" />
          <span>Attendance</span>
        </button>
        <button
          onClick={() => setCurrentTab('labor_master')}
          className={`flex flex-col items-center gap-1 ${currentTab === 'labor_master' ? 'text-amber-400 font-bold' : ''}`}
        >
          <span className="font-mono font-bold text-xs">Rs</span>
          <span>Labor Toll</span>
        </button>
        <button
          onClick={() => setCurrentTab('dashboard')}
          className={`flex flex-col items-center gap-1 ${currentTab === 'dashboard' ? 'text-amber-400 font-bold' : ''}`}
        >
          <span className="font-bold">•••</span>
          <span>More</span>
        </button>
      </div>
    </div>
  );
}
