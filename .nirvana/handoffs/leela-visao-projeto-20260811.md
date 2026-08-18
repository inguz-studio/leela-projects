---
trace: leela-redesign-v2-20260810
lane: VISAO-PROJETO (Track B · main)
alvo: C:\dev\LEELA (main, árvore compartilhada) · só `leela-specs/`
data: 2026-08-11
estado: CONCLUÍDA — 3 entregas pagas e pushed (`760c6bab`, `9431002e`, `96c5f6f8`); árvore limpa
---

# VISAO-PROJETO · handoff vivo

Ordem do dono (leva 5, na íntegra): "revise o obsidian também quero ver quais epicos estao
pendentes, qe suas respectivas histórias e tarefas. Todas as nossas tarefas novas devem
entrar em epicos cadastrados e devem resolver histórias que ja existem, prioritariamente.
Se nao, voce cria. com o desenvolvimento perdi essa visao de projeto, quero que vc me
entregue ela também."

Disciplina desta lane: `git commit --only` com pathspec por entrega; push a cada 2 commits;
nunca `git add -A`, nunca amend, nunca stash. **Não toca** código, `.nirvana/` (exceto este
arquivo) nem `leela-specs/01-produto/DECISOES-ABERTAS.md` (outra lane escreve nele hoje).

## Estado inicial verificado

- `main` @ `f9ed402b`, árvore de `leela-specs/` limpa (único untracked: `KICKOFF-BUILD.md`,
  não é meu).
- Boards lidos: `CONVENCAO-BOARDS.md`, `BOARD-EPICOS.md` (93 linhas, 21 épicos),
  `V1-KANBAN.md` (169 cards), `V1-CHECKLIST.md` (para no lote de 05/06 de agosto),
  `03-canon/epics/` (21 arquivos, E00 a E20).
- Rodada do redesign lida: `02-rodadas/2026-08-09-redesign-ds/01-decisoes-dono-1008-retomada.md`
  (D-1008-R1..R19) + handoffs DELTA-UX, AJUSTES-DONO, ENGAJAMENTO-DASH, PARCERIAS-NAV,
  pausa noite-2.

## Inventário (números medidos nos arquivos, não em memória)

| Coluna do kanban | Cards |
|---|---|
| 📋 Backlog | 41 |
| 🔄 Em execução | 12 |
| ✅ Feito | 112 |
| 🧊 Fora da V1 | 4 |

Épicos cadastrados: **21** (E00 a E20). Fechados: E00, E01, E02, E03, E05, E06, E07, E16
(recortes de onda 0/1/2), E09, E12, E04, E17, E18 nas ondas concluídas. Em execução (onda 4):
E08, E10, E11, E19. Planejados: E13 (PWA), E20 (radar). Gelados: E14, E15, E06-avançado,
E17-in-app, E13-heroica.

## Achados de inconsistência (viram seção do documento de visão)

1. Quatro cards do redesign v2 estão em ✅ Feito, mas o código vive na branch
   `redesign-engajamento-v2` e não foi para o ar. A convenção diz ✅ = "entregue e no ar".
2. `V1-CHECKLIST.md` para em 06/08; kanban e épicos seguiram até 10/08.
3. Nove histórias vivem só no kanban e na pasta da rodada, sem consolidação no épico:
   S221, S907, S908, S824, S1231, S1611, S1242, S1243, S031.
4. E20 (radar da comunidade) tem spec completa com nove histórias e **zero cards** no kanban.
5. Nove cards sem âncora de épico (`[Plano]`, `[Higiene]`, `[Fidelidade]`, `[Transversais]`,
   `[Consolidações]`, `[Decisões]`, `[Docs]`, `[Recortes]`); dois deles ainda abertos.
6. Toda a leva 3/4/5 do redesign (D-1008-R7..R19) estava sem card e sem história.

## Entregas

- [x] **E1 · inventário** — dentro do documento de visão (placar por estado + peso por épico).
- [x] **E2 · re-ancoragem** — commits `760c6bab` (8 épicos do canon) e `9431002e` (kanban +
      board de épicos).
- [x] **E3 · visão de projeto** — commit `96c5f6f8`:
      `leela-specs/00-boards/VISAO-DE-PROJETO.md`, linkada do `HOME.md` e da
      `CONVENCAO-BOARDS.md`.

## Re-ancoragem, decisão por decisão

| Origem | Onde entrou | História nova? |
|---|---|---|
| D-1008-R4, R5, R6, R7, R14, R18 | E01 · **S004** (T1..T6) | sim — S002 é movimento de overlay, S003 é a barra superior; nenhuma cobria |
| D-1008-R11 + ordem do dono de 10/08 sobre componentes | E01 · **S005** (T1..T5) | sim — inclui as ~40 telas com superfície crua |
| D-1008-R9, R10, R16 | E05 · **S113** (T1..T4) | sim — nenhuma das 12 histórias do E05 fala de navegação de área |
| D-1008-R15 (dashboard do estudo) | E05 · **S114** (T1..T4) | sim — a tela nasceu depois das histórias existentes |
| destrava dos blocos 1-3 do estudo | E05 · **S115** (T1..T3) | sim |
| D-1008-R17 (+ adendo) | E10 · **S813** (T1..T4); toca E18 e E08 | sim — o E10 é o dono da área, o dono só a renomeou |
| destrava do bloco 7 (formas de pagamento) | E11 · **S825** (T1..T2) | sim |
| destrava do bloco 5 (vínculo membro↔comprador) | E19 · **S1904** (T1..T3) | sim |
| D-1008-R12 (lotes em 3 colunas) | E04 · **S315-T10** | não — tarefa em história existente |
| D-1008-R13 (modalidades antes de lotes) | E04 · **S316** inteira + proposta em 2 fases | não |
| D-1008-R19 (ticket médio por pagante) | E03 · **S221** · E09 · **S908-T4** | não — e as duas foram consolidadas no épico |
| D-1008-R19 (funil nunca por inscritos) | E11 · **S824-T2** | não |

**Zero épicos novos.** Nenhuma frente da rodada ficou sem adesão a um dos 21 vigentes.

## Consolidações que a varredura pagou

S221 (E03), S907 e S908 (E09), S824 (E11) viviam só na pasta da rodada de 05/08 e no kanban —
agora estão nos épicos com tabela de tarefas. Ficam pendentes de consolidação, para a próxima
aterrissagem que as tocar: S1231, S1611, S1242, S1243, S031.

## Achados que ficaram registrados (seção própria no documento de visão)

1. A leva 3/4/5 do redesign não tinha card nem história — **consertado**.
2. Nove histórias sem lastro no épico — **quatro consolidadas**, cinco anotadas.
3. E20 com spec completa e zero presença no kanban — **consertado** (card com as 9 histórias).
4. Um card em ✅ Feito descreve trabalho que vive na branch `redesign-engajamento-v2` e não
   está no ar — **marcado** como "construído, fora do ar" (a casa já tem esse precedente).
5. `V1-CHECKLIST.md` para em 06/08 enquanto kanban e épicos seguiram até 11/08 — **decisão de
   processo, subiu ao dono**, não foi consertada por conta própria.
6. Nove cards sem âncora de épico (2 abertos) — **anotados**, não reescritos.
7. Três wikilinks quebrados no kanban (`LEELA-E05-clubes`) — **consertados**.

## O que a próxima lane precisa saber

- Os números do documento vieram de contagem sobre o `V1-KANBAN.md` de 11/08 (46 backlog · 15
  em execução · 112 feitos · 4 fora da V1). Se o board mudar, recontar antes de citar.
- Quando o merge do redesign acontecer e o deploy subir com conferência visual, o estado dos
  cards de S004, S113, S114 e S813 muda de "construído, fora do ar" para feito — e a S005
  destrava (o inventário de componentes só mede a verdade pós-merge).
- Os vetáveis novos da rodada estão listados no documento de visão, mas **não** foram escritos
  em `DECISOES-ABERTAS.md`: aquele arquivo era território de outra lane esta noite.
