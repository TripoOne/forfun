#!/bin/bash

# CYBER-FLASH LAN TOOLSET // AUTOMATED LINUX SETUP
# Target: Ubuntu Live / Kali Linux (Debian-based)

echo ":: INITIALIZING CYBER-FLASH DEPLOYMENT..."

# 1. Update system & install dependencies
sudo apt-get update
sudo apt-get install -y python3 python3-pip curl git iputils-ping traceroute

# 2. Install uv (Faster than pip)
echo ":: INSTALLING UV PACKAGE MANAGER..."
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.cargo/env

# 3. Setup Project Environment
echo ":: CONFIGURING PROJECT ENVIRONMENT..."
cd "$(dirname "$0")"
uv sync

# 4. Create Auto-start Systemd Service (Optional but recommended)
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

echo ":: DEPLOYMENT COMPLETE."
echo ":: ACCESS INTERFACE AT http://localhost:5000"
