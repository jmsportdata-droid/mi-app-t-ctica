"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import { getAccion, SESION_EXPIRADA } from "@/lib/supabase/auth";
import { textoOpcionalSchema } from "@/lib/validations/comun";
import { MOMENTOS, type MomentoJuego } from "@/types/modelo-juego";

type Resultado = { ok: true } | { ok: false; error: string };

const idSchema = z.string().uuid();
const nombreSchema = z
  .string()
  .trim()
  .min(2, "El nombre tiene que tener al menos 2 caracteres")
  .max(120, "El nombre no puede superar 120 caracteres");
const momentoSchema = z.enum(MOMENTOS.map((m) => m.valor) as [MomentoJuego, ...MomentoJuego[]]);

function errorDeBD(error: PostgrestError, contexto: string): { ok: false; error: string } {
  if (error.code === "23505") return { ok: false, error: "Ya existe uno con ese nombre." };
  if (error.code === "23503") {
    return {
      ok: false,
      error: "Se está usando en tareas o sesiones: ocultalo en lugar de borrarlo.",
    };
  }
  if (error.hint === "dos_niveles") {
    return { ok: false, error: "El modelo tiene dos niveles: principio y subprincipio." };
  }
  console.error(`[modelo de juego ${contexto}]`, error.code, error.message);
  return { ok: false, error: "No se pudo guardar. Probá de nuevo." };
}

function revalidar() {
  revalidatePath("/modelo-de-juego");
}

/** Carga el modelo base del manual (solo si todavía no hay principios). */
export async function cargarModeloBase(): Promise<
  { ok: true; cargados: number } | { ok: false; error: string }
> {
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { data, error } = await accion.supabase.rpc("cargar_modelo_base");
  if (error) return errorDeBD(error, "cargar base");
  revalidar();
  return { ok: true, cargados: data };
}

const sistemaSchema = z.object({
  filosofia: textoOpcionalSchema(1000, "La filosofía"),
  sistema_con_balon: textoOpcionalSchema(300, "El sistema con balón"),
  sistema_sin_balon: textoOpcionalSchema(300, "El sistema sin balón"),
});

export async function guardarSistema(input: z.input<typeof sistemaSchema>): Promise<Resultado> {
  const parsed = sistemaSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;

  const { error } = await accion.supabase
    .from("modelos_juego")
    .upsert({ cuerpo_tecnico_id: accion.contexto.cuerpoTecnico.id, ...parsed.data });
  if (error) return errorDeBD(error, "sistema");
  revalidar();
  return { ok: true };
}

/** Agrega un principio (padreId null) o un subprincipio al final de su lista. */
export async function crearPrincipio(
  momento: MomentoJuego,
  padreId: string | null,
  nombre: string,
): Promise<Resultado> {
  const parsedNombre = nombreSchema.safeParse(nombre);
  if (!parsedNombre.success) return { ok: false, error: parsedNombre.error.issues[0]!.message };
  if (
    !momentoSchema.safeParse(momento).success ||
    (padreId && !idSchema.safeParse(padreId).success)
  ) {
    return { ok: false, error: "Datos no válidos" };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase } = accion;

  let hermanos = supabase.from("principios_juego").select("orden").eq("momento", momento);
  hermanos = padreId ? hermanos.eq("padre_id", padreId) : hermanos.is("padre_id", null);
  const { data: ultimo } = await hermanos
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("principios_juego").insert({
    momento,
    padre_id: padreId,
    nombre: parsedNombre.data,
    orden: (ultimo?.orden ?? 0) + 1,
  });
  if (error) return errorDeBD(error, "crear");
  revalidar();
  return { ok: true };
}

export async function actualizarPrincipio(
  id: string,
  nombre: string,
  descripcion: string,
): Promise<Resultado> {
  const parsedNombre = nombreSchema.safeParse(nombre);
  const parsedDescripcion = textoOpcionalSchema(1000, "La descripción").safeParse(descripcion);
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Datos no válidos" };
  if (!parsedNombre.success) return { ok: false, error: parsedNombre.error.issues[0]!.message };
  if (!parsedDescripcion.success) {
    return { ok: false, error: parsedDescripcion.error.issues[0]!.message };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;

  const { error } = await accion.supabase
    .from("principios_juego")
    .update({ nombre: parsedNombre.data, descripcion: parsedDescripcion.data })
    .eq("id", id);
  if (error) return errorDeBD(error, "actualizar");
  revalidar();
  return { ok: true };
}

/** Sube o baja un principio/subprincipio un lugar entre sus hermanos. */
export async function moverPrincipio(
  id: string,
  direccion: "arriba" | "abajo",
): Promise<Resultado> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Datos no válidos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase } = accion;

  const { data: actual } = await supabase
    .from("principios_juego")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!actual) return { ok: false, error: "Ya no existe." };

  let consulta = supabase
    .from("principios_juego")
    .select("id, orden, nombre")
    .eq("momento", actual.momento);
  consulta = actual.padre_id
    ? consulta.eq("padre_id", actual.padre_id)
    : consulta.is("padre_id", null);
  const { data: hermanos, error } = await consulta.order("orden").order("nombre");
  if (error) return errorDeBD(error, "mover");

  const i = hermanos.findIndex((h) => h.id === id);
  const j = direccion === "arriba" ? i - 1 : i + 1;
  if (i === -1 || j < 0 || j >= hermanos.length) return { ok: true };

  // Se renumera la lista entera para que no queden órdenes repetidos
  const nuevo = [...hermanos];
  [nuevo[i], nuevo[j]] = [nuevo[j]!, nuevo[i]!];
  for (const [orden, h] of nuevo.entries()) {
    if (h.orden !== orden + 1) {
      const { error: e } = await supabase
        .from("principios_juego")
        .update({ orden: orden + 1 })
        .eq("id", h.id);
      if (e) return errorDeBD(e, "mover");
    }
  }
  revalidar();
  return { ok: true };
}

export async function alternarOcultoPrincipio(id: string, oculto: boolean): Promise<Resultado> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Datos no válidos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase.from("principios_juego").update({ oculto }).eq("id", id);
  if (error) return errorDeBD(error, "ocultar");
  revalidar();
  return { ok: true };
}

/** Borra un principio (con sus subprincipios) o un subprincipio. */
export async function eliminarPrincipio(id: string): Promise<Resultado> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Datos no válidos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase.from("principios_juego").delete().eq("id", id);
  if (error) return errorDeBD(error, "eliminar");
  revalidar();
  return { ok: true };
}

// ---------- Contenidos técnicos ----------------------------------

const contenidoSchema = z
  .string()
  .trim()
  .min(2, "El nombre tiene que tener al menos 2 caracteres")
  .max(80, "El nombre no puede superar 80 caracteres");

export async function crearContenido(nombre: string): Promise<Resultado> {
  const parsed = contenidoSchema.safeParse(nombre);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase } = accion;

  const { data: ultimo } = await supabase
    .from("contenidos_tecnicos")
    .select("orden")
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase
    .from("contenidos_tecnicos")
    .insert({ nombre: parsed.data, orden: (ultimo?.orden ?? 0) + 1 });
  if (error) return errorDeBD(error, "crear contenido");
  revalidar();
  return { ok: true };
}

export async function alternarOcultoContenido(id: string, oculto: boolean): Promise<Resultado> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Datos no válidos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase
    .from("contenidos_tecnicos")
    .update({ oculto })
    .eq("id", id);
  if (error) return errorDeBD(error, "ocultar contenido");
  revalidar();
  return { ok: true };
}

export async function eliminarContenido(id: string): Promise<Resultado> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Datos no válidos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase.from("contenidos_tecnicos").delete().eq("id", id);
  if (error) return errorDeBD(error, "eliminar contenido");
  revalidar();
  return { ok: true };
}
