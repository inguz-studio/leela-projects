# Handoff — PAINEL-FASE-3 (2026-08-28)

Branch: `painel/fase3-20260828`
Tag de commit: `[leela-painel-fase3-20260828]`
Sessão: https://claude.ai/code/session_01SKXLyYE6EHcB6kXLrr5y3M

---

## V2708-23 — TerciarioNav na área de Inscritos

**Arquivo alterado:** `apps/painel/src/routes/eventos/inscritos/InscritosView.tsx`

Modo aplicado: **ÂNCORA** — as 4 seções (Geral · Pagamento · Comunicação · Histórico) carregam dados da mesma fonte (`InscritosPage`), critério RN-574 emendada: "parte de uma mesma coisa" → ÂNCORA.

- Removido: `<Tabs>` (DS) com 4 abas condicionais
- Adicionado: `<TerciarioLayout>` + `<TerciarioNav>` modo ÂNCORA
- IntersectionObserver com `rootMargin: '-40% 0px -55% 0px'` atualiza item ativo no scroll
- Todas as seções permanecem no DOM (não condicional); scroll suave com `scrollIntoView`
- Teste `InscritosView.test.tsx` atualizado: verifica `role=navigation` + `role=region`, não `role=tab`

### Varredura final — sub-navegação fora do padrão no ORGANIZADOR

| Área | Situação | Ação |
|------|----------|------|
| `AfiliacoesLayout` (Parcerias → Afiliações) | `AreaSubNav` horizontal — 2 rotas com dado próprio → ROTA | **Migrada** para `TerciarioLayout` + `AreaTerciarioNav` modo ROTA |
| `CrmSubNav` | Nível secundário de navegação (não terciário) | Não migrar — nível errado |
| `TenantFichaLayout` (super-admin) | Fora do escopo ORGANIZADOR — excluído na fase 2 | Permanecer; custo de migração ~2h se necessário |

Redirects: nenhum necessário — nenhuma URL mudou.

---

## V2708-24 — Bento grid 2×2 no credenciamento ao vivo

**Arquivo alterado:** `apps/painel/src/routes/eventos/entrega/PainelOperacional.tsx`

- Wrapper `flex-col` substituído por `<MetricGrid columns={2} gap="sm">` (componente DS)
- 4 cards (Retirada de kits · Alertas do balcão · Últimos atendimentos · Ações rápidas) em grade 2×2
- Em 390px o `MetricGrid` empilha 1 coluna (`grid-cols-1 xs:grid-cols-2` — classes vivem no DS, não no painel)
- `grade-crua.painel` permaneceu em 101 (baseline) — gate-canon PASS

---

## Resultados dos Gates

| Gate | Resultado |
|------|-----------|
| `pnpm --filter @leela/painel build` | ✓ built in 4.11s |
| `pnpm --filter @leela/painel lint` | ✓ 0 erros, 0 warnings |
| `npx tsc --noEmit` (painel) | ✓ 0 erros |
| `node scripts/gate-canon.mjs` | PASS — grade-crua.painel=101 |
| `pnpm --filter @leela/painel test --run` | ✓ 265 arquivos · 3067 testes |

---

## Gate Visual

Screenshots em `.nirvana/gate-visual/painel-fase3/`:

| Arquivo | Conteúdo |
|---------|----------|
| `inscritos-depois-1440.png` | InscritosView com TerciarioNav — desktop |
| `inscritos-depois-390.png` | InscritosView com TerciarioNav — mobile |
| `overview-bento-depois-1440.png` | PainelOperacional bento 2×2 — desktop |
| `overview-bento-depois-390.png` | PainelOperacional bento 2×2 — mobile |

Probe: `.nirvana/gate-visual/painel-fase3/probe-painel-fase3.mjs`
Build mode: `mock-emulador` · Porto: 4618 · Autologin: `?preview=castelo`
Clock: `LEELA_CLOCK=2026-03-15T12:00:00-03:00`

---

## Arquivos alterados

```
apps/painel/src/routes/eventos/entrega/PainelOperacional.tsx
apps/painel/src/routes/eventos/inscritos/InscritosView.tsx
apps/painel/src/routes/eventos/inscritos/__tests__/InscritosView.test.tsx
apps/painel/src/routes/parcerias/afiliacoes/AfiliacoesLayout.tsx
.nirvana/gate-visual/painel-fase3/ (novo)
```

## Não tocado (conforme restrições)

- `packages/design-system/` — lane DS-ALERTA-E-OVERLAY mexe lá
- `functions/`, `.github/workflows/`
- Board MIGRACAO
- Portas 4601/4602/8280
