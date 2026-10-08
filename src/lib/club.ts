import { BUCKETS, urlImagen } from "@/lib/storage/config";
import type { ClubPropio } from "@/components/partidos/Enfrentamiento";
import type { Temporada } from "@/types/cuerpo-tecnico";

/** Nuestro club en una temporada, como lo muestran los enfrentamientos. */
export function clubDeTemporada(temporada: Temporada): ClubPropio {
  return { nombre: temporada.club, escudo_url: urlImagen(BUCKETS.escudos, temporada.escudo_ruta) };
}
