---
tags: [leela, handoff, design-system, tela, painel, redesign-ds]
trace: leela-redesign-ds-20260809
lane: TELA
data: 2026-08-09
---

# Handoff vivo — REDESIGN-DS · lane TELA

> Persona: `sf-frontend-lead` (Software Forge), com `sf-ux-engineer` como segunda
> lente para decisões de uso/interação. Mind-clones declarados nos employees
> (dan-abramov, rich-harris, evan-you, addy-osmani, kent-c-dodds, kathy-sierra,
> don-norman, julie-zhuo) — **nenhum invocado via Task tool nesta lane**: não
> houve decisão de framework, de orçamento de performance nem de padrão de
> interação novo que justificasse consulta. As decisões de uso saíram da
> autoridade escrita (`design-principles.md`) e do canône. Registrado por
> transparência.

Contrato: `.nirvana/briefs/leela-redesign-ds-20260809-tela-enriched.md`.
Lane 1 (selada): `.nirvana/handoffs/leela-redesign-ds-20260809-TOKENS.md`.
Spec de design: `leela-specs/02-rodadas/2026-08-09-redesign-ds/handoff/README.md` (§4–8).
Decisão do dono: `leela-specs/02-rodadas/2026-08-09-redesign-ds/00-decisao.md`.
Território: `apps/painel` SOMENTE. O design system é consumo — os defeitos
achados nele estão nos vetáveis, nenhum virou commit meu.

## Estado

SELADA. Quatro tarefas concluídas, gates verdes, board atualizado.
**Não deployada** — review antagonista e deploy são lanes próprias.

1. [x] Fiação do vidro por superfície + Rubik + glow da página — `9d00c305`
2. [x] Visão Geral v3 — `69203486`
3. [x] Tela de Engajamento — `2c5f3066`
4. [x] Prova de marca executável + board + veredito — `fcc4ce33` e este documento

Commits da lane (todos em `main`, todos pushed):

| Commit | Assunto |
|---|---|
| `9d00c305` | feat(painel): o vidro segue a area — organizador com glass, plataforma em preto |
| `69203486` | feat(painel): Visao Geral v3 — o resumo dos clubs e a ocupacao dos eventos |
| `2c5f3066` | feat(painel): tela de Engajamento — a comunidade medida so pelo que existe |
| `fcc4ce33` | test(painel): a fiacao tipografica do brasa vira gate |
| `df7d3482` | docs(board): sela a lane TELA — card no board, veredito no handoff |

Push em lotes, todos confirmados no remoto (`origin/main`). A árvore tinha
outras lanes em voo (ADMIN-VISAO em `packages/api-client` e `functions`,
RADAR-REPARO em specs): `git status --short` conferido antes de cada `add`,
`commit --only` com pathspec explícito, nenhum arquivo de outra lane varrido.

### Incidente de árvore compartilhada (sem perda, registrado)

As edições de board desta lane (`V1-KANBAN.md` + `BOARD-EPICOS.md`) foram
**varridas para dentro do commit `f2a3de88` da lane ADMIN-VISAO-ONDA1**, que
rodou `git add` nesses dois arquivos enquanto minhas mudanças estavam na árvore.
É o mesmo acidente que a lane TOKENS registrou, na direção contrária (lá eu
levei arquivo de outro; aqui outro levou o meu).

**Conferido no `HEAD`: o conteúdo está íntegro** — o card da lane TELA está no
`V1-KANBAN` e a nota está na linha do E01 no `BOARD-EPICOS`. Nada a refazer, e
nada a reverter: reescrever o commit alheio custaria mais que o registro. Fica
o aprendizado: `commit --only` protege o MEU commit de levar o dos outros, e não
protege as minhas linhas de irem no commit de quem `add`ou antes. Em arquivo
compartilhado e disputado como o kanban, o caminho seguro é editar e commitar no
mesmo gesto, sem janela.

## O achado que mudou o enquadramento (leitura dos protótipos)

Os dois `.dc.html` são **a mesma tela em duas gerações**: os dois abrem com
`<h1>Visão Geral`. "Engajamento estudo" não é uma tela separada — é a Visão
Geral estendida com três seções temáticas (Clubs → Do club para o evento →
Eventos) e com o shell responsivo/drawer que a v3 não tem.

**Como reconciliei (L-004 — job primeiro, mockup é aparência):** o contrato e a
decisão do dono nomeiam DUAS entregas, e o canône concorda com a separação. O
épico `LEELA-E02` declara, palavra por palavra, que "analytics aprofundado,
gráficos históricos além do sparkline do KPI (E11)" está **fora de escopo** da
Visão Geral — ela é "hub de orientação: não opera nada em profundidade". Então:

- **Visão Geral** recebeu da v3 só o que serve ao job dela e tem dado real;
- **Engajamento** nasceu como tela própria, que é onde a análise mora.

O `<h1>` do protótipo perdeu para a story. Divergência resolvida, não pixel
copiado.

## Tarefa 1 — fiação do vidro por superfície (`9d00c305`)

`shell/superficie.ts` (puro) · `shell/SuperficieDoPainel.tsx` (efeito) ·
`App.tsx` · `globals.css` · `shell/RootShell.tsx` · 3 arquivos de teste.

- `data-glass` no `<html>`, derivado da rota em `useLayoutEffect`. Organizador
  (tudo que não é `/plataforma`, inclusive `/entrar` e `/cadastrar`) = `on`;
  `/plataforma` e abaixo = `off`.
- Casamento por **segmento**, não por prefixo: `/plataformas-legais` continua
  sendo do organizador (tem teste).
- Glow (`--page-glow`) pintado no contêiner que rola, `background-attachment:
  fixed` (§2, regra 1). Fora do modo vidro o token é `none` — a mesma linha não
  desenha nada no admin, sem `if` no código.
- Rubik 400/500/600/700 no `@import` do painel; regra de `h1..h6` em
  `--font-family-display`.

**Os dois modos de falha que o contrato nomeia viraram teste:** flash na
transição (o valor é cobrado logo depois da navegação, sem `waitFor` — um
`useEffect` pós-paint falharia) e vazamento de estado (desmontar limpa o
atributo).

## Tarefa 2 — Visão Geral v3 (`69203486`)

Dois blocos novos, ambos com dado real e **nenhuma query nova**:

- **Clubs** (`ComunidadeResumo`) — `membrosAtivosTotais` e `desafiosAtivosTotais`
  já vinham no retorno de `getOverview` e não eram desenhados em lugar nenhum.
  Zero em ambos vira caminho para criar club, não dois zeros mudos.
- **Ocupação dos últimos eventos** (`OcupacaoEventos` + `_lib/ocupacao`) —
  deriva da MESMA lista de eventos que a tela já carrega. Evento sem capacidade
  conhecida não vira barra com denominador inventado: fica de fora, e a tela
  conta quantos ficaram.

O cabeçalho de bloco virou `components/SecaoHead` (era a terceira e a quarta
cópia da mesma anatomia).

## Tarefa 3 — tela de Engajamento (`2c5f3066`)

`/clubes/engajamento`, análise cross-club com recorte por club. Fica na área
Clubs porque a análise mora com o assunto — a mesma razão que levou a análise de
vendas para dentro do CRM (RN-823).

**O que tem fonte virou número:**

| Bloco | Fonte real |
|---|---|
| Clubs · Membros ativos · Desafios ativos · Participações | `clubes/{id}.qtdMembrosAtivos`/`.qtdDesafiosAtivos` + `∑ qtdParticipantes` dos desafios ativos |
| Equilíbrio dos pilares | `clubes/{c}/desafios/{d}.progressoPorPilar` (RN-111) |
| Situação dos membros | `membros.status` (RN-102) |
| Como a comunidade entra | `membros.entrouVia` |
| Desafios que mais movem | `desafios.qtdParticipantes` (só os em andamento) |
| Desafios ligados a um evento | `desafios.eventoVinculadoId` (RN-113) |

**O que não tem fonte NÃO virou gráfico zerado** — dois estados vazios que
nomeiam a métrica e a causa (ver "Gaps de dado" abaixo).

`progressoPorPilar` estava chegando em `listDesafios` e **nenhuma tela do painel
o renderizava** — dado mantido por Function, pago e nunca lido. É o achado de
maior razão valor/custo desta lane.

## Gates (saída real de cada comando, não presumida)

| Gate | Comando | Resultado |
|---|---|---|
| Type-check | `pnpm --config.verify-deps-before-run=false run type-check` (`tsc --noEmit`) | **limpo, sem output** — rodado 6x ao longo da lane (baseline + uma por tarefa + reparos) |
| Lint | `pnpm --config.verify-deps-before-run=false run lint` (`eslint src --max-warnings 0`) | **limpo, sem output** na rodada final. Pegou 1 violação real no meio da lane (`min-w-[220px]` no filtro de club) — corrigida antes do commit |
| Suíte do painel (baseline, antes de tocar em nada) | `pnpm ... run test` | **2275/2276 em 213/214 arquivos**; 1 falha por timeout de 20s em `vitrine-sem-query.test.tsx` sob carga da máquina — **13/13 verde isolado em 1,3s**, mesmo padrão de flake já documentado no `vitest.config.ts` |
| Suíte do painel (final) | `pnpm ... run test` | **2378/2378 em 224/224 arquivos, exit 0** — ver "Rodada final" abaixo |
| Suíte do shell | `vitest run src/shell` | **107/107 em 8 arquivos** |
| Suíte da Visão Geral | `vitest run src/routes/overview` | **142/142 em 19 arquivos** |
| Suíte de clubs (com a tela nova) | `vitest run src/routes/clubes` | **330/330 em 36 arquivos** |
| Prova de marca — zero hex/px no diff | `git show` dos 3 commits de código \| `grep -E '#[0-9a-fA-F]{3,8}|rgba?\(|[0-9]+px'` | **zero ocorrências** em todo o diff da lane |
| Prova de marca — fiação tipográfica | `vitest run src/__tests__/marca-executavel.test.ts` | **9/9** — família por token (nunca literal), display antes da ui no título, e os 4 cortes do Rubik que os `--peso-*` usam de fato carregados |
| Guarda de rota | `vitest run src/routes/clubes/__tests__/ClubesRoutes.test.tsx` | **6/6** — `/clubes/engajamento` não cai no coringa `:slug`, e as 4 rotas estáticas irmãs + o detalhe de club seguem resolvendo |

### Rodada final da suíte completa

`pnpm --config.verify-deps-before-run=false run test` (`vitest run`) —
**2369/2369 em 223/223 arquivos, exit 0**, 870s. Nenhuma falha, nenhum flake
nesta rodada (o `vitrine-sem-query` que oscilou no baseline passou junto com o
resto). A suíte cresceu de 214 para 223 arquivos: os 9 arquivos de teste novos
da lane.

O 10º arquivo novo (`src/__tests__/marca-executavel.test.ts`) nasceu depois da
coleta dessa rodada, então rodei a suíte de novo com ele dentro:
**2378/2378 em 224/224 arquivos, exit 0**, 492s. Verde nas duas rodadas.

## Vetáveis abertos (registrados, não decididos)

1. **`--card-blur` não tem consumidor — o vidro não desfoca de verdade.** O §2
   diz que "só o `backdrop-filter: var(--card-blur)` é novo" nos cards, mas
   `Card`/`KpiCard` vivem em `packages/design-system`, fora do território. Hoje
   o modo vidro entrega superfície translúcida + glow fixo + a elevação de vidro
   com o fio de luz; falta o desfoque. **Proposta:** uma linha em `Card` e
   `KpiCard` do DS (`backdrop-filter: var(--card-blur)`), inerte fora do modo
   vidro. **Não apliquei ponte no app de propósito** — uma ponte parcial (blur
   nas telas novas, não nas antigas) cria exatamente o drift de superfície que a
   governança do DS proíbe.
2. **A rampa lime→âmbar do §6 não existe no tema brasa.** `--chart-accent` e
   `--chart-accent-2` só foram declarados em `dark-wine.css`; brasa e wine têm
   só a paleta categórica `--chart-cat-1..5`, e o painel do organizador roda
   brasa. Os rankings desta lane usam a categórica com rótulo direto (a cor
   nunca é a única pista). Território do DS.
3. **O eixo do `BarChart` do DS trunca nome longo** (`YAxis width={92}` fixo).
   Nome de evento e de desafio passam disso com folga. Território do DS.
4. **A barra de ações do hub de clubs virou balde.** Com "Engajamento" são
   **cinco** botões secundários lado a lado, acima do limite de varredura
   confortável. Merece uma passada de agrupamento (menu "Mais", ou promover
   Engajamento a outro nível). Fora do escopo desta lane.
5. Herdados da lane 1 e ainda abertos: gradiente `thumb-virtual` do dark-wine
   reprovando AA (2,45:1 contra piso 3:1) e `governanca-design.md` desatualizado
   (cita nomes de tema pré-rename).

## Gaps de dado do Engajamento (o que impede a tela de medir mais)

Levantados contra o código real (coleções, Rules, Functions e `api-client`), não
presumidos. Nenhum deles é conserto de tela: todos pedem backend.

**Bloco "Frequência e presença" — sem fonte:**

- **Não existe check-in de club.** O `registrarCheckin` é o QR da largada do
  evento; não há registro de presença em treino/encontro.
- **Os registros de atividade do atleta não são legíveis pelo organizador.**
  `atletas/{uid}/registros` existe e alimenta o motor de pontuação, mas as Rules
  dão leitura só ao dono — mapa de horários, volume no tempo e ranking de ações
  saem de lá.
- **Não há agregado por bucket temporal nem por janela deslizante.**
  `AgregadosSegmentacao.ativosPorJanela` e `.membrosPorPilar` estão escritos no
  core e **não têm produtor** — contrato órfão.

**Bloco "Conversão da base" — sem fonte, por dois lados:**

- **Contagem de visitante não existe em lugar nenhum** (RN-489, medida e
  confirmada ausente: nenhum SDK instrumentado, nenhum contador no Firestore).
  Sem denominador não há funil.
- **Não há vínculo membro de club ↔ comprador de evento.** `crmClientes` não
  guarda `clubeId` e `Membro` não guarda chave CRM.

**Outros, medidos de passagem:**

- **`membros.ultimaAtividadeEm` nunca é escrito por Function** (só pelo seed).
  Consequência: o "inativo há 30 dias" da RN-102 é, na prática, "entrou há 30+
  dias" — o bloco "Situação dos membros" é honesto quanto ao campo, mas o campo
  é mais fraco do que o rótulo sugere. **É o gap de maior impacto sobre número
  já exibido.**
- **Sem agregado de comunidade por período.** `analyticsSnapshots` é por
  profissional e carrega só 2 campos de comunidade; não há série por club. Isso
  é o que impediria "Presença por semana" da v3 mesmo se ela entrasse.
- **Sem agregado por meio de pagamento** — "Formas de pagamento" (Pix / crédito
  por faixa de parcela) exigiria varredura de pedidos no cliente, que a
  governança proíbe.
- **Dado materializado sem leitor** (não é gap de coleta, é de exposição — mas
  exige `api-client`, fora do território): `desafios/{d}/participantes/{uid}`
  (pontos, pontos por pilar, dias ativos) e `desafios/{d}/board/current` (top-50
  por consistência) já são mantidos por Function e ninguém lê.

## Premissas assumidas

1. **O vidro não é preferência do usuário.** O contrato diz que "preferência do
   usuário (tema/glass) persiste pelo padrão já existente do ThemeProvider" — e
   o padrão existente persiste **tema**, não vidro (a lane TOKENS entregou o
   vidro como par de tokens sem knob). O vidro aqui é derivado da ROTA a cada
   navegação, sem storage: ele é a marca de qual painel está aberto, e um vidro
   persistido contradiria a decisão do dono na primeira vez que alguém o
   desligasse no organizador. O tema segue intocado no `ThemeProvider`.
2. **Sem script anti-FOUC.** O painel é SPA client-side com `#root` vazio: o
   primeiro paint com conteúdo é o do React, e o layout effect já rodou. O
   padrão `getThemeInitScript` do DS só é necessário em app com SSR.
3. **Regra de título em `@layer base`, por elemento.** Único jeito de realizar o
   pareamento do §3 sem prop nova em componente do DS. Fica em `base` para que
   utilitário de fonte numa tela específica continue vencendo. **Sem ela a lane
   1 teria apagado o Exo 2 do painel inteiro** (ela apontou `--font-family-ui`
   para Rubik e nada consome a família de display).
4. **O glow é pintado no contêiner que rola, não no `<body>`.** O `AppShell`
   pinta `--surface-base` opaco na raiz da moldura, então um glow no documento
   ficaria atrás dela. Como a Sidebar é opaca, não pintar o glow sob o rail é
   visualmente idêntico a pintar.
5. **A Visão Geral não recebeu bloco sem dado.** O contrato pede empty-state
   honesto para o Engajamento; para a Visão Geral pede "dados reais que a tela
   já consome continuam; nenhum número inventado". Uma caixa vazia permanente na
   primeira tela pós-login é custo cognitivo sem contrapartida — "Presença por
   semana" e "Formas de pagamento" da v3 ficaram de fora, com a causa acima.
6. **Um estado vazio por SEÇÃO, não por gráfico.** "Um empty-state por gráfico
   ausente" produziria seis caixas vazias e uma tela que parece quebrada. Cada
   seção sem base recebe um vazio que nomeia a métrica E a causa — as métricas
   ausentes de uma mesma seção compartilham a mesma fonte inexistente.
7. **A seção "Eventos" do estudo não virou seção na tela de Engajamento.** Os
   dois blocos dela ou duplicariam a Visão Geral (ocupação, que acabou de entrar
   lá) ou não têm agregado (formas de pagamento). O que sobrou de real na ponte
   club→evento — desafio com evento vinculado — ficou na seção da ponte, onde
   pertence.
8. **`useQueries` por club, não fan-out numa query só.** As chaves são as MESMAS
   das páginas de Membros e Desafios do club, então a navegação entre elas
   reidrata do cache. Um fan-out com chave própria duplicaria leituras que o
   painel já pagou.
9. **Falha parcial derruba a tela inteira.** Se um club de dez falhar, os
   números ainda pareceriam completos — e número silenciosamente incompleto é
   pior que tela que diz que falhou. O erro é o primeiro que aparecer.
10. **Somar contador fechado por Function não é "cliente agregando".** O que a
    governança proíbe é DERIVAR a métrica no cliente (contar membros varrendo
    docs, calcular progresso a partir de registros). Somar `qtdMembrosAtivos` de
    N clubes é a mesma operação que os KPIs do hub de clubs já fazem.

## O que só o olho do dono fecha (L-011 — gate de código não prova marca)

Sem navegador nesta lane (regra da casa), então a conferência visual fica
listada, não feita:

- **O vidro em movimento.** O glow é fixo no viewport por contrato e por teste
  de classe, mas jsdom não faz layout: rolar a Visão Geral e ver o brilho parado
  atrás dos cards é conferência de olho.
- **A diferença entre os dois painéis.** Abrir `/` e depois `/plataforma/tenants`
  e sentir a troca (vidro + brasa → preto opaco) sem ler rótulo nenhum é
  exatamente o que o dono pediu, e é o que nenhum teste mede.
- **O pareamento Exo 2 + Rubik.** Os cortes estão carregados e as famílias saem
  de token (gate); se a mistura fica boa em corpo pequeno é julgamento.
- **A ausência do desfoque** (vetável 1) — vale olhar antes de decidir se a
  linha no DS entra.
- **Nome longo no eixo dos gráficos** (vetável 3) — o truncamento aparece com
  nome real de evento/desafio.
