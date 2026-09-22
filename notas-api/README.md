# notas-api

API própria para emissão de notas fiscais eletrônicas (estilo Focus NFe), multiempresa, assíncrona, com webhooks.
**Fase 1: NFS-e Nacional (Sefin Nacional).** NF-e/NFC-e entram como novos *drivers* (ver Roteiro).

## Status: o que foi e o que NÃO foi verificado

| Componente | Situação |
|---|---|
| API, multiempresa, tokens (hash), cofre AES-256-GCM de certificados A1 | ✅ testado (38 testes) |
| Fila com retentativa/backoff, numeração de DPS, idempotência por `ref`, webhooks HMAC | ✅ testado |
| Assinatura XMLDSig (C14N 1.0) | ✅ verificada também com **OpenSSL CLI** (implementação independente) |
| Transporte mTLS (certificado de cliente, gzip+base64, PEM temporário apagado) | ✅ testado contra servidor HTTPS local que exige cert de cliente |
| API + worker como processos reais (smoke test com `curl`) | ✅ |
| **Montagem da DPS aceita pela Sefin Nacional** | ⚠️ **NÃO testado no ambiente oficial** — siga "Homologação" abaixo |
| Formato exato das respostas da Sefin (`chaveAcesso`, `nfseXmlGZipB64`, erros) | ⚠️ implementado a partir da documentação/comunidade; confirme no Swagger |
| Algoritmo de hash da assinatura (`SIGNATURE_HASH`, padrão `sha1`) | ⚠️ confirme no manual oficial |
| Cancelamento na NFS-e Nacional (evento e101101) | ❌ não implementado (a API responde `cancelamento_rejeitado/NAO_IMPLEMENTADO`; o fluxo e o mock funcionam) |
| Grupo `IBSCBS` (Reforma Tributária) na DPS | ❌ pendente — verifique a obrigatoriedade vigente para NFS-e |
| Dockerfile / compose / Caddy | ⚠️ escritos, **não executados** neste ambiente |

## Rodando local (driver `mock`, sem falar com o governo)

```bash
pip install -r requirements.txt
python -m app.cli genkey            # copie MASTER_KEY e ADMIN_TOKEN
export MASTER_KEY=... ADMIN_TOKEN=... DB_PATH=data/notas.db DRIVER=mock
python -c "from wsgi import app; app.run(port=8000)" &   # API (dev)
python -m app.worker &                                   # worker
python -m unittest discover -s tests -t .                # testes
```

O `mock` recusa operar em `producao` e **não gera documento fiscal válido**. Gatilhos: `[[rejeitar]]` e `[[falha]]` na descrição do serviço.

## Deploy no seu domínio

```bash
cp .env.example .env     # preencha MASTER_KEY, ADMIN_TOKEN, API_DOMAIN, ADMIN_IP
docker compose up -d --build
```
Aponte o DNS de `API_DOMAIN` para o servidor; o Caddy emite o TLS sozinho. `/admin/*` só responde ao `ADMIN_IP`.
**Guarde a `MASTER_KEY` fora do servidor**: sem ela os certificados cifrados não abrem. Backup do banco: `python -m app.cli backup destino.db` (seguro com o sistema rodando).

## Uso

```bash
# 1) admin cria a empresa (token e webhook_secret aparecem UMA vez)
curl -X POST https://$DOM/admin/empresas -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"cnpj":"11222333000181","razao_social":"Minha Empresa","codigo_municipio":"3548708","regime":"simples",
       "inscricao_municipal":"12345","webhook_url":"https://seuapp.com/hooks/nfse"}'
# 2) certificado A1
curl -X PUT https://$DOM/admin/empresas/$EID/certificado -H "Authorization: Bearer $ADMIN_TOKEN" -F arquivo=@cert.pfx -F senha=***
# 3) sua aplicação emite (idempotente por ref) e consulta
curl -X POST "https://$DOM/v1/nfse?ref=pedido-42" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d @nota.json
curl https://$DOM/v1/nfse/pedido-42 -H "Authorization: Bearer $TOKEN"
curl -X DELETE https://$DOM/v1/nfse/pedido-42 -H "Authorization: Bearer $TOKEN" -d '{"justificativa":"Motivo com 15+ caracteres"}'
```
`regime`: `mei` | `simples` | `normal` (normal exige `valores.aliquota_iss` entre 2 e 5). Status: `processando_autorizacao → autorizado | erro_autorizacao`; `processando_cancelamento → cancelado`.
Autenticação: `Authorization: Bearer <token>` ou Basic com o token como usuário (estilo Focus NFe).

### Webhooks
Eventos: `nfse.autorizada`, `nfse.rejeitada`, `nfse.incerta`, `nfse.cancelada`, `nfse.cancelamento_rejeitado`. Retentativas por ~3 dias.
Valide: `X-Notas-Signature = "sha256=" + HMAC_SHA256(webhook_secret, X-Notas-Timestamp + "." + corpo_bruto)` e rejeite timestamps antigos.

## Decisões de projeto que importam

- **Numeração da DPS** é reservada dentro de uma transação junto com montagem+assinatura+validação; falha *local* devolve o número. Depois de assinada, a DPS é **reutilizada byte a byte** nas retentativas.
- **Timeout ≠ falha.** Antes de reenviar, o worker consulta a Sefin (`GET /dps/{id}`) para não duplicar nota. Se as tentativas se esgotam, o status é `erro_autorizacao` com `TENTATIVAS_ESGOTADAS` (situação **incerta**); reenviar a mesma `ref` com o **mesmo conteúdo** reconcilia; conteúdo diferente é bloqueado (`409`).
- A API **não calcula tributos**: recebe os dados já definidos pela sua aplicação e apenas monta/valida/transmite.
- `verify=` é passado explicitamente em cada request (o `requests` deixa `REQUESTS_CA_BUNDLE` sobrescrever `session.verify` — bug encontrado e corrigido durante os testes).

## Homologação (obrigatório antes de produção)

1. Baixe do portal da NFS-e Nacional os **XSD oficiais** da DPS e coloque em `schemas/nfse/` (`DPS_v1.00.xsd` + dependências). Defina `XSD_REQUIRED=1`: a API passa a barrar localmente qualquer DPS fora do leiaute, **sem gastar numeração**.
2. Confirme no Swagger da Produção Restrita as URLs (`SEFIN_URL_*`), o formato das respostas e o algoritmo de assinatura (`SIGNATURE_HASH`).
3. Configure `DRIVER=nfse_nacional`, empresa em `ambiente: homologacao`, certificado A1 real, credenciamento no Emissor Nacional feito.
4. Emita notas de teste e ajuste `build_dps()` (`app/drivers/nfse_nacional.py`) conforme as rejeições — as regras variam por regime tributário (campos obrigatórios em um regime e proibidos em outro).
5. Só então `PATCH /admin/empresas/{id}` com `{"ambiente":"producao"}`.

## Roteiro

1. Fechar homologação da emissão NFS-e (acima) · 2. Cancelamento (e101101) e consulta/reconciliação manual · 3. DANFSe em PDF · 4. NF-e/NFC-e (novo driver: SOAP por UF, contingência, eventos, grupos IBS/CBS da NT 2025.002) · 5. Postgres, KMS para a chave-mestra, rate limit, métricas/alertas de vencimento de certificado.
