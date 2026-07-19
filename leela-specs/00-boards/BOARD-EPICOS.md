---
tags: [leela, kanban, epicos, visao-alto-nivel]
aliases: [Board de épicos, Visão de épicos, Onde o produto está]
atualizado: 2026-07-18
---

# 🗺️ Visão de épicos — onde o produto está

> A altura mais alta de zoom: **uma linha por épico**, com o estado e o link para o detalhe. Para o board de histórias (o trabalho em andamento) veja [[V1-KANBAN]]; para a hierarquia dos nomes, [[MODELO-ROADMAP]]; para a convenção de card, [[CONVENCAO-BOARDS]].

**Estados:** ✅ feito · 🔄 em execução · 📋 planejado · 🧊 gelado (adiado de propósito)

## Onde estamos, em quatro linhas

O organizador já **opera** o evento inteiro (inscritos, kits, financeiro, clubes) e já **vende** ponta a ponta (o atleta descobre, se inscreve, paga; o organizador vê a receita, estorna com dignidade e pede o repasse). A rodada atual (Onda 3) fechou as **assessorias parceiras**, o **perfil público link-na-bio** e a robustez financeira; falta o **app do atleta**. Depois vem o **produto web completo** (afiliados, marcas, analytics, CRM) e, por último, a **camada social e heroica** no app.

## Onda 0 · Fundação — ✅ concluída

| Épico | O que entrega | Estado |
|---|---|---|
| [[LEELA-E00-fundacao-tecnica]] | Base técnica: monorepo, Firebase, login, CI | ✅ |
| [[LEELA-E01-design-system]] | Sistema visual temável (brasa/leela) e telas-base | ✅ |
| [[LEELA-E16-plataforma-superadmin]] · S1600 | Isolamento multi-tenant e permissões | ✅ |

## Onda 1 · Operar — ✅ concluída

| Épico | O que entrega | Estado |
|---|---|---|
| [[LEELA-E03-operacao-evento]] | Operar o evento: inscritos, balcão, kits, financeiro | ✅ +R9-C: kit ganhou imagem 1:1 e visão de compra no checkout (RN-227/RN-230 — backend, regras, upload, leitura e dados de demonstração prontos; falta só a edição na tela de kits) |
| [[LEELA-E05-clubs]] | Clubes: membros, desafios, parcerias, comunicados | ✅ |
| [[LEELA-E02-visao-geral]] | Painel de abertura com os números do evento | ✅ |
| [[LEELA-E16-plataforma-superadmin]] · slim | Onboarding de tenant e termos comerciais | ✅ |

## Onda 2 · Vender — ✅ concluída

| Épico | O que entrega | Estado |
|---|---|---|
| [[LEELA-E04-config-vendas]] · slim | Configurar lotes, preços automáticos, cupons, equipe | ✅ |
| [[LEELA-E12-landing]] | Atleta descobre o evento e se inscreve em poucos cliques | ✅ |
| [[LEELA-E09-financeiro-profissional]] · slim | Ver saldo, dados bancários e pedir repasse | ✅ |
| [[LEELA-E07-estados-sistema]] · web | Telas de erro com cara profissional (404/500/403) | ✅ |
| [[LEELA-E06-marketing]] | Falar com o público por campanhas e automações | ✅ |

## Onda 3 · App simples e alavancas — 🔄 em andamento

| Épico | O que entrega | Estado |
|---|---|---|
| [[LEELA-E18-assessorias-parceiras]] | Organizador cadastra assessoria como clube parceiro com desconto | ✅ |
| [[LEELA-E17-perfil-social]] · link-na-bio | Perfil público compartilhável do organizador e do atleta | ✅ |
| [[LEELA-E13-app-atleta]] · slim | App do atleta: descobrir, inscrever, ingresso, clube | 📋 |

## Onda web-complete (H3) · Produto web inteiro — 📋 próxima

Antecipada por decisão de 2026-07-18: fecha o produto web antes do app.

| Épico | O que entrega | Estado |
|---|---|---|
| [[LEELA-E08-influenciador]] | Influenciador tem link próprio e vê as próprias vendas | 🔄 recorte antecipado (R9-E) + **fase 2 comissão entregue** (COMF2: % ou valor fixo, acúmulo na venda, estorno devolve, saldo/extrato, repasse manual registrado); falta painel do promotor + UI de comissão + split (fase 3, decisão aberta) |
| [[LEELA-E10-marcas]] | Gerenciar patrocinadores e marcas num lugar só | 🔄 registro reutilizável + logo 1:1 + autocomplete no painel prontos (R9-E); falta a tela dedicada de marcas |
| [[LEELA-E11-analytics]] | Análise de vendas e público unificada | 🔄 recorte antecipado entregue (R9-B: Análise vira a porta única — Analytics divergente removido —, filtro por evento com Combobox do DS recorta os 4 blocos, RN-821/RN-820 com nota de cobertura honesta); falta cohort 5-em-5 (RN-822) e o restante do épico |
| [[LEELA-E19-crm]] | Conhecer e reter a base de contatos do organizador | 🔄 backend entregue (cliente consolidado cross-evento com LTV, Rules PII fail-closed, readers tipados, gate antagonista LGPD) + **A3 pago** (chave HMAC com pepper secreto, fail-closed — resta só o secret no deploy); falta a aba CRM + hub Clientes & Comunicação (UI) |

## Onda heroica (H2) · Comunidade e social no app — 🧊

| Épico | O que entrega | Estado |
|---|---|---|
| [[LEELA-E13-app-atleta]] · heroica | Jornada heroica: rotina diária com propósito | 🧊 |
| [[LEELA-E17-perfil-social]] · in-app | Feed, eventos e clubs no app, com tema por conta | 🧊 |
| E14 Integrações de treino | Importar treino e corrida do Strava e afins | 🧊 |

## Onda 5 · Expansão — 🧊

| Épico | O que entrega | Estado |
|---|---|---|
| E15 Creator Studio | Criador monta conteúdo e produtos (MyDose) | 🧊 |
