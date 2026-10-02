import { INFO_EVENTO, type EventoPartido } from "@/types/evento";

/** Escapa un valor para CSV (RFC 4180) y neutraliza fórmulas al abrir en Excel. */
function celdaCsv(valor: string | number | null): string {
  if (valor === null) return "";
  let texto = String(valor);
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return /[",;\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function eventosACsv(
  eventos: readonly EventoPartido[],
  nombreJugador: (id: string | null) => string | null,
): string {
  const cabecera = ["minuto", "tipo", "jugador", "descripcion", "x", "y"];
  const filas = eventos.map((e) => [
    e.minuto,
    INFO_EVENTO[e.tipo].label,
    nombreJugador(e.jugador_id),
    e.descripcion,
    e.x,
    e.y,
  ]);
  // BOM para que Excel detecte UTF-8 (tildes y ñ)
  return "﻿" + [cabecera, ...filas].map((f) => f.map(celdaCsv).join(",")).join("\r\n");
}

export function eventosAJson(
  eventos: readonly EventoPartido[],
  nombreJugador: (id: string | null) => string | null,
  meta: Record<string, unknown>,
): string {
  return JSON.stringify(
    {
      ...meta,
      exportado: new Date().toISOString(),
      eventos: eventos.map((e) => ({
        minuto: e.minuto,
        tipo: e.tipo,
        jugador: nombreJugador(e.jugador_id),
        jugador_id: e.jugador_id,
        descripcion: e.descripcion,
        x: e.x,
        y: e.y,
      })),
    },
    null,
    2,
  );
}

/** Descarga un archivo generado en el navegador. */
export function descargarArchivo(nombre: string, contenido: string, tipo: string): void {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

/** "Real Betis" + "2026-10-12" → "eventos-real-betis-2026-10-12" */
export function nombreArchivoSeguro(...partes: string[]): string {
  return partes
    .join("-")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
