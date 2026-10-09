import { type NextRequest } from "next/server";
import { imagenDia } from "@/lib/imagen-semana";
import { diaMes } from "@/lib/semana";
import { hoyISO, sumarDias } from "@/lib/utils/fecha";
import { conDescarga, diasCompartidos, fechaValida } from "../datos";

/** PNG vertical de un día (por defecto, mañana). ?fecha=YYYY-MM-DD */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const hoy = hoyISO();
  const manana = sumarDias(hoy, 1);
  const fecha = fechaValida(params.get("fecha")) ?? manana;
  const { dias, club, firma } = await diasCompartidos(fecha, fecha);
  const encabezado = fecha === manana ? "Mañana" : fecha === hoy ? "Hoy" : "Programa del día";
  const imagen = await imagenDia({ dia: dias[0]!, encabezado, club, firma });
  return conDescarga(
    imagen,
    params.get("descargar") === "1",
    `dia-${diaMes(fecha).replace("/", "-")}.png`,
  );
}
