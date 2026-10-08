import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-5xl font-bold text-slate-300">404</p>
      <h1 className="text-xl font-semibold">Página no encontrada</h1>
      <Link href="/plantilla" className="text-sm font-medium text-brand-600 hover:underline">
        Volver al plantel
      </Link>
    </main>
  );
}
