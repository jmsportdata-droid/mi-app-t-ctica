"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { guardarTemporada } from "@/app/(dashboard)/cuerpo-tecnico/actions";
import { erroresDeZod } from "@/lib/validations/comun";
import { temporadaSchema, type TemporadaErrores } from "@/lib/validations/cuerpo-tecnico";
import { BUCKETS } from "@/lib/storage/config";
import { guardarConImagen, type ImagenValor } from "@/lib/storage/client";
import type { Temporada, TemporadaInput } from "@/types/cuerpo-tecnico";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { ImageUpload } from "@/components/ui/ImageUpload";

interface TemporadaFormProps {
  cuerpoTecnicoId: string;
  /** Si se pasa, edita esa temporada; si no, crea una nueva. */
  temporada?: Temporada;
}

type Valores = Omit<TemporadaInput, "escudo_ruta">;

const COLOR_POR_DEFECTO = "#059669";

export function TemporadaForm({ cuerpoTecnicoId, temporada }: TemporadaFormProps) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [valores, setValores] = useState<Valores>({
    club: temporada?.club ?? "",
    etiqueta: temporada?.etiqueta ?? "",
    fecha_inicio: temporada?.fecha_inicio ?? "",
    fecha_fin: temporada?.fecha_fin ?? "",
    color_principal: temporada?.color_principal ?? COLOR_POR_DEFECTO,
  });
  const [escudo, setEscudo] = useState<ImagenValor>({
    archivo: null,
    ruta: temporada?.escudo_ruta ?? null,
  });
  const [errores, setErrores] = useState<TemporadaErrores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const esEdicion = Boolean(temporada);

  function actualizar<K extends keyof Valores>(campo: K, valor: string) {
    setValores((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: undefined }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorGeneral(null);

    // Si hay archivo nuevo, la ruta aún no existe: se valida el resto y el escudo se sube después.
    const parsed = temporadaSchema.safeParse({
      ...valores,
      escudo_ruta: escudo.archivo ? null : escudo.ruta,
    });
    if (!parsed.success) {
      setErrores(erroresDeZod(parsed.error));
      return;
    }

    startTransition(async () => {
      const resultado = await guardarConImagen(
        BUCKETS.escudos,
        cuerpoTecnicoId,
        escudo,
        (escudoRuta) =>
          guardarTemporada(temporada?.id ?? null, { ...parsed.data, escudo_ruta: escudoRuta }),
      );

      if (!resultado.ok) {
        setErrorGeneral(resultado.error);
        setErrores(resultado.errores ?? {});
        return;
      }
      router.push("/cuerpo-tecnico");
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
        label="Escudo del club"
        bucket={BUCKETS.escudos}
        value={escudo}
        onChange={setEscudo}
        ajuste="contain"
        error={errores.escudo_ruta}
        disabled={pendiente}
      />

      <div className="grid gap-5 sm:grid-cols-[1fr_10rem]">
        <Input
          label="Club"
          name="club"
          placeholder="Ej. Club Nacional de Football"
          value={valores.club}
          onChange={(e) => actualizar("club", e.target.value)}
          error={errores.club}
          maxLength={80}
          required
          autoFocus={!esEdicion}
        />
        <Input
          label="Temporada"
          name="etiqueta"
          placeholder="Ej. 2026"
          value={valores.etiqueta}
          onChange={(e) => actualizar("etiqueta", e.target.value)}
          error={errores.etiqueta}
          maxLength={20}
          required
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Inicio"
          type="date"
          name="fecha_inicio"
          value={valores.fecha_inicio}
          onChange={(e) => actualizar("fecha_inicio", e.target.value)}
          error={errores.fecha_inicio}
          required
        />
        <Input
          label="Fin"
          type="date"
          name="fecha_fin"
          value={valores.fecha_fin}
          onChange={(e) => actualizar("fecha_fin", e.target.value)}
          error={errores.fecha_fin}
          required
        />
      </div>

      <Input
        label="Color del club"
        type="color"
        name="color_principal"
        value={valores.color_principal}
        onChange={(e) => actualizar("color_principal", e.target.value)}
        error={errores.color_principal}
        ayuda="Se usa en lo que se comparte con los jugadores (por ejemplo, la semana)."
        className="h-10 w-24 cursor-pointer p-1"
      />

      <div className="flex items-center gap-3 border-t border-slate-100 pt-5">
        <Button type="submit" cargando={pendiente}>
          {esEdicion ? "Guardar cambios" : "Crear temporada"}
        </Button>
        <Button type="button" variante="ghost" onClick={() => router.back()} disabled={pendiente}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
