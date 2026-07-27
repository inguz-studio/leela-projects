# Handoff · Lane NAV-FIX · trace leela-build-2d6ee98d

- **Worktree:** `C:\dev\LEELA-navfix` · **Branch:** `lane/navfix` · **Base:** `4217025`
- **Employee:** sf-frontend-lead (software-forge)
- **Escopo:** T1-T3 do `outputs/leela-build-2d6ee98d/PAINEL-NAV-DIAG-REPORT.md`. T4-T6 fora.
- **Estado:** as três tasks fechadas. Sem push, sem merge — o maestro integra.
- **Navegador:** nunca aberto. Preview `:5273`/`:8180` intocado (roda na árvore principal).

## Placar

| Task | Commit | O que entrou |
|---|---|---|
| T1 · DS encaminha o MouseEvent | `a2bfb90` | SubNav, Sidebar, Breadcrumb + 7 testes novos |
| T2 · Painel fia a navegação SPA | `7d95e1f` | `lib/navSpa.ts` + 7 superfícies + menu lateral + 26 testes novos |
| T3 · Gate anti-regressão | `682d44a` | `routes/__tests__/navegacao-spa.test.tsx`, 26 casos de tabela |

## Gates — resultado literal

### Design System (T1; re-rodado no fim da lane)

| Gate | Resultado |
|---|---|
| vitest | `Test Files 58 passed (58)` · `Tests 1055 passed (1055)` |
| baseline medido | `Tests 1048 passed (1048)` → **+7, zero vermelho** |
| `tsc --noEmit` | exit 0 |
| eslint `--max-warnings 0` | exit 0 |
| `SubNav.test.tsx:86-93` (href no DOM) | intocado, verde |

### Painel (T2 e T3)

| Gate | Resultado |
|---|---|
| baseline medido | `Test Files 2 failed \| 174 passed (176)` · `Tests 2 failed \| 1389 passed (1391)` |
| suíte após T3 | `Test Files 5 failed \| 173 passed (178)` · `Tests 8 failed \| 1439 passed (1447)` |
| **vermelhos novos** | **0** — ver decomposição abaixo |
| `tsc --noEmit` | exit 0 |
| eslint `--max-warnings 0` | exit 0 |
| gate novo do T3 isolado | `Tests 26 passed (26)` |

**Decomposição dos 8 vermelhos do lote:**

- **2 pré-existentes**, idênticos ao baseline, ambos `AssertionError`:
  - `shell/__tests__/sidebar.test.ts > /plataforma: nav própria com 6 itens…`
    (a nav de plataforma ganhou o item `taxa` e o teste não acompanhou);
  - `lib/query/__tests__/mutations.test.tsx > useSaveCommercialTerms…`.
  Deixados como estão de propósito: fora do escopo T1-T3 e servem de âncora
  para "0 vermelhos novos".
- **6 flakes de carga**, todos `Test timed out in 5000ms` (o 6º é o
  `Unable to find role="dialog"` que é consequência do timeout anterior).
  **Verdes ao re-rodar isolados**, como o brief prevê.

O que sela o diagnóstico de flake: **o conjunto que falhou mudou entre as duas
rodadas de lote**. No lote do T2 caíram `MarcasPage`, `ContaPage` e
`EventoForm` (36 testes, verdes isolados). No lote do T3 caíram `NovoClubePage`,
`CadastrarPage` e `ItemKitModal` (21 testes, verdes isolados). Regressão real
cai sempre no mesmo lugar; isto acompanha a pressão de máquina — `collect`
subiu de 1499 s (baseline) para 2602 s (T3) na mesma suíte. É o mesmo
root-cause já documentado no comentário do `EventoLayout.test.tsx`.

### Falsificação do gate do T3 (a prova de que ele morde)

Removida a fiação do `FinanceiroLayout` e rodado o gate:

```
FAIL  'sub-abas do Financeiro': TODA âncora cancela o default no clique simples
AssertionError: "Caixa" (/eventos/meia-floripa-2026/financeiro) tem href sem
onClick que faça preventDefault — o clique recarrega o documento inteiro
Tests  1 failed | 25 passed (26)
```

Restaurado em seguida (`git checkout --`), suíte de volta a 26/26.

## Cobertura do gate: 37 âncoras em 8 superfícies

| Superfície | Landmark | Âncoras |
|---|---|---|
| Abas do evento | `Seções do evento` | 10 |
| Breadcrumb do evento | `Breadcrumb` | 1 |
| Abas do clube | `Seções do clube` | 6 |
| Sub-abas de Kits | `Seções de kits` | 4 |
| Sub-abas do Financeiro | `Seções do financeiro` | 2 |
| Sub-abas de Configurações | `Seções de configurações` | 4 |
| Breadcrumb do editor de kit | `Breadcrumb` | 4 |
| Menu lateral do produtor | `Navegação principal` | 6 |

Mais 2 superfícies na tabela irmã (`CrmSubNav`, `EventosHubSubNav`): 0 âncoras,
navegam por `onClick` — registradas para o inventário não mentir.

## Decisões que valem carimbo do maestro

**1. A metade do consumidor do "conserto invertido da Sidebar" foi para o T2,
não para o T1.** O brief põe o conserto inteiro em T1. A metade do DS está lá (o
`Sidebar` já sabia montar `<a href>` com `onClick`; faltava o tipo encaminhar o
`MouseEvent`). Mas pôr `href` nos itens de `shell/sidebar.ts` sem o
`preventDefault` do `navSpa` faria o menu lateral passar a recarregar o
documento — o defeito desta lane, na superfície mais usada do painel, ainda que
por um commit só. Os dois lados aterrissaram juntos no T2.

**2. `EventoShell` e `ClubeShell` deixaram de ser "testáveis sem router".** Elas
usam `useNavigate` agora. Os 14 `render()` existentes ganharam `<MemoryRouter>`
em volta; **nenhuma asserção mudou** (confere pelo diff — só o invólucro).

**3. Zero mudança visual, com o raciocínio explícito** (sem abrir navegador): os
6 itens do menu passam de `<button>` para `<a>`. O `SidebarNavItem` já aplicava
a MESMA string de classes (`sharedProps.className`) nos dois ramos, e o painel
roda `@tailwind base` sem `preflight: false` — o preflight zera
`color`/`text-decoration` de `a`. Some-se que o `SubNav` já renderizava `<a>`
com o mesmo tratamento desde antes. Ainda assim, é o item nº 1 para o Vitor
conferir no preview.

## Ambiente (achado que atrapalha qualquer lane neste worktree)

`pnpm --dir <pkg> <script>` NÃO roda aqui. O `pnpm install --frozen-lockfile`
inicial **escreve uma linha inacabada** em `pnpm-workspace.yaml`:

```
allowBuilds:
  '@sentry/cli': set this to true or false
```

Daí em diante todo `pnpm run` dispara o deps-status-check → `pnpm install` →
sai 1 por `ERR_PNPM_IGNORED_BUILDS`. A árvore principal não tem essa linha.
Revertida aqui e mantida fora dos commits.

Gates rodados pelos binários locais, que executam exatamente o que os scripts do
`package.json` executam:

```
cd packages/design-system && ./node_modules/.bin/vitest run      # = pnpm test
cd packages/design-system && ./node_modules/.bin/tsup            # = pnpm build
cd packages/design-system && ./node_modules/.bin/tsc --noEmit    # = pnpm type-check
cd packages/design-system && ../../node_modules/.bin/eslint src --max-warnings 0
cd apps/painel            && ./node_modules/.bin/vitest run
```

Duas armadilhas de resolução, para quem pegar este worktree depois:

1. O painel resolve `@leela/design-system` pelo `exports` do pacote (→ `dist/`).
   **Toda mudança no DS exige `tsup` antes de rodar a suíte do painel.** O `tsc`
   do painel resolve por `paths` (→ `src/`) e não precisa do build.
2. `packages/core` e `packages/api-client` nascem **sem `dist`** num worktree
   novo. Sem buildar os três, 115 arquivos de teste do painel morrem em
   `Failed to resolve entry for package "@leela/api-client"` — não é regressão,
   é worktree não preparado.

## Para a review antagonista do T2

1. **`MemoryRouter` nos testes das duas cascas** — 14 blocos reescritos por
   script. Confirmar no diff que nenhuma asserção foi tocada, só o invólucro.
2. **`<button>` → `<a>` no menu lateral** — o argumento de "zero mudança visual"
   está acima e é dedutivo, não observado. Merece o olho do Vitor no preview.
   Vale também checar foco/`:focus-visible` e ordem de tabulação.
3. **`onClickSpa` desiste quando `event.defaultPrevented` já é `true`.** É
   deliberado (quem tratou primeiro decide), mas vale procurar algum ancestral
   nessas superfícies que chame `preventDefault` por outro motivo e passe a
   engolir a navegação em silêncio.
4. **Guarda `button !== 0`.** Em navegador real o `onClick` nem dispara no
   clique do meio (é `auxclick`), e o jsdom não sintetiza isso — a guarda é
   defensiva e está coberta só por tabela de dublê, não por clique real.
5. **`aria-current="page"` sobrevive** nas 7 superfícies (asserções existentes
   seguem verdes), mas é exatamente a classe de asserção que esse tipo de
   mudança regride em silêncio — vale reler.
6. **`KitEditor`: breadcrumb com dois itens apontando para o mesmo destino**
   ("Kits" e "Cadastro" → `/eventos/{slug}/kits`). Pré-existente, não tocado;
   agora os dois navegam por SPA para o mesmo lugar. Fica visível no gate.

## Pendências (nenhuma bloqueia a integração)

- **Ponta invertida que sobra (H7 do diagnóstico):** `CrmSubNav` e
  `EventosHubSubNav` navegam por `onClick` sem `href` — nunca recarregaram, mas
  não são links (sem ctrl+clique, sem clique do meio, sem copiar endereço).
  Fora da lista de territórios do T2. **Vira card.**
- **T4-T6** (gateway de cache dos 4 hooks crus, `SessionProvider` único,
  `RequirePapel` como layout route) seguem fora, como o brief manda.
- **2 vermelhos pré-existentes** do painel continuam vermelhos. Cada um vale um
  card de 10 minutos — o do `taxa` é só a tabela do teste desatualizada.
- **Flake de carga da suíte do painel** é dívida real e crescente: 6 timeouts
  por lote nas duas rodadas, conjunto diferente a cada vez. Enquanto isso, todo
  gate desta suíte exige re-rodada isolada para ser lido.

---

# Apêndice · Lane NAVFIX-REV (review antagonista) — 2026-07-26

Contexto fresco, worktree e branch os mesmos. Report completo em
`C:\dev\LEELA\outputs\leela-build-2d6ee98d\NAVFIX-REV-REPORT.md`.

**Veredito global: APROVADO-COM-FIXES.** O conserto está certo e nenhum defeito de
comportamento vivo foi encontrado. O que reprovou foi o **gate**, não o código.

## Por vetor

| # | Vetor | Veredito |
|---|---|---|
| 1 | `<button>` → `<a>`, "zero mudança visual" | APROVADO — dedução confirmada por medida; delta do Espaço, baixa |
| 2 | 14 `render()` com `MemoryRouter` | APROVADO — asserções byte-idênticas ao base |
| 3 | `onClickSpa` | APROVADO-COM-FIXES — early-return seguro; 1 defeito no helper |
| 4 | `aria-current="page"` | REPROVADO → CORRIGIDO — sem gate em 5 das 8 superfícies |
| 5 | Metade da Sidebar no T2 | APROVADO — a alternativa era defeito, não commit feio |
| 6 | Falsificação independente | APROVADO — 3 falsificações em superfícies não usadas pelo produtor |
| 7 | Regressão transversal | APROVADO — nada perdeu `href`; IA-MENU intocada |

## Achados corrigidos no branch

| Commit | Achado |
|---|---|
| `bf47c86` | A-4 · paridade `<a>`×`<button>` medida em DOM; Enter/Espaço travados por teste |
| `34e6206` | A-3 · `tabsComNavSpa`/`trilhaComNavSpa` descartavam em silêncio o `onClick` da superfície |
| `fbb1e97` | A-1 · gate ficava 26/26 VERDE com todas as abas MORTAS · A-2 · `aria-current` sem gate |
| `e64dad6` | A-5 · a junta do menu lateral (href + preventDefault) não era medida no mesmo elemento |

Achados sem ação: A-6 (`RootShell.test.tsx` usa `.closest('a,button')`, seletor pré-existente
que absorveu a troca de elemento) e A-7 (clique na aba ativa passa a empilhar histórico).

## Gates re-rodados (literal)

**Design System** — `Test Files 58 passed (58)` · `Tests 1060 passed (1060)`
(era 1055 no fim da lane; +5 meus) · `tsc` exit 0 · `eslint --max-warnings 0` exit 0.

**Painel** — `Test Files 2 failed | 176 passed (178)` · `Tests 2 failed | 1469 passed (1471)`.
**Vermelhos novos: 0.** Os 2 são os pré-existentes (`taxa` na nav de plataforma e
`useSaveCommercialTerms`), ambos com a asserção que cai byte-idêntica à do base e em arquivos
que a lane não tocou. `tsc` exit 0 · `eslint --max-warnings 0` exit 0.
Gate do T3 isolado: `Tests 47 passed (47)` (era 26).

**Flake de carga: não reproduziu.** Duas rodadas completas da suíte do painel voltaram com
exatamente 2 vermelhos e nenhum `Test timed out`. A dívida continua registrada; a conclusão de
"0 vermelhos novos" agora está lastreada em rodada limpa, não em decomposição de flake.

## Armadilhas do worktree — confirmadas e mantidas

`pnpm install` NÃO foi rodado. Gates pelos binários locais, exatamente como esta seção documenta.
`pnpm-workspace.yaml` conferido íntegro no início e no fim. `git status` limpo ao fechar.
Navegador nunca aberto; `:5273`/`:8180` intocados; sem push, sem merge.

## Pendências que a review acrescenta

- **Espaço no menu lateral** é decisão de produto para o Vitor: `<a>` se ativa com Enter, `<button>`
  com Enter e Espaço. Hoje há teste travando os dois ramos.
- **`KitEditor`: "Kits" e "Cadastro" para o mesmo destino** — pré-existente, agora visível no gate.
  Vale card de UX de trilha.
- **Última milha visual do menu** (cor, sublinhado, cursor, anel de foco renderizados) segue com o
  Vitor: é o que jsdom não computa. Todo o resto da paridade está provado em teste.
