"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  aplicarPlantilla,
  eliminarPlantilla,
  guardarComoPlantilla,
} from "@/app/(dashboard)/microciclo/actions";
import type { PlantillaConTareas } from "@/types/sesion";
import { Button } from "@/components/ui/Button";
import { claseControl } from "@/components/ui/Field";

/** Aplicar una sesión tipo guardada o guardar la actual como plantilla. */
export function PlantillasSesion({
  actividadId,
  plantillas,
  md,
  hayTareas,
}: {
  actividadId: string;
  plantillas: PlantillaConTareas[];
  md?: string;
  hayTareas: boolean;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  // Primero las pensadas para este día
  const ordenadas = [...plantillas].sort(
    (a, b) => Number(b.md === md) - Number(a.md === md) || a.nombre.localeCompare(b.nombre, "es"),
  );
  const [elegida, setElegida] = useState(ordenadas[0]?.id ?? "");
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);

  function ejecutar(
    accion: () => Promise<{ ok: true } | { ok: false; error: string }>,
    mensaje: string,
    alTerminar?: () => void,
  ) {
    setError(null);
    setAviso(null);
    startTransition(async () => {
      try {
        const r = await accion();
        if (!r.ok) {
          setError(r.error);
          return;
        }
        setAviso(mensaje);
        alTerminar?.();
        router.refresh();
      } catch {
        setError("Error de conexión. Probá de nuevo.");
      }
    });
  }

  const actual = plantillas.find((p) => p.id === elegida);

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-900">Plantillas de sesión</h2>
      {plantillas.length === 0 ? (
        <p className="text-sm text-slate-500">
          Cuando tengas una sesión que se repite (por ejemplo, la de MD-1), guardala como plantilla
          y la aplicás en un clic.
        </p>
      ) : (
        <div className="space-y-2">
          <select
            value={elegida}
            onChange={(e) => setElegida(e.target.value)}
            aria-label="Plantilla"
            className={claseControl()}
          >
            {ordenadas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
                {p.md ? ` · ${p.md}` : ""} ({p.tareas})
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            <Button
              variante="secondary"
              className="px-3 py-1.5"
              disabled={!elegida || pendiente}
              onClick={() =>
                ejecutar(() => aplicarPlantilla(elegida, actividadId), "Tareas agregadas.")
              }
            >
              Aplicar
            </Button>
            {actual && (
              <Button
                variante="ghost"
                className="px-3 py-1.5 text-red-600 hover:bg-red-50"
                disabled={pendiente}
                onClick={() =>
                  ejecutar(
                    () => eliminarPlantilla(actual.id),
                    "Plantilla eliminada.",
                    () => setElegida(""),
                  )
                }
              >
                Eliminar
              </Button>
            )}
          </div>
        </div>
      )}

      {hayTareas &&
        (guardando ? (
          <form
            className="space-y-2 border-t border-slate-100 pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              ejecutar(
                () => guardarComoPlantilla(actividadId, nombre, md ?? null),
                "Plantilla guardada.",
                () => {
                  setGuardando(false);
                  setNombre("");
                },
              );
            }}
          >
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={80}
              autoFocus
              placeholder={md ? `Ej. ${md} tipo` : "Nombre de la plantilla"}
              aria-label="Nombre de la plantilla"
              className={claseControl()}
            />
            <div className="flex gap-2">
              <Button type="submit" className="px-3 py-1.5" cargando={pendiente}>
                Guardar
              </Button>
              <Button
                type="button"
                variante="ghost"
                className="px-3 py-1.5"
                onClick={() => setGuardando(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setGuardando(true)}
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            Guardar esta sesión como plantilla
          </button>
        ))}
      {aviso && <p className="text-xs text-emerald-700">{aviso}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </section>
  );
}
