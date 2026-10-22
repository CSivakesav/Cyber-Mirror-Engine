import { HostDevice, NetworkEdge, SimulationScenario, LogEntry } from '../types/cyber';

/**
 * Cyber Mirror Engine — Clean State
 * All hardcoded and sample mock data removed.
 * Real telemetry is supplied dynamically by live local binaries:
 * - Nmap 7.92 (Network Discovery)
 * - PowerShell Get-WinEvent (Sysmon Schema)
 * - PowerShell Get-NetTCPConnection (Zeek Schema)
 * - Net.Socket (Live Probe Execution)
 */

export const INITIAL_HOSTS: HostDevice[] = [];
export const INITIAL_EDGES: NetworkEdge[] = [];
export const SIMULATION_SCENARIOS: SimulationScenario[] = [];
export const INITIAL_LOGS: LogEntry[] = [];
export const MOCK_TERMINAL_LOGS: string[] = [];
