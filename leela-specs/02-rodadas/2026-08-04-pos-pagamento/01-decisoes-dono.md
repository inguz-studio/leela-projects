---
tags: [leela, decisoes, rodada, checkout, pos-pagamento, area-do-cliente, arena-social, ingresso, pdf, codigo-pedido]
trace: leela-pixreal-diag-20260804
lote: SPEC-POSPAG
data: 2026-08-04
---

# Rodada de decisões do dono — 2026-08-04 (DEC-0804) · pós-pagamento em tela e Arena Social

O dono leu o diagnóstico do primeiro pagamento real (`.nirvana/outputs/leela-pixreal-diag-20260804/DIAG-PIXREAL-REPORT.md`; registro elo a elo em [[fluxo-pos-pagamento]]) e devolveu duas mensagens. A primeira corrige uma leitura minha sobre o E12 e define o feedback pós-compra em tela; a segunda responde a pergunta de esclarecimento sobre a Arena Social. As três primeiras decisões abaixo saem delas.

Em 05/08, depois de percorrer a página do ingresso já no ar, ele devolveu uma quarta decisão, de outro assunto: o botão que salva o ingresso em PDF. Ela entra aqui como **D-0804-4** porque a rodada é a unidade de registro e esta ainda está aberta. No mesmo dia veio a **D-0804-5**, sobre o tamanho dos identificadores de compra, pelo mesmo motivo.

## Verbatim do dono

Mensagem 1:

> "mas precisamos dar o feedback do proprio pedido. acredito que possa ter rolado algum erro de interpretação, quanto ao e12. Mas o usuário pode ver o proprio pedido sim, mas após concluir a compra e também na área do cliente, e precisamos dar uma resposta para ele ou em tela, no caso de pix ou em cartao também. Mas de inicio podemos colocar a mensagem 'Estamos confirmando o seu pedido' e abaixo, um CTA para ele visualizar os proprios pedidos dentro do sistema, e uma orientação para confirmar a caixa de e-mail pois enviaremos o acesso do ingresso por lá. a ára do cliente ja foi especificada. Quero também ter uma área 'Arena Social', onde a pessoa pode informar os dados dela, como mini bio, genero, generos de interesse, interesses (dentro dos pilares de bem-estar), e uma foto. que é a mesma da conta."

Mensagem 2, respondendo à pergunta "gêneros de interesse significa o quê?":

> "sao duas coisas, experiencias e pessoas."

## As decisões, estruturadas

### D-0804-1 · o comprador PODE ler o próprio pedido — após concluir a compra e na área do cliente

O dono confirma que houve erro de interpretação quanto ao E12, e a leitura correta é: **o TODO das rules era sequenciamento, não intenção de produto.** O comentário em `firestore.rules:2528-2530` — *"TODO(E12/checkout): o responsável/atleta lê o PRÓPRIO pedido só na story do checkout, com teste (…) NÃO abrir antes"* — nunca proibiu o comprador de ver o pedido; ele adiava a abertura para a story certa, com teste. A story certa chegou: é a do feedback pós-compra (S1225), e a abertura da leitura entra **nela** (S1225-T1), nunca antes nem separada do teste.

O alcance é o que o dono disse, e só ele: o comprador lê o **próprio** pedido, **após concluir a compra** (a tela de confirmação do checkout) **e na área do cliente**. Terceiros continuam negados, a escrita continua `write: if false`, e nenhuma outra Rule de coleção tenant-scoped abre. Regra canônica: **RN-469** em [[LEELA-E12-landing]].

### D-0804-2 · feedback pós-pagamento em tela, para PIX e para cartão

A resposta ao comprador deixa de depender só do e-mail: **precisa existir em tela**, tanto no PIX quanto no cartão. A v1 que o dono fixou:

1. a mensagem **"Estamos confirmando o seu pedido"**;
2. abaixo, um **CTA para visualizar os próprios pedidos dentro do sistema**;
3. e uma **orientação para conferir a caixa de e-mail**, porque o acesso do ingresso vai por lá.

Consequência que a spec detalha: a copy atual do PIX promete *"a confirmação chega sozinha, em segundos — não é preciso avisar aqui"* (`StepPagamento.tsx:256-260`) sem nenhum canal em tela que cumpra a promessa; ela precisa parar de mentir na mesma entrega. Regra canônica: **RN-470** em [[LEELA-E12-landing]]. Story: **S1225**.

### D-0804-3 · Arena Social

Área nova onde a pessoa informa os dados dela:

| Campo | O que é |
|---|---|
| Mini bio | texto curto de apresentação |
| Gênero | o gênero da própria pessoa |
| Gêneros de interesse | **dois campos distintos**, pela mensagem 2: (a) gêneros de **pessoas** com quem tem interesse em se conectar nas experiências e (b) tipos de **experiência** de interesse |
| Interesses | dentro dos **pilares de bem-estar** |
| Foto | **a mesma da conta** — reaproveitada, não é upload separado |

Vocabulário D-0802-1 vale integralmente: experiência e participante, nunca evento/corrida/atleta na superfície. Regras canônicas: **RN-471** (escopo e campos) e **RN-472** (dado sensível e consentimento) em [[LEELA-E12-landing]]. Story: **S1226**.

Três coisas sobem ao painel como vetáveis, porque a frase do dono não as decide: quem vê o perfil (**ARENA-1**), a lista dos pilares de bem-estar, que não existe em nenhum doc do repo (**ARENA-2**), e onde a Arena Social mora — o default é a área do cliente, mas o E17 (perfil social) é sinal de outra intenção possível e a premissa não vai em silêncio (**ARENA-3**).

### D-0804-4 · o ingresso ganha um botão que gera o PDF como download (refina o P10 de 29/07)

Verbatim do dono, em 05/08, com a página do ingresso aberta na frente dele:

> "no ingresso quero que tenha um botão também, "salvar como PDF" , onde é gerado um pdf do ingresso como download, se o usuário quiser"

O que a frase decide, sem nenhuma interpretação minha por cima: existe um **botão** na página do ingresso; ele se chama **"salvar como PDF"**; o que ele produz é um **PDF gerado, que desce como arquivo**; e ele é **opcional** — "se o usuário quiser" quer dizer que nada muda para quem não clicar.

O que a frase **supera**: a premissa **P10** da rodada de 29/07 (`../2026-07-29-pagina-ingresso/01-decisoes-delta.md`) dizia *"o PDF é a página em versão imprimível; nenhum gerador server-side entra agora"*. A primeira metade continua de pé — a rota `/ingresso/{token}/imprimir` existe, sai em A4 e continua sendo o caminho do papel. A segunda metade cai, e cai pelo verbo que o dono usou: ele pediu um PDF **gerado**, baixado. O diálogo de impressão do navegador não é isso. Ele pede que a pessoa ache "Salvar como PDF" dentro de um menu de impressora que muda de lugar a cada navegador e a cada sistema, e que em boa parte dos celulares nem oferece a opção. **P10 fica refinada, não revogada**, e a RN-424 é emendada em vez de substituída: a versão imprimível é a forma de papel, o botão é a forma de arquivo, e as duas convivem.

**Como o PDF é gerado é decisão de engenharia**, não de dono, e já está tomada — com a alternativa rejeitada nomeada — em `05-spec-pdf-ingresso.md`. Nada disso sobe ao painel. Regra canônica: **RN-473** em [[LEELA-E12-landing]]. Story: **S1214**, task nova **S1214-T5**.

### D-0804-5 · o identificador da compra encolhe e ganha prefixo

Verbatim do dono, em 05/08, nas duas mensagens que formam a decisão:

> "nossos identificadores dos ingressos também estao muito grandes, como poderiamos resolver isso com prefixos, e 5 dígitos alfanumericos?"

> "identificadores de compras, na verdade\*\*"

A segunda mensagem corrige o alvo da primeira e é ela que vale: o que encolhe é o identificador da **compra**, o pedido. O código do ingresso já é curto (`T93N7F`, seis símbolos, RN-396) e fica como está.

O que a frase decide, sem interpretação por cima: o identificador da compra que a pessoa lê passa a ter **prefixo** e **cinco símbolos alfanuméricos**. O que ela não decide, e por isso não foi inventado aqui: qual prefixo, onde o código nasce, como a unicidade é garantida e o que acontece com as compras que já existem.

**O que o dono viu.** O identificador da compra hoje tem **73 caracteres** e aparece na tela de confirmação do checkout, embaixo de "Inscrição confirmada!", em fonte mono (`StepConfirmacao.tsx:129` e `:138`). O da compra real de 04/08 é `ped-wNXRTvMM3vc7Boyi91vRgx3DBQy2-chk-ed77a161-…`. Não é só comprido: o pedaço do meio é o **uid da conta do comprador**, porque o id do documento é `ped-{uid}-{chave}` por construção, para que um retry do cliente colida no próprio id em vez de criar um segundo pedido. Comprido é o sintoma; o identificador da conta viajando numa tela que a pessoa fotografa e manda no WhatsApp é o problema maior, e ele só é visível de perto.

**O que não se toca, e por quê.** O id do documento continua exatamente como está: ele é a idempotência do checkout por construção (lição PIXFIX-EXTREF) e a referência que viaja ao gateway. O código curto **acompanha** o pedido, não o substitui — é o que humano lê, dita e digita, enquanto o id continua sendo o que a máquina endereça. O `codigoIngresso` da RN-396 e o token assinado do link da página (RN-419) também ficam intocados: um já é curto, o outro é credencial e credencial não encurta.

**O resto é engenharia**, tomada com as alternativas rejeitadas nomeadas em `06-spec-codigo-pedido.md`. Só uma coisa sobe ao painel, porque é vocabulário que o cliente lê: o **prefixo** (item **CODPED-1**, com `PED-` como default que já vale). Regras canônicas: **RN-474** e **RN-475** em [[LEELA-E12-landing]]. Story: **S1228**.

## Dependência dura, declarada

**O CTA "ver meus pedidos" só tem destino quando a área do cliente existir.** O destino é o Meus Ingressos/histórico da S1222, atrás do login da S1221 e do primeiro acesso da S1223. Enquanto a área não sobe, o CTA não pode nascer apontando para um 404 — mesma lição da ordem C1→C2 da fila ADMINSEP. A fila S1222/S1223 vira, portanto, **pré-requisito ou entrega conjunta** do CTA: a tela v1 pode subir antes com mensagem + orientação de e-mail, e o CTA entra quando a rota existir. A ordem executável está em `04-fila-codigo.md`.

## O que esta rodada fecha e abre no painel

- **POSPAG-1 · RESPONDIDA.** O item perguntava só a posição da fila S1222/S1223, e a resposta do dono foi além dela: a área do cliente é confirmada como destino do CTA ("a área do cliente já foi especificada"), o feedback em tela entra na frente, e a fila S1222/S1223 sobe para logo atrás dele — na prática, o default proposto ("puxar a frente para a próxima posição") ratificado e ampliado. O item sai do painel pela disciplina de limpeza; este arquivo é o registro completo.
- **BREVO-1 · RESOLVIDA em 05/08.** O dono desativou a trava de IPs no dashboard ("liberei o brevo") e a prova veio na hora: `GET /v3/account` com a chave de produção respondeu 200, na conta certa (Inguz Digital). O item saiu do painel pela disciplina de limpeza; este arquivo é o registro. Efeito imediato: os e-mails transacionais de produção voltam a sair no próximo envio, sem redeploy — a trava era da conta Brevo, não do código. Os dois e-mails represados do pedido do dono (ingresso `T93N7F` + conta) continuam esperando a ferramenta de reenvio (F2, em build na lane BUILD-F2F5, com review antagonista antes de executar).
- **Nascem ARENA-1, ARENA-2 e ARENA-3** — os três vetáveis da Arena Social, no painel com contexto, default e destino.
- **Nasce CODPED-1** — o prefixo do código da compra, único resíduo de dono da D-0804-5. Veto leve: `PED-` vale enquanto ele não responder, e trocar depois custa uma constante, não uma migração.
- **Nascem PEDLIST-1, POSSE-EMAIL-1 e PROJPED-1 em 05/08**, os três resíduos de dono que a review antagonista da S1225 levantou ao medir o que a RN-469 abriu de fato: a capacidade de **listar** as próprias compras atravessando produtoras, que a autorização por campo cria e a spec não pediu nominalmente; o vínculo `contaSemFriccao.contaUid`, que sai de uma busca por e-mail sem prova de posse e virou **chave de leitura** da compra inteira (fronteira RN-174); e a **regra durável** de que campo novo em `pedidos/{id}` nasce visível ao comprador, com estado operacional interno em extrato ou subcoleção server-only. Os três estão no painel com contexto, default e destino; a reconciliação que originou o terceiro está em `04-fila-codigo.md` §Saída da review antagonista REV-S1225, e a nota canônica ao lado da RN-469 em [[LEELA-E12-landing]].

## O que esta rodada NÃO decide

- Nada de F1 (trava Brevo), F2 (reenvio idempotente), F5 (alerta de falha de e-mail) e F6 (expiração da cobrança QA) do diagnóstico: são técnicas e correm nas lanes delas, em paralelo (registrado na fila).
- **PDF anexado ao e-mail da compra.** A frase do dono pede um botão na página, e só. O anexo continua fora de escopo desde a D-ING-9 e continua sendo lane própria se ele pedir — a existência do gerador (D-0804-4) torna o anexo mais barato, não decidido.
- **Encurtar o id do documento do pedido.** A D-0804-5 acrescenta um código; não troca o endereço. Mexer no id quebraria a idempotência do checkout e a referência que viaja ao gateway, e nada na frase do dono pede isso.
- **Código curto para inscrito, pagamento, estorno ou evento.** A frase fala de compra. Cada um desses tem identificador próprio e ciclo próprio; se algum precisar de código ditável, é lane com decisão própria.
- Nenhuma linha de código, Rule ou function: esta lane é de specs.

## O que a noite de 05/08 executou

Nove lanes rodaram em paralelo sobre esta fila e sobre a fila ADMINSEP, serializadas por território e com commit `--only` arquivo a arquivo, porque em vários momentos havia três lanes vivas na mesma árvore. **Nenhuma delas tocou `leela-specs/`**, por ordem — este registro e o selo dos boards são a aterrissagem de todas. **Nada foi deployado.**

| Lane | O que entregou | Prova |
|---|---|---|
| BUILD-PDF | S1214-T5 — o botão "Salvar como PDF" e a rota que gera o arquivo no servidor | `dadb10a1` · os dois gates nomeados verdes; 48 arquivos / 603 testes em duas execuções seguidas; `pdf-lib` em zero arquivo do bundle do cliente |
| BUILD-COD5A | S1228-T1 — o código curto nasce na transação que já cria o pedido, com reserva por chave primária | `3acc6877` · atomicidade medida nos dois sentidos e nos dois desfechos; replay com sorteador trocado devolve o mesmo código |
| REV-COD5A | Review antagonista do código da compra | `b8c7c29e` · APROVADA-COM-FIXES; dez vetores mais oito compras concorrentes com a mesma chave; três `Not-tested` de um caminho de dinheiro presos com teste; **defeito D-1** medido e sequenciado |
| FIX-D1 | O espelho do código deixou de ser escrivível pelo organizador, e os dois sorteios viraram criptográficos | `48fc7116` e `d36afb64` · o teste que estava verde de propósito ficou vermelho com as Rules editadas e o teste intocado — é esse passo que prova que a edição pegou |
| BUILD-RF2-1 | A lista parcial parou de queimar a chave do e-mail da compra | `5b8e4a77` · vermelho medido antes (9 falhas), verde depois; a distinção entre reversível e terminal passou a sair da matriz canônica do núcleo |
| REV-RF2-1 | Review antagonista da trava de lista parcial | `bf3179c1` · APROVADA-COM-FIXES; oito vetores sobreviveram e os dois defeitos saíram do não declarado — pendência esgotada virava beco permanente, e o extrato zerava quem não mediu |
| BUILD-5D | S1228-T3 — o operador lê o código e acha a compra por ele | `3d666d40` · 85/85 nos alvos, 771/771 na vizinhança; o id interno saiu da vista e virou um "copiar" que não escreve o valor na tela |
| BUILD-AREACLIENTE | S1221-T1, S1223-T1 e S1223-T2 — o login vira overlay, o primeiro acesso termina dentro | `20bd6874`, `2d7f24d7`, `6d092619` · suíte da landing inteira duas vezes seguidas em cada task |
| BUILD-5B | S1228-T4 — a ferramenta de backfill das compras que já existem, com ensaio por default | `d1d6582a` · 9/9 de integração com o script rodado como processo separado; **ensaio contra produção em leitura pura**: 17 pedidos, todos sem código, 22 espelhos a carimbar, zero fora de formato · **⚔ ainda não revisada** e a execução real é ato do dono |
| BUILD-AREACLIENTE-2 | S1222-T1, T2, T3 e T5 mais S1225-T4 — a área do cliente existe, tem meus dados e tem as duas portas, e o CTA finalmente tem destino | `9acb8fb5`, `3acfe7a8`, `cdef2987`, `bdebe384`, `9fd12c74` (+ `5ffb69e0`) · Rules intocadas; a leitura exige o e-mail verificado do token · **a B4 (Meus Clubes) não foi iniciada, e a frente é ⚔ ainda não revisada** |

**As três reviews antagonistas da rodada voltaram aprovadas com fixes, e as três consertaram no commit da própria review.** Nenhuma delas foi feita por quem construiu. **Duas frentes ⚔ ainda não foram revisadas:** a área do cliente e o backfill — os vetores das duas estão declarados nos handoffs, e no caso do backfill a review não é opcional, porque ele escreve em produção.

### A madrugada seguinte: mais nove lanes, e as duas frentes ⚔ revisadas

O primeiro selo fechou com duas frentes esperando review. As duas foram revisadas, e as duas
reviews mudaram o registro em vez de confirmá-lo. **Nenhuma destas lanes tocou `leela-specs/`**,
pela mesma ordem — este registro e o segundo selo são a aterrissagem de todas. **Nada foi
deployado.**

| Lane | O que entregou | Prova |
|---|---|---|
| BUILD-5D | `S1228-T3` — o operador lê o código e acha a compra por ele | `3d666d40` · 85/85 nos alvos, 771/771 na vizinhança; o prefixo não foi reimplementado em lugar nenhum e o "copiar id interno" **não escreve o valor no DOM** |
| BUILD-5B | `S1228-T4` — a ferramenta de retroativo, com ensaio por default | `d1d6582a` · uma transação por pedido, porque lote não é transação e carimbar sem reservar plantaria colisão contra o sorteio de amanhã; o gravador da reserva é o **mesmo** da venda, importado |
| **REV-5B** | Review antagonista do retroativo — **REPROVOU e só aprovou depois de dois consertos** | `eea10348` + `813a38c1` · sete defeitos. O nº 1 era ALTA e decidia a execução do dono: **com a variável do emulador no ambiente, o `--apply` escrevia no emulador e imprimia relatório de produção, saindo zero** — e essa variável está no fluxo de trabalho desta casa. Testes 9 → **21**; auditoria somente-leitura contra produção confirmando que nenhum cenário de risco existe na população de hoje |
| **REV-AREACLIENTE** | Review antagonista da área do cliente — APROVADA-COM-FIXES | `46a5eb8a`, `40f094b1`, `a1486abe` · dezesseis vetores atacados e **a fronteira não quebrou**: a área é estritamente mais fechada que a Rule. Quatro faltas caladas, e a maior não estava em vetor nenhum — **a área foi construída inteira e ficou sem rua**, com o "não sei minha senha" nunca ligado. Linha de base nova: 53 arquivos / 665 testes |
| BUILD-A4 | `S032-T4` (a compra para de amarrar em conta de administração) + o sorteio da venda | `b1bd5dc4` e `61776052` · vermelho medido restaurando os fontes de HEAD (4 falhas), verde depois; a fronteira POSSE-EMAIL-1 presa em três lugares para ninguém a mover por acidente |
| **REV-A4** | Review antagonista da guarda — APROVADO COM RESSALVAS | `8d779dce`, `7b69d544`, `d58caa5d` · nenhum dos oito vetores derrubou o código, em emulador **frio**. A review achou por conta o **gêmeo** do defeito de sorteio, no código do ingresso, e o fechou; e falsificou uma afirmação escrita do handoff da construção sobre a Rule |
| BUILD-5C | `S1228-T2` — o código na tela e no e-mail | `6993a36a` · **achado: a sexta superfície do id** (`Ticket.tsx`, pelo `inscritoId`), invisível para a varredura anterior porque o vazamento viaja com outro nome. Suíte da landing 55/681, três execuções |
| FIX-RNG-CORE | Os três geradores restantes do núcleo saem do PRNG do V8 | `20a9c904` · convite de organizador, convite de clube e refCodigo de afiliado; vermelho nos três antes, 87/87 depois, com prova de consumidor no Vite do painel. **Varredura final: zero geradores previsíveis no repositório** |
| BUILD-B4 | `S1222-T4` — Meus Clubes e a caixa de convites; **a frente B fecha** | `4b72c556` (servidor, 22 casos) + `b3e51638` (tela, 14 casos) · a caixa **lista** e nunca cunha o link de aceite, porque o token só existe como hash. **Achado de produto:** não existe caminho para um participante entrar num clube |

**A doutrina do sorteio criptográfico, que estava escrita e não cumprida, fechou em três frentes**
— venda (`61776052`), ingresso (`8d779dce`) e núcleo (`20a9c904`). O modo de falha era o mesmo nos
três: trocar o **default** de um gerador não muda nada enquanto algum chamador passar a fonte por
cima, e o último a falar vence. O registro no épico foi corrigido, porque ele afirmava um estado
que deixou de existir.

**Duas lanes seguiam em voo no fechamento do segundo selo** e estão registradas como em execução,
não como entregues: a **REV-5C** (review antagonista do código na tela e no e-mail) e a **REV-B4**
(review antagonista de Meus Clubes). O que elas fecharem entra no próximo selo.

**Sete itens novos subiram ao painel do dono** — RN469-PROJECAO-1, CTA-PIX-1, ADMIN-VE-AREA-1,
TROCA-EMAIL-1, AREA-MUDA-1, ACUMULO-ESTOQUE-1 e CLUBES-1 —, mais a exposição **medida** do
POSSE-EMAIL-1 com a correção exata de uma linha, acrescentada ao item que já existia sem decidir
por ele. Dez itens novos entraram na fila técnica.

### A ordem de operação cresceu: quatro índices, um passo só

A sequência de deploy que o primeiro selo registrou continua valendo e ficou maior. São **quatro**
`fieldOverride` COLLECTION_GROUP esperando um único `firebase deploy --only firestore:indexes`,
**antes** do deploy das functions: a ficha do inscrito (da área do cliente), o vínculo de membro de
clube, o convite de influenciador e o convite de promotor. O emulador não cobra índice de grupo,
então **nenhum teste destas frentes prova este passo**. Sem ele, quem foi presenteado não vê o
próprio ingresso e as três listas de clubes e convites voltam vazias — com aviso honesto na tela e
três alertas novos no servidor, o que é o desenho certo e continua sendo um aviso que ninguém
deveria ver.

### O que fica com o dono desta noite

Uma coisa só, e ela é escrita em dado real: **rodar o backfill do código da compra contra produção**. O ensaio já rodou em leitura pura, a conta é exata e a compra do incidente PIXREAL está na lista. O comando, com o ensaio antes e a conferência depois, está no card da S1228 em [[V1-KANBAN]] e no handoff da lane. **A 5c e a 5d não vão ao ar antes disso.**

**+05/08 (madrugada) · a execução ganhou três condições, e elas vieram de uma reprovação.** A review antagonista do retroativo reprovou a ferramenta na forma entregue, e o motivo decidia justamente esta execução: com a variável de emulador presente no ambiente, o comando escrevia no emulador e imprimia um relatório de sucesso de produção. As três condições estão escritas no card e nenhuma é formalidade — rebuild imediatamente antes, conferir a linha `Destino:` do ensaio antes de digitar `--apply`, e gravar a saída em arquivo, porque o mapa de compra para código só existe ali e ele carrega o identificador da conta do comprador (documento interno, não print de grupo). Interromper não corrompe nada, apenas trava por cerca de um minuto o pedido que estava em voo.

**E a noite acrescentou sete decisões ao painel**, todas das duas reviews grandes: a projeção da compra que mostra seis de dezesseis campos (**RN469-PROJECAO-1**), o CTA que aparece com o PIX ainda pendente (**CTA-PIX-1**), a conta de administração vendo a área do cliente inteira (**ADMIN-VE-AREA-1**), a troca de e-mail que apaga o histórico em silêncio (**TROCA-EMAIL-1**), a área muda para quem pagou e teve o vínculo recusado (**AREA-MUDA-1**), o estoque de contas que já acumulam papéis (**ACUMULO-ESTOQUE-1**) e Meus Clubes nascendo vazio porque não existe caminho para entrar num clube (**CLUBES-1**).

### Dois itens saíram do painel por estarem construídos

A disciplina de limpeza mandou. **"Entrou em 03/08 · o login no meio da landing"** e **"Entrou em 03/08 · a área do cliente no web, com os próprios ingressos"** perguntavam a mesma coisa — a posição na fila — e a pergunta ficou sem objeto: as duas foram construídas nesta noite. O que sobra de cada uma não é decisão do dono e vive onde deve: a B4 (Meus Clubes) no card da S1222 em [[V1-KANBAN]], a review antagonista da frente e o deploy com o maestro. A ratificação do **ADMINSEP-2** continua no painel, porque essa é decisão e a B5 implementou apenas a leitura corrente, com ponto de mudança único.

### Uma ordem de operação que não é opcional

O deploy desta área tem sequência: **`firebase deploy --only firestore:indexes` antes do deploy das functions.** O índice de grupo em `inscritos.pessoaRef` é novo, o emulador não cobra índice e nenhum teste da frente prova este passo. **+05/08: são quatro overrides agora, não um** — a B4 acrescentou os de membro de clube, convite de influenciador e convite de promotor. O passo continua sendo um só; ver §A ordem de operação cresceu acima. Sem ele, quem foi presenteado — o caso do pagador que compra para a família — não vê o próprio ingresso, e a lista volta declarando que está incompleta em vez de mentir. Junto: a **C3** (autorizar o domínio da landing no Auth) ficou mais urgente do que era, porque agora é ela que faz a jornada de primeiro acesso terminar dentro da área.

### O bloqueio que fica

**Os dois e-mails represados do pedido do dono continuam sem sair, e agora não é mais por falta de ferramenta.** A trava de IPs da Brevo caiu em 05/08 (BREVO-1), a porta de reenvio existe desde 04/08 e a lista parcial deixou de ser risco. O que falta é **credencial**: a porta é `platform_admin`, a senha do super-admin foi rotacionada em 04/08 e não ficou registrada. Isso é o **ADMINSEP-3**, que já está no painel — nenhum item novo foi aberto para o bloqueio. Escolher o e-mail real do administrador e definir a senha destrava o reenvio no mesmo gesto.
