import { HostDevice, DockerTwinConfig, DockerPortMapping, DockerContainerStatus } from '../types/cyber';

// Map known device types to specialized simulation profiles
export interface TwinProfile {
  baseImage: string;
  defaultPorts: Array<{ port: number; proto: string; service: string }>;
  osLabel: string;
  category: string;
  startupMessage: string;
}

export function getTwinProfileForDevice(deviceType: string, openPorts?: number[]): TwinProfile {
  const dt = (deviceType || '').toLowerCase();

  if (dt.includes('gateway') || dt.includes('router')) {
    return {
      baseImage: 'alpine:3.19',
      defaultPorts: [
        { port: 53, proto: 'UDP/TCP', service: 'DNS Forwarder / Dnsmasq' },
        { port: 80, proto: 'TCP', service: 'RouterOS Admin Web UI' },
        { port: 443, proto: 'TCP', service: 'HTTPS Secure Gateway Management' },
      ],
      osLabel: 'RouterOS / Embedded Linux v7.12',
      category: 'Perimeter Gateway',
      startupMessage: 'RouterOS Gateway Gateway Twin daemon initialized. IP routing and NAT bridge enabled.',
    };
  }

  if (dt.includes('pacs') || dt.includes('mri') || dt.includes('ct') || dt.includes('imaging')) {
    return {
      baseImage: 'orthanc/orthanc:latest',
      defaultPorts: [
        { port: 104, proto: 'TCP', service: 'DICOM C-STORE / C-FIND Storage' },
        { port: 4242, proto: 'TCP', service: 'DCMTK Orthanc DICOM Web API' },
        { port: 8042, proto: 'TCP', service: 'Orthanc Explorer Web Interface' },
      ],
      osLabel: 'Linux DICOM / PACS Radiology Server',
      category: 'Clinical Imaging',
      startupMessage: 'DICOM PACS Engine Twin running. AE Title: CME_PACS_SCP. Awaiting incoming modality studies.',
    };
  }

  if (dt.includes('ehr') || dt.includes('database') || dt.includes('sql') || dt.includes('server')) {
    return {
      baseImage: 'postgres:15-alpine',
      defaultPorts: [
        { port: 5432, proto: 'TCP', service: 'PostgreSQL Relational EHR Database' },
        { port: 2575, proto: 'TCP', service: 'HL7 v2 MLLP Message Ingestion Listener' },
        { port: 8080, proto: 'TCP', service: 'FHIR R4 RESTful API Service' },
      ],
      osLabel: 'Red Hat Enterprise Linux / PostgreSQL 15',
      category: 'Core EHR Database',
      startupMessage: 'EHR Database digital twin online. PostgreSQL connection pool ready. HL7 MLLP server listening on port 2575.',
    };
  }

  if (dt.includes('infusion') || dt.includes('pump')) {
    return {
      baseImage: 'python:3.11-alpine',
      defaultPorts: [
        { port: 80, proto: 'TCP', service: 'Alaris Infusion Pump Web Management' },
        { port: 502, proto: 'TCP', service: 'Modbus TCP Telemetry Slave' },
        { port: 8080, proto: 'TCP', service: 'IoMT REST Dose Rate Sensor API' },
      ],
      osLabel: 'Embedded RTOS / Medical Firmware v4.2',
      category: 'Medical IoT (IoMT)',
      startupMessage: 'Smart Infusion Pump IoMT twin active. Flow rate telemetry streaming: 125 mL/hr Saline 0.9%.',
    };
  }

  if (dt.includes('monitor') || dt.includes('patient') || dt.includes('vital')) {
    return {
      baseImage: 'eclipse-mosquitto:2.0-alpine',
      defaultPorts: [
        { port: 1883, proto: 'TCP', service: 'MQTT Telemetry Broker (Vitals: ECG, SpO2, NIBP)' },
        { port: 8883, proto: 'TCP', service: 'Secure TLS MQTT Medical Bus' },
      ],
      osLabel: 'Philips IntelliVue OS / IoMT Sensor Node',
      category: 'Patient Monitoring',
      startupMessage: 'Patient Vital Signs Monitor twin streaming telemetry. Vitals: HR=72 BPM | SpO2=98% | BP=118/76.',
    };
  }

  if (dt.includes('workstation') || dt.includes('nurse') || dt.includes('pc') || dt.includes('host')) {
    return {
      baseImage: 'alpine:3.19',
      defaultPorts: [
        { port: 135, proto: 'TCP', service: 'Microsoft RPC Endpoint Mapper' },
        { port: 445, proto: 'TCP', service: 'Microsoft SMB / Samba File Sharing' },
        { port: 3389, proto: 'TCP', service: 'Remote Desktop Protocol (RDP) Listener' },
        { port: 3000, proto: 'TCP', service: 'MedShield AI CME Client Node' },
      ],
      osLabel: 'Windows 11 Enterprise (Workstation Twin)',
      category: 'Clinical Workstation',
      startupMessage: 'Nurse Workstation digital twin initialized. SMB and RDP mock endpoints exposed.',
    };
  }

  if (dt.includes('printer')) {
    return {
      baseImage: 'alpine:3.19',
      defaultPorts: [
        { port: 9100, proto: 'TCP', service: 'HP JetDirect RAW Print Server' },
        { port: 631, proto: 'TCP', service: 'Internet Printing Protocol (CUPS)' },
      ],
      osLabel: 'Zebra / HP Embedded Print Server Firmware',
      category: 'Network Peripheral',
      startupMessage: 'Pharmacy Zebra Barcode / Prescription printer twin active. Raw port 9100 listening.',
    };
  }

  if (dt.includes('hvac') || dt.includes('controller') || dt.includes('bms')) {
    return {
      baseImage: 'alpine:3.19',
      defaultPorts: [
        { port: 47808, proto: 'UDP', service: 'BACnet/IP Building Automation' },
        { port: 502, proto: 'TCP', service: 'Modbus Industrial Controller' },
      ],
      osLabel: 'Johnson Controls Metasys / RTOS',
      category: 'Facilities & HVAC',
      startupMessage: 'HVAC Air Handler Digital Twin active. Negative pressure airflow sensor: 12 Pa (Operating OK).',
    };
  }

  // Fallback for unidentified or generic devices
  const fallbackPorts = (openPorts && openPorts.length > 0)
    ? openPorts.map((p) => ({ port: p, proto: 'TCP', service: `Custom Service (Port ${p})` }))
    : [
        { port: 80, proto: 'TCP', service: 'HTTP Web Daemon' },
        { port: 8080, proto: 'TCP', service: 'REST API Telemetry Endpoint' },
      ];

  return {
    baseImage: 'alpine:3.19',
    defaultPorts: fallbackPorts,
    osLabel: 'Embedded Linux / Generic Appliance',
    category: 'Network Endpoint',
    startupMessage: 'Generic cyber digital twin container running with mirrored network ports.',
  };
}

/**
 * Generates virtual IP in the 172.28.0.0/16 Docker bridge network
 */
export function generateVirtualIp(deviceIp: string, index = 0): string {
  try {
    const parts = deviceIp.split('.').map((p) => parseInt(p, 10));
    if (parts.length === 4 && !isNaN(parts[2]!) && !isNaN(parts[3]!)) {
      const third = Math.min(254, Math.max(1, parts[2]! % 250));
      const fourth = Math.min(254, Math.max(2, parts[3]!));
      return `172.28.${third}.${fourth}`;
    }
  } catch {}
  return `172.28.1.${10 + (index % 240)}`;
}

/**
 * Generates an authentic Dockerfile tailored to the device
 */
export function generateDockerfile(
  device: HostDevice,
  profile: TwinProfile,
  ports: DockerPortMapping[]
): string {
  const exposedPorts = ports.map((p) => p.containerPort).join(' ');

  return `# ==============================================================================
# MedShield AI — Cyber Mirror Engine (CME) Digital Twin
# Device: ${device.hostname} (${device.ip})
# Type:   ${device.deviceType} | Zone: ${device.zone}
# Generated automatically by CME Docker Synthesizer
# ==============================================================================

FROM ${profile.baseImage}

LABEL maintainer="MedShield AI Cyber Mirror Engine <admin@medshield.local>"
LABEL org.opencontainers.image.title="Digital Twin: ${device.hostname}"
LABEL cme.device.ip="${device.ip}"
LABEL cme.device.type="${device.deviceType}"
LABEL cme.device.vendor="${device.vendor}"
LABEL cme.device.zone="${device.zone}"
LABEL cme.container.role="digital-twin-honeypot"

# Set working directory & environment variables
WORKDIR /opt/cme-twin
ENV CME_TWIN_DEVICE_IP="${device.ip}" \\
    CME_TWIN_HOSTNAME="${device.hostname}" \\
    CME_TWIN_TYPE="${device.deviceType}" \\
    CME_TWIN_ZONE="${device.zone}" \\
    DEBIAN_FRONTEND=noninteractive

# Install lightweight network utilities and runtime dependencies
RUN if command -v apk > /dev/null 2>&1; then \\
      apk update && apk add --no-cache bash curl netcat-openbsd python3 py3-pip jq procps; \\
    elif command -v apt-get > /dev/null 2>&1; then \\
      apt-get update && apt-get install -y --no-install-recommends bash curl netcat-openbsd python3 python3-pip jq procps && rm -rf /var/lib/apt/lists/*; \\
    fi

# Create simulated device banner & telemetry scripts
COPY entrypoint.sh /opt/cme-twin/entrypoint.sh
RUN chmod +x /opt/cme-twin/entrypoint.sh

# Expose simulated service ports
EXPOSE ${exposedPorts || '80 8080'}

# Container healthcheck: probes the primary exposed port
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:${ports[0]?.containerPort || 80}/healthz || exit 0

# Run entrypoint daemon
ENTRYPOINT ["/bin/bash", "/opt/cme-twin/entrypoint.sh"]
`;
}

/**
 * Generates shell entrypoint script for the container
 */
export function generateEntrypointScript(
  device: HostDevice,
  profile: TwinProfile,
  ports: DockerPortMapping[]
): string {
  const portListeners = ports
    .map(
      (p) =>
        `# Port ${p.containerPort} (${p.service})
python3 -c "
import socket, threading, time

def handle_client(conn, addr):
    try:
        data = conn.recv(1024)
        ts = time.strftime('%Y-%m-%d %H:%M:%S')
        print(f'[{ts}] [Port ${p.containerPort}] Probe connection received from {addr[0]}:{addr[1]}')
        conn.sendall(b'HTTP/1.1 200 OK\\r\\nServer: MedShield-Twin/${device.deviceType}\\r\\nContent-Type: text/plain\\r\\nConnection: close\\r\\n\\r\\nOK - CME Twin Active\\n')
    except Exception:
        pass
    finally:
        conn.close()

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
s.bind(('0.0.0.0', ${p.containerPort}))
s.listen(10)
print('  -> Port ${p.containerPort}/TCP listening for [${p.service}]')

while True:
    conn, addr = s.accept()
    t = threading.Thread(target=handle_client, args=(conn, addr))
    t.daemon = True
    t.start()
" &
`
    )
    .join('\n');

  return `#!/bin/bash
# ==============================================================================
# Entrypoint for Cyber Mirror Twin: ${device.hostname}
# Emulating: ${device.deviceType} (${device.ip})
# ==============================================================================

echo "================================================================="
echo " [MedShield AI] CYBER MIRROR ENGINE — DIGITAL TWIN STARTUP"
echo " Target Host:     \${CME_TWIN_HOSTNAME} (\${CME_TWIN_DEVICE_IP})"
echo " Device Type:     \${CME_TWIN_TYPE}"
echo " Emulation Zone:  \${CME_TWIN_ZONE}"
echo " Profile Status:  ACTIVE & READY"
echo "================================================================="
echo "${profile.startupMessage}"
echo ""

echo "[*] Spawning simulated device service responders..."
${portListeners || `python3 -m http.server 80 &`}

echo ""
echo "[+] Digital Twin successfully initialized. Emulation loop running."

# Keep container alive and stream heartbeat telemetry
while true; do
  sleep 60
  echo "[HEARTBEAT] $(date -u +'%Y-%m-%dT%H:%M:%SZ') - Device \${CME_TWIN_DEVICE_IP} twin is online (CPU: 0.1%, Mem: 18MB)"
done
`;
}

/**
 * Generates docker-compose.yml service snippet
 */
export function generateComposeSnippet(
  serviceName: string,
  containerName: string,
  device: HostDevice,
  virtualIp: string,
  ports: DockerPortMapping[]
): string {
  const portBlocks = ports
    .map((p) => `      - "${p.hostPort}:${p.containerPort}"`)
    .join('\n');

  return `  ${serviceName}:
    image: medshield-twins/${serviceName}:latest
    container_name: ${containerName}
    build:
      context: ./twins/${serviceName}
      dockerfile: Dockerfile
    networks:
      cyber_mirror_mesh:
        ipv4_address: ${virtualIp}
    ports:
${portBlocks}
    environment:
      - CME_TWIN_DEVICE_IP=${device.ip}
      - CME_TWIN_HOSTNAME=${device.hostname}
      - CME_TWIN_TYPE=${device.deviceType}
      - CME_TWIN_ZONE=${device.zone}
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 128M
`;
}

/**
 * Builds the complete DockerTwinConfig object for a given device
 */
export function createDockerTwinConfig(
  device: HostDevice,
  index = 0,
  baseHostPort = 18000
): DockerTwinConfig {
  const profile = getTwinProfileForDevice(device.deviceType, device.openPorts);
  const cleanHost = device.hostname.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 20);
  const cleanIp = device.ip.replace(/\./g, '-');
  const serviceName = `twin-${cleanHost || cleanIp}`;
  const containerName = `cme-twin-${cleanIp}`;
  const containerId = Array.from({ length: 12 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');

  const virtualIp = generateVirtualIp(device.ip, index);

  // Determine port mappings
  const rawPorts =
    device.openPorts && device.openPorts.length > 0
      ? device.openPorts.map((port) => {
          const matched = profile.defaultPorts.find((p) => p.port === port);
          return {
            port,
            proto: matched ? matched.proto : 'TCP',
            service: matched ? matched.service : `Simulated Service (${port})`,
          };
        })
      : profile.defaultPorts;

  const mappedPorts: DockerPortMapping[] = rawPorts.slice(0, 4).map((p, pIdx) => ({
    hostPort: baseHostPort + index * 10 + pIdx,
    containerPort: p.port,
    protocol: p.proto,
    service: p.service,
  }));

  const dockerfileContent = generateDockerfile(device, profile, mappedPorts);
  const entrypointScript = generateEntrypointScript(device, profile, mappedPorts);
  const composeSnippet = generateComposeSnippet(
    serviceName,
    containerName,
    device,
    virtualIp,
    mappedPorts
  );

  const now = new Date().toISOString();

  return {
    containerId,
    containerName,
    deviceId: device.id,
    deviceIp: device.ip,
    hostname: device.hostname,
    deviceType: device.deviceType,
    vendor: device.vendor,
    zone: device.zone,
    status: 'not_created',
    dockerImage: `medshield-twins/${serviceName}:latest`,
    virtualIp,
    mappedPorts,
    dockerfileContent,
    composeSnippet,
    entrypointScript,
    createdAt: now,
    startedAt: undefined,
    cpuUsagePercent: 0,
    memoryUsageMb: 0,
    memoryLimitMb: 128,
    logs: [
      `[CONFIG] Synthesized Docker container profile for ${device.hostname} (${device.ip})`,
      `[CONFIG] Allocated virtual mesh IP: ${virtualIp} on subnet 172.28.0.0/16`,
      `[CONFIG] Ready to build and provision Docker digital twin.`,
    ],
    healthStatus: 'healthy',
    uptimeSeconds: 0,
  };
}

/**
 * Generates the full multi-container docker-compose.yml for the entire network
 */
export function generateFullNetworkDockerCompose(twins: DockerTwinConfig[]): string {
  const serviceSnippets = twins.map((t) => t.composeSnippet).join('\n');

  return `# ==============================================================================
# MedShield AI — Cyber Mirror Engine (CME)
# Master Multi-Container Digital Twin Docker Compose Architecture
# Generated automatically from live network discovery and asset inventory
# ==============================================================================

version: '3.8'

networks:
  cyber_mirror_mesh:
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.28.0.0/16
          gateway: 172.28.0.1

services:
${serviceSnippets || '  # No active containers generated yet'}
`;
}

/**
 * Predefined hospital device twin templates ready to launch instantly with 1-click
 */
export const PREDEFINED_TWIN_TEMPLATES: HostDevice[] = [
  {
    id: 'preset-pacs-server',
    ip: '172.28.10.12',
    mac: '00:1A:C8:11:22:33',
    hostname: 'PACS-Orthanc-Radiology',
    deviceType: 'PACS Server',
    zone: 'Clinical Imaging',
    vendor: 'Orthanc / DCMTK DICOM SCP',
    os: 'Linux Radiology Server',
    openPorts: [104, 4242, 8042],
    status: 'online',
    riskLevel: 'Medium',
    latencyMs: 0.8,
    lastSeen: 'Template Ready',
    cves: ['CVE-2023-33246'],
    description: 'Orthanc DICOM PACS Server handling CT/MRI modalities and C-STORE image archives.',
  },
  {
    id: 'preset-ehr-database',
    ip: '172.28.10.20',
    mac: '00:1A:C8:44:55:66',
    hostname: 'Core-EHR-PostgreSQL',
    deviceType: 'EHR Database',
    zone: 'Core Database / EHR',
    vendor: 'PostgreSQL Global Development Group',
    os: 'Red Hat Enterprise Linux 9 / Postgres 15',
    openPorts: [5432, 2575, 8080],
    status: 'online',
    riskLevel: 'Critical',
    latencyMs: 0.5,
    lastSeen: 'Template Ready',
    cves: [],
    description: 'Primary Electronic Health Record database running PostgreSQL with HL7 v2 MLLP receiver and FHIR REST API.',
  },
  {
    id: 'preset-infusion-pump',
    ip: '172.28.10.35',
    mac: '00:1A:C8:77:88:99',
    hostname: 'Alaris-Infusion-Pump-ICU-4',
    deviceType: 'Infusion Pump',
    zone: 'Medical IoT (IoMT)',
    vendor: 'CareFusion / BD Alaris',
    os: 'Embedded Medical RTOS v4.2',
    openPorts: [80, 502, 8080],
    status: 'online',
    riskLevel: 'High',
    latencyMs: 1.2,
    lastSeen: 'Template Ready',
    cves: ['CVE-2020-25165'],
    description: 'Smart bedside volumetric infusion pump with Modbus TCP flow sensors and IoMT telemetry endpoint.',
  },
  {
    id: 'preset-patient-monitor',
    ip: '172.28.10.42',
    mac: '00:1A:C8:AA:BB:CC',
    hostname: 'Philips-IntelliVue-Monitor',
    deviceType: 'Patient Monitor',
    zone: 'ICU & Nurse Stations',
    vendor: 'Philips Healthcare',
    os: 'IntelliVue Medical Firmware',
    openPorts: [1883, 8883],
    status: 'online',
    riskLevel: 'Low',
    latencyMs: 0.9,
    lastSeen: 'Template Ready',
    cves: [],
    description: 'Multi-parameter bedside vital signs monitor streaming real-time ECG, SpO2, and NIBP telemetry over MQTT.',
  },
  {
    id: 'preset-nurse-workstation',
    ip: '172.28.10.50',
    mac: '00:1A:C8:DD:EE:FF',
    hostname: 'Nurse-Station-Console-01',
    deviceType: 'Nurse Workstation',
    zone: 'ICU & Nurse Stations',
    vendor: 'Dell OptiPlex / Intel',
    os: 'Windows 11 Enterprise',
    openPorts: [135, 445, 3389, 3000],
    status: 'online',
    riskLevel: 'Medium',
    latencyMs: 0.4,
    lastSeen: 'Template Ready',
    cves: [],
    description: 'Clinical nurse console running Windows with SMB file shares, RDP access, and CME telemetry agent.',
  },
  {
    id: 'preset-gateway-router',
    ip: '172.28.10.1',
    mac: '00:1A:C8:00:11:22',
    hostname: 'Hospital-Perimeter-Router',
    deviceType: 'Gateway / Router',
    zone: 'Perimeter / DMZ',
    vendor: 'MikroTik / Cisco',
    os: 'RouterOS v7.12',
    openPorts: [53, 80, 443],
    status: 'online',
    riskLevel: 'Low',
    latencyMs: 0.3,
    lastSeen: 'Template Ready',
    cves: [],
    description: 'Perimeter L3 network gateway and NAT firewall routing hospital VLAN subnets.',
  },
];


