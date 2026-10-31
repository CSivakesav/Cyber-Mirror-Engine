import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import os from 'os';
import util from 'util';

const execAsync = util.promisify(exec);

export async function GET() {
  try {
    // 1. Detect Default Gateway
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

    // 2. Detect Local IP and MAC using OS Network Interfaces
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

    // Match candidate on the same subnet as the default gateway
    if (gateway) {
      const gwPrefix = gateway.split('.').slice(0, 3).join('.');
      const matchingIface = candidateInterfaces.find((c) => c.ip.startsWith(gwPrefix + '.'));
      if (matchingIface) {
        localIP = matchingIface.ip;
        localMac = matchingIface.mac;
      }
    }

    // Fallback if gateway matching wasn't found
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

    // Calculate subnet scope
    let subnet = '';
    if (localIP) {
      const ipParts = localIP.split('.');
      subnet = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0/24`;
    }

    // 3. Read live ARP table for physical devices
    const neighbors: Array<{ ip: string; mac: string; type: string }> = [];
    try {
      const { stdout: arpOutput } = await execAsync('arp -a');
      const arpLines = arpOutput.split('\n');
      for (const line of arpLines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3 && parts[0] && parts[1] && /^\d+\.\d+\.\d+\.\d+$/.test(parts[0])) {
          const ip = parts[0];
          if (
            !ip.startsWith('224.') &&
            !ip.startsWith('239.') &&
            ip !== '255.255.255.255' &&
            !ip.endsWith('.255')
          ) {
            neighbors.push({
              ip,
              mac: parts[1]!.replace(/-/g, ':').toUpperCase(),
              type: parts[2] || 'dynamic',
            });
          }
        }
      }
    } catch {}

    return NextResponse.json({
      success: true,
      data: {
        localIP,
        localMac,
        gateway,
        subnet,
        activeNeighbors: neighbors,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      data: {
        localIP: '',
        localMac: '',
        gateway: '',
        subnet: '',
        activeNeighbors: [],
      },
    });
  }
}
