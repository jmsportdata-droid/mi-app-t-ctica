"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Json } from "@/types/database";
import { getAccion, SESION_EXPIRADA } from "@/lib/supabase/auth";
import { textoOpcionalSchema } from "@/lib/validations/comun";
import { CAMPOS_POST, type CampoPost, type InsightsPost } from "@/lib/post-partido";
import type { ResultadoAutoguardado } from "@/components/ui/AutoSaveField";

type Resultado = { ok: true } | { ok: false; error: string };

const idSchema = z.string().uuid();

function errorDeBD(error: PostgrestError, contexto: string): { ok: false; error: string } {
  console.error(`[post ${contexto}]`, error.code, error.message);
  return { ok: false, error: "No se pudo guardar. Probá de nuevo." };
}

function revalidar(partidoId: string) {
  revalidatePath(`/partidos/${partidoId}`);
}

/** Deja el pedido para que la Mac traiga las estadísticas del partido jugado. */
export async function pedirPostPartido(partidoId: string): Promise<Resultado> {
  if (!idSchema.safeParse(partidoId).success) return { ok: false, error: "Datos no válidos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase
    .from("pedidos_sofascore")
    .insert({ partido_id: partidoId, tipo: "post_partido" });
  if (error) {
    if (error.code === "23505")
      return { ok: false, error: "Ya hay un pedido en curso para este partido." };
    return errorDeBD(error, "pedido");
  }
  revalidar(partidoId);
  return { ok: true };
}

/** Guardado automático de las conclusiones del cuerpo técnico. */
export async function guardarCampoPost(
  partidoId: string,
  campo: string,
  valor: string,
): Promise<ResultadoAutoguardado> {
  if (!idSchema.safeParse(partidoId).success || !(campo in CAMPOS_POST)) {
    return { ok: false, error: "Campo no válido" };
  }
  const c = campo as CampoPost;
  const parsed = textoOpcionalSchema(3000, CAMPOS_POST[c]).safeParse(valor);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase
    .from("post_partido")
    .upsert({ partido_id: partidoId, [c]: parsed.data }, { onConflict: "partido_id" });
  if (error) return errorDeBD(error, c);
  revalidar(partidoId);
  return { ok: true, valor: parsed.data };
}

const CLAVES_PLAN = /^(objetivo|clave_[1-3]|ofensiva|defensiva|tda|tad|abp)$/;
const evaluacionSchema = z.object({
  cumplimiento: z.enum(["si", "parcial", "no"]).nullable(),
  nota: z.string().trim().max(500, "La nota puede tener hasta 500 caracteres"),
});

/** Cómo se cumplió una parte del plan (se guarda junto con el resto). */
export async function guardarPlanVsReal(
  partidoId: string,
  clave: string,
  evaluacion: z.input<typeof evaluacionSchema>,
): Promise<Resultado> {
  const parsed = evaluacionSchema.safeParse(evaluacion);
  if (!idSchema.safeParse(partidoId).success || !CLAVES_PLAN.test(clave)) {
    return { ok: false, error: "Datos no válidos" };
  }
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase } = accion;
  const { data, error: errorLeer } = await supabase
    .from("post_partido")
    .select("plan_vs_real")
    .eq("partido_id", partidoId)
    .maybeSingle();
  if (errorLeer) return errorDeBD(errorLeer, "leer plan");
  const actual = { ...((data?.plan_vs_real ?? {}) as Record<string, unknown>) };
  if (parsed.data.cumplimiento === null && !parsed.data.nota) delete actual[clave];
  else actual[clave] = parsed.data;
  const { error } = await supabase
    .from("post_partido")
    .upsert({ partido_id: partidoId, plan_vs_real: actual as Json }, { onConflict: "partido_id" });
  if (error) return errorDeBD(error, "plan");
  revalidar(partidoId);
  return { ok: true };
}

const lista = (x?: string[]) => (x?.length ? x.map((t) => `• ${t}`).join("\n") : null);

/**
 * Pasa el borrador de Claude a las conclusiones del cuerpo técnico, solo en lo
 * que está vacío: lo escrito a mano no se pisa.
 */
export async function usarBorradorClaude(partidoId: string): Promise<Resultado> {
  if (!idSchema.safeParse(partidoId).success) return { ok: false, error: "Datos no válidos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase } = accion;
  const [{ data: est }, { data: post }] = await Promise.all([
    supabase
      .from("estadisticas_partido")
      .select("insights")
      .eq("partido_id", partidoId)
      .maybeSingle(),
    supabase.from("post_partido").select("*").eq("partido_id", partidoId).maybeSingle(),
  ]);
  const ins = (est?.insights ?? {}) as InsightsPost;
  if (!ins.resumen && !ins.positivos?.length) {
    return { ok: false, error: "Todavía no hay borrador de Claude." };
  }
  const destacados = ins.destacados?.length
    ? "\n\nDestacados:\n" + ins.destacados.map((d) => `• ${d.jugador}: ${d.motivo}`).join("\n")
    : "";
  const borrador: Record<CampoPost, string | null> = {
    valoracion: ins.resumen ? (ins.resumen + destacados).slice(0, 3000) : null,
    positivos: lista(ins.positivos),
    a_mejorar: lista(ins.a_mejorar),
    para_la_semana: lista(ins.para_la_semana),
  };
  const cambios: Partial<Record<CampoPost, string>> = {};
  for (const c of Object.keys(CAMPOS_POST) as CampoPost[]) {
    if (!post?.[c] && borrador[c]) cambios[c] = borrador[c]!.slice(0, 3000);
  }
  // Plan vs realidad: lo que Claude evaluó, donde el cuerpo técnico no evaluó todavía
  const plan = { ...((post?.plan_vs_real ?? {}) as Record<string, unknown>) };
  for (const p of ins.plan_vs_real ?? []) {
    if (!CLAVES_PLAN.test(p.clave) || plan[p.clave]) continue;
    const cumplimiento = ["si", "parcial", "no"].includes(p.cumplimiento) ? p.cumplimiento : null;
    plan[p.clave] = { cumplimiento, nota: (p.evidencia ?? "").slice(0, 500) };
  }
  const { error } = await supabase
    .from("post_partido")
    .upsert(
      { partido_id: partidoId, ...cambios, plan_vs_real: plan as Json },
      { onConflict: "partido_id" },
    );
  if (error) return errorDeBD(error, "borrador");
  revalidar(partidoId);
  return { ok: true };
}
