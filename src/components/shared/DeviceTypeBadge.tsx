'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  CircleHelp,
  Edit2,
  Check,
  X,
  Monitor,
  Router,
  Server,
  Printer,
  Smartphone,
  HeartPulse,
  Sparkles,
} from 'lucide-react';
import { DeviceIcon } from './DeviceIcon';
import {
  getDeviceCategory,
  isUnidentified,
  saveDeviceTypeOverride,
} from '../../utils/deviceClassification';

interface DeviceTypeBadgeProps {
  deviceType: string;
  ip: string;
  onTypeChange?: (newType: string) => void;
  editable?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

const PRESET_TYPES = [
  { label: 'PC / Workstation', icon: Monitor, color: 'text-indigo-600' },
  { label: 'Gateway / Router', icon: Router, color: 'text-emerald-600' },
  { label: 'Server / Database', icon: Server, color: 'text-purple-600' },
  { label: 'Network Printer', icon: Printer, color: 'text-cyan-600' },
  { label: 'Medical IoT (IoMT)', icon: HeartPulse, color: 'text-teal-600' },
  { label: 'Mobile / Tablet', icon: Smartphone, color: 'text-rose-600' },
  { label: 'Unidentified', icon: CircleHelp, color: 'text-amber-600' },
];

export const DeviceTypeBadge: React.FC<DeviceTypeBadgeProps> = ({
  deviceType,
  ip,
  onTypeChange,
  editable = true,
  className = '',
  size = 'sm',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customValue, setCustomValue] = useState(deviceType);
  const popoverRef = useRef<HTMLDivElement>(null);

  const unidentified = isUnidentified(deviceType);
  const category = getDeviceCategory(deviceType);

  useEffect(() => {
    setCustomValue(deviceType);
  }, [deviceType]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const handleSelectPreset = (preset: string) => {
    saveDeviceTypeOverride(ip, preset);
    if (onTypeChange) onTypeChange(preset);
    setIsOpen(false);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customValue.trim();
    if (!trimmed) return;
    saveDeviceTypeOverride(ip, trimmed);
    if (onTypeChange) onTypeChange(trimmed);
    setIsOpen(false);
  };

  const badgeColorMap: Record<string, string> = {
    pc: 'bg-indigo-50/90 text-indigo-700 border-indigo-200/90 hover:bg-indigo-100 hover:border-indigo-300',
    router: 'bg-emerald-50/90 text-emerald-700 border-emerald-200/90 hover:bg-emerald-100 hover:border-emerald-300',
    server: 'bg-purple-50/90 text-purple-700 border-purple-200/90 hover:bg-purple-100 hover:border-purple-300',
    printer: 'bg-cyan-50/90 text-cyan-700 border-cyan-200/90 hover:bg-cyan-100 hover:border-cyan-300',
    mobile: 'bg-rose-50/90 text-rose-700 border-rose-200/90 hover:bg-rose-100 hover:border-rose-300',
    medical: 'bg-teal-50/90 text-teal-700 border-teal-200/90 hover:bg-teal-100 hover:border-teal-300',
    iot: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:border-slate-300',
    unidentified:
      'bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-100/80 hover:bg-amber-100 hover:border-amber-400 font-semibold',
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Badge Button */}
      <button
        type="button"
        disabled={!editable}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title={
          unidentified
            ? `Device type unidentified! Click to manually enter device type for ${ip}`
            : `Click to edit device classification (${deviceType})`
        }
        className={`group inline-flex items-center gap-1.5 rounded-xl border transition-all text-left ${
          size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
        } ${badgeColorMap[category] || badgeColorMap.pc} ${
          editable ? 'cursor-pointer select-none active:scale-95' : 'cursor-default'
        } ${className}`}
      >
        <span className="shrink-0 flex items-center justify-center">
          <DeviceIcon
            category={category}
            className={`${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${
              unidentified ? 'text-amber-600 animate-pulse' : ''
            }`}
          />
        </span>

        <span className="truncate max-w-[140px] font-medium">
          {unidentified ? 'Unidentified' : deviceType}
        </span>

        {editable && (
          <span
            className={`opacity-60 group-hover:opacity-100 transition shrink-0 ml-0.5 ${
              unidentified ? 'text-amber-600' : 'text-slate-400'
            }`}
          >
            {unidentified ? (
              <span className="text-[10px] font-bold bg-amber-200/70 text-amber-900 px-1 py-0.2 rounded">
                Set Type
              </span>
            ) : (
              <Edit2 className="w-2.5 h-2.5" />
            )}
          </span>
        )}
      </button>

      {/* Manual Entry Popover Modal */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 left-0 top-full mt-2 w-72 sm:w-80 p-4 bg-white rounded-2xl shadow-xl border border-slate-200 text-xs text-slate-800 space-y-3 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <div>
                <h4 className="font-bold text-slate-900 text-xs">Device Classification</h4>
                <p className="text-[10px] font-mono text-slate-400">{ip}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {unidentified && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
              <CircleHelp className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                <strong>Unidentified device:</strong> Type or select a device type below to immediately assign its matching PC, Router, or Server icon.
              </p>
            </div>
          )}

          {/* Quick Preset Chips */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Quick Presets
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESET_TYPES.map((preset) => {
                const IconComponent = preset.icon;
                const isCurrent =
                  preset.label.toLowerCase() === (deviceType || '').toLowerCase();
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleSelectPreset(preset.label)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition text-left ${
                      isCurrent
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold'
                        : 'bg-slate-50/70 border-slate-200/80 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <IconComponent className={`w-3.5 h-3.5 shrink-0 ${preset.color}`} />
                    <span className="truncate">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Manual Input */}
          <form onSubmit={handleCustomSubmit} className="space-y-2 pt-1 border-t border-slate-100">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Or Enter Custom Type Manually
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                autoFocus
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="e.g. PC, Workstation, Laptop, Router..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition flex items-center gap-1 shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
