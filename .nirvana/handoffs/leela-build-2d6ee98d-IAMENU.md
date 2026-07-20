# Handoff · lane IA-MENU (trace leela-build-2d6ee98d)

- **Employee:** sf-cto (software-forge) · rota opus, effort xhigh
- **Natureza:** lane de **spec**. Zero código de produto.
- **Preview local do Vitor:** painel `:5273`, emulador `8180/9198` — **não tocados** em nenhum momento.
- **Estado:** ✅ **CONCLUÍDA**. Três entregas, três commits, três pushes.

## Placar

| # | Entrega | Paths | Commit | Push |
|---|---|---|---|---|
| 1 | Rodada `2026-07-19-ia-menu` (00-decisao · 01-mapa-de-para · 02-fila-codigo) | `leela-specs/02-rodadas/2026-07-19-ia-menu/` | `7ff13ff` | ✅ |
| 2 | Épicos consolidados in-place: E01, E03, E04, E09, E11, E19 | `leela-specs/03-canon/epics/` | `d205308` | ✅ |
| 3 | Card no kanban + linhas do BOARD-EPICOS | `leela-specs/00-boards/` | `e6b1232` | ✅ |
| 4 | Report da lane | `outputs/leela-build-2d6ee98d/IA-MENU-REPORT.md` | (junto do handoff) | — |

## O que foi decidido

Menu de **8 para 6 áreas**. Nasce **CRM** (Visão geral · Clientes · Comunicação); **Repasses** viram subdivisão de **Eventos** (por origem); o evento ganha a aba **Caixa** com o repasse dele; **Financeiro** e **Analytics** morrem como itens; **Configurações** deixa de ser inerte e hospeda os dados de recebimento. Nenhuma URL antiga quebra.

## RNs novas

| RN | Dono | O que crava |
|---|---|---|
| RN-233 | E01 | menu de 6 áreas; item sem rota é proibido |
| RN-234 | E01 | rota antiga nunca quebra (4 redirects, um teste cada) |
| RN-235 | E03 | aba **Caixa** do evento + linha de repasse daquele evento |
| RN-366 | E09 | repasse pertence à origem; dados bancários do titular; saldo único |
| RN-823 | E11 | a análise de vendas é CRM › Visão geral (supersede parte da RN-821) |

## Decisões do Vitor incorporadas (2026-07-19, mesma noite)

Os três pontos que iriam voltar como pergunta foram ratificados antes do fechamento. **Nada desta lane fica pendente de decisão dele.**

1. dados bancários uma vez só em Configurações; saque na origem; saldo único (RN-334/RN-346 intactas);
2. repasse individualizado por evento — **reconciliado com RN-349/RN-358, que já são lei e já estão construídas**; o delta é de navegação;
3. consolidado na visão macro de Eventos, sem lugar novo;
4. redirects delegados à lane — padrão simples, um teste por linha do mapa.

## Fila de execução deixada pronta

`IAM-T1` (sonnet) · `IAM-T2` ⚔ · `IAM-T3` ⚔ · `IAM-T4` ⚔ · `IAM-T5` ⚔ · `IAM-T6` (sonnet) · `IAM-T7` ⚔ — cinco em opus xhigh com review antagonista. Grafo, territórios, conflito de território entre T2/T4 e gates por tarefa em `leela-specs/02-rodadas/2026-07-19-ia-menu/02-fila-codigo.md`.

**Ordem entre lotes:** `IAM-T2` é pré-requisito das tarefas de tela do E11 (`S821-T2`, `S822-T2`, `S823-T1`) — despachá-las antes significa escrever num diretório que vai ser movido.

## Para quem pegar a execução

- Nenhuma task deste lote toca `functions/`, `firestore.rules`, `packages/core` ou `packages/api-client`. Se precisar, saiu do escopo e volta para a spec.
- Gate transversal do lote: a suíte das telas movidas passa **sem asserção reescrita**. Teste que mudou de expectativa = o move alterou comportamento.
- Oito riscos de regressão nomeados no report, §"Riscos de regressão". Os três que mais mordem: ordem de rotas em `/crm`, colisão `/eventos/repasses` × `/eventos/:slug`, e o pré-requisito do saque que deixa de ser garantido por proximidade.
