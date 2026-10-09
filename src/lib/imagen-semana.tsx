import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { diaMes, nombreDia, PALETA, type DiaCompartido } from "@/lib/semana";

type Peso = 400 | 600 | 800;

let fuentes: Promise<{ name: string; data: Buffer; weight: Peso; style: "normal" }[]> | null = null;

/** Work Sans, la tipografía de la presentación del cuerpo técnico (se lee una vez). */
function cargarFuentes() {
  fuentes ??= Promise.all(
    ([400, 600, 800] as const).map(async (weight) => ({
      name: "Work Sans",
      data: await readFile(join(process.cwd(), `assets/fuentes/work-sans-${weight}.woff`)),
      weight,
      style: "normal" as const,
    })),
  );
  return fuentes;
}

/** Fondo genérico: azul de la presentación con las líneas de una cancha. */
function Fondo({ ancho, alto }: { ancho: number; alto: number }) {
  const linea = "rgba(183, 202, 219, 0.07)";
  const radio = Math.round(alto * 0.32);
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: ancho,
        height: alto,
        display: "flex",
        backgroundImage: `linear-gradient(135deg, ${PALETA.fondo} 0%, ${PALETA.fondoClaro} 55%, ${PALETA.fondo} 100%)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: ancho * 0.62,
          top: 0,
          width: 3,
          height: alto,
          backgroundColor: linea,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: ancho * 0.62 - radio,
          top: alto / 2 - radio,
          width: radio * 2,
          height: radio * 2,
          borderRadius: radio,
          border: `3px solid ${linea}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: ancho,
          height: 8,
          backgroundImage: `linear-gradient(90deg, ${PALETA.acento}, ${PALETA.suave})`,
        }}
      />
    </div>
  );
}

const ANCHO_SEMANA = 1600;
const ALTO_SEMANA = 900;

/** Imagen horizontal de la semana para el grupo de WhatsApp. */
export async function imagenSemana({
  dias,
  club,
  firma,
}: {
  dias: DiaCompartido[];
  club: string;
  firma: string;
}) {
  const primero = dias[0]?.fecha ?? "";
  const ultimo = dias.at(-1)?.fecha ?? "";
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "44px 48px 40px",
        color: PALETA.texto,
        fontFamily: "Work Sans",
        position: "relative",
      }}
    >
      <Fondo ancho={ANCHO_SEMANA} alto={ALTO_SEMANA} />
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ display: "flex", fontSize: 56, fontWeight: 800, letterSpacing: -1 }}>
          {`SEMANA ${diaMes(primero)} AL ${diaMes(ultimo)}`}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: 4,
            color: PALETA.acento,
            textTransform: "uppercase",
            paddingBottom: 10,
          }}
        >
          {club}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, gap: 14, marginTop: 28 }}>
        {dias.map((d) => (
          <ColumnaDia key={d.fecha} dia={d} />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 18,
          fontSize: 18,
          color: PALETA.acento,
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        {firma}
      </div>
    </div>,
    { width: ANCHO_SEMANA, height: ALTO_SEMANA, fonts: await cargarFuentes() },
  );
}

function Etiqueta({ children }: { children: string }) {
  return (
    <div
      style={{
        display: "flex",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: 2,
        color: PALETA.acento,
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

function ColumnaDia({ dia }: { dia: DiaCompartido }) {
  const esPartido = dia.items.some((i) => i.esPartido);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        borderRadius: 18,
        overflow: "hidden",
        backgroundColor: esPartido ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)",
        border: `1px solid rgba(183,202,219,${esPartido ? 0.45 : 0.15})`,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "16px 10px 12px",
          backgroundColor: esPartido ? PALETA.texto : "rgba(255,255,255,0.08)",
          color: esPartido ? PALETA.fondo : PALETA.texto,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          {nombreDia(dia.fecha)}
        </div>
        <div style={{ display: "flex", fontSize: 18, fontWeight: 600, marginTop: 2 }}>
          {diaMes(dia.fecha) + (dia.md ? ` · ${dia.md}` : "")}
        </div>
      </div>

      {dia.libre ? (
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: 6,
            color: PALETA.suave,
          }}
        >
          LIBRE
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", padding: "14px 14px", gap: 12 }}>
          {dia.lugar && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Etiqueta>Lugar</Etiqueta>
              <div style={{ display: "flex", fontSize: 17, fontWeight: 600 }}>{dia.lugar}</div>
            </div>
          )}
          {dia.citacion && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Etiqueta>Citación</Etiqueta>
              <div style={{ display: "flex", fontSize: 26, fontWeight: 800 }}>{dia.citacion}</div>
            </div>
          )}
          <div
            style={{
              display: "flex",
              width: "100%",
              height: 1,
              backgroundColor: "rgba(183,202,219,0.2)",
            }}
          />
          {dia.items.map((i) => (
            <div key={i.id} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {i.hora && (
                <div
                  style={{ display: "flex", fontSize: 15, fontWeight: 600, color: PALETA.suave }}
                >
                  {i.hora}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  fontSize: i.esPartido ? 21 : 19,
                  fontWeight: i.esPartido ? 800 : 600,
                  lineHeight: 1.15,
                }}
              >
                {i.titulo}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const ANCHO_DIA = 1080;
const ALTO_DIA = 1350;

/** Imagen vertical de un día ("mañana") para mandar la noche anterior. */
export async function imagenDia({
  dia,
  encabezado,
  club,
  firma,
}: {
  dia: DiaCompartido;
  /** "MAÑANA" u otro texto para la primera línea */
  encabezado: string;
  club: string;
  firma: string;
}) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "80px 80px 70px",
        color: PALETA.texto,
        fontFamily: "Work Sans",
        position: "relative",
      }}
    >
      <Fondo ancho={ANCHO_DIA} alto={ALTO_DIA} />
      <div
        style={{
          display: "flex",
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: 6,
          color: PALETA.acento,
          textTransform: "uppercase",
        }}
      >
        {club}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 40,
          fontWeight: 600,
          marginTop: 36,
          color: PALETA.suave,
        }}
      >
        {encabezado}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 24,
          fontSize: 96,
          fontWeight: 800,
          letterSpacing: -2,
          textTransform: "uppercase",
        }}
      >
        {`${nombreDia(dia.fecha)} ${diaMes(dia.fecha)}`}
      </div>
      {dia.md && (
        <div style={{ display: "flex", marginTop: 12 }}>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              fontWeight: 800,
              padding: "6px 18px",
              borderRadius: 12,
              backgroundColor: PALETA.texto,
              color: PALETA.fondo,
            }}
          >
            {dia.md}
          </div>
        </div>
      )}

      {dia.libre ? (
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            fontSize: 120,
            fontWeight: 800,
            letterSpacing: 16,
            color: PALETA.suave,
          }}
        >
          LIBRE
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", marginTop: 56, gap: 34, flex: 1 }}>
          <div style={{ display: "flex", gap: 60 }}>
            {dia.citacion && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{ display: "flex", fontSize: 24, letterSpacing: 4, color: PALETA.acento }}
                >
                  CITACIÓN
                </div>
                <div style={{ display: "flex", fontSize: 72, fontWeight: 800 }}>{dia.citacion}</div>
              </div>
            )}
            {dia.lugar && (
              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <div
                  style={{ display: "flex", fontSize: 24, letterSpacing: 4, color: PALETA.acento }}
                >
                  LUGAR
                </div>
                <div style={{ display: "flex", fontSize: 40, fontWeight: 600, marginTop: 14 }}>
                  {dia.lugar}
                </div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", height: 2, backgroundColor: "rgba(183,202,219,0.25)" }} />
          {dia.items.map((i) => (
            <div key={i.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", gap: 28, alignItems: "baseline" }}>
                <div
                  style={{
                    display: "flex",
                    width: 250,
                    fontSize: 40,
                    fontWeight: 800,
                    color: PALETA.suave,
                  }}
                >
                  {i.hora ?? "—"}
                </div>
                <div style={{ display: "flex", flex: 1, fontSize: 44, fontWeight: 800 }}>
                  {i.titulo}
                </div>
              </div>
              {i.indicaciones && (
                <div
                  style={{
                    display: "flex",
                    marginLeft: 278,
                    fontSize: 28,
                    color: PALETA.suave,
                    lineHeight: 1.3,
                  }}
                >
                  {i.indicaciones}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          display: "flex",
          fontSize: 22,
          color: PALETA.acento,
          letterSpacing: 4,
          textTransform: "uppercase",
        }}
      >
        {firma}
      </div>
    </div>,
    { width: ANCHO_DIA, height: ALTO_DIA, fonts: await cargarFuentes() },
  );
}
