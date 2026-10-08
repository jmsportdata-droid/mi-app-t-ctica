import type { Metadata } from "next";
import Link from "next/link";
import { requerirTemporada } from "@/lib/contexto";
import { getJugadores } from "@/lib/data/jugadores";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlantillaGrid } from "@/components/jugadores/PlantillaGrid";

export const metadata: Metadata = { title: "Plantel" };

const CLASE_BOTON =
  "inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700";

export default async function PlantillaPage() {
  const { temporada } = await requerirTemporada();
  const jugadores = await getJugadores(temporada.id);

  return (
    <>
      <PageHeader
        titulo="Plantel"
        descripcion={`${jugadores.length} jugador${jugadores.length === 1 ? "" : "es"} · ${temporada.club} ${temporada.etiqueta}`}
        acciones={
          <Link href="/plantilla/nuevo" className={CLASE_BOTON}>
            <span aria-hidden>+</span> Agregar jugador
          </Link>
        }
      />

      {jugadores.length === 0 ? (
        <EmptyState
          titulo="Todavía no hay jugadores"
          descripcion="Agregá el primer jugador para armar el plantel."
          accion={
            <Link href="/plantilla/nuevo" className={CLASE_BOTON}>
              Agregar jugador
            </Link>
          }
        />
      ) : (
        <PlantillaGrid jugadores={jugadores} />
      )}
    </>
  );
}
