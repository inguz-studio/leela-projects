# STORIES-onda3 · User stories da Onda 3 (com âncora de JTBD)

> PROPOSTA revisável. Formato canônico de [[V1-CHECKLIST]]. **Toda story cita o JTBD servido** (`jobs-to-be-done.md`) — coluna obrigatória (L-004 / G-003). `[ ]` a fazer.
> Dimensões JTBD: **T** Transacional (H1) · **H** Heroica (H2) · **M** Marketplace (H2-H3) · **S** Social/identitária (transversal).
> As stories dos épicos E04/E09/E06/E12/E13/E17/E18 **já existem** nos arquivos `epics/`. Aqui recebem o **anchor de JTBD** + território + rota + delta de dependência da Onda 3 — não são re-planejadas. O aceite Given/When/Then canônico vive no épico citado.

---

## B1 · Robustez financeira/legal · ROTA FABLE (+ Opus UI) · review antagonista

### `S305` · Política de reembolso e transferência (config do organizador) · E04
**Como** organizador, **quero** configurar janelas, corte de 48h, SLA, flag de transferência e taxa, **para** ter uma política de reembolso digna e regulável por evento.
- **JTBD servido:** T · doc: *"Preciso cancelar uma inscrição → Estornar com confirmação e histórico claro → processo de reembolso digno e sem duplicar dinheiro"* (04.1, Organizador/Admin — linha P1, ratificada D6). Dimensão **Transacional H1**.
- [ ] Aceite Given/When/Then canônico em `epics/LEELA-E04-config-vendas.md §S305` (T1 modelo `politicaVendas`+Rules+seed · T2 aba reembolso · T3 transferência/troca). **Só a política** (janelas/flags); a máquina é S904.
- **Território:** `packages/core/src/eventos/politica` + `functions/firestore.rules` (Fable) · `apps/painel/src/routes/eventos/[slug]/configuracoes` (Opus). **Dep:** E03-S200 ✅. **Destrava:** S904. **Gate:** adr-conformance ADR-011 (política por inscrito).

### `S306` · Exigências de saúde + versionamento de regulamento · E04
**Como** organizador, **quero** ativar exigências de saúde por flag e versionar o regulamento, **para** cumprir requisito regulatório sem coletar dado sensível desnecessário nem invalidar aceites antigos.
- **JTBD servido:** T · doc mais próximo: *"Compro inscrição → acompanhar... no mesmo lugar"* (04.1, visão unificada — o regulamento/saúde é enabler legal do job de inscrição, marcado como aproximação; sem linha própria no doc). Dimensão **Transacional H1** (conformidade que sustenta a inscrição).
- [ ] Aceite em `epics/LEELA-E04-config-vendas.md §S306` (T1 flags `exigenciasSaude`+campos de regulamento · T2 aba "Exigências e regulamento" · T3 subcoleção `saude` isolada). **RN-149:** nova versão de regulamento exige novo aceite dos inscritos futuros; antigos mantêm a versão que aceitaram.
- **PII (Rules):** dado de saúde é sensível (LGPD Art. 11, RN-147) — isolado na subcoleção `saude`, base legal = consentimento destacado, acesso restrito ao owner + admin (nunca afiliado/patrocinador), retenção + expurgo próprios. Flags `atestado`/`parq` default `false` (minimização RN-146).
- **Território:** `packages/core` + `functions/firestore.rules` (Fable, LGPD) · `apps/painel` config (Opus). **Dep:** S305; `EVENTO-CAMPOS` ✅ (capa+regulamento já persistem — só falta o **versionamento** RN-149, registrado como fio pendente no kanban). **Gate:** adr-conformance + review antagonista (dado sensível).

### `S307` · Capacidade de lote editável (reabrir vagas) · E04 (RN-304, backlog aprovado 2026-07-17)
**Como** organizador, **quero** reabrir/editar as vagas de um lote pelo painel admin, vendo quanto foi vendido, quanto está disponível e quanto foi configurado, **para** voltar um lote à venda sem que a vaga cancelada volte sozinha (o ratchet automático é mantido).
- **JTBD servido:** T · doc: *"Publico evento → Configurar lotes e preços automáticos"* (04.1, Organizador — a edição de capacidade é o controle manual sobre o lote). Dimensão **Transacional H1**.
- [ ] Dado um lote, quando edito a capacidade no painel, então vejo `vendido` / `disponível` / `configurado`; posso aumentar e salvar; **reduzir abaixo do vendido é negado**; escrita **só via Function + auditoria** (verbatim do Vitor, 2026-07-17, RN-304). Aceite canônico em `epics/LEELA-E04-config-vendas.md §S307`.
- **Território:** `functions/` (Function + auditoria + Rules, Fable) · `apps/painel` editor de lote (Opus). **Dep:** `LEELA-BEPEND` (S209-T2, em andamento — pós, como registrado). **Gate:** review antagonista (edita capacidade de venda — integridade).

### `S904` · Máquina completa de reembolso + estorno + notificações + transferências · E09
**Como** organizador, **quero** a máquina de estados de reembolso com fila de análise, estorno executado e notificações, mais a troca de titularidade/ingresso, **para** operar pós-venda com dignidade e auditoria.
- **JTBD servido:** T · doc: *"Preciso cancelar uma inscrição → Estornar com confirmação e histórico claro"* (04.1, P1) + *"Processo repasse → ver saldo... operação escalável"* (04.1, Admin — o pós-venda fecha a máquina financeira). Dimensão **Transacional H1**.
- [ ] Aceite em `epics/LEELA-E09-financeiro-profissional.md §S904` (T1 subcoleção `reembolsos` + máquina `solicitado→(aprovado_auto|em_analise)→aprovado|recusado→estornado` RN-341 por inscrito + fila do organizador · T2 execução de estorno via `PaymentProvider.refund` + clawback RN-346 · T3 notificações RN-342 · T4 `transferencias` + `titularHistorico[]` + kit/chip RN-345).
- **Reuso:** FABLE-B ✅ (estorno idempotente por inscrito) é o primitivo — S904 orquestra a política de S305 sobre ele; **não reimplementar estorno**. Máquina opera **por inscrito** no pedido em grupo (ADR-011).
- **Território:** `functions/finance` + `functions/firestore.rules` + `packages/core` (Fable) · `apps/painel/src/routes/eventos/[slug]/financeiro` (fila/telas, Opus). **Dep:** S305, FABLE-B ✅, ADR-011 ✅. **Gate:** adr-conformance ADR-011 + ADR-014 (cifra onde tocar repasse) + review antagonista (idempotência/dinheiro).

---

## B2 · Web discovery + link-in-bio público · ROTA OPUS (+ Fable reader)

### `S1205` · SEO técnico fino (metadata dinâmica, OG, JSON-LD, sitemap, robots) · E12
**Como** atleta anônimo, **quero** encontrar o evento pelo Google e ver preview rico ao compartilhar, **para** descobrir e me inscrever em poucos cliques.
- **JTBD servido:** T · doc: *"Descubro evento → Me inscrever em poucos cliques"* (04.1, Atleta — a descoberta orgânica é o "quando" do job). Dimensão **Transacional H1**.
- [ ] Aceite em `epics/LEELA-E12-landing.md §S1205` (T1 `generateMetadata` dinâmica + OG/Twitter + JSON-LD Event · T2 sitemap/robots). Canonical = `{leela-domain}/{slug}`; `publica` ⇒ `robots:noindex`, `indexavel` ⇒ indexável (RN-140).
- **Território:** `apps/landing` (Opus). **Dep:** E12-S1201 ✅; `{leela-domain}` (ação externa — canonical usa placeholder até fixar). **Data-layer:** SSR/ISR, sem cache de cliente.

### `S1702` · Capas de clube e de evento · E17
**Como** organizador/coordenador, **quero** subir uma capa para meu clube e meus eventos, **para** que apareçam com identidade em todas as superfícies.
- **JTBD servido:** S · doc: *"Falo com patrocinador → Ser visto como profissional"* (04.4, Organizador/Coordenador). Dimensão **Social**.
- [ ] Aceite em `epics/LEELA-E17-perfil-social.md §S1702` (T1 `capaUrl` + upload no painel, clube e evento · T2 render nos cards/hero com fallback gradiente, RN-166).
- **Território:** `apps/painel` (upload) + `apps/landing`/`packages/design-system` (render, Opus). **Dep:** `EVENTO-CAMPOS` ✅ (capa de evento já persiste — estende a clube; fecha o follow-up "hero cover = gradiente quando sem URL"). **Sinergia:** habilita as capas que S1700 consome.

### `S1700` · Perfil público / link-in-bio `@handle` (SSR/ISR) · E17
**Como** organizador (Onda 3; atleta na Onda 4), **quero** um perfil público em `{leela-domain}/@{handle}` que reúna meu feed, meus eventos e meus clubs, **para** ter um link único compartilhável que me faz descoberto.
- **JTBD servido:** S+M · doc: *"Olho meu perfil → identidade, não consumo"* (04.4) + *"Aparecer na vitrine → ganhar visibilidade"* (04.3, aproximação — vitrine é do Prestador, marcada). **Candidato P7** (ver `JTBD-TRACE-onda3.md §2`): *"Compartilho quem eu sou → link único"*. Dimensão **Social/Marketplace**.
- [ ] Aceite em `epics/LEELA-E17-perfil-social.md §S1700` (T1 rota SSR/ISR `/@{handle}` + `getPublicPerfil` gate RN-161 · T2 componentes das 3 abas Feed·Eventos·Clubs · T3 estados + bloco compartilhar URL+QR). Perfil `privada`/handle inexistente ⇒ 404. `@handle` `@[a-z0-9_]{3,30}` imutável + reservados (RN-160, ratificado).
- **PII (Rules):** `perfis/{handle}` leitura pública gated por `visibilidade` (RN-161); a aba Eventos lista só eventos publicados que a conta organiza + participações **opt-in** (RN-164/167, default oculto); a aba Clubs respeita `visibilidade` de cada clube (RN-165); clube `privada` não vaza.
- **Território:** `apps/landing/app/(public)/[handle]` (Opus) + `packages/api-client/src/public/getPublicPerfil` + `packages/core/src/public/perfil` + `functions/firestore.rules` (**Fable**, gate de PII). **Dep:** E12-S1200 ✅, S1702, **DN-1** (editor de perfil do organizador no painel — sem ele, não há `perfis` com dado real para renderizar). **Data-layer:** SSR/ISR, revalidação por tag `perfil:{handle}`. **Gate:** review antagonista (Rules de visibilidade/PII).

> **Fora da fatia Onda 3 (Onda 4, com E13):** S1701 (tematização por-usuário/accent RN-162), S1703/S1704 (Feed in-app leitura/composição), S1705 (abas in-app). O accent/tema por-usuário **não** entra na Onda 3.

---

## B3 · Assessorias parceiras · ROTA FABLE (provisionamento) + Opus painel

### `S1800` · Cadastrar assessoria como club parceiro (CNPJ/CPF) + vínculo se já tem conta · E18
**Como** organizador, **quero** cadastrar uma assessoria como club parceiro por CNPJ/CPF + e-mail do responsável, **para** dar condição de desconto e trazê-la à plataforma.
- **JTBD servido:** T+M · doc: *"Vendo com promotor → link rastreável"* (04.1 — aqui o gancho é **desconto**, não comissão) + *"Apoio evento → aparecer como apoiador"* (04.3, assessoria). **Candidato P6** (`JTBD-TRACE-onda3.md §2`): *"Quero crescer o evento → cadastrar assessorias como clubes parceiros com desconto"*. Dimensão **Transacional H1 + Marketplace**.
- [ ] Aceite em `epics/LEELA-E18-assessorias-parceiras.md §S1800` (T1 form no painel + validação de documento no core · T2 Function `vincularAssessoriaExistente` idempotente por documento, RN-361/362 + Rules). Dedupe por documento no tenant; CNPJ/CPF inválido ⇒ erro inline.
- **Território:** `packages/core/src/assessoria/documento` + `functions/` + Rules (Fable) · `apps/painel` form (Opus). **Dep:** E05 ✅ (clube), E16 ✅ (termos). **Gate:** review antagonista (cria clube/parceria).

### `S1801` · Convite por e-mail + provisionamento automático da conta no aceite · E18
**Como** organizador, **quero** que, se o responsável não tem conta, ele receba convite e, ao completar o cadastro, a conta + o club parceiro nasçam automaticamente, **para** trazer a assessoria sem atrito.
- **JTBD servido:** T · doc: *"Vendo com promotor"* (04.1) / *"Apoio evento"* (04.3). **Candidato P6**. Dimensão **Transacional H1**.
- [ ] Aceite em `epics/LEELA-E18-assessorias-parceiras.md §S1801` (T1 dispara convite reusando `enviarConvites`+`origem`/`parceriaRef` · T2 página pública de aceite na landing · T3 Function `provisionAssessoriaAccount` atômica: Auth + clube + parceria, idempotente por `emailKey`/documento, RN-363). Reabrir o convite não duplica conta nem clube; convite expirado ⇒ estado + reenvio.
- **PII/segurança:** provisionamento atômico e idempotente — cobertura no emulador (padrão E16-S1601). **É o único risco real do épico.**
- **Território:** `functions/` (Auth/provisionamento) + Rules (Fable) · `apps/landing/app/(public)/convite` (Opus). **Dep:** S1800, E00 Auth ✅, EmailProvider (ação externa — disparo físico quando existir; até lá, sandbox). **Gate:** review antagonista (provisiona conta — idempotência).

### `S1802` · Condição de desconto do club parceiro (via cupom, sem split) · E18
**Como** organizador, **quero** definir a condição de desconto exclusiva do club parceiro, **para** que os atletas da assessoria tenham vantagem no checkout sem eu pagar comissão.
- **JTBD servido:** T · doc: *"Publico evento → configurar lotes e preços"* (04.1 — cupom é pricing; gancho = desconto). Dimensão **Transacional H1**.
- [ ] Aceite em `epics/LEELA-E18-assessorias-parceiras.md §S1802` (T1 editor da condição → cupom `escopo='club_parceiro'`+`clubeRef`, RN-364 · T2 checkout resolve reusando `validateCoupon`, sem split RN-360). `commercialTerms` (retenção % + D+N, RN-365) operam sobre o pós-desconto, sem alterar máquina.
- **Território:** `packages/core` (cupom/checkout) + Rules (Fable) · `apps/painel` editor (Opus). **Dep:** S1800, E04-S300 ✅ (cupom), E16-S1602 ✅ (termos). **Gate:** review antagonista (pricing/cupom).

### `S1803` · Gestão da parceria (lista, status, encerrar) · E18
**Como** organizador, **quero** ver e gerenciar minhas assessorias parceiras, **para** acompanhar quem está ativo e encerrar quando preciso.
- **JTBD servido:** S · doc: *"Falo com patrocinador → Ter dados na mão"* (04.4, Organizador). Dimensão **Social**.
- [ ] Aceite em `epics/LEELA-E18-assessorias-parceiras.md §S1803` (T1): lista densa §2.5 com status/documento/condição + busca/filtro/EmptyState; encerrar = ConfirmModal §2.15 + disclaimer + retenção 90d (RN-144).
- **Território:** `apps/painel` (Opus). **Dep:** S1800.

### `S1804` · Modo cupom-only (evento fechado) → encaixe E04/S300 (RN-345) · Could
**Como** organizador, **quero** um modo em que inscrições só acontecem via cupom, **para** rodar eventos fechados/por convênio (padrão TicketSports), inclusive amarrados a assessorias.
- **JTBD servido:** T · doc: *"Configurar lotes e preços"* (04.1 — modo de venda). Dimensão **Transacional H1**.
- [ ] Aceite em `epics/LEELA-E18-assessorias-parceiras.md §S1804` (T1): flag `vendaSomentePorCupom` no evento + guard no checkout E12; sem cupom válido ⇒ inscrição bloqueada ("evento fechado — informe seu cupom"); modo desligado ⇒ comportamento atual preservado.
- **Território:** `packages/core` (core do gate) + guard do checkout (Fable). **Dep:** E04-S300 ✅, E12 checkout ✅. **Nota:** pertence a **E04/S300** (modo de venda); documentada no E18 por ser o caso de uso principal. **Gate:** review antagonista (gate de venda).

---

## B4 · Scheduler de campanhas · ROTA FABLE (cron)

### `S402` · Automações por gatilho + dispatch agendado (ADR-015) · E06
**Como** organizador, **quero** automações que disparam sem ação manual e campanhas que saem no horário agendado, **para** comunicar em momentos-chave sem virar operador de envio.
- **JTBD servido:** T+H · doc: *"Assessoria manda treino → Receber dentro do app → Eliminar WhatsApp"* (04.2, família do job de comunicação in-app; lado organizador = disparar sem operar). Persona: dor *"comunicação fragmentada"* (personas 03.1). Dimensão **Transacional H1 + Heroica**.
- [ ] **S402** aceite em `epics/LEELA-E06-marketing.md §S402` (T1 `automacoes/{id}` por gatilho novo_inscrito/kit_disponivel/vespera/pos_evento + Function de disparo idempotente + Rules · T2 toggle no painel).
- [ ] **Scheduler `agendada` (ADR-015):** Cloud Scheduler cron → Function varre `campanhas.status='agendada'` com `agendadaPara<=now`, dispara idempotente (marca `enviadaEm`, reusa o log de comunicação FABLE-G ✅ — mesmo agregado, não um 2º log).
- **Território:** `functions/` (cron + Function + Rules, Fable) · `apps/painel` toggle de automação (Opus). **Dep:** E06-S401 ✅, FABLE-G ✅. **Gate:** adr-conformance ADR-015 + review antagonista (idempotência de disparo — não enviar duas vezes).

---

## B5 · App do atleta E13-slim · ROTA OPUS (mobile) + Fable (Functions)

> Recorte nativo já em `V1-CHECKLIST §Onda 3 · App simples`. Persona: **Atleta** (mock Corrida Perfeita Sul). Tom `tom-de-voz.md` (Kepry/"Volte amanhã"). Alvo mobile-first **390×844**. Jornada heroica (Arena/desafios/medalhas/perfil completo) = **Onda 4**.

### `S1300` · Setup Expo + pipeline EAS · **Must** · L
- **JTBD servido:** enabler de plataforma do atleta (sem linha de usuário direta — honesto; sustenta todos os jobs do app). Aceite em `epics/LEELA-E13-app-atleta.md §S1300`.
- [ ] T1 bootstrap `apps/mobile` (Expo Router + core/DS RN) · T2 EAS Build/Submit + Sentry mobile + credenciais das lojas.
- **Território:** `apps/mobile` (Opus). **Dep:** E00 ✅, E01 ✅, **A1** (enrollment das lojas — ação externa). **Gate:** adr-conformance ADR-010.

### `S1302` · Tab navigator (5 itens) + safe area + deep linking · **Must** · M
- **JTBD servido:** enabler de navegação. Aceite `§S1302`.
- [ ] T1 tab navigator + safe area + deep linking. **Território:** `apps/mobile` (Opus). **Dep:** S1300.

### `S1301` · Provisionamento de atleta + login Apple/Google · **Must** · L
- **JTBD servido:** enabler de identidade (04.4 "olho meu perfil → identidade" — o login abre a identidade do atleta). Aceite `§S1301`.
- [ ] T1 Function `onAtletaCreate` no 1º login + Rules · T2 telas de onboarding + entrada (Apple obrigatório na App Store + Google) + gate de sessão.
- **Território:** `functions/` + Rules (**Fable**, provisiona conta) · `apps/mobile` telas (Opus). **Dep:** S1300, ADR-008 (Auth). **Gate:** review antagonista (provisiona conta).

### `S1304` · Descoberta: feed de eventos + busca · **Must** · M
- **JTBD servido:** T · doc: *"Descubro evento → Me inscrever em poucos cliques"* (04.1, Atleta). Aceite `§S1304`.
- [ ] T1 feed de eventos + busca + filtros (aba Eventos). **Território:** `apps/mobile` (Opus). **Dep:** S1302.

### `S1305` · Detalhe do evento + seleção modalidade/kit · **Must** · M
- **JTBD servido:** T · doc: *"Descubro evento → me inscrever"* (04.1). RN-200/202/216/211 (kit, nunca "tier"). Aceite `§S1305`.
- [ ] T1 tela de detalhe + seleção. **Território:** `apps/mobile` (Opus). **Dep:** S1304.

### `S1306` · Checkout (Stepper + cupom + pagamento) + meus ingressos/QR · **Must** · XL
- **JTBD servido:** T · doc: *"Descubro evento → me inscrever em poucos cliques"* + *"Compro inscrição → acompanhar kit, pagamento e resultado no mesmo lugar"* (04.1, Atleta). Aceite `§S1306`.
- [ ] T1 `inscricoes` do atleta + Function de conversão + Rules (reusa kernel `pedidos` ADR-011 ✅ + `PaymentProvider` sandbox ✅ — **não** redefine agregado) · T2 tela de checkout (Stepper + cupom + pagamento) + "Meus ingressos" + QR do ingresso (leitura `qrToken`/`checkinEm`, RN-221/222 — nunca escreve status).
- **PII (Rules):** `pedidos`/`inscricoes` lidos só pelo responsável/atleta dono (ADR-011); estado financeiro só por Function.
- **Território:** `functions/finance` (conversão, **Fable**) · `apps/mobile` Stepper/telas (Opus). **Dep:** S1305, S1301, kernel `pedidos` ✅. **Gate:** adr-conformance ADR-011 + review antagonista (checkout/dinheiro).

### `S1310` · Entrar no clube (código/link) + página do clube (membro) · **Must** · M
- **JTBD servido:** S · mapa Clubs *"pertencimento a comunidade local"* + doc 04.4 identidade. RN-101/140. Aceite `§S1310`.
- [ ] T1 entrar por código (8A3K9)/link + página do clube (membro). **Território:** `apps/mobile` (Opus). **Dep:** S1301, E05 ✅.

### `S1311` · Feed do clube (leitura) · **Must** · M
- **JTBD servido:** H · doc: *"Vejo amigos ativos → sentir que estamos na mesma jornada"* (04.2, pertencimento). Aceite `§S1311`.
- [ ] T1 modelo `feed` do clube + Function de agregado + Rules · T2 tela do feed (leitura — ver mural, **sem** compor/postar; write = Onda 4).
- **Território:** `functions/` (model/agregado, **Fable**) · `apps/mobile` tela (Opus). **Dep:** S1310.

### `S1312` · Push FCM: token + entrega + inbox · **Must** · M
- **JTBD servido:** H · doc: *"Assessoria manda treino → Receber dentro do app → Eliminar WhatsApp"* (04.2, Atleta). RN-133/134. Aceite `§S1312`.
- [ ] T1 registro de push token (FCM) + entrega de comunicado + Rules · T2 permissão de push + inbox de comunicados + leitura.
- **Território:** `functions/` + Rules (**Fable**) · `apps/mobile` inbox (Opus). **Dep:** S1301, E05 ✅ (comunicados).

> **Extensão Could (P4):** `S1315` (reembolso self-service, dep S904) · `S1316` (transferência self-service, dep S305) sobem para o app só após B1 aterrissar; senão adiam para a Onda 4. `S1314` (ingresso/QR) já coberto em S1306-T2.

---

## Nota de honestidade (L-004 · zero órfã)
Todas as stories de B1-B5 citam uma linha de `jobs-to-be-done.md` (rotulada "doc:") ou marcam a aproximação. Exceções honestas (enablers sem linha de usuário direta): `S1300` (setup de plataforma), `S1302` (navegação) e o `Scheduler` (infra de disparo) — marcados em vez de forjar um job. Dois **candidatos novos** seguem o precedente P1-P5: **P6** (assessoria parceira) e **P7** (link-in-bio "compartilho quem eu sou") — propostos em `JTBD-TRACE-onda3.md §2`, **não** aplicados a `jobs-to-be-done.md` até ratificação. Zero RN inventada fora dos blocos ratificados 160-167/360-365 e das séries livres já registradas (RN-149/304/345/341/342/345/346).
