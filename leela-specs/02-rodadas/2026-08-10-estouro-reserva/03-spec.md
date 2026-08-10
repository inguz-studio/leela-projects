---
tags: [leela, spec, rodada, estouro, reserva, checkout, pix, estoque, cron]
trace: leela-estouro-reserva-20260810
lote: SPEC-ESTOURO-RESERVA
data: 2026-08-10
---

# 03-spec · A reserva do pedido pendente e a varredura do PIX vencido

> Zero código. Toda afirmação sobre o repositório foi medida e o caminho está em
> [[02-inventario-codigo]]. Quatro regras novas, duas histórias, e um vetável único no fim.
>
> **Prova de não colisão.** O [[indice-de-regras-de-negocio]] anuncia a próxima faixa livre na
> **543** (a mais alta em uso é a RN-542, SPEC-ADMIN-VISAO de 09/08). Varredura desta lane por
> `RN-543` a `RN-559` sobre `leela-specs`, `apps`, `packages`, `functions` e `firestore.rules`,
> fora do índice e desta rodada: **zero ocorrências**. Esta lane consome **RN-543 a RN-546**, e a
> conferência foi refeita imediatamente antes do commit — a lição do 537-542 (renumeração em
> pleno fecho) e do 516 (buraco por lane concorrente) vale aqui.
>
> Numeração de histórias: a mais alta do E04 é a **S320**, mas a **S321 está tomada** — foi
> consumida pelo E01 em 08/08 (SCROLLBAR-TEMA, "o cromo do navegador obedece ao tema"), porque a
> numeração de história é global, não por épico. O pulo fica registrado para ninguém contar a
> S321 como buraco. Esta lane consome **S322 e S323** (varredura repo-wide: zero ocorrências).

## Parte 1 · O desenho, antes das regras

### Duas peças que sobem juntas ou nenhuma — e a ordem entre elas

A decisão tem uma dependência estrutural, medida em [[02-inventario-codigo]] §3: o vencimento do
PIX **não tem executor automático**. `expirarPixPendente` é onCall do comprador, o OVERDUE do
Asaas chega com ~1 dia de atraso (dueDate é DIA), e nada mais varre `pixExpiraEm`. Reservar vaga
sem varredura transforma cada PIX abandonado numa vaga presa por tempo indeterminado — pior que o
estouro que a decisão veio matar.

Então: a **varredura é pré-requisito da reserva**, e a ordem executável é varredura primeiro.
Ela é útil sozinha desde já — hoje um pedido PIX abandonado fica `'pendente'` para sempre a menos
que o comprador reabra a tela (que chama o onCall) ou o OVERDUE chegue no dia seguinte; a
varredura mata esses zumbis em minutos, com a cobrança cancelada no gateway. A reserva só entra
em código depois de a varredura estar no ar e provada.

### O mecanismo da reserva: um contador, três portas de saída

- **Nasce** na transação que cria a cobrança (`criarDocsDeCheckout`): para cada linha do pedido
  com `loteId`, o gate lê o lote e recusa se
  `vendidos + reservas + linhasDaVenda > quantidadeLimite`; passando, incrementa `reservas` no
  mesmo commit que cria pedido, inscritos e pagamento. Nenhuma janela entre checar e gravar.
- **Morre** por exatamente uma de três portas, sempre na MESMA transação que dá ao pagamento o
  estado terminal (ou o confirma): (1) a varredura agendada expira o PIX vencido;
  (2) o webhook flipa para `'falhou'` (OVERDUE, recusa de captura) ou confirma — confirmação
  converte reserva em venda: decrementa `reservas` e o gatilho de inscrito já recomputa
  `vendidos`; (3) o onCall manual do comprador expira o próprio pedido. As três portas passam
  pela mesma guarda de transição única que já existe, então a liberação é exactly-once por
  construção.
- **Não mexe na virada.** `vendidos` continua sendo o único gatilho de virada e de carimbo
  (RN-300 intocada). Lote com as últimas vagas reservadas fica **indisponível para compra** sem
  estar **encerrado**: se as reservas morrerem, as vagas voltam sem reabrir nada, porque nada foi
  carimbado. É o que elimina o risco de regressão de preço que a decisão #1 do `virarLote` já
  recusou para o estorno.

### O que esta spec não faz, e é deliberado

Não toca dinheiro: preço, taxa, juros e repasse ficam byte a byte (RN-182 conferida intocada por
teste na fila). Não absorve a correção mínima da RN-498 (`S315-T3`/`S315-T4`), que continua
independente. Não inventa fila de espera nem "reserva de carrinho" — o carrinho segue não
segurando estoque; a exceção é da **cobrança emitida** (delta na RN-158). E não decide o teto do
pendente de cartão — vai ao dono (Parte 5).

## Parte 2 · Regras de negócio novas

Todas donas em [[LEELA-E04-config-vendas]], faixa RN-543 a RN-546. Consolidadas no épico nesta
mesma aterrissagem.

### RN-543 · A vaga sai do estoque quando a cobrança nasce

Verbatim do dono (ESTOURO-1, 09/08): *"Se um pedido está com pagamento pendente, a vaga não está
disponível para compra."*

Um pedido `'pendente'` **reserva** as vagas das linhas dele, por lote
(`pedido.itens[].loteId`). A reserva vive num contador `reservas` no doc do lote, de **escrita
exclusiva de Function** no mesmo regime do `vendidos` (create exige 0/ausente, update de cliente
não toca — `firestore.rules:1109-1117` é o molde), com leitura Postel no parse (ausente = 0). O
gate roda **dentro da transação** de `criarDocsDeCheckout`:
`vendidos + reservas + linhasDaVenda > quantidadeLimite` ⇒ recusa `failed-precondition` com
motivo tipado próprio, sem criar doc nenhum. Multi-inscrito no mesmo lote conta cada linha.

Três fronteiras, para a regra não vazar:

1. **Reserva nunca dispara virada nem carimbo.** `loteEsgotado`, `motivoEncerramento` e o ratchet
   do `virarLote` continuam lendo só `vendidos` (RN-300 intocada). O gate de compra é que passa a
   somar `reservas`. Indisponível ≠ encerrado.
2. **Reserva não é dinheiro.** Nenhum valor, taxa ou juro deriva dela; RN-182 intocada.
3. **A RN-498 continua inteira.** Pago nunca é recusado; excedente (por porta manual, corrida
   residual ou reserva de cartão vencida — Parte 5) continua aparecendo como `lote_excedido` e
   "N acima do configurado". A reserva fecha a origem normal do estouro; a honestidade sobre o
   resto fica.

**Falsificação:** com lote de limite 20, 19 confirmados e 1 reserva viva, a 21ª tentativa de
cobrança é recusada sem criar docs; a reserva morrendo, a mesma tentativa passa; e em nenhum dos
dois estados nasce carimbo de encerramento.

**Épico dono:** E04 · **consome:** RN-157, RN-158 (delta), RN-300, RN-498.

### RN-544 · A reserva morre por uma das três portas, e a vaga volta

A liberação da reserva acontece **na mesma transação** que dá ao pagamento o estado terminal ou o
confirma — nunca num passo separado:

| Porta | Transição | Gateway | Reserva |
|---|---|---|---|
| Varredura agendada (RN-545) | `pendente → cancelado` (`pix_expirado`) | cancela primeiro, fail-safe herdado | liberada |
| Webhook `'failed'` (OVERDUE, captura recusada) | `pendente → falhou` | nada a cancelar (o gateway avisou) | liberada |
| Webhook `'confirmed'` | `pendente → confirmado` | — | **convertida**: decrementa `reservas`; `vendidos` sobe pelo recompute que o gatilho de inscrito já dispara |
| onCall do comprador | `pendente → cancelado` (`pix_expirado`) | cancela primeiro, fail-safe herdado | liberada |

A guarda de transição única já existente nas três máquinas é o que faz a liberação ser
exactly-once: cada pagamento sai de `'pendente'` uma vez só, e quem chega depois no-opa
(`jaFinal`). Como rede contra drift (crash entre releitura e commit fora das tx, contador semeado,
correção manual), a varredura fecha cada rodada com **recontagem absoluta**: `reservas(L)` =
linhas de pedidos `'pendente'` apontando para L — recontagem substitui, não soma, no mesmo molde
idempotente do `virarLote`, com a diferença declarada de que `reservas` **não é ratchet**: ela
sobe e desce, porque reserva expira; monotônico aqui seria o defeito.

**A vaga volta para o lote da linha.** Não existe fila de espera: a vaga liberada fica disponível
ao próximo comprador pela própria aritmética do gate. Se o lote encerrou **por data** enquanto a
reserva vivia, a vaga volta a um lote de venda fechada — nada reabre (RN-300). Encerramento **por
quantidade** com reserva viva é irrepresentável pelo desenho da RN-543 (virada só por
`vendidos`). Estorno segue não devolvendo vaga (decisão #1 do `virarLote`, inalterada).

**Falsificação:** expirar uma reserva pela varredura e reenviar o mesmo webhook OVERDUE (e
vice-versa) decrementa `reservas` **uma vez** — nunca duas; e um lote encerrado por data não
volta a vender quando a reserva morre.

**Épico dono:** E04 · **consome:** RN-157, RN-300 · **preserva:** decisão #1 do virarLote.

### RN-545 · O vencimento do PIX tem varredura agendada, com minuto explícito

Nasce a Function agendada de varredura do PIX pendente vencido (nome proposto:
`varrerPixVencidos`), no padrão ADR-015 (wrapper fino + `*Core(db, agora)` testável no Emulator):

- **Agendamento:** expressão cron **explícita** `3-58/5 * * * *` com
  `.timeZone('America/Sao_Paulo')`. Cadência de 5 minutos (o vencimento é de 30 — atraso máximo
  de ~5 min na devolução da vaga), minuto fixado pela expressão, e a grade `:03/:08/:13…` foge
  dos instantes de partida dos noturnos (03:00, 03:05, 03:10, 03:20) — lição da REV da Onda 1 de
  10/08: `every N` deixa o Scheduler escolher o minuto (`rollups.ts:189-193`). O agendamento vira
  teste no molde de `adminVisaoOnda1Agendamento.test.ts`.
- **Query:** `pagamentos` com `status == 'pendente'` e `pixExpiraEm <= agora`, com teto por
  rodada (`limit`, mesma disciplina do `CARRINHOS_LOTE_MAX`) — backlog drena nas rodadas
  seguintes e uma rajada não estoura o timeout. Exige **um índice composto novo** em
  `pagamentos` (status + pixExpiraEm), o primeiro da coleção, declarado na fila.
- **Efeito por item:** REUSA `expirarPixPendenteCore` com um **chamador de sistema** — o core
  ganha a distinção `{ uid } | { sistema: true }`; o callable público continua exigindo o dono do
  pedido, byte a byte. Nenhuma segunda máquina de cancelamento nasce (precedente:
  `encerrarPixAnteriorNaCriacao` já reusa o core). Gateway-primeiro e fail-safe herdados: recusa
  do gateway deixa o pedido vivo, conta na rodada e retenta na seguinte — sem retry manual, sem
  estado novo.
- **Secrets:** `runWith({secrets: ['ASAAS_API_KEY', 'ASAAS_WEBHOOK_AUTH_TOKEN']})`, molde
  `varrerEstornosOrfaos` — a lição `QR_TOKEN_KEYS` está citada no inventário e o teste de
  contrato de binding (`secretsBinding.contract.test.ts`) cobre a function nova.
- **Erro isolado por item** nunca derruba o lote (molde `expirarCarrinhosAbandonadosCore`).

**Observabilidade — a falha é visível onde:** cada rodada loga `pix_varredura_rodada` com
`{encontrados, expirados, recusadosGateway, naoElegiveis, erros}` (sem PII); cada falha por item
loga `pix_varredura_item_falhou` com pedidoId e erro. O flip grava `gatewayCancelado` como o
onCall já grava — a reconciliação distingue cobrança morta lá fora de cobrança que nunca chegou
ao gateway. **Limite declarado:** log não acorda ninguém — a plataforma tem zero políticas de
alerta e Sentry como no-op (pendência do CTO registrada em [[DECISOES-ABERTAS]] §"o gancho de
incidente existe e do outro lado não há ninguém"). Esta spec produz o log casável pela doutrina
de incidente e **não** finge que isso é alerta; a varredura parada aparece na ausência das linhas
de rodada, e a spec não inventa heartbeat novo sem o dono pedir.

**Falsificação:** um pagamento `'pendente'` com `pixExpiraEm` no passado é flipado em até uma
rodada, com a cobrança cancelada no gateway antes dos docs; o mesmo doc reprocessado numa segunda
rodada no-opa; e trocar a expressão do cron por `every 5 minutes` derruba o teste de agendamento.

**Épico dono:** E04 · **materializa:** RN-157 · **pré-requisito de:** RN-543.

### RN-546 · O pendente de cartão reserva com teto próprio — **condicionada ao veto do dono (ESTOURO-2)**

A letra do dono não distingue meio de pagamento ("um pedido com pagamento pendente"), e o pedido
de cartão também nasce `'pendente'`. Mas o cartão **não tem vencimento natural**: não existe
`pixExpiraEm` dele, a confirmação normalmente chega em segundos, e um webhook perdido deixaria o
pedido pendente para sempre — sob a RN-543, uma vaga presa para sempre.

**Se o dono ratificar o default proposto** (ESTOURO-2, opção 1): a reserva de cartão tem **teto
de 30 minutos** (a mesma constante da RN-157, um número só no sistema). Vencido o teto, a
**vaga volta e o pedido continua vivo** — nada é cancelado no gateway, porque cancelar cobrança
de cartão em processamento é mexer em dinheiro em voo. Se a confirmação chegar depois do teto,
ela entra (pago nunca é recusado — RN-498), e o excedente eventual aparece pelo caminho que a
RN-498 já exige. A liberação por teto é da mesma varredura da RN-545, por recontagem (pedido
pendente de cartão além do teto sai da conta de `reservas`).

**Se ele escolher outra opção**, esta RN não nasce assim — ver as três opções e os custos em
[[DECISOES-ABERTAS]] §ESTOURO-2. Nenhuma linha de código do cartão entra antes da resposta.

**Épico dono:** E04 · **consome:** RN-543, RN-545, RN-498.

## Parte 3 · As cinco perguntas do brief, respondidas

**(a) Semântica exata de "pendente segura vaga" contra o código atual.** Hoje pendente NÃO segura
nada — a vaga é contada na confirmação (`STATUS_QUE_CONTAM_VENDA`, inventário §1). A decisão
inverte: segura a partir do commit da transação que cria a cobrança, **por quanto tempo** = a
vida do pendente — PIX: 30 min (`PIX_EXPIRACAO_SEGUNDOS`); cartão: até o webhook, com o teto do
ESTOURO-2. O webhook de expiração do Asaas hoje flipa pedido/pagamento para `'falhou'` com ~1 dia
de atraso (OVERDUE é por dueDate, granularidade de DIA — inventário §4) e por isso não substitui
a varredura.

**(b) Agendamento.** Cron explícito `3-58/5 * * * *` + `America/Sao_Paulo`, minuto fixado pela
expressão, grade fora dos instantes 03:00/03:05/03:10/03:20 dos noturnos, com teste de
agendamento (RN-545).

**(c) Idempotência — três portas para o mesmo estado.** Varredura, webhook e onCall convergem
para a mesma guarda de transição única sobre `'pendente'`; quem perde a corrida no-opa. A
liberação da reserva vive na mesma tx do flip (exactly-once) e a recontagem absoluta da varredura
é a rede contra drift (RN-544).

**(d) Evento LOTADO cuja pendência expira — a vaga volta para quem?** Para o **lote da linha do
pedido**, e dali para o próximo comprador que chegar — não há fila de espera nem notificação.
Lote encerrado por data não reabre; encerrado por quantidade com reserva viva não existe pelo
desenho; estorno segue sem devolver vaga (RN-544).

**(e) Observabilidade.** Log estruturado por rodada e por item, `gatewayCancelado` no doc,
falsificação por teste — e o limite dito em voz alta: sem política de alerta (pendência do CTO),
visível quer dizer "no log", não "no telefone de alguém" (RN-545).

## Parte 4 · Histórias

### LEELA-S322 · A varredura do PIX vencido

**Job story.** Quando um comprador abandona um PIX sem pagar, eu quero que a plataforma encerre a
cobrança sozinha no vencimento, para que pedido zumbi não dependa de o comprador reabrir a tela —
e para que, com a reserva, vaga nenhuma fique presa a um pagamento que não vai acontecer.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** functions (sem pixel) · **Épico:** E04
- **RNs:** RN-545, RN-157, RN-544 (porta 1)
- **Depende de:** nada. Sobe sozinha e é pré-requisito da S323.

**Critérios de aceite (Given/When/Then)**

- **Dado** um pagamento PIX `'pendente'` com `pixExpiraEm` no passado, **quando** a varredura
  roda, **então** a cobrança é cancelada no gateway ANTES dos docs, pedido e pagamento viram
  `'cancelado'` com `canceladoMotivo: 'pix_expirado'` e `gatewayCancelado: true`, e os inscritos
  permanecem `'pendente'`.
- **Dado** que o gateway recusa o cancelamento, **quando** a varredura processa o item,
  **então** o pedido segue vivo, o item conta em `recusadosGateway`, e a rodada seguinte retenta
  — nenhum doc flipado sem gateway confirmado.
- **Dado** que o webhook confirmou o pagamento entre a query e a transação, **quando** o item é
  processado, **então** a transação relê, vê estado final e no-opa (`jaFinal`) — dinheiro manda.
- **Dado** um pagamento dentro do prazo, **quando** a varredura roda, **então** ele não é tocado
  (a query não o vê; e se o visse, o relógio do servidor nega).
- **Dado** o callable público `expirarPixPendente`, **quando** um terceiro chama com pedido
  alheio, **então** `permission-denied` — byte a byte o comportamento de hoje.
- **Dado** o wrapper agendado, **quando** o teste de agendamento lê a expressão, **então** ela é
  `3-58/5 * * * *` com timezone `America/Sao_Paulo` — `every N minutes` derruba o teste.
- **Dado** mais itens vencidos do que o teto da rodada, **quando** a varredura roda, **então**
  processa até o teto e loga o encontrado; o resto drena nas rodadas seguintes.

**Tarefas**

| Task | O que é | Tipo |
|---|---|---|
| `S322-T1` | `expirarPixPendenteCore` ganha o chamador de sistema (`{uid} \| {sistema:true}`); callable público inalterado, provado por teste de ataque ⚔ | function |
| `S322-T2` | `varrerPixVencidos`: wrapper ADR-015 + Core bounded + query + índice composto novo em `pagamentos` (status, pixExpiraEm) + secrets binding ⚔ | function |
| `S322-T3` | Teste de agendamento (expressão explícita + timezone) no molde `adminVisaoOnda1Agendamento` | integration |
| `S322-T4` | Idempotência das três portas: varredura × webhook OVERDUE × onCall, cada par em corrida, uma transição só | integration |

### LEELA-S323 · A reserva do pedido pendente

**Job story.** Quando eu pago pela última vaga, eu quero sair com a certeza de que ela é minha,
para não descobrir na véspera que outra pessoa pagou pelo mesmo lugar. E quando um pendente
vence, eu (organizador) quero a vaga de volta à venda sozinha, para não perder inscrição por vaga
presa.

- **MoSCoW:** Must · **Estimativa:** L · **Superfície:** functions + core + rules + telas de
  vagas · **Épico:** E04
- **RNs:** RN-543, RN-544, RN-546 (condicionada), RN-498, RN-158 (delta), RN-300
- **Depende de:** **S322 no ar e provada** (duas peças juntas ou nenhuma) · ESTOURO-2 apenas
  para a `S323-T7`

**Critérios de aceite (Given/When/Then)**

- **Dado** um lote com 1 vaga livre e um pedido PIX pendente sobre ela, **quando** um segundo
  comprador tenta criar cobrança no mesmo lote, **então** a criação é recusada
  (`failed-precondition`, motivo tipado) sem criar pedido, inscrito, pagamento nem cobrança no
  gateway.
- **Dado** a recusa acima, **quando** a tela exibe o estado, **então** o comprador lê que as
  últimas vagas estão em pagamento por outra pessoa e podem voltar em minutos — nunca o
  "esgotado" seco de lote vendido (estados distintos, copy distinta).
- **Dado** que a reserva expira (varredura), **quando** o mesmo segundo comprador tenta de novo,
  **então** a criação passa e o preço é o do lote vigente — nenhum carimbo de encerramento nasceu
  no meio.
- **Dado** um pedido pendente confirmado pelo webhook, **quando** a transação de confirmação
  commita, **então** `reservas` decrementa na mesma tx e `vendidos` sobe pelo recompute — a soma
  `vendidos + reservas` nunca conta a mesma pessoa duas vezes.
- **Dado** um lote cuja janela venceu (virada por data) com reserva viva, **quando** a reserva
  morre, **então** o lote não volta a vender — RN-300 intocada, provado por teste.
- **Dado** um pedido multi-inscrito com 3 linhas no mesmo lote, **quando** a cobrança nasce,
  **então** `reservas` sobe 3 e o gate contou as 3 contra o limite.
- **Dado** o cliente (client SDK), **quando** tenta escrever `reservas`, **então** as Rules
  negam — mesmo regime do `vendidos`, provado por ataque na suíte de Rules.
- **Dado** dinheiro, **quando** a suíte roda, **então** RN-182 está conferida intocada: nenhum
  valor de venda, taxa ou repasse muda com a reserva.

**Tarefas** — a lista com território e gates vive em [[04-fila-codigo]].

## Parte 5 · Vetável — o dono decide

### ESTOURO-2 · Estoque · o pendente de cartão reserva vaga por quanto tempo

O PIX tem vencimento de 30 minutos e a varredura o executa. O cartão não tem vencimento nenhum: o
pedido nasce `'pendente'`, a confirmação normalmente chega em segundos — e se o webhook se
perder, o pendente fica para sempre. Sob a reserva, "para sempre" é uma vaga presa que ninguém
consegue soltar.

- **Caso de uso:** um comprador paga com cartão e o webhook do gateway se perde. O pedido fica
  pendente. Com reserva sem teto, a última vaga do lote fica presa até alguém da plataforma
  intervir à mão; com teto, ela volta sozinha em 30 minutos — e se a confirmação atrasada chegar,
  a pessoa entra do mesmo jeito, com o eventual excedente aparecendo no painel como a RN-498 já
  manda.
- **Job story:** quando eu vendo um evento com poucas vagas, eu quero que vaga presa a pagamento
  que não anda volte sozinha para a venda, para não perder inscrição real por causa de um webhook
  perdido.
- **O que fica com você:** o teto da reserva do pendente de cartão.
- **Por que agora:** a sua frase cobre "pagamento pendente" sem distinguir meio — a reserva de
  cartão nasce da sua letra. O que a letra não diz é quando ela solta, e escolher isso por você
  seria decidir estoque em silêncio.
- **Opções:** **teto de 30 minutos, o mesmo número do PIX** — vaga volta, pedido continua vivo,
  confirmação atrasada entra e o excedente aparece pela RN-498 (**default proposto**: um número
  só no sistema, nenhum pedido cancelado, nenhuma vaga presa) · **reserva de cartão sem teto**,
  até o webhook final — fecha 100% da venda dupla no cartão ao custo de a vaga ficar presa
  enquanto o webhook não vier, que é exatamente a classe de defeito que a varredura existe para
  matar · **cartão não reserva** — só o PIX segura vaga; diverge da sua letra e reabre no cartão
  a corrida que você fechou, então só entra se for escolha sua explícita.
- **Onde aterrissa:** RN-546 em [[LEELA-E04-config-vendas]] (só nasce com a resposta);
  `S323-T7` em [[04-fila-codigo]]. Detalhe em `02-rodadas/2026-08-10-estouro-reserva/03-spec.md`.
