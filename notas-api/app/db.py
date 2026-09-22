from __future__ import annotations

import sqlite3
from contextlib import contextmanager

SCHEMA = """
CREATE TABLE IF NOT EXISTS empresas (
  id TEXT PRIMARY KEY,
  cnpj TEXT NOT NULL UNIQUE,
  razao_social TEXT NOT NULL,
  inscricao_municipal TEXT,
  codigo_municipio TEXT NOT NULL,
  regime TEXT NOT NULL,                -- mei | simples | normal
  reg_ap_trib_sn INTEGER NOT NULL DEFAULT 1,
  ambiente TEXT NOT NULL DEFAULT 'homologacao',
  serie_dps TEXT NOT NULL DEFAULT '1',
  webhook_url TEXT,
  webhook_secret_enc BLOB,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS api_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  empresa_id TEXT NOT NULL REFERENCES empresas(id),
  token_hash TEXT NOT NULL UNIQUE,
  prefixo TEXT NOT NULL,
  criado_em TEXT NOT NULL,
  revogado_em TEXT
);
CREATE TABLE IF NOT EXISTS certificados (
  empresa_id TEXT PRIMARY KEY REFERENCES empresas(id),
  blob BLOB NOT NULL,
  subject TEXT NOT NULL,
  cnpj_cert TEXT,
  valido_de TEXT NOT NULL,
  valido_ate TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  atualizado_em TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sequencias (
  empresa_id TEXT NOT NULL,
  ambiente TEXT NOT NULL,
  serie TEXT NOT NULL,
  ultimo INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (empresa_id, ambiente, serie)
);
CREATE TABLE IF NOT EXISTS documentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  empresa_id TEXT NOT NULL REFERENCES empresas(id),
  tipo TEXT NOT NULL DEFAULT 'nfse',
  ref TEXT NOT NULL,
  ambiente TEXT NOT NULL,
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  serie TEXT,
  numero INTEGER,
  dps_id TEXT,
  xml_dps BLOB,
  chave_acesso TEXT,
  numero_nfse TEXT,
  xml_autorizado TEXT,
  erros_json TEXT,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  UNIQUE (empresa_id, ambiente, tipo, ref)
);
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id INTEGER NOT NULL REFERENCES documentos(id),
  tipo TEXT NOT NULL,                  -- emitir | cancelar
  dados_json TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_run_at INTEGER NOT NULL,
  locked_at INTEGER,
  last_error TEXT,
  criado_em TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_jobs_fila ON jobs(status, next_run_at);
CREATE TABLE IF NOT EXISTS webhook_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  empresa_id TEXT NOT NULL,
  doc_id INTEGER NOT NULL,
  evento TEXT NOT NULL,
  body_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_run_at INTEGER NOT NULL,
  locked_at INTEGER,
  last_error TEXT,
  criado_em TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wh_fila ON webhook_outbox(status, next_run_at);
"""


def connect(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path, timeout=30, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=30000")
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)


@contextmanager
def tx(conn: sqlite3.Connection):
    """Transacao imediata (nao aninhavel)."""
    conn.execute("BEGIN IMMEDIATE")
    try:
        yield conn
    except BaseException:
        conn.execute("ROLLBACK")
        raise
    else:
        conn.execute("COMMIT")


def row(r):
    return dict(r) if r is not None else None
