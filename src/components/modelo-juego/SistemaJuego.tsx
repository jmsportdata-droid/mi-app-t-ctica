"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { guardarSistema } from "@/app/(dashboard)/modelo-de-juego/actions";
import type { ModeloJuego } from "@/types/modelo-juego";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CampoTexto } from "@/components/calendario/ActividadForm";

/** Filosofía y sistemas con y sin balón. */
export function SistemaJuego({ modelo }: { modelo: ModeloJuego | null }) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [valores, setValores] = useState({
    filosofia: modelo?.filosofia ?? "",
    sistema_con_balon: modelo?.sistema_con_balon ?? "",
    sistema_sin_balon: modelo?.sistema_sin_balon ?? "",
  });

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const r = await guardarSistema(valores);
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

  if (editando) {
    return (
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        {error && <Alert>{error}</Alert>}
        <CampoTexto
          label="Filosofía de juego"
          value={valores.filosofia}
          onChange={(filosofia) => setValores((v) => ({ ...v, filosofia }))}
          maxLength={1000}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <CampoTexto
            label="Sistema con balón"
            value={valores.sistema_con_balon}
            onChange={(sistema_con_balon) => setValores((v) => ({ ...v, sistema_con_balon }))}
            maxLength={300}
          />
          <CampoTexto
            label="Sistema sin balón"
            value={valores.sistema_sin_balon}
            onChange={(sistema_sin_balon) => setValores((v) => ({ ...v, sistema_sin_balon }))}
            maxLength={300}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" cargando={pendiente}>
            Guardar
          </Button>
          <Button type="button" variante="ghost" onClick={() => setEditando(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    );
  }

  const vacio = !modelo?.filosofia && !modelo?.sistema_con_balon && !modelo?.sistema_sin_balon;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        {modelo?.filosofia ? (
          <blockquote className="text-lg font-medium italic leading-snug text-slate-800">
            “{modelo.filosofia}”
          </blockquote>
        ) : (
          <p className="text-sm text-slate-500">
            {vacio ? "Cargá la filosofía y los sistemas de juego." : "Sin filosofía cargada."}
          </p>
        )}
        <Button variante="ghost" className="shrink-0 px-3 py-1.5" onClick={() => setEditando(true)}>
          Editar
        </Button>
      </div>
      {!vacio && (
        <dl className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Con balón
            </dt>
            <dd className="mt-1 text-sm text-slate-800">{modelo?.sistema_con_balon || "—"}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Sin balón
            </dt>
            <dd className="mt-1 text-sm text-slate-800">{modelo?.sistema_sin_balon || "—"}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
