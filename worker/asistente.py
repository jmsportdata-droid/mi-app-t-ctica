"""
Asistente de Claude para el plan de partido (lo llama worker/sofascore.py).

Junta lo que la app sabe del partido —informe del rival (con lo que validó el
cuerpo técnico), análisis de video, previa, nuestros últimos post partidos, la
autoevaluación y el plan que ya esté escrito— y le pide a Claude Code (con la
cuenta del analista, sin costo de API) los puntos clave con su evidencia y un
borrador de cada sección del plan.
"""

from __future__ import annotations

import json
import re
import subprocess
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Largo máximo de cada campo del plan (los mismos límites que la base)
LARGOS = {
    "objetivo": 300, "contexto": 3000, "choque": 3000,
    "ofensiva_ct": 3000, "ofensiva_plantel": 300, "defensiva_ct": 3000, "defensiva_plantel": 300,
    "tda_ct": 3000, "tda_plantel": 300, "tad_ct": 3000, "tad_plantel": 300,
    "abp_ct": 3000, "abp_plantel": 300, "gestion": 2000,
}
TIPOS = {"oportunidad", "amenaza", "ajuste"}
MOMENTOS = {"ofensiva", "defensiva", "tda", "tad", "abp", "general"}
FUENTES = {"informe", "video", "previa", "historial", "plantel"}

FASES = {"inicio": "Inicios", "organizacion": "Organización", "finalizacion": "Finalización",
         "bloque_alto": "Bloque alto", "bloque_medio": "Bloque medio", "bloque_bajo": "Bloque bajo",
         "transicion_ofensiva": "Transición ofensiva", "transicion_defensiva": "Transición defensiva"}
MOMENTO_PRINCIPIO = {"organizacion_ofensiva": "Con pelota", "organizacion_defensiva": "Sin pelota",
                     "transicion_defensa_ataque": "Al recuperar", "transicion_ataque_defensa": "Al perder",
                     "abp": "Pelota parada"}
KPIS = [("xg", "xG"), ("tiros", "tiros"), ("posesion", "posesión %"), ("toques_area", "toques en el área"),
        ("recuperaciones", "recuperaciones"), ("perdidas", "pérdidas"), ("xg_abp", "xG de ABP")]
CLAVES_INFORME = ("equipo", "contexto", "formaciones", "once", "bloque", "equipo_stats", "carriles", "ppda",
                  "dominio", "tramos", "transiciones", "portero", "bajas", "pelota_parada", "cambios")


def compacto(x, limite: int) -> str:
    texto = json.dumps(x, ensure_ascii=False, separators=(",", ":"))
    return texto if len(texto) <= limite else texto[:limite] + "…"


def juntar(h, partido: dict) -> tuple[str, dict]:
    """El material para Claude en markdown, y qué fuentes había."""
    pid = partido["id"]
    temporada = partido["temporada"]
    uno = lambda tabla, q="": (h.rest("GET", f"{tabla}?partido_id=eq.{pid}&select=*{q}") or [None])[0]  # noqa: E731
    informe = uno("informes_rival_datos")
    previa = uno("partido_previa")
    plan = uno("planes_partido")
    alineacion = uno("alineacion_partido")
    video = h.rest("GET", f"analisis_rival?partido_id=eq.{pid}&equipo=eq.rival&select=fase,texto,valoracion&order=orden") or []
    propio = (h.rest("GET", f"analisis_propio?temporada_id=eq.{temporada['id']}&select=insights") or [None])[0]
    jugadores = h.rest("GET", f"jugadores?temporada_id=eq.{temporada['id']}&select=id,nombre,numero,posicion,estadisticas_externas") or []
    rivales = h.rest("GET", f"jugadores_rivales?equipo_id=eq.{partido['rival']['id']}&select=nombre,corto,dorsal,posicion,altura_cm,pie,estadisticas") or []
    principios = h.rest("GET", f"principios_juego?cuerpo_tecnico_id=eq.{temporada['cuerpo_tecnico_id']}&padre_id=is.null&oculto=eq.false&select=momento,nombre&order=orden") or []
    previos = h.rest(
        "GET",
        "estadisticas_partido?select=partido_id,propio,rival,insights,partido:partidos!inner(fecha,temporada_id,goles_favor,goles_contra,rival:equipos(nombre))"
        f"&partido.temporada_id=eq.{temporada['id']}&partido.fecha=lt.{partido['fecha']}",
    ) or []
    previos = sorted(previos, key=lambda p: p["partido"]["fecha"], reverse=True)[:5]
    evaluaciones = {}
    if previos:
        ids = ",".join(p["partido_id"] for p in previos)
        for f in h.rest("GET", f"post_partido?partido_id=in.({ids})&select=*") or []:
            evaluaciones[f["partido_id"]] = f

    rival = partido["rival"]["nombre"]
    lugar = "local" if partido.get("es_local") else "visitante"
    L = [f"# {temporada['club']} vs {rival} ({lugar}), {partido['fecha']}, {partido.get('competicion') or ''}"]
    por_id = {j["id"]: j for j in jugadores}
    if alineacion and any(alineacion.get("titulares") or []):
        once = [por_id[i]["nombre"] for i in alineacion["titulares"] if i in por_id]
        L.append(f"Nuestro once ({alineacion.get('formacion') or '?'}): {', '.join(once)}")
    if partido.get("formacion_rival"):
        L.append(f"Formación esperada del rival: {partido['formacion_rival']}")

    if informe:
        val = informe.get("validaciones") or {}
        L += ["", "## Informe estadístico del rival (Sofascore, últimos partidos)",
              compacto({k: informe["datos"].get(k) for k in CLAVES_INFORME if k in informe["datos"]}, 9000),
              "", "## Hipótesis del informe (estado según el cuerpo técnico)"]
        for grupo, lista in ((informe.get("insights") or {}).get("claves") or {}).items():
            for i, t in enumerate(lista):
                estado = val.get(f"{grupo}.{i}", "sin validar")
                if estado != "descartado":
                    L.append(f"- [{grupo}, {estado}] {t}")
    if rivales:
        L += ["", "## Jugadores del rival con más minutos (altura, pie, minutos, goles, xG, aéreos ganados)"]
        for r in sorted(rivales, key=lambda r: -((r.get("estadisticas") or {}).get("minutos") or 0))[:14]:
            e = r.get("estadisticas") or {}
            L.append(f"- {r.get('dorsal') or '?'} {r.get('corto') or r['nombre']} ({r.get('posicion')}): "
                     f"{r.get('altura_cm') or '?'} cm, {r.get('pie') or '?'}, {e.get('minutos', 0)}′, "
                     f"{e.get('goles', 0)} G, xG {e.get('xg', 0)}, aéreos {e.get('aereos_ganados', 0)}")
    if video:
        L += ["", "## Análisis de video del rival (cuerpo técnico)"]
        L += [f"- {FASES.get(a['fase'], a['fase'])} [{a.get('valoracion') or 'sin valorar'}]: {a['texto']}" for a in video]
    if previa:
        datos = {k: v for k, v in previa.items() if v not in (None, "") and k not in ("partido_id", "actualizado_en")}
        if datos:
            L += ["", "## Previa", compacto(datos, 2500)]
    if previos:
        L += ["", "## Nuestros últimos partidos (más reciente primero)"]
        for p in previos:
            pp = p["partido"]
            kpis = ", ".join(f"{label} {p['propio'].get(k)}-{p['rival'].get(k)}" for k, label in KPIS
                             if p["propio"].get(k) is not None)
            L.append(f"- {pp['fecha']} vs {(pp.get('rival') or {}).get('nombre')}: "
                     f"{pp.get('goles_favor')}-{pp.get('goles_contra')}. {kpis}")
            ev = evaluaciones.get(p["partido_id"]) or {}
            ins = p.get("insights") or {}
            mejorar = ev.get("a_mejorar") or "; ".join(ins.get("a_mejorar") or [])
            if mejorar:
                L.append(f"  A mejorar: {mejorar[:500]}")
            if ev.get("para_la_semana"):
                L.append(f"  Para la semana: {ev['para_la_semana'][:400]}")
    if propio and (propio.get("insights") or {}).get("claves"):
        L += ["", "## Autoevaluación de nuestro equipo (Sofascore)", compacto(propio["insights"]["claves"], 2500)]
    if principios:
        L += ["", "## Nuestro modelo de juego (principios)"]
        for m, label in MOMENTO_PRINCIPIO.items():
            nombres = [p["nombre"] for p in principios if p["momento"] == m]
            if nombres:
                L.append(f"- {label}: {'; '.join(nombres)}")
    if plan:
        escrito = {k: plan.get(k) for k in ["claves", *LARGOS] if plan.get(k)}
        if escrito:
            L += ["", "## Lo que el cuerpo técnico ya escribió en el plan (respetalo y complementalo)", compacto(escrito, 4000)]

    fuentes = {
        "informe": bool(informe), "video": len(video), "previa": bool(previa),
        "post_partidos": len(previos), "autoevaluacion": bool(propio and propio.get("insights")),
        "plantel_rival": len(rivales),
    }
    return "\n".join(L), fuentes


FORMATO = """{
 "puntos": [{"tipo": "oportunidad | amenaza | ajuste", "momento": "ofensiva | defensiva | tda | tad | abp | general",
             "titulo": "frase corta, accionable", "evidencia": "el dato que lo sostiene",
             "fuente": "informe | video | previa | historial | plantel"}],
 "borrador": {
   "claves": ["3 claves del partido, cortas (máx. 12 palabras)"],
   "objetivo": "una frase", "contexto": "cómo viene el rival y cómo venimos nosotros",
   "choque": "superioridades, hombre libre y duelos clave según las formaciones",
   "ofensiva_ct": "plan con pelota (extendido)", "ofensiva_plantel": "1-2 frases para el one sheet",
   "defensiva_ct": "plan sin pelota", "defensiva_plantel": "1-2 frases",
   "tda_ct": "al recuperar", "tda_plantel": "1-2 frases",
   "tad_ct": "al perder", "tad_plantel": "1-2 frases",
   "abp_ct": "pelota parada: amenazas del rival y oportunidades nuestras", "abp_plantel": "1-2 frases",
   "gestion": "cambios, ventanas, tarjetas y escenarios",
   "jugadores_clave": [{"nombre": "Apellido", "dorsal": 9, "como": "cómo neutralizarlo"}]
 }
}"""


def pedir_a_claude(h, material: str) -> dict:
    prompt = (
        "Sos el asistente del cuerpo técnico de un equipo de fútbol uruguayo y los ayudás a armar el plan del "
        "próximo partido. Con el material de abajo devolvé SOLO este JSON (sin texto antes ni después):\n"
        + FORMATO + "\n"
        "Reglas:\n"
        "- 6 a 10 puntos, los más determinantes primero; mezclá oportunidades (dónde lastimar al rival), "
        "amenazas (qué nos puede hacer daño) y ajustes (qué cambiar respecto de nuestros últimos partidos).\n"
        "- Cada punto y cada sección del borrador apoyados en datos del material, con el dato entre paréntesis. "
        "No inventes nada; si falta información para una sección, escribí qué falta en vez de suponer.\n"
        "- Priorizá lo que el cuerpo técnico confirmó y su análisis de video sobre los números.\n"
        "- Usá el vocabulario de nuestro modelo de juego cuando aplique. Si el plan ya tiene texto, complementalo.\n"
        "- Español rioplatense (voseo), directo, frases cortas. Las versiones *_plantel son para los jugadores: "
        "imperativas y concretas (\"Saltamos a presionar cuando el central recibe de espaldas\").\n\n"
        "=== MATERIAL ===\n" + material
    )
    carpeta = Path.home() / "Library" / "Caches" / "gestion-total"
    carpeta.mkdir(parents=True, exist_ok=True)
    r = subprocess.run([h.claude_cli(), "-p", prompt, "--output-format", "text"],
                       capture_output=True, text=True, timeout=900, cwd=str(carpeta))
    if r.returncode != 0:
        raise RuntimeError("Claude no pudo armar el plan: " + (r.stderr or r.stdout)[-400:])
    texto = re.sub(r"^```(?:json)?\s*|\s*```$", "", r.stdout.strip())
    return json.loads(texto[texto.find("{"): texto.rfind("}") + 1])


def limpiar(respuesta: dict) -> tuple[list[dict], dict]:
    """Valida lo que devolvió Claude y lo recorta a los límites de la base."""
    puntos = []
    for p in respuesta.get("puntos") or []:
        if not isinstance(p, dict) or not p.get("titulo"):
            continue
        puntos.append({
            "id": uuid.uuid4().hex[:10],
            "tipo": p.get("tipo") if p.get("tipo") in TIPOS else "ajuste",
            "momento": p.get("momento") if p.get("momento") in MOMENTOS else "general",
            "titulo": str(p["titulo"])[:200],
            "evidencia": str(p.get("evidencia") or "")[:600],
            "fuente": p.get("fuente") if p.get("fuente") in FUENTES else "informe",
        })
    b = respuesta.get("borrador") or {}
    borrador = {k: str(b[k])[:n] for k, n in LARGOS.items() if b.get(k)}
    borrador["claves"] = [str(c)[:200] for c in (b.get("claves") or []) if c][:3]
    clave = []
    for j in (b.get("jugadores_clave") or [])[:6]:
        if isinstance(j, dict) and j.get("nombre"):
            dorsal = j.get("dorsal")
            clave.append({
                "nombre": str(j["nombre"])[:80],
                "dorsal": dorsal if isinstance(dorsal, int) and 0 <= dorsal <= 99 else None,
                "como": str(j.get("como") or "")[:300],
                "responsable": None,
            })
    borrador["jugadores_clave"] = clave
    return puntos[:12], borrador


def procesar_asistente(pedido: dict, h):
    partido = h.rest(
        "GET",
        f"partidos?id=eq.{pedido['partido_id']}&select=*,rival:equipos(*),temporada:temporadas(id,club,cuerpo_tecnico_id)",
    )[0]
    h.actualizar_pedido(pedido["id"], "procesando", "Juntando el informe, el video, la previa y los post partidos…")
    material, fuentes = juntar(h, partido)
    avisos = []
    if not fuentes["informe"]:
        avisos.append("No hay informe del rival: los puntos salen de poca información.")
    if not fuentes["post_partidos"]:
        avisos.append("Todavía no hay post partidos cargados: no se compara con nuestros últimos partidos.")

    h.actualizar_pedido(pedido["id"], "procesando", "Claude está analizando y armando el borrador del plan…")
    puntos, borrador = limpiar(pedir_a_claude(h, material))

    h.rest("POST", "asistente_plan?on_conflict=partido_id", {
        "partido_id": partido["id"],
        "generado_en": datetime.now(timezone.utc).isoformat(),
        "puntos": puntos, "borrador": borrador, "validaciones": {},
        "fuentes": fuentes, "avisos": avisos,
    }, prefer="resolution=merge-duplicates")
    h.actualizar_pedido(pedido["id"], "listo", f"{len(puntos)} puntos clave y borrador del plan listos.")
    h.log("Listo: asistente del plan", partido["id"])
