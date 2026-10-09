"""
Importa los partidos ya jugados de la temporada (lo llama worker/sofascore.py
con el pedido "importar_temporada", solo cuando el cuerpo técnico lo pide).

Para cada partido terminado del club entre el inicio de la temporada y hoy:
1. si no está en la app, lo crea (con el rival, que también se crea si falta);
2. si no tiene post partido, lo carga desde Sofascore (sin el borrador de
   Claude, para que sea rápido: se puede pedir después partido por partido).
No toca lo que ya está cargado.

Para ver qué haría, sin escribir nada:
    ~/.claude/skills/informe-rival/.venv/bin/python worker/importar.py --probar TEMPORADA_ID
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import liga  # noqa: E402
import post  # noqa: E402


RONDAS = {"Round of 32": "16avos de final", "Round of 16": "Octavos de final", "Quarterfinals": "Cuartos de final",
          "Semifinals": "Semifinal", "Final": "Final", "Group A": "Grupo A", "Group B": "Grupo B",
          "Group C": "Grupo C", "Group D": "Grupo D"}


def nombre_competicion(ev: dict) -> str:
    """"Liga AUF Uruguaya, Apertura" + fecha 7 → "Liga AUF Uruguaya · Apertura · Fecha 7"."""
    torneo = " · ".join(RONDAS.get(x.strip(), x.strip()) for x in ((ev.get("tournament") or {}).get("name") or "").split(","))
    ronda = ev.get("roundInfo") or {}
    if ronda.get("name"):
        torneo += " · " + RONDAS.get(ronda["name"], ronda["name"])
    elif ronda.get("round"):
        torneo += f" · Fecha {ronda['round']}"
    return torneo.strip(" ·")[:120]


def hora_local(ts: int) -> tuple[str, str]:
    d = datetime.fromtimestamp(ts, timezone.utc).astimezone()
    return d.date().isoformat(), d.strftime("%H:%M")


def plan_importacion(h, temporada: dict) -> list[dict]:
    """Qué partidos faltan crear y cuáles necesitan post partido."""
    club = str((temporada.get("ids_externos") or {}).get("sofascore") or "")
    if not club:
        raise RuntimeError("La temporada no tiene el id de Sofascore del club.")
    hoy = datetime.now().date().isoformat()
    eventos = liga.eventos_club(club, temporada["fecha_inicio"], min(hoy, temporada["fecha_fin"]))
    partidos = h.rest("GET", f"partidos?temporada_id=eq.{temporada['id']}&select=id,fecha,rival_id,ids_externos") or []
    con_post = {p["partido_id"] for p in (h.rest(
        "GET", f"estadisticas_partido?select=partido_id,partido:partidos!inner(temporada_id)&partido.temporada_id=eq.{temporada['id']}"
    ) or [])}
    equipos = h.rest("GET", f"equipos?cuerpo_tecnico_id=eq.{temporada['cuerpo_tecnico_id']}&select=id,nombre,ids_externos") or []
    por_sofa = {str((e.get("ids_externos") or {}).get("sofascore")): e for e in equipos if (e.get("ids_externos") or {}).get("sofascore")}
    por_nombre = {" ".join(h.normalizar(e["nombre"])): e for e in equipos}

    plan = []
    for ev in eventos:
        local = str(ev["homeTeam"]["id"]) == club
        rival = ev["awayTeam"] if local else ev["homeTeam"]
        fecha, hora = hora_local(ev["startTimestamp"])
        equipo = por_sofa.get(str(rival["id"])) or por_nombre.get(" ".join(h.normalizar(rival.get("name")))) \
            or por_nombre.get(" ".join(h.normalizar(rival.get("shortName"))))
        existente = next((p for p in partidos if str((p.get("ids_externos") or {}).get("sofascore")) == str(ev["id"])), None)
        if not existente and equipo:
            existente = next((p for p in partidos if p["fecha"] == fecha and p["rival_id"] == equipo["id"]), None)
        plan.append({
            "evento": str(ev["id"]), "fecha": fecha, "hora": hora, "local": local,
            "rival": rival, "equipo": equipo, "partido": existente,
            "competicion": nombre_competicion(ev),
            "estadio": (ev.get("venue") or {}).get("name") or ((ev.get("venue") or {}).get("stadium") or {}).get("name"),
            "falta_post": not existente or existente["id"] not in con_post,
        })
    return sorted(plan, key=lambda x: x["fecha"])


def procesar_importacion(pedido: dict, h):
    temporada = h.rest("GET", f"temporadas?id=eq.{pedido['temporada_id']}&select=*")[0]
    h.actualizar_pedido(pedido["id"], "procesando", "Buscando los partidos jugados en Sofascore…")
    plan = plan_importacion(h, temporada)
    pendientes = [p for p in plan if p["falta_post"]]
    creados = cargados = errores = 0
    nuevos: dict[str, dict] = {}  # rivales creados en esta importación (por id de Sofascore)
    for n, p in enumerate(pendientes, 1):
        prefijo = f"Partido {n} de {len(pendientes)} ({p['fecha']} vs {p['rival'].get('shortName') or p['rival'].get('name')})"
        try:
            p["equipo"] = p["equipo"] or nuevos.get(str(p["rival"]["id"]))
            if not p["equipo"]:
                p["equipo"] = h.rest("POST", "equipos", {
                    "cuerpo_tecnico_id": temporada["cuerpo_tecnico_id"], "nombre": p["rival"].get("name")[:100],
                    "ids_externos": {"sofascore": str(p["rival"]["id"])},
                }, prefer="return=representation")[0]
                nuevos[str(p["rival"]["id"])] = p["equipo"]
            if not p["partido"]:
                p["partido"] = h.rest("POST", "partidos", {
                    "temporada_id": temporada["id"], "rival_id": p["equipo"]["id"], "fecha": p["fecha"],
                    "hora": p["hora"], "es_local": p["local"], "competicion": (p["competicion"] or "")[:120] or None,
                    "estadio": (p["estadio"] or "")[:120] or None, "estado": "jugado",
                    "ids_externos": {"sofascore": p["evento"]},
                }, prefer="return=representation")[0]
                creados += 1
            partido = h.rest(
                "GET",
                f"partidos?id=eq.{p['partido']['id']}&select=*,rival:equipos(*),temporada:temporadas(id,club,ids_externos)",
            )[0]
            avisar = lambda m, x=prefijo: h.actualizar_pedido(pedido["id"], "procesando", f"{x}: {m}")  # noqa: E731
            post.cargar_post(h, partido, p["evento"], str(temporada["ids_externos"]["sofascore"]), avisar, con_claude=False)
            cargados += 1
        except Exception as e:  # un partido que falla no corta la importación
            errores += 1
            h.log("No se pudo importar", p["evento"], e)
    h.actualizar_pedido(
        pedido["id"], "listo",
        f"{len(plan)} partidos jugados en la temporada: {creados} creados y {cargados} post partidos cargados"
        + (f" ({errores} con error)" if errores else "") + ".",
    )
    h.log("Listo: importación de la temporada", temporada["club"])


if __name__ == "__main__" and len(sys.argv) == 3 and sys.argv[1] == "--probar":
    temporada_id = sys.argv[2]
    sys.argv = [sys.argv[0]]
    import sofascore as h  # noqa: E402  (solo lecturas)
    temporada = h.rest("GET", f"temporadas?id=eq.{temporada_id}&select=*")[0]
    plan = plan_importacion(h, temporada)
    for p in plan:
        print(p["fecha"], "L" if p["local"] else "V", p["rival"].get("shortName") or p["rival"].get("name"), "|", p["competicion"], "|",
              "existe" if p["partido"] else "CREAR partido", "|", "rival en app" if p["equipo"] else "CREAR rival", "|",
              "falta post" if p["falta_post"] else "ya tiene post")
    rivales_nuevos = {str(p["rival"]["id"]) for p in plan if not p["equipo"]}
    print(len(plan), "partidos;", sum(1 for p in plan if not p["partido"]), "a crear;", len(rivales_nuevos), "rivales a crear;",
          sum(1 for p in plan if p["falta_post"]), "post a cargar")
