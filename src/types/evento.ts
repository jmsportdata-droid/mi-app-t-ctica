import type { Tables } from "./database";

export const TIPOS_EVENTO = [
  { valor: "gol", label: "Gol", color: "#10b981" },
  { valor: "ocasion", label: "Ocasión", color: "#f59e0b" },
  { valor: "duelo", label: "Duelo", color: "#0ea5e9" },
  { valor: "nota", label: "Nota", color: "#64748b" },
] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number]["valor"];

export const INFO_EVENTO = Object.fromEntries(TIPOS_EVENTO.map((t) => [t.valor, t])) as Record<
  TipoEvento,
  (typeof TIPOS_EVENTO)[number]
>;

/** Fila de la tabla "eventos_partido". x/y: posición en el campo en % (0-100). */
export type EventoPartido = Tables<"eventos_partido">;

export type EventoInput = Pick<
  EventoPartido,
  "tipo" | "minuto" | "descripcion" | "jugador_id" | "x" | "y"
>;

export const MINUTO_MAX = 130;
