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
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
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
