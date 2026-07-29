# Handoff · Lane SPEC-INGPAGE · trace leela-build-2d6ee98d

- **Employee:** `sf-cto` (software-forge) · DNA Fowler / DHH / Kleppmann
- **Escopo:** MINI-SPEC da página própria do ingresso (item 55 do painel). **Zero código de aplicação.**
- **Território:** `leela-specs/**` + este handoff. Nada fora disso.
- **Repo:** `C:\dev\LEELA`, branch `main`. Commits `[LEELA-SPEC-INGPAGE]`. **SEM push** (o maestro pusha).
- **Painel `DECISOES-ABERTAS.md`:** intocado (é do maestro).

## Placar

| # | Task | Estado | Commit |
|---|---|---|---|
| T0 | Inventário + abertura do handoff | ✅ | `36fd7a3` |
| T1 | Rodada `02-rodadas/2026-07-29-pagina-ingresso/` (decisões + RNs + fila) | ✅ | `a4e0535` |
| T2 | Story `S1214` no E12 + delta do `S1206`/`S1206-T7` | ✅ | `41216dd` |
| T3 | Deltas de fronteira nos épicos E13 e E03 | ✅ | `a4c9f5a` |
| T4 | Boards (V1-KANBAN + BOARD-EPICOS) | ✅ | `d2d2c1d` |
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

## Entregáveis (aceite do brief, item a item)

| Aceite do brief | Onde |
|---|---|
| Stories Given/When/Then ancoradas em épico | `S1214` (+4 tasks) na seção "Delta página própria do ingresso" do `LEELA-E12-landing.md` |
| RNs numeradas, próximo número livre VERIFICADO | RN-418 a RN-424, com o comando de varredura e o resultado literal em `02-rns-delta.md` |
| Deltas nos épicos tocados, na mesma aterrissagem | E12 (RNs + story + ponteiro no `S1206-T7`), E13 (fronteira), E03 (fronteira) |
| Rodada com premissas vetáveis P1..Pn | `02-rodadas/2026-07-29-pagina-ingresso/01-decisoes-delta.md` — P1..P12, maior peso primeiro |
| Cards no padrão épico→história→tarefa | `V1-KANBAN.md`: card `[E12]` → `S1214` → 4 tarefas; `S1206-T7` de 🧊 para 🔓 |
| Pontos ⚔ declarados | 8 vetores, neste handoff e em `03-fila-codigo.md` |
| Reaproveitamento primeiro, reaproveitado vs criado | seção "Inventário antes de especificar" acima |

## Onde a spec responde cada pergunta do escopo

1. **Superfície** — D-ING-1: landing pública Next, com painel Vite, Function-HTML e área logada
   do E13 rejeitados por motivo escrito. Consequência declarada: a landing ainda não está no
   preview, e isso é sequência de operação, não arquitetura.
2. **Segurança e privacidade do link** — D-ING-2, D-ING-3, D-ING-4, D-ING-5 e D-ING-7
   (RN-419, RN-420, RN-422). Token `LLIP1` derivado do MESMO keyring com separação de domínio
   pela versão; a chave não desce para a landing; Rules intocadas; sem prazo no token; três
   cabeçalhos obrigatórios; dado mínimo.
3. **Conteúdo e estados** — D-ING-6 (RN-421), matriz de sete linhas, incluindo estornado,
   cancelado, credenciado, emissão em andamento (RN-382) e evento encerrado.
4. **E-mail** — D-ING-8 (RN-423). Delta, não reescrita: o link entra por inscrito, o código em
   texto e o QR embutido permanecem, a idempotência da RN-219 não é tocada.
5. **PDF (S1206-T7)** — D-ING-9 (RN-424). A versão imprimível É o PDF; a task sai do gelo e
   passa a depender do `S1214-T4`; PDF server-side segue fora.
6. **Fronteiras** — D-ING-10 mais os deltas escritos no E03 (a página exibe, o balcão
   credencia) e no E13 (a página pública não é a área logada; o app herda a mesma projeção).

## Envelope de custo

- **Por abertura de ingresso:** uma invocação de Function + duas leituras de documento
  (inscrito e evento) + um render de QR de poucos milissegundos. Um evento de mil inscritos
  com três aberturas por link fica em ~3 mil invocações e ~6 mil leituras, o que dá **menos de
  um centavo de dólar por evento** e cabe inteiro no free tier mensal (2 M de invocações,
  50 mil leituras/dia). Nenhuma escrita, nenhum campo novo, nenhuma coleção nova.
- **Infra nova:** zero. A rota entra na landing que já existe e a Function entra no projeto que
  já existe. Nenhuma dependência nova em nenhum dos dois (o QR chega renderizado do servidor
  pelo `gerarQrDataUrl` que o e-mail já usa).
- **Sobre o gerador de PDF rejeitado, com honestidade:** em dinheiro ele também seria barato
  (uns poucos GiB-segundos por PDF). O custo que mata é **operacional**, e é esse o argumento:
  Chromium na Function significa memória na casa do gigabyte, cold start na casa dos dez
  segundos batendo justamente em quem clicou "imprimir", e mais uma imagem para manter. A
  alternativa leve (`pdf-lib`) troca isso por um segundo layout do ingresso, que diverge da
  página no primeiro ajuste de marca.
- **Orçamento da lane:** só spec. Zero custo de execução até o build começar.

## Self-score (contrato do sf-cto)

| Critério | Peso | Limiar | Nota | Evidência |
|---|---|---|---|---|
| `technical_correctness` | 1,5 | 0,85 | **0,93** | Toda recomendação aponta para símbolo lido no repo: `obterQrKeyring`/`carregarQrKeyring`/`kidQrValido`/`assinarQrToken`/`verificarQrToken` (`functions/src/eventos/qrToken.ts`), `parseQrToken` e os helpers base64url (`packages/core/src/eventos/qrToken.ts`), `gerarQrDataUrl`/`urlPublicaDoEvento`/`EVENTO_URL_BASE` (`publicarEvento.ts`), `IngressoEmitido` (`emitirIngressos.ts`), `registrarComunicacao`/`CHAVE_EMAIL_INGRESSOS` (`enviarIngressos.ts`), `leitor.ts`/`firebaseAdmin.ts`/`baseUrl()` da landing, `StatusInscrito`, ADR-017. Não fica em 1,0 porque nada foi executado: a lane não roda código |
| `scalability_check` | 1,0 | 0,75 | **0,85** | Sem campo novo, sem coleção nova, sem índice: o token é derivado e carrega os ids. Modos de falha nomeados e virados em estado de tela: cold start da Function, leitura que falha, emissão ainda aberta (RN-382), token que não verifica. O que não foi medido: latência real do salto no SSR, porque exigiria deploy |
| `security_posture` | 1,5 | 0,80 | **0,94** | É o núcleo da spec. `qrToken` fora da URL com o motivo (quem lê, entra); separação de domínio por versão, provada nas duas direções; blast radius da chave tratado explicitamente (cunhar é silencioso e offline, ler o banco deixa rastro); Rules intocadas e declaradas como aceite; ausência de oráculo nas quatro causas de falha; três cabeçalhos com motivo; PII minimizada e lista do que não pode aparecer; revogação individual e em massa separadas; "encaminhar o link é encaminhar o ingresso" escrito como propriedade, não escondido |
| `cost_envelope` | 1,0 | 0,70 | **0,82** | Custo por abertura calculado e comparado ao free tier; zero infra nova; o argumento contra o PDF server-side corrigido para o que ele realmente é (operacional, não financeiro). Não fica mais alto porque o número de aberturas por link é estimativa, não medição |

**Média ponderada: 0,895.** Os quatro critérios acima do limiar; nenhuma iteração de revisão
necessária.

## Resumo executivo

**Lane SPEC-INGPAGE fechada.** Item 55 tem spec pronta para build, sem uma linha de código de
aplicação.

**O que foi decidido.** A página do ingresso mora na landing pública, abre sem login e é
alcançada por um link tokenizado por inscrito que vai no e-mail da compra. O link **nunca**
carrega o `qrToken`: carrega um token próprio `LLIP1`, derivado do mesmo keyring, separado do
QR pela constante de versão e verificado dentro de uma Function, porque pôr a chave de
assinatura no runtime do Next transformaria qualquer falha de dependência daquela aplicação em
capacidade de cunhar QR de check-in offline, para qualquer evento e tenant, sem tocar no banco.
A assinatura do link cobre o `qrToken` vigente, e com isso re-emitir o ingresso revoga o link
antigo daquele inscrito, reusando a semântica de revogação que o balcão já tem. Rotação de
chave não mata link emitido, exatamente como o vetor 4 da INGQR-REV já provou para o ingresso.
Não há prazo no token: o que expira é o estado, lido a cada abertura. Ingresso estornado ou
cancelado abre sem QR; credenciado abre com o estado em destaque e o QR ainda visível. E o PDF
do ingresso é a própria página em versão imprimível, o que tira o `S1206-T7` do gelo sem
nenhuma dependência nova no repo.

**Três achados do inventário que viraram regra.** O `EVENTO_URL_BASE` está cravado em
`https://beh.ro`, domínio dos mocks Be Hero, e o e-mail da compra já manda hoje um link para
domínio de terceiro, com a landing usando outra base — a RN-423 unifica e faz o e-mail sair sem
link quando não houver base configurada, em vez de mandar link quebrado. Não existe lista de
slug reservado, e um evento chamado "Convite" já sombrearia a rota `/convite` que existe. Não
existe gerador de PDF no repo, o que confirma que o `S1206-T7` estava bloqueado por falta de
superfície, não por falta de código.

**Números.** 7 RNs mintadas (RN-418 a RN-424, faixa provada livre por varredura), 1 story nova
(`S1214`, id provado livre) com 4 tasks, 3 épicos tocados (E12 com a spec, E13 e E03 com
fronteira), 5 commits mais este selo, 8 pontos ⚔ e 12 premissas vetáveis.

**Veredito: ENTREGUE E PRONTA PARA BUILD**, condicionada ao veto do dono nas premissas P1, P2,
P4 e P10 — as quatro que mudam arquitetura se caírem. As outras oito podem ser vetadas sem
refazer a spec.

**Riscos declarados que a lane não pôde fechar.** Nada foi executado: a lane é spec, então a
latência real do salto Function no SSR e o comportamento do e-mail com a chave Brevo ativa
seguem sem prova. A superfície onde a página vive não está no preview hoje, então o dono só a
percorre depois que a landing subir. E o valor do domínio público continua sendo o item 12, do
dono; o que a spec entrega é a máquina, não a escolha.
