"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  agregarTareaSesion,
  ajustarTareaSesion,
  moverTareaSesion,
  quitarTareaSesion,
} from "@/app/(dashboard)/microciclo/actions";
import { noEncajaConElDia } from "@/lib/sesiones";
import {
  duracionParaEditar,
  formatearSegundos,
  parsearDuracion,
  textoEspacio,
  textoTiempo,
} from "@/lib/tareas";
import { cn } from "@/lib/utils/cn";
import { indiceObjetivos, type PrincipioJuego } from "@/types/modelo-juego";
import type { TareaDeSesion } from "@/types/sesion";
import {
  ESPACIOS,
  INFO_ORIENTACION,
  INFO_TIPO_TAREA,
  TIPOS_TAREA,
  type EspacioTarea,
  type OrientacionFisica,
  type TareaConVinculos,
  type TipoTarea,
} from "@/types/tarea";
import { Button } from "@/components/ui/Button";
import { claseControl } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";

type Resultado = { ok: true } | { ok: false; error: string };

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
  return { pendiente, error, ejecutar };
}

interface Props {
  actividadId: string;
  tareas: TareaDeSesion[];
  banco: TareaConVinculos[];
  principios: PrincipioJuego[];
  /** Orientación física del día según la semana tipo (si la hay) */
  orientacionDelDia?: OrientacionFisica;
  md?: string;
}

export function EditorSesion({
  actividadId,
  tareas,
  banco,
  principios,
  orientacionDelDia,
  md,
}: Props) {
  const [agregando, setAgregando] = useState(false);
  const indice = useMemo(() => indiceObjetivos(principios), [principios]);
  const total = tareas.reduce((t, x) => t + (x.tiempo_total_seg ?? 0), 0);

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-900">
          Tareas{" "}
          {total > 0 && (
            <span className="font-normal text-slate-500">
              · {formatearSegundos(total)} planificados
            </span>
          )}
        </h2>
        <Button onClick={() => setAgregando(true)}>+ Agregar tarea</Button>
      </div>

      {tareas.length === 0 ? (
        <p className="rounded-xl border-2 border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
          Todavía no hay tareas. Agregalas del banco o aplicá una plantilla.
        </p>
      ) : (
        <ol className="space-y-2">
          {tareas.map((t, i) => (
            <FilaTarea
              key={t.id}
              fila={t}
              posicion={i + 1}
              esPrimera={i === 0}
              esUltima={i === tareas.length - 1}
              objetivos={t.tarea.objetivos
                .map((id) => indice.get(id)?.nombre)
                .filter((n): n is string => Boolean(n))}
              noEncaja={noEncajaConElDia(t.tarea, orientacionDelDia)}
              orientacionDelDia={orientacionDelDia}
            />
          ))}
        </ol>
      )}

      <SelectorTarea
        abierto={agregando}
        onCerrar={() => setAgregando(false)}
        actividadId={actividadId}
        banco={banco}
        enSesion={new Set(tareas.map((t) => t.tarea_id))}
        orientacionDelDia={orientacionDelDia}
        md={md}
      />
    </section>
  );
}

function FilaTarea({
  fila,
  posicion,
  esPrimera,
  esUltima,
  objetivos,
  noEncaja,
  orientacionDelDia,
}: {
  fila: TareaDeSesion;
  posicion: number;
  esPrimera: boolean;
  esUltima: boolean;
  objetivos: string[];
  noEncaja: boolean;
  orientacionDelDia?: OrientacionFisica;
}) {
  const { pendiente, error, ejecutar } = useAccion();
  const [ajustando, setAjustando] = useState(false);
  const info = INFO_TIPO_TAREA[fila.tarea.tipo];
  const datos = [
    textoTiempo(fila),
    fila.tiempo_total_seg && fila.series ? `(${formatearSegundos(fila.tiempo_total_seg)})` : null,
    textoEspacio(fila),
    fila.jugadores ? `${fila.jugadores} jugadores` : null,
  ].filter(Boolean);
  const boton =
    "rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30";

  return (
    <li className="rounded-xl border border-slate-200 p-3">
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
          {posicion}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", info.color)}>
              {info.label}
            </span>
            <Link
              href={`/tareas/${fila.tarea_id}`}
              className="font-medium text-slate-900 hover:underline"
            >
              {fila.tarea.nombre}
            </Link>
          </div>
          {datos.length > 0 && <p className="text-xs text-slate-500">{datos.join(" · ")}</p>}
          {objetivos.length > 0 && (
            <p className="text-xs text-slate-600">{objetivos.join(" · ")}</p>
          )}
          {fila.notas && <p className="text-xs italic text-slate-600">{fila.notas}</p>}
          {noEncaja && fila.tarea.orientacion_fisica && orientacionDelDia && (
            <p className="text-xs font-medium text-amber-700">
              Está pensada para{" "}
              {INFO_ORIENTACION[fila.tarea.orientacion_fisica].label.toLowerCase()} y hoy toca{" "}
              {INFO_ORIENTACION[orientacionDelDia].label.toLowerCase()}.
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            className={boton}
            disabled={esPrimera || pendiente}
            onClick={() => ejecutar(() => moverTareaSesion(fila.id, "arriba"))}
            aria-label="Subir"
          >
            ↑
          </button>
          <button
            type="button"
            className={boton}
            disabled={esUltima || pendiente}
            onClick={() => ejecutar(() => moverTareaSesion(fila.id, "abajo"))}
            aria-label="Bajar"
          >
            ↓
          </button>
          <button type="button" className={boton} onClick={() => setAjustando((v) => !v)}>
            Ajustar
          </button>
          <button
            type="button"
            className={cn(boton, "hover:bg-red-50 hover:text-red-600")}
            disabled={pendiente}
            onClick={() => ejecutar(() => quitarTareaSesion(fila.id))}
          >
            Quitar
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {ajustando && <AjusteTarea fila={fila} onListo={() => setAjustando(false)} />}
    </li>
  );
}

/** Tiempo, espacio y jugadores de la tarea solo para esta sesión. */
function AjusteTarea({ fila, onListo }: { fila: TareaDeSesion; onListo: () => void }) {
  const { pendiente, error, ejecutar } = useAccion();
  const texto = (n: number | null) => (n === null ? "" : String(n));
  const [v, setV] = useState({
    series: texto(fila.series),
    duracion: duracionParaEditar(fila.duracion_seg),
    pausa: duracionParaEditar(fila.pausa_seg),
    jugadores: texto(fila.jugadores),
    espacio: (fila.espacio ?? "") as EspacioTarea | "",
    largo_m: texto(fila.largo_m),
    ancho_m: texto(fila.ancho_m),
    notas: fila.notas ?? "",
  });
  const numero = (s: string) => (s.trim() === "" ? null : Number(s));

  function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const conMedidas = v.espacio !== "" && v.espacio !== "gimnasio";
    ejecutar(
      () =>
        ajustarTareaSesion(fila.id, {
          series: numero(v.series),
          duracion_seg: parsearDuracion(v.duracion),
          pausa_seg: v.series.trim() ? parsearDuracion(v.pausa) : null,
          jugadores: numero(v.jugadores),
          espacio: v.espacio || null,
          largo_m: conMedidas ? numero(v.largo_m) : null,
          ancho_m: conMedidas ? numero(v.ancho_m) : null,
          notas: v.notas,
        }),
      onListo,
    );
  }

  const campo = (
    label: string,
    clave: keyof typeof v,
    extra?: React.InputHTMLAttributes<HTMLInputElement>,
  ) => (
    <label className="space-y-1 text-xs font-medium text-slate-600">
      <span className="block">{label}</span>
      <input
        value={v[clave]}
        onChange={(e) => setV((x) => ({ ...x, [clave]: e.target.value }))}
        className={claseControl()}
        {...extra}
      />
    </label>
  );

  return (
    <form onSubmit={guardar} className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3">
      <div className="grid gap-2 sm:grid-cols-4">
        {campo("Series", "series", { type: "number", min: 1, max: 50, inputMode: "numeric" })}
        {campo("Duración", "duracion", { placeholder: "2:30" })}
        {campo("Pausa", "pausa", { placeholder: "0:30", disabled: !v.series })}
        {campo("Jugadores", "jugadores", { type: "number", min: 1, max: 40, inputMode: "numeric" })}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="space-y-1 text-xs font-medium text-slate-600">
          <span className="block">Espacio</span>
          <select
            value={v.espacio}
            onChange={(e) => setV((x) => ({ ...x, espacio: e.target.value as EspacioTarea | "" }))}
            className={claseControl()}
          >
            <option value="">Sin definir</option>
            {ESPACIOS.map((e) => (
              <option key={e.valor} value={e.valor}>
                {e.label}
              </option>
            ))}
          </select>
        </label>
        {v.espacio !== "" && v.espacio !== "gimnasio" && (
          <>
            {campo("Largo (m)", "largo_m", {
              type: "number",
              min: 1,
              max: 120,
              inputMode: "numeric",
            })}
            {campo("Ancho (m)", "ancho_m", {
              type: "number",
              min: 1,
              max: 90,
              inputMode: "numeric",
            })}
          </>
        )}
      </div>
      {campo("Nota para este día", "notas", {
        maxLength: 500,
        placeholder: "Ej. sumar comodín por banda",
      })}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" className="px-3 py-1.5" cargando={pendiente}>
          Guardar ajuste
        </Button>
        <Button type="button" variante="ghost" className="px-3 py-1.5" onClick={onListo}>
          Cancelar
        </Button>
      </div>
      <p className="text-[11px] text-slate-500">
        El ajuste vale solo para esta sesión: la ficha del banco no cambia.
      </p>
    </form>
  );
}

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function SelectorTarea({
  abierto,
  onCerrar,
  actividadId,
  banco,
  enSesion,
  orientacionDelDia,
  md,
}: {
  abierto: boolean;
  onCerrar: () => void;
  actividadId: string;
  banco: TareaConVinculos[];
  enSesion: Set<string>;
  orientacionDelDia?: OrientacionFisica;
  md?: string;
}) {
  const { pendiente, error, ejecutar } = useAccion();
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState<TipoTarea | "">("");
  const [soloSugeridas, setSoloSugeridas] = useState(Boolean(orientacionDelDia));
  const [agregandoId, setAgregandoId] = useState<string | null>(null);

  const q = normalizar(busqueda.trim());
  const lista = banco
    .filter((t) => !tipo || t.tipo === tipo)
    .filter((t) => !q || normalizar(`${t.nombre} ${t.formato ?? ""}`).includes(q))
    .filter(
      (t) =>
        !soloSugeridas ||
        !orientacionDelDia ||
        t.orientacion_fisica === orientacionDelDia ||
        t.orientacion_fisica === null,
    );

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Agregar tarea" className="max-w-2xl">
      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Agregar tarea del banco</h2>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar…"
            aria-label="Buscar tareas"
            className={claseControl()}
          />
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoTarea | "")}
            aria-label="Tipo de tarea"
            className={claseControl()}
          >
            <option value="">Todos los tipos</option>
            {TIPOS_TAREA.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        {orientacionDelDia && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={soloSugeridas}
              onChange={(e) => setSoloSugeridas(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Solo las que encajan con {md} ({INFO_ORIENTACION[orientacionDelDia].label.toLowerCase()}
            )
          </label>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <ul className="max-h-[50vh] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
          {lista.length === 0 && (
            <li className="p-6 text-center text-sm text-slate-500">
              No hay tareas con esos filtros.
            </li>
          )}
          {lista.map((t) => {
            const info = INFO_TIPO_TAREA[t.tipo];
            const ya = enSesion.has(t.id);
            return (
              <li key={t.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{t.nombre}</p>
                  <p className="text-xs text-slate-500">
                    <span className={cn("mr-1.5 rounded px-1.5 py-0.5 font-semibold", info.color)}>
                      {info.label}
                    </span>
                    {[textoTiempo(t), t.formato].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <Button
                  variante={ya ? "ghost" : "secondary"}
                  className="shrink-0 px-3 py-1.5"
                  cargando={pendiente && agregandoId === t.id}
                  disabled={pendiente}
                  onClick={() => {
                    setAgregandoId(t.id);
                    ejecutar(() => agregarTareaSesion(actividadId, t.id));
                  }}
                >
                  {ya ? "Agregar otra vez" : "Agregar"}
                </Button>
              </li>
            );
          })}
        </ul>
      </div>
    </Modal>
  );
}
