import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDetallePartido, getPartido } from "@/lib/data/partidos";
import { getJugadores } from "@/lib/data/jugadores";
import { nombreArchivoSeguro } from "@/lib/export";
import { MI_EQUIPO } from "@/lib/config";
import { formatearFechaPartido } from "@/lib/utils/fecha";
import { esTabPartido, type PartidoConRival } from "@/types/partido";
import { BackLink } from "@/components/ui/BackLink";
import { Enfrentamiento } from "@/components/partidos/Enfrentamiento";
import { PartidoAcciones } from "@/components/partidos/PartidoAcciones";
import { PartidoTabs } from "@/components/partidos/PartidoTabs";

interface Props {
  params: { id: string };
  searchParams: { tab?: string };
}

function tituloPartido(partido: PartidoConRival): string {
  const rival = partido.rival?.nombre ?? "Rival";
  return partido.es_local ? `${MI_EQUIPO.nombre} vs ${rival}` : `${rival} vs ${MI_EQUIPO.nombre}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const partido = await getPartido(params.id);
  return { title: partido ? tituloPartido(partido) : "Partido" };
}

export default async function PartidoPage({ params, searchParams }: Props) {
  const partido = await getPartido(params.id);
  if (!partido) notFound();

  const [detalle, jugadores] = await Promise.all([getDetallePartido(partido.id), getJugadores()]);
  const tabInicial = esTabPartido(searchParams.tab) ? searchParams.tab : "informe";

  return (
    <>
      <BackLink href="/partidos">Partidos</BackLink>

      <header className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {partido.competicion ?? "Sin competición"}
          </span>
          <PartidoAcciones id={partido.id} estado={partido.estado} titulo={tituloPartido(partido)} />
        </div>

        <div className="mx-auto max-w-lg">
          <h1 className="sr-only">{tituloPartido(partido)}</h1>
          <Enfrentamiento partido={partido} tamano="lg" />
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          <span className="capitalize">{formatearFechaPartido(partido.fecha)}</span>
          <span className="mx-2 text-slate-300">·</span>
          {partido.estadio ?? "Estadio por confirmar"}
        </p>
      </header>

      <PartidoTabs
        partidoId={partido.id}
        detalle={detalle}
        jugadores={jugadores}
        videoUrl={partido.video_url}
        tabInicial={tabInicial}
        exportacion={{
          nombreArchivo: nombreArchivoSeguro("eventos", partido.rival?.nombre ?? "rival", partido.fecha),
          meta: {
            partido: tituloPartido(partido),
            fecha: partido.fecha,
            competicion: partido.competicion,
            estadio: partido.estadio,
          },
        }}
      />
    </>
  );
}
