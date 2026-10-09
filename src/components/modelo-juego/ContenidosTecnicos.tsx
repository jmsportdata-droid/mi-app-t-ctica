"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  alternarOcultoContenido,
  crearContenido,
  eliminarContenido,
} from "@/app/(dashboard)/modelo-de-juego/actions";
import { cn } from "@/lib/utils/cn";
import type { ContenidoTecnico } from "@/types/modelo-juego";
import { Button } from "@/components/ui/Button";

/** Contenidos técnicos (pase, remate, centro…): objetivos de tareas que no son principios. */
export function ContenidosTecnicos({ contenidos }: { contenidos: ContenidoTecnico[] }) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);

  function ejecutar(
    accion: () => Promise<{ ok: boolean; error?: string }>,
    alTerminar?: () => void,
  ) {
    setError(null);
    startTransition(async () => {
      try {
        const r = await accion();
        if (!r.ok) {
          setError(r.error ?? "No se pudo guardar.");
          return;
        }
        alTerminar?.();
        router.refresh();
      } catch {
        setError("Error de conexión. Probá de nuevo.");
      }
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-semibold text-slate-900">Contenidos técnicos</h2>
      <p className="mb-4 mt-1 text-sm text-slate-500">
        Se eligen como objetivos de las tareas junto con los principios del modelo.
      </p>
      <ul className="flex flex-wrap gap-2">
        {contenidos.map((c) => (
          <li
            key={c.id}
            className={cn(
              "inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-sm text-slate-800",
              c.oculto && "opacity-50",
            )}
          >
            {c.nombre}
            <button
              type="button"
              onClick={() => ejecutar(() => alternarOcultoContenido(c.id, !c.oculto))}
              disabled={pendiente}
              className="rounded-full px-1.5 text-xs text-slate-500 hover:bg-white hover:text-slate-800"
              title={c.oculto ? "Mostrar" : "Ocultar"}
            >
              {c.oculto ? "mostrar" : "ocultar"}
            </button>
            <button
              type="button"
              onClick={() => ejecutar(() => eliminarContenido(c.id))}
              disabled={pendiente}
              className="rounded-full px-1.5 text-xs text-slate-500 hover:bg-red-50 hover:text-red-600"
              aria-label={`Borrar ${c.nombre}`}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ejecutar(
            () => crearContenido(nombre),
            () => setNombre(""),
          );
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={80}
          placeholder="Nuevo contenido, ej. Pared"
          aria-label="Nuevo contenido técnico"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <Button type="submit" variante="secondary" className="px-3 py-1.5" cargando={pendiente}>
          Agregar
        </Button>
      </form>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}
