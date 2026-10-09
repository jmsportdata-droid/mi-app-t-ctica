#!/usr/bin/env bash
# Saca el programa de Sofascore de esta Mac.
set -euo pipefail
launchctl bootout "gui/$(id -u)/uy.gestiontotal.sofascore" 2>/dev/null || true
rm -f "$HOME/Library/LaunchAgents/uy.gestiontotal.sofascore.plist"
echo "Desinstalado."
