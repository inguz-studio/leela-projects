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
| [[LEELA-E03-operacao-evento]] | Operar o evento: inscritos, balcão, kits, financeiro | ✅ +TAMANHOS-GRADE: camiseta agora separa corte feminino/masculino e o organizador controla o ciclo encomenda→estoque→entrega por corte e tamanho (RN-231/232 — grade no item, comprador escolhe corte antes do tamanho, encerrar encomendas com a contagem do momento sem travar vendas, entregas acompanhadas no balcão); +R9-C: kit com imagem 1:1 e visão de compra (falta só a edição na tela de kits) |
| [[LEELA-E05-clubs]] | Clubes: membros, desafios, parcerias, comunicados | ✅ |
| [[LEELA-E02-visao-geral]] | Painel de abertura com os números do evento | ✅ |
| [[LEELA-E16-plataforma-superadmin]] · slim | Onboarding de tenant e termos comerciais | ✅ |

## Onda 2 · Vender — ✅ concluída

| Épico | O que entrega | Estado |
|---|---|---|
| [[LEELA-E04-config-vendas]] · slim | Configurar lotes, preços automáticos, cupons, equipe | ✅ |
| [[LEELA-E12-landing]] | Atleta descobre o evento e se inscreve em poucos cliques | ✅ +KIT-IMG (2026-07-19): imagem do kit visível na seção de kits da LP e no checkout, clicável p/ ampliar (lightbox do DS); cascata real→foto mock (preview)→placeholder padrão Leela; SEO-first, 55/55, prova visual :3200 |
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
| [[LEELA-E08-influenciador]] | Influenciador tem link próprio e vê as próprias vendas | 🔄 recorte antecipado (R9-E) + **fase 2 comissão entregue** (COMF2) + **UI de comissão entregue** (CRM-COMISSAO-UI) + **hub do promotor entregue** (PROMOTOR: resumo consolidado cross-eventos + copiar código, por evolução de Minhas afiliações — reuso-primeiro, sem rota nova); falta split automático (fase 3, decisão aberta) + app/superfície dedicada do promotor (Won't nesta fase); copiar URL completa ENTREGUE (TAMANHOS-GRADE T-extra: reader projeta eventoSlug e o botão copia o link pronto) |
| [[LEELA-E10-marcas]] | Gerenciar patrocinadores e marcas num lugar só | 🔄 registro reutilizável + logo 1:1 + autocomplete (R9-E) + tela dedicada `/marcas` no painel entregue (MARCAS-TELA: lista/criar/editar/excluir, rota própria na sidebar); falta a consolidação de ativações (S812) |
| [[LEELA-E11-analytics]] | Análise de vendas e público unificada | 🔄 recorte antecipado entregue (R9-B: Análise vira a porta única — Analytics divergente removido —, filtro por evento com Combobox do DS recorta os 4 blocos, RN-821/RN-820 com nota de cobertura honesta). **RN-822 ENTREGUE (E11-COHORT-BACKEND, 2026-07-19 · `aa0afac`/`fcfeda4`/`ba2f53c`):** vertical coordenada core→functions→api-client→painel — 10 bandas de 5 anos + matriz idade×sexo no agregado + card "Idade × sexo (cohort)" na Análise, com salvaguarda LGPD de k-anonimato (k=5, reader-side pós-soma, `cohortPrivacidade.ts`) e reprocesso idempotente (`reprocessarDemografiaTodosEventos` — deploy da Function e reprocesso andam JUNTOS). Restante segue backend-gated: S821-T1 rollup `analytics/{periodo}` (não existe, só `coletaDiaria`) bloqueia S821-T2/S822/S823 + seletor temporal funcional. Detalhe no épico §"RN-822 ENTREGUE" |
| [[LEELA-E19-crm]] | Conhecer e reter a base de contatos do organizador | 🔄 backend entregue + **A3 pago** (chave HMAC com pepper) + **hub "Clientes & Comunicação" (UI) entregue** (CRM-COMISSAO-UI: item da sidebar ativo, lista cross-evento com LTV/valor/eventos, busca por prefixo, detalhe com histórico + aniversário + idade ao vivo); falta o disparo de comunicação a segmentos (S-R9-13-T4) + secret no deploy |

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
