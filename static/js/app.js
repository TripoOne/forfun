const socket = io();
let currentUser = null;

// DOM Elements
const tabs = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');
const setupOverlay = document.getElementById('setup-overlay');
const startAppBtn = document.getElementById('start-app');
const usernameInput = document.getElementById('initial-username');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-msg-input');
const sendChatBtn = document.getElementById('send-chat');
const onlineUsersList = document.getElementById('online-users-list');
const consoleOutput = document.getElementById('console-output');

// App State
let myInterfaceData = [];

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initMatrix();
    fetchInterfaces();
    
    // Check for saved identity
    const savedName = localStorage.getItem('cyber_alias');
    if (savedName) {
        currentUser = savedName;
        socket.emit('register', { username: savedName });
        setupOverlay.style.display = 'none';
        document.getElementById('display-name').textContent = savedName;
        document.getElementById('username-setting').value = savedName;
        logSystem(`Identity restored: ${savedName}`);
    } else {
        logSystem("Awaiting identity authorization...");
    }
    
    // Tab switching
    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
            logSystem(`Navigating to module: ${tabId.toUpperCase()}`);
        });
    });

    // Initial Login
    startAppBtn.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        if (username) {
            currentUser = username;
            localStorage.setItem('cyber_alias', username);
            socket.emit('register', { username: username });
            setupOverlay.style.display = 'none';
            document.getElementById('display-name').textContent = username;
            logSystem(`Access granted for entity: ${username}`);
        }
    });

    // Chat
    sendChatBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Network Tools
    document.getElementById('run-ping').addEventListener('click', runPing);
    document.getElementById('run-trace').addEventListener('click', runTraceroute);
    document.getElementById('run-port-scan').addEventListener('click', runPortScan);
    document.getElementById('run-lan-scan').addEventListener('click', runLanScan);
    document.getElementById('run-dns-lookup').addEventListener('click', runDnsLookup);

    // Settings
    document.getElementById('save-settings').addEventListener('click', () => {
        const newName = document.getElementById('username-setting').value.trim();
        if (newName) {
            currentUser = newName;
            localStorage.setItem('cyber_alias', newName);
            socket.emit('register', { username: newName });
            document.getElementById('display-name').textContent = newName;
            logSystem(`System identity updated to: ${newName}`);
            alert('IDENTITY_UPDATED // SYSTEM_RESYNCED');
        }
    });
});

// Matrix Background Animation
function initMatrix() {
    const canvas = document.getElementById('matrix-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = "0101010101010101ABCDEFHIJKLMNPQRSTUVXYZ$%&*#".split("");
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = [];

    for (let x = 0; x < columns; x++) drops[x] = 1;

    function draw() {
        ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#0C0";
        ctx.font = fontSize + "px monospace";

        for (let i = 0; i < drops.length; i++) {
            const text = chars[Math.floor(Math.random() * chars.length)];
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);

            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975)
                drops[i] = 0;

            drops[i]++;
        }
    }

    setInterval(draw, 33);
}

function logSystem(msg) {
    const date = new Date().toLocaleTimeString();
    const line = `[${date}] ${msg}<br>`;
    consoleOutput.innerHTML = line + consoleOutput.innerHTML;
}

// Network Functions
async function fetchInterfaces() {
    try {
        const res = await fetch('/api/network/interfaces');
        const data = await res.json();
        myInterfaceData = data;
        
        const container = document.getElementById('interfaces-container');
        container.innerHTML = '';
        
        data.forEach(iface => {
            const el = document.createElement('div');
            el.className = 'section-box';
            el.style.borderLeftColor = 'var(--secondary)';
            el.style.padding = '10px';
            el.innerHTML = `<span style="color:var(--secondary)">${iface.name}</span> // ${iface.ip}`;
            container.appendChild(el);
        });

        if (data.length > 0) {
            document.getElementById('my-ip').textContent = data[0].ip;
            document.getElementById('local-ip-stat').textContent = data[0].ip;
            document.getElementById('interface-count').textContent = data.length;
        }
    } catch (err) {
        logSystem("FATAL: Failed to fetch interface maps.");
    }
}

async function runPing() {
    const target = document.getElementById('ping-target').value || '8.8.8.8';
    const resultsDiv = document.getElementById('ping-results');
    resultsDiv.innerHTML = '<p style="color: var(--text-muted)">ICMP_REQUEST sent...</p>';
    logSystem(`Pinging host: ${target}`);

    try {
        const res = await fetch('/api/network/ping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host: target })
        });
        const data = await res.json();
        
        resultsDiv.innerHTML = `
            <div style="padding: 1rem; border: 1px solid var(--border); background: rgba(0,0,0,0.5); border-left: 4px solid ${data.status === 'Online' ? 'var(--primary)' : 'var(--danger)'}">
                <div style="font-weight: 800; text-shadow: 0 0 5px ${data.status === 'Online' ? 'var(--primary-glow)' : 'var(--danger-glow)'}">${data.status === 'Online' ? 'REPLY_RECEIVED' : 'REQUEST_TIMEOUT'}</div>
                <div style="color: var(--text-dim); font-size: 0.8rem;">HOST: ${data.host} ${data.delay ? `// Latency: ${data.delay}ms` : ''}</div>
            </div>
        `;
    } catch (err) {
        resultsDiv.innerHTML = `<p style="color:var(--danger)">ERROR: ${err.message}</p>`;
    }
}

function runTraceroute() {
    const target = document.getElementById('trace-target').value || '8.8.8.8';
    const resultsDiv = document.getElementById('trace-results');
    resultsDiv.style.display = 'block';
    resultsDiv.textContent = 'INITIATING VOX_TRACE TO ' + target + '...\n';
    logSystem(`Tracing route to: ${target}`);
    
    socket.emit('start_traceroute', { host: target });
}

async function runPortScan() {
    const target = document.getElementById('port-scan-target').value || '127.0.0.1';
    const resultsDiv = document.getElementById('port-scan-results');
    resultsDiv.innerHTML = '<p style="color: var(--text-muted)">PROBING_PORTS...</p>';
    logSystem(`Scanning ports on: ${target}`);

    try {
        const res = await fetch('/api/network/scan-ports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host: target })
        });
        const data = await res.json();
        
        if (data.open_ports.length > 0) {
            resultsDiv.innerHTML = `
                <div style="padding: 1rem; border: 1px solid var(--border); border-left: 4px solid var(--secondary);">
                    <div style="font-weight: 800; color: var(--secondary)">OPEN_VULNERABILITIES FOUND:</div>
                    <div style="margin-top: 0.5rem; font-family: monospace;">PORT_LIST: [${data.open_ports.join('] [')}]</div>
                </div>
            `;
        } else {
            resultsDiv.innerHTML = `<p style="color: var(--text-dim)">No active listeners found on ${data.host}.</p>`;
        }
    } catch (err) {
        resultsDiv.innerHTML = `<p style="color: var(--danger)">ERROR: ${err.message}</p>`;
    }
}

async function runLanScan() {
    const resultsDiv = document.getElementById('lan-scan-results');
    resultsDiv.innerHTML = '<p style="color: var(--text-muted)">SCANNING_SUBNET.bin...</p>';
    logSystem("Initiating network-wide peer sweep.");
    const btn = document.getElementById('run-lan-scan');
    btn.disabled = true;

    try {
        const res = await fetch('/api/network/scan-lan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        const data = await res.json();
        
        btn.disabled = false;
        
        if (data.active_hosts.length > 0) {
            let html = `<div style="font-weight: 800; color: var(--primary); margin-bottom: 0.5rem;">PEER_NODES_DISCOVERED:</div><div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">`;
            data.active_hosts.forEach(host => {
                html += `<div style="font-size: 0.8rem; padding: 0.5rem; background: rgba(0,255,65,0.05); border: 1px solid var(--border); border-radius: 4px; text-align: center;">${host}</div>`;
            });
            html += '</div>';
            resultsDiv.innerHTML = html;
            logSystem(`${data.active_hosts.length} nodes added to local map.`);
        } else {
            resultsDiv.innerHTML = `<p style="color: var(--text-dim)">Silent network. No peers detected.</p>`;
        }
    } catch (err) {
        btn.disabled = false;
        resultsDiv.innerHTML = `<p style="color: var(--danger)">ERROR: ${err.message}</p>`;
    }
}

async function runDnsLookup() {
    const domain = document.getElementById('dns-target').value || 'google.com';
    const resultsDiv = document.getElementById('dns-results');
    resultsDiv.innerHTML = '<p style="color: var(--text-muted)">RESOLVING_ALIAS...</p>';
    logSystem(`DNS Query: ${domain}`);

    try {
        const res = await fetch('/api/network/dns-lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain: domain })
        });
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);

        resultsDiv.innerHTML = `
            <div style="padding: 1rem; border: 1px solid var(--border); border-left: 4px solid var(--secondary);">
                <div style="font-weight: 800; color: var(--secondary)">RESOLVE_COMPLETE:</div>
                <div style="margin-top: 0.5rem; font-family: monospace;">ADDR: ${data.ips.join(', ')}</div>
            </div>
        `;
    } catch (err) {
        resultsDiv.innerHTML = `<p style="color: var(--danger)">ERROR: ${err.message}</p>`;
    }
}

// Chat Functions
function sendMessage() {
    const msg = chatInput.value.trim();
    if (msg) {
        socket.emit('send_message', { message: msg });
        chatInput.value = '';
        logSystem("Outgoing message encrypted and transmitted.");
    }
}

// Socket Event Handlers
socket.on('receive_message', (data) => {
    const msgEl = document.createElement('div');
    msgEl.className = 'msg-item';
    msgEl.innerHTML = `
        <div class="msg-header">
            <span class="msg-user">${data.username}@lan</span>
            <span class="msg-time">[${data.timestamp}]</span>
        </div>
        <div class="msg-text">${data.message}</div>
    `;
    chatMessages.appendChild(msgEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

socket.on('system_message', (data) => {
    const sysEl = document.createElement('div');
    sysEl.style.textAlign = 'center';
    sysEl.style.color = 'var(--secondary)';
    sysEl.style.fontSize = '0.65rem';
    sysEl.style.margin = '1rem 0';
    sysEl.textContent = `[NET_BROADCAST] ${data.message}`;
    chatMessages.appendChild(sysEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    logSystem(`Broadcast: ${data.message}`);
});

socket.on('user_list', (users) => {
    onlineUsersList.innerHTML = '';
    document.getElementById('chat-user-count').textContent = users.length;
    users.forEach(user => {
        const userEl = document.createElement('div');
        userEl.className = 'section-box';
        userEl.style.padding = '10px';
        userEl.style.borderLeftColor = 'var(--secondary)';
        userEl.style.marginBottom = '10px';
        userEl.innerHTML = `
            <div style="font-weight: 800; color:var(--text-main);">${user.username}</div>
            <div style="font-size: 0.7rem; color: var(--text-dim)">NODE_IP: ${user.ip}</div>
        `;
        onlineUsersList.appendChild(userEl);
    });
});

socket.on('traceroute_update', (data) => {
    const resultsDiv = document.getElementById('trace-results');
    resultsDiv.textContent += data.line;
    resultsDiv.scrollTop = resultsDiv.scrollHeight;
});

socket.on('traceroute_complete', () => {
    const resultsDiv = document.getElementById('trace-results');
    resultsDiv.textContent += "\n[EOF] MODULE_TRACE_COMPLETE";
});
