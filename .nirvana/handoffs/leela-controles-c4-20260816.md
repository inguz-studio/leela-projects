# Onda C4 — a comunidade adota as peças da C0

**Trace** `leela-roadmap-componentes-20260810` · lane **CONTROLES-C4** · branch `controles-c4`
**Worktree** `C:\dev\leela-wt-controles-c4` (criado sobre `origin/main` @ `123c527c`, a mesma
base que a CONTROLES-C3 deixou)
**Data** 2026-08-16 · sf-frontend-lead (software-forge)

Paga a **Onda C4** de `02-rodadas/2026-08-12-conformidade-controles/03-fila-em-ondas.md` — a
fatia de S006-T7 do épico `LEELA-E01-design-system` que cobre `§04.4` ("comunidade com rosto e
nome", pertencimento a comunidade local). **Nenhum deploy.**

## As conversões, por família

| Família | Onde | Vira | Commit |
|---|---|---|---|
| barra de filtro à mão (4) | `ComunicadosList:176`, `DesafiosList:219`, `MembrosList:128`, `HubClubes:176` | `FilterBar` | `e7e6f1d6`, `e4bcc72f`, `79f95e1d`, `885500e3` |
| grupo de faceta à mão (7) | `ComunicadosList:185/195/202` (status/canal/origem), `DesafiosList:228/238` (status/modelo), `MembrosList:138/148` (status/papel) | `FilterChips` | `e7e6f1d6`, `e4bcc72f`, `79f95e1d` |
| contador de resultado (3) | `ComunicadosList:213`, `DesafiosList:249`, `MembrosList:159` | `ResultCount` | `e7e6f1d6`, `e4bcc72f`, `79f95e1d` |
| par rótulo + checkbox (4) | `ConfiguracoesView:339/379`, `DesafioEditor:194`, `NovoClubePage:209` | `CheckboxField` | `24fcaee6`, `d312ec85`, `f742bd5f` |
| grupo de campos à mão (3) | `DesafioEditor:305`, `PerfilPublicoEditor:261/278` | `FieldGroup` | `d312ec85`, `c03e6f88` |
| conversão dos 3 `Select` de filtro | — | já paga na C1 | — |

**21 ocorrências nomeadas na fila, 21 convertidas — zero exceção nesta onda.** Todas as facetas
exclusivas tinham 2 ou 3 valores reais (abaixo do limiar de 4 da `FilterChips`), então nenhuma
virou `Combobox`/`FilterMenu` por construção e nenhuma pediu ADR (lição herdada da C3: conferir
`options.length` antes de converter).

## Carona de copy, nomeada na fila (`leela-uxw-fix.md`)

Jargão interno vazando pro usuário final: "(RN-141)" e "(RN-144)" saíram de quatro frases
visíveis, nas quatro localizações que a fila nomeou por arquivo:linha.

| Arquivo | Era | Vira | Commit |
|---|---|---|---|
| `ConfiguracoesView.tsx` (aprovação manual) | "Exigir aprovação manual de novos membros (RN-141)" | sem o código | `24fcaee6` |
| `ConfiguracoesView.tsx` (deletar clube) | "...serão removidos (RN-144)." | sem o código | `24fcaee6` |
| `DeletarClubeModal.tsx` | "...apagados definitivamente (RN-144)." | sem o código | `5a8a0997` |
| `NovoClubePage.tsx` | "Exigir aprovação manual de novos membros (RN-141)" | sem o código | `f742bd5f` |

`DeletarClubeModal.test.tsx` tinha asserção direta em `/RN-144/`; trocada para
`/apagados definitivamente/` no mesmo commit. Comentários de código com "RN-" ficam (são para
quem lê a fonte, não para quem usa a tela).

**Fora do escopo desta onda, e por quê:** a fila também citava "`be-hero.com.br` hardcoded em
seis lugares desta superfície" sem nomear arquivo:linha. Uma varredura achou hits em
`apps/painel/src` que vão muito além de `routes/clubes` (eventos, conta, testes) e a maioria são
fixtures de teste ou o helper canônico `lib/linkPublico.ts` que é o lugar CERTO para o domínio
viver — não dívida. Sem enumeração precisa, decidi não adivinhar o escopo (mesmo critério que a
C2 usou para o próprio item de higiene: só o nomeado com precisão entra na onda). Fica registrado
para quem quiser varrer com o tempo dedicado a isso.

## A catraca, antes/depois

`pnpm gate:canon --atualizar` (commit `353b2b5a`):

| Contagem | Antes | Depois |
|---:|---:|---:|
| `faceta-crua.painel` | 11 | **4** |
| `barra-de-filtro-crua.painel` | 9 | **5** |
| `contador-de-resultado-cru.painel` | 10 | **7** |
| `rotulo-de-checkbox-cru.painel` | 8 | **4** |
| `grupo-de-campos-cru.painel` | 10 | **7** |
| todas as outras 20 | — | inalteradas (baseline que C0/C1/C2/C3 deixaram) |

`gate-canon` rodado 2× (antes e depois do `--atualizar`): `PASS` nas duas vezes, com os cinco
deltas batendo 1:1 com as famílias convertidas (7 `FilterChips`, 4 `FilterBar`, 3 `ResultCount`,
4 `CheckboxField`, 3 `FieldGroup`).

## Anti-carga

**0 passos hoje, 0 depois — procedência pura**, como a fila previu para esta onda. Nenhuma das 9
conversões muda fluxo, clique ou passo; todas trocam montagem à mão pela peça equivalente sobre a
mesma interação. Único comportamento novo: facetas exclusivas que não tinham chip "Todos"
(`origem` em `ComunicadosList`) ganharam um, por desenho da `FilterChips` (decisão da C0, não
desta onda) — destrava sem adicionar passo.

## Diretiva registrada: nome acessível do checkbox de ação (`DesafioEditor`)

O checkbox de seleção de ação no catálogo tinha `aria-label="Selecionar {nome}"` NO checkbox E um
`<label>` visível envolvendo tudo (nome + pontos/unidade) — dois donos do nome acessível, o
anti-padrão que a `CheckboxField` existe para fechar. Convertido para `label={a.nome}` +
`description={pontos/unidade}` (a descrição some do nome acessível, entra por
`aria-describedby`). Nome acessível mudou de "Selecionar Correr" para "Correr" — teste
atualizado (`DesafioEditor.test.tsx`).

## Gates, do zero

| Gate | Resultado |
|---|---|
| `pnpm install --frozen-lockfile` | limpo |
| rebuild `core → design-system → api-client` (`tsup`) | limpo, os três |
| `tsc --noEmit` (painel) | limpo |
| `eslint src --max-warnings 0` (painel, sweep completo) | limpo |
| `eslint src showcase/src --max-warnings 0` (design-system) | limpo |
| suíte direcionada das telas tocadas (`clubes` + `conta/perfil-publico`, 39 arquivos) | **362 casos**, verdes |
| `vitest run` — painel INTEIRO, em fatias seriais (pós-rebuild) | ver tabela abaixo |
| `vitest run` — design-system INTEIRO | **90 arquivos · 2084 casos**, verdes (inalterado — nenhum arquivo do DS tocado) |
| `vite build --config showcase/vite.config.ts` | compila |
| `vite build --mode leela-hub` (painel) | compila, 4039 módulos, sem erro |
| `pnpm gate:canon` (antes da conversão) | `PASS`, baseline batendo com o que C0/C1/C2/C3 deixaram |
| `pnpm gate:canon` (depois da conversão, antes do `--atualizar`) | `PASS`, cinco contagens descendo |
| `pnpm gate:canon --atualizar` | baseline regravado, `353b2b5a` |
| `pnpm gate:canon` (depois do commit de baseline) | `PASS`, zero delta |

### A suíte do painel, fatia por fatia — e o veredito do WATCH herdado

Rodada **completa**, pós-rebuild dos três pacotes, em 5 fatias seriais (a 5ª porque duas pastas
de teste — `src/routes/__tests__/` e `src/__tests__/` — são diretórios DIFERENTES e a primeira
rodada as confundiu, achando 255 em vez de 256; corrigido antes de fechar o número abaixo).

| Fatia | Arquivos · casos |
|---|---|
| `routes/eventos` | 83 · 953 |
| `routes/clubes` | 35 · 323 |
| `routes/plataforma` + `components` + `lib` + `shell` + `src/__tests__` | 70 · 786 |
| `routes/crm` + `parcerias` + `overview` + `conta` + `onboarding` + `_system` | 66 · 698 (707 brutos − 9 de `marca-executavel.test.ts`, contado 2× por repetir `src/__tests__` nesta fatia) |
| `routes/__tests__` (fronteira-auth + navegacao-spa) | 2 · 116 |
| **total, arquivos únicos** | **256 · 2876** |

**Veredito do WATCH:** a contagem bate **exatamente** com o número que a lane SUBNAV reportou
(256 arquivos · 2876 casos) e diverge do que a C3 mediu (246 arquivos · 2639 casos) 16 dias… não,
no mesmo dia, mas ANTES de duas lanes vizinhas mergearem depois da C3 (`kits-build-20260813` já
estava dentro, mas `subnav-unifica-20260813` e outras entraram na main entre o fechamento da C3 e
o início desta lane — confirmado por `git fetch` no início: a base desta lane já é
`123c527c`, o HEAD que a C3 deixou, então o crescimento de 246→256 arquivos e 2639→2876 casos é
das telas que a C3 não tocou, chegadas por outras lanes na mesma janela). Contagem de arquivos
verificada por `find . -name "*.test.ts" -o -name "*.test.tsx" | wc -l` em `apps/painel/src` =
**256**, batendo com a soma das 5 fatias.

## Gate visual (L-019)

**Do nível da peça, no showcase, nos dois temas — mesmo padrão que C0/C2/C3 registraram e pela
mesma razão: as sete telas tocadas nesta onda (`clubes/**` + `conta/perfil-publico`) são todas
autenticadas, sem seed de tenant/clube local nesta sessão.** Subida do `showcase`
(`vite preview --config showcase/vite.config.ts`, porta local efêmera 4317) e captura real via
Chrome da seção "Filtro e montagem de controle", mostrando as cinco peças (`FilterChips`,
`FilterBar`, `ResultCount`, `CheckboxField`, `FieldGroup`) vivas — nos temas **Brasa** (escuro,
default) e **Wine** (claro, `data-theme="wine"`). Nenhuma peça nova nasceu nesta onda (só
consumo), então a prova de peça já é a mesma que a C0 registrou; a captura desta lane reconfirma
que segue de pé.

Suporte adicional: os 256 arquivos · 2876 casos da suíte do painel renderizam as 7 telas
convertidas de verdade (RTL + jsdom, com o dist real pós-rebuild) e afirmam texto, nome acessível
e comportamento das facetas/contadores/checkboxes — DOM renderizado com interação exercida, não
prova de navegador. Prova AO VIVO das telas de clube autenticadas segue deferida ao primeiro
deploy que tocar essas rotas.

## Boards

- `leela-specs/03-canon/epics/LEELA-E01-design-system.md` — S006-T7 estendida com a C4.
- `leela-specs/00-boards/BOARD-EPICOS.md` — linha do S006 estendida com a C4.
- `leela-specs/00-boards/V1-KANBAN.md` — S006-T7 recebe o progresso da C4; segue `🔄` (C5 e C6
  ainda faltam).

## Aterrissagem

| O que | Hash |
|---|---|
| `ComunicadosList.tsx` | `e7e6f1d6` |
| `DesafiosList.tsx` | `e4bcc72f` |
| `MembrosList.tsx` | `79f95e1d` |
| `HubClubes.tsx` | `885500e3` |
| `ConfiguracoesView.tsx` | `24fcaee6` |
| `DeletarClubeModal.tsx` + teste | `5a8a0997` |
| `DesafioEditor.tsx` + teste | `d312ec85` |
| `NovoClubePage.tsx` | `f742bd5f` |
| `PerfilPublicoEditor.tsx` | `c03e6f88` |
| baseline `gate-canon.baseline.json` | `353b2b5a` |
| boards + épico | `4b7161dd` |
| main re-puxada antes do merge | não houve avanço (`origin/main` seguiu em `123c527c` do início ao fim da lane) |
| merge `--no-ff` na main | ver próximo passo |
| push | ver próximo passo |

Worktree removido ao final se a árvore ficar limpa.

## O que fica para as próximas ondas

- **C5 e C6 seguem livres.** As cinco peças da C0 seguem provadas em mais 21 conversões nesta
  onda (36 no total entre C2-C4) — o molde é o mesmo: barra → `FilterBar`, faceta →
  `FilterChips` conferindo o limiar de 4 antes de converter, contador → `ResultCount`, par
  rótulo+checkbox → `CheckboxField`, grupo → `FieldGroup`.
- **C5** (parcerias e CRM) tem o órfão `ClientesPage.tsx:118` (`Select` de ordenação) esperando
  decisão — não é desta lane, já nomeado no gate desde a C0.
- **Prova renderizada nos dois temas (L-019), com navegador, das telas AO VIVO** (não só da peça
  no showcase): segue deferida ao primeiro deploy que tocar `clubes/**` e
  `conta/perfil-publico/**` — mesmo padrão que C0/C2/C3 já registraram.
- **`be-hero.com.br` hardcoded** — item de higiene citado na fila sem arquivo:linha; não varrido
  nesta onda (ver seção "Carona de copy" acima). Quem tocar essas telas por outro motivo pode
  propagar o conserto.
