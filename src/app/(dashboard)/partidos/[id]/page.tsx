import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDetallePartido, getPartido } from "@/lib/data/partidos";
import { getJugadores } from "@/lib/data/jugadores";
import { nombreArchivoSeguro } from "@/lib/export";
import { clubDeTemporada } from "@/lib/club";
import { requerirContexto } from "@/lib/contexto";
import { getTemporada } from "@/lib/data/cuerpo-tecnico";
import { formatearFechaPartido } from "@/lib/utils/fecha";
import { esTabPartido, type PartidoConRival } from "@/types/partido";
import type { Temporada } from "@/types/cuerpo-tecnico";
import { BackLink } from "@/components/ui/BackLink";
import { Enfrentamiento } from "@/components/partidos/Enfrentamiento";
import { PartidoAcciones } from "@/components/partidos/PartidoAcciones";
import { PartidoTabs } from "@/components/partidos/PartidoTabs";

interface Props {
  params: { id: string };
  searchParams: { tab?: string };
}

function tituloPartido(partido: PartidoConRival, club: string): string {
  const rival = partido.rival?.nombre ?? "Rival";
  return partido.es_local ? `${club} vs ${rival}` : `${rival} vs ${club}`;
}

/** El partido y la temporada a la que pertenece (puede no ser la seleccionada). */
async function getPartidoYTemporada(
  id: string,
): Promise<{ partido: PartidoConRival; temporada: Temporada } | null> {
  const partido = await getPartido(id);
  const temporada = partido ? await getTemporada(partido.temporada_id) : null;
  return partido && temporada ? { partido, temporada } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const datos = await getPartidoYTemporada(params.id);
  return { title: datos ? tituloPartido(datos.partido, datos.temporada.club) : "Partido" };
}

export default async function PartidoPage({ params, searchParams }: Props) {
  await requerirContexto();
  const datos = await getPartidoYTemporada(params.id);
  if (!datos) notFound();
  const { partido, temporada } = datos;
  const titulo = tituloPartido(partido, temporada.club);

  const [detalle, jugadores] = await Promise.all([
    getDetallePartido(partido.id),
    getJugadores(partido.temporada_id),
  ]);
  const tabInicial = esTabPartido(searchParams.tab) ? searchParams.tab : "informe";

  return (
    <>
      <BackLink href="/partidos">Partidos</BackLink>

      <header className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {partido.competicion ?? "Sin competencia"}
          </span>
          <PartidoAcciones id={partido.id} estado={partido.estado} titulo={titulo} />
        </div>

        <div className="mx-auto max-w-lg">
          <h1 className="sr-only">{titulo}</h1>
          <Enfrentamiento partido={partido} club={clubDeTemporada(temporada)} tamano="lg" />
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
          nombreArchivo: nombreArchivoSeguro(
            "eventos",
            partido.rival?.nombre ?? "rival",
            partido.fecha,
          ),
          meta: {
            partido: titulo,
            fecha: partido.fecha,
            competicion: partido.competicion,
            estadio: partido.estadio,
          },
        }}
      />
    </>
  );
}
