"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { guardarActividadPartido } from "@/app/(dashboard)/calendario/actions";
import { erroresDeZod } from "@/lib/validations/comun";
import { actividadPartidoSchema, type ActividadErrores } from "@/lib/validations/calendario";
import { formatearDia, horaCorta } from "@/lib/utils/fecha";
import type { Actividad } from "@/types/calendario";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { CampoTexto } from "./ActividadForm";

/**
 * La actividad de un partido: fecha, hora, rival y lugar vienen del partido;
 * acá se cargan la citación, las indicaciones y las notas.
 */
export function ActividadPartidoForm({ actividad }: { actividad: Actividad }) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [valores, setValores] = useState({
    hora_citacion: horaCorta(actividad.hora_citacion) ?? "",
    indicaciones: actividad.indicaciones ?? "",
    notas_internas: actividad.notas_internas ?? "",
    visible_jugadores: actividad.visible_jugadores,
  });
  const [errores, setErrores] = useState<ActividadErrores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorGeneral(null);
    const parsed = actividadPartidoSchema.safeParse(valores);
    if (!parsed.success) {
      setErrores(erroresDeZod(parsed.error));
      return;
    }
    startTransition(async () => {
      try {
        const r = await guardarActividadPartido(actividad.id, parsed.data);
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

      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">{actividad.titulo}</p>
        <p className="capitalize">
          {formatearDia(actividad.fecha)}
          {actividad.hora_inicio && ` · ${horaCorta(actividad.hora_inicio)}`}
          {actividad.lugar && ` · ${actividad.lugar}`}
        </p>
        <p className="mt-2 text-xs">
          La fecha, la hora y el lugar se cambian desde el{" "}
          {actividad.partido_id && (
            <Link
              href={`/partidos/${actividad.partido_id}/editar`}
              className="font-medium text-brand-700 hover:underline"
            >
              partido
            </Link>
          )}
          .
        </p>
      </div>

      <Input
        label="Citación"
        type="time"
        value={valores.hora_citacion}
        onChange={(e) => setValores((v) => ({ ...v, hora_citacion: e.target.value }))}
        error={errores.hora_citacion}
        ayuda="A qué hora tienen que estar los jugadores (en el club, el hotel o el estadio)."
        className="sm:w-40"
      />
      <CampoTexto
        label="Indicaciones para los jugadores"
        ayuda="Lo ven los jugadores en la semana que se comparte."
        value={valores.indicaciones}
        onChange={(indicaciones) => setValores((v) => ({ ...v, indicaciones }))}
        error={errores.indicaciones}
        maxLength={500}
        placeholder="Ej. Ir con ropa del club. Salida del ómnibus a las 13:00."
      />
      <CampoTexto
        label="Notas internas"
        ayuda="Solo para el cuerpo técnico."
        value={valores.notas_internas}
        onChange={(notas_internas) => setValores((v) => ({ ...v, notas_internas }))}
        error={errores.notas_internas}
        maxLength={2000}
      />
      <label className="flex items-center gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={valores.visible_jugadores}
          onChange={(e) => setValores((v) => ({ ...v, visible_jugadores: e.target.checked }))}
          className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        Visible para los jugadores
      </label>

      <div className="flex items-center gap-3 border-t border-slate-100 pt-5">
        <Button type="submit" cargando={pendiente}>
          Guardar
        </Button>
        <Button type="button" variante="ghost" onClick={() => router.back()} disabled={pendiente}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
