---
tags: [leela, rodada, decisoes, checkout, ux]
aliases: ["DEC-0729 · achados do dono no checkout"]
trace: leela-build-2d6ee98d
data: 2026-07-29
fonte: revisão real do dono na jornada de compra pública (leela-landing.web.app, evento meia-floripa-2026)
---

# DEC-0729 · Achados do dono na jornada de compra (verbatim + triagem)

O dono percorreu a compra real no site público e reportou os pontos abaixo. Verbatim integral no bloco final; triagem do maestro na tabela.

## Triagem

| # | Achado | Classe | Severidade | Destino |
|---|---|---|---|---|
| 1 | QR Code do PAGAMENTO não aparece após clicar para pagar; compra não conclui | DEFEITO | **ALTA — bloqueia o teste canônico do go-live** | lane CHECKOUT-PIXQR-INV (investigação primeiro; pode ser config/flag, não código) |
| 2 | "Calculando total" preso na tela por alguns segundos | DEFEITO (fricção) | média | INV (mesma família do 1) + fix na CHECKOUT-UX |
| 3 | Termos de aceite aparecem ANTES do pagamento | DEFEITO vs decisão ratificada de 2026-07-18 ("no PAGAR, 2 aceites") | média | CHECKOUT-UX |
| 4 | Taxa de serviço não é mostrada (e o dono não sabe se no meia-floripa ela é incorporada ou repassada) | DEFEITO de exibição + verificação de config | média | INV verifica a config do evento; exibição na CHECKOUT-UX |
| 5 | Seletor de parcelas sem visibilidade (mesma cor do fundo) | DEFEITO vs regra inviolável (contraste AA por estado) | média | CHECKOUT-UX |
| 6 | Cupom de teste para o dono aplicar | PEDIDO | — | seed já tem `FLORIPARUN10` (afiliado do meia-floripa) e `RITMOFORTE10` (assessoria); INV confirma que aplicam no checkout de produção |
| 7 | Mesmo componente de formulário da inscrição para endereço e nome completo | ORDEM (consistência) | — | CHECKOUT-UX |
| 8 | Dúvida: usar dados de conta se a pessoa já tem cadastro? | DÚVIDA | — | resposta do maestro: hoje NÃO existe conta de comprador (checkout anônimo por design v1; área logada do atleta fora do v1). Vira candidato de fila se o dono quiser antecipar |
| 9 | Endereço: mostrar SÓ o CEP; validou, aparece o restante | ORDEM (refina a decisão de 2026-07-18 do ViaCEP) | — | CHECKOUT-UX |
| 10 | Ao passar de inscrição→pagamento a tela fica no rodapé; usuário precisa do topo | DEFEITO (scroll na troca de etapa) | baixa | CHECKOUT-UX |
| 11 | Naming: "quem vai correr" não faz sentido — Leela é Hub de Bem-Estar; são "participantes" | ORDEM (decisão de marca do dono) | — | CHECKOUT-UX (varredura de vocabulário de corrida na jornada) |
| 12 | Resumo do pedido visível + poder editar tamanho/kit selecionado errado | ORDEM | — | CHECKOUT-UX |
| 13 | Ritmo vertical: espaçamentos de "forma de pagamento", "modalidade", seleção de kits fora do ritmo | DEFEITO vs governança de design (tokens) | baixa | CHECKOUT-UX |

## Segunda leva (mesmo dia, landing page)

| # | Achado | Classe | Severidade | Destino |
|---|---|---|---|---|
| 14 | Alinhamento na landing web: header e Hero com padding/borda menores, dobras do evento mais largas — larguras de container divergem | DEFEITO (grid/tokens) | baixa | CHECKOUT-UX |
| 15 | Kit com galeria: 3 fotos por kit, uma marcada como principal (a que aparece no site). Hoje o modelo tem UMA imagem só (`imagemUrl`, RN-227) — é feature nova, não regressão | ORDEM (feature) | — | SPEC-KITCUPOM (delta de spec) → build; simular no seed |
| 16 | Afiliado/assessoria compartilham link com cupom JÁ aplicado: desconto computado ao chegar no checkout, marcado "(desconto aplicado)", e banner após a Hero: "Você tem desconto neste evento — CUPOM XXXXXX de Fulano aplicado!". A atribuição por link JÁ existe no modelo (linkMaster + janela de 7 dias); o auto-apply do cupom + banner são a extensão | ORDEM (feature; toca dinheiro/atribuição) | — | SPEC-KITCUPOM (delta de spec) → build com review antagonista |

## Decisões do dono registradas nesta rodada

- **D-0729-1 (naming):** a Leela é um **Hub de Bem-Estar**, não plataforma de corrida de rua. Vocabulário de corrida ("quem vai correr") sai da jornada; quem se inscreve é **participante**. Vale como diretriz para toda superfície pública.
- **D-0729-2 (endereço):** progressive disclosure no endereço — só o CEP visível; o restante aparece após validação, para o usuário ver menos campos.
- **D-0729-3 (resumo):** o pedido tem resumo visível antes do pagamento, com edição de kit/tamanho sem recomeçar a jornada.
- **D-0729-4 (kit):** kit passa a ter até 3 fotos, uma marcada como principal — a principal é a que aparece nas listagens e no site.
- **D-0729-5 (cupom por link):** link de afiliado/assessoria aplica o cupom automaticamente; o comprador chega com o desconto computado, vê "(desconto aplicado)" nos valores e um banner após a Hero: "Você tem desconto neste evento — CUPOM XXXXXX de Fulano aplicado!".

## Verbatim do dono (2026-07-29)

> (segunda leva) o alinhamento na landing page versao web, nao está igual, para o header, e o resto das informações, parace que o padding/bordas está reduzido na Hero, mas nos campos das dobras sobre o evento, estão com largura maior. Simule também kits que tenham mais de uma imagem, nao sei se demos essa opção, mas é importante que o usuário consiga ver 3 fotos por kit, sendo uma delasa principal que vai aparecer no site. Outro ponto que observei. O afiliado do evento, ou assesoria parceira vao compartilhar o slinks com cupons já aplicados, entao percisamos que os descontos já estejam computados quando o usuário for comprar, e que mostrem isso para o usuário também, algo como (desconto aplicado), e um pequeno banner após a Hero Section, informando "Você tem desconto neste evento - CUPOM XXXXXX de Fulano  apliacado!"

> o que percebi. Nao consegui gerar o QR Code, os termos de aceite estão aparecendo antes do pagamento, e o QR Code não aparece após eu clicar para pagamento. O "calculando total" fica na tela, quebrando a experiencia de compra gerando fricção, por alguns segundos. Não estamos mostrando a taxa de serviço (nao sei se no evento em si ela etá sendo incorporada ou repassada), é o evento meia-floripa-2026. o Seletor de parcelas não está com boa visibilidade também, visto que ele está na mesma cor do plano de fundo. Quero também um exemplo de cupom de teste para eu aplicar. o mesmo componente de formulário em inscrição deve ser aplicado para endereço e Nome Completo. Duvida, temos a opção de utilizar dados de conta, caso a pessoa já tenha algum cadastro? E ao preencher o endereço, quero que mostre apenas o campo CEP, e depois que validar, apareça o erstante das informações, apra o usuário ver menos campos necessários para preencher. Ao passar a etapa de incrição para pagamento, a tela permanece na parte inferior da jornada, sendo que o usuário precisa preencher o campo na parte superior. (ficou claro?). Outr ponto, é o naming. A Leela não é plataforma de corridas de rua, e sim um Hub de Bem estar. Logo o "quem vai correr" em inscrição nao faz sentido, visto que são apenas participantes. é preciso que o usuário veja o resumo das informações. de pedido, e possa editar algum tamanho, e possa editar algum tamanho do kit, caso tenha selecioando errado. o Espaçamento de "forma de pagamento" , "modalidade", na hora de selecionar os kits, nao estao respeiando os espaçamentos devidos de ritmo vertical.
