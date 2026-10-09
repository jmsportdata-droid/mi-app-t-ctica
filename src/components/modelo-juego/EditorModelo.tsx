"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  actualizarPrincipio,
  alternarOcultoPrincipio,
  crearPrincipio,
  eliminarPrincipio,
  moverPrincipio,
} from "@/app/(dashboard)/modelo-de-juego/actions";
import { cn } from "@/lib/utils/cn";
import {
  MOMENTOS,
  type ArbolModelo,
  type MomentoJuego,
  type PrincipioJuego,
} from "@/types/modelo-juego";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Resultado = { ok: true } | { ok: false; error: string };

/** Ejecuta una acción, refresca la página y devuelve el error (o null). */
function useAccion() {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function ejecutar(accion: () => Promise<Resultado>, alTerminar?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        const r = await accion();
        if (!r.ok) {
          setError(r.error);
          return;
        }
        alTerminar?.();
        router.refresh();
      } catch {
        setError("Error de conexión. Probá de nuevo.");
      }
    });
  }
  return { pendiente, error, setError, ejecutar };
}

export function EditorModelo({ arbol }: { arbol: ArbolModelo }) {
  const [momento, setMomento] = useState<MomentoJuego>("organizacion_ofensiva");
  const principios = arbol[momento];

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Momentos del juego"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {MOMENTOS.map((m) => {
          const activo = m.valor === momento;
          const visibles = arbol[m.valor].filter((p) => !p.principio.oculto).length;
          return (
            <button
              key={m.valor}
              type="button"
              role="tab"
              aria-selected={activo}
              onClick={() => setMomento(m.valor)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ring-1 ring-inset transition-colors",
                activo
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50",
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", m.punto)} aria-hidden />
              {m.label}
              <span className="tabular-nums opacity-70">{visibles}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="space-y-3">
        {principios.length === 0 && (
          <p className="rounded-xl border-2 border-dashed border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
            Todavía no hay principios en este momento del juego.
          </p>
        )}
        {principios.map(({ principio, subprincipios }, i) => (
          <article
            key={principio.id}
            className={cn(
              "rounded-xl border border-slate-200 bg-white p-4 shadow-sm",
              principio.oculto && "opacity-60",
            )}
          >
            <Item
              item={principio}
              esPrimero={i === 0}
              esUltimo={i === principios.length - 1}
              nivel="principio"
            />
            <ul className="mt-3 space-y-1 border-l-2 border-slate-100 pl-4">
              {subprincipios.map((sub, j) => (
                <li key={sub.id}>
                  <Item
                    item={sub}
                    esPrimero={j === 0}
                    esUltimo={j === subprincipios.length - 1}
                    nivel="subprincipio"
                  />
                </li>
              ))}
              <li>
                <AgregarItem
                  momento={momento}
                  padreId={principio.id}
                  texto="Agregar subprincipio"
                />
              </li>
            </ul>
          </article>
        ))}
        <AgregarItem momento={momento} padreId={null} texto="Agregar principio" destacado />
      </div>
    </div>
  );
}

function Item({
  item,
  esPrimero,
  esUltimo,
  nivel,
}: {
  item: PrincipioJuego;
  esPrimero: boolean;
  esUltimo: boolean;
  nivel: "principio" | "subprincipio";
}) {
  const { pendiente, error, setError, ejecutar } = useAccion();
  const [editando, setEditando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [nombre, setNombre] = useState(item.nombre);
  const [descripcion, setDescripcion] = useState(item.descripcion ?? "");

  function handleGuardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    ejecutar(
      () => actualizarPrincipio(item.id, nombre, descripcion),
      () => setEditando(false),
    );
  }

  if (editando) {
    return (
      <form onSubmit={handleGuardar} className="space-y-2 py-1">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={120}
          autoFocus
          aria-label="Nombre"
          className="block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        {nivel === "principio" && (
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Descripción (opcional)"
            aria-label="Descripción"
            className="block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" className="px-3 py-1" cargando={pendiente}>
            Guardar
          </Button>
          <Button
            type="button"
            variante="ghost"
            className="px-3 py-1"
            onClick={() => {
              setEditando(false);
              setNombre(item.nombre);
              setDescripcion(item.descripcion ?? "");
              setError(null);
            }}
          >
            Cancelar
          </Button>
        </div>
      </form>
    );
  }

  const botonIcono =
    "rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30";

  return (
    <div className="group">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              nivel === "principio" ? "font-semibold text-slate-900" : "text-sm text-slate-700",
            )}
          >
            {item.nombre}
            {item.oculto && (
              <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
                Oculto
              </span>
            )}
          </p>
          {nivel === "principio" && item.descripcion && (
            <p className="mt-0.5 text-sm text-slate-500">{item.descripcion}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            className={botonIcono}
            disabled={esPrimero || pendiente}
            onClick={() => ejecutar(() => moverPrincipio(item.id, "arriba"))}
            aria-label={`Subir ${item.nombre}`}
          >
            ↑
          </button>
          <button
            type="button"
            className={botonIcono}
            disabled={esUltimo || pendiente}
            onClick={() => ejecutar(() => moverPrincipio(item.id, "abajo"))}
            aria-label={`Bajar ${item.nombre}`}
          >
            ↓
          </button>
          <button
            type="button"
            className={botonIcono}
            onClick={() => {
              setNombre(item.nombre);
              setDescripcion(item.descripcion ?? "");
              setEditando(true);
            }}
          >
            Editar
          </button>
          <button
            type="button"
            className={botonIcono}
            disabled={pendiente}
            onClick={() => ejecutar(() => alternarOcultoPrincipio(item.id, !item.oculto))}
          >
            {item.oculto ? "Mostrar" : "Ocultar"}
          </button>
          <button
            type="button"
            className={cn(botonIcono, "hover:bg-red-50 hover:text-red-600")}
            onClick={() => setBorrando(true)}
          >
            Borrar
          </button>
        </div>
      </div>
      {error && !borrando && <p className="mt-1 text-xs text-red-600">{error}</p>}

      <ConfirmDialog
        abierto={borrando}
        titulo={`¿Borrar "${item.nombre}"?`}
        descripcion={
          nivel === "principio"
            ? "Se borra el principio con todos sus subprincipios. Si solo querés que no aparezca en los desplegables, ocultalo."
            : "Si solo querés que no aparezca en los desplegables, ocultalo."
        }
        textoConfirmar="Borrar"
        cargando={pendiente}
        error={borrando ? error : null}
        onConfirmar={() =>
          ejecutar(
            () => eliminarPrincipio(item.id),
            () => setBorrando(false),
          )
        }
        onCerrar={() => {
          setBorrando(false);
          setError(null);
        }}
      />
    </div>
  );
}

function AgregarItem({
  momento,
  padreId,
  texto,
  destacado = false,
}: {
  momento: MomentoJuego;
  padreId: string | null;
  texto: string;
  destacado?: boolean;
}) {
  const { pendiente, error, ejecutar } = useAccion();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={cn(
          "text-sm font-medium transition-colors",
          destacado
            ? "w-full rounded-xl border-2 border-dashed border-slate-300 py-3 text-slate-600 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
            : "py-1 text-brand-700 hover:underline",
        )}
      >
        + {texto}
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        ejecutar(
          () => crearPrincipio(momento, padreId, nombre),
          () => {
            setNombre("");
            setAbierto(false);
          },
        );
      }}
      className="flex flex-wrap items-center gap-2 py-1"
    >
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        maxLength={120}
        autoFocus
        placeholder={padreId ? "Nombre del subprincipio" : "Nombre del principio"}
        aria-label={texto}
        className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
      <Button type="submit" className="px-3 py-1.5" cargando={pendiente}>
        Agregar
      </Button>
      <Button
        type="button"
        variante="ghost"
        className="px-3 py-1.5"
        onClick={() => setAbierto(false)}
      >
        Cancelar
      </Button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  );
}
