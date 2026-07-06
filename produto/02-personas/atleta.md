---
tags: [leela, produto, persona, atleta]
fontes:
  - "[[be-hero-documentacao/be-hero-docs/personas|personas (Bíblia Be Hero)]]"
  - "[[RELATORIO-DISCOVERY]]"
  - "[[LEELA-E13-app-atleta]]"
  - "[[decisoes-escopo-2026-07-04]]"
atualizado: 2026-07-05
---

# Persona · atleta

Quem usa o app. Na V1 é um papel transacional (descobrir, comprar, mostrar QR); na V1.5 vira o centro do engajamento. A identidade do atleta é global e cross-tenant: o mesmo atleta compra de vários produtores ([[ADR-multitenancy]]).

## Perfil

Praticante esportivo urbano, 22-45 anos, renda B1-A2. Corre, pedala, faz trilha, yoga ou CrossFit; participa de 2-8 eventos por ano. Usa Strava, Garmin Connect, apps de meditação. Busca pertencimento, progresso visível e eventos como marco na rotina. Mock canônico: membros do Corrida Perfeita Sul. Fonte: [[be-hero-documentacao/be-hero-docs/personas|personas (Bíblia Be Hero)]].

**Dor central (verbatim do discovery):** "Eu quero ser heroico todos os dias e que isso signifique algo. Hoje minha rotina e minhas provas vivem em apps diferentes que não conversam entre si."

## Dores

- Fragmentação: cada dimensão da rotina num app diferente, sem identidade única.
- Sem preparação estruturada para o evento-alvo.
- Comunidade dispersa (assessoria, Strava e yoga são grupos separados).
- Recompensa social efêmera: kudos dura um dia, medalha junta pó.

## O que o comportamento do mercado já validou

O corredor brasileiro já é community-first: mais da metade participa de grupos e ~25% usam assessorias; quem está num clube tem ~2x mais chance de continuar ativo após o marco de 90 dias ([[RELATORIO-DISCOVERY]], dados Strava/NRC). A conexão social superou saúde e performance como motivador nº 1 no Strava Year in Sport 2024 ([[04-gamificacao]]). O produto empurra o atleta para o contexto do clube, nunca para um grafo global anônimo: feed e ranking por clube/turma são decisão travada.

## O contrato emocional: anti-streak

O Leela vende pertencimento, não performance. O dashboard convida ("Volte amanhã") e nunca acusa falha; a RN-118 garante em código que o agregado de desafio só soma, nunca decrementa por inatividade. Base científica: Lally et al. 2010, perder um dia não afeta materialmente a formação do hábito ([[04-gamificacao]]). Gate de copy veta linguagem de perda e culpa em qualquer superfície.

## Jornada por fase

| Fase | O que o atleta faz | Fonte |
|---|---|---|
| V1 (vender) | Descobre evento, compra sem fricção (checkout anônimo na landing ou app simples), recebe comunicado, apresenta QR | [[V1-PRODUTOR-web]], [[LEELA-E12-landing]] |
| V1.5 (engajar) | Entra no clube, registra ações nos 3 pilares, participa de desafio GymRats-like, vê leaderboard de consistência e perfil. Sem medalhas (S1309 cortada); estante "em breve" | [[decisoes-escopo-2026-07-04]], [[LEELA-E13-app-atleta]] |
| Evolução | Conecta conta de treino (Strava self-view gated, Health nativo), vê "meus treinos num lugar só", Leela+ benefícios | [[ANALISE-ROADMAP-v2]], [[leela-plus-hipotese-jtbd]] |

## Relacionadas

[[00-MOC-produto]] · [[01-tese-de-negocio]] · [[03-jobs-to-be-done]] · [[organizador-produtor]] · [[super-admin]]
