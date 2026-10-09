"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { pedirPostPartido } from "@/app/(dashboard)/partidos/post-actions";
import type { Stats, Tiro } from "@/lib/post-partido";
import { cn } from "@/lib/utils/cn";
import type { EstadisticasPartido, PartidoPrevio } from "@/lib/data/post-partido";
import type { PedidoSofascore } from "@/types/informe";
import { Button } from "@/components/ui/Button";
import { Incidencias, KpisEnfrentados, XgPorTramos, type Incidencia } from "./KpisPartido";
import { useAccion } from "@/components/ui/useAccion";

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

          <KpisEnfrentados propio={propio} rival={suyo} anteriores={anteriores} />

          {tiros.length > 0 && <XgPorTramos tiros={tiros} />}
          {incidencias.length > 0 && <Incidencias incidencias={incidencias} />}
        </>
      )}
    </section>
  );
}
