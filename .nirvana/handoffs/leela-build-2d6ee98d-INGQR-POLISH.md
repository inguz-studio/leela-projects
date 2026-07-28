# Handoff · Lane INGQR-POLISH · trace leela-build-2d6ee98d

- **Employee:** `sf-backend-lead` (software-forge)
- **Repo:** `C:\dev\LEELA`, branch `main`. **SEM push** — 3 commits de código + 1 de boards.
- **Escopo:** fecho da posição 1 — item 54 do painel (T1) + achados 4 e 5 da
  INGQR-REV (T2, T3). Nada de feature nova.
- **Preview do dono:** 5273 / 8180 / 3000 intocados; nenhum re-seed rodado.
- **Emulador:** exclusivo, `npx firebase-tools@13 emulators:exec --project
  demo-leela` (8080/9099/5001), com build de `functions` antes.

## Placar

| Task | Estado | Commit |
|---|---|---|
| T1 · varredura de ingressos órfãos (item 54 · RN-382) | ✅ | `45c4722` |
| T2 · guarda de `pedidoRef` em `emitirIngressosDoPedido` | ✅ | `2e14d39` |
| T3 · dublê de layout com `<Outlet/>` | ✅ | `d7cd6b5` |
| Boards + épico E12 (RN-382) | ✅ | `dfc1967` |

## T1 — o órfão de ingresso ganhou extrato, varredura e alerta

O buraco do vetor 3 da REV: a única janela de emissão era a primeira entrega do
webhook, e re-entrega não reabre (duplicada ⇒ `null`; outro eventId ⇒ estado
já final ⇒ `null`, as duas antes de olhar o pedido).

**Reaproveitado do item 27, campo a campo:** extrato de pendência gravado no
ponto da falha (`ingressosPendentes/{pedidoId}`, docId pela chave do caso,
`resolvido` + contador, detecção nunca des-resolve), cron `every 15 minutes` no
fuso de São Paulo pelo molde ADR-015, e a varredura que conta, alerta e
re-dispara o que o gatilho inline não fechou. **Criado:** o remédio — em vez do
POST no gateway, a própria emissão, que já é idempotente por inscrito.

**Mudança de comportamento declarada:** o e-mail passa a esperar a emissão
fechar. A RN-219 é at-most-once por pedido e a chave sai do pedido (`291d4f9`);
queimá-la sobre uma lista parcial condenaria o inscrito que faltou a nunca
receber o QR. Com pendência aberta, quem manda é a varredura; ao esgotar as 8
re-tentativas (2 h) ela manda o que existe, marca `esgotado` e alerta.

Arquivos: `functions/src/eventos/ingressosPendentes.ts` (extrato, sem import de
irmão — uma direção só, sem ciclo), `functions/src/eventos/varrerIngressosOrfaos.ts`
(varredura + cron), detecção em `dispararEmissaoIngressosPosConfirmacao`,
export em `functions/src/index.ts`.

Provas (emulador, 5 casos novos em `ingressosOrfaos.integration.test.ts`):

| Caso | Asserção que morde |
|---|---|
| falha na 1ª entrega | extrato nasce (`emissao_incompleta`, `falhas: 1`) e o e-mail inline fica em 0 |
| varredura | `emitidos 1 · resolvidos 1 · emailsEnviados 1`; UM e-mail com os DOIS códigos; `'enviado'` (não `'ja_enviado'`) prova que a chave da RN-219 estava intacta |
| re-entrega do gateway | token e código idênticos, zero e-mail novo |
| pedido cancelado | pendência fechada com `desfecho: pedido_nao_pago`, sem e-mail |
| emissão que nem roda | `emissao_nao_processada` + `detalhe: evento_sem_tenant`; a varredura carimba tentativa e NÃO resolve |
| esgotamento | 8 varreduras ⇒ `esgotado: true` + alerta + e-mail do que existe; a 9ª conta `conferenciaManual` e não re-tenta |
| Rules | `tenant_owner` negado na leitura E na escrita de `ingressosPendentes` |

## T2 — a emissão confere o pedido dos dois lados

`emitirIngressoDoInscrito` recebe o `pedidoId` e exige `inscrito.pedidoRef ===
pedidoId` **antes** do teste de status (identidade primeiro, estado depois).
Recusa entra em contador próprio (`rejeitados`) e log `error`, **não** em
`falhas`: falha vira pendência que a varredura re-tenta, e re-tentar não
conserta lista corrompida — o pedido ficaria pendente até esgotar e o e-mail do
comprador legítimo esperaria junto.

**Falsificação:** com a condição desligada, `× inscrito de OUTRO pedido na lista
não sai com ingresso` · `expected 2 to be 1`. Restaurado por backup.

## T3 — o dublê deixou de ser beco sem saída

`<Outlet/>` entrou como **irmão** do marcador, não filho: `resolverEm` compara o
`textContent` do marcador e a filha dentro dele mudaria o texto das asserções de
precedência. As duas filhas alcançadas (`OverviewPage`, `InscritosPage`) viram
marcadores e `RequirePapel` entra como passa-direto (ele lê Outlet context do
layout real e sessão de verdade — conteúdo de outra suíte).

**Nenhuma asserção atual mudou:** as 8 seguem idênticas. A nova torna o Outlet
load-bearing. **Falsificação:** sem o Outlet, `× a rota filha de :slug RENDERIZA
dentro do layout` (`Unable to find an element by: [data-testid="filha"]`) e as
outras 8 continuam verdes — que é exatamente o falso-verde do achado 5.

## Gates (comando + resultado literal)

| Gate | Comando | Saída |
|---|---|---|
| functions tsc | `npx tsc --noEmit` | exit 0 |
| functions eslint | `npx eslint src --max-warnings 0` | exit 0 |
| functions build | `npx tsc` | exit 0 |
| emulador (19 suítes) | `emulators:exec --project demo-leela "npm --prefix functions run test -- <19 arquivos>"` | **19 files / 339 tests passed** · 207,16 s · exit 0 |
| painel tsc | `npx tsc --noEmit` | exit 0 |
| painel eslint | `npx eslint src --max-warnings 0` | exit 0 |
| painel suíte | `npx vitest run` | **186 files / 1698 tests passed** · exit 0 |
| painel build | `npx vite build` | exit 0 · principal 2.181,09 kB (gzip 578,61) + chunk `qrcode` 24,53 kB (idênticos à REV) |

As 19 suítes = as 17 da INGQR-REV + `ingressosOrfaos.integration` (nova) +
`estornoOrfao.integration` (o gêmeo do item 27, para provar que o reuso não o
quebrou). Delta sobre a REV: **+6 casos** (5 do T1, 1 do T2). Painel: 1697 → 1698
(+1 do T3). `packages/core` e `packages/api-client` **não foram tocados** —
nenhum `tsup` necessário antes da suíte do painel.

## Reaproveitado vs criado

**Reaproveitado:** o desenho inteiro do item 27 (`estornarPagamentoOrfao.ts`) —
extrato top-level com `resolvido`/contador/carimbos, "detecção nunca
des-resolve", cron `every 15 minutes` + `timeZone('America/Sao_Paulo')` do molde
ADR-015, laço da varredura com buckets (`pendentes`/`disparados`/
`conferenciaManual`/`falhas`), `logger.warn` agregado como alerta, e a postura
"o que exige mão humana não é re-disparado"; `emitirIngressosDoPedido` e
`enviarEmailIngressos` intocados em contrato; `selectEmailProvider`,
`obterQrKeyring`, `registrarComunicacao` (RN-219) e os helpers de teste
(`clearFirestoreDrained`, `withTriggersPaused`, `providerEspiao`).

**Criado:** `functions/src/eventos/ingressosPendentes.ts`,
`functions/src/eventos/varrerIngressosOrfaos.ts`,
`functions/src/__tests__/ingressosOrfaos.integration.test.ts`; o contador
`rejeitados` e a guarda de `pedidoRef`; 1 caso no teste de emissão e 1 no teste
de rotas do painel.

## Riscos declarados

1. **O cron em si não foi executado** — o emulador de pubsub não sobe neste
   comando; o que roda é `varrerIngressosOrfaosCore`. A definição da function
   aparece carregada (`varrerIngressosOrfaos` na lista do emulador).
2. **Envio real do e-mail continua não provado** (`BREVO_API_KEY` vazia).
3. **Pendência que esgota fica de pé até mão humana** e não há superfície no
   painel que mostre `ingressosPendentes` ao organizador — o alerta é log.
4. **A chave de idempotência do e-mail** (`encontrarInscritoResponsavel`)
   continua varrendo `inscritoRefs` sem a conferência do T2: um inscrito alheio
   na lista poderia virar o docId do registro RN-219. Não é vazamento (suprime,
   não duplica), mas é o mesmo achado 4 na outra ponta.
5. **O e-mail de um pedido com pendência atrasa até 15 min** — decisão desta
   lane, declarada acima; o caso feliz (emissão completa na 1ª entrega) segue
   com o e-mail inline, sem atraso.

## O que fica para a review

Esta lane é pequena; a review dela pode ser absorvida pela próxima REV de
dinheiro. O que morde:

- **⚔ o e-mail que espera** — a troca "atraso de até 15 min" por "ninguém fica
  sem o QR" é a decisão mais discutível do T1;
- **⚔ registro total na detecção** — qualquer desfecho não-processado vira
  pendência; conferir se algum caminho gera extrato em volume (ex.: keyring
  ausente em produção criaria uma pendência por pedido pago);
- **⚔ `TENTATIVAS_VARREDURA_INGRESSO = 8`** — 2 h de auto-cura é o número certo?
- o risco 4 acima (chave de idempotência sem a guarda do T2).
