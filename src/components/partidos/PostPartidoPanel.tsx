"use client";

import { useState } from "react";
import { guardarResultado } from "@/app/(dashboard)/partidos/semana-actions";
import type { PartidoConRival } from "@/types/partido";
import { Button } from "@/components/ui/Button";
import { claseControl } from "@/components/ui/Field";
import { useAccion } from "@/components/ui/useAccion";

const texto = (n: number | null) => (n === null ? "" : String(n));
const numero = (s: string) => (s.trim() === "" ? null : Number(s));

/** Resultado del partido. Las estadísticas y la evaluación del plan llegan en la etapa P5. */
export function PostPartidoPanel({ partido, club }: { partido: PartidoConRival; club: string }) {
  const { pendiente, error, ejecutar } = useAccion();
  const [v, setV] = useState({
    goles_favor: texto(partido.goles_favor),
    goles_contra: texto(partido.goles_contra),
    penales_favor: texto(partido.penales_favor),
    penales_contra: texto(partido.penales_contra),
  });
  const [guardado, setGuardado] = useState(false);
  const rival = partido.rival?.nombre ?? "Rival";

  const input = (clave: keyof typeof v, label: string) => (
    <label className="space-y-1 text-center text-sm font-medium text-slate-700">
      <span className="block truncate">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={50}
        value={v[clave]}
        onChange={(e) => setV((x) => ({ ...x, [clave]: e.target.value }))}
        className={`${claseControl()} text-center text-2xl font-bold`}
      />
    </label>
  );

  return (
    <div className="space-y-6">
      <section className="max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Resultado</h2>
        <div className="grid grid-cols-2 gap-4">
          {input("goles_favor", club)}
          {input("goles_contra", rival)}
        </div>
        <details className="text-sm" open={partido.penales_favor !== null}>
          <summary className="cursor-pointer font-medium text-slate-600">
            Definición por penales
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-4">
            {input("penales_favor", club)}
            {input("penales_contra", rival)}
          </div>
        </details>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button
          cargando={pendiente}
          onClick={() =>
            ejecutar(
              () =>
                guardarResultado(partido.id, {
                  goles_favor: numero(v.goles_favor),
                  goles_contra: numero(v.goles_contra),
                  penales_favor: numero(v.penales_favor),
                  penales_contra: numero(v.penales_contra),
                }),
              () => {
                setGuardado(true);
                setTimeout(() => setGuardado(false), 2000);
              },
            )
          }
        >
          {guardado ? "Guardado ✓" : "Guardar resultado"}
        </Button>
        <p className="text-xs text-slate-500">
          Con el resultado cargado, el partido pasa a jugado. Dejá los goles vacíos para volver a
          planificado.
        </p>
      </section>

      <section className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">
        <h2 className="font-semibold text-slate-700">Próximamente</h2>
        <p className="mt-1">
          Estadísticas de Sofascore, el análisis de video de nuestro equipo, la evaluación del plan
          (qué salió y qué no), minutos jugados y tarjetas. Todo eso alimenta el módulo de
          rendimiento.
        </p>
      </section>
    </div>
  );
}
