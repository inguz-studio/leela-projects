---
tags: [leela, rn, delta, rodada, leva6, ckpix, ckendereco, e12]
trace: leela-redesign-v2-20260810
lane: REGISTRO-BOARDS
data: 2026-08-11
---

# 04-rns-delta · o pós-pagamento reage sozinho, e o endereço ganha razão (leva 6)

> **Delta apenas.** O texto canônico das duas regras mora no épico dono,
> [[LEELA-E12-landing]], seção "Delta o pós-pagamento reage sozinho, e o endereço ganha
> razão". Repetir o enunciado aqui criaria uma segunda definição, que é o defeito que o
> [[indice-de-regras-de-negocio]] existe para evitar. As palavras do dono estão em
> `03-leva6-tarde.md`, blocos CKPIX-1 e CKENDERECO-1.

## Faixa consumida

**RN-560 e RN-561.** O índice anunciava a 560 como a próxima livre, e a conferência foi refeita
imediatamente antes do commit por grep de `RN-560` a `RN-563` sobre o corpus inteiro fora do
índice: **zero definições**. As quatro ocorrências que o grep devolve são prosa de rodadas
anteriores descrevendo as próprias varreduras (SPEC-ADMIN-VISAO, SPEC-ADMIN-USUARIOS,
SPEC-ARENA-2-LISTA e o delta da SERV1-BUILD desta manhã). A próxima livre passa a ser a **562**.

| RN | Enunciado curto | Épico dono | Lane |
|---|---|---|---|
| **RN-560** | O desfecho do pagamento chega à tela sozinho, nos quatro ramos: PIX confirmado e PIX vencido levam à área do cliente logada, cartão recusado volta ao checkout pedindo revisão dos dados, cartão aceito mostra sucesso e leva junto. **Revoga a RN-470.** | [[LEELA-E12-landing]] (dona) | REGISTRO-BOARDS · build em CKPIX-FLOW |
| **RN-561** | O endereço completo continua obrigatório no checkout, agora por razão declarada — segurança e cadastro dos usuários — e a razão fica legível no passo de dados. | [[LEELA-E12-landing]] (dona) | REGISTRO-BOARDS |

## A revogação, marcada e não apagada

A **RN-470** dizia, com todas as letras, que a v1 do pós-pagamento seria barata: sem polling e sem
listener, com leitura no carregamento e num gesto explícito. Era escolha, não esquecimento — e o
painel a tratou como escolha, pedindo decisão do dono em vez de conserto da esteira. Ele revogou.

O enunciado dela **fica legível e marcado** no épico dono, pela mesma disciplina que a RN-211 e a
RN-416 seguiram: enquanto a lane CKPIX-FLOW não subir, é a RN-470 que explica por que a tela em
produção se comporta como se comporta.

## O que as regras NÃO fazem

- **Não escolhem o mecanismo.** O dono decidiu o comportamento nos quatro ramos. Se a observação do
  pedido vira listener, polling curto com a aba visível ou outra coisa é decisão de engenharia, e
  sai decidida com registro dentro da lane CKPIX-FLOW.
- **Não movem a RN-440 nem a RN-421.** Nada aqui cria pedido, inscrito ou cobrança em ponto novo, e
  a tela continua sendo aviso, nunca garantia de emissão.
- **Não tocam campo nenhum do checkout.** A RN-561 não acrescenta, não remove e não afrouxa
  validação: `validacao.ts:109-125` fica como está. O que nasce é uma linha de texto que diz por quê.

## Histórias

**S1246 · o pós-pagamento reage sozinho** — nova, três tarefas, ainda não construída. Detalhe no
épico. A lane de build é a **CKPIX-FLOW**.

## O adendo do SERV-3, que não consome número

A decisão do **SERV-3** na mesma noite (*"é somente quando falar da taxa Leela, que chamaremos
'serviço' para referenciar o que é essa cobrança"*) **não cria regra**: ela dá alcance à RN-495, que
já existe. "Serviço" nomeia exatamente a cobrança da Leela em toda superfície onde ela aparece, e a
recomendação de manter "Serviço da plataforma" no super-admin cai. As 34 strings do renome
destravam, com o aviso de re-inventariar antes de trocar — o inventário é de 09/08 e mira caminhos
que o rename de Parcerias mudou. Registro no épico, na mesma seção do delta.
