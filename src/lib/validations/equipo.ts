import { z } from "zod";
import type { EquipoInput } from "@/types/equipo";
import { BUCKETS } from "@/lib/storage/config";
import { textoOpcionalSchema, urlImagenSchema } from "./comun";

export const equipoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(80, "El nombre no puede superar 80 caracteres"),
  escudo_url: urlImagenSchema(BUCKETS.escudosEquipos),
  liga: textoOpcionalSchema(80, "La liga"),
  estadio: textoOpcionalSchema(80, "El estadio"),
}) satisfies z.ZodType<EquipoInput, z.ZodTypeDef, unknown>;

export type EquipoErrores = Partial<Record<keyof EquipoInput, string>>;
