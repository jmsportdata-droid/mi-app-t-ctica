"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { crearCuerpoTecnico } from "@/app/bienvenida/actions";
import { erroresDeZod } from "@/lib/validations/comun";
import {
  altaCuerpoTecnicoSchema,
  type AltaCuerpoTecnicoErrores,
  type AltaCuerpoTecnicoInput,
} from "@/lib/validations/cuerpo-tecnico";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";

const INICIAL: AltaCuerpoTecnicoInput = {
  nombre: "",
  mi_nombre: "",
  club: "",
  etiqueta: "",
  fecha_inicio: "",
  fecha_fin: "",
};

export function AltaCuerpoTecnicoForm() {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [valores, setValores] = useState<AltaCuerpoTecnicoInput>(INICIAL);
  const [errores, setErrores] = useState<AltaCuerpoTecnicoErrores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  function actualizar(campo: keyof AltaCuerpoTecnicoInput, valor: string) {
    setValores((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: undefined }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorGeneral(null);
    const parsed = altaCuerpoTecnicoSchema.safeParse(valores);
    if (!parsed.success) {
      setErrores(erroresDeZod(parsed.error));
      return;
    }

    startTransition(async () => {
      const resultado = await crearCuerpoTecnico(parsed.data);
      if (!resultado.ok) {
        setErrorGeneral(resultado.error);
        setErrores(resultado.errores ?? {});
        return;
      }
      router.replace("/plantilla");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {errorGeneral && <Alert>{errorGeneral}</Alert>}

      <fieldset className="space-y-4">
        <legend className="mb-2 text-sm font-semibold text-slate-900">Tu cuerpo técnico</legend>
        <Input
          label="Nombre del cuerpo técnico"
          placeholder="Ej. Cuerpo técnico Morosoff"
          value={valores.nombre}
          onChange={(e) => actualizar("nombre", e.target.value)}
          error={errores.nombre}
          ayuda="Es lo que viaja con ustedes de club en club."
          maxLength={80}
          autoFocus
        />
        <Input
          label="Tu nombre"
          placeholder="Ej. Juan Pérez"
          value={valores.mi_nombre}
          onChange={(e) => actualizar("mi_nombre", e.target.value)}
          error={errores.mi_nombre}
          maxLength={80}
        />
      </fieldset>

      <fieldset className="space-y-4 border-t border-slate-100 pt-6">
        <legend className="mb-2 text-sm font-semibold text-slate-900">Temporada actual</legend>
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <Input
            label="Club"
            placeholder="Ej. Club Nacional de Football"
            value={valores.club}
            onChange={(e) => actualizar("club", e.target.value)}
            error={errores.club}
            maxLength={80}
          />
          <Input
            label="Temporada"
            placeholder="2026"
            value={valores.etiqueta}
            onChange={(e) => actualizar("etiqueta", e.target.value)}
            error={errores.etiqueta}
            maxLength={20}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Inicio"
            type="date"
            value={valores.fecha_inicio}
            onChange={(e) => actualizar("fecha_inicio", e.target.value)}
            error={errores.fecha_inicio}
          />
          <Input
            label="Fin"
            type="date"
            value={valores.fecha_fin}
            onChange={(e) => actualizar("fecha_fin", e.target.value)}
            error={errores.fecha_fin}
          />
        </div>
      </fieldset>

      <Button type="submit" className="w-full" cargando={pendiente}>
        Crear y empezar
      </Button>
    </form>
  );
}
