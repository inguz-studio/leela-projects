# Onda C3 — a operação do evento adota as peças da C0

**Trace** `leela-roadmap-componentes-20260810` · lane **CONTROLES-C3** · branch `controles-c3`
**Worktree** `C:\dev\leela-wt-controles-c3` (criado sobre `origin/main` @ `b9339a11`, a mesma
base que a CONTROLES-C2 deixou)
**Data** 2026-08-16 · sf-frontend-lead (software-forge)

Paga a **Onda C3** de `02-rodadas/2026-08-12-conformidade-controles/03-fila-em-ondas.md` — a
fatia de S006-T7 do épico `LEELA-E01-design-system` que cobre `§04.1` (operação do evento:
"vendo inscrições chegarem", "preparo a entrega de kits", "faço check-in no balcão"). **Nenhum
deploy.**

## As conversões, por família

| Família | Onde | Vira | Commit |
|---|---|---|---|
| barra de filtro à mão (3) | `InscritosView:353`, `CampanhasList:197`, `AfiliadosPage:207` | `FilterBar` | `fe258359`, `bc47f6ee`, `15ffc02c` |
| grupo de faceta à mão (2 de 3) | `CampanhasList:205` (canal), `AfiliadosPage:216` (tipo) | `FilterChips` | `bc47f6ee`, `15ffc02c` |
| contador de resultado (3) | `InscritosView:385`, `CampanhasList:215`, `AfiliadosPage:230` | `ResultCount` | `fe258359`, `bc47f6ee`, `15ffc02c` |
| par rótulo + checkbox (4) | `InscritosView:408`, `ItemKitModal:243`, `:288`, `KitEditor:462` | `CheckboxField` | `fe258359`, `2aef348f`, `7df9bb89` |
| grupo de campos à mão (1) | `ItemKitModal:230` | `FieldGroup` | `2aef348f` |
| `<Input type="date">` (1) | `plataforma/convites/ConvitesView.tsx:142` | `DateField` | `50741fcc` |

**17 ocorrências nomeadas na fila, 15 convertidas.** Duas ficam de fora, ambas registradas com
ADR e zero custo de clique — ver abaixo.

## As duas exceções

**ADR-018 — o typeahead de fluxo do balcão** (`AtendimentoPanel.tsx:265-291`, item "typeahead de
fluxo" da fila). C0 já tinha deixado a bifurcação escrita ("Combobox em modo fluxo (C0) ou
exceção com ADR") e deferido a decisão — o modo de fluxo não nasceu na C0. Esta onda decide: o
`Combobox` do DS é picker de popover, e a RN-205 (kit+presença fundidos num gesto, balcão sob
fila física) não paga o clique extra de abrir o popover antes de buscar. Mantido como está,
registrado em `leela-specs/03-canon/adr/ADR-018-typeahead-de-fluxo-balcao-excecao-combobox.md`,
com condição de reabertura (segundo consumidor do mesmo padrão, ou decisão de construir
`Combobox mode="flow"`). Continua contando em `barra-de-filtro-crua`, nomeado, não escondido.

**ADR-019 — achado de execução, não estava na fila.** `InscritosView.tsx:390` (faceta de
status, dor #1 "não sei quem pagou") tem exatamente 4 valores em `STATUS_INSCRITO`
(`confirmado`/`pendente`/`cancelado`/`estornado`) — o limiar exato em que `FilterChips` troca a
fileira de chips por um `Combobox` de popover (cânone §1, "4+ exclusiva = Combobox"). Convertida
sem ressalva, a rodada de testes acusou a mudança na hora (`getByText('Pendente · 1')` deixou de
existir — virou opção dentro de um Combobox fechado). Isso trocaria 1 clique direto por
abrir+escolher na interação mais usada da tela. O banner "Ver pendentes" (o caminho dominante da
dor #1) não passa pela faceta e não muda. Registrado em
`leela-specs/03-canon/adr/ADR-019-status-inscritos-excecao-limiar-filterchips.md`, com condição
de reabertura (a peça ganha um jeito de honrar limiar maior por pedido explícito da tela, ou
`STATUS_INSCRITO` cai para 3 valores por decisão de produto). Continua contando em
`faceta-crua`, nomeado.

**As duas exceções pesaram o critério de aceite comum na prática:** *"Onda que baixa o número de
divergências e sobe o número de passos não fecha"* venceu sobre *"toda instância convertida
importa a peça do cânone"* nos dois casos, porque as duas leis do dono valem juntas e a segunda é
a que ele disse importar "principalmente".

## A catraca, antes/depois

`pnpm gate:canon --atualizar` (commit `88192a44`):

| Contagem | Antes | Depois |
|---|---:|---:|
| `faceta-crua.painel` | 13 | **11** |
| `barra-de-filtro-crua.painel` | 12 | **9** |
| `contador-de-resultado-cru.painel` | 13 | **10** |
| `rotulo-de-checkbox-cru.painel` | 12 | **8** |
| `grupo-de-campos-cru.painel` | 11 | **10** |
| todas as outras 20 | — | inalteradas (baseline que C0/C1/C2 deixaram) |

`gate-canon` rodado 2× (antes e depois do `--atualizar`, e de novo depois do commit de boards):
`PASS` nas três vezes, com as cinco contagens descendo exatamente pelas conversões acima — nada
de surpresa: cada delta bate 1:1 com uma família convertida.

## Anti-carga

**3 passos hoje no balcão, 3 depois** (RN-205) — o balcão não foi tocado; ADR-018 preserva isso
por desenho. **Zero clique novo em qualquer das 15 conversões** — `FilterBar`/`FilterChips`/
`ResultCount`/`CheckboxField`/`FieldGroup`/`DateField` são adoção de peça pronta sobre a mesma
interação, não redesenho de fluxo. **ADR-019 existe justamente para não somar um clique** na
faceta de status de `InscritosView`.

## Gates, do zero

| Gate | Resultado |
|---|---|
| `pnpm install --frozen-lockfile` | limpo |
| rebuild `core → design-system → api-client` (`tsup`) | limpo, os três |
| `tsc --noEmit` (painel) | limpo |
| `tsc --noEmit` (landing) | limpo (não tocada nesta onda; conferida por precaução) |
| `eslint src --max-warnings 0` (painel, sweep completo) | limpo |
| `eslint packages/design-system/src apps/landing --max-warnings 0` | limpo |
| suíte direcionada das telas tocadas (11 arquivos) | **122 casos**, verdes — 2 assertions de `InscritosView.test.tsx` atualizadas para a honestidade de `ResultCount` ("Mostrando N de M **inscritos**", a peça sempre nomeia o substantivo) e para o wrapper `div` da `CheckboxField` (era `label` na montagem à mão) |
| `vitest run` — painel INTEIRO, em 4 fatias seriais (pós-rebuild) | `routes/eventos` 83·953 · `plataforma+components+lib+__tests__` 61·656 · `routes/clubes` 35·323 · `crm+parcerias+overview+conta+onboarding+_system+__tests__` 67·707 — **246 arquivos · 2639 casos**, verdes |
| `vitest run` — design-system INTEIRO | **90 arquivos · 2084 casos**, verdes |
| `vite build --config showcase/vite.config.ts` | compila |
| `vite build --mode leela-hub` (painel) | compila, 4039 módulos, sem erro |
| `pnpm gate:canon` (antes da conversão) | `PASS`, baseline batendo com o que a C0/C1/C2 deixaram |
| `pnpm gate:canon` (depois da conversão, antes do `--atualizar`) | `PASS`, cinco contagens descendo |
| `pnpm gate:canon --atualizar` | baseline regravado, `88192a44` |
| `pnpm gate:canon` (depois do commit de baseline) | `PASS`, zero delta |

## Gate visual (L-019)

**Do nível da peça, no showcase, nos dois temas — mesmo padrão que C0/C2 registraram e pela
mesma razão: telas autenticadas sem seed local não têm como abrir nesta sessão.** Subida do
`showcase` (`vite preview --config showcase/vite.config.ts`, porta local efêmera) e captura real
via Chrome da seção "Filtro e montagem de controle", que mostra as cinco peças (`FilterChips`,
`FilterBar`, `ResultCount`, `CheckboxField`, `FieldGroup`) vivas — nos temas **Brasa** (escuro,
default) e **Wine** (claro, `data-theme="wine"`). Screenshots anexados na resposta da lane.

Suporte adicional: os 2639 casos da suíte do painel renderizam as 5 telas convertidas de verdade
(RTL + jsdom, com o dist real) e afirmam texto, nome acessível e comportamento — não é prova de
navegador, mas é DOM renderizado com interação exercida, mesma honestidade que C2 já registrou.

## Boards

- `leela-specs/03-canon/epics/LEELA-E01-design-system.md` — S006-T7 estendida com a C3.
- `leela-specs/00-boards/BOARD-EPICOS.md` — linha do S006 estendida com a C3.
- `leela-specs/00-boards/V1-KANBAN.md` — S006-T7 recebe o progresso da C3; segue `🔄` (C4 a C6
  ainda faltam).

## Aterrissagem

| O que | Hash |
|---|---|
| `InscritosView.tsx` + teste | `fe258359` |
| `CampanhasList.tsx` | `bc47f6ee` |
| `AfiliadosPage.tsx` | `15ffc02c` |
| `ItemKitModal.tsx` | `2aef348f` |
| `KitEditor.tsx` | `7df9bb89` |
| `ConvitesView.tsx` | `50741fcc` |
| ADR-018 + ADR-019 + canon doc | `88c7638d` |
| baseline `gate-canon.baseline.json` | `88192a44` |
| boards + épico | `3eac7862` |
| handoff | `ede75813` |
| main re-puxada antes do merge | não houve avanço (`origin/main` seguiu em `b9339a11` do início ao fim da lane) |
| merge `--no-ff` na main | `8641d702` |
| push | confirmado — `b9339a11..8641d702 main -> main` |
| `gate-canon` na main já mergeada | `PASS`, zero delta |

Worktree removido ao final se a árvore ficar limpa.

## O que fica para as próximas ondas

- **C4 a C6 seguem livres.** As cinco peças da C0 e o padrão de uso ficam provados em 15
  conversões nesta onda — qualquer uma das próximas segue o mesmo molde (barra → `FilterBar`,
  faceta → `FilterChips` **conferindo o limiar de 4 antes de converter**, contador →
  `ResultCount`, par rótulo+checkbox → `CheckboxField`, grupo → `FieldGroup`).
- **Lição nova para C4-C6: checar `options.length` de toda faceta exclusiva antes de converter
  para `FilterChips`.** Se a lista real de valores (sem contar "Todos") for 4 ou mais, a peça
  vira `Combobox` por construção (cânone §1) — correto na maioria dos casos, mas errado quando a
  tela depende do clique direto para uma interação de alta frequência. ADR-019 é o modelo de
  registro quando isso acontecer de novo.
- **`Combobox mode="flow"`** segue como trabalho de DS não feito, com um único consumidor
  conhecido (`AtendimentoPanel.tsx`) — ADR-018 tem a condição de reabertura.
- **Prova renderizada nos dois temas (L-019), com navegador, das telas AO VIVO** (não só da
  peça no showcase): segue deferida ao primeiro deploy que tocar estas rotas, mesmo padrão que
  C0/C2 já registraram — não há seed de tenant/evento local nesta sessão.
