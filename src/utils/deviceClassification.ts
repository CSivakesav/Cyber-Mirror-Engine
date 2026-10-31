'use client';

export type DeviceCategory =
  | 'pc'
  | 'router'
  | 'server'
  | 'printer'
  | 'mobile'
  | 'medical'
  | 'iot'
  | 'unidentified';

export function isUnidentified(deviceType?: string | null): boolean {
  if (!deviceType) return true;
  const dt = deviceType.trim().toLowerCase();
  return (
    dt === '' ||
    dt === 'unidentified' ||
    dt === 'unknown' ||
    dt === '?' ||
    dt === 'unidentified device' ||
    dt === 'network endpoint' ||
    dt.includes('unidentified') ||
    dt.includes('unknown')
  );
}

export function getDeviceCategory(deviceType?: string | null): DeviceCategory {
  if (isUnidentified(deviceType)) {
    return 'unidentified';
  }

  const dt = (deviceType || '').toLowerCase();

  // PC / Workstation / Desktop / Laptop / Computer
  if (
    dt.includes('pc') ||
    dt.includes('workstation') ||
    dt.includes('desktop') ||
    dt.includes('laptop') ||
    dt.includes('computer') ||
    dt.includes('notebook') ||
    dt.includes('windows host') ||
    dt.includes('host machine')
  ) {
    return 'pc';
  }

  // Gateway / Router / Switch / Firewall / Access Point
  if (
    dt.includes('router') ||
    dt.includes('gateway') ||
    dt.includes('switch') ||
    dt.includes('firewall') ||
    dt.includes('modem') ||
    dt.includes('wifi') ||
    dt.includes('access point')
  ) {
    return 'router';
  }

  // Server / Database / Domain Controller / PACS / Storage
  if (
    dt.includes('server') ||
    dt.includes('database') ||
    dt.includes('controller') ||
    dt.includes('pacs') ||
    dt.includes('ehr') ||
    dt.includes('nas') ||
    dt.includes('storage') ||
    dt.includes('sql')
  ) {
    return 'server';
  }

  // Printer / Scanner
  if (dt.includes('print') || dt.includes('scanner') || dt.includes('copier')) {
    return 'printer';
  }

  // Mobile / Phone / Tablet
  if (
    dt.includes('phone') ||
    dt.includes('mobile') ||
    dt.includes('tablet') ||
    dt.includes('ipad') ||
    dt.includes('iphone') ||
    dt.includes('android')
  ) {
    return 'mobile';
  }

  // Medical / IoMT / Healthcare equipment
  if (
    dt.includes('medical') ||
    dt.includes('pump') ||
    dt.includes('patient') ||
    dt.includes('iomt') ||
    dt.includes('ecg') ||
    dt.includes('mri') ||
    dt.includes('ct') ||
    dt.includes('health') ||
    dt.includes('clinical') ||
    dt.includes('infusion') ||
    dt.includes('icu')
  ) {
    return 'medical';
  }

  // IoT / Camera / Smart sensors / Embedded
  if (
    dt.includes('iot') ||
    dt.includes('camera') ||
    dt.includes('cctv') ||
    dt.includes('smart') ||
    dt.includes('sensor') ||
    dt.includes('hvac') ||
    dt.includes('tv') ||
    dt.includes('embedded')
  ) {
    return 'iot';
  }

  // Default to PC if user typed a specific computer name or generic workstation
  return 'pc';
}

const STORAGE_KEY = 'medshield_device_type_overrides';

export function getSavedDeviceOverrides(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getResolvedDeviceType(ip: string, defaultType: string): string {
  if (typeof window === 'undefined') return defaultType;
  const overrides = getSavedDeviceOverrides();
  if (overrides[ip]) {
    return overrides[ip];
  }
  return defaultType;
}

export function saveDeviceTypeOverride(ip: string, newType: string): void {
  if (typeof window === 'undefined') return;
  try {
    const overrides = getSavedDeviceOverrides();
    overrides[ip] = newType;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    window.dispatchEvent(
      new CustomEvent('medshield-device-type-updated', {
        detail: { ip, deviceType: newType },
      })
    );
  } catch (e) {
    console.error('Failed to save device type override:', e);
  }
}

export function clearDeviceTypeOverrides(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('medshield-device-type-updated', { detail: {} }));
  } catch {}
}
