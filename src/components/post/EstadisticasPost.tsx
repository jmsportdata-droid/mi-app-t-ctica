"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { pedirPostPartido } from "@/app/(dashboard)/partidos/post-actions";
import {
  GRUPOS_KPI,
  formatearKpi,
  promedioKpi,
  tendencia,
  valorRival,
  xgPorTramo,
  type DefinicionKpi,
  type Stats,
  type Tiro,
} from "@/lib/post-partido";
import { cn } from "@/lib/utils/cn";
import type { EstadisticasPartido, PartidoPrevio } from "@/lib/data/post-partido";
import type { PedidoSofascore } from "@/types/informe";
import { Button } from "@/components/ui/Button";
import { useAccion } from "@/components/ui/useAccion";

interface Incidencia {
  tipo: "gol" | "tarjeta" | "cambio";
  minuto: number | null;
  extra?: number | null;
  propio: boolean;
  jugador?: string | null;
  asistencia?: string | null;
  clase?: string | null;
  color?: string | null;
  entra?: string | null;
  sale?: string | null;
}

const minuto = (i: { minuto: number | null; extra?: number | null }) =>
  `${i.minuto ?? "?"}${i.extra ? `+${i.extra}` : ""}′`;

/** Estadísticas del partido (Sofascore o Wyscout): KPI vs rival y vs nuestros últimos partidos. */
export function EstadisticasPost({
  partidoId,
  club,
  rival,
  estadisticas,
  previos,
  pedido,
  macConectada,
  jugado,
}: {
  partidoId: string;
  club: string;
  rival: string;
  estadisticas: EstadisticasPartido | null;
  previos: PartidoPrevio[];
  pedido: PedidoSofascore | null;
  macConectada: boolean;
  /** El partido ya se jugó (fecha de hoy o anterior) */
  jugado: boolean;
}) {
  const router = useRouter();
  const pedir = useAccion();
  const enCurso = pedido?.estado === "pendiente" || pedido?.estado === "procesando";

  useEffect(() => {
    if (!enCurso) return;
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [enCurso, router]);

  const propio = (estadisticas?.propio ?? {}) as Stats;
  const suyo = (estadisticas?.rival ?? {}) as Stats;
  const anteriores = previos.map((p) => ({ propio: p.propio, rival: p.rival_stats }));
  const tiros = (estadisticas?.tiros ?? []) as unknown as Tiro[];
  const incidencias = (estadisticas?.incidencias ?? []) as unknown as Incidencia[];

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">Estadísticas del partido</h2>
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                macConectada ? "bg-emerald-500" : "bg-slate-300",
              )}
              aria-hidden
            />
            {macConectada
              ? "La Mac del analista está conectada"
              : "La Mac del analista no está conectada"}
            {estadisticas && (
              <span>
                · {estadisticas.fuente === "wyscout" ? "Wyscout" : "Sofascore"},{" "}
                {new Intl.DateTimeFormat("es-UY", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "America/Montevideo",
                }).format(new Date(estadisticas.generado_en))}
              </span>
            )}
          </p>
          {pedido && (
            <p
              className={cn(
                "text-sm",
                pedido.estado === "error"
                  ? "text-red-600"
                  : enCurso
                    ? "text-brand-700"
                    : "text-slate-600",
              )}
            >
              {pedido.estado === "pendiente" &&
                (macConectada
                  ? "En cola: la Mac lo toma en unos segundos…"
                  : "En cola: se procesa cuando se prenda la Mac.")}
              {pedido.estado === "procesando" && (pedido.mensaje ?? "Procesando…")}
              {pedido.estado === "listo" && `✓ ${pedido.mensaje ?? "Listo"}`}
              {pedido.estado === "error" && `No se pudo: ${pedido.mensaje ?? "error"}`}
            </p>
          )}
        </div>
        <Button
          cargando={pedir.pendiente || enCurso}
          disabled={!jugado}
          onClick={() => pedir.ejecutar(() => pedirPostPartido(partidoId))}
        >
          {enCurso
            ? "Trayendo datos…"
            : estadisticas
              ? "Actualizar desde Sofascore"
              : "Traer de Sofascore"}
        </Button>
        {pedir.error && <p className="w-full text-sm text-red-600">{pedir.error}</p>}
      </div>

      {!estadisticas ? (
        <p className="text-sm text-slate-500">
          {jugado
            ? "Cuando termine el partido, tocá «Traer de Sofascore»: llegan las estadísticas de los dos equipos, los minutos, notas y tarjetas de cada jugador (también km y sprints), el resultado y un borrador de conclusiones de Claude."
            : "Se habilita el día del partido."}
        </p>
      ) : (
        <>
          {estadisticas.avisos.length > 0 && (
            <ul className="space-y-1 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              {estadisticas.avisos.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-slate-600">
            <span>
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-brand-600" aria-hidden />{" "}
              {club}
              {estadisticas.formacion_propia && ` (${estadisticas.formacion_propia})`}
            </span>
            <span>
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-400" aria-hidden />{" "}
              {rival}
              {estadisticas.formacion_rival && ` (${estadisticas.formacion_rival})`}
            </span>
            <span className="text-xs text-slate-500">
              {previos.length > 0
                ? `▲ ▼ contra nuestro promedio de los últimos ${previos.length} partido${previos.length === 1 ? "" : "s"}`
                : "Con más post partidos cargados aparece la comparación con nuestro promedio."}
            </span>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {GRUPOS_KPI.map((g) => {
              const filas = g.kpis.filter(
                (k) => k.valor(propio, suyo) !== null || valorRival(k, propio, suyo) !== null,
              );
              if (filas.length === 0) return null;
              return (
                <div key={g.titulo} className="rounded-xl border border-slate-200 p-4">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {g.titulo}
                  </h3>
                  <ul className="space-y-2.5">
                    {filas.map((k) => (
                      <FilaKpi
                        key={k.clave}
                        k={k}
                        nos={k.valor(propio, suyo)}
                        ellos={valorRival(k, propio, suyo)}
                        promedio={promedioKpi(k, anteriores)}
                      />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {tiros.length > 0 && <XgPorTramos tiros={tiros} />}
          {incidencias.length > 0 && <Incidencias incidencias={incidencias} />}
        </>
      )}
    </section>
  );
}

function FilaKpi({
  k,
  nos,
  ellos,
  promedio,
}: {
  k: DefinicionKpi;
  nos: number | null;
  ellos: number | null;
  promedio: number | null;
}) {
  const max = Math.max(nos ?? 0, ellos ?? 0) || 1;
  const t = tendencia(k, nos, promedio);
  return (
    <li className="grid grid-cols-[3.5rem_1fr_3.5rem] items-end gap-2" title={k.ayuda}>
      <span className="text-right text-sm font-bold tabular-nums text-slate-900">
        {formatearKpi(k, nos)}
      </span>
      <div>
        <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
          <span className="font-medium text-slate-700">{k.label}</span>
          {promedio !== null && (
            <span
              className={cn(
                "whitespace-nowrap tabular-nums",
                t === 1 ? "text-emerald-700" : t === -1 ? "text-red-600" : "text-slate-400",
              )}
            >
              {t === 1 ? "▲ " : t === -1 ? "▼ " : ""}prom. {formatearKpi(k, promedio)}
            </span>
          )}
        </div>
        <div className="flex h-2 gap-px overflow-hidden rounded-full bg-slate-100">
          <div className="flex flex-1 justify-end">
            <div
              className="h-full rounded-l-full bg-brand-600"
              style={{ width: `${(100 * (nos ?? 0)) / max}%` }}
            />
          </div>
          <div className="flex-1">
            <div
              className="h-full rounded-r-full bg-slate-400"
              style={{ width: `${(100 * (ellos ?? 0)) / max}%` }}
            />
          </div>
        </div>
      </div>
      <span className="text-sm tabular-nums text-slate-600">{formatearKpi(k, ellos)}</span>
    </li>
  );
}

function XgPorTramos({ tiros }: { tiros: Tiro[] }) {
  const tramos = xgPorTramo(tiros);
  const max = Math.max(0.3, ...tramos.flatMap((t) => [t.propio, t.rival]));
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        xG por tramos de 15′
      </h3>
      <div className="grid grid-cols-6 gap-3">
        {tramos.map((t) => (
          <div key={t.tramo} className="flex flex-col items-center gap-1">
            <div className="flex h-28 items-end gap-1" aria-hidden>
              <div
                className="w-4 rounded-t bg-brand-600"
                style={{ height: `${(100 * t.propio) / max}%` }}
              />
              <div
                className="w-4 rounded-t bg-slate-400"
                style={{ height: `${(100 * t.rival) / max}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-slate-700">
              {t.propio.toFixed(2)} – {t.rival.toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-500">{t.tramo}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Incidencias({ incidencias }: { incidencias: Incidencia[] }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Incidencias
      </h3>
      <ol className="grid gap-1.5 text-sm sm:grid-cols-2">
        {incidencias.map((i, n) => (
          <li key={n} className={cn("flex items-baseline gap-2", i.propio ? "" : "text-slate-500")}>
            <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums">
              {minuto(i)}
            </span>
            {i.tipo === "gol" && (
              <span>
                <b>Gol {i.propio ? "nuestro" : "del rival"}</b>: {i.jugador}
                {i.clase === "penalty" && " (penal)"}
                {i.clase === "ownGoal" && " (en contra)"}
                {i.asistencia && ` · asistencia de ${i.asistencia}`}
              </span>
            )}
            {i.tipo === "tarjeta" && (
              <span className="flex items-baseline gap-1.5">
                <span
                  className={cn(
                    "inline-block h-3 w-2 translate-y-0.5 rounded-[2px]",
                    i.color === "yellow" ? "bg-yellow-400" : "bg-red-600",
                  )}
                  aria-hidden
                />
                {i.color === "yellow"
                  ? "Amarilla"
                  : i.color === "yellowRed"
                    ? "Doble amarilla"
                    : "Roja"}
                : {i.jugador}
              </span>
            )}
            {i.tipo === "cambio" && (
              <span>
                Cambio: entra <b className="font-medium">{i.entra}</b> por {i.sale}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
