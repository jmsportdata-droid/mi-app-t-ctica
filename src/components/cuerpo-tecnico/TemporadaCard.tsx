"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { activarTemporada } from "@/app/(dashboard)/cuerpo-tecnico/actions";
import { BUCKETS, urlImagen } from "@/lib/storage/config";
import { formatearFecha } from "@/lib/utils/edad";
import type { Temporada } from "@/types/cuerpo-tecnico";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

interface Props {
  temporada: Temporada;
  /** Quien mira es el entrenador */
  editable: boolean;
}

export function TemporadaCard({ temporada, editable }: Props) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleActivar() {
    setError(null);
    startTransition(async () => {
      const resultado = await activarTemporada(temporada.id);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <Avatar
          src={urlImagen(BUCKETS.escudos, temporada.escudo_ruta)}
          nombre={temporada.club}
          tamano="md"
          ajuste="contain"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-slate-900" title={temporada.club}>
            {temporada.club}
          </h3>
          <p className="text-sm text-slate-500">Temporada {temporada.etiqueta}</p>
          <p className="mt-1 text-xs text-slate-400">
            {formatearFecha(temporada.fecha_inicio)} – {formatearFecha(temporada.fecha_fin)}
          </p>
        </div>
        <span
          className="mt-1 h-4 w-4 shrink-0 rounded-full ring-1 ring-black/10"
          style={{ backgroundColor: temporada.color_principal }}
          title="Color del club"
          aria-hidden
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        {temporada.activa ? (
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
            Activa
          </span>
        ) : (
          editable && (
            <Button
              variante="secondary"
              className="px-3 py-1"
              onClick={handleActivar}
              cargando={pendiente}
            >
              Marcar como activa
            </Button>
          )
        )}
        {editable && (
          <Link
            href={`/cuerpo-tecnico/temporadas/${temporada.id}/editar`}
            className="ml-auto rounded-lg px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Editar
          </Link>
        )}
        {error && <p className="w-full text-xs text-red-600">{error}</p>}
      </div>
    </article>
  );
}
