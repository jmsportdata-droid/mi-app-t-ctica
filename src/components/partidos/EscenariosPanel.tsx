"use client";

import { useState, type FormEvent } from "react";
import { eliminarEscenario, guardarEscenario } from "@/app/(dashboard)/partidos/semana-actions";
import { etiquetaFormacion, LISTA_FORMACIONES, type Formacion } from "@/types/alineacion";
import type { Jugador } from "@/types/jugador";
import {
  SITUACIONES,
  type CambioPlanificado,
  type EscenarioPartido,
  type SituacionPartido,
} from "@/types/partido";
import { Button } from "@/components/ui/Button";
import { claseControl } from "@/components/ui/Field";
import { useAccion } from "@/components/ui/useAccion";

const LABEL_SITUACION = Object.fromEntries(SITUACIONES.map((s) => [s.valor, s.label])) as Record<
  SituacionPartido,
  string
>;

/** Escenarios y plan B: qué hacemos ganando, perdiendo, con uno menos… y los cambios. */
export function EscenariosPanel({
  partidoId,
  escenarios,
  jugadores,
}: {
  partidoId: string;
  escenarios: EscenarioPartido[];
  jugadores: Jugador[];
}) {
  const [agregando, setAgregando] = useState(false);
  const nombre = new Map(jugadores.map((j) => [j.id, j.nombre]));

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Escenarios y plan B</h2>
          <p className="text-sm text-slate-500">
            Qué hacemos según cómo venga el partido, con los cambios planificados.
          </p>
        </div>
        {!agregando && <Button onClick={() => setAgregando(true)}>+ Agregar escenario</Button>}
      </div>

      {agregando && (
        <FormEscenario
          partidoId={partidoId}
          jugadores={jugadores}
          onListo={() => setAgregando(false)}
        />
      )}

      {escenarios.length === 0 && !agregando ? (
        <p className="rounded-xl border-2 border-dashed border-slate-200 py-6 text-center text-sm text-slate-500">
          Todavía no hay escenarios. Ejemplo: &quot;Perdiendo desde el 60′: pasamos a 1-3-4-3 y
          entra un segundo 9&quot;.
        </p>
      ) : (
        <ul className="space-y-3">
          {escenarios.map((e) => (
            <Escenario
              key={e.id}
              partidoId={partidoId}
              escenario={e}
              jugadores={jugadores}
              nombre={nombre}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function Escenario({
  partidoId,
  escenario,
  jugadores,
  nombre,
}: {
  partidoId: string;
  escenario: EscenarioPartido;
  jugadores: Jugador[];
  nombre: Map<string, string>;
}) {
  const [editando, setEditando] = useState(false);
  const { pendiente, error, ejecutar } = useAccion();
  const cambios = escenario.cambios as unknown as CambioPlanificado[];

  if (editando) {
    return (
      <li>
        <FormEscenario
          partidoId={partidoId}
          jugadores={jugadores}
          escenario={escenario}
          onListo={() => setEditando(false)}
        />
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
            {LABEL_SITUACION[escenario.situacion]}
          </span>
          {escenario.desde_minuto !== null && (
            <span className="text-sm text-slate-600">desde el {escenario.desde_minuto}′</span>
          )}
          {escenario.formacion && (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
              {etiquetaFormacion(escenario.formacion as Formacion)}
            </span>
          )}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
          >
            Editar
          </button>
          <button
            type="button"
            disabled={pendiente}
            onClick={() => ejecutar(() => eliminarEscenario(partidoId, escenario.id))}
            className="rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600"
          >
            Borrar
          </button>
        </div>
      </div>
      <p className="mt-2 whitespace-pre-line text-sm text-slate-800">{escenario.respuesta}</p>
      {cambios.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-sm text-slate-600">
          {cambios.map((c, i) => (
            <li key={i}>
              <span className="text-red-600">↓ {nombre.get(c.sale) ?? "—"}</span>{" "}
              <span className="text-emerald-700">↑ {nombre.get(c.entra) ?? "—"}</span>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </li>
  );
}

function FormEscenario({
  partidoId,
  jugadores,
  escenario,
  onListo,
}: {
  partidoId: string;
  jugadores: Jugador[];
  escenario?: EscenarioPartido;
  onListo: () => void;
}) {
  const { pendiente, error, ejecutar } = useAccion();
  const [situacion, setSituacion] = useState<SituacionPartido>(escenario?.situacion ?? "perdiendo");
  const [minuto, setMinuto] = useState(
    escenario?.desde_minuto === null || escenario?.desde_minuto === undefined
      ? ""
      : String(escenario.desde_minuto),
  );
  const [formacion, setFormacion] = useState<string>(escenario?.formacion ?? "");
  const [respuesta, setRespuesta] = useState(escenario?.respuesta ?? "");
  const [cambios, setCambios] = useState<CambioPlanificado[]>(
    (escenario?.cambios as unknown as CambioPlanificado[] | undefined) ?? [],
  );

  function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    ejecutar(
      () =>
        guardarEscenario(partidoId, escenario?.id ?? null, {
          situacion,
          desde_minuto: minuto.trim() === "" ? null : Number(minuto),
          formacion: (formacion || null) as Formacion | null,
          respuesta,
          cambios: cambios.filter((c) => c.sale && c.entra),
        }),
      onListo,
    );
  }

  const selectJugador = (valor: string, onChange: (v: string) => void, label: string) => (
    <select
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className={claseControl()}
    >
      <option value="">{label}…</option>
      {jugadores.map((j) => (
        <option key={j.id} value={j.id}>
          {j.numero ? `${j.numero}. ` : ""}
          {j.nombre}
        </option>
      ))}
    </select>
  );

  return (
    <form
      onSubmit={guardar}
      className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/40 p-4"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-sm font-medium text-slate-700">
          <span className="block">Situación</span>
          <select
            value={situacion}
            onChange={(e) => setSituacion(e.target.value as SituacionPartido)}
            className={claseControl()}
          >
            {SITUACIONES.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          <span className="block">Desde el minuto</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={130}
            value={minuto}
            onChange={(e) => setMinuto(e.target.value)}
            placeholder="60"
            className={claseControl()}
          />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          <span className="block">Pasamos a</span>
          <select
            value={formacion}
            onChange={(e) => setFormacion(e.target.value)}
            className={claseControl()}
          >
            <option value="">Misma formación</option>
            {LISTA_FORMACIONES.map((f) => (
              <option key={f} value={f}>
                {etiquetaFormacion(f)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block space-y-1 text-sm font-medium text-slate-700">
        <span className="block">Qué hacemos</span>
        <textarea
          value={respuesta}
          onChange={(e) => setRespuesta(e.target.value)}
          rows={3}
          maxLength={2000}
          autoFocus
          placeholder="Adelantamos la presión, el 8 juega más cerca del 9, buscamos centros…"
          className={claseControl()}
        />
      </label>

      <div className="space-y-2">
        <span className="block text-sm font-medium text-slate-700">Cambios planificados</span>
        {cambios.map((c, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            {selectJugador(
              c.sale,
              (v) => setCambios((x) => x.map((y, j) => (j === i ? { ...y, sale: v } : y))),
              "Sale",
            )}
            {selectJugador(
              c.entra,
              (v) => setCambios((x) => x.map((y, j) => (j === i ? { ...y, entra: v } : y))),
              "Entra",
            )}
            <button
              type="button"
              onClick={() => setCambios((x) => x.filter((_, j) => j !== i))}
              className="rounded-lg px-3 text-sm text-slate-500 hover:bg-white"
              aria-label="Quitar cambio"
            >
              ✕
            </button>
          </div>
        ))}
        {cambios.length < 5 && (
          <button
            type="button"
            onClick={() => setCambios((x) => [...x, { sale: "", entra: "" }])}
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            + Agregar cambio
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" cargando={pendiente}>
          Guardar escenario
        </Button>
        <Button type="button" variante="ghost" onClick={onListo}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
