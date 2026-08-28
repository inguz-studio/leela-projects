---
tags: [leela, handoff, lane, terciario, navegacao, rodada-2026-08-28, e01, e04]
rodada: 2026-08-28
lane: TERCIARIO-FASE-2
branch: nav/terciario-fase2-20260828
atualizado: 2026-08-28
---

# Handoff — TERCIARIO-FASE-2 (rodada 2026-08-28)

Fase 2 do terciário: migração das 6 áreas candidatas da fase 1 (handoff de
27/08) para o `TerciarioNav`, na ordem do custo (mais baratas primeiro),
aplicando o critério rota × âncora da RN-574 emendada. Dono autorizou em 28/08
("pode tocar as regras terciárias").

---

## 1 · As 6 candidatas — veredito e modo

| Candidato | Custo estimado | Veredito | Modo | Razão |
|---|---|---|---|---|
| **GaleriaEstados** (`entrega/estados`) | ~30min | **PULADA** | — | QA route (RN-208); "nunca empilhados" proíbe modo âncora; rota exigiria reestruturação de URL → mais caro que 30min. Não é tela de produto. |
| **Kits do evento** (`KitsLayout.tsx`) | ~1h | **MIGROU** | **ROTA** | Gerenciamento + Distribuição são rotas com dado e endereço próprios — critério da RN-574 emendada. |
| **Financeiro do evento** (`FinanceiroLayout.tsx`) | ~1h | **MIGROU** | **ROTA** | Caixa + Reembolsos são rotas com dado e endereço próprios — mesma conta dos Kits. |
| **Ficha do tenant** (`TenantFichaLayout.tsx`, 7 abas) | ~2h | **PULADA** | — | Superfície de super-admin fora da fala do dono ("clubs e eventos"); 7 abas terciárias são fora do escopo declarado. |
| **Configurações da conta** (`/conta`) | ~2h | **MIGROU** | **ÂNCORA** | 6 seções são partes da mesma coisa (config do indivíduo) → âncora com scroll spy. Maior ganho: de zero navegação para TerciarioNav. |
| **7 usos do `Tabs` do DS** | — | **FORA DO ESCOPO** | — | Abas dentro de uma página, não navegação terciária — proibido pela RN-574. |

---

## 2 · Kits do evento — modo ROTA

**Arquivo:** `apps/painel/src/routes/eventos/kits/KitsLayout.tsx`

**Antes:** `AreaSubNav` (barra horizontal) + `<div class="flex flex-col">` wrapper.

**Depois:** `TerciarioLayout` (25/75) + `AreaTerciarioNav` (modo ROTA, SPA fiado).

As duas abas (Gerenciamento + Distribuição) são destinos de link com endereço
próprio — critério correto para modo ROTA. O comportamento de `estoque`
acender a aba de Distribuição foi preservado.

**Testes:** `KitsLayout.test.tsx` (7 casos) passou sem alteração — `<a>` e
`aria-current="page"` no `TerciarioNav` são contratos idênticos ao que o
`AreaSubNav` entregava. `navegacao-spa.test.tsx` (ancoras=2, atual='Gerenciamento')
também passou sem alteração.

---

## 3 · Financeiro do evento — modo ROTA

**Arquivo:** `apps/painel/src/routes/eventos/financeiro/FinanceiroLayout.tsx`

**Antes:** `AreaSubNav` (barra horizontal) + `<div class="flex flex-col">` wrapper.

**Depois:** `TerciarioLayout` (25/75) + `AreaTerciarioNav` (modo ROTA).

Caixa + Reembolsos e transferências são rotas com dado próprio. Sem redirects:
nenhuma URL mudou (o `FinanceiroLayout` era já a casca de `/financeiro/*`).

**Testes:** `navegacao-spa.test.tsx` (ancoras=2, atual='Caixa') passou sem
alteração. Testes de conteúdo (`FinanceiroView.test.tsx`, `ReembolsosView.test.tsx`)
não foram tocados — testam conteúdo, não o wrapper.

---

## 4 · Configurações da conta — modo ÂNCORA

**Arquivo:** `apps/painel/src/routes/conta/perfil/ContaPage.tsx`

**Antes:** `<div class="mx-auto max-w-2xl flex flex-col p-6">` — coluna única
sem qualquer navegação de seções.

**Depois:** `TerciarioLayout` (25/75) + `TerciarioNav` em modo âncora. O
`AreaTerciarioNav` não é usado (âncora não usa SPA navigation).

**6 seções:**
| ID | Label no nav | Rola para |
|---|---|---|
| `conta-perfil` | Perfil | `<form id="conta-perfil">` |
| `conta-foto-perfil` | Foto de perfil | `<section id="conta-foto-perfil">` |
| `conta-perfil-publico` | Perfil público | `<section id="conta-perfil-publico">` |
| `conta-dados-recebimento` | Dados de recebimento | `<section id="conta-dados-recebimento">` (condicional) |
| `conta-trocar-senha` | **Senha** | `<form id="conta-trocar-senha">` |
| `conta-sessao` | Sessão | `<section id="conta-sessao">` |

O label do item de senha é **"Senha"** (não "Trocar senha") para não colidir
com o texto do botão de submit do formulário — `getByRole('button', { name:
'Trocar senha' })` seria ambíguo com dois elementos.

**Scroll spy:** `IntersectionObserver` com `rootMargin: '-40% 0px -55% 0px'` —
mesma mecânica de `ConfiguracoesView` do clube. No-op em jsdom; `irPara(id)`
funciona por clique mesmo sem o observer.

**TerciarioLayout só no estado autenticado carregado.** Os estados de loading
(esqueleto) e não-autenticado (AuthAlert + botão de login) continuam sem o
layout terciário — não faz sentido oferecer navegação de seções sem conteúdo.

**Ajuste de import:** usa `@/components/nav/TerciarioNav` (mesmo padrão de
`ConfiguracoesView`) em vez do caminho relativo (`../../../`).

**Testes:** `ContaPage.test.tsx` (19 casos, todos passando). A colisão de nome
`"Trocar senha"` (item do nav vs botão do form) foi resolvida pelo rename do
label. Sem novos testes: o comportamento de âncora é identical ao de Clubs, que
já tem `ConfiguracoesView.test.tsx` cobrindo o padrão completo.

---

## 5 · GaleriaEstados — por que parou

A estimativa de ~30min era para a migração mecânica **se** fosse possível.
Mas o custo real inclui:

1. **RN-208 proíbe empilhamento.** O `GaleriaEstados` renderiza exatamente um
   estado por vez — modo âncora (seções empilhadas com scroll spy) viola isso.
2. **Modo rota exigiria reestruturar URLs.** Cada estado precisaria de rota
   própria, o que é uma reestruturação de 1-2h, não 30min.
3. **Não é tela de produto.** É rota de galeria de QA (`/entrega/estados`),
   não superfície que o dono vê ou pediu para padronizar.

**Veredito: pulado, não bloqueado.** Se alguém quiser migrar no futuro, o
modo correto é ROTA (cada estado = rota com `EstadoId` no path), com revisão
de RN-208 para confirmar se a URL-state é compatível.

---

## 6 · Ficha do tenant — por que parou

7 abas, superfície de super-admin. A fala do dono que criou o terciário falou
de "clubs e eventos" — a ficha do tenant está fora desse escopo. O handoff de
27/08 já documentou isso. Nada mudou que justifique incluir agora.

---

## 7 · Canon gate — antes e depois

| Catraca | Antes (baseline) | Depois | Δ |
|---|---|---|---|
| `botao-cru-estilizado.painel` | 4 | 3 | −1 (herdado da fase 1, atualizado aqui) |
| `grade-crua.painel` | 103 | 101 | −2 (herdado da fase 1, atualizado aqui) |
| `menu-secundario-cru` | 0 | 0 | 0 (neutro — AreaSubNav→TerciarioNav trocam canônico por canônico) |
| Demais | baseline | baseline | 0 |

O baseline foi atualizado com `--atualizar` neste commit (descidas da fase 1 que
não podiam ser atualizadas porque a gate da landing estava subindo — agora OK).

---

## 8 · Gates

| Gate | Resultado |
|---|---|
| `tsc --noEmit` | ✅ 0 erros |
| `eslint --max-warnings 0` (3 arquivos) | ✅ 0 warnings |
| `pnpm turbo run build` | ✅ OK |
| `pnpm --filter @leela/painel test` | ✅ **3070 verdes em 265 arquivos** |
| `node scripts/gate-canon.mjs` | ✅ PASS (baseline atualizado) |

### Portas

Preview em **4615** (`--strictPort`), derrubado por PID exato (78574, 48205)
e confirmado liberado.
⛔ **4601, 4602 e 8280 intocadas** — confirmadas de pé ao fim da lane.

---

## 9 · O que fica para outras lanes

1. **GaleriaEstados:** migrar para modo ROTA se alguém quiser — requer revisão
   de RN-208 e reestruturação de URLs.
2. **Ficha do tenant:** migrar se o escopo do terciário se expandir para
   super-admin.
3. **Gate visual com auth:** o probe script em
   `.nirvana/gate-visual/terciario-fase2/probe-terciario-fase2.mjs` está
   pronto. Requer execução com usuário autenticado no perfil do Playwright.
