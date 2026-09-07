# Handoff · lane DS-ALERTA-E-OVERLAY · 2026-08-28

**Tag de commit:** `[leela-alerta-overlay-20260828]`
**Itens:** V2708-21 (Alert sem listra lateral) e V2708-22 (Overlay/modal entra do centro)
**Status:** ENTREGUE — build OK · lint 0 · tsc 0 · gate-canon PASS · 2181 DS + 3067 painel testes verdes

---

## V2708-21 · Alert sem listra lateral

### O que mudou

**`packages/design-system/src/components/Alert/Alert.tsx`**

Removido `border` da string de classes base do `cva` e removido `border-[var(--feedback-*)]`
de todos os quatro tons (info, vitoria, alerta, vulcao). O componente agora usa apenas:
- fundo suave por tom: `bg-[var(--feedback-*-surface)]`
- texto + ícone com cor de severidade: `text-[var(--feedback-*-fg)]`

A identidade de severidade é comunicada pelo ícone padrão do tom (Info, CheckCircle2,
AlertTriangle, XCircle) + fundo suave. Sem borda lateral, sem listra — conforme determinado
pelo dono em V2708-21.

### Quantas telas herdam

O componente `Alert` é consumido pelo `@leela/design-system` barrel em:
- `apps/landing` (superfície pública via subpath `@leela/design-system/server`)
- `apps/painel` (~26 usos confirmados no barrel)

Toda tela que importa `Alert` do DS herdou a mudança automaticamente (zero toque em consumidores).

### Outros arquivos alterados

| Arquivo | O que mudou |
|---------|-------------|
| `Alert.docs.mdx` | Descrição atualizada: "ícone com cor de severidade, fundo suave — sem borda lateral (V2708-21)" |
| `LLM.txt` | "Tokens consumidos" remove `--feedback-*` (borda), adiciona DON'T explícito sobre border |
| `__tests__/Alert.test.tsx` | Asserção de `border-[var(--feedback-*)]` substituída por `.not.toContain` (border foi removida) |
| `utils/__tests__/overlayMotion.test.tsx` | Teste de motion do Dialog atualizado (ver V2708-22) |
| `showcase/src/sections/ComponentsPage.tsx` | Descrição do DemoCard Alert e Dialog atualizadas |
| `leela-specs/04-engenharia/governanca-design.md` | §11 adicionado (ver abaixo) |

### Varredura de borda-manual

`grep -r "border-l\|border-left" apps/` lista 20 arquivos no painel — todos são borda de
tabela (`border-l border-border-subtle`) ou layout estrutural (`border-l-[var(--...)]`),
nenhum simula alerta à mão. gate-canon PASS confirma zero reimplementação de aviso em bloco.

---

## V2708-22 · Overlay/modal entra do centro

### O que mudou

**`packages/design-system/src/components/Dialog/Dialog.tsx`**

1. Container: `flex items-end justify-center sm:items-center` → `flex items-center justify-center`
   (sempre centrado, todos os breakpoints)
2. Painel: `rounded-t-ds-lg sm:rounded-ds-lg` → `rounded-ds-lg`
   (raio completo em todos os breakpoints, sem "canto reto da folha inferior")
3. Animação: removido `slide-in-from-bottom` (mobile) + `sm:slide-in-from-bottom-0`;
   adicionado `zoom-in-95`/`zoom-out-95` sem prefixo `sm:` — válido em todos os breakpoints.

Resultado: fade + zoom curto a partir do centro em TODOS os breakpoints, paridade com o `Modal`.

**`Modal.tsx`** — sem alteração. O Modal já fazia `zoom-in-95` sem slide; foi a referência.

**`Drawer.tsx`** — intencionalmente sem alteração. O Drawer desliza da borda lateral por
design (slide-in-from-left/right) e esse idioma é correto para painel off-canvas.

### Como ficou o motion

```
Overlay:   fade-in-0  /  fade-out-0       (igual antes)
Painel:    fade-in-0 + zoom-in-95         (before: mobile era só slide sem zoom)
           fade-out-0 + zoom-out-95
```

Tudo gated por `motion-safe:` — `prefers-reduced-motion: reduce` zera ambas.

### Onde a doc mora

- `leela-specs/04-engenharia/governanca-design.md` **§11** — regra documentada com:
  - §11.1: Alert sem borda (V2708-21)
  - §11.2: Overlay/Modal entrada centralizada (V2708-22)
  - Cita a fala do dono na íntegra, data 28/08/2026

---

## Gate visual

Capturas em `.nirvana/gate-visual/alerta-overlay/`:

- `alert-depois.jpg` — Alert info e vitoria sem borda lateral (showcase Brasa)
- `modal-aberto-depois.jpg` — Modal centrado na tela após abertura (fade + zoom)
- `modal-entrada-centralizada.gif` — 3 frames: antes → modal aberto → depois de fechar

---

## Gates confirmados

| Gate | Resultado |
|------|-----------|
| `pnpm turbo run build` | PASS |
| `pnpm --filter @leela/design-system lint` (--max-warnings 0) | PASS (0 warnings) |
| `pnpm turbo run test --filter='!@leela/functions'` | PASS — 2181 DS + 3067 painel |
| `node scripts/gate-canon.mjs` | GATE LEELA-CANON: PASS |
| Preview porto 4617 --strictPort | Subiu, capturou, derrubado por PID 78919+89486 |

---

## Lição de processo

A catraca do test de motion (`overlayMotion.test.tsx:235`) assertia o antigo
`slide-in-from-bottom` — correto porque testava a INTENÇÃO de comportamento. Ao mudar o
comportamento por mandato do dono, o teste foi atualizado para assertar a nova intenção
(`zoom-in-95` sem slide), mantendo a razão da mudança no comentário do test.
