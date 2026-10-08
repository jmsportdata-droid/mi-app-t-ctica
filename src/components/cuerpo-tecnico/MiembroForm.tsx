"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { agregarMiembro } from "@/app/(dashboard)/cuerpo-tecnico/actions";
import { erroresDeZod } from "@/lib/validations/comun";
import { miembroSchema, type MiembroErrores } from "@/lib/validations/cuerpo-tecnico";
import { generarPassword } from "@/lib/utils/password";
import { PASSWORD_MIN, ROLES, type MiembroInput } from "@/types/cuerpo-tecnico";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";

type Valores = Record<keyof MiembroInput, string>;

export function MiembroForm() {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [valores, setValores] = useState<Valores>({
    nombre: "",
    email: "",
    rol: "",
    password: "",
  });
  const [errores, setErrores] = useState<MiembroErrores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [creado, setCreado] = useState<{ email: string; password: string } | null>(null);

  // Se genera en el navegador: en el render del servidor daría otra distinta.
  useEffect(() => {
    setValores((prev) => (prev.password ? prev : { ...prev, password: generarPassword() }));
  }, []);

  function actualizar<K extends keyof Valores>(campo: K, valor: string) {
    setValores((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: undefined }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorGeneral(null);

    const parsed = miembroSchema.safeParse(valores);
    if (!parsed.success) {
      setErrores(erroresDeZod(parsed.error));
      return;
    }

    startTransition(async () => {
      const resultado = await agregarMiembro(parsed.data);
      if (!resultado.ok) {
        setErrorGeneral(resultado.error);
        setErrores(resultado.errores ?? {});
        return;
      }
      setCreado({ email: parsed.data.email, password: parsed.data.password });
      router.refresh();
    });
  }

  if (creado) {
    return (
      <div className="max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Alert tipo="exito">Listo, la cuenta quedó creada.</Alert>
        <p className="text-sm text-slate-600">
          Pasale estos datos para que entre. Después puede cambiar la contraseña desde{" "}
          <strong>Mi cuenta</strong>.
        </p>
        <dl className="space-y-2 rounded-xl bg-slate-50 p-4 font-mono text-sm">
          <div>
            <dt className="inline text-slate-500">Email: </dt>
            <dd className="inline text-slate-900">{creado.email}</dd>
          </div>
          <div>
            <dt className="inline text-slate-500">Contraseña: </dt>
            <dd className="inline text-slate-900">{creado.password}</dd>
          </div>
        </dl>
        <div className="flex gap-3">
          <Button onClick={() => router.push("/cuerpo-tecnico")}>Volver al cuerpo técnico</Button>
          <Button
            variante="ghost"
            onClick={() => {
              setCreado(null);
              setValores({ nombre: "", email: "", rol: "", password: generarPassword() });
            }}
          >
            Agregar otro
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="max-w-xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      {errorGeneral && <Alert>{errorGeneral}</Alert>}

      <Input
        label="Nombre y apellido"
        name="nombre"
        placeholder="Ej. Martín Pérez"
        value={valores.nombre}
        onChange={(e) => actualizar("nombre", e.target.value)}
        error={errores.nombre}
        maxLength={80}
        required
        autoFocus
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="off"
          placeholder="nombre@ejemplo.com"
          value={valores.email}
          onChange={(e) => actualizar("email", e.target.value)}
          error={errores.email}
          required
        />
        <Select
          label="Rol"
          name="rol"
          value={valores.rol}
          onChange={(e) => actualizar("rol", e.target.value)}
          error={errores.rol}
          required
        >
          <option value="" disabled>
            Elegí…
          </option>
          {ROLES.map((r) => (
            <option key={r.valor} value={r.valor}>
              {r.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            label="Contraseña inicial"
            name="password"
            autoComplete="new-password"
            value={valores.password}
            onChange={(e) => actualizar("password", e.target.value)}
            error={errores.password}
            ayuda={`Mínimo ${PASSWORD_MIN} caracteres. Se la vas a pasar vos.`}
            className="font-mono"
            required
          />
        </div>
        <Button
          type="button"
          variante="secondary"
          className="mb-6"
          onClick={() => actualizar("password", generarPassword())}
          disabled={pendiente}
        >
          Generar otra
        </Button>
      </div>

      <div className="flex items-center gap-3 border-t border-slate-100 pt-5">
        <Button type="submit" cargando={pendiente}>
          Crear cuenta
        </Button>
        <Button type="button" variante="ghost" onClick={() => router.back()} disabled={pendiente}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
