import type { Temporada } from "@/types/cuerpo-tecnico";
import { BUCKETS, urlImagen } from "@/lib/storage/config";
import { formatearSegundos, textoEspacio, textoTiempo } from "@/lib/tareas";
import { formatearFecha } from "@/lib/utils/edad";
import { horaCorta } from "@/lib/utils/fecha";
import type { UbicacionSesion } from "@/lib/data/sesiones";
import { INFO_ACTIVIDAD, type Actividad } from "@/types/calendario";
import type { Sesion, TareaDeSesion } from "@/types/sesion";
import { INFO_COMPETITIVIDAD, INFO_ORIENTACION, INFO_TIPO_TAREA } from "@/types/tarea";

/**
 * Planilla de un bloque con el formato del cuerpo técnico: encabezado con
 * microciclo, sesión, fecha y temporada, y una columna por tarea. La usan la
 * planilla de la sesión y la del día completo.
 */
export function PlanillaSesion({
  temporada,
  actividad,
  ubicacion,
  sesion,
  tareas,
  indice,
  nombreContenido,
}: {
  temporada: Temporada;
  actividad: Actividad;
  ubicacion: UbicacionSesion;
  sesion: Sesion | null;
  tareas: TareaDeSesion[];
  indice: Map<string, { nombre: string }>;
  nombreContenido: Map<string, string>;
}) {
  const escudo = urlImagen(BUCKETS.escudos, temporada.escudo_ruta);
  const total = tareas.reduce((t, x) => t + (x.tiempo_total_seg ?? 0), 0);
  const inicio = horaCorta(actividad.hora_inicio);
  const fin = horaCorta(actividad.hora_fin);
  const orientacion = sesion?.orientacion ?? ubicacion.diaTipo?.orientacion ?? null;

  const encabezado: [string, string | null][] = [
    ["Microciclo Nº", ubicacion.numeroMicrociclo ? String(ubicacion.numeroMicrociclo) : null],
    ["Sesión Nº", ubicacion.numeroSesion ? String(ubicacion.numeroSesion) : null],
    ["Fecha", formatearFecha(actividad.fecha)],
    ["Día", ubicacion.md],
    ["Horario", inicio ? (fin ? `${inicio}–${fin}` : inicio) : null],
    ["Temporada", temporada.etiqueta],
    ["Tiempo total", total > 0 ? formatearSegundos(total) : null],
  ];

  return (
    <article className="mx-auto max-w-[297mm] break-after-page bg-white p-6 text-slate-900 shadow print:max-w-none print:p-0 print:shadow-none">
      <header
        className="mb-4 flex flex-wrap items-center gap-4 rounded-lg px-4 py-3 text-white"
        style={{ backgroundColor: temporada.color_principal }}
      >
        {escudo && (
          // Imagen privada servida por la app: next/image no aplica
          // eslint-disable-next-line @next/next/no-img-element
          <img src={escudo} alt="" className="h-14 w-14 rounded bg-white object-contain p-1" />
        )}
        <div className="mr-auto">
          <p className="text-lg font-bold uppercase leading-tight">{temporada.club}</p>
          <p className="text-sm opacity-90">
            Planilla · {INFO_ACTIVIDAD[actividad.tipo].label}
            {actividad.titulo !== INFO_ACTIVIDAD[actividad.tipo].label && ` · ${actividad.titulo}`}
          </p>
        </div>
        <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {encabezado
            .filter((e): e is [string, string] => e[1] !== null)
            .map(([label, valor]) => (
              <div key={label}>
                <dt className="text-[10px] uppercase tracking-wide opacity-80">{label}</dt>
                <dd className="font-semibold">{valor}</dd>
              </div>
            ))}
        </dl>
      </header>

      {(sesion?.objetivo || orientacion) && (
        <p className="mb-4 text-sm">
          {orientacion && (
            <span className="mr-3 font-semibold">
              {INFO_ORIENTACION[orientacion].label}
              {ubicacion.diaTipo && ` · ${ubicacion.diaTipo.foco}`}
            </span>
          )}
          {sesion?.objetivo && (
            <>
              <span className="font-semibold">Objetivo:</span> {sesion.objetivo}
            </>
          )}
        </p>
      )}

      {tareas.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">La sesión no tiene tareas.</p>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {tareas.map((t, i) => {
            const objetivos = t.tarea.objetivos
              .map((id) => indice.get(id)?.nombre)
              .filter((n): n is string => Boolean(n));
            const tecnicos = t.tarea.contenidos
              .map((id) => nombreContenido.get(id))
              .filter((n): n is string => Boolean(n));
            const grafico = urlImagen(BUCKETS.graficosTareas, t.tarea.grafico_ruta);
            const tiempo = textoTiempo(t);
            return (
              <section
                key={t.id}
                className="flex break-inside-avoid flex-col overflow-hidden rounded-lg border border-slate-300 text-[11px] leading-snug"
              >
                <h2 className="bg-slate-900 px-2 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
                  {i + 1}. {INFO_TIPO_TAREA[t.tarea.tipo].label}
                </h2>
                <div className="space-y-1.5 p-2">
                  <p className="text-xs font-semibold">{t.tarea.nombre}</p>
                  {grafico ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={grafico}
                      alt=""
                      className="aspect-video w-full rounded border border-slate-200 object-contain"
                    />
                  ) : (
                    <div className="flex aspect-video items-center justify-center rounded border border-dashed border-slate-300 text-[10px] text-slate-400">
                      Sin gráfico
                    </div>
                  )}
                  {(objetivos.length > 0 || tecnicos.length > 0) && (
                    <Dato label="Objetivos">{[...objetivos, ...tecnicos].join(" · ")}</Dato>
                  )}
                  {t.tarea.competitividad && (
                    <Dato label="Competitividad">
                      {INFO_COMPETITIVIDAD[t.tarea.competitividad].label}
                    </Dato>
                  )}
                  {tiempo && (
                    <Dato label="Tiempo de trabajo">
                      {tiempo}
                      {t.series && t.tiempo_total_seg
                        ? ` (${formatearSegundos(t.tiempo_total_seg)})`
                        : ""}
                    </Dato>
                  )}
                  {textoEspacio(t) && <Dato label="Dimensiones">{textoEspacio(t)}</Dato>}
                  {(t.jugadores || t.tarea.formato) && (
                    <Dato label="Formato">
                      {[t.tarea.formato, t.jugadores ? `${t.jugadores} jugadores` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </Dato>
                  )}
                  {t.tarea.descripcion && (
                    <Dato label="Descripción">
                      <span className="whitespace-pre-line">{t.tarea.descripcion}</span>
                    </Dato>
                  )}
                  {t.notas && <Dato label="Nota del día">{t.notas}</Dato>}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </article>
  );
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p>
      <span className="font-semibold uppercase tracking-wide text-slate-500">{label}: </span>
      {children}
    </p>
  );
}
