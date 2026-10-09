"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { Logo } from "@/components/Logo";
import { LogoutButton } from "./LogoutButton";
import { ROL_LABEL, type Rol } from "@/types/cuerpo-tecnico";
import {
  IconCalendario,
  IconCuenta,
  IconCuerpoTecnico,
  IconEquipos,
  IconModeloJuego,
  IconPartidos,
  IconPlantilla,
} from "./icons";

const NAVEGACION = [
  { href: "/calendario", label: "Calendario", Icono: IconCalendario },
  { href: "/plantilla", label: "Plantel", Icono: IconPlantilla },
  { href: "/modelo-de-juego", label: "Modelo de juego", Icono: IconModeloJuego },
  { href: "/equipos", label: "Equipos", Icono: IconEquipos },
  { href: "/partidos", label: "Partidos", Icono: IconPartidos },
  { href: "/cuerpo-tecnico", label: "Cuerpo técnico", Icono: IconCuerpoTecnico },
] as const;

interface SidebarProps {
  nombre: string;
  rol: Rol;
}

export function Sidebar({ nombre, rol }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-16 flex-col border-r border-slate-200 bg-white md:w-64">
      <div className="flex h-16 items-center justify-center border-b border-slate-100 px-3 md:justify-start md:px-5">
        <div className="hidden md:block">
          <Logo />
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white md:hidden">
          T
        </span>
      </div>

      <nav className="flex-1 space-y-1 p-2 md:p-3" aria-label="Principal">
        {NAVEGACION.map(({ href, label, Icono }) => {
          const activo = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              aria-current={activo ? "page" : undefined}
              className={cn(
                "flex items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors md:justify-start",
                activo
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <Icono className="h-5 w-5 shrink-0" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-slate-100 p-2 md:p-3">
        <Link
          href="/cuenta"
          title="Mi cuenta"
          aria-current={pathname === "/cuenta" ? "page" : undefined}
          className={cn(
            "flex items-center justify-center gap-3 rounded-lg px-3 py-2 transition-colors md:justify-start",
            pathname === "/cuenta" ? "bg-brand-50" : "hover:bg-slate-100",
          )}
        >
          <IconCuenta className="h-5 w-5 shrink-0 text-slate-500" />
          <span className="hidden min-w-0 md:block">
            <span className="block truncate text-sm font-medium text-slate-800">{nombre}</span>
            <span className="block truncate text-xs text-slate-500">{ROL_LABEL[rol]}</span>
          </span>
        </Link>
        <LogoutButton />
      </div>
    </aside>
  );
}
