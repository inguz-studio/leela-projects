---
tags: [leela, discovery, benchmark, concorrente, wellable, wellness, gamificacao, recompensas]
aliases: [Benchmark Wellable, Wellable]
status: discovery
data: 2026-07-11
lente: competitor-radar-squad (crq-report-writer)
fontes-carregadas:
  - wellable.co (home)
  - wellable.co/wellness-platform/
  - wellable.co/wellness-challenges
  - wellable.co/employee-wellness-challenges/step-it-up-challenge
  - wellable.co/rewards/
  - wellable.co/pricing/wellness-platform
  - websearch agregando support.wellable.co, wellable.co/rewards-wallet, wellable.co/blog, G2, Capterra, softwaresuggest/getapp/saasworthy
fontes-bloqueadas:
  - nenhum 429/403 registrado
  - wellable.co/platform/wellness-challenges/ e wellable.co/platform/ retornaram 404 (URLs adivinhadas; caminhos reais achados via busca)
---

# Benchmark competitivo · Wellable

> A Wellable é uma plataforma norte-americana de engajamento e bem-estar corporativo (B2B): a empresa contrata, o funcionário usa. Ela reúne desafios de bem-estar, recompensas e reconhecimento num só app. Serve de referência para a dimensão heroica e de bem-estar da Leela (H2): o motor de desafios do clube (E05), a lógica de recompensa, a integração com wearables e a hipótese Leela+.
> Este doc olha para o que mais interessa ao GymRats/E05: como a Wellable estrutura desafios e recompensas, como puxa dado de wearable, como engaja e como monetiza. Depois traduz o aprendizado para E05, Leela+ e a jornada heroica do app do atleta (E13).
> Regra de honestidade: tudo que não pôde ser confirmado em fonte pública está marcado como **não verificado**. Onde as fontes se contradizem, registro as duas e sinalizo o conflito. Nenhum número foi inventado.

## Resumo executivo

A Wellable prova três coisas que a Leela pode usar direto no E05 e no Leela+. Primeiro, pontos como moeda comum funcionam: a Wellable converte atividades muito diferentes (passos, alimentação, aprendizado, meta pessoal) num único "Wellable Point", exatamente o padrão que o motor da Leela já tem com `pontosBase` por ação nos 3 pilares. Segundo, o gancho de recompensa que engaja de verdade é tangível e resgatável, mas na Wellable ele é pago pelo orçamento de benefícios da empresa; a Leela não tem esse pagador, então precisa ancorar recompensa em margem de plataforma (cupom de evento, desconto na taxa) ou no parceiro local (Leela+), nunca no próprio bolso. Terceiro, a própria fraqueza da Wellable valida a tese anti-streak da Leela: reviews reclamam que desafio comprido "decide o vencedor cedo e os outros desistem", e que a mecânica de time por média constrange quem pontua pouco. O leaderboard competitivo puro, que o E13 já deixou fora de escopo, é ponto de dor lá, não diferencial. A Leela ganha ao manter profundidade (Modelo C, equilíbrio) e retorno sem culpa como métrica, e ao copiar da Wellable só o que cabe: catálogo temático de desafios, categorias de benefício de estilo de vida (fitness, saúde mental) para o Leela+, e a ambição de puxar treino de wearable por API em vez de registro manual.

## Nota de maturidade (para comparação justa)

A comparação cruza produtos em estágios muito diferentes. Do lado Leela:

- **E05 (motor de desafios no Painel): protótipo de 11 telas pronto, portando para código.** As regras (RN-110 a RN-117), o catálogo de 16 ações e o motor de pontuação com bônus estão especificados; a implementação em Next.js + Firestore está em curso.
- **E13 (app do atleta, jornada heroica): backlog, não construído.** Onda 4. O registro de ação, participação em desafio, medalhas e feed do clube são coleções novas ainda por criar.
- **Leela+ (benefícios com parceiros locais): hipótese de discovery.** A V1 entrega no máximo uma tela teaser para medir interesse.
- **Integração com wearable: registro manual na V1.** Import automático de Strava/Garmin está fora de escopo da fase; a arquitetura `TrainingProvider` é recomendação do pilar 07, não código.

A Wellable, do outro lado, é um produto em produção no mercado corporativo dos EUA há anos, com app nas lojas, sucesso do cliente dedicado e catálogo maduro. Onde a coluna "Leela hoje" citar E13, Leela+ ou integração de treino, leia como "projetado, não no ar".

---

## 1. Visão geral

A Wellable se apresenta como plataforma "all-in-one" de bem-estar, recompensas e reconhecimento do funcionário (fonte: wellable.co, home, acessado em 11/07/2026). O modelo é B2B com consumo B2B2C: quem compra é o empregador (RH, benefícios), quem usa é o funcionário. O público comprador atravessa setores (saúde, educação, tecnologia, terceiro setor).

O produto se organiza em três famílias de módulo (fonte: wellable.co home e wellable.co/wellness-platform/, 11/07/2026):

- **Wellness.** Conteúdo holístico de bem-estar, desafios de bem-estar, cuidado preventivo (Personal Wellness Assessment e verificação de evento clínico), aulas on-demand, navegação de benefícios e serviços de bem-estar.
- **Rewards.** Gift cards, recompensas customizadas e lifestyle spending account (conta de gasto de estilo de vida).
- **Recognition.** Marcos automatizados, feed social e reconhecimento entre pares.

**Modelo de receita (verificado, com conflito de número).** Assinatura SaaS paga pelo empregador. A página de pricing da plataforma lida em 11/07/2026 mostra dois planos, Essentials e Pro, ambos citados como "$625/month" a "$1.25 PUPM" (per user per month), com mínimo de 25 usuários, e um plano Enterprise sob cotação com suporte full-service e Customer Success Manager conduzindo a administração. Fontes terceiras (G2 e agregadores de review) citam base a partir de "$0.50 por usuário/mês" e um full-service a "$1.000/mês". Os números não batem entre si; trato a estrutura exata como **não verificada** e registro a faixa. Add-ons cobrados à parte (verificado na página de pricing): health coaching, wellness services, biometric screenings, lifestyle spending account e single sign-on. Contrato padrão de um ano renovável; implementação em torno de quatro semanas. Existência de teste grátis é **não verificada** (a página de pricing não menciona; fontes terceiras dizem que há).

---

## 2. Como a Wellable estrutura desafios

Este é o núcleo que interessa ao GymRats/E05. O que reconstruí das páginas de produto, do desafio "Step It Up" e da central de ajuda:

**Pontos como moeda comum (verificado).** O "Wellable Point" é descrito como moeda comum que mede performance entre atividades diferentes (atividade física, nutrição, eventos da empresa). Há quatro formas de ganhar ponto (fonte: WebSearch citando support.wellable.co, 11/07/2026): (i) rastrear atividade física, (ii) registrar refeições via FatSecret, MyFitnessPal ou Fitbit, (iii) aprender e engajar com o tema holístico do mês, (iv) preencher e compartilhar uma planilha de meta pessoal.

**Formato individual ou em time (verificado).** Um mesmo desafio pode rodar individual ou por time. A Wellable recomenda times de 4 a 8 membros (sem limite rígido) e ranqueia os times pela média de pontos por membro. A consequência é explícita na página do "Step It Up": um colega com zero ponto derruba a nota do time inteiro. Accountability é a intenção; na prática vira pressão sobre quem pontua menos (ver seção 7, reviews).

**Duração (verificado, no Step It Up).** O desafio de passos roda de 2 a 10 semanas, configurável. Dicas de saúde semanais mantêm o engajamento ao longo da janela.

**Catálogo temático (verificado, com conflito de número).** A página de desafios fala em "mais de 30" desafios holísticos com temas novos a cada trimestre; a página de pricing fala em "40+ customizable wellness challenges". Registro os dois e marco a contagem exata como **não verificada**. Nomes reais de desafio vistos nas páginas: Step It Up, Move More, Step Into Summer, Back To Basics, Mental Health Matters, Nutrition Ambition, Wealth Challenge, Hydrate for Health. Ou seja, os temas cobrem físico, nutrição, saúde mental, finanças e hidratação, não só passos.

**Social e progresso (verificado).** Leaderboards, dashboards personalizados, chat de comunidade e metas compartilhadas de desafio. Rastreamento por app mobile nativo e integrações com wearables e apps de fitness.

**Prêmios ligados ao desafio (verificado, no Step It Up).** No individual, grandes prêmios vão para os cinco primeiros do leaderboard. No time, grandes prêmios vão para todos os participantes do time vencedor, com possibilidade de premiar times vice-campeões conforme a participação.

### O que ensina para o E05

- **A moeda comum de pontos está certa, e a Leela já a tem.** A Wellable valida converter atividades díspares num ponto único. O motor da Leela faz o mesmo com `pontosBase` por ação (RN-114) e vai além no que importa: opera 3 pilares (físico, mental, espiritual) com o Modelo C exigindo mínimo por pilar (RN-111), e premia profundidade com os bônus de +20% por 3 pilares no mesmo dia e +10% por 5+ dias ativos na semana (RN-115). A Wellable é multi-tema mas o ranking é de pontos crus; a Leela pode vender equilíbrio, não só volume.
- **Janela de 2 a 10 semanas é um bom default concreto.** O E05 modela desafios com ciclo (ativos e encerrados) mas não fixa faixa de duração pública. A faixa da Wellable é uma referência de calibragem para os desafios time-bound do clube.
- **Catálogo de desafio pronto, renovado por tema, é uma alavanca de curadoria.** A Wellable entrega dezenas de desafios prontos e troca temas todo trimestre. O E05 hoje entrega um editor com 3 modelos e 16 ações, o que é mais flexível, porém mais trabalhoso para o coordenador. Vale considerar templates de desafio prontos (Modelo C de "equilíbrio da semana", desafio de "preparação para a prova") que o Felipe (coordenador) só ajusta, em vez de montar do zero.

### O que a Leela faz diferente (E05 e E13)

- **Anti-streak por design, contra o leaderboard-primeiro.** A Wellable é leaderboard e prêmio para o topo. A Leela adota a filosofia "Volte amanhã": nunca punir a falha, medir retorno e cadência, não sequência. O E13 já deixa "ranking/leaderboard competitivo entre atletas" explicitamente fora de escopo. Isso é escolha de posicionamento, não lacuna.
- **Time por média é o que a Leela evita.** Ranquear time pela média (colega de zero ponto derruba o grupo) é justamente a mecânica de culpa/perda que o pilar de gamificação da Leela lista como armadilha. A Leela agrega participação sem decrementar por inatividade (proposta RN-118, "sem punição por inatividade").
- **Profundidade multi-pilar como "momento herói".** Registrar os 3 pilares no mesmo dia dispara celebração (bônus +20%, RN-115), recompensa por profundidade, o oposto do "faça a atividade mais fácil só para subir no ranking".

---

## 3. Recompensas e incentivos

Aqui está o segundo ponto que mais interessa (E05 recompensa e Leela+). O que a Wellable oferece (fonte: wellable.co/rewards/ e wellable.co/rewards-wallet via WebSearch, 11/07/2026):

**Rewards Wallet (verificado, com conflito de número).** Carteira digital onde o funcionário recebe, guarda e resgata recompensa por preferência. A página de rewards fala em "quase 1.000 marcas de gift card em 55+ países"; a home e a página de desafios falam em "800+ marcas globais de gift card, sem taxa administrativa". Registro os dois; a contagem exata é **não verificada**.

**Seis categorias de recompensa (verificado).** Rewards Wallet, Lifestyle Spending Account (allowance para despesas de bem-estar pré-aprovadas como fitness, saúde mental e desenvolvimento profissional), Gift Cards, presentes físicos, contribuição para caridade e recompensas customizadas.

**Resgate flexível (verificado).** As recompensas podem ser dinheiro, PTO (folga remunerada) e gift card eletrônico, processadas via parceiros da Wellable ou pela folha de pagamento do empregador. O funcionário resgata quando quiser, total ou parcial, conforme o saldo, e é avisado por email com as instruções.

**Afirmação de resultado (não verificada de forma independente).** A Wellable afirma que "empresas que oferecem recompensa veem até 21% mais retenção e 25% mais produtividade". É claim de marketing da própria Wellable; trato como **não verificado**.

### O que ensina para o E05 e para o Leela+

- **O gancho de recompensa tangível engaja, mas o pagador muda tudo.** Na Wellable, a recompensa (dinheiro, gift card, PTO) sai do orçamento de benefícios do empregador. A Leela não tem esse pagador. A leitura estratégica, igual à da Cheers, é: a recompensa que a Leela pode dar "de graça" é a que ela mesma controla, o cupom de evento e o desconto na taxa (RN-116 já prevê cupom de evento como um dos 4 tipos). Copiar uma carteira de gift card em dinheiro criaria um centro de custo sem quem banque.
- **A recompensa da Leela pende para identidade, e isso é intencional.** RN-116 tem medalha digital, cupom de evento, medalha física e custom. O pilar de gamificação recomenda medalhas que compõem identidade (colecionáveis persistentes, modelo Insight Timer e Strava), não contador de sequência nem saldo em dinheiro. A Wellable mostra o poder do resgate tangível; a Leela responde com pertencimento e cupom de plataforma, mais barato de operar.
- **A Lifestyle Spending Account é a melhor referência para as categorias do Leela+.** A LSA da Wellable cobre fitness, saúde mental e desenvolvimento pessoal. As categorias da hipótese Leela+ (alimentação, equipamento, recuperação, serviços de bem-estar) são o mesmo território. Vale usar a taxonomia da LSA como ponto de partida para as "3 a 5 categorias de benefício" da tela teaser (LP-T1).
- **UX de resgate "quando quiser, total ou parcial, avisado por email" é um padrão limpo.** Quando o Leela+ (LP-E3) ou o resgate de cupom de evento sair do papel, esse é um bom default de fluxo, somado ao resgate presencial simples da Cheers (mostra e o parceiro confirma).

### O que não copiar

- **Carteira de dinheiro/gift card bancada pela plataforma.** Sem empregador pagando, a recompensa da Leela precisa ser margem de plataforma (cupom, taxa) ou custeada pelo parceiro (Leela+), no espírito ganha-ganha do clube de benefícios.
- **Recompensa só para o topo do ranking.** Premiar os cinco primeiros e o time vencedor reforça o all-or-nothing. A Leela premia conclusão, equilíbrio e retorno, não posição.

---

## 4. Integração com wearables e apps de saúde

Relevante para o E13 (jornada heroica) e para o pilar 07 (integrações de treino).

**O que a Wellable faz (verificado).** Integração direta e com sincronização em tempo real com os principais apps e wearables de consumo: a home e a central de ajuda citam Fitbit, Apple Health, Garmin, Samsung Health, Google Health, Health Mate, MapMyFitness, Runkeeper e Strava, além de registro manual de atividade. O ponto é o ponto sobe sozinho a partir do dado sincronizado do device (fonte: WebSearch citando support.wellable.co "Physical Activity Tracking", 11/07/2026). App nativo iOS e Android, com paridade de funções com a plataforma web.

### O que ensina para o E13

- **Sincronização sem fricção é alavanca de engajamento, e é onde a Wellable apanha.** A integração automática facilita ganhar ponto, mas o principal ponto de dor nos reviews da Wellable é falha de sync ("o device não sincroniza sozinho", "o app não deixa recuperar o dado para receber o ponto depois"). Isso valida os dois lados da tese do pilar 07 da Leela: puxar treino por API (em vez de registro manual, que é a limitação assumida na V1 do E13) tende a engajar mais, e a confiabilidade do sync é um risco operacional a tratar desde o desenho.
- **A restrição da Strava continua sendo o divisor.** A Wellable mostra dado sincronizado dentro de leaderboards sociais. A Leela não pode fazer o mesmo com payload da Strava: o Agreement 2026 só permite exibir o dado de um atleta para ele mesmo (pilar 07, Riscos). Logo, o desafio em grupo da Leela tem que rodar sobre dado próprio (check-in, registro auto-reportado), não sobre o treino Strava exibido a terceiros. A Wellable não tem esse problema porque o modelo dela é individual-para-empregador; a Leela é comunidade, então herda a restrição e precisa desenhar em volta dela.
- **Registro manual na V1 é aceitável, mas com data de validade.** O E13 assume registro manual nesta fase. A Wellable mostra que a expectativa do usuário de wearable é automático. A camada `TrainingProvider` (HealthKit e Health Connect nativos + Strava individual) deve entrar como fast-follow para não ficar atrás na fricção.

---

## 5. Modelo de engajamento e reconhecimento

**O que a Wellable tem (verificado).** Além de desafios, a família Recognition traz marcos automatizados, reconhecimento entre pares e feed social (fonte: wellable.co home, 11/07/2026). A avaliação Personal Wellness Assessment substitui o Health Risk Assessment tradicional, avalia sete dimensões de saúde e bem-estar, dá feedback pessoal ao funcionário e dado agregado ao empregador. Há chat de comunidade, aulas on-demand (a página de pricing cita "2.500+" aulas e "250+" pausas semanais) e navegação de benefícios.

### O que ensina para o E13 e o E05

- **Reconhecimento entre pares e marcos automatizados casam com o feed do clube da Leela.** O E13 já modela um feed social que vive dentro do clube e medalhas por conclusão (RN-116). A camada leve de "marco automatizado + reconhecimento do par" da Wellable é coerente com a evidência Strava (conexão social supera performance como motivador) que o pilar de gamificação adotou. A Leela pode disparar reconhecimento no feed quando um membro conquista medalha, sem inventar um sistema novo.
- **Avaliação de bem-estar multi-dimensão ecoa os 3 pilares.** A PWA de sete dimensões é prima da estrutura físico/mental/espiritual da Leela. Não é para copiar o questionário clínico, e sim para confirmar que o mercado aceita bem-estar como coisa multi-dimensão, não só passos.

---

## 6. Monetização

**Como a Wellable ganha (verificado, com conflito de número).** Assinatura por usuário paga pelo empregador (faixa lida na página de pricing: $1.25 PUPM com piso de $625/mês; fontes terceiras citam a partir de $0.50 PUPM), mais add-ons (coaching, screenings, LSA, SSO), em contrato anual. O pagador é a empresa.

### O que ensina para a Leela

- **O modelo "empregador banca o bem-estar" não transfere.** A Leela não vende para RH; vende para o coordenador de assessoria (dono de clube) e para o atleta. O GymRats, referência do E05, é consumer freemium, não B2B corporativo. O motor de desafios da Leela é feature de retenção e lock-in (comunidade + desafio), não uma linha de receita isolada, o que está alinhado ao posicionamento do fundador.
- **O que transfere é o enquadramento, não o preço.** A LSA como taxonomia de benefício (seção 3) e a tese "recompensa aumenta retenção" (a ser validada, não é dado independente) são os aprendizados de negócio úteis. A monetização do Leela+ (assinatura simbólica, comissão de resgate ou fee de listagem do parceiro) segue a decisão dependente do teaser (LP-E5), não o PUPM da Wellable.

---

## 7. O que os reviews revelam (G2 e Capterra)

Fonte: WebSearch agregando G2 e Capterra, acessado em 11/07/2026. Trato como sinal qualitativo, não amostra medida.

**Elogios recorrentes.** Facilidade de uso e engajamento; abordagem holística (inclui saúde financeira e emocional); variedade de desafios e conteúdo; sistema de recompensa como incentivo; atendimento ao cliente citado como "o melhor" e "incrível"; integração com Fitbit, Apple Health e Samsung Health.

**Críticas recorrentes (e por que importam para a Leela).**

- **Desafio comprido decide o vencedor cedo e os outros desistem.** Este é evidência de terceiro para a tese anti-streak da Leela: leaderboard longo desmotiva a cauda. Reforça medir retorno e profundidade (Modelo C), não posição.
- **Alguns não gostam do leaderboard competitivo.** Confirma a decisão do E13 de deixar ranking competitivo entre atletas fora de escopo.
- **Falha de sync de device** (ver seção 4): risco operacional a mitigar quando a integração de treino entrar.
- **Custo alto para alguns** e pedido de mais personalização de recomendação e conteúdo.

---

## 8. Posicionamento

Onde a Wellable para:

- **Vertical de bem-estar corporativo.** O comprador é o empregador; o contexto é o programa de RH. Esporte de endurance, prova de rua, kit e cronometragem não são o território dela.
- **Engajamento orbitando o funcionário individual.** Times existem, mas a unidade é o funcionário dentro da empresa. Não há coordenador de assessoria como curador, nem clube com identidade própria, nem funil clube para desafio para prova.
- **Recompensa custeada por orçamento de benefício.** O gancho tangível depende de um pagador corporativo que a Leela não tem.

Onde a Leela diferencia:

- **Vertical de esporte, endurance e bem-estar, com o evento no centro.** Desafio ligado à prova ("Preparação para [evento]", RN-113), cupom de evento como recompensa, kit e chip no balcão. A Wellable não toca nada disso.
- **Comunidade contínua com coordenador, não programa de RH.** O funil clube para desafio para evento e a curadoria do coordenador são o tecido que a Wellable não tem. É o mesmo moat que a Leela tem sobre a Cheers.
- **Gamificação ética anti-streak como marca.** "Volte amanhã", sem punição por inatividade, profundidade multi-pilar e retorno como métrica. A Wellable roda no paradigma leaderboard/prêmio-para-o-topo, cujo próprio review expõe o custo.
- **Recompensa ancorada em identidade e em parceiro, não em dinheiro da plataforma.** Medalha que compõe identidade (E13) e benefício de parceiro local (Leela+), no modelo ganha-ganha, sem centro de custo.

Resumo de uma linha: a Wellable é o programa de bem-estar que a empresa compra para o funcionário, com desafio, ponto e carteira de recompensa; a Leela é a plataforma de comunidade esportiva onde desafio, evento, clube e benefício se retroalimentam, com gamificação que encoraja em vez de pressionar.

---

## 9. Tabela-síntese

| Dimensão | Wellable | Leela hoje | Decisão sugerida |
|---|---|---|---|
| Comprador / contexto | Empregador (RH), bem-estar corporativo | Coordenador de assessoria + atleta, esporte/bem-estar | Ignorar o eixo corporativo; manter foco comunidade + evento |
| Moeda de engajamento | Wellable Points, moeda comum entre atividades | `pontosBase` por ação nos 3 pilares (RN-114) + bônus (RN-115) | Manter; é paridade, e a Leela vai além com multi-pilar |
| Modelos de desafio | Tema + pontos; ranking de pontos crus | 3 modelos A/B/C; Modelo C (equilíbrio) é signature (RN-110/111) | Manter; vender equilíbrio, não volume |
| Time | Times de 4 a 8, ranqueados pela média (colega zero derruba o grupo) | Participação agregada sem decrementar por inatividade (proposta RN-118) | Ignorar o ranking por média; conflita com anti-streak |
| Duração | 2 a 10 semanas, configurável (Step It Up) | Ciclo ativo/encerrado, sem faixa pública fixada | Copiar a faixa 2 a 10 semanas como default de calibragem |
| Catálogo de desafio | 30+ a 40+ temas prontos, renovados por trimestre (contagem não verificada) | Editor com 3 modelos + 16 ações (mais flexível, mais trabalhoso) | Melhorar: oferecer templates prontos por cima do editor |
| Filosofia de gamificação | Leaderboard + prêmio para o topo | Anti-streak, "Volte amanhã", retorno e profundidade | Manter; é o moat, e o review da Wellable o valida |
| Recompensa | Carteira: gift card, dinheiro, PTO, LSA, físico, caridade, custom | Medalha digital, cupom de evento, medalha física, custom (RN-116) | Manter identidade + cupom; não copiar carteira de dinheiro |
| Quem paga a recompensa | Orçamento de benefício do empregador | Sem pagador equivalente | Ancorar em margem de plataforma (cupom/taxa) ou parceiro (Leela+) |
| Benefício de estilo de vida | Lifestyle Spending Account (fitness, saúde mental, dev) | Leela+ hipótese (alimentação, equipamento, recuperação, bem-estar) | Copiar a taxonomia da LSA para as categorias do teaser (LP-T1) |
| Wearables | Sync direto em tempo real (Fitbit, Apple Health, Garmin, Strava, etc.) | Registro manual na V1; `TrainingProvider` é recomendação (pilar 07) | Melhorar: priorizar Health nativo + Strava individual como fast-follow |
| Desafio em grupo sobre dado de wearable | Sim (modelo individual não esbarra na Strava) | Restrito: Strava 2026 só exibe dado ao próprio atleta | Manter desafio em grupo sobre dado próprio (check-in/registro) |
| Reconhecimento | Marcos automatizados, reconhecimento entre pares, feed social | Feed do clube + medalhas (E13) | Manter; disparar reconhecimento no feed ao conquistar medalha |
| Monetização | Assinatura PUPM paga pelo empregador + add-ons | Fee de plataforma, afiliação; Leela+ a definir (LP-E5) | Não copiar PUPM; usar só o enquadramento LSA + tese de retenção |

---

## Fontes e verificação

Verificado em fonte pública (acessado em 11/07/2026):

- Páginas Wellable carregadas por WebFetch: `wellable.co` (home), `wellable.co/wellness-platform/`, `wellable.co/wellness-challenges`, `wellable.co/employee-wellness-challenges/step-it-up-challenge`, `wellable.co/rewards/`, `wellable.co/pricing/wellness-platform`.
- Agregado por WebSearch: `support.wellable.co` (Physical Activity Tracking, Required Information For A Challenge), `wellable.co/rewards-wallet`, `wellable.co/blog` (incentive ideas, custo de programa, estrutura de recompensa), reviews de G2 e Capterra, agregadores de pricing (softwaresuggest, getapp, saasworthy).

Sem bloqueio 429/403 registrado. Duas URLs adivinhadas retornaram 404 e foram substituídas pelos caminhos reais achados na busca: `wellable.co/platform/wellness-challenges/` e `wellable.co/platform/`.

Marcado como não verificado:

- Estrutura exata de pricing: a página de pricing lida cita Essentials e Pro a "$625/mês" ("$1.25 PUPM", mín. 25 usuários); fontes terceiras citam base a partir de "$0.50 PUPM" e full-service a "$1.000/mês". Os números conflitam; a estrutura exata fica não verificada.
- Existência de teste grátis (página de pricing não menciona; fontes terceiras dizem que há).
- Contagem exata de desafios ("30+" na página de desafios vs "40+" na página de pricing).
- Contagem exata de marcas de gift card ("800+" na home vs "quase 1.000 em 55+ países" na página de rewards).
- Afirmação de resultado "até 21% mais retenção e 25% mais produtividade": claim de marketing da própria Wellable, sem verificação independente.

## Volta para
- [[DISCOVERY]] · [[benchmark-cheers]] · [[leela-plus-hipotese-jtbd]] · [[pilares/04-gamificacao]] · [[pilares/07-integracoes-treino]] · [[NUVEM-FUNCIONALIDADES]]
