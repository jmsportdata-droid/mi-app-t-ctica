"use client";

import { useState, useTransition } from "react";
import { guardarCampoInforme, guardarTagsInforme } from "@/app/(dashboard)/partidos/actions";
import { cn } from "@/lib/utils/cn";
import { TAGS_INFORME, type InformeRival, type TagInforme } from "@/types/partido";
import { AutoSaveField } from "@/components/ui/AutoSaveField";
import { SlidesEmbed, VimeoEmbed } from "./Embeds";

interface Props {
  partidoId: string;
  informe: InformeRival | null;
}

export function InformeRivalPanel({ partidoId, informe }: Props) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-slate-900">Aspectos a analizar</h3>
        <p className="mb-4 mt-1 text-sm text-slate-500">
          Marcá las fases del juego del rival que cubre este informe.
        </p>
        <TagPills partidoId={partidoId} iniciales={informe?.tags ?? []} />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <AutoSaveField
            label="Presentación (Google Slides)"
            tipo="url"
            placeholder="https://docs.google.com/presentation/d/…"
            ayuda="Para que todos la vean: Archivo → Compartir → Publicar en la web."
            valorInicial={informe?.slides_url ?? null}
            onGuardar={(valor) => guardarCampoInforme(partidoId, "slides_url", valor)}
          >
            {(url) => (
              <div className="pt-2">
                <SlidesEmbed url={url} titulo="Presentación del informe rival" />
              </div>
            )}
          </AutoSaveField>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <AutoSaveField
            label="Video (Vimeo)"
            tipo="url"
            placeholder="https://vimeo.com/123456789"
            valorInicial={informe?.vimeo_url ?? null}
            onGuardar={(valor) => guardarCampoInforme(partidoId, "vimeo_url", valor)}
          >
            {(url) => (
              <div className="pt-2">
                <VimeoEmbed url={url} titulo="Video del informe rival" />
              </div>
            )}
          </AutoSaveField>
        </section>
      </div>
    </div>
  );
}

/** Pills que se guardan al instante al activarse/desactivarse (actualización optimista). */
function TagPills({ partidoId, iniciales }: { partidoId: string; iniciales: TagInforme[] }) {
  const [tags, setTags] = useState<TagInforme[]>(iniciales);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  function alternar(tag: TagInforme) {
    const anteriores = tags;
    const siguientes = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    setTags(siguientes);
    setError(null);

    startTransition(async () => {
      try {
        const resultado = await guardarTagsInforme(partidoId, siguientes);
        if (!resultado.ok) {
          setTags(anteriores);
          setError(resultado.error);
        }
      } catch {
        setTags(anteriores);
        setError("Error de conexión. No se guardó el cambio.");
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Aspectos del informe">
        {TAGS_INFORME.map(({ valor, label }) => {
          const activo = tags.includes(valor);
          return (
            <button
              key={valor}
              type="button"
              aria-pressed={activo}
              onClick={() => alternar(valor)}
              disabled={pendiente}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors disabled:cursor-wait",
                activo
                  ? "border-brand-600 bg-brand-600 text-white shadow-sm hover:bg-brand-700"
                  : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50",
              )}
            >
              {activo && <span aria-hidden>✓</span>}
              {label}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
