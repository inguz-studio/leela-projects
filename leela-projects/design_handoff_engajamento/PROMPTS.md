# Prompts para o Claude Code

Cole um por conversa, na raiz do monorepo. **Duas conversas separadas** — os
critérios de revisão são diferentes e o diff de tokens polui o contexto da tela.

---

## Conversa 1 — design system

> Leia `design_handoff_engajamento/REFACTOR.md`, inclusive a seção "Qual tela é
> esta". O trabalho de 09/08 já está em `main` — este documento é só o delta.
>
> Implemente o **Grupo A e o Grupo B** (itens 1 a 6), na ordem indicada no fim do
> documento: o item 2 primeiro, porque o Grupo C depende dele.
>
> Território: `packages/design-system` somente. Não toque em `apps/painel`.
>
> Antes de editar `AppShell.tsx`, leia
> `.nirvana/handoffs/leela-incidente-tela-preta-20260810.md`.
>
> Rode os gates da seção "Gates" e me mostre a saída real de cada um. Respeite
> integralmente a seção "O que NÃO tocar" — em especial: nenhum valor
> pré-existente de brasa ou wine muda além do que os itens 2 e 4 pedem.

---

## Conversa 2 — painel, tela de Engajamento

> Leia `design_handoff_engajamento/REFACTOR.md`, começando pela seção "Qual tela
> é esta" — ela existe porque essa parte já foi lida errado uma vez.
>
> **A tela é `/clubes/engajamento`**, em
> `apps/painel/src/routes/clubes/engajamento/`. Ela já existe: isto é
> refatoração, não construção. Parta de `EngajamentoView.tsx` e
> `_lib/engajamento.ts` e altere só o que os itens pedem.
>
> **A Visão Geral (`apps/painel/src/routes/overview/`) não muda.** Se o seu plano
> incluir qualquer arquivo dela, o plano está errado.
>
> O Grupo A/B já foi feito na conversa anterior. Implemente o **Grupo C** (itens
> 7 a 13), na ordem do fim do documento.
>
> Referência visual: `design_handoff_engajamento/design/engajamento-referencia.dc.html`
> e https://leela-vis-o-geral-cd-cc500dffee.netlify.app — **os dois mostram
> "Visão Geral" no H1 por herança do shell; ignore o título e olhe os cards de
> análise abaixo dele.** Não copie HTML: é protótipo, não código de produção.
>
> Atenção ao item 7: se não houver fonte de dado para check-in de club, mantenha
> o empty-state honesto e me diga — não implemente gráfico com número inventado.
>
> Gates: `vitest run src/routes/clubes src/routes/overview src/shell` + type-check
> + lint + a prova de zero hex/px no diff.

---

## Se ele começar a recriar do zero

Interrompa e responda:

> Pare. A tela já existe em `apps/painel/src/routes/clubes/engajamento/`. Liste
> primeiro os arquivos que você vai editar e o que muda em cada um, sem escrever
> código. Só siga depois que eu aprovar a lista.
