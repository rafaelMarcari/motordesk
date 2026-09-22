"""Leitura de certificado A1 (PKCS#12) ICP-Brasil e empacotamento cifrado."""
from __future__ import annotations

import base64
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.x509.oid import NameOID

from .security import Vault

OID_CNPJ_ICP = "2.16.76.1.3.3"


class CertError(Exception):
    pass


@dataclass
class CertInfo:
    subject: str
    cnpj: str | None
    not_before: datetime
    not_after: datetime
    fingerprint: str

    @property
    def expired(self) -> bool:
        return self.not_after <= datetime.now(timezone.utc)


@dataclass
class LoadedCert:
    key: rsa.RSAPrivateKey
    cert: x509.Certificate
    chain: list[x509.Certificate]
    info: CertInfo

    def cert_der_b64(self) -> str:
        return base64.b64encode(self.cert.public_bytes(serialization.Encoding.DER)).decode()

    def key_pem(self) -> bytes:
        return self.key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )

    def chain_pem(self) -> bytes:
        certs = [self.cert, *self.chain]
        return b"".join(c.public_bytes(serialization.Encoding.PEM) for c in certs)


def _cnpj_from_cert(cert: x509.Certificate) -> str | None:
    try:
        san = cert.extensions.get_extension_for_class(x509.SubjectAlternativeName).value
        for name in san:
            if isinstance(name, x509.OtherName) and name.type_id.dotted_string == OID_CNPJ_ICP:
                m = re.search(rb"\d{14}", name.value)
                if m:
                    return m.group(0).decode()
    except x509.ExtensionNotFound:
        pass
    cn = cert.subject.get_attributes_for_oid(NameOID.COMMON_NAME)
    if cn:
        m = re.search(r":\s*(\d{14})\b", cn[0].value)
        if m:
            return m.group(1)
    return None


def parse_pfx(pfx: bytes, password: str) -> LoadedCert:
    try:
        key, cert, extra = pkcs12.load_key_and_certificates(pfx, password.encode())
    except Exception as exc:  # noqa: BLE001
        raise CertError("nao foi possivel abrir o PFX (arquivo invalido ou senha incorreta)") from exc
    if key is None or cert is None:
        raise CertError("PFX sem chave privada ou certificado")
    if not isinstance(key, rsa.RSAPrivateKey):
        raise CertError("apenas chaves RSA sao suportadas")
    info = CertInfo(
        subject=cert.subject.rfc4514_string(),
        cnpj=_cnpj_from_cert(cert),
        not_before=cert.not_valid_before_utc,
        not_after=cert.not_valid_after_utc,
        fingerprint=cert.fingerprint(hashes.SHA256()).hex(),
    )
    return LoadedCert(key=key, cert=cert, chain=list(extra or []), info=info)


def pack(vault: Vault, empresa_id: str, pfx: bytes, password: str) -> bytes:
    raw = json.dumps({"pfx": base64.b64encode(pfx).decode(), "senha": password}).encode()
    return vault.encrypt(raw, aad=empresa_id.encode())


def unpack(vault: Vault, empresa_id: str, blob: bytes) -> LoadedCert:
    data = json.loads(vault.decrypt(blob, aad=empresa_id.encode()))
    return parse_pfx(base64.b64decode(data["pfx"]), data["senha"])
