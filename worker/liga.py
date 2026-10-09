"""
Referencias de la liga para los percentiles de Rendimiento (lo llama
worker/sofascore.py con el pedido "liga").

Para cada competencia de la temporada en la que jugamos al menos 5 partidos,
baja las estadísticas de temporada de todos los equipos y de todos los jugadores
(por puesto) y las guarda en referencias_liga. Los nombres de las estadísticas
quedan como los da la fuente; la app los traduce.

Para probar sin subir nada:
    ~/.claude/skills/informe-rival/.venv/bin/python worker/liga.py --probar CLUB AAAA-MM-DD AAAA-MM-DD
"""

from __future__ import annotations

import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

SCRIPTS = Path.home() / ".claude" / "skills" / "informe-rival" / "scripts"
sys.path.insert(0, str(SCRIPTS))
import sofa  # noqa: E402

# Estadísticas de jugador que se piden (las que Sofascore no tiene para la liga vuelven vacías)
CAMPOS = ("minutesPlayed,appearances,rating,goals,assists,totalShots,shotsOnTarget,keyPasses,accuratePasses,"
          "totalPasses,accuratePassesPercentage,successfulDribbles,clearances,ballRecovery,aerialDuelsWon,"
          "aerialDuelsWonPercentage,totalDuelsWon,totalDuelsWonPercentage,accurateLongBalls,accurateCrosses,saves,"
          "expectedGoals,expectedAssists,tackles,interceptions")
MINIMO_PARTIDOS = 5


def fecha_local(ts: int) -> str:
    return datetime.fromtimestamp(ts, timezone.utc).astimezone().date().isoformat()


def eventos_club(club: str, desde: str, hasta: str) -> list[dict]:
    """Partidos terminados del club entre dos fechas (los más recientes primero)."""
    salida = []
    for pagina in range(0, 8):
        try:
            eventos = (sofa.get(f"/team/{club}/events/last/{pagina}") or {}).get("events", [])
        except Exception:
            break
        if not eventos:
            break
        for ev in eventos:
            f = fecha_local(ev["startTimestamp"])
            if desde <= f <= hasta and (ev.get("status") or {}).get("type") == "finished":
                salida.append(ev)
        if min(fecha_local(ev["startTimestamp"]) for ev in eventos) < desde:
            break
    return sorted(salida, key=lambda e: -e["startTimestamp"])


def competiciones(club: str, desde: str, hasta: str) -> list[tuple[str, str, str]]:
    """(torneo, temporada, nombre) de las competencias con al menos 5 partidos nuestros."""
    cuenta: Counter = Counter()
    nombres = {}
    for ev in eventos_club(club, desde, hasta):
        ut = (ev.get("tournament") or {}).get("uniqueTournament") or {}
        clave = (str(ut.get("id")), str((ev.get("season") or {}).get("id")))
        if ut.get("id") and clave[1] != "None":
            cuenta[clave] += 1
            nombres[clave] = ut.get("name") or "Competencia"
    return [(t, s, nombres[(t, s)]) for (t, s), n in cuenta.most_common() if n >= MINIMO_PARTIDOS]


def limpio(d: dict) -> dict:
    return {k: v for k, v in d.items() if isinstance(v, (int, float)) and not isinstance(v, bool) and k != "id"}


def referencias(club: str, torneo: str, temporada: str, avisar=lambda m: None) -> tuple[list, list]:
    info = sofa.get(f"/unique-tournament/{torneo}/season/{temporada}/statistics/info") or {}
    equipos = []
    for i, t in enumerate(info.get("teams", []), 1):
        avisar(f"Equipos de la liga: {i} de {len(info.get('teams', []))}…")
        try:
            st = (sofa.get(f"/team/{t['id']}/unique-tournament/{torneo}/season/{temporada}/statistics/overall") or {}).get("statistics") or {}
        except Exception:
            continue
        if st.get("matches"):
            equipos.append({"id": str(t["id"]), "nombre": t.get("shortName") or t.get("name"),
                            "partidos": st["matches"], "propio": str(t["id"]) == str(club), "stats": limpio(st)})
    jugadores = []
    for pos in ("G", "D", "M", "F"):
        avisar(f"Jugadores de la liga ({ {'G': 'arqueros', 'D': 'defensores', 'M': 'mediocampistas', 'F': 'delanteros'}[pos] })…")
        pagina, paginas = 1, 1
        while pagina <= paginas and pagina <= 10:
            r = sofa.get(
                f"/unique-tournament/{torneo}/season/{temporada}/statistics?limit=100&offset={(pagina - 1) * 100}"
                f"&order=-minutesPlayed&accumulation=total&fields={CAMPOS.replace(',', '%2C')}&filters=position.in.{pos}"
            ) or {}
            paginas = r.get("pages") or 1
            for x in r.get("results", []):
                st = limpio({k: v for k, v in x.items() if k not in ("player", "team")})
                if not st.get("minutesPlayed"):
                    continue
                jugadores.append({"id": str((x.get("player") or {}).get("id")), "nombre": (x.get("player") or {}).get("name"),
                                  "equipo": (x.get("team") or {}).get("shortName") or (x.get("team") or {}).get("name"),
                                  "equipo_id": str((x.get("team") or {}).get("id")), "posicion": pos,
                                  "minutos": st["minutesPlayed"], "stats": st})
            pagina += 1
    return equipos, jugadores


def procesar_liga(pedido: dict, h):
    temporada = h.rest("GET", f"temporadas?id=eq.{pedido['temporada_id']}&select=*")[0]
    club = (temporada.get("ids_externos") or {}).get("sofascore")
    if not club:
        raise RuntimeError("La temporada no tiene el id de Sofascore del club.")
    hoy = datetime.now().date().isoformat()
    h.actualizar_pedido(pedido["id"], "procesando", "Buscando las competencias de la temporada…")
    comps = competiciones(str(club), temporada["fecha_inicio"], min(hoy, temporada["fecha_fin"]))
    if not comps:
        raise RuntimeError("No encontré competencias con al menos 5 partidos nuestros en la temporada.")
    resumen = []
    for torneo, temp, nombre in comps:
        avisar = lambda m, n=nombre: h.actualizar_pedido(pedido["id"], "procesando", f"{n}: {m}")  # noqa: E731
        equipos, jugadores = referencias(str(club), torneo, temp, avisar)
        h.rest("POST", "referencias_liga?on_conflict=temporada_id,id_torneo", {
            "temporada_id": temporada["id"], "id_torneo": torneo, "id_temporada": temp, "competicion": nombre,
            "fuente": "sofascore", "generado_en": datetime.now(timezone.utc).isoformat(),
            "equipos": equipos, "jugadores": jugadores,
        }, prefer="resolution=merge-duplicates")
        resumen.append(f"{nombre} ({len(equipos)} equipos, {len(jugadores)} jugadores)")
    h.actualizar_pedido(pedido["id"], "listo", "Liga actualizada: " + "; ".join(resumen) + ".")
    h.log("Listo: liga", temporada["club"])


if __name__ == "__main__" and len(sys.argv) == 5 and sys.argv[1] == "--probar":
    comps = competiciones(sys.argv[2], sys.argv[3], sys.argv[4])
    print("Competencias:", comps)
    if comps:
        eq, ju = referencias(sys.argv[2], comps[0][0], comps[0][1], print)
        print(len(eq), "equipos;", len(ju), "jugadores")
        print([e for e in eq if e["propio"]][:1])
        print(ju[:2])
