# Decisões em aberto — painel do Vitor

> **Como ler.** Todo item tem a mesma forma: um parágrafo curto de contexto, depois o que fica com você, por que está na mesa agora, as opções com o default marcado e onde a resposta aterrissa. Nada aqui bloqueia código. Tudo roda com um default defensável em vigor, ratificar é confirmar o default, e mudar é ajuste no próximo lote.
>
> **Disciplina de limpeza.** Item resolvido sai deste painel na mesma aterrissagem. O registro completo, com o seu verbatim, passa a viver no arquivo da rodada em `02-rodadas/`. Este painel só carrega o que ainda é seu.
>
> **Última leva.** Você respondeu dezesseis itens em lote em 03/08. O registro completo, com o verbatim, as duas regras permanentes que ele gerou e as seis lanes que ele abriu, está em `02-rodadas/2026-08-02-retomada/08-achados-dono-0803.md` §DEC-0803B.
>
> **Personagens dos exemplos.** Ana compra, Castelo organiza eventos, Marina opera o painel, Téo é influenciador afiliado. São ilustrativos, não pessoas do banco.

## Decisões que dependem de você

### LGPD-1 · um organizador pode ficar ativo sem prova de que aceitou o termo

O cadastro carimba o consentimento com a versão do termo, a finalidade e a hora do servidor. Quando a escrita desse perfil falha, o resgate do convite recria o registro mais adiante — e o recria **sem** o consentimento, com a conta já em `ativo`. A pessoa marcou o checkbox; o registro nunca existiu; e nada no produto sinaliza quem está nessa situação. *A organizadora aceita o termo, a gravação falha, ela entra pelo convite e opera a plataforma inteira sem que exista uma linha provando o aceite.*

- **O que fica com você:** escolher um dos três caminhos. Não há default proposto, e isso é deliberado: a review se recusou a escolher porque inventar o carimbo de consentimento fabricaria justamente a prova que a regra recusa.
- **Por que agora:** é decisão jurídica, não técnica, e ela trava a partida. O **seed do primeiro código de convite fica retido** até você responder, então nenhum organizador entra por convite enquanto isso.
- **Opções:** recoletar no resgate, com o overlay pedindo o aceite junto do código quando o registro falta — custa uma linha na tela e um campo na chamada · recusar a ativação sem aceite, com mensagem própria mandando falar com o time — mais rígido, e tranca gente legítima na porta · marcar e varrer, com o registro nascendo com o consentimento explicitamente vazio e um relatório listando quem está sem — não resolve, mas para de esconder.
- **Onde aterrissa:** `resgatarConviteOrganizador` e o overlay de convite; RN-412 e RN-446. Registro completo em `02-rodadas/2026-08-02-retomada/08-achados-dono-0803.md §ONBOARD-REV`.

### ADMINSEP-1 · até onde vai "ambientes separados"

Você corrigiu um registro meu que já tinha virado código: a conta única vale para organizador e cliente, e a conta do painel admin é outra, com os ambientes separados por segurança. A parte das contas está fechada e entra na fila sem você. A palavra "ambientes" admite duas profundidades, e a segunda custa tempo de produto. *Hoje operar um evento e operar a plataforma é a mesma tela, no mesmo endereço, no mesmo pacote — `/plataforma` é uma rota do painel do organizador, e não existe fronteira nenhuma entre as duas.*

- **O que fica com você:** dizer se para em contas distintas ou vai até endereço próprio para o painel de administração.
- **Por que agora:** enquanto for a mesma origem, qualquer falha de tela no painel do organizador alcança o token que abre a plataforma inteira. Decidir depois custa o mesmo; decidir agora deixa a fila inteira coerente de uma vez.
- **Opções:** contas distintas apenas, que já atende a sua frase na letra (**default proposto**, e é o que entra na fila de qualquer forma) · somar um endereço próprio para o painel admin, saindo do mesmo repositório, que compra fronteira de origem de verdade e permite ligar App Check só nele — segunda onda, não bloqueia nada · projeto Firebase separado, que eu **recomendo recusar**, porque o administrador opera sobre o mesmo banco cross-tenant e a fronteira que importa é o token, não o projeto.
- **Onde aterrissa:** `02-rodadas/2026-08-02-retomada/09-spec-contas-e-area-cliente.md` §Parte 3; RN-449 em [[LEELA-E00-fundacao-tecnica]] e [[LEELA-E16-plataforma-superadmin]].

### ADMINSEP-2 · o botão da área do cliente leva ao painel do organizador, não ao de plataforma

Ao definir a área do cliente você pediu "um botão para entrar na área de administrador". A frase tem duas leituras e elas mudam o desenho, então prefiro perguntar a presumir: presumir a sua intenção em silêncio foi exatamente o que produziu o erro que você acabou de corrigir. *Você abre a área do cliente e clica no botão: ou ele te leva ao painel de quem produz eventos, ou ele te leva ao painel da plataforma, que você acabou de mandar viver em outra conta.*

- **O que fica com você:** ratificar a leitura, ou trocar.
- **Por que agora:** é uma linha na tela e uma linha na spec agora; depois de construída é retrabalho.
- **Opções:** é a área do **organizador**, e o botão só aparece para quem também é organizador (**default proposto**, porque é a única leitura que produz um botão útil — sob a outra, como o painel de plataforma passa a viver em conta separada, o botão nunca apareceria para um cliente) · é o painel de plataforma, e aí o botão existe mas nasce morto.
- **Onde aterrissa:** RN-451 em [[LEELA-E12-landing]]; task B5 em `02-rodadas/2026-08-02-retomada/11-fila-contas-e-area-cliente.md`.

### SENHA-1 · o e-mail de "esqueci minha senha" é o único sem cara de Leela

Vale primeiro desfazer uma confusão: o e-mail de **primeiro acesso**, o que a pessoa recebe depois da primeira compra, **já é nosso** — layout da Leela, remetente da Leela, enviado pela Brevo. O que sai com template genérico e remetente `noreply@leela-hub.firebaseapp.com` é o outro, o "esqueci minha senha" do painel, porque nesse caminho quem dispara é o Firebase. *A organizadora esquece a senha, pede recuperação, e recebe um e-mail que não parece ter vindo da Leela.*

- **O que fica com você:** se vale trazer esse e-mail para a Brevo agora ou deixar para depois.
- **Por que agora:** você já pediu logo e identidade nos e-mails, e o canal da Brevo acabou de ser desbloqueado. É o único e-mail do fluxo de conta que ficaria de fora.
- **Opções:** deixar como está por ora, já que o e-mail que o cliente recebe é o nosso e este só aparece para quem esquece a senha (**default proposto**) · trazer para a Brevo no mesmo lote da correção do link, o que custa um template novo e um caminho de envio próprio.
- **Onde aterrissa:** `packages/api-client/src/auth.ts`; RN-453 em [[LEELA-E12-landing]].

### DEPLOY-1 · a porta de entrada do organizador está pronta e não está no ar

O pacote inteiro foi construído, revisado por antagonista em contexto fresco e está verde: cadastro aberto, tela de convites no super-admin, resgate atômico, overlay bloqueante e o roteamento pós-login que você ratificou. Nada disso foi para produção. *Você abre o site hoje e não existe onde um organizador novo clique para entrar.*

- **O que fica com você:** dizer quando sobe.
- **Por que agora:** subir abre publicamente a entrada do organizador na landing e o cadastro aberto. Duas coisas pesam na conta e nenhuma delas é bloqueio: o veto **LGPD-1** acima está aberto, mas ele só se materializa no resgate de convite, e **nenhum convite foi semeado em ambiente nenhum** — a porta sobe fechada na prática; e a borda volumétrica (App Check e Cloud Armor desligados) vale para o cadastro aberto, que é o que fica exposto.
- **Opções:** subir agora com o seed retido — **é a recomendação do maestro**, porque a jornada fica inalcançável sem convite e o roteamento pós-login já corrige em produção um destino que hoje erra · esperar a decisão LGPD-1 antes de qualquer deploy · subir só o roteamento pós-login e segurar a entrada na landing.
- **Onde aterrissa:** deploy de `apps/painel`, `apps/landing`, `functions` e das Rules do Firestore, a partir dos commits `d0b7cd49..37b9ec94`. A recomendação está registrada como recomendação; nada foi executado.

### 12 · domínio público

Todo endereço do produto ainda é o marcador `{DOMINIO_LEELA}`, e o remetente definitivo do e-mail depende dessa escolha. *O Castelo quer divulgar a página do evento no Instagram e o endereço de hoje nasce para quebrar.*

- **O que fica com você:** cravar o domínio público da Leela.
- **Por que agora:** o produto já está no ar em `leela-landing.web.app` e o e-mail transacional sai por `vitoreldp@gmail.com`, que o DMARC do Gmail tende a jogar em spam quando a Brevo envia por ele.
- **Onde aterrissa:** env dos dois apps, substituição do marcador nas specs e verificação DKIM/SPF/DMARC na Brevo. Puxa junto o item 66 e o placeholder `contato@leela.app`, que a porta de entrada do organizador já usa como CTA de "Falar com o time Leela".

### 66 · o botão "Ver página pública" aponta para um domínio de terceiro quando falta configuração

O link que o afiliado copia já está resolvido: sem endereço configurado ele não sai, e a tela diz isso. O botão de navegação interna do organizador continua com `be-hero.com.br` cravado como último recurso, o mesmo domínio que você expulsou do e-mail da compra. *Você abre um ambiente novo para um teste, clica em "Ver página pública" e cai no site de outra empresa.*

- **O que fica com você:** ratificar a retirada do domínio do código.
- **Por que agora:** em produção a configuração existe e o botão vai para o lugar certo; o risco é o ambiente novo que nascer sem ela, e a porta de entrada do organizador cria ambientes agora.
- **Opções:** o botão declara que o ambiente não tem endereço configurado, o que é uma linha (**default proposto**) · manter o fallback fixo.
- **Onde aterrissa:** `PUBLIC_BASE` em `apps/painel/src/lib/linkPublico.ts`. Some junto com o item 12.

### PB-11 · no retry, a prova de aceite carimba a versão que a pessoa não leu

A conferência de versão vale na criação do pedido: se a tela declara uma versão diferente da vigente, o servidor recusa. No retry de uma compra já nascida, o carimbo usa a vigente sem conferir a exibida, e isso está medido: pedido sem bloco de aceite, política na v3, retry declarando a v1, resultado carimba a v3. *A Ana aceita a v1, a política vira v3 no meio da compra, e o retry carimba a v3 que ela nunca leu.*

- **O que fica com você:** escolher entre prova ausente e prova errada. Recusar ali deixaria sem prova um pedido já pago.
- **Por que agora:** é decisão jurídica, não técnica, e o caso de teste já está escrito no ponto exato onde a decisão vira código.
- **Opções:** carimbar a vigente e manter a compra viva (**em vigor**) · recusar o retry divergente e ficar sem prova nesse pedido.
- **Onde aterrissa:** `aceitesVersaoExibida.integration` e o caminho de replay de `createInscricaoCharge`.

## Ações que só você pode executar

### ADMINSEP-3 · a conta de super-admin de produção é a conta de demonstração

Achado enquanto eu apurava a separação de contas que você pediu. A conta que administra a plataforma em produção é `admin@demo-leela.dev`, com a senha `demo1234` — a mesma senha de vitrine que está publicada no repositório. O seed de produção a criou de propósito, junto com as contas de demonstração, e o login já foi provado funcionando contra `leela-hub`. *Qualquer pessoa que abra o repositório tem, hoje, a senha da conta que enxerga o CPF e o telefone de todos os inscritos de todos os organizadores, lê dados bancários em claro, aprova repasse, estorna compra, muda a tabela de taxa e cria outros administradores.*

- **O que fica com você:** escolher o e-mail real do administrador da plataforma e definir uma senha de verdade. Só você pode fazer as duas coisas.
- **Por que agora:** é fator único, sem segundo fator, com App Check desligado, e o produto já está no ar com dado real de compra. Não depende de nenhuma decisão de arquitetura, e não espera o ADMINSEP-1.
- **Onde aterrissa:** a conta nova recebe a claim pelo caminho manual, que já é o declarado para produção; o seed para de semear administrador contra o projeto real; e a conta de demonstração é revogada. O passo a passo está na task A6 de `02-rodadas/2026-08-02-retomada/11-fila-contas-e-area-cliente.md`. As contas de organizador de demonstração podem ficar: elas não alcançam a plataforma.

### 34 · a jornada completa no ar, com a compra real

Você decidiu em 28/07 que a revisão vira uma só, do início ao fim: a home com as experiências, o produtor, a página do evento, a compra e o QR do ingresso na tela. O mesmo passeio ratifica a ADR-017, que deu ao design system duas portas sem a dependência que quebrava a landing com erro 500.

- **O que fica com você:** percorrer a jornada e comprar de verdade, com valor baixo. É o teste canônico do go-live.
- **Por que agora:** a investigação de 02/08 provou que a função de cobrança nunca devolveu sucesso em produção, porque o identificador enviado ao banco tinha 155 caracteres num limite de 100. O conserto está no ar, revisado por antagonista, e `createInscricaoCharge` segue com zero sucesso na história.
- **Onde aterrissa:** `https://leela-landing.web.app/meia-floripa-2026/inscricao`, com os cupons de teste HEROI10 e CORRA50 válidos até 08/09. A compra prova de uma vez o identificador aceito pelo gateway, o juro na tela e no documento, a conferência de versão do aceite e a origem carimbada na prova.

### 69 · conferência visual das telas novas, no mesmo passeio

Sete coisas entraram no ar entre 02 e 03/08 e nenhuma delas tem gate de código que substitua o seu olho: os três ícones de rede desenhados em casa (WhatsApp, TikTok e Strava não existem no lucide), o menu Feed · Eventos · Clubs na página do produtor, o respiro do rótulo nos grupos de escolha, o toque em qualquer ponto do cartão de modalidade e kit, e os três consertos do checkout de 03/08.

- **O que fica com você:** olhar e vetar o que não estiver certo. Cada peça é troca barata.
- **Por que agora:** tudo está servido em produção, incluindo a página do produtor, e os vetos ficam mais caros depois que houver compra real em cima.
- **Onde aterrissa:** `https://leela-landing.web.app/@castelo` para o menu e os ícones; `.../meia-floripa-2026/inscricao` para o select de parcelas completo na primeira abertura, o total que muda no ato e o loader "Preparando código PIX" só depois do clique. A copy "Modalidades disponíveis" e "Modalidade oficial" está nas duas.
- **Entra no mesmo passeio quando for ao ar:** as telas da porta de entrada do organizador, construídas e já revisadas, e que só sobem quando você responder o **DEPLOY-1**. O botão de pagar você confere depois da S1219, que troca a frase "Atualizando o total…" pelo spinner que você aprovou.

### JUROS-1 · salvar os termos comerciais no painel, para selar o rastro

A escrita de 03/08 foi minimalista por ordem explícita, então o documento vigente ficou em `versao: 1` enquanto o retrato imutável `v1` ainda diz juros zero. Nada quebra por causa disso, mas o histórico da v1 deixou de ser fiel.

- **O que fica com você:** abrir os termos e salvar sem mudar nada.
- **Por que agora:** o próximo save pelo painel grava a v2 já com 2,89% e sela o rastro pelo caminho canônico, que é o único jeito de o histórico voltar a bater.
- **Onde aterrissa:** `/plataforma` → Termos do tenant Castelo Produções.

### 11 · os três segredos do primeiro deploy — status a confirmar

São três valores de configuração que o servidor precisa ter, cada um protegendo uma coisa diferente: a chave que cifra os dados bancários (`BANK_DATA_KEY`), o endereço do monitoramento de erros e a semente que embaralha a identificação dos clientes no CRM (`CRM_ID_PEPPER`).

- **O que fica com você:** nada de imediato. A execução é da esteira, não sua.
- **Por que agora:** o primeiro deploy real já aconteceu e o item nasceu com a moldura "antes do primeiro deploy", que envelheceu.
- **Falta verificar:** o audit log da DEPLOY-FINAL prova `CRM_ID_PEPPER`, `ASAAS_API_KEY` e `ASAAS_WEBHOOK_AUTH_TOKEN` presentes no `runWith` de `createInscricaoCharge` em `leela-hub`. `BANK_DATA_KEY` e o endereço do Sentry não foram conferidos em produção. Sem `BANK_DATA_KEY`, o cadastro bancário falha fechado e não abre.
- **Onde aterrissa:** Secret Manager do projeto `leela-hub`; fontes `COMF2-REPORT` e `E19-CRM-REPORT`.

### 12b · liberação da conta Asaas para pagador estrangeiro

Adiado por você em 26/07 e ninguém está cobrando. Fica listado porque o checkout de estrangeiro segue parado enquanto isso, e o lote `ESTRANGEIRO-CHECKOUT` nem contato com o gerente de contas teve.

- **O que fica com você:** contatar o gerente de contas do Asaas e pedir a liberação de cobrança para cartões emitidos no exterior, com prazo de cerca de 6 dias úteis.
- **Por que agora:** nada empurra. A liberação cobre cobrança avulsa ou assinatura, paga só por cartão internacional, e não cobre parcelamento nem link de pagamento.
- **Onde aterrissa:** lacunas L1 e L6 do `ESTRANGEIRO-PAGAMENTO-REPORT.md`, a resolver com o gerente. Paliativo de custo zero enquanto não sai: comprador brasileiro paga pelo estrangeiro, que se inscreve com passaporte, sem tocar na RN-173.

## Hipótese a validar em campo

### HIP-R9-01 · pré-compra do clube-influenciador

Não é decisão a ratificar, é hipótese a testar com um organizador de verdade. Inscrições pelo link do clube entrariam em pré-compra e, ao atingir o mínimo definido pelo organizador, dispararia a cobrança de todas. *O Castelo publica o link com meta de 30 inscrições para liberar 20% de desconto, e a trigésima chega no oitavo dia, quando a reserva do cartão das primeiras já venceu.*

- **O que fica com você:** uma conversa com um organizador real que responda as quatro questões de dinheiro. A janela da reserva no cartão, o que acontece quando o mínimo nunca é atingido, o que fazer com recusas parciais no disparo em lote, e se a pré-compra reserva vaga e estoque enquanto aguarda.
- **Por que agora:** nada bloqueia. A versão retroativa do desconto é a parte cara, porque reabre reprocessamento de vendas já pagas, e segue parada.
- **Opções:** validar em campo antes de escrever regra (**default conservador em vigor**: RN-315, o link do clube só ativa o desconto ao cruzar o mínimo, sem cobrança em lote).
- **Onde aterrissa:** `02-rodadas/2026-07-18-ux-review/03-stories.md §S-R9-11`. Quando entrar, é dinheiro: rota opus com review antagonista obrigatória.

## Fila de construção

> Ordem ratificada por você em 28/07 (DEC-0728). Roda em sequência sem nova consulta, e o detalhe de cada frente vive no card do backlog em [[V1-KANBAN]] e no épico correspondente. As frentes que nasceram da sua leva de 03/08 estão no fim, ainda sem posição.

### Construída e revisada · porta de entrada do organizador

A landing ganhou "Entrar" e "Criar conta", o cadastro abre com acesso travado por overlay de código de convite, e os códigos são geridos por você no super-admin. *Hoje um organizador novo não tem onde clicar para entrar, e quando entrar ninguém controla quem usa a plataforma.*

- **O que fica com você:** duas coisas, e as duas subiram para o topo deste painel como itens próprios: o **LGPD-1** e o **DEPLOY-1**. As dez premissas vetáveis seguem valendo por default sem veto seu.
- **Por que agora:** a construção terminou em 03/08 com as oito tarefas pagas, e a review antagonista fechou na madrugada de 04/08: dez vetores atacados, três defeitos achados e corrigidos, gate final verde nas seis superfícies. Nenhum dos três defeitos era de tela — um deixava a conta nascer sem registro, um vazava o oráculo de qual código existe, e um deixava o overlay bloqueante transparente.
- **Onde aterrissa:** lanes ONBOARD-BUILD e ONBOARD-REV, rodada `02-rodadas/2026-07-28-onboarding-organizador/`. Duas pontas menores seguem abertas e nenhuma é sua: o seed do primeiro código de convite está **retido** até o LGPD-1, e o CTA "Falar com o time Leela" está com o placeholder `contato@leela.app`, que morre junto com o item 12.

### Posição 1 · E10, consolidação das ativações de marcas

A tela de marcas existe e funciona, mas omite de propósito em quantos patrocínios cada marca é usada, porque não existe leitor barato para essa contagem e a casa não exibe número inventado. *A Marina apaga "Café Rota" sem saber que era o patrocinador de um desafio.*

- **O que fica com você:** nada. A ordem já está ratificada.
- **Por que agora:** item pequeno e isolado, por isso está cedo na fila. A auditoria achou um bloqueio que entra antes de tudo: nenhum vínculo guarda o id da marca, só o nome, e casar por nome perde o vínculo no primeiro rename.
- **Onde aterrissa:** S812, cinco tarefas em [[LEELA-E10-marcas]].

### Posição 2 · FORMBUILDER, formulários como template

O organizador monta perguntas próprias numa biblioteca com casa no menu principal, e cada evento ou clube só escolhe um template. Publicar versão nova não mexe em quem já usa. *Hoje o Castelo monta formulário fora do sistema e cruza duas planilhas na véspera.*

- **O que fica com você:** nada. Você puxou a frente em 28/07 e as regras estão fechadas.
- **Por que agora:** a v1 tem três tipos de pergunta, a resposta fica com o inscrito e nunca com o pedido, pergunta obrigatória bloqueia o pagar no mesmo ponto do servidor que já barra os aceites, e anexo de arquivo fica para a fase 2.
- **Onde aterrissa:** S313 e S310 em [[LEELA-E04-config-vendas]] · [[LEELA-E05-clubs]] · [[LEELA-E12-landing]].

### Posição 3 · E11, análise em CRM › Visão geral

O histórico diário já é coletado, com um retrato dos indicadores gravado por data todos os dias às 03:05, de forma idempotente. *A Marina troca o seletor de período para comparar 30 dias com os 30 anteriores e os números não mudam.*

- **O que fica com você:** nada.
- **Por que agora:** a consolidação dessa série é o gargalo do épico. Sem ela nenhuma das três telas de análise é despachável, e o seletor de período segue honestamente inerte, lendo sempre o retrato atual.
- **Onde aterrissa:** seis tarefas em [[LEELA-E11-analytics]].

### Posição 4 · E16, catálogo de benefícios da plataforma

Você, como administrador Leela, cadastra cupons de benefício e parceiros presenciais com endereço, descritivo, capa, logo e fotos. O cupom aqui não é o cupom de venda do organizador e não encosta em preço, taxa nem repasse.

- **O que fica com você:** confirmar essa leitura, se ela estiver errada. É barato refazer, porque nada foi construído em cima.
- **Por que agora:** prioridade baixa declarada por você em 28/07, e não bloqueia nada. Ficou no E16 porque quem escreve é o administrador da plataforma e o dado atravessa produtores.
- **Onde aterrissa:** [[LEELA-E16-plataforma-superadmin]] §"Catálogo de benefícios da plataforma".

### Entrou em 03/08 · o login no meio da landing

Hoje "Entrar" leva a uma página própria. Você pediu que a entrada vire um componente overlay no meio da landing inicial, sem tirar a pessoa do lugar onde ela estava. *A Marina clica em "Entrar" na home, perde a página que estava lendo e volta para ela depois de logar.*

- **O que fica com você:** a posição na fila, quando quiser cravá-la. O desenho já está decidido.
- **Por que agora:** a porta de entrada acabou de nascer e trocar a forma dela agora custa menos do que depois que houver organizador entrando todo dia.
- **Onde aterrissa:** S1221 em [[LEELA-E12-landing]], com a tela de entrar que a lane da porta de entrada acabou de construir.

### Entrou em 03/08 · a área do cliente no web, com os próprios ingressos

O e-mail da compra manda um link por inscrito e a página do ingresso existe, mas não há lugar no site onde a compradora entre e veja tudo o que ela já comprou. Você nomeou a lacuna ao decidir o item 60. *A Ana perde o e-mail, tem o QR em algum lugar da caixa de entrada e não tem para onde ir no site.*

- **O que fica com você:** a posição na fila e o recorte da v1, se quiser apertá-lo.
- **Por que agora:** o item 60 fechou a spec pelo lado barato, então o que sobra da promessa "estamos emitindo seu ingresso" é justamente esta área.
- **Onde aterrissa:** S1222 em [[LEELA-E12-landing]], sobre o mesmo bilhete assinado da página do ingresso.

### Entrou em 03/08 · uma conta só para quem é admin e organizador

Você decidiu que a mesma pessoa pode ser administradora da plataforma e usuária do painel com **uma conta só**, e que a tela de ver e trocar entre os papéis fica deliberadamente para depois. *Você entra com a sua conta e precisa decidir, na hora, se está olhando como Leela ou como produtor.*

- **O que fica com você:** nada agora. Adiado por sua decisão, não por falta de desenho.
- **Por que agora:** nada empurra. O roteamento do item 57 já resolve o caso comum, mandando cada papel para a casa dele.
- **Onde aterrissa:** [[LEELA-E16-plataforma-superadmin]], quando sair do gelo.

### Entrou em 03/08 · antecipação de recebíveis sob demanda

A tabela de juros do admin, que a PB-2 e a JUROS-2 destravam, é o primeiro degrau de uma visão maior que você declarou: juntar custo de parcelamento e custo de antecipação, aplicar markup e enxergar o faturamento da plataforma ao longo do tempo. A antecipação seria **sob demanda**, nunca automática, operada pelo painel admin e antecipando só o necessário para cobrir repasses.

- **O que fica com você:** nada agora. Suas palavras: "cena para os próximos capítulos".
- **Por que agora:** não empurra nada. Fica escrito para que a tabela de juros nasça com a coluna de custo já pensando nela.
- **Onde aterrissa:** [[LEELA-E09-financeiro-profissional]] · [[LEELA-E16-plataforma-superadmin]], depois da S1610.

### Entrou em 03/08 · dois eventos publicados estão inacessíveis em produção agora

A página pública decide se o evento está à venda olhando só para os lotes. Evento publicado que não tem lote serve "Inscrições encerradas", mesmo quando o servidor tem preço válido e cotaria a compra sem reclamar. A vitrine e o motor discordam, e quem perde é quem publicou. *O Castelo publica um evento, divulga o link e a página diz que as inscrições acabaram antes de a primeira começar.*

- **O que fica com você:** a posição na fila. A decisão embutida é qual das duas fontes manda, e ela é técnica: ou o lote continua sendo a única autoridade de venda, e então publicar sem lote passa a ser recusado ou avisado no painel, ou a página cai no preço legado quando não há lote.
- **Por que agora:** não é hipótese. `noturna-beira-mar-2026` e `retiro-bem-estar-rio-vermelho-2026` estão publicados e inacessíveis em produção **hoje**, achado medido pela lane de dados de teste de 03/08. **Prioridade alta na fila.**
- **Onde aterrissa:** `estadoVenda.ts` na landing e a validação de publicação no painel; ponta registrada em [[LEELA-E12-landing]].

### Entrou em 03/08 · a conta que nasce sem registro fica trancada do lado de fora

O cadastro grava a conta de login e o registro do organizador em dois passos. Se o segundo falhar, a conta existe e o registro não, e o login seguinte barra a pessoa com um aviso. Ela não consegue resgatar convite, porque o resgate vive atrás do login, nem se recadastrar, porque o e-mail já está em uso. *A organizadora se cadastra, a rede oscila no instante da gravação, e ela nunca mais entra na própria conta.*

- **O que fica com você:** a posição na fila. A causa que o formulário produzia sozinho já foi fechada pela review de 03/08; o que sobra é falha de rede, quota ou indisponibilidade.
- **Por que agora:** hoje a única recuperação é intervenção manual no super-admin, e isso não escala nem para o beta. Duas saídas possíveis, ambas de produto: o cadastro tentar de novo e mostrar na tela que faltou algo antes de a pessoa sair, ou a tela de entrar oferecer o campo de código quando barra — o que transforma o aviso em porta.
- **Onde aterrissa:** `CadastrarPage` e `EntrarPage`; RN-411, RN-446 e RN-449 em [[LEELA-E00-fundacao-tecnica]].

### Entrou em 03/08 · a borda que segura força bruta não está ligada (pendência do CTO)

Não é decisão sua, e está aqui só para você saber que existe e quem a carrega. O teto de tentativas do resgate de convite é por conta, e o cadastro é aberto: o teto global é cinco vezes o número de contas que alguém criar. O que torna a adivinhação inviável é o tamanho do espaço de códigos, quase 10¹², não o limitador. O throttle volumétrico de verdade é da borda — App Check e Cloud Armor —, e nenhum dos dois está ligado.

- **O que fica com você:** nada. Vai para o **CTO humano**, junto do item 62 (`minInstances`), porque é julgamento de custo de infraestrutura.
- **Por que agora:** o custo de deixar assim é faturado — cada tentativa é uma invocação de função mais uma transação no banco. Entra na conta do DEPLOY-1, já que é o cadastro aberto que fica exposto.
- **Onde aterrissa:** seção "Pendência do CTO" em `02-rodadas/2026-08-02-retomada/08-achados-dono-0803.md`; ponta técnica registrada em [[LEELA-E16-plataforma-superadmin]].

### Depois da fila · app v1 como PWA

Sua decisão de 18/07 tirou o cadastro nas lojas do caminho do v1, e a reespecificação reduziu nove histórias para seis, com o ingresso passando a funcionar sem rede. *A Ana chega ao ginásio sem sinal e hoje o ingresso dela precisa de rede.*

- **O que fica com você:** nada agora.
- **Por que agora:** na ordem ratificada no mesmo dia, o horizonte 3 vem antes do 2, com a estratégia de terminar por projeto. O produto web inteiro fecha antes do app, e o Creator Studio permanece por último.
- **Onde aterrissa:** [[LEELA-E13-app-atleta]] · [[ROADMAP]] §5.
