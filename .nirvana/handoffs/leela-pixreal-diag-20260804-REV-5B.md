# REV-5B · review antagonista do backfill do código da compra (S1228-T4)

- **Trace:** `leela-pixreal-diag-20260804` · **Lane:** REV-5B
- **Employee:** sf-qa-engineer (software-forge) — antagonista, contexto fresco
- **Sob review:** `d1d6582a` — `functions/scripts/backfill-codigo-pedido.mjs` +
  `functions/src/__tests__/backfillCodigoPedido.integration.test.ts` (9 testes)
- **Território:** `functions/scripts/**` + o teste do backfill. Nada em
  `functions/src/**` de produção, nada em `apps/**`, `firestore.rules`,
  `packages/core` ou `leela-specs/`.

## Veredito

**REPROVADO na forma entregue · APROVADO depois dos dois fix-commits.**

Sete defeitos, um deles **alto** e decisivo para a execução do dono. O desenho
central — transação por pedido, `create` na reserva, porta do "já tem código",
espelho autoritativo — resistiu a tudo que foi jogado contra ele. O que caiu foi
a borda: para onde a escrita vai, o que a ferramenta faz com dado torto, e o que
ela promete ao dono na saída.

| # | Defeito | Severidade | Onde | Teste que o pega |
|---|---|---|---|---|
| 1 | `FIRESTORE_EMULATOR_HOST` desvia a escrita inteira e o relatório de sucesso é idêntico ao real | **ALTA** | `eea10348` | `destino é declarado` (5 casos) |
| 2 | `inscritoRefs` com id que não é caminho de documento derruba a varredura inteira | MÉDIA | `eea10348` | `não derruba a varredura` |
| 3 | espelho com código canônico e pedido sem código: re-sorteio apaga o código comunicado | MÉDIA | `eea10348` | `NÃO sorteia por cima` |
| 4 | reserva que já aponta para o pedido é ignorada e vira órfã | MÉDIA | `eea10348` | `não vira reserva órfã` |
| 5 | interrupção deixa trava de ~60-75 s e o relatório manda investigar | MÉDIA | `eea10348` | medido em probe (P5) |
| 6 | ensaio sai **0 sempre**, e o runbook usa o ensaio como conferência | MÉDIA-BAIXA | `eea10348` | `o ENSAIO sai 1` |
| 7 | teste de concorrência **flaky** (~1 reprovação a cada 4) | MÉDIA-BAIXA | `813a38c1` | ele mesmo, corrigido |
| — | id repetido infla a conta de espelhos; `--project --apply` come a flag; promessa do ensaio mais forte que o código | BAIXA | `eea10348` | 3 testes |

Testes: **9 → 21**, verdes em três execuções seguidas da suíte e seis do caso
antes flaky. `tsc --noEmit` **0**, `eslint src` **0**, `eslint` no script e no
teste **0**.

## O `--apply` contra produção está seguro para o dono rodar?

**Sim — com o script de HEAD (`813a38c1`), e com três condições.** Não estava
seguro com o script de `d1d6582a`.

O que mudou o veredito é o defeito 1. Medido, não deduzido: com
`FIRESTORE_EMULATOR_HOST` no ambiente, `node backfill --project leela-hub
--apply` escreve no **emulator**, imprime `Projeto: leela-hub`, `Modo: APLICAR`,
`Aplicado: N pedido(s)` e **sai 0**. Se o emulator estiver com o seed (11
pedidos), a execução inteira do runbook — ensaio, aplicação, conferência —
converge para zero e parece perfeita, com produção sem receber uma letra. O dono
marcaria o card, 5c e 5d subiriam, e as seventeen compras continuariam sem
código. É o acidente clássico que a obrigatoriedade do `--project` fechou pela
frente, entrando pela porta de trás — e a variável está no fluxo de trabalho
desta casa (o stack local do landing pede `FIRESTORE_EMULATOR_HOST=127.0.0.1:8180`).

Agora o destino é declarado nos dois sentidos e sai impresso antes da primeira
leitura:

```
Projeto: leela-hub
Destino: PRODUÇÃO — Firestore real
```

**Condições para a execução real:**

1. **Rebuild antes.** O script importa `functions/lib`, e a árvore de trabalho
   desta madrugada tinha lane em voo em `src/checkout`. Rodar
   `npm --prefix functions run build` imediatamente antes, com a árvore no
   commit que o dono quer executar.
2. **Conferir a linha `Destino:` do ensaio antes de digitar `--apply`.** Se ela
   não disser `PRODUÇÃO — Firestore real`, parar. O script agora recusa sozinho,
   mas a linha é a prova de dois segundos.
3. **Gravar a saída em arquivo** (`… --apply > backfill-20260805.txt 2>&1`). O
   mapa pedido → código só existe nessa saída, e é o que responde um chamado
   depois. ⚠ **Esse arquivo carrega o uid do comprador** (o id do pedido é
   `ped-{uid}-chk-{chave}`) — vale para chamado interno, não para print em grupo.

**Se o comando for interrompido:** nada corrompe (medido com `SIGKILL` — zero
reserva órfã, zero pedido com código sem reserva, zero espelho fora de
sincronia), mas o pedido que estava em voo fica travado por cerca de um minuto.
Repetir o comando; o relatório agora diz `TRAVA TEMPORÁRIA — repita em um ou dois
minutos` em vez de mandar investigar.

**Não rodar duas vezes em paralelo.** Não corrompe (provado), mas quem perde a
corrida sai 1 com pedidos "de fora" que o outro já atendeu, e a leitura fica
confusa.

## Vetor a vetor

| # | Vetor declarado | Resultado | Prova |
|---|---|---|---|
| 1 | o ensaio não escreve (refs duplicados ou ausentes) | **PARCIAL** — não escreve nunca, mas ref inválido derruba a varredura; duplicado inflava a conta | P2.a-d; defeito 2 e o de baixa |
| 2 | atomicidade do par carimbo+reserva sob falha | **HOLDS** sob interrupção dura; **não provado** sob falha permanente de commit | `SIGKILL` em 25 pedidos: 6 carimbados, 6 reservas, 0 órfã. Teto de 500 escritas **não é aplicado pelo emulator** (522 passaram) |
| 3 | a porta do "já tem código" sob concorrência | **HOLDS** | venda concorrente carimbou `ped-cc-30` com `QQQQQ` durante o run: o backfill releu na transação, pulou o sorteio, manteve `QQQQQ` e só acrescentou o espelho |
| 4 | remendo nunca escreve na direção inversa | **HOLDS** no sentido declarado; **CAI** no não declarado | pedido→espelho sempre; mas pedido SEM código com espelho canônico era re-sorteado (defeito 3) |
| 5 | reserva alheia com shapes tortos | **HOLDS** | `pedidoId` numérico, `null`, ausente e array: nenhuma sobrescrita, pedido intacto, exit 1 |
| 6 | o código de saída mente? | **MENTIA** no ensaio | ensaio saía 0 com 1 torto + 1 reserva alheia (defeito 6) |
| 7 | PII na saída | **CONFIRMADO e limitado** | sai id de pedido (contém o uid), id de evento, status, código. Nome, e-mail, telefone e CPF **não** são lidos pelo script em nenhum ramo |
| 8 | fronteira do `--project` | **CAI** | `GOOGLE_CLOUD_PROJECT`/`GCLOUD_PROJECT` não suprem (ok), mas `FIRESTORE_EMULATOR_HOST` desviava tudo (defeito 1); `--project --apply` virava modo aplicar contra projeto inventado |
| 9 | o sorteio criptográfico não chega à venda | **CONFIRMADO** | estático e dinâmico, abaixo |

## Vetor 9 — o achado do construtor está certo

**Confirmado nos dois métodos**, em `d1d6582a` e no HEAD daquele momento
(`fc756174`):

- `createInscricaoChargeCore(..., random: () => number = Math.random)` — `:2335`
- repassa a `criarDocsDeCheckout(..., random = Math.random)` — `:2448` / `:1308`
- que chama `sortearCodigoPedidoNaTx(db, tx, random)` — `:1627`
- que chama `gerarCodigoPedido(random)` — `codigoPedidoReserva.ts:100`
- a callable **não** passa `random` (`createInscricaoChargeCore(` em `:2572`,
  sem o argumento), então o default vence sempre.

Medição dinâmica, 200 sorteios de cada, contando as duas fontes:

```
gerarCodigoPedido()            [backfill]    Math.random=0     crypto=4
gerarCodigoPedido(undefined)   [pós-fix]     Math.random=0     crypto=4
gerarCodigoPedido(Math.random) [venda HEAD]  Math.random=1000  crypto=0
```

O backfill **não** herda o defeito, como declarado. O conserto proposto está
medido: `undefined` cai no `SORTEIO_PADRAO` e a injeção determinística continua
intacta (`() => 0` × 5 → `AAAAA`).

**Já foi corrigido pela lane vizinha** em `61776052` (`fix(checkout): o sorteio
do codigo da compra volta a ser o do sistema (RN-474)`), exatamente nas três
linhas propostas. Nada tocado por esta lane.

## Produção — auditoria somente-leitura

Ensaio e varredura independente rodados contra `leela-hub` com ADC montada fora
do repo e apagada em seguida. **Zero escrita.** As medições do construtor batem:

```
Projeto: leela-hub · Destino: PRODUÇÃO — Firestore real · Modo: DRY-RUN
Pedidos lidos: 17 · Já completos: 0 · sem código: 17
A remendar: 0 · Espelhos a carimbar: 22
NÃO tocados — fora do formato: 0 · reserva de outro: 0 · vestígio: 0
```

E os cenários de risco desta review **não existem na população de hoje**:

| cenário | em produção |
|---|---|
| `pedidoCodigos` (reservas vivas) | **0 documentos** |
| pedido já com `codigoPedido` | 0 |
| `inscritoRefs` com id repetido | 0 |
| `inscritoRefs` não-array | 0 |
| `inscritoRef` com barra / não-string | 0 |
| pedido sem `eventoId` | 0 |
| **espelho com código vivo** (o cenário de perda) | **0** |
| inscrito fora de alcance | 2 (o ACHADO 2 do construtor) |

Ou seja: dos defeitos achados, o único **alcançável** na execução real do dono é
o defeito 1, que é ambiental. Os outros são guarda de borda — o que não os torna
opcionais, porque a ferramenta fica no repo e a população cresce.

## O que NÃO foi provado (e por que)

- **Teto de 500 escritas por transação.** O emulator não o aplica: um pedido com
  520 inscritos commitou 522 escritas sem erro. O limite conhecido declarado no
  handoff da 5b (*"a falha é capturada, o pedido fica de fora e o relatório o
  nomeia"*) segue **sem prova executável**. Sem risco hoje (maior compra tem 3
  inscritos), mas a frase não tem lastro.
- **`--apply` real contra produção.** Por política — é ato do dono.
- **Contenção com mais de duas execuções simultâneas.**

## Uma nota de processo (custou uma reprovação falsa)

A primeira execução da suíte deu **8/9** e a falha parecia regressão real. Era
**colisão de emulator**: a porta escolhida (8983/9983) é a do
`firebase.a4.json`, lane em voo. O emulator da REV-5B morreu no meio do run e o
teste leu banco vazio. Reproduzido verde 9/9 depois de mudar para 8987/9987 com
hub e logging próprios (`firebase.rev5b.json`, commitado como as outras lanes
de review fazem).

É a terceira vez que isto morde nesta rodada. **Colisão de emulator é
indistinguível de regressão** — quem abrir lane nova tem de conferir a tabela de
portas dos `firebase.*.json` antes de escolher a sua, e reservar `hub` e
`logging` também, não só firestore e auth.

## Para o selo do maestro

1. **Comando do kanban do dono** — acrescentar o redirecionamento para arquivo e
   a conferência da linha `Destino:`; o bloco do handoff da 5b está incompleto
   sem elas.
2. **`06-spec-codigo-pedido.md`** — a correção de volume (17, não 12) segue
   válida e continua pendente.
3. **Pendência sequenciada (ACHADO 1)** — pode ser marcada como fechada:
   `61776052`.
4. **ACHADO 2** (dois pedidos cancelados apontando para inscrito inexistente) —
   confirmado independentemente. Segue para quem tem o webhook de
   expiração/cancelamento na mão.
5. **Achado de processo** — tabela de portas de emulator por lane, incluindo hub
   e logging.

## Commits

- `eea10348` — `fix(backfill): o destino da escrita passa a ser declarado, e o
  vestigio de codigo nao e sobrescrito (REV-5B)` — defeitos 1-6 + os de baixa.
- `813a38c1` — `test(backfill): o teste de concorrencia deixa de exigir zero de
  quem perde a corrida (REV-5B)` — defeito 7.

Ambos `--only`, sem tocar nas árvores das lanes em voo.
