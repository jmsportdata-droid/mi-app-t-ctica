"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { guardarEquipo } from "@/app/(dashboard)/equipos/actions";
import { erroresDeZod } from "@/lib/validations/comun";
import { equipoSchema, type EquipoErrores } from "@/lib/validations/equipo";
import { BUCKETS } from "@/lib/storage/config";
import { guardarConImagen, type ImagenValor } from "@/lib/storage/client";
import type { Equipo, EquipoInput } from "@/types/equipo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { ImageUpload } from "@/components/ui/ImageUpload";

interface EquipoFormProps {
  /** Si se pasa, el formulario edita ese equipo; si no, crea uno nuevo. */
  equipo?: Equipo;
}

interface Valores {
  nombre: string;
  liga: string;
  estadio: string;
}

export function EquipoForm({ equipo }: EquipoFormProps) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [valores, setValores] = useState<Valores>({
    nombre: equipo?.nombre ?? "",
    liga: equipo?.liga ?? "",
    estadio: equipo?.estadio ?? "",
  });
  const [escudo, setEscudo] = useState<ImagenValor>({
    archivo: null,
    url: equipo?.escudo_url ?? null,
  });
  const [errores, setErrores] = useState<EquipoErrores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const esEdicion = Boolean(equipo);

  function actualizar<K extends keyof Valores>(campo: K, valor: string) {
    setValores((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: undefined }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorGeneral(null);

    // Si hay archivo nuevo, la URL aún no existe: se valida el resto y el escudo se sube después.
    const parsed = equipoSchema.safeParse({
      ...valores,
      escudo_url: escudo.archivo ? null : escudo.url,
    });
    if (!parsed.success) {
      setErrores(erroresDeZod(parsed.error));
      return;
    }

    startTransition(async () => {
      const resultado = await guardarConImagen(BUCKETS.escudosEquipos, escudo, (escudoUrl) => {
        const input: EquipoInput = { ...parsed.data, escudo_url: escudoUrl };
        return guardarEquipo(equipo?.id ?? null, input);
      });

      if (!resultado.ok) {
        setErrorGeneral(resultado.error);
        setErrores(resultado.errores ?? {});
        return;
      }
      router.push("/equipos");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="max-w-xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      {errorGeneral && <Alert>{errorGeneral}</Alert>}

      <ImageUpload
        label="Escudo"
        value={escudo}
        onChange={setEscudo}
        ajuste="contain"
        error={errores.escudo_url}
        disabled={pendiente}
      />

      <Input
        label="Nombre del equipo"
        name="nombre"
        placeholder="Ej. Real Betis Balompié"
        value={valores.nombre}
        onChange={(e) => actualizar("nombre", e.target.value)}
        error={errores.nombre}
        maxLength={80}
        required
        autoFocus={!esEdicion}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Liga"
          name="liga"
          placeholder="Opcional"
          value={valores.liga}
          onChange={(e) => actualizar("liga", e.target.value)}
          error={errores.liga}
          maxLength={80}
        />
        <Input
          label="Estadio"
          name="estadio"
          placeholder="Opcional"
          value={valores.estadio}
          onChange={(e) => actualizar("estadio", e.target.value)}
          error={errores.estadio}
          maxLength={80}
        />
      </div>

      <div className="flex items-center gap-3 border-t border-slate-100 pt-5">
        <Button type="submit" cargando={pendiente}>
          {esEdicion ? "Guardar cambios" : "Crear equipo"}
        </Button>
        <Button type="button" variante="ghost" onClick={() => router.back()} disabled={pendiente}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
