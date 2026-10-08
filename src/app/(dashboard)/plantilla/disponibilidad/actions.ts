"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getClienteAutenticado, SESION_EXPIRADA } from "@/lib/supabase/auth";
import { fechaSchema } from "@/lib/validations/comun";
import { ESTADOS_DISPONIBILIDAD, type EstadoDisponibilidad } from "@/types/disponibilidad";

const ESTADOS = ESTADOS_DISPONIBILIDAD.map((e) => e.valor) as [
  EstadoDisponibilidad,
  ...EstadoDisponibilidad[],
];

const marcaSchema = z
  .object({
    jugadorId: z.string().uuid(),
    fecha: fechaSchema,
    estado: z.enum(ESTADOS),
    fechaRegreso: fechaSchema.nullable(),
  })
  .refine((v) => v.estado !== "disponible" || v.fechaRegreso === null, {
    message: "Un jugador disponible no lleva fecha de regreso",
  })
  .refine((v) => v.fechaRegreso === null || v.fechaRegreso >= v.fecha, {
    message: "La vuelta tiene que ser el mismo día o después",
  });

export type MarcaDisponibilidad = z.input<typeof marcaSchema>;

/** Carga (o corrige) el estado de un jugador desde un día. Sin diagnóstico médico. */
export async function marcarDisponibilidad(
  marca: MarcaDisponibilidad,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = marcaSchema.safeParse(marca);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const supabase = await getClienteAutenticado();
  if (!supabase) return SESION_EXPIRADA;

  const { jugadorId, fecha, estado, fechaRegreso } = parsed.data;
  const { error } = await supabase
    .from("disponibilidad")
    .upsert(
      { jugador_id: jugadorId, fecha, estado, fecha_regreso: fechaRegreso },
      { onConflict: "jugador_id,fecha" },
    );
  if (error) {
    console.error("[marcarDisponibilidad]", error.code, error.message);
    return {
      ok: false,
      error:
        error.code === "23503" || error.code === "42501"
          ? "Ese jugador ya no está en el plantel. Recargá la página."
          : "No se pudo guardar. Probá de nuevo.",
    };
  }

  revalidatePath("/plantilla", "layout");
  return { ok: true };
}
