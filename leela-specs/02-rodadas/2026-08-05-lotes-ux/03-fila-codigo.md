---
tags: [leela, fila, rodada, lotes, janela, estouro, preco, fila-tecnica]
trace: leela-pixreal-diag-20260804
lote: SEAL-LOTES
data: 2026-08-05
---

# 03-fila-codigo · a janela que falta, o estouro que ninguém via e a fila técnica

> Três frentes. Regras em `02-rns-delta.md`, canônicas em [[LEELA-E04-config-vendas]]; o relato
> das lanes em `01-achados-dono.md`.
>
> **A marca ⚔ está onde a tarefa toca dinheiro cotado ou o contador de vagas.** São quatro das
> nove. Nenhuma delas sobe sem review antagonista em contexto fresco.
>
> **Nada desta rodada está no ar.** Os oito commits da BUILD-LOTES-UX e da REV-LOTES vivem no
> repositório e esperam deploy do painel. A fila abaixo é o que ainda **não** foi construído.

## Frente 1 · a janela do lote vendido (E04 · S315, RN-497)

O que o dono pediu e não recebeu. Sobe primeiro porque é dele e porque as duas tarefas são
pequenas depois de a regra estar selada.

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 1a | `S315-T1` | A janela de lote vendido deixa de ser imutável (RN-497): `inicioEm` e `fimEm` saem da lista de `loteComercialImutavelSeVendido`, e a escrita passa pela Function auditada, no molde da RN-304 — motivo obrigatório, trilha em `auditoriaAcessos`, invariante de não sobreposição checada no servidor antes de gravar | `firestore.rules`, `functions/src/eventos/` | — | opus | ⚔ |
| 1b | `S315-T2` | O editor para de mentir que a janela aguarda selo (RN-497): os campos de início e fim deixam de nascer `disabled` em lote vendido, o `MSG_LOTE_VENDIDO` passa a listar só preço, ordem e modalidade, e o `CAMPOS_CONGELADOS_APOS_VENDA` — hoje export morto (LOW-1 da review) — vira o espelho consultado ou é apagado | `apps/painel/src/routes/eventos/lotes/**` | 1a | sonnet | — |

**A forma da 1a é decisão de engenharia e está tomada, com o custo declarado.** A alternativa
barata é afrouxar a Rule e deixar o cliente gravar direto, como ele já faz em lote sem venda. Ela
foi recusada por um motivo medido: a invariante de não sobreposição da RN-300 **não é checada
pela Rule** — `shapeLoteValido` exige apenas `fimEm > inicioEm`, e quem valida a sequência inteira
é `validarLotesModalidade`, que roda no cliente. Numa lote sem venda isso é dívida antiga e
tolerada. Num lote vendido a janela decide **quando o preço vira**, e portanto qual preço o
próximo comprador paga: é dinheiro, e dinheiro não fica atrás de uma validação que mora na tela.
A Function reusa três coisas que já existem, então o custo real é de fiação: a coleção de
auditoria, o motivo obrigatório de 3 a 500 caracteres e o kernel de validação.

## Frente 2 · o estouro deixa de ser silencioso (E04 · S315, RN-498)

A correção mínima do achado que a review registrou sem fix por estar fora do território dela. Ela
entra **independentemente** do que o dono responder no **ESTOURO-1**: hoje o estouro acontece sem
que ninguém saiba, e essa parte não é escolha.

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 2a | `S315-T3` | O estouro vira dado (RN-498): `ResultadoVirarLote` passa a expor os lotes com `vendidos > quantidadeLimite`, e a Function loga `lote_excedido` com evento, lote, vendidos e limite. O ingresso pago **não** é recusado, e `vendidos` continua monotônico | `functions/src/eventos/virarLote.ts` | — | opus | ⚔ |
| 2b | `S315-T4` | O painel para de exibir "0 disponíveis" sobre lote estourado (RN-498): `ContagemVagas` e a coluna de vagas da `LotesView` passam a dizer "N acima do configurado", e o clamp em zero de `capacidadeDoLote` deixa de esconder o estado | `apps/painel/src/routes/eventos/lotes/**`, `packages/core/src/eventos/capacidadeLote.ts` | 2a | sonnet | — |

**O que fica de fora desta frente, de propósito:** a reserva de vaga no checkout. Ela fecha a
venda dupla na origem, é o default que o maestro propôs ao dono, e é mudança de modelo com custo
próprio — inclusive um cron novo, porque `expirarPixPendente` é callable de cliente e não tem
varredura. O detalhe está em [[DECISOES-ABERTAS]] §ESTOURO-1. Se o dono escolher a reserva, ela
vira frente própria e não reordena esta.

## Frente 3 · a fila técnica (os achados de baixa severidade da review)

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 3a | `S315-T5` | **`parsePrecoReais` devolve R$ 1,23 para "1.234,56"** (LOW-2, pré-existente): `replace(',', '.')` troca só a **primeira** vírgula, então `'1.234,56'` vira `'1.234.56'` e o `parseFloat` para no primeiro ponto. O mesmo padrão está em **oito** arquivos do painel, todos com dinheiro: lote, kit, cupom, afiliado, repasse, assessoria, parceria e solicitação de repasse. O conserto é um só e é normalizar milhar antes da vírgula decimal, com o caso do dono no teste | `apps/painel/src/routes/**/_lib/**` e os quatro componentes que parseiam inline | — | opus | ⚔ |
| 3b | `S315-T6` | Os campos de data do lote ganham `aria-invalid` e `aria-describedby` (LOW-3): o comentário do `LoteModal` afirma que vêm do primitivo `Input`, e isso é verdade para nome, ordem, vaga e preço e **falso** para início e fim, que renderizam um `<span role="alert">` solto — que é justo onde a mensagem nova da frente B aterrissa. Pede prop novo no `DatePicker` do design system | `packages/design-system/src/components/DatePicker/**`, `apps/painel/.../lotes/**` | — | sonnet | — |
| 3c | `S315-T7` | O `LoteModal` para de resetar o formulário quando `lotesDoEvento` muda de identidade (LOW-4): a dependência do `useEffect` compara referência, e hoje só não morde por causa do `staleTime` e do structural sharing do TanStack Query. Digitação perdida por refetch é defeito que aparece em produção e nunca em teste | `apps/painel/src/routes/eventos/lotes/LoteModal.tsx` | — | sonnet | — |
| 3d | `S315-T8` | A recusa por venda concorrente ganha texto próprio (LOW-5): quando uma venda confirma entre a leitura e o clique, o callable recusa correto e o toast diz genérico. O conserto é dizer o que houve e que repetir resolve | `apps/painel/src/routes/eventos/lotes/CapacidadeModal.tsx` | — | sonnet | — |
| 3e | `S315-T9` | A mensagem de sobreposição pré-existente para de acusar o lote errado (dívida registrada pela review): quando dois irmãos já se sobrepõem entre si, criar qualquer lote novo é recusado com a mensagem genérica do kernel, porque a janela projetada não é a culpada. Comportamento anterior à lane | `apps/painel/src/routes/eventos/lotes/_lib/loteForm.ts` | — | sonnet | — |

## Critério de aceite por tarefa

**1a · a janela.** Um lote com `vendidos > 0` aceita um `fimEm` novo que não pisa em irmão e
recusa um que pisa, com a recusa provada **na Function e nas Rules**, nunca por tela. Alterar
`preco`, `ordem` ou `modalidade` no mesmo gesto continua negado com `permission-denied`, provado
por ataque na suíte de Rules. A trilha de auditoria carrega quem, quando, de → para e motivo, no
mesmo formato do ajuste de capacidade. Falsificação: devolver `inicioEm` e `fimEm` à lista da
Rule tem de deixar o caso vermelho.

**1b · o texto.** Uma varredura por "pendente de selo" sobre `apps/painel` devolve zero. O campo
de janela de um lote vendido está habilitado, e o de preço continua cinza com a nota certa.

**2a · o estouro medido.** Um lote de 20 com 21 inscritos confirmados produz a linha
`lote_excedido` com os quatro campos e aparece no resultado da virada. O ingresso do vigésimo
primeiro **não** é recusado, cancelado nem estornado por este caminho — é o teste que não pode
faltar, porque a correção errada aqui é tomar dinheiro sem entregar.

**2b · a tela honesta.** Um lote com 21 vendidos e 20 configurados exibe "1 acima do configurado"
e **nunca** "0 disponíveis". Um lote com 20 vendidos e 20 configurados continua exibindo "0
disponíveis", que é o estado normal de esgotado e não pode virar alarme.

**3a · o dinheiro.** `parsePrecoReais('1.234,56')` devolve `1234.56`. A varredura dos oito call
sites devolve zero ocorrências de `replace(',', '.')` sobre string de dinheiro. Os casos que já
existem (`'99,90'`, `'99.90'`, `'120'`, `'99,999'` arredondando para 100, negativo e texto
devolvendo `null`) continuam passando byte a byte.

## O que não depende de decisão do dono

**Nada desta fila está retido.** O **ESTOURO-1** é decisão dele, e ela decide se além do aviso a
vaga passa a ser reservada — a frente 2 sobe inteira sem essa resposta. A frente 1 executa a
RN-497, que é o pedido dele já declarado. A frente 3 é dívida técnica medida.

## Ordem executável

Frente 1 em sequência (1a e depois 1b), porque a tela só pode habilitar o campo depois de a Rule
aceitar a escrita. Frente 2 em sequência pela mesma razão (2b depende do dado de 2a). As duas
frentes são independentes entre si e podem correr em paralelo, com o cuidado de que **1a e 2a
tocam o mesmo território de servidor** e não devem compartilhar worktree — a lição de coordenação
está no handoff da BUILD-LOTES-UX. A frente 3 é toda paralela, com a 3a indo primeiro por ser a
única de dinheiro.
