# Decisões em aberto — painel do Vitor

> **Como ler.** O menu abaixo lista tudo o que depende de você, em linguagem direta, com um exemplo curto quando ele ajuda a decidir. Cada bullet leva ao detalhe pelo mesmo número, logo abaixo. Nada aqui bloqueia código: tudo roda com um default defensável em vigor, ratificar é confirmar o default e mudar é ajuste no próximo lote.
> **Disciplina de limpeza.** Quando um item resolve, ele sai deste painel na mesma aterrissagem: vira uma linha na seção de resolvidas, e o registro completo, com o seu verbatim integral, passa a viver no arquivo da rodada em `02-rodadas/`. Item que você adia também sai do menu e vira uma linha na lista de adiados. Este painel só carrega o que ainda é seu.
> **Personagens dos exemplos.** Ana compra, Castelo organiza eventos, Marina opera o painel, Bia cuida do marketing da Marina, Téo é influenciador afiliado. São ilustrativos, não pessoas do banco.

## Menu do que está aberto

### Decisões que ainda dependem de você

- **34 · conferir a página pública do evento no preview.** Abra `http://127.0.0.1:3000/meia-floripa-2026`, na porta 3000. A página tem que abrir sem erro e com o visual do design system. É o efeito prático da ADR-017; seu ok fecha a decisão e libera a landing a usar a biblioteca direto.
- **15 · teto de quantidade e limiar de estoque baixo viram configuração.** Hoje o teto por movimentação de estoque (1 milhão por item) e o limiar de "baixa" estão fixos no código. Vira configuração de produto quando você quiser.
- **12 · domínio público.** Todo endereço do produto ainda é um marcador. Trava só links e busca em produção, e a verificação do e-mail de envio depende dessa escolha. *O Castelo quer divulgar a página do evento no Instagram e o endereço de hoje nasce para quebrar.*

### Hipótese a validar em campo

- **HIP-R9-01 · pré-compra do clube-influenciador.** Não é decisão a ratificar, é hipótese a testar com um organizador de verdade. *O Castelo publica o link com meta de 30 inscrições para liberar 20% de desconto, e a trigésima chega no oitavo dia, quando a reserva do cartão das primeiras já venceu.*

### 🟠 Ações externas suas

- **10 · rotacionar a chave de produção do Asaas.** Ela apareceu num transcript de chat em 2026-07-12. Continua obrigatória antes do primeiro deploy real, mesmo com o assunto Asaas adiado.
- **11 · três segredos técnicos antes do primeiro deploy.** Nada aqui tem a ver com estrangeiro nem com identidade de ninguém: são três valores de configuração que precisam existir no servidor antes do primeiro deploy real. Nada a fazer agora.
- **8 · 9 · 12b · adiados por você em 2026-07-26.** Chave de teste do Asaas, verificação de identidade da conta e liberação para pagador estrangeiro. Ninguém está cobrando esses três; ficam listados só para você saber que o checkout de estrangeiro segue parado enquanto isso.

### 🔧 Dívida técnica — em execução

- **Ordem sua de 2026-07-27: "resolvam todas".** A lane DEBT-SWEEP está rodando com a lista inteira. Nada aqui espera decisão sua; o que sobrar volta como card. A única exceção é a prova do cancelamento contra o ambiente de teste do Asaas, que depende da chave do item 8.

### 🧭 Fila de construção

- **Posição 1 · fechar o caminho do dinheiro.** O pacote de estorno, agora com as cinco decisões da rodada de 27/07, mais os cards de carrinho e temporizador. Vem antes de qualquer frente nova.
- **Posição 2 · E08, repasse parcial da comissão e aviso ao afiliado.** *O Téo acumula R$ 1.200, o Castelo adianta R$ 500 por fora e os dois lados ficam com o número errado.*
- **Posição 3 · E10, consolidação das ativações de marcas.** *A Marina apaga "Café Rota" sem saber que era o patrocinador de um desafio.*
- **Posição 4 · FORMBUILDER, perguntas personalizadas na compra e na inscrição.** *Hoje o Castelo monta formulário fora do sistema e cruza duas planilhas na véspera.*
- **Posição 5 · E11, análise em CRM › Visão geral.** *A Marina troca o seletor de período para comparar 30 dias com os 30 anteriores e os números não mudam.*
- **Depois da fila · app v1 como PWA.** *Ana chega ao ginásio sem sinal e hoje o ingresso dela precisa de rede.*

## Adiados por você

Saíram do menu. Voltam quando você pedir, ou quando a condição escrita ao lado acontecer. Registro completo com o seu verbatim: `02-rodadas/2026-07-27-decisoes/01-decisoes.md`.

- **39 · planilha exportada quando o extrato de repasses não pode ser lido** — "não é importante agora" (2026-07-27). Na tela o caso já está resolvido; o que ficou parado é a saída do arquivo.
- **32 · trocar a conta do gateway deixa cobranças órfãs** — anotado para depois. Não há urgência com conta única, e o procedimento (drenar as pendentes antes de virar a chave) já é runbook de operação.
- **36 · última atividade no CRM** — recomendação de adiar aceita. Volta na conversa da fase de UI do CRM.
- **48 · retomar a compra e buscar o QR que faltou** — volta quando existir a área do cliente, porque a retomada só faz sentido com a pessoa logada. Até lá, o link da fatura é a saída oficial.

## Detalhe dos itens abertos

**34 · Onde você confere a página pública (ADR-017).** A landing e o painel são feitos de tecnologias diferentes, e a biblioteca de componentes da casa foi construída sobre uma dependência (Radix) que não roda bem na landing: quando alguém usou o modal da biblioteca lá, a página do evento quebrou com erro 500. A decisão aplicada deu ao design system duas portas que não carregam essa dependência, uma para os componentes estáticos e outra para o modal. O ganho é duplo: a página pública fica de 12 a 16 KB mais leve, o que ajuda busca e velocidade, e o comportamento perigoso de um modal (prender o foco do teclado, fechar no Esc, travar o scroll) passa a ter uma implementação só, testada. A acessibilidade provada (10 de 10 testes) foi preservada, e um teste caminha o grafo de imports e falha se a dependência proibida voltar. Você delegou a escolha à engenharia pedindo *"desempenho em ambos os casos"*. **Onde conferir:** com o preview da landing no ar, abra `http://127.0.0.1:3000/meia-floripa-2026` — porta 3000. O que você procura: a página abre sem erro e o visual é o do design system. **O que destrava:** ratificar fecha a decisão do modal público e libera a landing a consumir a biblioteca direto, o que estanca a duplicação de código. Reverter é barato. Fonte: [[ADR-017-modal-e-primitivos-radix-free-superficie-publica]].

**15 · Teto de quantidade e limiar de baixa viram configuração.** O teto sanitário por transição de estoque (1 milhão por item, hoje fixo no callable) e o limiar de "baixa" (10 unidades) migram para configuração de produto quando você quiser.

**12 · Domínio público.** `{DOMINIO_LEELA}` segue como marcador em todo endereço do produto. Bloqueia links de produção e busca, e a verificação do domínio de envio do e-mail transacional (item 13) depende desta escolha: sem domínio verificado, o envio fica limitado ao remetente do provedor, o que basta para teste e não basta para produção com destinatários reais. **O que destrava:** você crava o domínio.

**HIP-R9-01 · modelo de pré-compra do clube-influenciador.** Verbatim seu: *"quero validar isso depois com um organizador de eventos."* Mecânica proposta: inscrições pelo link do clube entram em pré-compra e, ao atingir o mínimo definido pelo organizador, dispara a cobrança no cartão de todas. A spec entrega a proposta mais as quatro questões de dinheiro que a validação precisa responder antes de virar regra e código:

- **(a) Janela da reserva no cartão.** A reserva expira em poucos dias, então segurá-la até o mínimo pode estourar a janela. A alternativa é guardar o método de pagamento e cobrar no gatilho, com risco de recusa na hora.
- **(b) Mínimo nunca atingido.** O que acontece com as pré-compras: regra e prazo de expiração, e o que se comunica a quem entrou.
- **(c) Recusas parciais no disparo em lote.** Se parte das cobranças recusa, as aprovadas ficam abaixo do mínimo de novo. Reverte tudo, ou segue com as aprovadas?
- **(d) Vaga durante a pré-compra.** A pré-compra reserva ou não vaga e estoque de lote enquanto aguarda o mínimo.

Default conservador enquanto não valida: RN-315, o link do clube só ativa o desconto ao cruzar o mínimo, sem cobrança em lote. Quando e se implementar, é dinheiro, então rota opus com review antagonista obrigatória. **O que destrava:** uma conversa sua com um organizador real que responda as quatro questões. A versão retroativa do desconto é a parte que bloqueia código, porque reabre reprocessamento de vendas já pagas, e segue parada no item 22 das resolvidas. Spec: `02-rodadas/2026-07-18-ux-review/03-stories.md §S-R9-11`.

## 🟠 Ações externas suas

> **Bloco Asaas adiado por você em 2026-07-26.** Os itens 8, 9, 10 e 12b saíram da fila de cobrança e ninguém vai lembrá-los a cada retomada. Duas consequências mantidas: o lote `ESTRANGEIRO-CHECKOUT` segue parado, sem nem contato com o gerente de contas, e a rotação da chave de produção continua obrigatória antes do primeiro deploy real.

**10 · Rotacionar a chave de produção do Asaas.** Ela apareceu em transcript de chat em 2026-07-12. Só existe em `functions/.env` e o simulador está ativo, então não é urgente, mas regenere no painel do Asaas quando puder. Continua obrigatória antes do primeiro deploy real.

**11 · Três segredos técnicos antes do primeiro deploy.** Este item não tem nada a ver com estrangeiro, passaporte ou identidade de comprador — isso é o item 12b, que está adiado e não está sendo cobrado. Aqui são três valores de configuração que o servidor precisa ter antes do primeiro deploy real, e cada um protege uma parte diferente:

- **a chave que protege os dados bancários guardados** (`BANK_DATA_KEY`): sem ela, a cifra falha fechada e o cadastro bancário não abre;
- **o endereço do monitoramento de erros** (Sentry de staging): sem ele, o erro 500 do E07 chega sem identificador e ninguém rastreia;
- **a semente que embaralha a identificação dos clientes no CRM** (`CRM_ID_PEPPER`): sem ela, o gatilho do CRM quebra alto de propósito, para não gravar identificação fraca.

Nada a fazer agora: os três só precisam existir antes do primeiro deploy real, e os comandos ficam registrados aqui para essa hora. Fonte: `COMF2-REPORT` · `E19-CRM-REPORT`.

**8 · Chave de teste (sandbox) do Asaas.** Destrava o teste ponta a ponta de cobrança real sem risco e a ativação do adapter (`AsaasProvider` está pronto e inerte; checklist em `ASAAS-ADAPTER-REPORT.md`, com review obrigatória na virada). É também o que falta para a lane de dívida técnica provar o cancelamento contra o ambiente de teste real.

**9 · Verificação de identidade da conta Asaas (KYC).** Conclui `E04-PAY-T2`, hoje parado. Lead time de negócio, sem custo de código.

**12b · Liberação da conta Asaas para pagador estrangeiro.** Destrava o lote `ESTRANGEIRO-CHECKOUT`. Contatar o gerente de contas e pedir a liberação de cobrança para cartões emitidos no exterior, com prazo de cerca de 6 dias úteis. A liberação cobre cobrança avulsa ou assinatura, paga só por cartão internacional, e não cobre parcelamento nem link de pagamento. Antes de fechar a implementação, resolver as lacunas L1 e L6 do report `ESTRANGEIRO-PAGAMENTO-REPORT.md` com o gerente. Paliativo de custo zero enquanto não sai: comprador brasileiro paga pelo estrangeiro, que se inscreve com passaporte, sem tocar na RN-173.

## 🔧 Dívida técnica — em execução (lane DEBT-SWEEP)

> **Ordem sua de 2026-07-27, verbatim: "Dividas técnicas, resolvam todas."** A lane DEBT-SWEEP está rodando com a lista inteira, e por isso ela deixou de ser uma seção de decisão: nenhum item abaixo espera resposta sua. Ficam listados para você acompanhar o que a lane deve devolver. A única peça que a lane não fecha sozinha é a prova do cancelamento contra o ambiente de teste do Asaas, que depende da chave do item 8.

**T5 · o observador de sessão está copiado cinco vezes.** O mesmo hook de sessão do painel existe em cinco cópias idênticas, uma por área, e os próprios comentários apontam a saída: um provedor único acima da casca, com as cópias virando reexports finos, sem que nenhum consumidor ou teste precise mudar. Enquanto não acontece, trocar de área pode devolver a tela ao estado de carregando com a sessão já resolvida. Fonte: `PAINEL-NAV-DIAG-REPORT.md` §T5 · `IAMENU-REV-REPORT.md` §A-5.

**Dois testes vermelhos de base na suíte do painel.** Vêm de antes das lanes recentes e servem de âncora para a frase "zero vermelho novo". Um é o teste da navegação de plataforma, cuja tabela não acompanhou o item de taxa que a barra ganhou. O outro é o teste do salvamento de termos comerciais. Vermelho permanente treina o olho a ignorar vermelho, e um terceiro vermelho de verdade se esconde com facilidade no meio de dois conhecidos.

**A suíte do painel estoura tempo sob carga.** Nas duas rodadas de lote da NAV-FIX caíram seis testes por rodada por tempo esgotado, e o conjunto que falhou mudou entre as rodadas, que é assinatura de instabilidade e não de regressão. Todos voltaram verdes isolados. A suíte de funções passou por um saneamento próprio e provou a suíte inteira verde duas vezes seguidas; a do painel não teve o equivalente. Fonte: `SUITE-STAB-REPORT.md`.

**H7 · o menu do CRM e o hub de Eventos navegam sem ser links.** As duas superfícies trocam de aba por evento de clique, sem endereço no elemento. Nunca recarregaram a página, e foi por isso que ficaram fora da NAV-FIX, e também não dão ctrl+clique, clique do meio ou copiar endereço. Ficam invisíveis para o gate anti-regressão que percorre 37 âncoras em 8 superfícies. A receita já foi aplicada em sete superfícies, então é execução, não desenho.

**A-7 · clicar na aba em que você já está empilha histórico.** Clicar na aba ativa navega de novo para o mesmo endereço e acrescenta uma entrada no histórico, então o botão voltar repete a aba em vez de sair dela. O conserto é curto: não navegar quando o destino é igual ao endereço atual. Fonte: `NAVFIX-REV-REPORT.md` §A-7.

**Pré-deploy do Asaas: provar o cancelamento e arrumar o nome da chave.** A primeira ação é validar o `DELETE /payments/{id}` contra o ambiente de teste real, e ela fica parada até a chave do item 8 chegar. O escopo diminuiu depois da review: o modo de falha está provado seguro (fecha em vez de abrir, com 11 formatos divergentes e 9 códigos HTTP) e está provado que nenhuma das doze respostas plausíveis ao cancelamento deixa o comprador em negativa permanente. Resta conferir o formato da resposta. A segunda ação é de arrumação e a lane fecha sozinha: a chave de teste está guardada no slot chamado `ASAAS_PROD_API_KEY`, porque foi colada no bloco errado, e existe uma chave de produção morando num comentário do mesmo arquivo, o que foi o que tornou a rotação obrigatória (item 10). Nome de variável que mente sobre o ambiente é a classe de erro que faz alguém cobrar dinheiro de verdade acreditando estar em teste. Fonte: `R6-ASAAS-SANDBOX-REPORT.md` · `PIXCARRINHO-REV-REPORT.md`.

## 🧭 Fila de construção (ordem ratificada)

Formato curto de propósito. O detalhe de cada frente mora no card do backlog em [[V1-KANBAN]] e no épico correspondente; aqui ficam a ordem, o que cada posição espera e uma linha de por quê.

- **Posição 1 · fechar o caminho do dinheiro.** O pacote de estorno, com as cinco decisões que você deu em 27/07, e os cards de carrinho, temporizador e tela de processamento vêm antes de qualquer frente nova. É onde uma escolha errada custa dinheiro de comprador.
- **Posição 2 · E08, repasse parcial da comissão e aviso ao afiliado.** O painel do promotor está entregue (atribuição por link, comissão acumulando sozinha, estorno devolvendo certo, saldo e extrato dos dois lados, repasse manual registrado). Faltam duas peças: informar um valor menor que o saldo, com guarda de saldo na mesma transação e proteção contra repasse duplicado; e o aviso ao afiliado quando o repasse é registrado e quando a comissão cruza um marco, reusando o log e o disparo que já existem, sem canal novo. Sem o parcial, quem quer pagar metade paga tudo ou paga por fora e deixa o extrato mentindo. Rota opus com review antagonista, porque o valor informado entra na mesma transação que protege o saldo contra corrida e contra estorno posterior. O aviso espera a liberação do envio no Brevo (item 13); o parcial pode entrar já. Fonte: [[LEELA-E08-influenciador]] §S704-T2 e §S-E08-NOTIF.
- **Posição 3 · E10, consolidação das ativações de marcas (S812).** A tela de marcas existe e funciona. Faltam quatro tarefas: a função de índice inverso que mantém as ativações de cada marca e a soma delas a partir de vínculos que já existem, a tela de ativações com abas por tipo, o controle de exibir a logo ao atleta por item patrocinado, e o fechamento das duas dívidas que a tela declarou. Hoje a tela omite de propósito em quantos patrocínios cada marca é usada, porque não existe leitor barato para essa contagem e a casa não exibe número inventado. Item pequeno e isolado, por isso está cedo. Fonte: [[LEELA-E10-marcas]] §S812.
- **Posição 4 · FORMBUILDER, perguntas personalizadas na compra e na inscrição.** Você destravou em 2026-07-19. A v1 tem três tipos de pergunta (seleção única, múltipla, sim ou não) e as regras estão fechadas: a resposta fica com o inscrito ou o membro e nunca com o pedido, pergunta obrigatória sem resposta bloqueia o pagar no mesmo ponto do servidor que já barra os aceites, o teto de perguntas e opções (20 e 10) é constante única no núcleo, editar uma pergunta versiona e a resposta carimba a versão no ato, e as respostas saem na lista de inscritos que já existe. Anexo de arquivo fica para a fase 2. Fonte: [[LEELA-E04-config-vendas]] · [[LEELA-E05-clubs]] · [[LEELA-E12-landing]].
- **Posição 5 · E11, análise em CRM › Visão geral.** Seis tarefas planejadas. O histórico diário já é coletado (todos os dias às 03:05 um retrato dos indicadores é gravado por data, por substituição total e de forma idempotente), e é ele que destrava o seletor de período, hoje existente e honestamente inerte porque a tela lê sempre o retrato atual. A consolidação dessa série é o gargalo do épico: sem ela nenhuma das três telas de análise é despachável. Fonte: [[LEELA-E11-analytics]].
- **Depois da fila · app v1 como PWA.** Sua decisão de 2026-07-18 tirou o cadastro nas lojas do caminho do v1, e a reespecificação reduziu nove histórias para seis, com o ingresso passando a funcionar sem rede. Na ordem ratificada no mesmo dia, o horizonte 3 vem antes do 2, com a estratégia de terminar por projeto: o produto web inteiro (E08, E10, E11) fecha antes do app, e o Creator Studio permanece por último. Não há pendência de decisão agora. Fonte: [[LEELA-E13-app-atleta]] · [[ROADMAP]] §5.

## ✅ Resolvidas — referência

Uma linha por decisão fechada, com data, a decisão em meia frase e o ponteiro para onde vive o registro completo com o seu verbatim.

### Rodada de 2026-07-27 (DEC-0727D)

Registro completo: `02-rodadas/2026-07-27-decisoes/01-decisoes.md`.

- **Item 42:** a taxa de serviço volta dentro dos 7 dias de arrependimento e fica retida fora dessa janela.
- **Item 43:** cancelamento dentro da regra sai automático; fora da regra, só pelo painel admin interno.
- **Item 44:** o admin pode cancelar na véspera da prova.
- **Item 45:** cancelar sem devolver dinheiro existe — o admin cancela qualquer coisa e o organizador também, dentro da regra de cancelamento.
- **Item 46:** o estorno vai pela API do Asaas e quem confirma é o aviso do Asaas (webhook), não a resposta imediata; sem re-envio automático.
- **Item 26:** o relógio de 15 minutos começa no clique de "Garantir inscrição", não na primeira cotação. Virou card no backlog.
- **Item 30:** carrinho vencido é cancelado por tempo expirado, um a um, sem varredura geral. Virou card no backlog.
- **Item 31:** quem já pagou e espera a confirmação passa a ler "processando sua compra". Entrou no card do carrinho.
- **Item 47:** a tela ocupa o comprador com "processando sua compra" enquanto o servidor trabalha, e o botão de tentar de novo fica travado pelo tempo restante. Entrou no card do carrinho.
- **Item 33:** o menu lateral está aprovado e as teclas ficam no default.
- **Item 35:** campanha vencida fica como está; recriar é o caminho.
- **Item 16:** as fontes ficam embarcadas sempre, como no painel do organizador, se isso não prejudicar o carregamento. Virou card no backlog.
- **Item 14:** Leela+ sem mensalidade por ora, SaaS a R$ 249,00 e acréscimo de 2,5% a cada parcela, editável depois. Virou card no backlog.
- **Dívida técnica:** "resolvam todas" — a lista inteira virou a lane DEBT-SWEEP, em execução.

### Rodadas de 2026-07-26 e 2026-07-27

Registro completo: `02-rodadas/2026-07-26-decisoes/01-decisoes.md` e `02-rodadas/2026-07-27-decisoes/01-decisoes.md`.

- **Item 25 · 2026-07-26 (DEC-0726B):** antes de criar cobrança nova, a antiga é cancelada no gateway dentro do fluxo de criação. Implementado e revisado. RN-157.
- **Item 26 · 2026-07-26 (DEC-0726B):** o checkout tem 15 minutos da abertura para concluir, senão cancela; carrinhos abandonados viram dado para a fase 2. Implementado e revisado. RN-158. O ponto de partida do relógio fechou na DEC-0727D.
- **TAXA-FLEX · 2026-07-26 (DEC-0726):** comissão de afiliado sobre o valor de face (RN-310), taxa única por meio no v1, e reembolso não devolve a taxa de serviço. A terceira ponta voltou a ser mexida em 2026-07-27 e fechou no item 42.
- **Asaas · 2026-07-26 (DEC-0726):** bloco adiado sem urgência; a rotação da chave de produção continua obrigatória antes do primeiro deploy.
- **Item 27 · 2026-07-27 (DEC-0727):** pagamento que entra depois do cancelamento é estornado automaticamente, com o contador e alerta nascendo antes do gatilho. Entra no pacote de estorno.
- **Item 28 · 2026-07-27 (DEC-0727):** teto de 15 segundos por chamada ao gateway e "processando pagamento" na tela, em cartão e PIX. Lane ASAAS-TETO entregue e revisada.
- **P-IAMENU-1 · 2026-07-27 (DEC-0727):** separar quem vê o agregado de quem vê a ficha do CRM saiu do pré-go-live; volta quando o modelo de acessos admin em Configurações existir.
- **P-IAMENU-2 · 2026-07-27 (DEC-0727):** o disponível por evento abate os repasses vivos, e a reconciliação da função de derivação foi autorizada. Lane CAIXA-DISPONIVEL entregue e revisada. RN-351.
- **Itens 37, 38, 40 e 41 · 2026-07-27 (DEC-0727C):** a Caixa mostra três números (Receita Total, Disponível para Repasse, Valor Repassado); repasse sempre amarrado a um evento; evento não repassa mais do que está liberado; o nome é "Valor Repassado". Lane CAIXA-SIMPLES entregue, aguarda review antagonista. RN-367, RN-368 e RN-369 em [[LEELA-E09-financeiro-profissional]]. O disponível da Caixa passou a sair da mesma base do saque: no mock canônico do repo a tela dizia R$ 9.700 onde o modal aceitava R$ 8.000, e agora os dois dizem 8.000.
- **Item 29 · 2026-07-27 (DEC-0727E):** o simulador de pagamento pode responder "já cancelada" para cobrança desconhecida, apenas quando o pedido correspondente já venceu — afrouxamento restrito ao simulador, para teste no preview; a guarda continua lançando erro nos demais casos e a produção (`AsaasProvider`) fica intocada. Implementação como T7 da lane ESTORNO-ADMIN.
- **Item 13 · 2026-07-27 (DEC-0727E):** envio de e-mail no Brevo LIBERADO. Depois do seu "IP autorizado", o re-teste e2e passou verde às 23:12 — 1 e-mail transacional real enviado com `messageId`, para a sua caixa. Remetente verificado em vigor: `vitoreldp@gmail.com`, persistido em `functions/.env` (`BREVO_SENDER_EMAIL`). Destravam sem código novo: convite de assessoria (E18), convite de influenciador PF (E08) e campanhas do E06. Para produção com destinatários reais, o remetente de domínio próprio entra junto com o domínio (item 12); no deploy, a chave vai ao Secret Manager.

### Rodadas anteriores

- **2026-07-19 e a retomada do mesmo dia (DEC-0719 e DEC-0719-ret):** Firebase Storage ratificado (ADR-016, item 18) · upload obrigatório em toda superfície de imagem, com trocar e ajuste de proporção (itens 19, RN-168 e RN-170) · divisórias em todo SubNav (item 21, RN-229) · desconto retroativo do clube decidido na direção, implementação parada (item 22, RN-315 em vigor) · repasse manual ratificado e split recusado (item 23) · CRM com LGPD relevada por ora, hub confirmado e CPF único (item 24, RN-173) · decisões de checkout D-2, D-4, D-5, D-6 e D-7 (RN-154 a RN-157) · vínculo da conta à ficha só com pagamento e e-mail confirmados (RN-174) · estrangeiro com passaporte e cartão internacional, parado na liberação da conta (RN-175 a RN-177). Registro completo com verbatim integral: `02-rodadas/2026-07-19-decisoes/`.
- **Taxa percentual mais valor fixo por meio de pagamento · 2026-07-19:** decidida com tabela global e exceção por organizador, sem variação por evento no v1, e exibição do total por opção no checkout. RN-178 a RN-183. Registro: `02-rodadas/2026-07-19-taxa-flex/`.
- **Revisão de UX de 2026-07-18:** proporção da capa do evento fixada em 1600×838 px, até 2 MB, em JPEG, GIF ou PNG (item 20, RN-228) · app v1 como PWA · horizonte 3 antes do horizonte 2, terminando por projeto. Registro: `02-rodadas/2026-07-18-ux-review/`.
- **Rodada de 2026-07-17:** os 7 itens do painel ratificados, entre eles a ADR-013 de orquestração de pagamento aceita, a ADR-014 da cifra dos dados bancários mantida, quatro defaults de estoque, a reabertura de lote pelo painel admin (RN-304 e story S307, verbatim seu: *"o usuário organizador pode decidir voltar um lote à venda, essa reabertura pode acontecer pelo painel admin, aumentando o numero de vagas naquele lote, por exemplo. E mostraremos quanto foi vendido, quanto está disponivel e quanto foi configurado, de maneira que pode ser editado, e salvo."*), a numeração das RNs, a colisão da ADR-007 resolvida e os defaults de E17 e E18 · campanha agendada vencida não dispara (item 17, RN-136, verbatim preservado na RN) · inputs sem borda como default do design system · link na bio da Onda 3 apenas para o organizador. Registro nos épicos E04, E06 e E01 e em `.nirvana/briefs/leela-decisoes-consolidacao-2026-07-17-enriched.md`.
- **Trilha next-trail D1 a D6 · 2026-07-10 e 11:** kernel de pedidos na Frente A (ADR-011) · gateway Asaas · comunicação do evento no v1 · Onda 2 reconciliada · responsivo móvel obrigatório · as cinco prioridades P1 a P5 aplicadas ao jobs-to-be-done. Registro: `99-arquivo/next-trail/` e [[ROADMAP]] §5.
- **Defaults comerciais · 2026-07-05:** parcelamento de 2x a 12x com juros de 3,49% ao mês, tabela Price, repassado ao comprador (*"acrescido ao serviço"*, padrão de ticketeira; coeficiente de 12x igual a 0,103424 por parcela, cerca de 24,11% sobre o valor financiado; à vista sem juros) · taxa de serviço por transação percentual pura ou percentual mais fixo, configurável por cliente · defaults de 10% no cartão e 8% no PIX, editáveis · sem boleto · retenção de repasse de 15% pós-evento, editável · taxa incorporada ou repassada por evento (RN-347) · repasse D+2 ajustável e retenção por cliente (RN-348) · venda só por cupom (RN-303) · sem afiliados no início, E08 adiado · Leela+ pago com receita integral da Leela · v1 é vender e v1.5 é engajar. Registro: `05-discovery/decisoes-escopo-2026-07-04.md` e [[LEELA-E04-config-vendas]].
- **Entregas de 2026-07-11 a 13:** logos aplicadas · homepage e catálogo no ar · checkout em ambiente de teste no ar, fechando o marco de vender ponta a ponta · ação "Comunicar" aplicada · divergências do cupom reconciliadas no E04 · PercursoModal superseded pela ADR-012.
