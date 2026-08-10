---
trace: leela-deploy-corte-check-20260809
lane: DEPLOY-CORTE
wave: retroativo — este é o handoff que a lane original deveria ter escrito e não escreveu
employee: sf-platform-lead (software-forge)
repo: C:\dev\LEELA
branch: main
head_medido: 9fbcd9ab (== origin/main)
data: 2026-08-09
papel: medição READ-ONLY de produção contra o baseline — nenhum deploy, nenhuma escrita
---

# DEPLOY-CORTE · o que subiu, medido depois que o terminal morreu

## Por que este arquivo nasce agora

Em 09/08 ~13h a lane DEPLOY-CORTE estava em voo, subindo três coisas em sequência —
functions (sexta recusa `conta_inelegivel`) → painel (overlay/Modal + fix crítico + parser
de 18 campos) → landing (a frase da sexta recusa) — e o terminal travou no meio. Nenhum
handoff ficou no disco. O adendo do maestro (`leela-maestro-pausa-20260809.md`) mandou medir
produção contra o baseline, nunca pela memória. É o que este arquivo faz, com prova em cada
linha.

**Não fiz deploy nenhum.** Onde a medição diz que falta subir algo, isso é recomendação, não
ação — a lane de deploy é dispatch do maestro, separada desta.

## Método

- **Functions:** sem `gcloud` na máquina, li o metadata de cada function pela Cloud Functions
  API v1 (`GET .../functions/{nome}`), autenticado com o `access_token` já válido do
  configstore do `firebase-tools` (o mesmo que `firebase functions:list` usa por baixo). É
  leitura pura — `GET`, sem `deploy`, sem escrita em nenhum recurso.
- **Painel e landing:** hash do bundle **baixado do ar** (`leela-hub.web.app` e
  `leela-landing.web.app`), nunca por mtime local. Toda sonda de string rodou com controle
  positivo (frase que já sabíamos estar no ar) e controle negativo (string que nunca existiu),
  para a ausência de uma string não virar falso negativo por sonda quebrada.
- Uma chamada real e não-autenticada ao callable `promoverParaProfissional` — leitura pura,
  a checagem de auth do próprio código recusa antes de tocar qualquer dado (é o mesmo smoke
  que a DEPLOY-FINAL já usou).

## Timeline dos commits que a lane tentou subir

| Hora (-03) | Commit | O quê |
|---|---|---|
| 10:25:55 | `2271fd78` | refactor: régua de elegibilidade sai do resgate para `elegibilidadeOrganizador.ts` — **functions** |
| 10:26:21 | `38420cb6` | feat: a porta ganha `conta_inelegivel` (PONTE-ELEGIVEL-1) — **functions** + api-client + landing (frase) |
| 10:33:55 | `9f75c286` | test: a sexta recusa provada contra o banco real — só teste |
| 10:36:55 | `7b55d1b3` | fix: aviso vira `Modal` do DS, borda sobe — **painel** (OVERLAY, como entregue) |
| 11:48:19 | `41bb7e8b` | fix: 13 campos numéricos ganham onde exibir a recusa do parser — **painel** |
| 12:16:18 | `431c92ac` | feat: a régua do ponto/vírgula sai do cabeçalho e entra na tela (`textosDeCampo.ts`) — **painel** |
| 12:17:09 | `1fb9fd4a` | board: T5 fecha construída — início da REV-CORTE (12:19) |
| **12:43:10** | `d9394f51` | fix **crítico**, pago pela própria REV-CORTE: o painel liberado nascia morto — **painel** |
| ~13:0x | *(sem commit — é deploy, não código)* | **DEPLOY-CORTE em voo**: functions sobe, painel não chega a subir, terminal morre |

O pacote só é deployável com `d9394f51` dentro — é o veredito escrito da REV-CORTE
(`leela-painel-corte-20260809-REV-CORTE.md`): sem ele, o alvo 1 sobe com o painel morto no
caminho feliz.

## Placar · subiu × não subiu

| Frente | Subiu? | Prova |
|---|---|---|
| **Functions** (`promoverParaProfissional`, `resgatarConviteOrganizador`) | ✅ **SUBIU** | `updateTime` da Cloud Functions API: **09/08 13:09:18 e 13:09:02 -03** — isolado a exatamente essas 2 de 98 functions do projeto, as duas com o mesmo hash de deploy (`96fd6d7f37b2e7…`), o resto todo datado de 05–06/08 |
| **Painel** (OVERLAY `7b55d1b3`+`d9394f51`, PARSE `41bb7e8b`+`431c92ac`) | ❌ **NÃO SUBIU** | bundle no ar **byte a byte idêntico** ao baseline de 08/08 23:27 — mesmo nome (`index-CfBX04Vv.js`/`index-3PlkfKJK.css`), mesmo tamanho (2.250.083 B / 109.979 B), **mesmo sha256**. As 4 frases novas do PARSE ausentes no JS baixado; controle positivo (frases que já existiam) presente |
| **Landing** (frase da sexta recusa) | ❌ **NÃO SUBIU** | bundle no ar **byte a byte idêntico** ao baseline de 08/08 23:37 — mesmo `main-app-e695e72d…`, mesmos 3 chunks CSS, **mesmo sha256**. A frase "Fale com o time Leela para liberar o seu acesso" ausente nos 22 chunks que `/minha-conta` referencia; controle positivo ("Painel Profissional", o aviso do segundo login) presente |

---

## Functions — SUBIU, medido pela API, não pela memória

```
GET https://cloudfunctions.googleapis.com/v1/projects/leela-hub/locations/us-central1/functions/promoverParaProfissional
status 200
  updateTime: 2026-08-09T16:09:18.355Z   (13:09:18 -03)
  versionId:  3
  labels['firebase-functions-hash']: 96fd6d7f37b2e700812800ce54b4cd5dd78cc9a9

GET .../functions/resgatarConviteOrganizador
status 200
  updateTime: 2026-08-09T16:09:02.291Z   (13:09:02 -03)
  versionId:  3
  labels['firebase-functions-hash']: 96fd6d7f37b2e700812800ce54b4cd5dd78cc9a9   (mesmo hash)
```

Listei as **98 functions** do projeto por `updateTime` decrescente. As únicas duas com
carimbo de 09/08 são exatamente as duas que `elegibilidadeOrganizador.ts` toca —
`promoverParaProfissional` (a porta) e `resgatarConviteOrganizador` (o portão). Todo o resto
do projeto está datado de 05, 06 ou 28/07 — nenhuma outra function se moveu hoje. O hash de
deploy **igual** nas duas é o esperado: as duas empacotam o mesmo módulo compartilhado que
mudou.

A hora bate com a janela que a pausa registrou ("~13h a lane estava em voo") e é **depois**
dos commits (10:25–10:36) e **antes** do fim da janela de pausa. Isso fecha a conta: a
DEPLOY-CORTE rodou `firebase deploy --only functions`, ele **terminou com sucesso**, e só
depois — no passo seguinte da sequência (painel) — a lane morreu.

Smoke de leitura, sem tocar banco:

```
POST https://us-central1-leela-hub.cloudfunctions.net/promoverParaProfissional  { data: {} }
status 401
{"error":{"details":{"motivo":"sem_sessao"},"message":"Entre na sua conta para continuar.","status":"UNAUTHENTICATED"}}
```

Endpoint vivo e respondendo — a checagem de auth (linha 1 do código) recusa antes de
qualquer leitura ou escrita, então este smoke não distingue versão de código (o comportamento
seria o mesmo antes e depois do corte). A prova de versão é o `updateTime`, não este smoke —
registrado aqui só como confirmação de saúde do endpoint, no mesmo espírito da DEPLOY-FINAL.

## Painel — NÃO SUBIU, byte a byte o de ontem

```
GET https://leela-hub.web.app/                     -> assets/index-CfBX04Vv.js + index-3PlkfKJK.css
```

Mesmo nome do baseline de 08/08 23:27 (`leela-retomada-20260808-DEPLOY-FINAL.md`, Passo 4).
Como o Vite nomeia pelo hash do **conteúdo**, nome igual já seria forte — mas medi o
conteúdo, não confiei no nome:

| Asset | bytes | sha256 no ar (hoje) | sha256 registrado no baseline (08/08 23:27) |
|---|---|---|---|
| `index-CfBX04Vv.js` | 2.250.083 | `9cfe13f4de0dd1574ca04a49695e23962e97ccf2af82287b1f296a713614b034` | **idêntico** |
| `index-3PlkfKJK.css` | 109.979 | `60bce6cc9f9e4951d48784ed151638233c29506e9cdbe82340739cd5ebd783a8` | **idêntico** |

Byte a byte o mesmo arquivo. Para não ficar só no hash, procurei as 4 frases que só existem
porque `431c92ac` criou `lib/textosDeCampo.ts` — se o painel tivesse rebuildado com o corte
dentro, elas estariam no JS minificado (string literal sobrevive à minificação):

| String (origem) | No JS baixado hoje? |
|---|---|
| "…mil duzentos e trinta e quatro…" (`REGUA_PONTO_E_VIRGULA`, `431c92ac`) | **ausente** |
| "Em branco vale 0 (nenhum kit disponível)" (`CAPACIDADE_DE_KIT_EM_BRANCO`, `431c92ac`) | **ausente** |
| "Ex.: 1.000" (`EXEMPLO_DE_MIL_NA_VAGA`, `431c92ac`) | **ausente** |
| "a campanha sai 24 horas antes" (`INTERVALO_PADRAO_DA_AUTOMACAO`, `431c92ac`) | **ausente** |
| controle positivo — erro pré-existente do parser ("Ponto separa milhar e vírgula separa centavos…") | **presente** |
| controle negativo (`xyzzy0809corte`) | **ausente** |

A sonda distingue presente de ausente (os dois controles se comportam como deveriam), e as
4 strings do corte não estão lá. ⚠️ Um cuidado que vale registrar: a busca solta por "O ponto
separa o milhar" bate **falso positivo** — é substring de uma mensagem de erro **diferente e
pré-existente** do `parseContagemPtBr` ("Pontuação fora do padrão. O ponto separa o milhar, de
três em três…"). A tabela acima usa o texto completo e exclusivo de cada constante nova, não
o fragmento ambíguo.

**Conclusão: nada do OVERLAY (`7b55d1b3`+`d9394f51`) nem do PARSE (`41bb7e8b`+`431c92ac`)
está no ar.** O painel que o dono vê hoje é exatamente o da DEPLOY-FINAL de ontem à noite.

## Landing — NÃO SUBIU, byte a byte o de ontem

```
GET https://leela-landing.web.app/   -> main-app-e695e72d2f035e50.js + 3 chunks CSS
```

| Asset | bytes | sha256 no ar (hoje) | sha256 registrado no baseline (08/08 23:37) |
|---|---|---|---|
| `main-app-e695e72d2f035e50.js` | 2.326 | `bccf32dcd1d02e54b64e8cd1e02426d296ea5811a16c034c7c0f7d29502865f7` | (chunk registrado como "DEPOIS" na DEPLOY-FINAL) |
| `5c28c218c2cc65aa.css` (tema) | 14.335 | `7fca237066ca65d50b90d229efa852d034a1d3a84bc2d9c7805c19530a1f4ca8` | **idêntico ao registrado** |

Baixei os 22 chunks que `/minha-conta` referencia (mesmo método da DEPLOY-FINAL) e busquei a
frase que `38420cb6` adicionou ao `FRASE_DA_RECUSA` de `PortasDaConta.tsx`:

| String | Nos 22 chunks de `/minha-conta`? |
|---|---|
| "Fale com o time Leela para liberar o seu acesso" (`conta_inelegivel`, `38420cb6`) | **ausente** |
| controle positivo — "Painel Profissional" (rótulo já confirmado no ar pela DEPLOY-FINAL) | **presente** |
| controle positivo — "O painel vai pedir sua senha de novo" (aviso do segundo login) | **presente** |
| controle negativo (`xyzzy0809corte`) | **ausente** |

**Conclusão: a frase da sexta recusa não está na landing.** O cartão "Quer organizar eventos
ou criar um club?" que o dono vê hoje é o mesmo de ontem às 23:37.

---

## Divergência explicada: a sexta recusa está viva no servidor e o cliente antigo não a conhece

Isto não é ausência silenciosa — é uma inconsistência real, e o próprio código antigo já
previa o caminho de saída. `promoverParaProfissional` (functions, **já no ar**) agora recusa
o divulgador e a ex-organizadora rebaixada de propósito com `details.motivo:
'conta_inelegivel'`. A landing que está no ar hoje roda a versão **anterior** de
`packages/api-client/profissionais.ts`, cuja lista `MOTIVOS_NOMEADOS` **não conhece**
`'conta_inelegivel'` — o próprio comentário do código antigo diz o que acontece:

```ts
/** Motivos que o servidor nomeia — o resto cai em `indisponivel`. */
```

`motivoDaRecusaDaPromocao()` não reconhece a string nova, cai no fallback, e a tela antiga
mostra a frase genérica que já existia: *"Não conseguimos abrir o painel profissional agora.
Tente de novo em instantes."* — em vez da frase nova, nomeada, com o caminho de saída ("fale
com o time Leela"). **Não quebra, não expõe erro cru, degrada para o comportamento antigo.**
O alcance é estreito (só quem é divulgador ou foi rebaixado de propósito e tenta a ponte), mas
é uma inconsistência real de produção enquanto o painel/landing não sobem, e fecha sozinha
assim que a landing subir.

## Estado do board

`leela-specs/00-boards/V1-KANBAN.md` — os cards `S1242-T1`, `S1242-T5` e `S1242-T14` (e o
espelho `S1234-T7`) trazem a nota "⚠️ NÃO está no ar", escrita pela REV-CORTE **antes** da
tentativa de deploy. Essa nota ficou **parcialmente desatualizada**: o lado *functions* do
T14 está no ar desde 13:09; o lado *landing* do mesmo T14 (a frase) e os T1/T5 (painel
inteiro) continuam corretos como estão escritos.

Não editei o board. Não existe card `DEPLOY-CORTE` — a regra desta lane é escrever nota **só
se o card da lane existir**, e os três cards que existem pertencem à REV-CORTE, não a esta
medição. Deixo registrado aqui para quem tocar o board a seguir.

## Recomendação final — ordem para a lane de deploy da retomada

1. **Painel primeiro.** Build + `firebase deploy --only hosting --project prod --config
   firebase.prod.json`, com o HEAD atual (`9fbcd9ab`), que já inclui `d9394f51`. **Não subir
   sem ele** — é a condição escrita da REV-CORTE (sem o fix, o painel recém-liberado nasce
   morto no caminho feliz do resgate). Confirmar depois pelo mesmo método daqui: hash do
   bundle baixado, mudou de nome, e as 4 frases do PARSE aparecem no JS.
2. **Landing em seguida.** Fecha a inconsistência descrita acima — a frase nomeada da sexta
   recusa passa a aparecer para o divulgador/rebaixada, em vez do fallback genérico. Confirmar
   pela mesma sonda: "Fale com o time Leela para liberar o seu acesso" aparece nos chunks de
   `/minha-conta`.
3. **Functions não precisa de nada.** Já está no ar, já foi medido, e o conteúdo bate com os
   commits de PONTE-ELEGIVEL-1. Não há ação pendente nesta frente.

Nenhum dos dois passos acima tem review antagonista pendente — a REV-CORTE já aprovou os três
alvos com ressalvas, nenhuma delas bloqueante. O deploy pode seguir direto.

## Nada foi violado

Não fiz deploy de hosting, functions, Firestore, Rules, índices ou storage. Não escrevi em
nenhum documento de produção. Não rodei suíte. Não abri navegador. Toda leitura de Firestore
foi zero — as duas únicas escritas possíveis (o smoke do callable e as leituras de metadata)
são, por desenho do próprio código de produção, recusadas antes de qualquer toque no banco.
`git commit --only` nos dois arquivos que toquei (este handoff); sem `--amend`, sem `stash` —
outra lane pode estar na mesma árvore.

## Fechamento

| Frente | Estado | Prova |
|---|---|---|
| Functions (`conta_inelegivel`, PONTE-ELEGIVEL-1) | ✅ **NO AR desde 09/08 13:09** | `updateTime` da Cloud Functions API, isolado a 2 de 98 functions, mesmo hash de deploy nas duas |
| Painel (OVERLAY + fix crítico + PARSE) | ❌ **fora do ar** | bundle idêntico byte a byte ao baseline de 08/08 23:27 (mesmo nome, mesmo tamanho, mesmo sha256); 4 strings novas ausentes |
| Landing (frase da sexta recusa) | ❌ **fora do ar** | bundle idêntico byte a byte ao baseline de 08/08 23:37 (mesmo hash); a frase nova ausente nos 22 chunks de `/minha-conta` |
| Divergência | ⚠️ **explicada** | functions no ar + landing fora do ar = o cliente antigo cai no fallback `indisponivel` para a sexta recusa — degradação graciosa, sem crash, alcance estreito |
| Board | ⚠️ **nota da REV-CORTE parcialmente desatualizada** (T14, lado functions) | não editado — sem card `DEPLOY-CORTE`; registrado aqui |
