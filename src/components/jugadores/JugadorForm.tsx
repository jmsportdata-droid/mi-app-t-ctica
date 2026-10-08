"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { guardarJugador } from "@/app/(dashboard)/plantilla/actions";
import { erroresDeZod, jugadorSchema, type JugadorErrores } from "@/lib/validations/jugador";
import { POSICIONES, POSICION_LABEL, type Jugador, type JugadorInput } from "@/types/jugador";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { BUCKETS } from "@/lib/storage/config";
import { guardarConImagen, type ImagenValor } from "@/lib/storage/client";

interface JugadorFormProps {
  /** Carpeta de Storage donde se sube la foto */
  cuerpoTecnicoId: string;
  /** Si se pasa, el formulario edita ese jugador; si no, crea uno nuevo. */
  jugador?: Jugador;
}

interface Valores {
  nombre: string;
  fecha_nac: string;
  posicion: string;
  numero: string;
}

function valoresIniciales(jugador?: Jugador): Valores {
  return {
    nombre: jugador?.nombre ?? "",
    fecha_nac: jugador?.fecha_nac ?? "",
    posicion: jugador?.posicion ?? "",
    numero: jugador?.numero != null ? String(jugador.numero) : "",
  };
}

/** Convierte los valores del formulario (strings) al shape tipado de entrada. */
function aInput(v: Valores, fotoRuta: string | null): unknown {
  return {
    foto_ruta: fotoRuta,
    nombre: v.nombre,
    fecha_nac: v.fecha_nac,
    posicion: v.posicion,
    numero: v.numero.trim() === "" ? null : Number(v.numero),
  };
}

export function JugadorForm({ cuerpoTecnicoId, jugador }: JugadorFormProps) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [valores, setValores] = useState<Valores>(() => valoresIniciales(jugador));
  const [errores, setErrores] = useState<JugadorErrores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [foto, setFoto] = useState<ImagenValor>({
    archivo: null,
    ruta: jugador?.foto_ruta ?? null,
  });

  const esEdicion = Boolean(jugador);

  function actualizar<K extends keyof Valores>(campo: K, valor: Valores[K]) {
    setValores((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: undefined }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorGeneral(null);

    // Si hay archivo nuevo, la ruta aún no existe: se valida el resto y la foto se sube después.
    const parsed = jugadorSchema.safeParse(aInput(valores, foto.archivo ? null : foto.ruta));
    if (!parsed.success) {
      setErrores(erroresDeZod(parsed.error));
      return;
    }

    startTransition(async () => {
      const resultado = await guardarConImagen(
        BUCKETS.fotosJugadores,
        cuerpoTecnicoId,
        foto,
        (fotoRuta) => {
          const input: JugadorInput = { ...parsed.data, foto_ruta: fotoRuta };
          return guardarJugador(jugador?.id ?? null, input);
        },
      );

      if (!resultado.ok) {
        setErrorGeneral(resultado.error);
        setErrores(resultado.errores ?? {});
        return;
      }
      router.push(`/plantilla/${resultado.id}`);
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
        label="Foto"
        bucket={BUCKETS.fotosJugadores}
        value={foto}
        onChange={setFoto}
        error={errores.foto_ruta}
        disabled={pendiente}
      />

      <Input
        label="Nombre completo"
        name="nombre"
        placeholder="Ej. Luis Alberto Suárez Díaz"
        value={valores.nombre}
        onChange={(e) => actualizar("nombre", e.target.value)}
        error={errores.nombre}
        maxLength={80}
        required
        autoFocus={!esEdicion}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Fecha de nacimiento"
          type="date"
          name="fecha_nac"
          value={valores.fecha_nac}
          onChange={(e) => actualizar("fecha_nac", e.target.value)}
          error={errores.fecha_nac}
          required
        />
        <Select
          label="Posición"
          name="posicion"
          value={valores.posicion}
          onChange={(e) => actualizar("posicion", e.target.value)}
          error={errores.posicion}
          required
        >
          <option value="" disabled>
            Elegí…
          </option>
          {POSICIONES.map((p) => (
            <option key={p} value={p}>
              {p} — {POSICION_LABEL[p]}
            </option>
          ))}
        </Select>
      </div>

      <Input
        label="Número de camiseta"
        type="number"
        name="numero"
        inputMode="numeric"
        min={1}
        max={99}
        step={1}
        placeholder="1–99"
        value={valores.numero}
        onChange={(e) => actualizar("numero", e.target.value)}
        error={errores.numero}
        ayuda="Opcional. No se puede repetir en el plantel."
        className="sm:w-40"
      />

      <div className="flex items-center gap-3 border-t border-slate-100 pt-5">
        <Button type="submit" cargando={pendiente}>
          {esEdicion ? "Guardar cambios" : "Agregar jugador"}
        </Button>
        <Button type="button" variante="ghost" onClick={() => router.back()} disabled={pendiente}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
