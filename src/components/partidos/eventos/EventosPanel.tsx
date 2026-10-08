"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { guardarVideoPartido } from "@/app/(dashboard)/partidos/avanzado-actions";
import { descargarArchivo, eventosACsv, eventosAJson } from "@/lib/export";
import { cn } from "@/lib/utils/cn";
import { TIPOS_EVENTO, type EventoPartido, type TipoEvento } from "@/types/evento";
import type { Jugador } from "@/types/jugador";
import { AutoSaveField } from "@/components/ui/AutoSaveField";
import { VideoEmbed } from "../Embeds";
import { EventosCampo } from "./EventosCampo";

import { EventosLista } from "./EventosLista";
import { NuevoEventoForm } from "./NuevoEventoForm";

// Recharts solo se descarga al abrir la vista de gráficas
const EventosGraficas = dynamic(() => import("./EventosGraficas").then((m) => m.EventosGraficas), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-xl bg-slate-100" />,
});

const VISTAS = [
  { id: "lista", label: "Lista" },
  { id: "campo", label: "Campo" },
  { id: "graficas", label: "Gráficas" },
] as const;
type Vista = (typeof VISTAS)[number]["id"];

interface Props {
  partidoId: string;
  videoUrl: string | null;
  eventos: EventoPartido[];
  jugadores: Jugador[];
  /** Base del nombre de los archivos exportados (sin extensión) */
  nombreArchivo: string;
  /** Datos del partido incluidos en el JSON exportado */
  meta: Record<string, unknown>;
}

function ordenar(eventos: EventoPartido[]): EventoPartido[] {
  return [...eventos].sort((a, b) => a.minuto - b.minuto || a.creado_en.localeCompare(b.creado_en));
}

export function EventosPanel({
  partidoId,
  videoUrl,
  eventos: iniciales,
  jugadores,
  nombreArchivo,
  meta,
}: Props) {
  const [eventos, setEventos] = useState(() => ordenar(iniciales));
  const [tipoNuevo, setTipoNuevo] = useState<TipoEvento | null>(null);
  const [vista, setVista] = useState<Vista>("lista");

  const nombres = useMemo(() => new Map(jugadores.map((j) => [j.id, j.nombre])), [jugadores]);
  const nombreJugador = (id: string | null) =>
    id ? (nombres.get(id) ?? "Jugador eliminado") : null;
  const ultimoMinuto = eventos.reduce((max, e) => Math.max(max, e.minuto), 0);

  function exportarCsv() {
    descargarArchivo(
      `${nombreArchivo}.csv`,
      eventosACsv(eventos, nombreJugador),
      "text/csv;charset=utf-8",
    );
  }
  function exportarJson() {
    descargarArchivo(
      `${nombreArchivo}.json`,
      eventosAJson(eventos, nombreJugador, meta),
      "application/json;charset=utf-8",
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <AutoSaveField
          label="Vídeo del partido"
          tipo="url"
          placeholder="https://vimeo.com/… o https://youtube.com/watch?v=…"
          ayuda="Vimeo o YouTube."
          valorInicial={videoUrl}
          onGuardar={(v) => guardarVideoPartido(partidoId, v)}
        >
          {(url) => (
            <div className="pt-2">
              <VideoEmbed url={url} titulo="Vídeo del partido" />
            </div>
          )}
        </AutoSaveField>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-slate-900">Registrar evento</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TIPOS_EVENTO.map((t) => (
            <button
              key={t.valor}
              type="button"
              onClick={() => setTipoNuevo(tipoNuevo === t.valor ? null : t.valor)}
              aria-pressed={tipoNuevo === t.valor}
              className={cn(
                "rounded-xl px-4 py-4 text-base font-bold uppercase tracking-wider text-white shadow-sm transition-all hover:brightness-110 active:scale-95",
                tipoNuevo === t.valor && "ring-4 ring-offset-2",
              )}
              style={{ backgroundColor: t.color, ["--tw-ring-color" as string]: `${t.color}66` }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tipoNuevo && (
          <NuevoEventoForm
            key={tipoNuevo}
            partidoId={partidoId}
            tipo={tipoNuevo}
            jugadores={jugadores}
            minutoSugerido={ultimoMinuto}
            onCreado={(evento) => {
              setEventos((prev) => ordenar([...prev, evento]));
              setTipoNuevo(null);
            }}
            onCancelar={() => setTipoNuevo(null)}
          />
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-slate-900">Historial</h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {eventos.length}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="tablist"
              aria-label="Vista del historial"
              className="inline-flex rounded-lg bg-slate-100 p-1"
            >
              {VISTAS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  aria-selected={vista === v.id}
                  onClick={() => setVista(v.id)}
                  className={cn(
                    "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                    vista === v.id
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <BotonExportar onClick={exportarCsv} disabled={eventos.length === 0}>
              Exportar CSV
            </BotonExportar>
            <BotonExportar onClick={exportarJson} disabled={eventos.length === 0}>
              Descargar JSON
            </BotonExportar>
          </div>
        </div>

        {vista === "lista" && (
          <EventosLista
            partidoId={partidoId}
            eventos={eventos}
            nombreJugador={nombreJugador}
            onEliminado={(id) => setEventos((prev) => prev.filter((e) => e.id !== id))}
          />
        )}
        {vista === "campo" && <EventosCampo eventos={eventos} nombreJugador={nombreJugador} />}
        {vista === "graficas" && <EventosGraficas eventos={eventos} />}
      </section>
    </div>
  );
}

function BotonExportar({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
      {children}
    </button>
  );
}
