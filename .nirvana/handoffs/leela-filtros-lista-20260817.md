---
tags: [leela, handoff, filtros, canone, design-system, leva20]
aliases: [FILTROS-LISTA, Handoff filtros em lista 17/08]
atualizado: 2026-08-17
---

# FILTROS-LISTA · handoff

- **Trace:** `leela-redesign-v2-20260810` · lane `FILTROS-LISTA`
- **Brief:** `.nirvana/briefs/leela-filtros-lista-20260817-enriched.md`
- **Árvore:** worktree `C:\dev\leela-wt-filtroslista`, branch `filtros-lista`, base main `43ef9c7e`
- **Registro da decisão:** `leela-specs/02-rodadas/2026-08-17-decisoes-dono/01-decisoes-dono.md`, leva 20
- **Cânone novo:** `leela-specs/03-canon/canone-de-componentes.md` §1.1
- ⛔ **Nenhum deploy nesta lane.**

## O pedido, e por que ele não é conserto de defeito

O dono, na íntegra (17/08, leva 20): *"novamente, voco colocol pills no lugar de filtros, em
Membros, em duas fileiras, quanto poderiamos apenas ter filtros. (…) quero que voce aplique o
componente dos filtros em lista. e eles devem ficar alinhados ao lado do pesquisador, assim como em
DEsafios. Para padronizar. (…) mas isos deve ser aplicar no projeto inteiro."*

A palavra que abre a fala é **"novamente"**. A onda C4 aplicou `FilterChips` em Membros seguindo a
spec da conformidade e o limiar do ADR-019 à risca: o padrão estava certo pela régua da esteira e
errado pelo gosto do dono, que é quem manda no padrão. É troca de régua, não conserto — por isso a
decisão subiu ao cânone em vez de virar card de tela.

## Herança da lane morta (o terminal travou ~16:10Z), julgada arquivo a arquivo

O diff sem commit era **matéria-prima**, e foi tratado como tal. Veredito:

| O que havia | Veredito | Por quê |
|---|---|---|
| `FilterChips.tsx` / `FilterMenu.tsx` sem limiar, com `disabled` | **mantido** | é a evolução NO DS, não cópia local; 39 casos verdes na família |
| `FilterChips.test.tsx` reescrito | **mantido** | reescreve o contrato antigo em vez de apagá-lo; um teste por contagem |
| Cânone §1.1 | **mantido** | escrito a partir da medição real, não de suposição |
| 7 rotas com `w-full max-w-md` removido | **mantido** | é a metade 2 do padrão |
| `InscritosView` e `EventosGlobaisRoute` convertidos | **mantido** | os dois ADRs caem com a dívida quitada |
| **`\r` solto em 7 rotas** | **CONSERTADO** | o editor da lane morta deixou `\r\r\n` onde apagou a linha da classe. Um CR órfão faz o git desistir de normalizar EOL: o diff nascia com **2546 inserções** e virou **413** depois do conserto. Diff de revisão impossível não é detalhe cosmético |
| Registro da leva 20 | **faltava** | escrito nesta retomada |
| ADRs 018/019/020 marcados | **faltava** | escrito nesta retomada |
| Baseline do `gate-canon` | **faltava** | `faceta-crua.painel` 2 → 0 nesta retomada |
| 10 testes de rota dirigindo chip | **faltava** | reescritos nesta retomada |
| Kanban | **faltava** | card com épico→história→tarefa nesta retomada |

## A anatomia medida (é ela que decidiu o padrão)

Desktop 1440, painel de pé, 17/08. Fonte: `.nirvana/gate-visual/filtros-lista/antes-medicoes.json`.

| Tela | Fileiras | Altura da barra | Largura da busca | Facetas |
|---|---:|---:|---:|---|
| Desafios (a referência dele) | 1 | 55px | 320px | 2, em fileira de chips |
| Membros (a queixa dele) | 2 | 99px | 448px | 2, em fileira de chips |
| Comunicados | 2 | 99px | 320px | 3, em fileira de chips |
| Eventos (hub) | 1 | 49px | — | 1, **em lista** |

Três coisas que a suposição não teria mostrado:

1. **Membros e Desafios têm composição JSX idêntica.** A única diferença era `w-full max-w-md` no
   campo de busca. Um teste de unidade veria o mesmo código nas duas telas e passaria verde nas duas.
2. **Largura sozinha não resolve.** Comunicados já tinha a busca em 320px e três facetas em fileira
   ainda quebravam a linha — em 768 viravam **três** fileiras.
3. **A referência do dono cumpria metade do padrão.** Desafios acertava a posição e errava a forma,
   então converteu junto. O hub de Eventos, que ninguém citou, já era o padrão inteiro.

O ganho que a lista dá e a fileira não dava: na fileira o nome da faceta só existia no `aria-label`.
Membros mostrava `Todos · Ativos · Novos · Inativos · Todos · Owner · Admins · Membros` — dois
"Todos" colados. O gatilho da lista mostra `Status: Todos`, em texto, para todo mundo.

## Telas convertidas (13)

**Por mudança de tela (9):**

| Tela | Arquivo | O que mudou |
|---|---|---|
| Membros | `clubes/clube/membros/MembrosList.tsx` | largura da busca |
| Hub de clubes | `clubes/hub/HubClubes.tsx` | largura da busca |
| Clientes (CRM) | `crm/ClientesPage.tsx` | largura da busca |
| Afiliados | `eventos/afiliados/AfiliadosPage.tsx` | largura da busca |
| Influenciadores | `parcerias/afiliacoes/InfluenciadoresPage.tsx` | largura da busca |
| Assessorias | `parcerias/assessorias/AssessoriasPage.tsx` | largura da busca |
| Marcas | `parcerias/marcas/MarcasPage.tsx` | largura da busca |
| Inscritos | `eventos/inscritos/InscritosView.tsx` | faceta à mão → `FilterChips`, **e para dentro da `FilterBar`** (ADR-019) |
| Eventos globais | `plataforma/eventos/EventosGlobaisRoute.tsx` | faceta à mão → `FilterChips` com `disabled` (ADR-020) |

**Pela peça, sem tocar na tela (4 a mais, 6 com teste novo):** Desafios, Comunicados, Campanhas,
Repasses, Tenants e Contas consomem `FilterChips` e a peça trocou de forma debaixo delas. Nenhuma
linha de tela mudou; os testes é que passaram a abrir o gatilho e escolher o valor.

## Fila nomeada — o que ficou para a onda seguinte

1. **`Combobox mode="flow"` (trabalho de DS).** O ADR-018 fica **parcialmente** superado: a régua de
   cliques caiu com os outros dois, mas a perna que o segura é ausência de capacidade — o `Combobox`
   é picker de popover e não tem resultado inline. E `AtendimentoPanel.tsx` **não tem faceta
   nenhuma**: é campo de busca com resultado inline, e o padrão novo governa filtro de listagem.
   Esticar a fala do dono até lá seria inventar decisão. `barra-de-filtro-crua.painel = 1` é dele, e
   esta lane **não** baixou esse número.
2. **Regra dura de lint contra pill-como-filtro — avaliada e recusada, com motivo.** A régua da
   `leela-canon/filtro-fora-do-canone` é *o rótulo que o autor escreveu*; um `Chip` ligado a estado
   de filtro **sem** `aria-label` de filtro só se pega por análise de estado, que é terreno de falso
   positivo — e o próprio cabeçalho da regra diz que assinatura frágil é onde falso positivo nasce.
   A catraca já reprova a reintrodução: `faceta-crua` está em **0**, e qualquer fileira de chips com
   rótulo de filtro faz o número subir. Se aparecer uma reintrodução sem rótulo, aí a regra tem caso
   real para nascer.
3. **O H1 do arquivo de decisões diz "(levas 17, 18 e 19)"** e o arquivo já tem as levas 20, 21 e 22.
   Cosmético, e de propósito não tocado: mexer nessa linha garante conflito com toda lane que
   registrar leva no mesmo dia. Quem fechar o dia arruma.
4. **Leva 20, itens 2 e 3 — ponteiros, não silêncio.** KPI de engajamento e insights da Leela →
   lane **ENG-INSIGHTS**. Barra mobile flutuante e perfil no topo direito → lane **NAV-MOBILE**.

## ⛔ Achado que atravessa lane: a leva 20 respondeu dois vetáveis da leva 19

Quem pegar a lane **NAV-MOBILE** precisa ler `01-decisoes-dono.md` §20.3 **antes** da §19.2:

- **NAV-MOBILE-1 respondido.** *"barra flutuante, horizontal a ficar na parte inferior da tela"*. A
  leitura de barra inferior estava certa, e ele acrescentou **flutuante** — que muda o desenho: a
  barra passa por cima do conteúdo em vez de reservar altura. Isso conversa direto com o aviso da
  leva 19 de que altura em 375 é o que a leva 17 briga para liberar.
- **NAV-MOBILE-4 respondido.** *"logout, configurações, na barra superior no lado direito, com o
  ícone de perfil"*. **Um** botão, abrindo o popover que a leva 16 já fechou.
- **Continuam abertos:** NAV-MOBILE-2 e NAV-MOBILE-3.

## ⛔ Achado do merge: a leva 21 não tem registro

O card da lane MODAL-LOTE, no kanban, diz que o registro da leva 21 mora *"no card da lane
FILTROS-LISTA"*. **Não mora.** O brief desta lane a tornou dona do registro da leva **20** e não
cita a 21 em nenhuma linha. Duas lanes leram o mesmo mapa de maneira diferente e a fala do dono
ficou no vão — a mesma classe de falha que abre o `01-decisoes-dono.md`, reincidindo no mesmo dia.

O trabalho da leva 21 **existe e está provado** (`.nirvana/handoffs/leela-modal-lote-20260817.md`,
cinco itens com causa raiz medida). O que não existe é o registro da fala, e esta lane **não o
escreveu** porque nenhum artefato transcreve o que o dono disse: escrever uma citação reconstruída
seria inventar decisão. O buraco ficou **nomeado** em `01-decisoes-dono.md` (seção "⛔ Leva 21") e
no card do kanban, com quem paga escrito: a primeira lane que tiver a fala em mãos.

A lição, de processo: "o registro está na outra lane" só vale quando a outra lane recebeu a leva
**por escrito no brief**. Ponteiro para registro que ninguém foi encarregado de escrever some sem
barulho, porque os dois lados acham que o outro fez.

## Gates, com números reais

| Gate | Resultado |
|---|---|
| `tsc --noEmit` painel | **exit 0** |
| `tsc --noEmit` design-system | **exit 0** |
| `eslint src` painel (`--max-warnings 0`) | **exit 0** |
| `eslint src showcase/src` DS (`--max-warnings 0`) | **exit 0** |
| Suíte do design-system | **92 arquivos · 2116 casos · 0 reprovados** |
| Suíte do painel (3 fatias seriais, cobertura completa de `src/`) | **256 arquivos · 2883 casos · 0 reprovados** |
| `gate-canon` | **PASS** |

**Depois do merge da `main` na branch** (a `main` andou durante a lane: entraram MODAL-LOTE,
SPEC-LEVA22 e ENG-INSIGHTS, e o MODAL-LOTE mexe em `Modal`/`Dialog`, que são peças de uso amplo).
Tudo re-rodado do zero na árvore mesclada:

| Gate | Resultado |
|---|---|
| `tsc --noEmit` painel e design-system | **exit 0** nos dois |
| `eslint` painel e design-system (`--max-warnings 0`) | **exit 0** nos dois |
| Suíte do design-system | **92 arquivos · 2118 casos · 0 reprovados** |
| Suíte do painel (3 fatias seriais) | **256 arquivos · 2902 casos · 0 reprovados** |
| `gate-canon` | **PASS** — `faceta-crua.painel = 0`, nenhuma família subiu |

**Catraca, antes × depois:** `faceta-crua.painel` **2 → 0**. Nenhuma outra família mudou, e
**nenhum bump** foi feito para acomodar nada. As duas facetas que saíram são exatamente as que os
ADR-019 e ADR-020 protegiam.

Dez casos de rota foram reescritos para dirigir a lista (`option` no `Combobox`, `menuitemcheckbox`
no `FilterMenu`). Nenhuma asserção foi afrouxada: o que era "clica no chip e o recorte muda" virou
"abre o gatilho, escolhe o valor e o recorte muda".

## ⏳ Gate visual — do maestro, exige navegador

Esta lane **não** rodou o navegador e não finge ter rodado. O **antes** já está capturado (24 PNG +
`antes-medicoes.json` em `.nirvana/gate-visual/filtros-lista/`), e o **depois** sai do mesmo
comando, para as medidas serem comparáveis:

```
bash scripts/mock-campeche.sh up
node scripts/gate-visual-filtros.mjs --rotulo depois
```

O script reprova sozinho se, no desktop, a barra ocupar mais de uma fileira ou sobrar faceta em
fileira de chips. Em 375 a quebra é o desenho certo e ele não cobra fileira única.

**As telas a olhar, nos 3 tamanhos e nos 2 temas:**

| Tela | O que conferir |
|---|---|
| **Membros** | a queixa. Fileira única, `Status:` e `Papel:` nomeados no gatilho, sem dois "Todos" colados |
| **Desafios** | o controle. Era a referência dele e converteu — tem de ficar igual a Membros, não diferente |
| **Comunicados** | o caso difícil. Três facetas numa fileira só, que a fileira de chips nunca conseguiu |
| **Eventos (hub)** | não mudou nada. Já era o padrão; se mudou, algo saiu do lugar |
| **Inscritos** | a faceta subiu para dentro da barra e a contagem por status foi para dentro da lista |
| **Eventos globais** | escolher um tenant desliga o gatilho inteiro de Status, com a razão em texto |

## Commits da lane

| Hash | O quê |
|---|---|
| `ccc2aaa9` | a peça: o limiar morre, `disabled` nasce |
| `14954604` | a busca volta à largura do DS em 7 telas |
| `c13b8b27` | Inscritos e Eventos globais convertidos, ADR-019 e ADR-020 caem |
| `9978a951` | as 6 telas que a peça converteu sozinha ganham teste da interação nova |
| `8f5a30e0` | cânone §1.1, registro da leva 20, ADRs marcados, catraca 2 → 0 |
| `e3c36e36` | o gate visual do filtro em lista, com o antes medido |
