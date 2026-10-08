import type { Tables } from "./database";

/**
 * Fila de la tabla "equipos" (equipos rivales, capa permanente del cuerpo técnico).
 * escudo_ruta: ruta en el bucket "escudos".
 */
export type Equipo = Tables<"equipos">;

/** Datos necesarios para crear o editar un equipo. */
export type EquipoInput = Pick<Equipo, "nombre" | "escudo_ruta" | "liga" | "estadio">;
