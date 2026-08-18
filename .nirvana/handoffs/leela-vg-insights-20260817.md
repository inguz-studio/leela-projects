# Handoff · VG-INSIGHTS (2026-08-17)

- **Trace:** `leela-redesign-v2-20260810` · lane `VG-INSIGHTS`
- **Branch:** `vg-insights` · worktree `C:\dev\leela-wt-vginsights`
- **Frente:** correção de rota de produto — a Visão geral enriquece e os Insights da Leela moram nela
- **Área do evento:** intocada. `dist/` e `dist-mock-campeche/` da árvore principal: não tocados.

## A fala do dono, e o que ela cobra

> nao foi o que pedi. Já falei para enriqquecermos a visao geral, e os insights da leela devem estar lá.

É a **segunda cobrança do mesmo item**. A lane ENG-INSIGHTS entregou o bloco ontem
(merge `841bfd38`) na tela de **Engajamento**, seguindo o template do mockup —
que era o template que estava na mão. A tela que o dono pediu era a **Visão
geral**. Esta lane paga isso.

Vale nomear o padrão, porque ele já custou duas rodadas: o bloco existia no
template desde 09/08, sumiu no inventário da ENGAJAMENTO-DASH sem virar entrega
nem impedimento, voltou na tela errada, e só agora chega onde foi pedido. A
defesa que fica é o cabeçalho do próprio componente, onde a próxima pessoa a
mexer não tem como não ler.

## 1 · O bloco virou peça única das duas telas (RN-568)

**A alternativa real era clonar**, e é exatamente disso que a RN-568 (composição
recorrente vira peça) trata. O componente subiu de
`routes/clubes/engajamento/_components/` para `apps/painel/src/components/`.

**Por que ali e não no design system.** A razão já está escrita no repositório,
em dois lugares, e nenhum dos dois foi inventado por esta lane:

- `CartaoV3.tsx:9-12` — *"Fica na tela (não no DS) porque é composição da Visão
  Geral: o DS dá os tokens e primitivos; a opinião de como uma seção do
  dashboard se anuncia é desta rota."* Promover o bloco ao DS arrastaria o
  `CartaoV3` junto, contra a decisão dele.
- `SecaoHead.tsx:10-14` — o mesmo movimento, pela mesma razão, quando o
  Engajamento passou a usar a mesma anatomia de cabeçalho de bloco. É o
  precedente literal: `src/components` é a camada de cânone do painel para
  composição recorrente que não é primitivo de DS.

**O que É do DS já vem do DS:** cada insight é um `Alert` canônico. A procedência
(RN-558) nunca esteve em questão — o que se repetia era a montagem, e agora ela
existe uma vez só.

**Medição honesta da anatomia**, porque a régua da RN-568 é contagem:

| Montagem | Onde | Anatomia |
|---|---|---|
| `AlertsPanel` | `overview/_components/` | faixa artesanal (círculo de 38px + título + "quando" + "Ver agora") — recriação fiel ao protótipo v3, lane HIFI-REC |
| `InsightsDaLeela` (Engajamento) | agora `src/components/` | `Alert` do DS com tag + frase + corpo + caminho |
| Visão geral | — | **a mesma peça acima**, importada |

Ou seja: a anatomia do insight tem **uma** implementação, não três. A do
`AlertsPanel` é outra anatomia (e outra decisão de produto — ver §3). O que
esta lane impediu foi a terceira montagem nascer por cópia.

**O contrato saiu junto.** `InsightDaLeela` mudou de `engajamento/_lib` para
`components/insights.ts` (puro, zero JSX) porque as derivações de rota são
`@pure` e não podem importar arquivo de tela para pegar um tipo. Cada tela
continua derivando o que ela mesma carrega — **o que é comum é a forma do
insight, nunca a conta**.

**`ancora: string` virou `destino: {tipo:'ancora'|'rota'}`**, união fechada. As
duas casas existem de verdade: o fato do Engajamento mora num bloco mais abaixo
da mesma tela; os fatos de portfólio da Visão geral moram em outra área do
painel. Um par de campos opcionais permitiria escrever insight com os dois ou
com nenhum, e "insight sem caminho não entra" deixaria de ser garantia do tipo.

## 2 · As três leituras entregues, com a fonte de cada uma

Posição: largura cheia, **logo abaixo da régua de números** — a ordem do template
do dono (mockup: KPIs na l.401, Insights na l.439). Zero query nova, zero
fan-out: tudo sai do que a tela já carrega (`getOverview` + a listagem de
eventos do organizador).

### Insight 1 · Pendências de pagamento — a derivação 1 do template

| | |
|---|---|
| **Tom** | Atenção |
| **Título** | o do próprio alerta: *"N inscrições pendentes aguardam pagamento há mais de 24h"* |
| **Fonte** | `alerts[]` id `pendentes-24h` → `derivarAlertas` (`packages/core/src/overview/alerts.ts:152-164`), alimentado por `recomputeProfessionalDashboard` (`functions/src/overview/aggregateProfessionalDashboard.ts:193-201`), que conta `inscritos` com `status === 'pendente'` e `criadoEm ≤ agora−24h`, cross-evento |
| **Caminho** | rota `/eventos` — "Ver seus eventos" |

**O título é o do alerta, e isso é decisão.** A contagem e o corte são derivados
no servidor; reescrever a frase aqui exigiria a contagem crua, que o contrato não
devolve — e arrancá-la de volta do texto por regex seria um segundo caminho de
cálculo sobre o mesmo fato, que é a doença que a RN-573 nasceu para tratar. O
insight acrescenta o que o alerta não tinha: **tom, corpo e caminho**. A âncora
temporal do painel (`quando`) não se perde: ela viaja no corpo ("A mais recente
entrou há 2h").

**Duas correções de verdade, contra o template:**

1. **As 48h do template são invenção.** As constantes que existem são
   `PENDENTE_ALERTA_HORAS = 24` (`packages/core/src/overview/alerts.ts:27`) e
   `HORAS_INADIMPLENCIA = 72` (`apps/painel/src/routes/eventos/_lib/inscritosFiltro.ts:143`
   — correção de precisão sobre o handoff da ENG-INSIGHTS, que a atribuiu ao
   core; ela é do painel). O número que chega à Visão geral é o de **24h**.
   Cobrado em teste.
2. **Não existe agregado de R$ pendente**, nem servidor nem cliente. A Function
   varre os pendentes doc a doc e **só incrementa contador** — nunca soma
   `valorFinal`. Entregar "R$ 1.240 aguardando pagamento" hoje seria número
   inventado. A versão em reais está na fila (§5), com o caminho medido.
   Cobrado em teste (`not.toMatch(/R\$/)`).

### Insight 2 · Eventos parados em rascunho

| | |
|---|---|
| **Tom** | Oportunidade |
| **Título** | "N eventos seus ainda estão em rascunho" (plural pt-BR) |
| **Fonte** | `eventosState.data` — a MESMA listagem `useEventosProdutor` que já alimenta Countdown, Agenda e Ocupação. Campo `status` (`StatusEvento`) |
| **Caminho** | rota `/eventos` — "Ver seus eventos" |

**Os rascunhos que já têm alerta de prazo são subtraídos da conta.** O
`AlertsPanel` publica `publicacao-{slug}` para rascunho com prova a ≤ 14 dias
(`alerts.ts:131-148`), com o prazo em dias e o destino do evento. Contá-los de
novo aqui seria o mesmo fato na mesma dobra. A subtração é mecânica (o `Set` dos
ids de alerta) e cobrada em teste — dois rascunhos com um já alertado dão **1**,
não 2. O corpo do insight diz isso em uma linha, para a conta não parecer errada.

### Insight 3 · Comunidade sem desafio rodando

| | |
|---|---|
| **Tom** | Oportunidade |
| **Título** | "N membros ativos e nenhum desafio rodando" |
| **Fonte** | `kpis.membrosAtivosTotais` + `kpis.desafiosAtivosTotais` — os dois do MESMO `getOverview` (`derivarKpis`, somando os ∑ de `clubes/{id}` mantidos por Function) |
| **Caminho** | rota `/clubes` — "Ver seus clubs" |

**É a leitura do PAR, que nenhum bloco faz.** O bloco "Clubs" desenha os dois
números lado a lado (`ComunidadeResumo.tsx:77-78`) e não diz nada sobre a
relação entre eles; o `EmptyState` dele cobre o caso de comunidade vazia — os
**dois** em zero (`:43-44`). O buraco entre os dois é gente dentro e nada
acontecendo, e essa é a pergunta que só o insight faz. Denominador e numerador
saem da mesma fonte.

## 3 · A reconciliação com o `AlertsPanel` (RN-573) — a decisão de desenho

Esta tela **já tinha** um bloco de avisos. Publicar as pendências nos dois seria
a violação literal da regra: o mesmo fato, na mesma dobra, sem papel distinto.
A decisão está aqui por escrito, e não foi tomada por gosto — foi tomada pelo
que o próprio dado é.

**A partição:**

| | `AlertsPanel` | Insights da Leela |
|---|---|---|
| **Fica com** | alertas **de evento**: `ocupacao-{slug}`, `publicacao-{slug}` | leituras **de conjunto**: o portfólio inteiro |
| **Cada item tem** | dono (um evento), âncora temporal ("há 2h") e destino `/eventos/{slug}` | nenhum evento dono; caminho para a área que é a casa do fato |
| **A pergunta** | "o que aconteceu num evento seu, e onde ir" | "o que o conjunto está pedindo agora" |

**`pendentes-24h` sempre foi de conjunto, e o código já dizia isso.** Ele é o
único alerta agregado cross-evento do contrato, e o **único que nasce sem
`href`** (`alerts.ts:155-163`; os outros dois carregam o do evento). No painel
de alertas, ele era o item que não levava a lugar nenhum — o `AlertsPanel` só
renderiza "Ver agora" quando há destino (`AlertsPanel.tsx:123`). Aqui ele ganha
o caminho que lhe faltava.

**Nada foi apagado.** O fato **mudou de casa e subiu na tela** (dos alertas, no
fim da grade, para os Insights, logo abaixo da régua de números). Os dois
alertas de evento continuam exatamente onde estavam, e a contagem do painel
acompanha a partição ("1 ativo", não "2 ativos") — cobrado em teste.

**Onde a partição mora, e por quê.** Em `overview/_lib/insights.ts`, na
constante `ALERTA_DE_CONJUNTO`, lida pelos **dois** lados: o painel exclui, o
insight consome. Se um dia a partição se perder, ela se perde nos dois ao mesmo
tempo — nunca só num, que é como nasceria a duplicata silenciosa. E a exclusão
é aplicada **dentro do `OverviewContent`**, não na página: se morasse na página,
bastaria alguém montar o componente de outro lugar para o fato voltar a aparecer
duas vezes.

**⚠️ Vetável do dono:** se ele preferir a pendência de volta no painel de
alertas, a reversão é uma linha (`alerts` cru em vez de `alertasDeEvento(alerts)`)
— mas aí o insight 1 sai, porque os dois juntos são a violação.

### Duas coisas que esta lane NÃO fez, de propósito

1. **Não absorveu o `AlertsPanel` inteiro.** Ele é recriação **fiel** ao
   protótipo "Visao Geral v3" por ordem do dono de 10/08 (fidelidade como
   critério primário, L-004 suspenso). Re-vesti-lo com a anatomia do insight
   mataria essa fidelidade sem o dono ter pedido.
2. **Não removeu o bloco do Engajamento.** O recorte de club é papel distinto do
   escopo-organizador da Visão geral. A remoção é vetável do dono, registrada
   pela lane REGISTRO-LEVA23.

### Achado de redundância que esta lane NÃO consertou (fica para o gate `leela-redundancia`)

`kpis.eventoEmRisco` aparece **duas vezes na mesma tela**: como badge
"Esgotando" + nome do evento na régua de KPIs (`KpiRow.tsx:180-181`) e como
alerta `ocupacao-{slug}` no painel (`alerts.ts:114-128`). É a mesma classe da
medição da rodada de carga cognitiva. Não entra nesta lane porque as duas
aparições são do protótipo do dono e mexer nelas é decisão de desenho dele, não
de reconciliação de insight. **Fica nomeado.**

## 4 · O que ficou de fora, e a evidência de cada recusa

Três dessas recusas são medidas nesta lane; duas herdam a evidência da
ENG-INSIGHTS, e foram reconferidas.

| Recusa | Evidência |
|---|---|
| **"N eventos sem capacidade definida"** | O bloco Ocupação **já publica essa linha** — `OcupacaoEventos.tsx:124-130` ("N eventos ficaram de fora por não ter capacidade definida") e de novo no `EmptyState` (`:74-77`). Seria cópia na mesma dobra. |
| **Queda de inscrições (`inscricoesTrendPct`)** | A régua de KPIs já desenha o delta com seta e "vs. 7 dias" (`KpiRow.tsx:164-165`), a 200px de distância. O caminho do insight apontaria para si mesmo. |
| **"Eventos publicados sem nenhuma inscrição"** | A fonte de contagem existe (`qtdInscritos`), mas **não existe `publicadoEm`** no doc do evento — `data` é a data da PROVA. Sem saber há quanto tempo o evento está no ar, "ainda não recebeu inscrição" inventa urgência: um evento publicado ontem estaria certo. Vira candidato (§5), não insight. |
| **Carrinho abandonado** (derivação 2 do template) | Ledger real (`functions/src/checkout/carrinhoCheckout.ts:70`), Rules o deixam **de propósito** sem `match` → deny-by-default (`firestore.rules:3101-3110`), sem leitor no `api-client`, e o registro não guarda etapa nem identidade. |
| **Ligação membro ↔ comprador** (derivação 3) | `atletaId` mente por construção (id sintético `${inscritoId}-convidado`, `createInscricaoCharge.ts:1736`) e a identidade certa é docId por HMAC com pepper só do servidor (`functions/src/crm/agregarClientes.ts:124`); `pessoas/{id}` é `read: if false`. Um "142 compradores" derivado assim seria inflado e infalsificável na tela. |

## 5 · Candidatos de enriquecimento da Visão geral — **para o dono vetar**

Nenhum foi construído. Cada um com **fonte nomeada** e o custo medido.

1. **Pendências em R$ (a derivação 1 completa).**
   Fonte: `inscritos/{id}` já varridos um a um pela Function
   (`aggregateProfessionalDashboard.ts:193`) + o valor em `valorFinal`
   (`packages/core/src/pedidos/pagamento.ts:453`).
   Custo: **baixo no servidor** — o laço já está lá, falta somar e publicar um
   campo novo no contrato `OverviewKPIs`/alerts. Zero query nova, zero índice.
   Bloqueio: exige **deploy de Function**, e o deploy está travado pelo gate
   visual (L-011). Fila com card.

2. **Corte de 72h (inadimplência) ao lado do de 24h.**
   Fonte: a mesma varredura acima, segundo limiar; a régua já existe em
   `inscritosFiltro.ts:143` e a tela de inscritos já filtra por ela.
   Custo: mesma Function, mais um contador. **A casa do caminho já existe** — o
   filtro de inadimplência da lista de inscritos.
   Pergunta para o dono: 24h e 72h são dois insights ou um só, com o corte mais
   duro em destaque?

3. **"Evento publicado e parado."**
   Fonte que falta: **`publicadoEm` no doc do evento** — não existe hoje. Com
   ele, "publicado há 12 dias e nenhuma inscrição" é honesto; sem ele, é palpite.
   Custo: campo novo + escrita na transição de status. Barato, mas é mudança de
   domínio.

4. **Recorrência de clientes (CRM).**
   Fonte: o agregado de CRM que a `ClientesPage` já lê (`/crm/clientes`) — é a
   única leitura de identidade que o cliente pode fazer.
   Custo: **+1 round-trip na primeira tela**, contra o orçamento de LCP que rege
   a Visão geral. Precisa da palavra do dono sobre trocar LCP por informação.

5. **Dinheiro a repassar.**
   Fonte: `repasse.ts` (core) + a `RepassesPage` que já existe em
   `/eventos/repasses`.
   Custo: rollup novo. **Não construído por política** — número de dinheiro sobe
   ao dono antes de virar tela.

6. **Taxa de conversão de verdade.**
   Fonte que falta: visitas (E12/analytics). O contrato já nasce certo
   (`derivarTaxaConversao` fecha em `pagantes`, D-1008-R19) e a régua mostra "—".
   Sem a fonte, não há insight — está aqui só para o dono saber que o buraco é
   conhecido e não esquecido.

## 6 · Gates — números medidos nesta lane

Todos rodados **em fatias seriais, em primeiro plano** (o dono está usando a
máquina): nenhuma suíte em background, uma por vez.

| Gate | Resultado medido |
|---|---|
| `tsc --noEmit` (painel) | **limpo**, zero erro |
| `eslint --max-warnings 0` (áreas tocadas) | **exit 0** |
| Fatia `routes/overview` | **196 passed**, 22 arquivos (eram 175 — **+21 novos**: 14 na derivação, 7 na reconciliação) |
| Fatia `routes/clubes` | **342 passed**, 35 arquivos |
| Fatia `routes/eventos` | **960 passed**, 83 arquivos |
| Fatia `routes/{crm,conta,parcerias,plataforma,onboarding,_system}` + `routes/__tests__` | **1072 passed**, 92 arquivos |
| Fatia `components` + `lib` + `shell` + `__tests__` | **376 passed**, 26 arquivos |
| **Painel completo** | **2946 passed, 258 arquivos, zero falha** |
| `gate-canon` | **PASS**, todas as catracas em baseline, **sem bump** (`superficie-crua.painel=107`, `receita-de-grid.painel=23`) |
| Gate visual | **pendente** — telas declaradas abaixo |

Cobertura das fatias conferida por varredura: nenhum diretório de teste do
painel ficou fora (`find src -name "*.test.ts*"` não devolve nada além das
fatias rodadas).

**O que a suíte NÃO cobre**, e por isso o gate visual não é formalidade: jsdom
não faz layout. A cascata de entrada renumerada (o bloco entrou como `i=3` e
empurrou Ocupação e Alertas para `i=6` e `i=7`), a grade de 3 colunas dos
insights em `lg` e a rolagem real não são verificáveis em teste.

## 7 · Gate visual do maestro — telas a conferir

Nenhuma foi vista renderizada por esta lane (restrição: sem navegador). Rota:
`/` (Visão geral do organizador). Em cada tela, **desktop e 375px, 2 temas**
(claro e escuro/wine, conforme a régua padrão do painel):

1. **A grade inteira, com insights disparando.** Confirmar a ORDEM: régua de
   "Indicadores" → **"Insights da Leela"** (largura cheia) → par "Presença por
   semana"/"Formas de pagamento" → "Ocupação dos últimos 5 eventos" →
   "Alertas". O bloco novo é o único item entre a régua e o par.
2. **O bloco com os três insights.** Cada card: tag de tom em texto
   ("Atenção"/"Oportunidade") acima da frase, corpo, e link de caminho
   sublinhado. Em `lg` são 3 colunas; em `md`, 2; abaixo disso, 1. Conferir que
   a **frase do título não é truncada com reticências** — foi por isso que o
   `CardDominio` foi reprovado.
3. **O painel de Alertas, na mesma tela.** Confirmar que a pendência de
   pagamento **não aparece lá** e que os alertas de evento continuam, com "Ver
   agora". Se o único alerta do organizador for a pendência, o painel deve
   dizer "Tudo em dia. Nenhum alerta." — e isso é verdade, não estado feliz
   fabricado.
4. **O bloco sem nenhum insight.** Linha única "Nada pedindo atenção agora." —
   nunca card vazio com cara de bloco quebrado.
5. **O bloco em carregamento.** "Lendo os números…" enquanto o `getOverview`
   não voltou, e a cascata de entrada rodando uma vez só (o bloco novo entra no
   passo 3 — conferir que o escalonamento não ficou com buraco depois da
   renumeração).
6. **Clique no caminho.** "Ver seus eventos" e "Ver seus clubs" navegam **pelo
   SPA** (sem recarregar a página inteira). É botão, não `<a href>`, pela mesma
   razão do `LinkV3` dos alertas.
7. **Regressão do Engajamento** (`/clubes/engajamento`): o bloco de lá continua
   idêntico depois da promoção do componente — mesma posição, mesma legenda
   ("Leitura automática dos números deste recorte."), mesmos dois insights com
   caminho de **âncora**.

## Aterrissagem

Commits desta lane, todos com `[vg-insights-20260817]`:

- `a7ffcf9d` — refactor: o bloco vira peça única das duas telas (RN-568)
- `0f9c5155` — feat: os Insights na Visão geral e a reconciliação com os alertas (RN-573)
