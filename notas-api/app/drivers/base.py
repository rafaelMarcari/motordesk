from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from ..certs import LoadedCert

OK, REJEITADO, TRANSITORIO = "ok", "rejeitado", "transitorio"


class LocalValidationError(Exception):
    """Falha ANTES de transmitir (montagem/XSD). Nao consome numeracao."""

    def __init__(self, erros: list[dict]):
        super().__init__("; ".join(e.get("mensagem", "") for e in erros))
        self.erros = erros


@dataclass
class Ctx:
    empresa: dict
    payload: dict
    cert: LoadedCert
    ambiente: str


@dataclass
class DriverResult:
    outcome: str  # ok | rejeitado | transitorio
    chave_acesso: str | None = None
    numero_nfse: str | None = None
    xml_autorizado: str | None = None
    erros: list[dict] = field(default_factory=list)


class FiscalDriver(ABC):
    @abstractmethod
    def build_signed(self, ctx: Ctx, serie: str, numero: int) -> tuple[str, bytes]:
        """Retorna (dps_id, xml_assinado). Deve levantar LocalValidationError se invalido."""

    @abstractmethod
    def submit(self, ctx: Ctx, dps_id: str, xml: bytes, attempt: int) -> DriverResult: ...

    @abstractmethod
    def cancel(self, ctx: Ctx, chave_acesso: str, justificativa: str, attempt: int) -> DriverResult: ...
