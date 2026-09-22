from __future__ import annotations

import base64
import os
from dataclasses import dataclass


class ConfigError(RuntimeError):
    pass


def _flag(v: str | None, default: bool = False) -> bool:
    if v is None or v == "":
        return default
    return v.strip().lower() in ("1", "true", "yes", "on")


@dataclass(frozen=True)
class Config:
    db_path: str = "data/notas.db"
    master_key: bytes = b""
    admin_token: str = ""
    driver: str = "mock"
    sefin_url_homologacao: str = "https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional"
    sefin_url_producao: str = "https://sefin.nfse.gov.br/API/SefinNacional"
    sefin_ca_bundle: str | None = None
    signature_hash: str = "sha1"
    http_timeout: int = 30
    xsd_dir: str | None = None
    xsd_required: bool = False
    max_attempts: int = 6
    allow_insecure_webhooks: bool = False
    ver_aplic: str = "notas-api-0.1"

    def validate(self) -> "Config":
        if len(self.master_key) != 32:
            raise ConfigError("MASTER_KEY deve ser base64 de 32 bytes (use: python -m app.cli genkey)")
        if len(self.admin_token) < 24:
            raise ConfigError("ADMIN_TOKEN deve ter pelo menos 24 caracteres")
        if self.driver not in ("mock", "nfse_nacional"):
            raise ConfigError("DRIVER deve ser 'mock' ou 'nfse_nacional'")
        if self.signature_hash not in ("sha1", "sha256"):
            raise ConfigError("SIGNATURE_HASH deve ser 'sha1' ou 'sha256'")
        return self

    @classmethod
    def from_env(cls, env=None) -> "Config":
        env = os.environ if env is None else env
        try:
            key = base64.b64decode(env.get("MASTER_KEY", ""), validate=True)
        except Exception as exc:  # noqa: BLE001
            raise ConfigError("MASTER_KEY invalida (base64)") from exc
        d = cls()
        return cls(
            db_path=env.get("DB_PATH", d.db_path),
            master_key=key,
            admin_token=env.get("ADMIN_TOKEN", ""),
            driver=env.get("DRIVER", d.driver),
            sefin_url_homologacao=env.get("SEFIN_URL_HOMOLOGACAO", d.sefin_url_homologacao),
            sefin_url_producao=env.get("SEFIN_URL_PRODUCAO", d.sefin_url_producao),
            sefin_ca_bundle=env.get("SEFIN_CA_BUNDLE") or None,
            signature_hash=env.get("SIGNATURE_HASH", d.signature_hash).lower(),
            http_timeout=int(env.get("HTTP_TIMEOUT", d.http_timeout)),
            xsd_dir=env.get("XSD_DIR") or None,
            xsd_required=_flag(env.get("XSD_REQUIRED")),
            max_attempts=int(env.get("MAX_ATTEMPTS", d.max_attempts)),
            allow_insecure_webhooks=_flag(env.get("ALLOW_INSECURE_WEBHOOKS")),
        ).validate()
