import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export async function GET() {
  try {
    // 1. Get real network interface configuration
    const ipconfigCmd = `powershell -NoProfile -Command "Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Ethernet*','Wi-Fi*' | Where-Object { $_.IPAddress -notmatch '^169\\.254' } | Select-Object -First 1 IPAddress, InterfaceAlias, PrefixLength; (Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Select-Object -First 1).NextHop"`;
    const { stdout: ipOutput } = await execAsync(ipconfigCmd);

    // Parse output
    const matchIP = ipOutput.match(/(\d+\.\d+\.\d+\.\d+)/g) || [];
    const localIP = matchIP.length > 0 && matchIP[0] ? matchIP[0] : '';
    const gateway = matchIP.length > 1 && matchIP[matchIP.length - 1] ? matchIP[matchIP.length - 1]! : '';

    // Calculate subnet
    let subnet = '';
    if (localIP) {
      const ipParts = localIP.split('.');
      subnet = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0/24`;
    }

    // 2. Read live ARP table for physical MAC addresses
    const { stdout: arpOutput } = await execAsync('arp -a');
    const neighbors: Array<{ ip: string; mac: string; type: string }> = [];

    const arpLines = arpOutput.split('\n');
    for (const line of arpLines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 3 && parts[0] && parts[1] && /^\d+\.\d+\.\d+\.\d+$/.test(parts[0])) {
        const ip = parts[0];
        if (!ip.startsWith('224.') && !ip.startsWith('239.') && ip !== '255.255.255.255') {
          neighbors.push({
            ip,
            mac: parts[1]!.replace(/-/g, ':').toUpperCase(),
            type: parts[2] || 'dynamic',
          });
        }
      }
    }

    // 3. Get local MAC address
    const { stdout: macOutput } = await execAsync(
      `powershell -NoProfile -Command "(Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1).MacAddress"`
    );
    const localMac = macOutput.trim().replace(/-/g, ':').toUpperCase() || '';

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
