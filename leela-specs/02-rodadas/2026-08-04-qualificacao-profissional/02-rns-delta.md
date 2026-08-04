---
tags: [leela, rns, delta, rodada, onboarding, lgpd, identidade]
trace: leela-build-2d6ee98d
lote: SPEC-QUALIFICACAO
data: 2026-08-04
---

# 02-rns · Delta de regras da rodada

> Só o delta. A regra canônica mora no épico dono, e cada linha abaixo aponta para ele. Par da
> convenção de boards: RN nova consolida no épico **na mesma aterrissagem**, nunca fica só aqui.

## A faixa consumida, com a varredura que a justifica

Varredura executada em `leela-specs/` antes de escolher os números:

- **RN-449 a RN-453** foram tomadas pela lane SPEC-ADMINSEP, nesta mesma madrugada.
- **RN-454 a RN-459** foram tomadas pela lane de juros e margem, também hoje
  (`02-rodadas/2026-08-04-juros-margem/02-rns-delta.md:25`).
- **RN-460** é um dos seis números que existem só para reservar faixa e nunca receberam
  enunciado (`03-canon/indice-de-regras-de-negocio.md:71`). Fica de fora de propósito, como a
  lane anterior também deixou.
- **RN-461 em diante:** zero ocorrências no repositório fora de `node_modules`.

**Esta lane consome RN-461 a RN-468.**

## As oito regras novas

| RN | Enunciado | Épico dono |
|---|---|---|
| **RN-461** | **Conta profissional é promoção de conta existente, nunca cadastro do zero.** Só vira profissional quem já tem conta na Leela. O `/cadastrar` deixa de criar "conta de organizador" e passa a criar conta na Leela: nome, e-mail, senha, termo, mais os provedores sociais. Telefone e nome da organização saem da porta e migram para a promoção, e a organização passa a ser opcional. O resgate do convite continua lendo `organizacao` do doc `profissionais/{uid}`, com a cadeia de fallback que já tem, então a semente do slug do tenant não quebra. | [[LEELA-E00-fundacao-tecnica]] |
| **RN-462** | **A qualificação É a promoção, e não um passo depois dela.** Uma tela só transforma a conta em profissional e colhe atuação, modalidades, porte, contato e tipo de pessoa. Atuação é acumulável: bem-estar e organização de eventos convivem, e pelo menos uma é obrigatória. Modalidade sai de lista fechada (`MODALIDADES_CLUBE`) com "Outra" abrindo campo de sugestão que **não** é modalidade. Porte é faixa sobre o **maior evento já feito**. Ao fim, o doc nasce em `aguardando_convite` e a pessoa cai no overlay bloqueante: a qualificação **não substitui o convite**. | [[LEELA-E16-plataforma-superadmin]] |
| **RN-463** | **Credencial, conta e pessoa são três camadas, e uma pessoa nunca fica com duas contas.** Credencial é plural (senha, Google, Apple); conta é o uid; pessoa é `pessoas/{documento_hmac}`. Quando uma conta autenticada informa um documento cuja pessoa já pertence a outro uid, o produto **não funde automaticamente** e **não recusa em silêncio**: oferece entrar pela credencial que detém a outra conta e vincular a nova credencial ali. A resposta é **uniforme** e passa por rate limit, porque documento é adivinhável e a mensagem viraria oráculo. O anti-hijack da RN-174 não é afrouxado; o que nasce é o caminho de vinculação que ele pressupõe. | [[LEELA-E00-fundacao-tecnica]] |
| **RN-464** | **O documento é pedido uma vez, no primeiro momento em que ele trabalha, e nunca antes.** Não existe ponto único que sirva a todos os caminhos, porque login social não devolve documento. Então: quem compra informa no checkout, que já pede; quem vira profissional sem ter comprado informa **na promoção**, em campo condicional que só aparece quando a conta ainda não tem pessoa vinculada; quem só navega nunca informa. O cadastro de recebimento **para de pedir** e passa a pré-preencher a partir do registro de pessoa. | [[LEELA-E12-landing]] |
| **RN-465** | **CPF identifica a pessoa, CNPJ identifica a entidade, e os dois nunca são o mesmo campo.** O CPF vive em `pessoas/{id}`, Function-only. O número do CNPJ vive em `profissionais/{uid}/documentoSecret/current`, com leitura só do dono do uid; no doc pai fica apenas `documentoMascarado` e o enum `tipoPessoa`. Documento **nunca** é campo do doc que o tenant lê, porque Rules não filtram campo e `profissionais/{profId}` é legível por todo membro do tenant. Nada disso é cifrado: cifra existe para instrumento de movimentação, e documento não move dinheiro sozinho. | [[LEELA-E09-financeiro-profissional]] |
| **RN-466** | **Dois termos, duas finalidades, dois carimbos, e a base legal partida.** O termo da conta cobre criar e gerir a conta na Leela. O termo do profissional, constante e versão próprias, cobre avaliar e liberar o acesso profissional, e é carimbado em `profissionais/{uid}.consentimentoProfissional` com versão, finalidade e instante do **servidor**, no molde da RN-446. Qualificar para **decidir o acesso** é procedimento preliminar de contrato (art. 7º, V) e por isso pode ser obrigatório sem consentimento. Usar a qualificação para **recomendar, segmentar e exibir em vitrine** é finalidade distinta, depende de consentimento próprio, nasce desmarcado e **recusar não bloqueia o acesso**. | [[LEELA-E00-fundacao-tecnica]] |
| **RN-467** | **Versão de termo que estreita não obriga recoleta; versão que alarga, obriga.** Quem consentiu com a finalidade mais ampla já cobriu a mais restrita. Alargar exige recoletar, e quem não recoletou **não é tratado sob a finalidade nova**. Fecha a lacuna que a RN-412 abriu ao criar a constante `TERMO_LGPD_VERSAO` sem dizer quando o aumento dela custa alguma coisa. | [[LEELA-E00-fundacao-tecnica]] |
| **RN-468** | **A superfície do profissional chama-se Painel Profissional, e o rebatismo é de rótulo.** Rótulo visível troca; identificador técnico não (diretório, pacote, site de Hosting, variáveis de ambiente e as ~920 ocorrências de `organizador` como identificador ficam). "Organizador" continua correto como **papel** de quem produz eventos, e deixa de ser o nome do lugar. `profissionais/{uid}` é o nome canônico, o que já era verdade no modelo. O handle público `profissional` entra na lista de reservados junto de `organizador`. | [[LEELA-E01-design-system]] |

## Duas RNs existentes ganham delta, e nenhuma é revogada

### RN-177 · a derivação da chave por tipo, que ficou em aberto de propósito

A RN-177 já cravou que o registry passa a chavear por documento tipado e que "CPF único"
generaliza para "documento único" (`LEELA-E19-crm.md:38`). O que ela deixou para a
especificação é **como** derivar. Fica definido:

| Tipo | Domínio assinado no HMAC | Prefixo do docId |
|---|---|---|
| CPF | `pessoa:cpf:{11 dígitos}` | `cpf_` |
| Passaporte | `pessoa:passaporte:{ISO-3166-1 alpha-2}:{número normalizado}` | `pass_` |

Normalização do passaporte: maiúsculas, só alfanuméricos, descartando espaço, hífen e ponto.

**Nenhuma migração é necessária, e isso é medido.** A derivação de hoje já assina
`pessoa:cpf:{cpf}` (`functions/src/checkout/pessoaRegistry.ts:64`), com o tipo dentro do
domínio. Os ids existentes continuam idênticos, e o espaço do passaporte é disjunto por
construção. A frase "migração `cpf-unico` → `documento-unico`" da S1903 descreve, na prática,
uma extensão aditiva sem reescrita de dado.

**O que a RN-177 não cobria e passa a cobrir:** passaporte não tem dígito verificador, então
erro de digitação vira pessoa nova. O tratamento é país emissor obrigatório de lista fechada,
confirmação dupla do número no formulário, e **tolerância a duplicata com fusão administrativa
posterior**, nunca bloqueio na entrada. A plataforma garante unicidade de documento informado,
**não** de ser humano, e essa limitação é do dado, não do desenho.

### RN-176 · refino da leitura de UI, sem tocar a regra

A RN-176 diz que o checkout "pergunta a nacionalidade". A regra permanece integral:
estrangeiro usa passaporte, o CPF fica oculto, o pagamento é cartão internacional à vista.

O que se refina é **como se chega lá**. Em vez de uma pergunta de nacionalidade na frente de
todo mundo, o campo de documento nasce CPF com uma saída discreta, "não tenho CPF", que troca o
campo por passaporte mais país mais confirmação. Motivo: nacionalidade é a pergunta errada,
porque brasileiro naturalizado e estrangeiro residente têm CPF; o que o sistema precisa saber é
qual documento a pessoa tem. E o link só existe quando o toggle da RN-175 está ligado naquele
evento, então com o default desligado a tela é a de hoje.

É premissa vetável, e não decisão tomada, porque a RN-176 carrega verbatim do dono.

## RNs reafirmadas, para não parecerem esquecidas

| RN | Estado |
|---|---|
| **RN-173** | Intacta. Continua sendo o caso `cpf` do documento único, e o paliativo do estrangeiro não a toca |
| **RN-174** | Intacta e reforçada. O first-claim anti-hijack não é afrouxado pela RN-463 |
| **RN-175** | Intacta. O toggle por evento segue sendo o portão do caminho de estrangeiro, e segue desligado por default |
| **RN-411** | Intacta. Cadastro aberto, acesso travado. Muda o que o cadastro cria, não o que o trava |
| **RN-412** | Estendida pela RN-466 e pela RN-467, não substituída. O carimbo versionado continua sendo o mecanismo |
| **RN-417** | Reafirmada por analogia: é dela que vem a disciplina de não pôr dado sensível em doc de leitura ampla |
| **RN-446** | Intacta, e é o molde do carimbo do termo do profissional |
| **RN-449 / RN-450** | Intactas. Cliente e organizador na mesma conta é o caso desejado; administração de plataforma é que fica fora |
| **RN-451** | Encosta: o botão "criar conta de organizador" da área do cliente passa a ser o caminho canônico da promoção |

## Onde cada uma consolida

| RNs | Épico |
|---|---|
| RN-461, RN-463, RN-466, RN-467 | [[LEELA-E00-fundacao-tecnica]] |
| RN-462 | [[LEELA-E16-plataforma-superadmin]] |
| RN-464 + delta da RN-176 | [[LEELA-E12-landing]] |
| RN-465 | [[LEELA-E09-financeiro-profissional]] |
| RN-468 | [[LEELA-E01-design-system]] |
| Delta da RN-177 | [[LEELA-E19-crm]] |

## O que esta rodada NÃO decidiu

Escrito para que ninguém procure e conclua que foi esquecido.

- **O LGPD-1** continua aberto, sem default proposto. A qualificação cria o momento onde a
  recoleta caberia, e para aí.
- **O item 12b** continua adiado. Sem ele, a jornada de pagamento do estrangeiro não fecha.
- **Profissional estrangeiro** fica fora, e o bloqueio é o repasse, não a identidade.
- **Programa de indicação**, se for isso que "fluxo de referência" queria dizer, não foi
  especificado. Está no painel como QUALIF-4.
