"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import {
  getAccion,
  getClienteAutenticado as clienteAutenticado,
  SESION_EXPIRADA,
  SIN_TEMPORADA,
} from "@/lib/supabase/auth";
import { erroresDeZod } from "@/lib/validations/comun";
import {
  SCHEMA_CAMPO_INFORME,
  esCampoInforme,
  esCampoPlan,
  partidoSchema,
  schemaCampoPlan,
  tagsSchema,
  type PartidoErrores,
} from "@/lib/validations/partido";
import { ESTADOS_PARTIDO, type EstadoPartido, type PartidoInput } from "@/types/partido";

export type PartidoActionResult =
  { ok: true; id: string } | { ok: false; error: string; errores?: PartidoErrores };

/** Resultado de los guardados automáticos campo a campo. */
export type GuardadoResult = { ok: true; valor: string | null } | { ok: false; error: string };

const idSchema = z.string().uuid();

function errorDeBD(error: PostgrestError, contexto: string): { ok: false; error: string } {
  if (error.code === "23503") {
    return { ok: false, error: "El partido o el rival ya no existe. Recargá la página." };
  }
  console.error(`[partidos ${contexto}]`, error.code, error.message);
  return { ok: false, error: "No se pudo guardar. Probá de nuevo." };
}

function revalidarPartido(id: string) {
  // El partido también figura en el calendario
  revalidatePath("/calendario", "layout");
  revalidatePath("/partidos");
  revalidatePath(`/partidos/${id}`);
}

// ---------- CRUD de partido --------------------------------------

/** Crea (id = null) o actualiza los datos básicos de un partido. */
export async function guardarPartido(
  id: string | null,
  input: PartidoInput,
): Promise<PartidoActionResult> {
  const parsed = partidoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisá los campos marcados", errores: erroresDeZod(parsed.error) };
  }

  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase, contexto } = accion;

  let consulta;
  if (id) {
    consulta = supabase.from("partidos").update(parsed.data).eq("id", id);
  } else {
    if (!contexto.temporada) return SIN_TEMPORADA;
    consulta = supabase
      .from("partidos")
      .insert({ ...parsed.data, temporada_id: contexto.temporada.id });
  }

  const { data, error } = await consulta.select("id").single();
  if (error) {
    if (error.code === "23503" || error.code === "42501") {
      return {
        ok: false,
        error: "Revisá los campos marcados",
        errores: { rival_id: "Ese rival ya no existe" },
      };
    }
    return errorDeBD(error, "guardar");
  }

  revalidarPartido(data.id);
  return { ok: true, id: data.id };
}

export async function cambiarEstadoPartido(
  id: string,
  estado: EstadoPartido,
): Promise<GuardadoResult> {
  if (!idSchema.safeParse(id).success || !ESTADOS_PARTIDO.includes(estado)) {
    return { ok: false, error: "Datos no válidos" };
  }
  const supabase = await clienteAutenticado();
  if (!supabase) return SESION_EXPIRADA;

  const { error } = await supabase.from("partidos").update({ estado }).eq("id", id);
  if (error) return errorDeBD(error, "estado");

  revalidarPartido(id);
  return { ok: true, valor: estado };
}

export async function eliminarPartido(id: string): Promise<PartidoActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Partido no válido" };

  const supabase = await clienteAutenticado();
  if (!supabase) return SESION_EXPIRADA;

  // plan_partido e informe_rival se borran en cascada
  const { error } = await supabase.from("partidos").delete().eq("id", id);
  if (error) return errorDeBD(error, "eliminar");

  revalidatePath("/partidos");
  revalidatePath("/calendario", "layout");
  return { ok: true, id };
}

// ---------- Guardado automático: plan de partido ------------------

export async function guardarCampoPlan(
  partidoId: string,
  campo: string,
  valor: string,
): Promise<GuardadoResult> {
  if (!idSchema.safeParse(partidoId).success || !esCampoPlan(campo)) {
    return { ok: false, error: "Campo no válido" };
  }
  const parsed = schemaCampoPlan(campo).safeParse(valor);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Valor no válido" };
  }

  const supabase = await clienteAutenticado();
  if (!supabase) return SESION_EXPIRADA;

  // Upsert: la fila del plan se crea en el primer guardado
  const { error } = await supabase
    .from("plan_partido")
    .upsert({ partido_id: partidoId, [campo]: parsed.data }, { onConflict: "partido_id" });
  if (error) return errorDeBD(error, `plan.${campo}`);

  revalidatePath(`/partidos/${partidoId}`);
  return { ok: true, valor: parsed.data };
}

// ---------- Guardado automático: informe del rival ----------------

export async function guardarCampoInforme(
  partidoId: string,
  campo: string,
  valor: string,
): Promise<GuardadoResult> {
  if (!idSchema.safeParse(partidoId).success || !esCampoInforme(campo)) {
    return { ok: false, error: "Campo no válido" };
  }
  const parsed = SCHEMA_CAMPO_INFORME[campo].safeParse(valor);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Valor no válido" };
  }

  const supabase = await clienteAutenticado();
  if (!supabase) return SESION_EXPIRADA;

  const { error } = await supabase
    .from("informe_rival")
    .upsert({ partido_id: partidoId, [campo]: parsed.data }, { onConflict: "partido_id" });
  if (error) return errorDeBD(error, `informe.${campo}`);

  revalidatePath(`/partidos/${partidoId}`);
  return { ok: true, valor: parsed.data };
}

export async function guardarTagsInforme(
  partidoId: string,
  tags: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = tagsSchema.safeParse(tags);
  if (!idSchema.safeParse(partidoId).success || !parsed.success) {
    return { ok: false, error: "Etiquetas no válidas" };
  }

  const supabase = await clienteAutenticado();
  if (!supabase) return SESION_EXPIRADA;

  const { error } = await supabase
    .from("informe_rival")
    .upsert({ partido_id: partidoId, tags: parsed.data }, { onConflict: "partido_id" });
  if (error) return errorDeBD(error, "informe.tags");

  revalidatePath(`/partidos/${partidoId}`);
  return { ok: true };
}
