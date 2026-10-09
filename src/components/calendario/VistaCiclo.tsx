"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  armarEsqueletoTipo,
  crearBloque,
  moverBloque,
} from "@/app/(dashboard)/microciclo/bloques-actions";
import { BLOQUES_PALETA } from "@/lib/bloques";
import { etiquetaMD, rangoFechas, SEMANA_TIPO, type PartidoReferencia } from "@/lib/calendario";
import { cn } from "@/lib/utils/cn";
import { INFO_ACTIVIDAD, type Actividad, type TipoActividad } from "@/types/calendario";
import type { ResumenSesion } from "@/types/sesion";
import { INFO_ORIENTACION } from "@/types/tarea";
import { Button } from "@/components/ui/Button";
import { TarjetaActividad } from "./TarjetaActividad";

/** Jugadores no disponibles en un día. */
export interface BajasDelDia {
  bajas: number;
  limitados: number;
}

interface Props {
  desde: string;
  hasta: string;
  hoy: string;
  actividades: Actividad[];
  partidos: PartidoReferencia[];
  /** Resumen de la sesión de cada bloque con ejercicios (por id de actividad) */
  resumenes: Record<string, ResumenSesion>;
  /** Número de sesión de cada entrenamiento en el microciclo */
  numeroSesion: Record<string, number>;
  /** Con paleta de bloques, arrastrar y soltar y esqueleto tipo (Microciclo) */
  editable?: boolean;
  /** No disponibles por fecha */
  disponibilidad?: Record<string, BajasDelDia>;
}

const DIA_SEMANA = new Intl.DateTimeFormat("es-UY", { weekday: "short", timeZone: "UTC" });
const DIA_MES = new Intl.DateTimeFormat("es-UY", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const aFecha = (f: string) => new Date(`${f}T00:00:00Z`);

type Seleccion = { tipo: "bloque"; valor: TipoActividad } | { tipo: "mover"; valor: string } | null;

/**
 * Los días del ciclo en columnas (tablet y computadora) o uno abajo del otro
 * (celular), con la etiqueta de día de partido (MD-3, MD, MD+1…). En el
 * Microciclo se arma arrastrando bloques desde la paleta (o tocando el bloque y
 * después el día) y moviendo las tarjetas de un día a otro.
 */
export function VistaCiclo({
  desde,
  hasta,
  hoy,
  actividades,
  partidos,
  resumenes,
  numeroSesion,
  editable = false,
  disponibilidad = {},
}: Props) {
  const router = useRouter();
  const dias = rangoFechas(desde, hasta);
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<Seleccion>(null);
  const [sobre, setSobre] = useState<string | null>(null);

  function correr(accion: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      try {
        const r = await accion();
        if (!r.ok) setError(r.error);
        else router.refresh();
      } catch {
        setError("Error de conexión. Probá de nuevo.");
      }
    });
  }

  function soltar(fecha: string, dato: string) {
    setSobre(null);
    setSeleccion(null);
    const [clase, valor] = dato.split(":");
    if (!valor) return;
    if (clase === "bloque") correr(() => crearBloque(fecha, valor));
    if (clase === "mover") {
      const a = actividades.find((x) => x.id === valor);
      if (a && a.fecha !== fecha) correr(() => moverBloque(valor, fecha));
    }
  }

  function esqueleto() {
    setError(null);
    setAviso(null);
    startTransition(async () => {
      try {
        const r = await armarEsqueletoTipo(desde, hasta);
        if (!r.ok) setError(r.error);
        else {
          setAviso(
            r.creados === 0
              ? "No había días vacíos para completar."
              : `Listo: ${r.creados} bloques en ${r.dias} días. Ajustá lo que haga falta.`,
          );
          router.refresh();
        }
      } catch {
        setError("Error de conexión. Probá de nuevo.");
      }
    });
  }

  const etiquetaSeleccion =
    seleccion?.tipo === "bloque"
      ? INFO_ACTIVIDAD[seleccion.valor].label
      : seleccion?.tipo === "mover"
        ? (actividades.find((a) => a.id === seleccion.valor)?.titulo ?? "el bloque")
        : null;

  return (
    <div>
      {editable && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Button
            variante="secondary"
            className="px-3 py-1.5"
            cargando={pendiente}
            onClick={esqueleto}
          >
            Armar esqueleto tipo
          </Button>
          <p className="text-xs text-slate-500">
            Completa los días vacíos con la estructura del manual (MD-4 tensión, MD-3 duración, MD-2
            velocidad, MD-1 activación). Después arrastrá, mové o borrá lo que quieras.
          </p>
          {aviso && <p className="w-full text-sm text-emerald-700">{aviso}</p>}
        </div>
      )}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {etiquetaSeleccion && (
        <p className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-900">
          {seleccion?.tipo === "bloque" ? "Tocá el día donde va" : "Tocá el día al que se mueve"}{" "}
          <b>«{etiquetaSeleccion}»</b>.
          <button
            type="button"
            onClick={() => setSeleccion(null)}
            className="font-medium underline"
          >
            Cancelar
          </button>
        </p>
      )}

      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div
          className="flex flex-col gap-3 md:grid md:gap-2 md:[grid-template-columns:repeat(var(--dias),minmax(9.5rem,1fr))]"
          style={{ "--dias": dias.length } as React.CSSProperties}
        >
          {dias.map((fecha) => {
            const etiqueta = etiquetaMD(fecha, partidos);
            const delDia = actividades
              .filter((a) => a.fecha === fecha)
              .sort((a, b) => (a.hora_inicio ?? "99").localeCompare(b.hora_inicio ?? "99"));
            const esHoy = fecha === hoy;
            const esPartido = etiqueta?.offset === 0;
            const tipo = etiqueta ? SEMANA_TIPO[etiqueta.texto] : undefined;
            const disp = disponibilidad[fecha];
            const destino = editable && Boolean(seleccion);
            return (
              <section
                key={fecha}
                aria-label={`${DIA_SEMANA.format(aFecha(fecha))} ${DIA_MES.format(aFecha(fecha))}`}
                onDragOver={
                  editable
                    ? (e) => {
                        e.preventDefault();
                        setSobre(fecha);
                      }
                    : undefined
                }
                onDragLeave={editable ? () => setSobre((s) => (s === fecha ? null : s)) : undefined}
                onDrop={
                  editable
                    ? (e) => {
                        e.preventDefault();
                        soltar(fecha, e.dataTransfer.getData("text/plain"));
                      }
                    : undefined
                }
                className={cn(
                  "flex min-h-40 flex-col rounded-xl border bg-white p-2 shadow-sm transition-colors",
                  esHoy ? "border-brand-500 ring-1 ring-brand-500" : "border-slate-200",
                  esPartido && "bg-slate-50",
                  sobre === fecha && "border-brand-500 bg-brand-50/60 ring-2 ring-brand-400",
                )}
              >
                <header className="mb-2 flex items-center justify-between gap-2 px-1">
                  <div className="leading-tight">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {DIA_SEMANA.format(aFecha(fecha))}
                      {esHoy && <span className="ml-1 text-brand-700">· hoy</span>}
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      {DIA_MES.format(aFecha(fecha))}
                    </p>
                  </div>
                  {etiqueta && (
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums",
                        esPartido ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {etiqueta.texto}
                    </span>
                  )}
                </header>
                {tipo && (
                  <p
                    className="mb-2 px-1 text-[11px] leading-snug text-slate-500"
                    title={tipo.foco}
                  >
                    <span className="font-semibold text-slate-700">
                      {INFO_ORIENTACION[tipo.orientacion].label}
                    </span>{" "}
                    · {tipo.foco}
                  </p>
                )}
                {disp && (disp.bajas > 0 || disp.limitados > 0) && (
                  <p className="mb-2 px-1 text-[11px] font-medium text-red-700">
                    {[
                      disp.bajas > 0 && `${disp.bajas} ${disp.bajas === 1 ? "baja" : "bajas"}`,
                      disp.limitados > 0 &&
                        `${disp.limitados} limitado${disp.limitados === 1 ? "" : "s"}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}

                <div className="flex flex-1 flex-col gap-1.5">
                  {delDia.map((a) => (
                    <div
                      key={a.id}
                      draggable={editable && a.tipo !== "partido"}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", `mover:${a.id}`);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className={cn(
                        editable && a.tipo !== "partido" && "cursor-grab active:cursor-grabbing",
                      )}
                    >
                      <TarjetaActividad
                        actividad={a}
                        resumen={resumenes[a.id]}
                        numeroSesion={numeroSesion[a.id]}
                      />
                      {editable && a.tipo !== "partido" && (
                        <button
                          type="button"
                          onClick={() => setSeleccion({ tipo: "mover", valor: a.id })}
                          className="mt-0.5 w-full text-right text-[10px] text-slate-400 hover:text-slate-600 md:hidden"
                        >
                          Mover de día
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {destino ? (
                  <button
                    type="button"
                    disabled={pendiente}
                    onClick={() =>
                      seleccion && soltar(fecha, `${seleccion.tipo}:${seleccion.valor}`)
                    }
                    className="mt-2 rounded-lg border-2 border-dashed border-brand-400 bg-brand-50 py-2 text-center text-sm font-semibold text-brand-800"
                  >
                    Poner acá
                  </button>
                ) : (
                  <div className="mt-2 flex gap-1">
                    <Link
                      href={`/calendario/nueva?fecha=${fecha}`}
                      className="flex-1 rounded-lg border border-dashed border-slate-300 py-1.5 text-center text-sm font-medium text-slate-500 transition-colors hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
                      aria-label={`Agregar actividad el ${DIA_MES.format(aFecha(fecha))}`}
                    >
                      + Agregar
                    </Link>
                    {editable && delDia.length > 0 && (
                      <Link
                        href={`/imprimir/dia/${fecha}`}
                        target="_blank"
                        title="Día completo en PDF"
                        className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
                      >
                        PDF
                      </Link>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>

      {editable && (
        <div className="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
          <p className="mb-2 text-xs font-medium text-slate-500">
            Arrastrá un bloque a un día (o tocalo y después tocá el día)
            {pendiente && " · guardando…"}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {BLOQUES_PALETA.map((b) => {
              const info = INFO_ACTIVIDAD[b.tipo];
              const activo = seleccion?.tipo === "bloque" && seleccion.valor === b.tipo;
              return (
                <li key={b.tipo}>
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", `bloque:${b.tipo}`);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => setSeleccion(activo ? null : { tipo: "bloque", valor: b.tipo })}
                    title={b.ayuda}
                    className={cn(
                      "flex cursor-grab items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset active:cursor-grabbing",
                      info.color,
                      activo && "ring-2 ring-brand-600",
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full", info.punto)} aria-hidden />
                    {info.label}
                    {b.inicio && (
                      <span className="text-[11px] font-normal opacity-70">{b.inicio}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
