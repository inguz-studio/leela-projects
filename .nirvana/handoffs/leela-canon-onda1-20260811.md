# Onda 1 do roadmap de componentes — o caminho do dinheiro para de reescrever o design system

**Trace** `leela-roadmap-componentes-20260810` · lane **ONDA-1** · branch `canon-onda-1`
**Worktree** `C:\dev\leela-wt-onda1` (criado sobre `origin/main` @ `77605958`, a Onda 0 já dentro)
**Data** 2026-08-11 · sf-frontend-lead (software-forge)

Paga a **Onda 1** de `02-rodadas/2026-08-11-roadmap-componentes/04-ondas-roadmap.md` — a onda do
checkout, primeira da fila por JTBD (`§04.1` *"Descubro evento → me inscrever em poucos cliques"*)
e por carga (16 dos 20 passos de arquitetura medidos no produto inteiro estão nesta superfície).
Ancora na história **S005** do épico `LEELA-E01-design-system`. **Nenhum deploy.**

---

## 1 · O placar

### A catraca do gate, antes → depois

| Contagem | antes | depois | Δ |
|---|---|---|---|
| `superficie-crua.landing` | 27 | **6** | **−21** |
| `botao-cru-estilizado.landing` | 5 | **0** | **−5** |
| `controle-cru-fora-do-ds.total` | 4 | **3** | **−1** |
| `superficie-crua.painel` | 107 | 107 | — (não é desta onda) |
| `botao-cru-estilizado.painel` | 6 | 6 | — |
| `receita-de-grid` (painel/landing) | 23 / 9 | 23 / 9 | — (layout composto segue retido em CANONE-1) |
| `padrao-reimplementado-fora-do-ds.total` | 2 | 2 | — (as duas são Onda 2 e Onda 4) |

**A dívida herdada encolheu de verdade, e o gate provou isso sozinho.** A camada A acusou a entrada
**MORTA** de `ShareBlock.tsx` na lista do `eslint.config.mjs` no minuto seguinte à conversão do
`<input readOnly>`, com o texto *"já foi paga, tire a linha"*. A linha caiu no mesmo commit. É o
primeiro ciclo completo do mecanismo que a Onda 0 construiu, e ele funcionou sem ninguém lembrar de
conferir. A lista da Regra 1 fica agora com **um** arquivo, do painel, que a Onda 3 paga.

### As divergências convertidas, por família

| Família | Convertidas | Para |
|---|---|---|
| Superfície reconstruída à mão | **38** em 24 arquivos | `Card` de `@leela/design-system/server` |
| CTA replicando variante publicada | **6** | `buttonVariants` de `/server` (5) + a receita `ctaStyles.ts` do próprio app (1) |
| `<input readOnly>` cru (`ShareBlock.tsx`) | **1** | `Input`, pelo boundary `_ds/ds.ts` |
| **Total** | **45** | |

**O total da onda no documento é 64; convertidas, 45. As 19 de diferença estão contadas uma a uma
na §3, e nenhuma delas é trabalho que ficou para trás.** Seis são CTA que a leitura dirigida
classificou como botão e são `<span>` informativo; treze são superfície que não é `Card`. Forçá-las
teria produzido regressão visual na tela onde um desconhecido decide gastar dinheiro — viram lacuna
de cânone com arquivo e linha, que é o destino que a L-021 prevê para padrão sem canônico.

### A medição anti-carga

| Tela | Passos antes | Passos depois | Passos de arquitetura antes | depois |
|---|---|---|---|---|
| checkout público (caminho PIX), evento de modalidade e kit únicos | **16** | **14** | **3** | **2** |

O alvo publicado da onda era 13 contando só a auto-seleção. **Chegou a 14, e o número publicado
estava otimista por um motivo que a execução revelou:** o documento contava a auto-seleção como
"derruba 2 passos" (modalidade + kit) e, no mesmo parágrafo, dizia que o alvo era 13 — isto é, 16
menos 3. Os dois cliques que somem são dois, não três. **14 é o número certo**, e ele vai a **12**
se a decisão do endereço liberar (CKENDERECO-1, §5).

Os outros dois passos de arquitetura seguem de pé **por decisão, não por omissão**: os dois textos
estão prontos no formato do painel do dono em
`02-rodadas/2026-08-11-roadmap-componentes/06-decisoes-checkout-onda1.md`.

---

## 2 · O que mudou, item por item

| # | Grupo | Commit |
|---|---|---|
| 1 | Checkout e página de inscrição — 12 superfícies → `Card` | `2d5bfc5f` |
| 2 | Landing pública — 26 superfícies, 6 CTAs, 1 controle; entrada morta do lint removida | `f8a75d32` |
| 3 | Auto-seleção de opção única + 5 casos de teste | (ver commit da fila) |
| 4 | Baseline do gate, decisões do dono, boards | (ver commit da fila) |

### O padrão da conversão, e a regra que ele criou

Toda superfície entrou por `@leela/design-system/server` — a entrada server-safe e **Radix-free**
que o ADR-017 exige na landing. Nada puxou o barrel completo. O `Input` do `ShareBlock` entrou pelo
boundary de cliente único (`app/_ds/ds.ts`), que é o padrão da casa para controle com hook: o
`Input` usa `React.useId` e por isso **não pode** entrar no `server.ts`, cujo contrato é zero hook.

**Procedência, não redesenho.** As conversões preservam o tom de borda de cada instância
(`border-border-subtle` onde ele estava) e as tintas semânticas (`feedback-success-surface`,
`feedback-warning-surface`). O que as instâncias ganham do `Card` é a identidade canônica que elas
não tinham: `shadow-elev-1`, `[backdrop-filter: var(--card-blur)]` e `text-card-foreground`. Esse é
o delta visual da onda, e ele está isolado na §4 para a conferência renderizada.

Duas regras nasceram da execução e valem para as ondas 2 a 5:

- **`<li>` vira `<li><Card>`, nunca `<Card>` solto dentro de `<ul>`.** O `Card` renderiza `<div>`,
  e `<div>` filho direto de lista quebra a semântica de lista. Onde o `<li>` era o item de grade,
  ele fica com `className="flex"` e o `Card` com `flex-1`, para os cartões seguirem com altura
  igual na linha.
- **`<section aria-label>` que virar `Card` leva `role="region"` junto.** Um `<div>` com
  `aria-label` e sem `role` não é landmark nenhum — a conversão silenciosa apaga um marco de
  navegação de leitor de tela. Aconteceria em `AceitesCompra.tsx` se ninguém olhasse.

### A auto-seleção (passo de arquitetura nº 2 — o "código de meia hora")

`StepModalidadeKit.tsx` ganhou um efeito: quando a lista de modalidades tem **exatamente um** item
e ele tem lote vigente, a modalidade entra sozinha; quando a modalidade escolhida oferta
**exatamente um** kit, o kit entra sozinho. O controle continua na tela, visível e alterável — o
que some é a obrigação de confirmar o óbvio.

Três decisões dentro dessa meia hora, todas comentadas no código:

- **Literal em `length === 1`, nunca "a única disponível entre várias".** Três modalidades com duas
  esgotadas ainda desenham uma paisagem que a pessoa precisa ver; escolher por ela ali esconderia o
  esgotamento em vez de poupar um passo.
- **Opção única sem lote vigente não é selecionada.** O `RadioCard` dela entra desabilitado e o
  servidor recusaria o valor — auto-selecionar travaria o fluxo num estado inválido.
- **A fronteira com a RN-440/D-ACH-12 está escrita.** Lá a pré-seleção da forma de pagamento
  dispara `createInscricaoCharge` e faz nascer pedido, pagamento e inscritos PENDENTES no servidor;
  aqui o patch é estado de formulário e o único efeito remoto possível é a **cotação**, que é
  leitura e cujo resultado a pessoa queria de qualquer jeito. As duas regras não se contradizem:
  uma protege contra cobrança sem gesto, a outra tira o gesto que não protege ninguém.

Teste em `apps/landing/test/checkout-onda1-opcao-unica.test.tsx`, 5 casos. Um deles conta os
patches emitidos e trava em dois: **auto-seleção que re-dispara a cada render é laço, não
conveniência**, e sem essa asserção o defeito passaria verde.

---

## 3 · As 19 instâncias que NÃO viraram `Card` nem `Button` — e por quê

Esta seção existe para que a diferença entre 64 e 45 não vire silêncio. Treze são superfície e seis
são CTA. Cada grupo tem arquivo e linha, e cada um é candidato nomeado à **CANONE-1**.

### 3.1 · Placa e painel recuado — o `Card` tem elevação, e estes não têm (6)

O cânone §4 diz *"Superfície com **elevação** é `Card`"*, e o `Card` entrega isso literalmente:
`shadow-elev-1` + `card-blur`. Estas seis vivem em `surface-base`, `surface-sunken` ou
`surface-overlay` — são superfícies **recuadas**, e pôr sombra de elevação nelas seria mentir sobre
a profundidade na tela do dinheiro.

| arquivo:linha | O que é | Fundo |
|---|---|---|
| `checkout/PixCobranca.tsx:117` | placa atrás do QR do PIX | `surface-base` |
| `checkout/KitDetalhe.tsx:55` | painel do kit dentro da etapa de seleção | `surface-sunken` |
| `checkout/StepResumo.tsx:324` | bloco de totais | `surface-sunken` |
| `ingresso/[token]/IngressoView.tsx:96` | placa atrás do QR do ingresso | `surface-base` |
| `ingresso/[token]/IngressoView.tsx:112` | placa do código do ingresso | `surface-base` |
| `[eventSlug]/ShareBlock.tsx:37` | placa atrás do QR de compartilhar | `surface-overlay` |

**Lacuna nomeada:** o `Card` não publica variante de superfície (`raised` × `sunken` × `inset`) nem
de raio. Enquanto não publicar, painel recuado não tem canônico e a instância não viola nada.

### 3.2 · Pílula informativa de contorno — o `Badge` do brasa perdeu o `outline` do stock (5)

O documento da Onda 0 previu que boa parte das 12 "CTA replicando variante" da landing eram
`<span>`, *"ou seja, `Badge`/`Chip` reescrito"*. A leitura no código diz que são `<span>` — e que
**não são `Badge` nem `Chip`**:

- o `Badge` do brasa é **10px, UPPERCASE, preenchido, com tracking** (`--badge-*`), e as pílulas
  são 14px, caixa normal, transparentes com contorno;
- o `Badge` publica seis variantes semânticas (`brand`, `heroico`, `vulcao`, `vitoria`, `alerta`,
  `neutro`) e **nenhuma `outline`** — a esteira shadcn→brasa dropou a variante `outline` do stock;
- o `Chip` responde a clique; estas não são interativas.

Converter teria redesenhado a lista de modalidades do hero. As cinco: `sections/HeroSection.tsx:94`
· `sections/HeroMinimo.tsx:57` · `sections/KitsSection.tsx:58` · `_perfil/PerfilView.tsx:84` ·
`components/PublicHeader.tsx:84` (o placeholder "Baixar o app").

**Lacuna nomeada, e ela tem conserto barato:** devolver ao `Badge` a variante `outline` do stock
shadcn resolve as cinco de uma vez, com AA a provar. É o item mais bem definido que esta onda manda
para a CANONE-1.

### 3.3 · Cartão navegável e cartão de domínio (2)

- `_perfil/PerfilView.tsx:123` — o cartão de evento clicável é um `<a>` com a anatomia do cartão. O
  `Card` do DS não tem `asChild` (seria Radix Slot, que o ADR-017 barra na landing), então não há
  como o `Card` **ser** a âncora. Fica como está, e é o mesmo buraco que o painel vai encontrar.
- `_perfil/SecaoFeed.tsx:66` — `<article>` de post do feed. É cartão de **domínio**, a família que
  a CANONE-1 já carrega (§5 do cânone: clube, comunicado, campanha, parceria, afiliação — some-se
  publicação).

### 3.4 · Selo de data vertical (1)

`_perfil/PerfilView.tsx:100` — o marcador dia/mês da timeline. O `DateBadge` do DS é uma pílula
**horizontal** com dot "ao vivo" (`.date-badge` do mockup); não é a mesma peça. Lacuna.

### 3.5 · Ratificados pelo ADR-017, fora do alvo por escrito (1 dos 12 CTAs)

`[eventSlug]/ctaStyles.ts`, `sections/marca.tsx` e `checkout/tipografia.tsx` seguem como composição
de app — o próprio documento da onda os exclui. O que mudou é que a **duplicata** do `ctaStyles.ts`
morreu: o CTA da home reescrevia a receita classe por classe e agora a importa.

### 3.6 · As quatro que nenhum detector reproduz

A §5 do inventário conta **51** superfícies na landing por leitura dirigida. Somando o que foi
convertido (38) com o que as §3.1 a §3.4 nomeiam (6 + 1 + 1 + 1 = 9), chega-se a 47. **As outras
quatro não são reproduzíveis por medição**: nem o detector do gate nem uma varredura própria mais
larga (raio + fundo OU borda, sem exigir espaçamento) as encontra, e a hipótese mais provável é
contagem dupla por aninhamento na leitura dirigida — cartão dentro de cartão contado nos dois
níveis.

Registro em vez de estimativa: **quatro instâncias do número 51 não têm arquivo e linha atrás.** A
régua que fica é a do gate, que mede **6** restantes na landing — exatamente as seis da §3.1 — e é
a única das três com catraca.

---

## 4 · O delta visual, para a conferência renderizada

**Esta lane não subiu navegador.** A L-019 e o critério de aceite comum das ondas pedem prova
renderizada nos dois temas, e o brief desta lane não a inclui na lista de gates. Fica **pendente
declarada**, e é o item que eu levantaria antes de qualquer deploy. O que olhar, e onde:

1. **`shadow-elev-1` + `card-blur` em 38 superfícies da landing.** Nenhuma delas tinha sombra
   antes. É o delta de maior alcance e o mais provável de gerar opinião do dono.
2. **Os cinco CTAs de contorno** (`DefinirSenhaFlow`, `PublicHeader`, `PainelIngressos`,
   `PortasDaConta`, `AvisoPedidoEmConfirmacao`): a receita do DS troca a borda de repouso de
   `border-default` para `border-strong` e o hover de "borda mais forte" para o **tint de marca**
   (`--action-brand-tint`, par já provado em `contrast.test.ts`). A altura passa a ser a do
   `--btn-height-sm`. A **pílula foi preservada** com `rounded-ds-pill` explícito — o
   `--btn-radius` é `--radius-sm` (6px) e converter sem override transformaria toda pílula pública
   em retângulo, que é identidade de marca e não decisão de lane.
3. **O botão "Copiar link" do `ShareBlock`** passa de `action-secondary` (neutral-800) para a
   variante `neutral` do `Button` (`surface-high`, neutral-750) — um degrau da escala, hover igual.
4. **O campo de link do `ShareBlock`** passa de `surface-base` + `border-default` para o `Input`
   flat da casa (`surface-sunken` + `--input-border-flat`).
5. **O CTA "Ver eventos" da home:** zero delta esperado — a receita importada é a mesma que estava
   escrita à mão.

---

## 5 · O que sobe para o dono

Os **dois** passos de arquitetura que não são conserto de frontend, escritos no formato do painel
(caso de uso + job story + o que fica com você + por que agora + opções com default + onde
aterrissa), em
`leela-specs/02-rodadas/2026-08-11-roadmap-componentes/06-decisoes-checkout-onda1.md`:

- **CKENDERECO-1** — o checkout cobra endereço completo de quem vai retirar o kit no balcão. Os
  cinco campos reprovam o avanço (`validacao.ts:109-125`) e nada no fluxo despacha nada pelo
  correio. Default proposto: escrever a exigência como RN e mostrá-la na tela. Libera 2 passos se a
  resposta for "não há exigência".
- **CKPIX-1** — quem paga o PIX pelo aplicativo do banco não descobre que pagou (RN-470, v1 sem
  `onSnapshot` nem polling). Default proposto: polling curto com a aba visível enquanto a cobrança
  está viva.

**Nenhum comportamento dos dois foi tocado.** O endereço continua obrigatório e o PIX continua
pedindo o clique.

---

## 6 · Gates

Rodados em série, no worktree, sem background deliberado.

| Gate | Resultado |
|---|---|
| `apps/landing` · `tsc --noEmit` | ✅ |
| `apps/landing` · `eslint --max-warnings 0` | ✅ |
| `apps/landing` · suíte completa | ✅ **818 casos, 62 suítes** — 813/61 na execução serial + o arquivo restante verde isolado (§6.1) |
| `gate-canon` (camadas A e B) | ✅ com baseline regravado no mesmo commit |
| `generate-tokens` 2× | ✅ idempotente |
| painel | não tocado — nenhum arquivo de `apps/painel` neste diff |

### 6.1 · Nota de contenção — como esta lane separou flakiness de regressão

O brief avisava de duas lanes vizinhas vivas. Ao longo da execução o número subiu para **cinco
worktrees** na mesma máquina, e a suíte da landing virou um instrumento barulhento. O registro,
porque a próxima onda vai passar por isto:

| Execução | Paralelismo | Falhas | O que era |
|---|---|---|---|
| A | padrão do vitest (~10 workers) | **150** | contenção |
| B | `test:gate` (3 workers) | **9** | 2 regressões reais + 7 de contenção |
| C | `test:gate` (3 workers), já com 5 worktrees vivos | **57** | contenção |
| D | `--maxWorkers=1` (serial) | **5** (1 arquivo) | contenção — o arquivo passa 6/6 sozinho |

**O veredito da lane.** A execução serial fecha em **813 de 818 casos** e **61 de 62 suítes**; o
único arquivo vermelho (`checkout-ckux-rev-cotacao.test.tsx`) passa **6/6** rodado sozinho, no mesmo
commit. Somando, **as 62 suítes foram observadas verdes nesta árvore** — nenhuma ficou sem
veredito, e nenhuma falha sobreviveu ao isolamento.

**O procedimento que funcionou** é o que o brief prescreve: re-rodar sozinha. Cada arquivo que
falhou na execução C foi re-executado isolado ou em lote pequeno — **todos verdes** (as quatro
suítes de `minha-conta` juntas: 97/97; as dez de checkout em dois lotes: 42/42 e 25/25).

**Uma armadilha que quase me enganou, e vale mais que o resultado.** Para provar que as falhas de
`minha-conta` não eram minhas, troquei os dois arquivos que tinha tocado pelas versões da main e
rodei o mesmo lote: passou. Conclusão aparente — a regressão era minha. **Era controle inválido:**
ao restaurar os meus arquivos e repetir, passou também. A variável que eu pensava estar isolando não
era a única que tinha mudado entre as duas medições; a carga da máquina tinha. Controle que roda em
instante diferente não é controle, e num ambiente com cinco lanes vivas essa é a diferença entre
consertar um defeito e reverter trabalho bom.

**As duas regressões reais** (execução B) estão consertadas no commit `64be6b70`: duas fixtures
tinham UMA modalidade, e a auto-seleção passou a preencher justamente o que elas precisavam ver em
branco. As fixtures ganharam uma segunda modalidade; nenhuma asserção foi afrouxada.

**O teste morto morreu de verdade.** `build-frescor-dist.test.ts` fazia `pnpm test` sair 1 com todos
os casos passando (erro de parse do rollup). A lane vizinha o consertou (`399bfa7b`, `f5b15472`),
esta lane mergeou main, e ele agora **roda e passa (14/14)** — depois de um `pnpm build` dos pacotes
do workspace, porque ele reprova `dist` defasado e o meu estava (buildado antes do merge). Fica a
nota operacional para as próximas ondas: **merge de main pede rebuild dos pacotes antes de rodar a
suíte**, senão este caso reprova por motivo de ambiente e parece defeito de código.

## 7 · Para quem pegar a próxima onda

- **A catraca não vê tudo.** `scripts/gate-canon.mjs` varre `div|section|article|li|aside`. Duas
  superfícies com anatomia de cartão viviam em `<p>` (`minha-conta/PainelIngressos.tsx`) e o
  detector não as enxergava. Foram convertidas do mesmo jeito. Acrescentar `p` à lista de tags é um
  ajuste de uma linha que **sobe** a contagem do painel no dia em que entrar — então entra junto
  com a onda que paga o que ele achar, nunca sozinho.
- **Constante de classe escapa da catraca.** `PainelIngressos` e `PortasDaConta` guardavam a
  anatomia do cartão em `const CARTAO = '…'` e a catraca, que lê o texto do atributo, não as
  contava. As ondas do painel vão encontrar o mesmo padrão.
- **O contraexemplo continua valendo:** `eventos/kits/KitsCadastroView.tsx:123` traz o comentário
  *"Card CANÔNICO do DS, não `<article>` cru com bg (D-1008-R11)"*. O time sabia; faltava cânone
  para generalizar.
- **Resíduo de vocabulário, fora do escopo desta lane:** `checkout/CardAtleta.tsx` carrega a palavra
  "Verbatim" num comentário de código. É termo banido em chat, registro, commit e brief; num
  comentário antigo ele não quebra nada, mas quem tocar o arquivo troca por "na íntegra".
