"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { DetallePartido } from "@/lib/data/partidos";
import type { Jugador } from "@/types/jugador";
import { TABS_PARTIDO, type TabPartido } from "@/types/partido";
import { AbpPanel } from "./AbpPanel";
import { AlineacionEditor } from "./AlineacionEditor";
import { InformeRivalPanel } from "./InformeRivalPanel";
import { PlanPartidoPanel } from "./PlanPartidoPanel";
import { EventosPanel } from "./eventos/EventosPanel";

interface Props {
  partidoId: string;
  detalle: DetallePartido;
  jugadores: Jugador[];
  videoUrl: string | null;
  /** Base del nombre de los archivos exportados y metadatos del JSON */
  exportacion: { nombreArchivo: string; meta: Record<string, unknown> };
  tabInicial: TabPartido;
}

export function PartidoTabs({
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
            {tab.label}
          </button>
        ))}
      </div>

      <Panel id="informe" activa={activa} visitadas={visitadas}>
        <InformeRivalPanel partidoId={partidoId} informe={detalle.informe} />
      </Panel>
      <Panel id="plan" activa={activa} visitadas={visitadas}>
        <PlanPartidoPanel partidoId={partidoId} plan={detalle.plan} />
      </Panel>
      <Panel id="abp" activa={activa} visitadas={visitadas}>
        <AbpPanel partidoId={partidoId} abp={detalle.abp} />
      </Panel>
      <Panel id="alineacion" activa={activa} visitadas={visitadas}>
        <AlineacionEditor
          partidoId={partidoId}
          alineacion={detalle.alineacion}
          jugadores={jugadores}
        />
      </Panel>
      <Panel id="eventos" activa={activa} visitadas={visitadas}>
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
