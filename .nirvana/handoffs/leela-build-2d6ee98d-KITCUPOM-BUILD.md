# Handoff vivo · lane KITCUPOM-BUILD · trace leela-build-2d6ee98d · 2026-08-02

Executor: sf-frontend-lead (software-forge). Brief: `.nirvana/briefs/leela-build-2d6ee98d-KITCUPOM-BUILD-enriched.md`.
Autoridade das 8 tarefas: `leela-specs/02-rodadas/2026-07-29-checkout-ux/04-fila-kitcupom.md`.
Specs de origem: `02-spec-kitcupom.md` (D-KC-1..12) e `03-rns-kitcupom.md` (RN-425..433).

Base: `main` em `8de6894`. Sem push — o maestro pusha.

## Estado da fila

- [x] **D0 · deploy do HEAD** (task do maestro, antes de tudo)
- [x] **A1 · S212-T1** — forma da galeria no core + slots nas Rules
- [x] **A2 · S212-T2** — três posições no `KitEditor` + slot no `uploadImagemKit`
- [x] **A3 · S212-T3** — `KitPublico`/leitor projetam as secundárias; galeria no `KitDetalhe`
- [x] **A4 · S212-T4** — quarto degrau da cascata do `kitImagem.ts`
- [x] **FRENTE A FECHADA** — suíte da landing **260/260** (214 antes)
- [x] **B1 · S1215-T1** — gerador único do link + `linkMaster` derivado
- [ ] **B2 · S1215-T2** — captura e guarda do cupom por evento
- [ ] **B3 · S1215-T3** — faixa pós-Hero + verificação server-side
- [ ] **B4 · S1215-T4** — dois links de demonstração no seed do meia-floripa
- [ ] **X1** — vocabulário/a11y da página do evento

---

## D0 · o site no ar volta a ser o HEAD

O deploy vigente (`806475ae3b089041`, da lane RETOMADA-SEAL) foi cortado ANTES dos dois
consertos de dinheiro que a review antagonista CKUX-REV fez em `CheckoutFlow.tsx` e
`StepPagamento.tsx` (`bcf7df2`, `f291f33`). O site servia, portanto, a tela em que o botão de
pagar podia oferecer o preço da seleção anterior. Esta task refez o deploy do HEAD.

Receita, um comando (LANDING-PREVIEW / RETOMADA-SEAL):
`node apps/landing/scripts/deploy-leela-hub.mjs`.

| | |
|---|---|
| Exit do script | **0** — *Deploy complete!* |
| Release na live | `2026-08-02 21:25:02`, sem expiração |
| Backend SSR | `ssrleelalanding` (gen2, Node 22, us-central1) — *Successful update operation* |
| Payload | 89 arquivos no Hosting, 5 novos; pacote da função 256,24 MB |
| `package.json` do app | restaurado pelo `finally` (`[deploy-landing] package.json restaurado.`) |

### Prova 1 — códigos HTTP, medidos depois do release

```
200   7,53 s   45.710 B   https://leela-landing.web.app/
200   1,92 s   78.613 B   https://leela-landing.web.app/meia-floripa-2026
200   1,24 s   39.932 B   https://leela-landing.web.app/meia-floripa-2026/inscricao
200   0,27 s        15 B  https://leela-landing.web.app/health
```

Os 7,5 s da home são o cold start de `minInstances: 0`, o mesmo número medido na
LANDING-PREVIEW e na RETOMADA-SEAL. Comportamento esperado, não regressão.

### Prova 2 — o fix da CKUX-REV está SERVIDO

O chunk da rota de inscrição é content-addressed, então a troca de hash já é prova de build
novo; o que faltava era o marcador do fix. Baixei o chunk **antes** do deploy e **depois**:

- antes: `.../inscricao/page-**79adbd49c17b6407**.js` (o mesmo que a RETOMADA-SEAL deixou)
- depois: `.../inscricao/page-**8581cec0538e410c**.js`

| Marcador (ASCII — acentuado não casa nos chunks desta máquina) | Antes | Depois |
|---|---|---|
| `Atualizando o total` — o rótulo que o botão de cartão passa a exibir enquanto a cotação está no ar (`f291f33`) | **0** | **1** |
| `totalDefasado` — o estado que desabilita os dois botões de pagar; o nome sobreviveu à minificação | **0** | **2** |
| `Pagar ` (o rótulo normal, que NÃO podia sumir) | 1 | 1 |
| `preparando o c`ódigo PIX | 1 | 1 |

As duas primeiras linhas são o fix novo entrando; as duas últimas são o controle — se elas
tivessem zerado, o deploy teria trocado a tela por outra coisa em vez de consertá-la.

`bcf7df2` (a cotação de seleção abandonada que aterrissava sobre a atual) é incremento de um
número de sequência dentro de um `useEffect`: não deixa string para grep. Ele viaja no mesmo
chunk, cujo hash mudou, e está coberto pelo teste `checkout-ckux-rev-cotacao.test.tsx` que a
própria CKUX-REV escreveu.

---

## Frente A · a galeria do kit (E03 · S212)

### A1 — a forma, e por que ela não é validação

`imagemUrl` continua sendo a principal; nasce `fotosSecundarias[]`. "Exatamente uma principal"
não é regra checada em lugar nenhum: existe **um campo** para a principal, então o estado de
zero e o de duas não são representáveis. Nenhum doc migra, e as cinco superfícies que leem
`imagemUrl` hoje seguem corretas sem uma linha.

Nas Rules, os dois slots são **literais** (`2` e `3`), não um wildcard com regex de dígito. É o
que faz o teto de três fotos ser garantido pelo Storage e não só combinado no aplicativo: não
existe caminho para um quarto objeto nascer. O caso do slot 4 negado está no teste.

Gates: core `tsc` 0 · `eslint` 0 · `kit-galeria-core.test.ts` **26/26** ·
`storageRules.integration` **71/71** no emulator (66 antes + 5 novos).

### A2 — três posições no painel, e um defeito que a spec não previu

O editor ganha as três posições com enviar, trocar, remover e "tornar principal". O estado tem a
forma do core (`GaleriaKit`) para que promover seja a função pura, e não um rearranjo escrito na
tela — que é justamente o jeito de violar a forma da RN-425 por descuido.

**O defeito.** "Tornar principal" troca URLs no documento e não move byte no bucket (decisão da
spec, função pura). Depois de uma troca, a posição 1 pode estar apontando para o objeto do slot
2. Se o upload usasse `slot = posicao`, reenviar a posição 2 gravaria em cima daquele objeto, o
token da downloadURL mudaria e **a foto principal morreria numa tela que ninguém tocou**. Quatro
cliques, sem malícia. Está registrado como premissa 1 abaixo.

`slotDeUploadFotoKit` fecha: reenvia no objeto que a própria posição já usa — a propriedade
"sobrescreve sem órfão" da RN-227 — ou pega o menor slot livre. O slot sai lido de dentro da
downloadURL, por sufixo do path (`includes` faria `.../fotos/2` casar como principal), então
nenhum campo novo entra no documento.

Gates: api-client `tsc` 0 · painel `tsc` 0 · `eslint` 0 · `KitEditorGaleria` **16/16** ·
suíte de kits do painel **70/70** sem regressão.

### A3 — a galeria mora só no detalhe

Fita de miniaturas com o `Thumb` do DS (zero componente novo) e o lightbox que já existe
ampliando a foto **em foco**, não a principal. `KitsSection` e `StepModalidadeKit` não têm uma
linha tocada — é o outro lado da RN-426.

Sem fallback para a galeria, de propósito: o mock rico existe para o kit não nascer vazio;
fabricar uma fita faria a página prometer fotos que não existem.

A11y: `<ul>` rotulada, botão por miniatura com rótulo posicional ("Ver foto 2 de 3 do Kit
Ouro"), `aria-current` na que está em foco, imagem do Thumb decorativa (o botão já rotula —
repetir faria o leitor anunciar o kit duas vezes por miniatura).

### A4 — a demonstração é app-side, e só em preview

Quarto degrau da mesma cascata: real vence sempre; em preview, kit sem adicionais ganha duas
fotos do acervo local; em produção, mostra só a principal. O par é determinístico (as duas
seguintes ao tema do kit na ordem fixa do acervo) — começar depois do próprio tema é o que
impede a fita de repetir a foto grande quando a principal também é mock.

**Gate da frente A:** suíte cheia da landing **260/260** em 23 arquivos, single-fork, 37,16 s
(214 antes: +26 da A1, +20 da A3/A4). Zero flakiness.

---

## Frente B · o cupom pré-aplicado por link (E12 · S1215)

### B1 — o link deixa de ser digitado, e o segundo gerador morre junto

Retomada depois do crash do terminal: o diff do B1 estava vivo no worktree e foi
avaliado contra a fila antes de qualquer edição. Três coisas faltavam.

**O erro de tsc** (`linkPromocional.test.ts:118`, TS2379): o caso "sem vínculo" passava
`{ cupomCodigo: undefined }`, e sob `exactOptionalPropertyTypes` campo omitido e campo
escrito como `undefined` são coisas diferentes. Quem produz o caso real é o wrapper do
painel, com spread condicional — o teste passou a montar `{}`.

**O segundo gerador.** `montarLinkAfiliado` continuava no core: montava `{base}/{slug}?ref=`
sem cupom e sem validar a base, então `montarLinkAfiliado('beh.ro', …)` devolvia string em
vez de recusar. "Gerador único" com dois geradores morre no primeiro caminho novo que
escolher o errado. Removido; estava sem chamador em app.

**A feature nascia morta no painel real.** `.env.leela-hub` — o env do build de produção do
painel — não tinha `VITE_LEELA_URL`. Sem base, o gerador recusa por design, e o botão de
copiar link viraria "sem link" em todo lugar. A variável entrou apontando para a landing que
o D0 provou no ar. De quebra o `PUBLIC_BASE` para de cair no fallback `https://be-hero.com.br`
que estava cravado no código.

Os dois desempates de comissão (⚔ vetor 2 da B1) viraram teste no emulator: link de A +
cupom de B ⇒ **B** leva e o clique de A é descartado; cupom sem afiliado ⇒ **A** sobrevive
com o clique preservado. O caso do descarte foi corrigido para asserir por **janela** e não
por igualdade com um instante capturado no import — quem carimba é o relógio da chamada, e a
igualdade falhava por ~30 s de suíte.

⚔ **Vetor 1 (kernel intocado) medido:** `git diff --stat -- functions/src/checkout/` não
tem uma linha desta lane. O arquivo aparece modificado no worktree por **outra lane viva na
mesma árvore** (PIXFIX-EXTREF · T3), e ficou FORA do commit — `git commit --only` com a lista
explícita de caminhos.

Gates: core `tsc` 0 · `eslint` 0 · `tsup` 0 · painel `tsc` 0 · `eslint` 0 · functions `tsc` 0 ·
`eslint` 0 · landing `tsc` 0 · `linkPromocional.test.ts` **18/18** · suíte clubes+afiliados+lib
do painel **353/353** (349 antes) · `afiliados.integration` **38/38** + `afiliadoCore` **17/17**
+ `parceriaCore` **8/8** no emulator 8480/9598.

## Premissas assumidas (vetáveis)

1. **O upload não usa `slot = posicao`** (A2). É a única premissa desta lane que muda
   comportamento que a spec descreveu. A spec fixou a troca como função pura e não previu a
   colisão que isso cria com o nome de objeto fixo. Escolhi fechar o defeito em vez de embarcá-lo,
   porque o dano é a foto principal sumir sozinha. Nenhuma propriedade nomeada pela RN-427 foi
   perdida: nome de objeto fixo, sobrescreve sem órfão, sem filename livre, teto de três.
   Custo de vetar: trocar uma função pura e aceitar o defeito, ou mover bytes no Storage a cada
   clique de "tornar principal".
2. **`removerFotoPrincipal` nasceu no core** (A1), embora a fila só nomeie
   `promoverFotoPrincipal`. A RN-427 exige o comportamento ("remover a principal promove a
   primeira secundária") e ele tem a mesma propriedade da promoção: é capaz de violar a forma da
   RN-425. Custo de vetar: uma função a menos, e a regra volta a viver escrita à mão no painel.
3. **A vaga 3 só abre depois da 2** no editor (A2). A ordem do array É a ordem de exibição
   (RN-425); vaga vazia no meio produziria buraco na fita. A spec não diz. Custo de vetar: uma
   condição.
4. **Alt posicional na foto grande** quando há mais de uma ("Kit Ouro — foto 2 de 3"). Com fita,
   "Kit Ouro" sozinho deixa de identificar o que está na tela. Custo de vetar: uma string.
5. **`montarLinkAfiliado` foi REMOVIDO do core** (B1). A fila pede "gerador único"; ele era o
   segundo, sem cupom e sem validação de base. Não tinha chamador em app. Custo de vetar:
   ressuscitar a função e conviver com uma superfície futura copiando link sem desconto.
6. **`VITE_LEELA_URL=https://leela-landing.web.app` entrou no `.env.leela-hub`** (B1). É a base
   que o D0 provou no ar; o domínio definitivo continua sendo decisão do dono (item 12). Sem
   ela o gerador recusa e o painel real fica sem copiar link. Custo de vetar: trocar uma linha
   de env — e enquanto não houver base, a tela diz honestamente que não há link.
7. **A fixture de parceria do painel ganhou `refCodigo`** (B1), para as telas E18 testarem o
   caminho derivado. O `linkMaster` legado com `be-hero` continua na fixture de propósito: é o
   que os dois casos novos provam que não reaparece. Custo de vetar: nenhum fora de teste.

## Commits desta lane (sem push — o maestro pusha)

| # | Hash | Task |
|---|---|---|
| 1 | `5a02f20` | D0 · deploy do HEAD com provas |
| 2 | `4809d5b` | A1 · forma da galeria no core + dois slots literais nas Rules |
| 3 | `637dd92` | A2 · três posições no `KitEditor`; promover é trocar |
| 4 | `d63b703` | A3 · galeria no detalhe do kit; listagens intocadas |
| 5 | `fd1c6f2` | A4 · quarto degrau da cascata (preview) |
| 6 | `ae7538f` | B1 · gerador único do link, com o cupom dentro |

## Convivência de lanes (medido em 2026-08-02, durante a B1)

Outra lane está VIVA na mesma árvore, escrevendo em `functions/src/checkout/`
(PIXFIX-EXTREF · T3 — o comentário dela declara a divisão: "a KITCUPOM-BUILD é dona de
`packages/**` agora"). `createInscricaoCharge.ts` e `asaasTetoCheckout.integration.test.ts`
apareceram modificados no worktree às 22:19 e 22:21, no meio da B1.

Consequência operacional para o resto desta lane: **todo commit é `git commit --only` com a
lista explícita de caminhos**. Nunca `git add -A`. A fila já previa a convivência (RN-433) e
nenhuma task daqui escreve naquele território.
