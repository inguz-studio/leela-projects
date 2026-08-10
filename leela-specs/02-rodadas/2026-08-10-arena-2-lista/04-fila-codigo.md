---
tags: [leela, fila, rodada, arena, pilares, modalidades, interesses]
trace: leela-arena-2-20260810
lote: SPEC-ARENA-2-LISTA
data: 2026-08-10
---

# 04-fila de código · o que sobe, em que ordem, e o que segura cada peça

> Nada aqui sobe sem a spec ter passado. A fila **não compete com a S1226**: a seção da Arena
> continua sendo daquela história; a S1245 entrega o **contrato da lista** que a S1226-T2 vai
> consumir. Territórios declarados; a regra de nunca usar `amend`/`stash` em árvore compartilhada
> continua valendo.

## O que segura a fila antes da primeira linha

| Peça | Espera |
|---|---|
| `S1245-T1` (derivação no core) | nada de veto — é contrato puro; a lista integral deriva das fontes e o corte do dono é ajuste declarativo em cima |
| `S1245-T2` (a lista exposta com o corte) | **ARENA-4** — nenhuma tela de interesses nasce antes do corte |
| `S1245-T3` (órfão declarado) | nada — nasce junto da T1, o comportamento é do contrato |
| A seção da Arena em si | continua sendo a **S1226** (modelo+Rules, seção, consentimento), com os gates dela — esta fila não a absorve |

**Fronteira dura, herdada da decisão:** nenhuma tarefa desta fila toca visibilidade, Rules de
leitura por terceiro, radar (E20) ou agregados de desafio. Se uma implementação precisar disso,
ela está errada — volta à spec.

## As tarefas, com território

| # | Tarefa | História | Território | Gate |
|---|---|---|---|---|
| 1 | Derivação pura no core: pilares + termos das duas fontes, ordem de declaração, ids canônicos; rótulos de pilar sobem do painel para o core (`ROTULO_PILAR`) e o painel passa a importar | `S1245-T1` | `packages/core/src/clubs/`, `apps/painel/src/routes/clubes/engajamento/_lib/` (só o import) | teste compara derivação contra `CATALOGO_ACOES`/`MODALIDADES_CLUBE` elemento a elemento; remover termo da fonte derruba o teste que o afirmava; suíte do painel intacta |
| 2 | Lista exposta com o corte do dono (fusões e rótulos da resposta ARENA-4), mapeando rótulo → id canônico | `S1245-T2` | `packages/core/src/clubs/` (o mapa), consumo na seção da S1226-T2 | ARENA-4 respondido; nenhum id duplicado por interesse; gate de voz nos rótulos |
| 3 | Órfão declarado: render sem o termo, save persiste só vocabulário vigente, nenhum processo escreve no doc | `S1245-T3` | junto da S1226-T2 (a seção) | teste com doc contendo id morto; prova de ausência de writer |

Sem ⚔ nesta fila: nenhuma tarefa toca dinheiro, claim ou dado sensível — o campo do art. 11 é da
S1226-T1/T3 e continua com a rota e a review de lá.

## Consertos pequenos que a medição achou, sem carona em decisão

| # | O quê | Onde | Por quê |
|---|---|---|---|
| P1 | `ROTULO_PILAR` duplicável: hoje vive só no painel e a Arena precisaria dos mesmos rótulos | `apps/painel/src/routes/clubes/engajamento/_lib/engajamento.ts:31-35` | já absorvido pela tarefa 1 — registrado para ninguém resolver duas vezes |
| P2 | A frase da RN-471 "a lista dos pilares não existe em doc nenhum" envelheceu | `03-canon/epics/LEELA-E12-landing.md` §RN-471 | marcada nesta aterrissagem apontando para a RN-553 — sem isso a próxima lane rediscute o que já fechou |

## O que esta fila NÃO contém, de propósito

- O modelo e as Rules do doc da Arena — **S1226-T1**, com o carimbo de consentimento e a rota ⚔
  de lá.
- A seção da Arena na área do cliente — **S1226-T2**; a T2 desta fila só entrega a lista que ela
  consome.
- Qualquer coisa de visibilidade, conexão ou exposição social — **ARENA-1 / LGPD-1**, fora desta
  rodada por decisão.
- A categorização da home — a lista fica **pronta para consumo** (RN-556); a home é do dono
  (D-0802-1) e nenhuma tarefa mexe nela.
- Qualquer mudança em `firestore.rules` — esta rodada não abre nada.
