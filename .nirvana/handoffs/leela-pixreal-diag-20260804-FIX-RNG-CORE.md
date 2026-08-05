---
trace: leela-pixreal-diag-20260804
lane: FIX-RNG-CORE
employee: sf-backend-engineer (software-forge)
fecha: item 5 da fila técnica da REV-A4 — os três `= Math.random` de `packages/core`
territorio: packages/core/src (3 arquivos) + os testes do core (3 arquivos)
commits: 20a9c904
---

# FIX-RNG-CORE — a lista dos geradores que sorteiam com o PRNG do V8 fecha em zero

## O que fechou

A REV-A4 varreu o repo e deixou três pontos abertos, todos em `packages/core`,
todos com `= Math.random` como **default de parâmetro** e todos chamados em
produção **sem fonte explícita** — o que faz do default a fonte de verdade.
Os três passaram a sortear com a entropia do sistema.

| Gerador | Arquivo | O que o código vale | Onde é sorteado |
|---|---|---|---|
| `gerarCodigoOrganizador` | `platform/conviteOrganizador.ts:130` | **credencial ao portador** — `resgatarConviteOrganizador({codigo})` provisiona um TENANT para quem apresentar (RN-414), sem amarração ao e-mail do convidado | **no navegador** (`api-client/src/platform/convites.ts:86`, chamado do painel) |
| `gerarCodigoConvite` | `clubs/codigo-convite.ts:46` | convite de clube/assessoria (RN-101) | servidor **e** navegador (`NovoClubePage.tsx:64`) |
| `gerarRefCodigo` | `affiliation/afiliado.ts:103` | refCodigo de afiliado (RN-313) — link público que carrega atribuição de comissão | servidor (`salvarAfiliado.ts:214`) |

O de organizador é de outra categoria: prever o código de um convite ativo não
é "ser atendido como outra pessoa", é **abrir um tenant**. O estado do
xorshift128+ do V8 é recuperável a partir de poucas saídas consecutivas, e o
sorteio acontece no cliente, onde qualquer um observa quantas saídas quiser.

## A correção

Doutrina já estabelecida em `d36afb64`, aplicada sem invenção: o default de
cada gerador passa a ser `sorteioUniforme(ALFABETO.length)` de
`packages/core/src/aleatorio.ts`.

- **Web Crypto, não `node:crypto`** — o core é dependência de `apps/landing`
  (Next), `apps/painel` (Vite) e `apps/mobile` (Expo). A escolha já estava
  medida no `d36afb64` (o rollup do Vite morre no import de `crypto`); esta
  lane só a cumpriu e a re-provou no consumidor.
- **`aleatorio.ts` continua interno** — não foi exportado no `index.ts`, como
  o brief pediu e como o `d36afb64` deixou.
- **Faces derivadas do alfabeto**, nunca escritas à mão: trocar o alfabeto não
  pode desalinhar a fonte em silêncio.
- **A injeção continua viva.** Só o *default* mudou. `random` segue parâmetro,
  e é por ele que os testes pregam o sorteio e forçam colisão. Cada um dos três
  ganhou um caso que prova isso explicitamente — uma correção que matasse o
  seam trocaria um defeito por outro.

## Chamadores — conferidos um a um, nenhum corrigido porque nenhum precisava

Esta conferência era obrigatória, não formalidade: foi exatamente um chamador
passando a fonte explicitamente que deixou a correção do `d36afb64` **inerte no
caminho da venda** por duas rodadas, até a BUILD-5B medir.

| Chamador | Passa fonte? | Ação |
|---|---|---|
| `packages/api-client/src/platform/convites.ts:86` | não — `gerarCodigoOrganizador()` | nenhuma |
| `functions/src/assessorias/cadastrarAssessoria.ts:366` | não — `gerarCodigoConvite()` | nenhuma |
| `apps/painel/src/routes/clubes/novo/NovoClubePage.tsx:64` | não — `gerarCodigoConvite()` | nenhuma |
| `functions/src/affiliation/salvarAfiliado.ts:214` | não — `gerarRefCodigo()` | nenhuma |

Os quatro chamam sem argumento, o `undefined` cai no default novo, e nenhum
deles fica fora do território desta lane por consequência — não houve nada a
corrigir lá dentro nem nada a registrar como bloqueado.

## Vermelho → verde, por gerador

Molde do `sorteioCodigoVenda` (`61776052`): pregar `Math.random` numa fonte
determinística e afirmar que o gerador **não** produz o código dessa fonte. O
pregamento é global e curto; o `finally` devolve a fonte original.

| Gerador | Vermelho medido em HEAD, antes do fix | Verde |
|---|---|---|
| `gerarCodigoOrganizador` | `AssertionError: expected 'AAAAAAAA' not to be 'AAAAAAAA'` (`conviteOrganizadorCore.test.ts:133`) | 21/21 |
| `gerarCodigoConvite` | `AssertionError: expected 'AAAAA' not to be 'AAAAA'` (`clubeCore.test.ts:100`) | 45/45 |
| `gerarRefCodigo` | `AssertionError: expected 'AAAAAAAA' not to be 'AAAAAAAA'` (`afiliadoCore.test.ts:52`) | 21/21 |

Execução de referência antes do fix: **3 failed | 84 passed (87)** — os três
vermelhos são exatamente os três casos decisivos. Depois: **87 passed (87)**.

Além do caso decisivo, cada gerador ganhou três redes:

- **faixa** — os 31 símbolos aparecem numa amostra de 10 mil códigos e nada
  indexa fora do alfabeto (símbolo a símbolo);
- **variação** — 50 códigos seguidos do default são 50 códigos distintos, rede
  contra o modo de falha mais burro de uma troca de fonte (fonte travada
  entregando o mesmo convite de plataforma para todo mundo);
- **injeção viva** — fonte explícita ainda decide o código.

Faixa e variação **passam também antes do fix** — e é assim que tem de ser:
elas não provam a origem da entropia, provam que a troca não estragou o
formato. Quem prova a origem é o caso 1.

## Onde os testes moram, e por quê

Nos três `*Core.test.ts` de `functions/src/__tests__/` — que é onde os testes
do core moram neste repo, e onde o `d36afb64` (o precedente direto desta
correção) escreveu os testes dele. `packages/core` não tem runner próprio:
não há `vitest` nas suas dependências nem `vitest.config.ts`.

**A alternativa foi considerada e recusada:** criar o runner dentro de
`packages/core` exigiria `pnpm install`, que reescreve o `pnpm-lock.yaml` da
raiz e mexe em `node_modules` **enquanto duas lanes estão em voo** buildando e
testando. Um lockfile compartilhado é muito mais provável de colidir do que
três arquivos de teste que ninguém mais está tocando — e um `install` no meio
de um build alheio é dano ativo, não risco teórico.

Nenhuma linha de **código de produção** de `functions/` foi tocada. O commit é
`--only` nos seis arquivos, e nada dos vizinhos entrou. Durante a lane
apareceram `functions/src/cliente/meusClubes.ts` e
`functions/src/__tests__/clubesEConvites.integration.test.ts` no working tree
(BUILD-B4, em voo, no mesmo domínio de clubes/convites) — arquivos distintos,
sem interseção, e fora do commit.

## Gates

| Gate | Resultado |
|---|---|
| `tsc --noEmit` do core | **zero** |
| `eslint src --max-warnings 0` do core | **zero** |
| `tsup` do core (cjs + esm + dts) | **success** — `index.js` 290 KB, `index.mjs` 271 KB, `index.d.ts` 341 KB |
| `esbuild --platform=browser` do `src/index.ts` inteiro | **success** (272,9 KB) |
| **prova de consumidor** — entrada Vite **5.4.21** (o mesmo do painel) importando o core **construído** (`dist/index.mjs`) | **`✓ built in 408ms`** |
| `grep` no `dist` | **zero** `node:` e zero `from 'crypto'`; `getRandomValues` 3× em cada bundle |
| `grep` no bundle do consumidor | **zero** `node:`/`'crypto'`; `getRandomValues` 1× |
| `tsc --noEmit` de `functions` (cobre os 3 testes editados) | **zero** |
| `eslint --max-warnings 0` nos 3 testes editados | **zero** |
| `conviteOrganizadorCore` / `clubeCore` / `afiliadoCore` | **21 / 45 / 21 — 87/87** |
| regressão: `codigoPedidoCore` / `codigoIngressoCore` (os que já usavam `aleatorio.ts`) | **26 / 11 — 37/37** |

Sem emulator (tudo puro). Sem deploy. A suíte completa de `functions` **não**
foi executada, por política do brief e porque há lanes em voo escrevendo nela.

## Varredura final por `= Math.random`

Repositório inteiro (`packages/`, `functions/src/`, `apps/`), fora de
`node_modules`, `dist`, `lib` e `.next`:

**Zero ocorrências de `= Math.random` como default de parâmetro, em qualquer
lugar do repo.** Os 12 hits restantes são todos inertes:

- 6 são **comentários** que citam o defeito (nos testes desta lane e nos do
  `61776052`/`8d779dce`);
- 6 são `const original = Math.random` — o **salva-e-restaura** dos testes que
  pregam a fonte global.

Sobram dois usos de `Math.random()` *chamado* (não default), e os dois ficaram
**intocados de propósito**:

| Ponto | Por que não foi tocado |
|---|---|
| `apps/landing/.../checkout/CheckoutFlow.tsx:123` | **fallback** atrás de `crypto.randomUUID()`, para a chave de idempotência do cliente (RN-333). Não é credencial e não é código que alguém dita — prever ao máximo colide uma idempotency key. Além disso é `apps/**` e está **em voo na REV-5C**. |
| `apps/painel/.../kits/ItemKitModal.tsx:42` | **fallback** atrás de `globalThis.crypto.randomUUID()`, para id de item de lista no React. Não atravessa a rede, não vale autorização. Território `apps/**`, proibido nesta lane. |

Nenhum dos dois é gerador de código de portador, e nos dois o caminho primário
já é o Web Crypto. Registrados, não corrigidos.

## Fila técnica que esta lane abre

1. **Guarda de `NaN` nos três geradores.** `codigoPedido` e `codigoIngresso`
   ganharam `Number.isFinite` no clamp em `d36afb64`; estes três ainda têm o
   clamp antigo, e um `random()` que devolva `NaN` produziria a string
   `"undefined"` dentro do código. **Só é alcançável por injeção explícita**
   (test-only) — o default novo nunca devolve `NaN` —, então é dívida de
   uniformidade, não defeito de produção. Ficou de fora porque o brief mandou
   mudar **só o default**, e alargar sozinho é como uma correção vira duas.
2. **`packages/core` não tem runner de teste próprio.** Enquanto isso valer, os
   testes do core continuam morando em `functions/src/__tests__/*Core.test.ts`
   e o core depende do runner de `functions` para provar qualquer coisa. Se
   alguém for resolver, o momento é com as lanes paradas — o custo é
   `pnpm-lock.yaml`.
3. **O item 6 da REV-A4 cresceu.** O pregamento global de `Math.random` agora
   está em **cinco** arquivos de teste, não dois, e todos só são seguros
   enquanto `fileParallelism: false` valer em `functions/vitest.config.ts`.
   Quem for ligar paralelismo de arquivo tem de olhar os cinco antes.
