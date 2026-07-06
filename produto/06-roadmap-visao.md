---
tags: [leela, produto, roadmap, ondas, v1]
fontes:
  - "[[ROADMAP]]"
  - "[[V1-PRODUTOR-web]]"
  - "[[proposta-revisao-escopo-2026-07-04]]"
  - "[[decisoes-escopo-2026-07-04]]"
  - "[[DECISOES-ABERTAS]]"
atualizado: 2026-07-05
---

# 06 · Roadmap — visão executiva

A verdade operacional vive em [[ROADMAP]] (espinha), [[V1-PRODUTOR-web]] (fatia atual), [[V1-KANBAN]] e [[V1-CHECKLIST]] (execução). Esta nota resume os marcos e as decisões que os moldaram.

## Os dois marcos declarados (decisão-mãe, 2026-07-04)

| Marco | Significa | Fecha em |
|---|---|---|
| **V1 = vender** | Produtor opera e recebe inscrição paga ponta a ponta: evento publicado, landing vendendo, checkout Pix/cartão, inscritos, kits, comunicação, dashboard, repasse | fim da Onda 2 |
| **V1.5 = engajar** | Atleta registra, pontua, compete e vê perfil (loop GymRats-like, sem medalhas); produtor solicita repasse e vê histórico | fim da Onda 3 |

Racional em [[proposta-revisao-escopo-2026-07-04]]: separar os marcos protege a data de receita; espremer os ~6 lotes de engajamento na V1 única atrasaria o checkout em 3-4 semanas sem ganho de receita.

## Ondas

| Onda | Foco | Composição (recorte) |
|---|---|---|
| 0 · Fundação | bloqueia tudo | E00 monorepo/Firebase/CI + E01 design system (tema brasa) + multi-tenancy E16-S1600 desde o dia 1 |
| 1 · Operar | painel vivo | E03 operação · E02 dashboard · E05 clubs núcleo · E16-slim (onboard tenant + termos comerciais) |
| 2 · Vender = **V1** | ciclo de receita | E04-slim (sem afiliação; cupons + equipe + PaymentProvider) → E12 landing/checkout → E06 comunicação + E07 fatia web + coleta E11 (rollup cedo) + higiene E15 + lote backend do desafio no fim |
| 3 · Engajar = **V1.5** | loop do atleta | E13-slim + tier A GymRats/perfil + E07 mobile + E09-slim repasses + E11 recorte S |
| 3.1 · Strava (gated) | integração | Movido inteiro para evolução (decisão 2026-07-05); a V1.5 nasce com a seção Strava no perfil em "em desenvolvimento", UI honesta |
| 4 · V1.1 | robustez | E07 resto (403 casado com papéis, manutenção, offline-web), medalhas reavaliadas, E11 coorte/churn |
| 5 · H2 | expansão | Leela+ programa completo, E15 Creator Studio (discovery antes de build), E14 camadas 1 e 3, E09 completo, E10 marcas |

## O que saiu da V1 (e por quê)

- **Afiliação/split com UI** (S301, E08, S1204-link): sem afiliados neste início, cupons ficam. A infra plugável permanece como desenho (ADR-006).
- **Medalhas** (S1309): cortadas; perfil com estante "em breve".
- **Gateway real e domínio público:** adiados; sandbox/mock segue, "pago" de repasse é registro explícito na UI.
- **Boleto:** fora. Métodos V1 são cartão de crédito e PIX.
- **Desafio anti-streak completo:** o motor entra mínimo no E05; a mecânica completa é V1.5. A prova de retenção roda como instrumentação de fundo, não como gate ([[V1-PRODUTOR-web]]).

## Decisões comerciais embutidas no roadmap

Resumo das vinculantes (detalhe em [[01-tese-de-negocio]] e [[DECISOES-ABERTAS]]): taxa 10% cartão / 8% PIX por tenant, modelo percentual + fixo disponível, parcelamento 2x-12x Price 3,49% a.m. repassado, retenção de repasse 15% pós-evento, plano de cobrança nomeado aplicado pelo admin master.

## Histórico de re-sequenciamento (por que o roadmap mudou duas vezes)

1. **Original product-first** ([[ROADMAP]]): 5 ondas, app do atleta por último. O conselho deu no-go nessa sequência como caminho de prova ([[PARECER-CONSELHO]]).
2. **Recut prova-de-moat** ([[ANALISE-ROADMAP-v2]]): fatia mínima anti-streak com 5-10 coordenadores para medir retenção.
3. **V1 produtor-first operacional** ([[V1-PRODUTOR-web]]): o recut ficou adiado porque há um sócio produtor concreto esperando o sistema; vender primeiro, medir retenção ao fundo. É a sequência em execução, refinada pelas decisões de 2026-07-04/05.

## Relacionadas

[[00-MOC-produto]] · [[01-tese-de-negocio]] · [[04-user-stories]] · [[07-visao-de-futuro]]
