---
tags: [leela, decisoes, produto]
aliases: ["Decisões em aberto", "O que falta o Vitor decidir"]
trace: leela-build-2d6ee98d
lote: DECISOES-DOC
atualizado: 2026-07-19
---

# Decisões em aberto, explicadas

Este arquivo existe para você decidir sem ter que reabrir report nenhum. Cada decisão vem com o porquê dela, o que muda se você disser sim, o que fica se você disser não ou adiar, a recomendação da engenharia defendida pelo job que ela serve, e o que ela destrava ou trava no roadmap. Onde a decisão é técnica, o porquê está em português comum.

Nada aqui bloqueia código hoje. Tudo roda com um default defensável em vigor. Ratificar é confirmar o default; mudar é eu ajustar no próximo lote. As duas exceções que bloqueiam código estão marcadas na tabela.

O painel curto de status continua sendo o [[DECISOES-ABERTAS]]. Este arquivo é a versão longa e argumentada.

## Índice

| # | Decisão | Área | Recomendação | Urgência real |
|---|---|---|---|---|
| 1 | Quantidade por card de atleta ou por stepper | Checkout | Manter card por atleta | Baixa (registro) |
| 2 | Onde vive o campo de cupom | Checkout | Manter no resumo, auto-aplicar | Baixa |
| 3 | Toggle Pix ou cartão no pagamento | Checkout | Aprovar o toggle | Média (alimenta build) |
| 4 | QR do Pix na tela do pedido pendente | Checkout | Reexpor QR no pedido | Média |
| 5 | Upload de atestado no checkout agora | Checkout | Bloquear venda com flag | Média a alta |
| 6 | Coletar gênero junto do nascimento | Checkout | Coletar, um campo só | Baixa |
| 7 | Split automático do Asaas ou repasse manual | Dinheiro | Manter manual na v1 | Média |
| 8 | Pré-compra do clube influenciador | Dinheiro | Validar com organizador antes | Baixa (não decide agora) |
| 9 | Ratificar o Firebase Storage (ADR-016) | Técnica | Ratificar o provedor | Baixa |
| 10 | Ratificar os primitivos Radix-free (ADR-017) | Técnica | Ratificar a decisão | Baixa |
| 11 | Reagendar campanha vencida | Miudeza | Deixar terminal por ora | Baixa |
| 12 | Repasse parcial de comissão | Miudeza | Adiar para follow-up | Baixa |
| 13 | Última atividade no CRM | Miudeza | Adiar, não vale o lote | Baixa |

> Duas decisões bloqueiam código quando você mexer nelas: a **7** (split automático move dinheiro de verdade, exige rota Fable + review antagonista) e o lado "retroativo" da **8**. As outras onze você ratifica ou muda sem travar nada.

---

## ✅ Resolvido na rodada DEC-0719 (Vitor, 2026-07-19)

Oito das treze decisões deste documento foram fechadas. O verbatim integral está em `02-rodadas/2026-07-19-decisoes/01-decisoes.md`; o painel curto em [[DECISOES-ABERTAS]].

- **1 (cards por atleta) = mantém os cards** + botão "+ adicionar atleta". Tela 2 do wireframe 112-4622 superseded.
- **2 (campo de cupom) = leva o campo pro INÍCIO do fluxo** (paridade com a referência), em vez de só confiar no auto-apply.
- **3 (Pix/cartão no pagamento) = SIM, mas como BOTÕES, sem toggle.** Verbatim: *"pix e cartao na etapa de pagamento, mas em botões, sem toggle."*
- **4 (QR do Pix no pedido pendente) = SIM** + timer de validade de 30 min + copia-e-cola que copia sozinho e dispara toast (**RN-157**). O timer é a validade da própria cobrança PIX (`expiresIn`), não só um relógio de tela.
- **5 (saúde no checkout) = OBRIGATÓRIA.** Termo de saúde BASE da plataforma sempre presente; a flag do organizador passa a ADICIONAR o termo custom dele (**RN-156**).
- **6 (gênero) = coletar** com opção "não informado", pré-preenchendo sozinho para quem já comprou (**RN-154**, via CPF único **RN-173**).
- **7 (split vs manual) = manter o repasse MANUAL na v1; split (fase 3) NÃO abre.** O racional estratégico está detalhado na seção Dinheiro abaixo (antecipação como margem).
- **9 (Firebase Storage, ADR-016) = RATIFICADO.** Status da ADR: aceita.

Continuam abertas: **8** (pré-compra do clube — validar com organizador antes), **10** (ADR-017 modal Radix-free), **11**, **12**, **13** (miudezas com default seguro).

Duas RNs de identidade/conta entraram junto: **RN-173** (CPF único global no sistema — colisão no checkout linka a mesma pessoa, não duplica) e **RN-155** (conta criada sem fricção na 1ª compra + link de senha por e-mail, dependente do EmailProvider).

---

## Checkout

O job que manda aqui é o do atleta: *descubro o evento, quero me inscrever* (doc `jobs-to-be-done.md §04.1`, dimensão transacional H1). Por isso, nas decisões abaixo, o que ameaça **fechar a compra** e a **confiança no preço** pesa mais do que o que é só pixel. As seis decisões saem da revisão de usabilidade do fluxo (mind Don Norman) em [[CHECKOUT-UX-REPORT]].

### 1. Quantidade por card de atleta ou por stepper

**Por que essa decisão existe.** O wireframe de referência (112-4622, tela 2) escolhe modalidade com um stepper de mais e menos, uma quantidade agregada. O produto foi por outro caminho: um card por atleta. Isso é uma divergência visível entre o desenho e o que está no ar, então vale registrar qual dos dois vence.

**Se você disser sim ao card por atleta (o que já está no ar).** Nada muda no código. O modelo exige um titular por inscrito, com CPF individual (ADR-011), que é o que os cards entregam. A supersessão da tela 2 do wireframe fica registrada e a conversa morre.

**Se você disser não e quiser o stepper.** A quantidade agregada não sabe de quem é cada inscrição, então o CPF por atleta teria que ser coletado depois, num segundo momento. Isso quebra o modelo `pedidos` do ADR-011 e adiciona uma etapa. Custo alto para voltar a um desenho que serve menos ao job.

**Nossa recomendação, defendida.** Manter o card por atleta. O job do atleta pede o dado do titular por inscrito desde o começo (é o que permite ingresso nominal e categoria de prova, ADR-011). O card entrega isso; o stepper adia. Se você quiser a sensação de rapidez do stepper sem perder o dado, dá para ter um atalho "adicionar 2 atletas" que cria N cards de uma vez (D-2 do report).

**O que destrava.** Fecha a leitura do wireframe versus produto no checkout. Não bloqueia nem libera lote nenhum.

*Como decidir: responda "mantém os cards" (recomendado) ou "quero o stepper".*

### 2. Onde vive o campo de cupom

**Por que essa decisão existe.** O wireframe põe o campo de código logo na escolha de modalidade, no início do fluxo. O produto põe no resumo, quase no fim. Quem chega por um link de parceria com `?cupom=` na URL passa duas etapas sem ver sinal do desconto.

**Se você disser sim e mover o campo para o começo (step 0).** Paridade com o wireframe. O comprador vê o campo de cupom cedo. Custo é duplicar ou mover o input, mudança pequena de UI.

**Se você disser não e mantiver no resumo.** O campo fica onde está. A urgência disso já caiu muito, porque o fix do cupom vindo da URL (A-2 do report) auto-aplica o desconto na primeira cotação e mostra um chip "cupom X será aplicado" desde o step 0. Ou seja, o benefício fica visível cedo mesmo com o input só no resumo.

**Nossa recomendação, defendida.** Manter o input no resumo e confiar no auto-apply. O job de quem veio por link de desconto é *ver que meu desconto está valendo*, não *achar o campo de cupom*. O auto-apply resolve o job sem mover nada. Só mova o campo para o step 0 se você quiser paridade visual com a referência por outro motivo.

**O que destrava.** Fecha a divergência D-4. O auto-apply em si (A-2) é fix de checkout, entra no lote de build independente desta decisão.

*Como decidir: responda "deixa no resumo com auto-apply" (recomendado) ou "leva o campo pro início".*

### 3. Toggle Pix ou cartão no passo de pagamento

**Por que essa decisão existe.** Hoje a forma de pagamento (Pix ou cartão) é escolhida no resumo, uma etapa antes de pagar. No passo de pagamento não dá para trocar. Quem decidiu cartão e na hora prefere Pix, ou teve o cartão recusado, precisa voltar, trocar e avançar de novo. Decidir a forma na hora de pagar é o comportamento comum (limite do cartão, saldo, app do banco já aberto). Esse fluxo (forma no resumo) foi ratificado no R13, então mudar é uma decisão sua, não um bug.

**Se você disser sim ao toggle.** Um seletor Pix ou cartão aparece no topo do passo de pagamento. A escolha do resumo vira só o default. Trocar ali é seguro por construção: a troca de forma já invalida a cobrança automaticamente pelo efeito que existe no `CheckoutFlow`. É um controle a mais na tela onde a pessoa está, sem risco de preço no cliente (o servidor revalida tudo).

**Se você disser não.** O fluxo do R13 fica intacto. O custo é a fricção A-4: quem quer trocar de forma na hora paga com voltar e avançar, exatamente no momento mais sensível, o de pagar. É a hora onde desistência custa a venda inteira.

**Nossa recomendação, defendida.** Aprovar o toggle. O wireframe (telas 4 e 5) já mostra tabs Pix e cartão no próprio pagamento, então isso alinha produto e referência. Pelo job, o controle (a forma) tem que ficar perto do efeito (pagar); hoje eles estão em etapas diferentes. É mudança de fluxo, por isso é decisão, mas de baixo risco técnico.

**O que destrava.** Entra no lote de build do checkout (a camada UI pura da §5.4 do report). Faz par com o fix A-4.

*Como decidir: responda "aprova o toggle" (recomendado) ou "mantém a forma só no resumo".*

### 4. QR do Pix na tela do pedido pendente

**Por que essa decisão existe.** Além do QR na hora de pagar (fix A-3), o wireframe mantém o QR e o copia e cola do Pix na tela do **pedido**, enquanto ele está pendente. Hoje a tela de confirmação pendente não reexpõe o código Pix. Quem fechou sem pagar e volta depois não tem como retomar o pagamento por ali.

**Se você disser sim.** A tela do pedido pendente volta a mostrar o QR e o copia e cola enquanto o pagamento não confirma. O comprador retoma sem refazer o checkout. Isso anda junto com o link permanente do pedido (`/pedido/{id}`), que já é recomendação do report (M-7) para o comprador anônimo não perder o ingresso.

**Se você disser não ou adiar.** O caminho feliz não muda: quem paga na hora fecha normal. O custo é para o comprador que interrompe e volta, que hoje não tem superfície para retomar o Pix pendente.

**Nossa recomendação, defendida.** Reexpor o QR no pedido pendente, junto com o link permanente do pedido. O job é *não perder a inscrição que comecei*. Como a sessão é anônima e ainda não há e-mail transacional ligado (depende da chave do Brevo, decisão externa), a tela do pedido é hoje o único ponto de retomada. É escopo de pós-pagamento, decidido em conjunto com M-7.

**O que destrava.** Fecha a divergência D-6 e faz par com o link do pedido (M-7). Escopo de pós-pagamento no lote de checkout.

*Como decidir: responda "reexpõe o QR no pedido pendente" (recomendado) ou "deixa para depois".*

### 5. Upload de atestado no checkout agora ou depois

**Por que essa decisão existe.** O organizador já pode ligar, no painel, as flags de exigência de saúde do evento: atestado e PAR-Q (RN-146, story `S306`). O kernel dessas flags está pronto, o dado de saúde tem lugar isolado e seguro para viver (subcoleção `saude`, base legal própria, LGPD Art. 11, RN-147). O que falta é a **superfície de coleta no checkout**. Hoje, se o organizador liga a flag, a compra passa sem o documento. A declaração de aptidão (o "termo do atleta") já está entrando no lote de checkout em voo; esta decisão é só sobre o **upload de atestado** e o **questionário PAR-Q**.

**Se você disser sim e coletar já.** Quando a flag está ligada, o bloco de saúde no passo de pagamento expande: PAR-Q vira questionário no fluxo, atestado vira upload. Sem flag, fica só a declaração de aptidão. O dado sensível persiste isolado em `inscritos/{id}/saude`, nunca no doc do pedido. Custo: entra na camada de fiação de kernel do lote de checkout (o `saudeInscrito` e o expurgo LGPD já existem, falta só a tela).

**Se você disser não ou adiar.** Duas saídas. A conservadora: **bloquear a venda** quando a flag está ligada até a superfície existir, para nunca vender sem o documento que o organizador exigiu. A permissiva: coletar o atestado **depois**, na retirada do kit ou por e-mail. A permissiva deixa passar uma venda que, do ponto de vista do organizador, está incompleta.

**Nossa recomendação, defendida.** Coletar no checkout quando a flag está ligada, com bloqueio da venda como rede de segurança até a superfície entrar. O job do organizador é *não deixar entrar quem não pode correr* (é por isso que ele ligou a flag); vender sem o atestado fura esse job e cria risco jurídico. Nota honesta: eu não verifiquei se a Function hoje já barra a compra sem o documento (fora do território da revisão, ficou como suposição em D-7). Se ela não barra, o gap é real e a rede de segurança importa.

**O que destrava.** Fecha o loop das exigências de saúde entre painel (E04, story `S306`) e checkout. Entra na camada de fiação de kernel do lote de checkout.

*Como decidir: responda "coleta no checkout e bloqueia venda com flag ligada" (recomendado), ou "coleta depois na retirada", ou "adia a superfície".*

### 6. Coletar gênero junto do nascimento

**Por que essa decisão existe.** A coleta de novos campos no checkout (telefone, nascimento, endereço) já foi ratificada por você em 2026-07-18 e virou a spec da §5 do report. Sobrou uma ponta pequena: coletar **gênero** junto da data de nascimento, por atleta. Sem gênero, o recorte demográfico do organizador (RN-822) fica manco: dá para fatiar por idade, não por gênero.

**Se você disser sim.** Um campo a mais por atleta. O enum já existe no core (`GENEROS_INSCRITO`, com a opção `não informado`), então é baixo custo. Alimenta a demografia RN-822 e relatórios do organizador.

**Se você disser não.** O cohort demográfico nasce sem a dimensão de gênero. Nada quebra, mas o organizador tem menos recorte, e voltar a coletar depois exige repescar dado de quem já se inscreveu.

**Nossa recomendação, defendida.** Coletar. O custo é um campo com opção de "não informar" (respeita quem não quer declarar) e o ganho é a demografia completa para o job do organizador de *entender quem é meu público*. Como os outros campos novos já estão entrando no mesmo form, o gênero pega carona sem quebrar o ritmo vertical da tela (§5.1 do report).

**O que destrava.** Completa a demografia RN-822. Entra junto dos campos novos já ratificados, no mesmo lote de checkout.

*Como decidir: responda "coleta o gênero com opção de não informar" (recomendado) ou "deixa de fora".*

---

## Dinheiro

Estas duas mexem em dinheiro de verdade, então o padrão da casa vale: rota Fable e review antagonista antes de qualquer automação de repasse. Fontes: [[DECISOES-ABERTAS]] item 23, [[COMF2-REPORT]] e o épico [[LEELA-E08-influenciador]].

### 7. Split automático do Asaas ou repasse manual

**Por que essa decisão existe.** A comissão do afiliado já é calculada, congelada por conversão e acumulada com precisão de centavo (fase 2, entregue no lote COMISSIONAMENTO-F2). Falta decidir **como o dinheiro sai** para o afiliado. Hoje o default em vigor é o repasse manual: o organizador paga o afiliado por fora (Pix, transferência) e registra o repasse no sistema (`registrarRepasseComissao`). A plataforma não move dinheiro nenhum, só mantém o saldo visível para os dois lados.

**Se você disser sim ao split automático (fase 3).** O Asaas divide o valor na hora do pagamento e a comissão vai direto para o afiliado, sem o organizador precisar pagar por fora. Isso elimina o risco F-3 do repasse manual, que é o organizador registrar um repasse que ele não fez de verdade (auto-declaração). Custo: é rotear dinheiro real, então exige a rota Fable, review antagonista obrigatório e a diretriz herdada do R9-E, `emailVerified === true` como pré-condição de qualquer rota automática de dinheiro para o `responsavelUid`. É abrir a fase 3 no épico E08.

**Se você disser não e manter o manual.** O modelo atual (fase 2) segue como está e é suficiente para a web-complete. O extrato visível ao afiliado é a mitigação do risco F-3: o afiliado vê quanto acumulou e quanto foi repassado, então uma auto-declaração falsa fica exposta. O custo é operacional para o organizador, que paga e registra na mão.

**Nossa recomendação, defendida.** Manter o repasse manual na v1 e só abrir o split quando isso virar dor real. O job do afiliado é *receber o que ganhei*, e o manual entrega isso com o saldo e o extrato transparentes (RN-318). O split é melhor, mas é dinheiro automático, a parte mais cara de errar. Fazer depois, com validação, é a ordem certa. A review antagonista da fase 2 aprovou o desenho e classificou o F-3 como risco de negócio aceito, não como furo técnico ([[COMF2-REPORT]]).

**O que destrava.** Ratificar o manual mantém a web-complete andando sem novo trabalho. Pedir o split abre a fase 3 no [[LEELA-E08-influenciador]], com rota Fable e review. Esta é uma das duas decisões que **bloqueiam código** quando você mexe (o lado do split).

**✅ Resolvido em 2026-07-19: manter o repasse MANUAL; split (fase 3) NÃO abre.** O racional que o Vitor deu vai além da simplicidade técnica, é estratégia de margem: **manter o controle dos repasses na plataforma serve para manejar ANTECIPAÇÕES**. A antecipação de recebíveis não é o padrão aos olhos do Asaas, mas a plataforma a oferece ao organizador como serviço, e **os juros dessa antecipação são markup nosso** — uma linha de receita que o split automático (dinheiro saindo direto na hora do pagamento) mataria. Por isso o desembolso fica manual e sob a plataforma por decisão de negócio, não só por cautela de engenharia. Quando/se o split entrar, é dinheiro real: rota Fable + review antagonista obrigatória.

**Reembolso (ponta ligada a dinheiro, ainda em confirmação).** A priori, o reembolso **NÃO devolve a taxa de serviço** ao comprador. Essa é uma decisão **condicionada ao benchmark** (a lane BENCHMARK-REEMBOLSO roda em paralelo; report em `outputs/leela-build-2d6ee98d/BENCHMARK-REEMBOLSO-REPORT.md`). Fica registrada como **pendente-de-confirmação**, não como RN fechada — só vira regra depois que o benchmark voltar.

*Decidido: repasse manual mantido. Split e política de reembolso da taxa seguem para quando virarem dor/benchmark real.*

### 8. Pré-compra do clube influenciador

**Por que essa decisão existe.** Você pediu para validar com um organizador real antes de codar (verbatim: *"quero validar isso depois com um organizador de eventos"*). A ideia é um modelo de compra coletiva: inscrições pelo link do clube entram em "pré-compra" e, ao atingir um mínimo X definido pelo organizador, dispara a cobrança de todas de uma vez. **Isto não é uma decisão para ratificar agora**, é uma hipótese de produto (HIP-R9-01) que precisa de campo antes de virar código.

**Se você disser sim e mandar implementar já.** Você estaria codando sobre quatro perguntas de dinheiro ainda sem resposta, e todas mudam o desenho: (a) a janela da pré-autorização do cartão, que expira em poucos dias e pode estourar antes de atingir X; (b) o que acontece com as pré-compras se X nunca é atingido; (c) o que fazer quando parte das cobranças recusa no disparo em lote e o total cai abaixo do mínimo de novo; (d) se a pré-compra reserva ou não a vaga enquanto espera. Codar antes de respondê-las é retrabalho quase garantido.

**Se você disser não agora (adiar para validar).** Fica o default conservador em vigor: RN-315, o link do clube só ativa o desconto ao cruzar o mínimo, sem cobrança em lote. Nenhuma vaga é segurada, nenhum cartão é pré-autorizado. O custo é não ter ainda o efeito de compra coletiva, que é justamente o que a validação vai dizer se vale.

**Nossa recomendação, defendida.** Não decidir agora. Levar as quatro perguntas para um organizador real, como você mesmo pediu, e só então virar RN e código. O job do organizador aqui é *usar o clube para encher o evento*, e o desenho certo desse mecanismo depende de como ele opera na prática (aceita salvar o cartão e cobrar no gatilho? topa reservar vaga?). Quando validar, é dinheiro, então rota Fable e review antagonista obrigatórios. A spec com a proposta e as quatro perguntas está em `§S-R9-11`, bloco hipótese.

**O que destrava.** Enquanto não valida, nada trava: RN-315 segura o comportamento. A versão retroativa do desconto (dar o desconto a quem já comprou ao atingir o mínimo) é a parte que **bloqueia código**, porque reabre reprocessamento de vendas já pagas.

*Como decidir: responda "adia até validar com organizador" (recomendado) ou traga as respostas das quatro perguntas quando tiver.*

---

## Técnicas

Duas ratificações de decisões que a engenharia já aplicou por default. Aqui o porquê técnico está em português comum. Você confirma o caminho ou pede para trocar (a troca é barata nos dois casos, porque as duas foram desenhadas para serem reversíveis).

### 9. Ratificar o Firebase Storage para upload de imagens (ADR-016)

**Por que essa decisão existe.** Até há pouco, toda imagem do sistema (foto de perfil, capa de clube, avatar e capa do perfil público) era uma URL que você colava, hospedada em outro lugar. Isso é ruim de usar. O upload de arquivo de verdade entrou, e escolher onde essas imagens ficam guardadas é uma decisão de segurança, porque conteúdo enviado por usuário aparece em página pública. O default aplicado é o Firebase Storage.

**Se você disser sim (ratificar).** Confirma o provedor. O Firebase Storage é o que já está no ar desde o R5. Em português comum, a razão técnica é: ele é da mesma família do resto do sistema (mesmo login, mesmo projeto, mesma conta), as regras de quem pode subir o quê são declaradas e negam por padrão, e dá para testar tudo localmente antes de subir. Foi o caminho com menos peças novas para o mesmo resultado.

**Se você disser não (trocar de provedor).** Dá para trocar por S3, Cloudflare R2 ou outro. O custo é adicionar um fornecedor novo, uma credencial nova e reescrever as regras de acesso fora do login que já existe. Como os documentos guardam só a URL final da imagem, a troca mexe num ponto único do código (o api-client) e não migra dado. Reversível, mas é trabalho sem ganho claro na v1.

**Nossa recomendação, defendida.** Ratificar o Firebase Storage. É a escolha com menos partes móveis, com as regras de segurança provadas por 33 testes de ataque no emulador (nenhum vetor de gravação cross-usuário, path traversal, SVG malicioso ou arquivo grande demais resistiu). Duas reviews antagonistas independentes aprovaram. Há limites honestos registrados na ADR (o tipo do arquivo é declarado pelo cliente, a varredura de bytes real fica como follow-up), mas são follow-ups, não bloqueios.

**O que destrava.** Ratificar confirma o upload que já opera nas superfícies de imagem. Nada novo é bloqueado ou liberado; a ratificação fecha um item aberto. Detalhe em [[ADR-016-firebase-storage-upload]].

*Como decidir: responda "ratifica o Firebase Storage" (recomendado) ou "quero avaliar outro provedor".*

### 10. Ratificar os primitivos Radix-free na superfície pública (ADR-017)

**Por que essa decisão existe.** A landing (a página pública do evento) e o painel do organizador são feitos de tecnologias diferentes. A biblioteca de componentes da casa foi construída em cima de uma dependência (Radix) que não roda bem na landing. Quando uma parte do time tentou usar o modal da biblioteca na landing, a página do evento quebrou com erro 500. Desde então a landing evita essa dependência e mantém cópias locais do que precisa. A decisão é ratificar o caminho que a engenharia escolheu para resolver isso de vez.

**Se você disser sim (ratificar).** Confirma a solução aplicada: a biblioteca passa a servir a landing por duas portas que não carregam a dependência problemática, uma para os componentes estáticos e outra para o modal. Em português comum, o ganho é duplo: a página pública fica mais leve (menos código para o navegador baixar, o que ajuda no SEO e na velocidade, que é diretriz sua), e o comportamento perigoso de um modal (prender o foco do teclado, fechar no Esc, travar o scroll) passa a ter uma implementação só, testada, em vez de cópias que podem divergir. A acessibilidade provada (10 de 10 testes) foi preservada sem mexer em nenhuma asserção.

**Se você disser não.** A alternativa era aceitar a dependência Radix na landing. Isso adicionaria de 12 a 16 KB de código na página pública para um modal que já existe sem ela, e reabriria o risco de quebra que causou o 500. Perde no critério de peso da página sem ganhar manutenção.

**Nossa recomendação, defendida.** Ratificar. Você delegou essa escolha à engenharia pedindo "desempenho em ambos os casos" (landing e painel), e é o que a decisão entrega: a landing fica leve agora, e há uma rota registrada para o painel também ficar mais leve depois. A garantia de que a landing não volta a puxar a dependência problemática é executável (um teste caminha o grafo de imports e falha se algo proibido entrar), não é só disciplina. É aditiva e reversível: reverter é voltar os imports antigos.

**O que destrava.** Ratificar fecha a decisão técnica do modal público e libera a landing a consumir a biblioteca direto, o que estanca a duplicação de código. As pendências encadeadas (convergir o modal do painel depois) estão registradas na ADR e não bloqueiam. Detalhe em [[ADR-017-modal-e-primitivos-radix-free-superficie-publica]].

*Como decidir: responda "ratifica a decisão do modal" (recomendado) ou peça para a engenharia reavaliar.*

---

## Miudezas com dono

Três pontas soltas pequenas. Todas têm default seguro em vigor e nenhuma é urgente.

### 11. Reagendar campanha vencida

**Por que essa decisão existe.** Você já decidiu (2026-07-17, verbatim: *"Se for agendada vencida, não dispara. Fica vencida, a priori, depois posso revisar isso se ver que é um problema."*) que uma campanha agendada que perdeu a hora não dispara: vira um estado terminal `vencido`. Isso está aplicado (RN-136, commit `9c10a8d`). A ponta solta é: existe hoje ação de **reagendar** ou reviver uma campanha vencida? Não. E você mesmo deixou em aberto revisar isso depois.

**Se você disser sim (criar o reagendar).** O organizador poderia pegar uma campanha vencida e dar uma data nova, em vez de recriar do zero. Custo: uma ação nova de UI mais a regra de como reviver um estado que hoje é terminal e travado nas Rules (nem apagar é permitido, de propósito, para o documento ser a trilha de que aquele envio não saiu).

**Se você disser não ou adiar.** O estado terminal fica como está. Quem quer reenviar cria uma campanha nova. Nenhum envio some, nada dispara sozinho. É exatamente o comportamento que você pediu.

**Nossa recomendação, defendida.** Deixar terminal por ora, como você já indicou. O job do organizador de *comunicar com quem vai ao evento* é atendido criando uma campanha nova, e o custo de "reagendar a vencida" só se justifica se isso virar reclamação recorrente. Recriar é barato hoje.

**O que destrava.** Nada muda. A única pendência de UI já prevista é mostrar o rótulo "Vencida" na listagem (lote de painel), que independe desta decisão. Fonte: [[D17-REPORT]].

*Como decidir: responda "deixa terminal por enquanto" (recomendado) ou "quero a ação de reagendar".*

### 12. Repasse parcial de comissão

**Por que essa decisão existe.** O organizador registra o repasse da comissão do afiliado, mas hoje só dá para repassar o **saldo inteiro** de uma vez. Não dá para registrar um repasse parcial (pagar metade agora, metade depois). É um follow-up conhecido da UI de comissão.

**Se você disser sim (permitir parcial).** O organizador informa um valor menor que o saldo e registra só aquele pedaço. Custo: a UI passa a aceitar um valor de repasse (não só "repassar tudo"), e a validação garante que ele não passe do saldo. O backend já é idempotente e guarda o saldo, então a mudança é mais de UI do que de kernel.

**Se você disser não ou adiar.** O organizador repassa o saldo total quando paga. Se ele pagou só uma parte por fora, o registro fica menos fiel à realidade até o próximo repasse fechar a conta. Incômodo pequeno, não bloqueia ninguém.

**Nossa recomendação, defendida.** Adiar para um follow-up. O job do organizador de *acertar as contas com o afiliado* é atendido pelo repasse total na maioria dos casos; o parcial é conveniência para quem paga em partes. Vale quando aparecer demanda real, junto de outros ajustes da aba de comissão.

**O que destrava.** Nada trava. Fica registrado como follow-up da UI de comissão. Fonte: épico [[LEELA-E08-influenciador]] (§UI entregue, "falta repasse parcial").

*Como decidir: responda "adia o parcial" (recomendado) ou "quero repasse parcial já".*

### 13. Última atividade no CRM

**Por que essa decisão existe.** Mostrar "última atividade" de cada cliente na lista do CRM (quando a pessoa se inscreveu ou interagiu pela última vez) exige o backend expor um carimbo de tempo pronto para isso. O CRM guarda um carimbo interno de atualização (`atualizadoEmMs`, usado para ordenar eventos fora de ordem), mas ele serve à consistência, não é um "visto pela última vez" pensado para o organizador ler. A pergunta é: vale abrir um lote para expor isso?

**Se você disser sim.** A lista do CRM ganha a coluna de última atividade. Custo: o backend precisa expor um carimbo com esse significado (e decidir o que conta como "atividade": só inscrição? qualquer interação?), mais a coluna na tela.

**Se você disser não ou adiar.** A lista do CRM funciona sem essa coluna. O organizador vê os clientes, o LTV e o histórico; só não vê num relance quem andou sumido. Falta de comodidade, não de função.

**Nossa recomendação, defendida.** Adiar, não vale o lote agora. O job do organizador de *entender e reengajar minha base* é servido pelo histórico e pelo LTV que o CRM já entrega; "última atividade" é um refinamento de comodidade. O carimbo existente não foi desenhado com esse sentido, então expor certo custa mais do que parece. Melhor quando o CRM tiver uso real e você souber que recorte de "atividade" importa. O backend do CRM está entregue; a aba é lote posterior, e essa coluna cabe nessa conversa futura.

**O que destrava.** Nada trava. Fica para a fase da UI do CRM. Fonte: [[E19-CRM-REPORT]] e épico [[LEELA-E19-crm]].

*Como decidir: responda "adia" (recomendado) ou "quero última atividade na lista".*

---

## Ações externas (não são decisões)

Estas não são decisões de produto, são tarefas suas que destravam código que já está pronto e inerte. Ficam aqui só para não se perderem.

- **`BREVO_API_KEY`** — criar a conta Brevo, verificar o domínio de envio e gerar a chave (`functions/.env` ou Secret Manager). Destrava o e-mail transacional (convite, campanhas, recuperação de pedido). A verificação de domínio depende do domínio público ainda em aberto; sem ele, o envio fica limitado a teste. Fornecedor já ratificado ([[DECISOES-ABERTAS]] item 13).
- **KYC e chave sandbox do Asaas** — o KYC conclui o `E04-PAY-T2` (parado) e é lead time de negócio, sem custo de código. A chave sandbox destrava o teste ponta a ponta da cobrança real e a ativação do adapter, que está pronto e inerte.
- **`CRM_ID_PEPPER` no deploy** — provisionar o segredo no Secret Manager antes do CRM ir para produção. Sem ele o gatilho do CRM quebra alto de propósito (fail-closed). É a única pendência de ops do CRM. Fonte: [[COMF2-REPORT]] e [[E19-CRM-REPORT]].
- **Restart dos servidores de prova viva** (`:3200` da landing e `:5273`/preview do painel) — precisam estar no ar para as provas visuais que ficaram pendentes de render (o `:3200` estava fora durante a revisão de checkout, por isso parte da análise é por código, não por tela viva).

---

> Fonte das recomendações: [[CHECKOUT-UX-REPORT]] (decisões 1 a 6), [[COMF2-REPORT]] e [[LEELA-E08-influenciador]] (7, 12), [[DECISOES-ABERTAS]] item 23 e `§S-R9-11` (7, 8), [[ADR-016-firebase-storage-upload]] (9), [[ADR-017-modal-e-primitivos-radix-free-superficie-publica]] (10), [[D17-REPORT]] (11), [[E19-CRM-REPORT]] e [[LEELA-E19-crm]] (13). Cada recomendação cita a evidência real; nenhuma argumenta de memória.
