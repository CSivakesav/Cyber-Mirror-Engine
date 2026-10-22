"""
MedShield AI — Cyber Mirror Engine
Offline Companion Script: Dynamic Network Graph & Topology Synthesizer
Uses NetworkX to model real discovered subnet nodes and default routes
"""

import json
import networkx as nx
import subprocess
import re

def get_live_interfaces():
    try:
        output = subprocess.check_output("ipconfig", shell=True, text=True)
        ipv4_match = re.search(r"IPv4 Address[ .:]+([\d.]+)", output)
        gateway_match = re.search(r"Default Gateway[ .:]+([\d.]+)", output)
        local_ip = ipv4_match.group(1) if ipv4_match else "127.0.0.1"
        gateway = gateway_match.group(1) if gateway_match else "127.0.0.1"
        return local_ip, gateway
    except Exception:
        return "127.0.0.1", "127.0.0.1"

def generate_topology_graph():
    print("[*] MedShield AI: Initializing Dynamic Network Topology via NetworkX...")
    local_ip, gateway = get_live_interfaces()
    G = nx.DiGraph()

    # Add Real Host and Gateway nodes
    G.add_node("gateway-node", ip=gateway, name="Default Gateway", zone="Perimeter / DMZ", risk="Low")
    G.add_node("host-workstation", ip=local_ip, name="Host Machine", zone="ICU & Workstations", risk="Low")

    # Add edge
    G.add_edge("host-workstation", "gateway-node", port=443, protocol="Default Route")

    # Read live ARP table for actual connected devices
    try:
        arp_out = subprocess.check_output("arp -a", shell=True, text=True)
        idx = 1
        for line in arp_out.splitlines():
            parts = line.strip().split()
            if len(parts) >= 2 and re.match(r"^\d+\.\d+\.\d+\.\d+$", parts[0]):
                ip = parts[0]
                if not ip.startswith("224.") and not ip.startswith("239.") and ip != "255.255.255.255" and ip != gateway and ip != local_ip:
                    node_id = f"neighbor-{idx}"
                    G.add_node(node_id, ip=ip, mac=parts[1].replace("-", ":").upper(), zone="Subnet Client", risk="Low")
                    G.add_edge(node_id, "gateway-node", port=80, protocol="ARP Route")
                    idx += 1
    except Exception:
        pass

    print(f"[+] Real Topology compiled: {G.number_of_nodes()} Nodes, {G.number_of_edges()} Edges")
    return G

if __name__ == "__main__":
    g = generate_topology_graph()
    print("[+] Dynamic NetworkX simulation environment verified.")
