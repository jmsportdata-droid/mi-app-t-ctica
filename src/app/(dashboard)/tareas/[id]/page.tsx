import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requerirContexto } from "@/lib/contexto";
import { getModeloJuego } from "@/lib/data/modelo-juego";
import { getFeedbackTareas, getTarea, type FeedbackTarea } from "@/lib/data/tareas";
import { BUCKETS, urlImagen } from "@/lib/storage/config";
import {
  formatearSegundos,
  m2PorJugador,
  promptAutomatico,
  textoEspacio,
  textoTiempo,
} from "@/lib/tareas";
import { cn } from "@/lib/utils/cn";
import {
  indiceObjetivos,
  INFO_MOMENTO,
  MOMENTOS,
  type EtiquetaObjetivo,
} from "@/types/modelo-juego";
import { INFO_COMPETITIVIDAD, INFO_ORIENTACION, INFO_TIPO_TAREA, INFO_VIA } from "@/types/tarea";
import { BackLink } from "@/components/ui/BackLink";
import { AccionesTarea } from "@/components/tareas/AccionesTarea";
import { PromptImagen } from "@/components/tareas/PromptImagen";

export const metadata: Metadata = { title: "Tarea" };

export default async function TareaPage({ params }: { params: { id: string } }) {
  const { cuerpoTecnico } = await requerirContexto();
  const [tarea, { principios, contenidos }, feedbacks] = await Promise.all([
    getTarea(params.id),
    getModeloJuego(cuerpoTecnico.id),
    getFeedbackTareas(cuerpoTecnico.id),
  ]);
  if (!tarea) notFound();

  const indice = indiceObjetivos(principios);
  const objetivos = tarea.objetivos
    .map((id) => indice.get(id))
    .filter((o): o is EtiquetaObjetivo => o !== undefined);
  const porMomento = MOMENTOS.map((m) => ({
    momento: m,
    items: objetivos.filter((o) => o.momento === m.valor),
  })).filter((g) => g.items.length > 0);
  const nombresContenidos = contenidos
    .filter((c) => tarea.contenidos.includes(c.id))
    .map((c) => c.nombre);

  const info = INFO_TIPO_TAREA[tarea.tipo];
  const grafico = urlImagen(BUCKETS.graficosTareas, tarea.grafico_ruta);
  const tiempo = textoTiempo(tarea);
  const m2 = m2PorJugador(tarea);

  const datos: [string, string | null][] = [
    ["Vía metodológica", tarea.via ? INFO_VIA[tarea.via].label : null],
    [
      "Competitividad",
      tarea.competitividad ? INFO_COMPETITIVIDAD[tarea.competitividad].label : null,
    ],
    [
      "Orientación física",
      tarea.orientacion_fisica
        ? `${INFO_ORIENTACION[tarea.orientacion_fisica].label} (${INFO_ORIENTACION[tarea.orientacion_fisica].dia})`
        : null,
    ],
    ["Formato", tarea.formato],
    ["Jugadores", tarea.jugadores ? String(tarea.jugadores) : null],
    [
      "Tiempo",
      tiempo && tarea.tiempo_total_seg && tarea.series
        ? `${tiempo} (${formatearSegundos(tarea.tiempo_total_seg)})`
        : tiempo,
    ],
    ["Espacio", textoEspacio(tarea)],
    ["m² por jugador", m2 ? `${m2} m²` : null],
  ];

  return (
    <>
      <BackLink href="/tareas">Banco de tareas</BackLink>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", info.color)}>
              {info.label}
            </span>
            {tarea.archivada && (
              <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                Archivada
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{tarea.nombre}</h1>
        </div>
        <AccionesTarea id={tarea.id} nombre={tarea.nombre} archivada={tarea.archivada} />
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {grafico ? (
            // Imagen privada servida por la app: next/image no aplica
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={grafico}
              alt={`Gráfico de ${tarea.nombre}`}
              className="w-full rounded-2xl border border-slate-200 bg-white object-contain"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              Todavía no tiene gráfico. Generalo con el prompt de abajo y subilo desde Editar.
            </div>
          )}

          {tarea.descripcion && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-2 font-semibold text-slate-900">Descripción</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {tarea.descripcion}
              </p>
            </section>
          )}

          <PromptImagen
            tareaId={tarea.id}
            automatico={promptAutomatico(
              tarea,
              objetivos.map((o) => o.nombre),
            )}
            personalizado={tarea.prompt_imagen}
          />
        </div>

        <aside className="space-y-6">
          <FeedbackDeTarea feedback={feedbacks[tarea.id]} />
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-slate-900">Ficha</h2>
            <dl className="space-y-2 text-sm">
              {datos
                .filter((d): d is [string, string] => d[1] !== null)
                .map(([label, valor]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="text-right font-medium text-slate-900">{valor}</dd>
                  </div>
                ))}
              {tarea.video_url && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Video</dt>
                  <dd>
                    <a
                      href={tarea.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-brand-700 hover:underline"
                    >
                      Ver ↗
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-slate-900">Objetivos</h2>
            {porMomento.length === 0 && nombresContenidos.length === 0 ? (
              <p className="text-sm text-slate-500">Sin objetivos cargados.</p>
            ) : (
              <div className="space-y-4">
                {porMomento.map(({ momento, items }) => (
                  <div key={momento.valor}>
                    <p className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <span
                        className={cn("h-2 w-2 rounded-full", INFO_MOMENTO[momento.valor].punto)}
                        aria-hidden
                      />
                      {momento.label}
                    </p>
                    <ul className="space-y-1 text-sm text-slate-700">
                      {items.map((o) => (
                        <li key={o.texto}>{o.texto}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                {nombresContenidos.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Contenidos técnicos
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                      {nombresContenidos.map((n) => (
                        <li
                          key={n}
                          className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700"
                        >
                          {n}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

const ETIQUETA_VALORACION: Record<string, string> = {
  funciono: "Funcionó",
  regular: "Regular",
  no_funciono: "No funcionó",
};

/** Cuántas veces se usó la tarea y cómo funcionó según los cierres de sesión. */
function FeedbackDeTarea({ feedback }: { feedback?: FeedbackTarea }) {
  const valoradas = feedback ? feedback.funciono + feedback.regular + feedback.noFunciono : 0;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-2 font-semibold text-slate-900">Cómo funcionó</h2>
      {!feedback ? (
        <p className="text-sm text-slate-500">
          Todavía no se usó en ninguna sesión. Al cerrar una sesión se valora cada ejercicio.
        </p>
      ) : (
        <div className="space-y-3 text-sm">
          <p className="text-slate-700">
            Usada <b>{feedback.usos}</b> {feedback.usos === 1 ? "vez" : "veces"}
            {valoradas > 0 && (
              <>
                {" "}
                · funcionó <b className="text-emerald-700">{feedback.funciono}</b>, regular{" "}
                <b className="text-amber-700">{feedback.regular}</b>, no funcionó{" "}
                <b className="text-red-700">{feedback.noFunciono}</b>
              </>
            )}
          </p>
          {feedback.comentarios.length > 0 && (
            <ul className="space-y-1.5">
              {feedback.comentarios.map((c, i) => (
                <li key={i} className="rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-xs text-slate-500">
                    {c.fecha.split("-").reverse().join("/")}
                    {c.valoracion && ` · ${ETIQUETA_VALORACION[c.valoracion]}`}
                  </span>
                  <p className="text-slate-800">{c.texto}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
