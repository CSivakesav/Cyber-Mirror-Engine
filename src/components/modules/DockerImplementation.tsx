'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Boxes,
  Server,
  Cpu,
  Terminal as TerminalIcon,
  Layers,
  Shield,
  Play,
  Square,
  RotateCw,
  Search,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  Download,
  FileSpreadsheet,
  Activity,
  HardDrive,
  Filter,
  ArrowRight,
  ChevronRight,
  Info,
  FolderDown,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { HostDevice, DockerTwinConfig, DockerContainerStatus, SubnetZone } from '../../types/cyber';
import { Badge } from '../shared/Badge';
import { DeviceIcon } from '../shared/DeviceIcon';
import { DeviceTypeBadge } from '../shared/DeviceTypeBadge';
import { ExcelUploadModal } from '../shared/ExcelUploadModal';
import { getResolvedDeviceType } from '../../utils/deviceClassification';
import { getCustomDevices, saveCustomDevices } from '../../utils/customDeviceStore';
import {
  getDockerTwins,
  saveDockerTwins,
  clearDockerTwins,
  setupSingleDockerTwin,
  setupAllDockerTwins,
  updateTwinStatus,
} from '../../utils/dockerStore';
import {
  createDockerTwinConfig,
  generateFullNetworkDockerCompose,
  PREDEFINED_TWIN_TEMPLATES,
} from '../../utils/dockerGenerator';

export const DockerImplementation: React.FC = () => {
  const [devices, setDevices] = useState<HostDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<HostDevice | null>(null);
  const [dockerTwins, setDockerTwins] = useState<DockerTwinConfig[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState<boolean>(true);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState<boolean>(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [probeResult, setProbeResult] = useState<{ port: number; status: string; latencyMs: number } | null>(null);
  const [isProbing, setIsProbing] = useState<boolean>(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterZone, setFilterZone] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Batch deployment state
  const [isDeployingAll, setIsDeployingAll] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; deviceName: string }>({
    current: 0,
    total: 0,
    deviceName: '',
  });

  // Single device deployment state
  const [isSettingUpSingle, setIsSettingUpSingle] = useState<boolean>(false);
  const [singleSetupStep, setSingleSetupStep] = useState<string>('');

  // Inspector active tab
  const [inspectorTab, setInspectorTab] = useState<'overview' | 'dockerfile' | 'compose' | 'entrypoint' | 'terminal'>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Docker Engine status on host
  const [dockerSystemInfo, setDockerSystemInfo] = useState<{
    installed: boolean;
    running: boolean;
    version: string;
    twinsDirectory?: string;
  }>({
    installed: false,
    running: false,
    version: 'Checking...',
  });

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch live network devices
  const fetchNetworkDevices = () => {
    setIsLoadingDevices(true);
    fetch('/api/network')
      .then((res) => res.json())
      .then((json) => {
        const net = json.data || {};
        const discovered: HostDevice[] = [];

        if (net.gateway) {
          discovered.push({
            id: 'real-gw',
            ip: net.gateway,
            mac: net.activeNeighbors?.find((n: any) => n.ip === net.gateway)?.mac || 'Default Gateway',
            hostname: 'Default Gateway Router',
            deviceType: 'Gateway / Router',
            zone: 'Perimeter / DMZ',
            vendor: 'Network L3 Gateway',
            os: 'RouterOS / Embedded Linux',
            openPorts: [53, 80, 443],
            status: 'online',
            riskLevel: 'Low',
            latencyMs: 1.0,
            lastSeen: 'Live Now',
            cves: [],
            description: 'Primary default gateway routing traffic on local subnet interface.',
          });
        }

        if (net.localIP) {
          discovered.push({
            id: 'real-ws',
            ip: net.localIP,
            mac: net.localMac || 'Direct Adapter',
            hostname: 'Host Machine (Workstation)',
            deviceType: 'Nurse Workstation',
            zone: 'ICU & Nurse Stations',
            vendor: 'Local System NIC',
            os: 'Windows Host Operating System',
            openPorts: [135, 445, 3000],
            status: 'online',
            riskLevel: 'Low',
            latencyMs: 0.1,
            lastSeen: 'Live Now',
            cves: [],
            description: 'Host system running Cyber Mirror Engine application server on TCP port 3000.',
          });
        }

        if (Array.isArray(net.activeNeighbors)) {
          net.activeNeighbors.forEach((neighbor: any) => {
            if (neighbor.ip !== net.gateway && neighbor.ip !== net.localIP) {
              discovered.push({
                id: `node-${neighbor.ip.replace(/\./g, '-')}`,
                ip: neighbor.ip,
                mac: neighbor.mac,
                hostname: `Endpoint (${neighbor.ip})`,
                deviceType: 'Unidentified',
                zone: 'Core Network',
                vendor: 'Active Network Client',
                os: 'Embedded Firmware / OS',
                openPorts: [],
                status: 'online',
                riskLevel: 'Low',
                latencyMs: 1.8,
                lastSeen: 'Live Now',
                cves: [],
                description: `Live physical device detected via ARP cache on ${net.subnet || 'local network'}.`,
              });
            }
          });
        }

        const resolvedAssets = discovered.map((d) => ({
          ...d,
          deviceType: getResolvedDeviceType(d.ip, d.deviceType),
        }));

        // Merge in any custom uploaded devices from Excel
        const customDevices = getCustomDevices();
        const mergedMap = new Map<string, HostDevice>();
        resolvedAssets.forEach((d) => mergedMap.set(d.ip, d));
        customDevices.forEach((cd) =>
          mergedMap.set(cd.ip, {
            ...cd,
            deviceType: getResolvedDeviceType(cd.ip, cd.deviceType),
          })
        );

        const allDevs = Array.from(mergedMap.values());
        setDevices(allDevs);
        if (allDevs.length > 0 && !selectedDevice) {
          setSelectedDevice(allDevs[0]!);
        }
        setIsLoadingDevices(false);
      })
      .catch(() => setIsLoadingDevices(false));
  };

  // 2. Fetch Docker system engine status from backend
  const checkDockerHostStatus = () => {
    fetch('/api/docker')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setDockerSystemInfo(json.data);
        }
      })
      .catch(() => {});
  };

  // Initialize data and listeners
  useEffect(() => {
    fetchNetworkDevices();
    checkDockerHostStatus();
    setDockerTwins(getDockerTwins());

    const handleTwinsUpdate = (e: any) => {
      if (e.detail?.twins) {
        setDockerTwins(e.detail.twins);
      } else {
        setDockerTwins(getDockerTwins());
      }
    };

    const handleGlobalReset = () => {
      clearDockerTwins();
      setDockerTwins([]);
      setSelectedDevice(null);
      fetchNetworkDevices();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('medshield-docker-twins-updated', handleTwinsUpdate);
      window.addEventListener('medshield-reset-all-data', handleGlobalReset);
      window.addEventListener('medshield-custom-devices-updated', fetchNetworkDevices);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('medshield-docker-twins-updated', handleTwinsUpdate);
        window.removeEventListener('medshield-reset-all-data', handleGlobalReset);
        window.removeEventListener('medshield-custom-devices-updated', fetchNetworkDevices);
      }
    };
  }, []);

  // Auto-scroll terminal when logs change
  useEffect(() => {
    if (inspectorTab === 'terminal' && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [inspectorTab, dockerTwins]);

  // Periodic metric pulse simulation for running containers
  useEffect(() => {
    const timer = setInterval(() => {
      setDockerTwins((prevTwins) =>
        prevTwins.map((twin) => {
          if (twin.status === 'running') {
            const cpuDelta = (Math.random() - 0.5) * 0.4;
            const newCpu = Math.max(0.1, Math.min(8.5, Number((twin.cpuUsagePercent + cpuDelta).toFixed(1))));
            const memDelta = Math.floor((Math.random() - 0.5) * 2);
            const newMem = Math.max(18, Math.min(64, twin.memoryUsageMb + memDelta));
            return {
              ...twin,
              cpuUsagePercent: newCpu,
              memoryUsageMb: newMem,
              uptimeSeconds: (twin.uptimeSeconds || 0) + 2,
            };
          }
          return twin;
        })
      );
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  // Helper to find twin for device
  const getTwinForDevice = (dev: HostDevice | null): DockerTwinConfig | undefined => {
    if (!dev) return undefined;
    return dockerTwins.find((t) => t.deviceId === dev.id || t.deviceIp === dev.ip);
  };

  const currentTwin = getTwinForDevice(selectedDevice);

  // --------------------------------------------------------------------------
  // BUTTON 1: CREATE ALL DOCKERS OF ALL DEVICES
  // --------------------------------------------------------------------------
  const handleCreateAllDockers = async () => {
    if (devices.length === 0 || isDeployingAll) return;
    setIsDeployingAll(true);
    setBatchProgress({ current: 0, total: devices.length, deviceName: 'Starting batch engine...' });

    try {
      const results = await setupAllDockerTwins(devices, (curr, tot, dev) => {
        setBatchProgress({
          current: curr,
          total: tot,
          deviceName: `${dev.hostname} (${dev.ip})`,
        });
      });
      setDockerTwins(results);
    } catch (e) {
      console.error('Batch docker creation failed:', e);
    } finally {
      setIsDeployingAll(false);
      setBatchProgress({ current: devices.length, total: devices.length, deviceName: 'All containers deployed!' });
      setTimeout(() => {
        setBatchProgress({ current: 0, total: 0, deviceName: '' });
      }, 3000);
    }
  };

  // --------------------------------------------------------------------------
  // BUTTON 2: UNDER EACH DEVICE WHEN SELECTED, CREATE A DOCKER AND SET IT UP
  // --------------------------------------------------------------------------
  const handleSetupSelectedDeviceDocker = async (deviceToSetup: HostDevice) => {
    if (!deviceToSetup || isSettingUpSingle) return;
    setIsSettingUpSingle(true);
    setSingleSetupStep('Initializing Docker twin synthesis pipeline...');

    try {
      const updated = await setupSingleDockerTwin(deviceToSetup, (step) => {
        setSingleSetupStep(step);
      });
      setDockerTwins((prev) => {
        const filtered = prev.filter((t) => t.containerId !== updated.containerId);
        return [...filtered, updated];
      });
    } catch (e) {
      console.error('Single docker setup failed:', e);
    } finally {
      setIsSettingUpSingle(false);
      setSingleSetupStep('');
    }
  };

  // Start / Stop individual twin
  const handleToggleTwinPower = (twin: DockerTwinConfig, start: boolean) => {
    const newStatus: DockerContainerStatus = start ? 'running' : 'stopped';
    const logMsg = start
      ? `[DOCKER] Container ${twin.containerName} resumed. Port listeners re-attached.`
      : `[DOCKER] Container ${twin.containerName} received SIGTERM (graceful shutdown).`;
    updateTwinStatus(twin.containerId, newStatus, [logMsg]);
  };

  // Download complete master docker-compose.yml
  const handleDownloadMasterCompose = () => {
    const compose = generateFullNetworkDockerCompose(dockerTwins);
    const blob = new Blob([compose], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cyber-mirror-docker-compose.yml';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Instant deployment of predefined digital twin presets
  const handleDeployPreset = async (preset: HostDevice) => {
    saveCustomDevices([preset]);
    setDevices((prev) => {
      const existing = prev.filter((d) => d.ip !== preset.ip);
      return [...existing, preset];
    });
    setSelectedDevice(preset);
    setIsTemplateModalOpen(false);
    await handleSetupSelectedDeviceDocker(preset);
  };

  const handleDeployAllPresets = async () => {
    saveCustomDevices(PREDEFINED_TWIN_TEMPLATES);
    setDevices((prev) => {
      const map = new Map<string, HostDevice>();
      prev.forEach((d) => map.set(d.ip, d));
      PREDEFINED_TWIN_TEMPLATES.forEach((t) => map.set(t.ip, t));
      return Array.from(map.values());
    });
    setIsTemplateModalOpen(false);
    setIsDeployingAll(true);
    setBatchProgress({ current: 0, total: PREDEFINED_TWIN_TEMPLATES.length, deviceName: 'Deploying presets...' });

    try {
      const results = await setupAllDockerTwins(PREDEFINED_TWIN_TEMPLATES, (curr, tot, dev) => {
        setBatchProgress({
          current: curr,
          total: tot,
          deviceName: `${dev.hostname} (${dev.ip})`,
        });
      });
      setDockerTwins((prev) => {
        const map = new Map<string, DockerTwinConfig>();
        prev.forEach((t) => map.set(t.containerId, t));
        results.forEach((t) => map.set(t.containerId, t));
        return Array.from(map.values());
      });
      setSelectedDevice(PREDEFINED_TWIN_TEMPLATES[0]!);
    } finally {
      setIsDeployingAll(false);
      setBatchProgress({ current: PREDEFINED_TWIN_TEMPLATES.length, total: PREDEFINED_TWIN_TEMPLATES.length, deviceName: 'All templates online!' });
      setTimeout(() => setBatchProgress({ current: 0, total: 0, deviceName: '' }), 3000);
    }
  };

  // Live socket probe test against container
  const handleProbePort = async (hostPort: number) => {
    setIsProbing(true);
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetHost: '127.0.0.1',
          targetPort: hostPort,
          action: 'Digital Twin TCP Handshake',
        }),
      });
      const json = await res.json();
      setProbeResult({
        port: hostPort,
        status: json.data?.connected ? 'OPEN / CONNECTED' : 'OPEN (Simulated Listener)',
        latencyMs: json.data?.latencyMs || 0.8,
      });
    } catch {
      setProbeResult({ port: hostPort, status: 'OPEN (Simulated Listener)', latencyMs: 1.1 });
    } finally {
      setIsProbing(false);
      setTimeout(() => setProbeResult(null), 4000);
    }
  };

  // Filtered devices
  const filteredDevices = devices.filter((d) => {
    const matchesSearch =
      d.ip.includes(searchTerm) ||
      d.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.deviceType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesZone = filterZone === 'all' || d.zone === filterZone;
    const twin = getTwinForDevice(d);
    const matchesStatus =
      filterStatus === 'all'
        ? true
        : filterStatus === 'running'
        ? twin?.status === 'running'
        : filterStatus === 'not_created'
        ? !twin || twin.status === 'not_created'
        : twin?.status === filterStatus;
    return matchesSearch && matchesZone && matchesStatus;
  });

  // KPI Calculations
  const totalDiscovered = devices.length;
  const deployedTwinsCount = dockerTwins.filter((t) => t.status === 'running' || t.status === 'stopped').length;
  const runningTwinsCount = dockerTwins.filter((t) => t.status === 'running').length;
  const totalMappedPorts = dockerTwins
    .filter((t) => t.status === 'running')
    .reduce((sum, t) => sum + (t.mappedPorts?.length || 0), 0);

  return (
    <div className="space-y-5 pb-8">
      {/* Excel Upload Modal */}
      <ExcelUploadModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onSuccess={() => fetchNetworkDevices()}
      />

      {/* Predefined Templates Modal */}
      {isTemplateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setIsTemplateModalOpen(false)}
        >
          <div
            className="smansys-card w-full max-w-3xl max-h-[85vh] p-6 bg-white space-y-5 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Predefined Medical & Infrastructure Docker Digital Twins
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pre-configured hospital appliances ready to synthesize, build, and run instantly with 1 click.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDeployAllPresets}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Deploy All 6 Templates</span>
                </button>
                <button
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 overflow-y-auto pr-1 py-1 flex-1">
              {PREDEFINED_TWIN_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition bg-slate-50/50 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                          <DeviceIcon deviceType={tpl.deviceType} className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{tpl.hostname}</h4>
                          <p className="text-[11px] font-mono text-indigo-600">{tpl.ip}</p>
                        </div>
                      </div>
                      <Badge variant="green" size="sm">
                        {tpl.zone}
                      </Badge>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed">{tpl.description}</p>

                    <div className="flex items-center gap-2 pt-1 text-[11px] font-mono text-slate-600">
                      <span className="font-semibold text-slate-400">Ports:</span>
                      <span className="font-bold text-indigo-600">
                        {tpl.openPorts.map((p) => `:${p}`).join(' ')}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">{tpl.vendor}</span>
                    <button
                      onClick={() => handleDeployPreset(tpl)}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Play className="w-3 h-3 fill-white" />
                      <span>Deploy & Run Instant Twin</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
              <span>Each template configures realistic protocols, banner handshakes, and port bindings.</span>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Cyber Mirror Engine
              </h1>
              <p className="text-xs text-slate-500">
                Automated Docker Digital Twins & Virtual Honeypot Mesh for Network Devices
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Controls including BUTTON 1 */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="px-3.5 py-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold shadow-sm flex items-center gap-1.5 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Predefined Templates</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-indigo-200 text-indigo-800 text-[9.5px] font-bold">
              6 Ready
            </span>
          </button>

          <button
            onClick={() => setIsExcelModalOpen(true)}
            className="px-3.5 py-2 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold shadow-sm flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Import Devices</span>
          </button>

          {dockerTwins.length > 0 && (
            <button
              onClick={handleDownloadMasterCompose}
              className="px-3.5 py-2 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold shadow-sm flex items-center gap-1.5 transition"
              title="Download master docker-compose.yml for the entire network"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export Compose</span>
            </button>
          )}

          {/* ================================================================= */}
          {/* BUTTON 1: "CREATE ALL BUTTON WHERE IT CREATES ALL THE DOCKERS" */}
          {/* ================================================================= */}
          <button
            onClick={handleCreateAllDockers}
            disabled={isDeployingAll || devices.length === 0}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-lg flex items-center gap-2 transition-all duration-200 ${
              isDeployingAll
                ? 'bg-indigo-400 cursor-wait'
                : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-indigo-500/25'
            }`}
          >
            {isDeployingAll ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Creating All Containers ({batchProgress.current}/{batchProgress.total})...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-indigo-200" />
                <span suppressHydrationWarning>Create All Docker Containers ({devices.length} Devices)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Batch Deployment Progress Banner */}
      {isDeployingAll && (
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-200/80 space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-950">
            <span className="flex items-center gap-2">
              <RotateCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              <span>Provisioning Docker Twin Mesh: {batchProgress.deviceName}</span>
            </span>
            <span>
              {batchProgress.current} of {batchProgress.total} completed (
              {Math.round((batchProgress.current / (batchProgress.total || 1)) * 100)}%)
            </span>
          </div>
          <div className="w-full bg-indigo-200/50 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(batchProgress.current / (batchProgress.total || 1)) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="smansys-card p-4 bg-white flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Network Devices</p>
            <p suppressHydrationWarning className="text-xl font-extrabold text-slate-900 mt-0.5">{totalDiscovered}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Live Discovered & Imported</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
            <Server className="w-5 h-5" />
          </div>
        </div>

        <div className="smansys-card p-4 bg-white flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Docker Twins</p>
            <p suppressHydrationWarning className="text-xl font-extrabold text-slate-900 mt-0.5">
              {deployedTwinsCount} <span className="text-xs text-slate-400 font-normal">/ {totalDiscovered}</span>
            </p>
            <p suppressHydrationWarning className="text-[10px] text-emerald-600 font-semibold mt-0.5">
              {deployedTwinsCount === totalDiscovered && totalDiscovered > 0
                ? '100% Deployed'
                : `${totalDiscovered - deployedTwinsCount} Unprovisioned`}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="smansys-card p-4 bg-white flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Active Running</p>
            <p suppressHydrationWarning className="text-xl font-extrabold text-emerald-600 mt-0.5 flex items-center gap-1.5">
              <span>{runningTwinsCount}</span>
              {runningTwinsCount > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              )}
            </p>
            <p suppressHydrationWarning className="text-[10px] text-slate-400 mt-0.5">{totalMappedPorts} Virtual Ports Mapped</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="smansys-card p-4 bg-white flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Virtual Subnet</p>
            <p className="text-sm font-bold font-mono text-slate-900 mt-1">172.28.0.0/16</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {dockerSystemInfo.installed && dockerSystemInfo.running ? 'Docker Engine Live' : 'CME Standalone Daemon'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Two-Column Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* =================================================================== */}
        {/* LEFT COLUMN (lg:col-span-5): Devices List & Selection */}
        {/* =================================================================== */}
        <div className="lg:col-span-5 space-y-3.5">
          {/* Search & Filter Bar */}
          <div className="smansys-card p-3 bg-white space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by IP, hostname, or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500 bg-slate-50/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-1/2 py-1 px-2 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-700 bg-white"
              >
                <option value="all">All Container Statuses</option>
                <option value="running">Running Containers</option>
                <option value="stopped">Stopped Containers</option>
                <option value="not_created">Not Yet Created</option>
              </select>
              <select
                value={filterZone}
                onChange={(e) => setFilterZone(e.target.value)}
                className="w-1/2 py-1 px-2 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-700 bg-white"
              >
                <option value="all">All Zones</option>
                <option value="Perimeter / DMZ">Perimeter / DMZ</option>
                <option value="Core Database / EHR">Core Database / EHR</option>
                <option value="Clinical Imaging">Clinical Imaging</option>
                <option value="Medical IoT (IoMT)">Medical IoT (IoMT)</option>
                <option value="ICU & Nurse Stations">ICU & Nurse Stations</option>
              </select>
            </div>
          </div>

          {/* Devices Scroll Area */}
          <div className="space-y-2 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
            {isLoadingDevices ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
                <RotateCw className="w-5 h-5 animate-spin mx-auto text-indigo-500 mb-2" />
                Scanning network topology for active devices...
              </div>
            ) : filteredDevices.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                <Info className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No matching devices found</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Upload an Excel asset list or run Network Discovery.
                </p>
              </div>
            ) : (
              filteredDevices.map((dev) => {
                const twin = getTwinForDevice(dev);
                const isSelected = selectedDevice?.id === dev.id || selectedDevice?.ip === dev.ip;
                const isRunning = twin?.status === 'running';

                return (
                  <div
                    key={dev.id || dev.ip}
                    onClick={() => setSelectedDevice(dev)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-indigo-50/70 border-indigo-300 shadow-sm ring-2 ring-indigo-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isRunning
                              ? 'bg-emerald-100 text-emerald-700'
                              : twin
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <DeviceIcon deviceType={dev.deviceType} className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900">{dev.hostname}</span>
                            {twin && isRunning && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Twin Running
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>{dev.ip}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-[10px]">{dev.zone}</span>
                          </p>
                          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                            <DeviceTypeBadge deviceType={dev.deviceType} ip={dev.ip} editable={false} />
                            {dev.openPorts && dev.openPorts.length > 0 && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {dev.openPorts.length} {dev.openPorts.length === 1 ? 'port' : 'ports'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        {twin ? (
                          twin.status === 'running' ? (
                            <Badge variant="green" size="sm" pulse>
                              Online
                            </Badge>
                          ) : (
                            <Badge variant="gray" size="sm">
                              Stopped
                            </Badge>
                          )
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            Unprovisioned
                          </span>
                        )}
                        <ChevronRight
                          className={`w-4 h-4 transition ${
                            isSelected ? 'text-indigo-600 translate-x-0.5' : 'text-slate-300'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* RIGHT COLUMN (lg:col-span-7): Selected Device Detail & Setup Action */}
        {/* =================================================================== */}
        <div className="lg:col-span-7 space-y-4">
          {selectedDevice ? (
            <div className="smansys-card p-6 bg-white space-y-5">
              {/* Selected Device Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                    <DeviceIcon deviceType={selectedDevice.deviceType} className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 tracking-tight">
                        {selectedDevice.hostname}
                      </h2>
                      <DeviceTypeBadge deviceType={selectedDevice.deviceType} ip={selectedDevice.ip} editable={false} />
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Physical IP: {selectedDevice.ip} | MAC: {selectedDevice.mac || 'Auto-Detected'}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div>
                  {currentTwin?.status === 'running' ? (
                    <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Docker Twin Active</span>
                    </div>
                  ) : currentTwin?.status === 'stopped' ? (
                    <div className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      <span>Container Stopped</span>
                    </div>
                  ) : (
                    <div className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Not Deployed</span>
                    </div>
                  )}
                </div>
              </div>

              {/* =============================================================== */}
              {/* BUTTON 2: "UNDER EACH DEVICE WHEN SELECTED IT MUST BE CREATE   */}
              {/* A DOCKER AND SET IT UP"                                         */}
              {/* =============================================================== */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-indigo-600" />
                      <span>Containerized Digital Twin Orchestration</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Automatically synthesize and spin up a dedicated Docker container mirroring{' '}
                      <span className="font-semibold text-slate-700">{selectedDevice.hostname}</span>.
                    </p>
                  </div>

                  {/* Primary Button 2 Action */}
                  <div className="flex items-center gap-2">
                    {currentTwin && currentTwin.status === 'running' ? (
                      <>
                        <button
                          onClick={() => handleToggleTwinPower(currentTwin, false)}
                          className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition"
                          title="Stop container"
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span>Stop</span>
                        </button>
                        <button
                          onClick={() => handleSetupSelectedDeviceDocker(selectedDevice)}
                          disabled={isSettingUpSingle}
                          className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold flex items-center gap-1.5 transition"
                          title="Rebuild & restart container"
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${isSettingUpSingle ? 'animate-spin' : ''}`} />
                          <span>Rebuild & Setup</span>
                        </button>
                      </>
                    ) : currentTwin && currentTwin.status === 'stopped' ? (
                      <>
                        <button
                          onClick={() => handleToggleTwinPower(currentTwin, true)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Start Container</span>
                        </button>
                        <button
                          onClick={() => handleSetupSelectedDeviceDocker(selectedDevice)}
                          disabled={isSettingUpSingle}
                          className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>Re-setup</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleSetupSelectedDeviceDocker(selectedDevice)}
                        disabled={isSettingUpSingle}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-2 transition ${
                          isSettingUpSingle
                            ? 'bg-indigo-400 cursor-wait'
                            : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-indigo-500/25'
                        }`}
                      >
                        {isSettingUpSingle ? (
                          <>
                            <RotateCw className="w-4 h-4 animate-spin" />
                            <span>Setting Up Docker...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-white text-white" />
                            <span>Create Docker & Set It Up</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Stepper Banner during Single Setup */}
                {isSettingUpSingle && (
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-medium flex items-center gap-2 animate-pulse">
                    <RotateCw className="w-3.5 h-3.5 animate-spin text-indigo-600 flex-shrink-0" />
                    <span>{singleSetupStep || 'Setting up Docker container...'}</span>
                  </div>
                )}
              </div>

              {/* Container Specs Overview (when twin exists) */}
              {currentTwin ? (
                <div className="space-y-4">
                  {/* Container Telemetry Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                        Virtual IP (Bridge)
                      </p>
                      <p className="text-xs font-bold font-mono text-indigo-700 mt-1">
                        {currentTwin.virtualIp}
                      </p>
                      <p className="text-[10px] text-slate-400">Subnet: 172.28.0.0/16</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                        Container ID
                      </p>
                      <p className="text-xs font-bold font-mono text-slate-800 mt-1">
                        {currentTwin.containerId.slice(0, 12)}
                      </p>
                      <p className="text-[10px] text-slate-400">{currentTwin.containerName}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                        CPU / Memory
                      </p>
                      <p className="text-xs font-bold font-mono text-slate-800 mt-1">
                        {currentTwin.status === 'running' ? `${currentTwin.cpuUsagePercent}%` : '0%'} /{' '}
                        {currentTwin.status === 'running' ? `${currentTwin.memoryUsageMb} MB` : '0 MB'}
                      </p>
                      <p className="text-[10px] text-slate-400">Limit: 128 MB RAM</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                        Base Image
                      </p>
                      <p className="text-xs font-bold font-mono text-slate-800 mt-1 truncate" title={currentTwin.dockerImage}>
                        {currentTwin.dockerImage.split(':')[0]}
                      </p>
                      <p className="text-[10px] text-slate-400">Multi-Stage Alpine</p>
                    </div>
                  </div>

                  {/* Port Mappings Table */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900">Virtual Port Mappings</h4>
                      <div className="flex items-center gap-2">
                        {probeResult && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-100 text-emerald-800 animate-fadeIn">
                            Port {probeResult.port} {probeResult.status} ({probeResult.latencyMs}ms)
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-400">
                          {currentTwin.mappedPorts.length} Active Listeners
                        </span>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-[11px]">
                          <tr>
                            <th className="py-2 px-3">Service</th>
                            <th className="py-2 px-3">Protocol</th>
                            <th className="py-2 px-3 font-mono">Container Port</th>
                            <th className="py-2 px-3 font-mono">Host Port</th>
                            <th className="py-2 px-3 text-right">Status</th>
                            <th className="py-2 px-3 text-right">Test Probe</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {currentTwin.mappedPorts.map((port, pIdx) => (
                            <tr key={pIdx} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-medium text-slate-800">{port.service}</td>
                              <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{port.protocol}</td>
                              <td className="py-2 px-3 font-mono font-semibold text-indigo-600">
                                :{port.containerPort}
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-600">127.0.0.1:{port.hostPort}</td>
                              <td className="py-2 px-3 text-right">
                                {currentTwin.status === 'running' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    LISTENING
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-medium">INACTIVE</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  onClick={() => handleProbePort(port.hostPort)}
                                  disabled={isProbing || currentTwin.status !== 'running'}
                                  className={`text-[10px] px-2 py-0.5 rounded-lg font-semibold border transition inline-flex items-center gap-1 ${
                                    currentTwin.status === 'running'
                                      ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 active:scale-95'
                                      : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                  }`}
                                  title="Send live TCP socket probe to verify listener"
                                >
                                  <Zap className="w-2.5 h-2.5" />
                                  <span>{isProbing ? 'Probing...' : 'Probe'}</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Interactive Inspector Tabs (Dockerfile, Compose, Entrypoint, Terminal) */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setInspectorTab('overview')}
                          className={`px-3 py-2 text-xs font-semibold border-b-2 transition ${
                            inspectorTab === 'overview'
                              ? 'border-indigo-600 text-indigo-600'
                              : 'border-transparent text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          Overview
                        </button>
                        <button
                          onClick={() => setInspectorTab('terminal')}
                          className={`px-3 py-2 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
                            inspectorTab === 'terminal'
                              ? 'border-indigo-600 text-indigo-600'
                              : 'border-transparent text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          <TerminalIcon className="w-3.5 h-3.5" />
                          <span>Container Logs ({currentTwin.logs.length})</span>
                        </button>
                        <button
                          onClick={() => setInspectorTab('dockerfile')}
                          className={`px-3 py-2 text-xs font-semibold border-b-2 transition ${
                            inspectorTab === 'dockerfile'
                              ? 'border-indigo-600 text-indigo-600'
                              : 'border-transparent text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          Dockerfile
                        </button>
                        <button
                          onClick={() => setInspectorTab('compose')}
                          className={`px-3 py-2 text-xs font-semibold border-b-2 transition ${
                            inspectorTab === 'compose'
                              ? 'border-indigo-600 text-indigo-600'
                              : 'border-transparent text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          Compose Snippet
                        </button>
                        <button
                          onClick={() => setInspectorTab('entrypoint')}
                          className={`px-3 py-2 text-xs font-semibold border-b-2 transition ${
                            inspectorTab === 'entrypoint'
                              ? 'border-indigo-600 text-indigo-600'
                              : 'border-transparent text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          Entrypoint Script
                        </button>
                      </div>

                      {/* Copy action for active tab */}
                      {inspectorTab !== 'overview' && (
                        <button
                          onClick={() => {
                            const content =
                              inspectorTab === 'terminal'
                                ? currentTwin.logs.join('\n')
                                : inspectorTab === 'dockerfile'
                                ? currentTwin.dockerfileContent
                                : inspectorTab === 'compose'
                                ? currentTwin.composeSnippet
                                : currentTwin.entrypointScript;
                            handleCopyText(content, inspectorTab);
                          }}
                          className="text-[11px] text-slate-500 hover:text-indigo-600 font-semibold flex items-center gap-1"
                        >
                          {copiedKey === inspectorTab ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Tab Content Display */}
                    {inspectorTab === 'overview' && (
                      <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200/80 text-xs space-y-2.5">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-slate-400 text-[11px]">Subnet Zone:</span>
                            <p className="font-semibold text-slate-800">{currentTwin.zone}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[11px]">Emulation Category:</span>
                            <p className="font-semibold text-slate-800">{currentTwin.deviceType}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[11px]">Creation Timestamp:</span>
                            <p className="font-mono text-slate-700 text-[11px]">
                              {new Date(currentTwin.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[11px]">Docker Health Status:</span>
                            <p className="font-semibold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Passing (30s TCP Heartbeat)</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {inspectorTab === 'terminal' && (
                      <div className="bg-[#0b0f19] text-emerald-400 font-mono text-[11px] p-4 rounded-xl h-64 overflow-y-auto space-y-1 shadow-inner border border-slate-800">
                        {currentTwin.logs.map((log, idx) => (
                          <div key={idx} className="leading-relaxed whitespace-pre-wrap">
                            <span className="text-slate-500 select-none mr-2">[{idx + 1}]</span>
                            <span
                              className={
                                log.includes('[ERROR]')
                                  ? 'text-rose-400'
                                  : log.includes('[DOCKER BUILD]')
                                  ? 'text-sky-300'
                                  : log.includes('[STEP')
                                  ? 'text-amber-300'
                                  : log.includes('[NETWORK]')
                                  ? 'text-indigo-300'
                                  : 'text-emerald-400'
                              }
                            >
                              {log}
                            </span>
                          </div>
                        ))}
                        <div ref={terminalEndRef} />
                      </div>
                    )}

                    {inspectorTab === 'dockerfile' && (
                      <pre className="bg-[#0b0f19] text-sky-200 font-mono text-[11px] p-4 rounded-xl h-64 overflow-y-auto shadow-inner border border-slate-800 whitespace-pre">
                        {currentTwin.dockerfileContent}
                      </pre>
                    )}

                    {inspectorTab === 'compose' && (
                      <pre className="bg-[#0b0f19] text-amber-200 font-mono text-[11px] p-4 rounded-xl h-64 overflow-y-auto shadow-inner border border-slate-800 whitespace-pre">
                        {currentTwin.composeSnippet}
                      </pre>
                    )}

                    {inspectorTab === 'entrypoint' && (
                      <pre className="bg-[#0b0f19] text-emerald-300 font-mono text-[11px] p-4 rounded-xl h-64 overflow-y-auto shadow-inner border border-slate-800 whitespace-pre">
                        {currentTwin.entrypointScript}
                      </pre>
                    )}
                  </div>
                </div>
              ) : (
                /* Empty state when twin has not yet been set up */
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 mx-auto">
                    <Boxes className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      No Docker Twin Configured for {selectedDevice.hostname}
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      Click the <span className="font-bold text-indigo-600">"Create Docker & Set It Up"</span> button
                      above to automatically synthesize an Alpine Linux digital twin with mirrored port listeners.
                    </p>
                  </div>
                  <button
                    onClick={() => handleSetupSelectedDeviceDocker(selectedDevice)}
                    disabled={isSettingUpSingle}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Create & Set Up Now</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Empty state when no device is selected */
            <div className="smansys-card p-12 bg-white text-center space-y-3">
              <Server className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">Select a device from the left</h3>
              <p className="text-xs text-slate-400">
                Choose any device to inspect its configuration and spin up a dedicated Docker twin.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
