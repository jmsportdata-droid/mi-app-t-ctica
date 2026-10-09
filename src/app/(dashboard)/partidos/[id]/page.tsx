import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDetallePartido, getPartido } from "@/lib/data/partidos";
import { getDisponibilidadDelDia } from "@/lib/data/disponibilidad";
import { getJugadores } from "@/lib/data/jugadores";
import { getModeloJuego } from "@/lib/data/modelo-juego";
import { getTareas } from "@/lib/data/tareas";
import { getJugadas, getJugadasPartido } from "@/lib/data/jugadas";
import { getInformeSofascore } from "@/lib/data/informe";
import { nombreArchivoSeguro } from "@/lib/export";
import { clubDeTemporada } from "@/lib/club";
import { requerirContexto } from "@/lib/contexto";
import { getTemporada } from "@/lib/data/cuerpo-tecnico";
import { formatearDia, formatearFechaPartido, horaCorta } from "@/lib/utils/fecha";
import { etiquetaFormacion } from "@/types/alineacion";
import {
  CAMPOS_TEXTO_PLAN,
  CESPEDES,
  esTabPartido,
  type PartidoConRival,
  type TabPartido,
} from "@/types/partido";
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
  const { cuerpoTecnico } = await requerirContexto();
  const datos = await getPartidoYTemporada(params.id);
  if (!datos) notFound();
  const { partido, temporada } = datos;
  const titulo = tituloPartido(partido, temporada.club);

  const [
    detalle,
    jugadores,
    disponibilidad,
    { principios },
    tareas,
    jugadasPartido,
    biblioteca,
    sofascore,
  ] = await Promise.all([
    getDetallePartido(partido.id),
    getJugadores(partido.temporada_id),
    getDisponibilidadDelDia(partido.temporada_id, partido.fecha),
    getModeloJuego(cuerpoTecnico.id),
    getTareas(cuerpoTecnico.id),
    getJugadasPartido(partido.id),
    getJugadas(cuerpoTecnico.id),
    getInformeSofascore(partido.id, partido.rival_id, cuerpoTecnico.id),
  ]);
  const tabInicial = esTabPartido(searchParams.tab) ? searchParams.tab : "previa";

  const { previa, informe, plan } = detalle;
  const completos: Record<TabPartido, boolean> = {
    previa:
      partido.formacion_rival !== null ||
      (previa !== null &&
        Object.entries(previa).some(
          ([k, v]) => k !== "partido_id" && k !== "actualizado_en" && v !== null,
        )),
    informe:
      sofascore.informe !== null ||
      Boolean(informe?.slides_url || informe?.vimeo_url || informe?.tags.length),
    video: detalle.analisis.length > 0,
    abp: detalle.abp.some((a) => a.descripcion),
    plan:
      detalle.escenarios.length > 0 ||
      Boolean(plan?.claves.length) ||
      (Object.keys(CAMPOS_TEXTO_PLAN) as (keyof typeof CAMPOS_TEXTO_PLAN)[]).some((c) => plan?.[c]),
    convocatoria: (detalle.alineacion?.titulares.filter(Boolean).length ?? 0) === 11,
    vestuario: detalle.videos.some((v) => v.url),
    eventos: detalle.eventos.length > 0,
    post: partido.goles_favor !== null,
  };
  const rival = partido.rival?.nombre ?? "rival";

  // Tareas del banco que trabajan los principios elegidos para el microciclo
  const elegidos = new Set(plan?.microciclo_principios ?? []);
  for (const p of principios) if (p.padre_id && elegidos.has(p.padre_id)) elegidos.add(p.id);
  const tareasSugeridas = tareas
    .filter((t) => !t.archivada)
    .map((t) => ({ t, n: t.objetivos.filter((o) => elegidos.has(o)).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || a.t.nombre.localeCompare(b.t.nombre, "es"))
    .slice(0, 8)
    .map(({ t }) => ({ id: t.id, nombre: t.nombre, tipo: t.tipo }));

  const resumenPrevia = [
    partido.formacion_rival &&
      `Formación esperada del rival: ${etiquetaFormacion(partido.formacion_rival)}`,
    previa?.rival_racha && `Cómo viene: ${previa.rival_racha}`,
    previa?.rival_bajas && `Bajas: ${previa.rival_bajas}`,
    previa?.rival_dt && `Entrenador: ${previa.rival_dt}`,
    previa?.arbitro && `Árbitro: ${previa.arbitro}`,
    previa?.cesped &&
      `Césped ${CESPEDES.find((c) => c.valor === previa.cesped)?.label.toLowerCase()}`,
    previa?.clima && `Clima: ${previa.clima}`,
  ].filter((x): x is string => Boolean(x));

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
          <span className="capitalize">
            {formatearFechaPartido(partido.fecha)}
            {partido.hora && ` · ${horaCorta(partido.hora)}`}
          </span>
          <span className="mx-2 text-slate-300">·</span>
          {partido.estadio ?? "Estadio por confirmar"}
        </p>
      </header>

      <PartidoTabs
        partido={partido}
        club={temporada.club}
        disponibilidad={disponibilidad}
        completos={completos}
        encabezadoConvocatoria={`Convocados vs ${rival} · ${formatearDia(partido.fecha)}`}
        principios={principios}
        tareasSugeridas={tareasSugeridas}
        resumenPrevia={resumenPrevia}
        jugadasPartido={jugadasPartido}
        sofascore={sofascore}
        bibliotecaJugadas={biblioteca}
        colorClub={temporada.color_principal}
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
