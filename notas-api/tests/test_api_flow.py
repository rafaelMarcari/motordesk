import copy
import json
import tempfile
import time
import unittest

from app import db
from app.security import Vault
from app.worker import Worker
from app.drivers.mock import MockDriver

from tests.helpers import ADMIN, CNPJ, H, NFSE, bootstrap, new_app, make_pfx


class FakeResp:
    def __init__(self, code=200):
        self.status_code = code


class Base(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.cfg, self.app = new_app(self._tmp.name)
        self.client = self.app.test_client()
        self.wh_calls, self.wh_code = [], 200
        self.clock = [time.time()]  # a API enfileira com o relogio real; o teste avanca a partir dele
        self.conn = db.connect(self.cfg.db_path)
        self.worker = Worker(self.conn, self.cfg, Vault(self.cfg.master_key), MockDriver(),
                             http_post=self._post, clock=lambda: self.clock[0])

    def tearDown(self):
        self.conn.close()
        self._tmp.cleanup()

    def _post(self, url, data, headers, **kw):
        self.wh_calls.append((url, data, headers))
        return FakeResp(self.wh_code)

    def drain(self, advance=0):
        self.clock[0] = max(self.clock[0], time.time()) + advance  # nunca "antes" do relogio real
        n = 0
        while self.worker.run_once():
            n += 1
        return n

    def payload(self, desc=None):
        p = copy.deepcopy(NFSE)
        if desc:
            p["servico"]["descricao"] = desc
        return p


class AdminAndAuth(Base):
    def test_admin_requires_token(self):
        r = self.client.post("/admin/empresas", json={})
        self.assertEqual(r.status_code, 401)
        r = self.client.post("/admin/empresas", headers=H("x" * 30), json={})
        self.assertEqual(r.status_code, 401)

    def test_empresa_validation_and_duplicate(self):
        r = self.client.post("/admin/empresas", headers=H(ADMIN), json={"cnpj": "123", "regime": "x"})
        self.assertEqual(r.status_code, 422)
        bootstrap(self.client)
        r = self.client.post("/admin/empresas", headers=H(ADMIN), json={
            "cnpj": CNPJ, "razao_social": "X", "codigo_municipio": "3548708", "regime": "mei"})
        self.assertEqual(r.status_code, 409)

    def test_token_is_stored_hashed_and_basic_auth_works(self):
        emp, tok = bootstrap(self.client)
        raw = self.conn.execute("SELECT token_hash FROM api_tokens").fetchone()[0]
        self.assertNotEqual(raw, tok)
        import base64
        b = base64.b64encode(f"{tok}:".encode()).decode()
        r = self.client.get("/v1/empresa", headers={"Authorization": f"Basic {b}"})
        self.assertEqual(r.status_code, 200)
        self.assertNotIn("webhook_secret", r.json)

    def test_cert_of_other_company_and_wrong_password_rejected(self):
        import base64
        r = self.client.post("/admin/empresas", headers=H(ADMIN), json={
            "cnpj": CNPJ, "razao_social": "X", "codigo_municipio": "3548708", "regime": "mei"})
        eid = r.json["id"]
        r = self.client.put(f"/admin/empresas/{eid}/certificado", headers=H(ADMIN),
                            json={"pfx_base64": base64.b64encode(make_pfx()).decode(), "senha": "errada"})
        self.assertEqual(r.status_code, 422)
        r = self.client.put(f"/admin/empresas/{eid}/certificado", headers=H(ADMIN),
                            json={"pfx_base64": base64.b64encode(make_pfx(cnpj="99888777000161", senha="a")).decode(), "senha": "a"})
        self.assertEqual(r.json["codigo"], "certificado_divergente")
        r = self.client.put(f"/admin/empresas/{eid}/certificado", headers=H(ADMIN),
                            json={"pfx_base64": base64.b64encode(make_pfx(expired=True)).decode(), "senha": "s3nh4-teste"})
        self.assertEqual(r.json["codigo"], "certificado_vencido")

    def test_cannot_emit_without_certificate(self):
        r = self.client.post("/admin/empresas", headers=H(ADMIN), json={
            "cnpj": CNPJ, "razao_social": "X", "codigo_municipio": "3548708", "regime": "mei"})
        r = self.client.post("/v1/nfse?ref=a", headers=H(r.json["token"]), json=NFSE)
        self.assertEqual(r.json["codigo"], "sem_certificado")


class EmissionFlow(Base):
    def setUp(self):
        super().setUp()
        self.emp, self.tok = bootstrap(self.client, webhook_url="https://app.exemplo.com/hook")
        self.h = H(self.tok)

    def test_happy_path_with_webhook_and_idempotency(self):
        r = self.client.post("/v1/nfse?ref=pedido-1", headers=self.h, json=NFSE)
        self.assertEqual(r.status_code, 202)
        self.assertEqual(r.json["status"], "processando_autorizacao")
        # reenvio identico: idempotente, nao cria segundo job
        r2 = self.client.post("/v1/nfse?ref=pedido-1", headers=self.h, json=NFSE)
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM jobs").fetchone()[0], 1)
        self.drain()
        g = self.client.get("/v1/nfse/pedido-1", headers=self.h).json
        self.assertEqual(g["status"], "autorizado")
        self.assertEqual(g["numero_dps"], 1)
        self.assertEqual(len(g["chave_acesso"]), 50)
        self.assertEqual(self.client.get("/v1/nfse/pedido-1/xml", headers=self.h).status_code, 200)
        # webhook assinado
        self.assertEqual(len(self.wh_calls), 1)
        url, body, hdr = self.wh_calls[0]
        import hashlib, hmac
        secret = self.emp["webhook_secret"].encode()
        exp = hmac.new(secret, hdr["X-Notas-Timestamp"].encode() + b"." + body, hashlib.sha256).hexdigest()
        self.assertEqual(hdr["X-Notas-Signature"], "sha256=" + exp)
        self.assertEqual(json.loads(body)["evento"], "nfse.autorizada")
        # mesmo conteudo depois de autorizado continua idempotente; conteudo diferente = 409
        self.assertEqual(self.client.post("/v1/nfse?ref=pedido-1", headers=self.h, json=NFSE).status_code, 200)
        other = self.payload(); other["valores"]["valor_servico"] = "1.00"
        self.assertEqual(self.client.post("/v1/nfse?ref=pedido-1", headers=self.h, json=other).status_code, 409)

    def test_sequential_numbering_per_company(self):
        for i in range(3):
            self.client.post(f"/v1/nfse?ref=r{i}", headers=self.h, json=NFSE)
        self.drain()
        nums = [self.client.get(f"/v1/nfse/r{i}", headers=self.h).json["numero_dps"] for i in range(3)]
        self.assertEqual(nums, [1, 2, 3])

    def test_validation_errors_are_field_level(self):
        bad = self.payload(); bad["tomador"]["cpf_cnpj"] = "111"; bad["valores"]["valor_servico"] = "10.005"
        r = self.client.post("/v1/nfse?ref=x", headers=self.h, json=bad)
        self.assertEqual(r.status_code, 422)
        campos = {e["campo"] for e in r.json["erros"]}
        self.assertEqual(campos, {"tomador.cpf_cnpj", "valores.valor_servico"})
        self.assertEqual(self.client.post("/v1/nfse", headers=self.h, json=NFSE).status_code, 400)  # sem ref

    def test_rejection_then_corrected_resubmit_gets_new_number(self):
        self.client.post("/v1/nfse?ref=rej", headers=self.h, json=self.payload("[[rejeitar]]"))
        self.drain()
        g = self.client.get("/v1/nfse/rej", headers=self.h).json
        self.assertEqual(g["status"], "erro_autorizacao")
        self.assertEqual(g["erros"][0]["codigo"], "MOCK001")
        r = self.client.post("/v1/nfse?ref=rej", headers=self.h, json=self.payload("Corrigido"))
        self.assertEqual(r.status_code, 202)
        self.drain()
        g = self.client.get("/v1/nfse/rej", headers=self.h).json
        self.assertEqual(g["status"], "autorizado")
        self.assertEqual(g["numero_dps"], 2)
        self.assertEqual([json.loads(c[1])["evento"] for c in self.wh_calls], ["nfse.rejeitada", "nfse.autorizada"])

    def test_transient_failure_retries_with_backoff_and_reuses_number(self):
        self.client.post("/v1/nfse?ref=t1", headers=self.h, json=self.payload("[[falha]]"))
        self.drain()
        g = self.client.get("/v1/nfse/t1", headers=self.h).json
        self.assertEqual(g["status"], "processando_autorizacao")  # ainda tentando
        self.drain()  # sem avancar o relogio: nada executa
        self.assertEqual(self.client.get("/v1/nfse/t1", headers=self.h).json["status"], "processando_autorizacao")
        self.drain(advance=20)
        g = self.client.get("/v1/nfse/t1", headers=self.h).json
        self.assertEqual(g["status"], "autorizado")
        self.assertEqual(g["numero_dps"], 1)  # nao renumerou

    def test_exhausted_retries_become_uncertain_and_only_same_payload_can_reconcile(self):
        class Down(MockDriver):
            def submit(self, *a, **k):
                from app.drivers.base import DriverResult, TRANSITORIO
                return DriverResult(TRANSITORIO, erros=[{"codigo": "REDE", "mensagem": "x"}])
        self.worker.driver = Down()
        self.client.post("/v1/nfse?ref=u1", headers=self.h, json=NFSE)
        for _ in range(self.cfg.max_attempts):
            self.drain(advance=100000)
        g = self.client.get("/v1/nfse/u1", headers=self.h).json
        self.assertEqual(g["status"], "erro_autorizacao")
        self.assertEqual(g["erros"][0]["codigo"], "TENTATIVAS_ESGOTADAS")
        self.assertEqual(json.loads(self.wh_calls[-1][1])["evento"], "nfse.incerta")
        changed = self.payload(); changed["valores"]["valor_servico"] = "2.00"
        self.assertEqual(self.client.post("/v1/nfse?ref=u1", headers=self.h, json=changed).json["codigo"], "situacao_incerta")
        # mesmo payload -> reconcilia; driver volta a funcionar e a numeracao e reaproveitada
        self.worker.driver = MockDriver()
        self.assertEqual(self.client.post("/v1/nfse?ref=u1", headers=self.h, json=NFSE).status_code, 202)
        self.drain(advance=100000)
        g = self.client.get("/v1/nfse/u1", headers=self.h).json
        self.assertEqual((g["status"], g["numero_dps"]), ("autorizado", 1))

    def test_local_validation_failure_does_not_burn_a_number(self):
        from app.drivers.base import LocalValidationError
        class Bad(MockDriver):
            def build_signed(self, *a, **k):
                raise LocalValidationError([{"codigo": "XSD_INVALIDO", "mensagem": "x"}])
        self.worker.driver = Bad()
        self.client.post("/v1/nfse?ref=l1", headers=self.h, json=NFSE)
        self.drain()
        self.assertEqual(self.client.get("/v1/nfse/l1", headers=self.h).json["status"], "erro_autorizacao")
        self.worker.driver = MockDriver()
        self.client.post("/v1/nfse?ref=l2", headers=self.h, json=NFSE)
        self.drain()
        self.assertEqual(self.client.get("/v1/nfse/l2", headers=self.h).json["numero_dps"], 1)

    def test_cancel_flow_and_state_guards(self):
        self.assertEqual(self.client.delete("/v1/nfse/nada", headers=self.h, json={"justificativa": "a" * 20}).status_code, 404)
        self.client.post("/v1/nfse?ref=c1", headers=self.h, json=NFSE)
        self.assertEqual(self.client.delete("/v1/nfse/c1", headers=self.h, json={"justificativa": "a" * 20}).status_code, 409)  # ainda processando
        self.drain()
        self.assertEqual(self.client.delete("/v1/nfse/c1", headers=self.h, json={"justificativa": "curta"}).status_code, 422)
        r = self.client.delete("/v1/nfse/c1", headers=self.h, json={"justificativa": "Servico nao prestado ao cliente"})
        self.assertEqual((r.status_code, r.json["status"]), (202, "processando_cancelamento"))
        self.drain()
        self.assertEqual(self.client.get("/v1/nfse/c1", headers=self.h).json["status"], "cancelado")
        self.assertEqual(json.loads(self.wh_calls[-1][1])["evento"], "nfse.cancelada")

    def test_webhook_retry_then_success(self):
        self.wh_code = 500
        self.client.post("/v1/nfse?ref=w1", headers=self.h, json=NFSE)
        self.drain()
        self.assertEqual(self.conn.execute("SELECT status FROM webhook_outbox").fetchone()[0], "pendente")
        self.wh_code = 200
        self.drain(advance=60)
        self.assertEqual(self.conn.execute("SELECT status FROM webhook_outbox").fetchone()[0], "entregue")

    def test_tenant_isolation(self):
        self.client.post("/v1/nfse?ref=iso", headers=self.h, json=NFSE)
        r = self.client.post("/admin/empresas", headers=H(ADMIN), json={
            "cnpj": "45997418000153", "razao_social": "Outra", "codigo_municipio": "3548708", "regime": "mei"})
        r = self.client.get("/v1/nfse/iso", headers=H(r.json["token"]))
        self.assertEqual(r.status_code, 404)

    def test_mock_driver_refuses_production(self):
        self.client.patch(f"/admin/empresas/{self.emp['id']}", headers=H(ADMIN), json={"ambiente": "producao"})
        self.client.post("/v1/nfse?ref=p1", headers=self.h, json=NFSE)
        self.drain()
        g = self.client.get("/v1/nfse/p1", headers=self.h).json
        self.assertEqual(g["status"], "erro_autorizacao")
        self.assertIn("mock", g["erros"][0]["mensagem"])


if __name__ == "__main__":
    unittest.main()
