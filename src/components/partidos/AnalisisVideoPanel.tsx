"use client";

import { useState, type FormEvent } from "react";
import { eliminarAnalisis, guardarAnalisis } from "@/app/(dashboard)/partidos/semana-actions";
import { cn } from "@/lib/utils/cn";
import {
  BLOQUES_ANALISIS,
  VALORACIONES,
  type AnalisisRival,
  type FaseAnalisis,
  type ValoracionAnalisis,
} from "@/types/partido";
import { Button } from "@/components/ui/Button";
import { claseControl } from "@/components/ui/Field";
import { useAccion } from "@/components/ui/useAccion";

const INFO_VALORACION = Object.fromEntries(VALORACIONES.map((v) => [v.valor, v])) as Record<
  ValoracionAnalisis,
  (typeof VALORACIONES)[number]
>;

/**
 * Análisis de video del rival con la estructura del cuerpo técnico: fase ofensiva
 * (inicios, organización, finalización), fase defensiva (bloque alto, medio,
 * bajo) y transiciones. Cada conclusión puede llevar su clip.
 */
export function AnalisisVideoPanel({
  partidoId,
  analisis,
}: {
  partidoId: string;
  analisis: AnalisisRival[];
}) {
  const conteo = VALORACIONES.map((v) => ({
    ...v,
    cantidad: analisis.filter((a) => a.valoracion === v.valor).length,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <span>{analisis.length} conclusiones</span>
        {conteo
          .filter((c) => c.cantidad > 0)
          .map((c) => (
            <span
              key={c.valor}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                c.chip,
              )}
            >
              {c.cantidad} {c.label.toLowerCase()}
              {c.cantidad === 1 ? "" : c.valor === "debilidad" ? "es" : "s"}
            </span>
          ))}
      </div>

      {BLOQUES_ANALISIS.map((bloque) => (
        <section
          key={bloque.titulo}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-semibold text-slate-900">{bloque.titulo}</h2>
          <div
            className={cn(
              "grid gap-4",
              bloque.fases.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2",
            )}
          >
            {bloque.fases.map((fase) => (
              <Fase
                key={fase.valor}
                partidoId={partidoId}
                fase={fase.valor}
                label={fase.label}
                items={analisis.filter((a) => a.fase === fase.valor)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Fase({
  partidoId,
  fase,
  label,
  items,
}: {
  partidoId: string;
  fase: FaseAnalisis;
  label: string;
  items: AnalisisRival[];
}) {
  const [agregando, setAgregando] = useState(false);
  return (
    <div className="space-y-2 rounded-xl bg-slate-50 p-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">{label}</h3>
      {items.length === 0 && !agregando && (
        <p className="text-xs text-slate-400">Sin conclusiones todavía.</p>
      )}
      <ul className="space-y-2">
        {items.map((a) => (
          <Conclusion key={a.id} partidoId={partidoId} item={a} />
        ))}
      </ul>
      {agregando ? (
        <FormConclusion partidoId={partidoId} fase={fase} onListo={() => setAgregando(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAgregando(true)}
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          + Agregar conclusión
        </button>
      )}
    </div>
  );
}

function Conclusion({ partidoId, item }: { partidoId: string; item: AnalisisRival }) {
  const [editando, setEditando] = useState(false);
  const { pendiente, error, ejecutar } = useAccion();

  if (editando) {
    return (
      <li>
        <FormConclusion
          partidoId={partidoId}
          fase={item.fase}
          item={item}
          onListo={() => setEditando(false)}
        />
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-2.5 text-sm">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          {item.valoracion && (
            <span
              className={cn(
                "inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                INFO_VALORACION[item.valoracion].chip,
              )}
            >
              {INFO_VALORACION[item.valoracion].label}
            </span>
          )}
          <p className="whitespace-pre-line text-slate-800">{item.texto}</p>
          {(item.clip_url || item.referencia) && (
            <p className="text-xs text-slate-500">
              {item.clip_url ? (
                <a
                  href={item.clip_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand-700 hover:underline"
                >
                  ▶ Clip{item.referencia ? ` (${item.referencia})` : ""}
                </a>
              ) : (
                item.referencia
              )}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
          >
            Editar
          </button>
          <button
            type="button"
            disabled={pendiente}
            onClick={() => ejecutar(() => eliminarAnalisis(partidoId, item.id))}
            className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-red-50 hover:text-red-600"
          >
            Borrar
          </button>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </li>
  );
}

function FormConclusion({
  partidoId,
  fase,
  item,
  onListo,
}: {
  partidoId: string;
  fase: FaseAnalisis;
  item?: AnalisisRival;
  onListo: () => void;
}) {
  const { pendiente, error, ejecutar } = useAccion();
  const [texto, setTexto] = useState(item?.texto ?? "");
  const [valoracion, setValoracion] = useState<ValoracionAnalisis | null>(item?.valoracion ?? null);
  const [clip, setClip] = useState(item?.clip_url ?? "");
  const [referencia, setReferencia] = useState(item?.referencia ?? "");

  function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    ejecutar(
      () =>
        guardarAnalisis(partidoId, item?.id ?? null, {
          fase,
          texto,
          valoracion,
          clip_url: clip,
          referencia,
        }),
      onListo,
    );
  }

  return (
    <form
      onSubmit={guardar}
      className="space-y-2 rounded-lg border border-slate-200 bg-white p-2.5"
    >
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        maxLength={1000}
        autoFocus
        placeholder="Conclusión del analista…"
        aria-label="Conclusión"
        className={claseControl()}
      />
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Valoración">
        {VALORACIONES.map((v) => {
          const activo = valoracion === v.valor;
          return (
            <button
              key={v.valor}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => setValoracion(activo ? null : v.valor)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                activo ? v.chip : "bg-white text-slate-500 ring-slate-300 hover:bg-slate-50",
              )}
            >
              {v.label}
            </button>
          );
        })}
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_6rem]">
        <input
          type="url"
          value={clip}
          onChange={(e) => setClip(e.target.value)}
          placeholder="Link del clip (opcional)"
          aria-label="Link del clip"
          className={claseControl()}
        />
        <input
          value={referencia}
          onChange={(e) => setReferencia(e.target.value)}
          maxLength={40}
          placeholder="Min. 23′"
          aria-label="Minuto o referencia"
          className={claseControl()}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" className="px-3 py-1" cargando={pendiente}>
          Guardar
        </Button>
        <Button type="button" variante="ghost" className="px-3 py-1" onClick={onListo}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
