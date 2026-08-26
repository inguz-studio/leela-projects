# Handoff · LANDING-AWWWARDS (2026-08-26)

- **Trace:** `leela-landing-awwwards-202608261656` · squad `awwwards-singularity-studio`
- **Branch:** `landing/awwwards-20260826`, rebaseado em `origin/main` @ `8fa0c530` (a main com o conserto do CI, PR #1) · worktree `~/dev/leela-wt-awwwards`
- **Frente:** deixar a landing pública apresentável em nível Awwwards **sem sair do design system**
- **Estado:** 5 commits · **PR #2 em draft**, base `main`, **sem merge** — https://github.com/inguz-studio/leela-projects/pull/2 `ci/verde-20260826` e `.github/workflows/**` intocados. `functions/**`, `apps/painel/**`, `packages/design-system/**` e o checkout (`[eventSlug]/inscricao/**`): intocados.
- **Higiene de git:** nenhum commit usou `git add -A`/`.`/`-a`. Os 15 arquivos entraram por caminho explícito; `git diff --stat main...HEAD` prova que não há nada do dono junto. A árvore suja de `~/dev/LEELA` (o `MIGRACAO-DE-MAQUINA.md` modificado e as ~77 provas visuais não-rastreadas) nunca foi tocada — este lote rodou inteiro em worktree separado.
- **Entregáveis:** `.nirvana/outputs/leela-landing-awwwards-202608261656/squads/awwwards-singularity-studio/outputs/` — `01-research.md`, `02-direcao-visual.md`, `_SUMMARY.md`, `shots/antes|depois/`, `shots/PROVA-revelacao.md`.
  ⚠️ **Essa pasta é ignorada pelo git** (`.gitignore:10` — `outputs/`, com a razão escrita: run deliverables não vão pro repo). Ela **não está no PR**. O que foi versionado é o que a casa já versiona: este handoff e a prova visual em `.nirvana/gate-visual/landing-awwwards/` (mesmo precedente de `filtros-lista/` e `deploy-j4/`), reamostrada de 2× para 1× (16 MB contra 42 MB do original), que é a mesma ordem de grandeza do precedente `filtros-lista/`. As fotos em resolução cheia ficam no caminho acima, na máquina.

## O pedido do dono, e o que ele cobra

> como poderiamos deixar o site de landing page mais apresentavel com nosso squad awards? voce pode pesquisar referencias online de sites que tem a pegada esportiva e bem estar assim como nos e fazer em cima das referencias, mas mantendo nosso design system?

Duas metades, e a segunda é a que aperta: **"mantendo nosso design system"**. O
levantamento (17 referências reais, `01-research.md`) achou o vão de mercado —
nenhum marketplace de inscrição esportiva está premiado na galeria fitness do
Awwwards —, mas a rodada não podia comprar sofisticação com cor nova, fonte
nova ou biblioteca nova. Comprou com o que já existia e não estava sendo usado.

## 1 · O achado que muda a leitura de tudo: o véu que o build descartava

Antes de qualquer redesign, a medição do estado atual encontrou um defeito
**silencioso e reincidente**, e ele é o item mais importante deste handoff.

O preset do DS entrega cor como `var(--token)` **crua**. O Tailwind, quando não
consegue decompor a cor, **descarta o modificador de alpha** — sem erro, sem
warning, sem falha de build. Escrever `bg-surface-base/80` produz **nada**.

Provado no CSS emitido do build da `main`: das classes com `surface-base`, só
`.bg-surface-base` e `.to-surface-base` chegam ao arquivo. `.bg-surface-base\/80`,
`.from-surface-base\/80` e `.via-surface-base\/40` **não existem**.

Seis instâncias vivas na landing, por ordem de dano:

| Onde | Escrito | O que o usuário via |
|---|---|---|
| `[eventSlug]/page.tsx:248` | `bg-surface-raised/95` | **A barra de CTA fixa flutuava transparente.** Nome do evento e preço liam-se por cima da dobra que passasse por baixo. É o elemento de maior valor comercial da página. |
| `HeroSection.tsx:52,54` | `bg-surface-base/80`, `from-…/80`, `via-…/40` | **O escurecimento que garante AA sobre a capa borrada não existia.** O comentário do código prometia o contraste; o build entregava a foto nua. |
| `PublicHeader.tsx:48` | `bg-surface-base/90` | Header grudento **sem fundo nenhum**. |
| `KitImagem.tsx:80` | `bg-surface-base/70` | Chip de ampliar sem fundo. |

**A forma que sobrevive ao preset** é cor de token + utilitário de **opacidade do
elemento** (`opacity-*` não depende de o Tailwind decompor a cor). É o que o
commit `f5071d50` faz, com a medição escrita por extenso no `HeroSection` para
ninguém reintroduzir o idioma por hábito.

⚠️ **Isto não é problema só da landing.** É uma propriedade do preset e vale para
qualquer app do monorepo. **Ação sugerida:** varredura de `bg|text|border|from|via|to-<token>/<alpha>`
em `apps/painel` e no showroom, e a peça que mata a classe — tokens
`--surface-scrim-soft` / `--surface-scrim-strong` em `tokens/semantic.*.json`.
Proposta escrita em `02-direcao-visual.md` §4.

## 2 · O furo do gate de tokens (achado #2)

`shadow-[0_-6px_24px_-8px_rgba(0,0,0,0.6)]` — cor crua, unidade crua — **passa**
no `leela-tokens/no-hardcoded-tokens`. Provado chamando `findViolation` direto:

- o regex de função de cor exige `\b` antes de `rgba(`, e o Tailwind separa
  *arbitrary values* com `_`, que é caractere de palavra: `_rgba(` não casa;
- o regex de unidade crua exige `\b` **depois** de `px`, e ali vem `_`: `6px_`
  também não casa.

Ou seja: o gate cobre tudo **menos** exatamente onde valores crus moram no
Tailwind. Fix proposto no `02-direcao-visual.md` §4. Vale a mesma varredura do
item 1 — o painel pode ter dívida escondida atrás desse furo.

## 3 · A ordem da vitrine (o "por ora" que estava escrito no código)

`listarEventosPublicados` ordenava por nome e admitia: *"Mais próximos primeiro
seria ideal; ordenamos por nome estável por ora."* Medido no seed do mock em
26/08, com relógio canônico: a home **abria com um evento encerrado** enquanto
duas experiências abertas caíam para a segunda linha.

A regra ganhou módulo próprio, puro, com teste: **vendável primeiro** (aberto →
esgotado → encerrado) → **proximidade** (futuro antes de passado; entre futuros
a data mais próxima; entre passados a mais recente) → **nome** no empate
(determinismo, que importa para SSR e para o diff do gate visual).

`destaqueDaVitrine` saiu junto e alimenta o hero. Ele **nunca** devolve evento
encerrado: convidar para o que não aceita inscrição é a promessa que o achado
G6 já custou uma vez.

## 4 · O que mudou na cara da coisa

**Home** — o hero era uma laje de texto com a metade direita vazia em 1440, num
`bg-surface-sunken` chapado fechado por `border-b`, que é a costura que a página
de evento já tinha aposentado por decisão do dono. Agora: atmosfera de
`--glass-page-glow` (token do tema `brasa` que a landing **nunca tinha
consumido**), grade assimétrica e um **painel de destaque vivo** — próxima
experiência aberta, capa real, data em escala display, lugar, modalidades e
preço colado ao rótulo.

**Prova social** — não existia em lugar nenhum da landing, e aparece em 5 das 17
referências. Entrou como **três contagens derivadas** da mesma lista que a página
já leu (abertas · cidades · modalidades). Nada de depoimento, nada de logo, nada
de "milhares de atletas": quem quiser conferir rola vinte pixels e conta os
cards. Vitrine vazia → a faixa some.

**Movimento** — um primitivo, e um só: `animation-timeline: view()`. Zero JS,
roda no compositor, **bidirecional por construção** (a animação é a posição, não
um gatilho). Degradação em três camadas, medida e registrada em
`shots/PROVA-revelacao.md`. Aplicado pela `Dobra`, que já é onde o ritmo vertical
da página mora.

## 5 · Testes que mudaram

Nenhum teste existente quebrou nem precisou de ajuste — a copy e os contratos de
`porta-organizador` / `entrar-pontos-de-entrada` foram deliberadamente
preservados. **22 casos novos** em 2 arquivos novos:

- `test/vitrine-ordem-home.test.ts` (12) — travam a REGRA de ordenação, não a
  lista do seed. O seed muda; a regra fica.
- `test/vitrine-fatos-home.test.ts` (10) — as três formas reais de `local`
  medidas no seed e nos fixtures, mais os dois jeitos de inflar a contagem por
  acidente (caixa e acento).

**Suíte da landing: 849/849 → 871/871** (65 → 67 arquivos).

## 6 · Gate

| Prova | Resultado |
|---|---|
| `pnpm --filter @leela/landing lint` | 0 |
| `pnpm --filter @leela/landing type-check` | 0 |
| `next build` (contra emulador) | 12/12 rotas |
| `vitest run` | **871/871** em 67 arquivos |
| Gate visual | 6 pares antes/depois (home + 2 eventos × 1440/390), **0 erro de console** em todas |
| Dependências novas | **0** — bundle da home inalterado (202 kB First Load) |
| Tokens novos no DS | **0** — `packages/design-system` não foi tocado |

**O rebase, e o que ele obrigou a refazer.** O branch nasceu de `847e56ac`. Quando
a `main` recebeu o merge do conserto do CI (`8fa0c530`), o branch foi rebaseado —
sem conflito: o CI mexe em `.github/workflows`, `functions`, `apps/mobile` e um
tipo de `packages/core` (`isUrlCapaValida` ganhou uma asserção para o
type-check do RN; **zero mudança de runtime em web/Node**). Ainda assim, as fotos
do **antes foram refeitas na `main` atual**, com o mesmo probe e nas mesmas
condições do depois: um gate visual cujo "antes" é de um commit velho não prova
nada. O gate inteiro (lint · tsc · build · 871/871) foi **re-rodado depois do
rebase**.

**Como as fotos foram feitas** (para reprodução): worktree em `main`, build da
landing contra o emulador do **mock-campeche** já no ar (`FIRESTORE_EMULATOR_HOST=127.0.0.1:8280`,
`GCLOUD_PROJECT=demo-leela`), servido em `:3100` com
`LEELA_CLOCK=2026-03-15T12:00:00-03:00` (a armadilha do relógio). Probe em
`.nirvana/gate-visual/probe-landing-awwwards.mjs`. **Nada foi derrubado**: o mock
(4602/8280/9298/5301/9399/4011) e a `:4601` seguiram de pé o tempo todo; nenhum
emulador `demo-leela` novo foi levantado; os servidores meus foram encerrados por
PID exato.

**Duas notas do probe, para quem for repetir:**
1. Ele **rola a página inteira** antes de fotografar — sem isso o `fullPage` capta
   buracos onde a imagem `lazy` ainda não entrou, e "antes"/"depois" passam a
   diferir por artefato de captura. (O primeiro "antes" desta rodada caiu nessa e
   foi refeito.)
2. Ele fotografa com `prefers-reduced-motion: reduce`. Uma animação de timeline é
   **recalculada na captura**: um `fullPage` cru fotografaria as dobras de baixo em
   `opacity: 0` — mediria o probe, não o design. O movimento é provado por
   **medição** em `shots/PROVA-revelacao.md`.

## 7 · O que NÃO foi feito, e por quê

| Item | Razão |
|---|---|
| Seção de clube/comunidade | A landing não tem leitor público de clubes. Fabricar a dobra violaria a régua "sem dado → sem seção". |
| Depoimentos / logos de parceiros | Dado que a plataforma ainda não coleta. |
| `@view-transition { navigation: auto }` | At-rule **de documento** — não há como escopá-la por rota, e alcançaria o checkout. |
| CTA com o ato no rótulo ("Inscrever na 10k · R$ 89") | Muda o contrato de `CtaInscricao`/`ctaStyles` — fronteira do checkout. |
| Tokens `--surface-scrim-*` e `CardEvento` com `fill` | São as duas peças que fariam os consertos morarem no lugar certo. Lote do DS, não da landing. |
| Escala tipográfica fluida (`clamp()`) | Trocar a escala é decisão de DS. |

## 8 · Veredito do reviewer (critérios reais do Awwwards)

**Design 7.9 (40%) · Usability 8.2 (30%) · Creativity 6.8 (20%) · Content 8.5 (10%) → ponderado 7.83 · `honorable_mention`.**

Acima do limiar de 7.0, abaixo dos 8.5 de SOTD competitivo. Nota honesta. Os
cinco itens acionáveis que separam 7.83 de 8.5 estão no `_SUMMARY.md`, com fix e
impacto por linha — o de maior retorno por esforço é a calha: `xl:max-w-6xl` em
`lib/containerPublico`, uma constante, toda a superfície pública.

## 9 · Fila de retomada (nesta ordem)

1. **Varredura `token/alpha` no painel e no showroom** — a classe de defeito do §1
   não é da landing, é do preset. Card no backlog.
2. **Peça no DS: `--surface-scrim-soft` / `--surface-scrim-strong`** — mata a classe
   inteira em vez de tratar caso a caso.
3. **Fix do `leela-tokens/no-hardcoded-tokens`** para *arbitrary values* com `_` (§2).
4. **`CardEvento` com `fill`** — hoje a landing resolve com duas variantes utilitárias
   locais e um comentário; o lugar certo é o átomo.
5. **Calha `xl:max-w-6xl`** — +0.4 na nota de Design por uma constante.
6. Revisão do dono sobre as fotos antes/depois, e decisão sobre o CTA transacional
   (é a única recomendação P0 do research que esbarra no checkout).

## 10 · Estado da máquina ao encerrar

- Worktree `~/dev/leela-wt-awwwards` **mantido** (árvore limpa, branch pushed) — remover com
  `git worktree remove ~/dev/leela-wt-awwwards` quando o PR fechar.
- `~/dev/LEELA` está em **`main` @ `8fa0c530`** (o checkout foi movido para lá pelo merge
  do PR #1, não por esta lane — este lote nunca rodou `git checkout` naquele diretório),
  com a mesma modificação não-commitada que já havia
  (`leela-specs/00-boards/MIGRACAO-DE-MAQUINA.md`, do dono) e as ~77 provas visuais
  não-rastreadas de `filtros-lista/`. **Nada disso foi tocado.**
- Portas: `:3100` liberada (encerrada por PID). Mock-campeche e `:4601` de pé, intocados.
