# BUILD-MOTION — movimento nos overlays e a unificação do "Entrar"

- **Trace:** `leela-pixreal-diag-20260804`
- **Lane:** BUILD-MOTION (⚔)
- **Employee:** sf-frontend-lead · software-forge
- **Território:** `packages/design-system/**` · `apps/landing/**`
- **Data:** 05/08/2026
- **Base:** `504b5b3a` · **Commits:** `bf93ed51`, `60c50382`, `bf507396`, `8cfe56bb` — todos **já em `origin/main`**

---

## 1. As duas ordens do dono, e o que aconteceu com cada uma

> "todos os modais, overlays, drawers, devem aparecer no sistema, com uma leve
> animação de fade-in, ou sliding, de 800ms, para abrir e fechar (…) a mesma
> coisa para os toast de aviso."

Feito nos cinco primitivos. **A metade que faltava era o fechar**, e a causa é
mais interessante que o pedido: `Modal` e `Drawer` já carregavam
`data-[state=closed]:animate-out` desde o lote A2 e **nunca rodaram um frame**.
O `if (!open) return null` tirava o nó do DOM no mesmo tick em que o consumidor
dizia `open=false` — não existe como animar o que já não existe. O CSS estava
certo há semanas; faltava alguém segurar o nó.

> "O botão de entrar nao deve direcionar para outra página e sim para este modal
> overlay que abre e fecha."

Varredura completa da landing: **seis pontos de entrada de login**. Três já eram
overlay, um foi convertido, dois continuam link — porque são a casa do
organizador, o que a decisão posterior do dono ("podemos deixar separado o
acesso de cliente e o acesso admin mesmo") ratificou. Tabela completa na §5.

> Acréscimo: a logo da Leela no modal de "Entrar".

Feito, em commit separado (`8cfe56bb`). Os CTAs de "primeiro acesso" e "criar
conta" **não** entraram — dependem de fluxos que não existem e estão na
SPEC-CONTAS-LANDING.

---

## 2. O token, e por que ele mora onde mora

| Token | Valor | Onde | Quem usa |
|---|---|---|---|
| `--motion-overlay-duration` | **800ms** | `packages/design-system/tokens/component.json` → grupo `motion` | Dialog, Modal, Drawer, Toast |
| `--motion-menu-duration` | **120ms** | idem | DropdownMenu |

Ele está no **tier `component`, que é COMPARTILHADO entre os dois temas** — e
essa foi a decisão de arquitetura da lane. Os tokens de motion que já existiam
(`--motion-duration-fast/normal/slow`, `--motion-easing-*`) vivem em
`tokens/primitives.brasa.json` **e** `primitives.wine.json`, duplicados. Se eu
tivesse seguido o vizinho, trocar 800ms por 250ms custaria **duas** linhas e um
risco de os temas divergirem. No tier compartilhado custa **uma**:

```
packages/design-system/tokens/component.json  →  "overlay-duration": "800ms"
pnpm --filter @leela/design-system generate-tokens
```

O nome saiu exatamente como o maestro escreveu (`--motion-overlay-duration`), e
não como a família vizinha sugeriria (`--motion-duration-overlay`). Escolhi o
nome do pedido; se a review preferir a simetria com a família, é rename mecânico.

### ⚠️ A recomendação técnica, registrada como pedido

**800ms é o número do dono e está no ar.** Minha recomendação é **200–300ms para
diálogo e toast**, e ela não é estética — é onde o custo aparece:

1. **Dói mais no FECHAR que no abrir.** Ao abrir, a pessoa está esperando algo
   aparecer, e 800ms lê como "chegando". Ao fechar, ela já decidiu ir embora, e
   800ms lê como "travou".
2. **A cortina continua interceptando clique durante a saída** (comportamento do
   Radix, que eu mantive de propósito — ver §3). Com 800ms isso é quase um
   segundo em que um clique na página atrás não passa.
3. **O scroll do body fica travado até o desmonte**, pelo mesmo motivo. Também
   quase um segundo.
4. **O toast é o pior caso**: ele já vive 4s na tela. Somar 0,8s de saída em cada
   "salvo" faz o canto da tela parecer permanentemente ocupado.
5. **O menu já foi excluído por mim**, sem esperar veto: 800ms num
   `DropdownMenu` significa que o item que a mão está mirando ainda está voando
   quando o dedo chega — o clique erra. Daí o token próprio de 120ms.

**A decisão é do dono.** Se ele mantiver 800ms, nada a fazer. Se quiser
experimentar, a troca é a linha acima e não precisa de mim.

---

## 3. O que animou, com que curva, em cada primitivo

| Primitivo | Entrada | Saída | Duração | Easing |
|---|---|---|---|---|
| `Dialog` cortina | fade | fade | overlay | enter / exit |
| `Dialog` painel **mobile** | slide de baixo (100%, bottom-sheet) + fade | slide para baixo + fade | overlay | enter / exit |
| `Dialog` painel **desktop (sm+)** | fade + zoom 95 (slide zerado) | fade + zoom 95 | overlay | enter / exit |
| `Modal` (painel) | fade + zoom 95 | fade + zoom 95 | overlay | enter / exit |
| `Drawer` | slide da borda ancorada + fade | slide de volta + fade | overlay | enter / exit |
| `Toast` | fade + slide de baixo (2) | fade + slide para baixo (2) | overlay | enter / exit |
| `DropdownMenu` | fade + zoom 95 | fade + zoom 95 | **menu (120ms)** | enter / exit |

### A regra da superfície, escrita para não ser reinventada tela a tela

- **A cortina sempre faz fade**, nos dois breakpoints — ela não tem forma, só
  presença.
- **O painel no mobile é bottom-sheet**: o `Dialog` já nasce `items-end`,
  encostado na borda de baixo. Ele sobe de lá. Uma folha que aparece por fade no
  lugar onde o polegar espera um gesto lê como bug de renderização.
- **O painel no desktop é card centrado**: não há borda de onde vir, e deslizar
  faria parecer que ele caiu. Fade + zoom curto — a mesma gramática do `Modal`
  do painel, para as duas superfícies do produto se moverem igual.
- **Superfície que a pessoa LÊ pode demorar; superfície que a pessoa MIRA, não.**
  É a regra que separa o token do overlay do token do menu.

### Decisões de comportamento que a review deve olhar

**O foco volta ao abridor no DESMONTE, não no início da saída.** O
`useDialogBehavior` passou a receber `presente` em vez de `open`, então focus
trap, scroll-lock e retorno de foco acontecem quando o nó sai. É a paridade com
o Radix (`onUnmountAutoFocus`), e o motivo é concreto: devolver o foco no início
da saída deixa a pessoa navegando por cima de um painel que ainda está na tela,
e o Tab entraria num diálogo que já se despediu. **O custo é que com 800ms o
retorno de foco também demora 800ms** — mais um argumento da §2.

**A cortina em saída continua com `pointer-events`.** Não pus
`pointer-events-none` nos três modais: um modal meio transparente que já deixa
clicar no que está atrás promete uma interação que ele ainda está bloqueando.
Radix faz o mesmo. **Exceções deliberadas**: o `DropdownMenu` (120ms, e menu que
engole clique é pior) e o `Toast` em saída (nunca foi superfície bloqueante).

---

## 4. ⛔ `prefers-reduced-motion` — duas metades lendo o mesmo sinal

Isso é critério de aceite, não enfeite, e por isso está montado para não poder
ficar pela metade:

- **CSS**: toda classe de animação dos cinco primitivos é `motion-safe:`. Sob
  `reduce`, nenhuma delas se aplica — não há animação, nem de entrada nem de
  saída. Antes desta lane **só o `Drawer` respeitava isso**; `Modal`, `Toast` e
  `DropdownMenu` animavam para todo mundo, e o `Dialog` não animava para
  ninguém.
- **JS**: `duracaoDeSaidaMs()` devolve `0` sob `reduce` — o nó desmonta no mesmo
  tick, sem espera.

As duas metades leem `matchMedia('(prefers-reduced-motion: reduce)')`. Está
escrito como `Directive:` no commit: mexer numa sem a outra cria overlay que
anima sem esperar (corte no meio do fade) ou que espera sem animar (tela parada
por 800ms). Há teste para os dois lados.

**Degradação sem token**: se a variável não resolve (SSR, jsdom, consumidor que
não importou o tema), a duração é 0 e o comportamento volta a ser o de antes da
lane — desmonte imediato. Preferi perder a animação a arriscar nó preso na tela.

---

## 5. Pontos de "Entrar": convertidos vs mantidos

### Convertidos (acesso de CLIENTE — a landing é a casa dele)

| Ponto | Arquivo | Estado |
|---|---|---|
| Cabeçalho — "Entrar" | `app/components/ContaHeader.tsx` | **já era overlay** (S1221-T1); agora com teste na lista viva |
| Área do cliente deslogada — "Entrar" | `app/(public)/minha-conta/EstadosDaArea.tsx` | **já era overlay**; idem |
| `/definir-senha`, fase `usado` | `app/(public)/definir-senha/DefinirSenhaFlow.tsx` | **CONVERTIDO nesta lane** |

O único que navegava era o terceiro, e ele era o pior dos três: a tela dizia
_"é só entrar com a que você definiu, **pelo botão 'Entrar' no topo da página**"_
e oferecia como única ação um link para a **home**. Ou seja: mandava a pessoa
embora e depois pedia que ela caçasse um botão. É a tela de quem acabou de
queimar o link e **já tem senha** — exatamente quem não deveria ser mandado a
lugar nenhum. Agora a entrada acontece ali.

**Destino pós-login preservado**: o `aoEntrar` chama `destinoPosEntrada()`, o
mesmo ponto único que a fase `concluido` usa. Não inventei uma segunda opinião
sobre onde a pessoa aterrissa — seria a primeira coisa a divergir na próxima
mudança da área do cliente. (O contrato `state.from` é do **painel**
(react-router); na landing o equivalente é `lib/areaDoCliente.ts`, e ele está
intacto.)

### Mantidos (acesso PROFISSIONAL — é outra casa)

| Ponto | Arquivo | Por que é acesso profissional |
|---|---|---|
| Rodapé — "Entrar" → `painelUrl('/entrar')` | `app/components/PublicFooter.tsx` | É a **única porta direta do organizador** na landing. O cabeçalho só tem "Criar conta de organizador" (`/cadastrar`). Converter tiraria a casa dele. |
| Cabeçalho — "Criar conta de organizador" | `app/components/PublicHeader.tsx` | Cadastro de organizador, no painel. Rótulo já explícito. |
| Rodapé — "Criar conta de organizador" | `app/components/PublicFooter.tsx` | Idem. |
| Área do cliente — "Ir para o painel do organizador" | `app/(public)/minha-conta/PortasDaConta.tsx` | Só aparece para conta que **também** organiza (RN-449). Rótulo já explícito. |

#### ⚠️ Uma mudança de rótulo que precisa do olhar do dono

O "Entrar" do rodapé **não virou overlay, mas mudou de nome**: agora é
**"Entrar como organizador"**.

A razão: o que estava errado ali não era o destino, era o rótulo. O grupo se
chama "Organizador" num `aria-label`, **que ninguém VÊ**. Na tela havia dois
links soltos, e um deles era um "Entrar" nu que levava para fora — que é
literalmente o defeito que o dono apontou. Nomeando a porta, a separação que ele
pediu ("deixar separado o acesso de cliente e o acesso admin") fica visível para
quem enxerga, e não só para o leitor de tela.

**Rejeitado**: acrescentar um "Entrar" de cliente no rodapé. O cabeçalho é
sticky e já oferece a porta em qualquer rolagem; seria UI que ninguém pediu.

### Não convertidos, e nem eram candidatos

`convite/ConviteForm.tsx` e `convite/afiliado/AfiliadoConviteForm.tsx` dizem
"entre com seu e-mail e senha" no estado de sucesso, mas **não têm controle de
login nenhum** (só um "voltar"), e a conta que eles criam é de assessoria /
afiliado — que vê as conversões **no painel**. Acesso profissional, nada a
converter.

---

## 6. A logo no modal (`8cfe56bb`)

- **Asset**: `/leela-logo-brasa.svg` — **o mesmo do `PublicHeader`**. Nenhuma
  variante nova, nenhum SVG inventado: a porta de entrada não pode ter uma Leela
  diferente da do cabeçalho que está logo atrás dela.
- **Decorativa** (`alt=""` + `aria-hidden`), e a razão é uma linha: **o nome
  acessível do diálogo já é "Entrar na Leela"**. Um `alt="Leela"` faria o leitor
  de tela anunciar a marca duas vezes seguidas sem acrescentar informação. Por
  não ser gráfico funcional, também não entra no gate 1.4.11 — e o wordmark lime
  sobre `surface-raised` é alto contraste de qualquer forma.
- **Alinhada à esquerda**, com o título e os campos: o `Dialog` alinha o
  cabeçalho à esquerda, e uma marca centralizada sobre um formulário alinhado à
  esquerda cria duas réguas na mesma caixa.
- **Tamanho pela escala** (`h-8`), nunca px cru — o lint de tokens reprovaria.
- **Bottom-sheet do mobile**: 32px numa caixa com scroll próprio e `max-h-85vh`.
  Não muda o comportamento; mesmo assim está na lista de olho humano (§9).

---

## 7. Gates (colados)

```
DS       tsc --noEmit ............................. 0
LANDING  tsc --noEmit ............................. 0
PAINEL   tsc --noEmit ............................. 0   (checagem read-only extra)
eslint packages/design-system/src apps/landing --max-warnings 0 ... 0

SUÍTE DO DS
  Test Files  60 passed (60)
  Tests       1133 passed (1133)
  → base 59/1112. +1 arquivo e +20 testes meus; +1 teste da lane BUILD-LOTES-UX (SubNav).

SUÍTE DA LANDING — 2× SEGUIDAS, ambas verdes
  rodada 1:  Test Files 58 passed (58) · Tests 715 passed (715) · 367.22s
  rodada 2:  Test Files 58 passed (58) · Tests 715 passed (715) · 346.09s
  → base 57/706. +1 arquivo e +9 testes meus.

PAINEL — alvo nos primitivos consumidos (Modal/Drawer/Toast), não a suíte inteira
  Test Files  24 passed (24)
  Tests       178 passed (178)
  → filtro: Modal OverviewShell RootShell InscritoSlideIn ComunicadoEditor
            ConfigGeraisForm ItemKitModal
  → nada quebrou no painel; não precisei parar nem consertar fora do território.

BUILD DO DS (tsup, rodado SOZINHO — nunca em paralelo com a suíte)
  CJS/ESM/DTS ⚡️ Build success
```

### ⚠️ As duas rodadas da landing precisaram de `--no-file-parallelism`, e isso é um achado

Em paralelismo default a suíte da landing **falha de forma não determinística**
nesta máquina: cheguei a ver 48 falhas em 11 arquivos, e todos os arquivos
**passam sozinhos**. A causa não é o código:

- toda falha-raiz é `Test timed out in 5000ms` (ou 20000ms);
- o timeout **pula o `cleanup()`** do arquivo, e o DOM vaza para o caso seguinte
   — daí a cascata de "Found multiple elements" e "There are no accessible
  roles" que infla 10 falhas reais em 48;
- a máquina tem **8 CPUs e 7,9 GB**, e durante as rodadas havia **0,98 a 1,23 GB
  livres** com 10 a 19 processos `node` vivos (outra lane rodando build/teste na
  mesma árvore);
- o tempo de `collect` foi de 684s (verde) a **1586s** (vermelho) na mesma
  suíte, sem mudar uma linha.

Cheguei a suspeitar do meu próprio código e fiz o A/B revertendo o DS para
`504b5b3a` — foi aí que estourou o incidente da §10. **A conclusão correta é
ambiental**, e as duas rodadas sequenciais verdes provam isso. Fica como vetor:
**esta suíte não tem gate de lote confiável em máquina compartilhada**, e o
sintoma (timeout → vazamento de DOM → falhas em cascata em arquivos que nada têm
a ver) é indistinguível de regressão para quem só olhar o resumo.

---

## 8. Arquivos e commits

| Commit | O quê |
|---|---|
| `bf93ed51` | **motion no DS** — token + `usePresencaOverlay` + os 5 primitivos + 20 testes |
| `60c50382` | **unificação do "Entrar"** na landing + a lista viva de pontos |
| `bf507396` | **chore**: destrava o `eslint --max-warnings 0` da landing (ver abaixo) |
| `8cfe56bb` | **logo no modal** + 2 testes |

**Todos já estão em `origin/main`** — foram carregados pelo push de outra lane.
Não empurrei nada: no momento em que fui verificar, o `HEAD` local já tinha três
commits de terceiros (`S1229-T1/T2/T3`) ainda não publicados, e `git push`
levaria o trabalho deles junto sem autorização.

### Novo no DS

- `packages/design-system/src/utils/overlayMotion.ts` — `usePresencaOverlay`,
  `duracaoDeSaidaMs`, `estiloMotion`, `prefereMenosMovimento`, `msDoValorCSS`.
- `packages/design-system/src/utils/__tests__/overlayMotion.test.tsx` — 20 casos.

### Um achado de fora da lane, resolvido em vez de reportado (`bf507396`)

O gate `eslint --max-warnings 0` da landing **já estava vermelho antes de mim**,
desde `dadb10a1`, numa única linha de `test/ingresso-pdf.test.tsx`
(`original<typeof import(...)>()`, anotação de tipo em forma de `import()`,
proibida pela `consistent-type-imports`). Como é o mesmo gate que eu tinha de
apresentar verde, foi junto — em commit próprio, com o achado escrito.

---

## 9. Vetores para a review

1. **A animação em si não está provada por teste** — jsdom não roda keyframes. O
   que os 20 casos provam é o **tempo de vida do nó**, o `data-state`, o
   `motion-safe:` em cada classe e a leitura do token. **A curva e a sensação
   precisam de olho humano no navegador.**
2. **`estiloMotion` escreve `style` inline** (`animationDuration:
   'var(--motion-overlay-duration)'`). Rejeitei classe utilitária de propósito:
   `.animate-in` do preset já fixa `animation-duration` e sobrescrever por outra
   classe dependeria da **ordem de emissão do Tailwind** — empate de
   especificidade resolvido por sorte. O `style` vence sempre e continua 100%
   token (o que está inline é a `var`, não um número). Se a review discordar, o
   caminho alternativo é registrar um utilitário no preset — mas aí o teste de
   ordenação passa a ser obrigatório.
3. **`usePresencaOverlay` ajusta estado DURANTE o render** (padrão oficial do
   React para derivar estado de props). Foi deliberado: com `useEffect`, abrir
   ganharia um frame de atraso e o `Dialog` que hoje aparece na hora passaria a
   piscar.
4. **O portal de `504b5b3a` não regrediu** — os 4 casos de portal do
   `Dialog.test.tsx` seguem verdes, incluindo "desmonta o conteúdo portalizado
   ao fechar (não vaza nó no body)", que agora passa **depois** da animação.
5. **Rótulo do rodapé** ("Entrar como organizador") é a única mudança de **copy**
   da lane. Se o dono não gostar, é uma linha.
6. **Nome do token**: `--motion-overlay-duration` (do pedido) foge da simetria da
   família vizinha `--motion-duration-*`. Rename mecânico se a review preferir.

## 10. ⛔ Incidente de coordenação — assumido

Esta árvore **não** estava com "zero lane em voo". Durante a minha lane
commitaram nela pelo menos BUILD-LOTES-UX (`SubNav` do DS + `apps/painel/lotes`),
SPEC-CONTAS-LANDING, SPEC-METRICAS-SERVICO e S1229 (código de 6 dígitos).

**Dois comandos meus destruíram trabalho verde e não-commitado da lane
BUILD-LOTES-UX:** um `git commit --amend --only` (que reverteu `SubNav.tsx` e
`SubNav.test.tsx` para o HEAD) e o `git stash push`/`pop` que usei para medir o
A/B da §7 (que depois injetou marcadores de conflito nos mesmos arquivos). **A
responsabilidade é minha** — usei escopo amplo numa árvore compartilhada.

- **Estrago do lado deles**: reaplicado e commitado por eles em `fd6e5e69`.
  Comparei o `SubNav.tsx` que ficou no meu stash com o que está no `HEAD`: a
  diferença é **só re-quebra de linha de comentário**, mesma correção. Nada
  perdido.
- **Estrago do lado meu**: **nenhum**. Os quatro commits estão íntegros e em
  `origin/main`; conferi o conteúdo dos arquivos da lane um a um depois do
  incidente (logo, rodapé, definir-senha, os cinco primitivos).
- **Stash removido** depois da conferência, para não deixar armadilha para a
  próxima lane.
- **A partir do aviso do maestro**: nada de `--amend`, nada de `stash`. Só
  `git commit --only` nomeando cada arquivo, com `git status` antes.

## 11. Olho humano depois do deploy

1. ⚠️ **`packages/design-system/dist/` é gitignorado.** Quem deploya **precisa
   rebuildar o DS** antes, senão o bundle sai sem esta mudança e a impressão vai
   ser "não funcionou". Rodei o `tsup` local e ele passa. E **não rode o build do
   DS em paralelo com a suíte** — ele tem `clean: true` e a falha fica
   indistinguível de regressão.
2. **A sensação dos 800ms**, nos quatro consumidores públicos do `Dialog` (login,
   regulamento, kit, aceites) e nos ~26 modais do painel. É a decisão da §2.
3. **O bottom-sheet no aparelho real** (390×844): o slide de 100% da altura do
   painel a 800ms é a animação mais longa do sistema.
4. **A logo no bottom-sheet** — 32px a mais no topo do corpo, em tela pequena.
5. **`prefers-reduced-motion` ligado no SO** (Windows: "Mostrar animações"
   desligado): abrir e fechar tem de ser instantâneo, sem meio-termo.
6. **O "Entrar como organizador" do rodapé** — leitura do dono.
7. **`/definir-senha` com link já usado**: entrar pelo modal e conferir que
   aterrissa em `/minha-conta`. O `window.location.assign` não roda em jsdom;
   este é o único caminho da lane sem prova executável ponta a ponta.
