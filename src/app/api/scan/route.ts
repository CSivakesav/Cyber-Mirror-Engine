import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
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
    let gateway = '';
    try {
      const { stdout: gwOut } = await execAsync(
        `powershell -NoProfile -Command "(Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Select-Object -First 1).NextHop"`
      );
      const cleaned = gwOut.trim();
      if (/^\d+\.\d+\.\d+\.\d+$/.test(cleaned)) {
        gateway = cleaned;
      }
    } catch {
      try {
        const { stdout: routeOut } = await execAsync('route print 0.0.0.0');
        const match = routeOut.match(/0\.0\.0\.0\s+0\.0\.0\.0\s+(\d+\.\d+\.\d+\.\d+)/);
        if (match && match[1]) gateway = match[1];
      } catch {}
    }

    const ifaces = os.networkInterfaces();
    let localIP = '';
    let localMac = '';
    const candidateInterfaces: Array<{ name: string; ip: string; mac: string }> = [];

    for (const name of Object.keys(ifaces)) {
      const list = ifaces[name] || [];
      for (const iface of list) {
        if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254')) {
          candidateInterfaces.push({
            name,
            ip: iface.address,
            mac: iface.mac.replace(/-/g, ':').toUpperCase(),
          });
        }
      }
    }

    if (gateway) {
      const gwPrefix = gateway.split('.').slice(0, 3).join('.');
      const matchingIface = candidateInterfaces.find((c) => c.ip.startsWith(gwPrefix + '.'));
      if (matchingIface) {
        localIP = matchingIface.ip;
        localMac = matchingIface.mac;
      }
    }

    if (!localIP && candidateInterfaces.length > 0) {
      const nonVirtual = candidateInterfaces.find(
        (c) =>
          !c.name.toLowerCase().includes('virtual') &&
          !c.name.toLowerCase().includes('vbox') &&
          !c.name.toLowerCase().includes('vmware')
      );
      const chosen = nonVirtual || candidateInterfaces[0];
      if (chosen) {
        localIP = chosen.ip;
        localMac = chosen.mac;
      }
    }

    // 2. Read live ARP table for physical devices
    const arpMap: Record<string, string> = {};
    try {
      const { stdout: arpOut } = await execAsync('arp -a');
      for (const line of arpOut.split('\n')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2 && parts[0] && parts[1] && /^\d+\.\d+\.\d+\.\d+$/.test(parts[0])) {
          const ip = parts[0];
          if (
            !ip.startsWith('224.') &&
            !ip.startsWith('239.') &&
            ip !== '255.255.255.255' &&
            !ip.endsWith('.255')
          ) {
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
        hostname =
          ip === gateway
            ? 'Default Gateway Router'
            : ip === localIP
            ? 'Local Host PC (Workstation)'
            : `Endpoint-${ip.replace(/\./g, '-')}`;
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
      let deviceType = 'Unidentified';
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
      } else if (
        ip === localIP ||
        openPorts.includes(135) ||
        openPorts.includes(445) ||
        openPorts.includes(3000)
      ) {
        deviceType = 'PC / Workstation';
        zone = 'Workstations & Nurse Stations';
        riskLevel = openPorts.includes(445) ? 'Medium' : 'Low';
        os = 'Windows Host OS';
        description = `Host PC machine running local services on port(s): ${openPorts.join(', ') || 'active'}.`;
      } else if (openPorts.includes(9100) || openPorts.includes(631)) {
        deviceType = 'Printer';
        zone = 'Workstations & Nurse Stations';
        description = `Network printer discovered with port ${openPorts.join(', ')}.`;
      } else if (openPorts.includes(22) || openPorts.includes(3306) || openPorts.includes(5432)) {
        deviceType = 'Server / Database';
        zone = 'Core Database / EHR';
        description = `Server node responding on ports: ${openPorts.join(', ')}.`;
      } else {
        deviceType = 'Unidentified';
        zone = 'Core Network';
        riskLevel = openPorts.length > 0 ? 'Medium' : 'Low';
        description = `Active device responding on ${ip} with ports: ${openPorts.join(', ') || 'Filtered / Closed'}. Device classification unconfirmed.`;
        if (hostname.startsWith('Endpoint-')) {
          hostname = `Unidentified Host (${ip})`;
        }
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
