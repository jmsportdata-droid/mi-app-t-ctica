"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { passwordSchema } from "@/lib/validations/cuerpo-tecnico";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";

export function CambiarPasswordForm() {
  const [password, setPassword] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setListo(false);

    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Contraseña no válida");
      return;
    }
    if (password !== repetida) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setCargando(true);
    const { error } = await createClient().auth.updateUser({ password: parsed.data });
    setCargando(false);
    if (error) {
      setError(
        error.code === "same_password"
          ? "La contraseña nueva tiene que ser distinta de la actual"
          : "No se pudo cambiar la contraseña. Probá de nuevo.",
      );
      return;
    }
    setListo(true);
    setPassword("");
    setRepetida("");
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {error && <Alert>{error}</Alert>}
      {listo && <Alert tipo="exito">Listo, tu contraseña quedó cambiada.</Alert>}
      <Input
        label="Contraseña nueva"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Input
        label="Repetila"
        type="password"
        autoComplete="new-password"
        value={repetida}
        onChange={(e) => setRepetida(e.target.value)}
        required
      />
      <Button type="submit" cargando={cargando}>
        Cambiar contraseña
      </Button>
    </form>
  );
}
