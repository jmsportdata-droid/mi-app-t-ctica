"use client";

import { guardarCampoPost, usarBorradorClaude } from "@/app/(dashboard)/partidos/post-actions";
import type { InsightsPost } from "@/lib/post-partido";
import type { PostPartido } from "@/lib/data/post-partido";
import { AutoSaveField } from "@/components/ui/AutoSaveField";
import { Button } from "@/components/ui/Button";
import { useAccion } from "@/components/ui/useAccion";

/** Borrador de Claude y las conclusiones del cuerpo técnico (las que van al informe). */
export function ConclusionesPost({
  partidoId,
  insights,
  post,
}: {
  partidoId: string;
  insights: InsightsPost;
  post: PostPartido | null;
}) {
  const accion = useAccion();
  const hayBorrador = Boolean(insights.resumen || insights.positivos?.length);

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Conclusiones</h2>

      {hayBorrador && (
        <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Borrador de Claude (con los datos y el análisis de video cargado)
            </h3>
            <Button
              variante="secondary"
              className="px-3 py-1.5"
              cargando={accion.pendiente}
              onClick={() => accion.ejecutar(() => usarBorradorClaude(partidoId))}
            >
              Usar en lo que está vacío
            </Button>
          </div>
          {insights.resumen && <p className="text-sm text-slate-800">{insights.resumen}</p>}
          <div className="grid gap-3 lg:grid-cols-2">
            <Lista titulo="Lo positivo" items={insights.positivos} />
            <Lista titulo="Para mejorar" items={insights.a_mejorar} />
            <Lista
              titulo="Destacados"
              items={insights.destacados?.map((d) => `${d.jugador}: ${d.motivo}`)}
            />
            <Lista titulo="Para trabajar en la semana" items={insights.para_la_semana} />
          </div>
          {accion.error && <p className="text-sm text-red-600">{accion.error}</p>}
        </div>
      )}

      {/* Se vuelven a montar cuando cambia la fila (p. ej. al usar el borrador) */}
      <div key={post?.actualizado_en ?? "nuevo"} className="grid gap-4 lg:grid-cols-2">
        <AutoSaveField
          label="Valoración general"
          multilinea
          filas={5}
          placeholder="Qué partido fue y por qué salió el resultado…"
          valorInicial={post?.valoracion ?? null}
          onGuardar={(v) => guardarCampoPost(partidoId, "valoracion", v)}
        />
        <AutoSaveField
          label="Lo positivo"
          multilinea
          filas={5}
          valorInicial={post?.positivos ?? null}
          onGuardar={(v) => guardarCampoPost(partidoId, "positivos", v)}
        />
        <AutoSaveField
          label="Para mejorar"
          multilinea
          filas={5}
          valorInicial={post?.a_mejorar ?? null}
          onGuardar={(v) => guardarCampoPost(partidoId, "a_mejorar", v)}
        />
        <AutoSaveField
          label="Para trabajar en la semana"
          multilinea
          filas={5}
          ayuda="Lo toma el próximo plan y el microciclo."
          valorInicial={post?.para_la_semana ?? null}
          onGuardar={(v) => guardarCampoPost(partidoId, "para_la_semana", v)}
        />
      </div>
    </section>
  );
}

function Lista({ titulo, items }: { titulo: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="rounded-lg bg-white p-3 ring-1 ring-inset ring-violet-100">
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {titulo}
      </h4>
      <ul className="list-inside list-disc space-y-1 text-sm text-slate-800">
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
