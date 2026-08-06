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
| `02-rodadas/` | Uma pasta por rodada de trabalho (`<data>-<slug>/`). 17 rodadas; a mais recente é `2026-08-02-retomada/`. A convenção **como é praticada** está em [[onboarding-externo]] §4 |
| `03-canon/` | Fonte da verdade durável: `epics/` (um por épico) + `adr/` (decisões de arquitetura) |
| `04-engenharia/` | Qualidade transversal: [[convencoes-codigo]], [[definition-of-done]], [[estrategia-testes]], [[modelo-de-dados-firestore]], [[governanca-design]], [[00-TEMPLATE-spec]], [[o-que-so-a-producao-cobra]] |
| `05-discovery/` | Pesquisa e validação: benchmarks, parecer do conselho, gaps |
| `06-backlog/` | [[BACKLOG]] (visão Jira Dataview) + `backlog/` (uma nota por story) |
| `99-arquivo/` | Histórico congelado: [[MODELO-ROADMAP]], planos `next-trail/` e `next-trail-onda3/`, [[KICKOFF-BUILD]], [[IMPLEMENTATION-PLAN]], [[SETUP]], [[handoff-claude-design]] |

> Como nasce uma rodada nova: sempre em `02-rodadas/<data>-<slug>/`, com a espinha `01-decisoes` → `02-rns-delta` → `03-fila-codigo`. O número do arquivo é ordem de leitura da pasta, não significado fixo. **RN nova consolida no épico (`03-canon/epics/`) na aterrissagem; a rodada guarda só o delta.** O esquema `00-review` → `05-rns-delta`, descrito em [[CONVENCAO-BOARDS]], foi seguido por uma única rodada e está abandonado desde 19/07; a convenção real está em [[onboarding-externo]] §4.

## Para quem chega de fora (validação externa)

Trilha completa para quem nunca viu o projeto e vai conferir o que foi construído. Começa em [[onboarding-externo]], que ordena as outras.

- [[onboarding-externo]] — o que a Leela é, a convenção das rodadas e a ordem de leitura
- [[arquitetura-do-sistema]] — apps, pacotes, functions, deploy e a fronteira do dinheiro
- [[indice-de-regras-de-negocio]] — onde mora cada faixa de RN, e os três conflitos conhecidos
- [[como-verificar]] — subir o projeto, rodar os gates, e o alcance de cada um
- [[laudo-testes-2026-08-04]] — o que os gates não provam, medido
- [[o-que-so-a-producao-cobra]] — a família de defeitos que só aparece no ar, e a conferência de prontidão que roda antes de cada deploy
- [[estado-real]] — o que está no ar, o que está fora do ar, e a dívida conhecida
- [[catalogo-de-emails]] — os oito e-mails, com gatilho, destinatário e onde se mexe
- [[fluxo-pos-pagamento]] — o caminho depois do pagamento, com o estado real de cada elo e o incidente de 04/08

## 🧭 Modelo do roadmap (leia primeiro)
- [[MODELO-ROADMAP]] — **terminologia única + hierarquia canônica** (Onda → Épico → User Story → Task). Reconcilia "Wave/Onda/Épico" num modelo só. Se um termo confundir, este doc vence.

## 🗂️ Acompanhamento (fonte da verdade)
- [[BACKLOG]] — visão Jira (Épico → Story → Subtarefa) com progresso ao vivo (requer Dataview). 99 fichas de story em `backlog/`.
- [[DECISOES-ABERTAS]] — painel ÚNICO do que depende de você. Abre com um menu em linguagem direta de tudo o que está aberto (decisões, ações externas, dívida técnica pré-go-live e fila de construção), com exemplo curto por item e o detalhe logo abaixo pelo mesmo número. Item resolvido sai do painel na mesma aterrissagem: vira uma linha de referência, e o verbatim integral passa a viver no arquivo da rodada em `02-rodadas/`.

## ▶ Comece aqui — o que construir primeiro
- [[como-verificar]] — **subir o projeto e rodar os gates hoje**. Substitui na prática o [[SETUP]], que é de campo limpo e vive no arquivo
- [[IMPLEMENTATION-PLAN]] · [[SETUP]] — ⚠️ **arquivados** em `99-arquivo/`, escritos antes da Onda 0. Valem como histórico, não como instrução
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

> 20 épicos (E00–E19) · 10 ADRs · 17 rodadas · 256 regras de negócio. O [[README]] ainda traz a contagem antiga de 14 épicos e uma lista de decisões em aberto já resolvidas; até ele ser revisto, este arquivo e [[BOARD-EPICOS]] são a contagem corrente.
