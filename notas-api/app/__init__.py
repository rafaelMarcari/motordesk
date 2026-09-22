from __future__ import annotations

import types

from flask import Flask, jsonify

from . import db
from .config import Config
from .drivers.nfse_nacional import get_driver  # noqa: F401  (reexport)
from .security import Vault


def create_app(cfg: Config | None = None) -> Flask:
    cfg = cfg or Config.from_env()
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024
    app.extensions["notas"] = types.SimpleNamespace(cfg=cfg, vault=Vault(cfg.master_key))

    boot = db.connect(cfg.db_path)
    db.init_db(boot)
    boot.close()

    from .api import bp
    app.register_blueprint(bp)

    @app.teardown_appcontext
    def _close(_exc):
        from flask import g
        c = g.pop("conn", None)
        if c is not None:
            c.close()

    @app.errorhandler(404)
    def _nf(_e):
        return jsonify({"codigo": "nao_encontrado", "mensagem": "rota inexistente"}), 404

    @app.errorhandler(413)
    def _big(_e):
        return jsonify({"codigo": "muito_grande", "mensagem": "corpo maior que 2MB"}), 413

    @app.errorhandler(405)
    def _m(_e):
        return jsonify({"codigo": "metodo_nao_permitido", "mensagem": "metodo nao permitido"}), 405

    return app
