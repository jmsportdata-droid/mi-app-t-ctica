"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { alternarArchivada, duplicarTarea, eliminarTarea } from "@/app/(dashboard)/tareas/actions";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/** Editar, duplicar, archivar y eliminar una tarea. */
export function AccionesTarea({
  id,
  nombre,
  archivada,
}: {
  id: string;
  nombre: string;
  archivada: boolean;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function ejecutar(
    accion: () => Promise<{ ok: true; id?: string } | { ok: false; error: string }>,
    destino?: (id?: string) => string,
  ) {
    setError(null);
    startTransition(async () => {
      try {
        const r = await accion();
        if (!r.ok) {
          setError(r.error);
          return;
        }
        if (destino) router.push(destino(r.id));
        router.refresh();
      } catch {
        setError("Error de conexión. Probá de nuevo.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/tareas/${id}/editar`}
          className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Editar
        </Link>
        <Button
          variante="secondary"
          disabled={pendiente}
          onClick={() =>
            ejecutar(
              () => duplicarTarea(id),
              (nuevo) => `/tareas/${nuevo}/editar`,
            )
          }
        >
          Duplicar
        </Button>
        <Button
          variante="secondary"
          disabled={pendiente}
          onClick={() => ejecutar(() => alternarArchivada(id, !archivada))}
        >
          {archivada ? "Desarchivar" : "Archivar"}
        </Button>
        <Button
          variante="ghost"
          className="text-red-600 hover:bg-red-50"
          disabled={pendiente}
          onClick={() => setBorrando(true)}
        >
          Eliminar
        </Button>
      </div>
      {error && !borrando && <p className="text-sm text-red-600">{error}</p>}

      <ConfirmDialog
        abierto={borrando}
        titulo="Eliminar tarea"
        descripcion={`¿Seguro que querés eliminar "${nombre}"? Si solo no querés verla en el banco, archivala.`}
        cargando={pendiente}
        error={borrando ? error : null}
        onConfirmar={() =>
          ejecutar(
            () => eliminarTarea(id),
            () => "/tareas",
          )
        }
        onCerrar={() => {
          setBorrando(false);
          setError(null);
        }}
      />
    </div>
  );
}
