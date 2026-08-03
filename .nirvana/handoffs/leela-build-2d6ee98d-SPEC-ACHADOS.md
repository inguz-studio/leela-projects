# Handoff · Lane SPEC-ACHADOS-0802 · trace leela-build-2d6ee98d

- **Employee:** `sf-cto` (software-forge) · DNA Fowler / DHH / Kleppmann
- **Escopo:** MINI-SPECS dos achados do dono da DEC-0802B — B1 (cálculo pronto ao chegar no
  pagamento), B2 (taxas discriminadas), B5 (parcelas a 2,89% a.m.), B6 (aceites migram para a
  inscrição) e B10 (página do produtor como mini rede social). **Zero código de aplicação.**
- **Território:** `leela-specs/**` + este handoff. Nada fora disso.
- **Repo:** `C:\dev\LEELA`, branch `main`. Commits `[LEELA-SPEC-ACHADOS-0802]`, `git commit --only`.
  **SEM push** (o maestro pusha).
- **Painel `DECISOES-ABERTAS.md`:** intocado (é do maestro).
- **Suítes e emulador:** não rodados — DUAS lanes de build detêm a árvore (KITCUPOM-BUILD em
  `apps/**`+`packages/**`, PIXFIX-EXTREF em `functions/**`).
- **Dono DORMINDO:** toda ambiguidade real vira pergunta de veto numerada aqui, com default
  profissional assumido e marcado vetável. Nada bloqueia em pergunta.

## Placar

| # | Task | Estado | Commit |
|---|---|---|---|
| T0 | Inventário + abertura do handoff | 🔄 | — |
| T1 | `04-spec-achados.md` — B1/B2/B5/B6 (D-ACH-n) | ⏳ | — |
| T2 | `05-rns-achados.md` — RNs novas/alteradas + o que o B6 supersede | ⏳ | — |
| T3 | `06-spec-produtor-page.md` — B10 | ⏳ | — |
| T4 | `07-fila-achados.md` — filas ACHADOS-0802 e PRODUTOR-PAGE | ⏳ | — |
| T5 | Selo · resumo executivo + self-score | ⏳ | — |

## Autoridade de entrada lida

1. `leela-specs/02-rodadas/2026-08-02-retomada/03-achados-dono.md` — os 10 achados verbatim.
2. `leela-specs/02-rodadas/2026-08-02-retomada/01-decisoes.md` — D-0802-1 (vocabulário) e D-0802-2.
3. `leela-specs/02-rodadas/2026-07-29-checkout-ux/` inteira — formato de referência e fronteira.
4. `.nirvana/outputs/leela-build-2d6ee98d/INV-PIXINTERNAL-REPORT.md` — o lastro do B1.
5. `.nirvana/handoffs/leela-build-2d6ee98d-CKUX-REV.md` — o item 64 e as ressalvas R-2/R-3/R-5.

## Inventário em curso

Leitura direta do checkout público (`CheckoutFlow.tsx` 1321 linhas, `StepResumo.tsx`,
`StepPagamento.tsx`, `SeletorForma.tsx`, `CheckoutStepper.tsx`) mais quatro varreduras paralelas
(taxas, parcelas+aceites, página do produtor, numeração de RN e story). Os achados entram nas
specs, não neste handoff.

## Perguntas de veto ao dono

(preenchidas por entregável)
