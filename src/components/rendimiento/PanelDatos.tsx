"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { pedirImportacion, pedirLiga } from "@/app/(dashboard)/rendimiento/actions";
import { cn } from "@/lib/utils/cn";
import type { PedidoSofascore } from "@/types/informe";
import { Button } from "@/components/ui/Button";
import { useAccion } from "@/components/ui/useAccion";

const enCurso = (p: PedidoSofascore | null) =>
  p?.estado === "pendiente" || p?.estado === "procesando";

function Estado({
  pedido,
  macConectada,
}: {
  pedido: PedidoSofascore | null;
  macConectada: boolean;
}) {
  if (!pedido) return null;
  return (
    <p
      className={cn(
        "text-xs",
        pedido.estado === "error"
          ? "text-red-600"
          : enCurso(pedido)
            ? "text-brand-700"
            : "text-slate-500",
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
  );
}

/** Pedidos a la Mac: datos de la liga (percentiles) e importación de la temporada. */
export function PanelDatos({
  liga,
  importacion,
  macConectada,
  ligaActualizada,
}: {
  liga: PedidoSofascore | null;
  importacion: PedidoSofascore | null;
  macConectada: boolean;
  /** Fecha de la última actualización de la liga */
  ligaActualizada: string | null;
}) {
  const router = useRouter();
  const pedirL = useAccion();
  const pedirI = useAccion();
  const algoEnCurso = enCurso(liga) || enCurso(importacion);

  useEffect(() => {
    if (!algoEnCurso) return;
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [algoEnCurso, router]);

  return (
    <details className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-900">
        <span className="text-slate-400 transition-transform group-open:rotate-90">▸</span>
        Datos de Sofascore
        <span
          className={cn("h-2 w-2 rounded-full", macConectada ? "bg-emerald-500" : "bg-slate-300")}
          aria-hidden
        />
        <span className="text-xs font-normal text-slate-500">
          {macConectada ? "Mac conectada" : "Mac no conectada"}
        </span>
      </summary>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-xl bg-slate-50 p-3">
          <p className="text-sm font-medium text-slate-800">Liga (percentiles)</p>
          <p className="text-xs text-slate-500">
            Estadísticas de temporada de todos los equipos y jugadores de la competencia. Unos 15
            segundos.
            {ligaActualizada &&
              ` Última actualización: ${new Intl.DateTimeFormat("es-UY", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "America/Montevideo",
              }).format(new Date(ligaActualizada))}.`}
          </p>
          <Button
            variante="secondary"
            className="px-3 py-1.5"
            cargando={pedirL.pendiente || enCurso(liga)}
            onClick={() => pedirL.ejecutar(() => pedirLiga())}
          >
            {enCurso(liga) ? "Actualizando…" : "Actualizar la liga"}
          </Button>
          <Estado pedido={liga} macConectada={macConectada} />
          {pedirL.error && <p className="text-xs text-red-600">{pedirL.error}</p>}
        </div>
        <div className="space-y-2 rounded-xl bg-slate-50 p-3">
          <p className="text-sm font-medium text-slate-800">Partidos jugados de la temporada</p>
          <p className="text-xs text-slate-500">
            Crea en la app los partidos ya jugados que falten (con su rival) y les carga el post
            partido, sin el borrador de Claude. No toca lo que ya está cargado. Puede tardar varios
            minutos.
          </p>
          <Button
            variante="secondary"
            className="px-3 py-1.5"
            cargando={pedirI.pendiente || enCurso(importacion)}
            onClick={() => {
              if (
                window.confirm(
                  "Se van a crear en la app los partidos jugados de la temporada que falten, con sus rivales y su post partido. ¿Seguimos?",
                )
              )
                pedirI.ejecutar(() => pedirImportacion());
            }}
          >
            {enCurso(importacion) ? "Importando…" : "Traer los partidos jugados"}
          </Button>
          <Estado pedido={importacion} macConectada={macConectada} />
          {pedirI.error && <p className="text-xs text-red-600">{pedirI.error}</p>}
        </div>
      </div>
    </details>
  );
}
