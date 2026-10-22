import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export async function GET() {
  try {
    // 1. Fetch REAL Windows System Events
    const winEventCmd = `powershell -NoProfile -Command "Get-WinEvent -LogName 'System' -MaxEvents 15 | Select-Object TimeCreated, Id, LevelDisplayName, ProviderName, @{Name='Msg';Expression={($_.Message -split [Environment]::NewLine)[0]}} | ConvertTo-Json"`;
    
    // 2. Fetch REAL active network connections
    const connCmd = `powershell -NoProfile -Command "Get-NetTCPConnection | Where-Object { $_.State -eq 'Established' -or $_.State -eq 'Listen' } | Select-Object -First 15 LocalAddress, LocalPort, RemoteAddress, RemotePort, State, OwningProcess | ConvertTo-Json"`;

    const [{ stdout: eventsRaw }, { stdout: connsRaw }] = await Promise.all([
      execAsync(winEventCmd).catch(() => ({ stdout: '[]' })),
      execAsync(connCmd).catch(() => ({ stdout: '[]' })),
    ]);

    let winEvents: any[] = [];
    try {
      const parsed = JSON.parse(eventsRaw);
      winEvents = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      winEvents = [];
    }

    let netConns: any[] = [];
    try {
      const parsed = JSON.parse(connsRaw);
      netConns = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      netConns = [];
    }

    const realLogs: any[] = [];

    // Map Real Windows System Events to Sysmon / Suricata schema
    winEvents.forEach((ev: any, idx: number) => {
      if (!ev) return;
      let timeStr = new Date().toISOString();
      if (ev.TimeCreated) {
        // Date parsing: /Date(1729617300000)/ or string
        const match = typeof ev.TimeCreated === 'string' ? ev.TimeCreated.match(/\d+/) : null;
        if (match) {
          timeStr = new Date(parseInt(match[0])).toLocaleString();
        } else {
          timeStr = String(ev.TimeCreated);
        }
      }

      const level =
        ev.LevelDisplayName === 'Error' || ev.LevelDisplayName === 'Critical'
          ? 'CRITICAL'
          : ev.LevelDisplayName === 'Warning'
          ? 'WARNING'
          : 'INFO';

      realLogs.push({
        id: `sys-event-${idx + 1}-${ev.Id || '0'}`,
        timestamp: timeStr,
        sensor: 'Sysmon',
        level,
        sourceIP: '127.0.0.1 (Localhost)',
        destIP: '127.0.0.1',
        protocol: 'HOST',
        serviceOrEventId: `EventID: ${ev.Id} (${ev.ProviderName || 'System'})`,
        message: ev.Msg || `Windows System Provider ${ev.ProviderName} registered event ${ev.Id}.`,
        rawPayload: {
          EventID: ev.Id,
          Provider: ev.ProviderName,
          Level: ev.LevelDisplayName,
          TimeCreated: ev.TimeCreated,
          Message: ev.Msg,
          Channel: 'System',
        },
      });
    });

    // Map Real Active TCP Network Connections to Zeek schema
    netConns.forEach((c: any, idx: number) => {
      if (!c) return;
      const now = new Date();
      const timeStr = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;

      const localAddr = c.LocalAddress === '::' ? '0.0.0.0' : String(c.LocalAddress);
      const remoteAddr = c.RemoteAddress === '::' ? '0.0.0.0' : String(c.RemoteAddress);

      realLogs.push({
        id: `zeek-conn-${idx + 1}-${c.LocalPort}`,
        timestamp: timeStr,
        sensor: 'Zeek',
        level: c.State === 'Established' ? 'ALERT' : 'INFO',
        sourceIP: localAddr,
        destIP: remoteAddr,
        protocol: 'TCP',
        serviceOrEventId: `conn.log (Port ${c.LocalPort} &rarr; ${c.RemotePort || 0})`,
        message: `Real TCP connection state: ${c.State}. Process PID ${c.OwningProcess} active on local port ${c.LocalPort}.`,
        rawPayload: {
          ts: Date.now() / 1000,
          proto: 'tcp',
          orig_h: localAddr,
          orig_p: c.LocalPort,
          resp_h: remoteAddr,
          resp_p: c.RemotePort,
          conn_state: c.State,
          pid: c.OwningProcess,
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        totalRealEvents: realLogs.length,
        logs: realLogs,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}
