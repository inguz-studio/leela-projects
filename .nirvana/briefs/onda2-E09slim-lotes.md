# Onda 2 · E09-slim — Repasses (payout do organizador) · brief de lotes

Recorte VINCULANTE do Vitor (decisões-escopo-2026-07-04, item 4). Este épico **NÃO é o E09 completo** (aquele — painel consolidado + split + reembolso — fica na Onda 3, Icebox). E09-slim entrega só o **fluxo de repasse**: o organizador vê o que vendeu / tem disponível / está retido, cadastra dados bancários uma vez, solicita saque validado, e o platform_admin registra o pagamento (mock) com comprovante numerado.

Regra 1 task = 1 commit atômico. Roteamento: **Fable** = Functions/rules/core-negócio/segurança/LGPD; **Opus** = telas painel (DS + api-client).

## Cortes vs spec original (o que a spec E09 diz e este brief NÃO faz)

1. **Afiliação inteira SAI** (decisão adicional do Vitor: "sem afiliados neste início"). Corta S902 (split de afiliação, saldo consolidado organizador+coordenador), RN-120/122/125/311/312/332/334, a persona Coordenador e o JTBD "calcular comissão sem planilha". O saldo aqui é **organizador puro** — sem linha de afiliado, sem `parcerias`, sem `afiliadoAReceber`.
2. **Máquina de reembolso/estorno (S904) NÃO entra neste brief.** É pós-venda, vive em E04-S305 + `reembolsos`/`transferencias` (RN-341..346). E09-slim só trata repasse (dinheiro saindo para o produtor), não devolução (dinheiro voltando ao atleta). O clawback (RN-346) fica lá.
3. **Painel financeiro rico (S900 KPIs+gráficos, S903 CSV) NÃO entra.** O painel-slim tem só **3 números: vendido / disponível / retido** + histórico de repasses. Donut por modalidade, barras por dia, ticket médio e export CSV ficam para o E09 completo (Onda 3).
4. **A agregação por webhook (S901) NÃO é reconstruída aqui.** E09-slim **lê** o agregado por evento `eventos/{id}/financeiro/current`, que **já existe e está entregue por E03-S207** (`functions/src/eventos/agregarFinanceiro.ts`, feito) — expõe `receitaLiquida` por evento pronto. Fallback só quando `taxaPct===null` (tenant sem termo): deriva via `computeReceitaLiquida(receitaBruta, platformFeePct)` (`calc.ts` pronto). E09-slim **não** processa webhook de pagamento e **não** depende de E04-slim para essa fonte (correção: não é E04, é E03).
5. **Inversão de escopo assumida:** a spec E09 marcava "Saque/withdrawal" como **Won't**. E09-slim **reintroduz o saque** como o coração do épico — porém como **registro/workflow** (PaymentProvider mock: "pago" é registro manual do admin, sem transferência bancária real; UI explícita sobre isso).

Fundação consumida (**tudo Onda 1, já entregue — E09-slim não tem dep dura de nenhum épico da Onda 2**): multi-tenant + claims + helpers de Rules `isTenantMember`/`isPlatformAdmin`/`tenantAtivo` (S1600, feito); `commercialTerms/current` versionado por tenant, platform_admin-only write, RN-404, com `platformFeePct`/`installmentRules`/`anticipation`/`saasMonthlyFee` (E16-slim, feito); `computeReceitaLiquida`/`computeTaxa`/`roundMoney` puros e o golden-rule RN-406 "taxa sempre do termo do tenant" (`packages/core/src/finance/calc.ts`, feito); `PaymentProvider` interface + mock com `PayoutStatus`(`pending`/`scheduled`/`paid`/`failed`)/`getPayout` (`packages/core/src/payments/PaymentProvider.ts` + `functions/src/payments/mockProvider.ts`, ADR-006, feito); `eventos/{id}/financeiro/current` por evento **com shape fixo** `FinanceiroEvento{ tenantId, receitaBruta, taxaPct|null, taxaValor|null, receitaLiquida|null, inscritos{total,porStatus,porKit,porModalidade} }` (E03-S207, feito — `functions/src/eventos/agregarFinanceiro.ts`); o enum `StatusEvento` inclui `'encerrado'`, **mas nenhuma Function ainda transiciona para lá** (`publicarEvento.ts` só faz `rascunho→publicado`) — gatilho de encerramento é o único pré-requisito ainda ausente (ver decisão #6).

RNs novas propostas para repasses-slim (**consolidator: encaixar no registro canônico; RN-341..346 já são reembolso, RN-350+ livre**): **RN-350** retenção pós-evento (15% config, libera ao encerrar) · **RN-351** cálculo do disponível (Σ liberado − Σ comprometido, nunca <0) · **RN-352** validação da solicitação (0 < valor ≤ disponível) · **RN-353** máquina do repasse (solicitado→aprovado→pago; solicitado→recusado; recusa devolve ao disponível) · **RN-354** dados bancários LGPD (número cifrado Function-only + read:false; cliente lê só mascarado; nunca cross-tenant) · **RN-355** comprovante numerado (sequência gapless por tenant; PDF V1.1) · **RN-356** registro manual mock ("pago" sem transferência real; UI explícita) · **RN-357** escrita de repasse/saldo/dados bancários só por Function.

---

## Lote E09s-L1 · Modelo de dados, Rules & núcleo puro do repasse — FABLE

- **Tasks:** T1 (data-model + doc), T2 (Security Rules), T3 (core puro + testes)
- **Superfície:** `packages/core/src/finance/repasse.ts`, `packages/core/src/finance/repasse-types.ts` (+ reuso de `calc.ts`), `firestore.rules` (raiz do repo), `leela-specs/modelo-de-dados-firestore.md`
- **Dep:** E16-slim (helpers de Rules + `commercialTerms` p/ decisão #4), E03 (`financeiro/current` — shape fixo já entregue por S207). **Não** depende de E04-slim (a fonte de dados é E03, não E04). **Bloqueia todo o resto do épico.**
- **Coleções novas (tenant-scoped — ver decisão #1):** `tenants/{tid}/dadosBancarios/current` (mascarado: banco, agência, `contaMascarada`=`****1234`, tipo, `pixMascarado`, titular, cpfCnpjMascarado) · `tenants/{tid}/dadosBancariosSecret/current` (blob cifrado do número/PIX; **Function-only**) · `tenants/{tid}/repasses/{repasseId}` (`valor`, `estado`(solicitado/aprovado/recusado/pago/**cancelado** — decisão #11 resolvida: incluído), `dadosBancariosSnapshot` mascarado, `comprovanteNumero?`, `transicoes[]` append-only, `criadoEm`) · `tenants/{tid}/saldo/current` (∑ por Function: `vendidoBruto`, `retido`, `disponivel`, `comprometido`, `atualizadoEm`) · config de retenção (`retencaoRepassePct`, default 15 — ver decisão #4).
- **Aceite (falsificável):** tipos compilam sob `strict`+`noUncheckedIndexedAccess`, zero `any`; a coleção `dadosBancariosSecret` documentada no modelo com nota "read:false, escrita só Admin SDK"; `computeReceitaLiquida` reusado (não reimplementar taxa — RN-406); estados do repasse tipados como union fechada `EstadoRepasse`; a doc do modelo registra que retenção é 15% default liberada em `evento.status==='encerrado'`.

### T2 (Rules) aceite falsificável
Owner do tenant A **lê** seu `dadosBancarios/current` mascarado e seus `repasses`/`saldo`; owner do tenant **B lê** `tenants/A/...` → **rule NEGA** (cross-tenant, RN-354); **qualquer** cliente (owner incluso) lê `dadosBancariosSecret/current` → **NEGA** (read:false, RN-354); cliente faz `set`/`update`/`create`/`delete` em `repasses`/`saldo`/`dadosBancarios*` → **NEGA** (write:false, RN-357); `platform_admin` lê `repasses` de qualquer tenant → **permite**; `tenant_owner` escreve `retencaoRepassePct` → **NEGA**, `platform_admin` (via Function) → único que grava. Reusar `isTenantMember`/`isPlatformAdmin`/`tenantAtivo` (não reescrever predicado de tenant). Testes: `*Rules.integration.test.ts` no emulator.

### T3 (core puro) aceite falsificável
`computeRetido(liquido, pct, encerrado)` → `encerrado=false` ⇒ `liquido*pct/100`; `encerrado=true` ⇒ `0` (RN-350); `computeSaldoRepasse(eventos[], repassesAtivos[])` ⇒ `disponivel = Σ liberadoPorEvento − Σ valor(repasses em {solicitado,aprovado,pago})`, com `disponivel` **nunca negativo** (RN-351) e `liberadoPorEvento = encerrado? liquido : liquido*(1−pct)`; `validarSolicitacao(valor, disponivel)` ⇒ rejeita `valor<=0` e `valor>disponivel` (RN-352); `transitionRepasse(estado, evento)` ⇒ `solicitado→{aprovado,recusado,cancelado}` (cancelado só pelo owner — decisão #11), `aprovado→pago`, tudo mais rejeita (RN-353); recusa E cancelamento devolvem o valor ao disponível; `formatarNumeroComprovante(tenant, seq)` puro e determinístico (ex.: `REP-2026-0007`). Base da retenção = líquido do produtor (ver decisão #3). Testes unit em `core` cobrindo arredondamento a centavo (reusar `roundMoney`), disponível=0 quando tudo comprometido, e recusa não conta como comprometido.

---

## Lote E09s-L2 · Functions do repasse (saldo, solicitação, transições, LGPD) — FABLE

- **Tasks:** T1 (`updateSaldoRepasse`), T2 (`saveDadosBancarios` cifra+mascara), T3 (`requestRepasse` valida + `cancelRepasse` do owner), T4 (transições admin + comprovante + config retenção), T5 (`getBankDetailsForPayout` auditado), T6 (`encerrarEventos` cron — **adicionada pelo consolidador, resolve a decisão #6**)
- **Superfície:** `functions/src/finance/*` (novos), `functions/src/eventos/encerrarEventos.ts` (T6 — coordenar com E03, pasta compartilhada), `firestore.rules` (só se ajuste fino), consome `packages/core/src/finance/repasse.ts`
- **Dep:** E09s-L1. Ordem interna: T1←L1; T2←L1; T3←(L1,T1); T4←(L1,T3); T5←T2; T6 independente após L1.
- **Aceite global do lote:** toda escrita de repasse/saldo/dados bancários passa por estas Functions (nenhum caminho de cliente escreve — RN-357); todas idempotentes; sem dado bancário sensível em log/Sentry.

### T1 · `updateSaldoRepasse` — trigger recomputa `saldo/current`
- Gatilhos: onWrite de `eventos/{id}/financeiro/current` (do tenant) **e** onWrite de `tenants/{tid}/repasses/{id}`.
- **Aceite:** dado 1 evento **não** encerrado com líquido R$10.000 e retenção 15%, `saldo.retido=1500`, `saldo.disponivel=8500`, `saldo.vendidoBruto`=bruto confirmado (RN-350/351); ao setar `evento.status='encerrado'`, próximo recompute leva `retido→0` e `disponivel→10000` menos comprometido; recomputar duas vezes com o mesmo estado **não** muda o saldo (idempotente); reusa `computeSaldoRepasse` (não soma no cliente). Integração no emulator.

### T2 · `saveDadosBancarios` callable (tenant_owner)
- **Aceite:** valida campos (banco, agência, conta, tipo, PIX?, titular, CPF/CNPJ); **cifra** número da conta/PIX server-side e grava em `dadosBancariosSecret/current` (Function-only); grava `dadosBancarios/current` só com campos **mascarados**; retorna ao cliente **apenas** o mascarado (RN-354); reenvio sobrescreve idempotente preservando `criadoEm`. Mecanismo de cifra = ver decisão #5. Integração: emulator confirma que o secret não é legível por cliente e o mascarado é.

### T3 · `requestRepasse` callable (tenant_owner)
- **Aceite:** exige `dadosBancarios/current` existente (senão `failed-precondition`); relê `saldo.disponivel` **no servidor** e aplica `validarSolicitacao` (RN-352) — `valor>disponivel` ⇒ rejeita, nunca cria; ao criar `repasses/{id}` em `estado='solicitado'` grava `dadosBancariosSnapshot` (mascarado) + 1ª entrada em `transicoes[]`; o novo repasse entra em `comprometido` no próximo recompute (T1), derrubando `disponivel` (RN-351). Two-request race: dois `requestRepasse` concorrentes somando > disponível ⇒ o segundo falha (validação transacional). Integração no emulator.

### T4 · transições admin + comprovante + retenção (platform_admin)
- Callables: `approveRepasse` (solicitado→aprovado), `rejectRepasse` (solicitado→recusado), `markRepassePago` (aprovado→pago), `setRetencaoRepasse` (grava `retencaoRepassePct`).
- **Aceite:** só `platform_admin` invoca (senão `permission-denied`); transição inválida (ex.: `solicitado→pago`) ⇒ rejeita via `transitionRepasse` (RN-353); `rejectRepasse` devolve o valor ao `disponivel` no recompute (RN-351); `markRepassePago` gera `comprovanteNumero` **sequencial gapless por tenant** (contador transacional — dois pagos seguidos ⇒ `...0007` e `...0008`, sem buraco/colisão — RN-355) e **não** dispara transferência real (mock — RN-356); cada transição faz append em `transicoes[]` (de→para, quando, quem); `setRetencaoRepasse` só platform_admin, novo % vale nos próximos recomputes. Integração no emulator (incl. concorrência do contador de comprovante).

### T5 · `getBankDetailsForPayout` callable auditado (platform_admin)
- **Aceite:** só `platform_admin`; decifra e retorna o número completo **just-in-time** para o admin executar o pagamento manual; registra o acesso (auditoria LGPD: quem, quando, qual repasse); nunca loga o número em claro. Ver decisão #8 (pode virar V1.1 se o pagamento manual for 100% offline). Integração: não-admin ⇒ negado + acesso registrado.

### T6 · `encerrarEventos` cron (novo — gatilho `evento→encerrado`, RN-350)
- Cron diário `03:10` (padrão ADR-007 do lote transversal: wrapper v1 `pubsub.schedule` + `encerrarEventosCore(db, agora)` puro testável no Emulator; slot escalonado após 03:00/03:05).
- **Racional do desenho (consolidador):** a retenção de 15% é contingência anti-fraude — o organizador **não pode** encerrar o próprio evento para liberar o próprio retido. Logo o encerramento é **automático por data** (sem botão de self-close no painel nesta onda).
- **Aceite (falsificável):** evento `publicado`/`ao_vivo` com data-fim (ou data única) anterior a `agora` ⇒ `status='encerrado'`; evento futuro ⇒ intocado; `rascunho` ⇒ intocado; rerun no mesmo dia ⇒ idempotente (nenhuma transição dupla, `transicoes`/audit não duplica); o recompute de saldo (T1) observa o novo status e leva `retido→0` do evento encerrado. Integração no Emulator chamando o Core direto.

---

## Lote E09s-L3 · Telas do organizador (painel + dados bancários + solicitar + histórico) — OPUS

- **Tasks:** T1 (rota + 3 cards vendido/disponível/retido), T2 (form dados bancários), T3 (modal solicitar repasse), T4 (histórico + comprovante)
- **Superfície:** `apps/painel/src/routes/financeiro/repasses/*` (+ `_data/contracts.ts`, `_lib/`), consome DS + `packages/api-client/src/finance.ts` (estender)
- **Dep:** E09s-L1 (contratos/tipos), E09s-L2 (Functions/saldo), E01 (Shell, Table, Modal, Toast, EmptyState, Skeleton). Ordem interna: T1←L2-T1; T2←L2-T2; T3←(L2-T3,T2); T4←(L2-T4,T1).
- **Mocks canônicos:** Marina Castelo · Castelo Produções (iniciais MC); Meia Maratona Floripa 2026 (`meia-floripa-2026`); taxa do termo 10,5%; período-âncora Abril 2026.
- **Aceite (falsificável):** os 3 cards flat (§2.16) leem **só** `saldo/current` (nunca varrem eventos no cliente) — `disponivel` bate com `Σ liberado − comprometido`; **retido** exibe badge "Liberado após o encerramento do evento" enquanto `retido>0` (RN-350); sem venda ⇒ EmptyState "Nenhuma movimentação" (não zeros ambíguos, §2.12); erro de carga ⇒ estado de erro com "Tentar novamente" (§2.12).
  - **T2:** form grava via `saveDadosBancarios`; após salvar, a tela mostra **só** `****1234`/PIX mascarado (nunca o número em claro — RN-354); campo vazio ⇒ erro inline sem submit; editar reusa o form.
  - **T3:** modal "Solicitar repasse" lista os dados bancários salvos + campo valor; espelho client de RN-352 (valor > disponível ⇒ botão bloqueado + hint), mas o servidor é autoritativo (UI trata `failed-precondition` do `requestRepasse` com Toast); sucesso ⇒ Toast + novo item no histórico em `solicitado`.
  - **T4:** histórico em tabela densa (§2.5): número, valor, estado (badge: `alerta` solicitado/aprovado, `vitoria` pago, `vulcao` recusado), datas; abrir um `pago` mostra o **comprovante** (registro numerado `REP-....`, valor, dados mascarados, data) com aviso "Registro de repasse — pagamento processado manualmente (sem transferência automática nesta versão)" (RN-356); PDF ausente por ora (V1.1, decisão #9).

---

## Lote E09s-L4 · Back-office admin de repasses (fila + registrar pago) — OPUS

- **Tasks:** T1 (fila solicitado/aprovado + aprovar/recusar + editor de retenção), T2 (marcar pago + ver dados bancários auditado + comprovante)
- **Superfície:** `apps/painel/src/routes/plataforma/repasses/*` (reusa `PlatformShell` do E16 — sidebar ganha item "Repasses")
- **Dep:** E09s-L2 (Functions), E16-slim (`PlatformShell`, back-office), E01. T2←T1.
- **Aceite (falsificável):** usuário sem claim `platform_admin` ⇒ 403 (não a fila); fila lista repasses em `solicitado`/`aprovado` de todos os tenants, tabela densa (§2.5) com tenant, valor, estado, data + filtro por estado/tenant + contador "mostrando X de Y"; **Aprovar** ⇒ ConfirmModal (§2.15) → `approveRepasse` → estado `aprovado` + Toast; **Recusar** ⇒ ConfirmModal → `rejectRepasse` → `recusado` + valor volta ao disponível do tenant; ações **sempre** via Function (nunca estado direto no cliente — RN-357); editor de `retencaoRepassePct` só aqui, `platform_admin` salva `15` → persiste + Toast (RN-350).
  - **T2:** em `aprovado`, ação "Registrar pagamento" ⇒ chama `getBankDetailsForPayout` (mostra número completo **com aviso de auditoria** "Acesso a dado bancário registrado") → admin confirma no ConfirmModal com aviso **explícito** "Registro manual — nenhuma transferência bancária é feita pelo sistema nesta versão" (RN-356) → `markRepassePago` → estado `pago` + comprovante numerado gerado (RN-355) + Toast; a fila remove o item pago.

---

## Sequência interna E09-slim
`L1 → L2 → (L3 ∥ L4)`. L2 exige L1 completo. L3 (telas do organizador, `routes/financeiro`) e L4 (back-office, `routes/plataforma/repasses`) são **superfícies distintas** → paralelos após L2.

## Paralelismo entre épicos (Onda 2)
- Telas: `routes/financeiro/repasses` (E09s) isolada; `routes/plataforma/repasses` (E09s) é subpasta nova dentro do território E16 (baixo conflito — coordenar só o item de sidebar do `PlatformShell`).
- **Barreira = `firestore.rules`** (raiz do repo, compartilhado com E04-slim/E12): E09s-L1-T2 adiciona blocos `tenants/{tid}/dadosBancarios*`, `repasses`, `saldo`. Serializar por `.rules-mutex` (WIKI §3), reler do disco ao adquirir.
- **Contrato `financeiro/current`**: **E03-S207 escreve** (`functions/src/eventos/agregarFinanceiro.ts`, feito), E09-slim **lê**. Shape já fixo (`FinanceiroEvento`) — E09s consome `receitaLiquida` direto; sem alinhamento pendente com E04. Arquivos distintos (`functions/src/eventos/*` vs `functions/src/finance/*`).
- E09-slim **não** bloqueia E12/E06/E07 e **não tem dep dura de E04-slim** (sua fonte de dados, `financeiro/current`, é E03 — feito). A composição da Onda 2 no doc de decisões o lista depois de E04-slim/E12, mas ele pode correr em paralelo assim que a barreira de Rules for serializada.

## Riscos / entidades compartilhadas
- **`financeiro/current`** (E03-S207, feito) é a fonte de verdade do vendido/líquido e já expõe `receitaLiquida` por evento. Edge real: quando `taxaPct===null` (tenant **sem** termo comercial), `taxaValor` e `receitaLiquida` vêm `null` — E09s tem de decidir o comportamento (recomendo **bloquear** retenção/saque até haver termo, em vez de tratar líquido como 0). Flag na decisão #7.
- **`commercialTerms`** (E16) — se `retencaoRepassePct` morar lá (decisão #4), E09s toca o tipo `CommercialTerms` e possivelmente o editor S1602-T2 (E16). Alternativa sem tocar E16: `platform/config`.
- **`evento.status='encerrado'`** (E03) é o gatilho de liberação da retenção (RN-350). Quem/como seta 'encerrado' precisa estar claro (decisão #6).
- Divergência de modelagem: a spec E09 completa previa `profissionais/{profId}/saldo` (consolidando afiliação). E09-slim propõe tenant-scoped e sem afiliação (decisão #1) — consolidator reconciliar antes que a Onda 3 reabra o E09 completo.

## Decisões pendentes (para o consolidator / Vitor)
1. **Localização de saldo/repasses/dados bancários.** Recomendo **tenant-scoped** (`tenants/{tid}/...`) — isolamento cross-tenant sai de graça com `isTenantMember`, e eventos já são tenant-scoped. Diverge do `profissionais/{profId}/saldo` da spec E09 completa. Consolidator decide o cânone.
2. **Repasse consolidado vs por-evento.** Recomendo **consolidado** (`saldo/current` soma todos os eventos; retenção calculada por evento e somada) — casa com "quanto tenho disponível" do Vitor. Alternativa por-evento é mais rastreável mas fragmenta o saque. Vitor confirmar.
3. **Base da retenção 15%.** "15% do total" = bruto ou líquido do produtor? Recomendo **líquido** (o que de fato é repassado). Vitor confirmar.
4. **Onde mora `retencaoRepassePct`.** Recomendo `commercialTerms/current` por tenant (platform_admin-only write, versionado, reusa RN-404) + default global em `platform/config`. Alternativa: só global em `platform/config` (sem flexibilidade por tenant). Vitor/consolidator decidem — muda se E09s toca o E16.
5. **Mecanismo de cifra dos dados bancários** (RN-354). Cloud KMS vs segredo de app + AES-GCM. Decisão de infra — recomendo **ADR curto** antes de L2-T2. Bloqueia a implementação da cifra.
6. **Gatilho `evento→encerrado` — RESOLVIDO (consolidador, 2026-07-05): E09s-L2-T6 entrega `encerrarEventos` cron 03:10** (automático por data, padrão ADR-007). Sem self-close pelo organizador nesta onda: a retenção é contingência anti-fraude e o produtor não pode liberar o próprio retido. Vitor pode vetar/ajustar no gate do épico.
7. **~~Shape de `financeiro/current`~~ — RESOLVIDO.** O shape já está fixo e entregue por E03-S207: `FinanceiroEvento{ tenantId, receitaBruta, taxaPct|null, taxaValor|null, receitaLiquida|null, inscritos{total,porStatus,porKit,porModalidade} }`. E09s lê `receitaLiquida` direto (não há dep de E04-slim). **Sub-flag remanescente:** definir o comportamento quando `taxaPct===null` (tenant sem termo → `receitaLiquida=null`) — recomendo bloquear repasse até haver termo comercial.
8. **`getBankDetailsForPayout` no V1 ou V1.1.** Se o pagamento manual for 100% offline (admin já tem a conta por fora), a leitura in-system do número completo pode ir para V1.1 e o admin só registra "pago". Vitor confirmar o fluxo operacional real do pagamento manual.
9. **Comprovante: registro numerado (V1) + PDF (V1.1).** Recomendo V1 = comprovante numerado visível in-app; PDF depois. Confirmar.
10. **Numeração de RNs.** Propus RN-350..357 para repasses-slim (RN-341..346 já são reembolso). Consolidator encaixa no registro canônico e evita colisão.
11. **Cancelamento da solicitação — RESOLVIDO (consolidador, 2026-07-05): incluído.** Estado `cancelado` na union; `cancelRepasse` (owner, só enquanto `solicitado`) entra em L2-T3; cancelamento devolve o valor ao disponível no recompute.

> **Resoluções do consolidador (2026-07-05) para as demais flags** — canonizadas em `.nirvana/plans/onda2-decisoes.md`: #1 tenant-scoped ✓ · #2 consolidado ✓ · #3 retenção sobre o **líquido** ✓ · #4 `commercialTerms/current` por tenant + default em `platform/config` ✓ · #5 AES-256-GCM com chave no Secret Manager (ADR curto antes de L2-T2; KMS pós-V1) ✓ · #7 `taxaPct===null` ⇒ repasse **bloqueado** até existir termo ✓ · #8 `getBankDetailsForPayout` fica na V1 (com auditoria) ✓ · #9 comprovante numerado in-app V1, PDF V1.1 ✓ · #10 RN-350..357 canonizadas ✓.
