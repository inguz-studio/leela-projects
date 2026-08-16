# Onda C2 — o caminho do dinheiro adota CheckboxField

**Trace** `leela-roadmap-componentes-20260810` · lane **CONTROLES-C2** · branch `controles-c2`
**Worktree** `C:\dev\leela-wt-controles-c2` (criado sobre `origin/main` @ `0a9d4304`)
**Data** 2026-08-16 · sf-frontend-lead (software-forge)

Paga a **Onda C2** de `02-rodadas/2026-08-12-conformidade-controles/03-fila-em-ondas.md` — a fatia
de S006-T7 do épico `LEELA-E01-design-system` que cobre `§04.1` (checkout e conta). **Nenhum
deploy.**

## As 5 conversões

| # | Arquivo:linha | Era | Virou | Commit |
|---|---|---|---|---|
| 1 | `AceitesCompra.tsx:138` (termos da compra) | `<label items-start>` + `Checkbox aria-label` | `CheckboxField` | `ee111f3e` |
| 2 | `AceitesCompra.tsx:160` (termo de saúde) | idem | `CheckboxField` | `ee111f3e` |
| 3 | `AceitesCompra.tsx:190` (termo de saúde custom, condicional) | idem | `CheckboxField` | `ee111f3e` |
| 4 | `StepDados.tsx:398` ("Eu também vou participar") | `<label items-center font-size-base>` + `Checkbox aria-label` | `CheckboxField` | `fd21878e` |
| 5 | `PortasDaConta.tsx:422` (termo do profissional) | `<div>` + `Checkbox` + `<label htmlFor>` irmão | `CheckboxField` | `6276c001` |

Em cada uma o `aria-label` do `Checkbox` saiu — o rótulo agora é visível por dentro da
`CheckboxField`, e os dois brigavam pelo nome acessível (DON'T do `LLM.txt` da peça). Import trocado
de `Checkbox` para `CheckboxField` no boundary `app/_ds/ds.ts` (ADR-017), como o C0 já tinha
provado no `server-safety.test.ts` antes desta onda abrir.

**Carona de higiene** (item nomeado no fim de `03-fila-em-ondas.md`): `SeletorForma.tsx:9-10` trazia
"Verbatim do Vitor" num comentário — termo banido pelo dono em 09/08. Virou "Citação do Vitor, na
íntegra" — `69b73772`. Achado no caminho e **fora de escopo desta onda**: o mesmo termo aparece em
`CardAtleta.tsx`, `cep.ts`, `CheckoutFlow.tsx` (×3), `StepPagamento.tsx` e `PortasDaConta.tsx` — a
rodada só nomeou `SeletorForma.tsx:9` para a C2, e uma varredura completa é trabalho de outra lane.

## A catraca, antes/depois

`pnpm gate:canon --atualizar` (commit `cca92afb`):

| Contagem | Antes | Depois |
|---|---:|---:|
| `rotulo-de-checkbox-cru.landing` | 5 | **0** |
| todas as outras 24 | — | inalteradas (mesmo baseline que a C0/C1 deixaram) |

`gate-canon` rodado 2× (antes e depois do `--atualizar`, e de novo depois dos commits de board):
`PASS` nas três vezes.

## Gates, do zero

| Gate | Resultado |
|---|---|
| `pnpm install --frozen-lockfile` | limpo |
| rebuild `core → design-system → api-client` (`tsup`) | limpo, os três |
| `pnpm gate:canon` (baseline, antes de tocar código) | `PASS`, `rotulo-de-checkbox-cru.landing = 5` batendo com o que a C0 mediu |
| `tsc --noEmit` (landing) | limpo |
| `eslint app lib --max-warnings 0` (landing) | limpo |
| `server-safety.test.ts` (design-system) | 5/5 verdes |
| suíte direcionada da landing — `checkout-*`, `minha-conta-*`, `entrar-*` (42 arquivos, as telas tocadas + tudo que compõe `CheckoutFlow`) | **495 casos, verdes** |
| `next build` (produção, sem `.env.leela-hub`) | compila; as duas rotas tocadas (`/[eventSlug]/inscricao` 41.8 kB, `/minha-conta` 8.39 kB) geram normal |
| `pnpm gate:canon` (depois da conversão, antes do `--atualizar`) | `PASS`, a única contagem descendo |
| `pnpm gate:canon --atualizar` | baseline regravado, `cca92afb` |
| `pnpm gate:canon` (depois do commit de baseline) | `PASS`, zero delta |

**Sobre o "build local: npx vite build --mode leela-hub" do brief.** Não se aplica a esta onda: C2
toca só `apps/landing`, que é Next.js, não Vite — `--mode` é sintaxe do Vite e o próprio comentário
de `.env.leela-hub` documenta isso ("O Next não tem `--mode` como o Vite"). Esse arquivo de env
aponta para o projeto Firebase **real** (é o alias `prod` do deploy), então usá-lo localmente para
screenshot violaria o "nenhum deploy" da onda — não foi tocado. O build local equivalente para esta
superfície é o `next build` canônico (fail-closed, cai no projeto demo do Emulator sem credencial),
rodado acima.

## Gate visual (L-019)

**Real, em navegador, das duas telas de tema (Wine=claro, Brasa=escuro), mas do nível da peça, não
da tela ao vivo.** Sem seed de evento real em Firestore/emulador local, não dá para navegar até o
checkout ou a `/minha-conta` autenticados nesta sessão — abrir esse caminho é trabalho de infraestrutura
fora do escopo de "converter 5 checkboxes", e nenhuma das duas ondas anteriores (C0, C1) o fez pelo
mesmo motivo (os dois handoffs deferem a prova de navegador para o primeiro deploy que tocar a tela).

O que foi feito: subida do `showcase` do design-system (`vite --config showcase/vite.config.ts`,
porta local efêmera) e captura real via Chrome da seção "CheckboxField e FieldGroup", que já mostra
`"Li e aceito os termos da compra e a política de cancelamento."` — a MESMA string que
`AceitesCompra.tsx` agora renderiza — nos temas **Wine** (claro, `data-theme="wine"`,
`color-scheme: light`) e **Brasa** (escuro). Screenshots anexados nesta resposta.

Suporte adicional: os 495 casos da suíte direcionada renderizam as 3 telas convertidas de verdade
(RTL + jsdom, com o `CheckboxField` real do dist) e afirmam nome acessível, estado marcado/desmarcado
e `disabled` — não é prova estática (é DOM renderizado com comportamento exercido), mas não é
navegador. Registrado honestamente como a mesma lacuna que C0/C1 já documentaram.

## Boards e colisão de id

- `leela-specs/03-canon/epics/LEELA-E01-design-system.md` — S006-T7 detalhada com a C2.
- `leela-specs/00-boards/BOARD-EPICOS.md` — linha do S006 estendida com a C2.
- `leela-specs/00-boards/V1-KANBAN.md` — S006-T6 (C1) marcada `[x]` (estava paga desde 13-16/08 mas
  a C1 não tocou este arquivo por causa de outra lane com edição não commitada na árvore
  compartilhada); S006-T7 recebe o progresso parcial da C2.
- **Colisão de id S1222/S1223 corrigida**, como o brief pediu ao nomear que esta lane tocaria o
  arquivo: duas histórias reivindicavam `S1222` (VITRINE-FIX, 04/08 × "área do cliente", 05/08) e
  duas reivindicavam `S1223` (CHECKOUT-FIX-0803, 03/08 × "primeiro acesso do comprador", 05/08).
  Renumerada a dupla mais nova (05/08) para **S1269** e **S1270** — mesma régua da RN-568→569 do
  índice de regras de negócio (renumerar o mais novo, registrar o motivo, faixa conferida livre em
  todo o corpus antes de usar). **Fora do escopo desta lane:** as ~20 referências a `S1222-T*` /
  `S1223-T*` fora do `V1-KANBAN.md` (handoffs arquivados de 04-05/08, `BOARD-EPICOS.md` e
  `LEELA-E12-landing.md`) não foram varridas — ficam com o número antigo como registro histórico.
  Um corpus-wide rename tocaria arquivos arquivados de outra lane e é desproporcional a uma onda de
  5 conversões; quem tocar esses arquivos por outro motivo pode propagar.

## Aterrissagem

| O que | Hash |
|---|---|
| `AceitesCompra.tsx` (×3 conversões) + comentário `ds.ts` | `ee111f3e` |
| `StepDados.tsx` | `fd21878e` |
| `PortasDaConta.tsx` | `6276c001` |
| `SeletorForma.tsx` (higiene) | `69b73772` |
| baseline `gate-canon.baseline.json` | `cca92afb` |
| boards + épico + colisão de id | `c538604b` |
| main re-puxada antes do merge | não houve avanço (`origin/main` seguiu em `0a9d4304` do início ao fim da lane) |
| merge `--no-ff` na main | ver próximo passo |
| push | ver próximo passo |

Worktree removido ao final se a árvore ficar limpa.
