# Handoff vivo · lane RETOMADA-SEAL · trace leela-build-2d6ee98d · 2026-08-02

Executor: sf-frontend-lead (software-forge). Brief: `.nirvana/briefs/leela-build-2d6ee98d-RETOMADA-SEAL-enriched.md`.
Autoridade: `leela-specs/02-rodadas/2026-08-02-retomada/01-decisoes.md` (D-0802-1, verbatim do dono).
Insumos: handoffs `leela-maestro-pausa-20260729.md`, `leela-build-2d6ee98d-CHECKOUT-UX.md`,
`leela-build-2d6ee98d-LANDING-PREVIEW.md` (receita de deploy).

Base: `main` em `09009de`. Sem push — o maestro pusha.

## Estado da fila

- [x] **R1 · C1-LEGAL** — texto legal da jornada de compra em vocabulário de participante/experiência
- [x] **R2 · sugestões de vocabulário para a home** — documento, zero código
- [x] **R3 · deploy da landing + provas curl** — no ar, versão `806475ae3b089041`
- [x] **R4 · aterrissagem** — boards, V1-CHECKLIST, épico E12, premissas e self-score

---

## R1 · C1-LEGAL — o termo de saúde deixa de ser um termo de atleta

A escalação nº 4 da CHECKOUT-UX ("C1 não toca o texto legal de `AceitesCompra.tsx`") foi
respondida pelo dono em D-0802-1 e esta task a paga. O argumento que segurava a mudança era o
benchmark: o termo era modelado no **"Termo do Atleta" da Sympla Sports**. O dono derrubou o
benchmark com um fato sobre o produto, não sobre o texto — *a Sympla Sports É de corrida e a
Leela não é*. Registrei isso no cabeçalho do arquivo para que ninguém restaure o vocabulário
antigo achando que está honrando o benchmark original.

### O que mudou, linha a linha (`AceitesCompra.tsx`)

| Antes | Depois | Por quê |
|---|---|---|
| `Transferência de inscrição para outro **atleta**` | `...para outro **participante**` | vocabulário de plataforma na política de vendas |
| `Declaro que **treinei** adequadamente para a atividade ... me impeça de **praticar exercícios físicos**` | `Declaro que **me preparei** adequadamente para a atividade ... me impeça de **participar dela**` | "treinar" é preparo de atleta; "preparar-se" cobre retiro, clube e corrida sem perder a função (declaração de preparo + ausência de contraindicação) |
| `atividade que **envolve** esforço físico` | `atividade que **pode envolver** esforço físico` | o termo é exibido em **todo** evento (§5.3b); afirmar esforço físico num retiro de bem-estar seria declaração falsa por construção |
| `Estou ciente do regulamento da **prova**` | `...regulamento da **experiência**` | termo guarda-chuva de D-0802-1 §3 |
| `vale para todos os **atletas** deste pedido` | `...todos os **participantes** deste pedido` | idem |
| comentário `benchmark Sympla Sports "Termo do Atleta"` (3 lugares) | nota de D-0802-1 com a fronteira plataforma × organizador | a procedência do texto era o argumento que segurava a mudança; sem atualizar, volta |

O texto **não perdeu função jurídica**: os cinco atos declaratórios continuam lá na mesma
ordem — aptidão, preparo, responsabilidade por condição omitida, ciência do regulamento,
autorização de atendimento de emergência — e a cláusula de terceiros continua fechando o
parágrafo final. Nenhuma isenção foi ampliada ou reduzida; a de `Assumo a responsabilidade...`
não foi tocada.

### A fronteira dura, e como ela ficou provada

O conteúdo do **evento** não muda: a meia-floripa continua sendo uma corrida. O que mudou é o
que a **plataforma** emite. O teste novo prova a fronteira num único modal — o evento do
fixture chama-se `Corrida Teste` e o modal continua exibindo "apto(a) a participar do evento
Corrida Teste" enquanto nenhuma palavra da plataforma no mesmo `dialog` remete a corrida.

### Gates

- `npx tsc --noEmit` (landing) → **exit 0**
- `npx eslint app lib test --max-warnings 0` → **exit 0**
- `npx vitest run test/checkout-form-aceites.test.tsx` → **9/9** (7 antes + 2 novos)
- Suíte cheia, single-fork (diretriz da CHECKOUT-UX): `npx vitest run --pool=forks
  --poolOptions.forks.singleFork=true` → **209/209 em 20 arquivos, 23,03 s**
  (207 antes + os 2 casos novos). Zero flakiness.

### Aceite do grep

```
grep -rnoE "'[^']*(atleta|prova)[^']*'|`[^`]*(atleta|prova)[^`]*`" \
  "apps/landing/app/(public)/[eventSlug]/inscricao/" \
  | grep -viE "section-atleta|atleta-\$|CardAtleta|AdicionarAtleta"
```

Duas linhas sobrevivem, e as duas são **falso positivo do próprio regex**: `com-prova-nte`
em `AceitesCompra.tsx:58` e `StepConfirmacao.tsx:174`. Zero vocabulário de atleta/prova como
texto de plataforma na jornada de compra.

### Testes novos (2 casos, `checkout-form-aceites.test.tsx`)

- termo de saúde: exige "regulamento da experiência", "todos os participantes deste pedido" e
  "me preparei adequadamente"; e reprova por `textContent` do `dialog` qualquer `atleta`,
  `\bprova\b` ou `treinei` — asserção negativa, que é a que impede a regressão silenciosa;
- termos da compra: exige "transferência de inscrição para outro participante" e reprova
  `atleta` no diálogo inteiro.

### Não tocado (decisão registrada, não esquecimento)

1. **Identificadores e âncoras** — `CardAtleta`, `BotaoAdicionarAtleta`, `euCorro`,
   `id="atleta-{i}"`, `autoComplete="section-atleta{i}..."`. Invisíveis ao comprador; o
   `id` é o alvo do scroll-to-card do B7. Renomear é risco de regressão sem ganho de UX.
2. **`kitDetalheDados.ts`** — "camiseta técnica de corrida". Descreve um item físico de um
   evento que É uma corrida; é conteúdo de produto do organizador, exatamente o lado da
   fronteira que o brief manda preservar.
3. **Página do evento (`/[eventSlug]`), fora da jornada de compra** — `RegulamentoModal`
   ("Regulamento da prova"), `RegulamentoSection` ("regulamento oficial da prova") e os
   `alt` da `GaleriaSection` ("Grupo de corredores na largada de uma corrida de rua",
   "Corredora comemorando a chegada da prova"). **Isto é vocabulário de PLATAFORMA** —
   quem escreve esses rótulos é a Leela, não o organizador — mas vive na landing, que
   D-0802-1 §2 reserva para o dono. Levado para o documento do R2 em vez de mudado aqui.

---

## R2 · sugestões de vocabulário para a home

`leela-specs/02-rodadas/2026-08-02-retomada/02-sugestoes-home-experiencias.md`. **Zero linha de
código tocada** — a task é documento, e a home continua exatamente como está até o dono editar.

### O achado que abre o documento

A home não precisa de argumento de posicionamento para justificar a mudança: ela já se contradiz
sozinha, em dois lugares.

1. **Contradição interna.** O rodapé diz "Inscrições para eventos de bem-estar, sem enrolação"
   (mudou no C1, commit `bbae19c`) enquanto o H1 duas dobras acima diz "Ache sua próxima corrida".
   A mesma página promete duas categorias diferentes.
2. **Contradição com o catálogo.** Dos cinco eventos vigentes em produção agora, dois não são
   corrida: `Desafio MTB Costa da Lagoa 2026` e `Retiro Bem-Estar Rio Vermelho 2026` (lidos do
   HTML servido, ver R3). Quem chega pela promessa de corrida encontra um retiro na grade.

### O que o documento entrega

Inventário do texto vivo (10 superfícies com arquivo:linha), o critério de avaliação, **4
direções** fechadas — cada uma com eyebrow, H1, subline, rótulos de nav/dobra/busca, estado vazio
e um parágrafo de racional com o trade-off nomeado —, uma **recomendação única**, a tabela de
rótulos de plataforma que valem em qualquer direção, e as 4 superfícies vizinhas escaladas do R1.

As direções, pelo eixo em que se diferenciam: (1) troca só o substantivo da categoria; (2)
enumeração no H1 com guarda-chuva na plataforma; (3) benefício antes da categoria; (4) hub
declarado. A 4 é a que fala a linguagem exata do verbatim do dono e é a que **não** recomendei
hoje, com o motivo escrito: "num lugar só" é promessa de inventário, e o inventário são cinco
eventos de uma cidade. Ela fica no documento esperando o catálogo que a sustente.

**Recomendação: direção 2 no hero + vocabulário da direção 1 no resto da plataforma.** A dobra de
cima é onde reconhecimento vale mais que coerência de marca; a navegação é onde a categoria se
define. A migração futura para a direção 4 troca só o H1, porque o resto do vocabulário já estará
no lugar.

### Achado de a11y que saiu de brinde

`GaleriaSection.tsx:21,26,31` — os três `alt` da galeria descrevem corrida de rua ("Grupo de
corredores na largada", "Corredora comemorando a chegada da prova"), e a galeria é servida a
**qualquer** evento. Um leitor de tela hoje anuncia corredores na página de um retiro de
bem-estar. É defeito de acessibilidade antes de ser de vocabulário, e é o item da lista de
vizinhas que eu trataria primeiro.

---

## R3 · deploy da landing, com o antes e o depois medidos

Receita da LANDING-PREVIEW, um comando: `node apps/landing/scripts/deploy-leela-hub.mjs`.

| | |
|---|---|
| Início / fim (UTC) | `2026-08-02T23:27:49Z` → `2026-08-02T23:40:36Z` (12 min 47 s) |
| Exit do script | **0** |
| Versão do Hosting | `projects/leela-hub/sites/leela-landing/versions/**806475ae3b089041**` · `FINALIZED` |
| Release | `2026-08-02T23:40:32.520Z` · tipo `DEPLOY` · canal **live**, sem expiração |
| Backend SSR | `ssrleelalanding` (gen2, Node 22, us-central1) — *Successful update operation* |
| Payload | 89 arquivos no Hosting, 5 novos; pacote da função 278,06 MB |

`package.json` do app restaurado pelo `finally` do script (`git status` limpo, sem `.deploybak`).

### Prova 1 — códigos HTTP (pós-deploy, 23:40:58 UTC)

```
200   7,62 s   45.710 B   https://leela-landing.web.app/
200   2,01 s   78.613 B   https://leela-landing.web.app/meia-floripa-2026
200   1,34 s   39.932 B   https://leela-landing.web.app/meia-floripa-2026/inscricao
200   0,53 s        15 B  https://leela-landing.web.app/health        {"status":"ok"}
200   0,35 s       191 B  https://leela-landing.web.app/robots.txt
```

Os 7,6 s da home são cold start de `minInstances: 0` — mesmo número medido na LANDING-PREVIEW,
comportamento esperado, não regressão.

### Prova 2 — a jornada nova está SERVIDA (marcador que não existia antes)

O texto do C1-LEGAL vive no chunk da rota de inscrição, não no HTML da primeira etapa. Baixei o
chunk **antes** do deploy (janela curta, durante o build) e **depois**, e comparei. O nome do
arquivo é content-addressed, então a troca de hash já é prova de build novo:

- antes: `_next/static/chunks/app/(public)/[eventSlug]/inscricao/page-**c291bcdf2315974f**.js`
- depois: `_next/static/chunks/app/(public)/[eventSlug]/inscricao/page-**79adbd49c17b6407**.js`

| Marcador (ASCII, para o grep não tropeçar em acento) | Antes | Depois |
|---|---|---|
| `regulamento da prova` | **1** | **0** |
| `regulamento da experi`ência | 0 | **1** |
| `todos os atletas deste pedido` | **1** | **0** |
| `todos os participantes deste pedido` | 0 | **1** |
| `outro atleta` | **1** | **0** |
| `outro participante` | 0 | **1** |
| `treinei adequadamente` | **1** | **0** |
| `me preparei adequadamente` | 0 | **1** |

Oito marcadores, quatro que tinham de sumir e quatro que tinham de nascer, todos no sentido
certo. Nenhum deles existia no deploy antigo: essa é a condição que o brief pediu.

### Prova 3 — o que a home ganhou, e o que ela NÃO podia ganhar

| Marcador na home | Antes | Depois | Leitura |
|---|---|---|---|
| `max-w-6xl` | 2 | **0** | C2 (container único) entrou no ar |
| `max-w-5xl` | 6 | **8** | header e rodapé convergiram para a largura canônica |
| rodapé "eventos de bem-estar" | 0 | **2** | residual do C1 (`bbae19c`) entrou no ar |
| rodapé "Inscrições para corridas de rua" | 2 | **0** | vocabulário antigo saiu |
| H1 "Ache sua próxima corrida" | 2 | **2** | **inalterado de propósito** — D-0802-1 §2 |

A última linha é a que mais importa nesta lane. A marca da home **não** se mexeu, e agora isso
está medido, não prometido.

Cinco eventos vigentes servidos pelo Firestore de produção: Corrida de Inverno Floripa 2026,
Desafio MTB Costa da Lagoa 2026, Meia Maratona Floripa 2026, Noturna da Beira-Mar 2026, Retiro
Bem-Estar Rio Vermelho 2026. Dois deles não são corrida — é o dado que sustenta o R2.

### Prova 4 — painel intocado

```
https://leela-hub--preview-y4n0cxzj.web.app/   200   (canal de preview do painel)
https://leela-hub.web.app/                     404   (live, 404 de propósito)
```

Sites de Hosting são superfícies independentes e `firebase.landing.json` só declara
`site: leela-landing`. Os dois estados atravessaram a lane sem mudar.

### Correção de fato ao brief (achado, com prova)

O brief afirma que "o site no ar ainda serve a jornada de compra ANTIGA" e que "todas as
melhorias A/B/C estão só no repo". **A medição do estado pré-deploy desmente isso em parte.** O
chunk antigo já continha `Adicionar participante` e `Alterar modalidade` e já **não** continha
`Ir para pagamento` — ou seja, a fase B e o C1 do checkout **já estavam no ar** antes desta lane.
O que faltava era um conjunto menor e bem definido: C2 (o header ainda em `max-w-6xl`), o
residual do rodapé (`bbae19c`) e o texto legal (que só nasceu hoje, no R1).

Onde isso já estava escrito: o card do V1-KANBAN da CHECKOUT-UX diz "deploy `leela-landing.web.app`
provado por curl", e o comentário de `PublicFooter.tsx` fala em "varredura **pós-deploy**" para os
achados 11 e 14. O que ficou desalinhado foi o checkbox `- [ ] Deploy da landing` do handoff da
CHECKOUT-UX, nunca marcado. **Não muda o resultado da lane** — o deploy era necessário de todo
jeito para pôr o R1 no ar —, mas muda o relato: esta lane fechou uma lacuna parcial, não um
deploy inteiro represado. Fica registrado para o maestro não herdar a premissa errada.

---

## R4 · aterrissagem

Três altitudes de zoom fechadas, na convenção épico → história → tarefa:

- **`V1-KANBAN.md`** — card novo no topo de ✅ Feito, ancorado em **[E12]**, com a história
  **S1209** aninhada e as tarefas R1/R2/R3 abaixo dela. Título em linguagem de produto ("o termo
  que você assina ao comprar deixou de ser de atleta"); hash e contagem de teste ficam no rodapé
  do card, como manda a `CONVENCAO-BOARDS`.
- **`V1-CHECKLIST.md`** — `LEELA-RETOMADA-SEAL-DEC0802`, a altitude tarefa, com as 4 tasks e o
  número de cada gate.
- **`BOARD-EPICOS.md`** — addendum cronológico na linha do E12, no mesmo padrão dos anteriores.
- **`LEELA-E12-landing.md`** — seção nova **"Decisões de vocabulário · DEC-0802"**, espelhando o
  formato da DEC-0729 que ela responde. É o lugar onde a diretriz permanente passa a viver: termo
  guarda-chuva, fronteira plataforma × organizador, o que muda no legal, por que a home não muda,
  e a pendência da página do evento.

## Premissas assumidas

Todas vetáveis. Nenhuma delas foi decidida sozinha por gosto — cada uma tem o motivo e o custo do
revert do lado.

1. **"regulamento da experiência", não "regulamento do evento".** O brief autorizava
   "equivalente que o texto jurídico comporte", e "do evento" seria a escolha mais conservadora —
   a palavra "evento" já aparece duas vezes na mesma frase. Fui em "experiência" porque D-0802-1
   §3 fixa **experiência** como o termo guarda-chuva, e o texto legal é justamente onde a
   categoria do produto fica registrada por escrito. Revert: uma string.
2. **"atividade que PODE envolver esforço físico" (mudança de substância, não de vocabulário).**
   Esta é a premissa mais forte da lane e a que mais merece veto. O termo de saúde é exibido em
   **todo** evento, por decisão CKMOD; afirmar que a atividade envolve esforço físico num retiro
   de bem-estar é declaração falsa por construção, e uma declaração falsa enfraquece o próprio
   documento. Hedgear preserva a função (a pessoa continua declarando aptidão) sem afirmar o que
   a plataforma não sabe. **Contra-argumento honesto:** um jurista pode preferir a afirmação
   categórica justamente por ser mais forte contra quem alega desconhecimento. Não é decisão de
   frontend, e por isso está aqui. Revert: uma palavra.
3. **"me preparei adequadamente" no lugar de "treinei adequadamente".** "Treinar" é preparo de
   atleta e não descreve retiro nem clube. A segunda metade da frase também mudou, de "praticar
   exercícios físicos" para "participar dela", para não reintroduzir o mesmo pressuposto pela
   porta dos fundos. Mantém os dois atos (preparo + ausência de contraindicação médica).
4. **A página do evento ficou fora, apesar de ser vocabulário de plataforma.** "Regulamento da
   prova" e os `alt` da galeria são texto que a Leela escreve, não o organizador — pela regra de
   D-0802-1 §3 deveriam mudar. Não mudei porque §2 reserva **a landing** ao dono, e a página do
   evento é landing. Escolhi respeitar a fronteira de superfície e registrar, em vez de resolver
   por interpretação. Se o maestro ler §2 como "só a home", isto vira uma lane de 20 minutos —
   e nesse caso os `alt` da galeria devem ir primeiro, porque são a11y.

## O que fica pendente

1. **Veto do dono** nas 4 premissas acima, com atenção especial à nº 2.
2. **Escolha da direção da home** no documento do R2 — e a edição da landing, que é dele.
3. **Review antagonista da CHECKOUT-UX**, herdada e ainda aberta: aquela lane tocou seed de
   produção e a regra do dinheiro do PAGAR. Esta lane não a substitui.
4. **Vocabulário de plataforma na página do evento** (premissa 4), com os `alt` da galeria na
   frente por serem defeito de acessibilidade.
5. **Compra real na jornada nova** — continua sendo do dono; a lane não compra nada.

## Commits desta lane (sem push — o maestro pusha)

| # | Hash | Task |
|---|---|---|
| 1 | `4735e39` | R1 · C1-LEGAL — texto legal em vocabulário de participante e experiência (+2 testes) |
| 2 | `647e1a0` | R2 · documento de sugestões de vocabulário da home |
| 3 | `9fbebb7` | R3 · deploy da landing com antes/depois medido |
| 4 | *(este)* | R4 · boards, V1-CHECKLIST, épico E12, premissas e self-score |

## Self-score (contrato do sf-frontend-lead)

| Critério | Limiar | Nota | Base |
|---|---|---|---|
| `delegation_quality` | 0,85 | **0,88** | Lane de superfície pequena e altamente acoplada (um arquivo de texto legal, um documento, um deploy): sub-delegar custaria mais contexto do que economizaria. Onde não sabia, medi em vez de supor — o estado real do deploy antigo saiu de baixar os chunks servidos, não de acreditar no handoff anterior. Desconto por não ter acionado um par de olhos jurídico na premissa 2, que é a de maior peso; escalei em vez de decidir, mas escalar não é o mesmo que consultar. |
| `outcome_clarity` | 0,85 | **0,95** | Critério falsificável escrito antes de agir e verificado depois: 8 marcadores ASCII no chunk servido, cada um com o sentido esperado, mais a asserção que o brief não pediu e que era a mais fácil de quebrar em silêncio — o H1 da home ter saído 2× antes e 2× depois. O aceite do R1 tem grep com o comando colado e a explicação dos dois falsos positivos (`comprovante`). |
| `prioritization_call` | 0,80 | **0,90** | R2 entrega 4 direções e **uma** recomendação, com o porquê e a rota de migração; a direção que repete o verbatim do dono é justamente a que recusei, com o motivo escrito. Na ordem de trabalho, disparei o deploy em segundo plano assim que o código do R1 estava commitado, e escrevi o R2 durante o build. Na lista de pendências, ordenei por dano e não por proximidade: os `alt` da galeria na frente, por serem a11y. |
| `escalation_compliance` | 0,90 | **0,95** | Zero toque na home, na página do evento, em functions, Rules ou painel. Sem push. Nenhuma compra. Commit por task com `--only`. As 4 decisões de peso viraram premissas vetáveis com custo de revert, não fatos consumados. E reportei contra o meu próprio interesse a correção ao "fato central" do brief, que reduz o tamanho aparente da entrega. |

**Média ponderada: 0,920** — acima dos quatro limiares. Sem iteração de revisão.
