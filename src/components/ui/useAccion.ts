"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Resultado = { ok: true } | { ok: false; error: string };

/** Ejecuta una Server Action, refresca la página y guarda el error (o null). */
export function useAccion() {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function ejecutar(accion: () => Promise<Resultado>, alTerminar?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        const r = await accion();
        if (!r.ok) {
          setError(r.error);
          return;
        }
        alTerminar?.();
        router.refresh();
      } catch {
        setError("Error de conexión. Probá de nuevo.");
      }
    });
  }

  return { pendiente, error, setError, ejecutar };
}
