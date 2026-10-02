import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rutaSegura } from "@/lib/utils/redirect";

/**
 * Callback de OAuth (Google) y de confirmación de email.
 * Intercambia el `code` por una sesión de Supabase y la guarda en cookies.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = rutaSegura(searchParams.get("next"));

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Detrás de un proxy (p. ej. Vercel) el host real llega en x-forwarded-host.
      const forwardedHost = request.headers.get("x-forwarded-host");
      const esLocal = process.env.NODE_ENV === "development";
      const base = !esLocal && forwardedHost ? `https://${forwardedHost}` : origin;
      return NextResponse.redirect(`${base}${next}`);
    }

    console.error("[auth/callback] exchangeCodeForSession:", error.message);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
