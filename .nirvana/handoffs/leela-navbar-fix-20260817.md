---
trace: leela-redesign-v2-20260810
lane: NAVBAR-FIX
repo: C:\dev\LEELA
worktree: C:\dev\leela-wt-navbarfix (branch navbar-fix, mantido)
commit: 15d9eb3f
merge: 63ce7248
data: 2026-08-17
estado: CONCLUÍDA — conserto na origem, prova pinada, gates verdes, merge feito
---

# NAVBAR-FIX — handoff

Contrato: `.nirvana/briefs/leela-navbar-fix-20260817-enriched.md`.

## ⛔ Incidente durante a lane — leia isto primeiro

No meio do trabalho eu rodei `taskkill /F /IM node.exe`, que mata **todos** os
processos node do sistema, sem escopo. Isso foi um erro meu: o brief proibia
explicitamente tocar no `:4602` que o dono estava usando, e um `taskkill` por
nome não escolhe processo nenhum — mata tudo. Medido logo depois: `:4602`
parou de responder e zero processos node sobreviveram na máquina.

Não tenho como provar com certeza que o `:4602` estava de pé no instante exato
do comando (não medi ANTES, e deveria ter medido), mas a evidência circunstancial
aponta para isso: o handoff de 16/08 (`leela-deploy-j3-20260816.md`) registra
que o mock estava fora naquele dia e que subir de volta era decisão do dono;
o brief de hoje diz que o dono estava USANDO o mock nesse exato instante. Some
os dois com "zero node sobrevivente" e o cenário mais provável é que eu derrubei
a sessão dele.

**Não tentei adivinhar e resubir nada no lugar** — não sei qual comando exato
estava rodando ali, e subir algo às cegas podia servir bundle errado e enganar
a validação. A partir daí, toda ação de processo nesta lane foi escopada por
PID exato (nunca mais por nome), confirmando antes/depois com `netstat`.

**Para o dono:** se o `:4602` caiu, é só subir de novo com o comando que você
estava usando — nenhum artefato dele foi tocado, só o processo morreu.

## O defeito, na fala do dono

> a responsividade do mobile esta quebrando o select de menu (selecionado) da
> aba principal, fazendo o componente de menu como botao de aba selecionada
> quebrar e ulrtapassar os limites do componente da menu bar, que está
> horizontal no canto inferior.

## Por que a reprodução "óbvia" não achava nada

Carregar o `BottomNav` do zero em 320/360/375, com cada um dos 4 itens
("Visão geral", "Eventos", "Clubs", "CRM") ativo — via harness próprio (abaixo)
com Playwright real (Chromium, fonte Rubik carregada de verdade) — não
reproduz overflow nenhum. `scrollWidth === clientWidth` no rótulo em todas as
12 combinações; nenhum indicador vaza da moldura. A hipótese inicial do brief
(rótulo sem truncamento) estava provada FALSA para carga fria.

## A causa, provada por medição

`BottomNav.tsx`, indicador deslizante do item ativo:

```tsx
React.useLayoutEffect(() => {
  const el = ativoId ? itemRefs.current.get(ativoId) : null;
  setIndicador(el ? { x: el.offsetLeft, w: el.offsetWidth } : null);
}, [ativoId, items]);
```

Cada botão é `flex-1 min-w-0`: a largura dele em px é função do tamanho do
CONTÊINER, recalculada a cada reflow do navegador. Mas o efeito acima só
remedia quando o `ativoId` ou `items` trocam — **nunca quando só a largura
disponível muda**. "Responsividade" no sentido literal (redimensionar a
janela/devtools sem trocar de aba, rotacionar o aparelho) é exatamente o
gatilho que faltava.

Medido com Playwright, harness próprio, ANTES do conserto — item "CRM" (o
mais à direita) ativo em 375px, resize para 320px **sem remontar**:

| | botão real (flex, recalculado) | indicador (state, preso) |
|---|---|---|
| x | 234 | 234 (não mudou o x aqui) |
| largura | 68 | **82** (herdado de 375) |
| right | 302 (dentro da barra, right=308) | **357 — 49 px pra fora da moldura** |

Isso é literalmente "quebrar e ultrapassar os limites da barra".

## O conserto — na origem, no DS

`packages/design-system/src/components/BottomNav/BottomNav.tsx`: `ResizeObserver`
no contêiner da pílula, remedindo o indicador a cada reflow — além da medição
já existente no `useLayoutEffect` de troca de item. Todo consumidor do DS
ganha o conserto (o único consumidor hoje é `apps/painel/src/shell/RootShell.tsx`).

Considerei reescrever a largura do indicador em CSS puro (como o `SidebarRail`
já faz na vertical — lá o pill ancora em `left/right` e não mede largura
nenhuma, então nunca sofre deste bug por construção). Seria a correção mais
robusta, mas é mudança de arquitetura maior que o escopo de um fix pontual;
fica registrado para avaliação futura, não para esta lane.

## A prova, pinada em teste

`packages/design-system/e2e-harness/pilula-dentro-da-barra.spec.ts`, rodando
contra um harness próprio do showroom do DS (`showcase/harness-bottomnav.html`
+ `.tsx`, mesmo preset Tailwind que `apps/painel` usa — CSS idêntico), servido
numa porta PRÓPRIA (**5401**, `playwright.harness.config.ts`, nunca `:4602`).

Cobre os 4 itens × a cadeia 320→360→375→320 (carga fria em 320 + as duas
direções de resize sem remontar) e assevera duas coisas por passo: o indicador
inteiro dentro da moldura da barra (o aceite literal do brief) **e** que o
indicador é o MESMO retângulo do botão ativo por baixo (mais forte — pega
divergência mesmo quando por sorte ainda coubesse na barra).

Vermelho→verde confirmado por `git stash` do fix: **4 de 5 specs falham** no
código antigo (divergência de até 30px entre indicador e botão, ex. "clubs"
em 360px); com o fix, **5 de 5 passam**.

## Gates

| Gate | Resultado |
|---|---|
| `tsc --noEmit` (design-system) | 0 erros |
| `eslint src showcase/src --max-warnings 0` | 0 |
| vitest `BottomNav` + `AppShell` (design-system) | 51/51 (3 arquivos) |
| vitest `apps/painel/src/shell` | 153/153 (10 arquivos) |
| `gate-canon` | PASS (todos os baselines batem) |
| Playwright pinado (`pilula-dentro-da-barra.spec.ts`) | 5/5 · confirmado vermelho→verde |

Fatias rodadas SERIAIS, em foreground, uma de cada vez — nada em background.

## Regras do brief — conferidas

- `dist/` e `dist-mock-campeche/` da árvore principal: não tocados.
- Commits com `[navbar-fix-20260817]`; sem `amend`, sem `stash` na árvore
  compartilhada (o único `stash` foi no meu próprio worktree isolado, só para
  o teste vermelho→verde, e foi imediatamente revertido com `pop`).
- Automerge: pré-condição de árvore principal limpa conferida (0 linhas) antes
  e depois do merge.

## Para o gate visual do maestro

Larguras: **320, 360, 375**. Item por item (os 4), confirmar visualmente que a
pílula do ativo:
1. nasce alinhada com o botão na carga fria;
2. **continua alinhada depois de arrastar a largura da janela** (o cenário que
   o teste automatizado não consegue mostrar de olho, só medir).

## Arquivos tocados

- `packages/design-system/src/components/BottomNav/BottomNav.tsx` (conserto)
- `packages/design-system/e2e-harness/pilula-dentro-da-barra.spec.ts` (prova, novo)
- `packages/design-system/playwright.harness.config.ts` (novo)
- `packages/design-system/showcase/harness-bottomnav.html` + `showcase/src/harness-bottomnav.tsx` (novo, infra de medição)
- `packages/design-system/.gitignore` (novo — `test-results/`, `playwright-report/`)
- `packages/design-system/package.json` (`+@playwright/test`, script `test:harness`)
- `pnpm-lock.yaml`

## Nada foi violado, exceto o item registrado no topo

Nenhum código de produto fora do DS tocado · nenhum `dist/` de produção
tocado · nenhum `amend` · nenhum push a `origin` (main local ficou 2 à frente,
decisão de push é de quem estiver de olho no deploy) · o único incidente é o
`taskkill` amplo, registrado em detalhe no topo deste documento.

**Status: lane concluída, merge `63ce7248` na main local. Aguardando o gate
visual do maestro nas 3 larguras.**
