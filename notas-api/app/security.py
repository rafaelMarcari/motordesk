from __future__ import annotations

import hashlib
import hmac
import os
import secrets

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


class VaultError(Exception):
    pass


class Vault:
    """AES-256-GCM com a chave-mestra do ambiente. Em producao, prefira KMS/HSM."""

    def __init__(self, master_key: bytes):
        if len(master_key) != 32:
            raise VaultError("chave-mestra deve ter 32 bytes")
        self._aead = AESGCM(master_key)

    def encrypt(self, plaintext: bytes, aad: bytes) -> bytes:
        nonce = os.urandom(12)
        return nonce + self._aead.encrypt(nonce, plaintext, aad)

    def decrypt(self, blob: bytes, aad: bytes) -> bytes:
        try:
            return self._aead.decrypt(blob[:12], blob[12:], aad)
        except InvalidTag as exc:
            raise VaultError("falha ao decifrar (chave-mestra errada ou dado adulterado)") from exc


def new_token() -> str:
    return "nfa_" + secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def safe_equals(a: str, b: str) -> bool:
    return hmac.compare_digest(a.encode(), b.encode())
