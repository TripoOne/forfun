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
    fetchVaultFiles();
    fetchSentinelStatus();
    initThemes();
    initTopology();
    initGlobe();
    
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
            const tabEl = document.getElementById(tabId);
            tabEl.classList.add('active');
            
            logSystem(`Navigating to module: ${tabId.toUpperCase()}`);

            // Handle Special Module Animations
            if (tabId === 'topology' && networkGraph) {
                networkGraph.active = true;
                networkGraph.resize();
                networkGraph.animate();
                if (networkGraph.nodes.length === 0) networkGraph.rescan();
            } else if (networkGraph) {
                networkGraph.active = false;
            }

            if (tabId === 'globe' && globeHUD) {
                globeHUD.active = true;
                globeHUD.resize();
                globeHUD.animate();
            } else if (globeHUD) {
                globeHUD.active = false;
            }
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
    document.getElementById('run-speed-test').addEventListener('click', runSpeedTest);

    // QR Connect
    document.getElementById('show-qr').addEventListener('click', showQR);
    document.getElementById('close-qr').addEventListener('click', () => {
        document.getElementById('qr-modal').style.display = 'none';
    });

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

    // Vault (Ghost Share)
    const uploadTrigger = document.getElementById('upload-trigger');
    const fileInput = document.getElementById('file-input');
    
    uploadTrigger.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            uploadFile(e.target.files[0]);
        }
    });

    // Drag and Drop
    const dropZone = document.getElementById('drop-zone');
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--primary)';
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = 'var(--border)';
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--border)';
        if (e.dataTransfer.files.length > 0) {
            uploadFile(e.dataTransfer.files[0]);
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
            let html = `<div style="font-weight: 800; color: var(--primary); margin-bottom: 0.5rem;">PEER_NODES_DISCOVERED:</div><div style="display: flex; flex-direction: column; gap: 0.5rem;">`;
            data.active_hosts.forEach(host => {
                html += `
                    <div style="font-size: 0.8rem; padding: 0.8rem; background: rgba(0,255,65,0.05); border: 1px solid var(--border); border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="color: var(--text-main); font-weight: bold;">${host.ip}</div>
                            <div style="font-size: 0.6rem; color: var(--text-dim);">${host.vendor} // MAC: ${host.mac}</div>
                        </div>
                        ${host.mac !== 'UNKNOWN' ? `<button onclick="wakeNode('${host.mac}')" style="padding: 2px 8px; font-size: 0.6rem; border-color: var(--secondary); color: var(--secondary);">WAKE</button>` : ''}
                    </div>
                `;
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

async function wakeNode(mac) {
    logSystem(`Transmitting WOL Magic Packet to: ${mac}`);
    try {
        const res = await fetch('/api/network/wake', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mac: mac })
        });
        const data = await res.json();
        if (data.status) {
            logSystem(`WOL_SIGNAL_TRANSMITTED: ${mac}`);
            alert(`WOL packet transmitted to ${mac}`);
        } else {
            logSystem(`ERROR: WOL failed: ${data.error}`);
        }
    } catch (err) {
        logSystem("ERROR: Wake-on-LAN module failure.");
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

// Vault (Ghost Share) Functions
async function fetchVaultFiles() {
    try {
        const res = await fetch('/api/share/files');
        const files = await res.json();
        renderVaultFiles(files);
    } catch (err) {
        logSystem("ERROR: Failed to retrieve vault inventory.");
    }
}

function renderVaultFiles(files) {
    const container = document.getElementById('vault-list');
    container.innerHTML = '';
    
    if (files.length === 0) {
        container.innerHTML = '<p style="color: var(--text-dim); text-align: center;">VAULT_EMPTY</p>';
        return;
    }

    files.forEach(file => {
        const el = document.createElement('div');
        el.className = 'section-box';
        el.style.display = 'flex';
        el.style.justifyContent = 'space-between';
        el.style.alignItems = 'center';
        el.style.padding = '10px 15px';
        
        const size = (file.size / 1024).toFixed(1) + ' KB';
        
        el.innerHTML = `
            <div>
                <div style="font-weight: bold; color: var(--text-main);">${file.filename}</div>
                <div style="font-size: 0.65rem; color: var(--text-dim);">${size} // ${file.timestamp}</div>
            </div>
            <a href="/api/share/download/${file.filename}" download class="nav-btn" style="padding: 5px 10px; font-size: 0.7rem; border-color: var(--primary); color: var(--primary); text-decoration: none;">DOWNLOAD</a>
        `;
        container.appendChild(el);
    });
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const progressContainer = document.getElementById('upload-progress');
    const progressBar = document.getElementById('progress-bar');
    
    progressContainer.style.display = 'block';
    logSystem(`Initiating transmission: ${file.name}`);

    try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/share/upload', true);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percent = (e.loaded / e.total) * 100;
                progressBar.style.width = percent + '%';
            }
        };

        xhr.onload = function() {
            if (xhr.status === 200) {
                logSystem(`Transmission complete: ${file.name}`);
                setTimeout(() => {
                    progressContainer.style.display = 'none';
                    progressBar.style.width = '0%';
                    fetchVaultFiles();
                }, 1000);
            } else {
                logSystem(`FATAL: Transmission failed for ${file.name}`);
            }
        };

        xhr.send(formData);
    } catch (err) {
        logSystem("ERROR: Network failure during upload.");
    }
}

socket.on('new_file', (data) => {
    logSystem(`NEW_OBJECT_DETECTED: ${data.filename}`);
    fetchVaultFiles();
});

// Sentinel Mode (Security Monitor)
async function fetchSentinelStatus() {
    try {
        const res = await fetch('/api/sentinel/status');
        const data = await res.json();
        
        if (data.active) {
            updateSentinelUI(true);
            const logContainer = document.getElementById('sentinel-logs');
            logContainer.innerHTML = '';
            data.logs.forEach(log => appendSentinelLog(log));
        }
    } catch (err) {
        logSystem("ERROR: Sentinel core unreachable.");
    }
}

function updateSentinelUI(active) {
    const led = document.getElementById('sentinel-led');
    const text = document.getElementById('sentinel-status-text');
    
    if (active) {
        led.style.background = 'var(--primary)';
        led.style.boxShadow = '0 0 8px var(--primary-glow)';
        text.textContent = 'SHIELD_ACTIVE';
        text.style.color = 'var(--primary)';
    } else {
        led.style.background = 'var(--text-dim)';
        led.style.boxShadow = 'none';
        text.textContent = 'SHIELD_OFFLINE';
        text.style.color = 'var(--text-dim)';
    }
}

function appendSentinelLog(log) {
    const logContainer = document.getElementById('sentinel-logs');
    const entry = document.createElement('p');
    entry.style.color = 'var(--danger)';
    entry.innerHTML = `[${log.timestamp}] <span style="font-weight:bold;">ALERT:</span> Connection from ${log.ip} rejected.`;
    logContainer.prepend(entry);
}

socket.on('sentinel_alert', (data) => {
    appendSentinelLog(data);
    logSystem(`SECURITY_ALERT: Unauthorized probe from ${data.ip}`);
    
    // Visual alert effect
    const led = document.getElementById('sentinel-led');
    led.style.background = 'var(--danger)';
    led.style.boxShadow = '0 0 15px var(--danger-glow)';
    
    setTimeout(() => {
        updateSentinelUI(true);
    }, 2000);
});

// Pulse Gauge (Speed Test) Functions
async function runSpeedTest() {
    const btn = document.getElementById('run-speed-test');
    const valueEl = document.getElementById('speed-value');
    const fill = document.getElementById('speed-gauge-fill');
    
    btn.disabled = true;
    btn.textContent = 'MEASURING_PULSE...';
    valueEl.textContent = '---';
    logSystem("Initiating network pulse diagnostics.");

    // Animate during test
    let angle = 0;
    const interval = setInterval(() => {
        angle = (angle + 10) % 283;
        fill.style.strokeDashoffset = 283 - angle;
    }, 50);

    try {
        const res = await fetch('/api/network/speed-test');
        const data = await res.json();
        
        clearInterval(interval);
        btn.disabled = false;
        btn.textContent = 'INITIATE_PULSE';

        if (data.error) {
            logSystem(`ERROR: Speed test failed: ${data.error}`);
            updateSpeedGauge(0);
        } else {
            logSystem(`Pulse diagnostics complete: ${data.mbps} Mbps`);
            updateSpeedGauge(data.mbps);
        }
    } catch (err) {
        clearInterval(interval);
        btn.disabled = false;
        btn.textContent = 'INITIATE_PULSE';
        logSystem("ERROR: Speed test module failed.");
    }
}

function updateSpeedGauge(mbps) {
    const valueEl = document.getElementById('speed-value');
    const fill = document.getElementById('speed-gauge-fill');
    
    // Scale: 0 to 100 Mbps (for visualization)
    const maxSpeed = 100;
    const percentage = Math.min(mbps / maxSpeed, 1);
    const offset = 283 - (283 * percentage);
    
    fill.style.strokeDashoffset = offset;
    
    // Animate number
    let current = 0;
    const step = mbps / 20;
    const interval = setInterval(() => {
        current += step;
        if (current >= mbps) {
            current = mbps;
            clearInterval(interval);
        }
        valueEl.textContent = current.toFixed(1);
    }, 30);
}

// Neon Core (Theme Engine) Functions
function initThemes() {
    const savedTheme = localStorage.getItem('cyber_theme') || 'matrix';
    applyTheme(savedTheme);
    
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.getAttribute('data-theme');
            applyTheme(theme);
            logSystem(`Visual override successful: ${theme.toUpperCase()}_PROTOCOL engaged.`);
        });
    });
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cyber_theme', theme);
    
    // Update active button UI
    document.querySelectorAll('.theme-btn').forEach(btn => {
        if (btn.getAttribute('data-theme') === theme) {
            btn.classList.add('active');
            btn.style.background = 'rgba(255,255,255,0.1)';
        } else {
            btn.classList.remove('active');
            btn.style.background = 'transparent';
        }
    });

    // Update Matrix background color if possible
    const canvas = document.getElementById('matrix-canvas');
    if (canvas) {
        // We can't easily change the drawn text color without more complex logic, 
        // but we can adjust opacity to match the theme.
        if (theme === 'ghost') canvas.style.opacity = '0.05';
        else canvas.style.opacity = '0.15';
    }
}

// QR Connect Functions
async function showQR() {
    logSystem("Generating access vector (QR)...");
    try {
        const res = await fetch('/api/network/qr');
        const data = await res.json();
        
        document.getElementById('qr-img').src = `data:image/png;base64,${data.qr_image}`;
        document.getElementById('qr-url').textContent = data.url;
        document.getElementById('qr-modal').style.display = 'flex';
        logSystem(`Access vector generated: ${data.url}`);
    } catch (err) {
        logSystem("ERROR: Signal generation failed.");
    }
}

// Void Graph (Topology) Functions
let networkGraph = null;

function initTopology() {
    const canvas = document.getElementById('topology-canvas');
    if (!canvas) return;
    
    networkGraph = new NetworkGraph(canvas);
    
    document.getElementById('refresh-topology').addEventListener('click', () => {
        networkGraph.rescan();
    });
}

class NetworkGraph {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.nodes = [];
        this.active = false;
        this.hoveredNode = null;
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
    }

    resize() {
        const box = this.canvas.parentElement;
        this.canvas.width = box.clientWidth;
        this.canvas.height = box.clientHeight;
    }

    async rescan() {
        logSystem("VOID_GRAPH: Mapping localized network topology...");
        document.getElementById('refresh-topology').disabled = true;
        
        try {
            const res = await fetch('/api/network/lan-scan');
            const data = await res.json();
            this.buildGraph(data.active_hosts);
            logSystem(`VOID_GRAPH: ${data.active_hosts.length} active nodes projected.`);
        } catch (err) {
            logSystem("ERROR: Topology scan failure.");
        }
        
        document.getElementById('refresh-topology').disabled = false;
    }

    buildGraph(hosts) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        this.nodes = [];
        
        // Add Gateway/Server node (Self)
        this.nodes.push({
            id: 'root',
            ip: '127.0.0.1 (CORE)',
            vendor: 'CYBER-FLASH',
            x: centerX,
            y: centerY,
            vx: 0, vy: 0,
            r: 12,
            color: 'var(--secondary)',
            isRoot: true
        });

        // Add detected hosts
        hosts.forEach((host, i) => {
            const angle = (i / hosts.length) * Math.PI * 2;
            const dist = 150 + Math.random() * 50;
            this.nodes.push({
                id: host.ip,
                ip: host.ip,
                vendor: host.vendor,
                mac: host.mac,
                x: centerX + Math.cos(angle) * dist,
                y: centerY + Math.sin(angle) * dist,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                r: 8,
                color: 'var(--primary)'
            });
        });

        document.getElementById('node-count-label').textContent = `NODES_DETECTED: ${this.nodes.length}`;
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.hoveredNode = null;
        for (const node of this.nodes) {
            const dist = Math.hypot(node.x - x, node.y - y);
            if (dist < node.r + 5) {
                this.hoveredNode = node;
                break;
            }
        }
        this.canvas.style.cursor = this.hoveredNode ? 'pointer' : 'crosshair';
    }

    handleClick(e) {
        if (this.hoveredNode) {
            const panel = document.getElementById('node-info-panel');
            const details = document.getElementById('node-details');
            
            panel.style.display = 'block';
            details.innerHTML = `
                <div style="margin-bottom: 5px;"><span style="color:var(--text-dim);">IP:</span> ${this.hoveredNode.ip}</div>
                <div style="margin-bottom: 5px;"><span style="color:var(--text-dim);">VENDOR:</span> ${this.hoveredNode.vendor}</div>
                ${this.hoveredNode.mac ? `<div><span style="color:var(--text-dim);">MAC:</span> ${this.hoveredNode.mac}</div>` : ''}
                ${!this.hoveredNode.isRoot ? `<button onclick="wakeNode('${this.hoveredNode.mac}')" style="margin-top: 10px; width: 100%; font-size: 0.6rem; padding: 4px;">WAKE_NODE</button>` : ''}
            `;
        } else {
            document.getElementById('node-info-panel').style.display = 'none';
        }
    }

    animate() {
        if (!this.active) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Physics and Connections
        const root = this.nodes.find(n => n.isRoot);
        
        this.nodes.forEach(node => {
            // Draw connection to root
            if (!node.isRoot && root) {
                this.ctx.beginPath();
                this.ctx.moveTo(root.x, root.y);
                this.ctx.lineTo(node.x, node.y);
                this.ctx.strokeStyle = 'rgba(0, 255, 65, 0.1)';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }

            // Simple Physics (Attraction to center)
            if (!node.isRoot) {
                const dx = (this.canvas.width / 2) - node.x;
                const dy = (this.canvas.height / 2) - node.y;
                node.vx += dx * 0.0001;
                node.vy += dy * 0.0001;
                
                // Repulsion from other nodes
                this.nodes.forEach(other => {
                    if (other === node) return;
                    const ddx = other.x - node.x;
                    const ddy = other.y - node.y;
                    const dist = Math.hypot(ddx, ddy);
                    if (dist < 100) {
                        node.vx -= (ddx / dist) * 0.05;
                        node.vy -= (ddy / dist) * 0.05;
                    }
                });

                node.vx *= 0.95; // Friction
                node.vy *= 0.95;
                node.x += node.vx;
                node.y += node.vy;
            }

            // Draw Node
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
            this.ctx.fillStyle = node === this.hoveredNode ? '#fff' : getComputedStyle(document.documentElement).getPropertyValue(node.color.replace('var(', '').replace(')', '')).trim();
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = this.ctx.fillStyle;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;

            // Draw IP label
            this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
            this.ctx.font = '10px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(node.ip, node.x, node.y + node.r + 15);
        });

        requestAnimationFrame(() => this.animate());
    }
}

// World Scan (Globe) Functions
let globeHUD = null;

function initGlobe() {
    const canvas = document.getElementById('globe-canvas');
    if (!canvas) return;
    
    globeHUD = new GlobeHUD(canvas);
    
    document.getElementById('run-geo-scan').addEventListener('click', runGeoScan);
}

// World Map Data (More dense dots for continents)
const WORLD_DOTS = [
    // North America
    {lat: 45, lon: -100}, {lat: 40, lon: -110}, {lat: 35, lon: -90}, {lat: 48, lon: -120}, {lat: 32, lon: -115}, {lat: 60, lon: -110}, {lat: 70, lon: -100}, {lat: 55, lon: -130}, {lat: 30, lon: -100},
    // South America
    {lat: -10, lon: -60}, {lat: -20, lon: -65}, {lat: -35, lon: -70}, {lat: 0, lon: -55}, {lat: -15, lon: -50}, {lat: -45, lon: -65},
    // Europe
    {lat: 50, lon: 10}, {lat: 45, lon: 0}, {lat: 55, lon: 20}, {lat: 60, lon: 10}, {lat: 40, lon: 15}, {lat: 52, lon: -2}, {lat: 65, lon: 20}, {lat: 45, lon: 30},
    // Africa
    {lat: 20, lon: 10}, {lat: 10, lon: 20}, {lat: 0, lon: 30}, {lat: -10, lon: 25}, {lat: -25, lon: 20}, {lat: 30, lon: 5}, {lat: 25, lon: 35}, {lat: 15, lon: 0}, {lat: -5, lon: 10},
    // Asia
    {lat: 35, lon: 100}, {lat: 40, lon: 120}, {lat: 25, lon: 110}, {lat: 50, lon: 100}, {lat: 60, lon: 90}, {lat: 15, lon: 105}, {lat: 30, lon: 80}, {lat: 25, lon: 60}, {lat: 35, lon: 45}, {lat: 65, lon: 110}, {lat: 55, lon: 130}, {lat: 20, lon: 80},
    // Australia
    {lat: -25, lon: 135}, {lat: -30, lon: 145}, {lat: -20, lon: 120}, {lat: -35, lon: 138}
];

const POPULAR_DNS = [
    {lat: 37.7, lon: -122.4, label: '8.8.8.8'},
    {lat: 51.5, lon: -0.1, label: '1.1.1.1'}
];

async function runGeoScan() {
    const target = document.getElementById('geo-target').value;
    const resultsDiv = document.getElementById('geo-results');
    
    if (!target) return;
    
    logSystem(`Initiating global vector scan: ${target}`);
    resultsDiv.textContent = "RESOLVING_GEO_COORDINATES...";
    
    try {
        const res = await fetch(`http://ip-api.com/json/${target}`);
        const data = await res.json();
        
        if (data.status === 'success') {
            logSystem(`Vector resolved: ${data.city}, ${data.country} [${data.lat}, ${data.lon}]`);
            resultsDiv.innerHTML = `
                CITY: ${data.city}<br>
                COUNTRY: ${data.country}<br>
                ISP: ${data.isp}<br>
                COORD: ${data.lat}, ${data.lon}
            `;
            globeHUD.addPoint(data.lat, data.lon, data.city);
        } else {
            resultsDiv.textContent = "ERROR: Vector resolution failed.";
        }
    } catch (err) {
        resultsDiv.textContent = "ERROR: Geo-engine timeout.";
    }
}

class GlobeHUD {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.points = [];
        this.active = false;
        this.rotationX = 0;
        this.rotationY = 0;
        this.dragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        this.radius = 200;
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.canvas.addEventListener('mousedown', (e) => {
            this.dragging = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        });
        window.addEventListener('mouseup', () => this.dragging = false);
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.dragging) {
                this.rotationY += (e.clientX - this.lastMouseX) * 0.01;
                this.rotationX += (e.clientY - this.lastMouseY) * 0.01;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
            }
        });

        // Load Defaults
        POPULAR_DNS.forEach(dns => this.addPoint(dns.lat, dns.lon, dns.label));
    }

    resize() {
        const box = this.canvas.parentElement;
        this.canvas.width = box.clientWidth;
        this.canvas.height = box.clientHeight;
        this.radius = Math.min(this.canvas.width, this.canvas.height) * 0.4;
    }

    addPoint(lat, lon, label) {
        this.points.push({ lat, lon, label });
        // Auto-rotate to face the new point
        this.rotationY = -lon * (Math.PI / 180) - Math.PI/2;
        this.rotationX = lat * (Math.PI / 180);
    }

    animate() {
        if (!this.active) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        if (!this.dragging) {
            this.rotationY += 0.005;
        }

        // Draw Wireframe Latitude/Longitude lines
        this.ctx.strokeStyle = 'rgba(0, 255, 65, 0.1)';
        this.ctx.lineWidth = 1;

        // Longitude lines
        for (let i = 0; i < 24; i++) {
            const lon = (i / 24) * Math.PI * 2;
            this.ctx.beginPath();
            for (let j = 0; j <= 20; j++) {
                const lat = (j / 20) * Math.PI - Math.PI / 2;
                const pos = this.project(lat, lon);
                if (j === 0) this.ctx.moveTo(centerX + pos.x, centerY + pos.y);
                else this.ctx.lineTo(centerX + pos.x, centerY + pos.y);
            }
            this.ctx.stroke();
        }

        // Latitude lines
        for (let i = 0; i <= 10; i++) {
            const lat = (i / 10) * Math.PI - Math.PI / 2;
            this.ctx.beginPath();
            for (let j = 0; j <= 40; j++) {
                const lon = (j / 40) * Math.PI * 2;
                const pos = this.project(lat, lon);
                if (j === 0) this.ctx.moveTo(centerX + pos.x, centerY + pos.y);
                else this.ctx.lineTo(centerX + pos.x, centerY + pos.y);
            }
            this.ctx.stroke();
        }

        // Draw Landmass Dots
        this.ctx.fillStyle = 'rgba(0, 255, 65, 0.2)';
        WORLD_DOTS.forEach(dot => {
            const pos = this.project(dot.lat * (Math.PI / 180), dot.lon * (Math.PI / 180));
            if (pos.z > 0) {
                this.ctx.beginPath();
                this.ctx.arc(centerX + pos.x, centerY + pos.y, 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });

        // Draw Geo Points
        this.points.forEach(p => {
            const latRad = p.lat * (Math.PI / 180);
            const lonRad = p.lon * (Math.PI / 180);
            const pos = this.project(latRad, lonRad);
            
            // Only draw if point is on the front side
            if (pos.z > 0) {
                this.ctx.beginPath();
                this.ctx.arc(centerX + pos.x, centerY + pos.y, 4, 0, Math.PI * 2);
                this.ctx.fillStyle = 'var(--secondary)';
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = 'var(--secondary)';
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
                
                this.ctx.fillStyle = '#fff';
                this.ctx.font = '10px monospace';
                this.ctx.fillText(p.label, centerX + pos.x + 10, centerY + pos.y);
            }
        });

        requestAnimationFrame(() => this.animate());
    }

    project(lat, lon) {
        // 3D rotation logic
        let x = this.radius * Math.cos(lat) * Math.cos(lon);
        let y = this.radius * Math.sin(lat);
        let z = this.radius * Math.cos(lat) * Math.sin(lon);

        // Rotation Y
        let nx = x * Math.cos(this.rotationY) - z * Math.sin(this.rotationY);
        let nz = x * Math.sin(this.rotationY) + z * Math.cos(this.rotationY);
        x = nx;
        z = nz;

        // Rotation X
        let ny = y * Math.cos(this.rotationX) - z * Math.sin(this.rotationX);
        nz = y * Math.sin(this.rotationX) + z * Math.cos(this.rotationX);
        y = ny;
        z = nz;

        return { x, y, z };
    }
}
