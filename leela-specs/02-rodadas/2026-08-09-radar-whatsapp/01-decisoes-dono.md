# Rodada 2026-08-09 — radar de WhatsApp: decisões do dono

Contexto: o estudo de arquitetura do radar de comunidades WhatsApp (fork
`agentic-whatsapp` v1.4.0 → Leela) foi entregue em 09/08 pelo trace `c5a4a8bd`
(Orkestra, `outputs/c5a4a8bd-e9e4-4759-869c-a70f874c9c52/businesses/software-forge/outputs/arquitetura-radar-leela.md`)
com 8 vetáveis. O dono respondeu no mesmo dia. Palavras dele, sem retoque:

> "Pode definir as melhores práticas, nivel de identidade sem pseudonimo, quero
> o nome real pois isso e importante para o job to be done do organizador, para
> ele identificar quem sao os usuários, clientes e membros mais engajados para
> ter uma visao de piramide de engajamento. Quem paga o numero pode ser o
> organizador, para ter um numero proprio pra isso. Sem textos de aviso no
> grupo, Rollout só para convidados. [...] clubes excluidos retem, só fica fora
> do ar, mas mantemos abase."

## Decididas pelo dono

| # | Decisão | Resolução |
|---|---|---|
| 1 | Nível de identidade nos rankings | **Nome real** (vindo do WhatsApp), sem pseudônimo. Razão do dono: JTBD do organizador — identificar usuários, clientes e membros mais engajados para a visão de pirâmide de engajamento. Consequência assumida: dado pessoal de participante exposto ao organizador ⇒ a frente jurídica do LGPD-1 passa a cobrir o radar obrigatoriamente antes do F1. |
| 6 | Quem paga o chip | **O organizador**, para ter número próprio dedicado ao radar. Compatível com a topologia recomendada (1 número dedicado e mudo por organizador, 1 instância por tenant). |
| 7 | Texto de aviso no grupo | **Sem aviso no grupo.** Nenhuma mensagem publicada ao adicionar o radar. A transparência com o participante fica a cargo do termo do organizador (frente LGPD-1) e do perfil do contato (item M2 abaixo). |
| 8 | Rollout | **Só para convidados** enquanto o risco de banimento não estiver medido. |
| — | `clubesExcluidos` (achado lateral 3 do estudo) | **Retenção intencional: a base fica.** Clube excluído sai do ar mas os dados permanecem. O comentário em `assessorias/encerrarParceria.ts:16` que promete "rotina futura" de expurgo deixa de ser pendência de engenharia; vira política declarada. Condição de reabertura: a revisão jurídica do LGPD-1 pode reabrir se apontar prazo máximo de retenção. |

## Delegadas ao maestro ("pode definir as melhores práticas") — decididas com registro

| # | Item | Default em vigor | Condição de reabertura |
|---|---|---|---|
| M1 (3) | Retenção | 400 dias de agregados na nuvem (permite comparação ano a ano); 90 dias de texto de mensagem no espelho local | LGPD-1 apontar prazo diferente; custo de storage relevante em F2 |
| M2 | Perfil do número radar | Nome de contato "Radar · [nome da experiência]" com descrição dizendo que só conta mensagens e nunca envia. Não é mensagem no grupo (configurar perfil não envia nada), então não conflita com a decisão 7 — é o mínimo de transparência passiva | Dono vetar o formato do nome |
| M3 (4) | Poda do texto local pós-sync | LIGADA: texto além de 90 dias apaga da máquina depois que os agregados sobem; agregados ficam | Organizador precisar de histórico bruto consultável no futuro |

## Seguem abertas (não são deste painel resolver aqui)

Estas duas são as vetáveis **2** e **5** do estudo, e é por isso que elas não aparecem nas tabelas acima: não foram decididas, foram encaminhadas a quem decide. Com elas, as oito vetáveis do estudo estão todas registradas neste arquivo — seis decididas (1, 3, 4, 6, 7 e 8, mais a M2, que o estudo não numerou) e duas em aberto com destinatário nomeado.

- **Vetável 2 · base legal e termo do organizador** — advogado antes de F1. Entrou como frente nova do **LGPD-1** no painel (dado pessoal: nome real de participante exposto + medição sem aviso no grupo). A decisão 12, de 09/08, tirou o gate sobre o radar e **não** fechou a pergunta: ela segue aberta, e o parecer, quando sair, é condição de reabertura das quatro decisões da segunda rodada, da RN-524 e da RN-534.
- **Vetável 5 · hospedagem e custo do F2** — tabela na seção 2 do estudo; vai ao sócio (CTO humano), não a este painel. A RN-530 fixa que trocar a hospedagem reabre a frente jurídica, então esta não é só decisão de dinheiro.

## Nota de rodada

O dono também perguntou o risco da topologia "um número da Leela em todos os
grupos" — respondido a partir da seção 1(a) do estudo (raio de explosão total,
perfil de detecção piorado pela mudez, multi-locação frágil). A topologia em
vigor segue a (c): um número por organizador, pago pelo organizador.

---

## Segunda rodada de 09/08 — decisões depois da review antagonista

A review antagonista da spec (trace `3ed45e7f`, 25 achados) devolveu "não está pronta para
virar código" e apontou, entre os críticos, que o radar monta perfil nominal de quem nunca
comprou — o que o [[LEELA-E19-crm]] classifica como incidente de LGPD — e que o
[[LEELA-E17-perfil-social]] já decidiu que exibir participação de terceiro pelo nome é opt-in
com padrão negativo. O dono respondeu no mesmo dia. Palavras dele, sem retoque:

> "nao tem problema mapear quem nao comprou ainda. o admin pode ter opção de colocar o nome
> manualmente, e podemos puxar o nome epelo o que é salvo no whatsapp até a pessoa comprar.
> foda-se o risco juridico agora."

| # | Decisão | Resolução |
|---|---|---|
| 9 | Mapear quem nunca comprou | **Liberado.** O radar pode montar perfil nominal de participante que nunca comprou nada do organizador. Isso cria uma categoria de dado que não existia no produto — agregado nominal de não-cliente —, distinta do agregado sem identidade do [[LEELA-E11-analytics]] e da identidade transacional do [[LEELA-E19-crm]]. Fica registrada na **RN-531**, com a fronteira contra o CRM escrita lá. Resolve o REV-005 e o REV-006 por decisão de negócio, não por argumento técnico. |
| 10 | Fonte do nome até a pessoa virar cliente | **O que o WhatsApp entrega** — o `notify_name`, que é o nome que o próprio participante mostra na comunidade. Quando ele vira cliente da Leela, o cadastro passa a mandar e o nome do WhatsApp vira histórico. Fica na **RN-532**. Resolve a direção do REV-018. |
| 11 | Edição manual do nome pelo admin | **Existe.** O admin corrige o nome de um participante direto na superfície do radar, e o valor dele vence o que vier do WhatsApp em qualquer publicação seguinte. Cobre o nome ausente (REV-017) e dá saída para nome-lixo ou telefone no lugar do nome (REV-007). Fica na **RN-532**. |
| 12 | Risco jurídico do radar | **Assumido pelo dono agora.** O LGPD-1 deixa de travar a S2003 e o F1 inteiro. A quarta frente do LGPD-1 (base legal + termo, com advogado) continua existindo e correndo em paralelo, sem gate sobre o radar. |

**Condição de reabertura das quatro (a mesma para todas):** parecer do advogado quando sair;
incidente envolvendo dado de participante; ou a chegada do F2 multi-locação, que põe dado de
terceiro em escala e em máquina que pode não ser a do organizador (RN-530).

**Recomendação declinada, registrada.** O revisor recomendou desenhar agora a versão do radar
**sem** nome real, com o argumento de que ela pode ser a única possível depois do parecer e de
que hoje toda a atração do produto mora na parte com risco jurídico. O dono declinou por agora.
Fica registrado com a mesma condição de reabertura acima: se o parecer limitar o nome, esse
desenho volta à mesa antes de a tela ser refeita.

**O que estas quatro decisões não cobrem.** Elas resolvem população, fonte do nome, correção do
nome e apetite de risco. Não decidem hospedagem no F2 (segue com o sócio, RN-530), nem prazo de
retenção diferente dos 400 dias (segue com o advogado, RN-524).
