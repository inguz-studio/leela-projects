# Re-análise do roadmap · Leela v2

> Roadmap relido sob a visão nova do fundador (agregação de treino, não competir com Strava/Garmin na V1) e sob o parecer do Strategic Council (coordinator-first, cortar escopo, provar retenção).
> Fonte: `ROADMAP.md`, `README.md`, 7 pilares, `RELATORIO-DISCOVERY.md`, `PARECER-CONSELHO.md`. Épicos reais E00–E13; E14 é a nova capability proposta aqui.
> Stack confirmada: React (Next.js web + Expo mobile) + Firestore. Data: 2026-07-02.

---

## O que muda com a estratégia de agregação (não competir com Strava)

A visão nova resolve uma ambiguidade que o roadmap original deixava aberta ("qual conjunto de integrações entra na V1", pilar 06/07). A decisão agora é clara e barata:

- **O Leela não constrói tracking próprio nem tenta bater o log da Strava/Hevy.** Ele **agrega** o treino que o atleta já registra, via API, e mostra num lugar só ao lado de ingressos e desafios (pilar 07, tese do fundador). Isso transforma concorrentes de treino em **fontes**, não em alvos.
- **A integração vira uma capability transversal atrás de uma interface** (`TrainingProvider`), do mesmo tipo de `PaymentProvider`: o app não conhece a fonte concreta, então trocar Health por Strava por agregador não reescreve o produto (pilar 07, amarração ao roadmap).
- **A restrição Strava 2026 é uma porta de uma via de design, não um detalhe.** O Agreement proíbe exibir o treino de um atleta para outro — mesmo público. Logo o dado Strava é **self-view** (cada um vê o próprio), e **o ranking do desafio em grupo usa dado que o Leela gera/deriva** (check-in, auto-report, atividade importada de fonte cuja licença permita), nunca o payload Strava exibido a terceiros (pilar 07, risco 1). Desenhar assim desde o início evita retrabalho e risco jurídico.
- **Custo e alcance:** camada 1 (Health nativo on-device) é grátis, sem aprovação e cobre a maioria; camada 2 (Strava OAuth) é grátis e reconhecível; camada 3 (agregador Terra/Spike) só entra quando o volume justificar o custo recorrente. O menor investimento pelo maior alcance (pilar 07, recomendação).

Efeito no roadmap: some a incerteza "quanto investir em tracking" e entra uma capability enxuta e faseada, sem inchar o MVP.

---

## Nova capability / épico: LEELA-E14 · Integrações de treino (`TrainingProvider`)

Natureza igual a `PaymentProvider`/`Notificações`: referenciada por épicos, não é superfície própria. Formalizada como épico para ter stories e rastreabilidade.

**O que entra**
- `packages/core`: interface `TrainingProvider` (`connect()`, `listActivities()`, `subscribeWebhook()`), tipos normalizados de atividade e a política de consentimento LGPD por fonte (pilar 07).
- `packages/api-client`: implementações concretas — `HealthKitProvider` (iOS) e `HealthConnectProvider` (Android) para a V1; `StravaProvider` (self-view) como fast-follow; `AggregatorProvider` (Terra/Spike) como camada depois.
- `functions/`: ingestão de webhooks Strava e do agregador, quando usados — mesma pasta dos webhooks de pagamento.
- `apps/mobile` (E13): stories "conectar conta de treino" (OAuth/permissão on-device), "ver meus treinos", e — separada e explícita — "desafio em grupo com dado próprio do Leela".

**Dependências:** E00 (Firebase/Functions) + E01 (DS) + E13 (superfície onde o treino aparece) + E05 (o desafio que consome atividade como pontos). HealthKit/Health Connect são app-side (Expo), então E14 casa intrinsecamente com E13.

**Onde se liga**
- **E13 App do Atleta:** superfície de consumo ("treinos + ingressos + desafios num lugar só").
- **core / api-client:** interface + tipos + providers concretos.
- **functions/webhooks:** ingestão Strava/agregador.
- **E05 Clubs:** atividade importada → pontos no desafio (mesmo pipeline de scoring).

**Regra Strava (blindada em E14)**
- Dado Strava é **self-view**: exibido só ao próprio atleta dentro do app.
- **Ranking/feed de desafio em grupo usa dado próprio do Leela** (check-in / auto-report / atividade importada de fonte permitida), nunca o payload Strava mostrado a terceiros.
- Proibido usar o dado para analytics/insights, combinar com outros dados, ou treinar/operar IA. Se exibir logo, seguir brand guidelines (pilar 07, risco 1).

**MoSCoW:** Could na íntegra; **camadas 1+2 sobem para Must-da-fatia** quando o E13 entrar. Agregador (camada 3) permanece Could/"depois".

---

## Impacto nos épicos existentes

| Épico | Impacto da visão nova | Muda? |
|---|---|---|
| **E00 Fundação** | `functions/` passa a hospedar também webhooks de treino (mesma natureza dos de pagamento). Nenhuma mudança estrutural. | mínimo |
| **E01 Design System** | Componentes de "cartão de treino importado" e de conexão de conta. Incremental. | mínimo |
| **E03 Operação / E04 Vendas / E12 Landing** | **Sem mudança** pela agregação. E01 (ticketing) segue como está — é paridade competitiva, table stakes (PARECER Bezos). | não |
| **E05 Clubs** | Ganha "atividade importada vira pontos" no motor de desafios (mesmo pipeline de scoring GymRats, pilar 06). Ranking já era por clube; agora explicita que **fonte de pontos pode ser treino importado com dado próprio**. RN-118 (anti-streak) ganha relevância: agregado só soma. | sim (aditivo) |
| **E13 App do Atleta** | Ganha sync/health (HealthKit + Health Connect), tela "meus treinos", conexão de conta, e o desafio-em-grupo-com-dado-próprio. É a superfície natural da E14. | sim |
| **E06/E07/E08/E09/E10/E11** | Sem impacto direto da agregação. | não |

> Observação do conselho: E13 (a alma que gera o moat) estava na Onda 4, por último. A visão nova reforça a crítica de sequência do parecer — ver MVP recut.

---

## MVP recut (à luz do parecer do conselho)

O parecer é explícito: **Go na tese e no wedge; no-go no roadmap atual (14 épicos / 3 superfícies / product-first) como caminho de prova.** O único número a provar antes de escalar é o **lift de retenção clube vs. solo, medido no Leela** (PARECER, Round 5 e 5 movimentos). O MVP recut recorta a fatia mínima que prova o moat e dissolve o cold start (coordenador traz a comunidade pronta), sem construir tudo.

**Entra na fatia V1 (o experimento de menor risco — 1 vertical, 5-10 coordenadores na mão):**
- **E00 + E01** — fundação + DS mínimo (bloqueiam tudo).
- **E05 Clubs (recortado)** — importar/rodar 1 clube: membros, papéis, **um** desafio anti-streak (Modelo C), ranking por clube com **dado próprio**, painel de saúde da comunidade, RN-118 blindada em código com invariante auditável.
- **E04 + E12 (recortado)** — ingresso do próprio evento do coordenador: lotes + categoria por percurso, cupom por club, Pix/boleto/cartão, checkout público, split simples. Gateway decidido rápido (porta de duas vias, PARECER Bezos).
- **Comunicação na voz do coordenador** — fatia fina do E06: comunicado do club + inbox no app + limite anti-spam (RN-133 só promocional). Não o E06 inteiro (automações/segmentação complexa ficam para V2).
- **E13 fino** — não o app inteiro: dashboard heroico ("Volte amanhã"), entrar no club, QR de ingresso, ver o desafio. Lado do atleta pode ser web/manual na primeira coorte (PARECER: "lado do atleta fino/manual/web").
- **E14 camada 1 (Health nativo)** — só se a coorte pedir "treino vira ponto"; senão o desafio roda com check-in/auto-report (dado próprio) e Health entra em V2. Barato e opcional na prova.
- **Gate de copy anti-streak** — veta linguagem de perda/culpa (guardrail transversal).

**Adia explicitamente (via negativa, PARECER movimento 3):**
- E13 completo (portfólio, feed rico, medalhas cheias) → V2, só se a retenção replicar.
- E06 completo (automações, deliverability compliance, primer iOS) → V2.
- E08 Influenciador, E10 Marcas, E11 Analytics, E09 Financeiro completo → depois.
- E14 camadas 2 e 3 (Strava OAuth self-view, agregador) → V2/depois.
- Segundo tema visual, cross-clube, loyalty/tiers, descoberta algorítmica → depois.

**MVP recut em 3 linhas:**
1. Um vertical (assessorias de corrida), 5-10 coordenadores onboardados na mão, comunidade de WhatsApp importada.
2. Entregar valor single-player ao coordenador: ingresso + comunicação na voz dele + **um** desafio anti-streak + split, com lado do atleta fino e ranking por dado próprio do Leela.
3. Medir retenção clube vs. solo a 90 dias contra a baseline; só adensar (E13 completo, E14 camadas 2/3, expansão) se o número replicar.

---

## Roadmap re-sequenciado

Ondas revistas: da sequência product-first (Onda 4 = E13 por último) para uma sequência **prova-de-moat-first**. O ticketing (E03/E04/E12) entra recortado como table stakes, não como fim.

| Onda | Foco | Épicos (recorte) | Muda vs. original |
|---|---|---|---|
| **0 · Fundação** | bloqueia tudo | E00, E01 (mínimo) | igual |
| **1 · Prova do moat (coordinator-first)** | valor single-player + medir retenção | E05 recortado (1 desafio anti-streak, ranking dado próprio, RN-118, painel de saúde) + fatia fina de comunicação-do-coordenador + E13 fino (dashboard heroico, entrar no club) + **E14 camada 1 opcional** | **novo**: E13 sobe para cá (fino); antes era Onda 4 inteiro |
| **2 · Vendas ponta a ponta (recortada)** | fechar ingresso → pago do próprio evento | E04 recortado + E12 recortado + `PaymentProvider` (1 provider) | era Onda 2; agora subordinada à prova, escopo cortado |
| **3 · Adensar o núcleo (só se retenção replicar)** | a alma completa | E13 completo (portfólio, feed, medalhas), **E14 camada 2 Strava self-view + webhooks**, E05 completo (scoring configurável, times, verificação de atividade) | **novo gate**: só entra pós-prova |
| **4 · Robustez e alavancas** | qualidade + automação | E06 completo (automações, deliverability), E07, E09 | era Onda 3 |
| **5 · Expansão** | rede e monetização | E08, E10, E11, **E14 camada 3 agregador**, split multi-parte, cross-clube, loyalty | era Onda 5; + camada agregador |

Grafo re-sequenciado (textual):

```
E00 ─► E01 ─► [E05 recortado + comunicação fina + E13 fino + E14-c1?]  ← PROVA DE RETENÇÃO (gate)
                                   │
                    (só se o número replicar)
                                   ▼
             [E04+E12 recortado] ─► [E13 completo + E14-c2 + E05 completo]
                                   ▼
                    [E06 + E07 + E09] ─► [E08 · E10 · E11 · E14-c3 · split multi-parte]
```

---

## Métricas / kill-criteria

O kill-criterion nº1 do parecer é o eixo desta re-análise:

- **Kill nº1 — retenção não replica:** se, em 90 dias na coorte-piloto, a **retenção da coorte-de-clube não superar materialmente a baseline solo/histórica (medida no Leela)**, o moat não existe → reavaliar como ticketeira de nicho ou pivotar. O "2x" de Strava/NRC é convicção emprestada até ser medido no Leela (PARECER, Taleb — "flywheel do peru").
- **Kill nº2 — coordenador não migra:** se 5-10 coordenadores não saem da inércia do WhatsApp mesmo com onboarding na mão, o valor single-player não é óbvio → refazer a oferta antes de qualquer código novo.
- **Instrumentação:** medir lift de retenção clube vs. solo como métrica de produto de primeira classe (não citada, medida). Ao lado: opt-out rate de push em 30/60/90 dias (saúde de comunicação, pilar 03) e, quando E14 entrar, taxa de conexão de conta de treino.
- **Denominador econômico:** lucro por **clube ativo** (PARECER Collins) — tudo que não serve a "mais clubes ativos e retidos" é ruído na fatia de prova.
- **Invariante RN-118 auditável:** reconciliação + alerta contra falha silenciosa do agregado (Function que só soma). Falha silenciosa que puna inatividade = porta de uma via da confiança (PARECER Taleb).

---

## Riscos

| Risco | Origem | Mitigação |
|---|---|---|
| **Dependência de API de terceiro (agregador/treino)** | pilar 07 risco 5, PARECER Taleb | Manter tudo atrás de `TrainingProvider`; camada 1 (Health on-device) reduz superfície (dado nem transita por servidor Leela); agregador só quando o volume justificar |
| **Restrição Strava 2026** | pilar 07 risco 1 | Strava self-view apenas; ranking com dado próprio do Leela desde o design; brand guidelines se exibir logo |
| **Cold start / ovo-e-galinha** | PARECER Graham (tar pit) | Coordinator-first: importar comunidade de WhatsApp existente (do things that don't scale); valor single-player no dia 1 dissolve o marketplace |
| **O "2x" não replica no Leela** | PARECER Taleb/Collins | É o kill nº1; medir antes de escalar; não construir 3 superfícies antes da prova |
| **Runway queima em 14 épicos antes da prova** | PARECER Graham (default-dead) | Barbell: fatia de prova enxuta; adiar E08/E10/E11/E06-completo |
| **Falha silenciosa do agregado anti-streak** | PARECER Taleb | RN-118 com invariante auditável + reconciliação + alerta, não só a regra |
| **Coordenador não sai do WhatsApp (Habit+Anxiety)** | PARECER Christensen | Operar dentro/ao lado do WhatsApp no início; valor óbvio na 1ª semana |
| **Coordenador-como-game-master vira fricção** | PARECER Sutherland | Templates de desafio de 1 clique; senão o lado escasso não usa |
| **Dependência de trilho único (Firebase, push Gmail/Yahoo/Apple)** | pilar 03/07, PARECER Taleb | Deliverability como compliance (V2); segundo provider como prova de portabilidade (depois) |
| **Ticketing vira commodity (corrida ao fundo vs. Sympla)** | PARECER Hormozi/Bezos | Ticketing é porta de entrada, não moat; o moat é retenção + psicológico (anti-streak, voz do coordenador) |

---

*Documento de re-análise. Amarrado a épicos reais E00–E14. Para números e fontes, ver os 7 pilares e o PARECER-CONSELHO.md.*
