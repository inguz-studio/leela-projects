# HANDOFF — REV-SCROLLBAR

# ⚔ VEREDITO: **APROVADA COM RESSALVAS**

**O deploy está LIBERADO.** Nada do que achei bloqueia a subida do conserto da cor, nem os
consertos da vitrine (`182d2852`, `1defe563`, `998cea5f`) que viajam junto. O único defeito real
que apareceu vive numa superfície **só de desenvolvimento** (o showroom do DS), foi **consertado
e provado nesta lane** (`ac010722`) e não muda um pixel do que o dono vê.

**Trace:** `leela-retomada-20260808` · **Lane:** `REV-SCROLLBAR` · **Employee:** `sf-qa-engineer`
**Papel:** revisor antagonista, contexto frio
**Repo:** `C:\dev\LEELA` · branch `main` · base `d424ee8c` → HEAD `bc849ccb` (empurrado)
**Alvo:** `8e10ab8f` (conserto) · `febf0cc6` (specs/boards) · `d424ee8c` (handoff)
**Tempo:** 22:53 → 23:38 (-03), **45 minutos**. Abaixo do limite de 1 hora.

---

## Placar em uma tela

| | |
|---|---|
| Vetores atacados | 10 de 10 |
| Alegações da lane que reproduzi | **todas** — 5 contrastes, a polaridade do wine, as duas mutações, a contagem 59+7=66, e o "zero no bundle no ar" |
| Alegações da lane que caíram | nenhuma |
| Defeito real achado | **1** — DEF-S1, no showroom (⚠ pré-existente, amplificado pelo conserto) |
| Defeito pago nesta lane | **1** — `ac010722`, com mutação provada |
| Ressalvas registradas e não pagas | **2**, ambas de desenvolvimento |
| Juízo NOVO do dono | **zero** — e isso é resultado, não omissão (ver §Painel) |
| Suíte do DS | 68 arquivos / 1258 → **69 / 1269** (delta = exatamente o meu arquivo) |

---

## Estado da árvore ao começar e ao terminar

- Ao começar: `git status --porcelain` sem nenhum arquivo **tracked** modificado, índice **vazio**
  (o arquivo alheio `leela-pixreal-diag-20260804-REV-5B.md` já tinha saído pela SEAL-DEFAULTS).
  HEAD `d424ee8c` = origin/main. **0,42 GB de RAM livres de 7,94 GB**, nenhum `java`.
- Ao terminar: árvore limpa de tracked, índice vazio, `pnpm-workspace.yaml` **nunca sujou**
  (conferido antes de cada commit). Nenhum órfão `java`; os `node` do vitest encerraram sozinhos.
- Nenhum `--amend`, nenhum `stash`. Os dois commits saíram com `git commit --only`.

---

## Os dez vetores, um a um

### 1. O alcance herdado — enumerado controle a controle, nos dois apps

Este era o vetor com dinheiro em jogo, e é o que ninguém tinha medido. `color-scheme` é herdado e
governa muito mais que a barra. Enumerei o que existe de fato no fonte dos dois apps e classifiquei
cada um em **imune** (o DS desenha) ou **afetado** (o navegador desenha):

| Cromo | Onde vive | Hoje (esquema claro) | Depois (brasa = dark) | Veredito |
|---|---|---|---|---|
| Caixa de seleção | `Checkbox.tsx:48` — `appearance-none` | DS desenha | igual | **imune** |
| Botão de rádio | `Radio.tsx:190,374` — `appearance-none` | DS desenha | igual | **imune** |
| Chave liga-desliga | `Switch.tsx:61` — `appearance-none` | DS desenha | igual | **imune** |
| Anexar arquivo | `FileInput.tsx:110` — `className="sr-only"`, Button do DS por cima | DS desenha | igual | **imune** |
| Campo de escolha, **fechado** | `Select.tsx:78` — `appearance-none` + `bg-[var(--surface-*)]` | DS desenha | igual | **imune** |
| Campo de escolha, **lista aberta** | `<option>` sem `className` em `Select.tsx:103`, `Field.tsx`, `Combobox.tsx`, `ProvisionTenantModal.tsx:156` | popup **branco**, texto preto | popup **escuro** | **afetado — melhora** |
| Ícone do campo de data/hora | `ConvitesView.tsx:145` (`date`), `EventoForm.tsx:315`, `CampanhaEditor.tsx:391`, `ComunicadoEditor.tsx:259`, `DateTimeField.tsx:93` (`time`) | glifo **escuro** sobre campo escuro (quase invisível hoje) | glifo **claro** | **afetado — melhora** |
| Preenchimento automático | nenhum override no repositório inteiro | fundo azul-claro `#E8F0FE` + texto preto, sobre campo escuro | fundo escuro + texto claro | **afetado — melhora** |
| Caret | `color` já vem de `--text-primary` | claro | claro | **sem mudança** |
| Fundo padrão do documento | `apps/painel/src/globals.css` e `apps/landing/app/globals.css` declaram `html { background-color: var(--surface-base) }` | pintado por nós | pintado por nós | **imune** |
| `<progress>` / `<meter>` | **não existem** no fonte | — | — | **n/a** |

**O susto do formulário de pagamento foi falseado, com evidência.** A hipótese "autofill ilegível
num campo de pagamento" exige uma das duas: um fundo claro de autor sob o controle, ou uma regra
própria de `-webkit-autofill`. Nenhuma das duas existe.

```
$ grep -rn "bg-white|bg-\[#[Ff][Ff][Ff]|bg-\[var\(--neutral-0\)\]|bg-\[var\(--neutral-50\)\]" apps/painel/src apps/landing/app
(zero)
$ grep -rn "autofill|webkit-autofill" apps/ packages/design-system/src   # fora de .next
(só comentários — nenhuma regra de estilo)
```

E as duas polaridades produzem par fundo/texto **coerente entre si**, então não há caminho para
texto ilegível. O `wine` não muda nada aqui: claro hoje, claro depois.

**O que fica para o olho do dono** (não é regressão, é o que ele vai notar além da barra): a lista
aberta do `<select>` no modal de provisionar tenant, o ícone de hora no formulário de evento novo e
nos editores de campanha e comunicado, o campo de data nos convites da plataforma, e o
preenchimento automático no checkout da landing. Endereços registrados na S321-T3 e no SCROLLBAR-1.

### 2. O `wine` é claro — confirmado de forma independente

Não li a tabela da lane: resolvi a cadeia de `var()` do CSS gerado até o valor cru, por conta
própria, e calculei a luminância WCAG dos dois lados.

| Tema | `--surface-base` | `--text-primary` | polaridade real (luminância) | declarado |
|---|---|---|---|---|
| brasa | `#0C0C0C` | `#F9F9F9` | dark (18,58:1) | `dark` ✅ |
| wine | `#FDFAF7` | `#262220` | light (15,16:1) | `light` ✅ |

O `wine` é claro e recebeu `light`, que é o valor certo. **Consumidor que assuma o contrário:
nenhum.** O único consumidor de `wine` hoje é o showroom (painel de comparação, `ThemesPage.tsx`) e
o Storybook, e os dois pintam `bg-[var(--surface-base)]` no wrapper, o que também neutraliza a
regra do CSS de pintar `Canvas` quando um esquema difere do pai e o fundo é transparente.

### 3. Consumidor que fica de fora — **é aqui que estava o defeito**

Varri todo mundo que estampa `data-theme` ou consome os temas:

| Superfície | Como estampa | Recebe a declaração? |
|---|---|---|
| Painel | `main.tsx` → `ThemeProvider theme="brasa"`; antes do mount, `:root:not([data-theme])` | ✅ sempre |
| Landing | `app/layout.tsx:56` — `data-theme="brasa"` estático no `<html>` (SSR) | ✅ antes do primeiro paint |
| Landing · `global-error.tsx` | renderiza `<html data-theme="brasa">` e importa `globals.css` | ✅ |
| Landing · `not-found.tsx` / `error.tsx` | herdam o `<html>` do layout raiz | ✅ |
| Storybook | `.storybook/preview.tsx:15` põe no `<html>`, `storybook.css` importa `themes/index.css` | ✅ (ver ressalva R2) |
| E-mails | **não consomem o DS** — `functions/src/email/identidade.ts:253` já declara `color-scheme: dark` por conta própria, com meta + `<style>` | ✅ independente |
| Páginas de erro do Next (`500.html`) | artefato do próprio Next, com `color-scheme` dele | fora do nosso escopo |
| iframes | **não existem** no fonte dos dois apps | n/a |
| **Showroom do DS** | cópia à mão do script anti-FOUC em `showcase/index.html` | ❌ **DEFEITO** |

#### DEF-S1 — o showroom estampava um tema que não existe · severidade MÉDIA · **PAGO** (`ac010722`)

O showroom é a **única** superfície do repositório que decide o tema sem passar pelo DS: sendo HTML
estático, `showcase/index.html` não importa o TypeScript e carrega uma cópia escrita à mão do
script anti-FOUC. A cópia ficou no nome antigo do tema depois do rename `leela` → `wine`, e errava
**nos dois sentidos**:

```js
// como estava, em d424ee8c
if (t !== 'brasa' && t !== 'leela') t = 'brasa';
document.documentElement.setAttribute('data-theme', t);
```

- **`wine`** — o valor que `setTheme()` grava hoje — não está na lista, cai no fallback e a tela
  nasce `brasa`. O `ThemeProvider` corrige no mount. **Flash, no caminho normal.**
- **`leela`** — ainda em `localStorage` de quem usou o showroom antes do rename — passa no `if` e é
  estampado tal e qual. Não existe bloco `[data-theme="leela"]` em arquivo de tema nenhum
  (`grep -c` = 0 nos três), então a tela nasce **sem token e sem `color-scheme`**, até o
  `readStoredTheme` migrar no mount.

O `ThemeProvider` **já faz** essa migração e **já tem teste dela** (`ThemeProvider.test.tsx:104` e
`:184`). Só a cópia ficou para trás.

**Por que isto é achado desta review, e não ruído antigo:** antes de `8e10ab8f` era um flash de
token. Agora o flash carrega a **polaridade do cromo do navegador** — barra de rolagem clara
piscando sobre o brasa, escura sobre o wine. É o sintoma que o dono reportou, reaparecendo por uma
janela de tempo, exatamente na superfície que a RN-518 nomeou como razão para a declaração nascer no
tema ("senão landing, showcase e Storybook ficam de fora").

**Conserto:** duas linhas espelhando a migração do `ThemeProvider`.

**Trava:** `src/theme/__tests__/showcase-init-theme.test.ts`, 11 casos. Ela **extrai o script real
do HTML e o executa** em jsdom com cinco preferências (ausente, `brasa`, `wine`, `leela`, lixo), e
compara o que ele estampa contra (a) os blocos que `themes/index.css` de fato define e (b) o tema
que o `ThemeProvider` escolherá no mount. Divergência em (b) **é** o flash. Reimplementar a lógica
dentro do teste passaria verde com o HTML errado, que é o defeito — por isso o script é executado,
não copiado.

**Mutação, provada e não alegada:** revertido o `index.html` para a versão de `d424ee8c`, o arquivo
novo derruba **3 casos**, com a mensagem certa em cada um:

```
× preferência leela ⇒ tema com bloco publicado
  → o script estampou data-theme="leela", que não tem bloco em themes/index.css
    — a tela nasce sem token e sem color-scheme: expected [ 'brasa', 'wine' ] to include 'leela'
× preferência wine ⇒ mesmo tema que o mount vai escolher (zero flash)
  → o script pinta "brasa" e o ThemeProvider troca para "wine" no mount
× preferência leela ⇒ mesmo tema que o mount vai escolher (zero flash)
  → o script pinta "leela" e o ThemeProvider troca para "wine" no mount
```

Restaurado o conserto: **11/11 verde**. RN-519 no épico E01.

### 4. `:root:not([data-theme])` vs `[data-theme=brasa]` — especificidade, ordem e flash

- Os dois vivem na **mesma** lista de seletores do mesmo bloco (`themes/brasa.css:1-3`), e são
  **mutuamente exclusivos** por construção: um exige o atributo ausente, o outro exige o valor.
  Não há caminho em que colidam. Especificidade: `:root:not([data-theme])` = (0,2,0);
  `[data-theme="brasa"]` = (0,1,0); `[data-theme="wine"]` = (0,1,0), e o bloco do wine vem **depois**
  no `index.css`, o que só importa se ambos casassem — e não casam.
- **Nenhuma outra declaração de `color-scheme` existe** para disputar a cascata: no fonte dos dois
  apps a contagem é zero, e o preflight do Tailwind (v3.4.19, lido no chunk servido) não declara a
  propriedade.
- **Flash, app por app:** a landing estampa no SSR, antes do primeiro paint — zero flash. O painel
  não estampa no `index.html`, mas casa com `:root:not([data-theme])` desde o parse do CSS e o
  `ThemeProvider` fixa `theme="brasa"`, que é o mesmo bloco — zero flash. **O showroom tinha flash,
  e era o DEF-S1.** O Storybook aplica em `useEffect`, depois da primeira pintura — ressalva R2.

### 5. Valor literal vs `var()` — nenhum `var()` sobrou

```
$ grep -n "color-scheme:[^;]*var(" packages/design-system/themes/*.css src/theme/generate.ts
(zero)
$ grep -n "^  color-scheme:" packages/design-system/themes/index.css
5:  color-scheme: dark;
462:  color-scheme: light;
```

Literais nos dois blocos. O modo de falha silencioso que a lane rejeitou não voltou.

**Buraco latente, de baixa severidade, registrado:** o gerador emite o valor **como o token o
escreve**. Um token futuro escrito como referência (`"scheme": "{algo}"`) seria achatado para
`var(--algo)` e reintroduziria exatamente esse modo de falha. Hoje isso é convenção, não regra
executável — mas o caso de polaridade pega, porque `var(--algo)` não é nem `dark` nem `light`.
Fica coberto para todo tema que esteja na tabela `TEMAS` do contrato.

### 6. Os testes mordem — **oito** mutações minhas, não as duas da lane

Rodei do zero, arquivo a arquivo. Baseline: 15/15 verde.

| # | Mutação | Resultado | Bate com a lane? |
|---|---|---|---|
| M1 | apagar `color-scheme: dark;` de `themes/brasa.css` | **1 falha** | ✅ (a lane disse 1) |
| M2 | apagar `color-scheme: light;` de `themes/wine.css` | **1 falha** | (extra meu) |
| M3 | apagar **só a var** `--color-scheme` de `themes/brasa.css` | **0 falhas** | ⚠ **ressalva R1** |
| M4 | trocar o token `color.scheme` `dark`→`light` | **3 falhas** (gerador, var, polaridade) | ✅ (a lane disse 3, e são estas três) |
| M5 | `index.css` perde o `color-scheme` do bloco wine | **1 falha** | (extra meu) |
| M6 | gerador volta a carimbar literal `'dark'`, ignorando o token | **4 falhas** | (extra meu) |
| M7 | **probe decisivo** — token `light` **+** `TEMAS.esperado` `light`, para neutralizar todo caso que só compara o token contra a tabela do próprio teste | **polaridade REPROVA sozinha** | ✅ |

O M7 é o que importa, porque a lane confessou ter corrigido esse exato caso durante a construção.
Neutralizei a tabela do teste e ele ainda reprova, com a mensagem lendo as cores reais:

```
AssertionError: tema declara "light" mas pinta superfície #0C0C0C com texto #F9F9F9
```

**A correção da lane é real: o caso de polaridade não é tautológico.**

Todas as mutações revertidas com `git checkout --`, e `git status --porcelain` conferido vazio
depois de cada uma.

### 7. O que não podia ter quebrado — provado por diff e por suíte

- `git diff b6ddc017 d424ee8c -- packages/design-system/src/utils/scroll.ts` são **+10 linhas, todas
  de comentário**. Nenhuma constante tocada.
- `SCROLL_X_ONLY_SEM_CROMO` segue com `[scrollbar-width:none]` e `[&::-webkit-scrollbar]:hidden`;
  `SCROLL_X_ONLY` segue **sem** `scrollbar-width`, porque na matriz de kits a barra é a única pista
  de que há mais coluna.
- Suítes re-rodadas do zero: `utils/__tests__/scroll.test.ts`, `utils/__tests__/scrollTrava.test.tsx`,
  `components/AppShell/__tests__/AppShell.test.tsx`, `theme/__tests__/**` → **10 arquivos,
  646/646**. No painel: `ScrollDaPagina.test.tsx`, `EventoShell.test.tsx`, `veu-buildado.test.ts`
  → **3 arquivos, 32/32**.

### 8. A regra de lint sobreviveu

`git diff b6ddc017 d424ee8c -- eslint.config.mjs tools/ scripts/` é **vazio**, e
`packages/design-system/lint/leela-scroll-plugin.mjs` não aparece na lista dos 14 arquivos dos três
commits. A regra segue `"error"` em `eslint.config.mjs:109`. O teste dela: **21/21**. E o lint dos
quatro arquivos tocados fecha em **0**.

### 9. As duas causas anteriores da double scrollbar não reabriram

`f2398e36` (eixo solto no showroom) tocou `eslint.config.mjs`, `showcase/src/App.tsx` e o
`package.json` do DS. `a06c16d4` (`.sr-only` absoluto) tocou `RootShell.tsx`, `ScrollDaPagina.test.tsx`,
`AppShell.tsx` e `AppShell.test.tsx`. **Interseção com os 14 arquivos desta rodada: vazia.** As duas
suítes de regressão rodaram verdes (item 7).

E o argumento de mecanismo, que é o que realmente responde: `color-scheme` é propriedade de
**pintura**, não de **layout**. Ela não muda largura de barra, não cria bloco de contenção e não
promove eixo nenhum a `auto`. As duas causas anteriores eram de layout. Não há caminho para
reabertura. **Se o dono vir duas barras de novo, é problema novo.**

### 10. SCROLLBAR-1 — os cinco números recalculados, e os cinco batem

Script próprio: lê `themes/index.css`, resolve a cadeia de `var()` até o primitivo, aplica a
luminância da WCAG 2.1 e o piso de 3:1 da 1.4.11 (elemento de interface não-texto).

| Candidato | brasa (meu) | brasa (lane) | wine (meu) | wine (lane) | bate |
|---|---|---|---|---|---|
| `--border-default` `#383838`/`#D8D1C8` | **1,67:1** | 1,67 | **1,46:1** | 1,46 | ✅ |
| `--border-strong` `#737373`/`#8A837B` | **4,13:1** | 4,13 | **3,60:1** | 3,60 | ✅ |
| `--text-tertiary` `#999999`/`#6E6862` | **6,87:1** | 6,87 | **5,29:1** | 5,29 | ✅ |
| `--primary-500` `#FF450C`/`#7A1520` | **5,69:1** | 5,69 | **10,33:1** | 10,33 | ✅ |
| trilho `--surface-sunken` `#0A0A0A`/`#F5F1EC` | **1,01:1** | 1,01 | **1,08:1** | 1,08 | ✅ |

Cinco de cinco, casa decimal por casa decimal. **O item que o dono vai decidir está com os números
certos.** Acrescentei uma sexta medição que faltava para a alternativa do trilho:
`--surface-raised` dá **1,08:1** no brasa e **1,04:1** no wine — ou seja, a saída "subir para
`--surface-raised`" que o item sugere **também não dá trilho visível**; se a barra for estilizada, o
trilho tem de ser transparente. Registrado aqui, não no painel: não muda a decisão dele, muda a
execução de quem construir.

Um detalhe que checo antes de deixar passar: `--border-default` a 1,67:1 é o **token de borda
padrão do DS inteiro**, não só um candidato a polegar. Fui olhar se isso é achado maior — não é. Os
controles do produto usam `--border-strong` ou `--input-border-flat`, não o `--border-default`
(exemplo: `ProvisionTenantModal.tsx:154`), e a borda padrão faz separação decorativa entre
superfícies, que não está sob a 1.4.11. **Não abre pendência.**

---

## Ressalvas — registradas e NÃO pagas

Nenhuma alcança o dono; as duas são de desenvolvimento e ficam escritas para não sumirem.

**R1 · apagar só a var `--color-scheme` do CSS publicado não derruba teste nenhum** (mutação M3).
O caso que protege a var (`color-scheme.test.ts:110`) mede o **gerador em memória**, não o arquivo.
A lane afirma que "a var continua emitida junto — é dela que uma barra estilizada se serviria"; essa
promessa vale para o gerador e não vale para o arquivo commitado. Não paguei porque nada consome a
var hoje e o buraco fecha sozinho no dia em que SCROLLBAR-1 for decidido pela estilizada — que é
justamente quando a var passa a ter consumidor. **Quem construir a estilizada trava a var no
arquivo, não só no gerador.**

**R2 · o Storybook aplica o tema depois da primeira pintura.** `.storybook/preview.tsx:14` usa
`useEffect`, não script inline no `<head>`. Existe um quadro de brasa antes do wine, e desde
`8e10ab8f` esse quadro carrega a polaridade do cromo. É pré-existente, é de desenvolvimento, e o
conserto certo é o mesmo do DEF-S1 (estampar antes do paint). Não paguei porque o Storybook não tem
alvo de Hosting e o custo/benefício não fecha nesta onda.

---

## Lacuna de gate da lane construtora — checada e sem mordida

A lane rodou DS, painel e landing. **Não rodou `functions`** — e `functions/src/__tests__/emailIdentidade.test.ts`
é o único consumidor de `themes/brasa.css` fora do DS: ele lê o arquivo, resolve a cadeia de `var()`
e reprova se algum literal de e-mail divergir do token. Uma linha nova que não começa com `--` no
meio do bloco poderia ter quebrado o parser.

Rodei: **167/167 verde**. O parser é `/^\s*(--[a-z0-9-]+):\s*([^;]+);/gim`, ancorado em `--`, então
a declaração nova é ignorada e a var nova entra no mapa sem consumidor. **Sem mordida — mas a lane
não sabia disso, e não podia saber sem rodar.**

---

## Gates desta lane, todos re-provados do zero

| Gate | Comando | Resultado |
|---|---|---|
| DS tipos | `./node_modules/.bin/tsc --noEmit` | **0** |
| DS lint | `/c/dev/LEELA/node_modules/.bin/eslint src showcase/src --max-warnings 0` | **0** |
| DS suíte cheia | `./node_modules/.bin/vitest run` | **69 arquivos · 1269/1269** · 41,7s |
| Lint dos 4 arquivos do alvo | `eslint … --max-warnings 0` | **0** |
| Regra de rolagem | `vitest run lint/__tests__/leela-scroll-plugin.test.mjs` | **21/21** |
| Regressão de rolagem (DS) | 10 arquivos | **646/646** |
| Regressão de rolagem (painel) | 3 arquivos | **32/32** |
| Consumidor externo | `functions` · `emailIdentidade.test.ts` | **167/167** |

Sem `--singleFork`. Nenhum `emulators:exec`. `tsup` **não** rodou e não precisava: os dois arquivos
que toquei são `showcase/index.html` (app vite separado) e um `__tests__`, e nenhum é entrada do
`tsup`. O `dist` que a lane anterior construiu às 22:28 continua em dia com a fonte.

---

## Painel de decisões — por que NÃO nasceu item novo

A review não produziu juízo novo do dono, e isso é resultado medido, não omissão:

- O **alcance herdado** não pede escolha, pede olho. Virou linha do SCROLLBAR-1 (com os endereços) e
  tarefa S321-T3 no kanban. Abrir um SCROLLBAR-2 seria pendência inventada.
- O **DEF-S1** é técnico e foi pago.
- As **duas ressalvas** são de desenvolvimento e não são decisão de produto.
- O **`--border-default` a 1,67:1** foi investigado e descartado como achado maior.

O painel continua em **66** (59 + 7), conferido contando os `###` de cada seção entre as linhas
exatas dos `##`, não de memória.

---

## Commits desta lane

| Commit | O quê |
|---|---|
| `ac010722` | `fix(ds)` — DEF-S1: o showroom para de estampar um tema que não existe. 2 arquivos, +120/−1 |
| `bc849ccb` | `docs(specs)` — RN-519 no E01, alcance medido no SCROLLBAR-1, veredito nos dois boards. 4 arquivos, +34/−4 |

Empurrados: `d424ee8c..bc849ccb` em `origin/main`.

---

## Para a lane de deploy — o que fica valendo

1. **Está liberado.** O veredito não segura nada. Sobem juntos o conserto da cor (`8e10ab8f`) e os
   três da vitrine (`182d2852`, `1defe563`, `998cea5f`).
2. **Painel E landing, os dois** — a lane construtora está certa, e eu confirmei a âncora dela:
   o bundle da landing servido hoje (`.firebase/leela-landing/hosting/_next/static/css/*.css`) tem
   **0 ocorrências** de `color-scheme` nos três chunks, com `--surface-base` presente em dois. O CSS
   do tema chega lá; a declaração não estava nele.
3. **`packages/design-system/dist` é gitignorado.** Nesta máquina está em dia (`tsup` da lane das
   22:28). Em árvore limpa, `tsup` antes do build dos apps.
4. Nenhuma function, Rule ou índice tocado por esta lane nem pela anterior.
5. **Não anunciar a barra como consertada antes do deploy.** A double scrollbar já foi cobrada
   quatro vezes, e a quarta foi por um fix que existia e dormia sem subir.

## Para o olho do dono, depois do deploy

Windows/Chrome, que é o ambiente da medição dele. jsdom não pinta barra de rolagem — nada aqui
prova o pixel.

1. **Painel · `/eventos/{slug}/inscritos`** num evento com muita gente: a barra vertical à direita,
   se é escura e integrada em vez de cinza-clara. É a mesma tela da conferência da barra **única**.
2. **Landing · qualquer página longa.** Mesma pergunta.
3. **Na mesma passada, o que a review mediu que muda junto:** a lista aberta de um campo de escolha
   (modal de provisionar tenant), o ícone do campo de hora (evento novo, editor de campanha, editor
   de comunicado), o campo de data (convites da plataforma) e o preenchimento automático (checkout
   da landing). Os quatro passam de claro para escuro. Pela medição isso é melhora, não regressão —
   mas é o que ele vai notar além da barra.
4. **macOS não serve de contraprova:** lá a barra é overlay e some quando parada.
