"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  agregarHabitacion,
  asignarHabitacion,
  cambiarCapacidadHabitacion,
  eliminarHabitacion,
  guardarConcentracion,
  quitarConcentracion,
  renombrarHabitacion,
  repetirUltimasHabitaciones,
} from "@/app/(dashboard)/partidos/plan-actions";
import { cn } from "@/lib/utils/cn";
import { horaCorta } from "@/lib/utils/fecha";
import type { Jugador } from "@/types/jugador";
import type { Concentracion, Habitacion } from "@/types/partido";
import { AutoSaveField } from "@/components/ui/AutoSaveField";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Field";
import { useAccion } from "@/components/ui/useAccion";

/** ¿Hay concentración? Lugar, entrada, salida y el armado de habitaciones. */
export function ConcentracionPanel({
  partidoId,
  fechaPartido,
  concentracion,
  habitaciones,
  convocados,
}: {
  partidoId: string;
  fechaPartido: string;
  concentracion: Concentracion | null;
  habitaciones: Habitacion[];
  convocados: Jugador[];
}) {
  const [hay, setHay] = useState(concentracion !== null);
  const [quitando, setQuitando] = useState(false);
  const quitar = useAccion();

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Concentración</h2>
        <div
          className="flex rounded-lg border border-slate-300 p-0.5"
          role="radiogroup"
          aria-label="¿Hay concentración?"
        >
          {[
            { valor: true, label: "Hay concentración" },
            { valor: false, label: "No hay" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={hay === o.valor}
              onClick={() => {
                if (o.valor) setHay(true);
                else if (concentracion) setQuitando(true);
                else setHay(false);
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                hay === o.valor ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {hay && (
        <>
          <DatosConcentracion
            partidoId={partidoId}
            fechaPartido={fechaPartido}
            concentracion={concentracion}
          />
          {concentracion && (
            <Habitaciones
              partidoId={partidoId}
              habitaciones={habitaciones}
              convocados={convocados}
            />
          )}
        </>
      )}

      <ConfirmDialog
        abierto={quitando}
        titulo="Sin concentración"
        descripcion="Se borran los datos de la concentración, las habitaciones y la actividad del calendario."
        textoConfirmar="Borrar concentración"
        cargando={quitar.pendiente}
        error={quitar.error}
        onConfirmar={() =>
          quitar.ejecutar(
            () => quitarConcentracion(partidoId),
            () => {
              setQuitando(false);
              setHay(false);
            },
          )
        }
        onCerrar={() => setQuitando(false)}
      />
    </section>
  );
}

function DatosConcentracion({
  partidoId,
  fechaPartido,
  concentracion,
}: {
  partidoId: string;
  fechaPartido: string;
  concentracion: Concentracion | null;
}) {
  const { pendiente, error, ejecutar } = useAccion();
  const [v, setV] = useState({
    lugar: concentracion?.lugar ?? "",
    entrada_fecha: concentracion?.entrada_fecha ?? "",
    entrada_hora: horaCorta(concentracion?.entrada_hora) ?? "",
    salida_fecha: concentracion?.salida_fecha ?? fechaPartido,
    salida_hora: horaCorta(concentracion?.salida_hora) ?? "",
    notas: concentracion?.notas ?? "",
  });
  const [guardado, setGuardado] = useState(false);

  function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    ejecutar(
      () =>
        guardarConcentracion(partidoId, {
          ...v,
          entrada_fecha: v.entrada_fecha || null,
          salida_fecha: v.salida_fecha || null,
        }),
      () => {
        setGuardado(true);
        setTimeout(() => setGuardado(false), 2000);
      },
    );
  }

  const campo = (clave: keyof typeof v) => ({
    value: v[clave],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setV((x) => ({ ...x, [clave]: e.target.value })),
  });

  return (
    <form onSubmit={guardar} className="space-y-3">
      <Input
        label="Hotel o lugar"
        maxLength={150}
        placeholder="Hotel Radisson"
        {...campo("lugar")}
      />
      <div className="grid gap-3 sm:grid-cols-4">
        <Input label="Entrada" type="date" {...campo("entrada_fecha")} />
        <Input label="Hora" type="time" {...campo("entrada_hora")} />
        <Input label="Salida" type="date" {...campo("salida_fecha")} />
        <Input label="Hora" type="time" {...campo("salida_hora")} />
      </div>
      <Input
        label="Notas"
        maxLength={1000}
        placeholder="Cena 21:00, desayuno 9:00…"
        {...campo("notas")}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" cargando={pendiente}>
          {guardado ? "Guardado ✓" : concentracion ? "Guardar cambios" : "Guardar concentración"}
        </Button>
        <span className="text-xs text-slate-500">
          Con la fecha de entrada, la concentración aparece sola en el calendario y en la semana que
          se comparte.
        </span>
      </div>
    </form>
  );
}

function Habitaciones({
  partidoId,
  habitaciones,
  convocados,
}: {
  partidoId: string;
  habitaciones: Habitacion[];
  convocados: Jugador[];
}) {
  const { pendiente, error, ejecutar } = useAccion();
  const repetir = useAccion();
  // Tocar y después tocar la habitación (tablet y celular); arrastrar en la computadora
  const [elegido, setElegido] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const porId = new Map(convocados.map((j) => [j.id, j]));
  const asignados = new Set(habitaciones.flatMap((h) => h.jugadores));
  const sinHabitacion = convocados.filter((j) => !asignados.has(j.id));
  const camas = habitaciones.reduce((t, h) => t + h.capacidad, 0);
  const SIN = "sin-habitacion";

  function mover(jugadorId: string, habitacionId: string | null) {
    ejecutar(
      () => asignarHabitacion(partidoId, jugadorId, habitacionId),
      () => setElegido(null),
    );
  }

  const zona = (id: string, habitacionId: string | null, llena: boolean) => ({
    onDragOver: (e: React.DragEvent) => {
      if (llena) return;
      e.preventDefault();
      setSobre(id);
    },
    onDragLeave: () => setSobre((x) => (x === id ? null : x)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setSobre(null);
      const jugadorId = e.dataTransfer.getData("text/plain");
      if (jugadorId) mover(jugadorId, habitacionId);
    },
  });

  const chip = (j: Jugador, enHabitacion: boolean) => {
    const activo = elegido === j.id;
    return (
      <span
        key={j.id}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", j.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onClick={() => setElegido(activo ? null : j.id)}
        className={cn(
          "inline-flex cursor-grab select-none items-center gap-1 rounded-full py-1 pl-2.5 text-xs font-medium ring-1 ring-inset transition-colors active:cursor-grabbing",
          enHabitacion ? "pr-1" : "pr-2.5",
          activo
            ? "bg-brand-600 text-white ring-brand-600"
            : enHabitacion
              ? "bg-slate-900 text-white ring-slate-900"
              : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50",
        )}
      >
        {j.numero ? `${j.numero}. ` : ""}
        {j.nombre}
        {enHabitacion && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              mover(j.id, null);
            }}
            className="rounded-full px-1 text-slate-300 hover:bg-slate-700 hover:text-white"
            aria-label={`Sacar a ${j.nombre} de la habitación`}
          >
            ×
          </button>
        )}
      </span>
    );
  };

  return (
    <div className="space-y-4 border-t border-slate-100 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900">Habitaciones</h3>
          <p className="text-xs text-slate-500">
            Arrastrá cada nombre a su habitación (en tablet o celular: tocá el nombre y después la
            habitación). {camas} camas para {convocados.length} convocados.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variante="secondary"
            className="px-3 py-1.5"
            disabled={pendiente}
            onClick={() => ejecutar(() => agregarHabitacion(partidoId, 2))}
          >
            + Doble
          </Button>
          <Button
            variante="secondary"
            className="px-3 py-1.5"
            disabled={pendiente}
            onClick={() => ejecutar(() => agregarHabitacion(partidoId, 3))}
          >
            + Triple
          </Button>
          <Button
            variante="ghost"
            className="px-3 py-1.5"
            cargando={repetir.pendiente}
            onClick={() =>
              repetir.ejecutar(async () => {
                const r = await repetirUltimasHabitaciones(partidoId);
                return r.ok ? { ok: true } : r;
              })
            }
          >
            Repetir la última concentración
          </Button>
          <Link
            href={`/imprimir/convocatoria/${partidoId}?que=habitaciones`}
            target="_blank"
            className="inline-flex items-center rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Exportar para directiva (PDF) ↗
          </Link>
        </div>
      </div>
      {(error || repetir.error) && <p className="text-sm text-red-600">{error ?? repetir.error}</p>}

      {convocados.length === 0 ? (
        <p className="text-sm text-slate-500">Primero armá la convocatoria.</p>
      ) : (
        <div
          {...zona(SIN, null, false)}
          onClick={() => elegido && asignados.has(elegido) && mover(elegido, null)}
          className={cn(
            "space-y-2 rounded-xl border-2 border-dashed p-3 transition-colors",
            sobre === SIN ? "border-brand-400 bg-brand-50" : "border-slate-200 bg-slate-50",
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Sin habitación ({sinHabitacion.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sinHabitacion.length === 0 ? (
              <span className="text-xs text-emerald-700">Todos tienen habitación.</span>
            ) : (
              sinHabitacion.map((j) => chip(j, false))
            )}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {habitaciones.map((h) => {
          const llena = h.jugadores.length >= h.capacidad;
          const destino = elegido !== null && !llena && !h.jugadores.includes(elegido);
          return (
            <div
              key={h.id}
              {...zona(h.id, h.id, llena)}
              onClick={() => destino && elegido && mover(elegido, h.id)}
              className={cn(
                "min-h-32 space-y-2 rounded-xl border-2 p-3 transition-colors",
                sobre === h.id
                  ? "border-brand-500 bg-brand-50"
                  : destino
                    ? "cursor-pointer border-brand-300 bg-brand-50/40"
                    : "border-slate-200",
              )}
            >
              <div className="flex items-start gap-2" onClick={(e) => e.stopPropagation()}>
                <div className="min-w-0 flex-1">
                  <AutoSaveField
                    label={`${h.jugadores.length}/${h.capacidad} camas`}
                    valorInicial={h.nombre}
                    onGuardar={(v) => renombrarHabitacion(partidoId, h.id, v)}
                  />
                </div>
                <div className="mt-6 flex shrink-0 items-center gap-1">
                  <select
                    value={h.capacidad}
                    onChange={(e) =>
                      ejecutar(() =>
                        cambiarCapacidadHabitacion(partidoId, h.id, Number(e.target.value)),
                      )
                    }
                    aria-label="Tipo de habitación"
                    className="rounded-md border border-slate-300 bg-white px-1.5 py-1 text-xs"
                  >
                    <option value={1}>Single</option>
                    <option value={2}>Doble</option>
                    <option value={3}>Triple</option>
                    <option value={4}>Cuádruple</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => ejecutar(() => eliminarHabitacion(partidoId, h.id))}
                    className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Borrar ${h.nombre}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {h.jugadores.map((id) => {
                  const j = porId.get(id);
                  return j ? (
                    chip(j, true)
                  ) : (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-200 py-1 pl-2.5 pr-1 text-xs text-slate-600"
                    >
                      No convocado
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          mover(id, null);
                        }}
                        className="rounded-full px-1 hover:bg-slate-300"
                        aria-label="Sacar de la habitación"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
                {h.jugadores.length === 0 && (
                  <span className="text-xs text-slate-400">Soltá acá a los jugadores</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
