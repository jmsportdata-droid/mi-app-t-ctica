import type { Enums, Tables } from "./database";

export const POSICIONES = ["POR", "DEF", "CEN", "DEL"] as const;

export type Posicion = (typeof POSICIONES)[number];

export const POSICION_LABEL: Record<Posicion, string> = {
  POR: "Arqueros",
  DEF: "Defensores",
  CEN: "Mediocampistas",
  DEL: "Delanteros",
};

export const POSICION_NOMBRE: Record<Posicion, string> = {
  POR: "Arquero",
  DEF: "Defensor",
  CEN: "Mediocampista",
  DEL: "Delantero",
};

/** Posiciones específicas, agrupadas por línea (códigos guardados en jugadores.posiciones). */
export const POSICIONES_ESPECIFICAS = [
  { codigo: "POR", label: "Arquero", linea: "POR" },
  { codigo: "LD", label: "Lateral derecho", linea: "DEF" },
  { codigo: "ZAG", label: "Zaguero", linea: "DEF" },
  { codigo: "LI", label: "Lateral izquierdo", linea: "DEF" },
  { codigo: "VC", label: "Volante central", linea: "CEN" },
  { codigo: "VI", label: "Volante interior", linea: "CEN" },
  { codigo: "VD", label: "Volante por derecha", linea: "CEN" },
  { codigo: "VZ", label: "Volante por izquierda", linea: "CEN" },
  { codigo: "ENG", label: "Enganche", linea: "CEN" },
  { codigo: "ED", label: "Extremo derecho", linea: "DEL" },
  { codigo: "EI", label: "Extremo izquierdo", linea: "DEL" },
  { codigo: "CD", label: "Centrodelantero", linea: "DEL" },
] as const satisfies readonly { codigo: string; label: string; linea: Posicion }[];

export type PosicionEspecifica = (typeof POSICIONES_ESPECIFICAS)[number]["codigo"];

export const POSICION_ESPECIFICA_LABEL = Object.fromEntries(
  POSICIONES_ESPECIFICAS.map((p) => [p.codigo, p.label]),
) as Record<PosicionEspecifica, string>;

export const MAX_POSICIONES = 4;

export type PieHabil = Enums<"pie_habil">;

export const PIES_HABILES = [
  { valor: "derecho", label: "Derecho" },
  { valor: "izquierdo", label: "Izquierdo" },
  { valor: "ambos", label: "Ambos" },
] as const satisfies readonly { valor: PieHabil; label: string }[];

export const PIE_LABEL = Object.fromEntries(PIES_HABILES.map((p) => [p.valor, p.label])) as Record<
  PieHabil,
  string
>;

/**
 * Fila de la tabla "jugadores" (cuelga de la temporada).
 * fecha_nac: ISO "YYYY-MM-DD" (opcional). foto_ruta: ruta en el bucket "fotos-jugadores".
 * ids_externos.api_football: id del jugador en API-Football si se importó.
 */
export type Jugador = Tables<"jugadores">;

/** Datos necesarios para crear o editar un jugador (la temporada la pone el servidor). */
export type JugadorInput = Pick<
  Jugador,
  | "nombre"
  | "fecha_nac"
  | "posicion"
  | "numero"
  | "foto_ruta"
  | "posiciones"
  | "pie_habil"
  | "altura_cm"
  | "nacionalidad"
  | "formado_en_club"
  | "fecha_debut"
  | "seleccion"
>;

/** Cifras de uso del jugador (derivadas de alineaciones y eventos). */
export interface EstadisticasJugador {
  partidos: number;
  titular: number;
  /** Estimación: 90 minutos por partido como titular */
  minutos: number;
  goles: number;
}
