# BUILD-5B · a ferramenta de backfill do código da compra (S1228-T4)

- **Trace:** `leela-pixreal-diag-20260804` · **Lane:** BUILD-5B
- **Employee:** sf-backend-engineer (software-forge)
- **Task:** Frente 5, item 5b da `04-fila-codigo.md` · spec `06-spec-codigo-pedido.md`
  §"O retroativo: ferramenta de backfill, não fallback"
- **Território:** `functions/scripts/**` + um teste + o emulator da lane. Nada em
  `functions/src/**` de produção, nada em `apps/**`, nada em `firestore.rules`,
  nada em `packages/core`, nada em `leela-specs/`.
- **⚔ review antagonista obrigatória** (o script escreve em produção e semeia a
  mesma coleção de reservas que o checkout consome).

## O que entrou

| Arquivo | O que é |
|---|---|
| `functions/scripts/backfill-codigo-pedido.mjs` | a ferramenta (NOVO) |
| `functions/src/__tests__/backfillCodigoPedido.integration.test.ts` | 9 testes de integração, o script rodado como processo separado (NOVO) |
| `firebase.build5b.json` | emulator da lane — firestore **8981**, auth **9981**, host `127.0.0.1` (NOVO) |

## A forma, herdada do precedente

`backfill-url-eventos.mjs` foi espelhado onde ele decide: `--dry-run` por
default, `--apply` explícito, `--project` obrigatório, contadores impressos
antes de qualquer escrita, idempotência por comparação, e a frase que governa o
arquivo ("reescrever documento em produção é operação, não build").

Três divergências deliberadas do precedente, todas declaradas no cabeçalho do
script:

1. **`--project` não cai para `GOOGLE_CLOUD_PROJECT`.** O precedente aceita a
   variável de ambiente; aqui não. Lá o script reescrevia uma URL; aqui ele cria
   documento numa coleção de reserva, e herdar o projeto de uma variável
   esquecida é o acidente clássico. Há teste para isso.
2. **Não há `WriteBatch` de 400.** Batch não é transação, e o par
   (carimbo do pedido, criação da reserva) tem de ser atômico ou o retroativo
   planta colisão contra o sorteio de amanhã. É **uma transação por pedido, em
   série**.
3. **`atualizadoEm` NÃO é carimbado.** O precedente carimba; aqui não. O
   invariante da lane é "o backfill só ACRESCENTA o código", e `atualizadoEm` do
   pedido é a trilha de quando a **compra** se moveu — ela não se moveu. Nenhum
   caminho ordena pedido por `atualizadoEm` (`leituraArea.ts:131` ordena por
   `criadoEm`), então não se perde nada. Provado por teste num pedido cancelado.

## O que o script faz, exatamente

Para cada doc de `pedidos`:

- **Sem código** → sorteia dentro da transação, cria `pedidoCodigos/{codigo}`
  com `create` (nunca `set`), carimba `pedidos/{id}.codigoPedido` e o
  **espelho** `eventos/{eventoId}/inscritos/{id}.codigoPedido` — tudo no mesmo
  commit.
- **Com código canônico** → **nunca re-sorteia**. A transação relê o doc e sai
  cedo, do mesmo jeito que a transação da venda sai cedo no replay. Só o que
  falta ao redor (reserva ausente, espelho ausente ou divergente) é acrescentado.
- **Com `codigoPedido` fora do formato** → **não toca**. Não apaga, não
  sobrescreve; reporta e sai com código 1.
- **Com reserva que pertence a outro pedido** → **não toca**. Reporta, segue a
  fila e sai com código 1.
- **Sorteio esgotado** (`sem_codigo_livre`) → falha alto naquele pedido, segue os
  próximos, relatório final nomeia quem ficou de fora e repete a fronteira da
  spec: acrescentar um símbolo, não aumentar o teto.

O **ensaio não sorteia**. A opção estava aberta na ordem e foi tomada de
propósito: um código impresso em dry-run não é o que o `--apply` grava (o sorteio
acontece dentro da transação, na hora), e código de mentira colado num chamado é
pior que nenhum. O que o ensaio promete é a conta, e ela é exata. Há teste que
falha se algum `PED-XXXXX` vazar para a saída do ensaio.

## Reuso — o que veio do mecanismo vivo, e o que não deu

O script **importa** de `functions/lib` o mecanismo da 5a:
`PEDIDO_CODIGOS_COL`, `TENTATIVAS_CODIGO_PEDIDO`, `MOTIVO_SEM_CODIGO_PEDIDO_LIVRE`
e `gravarReservaCodigoPedidoNaTx` — o gravador é o MESMO, então o doc de reserva
que o backfill cria é byte-idêntico ao que o checkout cria (`{pedidoId, criadoEm}`,
provado por teste que compara as chaves). O gerador vem de `@leela/core`.

**O que NÃO deu para reusar, e é um achado:** `sortearCodigoPedidoNaTx` tem a
assinatura `(db, tx, random = Math.random)`. Chamá-la sem argumento sortearia com
o PRNG do V8 — exatamente o que `d36afb64` veio fechar. Como `sorteioUniforme`
não é exportado pelo barrel do core, não há como lhe passar a fonte boa de fora.
Então o laço de sorteio do backfill é a mesma forma, chamando
`gerarCodigoPedido()` **sem argumento** (default = entropia do sistema). Ver
ACHADO 1 abaixo — vale para o caminho da venda também.

## Gates

Emulator próprio da lane: `firebase.build5b.json` (firestore **8981**, auth
**9981**, host `127.0.0.1` — o `::` é falso-vermelho conhecido). JDK 21
(`Temurin-21.0.11+10`). Teste **arquivo a arquivo**; suíte completa de functions
**não** rodada, por política. Sem deploy. **Zero escrita em produção.**

| Gate | Resultado |
|---|---|
| `packages/core` build (tsup) | CJS + ESM + DTS success |
| `functions` `npm run build` (tsc) | exit 0 |
| `functions` `tsc --noEmit` | **0** |
| `functions` `npm run lint` (`eslint src --max-warnings 0`) | **0** |
| `eslint` no script `.mjs` + no teste, `--max-warnings 0` | **0** |
| `backfillCodigoPedido.integration.test.ts` | **9/9** |

```
 ✓ as travas da linha de comando > sem `--project` o script recusa rodar e não lê nada
 ✓ as travas da linha de comando > `--dry-run` é o default absoluto: sem `--apply` nada é escrito e nada é sorteado
 ✓ --apply carimba pedido, reserva e espelho > cada compra ganha código canônico, reserva própria e espelho em cada inscrito
 ✓ idempotência > a segunda execução não troca código, não cria reserva e não escreve espelho
 ✓ idempotência > pedido que já tem código é PULADO no sorteio, mas o espelho que falta é remendado
 ✓ colisão forçada > reserva que pertence a outro pedido NUNCA é sobrescrita — e a fila continua
 ✓ colisão forçada > `codigoPedido` fora do formato não é apagado nem sobrescrito
 ✓ colisão forçada > duas execuções simultâneas dão UM código ao pedido, sem reserva órfã
 ✓ o espelho é escrito pelo Admin SDK onde o cliente é negado > o organizador não escreve `codigoPedido` no inscrito; o backfill escreve

 Test Files  1 passed (1)
      Tests  9 passed (9)
```

### O `Not-tested` da REV-COD5A está fechado

A review deixou escrito: *"backfill da 5b escrevendo o espelho pelo Admin SDK
depois da mudança"*. O último teste mede as duas metades **no mesmo documento**,
contra o `firestore.rules` real:

- (a) o `tenant_owner` recebe `permission-denied` ao escrever
  `codigoPedido` no inscrito (48fc7116), com **controle positivo** ao lado — o
  mesmo cliente ATUALIZA `status` com sucesso, então a negativa é do campo e não
  do documento;
- (b) o backfill, pelo Admin SDK, escreve o mesmo campo no mesmo doc e o valor
  bate com o do pedido;
- (c) depois de escrito, o campo continua fechado ao cliente — o organizador não
  troca o espelho que a busca dele (5d) vai ler.

### Além do exigido, também está preso

- **Invariante RN-474 medido de fora depois de CADA execução** (`conferirInvariante`):
  nenhum pedido com código sem reserva própria, nenhuma reserva apontando para
  outro pedido, nenhum código repetido entre pedidos, nenhum espelho divergente.
- **`parsePedido` / `parseInscrito` reais** aceitam os docs depois do backfill.
- **Pedido cancelado** ganha o código e nada mais: `status` intacto e
  `atualizadoEm` byte a byte igual ao de antes.
- **O prefixo não é gravado** (COD-4): o doc carrega os cinco símbolos limpos.

## Dry-run contra PRODUÇÃO (`leela-hub`) — leitura, zero escrita

Rodado com credencial de usuário (ADC montada a partir do login do firebase CLI,
gravada fora do repo e apagada em seguida). **Nada foi escrito.**

```
Projeto: leela-hub
Modo: DRY-RUN (não escreve)
Pedidos lidos: 17
Já completos: 0 · sem código: 17
A remendar (código existe, falta reserva ou espelho): 0
Espelhos a carimbar: 22
NÃO tocados — código fora do formato: 0 · reserva de outro pedido: 0
  ped-0001    evento=meia-floripa-2026 status=pago      inscritos=3  → código novo + reserva + 3 espelho(s) ausente(s)
  ped-0002    evento=meia-floripa-2026 status=pago      inscritos=1  → código novo + reserva + 1 espelho(s) ausente(s)
  ped-0003    evento=meia-floripa-2026 status=pago      inscritos=2  → código novo + reserva + 2 espelho(s) ausente(s)
  ped-0004    evento=meia-floripa-2026 status=pago      inscritos=3  → código novo + reserva + 3 espelho(s) ausente(s)
  ped-0005    evento=meia-floripa-2026 status=pago      inscritos=1  → código novo + reserva + 1 espelho(s) ausente(s)
  ped-0006    evento=meia-floripa-2026 status=pago      inscritos=2  → código novo + reserva + 2 espelho(s) ausente(s)
  ped-0007    evento=meia-floripa-2026 status=pago      inscritos=2  → código novo + reserva + 2 espelho(s) ausente(s)
  ped-0008    evento=meia-floripa-2026 status=pago      inscritos=1  → código novo + reserva + 1 espelho(s) ausente(s)
  ped-0009    evento=meia-floripa-2026 status=pendente  inscritos=1  → código novo + reserva + 1 espelho(s) ausente(s)
  ped-0010    evento=meia-floripa-2026 status=pendente  inscritos=1  → código novo + reserva + 1 espelho(s) ausente(s)
  ped-0011    evento=meia-floripa-2026 status=cancelado inscritos=1  → código novo + reserva + 1 espelho(s) ausente(s)
  ped-MOXZpvp8…-chk-effd4232-…  evento=teste-taxa-repassada        status=pendente  inscritos=1  → código novo + reserva + 1 espelho(s) ausente(s)
  ped-wNXRTvMM…-chk-1c675f35-…  evento=desafio-mtb-costa-lagoa-2026 status=cancelado inscritos=1 · 1 inscrito(s) fora de alcance → código novo + reserva
  ped-wNXRTvMM…-chk-60f7487f-…  evento=meia-floripa-2026            status=pendente  inscritos=1  → código novo + reserva + 1 espelho(s) ausente(s)
  ped-wNXRTvMM…-chk-68fcbd20-…  evento=corrida-inverno-floripa-2026 status=pendente  inscritos=1  → código novo + reserva + 1 espelho(s) ausente(s)
  ped-wNXRTvMM…-chk-963e27d7-…  evento=desafio-mtb-costa-lagoa-2026 status=cancelado inscritos=1 · 1 inscrito(s) fora de alcance → código novo + reserva
  ped-wNXRTvMM…-chk-ed77a161-…  evento=teste-taxa-repassada         status=pago      inscritos=1  → código novo + reserva + 1 espelho(s) ausente(s)

DRY-RUN — nada foi escrito e nenhum código foi sorteado.
Repita com --apply para aplicar.
```

**São 17 pedidos, não 12.** A spec contou onze de seed mais a compra real
(`06-spec-codigo-pedido.md:78-80`); a população cresceu para 11 de seed + **6
checkouts reais** de 03 e 04/08, todos do domínio do dono. A ordem de grandeza
não muda, e o parágrafo do volume na spec merece a correção.

**A compra real do dono está na lista.** É
`ped-wNXRTvMM3vc7Boyi91vRgx3DBQy2-chk-ed77a161-87e8-41c7-8e09-010f72ccd1dc` —
04/08 18:57 UTC, `pago`, PIX, evento `teste-taxa-repassada`, um inscrito
`confirmado` com `codigoIngresso = T93N7F` (é a compra do incidente PIXREAL) e
**sem `codigoPedido`**. Ela ganha código na primeira execução real.

**`pedidoCodigos` em produção hoje: 0 documentos.** A 5a ainda não foi
deployada, então não há reserva viva com que colidir — o backfill entra num
espaço limpo.

## O comando exato do `--apply` para o kanban do dono

A execução real **não é da esteira** (spec §"A execução não é da esteira").
Pré-requisitos, na ordem, e o comando:

```bash
# 0) build (o script importa o gerador do core e o mecanismo de reserva de functions/lib)
cd C:\dev\LEELA
npm --prefix packages/core exec -- tsup
npm --prefix functions run build

# 1) ENSAIO primeiro, sempre — confere a conta antes de escrever
node functions/scripts/backfill-codigo-pedido.mjs --project leela-hub

# 2) EXECUÇÃO REAL — só depois de ler a saída do ensaio
node functions/scripts/backfill-codigo-pedido.mjs --project leela-hub --apply

# 3) CONFERÊNCIA — rodar o ensaio de novo; tem de convergir para zero
node functions/scripts/backfill-codigo-pedido.mjs --project leela-hub
#    esperado: "Já completos: 17 · sem código: 0" e "Espelhos a carimbar: 0"
```

Credencial: `GOOGLE_APPLICATION_CREDENTIALS` apontando para uma chave com acesso
ao `leela-hub`, ou `gcloud auth application-default login`. Código de saída 0 =
tudo entrou; 1 = alguém ficou de fora e o relatório final nomeia quem.

**Ordem em relação às superfícies:** o backfill roda **antes** de 5c e 5d irem ao
ar, para que nenhuma tela estreie encontrando compra sem código (regra já escrita
na `04-fila-codigo.md` §"Ordem executável"). A 5d, por sua vez, não vai a
produção antes da linha das Rules da REV-COD5A — que já entrou em `48fc7116`.

## Achados (nenhum corrigido — fora do território)

### ACHADO 1 · `d36afb64` não chegou ao caminho da venda — o sorteio da compra ainda é `Math.random`

O commit trocou o default de `gerarCodigoPedido` para entropia do sistema. Mas o
default **nunca é alcançado** no caminho do dinheiro, porque toda a cadeia passa
`random` explicitamente:

- `createInscricaoChargeCore(..., random: () => number = Math.random)` — `:2335`
- repassa para `criarDocsDeCheckout(..., random)` — `:2448` / `:1308`
- que chama `sortearCodigoPedidoNaTx(db, tx, random)` — `:1627`
- que chama `gerarCodigoPedido(random)` — `codigoPedidoReserva.ts:100`

Resultado: **toda compra nova continua sorteando o código com o PRNG do V8**, que
é a ressalva R-1 da REV-COD5A e o motivo declarado do próprio `d36afb64`. O
mesmo vale para `sortearCodigoPedidoNaTx(db, tx)` chamada sem o terceiro
argumento — o default dela é `Math.random`, não o do core.

**O conserto é de três linhas e não muda comportamento de teste:** trocar
`random: () => number = Math.random` por `random?: () => number` nos três pontos
(`:1308`, `:2335`, `codigoPedidoReserva.ts:96`) e continuar repassando `random` —
`gerarCodigoPedido(undefined)` já cai no `SORTEIO_PADRAO` criptográfico, e a
injeção que os testes usam continua intacta. Território de `functions/src/checkout`,
que tem lane em voo; vai como pendência sequenciada.

O backfill **não** herda o defeito: ele chama `gerarCodigoPedido()` sem argumento.

### ACHADO 2 · dois pedidos cancelados em produção apontam para inscrito que não existe

`ped-wNXRTvMM…-chk-1c675f35-…` e `ped-wNXRTvMM…-chk-963e27d7-…` (ambos
`desafio-mtb-costa-lagoa-2026`, PIX cancelado em 03/08) listam em `inscritoRefs`
um inscrito `…-i1` que **não existe** em `eventos/{id}/inscritos`. Não é dano do
backfill (ele lê antes de escrever e só carimba inscrito que existe **e** cujo
`pedidoRef` bate), mas é estado que a spec do checkout diz ser impossível
(ADR-011: pedido e inscritos nascem no mesmo commit). Vale uma olhada de quem
tem o webhook de expiração/cancelamento na mão. O backfill dá código a esses
dois pedidos e reporta `1 inscrito(s) fora de alcance` na saída.

### ACHADO 3 · `pnpm build` na raiz não roda nesta máquina, e MUTA `pnpm-workspace.yaml`

`pnpm build` falha no gate de instalação (`ERR_PNPM_IGNORED_BUILDS` por
`@sentry/cli`) e, ao falhar, **escreve** `'@sentry/cli': set this to true or false`
dentro de `allowBuilds` no `pnpm-workspace.yaml`. Revertido nesta lane
(`git checkout -- pnpm-workspace.yaml`), mas qualquer lane que rode `pnpm build`
vai reintroduzir a linha. O contorno usado aqui foi build por pacote
(`npx tsup` no core, `npx tsc` em functions), que é o que está no comando do
dono acima.

## Limites conhecidos (declarados, não consertados)

- **Transação por pedido tem teto de 500 escritas.** Um pedido com ~498+
  inscritos estouraria o limite; a falha é capturada, o pedido fica de fora e o
  relatório final o nomeia. Nada em produção chega perto (maior é 3).
- **Sequencial de propósito.** 17 pedidos rodam em segundos; se a população um
  dia for de milhares, isto vira o gargalo, e a resposta é lote de transações em
  paralelo com teto, não batch.
- **O script exige build.** Ele importa `@leela/core` (dist) e
  `functions/lib/.../codigoPedidoReserva.js` porque reusar é o ponto — duplicar o
  alfabeto ou o nome da coleção seria plantar a divergência que ele existe para
  evitar. Sem build, recusa rodar com mensagem que diz o comando.

## Vetores para a review antagonista (⚔)

1. **O ensaio realmente não escreve?** Ataque o caminho de leitura: `db.getAll`
   com `inscritoRefs` contendo id repetido, `eventoId` ausente, `inscritoRefs`
   não-array. Nenhum deles pode virar escrita nem derrubar a varredura inteira.
2. **A atomicidade do par (carimbo, reserva).** Force o commit a falhar depois do
   sorteio (reserva plantada fora de banda na janela leitura→commit, como a
   REV-COD5A tentou) e prove que **nem** o carimbo **nem** a reserva sobrevivem.
   Meça também o retry: o Firestore re-executa o callback inteiro, então o
   segundo sorteio não pode reaproveitar o candidato queimado.
3. **A porta do "já tem código".** Prove que não existe caminho em que um pedido
   com `codigoPedido` canônico seja re-sorteado — inclusive com duas execuções
   simultâneas em que uma lê antes e a outra escreve primeiro.
4. **O remendo é seguro?** O script sobrescreve espelho **divergente** com o
   valor do pedido (autoritativo, por REV-COD5A). Ataque: um inscrito plantado
   antes de `48fc7116` com código de outra produtora — o remendo cura, mas
   confirme que ele nunca escreve na direção contrária (pedido a partir do
   espelho).
5. **Reserva alheia.** Já há teste; ataque as variações: reserva com `pedidoId`
   numérico, `null`, ausente, ou doc vazio. Nenhuma pode virar sobrescrita.
6. **O código de saída mente?** Confira que `1` sai em toda combinação de
   "ficou de fora" e `0` só quando a fila inteira entrou.
7. **PII na saída.** A saída imprime id de pedido (que contém o **uid** do
   comprador), id de evento e status. É saída de terminal de operação, não
   superfície de produto — mas vale medir se algum campo de PII (nome, e-mail,
   telefone) vaza para o log em algum ramo.
8. **A fronteira do `--project`.** Prove que nenhuma variável de ambiente
   (`GOOGLE_CLOUD_PROJECT`, `GCLOUD_PROJECT`, `FIREBASE_PROJECT`) consegue suprir
   a flag, e que `--project` vazio ou `--project --apply` (flag comendo flag)
   não passa.
9. **O ACHADO 1 vale mesmo?** Confirme que o caminho da venda em produção sorteia
   com `Math.random` hoje, e que o conserto proposto não quebra nenhum teste que
   injeta `random`.

## O que marcar em `leela-specs/` (selo do maestro — não editei)

1. **`02-rodadas/2026-08-04-pos-pagamento/04-fila-codigo.md`** — Frente 5, linha
   **5b**: entregue. O critério de pronto do pacote *"o backfill roda em dry-run
   com contadores antes de qualquer escrita, e o rerun converge para zero
   atualizações"* pode ser marcado: dry-run provado contra produção (17 pedidos,
   zero escrita) e convergência provada em emulator.
2. **`06-spec-codigo-pedido.md` §"Volume em produção"** — a contagem envelheceu:
   são **17** pedidos, não 12 (11 de seed + 6 checkouts reais de 03–04/08).
3. **Kanban do dono** — card novo, ao lado da execução de backfill que já está
   lá: *"rodar o backfill do código da compra em produção"*, com o bloco de
   comandos da seção acima e a ordem (antes de 5c e 5d subirem).
4. **Pendência sequenciada (ACHADO 1)** — *"o sorteio do código da compra ainda
   é `Math.random` no caminho da venda"*, território `functions/src/checkout`,
   três linhas, sem mudança de comportamento de teste. É a R-1 da REV-COD5A com
   causa medida.
5. **Achado de dado (ACHADO 2)** — dois pedidos cancelados em produção com
   `inscritoRefs` apontando para inscrito inexistente.

## Commits

- `functions/scripts/backfill-codigo-pedido.mjs`,
  `functions/src/__tests__/backfillCodigoPedido.integration.test.ts`,
  `firebase.build5b.json` — commit `--only`, sem tocar nas árvores das lanes em
  voo (`functions/src/eventos|email|checkout`, `apps/landing`).
