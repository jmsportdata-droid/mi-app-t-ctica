#!/usr/bin/env bash
# Deja el programa de Sofascore siempre prendido en esta Mac (arranca solo al iniciar sesión).
# Para sacarlo: worker/desinstalar.sh · Registro: ~/Library/Logs/gestion-total-sofascore.log
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
PY="$HOME/.claude/skills/informe-rival/.venv/bin/python"
PLIST="$HOME/Library/LaunchAgents/uy.gestiontotal.sofascore.plist"
LOG="$HOME/Library/Logs/gestion-total-sofascore.log"

[ -x "$PY" ] || { echo "Falta la skill informe-rival (no encontré $PY)" >&2; exit 1; }
[ -f "$RAIZ/.env.local" ] || { echo "Falta $RAIZ/.env.local" >&2; exit 1; }

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>uy.gestiontotal.sofascore</string>
  <key>ProgramArguments</key>
  <array>
    <string>$PY</string>
    <string>$RAIZ/worker/sofascore.py</string>
  </array>
  <key>WorkingDirectory</key><string>$RAIZ</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>30</integer>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)/uy.gestiontotal.sofascore" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Instalado. Registro en $LOG"
