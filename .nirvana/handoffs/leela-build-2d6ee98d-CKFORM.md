# Handoff — leela-build-2d6ee98d · lote CHECKOUT-FORM (CKFORM) · FECHADO

employee: sf-frontend-lead (software-forge) · modelo: Fable · 2026-07-19
Lote atravessou queda de cota: lane 1 pagou T1/T2/T4 + WIP do T3; lane RETOMADA
(CHECKOUT-FORM-ret) inventariou o WIP, decidiu aproveitar-e-completar e fechou.

## Estado final por task (tudo em origin/main)

- [x] T1 `48d8538` + `7dfb807` + `b9f2b01` — StepDados: telefone (tel+máscara),
  nascimento por atleta (date/bday), endereço 1×/pedido com ViaCEP nos 4 estados
  da spec §5.2, fail-open com retry no blur; validação reusa o core; payload do
  createInscricaoCharge ganha telefone/nascimento/endereco. `b9f2b01` = fix da
  review antagonista: timeout do lookup cobre headers+CORPO (ViaCEP hostil não
  soft-locka mais o form); teste novo com fake timers. Landing 36/36.
- [x] T2 `e860b8e` — 2 aceites obrigatórios no StepPagamento acima do pagar
  (Gerar PIX/Pagar desabilitados sem os 2); modal (a) politicaVendas pública +
  versão; modal (b) termo de saúde template (Sympla) + termoSaudeVersao; Dialog
  ADR-017; PIX auto-gera SÓ após aceites; cobrança criada trava os checks;
  cliente envia só booleans.
- [x] T3 `9a4e044` — flip server-side F-4a EXECUTADO: `aceites` OBRIGATÓRIO em
  `validarCreateInscricaoChargeInput` (invalid-argument fail-closed ANTES de
  qualquer escrita; provado: doc inexistente pós-rejeição); tipo obrigatório em
  functions + api-client; F-4b re-desenhado (legado simulado via
  FieldValue.delete; replay COM aceites COMPLETA a prova via
  garantirAceitesNoReplay; prova existente nunca reescrita); fixtures de 19
  suítes (incl. input inline de requestRefund que a lane 1 não cobriu).
- [x] T4 `93a9959` — badge "+ taxa de serviço" condicional por `taxaRepassada`
  (RN-347) em Hero/HeroMinimo/Lotes/CheckoutCta/CTA fixo; verify:brand PASS.
- [x] `4730dfa` — TSTFIX cross-lane (re-prova da suíte inteira expôs 3 testes
  stale pré-existentes, zero produto): equipeRules catch-all reapontado
  reembolsos→ledger (E09 `bebbc0a` abriu reembolsos p/ organizador/financeiro de
  propósito); espelho CAMPOS_FUNCTION_INSCRITO + titularHistorico;
  tenantLifecycle asserta ServerTimestampTransform real (stub estático morto
  desde `8e6badd`).

## Gates (numéricos)

tsc/eslint 0: functions, api-client, landing · landing vitest 36/36 +
verify:brand PASS · emulator TESTE 8480/9598 (emulators:exec fb-tools@13 +
firebase.r6.json): checkout core 70/70 + parametrizadas 316 pass/8 skip
(asaasSandbox pula sem chave — skipIf) · suíte functions INTEIRA em blocos
síncronos no emulator efêmero 8080/9099/9199: 22/22 + 21/21 + 21/21 arquivos +
units 1252 pass (verde pós-TSTFIX; 1 flake de paralelismo em comunicacoesLog —
verde isolada, suíte intocada desde `5a144f1`).

## Review antagonista (Fable, contexto fresco): APROVADO

Forja de aceite / bypass do flip / CEP hostil / PII — 4 vetores PASS com
evidência arquivo:linha. 1 ressalva BAIXA (json() sem timeout) corrigida e
re-provada (`b9f2b01`). Nota: guards defensivos pós-flip viram defense-in-depth
(mantidos de propósito).

## Premissas / deploy

- Deploy CASADO: functions (flip) + landing (coleta) sobem JUNTOS.
- Servidor só OBRIGA os aceites; telefone/nascimento/endereço seguem
  opcional-estrito (obrigatoriedade deles = gate de UX na UI).
- Aceite de regulamento POR INSCRITO (S1207) fora deste lote.
- PAR-Q/atestado = D-7 futuro; termo de saúde sempre presente.

## Portas/lanes

Emulator TESTE: 8480/9598 (firebase.r6.json) + efêmero 8080/9099/9199 p/ as 64
suítes de porta fixa — :8180/:9198 do preview NUNCA tocados (verificado vivo
antes de cada exec). apps/painel e packages/design-system intocados (lanes
MODAL-CONVERGE/MARCAS aterrissaram na mesma árvore durante o lote, sem
conflito). Boards atualizados NO FINAL após pull (V1-KANBAN card → Feito,
V1-CHECKLIST S1207 re-anotado + entrada CKFORM, BOARD-HISTORICO verbatim).

## Onde o Vitor confere

Restart do :3200 (stale, pendência já registrada) → checkout de um evento:
Dados (telefone/nascimento/CEP autopreenchendo; rede off = fallback manual) →
Pagamento (2 aceites gateando o botão; modais com política real + termo de
saúde versionado) → evento com taxa repassada mostra "+ taxa de serviço".
