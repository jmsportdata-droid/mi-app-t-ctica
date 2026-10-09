"use client";

import { useState } from "react";
import Link from "next/link";
import {
  guardarClavesPlan,
  guardarJugadoresClave,
  guardarListaPlan,
  guardarTextoPlan,
  type JugadorClaveInput,
} from "@/app/(dashboard)/partidos/plan-actions";
import { cn } from "@/lib/utils/cn";
import { etiquetaFormacion, type Formacion } from "@/types/alineacion";
import type { Jugador } from "@/types/jugador";
import type { PrincipioJuego } from "@/types/modelo-juego";
import {
  MOMENTOS_PLAN,
  type CampoListaPlan,
  type CampoTextoPlan,
  type EscenarioPartido,
  type JugadorClave,
  type PlanPartido,
} from "@/types/partido";
import { INFO_TIPO_TAREA, type TipoTarea } from "@/types/tarea";
import { AutoSaveField } from "@/components/ui/AutoSaveField";
import { Button } from "@/components/ui/Button";
import { claseControl } from "@/components/ui/Field";
import { useAccion } from "@/components/ui/useAccion";
import { SelectorObjetivos } from "@/components/tareas/SelectorObjetivos";
import { EscenariosPanel } from "./EscenariosPanel";

export interface TareaSugerida {
  id: string;
  nombre: string;
  tipo: TipoTarea;
}

interface Props {
  partidoId: string;
  plan: PlanPartido | null;
  principios: PrincipioJuego[];
  /** Convocados primero; si no hay convocatoria, todo el plantel */
  jugadores: Jugador[];
  escenarios: EscenarioPartido[];
  formacionPropia: Formacion | null;
  formacionRival: Formacion | null;
  /** Lo que ya se sabe por la previa, como referencia para el contexto */
  resumenPrevia: string[];
  tareasSugeridas: TareaSugerida[];
}

/**
 * Plan de partido con el formato del cuerpo técnico: claves, contexto, choque de
 * estructuras, plan por momento (extendido y corto para el plantel), pelota quieta,
 * jugadores clave del rival, escenarios, gestión y microciclo.
 */
export function PlanPartidoEditor({
  partidoId,
  plan,
  principios,
  jugadores,
  escenarios,
  formacionPropia,
  formacionRival,
  resumenPrevia,
  tareasSugeridas,
}: Props) {
  const texto = (
    campo: CampoTextoPlan,
    label: string,
    opciones: { filas?: number; placeholder?: string; ayuda?: string; corto?: boolean } = {},
  ) => (
    <AutoSaveField
      label={label}
      valorInicial={plan?.[campo] ?? null}
      onGuardar={(v) => guardarTextoPlan(partidoId, campo, v)}
      multilinea={!opciones.corto}
      filas={opciones.filas ?? 4}
      placeholder={opciones.placeholder}
      ayuda={opciones.ayuda}
    />
  );

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Plan de partido</h2>
          <p className="text-sm text-slate-500">
            Se guarda solo. El one sheet para el plantel se arma con las claves y los textos cortos
            de cada momento.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/imprimir/plan/${partidoId}?version=extendida`}
            target="_blank"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Versión extendida (PDF) ↗
          </Link>
          <Link
            href={`/imprimir/plan/${partidoId}?version=one-sheet`}
            target="_blank"
            className="inline-flex items-center rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            One sheet (PDF) ↗
          </Link>
        </div>
      </section>

      <Seccion numero={0} titulo="Las 3 claves del partido">
        <Claves partidoId={partidoId} iniciales={plan?.claves ?? []} />
        {texto("objetivo", "Objetivo del partido", {
          corto: true,
          placeholder: "Ganar sin conceder ocasiones de contra",
        })}
      </Seccion>

      <Seccion numero={1} titulo="Contexto">
        {resumenPrevia.length > 0 && (
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              De la previa
            </p>
            <ul className="list-inside list-disc space-y-0.5">
              {resumenPrevia.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        )}
        {texto("contexto", "Rival y nosotros", {
          placeholder: "Cómo viene el rival, cómo venimos nosotros, disponibilidad…",
        })}
      </Seccion>

      <Seccion numero={2} titulo="Choque de estructuras">
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-md bg-brand-600 px-2 py-0.5 font-semibold text-white">
            {formacionPropia
              ? etiquetaFormacion(formacionPropia)
              : "Nuestra formación: en Convocatoria"}
          </span>
          <span className="text-slate-400">vs</span>
          <span className="rounded-md bg-slate-900 px-2 py-0.5 font-semibold text-white">
            {formacionRival ? etiquetaFormacion(formacionRival) : "La del rival: en Previa"}
          </span>
        </p>
        {texto("choque", "Superioridades, hombre libre y duelos clave", {
          placeholder:
            "3v2 en el medio con el volante entre centrales; su extremo derecho contra nuestro lateral…",
        })}
      </Seccion>

      <Seccion numero={3} titulo="Plan por momento del juego">
        <div className="grid gap-4 lg:grid-cols-2">
          {MOMENTOS_PLAN.map((m) => (
            <div key={m.prefijo} className="space-y-3 rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900">{m.label}</h3>
              {texto(`${m.prefijo}_ct`, "Plan (cuerpo técnico)", { filas: 5 })}
              {texto(`${m.prefijo}_plantel`, `Para el plantel: "${m.corto}"`, {
                corto: true,
                placeholder: "Una o dos frases para el one sheet",
              })}
              <ListaPrincipios
                partidoId={partidoId}
                campo={`${m.prefijo}_principios`}
                principios={principios}
                iniciales={plan?.[`${m.prefijo}_principios`] ?? []}
                momento={m.momento}
                label="Principios que se refuerzan"
              />
              <ListaJugadores
                partidoId={partidoId}
                campo={`${m.prefijo}_jugadores`}
                jugadores={jugadores}
                iniciales={plan?.[`${m.prefijo}_jugadores`] ?? []}
              />
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion numero={4} titulo="Pelota quieta">
        {texto("abp_ct", "Plan de pelota quieta", {
          placeholder:
            "Jugadas elegidas, marcas, ejecutores y penales. La pizarra llega en la próxima etapa.",
        })}
        {texto("abp_plantel", "Para el plantel", { corto: true })}
      </Seccion>

      <Seccion numero={5} titulo="Jugadores clave del rival">
        <JugadoresClave
          partidoId={partidoId}
          iniciales={(plan?.jugadores_clave as unknown as JugadorClave[] | undefined) ?? []}
          jugadores={jugadores}
        />
      </Seccion>

      <Seccion numero={6} titulo="Escenarios y plan B">
        <EscenariosPanel partidoId={partidoId} escenarios={escenarios} jugadores={jugadores} />
      </Seccion>

      <Seccion numero={7} titulo="Gestión del partido">
        {texto("gestion", "Cambios, ventanas y tarjetas", {
          placeholder:
            "Primera ventana al 60′; Fulano con 4 amarillas: si ve una, se pierde el clásico…",
        })}
      </Seccion>

      <Seccion numero={8} titulo="Para el microciclo">
        <ListaPrincipios
          partidoId={partidoId}
          campo="microciclo_principios"
          principios={principios}
          iniciales={plan?.microciclo_principios ?? []}
          label="Principios a reforzar en la semana"
        />
        {tareasSugeridas.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Tareas sugeridas del banco</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {tareasSugeridas.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/tareas/${t.id}`}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        INFO_TIPO_TAREA[t.tipo].color,
                      )}
                    >
                      {INFO_TIPO_TAREA[t.tipo].label}
                    </span>
                    <span className="truncate text-slate-800">{t.nombre}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500">Se agregan a las sesiones desde el microciclo.</p>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            Elegí principios y aparecen las tareas del banco que los trabajan.
          </p>
        )}
      </Seccion>
    </div>
  );
}

function Seccion({
  numero,
  titulo,
  children,
}: {
  numero: number;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
          {numero}
        </span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Claves({ partidoId, iniciales }: { partidoId: string; iniciales: string[] }) {
  const { pendiente, error, ejecutar } = useAccion();
  const [claves, setClaves] = useState(() => [0, 1, 2].map((i) => iniciales[i] ?? ""));
  const [guardadas, setGuardadas] = useState(claves.join("\n"));

  function guardar() {
    if (claves.join("\n") === guardadas) return;
    ejecutar(
      () => guardarClavesPlan(partidoId, claves),
      () => setGuardadas(claves.join("\n")),
    );
  }

  return (
    <div className="space-y-2">
      {claves.map((c, i) => (
        <label key={i} className="flex items-center gap-3">
          <span className="w-5 text-right text-lg font-bold text-brand-700">{i + 1}</span>
          <input
            value={c}
            onChange={(e) => setClaves((x) => x.map((y, j) => (j === i ? e.target.value : y)))}
            onBlur={guardar}
            maxLength={200}
            placeholder={
              [
                "Ganar las segundas pelotas",
                "Atacar la espalda de su lateral",
                "Cerrar adentro en su salida",
              ][i]
            }
            aria-label={`Clave ${i + 1}`}
            className={claseControl()}
          />
        </label>
      ))}
      <p className="text-xs text-slate-500">
        {pendiente ? "Guardando…" : (error ?? "Se guardan al salir de cada campo.")}
      </p>
    </div>
  );
}

function ListaPrincipios({
  partidoId,
  campo,
  principios,
  iniciales,
  momento,
  label,
}: {
  partidoId: string;
  campo: CampoListaPlan;
  principios: PrincipioJuego[];
  iniciales: string[];
  momento?: (typeof MOMENTOS_PLAN)[number]["momento"];
  label: string;
}) {
  const { error, ejecutar } = useAccion();
  const [ids, setIds] = useState(iniciales);
  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-slate-700">{label}</span>
      <SelectorObjetivos
        principios={principios}
        value={ids}
        momentoInicial={momento}
        onChange={(nuevos) => {
          setIds(nuevos);
          ejecutar(() => guardarListaPlan(partidoId, campo, nuevos));
        }}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function ListaJugadores({
  partidoId,
  campo,
  jugadores,
  iniciales,
}: {
  partidoId: string;
  campo: CampoListaPlan;
  jugadores: Jugador[];
  iniciales: string[];
}) {
  const { error, ejecutar } = useAccion();
  const [ids, setIds] = useState(iniciales);
  const porId = new Map(jugadores.map((j) => [j.id, j]));

  function cambiar(nuevos: string[]) {
    setIds(nuevos);
    ejecutar(() => guardarListaPlan(partidoId, campo, nuevos));
  }

  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-slate-700">Jugadores involucrados</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {ids.map((id) => (
          <span
            key={id}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-2.5 pr-1 text-xs font-medium text-slate-700"
          >
            {porId.get(id)?.nombre ?? "Jugador"}
            <button
              type="button"
              onClick={() => cambiar(ids.filter((x) => x !== id))}
              className="rounded-full px-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              aria-label="Quitar"
            >
              ×
            </button>
          </span>
        ))}
        <select
          value=""
          onChange={(e) => e.target.value && cambiar([...ids, e.target.value])}
          aria-label="Agregar jugador"
          className="rounded-full border border-dashed border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-600"
        >
          <option value="">+ Jugador</option>
          {jugadores
            .filter((j) => !ids.includes(j.id))
            .map((j) => (
              <option key={j.id} value={j.id}>
                {j.numero ? `${j.numero}. ` : ""}
                {j.nombre}
              </option>
            ))}
        </select>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function JugadoresClave({
  partidoId,
  iniciales,
  jugadores,
}: {
  partidoId: string;
  iniciales: JugadorClave[];
  jugadores: Jugador[];
}) {
  const { pendiente, error, ejecutar } = useAccion();
  const [lista, setLista] = useState<JugadorClaveInput[]>(iniciales);
  const [guardado, setGuardado] = useState(false);

  const actualizar = (i: number, cambios: Partial<JugadorClaveInput>) =>
    setLista((x) => x.map((y, j) => (j === i ? { ...y, ...cambios } : y)));

  return (
    <div className="space-y-3">
      {lista.length === 0 && (
        <p className="text-sm text-slate-500">
          Los rivales que pueden definir el partido y cómo los neutralizamos.
        </p>
      )}
      {lista.map((j, i) => (
        <div
          key={i}
          className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[5rem_1fr_1fr_auto]"
        >
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={99}
            value={j.dorsal ?? ""}
            onChange={(e) =>
              actualizar(i, { dorsal: e.target.value === "" ? null : Number(e.target.value) })
            }
            placeholder="Nº"
            aria-label="Dorsal"
            className={claseControl()}
          />
          <input
            value={j.nombre}
            onChange={(e) => actualizar(i, { nombre: e.target.value })}
            maxLength={80}
            placeholder="Nombre"
            aria-label="Nombre"
            className={claseControl()}
          />
          <select
            value={j.responsable ?? ""}
            onChange={(e) => actualizar(i, { responsable: e.target.value || null })}
            aria-label="Responsable"
            className={claseControl()}
          >
            <option value="">Responsable…</option>
            {jugadores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setLista((x) => x.filter((_, k) => k !== i))}
            className="rounded-lg px-3 text-sm text-slate-500 hover:bg-slate-100"
            aria-label="Quitar jugador"
          >
            ✕
          </button>
          <textarea
            value={j.como}
            onChange={(e) => actualizar(i, { como: e.target.value })}
            rows={2}
            maxLength={500}
            placeholder="Cómo lo neutralizamos"
            aria-label="Cómo lo neutralizamos"
            className={cn(claseControl(), "sm:col-span-4")}
          />
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        {lista.length < 6 && (
          <Button
            type="button"
            variante="ghost"
            onClick={() =>
              setLista((x) => [...x, { nombre: "", dorsal: null, como: "", responsable: null }])
            }
          >
            + Agregar jugador clave
          </Button>
        )}
        <Button
          type="button"
          variante="secondary"
          cargando={pendiente}
          onClick={() =>
            ejecutar(
              () => guardarJugadoresClave(partidoId, lista),
              () => {
                setGuardado(true);
                setTimeout(() => setGuardado(false), 2000);
              },
            )
          }
        >
          {guardado ? "Guardado ✓" : "Guardar jugadores clave"}
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
