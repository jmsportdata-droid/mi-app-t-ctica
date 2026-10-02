/** Fila de la tabla "equipos" (equipos rivales). */
export type Equipo = {
  id: string;
  nombre: string;
  /** URL pública en el bucket "team-logos" */
  escudo_url: string | null;
  liga: string | null;
  estadio: string | null;
  created_at: string;
};

/** Datos necesarios para crear o editar un equipo. */
export type EquipoInput = Pick<Equipo, "nombre" | "escudo_url" | "liga" | "estadio">;
