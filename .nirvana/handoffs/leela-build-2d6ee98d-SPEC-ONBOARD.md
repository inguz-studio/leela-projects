# Handoff · Lane SPEC-ONBOARD · trace leela-build-2d6ee98d

- **Employee:** `sf-cto` (software-forge)
- **Escopo:** especificação do onboarding do organizador (entrada na landing, cadastro,
  código de convite, overlay, gestão no super-admin). Zero código de produto.
- **Território:** `leela-specs/**` · este handoff. NADA fora disso — lane DEPLOY-PREVIEW em
  voo tocando código/infra no mesmo repo.
- **Repo:** `C:\dev\LEELA`, branch `main`. Commits `[LEELA-SPEC-ONBOARD]`, SEM push.

## Faixa de RN desta lane

Série da plataforma = 4xx (E16, RN-400..410). Prova de não colisão 2026-07-28: varredura
`RN-411`..`RN-499` no repo fora de `node_modules` — único hit é o fecho da SPECS-0728
declarando `RN-411` em diante como faixa livre. **Faixa consumida: RN-411 a RN-417.**
(`RN-382`/`RN-383` seguem livres como folga da série 3xx — dinheiro, não é o domínio.)

| RN | Tema | Épico dono |
|---|---|---|
| RN-411 | Cadastro aberto, acesso travado | E16 (E00 no cadastro) |
| RN-412 | Dados do cadastro e consentimento LGPD | E00 |
| RN-413 | Código de convite: formato e ciclo de vida | E16 |
| RN-414 | Resgate server-side, atômico e anti-enumeração | E16 |
| RN-415 | Taxa de tentativas do resgate | E16 |
| RN-416 | Escopo da conta travada (overlay) | E16 |
| RN-417 | Canal do CTA configurável | E16 |

## IDs de story mintados (prova de não colisão)

- `S1213` (E12) — S12xx usado até S1212.
- `S030` (E00/painel) — S0xx usado até S029 (S024..S029 = POLIMENTO-0728).
- `S1608`, `S1609` (E16) — S16xx usado até S1607.

## Placar

| Entrega | Estado | Commit |
|---|---|---|
| Rodada `02-rodadas/2026-07-28-onboarding-organizador/` (decisões, RNs, fila) | ✅ | — |
| Stories no backlog (S1213, S030, S1608, S1609) | ⏳ | — |
| Modelo de dados (`convitesOrganizador` + delta `profissionais`) | ⏳ | — |
| Deltas nos épicos (E16, E12, E00) | ⏳ | — |
| Boards (V1-KANBAN card + BOARD-EPICOS delta) | ⏳ | — |
| Resumo executivo (fecho) | ⏳ | — |

## Disciplina em vigor

- `git add` sempre com caminho explícito; nunca `-A` (DEPLOY-PREVIEW tem trabalho no repo).
- Épicos compartilhados: só ACRESCENTAR seção (única exceção cirúrgica: ponteiro no Won't
  do E16 para a seção nova, para não deixar contradição no canônico).
- `DECISOES-ABERTAS.md` intocado (painel do maestro).
