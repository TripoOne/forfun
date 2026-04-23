import os
import subprocess
import platform
import socket
import psutil
import threading
from ping3 import ping as p3_ping

def get_local_ip():
    """Returns the local IP address of the machine."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def perform_ping(host):
    """Performs a ping and returns the response time or None."""
    try:
        delay = p3_ping(host, unit='ms', timeout=2)
        return {"host": host, "status": "Online" if delay else "Offline", "delay": round(delay, 2) if delay else None}
    except Exception as e:
        return {"host": host, "status": "Error", "message": str(e)}

def perform_traceroute(host):
    """Performs a traceroute command and yields the output lines."""
    param = '-n' if platform.system().lower() == 'windows' else '-n'
    command = ['tracert' if platform.system().lower() == 'windows' else 'traceroute', param, host]
    
    try:
        process = subprocess.Popen(
            command, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.STDOUT, 
            text=True, 
            encoding='cp437', 
            errors='replace'
        )
        for line in iter(process.stdout.readline, ''):
            yield line
        process.stdout.close()
        process.wait()
    except Exception as e:
        yield f"Error: {str(e)}"

def get_network_interfaces():
    """Returns a list of active network interfaces and their IPs."""
    interfaces = []
    stats = psutil.net_if_stats()
    addrs = psutil.net_if_addrs()
    
    for name, addr_list in addrs.items():
        if name in stats and stats[name].isup:
            for addr in addr_list:
                if addr.family == socket.AF_INET:
                    interfaces.append({
                        "name": name,
                        "ip": addr.address,
                        "netmask": addr.netmask
                    })
    return interfaces

def scan_ports(host, port_range=[21, 22, 23, 25, 53, 80, 110, 443, 3306, 3389, 5000, 8080]):
    """Scans common ports on a host."""
    open_ports = []
    for port in port_range:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(0.5)
                if s.connect_ex((host, port)) == 0:
                    open_ports.append(port)
        except Exception:
            continue
    return open_ports

def scan_lan(ip_prefix):
    """Simple ping sweep for LAN discovery."""
    active_hosts = []
    threads = []

    def ping_host(ip):
        if p3_ping(ip, timeout=0.5):
            active_hosts.append(ip)

    for i in range(1, 255):
        ip = f"{ip_prefix}.{i}"
        t = threading.Thread(target=ping_host, args=(ip,))
        threads.append(t)
        t.start()

    for t in threads:
        t.join()
        
    return active_hosts

def dns_lookup(domain):
    """Performs a DNS lookup for a domain."""
    try:
        data = socket.gethostbyname_ex(domain)
        return {"hostname": data[0], "aliases": data[1], "ips": data[2]}
    except Exception as e:
        return {"error": str(e)}

def measure_speed():
    """Measures download speed by downloading a small chunk from a CDN."""
    import time
    import urllib.request
    import ssl
    
    # Create unverified SSL context to avoid certificate issues in portable environments
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    # Fast CDNs for testing
    urls = [
        "https://speed.cloudflare.com/__down?bytes=5000000",
        "https://fast.com" # Fallback (headers only usually)
    ]
    
    start_time = time.time()
    for test_url in urls:
        try:
            req = urllib.request.Request(test_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=8, context=ctx) as response:
                _ = response.read()
            end_time = time.time()
            
            duration = end_time - start_time
            if duration <= 0: duration = 0.1
            mbps = (5 * 8) / duration # (5MB * 8 bits) / duration
            return {"mbps": round(mbps, 2), "duration": round(duration, 2)}
        except Exception as e:
            continue
            
    return {"error": "All speed test nodes unreachable. Check internet connection."}

def send_wol_packet(mac_address):
    """Sends a Wake-on-LAN magic packet to a MAC address."""
    import socket
    import struct

    # Clean up mac address
    mac_address = mac_address.replace(':', '').replace('-', '')
    if len(mac_address) != 12:
        return {"error": "Invalid MAC address format"}

    # Create magic packet: 6 bytes of FF followed by 16 repetitions of MAC
    data = bytes.fromhex('F' * 12 + mac_address * 16)
    
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
            s.sendto(data, ('255.255.255.255', 9))
        return {"status": "Magic packet transmitted"}
    except Exception as e:
        return {"error": str(e)}

def get_mac_address(ip):
    """Attempts to find the MAC address for a given IP via ARP cache."""
    import subprocess
    import re
    
    cmd = ['arp', '-a', ip]
    try:
        output = subprocess.check_output(
            cmd, 
            text=True, 
            stderr=subprocess.STDOUT, 
            encoding='cp437', 
            errors='replace'
        )
        # Regex for MAC address
        mac_match = re.search(r"([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})", output)
        if mac_match:
            return mac_match.group(0)
    except Exception:
        pass
    return "UNKNOWN"

def get_vendor_name(mac):
    """Resolves MAC prefix to manufacturer name using a common OUI list."""
    if mac == "UNKNOWN": return "GENERIC_NODE"
    
    # Common OUI Prefixes
    vendors = {
        "00:00:5E": "ICANN",
        "00:03:93": "Apple",
        "00:05:02": "Apple",
        "00:0C:29": "VMware",
        "00:15:5D": "Microsoft",
        "00:1A:11": "Google",
        "00:1C:42": "Parallels",
        "00:25:90": "Supermicro",
        "00:50:56": "VMware",
        "08:00:27": "VirtualBox",
        "28:D2:44": "Xiaomi",
        "3C:D9:2B": "Hewlett Packard",
        "40:8D:5C": "Apple",
        "44:65:0D": "Amazon",
        "50:65:F3": "Apple",
        "70:35:60": "Apple",
        "70:B3:D5": "IETF",
        "B8:27:EB": "Raspberry Pi",
        "DC:A6:32": "Raspberry Pi",
        "E4:5F:01": "Raspberry Pi",
        "FC:FB:FB": "Cisco",
    }
    
    prefix = mac[:8].upper()
    return vendors.get(prefix, "UNKNOWN_VENDOR")

def run_system_command(cmd):
    """Executes a system command and returns the output."""
    try:
        # Use cp437 for Windows terminal output and errors='replace' to prevent crashes
        output = subprocess.check_output(
            cmd, 
            shell=True, 
            text=True, 
            stderr=subprocess.STDOUT, 
            encoding='cp437', 
            errors='replace'
        )
        return output
    except Exception as e:
        return f"Error executing command: {str(e)}"

def get_detailed_config():
    """Returns detailed ipconfig /all output."""
    return run_system_command("ipconfig /all" if platform.system().lower() == "windows" else "ifconfig -a")

def get_netstat_info():
    """Returns active network connections."""
    return run_system_command("netstat -ano" if platform.system().lower() == "windows" else "netstat -tulnp")

def get_arp_cache():
    """Returns the full ARP table."""
    return run_system_command("arp -a")

def get_routing_table():
    """Returns the system routing table."""
    return run_system_command("route print" if platform.system().lower() == "windows" else "netstat -rn")

def get_wifi_info():
    """Returns WiFi interface details and saved profiles."""
    if platform.system().lower() == "windows":
        return run_system_command("netsh wlan show interfaces && netsh wlan show profiles")
    return "WiFi diagnostics only supported on Windows."

def get_nbtstat():
    """Returns NetBIOS statistics."""
    if platform.system().lower() == "windows":
        return run_system_command("nbtstat -n && nbtstat -c")
    return "Nbtstat only supported on Windows."

def get_hostname_info():
    """Returns system hostname and basic OS info."""
    return f"HOSTNAME: {socket.gethostname()}\nOS: {platform.system()} {platform.release()}\nARCH: {platform.machine()}"
