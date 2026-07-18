---
tags: [leela, discovery, leela-plus, hipotese, jtbd, teaser-v1]
aliases: [Leela+, Leela Plus, hipótese Leela+]
status: discovery
data: 2026-07-04
---

# Leela+ · hipótese, jobs-to-be-done e user stories

> Programa de benefícios e descontos para membros, com parceiros locais (comércio, serviços, bem-estar). Inspiração de mercado: Floripa Wellness Club.
> Decisão do fundador: o programa completo é **evolução pós-V1**. Na V1 entra apenas uma **tela teaser** para medir interesse antes de construir. Este doc é a base de produto para essa decisão.

## Contexto e escopo

Leela+ é um conceito novo e não deve ser confundido com o domínio `parcerias` já existente. Hoje `clubes/{clubId}/parcerias` cobre duas coisas: eventos afiliados (o clube promove um evento de um organizador e ganha comissão) e patrocinadores institucionais do clube (`ParceriaEventoAfiliado` | `ParceriaPatrocinador`, RN-120 a RN-125). Isso é captura de valor do clube via afiliação e patrocínio.

Leela+ é diferente: é **benefício de consumo para o membro** — descontos e vantagens que um parceiro local (a cafeteria, a loja de corrida, o estúdio de pilates) oferece a quem é membro Leela. O membro é o beneficiário; o parceiro é um comércio, não um patrocinador de desafio.

O que os dois têm em comum, e por isso a foundation é natural, é o **padrão de espelho read-only** construído no E05-L2 (S107): campos desnormalizados escritos exclusivamente por Function, agregados por recontagem `count()` (nunca `increment`), cliente só transita `status`, Rules negam escrita do resto. Um resgate/validação de benefício no parceiro é a mesma mecânica — o membro dispara uma ação, a Function valida e agrega. Reusar esse padrão evita reinventar a captura de valor.

Situação atual do backlog: um programa de benefícios de consumo não está na `NUVEM-FUNCIONALIDADES.md`. O adjacente mais próximo é "status de membro por trilha de reconhecimento / loyalty com perks" (adiClub tiers), marcado `adiar / depois`. Leela+ é um item de whitespace novo, e é por isso que se valida a demanda com um teaser antes de investir.

## 1. Hipótese

Formato testável, três frentes.

### Hipótese do membro (demanda)
Acreditamos que **atletas e membros ativos de clubes Leela** têm a **necessidade de tornar o estilo de vida esportivo mais acessível e recompensado no dia a dia** (alimentação, equipamento, recuperação, serviços de bem-estar), e que **um programa de benefícios com parceiros locais dá a eles vantagens concretas que reforçam o pertencimento ao ecossistema**.

Saberemos que é verdade se, entre os membros expostos à tela teaser em 60 dias:
- **≥ 12% clicam em "Tenho interesse"** (CTR sobre quem viu a tela). Placeholder a calibrar contra a baseline de engajamento do app.
- **≥ 8% entram na lista de espera** deixando contato (conversão da tela).
- **≥ 3 categorias de benefício** concentram a maioria dos votos de preferência (sinal de que há foco, não dispersão).

Falseamento: CTR < 5% em 60 dias com volume ≥ 300 exposições sugere que a dor não é forte o suficiente para justificar o programa na V2 — despriorizar.

### Hipótese de negócio (retenção / receita)
Acreditamos que o benefício percebido **aumenta a retenção de membros** (mais um motivo para não sair do clube) e abre uma **linha de receita futura** (assinatura Leela+ paga, comissão de resgate, ou fee de listagem do parceiro), sem canibalizar a receita de ingressos.

Saberemos que é plausível se: membros que declaram interesse tiverem retenção 30d/60d **maior que a base** (mesmo antes do programa existir, o interesse já é um sinal de segmento engajado); e se a pesquisa de disposição a pagar na lista de espera indicar **≥ 30%** dispostos a uma assinatura simbólica.

### Hipótese do parceiro (oferta)
Acreditamos que **um comércio ou serviço local** entra no programa porque ganha **acesso a um público segmentado e engajado (atletas ativos da região) a custo de aquisição baixo**, usando o desconto como isca de aquisição e recompra — o modelo ganha-ganha dos clubes de benefício. O parceiro troca margem por volume e visibilidade recorrente.

Saberemos que a oferta fecha se, numa sondagem paralela com 8 a 12 parceiros-alvo, **≥ 50%** toparem oferecer um benefício exclusivo em troca de listagem, sem exigir pagamento antecipado do Leela.

## 2. Jobs to be done

Formato "Quando [situação], quero [motivação], para [resultado]".

1. **Atleta (economia + pertencimento).** Quando estou gastando de forma recorrente com o meu esporte (inscrições, tênis, suplemento, fisio), quero **vantagens reais em lugares que eu já uso ou confio**, para **sentir que ser membro Leela compensa também fora da prova**.

2. **Atleta (descoberta local).** Quando chego a uma cidade ou bairro novo e quero manter a rotina de treino e cuidado, quero **descobrir parceiros locais confiáveis com condição de membro**, para **encontrar onde comer, treinar e me recuperar sem pesquisar do zero**.

3. **Produtor / dono de clube (retenção e valor percebido).** Quando estou tentando segurar meus membros e justificar o vínculo com o clube, quero **oferecer um benefício tangível que eu não precise bancar sozinho**, para **aumentar a retenção sem virar um centro de custo**.

4. **Produtor / dono de clube (curadoria com a cara do clube).** Quando um parceiro local combina com a identidade do meu clube, quero **poder indicar ou destacar esse parceiro para os meus membros**, para **fortalecer a comunidade local em torno do clube**.

5. **Parceiro local (aquisição de clientes certos).** Quando quero atrair clientes recorrentes do perfil ativo e engajado sem gastar em mídia paga, quero **oferecer um benefício exclusivo a membros Leela e aparecer no app deles**, para **converter desconto em fluxo de novos clientes e recompra**.

## 3. User stories

Numeradas. Bloco (a) é o escopo real da V1. Bloco (b) é backlog de evolução — sem estimativa agora.

### (a) Teaser V1 — validar interesse

**LP-T1 · Tela "Leela+ em breve" no app do atleta**
Como membro que usa o app, quero ver uma tela que apresenta a proposta de valor do Leela+, para entender o que vem e decidir se me interessa.
Critérios de aceite:
- A tela vive no app do atleta (Expo, E13) com o shell e tokens do DS (zero hardcode; tag e01), estado claramente rotulado como "em breve".
- Comunica em uma frase a proposta (benefícios e descontos com parceiros locais para membros) e mostra 3 a 5 exemplos de categoria de benefício.
- Ponto de entrada rastreável (item de menu ou card na home do atleta); a exibição dispara um evento `leelaplus_teaser_view` com `memberId` pseudonimizado e origem.
- Copy passa no gate anti-slop e no gate anti-streak (sem linguagem de perda/pressão).
- Sem backend de programa: nenhuma coleção de benefício é criada nesta story.

**LP-T2 · CTA "Tenho interesse" com tracking**
Como membro interessado, quero sinalizar interesse com um toque, para entrar na fila e influenciar o que será construído.
Critérios de aceite:
- Botão primário "Tenho interesse" dispara evento `leelaplus_interesse_click` (member pseudonimizado, timestamp, categoria preferida opcional).
- Métrica primária calculável: CTR = cliques únicos ÷ exposições únicas, por semana e acumulado.
- Estado pós-clique mostra confirmação e evita duplicidade (um clique por membro conta uma vez para o CTR).
- Seletor opcional de "categorias que você mais usaria" (multi-escolha, ≤ 5 opções) grava preferência agregada — sem campo de texto livre.
- Consentimento LGPD explícito antes de capturar qualquer identificador de contato (ver LP-T3); o clique puro de interesse não exige contato.

**LP-T3 · Lista de espera com opt-in**
Como membro muito interessado, quero deixar meu contato para ser avisado no lançamento, para não perder o acesso quando abrir.
Critérios de aceite:
- Formulário mínimo (contato já existente na conta, reaproveitado; nada além do necessário — minimização LGPD).
- Opt-in explícito e revogável ("quero ser avisado do Leela+"); registro com base legal e data do consentimento.
- Grava em coleção de espera dedicada (ex.: `programaLeelaPlus/waitlist` ou `leelaPlusInteresse`) escrita por Function; cliente não escreve agregado; Rules deny-by-default.
- Métrica: taxa de conversão da lista de espera = opt-ins ÷ exposições; contador ∑ por recontagem `count()`, nunca `increment`.
- Painel do produtor mostra, de forma agregada e anônima, quantos membros do seu clube demonstraram interesse (sinal de retenção para o dono do clube) — sem expor identidades.

### (b) Evolução — programa completo (backlog, sem estimar)

**LP-E1 · Cadastro de parceiro e de benefício.** Onboarding do parceiro local (dados, categoria, localização) e criação de benefícios (tipo de vantagem, condição, validade, teto). Curadoria/aprovação antes de publicar. Reusar o padrão de espelho read-only e termos versionados (como `commercialTerms`).

**LP-E2 · Carteirinha / prova de membro.** Prova de que o portador é membro ativo (QR ou credencial no app, análogo ao QR de ingresso do E13), verificável pelo parceiro no balcão. Deriva de status por data, escrito só por Function (padrão RN-102).

**LP-E3 · Resgate e validação no parceiro.** Fluxo de resgate (gerar cupom/código ou validar no ponto), com atribuição server-side e antifraude leve (teto por membro, janela, sem auto-resgate) — reusa a inteligência de atribuição do link master (pilar 05, RN-125).

**LP-E4 · Dashboard de uso.** Para o parceiro: resgates, novos clientes, recorrência. Para o produtor: adesão dos seus membros. Para a plataforma: benefícios mais usados, curadoria orientada por dado. Agregados por Function.

**LP-E5 · Monetização.** Modelo de receita a definir (assinatura Leela+, comissão por resgate, ou fee de listagem do parceiro), atrás de interface plugável no espírito do `PaymentProvider`. Decisão dependente do resultado do teaser.

**LP-E6 · Curadoria e catálogo.** Descoberta por categoria e localização, curadoria por quem (plataforma × produtor do clube), regras de exclusividade e qualidade dos parceiros.

## 4. Referências

Referência primária: Clube Cheers (concorrente direto, ticketeira + clube de benefícios). Secundária: Floripa Wellness Club (modelo de clube local de bem-estar).

### 4.1 Clube Cheers — referência primária (concorrente direto)

A Cheers é uma ticketeira brasileira (venda de ingressos, ~2 mi de usuários, expansão nacional a partir do Paraná) com um clube de benefícios acoplado ao produto de ingresso. É o adjacente mais próximo do Leela: mesma matéria-prima (evento + ingresso) com um programa de vantagens em cima. Nas palavras do fundador, "é praticamente o que estamos fazendo, com posicionamento diferente".

Como o Clube Cheers estrutura cupons e benefícios:
- **Quem oferece.** Estabelecimentos locais (bares, baladas, restaurantes, cafeterias, pubs) fornecem cupons; a Cheers também oferece benefícios da própria plataforma (desconto na taxa de serviço do ingresso, lotes exclusivos, acesso prioritário, sorteios). Catálogo de 200+ cupons, com parcerias regionais por praça (Curitiba, Florianópolis, Goiânia, Maringá).
- **Como o membro resgata.** Fluxo presencial: acessa a página do Clube no perfil, busca o cupom (filtra por estabelecimento ou tipo de benefício), mostra ao atendente e confirma o uso. Regra: cada benefício uma vez por mês; renova a cada renovação do plano.
- **Vínculo com eventos.** É o ponto-chave. O benefício não é só desconto em comércio: inclui **-50% na taxa de ingresso**, **lotes exclusivos** e **acesso prioritário / fura-fila** nos eventos da própria ticketeira. O clube está colado à compra de ingresso — o mesmo cruzamento que o Leela faz.
- **Modelo comercial.** Assinatura mensal (R$ 9,90, só cartão), posicionada como "um cupom já paga a mensalidade". Foco inicial em estudantes.

Aprendizados aplicáveis ao Leela+:
1. **Amarrar o benefício ao ingresso é o encaixe natural — e o Leela já tem o motor.** O "-50% na taxa" e o "lote exclusivo para membro" do Cheers saem de graça de quem controla a venda. O Leela controla ingresso (E04), taxa configurável (RN de quem paga a taxa) e cupom por clube (E04) — dá para oferecer benefício ligado a evento sem depender de parceiro externo no dia um. Isso é candidato a benefício-âncora do teaser.
2. **"Um resgate paga a assinatura" é o argumento de conversão.** O Cheers ancora o preço em um benefício tangível único. Se o Leela+ virar pago, o pitch precisa ser um benefício que sozinho já cobre o custo — não um pacote difuso.
3. **Resgate presencial simples valida no balcão.** Mostrar o cupom e o atendente confirmar é fricção mínima e não exige integração com o PDV do parceiro. Bom ponto de partida para a evolução (LP-E3) antes de qualquer integração fina.
4. **Uma-vez-por-mês por benefício, renovável, controla custo do parceiro.** Regra simples que protege a margem do estabelecimento e dá cadência de recompra. Reusar como default de teto (encaixa no antifraude de resgate).
5. **Expansão praça a praça, não catálogo nacional raso.** O Cheers cresce por cidade com parcerias regionais. Confirma a decisão de nascer local no teaser, com arquitetura preparada para múltiplas praças.

Diferenças de posicionamento a explorar (o "posicionamento diferente" que o Vitor citou):
- **Público e categoria de parceiro.** Cheers é rolê/noturno/estudante (bar, balada, pub). Leela é atleta/esporte/bem-estar/comunidade — parceiros são corrida, fisio, nutrição, suplemento, estúdio, recuperação. Território adjacente, quase sem sobreposição de catálogo.
- **Da compra transacional para a retenção de comunidade.** No Cheers o benefício orbita o comprador de ingresso avulso. No Leela o benefício pode orbitar o **membro do clube e a curadoria do coordenador** — retenção dentro da comunidade, não só ingresso mais barato. É o moat que o Cheers não tem (comunidade + coordenador como curador de confiança).
- **Valor-agregado antes de assinatura.** Cheers é assinatura-first. O Leela pode entrar como valor agregado à participação no clube (aumenta retenção) e só depois testar monetização — evitando a barreira de entrada de R$ 9,90 logo de saída.
- **Benefício com propósito esportivo, não só desconto.** Espaço para amarrar benefício a desafio/meta (ex.: vantagem ao completar um desafio do clube), conectando Leela+ ao funil club → desafio → evento — algo que uma ticketeira de rolê não faz.

### 4.2 Floripa Wellness Club — referência secundária (clube local de bem-estar)

App por assinatura da Grande Florianópolis com descontos, experiências e conexões em saúde, esporte, lazer e alimentação. Público-alvo: 25 a 45 anos, perfil ativo, que valoriza marcas locais. Ao logar, o membro vê o painel de marcas, cupons e condições; resgata o benefício e aplica no link do parceiro. Pagamento por cartão, Pix ou boleto; renovação automática cancelável; presskit (camiseta + brindes) como reforço de pertencimento. O lado do parceiro segue a lógica clássica de clube de benefícios (ACIF): visibilidade de marca, aquisição e recompra de clientes engajados, networking e acesso digital de baixo custo, num arranjo ganha-ganha.

Aprendizados aplicáveis:
1. **Segmento e local casam com a base do Leela.** O perfil "ativo, valoriza marca local" é exatamente o membro de clube esportivo. Ancorar Leela+ em uma praça por vez (começar onde há densidade de membros) valida melhor do que um catálogo nacional raso.
2. **Presskit / prova física de pertencimento funciona.** A camiseta e os brindes transformam a assinatura em identidade. Vale um análogo digital forte (carteirinha, selo) e talvez físico no lançamento.
3. **Resgate simples é o coração.** "Logou, vê o painel, resgata, aplica no parceiro" é o fluxo inteiro. A fricção de resgate mata o programa; desenhar isso como o caminho mais curto possível.
4. **Ganha-ganha com o parceiro é o pitch de aquisição.** O parceiro entra por público segmentado a custo baixo, não por caridade. O material de sondagem de parceiros deve vender aquisição e recompra, não "apoie o esporte".
5. **Curadoria local com cara de comunidade** é o diferencial que o Leela pode ter e um app genérico de cupom não tem: o clube e o coordenador dão contexto de confiança ao parceiro indicado.

### O que NÃO copiar (dos dois modelos)
- **Não amarrar Leela+ a uma assinatura paga logo de saída.** Cheers e Floripa Wellness são assinatura-first; no Leela o benefício deve primeiro provar retenção como valor agregado ao clube antes de virar produto pago — senão vira barreira de entrada.
- **Não virar app de cupom genérico.** Sem a camada de comunidade/clube, Leela+ compete com o Cheers e dezenas de apps de desconto. O contexto (clube, coordenador, evento, desafio) é o que diferencia; benefício solto sem esse tecido não vale construir.
- **Não copiar o eixo noturno/estudante do Cheers.** O encaixe do Leela é esporte e bem-estar; herdar categorias de balada diluiria o posicionamento.
- **Não escopar praça única como teto.** As referências são regionais (Floripa; Cheers por cidade). O teaser pode nascer local, mas a arquitetura de dados não deve assumir uma só praça.
- **Não prometer catálogo grande antes de ter parceiros reais.** Teaser honesto ("em breve", medindo interesse) evita a decepção de um catálogo vazio no lançamento.

## 5. Riscos e perguntas abertas

- **Curadoria: quem cura os parceiros?** Plataforma central, produtor de cada clube, ou híbrido? Impacta qualidade, escala e o modelo de dados (parceiro global × parceiro por clube/tenant).
- **Exclusividade.** Um benefício é exclusivo de um clube, compartilhado entre clubes de uma praça, ou global do Leela? Exclusividade atrai o parceiro mas fragmenta o catálogo.
- **LGPD do tracking de interesse.** O clique de interesse e a lista de espera capturam dado pessoal. Base legal, minimização (não pedir contato novo se já existe na conta), consentimento explícito e revogável, retenção e direito de apagar. O teaser não pode virar coleta disfarçada.
- **Canibalização vs. retenção.** Se o benefício não estiver ligado ao esporte/comunidade, corre o risco de deslocar foco da proposta central (ingresso + clube + desafio) sem ganho de retenção real.
- **Monetização sem quebrar confiança.** Cobrar do parceiro, do membro, ou por resgate? Cada um muda o incentivo. Definição depende do sinal do teaser.
- **Antifraude de resgate (evolução).** Auto-resgate, compartilhamento de carteirinha, teto por membro — o mesmo risco de atribuição da afiliação (RN-125) reaparece aqui.
- **Falso positivo do teaser.** Clique em "tenho interesse" é barato e pode superestimar demanda. Complementar CTR com sinal de retenção do segmento e disposição a pagar antes de decidir construir.
- **Colisão de nome com `parcerias`.** O domínio `parcerias` já existe com outro sentido (afiliação/patrocínio). Leela+ precisa de nome de coleção próprio para não confundir modelo de dados nem Rules.

## Volta para
- [[DISCOVERY]] · [[NUVEM-FUNCIONALIDADES]] · [[ROADMAP]]
