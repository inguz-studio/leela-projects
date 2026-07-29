# Handoff · lane INGPAGE-REV · trace leela-build-2d6ee98d · 2026-07-29

**Executor:** `sf-qa-engineer` (software-forge) · contexto fresco, insumo = DISCO.
**Objeto:** lane INGPAGE-BUILD (`82e3286`, `19eb42d`, `8cb17de`, `1d82127`, `675b004`, `db141aa`).
**Emulador:** exclusivo da lane (`npx firebase-tools@13 emulators:exec --project demo-leela`).
**Sem push.** Três commits nesta lane.

---

## VEREDITO: APROVADA COM RESSALVAS

A arquitetura da S1214 se sustenta sob ataque. Submeti as guardas centrais a **mutação** —
removi cada uma e conferi que a asserção morde — e as três mordem. O desenho de fundo (chave
fora do runtime da landing, binding ao `qrToken` gravado, guarda de QR no servidor, negativa
única) está certo e é defensável.

Achei **dois defeitos reais**, os dois em pontos que a lane não olhou, e os dois corrigidos
aqui com teste que prende. Nenhum deles é de arquitetura: são as duas bordas onde o desenho
correto encostou em código de terceiro (o SDK do Firestore e o SDK do Sentry).

| # | Vetor | Resultado |
|---|---|---|
| 1 | Rules intocadas | **PASSA** (falsificado: abri a Rule, o `assertFails` derrubou) |
| 2 | Ausência de oráculo (incl. o 503) | **DEFEITO CORRIGIDO** — `8100c0a` |
| 3 | Rotação × link emitido, ring real | **PASSA** (lacuna de cobertura fechada — `a7f98de`) |
| 4 | Separação de domínio, DUAS direções | **PASSA** |
| 5 | Binding + P-INGPAGE-1 | **PASSA no código · ESCALADO na spec** |
| 6 | Estornado/cancelado sem QR | **PASSA** (falsificado: removi a guarda, 4 testes caíram) |
| 7 | Privacidade + 3 cabeçalhos + noindex | **DEFEITO CORRIGIDO** — `43c33fe` |
| 8 | Base pública ausente ⇒ e-mail sem link | **PASSA** |
| H1 | Herança ⚔ INGQR-POLISH | **ESCALADO** (aberto, não agravado por esta lane) |
| H2 | Pagamento `30c7b89` / `72432fa` | **PASSA com ressalva** (comentário desatualizado) |

---

## Defeito 1 · o id não verificado vira caminho do Firestore (MÉDIA) — corrigido em `8100c0a`

**A objeção.** `registrarCheckin.ts` diz, no próprio comentário, *"1) Criptografia PRIMEIRO — o
payload só existe após assinatura válida"*. O link **inverte essa ordem por necessidade**: o
binding da RN-420 cobre o `qrToken` GRAVADO, então é preciso ler o doc antes de poder verificar.
A lane fez a inversão e não acrescentou a validação que a inversão exige — `eventoId` e
`inscritoId` saem de um token ainda **não verificado** e vão direto para
`collection('eventos').doc(id)`.

**A prova, no emulador.** Ids que o SDK do Firestore recusa (`"a/b"`, `"a//b"`, `"."`, `".."`,
`"__proto__"`) fazem `.doc()` **lançar de forma síncrona**:

```
Value for argument "documentPath" must point to a document, but was "a/b".
Value for argument "documentPath" is not a valid resource path. Paths must not contain //.
```

O endpoint traduz a exceção em **`503` com `{"ok":false,"erro":"indisponivel"}`** — diferente,
byte a byte, da negativa única `{"ok":false}`. E a landing renderiza telas diferentes para as
duas: `ingresso-nao-encontrado` contra `ingresso-indisponivel`. Ou seja: **uma propriedade do
token, escolhida por quem forja o link, seleciona qual das duas telas sai.** É exatamente o
oráculo que a RN-419 proíbe, num endpoint público e não autenticado, e ainda vira um 5xx mais
um `logger.error` por request.

**Por que o teste da lane não pegou.** O ⚔ 2 usa quatro causas com ids **bem formados**. O
`Set(...).size === 1` deu verde sobre um espaço de entrada que nunca inclui um id que o
Firestore recusa. A asserção estava certa; a amostra é que não continha o caso.

**O julgamento do item 1 do brief (o 503 é oráculo?).** O argumento da lane — *"o 503 não
depende de nenhuma propriedade do token"* — estava **certo em princípio e errado de fato**.
Depois do fix ele passa a ser verdadeiro: os 503 que sobram são falha real de infra
(Firestore fora, keyring lançando), e nenhum deles é selecionável pelo conteúdo do token.
Manter o 503 distinto do 404 é **correto** e deve ficar: colapsar os dois mataria a
degradação honesta que a RN-421 pede.

**A correção.** `idValido` no core passa a exigir o critério do próprio Firestore para id de
documento (sem `/`, nunca `.`/`..`, fora de `__*__`). Nenhum id legítimo é recusado — só o que
o SDK recusaria lançando. **Falsificação:** revertida a guarda, o caso novo cai.

---

## Defeito 2 · o token do ingresso sai para o Sentry (ALTA, latente) — corrigido em `43c33fe`

**A objeção.** A S1214 pôs uma **credencial portadora dentro do path de uma URL** — quem tem
`/ingresso/{token}` tem o ingresso. A RN-419 assumiu isso de olhos abertos e listou os
vazamentos a fechar: `Referer`, cache/CDN, índice de buscador, histórico. A lane fechou os
quatro, com cuidado e com prova.

Ficou de fora o vazamento que não parece um log: **o SDK de observabilidade já montado nesta
aplicação**. `sentry.client.config.ts`, `sentry.server.config.ts` e `sentry.edge.config.ts`
rodam com `tracesSampleRate: 1.0` — **uma transação por pageview**, e toda transação carrega
`request.url`. O cliente ainda tem `replayIntegration()` com `replaysOnErrorSampleRate: 1.0`.

**O que torna isto grave é a validade.** O token **não expira** (D-ING-5); só a re-emissão o
revoga. O alcance do vazamento não é a sessão — é a vida do ingresso. E o argumento é o mesmo
que a própria RN-419 usa para tirar o `qrToken` da URL (*"vaza pelo log de qualquer proxy"*):
o Sentry é o log de um proxy com outro nome.

**Severidade calibrada: ALTA, latente.** `NEXT_PUBLIC_SENTRY_DSN` está vazio hoje, então nada
vaza neste minuto. Mas o repositório inteiro já está cabeado para ligá-lo (`withSentryConfig`,
`SENTRY_ORG`, `SENTRY_PROJECT`, upload de source maps, `instrumentation.ts`). O defeito dispara
no dia em que alguém ligar o Sentry — que é exatamente o dia em que ninguém estará pensando na
página do ingresso. Pré-mortem: *"imagine que vazou — como?"* Resposta: por um passo de
operação de rotina, seis meses depois, sem ninguém tocar nesta lane.

**A correção.** Scrubber puro (`lib/sentryScrub.ts`) em `beforeSend` + `beforeSendTransaction`
nos três configs. Varre o evento **inteiro, recursivamente**, em vez de listar os campos
conhecidos — o formato do evento muda entre versões do SDK e lista de campos envelhece em
silêncio, que foi como este vazamento nasceu. **Falsificação:** enfraquecido o regex, o caso do
token solto cai.

### ⚠️ Ressalva que o fix NÃO fecha — decisão do dono

O **Session Replay** manda URL de navegação por um **canal próprio**, que não passa por
`beforeSend`. Enquanto o replay estiver ligado, a rota do ingresso continua exposta por ele.
Duas saídas: desligar o replay em `/ingresso`, ou aceitar declaradamente. Está escrito no
próprio `sentry.client.config.ts`.

---

## Vetor 5 · o julgamento da P-INGPAGE-1 (item 2 do brief)

**O binding estrito é a leitura certa da D-ING-4. Concordo com a escolha.** As duas
alternativas morrem por consequência concreta, e a lane escreveu as duas mortes corretamente:
assinar sobre `''` produz um link que morre no instante do sucesso; aceitar `''` **ou** o token
vigente produz um link pré-emissão irrevogável.

**Onde discordo é do enquadramento.** A lane trata a linha inalcançável como uma imperfeição
declarada. Ela é um pouco mais que isso: `estadoDaPagina` só devolve `'emitindo'` quando
`confirmado && !temQrToken`, mas `verificarLinkIngresso` já recusou (`sem_ingresso`) antes de
lá chegar. Logo o ramo `emitindo` da projeção **e** o ramo `emitindo` da `IngressoView` são
**código morto por construção** — alcançáveis só chamando `estadoDaPagina` direto num unit.

Isso não é defeito de código (o código está certo e é o mais seguro dos três). É **defeito de
spec**, em dois lugares que continuam prometendo o que o produto não produz:

- a linha *"`confirmado`, sem `qrToken` ⇒ estamos emitindo seu ingresso"* da **RN-421**;
- o GWT da **S1214**: *"dado um pedido pago cuja emissão ainda não fechou, quando abro o
  link…"* — cenário que não pode acontecer, porque sem emissão não há link.

**Recomendação:** corrigir as duas na spec (o link nasce com a emissão, e antes disso o e-mail
já diz *"ingresso ainda sendo emitido"*), **ou** o dono vetar e aceitar o `linkNonce` com o
custo que a lane já precificou. Deixar como está é um alçapão de manutenção: quem ler a
`IngressoView` daqui a seis meses vai ver a tela de "emitindo" e supor que ela funciona.

---

## Vetores que passaram, e como foram falsificados

**⚔ 1 · Rules.** Abri `match /inscritos/{inscritoId}` com `allow read: if true` → o teste
`⚔ 1 — Rules intocadas` caiu. A asserção é real, não decorativa.

**⚔ 3 · Rotação.** Os rings da suíte eram montados à mão, o que pula a peça que o operador
mexe no dia da virada. Escrevi a cerimônia inteira pelo **carregador de verdade**
(`carregarQrKeyring` sobre `QR_TOKEN_KEYS` + `QR_TOKEN_KID_ATIVO`), nos três passos reais
(k1 → k1+k2 com k2 ativo → só k2). As três propriedades da RN-420 se separam corretamente.
**Nenhum defeito** — a implementação já estava certa; faltava a prova sobre o caminho real.

**⚔ 4 · Separação de domínio, nas duas direções.** `verificarQrToken(LLIP1)` recusa e
`verificarLinkIngresso(LLQR1)` recusa. `llip1` minúsculo recusa. A guarda de carga
(`dominiosDeTokenSeparados`) explode no import se as constantes colidirem.

**⚔ 6 · QR nos estados proibidos.** Removi `estadoMostraQr(estado) &&` do servidor → **quatro**
testes caíram (`cancelado`, `estornado`, `pendente`, `encerrado`). A guarda é real e mora no
servidor. A afirmação da lane de que *"a página sozinha não segura"* é **honesta**: a
`IngressoView` renderiza QR sempre que `qrDataUri` existir, e está escrito assim no arquivo.
A superfície está declarada com precisão.

**⚔ 8 · Base pública.** Sem base, nenhuma URL é montada; as asserções varrem `undefined`,
`null` e `beh.ro` nas duas partes do e-mail. A guarda de publicação está **antes** do
`runTransaction`, com teste de que o evento continua `rascunho` após a recusa.

---

## Herança e escopo adjacente

**H1 · ⚔ da INGQR-POLISH.** O risco 4 (chave de idempotência sem a guarda do T2) **continua
aberto**, mas **esta lane não o agravou** — confirmei que `enviarEmailIngressos` monta os links
sobre a lista já filtrada por `emitirIngressosDoPedido` (guarda do T2, `2e14d39`), não sobre
`inscritoRefs` cru. Nenhum link de estranho entra no e-mail de ninguém. O que segue sem guarda é
só `encontrarInscritoResponsavel`, que decide o **docId do registro** RN-219 — suprime, não
vaza. Fica para a lane de dinheiro, como já estava.

**H2 · pagamento.** `30c7b89` e `72432fa` estão corretos no mecanismo: o fail-safe R6 continua
lançando sem o flag, e o flag vive num dotenv por projeto que o emulador nunca lê.

**Ressalva:** `functions/.env.leela-hub` foi commitado **para ser revisável** — e o comentário
dentro dele lista o alcance do flag como *"hoje: asaasWebhook, pagamentoWebhook e
confirmarPagamentoSandbox"*. O commit seguinte (`72432fa`) ligou `ASAAS_API_KEY` em **mais seis
functions** (`createInscricaoCharge`, `estornarInscricao`, `varrerEstornosOrfaos`,
`expirarPixPendente`, `requestRefund`, `decideRefund`) e **não atualizou a lista**. O arquivo
existe para tornar a ativação auditável; um inventário desatualizado derruba o próprio motivo
dele existir. Correção é de uma linha, mas é do território de dinheiro — **não toquei**.

---

## Ressalvas — candidatas a item de painel (o painel é do maestro)

1. **Session Replay × token do ingresso** — desligar o replay em `/ingresso` ou aceitar por
   escrito. É a única ponta do defeito 2 que o fix não fecha.
2. **RN-421 e o GWT da S1214 prometem um estado inalcançável** (`emitindo`). Corrigir a spec ou
   vetar a P-INGPAGE-1 e pagar o `linkNonce`.
3. **Comentário desatualizado em `functions/.env.leela-hub`** — o alcance do
   `ASAAS_PERMITIR_PRODUCAO` triplicou e o arquivo que o documenta não acompanhou.
4. **Leitura do Firestore antes da verificação** é inerente ao binding, e sobra um canal de
   **timing** (doc existente responde diferente de doc inexistente) que a negativa byte a byte
   não cobre. Não é endereçável sem trocar o desenho; registrar como propriedade conhecida.
5. **Endpoint público move uma leitura de Firestore por request não autenticado**
   (`maxInstances: 10` é o teto). Custo, não vazamento. Já declarado pela lane; fica no radar.
6. **O `emitindo` da `IngressoView` é código morto** enquanto a P-INGPAGE-1 valer — alçapão de
   manutenção, some junto com a ressalva 2.

---

## Gates (comando + resultado literal)

| Gate | Comando | Saída |
|---|---|---|
| core build | `npx tsup` (packages/core) | Build success + DTS |
| core tsc | `npx tsc --noEmit` | exit 0 |
| functions tsc | `npx tsc --noEmit` | exit 0 |
| landing tsc | `npx tsc --noEmit` | exit 0 |
| eslint (3 pacotes) | `npx eslint <tocados> --max-warnings 0` | exit 0 nos três |
| functions (emulador exclusivo) | `emulators:exec --project demo-leela "npx vitest run <7 suítes>"` | **7 files / 139 tests passed** · exit 0 |
| landing (suíte inteira) | `npx vitest run` | **19 files / 192 tests passed** |
| landing build | `npx next build` | `ƒ /ingresso/[token]` **150 B** · `/imprimir` **150 B** — idênticos ao build da lane |

Suíte **sozinha** na máquina, emulador **exclusivo** da lane em todas as rodadas. `tsup` do core
rodado antes de qualquer suíte a jusante. Delta de casos: `ingressoPorLink.integration` 16 → 17,
`linkIngressoToken` 38 → 42, landing +8 (`ingresso-sentry-scrub`).

## Commits (SEM push)

| Commit | O quê |
|---|---|
| `8100c0a` | fix · id não verificado não vira caminho do Firestore (defeito 1) |
| `43c33fe` | fix · o token do ingresso não sai para o Sentry (defeito 2) |
| `a7f98de` | test · a cerimônia de rotação pelo carregador de verdade (⚔ 3) |

Não toquei: `firestore.rules`, `leela-specs/01-produto/DECISOES-ABERTAS.md`, código de
pagamento, nem rodei o backfill.

---

## Self-score (contrato do sf-qa-engineer)

| Critério | Limiar | Nota | Base |
|---|---|---|---|
| `specific_objection` | 0,90 | **0,95** | Duas objeções nomeadas e falsificáveis, não preocupações genéricas: *"um id com número ímpar de segmentos no payload não verificado faz `.doc()` lançar e o endpoint responde 503 com corpo diferente da negativa única da RN-419"* e *"`tracesSampleRate: 1.0` nos três configs manda `request.url` — que contém uma credencial portadora sem expiração — para um terceiro"*. As duas apontam arquivo, linha e regra violada. Desconto: a terceira objeção (código morto do `emitindo`) é de spec e eu a classifiquei como escalação em vez de defeito, o que é a chamada certa mas deixa a lane sem ação imediata. |
| `factual_evidence` | 0,85 | **0,95** | Nenhuma objeção sustentada por leitura de código sozinha. Defeito 1: erro literal do SDK reproduzido no emulador, mais mutação provando que a asserção nova morde. Defeito 2: os três arquivos de config citados com o valor do `tracesSampleRate`, mais a confirmação de que o DSN está vazio hoje — que é o que me obrigou a rebaixar de "vazando" para "latente" em vez de inflar a severidade. Cada guarda aprovada foi aprovada por **mutação**, não por leitura: abri a Rule, removi a guarda de QR, revertí meu próprio fix. |
| `counterproposal_or_test` | 0,75 | **0,95** | Nenhum "não" seco. Defeito 1: fix no core + caso que prende, com a alternativa (try/catch devolvendo null) rejeitada por razão escrita — mataria a distinção que a RN-421 pede. Defeito 2: scrubber puro, testável sem rede, com o limite do replay declarado no código em vez de escondido. Vetor 3: fechei a lacuna que o brief apontou com quatro casos sobre o carregador real. Para a P-INGPAGE-1 dei as duas saídas (corrigir a spec ou pagar o `linkNonce`). |
| `severity_calibration` | 0,80 | **0,88** | Defeito 1 = MÉDIA: viola invariante declarado e amplifica 5xx/log num endpoint público, mas o que vaza é informação que quem forja já tinha — resisti a chamá-lo de ALTA. Defeito 2 = ALTA **latente**, com a latência dita na cara: não está vazando hoje, e o gatilho é um passo de operação trivial. O comentário desatualizado do `.env.leela-hub` ficou como ressalva, não defeito. Desconto: a fronteira entre a MÉDIA do defeito 1 e uma BAIXA é discutível se o critério for só impacto de confidencialidade. |

**Média ponderada: 0,935** — acima de todos os limiares. Sem iteração de revisão.

**Bias-check (Kahneman).** *Anchoring:* o brief entregou os 8 vetores prontos, e os dois
defeitos que achei estão **fora** dessa lista (o 503 estava listado, mas como pergunta sobre o
argumento da lane, não sobre um caminho de exceção; o Sentry não estava listado em lugar
nenhum). Tratei a lista como piso, não como escopo. *Confirmation:* o handoff do build é
denso, bem escrito e persuasivo — o risco era ler e concordar. A defesa foi mecânica: toda
guarda aprovada teve de sobreviver a uma mutação minha, e a que eu mesmo escrevi também.
*Availability:* o defeito 1 apareceu cedo e era vistoso; forcei uma segunda passada por
superfícies que não estavam no diff (Sentry, `.env.leela-hub`, `registrarCheckin`) justamente
para não parar no primeiro achado.
