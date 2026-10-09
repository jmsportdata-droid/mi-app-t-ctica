"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Json } from "@/types/database";
import { getAccion, SESION_EXPIRADA, SIN_TEMPORADA } from "@/lib/supabase/auth";

type Resultado = { ok: true } | { ok: false; error: string };

/** Pide a la Mac del analista los datos de Sofascore de nuestro equipo. */
export async function pedirPlantelSofascore(): Promise<Resultado> {
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  if (!accion.contexto.temporada) return SIN_TEMPORADA;
  const { error } = await accion.supabase
    .from("pedidos_sofascore")
    .insert({ temporada_id: accion.contexto.temporada.id, tipo: "plantel_propio" });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ya hay un pedido en curso." };
    console.error("[pedirPlantelSofascore]", error.code, error.message);
    return { ok: false, error: "No se pudo hacer el pedido. Probá de nuevo." };
  }
  revalidatePath("/plantilla");
  return { ok: true };
}

interface NoVinculado {
  sofascore_id: string;
  nombre: string;
  dorsal: number | null;
  linea: "POR" | "DEF" | "CEN" | "DEL";
  altura_cm: number | null;
  pie: "derecho" | "izquierdo" | "ambos" | null;
  nacionalidad: string | null;
  fecha_nac: string | null;
  estadisticas: Record<string, unknown>;
}

/**
 * Agrega al plantel los jugadores de Sofascore elegidos, con sus datos y
 * estadísticas. Si el dorsal ya lo tiene otro jugador, entra sin número.
 */
export async function agregarDesdeSofascore(
  sofascoreIds: string[],
): Promise<{ ok: true; agregados: number; sinNumero: number } | { ok: false; error: string }> {
  const parsed = z
    .array(z.string().regex(/^\d{1,20}$/))
    .min(1)
    .max(60)
    .safeParse(sofascoreIds);
  if (!parsed.success) return { ok: false, error: "Elegí al menos un jugador." };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase, contexto } = accion;
  if (!contexto.temporada) return SIN_TEMPORADA;
  const temporadaId = contexto.temporada.id;

  const [{ data: analisis }, { data: actuales }] = await Promise.all([
    supabase
      .from("analisis_propio")
      .select("no_vinculados")
      .eq("temporada_id", temporadaId)
      .maybeSingle(),
    supabase.from("jugadores").select("numero").eq("temporada_id", temporadaId),
  ]);
  if (!analisis) return { ok: false, error: "Primero actualizá desde Sofascore." };
  const lista = analisis.no_vinculados as unknown as NoVinculado[];
  const elegidos = lista.filter((j) => parsed.data.includes(j.sofascore_id));
  const ocupados = new Set((actuales ?? []).map((j) => j.numero).filter((n) => n !== null));

  let sinNumero = 0;
  const filas = elegidos.map((j) => {
    const dorsal = j.dorsal;
    const libre = dorsal !== null && !ocupados.has(dorsal);
    if (libre) ocupados.add(dorsal);
    else sinNumero += 1;
    return {
      temporada_id: temporadaId,
      nombre: j.nombre,
      numero: libre ? dorsal : null,
      posicion: j.linea,
      altura_cm: j.altura_cm,
      pie_habil: j.pie,
      nacionalidad: j.nacionalidad,
      fecha_nac: j.fecha_nac,
      ids_externos: { sofascore: j.sofascore_id } as Json,
      estadisticas_externas: j.estadisticas as Json,
    };
  });
  if (filas.length === 0) return { ok: false, error: "Esos jugadores ya no están en la lista." };

  const { error } = await supabase.from("jugadores").insert(filas);
  if (error) {
    console.error("[agregarDesdeSofascore]", error.code, error.message);
    return { ok: false, error: "No se pudieron agregar. Probá de nuevo." };
  }
  const restantes = lista.filter((j) => !parsed.data.includes(j.sofascore_id));
  await supabase
    .from("analisis_propio")
    .update({ no_vinculados: restantes as unknown as Json })
    .eq("temporada_id", temporadaId);

  revalidatePath("/plantilla", "layout");
  return { ok: true, agregados: filas.length, sinNumero };
}
