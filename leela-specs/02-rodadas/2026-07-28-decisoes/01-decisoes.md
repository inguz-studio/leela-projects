---
tags: [leela, decisoes, rodada, produto, formulario, marcas]
aliases: ["Rodada 2026-07-28", "DEC-0728"]
trace: leela-build-2d6ee98d
data: 2026-07-28
fonte: ordem do Vitor no chat (verbatim abaixo)
---

# Rodada DEC-0728 — fila de construção autorizada e dois escopos novos

## Verbatim do Vitor (preservar)

> *"Perfeito, pode ir seguindo a fila de construção, repasse posição 1, 2,3, incluir cadastro de marcas no painel admin geral, onde eu como administrador Leela posso cadsatrar cupons de desconto,parceiros presenciais, com endereço, descritivo de beneficios, capa, logo, e fotos (pode ser prioridade baixa essa parte). QUero o formbuilder também. no formato que já conversamos, para termos os fomrulários no menu principal, como templates, que poderão ser reutilizados em eventos."*

## Decisões

**DEC-0728A · fila autorizada.** As posições 1, 2 e 3 da fila de construção rodam em sequência sem nova consulta: fechar o caminho do dinheiro (em voo na lane ESTORNO-ADMIN, com as reviews CAIXASIMPLES-REV, DEBT e ESTORNO-REV na esteira), depois E08 (repasse parcial da comissão e aviso ao afiliado), depois E10 (consolidação das ativações de marcas). O FormBuilder, que era a posição 4, foi puxado junto pelo pedido explícito.

**DEC-0728B · FormBuilder com biblioteca de templates.** O formato segue a rodada de 2026-07-19 (D-FB-1 a D-FB-6, RN-184 a RN-189) com um delta novo: os formulários passam a viver no menu principal do painel como templates, reutilizáveis em eventos. É um supersede parcial do D-FB-6: o builder ganha casa própria no menu, e a config de evento e de clube passa a referenciar um template em vez de abrigar o builder. A resposta continua vivendo no inscrito/membro (D-FB-1 intacta), o fence de obrigatoriedade continua o mesmo (D-FB-3). O delta de spec roda antes do código, na lane SPECS-0728.

**DEC-0728C · cadastro de marcas no painel admin geral (prioridade baixa).** Como administrador Leela (nível plataforma, não tenant), cadastrar: cupons de desconto e parceiros presenciais com endereço, descritivo de benefícios, capa, logo e fotos. Épicos candidatos: E10 (marcas) e E16 (plataforma-superadmin); a spec decide o dono e a costura entre os dois. Prioridade baixa declarada pelo dono — entra na fila depois do FormBuilder e não bloqueia nada.

## Segunda leva da mesma rodada (itens 15, 34, QR, deploy)

Verbatim do Vitor:

> *"ponto 15, nao entendi. o que é teto de quantidade e limiar de estoque baixo? Teto de quantidade é quantidade de itens? Se sim, pode ser 999.999 e limiar de baixa, pode ser menos que 20, nao pecisa ser configuração. Sobre a página pública do evento, após voce finalizar tudo, eu reviso, a jornada do checkout, da página de inicio com os eventos, de um organizador, selecionadno um evento e comprando o ingresso dele até o final. Quero poder fazer essa jornada do inicio ao fim. E gostaria que tivéssemos a geração de um QR code para isso. Outro ponto é para colocar o projeto no ar. Nao conseguimos fazer um link provisório para subir no vite e eu ver o sistema no ar? O que precisamos fazer além disso? E o firebase? precisamos de algum plano contratado?"*

E o refinamento dos QR Codes, na sequência:

> *"Sobre os QR Codes. Precisamos gerar os qr codes para pagamento pix, mas atmbém gerar o dos ingressos, com código identificador. Que deverá poder ser visualizado na área do organizador, ou visualizar apenas o código da tabela. Sempre que uma compra for realizada, enviaremos para o comprador responsável os QR Codes e identificadores. No campo "entrega" que temos no sistema, podermos mudar anomenclatura para "credenciamento"."*

**DEC-0728D · item 15 fechado.** Teto de movimentação de estoque e limiar de baixa não viram configuração. O teto (hoje `MAX_QTD_TRANSICAO_APROVISIONAMENTO = 1.000.000` em `functions/src/eventos/agregarEstoque.ts`) ajusta para 999.999 por escolha dele; o limiar (`LIMIAR_BAIXA_SKU_DEFAULT = 10` no core) segue em 10, abaixo dos 20 citados. Ajuste entra como task na próxima lane de functions.

**DEC-0728E · jornada completa com ingresso QR, refinada.** A revisão do Vitor vira um passeio único quando a fila aterrissar: home com eventos → organizador → página do evento → compra → ingresso. Para isso o pacote do caminho do dinheiro ganha o ingresso digital (S1206, RN-218, `qrToken`) com os refinamentos: (a) QR do PIX segue como está (o gateway emite, o checkout mostra); (b) ingresso ganha QR **e código identificador legível**; (c) área do organizador mostra o QR do inscrito ou apenas o código na tabela; (d) toda compra realizada dispara envio ao comprador responsável com os QR Codes e identificadores (e-mail transacional, Brevo — item 13 resolvido viabiliza); (e) spec delta na lane SPECS-0728 (T6 nova), donos E03/E12.

**DEC-0728F · frente DEPLOY-PREVIEW.** Link provisório no ar via canal de preview do Firebase Hosting, sem domínio. Pré-requisito externo: ativar o plano Blaze (as Cloud Functions e as chamadas a Asaas/Brevo exigem; pré-pago por uso com cota gratuita, custo de teste perto de zero). Itens 10 (rotação da chave Asaas) e 11 (segredos no Secret Manager) executam na hora do deploy. Ele ativa o Blaze; o maestro despacha a lane e entrega o link.

**DEC-0728G · nomenclatura: "entrega" vira "credenciamento".** O campo/área "entrega" do sistema muda de nome para "credenciamento" em todas as superfícies. A mecânica não muda (RN-205, RN-221 e RN-222 intactas); é virada de vocabulário. Entra na spec delta da SPECS-0728 e nas lanes de código seguintes.

## Terceira leva — chaves do Asaas e teste real (madrugada de 28/07)

Verbatim do Vitor: *"criei uma chave API em produção. aonde posso colocá-la para testarmos ? nao tem problema utilizarmos diretamente em produção."* — depois *"feito"*, *"SIm, eu quero."* (teste com dinheiro real) e *"os pontos 11, 8, 9 e 12b, ainda estao pendentes?"*.

- **Chave de produção validada.** Gravada em `functions/.env` (`ASAAS_API_KEY`, gitignored; o código detecta produção pelo prefixo). Prova sem mover dinheiro: `GET /v3/finance/balance` HTTP 200. A conta é viva: 601 clientes cadastrados, beneficiário PIX "Farol Soluções Universitá" (Curitiba).
- **Item 9 resolvido com prova de API.** `GET /v3/myAccount/status` respondeu `APPROVED` em comercial, bancária, documentação e geral.
- **Item 8 resolvido de fato.** Chave de sandbox presente no `.env` com prefixo `$aact_hmlg_` correto e autenticando (HTTP 200). Destrava as três provas pré-go-live (status real de refund PIX, refund parcial em grupo, payload do `PAYMENT_REFUNDED`) sem dinheiro real; entram na esteira após a lane ESTORNO-ADMIN aterrissar.
- **Item 10 FECHADO na sequência.** A chave nova validada completou metade da rotação, e o Vitor desativou a antiga (vazada em 2026-07-12) minutos depois — verbatim: *"já desativei a chave antiga do asaas."* Rotação completa; a trava pré-deploy caiu.
- **Teste com dinheiro real autorizado e em curso.** Cobrança PIX de R$ 5,00 criada em produção no cadastro do próprio Vitor (`pay_pfv19mnq5y3h16yv`, cliente `cus_000087098597`); QR + copia-e-cola entregues; vigia de status por consulta (o webhook não alcança máquina local — a reconciliação por GET cobre o teste).

## Efeitos no painel

- Fila de construção atualizada: posições 1 a 3 autorizadas (DEC-0728A), FormBuilder puxado com o delta de templates (DEC-0728B), linha nova de prioridade baixa para o cadastro de marcas (DEC-0728C), posição 1 estendida com ingresso QR + item 15 (DEC-0728D/E), frente paralela DEPLOY-PREVIEW criada (DEC-0728F).
- Itens 8 e 9 saem das ações externas; viram linhas em ✅. Item 10 reformulado (só falta desativar a antiga). Item 12b segue adiado, agora sozinho no bloco.
- Item 15 sai do menu e do detalhe; vira linha em ✅ (DEC-0728D).
- Item 34 reformulado: de "conferir a página pública" para "revisar a jornada completa" após a fila aterrissar (DEC-0728E).
- Nenhum item aberto novo que dependa do Vitor além da ação externa do Blaze (DEC-0728F).

Fonte: chat do maestro, 2026-07-28.
