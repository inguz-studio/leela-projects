# D3 · Riscos, forecast e kill-criteria: "publisher primeiro, produto depois"

> Entrega 3 da fase 1 de pesquisa FLG & Publisher (trace leela-build-2d6ee98d, trilha PARALELA-3).
> Elaborado por research-intelligence (ri-risk-head + ri-forecasting-head) · pesquisa e acesso a fontes em 05/07/2026.
> Insumos internos: [[PARECER-CONSELHO]], [[01-benchmark-flg]], [[02-mapa-publishers-wellness]], [[V1-PRODUTOR-web]].
> Aviso de método: probabilidades abaixo são estimativas calibradas com método declarado, não medições. Cada uma tem base rate nomeado, ajustes explícitos e banda. As recomendações de sequenciamento são preliminares; a decisão é da mesa da fase 2.

---

## 1. O que está sendo avaliado

A estratégia em análise tem duas linhas que o brief trata como uma só e este doc separa de propósito:

- **Linha documentativa:** o founder documenta a construção do Leela (decisões, prática como atleta-coordenador, bastidores), dirigida ao produtor/coordenador. Custo marginal baixo, no caminho do build.
- **Linha publisher:** o founder opera uma mídia de bem-estar (tese anti-streak/constância compassiva), dirigida ao praticante. Custo alto, fora do caminho do build, com o buraco editorial real que o D2 mapeou.

O risco não está em "fazer conteúdo". Está em confundir as duas linhas: elas têm públicos diferentes, custos diferentes e mecanismos de conversão diferentes. O D1 não encontrou nenhum caso verificado de founder que buscou PMF e operou publisher generalista ao mesmo tempo (achado 7 do [[01-benchmark-flg]]). Isso não prova impossibilidade; prova que a aposta não tem precedente, e apostas sem precedente pagam prêmio de ignorância.

Contexto que aperta tudo: o V1 produtor-first está em construção com um sócio produtor concreto esperando o sistema ([[V1-PRODUTOR-web]], seção 0). Cada hora de mídia do founder compete com a entrega que destrava o primeiro cliente real.

---

## 2. Tail-risk map

Convenção: **impacto** (baixo/médio/alto/fatal) × **irreversibilidade** (recuperável/custoso/porta de uma via). O fragility index responde "sob quais condições isso explode". A lente Schneier responde "quem ganha se quebrar".

| # | Risco | Impacto | Irreversibilidade | Condição de explosão |
|---|---|---|---|---|
| R1 | Dispersão de foco do founder durante o build | Alto | Custoso | Mídia consome >8h/semana com V1 em atraso |
| R2 | Audiência errada (praticante cresce, produtor não chega) | Alto | Recuperável, mas caro em tempo | 6+ meses de editorial voltado só ao atleta |
| R3 | Massa crítica de mídia chega depois do runway | Fatal | Porta de uma via (caixa) | Publisher tratado como canal primário de aquisição |
| R4 | Dependência de algoritmo | Médio | Recuperável | Distribuição concentrada em rede social sem lista própria |
| R5 | Exposição de métricas e mecânica vira blueprint de clone | Alto | Porta de uma via (informação publicada não volta) | Publicar retenção, arquitetura ou pipeline |
| R6 | Audiência fica com o founder, não com o Leela | Médio | Custoso | Marca pessoal sem ponte estrutural para a marca Leela |

### R1 · Dispersão de foco do founder

O turco aqui é o founder que acha que aguenta as duas frentes. Base rates externos dizem que não: 52% dos creators reportam burnout e 37% consideraram abandonar a atividade (survey Billion Dollar Boy/Censuswide com 1.000 creators, jul/2025) [5]; 90% dos podcasts param de publicar depois do episódio 3 e só 10-11% dos podcasts indexados seguem ativos (Podnews mai/2025, via Forbes jan/2026) [2]. Esses números são de gente cujo trabalho principal É o conteúdo. O founder do Leela teria o conteúdo como segundo turno de um build com cliente esperando.

**Fragility index:** explode quando a cadência pública vira compromisso de marca ("newsletter toda terça") e o build entra em sprint. Nesse momento o founder escolhe entre quebrar a promessa pública ou atrasar o produto; as duas opções corroem confiança. **Quem ganha:** Cheers e qualquer ticketeira funcional, que seguem vendendo enquanto o founder edita vídeo. **Nota de coerência:** uma marca cuja tese é anti-streak não pode operar o próprio marketing sob lógica de streak. Se a casa promete "volte amanhã" ao atleta e o founder se autoflagela por perder uma terça, a contradição vira pauta contra a marca.

### R2 · Audiência errada

O buraco editorial do D2 é real, mas ele constrói o lado que não paga. O tom compassivo escala audiência de praticante (atleta); o cliente do V1 é o produtor/coordenador ([[02-mapa-publishers-wellness]], seção 5.4). O D1 mostra que FLG converte quando o público do conteúdo é o comprador, ou quando existe funil longo de educação (achado 4). Audiência de consumidor com comprador B2B é exatamente o quadrante sem caso de sucesso verificado.

**Fragility index:** explode em silêncio; é o risco mais traiçoeiro do mapa porque as métricas de vaidade (assinantes, views) sobem enquanto o pipeline de produtores continua vazio. Vitória aparente, derrota real. **Quem ganha:** o próprio founder como creator (a audiência tem valor pessoal), não a empresa. Schneier chamaria de misalignment: quem paga o custo é o Leela, quem fica com o ativo é o indivíduo. **Mitigação estrutural (do D1):** documentar para o lado profissional e deixar o atleta ser prova social, não alvo editorial primário.

### R3 · Tempo até massa crítica vs. runway

Base rates do [[01-benchmark-flg]] (síntese 1): mediana de 18-36 meses até tração nos casos de produto com conteúdo; 4-5 anos nos publishers puros (The Hustle, Primo Rico, BPN); base rate BR nichado de ~3.000 assinantes em 13 meses (Okamoto). O dado da plataforma beehiiv (mediana de 8.314 assinantes ao fim do ano 1, relatório 2026) [1] parece contradizer isso, mas carrega viés de sobrevivência severo: só conta quem continuou publicando, numa plataforma anglófona com mecânica de recomendação cruzada. Trato o intervalo Okamoto-beehiiv como banda, não como meta.

"Publisher primeiro, produto depois" na forma literal significa financiar 2-4 anos de mídia antes da receita de produto. Hormozi e Nigro fizeram isso com capital e anos de acúmulo prévios (D1, casos 7 e 10). Sem esse colchão, é fatal por definição: o caixa acaba antes da massa crítica.

**Fragility index:** explode se a linha publisher for tratada como canal primário de aquisição do V1. Como aposta convexa de 10-15% do tempo, não mata; como estratégia-mãe, mata. **Quem ganha:** concorrentes funcionais que vendem hoje, e os publishers incumbentes de wellness que já têm a audiência.

### R4 · Dependência de algoritmo

O alcance orgânico do LinkedIn caiu ~65% desde o pico de 2023 (análise Chris Donnelly, Q3 2025) [3]; levantamento com ~400 mil perfis mostra visibilidade média -47% e crescimento de seguidores -42% [4][6]. Instagram e TikTok mudam regra sem aviso. Quem constrói audiência alugada constrói sobre areia; o único ativo de distribuição que o founder controla é lista de e-mail própria (a tese inteira da categoria newsletter no D2).

**Fragility index:** explode quando >70% do alcance vem de uma única rede social. **Quem ganha:** a plataforma (que vende de volta, como ads, o alcance que confiscou). É o modelo de negócio dela; a queda de alcance orgânico não é acidente, é extração de renda.

### R5 · Exposição vira blueprint de clone

Kahl (abr/2026): o threshold seguro de transparência "caiu a zero" na era de código agêntico; recomendação explícita de nunca publicar números financeiros nem arquitetura [7]. O caso Postma (D1, caso 12) mostra o custo: receita achatada em 2025 depois que copycats clonaram o produto documentado. Para o Leela, o único número que É o moat (lift de retenção clube vs. solo, kill-criterion nº 1 do [[PARECER-CONSELHO]]) é precisamente o que não pode virar conteúdo.

**Fragility index:** explode com um único post; informação publicada é porta de uma via. **Quem ganha:** qualquer concorrente com um agente de código. **O que é seguro publicar:** a tese anti-streak (moat ilógico que o concorrente não copia porque contradiz o modelo de engajamento dele, argumento Sutherland do parecer), a prática do founder, decisões de produto já irreversíveis. O que não é: retenção, arquitetura, pipeline de produtores, economics do split.

### R6 · A audiência pertence ao founder, não à empresa

Trends foi descontinuado depois que Sam Parr saiu; a audiência de Tibo ficou com ele, não com o comprador dos produtos (D1, síntese 5). Para o founder, isso é resiliência pessoal (caso Lavingia). Para o Leela como empresa (e para o sócio produtor), é risco de ativo-chave fora do balanço.

**Fragility index:** explode em qualquer evento de separação (conflito societário, venda, saída). **Quem ganha:** o founder, sempre. Por isso a mitigação é estrutural e precisa nascer no dia 1: newsletter em domínio da marca, arquivo editorial como ativo da empresa, co-assinatura Leela nos formatos, e a transição marca-pessoal para marca-casa desenhada por contrato antes de existir valor a disputar.

---

## 3. Forecasts calibrados

Método padrão da casa (rubrica de agregação): decompor a pergunta, ancorar em base rate, ajustar por fatores específicos, reportar point estimate + banda de 90% de confiança da própria estimativa. Horizonte: 12 meses a partir do início da operação de mídia, salvo indicação. Estes números devem entrar no tracking de Brier da casa quando as perguntas resolverem.

**F1 · P(founder mantém cadência semanal de publicação por 12 meses seguidos enquanto constrói o V1) = 30% (banda 20-42%)**
Base rate: 90% dos podcasts morrem no episódio 3 [2]; 52% de burnout e 37% de quase-abandono entre creators profissionais [5]. Ajustes para cima: incentivo econômico direto, tese editorial já pronta (o discovery interno é banco de pautas, D2 seção 6), formato newsletter é mais barato que vídeo/podcast. Ajustes para baixo: build V1 com sócio esperando é exatamente o tipo de choque que quebra cadência; founder solo sem equipe de conteúdo. Nota: cadência quinzenal ou mensal sobe a estimativa para a faixa de 55-65%; o forecast é sensível à promessa de frequência, o que por si já é recomendação.

**F2 · P(newsletter anti-streak alcança ≥3.000 assinantes em 12 meses | cadência mantida) = 45% (banda 30-60%)**
Base rate: Okamoto, nicho BR bem definido com distribuição via LinkedIn, fez 3.000 em 13 meses (D1, caso 11); mediana beehiiv ano 1 de 8.314 com viés de sobrevivência declarado [1]. Ajustes para cima: buraco editorial sem concorrente mapeável em português (D2, seção 5), demanda demonstrável por 6 sinais independentes (D2, 5.3), founder com acesso à comunidade de corrida via produto. Ajustes para baixo: nicho "constância compassiva" ainda não tem prova de demanda em português (a demanda demonstrada é do comportamento, não do formato); wellness BR compra vídeo e áudio, não e-mail (nenhuma newsletter BR de movimento com escala, o que é oportunidade E aviso). Condicional na cadência: sem F1, F2 não existe.

**F3 · P(≥10 produtores/coordenadores no pipeline com atribuição a conteúdo documentativo em 12 meses | linha documentativa dirigida ao produtor + outbound ativo) = 58% (banda 40-72%)**
Base rate: o único efeito quantificado do gênero é lemlist, resposta de outbound 2-3x maior entre quem via o conteúdo do founder (D1, caso 3). Mecanismo: conteúdo multiplica venda direta, não a substitui. Ajustes para cima: mercado de produtores BR aquecido (provas +85% em 2025, D2 5.3); wedge coordinator-first do parecer dá o ICP exato; 10 leads em 12 meses é meta modesta. Ajustes para baixo: exige que o founder pitche de verdade (a pergunta Hormozi do parecer: quantos produtores por semana?); atribuição limpa é difícil e o número pode existir sem ser medido. Este é o forecast que a linha documentativa precisa vencer para se justificar.

**F4 · P(linha publisher wellness gera ≥3 clientes produtores pagantes atribuíveis em 12 meses) = 12% (banda 5-22%)**
Base rate: zero casos verificados no quadrante audiência-consumidor/comprador-B2B (D1, síntese 4); conversão indireta (atleta lê, produtor fica sabendo) tem dois saltos de funil. Ajustes para cima: o produtor também é praticante; comunidade de corrida BR é densa e pequena o bastante para transbordo social. É a aposta convexa do barbell: probabilidade baixa, payoff alto (se funcionar, o Leela tem mídia própria que a Cheers não copia). Deve ser tratada como opção barata, nunca como plano.

**F5 · P(V1 desliza ≥30 dias com causa atribuível à agenda de mídia | founder dedica >10h/semana à mídia durante o build) = 62% (banda 45-75%)**
Base rate: não existe medição pública de "atraso de produto por conteúdo"; uso como proxy a estrutura de burnout por sobrecarga (31% citam workload como causa [5]) e a ausência de qualquer caso no D1 de founder que tenha segurado build + publisher simultâneos. Método: estimativa estrutural (dois compromissos com deadline competindo pelo mesmo recurso indivisível), não frequência observada; por isso a banda é larga. Abaixo de 5h/semana em formato documentativo, a estimativa cai para a faixa de 15-25%, porque o conteúdo vira subproduto do trabalho que já acontece.

**F6 · P(algum canal social dominante do founder perde ≥30% de alcance orgânico em 18 meses) = 88% (banda 78-95%)**
Base rate: LinkedIn -65% desde 2023 [3], visibilidade média -47% em ~400 mil perfis [4], quedas equivalentes documentadas em ciclos anteriores de Facebook/Instagram. Isso é quase um invariante estrutural das plataformas. Consequência direta: lista própria desde o dia 1; rede social é aquisição, e-mail é ativo.

---

## 4. Kill-criteria mensuráveis

Regra da casa: critério sem métrica, dono e data é teatro. Todos abaixo assumem início da medição no dia em que a linha de mídia começar a operar. "Matar" nunca significa silêncio total; significa recuar para o documentativo mínimo (≤2h/semana, sem promessa pública de cadência) e realocar o tempo no build.

| # | Critério | Métrica e limiar | Janela | Ação se disparar |
|---|---|---|---|---|
| K1 | Custo de oportunidade | Mídia >8h/semana do founder por 4 semanas consecutivas durante o build, OU marco do V1 desliza >30 dias com causa mídia nomeada no post-mortem | Contínua até V1 no ar | Matar linha publisher; documentativo mínimo; rediscutir só depois do V1 entregue ao sócio produtor |
| K2 | Mix de audiência | <15% da base identificável como produtor/coordenador/assessoria (pesquisa de inscrição + tags de origem) E zero conversas de pipeline originadas em conteúdo | Mês 6 | Pivotar editorial para o lado profissional (documentativo B2B); publisher de praticante vira prova social, não linha própria |
| K3 | Conversão B2B | <5 leads qualificados de produtor com atribuição a conteúdo ("como nos conheceu" + UTM + registro no CRM) | Mês 9 | Conteúdo não é canal de aquisição: concentrar em outbound direto (base rate lemlist diz que o conteúdo multiplica outbound; sem outbound não há o que multiplicar) |
| K4 | Cadência | 4 edições perdidas em 12 semanas, ou 3 consecutivas, na frequência prometida publicamente | Contínua, primeiros 6 meses | Reduzir formato e frequência até caber (só newsletter, quinzenal ou mensal); se ainda quebrar, matar a linha; jamais heroísmo de streak |
| K5 | Crescimento do publisher | <1.000 assinantes no mês 6 ou <3.000 no mês 12 (piso = base rate Okamoto, D1 caso 11) | Meses 6 e 12 | Matar a aposta convexa publisher; manter documentativo; registrar o forecast F2 como resolvido para calibração |

Dois vínculos com o parecer do conselho: K1 protege o kill-criterion nº 1 da mesa (a prova de retenção precisa do V1 no ar; nada de mídia antes do experimento que importa), e K4 é a tese anti-streak aplicada à própria operação (a marca não pode quebrar por dentro a promessa que faz por fora).

---

## 5. Resiliência adaptativa e barbell

### Via negativa (o que não fazer, antes de qualquer adição)

1. **Não publicar** métricas de retenção, arquitetura, economics do split, pipeline de produtores (R5; Kahl 2026 [7]). A tese anti-streak é publicável e inclonável; os números do moat, não.
2. **Não construir infraestrutura de mídia** (site editorial, identidade de publisher, equipe, estúdio) antes de sinal de K2/K3/K5. Infra antes de sinal é o "meio medíocre" que o barbell proíbe.
3. **Não prometer cadência pública** que não sobrevive a um sprint de build. A promessa certa é de presença, não de frequência ("escrevo quando o build ensina algo" documentativo; se houver newsletter, começar mensal e subir, nunca o contrário).
4. **Não misturar as duas linhas num único funil**: mensagem para produtor e mensagem para praticante em espaços separados desde o início, senão o K2 fica imensurável.

### Recomendações adaptativas (ganham com o stress)

1. **Conteúdo como subproduto do build, nunca como turno extra.** Cada decisão real do V1 vira pauta documentativa em minutos, não horas (F5 cai de ~62% para ~15-25% abaixo de 5h/semana). O sistema fica mais forte justamente nas semanas intensas de build: mais trabalho real, mais matéria-prima.
2. **Lista própria desde o primeiro post; rede social só como porta de entrada** (F6 a 88% torna isso não negociável). Choque de algoritmo vira argumento editorial ("por que você não deveria construir sua comunidade em terreno alugado"), que é literalmente o pitch do produto Leela para o produtor. O risco vira venda.
3. **Ponte marca-pessoal → marca-Leela estrutural no dia 1** (R6): domínio e base de e-mail da empresa, co-assinatura, e acordo societário cobrindo o ativo de audiência antes que ele valha algo.
4. **Skin in the game público:** publicar os próprios kill-criteria desta linha (K4 e K5) como conteúdo. Coerente com a tese da casa e com a marca anti-streak; se disparar, o recuo já está narrado como decisão de método, não como fracasso escondido. Transforma até a morte da linha em ativo de confiança.

### Barbell do tempo de mídia do founder

- **85-90% seguro:** documentativo dirigido ao produtor/coordenador, no caminho do build, ≤5h/semana, LinkedIn + WhatsApp (onde o produtor está) com arquivo em lista própria. Mecanismo-alvo: o efeito lemlist (2-3x na resposta do outbound).
- **10-15% convexo:** a semente publisher anti-streak. Uma newsletter mensal barata testando o buraco editorial do D2, sem infra, sem promessa de escala, medida por K5. Payoff se funcionar: mídia própria no vazio editorial brasileiro antes de alguém ocupar. Perda máxima se falhar: algumas dezenas de horas e um forecast resolvido.
- **0% no meio:** nada de redação wellness, canal de YouTube produzido, podcast semanal ou "estratégia de conteúdo 360". É o meio que mata: caro demais para ser barato, pequeno demais para ter massa crítica.

---

## 6. Sequenciamento preliminar (decisão é da mesa, fase 2)

**Opção A · Documentativo agora, publisher como semente (recomendação preliminar da casa).** Durante o build do V1: linha documentativa ao produtor (85-90% do tempo de mídia) + newsletter anti-streak mensal como aposta convexa (10-15%). Escalar somente o que der sinal em K2/K3/K5, depois do V1 no ar. Trade-offs: renuncia à ocupação rápida do buraco editorial; em troca, protege o build, testa as duas hipóteses com custo mínimo e mantém todas as opções abertas. É a única opção compatível simultaneamente com os base rates do D1, o buraco do D2 e o runway.

**Opção B · Publisher pleno em paralelo.** Operar a mídia anti-streak como linha completa desde já (cadência semanal, multiformato). Trade-offs: maximiza a chance de ocupar o vazio editorial antes de terceiros e compõe audiência mais cedo; mas colide de frente com F1 (30%), F5 (62%) e K1, aposta no quadrante sem precedente (F4 a 12%) e financia o lado que não paga. Só faz sentido com um operador de conteúdo dedicado que não seja o founder, o que cria custo fixo antes de receita.

**Opção C · Publisher adiado por completo.** Zero mídia até a retenção provada (fase 2 do parecer). Trade-offs: dispersão zero; mas desperdiça o custo quase nulo do documentativo, abre mão do efeito lemlist no pitch aos produtores e deixa a janela editorial aberta para outro ocupante. Subtração além do ótimo: o documentativo é a rara adição que passa no teste da via negativa (remove a dependência de mídia paga futura em vez de adicionar complexidade).

A casa registra posição para a mesa: **A**, com K1-K5 armados desde o primeiro dia e revisão dos forecasts F1-F6 no mês 6 (Brier tracking).

---

## Fontes

Todas acessadas em 05/07/2026.

1. beehiiv, "The State of Newsletters 2026" (mediana de 482 assinantes no mês 1 e 8.314 ao fim do ano 1 entre newsletters ativas da plataforma; 66 dias como mediana até o primeiro dólar) — https://www.beehiiv.com/blog/the-state-of-newsletters-2026
2. Forbes (Frank Racioppi), "Why Do So Many Podcasts Fail?" (06/01/2026; cita Podnews mai/2025: 90% dos podcasts param após o episódio 3; 10-11% dos indexados ativos) — https://www.forbes.com/sites/frankracioppi/2026/01/06/why-do-so-many-podcasts-fail/
3. Chris Donnelly (LinkedIn), "Q3 2025 LinkedIn Update" (alcance orgânico -65% vs. pico de 2023; top 1% concentra ganhos) — https://www.linkedin.com/posts/donnellychris_q3-2025-organic-reach-is-down-65-from-peak-activity-7382383609682341889-flhJ
4. PropelGrowth, "LinkedIn Algorithm Reset Q4 2025: Why Views Dropped" (análise de ~400 mil perfis: visibilidade média -47%, engajamento -39%, crescimento de seguidores -42%) — https://www.learning.propelgrowth.com/blog/linkedin-algorithm-reset-q4-2025-why-views-dropped-and-how-to-fix-it
5. Netinfluencer, "Creator Burnout Crisis" (survey Billion Dollar Boy/Censuswide, jul/2025, 1.000 creators US/UK: 52% com burnout, 37% consideraram sair; workload 31% das causas) — https://www.netinfluencer.com/creator-burnout-crisis-research-shows-52-percent-experiencing-burnout-37-percent-consider-leaving-the-industry/
6. Entrepreneur, "Organic Reach On LinkedIn Is Cratering. Here's How To Revive Yours" (queda de alcance 2024-2026; priorização de perfis pessoais sobre páginas) — https://www.entrepreneur.com/growing-a-business/organic-reach-on-linkedin-is-cratering-heres-how-to/497713
7. Arvid Kahl, "Building in Public: Risks and Strategies for Founders" (03/04/2026; threshold de transparência "caiu a zero" com código agêntico; não publicar números nem arquitetura) — https://thebootstrappedfounder.com/the-increasing-risk-of-building-in-public/
8. Tubefilter, "In sweeping study, 89% of creators claim to lack access to specialized mental health resources" (12/11/2025; estudo Creators 4 Mental Health: 62% reportam burnout) — https://www.tubefilter.com/2025/11/12/creators-4-mental-health-burnout-study-results/

Fontes internas: `leela-specs/05-discovery/PARECER-CONSELHO.md` (kill-criteria da mesa, calibração por bandas, barbell Taleb) · `leela-specs/05-discovery/flg-publisher/01-benchmark-flg.md` (base rates de tração, efeito lemlist, casos cautionary) · `leela-specs/05-discovery/flg-publisher/02-mapa-publishers-wellness.md` (buraco editorial, tensão praticante vs. produtor) · `leela-specs/V1-PRODUTOR-web.md` (V1 em build, sócio produtor esperando).

---

## Volta para
- [[00-sintese-executiva]] · [[01-benchmark-flg]] · [[02-mapa-publishers-wellness]] · [[PARECER-CONSELHO]]
