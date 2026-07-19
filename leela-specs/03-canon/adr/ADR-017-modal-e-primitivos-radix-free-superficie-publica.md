---
tags: [leela, adr, arquitetura, design-system, landing, frontend, a11y, performance]
---

# ADR-017 · Modal e primitivos do DS para a superfície pública (landing Radix-free)

> Autor: sf-frontend-lead (Software Forge) · DNA Abramov/Harris · Trace: leela-build-2d6ee98d · lote MODAL-ADR · Data: 2026-07-18
> Formato herda ADR-stack.md: contexto → decisão → status → consequência.
> Origem: finding W2-F-06 (GATE-DS-W2) + story LEELA-S1706 (E17). Decisão técnica delegada pelo Vitor à forge ("desempenho em ambos os casos").

**Contexto.** A landing é Next 14 App Router com Server Components e SEO/peso
de bundle público como diretriz; o painel é SPA Vite client-side. O
`@leela/design-system` publica um barrel único que (a) avalia `createContext`
no topo (ThemeProvider/Toast) — ilegal no grafo de Server Component — e (b)
externaliza `@radix-ui/*` no dist. O `Modal` do DS é Radix Dialog: quando a
lane LPVK o importou na landing, `@radix-ui/react-dialog` não resolveu no
bundle público (MODULE_NOT_FOUND) → 500 na rota do evento. Desde então a
landing é **Radix-free deliberada** (o GATE-DS-W2 conta "0 imports Radix"
como check) e replica localmente o que precisa: `RegulamentoModal` (dialog
completo com a11y provada por 10/10 testes da lane SECFIX — focus trap, Esc,
retorno de foco), `marca.tsx`, `tipografia.tsx` e `ctaStyles.ts`. O gate
W2-F-06 classificou a duplicação como "justificada e bem-governada, zero
drift de valor", mas com fork-pressure crescente (W1 achou o mesmo padrão no
painel). Efeito colateral pior: até componentes ESTÁTICOS (Badge, CardEvento,
EmptyState na home e no perfil público) entram pelo boundary `'use client'`
de `_ds/ds.ts` e pagam hydration JS sem ter interatividade nenhuma.

**Critérios de decisão** (explícitos, nesta ordem): 1. peso do bundle público
da landing (diretriz SEO/perf do Vitor); 2. manutenção única vs duplicação;
3. risco de drift; 4. a11y PROVADA (os 10/10 testes SECFIX são comportamento
adquirido — não podem enfraquecer); 5. custo de migração com lanes em voo
(S8FIX no painel, COMF2/CKFIX no checkout).

**Decisão — variação fundamentada da S1706 ("S1706-parcial"): o DS passa a
servir a superfície pública por DUAS entradas Radix-free; a landing não ganha
dependência nova.**

1. **`@leela/design-system/server`** — subpath server-safe: exporta os
   primitivos estáticos `Badge`/`badgeVariants`, família `Card`, `CardEvento`,
   `DateBadge`, `EmptyState` e `buttonVariants` (extraído para
   `Button/variants.ts`, sem Radix Slot no grafo). Garantia do contrato:
   ZERO `@radix-ui`, ZERO `createContext`, ZERO hook em escopo de módulo —
   importável e renderizável em Server Component puro. A garantia é
   **executável**: teste de pureza no próprio DS caminha o grafo de imports
   da entry e falha se algo proibido entrar (anti-regressão do aceite (a)
   da S1706; substitui parcialmente o gate (c) até ele existir).
2. **`@leela/design-system/dialog`** — primitivo `Dialog` **Radix-free**
   (client): generalização do `RegulamentoModal` provado em produção —
   role/aria-modal/aria-labelledby, focus trap cíclico de Tab, Esc, clique
   no overlay, X, scroll lock, retorno de foco por ref. Comportamento passa a
   ser single-source no DS (coberto na suíte do DS); a skin default é a da
   superfície pública (bottom-sheet mobile → centrado sm+, 100% tokens), com
   hooks de className para reestilização futura (ex.: convergência do painel).
3. **Landing:** `RegulamentoModal` vira consumidor fino do `Dialog` (mantém
   gatilho, título, corpo e footer; DOM e classes visuais preservados — os
   10/10 testes SECFIX passam sem tocar em NENHUMA asserção). Home
   (`page.tsx`) e `PerfilView` importam os estáticos de `.../server` — Badge/
   CardEvento/EmptyState saem do grafo de cliente (menos JS público de
   verdade, não aspiracional).
4. **`marca.tsx`, `tipografia.tsx` e `ctaStyles.ts` PERMANECEM como
   composições de app sobre tokens.** Não são componentes do DS replicados —
   são escalas próprias da landing: o selo de modalidade é hero-scale
   (text-sm, pill, brand-tint) e o Badge do DS é 10px uppercase; o CTA é pill
   px-6/py-3 e o Button do DS dimensiona por `--btn-*`. Promover padrão de
   consumidor único ao DS viola a regra de promoção de padrão (Frost) e
   forçá-los nos átomos existentes MUDARIA o visual aprovado sem QA visual
   autorizado. O constraint que originou essas réplicas ("não dá para
   importar DS em RSC") morre com o subpath `server` — seção nova da landing
   consome o DS direto, a réplica para de crescer.

**Alternativas rejeitadas.**
- **Rota 2 — aceitar `@radix-ui/react-dialog` como dep da landing e usar o
  `Modal` do DS:** adiciona ~12-16KB gz de JS client na superfície pública
  (dialog + portal + react-remove-scroll + focus-guards) para UM modal que já
  existe Radix-free e provado — perde no critério nº 1 sem ganhar manutenção
  (o Modal Radix continua inteiro para o painel de qualquer forma); quebra o
  check "Radix na landing: 0" do gate; e re-provar os 10 testes sobre o
  autofocus/portal/ordem de focáveis do Radix sem enfraquecer asserção é o
  MAIOR custo de migração das três rotas.
- **S1706 integral nesta lane** (incluindo aceite (b) "remover réplicas de
  `marca.tsx`" e aceite (c) gate CI de conformidade SSR×showroom): o (b)
  forçaria selo/CTA nos átomos do DS com mudança visual sem aprovação; o (c)
  é infraestrutura de CI própria — viram pendências encadeadas, não bloqueiam
  o ganho estrutural de hoje.
- **Reescrever o `Modal` do painel Radix-free já (unificação total em um
  dialog):** tocaria o runtime de ~33 telas do painel com a lane S8FIX em
  voo. Follow-up registrado: convergir o Modal do painel para o `Dialog`
  pós-S8FIX permite remover `@radix-ui/react-dialog` do DS por completo —
  aí o ganho de bundle chega ao painel também ("desempenho em ambos").

**Status.** Aplicada neste lote (commits `[LEELA-MODALADR-*]`); aguarda
ratificação do Vitor. Reverter = voltar os imports da landing para
`_ds/ds.ts`/modal local; os subpaths são aditivos e não quebram consumidor
existente.

**Consequência.**
- (+) Comportamento de dialog (a parte PERIGOSA de duplicar: trap, foco,
  scroll lock) tem UMA implementação, testada na suíte do DS e consumida
  pela landing; a11y adquirida preservada com os mesmos 10/10 testes.
- (+) Bundle público: zero dependência nova; estáticos da home/perfil deixam
  de hidratar; contrato server-safe garantido por teste, não por disciplina.
- (+) Fork-pressure estancada na raiz: RSC agora tem porta oficial no DS.
- (−) O DS carrega DOIS dialogs (Modal Radix do painel + Dialog público) até
  a convergência pós-S8FIX — transitório documentado, com rota de saída que
  ainda remove uma dependência do painel.
- (−) Réplicas de valor de `marca/tipografia/ctaStyles` seguem existindo
  (governadas por lint de tokens + racional em header); a prova de
  conformidade visual landing×showroom (aceite (c) da S1706) segue pendente.

**Pendências encadeadas (registradas, fora deste lote):**
1. Convergência `Modal` (painel) → `Dialog` pós-S8FIX + remoção de
   `@radix-ui/react-dialog` do DS.
2. Gate (c) da S1706 — conformidade SSR da landing × specs do showroom em CI.
3. Showcase/storybook do `Dialog` (showroom é lane própria do DS).
4. Avaliar com o designer rebasear o CTA da landing em `buttonVariants`
   (hoje seria mudança visual; exige aprovação).
