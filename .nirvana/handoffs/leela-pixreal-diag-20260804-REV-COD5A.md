# REV-COD5A · review antagonista do código curto da compra (S1228-T1)

- **Trace:** `leela-pixreal-diag-20260804` · **Lane:** REV-COD5A
- **Employee:** sf-qa-engineer (software-forge) — antagonista, contexto fresco
- **Sob review:** `3acc6877` (BUILD-COD5A · RN-474/RN-475)
- **Fix-commit desta lane:** `b8c7c29e`
- **Veredito:** **APROVADA-COM-FIXES**

O mecanismo sobreviveu a todos os dez vetores declarados e a tudo que ataquei
fora deles. O que ele NÃO tinha era prova: três dos itens mais caros estavam
declarados `Not-tested` num caminho de dinheiro. Agora estão presos. A única
falha real que sobrou não cabia no território desta lane e vai sequenciada
abaixo, com o texto exato.

## Emulator e gates (independentes dos do construtor)

Emulator próprio: `firebase.revcod5a.json` — firestore **8881**, auth **9881**,
host `127.0.0.1` (o `::` do `firebase.r6.json` é falso-vermelho, como o Achado 3
do construtor descreveu). JDK 21. Teste **arquivo a arquivo**; suíte completa de
functions **não** rodada, por política. Sem deploy, sem escrita em produção.

| Gate | Resultado |
|---|---|
| `tsc --noEmit` core / functions | 0 / 0 |
| `eslint --max-warnings 0` core / functions | 0 / 0 |
| `npm run build` (core, tsup) | success |
| `codigoPedidoReserva.attack.test.ts` (NOVO) | **12/12** |
| `codigoPedidoReserva.integration.test.ts` (do construtor, no MEU emulator) | 14/14 |
| `codigoPedidoCore` / `pedido` / `inscrito` / `inscritoPedido` / `checkoutModelo` | 24 / 46 / 19 / 36 / 31 |
| `checkout2Modelo.integration` | 24/24 |
| `pedidoProprioRules.integration` | 26/26 |

## Vetor a vetor

| # | Vetor | Resultado | Prova |
|---|---|---|---|
| 1 | Janela leitura→commit da reserva | **SOBREVIVEU** (parcial, com ressalva honesta) | A janela física é **irreproduzível**: criar a reserva fora de banda depois que a tx a leu **trava contra o lock do emulator até o timeout** (medido: 60s). O que decide o desfecho é o contrato do `catch`, e esse ficou preso — bloco A4 |
| 2 | Sem laço de re-sorteio no commit (teto 8, 9ª) | **SOBREVIVEU** | Teto estourado ⇒ `HttpsError('internal')` e **nada escrito**: pedido, pagamento, inscritos e reservas conferidos doc a doc (A3/A4). Retry do comprador com a mesma chave é idempotente (A1) |
| 3 | Postel no `parsePedido` | **SOBREVIVEU** | Descarte silencioso é o comportamento certo: nenhum escritor de produção grava `codigoPedido` fora da tx da venda (varredura completa: só `createInscricaoCharge:1812` cria pedido; todos os outros são `tx.update` de campos nomeados) |
| 4 | Espelho no inscrito sem linha nas Rules | **FALSIFICADO** | **Defeito D-1**, medido — ver abaixo |
| 5 | Reserva guarda `pedidoId` = oráculo? | **SOBREVIVEU** | `pedidoCodigos` não tem `match`, cai no catch-all `L2978`, e a varredura confirma **zero** leitores fora de `codigoPedidoReserva.ts` — nada em `apps/`, nada em outra Function |
| 6 | RNG injetável em função de dinheiro | **SOBREVIVEU** | A callable (`createInscricaoCharge`, `:2560`) chama o core com 4 argumentos; `random` nunca é passado e nenhum campo do payload o alcança. Default `Math.random` — ver ressalva R-3 |
| 7 | Ordem read-before-write | **SOBREVIVEU** | O sorteio (`:1616`) é a **última leitura**: depois dele só `tx.create`/`tx.update`. Todos os gates que recusam a venda (trava PIX, prazo do carrinho, versão do aceite) estão **antes** dele — nenhuma tentativa recusada queima código (provado em A6) |
| 8 | `normalizarCodigoPedido` e o prefixo | **SOBREVIVEU** | Round-trip exaustivo em 200 mil códigos: 0 falhas. 21 entradas adversariais (prefixo duplicado, minúsculas, espaços, tab, quebra de linha, hífen múltiplo, `PEDXY`): **nenhuma** devolve o código de outra pessoa. Ressalva R-4 sobre travessão |
| 9 | A conta 31⁵ com teto 8 | **SOBREVIVEU, com um dado que faltava** | Recusa = (n/28.629.151)⁸. n=1M → 1 em 4,5·10¹¹; n=5M → 1 em 1,1M; **n=10M → 1 em 4.515**; n=14,3M → 1 em 256. O que o construtor não disse: **n é o acumulado de sempre**, não o vivo — não existe caminho de exclusão em `pedidoCodigos`, então PIX vencido e venda cancelada seguram o código para sempre |
| 10 | Concorrência acima de duas | **SOBREVIVEU** | **Oito** chamadas simultâneas, mesma chave: 1 pedido, 1 código, 1 reserva, espelho coerente (A1). E a metade que ninguém tinha testado — chaves distintas do mesmo comprador com a trava PIX no meio (A6) |

### Ataques fora da lista do construtor

| Ataque | Resultado |
|---|---|
| Seis compras concorrentes, chaves distintas, espaço reduzido a **dois** códigos possíveis | **SOBREVIVEU** — nenhum código repetido, nenhum pedido sem código, nenhuma reserva sem pedido; quem perdeu foi recusado sem escrever nada (A2) |
| Reserva plantada à mão com shape errado (`{}`, `pedidoId` numérico, `pedidoId: null`, campo alheio) | **SOBREVIVEU** — desvia, não adota e não sobrescreve o doc torto (A3) |
| `catch` de ALREADY_EXISTS separa replay de colisão em TODOS os caminhos | **SOBREVIVEU** — os dois ramos presos com o erro injetado **na tx da venda**, identificada pelo corpo do callback para o teste não passar de graça noutra transação (A4) |
| Fluxos que poderiam DERRUBAR o espelho (estorno, transferência de titular, virada de lote, CRM) | **SOBREVIVEU** — todos usam `tx.update` de campos nomeados; nenhum `set` de doc inteiro e nenhum delete de inscrito/pedido por Function |
| Código pode nascer diferente entre pedido e espelho | **IMPOSSÍVEL** — mesma constante, mesma transação; o retry re-executa o callback inteiro |

## Defeito real

### D-1 · `codigoPedido` é o ÚNICO campo de Function do inscrito que um cliente escreve — **severidade média**

O construtor declarou a lacuna (Achado 2) e a classificou como "o organizador
confunde a própria busca". A medição contra o `firestore.rules` real mostra que
ela é um degrau pior do que soa: **o mesmo `tenant_owner` que é NEGADO ao plantar
`codigoIngresso` PASSA ao plantar `codigoPedido`, e passa de novo ao trocá-lo
depois.** Todos os treze irmãos dele estão nas duas listas `hasAny`; ele não. E
como `semCamposDeFunctionInscrito` bloqueia recriar os outros, um delete+recreate
do organizador limpa os irmãos e **repõe** este com o valor que ele quiser.

Isso importa porque o espelho é exatamente o que a busca do operador da 5d vai
ler (RN-475). Um código plantado num inscrito faz a busca por aquele código
devolver alguém que não é o dono da compra — inclusive um código que pertence a
uma compra de **outra produtora**, já que o escopo é global.

**Não corrigi: `firestore.rules` está fora do território desta lane** (há lane em
voo em `apps/landing` que pode tocá-lo). Vai como pendência sequenciada.

**O que fiz no meu território:** o doc block de `Inscrito.codigoPedido` afirmava
*"Escrita SÓ por Function"*. Não afirma mais — quem construir a 5d leria isso e
trataria o espelho como autoritativo. O bloco agora diz a verdade, nomeia a
pendência e manda ler `Pedido.codigoPedido` quando o valor precisar ser
autoritativo (esse sim nasce na tx da venda e mora em coleção `write: if false`).

- **Fix-commit:** `b8c7c29e`
- **Teste que o pega:** bloco **A5** de `functions/src/__tests__/codigoPedidoReserva.attack.test.ts` — caracterização contra o arquivo real, com o contraste `codigoIngresso` negado / `codigoPedido` aceito.

## A correção exata das Rules, para o maestro sequenciar

Quatro edições, todas no mesmo commit. **Nenhuma delas isolada** — a constante do
core espelha literalmente as duas listas, e separá-las esvazia os testes que as
comparam.

**1. `firestore.rules:839-845`** — em `semCamposDeFunctionInscrito()`, acrescentar
`'codigoPedido'` à lista, ao lado de `'codigoIngresso'`:

```
             'codigoIngresso', 'codigoPedido',
```

**2. `firestore.rules:864-872`** — em `camposDeFunctionIntocados()`, a mesma
adição, ao lado de `'codigoIngresso'`:

```
             'codigoIngresso', 'codigoPedido',
```

**3. `packages/core/src/eventos/inscrito.ts`** — acrescentar `'codigoPedido'` a
`CAMPOS_FUNCTION_INSCRITO` (depois de `'codigoIngresso'`, na mesma ordem das
Rules), **remover** o comentário-âncora de 11 linhas que explica a ausência, e
**remover** o bloco `⚠️ AINDA NÃO É "escrita só por Function"` do doc de
`Inscrito.codigoPedido` que este fix-commit acrescentou.

**4. Testes que travam a igualdade** — acrescentar `'codigoPedido'` aos dois
`toEqual` exatos: `functions/src/__tests__/inscrito.test.ts:143` e
`functions/src/__tests__/inscritoPedido.test.ts:124`.

**5. E o sinal:** o bloco **A5** de `codigoPedidoReserva.attack.test.ts` fica
**vermelho de propósito** nesse commit — é o tripwire. Trocar os dois
`assertSucceeds` por `assertFails` e ajustar os títulos. Se ele continuar verde
depois da edição das Rules, a edição não pegou.

**Ordem:** a 5d (busca do operador pelo código) **não deve ir para produção antes
disto** — ela é a superfície que transforma o campo plantado em resposta errada
ao telefone.

## Ressalvas

### Para o painel (juízo de dono)

- **R-1 · `Math.random` num código que a pessoa dita no telefone.** O sorteio usa
  o PRNG do V8, cujo estado é recuperável a partir de poucas saídas — quem faz
  uma compra e vê o próprio código consegue prever os próximos. Hoje isso não
  abre porta nenhuma (o código não é credencial e a RN-469 autoriza por campo),
  mas a 5d cria um humano no meio: o operador busca **qualquer** código que lhe
  ditarem. **Não é defeito desta lane** — é a doutrina da casa, idêntica em
  `gerarCodigoIngresso`. A correção é barata e vale para os dois juntos:
  `crypto.randomInt` como default do parâmetro `random`, mantendo a injeção para
  teste. Decisão do dono porque muda uma doutrina escrita, não só um default.
- **R-2 · A reserva nunca é podada.** Não existe caminho de exclusão em
  `pedidoCodigos`: PIX vencido, venda cancelada e estorno seguram o código para
  sempre. A conta de saúde do construtor ("um símbolo a mais, nunca mais
  tentativas") continua certa, mas o gatilho tem de ser lido no **tamanho da
  coleção `pedidoCodigos`**, não no volume de vendas do ano. Números para o
  painel: em 5M de reservas, uma recusa a cada 1,1 milhão de compras; em **10M,
  uma a cada 4.515** — é aí que começa a doer. O Leela está longe; o alerta é o
  contador da coleção.

### Fila técnica

- **R-3 · O seed não tem código.** `functions/src/seed/pedidos.seed.ts:425` grava
  pedidos sem `codigoPedido` e sem reserva. Consequência prática: quando a 5c/5d
  subirem, **toda tela de preview/emulator vai mostrar compra sem código** — o
  "ausência é ausência" da RN-475 funcionando, mas parecendo defeito na hora da
  validação visual. Resolver antes da validação visual da 5c: rodar o backfill da
  5b contra o emulator, ou dar código ao seed.
- **R-4 · `normalizarCodigoPedido` não come travessão nem meia-risca.** Ela tira
  `[\s-]+`; `–` (en-dash) e `—` (em-dash) sobrevivem, e o operador que colar
  `PED–A2B3C` de um WhatsApp com autocorreção não acha a compra. **Não corrigi de
  propósito:** `normalizarCodigoIngresso` tem exatamente o mesmo recorte, e
  divergir os dois quebra a única frase que o operador precisa aprender. Se
  entrar, entra nos dois normalizadores no mesmo commit.
- **R-5 · O `catch` novo pode converter replay benigno em erro.** O
  `await pedidoRef.get()` de conferência é uma leitura a mais no caminho de erro;
  se ela falhar por transitório, o replay que antes era engolido vira erro para o
  comprador. É auto-curável (a re-tentativa cai no caminho de replay do `:2356`,
  que já encontra o pedido) e a probabilidade é a de um transitório dentro de
  outro. Fica registrado, não pedido.
- **R-6 · `logger.error('pedido_sem_codigo_livre')` carrega só `eventoId`.** Se o
  sintoma aparecer, dá para decidir o produto (acrescentar símbolo) mas não para
  atender a pessoa que levou "tente novamente". `pedidoId` e `tenantId` no mesmo
  log resolvem.
- **R-7 · A callable não devolve o código.** `CreateInscricaoChargeResult` não
  carrega `codigoPedido`; a 5c vai ter de reler o doc do pedido (a RN-469
  autoriza). Contrato para quem pegar a 5c, não defeito.
- **R-8 · Comentário desatualizado.** `FOLGA_NAO_GATEWAY_SEGUNDOS` enumera o que
  os 15s cobrem e não menciona as até 8 leituras da reserva dentro da tx. O teto
  continua folgado; o comentário é que envelheceu.

## O que este commit acrescentou

`b8c7c29e` — `functions/src/__tests__/codigoPedidoReserva.attack.test.ts` (novo,
12 testes), `firebase.revcod5a.json` (novo, emulator da lane de review) e a
correção do doc block em `packages/core/src/eventos/inscrito.ts`.

Nada em `apps/`. Nada em `firestore.rules`. Nada em `leela-specs/`.
