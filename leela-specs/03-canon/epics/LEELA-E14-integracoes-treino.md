# LEELA-E14 · Integrações de treino (`TrainingProvider`)

- **Superfície:** App do atleta (consumo) + `packages/core` (interface) + `functions/` (webhooks)
- **Horizonte:** H2 (Onda 6)
- **MoSCoW:** Could na íntegra; as camadas 1 e 2 sobem para Must-da-fatia quando o E13 entrar
- **Estimativa:** L
- **Status:** 📋 planejado — esqueleto criado no ESPEC-SWEEP 2026-07-19 a partir de `05-discovery/ANALISE-ROADMAP-v2.md`
- **Depende de:** LEELA-E00 (Functions), LEELA-E01 (DS), LEELA-E13 (superfície onde o treino aparece), LEELA-E05 (o desafio que consome atividade como pontos)
- **De-para:** (novo — capability proposta na análise de roadmap v2)

## Objetivo

Deixar o atleta conectar a fonte de treino que ele já usa e ver o treino dentro do Leela, sem que o produto fique casado com nenhum fornecedor. A natureza é a mesma do `PaymentProvider`: uma **interface no core** e implementações concretas atrás dela, de modo que trocar Health por Strava por um agregador não reescreva o produto.

O valor não é mostrar o treino — é fechar o ciclo do desafio de clube com dado que o atleta não precisa digitar. É o que transforma o desafio de "auto-declaração" em algo que sustenta ranking.

## Personas & JTBD

- **Persona primária:** Atleta.
- **JTBD:** *"Treino fora do app; quero que o que eu já faço conte no desafio do meu clube, sem redigitar."*
- **Persona secundária:** Coordenador de assessoria — quer ranking que não dependa da honestidade do auto-report.

## Camadas (a ordem também é a de implementação)

| Camada | O que é | Quando |
|---|---|---|
| 1 · on-device | `HealthKitProvider` (iOS) e `HealthConnectProvider` (Android) — permissão no aparelho, sem servidor | com o E13 |
| 2 · Strava | `StravaProvider` via OAuth + webhook de ingestão | fast-follow |
| 3 · agregador | `AggregatorProvider` (Terra, Spike ou equivalente) | depois, e só se as camadas 1-2 não bastarem |

## Regras que já estão cravadas na análise e não são negociáveis

- **Strava é self-view.** O dado importado do Strava é exibido **só ao próprio atleta**, dentro do app.
- **Ranking e feed de desafio em grupo usam dado próprio do Leela** — check-in, auto-report ou atividade importada de fonte permitida —, nunca o payload do Strava mostrado a terceiros.
- **Proibido** usar o dado para analytics, cruzar com outros dados, ou treinar/operar IA.
- Se exibir a marca, seguir as diretrizes de marca do fornecedor.
- **Consentimento por fonte**, com política LGPD declarada — dado de treino é dado de saúde por proximidade, e a disciplina de dado sensível do produto (subcoleção isolada, RN-147) vale aqui.

## Histórias-âncora

| Story | O que é | Depende de | Rota |
|---|---|---|---|
| `S1400` · interface `TrainingProvider` no core | `connect()`, `listActivities()`, `subscribeWebhook()`, tipos normalizados de atividade, política de consentimento por fonte | — | **opus** xhigh ⚔ |
| `S1401` · conectar conta de treino | permissão on-device (camada 1) e OAuth (camada 2), com o consentimento registrado | S1400 · E13 | **opus** xhigh ⚔ |
| `S1402` · ver meus treinos | tela de leitura no app, self-view | S1401 | **opus** xhigh |
| `S1403` · atividade importada vira pontos no desafio | entra no **mesmo pipeline de scoring** do E05, sem motor paralelo | S1401 · E05 ✅ | **opus** xhigh ⚔ |
| `S1404` · webhook de ingestão | `functions/`, na mesma pasta dos webhooks de pagamento; idempotente e assinado | S1400 | **opus** xhigh ⚔ |

**Por que quase tudo leva review antagonista:** conectar conta é OAuth e consentimento; ingestão é webhook, que é a mesma classe de superfície do webhook de pagamento; e transformar atividade em ponto de ranking é onde nasce a fraude de desafio.

## Impacto arquitetural que a decisão do PWA cria

A análise original diz que HealthKit e Health Connect são **app-side em Expo**, e por isso o E14 casa intrinsecamente com o E13 nativo. **Com o app v1 como PWA, a camada 1 não existe:** um PWA não acessa HealthKit nem Health Connect. Isso reordena o épico — a camada 2 (Strava, que é OAuth de servidor e funciona igual em qualquer cliente) passa a ser a **primeira** camada viável, e a camada 1 fica condicionada a um eventual app nativo.

Não é uma decisão desta lane. Está registrada como consequência a considerar em `02-rodadas/2026-07-19-espec-sweep/01-decisoes-abertas.md`.

## Fora de escopo

- Escrever de volta na fonte (o Leela lê, não publica treino no Strava).
- Métrica de treino em analytics do organizador (dado do atleta, fora do RN-820).
- Agregador pago antes de as camadas 1-2 provarem demanda.

## Ordem sugerida

`S1400 → S1404 → S1401 → S1402 → S1403`. O core e a ingestão antes das telas, pela mesma razão de sempre: a UI lê número íntegro desde o primeiro render.
