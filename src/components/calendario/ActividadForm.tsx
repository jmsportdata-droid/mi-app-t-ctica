"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { guardarActividad } from "@/app/(dashboard)/calendario/actions";
import { erroresDeZod } from "@/lib/validations/comun";
import { actividadSchema, type ActividadErrores } from "@/lib/validations/calendario";
import { cn } from "@/lib/utils/cn";
import { horaCorta } from "@/lib/utils/fecha";
import {
  INFO_ACTIVIDAD,
  TIPOS_CARGABLES,
  type Actividad,
  type TipoActividad,
} from "@/types/calendario";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

interface Props {
  /** Fecha sugerida al crear */
  fecha?: string;
  /** Si se pasa, edita esa actividad */
  actividad?: Actividad;
}

interface Valores {
  tipo: TipoActividad | "";
  titulo: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  hora_citacion: string;
  lugar: string;
  indicaciones: string;
  notas_internas: string;
  visible_jugadores: boolean;
}

const CLASE_TEXTAREA =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export function ActividadForm({ fecha, actividad }: Props) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [valores, setValores] = useState<Valores>({
    tipo: actividad?.tipo ?? "",
    titulo: actividad?.titulo ?? "",
    fecha: actividad?.fecha ?? fecha ?? "",
    hora_inicio: horaCorta(actividad?.hora_inicio) ?? "",
    hora_fin: horaCorta(actividad?.hora_fin) ?? "",
    hora_citacion: horaCorta(actividad?.hora_citacion) ?? "",
    lugar: actividad?.lugar ?? "",
    indicaciones: actividad?.indicaciones ?? "",
    notas_internas: actividad?.notas_internas ?? "",
    visible_jugadores: actividad?.visible_jugadores ?? true,
  });
  const [errores, setErrores] = useState<ActividadErrores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  function actualizar<K extends keyof Valores>(campo: K, valor: Valores[K]) {
    setValores((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: undefined }));
  }

  /** Al elegir el tipo se completan el título (si no se escribió otro) y la visibilidad. */
  function elegirTipo(tipo: TipoActividad) {
    setValores((prev) => {
      const tituloAnterior = prev.tipo ? INFO_ACTIVIDAD[prev.tipo].label : "";
      const tituloPorDefecto = prev.titulo === "" || prev.titulo === tituloAnterior;
      return {
        ...prev,
        tipo,
        titulo: tituloPorDefecto ? INFO_ACTIVIDAD[tipo].label : prev.titulo,
        visible_jugadores: INFO_ACTIVIDAD[tipo].visible,
      };
    });
    setErrores((prev) => ({ ...prev, tipo: undefined, titulo: undefined }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorGeneral(null);
    const parsed = actividadSchema.safeParse(valores);
    if (!parsed.success) {
      setErrores(erroresDeZod(parsed.error));
      return;
    }

    startTransition(async () => {
      try {
        const r = await guardarActividad(actividad?.id ?? null, parsed.data);
        if (!r.ok) {
          setErrorGeneral(r.error);
          setErrores(r.errores ?? {});
          return;
        }
        router.push(`/calendario?fecha=${r.fecha}`);
        router.refresh();
      } catch {
        setErrorGeneral("Error de conexión. Probá de nuevo.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="max-w-2xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      {errorGeneral && <Alert>{errorGeneral}</Alert>}

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">Tipo</legend>
        <div className="flex flex-wrap gap-2">
          {TIPOS_CARGABLES.map((t) => (
            <button
              key={t.valor}
              type="button"
              aria-pressed={valores.tipo === t.valor}
              onClick={() => elegirTipo(t.valor)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors",
                valores.tipo === t.valor
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50",
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", t.punto)} aria-hidden />
              {t.label}
            </button>
          ))}
        </div>
        {errores.tipo && <p className="mt-1 text-xs text-red-600">{errores.tipo}</p>}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-[1fr_11rem]">
        <Input
          label="Título"
          value={valores.titulo}
          onChange={(e) => actualizar("titulo", e.target.value)}
          error={errores.titulo}
          maxLength={80}
          placeholder="Ej. Entrenamiento táctico"
        />
        <Input
          label="Fecha"
          type="date"
          value={valores.fecha}
          onChange={(e) => actualizar("fecha", e.target.value)}
          error={errores.fecha}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-5">
        <Input
          label="Citación"
          type="time"
          value={valores.hora_citacion}
          onChange={(e) => actualizar("hora_citacion", e.target.value)}
          error={errores.hora_citacion}
        />
        <Input
          label="Inicio"
          type="time"
          value={valores.hora_inicio}
          onChange={(e) => actualizar("hora_inicio", e.target.value)}
          error={errores.hora_inicio}
        />
        <Input
          label="Fin"
          type="time"
          value={valores.hora_fin}
          onChange={(e) => actualizar("hora_fin", e.target.value)}
          error={errores.hora_fin}
        />
      </div>

      <Input
        label="Lugar"
        value={valores.lugar}
        onChange={(e) => actualizar("lugar", e.target.value)}
        error={errores.lugar}
        maxLength={100}
        placeholder="Ej. Complejo Los Céspedes, cancha 2"
      />

      <CampoTexto
        label="Indicaciones para los jugadores"
        ayuda="Lo ven los jugadores en la semana que se comparte."
        value={valores.indicaciones}
        onChange={(v) => actualizar("indicaciones", v)}
        error={errores.indicaciones}
        maxLength={500}
        placeholder="Ej. Traer ropa de gimnasio y botines con tapones"
      />

      <CampoTexto
        label="Notas internas"
        ayuda="Solo para el cuerpo técnico."
        value={valores.notas_internas}
        onChange={(v) => actualizar("notas_internas", v)}
        error={errores.notas_internas}
        maxLength={2000}
      />

      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={valores.visible_jugadores}
          onChange={(e) => actualizar("visible_jugadores", e.target.checked)}
          className="mt-0.5 h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        <span>
          Visible para los jugadores
          <span className="block text-xs text-slate-500">
            Si no, no aparece en lo que se comparte con el plantel.
          </span>
        </span>
      </label>

      <div className="flex items-center gap-3 border-t border-slate-100 pt-5">
        <Button type="submit" cargando={pendiente}>
          {actividad ? "Guardar cambios" : "Agregar actividad"}
        </Button>
        <Button type="button" variante="ghost" onClick={() => router.back()} disabled={pendiente}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function CampoTexto({
  label,
  ayuda,
  value,
  onChange,
  error,
  maxLength,
  placeholder,
}: {
  label: string;
  ayuda?: string;
  value: string;
  onChange: (valor: string) => void;
  error?: string;
  maxLength: number;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-slate-700">{label}</span>
      <textarea
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        className={cn(CLASE_TEXTAREA, error && "border-red-400")}
      />
      {error ? (
        <span className="block text-xs text-red-600">{error}</span>
      ) : (
        ayuda && <span className="block text-xs text-slate-500">{ayuda}</span>
      )}
    </label>
  );
}
