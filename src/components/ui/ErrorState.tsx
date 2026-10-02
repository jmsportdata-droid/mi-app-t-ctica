"use client";

import { useEffect } from "react";
import { Button } from "./Button";

interface ErrorStateProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** Vista común para los error.tsx de cada sección. */
export function ErrorState({ error, reset }: ErrorStateProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
      <h2 className="font-semibold text-red-800">Algo ha fallado</h2>
      <p className="mt-1 text-sm text-red-700">
        No se pudieron cargar los datos. Comprueba tu conexión e inténtalo de nuevo.
      </p>
      <Button variante="secondary" className="mt-4" onClick={reset}>
        Reintentar
      </Button>
    </div>
  );
}
