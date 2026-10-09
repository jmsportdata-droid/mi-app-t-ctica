"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { copiarCicloAnterior } from "@/app/(dashboard)/calendario/actions";
import { Button } from "@/components/ui/Button";

/** Trae las actividades del ciclo anterior, cada una a su mismo día de partido. */
export function CopiarCicloButton({
  partidoId,
  fecha,
}: {
  partidoId: string | null;
  fecha: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  function handleCopiar() {
    setMensaje(null);
    startTransition(async () => {
      try {
        const r = await copiarCicloAnterior(partidoId, fecha);
        if (!r.ok) {
          setMensaje({ tipo: "error", texto: r.error });
          return;
        }
        setMensaje({
          tipo: "ok",
          texto:
            r.copiadas === 0
              ? "No había nada nuevo para copiar."
              : `Se copiaron ${r.copiadas} actividad${r.copiadas === 1 ? "" : "es"}.` +
                (r.salteadas > 0 ? ` ${r.salteadas} ya estaban o no tienen día equivalente.` : ""),
        });
        router.refresh();
      } catch {
        setMensaje({ tipo: "error", texto: "Error de conexión. Probá de nuevo." });
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variante="secondary" onClick={handleCopiar} cargando={pendiente}>
        Copiar del ciclo anterior
      </Button>
      {mensaje && (
        <p className={mensaje.tipo === "ok" ? "text-xs text-brand-700" : "text-xs text-red-600"}>
          {mensaje.texto}
        </p>
      )}
    </div>
  );
}
