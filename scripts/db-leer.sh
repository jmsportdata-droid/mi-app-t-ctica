#!/usr/bin/env bash
# Consulta de SOLO LECTURA a la base remota de Supabase.
# Usa el endpoint read-only de la Management API, que ejecuta la consulta con el
# usuario supabase_read_only_user: la base rechaza cualquier escritura.
#
# Requiere SUPABASE_ACCESS_TOKEN en .env.local y el proyecto vinculado (npx supabase link).
# Uso: ./scripts/db-leer.sh "select table_name from information_schema.tables"
set -euo pipefail
cd "$(dirname "$0")/.."

consulta="${1:?Uso: ./scripts/db-leer.sh \"select ...\"}"
token="$(grep -E '^SUPABASE_ACCESS_TOKEN=' .env.local | head -1 | cut -d= -f2- | tr -d "\"' \r")"
ref="$(cat supabase/.temp/project-ref 2>/dev/null || true)"

[ -n "$token" ] || { echo "Falta SUPABASE_ACCESS_TOKEN en .env.local" >&2; exit 1; }
[ -n "$ref" ] || { echo "Proyecto sin vincular: corré npx supabase link" >&2; exit 1; }

python3 -c 'import json, sys; print(json.dumps({"query": sys.argv[1]}))' "$consulta" |
  curl -sS --fail-with-body -X POST \
    "https://api.supabase.com/v1/projects/$ref/database/query/read-only" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -d @-
echo
