---
tags: [leela, rn, regras-de-negocio, indice, canon, validacao-externa]
atualizado: 2026-08-09
---

# Leela · índice das regras de negócio

As regras de negócio da Leela são numeradas `RN-###` e citadas mais de cinco mil vezes ao longo da documentação. Uma varredura de 10/08 sobre os três formatos de definição acha **273 números com linha de definição**. O número é aproximado de propósito: três formatos convivem, o terceiro admite anotação entre o número e o separador, e contar isso com uma expressão regular sempre erra para menos. Quem acrescenta faixa refaz a conta na mesma aterrissagem, ou o número volta a envelhecer sozinho — foi o que aconteceu com o 271 que ficou aqui enquanto treze regras nasciam em 09/08. Não havia, até aqui, nenhum lugar que dissesse onde cada uma mora, e cada rodada de trabalho redescobria isso na base do grep.

Este índice é mapa, não cópia. **O texto canônico de uma regra vive no épico dono dela**, e é lá que ele deve ser lido e alterado. Repetir o enunciado aqui criaria uma segunda definição, que é exatamente o problema que este arquivo existe para evitar.

## A regra sobre as regras

A convenção do projeto, escrita em [[CONVENCAO-BOARDS]], diz que regra nova consolida no épico na mesma aterrissagem: o épico é o dono, e a pasta da rodada guarda apenas o delta daquele dia, apontando para o épico. Quem for procurar o enunciado vigente de uma regra deve ir ao épico. Quem for entender por que ela mudou deve ir à rodada.

Dentro do épico, duas seções falam de RN e elas não significam a mesma coisa. A seção "Regras de negócio novas" contém o que aquele épico **define**. A seção "Regras de negócio aplicáveis" mistura o que ele define com o que ele apenas **herda** de outro épico, sem distinguir. Essa ambiguidade é conhecida e não foi resolvida por esta lane.

## Três formatos, e por que isso importa

O jeito de escrever uma definição mudou duas vezes ao longo do projeto. Quem for extrair as regras com uma expressão regular só vai perder cerca de um quinto do corpus.

| Formato | Onde aparece | Período |
|---|---|---|
| `- **RN-123** — enunciado` | itens de lista nos épicos | desde o início |
| `\| **RN-123** \| enunciado \|` | linhas de tabela nos arquivos de delta | 18/07 a 29/07 |
| `## RN-123 · enunciado` | uma seção por regra | de 29/07 em diante |

O terceiro formato cobre sozinho a faixa RN-425 a RN-453, que é a mais nova e a mais movimentada.

**A armadilha do terceiro formato**, medida em 10/08: ele admite anotação entre o número e o separador — `### RN-452 (nova, dona) · enunciado`, `### RN-531 (nova, dona · 2026-08-09) · …`. Trinta e nove definições estão escritas assim. Uma busca por `RN-\d{3} ·` perde as trinta e nove sem reclamar, o que é pior do que perder um quinto do corpus por formato desconhecido: aqui o formato é o certo e o padrão é que está apertado demais. Quem for varrer deixa o espaço entre o número e o separador aberto.

## Onde mora cada faixa

| Faixa | Épico dono |
|---|---|
| 002, 130-137 | [[LEELA-E06-marketing]] |
| 100-125, 140-144 | [[LEELA-E05-clubs]] |
| 145-158 | [[LEELA-E12-landing]] |
| 160-169 | [[LEELA-E17-perfil-social]] |
| 170-177 | [[LEELA-E19-crm]] |
| 178-189 | E04, E05, E09 e E12, pelos deltas de 19/07 |
| 200-236 | [[LEELA-E03-operacao-evento]] |
| 300-312 | [[LEELA-E04-config-vendas]] |
| 313-319 | [[LEELA-E08-influenciador]] |
| 330-358, 366-380 | [[LEELA-E09-financeiro-profissional]] |
| 360-365 | [[LEELA-E18-assessorias-parceiras]] |
| 385-392 | E04, E08 e E10, pelos deltas de 28/07 |
| 393-417 | [[LEELA-E16-plataforma-superadmin]] |
| 418-424 | [[LEELA-E12-landing]] |
| 425-445 | E03, E04, E08, E09, E12 e E17, pelas rodadas de 29/07 e 02/08 |
| 446-453 | [[LEELA-E00-fundacao-tecnica]], [[LEELA-E12-landing]] e [[LEELA-E16-plataforma-superadmin]] |
| 454-459 | E04, E09, E12 e E16, pela rodada de 04/08 (economia do parcelamento) |
| 461-468 | E00, E01, E09, E12 e E16, pela rodada de 04/08 (qualificação profissional) |
| 469-472 | [[LEELA-E12-landing]], pela rodada de 04/08 (pós-pagamento em tela e Arena Social) |
| 473 | [[LEELA-E12-landing]], pela mesma rodada em 05/08 (PDF do ingresso como download) |
| 474-475 | [[LEELA-E12-landing]], pela mesma rodada em 05/08 (código curto da compra) |
| 476-480 | [[LEELA-E00-fundacao-tecnica]], pela rodada de 05/08 (o código de seis dígitos, a criação de conta e a fronteira entre tipos de conta) |
| 481-482 | [[LEELA-E12-landing]], pela mesma rodada de 05/08 (as duas portas do modal e o nono e-mail) |
| 486-496 | E03, E04, E09, E11 e E12, pela rodada de 05/08 (o inscrito pagante e o piso do Serviço) |
| 497-498 | [[LEELA-E04-config-vendas]], pela rodada de 05/08 (o que congela num lote vendido e o estouro de vaga) |
| 500-505 | [[LEELA-E04-config-vendas]], pela rodada de 05/08 (editar a lista de modalidades e o lote que dispensa o kit) |
| 506-509 | [[LEELA-E03-operacao-evento]], pela rodada de 05/08 (o kit não vende desconto — piso zero no preço, o rótulo `sem_kit` que fica, a etapa sem saída e o reparo dos dois kits de produção) |
| 520-529 | [[LEELA-E20-radar-comunidade]], pela rodada de 09/08 (o radar de WhatsApp) |
| 530-536 | [[LEELA-E20-radar-comunidade]], pela rodada de reparo de 09/08 (pós-review antagonista: hospedagem, categoria de não-cliente, nome do participante, vínculo manual, clube deletado, definição de engajamento e esquecimento) |
| 537-542 | [[LEELA-E16-plataforma-superadmin]], pela rodada SPEC-ADMIN-VISAO de 09/08 (visão master dos tenants) |
| 820-823 | [[LEELA-E11-analytics]] |

As faixas 178-189, 385-392 e 425-445 atravessam mais de um épico porque nasceram em rodadas que tocaram várias frentes no mesmo dia. Para essas, o caminho curto é o arquivo de delta da rodada, que aponta para o épico de cada uma.

## Conflitos conhecidos

Três números carregam hoje mais de uma definição, com substância diferente. Nenhum deles foi resolvido por esta lane, porque decidir qual vale é decisão de produto e não de documentação.

**RN-133**, o limite de comunicados por push, é o mais grave porque 68 citações dependem dele. O [[LEELA-E05-clubs]] define quatro por semana **por clube**. O [[LEELA-E06-marketing]] define quatro por semana **por evento**. O [[LEELA-E13-app-atleta]] repete a leitura por clube. Por evento e por clube são limites diferentes, e a Function que valida implementa um deles.

**RN-312**, os tipos de afiliado, tem duas contagens. O [[LEELA-E04-config-vendas]] e o [[LEELA-E08-influenciador]] dizem que clube e promotor individual são os **dois** tipos. O [[LEELA-E06-marketing]] lista **quatro**, somando influenciador e loja ou marca, e o modelo de dados dele já reflete os quatro.

**RN-104**, sobre clube pago, começou como promessa de produto com interface presente e lógica adiada, e foi redefinida no [[LEELA-E16-plataforma-superadmin]] como um campo de modelo de entrada. É deriva, não reformulação.

Há ainda **duas substituições deliberadas** que não devem ser confundidas com conflito.

A RN-448 foi superada pelas RN-449 e RN-450, e a decisão está registrada na rodada de 02/08. As definições originais da RN-448 continuam legíveis nos épicos, **sem marca** de que já não valem — e é este defeito que a substituição seguinte corrigiu de propósito.

A **RN-211** foi **revogada em 05/08 por decisão do dono** (D-0805-7 · lane SPEC-SEM-KIT) e substituída pela **RN-506**. Ela dizia que *"Sem kit" é kit válido e aceita preço negativo (desconto)*; a primeira metade sobrevive dentro da RN-506, e o preço abaixo de zero morre. **O enunciado não foi apagado**: ficou legível e **marcado** no épico dono ([[LEELA-E03-operacao-evento]]) e nas três cópias herdadas ([[LEELA-E09-financeiro-profissional]], [[LEELA-E12-landing]], [[LEELA-E13-app-atleta]]), porque `kitEhDesconto` e o ramo negativo de `labelDeltaKit` seguem no código enquanto existir documento legado. As citações em `05-discovery/` não foram tocadas: benchmark é registro do que se sabia na data.

A **RN-416** foi **superada em 06/08 por ordem do dono** (D-ONB-6 · lane ONBOARD-VITRINE) e sucedida pela **RN-510**. Ela desenhava a conta sem convite como parede: overlay bloqueante e não-descartável, rota de destino não montada. Sobrevivem dela duas metades — `/conta` como rota da pessoa, e "o overlay é experiência, não segurança" —, e morre o desenho de parede, porque duas contas reais pararam nele em 06/08. **O enunciado não foi apagado**: ficou legível e **marcado** no delta da rodada ([[02-rns-delta]] de `2026-07-28-onboarding-organizador/`) e no épico dono ([[LEELA-E16-plataforma-superadmin]]), porque é ele que ainda explica por que a propriedade de dados existe — a RN-510 preserva a propriedade e troca só o mecanismo.

## Armadilhas de busca

Sete tokens que parecem RN não são: `RN-4`, `RN-17`, `RN-18`, `RN-19`, `RN-42`, `RN-43` e `RN-44`. Eles são fragmentos de expressões regulares que alguém escreveu em prosa ao explicar como encontrou a faixa livre, e o grep seguinte os capturou como se fossem regras. Ignore.

Seis números existem apenas para reservar faixa e nunca receberam enunciado: RN-381, RN-383, RN-384, RN-460, RN-499 e RN-819.

Há um sétimo buraco, e ele é da mesma família dos três de 05/08: o **RN-516** nunca nasceu. Em 08/08 três lanes escreveram no mesmo dia, a SPEC-PAINEL-CLIENTE tinha fechado na 514 na véspera, e a numeração seguiu 515, 517, 518, 519 sem que ninguém consumisse o 516. Não é regra perdida. **Buraco por lane concorrente e marcador de faixa sem enunciado são coisas diferentes**, e vale repetir aqui porque o E20 chegou a classificar o 516 junto com o 460 e o 499, que são marcadores: o 516 é da família do 483-485.

Três números nunca nasceram e o buraco é deliberado: **RN-483, RN-484 e RN-485**. Em 05/08 duas lanes trabalharam ao mesmo tempo em `leela-specs/`, a faixa 476-485 foi reservada à SPEC-CONTAS-LANDING para evitar colisão, e ela consumiu só até a 482. A SPEC-METRICAS-SERVICO começou na 486 porque a reserva ainda estava de pé. Não são regras perdidas: são o preço de duas lanes no mesmo território.

Duas regras são citadas e nunca definidas. A RN-005 aparece uma vez, no template de spec. A RN-333 é citada 56 vezes, o que a coloca entre as mais referenciadas do projeto, e não tem linha de definição em lugar nenhum: existe só em prosa.

## Como escolher o próximo número

A faixa mais alta em uso hoje é a **542**, consumida pela SPEC-ADMIN-VISAO em 09/08 (a visão master dos tenants no [[LEELA-E16-plataforma-superadmin]]), e a **próxima livre começa na 543**. A rodada de fechamento de gaps do radar, em 10/08, **não consumiu número nenhum**: ela fechou promessas com história, tarefa e critério de aceite, e não com regra nova, então a 543 segue livre. Fica registrado porque rodada que mexe num épico e não aparece nesta seção parece rodada que esqueceu de registrar, e a próxima lane perderia tempo conferindo. Aquela lane tinha reservado 530-535 numa varredura feita antes, e **renumerou para 537-542 durante a própria aterrissagem**, ao ver que a rodada de reparo do radar havia publicado 530-536 no intervalo entre a varredura e o commit. É o mesmo acidente do 483-485 e do 516, com um desfecho diferente: desta vez a colisão foi vista e desfeita antes do fecho, em vez de virar buraco. Vale ler isso como a prova de que conferir a faixa **no momento do commit**, e não só no começo da rodada, é o que separa os dois desfechos.

Antes dela, a faixa mais alta era a **536**, consumida pela rodada de reparo do radar no mesmo 09/08, depois da review antagonista da spec (trace `3ed45e7f`). Ela começou na 530, que era o que esta seção anunciava como livre, e a conferência foi feita antes de usar. São sete regras: a máquina que roda o motor é do organizador e trocar isso reabre a frente jurídica (530); agregado nominal de não-cliente é categoria própria, com a fronteira contra o CRM declarada e testada por adição, e as cinco bordas do gate de PII enumeradas em 10/08 (531); o nome do participante tem origem declarada, pode faltar e o admin corrige (532); o vínculo entre participante e cliente é ato do admin (533); clube fora do ar não apaga o radar nem o deixa inalcançável (534); engajamento é volume medido em dois eixos (535); e o esquecimento tem caminho pelo lado da nuvem, com janela parada expirando (536). Antes dela, a faixa mais alta era a **529**, consumida pela SPEC-RADAR no mesmo 09/08 (o radar da comunidade no WhatsApp: mudo por contrato e sem adjacência com envio, nome real do participante no ranking por decisão do dono, uma instância por organizador com a fronteira conferida nos dois lados, só agregado atravessando, retenção de 400 dias na nuvem e 90 no espelho local, nenhum aviso publicado no grupo, rollout só para convidados, zero índice novo, idempotência por livro-razão e sequência, e o chip dedicado que o organizador paga). Ela começou na **520** e não na 515, que era o que este documento anunciava: a 515 foi consumida pela rodada do rótulo da porta no [[LEELA-E12-landing]] em 08/08, e a 517, a 518 e a 519 saíram no mesmo dia pelas lanes de rolagem e tema no [[LEELA-E01-design-system]]. O **516** ficou sem dono e ficou de fora de propósito, e é buraco por lane concorrente, não marcador de faixa. Vale conferir a faixa livre antes de usar, porque foi exatamente a confiança nesta linha sem conferência que quase produziu uma colisão na 515. Antes dela, a faixa mais alta era a **514**, consumida pela SPEC-PAINEL-CLIENTE em 06/08 (o painel do cliente é a área amadurecida e mora na landing; a ponte para o profissional é promoção da conta que já existe, nunca um segundo cadastro; os dois painéis são dois destinos de uma conta só, com a travessia declarada; e quem chega pela ponte aterrissa na vitrine da RN-510). Antes dela, a faixa mais alta era a **510**, consumida sozinha pela ONBOARD-VITRINE no mesmo 06/08 (a conta sem código entra em vitrine e o aviso de boas-vindas sobe no primeiro gesto). Foi a rodada que **superou a RN-416**, e a substituição está marcada em vez de apagada, pela razão descrita em Conflitos conhecidos. Antes dela, a faixa mais alta era a **509**, depois de a SPEC-SEM-KIT consumir 506 a 509 em 05/08 (o kit não vende desconto: piso zero no preço com a fronteira na Rule, o rótulo `sem_kit` do enum que continua vivo, a etapa de kit que nunca teve saída, e o reparo dos dois kits negativos de produção). Foi a rodada que **revogou a RN-211**, e a revogação está marcada em vez de apagada, pela razão descrita em Conflitos conhecidos. Antes dela, a SPEC-MODALIDADE-KIT consumiu 500 a 505 no mesmo 05/08 (a lista de modalidades passa a ser editável, com renomeação atômica e remoção que nomeia quem impede; e o lote ganha o interruptor que dispensa o kit da modalidade). Ela **pulou a 499**, que é marcador de faixa sem enunciado, pela mesma disciplina que manteve o 460 fora das rodadas anteriores. Antes dela, a SEAL-LOTES consumiu 497 e 498 em 05/08 (o que congela num lote vendido, e o estouro de vaga que a tela escondia). Antes dela, a SPEC-METRICAS-SERVICO consumiu 486 a 496 no mesmo 05/08 (o inscrito pagante, a conversão sem denominador e o piso do Serviço), deixando 483 a 485 vagas de propósito pela reserva descrita nas armadilhas de busca. Antes disso, a rodada de 04/08 consumiu 454 a 459 na lane de juros e margem, 461 a 468 na SPEC-QUALIFICACAO, 469 a 472 na SPEC-POSPAG (pós-pagamento em tela e Arena Social), a 473 na SPEC-PDF e as 474 e 475 na SPEC-CODPEDIDO, as duas últimas já em 05/08 (o PDF do ingresso como download e o código curto da compra); e a SPEC-CONTAS-LANDING consumiu 476 a 482 no mesmo 05/08 (o código de seis dígitos, a criação de conta na landing e as duas portas do modal). O 460 continua sendo marcador de faixa sem enunciado e ficou de fora de propósito em todas: ressuscitá-lo quebraria a leitura de quem confia nesta lista. Antes de criar uma regra, vale conferir a faixa livre com uma busca sobre o corpus inteiro, e vale **não** deixar o comando da busca escrito na prosa do documento, que é como os sete tokens fantasma nasceram.

## Vizinhos

[[onboarding-externo]] para a ordem de leitura. [[CONVENCAO-BOARDS]] para a convenção de rodada e de board. [[modelo-de-dados-firestore]] para as coleções que as regras governam.
