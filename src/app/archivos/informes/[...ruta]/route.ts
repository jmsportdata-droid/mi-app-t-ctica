import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const RUTA_PDF = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.pdf$/;

/** Sirve el PDF de un informe con la sesión del usuario (Storage aplica los permisos). */
export async function GET(_request: NextRequest, { params }: { params: { ruta: string[] } }) {
  const ruta = params.ruta.join("/");
  if (!RUTA_PDF.test(ruta)) return new Response("No encontrado", { status: 404 });
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("No autorizado", { status: 401 });
  const { data, error } = await supabase.storage.from("informes").download(ruta);
  if (error || !data) return new Response("No encontrado", { status: 404 });
  return new Response(data, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="informe-rival.pdf"',
      "Cache-Control": "private, max-age=3600",
    },
  });
}
