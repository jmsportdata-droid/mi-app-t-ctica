"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cargarModeloBase } from "@/app/(dashboard)/modelo-de-juego/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

/** Primer uso: carga el modelo de juego tomado del manual del cuerpo técnico. */
export function CargarModeloBase() {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 p-8 text-center">
      <h2 className="text-lg font-semibold text-slate-900">Empezá con el modelo del manual</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
        Carga la filosofía, los sistemas y los principios y subprincipios de los 5 momentos del
        juego tal como están en el manual del cuerpo técnico, más una lista de contenidos técnicos.
        Después podés renombrar, ocultar, ordenar o agregar lo que quieras.
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
              const r = await cargarModeloBase();
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
        Cargar modelo base
      </Button>
    </div>
  );
}
