import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface MarcasPartido {
  /** Rivales a marcar al hombre elegidos a mano (null: los sugeridos) */
  rivales: string[] | null;
  /** Parejas fijadas a mano: { id del rival: id de nuestro jugador } */
  parejas: Record<string, string>;
}

/** Lo que el cuerpo técnico cambió a mano en el emparejamiento de marcas. */
export async function getMarcasPartido(partidoId: string): Promise<MarcasPartido> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("marcas_partido")
    .select("rivales, parejas")
    .eq("partido_id", partidoId)
    .maybeSingle();
  if (error) {
    console.error("[getMarcasPartido]", error.message);
    throw new Error("No se pudieron cargar las marcas del partido");
  }
  return {
    rivales: data?.rivales ?? null,
    parejas: (data?.parejas ?? {}) as Record<string, string>,
  };
}
