import type { Enums, Tables } from "./database";
import type { TareaConVinculos } from "./tarea";

export type Sesion = Tables<"sesiones">;
export type SesionTarea = Tables<"sesion_tareas">;
export type PlantillaSesion = Tables<"plantillas_sesion">;
export type EstadoAsistencia = Enums<"estado_asistencia">;
export type Asistencia = Tables<"asistencia_sesion">;

/** Tarea de la sesión con la ficha del banco (objetivos, tipo, descripción…). */
export interface TareaDeSesion extends SesionTarea {
  tarea: TareaConVinculos;
}

export interface SesionCompleta {
  sesion: Sesion | null;
  tareas: TareaDeSesion[];
  asistencia: Asistencia[];
}

/** Resumen para la tarjeta del microciclo. */
export interface ResumenSesion {
  tareas: number;
  segundos: number;
  cerrada: boolean;
}

export const ESTADOS_ASISTENCIA = [
  { valor: "completo", label: "Completo", boton: "bg-emerald-600 text-white ring-emerald-600" },
  { valor: "parcial", label: "Parcial", boton: "bg-amber-500 text-white ring-amber-500" },
  { valor: "diferenciado", label: "Diferenciado", boton: "bg-sky-600 text-white ring-sky-600" },
  { valor: "ausente", label: "Ausente", boton: "bg-slate-600 text-white ring-slate-600" },
] as const satisfies readonly { valor: EstadoAsistencia; label: string; boton: string }[];

export interface PlantillaConTareas extends PlantillaSesion {
  tareas: number;
}
