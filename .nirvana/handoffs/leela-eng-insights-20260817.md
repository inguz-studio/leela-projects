# Handoff · ENG-INSIGHTS (2026-08-17)

- **Trace:** `leela-redesign-v2-20260810` · lane `ENG-INSIGHTS`
- **Branch:** `eng-insights` · worktree `C:\dev\leela-wt-enginsights`
- **Frentes:** onda R2 da carga cognitiva (ENG-CARGA-1) · manejamento dos KPI cards · nascimento do bloco "Insights da Leela"
- **Área do evento:** intocada. Os vetáveis EVT-CARGA seguem esperando a palavra do dono.

## A confissão, antes de tudo

**O bloco "Insights da Leela" existia no template do dono desde 09/08 e nunca chegou ao código.**

Ele está em `leela-specs/02-rodadas/2026-08-09-redesign-ds/handoff-v2/design/engajamento-referencia.dc.html`,
como `aria-label="Insights da Leela"` na linha 439, com as regras de derivação na linha 1484. A
busca por "Insights da Leela" em `apps/painel/src` devolvia **zero ocorrências** antes desta lane.

O que aconteceu tem nome: o inventário da lane ENGAJAMENTO-DASH **não registrou o bloco nem como
entrega nem como impedimento**. Ele não foi cortado por decisão, não foi adiado por falta de fonte,
não virou vetável. Sumiu entre o template e o código, em silêncio, e só voltou porque o dono deu
falta dele oito dias depois: *"nao estou localizando os insights da Leela, (que eu havia enviado no
template do mockup feito no claude design)"*.

O agravante é o padrão. É a mesma classe da queixa da leva 17 (*"Já falei anteriormente, e voce
ignorou"*): **item de spec do dono que morre sem deixar rastro é pior que item recusado**, porque um
item recusado ainda pode ser discutido. A defesa que esta lane deixa é escrita no cabeçalho do
próprio componente, onde a próxima pessoa a mexer no bloco não tem como não ler.

## 1 · A banda Eventos saiu (ENG-CARGA-1)

**Remoção pura, e a prova é que nada migrou.** Os dois blocos daquela banda já estavam montados na
Visão geral, vindos do mesmo componente e da mesma fonte:

| Bloco | Onde estava no Engajamento | Onde continua, intacto |
|---|---|---|
| Ocupação dos últimos eventos | `EngajamentoView.tsx:760` (importado de `overview/_components/`) | `OverviewContent.tsx:191` |
| Formas de pagamento (em breve) | `EngajamentoView.tsx:770` | `OverviewContent.tsx:182` |

Não era um bloco parecido: era **o mesmo componente renderizado duas vezes**. A Visão geral não
ganhou nem perdeu uma linha nesta lane.

Morreram junto: a leitura `useEventosDoOrganizador()`, a derivação `ocupacao`, as quatro props do
par (`ocupacao`, `eventosLoading`, `eventosError`, `onRetryEventos`) e três imports.

**O seletor agora recorta tudo.** Aquela banda era a única leitura da tela que não recebia o
recorte — e o código dizia isso com todas as letras, em `EngajamentoPage.tsx:54-56`, como se fosse
desenho. Depois deste commit, todo bloco da tela deriva de `dados.data`, que nasce recortado.

**Prova de ausência, em teste:** os quatro casos que afirmavam a banda viraram casos que afirmam a
ausência dela, incluindo uma varredura de texto que reprova se qualquer nome de evento do
organizador reaparecer na tela. Enquanto os testes afirmavam a presença, a redundância estava
protegida por suíte verde.

## 2 · Manejamento dos KPI cards

Régua da casa-única (RN-573) aplicada aos quatro cards do topo.

| KPI | Antes | Depois | Razão |
|---|---|---|---|
| Clubs | card próprio | **morreu** → legenda de "Membros ativos" | terceira casa do mesmo fato, e constante sob recorte |
| Membros ativos | card | card, 1º | é "quem é a comunidade" — a pergunta da tela |
| Participações | card | card, 2º | é "quanto ela se mexe"; único desta casa |
| Desafios ativos | card | card, 3º, com papel declarado | é "o que a move", e o total da decomposição da ponte |

**Por que "Clubs" morreu, e são duas razões somadas:**

1. **A casa dele é o hub.** `HubClubes.tsx:56` ("Clubs ativos") e `:68` ("Meus clubs") já respondem
   "quantos clubs eu tenho" — duas vezes. Aqui era a terceira.
2. **Sob o seletor ele não media nada.** Com um club escolhido, o card lia `1` para sempre. Um
   número que só repete o controle que a pessoa acabou de mexer é eco, não medição.

Ele não sumiu: virou **resumo com caminho** na legenda de "Membros ativos" (`somados entre N
clubs`), que é onde a contagem de fato qualifica o número — ela diz entre quantos o total foi
somado. É o mesmo desenho que o hub já usa em "Pessoas alcançadas" (`HubClubes.tsx:66`). Com um
único club no recorte a legenda também sai, porque "somados entre 1 club" é ruído.

**A régua subiu de lugar.** Ela estava dentro da faixa "Clubs", o que fazia quatro números do
recorte inteiro parecerem números de uma seção. Agora fica acima da primeira faixa, que é a ordem do
template do dono (mockup: KPIs na l.401, Insights na l.439, faixa "Clubs" só na l.460).

## 3 · Os Insights da Leela nasceram

Posição do mockup: largura total, logo abaixo da régua de KPIs, acima da primeira faixa.

### Derivação por derivação, com a evidência de cada uma

O template traz três insights (l.1484). Eles são **literais de desenho** no mock — nenhum é
calculado lá. Cada um foi conferido contra o banco e o core antes de qualquer linha de tela.

| # | Derivação do template | Fonte real existe? | Veredito |
|---|---|---|---|
| 1 | "R$ 1.240 aguardando pagamento" · 9 Pix pendentes há +48h | **Sim, e completa** | **Fora de casa** — não entra aqui |
| 2 | "3 inscrições incompletas" · pararam na etapa de dados | Existe, **inalcançável** | Fora de casa + sem leitor |
| 3 | "Seus clubs sustentam a recompra" · 2,3x, 142 compradores | **Não** | Sem fonte confiável |

**Derivação 1 — a fonte existe, mas a casa é outra.** `StatusPagamento` tem `'pendente'`
(`packages/core/src/pedidos/pagamento.ts:276`), o valor está em `valorFinal` (`:453`), a idade em
`criadoEm` (`:492`), e as Rules deixam o organizador ler (`firestore.rules:2593`). Só que **o
seletor de club não alcança pagamento nenhum**: pagamento é de evento, e evento é do organizador.
Montar esse insight no Engajamento recriaria exatamente o defeito que o item 1 deste handoff acabou
de remover. E ele **já está entregue na casa certa**: o `AlertsPanel` da Visão geral publica
`pendentes-24h` (`packages/core/src/overview/alerts.ts:156`).
Três notas para quem for construir a versão em R$ na Visão geral: (a) **as 48h do template são
invenção** — as constantes da casa são `PENDENTE_ALERTA_HORAS = 24` e `HORAS_INADIMPLENCIA = 72`;
(b) **não existe agregado de R$ pendente** em lugar nenhum, nem servidor nem cliente (o
`aggregateProfessionalDashboard.ts:176` conta e nunca soma); (c) sem agregado, o caminho é fan-out
por evento ou rollup novo de Function.

**Derivação 2 — o dado existe e o painel não pode ler um byte.** O ledger de carrinho abandonado é
real e durável (`functions/src/checkout/carrinhoCheckout.ts:70`, subcoleção `ciclos`), mas as Rules
o deixam **de propósito** sem `match`, caindo no deny-by-default (`firestore.rules:3101-3110`), e o
`api-client` não tem leitor. Além disso ele **não guarda etapa nem identidade** — "parou na etapa de
dados do atleta" e "estas N pessoas" são as duas coisas que o registro não tem. O próprio código
chama o agregado de "fase 2".

**Derivação 3 — não há identidade que ligue membro a comprador.** A única chave disponível ao
cliente é `atletaId`, e ela mente por construção: quem não é responsável recebe um id sintético
(`createInscricaoCharge.ts:1736`, `` `${inscritoId}-convidado` ``) e o responsável entra com o uid da
**sessão de checkout, inclusive anônima**. A identidade certa (CRM) tem docId por HMAC com pepper
só do servidor (`functions/src/crm/agregarClientes.ts:124`), e `pessoas/{id}` é `read: if false`. Um
"142 compradores fora de club" derivado assim seria inflado e **infalsificável na tela**. É a mesma
ligação que o bloco "Conversão da base" já nomeia nesta tela.

### O que o bloco mostra, então

Duas leituras **reais**, ambas recortadas pelo seletor e ambas derivadas de números que a tela já
calculava — **zero leitura nova, zero query nova**:

| Insight | Tom | Fonte | Caminho |
|---|---|---|---|
| "N de M membros estão parados" | Atenção | `resumirSituacao` (id `inativo`) | → Situação dos membros |
| "N de M desafios não apontam para um evento" | Oportunidade | `resumirPonteComEventos` (id `sem-evento`) | → Desafios ligados a um evento |

Sem insight que dispare, o bloco diz **"Nada pedindo atenção neste recorte."** — insight de zero é
ruído com cara de alerta.

**O denominador vem da mesma fonte do numerador**, e isso é regra e não detalhe: os parados saem da
lista carregada, e dividi-los pelo KPI "Membros ativos" (que sai do agregado `qtdMembrosAtivos`)
poria **dois caminhos de cálculo na mesma frase**. Foi esse par que fez a RN-573 nascer.

### Por que o bloco não viola a RN-573 que a mesma onda implanta

Um insight é, por construção, um número que a tela desenha de novo mais abaixo. A regra-mãe permite
isso com duas palavras: papel **distinto** e **declarado**.

- **Distinto:** o gráfico responde "como isto se distribui"; o insight responde "o que nisso pede
  ação agora".
- **Declarado:** todo insight carrega o `caminho` para a âncora da casa do próprio fato. É o que o
  torna resumo com caminho em vez de cópia. **Insight sem caminho não entra no bloco** — a regra
  está escrita no tipo e cobrada em teste.

### Composição: nenhuma peça nova, nenhuma superfície crua

As três anatomias do cânone foram medidas antes de escrever markup:

- **`CardDominio` reprova.** É cartão de entidade em lista e assume que o título é um **nome**:
  `CardTitle` vem com `truncate`. Título de insight é frase — cortá-la com reticências apaga a
  informação.
- **`SectionHeader`** é cabeçalho de bloco, não item de lista.
- **`Alert` casa.** Um insight é o que ele modela: mensagem com tom, título, corpo e ação. E
  `live="none"` é o default certo, pela razão que o próprio componente escreve — aviso que já estava
  na tela quando ela carregou não é live region.

Moldura e cabeçalho são o `CartaoV3` e o `EyebrowV3` das outras seis seções da tela.

## Divergências do template, nomeadas (todas vetáveis)

1. **"das últimas 4 semanas" saiu.** O template promete janela temporal; **nenhuma derivação desta
   tela tem janela** — os números são retrato de agora. A frase virou "Leitura automática dos números
   deste recorte". Manter a original seria promessa falsa.
2. **A pílula de tom virou o tom do `Alert`.** No mockup a cor vivia num `Badge` sobre faixa neutra;
   aqui ela é o tom do próprio aviso. A palavra ("Atenção"/"Oportunidade") **continua em texto**,
   dentro do heading, porque cor sozinha reprova na 1.4.1 e o ícone do `Alert` é `aria-hidden`.
3. **O cabeçalho é o eyebrow da casa**, não o título display com tile de ícone do mockup. Uma
   segunda anatomia de cabeçalho para um bloco só seria drift.

## Gates

| Gate | Resultado |
|---|---|
| `gate-canon` | **PASS**, sem bump de baseline |
| Testes da área (`routes/clubes/engajamento`) | **100 verdes** (eram 92; +8 na derivação) |
| Fatias vizinhas (`routes/clubes` + `routes/overview`) | **517 verdes**, 56 arquivos |
| `tsc --noEmit` (painel) | limpo |
| `eslint` (área tocada) | exit 0 |
| Gate visual | pendente — telas declaradas em "Fechamento" abaixo |

**Nota sobre o `gate-canon`:** a primeira execução reprovou em duas catracas
(`superficie-crua` 107→108 e `receita-de-grid` 23→24). As duas foram **consertadas na origem, não
com baseline**: a superfície crua sumiu ao trocar a faixa artesanal pelo `Alert` do DS, e a receita
de grid sumiu ao adotar `sm:grid-cols-2 lg:grid-cols-3`, que é a receita que o painel **já usa** nas
suas outras réguas de KPI (`OverviewKpis.tsx`, `SaldoCards.tsx`).

## Fila que esta lane deixa

- **VG · pendências de pagamento em R$** — a derivação 1 do template, na casa certa. Precisa de
  agregado (fan-out ou rollup) e de escolher entre as 24h e as 72h da casa. **As 48h do template não
  existem no código.**
- **Carrinhos abandonados (fase 2)** — derivação 2. Depende de Function de agregado; Rules seguem
  fechadas de propósito.
- **Ligação membro ↔ comprador** — derivação 3, e é a mesma que destrava "Conversão da base".
- **RN-568 · a anatomia de faixa de aviso** — `AlertsPanel` e este bloco são duas montagens do mesmo
  tipo de item. Na **terceira**, promover ao DS em vez de clonar.

## Fechamento (ENG-INSIGHTS-CLOSE, 17/08)

A sessão que fez os 3 commits travou antes do merge. Esta lane de fechamento reprovou a herança —
rodou todos os gates do zero no worktree, sem confiar em nenhum número do handoff original — e só
então mergeou.

**Regra da herança aplicada:** nenhum gate verde declarado acima foi aceito sem nova execução.

### Gates re-provados do zero (worktree `C:\dev\leela-wt-enginsights`, antes do merge)

| Gate | Resultado medido | Bate com o declarado? |
|---|---|---|
| `tsc --noEmit` (painel) | limpo, zero erro | sim |
| `eslint src --max-warnings 0` (painel) | exit 0 | sim |
| Testes `routes/clubes/engajamento` | **100 passed** (3 arquivos) | sim, bate com "100 verdes" |
| Testes `routes/clubes` + `routes/overview` | **517 passed** (56 arquivos) | sim, bate com "517 verdes, 56 arquivos" |
| `gate-canon` | **PASS**, todas as catracas em baseline (`superficie-crua.painel=107`, `receita-de-grid.painel=23` — os valores já corrigidos, não os 108/24 que a primeira execução original reprovou) | sim, PASS sem bump |

### Pré-condição do merge e sincronia

`git status --porcelain` em `C:\dev\LEELA` oscilou entre sujo e limpo por ~15 min enquanto
`SPEC-LEVA22` e depois `MODAL-LOTE` aterrissavam em paralelo (`dc6f4181`, `998fb996`, `502cec39`,
`044dce79`). Monitorado com poll de 3 min; a árvore fechou limpa e sincronizada com `origin/main`
(`044dce79`, 0 ahead/0 behind) antes de qualquer merge.

**Ordem usada (mais segura que mergear direto na main com lanes vizinhas ativas):**

1. `git merge origin/main` **dentro da branch `eng-insights`** primeiro (worktree) — resolve
   qualquer conflito na origem, não no merge commit da main. Auto-merge limpo, único arquivo com
   merge automático foi `leela-specs/00-boards/V1-KANBAN.md` (soma de entradas de board, sem
   conflito). Commit `1548b9f6`.
2. Gates rodados de novo pós-sync (tsc limpo, eslint exit 0, `routes/clubes/engajamento` **100
   passed**, `gate-canon` PASS mesma baseline) — o merge trouxe mudanças de `Modal`/`Dialog` do
   design system (`MODAL-LOTE`) e não quebrou nada da área tocada.
3. Push de `eng-insights` para origin (rede de segurança).
4. Em `C:\dev\LEELA`: `git pull --ff-only origin main` (já estava em dia) → `git merge --no-ff
   eng-insights` → smoke (`routes/clubes/engajamento` **100 passed** de novo, `tsc --noEmit` limpo)
   → `git push origin main`.

### Hash do merge

```
841bfd38 merge: ENG-INSIGHTS -- banda Eventos sai, KPIs manejados, Insights da Leela no ar [eng-insights-20260817]
```

Push limpo, sem rejeição: `044dce79..841bfd38 main -> main`. `origin/main` confirmado igual ao
`HEAD` local (0 ahead/0 behind) depois do push.

### Gate visual do maestro — telas a conferir

Nenhuma foi vista renderizada por esta lane (restrição: sem navegador). Rota: `/clubes/engajamento`.
Em cada tela, **desktop e 375px, 2 temas** (claro e escuro/wine, conforme a régua padrão do painel):

1. **Régua de KPIs, sem recorte de club ("Todos os clubs")** — 3 cards: *Membros ativos* (com
   legenda "somados entre N clubs"), *Participações*, *Desafios ativos*. Confirmar que "Clubs" **não
   existe mais** como card próprio e que a legenda de "Membros ativos" aparece.
2. **Régua de KPIs, com um club específico selecionado** — os mesmos 3 cards, mas a legenda
   "somados entre N clubs" **some** (regra: com 1 club no recorte, "somados entre 1 club" é ruído).
3. **Bloco "Insights da Leela", sem recorte** — largura total, logo abaixo da régua de KPIs e acima
   da faixa "Clubs". Estado esperado: 0, 1 ou 2 `Alert`s (membros parados / desafios sem evento),
   cada um com tag de tom ("Atenção"/"Oportunidade") em texto, título, corpo e link de caminho
   sublinhado. Se nenhum disparar: linha única "Nada pedindo atenção neste recorte."
4. **Bloco "Insights da Leela", com um club selecionado** — os mesmos insights, recortados pelo
   club (números podem mudar ou zerar).
5. **Ausência da banda Eventos** — confirmar que "Ocupação dos últimos eventos" e "Formas de
   pagamento (em breve)" **não aparecem em nenhum lugar** da tela de Engajamento, com ou sem
   recorte. (Seguem intactos na Visão geral — não fazem parte deste gate.)

Nenhuma tela de evento foi tocada (os vetáveis EVT-CARGA continuam esperando a palavra do dono, como
já registrado acima).
