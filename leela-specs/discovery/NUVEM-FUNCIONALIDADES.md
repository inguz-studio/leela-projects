# Nuvem de funcionalidades · Leela

> Inventário completo de features vindas dos 7 pilares de benchmark + da visão nova do fundador (agregar treino, não competir com Strava/Garmin na V1).
> Fonte: `discovery/pilares/01…07`, `RELATORIO-DISCOVERY.md`, `PARECER-CONSELHO.md`. Épicos reais em `epics/LEELA-E00…E13` + a nova E14 proposta em `ANALISE-ROADMAP-v2.md`.
> Premissa incorporada: stack React (Next.js web + Expo mobile) + Firestore; integração de treino atrás de `TrainingProvider` (espelha `PaymentProvider`); restrição Strava 2026 (self-view; ranking com dado próprio do Leela).
> Colunas — **Tipo**: construir (código próprio) · integrar (via API/provider de terceiro) · adiar (fora da fatia atual) · já-no-plano (spec já existe no épico). **Prioridade**: V1 (fatia de prova) · V2 (adensamento) · depois (expansão).
> Data: 2026-07-02.

---

## 1 · Comunidade / Clubs

| Feature | Origem (benchmark) | O que é | Épico | Tipo | Prioridade |
|---|---|---|---|---|---|
| Clube como camada de comunidade (feed próprio) | Strava, Strava clubs (pilar 02/06) | Grupo com feed, membros e contexto próprio, acima do grafo global | E05 / E13 | já-no-plano | V1 |
| Feed dentro do clube (não global) | Strava vs. ruído de feed aberto (pilar 02) | Publicações = registros de ação, medalhas e comunicados vivem no contexto do clube | E13 | já-no-plano | V1 |
| Papéis explícitos (owner/admin/membro) | Strava clubs, Garmin groups (pilar 02) | RN-103 owner único + admin N + membro N; permissões granulares RN-142 | E05 | já-no-plano | V1 |
| Entrada por convite/código | Strava link, Garmin convite (pilar 02) | RN-101 código 5 chars (8A3K9) + RN-106 convite email ≤50 | E05 | já-no-plano | V1 |
| Painel de saúde da comunidade | TrainingPeaks/Treinus (pilar 02) | Membros novos (<7d) · ativos · inativos (30d+, RN-102) com CTA de reengajamento antes do churn | E05 | construir | V1 |
| Coordenador como game master | inexistente nos concorrentes (pilar 02) | Treinador desenha desafios que fazem parte do planejamento de treino — mecânica proprietária | E05 | construir | V1 |
| Reação social leve (kudos/aplauso) | Strava kudos, NRC (pilar 02/04) | Toque de reação em registros e medalhas de colegas, sem comentário obrigatório | E13 | construir | V2 |
| Club gerido por profissional/creator | MyDose creator-led (pilar 06) | Coordenador/expert opera o club e habilita afiliação — modelo MyDose | E05 | já-no-plano | V1 |
| Status de membro por trilha de reconhecimento | adiClub tiers, Garmin Connect+ (pilar 02) | Evoluir status (ativo/novo/inativo RN-102) para trilha de loyalty com perks | E05 / E13 | adiar | depois |
| Desafio cross-clube (Leela-wide) | NRC comunidade global (pilar 02) | Competição entre clubes, estilo desafio global NRC | E05 | adiar | depois |
| Sub-afiliação atleta→atleta | (parkada, RN-105) | Membro recruta membro dentro do club | E05 | adiar | depois |

---

## 2 · Desafios / Gamificação

| Feature | Origem (benchmark) | O que é | Épico | Tipo | Prioridade |
|---|---|---|---|---|---|
| Desafios A/B/C (RN-110) | Strava challenges, GymRats (pilar 04/06) | Motor de desafios do club com ciclo (ativos/encerrados) | E05 | já-no-plano | V1 |
| Modelo C — equilíbrio multi-pilar (RN-111) | anti-streak/Habitica (pilar 04) | Desafio signature: exige equilíbrio físico/mental/espiritual; resiste ao gaming de comparecimento | E05 | já-no-plano | V1 |
| Ranking do desafio por clube/turma (nunca global) | Strava segmentos, NRC amigos (pilar 02/04) | Leaderboard restrito aos membros — liga alcançável; **compatível com restrição Strava (dado próprio)** | E05 | construir | V1 |
| Anti-streak "Volte amanhã" em código (RN-118 nova) | Lally 2010, crítica Duolingo (pilar 04) | Agregado só soma, nunca decrementa por inatividade; invariante auditável + alerta | E05 / E13 | construir | V1 |
| Selo de consistência ("Constante") | Strava Local Legend (pilar 02/04) | Bônus +10% 5+ dias/sem (RN-115) e equilíbrio viram status visível, não streak | E05 / E13 | construir | V1 |
| Bônus multi-pilar como "momento herói" | Apple Rings/awards (pilar 04) | 3 pilares no mesmo dia (+20%, RN-115) dispara celebração visível | E13 | já-no-plano | V1 |
| Scoring configurável (treinos/min/presença/pontos) | GymRats (pilar 06) | Gestor define a métrica de pontuação; modo times além de individual | E05 | construir | V2 |
| Verificação de atividade (foto + título OU sync) | GymRats (pilar 06) | Check-in com antifraude leve; gestor bloqueia post retroativo/galeria | E13 | construir | V2 |
| Atividade importada vira pontos no desafio | tese de agregação (pilar 06/07) | Treino puxado por API alimenta o scoring — **dado do próprio atleta, não exibido a terceiros** | E14 → E05 | integrar | V2 |
| Desafios com propósito/patrocínio | adidas Run For The Oceans (pilar 02/04) | Presets que amarram desafio a causa/patrocinador (RN-112, valor comercial RN-123) | E05 | construir | V2 |
| Medalhas colecionáveis como identidade | Garmin badges, Strava achievements (pilar 02/04) | RN-116 4 tipos de recompensa persistem no perfil | E13 | já-no-plano | V2 |
| Metas time-bound que renovam | Strava challenges vs. burnout de rings (pilar 04) | Desafios com início/fim e medalha ao concluir, evitando "para sempre" | E05 | já-no-plano | V2 |

---

## 3 · Ingressos / Eventos

| Feature | Origem (benchmark) | O que é | Épico | Tipo | Prioridade |
|---|---|---|---|---|---|
| Lotes com preço crescente (early bird) | Sympla, Ticket Sports, Race Roster (pilar 01) | 1º/2º/3º lote — padrão universal; recompensa compra antecipada | E04 | construir | V1 |
| Preço por percurso/categoria (5k/10k/21k) | verticais de esporte (pilar 01) | Distância/modalidade como unidade de preço/vaga própria, não "ticket type" genérico | E04 | construir | V1 |
| Meios de pagamento locais (Pix + boleto + cartão parcelado) | Doity, Sympla (pilar 01) | Pix/boleto saque imediato; cartão com prazo | E04 / E12 | integrar | V1 |
| Check-in / QR + relatórios de venda em tempo real | Ticket Sports, Doity (pilar 01) | Paridade mínima; QR no app do atleta (E13) alinhado a E03 | E03 / E13 | construir | V1 |
| Checkout público sem login | Landing (roadmap) | Atleta anônimo descobre → inscreve → paga | E12 | já-no-plano | V1 |
| Landing com branding do evento (mapa/camiseta/cores) | Race Roster (pilar 01) | Página de inscrição com identidade do evento | E12 | já-no-plano | V1 |
| Cupom por clube/comunidade | Sympla cupons (pilar 01) | Código exclusivo para membros de um club (loop community→venda) | E04 | construir | V1 |
| Cobrança por carrinho, não por inscrição | RunSignup (pilar 01) | Favorece inscrição de grupo/família | E04 | construir | V2 |
| Fundraising / doação vinculada à inscrição | RunSignup, Race Roster (pilar 01) | Doação com taxa separada e menor; ausente no BR | E03 / E04 | construir | depois |
| Descoberta/recomendação de eventos | Let's Do This (pilar 01/06) | Recomendação por histórico + conexões sociais | E11 / E05 | adiar | depois |
| Funil club → desafio → evento com ingresso | whitespace (pilar 06) | Amarrar desafio do club a evento com check-in — nenhum concorrente fecha o loop | E05 / E04 / E13 | construir | V2 |

---

## 4 · Comunicação

| Feature | Origem (benchmark) | O que é | Épico | Tipo | Prioridade |
|---|---|---|---|---|---|
| Campanha push + email (RN-131) | SendGrid, Resend, FCM (pilar 03) | 2 canais (push/email/ambos), 3 estados (enviada/agendada/rascunho, RN-130) | E06 | já-no-plano | V2 |
| Comunicação na voz do coordenador | crews BR, tese Leela (pilar 02/03) | Tom pessoal/assessoria, nunca institucional — costly signal de pertencimento | E06 / E13 | construir | V1 |
| Segmentação por comportamento/ciclo de vida | Customer.io, Mailchimp (pilar 03) | todos_inscritos · por_modalidade · por_kit · por_status · por_engajamento | E06 | já-no-plano | V2 |
| Automações por gatilho (boas-vindas/kit pronto/véspera) | Customer.io, Braze (pilar 03) | Automação vence broadcast (+24% open, 19x conversão); RN-132 | E06 | construir | V2 |
| Limite anti-spam (RN-133 · 4 push/sem) — só promocional | OneSignal frequency cap (pilar 03) | Teto conta só push promocional; transacional/triggered isento; + quiet hours | E06 / E13 | construir | V1 |
| Push ≤160 chars, email com capa (RN-134/135) | prática de push curto (pilar 03) | Validado por Function; capa só em email | E06 / E13 | já-no-plano | V2 |
| Inbox no app + badge de não lidos (FCM) | NRC feed/status (pilar 03) | Comunicado do club chega por FCM (E13-S1312) | E13 | já-no-plano | V1 |
| "Orçamento de push visível" ao coordenador | diferencial Leela (pilar 02/03) | Mostrar push restante da semana como feature de cuidado (anti-fadiga) | E06 | construir | V2 |
| Deliverability como compliance (SPF/DKIM/DMARC + one-click unsub) | Gmail/Yahoo 2024 (pilar 03) | Obrigatório no DoD do envio; monitor de reclamação <0,3% | E06 | construir | V2 |
| Primer de push iOS antes do prompt nativo | OneSignal (pilar 03) | Tela in-app explicando valor antes de pedir permissão | E13 | construir | V2 |
| Opt-in/out granular por canal e por clube (LGPD) | Blip, LGPD (pilar 03) | Consentimento informado; opt-out fácil e imediato | E06 / E13 | construir | V2 |
| WhatsApp Business API | Meta BSPs (pilar 03) | Canal futuro; templates Utility/transacional, opt-in explícito | E06 | adiar | depois |

---

## 5 · Vendas / Afiliação

| Feature | Origem (benchmark) | O que é | Épico | Tipo | Prioridade |
|---|---|---|---|---|---|
| `PaymentProvider` (interface fina plugável) | ADR-006 / Pagar.me, Asaas, Stripe (pilar 05) | Só cria cobrança, aplica split, consulta status, dispara payout | E04 / core | construir | V1 |
| Split nativo Pix + cartão (por % ou valor fixo) | Pagar.me, Asaas, Iugu (pilar 05) | Commodity de gateway; executor da divisão que o Leela mandar | E04 | integrar | V1 |
| Split no ato (dinheiro cai dividido) | Pagar.me/Iugu destination (pilar 05) | Default do Leela; evita passivo de repasse manual | E09 | integrar | V2 |
| Atribuição server-side no link master | crítica cookie-only (pilar 05) | Token persistido no backend, não só cookie — IP do Leela, não terceirizável | E04 / E08 | construir | V1 |
| Cupom/código pessoal determinístico | Sympla, Hotmart (pilar 05) | Cupom vence link quando ambos presentes; resiste a multi-dispositivo | E04 | construir | V1 |
| Regras de atribuição (last/first/multicliques) + janela | Hotmart (pilar 05) | Configurável por evento; vocabulário validado | E04 | construir | V2 |
| Comissão sobre líquido (após taxa gateway) | Asaas (pilar 05) | Padronizar sobre líquido; persistir regra vigente na venda | E04 / E09 | construir | V2 |
| Flexibilidade de quem paga a taxa (absorver/repassar/split 50-50) | RunSignup (pilar 01) | Split 50/50 raro no BR — diferencial já no MVP de vendas | E04 | construir | V1 |
| Painel do promotor (visitas/ingressos/financeiro) | Sympla afiliados (pilar 05) | Reusar UX Sympla; influenciador é caso do mesmo motor | E08 | adiar | depois |
| Split multi-parte (organizador↔influenciador↔Leela) | inexistente nos benchmarks (pilar 01/05) | Whitespace competitivo; nativo | E08 | adiar | depois |
| Antifraude de atribuição (auto-afiliação, teto, reversão) | gap dos gateways (pilar 05) | Bloquear auto-atribuição, teto por afiliado, reversão em estorno | E04 / E08 | construir | depois |
| Transparência de taxa publicada | vs. opacidade Ticket Sports (pilar 01) | Posicionamento de aquisição | E04 / E12 | construir | V2 |

---

## 6 · Integrações de treino

| Feature | Origem (benchmark) | O que é | Épico | Tipo | Prioridade |
|---|---|---|---|---|---|
| Interface `TrainingProvider` | espelha PaymentProvider (pilar 07) | `connect()`, `listActivities()`, `subscribeWebhook()` + tipos normalizados + política LGPD em core | E14 / core | construir | V1 |
| Health nativo on-device (Apple HealthKit + Google Health Connect) | pilar 07 (camada 1) | Ler treino do device — grátis, sem aprovação, alcance máximo pelo menor investimento | E14 → E13 | integrar | V1 |
| Strava OAuth direto (self-view) | Strava API v3 (pilar 07) | Exibir treino **só ao próprio atleta**; NÃO alimenta ranking entre pessoas (termos 2026) | E14 → E13 | integrar | V2 |
| "Meus treinos num lugar só" (ao lado de ingressos/desafios) | tese do fundador (pilar 06/07) | Tela do atleta consolida treino importado + eventos + desafios | E13 | construir | V2 |
| Agregador (Terra ou Spike) — cauda longa | pilar 07 (camada 3) | Garmin, Polar, COROS, Suunto, Whoop, Fitbit/Google sem OAuth por fonte; custo recorrente | E14 | integrar | depois |
| Ingestão de webhooks de treino (Cloud Functions) | Strava webhooks (pilar 07) | Mesma pasta `functions/` dos webhooks de pagamento | E14 / functions | construir | V2 |
| Consentimento LGPD granular por fonte de treino | pilar 07 (risco 4) | Consentimento explícito, minimização (tipo/distância/tempo, não GPS bruto), revogar/apagar | E14 / core | construir | V1 |
| "Powered by Strava" + brand guidelines | Strava agreement (pilar 07) | Se exibir logo, seguir guidelines; não sugerir patrocínio | E14 / E13 | construir | V2 |

---

## 7 · Identidade / Perfil do atleta

| Feature | Origem (benchmark) | O que é | Épico | Tipo | Prioridade |
|---|---|---|---|---|---|
| Perfil como portfólio de trajetória | Fitfolio "currículo fitness" (pilar 06) | Eventos participados, desafios, club, conquistas — "quem sou como atleta" | E13 | construir | V2 |
| Medalhas/recompensas no perfil (identidade persistente) | Garmin badges, Insight Timer (pilar 02/04) | RN-116 mora no perfil como narrativa, não lista efêmera | E13 | já-no-plano | V2 |
| Dashboard heroico "vitrine de retorno" (S1303) | anti-streak (pilar 04) | Estado sem registro do dia convida ("Volte amanhã"), nunca alerta de falha | E13 | já-no-plano | V1 |
| Onboarding pró-pertencimento (entrar no club primeiro) | dado clube > solo 2x (pilar 02) | Primeiro login prioriza "entrar no seu clube" — ativação empurra para o club | E13 | construir | V1 |
| Home "o que preciso fazer hoje para a próxima prova" | community-around-events (pilar 02) | Costura jornada diária (pilares) ao ingresso/evento | E13 | construir | V2 |
| QR de ingresso no app | wireframes Be Hero (pilar 01/06) | Matéria-prima única que Fitfolio não tem | E13 | já-no-plano | V1 |

---

## 8 · Transversal

| Feature | Origem (benchmark) | O que é | Épico | Tipo | Prioridade |
|---|---|---|---|---|---|
| Monorepo Turborepo + Next.js + Expo + Firebase | stack decidida (roadmap) | Fundação técnica (Firestore + Auth + Functions + CI/CD) | E00 | construir | V1 |
| Design System temável como código (tokens.json) | DS v3 (roadmap) | Componentes React (+RN) consumidos pelas 3 superfícies | E01 | construir | V1 |
| Agregados por Cloud Function (fan-out/counters) | implicação Firestore (roadmap) | N:N e contadores mantidos por Function; base do RN-118 | E00 / functions | construir | V1 |
| Estados de sistema (404/403/500/offline/manutenção) | roadmap | RF-50…54 | E07 | já-no-plano | V2 |
| Visão Geral do Profissional | roadmap | Painel de overview | E02 | já-no-plano | V2 |
| Financeiro do Profissional (saldo/liquidação por recebedor) | Asaas prazo (pilar 05) | Saldo por recebedor + status de liquidação (Pix na hora vs cartão prazo) | E09 | adiar | depois |
| Marcas do Profissional | roadmap | Multi-marca no painel | E10 | adiar | depois |
| Analytics do Profissional | roadmap | Métricas de evento/club | E11 | adiar | depois |
| Segundo tema visual (`leela` Oxblood/Lima) | decisão em aberto (roadmap) | Alternativa ao tema `brasa` default | E01 | adiar | depois |
| Gate de copy anti-streak (veta "você perdeu/falhou") | guardrail (pilar 04) | CI de copy veta linguagem de perda/culpa, além da RN-118 | E01 / E13 | construir | V1 |
| Observabilidade (Sentry) + acessibilidade WCAG AA + LGPD export 90d (RN-144) | roadmap | Qualidade transversal | E00 / todas | já-no-plano | V1 |

---

## Features que ninguém do mercado tem junto (o whitespace do Leela)

Cada item abaixo existe em pedaços no mercado; **nenhum player pesquisado entrega a combinação**. É o moat de features (validado pelo conselho como real no nível de feature — mas o moat defensável é psicológico + retenção, não a soma).

1. **Ingresso + comunidade + desafio anti-streak + comunicação-do-coordenador + afiliação num só produto.** Verticais de esporte param na prova; SaaS BR de assessoria param na planilha; apps de performance não têm ingresso nem afiliação. Ninguém cruza os cinco (pilares 01/02/06, RELATORIO).
2. **Coordenador como game master.** Nenhum concorrente dá ao treinador o poder de desenhar desafios que fazem parte do planejamento de treino (pilar 02).
3. **Gamificação anti-streak por design ("Volte amanhã", RN-118).** Todo concorrente glorifica a sequência perfeita; o Duolingo monetiza a ansiedade. Anti-streak como princípio de código é território livre — e impossível de copiar porque "parece burro na planilha do concorrente" (pilar 04/06, PARECER Sutherland).
4. **Funil fechado club → desafio → evento com ingresso.** Central da Corrida/HYROX vendem ingresso fora de qualquer comunidade; apps de comunidade não têm ingresso (pilar 06).
5. **Agregação neutra de treino + ranking com dado próprio.** O Leela lê o treino que o atleta já registra (Health/Strava) sem exigir migração de app, e resolve a restrição Strava 2026 rankeando por dado próprio do Leela — combinação que os apps de tracking não fazem porque competem pelo log (pilar 06/07).
6. **Split multi-parte com atribuição desacoplada e portável.** O gateway é executor plugável; a inteligência de "de quem foi a venda" (link master + cupom + janela) é IP do Leela. Split organizador↔influenciador↔Leela não existe nativo em nenhum benchmark (pilar 01/05).
7. **Comunicação na voz do coordenador com anti-spam estrutural vendido como cuidado.** "Orçamento de push visível" é costly signal de respeito — o oposto da saturação dos grandes (pilar 02/03, PARECER).

> Contagem: **~70 features** inventariadas nas 8 macro-áreas. Nota do conselho: whitespace de feature é fato, mas a priorização deve ser dirigida por **prova de retenção**, não por completude — ver `ANALISE-ROADMAP-v2.md`.
