"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { DetallePartido } from "@/lib/data/partidos";
import type { EstadoDelDia } from "@/types/disponibilidad";
import type { Jugador } from "@/types/jugador";
import type { PrincipioJuego } from "@/types/modelo-juego";
import { TABS_PARTIDO, type PartidoConRival, type TabPartido } from "@/types/partido";
import { AbpPanel } from "./AbpPanel";
import { EmparejamientoMarcas } from "./EmparejamientoMarcas";
import { AnalisisVideoPanel } from "./AnalisisVideoPanel";
import { ConvocatoriaPanel } from "./ConvocatoriaPanel";
import { InformeRivalPanel } from "./InformeRivalPanel";
import { InformeSofascore } from "./InformeSofascore";
import type { InformeSofascore as DatosSofascore } from "@/lib/data/informe";
import type { MarcasPartido } from "@/lib/data/marcas";
import { PlanPartidoEditor, type TareaSugerida } from "./PlanPartidoEditor";
import { JugadasPartidoPanel, type JugadaElegida } from "@/components/pizarra/JugadasPartidoPanel";
import type { Jugada } from "@/types/jugada";
import { PostPartidoPanel } from "./PostPartidoPanel";
import { AsistentePlan } from "./AsistentePlan";
import type { DatosAsistentePlan } from "@/lib/data/asistente-plan";
import { ConclusionesPost } from "@/components/post/ConclusionesPost";
import { EstadisticasPost } from "@/components/post/EstadisticasPost";
import { JugadoresPost } from "@/components/post/JugadoresPost";
import { PlanVsRealidad } from "@/components/post/PlanVsRealidad";
import type { DatosPostPartido } from "@/lib/data/post-partido";
import type { EvaluacionPlan, InsightsPost } from "@/lib/post-partido";
import { hoyISO } from "@/lib/utils/fecha";
import { PreviaPanel } from "./PreviaPanel";
import { VestuarioPanel } from "./VestuarioPanel";
import { EventosPanel } from "./eventos/EventosPanel";

interface Props {
  partido: PartidoConRival;
  /** Nombre de nuestro club en la temporada */
  club: string;
  disponibilidad: Record<string, EstadoDelDia>;
  /** Qué pasos ya tienen contenido */
  completos: Record<TabPartido, boolean>;
  encabezadoConvocatoria: string;
  principios: PrincipioJuego[];
  tareasSugeridas: TareaSugerida[];
  resumenPrevia: string[];
  jugadasPartido: JugadaElegida[];
  sofascore: DatosSofascore;
  marcas: MarcasPartido;
  post: DatosPostPartido;
  asistente: DatosAsistentePlan;
  bibliotecaJugadas: Jugada[];
  colorClub: string;
  partidoId: string;
  detalle: DetallePartido;
  jugadores: Jugador[];
  videoUrl: string | null;
  /** Base del nombre de los archivos exportados y metadatos del JSON */
  exportacion: { nombreArchivo: string; meta: Record<string, unknown> };
  tabInicial: TabPartido;
}

export function PartidoTabs({
  partido,
  club,
  disponibilidad,
  completos,
  encabezadoConvocatoria,
  principios,
  tareasSugeridas,
  resumenPrevia,
  jugadasPartido,
  sofascore,
  marcas,
  post,
  asistente,
  bibliotecaJugadas,
  colorClub,
  partidoId,
  detalle,
  jugadores,
  videoUrl,
  exportacion,
  tabInicial,
}: Props) {
  const [activa, setActiva] = useState<TabPartido>(tabInicial);
  // Cada panel se monta la primera vez que se visita y después se mantiene montado
  // (no se pierde lo escrito, y las gráficas se miden con el panel ya visible).
  const [visitadas, setVisitadas] = useState<Set<TabPartido>>(() => new Set([tabInicial]));
  const botones = useRef<Array<HTMLButtonElement | null>>([]);
  // En el plan, primero los convocados (si ya hay convocatoria)
  const convocados = new Set(
    [...(detalle.alineacion?.titulares ?? []), ...(detalle.alineacion?.suplentes ?? [])].filter(
      Boolean,
    ) as string[],
  );
  const jugadoresDelPlan =
    convocados.size > 0
      ? [
          ...jugadores.filter((j) => convocados.has(j.id)),
          ...jugadores.filter((j) => !convocados.has(j.id)),
        ]
      : jugadores;

  function seleccionar(tab: TabPartido) {
    setActiva(tab);
    setVisitadas((prev) => (prev.has(tab) ? prev : new Set(prev).add(tab)));
    // Refleja la pestaña en la URL sin navegar (se conserva al recargar).
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url);
  }

  // Navegación con flechas entre pestañas (patrón WAI-ARIA tabs)
  function handleKeyDown(e: React.KeyboardEvent, indice: number) {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const siguiente = (indice + delta + TABS_PARTIDO.length) % TABS_PARTIDO.length;
    const tab = TABS_PARTIDO[siguiente];
    if (!tab) return;
    seleccionar(tab.id);
    botones.current[siguiente]?.focus();
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Secciones del partido"
        className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200"
      >
        {TABS_PARTIDO.map((tab, i) => (
          <button
            key={tab.id}
            ref={(el) => {
              botones.current[i] = el;
            }}
            id={`tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={activa === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={activa === tab.id ? 0 : -1}
            onClick={() => seleccionar(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              activa === tab.id
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700",
            )}
          >
            <span
              className={cn(
                "mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold",
                completos[tab.id]
                  ? "bg-emerald-500 text-white"
                  : activa === tab.id
                    ? "bg-brand-600 text-white"
                    : "bg-slate-200 text-slate-600",
              )}
              aria-hidden
            >
              {completos[tab.id] ? "✓" : i + 1}
            </span>
            {tab.label}
            {completos[tab.id] && <span className="sr-only"> (con contenido)</span>}
          </button>
        ))}
      </div>

      <Panel id="previa" activa={activa} visitadas={visitadas}>
        <PreviaPanel
          partidoId={partidoId}
          previa={detalle.previa}
          formacionPropia={detalle.alineacion?.formacion ?? null}
          formacionRival={partido.formacion_rival}
        />
      </Panel>
      <Panel id="informe" activa={activa} visitadas={visitadas}>
        <div className="space-y-8">
          <InformeSofascore partidoId={partidoId} {...sofascore} />
          <div>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">
              Presentación y video del analista
            </h2>
            <InformeRivalPanel partidoId={partidoId} informe={detalle.informe} />
          </div>
        </div>
      </Panel>
      <Panel id="video" activa={activa} visitadas={visitadas}>
        <AnalisisVideoPanel
          partidoId={partidoId}
          analisis={detalle.analisis.filter((a) => a.equipo === "rival")}
        />
      </Panel>
      <Panel id="abp" activa={activa} visitadas={visitadas}>
        <div className="space-y-6">
          <JugadasPartidoPanel
            partidoId={partidoId}
            elegidas={jugadasPartido}
            biblioteca={bibliotecaJugadas}
            jugadores={jugadoresDelPlan}
            convocados={[...convocados]}
            color={colorClub}
          />
          <EmparejamientoMarcas
            partidoId={partidoId}
            plantelRival={sofascore.plantel}
            informe={sofascore.informe}
            jugadores={jugadores}
            titulares={(detalle.alineacion?.titulares ?? []).filter((x): x is string => Boolean(x))}
            convocados={[...convocados]}
            marcas={marcas}
          />
          <div>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">ABP del rival</h2>
            <AbpPanel partidoId={partidoId} abp={detalle.abp} />
          </div>
        </div>
      </Panel>
      <Panel id="plan" activa={activa} visitadas={visitadas}>
        <AsistentePlan
          partidoId={partidoId}
          asistente={asistente.asistente}
          pedido={asistente.pedido}
          macConectada={sofascore.macConectada}
          plan={detalle.plan}
        />
        <div className="h-6" />
        <PlanPartidoEditor
          // Al usar el borrador de Claude, los textos se vuelven a cargar
          key={asistente.asistente?.aplicado_en ?? "plan"}
          partidoId={partidoId}
          plan={detalle.plan}
          principios={principios}
          jugadores={jugadoresDelPlan}
          escenarios={detalle.escenarios}
          formacionPropia={detalle.alineacion?.formacion ?? null}
          formacionRival={partido.formacion_rival}
          resumenPrevia={resumenPrevia}
          tareasSugeridas={tareasSugeridas}
        />
      </Panel>
      <Panel id="convocatoria" activa={activa} visitadas={visitadas}>
        <ConvocatoriaPanel
          partidoId={partidoId}
          alineacion={detalle.alineacion}
          jugadores={jugadores}
          disponibilidad={disponibilidad}
          encabezado={encabezadoConvocatoria}
          fechaPartido={partido.fecha}
          concentracion={detalle.concentracion}
          habitaciones={detalle.habitaciones}
        />
      </Panel>
      <Panel id="vestuario" activa={activa} visitadas={visitadas}>
        <VestuarioPanel partidoId={partidoId} videos={detalle.videos} />
      </Panel>
      <Panel id="post" activa={activa} visitadas={visitadas}>
        <PostPartidoPanel partido={partido} club={club}>
          <EstadisticasPost
            partidoId={partidoId}
            club={club}
            rival={partido.rival?.nombre ?? "Rival"}
            estadisticas={post.estadisticas}
            previos={post.previos}
            pedido={post.pedido}
            macConectada={post.macConectada}
            jugado={partido.fecha <= hoyISO()}
          />
          <JugadoresPost
            partidoId={partidoId}
            jugadores={post.jugadores}
            valoraciones={post.valoraciones}
          />
          <div>
            <h2 className="mb-1 text-lg font-semibold text-slate-900">
              Análisis de video de nuestro equipo
            </h2>
            <p className="mb-3 text-xs text-slate-500">
              Misma estructura que el del rival. Claude lo usa para el borrador de conclusiones:
              cargalo antes de traer los datos (o volvé a traerlos).
            </p>
            <AnalisisVideoPanel
              partidoId={partidoId}
              equipo="propio"
              analisis={detalle.analisis.filter((a) => a.equipo === "propio")}
            />
          </div>
          <PlanVsRealidad
            partidoId={partidoId}
            plan={detalle.plan}
            evaluaciones={
              (post.post?.plan_vs_real ?? {}) as unknown as Record<string, EvaluacionPlan>
            }
            sugerencias={(post.estadisticas?.insights as InsightsPost | undefined)?.plan_vs_real}
          />
          <ConclusionesPost
            partidoId={partidoId}
            insights={(post.estadisticas?.insights ?? {}) as InsightsPost}
            post={post.post}
          />
          <a
            href={`/imprimir/post/${partidoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Informe post partido (PDF)
          </a>
        </PostPartidoPanel>
      </Panel>
      <Panel id="eventos" activa={activa} visitadas={visitadas}>
        <Proximamente>
          El seguimiento en vivo (KPI por tramos, alertas y cambios que actualizan las marcas) se
          define más adelante. Por ahora se registran los eventos del partido.
        </Proximamente>
        <EventosPanel
          partidoId={partidoId}
          videoUrl={videoUrl}
          eventos={detalle.eventos}
          jugadores={jugadores}
          nombreArchivo={exportacion.nombreArchivo}
          meta={exportacion.meta}
        />
      </Panel>
    </div>
  );
}

function Panel({
  id,
  activa,
  visitadas,
  children,
}: {
  id: TabPartido;
  activa: TabPartido;
  visitadas: ReadonlySet<TabPartido>;
  children: React.ReactNode;
}) {
  return (
    <div
      id={`panel-${id}`}
      role="tabpanel"
      aria-labelledby={`tab-${id}`}
      hidden={activa !== id}
      tabIndex={0}
      className="focus:outline-none"
    >
      {visitadas.has(id) && children}
    </div>
  );
}

function Proximamente({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 rounded-xl border border-dashed border-brand-200 bg-brand-50/40 px-4 py-3 text-sm text-slate-600">
      {children}
    </p>
  );
}
