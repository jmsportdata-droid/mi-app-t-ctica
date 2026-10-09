"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
  construirArbol,
  indiceObjetivos,
  INFO_MOMENTO,
  MOMENTOS,
  type MomentoJuego,
  type PrincipioJuego,
} from "@/types/modelo-juego";
import { Button } from "@/components/ui/Button";
import { claseControl } from "@/components/ui/Field";

interface Props {
  principios: PrincipioJuego[];
  value: string[];
  onChange: (ids: string[]) => void;
}

/** Desplegables encadenados momento → principio → subprincipio, con la lista de elegidos. */
export function SelectorObjetivos({ principios, value, onChange }: Props) {
  const arbol = useMemo(() => construirArbol(principios.filter((p) => !p.oculto)), [principios]);
  const indice = useMemo(() => indiceObjetivos(principios), [principios]);
  const [momento, setMomento] = useState<MomentoJuego>("organizacion_ofensiva");
  const [principioId, setPrincipioId] = useState("");
  const [subId, setSubId] = useState("");

  const opcionesPrincipio = arbol[momento];
  const subprincipios = opcionesPrincipio.find(
    (p) => p.principio.id === principioId,
  )?.subprincipios;
  const elegido = subId || principioId;

  function agregar() {
    if (!elegido || value.includes(elegido)) return;
    onChange([...value, elegido]);
    setSubId("");
  }

  // Los elegidos, ordenados por momento como en el modelo
  const ordenMomento = (id: string) =>
    MOMENTOS.findIndex((m) => m.valor === indice.get(id)?.momento);
  const elegidos = [...value].sort((a, b) => ordenMomento(a) - ordenMomento(b));

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <select
          aria-label="Momento del juego"
          value={momento}
          onChange={(e) => {
            setMomento(e.target.value as MomentoJuego);
            setPrincipioId("");
            setSubId("");
          }}
          className={claseControl()}
        >
          {MOMENTOS.map((m) => (
            <option key={m.valor} value={m.valor}>
              {m.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Principio"
          value={principioId}
          onChange={(e) => {
            setPrincipioId(e.target.value);
            setSubId("");
          }}
          className={claseControl()}
        >
          <option value="">Principio…</option>
          {opcionesPrincipio.map(({ principio }) => (
            <option key={principio.id} value={principio.id}>
              {principio.nombre}
            </option>
          ))}
        </select>
        <select
          aria-label="Subprincipio"
          value={subId}
          onChange={(e) => setSubId(e.target.value)}
          disabled={!subprincipios || subprincipios.length === 0}
          className={claseControl()}
        >
          <option value="">Todo el principio</option>
          {subprincipios?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variante="secondary"
          onClick={agregar}
          disabled={!elegido || value.includes(elegido)}
        >
          Agregar
        </Button>
      </div>

      {elegidos.length === 0 ? (
        <p className="text-xs text-slate-500">
          Elegí el momento, el principio y, si querés, el subprincipio que trabaja la tarea.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {elegidos.map((id) => {
            const etiqueta = indice.get(id);
            return (
              <li
                key={id}
                className="inline-flex items-center gap-2 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-xs font-medium text-slate-700"
              >
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    etiqueta ? INFO_MOMENTO[etiqueta.momento].punto : "bg-slate-400",
                  )}
                  aria-hidden
                />
                {etiqueta?.texto ?? "Objetivo borrado"}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((v) => v !== id))}
                  className="rounded-full px-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                  aria-label={`Quitar ${etiqueta?.texto ?? "objetivo"}`}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
