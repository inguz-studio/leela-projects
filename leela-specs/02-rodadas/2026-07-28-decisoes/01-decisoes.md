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

## Quarta leva — vereditos das lanes (madrugada de 28/07)

- **ESTORNO-ADMIN aterrissou completa** (T4-frontend `e67edd6`, T5 `867f7dc`, T6 `2a39a7e`): fila admin cross-tenant no painel, item 27 (estorno automático do retardatário com extrato e varredura), RN-370 a RN-380 consolidadas. Todos os gates exit 0. Aguarda ESTORNO-REV.
- **SPECS-0728 aterrissou completa** (T1-T6): filas de código prontas para as posições 1-5, RN-385 a RN-399, dono do cadastro de marcas = E16, leitura de "cupons" como benefício de comunidade registrada para veto barato do dono.
- **DEBT-REV: DEBT-SWEEP APROVADA COM RESSALVAS.** O gate que a lane declarou e a queda impediu de provar foi medido: suíte completa do painel 2× verde idêntica (182 arquivos, 1.596 testes, zero flake), 3ª rodada verde pós-fix. Um fix por cima com prova (`dc9b190`: a sessão de plataforma podia travar em skeleton eterno — a sexta porta sem blindagem que a unificação do T1 mirava). Aterrissagem órfã paga: boards (`8873048`), handoff póstumo (`8f27fef`). O achado do item 51 (chave de produção na variável ativa; preview perderia a compra clicável) nasceu e FECHOU na mesma aterrissagem: o maestro esvaziou `ASAAS_API_KEY`; produção e sandbox seguem nas gavetas próprias. Nuance registrada: a melhoria de tempo do T3 anunciada no commit era medição isolada — o teto de 20s ainda trabalha.
- **ESTORNO-REV: ESTORNO-ADMIN APROVADA COM RESSALVAS — posição 1 FECHADA.** A máquina de dinheiro resistiu: falsificação dos guards mordeu (3/71 e 5/71 vermelhos ao neutralizar carimbo e re-envio), corridas provadas agora (retardatária × webhook não re-abre extrato; duas retardatárias = um POST só). A review corrigiu por cima: `0149813` (ALTA — o desempate do webhook num pedido de grupo fechava o carimbo de OUTRO inscrito e baixava o livro duas vezes para um refund só; prova vermelho→verde), `8f82588` (a recusa do servidor não chegava ao operador — descrição vazia na primeira falha e frase trocada), `52671ee` (Rules do fan-out provadas por lista com papel real). Gates: 201/201 no emulador, 83/83 no painel, tsc/eslint 0. Cinco escalados: E-1 e E-3 viraram os itens 52 e 53 do painel (fila com teto silencioso; coluna Valor cheia com taxa retida); E-2 (isolamento do Promise.all + validação do sort), E-4 (padrão velho de erro em RepassesAdmin/Planos) e E-5 (RN-379/380 ganham a frase da taxa do órfão) viraram tasks da lane POLIMENTO-0728.
- **CAIXASIMPLES-REV: APROVADA COM RESSALVAS.** A regra de dinheiro sobreviveu a todos os vetores — corrida no mesmo evento provada com teste de concorrência (o perdedor leva erro tipado e a invariante segura), guards mordem na falsificação (9 e 4 vermelhos ao neutralizá-los), bordas refutadas. Três fixes de contrato/teste: `db76363` (api-client volta a espelhar a callable), `aa75a03` (guarda de entrada do core volta a ter rede de teste), `2595465` (8 casos de ataque). Dois achados escalados viraram os itens 49 e 50 do painel (Caixa × janela D+N; erro de termo engolido). Gates: 158 testes de functions + 701 do painel verdes, tsc/eslint 0.
- **POLIMENTO-0728: as ressalvas das três reviews, pagas.** Lane de fecho com os quatro defaults propostos EM VIGOR (o dono veta depois, barato). Item 49: o card da Caixa passou a exibir `min(disponível do evento, disponível do tenant)` — o cenário medido (8.500 × 4.025) agora mostra 4.025, com nota dizendo de onde veio o corte. Item 50: falha ao ler o termo (e ao ler o saldo) virou estado de erro visível no card, e de carona o `Number.isFinite` no pct. Item 52: a fila admin declara o teto de leitura, nomeia o produtor cortado e avisa até com a lista vazia; e um ramo que falha deixou de derrubar a fila inteira (E-2), com `criadoEm` corrompido fora do sort. Item 53: a coluna virou "Volta ao comprador" com a taxa retida discriminada, pela MESMA composição do servidor (RN-347 → RN-373 → RN-374), só para `em_analise`. E-4: `RepassesAdminRoute` e `PlanosRoute` receberam o fix do `8f82588`, com `mensagemDaRecusa` promovida a `_lib/errors.ts`. E-5: RN-379/380 ganharam a frase da taxa integral do órfão. Item 15: teto de estoque em 999.999, com o número cravado em teste. Commits `e963426` (T1) `ad08243` (T2) `f8d6859` (T3) + specs/boards. Gates: painel 907/907, emulador 45/45, tsc/eslint 0; todo teste novo falsificado antes de entrar. **Aguarda review antagonista.**
- Item 15 sai do menu e do detalhe; vira linha em ✅ (DEC-0728D) — e o ajuste do número foi feito na POLIMENTO-0728.
- Item 34 reformulado: de "conferir a página pública" para "revisar a jornada completa" após a fila aterrissar (DEC-0728E).
- Nenhum item aberto novo que dependa do Vitor além da ação externa do Blaze (DEC-0728F).

Fonte: chat do maestro, 2026-07-28.
