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

/** Fila de la tabla "jugadores" tal y como la devuelve Supabase. */
export type Jugador = {
  id: string;
  nombre: string;
  /** Fecha ISO "YYYY-MM-DD" */
  fecha_nac: string;
  posicion: Posicion;
  numero: number | null;
  /** URL pública en el bucket "player-photos" */
  foto_url: string | null;
  created_at: string;
};

/** Datos necesarios para crear o editar un jugador. */
export type JugadorInput = Pick<
  Jugador,
  "nombre" | "fecha_nac" | "posicion" | "numero" | "foto_url"
>;
