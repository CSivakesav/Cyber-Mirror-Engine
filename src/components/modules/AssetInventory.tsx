'use client';

import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Search,
  Filter,
  Server,
  RotateCw,
  ExternalLink,
  Shield,
  Layers,
  Network,
  FileSpreadsheet,
} from 'lucide-react';
import { HostDevice, SubnetZone } from '../../types/cyber';
import { Badge } from '../shared/Badge';
import { DeviceIcon } from '../shared/DeviceIcon';
import { DeviceTypeBadge } from '../shared/DeviceTypeBadge';
import { ExcelUploadModal } from '../shared/ExcelUploadModal';
import {
  getDeviceCategory,
  getResolvedDeviceType,
} from '../../utils/deviceClassification';
import { getCustomDevices } from '../../utils/customDeviceStore';

export const AssetInventory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [selectedDevice, setSelectedDevice] = useState<HostDevice | null>(null);
  const [assets, setAssets] = useState<HostDevice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState<boolean>(false);

  const zones: SubnetZone[] = [
    'Perimeter / DMZ',
    'Core Database / EHR',
    'Clinical Imaging',
    'Medical IoT (IoMT)',
    'ICU & Nurse Stations',
  ];

  const fetchDynamicAssets = () => {
    setIsLoading(true);
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
                description: `Live physical device detected via ARP cache on ${net.subnet || 'local network'}. Classification pending user verification.`,
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

        setAssets(Array.from(mergedMap.values()));
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  };

  const handleLoadAssets = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('medshield_fresh_clean_state');
    }
    fetchDynamicAssets();
  };

  useEffect(() => {
    const isErased =
      typeof window !== 'undefined' &&
      localStorage.getItem('medshield_fresh_clean_state') === 'true';

    if (!isErased) {
      fetchDynamicAssets();
    } else {
      setAssets([]);
      setIsLoading(false);
    }

    // Listen for global reset event
    const handleGlobalReset = () => {
      setAssets([]);
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

  const handleUpdateAssetType = (ip: string, newType: string) => {
    setAssets((prev) =>
      prev.map((a) => (a.ip === ip ? { ...a, deviceType: newType } : a))
    );
    setSelectedDevice((prev) =>
      prev && prev.ip === ip ? { ...prev, deviceType: newType } : prev
    );
  };

  useEffect(() => {
    const handleTypeUpdate = (e: any) => {
      const { ip, deviceType } = e.detail || {};
      if (ip && deviceType) {
        setAssets((prev) =>
          prev.map((a) => (a.ip === ip ? { ...a, deviceType } : a))
        );
        setSelectedDevice((prev) =>
          prev && prev.ip === ip ? { ...prev, deviceType } : prev
        );
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('medshield-device-type-updated', handleTypeUpdate);
    }

    const handleCustomDevicesUpdate = () => {
      fetchDynamicAssets();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('medshield-custom-devices-updated', handleCustomDevicesUpdate);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('medshield-device-type-updated', handleTypeUpdate);
        window.removeEventListener('medshield-custom-devices-updated', handleCustomDevicesUpdate);
      }
    };
  }, []);

  const filteredHosts = assets.filter((h) => {
    const matchesZone = selectedZone === 'all' || h.zone === selectedZone;
    const matchesSearch =
      h.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.ip.includes(searchTerm) ||
      h.mac.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.deviceType.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesZone && matchesSearch;
  });

  return (
    <div className="space-y-5 pb-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Asset Inventory
          </h2>
          <p className="text-xs text-slate-500 font-normal">
            Real Live Device Catalog Populated from Active Subnet Discovery &amp; ARP Resolution
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExcelModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Import Excel Devices</span>
          </button>
          <button
            onClick={handleLoadAssets}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-sm"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="smansys-card p-5 bg-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-slate-700 font-semibold">Subnet Zone:</span>
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="smansys-input px-3 py-1.5 text-xs text-slate-800 bg-slate-50"
          >
            <option value="all">All Zones ({assets.length} Active Nodes)</option>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search vendor, IP, hostname, OS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="smansys-input w-full pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Assets Grid or Empty State */}
      {filteredHosts.length === 0 ? (
        <div className="smansys-card p-12 bg-white text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Boxes className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-base">No Assets Discovered Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              The environment has been reset. Run Network Discovery to scan your live subnet and populate the device catalog.
            </p>
          </div>
          <button
            onClick={handleLoadAssets}
            className="px-4 py-2 rounded-2xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition shadow-sm"
          >
            Scan Live Interfaces
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredHosts.map((host) => (
            <div
              key={host.id}
              onClick={() => setSelectedDevice(host)}
              className="smansys-card p-6 bg-white border border-slate-100 hover:border-indigo-300 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 group hover:shadow-card"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition">
                      <DeviceIcon
                        category={getDeviceCategory(host.deviceType)}
                        className="w-4 h-4"
                      />
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition">
                        {host.hostname}
                      </h3>
                      <p className="font-mono text-xs text-indigo-600 font-semibold">{host.ip}</p>
                    </div>
                  </div>

                  <Badge variant={host.riskLevel === 'High' ? 'yellow' : 'green'} size="sm">
                    {host.riskLevel}
                  </Badge>
                </div>

                <div className="space-y-2 text-xs pt-1">
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-400">Classification</span>
                    <DeviceTypeBadge
                      deviceType={host.deviceType}
                      ip={host.ip}
                      onTypeChange={(newType) => handleUpdateAssetType(host.ip, newType)}
                    />
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Subnet Zone</span>
                    <span className="text-slate-700 font-medium">{host.zone}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Hardware / NIC</span>
                    <span className="text-slate-800 font-medium truncate max-w-[170px]">{host.vendor}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Open Ports</span>
                    <span className="font-mono text-indigo-600 font-bold">
                      {host.openPorts.length > 0 ? host.openPorts.map((p) => `TCP/${p}`).join(', ') : 'Standard'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-100 text-[11px]">
                <span className="text-slate-400 font-mono">MAC: {host.mac}</span>
                <span className="text-indigo-600 font-semibold group-hover:underline flex items-center gap-1">
                  <span>Details</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Device Inspector Modal */}
      {selectedDevice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedDevice(null)}
        >
          <div
            className="smansys-card w-full max-w-xl p-6 bg-white space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
                  <DeviceIcon
                    category={getDeviceCategory(selectedDevice.deviceType)}
                    className="w-5 h-5 text-indigo-600"
                  />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedDevice.hostname}</h3>
                  <p className="text-xs font-mono text-indigo-600">{selectedDevice.ip}</p>
                </div>
              </div>
              <Badge variant={selectedDevice.riskLevel === 'High' ? 'yellow' : 'green'}>
                {selectedDevice.riskLevel} Risk
              </Badge>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
              {selectedDevice.description}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-400">Classification</span>
                <div>
                  <DeviceTypeBadge
                    deviceType={selectedDevice.deviceType}
                    ip={selectedDevice.ip}
                    size="md"
                    onTypeChange={(newType) => handleUpdateAssetType(selectedDevice.ip, newType)}
                  />
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400">Hardware / NIC</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedDevice.vendor}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedDevice(null)}
                className="px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Upload Modal */}
      <ExcelUploadModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onSuccess={() => fetchDynamicAssets()}
      />
    </div>
  );
};
