"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { elegirTemporada } from "@/app/(dashboard)/cuerpo-tecnico/actions";
import { BUCKETS, urlImagen } from "@/lib/storage/config";
import type { Temporada } from "@/types/cuerpo-tecnico";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";

interface Props {
  cuerpoTecnico: string;
  temporadas: Temporada[];
  actual: Temporada | null;
}

/** Barra superior: club y temporada que se está mirando, con selector. */
export function BarraTemporada({ cuerpoTecnico, temporadas, actual }: Props) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCambio(id: string) {
    setError(null);
    startTransition(async () => {
      const resultado = await elegirTemporada(id);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur print:hidden">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-8">
        {actual ? (
          <>
            <Avatar
              src={urlImagen(BUCKETS.escudos, actual.escudo_ruta)}
              nombre={actual.club}
              ajuste="contain"
              className="!h-9 !w-9 text-xs"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-slate-500">{cuerpoTecnico}</p>
              <label className="sr-only" htmlFor="selector-temporada">
                Temporada
              </label>
              <select
                id="selector-temporada"
                value={actual.id}
                onChange={(e) => handleCambio(e.target.value)}
                disabled={pendiente || temporadas.length < 2}
                className="-ml-1 max-w-full truncate rounded-md border-0 bg-transparent py-0 pl-1 pr-7 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-brand-100 disabled:cursor-default disabled:opacity-100"
              >
                {temporadas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.club} · {t.etiqueta}
                    {t.activa ? " (activa)" : ""}
                  </option>
                ))}
              </select>
            </div>
            {pendiente && <Spinner />}
            {error && <p className="text-xs text-red-600">{error}</p>}
            {!actual.activa && (
              <span className="hidden rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 sm:inline">
                No es la temporada activa
              </span>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-600">
            {cuerpoTecnico} ·{" "}
            <Link href="/cuerpo-tecnico" className="font-medium text-brand-700 hover:underline">
              Creá la primera temporada
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
