"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  importarJugadorExterno,
  obtenerPlantelExterno,
  vincularClubExterno,
  type JugadorParaImportar,
} from "@/app/(dashboard)/importar/actions";
import type { EquipoExterno } from "@/lib/externos/api-football";
import { cn } from "@/lib/utils/cn";
import { POSICIONES, POSICION_LABEL } from "@/types/jugador";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { BuscadorEquipos } from "./BuscadorEquipos";

/** Plan gratuito: 10 consultas por minuto. Con perfiles, una consulta cada ~6,5 s. */
const PAUSA_ENTRE_PERFILES_MS = 6500;

interface Props {
  club: string;
  /** Id del club en API-Football si la temporada ya está vinculada */
  equipoVinculado: number | null;
}

type Etapa =
  | { tipo: "buscar" }
  | { tipo: "cargando"; equipo: Pick<EquipoExterno, "id" | "nombre"> }
  | {
      tipo: "elegir";
      equipo: Pick<EquipoExterno, "id" | "nombre">;
      jugadores: JugadorParaImportar[];
    }
  | { tipo: "importando"; hechos: number; total: number; actual: string }
  | { tipo: "listo"; resumen: Resumen };

interface Resumen {
  creados: number;
  actualizados: number;
  avisos: string[];
  errores: string[];
  cortado: string | null;
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function ImportarPlantel({ club, equipoVinculado }: Props) {
  const router = useRouter();
  const [etapa, setEtapa] = useState<Etapa>({ tipo: "buscar" });
  const [error, setError] = useState<string | null>(null);
  const [elegidos, setElegidos] = useState<Set<number>>(new Set());
  const [conPerfil, setConPerfil] = useState(true);
  const [cuota, setCuota] = useState<number | null>(null);
  const cancelado = useRef(false);

  async function cargarPlantel(equipo: Pick<EquipoExterno, "id" | "nombre">) {
    setError(null);
    setEtapa({ tipo: "cargando", equipo });
    try {
      const r = await obtenerPlantelExterno(equipo.id);
      if (!r.ok) {
        setError(r.error);
        setEtapa({ tipo: "buscar" });
        return;
      }
      setCuota(r.cuota.restantesHoy);
      setElegidos(new Set(r.jugadores.map((j) => j.id)));
      setEtapa({ tipo: "elegir", equipo, jugadores: r.jugadores });
    } catch {
      setError("Error de conexión. Probá de nuevo.");
      setEtapa({ tipo: "buscar" });
    }
  }

  // Si la temporada ya está vinculada a un club de API-Football, va directo a su plantel
  useEffect(() => {
    if (equipoVinculado) void cargarPlantel({ id: equipoVinculado, nombre: club });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function importar(equipoId: number, jugadores: JugadorParaImportar[], perfiles: boolean) {
    const lista = jugadores.filter((j) => elegidos.has(j.id));
    const resumen: Resumen = {
      creados: 0,
      actualizados: 0,
      avisos: [],
      errores: [],
      cortado: null,
    };
    cancelado.current = false;

    for (const [i, jugador] of lista.entries()) {
      if (cancelado.current) {
        resumen.cortado = "Importación detenida. Lo que ya entró quedó guardado.";
        break;
      }
      setEtapa({ tipo: "importando", hechos: i, total: lista.length, actual: jugador.nombre });
      const inicio = Date.now();
      try {
        const r = await importarJugadorExterno(jugador, perfiles);
        if (r.ok) {
          resumen[r.accion === "creado" ? "creados" : "actualizados"] += 1;
          if (r.aviso) resumen.avisos.push(`${r.nombre}: ${r.aviso}`);
          if (r.cuota.restantesHoy !== null) setCuota(r.cuota.restantesHoy);
        } else if (r.error.includes("consultas")) {
          // Límite de API-Football: se corta para no gastar intentos
          resumen.cortado = r.error;
          break;
        } else {
          resumen.errores.push(`${jugador.nombre}: ${r.error}`);
        }
      } catch {
        resumen.errores.push(`${jugador.nombre}: error de conexión`);
      }
      // Respeta el límite por minuto del plan gratuito
      if (perfiles && i < lista.length - 1) {
        await esperar(Math.max(0, PAUSA_ENTRE_PERFILES_MS - (Date.now() - inicio)));
      }
    }

    if (resumen.creados + resumen.actualizados > 0) await vincularClubExterno(equipoId);
    setEtapa({ tipo: "listo", resumen });
    router.refresh();
  }

  if (etapa.tipo === "buscar") {
    return (
      <div className="max-w-2xl space-y-4">
        {error && <Alert>{error}</Alert>}
        <BuscadorEquipos
          textoInicial={club}
          onCuota={setCuota}
          accion={(equipo) => (
            <Button
              variante="secondary"
              className="px-3 py-1.5"
              onClick={() => cargarPlantel(equipo)}
            >
              Ver plantel
            </Button>
          )}
        />
        <Cuota restantes={cuota} />
      </div>
    );
  }

  if (etapa.tipo === "cargando") {
    return <p className="text-sm text-slate-500">Buscando el plantel de {etapa.equipo.nombre}…</p>;
  }

  if (etapa.tipo === "importando") {
    const porcentaje = Math.round((etapa.hechos / etapa.total) * 100);
    return (
      <div className="max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="font-medium text-slate-900">
          Importando {etapa.hechos + 1} de {etapa.total}: {etapa.actual}
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
          <div className="h-full bg-brand-600 transition-all" style={{ width: `${porcentaje}%` }} />
        </div>
        <p className="text-sm text-slate-500">
          No cierres esta pantalla. Si la cerrás, lo que ya entró queda guardado.
        </p>
        <Button variante="secondary" onClick={() => (cancelado.current = true)}>
          Detener
        </Button>
      </div>
    );
  }

  if (etapa.tipo === "listo") {
    const { resumen } = etapa;
    return (
      <div className="max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Alert tipo={resumen.errores.length || resumen.cortado ? "error" : "exito"}>
          {resumen.creados} jugador{resumen.creados === 1 ? "" : "es"} nuevo
          {resumen.creados === 1 ? "" : "s"} y {resumen.actualizados} actualizado
          {resumen.actualizados === 1 ? "" : "s"}.
        </Alert>
        {resumen.cortado && <p className="text-sm text-red-700">{resumen.cortado}</p>}
        {[...resumen.avisos, ...resumen.errores].length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
            {[...resumen.avisos, ...resumen.errores].map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
        <p className="text-sm text-slate-500">
          Revisá en cada ficha lo que falte (por ejemplo, la fecha de nacimiento de los más jóvenes)
          y las posiciones específicas.
        </p>
        <div className="flex gap-3">
          <Link
            href="/plantilla"
            className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
          >
            Ir al plantel
          </Link>
          <Button variante="ghost" onClick={() => setEtapa({ tipo: "buscar" })}>
            Importar otro
          </Button>
        </div>
        <Cuota restantes={cuota} />
      </div>
    );
  }

  // Etapa "elegir"
  const { equipo, jugadores } = etapa;
  const cantidad = jugadores.filter((j) => elegidos.has(j.id)).length;
  const nuevos = jugadores.filter((j) => elegidos.has(j.id) && !j.existente).length;
  const minutos = conPerfil ? Math.ceil((cantidad * PAUSA_ENTRE_PERFILES_MS) / 60000) : 0;
  const sinCuota = conPerfil && cuota !== null && cantidad > cuota;

  function alternar(id: number) {
    setElegidos((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Plantel actual de <strong className="text-slate-900">{equipo.nombre}</strong> en
          API-Football: {jugadores.length} jugadores.
        </p>
        <div className="flex gap-2">
          <Button
            variante="ghost"
            className="px-3 py-1.5"
            onClick={() => setElegidos(new Set(jugadores.map((j) => j.id)))}
          >
            Todos
          </Button>
          <Button variante="ghost" className="px-3 py-1.5" onClick={() => setElegidos(new Set())}>
            Ninguno
          </Button>
          <Button
            variante="ghost"
            className="px-3 py-1.5"
            onClick={() => setEtapa({ tipo: "buscar" })}
          >
            Otro equipo
          </Button>
        </div>
      </div>

      {POSICIONES.map((linea) => {
        const grupo = jugadores.filter((j) => j.posicion === linea);
        if (grupo.length === 0) return null;
        return (
          <section key={linea}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {POSICION_LABEL[linea]} · {grupo.length}
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {grupo.map((j) => {
                const elegido = elegidos.has(j.id);
                return (
                  <li key={j.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border bg-white p-3 transition-colors",
                        elegido ? "border-brand-500 ring-1 ring-brand-500" : "border-slate-200",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={elegido}
                        onChange={() => alternar(j.id)}
                        className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      {j.fotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={j.fotoUrl}
                          alt=""
                          className="h-10 w-10 rounded-full bg-slate-100 object-cover"
                        />
                      ) : (
                        <span className="h-10 w-10 rounded-full bg-slate-100" aria-hidden />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-slate-900">
                          <span className="mr-1.5 tabular-nums text-slate-400">
                            {j.numero ?? "–"}
                          </span>
                          {j.nombre}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {j.edad !== null ? `${j.edad} años` : "Edad sin dato"}
                          {j.existente && (
                            <span className="ml-1.5 font-medium text-brand-700">
                              · Ya está: se actualiza
                            </span>
                          )}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <div className="sticky bottom-0 -mx-4 space-y-3 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:shadow-lg">
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={conPerfil}
            onChange={(e) => setConPerfil(e.target.checked)}
            className="mt-0.5 h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <span>
            Traer nombre completo, fecha de nacimiento, nacionalidad y altura
            <span className="block text-xs text-slate-500">
              Usa 1 consulta por jugador
              {conPerfil && cantidad > 0 && ` y tarda unos ${minutos} min`} (límite del plan
              gratuito). A los que ya están solo se les completa lo que falta; el número y la línea
              se actualizan.
            </span>
          </span>
        </label>
        {sinCuota && (
          <Alert>
            Hoy quedan {cuota} consultas y elegiste {cantidad} jugadores. Importá menos o sacá la
            opción de datos completos.
          </Alert>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => importar(equipo.id, jugadores, conPerfil)}
            disabled={cantidad === 0 || sinCuota}
          >
            Importar {cantidad} jugador{cantidad === 1 ? "" : "es"}
            {nuevos < cantidad && ` (${nuevos} nuevo${nuevos === 1 ? "" : "s"})`}
          </Button>
          <Cuota restantes={cuota} />
        </div>
      </div>
    </div>
  );
}

function Cuota({ restantes }: { restantes: number | null }) {
  if (restantes === null) return null;
  return (
    <p className="text-xs text-slate-500">Quedan {restantes} consultas de API-Football por hoy.</p>
  );
}
