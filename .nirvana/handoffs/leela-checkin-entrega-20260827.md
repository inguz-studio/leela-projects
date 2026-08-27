# Handoff — CHECKIN-ENTREGA — 2026-08-27

Lane: `checkin/entrega-20260827`
Tag: `[leela-checkin-entrega-20260827]`

---

## V2708-13 · Voltar nas 3 etapas do check-in

**Status: IMPLEMENTADO**

Adicionada navegação reversa ao `AtendimentoPanel` com estado preservado:

- `overrideChipStep: boolean` — estado local que força o Stepper a exibir o passo de chip mesmo após ele estar concluído.
- **"← Cancelar atendimento"** (Button ghost sm) — sempre visível quando há atleta selecionado; chama `reset()` e volta para a busca sem perder o pool em memória.
- **"← Alterar chip"** (Button ghost sm) — visível no passo de check-in final quando `usaChip && chipVinculado(atual) && !overrideChipStep`; ativa o override e volta ao passo de chip preservando `chipInput`.
- **"← Manter chip atual"** (Button ghost sm) — visível no passo de chip quando `overrideChipStep = true`; restaura `chipInput` ao chip original e cancela o override.
- **Stepper `current`** usa `effectiveCurrent`: quando `overrideChipStep`, aponta para o índice do chip em vez do passo linear.
- O `chipInput` é PRESERVADO durante todo o fluxo — o operador pode corrigir sem redigitar.

**Arquivos alterados:**
- `apps/painel/src/routes/eventos/entrega/AtendimentoPanel.tsx`

---

## V2708-14 · Tamanho dos itens por participante na entrega

**Status: IMPLEMENTADO**

O `ChecklistKit` agora renderiza em dois cenários:

1. **Catálogo disponível** (`itens.length > 0`): comportamento original.
2. **Catálogo indisponível** (`itens.length === 0`, mas `tamanhos` não vazio): fallback com `<Badge>` por tamanho via `rotuloSufixo()` — operador vê o tamanho certo mesmo sem papel de `isTenantMember`.

O tamanho também aparece no `CardConferencia` (CRED-BUSCA 17/08). O V2708-14 garante que aparece TAMBÉM no contexto operacional de entrega.

**Arquivos alterados:**
- `apps/painel/src/routes/eventos/entrega/AtendimentoPanel.tsx`
- `apps/painel/src/routes/eventos/entrega/__tests__/AtendimentoPanel.test.tsx`

---

## V2708-15 · Régua entrega→estoque — Veredito

**A régua EXISTE e é TRANSACIONAL. O abate por SKU NÃO existe como agregado servidor.**

### O que existe (com arquivo:linha)

1. **Entrega per-inscrito — transacional e idempotente**
   - `functions/src/eventos/registrarEntrega.ts:77-133`
   - Firestore transaction seta `checkinEm` + `kitEntregueEm` atomicamente (RN-205).
   - `sem_kit` seta apenas `checkinEm` (nenhum carimbo de kit).
   - Idempotente: se `checkinEm` já existe, retorna `{ ok, jaRegistrado: true }` sem alterar timestamps.
   - Guards: só `confirmado` atende; `usaChip=true` exige `chipNumero` antes do fechamento (RN-206/207).

2. **Derivação client-side por SKU**
   - `apps/painel/src/routes/eventos/_lib/gradeTamanhos.ts` — função `entregasPorSku(inscritos)`
   - Deriva `{ entregues, pendentes }` por sufixo de SKU a partir do pool de inscritos.
   - Pura, sem efeito colateral.

3. **Agregado servidor — `agregarEstoque.ts`**
   - `functions/src/eventos/agregarEstoque.ts` — onWrite trigger
   - Agrega `qtdVendida` (inscritos confirmados com o SKU) e `estoqueFisico` (declarado pelo organizador).
   - **NÃO agrega `qtdEntregue`** — o abate por SKU no servidor NÃO existe.

### O que falta (decisão de domínio — sf-backend-lead/dono)

O campo `qtdEntregue` por SKU não existe como agregado servidor. O `agregarEstoque.ts` poderia ser extendido para computar esse campo ouvindo mudanças em `kitEntregueEm`. Isso tornaria o saldo visível para todos os operadores em tempo real.

**Proposta:** `agregarEstoque` passa a ouvir também `inscritos/{id}` onde `kitEntregueEm` muda e incrementa `qtdEntregue` por SKU. Decisão: sf-backend-lead/dono — envolve escrita em `itensKit` (coleção global) e custo de leitura em eventos com 1.000+ inscritos.

### Exposição atual na UI (V2708-17)

O `PainelOperacional` migrado para a Visão geral exibe o total de kits entregues e ritmo de atendimentos (via `resumoBalcaoDetalhado`). A UI não inventa regras — mostra apenas o que o servidor garante.

---

## V2708-17 · Panorama migrado para a Visão geral

**Status: IMPLEMENTADO**

### O que migrou

Os 4 cards do `PainelOperacional` (Retirada de kits · Alertas do balcão · Últimos atendimentos · Ações rápidas) foram movidos para a Visão geral do evento.

**Estratégia:** reaproveitamento do componente `PainelOperacional` existente sem modificação — importado na `OverviewPage` e passado como `credenciamentoSlot` para `OverviewDashboard`.

### Como a Visão geral carrega os dados

- `useTodosInscritos(evento.id)` — TanStack Query, não-realtime (cache key `queryKeys.inscritos.todos(eventoId)`).
- Cache **compartilhado** com o balcão: quando o operador tem o balcão aberto em outra aba, o listener onSnapshot do balcão escreve no mesmo cache key — a Visão geral se atualiza sem segundo listener.
- **LCP preservado**: o `credenciamentoSlot` só renderiza quando `todosInscritos != null`; os blocos acima do fold (CountdownHero, KPIs) renderizam imediatamente.

### Últimos atendimentos — ordenação correta

Na Visão geral, `ultimosAtendidos` é derivado sorting `checkinEm` desc (mais recente primeiro), passado para `PainelOperacional.ultimosAtendidos` — não cai no fallback linear do array.

### O que saiu do balcão

`BalcaoView` simplificado: removido o grid 60/40, removido `PainelOperacional`, removido estado `ultimos`. O balcão fica focado exclusivamente na operação de atendimento.

**Arquivos alterados:**
- `apps/painel/src/routes/eventos/entrega/BalcaoView.tsx`
- `apps/painel/src/routes/eventos/evento/overview/OverviewPage.tsx`
- `apps/painel/src/routes/eventos/evento/overview/OverviewDashboard.tsx`

---

## Gates

| Gate | Resultado |
|------|-----------|
| `pnpm --filter @leela/painel lint` | 0 erros, 0 avisos |
| `pnpm --filter @leela/painel exec tsc --noEmit` | 0 erros nos arquivos alterados |
| `pnpm --filter @leela/painel build` | OK |
| `pnpm --filter @leela/painel test` | 261/261 arquivos, 3030/3030 testes |
| Preview 4614 | Servido; PID 7060 encerrado por kill exato |

**Nota tsc global:** 2 erros pré-existentes em `onboarding/__tests__/` (módulo `@leela/design-system/tailwind-preset`) — presentes antes desta rodada.

---

## Gate Visual

Build com `--mode mock-emulador` (VITE_PREVIEW_AUTOLOGIN=true, Auth emulator :9298, Firestore :8280).
Autologin: `marina@demo-leela.dev` via `?preview=castelo`.
Preview servido em :4614 — dados reais do emulador.

Screenshots em `.nirvana/gate-visual/checkin-entrega/`:

| Arquivo | Viewport | Conteúdo |
|---------|----------|----------|
| `entrar-1440.jpg` | 1440px | app no porto 4614 (build sem emulador — tela de entrada) |
| `entrar-390.jpg` | 390px | idem, responsivo |
| `credenciamento-1440.jpg` | 1440px | Marina Almeida · 3 etapas (✓✓✓) · "← Cancelar atendimento" visível (V2708-13) |
| `credenciamento-390.jpg` | 390px | Ana Almeida · etapa 2 · "← Cancelar atendimento" visível · tamanho M (V2708-13) |
| `entrega-tamanho-1440.jpg` | 1440px | João Almeida · kit PRATA · "Camiseta técnica Be Hero • P" no checklist (V2708-14) |
| `entrega-tamanho-390.jpg` | 390px | João Almeida · tamanho P no card do inscrito (V2708-14) |
| `overview-1440.jpg` | 1440px | Visão geral · CountdownHero + KPIs (V2708-17) |
| `overview-credenciamento-ao-vivo-1440.jpg` | 1440px | Visão geral · seção "Credenciamento ao vivo" completa: Retirada de kits, Alertas, Últimos atendimentos, Ações rápidas (V2708-17) |
| `overview-390.jpg` | 390px | Visão geral · CountdownHero + KPIs mobile (V2708-17) |
| `overview-credenciamento-390.jpg` | 390px | Visão geral · "Credenciamento ao vivo" mobile com Retirada de kits (V2708-17) |

### Limitação declarada — V2708-14 fallback de tamanhos

O fallback de `<Badge>` por tamanho (para `itens.length === 0 && tamanhos não vazio`) não é acionável com os dados do seed atual: os kits `kit_prata` e `kit_basico` têm itens configurados no seed (`Camiseta técnica Be Hero`, `Gel de carboidrato 30g`, etc.), portanto `itens.length > 0` sempre. O cenário que ativa o fallback (kit cadastrado sem itens, mas atleta com tamanho escolhido) é um edge-case de dados inconsistentes em produção. A cobertura do fallback está garantida por unit test (`AtendimentoPanel.test.tsx` — `getAllByText('Feminina M').length > 0`). A screenshot `entrega-tamanho-1440.jpg` mostra o tamanho visível na entrega pela via normal (sufixo no item da camiseta).
