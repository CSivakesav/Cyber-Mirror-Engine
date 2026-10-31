'use client';

import * as XLSX from 'xlsx';
import { HostDevice, RiskLevel, SubnetZone } from '../types/cyber';
import { getResolvedDeviceType } from './deviceClassification';

const STORAGE_KEY = 'medshield_custom_imported_devices';

export function getCustomDevices(): HostDevice[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse custom devices:', e);
    return [];
  }
}

export function saveCustomDevices(
  newDevices: HostDevice[],
  replace = false
): HostDevice[] {
  if (typeof window === 'undefined') return newDevices;
  try {
    let combined: HostDevice[] = [];
    if (replace) {
      combined = newDevices;
    } else {
      const existing = getCustomDevices();
      const existingMap = new Map<string, HostDevice>();
      existing.forEach((d) => existingMap.set(d.ip, d));
      // Overwrite or append with new devices
      newDevices.forEach((d) => existingMap.set(d.ip, d));
      combined = Array.from(existingMap.values());
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
    window.dispatchEvent(
      new CustomEvent('medshield-custom-devices-updated', {
        detail: { devices: combined },
      })
    );
    return combined;
  } catch (e) {
    console.error('Failed to save custom devices:', e);
    return newDevices;
  }
}

export function clearCustomDevices(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent('medshield-custom-devices-updated', { detail: { devices: [] } })
    );
  } catch {}
}

export interface ParseExcelResult {
  success: boolean;
  devices: HostDevice[];
  totalRows: number;
  errors?: string[];
}

export async function parseExcelDeviceFile(file: File): Promise<ParseExcelResult> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { success: false, devices: [], totalRows: 0, errors: ['No sheets found in workbook.'] };
    }

    const firstSheetName = workbook.SheetNames[0]!;
    const worksheet = workbook.Sheets[firstSheetName];
    if (!worksheet) {
      return { success: false, devices: [], totalRows: 0, errors: ['Worksheet is empty.'] };
    }

    // Parse as JSON array of objects
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      defval: '',
      raw: false,
    });

    if (rawRows.length === 0) {
      return { success: false, devices: [], totalRows: 0, errors: ['No data rows found in worksheet.'] };
    }

    const parsedDevices: HostDevice[] = [];
    const errors: string[] = [];

    rawRows.forEach((row, idx) => {
      // Normalize object keys by trimming and lowercasing
      const normalizedRow: Record<string, string> = {};
      Object.keys(row).forEach((k) => {
        normalizedRow[k.trim().toLowerCase()] = String(row[k] || '').trim();
      });

      // Extract IP (required)
      const ip =
        normalizedRow['ip address'] ||
        normalizedRow['ip'] ||
        normalizedRow['ip_address'] ||
        normalizedRow['ipv4'] ||
        normalizedRow['host ip'] ||
        '';

      if (!ip || !/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
        errors.push(`Row ${idx + 2}: Missing or invalid IPv4 address ("${ip}").`);
        return;
      }

      // Extract Hostname
      const hostname =
        normalizedRow['hostname'] ||
        normalizedRow['host name'] ||
        normalizedRow['name'] ||
        normalizedRow['device name'] ||
        `Device-${ip.replace(/\./g, '-')}`;

      // Extract Device Type
      const rawDeviceType =
        normalizedRow['device type'] ||
        normalizedRow['devicetype'] ||
        normalizedRow['device_type'] ||
        normalizedRow['type'] ||
        normalizedRow['classification'] ||
        'Unidentified';

      const deviceType = getResolvedDeviceType(ip, rawDeviceType);

      // Extract MAC Address
      const mac =
        normalizedRow['mac address'] ||
        normalizedRow['mac'] ||
        normalizedRow['mac_address'] ||
        normalizedRow['physical address'] ||
        '00:50:56:XX:XX:XX';

      // Extract Subnet Zone
      const zone = (normalizedRow['subnet zone'] ||
        normalizedRow['zone'] ||
        normalizedRow['subnet_zone'] ||
        normalizedRow['network zone'] ||
        'Core Network') as SubnetZone;

      // Extract Open Ports (comma separated numbers)
      const rawPorts =
        normalizedRow['open ports'] ||
        normalizedRow['ports'] ||
        normalizedRow['open_ports'] ||
        normalizedRow['scanned ports'] ||
        '';

      const openPorts: number[] = [];
      if (rawPorts) {
        String(rawPorts)
          .split(/[,;\s]+/)
          .forEach((p) => {
            const num = parseInt(p.replace(/[^\d]/g, ''), 10);
            if (!isNaN(num) && num > 0 && num <= 65535) {
              openPorts.push(num);
            }
          });
      }

      // Extract Risk Level
      let riskLevel: RiskLevel = 'Low';
      const rawRisk = (normalizedRow['risk level'] ||
        normalizedRow['risk'] ||
        normalizedRow['risk_level'] ||
        normalizedRow['severity'] ||
        '')
        .toLowerCase();

      if (rawRisk.includes('crit')) riskLevel = 'Critical';
      else if (rawRisk.includes('high')) riskLevel = 'High';
      else if (rawRisk.includes('med')) riskLevel = 'Medium';
      else riskLevel = 'Low';

      // Extract OS and Vendor
      const os =
        normalizedRow['os'] ||
        normalizedRow['operating system'] ||
        normalizedRow['operating_system'] ||
        normalizedRow['platform'] ||
        'Generic Embedded OS';

      const vendor =
        normalizedRow['vendor'] ||
        normalizedRow['hardware'] ||
        normalizedRow['manufacturer'] ||
        normalizedRow['nic vendor'] ||
        'Network Vendor';

      const description =
        normalizedRow['description'] ||
        normalizedRow['details'] ||
        normalizedRow['notes'] ||
        `Imported from Excel inventory. Responding on ${ip}.`;

      parsedDevices.push({
        id: `import-${ip.replace(/\./g, '-')}`,
        ip,
        mac,
        hostname,
        deviceType,
        zone,
        vendor,
        os,
        openPorts,
        status: 'online',
        riskLevel,
        latencyMs: 1.2,
        lastSeen: 'Imported',
        cves: [],
        description,
      });
    });

    return {
      success: parsedDevices.length > 0,
      devices: parsedDevices,
      totalRows: rawRows.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err: any) {
    return {
      success: false,
      devices: [],
      totalRows: 0,
      errors: [err.message || 'Failed to read or parse file.'],
    };
  }
}

export const SAMPLE_EXCEL_DATA = [
  {
    'IP Address': '192.168.1.1',
    Hostname: 'Default Gateway Router',
    'Device Type': 'Gateway / Router',
    'MAC Address': '70:97:41:EF:37:7C',
    'Subnet Zone': 'Perimeter / DMZ',
    'Open Ports': '53, 80, 443, 8080',
    'Risk Level': 'Low',
    'Operating System': 'RouterOS / Embedded Linux',
    Vendor: 'Cisco Systems',
    Description: 'Primary default gateway routing traffic on local perimeter.',
  },
  {
    'IP Address': '192.168.1.50',
    Hostname: 'Nurse Workstation PC',
    'Device Type': 'PC / Workstation',
    'MAC Address': '10:FF:E0:E5:EE:2A',
    'Subnet Zone': 'Workstations & Nurse Stations',
    'Open Ports': '135, 445, 3000',
    'Risk Level': 'Low',
    'Operating System': 'Windows 11 Pro',
    Vendor: 'Dell OptiPlex',
    Description: 'Clinical workstation for EHR and patient charting.',
  },
  {
    'IP Address': '192.168.1.85',
    Hostname: 'ICU Alaris Infusion Pump',
    'Device Type': 'Infusion Pump',
    'MAC Address': '00:1A:2B:3C:4D:5E',
    'Subnet Zone': 'Medical IoT (IoMT)',
    'Open Ports': '80, 443',
    'Risk Level': 'Medium',
    'Operating System': 'Embedded RTOS',
    Vendor: 'Baxter / CareFusion',
    Description: 'Infusion pump delivering intravenous medication in ICU Ward A.',
  },
  {
    'IP Address': '192.168.1.120',
    Hostname: 'PACS Imaging Server',
    'Device Type': 'PACS Server',
    'MAC Address': 'B4:2E:99:A1:C2:F3',
    'Subnet Zone': 'Clinical Imaging',
    'Open Ports': '104, 8080, 11112',
    'Risk Level': 'High',
    'Operating System': 'Red Hat Enterprise Linux',
    Vendor: 'GE Healthcare',
    Description: 'DICOM imaging repository storing CT and MRI scans.',
  },
  {
    'IP Address': '192.168.1.200',
    Hostname: 'Unidentified Lab Node',
    'Device Type': 'Unidentified',
    'MAC Address': '96:34:6A:24:A5:92',
    'Subnet Zone': 'Core Network',
    'Open Ports': '',
    'Risk Level': 'Low',
    'Operating System': 'Unknown Firmware',
    Vendor: 'Hardware Vendor',
    Description: 'Active device found on subnet. Device classification unconfirmed.',
  },
];

export function downloadSampleExcelTemplate(): void {
  try {
    const worksheet = XLSX.utils.json_to_sheet(SAMPLE_EXCEL_DATA);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Network Devices');

    // Auto-fit column widths
    const maxCols = Object.keys(SAMPLE_EXCEL_DATA[0]!).map((key) => ({
      wch: Math.max(key.length, 18),
    }));
    worksheet['!cols'] = maxCols;

    XLSX.writeFile(workbook, 'MedShield_Network_Devices_Template.xlsx');
  } catch (e) {
    console.error('Failed to download template:', e);
  }
}
