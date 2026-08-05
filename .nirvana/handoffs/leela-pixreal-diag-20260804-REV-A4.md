---
trace: leela-pixreal-diag-20260804
lane: REV-A4
employee: sf-qa-engineer (software-forge) — ANTAGONISTA
revisa: b1bd5dc4 (S032-T4 · RN-449d) + 61776052 (RN-474 · sorteio da venda)
territorio: functions/src/eventos (linha autorizada), functions/src/__tests__, firebase.reva4.json
---

# REV-A4 — os dois commits ficam de pé, e o gêmeo do defeito de sorteio cai junto

## Veredito

**APROVADO COM RESSALVAS.** Os dois commits fazem o que declaram, e a prova
vermelho→verde de cada um reproduz em contexto fresco, em emulator **frio**.
Nenhum dos oito vetores declarados derrubou o código.

O que a review acrescenta: **um defeito real corrigido** (o gêmeo do sorteio,
no código do INGRESSO — que o construtor achou e declarou, e que esta lane
estava autorizada a fechar), **uma afirmação escrita do handoff da BUILD-A4
falsificada**, e **quatro itens** que não são desta lane mas que ninguém deve
descobrir sozinho depois.

Commits desta lane:

| Hash | O quê |
|---|---|
| `8d779dce` | fix · o sorteio do código do INGRESSO volta a ser o do sistema (RN-396) |
| `7b69d544` | test · suíte antagonista, 7 casos |
| `d58caa5d` | test · 8º caso — a Rule da RN-469 tem duas pernas, e a recusa fecha uma |

---

## Vetor → resultado

Os oito declarados pelo construtor, mais o que a review caçou por conta.

| # | Vetor declarado | Resultado | Prova |
|---|---|---|---|
| 1 | `papelDaConta` como ponto de falha novo — Auth intermitente deixa pedidos sem carimbo e ninguém refaz o vínculo | **CONFIRMADO, e pior do que o vetor dizia** — a conta já NASCEU quando o Auth cai, e a compra fica órfã sem caminho de reprocesso nenhum | `revA4.antagonista` caso 1 |
| 2 | `contaCriada: false` no ramo da recusa mente sobre alguma corrida? | **NÃO** — o único caminho em que `criarConta` devolveria a conta é o re-read de corrida, e conta recém-criada não carrega claim de administração. E o `false` é a tranca que impede o reenvio administrativo de mandar "defina sua senha" para a conta do painel | caso 2 |
| 3 | Estreiteza: `role` não-string, token velho, conta que acumula | **GUARDA CORRETA nos três.** `role` não-string passa — e tem de passar, porque `assertPlatformAdmin` e as Rules também não a reconhecem. Token velho é irrelevante: a guarda lê o Auth pelo Admin SDK, nunca um token. Conta que acumula: a compra nova é recusada e a antiga sobrevive | casos 5 e 6 |
| 4 | `motivo` × PROJPED-1: o que a área do cliente passa a mostrar? | **NADA. A área fica MUDA** — `lerPedidosDaConta` devolve vazio e o motivo carimbado não chega a superfície nenhuma. Quem PAGOU vê o mesmo que quem nunca comprou | caso 4 |
| 5 | Acoplamento de ordem na suíte nova | **NÃO QUEBRA** — `contaAdminSemVinculo` fecha 7/7 com `--sequence.shuffle` | execução medida |
| 6 | Auth Emulator quente sem `clearAuth` — verde por resíduo? | **NÃO** — a suíte fecha 7/7 em emulator **frio**, criado do zero nesta lane (8993/9993) | execução medida |
| 7 | Pregamento global de `Math.random` só seguro por `fileParallelism: false` | **FRÁGIL, não quebrado.** A janela é uma chamada e o `finally` cobre exceção; o risco é alguém ligar `fileParallelism` num dia distante. Vira item de fila, não bloqueio | leitura + execução |
| 8 | Outros chamadores dependiam do default de `random` | **NENHUM.** Varredura devolve só os testes; `pessoaRegistry` é citação em comentário | `grep` no repo |
| **+** | **não declarado** · o carimbo nulo quebra algum consumidor do `contaSemFriccao`? | **NÃO.** `leituraArea`, `gateAreaCliente`, `meusIngressos`, `prefillCheckout`, `reenviarEmailsPedido` e a landing continuam íntegros; não existe parser de `contaSemFriccao` no core que fosse quebrar com `contaUid: null` | leitura dos 6 consumidores |
| **+** | **não declarado** · a recusa deixa a pessoa sem NENHUM caminho até o ingresso? | **NÃO.** RN-452 imóvel: o QR e o código nascem iguais e o link assinado do e-mail não passa por conta nenhuma | caso 3 |
| **+** | **não declarado** · claim forjada no `data` do request engana `papelDaConta`? | **NÃO.** A porta é construída dentro do `dispararContaSemFriccaoPosConfirmacao`; nem o `data` nem o token do chamador participam | caso 7 |
| **+** | **não declarado** · a Rule da RN-469 realmente não abre o pedido do administrador? | **ABRE, pela outra perna** — ver DEF-3 | caso 8 |

---

## Defeitos

### DEF-1 · ALTA · o código do INGRESSO era sorteado por `Math.random` — CORRIGIDO

`functions/src/eventos/emitirIngressos.ts:340` tinha
`random: () => number = Math.random`. Mesma classe, mesma mecânica e mesmo
efeito da RN-474: **o último default a falar vence**, e nenhum chamador de
produção passa fonte (`varrerIngressosOrfaos`, os dois confirmadores e o
reenvio chamam sem o argumento). O sorteio criptográfico que o core adotou em
`d36afb64` ficava inerte, e **todo código de ingresso saía do PRNG do V8**,
cujo estado é recuperável a partir de poucas saídas. O código do ingresso é o
que a pessoa DITA no balcão (RN-397) — prever o de outra pessoa é ser atendido
como ela.

O construtor achou e declarou como `Not-tested`; esta lane estava autorizada a
fechar e fechou.

- **Fix:** `8d779dce` — o parâmetro perde o default nos **dois** níveis
  (`emitirIngressosDoPedido` e `emitirIngressoDoInscrito`), o `undefined`
  atravessa e `gerarCodigoIngresso` cai no próprio default.
- **Teste que o teria pegado:** `sorteioCodigoIngresso.integration.test.ts`,
  caso 1. Vermelho medido ANTES do fix:
  `AssertionError: expected 'AAAAAA' not to be 'AAAAAA'` — o código do ingresso
  saía idêntico ao da fonte pregada. Depois, **4/4**.
- **Regressão:** `emitirIngressos`, `emissaoListaParcial`, `emailIngressos`,
  `revRF21.antagonista` e `secretsBinding.contract` — todos verdes.

### DEF-2 · MÉDIA · não existe reprocesso do `contaSemFriccao` — FILA TÉCNICA

Quando `papelDaConta` propaga (Auth intermitente), a conta **já nasceu** e a
compra fica órfã: pedido sem carimbo, ficha sem vínculo, e-mail de senha nunca
enviado. E **não há caminho de volta**:

- `reenviarEmailsPedido` gateia por `contaCriada === true` e o carimbo nem
  existe ⇒ devolve `nao_aplicavel` (medido);
- os três únicos chamadores de `garantirContaSemFriccao` são os confirmadores,
  e a confirmação é exactly-once;
- não existe varredura equivalente ao `varrerIngressosOrfaos`.

**A classe é anterior a esta lane** — qualquer exceção entre o `criarConta` e o
carimbo produz o mesmo estado, e a transação do passo 2 já podia. O que a
RN-449d acrescentou é **um gatilho novo no caminho MAIS comum**, o do comprador
de primeira viagem, que é justamente onde a conta é criada.

**Mitigação que existe hoje:** `solicitarRedefinicaoSenha` é público, neutro e
funciona para conta sem senha — a pessoa tem saída pela porta "esqueci minha
senha" da landing. É por isso que isto é MÉDIA e não ALTA.

- **Teste que o registra:** `revA4.antagonista` caso 1. Ele é o registro
  executável de que o reprocesso não existe; quem construir a varredura tem de
  fazer o caso **mudar de desfecho**, não apagá-lo.
- **Não corrigido aqui de propósito:** construir varredura agendada é feature,
  não fix de review.

### DEF-3 · BAIXA · a afirmação "a Rule também não a abre" é incompleta

O handoff da BUILD-A4 escreve, sobre o pedido do administrador: *"a Rule da
RN-469 também não a abre (nenhum `request.auth.uid` é igual a `null`)"*.
Verdade para a perna do `contaSemFriccao.contaUid`; **falso para
`ehCompradorDoPedido()` inteiro**. A função tem DUAS pernas
(`firestore.rules:2589-2599`) e a outra é
`responsavel.atletaId == request.auth.uid`, carimbada de `caller.uid` dentro
da transação de venda. Comprando **logado**, o pedido sai com o uid da conta de
administração ali e a Rule abre por essa perna, recusa ou não recusa.

Não é vazamento — o pedido é dele — e o caminho comum da landing compra por
sessão anônima (`CheckoutFlow.tsx:527`). O que se conserta é a **precisão**: a
frase é load-bearing, e quem amanhã concluir "a conta de administração não lê
pedido nenhum" estará errado.

- **Teste:** `revA4.antagonista` caso 8 (`d58caa5d`).
- **Rule intocada:** `firestore.rules` é território proibido, e fechar a perna
  do `atletaId` quebraria a leitura do comprador anônimo.

---

## A correção extra, e a varredura por outros pontos

**Autorizada e feita:** `emitirIngressos.ts:340` (DEF-1, `8d779dce`).

**Varredura completa por `= Math.random`** em `functions/src`, `packages` e
`apps` (fora de `node_modules` e de `dist`). Sobraram **três**, todos em
`packages/core` — **território proibido nesta lane** —, e todos **chamados em
produção sem fonte explícita:

| Ponto | Chamador de produção | O que o código vale |
|---|---|---|
| `platform/conviteOrganizador.ts:130` `gerarCodigoOrganizador` | `packages/api-client/src/platform/convites.ts:86` | **credencial ao portador.** `resgatarConviteOrganizador({codigo})` provisiona tenant para quem apresentar o código; 8 caracteres, sem amarração ao e-mail do convidado. E é sorteado **no cliente** |
| `clubs/codigo-convite.ts:46` `gerarCodigoConvite` | `functions/src/assessorias/cadastrarAssessoria.ts:366` | código de convite de clube/assessoria |
| `affiliation/afiliado.ts:103` `gerarRefCodigo` | `functions/src/affiliation/salvarAfiliado.ts:214` | código de indicação de afiliado |

O de organizador é o pior: é **escalada de privilégio** e não só previsão de
código. Fica como item de fila com lane própria — a correção é do mesmo
formato (o default do gerador passa a ser `sorteioUniforme`, como
`codigoPedido.ts` e `codigoIngresso.ts` já fazem).

**O `Directive` obsoleto do `d1d6582a`** — *"se alguém trocar o laço de sorteio
para `sortearCodigoPedidoNaTx`, passe uma fonte criptográfica explícita — o
default dela é `Math.random`"* — está **confirmadamente obsoleto** desde
`61776052`: hoje não há default nenhum naquela cadeia, e é isso que se quer.
Mensagem de commit é história imutável; o registro é aqui e no selo do maestro.

---

## Ressalvas — o que vira item de PAINEL e o que vira FILA TÉCNICA

### Painel do dono (decisão, não código)

1. **A área do cliente fica MUDA para quem pagou e teve o vínculo recusado.**
   O `motivo` está no pedido e não chega a superfície nenhuma; o administrador
   que comprou recebe da área a mesma resposta de quem nunca comprou. A RN-451
   manda a área **não mentir dizendo que não há compras** — este é o caso em
   que ela mente. Quem decide o que a tela diz é o dono. Medido em
   `revA4.antagonista` caso 4.
2. **O estoque acumulado continua aberto.** A RN-449d fecha o **fluxo**, nunca
   o **estoque**: conta `platform_admin` que já tem ficha e carimbo antigos
   continua entrando na área e lendo as compras velhas. É a A5 (`S032-T5`) e a
   migração que vem depois dela. Medido no caso 5.
3. **POSSE-EMAIL-1 continua congelada e não foi movida** por esta lane. O caso
   6 da suíte da construção, que fica vermelho se alguém implementar o default
   sem o dono, está intocado.

### Fila técnica (código, sem decisão de dono)

4. **Varredura/reprocesso do `contaSemFriccao`** (DEF-2), no molde do
   `varrerIngressosOrfaos`: pedido `pago` sem carimbo é pendência que hoje
   ninguém coleta.
5. **Os três `= Math.random` de `packages/core`**, com prioridade para
   `gerarCodigoOrganizador`.
6. **O pregamento global de `Math.random` nos dois testes de sorteio** só é
   seguro enquanto `fileParallelism: false` valer em `functions/vitest.config.ts`.
   Quem for ligar paralelismo de arquivo tem de olhar estes dois arquivos antes.
7. **Consolidação das configs de emulator.** A árvore já tem 14
   `firebase*.json`; esta lane acrescentou o 14º (`firebase.reva4.json`,
   8993/9993). É limpeza de fechamento de sprint, como o construtor já anotou.

---

## Gates

Emulator **próprio da lane de review**: `firebase.reva4.json` — firestore
**8993** / auth **9993**, host `127.0.0.1` (IPv4 explícito; `::` é
falso-vermelho conhecido). JDK 21 (`C:\Users\Vitor Eduardo\.jdks\jdk-21.0.11+10`,
PATH prefixado à mão — o JDK da máquina é o 17 e o `firebase-tools` recusa).
Teste **arquivo a arquivo**. **A suíte completa de functions NÃO foi
executada**, por política do brief. Sem deploy.

| Gate | Resultado |
|---|---|
| `functions` `tsc --noEmit` | **0** |
| `functions` `npm run build` (tsc) | **0** |
| `functions` `npm run lint` (`eslint src --max-warnings 0`) | **0** |

**Testes** (todos no emulator da lane, arquivo a arquivo):

```
sorteioCodigoIngresso.integration.test.ts  Tests  4 passed (4)     ← NOVO (fix DEF-1)
revA4.antagonista.test.ts                  Tests  8 passed (8)     ← NOVO (review)
contaAdminSemVinculo.integration.test.ts   Tests  7 passed (7)     ← da BUILD-A4, em emulator FRIO
contaAdminSemVinculo (--sequence.shuffle)  Tests  7 passed (7)
revA4.antagonista (--sequence.shuffle)     Tests  8 passed (8)
sorteioCodigoVenda.integration.test.ts     Tests  4 passed (4)
codigoPedidoReserva.integration.test.ts    Tests  14 passed (14)
codigoPedidoReserva.attack.test.ts         Tests  12 passed (12)
codigoPedidoCore.test.ts                   Tests  26 passed (26)
backfillCodigoPedido.integration.test.ts   Tests  21 passed (21)
checkout2Modelo.integration.test.ts        Tests  24 passed (24)
emitirIngressos.integration.test.ts        Tests  15 passed (15)
emissaoListaParcial.integration.test.ts    Tests  9 passed (9)
emailIngressos.integration.test.ts         Tests  15 passed | 10 skipped (25)
revRF21.antagonista.test.ts                Tests  12 passed (12)
reenvioEmailsPedido.integration.test.ts    Tests  9 passed (9)
reenvioEmailsPedido.ataque.test.ts         Tests  7 passed (7)
areaDoCliente.integration.test.ts          Tests  32 passed (32)
secretsBinding.contract.test.ts            Tests  23 passed (23)
claimFix.integration.test.ts               Tests  8 passed (8)
webhookAsaas.integration.test.ts           Tests  15 passed (15)
```

⚠ **Armadilha medida nesta lane:** seis desses arquivos gateiam por
`describe.skipIf(!hasEmulator)`, que lê `FIRESTORE_EMULATOR_HOST` — e não
`LEELA_FS_EMU_PORT`. Rodar só com a porta faz a suíte inteira sair **skipped**
com exit 0, que é indistinguível de verde para quem lê rápido. Os números
acima são da execução com as duas variáveis exportadas. Os 10 `skipped` do
`emailIngressos` são os do envio real, documentados desde a lane do e-mail.

**Fronteira de território respeitada.** Tocados: `functions/src/eventos/emitirIngressos.ts`
(a linha autorizada), `functions/src/__tests__/` (dois arquivos novos) e
`firebase.reva4.json`. **Intocados:** `functions/src/email`,
`apps/landing/**/checkout/**`, `functions/scripts`, `firestore.rules`,
`packages/core`, `apps/painel`, `leela-specs/`, e também
`functions/src/checkout` e `functions/src/cliente` — a review não precisou
mudar uma linha do que revisou. Todos os commits `git commit --only`, arquivo a
arquivo.

---

## Desvios registrados

- **`git commit --amend --only`** arrastou junto um arquivo de OUTRA lane viva
  (`REV-5B`) que estava no index compartilhado. Desfeito com `reset --soft` sem
  perda, e o 8º caso entrou como **commit próprio** (`d58caa5d`) em vez de
  amend. **Diretriz para quem revisar em árvore com lane viva: `--amend` é
  proibido; commit novo sempre.**
- **`nrv audit emit invocation_start`** executado com sucesso
  (`.nirvana/logs/harness/2026-08-05/audit.jsonl`). O `invocation_end` fecha
  junto com este handoff.

## Para o maestro selar (não editei `leela-specs/`)

- **V1-KANBAN · `S032-T4`** — review antagonista feita, **sem defeito no código
  revisado**. Os defeitos achados são de vizinhança (`emitirIngressos`) e de
  lacuna (reprocesso), não da guarda.
- **RN-396 / `S1206`** — o sorteio do código do ingresso passa a ser o do
  sistema (`8d779dce`). O achado gêmeo da RN-474 está fechado nos dois lados.
- **`LEELA-E00`** — a RN-449d está de pé e medida por fora. As duas metades que
  ela **não** cobre (o estoque acumulado e a mudez da área) estão nomeadas
  acima.
- **Item novo para a fila técnica** — os três `= Math.random` de
  `packages/core`, com `gerarCodigoOrganizador` na frente por ser credencial ao
  portador.
- **Item novo para o painel** — o que a área do cliente diz a quem teve o
  vínculo recusado (RN-451).
