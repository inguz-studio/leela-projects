# Handoff · Lane SPEC-INGPAGE · trace leela-build-2d6ee98d

- **Employee:** `sf-cto` (software-forge) · DNA Fowler / DHH / Kleppmann
- **Escopo:** MINI-SPEC da página própria do ingresso (item 55 do painel). **Zero código de aplicação.**
- **Território:** `leela-specs/**` + este handoff. Nada fora disso.
- **Repo:** `C:\dev\LEELA`, branch `main`. Commits `[LEELA-SPEC-INGPAGE]`. **SEM push** (o maestro pusha).
- **Painel `DECISOES-ABERTAS.md`:** intocado (é do maestro).

## Placar

| # | Task | Estado | Commit |
|---|---|---|---|
| T0 | Inventário + abertura do handoff | ✅ | `a8bc836` |
| T1 | Rodada `02-rodadas/2026-07-29-pagina-ingresso/` (decisões + RNs + fila) | ✅ | `71085e6` |
| T2 | Story `S1214` no E12 + delta do `S1206`/`S1206-T7` | ✅ | `9091c2a` |
| T3 | Deltas de fronteira nos épicos E13 e E03 | ✅ | `1ad7069` |
| T4 | Boards (V1-KANBAN + BOARD-EPICOS) | ✅ | `9f9be03` |
| T5 | Selo · resumo executivo + self-score | ✅ | este commit |

## Inventário antes de especificar (reaproveitado vs criado)

Feito ANTES de qualquer proposta, com leitura dos arquivos, não por memória.

### Já existe e a spec REUSA (não reescreve)

| Peça | Onde | O que a página aproveita |
|---|---|---|
| Keyring HMAC com rotação | `functions/src/eventos/qrToken.ts` | `carregarQrKeyring`/`obterQrKeyring`, `kidQrValido`, `QR_SEGREDO_MIN_BYTES`, `timingSafeEqual`. O token do link nasce do MESMO ring: um segredo para rotacionar, não dois |
| Formato e helpers puros do token | `packages/core/src/eventos/qrToken.ts` | `codificarPayloadQr`, `parseQrToken` (modelo estrutural), `bytesParaBase64Url`/`base64UrlParaBytes`, `textoParaBytesUtf8`. O `LLIP1` é irmão do `LLQR1`, não um segundo formato inventado |
| Emissão e shape do ingresso | `functions/src/eventos/emitirIngressos.ts` (`IngressoEmitido`) | A página lê o que a emissão já grava: `qrToken`, `codigoIngresso`, `ingressoEmitidoEm` |
| Render de QR server-side | `gerarQrDataUrl` em `functions/src/eventos/publicarEvento.ts` | A Function devolve a imagem pronta. A landing não ganha `qrcode` no bundle e o QR aparece com JS desligado |
| Leitor público server-side | `apps/landing/lib/leitor.ts` + `lib/firebaseAdmin.ts` | O padrão "Admin SDK no servidor, gate de autorização no código, Rules intocadas" já é doutrina da casa desde a S1200-T2 |
| Base pública por env | `baseUrl()` em `apps/landing/lib/seo.ts` (`NEXT_PUBLIC_LEELA_URL`) | Vira a base ÚNICA; o `EVENTO_URL_BASE` hardcoded das Functions passa a derivar de env |
| DS Radix-free para superfície pública | ADR-017 (`@leela/design-system/server` + `/dialog`) | A página é Server Component com os estáticos do DS; zero dependência nova na landing |
| Idempotência e conteúdo do e-mail | `functions/src/email/enviarIngressos.ts` + `templates.ts` (RN-398/RN-219) | O link entra como ACRÉSCIMO por inscrito. Nada de reescrita do template nem da chave de idempotência |
| Estado do ingresso | `StatusInscrito` (`confirmado|pendente|cancelado|estornado`), `checkinEm`, RN-370..382, RN-399 | A matriz de estados da página deriva do que já existe; a página não inventa estado novo |
| Pendência de emissão | `ingressosPendentes` + `varrerIngressosOrfaos` (RN-382) | O estado "emitindo" da página é a face visível de uma máquina que já roda |

### Criado por esta spec (o que não existia)

- Rota pública `/ingresso/{token}` e sua versão imprimível.
- Formato `LLIP1` do token de link (derivado, com separação de domínio pela versão).
- Endpoint de leitura por capacidade (`ingressoPorLink`) que projeta o dado mínimo.
- Base pública única por ambiente (env no servidor das Functions).
- Slug reservado para as rotas estáticas da landing.

### Achados do inventário (entram na spec, não são opinião)

1. **`EVENTO_URL_BASE = 'https://beh.ro'` é hardcoded em `functions/src/eventos/publicarEvento.ts`** e `beh.ro` é o domínio dos mocks Be Hero, não da Leela. O e-mail da compra JÁ manda um link para um domínio de terceiro. A landing usa outra base (`NEXT_PUBLIC_LEELA_URL`). Duas bases divergentes no mesmo produto ⇒ RN-423.
2. **Não existe lista de slug reservado** (`functions/src/eventos/slug.ts` só garante unicidade). Um evento chamado "Convite" já sombrearia a rota `/convite` que existe hoje na landing. A rota nova amplia o problema ⇒ tarefa própria.
3. **Não existe geração de PDF no repo** (varredura da INGRESSO-QR: zero `pdfkit|jspdf|puppeteer|pdf-lib`). O `S1206-T7` está bloqueado por falta de superfície, não por falta de código ⇒ RN-424 delimita.

## Premissas assumidas

Tabela completa e vetável em `leela-specs/02-rodadas/2026-07-29-pagina-ingresso/01-decisoes-delta.md`
(P1..P12, as de maior peso primeiro). As quatro que mudam a arquitetura se o dono vetar:

- **P1** — a página vive na landing pública (Next), não no painel nem no app do atleta.
- **P2** — o link NUNCA carrega o `qrToken`; carrega token próprio (`LLIP1`) verificado por Function, e a landing não recebe a chave de assinatura.
- **P4** — o link é amarrado ao `qrToken` vigente: re-emitir o ingresso invalida o link antigo (revogação por inscrito, de graça).
- **P10** — o PDF do ingresso é a própria página em versão imprimível; nenhum gerador server-side entra agora.

## Pontos ⚔ declarados para a review antagonista do build

1. ⚔ **Token e Rules.** A página lê por Admin SDK atrás de uma Function. Provar que NENHUMA Rule foi afrouxada, que cliente anônimo continua sem ler `inscritos`, e que o endpoint não é oráculo (token inválido, inscrito de outro evento e evento inexistente devem devolver a MESMA resposta).
2. ⚔ **Rotação de chave × link emitido.** A mesma prova do vetor 4 da INGQR-REV, agora para o link: rotacionar `QR_TOKEN_KID_ATIVO` não pode matar link já enviado; tirar o kid do ring tem de revogar.
3. ⚔ **Separação de domínio.** Um `qrToken` colado na URL não pode abrir a página; um token de link não pode passar no check-in (`registrarCheckinCore` recusa). As duas direções.
4. ⚔ **Binding com o `qrToken`.** Re-emitir o ingresso invalida o link antigo, e a rotação de chave NÃO invalida (são coisas diferentes e é fácil confundir as duas no código).
5. ⚔ **Estado estornado/cancelado sem QR.** Falsificar removendo a guarda e ver a asserção morder.
6. ⚔ **Vazamento por Referer, cache e busca.** `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, `noindex`. Sem os três, o token vaza para fora.
7. ⚔ **Dado mínimo.** A resposta do endpoint não pode carregar CPF, telefone, e-mail, nascimento, contato de emergência nem resposta de formulário.
8. ⚔ **Base pública.** Sem base configurada, o e-mail sai SEM link, nunca com `undefined/...` nem com `beh.ro`.

## Disciplina em vigor

- `git commit --only <arquivos>` sempre; nunca `git add` amplo (outras lanes trabalham no repo).
- Épicos compartilhados: só ACRESCENTAR seção; a única edição cirúrgica permitida é o ponteiro que evita contradição no canônico.
- `DECISOES-ABERTAS.md` intocado.
