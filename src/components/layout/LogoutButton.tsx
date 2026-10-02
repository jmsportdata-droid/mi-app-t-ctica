"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui/Spinner";
import { IconLogout } from "./icons";

export function LogoutButton() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);

  async function handleLogout() {
    setCargando(true);
    const { error } = await createClient().auth.signOut();
    if (error) {
      console.error("[logout]", error.message);
      setCargando(false);
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={cargando}
      title="Cerrar sesión"
      className="flex w-full items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60 md:justify-start"
    >
      {cargando ? <Spinner /> : <IconLogout className="h-5 w-5 shrink-0" />}
      <span className="hidden md:inline">Cerrar sesión</span>
    </button>
  );
}
