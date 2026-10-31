'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Radar,
  Network,
  Cpu,
  Terminal,
  Boxes,
  ShieldAlert,
  Settings,
  Bell,
  MessageSquare,
  Search,
  ArrowLeft,
  ArrowRight,
  LogOut,
  ChevronDown,
  User,
  CheckCircle,
  Trash2,
  RotateCcw,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';
import { ExcelUploadModal } from '../shared/ExcelUploadModal';
import { clearCustomDevices } from '../../utils/customDeviceStore';

export type NavTab =
  | 'dashboard'
  | 'network-discovery'
  | 'database-mapping'
  | 'simulation-engine'
  | 'log-preprocessing'
  | 'asset-inventory'
  | 'settings';

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface AppShellProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onResetAllData?: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onTabChange,
  onResetAllData,
  children,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'network-discovery', label: 'Network Discovery', icon: Radar, badge: 'Nmap Live' },
    { id: 'database-mapping', label: 'Database Mapping', icon: Network, badge: 'Topology' },
    { id: 'simulation-engine', label: 'Cyber Mirror Engine', icon: Cpu, badge: 'Live Socket' },
    { id: 'log-preprocessing', label: 'Logs & Events', icon: Terminal, badge: 'Sysmon' },
    { id: 'asset-inventory', label: 'Asset Inventory', icon: Boxes },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleTriggerReset = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('medshield_fresh_clean_state', 'true');
      localStorage.removeItem('medshield_cached_scan_data');
    }
    clearCustomDevices();
    if (onResetAllData) {
      onResetAllData();
    }
    // Call reset API
    fetch('/api/reset', { method: 'POST' }).catch(() => {});
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  return (
    <div className="min-h-screen bg-[#f3f5f9] flex text-slate-800 p-4 gap-4 font-sans antialiased select-none relative">
      {/* Toast Notification Banner */}
      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="px-5 py-3 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-2xl flex items-center gap-2.5 border border-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>All session data erased. Environment is clean & ready for a fresh demo!</span>
          </div>
        </div>
      )}

      {/* Smansys Solid Black Sidebar */}
      <aside className="w-64 bg-[#0e0f13] text-white rounded-[28px] p-5 flex flex-col justify-between shadow-xl flex-shrink-0 sticky top-4 h-[calc(100vh-2rem)]">
        <div className="space-y-6">
          {/* Smansys Brand Header */}
          <div className="flex items-center gap-3 px-2 pt-1">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-black font-extrabold shadow-sm">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-black" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-wide text-white">MedShield AI</h1>
              <p className="text-[10px] text-gray-400 font-medium tracking-tight">
                Cyber Mirror Engine
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5 pt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-md font-semibold'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-gray-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9.5px] px-2 py-0.5 rounded-full font-mono font-medium ${
                        isActive
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-white/10 text-gray-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Smansys Pill Log Out Button */}
        <div className="pt-4 border-t border-white/10 space-y-2">
          {/* Quick Erase / Reset button in sidebar */}
          <button
            onClick={handleTriggerReset}
            className="w-full bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 font-semibold px-4 py-2.5 rounded-2xl flex items-center justify-center gap-2 text-xs transition shadow-sm"
            title="Erase all data and reset to fresh start"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Reset Demo Data</span>
          </button>

          <button
            onClick={() => onTabChange('dashboard')}
            className="w-full bg-white hover:bg-gray-100 text-slate-900 font-semibold px-4 py-3 rounded-2xl flex items-center justify-between text-xs transition shadow-sm"
          >
            <div className="flex items-center gap-2">
              <LogOut className="w-4 h-4 text-slate-700" />
              <span>Log Out</span>
            </div>
            <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col space-y-5 overflow-hidden">
        {/* Top Smansys Header */}
        <header className="flex items-center justify-between gap-4">
          {/* Left: Back Button & Search Bar */}
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <button
              onClick={() => onTabChange('dashboard')}
              className="w-11 h-11 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition shadow-sm flex-shrink-0"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Smansys Rounded Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                placeholder="Search network, IPs, devices, events, logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200/80 rounded-2xl pl-11 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition shadow-sm"
              />
            </div>
          </div>

          {/* Right: Actions, Erase Button, & User Avatar */}
          <div className="flex items-center gap-2.5">
            {/* Erase All Data Button */}
            {/* Import Excel Devices Button */}
            <button
              onClick={() => setIsExcelModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200/80 text-xs font-semibold transition shadow-sm group"
              title="Import network devices from Excel spreadsheet (.xlsx, .xls, .csv)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition" />
              <span className="hidden sm:inline">Import Excel</span>
            </button>

            {/* Erase All Data Button */}
            <button
              onClick={handleTriggerReset}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200/80 text-xs font-semibold transition shadow-sm group"
              title="Erase all scan results, terminal history, and metrics to start a fresh presentation demo"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600 transition" />
              <span className="hidden sm:inline">Erase All Data</span>
            </button>

            {/* Live System Pill */}
            <div className="hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-slate-200/80 text-xs font-medium text-slate-600 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Nmap 7.92 Active</span>
            </div>

            {/* Notification Bell */}
            <button className="w-11 h-11 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition shadow-sm relative">
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-3 right-3" />
            </button>

            {/* Message Bubble */}
            <button
              onClick={() => onTabChange('log-preprocessing')}
              className="w-11 h-11 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition shadow-sm"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            {/* Settings */}
            <button
              onClick={() => onTabChange('settings')}
              className="w-11 h-11 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition shadow-sm"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* User Profile Avatar */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 p-1 pl-1.5 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 transition shadow-sm"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                  <User className="w-4 h-4" />
                </div>
                <div className="hidden sm:block text-left pr-2">
                  <p className="text-xs font-bold text-slate-800 leading-tight">Admin</p>
                  <p className="text-[10px] text-slate-400 font-medium">SecOps</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1" />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-dropdown border border-slate-100 p-2 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="font-bold text-slate-800">Admin</p>
                    <p className="text-[10px] text-slate-500">admin@medshield.ai</p>
                  </div>
                  <div className="p-1 space-y-1">
                    <button
                      onClick={() => {
                        handleTriggerReset();
                        setIsProfileOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl font-semibold flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Erase All Session Data</span>
                    </button>
                    <button
                      onClick={() => {
                        onTabChange('network-discovery');
                        setIsProfileOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded-xl"
                    >
                      Network Scan
                    </button>
                    <button
                      onClick={() => {
                        onTabChange('database-mapping');
                        setIsProfileOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded-xl"
                    >
                      Subnet Topology
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto pr-1">
          {children}
        </main>
      </div>

      {/* Excel Upload Modal Pop-up */}
      <ExcelUploadModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
      />
    </div>
  );
};
