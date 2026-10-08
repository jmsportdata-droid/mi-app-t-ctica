#!/usr/bin/env bash
# Ejecuta supabase/tests/permisos.sql contra la base remota.
# El archivo corre dentro de una transacción que termina en ROLLBACK: no deja datos.
# Imprime "OK: ..." si todas las reglas se cumplen, o el motivo de la primera falla.
#
# Requiere SUPABASE_ACCESS_TOKEN en .env.local y el proyecto vinculado (npx supabase link).
set -euo pipefail
cd "$(dirname "$0")/.."

archivo="supabase/tests/permisos.sql"
token="$(grep -E '^SUPABASE_ACCESS_TOKEN=' .env.local | head -1 | cut -d= -f2- | tr -d "\"' \r")"
ref="$(cat supabase/.temp/project-ref 2>/dev/null || true)"

[ -n "$token" ] || { echo "Falta SUPABASE_ACCESS_TOKEN en .env.local" >&2; exit 1; }
[ -n "$ref" ] || { echo "Proyecto sin vincular: corré npx supabase link" >&2; exit 1; }

# Salvaguarda: la prueba tiene que abrir una transacción y deshacerla al final.
primera="$(grep -vE '^\s*(--|$)' "$archivo" | head -1)"
ultima="$(grep -vE '^\s*(--|$)' "$archivo" | tail -1)"
if [ "$primera" != "begin;" ] || [ "$ultima" != "rollback;" ]; then
  echo "$archivo tiene que empezar con 'begin;' y terminar con 'rollback;'" >&2
  exit 1
fi

python3 -c 'import json, sys; print(json.dumps({"query": open(sys.argv[1]).read()}))' "$archivo" |
  curl -sS -X POST "https://api.supabase.com/v1/projects/$ref/database/query" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -d @-
echo
