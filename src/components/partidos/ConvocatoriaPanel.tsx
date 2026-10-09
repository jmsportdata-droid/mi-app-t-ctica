"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { etiquetaFormacion, type AlineacionPartido } from "@/types/alineacion";
import { INFO_ESTADO, type EstadoDelDia } from "@/types/disponibilidad";
import type { Jugador } from "@/types/jugador";
import type { Concentracion, Habitacion } from "@/types/partido";
import { Button } from "@/components/ui/Button";
import { AlineacionEditor } from "./AlineacionEditor";
import { ConcentracionPanel } from "./ConcentracionPanel";

/**
 * Convocatoria: titulares y suplentes (con la alineación), avisos de disponibilidad
 * y la lista lista para mandar al grupo.
 */
export function ConvocatoriaPanel({
  partidoId,
  alineacion,
  jugadores,
  disponibilidad,
  encabezado,
  fechaPartido,
  concentracion,
  habitaciones,
}: {
  partidoId: string;
  alineacion: AlineacionPartido | null;
  jugadores: Jugador[];
  disponibilidad: Record<string, EstadoDelDia>;
  /** "Convocados vs Peñarol · domingo 18/10" */
  encabezado: string;
  fechaPartido: string;
  concentracion: Concentracion | null;
  habitaciones: Habitacion[];
}) {
  const [copiado, setCopiado] = useState(false);
  const porId = new Map(jugadores.map((j) => [j.id, j]));
  const titulares = (alineacion?.titulares ?? []).filter((id): id is string => Boolean(id));
  const suplentes = alineacion?.suplentes ?? [];
  const convocados = [...titulares, ...suplentes]
    .map((id) => porId.get(id))
    .filter((j): j is Jugador => j !== undefined);
  const conProblemas = convocados.filter(
    (j) => disponibilidad[j.id] && disponibilidad[j.id]!.estado !== "disponible",
  );
  const noConvocadosDisponibles = jugadores.filter(
    (j) =>
      !convocados.includes(j) &&
      (!disponibilidad[j.id] || disponibilidad[j.id]!.estado === "disponible"),
  );

  const ordenar = (lista: Jugador[]) =>
    [...lista].sort(
      (a, b) => (a.numero ?? 99) - (b.numero ?? 99) || a.nombre.localeCompare(b.nombre),
    );
  const linea = (j: Jugador) => `${j.numero ? `${j.numero}. ` : ""}${j.nombre}`;

  async function copiar() {
    const texto = [encabezado.toUpperCase(), "", ...ordenar(convocados).map(linea)].join("\n");
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles: no hay nada más que hacer
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">Convocatoria</h2>
          <p className="text-sm text-slate-600">
            <strong className="text-2xl font-bold text-slate-900">{convocados.length}</strong>{" "}
            convocados · {titulares.length}/11 titulares · {suplentes.length} suplentes
            {alineacion?.formacion && ` · ${etiquetaFormacion(alineacion.formacion)}`}
          </p>
          {conProblemas.length > 0 && (
            <ul className="space-y-1 text-sm">
              {conProblemas.map((j) => {
                const estado = disponibilidad[j.id]!;
                return (
                  <li key={j.id} className="flex items-center gap-2 text-amber-800">
                    <span
                      className={cn("h-2 w-2 rounded-full", INFO_ESTADO[estado.estado].punto)}
                      aria-hidden
                    />
                    {j.nombre} está {INFO_ESTADO[estado.estado].label.toLowerCase()} ese día
                  </li>
                );
              })}
            </ul>
          )}
          {noConvocadosDisponibles.length > 0 && convocados.length > 0 && (
            <p className="text-xs text-slate-500">
              Disponibles sin convocar:{" "}
              {ordenar(noConvocadosDisponibles)
                .map((j) => j.nombre)
                .join(", ")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variante="secondary" onClick={copiar} disabled={convocados.length === 0}>
            {copiado ? "¡Copiada!" : "Copiar lista para el grupo"}
          </Button>
          {convocados.length > 0 && (
            <Link
              href={`/imprimir/convocatoria/${partidoId}?que=lista`}
              target="_blank"
              className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Exportar lista para el club ↗
            </Link>
          )}
        </div>
      </section>

      <AlineacionEditor partidoId={partidoId} alineacion={alineacion} jugadores={jugadores} />

      <ConcentracionPanel
        partidoId={partidoId}
        fechaPartido={fechaPartido}
        concentracion={concentracion}
        habitaciones={habitaciones}
        convocados={ordenar(convocados)}
      />
    </div>
  );
}
