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

## T2 — remoção da dep — status: pendente (próximo)
## T3 — showcase do Dialog — status: pendente
