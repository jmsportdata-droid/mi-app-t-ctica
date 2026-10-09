"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BUCKETS, urlImagen } from "@/lib/storage/config";
import { textoEspacio, textoTiempo } from "@/lib/tareas";
import { cn } from "@/lib/utils/cn";
import {
  construirArbol,
  indiceObjetivos,
  INFO_MOMENTO,
  MOMENTOS,
  type EtiquetaObjetivo,
  type MomentoJuego,
  type PrincipioJuego,
} from "@/types/modelo-juego";
import {
  INFO_TIPO_TAREA,
  ORIENTACIONES,
  TIPOS_TAREA,
  type OrientacionFisica,
  type TareaConVinculos,
  type TipoTarea,
} from "@/types/tarea";
import { claseControl } from "@/components/ui/Field";

/** Sin tildes ni mayúsculas, para buscar. */
function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function BancoTareas({
  tareas,
  principios,
}: {
  tareas: TareaConVinculos[];
  principios: PrincipioJuego[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState<TipoTarea | "">("");
  const [momento, setMomento] = useState<MomentoJuego | "">("");
  const [principioId, setPrincipioId] = useState("");
  const [orientacion, setOrientacion] = useState<OrientacionFisica | "">("");
  const [verArchivadas, setVerArchivadas] = useState(false);

  const indice = useMemo(() => indiceObjetivos(principios), [principios]);
  const arbol = useMemo(() => construirArbol(principios), [principios]);
  const padreDe = useMemo(
    () => new Map(principios.map((p) => [p.id, p.padre_id ?? p.id])),
    [principios],
  );

  const archivadas = tareas.filter((t) => t.archivada).length;
  const filtradas = tareas.filter((t) => {
    if (t.archivada !== verArchivadas) return false;
    if (tipo && t.tipo !== tipo) return false;
    if (orientacion && t.orientacion_fisica !== orientacion) return false;
    if (momento && !t.objetivos.some((id) => indice.get(id)?.momento === momento)) return false;
    if (principioId && !t.objetivos.some((id) => padreDe.get(id) === principioId)) return false;
    if (busqueda.trim()) {
      const q = normalizar(busqueda.trim());
      if (!normalizar(`${t.nombre} ${t.formato ?? ""} ${t.descripcion ?? ""}`).includes(q)) {
        return false;
      }
    }
    return true;
  });

  const hayFiltros = Boolean(busqueda || tipo || momento || principioId || orientacion);

  return (
    <div className="space-y-5">
      <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar…"
          aria-label="Buscar tareas"
          className={cn(claseControl(), "lg:col-span-1")}
        />
        <select
          aria-label="Tipo de tarea"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoTarea | "")}
          className={claseControl()}
        >
          <option value="">Todos los tipos</option>
          {TIPOS_TAREA.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Momento del juego"
          value={momento}
          onChange={(e) => {
            setMomento(e.target.value as MomentoJuego | "");
            setPrincipioId("");
          }}
          className={claseControl()}
        >
          <option value="">Todos los momentos</option>
          {MOMENTOS.map((m) => (
            <option key={m.valor} value={m.valor}>
              {m.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Principio"
          value={principioId}
          onChange={(e) => setPrincipioId(e.target.value)}
          disabled={!momento}
          className={claseControl()}
        >
          <option value="">{momento ? "Todos los principios" : "Elegí un momento"}</option>
          {momento &&
            arbol[momento].map(({ principio }) => (
              <option key={principio.id} value={principio.id}>
                {principio.nombre}
              </option>
            ))}
        </select>
        <select
          aria-label="Orientación física"
          value={orientacion}
          onChange={(e) => setOrientacion(e.target.value as OrientacionFisica | "")}
          className={claseControl()}
        >
          <option value="">Toda orientación</option>
          {ORIENTACIONES.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.label} ({o.dia})
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
        <p>
          {filtradas.length} {filtradas.length === 1 ? "tarea" : "tareas"}
          {verArchivadas && " archivadas"}
          {hayFiltros && (
            <button
              type="button"
              onClick={() => {
                setBusqueda("");
                setTipo("");
                setMomento("");
                setPrincipioId("");
                setOrientacion("");
              }}
              className="ml-3 font-medium text-brand-700 hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </p>
        {(archivadas > 0 || verArchivadas) && (
          <button
            type="button"
            onClick={() => setVerArchivadas((v) => !v)}
            className="font-medium text-slate-600 hover:text-slate-900"
          >
            {verArchivadas ? "Ver el banco activo" : `Ver archivadas (${archivadas})`}
          </button>
        )}
      </div>

      {filtradas.length === 0 ? (
        <p className="rounded-xl border-2 border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-500">
          No hay tareas con esos filtros.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtradas.map((t) => (
            <li key={t.id}>
              <TarjetaTarea tarea={t} indice={indice} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TarjetaTarea({
  tarea,
  indice,
}: {
  tarea: TareaConVinculos;
  indice: Map<string, EtiquetaObjetivo>;
}) {
  const info = INFO_TIPO_TAREA[tarea.tipo];
  const grafico = urlImagen(BUCKETS.graficosTareas, tarea.grafico_ruta);
  const datos = [textoTiempo(tarea), textoEspacio(tarea), tarea.formato].filter(Boolean);
  const objetivos = tarea.objetivos
    .map((id) => indice.get(id))
    .filter((o): o is EtiquetaObjetivo => o !== undefined);

  return (
    <Link
      href={`/tareas/${tarea.id}`}
      className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {grafico && (
        // Imagen privada servida por la app: next/image no aplica
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={grafico}
          alt=""
          className="aspect-video w-full border-b border-slate-100 bg-slate-50 object-contain"
        />
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span
          className={cn(
            "self-start rounded-full px-2 py-0.5 text-[11px] font-semibold",
            info.color,
          )}
        >
          {info.label}
        </span>
        <h3 className="font-semibold leading-snug text-slate-900">{tarea.nombre}</h3>
        {datos.length > 0 && <p className="text-xs text-slate-500">{datos.join(" · ")}</p>}
        {objetivos.length > 0 && (
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-1">
            {objetivos.slice(0, 3).map((o) => (
              <li
                key={o.texto}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
              >
                <span
                  className={cn("h-1.5 w-1.5 rounded-full", INFO_MOMENTO[o.momento].punto)}
                  aria-hidden
                />
                {o.nombre}
              </li>
            ))}
            {objetivos.length > 3 && (
              <li className="px-1 text-[11px] text-slate-400">+{objetivos.length - 3}</li>
            )}
          </ul>
        )}
      </div>
    </Link>
  );
}
