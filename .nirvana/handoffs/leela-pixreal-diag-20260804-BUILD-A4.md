---
trace: leela-pixreal-diag-20260804
lane: BUILD-A4
employee: sf-backend-lead (software-forge)
territorio: functions/src/checkout (+ functions/src/__tests__, firebase.a4.json)
continua: leela-pixreal-diag-20260804-BUILD-AREACLIENTE-2.md
---

# BUILD-A4 — a compra para de amarrar em conta de administração, e o sorteio da venda volta a ser criptográfico

Fila canônica: `leela-specs/02-rodadas/2026-08-02-retomada/11-fila-contas-e-area-cliente.md`
(frente **A**, task **A4 · `S032-T4`**). Regra: **RN-449d** em
`10-rns-contas-e-area-cliente.md`.

## Estado por task

| Task | O quê | Estado | Commit |
|---|---|---|---|
| `A4 · S032-T4` | `contaSemFriccao` para de amarrar compra em conta de administração (RN-449d) | ✅ | `b1bd5dc4` |
| — | Acréscimo do maestro: o sorteio do código da venda estava inerte (achado da BUILD-5B) | ✅ | `61776052` |

Os dois commits são **separados de propósito**, para a review antagonista não
misturar dois assuntos. Ambos `git commit --only`, arquivo a arquivo. **Push
feito. Sem deploy.**

---

## `A4 · S032-T4` — o vínculo recusa a conta de administração

### O comportamento escolhido, e de onde ele veio

A spec **definia** o comportamento, verbatim, e foi ele que entrou (RN-449d,
`10-rns-contas-e-area-cliente.md` §(d) + `11-fila` §A4). Nenhuma premissa
minha foi necessária no desfecho principal:

- o papel da conta resolvida pelo e-mail é lido **na claim**;
- sendo `platform_admin`: **não** amarra `pessoas/{ref}.contaUid`, **não** trata
  a conta como conta de comprador, e carimba no pedido
  `contaSemFriccao: { contaUid: null, contaCriada: false, emailStatus:
  'nao_aplicavel', pessoaVinculada: false, motivo: 'conta_admin_nao_vinculavel' }`;
- **a compra é confirmada normalmente**;
- nenhum e-mail de definição de senha sai por esse caminho.

### Arquivos

- `functions/src/checkout/contaSemFriccao.ts` — a guarda, o novo método de
  porta `papelDaConta`, as constantes `PAPEL_ADMIN_PLATAFORMA` e
  `MOTIVO_CONTA_ADMIN`, e o carimbo extraído em `carimbarNoPedido`.
- `functions/src/__tests__/contaAdminSemVinculo.integration.test.ts` (novo) —
  7 casos.
- `functions/src/__tests__/{reenvioEmailsPedido.ataque,reenvioEmailsPedido.integration,revRF21.antagonista}.test.ts`
  — os três espiões de `ContaSemFriccaoAuth` ganharam `papelDaConta`, que
  **lança**: o reenvio administrativo nunca lê papel de conta, e o espião trava
  essa fronteira.
- `firebase.a4.json` (novo) — emulator DESTA lane, IPv4 explícito
  (`127.0.0.1`), firestore **8983** / auth **9983**.

### As cinco decisões que a review deve atacar

1. **O papel vem da CLAIM, não do Firestore.** A RN-401 faz da claim a fonte
   única de papel; ler `profissionais/{uid}` ou `atletas/{uid}` criaria uma
   segunda verdade que diverge da primeira no dia em que alguém trocar de lado.
   Custo: **uma leitura de Auth por confirmação**, no caminho pós-pagamento e
   best-effort — nunca na transação de dinheiro.
2. **A leitura é do uid FINAL, não do que o e-mail devolveu.** O re-read de
   corrida do `criarConta` (`auth/email-already-exists`) devolve conta
   **alheia**, e a guarda tem de valer para o uid que seria escrito. Checar só
   o `getUidPorEmail` deixaria um buraco exatamente no caminho em que a conta
   não é nossa.
3. **`papelDaConta` PROPAGA a falha do Auth.** Sem saber o papel não dá para
   afirmar que a conta não é de administração; o desfecho seguro é não carimbar
   nada, e o pedido sem carimbo é a pendência observável que o arquivo já usa.
   É o mesmo comportamento que `getUidPorEmail` já tinha para erro que não é
   `user-not-found`. **A compra continua intocada** — o `dispararContaSemFriccao
   PosConfirmacao` engole tudo. Atacar: isto piora alguma janela de reprocesso?
4. **`contaCriada: false` no ramo da recusa.** É a verdade (conta com claim de
   administração já existia), e é também o que impede o reenvio administrativo
   de mandar "defina sua senha" para a conta do painel — `reenviarEmailsPedido`
   gateia por `contaCriada === true`. Atacar: existe caminho em que o `false`
   esconde uma conta realmente criada?
5. **O log é `logger.error` com `alerta: true`, e não `warn`.** A recusa é a
   regra funcionando, mas a consequência é alguém que PAGOU ficar sem acesso
   pela área do cliente. Silêncio aqui é o incidente de 04/08 com outra roupa.
   Sem PII: só `pedidoId` e `motivo` — e-mail e nome ficam fora (LGPD). Se o
   maestro preferir WARN, é uma linha.

### Prova vermelho → verde

Vermelho medido **restaurando os fontes de HEAD** com
`git show HEAD:… > …`, com o arquivo corrigido copiado para **fora do repo**
(`git stash` não foi usado — há lanes vivas na árvore).

```
ANTES (fontes de HEAD, teste final):   Tests  4 failed | 3 passed (7)
DEPOIS (com a guarda):                 Tests  7 passed (7)
```

Os **4 que falham** são os que a guarda existe para fazer passar: a recusa e o
motivo carimbado (1), a chave de leitura não concedida (2), o replay (3) e a
confirmação real ponta a ponta (7). Os **3 que passam nos dois estados** são
justamente os que **têm** de passar antes e depois — a estreiteza da guarda
(organizador continua vinculando, RN-450), a não-regressão do e-mail comum, e a
fronteira POSSE-EMAIL-1 imóvel. Um teste novo que ficasse 7/7 vermelho estaria
provando outra coisa.

### ⛔ A fronteira POSSE-EMAIL-1 **não** foi movida

Confirmação explícita. O default do POSSE-EMAIL-1 — exigir e-mail **verificado**
antes de o vínculo virar chave de leitura — **não** foi implementado. A conta
preexistente continua sendo reusada por busca de e-mail, exatamente como antes.

Isso está preso em três lugares, para que ninguém o mova por acidente:

- **caso 6 da suíte** ("POSSE-EMAIL-1 IMÓVEL"): conta preexistente com
  `emailVerified: false` continua sendo vinculada — o caso fica **vermelho** se
  alguém implementar a decisão do dono sem o dono;
- comentário no cabeçalho de `contaSemFriccao.ts` nomeando a fronteira que a
  guarda **não** move;
- `Constraint:` no commit.

**A exposição do POSSE-EMAIL-1 diminuiu, nunca aumentou:** existe agora um caso
a menos em que o vínculo é escrito sem prova de posse (o do administrador). O
default segue aguardando ratificação no painel.

### O que a A4 muda para a B1 (área do cliente)

O `getMinhasCompras` autoriza por `pedidos/{id}.contaSemFriccao.contaUid`. Com
a A4, o pedido pago com o e-mail do administrador sai com esse campo **nulo** —
então a compra dele **não aparece** na área do cliente, e a Rule da RN-469
também não a abre (nenhum `request.auth.uid` é igual a `null`). É o
comportamento que a RN-449 pede: quem administra e quer comprar usa o outro
e-mail. **Nenhuma linha de `functions/src/cliente` foi tocada.**

---

## Acréscimo do maestro — o sorteio do código da venda (`61776052`)

O `d36afb64` trocou a fonte dos códigos que a pessoa **dita** por entropia do
sistema. A BUILD-5B mediu e achou o furo: a troca **não chegava ao caminho da
venda**. A cadeia `createInscricaoChargeCore` → `criarDocsDeCheckout` →
`sortearCodigoPedidoNaTx` → `gerarCodigoPedido(random)` empurra `random`
explicitamente até o fim, e os três pontos tinham `= Math.random` como default
de parâmetro. Como a callable nunca passa nada, **esse default era a fonte de
toda venda**: o último default a falar vence.

**Correção:** os três parâmetros passam a ser `random?: () => number`, sem
default. O `undefined` atravessa a cadeia e `gerarCodigoPedido` cai no próprio
default, que é o sorteio uniforme com entropia do sistema. Nenhuma assinatura
muda para quem chama, nenhum formato de código muda, e a injeção continua viva.

**Arquivos:** `functions/src/checkout/codigoPedidoReserva.ts` (`:96`),
`functions/src/checkout/createInscricaoCharge.ts` (`:1308`, `:2335`),
`functions/src/__tests__/sorteioCodigoVenda.integration.test.ts` (novo, 4 casos).

**Vermelho → verde**, medido do mesmo jeito (fontes de HEAD restaurados, cópia
fora do repo):

```
ANTES:  Tests  1 failed | 3 passed (4)
        → AssertionError: expected 'AAAAA' not to be 'AAAAA'
DEPOIS: Tests  4 passed (4)
```

O caso decisivo prega `Math.random` numa fonte determinística e afirma que a
venda **não** produz o código dessa fonte. Antes, o código da compra saía
idêntico ao da fonte pregada — prova direta de que era ela quem sorteava. Os
outros três passam nos dois estados de propósito: a injeção explícita continua
decidindo o código, a reserva por chave primária acompanha o sorteio do
sistema, e vendas seguidas não repetem código.

**Escolha para a review:** o teste **prega** `Math.random` em vez de espioná-lo.
Um espião afirmando "zero chamadas" nasceria flaky — outros pedaços do caminho
(gRPC, retry) podem chamar `Math.random`. Pregar a fonte e comparar o código é
determinístico.

### ⚠ O MESMO defeito continua vivo no código do INGRESSO

`functions/src/eventos/emitirIngressos.ts:340` tem `random: () => number =
Math.random` — mesma classe, mesmo efeito: o `codigoIngresso.ts` do core já
sorteia com entropia do sistema, e esse default o apaga. **Não corrigido aqui**:
é território de outra lane (`functions/src/eventos`, a BUILD-RF2-1 esteve lá).
A correção é de **uma linha** e o teste tem a mesma forma do que esta lane
escreveu. Fica para o maestro sequenciar.

---

## Gates colados

Emulator próprio da lane: `firebase.a4.json` (firestore **8983**, auth **9983**,
host `127.0.0.1` — `::` é falso-vermelho conhecido). JDK 21
(`C:\Users\Vitor Eduardo\.jdks\jdk-21.0.11+10` — o JDK do PATH da máquina é o 17
e o `firebase-tools` recusa; o PATH foi prefixado à mão). Teste **arquivo a
arquivo**. **A suíte completa de functions NÃO foi executada, por política do
brief.** Sem deploy.

| Gate | Resultado |
|---|---|
| `functions` `npm run build` (tsc) | exit **0** |
| `functions` `tsc --noEmit` | **0** |
| `functions` `npm run lint` (`eslint src --max-warnings 0`) | **0** |

**Testes (todos no emulator da lane):**

```
contaAdminSemVinculo.integration.test.ts   Tests  7 passed (7)     ← NOVO (A4)
sorteioCodigoVenda.integration.test.ts     Tests  4 passed (4)     ← NOVO (RNG)
checkout2Modelo.integration.test.ts        Tests  24 passed (24)
claimFix.integration.test.ts               Tests  8 passed (8)
webhookAsaas.integration.test.ts           Tests  15 passed (15)
emissaoListaParcial.integration.test.ts    Tests  9 passed (9)
reenvioEmailsPedido.integration.test.ts    Tests  9 passed (9)
reenvioEmailsPedido.ataque.test.ts         Tests  7 passed (7)
revRF21.antagonista.test.ts                Tests  12 passed (12)
secretsBinding.contract.test.ts            Tests  23 passed (23)
codigoPedidoReserva.integration.test.ts    Tests  14 passed (14)
codigoPedidoReserva.attack.test.ts         Tests  12 passed (12)
codigoPedidoCore.test.ts                   Tests  26 passed (26)
backfillCodigoPedido.integration.test.ts   Tests  9 passed (9)
```

**`firestore.rules` INTOCADO**, e nenhuma correção de Rule ficou pendente: a
Rule da RN-469 já recusa o carimbo nulo sem nenhuma linha nova — nenhum
`request.auth.uid` é igual a `null`. **`packages/core` intocado.**
**`leela-specs/` intocado** (é selo do maestro — ver "para o maestro selar").

**Fronteira de território.** Nada fora de `functions/src/checkout`,
`functions/src/__tests__` e `firebase.a4.json`. Nenhum arquivo de
`apps/landing`, `functions/src/cliente`, `functions/scripts`, `leela-specs/`,
`packages/**` ou `firestore.rules` foi tocado. Todos os commits são
`git commit --only`, arquivo a arquivo — a árvore tem trabalho de terceiro não
versionado (`functions/lib/`, `functions/.tmp-rev5b/`).

---

## Vetores para a review antagonista (contexto fresco)

Esta task é ⚔. Em ordem de risco:

1. **A leitura de papel como ponto de falha novo no caminho do dinheiro.**
   `papelDaConta` propaga. Vetores: Auth intermitente durante a confirmação —
   quantos pedidos ficam sem carimbo, e quem os reprocessa? Existe caminho de
   re-tentativa que refaça o vínculo depois, ou o pedido fica sem `contaUid`
   para sempre e o comprador sem a área do cliente? (A `reenviarEmailsPedido`
   não refaz o vínculo — ela só re-entrega e-mail.)
2. **`contaCriada: false` no ramo da recusa.** Vetor: montar o cenário em que
   `criarConta` cai no `auth/email-already-exists` e devolve a conta de
   administração — o carimbo mente sobre o que aconteceu? E o que a `S1228`/
   backfill leem desse carimbo?
3. **A estreiteza da guarda.** Vetores: claim `role` que não é string (objeto,
   array, `__proto__`); conta de administração cujo token está velho e traz
   `tenant_owner`; conta que ACUMULA `platform_admin` + `atletas/{uid}` (estado
   que a RN-449 proíbe mas que existe hoje em produção — a A5 é que vai
   contá-los). Nesse último, a compra passa a NÃO vincular, e a pessoa perde a
   leitura de compras antigas? (Antigas não: o carimbo antigo continua no
   pedido. Só as novas.)
4. **O carimbo `motivo` dentro de `contaSemFriccao`.** O PROJPED-1 diz que campo
   novo em `pedidos/{id}` nasce visível ao comprador. `motivo` é subcampo de um
   mapa que a RN-469 já abre ao próprio comprador, e é literalmente a explicação
   de por que ele não vê nada — mas vale medir se alguma superfície precisa
   dizê-lo em português na tela, ou se o silêncio da área é aceitável.
5. **A ordem dos casos da suíte nova.** Os casos 2 e 3 medem o estado que o
   caso 1 deixou (`pedidoDoAdmin` é capturado). Vetor: rodar o arquivo com
   `--sequence.shuffle` quebra? É acoplamento deliberado ou frágil?
6. **O Auth Emulator QUENTE.** A suíte cria contas com uid fixo e reaplica as
   claims a cada execução. Vetor: uma execução anterior que tenha deixado a
   conta `a4-uid-organizador` com claim de administração — as claims são
   reaplicadas no `beforeAll`, mas vale conferir que o `clearFirestore` sem
   `clearAuth` não deixa estado que o caso 4 leia como verde falso.
7. **O pregamento de `Math.random` no teste do sorteio.** Vetor: substituir um
   global durante uma transação do Firestore — o `finally` cobre o caminho de
   exceção, mas há risco de vazar para outro arquivo da suíte se o vitest
   paralelizasse (hoje `fileParallelism: false`).
8. **A cadeia do `random` depois da correção.** Vetor: existe algum outro
   chamador de `criarDocsDeCheckout` ou `sortearCodigoPedidoNaTx` que dependia
   do default? (Varredura devolveu só o `createInscricaoCharge` e os testes; o
   backfill já chamava `gerarCodigoPedido()` sem argumento.)

---

## Para o maestro selar (não editei `leela-specs/`)

- **V1-KANBAN · `S032`** → **`T4` ✅ `b1bd5dc4`**. Continuam abertas `T1`, `T2`,
  `T3`, `T5`, `T6`, `T7` da frente A.
- **V1-CHECKLIST · `LEELA-S032-T4` (⚔)** — a linha da B1 registra "A4 não estava
  paga"; ela **está paga agora**, e o registro pode ganhar a nota de que a
  dependência foi honrada depois, sem retrabalho na B1.
- **`LEELA-E00`** (dona da RN-449) — a RN-449d saiu do papel. A forma testável
  §(d) está inteira em código e em teste, com o motivo
  `conta_admin_nao_vinculavel` como string de contrato.
- **RN-474 / `S1228`** — o achado 1 do handoff da BUILD-5B ("o caminho da venda
  ainda não") está **fechado** (`61776052`). O `Directive` daquele commit
  ("passe uma fonte criptográfica explícita, o default dela é `Math.random`")
  ficou **obsoleto**: hoje não há default nenhum, e é isso que se quer.
- **Item novo para a fila técnica:** `emitirIngressos.ts:340` tem o MESMO
  default de `Math.random` para o código do INGRESSO. Uma linha, território
  `functions/src/eventos`.
- **POSSE-EMAIL-1** — permanece **aberto e não movido** no painel do dono. A
  exposição diminuiu (um caso a menos de vínculo sem prova de posse), o default
  segue aguardando ratificação.
- **`firebase.a4.json`** é arquivo de teste da lane, no molde do
  `firebase.build5b.json` e do `firebase.areacli.json`. Se o maestro preferir
  consolidar as configs de emulator num só lugar, é uma limpeza de fechamento
  de sprint, não desta lane.

## Pendências declaradas (não são desta lane)

- **A2 · `S032-T2`** — a recusa de acúmulo no `setTenantClaims` + allowlist
  `platform/configAdmin`. Esta guarda lê **só a claim**; a allowlist é de lá.
- **A5 · `S032-T5`** — a varredura das contas de produção. **Nada de migração
  antes do número dela**, e ela é quem diz se existe conta que acumula hoje.
- **B4 · `S1222-T4`** — Meus Clubes e a caixa de convites, herdada da lane
  anterior.
- **`emitirIngressos.ts:340`** — o gêmeo do defeito de sorteio, em outro
  território.
