import type { Posicion } from "./jugador";

/** Hueco en el campo. x/y en % (x: izquierda→derecha, y: portería rival arriba → la nuestra abajo). */
export interface SlotFormacion {
  label: string;
  linea: Posicion;
  x: number;
  y: number;
}

const POR: SlotFormacion = { label: "POR", linea: "POR", x: 50, y: 91 };
const DEFENSA_4: SlotFormacion[] = [
  { label: "LI", linea: "DEF", x: 14, y: 70 },
  { label: "DFC", linea: "DEF", x: 37, y: 75 },
  { label: "DFC", linea: "DEF", x: 63, y: 75 },
  { label: "LD", linea: "DEF", x: 86, y: 70 },
];

export const FORMACIONES = {
  "4-3-3": [
    POR,
    ...DEFENSA_4,
    { label: "MC", linea: "CEN", x: 28, y: 50 },
    { label: "MCD", linea: "CEN", x: 50, y: 56 },
    { label: "MC", linea: "CEN", x: 72, y: 50 },
    { label: "EI", linea: "DEL", x: 18, y: 25 },
    { label: "DC", linea: "DEL", x: 50, y: 19 },
    { label: "ED", linea: "DEL", x: 82, y: 25 },
  ],
  "4-4-2": [
    POR,
    ...DEFENSA_4,
    { label: "MI", linea: "CEN", x: 14, y: 46 },
    { label: "MC", linea: "CEN", x: 38, y: 51 },
    { label: "MC", linea: "CEN", x: 62, y: 51 },
    { label: "MD", linea: "CEN", x: 86, y: 46 },
    { label: "DC", linea: "DEL", x: 38, y: 22 },
    { label: "DC", linea: "DEL", x: 62, y: 22 },
  ],
  "4-2-3-1": [
    POR,
    ...DEFENSA_4,
    { label: "MCD", linea: "CEN", x: 38, y: 57 },
    { label: "MCD", linea: "CEN", x: 62, y: 57 },
    { label: "MPI", linea: "CEN", x: 18, y: 35 },
    { label: "MP", linea: "CEN", x: 50, y: 37 },
    { label: "MPD", linea: "CEN", x: 82, y: 35 },
    { label: "DC", linea: "DEL", x: 50, y: 17 },
  ],
  "5-3-2": [
    POR,
    { label: "CAI", linea: "DEF", x: 10, y: 62 },
    { label: "DFC", linea: "DEF", x: 30, y: 75 },
    { label: "DFC", linea: "DEF", x: 50, y: 77 },
    { label: "DFC", linea: "DEF", x: 70, y: 75 },
    { label: "CAD", linea: "DEF", x: 90, y: 62 },
    { label: "MC", linea: "CEN", x: 28, y: 47 },
    { label: "MC", linea: "CEN", x: 50, y: 51 },
    { label: "MC", linea: "CEN", x: 72, y: 47 },
    { label: "DC", linea: "DEL", x: 38, y: 22 },
    { label: "DC", linea: "DEL", x: 62, y: 22 },
  ],
} as const satisfies Record<string, readonly SlotFormacion[]>;

export type Formacion = keyof typeof FORMACIONES;
export const LISTA_FORMACIONES = Object.keys(FORMACIONES) as Formacion[];
export const TITULARES = 11;

/** Fila de la tabla "alineacion_partido". */
export type AlineacionPartido = {
  partido_id: string;
  formacion: Formacion;
  /** 11 posiciones en el orden de la formación; null = hueco vacío */
  titulares: (string | null)[];
  suplentes: string[];
  updated_at: string;
};

export type AlineacionInput = Pick<AlineacionPartido, "formacion" | "titulares" | "suplentes">;
