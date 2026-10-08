import type { Enums, Tables } from "./database";

export type EstadoDisponibilidad = Enums<"estado_disponibilidad">;

/** Estados en el orden en que se muestran, con sus colores. */
export const ESTADOS_DISPONIBILIDAD = [
  {
    valor: "disponible",
    label: "Disponible",
    punto: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    boton: "bg-emerald-600 text-white ring-emerald-600",
  },
  {
    valor: "limitado",
    label: "Limitado",
    punto: "bg-amber-500",
    chip: "bg-amber-50 text-amber-800 ring-amber-200",
    boton: "bg-amber-500 text-white ring-amber-500",
  },
  {
    valor: "baja",
    label: "Baja",
    punto: "bg-red-500",
    chip: "bg-red-50 text-red-800 ring-red-200",
    boton: "bg-red-600 text-white ring-red-600",
  },
  {
    valor: "sancionado",
    label: "Sancionado",
    punto: "bg-violet-500",
    chip: "bg-violet-50 text-violet-800 ring-violet-200",
    boton: "bg-violet-600 text-white ring-violet-600",
  },
] as const satisfies readonly {
  valor: EstadoDisponibilidad;
  label: string;
  /** Clases de Tailwind: punto de color, chip y botón seleccionado */
  punto: string;
  chip: string;
  boton: string;
}[];

export const INFO_ESTADO = Object.fromEntries(
  ESTADOS_DISPONIBILIDAD.map((e) => [e.valor, e]),
) as Record<EstadoDisponibilidad, (typeof ESTADOS_DISPONIBILIDAD)[number]>;

/** Fila de la tabla "disponibilidad": el estado de un jugador desde una fecha. */
export type RegistroDisponibilidad = Tables<"disponibilidad">;

/** Estado vigente de un jugador en un día (el último registro con fecha <= ese día). */
export interface EstadoDelDia {
  estado: EstadoDisponibilidad;
  fecha_regreso: string | null;
  /** Fecha desde la que rige este estado; null si nunca se cargó (disponible) */
  desde: string | null;
}

export const SIN_REGISTRO: EstadoDelDia = {
  estado: "disponible",
  fecha_regreso: null,
  desde: null,
};
