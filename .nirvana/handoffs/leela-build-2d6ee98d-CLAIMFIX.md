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
- Desenho fechado (T0): escritor ÚNICO do claim = `garantirContaSemFriccao` (pós-confirmação, status 'pago'); a criação do pedido NUNCA escreve `contaUid` (pessoaRegistry perde o claim; mantém `callerUid` só p/ anti-hijack de dados). Pessoa ganha `contaEmail` (carimbado no claim, minúsculo) — gate de leitura do prefill = `emailVerified` do token + token.email == contaEmail + contaUid == uid. Deny = `{prefill: null}` sempre (sem oráculo de CPF).
- RN-174 (a) pagamento confirmado + (b) e-mail conta==compra valem no ESCRITOR (claim); (c) emailVerified vale no LEITOR — operacionalização do brief (claim na confirmação cria conta com emailVerified=false; exigir (c) no write travaria o claim para sempre).
- Disparo do e-mail de verificação (1º login / 1ª entrega de ingressos): verificação é Firebase NATIVO client-side (sendEmailVerification no 1º login — apps estão FORA do território); backend não tem fluxo de "entrega de ingressos" por e-mail ainda (nenhum sender existe) — hook entra no lote que criar esse fluxo. Premissa registrada.
- Lane FORM-BUILDER-CAPTURA tem arquivos STAGED não commitados (V1-KANBAN, E05, E12, 00-captura.md) — meus commits usam `git commit --only -- <paths>` para nunca arrastar conteúdo alheio.
