"use client";

import { useMemo, useState } from "react";
import { guardarCampoAbp } from "@/app/(dashboard)/partidos/avanzado-actions";
import { cn } from "@/lib/utils/cn";
import {
  CATEGORIAS_ABP,
  TIPOS_ABP,
  idTarjetaAbp,
  type AbpPartido,
  type ClaveAbp,
  type TipoAbp,
} from "@/types/abp";
import { AutoSaveField } from "@/components/ui/AutoSaveField";
import { VimeoEmbed } from "./Embeds";

interface Props {
  partidoId: string;
  abp: AbpPartido[];
}

/** Acciones a balón parado: córners (4) y faltas laterales (2), ofensivas y defensivas. */
export function AbpPanel({ partidoId, abp }: Props) {
  const [tipo, setTipo] = useState<TipoAbp>("ofensivo");
  const porClave = useMemo(() => new Map(abp.map((f) => [idTarjetaAbp(f), f])), [abp]);

  return (
    <div className="space-y-6">
      <div
        role="radiogroup"
        aria-label="Tipo de pelota parada"
        className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
      >
        {TIPOS_ABP.map((t) => (
          <button
            key={t.valor}
            type="button"
            role="radio"
            aria-checked={tipo === t.valor}
            onClick={() => setTipo(t.valor)}
            className={cn(
              "rounded-lg px-5 py-2 text-sm font-bold uppercase tracking-wide transition-colors",
              tipo === t.valor
                ? t.valor === "ofensivo"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-sky-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Ambos tipos montados: no se pierde lo escrito al alternar */}
      {TIPOS_ABP.map((t) => (
        <div key={t.valor} hidden={tipo !== t.valor} className="space-y-8">
          {CATEGORIAS_ABP.map((cat) => (
            <section key={cat.valor} aria-labelledby={`abp-${t.valor}-${cat.valor}`}>
              <h3
                id={`abp-${t.valor}-${cat.valor}`}
                className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500"
              >
                {cat.titulo}
              </h3>
              <div
                className={cn(
                  "grid gap-4",
                  cat.tarjetas === 4 ? "md:grid-cols-2 2xl:grid-cols-4" : "md:grid-cols-2",
                )}
              >
                {Array.from({ length: cat.tarjetas }, (_, i) => {
                  const clave: ClaveAbp = { tipo: t.valor, categoria: cat.valor, indice: i + 1 };
                  return (
                    <TarjetaAbp
                      key={idTarjetaAbp(clave)}
                      titulo={`${cat.singular} ${i + 1}`}
                      partidoId={partidoId}
                      clave={clave}
                      fila={porClave.get(idTarjetaAbp(clave)) ?? null}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ))}
    </div>
  );
}

function TarjetaAbp({
  titulo,
  partidoId,
  clave,
  fila,
}: {
  titulo: string;
  partidoId: string;
  clave: ClaveAbp;
  fila: AbpPartido | null;
}) {
  return (
    <article className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="font-semibold text-slate-900">{titulo}</h4>
      <AutoSaveField
        label="Descripción"
        multilinea
        filas={4}
        placeholder="Movimientos, bloqueos, lanzador, zona de caída…"
        valorInicial={fila?.descripcion ?? null}
        onGuardar={(v) => guardarCampoAbp(partidoId, clave, "descripcion", v)}
      />
      <AutoSaveField
        label="Video (Vimeo)"
        tipo="url"
        placeholder="https://vimeo.com/123456789"
        valorInicial={fila?.vimeo_url ?? null}
        onGuardar={(v) => guardarCampoAbp(partidoId, clave, "vimeo_url", v)}
      >
        {(url) => <VimeoEmbed url={url} titulo={titulo} />}
      </AutoSaveField>
    </article>
  );
}
