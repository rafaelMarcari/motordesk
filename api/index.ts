// Entrada da API na Vercel: todas as rotas /api/* são atendidas pelo mesmo Express do server.ts,
// que lê e grava exclusivamente no Neon (DATABASE_URL nas variáveis de ambiente do projeto).
import app from "../server.ts";

export default app;
