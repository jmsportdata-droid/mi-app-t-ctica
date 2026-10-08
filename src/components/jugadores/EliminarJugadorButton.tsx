"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { eliminarJugador } from "@/app/(dashboard)/plantilla/actions";
import { Button } from "@/components/ui/Button";

export function EliminarJugadorButton({ id, nombre }: { id: string; nombre: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  function handleEliminar() {
    setError(null);
    startTransition(async () => {
      try {
        const resultado = await eliminarJugador(id);
        if (!resultado.ok) {
          setError(resultado.error);
          return;
        }
        router.replace("/plantilla");
        router.refresh();
      } catch {
        setError("Error de conexión al eliminar.");
      }
    });
  }

  if (!confirmando) {
    return (
      <Button
        variante="ghost"
        className="text-red-600 hover:bg-red-50"
        onClick={() => setConfirmando(true)}
      >
        Eliminar
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      <span>¿Eliminar a {nombre}?</span>
      <Button variante="danger" className="px-3 py-1" onClick={handleEliminar} cargando={pendiente}>
        Sí, eliminar
      </Button>
      <Button
        variante="ghost"
        className="px-3 py-1"
        onClick={() => setConfirmando(false)}
        disabled={pendiente}
      >
        Cancelar
      </Button>
      {error && <p className="w-full text-xs">{error}</p>}
    </div>
  );
}
