"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { guardarTarea } from "@/app/(dashboard)/tareas/actions";
import { BUCKETS } from "@/lib/storage/config";
import { guardarConImagen, type ImagenValor } from "@/lib/storage/client";
import { duracionParaEditar, formatearSegundos, parsearDuracion, tiempoTotal } from "@/lib/tareas";
import { cn } from "@/lib/utils/cn";
import { erroresDeZod } from "@/lib/validations/comun";
import { tareaSchema, type TareaErrores } from "@/lib/validations/tarea";
import type { ContenidoTecnico, PrincipioJuego } from "@/types/modelo-juego";
import {
  COMPETITIVIDADES,
  ESPACIOS,
  ORIENTACIONES,
  TIPOS_TAREA,
  VIAS,
  type Competitividad,
  type EspacioTarea,
  type OrientacionFisica,
  type TareaConVinculos,
  type TareaInput,
  type TipoTarea,
  type ViaMetodologica,
} from "@/types/tarea";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Input, Select, claseControl } from "@/components/ui/Field";
import { SelectorObjetivos } from "./SelectorObjetivos";

interface Props {
  cuerpoTecnicoId: string;
  principios: PrincipioJuego[];
  contenidos: ContenidoTecnico[];
  /** Si se pasa, edita esa tarea */
  tarea?: TareaConVinculos;
}

interface Valores {
  nombre: string;
  tipo: TipoTarea | "";
  via: ViaMetodologica | "";
  competitividad: Competitividad | "";
  orientacion_fisica: OrientacionFisica | "";
  formato: string;
  jugadores: string;
  series: string;
  duracion: string;
  pausa: string;
  espacio: EspacioTarea | "";
  largo_m: string;
  ancho_m: string;
  descripcion: string;
  video_url: string;
  objetivos: string[];
  contenidos: string[];
}

const texto = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));
const numero = (v: string) => (v.trim() === "" ? null : Number(v));

export function TareaForm({ cuerpoTecnicoId, principios, contenidos, tarea }: Props) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [valores, setValores] = useState<Valores>({
    nombre: tarea?.nombre ?? "",
    tipo: tarea?.tipo ?? "",
    via: tarea?.via ?? "",
    competitividad: tarea?.competitividad ?? "",
    orientacion_fisica: tarea?.orientacion_fisica ?? "",
    formato: tarea?.formato ?? "",
    jugadores: texto(tarea?.jugadores),
    series: texto(tarea?.series),
    duracion: duracionParaEditar(tarea?.duracion_seg ?? null),
    pausa: duracionParaEditar(tarea?.pausa_seg ?? null),
    espacio: tarea?.espacio ?? "",
    largo_m: texto(tarea?.largo_m),
    ancho_m: texto(tarea?.ancho_m),
    descripcion: tarea?.descripcion ?? "",
    video_url: tarea?.video_url ?? "",
    objetivos: tarea?.objetivos ?? [],
    contenidos: tarea?.contenidos ?? [],
  });
  const [grafico, setGrafico] = useState<ImagenValor>({
    archivo: null,
    ruta: tarea?.grafico_ruta ?? null,
  });
  const [errores, setErrores] = useState<TareaErrores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  function actualizar<K extends keyof Valores>(campo: K, valor: Valores[K]) {
    setValores((prev) => ({ ...prev, [campo]: valor }));
  }

  function aInput(ruta: string | null): Omit<TareaInput, "tipo"> & { tipo: TipoTarea | "" } {
    const conMedidas = valores.espacio !== "" && valores.espacio !== "gimnasio";
    return {
      nombre: valores.nombre,
      tipo: valores.tipo,
      via: valores.via || null,
      competitividad: valores.competitividad || null,
      orientacion_fisica: valores.orientacion_fisica || null,
      formato: valores.formato,
      jugadores: numero(valores.jugadores),
      series: numero(valores.series),
      duracion_seg: parsearDuracion(valores.duracion),
      pausa_seg: valores.series.trim() ? parsearDuracion(valores.pausa) : null,
      espacio: valores.espacio || null,
      largo_m: conMedidas ? numero(valores.largo_m) : null,
      ancho_m: conMedidas ? numero(valores.ancho_m) : null,
      descripcion: valores.descripcion,
      grafico_ruta: ruta,
      video_url: valores.video_url,
      objetivos: valores.objetivos,
      contenidos: valores.contenidos,
    };
  }

  const series = numero(valores.series);
  const duracion = parsearDuracion(valores.duracion);
  const pausa = parsearDuracion(valores.pausa);
  const total =
    duracion !== null && !Number.isNaN(duracion) && (series === null || Number.isInteger(series))
      ? tiempoTotal({
          series,
          duracion_seg: duracion,
          pausa_seg: pausa !== null && !Number.isNaN(pausa) ? pausa : null,
        })
      : null;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorGeneral(null);
    const parsed = tareaSchema.safeParse(aInput(grafico.ruta));
    if (!parsed.success) {
      setErrores(erroresDeZod(parsed.error));
      setErrorGeneral("Revisá los campos marcados");
      return;
    }
    setErrores({});
    startTransition(async () => {
      const r = await guardarConImagen(BUCKETS.graficosTareas, cuerpoTecnicoId, grafico, (ruta) =>
        guardarTarea(tarea?.id ?? null, { ...parsed.data, grafico_ruta: ruta }),
      );
      if (!r.ok) {
        setErrorGeneral(r.error);
        setErrores(r.errores ?? {});
        return;
      }
      router.push(`/tareas/${r.id}`);
      router.refresh();
    });
  }

  const contenidosVisibles = contenidos.filter(
    (c) => !c.oculto || valores.contenidos.includes(c.id),
  );

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="max-w-3xl space-y-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      {errorGeneral && <Alert>{errorGeneral}</Alert>}

      <Seccion titulo="La tarea">
        <Input
          label="Nombre"
          value={valores.nombre}
          onChange={(e) => actualizar("nombre", e.target.value)}
          error={errores.nombre}
          maxLength={120}
          placeholder="Ej. Rondo 5v2 con transición entre rondos"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Tipo de tarea"
            value={valores.tipo}
            onChange={(e) => actualizar("tipo", e.target.value as TipoTarea)}
            error={errores.tipo}
          >
            <option value="">Elegí…</option>
            {TIPOS_TAREA.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.label}
              </option>
            ))}
          </Select>
          <Select
            label="Vía metodológica"
            value={valores.via}
            onChange={(e) => actualizar("via", e.target.value as ViaMetodologica | "")}
          >
            <option value="">Sin definir</option>
            {VIAS.map((v) => (
              <option key={v.valor} value={v.valor}>
                {v.label}
              </option>
            ))}
          </Select>
          <Select
            label="Competitividad (opcional)"
            value={valores.competitividad}
            onChange={(e) => actualizar("competitividad", e.target.value as Competitividad | "")}
            ayuda="Si hay rival y si se cuentan puntos o goles."
          >
            <option value="">Sin definir</option>
            {COMPETITIVIDADES.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.label}
              </option>
            ))}
          </Select>
          <Select
            label="Orientación física"
            value={valores.orientacion_fisica}
            onChange={(e) =>
              actualizar("orientacion_fisica", e.target.value as OrientacionFisica | "")
            }
            ayuda="El día de la semana tipo al que mejor se adapta."
          >
            <option value="">Sin definir</option>
            {ORIENTACIONES.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.label} ({o.dia})
              </option>
            ))}
          </Select>
        </div>
      </Seccion>

      <Seccion
        titulo="Objetivos del modelo de juego"
        ayuda="Los principios y subprincipios que trabaja. Son los que después suman en los reportes."
      >
        <SelectorObjetivos
          principios={principios}
          value={valores.objetivos}
          onChange={(objetivos) => actualizar("objetivos", objetivos)}
        />
        {contenidosVisibles.length > 0 && (
          <div className="space-y-2">
            <span className="block text-sm font-medium text-slate-700">Contenidos técnicos</span>
            <div className="flex flex-wrap gap-2">
              {contenidosVisibles.map((c) => {
                const activo = valores.contenidos.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={activo}
                    onClick={() =>
                      actualizar(
                        "contenidos",
                        activo
                          ? valores.contenidos.filter((x) => x !== c.id)
                          : [...valores.contenidos, c.id],
                      )
                    }
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors",
                      activo
                        ? "bg-slate-900 text-white ring-slate-900"
                        : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50",
                    )}
                  >
                    {c.nombre}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Seccion>

      <Seccion titulo="Formato, tiempo y espacio">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Formato"
            value={valores.formato}
            onChange={(e) => actualizar("formato", e.target.value)}
            error={errores.formato}
            maxLength={60}
            placeholder="Ej. 4v4+3"
          />
          <Input
            label="Jugadores"
            type="number"
            inputMode="numeric"
            min={1}
            max={40}
            value={valores.jugadores}
            onChange={(e) => actualizar("jugadores", e.target.value)}
            error={errores.jugadores}
            ayuda="Total en la tarea, para calcular los m² por jugador."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Series"
            type="number"
            inputMode="numeric"
            min={1}
            max={50}
            value={valores.series}
            onChange={(e) => actualizar("series", e.target.value)}
            error={errores.series}
            ayuda="Vacío si es continua."
          />
          <Input
            label={valores.series ? "Duración de cada serie" : "Duración"}
            value={valores.duracion}
            onChange={(e) => actualizar("duracion", e.target.value)}
            error={errores.duracion_seg}
            placeholder="2:30"
            ayuda="Minutos o minutos:segundos."
          />
          <Input
            label="Pausa entre series"
            value={valores.pausa}
            onChange={(e) => actualizar("pausa", e.target.value)}
            error={errores.pausa_seg}
            placeholder="0:30"
            disabled={!valores.series}
          />
        </div>
        {total !== null && (
          <p className="text-sm text-slate-600">
            Tiempo total: <strong className="text-slate-900">{formatearSegundos(total)}</strong>
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            label="Espacio"
            value={valores.espacio}
            onChange={(e) => actualizar("espacio", e.target.value as EspacioTarea | "")}
          >
            <option value="">Sin definir</option>
            {ESPACIOS.map((e) => (
              <option key={e.valor} value={e.valor}>
                {e.label}
              </option>
            ))}
          </Select>
          {valores.espacio !== "gimnasio" && valores.espacio !== "" && (
            <>
              <Input
                label={valores.espacio === "medidas" ? "Largo (m)" : "Largo (m, opcional)"}
                type="number"
                inputMode="numeric"
                min={1}
                max={120}
                value={valores.largo_m}
                onChange={(e) => actualizar("largo_m", e.target.value)}
                error={errores.largo_m}
              />
              <Input
                label={valores.espacio === "medidas" ? "Ancho (m)" : "Ancho (m, opcional)"}
                type="number"
                inputMode="numeric"
                min={1}
                max={90}
                value={valores.ancho_m}
                onChange={(e) => actualizar("ancho_m", e.target.value)}
                error={errores.ancho_m}
              />
            </>
          )}
        </div>
      </Seccion>

      <Seccion titulo="Descripción">
        <label className="block space-y-1.5">
          <span className="sr-only">Descripción</span>
          <textarea
            rows={8}
            value={valores.descripcion}
            onChange={(e) => actualizar("descripcion", e.target.value)}
            maxLength={3000}
            placeholder={"Organización: …\nDesarrollo: …\nConsignas: …"}
            className={claseControl(errores.descripcion)}
          />
          {errores.descripcion ? (
            <span className="block text-xs text-red-600">{errores.descripcion}</span>
          ) : (
            <span className="block text-xs text-slate-500">
              Cómo se organiza, cómo se juega y las consignas. También se usa para armar el prompt
              del gráfico.
            </span>
          )}
        </label>
      </Seccion>

      <Seccion titulo="Gráfico y video">
        <ImageUpload
          label="Gráfico de la tarea"
          bucket={BUCKETS.graficosTareas}
          value={grafico}
          onChange={setGrafico}
          ajuste="contain"
          forma="rectangulo"
          error={errores.grafico_ruta}
          disabled={pendiente}
        />
        <Input
          label="Video (opcional)"
          type="url"
          value={valores.video_url}
          onChange={(e) => actualizar("video_url", e.target.value)}
          error={errores.video_url}
          placeholder="https://…"
          ayuda="Link a YouTube, Drive o donde esté el video de la tarea."
        />
      </Seccion>

      <div className="flex items-center gap-3 border-t border-slate-100 pt-5">
        <Button type="submit" cargando={pendiente}>
          {tarea ? "Guardar cambios" : "Crear tarea"}
        </Button>
        <Button type="button" variante="ghost" onClick={() => router.back()} disabled={pendiente}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function Seccion({
  titulo,
  ayuda,
  children,
}: {
  titulo: string;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{titulo}</h2>
        {ayuda && <p className="mt-0.5 text-xs text-slate-500">{ayuda}</p>}
      </div>
      {children}
    </section>
  );
}
