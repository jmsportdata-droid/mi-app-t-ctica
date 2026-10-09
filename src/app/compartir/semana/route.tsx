import { type NextRequest } from "next/server";
import { imagenSemana } from "@/lib/imagen-semana";
import { diaMes, lunesDe } from "@/lib/semana";
import { hoyISO, sumarDias } from "@/lib/utils/fecha";
import { conDescarga, diasCompartidos, fechaValida } from "../datos";

/** PNG de la semana (lunes a domingo) para el grupo de WhatsApp. ?desde=YYYY-MM-DD */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const desde = lunesDe(fechaValida(params.get("desde")) ?? hoyISO());
  const hasta = sumarDias(desde, 6);
  const { dias, club, firma } = await diasCompartidos(desde, hasta);
  const imagen = await imagenSemana({ dias, club, firma });
  return conDescarga(
    imagen,
    params.get("descargar") === "1",
    `semana-${diaMes(desde).replace("/", "-")}-al-${diaMes(hasta).replace("/", "-")}.png`,
  );
}
