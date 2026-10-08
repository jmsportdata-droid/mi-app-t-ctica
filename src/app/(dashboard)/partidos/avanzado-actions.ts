"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import { getClienteAutenticado, SESION_EXPIRADA } from "@/lib/supabase/auth";
import {
  SCHEMA_VALOR_ABP,
  alineacionSchema,
  campoAbpSchema,
  claveAbpSchema,
  eventoSchema,
  videoPartidoSchema,
} from "@/lib/validations/avanzado";
import type { ClaveAbp } from "@/types/abp";
import type { AlineacionInput } from "@/types/alineacion";
import type { EventoInput, EventoPartido } from "@/types/evento";
import type { GuardadoResult } from "./actions";

type Resultado = { ok: true } | { ok: false; error: string };

const idSchema = z.string().uuid();

function errorDeBD(error: PostgrestError, contexto: string): { ok: false; error: string } {
  if (error.code === "23503") {
    return { ok: false, error: "El partido o el jugador ya no existe. Recarga la página." };
  }
  console.error(`[partidos ${contexto}]`, error.code, error.message);
  return { ok: false, error: "No se pudo guardar. Inténtalo de nuevo." };
}

// ---------- Alineación -------------------------------------------

export async function guardarAlineacion(
  partidoId: string,
  input: AlineacionInput,
): Promise<Resultado> {
  const parsed = alineacionSchema.safeParse(input);
  if (!idSchema.safeParse(partidoId).success || !parsed.success) {
    return { ok: false, error: parsed.error?.issues[0]?.message ?? "Alineación no válida" };
  }

  const supabase = await getClienteAutenticado();
  if (!supabase) return SESION_EXPIRADA;

  const { error } = await supabase
    .from("alineacion_partido")
    .upsert(
      { partido_id: partidoId, ...parsed.data, updated_at: new Date().toISOString() },
      { onConflict: "partido_id" },
    );
  if (error) return errorDeBD(error, "alineacion");

  revalidatePath(`/partidos/${partidoId}`);
  return { ok: true };
}

// ---------- ABP --------------------------------------------------

export async function guardarCampoAbp(
  partidoId: string,
  clave: ClaveAbp,
  campo: string,
  valor: string,
): Promise<GuardadoResult> {
  const claveOk = claveAbpSchema.safeParse(clave);
  const campoOk = campoAbpSchema.safeParse(campo);
  if (!idSchema.safeParse(partidoId).success || !claveOk.success || !campoOk.success) {
    return { ok: false, error: "Campo no válido" };
  }
  const parsed = SCHEMA_VALOR_ABP[campoOk.data].safeParse(valor);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Valor no válido" };
  }

  const supabase = await getClienteAutenticado();
  if (!supabase) return SESION_EXPIRADA;

  const { error } = await supabase.from("abp_partido").upsert(
    {
      partido_id: partidoId,
      ...claveOk.data,
      [campoOk.data]: parsed.data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "partido_id,tipo,categoria,indice" },
  );
  if (error) return errorDeBD(error, `abp.${campoOk.data}`);

  revalidatePath(`/partidos/${partidoId}`);
  return { ok: true, valor: parsed.data };
}

// ---------- Vídeo y eventos --------------------------------------

export async function guardarVideoPartido(
  partidoId: string,
  valor: string,
): Promise<GuardadoResult> {
  if (!idSchema.safeParse(partidoId).success) return { ok: false, error: "Partido no válido" };
  const parsed = videoPartidoSchema.safeParse(valor);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "URL no válida" };
  }

  const supabase = await getClienteAutenticado();
  if (!supabase) return SESION_EXPIRADA;

  const { error } = await supabase
    .from("partidos")
    .update({ video_url: parsed.data })
    .eq("id", partidoId);
  if (error) return errorDeBD(error, "video");

  revalidatePath(`/partidos/${partidoId}`);
  return { ok: true, valor: parsed.data };
}

export type CrearEventoResult =
  { ok: true; evento: EventoPartido } | { ok: false; error: string; campo?: keyof EventoInput };

export async function crearEvento(
  partidoId: string,
  input: EventoInput,
): Promise<CrearEventoResult> {
  if (!idSchema.safeParse(partidoId).success) return { ok: false, error: "Partido no válido" };
  const parsed = eventoSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? "Evento no válido",
      campo: issue?.path[0] as keyof EventoInput | undefined,
    };
  }

  const supabase = await getClienteAutenticado();
  if (!supabase) return SESION_EXPIRADA;

  const { data, error } = await supabase
    .from("eventos_partido")
    .insert({ partido_id: partidoId, ...parsed.data })
    .select("*")
    .single();
  if (error) return errorDeBD(error, "evento");

  revalidatePath(`/partidos/${partidoId}`);
  return { ok: true, evento: data };
}

export async function eliminarEvento(partidoId: string, eventoId: string): Promise<Resultado> {
  if (!idSchema.safeParse(partidoId).success || !idSchema.safeParse(eventoId).success) {
    return { ok: false, error: "Evento no válido" };
  }

  const supabase = await getClienteAutenticado();
  if (!supabase) return SESION_EXPIRADA;

  const { error } = await supabase
    .from("eventos_partido")
    .delete()
    .eq("id", eventoId)
    .eq("partido_id", partidoId);
  if (error) return errorDeBD(error, "eliminar evento");

  revalidatePath(`/partidos/${partidoId}`);
  return { ok: true };
}
