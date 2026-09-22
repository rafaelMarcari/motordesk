import base64
import os
import secrets
import sqlite3
import sys


def main():
    a = sys.argv[1:]
    if a == ["genkey"]:
        print("MASTER_KEY=" + base64.b64encode(os.urandom(32)).decode())
        print("ADMIN_TOKEN=" + secrets.token_urlsafe(40))
    elif len(a) == 2 and a[0] == "backup":
        # copia consistente do SQLite (seguro com a API/worker rodando)
        src = sqlite3.connect(os.environ.get("DB_PATH", "data/notas.db"))
        dst = sqlite3.connect(a[1])
        src.backup(dst)
        dst.close(); src.close()
        print("backup gravado em", a[1])
    else:
        print("uso: python -m app.cli genkey | backup DESTINO.db")


if __name__ == "__main__":
    main()
