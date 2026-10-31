'use client';

import React from 'react';
import {
  Monitor,
  Router,
  Server,
  Printer,
  Smartphone,
  HeartPulse,
  Cpu,
  CircleHelp,
} from 'lucide-react';
import { getDeviceCategory, DeviceCategory } from '../../utils/deviceClassification';

interface DeviceIconProps {
  deviceType?: string | null;
  category?: DeviceCategory;
  className?: string;
  size?: number;
}

export const DeviceIcon: React.FC<DeviceIconProps> = ({
  deviceType,
  category,
  className = 'w-4 h-4',
  size,
}) => {
  const cat = category || getDeviceCategory(deviceType);

  switch (cat) {
    case 'pc':
      return <Monitor className={className} size={size} />;
    case 'router':
      return <Router className={className} size={size} />;
    case 'server':
      return <Server className={className} size={size} />;
    case 'printer':
      return <Printer className={className} size={size} />;
    case 'mobile':
      return <Smartphone className={className} size={size} />;
    case 'medical':
      return <HeartPulse className={className} size={size} />;
    case 'iot':
      return <Cpu className={className} size={size} />;
    case 'unidentified':
    default:
      return <CircleHelp className={className} size={size} />;
  }
};

interface DeviceIconBadgeProps {
  deviceType?: string | null;
  category?: DeviceCategory;
  className?: string;
  iconClassName?: string;
  size?: number;
}

export const DeviceIconBadge: React.FC<DeviceIconBadgeProps> = ({
  deviceType,
  category,
  className = '',
  iconClassName = 'w-4 h-4',
  size,
}) => {
  const cat = category || getDeviceCategory(deviceType);

  const styleMap: Record<DeviceCategory, string> = {
    pc: 'bg-indigo-50 text-indigo-600 border border-indigo-200/80',
    router: 'bg-emerald-50 text-emerald-600 border border-emerald-200/80',
    server: 'bg-purple-50 text-purple-600 border border-purple-200/80',
    printer: 'bg-cyan-50 text-cyan-600 border border-cyan-200/80',
    mobile: 'bg-rose-50 text-rose-600 border border-rose-200/80',
    medical: 'bg-teal-50 text-teal-600 border border-teal-200/80',
    iot: 'bg-slate-100 text-slate-700 border border-slate-200',
    unidentified: 'bg-amber-50 text-amber-600 border border-amber-300 ring-2 ring-amber-100/80 animate-pulse',
  };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl p-1.5 shrink-0 transition-all ${
        styleMap[cat]
      } ${className}`}
    >
      <DeviceIcon category={cat} className={iconClassName} size={size} />
    </div>
  );
};
