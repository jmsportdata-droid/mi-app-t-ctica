"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cargarJugadasBase, crearJugada } from "@/app/(dashboard)/pelota-quieta/actions";
import {
  CATEGORIAS_JUGADA,
  TIPOS_JUGADA,
  type CategoriaJugada,
  type TipoJugada,
} from "@/types/jugada";
import { Button } from "@/components/ui/Button";
import { useAccion } from "@/components/ui/useAccion";

/** Crear una jugada (tipo y categoría) y abrir el editor; o cargar las jugadas base. */
export function NuevaJugada({ vacia }: { vacia: boolean }) {
  const router = useRouter();
  const crear = useAccion();
  const base = useAccion();
  const [tipo, setTipo] = useState<TipoJugada>("ofensivo");
  const [categoria, setCategoria] = useState<CategoriaJugada>("corner");
  const control = "rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={tipo}
        onChange={(e) => setTipo(e.target.value as TipoJugada)}
        aria-label="Tipo"
        className={control}
      >
        {TIPOS_JUGADA.map((t) => (
          <option key={t.valor} value={t.valor}>
            {t.label}
          </option>
        ))}
      </select>
      <select
        value={categoria}
        onChange={(e) => setCategoria(e.target.value as CategoriaJugada)}
        aria-label="Categoría"
        className={control}
      >
        {CATEGORIAS_JUGADA.map((c) => (
          <option key={c.valor} value={c.valor}>
            {c.label}
          </option>
        ))}
      </select>
      <Button
        cargando={crear.pendiente}
        onClick={() =>
          crear.ejecutar(async () => {
            const r = await crearJugada(tipo, categoria);
            if (r.ok) router.push(`/pelota-quieta/${r.id}`);
            return r.ok ? { ok: true } : r;
          })
        }
      >
        Nueva jugada
      </Button>
      {vacia && (
        <Button
          variante="secondary"
          cargando={base.pendiente}
          onClick={() =>
            base.ejecutar(async () => {
              const r = await cargarJugadasBase();
              return r.ok ? { ok: true } : r;
            })
          }
        >
          Cargar jugadas base
        </Button>
      )}
      {(crear.error || base.error) && (
        <span className="text-sm text-red-600">{crear.error ?? base.error}</span>
      )}
    </div>
  );
}
