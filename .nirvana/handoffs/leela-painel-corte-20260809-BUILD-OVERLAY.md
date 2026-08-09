---
trace: leela-painel-corte-20260809
lane: BUILD-OVERLAY
wave: A
employee: sf-frontend-lead (software-forge)
repo: C:\dev\LEELA
branch: main
head_inicial: 94f47c5e
head_final: 7b55d1b3
data: 2026-08-09
estado: construida — aguarda review antagonista e deploy
itens: [VITRINE-VEU-1, VITRINE-CONTRASTE-1]
cards: [S1242-T1]
---

# BUILD-OVERLAY · handoff vivo

Os dois itens dividem `OverlayConvite.tsx` e andaram juntos numa lane só, como a fila mandou.

## O que a lane recebeu decidido

| Item | Decisão do maestro | Origem |
|---|---|---|
| VITRINE-VEU-1 | adotar o `Modal` do design system no aviso | [[01-decisoes-maestro]] §VITRINE-VEU-1 |
| VITRINE-CONTRASTE-1 | a borda do cartão sobe de `--border-subtle` para `--border-strong` | idem §VITRINE-CONTRASTE-1 |

Nada aqui é escolha minha. O que é meu é onde a borda passa a viver na peça nova, e a prova.

## Estado, sem eufemismo

| | |
|---|---|
| Construído | ✅ os dois itens, commit `7b55d1b3` |
| Revisado | ❌ **nenhuma review antagonista rodou** |
| No ar | ❌ **não** — `apps/painel` não sobe desde 06/08 e este conserto espera o mesmo deploy |

## Linha do tempo

| Hora | Bloco | O que aconteceu |
|------|-------|-----------------|
| T0 | leitura | Persona, fila, registro do maestro e a review REV-VITRINE lidos. `OverlayConvite`, `ContaTravadaGate`, `VitrinePainel`, `primeiraInteracao`, os quatro testes da vitrine, o `Modal` do DS e o `useDialogBehavior` lidos inteiros. Árvore limpa em `apps/painel` e `packages/design-system`. |
| T1 | achado de leitura | O `Modal` do DS **não faz `inert`** (bloco abaixo). O aceite exige `inert`; ele entrou pela lane. |
| T2 | construção | Migração para o `Modal`, `_lib/fundoInerte.ts`, `VitrinePainel` encaminhando `ref`, borda por `className`. |
| T3 | defeito novo, medido | O `Modal` foca o X ao abrir e a **mesma tecla** que sobe o aviso o dispensava. Dois casos de teclado da ordem do dono caindo. Consertado na mesma passada. |
| T4 | gates | `tsc --noEmit` ✅ · `eslint --max-warnings 0` ✅ · 8 arquivos de teste do onboarding, **87 casos verdes** · `vite build` ✅ com medição no `dist`. |
| T5 | aterrissagem | Commit `7b55d1b3`, board e este handoff. **Lane fechou em ~40 min** — abaixo do teto de 1h. |

Sem emulator, sem suíte cheia, sem `--singleFork`. `functions/` e `apps/landing` não foram tocados
(território da lane vizinha).

---

## Achado nº 1 · o `Modal` do DS não faz `inert`

A fila e o brief desta lane dizem que ele faz. Li os dois arquivos e ele não faz.

`Modal.tsx` portaliza para o `body`; `useDialogBehavior` entrega Esc, armadilha de Tab cíclica no
documento, trava de rolagem e retorno de foco. O `aria-hidden` que a review menciona está **no
próprio véu**, não no fundo. `grep -rn "inert"` em `packages/design-system/src` e `apps/painel/src`:
**zero** ocorrências do atributo.

Isso importa porque o aceite da fila é literal: os oito controles do fundo "param de ser
alcançáveis, **incluindo por clique de tecnologia assistiva**". Portal + `aria-modal` não param um
`element.click()` sintético — foi exatamente esse clique que navegou o painel para `/marcas` na
review. `aria-modal` é **sinal**, não trava. O que tira os oito da árvore de acessibilidade é
`inert`.

**Como resolvi.** O `inert` entra pela lane, no gate da vitrine (`_lib/fundoInerte.ts`), e **não**
dentro do `Modal` compartilhado por 26 telas — mudar o `Modal` mudaria o comportamento de 26 telas
sem review, com lane vizinha viva, e não é o que o corte decidiu.

**Fica para o maestro:** subir o `inert` para dentro do `Modal` resolve as 26 telas de uma vez e é
a conversa certa a ter, com review própria. Não é desta lane.

### Onde o `inert` é aplicado, e por quê ali

O alvo tem de conter a **sidebar** — ela desenha seis dos oito controles e vive acima deste gate.
O alvo é o contêiner do app: `#root` em produção, o contêiner do RTL no teste. Os dois são achados
pela mesma propriedade, que é o que o código procura: **ser o filho de `<body>` que contém a
vitrine**. O aviso, portalizado, é **irmão** desse nó e fica de fora por construção, sem exceção
escrita em lugar nenhum. Para ter a âncora sem nó novo no DOM, `VitrinePainel` passou a encaminhar
`ref`.

---

## Achado nº 2 · o foco no X dispensava o aviso na mesma tecla

Defeito **criado pela migração** e consertado nela. O `Modal` foca o botão de fechar ao abrir
(contrato dele, paridade com o Radix). Aqui isso tem um efeito que nenhuma outra tela do painel
tem: o aviso sobe **como resposta a uma tecla**, e a tecla ainda não terminou.

```
[DBG] keydown  activeElement = A "Clubs"          ← a pessoa aperta Enter no menu
[DBG] click    target        = BUTTON "Fechar ✕"  ← o aviso já roubou o foco
[DBG] aviso na tela?         false                ← e a mesma tecla o dispensou
```

Os dois casos de teclado da ordem do dono ("Enter no item de menu" e "barra de espaço num botão")
caíam assim. O desenho original focava o **painel** (`tabIndex={-1}`), que não é acionável por
Enter nem por espaço — era essa a propriedade, e ela voltou.

---

## VITRINE-VEU-1 · o que foi medido

Sonda da review virada teste, em `__tests__/aviso-bloqueia.test.tsx`, no `App` inteiro (a sidebar é
desenhada acima do gate; montar só o gate mediria dois controles e passaria verde com o menu de pé).

| Medição, com o aviso aberto | Antes (review, navegador) | Agora (jsdom) |
|---|---|---|
| dialog portalizado no `body` | não | **sim**, e fora do `<main>` |
| focáveis fora do dialog | 8 | 8 (continuam existindo) |
| **desses, alcançáveis pela AT** | **8** | **0** |
| `body.style.overflow` | `""` | `hidden` |
| região viva (`role="status"`) fora do dialog, não inerte | 1 | **0** |
| Esc / retorno de foco | à mão | do `useDialogBehavior` |

A lista de oito é **nominal** no teste, e bate elemento a elemento com a sonda que a review rodou
no navegador — inclusive o `BUTTON:` sem texto, que é o botão de recolher a sidebar:

```
A:Visão Geral · A:Eventos · A:Clubs · A:CRM · A:Marcas · A:Configurações
BUTTON: · BUTTON:Como receber o código Leela
```

**Falsificação:** a mesma sonda, com o aviso **fechado**, acha os oito. E o caso do meio prova que
o zero não é o painel sumindo: com o aviso aberto os oito **existem** e nenhum é alcançável — a
diferença é exatamente o `inert`.

⚠️ **O que o teste não mede, e não finge medir:** o jsdom não implementa o comportamento do
`inert` — guarda o atributo e não bloqueia clique nem foco. Não existe aqui um caso "o clique
sintético não navega": ele passaria pelo motivo errado hoje. O que se mede é a propriedade que o
navegador consome. **Leitor de tela real continua sendo prova de navegador**, e é do dono/review.

---

## VITRINE-CONTRASTE-1 · os números, do token resolvido, nos dois temas

O `Modal` do DS **não desenha borda** — ele se separa do fundo por `--elevation-3`, e sombra não é
limite medível. A borda entra pelo `className`, que é por onde o `Modal` aceita skin do consumidor.
`--surface-raised` não foi tocada (clarear a superfície é a condição de reabertura do item, e é do
dono).

Medido no CSS que o `vite build` produziu em 09/08 (`apps/painel/dist/assets/index-3PlkfKJK.css`),
com os tokens resolvidos e o véu composto sobre a superfície de base:

| Tema | cartão | velado | borda | borda vs cartão | borda vs velado | cartão vs velado |
|---|---|---|---|---|---|---|
| **brasa** (o que roda hoje) | `#161616` | `rgb(5,5,5)` | `#737373` | **3,82:1** | **4,30:1** | 1,13:1 |
| **wine** | `#FFFFFF` | `rgb(101,100,99)` | `#8A837B` | **3,74:1** | 1,58:1 | **5,90:1** |

Antes, no brasa: cartão contra o velado **1,13:1** e borda `--border-subtle` **1,31:1** — os dois
abaixo do piso de 3:1 da WCAG 1.4.11. Os números batem com os da review, casa decimal por casa
decimal.

**A régua do gate, e por que ela é assim.** No wine o cartão branco já se separa do velado sozinho
(5,90:1): o limite está identificado antes de qualquer borda. Exigir da **borda** um número que a
**superfície** já entrega reprovaria um tema que passa. Então o teste pergunta duas coisas por
tema: (a) a borda se enxerga **sobre o cartão** (senão não é limite, é textura) e (b) o limite do
cartão se separa do véu **por borda ou pela própria superfície**, o que for maior. A falsificação
roda a mesma conta com `--border-subtle` e exige que ela **reprove** no brasa.

Também medido no `dist`: `.border-\[var\(--border-strong\)\]{border-color:var(--border-strong)}`
presente, e **zero** ocorrências de `\/95` (a classe do DEF-C).

---

## O gate do véu seguiu a peça

`veu-buildado.test.ts` lia a classe do véu de `OverlayConvite.tsx` pelo `role="dialog"`. O véu agora
é o `data-testid="modal-overlay"` do `Modal`, e é de lá que a classe é lida — as mesmas cinco
perguntas, sobre a classe que está de fato na tela, **sem afrouxar**. A falsificação do DEF-C
(compilar `bg-[var(--surface-base)]/95` e exigir zero fundo) continua no lugar, e o bloco de temas
que exige alfa real e `--modal-overlay-blur` com comprimento (o elo de `998cea5f`) também.

Como a fonte da classe mudou de arquivo, o gate ganhou **o elo que faltava**: dois casos que exigem
que o aviso **use** o `Modal` e que ele **não volte** a desenhar `role="dialog"` / `aria-modal` à
mão. Sem eles, alguém reescreveria o véu à mão e o arquivo seguiria verde medindo o `Modal` de
outra pessoa. (O cabeçalho do componente cita o defeito com essas palavras, então a medição é feita
sobre o **código**, com comentários removidos — apagar a explicação para o teste passar seria a
troca errada.)

---

## O que a adoção do `Modal` mudou de comportamento, de propósito

Está no registro do maestro como "o ajuste visual da moldura ... porque ela traz cabeçalho e botão
de fechar próprios":

- o aviso ganhou **X** no cabeçalho e **fechar por clique no véu**;
- o título virou `<h2>` do `Modal` (era `<h1>`), e a descrição subiu de `font-size-sm` para `base`
  — mesma cor, mesmos pares de contraste da review;
- largura passou a `--modal-width-sm` (480px; era `max-w-md`, 448px).

As três saídas (X, Esc, clique fora) fazem o que "Continuar olhando" já fazia: **fecham e
rearmam**. Nenhuma dispensa o aviso para sempre. A RN-510 continua inteira: a conta sem código
entra, o aviso sobe na **primeira interação** e não antes, o campo do código Leela segue à mão.

## Armadilha que fica escrita

`onOpenChange` **precisa** continuar memoizado. `useDialogBehavior` tem `onClose` nas dependências
do efeito; uma seta inline nasce nova a cada render, e o `codigo` re-renderiza a cada tecla — o
efeito remontaria por caractere, devolvendo o foco ao abridor (no fundo) e jogando-o no X. É
armadilha do `Modal`, não deste componente: vale para qualquer tela do painel que tenha estado de
formulário no mesmo componente que monta o `Modal`.

---

## Gates rodados

| Gate | Resultado |
|---|---|
| `tsc --noEmit` (painel) | ✅ |
| `eslint src --max-warnings 0` (painel) | ✅ |
| `OverlayConvite.test.tsx` | ✅ 19 casos |
| `veu-buildado.test.ts` | ✅ 13 casos |
| `aviso-bloqueia.test.tsx` (novo) | ✅ 9 casos |
| `contraste-aviso.test.ts` (novo) | ✅ 8 casos |
| `vitrine-interacao.test.tsx` | ✅ 10 casos |
| `vitrine-sem-query.test.tsx` | ✅ 13 casos (inclui o prazo de 12s do crachá) |
| `ContaTravadaGate.test.tsx` + `gate-de-papel.test.ts` | ✅ |
| **`src/routes/onboarding` inteiro** | ✅ **8 arquivos, 87 casos** |
| `vite build` + medição no `dist` | ✅ |

## Para a review antagonista

Vetores que eu atacaria se estivesse do outro lado:

1. **O `inert` mora na lane, não no DS.** É a escolha mais discutível daqui. Argumento contra:
   26 telas seguem sem trava de fundo. Argumento a favor: território e lane vizinha viva.
2. **jsdom não implementa `inert`.** O teste mede a propriedade, não o efeito. Um navegador
   derrubaria ou confirmaria em cinco minutos.
3. **`containerDoApp` sobe até o filho de `<body>`.** Se alguma lane futura portalizar o app para
   dentro de outro nó, ou se o aviso deixar de ser portalizado, a âncora muda de significado.
4. **Fechar por clique no véu é novo.** Se o dono não quiser, é uma prop que o `Modal` não tem.
5. **A régua do contraste aceita que a superfície resolva o limite no wine.** É leitura da 1.4.11,
   e é discutível.
6. **`ATRIBUTO_ISENTO` saiu do nó do dialog** e está no conteúdo: o X e o véu do `Modal` ficaram
   de fora dele. Não muda nada hoje (os ouvintes saem do documento enquanto o aviso está aberto, e
   a captura é de fase de captura, anterior ao `onClick` do React), mas é diferença real.
