import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CuerpoTecnico, Miembro, Temporada } from "@/types/cuerpo-tecnico";

/** Cookie con la temporada que el usuario está mirando (por defecto, la activa). */
export const COOKIE_TEMPORADA = "temporada";

export interface Contexto {
  userId: string;
  email: string;
  miembro: Miembro;
  cuerpoTecnico: CuerpoTecnico;
  esEntrenador: boolean;
  /** Más reciente primero */
  temporadas: Temporada[];
  /** Temporada seleccionada; null si el cuerpo técnico todavía no tiene ninguna */
  temporada: Temporada | null;
}

export type Sesion =
  | { estado: "sin_sesion" }
  | { estado: "sin_cuerpo_tecnico"; userId: string; email: string }
  | ({ estado: "ok" } & Contexto);

/** Sesión y contexto del usuario. Memoizado por petición. */
export const getSesion = cache(async (): Promise<Sesion> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { estado: "sin_sesion" };

  const { data: miembro, error } = await supabase
    .from("miembros")
    .select("*, cuerpo_tecnico:cuerpos_tecnicos(*)")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    console.error("[getSesion] miembro", error.message);
    throw new Error("No se pudo cargar tu cuerpo técnico");
  }
  if (!miembro?.cuerpo_tecnico) {
    return { estado: "sin_cuerpo_tecnico", userId: user.id, email: user.email ?? "" };
  }

  const { data: temporadas, error: errorTemporadas } = await supabase
    .from("temporadas")
    .select("*")
    .eq("cuerpo_tecnico_id", miembro.cuerpo_tecnico_id)
    .order("fecha_inicio", { ascending: false });
  if (errorTemporadas) {
    console.error("[getSesion] temporadas", errorTemporadas.message);
    throw new Error("No se pudieron cargar las temporadas");
  }

  const elegida = cookies().get(COOKIE_TEMPORADA)?.value;
  const temporada =
    temporadas.find((t) => t.id === elegida) ??
    temporadas.find((t) => t.activa) ??
    temporadas[0] ??
    null;

  const { cuerpo_tecnico: cuerpoTecnico, ...datosMiembro } = miembro;
  return {
    estado: "ok",
    userId: user.id,
    email: user.email ?? "",
    miembro: datosMiembro,
    cuerpoTecnico,
    esEntrenador: datosMiembro.rol === "entrenador",
    temporadas,
    temporada,
  };
});

/** Para páginas: redirige al login o al alta del cuerpo técnico si hace falta. */
export async function requerirContexto(): Promise<Contexto> {
  const sesion = await getSesion();
  if (sesion.estado === "sin_sesion") redirect("/login");
  if (sesion.estado === "sin_cuerpo_tecnico") redirect("/bienvenida");
  return sesion;
}

/** Para páginas que trabajan sobre una temporada (plantel, partidos…). */
export async function requerirTemporada(): Promise<Contexto & { temporada: Temporada }> {
  const contexto = await requerirContexto();
  if (!contexto.temporada) redirect("/cuerpo-tecnico");
  return { ...contexto, temporada: contexto.temporada };
}
