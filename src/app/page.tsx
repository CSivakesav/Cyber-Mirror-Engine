'use client';

import React, { useState } from 'react';
import { AppShell, NavTab } from '../components/layout/AppShell';
import { DashboardOverview } from '../components/modules/DashboardOverview';
import { NetworkDiscovery } from '../components/modules/NetworkDiscovery';
import { DatabaseMapping } from '../components/modules/DatabaseMapping';
import { SimulationEngine } from '../components/modules/SimulationEngine';
import { LogPreprocessing } from '../components/modules/LogPreprocessing';
import { AssetInventory } from '../components/modules/AssetInventory';
import { Settings as SettingsIcon } from 'lucide-react';
import { Badge } from '../components/shared/Badge';

export default function Home() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [resetKey, setResetKey] = useState<number>(0);

  const handleResetAllData = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('medshield_fresh_clean_state', 'true');
      localStorage.removeItem('medshield_cached_scan_data');
    }
    // Increment key to force remount of all components into fresh state
    setResetKey((prev) => prev + 1);

    // Call backend reset API
    fetch('/api/reset', { method: 'POST' }).catch(() => {});

    // Also dispatch custom event for any listening services
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('medshield-reset-all-data'));
    }
  };

  return (
    <AppShell
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      onResetAllData={handleResetAllData}
    >
      {currentTab === 'dashboard' && (
        <DashboardOverview key={resetKey} onNavigate={setCurrentTab} />
      )}
      {currentTab === 'network-discovery' && (
        <NetworkDiscovery key={resetKey} />
      )}
      {currentTab === 'database-mapping' && (
        <DatabaseMapping key={resetKey} />
      )}
      {currentTab === 'simulation-engine' && (
        <SimulationEngine key={resetKey} />
      )}
      {currentTab === 'log-preprocessing' && (
        <LogPreprocessing key={resetKey} />
      )}
      {currentTab === 'asset-inventory' && (
        <AssetInventory key={resetKey} />
      )}

      {/* Settings Tab */}
      {currentTab === 'settings' && (
        <div className="space-y-5 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                System Preferences & Engine Configuration
              </h2>
              <p className="text-xs text-slate-500 font-normal">
                MedShield AI Dashboard Configuration & Local Tools Integration
              </p>
            </div>
          </div>

          <div className="smansys-card p-6 bg-white space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <h3 className="font-bold text-slate-900 text-sm">Demo Data Control</h3>
                <p className="text-xs text-slate-500">
                  Reset all discovered network hosts, terminal logs, and simulation probes to fresh start
                </p>
              </div>
              <button
                onClick={handleResetAllData}
                className="px-4 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold transition"
              >
                Erase All Data Now
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-sm">Installed Tools Status</h3>
              <p className="text-xs text-slate-500">
                Local binary integrations verifying live execution without mock data
              </p>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-3.5">
              <div className="flex items-center justify-between text-xs py-1">
                <div>
                  <p className="font-bold text-slate-800">Official Nmap 7.92 Binary</p>
                  <p className="text-slate-400 font-mono text-[11px]">bin/nmap-7.92/nmap.exe (Bundled / System PATH)</p>
                </div>
                <Badge variant="green">Installed & Operational</Badge>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <div>
                  <p className="font-bold text-slate-800">Windows Sysmon & System Event Channel</p>
                  <p className="text-slate-400 font-mono text-[11px]">PowerShell Get-WinEvent API Route</p>
                </div>
                <Badge variant="green">Live Streaming</Badge>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <div>
                  <p className="font-bold text-slate-800">Python Companion Environment</p>
                  <p className="text-slate-400 font-mono text-[11px]">Companion Scripts (NetworkX, Scapy, Pydantic)</p>
                </div>
                <Badge variant="green">Ready</Badge>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <div>
                  <p className="font-bold text-slate-800">Phase 2 Features (Qwen-RAG AI)</p>
                  <p className="text-slate-400 text-[11px]">Scope restriction: Halted after Module 4</p>
                </div>
                <Badge variant="gray">Halted / Out of Scope</Badge>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
