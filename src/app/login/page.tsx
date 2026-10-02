import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Iniciar sesión" };

interface LoginPageProps {
  searchParams: { next?: string; error?: string };
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <h1 className="text-xl font-semibold text-slate-900">Bienvenido</h1>
          <p className="mb-6 mt-1 text-sm text-slate-500">Accede para gestionar tu equipo</p>
          <LoginForm next={searchParams.next} errorInicial={searchParams.error} />
        </div>
      </div>
    </main>
  );
}
