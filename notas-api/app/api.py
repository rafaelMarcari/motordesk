from __future__ import annotations

import base64
import re
import secrets
import uuid
from datetime import datetime, timezone
from functools import wraps

from flask import Blueprint, Response, current_app, g, jsonify, request

from . import certs, db, services
from .security import hash_token, new_token, safe_equals
from .validators import ApiError, only_digits, validate_empresa, validate_nfse

bp = Blueprint("api", __name__)
REF_RE = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


def env():
    return current_app.extensions["notas"]


def conn():
    if "conn" not in g:
        g.conn = db.connect(env().cfg.db_path)
    return g.conn


def _bearer() -> str:
    h = request.headers.get("Authorization", "")
    if h.startswith("Bearer "):
        return h[7:].strip()
    if h.startswith("Basic "):  # estilo Focus NFe: token como usuario
        try:
            return base64.b64decode(h[6:]).decode().split(":", 1)[0]
        except Exception:  # noqa: BLE001
            return ""
    return ""


def admin_required(f):
    @wraps(f)
    def w(*a, **k):
        tok = _bearer()
        if not tok or not safe_equals(tok, env().cfg.admin_token):
            raise ApiError(401, "nao_autorizado", "Token de administrador invalido")
        return f(*a, **k)
    return w


def empresa_required(f):
    @wraps(f)
    def w(*a, **k):
        tok = _bearer()
        r = conn().execute(
            "SELECT e.* FROM api_tokens t JOIN empresas e ON e.id=t.empresa_id "
            "WHERE t.token_hash=? AND t.revogado_em IS NULL AND e.ativo=1", (hash_token(tok),)).fetchone() if tok else None
        if r is None:
            raise ApiError(401, "nao_autorizado", "Token invalido")
        g.empresa = db.row(r)
        return f(*a, **k)
    return w


def empresa_view(e: dict, cert=None) -> dict:
    out = {k: e[k] for k in ("id", "cnpj", "razao_social", "inscricao_municipal", "codigo_municipio", "regime",
                             "reg_ap_trib_sn", "ambiente", "serie_dps", "webhook_url", "ativo", "criado_em")}
    if cert:
        out["certificado"] = {"subject": cert["subject"], "cnpj": cert["cnpj_cert"],
                              "valido_ate": cert["valido_ate"], "fingerprint_sha256": cert["fingerprint"]}
    return out


@bp.errorhandler(ApiError)
def _api_error(e: ApiError):
    return jsonify({"codigo": e.codigo, "mensagem": e.mensagem, "erros": e.erros}), e.status


@bp.get("/health")
def health():
    conn().execute("SELECT 1")
    return jsonify({"status": "ok", "driver": env().cfg.driver})


# ------------------------------ admin ------------------------------
@bp.post("/admin/empresas")
@admin_required
def admin_create_empresa():
    clean = validate_empresa(request.get_json(silent=True) or {}, env().cfg.allow_insecure_webhooks)
    eid, token, secret = str(uuid.uuid4()), new_token(), secrets.token_hex(32)
    c = conn()
    with db.tx(c):
        if c.execute("SELECT 1 FROM empresas WHERE cnpj=?", (clean["cnpj"],)).fetchone():
            raise ApiError(409, "empresa_existente", "CNPJ ja cadastrado")
        c.execute(
            "INSERT INTO empresas(id,cnpj,razao_social,inscricao_municipal,codigo_municipio,regime,reg_ap_trib_sn,"
            "ambiente,webhook_url,webhook_secret_enc,criado_em) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (eid, clean["cnpj"], clean["razao_social"], clean["inscricao_municipal"], clean["codigo_municipio"],
             clean["regime"], clean["reg_ap_trib_sn"], clean["ambiente"], clean["webhook_url"],
             env().vault.encrypt(secret.encode(), aad=b"wh:" + eid.encode()), services.now_iso()))
        c.execute("INSERT INTO api_tokens(empresa_id,token_hash,prefixo,criado_em) VALUES (?,?,?,?)",
                  (eid, hash_token(token), token[:8], services.now_iso()))
    emp = db.row(c.execute("SELECT * FROM empresas WHERE id=?", (eid,)).fetchone())
    return jsonify({**empresa_view(emp), "token": token, "webhook_secret": secret,
                    "aviso": "token e webhook_secret sao exibidos apenas agora"}), 201


def _get_empresa(eid):
    e = db.row(conn().execute("SELECT * FROM empresas WHERE id=?", (eid,)).fetchone())
    if not e:
        raise ApiError(404, "nao_encontrado", "empresa nao encontrada")
    return e


@bp.get("/admin/empresas/<eid>")
@admin_required
def admin_get_empresa(eid):
    e = _get_empresa(eid)
    cert = db.row(conn().execute("SELECT * FROM certificados WHERE empresa_id=?", (eid,)).fetchone())
    return jsonify(empresa_view(e, cert))


@bp.patch("/admin/empresas/<eid>")
@admin_required
def admin_patch_empresa(eid):
    e, data = _get_empresa(eid), request.get_json(silent=True) or {}
    merged = {**e, **{k: data[k] for k in ("webhook_url", "ambiente", "regime", "inscricao_municipal",
                                           "razao_social", "codigo_municipio") if k in data}}
    clean = validate_empresa(merged, env().cfg.allow_insecure_webhooks)
    ativo = int(bool(data.get("ativo", e["ativo"])))
    if clean["ambiente"] == "producao" and not conn().execute("SELECT 1 FROM certificados WHERE empresa_id=?", (eid,)).fetchone():
        raise ApiError(422, "sem_certificado", "cadastre o certificado antes de ir para producao")
    conn().execute("UPDATE empresas SET webhook_url=?, ambiente=?, regime=?, inscricao_municipal=?, razao_social=?,"
                   " codigo_municipio=?, ativo=? WHERE id=?",
                   (clean["webhook_url"], clean["ambiente"], clean["regime"], clean["inscricao_municipal"],
                    clean["razao_social"], clean["codigo_municipio"], ativo, eid))
    return jsonify(empresa_view(_get_empresa(eid)))


@bp.post("/admin/empresas/<eid>/tokens")
@admin_required
def admin_rotate_token(eid):
    _get_empresa(eid)
    data = request.get_json(silent=True) or {}
    token = new_token()
    c = conn()
    with db.tx(c):
        if data.get("revogar_anteriores"):
            c.execute("UPDATE api_tokens SET revogado_em=? WHERE empresa_id=? AND revogado_em IS NULL",
                      (services.now_iso(), eid))
        c.execute("INSERT INTO api_tokens(empresa_id,token_hash,prefixo,criado_em) VALUES (?,?,?,?)",
                  (eid, hash_token(token), token[:8], services.now_iso()))
    return jsonify({"token": token}), 201


@bp.put("/admin/empresas/<eid>/certificado")
@admin_required
def admin_put_cert(eid):
    e = _get_empresa(eid)
    if request.files.get("arquivo"):
        pfx, senha = request.files["arquivo"].read(), request.form.get("senha", "")
    else:
        d = request.get_json(silent=True) or {}
        try:
            pfx, senha = base64.b64decode(d.get("pfx_base64", ""), validate=True), d.get("senha", "")
        except Exception:  # noqa: BLE001
            raise ApiError(400, "pfx_invalido", "pfx_base64 invalido") from None
    try:
        loaded = certs.parse_pfx(pfx, senha)
    except certs.CertError as exc:
        raise ApiError(422, "certificado_invalido", str(exc)) from None
    if loaded.info.expired:
        raise ApiError(422, "certificado_vencido", "certificado vencido")
    if loaded.info.cnpj and loaded.info.cnpj[:8] != e["cnpj"][:8]:
        raise ApiError(422, "certificado_divergente", "CNPJ do certificado nao pertence a esta empresa (raiz diferente)")
    blob = certs.pack(env().vault, eid, pfx, senha)
    conn().execute(
        "INSERT INTO certificados(empresa_id,blob,subject,cnpj_cert,valido_de,valido_ate,fingerprint,atualizado_em)"
        " VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(empresa_id) DO UPDATE SET blob=excluded.blob, subject=excluded.subject,"
        " cnpj_cert=excluded.cnpj_cert, valido_de=excluded.valido_de, valido_ate=excluded.valido_ate,"
        " fingerprint=excluded.fingerprint, atualizado_em=excluded.atualizado_em",
        (eid, blob, loaded.info.subject, loaded.info.cnpj, loaded.info.not_before.isoformat(),
         loaded.info.not_after.isoformat(), loaded.info.fingerprint, services.now_iso()))
    cert = db.row(conn().execute("SELECT * FROM certificados WHERE empresa_id=?", (eid,)).fetchone())
    return jsonify(empresa_view(e, cert))


# ------------------------------ empresa (cliente da API) ------------------------------
@bp.get("/v1/empresa")
@empresa_required
def me():
    cert = db.row(conn().execute("SELECT * FROM certificados WHERE empresa_id=?", (g.empresa["id"],)).fetchone())
    return jsonify(empresa_view(g.empresa, cert))


def _ready(empresa):
    cert = conn().execute("SELECT valido_ate FROM certificados WHERE empresa_id=?", (empresa["id"],)).fetchone()
    if not cert:
        raise ApiError(422, "sem_certificado", "empresa sem certificado digital cadastrado")
    if datetime.fromisoformat(cert["valido_ate"]) <= datetime.now(timezone.utc):
        raise ApiError(422, "certificado_vencido", "certificado digital vencido")


def _ref():
    ref = request.args.get("ref", "")
    if not REF_RE.match(ref):
        raise ApiError(400, "ref_invalida", "informe ?ref= (1-64 chars: letras, numeros, . _ -)")
    return ref


@bp.post("/v1/nfse")
@empresa_required
def nfse_create():
    ref = _ref()
    body = request.get_json(silent=True)
    if body is None:
        raise ApiError(400, "json_invalido", "corpo JSON invalido")
    _ready(g.empresa)
    payload = validate_nfse(body, g.empresa)
    doc, status = services.submit_nfse(conn(), g.empresa, ref, payload)
    return jsonify(services.doc_view(doc)), status


def _doc_or_404(ref):
    d = services.get_doc(conn(), g.empresa["id"], g.empresa["ambiente"], ref)
    if not d:
        raise ApiError(404, "nao_encontrado", "ref nao encontrada")
    return d


@bp.get("/v1/nfse/<ref>")
@empresa_required
def nfse_get(ref):
    return jsonify(services.doc_view(_doc_or_404(ref)))


@bp.get("/v1/nfse/<ref>/xml")
@empresa_required
def nfse_xml(ref):
    d = _doc_or_404(ref)
    if not d["xml_autorizado"]:
        raise ApiError(404, "sem_xml", "XML autorizado ainda nao disponivel")
    return Response(d["xml_autorizado"], mimetype="application/xml")


@bp.delete("/v1/nfse/<ref>")
@empresa_required
def nfse_cancel(ref):
    _ready(g.empresa)
    just = (request.get_json(silent=True) or {}).get("justificativa", "")
    doc = services.request_cancel(conn(), g.empresa, ref, just)
    return jsonify(services.doc_view(doc)), 202
