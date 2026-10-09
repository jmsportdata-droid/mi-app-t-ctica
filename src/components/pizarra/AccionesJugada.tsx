"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  archivarJugada,
  duplicarJugada,
  eliminarJugada,
} from "@/app/(dashboard)/pelota-quieta/actions";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAccion } from "@/components/ui/useAccion";

/** Duplicar, archivar y eliminar una jugada de la biblioteca. */
export function AccionesJugada({
  id,
  nombre,
  archivada,
}: {
  id: string;
  nombre: string;
  archivada: boolean;
}) {
  const router = useRouter();
  const { pendiente, error, ejecutar } = useAccion();
  const [borrando, setBorrando] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variante="secondary"
        className="px-3 py-1.5"
        disabled={pendiente}
        onClick={() =>
          ejecutar(async () => {
            const r = await duplicarJugada(id);
            if (r.ok) router.push(`/pelota-quieta/${r.id}`);
            return r.ok ? { ok: true } : r;
          })
        }
      >
        Duplicar
      </Button>
      <Button
        variante="secondary"
        className="px-3 py-1.5"
        disabled={pendiente}
        onClick={() => ejecutar(() => archivarJugada(id, !archivada))}
      >
        {archivada ? "Desarchivar" : "Archivar"}
      </Button>
      <Button
        variante="ghost"
        className="px-3 py-1.5 text-red-600 hover:bg-red-50"
        onClick={() => setBorrando(true)}
      >
        Eliminar
      </Button>
      {error && !borrando && <span className="text-sm text-red-600">{error}</span>}
      <ConfirmDialog
        abierto={borrando}
        titulo="Eliminar jugada"
        descripcion={`¿Seguro que querés eliminar "${nombre}"? También sale de los partidos donde estaba elegida.`}
        cargando={pendiente}
        error={borrando ? error : null}
        onConfirmar={() =>
          ejecutar(
            async () => {
              const r = await eliminarJugada(id);
              if (r.ok) router.push("/pelota-quieta");
              return r;
            },
            () => setBorrando(false),
          )
        }
        onCerrar={() => setBorrando(false)}
      />
    </div>
  );
}
