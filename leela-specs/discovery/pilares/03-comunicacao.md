# PILAR 3 · Comunicação com a base (email + push/notificações)

> Discovery de referência para o ecossistema **Leela**. Foco: comunicados segmentados por clube/evento, na **voz do coordenador** (nunca institucional), com **anti-spam** estrutural. Amarra-se ao **E06 Marketing Unificado** (Painel) e ao **E13 App do Atleta** (recebimento de push/inbox).
>
> Rastreabilidade: cada afirmação com fonte externa tem `[n]` que resolve na seção **Fontes** (URL + data de acesso). Nada inventado; onde não há fonte, é decisão de produto derivada dos épicos Leela.
>
> Datas de acesso: 2026-07-02.

---

## Contexto Leela (âncoras internas)

Regras de negócio já fixadas nos épicos que este pilar deve honrar:

- **RN-131** — Campanha tem 2 canais: `push`, `email` (ou ambos). *(E06)*
- **RN-132** — Campanha tem 2 origens: `manual` (Campanhas) | `automatizada` (Automações). *(E06)*
- **RN-133** — **Limite de 4 push/semana** por evento/clube, validado por Cloud Function. *(E06/E13)*
- **RN-134** — **Push ≤ 160 caracteres** no corpo. *(E06/E13)*
- **RN-135** — **Email suporta imagem de capa**; push não. *(E06/E13)*
- **RN-130** — Campanha tem 3 estados: `enviada` | `agendada` | `rascunho`.
- Segmentação canônica: `todos_inscritos` · `por_modalidade` · `por_kit` · `por_status` · `por_engajamento` (E06); no app, comunicado do clube chega por **FCM** com inbox e badge de não lidos (E13-S1312).
- Canal **push é FCM**; **WhatsApp Business API** está fora de escopo nesta fase (contrato de canal `push`/`email`; WhatsApp entra depois via Notificações). *(E06 "Fora de escopo", E13 "Won't")*
- Tom: **coordenador/assessoria**, não institucional; **anti-streak / "Volte amanhã"** (Kepry); nunca punir a ausência.

Este discovery valida essas escolhas contra o mercado e aponta onde apertar.

---

## Players/ferramentas de referência

**Email (transacional + segmentado)**
- **SendGrid (Twilio)** — API de alto volume; IP pools separados por subuser/categoria (transacional vs. marketing); foco em velocidade/entrega. [1][7]
- **Resend** — ESP developer-first (React Email, API limpa); referência prática das exigências Gmail/Yahoo 2024. [8]
- **Postmark** — referência de best practices transacionais e separação de streams (transactional vs. broadcast). [4]
- **Mailchimp / Mandrill** — força em segmentação comportamental, automações e engajamento; API rica para audiência. [1][7]
- **Customer.io** — messaging comportamental orientado a eventos, journeys, webhooks e triggers em tempo real; developer-heavy, setup em dias, pricing transparente; email + push + SMS. [10]
- **Braze** — enterprise, orquestração multicanal (push + email + in-app) a partir de um perfil único; exige contato comercial. [10]

**Push mobile**
- **Firebase Cloud Messaging (FCM)** — gratuito, sem limite de mensagens/assinantes; é a camada de entrega Android que OneSignal, Novu e Knock usam por baixo. [3][5]
- **OneSignal** — camada sobre FCM/APNs com **frequency capping**, quiet hours e preferências por canal prontas de fábrica. [2][5][6]
- **Pushwoosh / Airship** — orquestração de push com timing comportamental. [2]

**WhatsApp (BR, canal futuro)**
- **API Oficial (Meta) via BSPs** (Zenvia, Blip, etc.) — templates por categoria (Marketing/Utility/Authentication/Service), opt-in obrigatório, cobrança por conversa. [9][13]

---

## O que fazem bem

- **Separação transacional × marketing.** Bons players nunca compartilham IP pool/stream entre transacional e promocional — protege reputação e entrega do que é crítico (confirmação de inscrição, kit pronto). [1][4][7]
- **Automação vence broadcast.** Mensagens automatizadas tiveram +24% de open rate, 6× mais clique e 19× mais conversão que campanhas regulares em 2025 — 2% do volume, 30% da receita de email. [1]
- **Personalização com dado real.** Ir além de `{nome}`: usar dado da transação (evento, kit, data, número da inscrição) confirma relevância e reduz marca de spam. [1]
- **Push contextual > push por horário fixo.** Push disparado pelo gatilho (ex.: 30 min após a ação) supera quase sempre o mesmo push num "horário ótimo" predeterminado. [2]
- **Preferências granulares.** OneSignal/FCM expõem opt-in/out por canal, frequency cap e quiet hours como controles de primeira classe. [2][3]
- **Primer antes do prompt nativo (iOS).** Tela in-app explicando o valor ("Avisamos quando seu kit estiver pronto") antes de pedir permissão do sistema eleva opt-in. [2]
- **Gamificação/comunidade sustentam retenção.** Strava levou a retenção de 90 dias de 18% → 32% com Challenges; o feed social é o epicentro do engajamento (14 bi de "kudos" em 2025, +20% a/a). [11][14]

---

## Mecânicas/padrões recorrentes

**Segmentação**
- Segmentar por comportamento e ciclo de vida (histórico, engajamento, status), não só demografia. [1][10]
- Journeys/gatilhos por evento em tempo real (novo cadastro, compra, abandono) — modelo Customer.io/Braze. [10]
- Casa direto com a segmentação Leela (`por_modalidade`/`por_kit`/`por_status`/`por_engajamento`).

**Automações/triggers**
- Boas-vindas, confirmação, "kit pronto", véspera, pós-evento como automações por gatilho — exatamente o eixo Automações do E06 (RN-132). [1][10]
- Timing relativo ao gatilho (offset), não hora fixa. [2]

**Limites de frequência**
- Comece com **2–3 push promocionais/semana por usuário**, separados dos triggered/transacionais. [2]
- **46% dos usuários fazem opt-out se recebem 2–5 mensagens sem relevância clara numa semana.** [2]
- Frequency capping + quiet hours para prevenir over-messaging. [2][6]
- → O teto **RN-133 de 4 push/semana** do Leela está **acima** do piso conservador de mercado (2–3); ver Recomendações.

**Personalização**
- Assunto claro e específico ao que o usuário fez; corpo com dado da transação. [1]
- Variáveis por membro (`{nome}`, `{proximo_evento}`) — já previstas no editor E06-S401-T3. [1]

**Deliverability (email)**
- Autenticar **SPF + DKIM + DMARC** (mínimo `p=none`); enviar de subdomínio transacional dedicado. [1][12]
- **Gmail/Yahoo (fev/2024, bulk = 5.000+/dia):** SPF+DKIM obrigatórios, DMARC publicado, **List-Unsubscribe one-click (RFC 8058)**, alinhamento do From com SPF/DKIM. [8][12]
- **Taxa de reclamação de spam < 0,3%** (meta < 0,1%; programas bem geridos operam 0,02–0,05%). Google endureceu de atrasos para **rejeições permanentes** em nov/2025. [8][12]
- Unsubscribe deve funcionar em 1 POST (sem login/confirmação), URL HTTPS, processado em ≤ 2 dias. [8]

**LGPD (BR)**
- Base legal: **consentimento** (autorização clara) ou **legítimo interesse** (usado com cautela, para comunicação informativa/relacionamento prévio). [15][17]
- **Opt-in informado e específico**: caixa pré-marcada ou letra miúda não é consentimento válido. Single opt-in basta na maioria dos casos; double opt-in dá camada extra. [15][16]
- **Opt-out livre, fácil e a qualquer tempo**, sem burocracia. [15][16]
- Vale para email, SMS, WhatsApp e push. [17]

**WhatsApp BR (canal futuro)**
- Opt-in explícito obrigatório; envio sem consentimento bloqueia o número mesmo na API oficial. [9][13]
- Templates de Marketing exigem aprovação; evitar gatilhos ("Garantido!", "100% grátis", "Última chance"); incluir opt-out ("PARAR"). [13]
- Custo por conversa (Marketing ~R$0,30; Utility/Auth ~R$0,03) — favorece Utility/transacional. [9]

---

## Gaps e oportunidades

1. **Teto de 4 push/semana pode ser alto.** O piso de mercado é 2–3 promocionais/semana, e 46% fazem opt-out com 2–5 sem relevância. **Oportunidade:** contar no RN-133 apenas push promocional (Campanhas manuais), isentando transacional/triggered essencial. [2]
2. **Falta separar transacional de promocional no contrato de canal.** Épicos tratam "campanha" (push/email) mas o transacional crítico (confirmação de pagamento, kit pronto) deve ter stream/IP e regra de frequência próprios. [1][4]
3. **Deliverability não está explícita nos épicos.** Nenhum critério cita SPF/DKIM/DMARC, one-click unsubscribe ou teto de reclamação — obrigatórios para Gmail/Yahoo desde fev/2024. **Gap de compliance de entrega.** [8][12]
4. **LGPD/opt-in por canal ainda implícito.** RN-144 fala de export/consentimento de clube; falta granularidade de opt-in/out **por canal** (email vs push) e por clube. [15][17]
5. **Primer de push (iOS) não especificado.** E13 pede push mas não a tela primer antes do prompt nativo — perda de opt-in evitável. [2]
6. **Métrica de saturação ausente.** Épicos medem alcance/aberturas; falta monitorar opt-out rate e "frequency fatigue" em janelas de 30/60/90 dias. [2]
7. **Voz do coordenador é diferencial, mas sem guard-rails de compliance.** O tom pessoal (não institucional) ajuda engajamento, mas ainda precisa de rodapé de identificação do remetente + unsubscribe para não cair em spam. [1]

---

## Recomendações concretas para o Leela

Amarradas a **E06 (Marketing)** e **E13 (App do Atleta)**.

**Frequência (RN-133 · 4 push/semana)**
- **Manter o teto de 4/semana apenas para push promocional (Campanhas manuais).** Isentar transacional/triggered essencial (confirmação de inscrição, pagamento, kit pronto) da contagem — alinhado à separação transacional×marketing. [1][4]
- Adicionar **quiet hours** (não disparar madrugada) e, no médio prazo, frequency cap por atleta agregando clubes (o atleta pode estar em vários clubes). [2][6]
- Instrumentar **opt-out rate** por evento/clube em 30/60/90 dias como métrica de saúde, ao lado de alcance/aberturas do E06. [2]

**Push (RN-134 · ≤160 chars, FCM)**
- Manter o limite de 160 no corpo (validado por Function, já em E06-S401-T4) — coerente com prática de push curto e escaneável. [2]
- Especificar em E13 a **tela primer (iOS)** antes do prompt nativo de notificação, com copy na voz do coordenador ("Avisamos quando seu kit estiver pronto"). [2]
- Push **contextual pelo gatilho** (offset relativo), não hora fixa — reforça as Automações do E06 (RN-132). [2]
- Manter **FCM** como camada de entrega; se surgir necessidade de frequency cap/quiet hours/preferências ricas sem construir do zero, avaliar **OneSignal sobre FCM** (não troca de stack, é camada). [3][5]

**Email (RN-135 · capa; deliverability)**
- Manter capa só em email (RN-135) e **assunto específico ao gatilho** + dado da transação no corpo. [1]
- **Adicionar critérios de deliverability ao DoD de E06-S401-T4 (envio):** SPF+DKIM+DMARC (`p=none`+), **subdomínio transacional dedicado**, **List-Unsubscribe one-click (RFC 8058)** e monitor de reclamação **< 0,3%** (meta < 0,1%). Sem isso o envio quebra em Gmail/Yahoo. [8][12]
- **Separar stream transacional de broadcast** (IP/subuser distintos) na escolha do ESP. [1][4][7]

**Escolha de ferramentas (sugestão, não trava)**
- **Transacional/broadcast simples, developer-first:** Resend ou SendGrid (streams separados). [7][8]
- **Se o roadmap pedir journeys comportamentais multicanal (email+push) de verdade:** Customer.io é o melhor custo/benefício para estágio de crescimento (setup em dias, triggers por evento, webhooks) — encaixa no modelo de Automações do E06. [10]

**Voz do coordenador + anti-spam (transversal)**
- Manter a voz pessoal/assessoria, mas com **rodapé de identificação do remetente** (clube/coordenador) e **unsubscribe visível** em todo email — exigência de reputação, não enfraquece o tom. [1][8]
- Preservar o **anti-streak / "Volte amanhã"**: automações de reengajamento convidam sem punir (Kepry), coerente com a lógica de relevância que reduz opt-out. [2]

**LGPD (transversal)**
- **Opt-in informado e granular por canal** (email/push) e por clube; nada de caixa pré-marcada. [15][16]
- **Opt-out fácil e imediato** em email (one-click) e push (toggle por canal/clube no Perfil do app — E13). [15][16]
- Registrar base legal e data do consentimento junto do token/contato (auditável). [17]

**Para o futuro (WhatsApp)**
- Ao ativar WhatsApp, priorizar templates **Utility/transacional** (custo ~R$0,03, sem gatilhos de reprovação) e exigir opt-in explícito; Marketing só com consentimento e opt-out "PARAR". [9][13]

---

## Fontes (URL + data de acesso)

Acesso: 2026-07-02.

1. Mailchimp — Transactional Email Examples and Best Practices — https://mailchimp.com/resources/transactional-email-examples/
2. OneSignal — Push Notification Best Practices 2026 — https://onesignal.com/blog/onesignal-guide-push-notification-best-practices-2026/
3. OneSignal — Firebase Cloud Messaging (FCM) vs. OneSignal — https://onesignal.com/blog/firebase-vs-onesignal/
4. Postmark — Transactional email best practices (2026 update) — https://postmarkapp.com/guides/transactional-email-best-practices
5. Firebase Blog — Ensure your FCM notifications reach users on Android (abr/2025) — https://firebase.blog/posts/2025/04/fcm-on-android/
6. OneSignal — Prevent Over-messaging with Frequency Capping — https://onesignal.com/blog/prevent-overmessaging-frequency-capping/
7. Mailtrap — SendGrid vs Mailchimp: Design, Deliverability, Marketing — https://mailtrap.io/blog/sendgrid-vs-mailchimp/
8. Resend — Gmail and Yahoo bulk sending requirements for 2024 — https://resend.com/blog/gmail-and-yahoo-bulk-sending-requirements-for-2024
9. Huggy — Nova precificação do WhatsApp (4 categorias de cobrança) — https://blog.huggy.io/nova-precificacao-do-whatsapp/
10. GetVero — Braze vs Customer.io: Which Is Better in 2026 — https://www.getvero.com/resources/braze-vs-customer-io-which-is-better-in-2026/
11. StriveCloud — How Strava Drives App Engagement (gamification) — https://www.strivecloud.io/blog/app-engagement-strava
12. Google — Email sender guidelines (Gmail bulk sender requirements) — https://support.google.com/a/answer/81126?hl=en
13. NectarCRM — Regras e boas práticas para criar Templates Meta no WhatsApp (API Oficial) — https://ajuda.nectarcrm.com.br/hc/pt-br/articles/41846959726227-Regras-e-boas-pr%C3%A1ticas-para-criar-Templates-Meta-no-WhatsApp-API-Oficial
14. Visibrain — Strava: The Fitness App Taking Over Social Media — https://www.visibrain.com/blog/strava-the-fitness-app-taking-over-social-media
15. Blip — Opt-in: o que é, tipos, como obter e boas práticas — https://www.blip.ai/blog/marketing/opt-in/
16. Certifiquei — Opt-in: como esse recurso do marketing se relaciona à LGPD — https://www.certifiquei.com.br/opt-in/
17. Notifica — LGPD e Notificações: Guia de Compliance para SMS, WhatsApp e Email — https://blog.usenotifica.com.br/blog/07-compliance-lgpd-notifications
</content>
</invoke>
