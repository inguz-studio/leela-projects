# CKPIX-FLOW — o pós-pagamento reage sozinho (RN-560 + RN-546)

Trace `leela-redesign-v2-20260810` · lane CKPIX-FLOW · 11/08
Branch `ckpix-flow` · worktree `C:\dev\leela-wt-ckpix`
Decisão-fonte: `leela-specs/02-rodadas/2026-08-11-decisoes-dono/03-leva6-tarde.md` §CKPIX-1 e §Leva 7 (ESTOURO-2)

## O que mudou, em uma frase

A tela do pagamento deixou de esperar clique: ela assina o doc do próprio pedido, o
desfecho que o webhook materializa chega sozinho, e cada um dos cinco ramos tem
destino próprio.

## Mecanismo escolhido: `onSnapshot`, não polling

`observarPedido(db, pedidoId, { next, error })` novo em
`packages/api-client/src/pedidos.ts`, ao lado do `getPedido` que já existia.

Por que o listener:

- A Rule da RN-469 já autoriza o comprador a ler o próprio pedido, doc a doc, e o
  `allow read` avalia igual no `getDoc` e no `onSnapshot`. Zero permissão nova.
- Custo: uma leitura por MUDANÇA real. O polling custa uma por janela — um PIX de 30
  minutos a cada 5 s são 360 leituras por checkout abandonado, contra 1 aqui.
- A cadência do polling seria chute: o webhook não tem hora marcada.
- A casa já tem o padrão (`observarInscritos`, `observarFinanceiroEvento` no
  api-client, consumidos pelo painel). Não é mecanismo novo, é o mesmo.

Cuidado que o listener exigiu: `parsePedido` é fail-fast, e um throw dentro do callback
de snapshot mataria a assinatura em silêncio. O `try/catch` converte a recusa no canal
de `error`, que é onde o chamador já olha.

Rede de segurança MANTIDA: a consulta de carregamento e o botão "Atualizar estado do
pedido" (S1225-T3) continuam de pé. Quando a assinatura cai — Rules, rede, aba suspensa
por horas — o botão é o que sobra entre o comprador e o escuro do incidente de 04/08.

## Os cinco ramos

| # | Gatilho no doc | O que a pessoa vê | Para onde vai |
|---|---|---|---|
| 1 | `pago` (PIX) | `StepConfirmacao` + loader | `/minha-conta` |
| 2 | `cancelado` + `pix_expirado`, ou `falhou` em PIX | "O PIX foi cancelado depois que o prazo venceu" | `/minha-conta`, com o aviso |
| 3 | `falhou` em cartão | "O pagamento não foi aprovado. Revise os dados do cartão" | fica no checkout |
| 4 | `pago` (cartão) | `StepConfirmacao` + loader | `/minha-conta` |
| 5 | reserva vencida (RN-546) | "O tempo do seu checkout acabou" | `/{eventSlug}` |

Terminal SEM causa apurada continua caindo no `AvisoPedidoEncerrado` da REV-S1225,
intocado — a tela não inventa uma das frases do dono sobre uma causa que ninguém leu.

Três decisões dentro dos ramos que valem registro:

- **`falhou` num PIX é vencimento, e é prova.** O mapa `WEBHOOK_EVENT_TO_CHARGE`
  (`functions/src/payments/asaasProvider.ts`) tem três eventos que viram `failed`;
  dois são de cartão por definição (`CREDIT_CARD_CAPTURE_REFUSED`,
  `REPROVED_BY_RISK_ANALYSIS`). Sobra `PAYMENT_OVERDUE`. Sem isso, o vencimento que
  chega pelo gateway contaria uma história diferente do que chega pela varredura.
- **`pago` vence `reserva_expirada`** na ordem das portas. A RN-498 admite confirmação
  atrasada: mandar de volta à página do evento quem o servidor acabou de aceitar seria
  negar uma compra real. ⛔ não reordenar.
- **O ramo 3 não é `setStep(2)`.** `falhou` é terminal, então tentar de novo por cima
  do mesmo pedido seria replay de uma compra morta — a chave de idempotência
  devolveria o pedido recusado e o botão "Pagar" viraria controle morto. A tentativa
  seguinte descarta a cobrança e nasce com chave nova. Provado por mutante.

## O que assumi do contrato da outra lane

**Da varredura de PIX vencido (RN-544/545 · lane ESTOURO-BUILD):** que ela escreve
`status: 'cancelado'` + `canceladoMotivo: 'pix_expirado'` no doc do pedido — o MESMO
par que `expirarPixPendente` já escrevia. É o que a RN-544 diz (mantém a transição
`pendente → cancelado`, sem estado novo). O ramo 2 reage ao CAMPO, não a quem
escreveu, então ele já funciona hoje pelo caminho da callable e passa a cobrir a
varredura no dia em que ela subir, sem uma linha a mais.

Ponto de encontro no core: `MOTIVO_CANCELAMENTO_PIX_EXPIRADO` em
`packages/core/src/pedidos/pagamento.ts`. ⛔ **A varredura deve escrever ESTA
constante**, não um literal solto.

Lacuna que o `parsePedido` tinha e esta lane fechou: `canceladoMotivo` era escrito
desde a CK2-4 e **descartado no parse** — o doc carregava a causa e nenhuma tela podia
lê-la. Agora entra por leitura Postel (string não-vazia, nunca fail-fast: é rótulo de
causa, não dinheiro).

**⛔ Do contrato de "reserva expirada" (RN-546 · ESTOURO-2): NADA, porque ele ainda
não existe em código.** `git grep` sobre `origin/main` em 11/08: zero.

O ramo 5 está atrás de um marcador declarado:

```
apps/landing/app/(public)/[eventSlug]/inscricao/checkout/desfechoPedido.ts
  export function reservaDoPedidoExpirou(_pedido): boolean { return false; }
```

Por que não adivinhei o campo: o dono disse *"o pedido nao é mais reservado"*, e a
RN-546 é explícita em que o **pedido continua vivo** (nada é cancelado no gateway,
dinheiro em voo não se toca, confirmação atrasada ainda entra pela RN-498). Ou seja, a
expiração da reserva **não é transição de `status`** — é fato à parte que a varredura
carimba. Chutar `reservaExpirouEm`? `reservaAtiva`? produziria um ramo que nunca acende
ou, pior, um que acende no doc errado.

**O que a lane ESTOURO-BUILD precisa fazer:** trocar SÓ o corpo dessa função pela
leitura do campo que ela definir no core. Nada mais. O destino (`/{eventSlug}`), o
aviso, o loader e a tabela de classificação já estão prontos e testados por injeção —
o ramo passa a valer no mesmo commit.

## O aviso que atravessa a navegação

O ramo 2 leva o recado até `/minha-conta`. Ele NÃO vai na URL: aquela rota tem
invariante escrita e testada ("NADA DE PERFIL NA URL"), sustentada por
`Referrer-Policy: no-referrer` + `no-store` + `noindex`. Um `?aviso=pix-vencido` não
carrega identidade, mas carrega o FATO de que aquela pessoa teve um PIX vencido, e esse
fato num link colado em conversa é da mesma família do que a invariante proíbe.

Solução: `sessionStorage`, chave `leela.aviso-area`, leitura DESTRUTIVA na montagem
(`guardarAvisoDaArea` / `consumirAvisoDaArea` em `apps/landing/lib/areaDoCliente.ts`).
Morre com a aba, não viaja em header nenhum, não sobrevive a link compartilhado. O
aviso aparece ACIMA de todos os cinco desfechos da área, inclusive da `PortaDeEntrada`.

## ⛔ Gap para o dono: "área do cliente LOGADO" — a sessão do checkout é ANÔNIMA

O dono escreveu *"direcionamos para a área interna com o cliente logado"*. O
redirecionamento está feito. **A parte "logado" não depende desta lane e hoje não
acontece:**

- O checkout cria sessão **anônima** (`loginAnonimo` no mount) e nunca a promove.
  Não existe `signInWithCustomToken`, `linkWithCredential` nem upgrade de sessão em
  lugar nenhum de `apps/landing` (varredura feita).
- `/minha-conta` é inalcançável por sessão anônima **por decisão anterior** (RN-451,
  primeira linha): quem não é `nomeado` vê a `PortaDeEntrada`.
- A conta nasce **fora de banda**: `contaSemFriccao` cria a conta sem senha na primeira
  compra confirmada e manda link por e-mail. A pessoa só fica logada depois de clicar
  nele.

**Consequência real:** quem comprou pela primeira vez e for redirecionado cai na porta
de entrada, agora com o aviso do ramo 2 explicando por que saiu do checkout — mas ainda
tendo de entrar. Quem já tinha conta nomeada no navegador cai na área de verdade.

Fechar isso é uma frente própria (auto-login pós-compra, ou entrada por código de 6
dígitos já existente ancorada no e-mail da compra). **Decisão do dono, não da esteira.**

## ⛔ Candidato a componente do design system (CANONE-1, 11/08)

A diretriz da leva 7 diz que *"peça que não existe NASCE no design system, documentada
e padronizada, antes de ser usada"*. O padrão AVISO/CALLOUT (ícone + título + corpo em
par de cor semântica) **não tem canônico**: o barrel tem 78 componentes e nenhum é
`Alert`/`Callout`/`Banner`.

Esta lane **não inventou um quarto desenho**: `DesfechoPosPagamento.tsx` repete linha
por linha a forma dos três avisos que já vivem na pasta do checkout
(`AvisoPedidoEncerrado`, `AvisoPedidoEmConfirmacao`, `ProcessandoPagamento`), que é a
convenção de fato. Construir o canônico aqui atropelaria a **Onda 0 Parte B** (fundação
de moldura), que acabou de destravar e é de quem essa peça é.

**Encaminhado à Onda 0 Parte B:** primitivo `Alert`/`Callout` com variantes
`info`/`warning`/`danger`, e migração dos 5 avisos do checkout + o da área do cliente.

## Gates (números)

Rodados em FOREGROUND, em fatias seriais (a suíte completa serial passa de 600 s; o
paralelo é flaky nesta suíte).

| Gate | Baseline | Depois |
|---|---|---|
| Suíte landing — fatia checkout | 32 arq. | **34 arq. / 346 testes · PASS** |
| Suíte landing — fatia restante | — | **31 arq. / 503 testes · PASS** |
| Suíte landing — total | 62 arq. / 822 testes | **65 arq. / 849 testes · PASS** |
| `tsc --noEmit` (core, api-client, DS, painel, landing, functions) | limpo | **limpo** |
| `eslint --max-warnings 0` (core, api-client, landing, painel) | limpo | **limpo** |
| `gate-canon` | PASS | **PASS — todos os 10 baselines INALTERADOS** |
| merge-tree vs `origin/main` | — | **limpo (0 conflitos)** |

⚠️ `@leela/mobile#type-check` falha em `packages/core/src/eventos/evento.ts`
(`URL.protocol` ausente nos tipos RN). **Pré-existente** — reproduzido na worktree de
`main` (`C:\dev\LEELA`) antes de qualquer mudança desta lane, e o arquivo é
byte-idêntico a `main`. Não é desta lane e não foi consertado aqui.

### Falsificação — um mutante por ramo

| Mutante | O que quebrei | O que caiu |
|---|---|---|
| A | `irPara` no temporizador | ramos 1, 2 e 4 |
| B | `pix_expirado` classificado como `encerrado` | ramo 2 (regra + fiação) |
| C | não zerar `chaveRef` na recusa | ramo 3 (chave repetida no retry) |
| D | ramo 5 apontando para a área do cliente | destino da RN-546 |
| E | tirar o aviso de chegada da área | 3 dos 5 casos do `minha-conta` |

## Commits

| SHA | O quê |
|---|---|
| `a3e53066` | core + api-client: `canceladoMotivo` no contrato, `MOTIVO_CANCELAMENTO_PIX_EXPIRADO`, `observarPedido` |
| `a8610d51` | landing: os cinco ramos, a classificação pura, os avisos, a saída |
| `c85beec3` | testes: 3 arquivos novos (27 casos) + o seam de `observarPedido`/`getLeelaDb` em 22 suítes |

## Efeito colateral que a próxima lane vai encontrar

22 suítes de checkout ganharam `observarPedido: () => () => undefined` e, onde faltava,
`getLeelaDb`. Motivo: elas mockam `@leela/api-client` **função a função**, e uma
superfície nova quebra a árvore com "is not a function". Recusei guardar a chamada com
`typeof observarPedido === 'function'` — seria código defensivo que existe só para o
teste e que esconderia a mesma falha em produção.

⚠️ A assinatura agora pede o handle de banco em **toda cobrança**, e não só no PIX como
a leitura da S1225-T3 pedia — é essa a mudança de fronteira que o ramo 3 exigia (com
gateway real, a recusa do cartão volta por webhook).

## ⛔ NENHUM DEPLOY

Nada foi para o ar nesta lane, por instrução do brief.
