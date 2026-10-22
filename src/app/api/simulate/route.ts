import { NextResponse } from 'next/server';
import net from 'net';

export async function POST(req: Request) {
  try {
    const { targetHost, targetPort, action } = await req.json();
    const host = targetHost || '127.0.0.1';
    const port = targetPort || 80;

    const t0 = Date.now();

    // Perform actual real TCP socket probe
    const probeResult = await new Promise<{
      connected: boolean;
      latencyMs: number;
      error?: string;
    }>((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(800);

      socket.on('connect', () => {
        const latency = Date.now() - t0;
        socket.destroy();
        resolve({ connected: true, latencyMs: latency });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ connected: false, latencyMs: Date.now() - t0, error: 'Connection timed out' });
      });

      socket.on('error', (err) => {
        socket.destroy();
        resolve({ connected: false, latencyMs: Date.now() - t0, error: err.message });
      });

      socket.connect(port, host);
    });

    return NextResponse.json({
      success: true,
      data: {
        targetHost: host,
        targetPort: port,
        action: action || 'TCP Connection Test',
        connected: probeResult.connected,
        latencyMs: probeResult.latencyMs,
        socketStatus: probeResult.connected ? 'PORT_OPEN' : 'PORT_FILTERED_OR_CLOSED',
        error: probeResult.error || null,
        timestamp: new Date().toLocaleTimeString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}
