# Prompts para o Claude Code

Cole um por conversa, na raiz do monorepo.

## Conversa 1 — design system

> Leia `design_handoff_engajamento/REFACTOR.md`. O trabalho de 09/08 já está em
> `main` — este documento é só o delta. Implemente o **Grupo A e o Grupo B**
> (itens 1 a 6), na ordem indicada no fim do documento: o item 2 primeiro, porque
> o resto depende dele. Território: `packages/design-system` somente.
>
> Antes de tocar em `AppShell.tsx`, leia
> `.nirvana/handoffs/leela-incidente-tela-preta-20260810.md`.
>
> Rode os gates da seção "Gates" e me mostre a saída real de cada um. Respeite
> integralmente a seção "O que NÃO tocar" — em especial: nenhum valor
> pré-existente de brasa ou wine muda além dos itens 2 e 4.

## Conversa 2 — painel

> Leia `design_handoff_engajamento/REFACTOR.md`. O Grupo A/B já foi feito.
> Implemente o **Grupo C** (itens 7 a 13) em
> `apps/painel/src/routes/clubes/engajamento/`, na ordem do fim do documento.
> A tela existe — isto é refatoração, não construção: parta de
> `EngajamentoView.tsx` e `_lib/engajamento.ts`.
>
> Referência visual: https://leela-vis-o-geral-cd-cc500dffee.netlify.app
> Abra e interaja para conferir espaçamento, estados e movimento. Não copie HTML.
>
> Atenção ao item 7: se não houver fonte de dado para check-in de club, mantenha
> o empty-state honesto e me diga — não implemente gráfico com número inventado.
>
> Gates: `vitest run src/routes/clubes src/routes/overview src/shell` + type-check
> + lint + a prova de zero hex/px no diff.
