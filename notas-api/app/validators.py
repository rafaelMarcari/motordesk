from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation


class ApiError(Exception):
    def __init__(self, status: int, codigo: str, mensagem: str, erros: list | None = None):
        super().__init__(mensagem)
        self.status, self.codigo, self.mensagem, self.erros = status, codigo, mensagem, erros or []


def only_digits(s) -> str:
    return re.sub(r"\D", "", str(s or ""))


def valid_cpf(v: str) -> bool:
    d = only_digits(v)
    if len(d) != 11 or d == d[0] * 11:
        return False
    for n in (9, 10):
        s = sum(int(d[i]) * (n + 1 - i) for i in range(n))
        if int(d[n]) != (s * 10 % 11) % 10:
            return False
    return True


def valid_cnpj(v: str) -> bool:
    d = only_digits(v)
    if len(d) != 14 or d == d[0] * 14:
        return False

    def dv(base: str) -> int:
        w = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2][-len(base):]
        r = sum(int(a) * b for a, b in zip(base, w)) % 11
        return 0 if r < 2 else 11 - r

    return int(d[12]) == dv(d[:12]) and int(d[13]) == dv(d[:13])


def _money(v, campo: str, erros: list) -> Decimal | None:
    try:
        d = Decimal(str(v))
    except (InvalidOperation, ValueError):
        erros.append({"campo": campo, "mensagem": "valor numerico invalido"})
        return None
    if d != d.quantize(Decimal("0.01")):
        erros.append({"campo": campo, "mensagem": "use no maximo 2 casas decimais"})
        return None
    return d


def validate_empresa(data: dict, allow_insecure_webhooks: bool = False) -> dict:
    erros: list = []
    cnpj = only_digits(data.get("cnpj"))
    if not valid_cnpj(cnpj):
        erros.append({"campo": "cnpj", "mensagem": "CNPJ invalido"})
    if not str(data.get("razao_social", "")).strip():
        erros.append({"campo": "razao_social", "mensagem": "obrigatorio"})
    mun = only_digits(data.get("codigo_municipio"))
    if len(mun) != 7:
        erros.append({"campo": "codigo_municipio", "mensagem": "codigo IBGE com 7 digitos"})
    regime = data.get("regime")
    if regime not in ("mei", "simples", "normal"):
        erros.append({"campo": "regime", "mensagem": "use mei | simples | normal"})
    amb = data.get("ambiente", "homologacao")
    if amb not in ("homologacao", "producao"):
        erros.append({"campo": "ambiente", "mensagem": "use homologacao | producao"})
    url = data.get("webhook_url")
    if url and not (url.startswith("https://") or (allow_insecure_webhooks and url.startswith("http://"))):
        erros.append({"campo": "webhook_url", "mensagem": "deve ser https://"})
    reg = int(data.get("reg_ap_trib_sn", 1) or 1)
    if reg not in (1, 2, 3):
        erros.append({"campo": "reg_ap_trib_sn", "mensagem": "use 1, 2 ou 3"})
    if erros:
        raise ApiError(422, "dados_invalidos", "Dados da empresa invalidos", erros)
    return {
        "cnpj": cnpj,
        "razao_social": str(data["razao_social"]).strip(),
        "inscricao_municipal": only_digits(data.get("inscricao_municipal")) or None,
        "codigo_municipio": mun,
        "regime": regime,
        "reg_ap_trib_sn": reg,
        "ambiente": amb,
        "webhook_url": url or None,
    }


def validate_nfse(data: dict, empresa: dict) -> dict:
    """Valida e normaliza o payload de emissao de NFS-e (formato proprio da API)."""
    erros: list = []
    if not isinstance(data, dict):
        raise ApiError(400, "json_invalido", "Corpo deve ser um objeto JSON")

    tom = data.get("tomador") or {}
    doc = only_digits(tom.get("cpf_cnpj"))
    if len(doc) == 11 and valid_cpf(doc):
        pass
    elif len(doc) == 14 and valid_cnpj(doc):
        pass
    else:
        erros.append({"campo": "tomador.cpf_cnpj", "mensagem": "CPF/CNPJ invalido"})
    if not str(tom.get("razao_social", "")).strip():
        erros.append({"campo": "tomador.razao_social", "mensagem": "obrigatorio"})
    end = tom.get("endereco")
    end_n = None
    if end:
        cep = only_digits(end.get("cep"))
        mun = only_digits(end.get("codigo_municipio"))
        if len(cep) != 8:
            erros.append({"campo": "tomador.endereco.cep", "mensagem": "CEP com 8 digitos"})
        if len(mun) != 7:
            erros.append({"campo": "tomador.endereco.codigo_municipio", "mensagem": "codigo IBGE com 7 digitos"})
        for c in ("logradouro", "numero", "bairro"):
            if not str(end.get(c, "")).strip():
                erros.append({"campo": f"tomador.endereco.{c}", "mensagem": "obrigatorio"})
        end_n = {"logradouro": end.get("logradouro"), "numero": end.get("numero"),
                 "complemento": end.get("complemento"), "bairro": end.get("bairro"),
                 "codigo_municipio": mun, "cep": cep}

    srv = data.get("servico") or {}
    cod = only_digits(srv.get("codigo_tributacao_nacional"))
    if len(cod) != 6:
        erros.append({"campo": "servico.codigo_tributacao_nacional", "mensagem": "6 digitos (ex.: 010101)"})
    desc = str(srv.get("descricao", "")).strip()
    if not (1 <= len(desc) <= 2000):
        erros.append({"campo": "servico.descricao", "mensagem": "obrigatorio, ate 2000 caracteres"})
    mun_prest = only_digits(srv.get("codigo_municipio_prestacao")) or empresa["codigo_municipio"]
    if len(mun_prest) != 7:
        erros.append({"campo": "servico.codigo_municipio_prestacao", "mensagem": "codigo IBGE com 7 digitos"})

    val = data.get("valores") or {}
    vserv = _money(val.get("valor_servico"), "valores.valor_servico", erros)
    if vserv is not None and vserv <= 0:
        erros.append({"campo": "valores.valor_servico", "mensagem": "deve ser maior que zero"})
    aliq = None
    if empresa["regime"] == "normal":
        try:
            aliq = Decimal(str(val.get("aliquota_iss")))
            if not (Decimal("2") <= aliq <= Decimal("5")):
                raise ValueError
        except Exception:  # noqa: BLE001
            erros.append({"campo": "valores.aliquota_iss", "mensagem": "obrigatoria para regime normal (entre 2 e 5)"})
    retido = bool(val.get("iss_retido", False))

    comp = data.get("data_competencia")
    if comp and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(comp)):
        erros.append({"campo": "data_competencia", "mensagem": "formato AAAA-MM-DD"})

    if erros:
        raise ApiError(422, "dados_invalidos", "Payload invalido", erros)
    return {
        "data_competencia": comp,
        "tomador": {"cpf_cnpj": doc, "razao_social": str(tom["razao_social"]).strip(),
                    "email": tom.get("email"), "telefone": only_digits(tom.get("telefone")) or None,
                    "endereco": end_n},
        "servico": {"codigo_tributacao_nacional": cod, "descricao": desc,
                    "codigo_municipio_prestacao": mun_prest},
        "valores": {"valor_servico": str(vserv), "iss_retido": retido,
                    "aliquota_iss": str(aliq) if aliq is not None else None},
    }
