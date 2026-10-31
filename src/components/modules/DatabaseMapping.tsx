'use client';

import React, { useState, useEffect } from 'react';
import {
  Network,
  Share2,
  Database,
  Filter,
  Shield,
  Search,
  Activity,
  Server,
  Code,
  RotateCw,
  ExternalLink,
  FileSpreadsheet,
} from 'lucide-react';
import { HostDevice, NetworkEdge } from '../../types/cyber';
import { Badge } from '../shared/Badge';
import { DeviceIcon } from '../shared/DeviceIcon';
import { DeviceTypeBadge } from '../shared/DeviceTypeBadge';
import { ExcelUploadModal } from '../shared/ExcelUploadModal';
import {
  getDeviceCategory,
  isUnidentified,
  getResolvedDeviceType,
} from '../../utils/deviceClassification';
import { getCustomDevices } from '../../utils/customDeviceStore';

export const DatabaseMapping: React.FC = () => {
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [hosts, setHosts] = useState<HostDevice[]>([]);
  const [edges, setEdges] = useState<NetworkEdge[]>([]);
  const [selectedHostId, setSelectedHostId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'visualizer' | 'schema'>('visualizer');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [subnetName, setSubnetName] = useState<string>('');

  const fetchTopologyData = () => {
    setIsLoading(true);
    fetch('/api/network')
      .then((res) => res.json())
      .then((netJson) => {
        const netData = netJson.data || {};
        const gatewayIP = netData.gateway || '';
        const localIP = netData.localIP || '';
        const localMac = netData.localMac || '';
        const neighbors = Array.isArray(netData.activeNeighbors) ? netData.activeNeighbors : [];

        setSubnetName(netData.subnet || 'Active Network Subnet');

        const dynamicHosts: HostDevice[] = [];
        const dynamicEdges: NetworkEdge[] = [];

        if (gatewayIP) {
          dynamicHosts.push({
            id: 'real-gw',
            ip: gatewayIP,
            mac: neighbors.find((n: any) => n.ip === gatewayIP)?.mac || 'Default Gateway',
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

        if (localIP) {
          dynamicHosts.push({
            id: 'real-ws',
            ip: localIP,
            mac: localMac || 'Direct Link',
            hostname: 'Host Workstation',
            deviceType: 'Nurse Workstation',
            zone: 'ICU & Nurse Stations',
            vendor: 'Host System NIC',
            os: 'Windows Host OS',
            openPorts: [135, 445, 3000],
            status: 'online',
            riskLevel: 'Low',
            latencyMs: 0.1,
            lastSeen: 'Live Now',
            cves: [],
            description: 'Host system running Cyber Mirror Engine application server on TCP port 3000.',
          });

          if (gatewayIP) {
            dynamicEdges.push({
              id: 'e-ws-gw',
              source: 'real-ws',
              target: 'real-gw',
              protocol: 'TCP / IP Default Route',
              port: 443,
              trafficVolumeMb: 120,
              status: 'normal',
            });
          }
        }

        neighbors.forEach((neighbor: any) => {
          if (neighbor.ip !== gatewayIP && neighbor.ip !== localIP) {
            const nodeId = `node-${neighbor.ip.replace(/\./g, '-')}`;
            dynamicHosts.push({
              id: nodeId,
              ip: neighbor.ip,
              mac: neighbor.mac,
              hostname: `Node (${neighbor.ip})`,
              deviceType: 'Unidentified',
              zone: 'Core Network',
              vendor: 'Network Client',
              os: 'Embedded Firmware / OS',
              openPorts: [],
              status: 'online',
              riskLevel: 'Low',
              latencyMs: 1.5,
              lastSeen: 'Live Now',
              cves: [],
              description: `Live physical device detected via ARP cache on local subnet. Classification pending user verification.`,
            });

            if (gatewayIP) {
              dynamicEdges.push({
                id: `e-${nodeId}-gw`,
                source: nodeId,
                target: 'real-gw',
                protocol: 'ARP / IP Route',
                port: 80,
                trafficVolumeMb: 45,
                status: 'normal',
              });
            }
          }
        });

        // Merge custom Excel imported devices into topology graph
        const customDevices = getCustomDevices();
        customDevices.forEach((cd) => {
          if (!dynamicHosts.some((h) => h.ip === cd.ip)) {
            const nodeId = cd.id || `custom-${cd.ip.replace(/\./g, '-')}`;
            dynamicHosts.push({
              ...cd,
              id: nodeId,
              deviceType: getResolvedDeviceType(cd.ip, cd.deviceType),
            });

            if (gatewayIP) {
              dynamicEdges.push({
                id: `e-${nodeId}-gw`,
                source: nodeId,
                target: 'real-gw',
                protocol: 'Subnet Route',
                port: cd.openPorts && cd.openPorts.length > 0 ? cd.openPorts[0]! : 80,
                trafficVolumeMb: 35,
                status: 'normal',
              });
            }
          }
        });

        const resolvedHosts = dynamicHosts.map((h) => ({
          ...h,
          deviceType: getResolvedDeviceType(h.ip, h.deviceType),
        }));

        setHosts(resolvedHosts);
        setEdges(dynamicEdges);
        if (resolvedHosts.length > 0) {
          setSelectedHostId(resolvedHosts[0].id);
        }
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  };

  const handleUpdateHostType = (ip: string, newType: string) => {
    setHosts((prev) =>
      prev.map((h) => (h.ip === ip ? { ...h, deviceType: newType } : h))
    );
  };

  useEffect(() => {
    const handleTypeUpdate = (e: any) => {
      const { ip, deviceType } = e.detail || {};
      if (ip && deviceType) {
        setHosts((prev) =>
          prev.map((h) => (h.ip === ip ? { ...h, deviceType } : h))
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
      fetchTopologyData();
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

  const handleLoadTopology = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('medshield_fresh_clean_state');
    }
    fetchTopologyData();
  };

  useEffect(() => {
    const isErased =
      typeof window !== 'undefined' &&
      localStorage.getItem('medshield_fresh_clean_state') === 'true';

    if (!isErased) {
      fetchTopologyData();
    } else {
      setHosts([]);
      setEdges([]);
      setSelectedHostId('');
      setIsLoading(false);
    }

    // Listen for global reset all data
    const handleGlobalReset = () => {
      setHosts([]);
      setEdges([]);
      setSelectedHostId('');
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

  const selectedHost = hosts.find((h) => h.id === selectedHostId) || hosts[0];

  // Dynamically calculate node positions
  const nodePositions: Record<string, { x: number; y: number }> = {};
  const nonGwHosts = hosts.filter((h) => h.id !== 'real-gw');
  
  // Place gateway at top center
  if (hosts.some((h) => h.id === 'real-gw')) {
    nodePositions['real-gw'] = { x: 450, y: 100 };
  }

  // Distribute other nodes along the canvas
  const totalNonGw = nonGwHosts.length;
  nonGwHosts.forEach((h, idx) => {
    if (totalNonGw <= 5) {
      const spacing = 620 / Math.max(totalNonGw, 1);
      const startX = 450 - (spacing * (totalNonGw - 1)) / 2;
      nodePositions[h.id] = {
        x: Math.round(startX + idx * spacing),
        y: 320,
      };
    } else {
      // 2 tiers for larger topologies
      const isTopTier = idx % 2 === 0;
      const tierIndex = Math.floor(idx / 2);
      const tierTotal = isTopTier ? Math.ceil(totalNonGw / 2) : Math.floor(totalNonGw / 2);
      const spacing = 600 / Math.max(tierTotal, 1);
      const startX = 450 - (spacing * (tierTotal - 1)) / 2;
      nodePositions[h.id] = {
        x: Math.round(startX + tierIndex * spacing),
        y: isTopTier ? 220 : 340,
      };
    }
  });

  return (
    <div className="space-y-5 pb-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Database Mapping</h2>
          <p className="text-xs text-slate-500 font-normal">
            Real Network Topology Rendered from Active Windows Network Interfaces &amp; ARP
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Import Excel Devices Button */}
          <button
            onClick={() => setIsExcelModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200/80 text-xs font-semibold transition shadow-sm group"
            title="Import network devices from Excel spreadsheet (.xlsx, .xls, .csv)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition" />
            <span>Import Excel</span>
          </button>

          {/* View toggle */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-white border border-slate-200/80 text-xs shadow-sm">
            <button
              onClick={() => setActiveTab('visualizer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition ${
                activeTab === 'visualizer'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Topology Graph</span>
            </button>
            <button
              onClick={() => setActiveTab('schema')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition ${
                activeTab === 'schema'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Cypher / Graph Schema</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'visualizer' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Topology Canvas Card */}
          <div className="lg:col-span-8 smansys-card p-6 bg-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800">
                Live Subnet Topology Graph ({hosts.length} Active Nodes)
              </h3>
              <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                <span className="flex items-center gap-1.5">
                  <DeviceIcon category="router" className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Gateway</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <DeviceIcon category="pc" className="w-3.5 h-3.5 text-indigo-600" />
                  <span>PC / Workstation</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <DeviceIcon category="unidentified" className="w-3.5 h-3.5 text-amber-600" />
                  <span>Unidentified (?)</span>
                </span>
              </div>
            </div>

            {/* Clean Canvas */}
            <div className="relative w-full h-[460px] bg-[#f8fafc] rounded-2xl border border-slate-200/80 overflow-hidden flex items-center justify-center select-none shadow-inner">
              {hosts.length === 0 ? (
                <div className="text-center space-y-2 p-8">
                  <Network className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500">No active topology nodes mapped.</p>
                  <button
                    onClick={handleLoadTopology}
                    className="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold"
                  >
                    Load Live Network
                  </button>
                </div>
              ) : (
                <svg viewBox="0 0 900 460" className="w-full h-full">
                  {/* Zone Container */}
                  <rect
                    x="140"
                    y="40"
                    width="620"
                    height="380"
                    rx="20"
                    fill="#ffffff"
                    stroke="#e2e8f0"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                  />
                  <text x="165" y="75" fill="#64748b" fontSize="12" fontWeight="bold">
                    Subnet Scope: {subnetName}
                  </text>

                  {/* Edges */}
                  {edges.map((edge) => {
                    const s = nodePositions[edge.source];
                    const t = nodePositions[edge.target];
                    if (!s || !t) return null;
                    const isHighlighted =
                      edge.source === selectedHostId || edge.target === selectedHostId;

                    return (
                      <g key={edge.id}>
                        <line
                          x1={s.x}
                          y1={s.y}
                          x2={t.x}
                          y2={t.y}
                          stroke={isHighlighted ? '#6366f1' : '#cbd5e1'}
                          strokeWidth={isHighlighted ? 3 : 2}
                        />
                        <circle r="4" fill="#6366f1">
                          <animateMotion
                            path={`M ${s.x} ${s.y} L ${t.x} ${t.y}`}
                            dur="2.5s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      </g>
                    );
                  })}

                  {/* Nodes */}
                  {hosts.map((host) => {
                    const pos = nodePositions[host.id];
                    if (!pos) return null;
                    const isSelected = host.id === selectedHostId;
                    const cat = getDeviceCategory(host.deviceType);
                    const unident = isUnidentified(host.deviceType);

                    const nodeColor =
                      cat === 'router'
                        ? '#10b981'
                        : cat === 'pc'
                        ? '#6366f1'
                        : cat === 'server'
                        ? '#a855f7'
                        : '#f59e0b';

                    return (
                      <g
                        key={host.id}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        onClick={() => setSelectedHostId(host.id)}
                        className="cursor-pointer transition-all duration-300 group"
                      >
                        {/* Selected pulse glow */}
                        {isSelected && (
                          <rect
                            x="-28"
                            y="-28"
                            width="56"
                            height="56"
                            rx="18"
                            fill="none"
                            stroke={nodeColor}
                            strokeWidth="2.5"
                            opacity="0.8"
                            className="animate-pulse"
                          />
                        )}

                        {/* Node Card / Squircle */}
                        <rect
                          x="-24"
                          y="-24"
                          width="48"
                          height="48"
                          rx="15"
                          fill="#ffffff"
                          stroke={isSelected ? '#6366f1' : nodeColor}
                          strokeWidth={isSelected ? '3' : '2'}
                        />

                        {/* Render the Specific Device Icon instead of circle */}
                        {cat === 'pc' && (
                          <g transform="translate(0, -2)">
                            {/* PC Monitor Screen */}
                            <rect
                              x="-11"
                              y="-10"
                              width="22"
                              height="15"
                              rx="2.5"
                              fill={isSelected ? '#e0e7ff' : '#f1f5f9'}
                              stroke="#6366f1"
                              strokeWidth="1.8"
                            />
                            {/* Inner Display Accent */}
                            <line x1="-7" y1="-7" x2="7" y2="-7" stroke="#818cf8" strokeWidth="1.2" strokeLinecap="round" />
                            <line x1="-7" y1="-3" x2="2" y2="-3" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" />
                            {/* Monitor Stand */}
                            <line x1="0" y1="5" x2="0" y2="10" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
                            <line x1="-6" y1="10" x2="6" y2="10" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
                          </g>
                        )}

                        {cat === 'router' && (
                          <g transform="translate(0, 0)">
                            {/* Antennas */}
                            <line x1="-8" y1="-5" x2="-8" y2="-12" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
                            <line x1="8" y1="-5" x2="8" y2="-12" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
                            <circle cx="-8" cy="-12" r="1.5" fill="#10b981" />
                            <circle cx="8" cy="-12" r="1.5" fill="#10b981" />
                            {/* Router Body */}
                            <rect
                              x="-13"
                              y="-5"
                              width="26"
                              height="14"
                              rx="3.5"
                              fill={isSelected ? '#d1fae5' : '#f1f5f9'}
                              stroke="#10b981"
                              strokeWidth="1.8"
                            />
                            {/* LED indicators */}
                            <circle cx="-6" cy="2" r="1.5" fill="#10b981" />
                            <circle cx="0" cy="2" r="1.5" fill="#10b981" />
                            <circle cx="6" cy="2" r="1.5" fill="#10b981" />
                          </g>
                        )}

                        {unident && (
                          <g transform="translate(0, 0)">
                            {/* Amber Question Mark Icon */}
                            <rect
                              x="-13"
                              y="-13"
                              width="26"
                              height="26"
                              rx="8"
                              fill="#fef3c7"
                              stroke="#f59e0b"
                              strokeWidth="1.8"
                            />
                            <path
                              d="M -4 -4 C -4 -8, 4 -8, 4 -4 C 4 -1, 0 0, 0 3"
                              fill="none"
                              stroke="#d97706"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                            <circle cx="0" cy="7" r="1.8" fill="#d97706" />
                          </g>
                        )}

                        {cat === 'server' && (
                          <g transform="translate(0, 0)">
                            {/* Server Bay 1 */}
                            <rect
                              x="-12"
                              y="-11"
                              width="24"
                              height="9"
                              rx="2"
                              fill={isSelected ? '#ede9fe' : '#f1f5f9'}
                              stroke="#a855f7"
                              strokeWidth="1.8"
                            />
                            <circle cx="6" cy="-6.5" r="1.2" fill="#a855f7" />
                            {/* Server Bay 2 */}
                            <rect
                              x="-12"
                              y="2"
                              width="24"
                              height="9"
                              rx="2"
                              fill={isSelected ? '#ede9fe' : '#f1f5f9'}
                              stroke="#a855f7"
                              strokeWidth="1.8"
                            />
                            <circle cx="6" cy="6.5" r="1.2" fill="#a855f7" />
                          </g>
                        )}

                        {cat !== 'pc' && cat !== 'router' && !unident && cat !== 'server' && (
                          <g transform="translate(0, 0)">
                            <rect
                              x="-12"
                              y="-12"
                              width="24"
                              height="24"
                              rx="6"
                              fill="#f8fafc"
                              stroke={nodeColor}
                              strokeWidth="1.8"
                            />
                            <circle cx="0" cy="0" r="4" fill={nodeColor} />
                          </g>
                        )}

                        {/* Labels */}
                        <text
                          x="0"
                          y="42"
                          textAnchor="middle"
                          fill="#1e293b"
                          fontSize="11"
                          fontWeight="bold"
                        >
                          {host.hostname.split(' ')[0]}
                        </text>
                        <text
                          x="0"
                          y="56"
                          textAnchor="middle"
                          fill="#64748b"
                          fontSize="10"
                          fontFamily="monospace"
                        >
                          {host.ip}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          </div>

          {/* Node Inspector Drawer */}
          {selectedHost ? (
            <div className="lg:col-span-4 smansys-card p-6 bg-white space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-sm text-slate-900">Node Inspector</h3>
                  <Badge variant={selectedHost.riskLevel === 'High' ? 'yellow' : 'green'} size="sm">
                    {selectedHost.riskLevel} Risk
                  </Badge>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                    <DeviceIcon
                      category={getDeviceCategory(selectedHost.deviceType)}
                      className="w-5 h-5 text-indigo-600"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{selectedHost.hostname}</h4>
                    <p className="font-mono text-xs text-indigo-600 font-medium">
                      {selectedHost.ip} • {selectedHost.mac}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-400">Classification:</span>
                    <DeviceTypeBadge
                      deviceType={selectedHost.deviceType}
                      ip={selectedHost.ip}
                      onTypeChange={(newType) => handleUpdateHostType(selectedHost.ip, newType)}
                    />
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-400">Operating System:</span>
                    <span className="text-slate-800 font-semibold">{selectedHost.os}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-400">Scanned Ports:</span>
                    <span className="font-mono text-indigo-600 font-bold">
                      {selectedHost.openPorts.length > 0 ? selectedHost.openPorts.map((p) => `TCP/${p}`).join(', ') : 'Standard'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-400">Measured Latency:</span>
                    <span className="font-mono text-emerald-600 font-semibold">{selectedHost.latencyMs} ms</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed">
                  {selectedHost.description}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-indigo-50 text-[11px] text-indigo-700 font-semibold text-center">
                ✓ Live Topology: Real Network Node
              </div>
            </div>
          ) : (
            <div className="lg:col-span-4 smansys-card p-6 bg-white flex items-center justify-center text-slate-400 text-xs">
              Select a node to inspect telemetry
            </div>
          )}
        </div>
      ) : (
        <div className="smansys-card p-6 bg-white space-y-4">
          <h3 className="font-bold text-base text-slate-900">Cypher Graph Specification</h3>
          <pre className="p-5 rounded-2xl bg-[#0d0f14] text-cyan-300 font-mono text-xs overflow-x-auto leading-relaxed">
{`// Cypher Schema for Live Discovered Network Hosts
${hosts.map((h) => `CREATE (n_${h.id.replace(/-/g, '_')}:Host {ip: '${h.ip}', mac: '${h.mac}', hostname: '${h.hostname.split(' ')[0]}', os: '${h.os}', ports: [${h.openPorts.join(', ')}]})`).join('\n')}

// Relationships
${edges.map((e) => `CREATE (n_${e.source.replace(/-/g, '_')})-[:${e.protocol.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()} {port: ${e.port}}]->(n_${e.target.replace(/-/g, '_')})`).join('\n')}`}
          </pre>
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
