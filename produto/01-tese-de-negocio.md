---
tags: [leela, produto, tese, moat, estrategia]
fontes:
  - "[[PARECER-CONSELHO]]"
  - "[[RELATORIO-DISCOVERY]]"
  - "[[ANALISE-ROADMAP-v2]]"
  - "[[ADR-multitenancy]]"
  - "[[DECISOES-ABERTAS]]"
  - "[[decisoes-escopo-2026-07-04]]"
atualizado: 2026-07-05
---

# 01 · Tese de negócio

## A tese em uma frase

O Leela é um SaaS coordinator-first que vira rede: entra pelo produtor de eventos e pelo coordenador de assessoria (que já têm a comunidade pronta no WhatsApp), entrega valor single-player no dia 1 (ingresso, comunicação, clube, desafio) e cresce porque quem está num clube permanece ativo por mais tempo do que quem treina sozinho. Veredito do conselho estratégico: **go condicional** ([[PARECER-CONSELHO]]).

## O job contratado

O discovery fundia dois clientes; o conselho separou ([[PARECER-CONSELHO]], round 1-2):

- **Coordenador/produtor (quem paga):** "me ajude a manter minha comunidade viva e rendendo entre um evento e outro". Hoje ele opera com WhatsApp, planilha e Pix na mão. É não-consumo clássico: disruption de novo mercado, não briga de feature.
- **Atleta (quem usa):** "pertencer e progredir sem vergonha" depois que a inscrição foi feita.

## O enquadramento que vale (decidido, não reabrir)

**Coordinator-first.** A oferta ao produtor: *"rodo sua comunidade e seu evento; você paga quando arrecada"*. O coordenador traz a comunidade inteira consigo, o que dissolve o ovo-e-galinha do marketplace sem cold start de rede ([[PARECER-CONSELHO]], round 5). O produtor de eventos é também o canal de aquisição de atletas ([[V1-PRODUTOR-web]]).

## O moat (e o que ele não é)

O moat **não é** "unificar os 5 pilares num produto só". Essa é história supply-side, copiável, e o conselho a rejeitou explicitamente. O whitespace de feature é fato verificado (nenhum player cruza ingresso + comunidade + desafios + comunicação + afiliação, [[RELATORIO-DISCOVERY]]), mas é sintoma, não defesa. O moat real tem duas pernas:

1. **Psicológico.** O anti-streak ("Volte amanhã", RN-118 em código) e a comunicação na voz do coordenador são costly signals de cuidado que o concorrente não copia porque parecem ilógicos na planilha dele. O Duolingo monetiza a ansiedade do streak; o Leela faz o oposto por princípio auditável ([[PARECER-CONSELHO]], Sutherland; [[04-gamificacao]]).
2. **Retenção.** Quem está num clube tem ~2x mais chance de continuar ativo após 90 dias (dado Strava/NRC, [[02-comunidade-clubs]]). Atenção: esse número é emprestado do mercado e **ainda não foi medido no Leela**. Até ser medido, é a fragilidade nº 1 da tese.

## Arquitetura como fato estratégico

O Leela é uma **ticketeira marketplace multi-tenant** desde o E00: N produtores isolados por `tenantId`, identidade do atleta global cross-tenant, termos comerciais por tenant e um super-admin da plataforma acima de todos ([[ADR-multitenancy]]). Retrofit de multi-tenancy é proibitivo, por isso a decisão veio antes de qualquer código de domínio.

## Como ganha dinheiro (decisões vinculantes do Vitor, 2026-07-04/05)

Fonte: [[decisoes-escopo-2026-07-04]] e [[DECISOES-ABERTAS]].

- **Taxa de serviço por transação**, configurável por tenant: defaults 10% cartão · 8% PIX; além do percentual puro existe o modelo percentual + fixo (ex.: 8% + R$ 2,00). Sem boleto na V1.
- **Parcelamento 2x-12x com juros de 3,49% a.m., tabela Price, repassado ao comprador** (12x ≈ +24,11% sobre o financiado). À vista sem juros.
- **Plano de cobrança nomeado:** o admin master configura uma vez (taxas por parcela + PIX + cartão à vista + mensalidade SaaS) e aplica ao tenant, estampando os CommercialTerms.
- **Repasses com retenção de 15%** liberada só após o evento (contingência de fraude), percentual editável pelo admin.
- **Sem afiliados na V1** (cupons sim); E08 promotor adiado. A infra de split plugável permanece como desenho (ADR-006), sem UI.
- **Leela+ pago, mensalidade, receita 100% Leela** neste início; na V1 entra só tela teaser para medir demanda ([[leela-plus-hipotese-jtbd]]).
- Mensalidade SaaS por tenant pode ser 0 (alavanca comercial, [[ADR-multitenancy]]).

**Denominador econômico:** lucro por clube ativo. Tudo que não serve a "mais clubes ativos e retidos" é ruído na fase de prova ([[PARECER-CONSELHO]], Collins).

## Kill-criteria (o que mata a tese)

1. **Retenção não replica.** Se em 90 dias a coorte-de-clube não superar materialmente a baseline solo medida no Leela, o moat não existe: reavaliar como ticketeira de nicho ou pivotar.
2. **Coordenador não migra.** Se 5-10 coordenadores não saem da inércia do WhatsApp mesmo com onboarding na mão, o valor single-player não é óbvio: refazer a oferta antes de código novo.

Confiança calibrada pelo conselho: tese direcionalmente correta ~70% · moat defensável ~55% (pendurado no número não medido) · cold start solúvel via coordenador ~75% ([[PARECER-CONSELHO]], round 4).

Nota de contexto: a V1 atual é produtor-first operacional (há um sócio produtor concreto esperando o sistema), e a métrica de retenção roda como instrumentação de fundo, não como gate de entrega ([[V1-PRODUTOR-web]]). A prova formal do moat ficou depois do "vender". Registro honesto: isso mantém viva a crítica de sequência do conselho.

## Relacionadas

[[00-MOC-produto]] · [[03-jobs-to-be-done]] · [[06-roadmap-visao]] · [[07-visao-de-futuro]] · [[08-linhas-narrativas]]
