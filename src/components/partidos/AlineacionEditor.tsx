"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { guardarAlineacion } from "@/app/(dashboard)/partidos/avanzado-actions";
import {
  limpiarAlineacion,
  moverJugador,
  normalizarTitulares,
  type Destino,
} from "@/lib/alineacion";
import { cn } from "@/lib/utils/cn";
import {
  FORMACIONES,
  LISTA_FORMACIONES,
  etiquetaFormacion,
  type AlineacionPartido,
  type Formacion,
} from "@/types/alineacion";
import { POSICIONES, POSICION_LABEL, type Jugador } from "@/types/jugador";
import { CampoFutbol } from "@/components/campo/CampoFutbol";
import { PosicionBadge } from "@/components/jugadores/PosicionBadge";

type EstadoGuardado = "idle" | "guardando" | "guardado" | "error";

interface Props {
  partidoId: string;
  alineacion: AlineacionPartido | null;
  jugadores: Jugador[];
}

const MIME_JUGADOR = "application/x-jugador-id";

function apellido(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return partes.length > 1 ? (partes[1] ?? nombre) : nombre;
}

export function AlineacionEditor({ partidoId, alineacion, jugadores }: Props) {
  const porId = useMemo(() => new Map(jugadores.map((j) => [j.id, j])), [jugadores]);

  const [formacion, setFormacion] = useState<Formacion>(alineacion?.formacion ?? "4-3-3");
  const [estado, setEstado] = useState(() =>
    limpiarAlineacion(
      { titulares: alineacion?.titulares ?? [], suplentes: alineacion?.suplentes ?? [] },
      new Set(porId.keys()),
    ),
  );
  /** Jugador seleccionado para colocar con clic/toque (alternativa al arrastre) */
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [destinoHover, setDestinoHover] = useState<string | null>(null);
  const [guardado, setGuardado] = useState<EstadoGuardado>("idle");
  const [error, setError] = useState<string | null>(null);

  const slots = FORMACIONES[formacion];
  const titulares = normalizarTitulares(estado.titulares);
  const enAlineacion = new Set([...titulares.filter(Boolean), ...estado.suplentes] as string[]);
  const disponibles = jugadores.filter((j) => !enAlineacion.has(j.id));

  // Guardado automático con debounce tras cada cambio (no en el primer render)
  const primerRender = useRef(true);
  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }
    setGuardado("guardando");
    const t = setTimeout(async () => {
      try {
        const r = await guardarAlineacion(partidoId, { formacion, ...estado });
        setGuardado(r.ok ? "guardado" : "error");
        setError(r.ok ? null : r.error);
      } catch {
        setGuardado("error");
        setError("Error de conexión. El próximo cambio volverá a intentarlo.");
      }
    }, 600);
    return () => clearTimeout(t);
  }, [partidoId, formacion, estado]);

  function mover(jugadorId: string, destino: Destino) {
    setEstado((prev) => moverJugador(prev, jugadorId, destino));
    setSeleccionado(null);
  }

  /** Clic en un hueco o zona: coloca el seleccionado, o selecciona al ocupante. */
  function clicDestino(destino: Destino, ocupante: string | null = null) {
    if (seleccionado) mover(seleccionado, destino);
    else if (ocupante) setSeleccionado(ocupante);
  }

  function propsArrastre(jugadorId: string) {
    return {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        e.dataTransfer.setData(MIME_JUGADOR, jugadorId);
        e.dataTransfer.effectAllowed = "move";
        setSeleccionado(null);
      },
    };
  }

  function propsSoltar(clave: string, destino: Destino) {
    return {
      onDragOver: (e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes(MIME_JUGADOR)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDestinoHover(clave);
      },
      onDragLeave: () => setDestinoHover((h) => (h === clave ? null : h)),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        setDestinoHover(null);
        const id = e.dataTransfer.getData(MIME_JUGADOR);
        if (id) mover(id, destino);
      },
    };
  }

  const titularesColocados = titulares.filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Formación">
          {LISTA_FORMACIONES.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={formacion === f}
              onClick={() => setFormacion(f)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-semibold tabular-nums transition-colors",
                formacion === f
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              {etiquetaFormacion(f)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">
            {titularesColocados}/11 titulares · {estado.suplentes.length} suplentes
          </span>
          <IndicadorGuardado estado={guardado} />
          <button
            type="button"
            onClick={() => setEstado({ titulares: [], suplentes: [] })}
            className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            Vaciar
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-slate-500">
        Arrastrá jugadores a la cancha o al banco. En el celular: tocá un jugador y después el
        lugar.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Campo */}
        <div className="mx-auto w-full max-w-md">
          <CampoFutbol>
            {slots.map((slot, i) => {
              const id = titulares[i] ?? null;
              const jugador = id ? porId.get(id) : undefined;
              const clave = `slot-${i}`;
              return (
                <div
                  key={clave}
                  {...propsSoltar(clave, { tipo: "slot", indice: i })}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                >
                  <button
                    type="button"
                    {...(jugador ? propsArrastre(jugador.id) : {})}
                    onClick={() => clicDestino({ tipo: "slot", indice: i }, id)}
                    aria-label={
                      jugador ? `${slot.label}: ${jugador.nombre}` : `${slot.label}: vacío`
                    }
                    className={cn(
                      "flex w-16 flex-col items-center gap-0.5 rounded-lg p-0.5 transition-transform",
                      destinoHover === clave && "scale-110",
                      jugador ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold shadow-md ring-2 transition-colors",
                        jugador
                          ? "bg-white text-slate-900 ring-slate-900/20"
                          : "border-2 border-dashed border-white/70 bg-white/10 text-white/80 ring-transparent",
                        seleccionado && seleccionado === id && "ring-4 ring-amber-400",
                        destinoHover === clave && "ring-4 ring-amber-300",
                        seleccionado && !jugador && "animate-pulse bg-white/25",
                      )}
                    >
                      {jugador ? (jugador.numero ?? "–") : slot.label}
                    </span>
                    <span className="max-w-full truncate rounded bg-slate-900/70 px-1.5 text-[11px] font-medium leading-4 text-white">
                      {jugador ? apellido(jugador.nombre) : slot.label}
                    </span>
                  </button>
                </div>
              );
            })}
          </CampoFutbol>
        </div>

        {/* Panel lateral */}
        <aside className="space-y-4">
          <ZonaJugadores
            titulo="Banco"
            vacio="Arrastrá acá a los suplentes"
            resaltada={destinoHover === "banquillo"}
            seleccionActiva={seleccionado !== null}
            onClickZona={() => clicDestino({ tipo: "banquillo" })}
            soltar={propsSoltar("banquillo", { tipo: "banquillo" })}
          >
            {estado.suplentes.map((id) => {
              const j = porId.get(id);
              return j ? (
                <FichaJugador
                  key={id}
                  jugador={j}
                  seleccionado={seleccionado === id}
                  arrastre={propsArrastre(id)}
                  onClick={() => setSeleccionado(seleccionado === id ? null : id)}
                />
              ) : null;
            })}
          </ZonaJugadores>

          <ZonaJugadores
            titulo="Disponibles"
            vacio={
              jugadores.length === 0 ? "No hay jugadores en el plantel" : "Todos están convocados"
            }
            resaltada={destinoHover === "disponibles"}
            seleccionActiva={seleccionado !== null}
            onClickZona={() => clicDestino({ tipo: "disponibles" })}
            soltar={propsSoltar("disponibles", { tipo: "disponibles" })}
            scroll
          >
            {POSICIONES.map((pos) => {
              const grupo = disponibles.filter((j) => j.posicion === pos);
              if (grupo.length === 0) return null;
              return (
                <div key={pos} className="space-y-1.5">
                  <p className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {POSICION_LABEL[pos]}
                  </p>
                  {grupo.map((j) => (
                    <FichaJugador
                      key={j.id}
                      jugador={j}
                      seleccionado={seleccionado === j.id}
                      arrastre={propsArrastre(j.id)}
                      onClick={() => setSeleccionado(seleccionado === j.id ? null : j.id)}
                    />
                  ))}
                </div>
              );
            })}
          </ZonaJugadores>
        </aside>
      </div>
    </div>
  );
}

function ZonaJugadores({
  titulo,
  vacio,
  resaltada,
  seleccionActiva,
  onClickZona,
  soltar,
  scroll = false,
  children,
}: {
  titulo: string;
  vacio: string;
  resaltada: boolean;
  seleccionActiva: boolean;
  onClickZona: () => void;
  soltar: React.HTMLAttributes<HTMLDivElement>;
  scroll?: boolean;
  children: React.ReactNode;
}) {
  const hijos = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return (
    <section
      {...soltar}
      aria-label={titulo}
      className={cn(
        "rounded-xl border-2 bg-white p-3 transition-colors",
        resaltada ? "border-amber-400 bg-amber-50" : "border-slate-200",
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">{titulo}</h3>
        {seleccionActiva && (
          <button
            type="button"
            onClick={onClickZona}
            className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 hover:bg-amber-200"
          >
            Mover acá
          </button>
        )}
      </div>
      <div className={cn("space-y-1.5", scroll && "max-h-[420px] overflow-y-auto pr-1")}>
        {hijos.length > 0 ? (
          children
        ) : (
          <p className="py-3 text-center text-xs text-slate-400">{vacio}</p>
        )}
      </div>
    </section>
  );
}

function FichaJugador({
  jugador,
  seleccionado,
  arrastre,
  onClick,
}: {
  jugador: Jugador;
  seleccionado: boolean;
  arrastre: React.HTMLAttributes<HTMLButtonElement> & { draggable: boolean };
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      {...arrastre}
      onClick={onClick}
      aria-pressed={seleccionado}
      className={cn(
        "flex w-full cursor-grab items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-sm transition-colors active:cursor-grabbing",
        seleccionado
          ? "border-amber-400 bg-amber-50 ring-2 ring-amber-300"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
      )}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
        {jugador.numero ?? "–"}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{jugador.nombre}</span>
      <PosicionBadge posicion={jugador.posicion} />
    </button>
  );
}

function IndicadorGuardado({ estado }: { estado: EstadoGuardado }) {
  const texto = { idle: "", guardando: "Guardando…", guardado: "Guardado ✓", error: "No guardado" }[
    estado
  ];
  return (
    <span
      aria-live="polite"
      className={cn(
        "text-xs",
        estado === "guardado" && "text-brand-600",
        estado === "guardando" && "text-slate-500",
        estado === "error" && "text-red-600",
      )}
    >
      {texto}
    </span>
  );
}
