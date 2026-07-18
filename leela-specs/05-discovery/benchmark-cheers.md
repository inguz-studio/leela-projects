---
tags: [leela, discovery, benchmark, concorrente, cheers]
aliases: [Benchmark Cheers, Cheers, Clube Cheers]
status: discovery
data: 2026-07-04
fontes-verificadas: [cheers.com.br, ajuda.cheers.com.br, saibamais.cheers.com.br, infoprodutos.cheers.com.br, suno.com.br, apps stores]
---

# Benchmark competitivo · Cheers

> O Vitor descreve a Cheers como "praticamente o que estamos fazendo, com posicionamento diferente": ticketeira, gestão de produtos/kits e programa de benefícios (Clube Cheers). Ponto de partida: `cheers.com.br/clubecheers/cupons`.
> Este doc complementa o [[leela-plus-hipotese-jtbd]] (que já traz a análise do Clube Cheers para alimentar o Leela+) com o operacional verificado da plataforma: modelo de taxa, checkout, kits/retirada, atribuição.
> Regra de honestidade: tudo que não pôde ser confirmado em fonte pública está marcado como **não verificado**. Nenhuma taxa ou número foi inventado.

## Nota de maturidade (para comparação justa)

A comparação cruza produtos em estágios diferentes. Do lado Leela:

- **E03 (kits e balcão): construído e testado** (KANBAN: 20/20 tasks, 124/124 testes verdes; código real em `functions/src/eventos/` e telas em `apps/painel/src/routes/eventos/`).
- **E12 (checkout público): só especificação.** `apps/landing` está apenas com scaffold; as rotas de inscrição, `packages/core/src/checkout/` e as Functions de afiliação ainda não existem. Só a interface `PaymentProvider` e um provider sandbox estão prontos.
- **E08 (promotor/afiliado): backlog, não construído.**
- **Leela+: hipótese de discovery.** A V1 entrega no máximo uma tela teaser.

A Cheers, por outro lado, é um produto em produção nacional há anos. Onde a coluna "Leela hoje" citar E12/E08/Leela+, leia como "projetado, não no ar".

---

## 1. Visão geral

A Cheers é uma "universitech" brasileira fundada no fim de 2018 no Paraná (razão social VG Entretenimento Ltda; fundadores Gabriel Russo Ramos, Pedro Viggiano, Paulo Ribeiro e Daniel Paulatti). O modelo é B2B2C: conecta entidades acadêmicas (atléticas, centros acadêmicos, diretórios, empresas juniores, comissões de formatura) aos estudantes universitários. Escala reportada em matéria de 2022: ~2.000 entidades, 400 mil estudantes cadastrados, mira de 3 milhões até 2024, 50+ funcionários, expansão para Argentina e Paraguai. O site institucional fala em 4.000+ páginas criadas e 1 milhão de universitários.

O público central é universitário, não corredor. O eixo esportivo existe, mas é **jogos universitários** (o produto "Cheers Sports": página oficial de jogos, atléticas participantes, modalidades, chaveamento quartas/semis/finais, ranking ao vivo, Torcidômetro, controle de presença em treinos e jogos, credenciamento por pulseira com QR). Corrida de rua e prova de endurance não aparecem em nenhuma superfície pública que consultei. Esse é o primeiro ajuste honesto ao "praticamente o que estamos fazendo": Cheers e Leela compartilham a **matéria-prima** (evento, ingresso, produto, clube de benefício), mas operam **verticais diferentes** (balada e esporte universitário versus corrida, endurance e bem-estar).

**Modelo de receita aparente (verificado).** Comissão por transação, não SaaS mensal para a entidade. A Cheers cobra uma taxa de conveniência sobre cada venda de ingresso ou produto, em dois formatos:

- **Taxa incorporada: 8%.** O organizador absorve; o cliente não vê linha extra. Mínimos de R$ 1,50 no cartão e R$ 0,80 no PIX.
- **Taxa não incorporada: 10%.** O comprador paga a taxa como linha separada no checkout. Mínimos de R$ 2,00 no cartão e R$ 0,80 no PIX.
- **Taxa por número de parcelas** no cartão de crédito: existe uma tabela de taxa por quantidade de parcelas, visível no painel Financeiro do organizador. Os percentuais por faixa não são públicos (**não verificado**).
- Add-on de "reembolso estendido" cobrado do comprador (existe; valor **não verificado**).

Camada de assinatura B2C separada: o Clube Cheers (seção 4).

---

## 2. Fluxo de compra e checkout

O que consegui reconstruir da central de ajuda e das páginas de compra:

**Etapas do checkout Cheers (verificado nos fluxos de ajuda):**
1. **Escolha da entrega.** Primeiro passo da finalização: o comprador seleciona a opção de entrega. A entidade pode oferecer só "retirada em local específico" ou também "frete" (para produtos físicos). Ingresso é digital com QR Code.
2. **Cupom.** Segundo passo: campo de cupom com botão "Aplicar Cupom"; o desconto entra no valor antes do pagamento. O cupom é um código emitido pela própria entidade ou pelo promotor.
3. **Pagamento.** Aceite dos termos, "Continuar para pagamento", geração de link de pagamento. Métodos: cartão de crédito, débito, boleto e PIX. Parcelamento no cartão (com taxa por parcela). Compra em dinheiro ainda é registrada digitalmente na plataforma.
4. **Emissão.** Ingresso digital com QR Code fica com o comprador ao concluir.

**Atribuição de venda (verificado).** A Cheers tem venda por promotor: link online rastreável que abre no site ou no app (crédito, débito, boleto, PIX) e venda presencial registrada pelo promotor. Cupom pode ser vinculado ao promotor. Existe cancelamento de venda por promotor.

**Cupons (verificado).** Quatro trilhas de cupom no painel do organizador: cupom de evento, cupom de produto, cupom de sócio, além dos cupons do Clube Cheers. Ou seja, cupom é um recurso maduro e segmentado por tipo de item.

**Revenda segura (verificado).** Marketplace de repasse entre usuários: "Transferir ingresso" → "Revenda de ingresso" → CPF do comprador → aceite → o comprador aceita a solicitação. Cobra taxa de manutenção da plataforma na revenda.

### O que a Cheers faz bem

- **Modelo de taxa transparente e configurável** (incorporada versus não incorporada), com mínimos por método. É uma decisão comercial clara para o organizador e um padrão de mercado que o Leela ainda não fixou publicamente.
- **Parcelamento no cartão com taxa por parcela** já resolvido. Fricção de preço menor para o ticket alto.
- **Entrega com frete ou retirada** no mesmo checkout. Cobre venda de produto físico que precisa enviar, não só retirar no local.
- **Revenda segura nativa** reduz golpe de reingresso e mantém o registro na plataforma.
- **Boleto** disponível, relevante para público sem cartão.

### O que faríamos diferente (Leela E12)

- **Checkout sem conta, anônimo, guiado por 5 etapas** (Dados → Modalidade/Kit → Resumo → Pagamento → Confirmação). A escolha de modalidade e kit é de primeira classe, com preço vigente por percurso (RN-301) e kit negativo válido (RN-211). É desenho de prova, não de e-commerce genérico.
- **Atribuição com janela e teto, não só "veio pelo link".** O link master (`?c=`) grava cookie assinado com validade igual à `janelaAtribuicaoDias`; a conversão só é atribuída dentro da janela (RN-311) e respeita teto mensal; o cupom resolve o afiliado dono e tem prioridade sobre o cookie. Split executado por `PaymentProvider.splitRules`, webhook idempotente. É infraestrutura de afiliação mais rica que "link de promotor".
- **Camada de pagamento plugável** (`PaymentProvider`, ADR-006): construímos e testamos o funil ponta a ponta em sandbox antes de casar com gateway. Sem gateway concreto no domínio.
- **Aceites separados** (regulamento versionado versus consentimento LGPD, RN-148/149) e **contato de emergência obrigatório** (RN-145). Requisito de prova esportiva que uma ticketeira de balada não precisa.

### Gaps nossos que a Cheers expõe

- **Sem frete no checkout.** O Leela V1 assume retirada no balcão; não há opção de envio de produto. Se vendermos merch/kit que precise chegar em casa, é lacuna.
- **Parcelamento e sua taxa não estão especificados.** A Cheers já modela taxa por parcela; nosso E12 não menciona parcelamento nem exibição de taxa incorporada/não incorporada. Decisão comercial em aberto.
- **Revenda/repasse entre compradores não existe na UI pública.** Temos troca de titularidade como política (RN-343, E04), não um marketplace de revenda.

---

## 3. Gestão de kits e retirada

Aqui a comparação inverte: o Leela é muito mais profundo, e é o nosso território.

**O que a Cheers tem (verificado):** um toggle de entrega genérico de e-commerce (retirada em local específico ou frete) e, no Cheers Sports, credenciamento por pulseira com QR para entrada/saída e acesso a produtos, hospedagem, festas e transporte. Não há evidência pública de gestão de kit de prova especializada. O "Kit completo para organizar eventos" da Cheers é um material gratuito de captação (checklist, planilha orçamentária, calendário de datas), não logística física de kit.

**O que o Leela já construiu (E03, testado):**

- **Kit como nível de inscrição.** `kit ∈ {kit_ouro, kit_prata, kit_basico, sem_kit}` (RN-202/216); "Sem kit" é kit válido e aceita preço negativo, ou seja, desconto (RN-211). Evento oferece 0..N kits (RN-210). "tier" foi renomeado para "kit" em toda a nomenclatura (RN-216).
- **Kits N:N com itens.** O mesmo item (camiseta, medalha, brinde de patrocinador) pode compor vários kits (RN-215). A estratégia é array de refs no item (`itensKit.kits[]`) mais índice inverso desnormalizado "usado em", sincronizado por Function (`functions/src/eventos/itemKitIndex.ts`).
- **Itens com atributos de prova.** Item tamanhado versus item único (RN-212); origem organizador versus patrocinador (RN-213); toggle "exibir logo ao atleta" para item patrocinado (RN-214); modelo de estoque `sob_encomenda` versus `estoque_proprio` (RN-225). Tamanho é persistido por inscrito por item tamanhado (RN-223), coletado no checkout.
- **Aprovisionamento por SKU.** Documento por `itemId__tamanho` com máquina de estados `estimativa → encomendado → em_estoque` (RN-226) e "a encomendar" = Σ inscritos confirmados que exigem (item, tamanho) menos estoque físico (RN-224).
- **Balcão de retirada real.** Tela 60/40 (atendimento à esquerda, painel operacional vivo à direita). Fluxo único de 3 passos: entregar kit → vincular chip → check-in. Retirar o kit é o check-in (RN-205); não há check-in separado. Passos condicionais: `sem_kit` já entra com o passo 1 completo; `usaChip=false` suprime o passo de chip (RN-207). Cinco estados dedicados de balcão em galeria (RN-208): vazio, sem-kit, já atendido, conflito de chip, fora da janela.
- **Chip de cronometragem.** Vínculo por digitação manual ou leitor USB; conflito de chip já vinculado exige confirmação de sobrescrita (RN-206); `registrarEntrega` é idempotente. Subabas de distribuição (progresso de retirada por kit/modalidade) e estoque (saldo por item com alerta de borda crítica).
- **Papel operacional.** Persona "operador de balcão" (além do organizador). Equipe de evento com 4 papéis por custom claims por evento (RN-320, E04).

### Gaps deles que exploramos

- **Operação de prova de rua completa:** item tamanhado (camiseta P/M/G), composição N:N de kit, aprovisionamento por SKU, balcão com vínculo de chip de cronometragem e retirada como check-in. O toggle retirada/frete da Cheers não faz nada disso. É o nosso fosso no vertical de corrida e endurance.
- **Cronometragem.** Cheers tem pulseira de acesso a jogo; Leela tem chip de tempo vinculado no balcão. São problemas diferentes.

### Gaps nossos que eles expõem (repetidos aqui por foco de kit)

- **Loja de produto contínua e frete.** A Cheers vende produto avulso, kit de merch, plano de associação e mensalidade de atleta o ano todo, com frete. O kit do Leela é escopado ao evento; não temos catálogo de produto contínuo nem envio. Se quisermos captura de receita fora da janela do evento, é superfície ausente.

---

## 4. Clube Cheers em detalhe (alimenta o Leela+)

Fonte primária: `cheers.com.br/clubecheers/cupons` e a central de ajuda. Isto detalha e confirma a análise que já vive no [[leela-plus-hipotese-jtbd]].

**Proposta.** "O clube com +R$ 2,5 mil de desconto nos seus rolês", 200+ cupons, "2.500+ membros". Assinatura mensal auto-renovável no cartão, cancelável a qualquer momento, sem fidelidade.

**Preço (não verificado com precisão).** A página de cupons diz "menos de R$ 8/mês"; a central de ajuda diz "menos de R$ 10/mês"; o valor de R$ 9,90 citado internamente no nosso doc não foi confirmado na fonte pública que li. Registro a faixa (abaixo de R$ 10) e marco o número exato como não verificado.

**Praças (verificado).** Curitiba, Florianópolis, Goiânia e Maringá. Expansão praça a praça, não catálogo nacional raso.

**Parceiros (verificado).** Estabelecimentos locais do eixo noturno e social: bares, baladas, cafeterias, restaurantes, pubs. Benefícios típicos: drink, entrada/cover, brinde.

**Mecânica de resgate (verificado).** Presencial e de baixa fricção. O membro abre a seção "Meu Clube" no perfil, filtra por estabelecimento ou tipo de benefício, mostra o cupom ao atendente e confirma o uso.

**Elegibilidade e teto (verificado).** Cada benefício pode ser usado uma vez por mês; reseta a cada renovação do plano e não acumula. Benefício é nominal, mostra o nome do assinante e não é transferível (exige a presença do titular).

**Vínculo com eventos (verificado, e é o ponto-chave).** O clube está colado à compra de ingresso. Além do desconto no comércio, o membro ganha da própria ticketeira: **50% de desconto na taxa de serviço de qualquer ingresso comprado no app**, **lotes exclusivos**, **acesso prioritário** e **sorteios**, com novos benefícios mensais. Quem controla a venda oferece o benefício-âncora sem depender de parceiro externo.

**Leitura para o Leela+.** O mecanismo que importa copiar é o benefício ancorado ao ingresso, porque o Leela já tem o motor: controla ingresso, taxa configurável (quem paga a taxa) e cupom por evento/afiliado. Dá para nascer com um benefício de plataforma (por exemplo, desconto na taxa ou lote exclusivo para membro do clube) antes de ter parceiro local. O resgate presencial "mostra e o atendente confirma" valida no balcão sem integração com PDV, e o teto "uma vez por mês por benefício" é um default de antifraude que protege a margem do parceiro. Tudo isso reaproveita o padrão de espelho read-only (escrita só por Function, agregado por recontagem `count()`) já construído no E05.

**O que não copiar.** O eixo noturno e estudantil; a assinatura paga logo de saída (no Leela o benefício deve provar retenção como valor agregado ao clube antes de virar produto pago); e o catálogo grande antes de ter parceiro real.

---

## 5. Posicionamento

Onde a Cheers para:

- **Vertical universitário e noturno.** Atlética, centro acadêmico, festa, jogo universitário, rolê. Corrida e endurance ficam de fora.
- **Benefício orbitando o comprador de ingresso avulso.** O Clube Cheers é assinatura transacional colada ao ticket. Não há comunidade contínua com desafio, meta ou curadoria de coordenador.
- **Página da entidade sob o domínio da Cheers.** Cada atlética ganha "sua página oficial" dentro de `cheers.com.br`, não um domínio próprio white-label.

Onde o Leela diferencia:

- **Vertical de esporte, endurance e bem-estar.** Kit de prova, chip, balcão, modalidade por percurso, contato de emergência, regulamento versionado. Território adjacente com quase zero sobreposição de catálogo de parceiro (corrida, fisio, nutrição, suplemento, estúdio, recuperação).
- **Clube como comunidade contínua, não evento pontual.** Desafios estilo GymRats, gamificação com base anti-streak, agregados de membro por data (RN-102), comunicação push e email. O funil é clube → desafio → evento, um tecido que uma ticketeira de rolê não tem.
- **Leela+ ancorado na comunidade e no coordenador.** No Cheers o benefício é do comprador; no Leela pode ser do membro do clube, com o coordenador como curador de confiança, e até amarrado a completar um desafio. Retenção de comunidade, não só ingresso mais barato. Este é o moat que o Cheers não tem.
- **Arquitetura multi-tenant B2B-SaaS.** Isolamento por tenant, termos comerciais versionados (`commercialTerms`), claims por papel, fee de plataforma por tenant. Mais profunda como plataforma para produtor do que o modelo de página de entidade da Cheers. Ressalva honesta: white-label com domínio próprio não está na V1 de nenhum dos dois (RN-150 mantém o portal do organizador sob a plataforma).
- **Infra de afiliação com janela, teto e split plugável.** Descrito na seção 2; supera "link de promotor" como produto de receita para clube e promotor.

Resumo de uma linha: a Cheers é a ticketeira do universitário com um clube de descontos colado ao ingresso; o Leela é a plataforma de comunidade esportiva onde ingresso, clube, desafio e benefício se retroalimentam.

---

## 6. Tabela-síntese

| Feature | Cheers | Leela hoje | Decisão sugerida |
|---|---|---|---|
| Vertical | Universitário, balada, jogo universitário | Corrida, endurance, bem-estar | Ignorar o eixo deles; manter foco esportivo |
| Modelo de taxa | Incorporada 8% ou não incorporada 10%, mínimos por método (verificado) | Fee de plataforma por tenant (`platformFeePct`), sem UI de escolha incorporada/não | Copiar o padrão incorporada/não incorporada e os mínimos como decisão comercial explícita |
| Taxa por parcela | Tabela por parcelas no cartão (existe; % não verificado) | Não especificado | Melhorar: definir política de parcelamento e sua exibição no E12 |
| Métodos de pagamento | Cartão, débito, boleto, PIX, dinheiro registrado | `PaymentProvider` prevê cartão, PIX, boleto (sandbox; sem gateway) | Manter; priorizar PIX e boleto no MVP |
| Checkout | E-commerce genérico, entrega/frete no passo 1, cupom no passo 2 | Stepper 5 etapas sem conta, modalidade/kit de primeira classe (spec) | Melhorar: nosso desenho de prova é superior; construir E12 |
| Frete de produto | Sim, frete ou retirada | Só retirada no balcão | Copiar frete se houver merch a enviar; senão adiar |
| Cupom | 4 trilhas (evento, produto, sócio, clube) | Cupom no Resumo, resolve afiliado (spec) | Manter; considerar cupom de produto/sócio quando houver loja |
| Atribuição de venda | Link e cupom de promotor, cancelável | Link master com cookie assinado, janela, teto, split idempotente (spec) | Manter; é diferencial nosso |
| Revenda entre compradores | Revenda segura por CPF, com taxa | Troca de titularidade como política (RN-343), sem marketplace | Melhorar: avaliar revenda segura pós-V1 (reduz golpe) |
| Kit de prova | Toggle retirada/frete genérico | Kits 0..N, N:N item↔kit, item tamanhado, SKU, preço negativo (construído) | Ignorar o deles; é nosso fosso |
| Balcão e check-in | Pulseira QR de acesso (jogos) | Balcão 60/40, retirar kit = check-in, 5 estados (construído) | Manter; diferencial claro |
| Chip de cronometragem | Não (pulseira de acesso) | Vínculo de chip no balcão, idempotente, sobrescrita (construído) | Manter |
| Loja de produto contínua | Produto, merch, plano de associação, mensalidade de atleta | Escopado ao evento | Melhorar pós-V1 se houver tese de receita fora do evento |
| Clube de benefícios | Clube Cheers: 200+ cupons, resgate presencial, 1x/mês, ancorado ao ingresso | Leela+ hipótese; V1 só teaser | Copiar a mecânica (benefício ancorado ao ingresso, resgate presencial, teto mensal); posicionar em esporte/bem-estar |
| Comunidade contínua | Ausente | Clubs, desafios estilo GymRats, gamificação (E05, parte construída) | Manter; é o moat |
| Multi-tenant white-label | Página de entidade sob domínio Cheers | Multi-tenant profundo; portal sob a plataforma, sem domínio próprio na V1 | Manter arquitetura; white-label de domínio é decisão pós-V1 |

---

## Fontes e verificação

Verificado em fonte pública (julho/2026): `cheers.com.br/clubecheers/cupons`, `ajuda.cheers.com.br` (artigos de taxa incorporada/não incorporada, taxa por parcelas, Clube Cheers, revenda segura, cupom, venda por promotor, como comprar), `saibamais.cheers.com.br` (atlética, Cheers Sports), `infoprodutos.cheers.com.br/kiteventos`, matéria da Suno (histórico e escala), lojas de app (Cheers App, VG Entretenimento).

Marcado como não verificado: preço exato da assinatura do Clube Cheers (fontes públicas dizem "menos de R$ 8" e "menos de R$ 10"); percentuais da tabela de taxa por parcela; valor do add-on de reembolso estendido; existência ou não de logística de kit físico de prova (nenhuma evidência pública; presumo ausente no formato do Leela, mas não confirmado).

## Volta para
- [[DISCOVERY]] · [[leela-plus-hipotese-jtbd]] · [[NUVEM-FUNCIONALIDADES]]
