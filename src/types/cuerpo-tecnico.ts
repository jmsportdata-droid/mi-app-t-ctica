import type { Enums, Tables } from "./database";

export type Rol = Enums<"rol_miembro">;

export const ROLES = [
  { valor: "entrenador", label: "Entrenador" },
  { valor: "ayudante", label: "Ayudante técnico" },
  { valor: "preparador_fisico", label: "Preparador físico" },
  { valor: "analista", label: "Analista" },
] as const satisfies readonly { valor: Rol; label: string }[];

export const ROL_LABEL = Object.fromEntries(ROLES.map((r) => [r.valor, r.label])) as Record<
  Rol,
  string
>;

/** Fila de la tabla "cuerpos_tecnicos". */
export type CuerpoTecnico = Tables<"cuerpos_tecnicos">;

/** Fila de la tabla "miembros": una persona del cuerpo técnico y su rol. */
export type Miembro = Tables<"miembros">;

/**
 * Fila de la tabla "temporadas": un club en una temporada.
 * escudo_ruta: ruta en el bucket "escudos". color_principal: "#rrggbb".
 */
export type Temporada = Tables<"temporadas">;

export type TemporadaInput = Pick<
  Temporada,
  "club" | "etiqueta" | "fecha_inicio" | "fecha_fin" | "color_principal" | "escudo_ruta"
>;

export type MiembroInput = Pick<Miembro, "nombre" | "email" | "rol"> & { password: string };

export const PASSWORD_MIN = 8;
