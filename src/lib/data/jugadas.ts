import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Diagrama, FilaJugada, Jugada, RolJugada } from "@/types/jugada";

export function aJugada(fila: FilaJugada): Jugada {
  return {
    ...fila,
    roles: fila.roles as unknown as RolJugada[],
    diagrama: fila.diagrama as unknown as Diagrama,
  };
}

/** Biblioteca de jugadas del cuerpo técnico (incluidas las archivadas). */
export async function getJugadas(cuerpoTecnicoId: string): Promise<Jugada[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("jugadas")
    .select("*")
    .eq("cuerpo_tecnico_id", cuerpoTecnicoId)
    .order("tipo", { ascending: false })
    .order("numero", { ascending: true, nullsFirst: false })
    .order("nombre", { ascending: true });
  if (error) {
    console.error("[getJugadas]", error.message);
    throw new Error("No se pudieron cargar las jugadas");
  }
  return (data ?? []).map(aJugada);
}

export const getJugada = cache(async (id: string): Promise<Jugada | null> => {
  const supabase = createClient();
  const { data, error } = await supabase.from("jugadas").select("*").eq("id", id).maybeSingle();
  if (error) {
    if (error.code === "22P02") return null;
    console.error("[getJugada]", error.message);
    throw new Error("No se pudo cargar la jugada");
  }
  return data ? aJugada(data) : null;
});

export interface JugadaDelPartido {
  jugada: Jugada;
  /** rol → jugador */
  asignaciones: Record<string, string>;
  orden: number;
}

/** Jugadas elegidas para un partido, con quién cumple cada rol. */
export async function getJugadasPartido(partidoId: string): Promise<JugadaDelPartido[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("partido_jugadas")
    .select("asignaciones, orden, jugadas(*)")
    .eq("partido_id", partidoId)
    .order("orden", { ascending: true });
  if (error) {
    console.error("[getJugadasPartido]", error.message);
    throw new Error("No se pudieron cargar las jugadas del partido");
  }
  return (data ?? []).flatMap((f) =>
    f.jugadas
      ? [
          {
            jugada: aJugada(f.jugadas),
            asignaciones: f.asignaciones as Record<string, string>,
            orden: f.orden,
          },
        ]
      : [],
  );
}
