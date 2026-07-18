---
tags: [leela, discovery, benchmark, concorrente, stayf, e13, gymrats, leela-plus, gamificacao, bem-estar]
aliases: [Benchmark Stayf, Stayf, stayf.app]
status: discovery
data: 2026-07-11
fontes-verificadas: [stayf.app/pt-br, stayf.app/how-it-works, stayf.app/pricing, stayf.app/why-stayf, stayf.app/blog (science-behind-workplace-wellbeing-and-productivity), stayf.app/rewards-and-benefits, Apple App Store (id6462422271), Google Play (app.stayf.main, via sumário de busca), EU-Startups, Altair.vc, Startups Magazine, Tracxn/PitchBook (via busca)]
fontes-nao-carregadas: [crunchbase.com/organization/stayf (HTTP 403), Google Play HTML bruto (truncado; conteúdo lido por sumário de busca, não pelo render)]
---

# Benchmark competitivo · Stayf

> O Vitor apontou a stayf.app como referência da dimensão de bem-estar e engajamento da Leela, o eixo heroico (H2): app do atleta (E13), desafios de consistência estilo GymRats (motor E05) e Leela+. A Stayf é uma plataforma de bem-estar corporativo (B2B SaaS) que a empresa compra para engajar funcionários por meio de atividade física, desafios em equipe, uma economia de pontos ("charges") e conteúdo de saúde. Este doc olha o produto, o modelo, o JTBD e, sobretudo, as mecânicas de engajamento, e traduz o que serve para E13, GymRats e Leela+.
> Regra de honestidade: cada afirmação factual carrega fonte mais data; o que não pôde ser confirmado está marcado como **não verificado**. Nenhum preço, número ou mecânica foi inventado.

## Nota de honestidade sobre a coleta (leia antes)

Ao contrário da Shotgun (que bloqueou tudo com HTTP 429), o site da Stayf **carregou bem**. Consegui render de `stayf.app/pt-br` (home), `/how-it-works`, `/pricing`, `/why-stayf`, `/rewards-and-benefits` e do artigo de blog sobre a ciência da plataforma, todos via `WebFetch` em julho/2026. A ficha da **App Store da Apple** (id6462422271) também carregou. O que **não** carregou: o perfil da **Crunchbase** devolveu **HTTP 403**, e o HTML bruto da **Google Play** veio **truncado** (li o texto da descrição por sumário de busca, não pelo render da página).

Consequência prática: a anatomia do produto, o pricing, as personas e as mecânicas abaixo vêm em boa parte do **material da própria Stayf** (marketing e centro de "how it works"), que é fonte interessada. Onde um número é claim de marketing da marca (ROI, engajamento, resultado de cliente), o texto diz isso. Não encontrei review independente de usuário em volume nas buscas (a Apple ainda marca "avaliações insuficientes"; a nota da Google Play não foi capturada), então a leitura de recepção real do usuário fica limitada e sinalizada como tal.

## Nota de maturidade e escopo (para comparação justa)

A comparação cruza produtos de natureza e estágio diferentes.

- A **Stayf** é produto em produção, fundado em 2023 no Reino Unido (Oxford/Londres), com clientes corporativos grandes já rodando (Visa, Coca-Cola, Mars, inDrive, Playrix, Danone, Schneider Electric, Barilla, Johnson & Johnson, entre outros citados em `stayf.app/why-stayf` e na cobertura da EU-Startups, jul/2026). É **B2B**: quem paga é o RH da empresa, e o funcionário é o usuário final, que entra por convite ou código da empresa.
- A **Leela** é infraestrutura para organizadores, clubes e atletas. A dimensão heroica ainda é, em boa parte, especificação e discovery: **E13 (app do atleta)** está na Onda 4 do roadmap, **E05 (clubs, motor de desafios)** está parcialmente construído, e **Leela+** é hipótese de discovery. Onde este doc citar E13/E05/Leela+, leia como "projetado, não no ar".

O ajuste honesto mais importante: a Stayf é **bem-estar corporativo comprado pelo empregador**, não um app de bem-estar que o atleta compra para si. As **mecânicas de engajamento** transferem muito bem para o eixo heroico da Leela; o **modelo de negócio e o go-to-market** (vender para RH) não transferem para o Leela+, que é comunidade e atleta, não folha de pagamento. Copiar a mecânica, não o comprador.

---

## 1. Visão geral

A Stayf se descreve como "bem-estar, gamificação e comunidade corporativa em um app só" (`stayf.app/why-stayf`, jul/2026). O propósito declarado é elevar o bem-estar no trabalho e a cultura da empresa por atividade física e saúde, unindo times e melhorando engajamento, produtividade e satisfação (home `stayf.app/pt-br` e `why-stayf`, jul/2026). O app rastreia mais de 20 tipos de atividade (a ficha da App Store fala "20+"; a página de pricing fala "40+"), sincroniza com wearables e converte esforço em pontos que viram prêmios.

**Origem que importa para a Leela (verificado).** A Stayf foi fundada em 2023, com sede em Oxford/Londres. Um dos fundadores é **Max Zhurilo**, ex-fundador da "I Love Supersport" (descrita como a maior escola de esportes de endurance), da IRONSTAR e da "I LOVE RUNNING"; o co-fundador **Kirill Primaka** vem de venture capital (cobertura da EU-Startups e Altair.vc, mar/2024, lidas em jul/2026). Ou seja, a Stayf é um time que veio do **mundo de corrida e endurance** e pivotou para engajamento corporativo. Para a Leela, que nasce em corrida e endurance e quer a camada de bem-estar/engajamento, isso torna a Stayf uma referência especialmente próxima: é quase o mesmo DNA de fundador, aplicado a outro comprador.

**Financiamento (verificado, com faixa).** Rodada pre-seed de **650 mil euros** (cerca de 700 a 704 mil dólares em fontes agregadoras) de AltaIR Capital, Yellow Rocks e Smart Partnership Capital, com participação da Somersault Ventures e anjos (Mark Younger, ex-Apple, e nomes ligados a Dentsu e Bain), conforme EU-Startups, Startups Magazine, Altair.vc e agregadores Tracxn/PitchBook (mar/2024, lidos em jul/2026). É empresa cedo de estágio, não gigante consolidada; a escala vem dos logos de cliente, não do tamanho da própria startup.

**Modelo em uma linha.** Vender para o RH uma plataforma que transforma atividade física e hábitos saudáveis em jogo coletivo, com desafios, pontos, loja de recompensas, conteúdo e comunidade, medindo engajamento e "bem-estar" para justificar o ROI ao empregador.

---

## 2. Modelo de produto

Reconstruído de `stayf.app/how-it-works`, `/pricing`, `/rewards-and-benefits` e da ficha das lojas (jul/2026).

**O app do funcionário.** Aplicativo iOS, Android e Huawei AppGallery. O usuário conecta wearables, registra atividade, participa de desafios, ganha "charges", gasta na loja, lê conteúdo, conversa em chats e vê o próprio progresso e estatística pessoal. A ficha da App Store resume o produto no subtítulo "Sport & well-being in one app" e restringe: "disponível apenas para clientes corporativos, para se registrar contate sua empresa, universidade etc." (App Store, jul/2026).

**Estrutura de desafios (verificado).** A página "how it works" descreve três estruturas de desafio:
1. **Goal Achievement** (meta comum): um objetivo único que o time inteiro persegue.
2. **Race** (corrida): o time que atinge a meta primeiro vence.
3. **Charity** (caridade): os charges ganhos viram doação para instituições.

Sobre esses formatos, o app roda **desafios globais** (todos juntos rumo a uma meta, com contribuição de cada um capturada em tempo real), **desafios pessoais/individuais** (conquista de cada participante) e **eventos esportivos corporativos** que podem juntar gente de regiões e países diferentes; no plano Enterprise há ainda **corridas virtuais** e "competições globais customizadas" (App Store, `how-it-works`, `pricing`, jul/2026).

**Economia de pontos (verificado).** A atividade e o engajamento com conteúdo geram "charges", a moeda interna, trocável numa **loja de recompensas**. Exemplos de recompensa citados na própria Stayf: brindes corporativos, bônus e benefícios, vouchers, certificados-presente e recompensas exclusivas "como um almoço com o CEO" (`how-it-works`, jul/2026). No estudo de caso da Coca-Cola, a Stayf reporta "320 mil charges coletados" (`rewards-and-benefits`, jul/2026). O algoritmo exato (quantos charges por atividade, por tipo) **não é público** (não verificado).

**Comunidade (verificado).** Três camadas de chat: um chat geral para todos, chats de time (para vínculo e apoio mútuo) e "chats por interesse" em torno de hobbies como corrida ou leitura (`how-it-works`, jul/2026). Some a isso reconhecimento entre colegas, compartilhamento de fotos e desafios de "atos de gentileza" e "conexão com a natureza" citados na home (jul/2026).

**Conteúdo e educação (verificado).** Cursos, quizzes e dicas de especialistas cobrindo atividade física, nutrição, mindfulness, saúde no trabalho e estabilidade financeira; "stories", "daily journal" e aulas em vídeo aparecem nos planos (`how-it-works`, `pricing`, jul/2026). A ficha da App Store menciona chat com especialistas de esporte e nutrição dentro do app.

**Painel do RH (verificado).** Distribuição flexível de times (aleatória, por departamento ou por capitães de time), dashboard de analytics com relatórios de saúde e engajamento, gestão de conteúdo (adaptar o app à estação ou a eventos da empresa), pesquisas/surveys e prevenção de fraude/moderação nos planos superiores (`how-it-works`, `pricing`, jul/2026).

---

## 3. Monetização

A Stayf é **assinatura B2B por usuário/mês**, com quem paga sendo a empresa. Do `pricing` (jul/2026):

| Plano | Preço | Para quem | Inclui (destaques verificados) |
|---|---|---|---|
| **Free trial** | Sem custo | Teste | Até 10 usuários, até 4 semanas |
| **Starter** | "a partir de US$ 4/usuário" | Times pequenos, eventos pontuais | App iOS/Android/Huawei, integração de wearable, 40+ atividades, dashboard, surveys, relatórios mensais, estatística pessoal, tarefas semanais, desafios globais, leaderboards, badges, daily journal, stories, chats de comunidade, e-mail/push, guia de lançamento, suporte por e-mail e chat |
| **Pro** | "a partir de US$ 6/usuário" | Empresas médias, programas anuais | Tudo do Starter mais design de app customizado, loja de recompensas personalizada, competições integradas, aulas em vídeo, certificados digitais, times individuais, gerente de conta dedicado, prevenção de fraude/moderação |
| **Enterprise** | "Custom" | Grande porte | Tudo do Pro mais surveys custom, relatórios customizáveis, competições individuais, SSO, competições globais customizadas, corridas virtuais, cursos interativos, notificações custom, moderador de eventos, conteúdo custom em journals/stories |

Termos: sem contrato obrigatório de 12 meses; licenciamento flexível por grupos (até 250 usuários) ou toda a empresa; trial sem cartão (`pricing`, home, jul/2026). Os preços são **preços-piso** ("a partir de"), então o valor final por usuário **não é verificável** publicamente (não verificado).

**Contraste com a Leela.** A Stayf cobra a **empresa** por cabeça/mês. A Leela monetiza organizador (taxa por transação de ingresso, fee de plataforma por tenant) e projeta Leela+ como camada B2C de comunidade/benefício ancorada ao ecossistema. O que dá para aprender aqui não é "quem paga", é o **empacotamento em tiers com feature-gating**: a Stayf separa muito bem o que é grátis/entrada (desafios, badges, journal, stories) do que é premium (loja personalizada, aulas em vídeo, corridas virtuais, moderação, SSO). Se a Leela um dia empacotar planos para clube/organizador, esse desenho de "o que trava em cada tier" é referência limpa.

---

## 4. JTBD servido e persona

A Stayf declara dois lados de JTBD (`why-stayf`, jul/2026):

**Para o funcionário (usuário):** interagir de forma natural num "ambiente de jogo confortável"; sentir-se unido ao time por desafios; ganhar pontos trocáveis por presentes; acessar conhecimento sobre saúde, motivação e produtividade. O trabalho emocional real: pertencer, ser reconhecido, mexer o corpo sem que pareça obrigação e ter uma recompensa tangível.

**Para a empresa (compradora):** dado e feedback transparentes para analisar engajamento; construir cultura de time e comunicação; medir ROI do programa; consolidar bem-estar numa ferramenta só em vez de ferramentas espalhadas. O trabalho real do RH: provar que gastou bem, reduzir burnout e turnover, e ter número para levar à diretoria.

**Personas do site.** A Stayf organiza páginas por comprador/operador: "HR professionals", "wellbeing professionals" e "team leads" (navegação de `stayf.app`, jul/2026). Ou seja, o alvo comercial é o RH e o gestor, não o atleta.

**Persona da Leela é outra, e isso é decisivo.** No eixo heroico, o usuário da Leela é o **atleta** e o **membro de clube**, e o "comprador" adjacente é o **organizador/coordenador do clube**, não um departamento de RH. O JTBD do funcionário Stayf ("pertencer, ser reconhecido, mexer o corpo, ganhar recompensa") tem **grande sobreposição** com o JTBD H2 do atleta Leela (jornada heroica, "amigos ativos na mesma jornada", retorno sem culpa). Já o JTBD da empresa Stayf ("provar ROI ao RH") **não** tem par direto na Leela, cujo equivalente é o organizador/coordenador querendo reter e engajar a comunidade. A lente certa: usar a Stayf para aprender o **lado do usuário** (o atleta), e traduzir o "lado comprador" para o organizador/clube, não para RH.

---

## 5. Padrões de UX e engajamento (o coração)

Aqui está o valor do benchmark. A Stayf é, no fundo, uma máquina de engajamento em atividade física embrulhada de comunidade e recompensa. Detalho cada mecânica e já sinalizo onde ela conversa com a filosofia da Leela.

### 5.1 Economia de acúmulo ("charges"), não punição

A moeda é **charges**, ganha ao registrar atividade e ao engajar com conteúdo, e gasta na loja de recompensas (`how-it-works`, jul/2026). A lógica declarada é de **acúmulo**: "quanto mais interações, mais pontos" (`why-stayf`, jul/2026). Isso é importante para a Leela: é um sistema de **somar**, não de **perder**. Você ganha por aparecer e fazer, não é punido por faltar.

**Observação por ausência (sinalizada).** Nas fontes que consultei (home, how-it-works, pricing, why-stayf, blog, fichas de loja), **não encontrei menção a "streak" de dias consecutivos** nem a penalidade por quebrar sequência. A camada de constância da Stayf aparece como **tarefas semanais** ("weekly tasks"), **daily journal**, **badges**, **leaderboards** e **desafios com início e fim**, não como uma chama que zera. Marco isso como observação por ausência (posso não ter visto uma tela interna do app), mas o material público desenha um sistema de **acúmulo e cadência**, não de streak punitivo. Isso valida, de fora, a tese anti-streak da Leela do pilar 4 ("métrica de retorno, não de sequência", RN-115; "nunca hard reset a zero"): um produto de bem-estar corporativo em produção, feito por gente de endurance, escolheu acúmulo em vez de streak.

### 5.2 Taxonomia de desafios (o que GymRats pode copiar)

A Stayf separa desafio por **estrutura** e por **escopo**:
- Estrutura: **Goal Achievement** (meta comum), **Race** (primeiro time a bater a meta vence), **Charity** (charges viram doação).
- Escopo: **global** (todos juntos, contribuição em tempo real), **pessoal/individual**, **por time** (montado por departamento, aleatório ou por capitão), **evento corporativo** multi-região, e **corrida virtual** (Enterprise).
(`how-it-works`, `pricing`, App Store, jul/2026.)

Dois formatos merecem destaque para a Leela porque o E05 hoje modela desafios (Modelo C de equilíbrio como signature, RN-111), mas a lista de arquétipos pode crescer: a **Race** (competição time contra time com meta e vencedor) e a **Charity** (esforço convertido em doação, um gancho pró-social forte para clube de corrida). A **contribuição em tempo real** rumo a uma meta coletiva é exatamente o padrão "desafio em grupo" do GymRats/E05.

**Ressalva técnica que a Leela já mapeou.** O desafio global da Stayf mostra a contribuição de cada pessoa somando numa meta comum. Na Leela, o pilar 07 já avisa: os **termos 2026 da Strava proíbem exibir o treino de um atleta para os outros**, então o ranking/feed de desafio em grupo tem que usar **dado próprio da Leela** (check-in, auto-report, ou fonte cuja licença permita), não o payload Strava. A Stayf provavelmente resolve isso agregando dado de wearable sob consentimento corporativo; a Leela precisa resolver com a própria camada `TrainingProvider`. A mecânica copia; a fonte de dado, não necessariamente.

### 5.3 Ciência declarada (e a divergência que registro)

Há **duas** fundamentações na comunicação da Stayf, e elas divergem entre superfícies:
- A **ficha da App Store** afirma que o app "é baseado no conceito de nudge do economista e Nobel Richard Thaler, de que toda pessoa precisa de um leve empurrão externo para trabalhar e viver de forma mais eficiente" (App Store, jul/2026; a grafia do sobrenome saiu como "Tatler" em uma das leituras, provável erro de digitação da própria ficha).
- O **blog da Stayf** sobre a ciência da plataforma se apoia em **Tony Schwartz e a gestão de energia** (quatro energias: física, mental, emocional, espiritual) e num **Personal Wellbeing Index** medido pela escala Cantril Ladder de 0 a 10 (`stayf.app/blog/how-it-works-the-science-behind-workplace-wellbeing-and-productivity`, jul/2026).

Registro as duas sem escolher: a marca ancora o app no "nudge" (empurrãozinho) na loja e na energia/quatro-dimensões no blog. Para a Leela, o útil é o **Personal Wellbeing Index** (auto-relato 0-10) como métrica de bem-estar subjetivo simples, e a moldura **multi-dimensional** (física, mental, emocional, espiritual), que ecoa o multi-pilar (físico/mental/espiritual) do pilar 4 da Leela.

### 5.4 Comunidade em camadas

O social da Stayf não é um feed único; são **três camadas de conversa** com propósitos distintos: geral (todos), time (apoio mútuo do grupo do desafio) e por interesse (corrida, leitura, hobbies), mais reconhecimento entre colegas e compartilhamento de foto (`how-it-works`, home, jul/2026). Isso cria pertencimento em escalas diferentes: a empresa toda, o seu time, e a sua tribo de interesse. Para o E13/E05, a lição é separar "comunidade do clube" de "grupo do desafio" de "interesse comum", em vez de um chat só.

### 5.5 Conteúdo como gancho de retorno

A Stayf usa **cursos, quizzes, dicas de especialista, stories, aulas em vídeo e daily journal** (`how-it-works`, `pricing`, jul/2026), e "empurra" (nudge) o usuário a consumir conteúdo de saúde, recompensando com charges. O conteúdo não é enfeite: é um motivo de voltar ao app nos dias sem treino, e é fonte de charges. Para a Leela, isso responde ao "o que o atleta faz no app no dia em que não correu": ler, aprender, registrar no journal, e ainda assim acumular.

### 5.6 Wearables e tracking (validação do pilar 07)

Sincronização automática com Apple Health, Google Fit / Health Connect, Garmin (Connect), Polar (Flow), Samsung, Xiaomi, Amazfit e Fitbit; 20+ (loja) a 40+ (pricing) tipos de atividade (App Store, home, `pricing`, jul/2026). A Stayf **não constrói tracking próprio**: puxa do wearable que o usuário já usa. Isso é **exatamente** a tese do fundador da Leela no pilar 07 ("não competir com Strava/Garmin; puxar via API o que o atleta já registra"). Um concorrente de bem-estar em produção valida a estratégia de integração em vez de tracking próprio.

### 5.7 Onboarding de baixa fricção (mas gated)

O fluxo da Stayf: baixar o app, inserir o **código de acesso da empresa** (a home exemplifica com o código 7869), registro "em cerca de um minuto" e conectar wearables (home `stayf.app/pt-br`, jul/2026). Duas leituras opostas para a Leela: o **registro de um minuto mais conectar wearable na hora** é a régua de fricção a copiar no E13; mas o **gate corporativo** (só entra quem tem código da empresa) é o oposto do que a Leela quer no app do atleta, que precisa ser aberto ao atleta e ao membro de clube. Copiar a leveza, não o portão.

### 5.8 Painel do RH e prova de valor

Do lado do comprador, a Stayf entrega dashboard de engajamento e saúde, surveys, distribuição de time e moderação/antifraude nos planos superiores (`how-it-works`, `pricing`, jul/2026), e transforma tudo em claim de resultado (seção 6). O equivalente Leela não é RH: é o **organizador/coordenador** querendo ver o clube ativo. O E11 (analytics) e o painel de clube são o lugar dessa "prova de vida" da comunidade.

---

## 6. O que a Stayf faz excepcionalmente bem

- **Acúmulo em vez de punição.** Economia de charges que soma por participar, sem streak que zera. Alinha com a ciência do hábito e com a tese anti-streak da Leela, vindo de um produto real.
- **Taxonomia de desafio rica.** Goal, Race e Charity vezes global/pessoal/time/evento/corrida virtual. Um catálogo de formatos que cobre competição, cooperação e causa social.
- **Recompensa tangível e desejável.** Charges viram coisa real (brinde, voucher, e o simbólico "almoço com o CEO"). A recompensa não é só cosmética; toca benefício concreto.
- **Comunidade em três camadas.** Geral, time e interesse, cada uma com um propósito de pertencimento diferente.
- **Conteúdo que dá motivo de voltar.** Curso, quiz, story, journal e aula em vídeo preenchem o dia sem treino e ainda geram charges.
- **Integração de wearable como base, não tracking próprio.** Puxa de Apple/Google/Garmin/Polar/Fitbit e afins; foco no que o usuário já tem.
- **Prova de valor empacotada.** Dashboard, surveys e índice de bem-estar 0-10 dão ao comprador número para justificar o gasto.
- **Empacotamento em tiers limpo.** Starter/Pro/Enterprise com feature-gating claro do grátis ao premium.

---

## 7. O que a Leela aprende, por alvo

### Para E13 (app do atleta, jornada heroica)

1. **Onboarding de um minuto mais conectar treino na hora.** Copiar a régua de fricção da Stayf (registro rápido, wearable já no primeiro uso), mas **sem** o gate corporativo: o app do atleta Leela é aberto. Amarra com o pilar 07 (HealthKit/Health Connect on-device na V1, Strava individual, agregador como fast-follow, tudo atrás de `TrainingProvider`).
2. **Conteúdo e journal como o que fazer no dia sem prova.** A Stayf mostra que curso, story e daily journal seguram o retorno nos dias parados. O E13 já tem journal e dashboard heroico (S1303); vale reforçar uma camada leve de conteúdo/registro que **acumula** mesmo sem treino, no espírito "Volte amanhã".
3. **Índice de bem-estar simples (0-10).** O Personal Wellbeing Index da Stayf (Cantril Ladder) é um auto-relato barato de implementar e que dá sinal de humor/energia ao longo do tempo. Casa com o multi-pilar (físico/mental/espiritual) da Leela e vira dado de jornada sem depender de wearable.
4. **Recompensa por profundidade, não por comparecimento cego.** A Stayf premia acúmulo; a Leela deve premiar acúmulo **e equilíbrio** (bônus +20% por 3 pilares no mesmo dia, RN-115; Modelo C, RN-111). Manter o diferencial: medalha que compõe identidade (RN-116), não contador de dias em risco.
5. **Wearable como base, tracking próprio nunca.** A Stayf confirma a estratégia do pilar 07. Manter o rumo e não gastar energia construindo tracking.

### Para GymRats (desafios e consistência, motor E05)

6. **Ampliar o catálogo de arquétipos de desafio.** Além do Modelo C (equilíbrio) signature, avaliar **Race** (time contra time com vencedor) e **Charity** (esforço vira doação, gancho pró-social forte para corrida solidária). Ambos existem e funcionam na Stayf.
7. **Contribuição em tempo real rumo a meta coletiva.** O padrão "todos somando para uma meta comum, com barra que enche ao vivo" é o coração do desafio em grupo. O E05 já agrega participação por Function; expor essa soma **ao vivo** é o hook.
8. **Fonte de dado própria para o ranking do grupo.** A Stayf agrega wearable sob consentimento; a Leela precisa usar **dado próprio** (check-in, auto-report) no ranking de grupo por causa dos termos Strava (pilar 07). Copiar a mecânica, resolver a fonte com `TrainingProvider`.
9. **Distribuição de time flexível.** Montar time por clube, aleatório ou por capitão (como a Stayf) é uma alavanca de sociabilidade barata para o E05.
10. **Desafio com início e fim que renova.** A Stayf usa desafios time-bound; o pilar 4 já recomenda isso contra o burnout de "para sempre". Convergem. Manter ciclos (ativos/encerrados) com medalha ao concluir (RN-116).

### Para Leela+ (comunidade e benefício contínuo)

11. **Loja de recompensa com moeda de acúmulo.** O par charges mais loja da Stayf é o modelo mais claro de "esforço vira benefício". Para o Leela+, pontos de participação (do E05) trocáveis por benefício do ecossistema (desconto na taxa, lote exclusivo, brinde do clube) reaproveitam o motor que a Leela já tem, sem depender de parceiro externo no dia um (mesma leitura do benchmark Cheers).
12. **Benefício ancorado ao que a plataforma controla.** A recompensa mais forte da Stayf ("almoço com o CEO", brinde da empresa) é a que o próprio comprador controla. No Leela+, ancorar em ingresso, taxa e lote (que a Leela controla) antes de catálogo de parceiro, como o benchmark Cheers já concluiu.
13. **Recompensa por completar desafio, não só por comprar.** A Stayf dá charges por atividade e engajamento. O Leela+ pode amarrar benefício a **completar um desafio do clube**, transformando o clube em porta de entrada da assinatura. Este é o moat que uma ticketeira (Cheers) não tem, e a Stayf mostra a mecânica de "esforço vira moeda".
14. **Empacotamento em tiers.** Se Leela+ virar produto pago, o feature-gating limpo Starter/Pro/Enterprise da Stayf é referência de como separar grátis de premium sem irritar o grátis.

### O que não copiar

- **O comprador RH e o gate corporativo.** A Leela é atleta e clube, não folha de pagamento. O app do atleta é aberto; nada de código de empresa para entrar.
- **A dependência de claim de marketing como prova.** Os números de ROI/engajamento da Stayf são autorreportados; a Leela deve medir sucesso por retorno e profundidade (G3 do pilar 4), não por painel de vaidade.
- **Assinatura paga logo de saída.** No Leela+, o benefício deve provar retenção como valor agregado à comunidade antes de virar produto pago (mesma cautela do benchmark Cheers).

---

## 8. Tabela-síntese

| Aspecto | Stayf (verificado) | Leela (spec/parcial) | Decisão sugerida |
|---|---|---|---|
| Natureza | Bem-estar corporativo B2B, comprador = RH | Infra para organizador/clube/atleta; heroico = E13/E05/Leela+ | Copiar mecânica do usuário; traduzir "comprador" para organizador/clube, não RH |
| Origem | Fundadores de endurance (I Love Supersport, IRONSTAR, I Love Running), 2023, UK | Nasce em corrida/endurance | DNA próximo; referência legítima para o eixo heroico |
| Moeda/recompensa | "Charges" por atividade e conteúdo, loja (brinde, voucher, almoço com CEO) | Pontos de participação (E05), medalhas (RN-116) | Adotar economia de acúmulo trocável por benefício no Leela+ |
| Streak | Não encontrei streak de dias consecutivos; usa tarefa semanal, journal, badge, leaderboard, desafio com fim (obs. por ausência) | Anti-streak "Volte amanhã", métrica de retorno (RN-115), nunca reset a zero | Manter tese anti-streak; Stayf a valida de fora |
| Desafios | Goal, Race, Charity vezes global/pessoal/time/evento/corrida virtual | Modelo C (equilíbrio) signature (RN-111), motor E05 | Ampliar catálogo: avaliar Race e Charity; contribuição ao vivo |
| Fonte de dado do grupo | Agrega wearable sob consentimento | Termos Strava proíbem exibir treino de um para outros (pilar 07) | Copiar mecânica; ranking de grupo com dado próprio via `TrainingProvider` |
| Wearables | Auto-sync Apple/Google/Garmin/Polar/Fitbit/Samsung/Xiaomi/Amazfit, 20-40+ atividades | `TrainingProvider`: Health nativo V1, Strava individual, agregador fast-follow | Manter; Stayf valida "integrar, não construir tracking" |
| Comunidade | 3 camadas: geral, time, interesse (corrida/leitura) | Clube, grupo de desafio (E05), comunicação (E13) | Separar comunidade do clube, grupo do desafio e interesse |
| Conteúdo | Curso, quiz, dica de especialista, story, aula em vídeo, journal | Journal e dashboard heroico (S1303); multi-pilar | Reforçar conteúdo/journal que acumula no dia sem treino |
| Ciência declarada | Nudge/Thaler (loja) e energia de Tony Schwartz mais Índice 0-10 (blog) | Multi-pilar físico/mental/espiritual, ciência do hábito (pilar 4) | Adotar índice de bem-estar 0-10 auto-relatado |
| Onboarding | Baixar, código da empresa, registro 1 min, conectar wearable | E13 app aberto ao atleta | Copiar 1 min mais wearable; descartar o gate corporativo |
| Monetização | Assinatura por usuário/mês; Starter US$4, Pro US$6, Enterprise custom; sem contrato de 12 meses | Taxa por transação (organizador) mais Leela+ hipótese (B2C) | Aprender o feature-gating por tier; "quem paga" é diferente |
| Prova de valor | Dashboard, surveys, claims de ROI/engajamento (autorreportados) | E11 analytics, painel de clube | Medir retorno e profundidade, não painel de vaidade |

---

## 9. Fontes e verificação

Verificado em fonte pública (julho/2026), com render que carregou:
- `stayf.app/pt-br` (proposta, onboarding com código, wearables, compliance LGPD/GDPR/CCPA, idiomas PT/RU/ES/EN, clientes).
- `stayf.app/how-it-works` (charges e loja de recompensa, três estruturas de desafio Goal/Race/Charity, três camadas de chat, conteúdo/educação, painel do RH).
- `stayf.app/pricing` (Free trial, Starter "a partir de US$4", Pro "a partir de US$6", Enterprise custom; feature-gating por plano; sem contrato de 12 meses).
- `stayf.app/why-stayf` (JTBD funcionário e empresa, claims de resultado: inDrive +63% team building/+60% wellbeing; Mars Kazakhstan +78% engajamento, 6.185 passos/dia, 160 min/semana; Barilla +98%/100 participantes; Coca-Cola +57%/1.500 participantes).
- `stayf.app/blog/how-it-works-the-science-behind-workplace-wellbeing-and-productivity` (quatro energias de Tony Schwartz; Personal Wellbeing Index Cantril Ladder 0-10).
- `stayf.app/rewards-and-benefits` (moeda "charges"; 320 mil charges no caso Coca-Cola; detalhamento do algoritmo não público).
- Apple App Store (id6462422271): STAYF LTD, categoria Health & Fitness, 118,2 MB, versão 11.0.0 (6 de abril), "Bug fixes and performance improvements", 18+, iOS 15.1+, subtítulo "Sport & well-being in one app", "avaliações insuficientes", só para clientes corporativos, referência ao nudge de Thaler.
- Google Play (`app.stayf.main`): descrição lida por sumário de busca (nudge de Thaler, 20+ atividades, desafio global/pessoal, evento corporativo, chat com especialista, sync Apple Health/Google Fit/Polar/Garmin).
- EU-Startups, Startups Magazine, Altair.vc, agregadores Tracxn/PitchBook (fundação 2023, Oxford/Londres; fundadores Max Zhurilo e Kirill Primaka; pre-seed €650k, cerca de US$700-704k; investidores AltaIR Capital, Yellow Rocks, Smart Partnership Capital, Somersault Ventures, anjos; clientes; engajamento 50-80% em uma fonte e 70-80% em outra; 2000 funcionários com +13% de felicidade após 4 meses).

Não carregou ou não verificado:
- `crunchbase.com/organization/stayf`: **HTTP 403**; não li o perfil.
- HTML bruto da Google Play: **truncado**; a descrição foi lida por sumário de busca, não pelo render.
- **Preço final por usuário**: só "a partir de US$4/US$6" (preço-piso); valor efetivo não é público.
- **Nota e volume de reviews**: Apple marca "avaliações insuficientes"; nota da Google Play não capturada; sem review independente de usuário em volume.
- **Algoritmo de charges** (quantos pontos por atividade/tipo): não público.
- **Mecânica de streak**: não encontrei menção a streak de dias consecutivos nas fontes consultadas (observação por ausência; pode existir em tela interna do app que não foi observada).
- **Ciência declarada**: diverge entre superfícies (nudge/Thaler na loja; energia de Tony Schwartz mais Índice 0-10 no blog); registro as duas sem escolher.
- **Números de engajamento e ROI**: são claims autorreportados pela Stayf; não auditados por fonte independente.

## Volta para
- [[DISCOVERY]] · [[benchmark-cheers]] · [[benchmark-shotgun]] · [[leela-plus-hipotese-jtbd]] · [[pilares/04-gamificacao]] · [[pilares/07-integracoes-treino]] · [[NUVEM-FUNCIONALIDADES]]
