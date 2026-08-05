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
