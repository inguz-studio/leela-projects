# Handoff vivo · POLIMENTO-0728 · trace leela-build-2d6ee98d

Employee: `sf-backend-lead` (software-forge). Branch `main`, sem push.
Lane de fecho: ressalvas das três reviews da madrugada + defaults dos itens
49, 50, 52 e 53.

## Placar

| Task | Estado | Commit |
|------|--------|--------|
| T1 · fila admin honesta e resiliente (E-1 + E-2) | ✅ | `e963426` |
| T2 · verdade nos números (49, 50, 53, NaN) | ✅ | `ad08243` |
| T3 · padrão de erro varrido (E-4) | ✅ | `f8d6859` |
| T4 · specs e miudezas (E-5 + item 15 + boards) | ✅ | `030ade3` |

**Lane FECHADA.** Quatro tasks, quatro commits, sem push. Aguarda review.

## T2 — feito

`ad08243`. Item 49: o card da Caixa exibe `min(evento, tenant)`, reusando o
`saldo/current` que a visão macro e o modal já leem. Item 50: erro de leitura
do termo (e do saldo) vira estado de erro visível no card, com `role="status"`
e cor de perigo. De carona: `Number.isFinite` no pct, agora dentro da função
pura `contextoDaCaixa`. Item 53: a coluna virou "Volta ao comprador" e mostra
o líquido com a taxa discriminada, calculado pela MESMA composição do servidor
(`pedido.itens` → `dentroDaJanelaArrependimento` → `calcularDevolucaoEstorno`),
só para `em_analise` — recalcular `aprovado_auto` produziria um segundo número
para um refund já executado.

**Reaproveitado:** `useSaldoRepasse`/`saldoRepasseQuery`, `getPedido`,
`getPoliticaVendas`, `politicaVendasPadrao`, `dentroDaJanelaArrependimento`,
`calcularDevolucaoEstorno`, `formatBRL`/`formatDinheiro`, o padrão de nota do
`ledgerIlegivel`.
**Criado:** `contextoDaCaixa`, `devolucaoPrevista`, `politicaDeReembolsoDoEvento`,
`EstornoFilaItem.devolucao`, `notaTom` no `CardValor`, 20 casos de teste.

**Gates T2:** tsc 0 · eslint 0 · `vitest run src/routes/eventos src/routes/plataforma
src/lib/query` → 103 arquivos, **907/907**. Falsificação: neutralizando o `min`,
o `Number.isFinite`, o ramo do termo e a devolução → **11 vermelhos**.

## T3 — feito

`f8d6859`. `RepassesAdminRoute` e `PlanosRoute` receberam o fix do `8f82588`:
`ultimoErro()` (ref na mesma volta do catch) nos dois hooks e a frase do
servidor no lugar do texto genérico. `mensagemDaRecusa` SUBIU de
`EstornosAdminRoute` para `plataforma/_lib/errors.ts` — era código de uma tela
só, e a segunda cópia seria a dívida seguinte. `platformErrorMessage` intacto.

**Gates T3:** tsc 0 · eslint 0 · `vitest run src/routes/plataforma` → 25
arquivos, **171/171**. Falsificação: devolvendo `ultimoErro` para `state.error`
e `mensagemDaRecusa` para o genérico → **7 de 11 vermelhos**.

## T1 — feito

`e963426` — três coisas, na tela que decide dinheiro alheio:

1. **Isolamento por ramo.** O fan-out virou `allSettled` nos dois níveis
   (tenants → eventos). Ramo que falha vira contagem; o resto renderiza.
2. **`criadoEm` corrompido não estoura o sort.** `millisDoCriadoEm` (pura,
   exportada) devolve 0 para o que não sabe dizer as horas; a linha vai para o
   fim e continua visível.
3. **Teto declarado (item 52).** `TETO_TENANTS_FILA_ADMIN` (100) e
   `TETO_EVENTOS_POR_TENANT_FILA_ADMIN` (50) viraram constantes com nome,
   passadas explicitamente aos leitores; a fila diz o que não está mostrando,
   inclusive com a lista vazia.

**Contrato mudou:** `useFilaEstornos` devolve `FilaEstornosAdmin`
(`{ itens, ramosComFalha, tenantsNoTeto, tenantsComEventosNoTeto }`), não um
array. `EstornosFilaView` recebe `fila`, não `itens`.

**Reaproveitado:** `listTenants` / `listarEventosDoTenant` / `listReembolsos`
(api-client, com os tetos agora explícitos), `formatData` (já tinha guarda),
o padrão de banner de aviso do `InscritosView` (tokens do DS).
**Criado:** `millisDoCriadoEm`, `avisosDaFila`, `FilaEstornosAdmin`,
`estornosFilaAdmin.test.ts`.

**Gates T1 (literais):**
- `npx tsc --noEmit` (apps/painel) → exit 0
- `npx eslint --max-warnings 0 apps/painel/src/lib/query apps/painel/src/routes/plataforma/estornos` → exit 0
- `npx vitest run src/routes/plataforma src/lib/query` → 27 arquivos, **182/182**, exit 0
- **Falsificação:** revertendo `allSettled`→`all` e `millisDoCriadoEm`→`.toMillis()`
  cru, **6 dos 8** casos novos ficam vermelhos. Restaurado e re-verde.

## Disciplina respeitada

Preview do dono intocado (5273/8180/3000). Sem navegador, sem rede real, sem
push. `ASAAS_API_KEY` não tocada.

## T4 — feito

`030ade3`. RN-379/380 ganharam a frase: o estorno do retardatário devolve
TUDO, taxa inclusa, fora da régua da RN-374 — não houve serviço, então reter
seria cobrar por nada. Escrita no canon (E09) e no delta da rodada. Item 15:
`MAX_QTD_TRANSICAO_APROVISIONAMENTO` de 1.000.000 para 999.999, com o número
cravado em teste ao lado da constante (mudar as duas juntas passaria calado).
Comentário do V4 em `requestRepasse.integration.test.ts` atualizado: ele
prometia ficar vermelho se a Caixa passasse a exibir `min(...)`; a decisão foi
tomada e o teste segue verde com razão, porque prova o servidor.

Boards: card novo em Feito no kanban com cinco histórias (S025-S029) e as
tarefas em checklist; o card da ESTORNO-ADMIN ganhou o veredito da review.
Checklist com a seção POLIMENTO 2026-07-28 (nove tasks, gates literais,
números da falsificação). Painel de decisões: itens 49, 50, 52 e 53 saem do
menu e viram linha em resolvidas, no MESMO arquivo canônico.

`git pull --rebase`: 0 commits atrás de `origin/main`, nada a integrar.

**Gates T4:** functions `tsc` 0 · `eslint` 0 · `npm run build` 0 · emulador
`npx firebase-tools@13 emulators:exec --project demo-leela --only
firestore,auth` sobre `aprovisionamentoAtivacao.review` +
`requestRepasse.integration` → **45/45**, exit 0.

## Gate final da lane

- `apps/painel` `npx tsc --noEmit` → exit 0
- `functions` `npx tsc --noEmit` → exit 0
- `npx eslint --max-warnings 0` (tudo que a lane tocou) → exit 0
- `npx vitest run src/routes/eventos src/routes/plataforma src/lib/query` →
  104 arquivos, **918/918**, exit 0
- Emulador (functions) → **45/45**, exit 0
- Preview do dono: 3000, 5273 e 8180 seguem LISTENING — nada derrubado.

## O que fica para review

1. **Custo do fan-out** cresceu: +1 leitura de política por evento COM
   pendência e +1 de pedido por linha `em_analise`. As Rules já liberam as
   duas ao `platform_admin`, e a fila é de trabalho pendente (pequena), mas o
   número não foi medido contra volume real.
2. **A composição da devolução na tela** é provada contra os primitivos do
   core, não contra o servidor rodando: se o `estornarInscricaoCore` mudar a
   ordem da composição, os dois lados divergem sem nada ficar vermelho.
3. **Paginação da fila admin** continua não existindo — o teto virou aviso,
   como o default do item 52 manda. Card da próxima leva.
4. **`aprovado`/`aprovado_auto` na coluna do valor** seguem exibindo o valor
   pago, declarado como tal. O líquido real desses está no ledger do servidor,
   sem Rule de cliente — mostrá-lo exigiria superfície nova.
