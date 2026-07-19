# Checkpoint — lane CLAIMFIX · run leela-build-2d6ee98d

- Lane: sf-backend-lead (software-forge) · rota Fable
- Brief: `.nirvana/briefs/leela-claim-fix-enriched.md` (RN-174)
- Base: main == origin == 71c0df6

## Estado

| Task | Status | Commit |
|------|--------|--------|
| T0 — checkpoint criado, leitura de contexto | FEITO | — |
| T1 — mover first-claim p/ confirmação de pagamento (escritor único) | FEITO | `ca9ec6a` |
| T2 — gate emailVerified + e-mail-match no getCheckoutPrefill / leitores de dadosConhecidos | FEITO | `222dc3b` |
| T3 — testes negativos (5 do brief) + integração emulator r6 | FEITO (53 verdes em 8480/9598) | `71c32d1` (pushed) |
| T4 — gates: tsc/eslint 0 (core/functions/api-client/landing) · lane 54/54 no r6 FRESCO · 46/46 no 8080 QUENTE · suíte INTEIRA rodando (número final anexado abaixo ao concluir) | EM ANDAMENTO (só o summary da suíte inteira) | `e4ddbb9` (warm-safe) |
| T5 — review antagonista Fable contexto fresco: APROVADO COM FIXES; fix (teste auto-cura hostil) aplicado e RE-PROVADO (r6 fresco 54/54) | FEITO | `18d4fbb` + `e4ddbb9` |
| T6 — aterrissagem (épicos E19/E12, kanban card h → Feito, checklist, report, TAXA-FLEX destravado) | FEITO (commit de docs; incorpora molde de histórias da lane BOARDS-PADRAO-EPICOS em E12/E19 sem reverter) | ver commit de docs |

## Notas
- **Gate da suíte inteira — run 1 INVALIDADO (autocrítica):** o run de fundo (8080/9099) terminou 37 files/405 testes vermelhos, TODOS com a mesma assinatura `clearFirestore → 409 Transaction lock timeout` e zero interseção com o território da lane — contaminação causada pelos MEUS re-runs em foreground contra o MESMO emulator vivo no meio da suíte (18:01-18:05). Lição (não repetir): emulator de suíte inteira é EXCLUSIVO — re-provas em paralelo só em emulator próprio (r6) ou após o término. Rerun LIMPO (mesmo comando canônico, emulator fresco, sem toque concorrente) em andamento; número final abaixo.
- **Rerun #2 (18:18) — summary PERDIDO:** o processo sobreviveu à queda do Antigravity e terminou ~18:46, mas a saída ia pro terminal morto. Sem número.
- **Rerun #3 (18:47, emulator EXCLUSIVO, log `claimfix-t4-suite-full3.log`) — 43 files vermelhos / 117 verdes ⇒ TEORIA DA CONTAMINAÇÃO FALSIFICADA.** Assinatura: 711× `TypeError: reading 'ate_17'` em `lib/functions/src/analytics/agregarDemografia.js` + 678× socket hang up + 703× 409 Transaction lock. **Causa-raiz PROVADA: `functions/lib` STALE** — build de 11:07 vs src de 11:30 (`aa0afac` RN-822 trocou buckets por bandas de 5 anos); o emulator rodava JS pré-RN-822 contra dados novos → crash-loop no runtime de functions → transações presas → cascata 409 nos clearFirestore. Runs 1-3 rodaram TODOS com lib stale ⇒ o run 1 provavelmente já era isto (a autocrítica de contaminação foi mis-diagnóstico honesto).
- **Fix + prova (19:36):** `npm run build` em functions/ (lib é untracked, nada a commitar) + prova alvo em emulator fresco: `demografia.integration` + `tenantIsolation` **2/2 verdes** (`suite-red-targeted-check.log`) — o tenantIsolation do rerun #3 era cascata, não bug de claims.
- **LIÇÃO (registrar no ledger de lições do run):** o comando canônico da suíte inteira passa a ser `npm run build && npx firebase-tools@13 emulators:exec --project demo-leela "npx vitest run"` — gate sem rebuild testa código VELHO e produz vermelho fantasma. Vale para toda lane que toque `functions/src`.
- **Rerun #4** (lib fresco, árvore congelada, emulator exclusivo) em `claimfix-t4-suite-full4.log`; número final abaixo.
- Desenho fechado (T0): escritor ÚNICO do claim = `garantirContaSemFriccao` (pós-confirmação, status 'pago'); a criação do pedido NUNCA escreve `contaUid` (pessoaRegistry perde o claim; mantém `callerUid` só p/ anti-hijack de dados). Pessoa ganha `contaEmail` (carimbado no claim, minúsculo) — gate de leitura do prefill = `emailVerified` do token + token.email == contaEmail + contaUid == uid. Deny = `{prefill: null}` sempre (sem oráculo de CPF).
- RN-174 (a) pagamento confirmado + (b) e-mail conta==compra valem no ESCRITOR (claim); (c) emailVerified vale no LEITOR — operacionalização do brief (claim na confirmação cria conta com emailVerified=false; exigir (c) no write travaria o claim para sempre).
- Disparo do e-mail de verificação (1º login / 1ª entrega de ingressos): verificação é Firebase NATIVO client-side (sendEmailVerification no 1º login — apps estão FORA do território); backend não tem fluxo de "entrega de ingressos" por e-mail ainda (nenhum sender existe) — hook entra no lote que criar esse fluxo. Premissa registrada.
- Lane FORM-BUILDER-CAPTURA tem arquivos STAGED não commitados (V1-KANBAN, E05, E12, 00-captura.md) — meus commits usam `git commit --only -- <paths>` para nunca arrastar conteúdo alheio.
