export const GRUPOS_ATRIBUTOS = [
  {
    clave: "con_balon",
    titulo: "Con balón",
    color: "#10b981",
    atributos: [
      { campo: "pase_corto", label: "Pase corto" },
      { campo: "regate", label: "Regate" },
      { campo: "control", label: "Control" },
      { campo: "vision", label: "Visión" },
      { campo: "disparo", label: "Disparo" },
    ],
  },
  {
    clave: "sin_balon",
    titulo: "Sin balón",
    color: "#0ea5e9",
    atributos: [
      { campo: "presion", label: "Presión" },
      { campo: "anticipacion", label: "Anticipación" },
      { campo: "marcaje", label: "Marcaje" },
      { campo: "posicionamiento", label: "Posicionamiento" },
      { campo: "recuperacion", label: "Recuperación" },
    ],
  },
  {
    clave: "condicion",
    titulo: "Condición",
    color: "#f59e0b",
    atributos: [
      { campo: "velocidad", label: "Velocidad" },
      { campo: "resistencia", label: "Resistencia" },
      { campo: "fuerza", label: "Fuerza" },
      { campo: "salto", label: "Salto" },
      { campo: "agilidad", label: "Agilidad" },
    ],
  },
] as const;

export type GrupoAtributos = (typeof GRUPOS_ATRIBUTOS)[number];
export type Atributo = GrupoAtributos["atributos"][number]["campo"];

export const ATRIBUTOS: readonly Atributo[] = GRUPOS_ATRIBUTOS.flatMap((g) =>
  g.atributos.map((a) => a.campo),
);

export type ValoresAtributos = Record<Atributo, number>;

/** Fila de la tabla "jugador_atributos". */
export type JugadorAtributos = { jugador_id: string; updated_at: string } & ValoresAtributos;

export const VALOR_ATRIBUTO_DEFECTO = 50;

export function atributosPorDefecto(): ValoresAtributos {
  return Object.fromEntries(ATRIBUTOS.map((a) => [a, VALOR_ATRIBUTO_DEFECTO])) as ValoresAtributos;
}

/** Cifras de uso del jugador (derivadas de alineaciones y eventos). */
export interface EstadisticasJugador {
  partidos: number;
  titular: number;
  /** Estimación: 90 minutos por partido como titular */
  minutos: number;
  goles: number;
}
