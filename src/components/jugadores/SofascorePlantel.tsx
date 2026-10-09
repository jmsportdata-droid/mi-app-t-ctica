"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  agregarDesdeSofascore,
  pedirPlantelSofascore,
} from "@/app/(dashboard)/plantilla/sofascore-actions";
import { cn } from "@/lib/utils/cn";
import type { AnalisisPropio } from "@/lib/data/informe";
import { GRUPOS_CLAVES, type InsightsInforme, type PedidoSofascore } from "@/types/informe";
import { Button } from "@/components/ui/Button";
import { useAccion } from "@/components/ui/useAccion";

interface NoVinculado {
  sofascore_id: string;
  nombre: string;
  dorsal: number | null;
  linea: string;
  altura_cm: number | null;
  minutos: number | null;
}

const LINEA: Record<string, string> = {
  POR: "Arquero",
  DEF: "Defensor",
  CEN: "Mediocampista",
  DEL: "Delantero",
};

/** Datos de Sofascore de nuestro equipo: actualizar, sumar al plantel los que faltan y autoevaluación. */
export function SofascorePlantel({
  analisis,
  pedido,
  macConectada,
  sinSofascore,
}: {
  analisis: AnalisisPropio | null;
  pedido: PedidoSofascore | null;
  macConectada: boolean;
  /** Jugadores del plantel que no aparecen en Sofascore */
  sinSofascore: { id: string; nombre: string; numero: number | null }[];
}) {
  const router = useRouter();
  const pedir = useAccion();
  const agregar = useAccion();
  const enCurso = pedido?.estado === "pendiente" || pedido?.estado === "procesando";
  const faltan = ((analisis?.no_vinculados ?? []) as unknown as NoVinculado[]).filter(
    (j) => (j.minutos ?? 0) > 0,
  );
  const [elegidos, setElegidos] = useState<Set<string>>(
    () => new Set(faltan.map((j) => j.sofascore_id)),
  );
  const [aviso, setAviso] = useState<string | null>(null);
  const insights = (analisis?.insights ?? {}) as InsightsInforme;

  useEffect(() => {
    if (!enCurso) return;
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [enCurso, router]);

  // Al llegar datos nuevos, quedan elegidos todos los que faltan
  const claveFaltan = faltan.map((j) => j.sofascore_id).join(",");
  useEffect(() => {
    setElegidos(new Set(claveFaltan ? claveFaltan.split(",") : []));
  }, [claveFaltan]);

  return (
    <section className="mb-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="font-semibold text-slate-900">Datos de Sofascore</h2>
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
            {analisis && (
              <span>
                · actualizado el{" "}
                {new Intl.DateTimeFormat("es-UY", {
                  day: "numeric",
                  month: "short",
                  timeZone: "America/Montevideo",
                }).format(new Date(analisis.generado_en))}
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
          onClick={() => pedir.ejecutar(() => pedirPlantelSofascore())}
        >
          {enCurso ? "Actualizando…" : "Actualizar desde Sofascore"}
        </Button>
        {pedir.error && <p className="w-full text-sm text-red-600">{pedir.error}</p>}
      </div>
      <p className="text-xs text-slate-500">
        Trae los últimos partidos del equipo: altura, pie y estadísticas de cada jugador (aéreos,
        duelos, ABP, xG, nota). Se ven en la ficha de cada uno y los usa el emparejamiento de
        marcas.
      </p>

      {faltan.length > 0 && (
        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Juegan en Sofascore pero no están en el plantel ({faltan.length})
              </h3>
              <p className="text-xs text-slate-600">
                Se agregan con dorsal, puesto, altura, pie, nacionalidad y sus estadísticas. Si el
                dorsal ya lo tiene otro jugador, entra sin número.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-xs font-medium text-slate-600 hover:underline"
                onClick={() =>
                  setElegidos(
                    elegidos.size === faltan.length
                      ? new Set()
                      : new Set(faltan.map((j) => j.sofascore_id)),
                  )
                }
              >
                {elegidos.size === faltan.length ? "Ninguno" : "Todos"}
              </button>
              <Button
                className="px-3 py-1.5"
                cargando={agregar.pendiente}
                disabled={elegidos.size === 0}
                onClick={() =>
                  agregar.ejecutar(async () => {
                    const r = await agregarDesdeSofascore([...elegidos]);
                    if (!r.ok) return r;
                    setAviso(
                      `Se agregaron ${r.agregados} jugadores` +
                        (r.sinNumero > 0
                          ? ` (${r.sinNumero} sin número: el dorsal estaba ocupado).`
                          : "."),
                    );
                    return { ok: true };
                  })
                }
              >
                Agregar {elegidos.size} al plantel
              </Button>
            </div>
          </div>
          <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {faltan.map((j) => (
              <li key={j.sofascore_id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 text-sm ring-1 ring-inset ring-slate-200">
                  <input
                    type="checkbox"
                    checked={elegidos.has(j.sofascore_id)}
                    onChange={(e) => {
                      const x = new Set(elegidos);
                      if (e.target.checked) x.add(j.sofascore_id);
                      else x.delete(j.sofascore_id);
                      setElegidos(x);
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600"
                  />
                  <span className="w-6 text-right text-xs font-bold tabular-nums text-slate-500">
                    {j.dorsal ?? "—"}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-900">
                    {j.nombre}
                  </span>
                  <span className="text-xs text-slate-500">
                    {LINEA[j.linea] ?? j.linea}
                    {j.minutos ? ` · ${j.minutos}′` : ""}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {agregar.error && <p className="text-sm text-red-600">{agregar.error}</p>}
        </div>
      )}
      {aviso && <p className="text-sm text-emerald-700">{aviso}</p>}

      {analisis && sinSofascore.length > 0 && (
        <details className="rounded-xl border border-slate-200 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">
            En el plantel pero sin minutos en los últimos partidos ({sinSofascore.length})
          </summary>
          <p className="mt-1 text-xs text-slate-500">
            Pueden ser suplentes que no entraron, juveniles o jugadores que ya no están en el club.
            Si se fueron, sacalos desde su ficha.
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {sinSofascore.map((j) => (
              <li key={j.id}>
                <Link
                  href={`/plantilla/${j.id}`}
                  className="inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                >
                  {j.numero ? `${j.numero}. ` : ""}
                  {j.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}

      {insights.claves && (
        <details className="rounded-xl border border-slate-200 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">
            Autoevaluación de Claude (borrador: validar con video)
          </summary>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {GRUPOS_CLAVES.map((g) => {
              const lista = insights.claves?.[g.clave] ?? [];
              if (lista.length === 0) return null;
              return (
                <div key={g.clave} className={cn("rounded-xl border p-3", g.color)}>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {g.clave === "debilidades"
                      ? "Para corregir"
                      : g.clave === "recomendaciones"
                        ? "Para trabajar en la semana"
                        : g.titulo}
                  </h4>
                  <ul className="list-inside list-disc space-y-1 text-sm text-slate-800">
                    {lista.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </section>
  );
}
