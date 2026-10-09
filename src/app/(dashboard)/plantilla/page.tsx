import type { Metadata } from "next";
import Link from "next/link";
import { requerirTemporada } from "@/lib/contexto";
import { getSofascorePropio } from "@/lib/data/informe";
import { getDisponibilidadDelDia } from "@/lib/data/disponibilidad";
import { getJugadores } from "@/lib/data/jugadores";
import { hoyISO } from "@/lib/utils/fecha";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlantillaGrid } from "@/components/jugadores/PlantillaGrid";
import { SofascorePlantel } from "@/components/jugadores/SofascorePlantel";

export const metadata: Metadata = { title: "Plantel" };

const CLASE_SECUNDARIO =
  "inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50";

const CLASE_BOTON =
  "inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700";

export default async function PlantillaPage() {
  const { temporada, cuerpoTecnico } = await requerirTemporada();
  const [jugadores, estados, sofascore] = await Promise.all([
    getJugadores(temporada.id),
    getDisponibilidadDelDia(temporada.id, hoyISO()),
    getSofascorePropio(temporada.id, cuerpoTecnico.id),
  ]);
  const sinSofascore = jugadores
    .filter((j) => !(j.ids_externos as Record<string, unknown> | null)?.sofascore)
    .map((j) => ({ id: j.id, nombre: j.nombre, numero: j.numero }));

  return (
    <>
      <PageHeader
        titulo="Plantel"
        descripcion={`${jugadores.length} jugador${jugadores.length === 1 ? "" : "es"} · ${temporada.club} ${temporada.etiqueta}`}
        acciones={
          <>
            {jugadores.length > 0 && (
              <Link href="/plantilla/disponibilidad" className={CLASE_SECUNDARIO}>
                Disponibilidad de hoy
              </Link>
            )}
            <Link href="/plantilla/importar" className={CLASE_SECUNDARIO}>
              Importar
            </Link>
            <Link href="/plantilla/nuevo" className={CLASE_BOTON}>
              <span aria-hidden>+</span> Agregar jugador
            </Link>
          </>
        }
      />

      <SofascorePlantel {...sofascore} sinSofascore={sinSofascore} />

      {jugadores.length === 0 ? (
        <EmptyState
          titulo="Todavía no hay jugadores"
          descripcion="Importalo desde API-Football o agregá los jugadores uno por uno."
          accion={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/plantilla/importar" className={CLASE_BOTON}>
                Importar plantel
              </Link>
              <Link href="/plantilla/nuevo" className={CLASE_SECUNDARIO}>
                Agregar a mano
              </Link>
            </div>
          }
        />
      ) : (
        <PlantillaGrid jugadores={jugadores} estados={estados} />
      )}
    </>
  );
}
