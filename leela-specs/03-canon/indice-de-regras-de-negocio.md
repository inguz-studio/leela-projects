---
tags: [leela, rn, regras-de-negocio, indice, canon, validacao-externa]
atualizado: 2026-08-05
---

# Leela · índice das regras de negócio

As regras de negócio da Leela são numeradas `RN-###` e citadas mais de cinco mil vezes ao longo da documentação. Existem 256 regras realmente definidas. Não havia, até aqui, nenhum lugar que dissesse onde cada uma mora, e cada rodada de trabalho redescobria isso na base do grep.

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
| 820-823 | [[LEELA-E11-analytics]] |

As faixas 178-189, 385-392 e 425-445 atravessam mais de um épico porque nasceram em rodadas que tocaram várias frentes no mesmo dia. Para essas, o caminho curto é o arquivo de delta da rodada, que aponta para o épico de cada uma.

## Conflitos conhecidos

Três números carregam hoje mais de uma definição, com substância diferente. Nenhum deles foi resolvido por esta lane, porque decidir qual vale é decisão de produto e não de documentação.

**RN-133**, o limite de comunicados por push, é o mais grave porque 68 citações dependem dele. O [[LEELA-E05-clubs]] define quatro por semana **por clube**. O [[LEELA-E06-marketing]] define quatro por semana **por evento**. O [[LEELA-E13-app-atleta]] repete a leitura por clube. Por evento e por clube são limites diferentes, e a Function que valida implementa um deles.

**RN-312**, os tipos de afiliado, tem duas contagens. O [[LEELA-E04-config-vendas]] e o [[LEELA-E08-influenciador]] dizem que clube e promotor individual são os **dois** tipos. O [[LEELA-E06-marketing]] lista **quatro**, somando influenciador e loja ou marca, e o modelo de dados dele já reflete os quatro.

**RN-104**, sobre clube pago, começou como promessa de produto com interface presente e lógica adiada, e foi redefinida no [[LEELA-E16-plataforma-superadmin]] como um campo de modelo de entrada. É deriva, não reformulação.

Há ainda uma **substituição deliberada** que não deve ser confundida com conflito: a RN-448 foi superada pelas RN-449 e RN-450, e a decisão está registrada na rodada de 02/08. As definições originais da RN-448 continuam legíveis nos épicos, sem marca de que já não valem.

## Armadilhas de busca

Sete tokens que parecem RN não são: `RN-4`, `RN-17`, `RN-18`, `RN-19`, `RN-42`, `RN-43` e `RN-44`. Eles são fragmentos de expressões regulares que alguém escreveu em prosa ao explicar como encontrou a faixa livre, e o grep seguinte os capturou como se fossem regras. Ignore.

Seis números existem apenas para reservar faixa e nunca receberam enunciado: RN-381, RN-383, RN-384, RN-460, RN-499 e RN-819.

Três números nunca nasceram e o buraco é deliberado: **RN-483, RN-484 e RN-485**. Em 05/08 duas lanes trabalharam ao mesmo tempo em `leela-specs/`, a faixa 476-485 foi reservada à SPEC-CONTAS-LANDING para evitar colisão, e ela consumiu só até a 482. A SPEC-METRICAS-SERVICO começou na 486 porque a reserva ainda estava de pé. Não são regras perdidas: são o preço de duas lanes no mesmo território.

Duas regras são citadas e nunca definidas. A RN-005 aparece uma vez, no template de spec. A RN-333 é citada 56 vezes, o que a coloca entre as mais referenciadas do projeto, e não tem linha de definição em lugar nenhum: existe só em prosa.

## Como escolher o próximo número

A faixa mais alta em uso hoje é a 496, depois de a SPEC-METRICAS-SERVICO consumir 486 a 496 em 05/08 (o inscrito pagante, a conversão sem denominador e o piso do Serviço), deixando 483 a 485 vagas de propósito pela reserva descrita nas armadilhas de busca. Antes dela, a rodada de 04/08 consumiu 454 a 459 na lane de juros e margem, 461 a 468 na SPEC-QUALIFICACAO, 469 a 472 na SPEC-POSPAG (pós-pagamento em tela e Arena Social), a 473 na SPEC-PDF e as 474 e 475 na SPEC-CODPEDIDO, as duas últimas já em 05/08 (o PDF do ingresso como download e o código curto da compra); e a SPEC-CONTAS-LANDING consumiu 476 a 482 no mesmo 05/08 (o código de seis dígitos, a criação de conta na landing e as duas portas do modal). O 460 continua sendo marcador de faixa sem enunciado e ficou de fora de propósito em todas: ressuscitá-lo quebraria a leitura de quem confia nesta lista. Antes de criar uma regra, vale conferir a faixa livre com uma busca sobre o corpus inteiro, e vale **não** deixar o comando da busca escrito na prosa do documento, que é como os sete tokens fantasma nasceram.

## Vizinhos

[[onboarding-externo]] para a ordem de leitura. [[CONVENCAO-BOARDS]] para a convenção de rodada e de board. [[modelo-de-dados-firestore]] para as coleções que as regras governam.
