"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cargarTareasBase } from "@/app/(dashboard)/tareas/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

/** Primer uso: carga el banco base de tareas vinculado al modelo de juego. */
export function CargarTareasBase() {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 p-8 text-center">
      <h2 className="text-lg font-semibold text-slate-900">Empezá con el banco base</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
        Carga 53 tareas (las de la planilla del cuerpo técnico y las que hoy se usan en la élite),
        cada una con su tipo, tiempo, espacio, descripción y los principios y subprincipios del
        modelo de juego que trabaja. Después podés editarlas, archivarlas o sumar las tuyas.
      </p>
      {error && (
        <div className="mx-auto mt-4 max-w-md">
          <Alert>{error}</Alert>
        </div>
      )}
      <Button
        className="mt-6"
        cargando={pendiente}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const r = await cargarTareasBase();
              if (!r.ok) {
                setError(r.error);
                return;
              }
              router.refresh();
            } catch {
              setError("Error de conexión. Probá de nuevo.");
            }
          });
        }}
      >
        Cargar banco base
      </Button>
    </div>
  );
}
