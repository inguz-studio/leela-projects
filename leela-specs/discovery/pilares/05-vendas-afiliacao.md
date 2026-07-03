# Pilar 5 · Controle de vendas interno + afiliação/split — discovery

> Discovery de fontes para o ecossistema Leela. Amarra E04 (Config & Vendas), E08 (Influenciador), E09 (Financeiro do Profissional) e o ADR-006 (escolha do gateway).
> Rastreabilidade: cada afirmação de mecânica ou taxa tem URL + data de acesso na seção Fontes. Taxas mudam com frequência e por contrato; tratar como referência, não contrato.
> Data da pesquisa: 2026-07-02.

## Contexto Leela

Modelo alvo: afiliação clube↔organizador. O organizador define a comissão, o clube/promotor divulga com link master rastreável, e o pagamento é dividido automaticamente (split). A camada de pagamento é plugável via interface `PaymentProvider` (ADR-stack), então o gateway pode ser trocado sem reescrever a lógica de vendas/afiliação. Este discovery separa duas camadas que costumam ser confundidas:

1. Camada de dinheiro (gateway): quem executa o split, KYC dos recebedores, payout, antifraude. Terceirizável.
2. Camada de atribuição (Leela): quem clicou, qual link/cupom, dentro de qual janela, com qual regra de comissão. Nao terceirizável — é o núcleo do E04/E08. Nenhum gateway resolve isso; eles apenas executam a divisão que o Leela mandar.

## Players/gateways de referência (foco em split BR: Pix + cartão + recebedores)

| Gateway | Split nativo | Meios com split | Modelo de recebedor | Onde brilha | Ponto de atenção |
|---|---|---|---|---|---|
| **Pagar.me** (grupo Stone) | Sim, maduro | Pix, cartão, boleto | `recipient` por lojista, sem conta própria; saldo por recebedor no painel do marketplace | Marketplace clássico BR, split por % ou valor fixo, antecipação | Só o marketplace acessa o painel; repasse de info ao recebedor é responsabilidade da plataforma |
| **Asaas** | Sim (exclusivo via API) | Pix, cartão, boleto | Split entre contas Asaas (cada parte precisa de conta Asaas) | PME/creators, tarifa por cobrança recebida, comissão por % (sobre líquido) ou valor fixo | Split não é gerenciável pelo site, só API; participantes precisam ter conta Asaas |
| **Iugu** | Sim | Pix, cartão, boleto | Subcontas; split geral, por método, por parcelamento | Split granular (fixo + percentual juntos via `permit_aggregated`), controle por parcela | Liquidação e taxas caem na conta que cria a transação (conta mestre paga as taxas iugu) |
| **Stripe Connect** | Sim (separate charges & transfers / destination charges) | Cartão global; Pix suportado no BR | Connected accounts, `application_fee` define o que a plataforma retém | Plataformas com ambição internacional, ferramentas de payout/roteamento de fundos, DX forte | Custo extra por conta ativa/mês e por payout; taxa base de cartão mais alta no BR; complexidade de compliance |

Referências secundárias mencionadas nas fontes (não avaliadas a fundo): Transfeera (split), e infra de subadquirência. Ficam fora do escopo por não serem o caminho mais curto para o Leela.

## O que fazem bem

- **Split multi-meio.** Pagar.me, Asaas e Iugu executam split em Pix, cartão e boleto, não só cartão. Isso importa no BR onde Pix domina o ticketing.
- **Split por percentual OU valor fixo.** Todos suportam as duas formas. Iugu vai além e permite combinar fixo + percentual na mesma transação (`permit_aggregated`) e split por parcela.
- **Repasse direto ao recebedor.** No Pagar.me o valor do lojista cai na conta dele sem exigir conta no gateway; cada lojista é um `recipient` distinto com saldo próprio.
- **Comissão sobre líquido.** Asaas calcula a comissão percentual sobre o valor líquido da cobrança, o que evita repassar taxa de gateway como se fosse receita.
- **Programas de afiliado prontos como referência funcional.** Sympla já opera o modelo exato que o Leela quer: produtor define % ou valor fixo, afiliado recebe link e/ou código pessoal, ambos atribuem a compra ao afiliado, com painel de visitas/ingressos vendidos/financeiro e repasse após o produtor quitar o boleto. É o melhor benchmark de UX do fluxo.
- **Modelos de atribuição estabelecidos.** Hotmart formaliza last click, first click e multicliques, com cookie de duração configurável (60/90/180 dias até eterno) — vocabulário pronto para o E04.

## Mecânicas/padrões recorrentes

**Split.** Regra por percentual ou valor fixo, definida na criação da transação, gerando N contas a pagar/receber. Dois parâmetros de negócio recorrentes (nomenclatura Pagar.me, conceito comum): quem paga a taxa de processamento (`charge_processing_fee`) e quem é o responsável (`liable`) por chargeback/estorno. Decidir isso é decisão de produto, não do gateway: no Leela, o organizador tipicamente é o liable e absorve a taxa, o clube/promotor recebe comissão líquida.

**Janela de atribuição.** Período após o clique em que a conversão é creditada à origem. Definido por cookie de duração configurável. Sem cookie válido (bloqueio, outro dispositivo, tempo excedido) a venda não é atribuída. O fim gradual dos cookies de terceiros e limites do last click são risco conhecido — mitigar com atribuição server-side ancorada no clique no link master (parâmetro persistido no backend Leela), não só cookie de browser.

**Cupom vs link.** Padrão duplo (Sympla/Hotmart): link rastreável atribui por cookie/parâmetro; código/cupom pessoal atribui na hora do checkout (sobrevive a troca de dispositivo e à perda de cookie) e pode carregar desconto. Cupom é atribuição determinística e resiliente; link é atribuição por sessão. O Leela deveria suportar os dois, com cupom como fonte de verdade quando presente.

**Regras de atribuição.** Last click (padrão, 100% ao último), first click (100% ao primeiro), multicliques (rateio entre afiliados). Restrição observada na Hotmart: multicliques exige produto sem afiliados vinculados nem cupons criados — sinal de que a regra de atribuição precisa ser escolhida cedo no ciclo de vida do evento.

**Antifraude.** Coberto pela camada de gateway/adquirente (análise de risco no cartão). O Leela ainda precisa de antifraude de atribuição: auto-afiliação, cupom vazado, cliques inflados, estorno pós-comissão.

**Repasse/payout.** Duas escolas. (a) Split no ato: o dinheiro já cai dividido nas contas dos recebedores (Pagar.me/Iugu/Stripe destination charges). (b) Repasse pós-liquidação: plataforma recebe e depois repassa (modelo Sympla, afiliado recebe após o produtor quitar o boleto). Split no ato reduz risco de inadimplência da plataforma e trabalho manual; repasse pós dá mais controle mas cria passivo. Cartão liquida com prazo (ex.: Asaas ~32 dias corridos por parcela salvo antecipação), Pix liquida na hora — isso afeta quando a comissão fica disponível.

**Taxas (referência, sujeitas a contrato/volume — comparar só com fonte).**

| Gateway | Pix | Cartão crédito à vista | Observações |
|---|---|---|---|
| Pagar.me | 1,19% | 5,59% (+ até 13,59% parcelado) | + R$0,99 por transação; planos custom por volume (acesso 2026-07-02) |
| Asaas | R$0,99 (3 meses) / R$1,99 depois; isenção nas 100 primeiras/mês por chave ou QR estático | 2,99% + R$0,49 | boleto só cobra se pago; preços promocionais para novos por 3 meses (acesso 2026-07-02) |
| Iugu | não confirmado nesta pesquisa | não confirmado nesta pesquisa | taxas caem na conta que cria a transação; consultar tabela oficial |
| Stripe (base) | suportado no BR | 3,99% + R$0,50 | Connect adiciona: R$6/conta ativa/mês, 0,25% + R$0,67 por payout, +0,25% do volume p/ roteamento (modelo "you handle pricing", acesso 2026-07-02) |

Leitura: para volume alto de Pix (perfil de ticketing/eventos no BR), Asaas tende a ser o mais barato por transação; Stripe é o mais caro no BR mas o mais forte em roteamento internacional e DX. Pagar.me é o meio-termo com pedigree de marketplace. Não fechar taxa sem cotação direta por volume.

## Gaps e oportunidades

- **Nenhum gateway resolve atribuição.** Todos executam a divisão; nenhum decide "de quem foi a venda". A camada de atribuição (link master, cupom, janela, regra) é IP do Leela e vive no E04/E08. Oportunidade: tratar `PaymentProvider` estritamente como executor de split, mantendo a inteligência de atribuição desacoplada e portável.
- **Cookie-only é frágil.** Atribuição só por cookie perde vendas (multi-dispositivo, bloqueadores). Oportunidade: atribuição server-side no clique do link master + cupom como fallback determinístico.
- **Onboarding/KYC do recebedor é fricção.** Asaas exige conta Asaas para cada parte; Stripe cobra por conta ativa/mês. Para clubes/promotores pessoa física em volume, isso vira custo e atrito. Oportunidade: escolher gateway cujo modelo de recebedor (ex.: `recipient` Pagar.me sem conta própria) minimize cadastro.
- **Passivo de repasse.** Modelo "recebe e repassa depois" cria obrigação financeira e risco. Oportunidade: split no ato como default do Leela.
- **Antifraude de afiliação inexistente nos gateways.** Auto-afiliação e cupom vazado são responsabilidade da plataforma. Oportunidade: regras de negócio no E04 (bloquear auto-atribuição, teto por afiliado, reversão de comissão em estorno).
- **Comissão sobre bruto vs líquido.** Erro comum é comissionar sobre o bruto e depois descontar taxa do organizador. Oportunidade: padronizar comissão sobre líquido (após taxa de gateway), como o Asaas já faz.

## Recomendações concretas para o Leela

**Arquitetura (ADR-006 / `PaymentProvider`).**
1. Manter `PaymentProvider` como interface fina que só sabe: criar cobrança (Pix/cartão), aplicar regra de split (lista de recebedores + % ou valor + quem é liable + quem paga a taxa), consultar status e disparar payout. Toda decisão de "quem ganha" fica fora do provider.
2. Critérios de escolha do gateway no ADR-006, nesta ordem para o perfil Leela: (a) split nativo em Pix + cartão [todos passam]; (b) modelo de recebedor com baixo atrito de KYC e sem custo fixo por conta ativa [favorece Pagar.me/Asaas sobre Stripe]; (c) custo por transação no mix real esperado, com Pix dominante [favorece Asaas]; (d) qualidade de API/webhooks para conciliação [todos ok, Stripe é referência]; (e) ambição internacional [único caso que justifica Stripe].
3. Recomendação preliminar (validar com cotação): **Pagar.me** como default se o marketplace precisar de recebedor sem conta própria e pedigree de split; **Asaas** se o driver for menor custo com Pix dominante e público creator/PME. Stripe Connect só se houver plano internacional concreto. Implementar um adapter de referência primeiro, manter o segundo como prova de portabilidade da interface.

**E04 (Config & Vendas — atribuição).**
4. Modelar link master rastreável com token persistido server-side (não só cookie) e cupom/código pessoal como atribuição determinística; cupom vence link quando ambos presentes.
5. Tornar a regra de atribuição (last click default; first click; multicliques opcional) e a janela de atribuição configuráveis por evento pelo organizador, com o vocabulário já validado por Hotmart/Sympla.
6. Comissão definida pelo organizador por % ou valor fixo, calculada sobre o líquido; persistir a regra vigente no momento da venda (imutabilidade histórica para conciliação).

**E08 (Influenciador).**
7. Reusar exatamente o modelo Sympla como referência de UX: painel do promotor com visitas, ingressos vendidos e financeiro por link/cupom. O influenciador é um caso do mesmo motor de afiliação do E04, não um sistema à parte.
8. Antifraude de atribuição: bloquear auto-afiliação, teto configurável por afiliado, reversão automática de comissão em estorno/chargeback.

**E09 (Financeiro do Profissional — repasse).**
9. Adotar split no ato como default (dinheiro já cai dividido), evitando passivo de repasse manual. Expor no painel o saldo por recebedor e o status de liquidação (Pix na hora vs cartão com prazo/antecipação).
10. Registrar quem é liable por chargeback e quem absorve a taxa de gateway em cada split, para conciliação e disputas. Default proposto: organizador liable e absorve taxa; comissão do promotor sempre líquida.

## Fontes (URL + data)

Todas acessadas em 2026-07-02.

- Pagar.me — Recebedores (docs): https://docs.pagar.me/docs/recebedores-2
- Pagar.me — Como funciona o split de pagamentos (central): https://pagarme.helpjuice.com/pt_BR/p1-funcionalidades/marketplace-como-funciona-o-split-de-pagamentos
- Pagar.me — Criando transação com split (central): https://pagarme.helpjuice.com/pt_BR/p2-funcionalidades/12marketplace-criando-uma-transa%C3%A7%C3%A3o-com-split
- Pagar.me — Pix (docs): https://docs.pagar.me/docs/pix-1
- Pagar.me — ofertas/planos e taxas: https://www.pagar.me/ofertas
- Asaas — Split de pagamentos (docs): https://docs.asaas.com/docs/split-de-pagamentos
- Asaas — Dúvidas frequentes split (docs): https://docs.asaas.com/docs/duvidas-frequentes-split
- Asaas — O que é split (central): https://central.ajuda.asaas.com/hc/pt-br/articles/32108845619739-O-que-%C3%A9-Split-de-Pagamentos
- Asaas — Preços e taxas: https://www.asaas.com/precos-e-taxas
- Asaas — Comissão de vendas (blog): https://blog.asaas.com/comissao-de-vendas/
- Asaas — Taxas Asaas (blog): https://blog.asaas.com/taxas-asaas/
- Iugu — Split de pagamento (docs): https://dev.iugu.com/docs/split-de-pagamento
- Iugu — Split de pagamentos (docs): https://dev.iugu.com/docs/split-de-pagamentos
- Iugu — Criar e configurar subconta por API: https://dev.iugu.com/docs/configurar-subconta-por-api
- Iugu — Cobrar tarifa de saque da subconta: https://dev.iugu.com/docs/cobrar-tarifa-de-saque-da-subconta
- Stripe — Connect pricing (BR): https://stripe.com/en-br/connect/pricing
- Stripe — Pricing geral: https://stripe.com/pricing
- Stripe — Separate charges and transfers (docs): https://docs.stripe.com/connect/separate-charges-and-transfers
- Stripe — Fee behavior on connected accounts (docs): https://docs.stripe.com/connect/direct-charges-fee-payer-behavior
- Stripe — Accepted payment methods in Brazil (support): https://support.stripe.com/questions/accepted-payment-methods-in-brazil
- Sympla — Programa de afiliados: https://www.sympla.com.br/programa-de-afiliados__1290437
- Sympla — Posso divulgar eventos como afiliado (compradores): https://ajuda.sympla.com.br/hc/pt-br/articles/210255583-Posso-divulgar-eventos-como-afiliado
- Sympla — Afiliado (produtores): https://ajuda.produtor.sympla.com.br/hc/pt-br/articles/15445455771917-Posso-divulgar-eventos-como-afiliado
- Sympla — Termos programa de afiliados: https://termos-e-politicas.sympla.com.br/hc/pt-br/articles/37343148870932-Termos-de-Uso-Programa-de-Afiliados-Sympla
- Hotmart — Regras de comissionamento: https://help.hotmart.com/pt-br/article/215828158/quais-regras-de-comissionamento-eu-posso-escolher-para-meu-produto-
- Hotmart — Regras de atribuição de comissão para afiliados: https://help.hotmart.com/pt-br/article/360016601731/como-funcionam-as-regras-de-atribuicao-de-comissao-para-afiliados-na-hotmart-
- Rakuten Advertising — GA4 e marketing de afiliados: https://blog.rakutenadvertising.com/marketing-strategies/ga4-affiliate-marketing/
- E-Commerce Brasil — O fim dos cookies e os desafios do last-click: https://www.ecommercebrasil.com.br/artigos/o-fim-dos-cookies-e-os-desafios-do-last-click
</content>
</invoke>
