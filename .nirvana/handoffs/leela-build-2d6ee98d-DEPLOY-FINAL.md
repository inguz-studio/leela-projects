# Handoff vivo · lane DEPLOY-FINAL · trace leela-build-2d6ee98d · 2026-08-03

Executor: sf-backend-lead (software-forge). Brief: `.nirvana/briefs/leela-build-2d6ee98d-DEPLOY-FINAL-enriched.md`.
Receitas: `.nirvana/handoffs/leela-build-2d6ee98d-PIXFIX-EXTREF.md` (T5) e o padrão de prova D0 em
`.nirvana/handoffs/leela-build-2d6ee98d-ACHADOS-BUILD.md`.

Base: `main` em `d9faa04a`, árvore limpa. Sem push — o maestro pusha.
Ordem cumprida: **functions primeiro, landing depois**.

## Estado da fila

- [x] **T1 · diff de superfície** — duas callables, e a prova de que nenhuma outra function foi tocada
- [x] **T2 · deploy das functions** — `createInscricaoCharge` + `cotarInscricaoCheckout`, exit 0
- [x] **T3 · deploy da landing** — um comando, chunk trocado e provado byte a byte
- [x] **T4 · fumaça sem mutação** — 5 rotas, log limpo, ZERO compra criada

---

## T1 · o que mudou, e por que o alvo é exatamente duas functions

O deploy vigente das functions é o da PIXFIX (`2a8c536`, audit log `2026-08-03T01:27:40Z`), e ele
tocou **só** `createInscricaoCharge`. Todo o resto do código servido é anterior.

### O diff de produção desde aquele deploy

`git diff --name-only 2a8c536 HEAD`, excluindo `apps/`, `leela-specs/` e `.nirvana/`:

| Arquivo | Deployável? | Por quê |
|---|---|---|
| `functions/src/checkout/createInscricaoCharge.ts` | **SIM** | +207/−3 — C3, C4, C5, A2 |
| `functions/src/checkout/cotarInscricaoCheckout.ts` | **SIM** | +43 — A2 (`jurosParcelamento` no contrato) |
| `functions/src/seed/commercialTerms.seed.ts` | não | seed **não é exportado** em `functions/src/index.ts` |
| `functions/src/seed/pedidos.seed.ts` | não | idem |
| `functions/scripts/preview-seed-clubes.ts` | não | script de emulator, fora do bundle |
| `functions/src/__tests__/*` (6 arquivos) | não | suíte |
| `packages/core/src/**` (5 arquivos) | **embutido** | ver abaixo |
| `packages/api-client/src/checkout.ts` | não (functions) | só tipos; `tsup` não emite runtime para interface |
| `packages/design-system/**` | não (functions) | território da landing |

`firestore.indexes.json`, `firestore.rules`, `storage.rules`, `firebase.prod.json` e
`functions/package.json`: **zero mudança** desde `2a8c536`. Por isso o `--only` desta lane **não**
carrega `firestore:indexes` (a PIXFIX já deployou os 15 índices) nem `storage`.

### O core é embutido, então a pergunta certa é: ele chega em QUEM?

`functions/scripts/bundle-deploy.mjs` usa esbuild para embutir `@leela/core` a partir do **dist já
compilado**. Uma mudança no core alcança toda function que o importe — logo o alvo não pode sair
do diff de `functions/src/`. Varredura dos símbolos que mudaram, em `functions/src` sem os testes:

| Símbolo que mudou | Consumidores em `functions/src` |
|---|---|
| `buildInstallmentOptions` (Price + piso DEF-1) | `checkout/saleState.ts` do core → `computeSaleState` → **cotarInscricaoCheckout**, **createInscricaoCharge**; e `seed/pedidos.seed.ts` (não deployado) |
| `MOTIVO_ACEITE_VERSAO_DIVERGENTE`, `ACEITE_USER_AGENT_MAX`, `VersoesAceiteExibidas`, `OrigemAceite` | **createInscricaoCharge** apenas |
| `DEFAULT_COMMERCIAL_TERMS.jurosAoMes` 0 → 2,89 | `seed/commercialTerms.seed.ts` e `seed/pedidos.seed.ts` — **os dois não são exportados** |
| `pedidos/pagamento.ts` | só comentário (os 3,49% que a B2t aposentou) — zero runtime |

Grep de controle: `installmentRules|opcoesParcelamento|jurosAoMes|jurosParcelamento` fora de
`src/checkout/` e `src/seed/` devolve **uma linha**, e é um comentário em
`platform/aplicarPlano.ts:144`.

### Decisão

```
--only functions:createInscricaoCharge,functions:cotarInscricaoCheckout
```

É o mínimo que cobre todas as superfícies alteradas, e é mínimo de verdade: as outras ~70 functions
não têm uma linha de diferença entre o bundle delas e o novo. Deployá-las custaria build e janela de
indisponibilidade sem trocar comportamento nenhum.

### ⚠️ Achado do T1: `cotarInscricaoCheckout` estava mais atrasada do que o brief supõe

O audit log dela mostra o último `UpdateFunction` em **2026-07-28T23:56:35Z** — ela nunca entrou no
deploy do `CRM_ID_PEPPER` (29/07) nem no da PIXFIX. O código que ela servia era o de `cf1266da`.
O salto real desta lane, para ela, não é só a A2:

```
git diff --stat cf1266da HEAD -- functions/src/checkout/cotarInscricaoCheckout.ts packages/core/src
 11 arquivos, 928 inserções, 30 remoções
```

Entra junto todo o core acumulado desde 28/07 (`tickets/linkIngresso.ts`, `eventos/kit.ts`,
`affiliation/linkPromocional.ts`, além da `finance/calc.ts`). Tudo já passou pelos gates das lanes
que o produziu; o registro existe porque a superfície é maior do que "a A2", e quem for ler o log
dela depois precisa saber disso.

---

## T2 · as functions no ar

```
npx firebase-tools@13 deploy \
  --only functions:createInscricaoCharge,functions:cotarInscricaoCheckout \
  --project prod --config firebase.prod.json --force
```

| | |
|---|---|
| Janela | `2026-08-03T08:10:17Z` → `2026-08-03T08:12:49Z` |
| Exit do comando | **0** — *Deploy complete!* |
| Predeploy | `npm --prefix functions run build` (tsc) + `bundle-deploy.mjs` — ambos OK |
| Pacote enviado | `functions-deploy` **301,13 KB** (era 298,47 KB na PIXFIX) |
| Functions | `createInscricaoCharge(us-central1)` e `cotarInscricaoCheckout(us-central1)` — *Successful update operation* nas duas |
| Outras ~70 functions | **intocadas** (o filtro é por nome) |
| Mutação de dado de produção | **nenhuma** além do deploy |

### Pré-condição que a receita não cobre, e que quase custou o deploy

`bundle-deploy.mjs` embute o `@leela/core` **do `dist`**, e o predeploy do `firebase.prod.json`
**não** constrói o core. `packages/core/dist` estava de `04:10` e o HEAD é de `02:50` — coincidiu de
estar em dia, mas por acaso. Rodei `packages/core → tsup` **antes** do deploy, e é o que deve entrar
na receita: sem isso o bundle sobe com o core anterior e o piso do DEF-1 fica de fora, que é
exatamente a regressão de dinheiro que a lane existe para evitar.

(O mesmo problema mordeu de verdade na landing — ver T3.)

### Prova 1 — o código servido mudou, e mudou no lugar certo

Contagem de marcadores ASCII no `functions-deploy/index.js` **antes** (o artefato de `22:26` local,
que é o da PIXFIX — `md5 411dc0f7eba0cea5c0d3dedb06153cc0`) e **depois** do predeploy
(`md5 1ba9f600c8f80f066a59836a67e9029e`, 1.160.021 bytes):

| Marcador | Origem | Antes | Depois |
|---|---|---|---|
| `jurosParcelamento` | A2 · juro nomeado no contrato | 0 | **7** |
| `aceite_versao_divergente` | C4 · motivo tipado da recusa | 0 | **1** |
| `versoesExibidas` | C4 · a versão que a tela declarou | 0 | **5** |
| `origemAceite` | C5 · origem da prova de aceite | 0 | **8** |
| `ipHash` | C5 · HMAC do endereço | 0 | **7** |
| `x-forwarded-for` | C5 · o cliente atrás do proxy | 0 | **2** |
| `saudeCustom` | C3 · terceiro aceite | 11 | **15** |
| `valorParcela * n) < valor` | **DEF-1 · o piso do principal** | 0 | **1** |
| `digestIdempotencyKey` (controle) | PIXFIX T1 | 4 | 4 |
| `EXTERNAL_REF_MAX_LEN` (controle) | PIXFIX T2 | 4 | 4 |
| `checkout_gateway_recusou` (controle) | PIXFIX T3 | 1 | 1 |
| `checkout_gateway_sem_resposta` (controle) | PIXFIX T3 | 1 | 1 |

As quatro últimas são o controle: se alguma tivesse zerado, este deploy teria **desfeito** a PIXFIX
em vez de somar a ela. Nenhuma zerou.

### Prova 2 — a release nova está no ar, com os segredos

Audit log (`functions:log`, entradas `CloudFunctionsService`):

| Function | `UpdateFunction` anterior | `UpdateFunction` desta lane |
|---|---|---|
| `createInscricaoCharge` | 2026-08-03T01:27:40Z (PIXFIX) | **2026-08-03T08:11:04Z** (conclusão 08:12:03Z) |
| `cotarInscricaoCheckout` | 2026-07-28T23:56:35Z | **2026-08-03T08:12:00Z** (conclusão 08:12:42Z) |

Segredos declarados no `runWith` de `createInscricaoCharge`, lidos do próprio audit log:
`ASAAS_API_KEY`, `ASAAS_WEBHOOK_AUTH_TOKEN`, `CRM_ID_PEPPER` — os três, versão 1, projeto
`leela-hub`. `cotarInscricaoCheckout` sobe com **zero** segredos, e isso é o contrato dela: no
código é `https.onCall` puro, sem `runWith` — ela cota, não cobra.

### Prova 3 — sonda de mutação zero

Preflight CORS: não executa o corpo do handler, não escreve nada, não chega ao gateway.

```
OPTIONS https://us-central1-leela-hub.cloudfunctions.net/createInscricaoCharge   → 204  0,549 s
OPTIONS https://us-central1-leela-hub.cloudfunctions.net/cotarInscricaoCheckout  → 204  0,409 s
                                                                    (2026-08-03T08:13:45Z)
```

⚠️ Isto **não** é a prova da compra. Continua valendo o que a PIXFIX escreveu: o primeiro `200` na
história de `createInscricaoCharge` só existe quando alguém percorrer a jornada, e isso é do dono.

---

## T3 · a landing no ar volta a ser o HEAD

Um comando, como a receita do D0 manda: `node apps/landing/scripts/deploy-leela-hub.mjs`.

| | |
|---|---|
| Janela | `2026-08-03T08:16:23Z` → `2026-08-03T08:24:29Z` |
| Exit do script | **0** — *Deploy complete!* |
| Backend SSR | `ssrleelalanding` (gen2, Node 22, us-central1) — *Successful update operation* |
| Hosting | **95 arquivos, 21 novos** · *release complete* (o D0 tinha 90/12) |
| Pacote da função | 285,36 MB (era 284,37 MB no D0) |
| `package.json` do app | restaurado pelo `finally` (`[deploy-landing] package.json restaurado.`) |

### O defeito que quase subiu junto: `dist` de workspace atrasado

`apps/landing/next.config.js` **não** declara `transpilePackages`, então o webpack resolve
`@leela/core`, `@leela/api-client` e `@leela/design-system` pelo `exports` do `package.json` —
isto é, **pelo `dist`**. O `dist` é o artefato de verdade, e o script de deploy não o constrói.
Medido antes de rodar o build:

| Pacote | `dist` em disco | Commit mais novo do `src` | Veredito |
|---|---|---|---|
| `@leela/api-client` | 01:47 | `e57ce3bc` (C4) às **01:56** | **ATRASADO** — `versoesExibidas` ausente do `.d.ts` |
| `@leela/design-system` | 02:10 | `dde81820` (D2) às **02:17** | **ATRASADO** — sem a margem da legend (D1) e sem o handler do card (D2) |
| `@leela/core` | 04:10 | `4c3b9986` (DEF-1) às 02:50 | em dia por acaso |

Os três foram reconstruídos com `tsup` antes do deploy. Sem isso a landing teria subido **sem a C4
no contrato de tipos e sem a frente D inteira** — e o release pareceria bem-sucedido, porque nada
falha: o build simplesmente empacota o artefato velho. É a mesma armadilha da NAV-FIX, agora
medida em três pacotes de uma vez.

**Para a próxima aterrissagem:** construir `core`, `api-client` e `design-system` faz parte da
receita de deploy, tanto da landing quanto das functions. Hoje não está em script nenhum.

### Prova 1 — o chunk da rota de inscrição trocou, e é BYTE A BYTE o que foi construído aqui

O chunk é content-addressed: o nome **é** o hash do conteúdo.

- antes: `.../inscricao/page-**ac6808a1385e2ca8**.js` (o release do D0)
- depois: `.../inscricao/page-**13d465bf52ee3eac**.js`

```
md5  54c8b98418a4192cf7de7e2f3130338c  (baixado de leela-landing.web.app)
md5  54c8b98418a4192cf7de7e2f3130338c  .firebase/leela-landing/hosting/.../page-13d465bf52ee3eac.js
```

O chunk antigo passou a devolver **404** — o release rotacionou de verdade.

Um segundo chunk entrou na página e não existia antes: `473-d44d7d6f498271b6.js` (5.690 B,
`HTTP 200`, md5 `bab487eef3a6fbd5700a6d092c91afe1` no ar **e** no build local). É onde o
`@leela/core` deposita a constante do motivo de recusa da C4 — a página ANTES não referenciava
chunk `473-*` nenhum.

### Prova 2 — marcadores ASCII no bundle servido

Chunk da rota de inscrição, baixado do ar nos dois momentos, com três controles que **não** podiam
sumir:

| Marcador | Origem | Antes | Depois |
|---|---|---|---|
| `versoesExibidas` | C4 · a tela declara a versão que exibiu | 0 | **1** |
| `recarregarMaterial` | C4 · o seam que fecha o beco da recusa | 0 | **1** |
| `saudeCustom` | C3 · terceiro aceite no payload | 0 | **2** |
| `Juros do parcelamento` | A3 · linha de juros no bloco de totais | 0 | **2** |
| `inclusa no valor` | A3 · modo incorporada | 0 | **2** |
| `Taxa de servi\xe7o` | A3 · taxa nomeada por meio | 2 | **5** |
| `Modalidade oficial` | D3/PB-14 · o vocabulário novo | 0 | **1** |
| `Escolha seu percurso` | D3 · o vocabulário velho, que tinha de MORRER | 0 | 0 |
| `aceite_versao_divergente` | C4 · motivo tipado (vive no chunk `473`) | — | **1** |
| `Atualizando o total` (controle) | CKUX-REV `f291f33` | 1 | 1 |
| `totalDefasado` (controle) | CKUX-REV | 2 | 2 |
| `Pagar ` (controle) | rótulo normal | 1 | 1 |

**A C5 não aparece aqui de propósito:** ela é servidor puro (`origem { ipHash, userAgent }` derivada
do `rawRequest`). A prova dela é a linha `ipHash 0 → 7` da tabela do T2.

**A DEF-2 não deixa string.** São dois usos de um `useRef` dentro do `aplicarCupom`
(`assinaturaDeRef`), e minificação renomeia local. Vale o mesmo argumento que o D0 usou para o
`f249f33`: ela viaja no chunk cujo hash mudou e cuja identidade byte a byte com o artefato local
está provada acima, e está coberta por `checkout-s1216-cotacao-antecipada.test.tsx`.

### Prova 3 — a página do evento e a do produtor mudaram no HTML servido

Renderização de servidor, então o marcador está no HTML e é conferível sem baixar chunk:

| Rota | Marcador | Antes | Depois |
|---|---|---|---|
| `/meia-floripa-2026` | `Escolha seu percurso` (D3 · vocabulário velho) | 2 | **0** |
| `/meia-floripa-2026` | `Modalidades disponíveis` (D3 · vocabulário novo) | 0 | **2** |
| `/@castelo` | `Seções do perfil` (PerfilTabs · `aria-label` do `Tabs`) | 0 | **1** |
| `/@castelo` | `role="tablist"` / `role="tab"` / `role="tabpanel"` | 0/0/0 | **1/3/3** |
| `/@castelo` | rótulos `Feed`, `Eventos`, `Clubs` | — | 2 cada (aba + painel) |
| `/@castelo` | `aria-label="Instagram` (fileira de ícones, `f188f146`) | 0 | **1** |
| `/@castelo` | `Publicações de exemplo` (feed mock — **só no preview**) | 0 | **0** |

A última linha é o controle da `d9faa04a`: em produção o feed mostra o estado vazio digno, não o
exemplo. A a11y do menu vem do Radix de fábrica e está no documento servido.

---

## T4 · fumaça pós-deploy, sem tocar em dado

Cinco rotas, `GET`, medidas às `2026-08-03T08:26:08Z`:

```
200  3,25 s   45.717 B   /
200  1,55 s   80.339 B   /meia-floripa-2026
200  1,08 s   40.403 B   /meia-floripa-2026/inscricao
200  1,84 s   65.470 B   /@castelo
200  0,37 s        15 B  /health
```

Comparado com a medição de antes do release: a home ficou igual (45.710 → 45.717 B), a página do
evento cresceu 508 B (a copy da D3), a de inscrição 198 B, e **`/@castelo` cresceu 4.770 B** — que
é o menu de abas, a fileira de ícones e o painel de feed entrando na página.

### O log das functions na janela pós-release

| Function | Execuções depois do deploy | Erros |
|---|---|---|
| `createInscricaoCharge` | 1 — `08:13:45`, 163 ms, **204** | 0 |
| `cotarInscricaoCheckout` | 1 — `08:13:45`, 91 ms, **204** | 0 |
| `ssrleelalanding` | rollout + 6 requisições da fumaça | **0 linhas `E`** |

As duas únicas execuções das callables são as sondas de preflight do T2. Preflight não entra no
corpo do handler: **nenhum pedido, nenhum pagamento, nenhum inscrito foi criado por esta lane.**

No `ssrleelalanding`, a janela `08:24–08:26` tem zero linha de severidade `E`. As três linhas
barulhentas que o log ainda guarda (`MaxListenersExceededWarning` ×2 e o
`[leitorPerfil] listarPatrocinadoresPublicosDoTenant falhou · 9 FAILED_PRECONDITION`) são todas de
**00:31**, anteriores ao índice que a PIXFIX deployou. Depois do release de hoje, `/@castelo` — que
é justamente a página que consome `listarPatrocinadoresPublicosDoTenant` — respondeu 200 sem
produzir uma linha nova de `FAILED_PRECONDITION`. O índice de `parcerias` está de pé.

### ZERO mutação de produção

Toda chamada desta lane foi `GET` ou `OPTIONS`. Nenhuma escrita, nenhum documento tocado, nenhuma
compra criada. Os dois pedidos órfãos que a PIXFIX T6 mapeou continuam exatamente onde estavam —
a recomendação de **não limpar agora** segue de pé.

---

## O que NÃO subiu, e por quê

| Alvo | Por quê |
|---|---|
| As outras ~70 Cloud Functions | zero diff desde o bundle delas (T1). Deployá-las seria janela de risco sem troca de comportamento |
| `firestore:indexes` | `firestore.indexes.json` não mudou desde `2a8c536`; os 15 índices da PIXFIX estão no ar |
| `firestore.rules` / `storage.rules` | sem diff desde `2a8c536` |
| Hosting do **painel** (`leela-hub`) | fora do escopo da lane. `firebase.landing.json` declara UM site, então não havia caminho para tocá-lo mesmo por engano |
| Push do repositório | o brief manda commitar sem push — o maestro pusha |

## Pendências do DONO

1. **A compra real, ponta a ponta, é dele.** Esta lane não criou compra nenhuma, por instrução do
   brief. `createInscricaoCharge` continua com **0 × 200** na história; o primeiro sucesso é o que
   fecha a janela aberta pela PIXFIX. Cupons de teste **HEROI10** e **CORRA50** valem até 08/09.
   O que a compra tem de provar de uma vez: o `externalReference` de 91 chars aceito pelo gateway
   (PIXFIX), o `jurosParcelamento` na tela e no doc (A2/A3), a conferência de versão do aceite (C4)
   e a origem carimbada na prova (C5).
2. **Conferir as quatro coisas que só o olho dele fecha** (VETO-DONO da ACHADOS, agora servidas):
   as três fotos de kit, o espaço entre o rótulo do grupo e o primeiro cartão (D1), o clique no
   cartão no telefone (D2) e a copy "Modalidades disponíveis" / "Modalidade oficial" (D3).
3. **A página do produtor** `https://leela-landing.web.app/@castelo` — o menu Feed/Eventos/Clubs
   abre em **Eventos** por decisão (D-ACH-16), e o Feed mostra estado vazio em produção. Se ele
   esperava ver o feed de exemplo, isso é preview, não produção.
4. **Decisões herdadas da PIXFIX que continuam abertas:** apertar ou não a RN-333 (premissa 3), e o
   destino dos dois pedidos órfãos do `desafio-mtb-costa-lagoa-2026`.

## Dívida técnica que esta lane deixa registrada

1. **Nenhum script de deploy constrói os pacotes de workspace.** Nem
   `firebase.prod.json#predeploy` (que embute o `@leela/core` do `dist` via esbuild) nem
   `deploy-leela-hub.mjs` (cujo webpack resolve os três `@leela/*` pelo `dist`). Hoje isso depende
   de alguém ter rodado `tsup` na hora certa — e nesta lane **dois dos três estavam atrasados**.
   Correção mínima: um passo de build dos pacotes na frente das duas receitas.
2. `apps/landing/lib/leitorPerfil.ts:114-115` — o comentário ainda chama o índice de `parcerias` de
   "pendência operacional". Está no ar desde a PIXFIX (follow-up 1 daquele handoff, ainda aberto).
3. `MaxListenersExceededWarning` no `ssrleelalanding` — 11 listeners acumulando. Não reapareceu na
   janela de hoje, mas o padrão é de rollout, então volta no próximo cold start.
4. **`pnpm --filter <pacote> build` não roda nesta máquina, e não falha limpo.** A primeira
   tentativa de construir o core foi por ele; o `pnpm` dispara um `install` de verificação, o
   install morre, e no caminho ele **escreve `'@sentry/cli': set this to true or false` no
   `allowBuilds` do `pnpm-workspace.yaml`** — exatamente o placeholder que o comentário daquele
   arquivo documenta como o que já travou o preview uma vez. Revertido nesta lane
   (`git checkout -- pnpm-workspace.yaml`, worktree de rastreados limpo). O caminho que funciona é
   chamar o binário direto: `packages/<pacote>/node_modules/.bin/tsup`.

## Commits desta lane (sem push — o maestro pusha)

| # | Hash | Task |
|---|---|---|
| 1 | — | T1..T4 · este handoff (`docs(deploy)`) |
