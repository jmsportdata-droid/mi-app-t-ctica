import type { Metadata } from "next";
import Link from "next/link";
import { clubDeTemporada } from "@/lib/club";
import { requerirTemporada } from "@/lib/contexto";
import { getPartidos } from "@/lib/data/partidos";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { PartidosGrid } from "@/components/partidos/PartidosGrid";

export const metadata: Metadata = { title: "Partidos" };

const CLASE_BOTON =
  "inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700";

export default async function PartidosPage() {
  const { temporada } = await requerirTemporada();
  const partidos = await getPartidos(temporada.id);

  return (
    <>
      <PageHeader
        titulo="Partidos"
        descripcion={`${partidos.length} partido${partidos.length === 1 ? "" : "s"} registrado${partidos.length === 1 ? "" : "s"}`}
        acciones={
          <Link href="/partidos/nuevo" className={CLASE_BOTON}>
            <span aria-hidden>+</span> Nuevo partido
          </Link>
        }
      />

      {partidos.length === 0 ? (
        <EmptyState
          titulo="Todavía no hay partidos"
          descripcion="Creá el primer partido para preparar el informe del rival y el plan de juego."
          accion={
            <Link href="/partidos/nuevo" className={CLASE_BOTON}>
              Nuevo partido
            </Link>
          }
        />
      ) : (
        <PartidosGrid partidos={partidos} club={clubDeTemporada(temporada)} />
      )}
    </>
  );
}
