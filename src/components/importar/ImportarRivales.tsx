"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { importarRivalExterno } from "@/app/(dashboard)/importar/actions";
import type { EquipoExterno } from "@/lib/externos/api-football";
import { Button } from "@/components/ui/Button";
import { BuscadorEquipos } from "./BuscadorEquipos";

interface Props {
  /** Ids de API-Football de los rivales que ya están cargados */
  yaImportados: string[];
}

type Estado = { tipo: "cargando" } | { tipo: "listo" } | { tipo: "error"; mensaje: string };

/** Busca equipos y los agrega como rivales con escudo y estadio. */
export function ImportarRivales({ yaImportados }: Props) {
  const router = useRouter();
  const [estados, setEstados] = useState<Record<number, Estado>>(() =>
    Object.fromEntries(yaImportados.map((id) => [Number(id), { tipo: "listo" } as Estado])),
  );
  const [cuota, setCuota] = useState<number | null>(null);

  async function agregar(equipo: EquipoExterno) {
    setEstados((prev) => ({ ...prev, [equipo.id]: { tipo: "cargando" } }));
    try {
      const r = await importarRivalExterno(equipo.id);
      if (!r.ok) {
        setEstados((prev) => ({ ...prev, [equipo.id]: { tipo: "error", mensaje: r.error } }));
        return;
      }
      if (r.cuota.restantesHoy !== null) setCuota(r.cuota.restantesHoy);
      setEstados((prev) => ({ ...prev, [equipo.id]: { tipo: "listo" } }));
      router.refresh();
    } catch {
      setEstados((prev) => ({
        ...prev,
        [equipo.id]: { tipo: "error", mensaje: "Error de conexión. Probá de nuevo." },
      }));
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <BuscadorEquipos
        onCuota={setCuota}
        accion={(equipo) => {
          const estado = estados[equipo.id];
          if (estado?.tipo === "listo") {
            return <span className="text-sm font-medium text-brand-700">Agregado ✓</span>;
          }
          return (
            <div className="flex flex-col items-end gap-1">
              <Button
                variante="secondary"
                className="px-3 py-1.5"
                cargando={estado?.tipo === "cargando"}
                onClick={() => agregar(equipo)}
              >
                Agregar
              </Button>
              {estado?.tipo === "error" && (
                <p className="max-w-56 text-right text-xs text-red-600">{estado.mensaje}</p>
              )}
            </div>
          );
        }}
      />
      {cuota !== null && (
        <p className="text-xs text-slate-500">Quedan {cuota} consultas de API-Football por hoy.</p>
      )}
    </div>
  );
}
