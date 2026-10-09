"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { duplicarActividad, eliminarActividad } from "@/app/(dashboard)/calendario/actions";
import { sumarDias } from "@/lib/utils/fecha";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/** Duplicar a otro día y eliminar (solo actividades cargadas a mano). */
export function AccionesActividad({
  id,
  titulo,
  fecha,
}: {
  id: string;
  titulo: string;
  fecha: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [destino, setDestino] = useState(sumarDias(fecha, 1));
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDuplicar() {
    setError(null);
    startTransition(async () => {
      try {
        const r = await duplicarActividad(id, destino);
        if (!r.ok) {
          setError(r.error);
          return;
        }
        router.push(`/calendario?fecha=${r.fecha}`);
        router.refresh();
      } catch {
        setError("Error de conexión. Probá de nuevo.");
      }
    });
  }

  function handleEliminar() {
    setError(null);
    startTransition(async () => {
      try {
        const r = await eliminarActividad(id);
        if (!r.ok) {
          setError(r.error);
          return;
        }
        router.push(`/calendario?fecha=${fecha}`);
        router.refresh();
      } catch {
        setError("Error de conexión. Probá de nuevo.");
      }
    });
  }

  return (
    <div className="mt-6 max-w-2xl space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1.5 text-sm font-medium text-slate-700">
          <span className="block">Duplicar al día</span>
          <input
            type="date"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <Button
          variante="secondary"
          onClick={handleDuplicar}
          cargando={pendiente}
          disabled={!destino}
        >
          Duplicar
        </Button>
        <Button
          variante="ghost"
          className="ml-auto text-red-600 hover:bg-red-50"
          onClick={() => setBorrando(true)}
          disabled={pendiente}
        >
          Eliminar
        </Button>
      </div>
      {error && !borrando && <p className="text-sm text-red-600">{error}</p>}

      <ConfirmDialog
        abierto={borrando}
        titulo="Eliminar actividad"
        descripcion={`¿Seguro que querés eliminar "${titulo}"?`}
        cargando={pendiente}
        error={borrando ? error : null}
        onConfirmar={handleEliminar}
        onCerrar={() => setBorrando(false)}
      />
    </div>
  );
}
