"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SESION_EXPIRADA } from "@/lib/supabase/auth";
import { erroresDeZod } from "@/lib/validations/comun";
import {
  altaCuerpoTecnicoSchema,
  type AltaCuerpoTecnicoErrores,
  type AltaCuerpoTecnicoInput,
} from "@/lib/validations/cuerpo-tecnico";

export type AltaResult =
  { ok: true } | { ok: false; error: string; errores?: AltaCuerpoTecnicoErrores };

/** El primer usuario crea su cuerpo técnico, queda como entrenador y crea la temporada. */
export async function crearCuerpoTecnico(input: AltaCuerpoTecnicoInput): Promise<AltaResult> {
  const parsed = altaCuerpoTecnicoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisá los campos marcados", errores: erroresDeZod(parsed.error) };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return SESION_EXPIRADA;

  const { nombre, mi_nombre, club, etiqueta, fecha_inicio, fecha_fin } = parsed.data;
  const { error } = await supabase.rpc("crear_cuerpo_tecnico", {
    p_nombre: nombre,
    p_mi_nombre: mi_nombre,
    p_club: club,
    p_etiqueta: etiqueta,
    p_fecha_inicio: fecha_inicio,
    p_fecha_fin: fecha_fin,
  });
  if (error) {
    if (error.hint === "ya_es_miembro") return { ok: true };
    console.error("[crearCuerpoTecnico]", error.code, error.message);
    return { ok: false, error: "No se pudo crear el cuerpo técnico. Probá de nuevo." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
