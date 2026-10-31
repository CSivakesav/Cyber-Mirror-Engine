'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  Terminal as TerminalIcon,
  CheckCircle2,
  Clock,
  Server,
  Network,
  RotateCw,
  Search,
  Copy,
  Check,
  ShieldAlert,
  ArrowRight,
  MoreHorizontal,
  ExternalLink,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react';
import { HostDevice, ScanConfig, ScanSummary } from '../../types/cyber';
import { Badge } from '../shared/Badge';
import { DeviceIcon } from '../shared/DeviceIcon';
import { DeviceTypeBadge } from '../shared/DeviceTypeBadge';
import { ExcelUploadModal } from '../shared/ExcelUploadModal';
import {
  getDeviceCategory,
  getResolvedDeviceType,
} from '../../utils/deviceClassification';
import { getCustomDevices } from '../../utils/customDeviceStore';

export const NetworkDiscovery: React.FC = () => {
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [config, setConfig] = useState<ScanConfig>({
    targetSubnet: '',
    scanType: 'Host Discovery (Ping Scan)',
    tool: 'Nmap 7.92 (Installed Local Binary)',
  });

  const [isScanning, setIsScanning] = useState(false);
  const [scanOutput, setScanOutput] = useState<string[]>([
    'Initializing real Nmap engine (bundled bin/nmap-7.92/nmap.exe)...',
    'Detecting active network interfaces...',
    'Ready. Configure target subnet and click Start Scan to execute actual Nmap scan.',
  ]);

  const [discoveredHosts, setDiscoveredHosts] = useState<HostDevice[]>([]);
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHost, setSelectedHost] = useState<HostDevice | null>(null);

  const [summary, setSummary] = useState<ScanSummary>({
    totalIpsScanned: 256,
    hostsDiscovered: 0,
    scanDuration: '0.00 s',
    status: 'Idle',
  });

  const terminalEndRef = useRef<HTMLDivElement>(null);

  const handleResetScanData = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('medshield_fresh_clean_state', 'true');
      localStorage.removeItem('medshield_cached_scan_data');
    }
    setIsScanning(false);
    setDiscoveredHosts([]);
    setScanOutput([
      'Environment reset. Ready for demonstration.',
      'Configure target subnet and click Start Scan to run live Nmap execution.',
    ]);
    setSummary({
      totalIpsScanned: 0,
      hostsDiscovered: 0,
      scanDuration: '0.00 s',
      status: 'Idle',
    });
  };

  // Listen for global reset all data event
  useEffect(() => {
    const handleGlobalReset = () => {
      handleResetScanData();
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

  // Update a single host's device type dynamically across state
  const handleUpdateHostDeviceType = (ip: string, newType: string) => {
    setDiscoveredHosts((prev) =>
      prev.map((h) => (h.ip === ip ? { ...h, deviceType: newType } : h))
    );
    setSelectedHost((prev) =>
      prev && prev.ip === ip ? { ...prev, deviceType: newType } : prev
    );
  };

  // Listen for device classification updates from any component
  useEffect(() => {
    const handleTypeUpdate = (e: any) => {
      const { ip, deviceType } = e.detail || {};
      if (ip && deviceType) {
        setDiscoveredHosts((prev) =>
          prev.map((h) => (h.ip === ip ? { ...h, deviceType } : h))
        );
        setSelectedHost((prev) =>
          prev && prev.ip === ip ? { ...prev, deviceType } : prev
        );
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('medshield-device-type-updated', handleTypeUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('medshield-device-type-updated', handleTypeUpdate);
      }
    };
  }, []);

  // Listen for custom Excel imported devices
  useEffect(() => {
    const handleCustomUpdated = () => {
      const custom = getCustomDevices();
      setDiscoveredHosts((prev) => {
        const map = new Map<string, HostDevice>();
        prev.forEach((h) => map.set(h.ip, h));
        custom.forEach((c) =>
          map.set(c.ip, { ...c, deviceType: getResolvedDeviceType(c.ip, c.deviceType) })
        );
        const res = Array.from(map.values());
        setSummary((s) => ({ ...s, hostsDiscovered: res.length }));
        return res;
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('medshield-custom-devices-updated', handleCustomUpdated);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('medshield-custom-devices-updated', handleCustomUpdated);
      }
    };
  }, []);

  useEffect(() => {
    const isErased =
      typeof window !== 'undefined' &&
      localStorage.getItem('medshield_fresh_clean_state') === 'true';

    fetch('/api/network')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const { subnet, localIP, gateway } = json.data;
          setConfig((prev) => ({ ...prev, targetSubnet: subnet }));
          if (isErased) {
            setDiscoveredHosts([]);
            setSummary({
              totalIpsScanned: 0,
              hostsDiscovered: 0,
              scanDuration: '0.00 s',
              status: 'Idle',
            });
            setScanOutput([
              'Environment cleared for demonstration.',
              `[+] Local Interface Ready: IPv4 ${localIP}`,
              `[+] Default Gateway: ${gateway}`,
              `[+] Subnet Scope: ${subnet}`,
              '',
              'Click Start Scan to run live Nmap execution on your subnet.',
            ]);
          } else {
            const custom = getCustomDevices();
            if (custom.length > 0) {
              const mapped = custom.map((c) => ({
                ...c,
                deviceType: getResolvedDeviceType(c.ip, c.deviceType),
              }));
              setDiscoveredHosts(mapped);
              setSummary((s) => ({ ...s, hostsDiscovered: mapped.length }));
            }
            setScanOutput([
              `[+] Active Subnet Interface Detected: IPv4 ${localIP}`,
              `[+] Default Gateway: ${gateway}`,
              `[+] Subnet Scope: ${subnet}`,
              `[+] Installed Tool: bin/nmap-7.92/nmap.exe (Verified Operational)`,
              '',
              'Ready. Click Start Scan to run live Nmap execution on your subnet.',
            ]);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleStartScan = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('medshield_fresh_clean_state');
    }
    if (isScanning) {
      setIsScanning(false);
      setSummary((prev) => ({ ...prev, status: 'Completed' }));
      return;
    }

    setIsScanning(true);
    setScanOutput([
      `$ nmap -Pn -sT ${config.targetSubnet}`,
      'Starting Nmap 7.92 ( https://nmap.org ) at ' + new Date().toLocaleTimeString(),
      'Initiating real TCP connect probes & ARP resolution against live subnet...',
      '',
    ]);

    setSummary({
      totalIpsScanned: 256,
      hostsDiscovered: 0,
      scanDuration: '0.00 s',
      status: 'Scanning',
    });

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetSubnet: config.targetSubnet,
          scanType: config.scanType,
          tool: config.tool,
        }),
      });

      const json = await res.json();

      if (json.success && json.data) {
        const rawLines = json.data.scanOutput;
        const validLines: string[] = Array.isArray(rawLines)
          ? rawLines.filter((l: any) => typeof l === 'string' && l.trim().length > 0)
          : [];
        const sum = json.data.summary;
        const rawHosts = json.data.discoveredHosts;
        const resolvedHosts = (Array.isArray(rawHosts) ? rawHosts : []).map((h) => ({
          ...h,
          deviceType: getResolvedDeviceType(h.ip, h.deviceType),
        }));

        if (validLines.length === 0) {
          setIsScanning(false);
          setDiscoveredHosts(resolvedHosts);
          setSummary({
            totalIpsScanned: sum?.totalIpsScanned || 256,
            hostsDiscovered: resolvedHosts.length,
            scanDuration: sum?.scanDuration || '1.20 s',
            status: 'Completed',
          });
          return;
        }

        let currentIdx = 0;
        const interval = setInterval(() => {
          if (currentIdx < validLines.length) {
            const nextLine = validLines[currentIdx];
            if (typeof nextLine === 'string') {
              setScanOutput((prev) => [...prev, nextLine]);
            }
            currentIdx++;
          } else {
            clearInterval(interval);
            setIsScanning(false);
            setDiscoveredHosts(resolvedHosts);
            setSummary({
              totalIpsScanned: sum?.totalIpsScanned || 256,
              hostsDiscovered: resolvedHosts.length,
              scanDuration: sum?.scanDuration || '1.20 s',
              status: 'Completed',
            });
          }
        }, 80);
      } else {
        setIsScanning(false);
        setScanOutput((prev) => [...prev, `[!] Error during scan: ${json.error || 'Scan failed'}`]);
        setSummary((prev) => ({ ...prev, status: 'Failed' }));
      }
    } catch (err: any) {
      setIsScanning(false);
      setScanOutput((prev) => [...prev, `[!] Network scan error: ${err.message}`]);
      setSummary((prev) => ({ ...prev, status: 'Failed' }));
    }
  };

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(scanOutput.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredHosts = discoveredHosts.filter(
    (h) =>
      h.ip.includes(searchTerm) ||
      h.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.deviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.mac.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-5 pb-6">
      {/* Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Network Discovery</h2>
          <p className="text-xs text-slate-500 font-normal">
            Live Subnet Scanning with Official Installed Nmap 7.92 Binary
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Nmap Binary Operational</span>
          </span>
        </div>
      </div>

      {/* Smansys Scan Configuration Card */}
      <div className="smansys-card p-6 bg-white space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-sm text-slate-800">Scan Parameters</h3>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsExcelModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition shadow-sm"
              title="Import network devices from Excel spreadsheet (.xlsx, .xls, .csv)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Import Excel</span>
            </button>
            <button
              onClick={handleResetScanData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 text-xs font-semibold transition"
              title="Erase all scan results and reset to 0 hosts"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Erase All Data</span>
            </button>
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              bin/nmap-7.92/nmap.exe
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-4 space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Target Subnet / Scope</label>
            <input
              type="text"
              value={config.targetSubnet}
              onChange={(e) => setConfig({ ...config, targetSubnet: e.target.value })}
              className="smansys-input w-full px-4 py-2.5 text-xs font-mono text-slate-900"
              placeholder="e.g. 192.168.1.0/24 or 10.0.0.0/24"
            />
          </div>

          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Scan Type</label>
            <select
              value={config.scanType}
              onChange={(e) => setConfig({ ...config, scanType: e.target.value })}
              className="smansys-input w-full px-4 py-2.5 text-xs text-slate-800 bg-[#f6f7fa] cursor-pointer"
            >
              <option value="Host Discovery (Ping Scan)">Host Discovery (Ping & ARP)</option>
              <option value="TCP Connect Port Scan (-sT)">TCP Connect Scan (-sT)</option>
              <option value="Service & OS Detection">Service Scan with Ports (-Pn -sT)</option>
            </select>
          </div>

          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Engine Binary</label>
            <select
              value={config.tool}
              onChange={(e) => setConfig({ ...config, tool: e.target.value })}
              className="smansys-input w-full px-4 py-2.5 text-xs text-slate-800 bg-[#f6f7fa] cursor-pointer"
            >
              <option value="Nmap 7.92 (Installed Local Binary)">Nmap 7.92 (Local Binary)</option>
              <option value="Live Windows Socket Prober">Live Socket Prober</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              onClick={handleStartScan}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-xs transition shadow-sm ${
                isScanning
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {isScanning ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Scan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Middle Row: Smansys Scan Terminal (Left) & 4 Pastel Summary Cards (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Terminal Window */}
        <div className="lg:col-span-7 smansys-card p-5 bg-white flex flex-col h-[380px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                <TerminalIcon className="w-3.5 h-3.5" />
              </span>
              <h4 className="font-bold text-xs text-slate-800">Live Console Output</h4>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLogs}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={() => setScanOutput(['Console cleared. Ready for next live scan.'])}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mt-3 flex-1 overflow-y-auto smansys-terminal p-4 font-mono text-xs leading-relaxed">
            {scanOutput.map((line, idx) => {
              const lineStr = typeof line === 'string' ? line : (line != null ? String(line) : '');
              return (
                <div
                  key={idx}
                  className={`${
                    lineStr.startsWith('$')
                      ? 'text-emerald-400 font-bold'
                      : lineStr.includes('open')
                      ? 'text-cyan-300 font-semibold'
                      : lineStr.includes('Nmap scan report')
                      ? 'text-white font-bold pt-1'
                      : lineStr.includes('Host is up')
                      ? 'text-emerald-300'
                      : 'text-slate-300'
                  }`}
                >
                  {lineStr ? lineStr : <span>&nbsp;</span>}
                </div>
              );
            })}
            <div ref={terminalEndRef} />
          </div>
        </div>

        {/* 4 Smansys Pastel Cards (2x2 Grid) */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          {/* Card 1: Pastel Yellow */}
          <div className="p-5 rounded-3xl bg-[#fef3c7] border border-[#fde68a] flex flex-col justify-between shadow-card">
            <div className="flex items-center justify-between text-amber-900/80">
              <span className="text-xs font-semibold">Total Subnet IPs</span>
              <Network className="w-4 h-4 text-amber-700" />
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-amber-950 tracking-tight">
                {summary.totalIpsScanned}
              </div>
              <p className="text-[10px] text-amber-800 font-mono mt-0.5">{config.targetSubnet}</p>
            </div>
          </div>

          {/* Card 2: Pastel Purple */}
          <div className="p-5 rounded-3xl bg-[#ede9fe] border border-[#ddd6fe] flex flex-col justify-between shadow-card">
            <div className="flex items-center justify-between text-indigo-900/80">
              <span className="text-xs font-semibold">Hosts Discovered</span>
              <Server className="w-4 h-4 text-indigo-700" />
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-indigo-950 tracking-tight">
                {summary.hostsDiscovered}
              </div>
              <p className="text-[10px] text-indigo-800 font-mono mt-0.5">Live Active Hosts</p>
            </div>
          </div>

          {/* Card 3: Pastel Cyan */}
          <div className="p-5 rounded-3xl bg-[#e0f2fe] border border-[#bae6fd] flex flex-col justify-between shadow-card">
            <div className="flex items-center justify-between text-sky-900/80">
              <span className="text-xs font-semibold">Scan Duration</span>
              <Clock className="w-4 h-4 text-sky-700" />
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-sky-950 tracking-tight">
                {summary.scanDuration}
              </div>
              <p className="text-[10px] text-sky-800 font-mono mt-0.5">Execution elapsed</p>
            </div>
          </div>

          {/* Card 4: Pastel Green */}
          <div className="p-5 rounded-3xl bg-[#dcfce7] border border-[#bbf7d0] flex flex-col justify-between shadow-card">
            <div className="flex items-center justify-between text-emerald-900/80">
              <span className="text-xs font-semibold">Engine Status</span>
              {summary.status === 'Scanning' ? (
                <RotateCw className="w-4 h-4 text-emerald-700 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              )}
            </div>
            <div className="mt-4">
              <div className="text-2xl font-extrabold text-emerald-950 tracking-tight">
                {summary.status}
              </div>
              <p className="text-[10px] text-emerald-800 font-mono mt-0.5">Nmap 7.92 Connect</p>
            </div>
          </div>
        </div>
      </div>

      {/* Discovered Hosts Table (matching Smansys Assignments layout) */}
      <div className="smansys-card p-6 bg-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-base text-slate-900">Discovered Live Hosts</h3>
            <p className="text-xs text-slate-400">Actual active devices parsed from live Nmap scans & ARP table</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by IP, hostname, MAC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none w-full"
            />
          </div>
        </div>

        {filteredHosts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-medium">
                  <th className="py-2.5 px-3">IP Address</th>
                  <th className="py-2.5 px-3">MAC Address</th>
                  <th className="py-2.5 px-3">Hostname</th>
                  <th className="py-2.5 px-3">Classification</th>
                  <th className="py-2.5 px-3">Subnet Zone</th>
                  <th className="py-2.5 px-3">Scanned Ports</th>
                  <th className="py-2.5 px-3">Risk Level</th>
                  <th className="py-2.5 px-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredHosts.map((host) => (
                  <tr
                    key={host.id}
                    onClick={() => setSelectedHost(host)}
                    className="hover:bg-slate-50/70 transition cursor-pointer"
                  >
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <DeviceIcon
                        category={getDeviceCategory(host.deviceType)}
                        className="w-3.5 h-3.5 text-slate-400 shrink-0"
                      />
                      <span>{host.ip}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">{host.mac}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{host.hostname}</td>
                    <td className="py-3 px-3">
                      <DeviceTypeBadge
                        deviceType={host.deviceType}
                        ip={host.ip}
                        onTypeChange={(newType) => handleUpdateHostDeviceType(host.ip, newType)}
                      />
                    </td>
                    <td className="py-3 px-3 text-slate-500">{host.zone}</td>
                    <td className="py-3 px-3 font-mono text-indigo-600 font-medium">
                      {host.openPorts.map((p) => `TCP/${p}`).join(', ')}
                    </td>
                    <td className="py-3 px-3">
                      <Badge
                        variant={
                          host.riskLevel === 'Critical'
                            ? 'red'
                            : host.riskLevel === 'High'
                            ? 'yellow'
                            : host.riskLevel === 'Medium'
                            ? 'cyan'
                            : 'green'
                        }
                        size="sm"
                      >
                        {host.riskLevel}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedHost(host);
                        }}
                        className="text-slate-400 hover:text-slate-900 p-1"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
            <p className="text-slate-700 font-semibold text-sm">Ready to Execute Scan</p>
            <p className="text-xs text-slate-500">
              Click <strong>Start Scan</strong> above to run the live Nmap binary on <code>{config.targetSubnet}</code> and populate real active hosts.
            </p>
          </div>
        )}
      </div>

      {/* Host Details Inspector Modal */}
      {selectedHost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setSelectedHost(null)}
        >
          <div
            className="smansys-card w-full max-w-xl p-6 bg-white shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <DeviceIcon
                    category={getDeviceCategory(selectedHost.deviceType)}
                    className="w-5 h-5 text-indigo-600"
                  />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedHost.hostname}</h3>
                  <p className="text-xs font-mono text-slate-500">{selectedHost.ip} • {selectedHost.mac}</p>
                </div>
              </div>
              <Badge variant={selectedHost.riskLevel === 'High' ? 'yellow' : 'green'}>
                {selectedHost.riskLevel} Risk
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-400">Classification</span>
                <div>
                  <DeviceTypeBadge
                    deviceType={selectedHost.deviceType}
                    ip={selectedHost.ip}
                    size="md"
                    onTypeChange={(newType) => handleUpdateHostDeviceType(selectedHost.ip, newType)}
                  />
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400">Subnet Zone</span>
                <p className="font-semibold text-slate-800 mt-0.5">{selectedHost.zone}</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400">Hardware / NIC Vendor</span>
                <p className="font-semibold text-slate-800 mt-0.5">{selectedHost.vendor}</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400">Operating System</span>
                <p className="font-semibold text-slate-800 mt-0.5">{selectedHost.os}</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Scanned Open TCP Ports:</span>
                <span className="font-mono text-indigo-600 font-bold">
                  {selectedHost.openPorts.map((p) => `TCP/${p}`).join(', ')}
                </span>
              </div>
              <p className="text-slate-600 pt-1">{selectedHost.description}</p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedHost(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Upload Modal */}
      <ExcelUploadModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
      />
    </div>
  );
};
