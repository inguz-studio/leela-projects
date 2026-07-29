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
| Rodada `02-rodadas/2026-07-28-onboarding-organizador/` (decisões, RNs, fila) | ✅ | `94db431` |
| Stories no backlog (S1213, S030, S1608, S1609) | ✅ | `2aad846` |
| Modelo de dados (`convitesOrganizador` + delta `profissionais`) | ✅ | `2aad846` |
| Deltas nos épicos (E16, E12, E00) | ✅ | `eb75c0d` |
| Boards (V1-KANBAN card + BOARD-EPICOS delta) | ✅ | ver commit `[LEELA-SPEC-ONBOARD]` final |
| Resumo executivo (fecho) | ✅ | abaixo |

## Disciplina em vigor

- `git add` sempre com caminho explícito; nunca `-A` (DEPLOY-PREVIEW tem trabalho no repo).
- Épicos compartilhados: só ACRESCENTAR seção (única exceção cirúrgica: ponteiro no Won't
  do E16 para a seção nova, para não deixar contradição no canônico).
- `DECISOES-ABERTAS.md` intocado (painel do maestro).

## Fecho da lane · Resumo executivo (2026-07-28)

**Modelo decidido (interpretação confirmada com o dono):** cadastro aberto, acesso
travado. A conta nasce sem código; o código destrava o uso, provisionando o tenant pelo
MESMO `provisionTenant` do caminho manual (RN-403) — uma máquina só.

**Stories criadas (backlog + detalhe no épico dono):**
- `LEELA-S1213` (E12) — entrada do organizador na landing (header/footer públicos). 1 task.
- `LEELA-S030` (E00) — cadastro completo no `/cadastrar` (dados + LGPD; default "cadastro
  não cria tenant" PRESERVADO). 2 tasks.
- `LEELA-S1608` (E16) — códigos de convite no super-admin (`/plataforma/convites`). 2 tasks.
- `LEELA-S1609` (E16) — resgate do código + overlay de acesso travado. 2 tasks.

**RNs mintadas:** RN-411 a RN-417 (série 4xx da plataforma; prova de não colisão no
`02-rns-delta.md`). RN-403/401/402 ampliadas sem número novo; RN-101/S104 declaradas
distintas (convite de clube ≠ convite de plataforma).

**Épicos tocados:** E16 (seção nova + ponteiro no Won't), E12 (delta S1213), E00 (delta
S030). Modelo de dados: ➕ `convitesOrganizador/{codigo}` + delta `profissionais` +
`platform/config.contatoOnboarding`. Boards: card épico→história→tarefa no V1-KANBAN +
delta no BOARD-EPICOS (cabeçalho da Onda 4 e linha do E16).

**Premissas vetáveis pelo dono (P1..P10, tabela completa no `01-decisoes-delta.md`):**
canal do CTA configurável (WhatsApp/mailto — o dono não especificou); código de USO ÚNICO;
validade opcional (default sem validade); 8 chars alfabeto sem `0 O 1 I L`; rate-limit
5/h; conta travada vê só overlay + `/conta` + sair; tenant nasce no RESGATE com nome/slug
do "nome da organização"; CPF/CNPJ fora do cadastro (KYC segue futuro); copy do overlay
passa pelo gate de linguagem; landing→painel por env pública.

**Fila de build sugerida (7 tasks, detalhe em `03-fila-codigo.md`):**
1. `S1608-T1` modelo+core+Rules ⚔ · 2. `S030-T1` cadastro (paralelo) · 3. `S030-T2` doc
do profissional · 4. `S1609-T1` Function de resgate ⚔ · 5. `S1609-T2` overlay ·
6. `S1608-T2` tela de convites (paralela após 1) · 7. `S1213-T1` landing (paralela desde
o início). Itens 1, 2 e 7 partem juntos. ⚠️ `functions/**` disputado com a lane
DEPLOY-PREVIEW — serializar por lane. Review antagonista em contexto fresco nos itens 1 e
4 (enumeração, corrida de uso único, bypass de rate-limit, claim forjada).
