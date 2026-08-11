---
tags: [leela, kanban, convencao, legibilidade]
aliases: [Convenção de card, Convenção dos boards, Como escrever um card]
atualizado: 2026-07-18
---

# 📋 Convenção dos boards da Leela

> Existe para que o board responda, de relance, uma pergunta só: **o que vamos fazer?** Se um card precisa de parágrafo para ser entendido, o detalhe está no lugar errado.

## A regra do card

Um card é **uma linha**. Ele diz, em linguagem de produto, o ganho para quem usa. Nada de hash de commit, nome de suíte de teste, sigla de lote ou nota de gate no card. Esse detalhe vive no arquivo linkado.

**Formato:**

```
[E##] Título curto — o que a pessoa ganha  <estado>  [[link para o detalhe]]
```

**Exemplo bom:**

> `[E08] Afiliados — influenciador tem link próprio e vê as próprias vendas  📋  [[LEELA-E08-influenciador]]`

**Exemplo ruim** (o que estamos deixando para trás):

> `LEELA-R6-ASAAS · Ativação SANDBOX do gateway... pré-flight... $aact_hmlg_... commit c0f0646... emulator 8480 12/12... review antagonista APPROVE-COM-FIXES...`

### O que entra e o que sai

| Entra no card | Sai do card (vai para o link) |
|---|---|
| Código do épico ou da história (`E08`, `S1203`) | Hash de commit (`c0f0646`) |
| Título em linguagem de produto | Nome de suíte, contagem de teste (`117/117`) |
| O ganho para a pessoa, em ≤ 12 palavras | Nome de lote técnico (`LEELA-R6`, `Wave A`) |
| O estado (emoji) | Resultado de gate, review antagonista, follow-up |
| Um wikilink para o detalhe | Regra de negócio, ADR, decisão |

- Título em **sentence case** ("Config e vendas", não "Config E Vendas").
- Sem sigla interna além do código do épico ou da história.
- O link aponta para o arquivo do épico (`[[LEELA-E##-...]]`), da história/tarefas, ou para [[BOARD-HISTORICO]] quando o card já foi entregue.

## Os estados

| Emoji | Estado | Quer dizer |
|---|---|---|
| ✅ | Feito | entregue e no ar |
| 🔄 | Em execução | alguém está tocando agora |
| 📋 | Backlog | planejado, ainda não começou |
| 🧊 | Gelado | adiado de propósito (fora da V1 ou onda futura) |
| ⏸️ | Pausado | começou e parou por uma pendência |

## As três altitudes

O acompanhamento tem três alturas de zoom, cada uma num arquivo:

1. **Épicos** — [[BOARD-EPICOS]]: uma linha por épico, o mapa "onde o produto está". Comece por aqui.
2. **Histórias** — [[V1-KANBAN]]: o board vivo, colunas Backlog / Em execução / Feito, cards na convenção acima.
3. **Tarefas** — dentro do arquivo de cada história e em [[V1-CHECKLIST]]. Tarefa é detalhe de execução; **não** aparece no kanban.

A hierarquia canônica dos nomes (Onda → Épico → História → Tarefa) mora em [[MODELO-ROADMAP]].

Acima das três, e feita para leitura e não para operação, está a [[VISAO-DE-PROJETO]]: as três alturas juntas numa página só, com o que está travado em quem e as próximas entregas de cada frente. Ela se atualiza na aterrissagem, junto do kanban e do épico.

## Como nasce uma rodada nova (convenção de pastas)

Reorganização de 2026-07-18: `leela-specs/` tem só `HOME.md` e `README.md` na raiz; o resto vive em pastas numeradas por função (mapa completo em [[HOME]]). Duas regras valem para toda rodada de trabalho daqui em diante:

1. **Toda rodada nasce em `02-rodadas/<data>-<slug>/`** (ex.: `2026-07-18-ux-review/`), com os arquivos **numerados 00-05**:

   | Arquivo | O que guarda |
   |---|---|
   | `00-review.md` | a ata — o pedido do cliente/Vitor na íntegra (verbatim), reconstruída do audit |
   | `01-planning.md` | os lotes, quem executou, modelo, gates e o placar final |
   | `02-jtbd.md` | matriz story → JTBD |
   | `03-stories.md` | user stories com ACs |
   | `04-tasks.md` | quebra 1-task-1-PR |
   | `05-rns-delta.md` | **só o delta** de RNs da rodada |

2. **RN nova SEMPRE consolida no épico na aterrissagem.** A regra de negócio canônica mora em `03-canon/epics/` (a seção "Regras de negócio novas" do épico); a rodada guarda apenas o **delta** em `05-rns-delta.md`, apontando para o épico. Ponta solta de RN vira atualização do épico na MESMA aterrissagem — nunca fica só no delta da rodada. (Par da regra de boards: o épico é atualizado junto do kanban.)

## Onde foi parar o detalhe antigo

Cada entrega já concluída tem seu relatório completo em `outputs/leela-build-2d6ee98d/*-REPORT.md`. O texto integral dos cards antigos (antes desta convenção) está preservado, sem cortes, em [[BOARD-HISTORICO]]. Nada foi apagado; foi realocado.
