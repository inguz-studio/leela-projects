# Checkpoint — MODAL-CONVERGE (leela-build-2d6ee98d)

Lote MODAL-CONVERGE-ret · employee sf-frontend-engineer (software-forge) · Opus.
Convergência do Modal do painel (Radix) → comportamento Radix-free do ADR-017,
liberando a remoção do `@radix-ui/react-dialog` do DS. Retomada (a lane anterior
morreu por cota antes de qualquer commit).

Origem: ADR-017 pendências (1) convergência do Modal + (3) showcase do Dialog.
Não tocar `apps/landing/**` nem `functions/**` (lane CHECKOUT-FORM-ret com WIP lá).

## Rota escolhida (T1) e porquê

**Rota A — Modal mantém a API pública; o motor Radix vira o comportamento
compartilhado do DS (`useDialogBehavior`).** Não é migração de consumidores.

Por quê (menor churn nos apps):
- 26 telas do painel importam `Modal`/`ConfirmModal` de `@leela/design-system`.
  Rota B (migrar consumidores) = 26 arquivos de churn, sobre um working tree com
  lane CHECKOUT-FORM-ret ativa. Rota A = **0 arquivos de app tocados**.
- Um wrapper LITERAL `<Modal> = <Dialog>` fino é INCOMPATÍVEL com as asserções
  congeladas do Modal: o `role=dialog` do Modal carrega width/bg-card/motion; o
  overlay tem `data-testid="modal-overlay"` + fade; o X tem os aliases shadcn
  (`ring-ring`/`ring-offset-background`); já o `Dialog` público põe `role=dialog`
  no container externo e não tem nada disso. Afrouxar essas asserções é vetado
  pelo gate. Então reuso o COMPORTAMENTO do Dialog (a parte perigosa: focus
  trap, Esc, scroll-lock, retorno de foco) via hook compartilhado e mantenho o
  DOM/skin exato do Modal. Single-source real: comportamento único, skins
  distintas (bottom-sheet público × centrado do painel).
- `ConfirmModal` intacto (compõe `<Modal>`; API preservada byte a byte).

Reuso vs criado:
- CRIADO: `useDialogBehavior.ts` (hook), extraído VERBATIM do efeito do `Dialog`.
- REAPROVEITADO: o `Dialog` público passou a consumir o mesmo hook (efeito
  inline removido, comportamento idêntico). Modal e Drawer consomem o hook.
- Modal/Drawer: DOM/skin/tokens/motion 100% preservados do original Radix;
  só o motor (Radix → hook + createPortal p/ document.body, paridade com o
  Radix Portal) mudou.

## T1 — status: FEITO e verde

Arquivos:
- `packages/design-system/src/components/Dialog/useDialogBehavior.ts` (novo)
- `packages/design-system/src/components/Dialog/Dialog.tsx` (usa o hook)
- `packages/design-system/src/components/Modal/Modal.tsx` (Radix-free)
- `packages/design-system/src/components/Drawer/Drawer.tsx` (Radix-free)

Gates:
- Suíte DS: **1046/1046** (baseline mantido, sem encolher).
- Suíte painel: **1185/1185** (Modal API preservada; 1 timeout de 5s foi flake de
  carga — passa determinístico isolado; re-run limpo confirmou 1185).
- tsc DS: 0 · tsc painel: 0 · eslint DS: 0.
- Modal/ConfirmModal/Drawer/Dialog: todos os testes existentes passam SEM tocar
  em asserção.

Commit: [LEELA-MODALCONV-T1]

## T2 — remoção da dep — status: FEITO

Contexto que refina o alvo: os ÚNICOS importadores de `@radix-ui/react-dialog`
no DS eram `Modal` e `Drawer` (a landing já é Radix-free). Com T1, ambos saíram.
Removida a declaração DIRETA de `@radix-ui/react-dialog` do
`packages/design-system/package.json`; `pnpm install` atualizou o lockfile.

Prova (grep dist + lockfile):
- **dist/bundle:** ZERO `require('@radix-ui/react-dialog')` / `import ... from
  '@radix-ui/react-dialog'` nos bundles de runtime (`dist/index.{js,mjs}`,
  `dist/dialog.{js,mjs}`). Era exatamente esse `require` que quebrava o bundle
  público da landing (500 da lane LPVK) — some. Os únicos resquícios de
  "react-dialog" no dist são PROSA de JSDoc (provenance) embutida em `.map` e
  `.d.ts`, não código.
- **lockfile:** o bloco importer `packages/design-system:` NÃO declara mais
  `@radix-ui/react-dialog`. Ele permanece no lockfile APENAS como dep TRANSITIVA
  de `cmdk` (Command/Combobox usam) e de `vaul` — fora do grafo do dist público
  do DS e fora do caminho da landing. Remoção total do pacote não é possível sem
  trocar cmdk/vaul (fora do escopo do lote e sem ganho para o bundle público).

Reuso vs criado: nenhum arquivo novo; só remoção de 1 linha de dep + lockfile.

Gates: DS 1046/1046 · tsc DS 0 (cmdk resolve react-dialog transitivamente, intacto).

Commit: [LEELA-MODALCONV-T2]

## T3 — showcase do Dialog — status: FEITO

Adicionado o DemoCard "Dialog" na seção Overlays do showroom
(`showcase/src/sections/ComponentsPage.tsx`), no padrão das demais seções: um
gatilho (Button com ref) abre o `Dialog` público com titleIcon (Flame),
description, footer e `returnFocusRef` (foco volta ao gatilho). Brasa+Wine: o
`ShowroomBar` troca o tema ao vivo (todo o showroom, incl. o novo card, renderiza
nos dois temas) — mesmo mecanismo das outras seções §8.

De quebra (correção de prosa que T1 tornou obsoleta): as descrições do Modal e do
Drawer diziam "Radix"; agora dizem "Radix-free"; a descrição da seção Overlays
explica o comportamento único via useDialogBehavior.

Reuso vs criado: reaproveitados os primitivos do showroom (`Section`, `DemoCard`,
`dsIcon`, `Button`) e o padrão de demo interativa; nada novo criado.

Gates: `showcase:build` exit 0 (o card novo type-check limpo; avisos "use client"
do bundle são pré-existentes do cmdk/popover/tooltip, alheios ao react-dialog).

Commit: [LEELA-MODALCONV-T3]

## Follow-ups (fora do escopo dos gates deste lote)
- Prosa "Radix" ainda em `Modal.docs.mdx`/`Drawer.docs.mdx`/`*.stories.tsx`/
  `LLM.txt` (storybook/docs, não são gate) — atualizar quando tocar o storybook.
- `@radix-ui/react-dialog` segue no lockfile como TRANSITIVA de cmdk/vaul;
  remoção total exigiria trocar essas libs (fora do escopo, sem ganho ao bundle
  público, que não usa cmdk).
