"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarPrompt } from "@/app/(dashboard)/tareas/actions";
import { Button } from "@/components/ui/Button";
import { claseControl } from "@/components/ui/Field";

/**
 * Prompt para generar el gráfico con IA. Por defecto lo arma la app con los datos
 * de la ficha; se puede reemplazar por uno propio y volver al automático.
 */
export function PromptImagen({
  tareaId,
  automatico,
  personalizado,
}: {
  tareaId: string;
  automatico: string;
  personalizado: string | null;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState(personalizado ?? automatico);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prompt = personalizado ?? automatico;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError("No se pudo copiar: seleccioná el texto y copialo a mano.");
    }
  }

  function guardar(valor: string | null) {
    setError(null);
    startTransition(async () => {
      try {
        const r = await guardarPrompt(tareaId, valor);
        if (!r.ok) {
          setError(r.error);
          return;
        }
        setEditando(false);
        router.refresh();
      } catch {
        setError("Error de conexión. Probá de nuevo.");
      }
    });
  }

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-slate-900">Prompt para el gráfico</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {personalizado
              ? "Prompt propio."
              : "Se arma solo con la ficha: si cambiás la tarea, se actualiza."}{" "}
            Pegalo en Higgsfield (por ejemplo con Nano Banana Pro), descargá la imagen y subila
            desde Editar.
          </p>
        </div>
        {!editando && (
          <div className="flex flex-wrap gap-2">
            <Button variante="primary" className="px-3 py-1.5" onClick={copiar}>
              {copiado ? "¡Copiado!" : "Copiar"}
            </Button>
            <a
              href="https://higgsfield.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Abrir Higgsfield ↗
            </a>
          </div>
        )}
      </div>

      {editando ? (
        <>
          <textarea
            rows={14}
            value={borrador}
            onChange={(e) => setBorrador(e.target.value)}
            maxLength={3000}
            aria-label="Prompt"
            className={claseControl()}
          />
          <div className="flex flex-wrap gap-2">
            <Button className="px-3 py-1.5" cargando={pendiente} onClick={() => guardar(borrador)}>
              Guardar prompt
            </Button>
            <Button
              variante="ghost"
              className="px-3 py-1.5"
              disabled={pendiente}
              onClick={() => {
                setEditando(false);
                setBorrador(prompt);
                setError(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </>
      ) : (
        <>
          <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-sans text-xs leading-relaxed text-slate-700">
            {prompt}
          </pre>
          <div className="flex flex-wrap gap-3 text-sm">
            <button
              type="button"
              onClick={() => {
                setBorrador(prompt);
                setEditando(true);
              }}
              className="font-medium text-brand-700 hover:underline"
            >
              Editar prompt
            </button>
            {personalizado && (
              <button
                type="button"
                disabled={pendiente}
                onClick={() => guardar(null)}
                className="font-medium text-slate-500 hover:text-slate-800 disabled:opacity-50"
              >
                Volver al automático
              </button>
            )}
          </div>
        </>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </section>
  );
}
