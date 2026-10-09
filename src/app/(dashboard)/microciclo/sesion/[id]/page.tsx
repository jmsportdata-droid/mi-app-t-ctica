import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requerirTemporada } from "@/lib/contexto";
import { getActividad } from "@/lib/data/calendario";
import { getDisponibilidadDelDia } from "@/lib/data/disponibilidad";
import { getJugadores } from "@/lib/data/jugadores";
import { getModeloJuego } from "@/lib/data/modelo-juego";
import { getPlantillas, getSesionCompleta, getUbicacionSesion } from "@/lib/data/sesiones";
import { getTareas } from "@/lib/data/tareas";
import { repartirPorMomento } from "@/lib/sesiones";
import { formatearSegundos } from "@/lib/tareas";
import { cn } from "@/lib/utils/cn";
import { formatearDia, horaCorta } from "@/lib/utils/fecha";
import { indiceObjetivos, MOMENTOS } from "@/types/modelo-juego";
import { INFO_ORIENTACION } from "@/types/tarea";
import { BackLink } from "@/components/ui/BackLink";
import { PageHeader } from "@/components/ui/PageHeader";
import { CierreSesion } from "@/components/microciclo/CierreSesion";
import { EditorSesion } from "@/components/microciclo/EditorSesion";
import { PlantillasSesion } from "@/components/microciclo/PlantillasSesion";
import { TextosSesion } from "@/components/microciclo/TextosSesion";

export const metadata: Metadata = { title: "Sesión" };

const CLASE_BOTON =
  "inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50";

export default async function SesionPage({ params }: { params: { id: string } }) {
  const { temporada, cuerpoTecnico } = await requerirTemporada();
  const actividad = await getActividad(params.id);
  if (!actividad) notFound();
  if (actividad.tipo !== "entrenamiento") redirect(`/calendario/${actividad.id}/editar`);

  const [ubicacion, completa, banco, { principios }, plantillas, jugadores, disponibilidad] =
    await Promise.all([
      getUbicacionSesion(temporada.id, actividad),
      getSesionCompleta(actividad.id),
      getTareas(cuerpoTecnico.id),
      getModeloJuego(cuerpoTecnico.id),
      getPlantillas(cuerpoTecnico.id),
      getJugadores(temporada.id),
      getDisponibilidadDelDia(temporada.id, actividad.fecha),
    ]);
  const { sesion, tareas, asistencia } = completa;
  const { md, diaTipo, numeroMicrociclo, numeroSesion } = ubicacion;

  const reparto = repartirPorMomento(tareas, indiceObjetivos(principios));
  const inicio = horaCorta(actividad.hora_inicio);
  const fin = horaCorta(actividad.hora_fin);
  const titulo = [
    numeroSesion ? `Sesión ${numeroSesion}` : "Sesión",
    numeroMicrociclo ? `Microciclo ${numeroMicrociclo}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const descripcion = [
    formatearDia(actividad.fecha),
    md,
    inicio && (fin ? `${inicio}–${fin}` : inicio),
    actividad.lugar,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <BackLink href={`/microciclo?fecha=${actividad.fecha}`}>Microciclo</BackLink>
      <PageHeader
        titulo={titulo}
        descripcion={descripcion}
        acciones={
          <>
            <Link href={`/calendario/${actividad.id}/editar`} className={CLASE_BOTON}>
              Horario y lugar
            </Link>
            <Link href={`/imprimir/sesion/${actividad.id}`} target="_blank" className={CLASE_BOTON}>
              Planilla PDF ↗
            </Link>
          </>
        }
      />

      {diaTipo && md && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 px-5 py-3 text-sm">
          <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
            {md}
          </span>
          <span className="font-semibold text-slate-900">
            {INFO_ORIENTACION[diaTipo.orientacion].label}
          </span>
          <span className="text-slate-600">{diaTipo.foco}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <TextosSesion
            actividadId={actividad.id}
            objetivo={sesion?.objetivo ?? null}
            notas={sesion?.notas ?? null}
          />
          <EditorSesion
            actividadId={actividad.id}
            tareas={tareas}
            banco={banco.filter((t) => !t.archivada)}
            principios={principios}
            orientacionDelDia={diaTipo?.orientacion}
            md={md ?? undefined}
          />
          <CierreSesion
            actividadId={actividad.id}
            sesion={sesion}
            jugadores={jugadores}
            disponibilidad={disponibilidad}
            asistencia={asistencia}
            minutosPlanificados={Math.round(reparto.total / 60)}
          />
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-slate-900">Resumen</h2>
            {reparto.total === 0 ? (
              <p className="text-sm text-slate-500">Agregá tareas para ver el resumen.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  <strong className="text-2xl font-bold text-slate-900">
                    {formatearSegundos(reparto.total)}
                  </strong>{" "}
                  planificados
                </p>
                <ul className="space-y-2">
                  {MOMENTOS.filter((m) => reparto.porMomento.has(m.valor)).map((m) => {
                    const seg = reparto.porMomento.get(m.valor) ?? 0;
                    return (
                      <BarraMomento
                        key={m.valor}
                        label={m.label}
                        color={m.punto}
                        segundos={seg}
                        total={reparto.total}
                      />
                    );
                  })}
                  {reparto.sinObjetivo > 0 && (
                    <BarraMomento
                      label="Sin objetivo del modelo"
                      color="bg-slate-300"
                      segundos={reparto.sinObjetivo}
                      total={reparto.total}
                    />
                  )}
                </ul>
                <p className="text-[11px] text-slate-500">
                  El tiempo de cada tarea se reparte entre los momentos de sus objetivos.
                </p>
              </div>
            )}
          </section>
          <PlantillasSesion
            actividadId={actividad.id}
            plantillas={plantillas}
            md={md ?? undefined}
            hayTareas={tareas.length > 0}
          />
        </aside>
      </div>
    </>
  );
}

function BarraMomento({
  label,
  color,
  segundos,
  total,
}: {
  label: string;
  color: string;
  segundos: number;
  total: number;
}) {
  const porcentaje = Math.round((segundos / total) * 100);
  return (
    <li className="space-y-1">
      <div className="flex justify-between gap-2 text-xs">
        <span className="text-slate-700">{label}</span>
        <span className="tabular-nums text-slate-500">
          {formatearSegundos(Math.round(segundos / 60) * 60)} · {porcentaje}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${porcentaje}%` }} />
      </div>
    </li>
  );
}
