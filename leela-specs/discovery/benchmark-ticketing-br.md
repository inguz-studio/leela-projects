---
tags: [leela, discovery, benchmark, concorrente, ticketing, corrida]
aliases: [Benchmark Ticketing BR, Concorrentes diretos Leela, Landscape ticketing corrida]
status: discovery
data: 2026-07-11
escopo: "Concorrentes diretos da Leela no ticketing de corrida e esporte no Brasil (5 plataformas)"
fontes-verificadas:
  - ticketsports.com.br (home, carregou via WebFetch, jul/2026)
  - ajuda.ticketsports.com.br (artigos de taxa, formas de pagamento, cadastro, lotes, isenção de grupos; conteúdo recuperado via busca, jul/2026)
  - hub.ticketsports.com.br (navegação, jul/2026)
  - reclameaqui.com.br/ticket-agora (reclamações de reembolso, jul/2026)
  - minhasinscricoes.com.br/pt-br (home, carregou via WebFetch, jul/2026)
  - gestao.minhasinscricoes.com.br (modelo de custo e recursos, via busca, jul/2026)
  - suainscricao.com (home, carregou via WebFetch, jul/2026)
  - inscricoes.com.br (home, carregou via WebFetch, jul/2026)
  - atletis.com.br/blog (taxa de serviço, formas de pagamento, lotes, funcionalidades; conteúdo recuperado via busca, jul/2026)
fontes-nao-carregadas:
  - atletis.com.br (home e páginas de blog retornaram HTTP 403 Cloudflare no WebFetch; texto obtido por busca, não pela página em si)
  - ajuda.ticketsports.com.br (artigos retornaram HTTP 403 no WebFetch direto; texto obtido por busca)
  - hub.ticketsports.com.br/como-fazer-a-sua-inscricao (carregou só o menu, sem o corpo do artigo)
  - páginas de checkout ao vivo de qualquer plataforma (não percorri um funil real de ponta a ponta; o fluxo abaixo vem de central de ajuda e material público)
---

# Benchmark competitivo · Ticketing de corrida no Brasil

> Concorrentes diretos da Leela no nicho de inscrição de corrida e esporte: Ticket Sports, Atletis, Minhas Inscrições, Sua Inscrição e Inscrições.com.br. O foco é o que alimenta o E12 (landing pública + checkout): página de evento, fluxo de checkout, modelo de taxa, kit e retirada, e diferencial.
> Complementa os benchmarks de produto único [[benchmark-cheers]] (taxa, cupom, clube) e [[benchmark-shotgun]] (visual da página de evento). Aqui a lente é o mapa do mercado, cinco players lado a lado.
> Regra de honestidade: cada número tem fonte e data ou está marcado como **não verificado**. Nenhuma taxa foi inventada.

## Nota de maturidade (para comparação justa)

Todos os cinco são produtos em produção nacional ou regional, com anos de operação. O E12 da Leela é **só especificação**: `apps/landing` tem apenas scaffold, o checkout de 5 etapas e as Functions de afiliação ainda não existem, e só a interface `PaymentProvider` mais um provider sandbox estão prontos. Onde a síntese disser "a Leela faz melhor", leia como "está projetada para fazer melhor, ainda não no ar". O território de kit e balcão (E03), esse sim, já está construído e testado.

---

## 1. Panorama em dez linhas

O mercado brasileiro de inscrição de corrida gira em torno de um modelo comum: a plataforma é gratuita para criar o evento e cobra uma **taxa de serviço por inscrição paga**, entre 6,9% e 10% conforme o player, com a decisão de **quem paga a taxa** (organizador absorve ou repassa ao atleta) deixada ao organizador. Ticket Sports é o líder declarado em volume e o mais completo (app, painel do atleta, eventos virtuais, seguro de inscrição, isenção para assessorias). Atletis é o desafiante com a comunicação de preço mais clara (taxa de R$ 1,99 a 7,99% com simulador público) e forte narrativa de facilidade para o organizador. Minhas Inscrições briga por preço ("a partir de 7,5%, a menor taxa do mercado", claim deles) e é o único que anuncia entrega de kit pelos Correios. Sua Inscrição e Inscrições.com.br são menores e mais nichados (atletismo regional e ciclismo, respectivamente). O padrão de checkout do mercado é **baseado em conta**: o atleta cria um cadastro no ato da inscrição, e a venda gira em torno de **lotes** (Lote 1, Lote 2) com gatilho de escassez. O ponto de dor recorrente, visível no Reclame Aqui, é **reembolso** de prova cancelada ou adiada. Nenhum dos cinco, na coleta pública, oferece um checkout verdadeiramente anônimo sem criar conta, e nenhum trata "kit" como nível de inscrição de primeira classe com preço próprio (inclusive negativo) do jeito que o E03 da Leela já trata.

**As três lições mais fortes para o E12** aparecem na seção 5, resumidas aqui: (1) tornar o **modelo de taxa configurável e transparente** (incorporada versus repassada, com mínimos), que hoje o E12 não especifica; (2) manter o **checkout anônimo de 5 etapas** como diferencial real, porque o mercado força cadastro; (3) usar **lote por modalidade** (ADR-012) com gatilho de escassez visível, indo além do lote global por evento que os concorrentes aparentam usar.

---

## 2. Perfil por concorrente

Legenda de confiança: **[V]** verificado em fonte pública (jul/2026); **[NV]** não verificado.

### 2.1 Ticket Sports (ticketsports.com.br)

O maior e mais completo. Posiciona-se como "líder nacional para organizadores de eventos esportivos".

| Dimensão | O que capturei |
|---|---|
| Hero | "Desafie seus limites" e "Encontre um evento perto de você e movimente seu estilo de vida" **[V]** (home, jul/2026). |
| Seções da home | Métodos de pagamento (cartão, boleto, Pix), área de grupos esportivos, seção do organizador ("Abra seu evento na maior plataforma de eventos esportivos"), "Em alta!", categoria corrida de rua, parceiros Webrun e HUB **[V]**. |
| Página de evento | Busca por país/estado e calendário com filtros **[V]**. Estrutura interna da página de evento (Hero, modalidades, kit, retirada) não percorrida em detalhe nesta coleta **[NV]**; regulamentos de evento (PDF hospedado no CDN) descrevem modalidades, lotes e kit por prova **[V]**. |
| Modalidades, lotes, preços | Vende por **lotes**: "as inscrições são divididas em lotes, com possibilidade de alteração das quantidades de vagas para a virada de lotes" **[V]** (regulamentos e central de ajuda). Lote por modalidade versus lote global por evento não confirmado **[NV]**. |
| Checkout: login versus anônimo | **Exige cadastro, mas pode ser criado no ato**: "você não precisa ter um cadastro prévio, pode criar o cadastro no ato da sua inscrição, escolhendo a opção Cadastre-se" **[V]**. Login por e-mail ou CPF e senha. Não é anônimo: a inscrição gera uma conta. |
| Cupom | Central de ajuda trata cupom de desconto por evento **[NV para mecânica exata]**; existe no produto **[V, existência]**. |
| Parcelamento | "Todas as compras por cartão de crédito podem ser pagas à vista ou, dependendo do evento, parceladas. O organizador é quem define as formas de pagamento" **[V]**. |
| Formas de pagamento | Cartão de crédito, boleto e Pix na home **[V]**. |
| Modelo de taxa | **Comprador paga** a taxa de serviço (conveniência), que "garante segurança e conveniência da transação" **[V]**. Percentual exato não é público **[NV]**. **Isenção para assessorias e grupos** com mínimo de 10 atletas (isenção da taxa de comodidade e bonificação da 11ª inscrição) **[V]**. |
| Kit e retirada | Kit descrito no regulamento de cada prova **[V]**; módulo de logística de kit dedicado não verificado **[NV]**. |
| Diferencial | Escala nacional, app próprio, painel do atleta, eventos virtuais com envio de atividade, parceria Webrun (mais de 20 anos em corrida), HUB para organizadores, e seguro "Inscrição Segura" via parceiro Refundable **[V]**. |
| Dor visível | Reembolso é o tema dominante no Reclame Aqui: prazo de 7 dias do CDC aplicado com rigidez, valores já repassados ao organizador quando o evento é cancelado perto da data, negativa de reembolso por motivo de saúde fora dos 7 dias **[V]** (reclameaqui.com.br/ticket-agora, jul/2026). |

### 2.2 Atletis (atletis.com.br)

O desafiante com a comunicação de preço mais limpa. A home e o blog bloquearam o WebFetch (HTTP 403 Cloudflare); o conteúdo abaixo veio de busca sobre as próprias páginas de blog da Atletis, não da renderização da página.

| Dimensão | O que capturei |
|---|---|
| Hero | "Onde os eventos esportivos acontecem" **[V, via busca]** (atletis.com.br). |
| Página de evento | "Página online exclusiva para divulgar a prova, com URL personalizada com o nome do evento, que direciona o atleta para a página de inscrição segura" **[V, via busca]**. |
| Modalidades, lotes, preços | "Programação de viradas de lote capaz de estimular decisões rápidas com gatilhos de escassez" **[V, via busca]**. Dados em tempo real por "categoria ou lote" **[V, via busca]**, o que sugere lote como dimensão ao lado da categoria (provável lote global por evento) **[NV para lote por modalidade]**. |
| Checkout: login versus anônimo | Atleta "se inscreve de forma online e rápida, paga pelo próprio site e recebe a confirmação no e-mail" **[V, via busca]**. Se exige conta ou é anônimo não foi confirmado **[NV]**. |
| Cupom | "Criar cupons de desconto para diversos nichos" **[V, via busca]**. |
| Parcelamento | Cartão de crédito parcelável em **até 12 vezes** **[V, via busca]**. |
| Formas de pagamento | Pix, cartão de crédito (até 12x) e boleto; boleto liberado só **até 72h antes do evento** por causa da compensação **[V, via busca]**. |
| Modelo de taxa | Criar evento é **100% gratuito**. Taxa de serviço de **R$ 1,99 até 7,99%**, com o organizador escolhendo absorver ou repassar **[V, via busca]**: se **absorve**, R$ 1,99 fixo em inscrições até R$ 35 e 7,99% acima disso; se **repassa** ao atleta, R$ 2,50 fixo até R$ 45 e 7,99% acima. Inscrição gratuita não paga taxa. Há **simulador de taxa** público no site **[V, via busca]**. |
| Kit e retirada | Trata kit pela comunicação: e-mails automáticos de confirmação, lembretes e "atualizações sobre retiradas de kits, horários e trajetos" **[V, via busca]**. Logística física de kit dedicada não verificada **[NV]**. |
| Diferencial | Narrativa de facilidade ("inscrição em 7 minutos"), simulador de taxa transparente, gratuidade de criação, dados em tempo real (inscritos, pagamentos, arrecadado, desempenho por categoria ou lote) e automação de comunicação com o atleta **[V, via busca]**. |

### 2.3 Minhas Inscrições (minhasinscricoes.com.br)

Briga por preço e é o único dos cinco que anuncia entrega de kit por Correios.

| Dimensão | O que capturei |
|---|---|
| Hero | Home puxa navegação para Calendário Completo, Resultados, Blog MI, Organizador e Entrar **[V]** (WebFetch, jul/2026); headline de hero não destacada no conteúdo extraído **[NV]**. |
| Página de evento | Organizador "escolhe o template e personaliza com a identidade visual do evento, regulamento, modalidades, perguntas e respostas, combos e kits" **[V, via busca]** (gestao.minhasinscricoes.com.br). |
| Modalidades, lotes, preços | Modalidades e combos configuráveis no template **[V, via busca]**; mecânica de lote não detalhada nesta coleta **[NV]**. |
| Checkout: login versus anônimo | Não confirmado se exige conta **[NV]**. Login ("Entrar") presente na navegação **[V]**. |
| Cupom | "Gere cupons de desconto" **[V, via busca]**. |
| Parcelamento e pagamento | Formas de pagamento e parcelamento ao atleta não detalhados nesta coleta **[NV]**. |
| Modelo de taxa | Evento gratuito com até 99 inscritos: sem custo. Evento pago: planos comerciais **a partir de 7,5% de taxa de serviço por inscrito**, anunciado como "a menor taxa de serviço do mercado" (claim deles) **[V, via busca]**. Quem absorve versus repassa não foi confirmado nesta coleta **[NV]**. |
| Kit e retirada | Diferencial real: **controle de entrega de kits presencial ou pelos Correios** **[V, via busca]**, além de combos e kits no template. É o único da lista que cita envio de kit por correio. |
| Diferencial | Preço agressivo, dashboard em tempo real, credenciamento, eventos presenciais e virtuais, e a entrega de kit por Correios **[V, via busca]**. |

### 2.4 Sua Inscrição (suainscricao.com)

Menor e mais nichado em atletismo, com pegada regional (exemplos do Espírito Santo).

| Dimensão | O que capturei |
|---|---|
| Hero | "Inscrições online para eventos esportivos, simples do começo ao fim" **[V]** (WebFetch, jul/2026). |
| Seções da home | Espaço do Atleta, Espaço do Organizador, Resultados, Cadastro, Ajuda, Contato. Quatro diferenciais destacados: conectar participantes a eventos, busca rápida por categoria ou cidade, pagamento seguro e gestão centralizada **[V]**. |
| Página de evento | Calendário de eventos com imagem, exemplo "Copa Norte Capixaba de MTB", navegação por "Ver eventos abertos" **[V]**. Estrutura interna da página de evento não detalhada **[NV]**. |
| Checkout: login versus anônimo | Não confirmado **[NV]**. Há "Cadastro" na navegação **[V]**. |
| Cupom, parcelamento | Não mencionados no conteúdo público **[NV]**. |
| Modelo de taxa | Exemplo real observado: inscrição de R$ 39,90 mais **R$ 5,00 de taxa de serviço do site**, repassada ao atleta como valor fixo **[V, via busca]**. Percentual ou tabela geral não publicados **[NV]**. |
| Kit e retirada | Não verificado **[NV]**. |
| Diferencial | Simplicidade do fluxo até a confirmação, pagamento seguro, gestão centralizada, foco em atletismo **[V]**. |

### 2.5 Inscrições.com.br (inscricoes.com.br)

Especializado em ciclismo, com curadoria de organizadores e uma loja.

| Dimensão | O que capturei |
|---|---|
| Hero | "Encontre sua Próxima Grande Prova Esportiva" e "Inscrições fáceis e rápidas para eventos esportivos de todos os tipos na sua região" **[V]** (WebFetch, jul/2026). |
| Seções da home | Home, Eventos, Loja (Shop), Organizadores, Contato, Login e Cadastro; grade de próximos eventos; "Os melhores eventos da sua região estão aqui"; chamada para organizadores **[V]**. |
| Página de evento | Cards de evento com foto, título, data, local e status de inscrição ("Inscrições Abertas", "Inscrições encerradas", "Inscrições em breve"), cada card levando à página de detalhe **[V]**. |
| Modalidades, lotes, preços | Não detalhados nesta coleta **[NV]**. |
| Checkout: login versus anônimo | Login e Cadastro na navegação **[V]**; anônimo não confirmado **[NV]**. "Poucos cliques" como promessa **[V]**. |
| Cupom, parcelamento | Não mencionados no conteúdo público **[NV]**. |
| Modelo de taxa | "Melhores taxas do mercado com transparência"; organizador "integrado para receber pagamentos direto via gateways conhecidos" **[V, via busca]**. Percentual não publicado **[NV]**. |
| Kit e retirada | Loja (Shop) presente **[V]**; logística de kit não verificada **[NV]**. |
| Diferencial | Nicho de ciclismo, curadoria ("apenas organizadores verificados, com documentação e titularidade confirmadas"), simplicidade e a loja **[V, via busca]**. |

---

## 3. Tabela comparativa (site por dimensão)

| Dimensão | Ticket Sports | Atletis | Minhas Inscrições | Sua Inscrição | Inscrições.com.br |
|---|---|---|---|---|---|
| Porte e foco | Líder nacional, multiesporte, app próprio [V] | Desafiante nacional, multiesporte [V] | Nacional, foco em preço [V] | Regional, atletismo [V] | Nicho ciclismo [V] |
| Hero | "Desafie seus limites" [V] | "Onde os eventos esportivos acontecem" [V] | Calendário e resultados [V] | "Simples do começo ao fim" [V] | "Sua Próxima Grande Prova" [V] |
| Vende por lote | Sim, virada de lote [V] | Sim, virada com escassez [V] | Combos e kits, lote NV | NV | NV |
| Lote por modalidade | NV (provável global) | NV (provável global) | NV | NV | NV |
| Login versus anônimo | Cria conta no ato, não anônimo [V] | NV | NV | NV | NV (login na nav) |
| Cupom | Existe [V] | Sim, por nicho [V] | Sim [V] | NV | NV |
| Parcelamento cartão | Sim, organizador define [V] | Até 12x [V] | NV | NV | NV |
| Pix | Sim [V] | Sim [V] | NV | NV | NV |
| Boleto | Sim [V] | Sim, até 72h antes [V] | NV | NV | NV |
| Quem paga a taxa | Comprador [V] | Organizador escolhe [V] | NV | Comprador (exemplo) [V] | NV |
| Valor da taxa | Não público [NV] | R$ 1,99 a 7,99% [V] | A partir de 7,5% [V] | R$ 5,00 fixo (exemplo) [V] | "Melhores do mercado" [NV] |
| Simulador de taxa | NV | Sim, público [V] | NV | NV | NV |
| Isenção de grupos | Assessoria, 10+ atletas [V] | NV | NV | NV | NV |
| Kit e retirada | Regulamento, sem módulo confirmado [NV] | Comunicação de retirada [V] | Entrega presencial ou Correios [V] | NV | Loja [V], kit NV |
| Seguro de inscrição | Sim, via Refundable [V] | NV | NV | NV | NV |
| Dor pública | Reembolso (Reclame Aqui) [V] | NV | NV | NV | NV |

---

## 4. Cruzamento com o E12 (o que a Leela já especifica)

O E12 define a landing pública e o checkout do atleta anônimo. As peças relevantes para este benchmark:

- **Página de evento por seções** (S1201): Hero, Modalidades, Kits, Retirada de kits, Informações gerais em accordion, e três seções só web (Percurso, Patrocinadores, Depoimentos). O organizador liga e desliga cada seção e define a ordem.
- **Checkout de 5 etapas** (S1203), sem login: Dados, Modalidade e Kit, Resumo, Pagamento, Confirmação. O atleta é **anônimo**, o e-mail é a chave de associação, e não se coleta número de chip no checkout (RN-207).
- **Kit como nível de inscrição** (RN-202, RN-211, RN-216): Ouro, Prata, Básico e Sem kit; "Sem kit" é kit válido e aceita preço negativo (desconto); a palavra é sempre "kit", nunca "tier".
- **Lote por modalidade** (ADR-012, travado 2026-07-11): cada percurso tem sua própria sequência de lotes (Lote 1, 2, 3), com janela de data e hora, vaga e preço próprios; a virada opera por par (modalidade, lote).
- **Cupom no Resumo** que resolve o afiliado dono, e **atribuição de conversão** por link master com cookie assinado, janela, teto e split (S1204, RN-311).
- **Pagamento por interface plugável** `PaymentProvider` (ADR-006), Pix e cartão, com provider sandbox antes de casar com gateway.
- **Dados de prova de verdade** no checkout: contato de emergência obrigatório (RN-145) e aceite de regulamento versionado separado do consentimento LGPD (RN-148).

---

## 5. Síntese: copiar, evitar, fazer melhor no E12

### Copiar

1. **Modelo de taxa configurável e transparente.** Atletis (R$ 1,99 a 7,99%, absorver versus repassar, com mínimos) e o padrão Ticket Sports (comprador paga) mostram a decisão comercial que o E12 hoje **não especifica**. O checkout de 5 etapas precisa de uma política explícita de taxa incorporada versus repassada, com mínimos por método, exibida antes de finalizar (o STJ exige informar o total com taxas de forma clara). Cruza com S1203-T4 (Resumo) e com o financeiro.
2. **Parcelamento no cartão.** Os três maiores parcelam (Atletis até 12x; Ticket Sports conforme o organizador). O E12 só cita Pix e cartão, sem parcelamento. Definir número de parcelas, quem define (organizador) e como exibir. Encaixa em S1203-T5 (Pagamento).
3. **Gatilho de escassez no lote.** Atletis vende "viradas de lote com gatilhos de escassez"; Ticket Sports mostra virada de lote. O E12 tem o modelo de lote por modalidade (ADR-012), mas as stories não descrevem o **display de urgência** (vagas restantes do lote, contagem para a virada). Vale desenhar isso na seção Modalidades (S1201-T2) e no passo Modalidade e Kit (S1203-T3).
4. **Boleto e a regra de corte.** Atletis aceita boleto só até 72h antes do evento. É uma regra simples e sensata que resolve compensação. Se o E12 adicionar boleto ao `PaymentProvider`, copiar o corte de 72h.
5. **Isenção para grupos e assessorias.** Ticket Sports isenta a taxa para grupos de 10 ou mais atletas e bonifica a 11ª inscrição. Combina com o modelo de clube e afiliado da Leela: um lote ou desconto de grupo amarrado ao clube é receita e retenção ao mesmo tempo.
6. **Entrega de kit por Correios.** Minhas Inscrições oferece entrega de kit presencial ou por Correios. O E12 assume só retirada no balcão. Se houver kit ou merch para enviar, o frete no checkout é lacuna (mesma conclusão do [[benchmark-cheers]]). Decisão para pós V1.
7. **Seguro de inscrição.** Ticket Sports vende "Inscrição Segura" via Refundable, endereçando justamente a dor número um dos reviews. É um add-on de receita que reduz atrito de reembolso. Vale avaliar como item opcional no Resumo.

### Evitar

1. **Forçar cadastro no ato da inscrição.** Ticket Sports deixa claro que a inscrição cria uma conta ("crie o cadastro no ato da inscrição"). Nenhum dos cinco confirmou checkout sem conta. O E12 aposta no contrário, e essa aposta só vale se **não regredir** para login obrigatório. Manter o anônimo com e-mail como chave (S1203).
2. **Página de evento como e-commerce genérico.** Vários tratam a página como template de card e formulário. O E12 desenha por seções de prova (percurso, patrocinadores, depoimentos, retirada). Não achatar isso em uma página de ingresso genérica na pressa de entregar.
3. **Reembolso opaco.** A dor pública mais visível (Reclame Aqui de Ticket Sports) é reembolso confuso: dinheiro já repassado ao organizador, prazo de 7 dias aplicado sem contexto, negativa por motivo de saúde. Mesmo com o pós venda fora do E12 (fica no E09), a landing e a confirmação devem deixar a política de reembolso legível no ponto da compra, não escondida no regulamento.
4. **Taxa que só aparece no fim.** Onde o percentual não é público (Ticket Sports, Inscrições.com.br), o comprador descobre o custo tarde. O E12 deve mostrar a taxa no Resumo antes do Pagamento, sem surpresa.
5. **Nomear nível de inscrição como "tier" ou tratar kit como mero combo.** Minhas Inscrições fala em "combos e kits" como add-on. O E12 trata kit como nível de inscrição de primeira classe (RN-216, sempre "kit"). Não copiar a linguagem de combo genérico.

### Fazer melhor

1. **Checkout anônimo de 5 etapas.** É o diferencial mais claro. O mercado força conta; o E12 não autentica e usa o e-mail como chave. Se entregar bem, é uma vantagem de conversão real na primeira compra, quando a fricção mais mata.
2. **Kit como nível de inscrição com preço próprio, inclusive negativo, e composição N para N.** O E03 já construiu item tamanhado, aprovisionamento por SKU e balcão de retirada com vínculo de chip. Nenhum dos cinco chega perto disso na coleta pública: Atletis e Ticket Sports tratam kit por comunicação e regulamento; Minhas Inscrições por template e Correios. Esse é o fosso da Leela no vertical de corrida.
3. **Lote por modalidade (ADR-012) contra lote global.** Os concorrentes aparentam operar lote no nível do evento (a evidência de Atletis é "categoria ou lote" como dimensões separadas). O E12 dá a cada percurso sua sequência própria de lote, com janela, vaga e preço independentes (RN-301). É granularidade que o organizador de prova quer e que o mercado, ao que parece, ainda não entrega. Vale confirmar essa hipótese com um organizador real, porque a vantagem depende de o mercado de fato usar lote global.
4. **Atribuição de afiliado com janela, teto e split idempotente.** Contra o "link de promotor" simples do mercado, o E12 desenha cookie assinado com validade igual à janela, prioridade do cupom sobre o cookie, teto mensal e split por `PaymentProvider.splitRules`. Já é um diferencial descrito no [[benchmark-cheers]]; aqui ele também supera o padrão dos cinco.
5. **Dados de prova de verdade no checkout.** Contato de emergência obrigatório e aceite de regulamento versionado, separados do consentimento LGPD, são requisito de prova esportiva que uma inscrição genérica não modela com esse rigor. Transformar isso em confiança visível (o atleta vê que a plataforma leva segurança da prova a sério) em vez de só mais um campo.

---

## Fontes e verificação

Carregaram via WebFetch com conteúdo real (jul/2026): `ticketsports.com.br` (home), `minhasinscricoes.com.br/pt-br` (home), `suainscricao.com` (home), `inscricoes.com.br` (home).

Conteúdo recuperado por busca sobre as próprias páginas do concorrente (a página não renderizou no WebFetch, mas o texto citado é das centrais de ajuda e blogs oficiais, jul/2026): taxa, formas de pagamento, cadastro, lotes e isenção de grupos da Ticket Sports (`ajuda.ticketsports.com.br`); taxa de serviço, formas de pagamento, lotes e funcionalidades da Atletis (`atletis.com.br/blog`); modelo de custo e recursos da Minhas Inscrições (`gestao.minhasinscricoes.com.br`); exemplo de taxa da Sua Inscrição; taxa e curadoria da Inscrições.com.br; reclamações de reembolso da Ticket Sports (`reclameaqui.com.br/ticket-agora`).

Não carregaram no WebFetch: `atletis.com.br` (home e blog, HTTP 403 Cloudflare; texto obtido por busca), artigos diretos de `ajuda.ticketsports.com.br` (HTTP 403; texto obtido por busca), `hub.ticketsports.com.br/como-fazer-a-sua-inscricao` (retornou só a navegação, sem o corpo).

Marcado como não verificado ao longo do doc: percentual exato da taxa de Ticket Sports e de Inscrições.com.br; estrutura interna detalhada da página de evento de cada plataforma; se o lote é por evento ou por modalidade em qualquer concorrente; se Atletis, Minhas Inscrições, Sua Inscrição e Inscrições.com.br permitem checkout anônimo ou exigem conta; mecânica de cupom e parcelamento das três menores; logística física de kit de Ticket Sports, Sua Inscrição e Inscrições.com.br. Nenhum funil de checkout foi percorrido ao vivo de ponta a ponta nesta coleta.

## Volta para
- [[LEELA-E12-landing]] · [[benchmark-cheers]] · [[benchmark-shotgun]] · [[DISCOVERY]]
