"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  pedirAsistentePlan,
  usarBorradorPlan,
  usarPuntoComoClave,
  validarPunto,
} from "@/app/(dashboard)/partidos/asistente-actions";
import {
  CAMPOS_BORRADOR,
  FUENTE_PUNTO,
  MOMENTO_PUNTO,
  SECCIONES_BORRADOR,
  TIPOS_PUNTO,
  type BorradorPlan,
  type PuntoClave,
  type ValidacionPunto,
} from "@/lib/asistente-plan";
import { cn } from "@/lib/utils/cn";
import type { AsistentePlan as FilaAsistente } from "@/lib/data/asistente-plan";
import type { PedidoSofascore } from "@/types/informe";
import type { PlanPartido } from "@/types/partido";
import { Button } from "@/components/ui/Button";
import { useAccion } from "@/components/ui/useAccion";

const ETIQUETA_CAMPO: Record<string, string> = {
  claves: "Claves",
  objetivo: "Objetivo",
  jugadores_clave: "Jugadores clave",
};

/**
 * Asistente de Claude para el plan: puntos clave con su evidencia (para validar)
 * y un borrador de cada sección que se pasa al plan con un toque.
 */
export function AsistentePlan({
  partidoId,
  asistente,
  pedido,
  macConectada,
  plan,
}: {
  partidoId: string;
  asistente: FilaAsistente | null;
  pedido: PedidoSofascore | null;
  macConectada: boolean;
  plan: PlanPartido | null;
}) {
  const router = useRouter();
  const pedir = useAccion();
  const usar = useAccion();
  const enCurso = pedido?.estado === "pendiente" || pedido?.estado === "procesando";
  const [abierto, setAbierto] = useState(true);

  useEffect(() => {
    if (!enCurso) return;
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [enCurso, router]);

  const puntos = (asistente?.puntos ?? []) as unknown as PuntoClave[];
  const validaciones = (asistente?.validaciones ?? {}) as Record<string, ValidacionPunto>;
  const borrador = (asistente?.borrador ?? {}) as BorradorPlan;
  const fuentes = (asistente?.fuentes ?? {}) as Record<string, number | boolean>;
  const claves = (plan?.claves ?? []).filter(Boolean);

  const tieneTexto = (c: string) =>
    c === "claves"
      ? claves.length > 0
      : c === "jugadores_clave"
        ? ((plan?.jugadores_clave as unknown[] | undefined)?.length ?? 0) > 0
        : Boolean(plan?.[c as keyof PlanPartido]);
  const hayBorrador = (c: string) =>
    c === "claves" || c === "jugadores_clave"
      ? (borrador[c]?.length ?? 0) > 0
      : Boolean(borrador[c as keyof BorradorPlan]);
  const vacios = CAMPOS_BORRADOR.filter((c) => hayBorrador(c) && !tieneTexto(c));

  return (
    <section className="space-y-4 rounded-2xl border border-violet-200 bg-violet-50/40 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">Asistente de Claude</h2>
          <p className="text-sm text-slate-600">
            Lee el informe del rival (con lo que validaron), el video, la previa, nuestros últimos
            post partidos y la autoevaluación. Propone los puntos clave con su evidencia y un
            borrador de cada sección. Lo procesa la Mac del analista (unos 2 minutos).
          </p>
          {pedido && (
            <p
              className={cn(
                "text-sm",
                pedido.estado === "error"
                  ? "text-red-600"
                  : enCurso
                    ? "text-violet-700"
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
        <div className="flex flex-wrap items-center gap-2">
          {asistente && (
            <button
              type="button"
              onClick={() => setAbierto((x) => !x)}
              className="text-sm font-medium text-slate-600 hover:underline"
            >
              {abierto ? "Ocultar" : "Mostrar"}
            </button>
          )}
          <Button
            cargando={pedir.pendiente || enCurso}
            onClick={() => pedir.ejecutar(() => pedirAsistentePlan(partidoId))}
          >
            {enCurso
              ? "Claude está analizando…"
              : asistente
                ? "Volver a analizar"
                : "Analizar con Claude"}
          </Button>
        </div>
        {pedir.error && <p className="w-full text-sm text-red-600">{pedir.error}</p>}
      </div>

      {asistente && abierto && (
        <>
          <p className="flex flex-wrap gap-1.5 text-xs">
            <span className="text-slate-500">
              Generado el{" "}
              {new Intl.DateTimeFormat("es-UY", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "America/Montevideo",
              }).format(new Date(asistente.generado_en))}{" "}
              con:
            </span>
            <Fuente activo={Boolean(fuentes.informe)}>Informe del rival</Fuente>
            <Fuente activo={Number(fuentes.video) > 0}>
              Video del rival{Number(fuentes.video) > 0 ? ` (${fuentes.video})` : ""}
            </Fuente>
            <Fuente activo={Boolean(fuentes.previa)}>Previa</Fuente>
            <Fuente activo={Number(fuentes.post_partidos) > 0}>
              Post partidos ({Number(fuentes.post_partidos) || 0})
            </Fuente>
            <Fuente activo={Boolean(fuentes.autoevaluacion)}>Autoevaluación</Fuente>
          </p>
          {asistente.avisos.length > 0 && (
            <ul className="space-y-0.5 text-xs text-amber-800">
              {asistente.avisos.map((a) => (
                <li key={a}>⚠ {a}</li>
              ))}
            </ul>
          )}

          <div className="grid gap-3 lg:grid-cols-3">
            {TIPOS_PUNTO.map((t) => {
              const lista = puntos.filter((p) => p.tipo === t.valor);
              return (
                <div key={t.valor} className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {t.titulo} ({lista.length})
                  </h3>
                  {lista.length === 0 && <p className="text-xs text-slate-400">Ninguna.</p>}
                  {lista.map((p) => (
                    <Punto
                      key={p.id}
                      partidoId={partidoId}
                      punto={p}
                      chip={t.chip}
                      estado={validaciones[p.id] ?? null}
                      esClave={claves.includes(p.titulo)}
                      clavesLlenas={claves.length >= 3}
                    />
                  ))}
                </div>
              );
            })}
          </div>

          <div className="space-y-3 rounded-xl border border-violet-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-slate-900">Borrador del plan</h3>
                <p className="text-xs text-slate-500">
                  «Usar» copia esa sección al plan (pisa lo que haya). Las frases cortas son las del
                  one sheet.
                </p>
              </div>
              <Button
                className="px-3 py-1.5"
                disabled={vacios.length === 0}
                cargando={usar.pendiente}
                onClick={() => usar.ejecutar(() => usarBorradorPlan(partidoId, vacios, false))}
              >
                {vacios.length === 0
                  ? "No hay secciones vacías"
                  : `Completar lo vacío (${vacios.length})`}
              </Button>
            </div>
            {usar.error && <p className="text-sm text-red-600">{usar.error}</p>}
            <div className="divide-y divide-slate-100">
              {SECCIONES_BORRADOR.map((s) => {
                const campos = s.campos.filter(hayBorrador);
                if (campos.length === 0) return null;
                return (
                  <SeccionBorrador
                    key={s.id}
                    partidoId={partidoId}
                    titulo={s.titulo}
                    campos={campos}
                    borrador={borrador}
                    yaEscrito={campos.some(tieneTexto)}
                  />
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function Fuente({ activo, children }: { activo: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 font-medium ring-1 ring-inset",
        activo
          ? "bg-white text-slate-700 ring-slate-300"
          : "bg-slate-100 text-slate-400 line-through ring-slate-200",
      )}
    >
      {children}
    </span>
  );
}

function Punto({
  partidoId,
  punto,
  chip,
  estado,
  esClave,
  clavesLlenas,
}: {
  partidoId: string;
  punto: PuntoClave;
  chip: string;
  estado: ValidacionPunto | null;
  esClave: boolean;
  clavesLlenas: boolean;
}) {
  const accion = useAccion();
  return (
    <article
      className={cn(
        "space-y-1.5 rounded-lg border bg-white p-3 text-sm",
        estado === "descartado" ? "border-slate-200 opacity-50" : "border-slate-200",
        estado === "confirmado" && "border-emerald-300 ring-1 ring-emerald-200",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className={cn("rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset", chip)}>
          {MOMENTO_PUNTO[punto.momento]}
        </span>
        <span className="text-slate-400">{FUENTE_PUNTO[punto.fuente]}</span>
        {estado && (
          <span
            className={cn(
              "font-semibold",
              estado === "confirmado" ? "text-emerald-700" : "text-slate-500",
            )}
          >
            · {estado === "confirmado" ? "Confirmado" : "Descartado"}
          </span>
        )}
      </div>
      <p className="font-semibold text-slate-900">{punto.titulo}</p>
      <p className="text-xs text-slate-600">{punto.evidencia}</p>
      <div className="flex flex-wrap gap-2 pt-0.5 text-xs">
        <button
          type="button"
          disabled={accion.pendiente}
          onClick={() =>
            accion.ejecutar(() =>
              validarPunto(partidoId, punto.id, estado === "confirmado" ? null : "confirmado"),
            )
          }
          className="font-medium text-emerald-700 hover:underline disabled:opacity-50"
        >
          {estado === "confirmado" ? "Quitar confirmación" : "Confirmar"}
        </button>
        <button
          type="button"
          disabled={accion.pendiente}
          onClick={() =>
            accion.ejecutar(() =>
              validarPunto(partidoId, punto.id, estado === "descartado" ? null : "descartado"),
            )
          }
          className="font-medium text-slate-500 hover:underline disabled:opacity-50"
        >
          {estado === "descartado" ? "Recuperar" : "Descartar"}
        </button>
        {esClave ? (
          <span className="font-medium text-brand-700">✓ Es una de las 3 claves</span>
        ) : (
          !clavesLlenas && (
            <button
              type="button"
              disabled={accion.pendiente}
              onClick={() => accion.ejecutar(() => usarPuntoComoClave(partidoId, punto.id))}
              className="font-medium text-brand-700 hover:underline disabled:opacity-50"
            >
              Usar como clave
            </button>
          )
        )}
      </div>
      {accion.error && <p className="text-xs text-red-600">{accion.error}</p>}
    </article>
  );
}

function SeccionBorrador({
  partidoId,
  titulo,
  campos,
  borrador,
  yaEscrito,
}: {
  partidoId: string;
  titulo: string;
  campos: string[];
  borrador: BorradorPlan;
  yaEscrito: boolean;
}) {
  const accion = useAccion();
  return (
    <details className="group py-2">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-800">
          <span className="mr-1 inline-block text-slate-400 transition-transform group-open:rotate-90">
            ▸
          </span>
          {titulo}
          {yaEscrito && (
            <span className="ml-2 text-xs font-normal text-slate-400">
              (el plan ya tiene texto)
            </span>
          )}
        </span>
        <button
          type="button"
          disabled={accion.pendiente}
          onClick={(e) => {
            e.preventDefault();
            if (
              yaEscrito &&
              !window.confirm("Esto reemplaza lo que ya está escrito en el plan. ¿Seguimos?")
            )
              return;
            accion.ejecutar(() => usarBorradorPlan(partidoId, campos, true));
          }}
          className="shrink-0 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {accion.pendiente ? "Usando…" : "Usar"}
        </button>
      </summary>
      <div className="mt-2 space-y-2 pl-4">
        {campos.map((c) => {
          if (c === "claves")
            return (
              <ol key={c} className="list-inside list-decimal text-sm text-slate-800">
                {borrador.claves?.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ol>
            );
          if (c === "jugadores_clave")
            return (
              <ul key={c} className="space-y-1 text-sm text-slate-800">
                {borrador.jugadores_clave?.map((j) => (
                  <li key={j.nombre}>
                    <b>
                      {j.dorsal !== null && `${j.dorsal}. `}
                      {j.nombre}
                    </b>
                    : {j.como}
                  </li>
                ))}
              </ul>
            );
          const esCorto = c.endsWith("_plantel") || c === "objetivo";
          return (
            <div key={c}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {ETIQUETA_CAMPO[c] ?? (esCorto ? "Para el plantel" : "Cuerpo técnico")}
              </p>
              <p
                className={cn(
                  "whitespace-pre-line text-sm",
                  esCorto ? "font-medium text-slate-900" : "text-slate-700",
                )}
              >
                {borrador[c as keyof BorradorPlan] as string}
              </p>
            </div>
          );
        })}
        {accion.error && <p className="text-xs text-red-600">{accion.error}</p>}
      </div>
    </details>
  );
}
