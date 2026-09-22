"""Processa a fila de emissao/cancelamento e o outbox de webhooks.

    python -m app.worker
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import time

import requests

from . import certs, db
from .config import Config
from .drivers.base import OK, REJEITADO, Ctx, DriverResult, LocalValidationError
from .drivers.nfse_nacional import get_driver
from .security import Vault, VaultError
from .services import (AUTORIZADO, CANCELADO, ERRO, INCERTO, PROC_CANC, PROCESSANDO, enqueue_webhook,
                       next_numero, now_iso)

log = logging.getLogger("worker")
BACKOFF = [15, 60, 300, 900, 3600, 21600]
WH_BACKOFF = [30, 120, 600, 3600, 21600, 86400, 86400, 86400]
STALE_AFTER = 600


class MissingCert(Exception):
    pass


class Worker:
    def __init__(self, conn, cfg: Config, vault: Vault, driver, http_post=None, clock=time.time):
        self.conn, self.cfg, self.vault, self.driver = conn, cfg, vault, driver
        self.http_post = http_post or requests.post
        self.clock = clock

    # ---------- loop ----------
    def run_once(self) -> bool:
        now = int(self.clock())
        self.conn.execute("UPDATE jobs SET status='pendente' WHERE status='executando' AND locked_at<?", (now - STALE_AFTER,))
        self.conn.execute("UPDATE webhook_outbox SET status='pendente' WHERE status='executando' AND locked_at<?", (now - STALE_AFTER,))
        job = self.conn.execute(
            "UPDATE jobs SET status='executando', locked_at=?, attempts=attempts+1 WHERE id=("
            " SELECT id FROM jobs WHERE status='pendente' AND next_run_at<=? ORDER BY next_run_at, id LIMIT 1) RETURNING *",
            (now, now)).fetchone()
        if job:
            try:
                job = dict(job)
                (self._emitir if job["tipo"] == "emitir" else self._cancelar)(job)
            except Exception as exc:  # noqa: BLE001 - nunca derrubar o loop
                log.exception("erro inesperado no job %s", job["id"])
                self._retry(job, [{"codigo": "ERRO_INTERNO", "mensagem": type(exc).__name__}])
            return True
        wh = self.conn.execute(
            "UPDATE webhook_outbox SET status='executando', locked_at=?, attempts=attempts+1 WHERE id=("
            " SELECT id FROM webhook_outbox WHERE status='pendente' AND next_run_at<=? ORDER BY next_run_at, id LIMIT 1) RETURNING *",
            (now, now)).fetchone()
        if wh:
            self._deliver(dict(wh))
            return True
        return False

    def run_forever(self, idle: float = 2.0):
        log.info("worker iniciado (driver=%s)", self.cfg.driver)
        while True:
            try:
                if not self.run_once():
                    time.sleep(idle)
            except Exception:  # noqa: BLE001
                log.exception("falha no loop; aguardando")
                time.sleep(5)

    # ---------- helpers ----------
    def _doc(self, doc_id):
        return db.row(self.conn.execute("SELECT * FROM documentos WHERE id=?", (doc_id,)).fetchone())

    def _load_cert(self, empresa_id):
        r = self.conn.execute("SELECT blob FROM certificados WHERE empresa_id=?", (empresa_id,)).fetchone()
        if not r:
            raise MissingCert("empresa sem certificado cadastrado")
        return certs.unpack(self.vault, empresa_id, r["blob"])

    def _complete(self, job):
        self.conn.execute("UPDATE jobs SET status='concluido', locked_at=NULL WHERE id=?", (job["id"],))

    def _set_doc(self, doc_id, **cols):
        cols["atualizado_em"] = now_iso()
        sets = ",".join(f"{k}=?" for k in cols)
        self.conn.execute(f"UPDATE documentos SET {sets} WHERE id=?", (*cols.values(), doc_id))

    def _finish(self, job, doc, evento, **cols):
        with db.tx(self.conn):
            self._set_doc(doc["id"], **cols)
            self.conn.execute("UPDATE jobs SET status='concluido', locked_at=NULL WHERE id=?", (job["id"],))
            enqueue_webhook(self.conn, doc["empresa_id"], self._doc(doc["id"]), evento, self.clock)

    def _retry(self, job, erros):
        doc = self._doc(job["doc_id"])
        if job["attempts"] >= self.cfg.max_attempts:
            self._exhausted(job, doc, erros)
            return
        delay = BACKOFF[min(job["attempts"] - 1, len(BACKOFF) - 1)]
        self.conn.execute("UPDATE jobs SET status='pendente', locked_at=NULL, next_run_at=?, last_error=? WHERE id=?",
                          (int(self.clock()) + delay, json.dumps(erros), job["id"]))

    def _exhausted(self, job, doc, erros):
        msg = [{"codigo": INCERTO, "mensagem": "Sem confirmacao da autoridade apos varias tentativas. A nota pode ter sido "
                                              "autorizada; reenvie a mesma ref/conteudo para reconciliar."}, *erros]
        with db.tx(self.conn):
            self.conn.execute("UPDATE jobs SET status='falhou', locked_at=NULL, last_error=? WHERE id=?",
                              (json.dumps(erros), job["id"]))
            if job["tipo"] == "emitir":
                self._set_doc(doc["id"], status=ERRO, erros_json=json.dumps(msg, ensure_ascii=False))
                enqueue_webhook(self.conn, doc["empresa_id"], self._doc(doc["id"]), "nfse.incerta", self.clock)
            else:
                self._set_doc(doc["id"], status=AUTORIZADO, erros_json=json.dumps(msg, ensure_ascii=False))
                enqueue_webhook(self.conn, doc["empresa_id"], self._doc(doc["id"]), "nfse.cancelamento_rejeitado", self.clock)

    def _ctx(self, doc):
        empresa = db.row(self.conn.execute("SELECT * FROM empresas WHERE id=?", (doc["empresa_id"],)).fetchone())
        cert = self._load_cert(empresa["id"])
        if cert.info.expired:
            raise MissingCert("certificado digital vencido")
        if self.cfg.driver == "mock" and doc["ambiente"] == "producao":
            raise MissingCert("DRIVER=mock nao pode operar em ambiente de producao")
        return Ctx(empresa, json.loads(doc["payload_json"]), cert, doc["ambiente"])

    # ---------- emitir ----------
    def _emitir(self, job):
        doc = self._doc(job["doc_id"])
        if doc["status"] != PROCESSANDO:
            return self._complete(job)
        try:
            ctx = self._ctx(doc)
        except (MissingCert, certs.CertError, VaultError) as exc:
            return self._finish(job, doc, "nfse.rejeitada", status=ERRO,
                                erros_json=json.dumps([{"codigo": "CERTIFICADO", "mensagem": str(exc)}]))
        dados = json.loads(job["dados_json"] or "{}")
        had_xml = doc["xml_dps"] is not None
        if not had_xml:
            try:
                with db.tx(self.conn):
                    serie = ctx.empresa["serie_dps"]
                    numero = next_numero(self.conn, ctx.empresa["id"], doc["ambiente"], serie)
                    dps_id, xml = self.driver.build_signed(ctx, serie, numero)
                    self._set_doc(doc["id"], serie=serie, numero=numero, dps_id=dps_id, xml_dps=xml)
            except LocalValidationError as exc:  # rollback devolveu o numero
                return self._finish(job, doc, "nfse.rejeitada", status=ERRO,
                                    erros_json=json.dumps(exc.erros, ensure_ascii=False))
            doc = self._doc(doc["id"])
        attempt = max(job["attempts"] - 1, 1 if (had_xml or dados.get("reconciliar")) else 0)
        res: DriverResult = self.driver.submit(ctx, doc["dps_id"], doc["xml_dps"], attempt)
        if res.outcome == OK:
            self._finish(job, doc, "nfse.autorizada", status=AUTORIZADO, chave_acesso=res.chave_acesso,
                         numero_nfse=res.numero_nfse, xml_autorizado=res.xml_autorizado, erros_json=None)
        elif res.outcome == REJEITADO:
            self._finish(job, doc, "nfse.rejeitada", status=ERRO, erros_json=json.dumps(res.erros, ensure_ascii=False))
        else:
            self._retry(job, res.erros)

    # ---------- cancelar ----------
    def _cancelar(self, job):
        doc = self._doc(job["doc_id"])
        if doc["status"] != PROC_CANC:
            return self._complete(job)
        just = json.loads(job["dados_json"])["justificativa"]
        try:
            ctx = self._ctx(doc)
            res = self.driver.cancel(ctx, doc["chave_acesso"], just, job["attempts"] - 1)
        except (MissingCert, certs.CertError, VaultError) as exc:
            res = DriverResult(REJEITADO, erros=[{"codigo": "CERTIFICADO", "mensagem": str(exc)}])
        except NotImplementedError as exc:
            res = DriverResult(REJEITADO, erros=[{"codigo": "NAO_IMPLEMENTADO", "mensagem": str(exc)}])
        if res.outcome == OK:
            self._finish(job, doc, "nfse.cancelada", status=CANCELADO, erros_json=None)
        elif res.outcome == REJEITADO:
            self._finish(job, doc, "nfse.cancelamento_rejeitado", status=AUTORIZADO,
                         erros_json=json.dumps(res.erros, ensure_ascii=False))
        else:
            self._retry(job, res.erros)

    # ---------- webhooks ----------
    def _deliver(self, wh):
        emp = db.row(self.conn.execute("SELECT webhook_url, webhook_secret_enc FROM empresas WHERE id=?",
                                       (wh["empresa_id"],)).fetchone())
        ok, err = False, ""
        try:
            secret = self.vault.decrypt(emp["webhook_secret_enc"], aad=b"wh:" + wh["empresa_id"].encode())
            body = wh["body_json"].encode()
            ts = str(int(self.clock()))
            sig = hmac.new(secret, ts.encode() + b"." + body, hashlib.sha256).hexdigest()
            r = self.http_post(emp["webhook_url"], data=body, timeout=10, allow_redirects=False, headers={
                "Content-Type": "application/json", "X-Notas-Timestamp": ts,
                "X-Notas-Signature": f"sha256={sig}", "X-Notas-Event": wh["evento"]})
            ok = 200 <= r.status_code < 300
            err = "" if ok else f"HTTP {r.status_code}"
        except Exception as exc:  # noqa: BLE001
            err = type(exc).__name__
        if ok:
            self.conn.execute("UPDATE webhook_outbox SET status='entregue', locked_at=NULL, last_error=NULL WHERE id=?", (wh["id"],))
        elif wh["attempts"] >= len(WH_BACKOFF):
            self.conn.execute("UPDATE webhook_outbox SET status='falhou', locked_at=NULL, last_error=? WHERE id=?", (err, wh["id"]))
        else:
            self.conn.execute("UPDATE webhook_outbox SET status='pendente', locked_at=NULL, next_run_at=?, last_error=? WHERE id=?",
                              (int(self.clock()) + WH_BACKOFF[wh["attempts"] - 1], err, wh["id"]))


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    cfg = Config.from_env()
    conn = db.connect(cfg.db_path)
    db.init_db(conn)
    Worker(conn, cfg, Vault(cfg.master_key), get_driver(cfg)).run_forever()


if __name__ == "__main__":
    main()
