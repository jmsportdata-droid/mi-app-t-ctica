import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { esBucket, RUTA_IMAGEN } from "@/lib/storage/config";

/**
 * Sirve una imagen de los buckets privados con la sesión del usuario: Storage solo
 * entrega archivos de la carpeta de su cuerpo técnico. Las rutas llevan un uuid y
 * nunca cambian de contenido, así que el navegador puede guardarlas en caché.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { bucket: string; ruta: string[] } },
) {
  const ruta = params.ruta.join("/");
  if (!esBucket(params.bucket) || !RUTA_IMAGEN.test(ruta)) {
    return new Response("No encontrado", { status: 404 });
  }

  const supabase = createClient();
  // También refresca el token si venció (esta ruta no pasa por el middleware).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("No autorizado", { status: 401 });

  const { data, error } = await supabase.storage.from(params.bucket).download(ruta);
  if (error || !data) return new Response("No encontrado", { status: 404 });

  return new Response(data, {
    headers: {
      "Content-Type": data.type || "application/octet-stream",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
