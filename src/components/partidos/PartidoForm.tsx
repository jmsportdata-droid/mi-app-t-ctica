"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { guardarPartido } from "@/app/(dashboard)/partidos/actions";
import { erroresDeZod } from "@/lib/validations/comun";
import { partidoSchema, type PartidoErrores } from "@/lib/validations/partido";
import { cn } from "@/lib/utils/cn";
import { ESTADOS_PARTIDO, ESTADO_LABEL, type Partido, type RivalResumen } from "@/types/partido";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";

interface PartidoFormProps {
  rivales: RivalResumen[];
  /** Si se pasa, el formulario edita ese partido; si no, crea uno nuevo. */
  partido?: Partido;
}

interface Valores {
  rival_id: string;
  fecha: string;
  hora: string;
  estadio: string;
  competicion: string;
  es_local: boolean;
  estado: string;
}

const COMPETICIONES_SUGERIDAS = ["Liga", "Copa", "Amistoso", "Torneo"];

export function PartidoForm({ rivales, partido }: PartidoFormProps) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [valores, setValores] = useState<Valores>({
    rival_id: partido?.rival_id ?? "",
    fecha: partido?.fecha ?? "",
    hora: partido?.hora?.slice(0, 5) ?? "",
    estadio: partido?.estadio ?? "",
    competicion: partido?.competicion ?? "",
    es_local: partido?.es_local ?? true,
    estado: partido?.estado ?? "planificado",
  });
  // Mientras el usuario no escriba el estadio a mano, se rellena con el del rival al jugar fuera.
  const [estadioManual, setEstadioManual] = useState(Boolean(partido?.estadio));
  const [errores, setErrores] = useState<PartidoErrores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const esEdicion = Boolean(partido);

  function estadioSugerido(rivalId: string, esLocal: boolean): string {
    if (esLocal) return "";
    return rivales.find((r) => r.id === rivalId)?.estadio ?? "";
  }

  function actualizar<K extends keyof Valores>(campo: K, valor: Valores[K]) {
    setValores((prev) => {
      const siguiente = { ...prev, [campo]: valor };
      if (!estadioManual && (campo === "rival_id" || campo === "es_local")) {
        siguiente.estadio = estadioSugerido(siguiente.rival_id, siguiente.es_local);
      }
      return siguiente;
    });
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: undefined }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorGeneral(null);

    const parsed = partidoSchema.safeParse(valores);
    if (!parsed.success) {
      setErrores(erroresDeZod(parsed.error));
      return;
    }

    startTransition(async () => {
      try {
        const resultado = await guardarPartido(partido?.id ?? null, parsed.data);
        if (!resultado.ok) {
          setErrorGeneral(resultado.error);
          setErrores(resultado.errores ?? {});
          return;
        }
        router.push(`/partidos/${resultado.id}`);
        router.refresh();
      } catch {
        setErrorGeneral("Error de conexión. Revisá tu conexión y probá de nuevo.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="max-w-xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      {errorGeneral && <Alert>{errorGeneral}</Alert>}

      <Select
        label="Rival"
        name="rival_id"
        value={valores.rival_id}
        onChange={(e) => actualizar("rival_id", e.target.value)}
        error={errores.rival_id}
        required
      >
        <option value="" disabled>
          Elegí un equipo…
        </option>
        {rivales.map((r) => (
          <option key={r.id} value={r.id}>
            {r.nombre}
          </option>
        ))}
      </Select>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium text-slate-700">Condición</legend>
        <div className="inline-flex rounded-lg border border-slate-300 bg-slate-50 p-1">
          {[
            { valor: true, label: "Local" },
            { valor: false, label: "Visitante" },
          ].map((opcion) => (
            <label
              key={opcion.label}
              className={cn(
                "cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                valores.es_local === opcion.valor
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              <input
                type="radio"
                name="es_local"
                className="sr-only"
                checked={valores.es_local === opcion.valor}
                onChange={() => actualizar("es_local", opcion.valor)}
              />
              {opcion.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-[1fr_8rem_1fr]">
        <Input
          label="Fecha"
          type="date"
          name="fecha"
          value={valores.fecha}
          onChange={(e) => actualizar("fecha", e.target.value)}
          error={errores.fecha}
          required
        />
        <Input
          label="Hora"
          type="time"
          name="hora"
          value={valores.hora}
          onChange={(e) => actualizar("hora", e.target.value)}
          error={errores.hora}
        />
        <div>
          <Input
            label="Competencia"
            name="competicion"
            list="competiciones-sugeridas"
            placeholder="Ej. Liga"
            value={valores.competicion}
            onChange={(e) => actualizar("competicion", e.target.value)}
            error={errores.competicion}
            maxLength={80}
          />
          <datalist id="competiciones-sugeridas">
            {COMPETICIONES_SUGERIDAS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>

      <Input
        label="Estadio"
        name="estadio"
        placeholder={valores.es_local ? "Nuestro estadio" : "Estadio del rival"}
        value={valores.estadio}
        onChange={(e) => {
          setEstadioManual(true);
          actualizar("estadio", e.target.value);
        }}
        error={errores.estadio}
        ayuda={
          !valores.es_local && !estadioManual ? "Se completa con el estadio del rival." : undefined
        }
        maxLength={100}
      />

      {esEdicion && (
        <Select
          label="Estado"
          name="estado"
          value={valores.estado}
          onChange={(e) => actualizar("estado", e.target.value)}
          error={errores.estado}
        >
          {ESTADOS_PARTIDO.map((estado) => (
            <option key={estado} value={estado}>
              {ESTADO_LABEL[estado]}
            </option>
          ))}
        </Select>
      )}

      <div className="flex items-center gap-3 border-t border-slate-100 pt-5">
        <Button type="submit" cargando={pendiente}>
          {esEdicion ? "Guardar cambios" : "Crear partido"}
        </Button>
        <Button type="button" variante="ghost" onClick={() => router.back()} disabled={pendiente}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
