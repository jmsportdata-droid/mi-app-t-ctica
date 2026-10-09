import type { Enums, Tables } from "./database";

export type TipoActividad = Enums<"tipo_actividad">;

/** Tipos de actividad con su color, título por defecto y si la ven los jugadores. */
export const TIPOS_ACTIVIDAD = [
  {
    valor: "entrenamiento",
    label: "Entrenamiento",
    color: "bg-emerald-50 text-emerald-900 ring-emerald-200",
    punto: "bg-emerald-500",
    visible: true,
  },
  {
    valor: "partido",
    label: "Partido",
    color: "bg-slate-900 text-white ring-slate-900",
    punto: "bg-slate-900",
    visible: true,
  },
  {
    valor: "gimnasio",
    label: "Gimnasio",
    color: "bg-sky-50 text-sky-900 ring-sky-200",
    punto: "bg-sky-500",
    visible: true,
  },
  {
    valor: "charla_tecnica",
    label: "Charla técnica",
    color: "bg-indigo-50 text-indigo-900 ring-indigo-200",
    punto: "bg-indigo-500",
    visible: true,
  },
  {
    valor: "reunion_cuerpo_tecnico",
    label: "Reunión del cuerpo técnico",
    color: "bg-slate-100 text-slate-700 ring-slate-300",
    punto: "bg-slate-400",
    visible: false,
  },
  {
    valor: "comida",
    label: "Comida",
    color: "bg-orange-50 text-orange-900 ring-orange-200",
    punto: "bg-orange-500",
    visible: true,
  },
  {
    valor: "viaje",
    label: "Viaje",
    color: "bg-violet-50 text-violet-900 ring-violet-200",
    punto: "bg-violet-500",
    visible: true,
  },
  {
    valor: "concentracion",
    label: "Concentración",
    color: "bg-rose-50 text-rose-900 ring-rose-200",
    punto: "bg-rose-500",
    visible: true,
  },
  {
    valor: "libre",
    label: "Día libre",
    color: "bg-amber-50 text-amber-900 ring-amber-200",
    punto: "bg-amber-400",
    visible: true,
  },
  {
    valor: "otro",
    label: "Otro",
    color: "bg-white text-slate-800 ring-slate-300",
    punto: "bg-slate-300",
    visible: true,
  },
] as const satisfies readonly {
  valor: TipoActividad;
  label: string;
  /** Clases de Tailwind de la tarjeta y del punto de color */
  color: string;
  punto: string;
  /** Valor por defecto de "visible para jugadores" */
  visible: boolean;
}[];

export const INFO_ACTIVIDAD = Object.fromEntries(
  TIPOS_ACTIVIDAD.map((t) => [t.valor, t]),
) as Record<TipoActividad, (typeof TIPOS_ACTIVIDAD)[number]>;

/** Tipos que se cargan a mano (los partidos se crean desde Partidos). */
export const TIPOS_CARGABLES = TIPOS_ACTIVIDAD.filter((t) => t.valor !== "partido");

/**
 * Fila de la tabla "actividades". fecha "YYYY-MM-DD" y horas "HH:MM:SS", en hora de Uruguay.
 * Las de tipo partido se sincronizan solas con su partido (partido_id).
 */
export type Actividad = Tables<"actividades">;

export type ActividadInput = Pick<
  Actividad,
  | "tipo"
  | "titulo"
  | "fecha"
  | "hora_inicio"
  | "hora_fin"
  | "hora_citacion"
  | "lugar"
  | "indicaciones"
  | "notas_internas"
  | "visible_jugadores"
>;

/** Lo que se puede editar de la actividad de un partido (el resto viene del partido). */
export type ActividadPartidoInput = Pick<
  Actividad,
  "hora_citacion" | "indicaciones" | "notas_internas" | "visible_jugadores"
>;
