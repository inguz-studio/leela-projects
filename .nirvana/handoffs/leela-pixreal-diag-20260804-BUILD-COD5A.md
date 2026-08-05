# BUILD-COD5A · S1228-T1 — o código curto da compra nasce com o pedido

- **Trace:** `leela-pixreal-diag-20260804`
- **Lane:** BUILD-COD5A · Frente 5a da `04-fila-codigo.md`
- **Employee:** sf-backend-lead (software-forge)
- **Spec:** `leela-specs/02-rodadas/2026-08-04-pos-pagamento/06-spec-codigo-pedido.md`
- **Regras:** RN-474, RN-475 (E12) · decisão D-0804-5
- **Estado:** implementado, gates verdes, ⚔ aguardando review antagonista
- **Base:** `bca95e71`

## O que entrou

| # | Arquivo | O que faz |
|---|---|---|
| 1 | `packages/core/src/pedidos/codigoPedido.ts` (novo) | Alfabeto de 31 símbolos, tamanho 5, prefixo `PED-` como constante, predicado, normalização (tira prefixo, não conserta ambíguo), `formatarCodigoPedido` (ausência = string vazia, nunca o id) e gerador com RNG injetável |
| 2 | `packages/core/src/index.ts` | Exporta as oito peças do módulo |
| 3 | `packages/core/src/pedidos/pedido.ts` | `codigoPedido?: string` na interface `Pedido`, em `CAMPOS_FUNCTION_PEDIDO` e em `parsePedido` (leitura Postel) |
| 4 | `packages/core/src/eventos/inscrito.ts` | `codigoPedido?: string` no contrato do inscrito + `parseInscrito` — o espelho que a busca da 5d vai ler |
| 5 | `functions/src/checkout/codigoPedidoReserva.ts` (novo) | `PEDIDO_CODIGOS_COL`, teto de 8 tentativas, motivo nomeado, `sortearCodigoPedidoNaTx` (fase de leitura) e `gravarReservaCodigoPedidoNaTx` (`tx.create`, fase de escrita) |
| 6 | `functions/src/checkout/createInscricaoCharge.ts` | Sorteio na última leitura da tx da venda; `codigoPedido` no doc do pedido e em cada inscrito; reserva gravada no mesmo commit; RNG injetável em `criarDocsDeCheckout` e `createInscricaoChargeCore`; **narrowing do `catch` de ALREADY_EXISTS** (ver Achado 1) |
| 7 | `functions/src/__tests__/codigoPedidoCore.test.ts` (novo) | 24 testes puros |
| 8 | `functions/src/__tests__/codigoPedidoReserva.integration.test.ts` (novo) | 14 testes de integração no emulator |
| 9 | `functions/src/__tests__/pedido.test.ts` | Ajuste do `toEqual` de `CAMPOS_FUNCTION_PEDIDO` |
| 10 | `firebase.cod5a.json` (novo) | Config de emulator EXCLUSIVA desta lane (firestore 8781, auth 9781, host IPv4) |

Nada em `apps/`. Nada em `leela-specs/`. Nada em `firestore.rules`. Nenhuma entrada nova em `firestore.indexes.json`.

## A decisão sobre as Rules: NÃO editei, e a prova é executável

O arquivo já nega `pedidoCodigos` por construção. Varredura dos `match` de raiz
em `firestore.rules`: não existe `match` genérico no nível `/databases/{db}/documents`
que alcance uma coleção root nova — os dois `match /{subcol}/{docId}` estão dentro
de `eventos` (`:1880`) e de `clubes` (`:2432`), e a coleção nova é root. O que a
alcança é o catch-all do fim:

```
match /{document=**} {
  allow read, write: if false;
}
```

A prova não ficou na leitura. O bloco 4 do teste de integração carrega o
`firestore.rules` REAL e ataca a coleção com quatro identidades — anônimo,
`athlete` autenticado, `tenant_owner` do tenant e escrita de cliente (criar
reserva nova e sobrescrever a existente). Todas negadas, e o emulator nomeia a
linha: `false for 'create' @ L2978`, `false for 'update' @ L2978` — o catch-all.
É o mesmo desenho da `ingressoCodigos`, que também vive sem `match`.

## Como a atomicidade foi provada

A invariante é "pedido sem código e código sem pedido são estados proibidos".
Ela é estrutural — os dois docs nascem no MESMO `runTransaction` — e está medida
nos dois sentidos e nos dois desfechos:

1. **Caminho feliz, sentido A:** o pedido criado tem `codigoPedido` canônico de 5
   símbolos, sem prefixo (o prefixo é apresentação — decisão COD-4).
2. **Caminho feliz, sentido B:** `pedidoCodigos/{codigo}` existe e o `pedidoId`
   dele aponta de volta para o pedido; `reserva.id === pedido.codigoPedido`.
3. **Caminho de falha:** com a reserva ocupada e o RNG pregado no mesmo código, as
   8 tentativas estouram e a venda inteira é recusada. A ausência é medida **doc a
   doc** pelos ids determinísticos de `idsDoCheckout`: pedido não existe,
   pagamento não existe, os dois inscritos não existem, nenhuma reserva nova
   nasceu e a reserva alheia continua com o `pedidoId` original.
4. **Espelho:** cada inscrito do pedido carrega exatamente o mesmo código, provado
   pelo `parseInscrito` do core (contrato tipado, não leitura crua).

## Como a idempotência foi provada (o `chk-` não regride)

1. **Replay sequencial** com a mesma `idempotencyKey` e um **RNG diferente** de
   propósito: mesmo `pedidoId`, **mesmo código**, e a contagem de reservas sobe
   exatamente 1. Se o replay re-sorteasse, o RNG trocado faria o código mudar — e
   o e-mail já enviado passaria a mentir. A porta que segura é o
   `tx.get(pedidoRef)` que já abria a transação de venda.
2. **Corrida concorrente** (duas chamadas simultâneas, mesma chave): 1 pedido, 1
   código, **1 reserva**. Duas reservas aqui seriam o código órfão — o segundo
   estado proibido.
3. **Espelho pós-replay:** os inscritos continuam com o código do pedido.

## Colisão e re-sorteio

- Reserva por chave primária, `tx.create` (nunca `set`): reserva alheia nunca é
  sobrescrita.
- Teto de **8** tentativas por passagem. Provado com RNG que repete o código de
  outra compra nas três primeiras rodadas e cede na quarta: o segundo pedido nasce
  com outro código e a reserva do primeiro fica intacta.
- Estouro do teto: `logger.error('pedido_sem_codigo_livre', { eventoId, motivo:
  'sem_codigo_livre' })` + `HttpsError('internal')`. Nunca grava duplicado, nunca
  silencia. **O sintoma pede um símbolo a mais, não mais tentativas** — está
  escrito na constante.

## Achados que a lane produziu (para o selo do maestro)

### Achado 1 · o `catch` de ALREADY_EXISTS passou a ter dois significados — corrigido

`criarDocsDeCheckout` engolia `code === 6` com um significado assumido: "corrida
entre retries do MESMO key, os docs já existem, o replay completa". Com a reserva
dentro da transação, o mesmo código de erro passou a poder vir do
`tx.create(pedidoCodigos/{codigo})` — e o Firestore **não** re-executa o callback
nesse caso (ALREADY_EXISTS não é ABORTED). Engolir devolveria "compra criada"
sobre um pedido que não existe.

Correção aplicada: no caminho de erro, uma leitura de `pedidoRef` separa os dois.
Pedido existe → replay, engole (comportamento de sempre, agora **provado** e não
assumido). Pedido não existe → `logger.error('checkout_create_colidiu_sem_pedido')`
e o erro sobe; nada foi escrito e a re-tentativa do comprador com a mesma chave
sorteia outro código. Não há laço de re-sorteio de propósito: a corrida exige duas
compras concorrentes sorteando o mesmo código em 28,6 milhões, e o retry do cliente
já é o caminho correto e idempotente.

### Achado 2 · `codigoPedido` NÃO entrou em `CAMPOS_FUNCTION_INSCRITO` — lacuna declarada

Aquela constante **espelha literalmente** as duas listas `hasAny` de
`firestore.rules` (`semCamposDeFunctionInscrito` `:839`, `camposDeFunctionIntocados`
`:864`), e dois testes a comparam com `toEqual` exato. Nomear ali um campo que as
Rules não conhecem faria a constante mentir e esvaziaria o teste. Como esta lane
não tem mandato para editar as Rules, o par não entrou — a razão está escrita no
próprio arquivo, ao lado da lista.

**Exposição real hoje:** escrita direta de cliente em `inscritos` exige
`isTenantWriter` (`firestore.rules:904-916`), então quem poderia plantar um
`codigoPedido` falso é o **organizador dentro do próprio evento**, não o comprador
— ele já controla a lista inteira, e o dano é confundir a própria busca. O
comprador não alcança.

**Pendência para o maestro:** uma edição de duas linhas em `firestore.rules`
(acrescentar `'codigoPedido'` às duas listas `hasAny`) mais a linha na constante e
nos dois testes. Cabe na 5b ou numa task própria, com teste de rules.

### Achado 3 · o host `::` das configs de emulator quebra testes que derivam o host do env

`firebase.r6.json` usa `"host": "::"`. Testes que hardcodam `localhost` +
`LEELA_FS_EMU_PORT` (checkout2Modelo e a maioria) não sentem; os que derivam de
`FIRESTORE_EMULATOR_HOST` — `pedidoProprioRules.integration.test.ts:63` — recebem
um host IPv6 e falham com "client is offline" / "Invalid URL", 25 de 26 vermelhos,
**sem nenhuma regressão real**. Com `"host": "127.0.0.1"` no `firebase.cod5a.json`
os 26 passam. Isso é ruído de gate que pode mascarar regressão de verdade numa
próxima lane; vale padronizar IPv4 nas configs de lane.

## Gates

| Gate | Resultado |
|---|---|
| `tsc --noEmit` (core) | 0 erros |
| `tsc --noEmit` (functions) | 0 erros |
| `npm run build` (core, tsup) | Build success — CJS + ESM + DTS |
| `npm run build` (functions, tsc) | exit 0 |
| `eslint src --max-warnings 0` (core) | exit 0 |
| `eslint src --max-warnings 0` (functions) | exit 0 |
| `codigoPedidoCore.test.ts` | 24/24 |
| `codigoPedidoReserva.integration.test.ts` (emu 8781) | 14/14 |
| `checkout2Modelo.integration` (emu 8781) | 24/24 |
| `checkoutS1203.integration` | 7/7 |
| `checkoutS1203.attack` | 21/21 |
| `checkoutFoundation.integration` | 10/10 |
| `checkoutModelo.integration` | 15/15 |
| `carrinhoPrazo.integration` | 16/16 |
| `pixCarrinho.integration` | 9/9 |
| `pedidoProprioRules.integration` | 26/26 (com host IPv4 — ver Achado 3) |
| `pedido` + `inscrito` + `inscritoPedido` + `checkoutModelo` + `checkoutCore` + `codigoIngressoCore` | 191/191 |

Emulator em porta própria (8781/9781) via `firebase emulators:exec --config
firebase.cod5a.json`. Suíte completa de functions **não** rodada, por política.

## Board

Não editei `leela-specs/` (lane em voo). Para o selo do maestro:

- **S1228-T1 · FEITA** — Frente 5a de `04-fila-codigo.md`. Destrava a **5b**
  (backfill), a **5c** (superfícies do comprador, ainda travada pela Frente 4) e a
  **5d** (superfícies do operador).
- **CODPED-1 continua aberto** no painel. O default `PED-` está implementado, vive
  numa constante única (`PREFIXO_CODIGO_PEDIDO`) e **não é gravado** — o veto do
  dono custa uma constante e um redeploy, exatamente como a spec prometeu.
- **Nasce a pendência do Achado 2** (as duas linhas em `firestore.rules`).

## Contratos que a 5b e a 5d herdam

- Reserva: `pedidoCodigos/{codigo}` → `{ pedidoId, criadoEm }`. O `pedidoId` existe
  **para a idempotência por comparação do backfill**, não como índice
  código→compra: uma consulta cross-tenant por código é o oráculo que a spec
  recusou. Nenhuma superfície pode chegar lá.
- Constante da coleção e teto: `functions/src/checkout/codigoPedidoReserva.ts`.
- Busca da 5d: `normalizarCodigoPedido` já tira o prefixo e já recusa consertar
  ambíguo — é só chamá-la, no molde da RN-397.
- Exibição da 5c/5d: `formatarCodigoPedido`, que devolve **string vazia** para
  código ausente ou torto. Ausência é ausência; o id nunca entra no lugar.

## Vetores para a review antagonista (⚔)

1. **A janela entre a leitura da reserva e o commit.** O `catch` narrowing do
   Achado 1 é a única defesa contra ALREADY_EXISTS vindo da reserva. Ataque: prove
   que existe um caminho em que o erro sobe mal classificado, ou que o
   `pedidoRef.get()` de confirmação pode ler estado velho.
2. **A decisão de não haver laço de re-sorteio no commit.** Assumi que o retry do
   comprador (mesma chave) é o caminho correto e idempotente. Ataque: um cenário
   real em que o cliente não re-tenta e a compra morre com dinheiro em voo.
3. **Postel em `parsePedido`.** Escolhi descartar `codigoPedido` inválido em vez
   de fail-fast, contrariando a postura do resto do parse (que é de dinheiro).
   Ataque: um caminho em que o descarte silencioso esconde corrupção de escritor.
4. **O espelho no inscrito sem a linha nas Rules** (Achado 2). Ataque: um caminho
   em que o organizador — ou qualquer identidade que passe por `isTenantWriter` —
   converte o `codigoPedido` plantado em dano ao comprador ou a outro tenant.
5. **A reserva guarda `pedidoId`.** Ataque: prove que isso já constitui o oráculo
   código→compra que a spec recusou, ou que alguma superfície existente consegue
   alcançá-lo (a coleção é server-only, mas o Admin SDK está em todo lugar).
6. **O RNG injetável em `createInscricaoChargeCore`.** É um parâmetro novo numa
   função de dinheiro. Ataque: um caminho em que ele chega do cliente, ou em que a
   callable o passa sem querer.
7. **A ordem read-before-write.** O sorteio entrou como última leitura da tx.
   Ataque: prove que alguma escrita anterior a ele já existia, ou que a leitura
   extra muda o read-set de forma a aumentar contenção numa transação de dinheiro.
8. **`normalizarCodigoPedido` e o prefixo.** A regra "só tira o prefixo quando o
   resto tem o tamanho exato" protege `PEDXY`. Ataque: uma entrada em que ela
   devolve o código de outra pessoa.
9. **A conta da colisão.** 31⁵ = 28.629.151 e teto 8. Ataque: um volume plausível
   do Leela em que a fração de re-sorteio deixa de ser desprezível antes do que a
   spec previu.
10. **Regressão de idempotência sob concorrência maior.** A prova usou duas
    chamadas. Ataque: N chamadas concorrentes com a mesma chave, ou chaves
    distintas do mesmo comprador com a trava PIX no meio.
