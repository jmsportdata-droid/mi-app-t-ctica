import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tarea, TareaConVinculos } from "@/types/tarea";

const SELECT = "*, tareas_objetivos(principio_id), tareas_contenidos(contenido_id)";

type FilaConVinculos = Tarea & {
  tareas_objetivos: { principio_id: string }[];
  tareas_contenidos: { contenido_id: string }[];
};

function aplanar({
  tareas_objetivos,
  tareas_contenidos,
  ...tarea
}: FilaConVinculos): TareaConVinculos {
  return {
    ...tarea,
    objetivos: tareas_objetivos.map((o) => o.principio_id),
    contenidos: tareas_contenidos.map((c) => c.contenido_id),
  };
}

/** Todo el banco de tareas del cuerpo técnico (incluidas las archivadas), por nombre. */
export async function getTareas(cuerpoTecnicoId: string): Promise<TareaConVinculos[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tareas")
    .select(SELECT)
    .eq("cuerpo_tecnico_id", cuerpoTecnicoId)
    .order("nombre", { ascending: true });
  if (error) {
    console.error("[getTareas]", error.message);
    throw new Error("No se pudo cargar el banco de tareas");
  }
  return (data ?? []).map(aplanar);
}

/** Memoizado por petición. */
export const getTarea = cache(async (id: string): Promise<TareaConVinculos | null> => {
  const supabase = createClient();
  const { data, error } = await supabase.from("tareas").select(SELECT).eq("id", id).maybeSingle();
  if (error) {
    if (error.code === "22P02") return null;
    console.error("[getTarea]", error.message);
    throw new Error("No se pudo cargar la tarea");
  }
  return data ? aplanar(data) : null;
});

export interface FeedbackTarea {
  usos: number;
  funciono: number;
  regular: number;
  noFunciono: number;
  /** Los últimos comentarios del cierre (más reciente primero) */
  comentarios: { texto: string; valoracion: string | null; fecha: string }[];
}

/** Cuántas veces se usó cada tarea en sesiones y cómo la valoró el cuerpo técnico al cerrar. */
/** (Objeto y no Map: se pasa a componentes del navegador.) */
export async function getFeedbackTareas(
  cuerpoTecnicoId: string,
): Promise<Record<string, FeedbackTarea>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sesion_tareas")
    .select("tarea_id, valoracion, comentario, creado_en, tarea:tareas!inner(cuerpo_tecnico_id)")
    .eq("tarea.cuerpo_tecnico_id", cuerpoTecnicoId)
    .order("creado_en", { ascending: false });
  if (error) {
    console.error("[getFeedbackTareas]", error.message);
    throw new Error("No se pudo cargar el feedback de las tareas");
  }
  const mapa: Record<string, FeedbackTarea> = {};
  for (const f of data ?? []) {
    const x = mapa[f.tarea_id] ?? {
      usos: 0,
      funciono: 0,
      regular: 0,
      noFunciono: 0,
      comentarios: [],
    };
    x.usos += 1;
    if (f.valoracion === "funciono") x.funciono += 1;
    if (f.valoracion === "regular") x.regular += 1;
    if (f.valoracion === "no_funciono") x.noFunciono += 1;
    if (f.comentario && x.comentarios.length < 5)
      x.comentarios.push({
        texto: f.comentario,
        valoracion: f.valoracion,
        fecha: f.creado_en.slice(0, 10),
      });
    mapa[f.tarea_id] = x;
  }
  return mapa;
}
