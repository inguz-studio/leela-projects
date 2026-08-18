# MERGE do redesign — `redesign-engajamento-v2` → main

- **trace_id:** `leela-redesign-v2-20260810` · lane MERGE
- **working dir:** `C:\dev\LEELA` (repo main, branch main)
- **estado:** ✅ CONCLUÍDA — merge `b51cdcd9` na main, gates verdes, boards em `b0f979e5`, tudo pushed
- ⛔ **nenhum deploy.** Nada disto está no ar. A fase de deploy tem runbook próprio.
- **Servidores intocados, conferido por `netstat` no fim:** `:4601` segue no PID **19132** (o mesmo
  que a R3-MICROFIX subiu) e `:4599` no PID **25384**. Não matei processo nenhum, não re-servi nada,
  não encostei em emulador. O `:4601` continua servindo o bundle do worktree da branch — é a fase de
  deploy que cuida das superfícies.

## Passo 0 · Pré-condições (conferidas por mim)

- `main` = `fe613d23` (= `origin/main`), `redesign-engajamento-v2` = `f815c5ae` (= `origin/redesign-engajamento-v2`). Bate com o estado do maestro.
- Handoff `leela-redesign-REV-final.md`: veredito **LIBERADA COM RESSALVAS**, R-3 única ressalva de código.
- Handoff `leela-r3-microfix.md`: R-3 paga, HEAD final da branch `f815c5ae`, pushed.
- ⚠️ Árvore NÃO estava limpa: `M pnpm-workspace.yaml` com a linha
  `'@sentry/cli': set this to true or false` — é exatamente o lixo da ressalva **R-8**
  (placeholder que o `pnpm install` escreve). Não é trabalho de lane. Restaurado com
  `git checkout -- pnpm-workspace.yaml` (remédio documentado pela própria R-8).
- Worktrees vivos: `C:/dev/leela-wt-redesign-v2` (branch do merge) e `C:/dev/leela-wt-bootreal2` (detached, alheio).

## Passo 1 · merge-tree (preview re-rodado)

`git fetch --all --prune` não moveu nada: `main` = `origin/main` = `fe613d23`,
branch = `origin/redesign-engajamento-v2` = `f815c5ae`.

| Medida | REV-FINAL (leitura de ontem) | Agora (re-rodado por mim) |
|---|---|---|
| merge-base | `eed6cf22` | `eed6cf22` (mesma) |
| `origin/main` | `5a952bc1` (+46 commits, 71 arq.) | **`fe613d23`** (+52 commits, **81 arq.**) |
| HEAD da branch | `89537700` (+48 commits, 167 arq.) | **`f815c5ae`** (+49 commits, **167 arq.**) |
| Interseção de arquivos tocados nos dois lados | vazia | **vazia** |
| `git merge-tree --write-tree` | exit 0, tree `3d05e057` | exit **0**, tree **`1f261f60`** |

**Zero conflito. Zero resolução necessária.** As duas frentes seguiram em arquivos disjuntos
mesmo depois de a main andar 6 commits e a branch 1. Os renames pesados de parcerias
(`routes/marcas/*`, assessorias e afiliações saindo de clubs) não colidiram porque a main
não encostou em nenhum desses caminhos.

## Passo 2 · Merge

- **Commit de merge: `b51cdcd9`** (`--no-ff`, mensagem nomeando o trace e o intervalo
  `e64b8c47..f815c5ae`).
- Pais: `fe613d23` (main) + `f815c5ae` (branch). 26 commits não-merge no intervalo, 10 lanes.
- Árvore do commit = **`1f261f60`**, idêntica à do `merge-tree` — o merge real reproduziu o preview
  byte a byte.
- Sem rebase, sem squash: a trilha de commits das 10 lanes ficou preservada.
- `git status --porcelain -uno` = 0 linhas depois do merge.

## Passo 3 · Gates pós-merge (números que EU rodei, na main mergeada)

Todos foreground, em série, `pnpm --config.verify-deps-before-run=false exec …`, sem lane vizinha.
Zero contenção: nenhuma suíte deu timeout, nenhum conjunto de falhas mudou entre execuções.

| Gate | Comando | Resultado |
|---|---|---|
| Suíte painel INTEIRA | `vitest run` em `apps/painel` | **235 arquivos · 2583 testes · 2583 passed · 0 failed** (360,99 s) |
| Suíte DS completa | `vitest run` em `packages/design-system` | **75 arquivos · 1809 testes · 1809 passed · 0 failed** (43,24 s) |
| `tsc --noEmit` painel | `tsc --noEmit` | exit **0** |
| `tsc --noEmit` DS | `tsc --noEmit` | exit **0** |
| Lint painel | `eslint src --max-warnings 0` | exit **0** |
| Lint DS | `eslint src showcase/src --max-warnings 0` | exit **0** |
| `generate-tokens` 2× | `tsx src/scripts/generate-tokens.ts` | exit 0 nas duas · **run1 == run2 byte a byte** nos 5 arquivos · conteúdo gerado == commitado |
| Gate de frescor | `node scripts/verificar-frescor-do-workspace.mjs` | **exit 0 nos 3 apps** |

**O painel foi de 2580 para 2583.** Os 3 casos a mais são exatamente os 3 `it` que a R3-MICROFIX
escreveu (1 em `MarcasPage.test.tsx`, 2 em `ParceriaDetailPage.parse.test.tsx`). O DS ficou em 1809,
igual à REV-FINAL. Nenhum outro número se mexeu com a main de 52 commits entrando junto.

**O `generate-tokens` e a armadilha CRLF.** Depois da primeira rodada o `git status` acusou 5
arquivos modificados, e isso é o artefato de fim de linha que a árvore tem: o gerador escreve LF, o
índice guarda CRLF. `git diff` (que normaliza) devolveu **vazio**, ou seja, o conteúdo gerado é
idêntico ao commitado. Não confiei só nisso: guardei os 5 arquivos da rodada 1, rodei a 2 e comparei
byte a byte — **idênticos**. Determinismo provado por medição, não pela ausência de `git status`.
Estado restaurado com `git checkout --` nos 5.

**Gate de frescor — quais dist reconstruí.** O gate reprovou logo depois do merge, como tinha de
reprovar: o merge atualizou o mtime das fontes e deixou todo `dist/` para trás.

| Pacote | Antes | Ação | Depois |
|---|---|---|---|
| `@leela/core` | `dist/index.mjs` **6466 min** atrás da fonte | `tsup` | fresco |
| `@leela/design-system` | `dist/tailwind-preset.js` **115 min** atrás da fonte | `tsup` (2×, ver abaixo) | fresco |
| `@leela/api-client` | não acusado, reconstruído junto por disciplina | `tsup` | fresco |

O DS levou **dois** `tsup`: o `generate-tokens` reescreve `src/theme/rn-themes.ts`, então rodá-lo
depois do primeiro build deixaria a fonte de novo à frente do `dist/`. Ordem final: tsup core →
tsup api-client → tsup DS → suítes/tsc/lint → generate-tokens 2× → tsup DS de novo → frescor.

Veredito final do gate, nos três apps:

```
@leela/painel:  3 pacote(s) de workspace com dist/ à frente da fonte  → exit 0
@leela/landing: 3 pacote(s) de workspace com dist/ à frente da fonte  → exit 0
@leela/mobile:  1 pacote(s) de workspace com dist/ à frente da fonte  → exit 0
```

⚠️ **Os 18 vermelhos de functions não foram perseguidos** — são ambientais conhecidos (portas
dedicadas) e o gate desta lane é painel + DS + core, como o contrato definiu.

## Passo 4 · Push

- `git push origin main`: `fe613d23..b51cdcd9  main -> main`, exit **0**.
- `main` = `origin/main` = **`b51cdcd9`**.
- `git status --porcelain -uno` = 0 linhas antes e depois do push.

## Passo 5 · Boards

Commit `--only`, pathspec explícito, sem `-A` (o repo tem centenas de arquivos não rastreados
em `.nirvana/` e um `git add -A` os arrastaria junto).

**`leela-specs/00-boards/BOARD-EPICOS.md`**

- Tabela da rodada do redesign: S004, S113, S114 e S813 saem de "construído, fora do ar" / "lane em
  voo" e viram **"construído, mergeado, aguardando deploy"**. A S005 sai de "dispara depois do
  merge" e vira **destravada** (o inventário de componentes agora tem uma main para medir).
- Parágrafo novo com a data do merge, o hash, o intervalo e os números dos gates — e a frase que
  impede a leitura errada: **nada disso está no ar**.

**`leela-specs/00-boards/V1-KANBAN.md`**

- O card em ✅ Feito que a VISAO-PROJETO marcou (achado 4, Engajamento no redesign v2) troca
  "construído, fora do ar" por "construído, mergeado, aguardando deploy", com o hash do merge.
- Card E01 (S004): mesmo marcador; e a frase "Cinco já estão consertadas na branch; a última está na
  lane em voo" virou mentira com o merge — as seis estão. **S004-T6** marcada, com a lane
  (`7230a75d`) e o gate do R18 nomeados.
- Card E05 (S113/S114): mesmo marcador. **S113-T3 e S113-T4** marcadas, com as lanes e a evidência
  da REV-FINAL; a ressalva R-1 (contra-tabela `FORA_DA_MOLDURA` em Parcerias) ficou anotada na
  própria tarefa para não sumir.
- Card E10/E18/E08 (S813): sai de "lane em voo" para o marcador do merge; **S813-T1 a T4** marcadas.
  O item aberto para o dono ("o épico continua se chamando Marcas nos arquivos") ficou intocado.

**`leela-specs/02-rodadas/2026-08-09-decisoes-dono/02-fila-execucao.md`** — os 3 builds retidos:

| Build | Estado novo | O que mais mudou |
|---|---|---|
| CLUBES-CTA | ✅ destravado, fila | território (`apps/landing` + `functions/`) não foi tocado pelo merge, nada a re-endereçar |
| SERV-3-RENOME | ✅ destravado, fila | ⚠️ **refazer o inventário das 34 strings na main mergeada** — as telas de marcas, assessorias e afiliações mudaram de endereço, a contagem de 09/08 aponta para caminhos mortos |
| PATROCINADOR-TOGGLE | ✅ destravado, fila | território corrigido de `routes/marcas/MarcasPage.tsx` para `routes/parcerias/marcas/MarcasPage.tsx`; rename puro, e as duas linhas citadas (`:188-189` e `:133`) continuam válidas — conferi na main mergeada |

## O que fica para a próxima lane

1. **Deploy** com gate visual obrigatório. Duas coisas da REV-FINAL valem aqui: o build de produção
   exige `--mode leela-hub` (ressalva **R-7** — sem o modo o bundle sai sem configuração de Firebase,
   compila, sobe e não fala com o backend), e a ordem tsup-antes-de-vite é o que faz o código do DS
   chegar ao bundle.
2. **Roadmap de componentes** (brief QUEUED), que a S005 agora destravou.
3. **Ressalvas não pagas da REV-FINAL**, todas fora do portão do merge: R-1 (teste), R-2 (emendar a
   D-1008-R19 escrita, que hoje contradiz o código), R-4, R-5, R-6.
4. **Disciplina R-8 continua valendo:** qualquer `pnpm` sem `--config.verify-deps-before-run=false`
   suja o `pnpm-workspace.yaml` com o placeholder do `@sentry/cli`. Aconteceu de novo antes desta
   lane começar (achei a árvore assim) e foi restaurado com `git checkout --`.
