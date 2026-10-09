"use client";

import {
  guardarCampoPrevia,
  guardarCesped,
  guardarFormacionRival,
  type CampoPrevia,
} from "@/app/(dashboard)/partidos/semana-actions";
import { etiquetaFormacion, LISTA_FORMACIONES, type Formacion } from "@/types/alineacion";
import { CESPEDES, type PartidoPrevia } from "@/types/partido";
import { AutoSaveField } from "@/components/ui/AutoSaveField";
import { claseControl } from "@/components/ui/Field";
import { useAccion } from "@/components/ui/useAccion";

/** Previa del partido: formaciones, condiciones, árbitro y contexto del rival. */
export function PreviaPanel({
  partidoId,
  previa,
  formacionPropia,
  formacionRival,
}: {
  partidoId: string;
  previa: PartidoPrevia | null;
  formacionPropia: Formacion | null;
  formacionRival: Formacion | null;
}) {
  const formacion = useAccion();
  const cesped = useAccion();

  const campo = (
    nombre: CampoPrevia,
    label: string,
    opciones: { multilinea?: boolean; placeholder?: string; ayuda?: string } = {},
  ) => {
    const valor = previa?.[nombre];
    return (
      <AutoSaveField
        label={label}
        valorInicial={valor === null || valor === undefined ? null : String(valor)}
        onGuardar={(v) => guardarCampoPrevia(partidoId, nombre, v)}
        multilinea={opciones.multilinea}
        filas={3}
        placeholder={opciones.placeholder}
        ayuda={opciones.ayuda}
      />
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Seccion titulo="Formaciones" className="lg:col-span-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-slate-700">Nuestra formación</span>
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800">
              {formacionPropia ? etiquetaFormacion(formacionPropia) : "Se elige en Convocatoria"}
            </p>
          </div>
          <label className="space-y-1.5">
            <span className="block text-sm font-medium text-slate-700">
              Formación esperada del rival
            </span>
            <select
              defaultValue={formacionRival ?? ""}
              disabled={formacion.pendiente}
              onChange={(e) =>
                formacion.ejecutar(() => guardarFormacionRival(partidoId, e.target.value || null))
              }
              className={claseControl(formacion.error ?? undefined)}
            >
              <option value="">Sin definir</option>
              {LISTA_FORMACIONES.map((f) => (
                <option key={f} value={f}>
                  {etiquetaFormacion(f)}
                </option>
              ))}
            </select>
            {formacion.error && <span className="text-xs text-red-600">{formacion.error}</span>}
          </label>
        </div>
      </Seccion>

      <Seccion titulo="Condiciones">
        <div className="grid gap-4 sm:grid-cols-3">
          {campo("cancha_largo", "Largo de la cancha (m)", { placeholder: "105" })}
          {campo("cancha_ancho", "Ancho (m)", { placeholder: "68" })}
          <label className="space-y-1.5">
            <span className="block text-sm font-medium text-slate-700">Césped</span>
            <select
              defaultValue={previa?.cesped ?? ""}
              disabled={cesped.pendiente}
              onChange={(e) =>
                cesped.ejecutar(() => guardarCesped(partidoId, e.target.value || null))
              }
              className={claseControl()}
            >
              <option value="">Sin definir</option>
              {CESPEDES.map((c) => (
                <option key={c.valor} value={c.valor}>
                  {c.label}
                </option>
              ))}
            </select>
            {cesped.error && <span className="text-xs text-red-600">{cesped.error}</span>}
          </label>
        </div>
        {campo("estado_cancha", "Estado de la cancha", {
          placeholder: "Pesada, pasto alto, riego…",
        })}
        {campo("clima", "Clima y horario", { placeholder: "Calor, viento a favor en el 1T…" })}
        {campo("condiciones_notas", "Otras notas", { multilinea: true })}
      </Seccion>

      <Seccion titulo="Árbitro">
        {campo("arbitro", "Nombre")}
        <div className="grid gap-4 sm:grid-cols-3">
          {campo("arbitro_amarillas", "Amarillas por partido", { placeholder: "4,5" })}
          {campo("arbitro_rojas", "Rojas por partido", { placeholder: "0,2" })}
          {campo("arbitro_penales", "Penales por partido", { placeholder: "0,3" })}
        </div>
        {campo("arbitro_notas", "Tendencias", {
          multilinea: true,
          placeholder: "Deja jugar, cobra mucho el contacto, saca amarilla temprano…",
        })}
      </Seccion>

      <Seccion titulo="Contexto del rival" className="lg:col-span-2">
        <div className="grid gap-4 sm:grid-cols-2">
          {campo("rival_racha", "Cómo viene", {
            placeholder: "G G E P G · 3 partidos sin perder",
            ayuda: "Últimos resultados y momento.",
          })}
          {campo("rival_dt", "Entrenador")}
          {campo("rival_calendario", "Calendario y viaje", {
            multilinea: true,
            placeholder: "Jugó el miércoles por Copa, viaja 500 km…",
          })}
          {campo("rival_bajas", "Lesionados y suspendidos", { multilinea: true })}
          {campo("rival_dt_tendencias", "Tendencias del entrenador", {
            multilinea: true,
            placeholder: "Cambios al 60′, pasa a línea de 5 cuando gana…",
          })}
          {campo("rival_notas", "Otras notas", { multilinea: true })}
        </div>
      </Seccion>
    </div>
  );
}

function Seccion({
  titulo,
  className,
  children,
}: {
  titulo: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className ?? ""}`}
    >
      <h2 className="font-semibold text-slate-900">{titulo}</h2>
      {children}
    </section>
  );
}
