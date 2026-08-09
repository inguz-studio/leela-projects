# HANDOFF VIVO — SCROLLBAR-TEMA

**Trace:** `leela-retomada-20260808` · **Lane:** `SCROLLBAR-TEMA` · **Employee:** `sf-frontend-lead`
**Repo:** `C:\dev\LEELA` · branch `main` · base `b6ddc017`
**Início:** 2026-08-08 22:23 (-03)

## O problema, em uma frase

A barra de rolagem nativa nasce **clara** sobre a interface escura porque `color-scheme`
nunca foi declarado em lugar nenhum do fonte. Não é descumprimento do DS: é peça que
nunca foi escrita.

Este é o **terceiro** problema de rolagem da série, e é distinto dos dois anteriores:

| # | Problema | Estado |
|---|---|---|
| 1 | Double scrollbar — vertical filha da horizontal no nav (Windows) | fix `fd6e5e69`+, no ar 05/08 |
| 2 | Double scrollbar — `.sr-only` absoluto escapa para o `<html>` | fix `a06c16d4`, no ar 06/08 18:48 |
| 3 | **Cor** da barra não obedece ao tema | esta lane |

## Estado da árvore ao começar

- `git status --porcelain`: zero arquivo **tracked** modificado; só untracked antigos
  (briefs, logs, `functions/lib/`). Índice **vazio** — o arquivo alheio staged
  (`leela-pixreal-diag-20260804-REV-5B.md`) já saiu do índice pela SEAL-DEFAULTS.
- HEAD `b6ddc017` = origin/main.
- `dist/` do DS: 06/08 18:47, posterior ao último commit do DS (06/08 18:43).

## Log de tasks

### T0 — leitura e medição (feito)

Confirmado o que o brief mediu:

- `grep -rn color-scheme` em `packages/design-system` + `apps/painel/src` + `apps/painel/index.html`
  + `apps/landing/app` → **0 ocorrências**. (O único hit no repo é `apps/landing/.next/server/pages/500.html`,
  página de erro do próprio Next, artefato de build, não fonte.)
- Nenhum token de barra de rolagem nos temas.
- `SCROLL_X_ONLY_SEM_CROMO` vive em `packages/design-system/src/utils/scroll.ts:92`.

**Correção de fato ao brief — importa para a decisão.** O brief diz "dois temas (`brasa` e
`wine`), ambos escuros hoje". **`wine` é um tema CLARO.** Medido:

| Tema | `--surface-base` | `--text-primary` | Esquema real |
|---|---|---|---|
| brasa | `var(--neutral-950)` → `#0C0C0C` | `var(--neutral-50)` | **dark** |
| wine | `var(--neutral-50)` → `#FDFAF7` | `var(--neutral-900)` → `#262220` | **light** |

O próprio gerador já diz isso em comentário: *"A base descreve o tema escuro (brasa); wine
inverte os papéis dos neutros"* (`src/scripts/generate-tokens.ts:27`). Ou seja: a exigência
do brief — "se algum tema claro existir ou vier a existir, o valor tem que acompanhar o
tema, não ser constante" — **já é verdade hoje**, não é hipótese futura. Uma constante
`dark` seria um defeito no `wine` no dia em que alguém o ligar.

### Arquitetura relevante (por que a declaração cabe no tema)

- `themes/brasa.css`, `themes/wine.css` e `themes/index.css` são **auto-gerados** por
  `src/scripts/generate-tokens.ts` → `generateCSS()` em `src/theme/generate.ts`. Editar o CSS
  à mão seria apagado no próximo `generate-tokens`.
- Os dois apps aplicam `data-theme` no **`<html>`** — painel via `ThemeProvider`
  (`document.documentElement.setAttribute`) e landing estaticamente em `app/layout.tsx`.
  Antes do mount, `:root:not([data-theme])` já pinta brasa (anti-FOUC).
  Logo, uma declaração dentro do bloco do tema cai **no elemento raiz**, que é exatamente
  onde `color-scheme` governa a barra de rolagem do viewport.
- O CSS dos temas é consumido direto de `themes/*.css` (não passa por `dist/`); `dist/`
  só carrega o JS/TS.

### T1 — o conserto (feito) · commit `8e10ab8f`

**Onde a declaração ficou, e por quê.** No bloco de cada tema, gerada a partir de um token
novo. Três decisões dentro dessa, cada uma com o motivo:

1. **No tema, não no app.** Um `color-scheme` no `index.html` do painel resolveria o painel e
   deixaria de fora a landing, o showcase e o Storybook. No tema, nasce certo em qualquer
   consumidor que importe o CSS, inclusive os que ainda não existem.
2. **Vinda de token, não de literal no gerador.** Token novo `color.scheme`:
   `tokens/semantic.json` = `dark` (brasa), `tokens/semantic.wine.json` = `light` (wine).
   `generateCSS` procura o token achatado e emite a declaração; **sem token, não emite nada**
   (degradação escolhida: `normal` do navegador é melhor que esquema errado carimbado).
3. **Literal, não `var()`.** `color-scheme: var(--color-scheme)` funciona, mas um valor
   inválido em tempo de computação derruba a declaração inteira em silêncio. O literal não tem
   esse modo de falha. A var `--color-scheme` continua sendo emitida junto — é dela que uma
   barra estilizada se serviria.

Arquivos (9, todos `--only`):

| Arquivo | O quê |
|---|---|
| `tokens/semantic.json` | token `color.scheme: dark` + `$description` |
| `tokens/semantic.wine.json` | override `color.scheme: light` |
| `src/theme/generate.ts` | `generateCSS` emite a declaração a partir do token |
| `themes/{brasa,wine,index}.css` | regenerados (`tsx src/scripts/generate-tokens.ts`) |
| `src/theme/rn-themes.ts` | regenerado (efeito colateral do gerador) |
| `src/utils/scroll.ts` | seção nova: "A COR da barra não se decide aqui" |
| `src/theme/__tests__/color-scheme.test.ts` | contrato, 15 casos |

Saída gerada, conferida:

```
:root:not([data-theme]),
[data-theme="brasa"] {
  color-scheme: dark;
  ...
[data-theme="wine"] {
  color-scheme: light;
```

### T2 — a decisão que NÃO é minha (feito) · SCROLLBAR-1

Construí a **nativa**, como o brief mandou. A **estilizada** subiu ao painel canônico
`leela-specs/01-produto/DECISOES-ABERTAS.md` como **SCROLLBAR-1**, com valor medido, não com
adjetivo. Contraste dos candidatos a polegar contra a superfície de cada tema, piso de 3:1
(WCAG 1.4.11, elemento de interface não-texto):

| Candidato | brasa | wine | veredito |
|---|---|---|---|
| `--border-default` | 1,67:1 | 1,46:1 | **reprova** — seria trocar barra clara demais por barra invisível |
| `--border-strong` | 4,13:1 | 3,60:1 | passa nos dois |
| `--text-tertiary` | 6,87:1 | 5,29:1 | passa, mas lê como cromo de peso de texto |
| `--primary-500` (marca) | 5,69:1 | 10,33:1 | passa com folga |
| trilho `--surface-sunken` | 1,01:1 | 1,08:1 | **trilho nenhum** — teria de ser transparente ou `--surface-raised` |

Custo da opção estilizada, que não é dinheiro e está escrito no item: estilizar **desliga** o
cromo nativo em vez de conviver com ele. `scrollbar-color` faz o Chrome perder o desenho fino,
e `::-webkit-scrollbar` ignora `color-scheme` por completo — a preferência de acessibilidade
que a pessoa configurou no sistema dela deixa de valer nas nossas telas.

### T3 — gates (feito)

Todos re-provados do zero nesta lane, nenhum herdado.

| Gate | Comando | Resultado |
|---|---|---|
| DS build | `./node_modules/.bin/tsup` | `Build success` (ESM 999ms · DTS 7,7s) |
| DS tipos | `./node_modules/.bin/tsc --noEmit` | **0** |
| DS lint | `/c/dev/LEELA/node_modules/.bin/eslint src showcase/src --max-warnings 0` | **0** |
| DS suíte | `./node_modules/.bin/vitest run` | **1258/1258**, 68 arquivos, 42,6s |
| Painel tipos | `./node_modules/.bin/tsc --noEmit` | **0** |
| Painel lint | `eslint src --max-warnings 0` | **0** |
| Painel suíte | `./node_modules/.bin/vitest run` | **2185/2185**, 208 arquivos, 340s |
| Landing tipos | `./node_modules/.bin/tsc --noEmit` | **0** |
| Landing lint | `eslint app lib --max-warnings 0` | **0** |

Sem `--singleFork`. `tsup` rodou antes e sozinho. `pnpm-workspace.yaml` **não sujou**
(`git status --porcelain pnpm-workspace.yaml` vazio o run inteiro); usei `node_modules/.bin`
direto, nunca `pnpm run`.

**`leela-scroll/no-scroll-de-um-eixo` não foi violada.** A regra está ligada como `error` em
`eslint.config.mjs:109` para `packages/design-system/src/**` e `apps/*/src|app/**`, com
`__tests__` fora do escopo. Os dois arquivos `.ts` que toquei estão **dentro** do escopo e o
lint fechou em zero — o conserto não escreve classe de overflow nenhuma.

### T4 — os testes mordem (feito) · mutação provada, não alegada

15 casos em `src/theme/__tests__/color-scheme.test.ts`. Como sei que medem alguma coisa:

| Mutação aplicada | Resultado |
|---|---|
| apagar a linha `color-scheme: dark;` de `themes/brasa.css` | **1 falha** — "nenhum color-scheme em themes/brasa.css — rode generate-tokens" |
| trocar o token `color.scheme` de `dark` para `light` | **3 falhas** — gerador, var e coerência de polaridade |

As duas mutações foram revertidas e o arquivo voltou byte a byte (`git diff` conferido antes
do commit).

Uma correção que fiz **por causa** da mutação: a primeira versão do caso de polaridade
comparava a cor real contra a tabela de constantes do próprio arquivo de teste, então trocar o
token não a derrubava. Agora ela lê o valor **declarado no CSS gerado** e o compara com o
brilho real de `surface-base` contra `text-primary`. É essa a trava do terceiro tema.

### T5 — o que NÃO quebrou (feito)

- **Navegação sem cromo:** `SCROLL_X_ONLY_SEM_CROMO` intacto, com `[scrollbar-width:none]` e
  `[&::-webkit-scrollbar]:hidden`. Ordem do dono, dita duas vezes.
- **Matriz de kits com cromo:** `SCROLL_X_ONLY` segue sem `scrollbar-width`, porque ali a barra
  é a única pista de que há mais coluna.
- Os dois estão travados em `utils/__tests__/scroll.test.ts` (que não toquei) e re-afirmados
  num caso do arquivo novo, para o conserto da COR não invadir a decisão da EXISTÊNCIA.
- Nenhum arquivo de `apps/` foi tocado. Zero conflito com os 5 commits da REV-VITRINE.

### T6 — prova de que a mudança chega no bundle (feito)

Não é alegação de "deve funcionar". Construí o painel e li o CSS minificado:

```
$ ./node_modules/.bin/vite build            # ✓ built in 15.49s
$ grep -o "color-scheme:[^;}]*" dist/assets/index-3PlkfKJK.css | sort | uniq -c
      1 color-scheme: dark      ← a var --color-scheme
      1 color-scheme: light
      1 color-scheme:dark       ← a DECLARAÇÃO, minificada
      1 color-scheme:light
$ grep -o ":root:not(\[data-theme\]),\[data-theme=brasa\]{color-scheme:[a-z]*" …
:root:not([data-theme]),[data-theme=brasa]{color-scheme:dark
[data-theme=wine]{color-scheme:light
```

Sobrevive à minificação e fica colada no seletor certo. **Antes**, no bundle atual da landing
(`.next/static/css/*.css`, o que está no ar): `grep -c color-scheme` = **0** nos três chunks,
com `--surface-base` presente — ou seja, o CSS do tema chega lá, e a declaração não estava nele.

### T7 — board, épico e painel (feito) · commit `febf0cc6`

- **Épico `LEELA-E01-design-system`:** **RN-518** nova ("a polaridade é do tema, e ela é a única
  declaração que sai de um token"), mais a seção "Tema · arquitetura de tokens" atualizada para
  citar `color.scheme` no tier semântico. RN-518 escolhida por contagem, não por chute: RN-512
  já tem 13 usos e 517 é o máximo em uso.
- **`BOARD-EPICOS`:** linha do E01 com o delta 🔄, incluindo a correção de premissa do wine.
- **`V1-KANBAN`:** card `[E01]` em **Em execução** com a história **S321** e quatro tarefas
  (duas feitas, uma que é a conferência de olho do dono, uma retida em SCROLLBAR-1).
  Estado 🔄 e **não** ✅ de propósito: na convenção da casa ✅ quer dizer "entregue e no ar".
- **Painel canônico:** SCROLLBAR-1 acrescentado; cabeçalho de 65 → **66**, conferido contando
  os `###` das duas seções que somam (59 + 7), não de memória.

---

## ⚠️ O QUE PRECISA SUBIR — leia isto antes de sequenciar o deploy

**Construído × revisado × NO AR, sem maquiagem:**

| Coluna | Estado |
|---|---|
| Construído | ✅ `8e10ab8f` + `febf0cc6`, empurrados (`b6ddc017..febf0cc6`) |
| Revisado | ❌ **nenhuma review antagonista nesta lane** |
| NO AR | ❌ **nada**. O dono não vê diferença nenhuma hoje |

**Painel E landing, os dois.** Não é um ou outro:

- **Painel** (`apps/painel`) — importa `@leela/design-system/themes/index.css` em `main.tsx`, e o
  CSS entra no bundle do Vite. **Leva junto os consertos da REV-VITRINE**, que estão construídos
  e revisados e não estão no ar (a DEPLOY-PONTE deixou o painel de fora de propósito).
- **Landing** (`apps/landing`) — `@import '@leela/design-system/themes/brasa.css'` no
  `globals.css`, entra nos chunks de CSS do Next. O deploy da landing das **22:13 de hoje** é
  **anterior** ao commit `8e10ab8f`, então o bundle no ar não tem a declaração — medido, 0
  ocorrências.

**O que a lane de deploy precisa saber:**

- `themes/*.css` são **versionados** (`git ls-files` confirma), então o CSS viaja pelo commit.
- `packages/design-system/dist` é **gitignorado**. **Rodei `tsup` nesta lane** (22:28), depois de
  mexer em `src/theme/generate.ts` e `src/theme/rn-themes.ts`, então nesta máquina o `dist` está
  em dia com a fonte. Em árvore limpa, o `dist` precisa ser construído antes do build dos apps —
  é a mesma armadilha que quase publicou um botão morto pelo `dist` do `@leela/api-client`.
- Nenhuma function tocada. Nenhuma Rule tocada. Nenhum índice novo.

**Como o dono confere, depois do deploy** (jsdom não pinta barra; isto é o que só o olho
resolve):

1. **Painel · lista longa de inscritos** — `/eventos/{slug}/inscritos` num evento com muita
   gente. É a mesma tela que ele já vai abrir para conferir a barra **única** do redeploy de
   06/08. Olhar: a barra vertical à direita, se ela é escura e integrada em vez de cinza-clara.
2. **Landing · qualquer página longa** — a home ou uma página de evento. Mesma pergunta.
3. **De brinde, na mesma passada:** campo de data, `<select>` e o preenchimento automático do
   navegador também mudam de esquema, porque `color-scheme` é herdado. Se algum controle ficar
   estranho, é aqui que aparece.
4. **Windows/Chrome é o ambiente da medição dele.** No macOS a barra é overlay e some quando
   parada, então a diferença é menos visível — não é regressão.

**O que este conserto NÃO resolve, dito claro:** ele não muda onde a barra aparece nem quantas
aparecem. Os dois defeitos de double scrollbar são outros e já estão no ar. Se o dono vir duas
barras de novo, é problema novo, não este.

---

## Fechamento

- **Tempo da lane:** 22:23 → 22:50 (-03), **27 minutos**. Abaixo do limite de 1 hora.
- **Árvore:** limpa de arquivo tracked modificado. Índice vazio. Nada staged herdado.
- **Órfãos:** nenhum processo `java`; os `node` do vitest encerraram com o próprio comando.
- **Commits:** `8e10ab8f` (conserto) e `febf0cc6` (specs/boards), ambos em `origin/main`.
- **Pendência que fica com o dono:** **SCROLLBAR-1** no painel canônico.
- **Recomendação ao maestro:** review antagonista antes do deploy, se houver onda para isso. A
  regra da casa proíbe anunciar fix como resolvido antes dela, e este fix tem alcance herdado
  (todo controle de formulário dos dois apps), o que é mais largo do que a barra que o dono
  reportou.
