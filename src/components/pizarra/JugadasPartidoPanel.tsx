"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  agregarJugadaPartido,
  asignarRol,
  quitarJugadaPartido,
} from "@/app/(dashboard)/pelota-quieta/actions";
import { descargarSVGComoPNG, nombreArchivo } from "@/lib/exportar-png";
import { BUCKETS, urlImagen } from "@/lib/storage/config";
import { cn } from "@/lib/utils/cn";
import type { Jugador } from "@/types/jugador";
import { LABEL_CATEGORIA, TIPOS_JUGADA, type Jugada, type JugadorEnDiagrama } from "@/types/jugada";
import { Button } from "@/components/ui/Button";
import { useAccion } from "@/components/ui/useAccion";
import { DiagramaJugada } from "./Dibujo";

export interface JugadaElegida {
  jugada: Jugada;
  asignaciones: Record<string, string>;
}

/** Las jugadas de pelota quieta del partido, con cada rol asignado a un convocado. */
export function JugadasPartidoPanel({
  partidoId,
  elegidas,
  biblioteca,
  jugadores,
  convocados,
  color,
}: {
  partidoId: string;
  elegidas: JugadaElegida[];
  biblioteca: Jugada[];
  jugadores: Jugador[];
  /** Ids de los convocados (titulares y suplentes) */
  convocados: string[];
  color: string;
}) {
  const agregar = useAccion();
  const enPartido = new Set(elegidas.map((e) => e.jugada.id));
  const disponibles = biblioteca.filter((j) => !j.archivada && !enPartido.has(j.id));
  const porId = new Map(jugadores.map((j) => [j.id, j]));
  const deConvocatoria = new Set(convocados);
  // Para los desplegables: primero los convocados
  const ordenados = [
    ...jugadores.filter((j) => deConvocatoria.has(j.id)),
    ...jugadores.filter((j) => !deConvocatoria.has(j.id)),
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Nuestras jugadas</h2>
          <p className="text-sm text-slate-500">
            Elegí las jugadas del partido y quién cumple cada rol: las placas salen con sus fotos.{" "}
            <Link href="/pelota-quieta" className="font-medium text-brand-700 hover:underline">
              Ir a la biblioteca
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value=""
            disabled={agregar.pendiente || disponibles.length === 0}
            onChange={(e) =>
              e.target.value &&
              agregar.ejecutar(() => agregarJugadaPartido(partidoId, e.target.value))
            }
            aria-label="Agregar jugada"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">
              {disponibles.length === 0
                ? "No hay más jugadas en la biblioteca"
                : "+ Agregar jugada…"}
            </option>
            {TIPOS_JUGADA.map((t) => (
              <optgroup key={t.valor} label={t.valor === "ofensivo" ? "A favor" : "En contra"}>
                {disponibles
                  .filter((j) => j.tipo === t.valor)
                  .map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.numero !== null ? `${j.numero}. ` : ""}
                      {j.nombre} · {LABEL_CATEGORIA[j.categoria]}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          {elegidas.length > 0 && (
            <Link
              href={`/imprimir/jugadas/${partidoId}`}
              target="_blank"
              className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              PDF de las jugadas ↗
            </Link>
          )}
        </div>
        {agregar.error && <p className="w-full text-sm text-red-600">{agregar.error}</p>}
      </div>

      {elegidas.length === 0 ? (
        <p className="rounded-xl border-2 border-dashed border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
          Todavía no elegiste jugadas para este partido.
        </p>
      ) : (
        <div className="space-y-4">
          {elegidas.map((e) => (
            <TarjetaElegida
              key={e.jugada.id}
              partidoId={partidoId}
              elegida={e}
              porId={porId}
              ordenados={ordenados}
              convocados={deConvocatoria}
              color={color}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function TarjetaElegida({
  partidoId,
  elegida,
  porId,
  ordenados,
  convocados,
  color,
}: {
  partidoId: string;
  elegida: JugadaElegida;
  porId: Map<string, Jugador>;
  ordenados: Jugador[];
  convocados: Set<string>;
  color: string;
}) {
  const { pendiente, error, ejecutar, setError } = useAccion();
  const contenedor = useRef<HTMLDivElement>(null);
  const [exportando, setExportando] = useState(false);
  const { jugada, asignaciones } = elegida;

  const jugadorDeRol = (rolId: string): JugadorEnDiagrama | null => {
    const j = asignaciones[rolId] ? porId.get(asignaciones[rolId]!) : undefined;
    return j
      ? {
          nombre: j.nombre,
          numero: j.numero,
          fotoUrl: urlImagen(BUCKETS.fotosJugadores, j.foto_ruta),
        }
      : null;
  };
  const rolesEnDibujo = new Set(
    jugada.diagrama.elementos.flatMap((e) => (e.tipo === "jugador" && e.rol ? [e.rol] : [])),
  );
  const roles = jugada.roles.filter((r) => rolesEnDibujo.has(r.id));
  const sinAsignar = roles.filter((r) => !asignaciones[r.id]).length;
  const fueraDeConvocatoria = roles.filter(
    (r) => asignaciones[r.id] && convocados.size > 0 && !convocados.has(asignaciones[r.id]!),
  );
  const asignadosA = new Map<string, number>();
  for (const r of roles) {
    const id = asignaciones[r.id];
    if (id) asignadosA.set(id, (asignadosA.get(id) ?? 0) + 1);
  }

  async function exportar() {
    const svg = contenedor.current?.querySelector("svg");
    if (!svg) return;
    setExportando(true);
    try {
      await descargarSVGComoPNG(svg, nombreArchivo(jugada.nombre));
    } catch {
      setError("No se pudo exportar el PNG.");
    } finally {
      setExportando(false);
    }
  }

  return (
    <article className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_300px]">
      <div ref={contenedor} className="overflow-hidden rounded-xl border border-slate-100">
        <DiagramaJugada
          jugada={jugada}
          prefijo={`p-${jugada.id.slice(0, 8)}`}
          jugadorDeRol={jugadorDeRol}
          color={color}
          className="w-full"
        />
      </div>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-900">{jugada.nombre}</p>
            {jugada.sena && <p className="text-xs text-slate-500">Seña: {jugada.sena}</p>}
          </div>
          <Link
            href={`/pelota-quieta/${jugada.id}`}
            className="shrink-0 text-xs font-medium text-brand-700 hover:underline"
          >
            Editar dibujo
          </Link>
        </div>
        <ul className="space-y-1.5">
          {roles.map((r) => {
            const asignado = asignaciones[r.id];
            const repetido = asignado ? (asignadosA.get(asignado) ?? 0) > 1 : false;
            return (
              <li key={r.id} className="flex items-center gap-2">
                <span className="w-10 shrink-0 rounded bg-slate-100 px-1 py-0.5 text-center text-[11px] font-bold text-slate-600">
                  {r.corto}
                </span>
                <select
                  value={asignado ?? ""}
                  disabled={pendiente}
                  onChange={(e) =>
                    ejecutar(() => asignarRol(partidoId, jugada.id, r.id, e.target.value || null))
                  }
                  aria-label={r.nombre}
                  className={cn(
                    "min-w-0 flex-1 rounded-lg border bg-white px-2 py-1 text-xs",
                    !asignado
                      ? "border-amber-300"
                      : asignado && convocados.size > 0 && !convocados.has(asignado)
                        ? "border-red-300"
                        : repetido
                          ? "border-amber-300"
                          : "border-slate-300",
                  )}
                >
                  <option value="">{r.nombre}…</option>
                  {ordenados.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.numero ? `${j.numero}. ` : ""}
                      {j.nombre}
                      {convocados.size > 0 && !convocados.has(j.id) ? " (no convocado)" : ""}
                    </option>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>
        {(sinAsignar > 0 || fueraDeConvocatoria.length > 0) && (
          <p className="text-xs text-amber-700">
            {sinAsignar > 0 && `${sinAsignar} rol${sinAsignar === 1 ? "" : "es"} sin asignar. `}
            {fueraDeConvocatoria.length > 0 &&
              `${fueraDeConvocatoria.map((r) => r.nombre).join(", ")}: el jugador no está convocado.`}
          </p>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button
            variante="secondary"
            className="px-3 py-1.5"
            cargando={exportando}
            onClick={exportar}
          >
            ↓ PNG
          </Button>
          <Button
            variante="ghost"
            className="px-3 py-1.5 text-red-600 hover:bg-red-50"
            disabled={pendiente}
            onClick={() => ejecutar(() => quitarJugadaPartido(partidoId, jugada.id))}
          >
            Quitar del partido
          </Button>
        </div>
      </div>
    </article>
  );
}
