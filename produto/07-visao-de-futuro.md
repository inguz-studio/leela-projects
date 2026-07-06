---
tags: [leela, produto, visao, horizontes, creator-studio]
fontes:
  - "[[ROADMAP]]"
  - "[[V1-PRODUTOR-web]]"
  - "[[proposta-revisao-escopo-2026-07-04]]"
  - "[[leela-plus-hipotese-jtbd]]"
  - "[[ANALISE-ROADMAP-v2]]"
atualizado: 2026-07-05
---

# 07 · Visão de futuro

O que o Leela quer ser quando a V1 estiver validada. Nada desta nota é compromisso de build; é o mapa dos horizontes registrados nos specs, com o grau de maturidade honesto de cada peça.

## Horizontes ([[ROADMAP]] §3)

| Horizonte | Período | Foco |
|---|---|---|
| H1 | M0-M12 | Ticketing esportivo + comunidade (é o agora: V1 vender, V1.5 engajar) |
| H2 | 12-24m | Marketplace de experiências wellness |
| H3 | 24-36m | SaaS para organizadores + mídia local |
| H4 | 36-60m | Capital digital do bem-estar no Brasil |

## Creator Studio (E15) · a visão grande

Transformar a lógica do MyDose (programas guiados por creator, ver [[06-concorrentes-diretos]]) num SaaS onde empresas, personal trainers, médicos, nutricionistas e coaches criam seus próprios desafios, programas, ebooks e materiais, publicam numa biblioteca e vendem, **com os produtores de evento como canal de aquisição de usuários** ([[V1-PRODUTOR-web]] §C.1).

Maturidade honesta: "hoje não é um épico, é um parágrafo" ([[proposta-revisao-escopo-2026-07-04]] §2). Sem spec, stories ou tasks; exigiria ~12 lotes, SKU de produto digital, infra de conteúdo e um marketplace com cold start próprio. Decisão do Vitor (2026-07-04): só higiene de domínio agora, custo quase zero, para não fechar portas: `autorId` generalizado no desafio + campo opcional de anexo de conteúdo no tipo.

## Rede coordinator-first

A sequência da tese ([[01-tese-de-negocio]]): valor single-player para um coordenador → clube retido → mais clubes → efeitos de rede entre clubes (descoberta, cross-clube, loyalty) só na fase 4 do plano do conselho ([[PARECER-CONSELHO]], sequência de ataque). Cada produtor onboardado traz a própria comunidade, então a rede cresce por importação de comunidades reais, não por aquisição fria de usuário.

## Leela+ · benefícios como camada de retenção

Programa de benefícios com parceiros locais (cafeteria, loja de corrida, fisio, estúdio), inspirado no Clube Cheers e no Floripa Wellness Club ([[leela-plus-hipotese-jtbd]]). Na V1 entra só a tela teaser com métricas de falseamento definidas (CTR ≥ 12%, waitlist ≥ 8%; CTR < 5% em 60 dias despriorizaria). Decidido: quando existir, é pago, mensalidade, receita 100% Leela neste início ([[decisoes-escopo-2026-07-04]]). Realista: H2, depende do app do atleta no ar.

## Agregação de treino (E14) · fontes, não alvos

O Leela não constrói tracking nem compete com Strava/Garmin: agrega o treino que o atleta já registra e mostra ao lado de ingressos e desafios ([[ANALISE-ROADMAP-v2]]). Três camadas atrás do `TrainingProvider`: Health nativo on-device (grátis), Strava OAuth self-view (gated, movido inteiro para evolução em 2026-07-05), agregador Terra/Spike quando o volume justificar. Regra permanente: ranking de desafio usa dado próprio do Leela, nunca payload Strava exibido a terceiros (restrição contratual Strava 2026).

## Marketplace e mídia (H2-H3)

- **Prestadores de bem-estar** (professor de yoga, personal, guia de trilha): vitrine, agendamento e cobrança. Persona já mapeada na Bíblia Be Hero, prioridade H2.
- **Marcas parceiras** como canal de mídia local segmentada (CDL, patrocinadores regionais): H3, depois da base consolidada ([[LEELA-E10-marcas]]).
- #hipótese **Prescrição de treino/nutrição dentro do Leela** (coach entrega plano via integração estilo TrainingPeaks/Nutrium): registrada em [[V1-PRODUTOR-web]] §C.3 como hipótese a validar demanda antes de especificar.

## O que precisa ser verdade para essa visão valer

1. O lift de retenção clube vs solo replica no Leela (kill-criterion nº 1, ainda não medido).
2. O coordenador migra do WhatsApp com onboarding na mão (kill-criterion nº 2).
3. O ticketing vira table stakes e a relação (anti-streak, voz do coordenador) segue sendo o que o concorrente não copia ([[PARECER-CONSELHO]]).

## Relacionadas

[[00-MOC-produto]] · [[01-tese-de-negocio]] · [[06-roadmap-visao]] · [[08-linhas-narrativas]]
