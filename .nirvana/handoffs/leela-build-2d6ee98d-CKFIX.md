# Handoff · CHECKOUT-FIXES (lote CKFIX)

trace: `leela-build-2d6ee98d` · business software-forge · employee sf-frontend-engineer · rota Opus
território: SÓ `apps/landing/**` checkout/inscricao (+ boards + este handoff). Nada de JsonLd/robots/convite/RegulamentoModal (lane SECFIX), painel (S8FIX), functions/core (COMF2).
fonte: `outputs/leela-build-2d6ee98d/CHECKOUT-UX-REPORT.md` (mind don-norman)

## Escopo pago (5 fixes não-controversos, UI-pura)

| Task | Finding | O que mudou | Arquivos |
|---|---|---|---|
| T1 | BC-1 | Erro de cotação no Resumo ganha botão "Tentar novamente" (re-dispara `cotarCom(cupomAplicado)` via bump de nonce no efeito — mesmo guard de cancelamento, sem caminho paralelo). Kernel intocado. | `CheckoutFlow.tsx` (recotarNonce/`tentarCotarNovamente`), `StepResumo.tsx` (bloco de erro com retry) |
| T2 | BC-2 | Sessão anônima RECUPERÁVEL: 1 tentativa no mount + 1 retry automático (backoff 1200ms) + botão "Tentar novamente". Copy humana ("Não conseguimos preparar seu pagamento. Verifique sua conexão e tente de novo.") — zero "Firebase Anonymous Auth", erro cru do SDK só no `console.error`. Avanço bloqueado no step 0 enquanto `erroAuth` ativo (botão "Continuar" desabilitado). | `CheckoutFlow.tsx` (`iniciarAuth`, banner, guard em `avancar`, disabled da nav) |
| T3 | A-2 | Cupom vindo da URL AUTO-APLICA na 1ª cotação possível: sucesso ⇒ vira `cupomAplicado` (efeito principal recota e exibe o desconto); falha ⇒ banner honesto "O cupom X não pôde ser aplicado (motivo)" e segue sem cupom. Efeito principal espera o handoff (`cupomUrlPendente`) para não disparar 2 cotações concorrentes. **Posição do campo NÃO mudou** (D-4 pendente do Vitor). Servidor revalida tudo. | `CheckoutFlow.tsx` (efeito auto-apply + gate), `StepResumo.tsx` (`erroCupomUrl`) |
| T4 | A-3 | PIX gera a cobrança AUTOMATICAMENTE ao entrar no Pagamento (efeito; botão "Gerar código PIX" vira fallback de erro — idempotência RN-333 protege). QR VISUAL renderizado do payload copia-e-cola, **reusando a lib `qrcode`** (já dependência, mesma do `Ticket.tsx`) + botão "Copiar código" com feedback "Código copiado". | `CheckoutFlow.tsx` (efeito auto-gen), `StepPagamento.tsx` (`PixQrCode` + `CopiarCodigoPix`) |
| T5 | A-5 | Transparência da taxa RN-347 ANTES do Resumo: nota fixa no step 0 ("Eventuais taxas de serviço, quando houver, entram no total exibido no resumo, antes do pagamento"). Sem mudar a matemática (kernel intocado). | `StepModalidadeKit.tsx` |

## Premissas / decisões de execução

- **T5 = alternativa leve do report (nota fixa), NÃO a microcopy condicional por preço.** A microcopy "+ taxa" por badge exige o leitor público (`lib/leitor.ts` + `EventoPublico`) expor um flag booleano do modo de taxa — `EventoPublico` HOJE não expõe isso, e o leitor está FORA do território deste lote (SÓ checkout/inscricao). A nota fixa é honesta para os dois modos ('incorporada' e 'repassada') e não toca leitor/core. **Se o Vitor quiser o badge "+ taxa" condicional, é lote de backend/leitor (expor o flag) + UI.**
- **T4 auto-gen:** o efeito só dispara com `authPronto && charge===null && !criandoCharge && erroCharge===null` — em erro, para e cai no botão fallback (não faz auto-retry infinito).
- **T2 backoff:** `MAX_AUTH_RETRY_AUTO=1` (2 tentativas no total antes do banner). Valor conservador para não esconder falha real por muito tempo.
- Idempotência/kernel de preço 100% no servidor — nenhum fix mexe em matemática, cálculo local ou contrato de dados.

## Gates (todos verdes)

- `tsc --noEmit`: **0 erros** (inclui os 2 arquivos de teste novos — tsconfig cobre `**/*.tsx`).
- `eslint app lib` + arquivos de teste: **0 warnings** (`--max-warnings 0`).
- `vitest run`: **19/19** (10 baseline intactos + 9 novos). Os `console.error` no stderr do teste de auth são o comportamento esperado (detalhe técnico só no console).
- `verify:brand`: **PASS**.
- Lote NÃO sobe emulator (validação por tsc/lint/vitest, conforme brief).

### Testes novos
- `apps/landing/test/checkout-fixes-steps.test.tsx` (7): StepResumo retry (T1) + banner cupom URL (T3); StepPagamento QR + copiar + sem clique "Gerar" (T4); StepModalidadeKit nota de taxa (T5).
- `apps/landing/test/checkout-fixes-flow-auth.test.tsx` (2): CheckoutFlow BC-2 — auth OK sem banner; auth falha → banner humano (sem "Firebase"/"auth/network") + "Continuar" desabilitado + retry destrava. api-client e leelaClient mockados.

## Onde o Vitor confere

1. Render vivo do checkout pós-restart do `:3200` (a jornada completa cupom→resumo e PIX auto-gen contra Asaas sandbox seguem pendentes de prova viva — já listados no §7 do report; este lote é UI-pura validada por tsc/lint/vitest).
2. `StepResumo.tsx` bloco de erro (retry) e aviso de cupom da URL; `StepPagamento.tsx` seção PIX (QR + copiar); `StepModalidadeKit.tsx` nota de taxa no topo do step 0; `CheckoutFlow.tsx` banner de auth + guard de avanço.
3. Report lado a lado: cada finding pago tem caminho:linha no CHECKOUT-UX-REPORT.md.

## Adiado (NÃO pago aqui — fora de "não-controverso" ou fora do território)

- **A-1 / §5 (aceites + novos campos):** política de cancelamento, termo de saúde, telefone/nascimento/endereço-via-CEP → exigem extensão de modelo/backend (endereço no core, versão da `politicaVendas`, projeção da política no leitor, `validarDados`, saúde). Lote **Fable** (PII/pedido/Function).
- **A-4 / D-5 (toggle Pix|Cartão no Pagamento):** muda o fluxo ratificado no R13 → é DECISÃO do Vitor, não fix não-controverso.
- **T5 microcopy condicional por badge:** precisa do flag do modo de taxa no leitor público (fora do território).
- **M-1..M-7, P-1..P-4:** fricções MÉDIO/POLISH, fora do recorte deste lote.
- **D-1..D-7:** divergências que são decisão do Vitor.

## Commits (prefixo [LEELA-CKFIX-T*])
Ver `git log`. Ordem: StepPagamento (T4) · StepModalidadeKit (T5) · StepResumo (T1/T3) · CheckoutFlow (T1-T4 wiring) · testes · boards+handoff.
