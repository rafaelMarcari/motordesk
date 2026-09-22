from __future__ import annotations

import hashlib
import json
import time
from datetime import datetime, timezone

from . import db
from .validators import ApiError

PROCESSANDO = "processando_autorizacao"
AUTORIZADO = "autorizado"
ERRO = "erro_autorizacao"
PROC_CANC = "processando_cancelamento"
CANCELADO = "cancelado"
INCERTO = "TENTATIVAS_ESGOTADAS"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def payload_hash(p: dict) -> str:
    return hashlib.sha256(json.dumps(p, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def get_doc(conn, empresa_id: str, ambiente: str, ref: str):
    return db.row(conn.execute(
        "SELECT * FROM documentos WHERE empresa_id=? AND ambiente=? AND tipo='nfse' AND ref=?",
        (empresa_id, ambiente, ref)).fetchone())


def enqueue_job(conn, doc_id: int, tipo: str, dados: dict | None = None, clock=time.time) -> None:
    conn.execute("INSERT INTO jobs(doc_id,tipo,dados_json,next_run_at,criado_em) VALUES (?,?,?,?,?)",
                 (doc_id, tipo, json.dumps(dados) if dados else None, int(clock()), now_iso()))


def next_numero(conn, empresa_id: str, ambiente: str, serie: str) -> int:
    """Reserva o proximo numero de DPS. Chamar DENTRO de db.tx (rollback devolve o numero)."""
    conn.execute("INSERT OR IGNORE INTO sequencias(empresa_id,ambiente,serie,ultimo) VALUES (?,?,?,0)",
                 (empresa_id, ambiente, serie))
    return conn.execute(
        "UPDATE sequencias SET ultimo=ultimo+1 WHERE empresa_id=? AND ambiente=? AND serie=? RETURNING ultimo",
        (empresa_id, ambiente, serie)).fetchone()[0]


def doc_view(d: dict) -> dict:
    erros = json.loads(d["erros_json"]) if d.get("erros_json") else []
    out = {
        "ref": d["ref"], "status": d["status"], "ambiente": d["ambiente"],
        "serie": d["serie"], "numero_dps": d["numero"], "dps_id": d["dps_id"],
        "chave_acesso": d["chave_acesso"], "numero_nfse": d["numero_nfse"],
        "erros": erros, "criado_em": d["criado_em"], "atualizado_em": d["atualizado_em"],
    }
    if d.get("xml_autorizado"):
        out["caminho_xml"] = f"/v1/nfse/{d['ref']}/xml"
    return out


def enqueue_webhook(conn, empresa_id: str, doc: dict, evento: str, clock=time.time) -> None:
    emp = conn.execute("SELECT webhook_url FROM empresas WHERE id=?", (empresa_id,)).fetchone()
    if not emp or not emp["webhook_url"]:
        return
    body = doc_view(doc)
    body = {"evento": evento, "ocorrido_em": now_iso(), **body}
    conn.execute(
        "INSERT INTO webhook_outbox(empresa_id,doc_id,evento,body_json,next_run_at,criado_em) VALUES (?,?,?,?,?,?)",
        (empresa_id, doc["id"], evento, json.dumps(body, ensure_ascii=False), int(clock()), now_iso()))


def submit_nfse(conn, empresa: dict, ref: str, payload: dict, clock=time.time) -> tuple[dict, int]:
    """Cria (ou reaproveita, de forma idempotente) um documento. Retorna (doc, http_status)."""
    h = payload_hash(payload)
    with db.tx(conn):
        doc = get_doc(conn, empresa["id"], empresa["ambiente"], ref)
        ts = now_iso()
        if doc is None:
            cur = conn.execute(
                "INSERT INTO documentos(empresa_id,ref,ambiente,status,payload_json,payload_hash,criado_em,atualizado_em)"
                " VALUES (?,?,?,?,?,?,?,?)",
                (empresa["id"], ref, empresa["ambiente"], PROCESSANDO,
                 json.dumps(payload, ensure_ascii=False), h, ts, ts))
            enqueue_job(conn, cur.lastrowid, "emitir", clock=clock)
            return db.row(conn.execute("SELECT * FROM documentos WHERE id=?", (cur.lastrowid,)).fetchone()), 202

        if doc["status"] != ERRO:
            if doc["payload_hash"] == h:
                return doc, 200  # idempotente
            raise ApiError(409, "ref_em_uso", "Esta ref ja foi usada com outro conteudo")

        erros = json.loads(doc["erros_json"] or "[]")
        incerto = any(e.get("codigo") == INCERTO for e in erros)
        if incerto:
            if doc["payload_hash"] != h:
                raise ApiError(409, "situacao_incerta",
                               "A tentativa anterior terminou sem confirmacao da autoridade; reenvie o MESMO conteudo "
                               "para reconciliar antes de alterar dados")
            conn.execute("UPDATE documentos SET status=?, erros_json=NULL, atualizado_em=? WHERE id=?",
                         (PROCESSANDO, ts, doc["id"]))
            enqueue_job(conn, doc["id"], "emitir", {"reconciliar": True}, clock=clock)
        else:  # rejeicao definitiva: pode corrigir e reenviar (nova numeracao)
            conn.execute(
                "UPDATE documentos SET status=?, payload_json=?, payload_hash=?, serie=NULL, numero=NULL, dps_id=NULL,"
                " xml_dps=NULL, erros_json=NULL, atualizado_em=? WHERE id=?",
                (PROCESSANDO, json.dumps(payload, ensure_ascii=False), h, ts, doc["id"]))
            enqueue_job(conn, doc["id"], "emitir", clock=clock)
        return db.row(conn.execute("SELECT * FROM documentos WHERE id=?", (doc["id"],)).fetchone()), 202


def request_cancel(conn, empresa: dict, ref: str, justificativa: str, clock=time.time) -> dict:
    j = (justificativa or "").strip()
    if not (15 <= len(j) <= 255):
        raise ApiError(422, "dados_invalidos", "justificativa deve ter de 15 a 255 caracteres")
    with db.tx(conn):
        doc = get_doc(conn, empresa["id"], empresa["ambiente"], ref)
        if doc is None:
            raise ApiError(404, "nao_encontrado", "ref nao encontrada")
        if doc["status"] != AUTORIZADO:
            raise ApiError(409, "estado_invalido", f"nao e possivel cancelar documento em '{doc['status']}'")
        conn.execute("UPDATE documentos SET status=?, erros_json=NULL, atualizado_em=? WHERE id=?",
                     (PROC_CANC, now_iso(), doc["id"]))
        enqueue_job(conn, doc["id"], "cancelar", {"justificativa": j}, clock=clock)
        return db.row(conn.execute("SELECT * FROM documentos WHERE id=?", (doc["id"],)).fetchone())
