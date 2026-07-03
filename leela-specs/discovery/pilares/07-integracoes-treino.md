# Pilar 07 · Integração de dados de treino via API

> Discovery de rastreabilidade 100%. Todas as afirmações de preço/limite/termo trazem fonte com URL e data de acesso (2026-07-02). Onde a fonte não confirma um número, o texto marca **[não confirmado]**.
> Autor: analista research-intelligence · Base: visão do fundador em `README.md` + `ROADMAP.md`.

Tese do fundador para a V1: **não construir tracking próprio nem competir com Strava/Garmin**. Em vez disso, **puxar via API os treinos que o atleta já registra** no seu device/app e mostrá-los num só lugar, ao lado dos ingressos e dos desafios em grupo. Esta pesquisa mapeia o "como": termos, limites, custo e esforço.

---

## Panorama (o problema: muitos wearables; a resposta: OAuth por app vs. agregador)

O atleta brasileiro típico usa uma entre muitas fontes: Strava (camada social sobre quase tudo), Garmin, Apple Watch (Saúde), Android (Health Connect), Fitbit/Google, Polar, COROS, Suunto, Whoop. Não existe um "padrão" único: cada plataforma tem seu OAuth, seus escopos, seus termos e seu processo de aprovação. Integrar todas na mão é um projeto contínuo (cada API muda, cada uma exige manutenção de tokens e webhooks).

Há dois caminhos:

1. **OAuth direto, fonte a fonte.** O Leela vira um "app desenvolvedor" em cada plataforma, implementa cada fluxo OAuth, cada webhook, cada parser. Máximo controle e custo zero de licença, mas esforço linear por fonte e sujeito à aprovação de cada uma (Garmin, Whoop) e às regras de branding/uso (Strava).
2. **Agregador (Terra, Vital/Junction, Rook, Spike).** Uma única integração normaliza 300-500+ fontes num schema comum. Troca esforço de engenharia por custo recorrente (por usuário/uso). É o caminho coerente com "só integração, sem investimento pesado".

Ponto crítico transversal (2026): as plataformas estão **fechando** dados por causa de IA e privacidade. A Strava endureceu o Agreement (só exibir dado do usuário para ele mesmo — ver Riscos). Fitbit Web API é descontinuada em set/2026 e migra para a nova Google Health API. Google Fit foi depreciado (jul/2025). Isso reforça: não amarrar a arquitetura a uma única fonte.

---

## Integrações diretas

| Fonte | Dados disponíveis | Auth | Limites / termos | Esforço | Custo |
|---|---|---|---|---|---|
| **Strava API v3** | Activities (tipo, distância, tempo, elevação), segments, streams de HR/potência/GPS; webhooks de criação/atualização/deleção | OAuth2; escopos `activity:read`, `activity:read_all`, `profile:read_all` | Rate limit padrão **200 req / 15 min e 2.000 req / dia**; **1 subscription de webhook por app**. **Termos restritivos (2026):** dado de um usuário só pode ser exibido **para esse mesmo usuário**; proibido usar dado para analytics/insights ou combinar com outros dados; proibido uso para treino/operação de IA. Exige compliance com brand guidelines se exibir logo | Médio (OAuth + webhooks + refresh token) | Grátis |
| **Garmin (Connect Developer Program)** | **Health API:** resumos diários (FC, sono, passos) em JSON via push. **Activity API:** detalhe de atividade em `.FIT`/`.GPX`/`.TCX` | OAuth; credenciais emitidas após aprovação | **Não é self-serve:** requer aplicação ao programa e aprovação (perguntam caso de uso, empresa, tratamento de dados). Aprovação leva **dias a semanas** [prazo não confirmado oficialmente] | Alto (aprovação + integração push) | Grátis após aprovação [não confirmado] |
| **Apple HealthKit** (iOS, on-device) | Passos, distância, FC, HRV, sono, SpO₂, **workouts** — leitura via `HKHealthStore` | Permissão do usuário por categoria de dado (não é OAuth de nuvem) | **On-device:** o app lê o que está no iPhone; sem API de nuvem. Requer app iOS nativo/Expo com entitlement HealthKit. App Store tem regras de uso de dado de saúde | Médio (só no app, por plataforma) | Grátis |
| **Google Health Connect** (Android, on-device) | Atividade, FC, sono, etc.; **substitui o Google Fit** (depreciado jul/2025; cadastro novo encerrado mai/2024) | Permissão do usuário no dispositivo | **On-device** no Android. Nuvem migra para a nova **Google Health API** (evolução do Fitbit) | Médio (só no app, por plataforma) | Grátis |
| **Fitbit Web API** | Atividade, FC, sono, passos | OAuth2 (migrando p/ Google OAuth) | **Sunset em set/2026**; tokens legados não transferem; substituída pela **Google Health API**. App Fitbit rebranded p/ Google Health (mai/2026) | Médio, mas **em migração** (risco) | Grátis |
| **Polar AccessLink v4** | Treinos, HRV, Nightly Recharge, Training Effect | OAuth2, self-serve, consentimento do usuário | Self-serve com credenciais de partner; usuário autoriza | Médio | Grátis [não confirmado] |
| **COROS** | Atividades (via apps 3rd-party suportados); acesso programático limitado | Parceria/consentimento | Acesso de API **restrito**; ecossistema mais fechado (partnership recente com Wahoo) | Alto (parceria) | [não confirmado] |
| **Suunto (apizone)** | Dados de treino do usuário | OAuth2 | Self-serve via portal Azure API Management; sem integração outbound madura | Médio | [não confirmado] |
| **Whoop API** | Recovery, strain, sono, workouts, FC | OAuth2, **API aberta** self-serve | Developer platform pública, madura, com MCP servers da comunidade | Médio | Grátis [não confirmado] |

Fontes por linha na seção **Fontes**.

---

## Agregadores (Terra / Vital / Rook / Spike)

A proposta é "uma integração, N fontes". Compara-se cobertura, preço e esforço:

| Agregador | Cobertura | Preço (com fonte) | Esforço / posicionamento |
|---|---|---|---|
| **Terra (tryterra.co)** | **500+ fontes** (Garmin, Fitbit, Apple Health, Oura, Whoop, Polar, Samsung, Strava, Suunto, Wahoo); ~5.000 métricas normalizadas; SDK React/Flutter/iOS/Android; WebSocket streaming | Modelo por **créditos**; plano Quick Start com **100k créditos**. Segundo análise de terceiro (Momentum, 2025): base **US$ 399/mês anual** ou **US$ 499/mês mensal** com 100k créditos, ~200 créditos/usuário/mês → **[preço de terceiro, não confirmado no site oficial]** | Menor esforço; foco em MVP/startup; melhor cobertura bruta |
| **Vital / Junction (tryvital.io)** | **300+ dispositivos** + lab testing (diferencial: exames laboratoriais em casa) | Por usuário: **US$ 0,50/usuário/mês, mínimo US$ 300/mês** (~US$ 3.600/ano de piso), descontos acima de 1.000 usuários — **[fonte terceira Momentum 2025, confirmar no site]** | Simples de precificar; forte se houver componente clínico/lab |
| **Rook (tryrook.io)** | **400+ dispositivos** numa integração; 50+ biomarcadores + health scores | **Usage-based**, pague pelo uso. Tiers: **Core** (até 750 usuários ativos), **Business** (até 15.000), **Enterprise** (custom). Valores em R$/US$ **não publicados** no material acessado — **[não confirmado]** | Foco em transformar sinal fragmentado em dado comparável; menos trabalho de normalização |
| **Spike (spikeapi.com)** | **300+ dispositivos**, tempo real; inclui fontes alternativas (Tesla, Spotify, Kindle) | Segundo análise terceira: **US$ 99-189/mês para até 1.000 usuários**, depois **US$ 0,10/usuário adicional** — ~75% mais barato que Terra para uso comparável — **[fonte terceira, não confirmado no site]** | Mais barato no volume inicial; bom custo-benefício para começar |

Leitura estratégica: **Terra** é o mais forte em cobertura e DX (ideal para lançar rápido). **Spike** é o mais barato no início. **Rook** e **Vital** brilham quando há biomarcador/clínico. Para o Leela (foco em atividade/treino esportivo, não clínico), a disputa real é **Terra vs. Spike**: cobertura+DX vs. custo.

> Nota de precificação: todos os números acima que vêm de blogs/análises de terceiros (Momentum, comparativos) estão marcados **[não confirmado]** porque as páginas oficiais de pricing usam "fale conosco"/créditos e não expõem tabela fixa verificável. Antes de decidir, pedir cotação oficial a Terra e Spike com a projeção de usuários do Leela.

---

## Regras e riscos

**1. Strava — o risco mais sério para o conceito de "desafios em grupo".**
O Agreement 2026 diz explicitamente: o dado de um usuário **só pode ser exibido, dentro do seu app, para esse próprio usuário**. Dado de outros usuários — **mesmo que público no Strava** — não pode ser exibido. Também é proibido usar o dado para analytics/insights, combinar com outros dados do cliente, ou usar em desenvolvimento/operação de IA. Implicação direta: **o Leela não pode montar um ranking/feed de desafio em grupo mostrando o treino Strava de um atleta para os outros atletas.** Cada pessoa vê o próprio treino; a comparação social precisa vir de dado que o Leela gere/derive por conta própria (ex.: check-in, distância auto-reportada, ou dado de uma fonte cuja licença permita), não do payload Strava exibido a terceiros. Se exibir "Powered by Strava", seguir as brand guidelines e não sugerir patrocínio/afiliação da Strava.

**2. Garmin — aprovação como gargalo.** Health/Activity API não são self-serve; exigem aplicação e revisão. Planejar lead time e ter plano B (agregador) enquanto a aprovação não sai.

**3. Fitbit/Google em migração.** Fitbit Web API encerra set/2026 e vira Google Health API. Não construir sobre Fitbit legado; se precisar de Fitbit, ir pela nova Google Health API ou por agregador que já abstraia a troca.

**4. Privacidade / LGPD.** Dado de treino é dado pessoal (e pode tocar dado sensível de saúde). Exige: consentimento explícito e granular por fonte, base legal, finalidade declarada, minimização (puxar só o necessário: tipo de atividade, distância, tempo — não necessariamente GPS bruto), direito de revogar e apagar. Alinhar com a política existente do roadmap (RN-144: export por 90 dias após deleção). On-device (HealthKit/Health Connect) reduz superfície porque o dado nem transita por servidor Leela sem ação do usuário.

**5. Dependência de terceiro (agregador).** Ao usar Terra/Spike, o Leela terceiriza um ponto crítico: se o agregador cair, sobe preço, ou perde um provider (ex.: quando a Strava restringiu, agregadores foram afetados), o Leela sente. Mitigação: manter a camada de integração atrás de uma **interface própria** (como já se faz com `PaymentProvider`), para trocar de agregador ou cair para OAuth direto sem reescrever o app.

---

## Recomendação para o Leela (menor investimento / maior alcance)

Estratégia de **três camadas**, do mais barato/rápido ao mais completo, atrás de uma abstração `TrainingProvider` (espelhando o padrão `PaymentProvider` do roadmap):

1. **Health nativo no app (grátis, on-device) — base V1.** No E13 (Expo), ler **Apple HealthKit** (iOS) e **Google Health Connect** (Android). Custo zero, sem aprovação, dá "treinos num lugar só" para a maioria dos atletas com smartwatch sincronizado ao telefone. É o alcance máximo pelo menor investimento.
2. **Strava OAuth direto (grátis) — complemento social do indivíduo.** Alto reconhecimento no público de corrida/ciclismo. **Mas** por causa dos termos 2026, usar Strava apenas para **exibir ao próprio atleta** seus treinos dentro do app — **não** para alimentar rankings de desafio entre pessoas. Ranking/desafio em grupo deve usar dado próprio do Leela (check-in/auto-report), não o payload Strava.
3. **Um agregador (Terra ou Spike) — cobertura da cauda longa.** Para Garmin, Polar, COROS, Suunto, Whoop, Fitbit/Google sem implementar cada OAuth e sem esperar aprovação da Garmin. Entra quando a V1 validar demanda. Escolha inicial recomendada: **Spike** por custo de entrada, ou **Terra** por cobertura/DX — decidir com cotação oficial.

O que entra na **V1**: camadas 1 (Health nativo) + 2 (Strava individual). O agregador (camada 3) fica como fast-follow, plugável na mesma interface, quando houver volume que justifique o custo recorrente. Isso cumpre a visão do fundador (só integração, sem tracking próprio, sem investimento pesado) e evita o risco Strava desde o desenho.

---

## Amarração ao roadmap

Nova capability transversal: **"Integrações de treino"** (mesma natureza de `PaymentProvider`/`Notificações` — referenciada por épicos, com interface `TrainingProvider` em `packages/core` + implementações em `packages/api-client`).

- **Onda / épico:** o consumo vive no **E13 App do Atleta (Onda 4)**, onde "treinos + ingressos + desafios num lugar só" aparece para o usuário. HealthKit/Health Connect são intrinsecamente app-side (Expo), então casam com o E13.
- **Impacto no core / api-client:** definir `TrainingProvider` (métodos `connect()`, `listActivities()`, `subscribeWebhook()`), tipos normalizados de atividade e a política de consentimento LGPD em `packages/core`; implementações concretas (HealthKitProvider, HealthConnectProvider, StravaProvider, e depois AggregatorProvider) em `packages/api-client`. Webhooks Strava e ingestão de agregador, se usados, entram como Cloud Functions (mesma pasta `functions/` dos webhooks de pagamento).
- **Ajuste de sequência sugerido:** adicionar ao E13 stories de "conectar conta de treino" (OAuth/permissão on-device), "ver meus treinos", e — separada e explicitamente — "desafio em grupo com dado próprio do Leela" (para não violar os termos Strava). Marcar a camada agregador como **Could** (H2), pois adiciona custo recorrente.
- **Decisão em aberto a registrar** (mesmo espírito das decisões do README): **qual agregador** (Terra vs. Spike vs. Rook vs. Vital) e **se/quando** entra — escolher com cotação oficial e projeção de usuários; até lá, V1 roda só com Health nativo + Strava individual.

---

## Fontes

Todas acessadas em 2026-07-02.

**Strava**
- Getting Started — https://developers.strava.com/docs/getting-started/
- Authentication (OAuth2, escopos) — https://developers.strava.com/docs/authentication/
- Webhook Events API (1 subscription/app) — https://developers.strava.com/docs/webhooks/
- Rate Limits (200/15min, 2.000/dia) — https://developers.strava.com/docs/rate-limits/
- Brand guidelines — https://developers.strava.com/guidelines/
- API Agreement (2026) — https://www.strava.com/legal/api
- API Policy (2026) — https://www.strava.com/legal/api_policy
- Suporte: "How Data Appears on 3rd Party Apps" (só exibir ao próprio usuário) — https://support.strava.com/hc/en-us/articles/31798729397773-API-Agreement-Update-How-Data-Appears-on-3rd-Party-Apps

**Garmin**
- Connect Developer Program (overview) — https://developer.garmin.com/gc-developer-program/
- Health API — https://developer.garmin.com/gc-developer-program/health-api/
- Activity API — https://developer.garmin.com/gc-developer-program/activity-api/
- Guia (aprovação/dados) — https://openwearables.io/blog/garmin-connect-api-developer-guide-activities-health-metrics

**Apple HealthKit / Google Health Connect**
- What you can/can't do with HealthKit — https://www.themomentum.ai/blog/what-you-can-and-cant-do-with-apple-healthkit-data
- Apple Health + Android Health Connect (Google Fit depreciado jul/2025) — https://mindsea.com/blog/apple-health-android-health-connect-integration-platforms-for-health-wellness-and-fitness/
- Google Health API (evolução do Fitbit) — https://developers.google.com/health/about

**Fitbit / Polar / COROS / Suunto / Whoop**
- Fitbit Web API — https://dev.fitbit.com/build/reference/web-api/developer-guide/authorization/
- Fitbit Web API "next phase" (sunset set/2026) — https://community.fitbit.com/t5/Web-API-Development/Introducing-the-next-phase-of-the-Fitbit-Web-API/td-p/5821061
- Polar AccessLink v4 — https://www.polar.com/polar-api-v4/
- Polar guia (OAuth2) — https://openwearables.io/blog/polar-api-training-hrv-nightly-recharge-data
- COROS 3rd-party suportados — https://support.coros.com/hc/en-us/articles/360040256531-Supported-3rd-Party-Apps
- Suunto API (apizone, OAuth2) — https://apizone.suunto.com/
- Whoop Developer (OAuth2, API aberta) — https://developer.whoop.com/ · https://developer.whoop.com/docs/developing/oauth/

**Agregadores**
- Terra — https://tryterra.co/ · pricing https://tryterra.co/pricing · docs pricing https://docs.tryterra.co/health-and-fitness-api/pricing · integrações https://tryterra.co/integrations
- Vital / Junction — https://tryvital.io/ · pricing https://www.tryvital.com/pricing
- Rook — https://www.tryrook.io/ · pricing https://www.tryrook.io/pricing · competitors https://www.tryrook.io/competitors
- Spike (via comparativos) — https://www.tryrook.io/blog/rook-vs-spike-api
- Análise build-vs-buy e preços de terceiros (marcados [não confirmado]) — https://www.themomentum.ai/blog/the-real-cost-of-wearables-integration-in-2025-build-vs-buy-analysis
- Comparativo de alternativas — https://openwearables.io/compare
