'use client';

import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  Info,
  Check,
  ChevronRight,
  Sparkles,
  Copy,
  Table,
  HelpCircle,
  Monitor,
  Router,
  Server,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { HostDevice } from '../../types/cyber';
import { DeviceIcon } from './DeviceIcon';
import { DeviceTypeBadge } from './DeviceTypeBadge';
import {
  parseExcelDeviceFile,
  downloadSampleExcelTemplate,
  saveCustomDevices,
  SAMPLE_EXCEL_DATA,
} from '../../utils/customDeviceStore';
import { getDeviceCategory, getResolvedDeviceType } from '../../utils/deviceClassification';

interface ExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (devices: HostDevice[]) => void;
}

export const ExcelUploadModal: React.FC<ExcelUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'specs'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedDevices, setParsedDevices] = useState<HostDevice[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [copiedSample, setCopiedSample] = useState(false);
  const [showExampleExpanded, setShowExampleExpanded] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setIsParsing(true);
    setParseErrors([]);
    setImportSuccess(false);

    const result = await parseExcelDeviceFile(file);
    setIsParsing(false);

    if (result.success) {
      setParsedDevices(result.devices);
      if (result.errors && result.errors.length > 0) {
        setParseErrors(result.errors);
      }
    } else {
      setParsedDevices([]);
      setParseErrors(result.errors || ['Failed to parse Excel file.']);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
        handleFileChange(file);
      } else {
        setParseErrors(['Please upload a valid Excel (.xlsx, .xls) or CSV (.csv) file.']);
      }
    }
  };

  const handleLoadSampleData = () => {
    // Generate HostDevice objects directly from sample data
    const sampleHosts: HostDevice[] = SAMPLE_EXCEL_DATA.map((row, idx) => {
      const ip = row['IP Address'];
      const rawPorts = row['Open Ports'];
      const openPorts: number[] = [];
      if (rawPorts) {
        rawPorts.split(',').forEach((p) => {
          const num = parseInt(p.trim(), 10);
          if (!isNaN(num)) openPorts.push(num);
        });
      }

      return {
        id: `sample-${idx + 1}-${ip.replace(/\./g, '-')}`,
        ip,
        mac: row['MAC Address'],
        hostname: row.Hostname,
        deviceType: getResolvedDeviceType(ip, row['Device Type']),
        zone: row['Subnet Zone'] as any,
        vendor: row.Vendor,
        os: row['Operating System'],
        openPorts,
        status: 'online',
        riskLevel: row['Risk Level'] as any,
        latencyMs: 1.0,
        lastSeen: 'Sample Data',
        cves: [],
        description: row.Description,
      };
    });

    setParsedDevices(sampleHosts);
    setSelectedFile({
      name: 'MedShield_Network_Devices_Template.xlsx (Sample Data)',
      size: 14200,
    } as any);
    setParseErrors([]);
    setImportSuccess(false);
  };

  const handleCopySampleToClipboard = () => {
    const headers = Object.keys(SAMPLE_EXCEL_DATA[0]!).join('\t');
    const rows = SAMPLE_EXCEL_DATA.map((row) => Object.values(row).join('\t')).join('\n');
    const tsv = `${headers}\n${rows}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(tsv).then(() => {
        setCopiedSample(true);
        setTimeout(() => setCopiedSample(false), 2000);
      });
    }
  };

  const handleConfirmImport = () => {
    if (parsedDevices.length === 0) return;
    saveCustomDevices(parsedDevices, replaceExisting);
    setImportSuccess(true);
    if (onSuccess) {
      onSuccess(parsedDevices);
    }
    setTimeout(() => {
      onClose();
      // Reset state for next open
      setSelectedFile(null);
      setParsedDevices([]);
      setImportSuccess(false);
    }, 900);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="smansys-card w-full max-w-4xl bg-white shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Import Network Devices via Excel</span>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  .xlsx / .csv
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-normal">
                Upload your network inventory or follow the example structure shown below
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadSampleExcelTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition shadow-sm"
              title="Download pre-filled Excel template (.xlsx)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Download Sample Template</span>
              <span className="sm:hidden">Template</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 px-5 pt-3 gap-2 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload &amp; Example Preview</span>
            {parsedDevices.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                {parsedDevices.length} ready
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('specs')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'specs'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Column Specs &amp; Icon Guide</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'upload' && (
            <>
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 rounded-2xl border-2 border-dashed text-center transition cursor-pointer flex flex-col items-center justify-center space-y-2 select-none ${
                  dragOver
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : selectedFile
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-slate-200 hover:border-indigo-300 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                  {selectedFile ? (
                    <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <Upload className="w-6 h-6 text-slate-400" />
                  )}
                </div>

                {selectedFile ? (
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-slate-900">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Click or drop another spreadsheet to replace
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-bold text-slate-800">
                      Drag &amp; drop your Excel file here, or{' '}
                      <span className="text-indigo-600 underline">browse files</span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Supports <strong>.xlsx</strong>, <strong>.xls</strong>, and <strong>.csv</strong> files • Max 20MB
                    </p>
                  </div>
                )}
              </div>

              {/* Parsing status / Errors */}
              {isParsing && (
                <div className="p-3 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-medium flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                  <span>Parsing Excel workbook sheets and resolving device classifications...</span>
                </div>
              )}

              {parseErrors.length > 0 && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-rose-900">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Parsing Warnings / Errors:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                    {parseErrors.slice(0, 4).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {parseErrors.length > 4 && <li>...and {parseErrors.length - 4} more rows skipped.</li>}
                  </ul>
                </div>
              )}

              {/* Parsed Preview Table (if devices parsed) */}
              {parsedDevices.length > 0 && (
                <div className="space-y-2.5 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Ready to Import ({parsedDevices.length} devices parsed)</span>
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      Icons automatically mapped from device types
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-52">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-500 font-semibold">
                        <tr>
                          <th className="py-2 px-3">IP Address</th>
                          <th className="py-2 px-3">Hostname</th>
                          <th className="py-2 px-3">Device Type &amp; Icon</th>
                          <th className="py-2 px-3">MAC Address</th>
                          <th className="py-2 px-3">Ports</th>
                          <th className="py-2 px-3">Risk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedDevices.map((d) => (
                          <tr key={d.ip} className="hover:bg-slate-50/70">
                            <td className="py-2 px-3 font-mono font-bold text-slate-900 flex items-center gap-2">
                              <DeviceIcon
                                category={getDeviceCategory(d.deviceType)}
                                className="w-3.5 h-3.5 text-slate-400 shrink-0"
                              />
                              <span>{d.ip}</span>
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-800">{d.hostname}</td>
                            <td className="py-2 px-3">
                              <DeviceTypeBadge deviceType={d.deviceType} ip={d.ip} editable={false} />
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">{d.mac}</td>
                            <td className="py-2 px-3 font-mono text-indigo-600 text-[11px]">
                              {d.openPorts.length > 0 ? d.openPorts.join(', ') : 'None'}
                            </td>
                            <td className="py-2 px-3 font-medium text-[11px] text-slate-700">
                              {d.riskLevel}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700">
                      <input
                        type="checkbox"
                        checked={replaceExisting}
                        onChange={(e) => setReplaceExisting(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Replace existing inventory (leave unchecked to append new devices)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* EXAMPLE EXCEL STRUCTURE SECTION (PROMINENTLY DISPLAYED IN POPUP) */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                {/* Excel Workbook Green Header */}
                <div className="bg-[#107c41] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center font-bold text-white text-xs">
                      X
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm tracking-wide">
                          Example: How the Data Should Be in Excel
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded bg-white/20 text-white font-mono">
                          Sheet: Network Devices
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-100">
                        Header row with column names • Required: IP Address • Device Type selects the icon
                      </p>
                    </div>
                  </div>

                  {/* Actions in Excel Header */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopySampleToClipboard}
                      className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition flex items-center gap-1.5"
                      title="Copy example rows to clipboard to paste into Excel"
                    >
                      {copiedSample ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-200" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Sample</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleLoadSampleData}
                      className="px-2.5 py-1.5 rounded-lg bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                      title="Load sample devices directly into the preview to test import"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Test with Sample</span>
                    </button>

                    <button
                      type="button"
                      onClick={downloadSampleExcelTemplate}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold transition flex items-center gap-1.5"
                      title="Download template file"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">.xlsx</span>
                    </button>
                  </div>
                </div>

                {/* Excel Table Mockup */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      {/* Excel Column Letters (A, B, C, D, E, F) */}
                      <tr className="bg-slate-100 text-[10px] text-slate-400 font-mono border-b border-slate-200 select-none">
                        <th className="w-8 py-1 px-2 text-center border-r border-slate-200">#</th>
                        <th className="py-1 px-3 border-r border-slate-200 font-bold">Col A</th>
                        <th className="py-1 px-3 border-r border-slate-200 font-bold">Col B</th>
                        <th className="py-1 px-3 border-r border-slate-200 font-bold">Col C</th>
                        <th className="py-1 px-3 border-r border-slate-200 font-bold text-indigo-700 bg-indigo-50/60">
                          Resulting Engine Icon
                        </th>
                        <th className="py-1 px-3 border-r border-slate-200 font-bold">Col D</th>
                        <th className="py-1 px-3 border-r border-slate-200 font-bold">Col E</th>
                        <th className="py-1 px-3 font-bold">Col F</th>
                      </tr>

                      {/* Actual Column Names Row */}
                      <tr className="bg-slate-50 text-slate-800 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-2 text-center font-mono text-slate-400 border-r border-slate-200 bg-slate-100">
                          1
                        </th>
                        <th className="py-2.5 px-3 border-r border-slate-200">
                          <span className="text-slate-900">IP Address</span>
                          <span className="ml-1 text-[10px] text-rose-500 font-normal">*Required</span>
                        </th>
                        <th className="py-2.5 px-3 border-r border-slate-200">
                          <span className="text-slate-900">Hostname</span>
                        </th>
                        <th className="py-2.5 px-3 border-r border-slate-200">
                          <span className="text-slate-900">Device Type</span>
                          <span className="ml-1 text-[10px] text-indigo-600 font-normal">Sets Icon</span>
                        </th>
                        <th className="py-2.5 px-3 border-r border-slate-200 text-indigo-900 bg-indigo-50/40 font-semibold">
                          MedShield Icon
                        </th>
                        <th className="py-2.5 px-3 border-r border-slate-200">
                          <span className="text-slate-900">MAC Address</span>
                        </th>
                        <th className="py-2.5 px-3 border-r border-slate-200">
                          <span className="text-slate-900">Open Ports</span>
                        </th>
                        <th className="py-2.5 px-3">
                          <span className="text-slate-900">Subnet Zone</span>
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 text-slate-700 font-normal">
                      {/* Row 1: Gateway / Router */}
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-400 border-r border-slate-200 bg-slate-50/70 select-none">
                          2
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 border-r border-slate-200">
                          192.168.1.1
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">
                          Default Gateway Router
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-emerald-800 border-r border-slate-200">
                          Gateway / Router
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 bg-indigo-50/20">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                            <DeviceIcon category="router" className="w-3.5 h-3.5" />
                            <span>Router Icon</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px] border-r border-slate-200">
                          70:97:41:EF:37:7C
                        </td>
                        <td className="py-2.5 px-3 font-mono text-indigo-600 text-[11px] border-r border-slate-200">
                          53, 80, 443, 8080
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          Perimeter / DMZ
                        </td>
                      </tr>

                      {/* Row 2: PC / Workstation */}
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-400 border-r border-slate-200 bg-slate-50/70 select-none">
                          3
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 border-r border-slate-200">
                          192.168.1.50
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">
                          Nurse Workstation PC
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-blue-800 border-r border-slate-200">
                          PC / Workstation
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 bg-indigo-50/20">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
                            <DeviceIcon category="pc" className="w-3.5 h-3.5" />
                            <span>PC Icon</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px] border-r border-slate-200">
                          10:FF:E0:E5:EE:2A
                        </td>
                        <td className="py-2.5 px-3 font-mono text-indigo-600 text-[11px] border-r border-slate-200">
                          135, 445, 3000
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          Workstations &amp; Nurse Stations
                        </td>
                      </tr>

                      {/* Row 3: Server */}
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-400 border-r border-slate-200 bg-slate-50/70 select-none">
                          4
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 border-r border-slate-200">
                          192.168.1.120
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">
                          PACS Imaging Server
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-purple-800 border-r border-slate-200">
                          PACS Server
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 bg-indigo-50/20">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold">
                            <DeviceIcon category="server" className="w-3.5 h-3.5" />
                            <span>Server Icon</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px] border-r border-slate-200">
                          B4:2E:99:A1:C2:F3
                        </td>
                        <td className="py-2.5 px-3 font-mono text-indigo-600 text-[11px] border-r border-slate-200">
                          104, 8080, 11112
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          Clinical Imaging
                        </td>
                      </tr>

                      {/* Row 4: Medical IoT */}
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-400 border-r border-slate-200 bg-slate-50/70 select-none">
                          5
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 border-r border-slate-200">
                          192.168.1.85
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">
                          ICU Alaris Infusion Pump
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-cyan-800 border-r border-slate-200">
                          Infusion Pump
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 bg-indigo-50/20">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200 text-[11px] font-bold">
                            <DeviceIcon category="medical" className="w-3.5 h-3.5" />
                            <span>Medical IoT Icon</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px] border-r border-slate-200">
                          00:1A:2B:3C:4D:5E
                        </td>
                        <td className="py-2.5 px-3 font-mono text-indigo-600 text-[11px] border-r border-slate-200">
                          80, 443
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          Medical IoT (IoMT)
                        </td>
                      </tr>

                      {/* Row 5: Unidentified Node */}
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-400 border-r border-slate-200 bg-slate-50/70 select-none">
                          6
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 border-r border-slate-200">
                          192.168.1.200
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">
                          Unknown Network Client
                        </td>
                        <td className="py-2.5 px-3 text-amber-700 font-semibold border-r border-slate-200 italic">
                          Unidentified (or leave blank)
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 bg-amber-50/30">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-bold">
                            <DeviceIcon category="unidentified" className="w-3.5 h-3.5 text-amber-600" />
                            <span>? Question Mark</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px] border-r border-slate-200">
                          96:34:6A:24:A5:92
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px] border-r border-slate-200">
                          (None)
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          Core Network
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Practical Tips Callout Footer */}
                <div className="p-3.5 bg-slate-50/80 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px]">
                  <div className="flex items-start gap-2 text-slate-600">
                    <span className="text-base leading-none">💻</span>
                    <div>
                      <strong className="text-slate-800">PC / Workstation:</strong> Type{' '}
                      <code>PC</code>, <code>Workstation</code>, or <code>Laptop</code> to show PC icon.
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-slate-600">
                    <span className="text-base leading-none">🌐</span>
                    <div>
                      <strong className="text-slate-800">Gateway / Router:</strong> Type{' '}
                      <code>Router</code>, <code>Gateway</code>, or <code>Switch</code> to show Router icon.
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-slate-600">
                    <span className="text-base leading-none">❓</span>
                    <div>
                      <strong className="text-slate-800">Unidentified (?):</strong> Leave blank or enter{' '}
                      <code>Unidentified</code> to display interactive <code>?</code> icon.
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: DETAILED SPECS */}
          {activeTab === 'specs' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-950 space-y-1">
                <h4 className="font-bold text-sm text-indigo-900 flex items-center gap-2">
                  <Table className="w-4 h-4 text-indigo-600" />
                  <span>Excel Column Specifications &amp; Synonyms</span>
                </h4>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  MedShield AI's spreadsheet parser is flexible and case-insensitive. You do not need to follow strict formatting; the engine automatically matches common column aliases.
                </p>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Column Name</th>
                      <th className="py-2.5 px-3">Required?</th>
                      <th className="py-2.5 px-3">Accepted Synonyms / Aliases</th>
                      <th className="py-2.5 px-3">Example Values</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] text-slate-600">
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">IP Address</td>
                      <td className="py-2.5 px-3 font-bold text-rose-600">Yes (Required)</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">ip, ip_address, host ip, ipv4</td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">192.168.1.1, 10.0.0.45</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">Device Type</td>
                      <td className="py-2.5 px-3 font-semibold text-indigo-600">Recommended</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">type, devicetype, device_type, classification</td>
                      <td className="py-2.5 px-3 text-slate-800">PC / Workstation, Gateway, Server, Unidentified</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">Hostname</td>
                      <td className="py-2.5 px-3 text-slate-500">Optional</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">host name, name, device name</td>
                      <td className="py-2.5 px-3 text-slate-800">Nurse-PC-01, Core-Switch</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">MAC Address</td>
                      <td className="py-2.5 px-3 text-slate-500">Optional</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">mac, mac_address, physical address</td>
                      <td className="py-2.5 px-3 font-mono text-slate-800">00:1A:2B:3C:4D:5E</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">Open Ports</td>
                      <td className="py-2.5 px-3 text-slate-500">Optional</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">ports, open_ports, scanned ports</td>
                      <td className="py-2.5 px-3 font-mono text-slate-800">80, 443, 3000, 135</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">Subnet Zone</td>
                      <td className="py-2.5 px-3 text-slate-500">Optional</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">zone, subnet_zone, network zone</td>
                      <td className="py-2.5 px-3 text-slate-800">Perimeter / DMZ, Nurse Stations</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Icon mapping table */}
              <div className="space-y-2 pt-2">
                <h5 className="font-bold text-xs text-slate-800">
                  Hardware Device Icon Mapping Rules:
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">PC / Workstation</div>
                      <div className="text-[11px] text-slate-500">
                        Matches: <code>pc</code>, <code>workstation</code>, <code>laptop</code>, <code>desktop</code>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <Router className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Gateway / Router</div>
                      <div className="text-[11px] text-slate-500">
                        Matches: <code>router</code>, <code>gateway</code>, <code>switch</code>, <code>firewall</code>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                      <Server className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Server System</div>
                      <div className="text-[11px] text-slate-500">
                        Matches: <code>server</code>, <code>database</code>, <code>pacs</code>, <code>ehr</code>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Unidentified (?)</div>
                      <div className="text-[11px] text-slate-500">
                        Matches: <code>unidentified</code>, <code>unknown</code>, or left blank. Allows click-to-edit.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/80">
          <div className="text-xs text-slate-500">
            {parsedDevices.length > 0 ? (
              <span className="font-medium text-emerald-700">
                Ready to import {parsedDevices.length} hosts into MedShield AI.
              </span>
            ) : (
              <span>Upload an Excel/CSV file or click &quot;Test with Sample&quot; to try it.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={parsedDevices.length === 0 || isParsing || importSuccess}
              onClick={handleConfirmImport}
              className={`px-5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm ${
                importSuccess
                  ? 'bg-emerald-600 text-white'
                  : parsedDevices.length > 0
                  ? 'bg-slate-900 hover:bg-slate-800 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {importSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Imported Successfully!</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import {parsedDevices.length > 0 ? `${parsedDevices.length} Devices` : ''}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

