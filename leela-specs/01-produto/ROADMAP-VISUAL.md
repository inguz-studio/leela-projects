---
tags: [leela, roadmap, visual, gantt]
aliases: [Roadmap Visual, Gantt]
---

# 📊 Leela · Roadmap visual

> Diagramas Mermaid (o Obsidian renderiza nativamente). **As durações são ilustrativas/relativas** (baseadas no tamanho T-shirt dos épicos), não um cronograma com datas reais. Fonte: [[ROADMAP]], [[V1-PRODUTOR-web]], [[V1-CHECKLIST]].

## Gantt — Fatia V1 (produtor web + app simples)

```mermaid
gantt
    title V1 — Produtor (web) + app simples · durações relativas
    dateFormat  YYYY-MM-DD
    axisFormat  Sem %W
    section Onda 0 · Fundação
    E00 Fundação técnica         :e00, 2026-01-05, 14d
    E01 Design System            :e01, after e00, 14d
    E16 · S1600 Multi-tenant     :e16a, after e00, 7d
    section Onda 1 · Operar
    E03 Operação do evento       :e03, after e01, 21d
    E05 Clubs (núcleo)           :e05, after e01, 18d
    E02 Dashboard                :e02, after e01, 7d
    E16-slim (onboard + termos)  :e16b, after e16a, 10d
    section Onda 2 · Vender
    E04 Config & Vendas          :e04, after e03, 21d
    E12 Landing + checkout       :e12, after e04, 14d
    E08 Promotor self-service    :e08, after e04, 7d
    E06 Comunicação do evento    :e06, after e03, 10d
    section Onda 3 · App
    E13-slim (app do atleta)     :e13, after e12, 21d
```

## Fluxograma — dependências dos épicos da V1

```mermaid
flowchart LR
    E00[E00 Fundação] --> E01[E01 Design System]
    E00 --> MT[E16 · S1600<br/>Multi-tenant]
    E01 --> E03[E03 Operação]
    E01 --> E02[E02 Dashboard]
    E01 --> E05[E05 Clubs]
    MT --> E16[E16-slim<br/>onboard + termos]
    E03 --> E04[E04 Vendas]
    E04 --> E12[E12 Landing]
    E04 --> E08[E08 Promotor]
    E03 --> E06[E06 Comunicação]
    E12 --> CK([checkout])
    E05 --> E13[E13-slim App]
    classDef found fill:#FF450C,stroke:#8C2100,color:#fff;
    class E00,E01,MT found;
```

## Timeline — roadmap completo por horizonte (17 épicos)

```mermaid
timeline
    title Leela · horizontes
    H1 · Agora (ticketing + comunidade)
        : E00 Fundação
        : E01 Design System
        : E16 Plataforma (multi-tenant)
        : E02 Visão Geral
        : E03 Operação do Evento
        : E04 Config & Vendas
        : E05 Clubs
        : E08 Promotor
        : E12 Landing
        : E06 Marketing
        : E07 Estados
    H2 · Médio (wellness + app)
        : E13 App do Atleta
        : E14 Integrações de treino
        : E09 Financeiro
    H3 · Longo (SaaS + mídia)
        : E11 Analytics
        : E15 Creator Studio (MyDose)
        : E10 Marcas
    H4 · Visão
        : Marketplace completo do bem-estar
```

## Progresso da V1 (pie — ilustrativo)

```mermaid
pie showData
    title V1 · tasks por onda (142)
    "Onda 0 · Fundação" : 23
    "Onda 1 · Operar" : 59
    "Onda 2 · Vender" : 46
    "Onda 3 · App" : 14
```

---
Voltar: [[HOME]] · [[ROADMAP]] · [[V1-CHECKLIST]]
