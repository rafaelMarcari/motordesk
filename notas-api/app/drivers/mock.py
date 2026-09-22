"""Driver de desenvolvimento: NAO gera documento fiscal valido. Nunca usar em producao.

Gatilhos na descricao do servico:
  [[rejeitar]]  -> rejeicao definitiva
  [[falha]]     -> falha transitoria na 1a tentativa, autoriza na 2a
"""
from __future__ import annotations

import hashlib

from .base import OK, REJEITADO, TRANSITORIO, Ctx, DriverResult, FiscalDriver


class MockDriver(FiscalDriver):
    def build_signed(self, ctx, serie, numero):
        dps_id = f"MOCK{ctx.empresa['cnpj']}{int(serie):05d}{numero:015d}"
        return dps_id, f"<DPS><infDPS Id='{dps_id}'/></DPS>".encode()

    def submit(self, ctx, dps_id, xml, attempt):
        desc = ctx.payload["servico"]["descricao"]
        if "[[rejeitar]]" in desc:
            return DriverResult(REJEITADO, erros=[{"codigo": "MOCK001", "mensagem": "Rejeicao simulada"}])
        if "[[falha]]" in desc and attempt == 0:
            return DriverResult(TRANSITORIO, erros=[{"codigo": "MOCK_TIMEOUT", "mensagem": "Timeout simulado"}])
        chave = hashlib.sha256(dps_id.encode()).hexdigest()[:50].translate(
            str.maketrans("abcdef", "123456"))
        return DriverResult(OK, chave_acesso=chave, numero_nfse=str(int(dps_id[-15:])),
                            xml_autorizado=f"<NFSe mock='true'><chave>{chave}</chave></NFSe>")

    def cancel(self, ctx, chave_acesso, justificativa, attempt):
        return DriverResult(OK)
