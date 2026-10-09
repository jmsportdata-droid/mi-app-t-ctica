import type { Enums, Tables } from "./database";

export type TipoTarea = Enums<"tipo_tarea">;
export type ViaMetodologica = Enums<"via_metodologica">;
export type Competitividad = Enums<"competitividad_tarea">;
export type OrientacionFisica = Enums<"orientacion_fisica">;
export type EspacioTarea = Enums<"espacio_tarea">;

export type Tarea = Tables<"tareas">;

/** Tarea con los ids de sus objetivos (principios o subprincipios) y contenidos técnicos. */
export interface TareaConVinculos extends Tarea {
  objetivos: string[];
  contenidos: string[];
}

export const TIPOS_TAREA = [
  { valor: "entrada_en_calor", label: "Entrada en calor", color: "bg-slate-100 text-slate-700" },
  { valor: "pre_sesion", label: "Pre sesión", color: "bg-slate-100 text-slate-700" },
  { valor: "rondo", label: "Rondos", color: "bg-lime-100 text-lime-800" },
  {
    valor: "posesion",
    label: "Posesión / juego de posición",
    color: "bg-emerald-100 text-emerald-800",
  },
  { valor: "espacio_reducido", label: "Espacios reducidos", color: "bg-teal-100 text-teal-800" },
  { valor: "tactico", label: "Táctico", color: "bg-sky-100 text-sky-800" },
  { valor: "transiciones", label: "Transiciones", color: "bg-rose-100 text-rose-800" },
  {
    valor: "partido_condicionado",
    label: "Partido condicionado",
    color: "bg-indigo-100 text-indigo-800",
  },
  { valor: "finalizacion", label: "Finalización", color: "bg-amber-100 text-amber-800" },
  { valor: "pelota_parada", label: "Pelota parada", color: "bg-violet-100 text-violet-800" },
  { valor: "velocidad", label: "Velocidad", color: "bg-orange-100 text-orange-800" },
  { valor: "arqueros", label: "Arqueros", color: "bg-yellow-100 text-yellow-800" },
  { valor: "fuerza", label: "Fuerza / gimnasio", color: "bg-stone-200 text-stone-800" },
  { valor: "recuperacion", label: "Recuperación", color: "bg-cyan-100 text-cyan-800" },
] as const satisfies readonly { valor: TipoTarea; label: string; color: string }[];

export const VIAS = [
  { valor: "analitica", label: "Analítica" },
  { valor: "global", label: "Global" },
  { valor: "sistemica", label: "Sistémica" },
] as const satisfies readonly { valor: ViaMetodologica; label: string }[];

export const COMPETITIVIDADES = [
  { valor: "sin_oposicion", label: "Sin oposición" },
  { valor: "con_oposicion", label: "Con oposición" },
  { valor: "con_oposicion_y_puntuacion", label: "Con oposición y puntuación" },
] as const satisfies readonly { valor: Competitividad; label: string }[];

/** Orientación física de cada día de la semana tipo del manual. */
export const ORIENTACIONES = [
  { valor: "tension", label: "Tensión", dia: "MD-4" },
  { valor: "duracion", label: "Duración", dia: "MD-3" },
  { valor: "velocidad", label: "Velocidad", dia: "MD-2" },
  { valor: "activacion", label: "Activación", dia: "MD-1" },
  { valor: "recuperacion", label: "Recuperación", dia: "MD+1" },
] as const satisfies readonly { valor: OrientacionFisica; label: string; dia: string }[];

/** Espacios estándar. Las medidas aproximadas sirven para calcular m² por jugador. */
export const ESPACIOS = [
  { valor: "medidas", label: "Medidas (largo × ancho)", medidas: null },
  { valor: "cancha_entera", label: "Cancha entera", medidas: [105, 68] },
  { valor: "tres_cuartos", label: "¾ de cancha", medidas: [78, 68] },
  { valor: "media_cancha", label: "½ cancha", medidas: [52, 68] },
  { valor: "ultimo_tercio", label: "Último tercio", medidas: [35, 68] },
  { valor: "area", label: "Área", medidas: [40, 17] },
  { valor: "gimnasio", label: "Gimnasio", medidas: null },
] as const satisfies readonly {
  valor: EspacioTarea;
  label: string;
  medidas: readonly [number, number] | null;
}[];

function indice<T extends { valor: string }>(lista: readonly T[]) {
  return Object.fromEntries(lista.map((x) => [x.valor, x])) as Record<T["valor"], T>;
}

export const INFO_TIPO_TAREA = indice(TIPOS_TAREA);
export const INFO_VIA = indice(VIAS);
export const INFO_COMPETITIVIDAD = indice(COMPETITIVIDADES);
export const INFO_ORIENTACION = indice(ORIENTACIONES);
export const INFO_ESPACIO = indice(ESPACIOS);

export interface TareaInput {
  nombre: string;
  tipo: TipoTarea;
  via: ViaMetodologica | null;
  competitividad: Competitividad | null;
  orientacion_fisica: OrientacionFisica | null;
  formato: string | null;
  jugadores: number | null;
  series: number | null;
  duracion_seg: number | null;
  pausa_seg: number | null;
  espacio: EspacioTarea | null;
  largo_m: number | null;
  ancho_m: number | null;
  descripcion: string | null;
  grafico_ruta: string | null;
  video_url: string | null;
  objetivos: string[];
  contenidos: string[];
}
