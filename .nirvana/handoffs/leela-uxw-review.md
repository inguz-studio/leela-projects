# Handoff — UXW-REVIEW · revisão de UX writing do painel

- **trace_id:** `leela-redesign-v2-20260810` · lane UXW-REVIEW
- **alvo:** strings visíveis ao usuário no diff `e64b8c47..HEAD` da branch `redesign-engajamento-v2` (worktree `C:\dev\leela-wt-redesign-v2`), escopo `apps/painel` + `packages/design-system`
- **modo:** READ-ONLY. Nenhum arquivo de código foi editado. A aplicação é de outra lane.
- **cânone consultado:** `leela-specs/03-canon/epics/LEELA-E12-landing.md` (D-0802-1, ~l.131) e `leela-specs/02-rodadas/2026-08-05-metricas-e-servico/03-rns-delta.md` (RN-489)

## Leitura do cânone que orientou esta revisão

D-0802-1 diz que **"experiência" é o termo guarda-chuva e "participante" é quem compra**; corrida, prova e atleta são instâncias de um evento, **nunca a categoria**. A fronteira que a diretriz não atravessa é plataforma × organizador: o nome, a descrição e as modalidades que o organizador escreve ficam intactos.

Por isso `resumirModalidades` continua devolvendo "corrida" como rótulo de barra sem virar achado (é a modalidade que o organizador cadastrou), enquanto "Atletas alcançados" num KPI da plataforma é bloqueador. Nenhum uso de "experiência" ou "participante" foi flagrado — ao contrário, os pontos onde eles foram substituídos por "atleta" e "prova" estão na lista abaixo.

## Contagem

| Categoria | Bloqueadores | Melhorias | Total |
|---|---|---|---|
| 1 · vocabulário D-0802-1 e jargão interno | 17 | 3 | 20 |
| 2 · vocabulário canônico (RN-468, "Clubs") | 2 | 2 | 4 |
| 3 · vícios de linguagem de IA | 0 | 5 | 5 |
| 4 · clareza e carga cognitiva | 0 | 8 | 8 |
| 5 · honestidade de dado | 1 | 2 | 3 |
| **Total** | **20** | **20** | **40** |

Dois itens de categoria 2 foram promovidos a bloqueador e estão marcados como tal: são violação de RN-468 e de consistência de termo visíveis na mesma dobra, não preferência de estilo.

---

## Bloqueadores

### Categoria 1 · corrida, prova e atleta usados como categoria (D-0802-1)

| # | arquivo:linha | string atual | problema | proposta |
|---|---|---|---|---|
| BLQ-01 | `apps/painel/src/routes/clubes/hub/HubClubes.tsx:51` | `<KpiCard label="Atletas alcançados" ... hint="somados entre os clubes" />` | "Atletas" é o rótulo da plataforma para as pessoas da comunidade. É a categoria, não a instância. | `label="Pessoas alcançadas"` · `hint="somadas entre os clubs"`. O campo interno `atletasAlcancados` pode ficar; o cânone governa o rótulo. |
| BLQ-02 | `apps/painel/src/routes/clubes/engajamento/EngajamentoView.tsx:591` | "Assim que o primeiro atleta usar o código, um convite ou o link do club, a porta dele aparece aqui." | "atleta" como quem entra num club de bem-estar. | "Assim que a primeira pessoa entrar pelo código, por um convite ou pelo link do club, a porta dela aparece aqui." |
| BLQ-03 | `.../engajamento/EngajamentoView.tsx:367` | "A modalidade é a do club — não é interesse declarado pelo atleta, que o sistema não guarda — e uma pessoa ativa em dois clubs conta em cada um." | "atleta"; e o travessão duplo empilha três orações numa frase só. | "A modalidade é a do club, não um interesse que o membro declarou: esse campo não existe. Uma pessoa ativa em dois clubs conta nos dois." |
| BLQ-04 | `.../engajamento/EngajamentoView.tsx:638` | "...os registros de atividade do atleta não são legíveis pelo organizador." | "atleta" + "não são legíveis" (permissão descrita em termos de sistema). | "...e os registros de atividade de cada participante não ficam disponíveis para o organizador." |
| BLQ-05 | `.../engajamento/EngajamentoView.tsx:669` | "Quanto da atividade em andamento já está apontada para uma prova sua." | "prova" como categoria do evento na voz da plataforma. | "Quanto da atividade em andamento já está apontada para um evento seu." |
| BLQ-06 | `.../engajamento/EngajamentoView.tsx:677` | "Vincular um desafio a um evento transforma o treino da comunidade em preparação para a sua prova." | "prova" e "treino" — os dois amarram a frase a corrida. Num retiro de bem-estar a frase fica falsa. | "Vincular um desafio a um evento transforma a atividade da comunidade em preparação para o seu evento." |
| BLQ-07 | `.../engajamento/EngajamentoView.tsx:711` | legenda da seção 3: "O resultado: ocupação das provas e como as pessoas pagam." | "provas" como categoria, logo abaixo de um título que já diz "Eventos". | "O resultado: ocupação dos eventos e como as pessoas pagam." |
| BLQ-08 | `apps/painel/src/routes/parcerias/assessorias/AssessoriasPage.tsx:163` | "Cadastre uma assessoria como club parceiro para dar condição de desconto aos atletas dela." | "atletas" como quem compra inscrição. O cânone crava "participante" para esse papel. | "Cadastre uma assessoria como club parceiro para dar condição de desconto aos participantes dela." |

### Categoria 1 · jargão interno vazando ao usuário

Mesma classe do achado "(E18)" já pago na AJUSTES-DONO. O comentário em `AssessoriasPage.tsx:132` registra aquele corte — e o mesmo arquivo mantém duas ocorrências de número de RN duas dezenas de linhas abaixo.

| # | arquivo:linha | string atual | problema | proposta |
|---|---|---|---|---|
| BLQ-09 | `.../parcerias/assessorias/AssessoriasPage.tsx:218` | "...O registro é retido por 90 dias (RN-144) e não pode ser reativado — recadastro é uma nova parceria." | "(RN-144)" é número de regra interna num modal de confirmação. | "...O registro é retido por 90 dias e não pode ser reativado: recadastrar cria uma parceria nova." |
| BLQ-10 | `.../parcerias/assessorias/AssessoriasPage.tsx:236` | `keeps`: "O histórico da parceria (retido 90 dias — RN-144)" | Segunda ocorrência de "RN-144" na mesma tela. | "O histórico da parceria, retido por 90 dias" |
| BLQ-11 | `.../parcerias/assessorias/AssessoriasPage.tsx:147` | "Não foi possível identificar seu tenant. Recarregue a página ou entre novamente." | "tenant" é vocabulário de arquitetura multi-inquilino. Ninguém fora do time sabe o que é. | "Não foi possível identificar o organizador desta conta. Recarregue a página ou entre novamente." |
| BLQ-12 | `.../parcerias/assessorias/AssessoriasPage.tsx:146` | título do estado: "Sessão sem organizador" | "Sessão" descreve o sistema, não o job de quem lê. | "Conta sem organizador vinculado" |
| BLQ-13 | `apps/painel/src/routes/parcerias/afiliacoes/InfluenciadoresPage.tsx:284` | `caption="Influenciadores do tenant"` | "tenant" na legenda da tabela — lida por leitor de tela, é texto de usuário. | `caption="Influenciadores do organizador"` |
| BLQ-14 | `.../parcerias/afiliacoes/InfluenciadoresPage.tsx:317` | "...A ação é idempotente: reenviar não debita duas vezes." | "idempotente" é termo de engenharia num modal de dinheiro. | "...Se você reenviar, o valor não é debitado duas vezes." |
| BLQ-15 | `.../engajamento/EngajamentoView.tsx:629` | "...que vive no registro de cada atleta, e as Rules não abrem esse caminho para o organizador. O agregado do desafio guarda pontos médios por pilar, nunca a contagem nem a ação que a formou." | "Rules" (Security Rules do Firestore), "agregado", e "atleta" na mesma causa. Três vazamentos numa frase. | "Cada check-in fica no registro pessoal de quem o fez, e o organizador não tem acesso a esse registro. O que o desafio guarda é a média de pontos por pilar, nunca a contagem de ações." |
| BLQ-16 | `.../engajamento/EngajamentoView.tsx:733` | "O doc de pagamento guarda a forma (PIX ou cartão), mas nenhum agregado por forma de pagamento chega ao cliente — e este painel não varre documentos financeiros para somar por conta própria." | "doc", "agregado", "varre documentos". Pior: **"chega ao cliente"** — para uma organizadora, "cliente" é quem compra inscrição, não o app. A frase lê como se o comprador não recebesse algo. | "Cada pagamento registra se foi PIX ou cartão, mas ainda não existe um total por forma de pagamento. Quando ele existir, o gráfico aparece aqui." |
| BLQ-17 | `.../engajamento/EngajamentoView.tsx:702` | "...quais membros de club compraram uma inscrição (o cadastro de cliente não carrega o vínculo com o club). Sem as duas, qualquer taxa aqui seria chute com cara de número." | "o cadastro de cliente não carrega o vínculo" é modelo de dados descrito ao usuário; "chute com cara de número" é voz interna de time. | "...e quais membros de club compraram inscrição — hoje as duas coisas não ficam ligadas. Sem elas, qualquer porcentagem aqui seria inventada." Ver também MEL-02: este card não segue o padrão de em-breve da casa. |

### Categoria 5 · mentira de dado

| # | arquivo:linha | string atual | problema | proposta |
|---|---|---|---|---|
| BLQ-18 | `apps/painel/src/routes/eventos/evento/overview/OverviewKpis.tsx:115` | hint do KPI "Taxa de conversão": "visitantes → inscritos" | **RN-489 proíbe literalmente esta string**: "o rótulo `visitantes → inscritos` não é renderizado enquanto o denominador não existir — hoje ele aparece sempre, inclusive com valor `—`, prometendo uma capacidade ausente". A contagem de visitantes não existe em camada nenhuma. E a mesma rodada publica, em `EngajamentoView.tsx:702`, a frase "nenhuma contagem de visitante existe" — duas telas do mesmo build se contradizem. | Remover o hint. O default da RN-489 (item CONV-1) é **esconder o card inteiro** enquanto não houver denominador; se o dono preferir manter o card, ele fica com "—" e sem rótulo de fonte. Decisão do dono, não da lane. |

### Categoria 2 · vocabulário canônico (promovidos a bloqueador)

| # | arquivo:linha | string atual | problema | proposta |
|---|---|---|---|---|
| BLQ-19 | `apps/painel/src/shell/AlternadorDePainel.tsx:47` | `return estaNoPainelMaster(pathname) ? 'Painel Master' : 'Painel do Organizador';` — renderizado em `RootShell.tsx:99` | RN-468 nomeia **"Painel Profissional"**, e o próprio alternador a um clique de distância diz "Acessar painel profissional" (l.61). O mesmo painel tem dois nomes visíveis no mesmo rail. O comentário do arquivo (l.50-58) cita a RN-468 e mesmo assim a função devolve o nome antigo. | `'Painel Profissional'`. Manter "Painel Master" do outro lado. |
| BLQ-20 | `packages/design-system/src/components/Sidebar/Sidebar.tsx:156` + `apps/painel/src/routes/clubes/_lib/areaNav.ts:33` + `HubClubes.tsx:93` + `ClubeShell.tsx:88` | menu principal e vitrine dizem **"Clubs"**; o SubNav da área, o cabeçalho do hub e a trilha dizem **"Clubes"** | Um clique separa os dois. Dentro de Engajamento as duas grafias convivem numa dobra só: a aba "Clubes" (areaNav) sobre a faixa "Clubs" (`EngajamentoView.tsx:485`), o KPI "Clubs" (l.505) e o filtro "Todos os clubs" (l.435). E `areasDaVitrine.ts:22` declara o contrato no próprio comentário — "Título da área, na mesma palavra que o menu usa" — enquanto o menu diz "Clubs" e o hub diz "Clubes". | "Clubs" é a grafia da casa (`Sidebar.tsx:156`, `areasDaVitrine.ts:47`, `ComunidadeResumo.tsx:48`). Alinhar os quatro pontos divergentes: `areaNav.ts:33` → `'Clubs'`; `HubClubes.tsx:93` → `title="Clubs"`; `ClubeShell.tsx:88` → `label: 'Clubs'`; e o corpo de `HubClubes` (l.141 "Meus clubes", l.158 "Clubes parceiros", l.127-128, l.176-177). |

---

## Melhorias

### Categoria 4 · clareza e carga cognitiva

| # | arquivo:linha | string atual | problema | proposta |
|---|---|---|---|---|
| MEL-01 | `.../engajamento/EngajamentoView.tsx:478` | "Não foi possível carregar o engajamento da sua comunidade. Os números desta tela só aparecem completos — nenhum bloco mostra parte do dado como se fosse o todo." | A segunda frase é justificativa de projeto dirigida a quem revisa, não a quem trabalha. E o bloco não oferece nenhuma saída: sem botão de tentar de novo, a organizadora só pode recarregar a página. O irmão `HubClubes.tsx:123` já faz certo. | "Não foi possível carregar o engajamento da sua comunidade. Tente novamente." + botão "Tentar novamente" (precedente em `AssessoriasPage.tsx:158`). |
| MEL-02 | `.../engajamento/EngajamentoView.tsx:697-703` | `SecaoHead titulo="Conversão da base"` + `EmptyState title="A conversão da base ainda não é mensurável"` | Cinco irmãos na mesma tela seguem o padrão da casa (nome da métrica no `SecaoHead` · "Em breve" no `EmptyState` · causa em uma frase). Este é o único que quebra os três: o título do estado é uma frase inteira, "em breve" não aparece, e a causa tem 52 palavras. Quem varre a tela lê "não é mensurável" como defeito permanente. | Trocar por `CardEmBreve` (o componente já existe, l.208): `titulo="Conversão da base"`, `causa` de uma frase (ver BLQ-17). O "Em breve" passa a vir do componente. |
| MEL-03 | `.../engajamento/EngajamentoView.tsx:629` | causa do card "Check-ins realizados", 4 frases / ~70 palavras | É a causa mais longa da tela; o padrão da casa é **causa em uma frase**. Além do jargão de BLQ-15, ela descreve o bloco do estudo antes de dizer por que não há número — ordem invertida em relação aos irmãos. | Uma frase de causa (BLQ-15) e nada mais. O que o bloco vai mostrar quando existir é conteúdo de roadmap, não de tela. |
| MEL-04 | `.../engajamento/EngajamentoView.tsx:636` e `:641` | "Mapa de Check-ins" · "Volume de Check-ins" | Title Case em heading, contra o contrato de escrita da casa. O irmão da linha 627 já está certo ("Check-ins realizados"), e os dois ficam lado a lado. | "Mapa de check-ins" · "Volume de check-ins" |
| MEL-05 | `.../engajamento/EngajamentoView.tsx:522` | "Média de pontos por participante em cada pilar sobre o mínimo exigido, ponderada pelo tamanho dos desafios que operam equilíbrio." | Uma frase com três qualificações encaixadas ("por participante", "sobre o mínimo exigido", "ponderada pelo tamanho"). Uma organizadora leiga termina sem saber o que a barra mede. | "Quanto a comunidade acumulou em cada pilar, em média por participante, comparado ao mínimo do desafio. Desafios com mais gente pesam mais na média." |
| MEL-06 | `.../engajamento/EngajamentoView.tsx:283` e `:366`; aria-labels em `:289` e `:372` | "Troque o recorte para ver todos." · `aria-label="Recorte do ranking de desafios"` · `aria-label="Recorte das modalidades"` | "Recorte" é vocabulário do card, declarado como tal no código (l.244 e l.330) — e mesmo assim chega ao usuário, inclusive por leitor de tela. Ninguém fora do time chama um filtro de recorte. | "Troque para 'Todos' para ver a lista inteira." · `aria-label="Quantos desafios mostrar"` · `aria-label="Quantas modalidades mostrar"` |
| MEL-07 | `.../engajamento/_lib/engajamento.ts:51` | `inativo: 'Sem registro (30 dias+)'` | "Sem registro" lê como "não se cadastrou". O que a barra mede é gente parada, não gente sem cadastro. O próprio comentário acima (l.40-46) descreve o estado como "entrou há 30 dias ou mais, sem nenhum registro de atividade desde então". | `'Parados há 30 dias ou mais'` |
| MEL-08 | `.../parcerias/afiliacoes/InfluenciadoresPage.tsx:317` | "Registra que você PAGOU a comissão fora da plataforma..." | Caixa alta para ênfase em texto corrido. O contrato da casa não usa esse recurso, e num modal de dinheiro ele soa como acusação. | "Registra que você já pagou a comissão fora da plataforma (nenhum dinheiro é movido aqui)." |
| MEL-09 | `apps/painel/src/routes/clubes/hub/HubClubes.tsx:50` | `hint={`${formatInt(kpis.meusClubes)} seu(s)`}` | "seu(s)" com plural entre parênteses. Solução de programador para concordância, visível na tela. | `hint` com a forma escrita por extenso: `${n} ${n === 1 ? 'é seu' : 'são seus'}` |

### Categoria 3 · vícios de linguagem de IA e frases que não pagam o espaço

O dono cortou 4 subtítulos de `PageHeader` na AJUSTES-DONO-T7 e o jargão "(E18)". Os itens abaixo são sobreviventes da mesma classe — motivacionais, sem ação, restatando o que o bloco ao lado já mostra.

| # | arquivo:linha | string atual | problema | proposta |
|---|---|---|---|---|
| MEL-10 | `.../engajamento/EngajamentoView.tsx:464` | "O engajamento nasce da comunidade. Crie um club e esta tela passa a contar quem aparece, o que move o grupo e quanto disso chega aos seus eventos." | Abertura de enchimento ("X nasce de Y") seguida de tricolon — a assinatura de abertura genérica. Pior: "passa a contar quem aparece" promete contagem de presença que a mesma tela declara ausente três vezes (l.629, 638, 643). | "Crie um club e esta tela passa a mostrar quem está na sua comunidade, o que move o grupo e quanto disso chega aos seus eventos." |
| MEL-11 | `.../engajamento/EngajamentoView.tsx:284` | "...um desafio encerrado teve o ciclo inteiro, e comparar os dois não compara coisas comparáveis." | Circular: a frase se explica com a própria palavra que deveria explicar. | "...um desafio encerrado já teve o ciclo inteiro, e o que está em andamento está no meio dele." |
| MEL-12 | `.../engajamento/EngajamentoView.tsx:583` | "A porta por onde cada membro chegou ao club. Canal sem ninguém sai da lista: barra zerada ocupa espaço e não informa." | A segunda frase é razão de projeto endereçada ao designer. A mesma sentença já vive como comentário de código no lugar certo (`_lib/engajamento.ts:243`). | "A porta por onde cada membro chegou ao club. Canais sem ninguém não aparecem." |
| MEL-13 | `.../engajamento/EngajamentoView.tsx:306` | "Um desafio ativo é o que dá à comunidade uma razão para aparecer entre um evento e outro." | Frase de estímulo sem ação, na forma "X é o que faz Y". Estado vazio sem CTA. | "Crie um desafio para a comunidade ter o que fazer entre um evento e outro." — ou cortar, se o dono quiser o estado vazio seco. |
| MEL-14 | `.../engajamento/EngajamentoView.tsx:191` | "{pilar} é o pilar com a maior média por participante." | Diz em texto o que a barra mais alta já diz em desenho, logo acima. É a última frase de apoio sob gráfico que sobreviveu ao corte R8. | Vetável do dono: cortar, ou manter só se ela ganhar o número ("Físico lidera, com 8,4 pontos por participante"). |

### Categoria 1 · jargão de menor gravidade

| # | arquivo:linha | string atual | problema | proposta |
|---|---|---|---|---|
| MEL-15 | `.../parcerias/assessorias/AssessoriasPage.tsx:135` | "Clubs parceiros com condição de desconto exclusiva — sem comissão, sem split." | "split" é jargão de meios de pagamento. É também o último subtítulo de `PageHeader` de pé na área depois do corte R8, então convém que ele se pague inteiro. | "Clubs parceiros com condição de desconto exclusiva, sem comissão e sem divisão de receita." |
| MEL-16 | `.../parcerias/assessorias/ParceriaDetailPage.tsx:50` | "Já existe um cupom com esse código neste evento (outro escopo/parceria). Use outro código." | "escopo" é vocabulário de regra de negócio. O parêntese não muda o que a pessoa faz a seguir. | "Já existe um cupom com esse código neste evento. Use outro código." |
| MEL-17 | `.../parcerias/assessorias/CadastrarAssessoriaPage.tsx:41` | "Você não tem permissão para cadastrar assessorias neste organizador." | "neste organizador" trata o organizador como recipiente. Lê errado em português. | "Você não tem permissão para cadastrar assessorias nesta conta de organizador." |

### Categoria 2 · consistência menor

| # | arquivo:linha | string atual | problema | proposta |
|---|---|---|---|---|
| MEL-18 | `clubes/_components/ClubesAreaNav.tsx:22` · `parcerias/_components/ParceriasAreaNav.tsx:22` · `parcerias/afiliacoes/AfiliacoesLayout.tsx:47` · `clubes/clube/ClubeShell.tsx:106` | "Seções de clubes" · "Seções de **P**arcerias" · "Seções de afiliações" · "Seções do clube" | Quatro navs nascidas na mesma rodada, uma delas com maiúscula no meio da frase. | Sentence case nas quatro: "Seções de clubs", "Seções de parcerias", "Seções de afiliações", "Seções do club". |
| MEL-19 | `packages/design-system/src/components/Sidebar/Sidebar.tsx:154` | `label: 'Visão Geral'` | Title Case no menu principal, contra "Visão geral" em `areasDaVitrine.ts:85`. As duas aparecem na mesma navegação. | `'Visão geral'` nos dois lugares. |

### Categoria 5 · honestidade

| # | arquivo:linha | string atual | problema | proposta |
|---|---|---|---|---|
| MEL-20 | `.../eventos/evento/overview/OverviewKpis.tsx:99` | `value={typeof ticketMedio === 'number' ? formatBRL(ticketMedio) : '—'}` | Justo na rodada que trocou o denominador do ticket médio (D-1008-R19), o card passa a mostrar "—" sem dizer por quê. O padrão da casa, aplicado em cinco cards da tela de Engajamento, é nomear a causa. | Quando `ticketMedio` for `null`, mostrar no slot de apoio: "sem venda confirmada ainda". |
| MEL-21 | `apps/painel/src/routes/clubes/clube/ClubeShell.tsx:56` | "Página: be-hero.com.br/c/{slug}" | O cânone (`LEELA-E12-landing.md`, §Domínio público) diz que o domínio não está fixado e que `be-hero.com.br` **não** deve ser hardcoded — o placeholder é `{leela-domain}`. A tela entrega à organizadora um endereço para divulgar. Achado **pré-existente**, não introduzido nesta rodada; entra porque a superfície foi tocada e porque o custo do erro é externo. | Ler o domínio de configuração, ou omitir a linha até o domínio ser decidido. |

---

## Fora do alvo, conferido e não flagrado

- **As 7 recusas da ponte NÃO** — landing/main, outra rodada, conforme o brief.
- **Rótulos "Acessar painel master" e "Acessar painel profissional"** (`AlternadorDePainel.tsx:61-62`) — corretos, batem com a D-1008-R6 e com a RN-468. O defeito é o vizinho `nomeDoPainelAtual` (BLQ-19).
- **"Parcerias"** como nome da área nova (`parcerias/_lib/areaNav.ts:33-35`, `Sidebar.tsx:162`) — consistente em rail, vitrine, moldura e trilha. Nada a apontar.
- **"Modalidades da comunidade"** (`EngajamentoView.tsx:363`) — a correção de honestidade citada no brief está de pé: o título não promete "interesse declarado", e a ajuda diz o que se mede. O problema remanescente é só "atleta" dentro da ajuda (BLQ-03).
- **Trilha "Clubes › {nome}"** (`ClubeShell.tsx:88`) — a anatomia está certa (âncora SPA de verdade, volta para a listagem). Só a grafia entra em BLQ-20.
- **Rótulos de modalidade vindos do organizador** (`resumirModalidades`, `_lib/engajamento.ts:319`) — "corrida" como rótulo de barra é conteúdo do organizador. A D-0802-1 não atravessa essa fronteira.
- **Em-breves da banda Eventos** (`EmBreveV3`, "Formas de pagamento") — o padrão está certo; o texto da causa é que vaza jargão (BLQ-16).

## Nota para a lane de aplicação

BLQ-18 (`visitantes → inscritos`) não é reescrita de string: a RN-489 manda **não renderizar** o rótulo e dá ao dono a decisão de esconder o card. Aplicar como corte, não como troca de texto, e registrar o vetável.

BLQ-20 mexe em quatro arquivos e em testes que fixam o nome acessível (`apps/painel/src/test/nomeAcessivel.ts`, `moldura-da-area.test.tsx`, `sidebar.test.ts`). Não é achado de uma linha.
