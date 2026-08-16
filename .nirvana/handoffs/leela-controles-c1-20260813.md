# Onda C1 — as sete violações da regra que o dono citou viram adoção

**Trace** `leela-roadmap-componentes-20260810` · lane **CONTROLES-C1** · branch `controles-c1`
**Worktree** `C:\dev\leela-wt-controles-c1` (criada sobre `origin/main` @ `5cf5b29d`, a mesma base
que a CONTROLES-C0 deixou)
**Data** 2026-08-13/16 · sf-frontend-lead (software-forge) — lane RETOMADA depois de a quota matar
a sessão anterior no meio da edição do `AfiliadoModal`

Paga a **Onda C1** de `02-rodadas/2026-08-12-conformidade-controles/03-fila-em-ondas.md` e a tarefa
**S006-T6** do épico `LEELA-E01-design-system`. **Nenhum deploy.**

## O estado herdado, auditado antes de tocar

A sessão anterior morreu com 5 arquivos modificados sem commit (branch sem nenhum commit próprio,
ainda `= main`). Cada diff foi lido contra o conserto que `01-inventario-controles.md` pedia,
arquivo:linha por arquivo:linha, antes de decidir manter ou refazer:

| Arquivo herdado | Veredito | Por quê |
|---|---|---|
| `clubes/engajamento/EngajamentoView.tsx` + teste | **mantido** | as três conversões (`:299`, `:382`, `:461`) completas e corretas; teste já reescrito para `getByRole('button'/'group')` no lugar de `combobox`/`selectOptions` |
| `plataforma/repasses/RepassesFilaView.tsx` | **mantido** | `<button>` → `<Chip active>`, troca de uma linha, completa |
| `plataforma/tenants/TenantsList.tsx` (não citado no estado herdado, achado na auditoria) | **mantido** | mesma troca, mesma duplicata nomeada no inventário |
| `plataforma/tenants/ProvisionTenantModal.tsx` | **mantido** | `<select>`+`<label>` à mão → `<Select label>`, completa |
| `eslint.config.mjs` (não citado no estado herdado, achado na auditoria) | **mantido, mas dividido** | as duas trocas de dívida (`DIVIDA_CONTROLE_CRU` vazia, `DIVIDA_FILTRO_FORA_DO_CANONE` sem `EngajamentoView.tsx`) estavam corretas; separadas em dois commits para acompanhar cada conversão que as mata (Camada A do gate reprova entrada morta) |
| `eventos/afiliados/AfiliadoModal.tsx` | **refeito — interrompido NO MEIO** | só o comentário, o import de `Combobox`/`ComboboxOption` e o campo `clubes?` da prop tinham sido escritos; a prop não estava desestruturada, não havia `useMemo` de opções, e o JSX **ainda renderizava o `Input` de texto livre**. Completado: opções do Combobox (com fallback para o clube já amarrado que saiu da lista), o par `<label>`+`<Combobox>`, e o container (`AfiliadosPage.tsx`) passou a buscar `clubes` do tenant (`clubesDoTenantQuery` + `useTenantSession`, a mesma leitura que `EngajamentoView` já consome) e a injetar como prop — mesmo padrão que `AddPatrocinadorModal` já usa para `marcasDoRegistro` |

## As sete conversões

| # | Arquivo:linha | Era | Virou | Commit |
|---|---|---|---|---|
| 1 | `plataforma/tenants/ProvisionTenantModal.tsx:150-158` | `<select>` nativo + 2 `<option>` + `<label>` à mão | `Select` | `dd2e2ab5` |
| 2 | `plataforma/tenants/TenantsList.tsx:37-60` | `<button>` replicando `Chip` | `Chip active` | `f09fc120` |
| 3 | `plataforma/repasses/RepassesFilaView.tsx:61-88` | `<button>` replicando `Chip` | `Chip active` | `b19cae66` |
| 4 | `clubes/engajamento/EngajamentoView.tsx:299` | `Select` filtrando (Top 5 / Todos) | `Chip active` | `40241781` |
| 5 | `clubes/engajamento/EngajamentoView.tsx:382` | `Select` filtrando (Top 5 / Todas) | `Chip active` | `40241781` |
| 6 | `clubes/engajamento/EngajamentoView.tsx:461` | `Select` escolhendo o club analisado | `Combobox` | `40241781` |
| 7 | `eventos/afiliados/AfiliadoModal.tsx:283` | `Input` de texto livre p/ clube vinculado | `Combobox` | `3ce4bd43` |

Anti-carga: zero passo novo nas sete; as três de `EngajamentoView` **derrubam** carga (um `Select`
de duas opções era dois toques onde um `Chip` é um).

## A catraca, antes/depois

`pnpm gate:canon --atualizar` (commit `fa014476`), rodado depois das cinco conversões e antes do
merge com `origin/main`:

| Contagem | Antes | Depois | Por quê |
|---|---:|---:|---|
| `botao-cru-estilizado.painel` | 6 | **4** | os dois `<button>` replicando `Chip` (TenantsList + RepassesFilaView) |
| `controle-cru-fora-do-ds.total` | 3 | **0** | o `<select>` + 2 `<option>` do ProvisionTenantModal |
| `filtro-fora-do-canone.total` | 3 | **1** | os dois `Select` de recorte do EngajamentoView; sobra só `ClientesPage.tsx` (padrão órfão, Onda C5) |

`EngajamentoView.tsx:461` (club analisado) nunca foi achado da regra 3 — o `aria-label` "Club
analisado" não casa nenhum dos prefixos (`filtrar/filtro/recorte/recortar/ordenar/quantos/quantas/
top`), então a conversão dele foi leitura humana do inventário, não achado do lint. Confirmado por
`--relatorio` antes de tocar código.

Nenhuma contagem subiu. Nenhum item novo de dívida nasceu.

## Gates, do zero

| Gate | Resultado |
|---|---|
| rebuild `core → design-system → api-client` (`tsup`) | limpo, os três |
| `pnpm gate:canon` (antes do `--atualizar`) | `PASS`, três contagens descendo |
| `pnpm gate:canon --atualizar` | baseline regravado, `fa014476` |
| `pnpm gate:canon` (rodado 3×: depois do 1º merge com `origin/main`, depois do 2º, e na main já mergeada) | `PASS`, zero delta nas três — os dois merges textuais do `gate-canon.baseline.json` (cada lane vizinha mexeu em chaves diferentes do JSON: `grade-crua.painel` da `kits-ia`, nada da `copy-landing`) bateram com a remedição fresca |
| `vitest run` — as 5 telas tocadas (EngajamentoView, AfiliadoModal, TenantsList, ProvisionTenantModal, RepassesFilaView) | **5 arquivos · 83 casos**, verdes — rodado 3× (antes do 1º merge, depois do 1º, depois do 2º) |
| `tsc --noEmit` (painel) | limpo, 2× |
| `eslint src --max-warnings 0` (painel) | limpo, 2× |

Dois testes novos em `AfiliadoModal.test.tsx`: seleção de clube pelo Combobox chega ao `clubeRef`
do payload; lista `clubes={null}` (ainda carregando) não trava o resto do form.

## Lanes vizinhas

`origin/main` avançou duas vezes durante a lane, nenhuma tocando os arquivos desta onda:

1. `edef7abc` (lane `kits-ia` — consolidação da área de Kits). `git merge origin/main --no-edit`
   sem conflito de código; `scripts/gate-canon.baseline.json` teve **auto-merge textual** (cada
   lane mexeu em chaves diferentes do JSON) e o resultado foi reverificado rodando o script
   fresco — bateu byte a byte. Merge `2a2f01df`.
2. `bfd81cec` (lane `copy-landing`/`COPY-REV-2` — revisão da copy da landing). Merge limpo, `3fc9cbde`.

**`V1-KANBAN.md` não foi editado por esta lane.** No momento da aterrissagem a árvore canônica
`C:\dev\LEELA` tinha esse arquivo sujo com edições não commitadas da `COPY-REV-2` em progresso;
editar por cima teria descartado trabalho alheio não commitado na árvore compartilhada. A
`COPY-REV-2` fechou o próprio commit (`bfd81cec`) antes do merge final para main, então o checkbox
`S006-T6` dentro do `V1-KANBAN.md` segue aberto — quem tocar aquele arquivo em seguida fecha, ou
abre um commit de acompanhamento de uma linha. A atualização de status real mora em
`leela-specs/00-boards/BOARD-EPICOS.md` e no épico `LEELA-E01-design-system.md` (S006-T6 ✅),
ambos pagos nesta lane (`00d884eb`).

## Aterrissagem

| O que | Hash |
|---|---|
| commits da onda | `f09fc120` TenantsList · `b19cae66` RepassesFilaView · `dd2e2ab5` ProvisionTenantModal · `40241781` EngajamentoView · `3ce4bd43` AfiliadoModal · `fa014476` baseline · `00d884eb` boards |
| main re-puxada antes do merge (1ª vez) | `2a2f01df` (merge de `origin/main` @ `edef7abc`) |
| main re-puxada antes do merge (2ª vez) | `3fc9cbde` (merge de `origin/main` @ `bfd81cec`) |
| merge `--no-ff` na main | `6c8f1304` |
| push | confirmado — `bfd81cec..6c8f1304 main -> main` |

Nenhum deploy.

## O que fica para as próximas ondas

- **C2 a C6 seguem livres**, esperando a C0 (já paga) para as peças que ainda faltam nascer
  (`FilterBar`, `FilterChips`, `ResultCount`, `CheckboxField`, `FieldGroup` já existem — C2-C6
  convertem as 59 ocorrências restantes com elas).
- **`crm/ClientesPage.tsx:118`** (`Select` de ordenação) segue como padrão órfão na dívida do lint,
  decisão da Onda C5 — não é desta lane.
- **`V1-KANBAN.md` — fechar o checkbox `S006-T6`** (ver "Lanes vizinhas" acima).
- **Prova renderizada nos dois temas (L-019), com navegador.** Não coberta nesta lane: o brief
  desta rodada listou gates explícitos (rebuild, gate-canon, testes das telas tocadas, `tsc`,
  `eslint`) e nenhum deploy — a prova visual com navegador é gate de deploy, e não houve deploy.
