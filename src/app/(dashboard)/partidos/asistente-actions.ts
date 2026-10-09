"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Json } from "@/types/database";
import { getAccion, SESION_EXPIRADA } from "@/lib/supabase/auth";
import {
  CAMPOS_BORRADOR,
  type BorradorPlan,
  type CampoBorrador,
  type PuntoClave,
} from "@/lib/asistente-plan";

type Resultado = { ok: true } | { ok: false; error: string };

const idSchema = z.string().uuid();

function errorDeBD(error: PostgrestError, contexto: string): { ok: false; error: string } {
  console.error(`[asistente ${contexto}]`, error.code, error.message);
  return { ok: false, error: "No se pudo guardar. Probá de nuevo." };
}

function revalidar(partidoId: string) {
  revalidatePath(`/partidos/${partidoId}`);
}

/** Deja el pedido para que Claude (en la Mac) analice el partido y arme el borrador. */
export async function pedirAsistentePlan(partidoId: string): Promise<Resultado> {
  if (!idSchema.safeParse(partidoId).success) return { ok: false, error: "Datos no válidos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase
    .from("pedidos_sofascore")
    .insert({ partido_id: partidoId, tipo: "plan_asistente" });
  if (error) {
    if (error.code === "23505")
      return { ok: false, error: "Ya hay un pedido en curso para este partido." };
    return errorDeBD(error, "pedido");
  }
  revalidar(partidoId);
  return { ok: true };
}

/** Confirma o descarta un punto clave (null: vuelve a pendiente). */
export async function validarPunto(
  partidoId: string,
  puntoId: string,
  estado: "confirmado" | "descartado" | null,
): Promise<Resultado> {
  if (!idSchema.safeParse(partidoId).success || !/^[a-f0-9]{10}$/.test(puntoId)) {
    return { ok: false, error: "Datos no válidos" };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase } = accion;
  const { data } = await supabase
    .from("asistente_plan")
    .select("validaciones")
    .eq("partido_id", partidoId)
    .maybeSingle();
  if (!data) return { ok: false, error: "El análisis ya no existe." };
  const validaciones = { ...(data.validaciones as Record<string, string>) };
  if (estado) validaciones[puntoId] = estado;
  else delete validaciones[puntoId];
  const { error } = await supabase
    .from("asistente_plan")
    .update({ validaciones: validaciones as Json })
    .eq("partido_id", partidoId);
  if (error) return errorDeBD(error, "validar");
  revalidar(partidoId);
  return { ok: true };
}

/** Suma el título de un punto a las 3 claves del plan (y lo da por confirmado). */
export async function usarPuntoComoClave(partidoId: string, puntoId: string): Promise<Resultado> {
  if (!idSchema.safeParse(partidoId).success || !/^[a-f0-9]{10}$/.test(puntoId)) {
    return { ok: false, error: "Datos no válidos" };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase } = accion;
  const [{ data: asistente }, { data: plan }] = await Promise.all([
    supabase
      .from("asistente_plan")
      .select("puntos, validaciones")
      .eq("partido_id", partidoId)
      .maybeSingle(),
    supabase.from("planes_partido").select("claves").eq("partido_id", partidoId).maybeSingle(),
  ]);
  const punto = ((asistente?.puntos ?? []) as unknown as PuntoClave[]).find(
    (p) => p.id === puntoId,
  );
  if (!asistente || !punto) return { ok: false, error: "Ese punto ya no existe." };
  const claves = (plan?.claves ?? []).filter(Boolean);
  if (claves.includes(punto.titulo)) return { ok: true };
  if (claves.length >= 3) return { ok: false, error: "Ya hay 3 claves: borrá una primero." };
  const { error } = await supabase
    .from("planes_partido")
    .upsert(
      { partido_id: partidoId, claves: [...claves, punto.titulo.slice(0, 200)] },
      { onConflict: "partido_id" },
    );
  if (error) return errorDeBD(error, "clave");
  await supabase
    .from("asistente_plan")
    .update({
      validaciones: {
        ...(asistente.validaciones as Record<string, string>),
        [puntoId]: "confirmado",
      },
      aplicado_en: new Date().toISOString(),
    })
    .eq("partido_id", partidoId);
  revalidar(partidoId);
  return { ok: true };
}

const camposSchema = z
  .array(z.enum(CAMPOS_BORRADOR as unknown as [CampoBorrador, ...CampoBorrador[]]))
  .min(1)
  .max(CAMPOS_BORRADOR.length);

/**
 * Copia partes del borrador al plan. Con `reemplazar`, pisa lo que haya; si no,
 * solo completa lo que está vacío.
 */
export async function usarBorradorPlan(
  partidoId: string,
  campos: string[],
  reemplazar: boolean,
): Promise<Resultado> {
  const parsed = camposSchema.safeParse(campos);
  if (!idSchema.safeParse(partidoId).success || !parsed.success) {
    return { ok: false, error: "Datos no válidos" };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase } = accion;
  const [{ data: asistente }, { data: plan }] = await Promise.all([
    supabase.from("asistente_plan").select("borrador").eq("partido_id", partidoId).maybeSingle(),
    supabase.from("planes_partido").select("*").eq("partido_id", partidoId).maybeSingle(),
  ]);
  if (!asistente) return { ok: false, error: "Todavía no hay borrador." };
  const b = asistente.borrador as BorradorPlan;
  const cambios: Record<string, unknown> = {};
  for (const c of parsed.data) {
    if (c === "claves") {
      const actuales = (plan?.claves ?? []).filter(Boolean);
      if (b.claves?.length && (reemplazar || actuales.length === 0))
        cambios.claves = b.claves.slice(0, 3);
    } else if (c === "jugadores_clave") {
      const actuales = (plan?.jugadores_clave as unknown[] | undefined) ?? [];
      if (b.jugadores_clave?.length && (reemplazar || actuales.length === 0))
        cambios.jugadores_clave = b.jugadores_clave
          .slice(0, 6)
          .map((j) => ({ ...j, responsable: null }));
    } else if (b[c] && (reemplazar || !plan?.[c])) {
      cambios[c] = b[c];
    }
  }
  if (Object.keys(cambios).length === 0) {
    return { ok: false, error: "No había nada vacío para completar." };
  }
  const { error } = await supabase
    .from("planes_partido")
    .upsert({ partido_id: partidoId, ...cambios }, { onConflict: "partido_id" });
  if (error) return errorDeBD(error, "borrador");
  await supabase
    .from("asistente_plan")
    .update({ aplicado_en: new Date().toISOString() })
    .eq("partido_id", partidoId);
  revalidar(partidoId);
  return { ok: true };
}
