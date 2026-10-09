/**
 * Devuelve una ruta interna segura para redirigir tras el login.
 * Evita open redirects ("//evil.com", "https://...").
 */
export function rutaSegura(next: string | null | undefined, porDefecto = "/hoy"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return porDefecto;
  }
  return next;
}
