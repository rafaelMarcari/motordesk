import base64
import copy
import os
import subprocess
import tempfile
import unittest

from lxml import etree

from app import certs, xmlsign
from app.drivers.nfse_nacional import NS, build_dps
from app.security import Vault, VaultError
from app.validators import valid_cnpj, valid_cpf
from datetime import datetime
from zoneinfo import ZoneInfo

from tests.helpers import CNPJ, SENHA, make_pfx

EMPRESA = {"cnpj": CNPJ, "codigo_municipio": "3548708", "inscricao_municipal": "12345",
           "regime": "simples", "reg_ap_trib_sn": 1}
PAYLOAD = {"data_competencia": None,
           "tomador": {"cpf_cnpj": "52998224725", "razao_social": "Fulano", "email": None, "telefone": None, "endereco": None},
           "servico": {"codigo_tributacao_nacional": "010101", "descricao": "Servico", "codigo_municipio_prestacao": "3548708"},
           "valores": {"valor_servico": "100.00", "iss_retido": False, "aliquota_iss": None}}
NOW = datetime(2026, 9, 21, 10, 0, 0, tzinfo=ZoneInfo("America/Sao_Paulo"))


class VaultTests(unittest.TestCase):
    def test_roundtrip_and_tamper(self):
        v = Vault(os.urandom(32))
        blob = v.encrypt(b"segredo", b"aad")
        self.assertEqual(v.decrypt(blob, b"aad"), b"segredo")
        with self.assertRaises(VaultError):
            v.decrypt(blob, b"outro-aad")
        with self.assertRaises(VaultError):
            v.decrypt(blob[:-1] + bytes([blob[-1] ^ 1]), b"aad")
        with self.assertRaises(VaultError):
            Vault(os.urandom(32)).decrypt(blob, b"aad")


class DocValidators(unittest.TestCase):
    def test_docs(self):
        self.assertTrue(valid_cnpj("11.222.333/0001-81"))
        self.assertFalse(valid_cnpj("11222333000182"))
        self.assertFalse(valid_cnpj("00000000000000"))
        self.assertTrue(valid_cpf("529.982.247-25"))
        self.assertFalse(valid_cpf("11111111111"))


class CertTests(unittest.TestCase):
    def test_parse_and_wrong_password(self):
        pfx = make_pfx()
        c = certs.parse_pfx(pfx, SENHA)
        self.assertEqual(c.info.cnpj, CNPJ)
        self.assertFalse(c.info.expired)
        with self.assertRaises(certs.CertError):
            certs.parse_pfx(pfx, "errada")
        self.assertTrue(certs.parse_pfx(make_pfx(expired=True), SENHA).info.expired)

    def test_vault_pack_unpack(self):
        v = Vault(os.urandom(32))
        blob = certs.pack(v, "emp-1", make_pfx(), SENHA)
        self.assertEqual(certs.unpack(v, "emp-1", blob).info.cnpj, CNPJ)
        with self.assertRaises(VaultError):
            certs.unpack(v, "emp-2", blob)  # AAD amarra o blob a empresa


class SignTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cert = certs.parse_pfx(make_pfx(), SENHA)

    def _signed(self, hash_name):
        root, dps_id = build_dps(EMPRESA, PAYLOAD, "1", 7, "2", NOW, "t")
        xmlsign.sign_element(root, dps_id, self.cert, hash_name)
        return etree.tostring(root, encoding="UTF-8", xml_declaration=True), dps_id

    def test_sign_and_verify_both_hashes(self):
        for h in ("sha1", "sha256"):
            xml, _ = self._signed(h)
            self.assertTrue(xmlsign.verify(xml), h)

    def test_tamper_detected(self):
        xml, _ = self._signed("sha1")
        self.assertFalse(xmlsign.verify(xml.replace(b"<vServ>100.00", b"<vServ>999.00")))

    def test_canonical_form_is_what_we_think(self):
        # C14N inclusivo do infDPS deve carregar o namespace herdado no elemento raiz do subconjunto
        root, dps_id = build_dps(EMPRESA, PAYLOAD, "1", 7, "2", NOW, "t")
        c = xmlsign.c14n(root[0])
        self.assertTrue(c.startswith(f'<infDPS xmlns="{NS}" Id="{dps_id}">'.encode()), c[:120])

    def test_independent_verification_with_openssl(self):
        """Confere a assinatura RSA com o OpenSSL CLI (implementacao independente da nossa)."""
        xml, _ = self._signed("sha1")
        root = etree.fromstring(xml)
        dsig = "{%s}" % xmlsign.NS
        si = root.find(f".//{dsig}SignedInfo")
        with tempfile.TemporaryDirectory() as d:
            p = lambda n: os.path.join(d, n)
            for name, data in (("si.bin", xmlsign.c14n(si)),
                               ("sig.bin", base64.b64decode(root.find(f".//{dsig}SignatureValue").text)),
                               ("cert.der", base64.b64decode(root.find(f".//{dsig}X509Certificate").text))):
                with open(p(name), "wb") as f:
                    f.write(data)
            subprocess.run(["openssl", "x509", "-inform", "DER", "-in", p("cert.der"), "-pubkey", "-noout", "-out", p("pub.pem")], check=True)
            r = subprocess.run(["openssl", "dgst", "-sha1", "-verify", p("pub.pem"), "-signature", p("sig.bin"), p("si.bin")],
                               capture_output=True, text=True)
            self.assertIn("Verified OK", r.stdout, r.stderr)

    def test_dps_shape(self):
        xml, dps_id = self._signed("sha1")
        self.assertEqual(len(dps_id), 45)
        self.assertEqual(dps_id, f"DPS35487082{CNPJ}00001000000000000007")
        root = etree.fromstring(xml)
        inf = root[0]
        order = [etree.QName(e).localname for e in inf]
        self.assertEqual(order, ["tpAmb", "dhEmi", "verAplic", "serie", "nDPS", "dCompet", "tpEmit", "cLocEmi",
                                 "prest", "toma", "serv", "valores"])
        self.assertEqual(etree.QName(root[1]).localname, "Signature")
        self.assertIn(b"<dhEmi>2026-09-21T09:59:00-03:00</dhEmi>", xml)  # margem de 60s
        self.assertNotIn(b"pAliq", xml)  # Simples: aliquota nao informada
        self.assertNotIn(b">\n", xml.split(b"?>", 1)[1])  # sem pretty-print


if __name__ == "__main__":
    unittest.main()
