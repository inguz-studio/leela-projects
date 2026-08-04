# Rodada de decisões do dono — 2026-08-03 (DEC-0803 e DEC-0803B)

Duas levas no mesmo dia. De manhã o dono testou o checkout com o juros de produção
recém-ligado e devolveu três achados de interação. À tarde ele percorreu o painel
recém-limpo e respondeu dezesseis itens em lote.

## DEC-0803 (manhã) — achados do dono no teste do parcelamento vivo

O dono testou o checkout com o juros de produção recém-ligado (2,89% a.m., lane
JUROS-PROD-CONFIG) e devolveu três achados de interação, todos na etapa de pagamento.
Verbatim integral ao final da leva.

### Achados e destino

| # | Achado | Classe | Destino |
|---|---|---|---|
| C1-0803 | O subtotal/total exibido NÃO atualiza imediatamente quando o dono faz a seleção (troca de parcelas/forma). Regra: a escada de opções já chega inteira na cotação — trocar parcela é atualização instantânea de tela, sem round-trip; a guarda do item 64 ("Atualizando o total…") só existe quando há cotação NOVA em voo (mudança de seleção de itens/cupom), nunca na troca entre opções já cotadas | UX/dinheiro exibido | Lane CHECKOUT-FIX-0803, ⚔ |
| C2-0803 | Primeira abertura do select de parcelas mostra SÓ o valor do ingresso (1x); as opções completas só aparecem na segunda abertura | Defeito UI | Lane CHECKOUT-FIX-0803, ⚔ |
| C3-0803 | PIX — ordem dos estados: "processando pagamento" só pode aparecer DEPOIS do clique em "código PIX". O clique mostra loader com a mensagem **"Preparando código PIX"**; na sequência o código aparece na tela. Nenhuma cobrança e nenhum estado de processamento antes do clique explícito. **Refina a D-ACH-12/C2 da ACHADOS-0802** (cobrança nascia na escolha da forma PIX → passa a nascer só no clique do botão) | Regra (dinheiro) | Lane CHECKOUT-FIX-0803, ⚔ |

### Fronteiras que continuam valendo

- RN-440: entrar na etapa de pagamento não cria pedido, inscrito nem cobrança.
- Item 64 (CKUX-REV): com cotação nova em voo, botões de pagar desabilitados — o C1-0803
  não revoga a guarda, só proíbe usá-la onde não há cotação em voo.
- 1x do cartão = PIX à vista (RN-436); escada crescente por parcela.

### Verbatim do dono (manhã)

> "sub total, nao altera imediatamente, quando eu faço a seleção. Na primeira vez que
> cliquei no select apareeceu apenas a opção como avlor do ingresso, e nao o
> parcelmanento, somente na segunda vez, que apareciam as opções. Já para o pix, o
> 'processando pagamento só deve aparecer deopis de clicar em 'código pix', com um loader
> apaercendo com a mensagem 'Preparando código pix', com o pix aparecendo na tela. ficou
> claro?"

---

## DEC-0803B (tarde) — o dono responde o painel em lote

O painel tinha acabado de ser limpo e padronizado, com 29 itens. O dono percorreu a
lista e fechou dezesseis, entre decisões, ratificações e enquadramentos. Três respostas
valem mais que o item que as originou e viraram regra permanente de condução. Duas
viraram pedido novo de produto, e uma saiu do painel do dono por não ser decisão dele.

### Resumo por item

| Item | Decisão do dono | Destino |
|---|---|---|
| 56 | Máscara de dinheiro pt-BR aprovada no campo de repasse | S708, Backlog do kanban |
| 57 | Default de roteamento ratificado; já construído no mesmo dia | `1e4b3b2a`; dois desdobramentos abaixo |
| 58 | Default de 7 dias aplicado sem nova consulta | S031, fila de fechamento de sprint |
| 59 | Conserto aprovado, no modelo mais forte disponível | S1220-T1, lane própria |
| 60 | A tela prometida é aviso, nunca garantia de emissão | correção de spec; a lacuna vira item de fila |
| 61 | Não declarar o modo da taxa na UI | S213-T2, evento de teste com taxa repassada |
| 62 | Preferência por `minInstances`; o custo é decisão do CTO | pendência do CTO; sai do painel do dono |
| 63 | "pode envolver esforço físico" ratificado | fechado, nada a construir |
| 64 | Spinner aprovado como paliativo, com alvo de espera zero | S1219 |
| 65 | Fechado sem veto | S1220-T2 |
| 66 e 12 | O domínio fica para depois | seguem no painel como ação dele |
| 70 | Limpar | S213-T1 |
| PB-2 | Quatro partes, detalhadas abaixo | S1610 |
| PB-13 | Trocar a foto agora, sem esperar acervo definitivo | S1220-T3 |
| JUROS-1 | Não mencionado nesta leva | segue aberto no painel |
| JUROS-2 | 2,89% a.m. como estimativa na tabela do admin | S1610-T2; a visão de antecipação vai ao backlog |

### 56 · a máscara de dinheiro no campo de repasse

Aprovada a máscara pt-BR, que era o default proposto. O campo passa a ler `1.500` como
mil e quinhentos, e o contrato de três casas decimais (`10.005`) precisa ficar declarado
na mesma linha em que a máscara entra, porque é ele que a review da posição 2 preservou
ao não consertar.

### 57 · roteamento pós-login, mais dois desdobramentos

O default foi ratificado inteiro. Admin da plataforma cai em `/plataforma`, organizador
na Visão Geral, conta sem papel para na porta com o aviso, e a reconciliação da RN-411
continua valendo. A lane ONBOARD-BUILD construiu no mesmo dia (`1e4b3b2a`).

Dois registros saíram junto e não são o item 57:

1. **Uma pessoa pode ser admin e usuária ao mesmo tempo.** A decisão é acesso único: uma
   conta só. A tela de visualização e troca entre papéis fica deliberadamente para
   depois. Registrar como item futuro, não construir agora.
2. **O login vira um componente overlay no meio da landing inicial.** Pedido novo do
   dono. Entra na fila de construção como item próprio, e não na lane em voo.

### 60 · a tela "estamos emitindo seu ingresso"

Enquadramento do dono: a tela prometida é apenas um aviso. A compra ainda precisa ser
confirmada, e a tela nunca é garantia de que o ingresso saiu. Isso fecha o defeito de
spec da RN-421 pelo lado barato, sem link provisório pré-emissão.

Junto veio uma lacuna que o dono nomeou sozinho: não existe área do cliente no web para
a pessoa ver os próprios ingressos. Entra na fila como item novo.

### 62 · checkout sempre quente

A preferência do dono é ligar `minInstances`, e a razão que ele deu é a mesma do conserto
de 03/08: a cotação dispara na etapa de dados, então a function já acorda enquanto a
pessoa preenche. A decisão final é de custo, e custo de infraestrutura é do CTO humano,
o sócio. O item sai do painel do dono e fica registrado aqui como pendência do CTO.

### 64 · o alvo por trás do paliativo

O paliativo está aprovado: um spinner pequeno de load avisando, no lugar da frase. O
alvo registrado é outro e é maior. Não deve existir espera perceptível, porque a function
de cotação já foi disparada antes, na etapa de dados, e já sabe o que será cobrado. As
parcelas precisam estar pré-calculadas quando o painel de pagamento abre.

### 65 · o limite de caracteres da chave de pagamento

Fechado sem veto, com a resposta curta do dono: "só roda isso". A regra publicada aperta
para 49 e a contradição com a RN-333 morre.

### PB-2 · o resíduo de um centavo, em quatro partes

A resposta do dono tem quatro partes, e três delas são produto, não rótulo:

1. A compradora deve ver o preço **exato**. Resíduo de um centavo na tela está proibido,
   e trocar o nome do rótulo não resolve.
2. A opção "pagamento sem juros" **não existe por ora**. Quando existir, será ferramenta
   do administrador da plataforma, liberada por tenant. Nunca escolha do produtor.
3. Os 2,89% a.m. são **estimativa**, e servem para preencher a tabela que já existe no
   admin.
4. Pedido novo: incluir o **custo** de parcelamento na mesma tabela, para o dono ver
   custo contra markup e enxergar a margem exata por parcela.

### JUROS-2 · a tabela do admin e a visão de antecipação

Preencher 2,89% a.m. na tabela de configuração do admin que gerencia os tenants, como
estimativa, pela mesma razão da PB-2c.

Junto o dono declarou a visão de produto por trás da tabela. O intuito é pegar o custo de
parcelamento e o custo de antecipação, aplicar markup e enxergar o faturamento da
plataforma ao longo do tempo. A antecipação será **sob demanda**, nunca automática,
idealmente operada pelo painel admin, antecipando só o necessário para cobrir repasses.
Palavras dele: "cena para os próximos capítulos". Entra como item de visão no backlog,
não como tarefa.

### Regras permanentes registradas nesta leva

Valem daqui em diante e não voltam a ser perguntadas.

- **R-0803B-1 · limpeza não importuna o dono.** Verbatim: "limpezas não devem me
  importunar; resolva antes e deixe no pipeline de QA/fechamento de sprint". Cobre a
  retenção de imagens de build do item 58 e a limpeza dos pedidos de teste do item 70,
  e vale para qualquer higiene de dado ou de infraestrutura que apareça depois.
- **R-0803B-2 · questão técnica do provedor de pagamento não sobe ao dono.** Nasceu do
  item 65. Antes de escalar, pesquisar a API do Asaas e resolver pelo caminho que a
  documentação do provedor sustenta.

### Pendência do CTO (sócio humano)

- **Item 62 · `minInstances` no checkout.** O dono prefere ligar. Falta o julgamento de
  custo mensal no Blaze contra a fricção medida, que é de 1,7 s no piso e cerca de 10 s
  no cold start. Aterrissa no `runWith` de `cotarInscricaoCheckout` e de
  `createInscricaoCharge`.

### Itens novos na fila do produto

Quatro pedidos nasceram desta leva e entraram na fila do painel sem posição ratificada,
porque o dono não declarou ordem.

| Item | Origem | Natureza |
|---|---|---|
| Login como overlay central na landing | 57 (b) | construção |
| Área do cliente no web, com os próprios ingressos | 60 | construção |
| Visualização e troca entre papéis numa conta só | 57 (a) | adiado de propósito |
| Antecipação de recebíveis sob demanda pelo admin | JUROS-2 | visão de produto |

### Lanes que esta leva abre

| Lane | Cobre | Rota |
|---|---|---|
| S708 · máscara de dinheiro | 56 | build |
| S1219 · o pagamento abre com o total pronto | 64 | build, ⚔ |
| S1220 · três miudezas fechadas em 03/08 | 59, 65, PB-13 | build; a T1 no modelo mais forte disponível, ⚔ |
| S1610 · a tabela de juros do admin | PB-2, JUROS-2 | spec e build (ADMIN-JUROS), ⚔ |
| S213 · dados de teste honestos | 61, 70 | QA-DATA-0803 |
| S031 · retenção das imagens de build | 58 | fechamento de sprint |

### Verbatim do dono (tarde)

Fragmentos preservados na íntegra. O restante da leva está registrado como paráfrase
fiel, item a item, nas seções acima.

> "limpezas não devem me importunar; resolva antes e deixe no pipeline de QA/fechamento
> de sprint" (item 58, e a regra que ele gerou)

> "a cotação dispara na etapa de dados" (item 62, justificando a preferência por
> `minInstances`)

> "só roda isso" (item 65)

> "pode trocar a foto por hora" (PB-13)

> "cena para os próximos capítulos" (JUROS-2, sobre a antecipação sob demanda)

---

## Apêndice DEC-0803B · o que a noite de 03/08 devolveu

Três lanes fecharam depois que o painel foi selado, e nenhuma delas era pergunta ao dono
quando começou. Duas voltaram com decisão para ele.

### ONBOARD-REV · a review antagonista da porta de entrada

Revisor sem participação na construção (contexto fresco), atacando os oito commits da
ONBOARD-BUILD (`d0b7cd49..aa0e2183`). Dez vetores, um a um, cada um com falsificação
executada — quebrar a trava de propósito e ver o teste morrer.

| # | Vetor | Veredito |
|---|---|---|
| 1 | enumeração de convite | falhou ⇒ DEF-B corrigido |
| 2 | corrida de uso único e resíduo | passou, com três falsificações |
| 3 | bypass do teto de tentativas | passou no que a regra promete; o que ela não cobre virou veto |
| 4 | promoção indevida pelo resgate | passou, com seis ataques executados e nenhuma promoção |
| 5 | divergência de letra da RN-417 | premissa sustentada |
| 6 | roteamento pós-login contra o cadastro | falhou ⇒ DEF-A corrigido, com resíduo em veto |
| 7 | Rules do Firestore | passou, com três falsificações de Rule |
| 8 | LGPD | falhou ⇒ veto ao dono |
| 9 | conformidade de marca | falhou ⇒ DEF-C corrigido |
| 10 | roteamento por papel | passou, e a decisão do dono virou caso de teste |

**Três defeitos, três corrigidos** (`52f27f76`, `06ea10f8`, `37b9ec94`), mais um commit só
de prova (`d8d36697`). Nenhum era de tela:

- **DEF-A** — o formulário do cadastro aceitava o que o servidor recusa (nome de uma letra,
  organização de 81 caracteres), a negativa caía num tratamento vazio e a conta nascia sem
  registro de organizador. No login seguinte, a mesma pessoa era barrada sem caminho de
  volta. A tela passou a usar a mesma régua do servidor, que já existia no núcleo.
- **DEF-B** — a recusa única prometida pela regra valia só para o candidato do caminho
  feliz. Conta com papel conflitante atravessava a validação, **reservava o código** e só
  morria depois, com um erro diferente — que é oráculo de qual código existe. E queimava
  convite alheio a cada tentativa, com a pessoa lendo "tente de novo em instantes".
- **DEF-C** — o véu do overlay bloqueante não existia. A classe pedida não compila no
  Tailwind, então o painel ficava sobre a home visível e o contraste dependia do que
  estivesse por baixo. Consertado por reuso dos tokens de overlay do design system: zero
  byte novo de CSS.

**Premissa sustentada (RN-417).** A construção pôs o contato do CTA num doc próprio,
`platform/configOnboarding`, e não como campo de `platform/config`, porque Rules do
Firestore não filtram campo e abrir o doc global para a conta travada entregaria junto a
tabela global de taxa. A falsificação foi executada e mata três casos em dois arquivos. É
atualização de letra, não decisão nova — a RN-417 já foi reconciliada nos épicos.

**Gate final verde:** `packages/core`, `packages/api-client` e `packages/design-system` em
zero erro e zero warning; `apps/painel` **1822/1822** em 194 arquivos; `apps/landing`
**449/449** em 41 arquivos; `functions` **3471 passando** e 81 pulados em 201 arquivos. A
suíte de Rules de Storage segue pulada por falta do emulator correspondente no comando —
preexistente, medida como não-regressão por diff vazio.

**Três vetos subiram ao dono.** O primeiro virou **LGPD-1** no painel, com as três opções e
sem default. O segundo é o beco da conta órfã, que virou card de fila. O terceiro é a borda
volumétrica, roteada abaixo como pendência do CTO.

### QA-DATA-0803 · os dados de teste pararam de mentir

Oito escritas em produção, todas inventariadas no audit, em duas tarefas.

**Item 70 — limpeza.** Os dois pedidos de teste que morreram no defeito do PIX saíram do
contador do `desafio-mtb-costa-lagoa-2026`, pelo mesmo mecanismo que o domínio já usa para
pedido PIX morto, mais o apagamento dos inscritos — que é a única escrita que move o
contador, porque ele não filtra status. Duas transações, pré-condição relida dentro de cada
uma. `qtdInscritos` foi de **122 para 120** e convergiu em 12 segundos pelo gatilho de
escrita; pendente foi de 13 para 11. **Inalterados**, como tinha de ser: confirmado 101,
cancelado 8, estornado 0, receita bruta R$ 348,00, receita líquida R$ 311,46, demografia
101, vendidos por lote e cobranças ativas. A soma por status e por modalidade fecha em 120,
e os nove eventos batem com a contagem real.

**Item 61 — evento de teste com taxa repassada.** Criado `teste-taxa-repassada` no tenant
Castelo Produções, publicado, com lote único de R$ 10,00 e 50 vagas até 19/12/2026. Cotação
real do motor de produção no evento novo: valor R$ 10,00 mais taxa de serviço R$ 1,05 dá
**R$ 11,05** ao comprador, no PIX e no cartão. O contrafactual sobre os mesmos insumos:
repassada entrega R$ 11,05 ao comprador e R$ 10,00 ao produtor; incorporada entrega
R$ 10,00 ao comprador e R$ 8,95 ao produtor. Página pública e checkout responderam 200,
servindo "a partir de R$ 10,00 + taxa de serviço".

**Passo a passo para o dono conferir:**

1. Abra `https://leela-landing.web.app/teste-taxa-repassada` — o preço anunciado é
   "a partir de R$ 10,00 **+ taxa de serviço**", que é a forma da taxa repassada.
2. Clique em "Garantir inscrição" e siga até o pagamento. O resumo mostra a linha de taxa de
   serviço **com número**, R$ 1,05, e o total de R$ 11,05.
3. Compare com `meia-floripa-2026`, que incorpora: lá a mesma linha diz "inclusa no valor" e
   nunca exibe número.
4. Se quiser esconder o evento de teste da home pública, o caminho é um campo só: mudar o
   status para rascunho. Hoje ele aparece na home, porque o modelo não tem evento não
   listado — a mitigação é o rótulo agressivo no nome.

**Quatro achados do caminho, nenhum tocado.** Os cupons HEROI10 e CORRA50 são subcoleção por
evento e existem só no `meia-floripa-2026`, então não alcançam o evento novo (compensado
com preço base de R$ 10,00). Com a parcela mínima do termo em R$ 10,00, um total de R$ 11,05
só oferece 1x, então o evento de teste não exercita parcelamento — isso continua no
`meia-floripa`. O tenant precisou ser o Castelo: é o único que vende e que o dono opera. E
**dois pedidos de teste do dono, feitos hoje de manhã, têm cobrança real no Asaas** — são a
prova do primeiro sucesso do `createInscricaoCharge` e por isso ficaram intocados.

O quinto achado é maior que a lane e virou card de fila no painel: **a landing deriva estado
de venda só dos lotes**, então evento publicado sem lote serve "Inscrições encerradas" mesmo
com preço válido no servidor. `noturna-beira-mar-2026` e `retiro-bem-estar-rio-vermelho-2026`
estão nessa situação em produção agora. Foi por isso que o lote do evento de teste foi
obrigatório.

### CHECKOUT-FIX-0803 · os três achados da manhã, no ar

Os três consertos da leva DEC-0803 foram construídos e **deployados na landing** de manhã
(`30232e9c`, `b29e9719`, `9cbf520f`, com as provas em `5a785ff6`). O que mudou está servido
em `https://leela-landing.web.app`, medido marcador a marcador no pacote antes e depois.
Detalhe nos boards; a conferência visual é o item 69 do painel.

### Sequenciamento do maestro (03/08, fim da rodada)

- **O deploy do pacote da porta de entrada NÃO foi executado.** Nenhuma linha do onboarding
  está em produção. A decisão de subir foi elevada ao dono como **DEPLOY-1** no painel, com
  a recomendação do maestro registrada **como recomendação**: subir agora com o seed retido,
  porque a jornada fica inalcançável sem convite e o roteamento pós-login já corrige em
  produção um destino que hoje erra.
- **O seed do primeiro convite fica RETIDO** até o veto **LGPD-1** ser respondido. É a
  amarra que impede um organizador de nascer ativo sem prova de aceite enquanto a regra não
  estiver escolhida.
- **Zero deploy e zero mutação de produção** nesta lane de selo. As oito escritas da
  QA-DATA-0803 são as únicas mutações de produção da noite, e estão inventariadas acima.

### Pendência do CTO (sócio humano) — segunda entrada

- **Borda volumétrica do cadastro aberto.** O teto de tentativas do resgate é por conta, e o
  cadastro é aberto: o teto global é `5 × contas criadas`. Quem torna a adivinhação inviável
  é o espaço de busca (31⁸ ≈ 8,5 × 10¹¹), não o limitador. O throttle volumétrico é da
  borda, e **App Check e Cloud Armor estão desligados**. Julgamento de custo: ligar o App
  Check no painel antes do go-live, ou aceitar o custo faturado de cada tentativa (uma
  invocação de função mais uma transação de banco). Viaja junto do item 62 (`minInstances`),
  que já está registrado acima.

---

## Apêndice DEC-0803B (2) · a correção do dono sobre "acesso único"

Registro de erro meu, corrigido pelo dono na virada de 03 para 04/08, depois de o código já
ter sido escrito e empurrado. Fica aqui porque a leva DEC-0803B é onde o registro errado
nasceu, e emenda tem de morar ao lado do que ela emenda.

### O que eu registrei, e estava errado

Na seção "57 · roteamento pós-login, mais dois desdobramentos", primeiro desdobramento, eu
escrevi que uma pessoa pode ser administradora da plataforma e usuária ao mesmo tempo, com
a decisão sendo acesso único numa conta só. Escrevi errado. O dono nunca disse isso sobre a
conta de administração.

### A correção do dono, verbatim

> "É uma conta só somente para quem é organizador e cliente. A conta do painel admin, deve
> ser outra. os ambientes devem ser separados, por questões de segurança."

A conta única vale para o par organizador e cliente. A conta do painel administrativo é
outra, e os ambientes ficam separados por segurança.

### Onde o registro errado aterrissou

Quatro lugares, nesta ordem, e nenhum deles é uma regra de autorização:

| Onde | O que ficou escrito | Custo de desfazer |
|---|---|---|
| `apps/painel/src/routes/conta/auth/_lib/destinoPosLogin.ts:82-86` (`aa0e2183`) | Cinco linhas de comentário dizendo que papel acumulado resolve por precedência e proibindo quem mexer de construir seletor | Cinco linhas. O commit declara "nenhuma linha de comportamento muda" e o `numstat` confirma: `5 0` no arquivo de código |
| `apps/painel/src/routes/conta/auth/__tests__/destinoPosLogin.test.ts` (`d8d36697`) | Dois casos novos, um deles afirmando que `platform_admin` com `tenantId` preenchido cai em `/plataforma` por precedência | Um caso morre, o outro sobrevive reescrito. Ver a fila |
| `RN-448`, nos épicos E00 e E16 e no delta da rodada de onboarding | "Acesso único por precedência: uma conta, uma casa" | A RN é superada pela RN-449, não apagada |
| Boards (`V1-KANBAN`, `V1-CHECKLIST`, `BOARD-EPICOS`) | Card "Uma conta só para quem é admin e organizador", congelado de propósito | Card trocado |

### A consequência, medida antes de escrever

O código de autorização nunca chegou a permitir o acúmulo. Todo caminho de escrita de papel
já recusa transformar uma conta `platform_admin` em organizadora: o `provisionTenantCore`
rejeita papel conflitante (`functions/src/platform/provisionTenant.ts:196-256`), o resgate de
convite rejeita `platform_admin` como chamador (`resgatarConviteOrganizador.ts:180-181`), e
a claim é um escalar que nem carrega os dois valores ao mesmo tempo
(`packages/core/src/platform/roles.ts:22-27`). O que o `aa0e2183` fez foi escrever a decisão
errada como intenção, no lugar exato onde alguém a leria para não desfazê-la.

O acúmulo que está aberto de verdade é o outro, e ninguém o tinha olhado: **administrador e
cliente**. O `contaSemFriccao` resolve a conta do comprador pelo e-mail da compra, sem olhar
papel nenhum (`functions/src/checkout/contaSemFriccao.ts:153-160`), e amarra a compra àquela
conta. Comprar um ingresso com o e-mail do super-admin faz do super-admin um cliente, em
silêncio e sem ninguém decidir nada.

Diagnóstico completo, com a superfície de risco medida no próprio sistema, em
`09-spec-contas-e-area-cliente.md`. Regras novas em `10-rns-contas-e-area-cliente.md`. Fila
executável em `11-fila-contas-e-area-cliente.md`.

### A leva que veio junto: a área do cliente

No mesmo despacho o dono definiu a área do cliente, que deixou de ser item de backlog e
virou pré-requisito da compra: o e-mail manda o comprador ver o ingresso dentro do sistema.

> "se vamos enviar o usuário para visualizar o ingresso dentro do sistema, precisamos da área
> do cliente bem definida. E ela precisa ter um botão para entrar na área de administrador.
> Ela deve ser simples, apenas com histórico de compras, convites (para ser
> promotor/influenciador), Meus Clubes, Meus Ingressos (próximos eventos e passados), meus
> dados, opção de trocar senha. Opção de criar uma conta de organizador também."

As duas levas são o mesmo assunto: quem é quem numa conta, e que porta cada um atravessa.
Por isso foram especificadas juntas, e o card `S1222` do backlog foi absorvido em vez de
ganhar identidade nova. Uma ambiguidade da frase do dono subiu ao painel como
**ADMINSEP-2**, e está declarada como premissa na spec.
