"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Json } from "@/types/database";
import { getAccion, SESION_EXPIRADA } from "@/lib/supabase/auth";

type Resultado = { ok: true } | { ok: false; error: string };

const idSchema = z.string().uuid();

/** Deja el pedido para que lo procese la Mac del analista. */
export async function pedirInformeSofascore(partidoId: string): Promise<Resultado> {
  if (!idSchema.safeParse(partidoId).success) return { ok: false, error: "Datos no válidos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase
    .from("pedidos_sofascore")
    .insert({ partido_id: partidoId });
  if (error) {
    if (error.code === "23505")
      return { ok: false, error: "Ya hay un pedido en curso para este partido." };
    console.error("[pedirInformeSofascore]", error.code, error.message);
    return { ok: false, error: "No se pudo hacer el pedido. Probá de nuevo." };
  }
  revalidatePath(`/partidos/${partidoId}`);
  return { ok: true };
}

/** Confirma, descarta (o vuelve a pendiente con null) un insight del informe. */
export async function validarInsight(
  partidoId: string,
  clave: string,
  estado: "confirmado" | "descartado" | null,
): Promise<Resultado> {
  if (!idSchema.safeParse(partidoId).success || !/^[a-z_]+\.\d{1,2}$/.test(clave)) {
    return { ok: false, error: "Datos no válidos" };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase } = accion;
  const { data } = await supabase
    .from("informes_rival_datos")
    .select("validaciones")
    .eq("partido_id", partidoId)
    .maybeSingle();
  if (!data) return { ok: false, error: "Ese informe ya no existe." };
  const validaciones = { ...(data.validaciones as Record<string, string>) };
  if (estado) validaciones[clave] = estado;
  else delete validaciones[clave];
  const { error } = await supabase
    .from("informes_rival_datos")
    .update({ validaciones: validaciones as Json })
    .eq("partido_id", partidoId);
  if (error) {
    console.error("[validarInsight]", error.code, error.message);
    return { ok: false, error: "No se pudo guardar. Probá de nuevo." };
  }
  revalidatePath(`/partidos/${partidoId}`);
  return { ok: true };
}
