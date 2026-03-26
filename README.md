# ⚡ CYBER-FLASH LAN TOOLSET // v2.0

A portable, pocket-sized network utility suite with a "Cyber-Hacker" aesthetic. Designed to run from a bootable flash drive for on-the-go network diagnostics and secure LAN communication.

## 🚀 Features
- **Matrix-UI**: Real-time digital rain background with neon green/cyan HUD.
- **Diagnostics**: Ping, Traceroute, Port Scanner, LAN Sweep, DNS Lookup.
- **Secure Messenger**: Real-time SocketIO chat with persistent identity.
- **Live Logs**: Dedicated terminal window for system activity.
- **uv Managed**: Blazing fast environment setup and execution.

---

## 🛠️ Bootable Flash Drive Setup (Linux)

To use this toolset on a portable drive, follow these steps:

### 1. Create a Live Linux USB
- Download **Ubuntu Desktop** or **Kali Linux** ISO.
- Use **Rufus** (Windows) or **BalenaEtcher** (Cross-platform).
- **CRITICAL**: In Rufus, set a **Persistence partition size** (at least 2-4GB) to save your toolset and settings.

### 2. Prepare the Drive
- Boot into the Live Linux environment from your USB.
- Copy this `flash/` project folder into your home directory or onto the persistent partition.

### 3. Run Automated Setup
Open a terminal inside the project folder and run:
```bash
chmod +x setup_flash.sh start_app.sh
./setup_flash.sh
```
This script will:
- Install Python and networking system tools.
- Install the `uv` package manager.
- Create a `cyberflash.service` to auto-start the app on future boots.

### 4. Direct Execution
If you don't want to install it as a service, just run:
```bash
./start_app.sh
```
Access the UI at `http://localhost:5000`.

---

## 💻 Local Development (Windows/macOS)
If running locally for testing:
1. Install [uv](https://astral.sh/uv).
2. Run: `uv run python app.py`

## ⚖️ Disclaimer
This toolset is designed for **authorized network diagnostics and educational purposes only**. Always ensure you have permission before scanning or interacting with networks you do not own.
