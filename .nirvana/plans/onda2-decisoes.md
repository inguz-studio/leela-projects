# Onda 2 — Decisões do consolidador (trace LEELA-PLAN-O2, 2026-07-05)

Vale para TODOS os lotes da Onda 2 (E04-slim, E12, E09-slim, E07-web, E06, Transversais).
Cada agente DEVE ler este arquivo + o brief do seu épico (`.nirvana/briefs/onda2-*.md`) antes de começar.
**Herda integralmente `onda1-decisoes.md`**: Vite canônico no painel (agora RATIFICADO de vez — Painel=Vite+React Router,
Landing=Next App Router), `.rules-mutex` para `firestore.rules`, roteamento Fable/Opus (Sonnet proibido),
ritual 1 task = 1 commit atômico `[LEELA-S###-T#]`, sem push (maestro faz push nos gates), Emulator Java 21 zero skip,
review antagonista Fable antes do gate de cada épico.

**Composição da onda: 23 lotes · 71 tasks.** E04-slim 6L/11T · E12 6L/25T · E09-slim 4L/15T · E07-web 1L/6T ·
E06 3L/7T · Transversais 3L/7T. Cortes vinculantes (decisões do Vitor 2026-07-04): sem afiliados (S301/S303/S1204-T1/T3
cortadas, E08 adiado), cupons ficam, E09-slim entra, E07 só web, E11 só coleta, E15 só higiene, backend do desafio no fim.

---

## Pendências do VITOR (lista única — nada disso bloqueia o INÍCIO da onda)

1. **Gateway de pagamento** (recomendação: Asaas; alternativas Pagar.me v5 / Stripe Connect) **+ fornecedor de
   e-mail transacional** (recomendação: Resend ou SES). Destrava E04-PAY-T2 e o go-live real do funil; até lá
   tudo roda em sandbox/mock por desenho. Lead time de KYC/contrato — iniciar em paralelo ao build.
2. **Domínio público** `{DOMINIO_LEELA}` **+ e-mail de suporte** `{SUPORTE_LEELA}`. Bloqueia go-live de
   SEO/canonical/sitemap/QR/mailto do 403 — nunca o código (constantes placeholder em todo lugar).
3. **Ratificar os 3 defaults comerciais do checkout** (já encodados com teste em E12-L0; reverter é barato):
   taxa **incorporada** (produtor absorve; flag `taxaIncorporada` por tenant), parcelamento **12x sem juros**
   (`jurosAoMes=0`), **retirada-only** (stepper de 5 etapas, sem frete — frete V1.1). Junto: fixar o **% efetivo**
   da taxa Leela (dado do termo comercial, hoje mock 10,5%; mínimos por método adiados).

Tudo o mais abaixo é PREMISSA decidida pelo consolidador — vale como lei da onda; Vitor pode vetar num gate.

---

## Decisões vinculantes

1. **Cupom — contrato canônico ÚNICO** (nasce em E04-S300-T1, que roda primeiro na trilha Fable):
   `eventos/{id}/cupons/{id}` = `codigo` (único por evento) · `tipo:'percentual'|'valor'` · `valor` ·
   `tetoDesconto?` (cap em R$ para percentual — interpretação oficial do "teto" da spec) · `validadeAte?` ·
   `usosMax?` · `usosFeitos` (Function-only). Sem `afiliadoId` (grep prova ausência). E04 faz CRUD+Rules;
   **E12 valida** (`validateCoupon` em `functions/src/eventos/`, nunca pasta `affiliation/`) e **incrementa
   `usosFeitos` no webhook**. Ninguém define um segundo shape.
2. **`pedidos/{pedidoId}` (ADR-011) é do E12** (S1203-T5). Verificado: E09-slim não o define. `financeiro/current`
   tem shape fixo de E03-S207; E09-slim só LÊ `receitaLiquida`; `taxaPct===null` ⇒ repasse **bloqueado** até
   existir termo comercial (nunca tratar líquido como 0).
3. **E09-slim canônico:** coleções **tenant-scoped** (`tenants/{tid}/...` — diverge da spec E09 completa, reconciliar
   na Onda 3); saldo **consolidado** (retenção calculada por evento, somada); retenção 15% sobre o **líquido**;
   `retencaoRepassePct` mora em `commercialTerms/current` por tenant + default global em `platform/config`
   (toca tipo `CommercialTerms` + editor S1602-T2 — coordenar com território E16); cifra de dados bancários =
   **AES-256-GCM com chave no Secret Manager** (ADR curto antes de L2-T2; Cloud KMS pós-V1); estado **`cancelado`**
   incluído (owner cancela `solicitado`); comprovante **numerado in-app V1** (PDF V1.1); `getBankDetailsForPayout`
   fica na V1 com auditoria LGPD; **RN-350..357 canonizadas** (faixa livre verificada, RN-341..346 = reembolso).
4. **Gatilho `evento→encerrado` = E09s-L2-T6** (task nova do consolidador): cron diário **03:10** transiciona
   por data. **Sem self-close pelo organizador** — a retenção é contingência anti-fraude; o produtor não pode
   liberar o próprio retido.
5. **ADR-007 (cron) APROVADO** e obrigatório para toda a onda e ondas futuras: wrapper v1 `pubsub.schedule` +
   `.timeZone('America/Sao_Paulo')` + núcleo `*Core(db, agora)` puro testável no Emulator sem scheduler.
   Horários escalonados por dependência: **03:00** membros (existente) → **03:05** coleta E11 → **03:10** encerrar
   eventos. Corrigir WIKI/proposta que dizem "cron não existe". Scheduler de campanha `agendada` (E06) **fica
   para a Onda 3** — o estado permanece no modelo; "Enviar agora"/"Salvar rascunho" são plenos na V1.
6. **E06:** aba chama-se **"Comunicação"**; **extração das camadas A/B APROVADA** para `core/comunicacao` +
   `functions/shared/comunicacaoEnvio.ts` com re-point do clube por re-export (baseline E05 **531/531 verde é
   aceite** do commit); `status` da campanha reusa o **código masculino compartilhado** (`rascunho/agendado/enviado`
   — label feminino só na UI/glossário); taxonomia V1 = `todos_inscritos|por_modalidade|por_kit|por_status`
   (sem `por_engajamento`); sem `aberturasPct`/reenvio-não-abriu; disparo físico **mock** (padrão ADR-006, mesmo
   racional do "pago é registro"); estimativa de alcance via callable `count()` debounced (aceito para o volume).
7. **Autorização de evento tem UMA fonte:** `podeAcessar(papel, area)` de E04-S304-T1, **API pública de
   `@leela/core`**. Áreas: `pagina_vendas, comunicacao, financeiro, entrega, inscritos, configuracoes, equipe`
   (`promotores` saiu com a afiliação; `comunicacao` entrou com E06). E07-T6 e telas consomem; a guarda de
   plataforma (`platform_admin`) é do **E16-L2**; E07-web entrega só a TELA 403 compartilhada.
8. **DS primeiro-movedor:** `SystemStateScreen` nasce em E07-T1 (E16 reusa — não construir placeholder);
   **`BannerHero` + `CardKit` nascem no DS (E01)** como primeiro commit de E12-L2, sob `.index-mutex`,
   `no-hardcoded-tokens`, SSR/RSC-safe. Proibido componente local de landing com token hardcoded.
9. **Barreiras serializadas** (adquirir mutex, reler do disco, soltar após commit):
   - `firestore.rules` (`.rules-mutex`) — ordem canônica de edição: E04-L1 → E04-L4 → E12-L1 → E09s-L1 →
     E06-L1 → T2-L1 → T2-L2 → E12-L4 → E12-L5 (segue a trilha Fable serial; nunca editar sem mutex).
   - `apps/painel/src/routes/eventos/_lib/subnav.ts` — ordem: **E04 (Página de vendas + Configurações) → E06
     (Comunicação)**; aditivo, sem reordenar entradas alheias.
   - `apps/painel/src/App.tsx` + `src/main.tsx` (E07-T2/T4) — serializar com qualquer lote de tela em voo.
   - Barrels (`packages/*/src/index.ts`) via `.index-mutex`; `firestore.indexes.json` idem rules.
10. **S305/S306 → Onda 3** (junto com S904/reembolso). Na V1 a landing exibe a política CDC (arrependimento 7d,
    Art. 49) como conteúdo estático na seção Info/FAQ; `regulamentoAceite.versao` usa `evento.regulamentoVersao ?? 1`.
    **S1208 (portal do organizador) DEFERIDA para V1.1** — não entra na Onda 2. Página de clube **sem** o bloco
    "eventos que o clube promove" (sem fonte sem afiliação); mantém hero/bio/KPIs/desafios públicos/CTA.
11. **Transversais:** snapshot E11 **diário** (`profissionais/{profId}/analyticsSnapshots/{YYYY-MM-DD}`), carrega
    só `OverviewKPIs` (sem `alerts` — se Onda 3 precisar, alertas viram coleção própria); path do desafio é o
    **aninhado** `clubes/{clubId}/desafios/{desafioId}/...` (ADR-009 — a spec E13 top-level é que está errada;
    débito de reconciliação); seed `atletas/{uid}` Emulator-only APROVADO; board de consistência = **dias ativos
    distintos na janela do desafio, desempate por pontos** (revisável antes das telas E13); E15 higiene =
    commit XS isolado; TTL/rollup de snapshots = débito registrado para a Onda 3.
12. **Copy canônica HANDOFF-07** fixada nos testes (títulos: "Essa página saiu para correr" / "Tropeçamos aqui,
    não foi você" / "Esse espaço ainda não é seu"); mudança de glossário atualiza testes junto. "Falar com o
    organizador" → `mailto:{SUPORTE_LEELA}` placeholder. DSN Sentry de staging = ação externa não bloqueante
    (aceite de eventId roda com mock até lá). Mobile inteiro fora da onda (E13/V1.5).
13. **Débitos V1.1 nomeados** (não construir agora, não esquecer): offline + manutenção web (`config/system`),
    PDF de comprovante, frete/etapa de entrega, S1208 portal, mínimos de taxa por método, deep-link de contato
    do organizador no 403, fornecedor real de e-mail/push, `aberturasPct`.

---

## Sequência de execução (trilha FABLE serial · OPUS paralelo por gate)

**Fable (1 lote por vez, nesta ordem):**
`F1 E04-L1 → F2 E12-L1 → F3 E04-L2 → F4 E04-L4 → F5 E12-L0 → F6 E12-L4a (validateCoupon + validateInscrito + persist compliance) → F7 E04-L6 (T1; T2 gated no gateway) → F8 E12-L4b (createInscricaoCharge + webhook) → F9 E12-L5 → F10 E09s-L1 → F11 E09s-L2 → F12 E06-L1 → F13 E06-L2 → F14 T2-L1 → F15 T2-L2 → F16 T2-L3/S105-hig`

**Opus (paralelo, entra quando o gate Fable correspondente fecha):**
- Imediato (sem dep Fable): **E07-T1** (SystemStateScreen) + **S1601-hig** (lint XS).
- Após E07-T1: **E07-T2 ∥ T4 ∥ T5**.
- Após F2: **E12-L2** (começa por BannerHero+CardKit no DS); após E12-L2: **E07-T3** (guarda SEO).
- Após F3: **E04-L3** (editor + modais). Após F4: **E04-L5** (configurações/equipe) e **E07-T6** (403 por papel).
- Após F5+F6: **E12-L3** (stepper 5 etapas).
- Após F11: **E09s-L3 ∥ E09s-L4** (superfícies distintas).
- Após F13: **E06-L3** (aba + lista + editor).

Racional da ordem: E04-L1/E12-L1 destravam o maior leque Opus; E09s/E06/transversais são independentes e fecham a
trilha; T2-L1..L3 podem adiantar se algum gate comercial travar (zero conflito de superfície). Gate de épico =
review antagonista Fable + relatório com números reais, como na Onda 1.
