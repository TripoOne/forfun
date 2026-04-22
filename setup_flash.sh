#!/bin/bash

# CYBER-FLASH LAN TOOLSET // AUTOMATED LINUX SETUP
# Target: Ubuntu Live / Kali Linux (Debian-based)

set -e # Exit on error

echo ":: INITIALIZING CYBER-FLASH DEPLOYMENT..."

# 1. Update system & install dependencies
if command -v apt-get >/dev/null; then
    echo ":: DETECTED DEBIAN-BASED SYSTEM. UPDATING..."
    sudo apt-get update
    sudo apt-get install -y python3 python3-pip curl git iputils-ping traceroute
else
    echo ":: NON-DEBIAN SYSTEM DETECTED. PLEASE ENSURE PYTHON3 AND PIP ARE INSTALLED."
fi

# 2. Install uv (Faster than pip)
if ! command -v uv >/dev/null; then
    echo ":: INSTALLING UV PACKAGE MANAGER..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.cargo/env:$PATH"
    # Try sourcing if it exists
    [ -f "$HOME/.cargo/env" ] && source "$HOME/.cargo/env"
fi

# 3. Setup Project Environment
echo ":: CONFIGURING PROJECT ENVIRONMENT..."
cd "$(dirname "$0")"
uv sync

# 4. Create Auto-start Systemd Service (Optional but recommended)
if [ -d "/etc/systemd/system" ]; then
    echo ":: CONFIGURING AUTO-START PROTOCOL..."
    cat <<EOF | sudo tee /etc/systemd/system/cyberflash.service
[Unit]
Description=Cyber-Flash Network Toolset
After=network.target

[Service]
ExecStart=$(which sh) $(pwd)/start_app.sh
WorkingDirectory=$(pwd)
StandardOutput=inherit
StandardError=inherit
Restart=always
User=$(whoami)

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable cyberflash.service
fi

echo ":: DEPLOYMENT COMPLETE."
echo ":: ACCESS INTERFACE AT http://localhost:5000"
