"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { rutaSegura } from "@/lib/utils/redirect";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";

interface LoginFormProps {
  next?: string;
}

const MENSAJES_ERROR: Record<string, string> = {
  "Invalid login credentials": "Email o contraseña incorrectos",
  "Email not confirmed":
    "Tu cuenta todavía no está confirmada. Pedile al entrenador que la revise.",
};

function traducirError(mensaje: string): string {
  return MENSAJES_ERROR[mensaje] ?? "No se pudo iniciar sesión. Probá de nuevo.";
}

/** Solo inicio de sesión: las cuentas las crea el entrenador desde "Cuerpo técnico". */
export function LoginForm({ next }: LoginFormProps) {
  const router = useRouter();
  const destino = rutaSegura(next);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Ingresá un email válido");
      return;
    }
    if (password.length === 0) {
      setError("Ingresá tu contraseña");
      return;
    }

    setCargando(true);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) {
      setError(traducirError(error.message));
      setCargando(false);
      return;
    }
    router.replace(destino);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <Alert>{error}</Alert>}

        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="nombre@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Contraseña"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Button type="submit" className="w-full" cargando={cargando}>
          Iniciar sesión
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500">
        ¿No tenés cuenta o te olvidaste la contraseña? Pedíselo al entrenador del cuerpo técnico.
      </p>
    </div>
  );
}
