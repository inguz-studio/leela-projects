---
tags: [leela, handoff, fix, design-system, redesign-ds]
trace: leela-redesign-ds-20260809
lane: FIX
data: 2026-08-10
---

# Handoff — REDESIGN-DS · lane FIX (paga os 2 bloqueadores da REV)

> Persona: `sf-frontend-lead` (Software Forge). Contexto fresco: recebi os
> defeitos, os artefatos e os critérios do brief enriquecido, não a conversa
> que produziu o código.

Contrato: `.nirvana/briefs/leela-redesign-ds-20260809-fix-enriched.md`.
Fonte dos defeitos, com prova e arquivo:linha: `.nirvana/handoffs/leela-redesign-ds-20260809-REV.md`
(commit `4654394f`).
Território: **`apps/painel` somente**. Nenhum token, nenhum componente de
`packages/design-system`, nenhuma rota nova.
Commit: **`5826466d865de836997a6c057085a84fc92c3e93`** (branch `main`), 6
arquivos, todos em `apps/painel/src/routes/clubes/`.

---

## Veredito

# PAGA — os 2 defeitos bloqueadores da REV foram consertados

D-1 e D-2 pagos, com teste cobrindo cada um. Duas adições de 1 linha da
lista opcional aproveitadas na mesma vizinhança (D-7, D-10). A terceira
opção (D-9, `aria-expanded`) foi **recusada por invariante de território** —
registrado abaixo, não esquecido.

---

## D-1 · Equilíbrio dos pilares — de soma sem peso para média ponderada

**O defeito (REV):** `engajamento.ts:153-155` somava `atual`/`meta` de cada
desafio ao longo de N desafios sem peso, e a tela rotulava o resultado
"Pontos acumulados sobre a meta de cada pilar". Um desafio de 2
participantes pesava igual a um de 500.

**Por que a média ponderada (e não a outra opção do brief).** O brief dá
duas saídas: ponderar por `qtdParticipantes` se o contrato expõe o número de
participantes por desafio, ou derivar algo mais pobre (média das médias,
"meta batida em X de N") se não expuser. O contrato EXPÕE: verifiquei
`functions/src/jornada/onRegistroWrite.ts:211-239` — a mesma
`participantesSnap` que vira o array `participantes` passado para
`derivarProgressoPorPilar` (linha 233-236, que divide por
`participantes.length`) é a que gera `qtdParticipantes: participantesSnap.size`
(linha 239), gravado no MESMO `update()`. Ou seja, `Desafio.qtdParticipantes`
não é uma proxy aproximada do peso — é o denominador EXATO que a Function
usou para tirar a média `atual`/`meta` daquele desafio. Ponderar por ele não
é uma escolha de conveniência, é a única ponderação que reflete a origem
real do número.

**Conserto** (`apps/painel/src/routes/clubes/engajamento/_lib/engajamento.ts`,
`resumirPilares`): a função agora acumula `atual × peso` e `meta × peso` por
pilar (peso = `desafio.qtdParticipantes`), soma os pesos, e divide no final
— `Σ atualᵢ·nᵢ / Σ nᵢ` e `Σ metaᵢ·nᵢ / Σ nᵢ`, arredondado a 1 casa decimal
(`arred1`, mesmo critério de `registro.ts`). Desafio com `qtdParticipantes
<= 0` não entra na ponderação (defensivo — não deveria acontecer, já que a
Function só grava `progressoPorPilar` quando há participantes, mas não
distorce a média se acontecer).

**Rótulo e `aria-label`** (`EngajamentoView.tsx`): "Pontos acumulados sobre
a meta de cada pilar" virou "Média de pontos por participante em cada pilar
sobre o mínimo exigido, ponderada pelo tamanho dos desafios que operam
equilíbrio"; o `aria-label` do gráfico (o que o leitor de tela ouve) virou
"Média de pontos por participante por pilar, ponderada por desafio, sobre o
mínimo exigido".

**Formatação:** `formatValue` do `BarChart` trocou de `formatInt` para
`formatDecimal1` (nova função em `_lib/format.ts`,
`Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })`)
— a casa decimal agora é SEMPRE visível (`150` vira `150,0`), para o número
nunca parecer contagem inteira por cima de uma média.

**Teste que prova a ponderação** (`_lib/__tests__/engajamento.test.ts`,
"pondera por qtdParticipantes — um desafio de 500 não pesa igual a um de
2"): desafio A com 2 participantes (`atual: 100, meta: 200`) e desafio B com
500 (`atual: 10, meta: 20`). Ponderado: `(100×2 + 10×500)/502 = 10,4`;
`(200×2 + 20×500)/502 = 20,7`. A soma crua (o bug antigo) daria `atual =
110` — o teste também afirma que o resultado NÃO é 110.

---

## D-2 · "Inativos (30 dias+)" — de afirmação de atividade para verdade do dado

**O defeito (REV):** `membro.ts:98` cai para `entrouEm` quando
`ultimaAtividadeEm` não existe, e em produção NENHUMA Function escreve
`ultimaAtividadeEm` — só o seed (`functions/src/seed/membros.seed.ts:176`).
Os dois leitores do campo (`clubs/membrosAggregates.ts:50`,
`jornada/entrarNoDesafio.ts:89`) só leem. Confirmado de novo nesta lane:
`membrosAggregates.ts:50` faz `toDateOrNull(data['ultimaAtividadeEm'])` e
passa direto para `derivarStatus` — nenhuma escrita em lugar nenhum de
`functions/src` fora do seed.

**Por que não construí o escritor.** O brief é explícito: NÃO construir
nesta lane — é card de backend próprio, decisão de produto (que evento
conta como "atividade" — check-in? registro de ação? qual?), fora do
território `apps/painel`. Registrado como pendência abaixo.

**Conserto** — o rótulo e a legenda passam a descrever o que o dado
sustenta hoje, não o que ele deveria sustentar:
- `ROTULO_SITUACAO.inativo` (`_lib/engajamento.ts`): "Inativos (30 dias+)" →
  **"Sem registro (30 dias+)"**. Comentário no código documenta o porquê,
  citando `derivarStatus` e o único escritor real.
- Legenda em `EngajamentoView.tsx` (bloco "Situação dos membros"): "quem
  está sem atividade há 30 dias ou mais" → **"quem está há 30 dias ou mais
  sem nenhum registro de atividade"**. A frase não afirma mais um fato sobre
  o comportamento do membro (que pode ter treinado ontem) — afirma a
  ausência de registro, que é o que o sistema realmente sabe.

O `id: 'inativo'` interno e o `status` do core (`packages/core`) NÃO foram
tocados — a mudança é só a copy que o organizador lê, que é o território
desta lane.

**Teste** (`_lib/__tests__/engajamento.test.ts` e
`__tests__/EngajamentoView.test.tsx`): o rótulo antigo "Inativos (30 dias+)"
não aparece mais em lugar nenhum do código (varrido); o teste da View afirma
positivamente que a nova legenda está presente e que a frase "sem atividade
há 30 dias" (a afirmação que a REV derrubou) NÃO está.

**Pendência registrada — card de backend fora desta lane:** o escritor de
`membro.ultimaAtividadeEm` (uma Function que grave o campo nos gatilhos de
atividade real do atleta — candidatos: `onRegistroWrite`,
`entrarNoDesafio`). Sem ele, o rótulo "Sem registro" continua sendo o teto
de honestidade que o produto pode afirmar. Quando o escritor existir, o
rótulo pode voltar a falar "atividade" de verdade — é outra lane.

---

## Adições opcionais — 2 feitas, 1 recusada

Da lista de três candidatas do brief (cada uma só se coubesse em 1-2 linhas
+ teste):

### Feita · D-7 — guarda de NaN no KPI do tenant
`resumirComunidade` (`_lib/engajamento.ts`): `clubes.reduce((s, c) => s +
c.qtdMembrosAtivos, 0)` virou `s + (c.qtdMembrosAtivos ?? 0)`. Um club sem o
agregado ainda escrito (janela entre criação e a Function rodar) não
envenena mais a soma do tenant inteiro com `NaN`. 1 linha + comentário + 1
teste (`_lib/__tests__/engajamento.test.ts`, "um club sem o agregado ainda
... não vira NaN no KPI do tenant").

### Feita · D-10 — `<button>` cru do estado vazio vira o `Button` do DS
`EngajamentoView.tsx`, estado vazio `semClubes`: o CTA "Criar um club" era
um `<button>` estilizado à mão (texto sublinhado, sem padding). Virou
`<Button variant="secondary" size="sm">`, o MESMO padrão que
`overview/_components/ComunidadeResumo.tsx:81` já usa para o trabalho
idêntico. Import de `Button` acrescentado à lista já existente de imports de
`@leela/design-system` (o arquivo já consumia o DS — não é adoção nova).
1 teste novo (`__tests__/EngajamentoView.test.tsx`, "o CTA 'Criar um club' é
o botão do DS, não markup cru") clica no botão via `role: 'button'` e
confirma o `onCriarClube` disparando.

### Recusada · D-9 — `aria-expanded` no gatilho do drawer
O brief autorizava esta adição, mas ela **viola o invariante de território
desta lane**. `AppShell.tsx:111` (`<IconButton aria-label={menuLabel}
onClick={() => setMenuOpen(true)}>`, sem `aria-expanded`) vive em
`packages/design-system/src/components/AppShell/AppShell.tsx` — **não em
`apps/painel`**. O contrato desta lane é explícito: "Nenhum token, nenhum
DS, nenhuma rota nova." Corrigir esse componente exigiria tocar o DS, que é
o território de outra lane (e provavelmente outro squad — `design-system`).
Registrado aqui como pendência, não como esquecimento: quem pegar o próximo
lote de a11y do DS tem a linha exata (`AppShell.tsx:111`) e o padrão já
identificado pela REV (§8, `README.md` do redesign).

---

## Gates (comando + saída real)

| Gate | Comando | Saída |
|---|---|---|
| Painel · type-check | `pnpm --config.verify-deps-before-run=false run type-check` (`tsc --noEmit`) | limpo, exit 0 (sem output) |
| Painel · lint | `pnpm --config.verify-deps-before-run=false run lint` (`eslint src --max-warnings 0`) | limpo, exit 0 (sem output) |
| Painel · suíte (lote) | `pnpm --config.verify-deps-before-run=false run test` | **2387 passed / 2387, 225 arquivos**, exit 0, 379,66s |
| `engajamento.test.ts` isolado | `pnpm --config.verify-deps-before-run=false exec vitest run src/routes/clubes/engajamento/_lib/__tests__/engajamento.test.ts` | **23 passed / 23** |
| `EngajamentoView.test.tsx` isolado | `pnpm --config.verify-deps-before-run=false exec vitest run src/routes/clubes/engajamento/__tests__/EngajamentoView.test.tsx` | **18 passed / 18** |
| `format.test.ts` isolado (novo) | `pnpm --config.verify-deps-before-run=false exec vitest run src/routes/clubes/_lib/__tests__/format.test.ts` | **4 passed / 4** |
| Zero hex/px fora de token no diff | `git diff -- apps/painel/src/routes/clubes/ \| grep '^+' \| grep -E '#[0-9a-fA-F]{3,8}\|rgba?\(\|[0-9]+px'` | **saída vazia** |

Os 3 arquivos de teste tocados (`engajamento.test.ts`, `EngajamentoView.test.tsx`,
`format.test.ts`, este último novo) rodaram tanto no lote quanto sozinhos,
sem flake e sem divergência entre os dois modos — a checagem de colisão que
a REV pediu.

---

## Diff — o que mudou, arquivo a arquivo

6 arquivos, todos em `apps/painel/src/routes/clubes/`, 183 inserções / 37
remoções:

- `_lib/format.ts` — `formatDecimal1` (nova função).
- `_lib/__tests__/format.test.ts` — novo arquivo, 4 testes de `formatDecimal1`.
- `engajamento/_lib/engajamento.ts` — `resumirPilares` (média ponderada, D-1),
  `ROTULO_SITUACAO.inativo` (D-2), `resumirComunidade` (guarda NaN, D-7).
- `engajamento/EngajamentoView.tsx` — rótulo + `aria-label` + `formatValue`
  do bloco de pilares (D-1); legenda de "Situação dos membros" (D-2); `Button`
  do DS no CTA do estado vazio (D-10).
- `engajamento/_lib/__tests__/engajamento.test.ts` — testes atualizados/novos
  para `resumirPilares` (ponderação + caso 2×500), `resumirSituacao` (rótulo
  novo), `resumirComunidade` (guarda NaN).
- `engajamento/__tests__/EngajamentoView.test.tsx` — fixtures atualizadas,
  testes novos para o rótulo/aria-label de D-1, o rótulo honesto de D-2 e o
  `Button` do DS de D-10.

Commit: `5826466d865de836997a6c057085a84fc92c3e93`, branch `main`,
`git commit --only` com pathspec explícito nos 6 arquivos — nenhum outro
arquivo do working tree (há dezenas de briefs/handoffs/logs não relacionados
no pool compartilhado `.nirvana/`) foi tocado.

---

## Para o maestro

- **D-1 e D-2 pagos**, com prova rastreada até a Function que grava o
  agregado, não só até o tipo TypeScript.
- **D-7 e D-10 pagos** como adições de 1 linha cada, dentro do orçamento que
  o brief deu.
- **D-9 recusado por invariante** — não é decisão de marca nem de produto, é
  o componente estar fora do território desta lane. Vai para quem tiver
  mandato sobre `packages/design-system`.
- **Pendência real, fora desta lane e fora de qualquer lane de painel:** o
  escritor de `membro.ultimaAtividadeEm`. Até existir, "Sem registro (30
  dias+)" é o teto de honestidade que a tela pode afirmar — e é isso que ela
  afirma agora.
- Sem navegador, sem deploy, conforme a regra da casa.
