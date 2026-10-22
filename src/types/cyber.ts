export type DeviceType =
  | 'Infusion Pump'
  | 'Patient Monitor'
  | 'PACS Server'
  | 'CT / MRI Console'
  | 'EHR Database'
  | 'Domain Controller'
  | 'Nurse Workstation'
  | 'Host Workstation'
  | 'Workstation'
  | 'Gateway / Router'
  | 'Network Endpoint'
  | 'Network Client'
  | 'Pharmacy Printer'
  | 'HVAC Controller'
  | (string & {});

export type SubnetZone =
  | 'Perimeter / DMZ'
  | 'Medical IoT (IoMT)'
  | 'Clinical Imaging'
  | 'Core Database / EHR'
  | 'Core Network'
  | 'Workstations & Nurse Stations'
  | 'ICU & Nurse Stations'
  | (string & {});

export type HostStatus = 'online' | 'compromised' | 'warning' | 'offline';

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface HostDevice {
  id: string;
  ip: string;
  mac: string;
  hostname: string;
  deviceType: DeviceType;
  zone: SubnetZone;
  vendor: string;
  os: string;
  openPorts: number[];
  status: HostStatus;
  riskLevel: RiskLevel;
  latencyMs: number;
  lastSeen: string;
  cves: string[];
  description: string;
}

export interface ScanConfig {
  targetSubnet: string;
  scanType: string;
  tool: string;
}

export interface ScanSummary {
  totalIpsScanned: number;
  hostsDiscovered: number;
  scanDuration: string;
  status: 'Idle' | 'Scanning' | 'Completed' | 'Failed';
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  protocol: string;
  port: number;
  trafficVolumeMb: number;
  status: 'normal' | 'attacked' | 'blocked' | 'warning';
}

export interface SimulationStep {
  stepNumber: number;
  timestamp: string;
  sourceHostId: string;
  targetHostId: string;
  action: string;
  vector: string;
  detail: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitreTactic: string;
}

export interface SimulationScenario {
  id: string;
  title: string;
  category: 'Ransomware' | 'IoT Botnet' | 'Data Exfiltration' | 'Baseline Traffic';
  description: string;
  targetZone: SubnetZone;
  initialCompromise: string;
  steps: SimulationStep[];
}

export type SensorType = 'Zeek' | 'Suricata' | 'Sysmon';

export interface LogEntry {
  id: string;
  timestamp: string;
  sensor: SensorType;
  level: 'INFO' | 'WARNING' | 'ALERT' | 'CRITICAL';
  sourceIP: string;
  destIP: string;
  protocol: string;
  serviceOrEventId: string;
  message: string;
  rawPayload: Record<string, any>;
}
