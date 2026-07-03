# Parecer do Strategic Council · Discovery Leela

> Mesa-redonda de validação estratégica em 5 rounds sobre o discovery do Leela (marketplace community-first de eventos fitness + gamificação anti-streak + monetização por afiliação + cold start).
> Método: Strategic Council (sc-chair-curator → sc-case-prep → sc-chief-of-staff → sc-memo-editor). Round-table full, dissent preservado.
> Base analisada: `RELATORIO-DISCOVERY.md`, os 5 pilares, `README.md`, `ROADMAP.md`.
> Data: 2026-07-02 · Client-id: leela.

---

## Veredito

**Go condicional.** A tese central do Leela está direcionalmente correta e apoiada por evidência real: o comportamento community-first já é dominante no corredor brasileiro (a demanda não precisa ser inventada) e o mercado esportivo é, de fato, inscrição-first — ninguém costura ingresso + comunidade + desafios + comunicação segmentada + afiliação num produto só. Isso é whitespace verdadeiro **no nível de features**. O conselho, porém, converge num ponto duro: **o discovery erra o enquadramento do moat e a sequência de prova**. "Unificar os 5 pilares" é uma história de lado-da-oferta (supply-side), copiável e, pior, um clássico *tar pit* de marketplace com problema do ovo-e-galinha. O moat real do Leela não é a integração — é **psicológico (o anti-streak e a voz do coordenador como sinalização de pertencimento, que o concorrente não copia porque parece burro na planilha dele) e de retenção (clube > solo)**. E esse moat repousa hoje sobre **um único número emprestado** (retenção ~2x de Strava/NRC) que ainda não foi medido no Leela. O plano atual — 14 épicos, 3 superfícies, 5 ondas, product-first — é o caminho de maior risco para provar isso: gasta runway antes da prova e agenda o app do atleta (a alma que gera o moat) por último. **Go na tese e no wedge; no-go no roadmap atual como caminho de validação.** Reposicionar como *coordinator-first, single-player-que-vira-rede*, cortar escopo radicalmente até provar a retenção, e blindar as portas irreversíveis. O go se sustenta se a próxima entrega for um experimento que **mede o elo de retenção em 5-10 clubes reais**, não mais um lote de features.

---

## Cadeiras convocadas (e por quê)

DNA lido em `businesses/_library/dna/<slug>/agent/AGENT.md`. Painel de 8 (máximo antes de virar ruído), cobrindo 5 ângulos.

| Cadeira | Ângulo | Por que nesta mesa |
|---|---|---|
| **Clayton Christensen** | Teórico — JTBD / disrupção | O whitespace precisa passar do "ninguém unifica" (feature) para "qual Job o cliente contrata" (demanda). Diagnostica se é new-market disruption de não-consumo (o coordenador no WhatsApp+planilha). |
| **Paul Graham** | Early-stage — cold start | Marketplace com ovo-e-galinha está literalmente na lista de *tar pits* dele. Traz "do things that don't scale", default-alive e o teste "made for themselves" (skin do fundador). |
| **Alex Hormozi** | Operador — oferta / monetização | O discovery é 100% arquitetura de produto e 0% oferta. Traz a sequência mercado → oferta → produto e o "pay when you collect" para cold start. |
| **Jim Collins** | Teórico — flywheel / hedgehog | "Comunidade como moat" É uma afirmação de flywheel. Ele testa se é flywheel real ou lista de features fantasiada, e força o denominador econômico ("lucro por quê"). |
| **Jeff Bezos** | Operador — cliente / marketplace 2-lados | Amazon resolveu o cold start de dois lados. Traz working-backwards (press release do coordenador), portas de 1 vs 2 vias, e qual lado subsidiar. |
| **Steve Jobs** | Operador — foco / produto | 14 épicos/77 stories/172 tasks/3 superfícies = a Apple de 350 SKUs de 1997. Foco é subtração. E o anti-streak é a decisão de alma do produto (values marketing). |
| **Nassim Taleb** | Risco — cauda / via negativa / antifragilidade | O plano é todo adição. Ele traz o que remover, as fragilidades (número emprestado, dependência de plataforma, falha silenciosa do agregado) e o barbell. |
| **Rory Sutherland** | Comportamental — moat psicológico | O ponto mais importante do caso: o moat não é técnico, é percepção. Anti-streak e push racionado são *costly signals* de cuidado — impossíveis de copiar por serem "ilógicos". |

**Consideradas e não sentadas:** Philip Tetlock (calibração) e Daniel Kahneman (vieses) — funções absorvidas no Round 4 (calibração de confiança e cenários de kill) para respeitar o teto de 8 e a regra anti-redundância. Naval, Drucker, Musk, Dalio fora por baixo fit com um caso pré-PMF de dois lados.

**Checagem anti-redundância:** Collins + Bezos ambos tocam "flywheel", mantidos deliberadamente — Collins traz disciplina/endurance e o denominador econômico; Bezos traz a mecânica de marketplace de dois lados e working-backwards. Divergem produtivamente (consistência vs. obsessão agressiva pelo cliente). Jobs + Hormozi ambos "operadores", mas colidem no eixo taste-first vs offer-first (fricção desejada).

---

## Round 1 — Diagnóstico solo

**Christensen.** "Comecem pela pergunta que sempre faço: qual é o Job sendo contratado aqui? O relatório descreve cinco pilares — isso é o sonho do produtor, não o Job do cliente. Ninguém acorda querendo 'ingresso + comunidade + desafios + comunicação + afiliação unificados'. O Job do atleta é *pertencer e progredir sem vergonha* depois que a inscrição já foi feita; o Job do coordenador é *manter minha comunidade viva e rendendo entre um evento e outro*. Diagnostico isto como **new-market disruption de não-consumo**: o coordenador que hoje opera no WhatsApp + planilha + Pix manual é um não-consumidor de software de comunidade. Aí mora o wedge — não na soma dos cinco. E há dois clientes que o relatório funde: o coordenador (quem paga) e o atleta (quem usa). O wedge entra pelo coordenador, porque é ele que traz a comunidade pronta — o que, de quebra, dissolve o ovo-e-galinha."

**Graham.** "Vou ser o desmancha-prazeres: 'marketplace com ovo-e-galinha' está na minha lista de *tar pits* — ideias com falsa plausibilidade que soam inteligentes e falham consistentemente. A boa notícia é a saída que o próprio Christensen apontou: **o coordenador já tem a comunidade** (o grupo de WhatsApp existe). Então não se faz cold start de rede a partir do zero; importa-se uma comunidade de cada vez, na mão. Isso é *do things that don't scale* — o fundador onboarda pessoalmente os primeiros 10 coordenadores, migra o grupo deles, tira as fotos (como Chesky e Gebbia na Airbnb). A pergunta que decide tudo: **o Leela é default-alive como ferramenta single-player para UM coordenador, antes de qualquer efeito de rede?** Se o coordenador tira valor no dia 1 sem precisar de outros clubes, não existe problema de marketplace — é um SaaS que vira rede depois. E duas perguntas que o discovery não responde: o fundador fez isto para si mesmo (roda um clube, corre)? Qual é a conta de default-alive de 14 épicos XL sem receita até a Onda 2? Do jeito que está, a postura é default-dead."

**Hormozi.** "Li o relatório inteiro e não achei a oferta. Achei arquitetura. Cadê o mercado, a oferta grand-slam, a equação de valor, quem paga? Monetização por split de afiliação + taxa de ingresso é preço de commodity — paridade com Sympla, corrida ao fundo. Minha primeira pergunta num negócio estagnado nunca é estratégia, é volume: **quantos coordenadores o fundador pitchou esta semana?** As 16 recomendações são todas features; nenhuma é 'a oferta que só um lunático recusa'. Para cold start e caixa rápido, o caminho é um nicho — assessorias de corrida — com uma grand-slam offer: *'eu loto seu próximo evento e rodo sua comunidade, e você só paga quando arrecada'*. Anti-streak e gamificação eu adoro, mas pelo motivo certo: são mecânica de **retenção** (vitórias emocionais nos primeiros 30 dias — é o meu playbook de retention literal). Só que retenção não importa se você não consegue adquirir. O discovery inverteu a ordem: produto primeiro, oferta nunca."

**Collins.** "'Comunidade como moat' é instinto correto, e é uma afirmação de **flywheel**. Deixem-me mapeá-lo: coordenador traz o clube → atletas entram → desafios/comunicação elevam retenção → atleta retido compra mais eventos → receita de afiliação → coordenador ganha mais → coordenador recruta mais atletas e mais coordenadores ouvem falar. Cada volta facilita a próxima. É um flywheel real **se** o elo de retenção (clube > solo, 2x) se sustentar. Mas onde está o Hedgehog? No que o Leela pode ser o melhor do mundo? Não nos 'cinco pilares' — isso é dispersão, o big push espalhado por 14 épicos é sintoma de **doom loop** (saltos direcionais antes de qualquer coisa compor). E o denominador econômico: lucro por quê? Por evento? Por clube? Eu apostaria em **lucro por clube ativo** — escolham, e tudo que não serve a 'mais clubes ativos' vira ruído. A pergunta brutal: isto é um flywheel ou uma lista de features vestida de flywheel?"

**Bezos.** "Marketplace de dois lados é o cold start mais difícil que existe — e a Amazon fez. A mecânica: subsidie o lado mais difícil de conseguir, obcecue pelo lado que compõe. Aqui o lado escasso é o **coordenador** (a oferta de comunidade). Working-backwards: escrevam o press release do coordenador. 'A coordenadora Maria rodava sua crew de 80 corredores no WhatsApp + planilha + Pix na mão. Agora...' — se esse PR é convincente, construam. Se o PR do atleta convence mas o do coordenador não, o cold start falha. E vejo um erro de portas: o gateway (ADR-006) está sendo tratado como porta de uma via (agonia), mas a interface `PaymentProvider` o torna **porta de duas vias** — decidam rápido, com 70% da informação, e sigam. Já o anti-streak e o feed por clube são mais próximos de portas de uma via (definem a cultura) — aí sim, cuidado. O roadmap trata o reversível como precioso e não pressionou a promessa irreversível ao cliente. Lembrem: a paridade de ticketing vira table stakes em 12 meses; o moat tem de ser a relação."

**Jobs.** "14 épicos, 77 stories, 3 superfícies, 2 temas, 5 ondas. Isto é a Apple de 1997 com 350 SKUs antes de eu cortar para 4. Foco é subtração. Quais são as 3 coisas? (1) o coordenador roda seu clube; (2) o atleta sente pertencimento e progresso; (3) o dinheiro flui (ingresso + split). Todo o resto — analytics, marcas, influenciador, metade das 16 recs — é ruído até o núcleo estar mágico. O 'Volte amanhã' é a única decisão de alma genuinamente diferenciada e on-brand: vocês vendem pertencimento, não performance. Isso é o Think Different do Leela — protejam com a vida. Mas construir 3 superfícies ao mesmo tempo antes de provar uma é diluir excelência por média. E há uma contradição feia: o app do atleta (E13) é onde a mágica precisa morar, e está na Onda 4, por último. Se o amor do atleta é o que cria o moat, por que é a última coisa a ser feita?"

**Taleb.** "Via negativa: o plano é todo adição — 16 recs, 14 épicos — e nenhuma subtração. Fragilidades que vejo. Primeira: o agregado anti-streak rodando em Cloud Function sobre Firestore. Se a Function conta errado, a promessa 'nunca punir' quebra em silêncio — e confiança quebrada é porta de uma via. É o peru: funciona lindamente até a véspera do Thanksgiving. Segunda: dependência de plataforma — Firebase/Google (fornecedor único, ponto único de ruína) e entregabilidade de push governada por Gmail/Yahoo/Apple. Vocês não controlam os trilhos. Terceira, e a pior: **a tese inteira repousa sobre UM número** — retenção 2x, emprestado de Strava/NRC, não medido no Leela. Isso é convicção emprestada, fragilidade máxima. Movimento antifrágil: barbell. 85-90% no seguro absoluto (provem que o ticketing chato + o clube de um coordenador funciona, cheguem a ramen), 10-15% em apostas convexas (o app, a viralidade da gamificação), **zero no meio medíocre** — nada de meio-construir 14 épicos. E skin in the game: o fundador roda um clube? Se não, risco de IYI."

**Sutherland.** "Todos aqui estão quase certos e quase errados ao mesmo tempo. O moat NÃO é integração de features — isso o Bezos copia num trimestre. O moat é **psicológico**. 'Volte amanhã' e comunicação na voz do coordenador são sinalização, não substância. A mesma corrida trackeada pela Strava (vergonha de performance) e pelo Leela (pertencimento, boas-vindas de volta) é a MESMA atividade re-enquadrada — e o reframe é o produto. Isso é 100x mais barato que tentar superar a engenharia da Strava, e **impossível de copiar porque parece burro na planilha do concorrente**: por que alguém construiria um app fitness que NÃO maximiza o engajamento por streak? O Duolingo monetiza a ansiedade do streak; os KPIs da indústria inteira apontam para o lado oposto. É um moat permanente — uma estratégia que ninguém copia porque é ilógica para eles. O 'orçamento de push visível' é genial: mostrar ao usuário que você raciona as notificações dele é um costly signal de respeito. Inclinem-se nisso com força. E o coordenador-como-game-master é uma jogada de **status/identidade** — o coordenador sinaliza cuidado e expertise para os atletas dele. Vendam status ao coordenador, não software."

---

## Round 2 — Crítica cruzada

**Graham → Christensen.** "Concordo que é um Job único, mas puxo mais: sua própria nota de limitação diz que JTBD encaixa melhor *depois do primeiro sinal*. Pré-PMF, não teorizem o Job — vão buscar 20 coordenadores e observem." Christensen cede, mas insiste: "Sem o Job articulado, você constrói cinco pilares que ninguém contrata." **Convergência:** o Job = *'me ajude a manter minha comunidade viva e rendendo entre eventos'*. Wedge único, entrada pelo coordenador.

**Hormozi → Jobs/Collins.** "Vocês estão debatendo arquitetura enquanto ninguém fez uma venda." Jobs rebate: "Vender um produto medíocre envenena a marca. Taste primeiro." Hormozi: "Taste é luxo de quem já foi financiado. No offer, no business." **Bezos medeia:** "O working-backwards força os dois — se você não consegue escrever o press release do coordenador E a oferta, você não tem nenhum dos dois." **Convergência:** oferta e alma-de-produto não se opõem. A oferta É "rodo sua comunidade e seu evento, você paga quando arrecada"; a alma (anti-streak/pertencimento) é o que faz reter.

**Taleb → Collins.** "Seu flywheel gira sobre um número emprestado. É o flywheel do peru — lindo até o número não se replicar no Brasil, no seu produto." Collins cede o gap de evidência: "Então o primeiro trabalho é **medir** o elo crítico em 3-5 clubes reais antes de escalar. Confrontar os fatos brutais — o paradoxo de Stockdale." **Convergência:** instrumentar o elo de retenção como kill-criterion nº1.

**Sutherland → Bezos.** "Seu instinto de 'obsessão pelo cliente → menos fricção, mais features' está exatamente errado aqui. A fricção — push racionado, sem ranking global, sem streak — É o produto. Remover fricção para 'servir o cliente' destruiria o moat." Bezos cede: "Divinely-discontent não significa maximizar features; o desejo mais profundo do cliente é pertencer, e a restrição serve a isso. Frugalidade-como-restrição concorda com o seu 'o ritual é o produto'."

**Jobs → mesa (sequência).** "Se o moat é o amor do atleta, por que o app do atleta é a última onda?" **Graham/Bezos contra-atacam:** "Porque o coordenador é o lado escasso e a chave do cold start. O lado do atleta pode ser fino ou manual primeiro — mande WhatsApp para os atletas na mão antes de construir o app." **Convergência:** não construir E13 cedo por inteiro, mas a *experiência* do atleta (mesmo entregue via web/manual) tem de existir na primeira coorte para testar o moat. Coordenador-value primeiro; prova-de-conceito da alma-do-atleta em paralelo, fina.

**Taleb → Hormozi.** "Gosto do 'pay when you collect' — skin in the game, convexo para o Leela. Mas seu 'mais volume, mais propostas' é frágil se você escalar aquisição antes de provar a retenção: despeja lead em balde furado." Hormozi cede: "Retenção guarda o volume aqui. Provem a retenção numa coorte pequena, DEPOIS o volume."

---

## Round 3 — Síntese

A mesa converge em três reformulações e uma lacuna estrutural.

1. **Reenquadrar o moat.** Não é "marketplace de 5 pilares" (história supply-side, copiável, tar pit de ovo-e-galinha). É **SaaS single-player para o coordenador que vira rede**. Comunidade-como-moat é real, mas por dois motivos que o discovery não nomeia: é **psicológico** (Sutherland — sinalização de pertencimento que o concorrente não copia por parecer ilógica) e **de retenção** (Collins — clube > solo). Integração de features é o *sintoma*, não a defesa.

2. **O moat só é defensável se três coisas forem verdade:** (a) o elo de retenção 2x se replica no Leela — precisa ser medido, não citado; (b) o anti-streak e a voz-do-coordenador são sentidos como *valor*, não feature (Jobs + Sutherland); (c) o coordenador tem valor standalone no dia 1 — o que dissolve o cold start (Graham + Bezos).

3. **As 16 recomendações estão quase todas certas individualmente, mas a priorização está errada** — é dirigida por completude-de-produto, não por prova. Falta, no topo, o item que não existe no relatório: **o experimento que mede o elo de retenção**. E faltam, de todo: a **oferta** (Hormozi) e a checagem de **skin/specific-knowledge do fundador** (Graham/Taleb).

**Lineage do dissent preservado:** Jobs mantém reserva sobre sequenciar o app por último (concede o wedge-coordenador, mas registra que a prova do moat exige experiência de atleta cedo). Hormozi mantém que, sem oferta explícita, nenhuma prova de retenção importa. Taleb mantém que enquanto o número 2x não for medido no Leela, toda confiança é a do peru.

---

## Round 4 — Desafio (stress-test)

Cenários de kill (calibração Tetlock + vieses Kahneman absorvidos):

1. **Coordenador não sai do WhatsApp** (Christensen: Habit + Anxiety > Push + Pull). Se a força de inércia do grupo vencer, a migração falha. *Mitigação:* operar dentro/ao lado do WhatsApp no início, não substituí-lo de cara; o valor standalone tem de ser óbvio na primeira semana.
2. **O 2x não se replica no Leela** → o moat evapora → sobra uma ticketeira commodity competindo com Sympla no preço (a corrida ao fundo do Hormozi). *É o cenário mais provável de morte silenciosa.*
3. **Bug no agregado do Firestore pune inatividade em silêncio** → traição da única promessa de marca → porta de uma via da confiança bate (Taleb). Trust não se recupera com patch.
4. **Runway queima em 3 superfícies + 14 épicos antes da prova** → default-dead (Graham).
5. **Trilhos que você não controla quebram** — entregabilidade de push, política de Gmail/Yahoo, dependência de Firebase (Taleb).
6. **Coordenador-como-game-master exige esforço do coordenador.** Se desenhar desafios é trabalho, o lado escasso não faz (Sutherland: fricção no lado errado). Precisa de templates de 1 clique.
7. **Resposta competitiva não war-gameada:** e se a Sympla ou a Strava colar um módulo de comunidade? A defesa é o moat psicológico/valores que eles não copiam — mas é forte o suficiente? Não testado.

**Calibração de confiança (bandas):**
- Tese direcionalmente correta: **~70%** (alta).
- Comunidade-como-moat defensável e durável: **~55%** (média) — pendura no elo de retenção não provado.
- Cold start solúvel via importação coordenador-a-coordenador: **~75%** (alta).
- Sequência atual do roadmap ser o caminho ótimo de prova: **~30%** (baixa).

---

## Round 5 — Convergência

**Go, condicional.** A mesa converge:

- **Go** na tese e no wedge. O território existe, a demanda existe, a alma anti-streak é genuína e defensável, e o cold start tem uma saída conhecida (coordenador traz a comunidade pronta).
- **No-go** na sequência atual (14 épicos / 3 superfícies / product-first) como caminho para *provar* o modelo. Ela otimiza completude, não risco.
- **A reformulação vencedora:** coordinator-first, single-player-que-vira-rede. O moat é psicológico + de retenção, não de integração.
- **O único número a provar antes de escalar:** o *lift* de retenção da coorte-de-clube vs. solo, medido no Leela. Tudo antes disso é teatro.
- **O caminho de menor risco** (resposta direta à pergunta 4 do brief): escolher **um** vertical (assessorias de corrida), onboardar **na mão 5-10 coordenadores** (do things that don't scale), **importar a comunidade de WhatsApp existente**, entregar ingresso + comunicação + um desafio anti-streak + split para o **próprio clube** deles (valor single-player, sem precisar de marketplace), e **medir retenção a 90 dias contra a linha de base histórica/solo**. É o menor experimento que prova o moat E dissolve o ovo-e-galinha de uma vez.

---

## O que valida

- **Whitespace de feature é fato**, não opinião: nenhum player pesquisado cruza os cinco pilares. Confirmado.
- **Comportamento community-first já dominante no BR** = demanda não precisa ser inventada. Christensen (new-market de não-consumo) e Graham ("live in the future, build what's missing") assinam embaixo.
- **Tese anti-streak** cientificamente ancorada (Lally 2010) E estrategicamente brilhante: é ao mesmo tempo o moat psicológico do Sutherland (o concorrente não copia porque é ilógico para ele) e a alma-de-marca do Jobs (values marketing — vende pertencimento, não performance). É o ativo mais forte do discovery.
- **Clube > solo como motor do flywheel** (Collins) — instinto de composição correto.
- **Ranking e feed por clube/turma, nunca global** — validado pela lente comportamental (liga alcançável, status local) e pelo dado de retenção. Decisão certa.
- **Atribuição como IP do Leela vs. gateway como executor plugável** — arquitetura certa, e o enquadramento de porta-de-duas-vias no gateway (Bezos) está correto: decidir rápido.
- **Deliverability como compliance** (SPF/DKIM/DMARC, one-click unsubscribe) — correto e inegociável. RN-133 contando só push promocional — certo.
- **RN-118 (blindar anti-streak em código)** — direção certíssima; o conselho só adiciona o requisito de auditoria/monitoramento (ver movimento 4).

## O que contesta

- **"Unificação dos 5 pilares" como o moat** — é história supply-side, copiável, e um tar pit de ovo-e-galinha. O moat é psicológico + retenção. Reescrever o sumário executivo nesse eixo.
- **Priorização dirigida por completude, não por prova.** O item nº1 ausente: um experimento que meça o elo de retenção. Ausentes também: a **oferta** (Hormozi) e a validação de **skin/specific-knowledge do fundador** (Graham/Taleb).
- **Sequência.** 3 superfícies + 14 épicos antes da prova = risco default-dead. O app do atleta por último, sendo ele a alma que gera o moat, é contraditório.
- **O número 2x tratado como fato.** Emprestado de Strava/NRC, não medido no Leela — fragilidade do peru até ser instrumentado.
- **Coordenador-como-game-master** pode impor fricção no lado escasso. Precisa ser 1 clique (templates), ou o coordenador não usa.
- **As 16 recs não estão erradas, mas ~metade é prematura.** Via negativa (Taleb): adiar E08 influenciador, E10 marcas, E11 analytics, o segundo tema visual, e quase todas as recs marcadas "Depois" até o moat estar provado.

## Pontos cegos

- **Sem oferta, sem sequência de monetização.** O discovery não constrói a grand-slam offer nem modela quem paga e por quê (Hormozi).
- **Sem checagem de skin/specific-knowledge do fundador.** O fundador roda um clube, corre, viveu esse problema? Determina se é "made for themselves" ou palpite (Graham/Taleb).
- **Forças de Habit/Anxiety do coordenador sair do WhatsApp subestimadas** (Christensen).
- **Dependência de trilhos que não se controla** — Firebase (fornecedor único), provedores de push, políticas de inbox — como risco de cauda (Taleb).
- **Falha silenciosa do agregado anti-streak = porta de uma via da confiança.** Precisa de invariante auditável + alerta, não só a regra (Taleb).
- **Economia de aquisição dos dois lados não modelada:** quem é subsidiado, CAC por coordenador vs. por atleta, LTV por clube ativo (Bezos/Hormozi).
- **A fonte real do moat (o amor do atleta) está agendada por último e nunca é testada cedo** (Jobs).
- **Resposta competitiva não war-gameada:** e se Sympla/Strava colarem comunidade? A defesa (moat de valores) é plausível mas não estressada.

---

## Sequência de ataque recomendada (fases)

**Fase 0 — Reenquadrar e afiar (semanas 1-2, zero código).**
Reescrever a tese como coordinator-first SaaS-que-vira-rede. Articular o Job único. Escrever o press release working-backwards do coordenador E a grand-slam offer. Validar skin/specific-knowledge do fundador. Definir o denominador econômico (lucro por clube ativo) e o único kill-criterion: lift de retenção clube vs. solo.

**Fase 1 — Provar o single-player e o moat (o experimento de menor risco).**
Um vertical (assessorias de corrida). 5-10 coordenadores onboardados na mão. Importar a comunidade de WhatsApp. Entregar o mínimo: ingresso + comunicação na voz do coordenador + **um** desafio anti-streak + split. Lado do atleta fino/manual/web (não construir E13 inteiro). Medir retenção a 90 dias contra baseline. Gateway decidido rápido (porta de 2 vias). Isto é ramen: valor real para 1 coordenador sem depender de rede.

**Fase 2 — Se o número replicar: adensar o núcleo, não alargar.**
Só então construir o app do atleta com profundidade (a alma), o feed/ranking por clube, e a segunda camada de desafios. Continuar coordenador-a-coordenador (do things that don't scale) até o flywheel girar por inércia.

**Fase 3 — Escalar aquisição e monetização.**
Só depois que retenção estiver provada: volume (Hormozi), split multi-parte, influenciador, marcas, analytics. As recs "Depois" do relatório entram aqui — não antes.

**Fase 4 — Rede e defensibilidade.**
Efeitos de rede entre clubes, descoberta, loyalty. War-game de resposta competitiva. Reduzir dependência de trilho único (segundo provider como prova de portabilidade).

---

## 5 movimentos prioritários

1. **Reenquadrar + afiar o wedge e a oferta.** Reposicionar como coordinator-first SaaS-que-vira-rede; articular o JTBD único; escrever o press release do coordenador + a grand-slam offer ("rodo sua comunidade e seu evento; você paga quando arrecada"). Corrige o ponto cego nº1 e o enquadramento do moat. *(Christensen / Bezos / Hormozi)*

2. **Instrumentar o moat antes de tudo.** Tornar "lift de retenção clube vs. solo no Leela" o kill-criterion nº1, medido numa coorte pequena, antes de qualquer escala. Enquanto não medido, toda confiança é a do peru. *(Collins / Taleb — calibração Tetlock)*

3. **Cortar escopo radicalmente para a prova (barbell + via negativa).** Construir só ingresso + comunicação do clube + um desafio anti-streak + split, para um vertical, entregue coordenador-first; adiar app completo, analytics, influenciador, marcas, segundo tema. Lado do atleta na mão (do things that don't scale). *(Jobs / Graham / Taleb)*

4. **Blindar as portas de uma via.** Anti-streak em código com invariante auditável + reconciliação + alerta (a RN-118 está certa; falta o monitoramento contra falha silenciosa); feed por clube; compliance de deliverability. Decidir o gateway rápido (porta de duas vias — não agonizar). *(Taleb / Bezos)*

5. **Vender status, não software; fazer o ritual ser o produto.** Posicionar anti-streak + push racionado + voz-do-coordenador como *costly signals* de cuidado e pertencimento (values marketing) — o moat psicológico que o concorrente não copia por parecer ilógico. Verificar skin/specific-knowledge do fundador. *(Sutherland / Jobs / Taleb)*

---

## Kill-criteria e vindication watch

- **Kill nº1:** se, em 90 dias na coorte-piloto, a retenção da coorte-de-clube não superar materialmente a baseline solo/histórica → o moat não existe; reavaliar como ticketeira de nicho (ou pivotar).
- **Kill nº2:** se 5-10 coordenadores não migrarem da inércia do WhatsApp mesmo com onboarding na mão → o valor single-player não é óbvio; refazer a oferta antes de qualquer código novo.
- **Vindication trigger (revisão em 90 dias):** se o roadmap seguir product-first e a prova de retenção for adiada, Taleb/Graham/Hormozi ficam vindicados. Se a retenção replicar e a reformulação coordinator-first destravar o cold start, Collins/Christensen/Sutherland ficam vindicados. Rechecar neste memo.

*Dissent preservado. Confiança calibrada por banda. Documento do Strategic Council — client-id leela, 2026-07-02.*
