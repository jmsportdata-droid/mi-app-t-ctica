"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import { COOKIE_TEMPORADA } from "@/lib/contexto";
import { borrarImagenes } from "@/lib/storage/server";
import { BUCKETS } from "@/lib/storage/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAccion, SESION_EXPIRADA, SOLO_ENTRENADOR } from "@/lib/supabase/auth";
import { erroresDeZod } from "@/lib/validations/comun";
import {
  miembroSchema,
  passwordSchema,
  rolSchema,
  temporadaSchema,
  type MiembroErrores,
  type TemporadaErrores,
} from "@/lib/validations/cuerpo-tecnico";
import type { MiembroInput, Rol, TemporadaInput } from "@/types/cuerpo-tecnico";

type Resultado = { ok: true } | { ok: false; error: string };

export type TemporadaActionResult =
  { ok: true; id: string } | { ok: false; error: string; errores?: TemporadaErrores };

export type MiembroActionResult =
  { ok: true } | { ok: false; error: string; errores?: MiembroErrores };

const idSchema = z.string().uuid();
const UN_ANIO = 60 * 60 * 24 * 365;

function errorDeBD(error: PostgrestError, contexto: string): { ok: false; error: string } {
  if (error.hint === "sin_entrenador") {
    return { ok: false, error: "El cuerpo técnico tiene que tener al menos un entrenador." };
  }
  if (error.code === "42501") return SOLO_ENTRENADOR;
  console.error(`[cuerpo técnico ${contexto}]`, error.code, error.message);
  return { ok: false, error: "No se pudo guardar. Probá de nuevo." };
}

function revalidarTodo() {
  // La temporada y el club se ven en todas las pantallas
  revalidatePath("/", "layout");
}

// ---------- Temporadas -------------------------------------------

/** Cambia la temporada que mira este usuario (no afecta a los demás). */
export async function elegirTemporada(id: string): Promise<Resultado> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Temporada no válida" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  if (!accion.contexto.temporadas.some((t) => t.id === id)) {
    return { ok: false, error: "Temporada no válida" };
  }

  cookies().set(COOKIE_TEMPORADA, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: UN_ANIO,
    path: "/",
  });
  revalidarTodo();
  return { ok: true };
}

/** Crea (id = null) o actualiza una temporada. Solo el entrenador. */
export async function guardarTemporada(
  id: string | null,
  input: TemporadaInput,
): Promise<TemporadaActionResult> {
  const parsed = temporadaSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisá los campos marcados", errores: erroresDeZod(parsed.error) };
  }

  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase, contexto } = accion;
  if (!contexto.esEntrenador) return SOLO_ENTRENADOR;

  const anterior = id ? contexto.temporadas.find((t) => t.id === id) : undefined;
  if (id && !anterior) return { ok: false, error: "Esa temporada ya no existe" };

  const consulta = id
    ? supabase.from("temporadas").update(parsed.data).eq("id", id)
    : supabase.from("temporadas").insert({
        ...parsed.data,
        cuerpo_tecnico_id: contexto.cuerpoTecnico.id,
        // La primera temporada del cuerpo técnico queda activa
        activa: contexto.temporadas.length === 0,
      });

  const { data, error } = await consulta.select("id").single();
  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "Revisá los campos marcados",
        errores: { etiqueta: "Ya existe esa temporada para ese club" },
      };
    }
    return errorDeBD(error, "temporada");
  }

  if (anterior?.escudo_ruta && anterior.escudo_ruta !== parsed.data.escudo_ruta) {
    await borrarImagenes(supabase, BUCKETS.escudos, [anterior.escudo_ruta]);
  }

  revalidarTodo();
  return { ok: true, id: data.id };
}

/** La temporada activa es la que ven todos por defecto. Solo el entrenador. */
export async function activarTemporada(id: string): Promise<Resultado> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Temporada no válida" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  if (!accion.contexto.esEntrenador) return SOLO_ENTRENADOR;

  const { error } = await accion.supabase.rpc("activar_temporada", { p_temporada: id });
  if (error) return errorDeBD(error, "activar temporada");

  revalidarTodo();
  return { ok: true };
}

// ---------- Miembros ---------------------------------------------

/**
 * Crea la cuenta de un miembro (email + contraseña inicial) y lo suma al cuerpo
 * técnico. No hay registro público: las cuentas las crea el entrenador.
 */
export async function agregarMiembro(input: MiembroInput): Promise<MiembroActionResult> {
  const parsed = miembroSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisá los campos marcados", errores: erroresDeZod(parsed.error) };
  }

  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase, contexto } = accion;
  if (!contexto.esEntrenador) return SOLO_ENTRENADOR;

  const admin = createAdminClient();
  const { nombre, email, rol, password } = parsed.data;
  const { data: creado, error: errorAuth } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
  });
  if (errorAuth || !creado.user) {
    if (errorAuth?.code === "email_exists" || errorAuth?.status === 422) {
      return {
        ok: false,
        error: "Revisá los campos marcados",
        errores: { email: "Ya existe una cuenta con ese email" },
      };
    }
    if (errorAuth?.code === "weak_password") {
      return {
        ok: false,
        error: "Revisá los campos marcados",
        errores: { password: "La contraseña es muy débil. Probá con una más larga." },
      };
    }
    console.error("[agregarMiembro] auth", errorAuth?.code, errorAuth?.message);
    return { ok: false, error: "No se pudo crear la cuenta. Probá de nuevo." };
  }

  // El alta en el cuerpo técnico pasa por RLS con la sesión del entrenador.
  const { error } = await supabase.from("miembros").insert({
    cuerpo_tecnico_id: contexto.cuerpoTecnico.id,
    user_id: creado.user.id,
    rol,
    nombre,
    email,
  });
  if (error) {
    await admin.auth.admin.deleteUser(creado.user.id);
    return errorDeBD(error, "agregar miembro");
  }

  revalidatePath("/cuerpo-tecnico");
  return { ok: true };
}

/** Verifica que el usuario sea miembro del cuerpo técnico de quien hace la acción. */
async function esCompanero(
  supabase: NonNullable<Awaited<ReturnType<typeof getAccion>>>["supabase"],
  cuerpoTecnicoId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("miembros")
    .select("user_id")
    .eq("cuerpo_tecnico_id", cuerpoTecnicoId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function cambiarRolMiembro(userId: string, rol: Rol): Promise<Resultado> {
  if (!idSchema.safeParse(userId).success || !rolSchema.safeParse(rol).success) {
    return { ok: false, error: "Datos no válidos" };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase, contexto } = accion;
  if (!contexto.esEntrenador) return SOLO_ENTRENADOR;

  const { data, error } = await supabase
    .from("miembros")
    .update({ rol })
    .eq("cuerpo_tecnico_id", contexto.cuerpoTecnico.id)
    .eq("user_id", userId)
    .select("user_id");
  if (error) return errorDeBD(error, "cambiar rol");
  if (data.length === 0) return { ok: false, error: "Ese miembro ya no existe" };

  revalidarTodo();
  return { ok: true };
}

/** Lo saca del cuerpo técnico y borra su cuenta. El entrenador no puede quitarse a sí mismo. */
export async function quitarMiembro(userId: string): Promise<Resultado> {
  if (!idSchema.safeParse(userId).success) return { ok: false, error: "Miembro no válido" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase, contexto } = accion;
  if (!contexto.esEntrenador) return SOLO_ENTRENADOR;
  if (userId === contexto.userId) {
    return { ok: false, error: "No podés quitarte a vos mismo del cuerpo técnico." };
  }

  const { data, error } = await supabase
    .from("miembros")
    .delete()
    .eq("cuerpo_tecnico_id", contexto.cuerpoTecnico.id)
    .eq("user_id", userId)
    .select("user_id");
  if (error) return errorDeBD(error, "quitar miembro");
  if (data.length === 0) return { ok: false, error: "Ese miembro ya no existe" };

  const { error: errorAuth } = await createAdminClient().auth.admin.deleteUser(userId);
  if (errorAuth) console.error("[quitarMiembro] auth", errorAuth.message);

  revalidatePath("/cuerpo-tecnico");
  return { ok: true };
}

/** Le pone una contraseña nueva a un miembro (por ejemplo, si se la olvidó). */
export async function restablecerContrasena(userId: string, password: string): Promise<Resultado> {
  const parsed = passwordSchema.safeParse(password);
  if (!idSchema.safeParse(userId).success) return { ok: false, error: "Miembro no válido" };
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Contraseña no válida" };
  }

  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase, contexto } = accion;
  if (!contexto.esEntrenador) return SOLO_ENTRENADOR;
  if (!(await esCompanero(supabase, contexto.cuerpoTecnico.id, userId))) {
    return { ok: false, error: "Ese miembro ya no existe" };
  }

  const { error } = await createAdminClient().auth.admin.updateUserById(userId, {
    password: parsed.data,
  });
  if (error) {
    console.error("[restablecerContrasena]", error.code, error.message);
    return {
      ok: false,
      error:
        error.code === "weak_password"
          ? "La contraseña es muy débil. Probá con una más larga."
          : "No se pudo cambiar la contraseña. Probá de nuevo.",
    };
  }
  return { ok: true };
}
