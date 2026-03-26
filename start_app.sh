#!/bin/bash

# CYBER-FLASH LAN TOOLSET // STARTUP WRAPPER
echo ":: DEPLOYING CYBER-FLASH CORE..."

# Ensure uv is in path
export PATH="$HOME/.astral/uv/bin:$PATH"

# Run the application
cd "$(dirname "$0")"
uv run python app.py
