'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Terminal,
  Filter,
  Search,
  RotateCw,
  CheckCircle,
  ShieldAlert,
  Code2,
  Activity,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { LogEntry } from '../../types/cyber';
import { Badge } from '../shared/Badge';

export const LogPreprocessing: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedSensor, setSelectedSensor] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [inspectLog, setInspectLog] = useState<LogEntry | null>(null);

  const fetchRealLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/logs');
      const json = await res.json();
      if (json.success && json.data && json.data.logs) {
        setLogs(json.data.logs);
      }
    } catch (e) {
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadLogs = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('medshield_fresh_clean_state');
    }
    fetchRealLogs();
  };

  useEffect(() => {
    const isErased =
      typeof window !== 'undefined' &&
      localStorage.getItem('medshield_fresh_clean_state') === 'true';

    let interval: NodeJS.Timeout | null = null;
    if (!isErased) {
      fetchRealLogs();
      interval = setInterval(fetchRealLogs, 12000);
    } else {
      setLogs([]);
      setIsLoading(false);
    }

    const handleGlobalReset = () => {
      setLogs([]);
      if (interval) clearInterval(interval);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('medshield-reset-all-data', handleGlobalReset);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('medshield-reset-all-data', handleGlobalReset);
      }
    };
  }, []);

  const filteredLogs = logs.filter((l) => {
    const matchesSensor = selectedSensor === 'all' || l.sensor === selectedSensor;
    const matchesSeverity = selectedSeverity === 'all' || l.level === selectedSeverity;
    const matchesQuery =
      l.sourceIP.includes(searchQuery) ||
      l.destIP.includes(searchQuery) ||
      l.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.serviceOrEventId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSensor && matchesSeverity && matchesQuery;
  });

  return (
    <div className="space-y-5 pb-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Log Preprocessing & Event Feed
          </h2>
          <p className="text-xs text-slate-500 font-normal">
            Live Normalized Windows System Events (Sysmon Schema) & Active TCP Sockets (Zeek Schema)
          </p>
        </div>

        <button
          onClick={handleLoadLogs}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-sm"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Live Events</span>
        </button>
      </div>

      {/* 4 Smansys Pastel Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Pastel Yellow */}
        <div className="p-4 rounded-3xl bg-[#fef3c7] border border-[#fde68a] flex items-center justify-between shadow-card">
          <div>
            <span className="text-[11px] font-semibold text-amber-900/80">Real Live Events</span>
            <div className="text-2xl font-extrabold text-amber-950 mt-1">{logs.length} Records</div>
          </div>
          <Layers className="w-5 h-5 text-amber-700" />
        </div>

        {/* Card 2: Pastel Cyan */}
        <div className="p-4 rounded-3xl bg-[#e0f2fe] border border-[#bae6fd] flex items-center justify-between shadow-card">
          <div>
            <span className="text-[11px] font-semibold text-sky-900/80">Active TCP Sockets</span>
            <div className="text-2xl font-extrabold text-sky-950 mt-1">
              {logs.filter((l) => l.sensor === 'Zeek').length} Sockets
            </div>
          </div>
          <FileText className="w-5 h-5 text-sky-700" />
        </div>

        {/* Card 3: Pastel Purple */}
        <div className="p-4 rounded-3xl bg-[#ede9fe] border border-[#ddd6fe] flex items-center justify-between shadow-card">
          <div>
            <span className="text-[11px] font-semibold text-indigo-900/80">Windows Host Events</span>
            <div className="text-2xl font-extrabold text-indigo-950 mt-1">
              {logs.filter((l) => l.sensor === 'Sysmon').length} System Logs
            </div>
          </div>
          <ShieldAlert className="w-5 h-5 text-indigo-700" />
        </div>

        {/* Card 4: Pastel Green */}
        <div className="p-4 rounded-3xl bg-[#dcfce7] border border-[#bbf7d0] flex items-center justify-between shadow-card">
          <div>
            <span className="text-[11px] font-semibold text-emerald-900/80">Authenticity</span>
            <div className="text-2xl font-extrabold text-emerald-950 mt-1">100% Live</div>
          </div>
          <CheckCircle className="w-5 h-5 text-emerald-700" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="smansys-card p-5 bg-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600 font-semibold">Sensor Feed:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
              {['all', 'Zeek', 'Sysmon'].map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSensor(s)}
                  className={`px-3 py-1 rounded-xl transition text-xs font-semibold ${
                    selectedSensor === s
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {s === 'all' ? 'All Live Feeds' : s === 'Zeek' ? 'Zeek (TCP Sockets)' : 'Sysmon (Windows Events)'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-2">
            <span className="text-slate-600 font-semibold">Severity:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="smansys-input px-3 py-1 text-xs text-slate-800 bg-[#f6f7fa] cursor-pointer"
            >
              <option value="all">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="ALERT">Alert</option>
              <option value="WARNING">Warning</option>
              <option value="INFO">Info</option>
            </select>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search real IP, event ID, message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none w-full"
          />
        </div>
      </div>

      {/* Log Feed Table */}
      <div className="smansys-card p-6 bg-white space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              Live Normalized Security Event Stream
            </h3>
            <p className="text-xs text-slate-400">{filteredLogs.length} live records loaded from host system</p>
          </div>
          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Ingestion Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-medium font-sans">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Sensor Feed</th>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Source &rarr; Destination</th>
                <th className="py-2.5 px-3">Service / Event ID</th>
                <th className="py-2.5 px-3">Normalized Summary</th>
                <th className="py-2.5 px-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLogs.map((entry) => (
                <tr
                  key={entry.id}
                  onClick={() => setInspectLog(entry)}
                  className="hover:bg-slate-50/70 transition cursor-pointer"
                >
                  <td className="py-3 px-3 text-slate-500 whitespace-nowrap text-[11px] font-mono">
                    {entry.timestamp}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-xl text-[10px] font-semibold ${
                        entry.sensor === 'Zeek'
                          ? 'bg-sky-50 text-sky-700 border border-sky-100'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      }`}
                    >
                      {entry.sensor}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <Badge
                      variant={
                        entry.level === 'CRITICAL'
                          ? 'red'
                          : entry.level === 'ALERT'
                          ? 'yellow'
                          : entry.level === 'WARNING'
                          ? 'purple'
                          : 'green'
                      }
                      size="sm"
                    >
                      {entry.level}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-800 font-medium whitespace-nowrap text-[11px]">
                    {entry.sourceIP} &rarr; {entry.destIP}
                  </td>
                  <td className="py-3 px-3 text-indigo-600 font-semibold whitespace-nowrap text-[11px]">
                    {entry.serviceOrEventId}
                  </td>
                  <td className="py-3 px-3 text-slate-600 max-w-md truncate text-xs">
                    {entry.message}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setInspectLog(entry);
                      }}
                      className="text-slate-400 hover:text-slate-900 transition p-1"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw Payload Inspector Modal */}
      {inspectLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setInspectLog(null)}
        >
          <div
            className="smansys-card w-full max-w-xl p-6 bg-white shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {inspectLog.sensor} Live Payload
                  </h3>
                  <p className="text-xs font-mono text-slate-400">{inspectLog.id}</p>
                </div>
              </div>
              <Badge variant={inspectLog.level === 'CRITICAL' ? 'red' : 'green'}>
                {inspectLog.level}
              </Badge>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1">
              <span className="text-slate-400 font-semibold">Normalized Event Summary:</span>
              <p className="text-slate-800 font-medium">{inspectLog.message}</p>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-800">Parsed JSON Structure:</span>
              <pre className="p-4 rounded-2xl bg-[#0d0f14] text-cyan-300 font-mono text-xs overflow-x-auto max-h-64 leading-relaxed">
                {JSON.stringify(inspectLog.rawPayload, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
