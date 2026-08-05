# SEAL-LOTES — o selo da BUILD-LOTES-UX e da REV-LOTES

**Lane:** SEAL-LOTES · **Papel:** sf-cto (software-forge)
**Trace:** `leela-pixreal-diag-20260804` · **Data:** 2026-08-05
**Território:** `leela-specs/` apenas. Zero linha de código, zero deploy.
**Selado:** build `fd6e5e69`, `41ac6bbb`, `d4ce8d12`, `1357163a` · review `2a97a592`, `08a09465`,
`c2b19244`, `35c051ef`.

## O que aterrissou

| Onde | O que entrou |
|---|---|
| `leela-specs/02-rodadas/2026-08-05-lotes-ux/01-achados-dono.md` | Os seis achados, o que cada frente entregou com hash, e a lição de método do achado da review |
| `.../02-rns-delta.md` | O delta da RN-200 campo a campo, as RN-497 e RN-498 novas, prova de não colisão |
| `.../03-fila-codigo.md` | Três frentes, nove tarefas, quatro com ⚔, com critério de aceite por tarefa |
| `leela-specs/01-produto/DECISOES-ABERTAS.md` | Item novo **ESTOURO-1**; conferência visual da tela de lotes anexada ao item 69 |
| `leela-specs/03-canon/epics/LEELA-E04-config-vendas.md` | RN-497 e RN-498 canônicas + história S315 |
| `leela-specs/03-canon/epics/LEELA-E03-operacao-evento.md` | Delta da RN-200: enunciado intacto, código é que divergiu |
| `leela-specs/03-canon/indice-de-regras-de-negocio.md` | Faixa 497-498, contagem 256 → 258, próxima faixa livre a partir da 499 |
| `leela-specs/00-boards/V1-KANBAN.md` | Card em 🔄 Em execução, com S315 e as treze linhas de tarefa |
| `leela-specs/00-boards/BOARD-EPICOS.md` | Delta na linha do E04 |
| `leela-specs/00-boards/V1-CHECKLIST.md` | Seção da rodada com as cinco frentes entregues e as nove tarefas da fila |

## O delta da RN-200, em uma frase

**O código é que divergiu da regra, não o pedido do dono.** A RN-200 sempre travou só o preço; a
Rule `loteComercialImutavelSeVendido` congela seis campos, e a extensão nunca teve enunciado —
vivia em comentário `"RN-200/300 (registrado)"`. O dono pediu a RN-200 como ela está escrita.

- `preco` congela (RN-200, intacta).
- `quantidadeLimite` continua fechado à escrita direta e continua aberto pela Function auditada
  (RN-304). **Já entregue** pela BUILD-LOTES-UX, via atalho para a porta que já existia.
- `inicioEm` / `fimEm` **deixam de congelar** (RN-497). Tarefa `S315-T1`, ⚔, porque mexe em
  `firestore.rules`.
- `ordem` e `modalidade` **continuam congelados e agora têm enunciado próprio** (RN-497): ninguém
  pediu, e mexer neles reordena a virada ou órfãna inscrito.

A forma da `S315-T1` está decidida com custo declarado: **Function auditada**, no molde da RN-304,
e não afrouxamento da Rule para escrita direta. Motivo medido: a invariante de não sobreposição da
RN-300 não é checada pela Rule — `shapeLoteValido` exige só `fimEm > inicioEm`, e quem varre a
sequência é `validarLotesModalidade`, que roda no cliente. Num lote vendido a janela decide quando
o preço vira, e portanto qual preço o próximo comprador paga.

## O item novo do painel

**ESTOURO-1 · duas pessoas podem comprar a mesma última vaga, e o painel não avisa.**

Medido: `webhookPagamento` vira o inscrito para `confirmado` sem revalidar lote nem capacidade;
`virarLote` faz `Math.max(vendidosAtual, tally)` sem teto (`virarLote.ts:215`); `capacidadeDoLote`
corta o disponível em zero (`capacidadeLote.ts:43`), então o painel exibe "20 vendidos · 0
disponíveis · 19 no total" sem aviso. Não depende da desativação: bastam duas cobranças PIX em voo
pela última vaga.

Três opções no painel, com o default do maestro registrado **e com o custo que a medição
acrescentou**:

1. **Reservar a vaga** — default proposto. Custo declarado no item: a janela de 15 minutos é a do
   **carrinho**, e ela termina quando a cobrança nasce (`CARRINHO_PRAZO_SEGUNDOS`,
   `carrinhoCheckout.ts:216`). A venda dupla acontece **depois** disso, dentro dos 30 minutos do
   PIX (RN-157). A reserva que resolve tem de viver da cobrança até o PIX pagar ou vencer, e
   `expirarPixPendente` é `https.onCall` **sem cron** — sem varredor, PIX abandonado seguraria a
   vaga para sempre. O padrão existe e é copiável (`expirarCarrinhosAbandonados`, pubsub a cada 5
   minutos, ADR-015), mas é frente própria, não fiação.
2. **Aceitar e avisar** — a correção mínima, que **entra de qualquer forma** (RN-498, tarefas
   `S315-T3` e `S315-T4`).
3. **Bloquear e estornar** — recomendação de **recusar**: o dinheiro entrou e a pessoa fica sem a
   experiência.

## Fila técnica registrada

Cinco achados LOW da review viraram tarefa, e o de dinheiro foi medido além do que a review
reportou: `parsePrecoReais('1.234,56')` devolve **R$ 1,23**, e o mesmo padrão de troca da primeira
vírgula está em **oito** arquivos do painel que tratam dinheiro — lote, kit, cupom, afiliado,
repasse, assessoria, parceria e solicitação de repasse. É `S315-T5`, ⚔.

## Git — commit e push, com a janela conferida duas vezes

**A regra de não empurrar trabalho alheio quase mordeu, e vale registrar.** No começo desta lane,
`git log origin/main..HEAD` trazia **quatro commits não publicados que não eram meus**, todos da
REV-LOTES (`2a97a592`, `08a09465`, `c2b19244`, `35c051ef`). Empurrar ali teria publicado trabalho
de outra lane sem o consentimento dela.

Enquanto esta lane escrevia, outra publicou: `origin/main` andou até `bc4f2304` (REV-MOTION), e os
quatro da REV-LOTES entraram junto. Conferido de novo depois do `fetch`, `origin/main..HEAD`
trazia **só o commit desta lane**, sem nada atrás dele. Foi com essa segunda conferência que o
push saiu.

Commits desta lane feitos com `--only` sobre os caminhos de `leela-specs/` mais o handoff, sem
tocar o index de nenhuma outra lane — a REV-5B seguiu com o handoff dela staged e as quatro
modificações de `functions/src/auth` e `functions/src/email` seguiram intactas. Sem `--amend`, sem
`stash`.

**Lição operacional:** num worktree compartilhado, `origin/main..HEAD` é um retrato com validade
de minutos. A conferência que autoriza o push é a que acontece **imediatamente antes dele**, com
`fetch` na frente, e não a do início da lane.

## Três coisas para o maestro

1. **Duas lanes no mesmo worktree destruíram trabalho verde duas vezes.** A BUILD-MOTION usou
   `git commit --amend` e `git stash pop` no `design-system` enquanto a BUILD-LOTES-UX tinha
   edição não commitada lá; a primeira reverteu `SubNav.tsx` para o HEAD, a segunda injetou
   marcadores de conflito nos dois arquivos. Worktree por lane, ou proibição de `amend`/`stash` de
   escopo amplo com lane vizinha em voo.
2. **O `eslint` do design system está vermelho e não é desta rodada.**
   `src/components/Dialog/useDialogBehavior.ts:88` acusa `desempilharDialogo` não usado, sobre 91
   inserções não commitadas da REV-MOTION. Nenhum gate de lint do DS inteiro passa antes de ela
   fechar.
3. **O brief da BUILD-LOTES-UX não foi persistido em `.nirvana/briefs/`.** Cinco dos seis
   verbatins do dono se perderam, e a rodada teve de reconstruí-los pela descrição de quem
   construiu — que é a parte interessada. Está registrado no arquivo da rodada como falha de
   processo, porque o critério de aceite de um achado é a frase de quem o reportou.

## Contagem do painel depois deste selo

| Seção | Itens |
|---|---|
| Decisões que dependem de você | **40** (era 39; entrou o ESTOURO-1) |
| Ações que só você pode executar | 9 |
| Hipótese a validar em campo | 1 |
| Fila de construção | 11 |

Nenhum item saiu nesta rodada.
