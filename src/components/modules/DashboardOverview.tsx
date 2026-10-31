'use client';

import React, { useState, useEffect } from 'react';
import {
  Radar,
  Network,
  Cpu,
  Terminal,
  Server,
  ArrowRight,
  MoreHorizontal,
  Bell,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  CheckCircle2,
  Activity,
  Layers,
  Search,
  SlidersHorizontal,
  ExternalLink,
} from 'lucide-react';
import { NavTab } from '../layout/AppShell';
import { Badge } from '../shared/Badge';
import { DeviceIcon } from '../shared/DeviceIcon';
import { DeviceTypeBadge } from '../shared/DeviceTypeBadge';
import {
  getDeviceCategory,
  getResolvedDeviceType,
} from '../../utils/deviceClassification';
import { getCustomDevices } from '../../utils/customDeviceStore';

interface DashboardOverviewProps {
  onNavigate: (tab: NavTab) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
  const [netInfo, setNetInfo] = useState<any>({
    localIP: '',
    gateway: '',
    subnet: '',
    localMac: '',
    activeNeighbors: [],
  });
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'normal'>('all');

  const fetchLiveTelemetry = () => {
    fetch('/api/network')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setNetInfo(json.data);
        }
      })
      .catch(() => {});

    fetch('/api/logs')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data && json.data.logs) {
          setLiveEvents(json.data.logs);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    const isErased =
      typeof window !== 'undefined' &&
      localStorage.getItem('medshield_fresh_clean_state') === 'true';

    if (!isErased) {
      fetchLiveTelemetry();
    } else {
      setNetInfo({
        localIP: '',
        gateway: '',
        subnet: '',
        localMac: '',
        activeNeighbors: [],
      });
      setLiveEvents([]);
    }

    // Listen for global erase/reset event
    const handleGlobalReset = () => {
      setNetInfo({
        localIP: '',
        gateway: '',
        subnet: '',
        localMac: '',
        activeNeighbors: [],
      });
      setLiveEvents([]);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('medshield-reset-all-data', handleGlobalReset);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('medshield-reset-all-data', handleGlobalReset);
      }
    };
  }, []);

  const handleStartDemonstration = (targetTab: NavTab = 'network-discovery') => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('medshield_fresh_clean_state');
    }
    onNavigate(targetTab);
  };

  const handleManualRefresh = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('medshield_fresh_clean_state');
    }
    fetchLiveTelemetry();
  };

  // Dynamically assemble tasks from real live network data
  const assignments: any[] = [];
  let itemCounter = 1;

  if (netInfo.gateway) {
    const gwType = getResolvedDeviceType(netInfo.gateway, 'Gateway / Router');
    assignments.push({
      no: String(itemCounter++).padStart(2, '0'),
      task: 'Default Gateway Assessment',
      subject: gwType,
      ip: netInfo.gateway,
      status: 'Discovered',
      statusVariant: 'green' as const,
      ports: 'TCP 53, 80, 443',
    });
  }

  if (netInfo.localIP) {
    const hostType = getResolvedDeviceType(netInfo.localIP, 'PC / Workstation');
    assignments.push({
      no: String(itemCounter++).padStart(2, '0'),
      task: 'Host Machine Security Audit',
      subject: hostType,
      ip: netInfo.localIP,
      status: 'Active Host',
      statusVariant: 'cyan' as const,
      ports: 'TCP 135, 445, 3000',
    });
  }

  if (Array.isArray(netInfo.activeNeighbors)) {
    netInfo.activeNeighbors.forEach((neighbor: any) => {
      if (neighbor.ip !== netInfo.gateway && neighbor.ip !== netInfo.localIP) {
        const neighborType = getResolvedDeviceType(neighbor.ip, 'Unidentified');
        assignments.push({
          no: String(itemCounter++).padStart(2, '0'),
          task: `Live Neighbor Node (${neighbor.mac})`,
          subject: neighborType,
          ip: neighbor.ip,
          status: 'Online',
          statusVariant: 'green' as const,
          ports: 'ARP Resolved',
        });
      }
    });
  }

  // Include custom devices imported via Excel
  const customDevices = getCustomDevices();
  customDevices.forEach((cd) => {
    if (!assignments.some((a) => a.ip === cd.ip)) {
      assignments.push({
        no: String(itemCounter++).padStart(2, '0'),
        task: cd.hostname || `Host Node (${cd.ip})`,
        subject: getResolvedDeviceType(cd.ip, cd.deviceType),
        ip: cd.ip,
        status: 'Imported',
        statusVariant: 'cyan' as const,
        ports: cd.openPorts && cd.openPorts.length > 0 ? cd.openPorts.map((p) => `TCP/${p}`).join(', ') : 'None',
      });
    }
  });

  // Map real live events from /api/logs
  const recentEvents = liveEvents.slice(0, 4).map((ev: any, idx: number) => {
    const isSysmon = ev.sensor === 'Sysmon';
    return {
      id: ev.id || idx,
      sender: isSysmon ? (ev.serviceOrEventId || 'Windows System Event') : 'Active TCP Socket',
      avatar: isSysmon ? 'SY' : 'ZK',
      avatarBg: isSysmon ? 'bg-indigo-500' : 'bg-emerald-500',
      message: ev.message,
      time: ev.timestamp ? ev.timestamp.split(' ').slice(-2).join(' ') : 'Just now',
    };
  });

  const totalDiscoveredNodes = assignments.length;

  return (
    <div className="space-y-5 pb-6">
      {/* Top Hero Greeting & 3 Pastel Metric Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Hero Card */}
        <div className="lg:col-span-8 smansys-card p-7 bg-white relative overflow-hidden flex flex-col justify-between">
          <div className="max-w-md space-y-3 z-10">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Welcome, MedShield AI Cyber Mirror Team!
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed font-normal">
              Manage your network infrastructure and hospital cyber mirror operations with ease.
              Running live Nmap binary scans, real topology mapping, and active Windows Event log feeds
              {netInfo.subnet ? (
                <> on <strong className="text-slate-700">{netInfo.subnet}</strong>.</>
              ) : (
                ' on your local network interfaces.'
              )}
            </p>

            <div className="pt-2 flex flex-wrap gap-2.5">
              <button
                onClick={() => handleStartDemonstration('network-discovery')}
                className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-sm flex items-center gap-2"
              >
                <Radar className="w-3.5 h-3.5" />
                <span>Launch Nmap Scan</span>
              </button>

              <button
                onClick={() => handleStartDemonstration('database-mapping')}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition flex items-center gap-2"
              >
                <Network className="w-3.5 h-3.5" />
                <span>Explore Topology</span>
              </button>
            </div>
          </div>

          {/* Smansys Right Vector Graphic / SVG Illustration */}
          <div className="absolute right-4 bottom-2 top-2 w-64 pointer-events-none hidden sm:flex items-center justify-center opacity-95">
            <svg viewBox="0 0 200 160" className="w-full h-full">
              <circle cx="130" cy="80" r="55" fill="#fef3c7" opacity="0.6" />
              <rect x="70" y="45" width="85" height="90" rx="14" fill="#ede9fe" />
              <rect x="85" y="60" width="55" height="8" rx="4" fill="#6366f1" />
              <rect x="85" y="76" width="40" height="6" rx="3" fill="#a5b4fc" />
              <rect x="85" y="90" width="48" height="6" rx="3" fill="#a5b4fc" />
              <circle cx="145" cy="50" r="18" fill="#dcfce7" />
              <path d="M138 50 L143 55 L153 45" stroke="#10b981" strokeWidth="3" fill="none" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Right 3 Smansys Pastel Cards Stack */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-3">
          {/* Card 1: Pastel Yellow */}
          <div className="p-4 rounded-3xl bg-[#fef3c7] border border-[#fde68a] flex items-center justify-between shadow-card">
            <div>
              <p className="text-xs font-semibold text-amber-900/80">Total Subnet Scope</p>
              <h3 className="text-2xl font-extrabold text-amber-950 mt-1">
                {netInfo.subnet ? '256 IPs' : 'Pending'}
              </h3>
              <p className="text-[10px] text-amber-800/80 font-mono mt-0.5">
                {netInfo.subnet || 'Detecting interface...'}
              </p>
            </div>
            <button className="w-8 h-8 rounded-full bg-white/60 hover:bg-white flex items-center justify-center text-amber-900 transition">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Card 2: Pastel Purple */}
          <div className="p-4 rounded-3xl bg-[#ede9fe] border border-[#ddd6fe] flex items-center justify-between shadow-card">
            <div>
              <p className="text-xs font-semibold text-indigo-900/80">Active Discovered Hosts</p>
              <h3 className="text-2xl font-extrabold text-indigo-950 mt-1">
                {totalDiscoveredNodes} {totalDiscoveredNodes === 1 ? 'Live Node' : 'Live Nodes'}
              </h3>
              <p className="text-[10px] text-indigo-800/80 font-mono mt-0.5">
                {totalDiscoveredNodes > 0 ? 'Active Network Interfaces' : 'Click Scan to Discover'}
              </p>
            </div>
            <button className="w-8 h-8 rounded-full bg-white/60 hover:bg-white flex items-center justify-center text-indigo-900 transition">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Card 3: Pastel Orange/Peach */}
          <div className="p-4 rounded-3xl bg-[#ffedd5] border border-[#fed7aa] flex items-center justify-between shadow-card">
            <div>
              <p className="text-xs font-semibold text-orange-900/80">Nmap Installed Binary</p>
              <h3 className="text-2xl font-extrabold text-orange-950 mt-1">Nmap 7.92</h3>
              <p className="text-[10px] text-orange-800/80 font-mono mt-0.5">bin/nmap-7.92/nmap.exe</p>
            </div>
            <button className="w-8 h-8 rounded-full bg-white/60 hover:bg-white flex items-center justify-center text-orange-900 transition">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Middle Row: Donut Chart, Notice Board, Calendar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Smansys Donut Chart Card */}
        <div className="md:col-span-4 smansys-card p-5 bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="font-bold text-sm text-slate-800">Network Host Telemetry</h4>
            <MoreHorizontal className="w-4 h-4 text-slate-400" />
          </div>

          <div className="py-4 flex items-center justify-center">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#ede9fe"
                  strokeWidth="4.5"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="4.5"
                  strokeDasharray={`${totalDiscoveredNodes > 0 ? 75 : 0} 100`}
                  strokeLinecap="round"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="4.5"
                  strokeDasharray={`${totalDiscoveredNodes > 0 ? 25 : 0} 100`}
                  strokeDashoffset="-75"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-extrabold text-slate-900">
                  {totalDiscoveredNodes > 0 ? '100%' : '0%'}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Live Data</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-around pt-2 border-t border-slate-100 text-[11px] font-medium text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Host &amp; Gateway
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Neighbors ({netInfo.activeNeighbors?.length || 0})
            </span>
          </div>
        </div>

        {/* Smansys Notice Board Card */}
        <div className="md:col-span-5 smansys-card p-5 bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="font-bold text-sm text-slate-800">Notice Board</h4>
            <span
              onClick={() => onNavigate('network-discovery')}
              className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
            >
              view scans
            </span>
          </div>

          <div className="space-y-3 py-2">
            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-100 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bell className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h5 className="font-bold text-xs text-slate-800">Live Nmap 7.92 Installed</h5>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Real Nmap executable ready in <code>bin/nmap-7.92/nmap.exe</code> for local subnet scans.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bell className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h5 className="font-bold text-xs text-slate-800">Windows Sysmon Telemetry</h5>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Ingesting live Windows system event IDs and active TCP sockets via PowerShell cmdlets.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
            <button
              onClick={() => handleStartDemonstration('network-discovery')}
              className="text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition"
            >
              + Quick Scan Subnet
            </button>
            <button
              onClick={handleManualRefresh}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
            >
              Refresh Telemetry
            </button>
          </div>
        </div>

        {/* Smansys Calendar Widget */}
        <div className="md:col-span-3 smansys-card p-5 bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800">October 2026</span>
            <div className="flex items-center gap-1">
              <button className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] py-2 font-medium">
            <span className="text-slate-400">S</span>
            <span className="text-slate-400">M</span>
            <span className="text-slate-400">T</span>
            <span className="text-slate-400">W</span>
            <span className="text-slate-400">T</span>
            <span className="text-slate-400">F</span>
            <span className="text-slate-400">S</span>

            {[18, 19, 20, 21].map((d) => (
              <span key={d} className="py-1 text-slate-600">{d}</span>
            ))}
            <span className="py-1 font-bold text-white bg-slate-900 rounded-full flex items-center justify-center">22</span>
            {[23, 24, 25, 26, 27, 28].map((d) => (
              <span key={d} className="py-1 text-slate-600">{d}</span>
            ))}
          </div>

          <button
            onClick={() => handleStartDemonstration('simulation-engine')}
            className="w-full text-center py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 transition"
          >
            Manage Simulation
          </button>
        </div>
      </div>

      {/* Bottom Row: Assignments Table & Live Messages Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Assignments Table (matching Smansys Assignments) */}
        <div className="lg:col-span-8 smansys-card p-6 bg-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-base text-slate-900">Network Scans &amp; Host Tasks</h3>
              <p className="text-xs text-slate-400">
                {netInfo.subnet ? `Active monitoring tasks on ${netInfo.subnet}` : 'Awaiting network scan'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleStartDemonstration('network-discovery')}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-semibold text-xs transition"
              >
                + New Scan
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-medium">
                  <th className="py-2.5 px-3">No</th>
                  <th className="py-2.5 px-3">Task Name</th>
                  <th className="py-2.5 px-3">Zone / Classification</th>
                  <th className="py-2.5 px-3">Target IP</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      No network host tasks active yet. Click <strong>+ New Scan</strong> to discover live network devices.
                    </td>
                  </tr>
                ) : (
                  assignments.map((item) => (
                    <tr key={item.no} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 font-mono text-slate-400">{item.no}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-2">
                        <DeviceIcon
                          category={getDeviceCategory(item.subject)}
                          className="w-3.5 h-3.5 text-slate-400 shrink-0"
                        />
                        <span>{item.task}</span>
                      </td>
                      <td className="py-3 px-3">
                        <DeviceTypeBadge
                          deviceType={item.subject}
                          ip={item.ip}
                          onTypeChange={() => fetchLiveTelemetry()}
                        />
                      </td>
                      <td className="py-3 px-3 font-mono text-indigo-600 font-medium">{item.ip}</td>
                      <td className="py-3 px-3">
                        <Badge variant={item.statusVariant} size="sm">
                          {item.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => onNavigate('network-discovery')}
                          className="text-slate-400 hover:text-slate-900 transition p-1"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span>{assignments.length} host records</span>
            <button
              onClick={fetchLiveTelemetry}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-xs"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Live Messages Feed (matching Smansys Messages) */}
        <div className="lg:col-span-4 smansys-card p-6 bg-white space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Security Messages</h3>
              <ArrowRight
                onClick={() => onNavigate('log-preprocessing')}
                className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-700"
              />
            </div>

            <div className="space-y-3.5 pt-2">
              {recentEvents.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Awaiting live system event logs...
                </div>
              ) : (
                recentEvents.map((ev: any) => (
                  <div
                    key={ev.id}
                    onClick={() => onNavigate('log-preprocessing')}
                    className="flex items-start gap-3 p-2 rounded-2xl hover:bg-slate-50 transition cursor-pointer"
                  >
                    <div className={`w-9 h-9 rounded-2xl ${ev.avatarBg} text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      {ev.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-xs text-slate-900 truncate">{ev.sender}</h5>
                        <span className="text-[10px] text-slate-400 font-mono">{ev.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{ev.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigate('log-preprocessing')}
            className="w-full text-center py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition shadow-sm mt-3"
          >
            View All Live Logs &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
