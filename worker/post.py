"""
Post partido desde Sofascore (lo llama worker/sofascore.py con el pedido).

Baja del partido ya jugado: estadísticas de los dos equipos, alineaciones con
las estadísticas de cada jugador (incluidos los datos físicos), incidencias
(goles, tarjetas, cambios) y el mapa de tiros. Lo traduce a los nombres de la
app (los mismos que va a usar Wyscout), vincula a los jugadores con el plantel
y le pide a Claude Code un borrador de conclusiones.

Para probar la traducción sin subir nada:
    ~/.claude/skills/informe-rival/.venv/bin/python worker/post.py --probar EVENTO CLUB
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

SCRIPTS = Path.home() / ".claude" / "skills" / "informe-rival" / "scripts"
sys.path.insert(0, str(SCRIPTS))
import sofa  # noqa: E402

FUENTE = "sofascore"
ABP = {"corner", "set-piece", "free-kick", "throw-in-set-piece"}

# Estadística de equipo de Sofascore → nombre de la app. Las que traen total
# (12/27) guardan también "<nombre>_total".
EQUIPO = {
    "ballPossession": "posesion",
    "expectedGoals": "xg",
    "bigChanceCreated": "grandes_chances",
    "totalShotsOnGoal": "tiros",
    "shotsOnGoal": "tiros_arco",
    "totalShotsInsideBox": "tiros_area",
    "totalShotsOutsideBox": "tiros_fuera_area",
    "blockedScoringAttempt": "tiros_bloqueados",
    "hitWoodwork": "palos",
    "touchesInOppBox": "toques_area",
    "accurateThroughBall": "pases_filtrados",
    "offsides": "fueras_de_juego",
    "passes": "pases",
    "accuratePasses": "pases_precisos",
    "finalThirdPhaseStatistic": "ultimo_tercio",
    "accurateLongBalls": "largos",
    "accurateCross": "centros",
    "throwIns": "laterales",
    "cornerKicks": "corners",
    "freeKicks": "tiros_libres",
    "duelWonPercent": "duelos_pct",
    "groundDuelsPercentage": "duelos_suelo",
    "aerialDuelsPercentage": "aereos",
    "dribblesPercentage": "regates",
    "dispossessed": "desposesiones",
    "totalTackle": "entradas",
    "interceptionWon": "intercepciones",
    "totalClearance": "despejes",
    "ballRecovery": "recuperaciones",
    "errorsLeadToShot": "errores_tiro",
    "goalkeeperSaves": "atajadas",
    "goalKicks": "saques_arco",
    "fouls": "faltas",
    "yellowCards": "amarillas",
    "redCards": "rojas",
    "kilometersCovered": "km",
    "numberOfSprints": "sprints",
    "avgRating": "nota_media",
}

# Estadística de jugador de Sofascore → nombre de la app
JUGADOR = {
    "expectedGoals": "xg",
    "expectedAssists": "xa",
    "totalShots": "tiros",
    "onTargetScoringAttempt": "tiros_arco",
    "bigChanceCreated": "grandes_chances_creadas",
    "bigChanceMissed": "grandes_chances_falladas",
    "keyPass": "pases_clave",
    "totalPass": "pases",
    "accuratePass": "pases_precisos",
    "totalLongBalls": "largos",
    "accurateLongBalls": "largos_precisos",
    "totalCross": "centros",
    "accurateCross": "centros_precisos",
    "totalContest": "regates",
    "wonContest": "regates_ok",
    "touches": "toques",
    "duelWon": "duelos_ganados",
    "duelLost": "duelos_perdidos",
    "aerialWon": "aereos_ganados",
    "aerialLost": "aereos_perdidos",
    "totalTackle": "entradas",
    "wonTackle": "entradas_ganadas",
    "interceptionWon": "intercepciones",
    "totalClearance": "despejes",
    "outfielderBlock": "bloqueos",
    "ballRecovery": "recuperaciones",
    "possessionLostCtrl": "perdidas",
    "dispossessed": "desposesiones",
    "fouls": "faltas",
    "wasFouled": "faltas_recibidas",
    "totalOffside": "fueras_de_juego",
    "errorLeadToAShot": "errores_tiro",
    "saves": "atajadas",
    "kilometersCovered": "km",
    "metersCoveredHighSpeedRunningKm": "km_alta",
    "metersCoveredSprintingKm": "km_sprint",
    "numberOfSprints": "sprints",
    "topSpeed": "vel_max",
}


def num(v):
    return v if isinstance(v, (int, float)) and not isinstance(v, bool) else None


# ---------- Traducción ----------------------------------------------

def estadisticas_equipos(estadisticas: dict, local: bool) -> tuple[dict, dict]:
    propio, rival = {}, {}
    periodo = next((p for p in estadisticas.get("statistics", []) if p.get("period") == "ALL"), None)
    for grupo in (periodo or {}).get("groups", []):
        for it in grupo.get("statisticsItems", []):
            clave = EQUIPO.get(it.get("key"))
            if not clave or clave in propio:
                continue
            casa, fuera = num(it.get("homeValue")), num(it.get("awayValue"))
            nos, ellos = (casa, fuera) if local else (fuera, casa)
            if nos is not None:
                propio[clave] = nos
            if ellos is not None:
                rival[clave] = ellos
            if "homeTotal" in it:
                ct, ft = num(it.get("homeTotal")), num(it.get("awayTotal"))
                propio[clave + "_total"], rival[clave + "_total"] = (ct, ft) if local else (ft, ct)
    return propio, rival


def jugadores_lado(lineups: dict, lado: str) -> list[dict]:
    filas = []
    for p in (lineups.get(lado) or {}).get("players", []):
        st = p.get("statistics") or {}
        j = p.get("player") or {}
        stats = {k: num(st.get(o)) for o, k in JUGADOR.items() if num(st.get(o)) is not None}
        valor = (j.get("proposedMarketValueRaw") or {}).get("value")
        if valor:
            stats["valor_mercado_eur"] = valor
        filas.append({
            "id": j.get("id"),
            "nombre": j.get("name"),
            "corto": j.get("shortName"),
            "dorsal": p.get("shirtNumber") or j.get("jerseyNumber"),
            "posicion": p.get("position") or j.get("position"),
            "titular": not p.get("substitute"),
            "minutos": int(st.get("minutesPlayed") or 0),
            "nota": num(st.get("rating")),
            "goles": int(st.get("goals") or 0),
            "asistencias": int(st.get("goalAssist") or 0),
            "stats": stats,
        })
    return filas


def incidencias(incs: dict, local: bool) -> list[dict]:
    salida = []
    for i in incs.get("incidents", []):
        tipo = i.get("incidentType")
        propio = bool(i.get("isHome")) == local
        minuto = i.get("time")
        extra = i.get("addedTime") if i.get("addedTime") not in (None, 999) else None
        nombre = lambda k: (i.get(k) or {}).get("shortName") or (i.get(k) or {}).get("name")  # noqa: E731
        if tipo == "goal":
            salida.append({"tipo": "gol", "minuto": minuto, "extra": extra, "propio": propio,
                           "jugador": nombre("player"), "jugador_id": (i.get("player") or {}).get("id"),
                           "asistencia": nombre("assist1"), "clase": i.get("incidentClass")})
        elif tipo == "card":
            salida.append({"tipo": "tarjeta", "minuto": minuto, "extra": extra, "propio": propio,
                           "jugador": nombre("player"), "jugador_id": (i.get("player") or {}).get("id"),
                           "color": i.get("incidentClass"), "motivo": i.get("reason")})
        elif tipo == "substitution":
            salida.append({"tipo": "cambio", "minuto": minuto, "extra": extra, "propio": propio,
                           "entra": nombre("playerIn"), "sale": nombre("playerOut"),
                           "lesion": bool(i.get("injury"))})
    return sorted(salida, key=lambda x: ((x["minuto"] or 0), (x["extra"] or 0)))


def tiros(shotmap: dict, local: bool) -> list[dict]:
    salida = []
    for t in shotmap.get("shotmap", []):
        coord = t.get("playerCoordinates") or {}
        salida.append({
            "minuto": t.get("time"), "extra": t.get("addedTime"),
            "propio": bool(t.get("isHome")) == local,
            "xg": num(t.get("xg")) or 0,
            "situacion": t.get("situation"),
            "abp": t.get("situation") in ABP,
            "cuerpo": t.get("bodyPart"),
            "resultado": t.get("shotType"),
            "jugador": (t.get("player") or {}).get("shortName"),
            "x": coord.get("x"), "y": coord.get("y"),
        })
    return sorted(salida, key=lambda x: ((x["minuto"] or 0), (x["extra"] or 0)))


def completar_equipo(equipo: dict, jugadores: list[dict], tiros_lado: list[dict]):
    """Lo que Sofascore no siempre da por equipo sale de sumar a los jugadores y los tiros."""
    for clave in ("recuperaciones", "perdidas", "km", "sprints", "duelos_ganados", "aereos_ganados", "pases_clave"):
        if clave not in equipo:
            valores = [j["stats"].get(clave) for j in jugadores if j["stats"].get(clave) is not None]
            if valores:
                equipo[clave] = round(sum(valores), 2)
    equipo["tiros_abp"] = sum(1 for t in tiros_lado if t["abp"])
    equipo["xg_abp"] = round(sum(t["xg"] for t in tiros_lado if t["abp"]), 2)
    equipo["goles_abp"] = sum(1 for t in tiros_lado if t["abp"] and t["resultado"] == "goal")


def datos_partido(evento: str, club_sofa: str) -> dict:
    ev = (sofa.get(f"/event/{evento}") or {}).get("event") or {}
    estado = (ev.get("status") or {}).get("type")
    if estado != "finished":
        descripcion = (ev.get("status") or {}).get("description") or estado or "sin datos"
        raise RuntimeError(f"El partido todavía no terminó en Sofascore ({descripcion}). Probá más tarde.")
    local = str((ev.get("homeTeam") or {}).get("id")) == str(club_sofa)
    if not local and str((ev.get("awayTeam") or {}).get("id")) != str(club_sofa):
        raise RuntimeError("Ese partido de Sofascore no es de nuestro equipo.")
    lado, lado_rival = ("home", "away") if local else ("away", "home")
    lineups = sofa.get(f"/event/{evento}/lineups") or {}
    propio, rival = estadisticas_equipos(sofa.get(f"/event/{evento}/statistics") or {}, local)
    lista_tiros = tiros(sofa.get(f"/event/{evento}/shotmap") or {}, local)
    nuestros = jugadores_lado(lineups, lado)
    suyos = jugadores_lado(lineups, lado_rival)
    completar_equipo(propio, nuestros, [t for t in lista_tiros if t["propio"]])
    completar_equipo(rival, suyos, [t for t in lista_tiros if not t["propio"]])
    goles = lambda s: (ev.get(s + "Score") or {})  # noqa: E731
    gf, gc = (goles("home"), goles("away")) if local else (goles("away"), goles("home"))
    avisos = []
    if not propio:
        avisos.append("Sofascore no tiene estadísticas de equipo de este partido.")
    if not lineups.get("confirmed", True):
        avisos.append("Las alineaciones de Sofascore no están confirmadas.")
    return {
        "local": local,
        "goles": (gf.get("normaltime", gf.get("current")), gc.get("normaltime", gc.get("current"))),
        "penales": (gf.get("penalties"), gc.get("penalties")),
        "formaciones": ((lineups.get(lado) or {}).get("formation"), (lineups.get(lado_rival) or {}).get("formation")),
        "propio": propio,
        "rival": rival,
        "jugadores": nuestros,
        "jugadores_rival": suyos,
        "tiros": lista_tiros,
        "incidencias": incidencias(sofa.get(f"/event/{evento}/incidents") or {}, local),
        "avisos": avisos,
    }


# ---------- Claude: borrador de conclusiones -------------------------

FILAS_RESUMEN = [
    ("Posesión %", "posesion"), ("xG", "xg"), ("Tiros", "tiros"), ("Tiros al arco", "tiros_arco"),
    ("Grandes chances", "grandes_chances"), ("Toques en el área rival", "toques_area"),
    ("Último tercio (completadas)", "ultimo_tercio"), ("Pases", "pases"), ("Pases precisos", "pases_precisos"),
    ("Centros precisos", "centros"), ("Córners", "corners"), ("Duelos ganados %", "duelos_pct"),
    ("Aéreos ganados", "aereos"), ("Recuperaciones", "recuperaciones"), ("Pérdidas", "perdidas"),
    ("Entradas", "entradas"), ("Intercepciones", "intercepciones"), ("Errores que terminan en tiro", "errores_tiro"),
    ("Tiros de ABP", "tiros_abp"), ("xG de ABP", "xg_abp"), ("Km recorridos", "km"), ("Sprints", "sprints"),
]

PLAN = [("objetivo", "Objetivo"), ("ofensiva_ct", "Organización ofensiva"), ("defensiva_ct", "Organización defensiva"),
        ("tda_ct", "Transición defensa-ataque"), ("tad_ct", "Transición ataque-defensa"), ("abp_ct", "Pelota parada")]

FASES = {"inicio": "Inicios", "organizacion": "Organización", "finalizacion": "Finalización",
         "bloque_alto": "Bloque alto", "bloque_medio": "Bloque medio", "bloque_bajo": "Bloque bajo",
         "transicion_ofensiva": "Transición ofensiva", "transicion_defensiva": "Transición defensiva"}


def resumen_para_claude(club: str, rival_nombre: str, d: dict, plan: dict | None, video: list[dict],
                        previos: list[dict]) -> str:
    gf, gc = d["goles"]
    lineas = [f"# {club} {gf}-{gc} {rival_nombre}",
              f"Formaciones: nosotros {d['formaciones'][0] or '?'}, rival {d['formaciones'][1] or '?'}.", "",
              "## Estadísticas (nosotros | rival | nuestro promedio de los partidos anteriores)"]
    for label, k in FILAS_RESUMEN:
        nos, ellos = d["propio"].get(k), d["rival"].get(k)
        if nos is None and ellos is None:
            continue
        vals = [p["propio"].get(k) for p in previos if p["propio"].get(k) is not None]
        prom = f"{sum(vals) / len(vals):.1f}" if vals else "—"
        tot = d["propio"].get(k + "_total")
        lineas.append(f"- {label}: {nos}{f'/{tot}' if tot else ''} | {ellos} | {prom}")
    lineas += ["", "## xG por tramos de 15′ (nosotros-rival)"]
    for i in range(6):
        desde, hasta = i * 15, (i + 1) * 15
        en = [t for t in d["tiros"] if desde < (t["minuto"] or 0) <= hasta or (i == 5 and (t["minuto"] or 0) > 90)]
        nos = sum(t["xg"] for t in en if t["propio"])
        ellos = sum(t["xg"] for t in en if not t["propio"])
        lineas.append(f"- {desde}-{hasta}′: {nos:.2f} - {ellos:.2f}")
    lineas += ["", "## Incidencias"]
    for i in d["incidencias"]:
        quien = "Nosotros" if i["propio"] else "Rival"
        if i["tipo"] == "gol":
            lineas.append(f"- {i['minuto']}′ gol {quien}: {i['jugador']} ({i['clase']})")
        elif i["tipo"] == "tarjeta":
            lineas.append(f"- {i['minuto']}′ tarjeta {i['color']} {quien}: {i['jugador']}")
        else:
            lineas.append(f"- {i['minuto']}′ cambio {quien}: entra {i['entra']} por {i['sale']}")
    lineas += ["", "## Nuestros jugadores (min, nota, G, A, xG, duelos ganados, recuperaciones, pérdidas)"]
    for j in sorted(d["jugadores"], key=lambda x: -(x["nota"] or 0)):
        if not j["minutos"]:
            continue
        s = j["stats"]
        lineas.append(f"- {j['nombre']} ({j['posicion']}): {j['minutos']}′, {j['nota']}, {j['goles']}G {j['asistencias']}A, "
                      f"xG {s.get('xg', 0)}, duelos {s.get('duelos_ganados', 0)}, rec {s.get('recuperaciones', 0)}, "
                      f"pérdidas {s.get('perdidas', 0)}")
    if plan:
        lineas += ["", "## Plan de partido del cuerpo técnico"]
        for i, c in enumerate(plan.get("claves") or [], 1):
            lineas.append(f"- Clave {i} (clave_{i}): {c}")
        for k, label in PLAN:
            if plan.get(k):
                lineas.append(f"- {label} ({k.replace('_ct', '')}): {plan[k][:600]}")
    if video:
        lineas += ["", "## Análisis de video del cuerpo técnico (nuestro equipo)"]
        for a in video:
            lineas.append(f"- {FASES.get(a['fase'], a['fase'])} [{a.get('valoracion') or 'sin valorar'}]: {a['texto']}")
    return "\n".join(lineas)


FORMATO = """{
 "resumen": "2 o 3 frases: qué partido fue y por qué salió el resultado",
 "positivos": ["3 a 5 cosas que hicimos bien, cada una con su dato"],
 "a_mejorar": ["3 a 5 cosas a corregir, cada una con su dato"],
 "plan_vs_real": [{"clave": "objetivo | clave_1 | clave_2 | clave_3 | ofensiva | defensiva | tda | tad | abp",
                   "cumplimiento": "si | parcial | no", "evidencia": "el dato que lo sostiene"}],
 "destacados": [{"jugador": "nombre", "motivo": "por qué, con su dato"}],
 "para_la_semana": ["2 a 4 contenidos para trabajar en el microciclo"]
}"""


def conclusiones_claude(h, carpeta: Path, resumen: str) -> dict:
    prompt = (
        "Sos el analista de un cuerpo técnico de fútbol uruguayo y escribís el post partido de NUESTRO equipo. "
        "Con los datos de abajo, devolvé SOLO este JSON (sin texto antes ni después):\n" + FORMATO + "\n"
        "Reglas: español rioplatense (voseo), frases cortas, cada afirmación con el dato entre paréntesis; "
        "no inventes nada que no esté en los datos; plan_vs_real solo para las claves que aparecen en el plan "
        "(si no hay plan, lista vacía); si hay análisis de video, usalo y priorizalo sobre los números.\n\n"
        "=== DATOS ===\n" + resumen
    )
    r = subprocess.run([h.claude_cli(), "-p", prompt, "--output-format", "text"],
                       capture_output=True, text=True, timeout=600, cwd=str(carpeta))
    if r.returncode != 0:
        raise RuntimeError((r.stderr or r.stdout)[-400:])
    texto = re.sub(r"^```(?:json)?\s*|\s*```$", "", r.stdout.strip())
    return json.loads(texto[texto.find("{"): texto.rfind("}") + 1])


# ---------- El pedido -------------------------------------------------

def buscar_evento(h, partido: dict, club_sofa: str) -> str:
    """El id del partido en Sofascore: el guardado, o el del día contra ese rival."""
    guardado = (partido.get("ids_externos") or {}).get("sofascore")
    if guardado:
        return str(guardado)
    rival_sofa = h.buscar_id_rival(partido["rival"])
    for pagina in (0, 1):
        for ev in (sofa.get(f"/team/{club_sofa}/events/last/{pagina}") or {}).get("events", []):
            fecha = datetime.fromtimestamp(ev["startTimestamp"], timezone.utc).date().isoformat()
            ids = {str(ev["homeTeam"]["id"]), str(ev["awayTeam"]["id"])}
            if rival_sofa in ids and abs((datetime.fromisoformat(fecha) - datetime.fromisoformat(partido["fecha"])).days) <= 1:
                evento = str(ev["id"])
                h.rest("PATCH", f"partidos?id=eq.{partido['id']}",
                       {"ids_externos": {**(partido.get("ids_externos") or {}), "sofascore": evento}})
                return evento
    raise RuntimeError("No encontré el partido en Sofascore (fecha o rival distintos).")


def procesar_post(pedido: dict, h):
    partido = h.rest(
        "GET",
        f"partidos?id=eq.{pedido['partido_id']}&select=*,rival:equipos(*),temporada:temporadas(id,club,ids_externos)",
    )[0]
    temporada = partido["temporada"]
    club_sofa = (temporada.get("ids_externos") or {}).get("sofascore")
    if not club_sofa:
        raise RuntimeError("La temporada no tiene el id de Sofascore del club.")
    evento = buscar_evento(h, partido, str(club_sofa))

    h.actualizar_pedido(pedido["id"], "procesando", "Bajando las estadísticas del partido…")
    d = datos_partido(evento, str(club_sofa))

    h.actualizar_pedido(pedido["id"], "procesando", "Vinculando a nuestros jugadores…")
    app = h.rest("GET", f"jugadores?temporada_id=eq.{temporada['id']}&select=*") or []
    vinculos = h.vincular(app, [{"id": j["id"], "nombre": j["nombre"], "dorsal": j["dorsal"]} for j in d["jugadores"]])
    tarjetas: dict[str, dict] = {}
    for i in d["incidencias"]:
        if i["tipo"] == "tarjeta" and i["propio"] and i.get("jugador_id"):
            t = tarjetas.setdefault(str(i["jugador_id"]), {"amarillas": 0, "rojas": 0})
            if i["color"] == "yellow":
                t["amarillas"] = min(2, t["amarillas"] + 1)
            elif i["color"] == "yellowRed":
                t["amarillas"], t["rojas"] = 2, 1
            elif i["color"] == "red":
                t["rojas"] = 1
    filas, sin_vincular = [], []
    for j in d["jugadores"]:
        if not j["minutos"]:
            continue
        a = vinculos.get(str(j["id"]))
        if not a:
            sin_vincular.append(j["nombre"])
            continue
        t = tarjetas.get(str(j["id"]), {"amarillas": 0, "rojas": 0})
        filas.append({
            "partido_id": partido["id"], "jugador_id": a["id"], "fuente": FUENTE,
            "titular": j["titular"], "minutos": min(150, j["minutos"]),
            "nota": round(j["nota"], 1) if j["nota"] is not None else None,
            "goles": j["goles"], "asistencias": j["asistencias"], **t, "stats": j["stats"],
        })
        if not (a.get("ids_externos") or {}).get("sofascore"):
            h.rest("PATCH", f"jugadores?id=eq.{a['id']}",
                   {"ids_externos": {**(a.get("ids_externos") or {}), "sofascore": str(j["id"])}})
    avisos = list(d["avisos"])
    if sin_vincular:
        avisos.append("Jugaron y no están en el plantel: " + ", ".join(sin_vincular) + ".")

    # Partidos anteriores de la temporada (para el promedio de Claude)
    previos = [
        p for p in (h.rest(
            "GET",
            f"estadisticas_partido?select=propio,partido:partidos!inner(fecha,temporada_id)"
            f"&partido.temporada_id=eq.{temporada['id']}&partido.fecha=lt.{partido['fecha']}",
        ) or [])
    ]
    previos = sorted(previos, key=lambda p: p["partido"]["fecha"], reverse=True)[:5]
    plan = (h.rest("GET", f"planes_partido?partido_id=eq.{partido['id']}&select=*") or [None])[0]
    video = h.rest("GET", f"analisis_rival?partido_id=eq.{partido['id']}&equipo=eq.propio&select=fase,texto,valoracion&order=orden") or []

    h.actualizar_pedido(pedido["id"], "procesando", "Claude está escribiendo el borrador de conclusiones…")
    insights = {}
    try:
        carpeta = Path.home() / "Library" / "Caches" / "gestion-total"
        carpeta.mkdir(parents=True, exist_ok=True)
        resumen = resumen_para_claude(temporada["club"], partido["rival"]["nombre"], d, plan, video, previos)
        insights = conclusiones_claude(h, carpeta, resumen)
    except Exception as e:  # sin borrador, el post partido igual sube
        h.log("Sin conclusiones de Claude:", e)
        avisos.append("Claude no pudo escribir el borrador de conclusiones.")

    h.actualizar_pedido(pedido["id"], "procesando", "Subiendo el post partido a la app…")
    h.rest("POST", "estadisticas_partido?on_conflict=partido_id", {
        "partido_id": partido["id"], "fuente": FUENTE, "id_evento": evento,
        "generado_en": datetime.now(timezone.utc).isoformat(),
        "formacion_propia": d["formaciones"][0], "formacion_rival": d["formaciones"][1],
        "propio": d["propio"], "rival": d["rival"], "tiros": d["tiros"], "incidencias": d["incidencias"],
        "insights": insights, "avisos": avisos,
    }, prefer="resolution=merge-duplicates")
    h.rest("DELETE", f"estadisticas_jugador_partido?partido_id=eq.{partido['id']}&fuente=eq.{FUENTE}")
    if filas:
        h.rest("POST", "estadisticas_jugador_partido", filas)
    gf, gc = d["goles"]
    if partido.get("goles_favor") is None and gf is not None and gc is not None:
        pf, pc = d["penales"]
        h.rest("PATCH", f"partidos?id=eq.{partido['id']}", {
            "goles_favor": gf, "goles_contra": gc, "estado": "jugado",
            **({"penales_favor": pf, "penales_contra": pc} if pf is not None and pc is not None else {}),
        })
    h.actualizar_pedido(
        pedido["id"], "listo",
        f"Post partido {gf}-{gc}: {len(filas)} jugadores con estadísticas"
        + (f" ({len(sin_vincular)} sin vincular)" if sin_vincular else "") + ".",
    )
    h.log("Listo: post partido", partido["id"])


if __name__ == "__main__" and len(sys.argv) == 4 and sys.argv[1] == "--probar":
    d = datos_partido(sys.argv[2], sys.argv[3])
    print(json.dumps({k: v for k, v in d.items() if k not in ("jugadores_rival",)}, ensure_ascii=False, indent=1)[:6000])
    print(resumen_para_claude("Club", "Rival", d, None, [], [])[:3000])
