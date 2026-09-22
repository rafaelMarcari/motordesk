import base64
import datetime as dt
import os
import tempfile

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.x509.oid import NameOID

from app import create_app
from app.config import Config

CNPJ = "11222333000181"          # CNPJ valido (digitos verificadores corretos)
SENHA = "s3nh4-teste"
ADMIN = "admin-token-de-teste-1234567890"


def make_pfx(cnpj=CNPJ, senha=SENHA, days=365, expired=False) -> bytes:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    now = dt.datetime.now(dt.timezone.utc)
    start, end = (now - dt.timedelta(days=400), now - dt.timedelta(days=10)) if expired else (now - dt.timedelta(days=1), now + dt.timedelta(days=days))
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, f"EMPRESA TESTE LTDA:{cnpj}")])
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
            .serial_number(x509.random_serial_number()).not_valid_before(start).not_valid_after(end)
            .sign(key, hashes.SHA256()))
    return pkcs12.serialize_key_and_certificates(b"teste", key, cert, None,
                                                 serialization.BestAvailableEncryption(senha.encode()))


def make_cfg(tmpdir, **kw):
    return Config(db_path=os.path.join(tmpdir, "t.db"), master_key=os.urandom(32), admin_token=ADMIN,
                  driver=kw.pop("driver", "mock"), **kw).validate()


def new_app(tmpdir, **kw):
    cfg = make_cfg(tmpdir, **kw)
    return cfg, create_app(cfg)


def H(token):
    return {"Authorization": f"Bearer {token}"}


def bootstrap(client, regime="simples", **extra):
    """Cria empresa + certificado; devolve (empresa_json, token)."""
    r = client.post("/admin/empresas", headers=H(ADMIN), json={
        "cnpj": CNPJ, "razao_social": "Empresa Teste Ltda", "codigo_municipio": "3548708",
        "regime": regime, "inscricao_municipal": "12345", **extra})
    assert r.status_code == 201, r.json
    emp = r.json
    r = client.put(f"/admin/empresas/{emp['id']}/certificado", headers=H(ADMIN),
                   json={"pfx_base64": base64.b64encode(make_pfx()).decode(), "senha": SENHA})
    assert r.status_code == 200, r.json
    return emp, emp["token"]


NFSE = {
    "tomador": {"cpf_cnpj": "529.982.247-25", "razao_social": "Fulano de Tal", "email": "f@ex.com",
                "endereco": {"logradouro": "Rua A", "numero": "10", "bairro": "Centro",
                             "codigo_municipio": "3550308", "cep": "01001-000"}},
    "servico": {"codigo_tributacao_nacional": "010101", "descricao": "Desenvolvimento de software"},
    "valores": {"valor_servico": "1500.00"},
}
