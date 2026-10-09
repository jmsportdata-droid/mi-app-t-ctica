"""
Programa de la Mac del analista: procesa los pedidos de Sofascore que se hacen
desde la app ("Actualizar desde Sofascore").

La web no puede pedirle datos a Sofascore, así que este programa corre en la Mac
(donde la skill informe-rival sí puede) y, cada pocos segundos:

1. avisa a la app que la Mac está conectada (estado_mac);
2. toma el próximo pedido pendiente;
3. corre la skill: datos y análisis de los últimos partidos del rival;
4. le pide a Claude Code (con la cuenta del analista) los insights del informe;
5. genera el PowerPoint y el PDF;
6. sube todo a la app: informe, PDF, plantel rival con estadísticas y la previa.

También procesa el plantel propio, el post partido (worker/post.py) y el
asistente del plan (worker/asistente.py).

Se corre con el Python de la skill (tiene curl_cffi):
    ~/.claude/skills/informe-rival/.venv/bin/python worker/sofascore.py
Para dejarlo siempre prendido: worker/instalar.sh
"""

from __future__ import annotations

import glob
import json
import os
import re
import subprocess
import sys
import time
import traceback
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path

VERSION = "1.3"
RAIZ = Path(__file__).resolve().parent.parent
SKILL = Path.home() / ".claude" / "skills" / "informe-rival"
SCRIPTS = SKILL / "scripts"
PY_SKILL = SKILL / ".venv" / "bin" / "python"
ESPERA = 15  # segundos entre vueltas

sys.path.insert(0, str(SCRIPTS))
import sofa  # noqa: E402  (cliente de Sofascore de la skill)


def log(*args):
    print(datetime.now().strftime("%H:%M:%S"), *args, flush=True)


# ---------- Configuración: .env.local del proyecto ----------------

def leer_env() -> dict[str, str]:
    env = {}
    for linea in (RAIZ / ".env.local").read_text().splitlines():
        if "=" in linea and not linea.lstrip().startswith("#"):
            k, v = linea.split("=", 1)
            env[k.strip()] = v.strip().strip("\"'")
    return env


ENV = leer_env()
URL = ENV["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
KEY = ENV["SUPABASE_SERVICE_ROLE_KEY"]  # solo en esta Mac: nunca sale de acá


# ---------- Supabase (REST y Storage) -----------------------------

def api(metodo: str, ruta: str, cuerpo=None, prefer: str | None = None, tipo="application/json"):
    datos = None
    if cuerpo is not None:
        datos = cuerpo if isinstance(cuerpo, (bytes, bytearray)) else json.dumps(cuerpo).encode()
    req = urllib.request.Request(URL + ruta, data=datos, method=metodo)
    req.add_header("apikey", KEY)
    req.add_header("Authorization", f"Bearer {KEY}")
    req.add_header("Content-Type", tipo)
    if prefer:
        req.add_header("Prefer", prefer)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            texto = r.read().decode() or "null"
            return json.loads(texto) if texto.strip().startswith(("[", "{")) else texto
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Supabase {e.code} en {ruta}: {e.read().decode()[:300]}") from None


def rest(metodo, tabla_query, cuerpo=None, prefer=None):
    return api(metodo, "/rest/v1/" + tabla_query, cuerpo, prefer)


def actualizar_pedido(pedido_id: str, estado: str, mensaje: str | None = None):
    rest("PATCH", f"pedidos_sofascore?id=eq.{pedido_id}", {"estado": estado, "mensaje": mensaje})


def senal():
    """Le avisa a la app que la Mac está conectada (una fila por cuerpo técnico)."""
    cuerpos = rest("GET", "cuerpos_tecnicos?select=id") or []
    if not cuerpos:
        return
    ahora = datetime.now(timezone.utc).isoformat()
    rest(
        "POST",
        "estado_mac?on_conflict=cuerpo_tecnico_id",
        [{"cuerpo_tecnico_id": c["id"], "ultima_senal": ahora, "version": VERSION} for c in cuerpos],
        prefer="resolution=merge-duplicates",
    )


# ---------- Skill: datos, insights y PDF --------------------------

def correr(args: list[str], timeout=900) -> str:
    r = subprocess.run(
        [str(PY_SKILL), str(SCRIPTS / "informe.py"), *args],
        capture_output=True, text=True, timeout=timeout, cwd=str(SCRIPTS),
    )
    if r.returncode != 0:
        raise RuntimeError((r.stderr or r.stdout)[-800:])
    return r.stdout


def claude_cli() -> str:
    """Claude Code de la extensión de VS Code (la versión más nueva instalada)."""
    candidatos = glob.glob(str(Path.home() / ".vscode/extensions/anthropic.claude-code-*/resources/native-binary/claude"))
    if not candidatos:
        raise RuntimeError("No encontré Claude Code en esta Mac (extensión de VS Code).")

    def version(p):
        m = re.search(r"claude-code-(\d+)\.(\d+)\.(\d+)", p)
        return tuple(int(x) for x in m.groups()) if m else (0, 0, 0)

    return max(candidatos, key=version)


def escribir_insights(carpeta: Path, propio: bool = False) -> dict:
    """Claude redacta textos.json a partir de resumen.md, con el formato de la skill."""
    formato = (SKILL / "references" / "textos.md").read_text()
    resumen = (carpeta / "resumen.md").read_text()
    objetivo = (
        "Es NUESTRO equipo: hacé una autoevaluación con el mismo JSON. 'fortalezas' = lo que hacemos bien; "
        "'debilidades' = lo que tenemos que corregir; 'pelota_quieta' = cómo estamos a balón parado; "
        "'recomendaciones' = qué trabajar en el microciclo; 'jugadores_a_vigilar' = nuestros jugadores "
        "más determinantes o en mejor momento.\n"
        if propio
        else "Con el resumen de datos del próximo rival, escribí el JSON de hipótesis y claves del partido.\n"
    )
    prompt = (
        "Sos el analista de un cuerpo técnico de fútbol uruguayo. " + objetivo +
        "Usá el formato y los criterios de abajo.\n"
        "Reglas: español rioplatense (voseo), frases cortas, cada afirmación con el dato que la sostiene "
        "entre paréntesis; no inventes nada que no esté en el resumen (nada de video); no menciones "
        "tarjetas. Respondé SOLO con el JSON, sin texto antes ni después.\n\n"
        f"=== FORMATO Y CRITERIOS ===\n{formato}\n\n=== RESUMEN DE DATOS ===\n{resumen}"
    )
    r = subprocess.run(
        [claude_cli(), "-p", prompt, "--output-format", "text"],
        capture_output=True, text=True, timeout=600, cwd=str(carpeta),
    )
    if r.returncode != 0:
        raise RuntimeError("Claude no pudo escribir los insights: " + (r.stderr or r.stdout)[-400:])
    texto = r.stdout.strip()
    texto = re.sub(r"^```(?:json)?\s*|\s*```$", "", texto)
    inicio, fin = texto.find("{"), texto.rfind("}")
    insights = json.loads(texto[inicio : fin + 1])
    (carpeta / "textos.json").write_text(json.dumps(insights, ensure_ascii=False, indent=1))
    return insights


# ---------- Armado de lo que se sube --------------------------------

ABP = {"corner", "set-piece", "free-kick", "throw-in-set-piece"}


def estadisticas_jugadores(datos: dict) -> dict[int, dict]:
    """Totales por jugador en los partidos con estadísticas (aéreos, duelos, ABP, xG…)."""
    tot: dict[int, dict] = {}
    for p in datos.get("partidos", []):
        # Los mismos partidos que usa la skill para las estadísticas (los completos)
        if p.get("estado") != "completo":
            continue
        for j in (p.get("nos") or {}).get("jugadores", []):
            s = j.get("stats") or {}
            if not s.get("minutesPlayed"):
                continue
            t = tot.setdefault(j["id"], {"partidos": 0, "minutos": 0, "aereos_ganados": 0, "aereos_perdidos": 0,
                                         "duelos_ganados": 0, "duelos_perdidos": 0, "despejes": 0, "goles": 0,
                                         "xg": 0.0, "xa": 0.0, "nota_suma": 0.0, "notas": 0, "tiros": 0,
                                         "cabezazos": 0, "tiros_abp": 0, "cabezazos_abp": 0, "goles_abp": 0})
            t["partidos"] += 1
            t["minutos"] += s.get("minutesPlayed", 0)
            t["aereos_ganados"] += s.get("aerialWon", 0)
            t["aereos_perdidos"] += s.get("aerialLost", 0)
            t["duelos_ganados"] += s.get("duelWon", 0)
            t["duelos_perdidos"] += s.get("duelLost", 0)
            t["despejes"] += s.get("totalClearance", 0)
            t["goles"] += s.get("goals", 0)
            t["xg"] += s.get("expectedGoals") or 0
            t["xa"] += s.get("expectedAssists") or 0
            if s.get("rating"):
                t["nota_suma"] += s["rating"]
                t["notas"] += 1
        for tiro in p.get("tiros", []):
            if not tiro.get("nos") or tiro.get("jugador_id") not in tot:
                continue
            t = tot[tiro["jugador_id"]]
            t["tiros"] += 1
            cabeza = tiro.get("cuerpo") == "head"
            t["cabezazos"] += int(cabeza)
            if tiro.get("situacion") in ABP:
                t["tiros_abp"] += 1
                t["cabezazos_abp"] += int(cabeza)
                t["goles_abp"] += int(tiro.get("tipo") == "goal")
    for t in tot.values():
        aereos = t["aereos_ganados"] + t["aereos_perdidos"]
        t["aereos_pct"] = round(100 * t["aereos_ganados"] / aereos) if aereos else None
        t["aereos_90"] = round(90 * t["aereos_ganados"] / t["minutos"], 2) if t["minutos"] else None
        t["nota"] = round(t["nota_suma"] / t["notas"], 2) if t["notas"] else None
        t["xg"], t["xa"] = round(t["xg"], 2), round(t["xa"], 2)
        del t["nota_suma"], t["notas"]
    return tot


POS = {"POR": "G", "DEF": "D", "MED": "M", "DEL": "F", "G": "G", "D": "D", "M": "M", "F": "F"}


def plantel_rival(analisis: dict, datos: dict, equipo_id: str) -> list[dict]:
    stats = estadisticas_jugadores(datos)
    filas = []
    for j in analisis.get("plantilla", []):
        dorsal = str(j.get("dorsal") or "").strip()
        filas.append({
            "equipo_id": equipo_id,
            "id_externo": str(j["id"]),
            "fuente": "sofascore",
            "nombre": j.get("nombre") or j.get("corto"),
            "corto": j.get("corto"),
            "dorsal": int(dorsal) if dorsal.isdigit() and int(dorsal) <= 99 else None,
            "posicion": POS.get(j.get("pos")),
            "altura_cm": j.get("altura") if j.get("altura") and 140 <= j["altura"] <= 220 else None,
            "pie": j.get("pie"),
            "nacionalidad": j.get("pais"),
            "estadisticas": {**stats.get(j["id"], {}), "pj": j.get("pj"), "titular": j.get("tit"),
                             "asistencias": j.get("asist"), "edad": j.get("edad")},
        })
    return filas


CLAVES_DATOS = ("equipo", "proximo", "base_estadisticas", "poco_fiables", "avisos", "contexto",
                "resumen_plantilla", "formaciones", "once", "cambios", "bloque", "equipo_stats", "carriles",
                "ppda", "dominio", "tramos", "rankings", "transiciones", "portero", "bajas", "pelota_parada", "n")


def datos_informe(analisis: dict) -> dict:
    """El análisis sin lo pesado (mapas de calor y la lista de cada tiro)."""
    d = {k: analisis.get(k) for k in CLAVES_DATOS if k in analisis}
    for k in ("tiros_favor", "tiros_contra"):
        if k in analisis:
            d[k] = {x: v for x, v in analisis[k].items() if x != "tiros"}
    return d


def texto_racha(analisis: dict) -> str | None:
    ctx = analisis.get("contexto") or {}
    partes = []
    for t in ctx.get("tablas") or []:
        fila = next((f for f in t.get("filas", []) if f.get("id") == analisis["equipo"]["id"]), None)
        if fila:
            partes.append(f"{fila['pos']}° en {t['nombre']} ({fila['pts']} pts en {fila['pj']} PJ)")
            break
    ultimos = []
    for p in (ctx.get("partidos") or [])[:5]:
        if not p.get("resultado"):
            continue
        lugar = " (v)" if p.get("condicion") == "Visitante" else ""
        ultimos.append(f"{p.get('r', '')} {p['resultado']} {p.get('rival', '')}{lugar}".strip())
    if ultimos:
        partes.append("Últimos: " + ", ".join(ultimos))
    return ". ".join(partes)[:300] or None


FORMACIONES_APP = {"4-3-3", "4-4-2", "4-2-3-1", "5-3-2", "3-4-3", "4-1-4-1", "3-5-2"}


def completar_previa(partido: dict, analisis: dict):
    """Completa la previa solo en los campos vacíos: lo cargado a mano no se pisa."""
    actual = (rest("GET", f"partido_previa?partido_id=eq.{partido['id']}&select=*") or [None])[0] or {}
    cambios = analisis.get("cambios") or {}
    usos = (analisis.get("once") or {}).get("uso_formaciones") or []
    bajas = (analisis.get("bajas") or {}).get("lista") or []
    nuevo = {
        "rival_racha": texto_racha(analisis),
        "rival_dt": (analisis.get("equipo") or {}).get("dt"),
        "rival_dt_tendencias": (
            f"Primer cambio, en promedio, al {cambios['primer_cambio_medio']:.0f}′; "
            f"{cambios.get('cambios_medios', 0):.1f} cambios por partido. "
            + ("Formaciones: " + ", ".join(f"1-{f} ({n})" for f, n in usos) + "." if usos else "")
        ) if cambios.get("primer_cambio_medio") else None,
        "rival_bajas": "; ".join(f"{b['jugador']} ({b['estado'].lower()}: {b['motivo']})" for b in bajas)[:1000] or None,
    }
    # Árbitro y estadio del partido, si ya están en Sofascore
    evento = (partido.get("ids_externos") or {}).get("sofascore")
    if evento:
        ev = (sofa.get(f"/event/{evento}") or {}).get("event", {})
        arbitro = ev.get("referee") or {}
        if arbitro.get("name"):
            nuevo["arbitro"] = arbitro["name"]
            if arbitro.get("games"):
                nuevo["arbitro_amarillas"] = round(arbitro.get("yellowCards", 0) / arbitro["games"], 1)
                nuevo["arbitro_rojas"] = round(arbitro.get("redCards", 0) / arbitro["games"], 2)
    faltan = {k: v for k, v in nuevo.items() if v is not None and actual.get(k) in (None, "")}
    if faltan:
        rest("POST", "partido_previa?on_conflict=partido_id", {"partido_id": partido["id"], **faltan},
             prefer="resolution=merge-duplicates")
    formacion = (analisis.get("once") or {}).get("formacion")
    if not partido.get("formacion_rival") and formacion in FORMACIONES_APP:
        rest("PATCH", f"partidos?id=eq.{partido['id']}", {"formacion_rival": formacion})
    return list(faltan)


# ---------- Un pedido ----------------------------------------------

def buscar_id_rival(equipo: dict) -> str:
    sofa_id = (equipo.get("ids_externos") or {}).get("sofascore")
    if sofa_id:
        return str(sofa_id)
    sys.path.insert(0, str(SCRIPTS))
    import extraer  # noqa: WPS433
    try:
        encontrado = extraer.buscar_equipo(equipo["nombre"], "Uruguay")
    except SystemExit:
        encontrado = None
    if not encontrado:
        raise RuntimeError(f"No encontré a {equipo['nombre']} en Sofascore.")
    sofa_id = str(encontrado["id"])
    ids = {**(equipo.get("ids_externos") or {}), "sofascore": sofa_id}
    rest("PATCH", f"equipos?id=eq.{equipo['id']}", {"ids_externos": ids})
    return sofa_id


def procesar(pedido: dict):
    partido = rest(
        "GET",
        f"partidos?id=eq.{pedido['partido_id']}&select=*,rival:equipos(*),temporada:temporadas(cuerpo_tecnico_id)",
    )[0]
    rival = partido["rival"]
    cuerpo = partido["temporada"]["cuerpo_tecnico_id"]
    rival_id = buscar_id_rival(rival)

    actualizar_pedido(pedido["id"], "procesando", f"Bajando los últimos partidos de {rival['nombre']}…")
    salida = correr(["datos", "--rival-id", rival_id])
    m = re.search(r"CARPETA=(.+)", salida)
    if not m:
        raise RuntimeError("La skill no devolvió la carpeta del informe.")
    carpeta = Path(m.group(1).strip())
    analisis = json.loads((carpeta / "analisis.json").read_text())
    datos = json.loads((carpeta / "datos.json").read_text())

    actualizar_pedido(pedido["id"], "procesando", "Claude está escribiendo los insights…")
    insights = escribir_insights(carpeta)

    actualizar_pedido(pedido["id"], "procesando", "Generando el PowerPoint y el PDF…")
    pdf_ruta = None
    try:
        correr(["pptx", str(carpeta), "--pdf"], timeout=600)
        pdfs = sorted(carpeta.glob("Informe_*.pdf"), key=lambda p: p.stat().st_mtime)
        if pdfs:
            pdf_ruta = f"{cuerpo}/{uuid.uuid4()}.pdf"
            api("POST", f"/storage/v1/object/informes/{pdf_ruta}", pdfs[-1].read_bytes(), tipo="application/pdf")
    except Exception as e:  # el PDF es un extra: sin él, el informe igual sube
        log("PDF no generado:", e)
        pdf_ruta = None

    actualizar_pedido(pedido["id"], "procesando", "Subiendo el informe a la app…")
    anterior = (rest("GET", f"informes_rival_datos?partido_id=eq.{partido['id']}&select=pdf_ruta") or [None])[0]
    rest("POST", "informes_rival_datos?on_conflict=partido_id", {
        "partido_id": partido["id"],
        "generado_en": datetime.now(timezone.utc).isoformat(),
        "datos": datos_informe(analisis),
        "insights": insights,
        "validaciones": {},
        "pdf_ruta": pdf_ruta,
        "avisos": analisis.get("avisos") or [],
    }, prefer="resolution=merge-duplicates")
    if anterior and anterior.get("pdf_ruta") and anterior["pdf_ruta"] != pdf_ruta:
        try:
            api("DELETE", "/storage/v1/object/informes", {"prefixes": [anterior["pdf_ruta"]]})
        except Exception as e:
            log("No se pudo borrar el PDF anterior:", e)

    jugadores = plantel_rival(analisis, datos, rival["id"])
    if jugadores:
        rest("POST", "jugadores_rivales?on_conflict=equipo_id,id_externo", jugadores,
             prefer="resolution=merge-duplicates")
    completados = completar_previa(partido, analisis)

    n = analisis.get("n") or len(analisis.get("base_estadisticas") or [])
    actualizar_pedido(
        pedido["id"], "listo",
        f"Informe de {rival['nombre']} con {n} partidos, {len(jugadores)} jugadores"
        + (f" y {len(completados)} datos de la previa" if completados else "") + ".",
    )
    log("Listo:", rival["nombre"])


PIE = {"left": "izquierdo", "right": "derecho", "both": "ambos", "izq": "izquierdo", "der": "derecho", "ambos": "ambos"}
LINEA = {"G": "POR", "D": "DEF", "M": "CEN", "F": "DEL"}


def normalizar(texto: str) -> list[str]:
    import unicodedata
    t = unicodedata.normalize("NFKD", (texto or "").lower()).encode("ascii", "ignore").decode()
    return [x for x in re.split(r"[^a-z]+", t) if x]


def vincular(app: list[dict], sofa_jugadores: list[dict]) -> dict[str, dict]:
    """Empareja jugadores de Sofascore con los del plantel (id de Sofascore, o nombre y dorsal)."""
    resultado: dict[str, dict] = {}
    usados: set[str] = set()
    por_id = {str((j.get("ids_externos") or {}).get("sofascore")): j for j in app if (j.get("ids_externos") or {}).get("sofascore")}
    pendientes = []
    for sj in sofa_jugadores:
        j = por_id.get(str(sj["id"]))
        if j:
            resultado[str(sj["id"])] = j
            usados.add(j["id"])
        else:
            pendientes.append(sj)
    candidatos = []
    for sj in pendientes:
        st = set(t for t in normalizar(sj.get("nombre")) if len(t) > 2)
        inicial = (normalizar(sj.get("nombre")) or [""])[0][:1]
        dorsal = str(sj.get("dorsal") or "").strip()
        for j in app:
            at = normalizar(j["nombre"])
            comunes = len(st & set(t for t in at if len(t) > 2))
            mismo_dorsal = dorsal.isdigit() and j.get("numero") == int(dorsal)
            misma_inicial = bool(at) and at[0][:1] == inicial
            if comunes >= 2 or (comunes >= 1 and (mismo_dorsal or misma_inicial)):
                candidatos.append((comunes * 2 + mismo_dorsal * 3 + misma_inicial, str(sj["id"]), j))
    for _, sid, j in sorted(candidatos, key=lambda c: -c[0]):
        if sid in resultado or j["id"] in usados:
            continue
        resultado[sid] = j
        usados.add(j["id"])
    return resultado


def procesar_propio(pedido: dict):
    temporada = rest("GET", f"temporadas?id=eq.{pedido['temporada_id']}&select=*")[0]
    sofa_id = (temporada.get("ids_externos") or {}).get("sofascore")
    if not sofa_id:
        raise RuntimeError("La temporada no tiene el id de Sofascore del club.")

    actualizar_pedido(pedido["id"], "procesando", f"Bajando los últimos partidos de {temporada['club']}…")
    salida = correr(["datos", "--rival-id", str(sofa_id)])
    m = re.search(r"CARPETA=(.+)", salida)
    if not m:
        raise RuntimeError("La skill no devolvió la carpeta del análisis.")
    carpeta = Path(m.group(1).strip())
    analisis = json.loads((carpeta / "analisis.json").read_text())
    datos = json.loads((carpeta / "datos.json").read_text())

    actualizar_pedido(pedido["id"], "procesando", "Claude está escribiendo la autoevaluación…")
    insights = escribir_insights(carpeta, propio=True)

    actualizar_pedido(pedido["id"], "procesando", "Vinculando jugadores con el plantel…")
    stats = estadisticas_jugadores(datos)
    crudos = {p["id"]: p for p in datos.get("plantilla", [])}
    plantilla = [{**crudos.get(p["id"], {}), **p} for p in analisis.get("plantilla", [])]
    app = rest("GET", f"jugadores?temporada_id=eq.{temporada['id']}&select=*") or []
    vinculos = vincular(app, plantilla)

    no_vinculados = []
    for sj in plantilla:
        e = {**stats.get(sj["id"], {}), "pj": sj.get("pj"), "titular": sj.get("tit"),
             "asistencias": sj.get("asist"), "edad": sj.get("edad")}
        pie = PIE.get(str(sj.get("pie") or "").strip().lower())
        j = vinculos.get(str(sj["id"]))
        if not j:
            dorsal = str(sj.get("dorsal") or "").strip()
            no_vinculados.append({
                "sofascore_id": str(sj["id"]), "nombre": sj.get("nombre"), "corto": sj.get("corto"),
                "dorsal": int(dorsal) if dorsal.isdigit() and int(dorsal) <= 99 else None,
                "linea": LINEA.get(POS.get(sj.get("pos"), ""), "CEN"),
                "altura_cm": sj.get("altura") if sj.get("altura") and 140 <= sj["altura"] <= 220 else None,
                "pie": pie, "nacionalidad": sj.get("pais"),
                "fecha_nac": datetime.fromtimestamp(sj["nac_ts"], timezone.utc).date().isoformat() if sj.get("nac_ts") else None,
                "minutos": e.get("minutos"), "estadisticas": e,
            })
            continue
        cambios = {
            "estadisticas_externas": e,
            "ids_externos": {**(j.get("ids_externos") or {}), "sofascore": str(sj["id"])},
        }
        if not j.get("altura_cm") and sj.get("altura") and 140 <= sj["altura"] <= 220:
            cambios["altura_cm"] = sj["altura"]
        if not j.get("pie_habil") and pie:
            cambios["pie_habil"] = pie
        if not j.get("nacionalidad") and sj.get("pais"):
            cambios["nacionalidad"] = sj["pais"]
        rest("PATCH", f"jugadores?id=eq.{j['id']}", cambios)

    rest("POST", "analisis_propio?on_conflict=temporada_id", {
        "temporada_id": temporada["id"],
        "generado_en": datetime.now(timezone.utc).isoformat(),
        "datos": datos_informe(analisis),
        "insights": insights,
        "no_vinculados": sorted(no_vinculados, key=lambda x: -(x.get("minutos") or 0)),
        "avisos": analisis.get("avisos") or [],
    }, prefer="resolution=merge-duplicates")

    n = analisis.get("n") or len(analisis.get("base_estadisticas") or [])
    actualizar_pedido(
        pedido["id"], "listo",
        f"{temporada['club']}: {n} partidos, {len(vinculos)} jugadores vinculados"
        + (f" y {len(no_vinculados)} que no están en el plantel" if no_vinculados else "") + ".",
    )
    log("Listo:", temporada["club"])


def vuelta():
    senal()
    pendientes = rest("GET", "pedidos_sofascore?estado=eq.pendiente&order=creado_en.asc&limit=1") or []
    for pedido in pendientes:
        log("Pedido", pedido["id"], pedido.get("tipo"))
        try:
            if pedido.get("tipo") == "plantel_propio":
                procesar_propio(pedido)
            elif pedido.get("tipo") == "plan_asistente":
                import asistente  # noqa: WPS433  (worker/asistente.py)
                asistente.procesar_asistente(pedido, sys.modules[__name__])
            elif pedido.get("tipo") == "post_partido":
                import post  # noqa: WPS433  (worker/post.py)
                post.procesar_post(pedido, sys.modules[__name__])
            else:
                procesar(pedido)
        except Exception as e:
            log("Error:", e)
            traceback.print_exc()
            actualizar_pedido(pedido["id"], "error", str(e)[:1500])


def main():
    log(f"Programa de Sofascore {VERSION}: esperando pedidos de la app…")
    # Si se cortó a mitad de un pedido, se vuelve a encolar
    rest("PATCH", "pedidos_sofascore?estado=eq.procesando", {"estado": "pendiente", "mensaje": "Reintentando…"})
    una_vez = "--una-vez" in sys.argv
    while True:
        try:
            vuelta()
        except Exception as e:
            log("Error de conexión:", e)
        if una_vez:
            break
        time.sleep(ESPERA)


if __name__ == "__main__":
    main()
