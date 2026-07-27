---
tags: [leela, planning, moc]
aliases: [Leela Specs, Home, MOC]
---

# 🏠 Leela · Home (MOC)

Ponto de entrada do planejamento do **Leela** — ecossistema que unifica ingressos + comunidade/clubs + comunicação + desafios gameficados + controle de vendas. Abra esta nota no Obsidian e navegue pelos `[[wikilinks]]`.

## 🗃️ Estrutura de pastas (reorganizada 2026-07-18)

Só `HOME.md` e `README.md` moram na raiz. O resto está em pastas numeradas por função. Wikilinks resolvem por nome — a pasta é só organização.

| Pasta | O que guarda |
|---|---|
| `00-boards/` | Acompanhamento vivo: [[V1-KANBAN]], [[BOARD-EPICOS]], [[BOARD-HISTORICO]], [[V1-CHECKLIST]], [[CONVENCAO-BOARDS]] |
| `01-produto/` | Visão e decisões: [[ROADMAP]], [[ROADMAP-VISUAL]], `roadmap.html`, [[V1-PRODUTOR-web]], [[DECISOES-ABERTAS]], [[EXPLICACAO-ONDE-ESTAMOS]] |
| `02-rodadas/` | Uma pasta por rodada de trabalho (`<data>-<slug>/`), arquivos numerados `00-review` → `05-rns-delta`. Mais recente: `2026-07-18-ux-review/` |
| `03-canon/` | Fonte da verdade durável: `epics/` (um por épico) + `adr/` (decisões de arquitetura) |
| `04-engenharia/` | Qualidade transversal: [[convencoes-codigo]], [[definition-of-done]], [[estrategia-testes]], [[modelo-de-dados-firestore]], [[governanca-design]], [[00-TEMPLATE-spec]] |
| `05-discovery/` | Pesquisa e validação: benchmarks, parecer do conselho, gaps |
| `06-backlog/` | [[BACKLOG]] (visão Jira Dataview) + `backlog/` (uma nota por story) |
| `99-arquivo/` | Histórico congelado: [[MODELO-ROADMAP]], planos `next-trail/` e `next-trail-onda3/`, [[KICKOFF-BUILD]], [[IMPLEMENTATION-PLAN]], [[SETUP]], [[handoff-claude-design]] |

> Como nasce uma rodada nova: sempre em `02-rodadas/<data>-<slug>/` com arquivos `00-review` (ata) · `01-planning` (lotes/execução) · `02-jtbd` · `03-stories` · `04-tasks` · `05-rns-delta`. **RN nova consolida no épico (`03-canon/epics/`) na aterrissagem; a rodada guarda só o delta.** Detalhe em [[CONVENCAO-BOARDS]].

## 🧭 Modelo do roadmap (leia primeiro)
- [[MODELO-ROADMAP]] — **terminologia única + hierarquia canônica** (Onda → Épico → User Story → Task). Reconcilia "Wave/Onda/Épico" num modelo só. Se um termo confundir, este doc vence.

## 🗂️ Acompanhamento (fonte da verdade)
- [[BACKLOG]] — visão Jira (Épico → Story → Subtarefa) com progresso ao vivo (requer Dataview). 83 stories em `backlog/`.
- [[PENDENCIAS]] — painel de pendências descritas, com exemplo de caso de uso em cada uma (20 itens em 3 grupos); o verbatim das decisões continua em [[DECISOES-ABERTAS]].

## ▶ Comece aqui — o que construir primeiro
- [[IMPLEMENTATION-PLAN]] — **mini PRD + stack + kickoff do Fable 5** (comece por aqui para desenvolver)
- [[SETUP]] — pré-requisitos, contas e chaves (começando do zero, emulator-first)
- [[V1-PRODUTOR-web]] — **fatia V1: produtor (web) + app simples** (tickets, clubs, vendas, landing, comunicação, dashboard). Anti-streak adiado; MyDose/Creator Studio no horizonte.
- [[V1-CHECKLIST]] — **checklist executável** (142 tasks por onda, IDs reais) para o Fable 5 construir a V1

## Visual
- [[ROADMAP-VISUAL]] — Gantt das ondas, grafo de dependências e timeline por horizonte (Mermaid)
- [[V1-KANBAN]] — board Kanban da V1 (requer plugin Kanban)
- `01-produto/roadmap.html` — infográfico operacional (abrir no navegador)

## Fundamentos do plano
- [[README]] — índice + estado + decisões em aberto
- [[ROADMAP]] — visão, stack, horizontes, mapa de épicos, ondas
- [[00-TEMPLATE-spec]] — formato de spec (para o Fable 5)
- [[ADR-stack]] — decisões de arquitetura (Next.js, Firestore, Auth, pagamento plugável)
- [[modelo-de-dados-firestore]] — entidades, N:N, agregados, coleções por épico
- [[definition-of-done]] · [[estrategia-testes]] — qualidade transversal

## Épicos (ordem das ondas)
- Onda 0 · [[LEELA-E00-fundacao-tecnica]] · [[LEELA-E01-design-system]]
- Onda 1 · [[LEELA-E05-clubs]] · [[LEELA-E03-operacao-evento]] · [[LEELA-E02-visao-geral]]
- Onda 2 · [[LEELA-E04-config-vendas]] · [[LEELA-E12-landing]]
- Onda 3 · [[LEELA-E07-estados-sistema]] · [[LEELA-E06-marketing]] · [[LEELA-E09-financeiro-profissional]]
- Onda 3 · 🆕 [[LEELA-E18-assessorias-parceiras]] · 🆕 [[LEELA-E17-perfil-social]] (link-in-bio público)
- Onda 4 · [[LEELA-E13-app-atleta]] · 🆕 [[LEELA-E17-perfil-social]] (Feed·Eventos·Clubs in-app + tema por-usuário)
- Onda 5 · [[LEELA-E08-influenciador]] · [[LEELA-E10-marcas]] · [[LEELA-E11-analytics]]

## Arquitetura & épicos novos
- [[ADR-multitenancy]] — marketplace multi-tenant (fundacional, ADR-009)
- [[LEELA-E16-plataforma-superadmin]] — plataforma & super-admin · E14 Integrações de treino · E15 Creator Studio (specs a caminho)

## Discovery & validação
- [[DISCOVERY]] — MOC da pesquisa de benchmarks
- [[RELATORIO-DISCOVERY]] — relatório executivo (16 recomendações)
- [[PARECER-CONSELHO]] — validação do Conselho Estratégico (Go condicional)

## Contexto (docs de origem)
- Pasta `../be-hero-documentacao/be-hero-docs/` — PRD, USM, JIRA, SPECs, personas, JTBD
- Telas: `../WEB-APPV2 (1)/` (36 telas do protótipo) · Design tema `brasa`

> 14 épicos · 77 user stories · 172 tasks. Ver [[README]] para o quadro completo.
