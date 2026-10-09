"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import { getAccion, SESION_EXPIRADA } from "@/lib/supabase/auth";
import { borrarImagenes } from "@/lib/storage/server";
import { BUCKETS } from "@/lib/storage/config";
import { erroresDeZod } from "@/lib/validations/comun";
import { promptSchema, tareaSchema, type TareaErrores } from "@/lib/validations/tarea";
import type { TareaInput } from "@/types/tarea";

export type TareaActionResult =
  { ok: true; id: string } | { ok: false; error: string; errores?: TareaErrores };

type Resultado = { ok: true } | { ok: false; error: string };

const idSchema = z.string().uuid();

function errorDeBD(
  error: PostgrestError,
  contexto: string,
): { ok: false; error: string; errores?: TareaErrores } {
  if (error.code === "23505") {
    return {
      ok: false,
      error: "Revisá los campos marcados",
      errores: { nombre: "Ya hay una tarea con ese nombre" },
    };
  }
  if (error.code === "23503") {
    return { ok: false, error: "Se usa en sesiones: archivala en lugar de borrarla." };
  }
  console.error(`[tareas ${contexto}]`, error.code, error.message);
  return { ok: false, error: "No se pudo guardar. Probá de nuevo." };
}

function revalidar() {
  revalidatePath("/tareas", "layout");
}

/** Carga el banco base (solo si el cuerpo técnico todavía no tiene tareas). */
export async function cargarTareasBase(): Promise<
  { ok: true; cargadas: number } | { ok: false; error: string }
> {
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { data, error } = await accion.supabase.rpc("cargar_tareas_base");
  if (error) return errorDeBD(error, "cargar base");
  revalidar();
  revalidatePath("/modelo-de-juego");
  return { ok: true, cargadas: data };
}

/** Crea (id = null) o actualiza una tarea con sus objetivos y contenidos. */
export async function guardarTarea(
  id: string | null,
  input: TareaInput,
): Promise<TareaActionResult> {
  const parsed = tareaSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisá los campos marcados", errores: erroresDeZod(parsed.error) };
  }
  if (id && !idSchema.safeParse(id).success) return { ok: false, error: "Tarea no válida" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase } = accion;
  const { objetivos, contenidos, ...campos } = parsed.data;

  let tareaId: string;
  let graficoAnterior: string | null = null;
  if (id) {
    const { data: anterior } = await supabase
      .from("tareas")
      .select("grafico_ruta")
      .eq("id", id)
      .maybeSingle();
    graficoAnterior = anterior?.grafico_ruta ?? null;

    const { data, error } = await supabase
      .from("tareas")
      .update(campos)
      .eq("id", id)
      .select("id")
      .single();
    if (error) {
      if (error.code === "PGRST116") return { ok: false, error: "Esa tarea ya no existe." };
      return errorDeBD(error, "actualizar");
    }
    tareaId = data.id;
  } else {
    const { data, error } = await supabase.from("tareas").insert(campos).select("id").single();
    if (error) return errorDeBD(error, "crear");
    tareaId = data.id;
  }

  const { error: errorVinculos } = await supabase.rpc("reemplazar_vinculos_tarea", {
    p_tarea: tareaId,
    p_objetivos: objetivos,
    p_contenidos: contenidos,
  });
  if (errorVinculos) {
    // Una tarea nueva sin sus objetivos no sirve: se deshace
    if (!id) await supabase.from("tareas").delete().eq("id", tareaId);
    return errorDeBD(errorVinculos, "vínculos");
  }

  if (graficoAnterior && graficoAnterior !== campos.grafico_ruta) {
    await borrarImagenes(supabase, BUCKETS.graficosTareas, [graficoAnterior]);
  }

  revalidar();
  return { ok: true, id: tareaId };
}

export async function eliminarTarea(id: string): Promise<Resultado> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Tarea no válida" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;

  const { data, error } = await accion.supabase
    .from("tareas")
    .delete()
    .eq("id", id)
    .select("grafico_ruta")
    .maybeSingle();
  if (error) return errorDeBD(error, "eliminar");
  await borrarImagenes(accion.supabase, BUCKETS.graficosTareas, [data?.grafico_ruta]);

  revalidar();
  return { ok: true };
}

export async function alternarArchivada(id: string, archivada: boolean): Promise<Resultado> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Tarea no válida" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase.from("tareas").update({ archivada }).eq("id", id);
  if (error) return errorDeBD(error, "archivar");
  revalidar();
  return { ok: true };
}

/** Copia la tarea (sin el gráfico, que es de la original) con el nombre "… (copia)". */
export async function duplicarTarea(id: string): Promise<TareaActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Tarea no válida" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase } = accion;

  const { data: original, error } = await supabase
    .from("tareas")
    .select("*, tareas_objetivos(principio_id), tareas_contenidos(contenido_id)")
    .eq("id", id)
    .maybeSingle();
  if (error) return errorDeBD(error, "duplicar");
  if (!original) return { ok: false, error: "Esa tarea ya no existe." };

  const {
    id: _id,
    cuerpo_tecnico_id: _cuerpo,
    tiempo_total_seg: _total,
    creado_en: _creado,
    actualizado_en: _actualizado,
    grafico_ruta: _grafico,
    tareas_objetivos,
    tareas_contenidos,
    ...campos
  } = original;

  for (let n = 1; n <= 20; n++) {
    const sufijo = n === 1 ? " (copia)" : ` (copia ${n})`;
    const nombre = `${campos.nombre.slice(0, 120 - sufijo.length)}${sufijo}`;
    const { data, error: errorCopia } = await supabase
      .from("tareas")
      .insert({ ...campos, nombre, archivada: false })
      .select("id")
      .single();
    if (errorCopia?.code === "23505") continue;
    if (errorCopia) return errorDeBD(errorCopia, "duplicar");

    const { error: errorVinculos } = await supabase.rpc("reemplazar_vinculos_tarea", {
      p_tarea: data.id,
      p_objetivos: tareas_objetivos.map((o) => o.principio_id),
      p_contenidos: tareas_contenidos.map((c) => c.contenido_id),
    });
    if (errorVinculos) {
      await supabase.from("tareas").delete().eq("id", data.id);
      return errorDeBD(errorVinculos, "duplicar vínculos");
    }
    revalidar();
    return { ok: true, id: data.id };
  }
  return { ok: false, error: "Ya hay demasiadas copias de esta tarea." };
}

/** Prompt propio para el gráfico (null = volver al que arma la app). */
export async function guardarPrompt(id: string, prompt: string | null): Promise<Resultado> {
  const parsed = promptSchema.safeParse(prompt);
  if (!idSchema.safeParse(id).success || !parsed.success) {
    return {
      ok: false,
      error: parsed.success ? "Tarea no válida" : parsed.error.issues[0]!.message,
    };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase
    .from("tareas")
    .update({ prompt_imagen: parsed.data })
    .eq("id", id);
  if (error) return errorDeBD(error, "prompt");
  revalidar();
  return { ok: true };
}
