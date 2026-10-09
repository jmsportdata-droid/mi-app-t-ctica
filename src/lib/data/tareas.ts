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
