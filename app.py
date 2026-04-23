import warnings
warnings.simplefilter("ignore")

import eventlet
eventlet.monkey_patch()

from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit
import network_utils
import time
import threading
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['SECRET_KEY'] = 'flash-lan-tool-secret'
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shared_vault')
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB limit

# Ensure vault exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# Store connected users
users = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/share/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)
    
    # Notify everyone via SocketIO
    socketio.emit('new_file', {
        'filename': filename,
        'size': os.path.getsize(file_path),
        'timestamp': time.strftime('%H:%M:%S')
    })
    
    return jsonify({"message": "File uploaded successfully", "filename": filename})

@app.route('/api/share/files')
def list_files():
    files = []
    for filename in os.listdir(app.config['UPLOAD_FOLDER']):
        path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if os.path.isfile(path):
            files.append({
                'filename': filename,
                'size': os.path.getsize(path),
                'timestamp': time.ctime(os.path.getmtime(path))
            })
    return jsonify(files)

@app.route('/api/share/download/<filename>')
def download_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/network/interfaces')
def get_interfaces():
    return jsonify(network_utils.get_network_interfaces())

@app.route('/api/network/ping', methods=['POST'])
def run_ping():
    data = request.json
    host = data.get('host', '8.8.8.8')
    result = network_utils.perform_ping(host)
    return jsonify(result)

@app.route('/api/network/scan-ports', methods=['POST'])
def run_port_scan():
    data = request.json
    host = data.get('host', '127.0.0.1')
    open_ports = network_utils.scan_ports(host)
    return jsonify({"host": host, "open_ports": open_ports})

@app.route('/api/network/scan-lan', methods=['POST'])
def run_lan_scan():
    data = request.json
    prefix = data.get('prefix')
    if not prefix:
        # Try to infer prefix from local IP
        local_ip = network_utils.get_local_ip()
        prefix = '.'.join(local_ip.split('.')[:-1])
    
    hosts = network_utils.scan_lan(prefix)
    # Enrich with MAC addresses and Vendor names
    enriched_hosts = []
    for ip in hosts:
        mac = network_utils.get_mac_address(ip)
        enriched_hosts.append({
            "ip": ip,
            "mac": mac,
            "vendor": network_utils.get_vendor_name(mac)
        })
    return jsonify({"prefix": prefix, "active_hosts": enriched_hosts})

@app.route('/api/network/qr')
def get_qr_code():
    import qrcode
    import io
    import base64
    
    local_ip = network_utils.get_local_ip()
    port = app.config.get('RUNNING_PORT', 5000)
    url = f"http://{local_ip}:{port}"
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    return jsonify({"url": url, "qr_image": img_str})

@app.route('/api/network/wake', methods=['POST'])
def run_wake():
    data = request.json
    mac = data.get('mac')
    if not mac:
        return jsonify({"error": "No MAC address provided"}), 400
    result = network_utils.send_wol_packet(mac)
    return jsonify(result)

@app.route('/api/network/dns-lookup', methods=['POST'])
def run_dns_lookup():
    data = request.json
    domain = data.get('domain')
    result = network_utils.dns_lookup(domain)
    return jsonify(result)

@app.route('/api/network/speed-test')
def run_speed_test():
    result = network_utils.measure_speed()
    return jsonify(result)

@app.route('/api/network/sys-diag/<command>')
def run_sys_diag(command):
    if command == 'ipconfig':
        output = network_utils.get_detailed_config()
    elif command == 'netstat':
        output = network_utils.get_netstat_info()
    elif command == 'arp':
        output = network_utils.get_arp_cache()
    elif command == 'route':
        output = network_utils.get_routing_table()
    elif command == 'wifi':
        output = network_utils.get_wifi_info()
    elif command == 'wifi_keys':
        output = network_utils.get_wifi_passwords()
    elif command == 'nbtstat':
        output = network_utils.get_nbtstat()
    elif command == 'hostname':
        output = network_utils.get_hostname_info()
    else:
        return jsonify({"error": "Invalid command"}), 400
    
    return jsonify({"command": command, "output": output})

@app.route('/api/network/custom-diag', methods=['POST'])
def run_custom_diag():
    data = request.json
    raw_cmd = data.get('command', '').strip()
    
    if not raw_cmd:
        return jsonify({"error": "Empty command"}), 400
        
    # Whitelist of allowed base commands
    whitelist = ['nslookup', 'nbtstat', 'netsh', 'ping', 'hostname', 'arp', 'net', 'ipconfig']
    base_cmd = raw_cmd.split()[0].lower()
    
    if base_cmd not in whitelist:
        return jsonify({"error": f"Command '{base_cmd}' is not in the authorized whitelist."}), 403
    
    output = network_utils.run_system_command(raw_cmd)
    return jsonify({"command": raw_cmd, "output": output})

@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")

@socketio.on('register')
def handle_register(data):
    username = data.get('username', 'Anonymous')
    users[request.sid] = {
        'username': username,
        'ip': request.remote_addr,
        'connected_at': time.time()
    }
    emit('user_list', list(users.values()), broadcast=True)
    emit('system_message', {'message': f"{username} joined the chat"}, broadcast=True)

@socketio.on('disconnect')
def handle_disconnect():
    if request.sid in users:
        username = users[request.sid]['username']
        del users[request.sid]
        emit('user_list', list(users.values()), broadcast=True)
        emit('system_message', {'message': f"{username} left the chat"}, broadcast=True)

@socketio.on('send_message')
def handle_message(data):
    user = users.get(request.sid, {'username': 'Anonymous'})
    message_data = {
        'username': user['username'],
        'message': data.get('message', ''),
        'timestamp': time.strftime('%H:%M:%S')
    }
    emit('receive_message', message_data, broadcast=True)

@socketio.on('start_traceroute')
def handle_traceroute(data):
    host = data.get('host', '8.8.8.8')
    def run_trace():
        for line in network_utils.perform_traceroute(host):
            socketio.emit('traceroute_update', {'line': line}, room=request.sid)
        socketio.emit('traceroute_complete', {'status': 'done'}, room=request.sid)
    
    eventlet.spawn(run_trace)

# Sentinel Mode (Security Trap)
sentinel_active = False
sentinel_logs = []

def sentinel_listener(port=9999):
    global sentinel_active
    import socket
    
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    
    try:
        server.bind(('0.0.0.0', port))
        server.listen(5)
        sentinel_active = True
        print(f" [SENTINEL] Security trap active on port {port}")
        
        while sentinel_active:
            client, addr = server.accept()
            ip = addr[0]
            log_entry = {
                'ip': ip,
                'timestamp': time.strftime('%H:%M:%S'),
                'event': 'PORT_PROBE_DETECTED'
            }
            sentinel_logs.append(log_entry)
            socketio.emit('sentinel_alert', log_entry)
            client.close()
    except Exception as e:
        print(f" [SENTINEL] Error: {e}")
        sentinel_active = False
    finally:
        server.close()

@app.route('/api/sentinel/status')
def get_sentinel_status():
    return jsonify({
        "active": sentinel_active,
        "port": 9999,
        "logs": sentinel_logs[-10:] # Last 10 logs
    })

if __name__ == '__main__':
    # Start Sentinel in background
    eventlet.spawn(sentinel_listener)
    
    # Get port from environment or default to 5000
    try:
        port = int(os.environ.get('PORT', 5000))
    except ValueError:
        port = 5000
    
    # Get local IP to show user where to connect
    local_ip = network_utils.get_local_ip()
    app.config['RUNNING_PORT'] = port
    
    print(f" * Flash LAN Toolset running on http://{local_ip}:{port}")
    print(f" * PORT {port} OPENED. AWAITING CONNECTIONS...")
    
    try:
        socketio.run(app, host='0.0.0.0', port=port, debug=False)
    except Exception as e:
        if "10048" in str(e) or "already in use" in str(e).lower():
            print(f" [!] Port {port} is busy. Please try running the script again or check for other instances.")
        else:
            raise e
