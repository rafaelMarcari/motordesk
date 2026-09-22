"""Driver NFS-e Nacional (Sefin Nacional): DPS -> assinatura -> gzip/base64 -> POST /nfse (mTLS).

ATENCAO: montagem da DPS e mapeamento de respostas seguem a documentacao/comunidade, mas
NAO foram exercitados contra o ambiente oficial neste repositorio. Homologue em Producao
Restrita com os XSD oficiais em XSD_DIR antes de qualquer uso real (ver README).
"""
from __future__ import annotations

import base64
import contextlib
import glob
import gzip
import os
import re
import tempfile
from datetime import datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

import requests
from lxml import etree

from .. import xmlsign
from ..config import Config
from .base import OK, REJEITADO, TRANSITORIO, Ctx, DriverResult, FiscalDriver, LocalValidationError

NS = "http://www.sped.fazenda.gov.br/nfse"
TZ = ZoneInfo("America/Sao_Paulo")
DPS_VERSAO = "1.00"  # confirme contra o XSD vigente (ha referencias a 1.01)
OP_SIMP_NAC = {"normal": "1", "mei": "2", "simples": "3"}


def _clean(s: str, limit: int | None = None) -> str:
    s = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", str(s))
    s = re.sub(r"\s+", " ", s).strip()
    return s[:limit] if limit else s


def _sub(parent, tag, text=None):
    el = etree.SubElement(parent, f"{{{NS}}}{tag}")
    if text is not None:
        el.text = str(text)
    return el


def _money(v) -> str:
    return f"{Decimal(str(v)):.2f}"


def build_dps(empresa: dict, payload: dict, serie: str, numero: int, tp_amb: str,
              now: datetime, ver_aplic: str) -> tuple[etree._Element, str]:
    """Monta a DPS (sem assinatura). Ordem dos elementos = xs:sequence do leiaute."""
    emit = now.astimezone(TZ) - timedelta(seconds=60)  # margem contra relogio adiantado
    c_loc = empresa["codigo_municipio"]
    dps_id = f"DPS{c_loc}2{empresa['cnpj']}{int(serie):05d}{numero:015d}"
    assert len(dps_id) == 45

    root = etree.Element(f"{{{NS}}}DPS", versao=DPS_VERSAO, nsmap={None: NS})
    inf = _sub(root, "infDPS")
    inf.set("Id", dps_id)
    _sub(inf, "tpAmb", tp_amb)
    _sub(inf, "dhEmi", emit.isoformat(timespec="seconds"))
    _sub(inf, "verAplic", ver_aplic)
    _sub(inf, "serie", int(serie))
    _sub(inf, "nDPS", numero)
    _sub(inf, "dCompet", payload.get("data_competencia") or emit.date().isoformat())
    _sub(inf, "tpEmit", "1")  # 1 = prestador
    _sub(inf, "cLocEmi", c_loc)

    prest = _sub(inf, "prest")
    _sub(prest, "CNPJ", empresa["cnpj"])
    if empresa.get("inscricao_municipal"):
        _sub(prest, "IM", empresa["inscricao_municipal"])
    reg = _sub(prest, "regTrib")
    op = OP_SIMP_NAC[empresa["regime"]]
    _sub(reg, "opSimpNac", op)
    if op == "3":
        _sub(reg, "regApTribSN", empresa.get("reg_ap_trib_sn", 1))
    _sub(reg, "regEspTrib", "0")

    tom = payload["tomador"]
    toma = _sub(inf, "toma")
    _sub(toma, "CNPJ" if len(tom["cpf_cnpj"]) == 14 else "CPF", tom["cpf_cnpj"])
    _sub(toma, "xNome", _clean(tom["razao_social"], 300))
    if tom.get("endereco"):
        e = tom["endereco"]
        end = _sub(toma, "end")
        nac = _sub(end, "endNac")
        _sub(nac, "cMun", e["codigo_municipio"])
        _sub(nac, "CEP", e["cep"])
        _sub(end, "xLgr", _clean(e["logradouro"], 255))
        _sub(end, "nro", _clean(e["numero"], 60))
        if e.get("complemento"):
            _sub(end, "xCpl", _clean(e["complemento"], 156))
        _sub(end, "xBairro", _clean(e["bairro"], 60))
    if tom.get("telefone"):
        _sub(toma, "fone", tom["telefone"])
    if tom.get("email"):
        _sub(toma, "email", _clean(tom["email"], 80))

    srv = payload["servico"]
    serv = _sub(inf, "serv")
    _sub(_sub(serv, "locPrest"), "cLocPrestacao", srv["codigo_municipio_prestacao"])
    csrv = _sub(serv, "cServ")
    _sub(csrv, "cTribNac", srv["codigo_tributacao_nacional"])
    _sub(csrv, "xDescServ", _clean(srv["descricao"], 2000))

    val = payload["valores"]
    valores = _sub(inf, "valores")
    _sub(_sub(valores, "vServPrest"), "vServ", _money(val["valor_servico"]))
    trib = _sub(valores, "trib")
    mun = _sub(trib, "tribMun")
    _sub(mun, "tribISSQN", "1")  # 1 = operacao tributavel
    _sub(mun, "tpRetISSQN", "2" if val.get("iss_retido") else "1")
    if op != "3" and val.get("aliquota_iss"):
        _sub(mun, "pAliq", _money(val["aliquota_iss"]))
    _sub(_sub(trib, "totTrib"), "indTotTrib", "0")
    # TODO: grupo IBSCBS (Reforma Tributaria) — verificar obrigatoriedade/leiaute vigente para NFS-e.
    return root, dps_id


class XsdValidator:
    def __init__(self, xsd_dir: str | None, required: bool):
        self.xsd_dir, self.required, self._schema = xsd_dir, required, None

    def _load(self):
        if self._schema is not None:
            return self._schema
        files = sorted(glob.glob(os.path.join(self.xsd_dir or "", "DPS_v*.xsd")))
        if not files:
            return None
        self._schema = etree.XMLSchema(etree.parse(files[-1]))
        return self._schema

    def check(self, root: etree._Element) -> None:
        schema = self._load() if self.xsd_dir else None
        if schema is None:
            if self.required:
                raise LocalValidationError([{"codigo": "XSD_AUSENTE",
                                             "mensagem": "XSD_REQUIRED=1 mas DPS_v*.xsd nao encontrado em XSD_DIR"}])
            return
        if not schema.validate(root):
            raise LocalValidationError([{"codigo": "XSD_INVALIDO", "mensagem": str(e.message), "linha": e.line}
                                        for e in schema.error_log][:20])


class SefinClient:
    """Cliente HTTP com mTLS. O PEM temporario vive em tmpfs (quando ha) e e apagado ao sair."""

    def __init__(self, base_url: str, cert, ca_bundle: str | None, timeout: int):
        self.base, self.cert, self.ca, self.timeout = base_url.rstrip("/"), cert, ca_bundle, timeout
        self._stack = contextlib.ExitStack()

    def __enter__(self):
        tmp_root = "/dev/shm" if os.path.isdir("/dev/shm") else None
        d = self._stack.enter_context(tempfile.TemporaryDirectory(dir=tmp_root))
        os.chmod(d, 0o700)
        self._cert_file = os.path.join(d, "c.pem")
        self._key_file = os.path.join(d, "k.pem")
        with open(self._cert_file, "wb") as f:
            f.write(self.cert.chain_pem())
        fd = os.open(self._key_file, os.O_WRONLY | os.O_CREAT, 0o600)
        with os.fdopen(fd, "wb") as f:
            f.write(self.cert.key_pem())
        self.session = requests.Session()
        self.session.cert = (self._cert_file, self._key_file)
        return self

    def __exit__(self, *exc):
        self.session.close()
        self._stack.close()

    def _req(self, method, path, **kw):
        # verify explicito por requisicao: sem isso, REQUESTS_CA_BUNDLE do ambiente sobrescreve o
        # bundle configurado (session.verify) e a cadeia ICP-Brasil deixa de ser usada em silencio.
        r = self.session.request(method, self.base + path, timeout=self.timeout, verify=self.ca or True,
                                 headers={"Accept": "application/json"}, **kw)
        try:
            body = r.json()
        except ValueError:
            body = {"raw": r.text[:2000]}
        return r.status_code, body

    def post_dps(self, xml: bytes):
        payload = {"dpsXmlGZipB64": base64.b64encode(gzip.compress(xml, mtime=0)).decode()}
        return self._req("POST", "/nfse", json=payload)

    def get_nfse(self, chave: str):
        return self._req("GET", f"/nfse/{chave}")

    def get_dps(self, dps_id: str):
        return self._req("GET", f"/dps/{dps_id}")


def _errors(body) -> list[dict]:
    """A API pode devolver 'erro' ou 'erros' com codigo/Codigo e descricao/Descricao."""
    items = []
    if isinstance(body, dict):
        for key in ("erros", "erro"):
            v = body.get(key)
            if isinstance(v, dict):
                v = [v]
            if isinstance(v, list):
                items += [i for i in v if isinstance(i, dict)]
    out = [{"codigo": str(i.get("codigo") or i.get("Codigo") or ""),
            "mensagem": str(i.get("descricao") or i.get("Descricao") or i.get("mensagem") or ""),
            **({"complemento": i.get("complemento") or i.get("Complemento")} if (i.get("complemento") or i.get("Complemento")) else {})}
           for i in items]
    return out or [{"codigo": "DESCONHECIDO", "mensagem": str(body)[:500]}]


def _from_nfse_body(body: dict) -> DriverResult:
    b64 = body.get("nfseXmlGZipB64")
    if not b64:
        return DriverResult(TRANSITORIO, erros=[{"codigo": "RESPOSTA_SEM_XML",
                                                 "mensagem": "resposta 2xx sem nfseXmlGZipB64"}])
    xml = gzip.decompress(base64.b64decode(b64)).decode("utf-8")
    root = etree.fromstring(xml.encode())
    n = root.xpath("string(//*[local-name()='nNFSe'])") or None
    chave = body.get("chaveAcesso")
    if not chave:
        ids = root.xpath("//*[local-name()='infNFSe']/@Id")
        chave = re.sub(r"^NFS", "", ids[0]) if ids else None
    return DriverResult(OK, chave_acesso=chave, numero_nfse=n, xml_autorizado=xml)


class NfseNacionalDriver(FiscalDriver):
    def __init__(self, cfg: Config, client_factory=None, clock=None):
        self.cfg = cfg
        self.xsd = XsdValidator(cfg.xsd_dir, cfg.xsd_required)
        self._client_factory = client_factory or self._default_client
        self._clock = clock or (lambda: datetime.now(TZ))

    def _default_client(self, ctx: Ctx):
        url = self.cfg.sefin_url_producao if ctx.ambiente == "producao" else self.cfg.sefin_url_homologacao
        return SefinClient(url, ctx.cert, self.cfg.sefin_ca_bundle, self.cfg.http_timeout)

    def build_signed(self, ctx, serie, numero):
        tp_amb = "1" if ctx.ambiente == "producao" else "2"
        try:
            root, dps_id = build_dps(ctx.empresa, ctx.payload, serie, numero, tp_amb,
                                     self._clock(), self.cfg.ver_aplic)
            xmlsign.sign_element(root, dps_id, ctx.cert, self.cfg.signature_hash)
        except (KeyError, ValueError) as exc:
            raise LocalValidationError([{"codigo": "MONTAGEM_DPS", "mensagem": str(exc)}]) from exc
        self.xsd.check(root)
        xml = etree.tostring(root, encoding="UTF-8", xml_declaration=True)
        if not xmlsign.verify(xml):  # sanity check local
            raise LocalValidationError([{"codigo": "ASSINATURA", "mensagem": "assinatura local nao confere"}])
        return dps_id, xml

    def _lookup(self, client, dps_id: str) -> DriverResult | None:
        """Ja existe NFS-e para esta DPS? (evita duplicar apos timeout)"""
        status, body = client.get_dps(dps_id)
        if status != 200 or not isinstance(body, dict) or not body.get("chaveAcesso"):
            return None
        status, nb = client.get_nfse(body["chaveAcesso"])
        if status != 200 or not isinstance(nb, dict):
            return None
        res = _from_nfse_body({**nb, "chaveAcesso": body["chaveAcesso"]})
        return res if res.outcome == OK else None

    def submit(self, ctx, dps_id, xml, attempt):
        try:
            with self._client_factory(ctx) as client:
                if attempt > 0:
                    found = self._lookup(client, dps_id)
                    if found:
                        return found
                status, body = client.post_dps(xml)
                if status in (200, 201):
                    return _from_nfse_body(body)
                if status == 409:
                    found = self._lookup(client, dps_id)
                    if found:
                        return found
                if status == 429 or status >= 500:
                    return DriverResult(TRANSITORIO, erros=[{"codigo": f"HTTP_{status}", "mensagem": "indisponibilidade temporaria"}])
                errs = _errors(body)
                if status == 403:
                    errs.insert(0, {"codigo": "HTTP_403", "mensagem": "acesso negado: verifique certificado/mTLS e credenciamento"})
                return DriverResult(REJEITADO, erros=errs)
        except requests.RequestException as exc:
            return DriverResult(TRANSITORIO, erros=[{"codigo": "REDE", "mensagem": type(exc).__name__}])

    def cancel(self, ctx, chave_acesso, justificativa, attempt):
        # TODO: evento e101101 (pedRegEvento/infPedReg assinado) via POST /nfse/{chave}/eventos.
        raise NotImplementedError("cancelamento na NFS-e Nacional ainda nao implementado neste driver")


def get_driver(cfg: Config) -> FiscalDriver:
    if cfg.driver == "mock":
        from .mock import MockDriver
        return MockDriver()
    return NfseNacionalDriver(cfg)
