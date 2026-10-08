import type { Tables } from "./database";

export const POSICIONES = ["POR", "DEF", "CEN", "DEL"] as const;

export type Posicion = (typeof POSICIONES)[number];

export const POSICION_LABEL: Record<Posicion, string> = {
  POR: "Porteros",
  DEF: "Defensas",
  CEN: "Centrocampistas",
  DEL: "Delanteros",
};

export const POSICION_NOMBRE: Record<Posicion, string> = {
  POR: "Portero",
  DEF: "Defensa",
  CEN: "Centrocampista",
  DEL: "Delantero",
};

/**
 * Fila de la tabla "jugadores" (cuelga de la temporada).
 * fecha_nac: ISO "YYYY-MM-DD". foto_ruta: ruta en el bucket "fotos-jugadores".
 */
export type Jugador = Tables<"jugadores">;

/** Datos necesarios para crear o editar un jugador (la temporada la pone el servidor). */
export type JugadorInput = Pick<
  Jugador,
  "nombre" | "fecha_nac" | "posicion" | "numero" | "foto_ruta"
>;

/** Cifras de uso del jugador (derivadas de alineaciones y eventos). */
export interface EstadisticasJugador {
  partidos: number;
  titular: number;
  /** Estimación: 90 minutos por partido como titular */
  minutos: number;
  goles: number;
}
