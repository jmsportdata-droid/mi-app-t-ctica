"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { pedirInformeSofascore, validarInsight } from "@/app/(dashboard)/partidos/informe-actions";
import { indiceAereo } from "@/lib/aereo";
import { cn } from "@/lib/utils/cn";
import {
  GRUPOS_CLAVES,
  KPI_EQUIPO,
  type EstadoValidacion,
  type InformeRivalDatos,
  type InsightsInforme,
  type JugadorRival,
  type PedidoSofascore,
} from "@/types/informe";
import { Button } from "@/components/ui/Button";
import { useAccion } from "@/components/ui/useAccion";

// Lo que se usa del análisis de la skill (el resto se ignora)
interface DatosInforme {
  n?: number;
  equipo?: { nombre?: string; dt?: string };
  contexto?: {
    balance?: { G?: number; E?: number; P?: number };
    gf?: number;
    gc?: number;
    partidos?: {
      fecha: string;
      rival: string;
      resultado?: string;
      r?: string;
      condicion?: string;
      formacion?: string;
    }[];
  };
  once?: {
    formacion?: string;
    uso_formaciones?: [string, number][];
    jugadores?: { dorsal: number; corto: string; pos: string }[];
  };
  cambios?: { primer_cambio_medio?: number; cambios_medios?: number };
  equipo_stats?: { nos?: Record<string, number | null>; ellos?: Record<string, number | null> };
  tramos?: { etiquetas?: string[]; favor?: number[]; contra?: number[] };
  pelota_parada?: {
    favor?: { tiros?: number; goles?: number; goles_por_tipo?: Record<string, number> };
    contra?: { tiros?: number; goles?: number; goles_por_tipo?: Record<string, number> };
  };
  portero?: {
    porteros?: { nombre: string; paradas?: number; precision_pase?: number; pct_largos?: number }[];
    goles_evitados?: number;
  };
}

interface Props {
  partidoId: string;
  informe: InformeRivalDatos | null;
  pedido: PedidoSofascore | null;
  macConectada: boolean;
  plantel: JugadorRival[];
}

const FORMATO_FECHA = new Intl.DateTimeFormat("es-UY", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Montevideo",
});

/** Informe estadístico del rival que llega desde Sofascore (vía la Mac del analista). */
export function InformeSofascore({ partidoId, informe, pedido, macConectada, plantel }: Props) {
  const router = useRouter();
  const pedir = useAccion();
  const enCurso = pedido?.estado === "pendiente" || pedido?.estado === "procesando";

  // Mientras la Mac trabaja, se refresca solo
  useEffect(() => {
    if (!enCurso) return;
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [enCurso, router]);

  const datos = (informe?.datos ?? {}) as DatosInforme;
  const insights = (informe?.insights ?? {}) as InsightsInforme;
  const validaciones = (informe?.validaciones ?? {}) as Record<string, EstadoValidacion>;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">Informe estadístico (Sofascore)</h2>
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                macConectada ? "bg-emerald-500" : "bg-slate-300",
              )}
              aria-hidden
            />
            {macConectada
              ? "La Mac del analista está conectada"
              : "La Mac del analista no está conectada"}
          </p>
          {pedido && (
            <p
              className={cn(
                "text-sm",
                pedido.estado === "error"
                  ? "text-red-600"
                  : enCurso
                    ? "text-brand-700"
                    : "text-slate-600",
              )}
            >
              {pedido.estado === "pendiente" &&
                (macConectada
                  ? "En cola: la Mac lo toma en unos segundos…"
                  : "En cola: se procesa cuando se prenda la Mac.")}
              {pedido.estado === "procesando" && (pedido.mensaje ?? "Procesando…")}
              {pedido.estado === "listo" && `✓ ${pedido.mensaje ?? "Listo"}`}
              {pedido.estado === "error" && `No se pudo: ${pedido.mensaje ?? "error"}`}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {informe?.pdf_ruta && (
            <a
              href={`/archivos/informes/${informe.pdf_ruta}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Informe PDF ↗
            </a>
          )}
          <Button
            cargando={pedir.pendiente || enCurso}
            onClick={() => pedir.ejecutar(() => pedirInformeSofascore(partidoId))}
          >
            {enCurso
              ? "Actualizando…"
              : informe
                ? "Actualizar desde Sofascore"
                : "Traer datos de Sofascore"}
          </Button>
        </div>
        {pedir.error && <p className="w-full text-sm text-red-600">{pedir.error}</p>}
      </section>

      {!informe ? (
        <p className="rounded-xl border-2 border-dashed border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
          Tocá el botón y en un par de minutos aparecen las estadísticas colectivas e individuales
          del rival, sus últimos partidos, la pelota parada y los insights de Claude para validar.
        </p>
      ) : (
        <>
          <p className="text-xs text-slate-500">
            Generado el {FORMATO_FECHA.format(new Date(informe.generado_en))} con sus últimos{" "}
            {datos.n ?? "—"} partidos con estadísticas. Todo lo interpretativo es un borrador:
            validalo con video.
            {informe.avisos.length > 0 && (
              <details className="mt-1">
                <summary className="cursor-pointer font-medium text-slate-600">
                  Avisos de datos ({informe.avisos.length})
                </summary>
                <ul className="mt-1 list-inside list-disc space-y-0.5">
                  {informe.avisos.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </details>
            )}
          </p>

          <Claves partidoId={partidoId} insights={insights} validaciones={validaciones} />
          <LecturaPorFase insights={insights} />
          <Contexto datos={datos} />
          <Estadisticas datos={datos} />
          <PlantelRival plantel={plantel} />
        </>
      )}
    </div>
  );
}

function Item({
  partidoId,
  clave,
  estado,
  children,
}: {
  partidoId: string;
  clave: string;
  estado?: EstadoValidacion;
  children: React.ReactNode;
}) {
  const { pendiente, error, ejecutar } = useAccion();
  const boton = (activo: boolean, color: string) =>
    cn(
      "rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset transition-colors",
      activo ? color : "bg-white text-slate-500 ring-slate-300 hover:bg-slate-50",
    );
  return (
    <li className={cn("flex items-start gap-2", estado === "descartado" && "opacity-50")}>
      <span
        className={cn(
          "min-w-0 flex-1 text-sm text-slate-800",
          estado === "descartado" && "line-through",
        )}
      >
        {children}
        {error && <span className="block text-xs text-red-600">{error}</span>}
      </span>
      <span className="flex shrink-0 gap-1">
        <button
          type="button"
          disabled={pendiente}
          onClick={() =>
            ejecutar(() =>
              validarInsight(partidoId, clave, estado === "confirmado" ? null : "confirmado"),
            )
          }
          className={boton(estado === "confirmado", "bg-emerald-600 text-white ring-emerald-600")}
          aria-label="Confirmar"
          title="Confirmar"
        >
          ✓
        </button>
        <button
          type="button"
          disabled={pendiente}
          onClick={() =>
            ejecutar(() =>
              validarInsight(partidoId, clave, estado === "descartado" ? null : "descartado"),
            )
          }
          className={boton(estado === "descartado", "bg-slate-600 text-white ring-slate-600")}
          aria-label="Descartar"
          title="Descartar"
        >
          ✕
        </button>
      </span>
    </li>
  );
}

function Claves({
  partidoId,
  insights,
  validaciones,
}: {
  partidoId: string;
  insights: InsightsInforme;
  validaciones: Record<string, EstadoValidacion>;
}) {
  const claves = insights.claves ?? {};
  const confirmados = Object.values(validaciones).filter((v) => v === "confirmado").length;
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Claves del partido</h2>
        <p className="text-xs text-slate-500">
          Confirmá lo que vale ({confirmados} confirmadas): lo confirmado es lo que va a usar el
          plan de partido.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {GRUPOS_CLAVES.map((g) => {
          const lista = claves[g.clave] ?? [];
          if (lista.length === 0) return null;
          return (
            <div key={g.clave} className={cn("rounded-2xl border p-4", g.color)}>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
                {g.titulo}
              </h3>
              <ul className="space-y-2">
                {lista.map((texto, i) => (
                  <Item
                    key={i}
                    partidoId={partidoId}
                    clave={`${g.clave}.${i}`}
                    estado={validaciones[`${g.clave}.${i}`]}
                  >
                    {texto}
                  </Item>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      {(claves.jugadores_a_vigilar?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
            Jugadores a vigilar
          </h3>
          <ul className="space-y-2">
            {claves.jugadores_a_vigilar!.map((j, i) => (
              <Item
                key={i}
                partidoId={partidoId}
                clave={`vigilar.${i}`}
                estado={validaciones[`vigilar.${i}`]}
              >
                <strong>{j.jugador}</strong>: {j.motivo}
              </Item>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function LecturaPorFase({ insights }: { insights: InsightsInforme }) {
  const bloques: [string, [string, string | undefined][]][] = [
    [
      "Fase ofensiva",
      [
        ["Inicio", insights.ofensiva?.inicio],
        ["Construcción", insights.ofensiva?.construccion],
        ["Finalización", insights.ofensiva?.finalizacion],
      ],
    ],
    [
      "Fase defensiva",
      [
        ["Bloque alto", insights.defensiva?.bloque_alto],
        ["Bloque medio y bajo", insights.defensiva?.bloque_medio_bajo],
        ["Vulnerabilidades", insights.defensiva?.vulnerabilidades],
      ],
    ],
    [
      "Transiciones",
      [
        ["Ataque-defensa", insights.transiciones?.ataque_defensa],
        ["Defensa-ataque", insights.transiciones?.defensa_ataque],
      ],
    ],
    [
      "Pelota parada y arquero",
      [
        ["ABP ofensiva", insights.abp?.ofensiva],
        ["ABP defensiva", insights.abp?.defensiva],
        ["Arquero", insights.portero],
        ["Primer y segundo tiempo", insights.tiempos],
      ],
    ],
  ];
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <summary className="cursor-pointer text-lg font-semibold text-slate-900">
        Lectura por fase (borrador de Claude)
      </summary>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {bloques.map(([titulo, items]) => (
          <div key={titulo} className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {titulo}
            </h3>
            {items
              .filter(([, t]) => t)
              .map(([sub, t]) => (
                <p key={sub} className="text-sm text-slate-700">
                  <strong className="text-slate-900">{sub}:</strong> {t}
                </p>
              ))}
          </div>
        ))}
      </div>
    </details>
  );
}

function Contexto({ datos }: { datos: DatosInforme }) {
  const ctx = datos.contexto ?? {};
  const b = ctx.balance ?? {};
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 font-semibold text-slate-900">Últimos partidos</h2>
        <p className="mb-3 text-sm text-slate-600">
          {b.G ?? 0} G · {b.E ?? 0} E · {b.P ?? 0} P · GF {ctx.gf ?? "—"} · GC {ctx.gc ?? "—"}
        </p>
        <ul className="divide-y divide-slate-100 text-sm">
          {(ctx.partidos ?? []).map((p, i) => (
            <li key={i} className="flex items-center gap-3 py-1.5">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold text-white",
                  p.r === "G" ? "bg-emerald-500" : p.r === "E" ? "bg-slate-400" : "bg-red-500",
                )}
              >
                {p.r ?? "–"}
              </span>
              <span className="w-12 shrink-0 tabular-nums text-slate-500">
                {p.fecha.slice(0, 5)}
              </span>
              <span className="min-w-0 flex-1 truncate text-slate-800">
                {p.condicion === "Visitante" ? "en " : "vs "}
                {p.rival}
              </span>
              <span className="font-semibold tabular-nums">{p.resultado ?? "—"}</span>
              {p.formacion && <span className="text-xs text-slate-500">1-{p.formacion}</span>}
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 font-semibold text-slate-900">Estructura</h2>
          <p className="text-sm text-slate-700">
            <strong>Formación más usada:</strong>{" "}
            {datos.once?.formacion ? `1-${datos.once.formacion}` : "—"}
            {(datos.once?.uso_formaciones?.length ?? 0) > 1 &&
              ` (${datos.once!.uso_formaciones!.map(([f, n]) => `1-${f}: ${n}`).join(", ")})`}
          </p>
          {datos.cambios?.primer_cambio_medio && (
            <p className="text-sm text-slate-700">
              <strong>Cambios:</strong> el primero al{" "}
              {Math.round(datos.cambios.primer_cambio_medio)}′ en promedio,{" "}
              {datos.cambios.cambios_medios?.toFixed(1)} por partido.
            </p>
          )}
          {(datos.once?.jugadores?.length ?? 0) > 0 && (
            <p className="mt-2 text-sm text-slate-600">
              <strong className="text-slate-800">Once base:</strong>{" "}
              {datos.once!.jugadores!.map((j) => `${j.dorsal} ${j.corto}`).join(", ")}
            </p>
          )}
        </div>
        {datos.tramos?.etiquetas && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-slate-900">Goles por tramo</h2>
            <div className="grid grid-cols-6 gap-1 text-center text-xs">
              {datos.tramos.etiquetas.map((t, i) => (
                <div key={t} className="space-y-1">
                  <div className="rounded bg-emerald-100 py-1 font-bold text-emerald-800">
                    {datos.tramos?.favor?.[i] ?? 0}
                  </div>
                  <div className="rounded bg-red-100 py-1 font-bold text-red-800">
                    {datos.tramos?.contra?.[i] ?? 0}
                  </div>
                  <div className="text-slate-500">{t}</div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">Verde: a favor · rojo: en contra.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function Estadisticas({ datos }: { datos: DatosInforme }) {
  const nos = datos.equipo_stats?.nos ?? {};
  const ellos = datos.equipo_stats?.ellos ?? {};
  const pp = datos.pelota_parada ?? {};
  const portero = datos.portero?.porteros?.[0];
  const fila = (k: string, label: string) => {
    const a = nos[k];
    const b = ellos[k];
    if (a === null || a === undefined) return null;
    const total = (a ?? 0) + (b ?? 0) || 1;
    return (
      <li key={k} className="space-y-0.5">
        <div className="flex justify-between text-xs">
          <span className="font-semibold tabular-nums text-slate-900">{a}</span>
          <span className="text-slate-500">{label}</span>
          <span className="tabular-nums text-slate-500">{b ?? "—"}</span>
        </div>
        <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="bg-slate-900" style={{ width: `${(100 * (a ?? 0)) / total}%` }} />
          <div className="bg-slate-300" style={{ width: `${(100 * (b ?? 0)) / total}%` }} />
        </div>
      </li>
    );
  };
  const tipos = (m?: Record<string, number>) =>
    m && Object.keys(m).length
      ? Object.entries(m)
          .map(([k, v]) => `${k} ${v}`)
          .join(" · ")
      : "—";
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 font-semibold text-slate-900">Estadísticas por partido</h2>
        <p className="mb-3 text-xs text-slate-500">
          Izquierda: {datos.equipo?.nombre ?? "el rival"} · derecha: sus rivales.
        </p>
        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {(["Con pelota", "Sin pelota"] as const).map((g) => (
            <ul key={g} className="space-y-2">
              <li className="text-xs font-semibold uppercase tracking-wide text-slate-500">{g}</li>
              {KPI_EQUIPO.filter((k) => k.grupo === g).map((k) => fila(k.clave, k.label))}
            </ul>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 font-semibold text-slate-900">Pelota parada</h2>
          <p className="text-sm text-slate-700">
            <strong>A favor:</strong> {pp.favor?.goles ?? 0} goles en {pp.favor?.tiros ?? 0} tiros (
            {tipos(pp.favor?.goles_por_tipo)})
          </p>
          <p className="text-sm text-slate-700">
            <strong>En contra:</strong> {pp.contra?.goles ?? 0} goles en {pp.contra?.tiros ?? 0}{" "}
            tiros ({tipos(pp.contra?.goles_por_tipo)})
          </p>
        </div>
        {portero && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 font-semibold text-slate-900">Arquero</h2>
            <p className="text-sm text-slate-700">
              <strong>{portero.nombre}</strong>: {portero.paradas ?? 0} paradas,{" "}
              {portero.precision_pase ?? "—"}% de precisión de pase, {portero.pct_largos ?? "—"}% en
              largo
              {datos.portero?.goles_evitados !== undefined &&
                `, ${datos.portero.goles_evitados} goles evitados`}
              .
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

type Orden = "indice" | "altura" | "aereos" | "xg" | "minutos" | "dorsal";

function PlantelRival({ plantel }: { plantel: JugadorRival[] }) {
  const [orden, setOrden] = useState<Orden>("indice");
  const filas = useMemo(
    () =>
      plantel.map((j) => {
        const e = j.estadisticas as Record<string, number | null | undefined>;
        return {
          j,
          e,
          indice: indiceAereo({
            altura_cm: j.altura_cm,
            minutos: e.minutos,
            aereos_90: e.aereos_90,
            aereos_pct: e.aereos_pct,
            cabezazos_abp: e.cabezazos_abp,
          }),
        };
      }),
    [plantel],
  );
  const valor = (f: (typeof filas)[number]): number =>
    orden === "indice"
      ? (f.indice ?? -1)
      : orden === "altura"
        ? (f.j.altura_cm ?? 0)
        : orden === "aereos"
          ? (f.e.aereos_ganados ?? 0)
          : orden === "xg"
            ? (f.e.xg ?? 0)
            : orden === "minutos"
              ? (f.e.minutos ?? 0)
              : -(f.j.dorsal ?? 100);
  const ordenadas = [...filas].sort((a, b) => valor(b) - valor(a));
  const th = (o: Orden, label: string) => (
    <th className="px-2 py-2 text-right">
      <button
        type="button"
        onClick={() => setOrden(o)}
        className={cn(
          "font-semibold",
          orden === o ? "text-slate-900" : "text-slate-500 hover:text-slate-800",
        )}
      >
        {label}
        {orden === o && " ↓"}
      </button>
    </th>
  );

  if (plantel.length === 0) return null;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-1 font-semibold text-slate-900">Plantel del rival</h2>
      <p className="mb-3 text-xs text-slate-500">
        Totales de sus últimos partidos con estadísticas. El índice aéreo combina altura, aéreos
        ganados cada 90′, % de aéreos ganados y remates de cabeza en ABP: es la base del
        emparejamiento de marcas.
      </p>
      <div className="-mx-2 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-xs uppercase tracking-wide">
            <tr className="border-b border-slate-200">
              {th("dorsal", "Nº")}
              <th className="px-2 py-2 text-left font-semibold text-slate-500">Jugador</th>
              <th className="px-2 py-2 text-left font-semibold text-slate-500">Pie</th>
              {th("altura", "Altura")}
              {th("minutos", "Min")}
              {th("aereos", "Aéreos")}
              <th className="px-2 py-2 text-right font-semibold text-slate-500">Cab. ABP</th>
              {th("xg", "xG")}
              <th className="px-2 py-2 text-right font-semibold text-slate-500">Nota</th>
              {th("indice", "Índice aéreo")}
            </tr>
          </thead>
          <tbody>
            {ordenadas.map(({ j, e, indice }) => (
              <tr key={j.id} className="border-b border-slate-100 last:border-0">
                <td className="px-2 py-1.5 text-right font-bold tabular-nums text-slate-500">
                  {j.dorsal ?? "—"}
                </td>
                <td className="px-2 py-1.5">
                  <span className="font-medium text-slate-900">{j.corto ?? j.nombre}</span>
                  <span className="ml-1.5 text-xs text-slate-400">{j.posicion}</span>
                </td>
                <td className="px-2 py-1.5 text-slate-600">{j.pie ?? "—"}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {j.altura_cm ? `${j.altura_cm}` : "—"}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">
                  {e.minutos ?? 0}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {e.aereos_ganados ?? 0}
                  {e.aereos_pct !== null && e.aereos_pct !== undefined && (
                    <span className="ml-1 text-xs text-slate-400">({e.aereos_pct}%)</span>
                  )}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">{e.cabezazos_abp ?? 0}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{e.xg ?? 0}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">
                  {e.nota ?? "—"}
                </td>
                <td className="px-2 py-1.5">
                  {indice === null ? (
                    <span className="block text-right text-xs text-slate-400">poco jugado</span>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            indice >= 60
                              ? "bg-red-500"
                              : indice >= 45
                                ? "bg-amber-500"
                                : "bg-slate-400",
                          )}
                          style={{ width: `${indice}%` }}
                        />
                      </div>
                      <span className="w-6 text-right font-semibold tabular-nums">{indice}</span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
