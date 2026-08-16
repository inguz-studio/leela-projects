# Onda C6 — plataforma e administrativo adotam as peças da C0, e a fila de 12/08 fecha

**Trace** `leela-roadmap-componentes-20260810` · lane **CONTROLES-C6** · branch `controles-c6`
**Worktree** `C:\dev\leela-wt-controles-c6` (criado sobre `origin/main` @ `71f62bc2`, a mesma base
que a CONTROLES-C5 deixou)
**Data** 2026-08-16 · sf-frontend-lead (software-forge)

Paga a **Onda C6** de `02-rodadas/2026-08-12-conformidade-controles/03-fila-em-ondas.md` — a fatia
final de S006-T7 do épico `LEELA-E01-design-system`, cobrindo `§04.1` ("Processo repasse | Ver saldo
a liberar e disparar em lote | Admin"). **Última onda da fila de 12/08 — S006-T7 e S006 FECHAM
inteiras nesta lane.** Nenhum deploy.

## As conversões, por família

| Família | Onde | Vira | Commit |
|---|---|---|---|
| par rótulo + checkbox (4) | `TaxaGlobalRoute:182`, `TermsEditor:344`, `:358`, `CadastrarPage:239` | `CheckboxField` | `c3f6ef39` |
| grupo de campos à mão (4) | `TaxaGlobalRoute:154`, `TermsEditor:259`, `:299`, `PlanoFormModal:175` | `FieldGroup` | `c3f6ef39` |
| grupo de faceta à mão (1 de 2) | `ContasRoute:292` (Modo de visualização) | mantido `Chip` direto — **não é faceta**, ver ADR abaixo | `87efa35f` |
| grupo de faceta à mão (1 de 2) | `EventosGlobaisRoute:117` (status) | mantido `Chip` — **ADR-020**, 2º consumidor do limiar do ADR-019 | `87efa35f` |
| `ListaGlobal` passa a compor a `FilterBar` (7 usos) | `plataforma/_components/ListaGlobal.tsx` | `FilterBar` + `ResultCount` no slot `count` | `f5e0c5f2` |
| contador de resultado (3) | `RepassesFilaView:168`, `TenantsList:150`, `VendasTab:189` | `ResultCount` | `f5355f33` |
| **carona** — os dois facets que a C1 converteu de `<button>` para `Chip` ainda tinham o wrapper à mão | `RepassesFilaView.tsx:61` (Estado), `TenantsList.tsx:37` (Status) | `FilterChips` | `f5355f33` |
| **carona** — a peça de rótulo/valor que a C0 deixou para a C6 decidir | `ResponsavelCard.tsx`, `FichaDoClienteDrawer.tsx` (Campo local, 2 de 4 receitas) | `DefinitionItem`, nova peça no DS | `54226c1b` + `9bad6db0` |
| **carona** — as 3 receitas de cabeçalho de seção que a auditoria ADMINVISAO-ONDAS-235 nomeou | `RepassesDoTenant.tsx` (h2), `FichaDoClienteDrawer.tsx` (`Secao` local + header standalone "Histórico") | `SectionHeader` | `76e79428` |

**barra de filtro à mão (1) — `VendasTab:183` — achada OBSOLETA.** A tela foi redesenhada por uma
lane não relacionada (`leela-redesign-v2-20260810`, commit `8dc92412`, "aba vendas do tenant com a
economia lida do carimbo") entre a medição de 12/08 e esta onda. O `VendasTab.tsx` de hoje não tem
busca nem faceta nenhuma — só descrição, contador e tabela. Confirmado pela própria régua do gate: o
baseline pós-C5 já media `barra-de-filtro-crua.painel = 1` (só o typeahead do balcão, ADR-018), sem
`VendasTab` nele. Nada a converter; só o contador (item separado, acima) seguia cru.

## As duas peças de rótulo/valor não adotadas, e por quê

**`PlanoAplicadoCard.tsx` (`ListaDeDivergencias`) fica de fora do `DefinitionItem`, por decisão
medida.** É uma linha de COMPARAÇÃO horizontal ("plano X · vigente Y", `justify-between`, dentro de
um `<li>`), não um par rótulo/valor empilhado (`<dt>`/`<dd>`) como as outras duas receitas. Forçar a
mesma peça nas duas anatomias seria o defeito que o `FieldGroup` já nomeou para si mesmo. Registrado
no comentário do arquivo e na linha do cânone.

**`ContasRoute.tsx` ("Modo de visualização") não vira `FilterChips`.** É alternância exclusiva
SEMPRE-ATIVA entre duas telas inteiras (Fila × Diretório), nunca um estado vazio — e a `FilterChips`
sempre desenha um chip "Todos" que não tem para onde mapear aqui (`onChange([])` não corresponde a
nenhum `ModoDeContas`). Nem a régua mecânica da catraca conta esta ocorrência (o `aria-label` "Modo
de visualização" não começa com prefixo de filtro). Mesmo desenho que `EngajamentoView` já usa
(Onda C1) para o mesmo tipo de alternância — `Chip active` direto, cânone §1.

## ADR-020 — a segunda exceção do limiar da `FilterChips`

`EventosGlobaisRoute.tsx` tem a mesma faceta de status que o ADR-019 (`InscritosView`) já
registrara — quatro valores reais, o limiar exato em que a peça troca fileira por `Combobox` de
popover — mais um segundo motivo que o ADR-019 não tinha: `disabled={porTenant}` durante o recorte
por tenant, capacidade que `FilterChipsProps` não expõe. Registrado em
`leela-specs/03-canon/adr/ADR-020-status-eventos-globais-excecao-limiar-filterchips.md`, com a mesma
condição de reabertura do ADR-019 — **dois consumidores nomeados agora**, o sinal que a spec original
previu para justificar abrir essa lane de DS.

## `DefinitionItem` — a peça que a C0 deixou para decidir

A C0 (`leela-controles-c0-20260812.md`) tinha deixado escrito: "a decisão sobre a peça de
rótulo/valor das quatro receitas do administrativo... livres para a próxima lane." As quatro foram
lidas linha a linha nesta onda: `ResponsavelCard` e `FichaDoClienteDrawer` têm anatomia idêntica
(`<dt>`+`<dd>` em pé, ausência declarada em três formas — `null`/`undefined`/string vazia — caindo
num `emptyLabel`); `PlanoAplicadoCard` é anatomia diferente (ver acima). Nasceu `DefinitionItem`
(`54226c1b`), com story, docs, contrato LLM, 11 casos de teste e a linha do cânone no mesmo commit —
**sem sinônimo global**: "Campo" é nome de função local em outros 6 arquivos fora do escopo desta
onda (anatomia não auditada), e registrar como sinônimo abriria dívida não medida.

## A catraca, antes/depois

`pnpm gate:canon --atualizar` (commit `3c2b95a7`):

| Contagem | Antes | Depois |
|---|---:|---:|
| `faceta-crua.painel` | 4 | **2** |
| `contador-de-resultado-cru.painel` | 5 | **1** |
| `rotulo-de-checkbox-cru.painel` | 4 | **0** |
| `grupo-de-campos-cru.painel` | 7 | **3** |
| todas as outras 21 | — | inalteradas (baseline que C0-C5 deixaram) |

`gate-canon` rodado 3× (baseline no início da lane, depois das conversões antes do `--atualizar`,
depois do commit de baseline): `PASS` nas três, com os quatro deltas batendo 1:1 com as famílias
convertidas. `barra-de-filtro-crua.painel` e `filtro-fora-do-canone.total` ficam INALTERADOS de
propósito — o primeiro porque `VendasTab` estava obsoleto (nada a converter) e `EventosGlobaisRoute`
virou ADR, o segundo porque nenhuma conversão desta onda tocava `Select`/`role="combobox"`.

## Gates, do zero

| Gate | Resultado |
|---|---|
| `pnpm install --frozen-lockfile` | limpo |
| rebuild `core → design-system → api-client` (`tsup`) | limpo, os três |
| `tsc --noEmit` (painel, landing) | limpo |
| `eslint src --max-warnings 0` (painel, sweep completo) | limpo |
| `eslint src showcase/src --max-warnings 0` (design-system) | limpo |
| `eslint app lib --max-warnings 0` (landing) | limpo |
| suíte direcionada das telas tocadas (TaxaGlobalRoute sem teste próprio; TermsEditor, PlanoFormModal, CadastrarPage, ListaGlobal×7 consumidores, RepassesFilaView, TenantsList, VendasTabRoute, ResponsavelCard, FichaDoClienteDrawer, RepassesDoTenant, PlanoAplicadoCard) | **~250 casos**, verdes — 1 asserção atualizada (`TenantsList.test.tsx`, "0 de 1 tenant" no singular pelo TOTAL, mesma honestidade gramatical que a C3 já registrou) |
| `pnpm gate:canon` (baseline, antes de tocar código) | `PASS`, batendo com o que C0-C5 deixaram |
| `pnpm gate:canon` (depois das conversões, antes do `--atualizar`) | `PASS`, quatro contagens descendo |
| `pnpm gate:canon --atualizar` | baseline regravado, `3c2b95a7` |
| `pnpm gate:canon` (depois do commit de baseline) | `PASS`, zero delta |
| `vitest run` — painel INTEIRO, 5 fatias seriais pós-rebuild | `routes/eventos` 83·953 · `routes/clubes` 35·323 · `plataforma+components+lib+shell+__tests__` 70·786 · `crm+parcerias+overview+conta+onboarding+_system` 66·698 · `routes/__tests__` 2·116 — **256 arquivos · 2876 casos**, verdes, bate EXATO com a referência do brief |
| `vitest run` — design-system INTEIRO | **91 arquivos · 2095 casos**, verdes (+1 arquivo/+11 casos: `DefinitionItem`) |
| `vite build --config showcase/vite.config.ts` | compila, 3320 módulos |
| `vite build --mode leela-hub` (painel) | compila, 4039 módulos |

## Gate visual (L-019)

**Do nível da peça, no showcase, nos dois temas — mesmo padrão que C0/C2/C3/C4/C5 registraram e pela
mesma razão: as telas tocadas (`plataforma/**`) são autenticadas, sem seed de tenant local nesta
sessão.** Subida do `showcase` (`vite preview`, porta local efêmera 4671) e captura real via Chrome
das seções "Moldura" (`SectionHeader` + `DefinitionItem` novo, com ausência default e ausência com
causa nomeada) e "Filtro e montagem de controle" (as cinco peças da C0, reconfirmando que a onda não
quebrou nada), nos temas **Brasa** (escuro, default) e **Wine** (claro, `data-theme="wine"`) —
screenshots capturados e anexados na resposta da lane.

Suporte adicional: os 256 arquivos · 2876 casos do painel e os 91 · 2095 do design-system renderizam
as telas convertidas de verdade (RTL + jsdom, dist real pós-rebuild) — DOM renderizado com interação
exercida, não prova de navegador. Prova AO VIVO das telas de `plataforma/**` autenticadas segue
deferida ao primeiro deploy que tocar essas rotas.

## O balanço da campanha inteira

Por ser a última onda, o balanço completo — as oito contagens da catraca do início ao fim, os dois
itens de carona da C0, o que cada onda pagou e a resposta atualizada ao dono — está em
`02-rodadas/2026-08-12-conformidade-controles/04-balanco-final.md`. Resumo:

- **Cinco das oito contagens fecham em zero**: `controle-cru-fora-do-ds` (3→0), `filtro-fora-do-canone`
  (3→0), `rotulo-de-checkbox-cru` (17→0, painel+landing).
- **Três ficam com número, todas com dono nomeado**: `faceta-crua` (13→2, dois ADRs), `barra-de-filtro-crua`
  (12→1, um ADR), `padrao-reimplementado-fora-do-ds` (3→3, dívida de 11/08, não desta campanha).
- **Dois achados ficam SEM onda nomeada, pela primeira vez registrados com essa lacuna explícita**:
  `contador-de-resultado-cru` (1 resto, `ComunicacaoView.tsx:203`) e `grupo-de-campos-cru` (3 resto,
  `EventoForm.tsx` ×2 + `CampanhaEditor.tsx`), ambos fora do território de qualquer C-onda fechada.
- **A resposta ao dono**: zero desobediência ao controle (as sete violações fecharam na C1), e das
  cinquenta e nove recriações de montagem, a esmagadora maioria convertida pelas seis peças que
  nasceram para isso (cinco na C0, mais `DefinitionItem` decidida na C6) — o resto é exceção
  registrada ou achado com dono a definir, nunca esquecimento silencioso.

## Boards

- `leela-specs/03-canon/epics/LEELA-E01-design-system.md` — S006-T7 marcada ✅, com a C6 detalhada.
- `leela-specs/00-boards/BOARD-EPICOS.md` — S006 marcada ✅ FECHADA.
- `leela-specs/00-boards/V1-KANBAN.md` — S006-T7 e S006 marcadas `[x]`; o card-pai "[E01] Você
  perguntou se estamos recriando os controles" também fecha, com o balanço linkado.

## Aterrissagem

| O que | Hash |
|---|---|
| `TaxaGlobalRoute.tsx` + `TermsEditor.tsx` + `PlanoFormModal.tsx` + `CadastrarPage.tsx` | `c3f6ef39` |
| ADR-020 + comentários de exceção (`EventosGlobaisRoute.tsx`, `ContasRoute.tsx`) | `87efa35f` |
| `ListaGlobal.tsx` → `FilterBar`+`ResultCount` | `f5e0c5f2` |
| `RepassesFilaView.tsx` + `TenantsList.tsx` + `VendasTab.tsx` (+ teste `TenantsList.test.tsx`) | `f5355f33` |
| `DefinitionItem` (peça nova no DS) | `54226c1b` |
| `ResponsavelCard.tsx` + `FichaDoClienteDrawer.tsx` adotam `DefinitionItem` | `9bad6db0` |
| `RepassesDoTenant.tsx` + `FichaDoClienteDrawer.tsx` adotam `SectionHeader` (+ comentário `PlanoAplicadoCard.tsx`) | `76e79428` |
| showcase — seção `DefinitionItem` | `3fd1fc70` |
| baseline `gate-canon.baseline.json` | `3c2b95a7` |
| boards + épico | `32b3c981` |
| balanço final da campanha (`04-balanco-final.md`) | ver próximo passo |
| handoff (este arquivo) | ver próximo passo |
| main re-puxada antes do merge | ver próximo passo |
| merge `--no-ff` na main | ver próximo passo |
| push | ver próximo passo |

Worktree removido ao final se a árvore ficar limpa.

## O que fica para depois

- **`contador-de-resultado-cru.painel` (1 resto) e `grupo-de-campos-cru.painel` (3 resto)** — sem
  onda nomeada, candidatos de uma linha para quem tocar `eventos/comunicacao/**` e
  `eventos/novo/EventoForm.tsx` por outro motivo. Nomeados no balanço, seção 1.
- **`SearchInput.shortcutLabel = null` por default** — carona da C0, nunca paga em nenhuma onda.
  Candidato de uma linha, zero migração de consumidor (quem já desliga não muda).
- **`padrao-reimplementado-fora-do-ds.total = 3`** — dívida de 11/08 (`SecaoHead`, `EngajamentoView`
  `Painel`=`Card`, `DistribuicaoView` `Vazio`=`EmptyState`), não desta campanha.
- **ADR-018/019/020** — três exceções nomeadas, mesma condição de reabertura em espírito (peça ganha
  capacidade nova, ou segundo/terceiro consumidor decide diferente). Candidato de lane de DS, não de
  conversão de tela.
- **Prova renderizada nos dois temas (L-019), com navegador, das telas de `plataforma/**` AO VIVO** —
  segue deferida ao primeiro deploy que tocar essas rotas, mesmo padrão de todas as ondas anteriores.
- **A fila de 12/08 está FECHADA.** Não há Onda C7. Trabalho novo de conformidade de controles nasce
  como rodada própria, não como continuação desta.
