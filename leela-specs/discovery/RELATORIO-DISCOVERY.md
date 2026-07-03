# Relatório executivo de discovery · Leela

> Síntese dos 5 pilares de pesquisa de mercado para o ecossistema Leela.
> Base: benchmarks datados de 2026-07-02 (fontes nos 5 arquivos de pilar). Nada inventado aqui; números e taxas vêm dos relatórios de origem.
> Para: fundador do Leela · Por: research-intelligence.

---

## Sumário executivo

O mercado esportivo brasileiro e global é **inscrição-first**: todo player forte resolve a venda do ingresso e para ali. Ninguém unifica ingresso, comunidade, comunicação segmentada, desafios gameficados e afiliação num produto só. Ao mesmo tempo, o comportamento real do corredor brasileiro já é community-first (mais da metade participa de grupos; ~25% usam assessorias), e os dados de retenção são inequívocos: quem está num clube tem ~2x mais chance de continuar ativo depois do marco crítico de 90 dias. O Leela não precisa inventar demanda; precisa ocupar um território vazio que o comportamento do mercado já validou. A tese se sustenta, mas o discovery expõe cinco decisões que precisam ser tomadas agora para não travar a execução das Ondas 2 a 4.

Decisões que este relatório defende:

- **Vender comunidade como eixo, ingresso como porta de entrada.** O ticketing é paridade competitiva; o moat é o que vem depois da inscrição.
- **Blindar o anti-streak em código, não só em copy.** A filosofia "Volte amanhã" precisa de uma regra de negócio que proíba punir inatividade (nova RN-118).
- **Escolher o gateway pelo modelo de recebedor e custo de Pix, não pela marca.** Recomendação preliminar: Pagar.me (default) ou Asaas (custo); a atribuição de venda é IP do Leela, o gateway só executa o split.
- **Tratar deliverability e limite de push como requisito de compliance**, não detalhe. Sem SPF/DKIM/DMARC e one-click unsubscribe, o envio quebra em Gmail/Yahoo.
- **Ranking e feed por clube/turma, nunca global.** Os dados de retenção mandam puxar o atleta para o contexto do clube, não para um grafo anônimo.

---

## O whitespace

O mercado se divide em dois campos, e cada um deixa metade do problema sem resolver.

De um lado, as **verticais de esporte** (Ticket Sports, Central da Corrida, RunSignup, Race Roster): resolvem inscrição, lotes, categorias por percurso e cronometragem, mas param no dia da prova. Comunidade é bolt-on quando existe. Desafios contínuos entre eventos são inexistentes.

Do outro, os **SaaS de assessoria BR** (Treinus, SisRUN, MeuPace): resolvem gestão de alunos, prescrição e cobrança, mas não têm alma de comunidade — o pertencimento fica no grupo de WhatsApp, não no produto.

E há os **apps de performance/hábito** (Strava, NRC, adidas, Duolingo): dominam gamificação e feed social, mas são performance-first (glorificam velocidade e streak perfeito) e não têm ingresso nem afiliação.

O Leela é o único desenho que costura os cinco: **ingresso** (porta de entrada) + **comunidade/clube** (lock-in emocional) + **desafios gameficados anti-streak** (retenção sem punição) + **comunicação na voz do coordenador** (relação, não spam) + **afiliação clube↔organizador** (lock-in financeiro). Nenhum player pesquisado ocupa esse cruzamento. O comportamento community-first já é dominante no Brasil; o produto que o digitaliza inteiro ainda não existe.

---

## Achados por pilar

### 1. Ticketing esportivo
[`pilares/01-ticketing.md`](./pilares/01-ticketing.md)

- **Lotes com preço crescente e preço por percurso/categoria são padrão universal** nas verticais de esporte. Precisam ser cidadãos de primeira classe no E04, não "tipo de ingresso" genérico.
- **Flexibilidade de quem paga a taxa** (absorver / repassar / split 50-50) existe lá fora; o split 50/50 do RunSignup é raro no BR e vira diferencial já no MVP.
- **Cobrança por carrinho, não por inscrição** (RunSignup) favorece inscrição de grupo/família — vantagem que nenhum player BR por-inscrição tem.
- **Split multi-parte (organizador↔influenciador↔Leela) não existe como recurso nativo** em nenhum benchmark. É whitespace direto ligado ao E08.

### 2. Comunidade / Clubs & engajamento
[`pilares/02-comunidade-clubs.md`](./pilares/02-comunidade-clubs.md)

- **Clube supera solo em retenção** (~2x mais chance de continuar ativo após 90 dias, Strava/NRC). Tudo no produto deve empurrar o atleta para o contexto do clube.
- **Leaderboard segmentado resolve o problema do ranking global**: Strava decompõe em milhares de rankings locais para que todos tenham uma liga alcançável. Ranking Leela deve ser por clube/turma.
- **Consistência é subvalorizada pelos grandes** (só o Local Legend da Strava premia repetição). O Modelo C e o tom "Volte amanhã" nascem pró-consistência e pró-iniciante — vantagem de posicionamento.
- **O coordenador como game master é papel inexistente nos concorrentes.** Nenhum dá ao treinador o poder de desenhar desafios que fazem parte do planejamento de treino. Mecânica proprietária do E05.

### 3. Comunicação com a base (email + push)
[`pilares/03-comunicacao.md`](./pilares/03-comunicacao.md)

- **O piso de mercado é 2-3 push promocionais/semana**; 46% dos usuários fazem opt-out com 2-5 mensagens sem relevância clara. O teto RN-133 de 4/semana só se sustenta contando apenas push promocional.
- **Separar transacional de marketing é regra de ouro** (IP/stream distintos). O crítico (confirmação, kit pronto) nunca compartilha canal com promocional e não deve entrar na contagem de frequência.
- **Deliverability virou compliance obrigatório** desde fev/2024 (Gmail/Yahoo): SPF+DKIM+DMARC, List-Unsubscribe one-click (RFC 8058), reclamação de spam < 0,3%. Google passou a rejeitar permanentemente em nov/2025.
- **Automação vence broadcast** (+24% open, 6x clique, 19x conversão): é 2% do volume e 30% da receita. Reforça o eixo Automações do E06.

### 4. Desafios gameficados (anti-streak)
[`pilares/04-gamificacao.md`](./pilares/04-gamificacao.md)

- **O streak clássico é uma armadilha comprovada**: vira o objetivo (a atividade vira obstáculo), escala loss aversion para medo, e a quebra causa abandono (rage-quit). Duolingo monetiza a ansiedade com streak freeze pago.
- **A ciência do hábito valida o "Volte amanhã"**: Lally et al. (2010) mostra que perder um dia não afeta materialmente a formação do hábito; o essencial é voltar sem culpa. A tese Kepry é literalmente isto.
- **Freeze/grace preserva sem inflar** (17 dias de streak médio com freeze vs. 11 sem). Se houver contador, usar graça automática e silenciosa — jamais loja de reparo ou reset a zero.
- **Conexão social supera performance como motivador** (Strava 2024: fazer conexões foi o #1 motivador, à frente de saúde e performance). O hook primário é a comunidade do clube, não a pressão de sequência.

### 5. Controle de vendas + afiliação/split
[`pilares/05-vendas-afiliacao.md`](./pilares/05-vendas-afiliacao.md)

- **Duas camadas que não se confundem**: dinheiro (gateway executa split, KYC, payout — terceirizável) e atribuição (quem clicou, qual link/cupom, qual janela, qual regra — IP do Leela, não terceirizável). Nenhum gateway resolve atribuição.
- **Split nativo em Pix + cartão é commodity** (Pagar.me, Asaas, Iugu, Stripe todos passam). O critério de escolha é modelo de recebedor e custo de Pix, não a existência do split.
- **Cookie-only é frágil**; a atribuição precisa ser server-side ancorada no clique do link master, com cupom como fallback determinístico (vence o link quando ambos presentes). Vocabulário de last click / first click / multicliques já validado por Hotmart/Sympla.
- **Sympla já opera o modelo exato** que o Leela quer (produtor define %, afiliado recebe link/código, painel de visitas e financeiro). É o melhor benchmark de UX para E04/E08.

---

## Padrões transversais

**O que se repete no mercado (paridade a ter):**

- Lotes/early bird, categorias por percurso, múltiplos meios com Pix dominante no BR.
- Feed social e reação leve (kudos) como motor de engajamento barato e viral.
- Segmentação por comportamento e ciclo de vida; automação por gatilho batendo broadcast.
- Split nativo por % ou valor fixo; atribuição por last click com janela configurável.
- Badges/medalhas colecionáveis como identidade persistente.

**O que ninguém faz (o moat do Leela):**

- **Unificação dos cinco pilares** num produto só. É a tese e o território vazio.
- **Coordenador como game master** desenhando desafios que são parte do treino (E05).
- **Gamificação anti-streak por design** — celebrar retorno e profundidade multi-pilar em vez de punir a quebra. Todo concorrente glorifica a sequência perfeita.
- **Feed e ranking dentro do clube**, não num grafo global anônimo — alinhado ao efeito-retenção documentado.
- **Split multi-parte com atribuição desacoplada e portável** — o gateway é executor plugável, a inteligência de "de quem foi a venda" fica no Leela.
- **Comunicação na voz do coordenador com anti-spam estrutural** vendido como cuidado (orçamento de push visível), não como limitação.

---

## Recomendações priorizadas

| # | Recomendação | Épico(s) | Impacto | Esforço | Quando |
|---|---|---|---|---|---|
| 1 | Feed social e ranking **dentro do clube/turma**, nunca global | E05, E13 | Alto | Médio | Agora |
| 2 | Selo de consistência visível (Modelo C / RN-115) como status de primeira classe | E05, E13 | Alto | Baixo | Agora |
| 3 | Blindar anti-streak em código: agregado só soma, nunca decrementa por inatividade (nova RN-118) | E05, E13 | Alto | Baixo | Agora |
| 4 | Lotes + categorias por percurso como cidadãos de primeira classe (não "ticket type" genérico) | E04 | Alto | Médio | Agora |
| 5 | Flexibilidade de quem paga a taxa: absorver / repassar / split 50-50 | E04 | Médio | Médio | Agora |
| 6 | Meios locais desde o MVP (Pix + boleto + cartão parcelado); fechar gateway ADR-006 antes da Onda 2 | E04, E12 | Alto | Médio | Agora |
| 7 | Atribuição server-side no link master + cupom determinístico; regra e janela configuráveis por evento | E04, E08 | Alto | Alto | Agora |
| 8 | Deliverability no DoD do envio: SPF/DKIM/DMARC, one-click unsubscribe, monitor de reclamação < 0,3% | E06 | Alto | Médio | Agora |
| 9 | RN-133 conta só push promocional; isentar transacional/triggered; + quiet hours e opt-out rate | E06, E13 | Médio | Baixo | Agora |
| 10 | Cobrança por carrinho (não por inscrição) para grupo/família | E04 | Médio | Médio | Depois |
| 11 | Split no ato como default (evita passivo de repasse) + comissão sobre líquido | E09 | Médio | Médio | Depois |
| 12 | Split multi-parte organizador↔influenciador↔Leela nativo; reusar UX Sympla | E08 | Alto | Alto | Depois |
| 13 | Fundraising/doação vinculada à inscrição (ausente no BR) | E03, E04 | Médio | Médio | Depois |
| 14 | Antifraude de atribuição: bloquear auto-afiliação, teto por afiliado, reversão em estorno | E04, E08 | Médio | Médio | Depois |
| 15 | Trilha de loyalty/tiers com perks (estilo adiClub) reusando status de membro | E05, E13 | Médio | Alto | Depois |
| 16 | Descoberta/recomendação de eventos por histórico e conexões sociais | E11, E05 | Médio | Alto | Depois |

---

## Decisões que o discovery exige

1. **RN-133 (4 push/semana): contar só push promocional.** Isentar transacional e triggered essencial (confirmação de inscrição, pagamento, kit pronto) da contagem. O teto de 4 já está acima do piso conservador de mercado (2-3/semana); sem essa distinção, o transacional crítico compete com marketing pelo mesmo orçamento e fura a experiência. Adicionar quiet hours e opt-out rate como métrica de saúde.

2. **Criar RN-118 "Sem punição por inatividade / Volte amanhã".** Blindar a filosofia no agregado `desafios/{id}/participantes/{atletaId}`: a Function que roda no onWrite de `registros` só soma, **nunca decrementa** por dia sem registro nem reseta semanas anteriores. A filosofia anti-streak vira regra de negócio auditável em código, não só tom de copy.

3. **Deliverability no DoD do E06.** SPF + DKIM + DMARC (`p=none`+), subdomínio transacional dedicado, List-Unsubscribe one-click (RFC 8058) e monitor de reclamação < 0,3% (meta < 0,1%). Separar stream transacional de broadcast na escolha do ESP. Sem isso o envio quebra em Gmail/Yahoo desde fev/2024.

4. **Gateway (ADR-006): recomendação preliminar Pagar.me (default) ou Asaas (custo).** Pagar.me se o driver for recebedor sem conta própria e pedigree de marketplace; Asaas se o driver for menor custo com Pix dominante e público creator/PME. Stripe Connect só com plano internacional concreto. Decisão-chave: **atribuição é IP do Leela** (E04/E08), o gateway só executa o split que o Leela mandar. Manter `PaymentProvider` como interface fina e implementar um adapter de referência, com o segundo como prova de portabilidade. Validar com cotação por volume antes de fechar.

5. **Ranking por clube/turma + selo de consistência (Modelo C / RN-115); feed dentro do clube.** Cada desafio (RN-110 A/B/C) gera leaderboard restrito aos membros, respeitando visibilidade (RN-117/RN-140). A consistência vira selo visível ("Constante", análogo ao Local Legend). O feed vive no contexto do clube — decisão v3.1 confirmada, validada pelo dado de retenção "clube > solo".

---

## Riscos e lacunas

- **Taxas verticais BR são opacas.** Ticket Sports e Central da Corrida não publicam tabela; exigem contato comercial. Transparência de taxa é diferencial de aquisição, mas também significa que a comparação competitiva de custo é incompleta.
- **Taxas mudam por contrato e volume.** Todos os números de gateway são referência, não contrato. Não fechar sem cotação direta.
- **Métricas de retenção dos SaaS BR não foram encontradas** em fonte pública (Treinus/SisRUN/MeuPace). A afirmação "não têm alma de comunidade" é análise de funcionalidade, não medição.
- **Fim dos cookies de terceiros** ameaça atribuição por link; mitigado por server-side + cupom, mas exige disciplina de implementação no E04.
- **Fadiga de notificação** é risco de retenção real; a governança de push só protege se comunicada como cuidado e instrumentada (opt-out rate em 30/60/90 dias).
- **Excesso de gamificação corrói motivação intrínseca** ("streak creep"). O anti-streak precisa de gate de copy que vete linguagem de perda/culpa, além da RN-118.
- **WhatsApp está fora de escopo nesta fase** (só push/email); quando entrar, priorizar templates Utility/transacional e opt-in explícito.
- **Comissão sobre bruto vs. líquido** é erro comum; padronizar sobre líquido desde o início evita retrabalho de conciliação.

---

## Fontes

Todos os fatos, taxas e métricas deste relatório vêm dos 5 arquivos de pilar, que carregam ~130 fontes datadas (acesso 2026-07-02) com URL + data na seção "Fontes" de cada um. Marcações [análise] nos originais indicam interpretação, não fato verificado.

- [`pilares/01-ticketing.md`](./pilares/01-ticketing.md) — Sympla, Ticket Sports, Doity, Central da Corrida, Eventbrite, RunSignup, Race Roster, Let's Do This.
- [`pilares/02-comunidade-clubs.md`](./pilares/02-comunidade-clubs.md) — Strava, Nike Run Club, adidas Running, Garmin Connect, TrainingPeaks, SaaS BR de assessoria, crews BR.
- [`pilares/03-comunicacao.md`](./pilares/03-comunicacao.md) — SendGrid, Resend, Postmark, Mailchimp, Customer.io, Braze, FCM, OneSignal, WhatsApp API, LGPD, Gmail/Yahoo requirements.
- [`pilares/04-gamificacao.md`](./pilares/04-gamificacao.md) — Duolingo, Strava, Apple Fitness, Calm, Headspace, Insight Timer, Habitica, Lally et al. (2010), literatura de design de streaks.
- [`pilares/05-vendas-afiliacao.md`](./pilares/05-vendas-afiliacao.md) — Pagar.me, Asaas, Iugu, Stripe Connect, Sympla afiliados, Hotmart atribuição.

*Documento de síntese. Para números exatos e rastreabilidade completa, consultar sempre o arquivo de pilar de origem.*
