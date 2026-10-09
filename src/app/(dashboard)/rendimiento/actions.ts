"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAccion, SESION_EXPIRADA, SIN_TEMPORADA } from "@/lib/supabase/auth";
import { INDICADORES_SUGERIDOS, KPIS_INDICADOR, MOMENTOS_INDICE } from "@/lib/indice-modelo";
import type { MomentoJuego } from "@/types/modelo-juego";

type Resultado = { ok: true } | { ok: false; error: string };

async function pedir(tipo: "liga" | "importar_temporada"): Promise<Resultado> {
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  if (!accion.contexto.temporada) return SIN_TEMPORADA;
  const { error } = await accion.supabase
    .from("pedidos_sofascore")
    .insert({ temporada_id: accion.contexto.temporada.id, tipo });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ya hay un pedido en curso." };
    console.error(`[pedir ${tipo}]`, error.code, error.message);
    return { ok: false, error: "No se pudo hacer el pedido. Probá de nuevo." };
  }
  revalidatePath("/rendimiento");
  return { ok: true };
}

/** Pide a la Mac las estadísticas de temporada de toda la liga (percentiles). */
export async function pedirLiga(): Promise<Resultado> {
  return pedir("liga");
}

/** Pide a la Mac que traiga los partidos jugados de la temporada con su post partido. */
export async function pedirImportacion(): Promise<Resultado> {
  return pedir("importar_temporada");
}

const indicadorSchema = z.object({
  momento: z.enum(MOMENTOS_INDICE.map((m) => m.valor) as [MomentoJuego, ...MomentoJuego[]]),
  principio_id: z.string().uuid().nullable(),
  kpi: z.enum(KPIS_INDICADOR.map((k) => k.clave) as [string, ...string[]]),
  objetivo: z
    .number({ invalid_type_error: "El objetivo tiene que ser un número" })
    .min(0, "El objetivo no puede ser negativo")
    .max(99999, "Objetivo demasiado grande"),
});

export type IndicadorInput = z.input<typeof indicadorSchema>;

/** Crea (id null) o edita un indicador del modelo de juego. */
export async function guardarIndicador(
  id: string | null,
  input: IndicadorInput,
): Promise<Resultado> {
  const parsed = indicadorSchema.safeParse(input);
  if (id !== null && !z.string().uuid().safeParse(id).success) {
    return { ok: false, error: "Datos no válidos" };
  }
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá el indicador" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase } = accion;
  const { error } = id
    ? await supabase.from("indicadores_modelo").update(parsed.data).eq("id", id)
    : await supabase.from("indicadores_modelo").insert(parsed.data);
  if (error) {
    console.error("[guardarIndicador]", error.code, error.message);
    return { ok: false, error: "No se pudo guardar. Probá de nuevo." };
  }
  revalidatePath("/rendimiento");
  return { ok: true };
}

export async function eliminarIndicador(id: string): Promise<Resultado> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Datos no válidos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase.from("indicadores_modelo").delete().eq("id", id);
  if (error) {
    console.error("[eliminarIndicador]", error.code, error.message);
    return { ok: false, error: "No se pudo borrar. Probá de nuevo." };
  }
  revalidatePath("/rendimiento");
  return { ok: true };
}

/** Carga los indicadores sugeridos (solo si todavía no hay ninguno). */
export async function cargarIndicadoresSugeridos(): Promise<Resultado> {
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase } = accion;
  const { count } = await supabase
    .from("indicadores_modelo")
    .select("id", { count: "exact", head: true })
    .eq("cuerpo_tecnico_id", accion.contexto.cuerpoTecnico.id);
  if (count) return { ok: false, error: "Ya hay indicadores cargados." };
  const { error } = await supabase
    .from("indicadores_modelo")
    .insert(INDICADORES_SUGERIDOS.map((i, orden) => ({ ...i, orden })));
  if (error) {
    console.error("[cargarIndicadoresSugeridos]", error.code, error.message);
    return { ok: false, error: "No se pudieron cargar. Probá de nuevo." };
  }
  revalidatePath("/rendimiento");
  return { ok: true };
}
