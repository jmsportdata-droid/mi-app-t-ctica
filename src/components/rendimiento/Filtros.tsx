"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { claseControl } from "@/components/ui/Field";

/** Cambia un parámetro de la URL (vacío lo borra) sin perder los demás. */
function useParametro() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (cambios: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(cambios)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    router.push(`${pathname}?${p.toString()}`, { scroll: false });
  };
}

/** Filtros globales: competencia y rango de fechas. */
export function FiltrosRendimiento({
  competiciones,
  competicion,
  desde,
  hasta,
}: {
  competiciones: string[];
  competicion: string | null;
  desde: string | null;
  hasta: string | null;
}) {
  const cambiar = useParametro();
  const hayFiltro = Boolean(competicion || desde || hasta);
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="space-y-1 text-xs font-medium text-slate-600">
        <span className="block">Competencia</span>
        <select
          value={competicion ?? ""}
          onChange={(e) => cambiar({ competicion: e.target.value || null })}
          className={claseControl()}
        >
          <option value="">Todas</option>
          {competiciones.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-xs font-medium text-slate-600">
        <span className="block">Desde</span>
        <input
          type="date"
          value={desde ?? ""}
          onChange={(e) => cambiar({ desde: e.target.value || null })}
          className={claseControl()}
        />
      </label>
      <label className="space-y-1 text-xs font-medium text-slate-600">
        <span className="block">Hasta</span>
        <input
          type="date"
          value={hasta ?? ""}
          onChange={(e) => cambiar({ hasta: e.target.value || null })}
          className={claseControl()}
        />
      </label>
      {hayFiltro && (
        <button
          type="button"
          onClick={() => cambiar({ competicion: null, desde: null, hasta: null })}
          className="pb-2 text-sm font-medium text-slate-600 hover:underline"
        >
          Quitar filtros
        </button>
      )}
    </div>
  );
}

/** Selector que guarda la elección en un parámetro de la URL (partido, jugador…). */
export function SelectorParametro({
  parametro,
  label,
  valor,
  opciones,
}: {
  parametro: string;
  label: string;
  valor: string;
  opciones: { valor: string; label: string; grupo?: string }[];
}) {
  const cambiar = useParametro();
  const grupos = [...new Set(opciones.map((o) => o.grupo ?? ""))];
  return (
    <label className="space-y-1 text-xs font-medium text-slate-600">
      <span className="block">{label}</span>
      <select
        value={valor}
        onChange={(e) => cambiar({ [parametro]: e.target.value })}
        className={`${claseControl()} min-w-[16rem]`}
      >
        {grupos.map((g) =>
          g ? (
            <optgroup key={g} label={g}>
              {opciones
                .filter((o) => o.grupo === g)
                .map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.label}
                  </option>
                ))}
            </optgroup>
          ) : (
            opciones
              .filter((o) => !o.grupo)
              .map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.label}
                </option>
              ))
          ),
        )}
      </select>
    </label>
  );
}
