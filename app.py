from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
import eventlet
import network_utils
import time
import threading

app = Flask(__name__)
app.config['SECRET_KEY'] = 'flash-lan-tool-secret'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# Store connected users
users = {}

@app.route('/')
def index():
    return render_template('index.html')

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
    return jsonify({"prefix": prefix, "active_hosts": hosts})

@app.route('/api/network/dns-lookup', methods=['POST'])
def run_dns_lookup():
    data = request.json
    domain = data.get('domain')
    result = network_utils.dns_lookup(domain)
    return jsonify(result)

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

if __name__ == '__main__':
    # Get local IP to show user where to connect
    local_ip = network_utils.get_local_ip()
    print(f" * Flash LAN Toolset running on http://{local_ip}:5000")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
