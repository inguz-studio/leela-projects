---
tags: [leela, decisoes, fila, rodada, formulario, templates]
trace: leela-build-2d6ee98d
lote: SPECS-0728
data: 2026-07-28
supersede: 02-rodadas/2026-07-19-formbuilder-analise/03-fila-codigo.md
---

# 03-fila-codigo · Lote FORMBUILDER revisado (biblioteca de templates)

> Substitui a fila de 2026-07-19 no que toca à superfície do builder. A fila antiga
> continua correta em corte de v1, tetos, fence de obrigatoriedade, gravação da resposta e
> export; ela errava só o endereço do construtor, que a DEC-0728B mudou.

## O que mudou em relação à fila de 19/07

| Item da fila antiga | O que acontece agora |
|---|---|
| (1) Core e modelo em `packages/core/src/forms/` | **Fica**, com um acréscimo: o modelo passa a ter template, versão e estado de ciclo de vida (RN-390, RN-392). |
| (2) Subcoleção de formulário sob o evento e sob o clube | **Cai.** O formulário vive na biblioteca do profissional; evento e clube guardam referência e versão. |
| (3) Builder na config do evento (S310-T2) e na do clube (S112-T1) | **Vira** biblioteca própria com rota no menu principal, mais um seletor na config de cada superfície. |
| (4) Render na compra (S1212) | **Fica**, lendo a versão vinculada em vez da subcoleção do evento. |
| (5) Render no clube (S112-T2) | **Fica**, mesma troca de origem. |
| (6) Leitura e export | **Fica**, inteiro. |

## Fila

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 1 | `S310-T1` | Core e modelo: `Formulario`, `Pergunta` com os três tipos do v1, `opcoes`, `obrigatoria`, tetos como constante única (RN-187), **versão publicada e estado de ciclo de vida** (RN-390, RN-392), helper de carimbo (RN-188). Modelo Firestore da biblioteca `profissionais/{profId}/formularios/{id}` com subcoleção de versões, mais Rules fail-closed. | `packages/core/src/forms`, `firestore.rules` | — | opus | ⚔ |
| 2 | `S313-T1` | Item novo do menu principal e rota da biblioteca: catálogo do design system de seis para sete, com stories, `docs.mdx`, `LLM.txt` e a suíte do Sidebar reconciliados no mesmo lote (RN-389, invariantes da RN-233). | `packages/design-system`, `apps/painel/src/app` | 1 | opus | — |
| 3 | `S313-T2` | Biblioteca: lista de templates com busca, contador e estado vazio; criar, editar, duplicar; publicar versão; arquivar; excluir só sem vínculo (RN-392). Permissão pela RN-391. | `apps/painel/src/routes/formularios` | 2 | opus | — |
| 4 | `S310-T2` | Seletor de template na configuração do evento, com a versão vinculada visível e o aviso de versão mais nova disponível (RN-390). | `apps/painel/src/routes/eventos/**` config | 3 | opus | — |
| 5 | `S112-T1` | Seletor de template na configuração do clube, mesmo componente do item 4. | `apps/painel/src/routes/clubes/**` config | 3 | opus | — |
| 6 | `S1212-T1` | Gravação da resposta no inscrito na transação da confirmação, carimbando template e versão (RN-185, RN-188). | `functions/src/checkout` | 1 | opus | ⚔ |
| 7 | `S1212-T2` | Render das perguntas no checkout e gate de obrigatoriedade no fence dos aceites (RN-186). | `apps/painel` checkout, `functions` fence | 6 | opus | ⚔ |
| 8 | `S112-T2` | Render na inscrição de clube e gravação da resposta no membro, com o mesmo gate (RN-185, RN-186). | `apps/painel/src/routes/clubes/**`, `functions` | 6 | opus | — |
| 9 | `S310-T3` | Resposta como coluna do inscrito e do membro na lista e no export que já existem (RN-189). | listas e export existentes | 6, 8 | opus | — |

## Ordem e paralelismo

1. O item 1 é a fundação de todos os outros. Nada começa antes dele.
2. Itens 2 e 3 formam a trilha da biblioteca; itens 4 e 5 dependem dela e são disjuntos
   entre si, então correm juntos.
3. O item 6 é disjunto da trilha de biblioteca e pode correr em paralelo assim que o item
   1 aterrissar.
4. O item 7 toca a árvore do checkout. O bloco A da tela de checkout (S1209) já
   aterrissou, então a serialização que a fila de 19/07 pedia contra a exibição de taxa
   está paga. A fronteira viva agora é outra: a lane do pacote de estorno e a lane de
   ingressos com QR também escrevem em `functions/src/checkout`. **Serializar por lane,
   não por task.**

## Fronteira com o restante do repo

- **`firestore.rules`** — o item 1 acrescenta bloco novo. Regra operacional de sempre:
  quem aterrissa depois faz rebase e acrescenta, nunca sobrescreve.
- **`packages/design-system`** — o item 2 mexe no catálogo do menu, que é território
  compartilhado com qualquer lane de navegação. Há uma divergência já conhecida e ainda
  aberta na `IconsPage.tsx` do showcase, que descreve oito ícones; ela deve ser corrigida
  neste mesmo item, ou o catálogo volta a mentir.
- **Checkout** — território disputado. Ver o ponto 4 acima.

## Não-cards

- **Anexo de arquivo** — fase 2, sem elaboração.
- **Resposta no CRM** — o CRM não agrega respostas por default (P-FB-4). Incluir exige
  decisão explícita do Vitor.
- **Migração de formulários existentes** — não existe. O construtor nunca foi construído,
  então não há dado sob evento ou clube para mover (P-FBT-3).
