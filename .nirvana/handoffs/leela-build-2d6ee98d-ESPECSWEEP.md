# Handoff · lane ESPEC-SWEEP · run leela-build-2d6ee98d

- **Empresa/employee:** software-forge · sf-cto · rota **opus** effort xhigh
- **Ordem do Vitor (2026-07-19):** revisitar TODOS os épicos do roadmap e escrever o passo a passo de planejamento e specs deles, na ordem em que serão implementados.
- **Escopo:** 100% planejamento/spec. Zero código de produto.
- **Território desta lane:** `leela-specs/**` (épicos, boards, rodadas) + `outputs/leela-build-2d6ee98d/ESPEC-SWEEP-REPORT.md` + este handoff.
- **Contexto que vale sobre o brief:** teto de modelo = **opus** (Regra L, `08-model-routing`); Fable saiu da matriz; sonnet segue proibido no Leela. TAXA-FLEX e SUITE-STAB aterrissaram — considerados ENTREGUES no inventário.

## Regra de rota de modelo usada em todas as tasks

| Rota | Quando | Effort | Gate |
|---|---|---|---|
| **opus** | dinheiro, segurança, permissões, Rules, claims, PII/LGPD, arquitetura, UI/tela, review adversarial, veredito de gate | xhigh (max só no veredito mais difícil) | testes reais (exit code) + review antagonista em contexto fresco quando ⚔ |
| **haiku** | mecânico bem especificado COM gate determinístico (transform, rótulo, wiring repetitivo, doc estruturado) | — | determinístico obrigatório; sem gate executável, sobe para opus |

Estourou opus com effort máximo ⇒ escala para o **humano**, nunca para tier acima.

## Placar por épico

| # | Entrega | Estado | Commit |
|---|---|---|---|
| 0 | `ROADMAP.md` §5 consolidado (ordem ratificada 18/07) | ⏳ | — |
| 1 | Caminho do dinheiro em curso (E04/E09/E12/E16) | ⏳ | — |
| 2 | E08 — painel do promotor | ⏳ | — |
| 3 | E10 — consolidação de ativações (S812) | ⏳ | — |
| 4 | E19 — disparo de comunicação a segmentos | ⏳ | — |
| 5 | E11 — épico inteiro | ⏳ | — |
| 6 | E13-slim — RESPEC como PWA (ADR-proposta) | ⏳ | — |
| 7 | H2 — E17 social in-app · E14 TrainingProvider · E06 avançado | ⏳ | — |
| 8 | E15 — Creator Studio (esqueleto) | ⏳ | — |
| 9 | Rodada `2026-07-19-espec-sweep/` + boards + report | ⏳ | — |

## Regras operacionais desta lane

- `git pull` antes de começar e antes de cada commit.
- `git commit --only -- <paths>` sempre; nunca arrastar arquivo de lane alheia.
- Commit + push **por épico**, na ordem de implementação.
- Decisão type-1 não é minha: vira **DECISÃO-ABERTA** consolidada em `02-rodadas/2026-07-19-espec-sweep/01-decisoes-abertas.md`.
- Lane paralela (documentação da SUITE-STAB) mexe só em `.nirvana/handoffs/` e `outputs/` — sem colisão com `leela-specs/`.

## Log
