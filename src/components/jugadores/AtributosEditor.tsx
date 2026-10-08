"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarAtributos } from "@/app/(dashboard)/plantilla/atributos-actions";
import {
  GRUPOS_ATRIBUTOS,
  atributosPorDefecto,
  type Atributo,
  type JugadorAtributos,
  type ValoresAtributos,
} from "@/types/atributos";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

function valoresDe(fila: JugadorAtributos | null): ValoresAtributos {
  const base = atributosPorDefecto();
  if (!fila) return base;
  for (const clave of Object.keys(base) as Atributo[]) base[clave] = fila[clave];
  return base;
}

/** Valoración 0-100 de los 15 atributos con deslizadores. */
export function AtributosEditor({
  jugadorId,
  atributos,
}: {
  jugadorId: string;
  atributos: JugadorAtributos | null;
}) {
  const router = useRouter();
  const [valores, setValores] = useState<ValoresAtributos>(() => valoresDe(atributos));
  const [guardados, setGuardados] = useState<ValoresAtributos>(() => valoresDe(atributos));
  const [mensaje, setMensaje] = useState<{ tipo: "error" | "exito"; texto: string } | null>(null);
  const [pendiente, startTransition] = useTransition();

  const hayCambios = (Object.keys(valores) as Atributo[]).some((a) => valores[a] !== guardados[a]);

  function cambiar(atributo: Atributo, valor: number) {
    const limpio = Number.isFinite(valor) ? Math.min(100, Math.max(0, Math.round(valor))) : 0;
    setValores((prev) => ({ ...prev, [atributo]: limpio }));
    setMensaje(null);
  }

  function guardar() {
    startTransition(async () => {
      try {
        const resultado = await guardarAtributos(jugadorId, valores);
        if (!resultado.ok) {
          setMensaje({ tipo: "error", texto: resultado.error });
          return;
        }
        setGuardados(valores);
        setMensaje({ tipo: "exito", texto: "Atributos guardados" });
        router.refresh();
      } catch {
        setMensaje({ tipo: "error", texto: "Error de conexión. Inténtalo de nuevo." });
      }
    });
  }

  return (
    <section
      id="atributos"
      className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Atributos</h2>
          <p className="text-sm text-slate-500">Valora cada atributo de 0 a 100.</p>
        </div>
        <div className="flex items-center gap-2">
          {hayCambios && (
            <Button variante="ghost" onClick={() => setValores(guardados)} disabled={pendiente}>
              Descartar
            </Button>
          )}
          <Button
            onClick={guardar}
            cargando={pendiente}
            disabled={!hayCambios && atributos !== null}
          >
            Guardar atributos
          </Button>
        </div>
      </div>

      {mensaje && (
        <div className="mb-4">
          <Alert tipo={mensaje.tipo}>{mensaje.texto}</Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {GRUPOS_ATRIBUTOS.map((grupo) => (
          <fieldset key={grupo.clave} className="space-y-4">
            <legend
              className="mb-2 text-sm font-semibold uppercase tracking-wide"
              style={{ color: grupo.color }}
            >
              {grupo.titulo}
            </legend>
            {grupo.atributos.map(({ campo, label }) => (
              <div key={campo}>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor={`attr-${campo}`} className="text-sm text-slate-700">
                    {label}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={valores[campo]}
                    onChange={(e) => cambiar(campo, e.target.valueAsNumber)}
                    aria-label={`${label} (valor)`}
                    className="w-14 rounded-md border border-slate-300 px-1.5 py-0.5 text-right text-sm tabular-nums focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                <input
                  id={`attr-${campo}`}
                  type="range"
                  min={0}
                  max={100}
                  value={valores[campo]}
                  onChange={(e) => cambiar(campo, e.target.valueAsNumber)}
                  className="w-full"
                  style={{ accentColor: grupo.color }}
                />
              </div>
            ))}
          </fieldset>
        ))}
      </div>
    </section>
  );
}
