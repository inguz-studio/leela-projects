---
tags: [leela, rodada, espec-sweep, decisoes]
aliases: [Decisões abertas do ESPEC-SWEEP]
atualizado: 2026-07-19
---

# 01 · Decisões abertas — o que volta para o Vitor

> Tudo que a varredura encontrou e que **muda produto ou arquitetura**. A lane não decide nenhuma delas. Estão em ordem de urgência: as duas primeiras seguram trabalho já planejado; as últimas são registro para não serem redescobertas depois.
>
> Nada aqui é pergunta retórica — cada item diz o que trava, qual é a recomendação da lane quando existe, e o que acontece se a resposta demorar.

## Travam trabalho já planejado

### D-1 · A arquitetura do app como PWA

**O que é.** O Vitor decidiu em 18/07 que o app v1 pode ser um PWA. A spec vigente era para Expo nativo, então a base mudou e a lane não pode escolher onde o PWA mora — é decisão de arquitetura.

**As opções, o trade-off e a recomendação** estão em [[03-adr-proposta-pwa]]. Em uma linha: **a landing vira instalável, com a área do atleta em `/app` e cache que nunca serve HTML velho** — reuso máximo e o atleta nunca sai do app no meio da compra.

**O que trava:** as 6 histórias do E13-slim inteiras. O território de arquivos depende da resposta.

**Se demorar:** a Onda 5 não começa. As Ondas 4 e 6 seguem normalmente.

### D-2 · Push sem garantia no iOS é aceitável na v1?

**O que é.** No Android e no desktop o Web Push funciona. No iPhone, só depois que a pessoa instala o app na tela de início — e sem as garantias de entrega do push nativo. O trabalho que o push serve é central: *"a assessoria manda o treino, eu recebo dentro do app, largo o WhatsApp."*

**Recomendação da lane:** aceitar, com o **inbox dentro do app como fonte de verdade** (o aviso está sempre lá quando o atleta abre) e o **e-mail como o canal que não depende de instalação**. Push vira reforço, não o mecanismo de entrega.

**O que trava:** a história do inbox e avisos (`S1312-PWA`). E, se a resposta for "não é aceitável", a própria decisão de 18/07 volta à mesa — o app nativo retorna.

### D-3 · O reembolso devolve a taxa de serviço ao comprador?

**O que é.** É o item 23, já registrado como pendente-de-confirmação. O desembolso foi ratificado (repasse manual; split não abre) e o *como* ratear o componente fixo cent-exato está cravado na RN-181. Falta o *se*: quando o organizador estorna, o comprador recebe de volta a taxa da plataforma, ou só o valor do ingresso? A decisão estava condicionada ao benchmark, que já saiu.

**O que trava:** nada de código, mas amarra o texto da tela de fila de reembolso (`S904-T5`). Enquanto não sair, a tela **não pode afirmar nada** sobre devolução de taxa.

**Se demorar:** o bloco de reembolso entra assim mesmo, com a tela silenciosa sobre esse ponto — e volta depois só para acrescentar a frase.

## Mudam o desenho de um épico

### D-4 · O influenciador chega ao evento por convite ou por descoberta?

**O que é.** Hoje o modelo é convite: o organizador cadastra o influenciador num modal (RN-317) e convida a pessoa física por e-mail (RN-316). A história `S702` do épico original assume o contrário — uma vitrine de eventos com programa aberto, onde o promotor aceita sozinho e o link nasce na hora.

São dois produtos. O segundo é um **marketplace de afiliação**: precisa de descoberta, de critério de elegibilidade, de moderação e de uma resposta para "quem pode divulgar o meu evento sem eu autorizar".

**Recomendação da lane:** ficar no convite por enquanto. É coerente com o que já está construído, e o marketplace é uma aposta que merece decisão própria, não herança de uma spec antiga.

**O que trava:** nada hoje. Define se `S702` continua no épico ou sai.

### D-5 · Reconstruir o histórico de analytics anterior à coleta diária?

**O que é.** A série diária de KPIs começou quando a coleta subiu; o rollup só enxerga a partir dali. Comparar com períodos anteriores exige reconstruir a partir do ledger transacional — o que é possível, mas é **aproximação**, custa um lote próprio, e traz o risco de um número que não bate com o painel.

**Recomendação da lane:** não reconstruir. Assumir o começo da série como marco zero e declarar isso na tela, na mesma disciplina de honestidade de dado que o produto já pratica.

**O que trava:** nada. Define se entra um lote a mais no E11.

### D-6 · Com PWA, a integração de treino perde a camada on-device

**O que é.** A análise que criou o E14 assumia HealthKit e Health Connect no aparelho, via Expo. **Um PWA não acessa nenhum dos dois.** Então a camada 1 do épico deixa de existir, e o Strava — que é OAuth de servidor e funciona igual em qualquer cliente — passa a ser a primeira camada viável.

Isso não é problema imediato (o E14 é Onda 6), mas muda a ordem interna do épico e vale saber agora: **se ler o Health do aparelho for requisito, o app nativo volta a ser necessário** — não para a v1, mas em algum momento.

**O que trava:** nada hoje. Registrado para a decisão do PWA ser tomada com o custo completo à vista.

### D-7 · WhatsApp entra na V1?

**O que é.** Está no tooling contratado desde o início e aparece no roadmap como capacidade transversal, mas nunca foi especificado nem estimado. Tudo que a comunicação faz hoje é e-mail.

WhatsApp Business tem regra própria — janela de 24 horas, template aprovado previamente, opt-in explícito — e não é incremento do E06: é épico próprio.

**Recomendação da lane:** ficar fora da V1. O e-mail com o Brevo ainda nem foi ligado; ligar dois canais ao mesmo tempo é dobrar a superfície antes de provar a primeira.

## Registro para não redescobrir depois

### D-8 · Quatro perguntas de escopo do Creator Studio

Sem urgência — o épico é o último do roadmap. Ficam registradas para que a Onda 7 não comece do zero: quem é o criador (tenant, papel ou pessoa física); como o produtor de evento é remunerado por trazer público; qual a taxa sobre a venda de programa; e como o material pago é entregue. Detalhe em [[LEELA-E15-creator-studio]].

## Ações externas suas que destravam código já planejado

Não são decisões — são coisas que só o Vitor pode fazer, e que hoje seguram trabalho pronto ou planejado.

| Ação | Destrava | Urgência |
|---|---|---|
| **Chave do Brevo** (conta + verificação de domínio + `BREVO_API_KEY` no Secret Manager) | o disparo a segmentos do E19 **e** o convite por e-mail do influenciador PF no E08 — dois épicos com uma ação | **alta** — é a dependência de maior alavancagem da Onda 4 |
| **Liberação da conta Asaas para pagador estrangeiro** (contato com o gerente, cerca de 6 dias úteis) | as 3 histórias do checkout de estrangeiro, já especificadas | média — o produto não está travado sem isso |
| **`CRM_ID_PEPPER` no Secret Manager** | o deploy com dado real do CRM | alta no momento do deploy; trocar o pepper depois obriga migrar todas as chaves |
| **Decisão de domínio** (item 12) | a verificação de domínio do Brevo depende dela | alta, por ser pré-requisito da anterior |
