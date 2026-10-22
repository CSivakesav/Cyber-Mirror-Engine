import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import util from 'util';

const execAsync = util.promisify(exec);

// Path to installed real Nmap binary
const NMAP_PATH = path.join(process.cwd(), 'bin', 'nmap-7.92', 'nmap.exe');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const targetSubnet = body.targetSubnet || '';
    const scanType = body.scanType || 'Host Discovery (Ping Scan)';

    const startTime = Date.now();

    // 1. Identify real local interface and default gateway
    let localIP = '';
    let gateway = '';
    let localMac = '';

    try {
      const { stdout: ipOutput } = await execAsync(
        `powershell -NoProfile -Command "Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Ethernet*','Wi-Fi*' | Where-Object { $_.IPAddress -notmatch '^169\\.254' } | Select-Object -First 1 IPAddress; (Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Select-Object -First 1).NextHop"`
      );
      const matches = ipOutput.match(/(\d+\.\d+\.\d+\.\d+)/g) || [];
      if (matches.length > 0 && matches[0]) localIP = matches[0];
      if (matches.length > 1 && matches[matches.length - 1]) gateway = matches[matches.length - 1]!;

      const { stdout: macOutput } = await execAsync(
        `powershell -NoProfile -Command "(Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1).MacAddress"`
      );
      localMac = macOutput.trim().replace(/-/g, ':').toUpperCase();
    } catch (e) {}

    // 2. Read live ARP table for physical devices
    const arpMap: Record<string, string> = {};
    try {
      const { stdout: arpOut } = await execAsync('arp -a');
      for (const line of arpOut.split('\n')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2 && parts[0] && parts[1] && /^\d+\.\d+\.\d+\.\d+$/.test(parts[0])) {
          const ip = parts[0];
          if (!ip.startsWith('224.') && !ip.startsWith('239.') && ip !== '255.255.255.255') {
            arpMap[ip] = parts[1].replace(/-/g, ':').toUpperCase();
          }
        }
      }
    } catch (e) {}

    // 3. Assemble target hosts dynamically from live network
    const targetsSet = new Set<string>();

    if (targetSubnet && targetSubnet.includes('/')) {
      const prefix = targetSubnet.split('/')[0]?.split('.').slice(0, 3).join('.') || '';
      
      // Include all live ARP neighbors matching the subnet prefix
      if (prefix) {
        Object.keys(arpMap).forEach((ip) => {
          if (ip.startsWith(prefix + '.')) {
            targetsSet.add(ip);
          }
        });

        // Include gateway and local IP if in subnet
        if (gateway && gateway.startsWith(prefix + '.')) targetsSet.add(gateway);
        if (localIP && localIP.startsWith(prefix + '.')) targetsSet.add(localIP);
      }
    } else if (targetSubnet && /^\d+\.\d+\.\d+\.\d+$/.test(targetSubnet.trim())) {
      targetsSet.add(targetSubnet.trim());
    } else {
      if (localIP) targetsSet.add(localIP);
      if (gateway) targetsSet.add(gateway);
      Object.keys(arpMap).forEach((ip) => targetsSet.add(ip));
    }

    const targetHosts = Array.from(targetsSet);

    // 4. Resolve Nmap binary (bundled bin/nmap-7.92 or system PATH)
    let nmapOutput = '';
    const portSpec = '53,80,135,443,445,3000,8080';
    const nmapArgs = `-Pn -sT -p ${portSpec} ${targetHosts.join(' ')}`;

    let nmapExecutable = '';
    if (fs.existsSync(NMAP_PATH)) {
      nmapExecutable = `"${NMAP_PATH}"`;
    } else {
      // Fallback: Check if nmap is available in system PATH
      try {
        const checkCmd = process.platform === 'win32' ? 'where nmap' : 'which nmap';
        require('child_process').execSync(checkCmd, { stdio: 'ignore' });
        nmapExecutable = 'nmap';
      } catch {
        nmapExecutable = '';
      }
    }

    if (nmapExecutable && targetHosts.length > 0) {
      try {
        const nmapCmd = `${nmapExecutable} ${nmapArgs}`;
        const { stdout, stderr } = await execAsync(nmapCmd, { timeout: 35000 });
        nmapOutput = stdout || stderr;
      } catch (err: any) {
        nmapOutput = err.stdout || err.message || '';
      }
    } else if (targetHosts.length === 0) {
      nmapOutput = 'No active network interfaces or target hosts detected.';
    } else {
      nmapOutput = `Nmap binary not found at bundled location (${NMAP_PATH}) or in system PATH. Please ensure Nmap is installed or present in bin/.`;
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // 5. Parse REAL Nmap report output into structured host items
    const discoveredHosts: any[] = [];
    const reportBlocks = nmapOutput.split('Nmap scan report for ').slice(1);

    for (const block of reportBlocks) {
      const lines = block.split('\n');
      const headerLine = lines[0]?.trim() || '';
      let ip = '';
      let hostname = '';

      if (headerLine.includes('(')) {
        const match = headerLine.match(/(.*)\s+\(([\d.]+)\)/);
        if (match && match[1] && match[2]) {
          hostname = match[1].trim();
          ip = match[2].trim();
        }
      } else {
        ip = headerLine.trim();
        hostname = ip === gateway ? 'Gateway Router' : (ip === localIP ? 'Local Host Workstation' : `Node-${ip.replace(/\./g, '-')}`);
      }

      // Parse open ports
      const openPorts: number[] = [];
      for (const line of lines) {
        const portMatch = line.match(/^(\d+)\/tcp\s+open/);
        if (portMatch && portMatch[1]) {
          openPorts.push(parseInt(portMatch[1]));
        }
      }

      // Parse latency
      let latency = 0.5;
      const latencyMatch = block.match(/Host is up \(([\d.]+)s latency\)/);
      if (latencyMatch && latencyMatch[1]) {
        latency = parseFloat((parseFloat(latencyMatch[1]) * 1000).toFixed(1));
      }

      const mac = arpMap[ip] || (ip === localIP ? localMac : 'Direct Link');

      // Determine classification strictly from real detected ports and topology
      let deviceType = 'Workstation';
      let zone = 'Core Network';
      let riskLevel = 'Low';
      let description = `Live device responding on ${ip}.`;
      let os = 'Network Device / Embedded OS';

      if (ip === gateway || openPorts.includes(53) || openPorts.includes(8080)) {
        deviceType = 'Gateway / Router';
        zone = 'Perimeter / DMZ';
        riskLevel = 'Low';
        os = 'Embedded Linux / RouterOS';
        description = `Default Gateway with active services on ports: ${openPorts.join(', ') || 'ICMP'}.`;
      } else if (ip === localIP || openPorts.includes(135) || openPorts.includes(445) || openPorts.includes(3000)) {
        deviceType = 'Host Workstation';
        zone = 'Workstations & Nurse Stations';
        riskLevel = openPorts.includes(445) ? 'Medium' : 'Low';
        os = 'Windows Host OS';
        description = `Host machine running local services on port(s): ${openPorts.join(', ') || 'active'}.`;
      } else {
        deviceType = 'Network Endpoint';
        zone = 'Medical IoT (IoMT)';
        riskLevel = openPorts.length > 0 ? 'Medium' : 'Low';
        description = `Discovered network node with ports: ${openPorts.join(', ') || 'None open'}.`;
      }

      discoveredHosts.push({
        id: `host-${ip.replace(/\./g, '-')}`,
        ip,
        mac,
        hostname,
        deviceType,
        zone,
        vendor: ip === localIP ? 'Local System NIC' : (mac.startsWith('00:') ? 'Hardware Vendor' : 'Network Device'),
        os,
        openPorts,
        status: 'online',
        riskLevel,
        latencyMs: latency,
        lastSeen: 'Live Now',
        cves: [],
        description,
      });
    }

    // Clean terminal lines for display
    const rawTerminalLines = typeof nmapOutput === 'string'
      ? nmapOutput
          .split('\n')
          .map((l) => (l != null ? l.trim() : ''))
          .filter((l) => Boolean(l) && !l.startsWith('WARNING: Could not import all necessary Npcap functions'))
      : [];

    return NextResponse.json({
      success: true,
      data: {
        command: `$ nmap ${nmapArgs}`,
        scanOutput: rawTerminalLines,
        summary: {
          totalIpsScanned: targetHosts.length,
          hostsDiscovered: discoveredHosts.length,
          scanDuration: `${duration} s`,
          status: 'Completed',
        },
        discoveredHosts,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}
