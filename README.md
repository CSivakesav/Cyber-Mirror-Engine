# MedShield AI — Cyber Mirror Engine

> **AI-Powered Healthcare Cyber Defense & Real Live Simulation Framework**

MedShield AI is a state-of-the-art cybersecurity dashboard and digital twin engine built with **Next.js 14**, **React 18**, **Tailwind CSS**, and **TypeScript**. It executes **actual network tools (bundled Nmap binary, live socket probers, real Windows Event Logs)** and displays **100% real live data** from your host machine and local network subnet.

---

## ⚡ Quick Start (Install & Use Anywhere)

### Prerequisites
- **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **npm**: v9.0.0 or higher (comes with Node.js)
- *(Optional)* **Python**: v3.10+ (only required if running standalone companion scripts in `scripts/`)
- *(Optional)* **Nmap**: Pre-bundled for Windows in `bin/nmap-7.92/`. On Linux or macOS, install via your package manager (`sudo apt install nmap` or `brew install nmap`).

---

### 1. Clone the Repository
```bash
git clone https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
cd Cyber-Mirror-Engine
```

### 2. Install Dependencies
```bash
npm install
```

*(Optional Python companion environment)*:
```bash
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux / macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Launch the Application
```bash
npm run dev
```

Open your browser and navigate to:
**[http://localhost:3000](http://localhost:3000)**

---

## 🏗️ Production Build

To test or deploy a production bundle:
```bash
npm run build
npm start
```

---

## 🛠️ Engine Architecture & Live Capabilities

### 1. **Official Nmap 7.92 Engine**
- **Binary Location**: Bundled inside `bin/nmap-7.92/nmap.exe` (Windows) with automatic fallback to system `nmap` in `PATH` (Linux/macOS/BSD).
- **Execution Mode**: Standalone connect mode (`-Pn -sT`) with parallel port sweeps and ARP resolution.
- **Portability**: Auto-detects local network adapters, default gateway, and subnet mask.

### 2. **Real Live Backend API Endpoints**
- **`/api/network`**: Detects active network adapters, actual host IPv4 address, default gateway, physical MAC address, and live neighbor ARP entries.
- **`/api/scan`**: Invokes the real Nmap binary, streams actual console output line-by-line, and parses discovered devices (Gateway, host workstation, LAN endpoints) with actual open ports (`53, 80, 443, 8080`, `135, 445, 3000`).
- **`/api/simulate`**: Sends actual TCP socket connection probes, testing live ports in real time and measuring exact roundtrip latency in milliseconds.
- **`/api/logs`**: Queries real Windows System Event Logs via PowerShell (`Get-WinEvent`) and active network socket connections (`Get-NetTCPConnection`), normalized into Sysmon and Zeek schemas.
- **`/api/reset`**: Resets all presentation caches and session states.

---

## 🧹 "Erase All Data" Presentation Reset Feature

A dedicated **"Erase All Data"** button is built into the top navigation bar, scan configuration card, and user dropdown menu:

### What it does:
- **Discovered Hosts Table**: Cleared immediately (resets to 0 hosts).
- **Terminal Console**: Cleared and restored to clean initial prompt.
- **KPI Metrics**: Resets Total Discovered to 0, Duration to 0.00 s, Status to Idle.
- **Simulation Probes**: Restored to step 1 and idle state.
- **Toast Notification**: Displays confirmation banner: *"All session data erased. Environment is clean & ready for a fresh demo!"*
- **Backend Reset**: Calls `/api/reset` to ensure all cached demonstration records are wiped.

---

## 📁 Project Structure

```
Cyber-Mirror-Engine/
├── bin/
│   └── nmap-7.92/          # Bundled portable Nmap binary & dependencies (Windows)
├── design_reference/       # Design specifications & reference assets
├── scripts/
│   ├── live_scanner.py     # Standalone Python socket prober
│   └── offline_generator.py# Offline data generator script
├── src/
│   ├── app/
│   │   ├── api/            # Next.js API Routes (network, scan, simulate, logs, reset)
│   │   ├── layout.tsx      # Root application layout
│   │   └── page.tsx        # Main application dashboard
│   ├── components/
│   │   ├── layout/         # Header, Sidebar, Navigation
│   │   ├── modules/        # Network Discovery, Topology, Attack Simulation, Telemetry
│   │   └── ui/             # Reusable UI components & badges
│   └── types/              # TypeScript interfaces & types
├── .gitignore              # Git exclusions (node_modules, .next, .venv, etc.)
├── package.json            # Node.js dependencies & scripts
├── requirements.txt        # Python companion dependencies
├── tailwind.config.ts      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

---

## 📄 License
This project is licensed under the MIT License.
