# ROADMAP-onda3 · Plano executável da Onda 3 (App simples + alavancas)

> PROPOSTA revisável (não promovida sozinha; a promoção aos canônicos vive num passo separado deste plano).
> Autor: **sf-cto** (DNA Fowler/DHH/Kleppmann). Padrão herdado da trilha `next-trail/` que serviu a Onda 2.
> Trace: `leela-plan-onda3` · Parent build: `leela-build-2d6ee98d` · Data: 2026-07-17.
> Terminologia canônica: [[MODELO-ROADMAP]] — **Onda → Épico → User Story → Task**. "Wave" aqui = **lote de execução** (agenda de sprint), nunca eixo de release.
> Convenções de ID/estimativa: [[ROADMAP]] §7. T-shirt: XS <0.5d · S 0.5-1d · M 1-2d · L 2-4d · XL módulo. Status: ✅ 🔄 📋 🧊 🚫.

---

## 0 · O que a Onda 3 entrega

A Onda 2 fechou o ciclo transacional do organizador (*descobre → inscreve → paga → organizador vê receita, estorna com dignidade, solicita repasse*). A Onda 3 faz três coisas, nesta ordem de valor:

1. **Robustez do dinheiro e da conformidade** — fechar a máquina completa de reembolso/transferência (E09-S904, sobre a política E04-S305), a exigência de saúde + versionamento de regulamento (E04-S306 / RN-149), a reabertura editável de vagas (E04-S307 / RN-304) e o SEO fino da landing (E12-S1205). É a dívida que sobrou dos recortes-slim.
2. **Alavancas de tração B2B e social** — assessorias parceiras (E18: organizador cadastra assessorias como clubes parceiros com desconto, sem split) e o link-in-bio público (E17, fatia Onda 3: perfil `@handle` SSR/ISR reusando E12 + capas).
3. **Superfície do atleta (E13-slim)** — o app nativo mínimo (Expo): descobrir → checkout → meus ingressos/QR → clube (leitura) → push. A jornada heroica completa (Arena/desafios/medalhas/feed-write/tema) fica na Onda 4.

O alvo primário é o **JTBD** (L-004): toda story em `STORIES-onda3.md` cita a linha de `jobs-to-be-done.md` que serve. Priorização = JTBD × horizonte × dependência, não ordem de tela.

| Bloco | Épicos/recortes | Natureza | Roteamento | MoSCoW |
|---|---|---|---|---|
| **B1 · Robustez financeira/legal** | E04-S305 · E04-S306 · E04-S307 · E09-S904 | modelo/pagamento/reembolso/rules/LGPD | **Fable** (core+Function) + Opus (config UI) | Must/Should |
| **B2 · Web discovery + link-in-bio** | E12-S1205 (SEO) · E17-S1702 (capas) · E17-S1700 (perfil público) | SSR/ISR landing + reader server-side | **Opus** (landing) + Fable (reader/Rules PII) | Should |
| **B3 · Assessorias parceiras** | E18-S1800 · S1801 · S1802 · S1803 · S1804(→E04) | provisionamento/cupom/rules | **Fable** (Function+core) + Opus (painel/aceite) | Should |
| **B4 · Scheduler de campanhas** | E06-S402 + dispatch ADR-015 | cron/Function/rules | **Fable** | Should |
| **B5 · App do atleta (E13-slim)** | S1300 · S1302 · S1301 · S1304 · S1305 · S1306 · S1310 · S1311 · S1312 | app nativo Expo + Functions | **Opus** (mobile) + Fable (conversão/push/auth) | Must (dentro do recorte) |

---

## 1 · Reconciliação de escopo (o que a Onda 3 é, de verdade)

O `ROADMAP.md §5` já dividia a Onda 3 em dois blocos ("Robustez e alavancas" + "App simples + tração"). Este plano os unifica sob uma única lista executável, sem mudar escopo:

- **"Robustez e alavancas"** (ROADMAP §5) = as fatias que sobraram dos recortes-slim da Onda 2: E09 restante (**S904** máquina completa de reembolso/transferência + **S305** política, que a Onda 2 empurrou — `V1-CHECKLIST §Onda 2` linha "S305/S306 → Onda 3"), **S306** (saúde/regulamento, RN-149 — o versionamento ficou pendente no lote `EVENTO-CAMPOS`, ver kanban), **S307** (capacidade de lote, RN-304, backlog aprovado 2026-07-17 pós-`LEELA-BEPEND`), e o **SEO fino** do E12 (S1205 — a Onda 2 entregou as superfícies públicas + checkout, deixando "SEO fino/afiliação = Onda 3", `MODELO-ROADMAP §3`).
- **"App simples + tração"** (ROADMAP §5) = **E18** (assessorias), **E17** fatia link-in-bio público, **E13-slim** (app do atleta nativo, recorte já listado em `V1-CHECKLIST §Onda 3 · App simples`).
- **Scheduler de campanhas (ADR-015)** = o E06 restante: a Onda 2 entregou o modelo `campanhas` com estado `agendada` mas **sem o cron que dispara** (`V1-CHECKLIST §Onda 2 · E06` linha "scheduler de agendamento... fica no modelo") e sem as automações por gatilho (**S402**, adiada explicitamente p/ Onda 3).

**Fora da Onda 3 (fica na Onda 4/5, sem mudança):** jornada heroica do E13 (S1303/S1307/S1308/S1309/S1313), feed-write + tematização por-usuário do E17 (S1701/S1703/S1704/S1705), split/afiliação (E08, cortado da V1), dashboards ricos de analytics (E11 telas).

---

## 2 · E13-slim é o app NATIVO (recorte), não uma superfície web — a decisão de leitura

`V1-CHECKLIST §Onda 3 · App simples` já registra E13-slim como o **app nativo Expo** (S1300 bootstrap + EAS, S1302 tab navigator, S1301 login Apple/Google, S1304/S1305 descoberta, S1306 checkout + meus ingressos/QR, S1310/S1311 clube + feed leitura, S1312 push FCM). **Este plano não reabre essa escolha** — a plataforma do E13 é React Native/Expo (`ROADMAP §2`, tooling contratado). O que a Onda 3 corta é a **jornada heroica** (Arena/desafios/medalhas/perfil-completo), não a plataforma.

Consequência de planejamento (lente Kleppmann — o dado sobrevive ao código; o app **lê** o kernel que a Onda 2 já escreveu):
- O checkout do app (S1306) **reusa** o kernel `pedidos/{id}` (ADR-011, ✅ construído em FABLE-A) e o `PaymentProvider` sandbox (✅) — **não** redefine agregado de dinheiro. Só adiciona o produtor de escrita móvel (`createInscricaoCharge` via callable), como o E12-L4 fez na web.
- "Meus ingressos/QR" (S1306-T2) **lê** `qrToken`/`checkinEm` — nunca escreve status de check-in (RN-221/222). PII do atleta lida só pelo dono (ADR-011 / Rules por coleção).

O custo real do E13-slim não é a UI — é **subir o pipeline nativo inteiro** (EAS Build/Submit + enrollment das lojas + Sentry mobile) para entregar o recorte. Isso tem lead time de negócio (contas Apple/Google), tratado como **ação externa** (ver `DECISOES-NECESSARIAS-onda3.md §A1`), no mesmo molde do KYC do Asaas. Por isso o B5 é sequenciado **por último** na Onda 3 e o enrollment começa **agora**, em paralelo, para não virar bloqueio.

---

## 3 · B1 · Robustez financeira/legal (ROTA FABLE + Opus UI)

Fecha a máquina de dinheiro que a Onda 2 deixou em aproximação estática. Money/legal → **Fable** no core+Function; a config screen → Opus. `⚔` = review antagonista (dinheiro/idempotência/LGPD). Gate **adr-conformance**: ADR-011 (por inscrito) em toda transição; ADR-014 (cifra de dados bancários) onde o estorno tocar dados de repasse.

| Story | Recorte | Épico | MoSCoW | T-shirt | Depende de | Rota | ⚔ |
|---|---|---|---|---|---|---|---|
| **S305** política de reembolso/transferência (config) | janelas 7d/48h, SLA, flag transferência, taxa | E04 | **Must** | L | E03-S200 ✅ | Fable(model/Rules) + Opus(3 telas) | ⚔ (política de dinheiro) |
| **S306** exigências de saúde + versionamento de regulamento | flags saúde (RN-146/147, LGPD Art. 11) + `regulamentoVersao`/novo aceite (RN-149) | E04 | **Should** | M | E04-S305, `EVENTO-CAMPOS` ✅ (campos já persistem) | Fable(model/Rules/LGPD) + Opus(1 tela) | ⚔ (dado sensível) |
| **S307** capacidade de lote editável (reabrir vagas) | aumentar/editar vagas do lote via painel; mostra vendido/disponível/configurado; reduzir < vendido negado | E04 | **Should** | M | `LEELA-BEPEND` (S209-T2, em andamento) | Fable(Function+Rules+auditoria) + Opus(editor) | ⚔ (edita capacidade — integridade de venda) |
| **S904** máquina completa de reembolso + estorno + notificações + transferências | `solicitado→(aprovado_auto\|em_analise)→aprovado\|recusado→estornado` (RN-341); estorno via `PaymentProvider.refund`; fila do organizador; `transferencias`+`titularHistorico[]` (RN-345); clawback RN-346 | E09 | **Should** | XL | **S305** (política), FABLE-B ✅ (estorno por inscrito — reusa), ADR-011 ✅ | Fable(Functions+Rules) + Opus(fila/telas) | ⚔ (idempotência/dinheiro) |

**Fronteira E04↔E09 (herdada dos épicos):** S305 entrega **só a política** (parâmetros/janelas/flags); S904 orquestra a **máquina + execução** sobre ela. A política incide **por inscrito** dentro do pedido em grupo (ADR-011), nunca sobre o pedido inteiro. FABLE-B (estorno idempotente por inscrito, ✅ Onda 2) é o primitivo que S904 orquestra — **não reimplementar estorno**.

---

## 4 · B2 · Web discovery + link-in-bio público (ROTA OPUS + Fable reader)

Barato, sobre a fundação da landing (E12 ✅). Entrega o link compartilhável (`@handle`) e as capas reusando o Next SSR/ISR. Território **`apps/landing`** (Opus) + **`packages/api-client`/`core`** reader (Fable, por causa do gate de PII do perfil). Não toca `apps/painel` exceto a tela de edição de perfil do organizador (ver `DECISOES-NECESSARIAS-onda3.md §DN-1`).

| Story | Recorte | Épico | MoSCoW | T-shirt | Depende de | Rota | ⚔ |
|---|---|---|---|---|---|---|---|
| **S1205** SEO técnico fino | `generateMetadata` dinâmica + OG/Twitter + JSON-LD Event + sitemap/robots | E12 | **Should** | M | E12-S1201 ✅ (páginas públicas), `{leela-domain}` (canonical — ação externa) | Opus (landing) | — |
| **S1702** capas de clube e evento | `capaUrl` + upload (painel) + render nos cards/hero com fallback gradiente (RN-166) | E17 | **Should** | S | `EVENTO-CAMPOS` ✅ (capa de evento já persiste) → estende a clube | Opus (painel upload + landing render) | — |
| **S1700** perfil público `@handle` (link-in-bio) | rota SSR/ISR `{leela-domain}/@{handle}` + abas Feed·Eventos·Clubs + leitor `getPublicPerfil` (RN-160/161) + bloco compartilhar | E17 | **Should** | L | E12-S1200 ✅ (leitor público), **S1702** (capas), **DN-1** (editor de perfil no painel) | Opus (landing) + **Fable** (reader `getPublicPerfil` + Rules PII opt-in RN-167) | ⚔ (Rules de visibilidade/PII do perfil) |

**Nota de escopo (fatia Onda 3):** o épico E17 é XL; a Onda 3 leva **só** a fatia pública barata (`S1702` → `S1700`). Tematização por-usuário (S1701), Feed in-app (S1703/S1704) e abas in-app (S1705) ficam na **Onda 4** (com o app E13). O accent/tema por-usuário (RN-162) **não** entra agora.

---

## 5 · B3 · Assessorias parceiras (ROTA FABLE provisionamento + Opus painel)

Tração B2B sem split (o parceiro recebe **desconto**, não dinheiro). É "clube (E05 ✅) + convite (E05-S104 ✅) + cupom (E04-S300 ✅) + provisionamento (E16/E00 ✅)" amarrados por uma parceria de assessoria. O risco fica todo em **idempotência do provisionamento** (S1801-T3), com cobertura no emulador (padrão E16-S1601). RN novas só no bloco ratificado **360-365**. `⚔` onde toca conta/cupom.

| Story | Recorte | Épico | MoSCoW | T-shirt | Depende de | Rota | ⚔ |
|---|---|---|---|---|---|---|---|
| **S1800** cadastro por CNPJ/CPF + vínculo se já tem conta | validação documento (core) + Function `vincularAssessoriaExistente` (RN-361/362) | E18 | **Should** | M | E05 ✅ (clube), E16 ✅ (termos) | Fable(Function/Rules/core) + Opus(form painel) | ⚔ (cria clube/parceria) |
| **S1801** convite + provisionamento atômico da conta | reusa `enviarConvites` (E05-S104 ✅) + Function `provisionAssessoriaAccount` atômica/idempotente (RN-363) + página pública de aceite | E18 | **Should** | M | S1800, E00 Auth ✅, EmailProvider (ação externa) | Fable(Function/Auth/Rules) + Opus(landing aceite) | ⚔ (provisiona conta — idempotência) |
| **S1802** condição de desconto do club parceiro (cupom, sem split) | cupom `escopo='club_parceiro'` (RN-364) + checkout resolve (reusa `validateCoupon`) respeitando `commercialTerms` (RN-365) | E18 | **Should** | S | S1800, E04-S300 ✅ (cupom), E16-S1602 ✅ (termos) | Fable(core cupom/checkout) + Opus(editor painel) | ⚔ (pricing/cupom) |
| **S1803** gestão da parceria (lista/status/encerrar) | lista densa §2.5 + encerrar = ConfirmModal §2.15 + retenção 90d (RN-144) | E18 | **Should** | S | S1800 | Opus (painel) | — |
| **S1804** modo cupom-only (evento fechado) → encaixe E04 | flag `vendaSomentePorCupom` (RN-345) + guard no checkout | E04/S300 | **Could** | S | E04-S300 ✅, E12 checkout ✅ | Fable (core do gate) | ⚔ (gate de venda) |

**Nota de encaixe:** `S1804` **pertence a E04/S300** (modo de venda), documentada no E18 por ser o caso de uso principal. Executa junto do B1 (é do E04) ou do B3 (consumidor) — território `packages/core` + guard do checkout; sem tela nova além do toggle.

---

## 6 · B4 · Scheduler de campanhas (ROTA FABLE cron)

O E06 da Onda 2 entregou o modelo `campanhas` (estado `agendada`) e o editor, mas **não** o cron que dispara nem as automações por gatilho. Território **`functions/`** (cron + Function) + toggle no painel (Opus). Gate **adr-conformance ADR-015** (cron/scheduler). `⚔` (idempotência de disparo — não enviar duas vezes).

| Story | Recorte | Épico | MoSCoW | T-shirt | Depende de | Rota | ⚔ |
|---|---|---|---|---|---|---|---|
| **S402** automações por gatilho | `automacoes/{id}` (novo_inscrito/kit_disponivel/vespera/pos_evento) + Function de disparo idempotente + toggle no painel | E06 | **Should** | M | E06-S401 ✅ (campanhas), FABLE-G ✅ (log) | Fable(Function/Rules) + Opus(toggle) | ⚔ |
| **Scheduler `agendada`** (ADR-015) | Cloud Scheduler cron → Function varre `campanhas.status='agendada'` com `agendadaPara<=now` e dispara idempotente (marca `enviadaEm`, reusa log FABLE-G) | E06 | **Should** | S | E06-S401 ✅ | Fable (cron/Function) | ⚔ |

---

## 7 · B5 · App do atleta E13-slim (ROTA OPUS mobile + Fable Functions)

O recorte nativo já listado em `V1-CHECKLIST §Onda 3 · App simples`. Território **`apps/mobile`** (Opus) + `functions/` (Fable: conversão, push, provisionamento de atleta). Gate **adr-conformance**: ADR-010 (TanStack Query RN no data-layer), ADR-011 (reuso do kernel `pedidos` no checkout). Sequenciado **por último** (depende do enrollment das lojas — ação externa A1). Mobile-first nativo, viewport primário **390×844**.

| Story | Recorte | MoSCoW | T-shirt | Depende de | Rota | ⚔ |
|---|---|---|---|---|---|---|
| **S1300** setup Expo + pipeline EAS | bootstrap `apps/mobile` + EAS Build/Submit + Sentry mobile | **Must** | L | E00 ✅, E01 ✅ (DS variante RN), **A1** (enrollment) | Opus | — |
| **S1302** tab navigator (5 itens) + safe area + deep linking | shell nativo | **Must** | M | S1300 | Opus | — |
| **S1301** provisionamento de atleta + login Apple/Google | Function `onAtletaCreate` + Rules + telas de entrada | **Must** | L | S1300, ADR-008 (Auth) | **Fable**(Function/Rules) + Opus(telas) | ⚔ (provisiona conta) |
| **S1304** descoberta: feed de eventos + busca | aba Eventos | **Must** | M | S1302 | Opus | — |
| **S1305** detalhe do evento + seleção modalidade/kit | RN-200/202/216/211 | **Must** | M | S1304 | Opus | — |
| **S1306** checkout (Stepper + cupom + pagamento) + meus ingressos/QR | reusa kernel `pedidos` (ADR-011 ✅) + `PaymentProvider` sandbox ✅; QR leitura (RN-221/222) | **Must** | XL | S1305, S1301, kernel `pedidos` ✅ | **Fable**(conversão/Function) + Opus(Stepper/telas) | ⚔ (checkout/dinheiro) |
| **S1310** entrar no clube (código/link) + página do clube (membro) | RN-101/140 | **Must** | M | S1301, E05 ✅ | Opus | — |
| **S1311** feed do clube (leitura) | modelo `feed` + agregado (Fable) + tela leitura (Opus); **sem** composição (write = Onda 4) | **Must** | M | S1310 | **Fable**(model/agregado) + Opus(tela) | — |
| **S1312** push FCM: token + entrega + inbox | RN-133/134 | **Must** | M | S1301, E05 ✅ (comunicados) | **Fable**(Function/Rules) + Opus(inbox) | — |

**Extensão Could (P4, premissa):** `S1314` (ingresso/QR já coberto em S1306-T2), `S1315` (reembolso self-service, dep S904) e `S1316` (transferência self-service, dep S305) sobem para o app **só depois** que B1 aterrissar S904/S305. Se o pipeline nativo não subir cedo, adiam para a Onda 4. B1 garante o servidor pronto para consumir; a UI self-service é opcional na Onda 3.

---

## 8 · Lotes de execução propostos (sequenciamento por dependência + território disjunto)

Cada lote = raia de território disjunto → paraleliza sem colisão de arquivos. Rota por lote: **Fable** (dinheiro/segurança/PII/rules/core) · **Opus** (UI/mecânico). **Sonnet proibido.**

```
Lote 1 · Robustez financeira (B1)          ROTA FABLE + Opus UI · território functions/+core+api-client + apps/painel/{eventos,financeiro}
   S305 (política) ─► S904 (máquina completa reembolso/transferência)   ── linchpin do dinheiro
   S306 (saúde/regulamento RN-149)  ∥ após S305 (mesmo evento, config)
   S307 (capacidade de lote RN-304) ∥ após LEELA-BEPEND (S209-T2)
   S1804 (cupom-only, E04) ∥ independente (core do gate)

Lote 2 · Web discovery + link-in-bio (B2)  ROTA OPUS landing + Fable reader · território apps/landing + core/api-client(reader) + apps/painel(upload capa/editor perfil)
   S1702 (capas) ─► S1700 (perfil público @handle)   ;   S1205 (SEO) ∥ independente
   DN-1: editor de perfil do organizador no painel (destrava S1700 com dado real)

Lote 3 · Assessorias parceiras (B3)        ROTA FABLE provisioning + Opus painel · território functions/+core + apps/painel + apps/landing(aceite)
   S1800 (cadastro+vínculo) ─► S1801 (convite+provisionamento) ─► S1802 (desconto) ─► S1803 (gestão)

Lote 4 · Scheduler de campanhas (B4)       ROTA FABLE cron · território functions/ + apps/painel(toggle)
   S402 (automações) ∥ Scheduler agendada (ADR-015)

Lote 5 · App do atleta E13-slim (B5)       ROTA OPUS mobile + Fable Functions · território apps/mobile + functions/
   S1300 ─► S1302 ─► S1301 ─► S1304 ─► S1305 ─► S1306 ─► S1310 ─► S1311 ─► S1312
   (enrollment das lojas = ação externa A1, começa AGORA em paralelo)
```

**Paralelização segura (territórios disjuntos):** Lote 1 (functions+painel/financeiro), Lote 2 (landing+painel/perfil), Lote 3 (functions+painel+landing/aceite), Lote 4 (functions/scheduler), Lote 5 (mobile) tocam **arquivos disjuntos** na maior parte. Pontos de contato a serializar por disciplina de review, não por colisão de arquivo:
- Lote 1 e Lote 3 ambos escrevem em `functions/` e `packages/core` — serializar os **commits Fable** (mesma raia de review de dinheiro), mas as pastas de domínio são distintas (`finance/`+`eventos/politica` vs `assessoria/`).
- Lote 2 e Lote 3 ambos tocam `apps/landing` — Lote 2 em `app/(public)/[handle]` + SEO; Lote 3 só a página de aceite `app/(public)/convite/*` — disjuntos.
- Lote 1 e Lote 5 ambos tocam `functions/finance` (S904 vs S1306 conversão) — S1306 **reusa** o kernel/`createInscricaoCharge` ✅; sem redefinição. Serializar review, não arquivo.

**O que cada lote destrava:**
- Lote 1 destrava a self-service do atleta (S1315/S1316) e a operação real de repasse (fecha a aproximação estática do FIX financeiro).
- Lote 2 destrava a descoberta orgânica (SEO) e a presença pública (link-in-bio) — o maior valor de aquisição com o menor custo.
- Lote 3 destrava a tração B2B (volume via assessorias).
- Lote 4 destrava a comunicação sem operador (campanhas no horário).
- Lote 5 destrava a superfície do atleta (retenção), gated pelo enrollment das lojas.

**Ordem de despacho recomendada:** `Lote 1` e `Lote 2` primeiro, em paralelo (dinheiro correto + aquisição barata). `Lote 3` e `Lote 4` em paralelo logo após (tração + comunicação). `Lote 5` por último (custo do pipeline nativo + lead time do enrollment, que começa já no dia 1).

---

## 9 · Grafo de dependências (sem ciclo)

```
E03-S200 ✅ ─► S305 ─► S904 ──► [self-service S1315/S1316 · Could]
   S305 ─► S306 (mesmo evento)
LEELA-BEPEND (S209-T2) ─► S307
FABLE-B ✅ (estorno por inscrito) ─► S904 (reusa, não reimplementa)

E12-S1200 ✅ ─► S1205 (SEO)
EVENTO-CAMPOS ✅ (capa evento) ─► S1702 (+ capa de clube) ─► S1700 (perfil público)
DN-1 (editor perfil painel) ─► S1700

E05 ✅ + E16 ✅ ─► S1800 ─► S1801 ─► S1802 ─► S1803
E04-S300 ✅ (cupom) ─► S1802 · S1804
E00 Auth ✅ ─► S1801 (provisionamento)

E06-S401 ✅ (campanhas) ─► S402 · Scheduler(ADR-015)

E00 ✅ + E01 ✅ (DS RN) ─► S1300 ─► S1302 ─► S1301 ─► S1304 ─► S1305 ─► S1306 ─► S1310 ─► S1311 ─► S1312
kernel `pedidos` ✅ (ADR-011, FABLE-A) ─► S1306 (checkout do app reusa)
A1 (enrollment lojas) ─► S1300 (build/submit)
```

Sem ciclos. Toda aresta é uma dependência de dado ou de gate, não de conveniência.

---

## 10 · Checks de planejamento (references/06-lessons — respondidos)

- **Camada de dados/cache por superfície nova:** E13-slim (Expo nativo) usa **Firestore SDK + TanStack Query (variante RN)** — mesmo padrão ADR-010 do painel, refetch invalidado por mutation (não SPA-sem-cache). Link-in-bio público (E17-S1700) usa **E12 Next SSR/ISR** com revalidação por **tag `perfil:{handle}`** (sem cache de cliente; leitura server-side). SEO (S1205): canonical por `{leela-domain}`. Registrado por superfície em `STORIES-onda3.md`.
- **Fidelidade × responsividade:** E13-slim e link-in-bio são **mobile-first**; alvo primário explícito **390×844**; gate visual nesse viewport (o app nativo no simulador iPhone lógico; a landing no Playwright 390×844, reusando o projeto mobile criado em RESP-M1-T0). Desktop = graceful para o link-in-bio.
- **PII do atleta (quem lê o quê — Rules, por story):** declarado story a story em `STORIES-onda3.md`. Regra herdada do catch-all de subcoleções: **cada coleção nova declara sua Rule e nega por default**. `perfis/{handle}` leitura pública gated por `visibilidade` (RN-161); participação de atleta no perfil = **opt-in** (RN-167, default oculto); `pedidos`/`reembolsos`/`transferencias` no app lidos só pelo responsável/atleta dono (ADR-011), escrita só por Function; dado de saúde (S306) isolado em subcoleção `saude`, base legal + acesso restrito (RN-147, LGPD Art. 11).
- **Conformidade a ADRs vigentes por lote:** rubric **adr-conformance** apontada nos lotes de código — Lote 1: ADR-011 (por inscrito) + ADR-014 (cifra, onde tocar repasse); Lote 4: ADR-015 (cron); Lote 5: ADR-010 (TanStack RN) + ADR-011 (reuso do kernel `pedidos`). Lote 3: sem ADR novo (reuso de E05/E04/E16).

---

## 11 · Premissas assumidas (defaults defensáveis)

- **P1 · Plataforma do E13-slim = nativo Expo** (não web), conforme `V1-CHECKLIST §Onda 3` já registra — este plano corta a jornada heroica, não a plataforma.
- **P2 · Data/cache:** conforme §10 (TanStack RN no app; SSR/ISR por tag no link-in-bio).
- **P3 · Alvo mobile 390×844** primário para app + link-in-bio; gate visual nesse viewport.
- **P4 · Self-service pós-compra (S1315/S1316) = Could**, sequenciado após S904/S305; adia para Onda 4 se o pipeline nativo não subir cedo. Onda 3 garante o servidor.
- **P5 · RN dentro dos blocos ratificados:** E17 usa **160-167**, E18 usa **360-365** (ratificados 2026-07-17). O header do épico E18 diz "RN-360..375" mas o corpo só usa 360-365 — **corrigir o header para 360-365** (nit documental; zero RN novo fora do bloco).
- **P6 · Link-in-bio Onda 3 serve o ORGANIZADOR** (perfil editado no painel); atleta perfil + tema por-usuário = Onda 4 (ver `DECISOES-NECESSARIAS-onda3.md §DN-1` — é a única decisão genuína que sobra).
- **P7 · Scheduler = Cloud Scheduler + Function idempotente** (ADR-015); automações por gatilho = S402. Território `functions/`.
- **P8 · IDs canônicos reusados** (S305/S306/S307/S904/S1205/S402/S1700-1705/S1800-1804/S1300-1316); nenhuma entidade de domínio nova inventada. O rótulo do LOTE (B1-B5) nomeia a agenda; o aceite vive nos épicos.
- **P9 · S1804 (cupom-only)** encaixa em E04/S300 e pode rodar no Lote 1 (é do E04) ou Lote 3 (consumidor E18) — território `packages/core` + guard do checkout.

---
Voltar: [[MODELO-ROADMAP]] · [[ROADMAP]] · [[V1-CHECKLIST]]
