"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Json } from "@/types/database";
import { getAccion, SESION_EXPIRADA } from "@/lib/supabase/auth";
import { diagramaSchema, JUGADAS_BASE, rolesPorDefecto, rolesSchema } from "@/lib/pizarra";
import { textoOpcionalSchema } from "@/lib/validations/comun";
import {
  CATEGORIAS_JUGADA,
  LADOS_JUGADA,
  TIPOS_JUGADA,
  type CategoriaJugada,
  type LadoJugada,
  type TipoJugada,
} from "@/types/jugada";

type Resultado = { ok: true } | { ok: false; error: string };
type ResultadoId = { ok: true; id: string } | { ok: false; error: string };

const idSchema = z.string().uuid();
const tipoSchema = z.enum(TIPOS_JUGADA.map((t) => t.valor) as [TipoJugada, ...TipoJugada[]]);
const categoriaSchema = z.enum(
  CATEGORIAS_JUGADA.map((c) => c.valor) as [CategoriaJugada, ...CategoriaJugada[]],
);
const ladoSchema = z.enum(LADOS_JUGADA.map((l) => l.valor) as [LadoJugada, ...LadoJugada[]]);

function errorDeBD(error: PostgrestError, contexto: string): { ok: false; error: string } {
  console.error(`[jugadas ${contexto}]`, error.code, error.message);
  return { ok: false, error: "No se pudo guardar. Probá de nuevo." };
}

function revalidar() {
  revalidatePath("/pelota-quieta", "layout");
}

/** Carga las jugadas base (las del resumen de ABP) si la biblioteca está vacía. */
export async function cargarJugadasBase(): Promise<
  { ok: true; cargadas: number } | { ok: false; error: string }
> {
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase, contexto } = accion;
  const { count } = await supabase
    .from("jugadas")
    .select("id", { count: "exact", head: true })
    .eq("cuerpo_tecnico_id", contexto.cuerpoTecnico.id);
  if ((count ?? 0) > 0) return { ok: true, cargadas: 0 };
  const { error } = await supabase.from("jugadas").insert(
    JUGADAS_BASE.map((j) => ({
      ...j,
      roles: j.roles as unknown as Json,
      diagrama: j.diagrama as unknown as Json,
    })),
  );
  if (error) return errorDeBD(error, "base");
  revalidar();
  return { ok: true, cargadas: JUGADAS_BASE.length };
}

export async function crearJugada(tipo: string, categoria: string): Promise<ResultadoId> {
  const t = tipoSchema.safeParse(tipo);
  const c = categoriaSchema.safeParse(categoria);
  if (!t.success || !c.success) return { ok: false, error: "Datos no válidos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { data, error } = await accion.supabase
    .from("jugadas")
    .insert({
      tipo: t.data,
      categoria: c.data,
      nombre: "Jugada nueva",
      roles: rolesPorDefecto(t.data, c.data) as unknown as Json,
    })
    .select("id")
    .single();
  if (error) return errorDeBD(error, "crear");
  revalidar();
  return { ok: true, id: data.id };
}

const jugadaSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre tiene que tener al menos 2 caracteres").max(80),
  tipo: tipoSchema,
  categoria: categoriaSchema,
  lado: ladoSchema,
  numero: z.number().int().min(1).max(99).nullable(),
  sena: textoOpcionalSchema(120, "La seña"),
  descripcion: textoOpcionalSchema(2000, "La descripción"),
  roles: rolesSchema,
  diagrama: diagramaSchema,
});

export type JugadaInput = z.input<typeof jugadaSchema>;

export async function guardarJugada(id: string, input: JugadaInput): Promise<Resultado> {
  const parsed = jugadaSchema.safeParse(input);
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Datos no válidos" };
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá los datos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { roles, diagrama, ...campos } = parsed.data;
  const { error } = await accion.supabase
    .from("jugadas")
    .update({
      ...campos,
      roles: roles as unknown as Json,
      diagrama: diagrama as unknown as Json,
    })
    .eq("id", id);
  if (error) return errorDeBD(error, "guardar");
  revalidar();
  revalidatePath("/partidos", "layout");
  return { ok: true };
}

export async function duplicarJugada(id: string): Promise<ResultadoId> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Datos no válidos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { data: o } = await accion.supabase.from("jugadas").select("*").eq("id", id).maybeSingle();
  if (!o) return { ok: false, error: "Esa jugada ya no existe." };
  const { data, error } = await accion.supabase
    .from("jugadas")
    .insert({
      tipo: o.tipo,
      categoria: o.categoria,
      lado: o.lado,
      numero: o.numero,
      nombre: `${o.nombre.slice(0, 72)} (copia)`,
      sena: o.sena,
      descripcion: o.descripcion,
      roles: o.roles,
      diagrama: o.diagrama,
    })
    .select("id")
    .single();
  if (error) return errorDeBD(error, "duplicar");
  revalidar();
  return { ok: true, id: data.id };
}

export async function archivarJugada(id: string, archivada: boolean): Promise<Resultado> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Datos no válidos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase.from("jugadas").update({ archivada }).eq("id", id);
  if (error) return errorDeBD(error, "archivar");
  revalidar();
  return { ok: true };
}

export async function eliminarJugada(id: string): Promise<Resultado> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Datos no válidos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase.from("jugadas").delete().eq("id", id);
  if (error) return errorDeBD(error, "eliminar");
  revalidar();
  revalidatePath("/partidos", "layout");
  return { ok: true };
}

// ---------- Jugadas del partido ------------------------------------

/**
 * Agrega la jugada al partido. Sugiere los roles con los jugadores que los
 * cumplieron la última vez que se usó esta jugada, si ahora están convocados.
 */
export async function agregarJugadaPartido(
  partidoId: string,
  jugadaId: string,
): Promise<Resultado> {
  if (!idSchema.safeParse(partidoId).success || !idSchema.safeParse(jugadaId).success) {
    return { ok: false, error: "Datos no válidos" };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase } = accion;

  const [{ data: previas }, { data: alineacion }, { count }] = await Promise.all([
    supabase
      .from("partido_jugadas")
      .select("asignaciones, partidos(fecha)")
      .eq("jugada_id", jugadaId)
      .neq("partido_id", partidoId),
    supabase
      .from("alineacion_partido")
      .select("titulares, suplentes")
      .eq("partido_id", partidoId)
      .maybeSingle(),
    supabase
      .from("partido_jugadas")
      .select("jugada_id", { count: "exact", head: true })
      .eq("partido_id", partidoId),
  ]);
  const convocados = new Set(
    [...(alineacion?.titulares ?? []), ...(alineacion?.suplentes ?? [])].filter(
      Boolean,
    ) as string[],
  );
  const ultima = (previas ?? [])
    .filter((p) => p.partidos)
    .sort((a, b) => (b.partidos!.fecha ?? "").localeCompare(a.partidos!.fecha ?? ""))[0];
  const sugeridas = Object.fromEntries(
    Object.entries((ultima?.asignaciones as Record<string, string> | undefined) ?? {}).filter(
      ([, jugador]) => convocados.has(jugador),
    ),
  );

  const { error } = await supabase.from("partido_jugadas").insert({
    partido_id: partidoId,
    jugada_id: jugadaId,
    asignaciones: sugeridas,
    orden: (count ?? 0) + 1,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Esa jugada ya está en el partido." };
    return errorDeBD(error, "agregar al partido");
  }
  revalidatePath(`/partidos/${partidoId}`);
  return { ok: true };
}

export async function quitarJugadaPartido(partidoId: string, jugadaId: string): Promise<Resultado> {
  if (!idSchema.safeParse(partidoId).success || !idSchema.safeParse(jugadaId).success) {
    return { ok: false, error: "Datos no válidos" };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase
    .from("partido_jugadas")
    .delete()
    .eq("partido_id", partidoId)
    .eq("jugada_id", jugadaId);
  if (error) return errorDeBD(error, "quitar del partido");
  revalidatePath(`/partidos/${partidoId}`);
  return { ok: true };
}

/** Asigna (o desasigna con null) el jugador que cumple un rol en ese partido. */
export async function asignarRol(
  partidoId: string,
  jugadaId: string,
  rolId: string,
  jugadorId: string | null,
): Promise<Resultado> {
  if (
    !idSchema.safeParse(partidoId).success ||
    !idSchema.safeParse(jugadaId).success ||
    !z.string().min(1).max(40).safeParse(rolId).success ||
    (jugadorId && !idSchema.safeParse(jugadorId).success)
  ) {
    return { ok: false, error: "Datos no válidos" };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase } = accion;
  const { data } = await supabase
    .from("partido_jugadas")
    .select("asignaciones")
    .eq("partido_id", partidoId)
    .eq("jugada_id", jugadaId)
    .maybeSingle();
  if (!data) return { ok: false, error: "Esa jugada ya no está en el partido." };
  const asignaciones = { ...(data.asignaciones as Record<string, string>) };
  if (jugadorId) asignaciones[rolId] = jugadorId;
  else delete asignaciones[rolId];
  const { error } = await supabase
    .from("partido_jugadas")
    .update({ asignaciones })
    .eq("partido_id", partidoId)
    .eq("jugada_id", jugadaId);
  if (error) return errorDeBD(error, "asignar rol");
  revalidatePath(`/partidos/${partidoId}`);
  return { ok: true };
}
