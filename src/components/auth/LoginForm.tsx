"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { rutaSegura } from "@/lib/utils/redirect";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { GoogleIcon } from "./GoogleIcon";

interface LoginFormProps {
  next?: string;
  errorInicial?: string;
}

type Modo = "login" | "registro";

const MENSAJES_ERROR: Record<string, string> = {
  "Invalid login credentials": "Email o contraseña incorrectos",
  "Email not confirmed": "Debes confirmar tu email antes de entrar",
  "User already registered": "Ya existe una cuenta con ese email",
  auth_callback: "No se pudo completar el inicio de sesión con Google. Inténtalo de nuevo.",
};

function traducirError(mensaje: string): string {
  return MENSAJES_ERROR[mensaje] ?? mensaje;
}

export function LoginForm({ next, errorInicial }: LoginFormProps) {
  const router = useRouter();
  const destino = rutaSegura(next);

  const [modo, setModo] = useState<Modo>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    errorInicial ? traducirError(errorInicial) : null,
  );
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState<"email" | "google" | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setAviso(null);

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Introduce un email válido");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setCargando("email");
    const supabase = createClient();

    try {
      if (modo === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(destino);
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destino)}`,
        },
      });
      if (error) throw error;
      if (data.session) {
        router.replace(destino);
        router.refresh();
        return;
      }
      setAviso("Cuenta creada. Revisa tu email para confirmarla.");
      setModo("login");
    } catch (err) {
      setError(err instanceof Error ? traducirError(err.message) : "Error inesperado");
    } finally {
      setCargando(null);
    }
  }

  async function handleGoogle() {
    setError(null);
    setCargando("google");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destino)}`,
      },
    });
    // Si no hay error el navegador ya está redirigiendo a Google.
    if (error) {
      setError(traducirError(error.message));
      setCargando(null);
    }
  }

  return (
    <div className="space-y-6">
      <Button
        type="button"
        variante="secondary"
        className="w-full"
        onClick={handleGoogle}
        cargando={cargando === "google"}
        disabled={cargando !== null}
      >
        {cargando !== "google" && <GoogleIcon />}
        Continuar con Google
      </Button>

      <div className="flex items-center gap-3 text-xs uppercase text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />o<span className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <Alert>{error}</Alert>}
        {aviso && <Alert tipo="exito">{aviso}</Alert>}

        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="entrenador@club.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Contraseña"
          type="password"
          name="password"
          autoComplete={modo === "login" ? "current-password" : "new-password"}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />

        <Button
          type="submit"
          className="w-full"
          cargando={cargando === "email"}
          disabled={cargando !== null}
        >
          {modo === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500">
        {modo === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
        <button
          type="button"
          className="font-medium text-brand-600 hover:underline"
          onClick={() => {
            setModo(modo === "login" ? "registro" : "login");
            setError(null);
            setAviso(null);
          }}
        >
          {modo === "login" ? "Regístrate" : "Inicia sesión"}
        </button>
      </p>
    </div>
  );
}
