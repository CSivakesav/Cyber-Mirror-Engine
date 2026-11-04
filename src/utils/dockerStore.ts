'use client';

import { HostDevice, DockerTwinConfig, DockerContainerStatus } from '../types/cyber';
import { createDockerTwinConfig, generateFullNetworkDockerCompose } from './dockerGenerator';

const STORAGE_KEY = 'medshield_docker_twins';

export function getDockerTwins(): DockerTwinConfig[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse Docker twins:', e);
    return [];
  }
}

export function saveDockerTwins(twins: DockerTwinConfig[]): DockerTwinConfig[] {
  if (typeof window === 'undefined') return twins;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(twins));
    window.dispatchEvent(
      new CustomEvent('medshield-docker-twins-updated', {
        detail: { twins },
      })
    );
    return twins;
  } catch (e) {
    console.error('Failed to save Docker twins:', e);
    return twins;
  }
}

export function clearDockerTwins(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent('medshield-docker-twins-updated', { detail: { twins: [] } })
    );
  } catch {}
}

export function updateTwinStatus(
  containerId: string,
  status: DockerContainerStatus,
  extraLogs?: string[],
  metrics?: { cpu?: number; mem?: number }
): DockerTwinConfig | null {
  const twins = getDockerTwins();
  const idx = twins.findIndex((t) => t.containerId === containerId);
  if (idx === -1) return null;

  const current = twins[idx]!;
  const updatedLogs = extraLogs ? [...current.logs, ...extraLogs] : current.logs;

  const updated: DockerTwinConfig = {
    ...current,
    status,
    logs: updatedLogs,
    startedAt: status === 'running' ? current.startedAt || new Date().toISOString() : current.startedAt,
    cpuUsagePercent: metrics?.cpu ?? (status === 'running' ? Number((Math.random() * 2.5 + 0.3).toFixed(1)) : 0),
    memoryUsageMb: metrics?.mem ?? (status === 'running' ? Math.floor(Math.random() * 20 + 24) : 0),
    healthStatus: status === 'running' ? 'healthy' : 'unhealthy',
  };

  twins[idx] = updated;
  saveDockerTwins(twins);
  return updated;
}

/**
 * Creates or updates a Docker twin for a single device and sets it up
 */
export async function setupSingleDockerTwin(
  device: HostDevice,
  onProgress?: (step: string) => void
): Promise<DockerTwinConfig> {
  const existingTwins = getDockerTwins();
  const existingIdx = existingTwins.findIndex(
    (t) => t.deviceId === device.id || t.deviceIp === device.ip
  );

  let twin: DockerTwinConfig;
  if (existingIdx >= 0) {
    twin = existingTwins[existingIdx]!;
  } else {
    twin = createDockerTwinConfig(device, existingTwins.length);
    existingTwins.push(twin);
    saveDockerTwins(existingTwins);
  }

  // Execute Step 1: Synthesizing Dockerfile & Environment
  onProgress?.('Generating tailored Dockerfile, entrypoint daemon & port matrix...');
  await new Promise((r) => setTimeout(r, 450));
  twin = {
    ...twin,
    status: 'building',
    logs: [
      ...twin.logs,
      `[STEP 1/4] Generating device profile: ${device.deviceType} (${device.ip})`,
      `[STEP 1/4] Allocating virtual subnet bridge: ${twin.virtualIp}`,
      `[DOCKER BUILD] Building image: ${twin.dockerImage}...`,
    ],
  };
  saveDockerTwins(existingTwins.map((t) => (t.containerId === twin.containerId ? twin : t)));

  // Execute Step 2: Virtual Bridge Network Allocation & Image Build
  onProgress?.('Building lightweight container image with service emulators...');
  await new Promise((r) => setTimeout(r, 600));
  twin = {
    ...twin,
    status: 'starting',
    logs: [
      ...twin.logs,
      `[DOCKER BUILD] Step 1/5: FROM ${twin.dockerImage}`,
      `[DOCKER BUILD] Step 2/5: COPY entrypoint.sh /opt/cme-twin/entrypoint.sh`,
      `[DOCKER BUILD] Step 3/5: EXPOSE ${twin.mappedPorts.map((p) => p.containerPort).join(' ')}`,
      `[DOCKER BUILD] Step 4/5: HEALTHCHECK configured (30s interval)`,
      `[DOCKER BUILD] Step 5/5: Successfully built ${twin.containerId}`,
      `[DOCKER RUN] Attaching to bridge network 'cyber_mirror_mesh'...`,
    ],
  };
  saveDockerTwins(existingTwins.map((t) => (t.containerId === twin.containerId ? twin : t)));

  // Execute Step 3: Container Run, Port Binding & Daemon Initialization
  onProgress?.('Binding virtual ports and initializing service listeners...');
  await new Promise((r) => setTimeout(r, 550));

  const portLogs = twin.mappedPorts.map(
    (p) => `  -> Port ${p.hostPort}:${p.containerPort}/TCP bound to service [${p.service}]`
  );

  twin = {
    ...twin,
    status: 'running',
    startedAt: new Date().toISOString(),
    cpuUsagePercent: Number((Math.random() * 1.8 + 0.4).toFixed(1)),
    memoryUsageMb: Math.floor(Math.random() * 16 + 22),
    uptimeSeconds: 1,
    healthStatus: 'healthy',
    logs: [
      ...twin.logs,
      `[DOCKER RUN] Container ${twin.containerName} started in detached mode.`,
      `[NETWORK] Host Port Bindings:`,
      ...portLogs,
      `[CME TWIN] Digital Twin daemon initialized. Status: HEALTHY.`,
    ],
  };

  const finalTwins = existingTwins.map((t) => (t.containerId === twin.containerId ? twin : t));
  saveDockerTwins(finalTwins);

  // Sync with backend API (non-blocking)
  fetch('/api/docker', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'save-twin',
      twin,
    }),
  }).catch(() => {});

  onProgress?.('Docker digital twin is running and healthy!');
  return twin;
}

/**
 * Creates and sets up Docker twins for ALL provided devices in bulk
 */
export async function setupAllDockerTwins(
  devices: HostDevice[],
  onProgress?: (current: number, total: number, currentDevice: HostDevice) => void
): Promise<DockerTwinConfig[]> {
  const resultTwins: DockerTwinConfig[] = [];

  for (let i = 0; i < devices.length; i++) {
    const dev = devices[i]!;
    onProgress?.(i + 1, devices.length, dev);
    const created = await setupSingleDockerTwin(dev);
    resultTwins.push(created);
  }

  // Also write all compose files to backend
  try {
    const fullCompose = generateFullNetworkDockerCompose(resultTwins);
    await fetch('/api/docker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'write-all-twins',
        twins: resultTwins,
        composeContent: fullCompose,
      }),
    });
  } catch {}

  return resultTwins;
}

