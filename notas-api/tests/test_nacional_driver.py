import base64
import datetime as dt
import gzip
import http.server
import json
import os
import ssl
import tempfile
import threading
import time
import unittest

import requests
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
import ipaddress

from app import certs, db, xmlsign
from app.drivers.base import OK, REJEITADO, TRANSITORIO, Ctx, LocalValidationError
from app.drivers.nfse_nacional import NfseNacionalDriver, SefinClient
from app.security import Vault
from app.worker import Worker

from tests.helpers import CNPJ, H, NFSE, SENHA, bootstrap, make_cfg, make_pfx, new_app
from tests.test_security_certs_sign import EMPRESA, PAYLOAD

CHAVE = "35487082211222333000181000000000000042" + "0" * 12
assert len(CHAVE) == 50
NFSE_XML = (f'<NFSe xmlns="http://www.sped.fazenda.gov.br/nfse"><infNFSe Id="NFS{CHAVE}">'
            f'<nNFSe>42</nNFSe></infNFSe></NFSe>')


def nfse_body(with_chave=True):
    b = {"nfseXmlGZipB64": base64.b64encode(gzip.compress(NFSE_XML.encode())).decode()}
    if with_chave:
        b["chaveAcesso"] = CHAVE
    return b


class FakeClient:
    """Cliente roteirizado: respostas por metodo; registra chamadas."""

    def __init__(self, post=(200, None), dps=(404, {}), nfse=(200, None), raise_on_post=None):
        self.script = {"post": post, "dps": dps, "nfse": nfse}
        self.calls, self.raise_on_post = [], raise_on_post

    def __enter__(self): return self
    def __exit__(self, *a): pass

    def post_dps(self, xml):
        self.calls.append("post")
        if self.raise_on_post:
            raise self.raise_on_post
        s, b = self.script["post"]
        return s, b if b is not None else nfse_body()

    def get_dps(self, i):
        self.calls.append("get_dps")
        return self.script["dps"]

    def get_nfse(self, c):
        self.calls.append("get_nfse")
        s, b = self.script["nfse"]
        return s, b if b is not None else nfse_body(False)


class DriverInterpretation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cert = certs.parse_pfx(make_pfx(), SENHA)
        cls.tmp = tempfile.TemporaryDirectory()
        cls.cfg = make_cfg(cls.tmp.name, driver="nfse_nacional")

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def drv(self, client):
        return NfseNacionalDriver(self.cfg, client_factory=lambda ctx: client)

    def ctx(self):
        return Ctx(EMPRESA, PAYLOAD, self.cert, "homologacao")

    def build(self, drv=None):
        return (drv or self.drv(None)).build_signed(self.ctx(), "1", 5)

    def test_ok(self):
        dps_id, xml = self.build()
        r = self.drv(FakeClient()).submit(self.ctx(), dps_id, xml, 0)
        self.assertEqual((r.outcome, r.chave_acesso, r.numero_nfse), (OK, CHAVE, "42"))
        self.assertIn("infNFSe", r.xml_autorizado)

    def test_chave_falls_back_to_infnfse_id(self):
        c = FakeClient(post=(200, nfse_body(with_chave=False)))
        r = self.drv(c).submit(self.ctx(), "x", b"<a/>", 0)
        self.assertEqual(r.chave_acesso, CHAVE)

    def test_rejection_parses_both_error_shapes(self):
        c = FakeClient(post=(400, {"erros": [{"Codigo": "E0001", "Descricao": "Campo invalido", "Complemento": "toma/CPF"}]}))
        r = self.drv(c).submit(self.ctx(), "x", b"<a/>", 0)
        self.assertEqual(r.outcome, REJEITADO)
        self.assertEqual((r.erros[0]["codigo"], r.erros[0]["mensagem"]), ("E0001", "Campo invalido"))
        c = FakeClient(post=(422, {"erro": {"codigo": "E0002", "descricao": "Outro"}}))
        self.assertEqual(self.drv(c).submit(self.ctx(), "x", b"<a/>", 0).erros[0]["codigo"], "E0002")

    def test_403_hints_mtls(self):
        r = self.drv(FakeClient(post=(403, {"raw": "forbidden"}))).submit(self.ctx(), "x", b"<a/>", 0)
        self.assertEqual((r.outcome, r.erros[0]["codigo"]), (REJEITADO, "HTTP_403"))

    def test_transient_cases(self):
        for c in (FakeClient(post=(500, {})), FakeClient(post=(429, {})),
                  FakeClient(raise_on_post=requests.Timeout()),
                  FakeClient(post=(200, {"chaveAcesso": CHAVE}))):  # 200 sem XML nao e sucesso
            self.assertEqual(self.drv(c).submit(self.ctx(), "x", b"<a/>", 0).outcome, TRANSITORIO)

    def test_retry_checks_authority_before_posting_again(self):
        c = FakeClient(dps=(200, {"chaveAcesso": CHAVE}))
        r = self.drv(c).submit(self.ctx(), "x", b"<a/>", attempt=1)
        self.assertEqual(r.outcome, OK)
        self.assertNotIn("post", c.calls)  # nao reenviou: evita nota duplicada

    def test_retry_when_authority_has_nothing_posts_normally(self):
        c = FakeClient(dps=(404, {}))
        self.assertEqual(self.drv(c).submit(self.ctx(), "x", b"<a/>", attempt=1).outcome, OK)
        self.assertEqual(c.calls[:2], ["get_dps", "post"])

    def test_409_recovers_via_lookup(self):
        c = FakeClient(post=(409, {"erros": [{"codigo": "DUP", "descricao": "DPS duplicada"}]}),
                       dps=(200, {"chaveAcesso": CHAVE}))
        self.assertEqual(self.drv(c).submit(self.ctx(), "x", b"<a/>", 0).outcome, OK)

    def test_xsd_required_without_schema_blocks_before_transmit(self):
        cfg = make_cfg(self.tmp.name, driver="nfse_nacional", xsd_required=True, xsd_dir=self.tmp.name)
        with self.assertRaises(LocalValidationError) as cm:
            NfseNacionalDriver(cfg).build_signed(self.ctx(), "1", 1)
        self.assertEqual(cm.exception.erros[0]["codigo"], "XSD_AUSENTE")

    def test_xsd_validation_catches_bad_document(self):
        """Com um XSD (de brinquedo) presente, documento fora do leiaute e barrado localmente."""
        xsd = ('<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" '
               'targetNamespace="http://www.sped.fazenda.gov.br/nfse" xmlns="http://www.sped.fazenda.gov.br/nfse" '
               'elementFormDefault="qualified"><xs:element name="DPS"><xs:complexType><xs:sequence>'
               '<xs:element name="inexistente"/></xs:sequence></xs:complexType></xs:element></xs:schema>')
        with tempfile.TemporaryDirectory() as d:
            open(os.path.join(d, "DPS_v1.00.xsd"), "w").write(xsd)
            cfg = make_cfg(self.tmp.name, driver="nfse_nacional", xsd_dir=d)
            with self.assertRaises(LocalValidationError) as cm:
                NfseNacionalDriver(cfg).build_signed(self.ctx(), "1", 1)
            self.assertEqual(cm.exception.erros[0]["codigo"], "XSD_INVALIDO")

    def test_cancel_not_implemented_is_reported_not_crashed(self):
        with self.assertRaises(NotImplementedError):
            self.drv(FakeClient()).cancel(self.ctx(), CHAVE, "x" * 20, 0)


class EndToEndWithNacionalDriver(unittest.TestCase):
    def test_api_to_authorized_with_real_signing_and_fake_transport(self):
        with tempfile.TemporaryDirectory() as tmp:
            cfg, app = new_app(tmp, driver="nfse_nacional")
            client = app.test_client()
            emp, tok = bootstrap(client)
            conn = db.connect(cfg.db_path)
            fake = FakeClient()
            w = Worker(conn, cfg, Vault(cfg.master_key), NfseNacionalDriver(cfg, client_factory=lambda ctx: fake))
            self.assertEqual(client.post("/v1/nfse?ref=e2e", headers=H(tok), json=NFSE).status_code, 202)
            while w.run_once():
                pass
            g = client.get("/v1/nfse/e2e", headers=H(tok)).json
            self.assertEqual((g["status"], g["numero_nfse"], g["chave_acesso"]), ("autorizado", "42", CHAVE))
            stored = conn.execute("SELECT xml_dps FROM documentos").fetchone()[0]
            self.assertTrue(xmlsign.verify(stored))  # o que foi guardado/enviado tem assinatura valida
            conn.close()


# ---------------- mTLS de verdade contra servidor HTTPS local ----------------
def _cert(subject_cn, issuer=None, issuer_key=None, san=None, ca=False):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, subject_cn)])
    now = dt.datetime.now(dt.timezone.utc)
    b = (x509.CertificateBuilder().subject_name(name).issuer_name(issuer or name).public_key(key.public_key())
         .serial_number(x509.random_serial_number()).not_valid_before(now - dt.timedelta(days=1))
         .not_valid_after(now + dt.timedelta(days=30))
         .add_extension(x509.BasicConstraints(ca=ca, path_length=None), critical=True))
    if san:
        b = b.add_extension(x509.SubjectAlternativeName(san), critical=False)
    return key, b.sign(issuer_key or key, hashes.SHA256())


class MtlsTransport(unittest.TestCase):
    def test_client_presents_certificate_and_payload_is_gzip_b64(self):
        seen = {}
        with tempfile.TemporaryDirectory() as d:
            ca_key, ca = _cert("CA de teste", ca=True)
            srv_key, srv = _cert("localhost", issuer=ca.subject, issuer_key=ca_key,
                                 san=[x509.DNSName("localhost"), x509.IPAddress(ipaddress.ip_address("127.0.0.1"))])
            P = lambda n: os.path.join(d, n)
            open(P("ca.pem"), "wb").write(ca.public_bytes(serialization.Encoding.PEM))
            open(P("srv.pem"), "wb").write(srv.public_bytes(serialization.Encoding.PEM))
            open(P("srv.key"), "wb").write(srv_key.private_bytes(serialization.Encoding.PEM,
                                                                 serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
            client_cert = certs.parse_pfx(make_pfx(), SENHA)
            ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            ctx.load_cert_chain(P("srv.pem"), P("srv.key"))
            ctx.verify_mode = ssl.CERT_REQUIRED
            ctx.load_verify_locations(cadata=client_cert.chain_pem().decode())

            class H_(http.server.BaseHTTPRequestHandler):
                def do_POST(self):
                    seen["path"] = self.path
                    seen["peer"] = self.connection.getpeercert()["subject"]
                    n = int(self.headers["Content-Length"])
                    seen["body"] = json.loads(self.rfile.read(n))
                    out = json.dumps(nfse_body()).encode()
                    self.send_response(201); self.send_header("Content-Type", "application/json")
                    self.send_header("Content-Length", str(len(out))); self.end_headers(); self.wfile.write(out)
                def log_message(self, *a): pass

            httpd = http.server.HTTPServer(("127.0.0.1", 0), H_)
            httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)
            threading.Thread(target=httpd.serve_forever, daemon=True).start()
            try:
                base = f"https://127.0.0.1:{httpd.server_address[1]}/API/SefinNacional"
                with SefinClient(base, client_cert, P("ca.pem"), 10) as c:
                    key_path = c._key_file
                    status, body = c.post_dps(b"<DPS>oi</DPS>")
                self.assertFalse(os.path.exists(key_path), "PEM da chave privada deve ser apagado ao sair")
                self.assertEqual(status, 201)
                self.assertEqual(seen["path"], "/API/SefinNacional/nfse")
                self.assertIn(CNPJ, str(seen["peer"]))  # servidor viu o certificado do cliente
                self.assertEqual(gzip.decompress(base64.b64decode(seen["body"]["dpsXmlGZipB64"])), b"<DPS>oi</DPS>")
                # sem certificado de cliente a conexao e recusada
                with self.assertRaises(requests.RequestException):
                    requests.post(base + "/nfse", json={}, verify=P("ca.pem"), timeout=5)
            finally:
                httpd.shutdown()
                httpd.server_close()


if __name__ == "__main__":
    unittest.main()
