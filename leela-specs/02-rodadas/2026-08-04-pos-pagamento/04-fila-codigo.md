---
tags: [leela, fila, rodada, checkout, pos-pagamento, area-do-cliente, arena-social, codigo-pedido]
trace: leela-pixreal-diag-20260804
lote: SPEC-POSPAG
data: 2026-08-04
---

# 04-fila-codigo · O pedido responde na tela, a Arena Social, o PDF do ingresso e o código da compra

> Cinco frentes em ordem, mais o paralelo técnico do diagnóstico. Regras em
> `03-rns-delta.md`, para a Frente 4 em `05-spec-pdf-ingresso.md` e para a Frente 5 em
> `06-spec-codigo-pedido.md` (todas canônicas no
> [[LEELA-E12-landing]]); spec em `02-spec-pos-pagamento-e-arena-social.md`,
> `05-spec-pdf-ingresso.md` e `06-spec-codigo-pedido.md`. A fila da rodada ADMINSEP
> (`../2026-08-02-retomada/11-fila-contas-e-area-cliente.md`) continua valendo linha a
> linha — esta fila só a posiciona e acrescenta as frentes novas.

## Frente 1 · o feedback do pedido na tela (E12 · S1225) — primeiro da fila

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 1a | `S1225-T1` | Abre a leitura do PRÓPRIO pedido nas rules (RN-469), com teste de ataque — fecha o TODO E12 de `firestore.rules:2528-2530` | `firestore.rules`, testes de rules | — | opus | ⚔ |
| 1b | `S1225-T2` | A tela v1: "Estamos confirmando o seu pedido" + orientação de e-mail, e a copy do PIX para de prometer canal que não existe (`StepPagamento.tsx:256-260`) | `apps/landing/.../checkout` | — | opus | ⚔ |
| 1c | `S1225-T3` | Estados por meio: PIX consulta o pedido aberto pela 1a (carregamento + gesto explícito, sem polling obrigatório); cartão distingue confirmado, recusado e indeterminado | `apps/landing/.../checkout` | 1a, 1b | opus | — |
| 1d | `S1225-T4` | O CTA "ver meus pedidos" entra na tela, apontando para Meus Ingressos | `apps/landing` | **S1222-T2** | opus | — |

1a e 1b partem juntas, sem dependência entre si. **1d é a materialização da dependência
dura**: sem a área do cliente no ar, o CTA não nasce — a tela v1 vive de mensagem +
orientação de e-mail até lá.

**Estado em 05/08 · Frente 1 FECHADA, fora do ar.** 1a `bdc9a531` · 1b `7f992e75` · 1c no mesmo
pacote · review antagonista `706d9b02`+`a769cfb9` (aprovada com fixes) · RF2-3 executado em
`946e41f4` · **1d `9fd12c74`**, entregue pela lane BUILD-AREACLIENTE-2 assim que a B2 subiu. A
dependência dura foi paga, não contornada.

## Frente 2 · a área do cliente e o primeiro acesso (S1222/S1223) — logo atrás, resposta da POSPAG-1

Roda a fila ADMINSEP como está escrita (frentes B e C da `11-fila-contas-e-area-cliente.md`),
com as duas reconciliações desta rodada:

- **B2 ganha um consumidor novo:** quando subir, a S1225-T4 destrava e o CTA entra no
  checkout. O bloqueio da B2 pela `S1221-T1` (login na landing) continua.
- **C1/C2 com o interim da DEPLOY-EMAIL:** `actionCodeSettings` já existe no servidor
  (`abf4b794`) apontando para o painel; a C1 constrói a `/definir-senha` da landing e a C2
  vira a troca de uma linha do destino, terminando em Meus Ingressos.

**Estado em 05/08 · Frente 2 pela metade, fora do ar.**

| Task | Estado | Prova |
|---|---|---|
| `S1221-T1` · login como overlay da landing | **entregue** | `20bd6874` — destravou a B2; a landing não tinha autenticação nenhuma antes disto |
| `B1 · S1222-T1` · callables do próprio dono da conta ⚔ | **entregue** | `9acb8fb5` — Rules intocadas; a leitura exige o e-mail **verificado** do token |
| `B2 · S1222-T2` · a área na landing | **entregue** | `3acfe7a8` (+ `5ffb69e0`, o segredo que assina o link do ingresso passou a ser declarado) |
| `B3 · S1222-T3` · meus dados e trocar senha | **entregue** | `cdef2987` — edita a identidade global (ADR-009), nunca o perfil de organizador |
| `B4 · S1222-T4` · meus clubes e convites | **não iniciada** | é a única da frente B que sobra |
| `B5 · S1222-T5` · as duas portas ⚔ | **entregue** | `bdebe384` — nenhum caminho da área alcança `/plataforma`; a leitura corrente do **ADMINSEP-2** foi implementada com ponto de mudança único |
| `C1 · S1223-T1` · `/definir-senha` na landing ⚔ | **entregue** | `2d7f24d7` — nenhum seam novo, nenhum token inventado |
| `C2 · S1223-T2` · destino por origem ⚔ | **entregue** | `6d092619` |
| `C3 · S1223-T3` · domínio autorizado no Auth | **pendente** | passo de **operação**, fora da esteira — e agora mais urgente: é ele que faz a jornada de primeiro acesso terminar dentro da área |

**A frente B está ⚔ e ainda não foi revisada.** A lane declarou oito vetores em ordem de risco, e
os dois primeiros são de fronteira: o vínculo que autoriza o histórico (igualdade de uid é o
isolamento, o e-mail é re-checagem em memória — existe combinação que devolva pedido de outra
conta?) e a segunda fonte dos ingressos, cujo `in` corta silenciosamente acima de trinta fichas,
sem marcar a lista como incompleta.

**Pré-requisito de deploy que não é opcional:** `firebase deploy --only firestore:indexes`
**antes** do deploy das functions. O emulador não cobra índice, então nenhum teste desta frente
prova este passo; sem ele, `getMeusIngressos` degrada e quem foi presenteado não vê o próprio
ingresso.

**Dependência da fila que NÃO estava paga, e que a B1 atravessou por decisão declarada.** A fila
ADMINSEP escreve a B1 como dependente da **A4** (`S032-T4` — o `contaSemFriccao` para de amarrar
compra em conta de administração). A varredura no início da lane devolveu zero para
`platform_admin` naquele arquivo: **a A4 não aterrissou** e não está em lane nenhuma. A B1 seguiu
porque a dependência é de **higiene do vínculo**, não de autorização — sem a A4, uma conta de
administração que comprasse veria a própria compra, o que é verdade e não vazamento. O que a A4
conserta é o vínculo nascer errado, e isso acontece do lado do escritor. **Fica sequenciada para
o maestro**, sem que a B1 a substitua.

## Frente 3 · a Arena Social (E12 · S1226) — só depois dos vetos

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 3a | `S1226-T1` | Modelo + Rules da Arena: campos da RN-471, dado sensível fechado por construção, carimbo de consentimento (RN-472) | `packages/core`, `firestore.rules` | **vetos ARENA-1/2/3**, B2 | opus | ⚔ |
| 3b | `S1226-T2` | A seção na área do cliente: edição dos campos, foto da conta reaproveitada, Arena vazia como estado válido | `apps/landing` | 3a | opus | — |
| 3c | `S1226-T3` | Consentimento específico e visibilidade na tela: opt-in destacado com finalidade, default só-a-própria-pessoa, apagar apaga | `apps/landing`, `functions` | 3a | opus | ⚔ |

**Nada da Frente 3 é despachável antes de ARENA-1 (visibilidade), ARENA-2 (pilares) e
ARENA-3 (onde mora) voltarem do painel.** O miolo da área do cliente não espera por ela.

## Frente 4 · o PDF do ingresso como download (E12 · S1214-T5) — depois que a REV-S1225 aterrissar

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 4a | `S1214-T5` | Botão "Salvar como PDF" na página do ingresso e a rota que gera o arquivo no servidor, com a matriz de estados espelhada e o nome `ingresso-<codigo>.pdf` | `apps/landing/.../ingresso` | **REV-S1225 aterrissada** | opus | — |

**Por que ela não parte agora, mesmo sem depender de ninguém.** A task é aditiva e o código
dela não encosta em nada da S1225, mas o **território `apps/landing` está ocupado**: a
REV-S1225 está em voo sobre a mesma árvore e a serialização por lane vale enquanto isso durar
(regra da fila ADMINSEP, repetida nas fronteiras abaixo). Ela entra assim que aquela review
aterrissar, e entra sozinha — não espera a Frente 2 nem os vetos da Frente 3.

**Por que sem ⚔, e o que isso custa.** A task é aditiva, não toca dinheiro, não toca
`firestore.rules`, não cria credencial nem verificação nova: ela é a **terceira renderização
da mesma projeção** que a S1214-T1 já entrega e que a página e a folha de impressão já
consomem. O precedente é a `S1214-T4` (a versão imprimível), que tem exatamente essa forma e
também não foi ⚔ — as três marcadas naquele pacote foram as que criaram o token, a superfície
e o e-mail. A pergunta que justificaria a review antagonista é "dá para obter um PDF de
ingresso que eu já não conseguiria ver?", e a resposta é não: mesmo token, mesma Function,
mesma negativa única.

Em troca, dois gates nomeados que o report da lane tem de exibir verdes, e sem os quais a task
não aterrissa:

1. **O cabeçalho não aceita dado cru.** `Content-Disposition` montado a partir do código do
   Firestore, com o predicado `isCodigoIngressoValido` do core como porta e `ingresso.pdf`
   como saída — teste com código ausente, com código fora do formato e com caractere de
   controle. É a única superfície de ataque nova que a task cria.
2. **O PDF para onde o QR para.** Um caso por estado: gera em `valido` e `credenciado`,
   redireciona nos cinco restantes, botão ausente nos cinco. Mais o teste que cobra do arquivo
   os campos da RN-422 e nenhum a mais — é ele que segura a deriva do segundo layout.

**A marcação vira ⚔ automaticamente** se a implementação sair do caminho especificado em duas
direções: criar uma **Function nova** em `functions/` (porta pública nova que verifica token) ou
mover qualquer verificação de token para dentro da landing (a chave da RN-419 não desce). As
duas mudam a fronteira de segurança, e fronteira de segurança nova não passa sem contexto
fresco.

**Estado em 05/08 · Frente 4 ENTREGUE, fora do ar.** `dadb10a1` (lane BUILD-PDF). Os dois gates
nomeados saíram verdes e estão no report; a implementação não saiu do caminho especificado, então
**a task não virou ⚔** e a review antagonista segue opcional e não rodada. `pdf-lib` no bundle do
servidor, zero byte novo no do cliente, rota do ingresso estável em 150 B / 199 kB. O que sobra é
a prova visual: ninguém abriu um arquivo gerado. Duas premissas ficam vetáveis e estão no épico —
nome fora do Latin-1 sai em branco no arquivo, e o layout é de uma folha só, sem paginação. **A
ausência de indicador de progresso é a premissa PDF-5, não esquecimento**, e virou o item de
painel **PDF-SPINNER-1**.

## Frente 5 · o código curto da compra (E12 · S1228) — o miolo parte já, as superfícies atrás dos territórios

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 5a | `S1228-T1` | O módulo do código no core (alfabeto, tamanho, predicado, normalização, prefixo), `codigoPedido` no contrato do pedido, sorteio + reserva `pedidoCodigos/{codigo}` dentro da transação que já cria o pedido, e o espelho do código em cada inscrito | `packages/core/src/pedidos`, `functions/src/checkout`, testes de rules | — | opus | ⚔ |
| 5b | `S1228-T4` | A ferramenta de backfill das compras existentes: `--dry-run` por default, `--apply` explícito, `--project` obrigatório, idempotente por comparação, reservando o código na mesma transação em que carimba | `functions/scripts` | 5a | opus | ⚔ |
| 5c | `S1228-T2` | As superfícies do comprador: a tela de confirmação troca o id pelo código nos dois ramos, e o e-mail da compra passa a carregar o código com rótulo próprio | `apps/landing/.../checkout`, `functions/src/email` | 5a, **Frente 4** | opus | — |
| 5d | `S1228-T3` | As superfícies do operador: o campo "Pedido" do slide-in mostra o código, e a busca de inscritos passa a casar o código do pedido (molde RN-397) | `apps/painel` | 5a | opus | — |

**5a parte agora e não espera ninguém desta rodada.** Ela não encosta em `apps/landing` nem em
`apps/painel`; o que ela ocupa é `functions/src/checkout`, e ali a regra de serialização por
lane vale contra os itens RF2 abaixo — quem entrar primeiro segura o outro, e não há
dependência lógica entre eles em nenhuma direção. O arquivo que ela toca
(`createInscricaoCharge.ts`) não é o mesmo do RF2-1 (o webhook de emissão), mas a árvore é.

**Por que 5a é ⚔.** Ela mexe na transação do caminho do dinheiro, cria uma coleção nova e
acrescenta um campo ao doc `pedidos/{id}` — que, desde a RN-469, nasce visível ao comprador. A
review antagonista tem três alvos nomeados: que o replay do checkout **não** sorteie um segundo
código (a mesma chave de idempotência tem de devolver o código byte a byte); que a reserva use
`create` e não `set`, com a corrida provada por teste; e que a coleção de reserva permaneça sem
`match` nas Rules, com o teste de negação que a `ingressoCodigos` já tem de molde.

**Por que 5b também é ⚔, mesmo sendo script.** Ele reescreve documento em produção e semeia a
mesma coleção de reservas que o checkout consome — um backfill que carimbe o pedido sem reservar
o código planta colisão contra o sorteio de amanhã. A prova exigida é a do precedente
(`backfill-url-eventos.mjs`): dry-run que imprime contadores antes de qualquer escrita, e rerun
convergindo para zero atualizações. **A execução contra produção não é da esteira** — ela entra
no kanban como pendência do dono, ao lado da que já está lá.

**5c espera a Frente 4 pelo território, não por lógica.** As duas mexem em `apps/landing` e a
serialização por lane vale; os subdiretórios são disjuntos (`.../checkout` contra
`.../ingresso`), então soltar as duas juntas é decisão de quem conduz, não regra da fila. A
metade de e-mail da 5c é a única coisa desta frente que toca um caminho já incidentado, e o
critério que ela paga é o inverso do da S1225-T2: lá a varredura de copy virou teste; aqui o
teste é que **nenhuma superfície de comprador imprime `pedidoId`** — executável, e é ele que
segura a volta silenciosa do id numa tela futura.

**5d não disputa território com ninguém** nesta rodada: `apps/painel` está livre. Ela pode
correr em paralelo com 5c.

**Estado em 05/08 · Frente 5 pela metade, fora do ar.**

| # | Task | Estado | Prova |
|---|---|---|---|
| 5a | `S1228-T1` ⚔ | **entregue e revisada** | `3acc6877` · review `b8c7c29e` (APROVADA-COM-FIXES) · defeito D-1 fechado em `48fc7116`, sorteio criptográfico em `d36afb64` |
| 5b | `S1228-T4` ⚔ | **em execução** | lane BUILD-5B, em voo em `functions/scripts` · a execução contra produção continua sendo ato do dono |
| 5c | `S1228-T2` | **pendente** | território `apps/landing` livre agora que a Frente 4 aterrissou |
| 5d | `S1228-T3` | **entregue** | `3d666d40` · 85/85 nos alvos, 771/771 na vizinhança |

**A ordem da REV-COD5A foi cumprida.** A review escreveu que *"a 5d não deve ir para produção
antes"* do fix das Rules, porque ela é a superfície que transforma um código plantado em resposta
errada ao telefone. O `48fc7116` aterrissou **antes** da lane da 5d.

**A ordem interna que continua valendo:** o backfill (5b) roda antes de 5c e 5d irem ao ar. Sem
ele as duas estreiam mostrando ausência em toda compra que já existe — que é a RN-475 funcionando
e parecendo defeito.

## Paralelo técnico · F2 e F5 do diagnóstico correm fora desta fila

| # | O quê | Por que em paralelo |
|---|---|---|
| F2 · P0 | Reenvio idempotente por pedidoId dos e-mails represados (ingresso `T93N7F` + conta) — hoje não há ferramenta de reenvio (`emitirIngressos.ts:25` pula inscrito com `qrToken`) | Técnica, sem decisão de produto; espera só a **BREVO-1** (ação do dono no dashboard) para o envio sair |
| F5 · P2 | Falha de e-mail transacional vira incidente: `emailStatus` também na emissão, alerta em `email_*_falhou`, runbook | Técnica; não toca as superfícies desta fila |

F1 (trava de IPs da Brevo) segue sendo a BREVO-1 do painel; F6 (expiração da cobrança QA de
05/08) é observação. Nenhuma das quatro entra nas frentes acima nem as bloqueia.

### Saída da review antagonista REV-F2F5 (`e6c96a1d`)

F2 e F5 voltaram **aprovadas com fixes**: quatro defeitos reais consertados no mesmo commit
da review, com teste que os teria pegado (`reenvioEmailsPedido.ataque.test.ts`). O que
sobrou é fila, não bloqueio.

| # | O quê | Por que ficou de fora do fix |
|---|---|---|
| RF2-1 | **O caminho automático queima a chave da RN-219 com lista parcial.** `emitirIngressosDoPedido` não conta inscrito `nao_confirmado` nem como falha nem como recusa, então `dispararEmissaoIngressosPosConfirmacao` fecha com `falhas: 0`, manda o e-mail com a lista incompleta e não abre pendência — o oposto do que o cabeçalho do módulo promete. Reprodução pronta no vetor 6 do teste de ataque | **FECHADO em 05/08** — `5b8e4a77`, review antagonista `bf3179c1` (APROVADA-COM-FIXES). Ver §Saída da review antagonista REV-RF2-1 abaixo |
| RF2-2 | **Callable sem rate limit.** Qualquer autenticado força escrita em `auditoriaAcessos` pela negação de papel (trilha inundável + custo), e `forcar: true` não tem teto por admin. `shared/rateLimit.ts` existe e é fail-closed | Padrão do repo, não regressão da F2: `getBankDetailsForPayout` é idêntico. Fechar nos dois na mesma passada — janela por `uid`, ~10/10 min, antes do gate de papel |
| RF2-3 | **Projeção do pedido para o comprador** — ver abaixo, fecha junto com a review da S1225 | Decisão conjunta das duas lanes |

**Cross-lane com a S1225-T1 (RN-469).** A F2/F5 acrescentou ao doc do pedido `emailIngressos`
(`status`, `falhas`, `falhaEm`, `comunicacaoId`) e `reenvioEmails` (`ultimoEm`,
`ultimoReenvioId`, `total`) — e a RN-469 abre o doc inteiro ao comprador. Nada disso é PII
nem credencial, e `emailIngressos.status` é legitimamente sobre o pedido dele. Os dois que
não são: **`reenvioEmails.ultimoReenvioId`** (string opaca escolhida pelo OPERADOR — vaza
vocabulário interno se alguém nomear a chave por chamado) e **`emailIngressos.comunicacaoId`**
(handle de coleção server-only). Recomendação da review, em ordem de custo:

1. **Mínimo para o gate da S1225:** tirar `ultimoReenvioId` e `comunicacaoId` do doc do
   pedido. Custo zero de função — nenhum caminho os lê, a janela só usa `ultimoEm`, e o
   extrato `reenviosEmail` (server-only) já guarda os dois.
2. **Forma durável:** estado operacional em subcoleção server-only (`pedidos/{id}/operacao`),
   deixando o doc do pedido com dado do comprador e mais nada. Troca a consulta "quem pagou e
   não recebeu" por `collectionGroup` (índice de campo único, ainda sem composto).

A escolha é das duas lanes juntas; a review da S1225 fecha o ponto.

### Saída da review antagonista REV-S1225 (`706d9b02` + `a769cfb9`)

A S1225 voltou **aprovada com fixes**: dois defeitos reais na tela, consertados no commit da
própria review, com teste que os pegaria (`checkout-s1225-rev-estados-terminais.test.tsx`).
A abertura das Rules passou intacta — `firestore.rules` não foi tocado pela review. Handoff
completo em `.nirvana/handoffs/leela-pixreal-diag-20260804-REV-S1225.md`.

#### Reconciliação do RF2-3 — os dois campos saem do documento do comprador

As duas reviews desta rodada chegaram a vereditos opostos sobre `reenvioEmails.ultimoReenvioId`
e `emailIngressos.comunicacaoId` no doc do pedido. A REV-F2F5 pediu para **remover**; a
REV-S1225, medindo campo a campo o que a leitura entrega, decidiu **aceitar a exposição** — o
conteúdo é a história operacional da compra do próprio comprador, o `ultimoReenvioId` é validado
server-side como slug (`reenviarEmailsPedido.ts:305`) e não cabe prosa de operador, e `uid` e
papel de quem reenviou vivem no registro de auditoria separado.

**O maestro decidiu REMOVER**, pelo argumento que a própria REV-S1225 usou para justificar a
aceitação: filtrar por campo não é opção técnica nas Rules. Se a única defesa disponível é a
disciplina de não gravar, então a regra tem de ser a disciplina — estado operacional interno não
se grava na projeção que o comprador lê. Aceitar caso a caso transfere a decisão para o próximo
campo, e o próximo campo pode não ser um slug validado. Isto é o caminho 1 da recomendação da
REV-F2F5 (custo zero de função: nenhum caminho lê os dois, a janela usa só `ultimoEm`, e o
extrato `reenviosEmail` server-only já os guarda).

**Execução na lane FIX-PROJECAO**, em voo em `functions/` no momento deste registro; o commit
entra aqui quando ela aterrissar. A forma geral disto é a regra durável **PROJPED-1**, no painel
do dono para ratificação, e a nota ao lado da RN-469 em [[LEELA-E12-landing]].

**RF2-3 está fechado.**

#### Fila técnica da REV-S1225

| # | O quê | Por que ficou de fora do fix |
|---|---|---|
| RS1-1 | **`isTenantMember` vaza texto interno do motor de rules.** A função compara `request.auth.token.tenantId` com o campo do doc; token **sem** claim de tenant faz a comparação **erroar**, e a negação chega ao cliente como mensagem interna do avaliador em vez de um `permission-denied` limpo | Pré-existente e vale para o arquivo inteiro, não é regressão da S1225-T1. Fechar em passada própria sobre `firestore.rules`, com teste de token sem claim em cada porta que usa a função |
| RS1-2 | **O PIX expira só no relógio do navegador.** O timer interno do `PixCobranca` derruba a cobrança sem nenhuma ida ao servidor, então a tela de confirmação não sabe que o pedido morreu e continua oferecendo o gesto de atualizar sobre uma cobrança que não existe mais | Declarado no próprio fix da T3: a tela já trata estado terminal vindo do servidor, o que falta é a expiração local virar consulta. Pede desenho de quando consultar, não uma linha |
| RS1-3 | **`/*` dentro de string cega a varredura de copy.** O gate que impede promessa de confirmação automática apaga tudo entre `/*` e `*/` ao tirar comentários, então uma string contendo `/*` esconde a copy seguinte. O furo do `//` **não** existe — o regex exige início de linha. Nenhuma ocorrência hoje | Zero incidência atual e o canário já está no teste. Fechar quando a varredura ganhar dono próprio, junto do teste de `nenhuma superfície imprime pedidoId` da 5c, que é da mesma família |

### Saída da review antagonista REV-RF2-1 (`bf3179c1`)

O RF2-1 voltou **aprovado com fixes**. O desenho do `5b8e4a77` sobreviveu aos oito vetores que o
construtor declarou, inclusive os dois que ele marcou `Not-tested`; os dois defeitos saíram do
**não declarado**, e os dois no mesmo ponto — o extrato do RF2-1 não sobrevivia ao próprio
caminho de recuperação. **Defeito 1 (ALTO, dinheiro + credencial):** pendência esgotada virava
beco permanente, e a cura de uma espera por inscrito reversível é uma ação humana que passa das
duas horas sem esforço — a pessoa ficava confirmada e **sem ingresso emitido**. **Defeito 2
(MÉDIO):** o extrato zerava quem não mediu. Os dois fixes viraram a **diretriz permanente da
RN-382** em [[LEELA-E12-landing]]. **RF2-1 está fechado.**

**Achado de realismo que recalibra a prioridade, não o fix:** exercitando o caminho sandbox real,
a transação de confirmação flipa **todo** inscrito `pendente` → `confirmado` na mesma transação
que marca o pedido como pago, então no caminho feliz o ramo da espera não é alcançado. Ele nasce
por duas portas: status fora do enum (dado corrompido, seed antigo, migração) e mutação do pedido
depois do pagamento. O gerador dominante é **anomalia de dado**, e é exatamente por isso que o
Defeito 1 importava.

**Dois itens de dono saíram desta review** e estão no painel: **REENVIO-PARCIAL-1** (o reenvio
manual no meio da espera entrega lista parcial e carimba o pedido como entregue) e
**INSCRITO-APAGADO-1** (inscrito apagado não deixa extrato consultável). O RF2-2 (rate limit) e o
RF2-3 não foram tocados por esta lane.

### Fila técnica das reviews de 05/08 (REV-COD5A e REV-RF2-1)

Nenhum destes pede juízo de dono. São os resíduos técnicos que as duas reviews da noite
produziram, no molde dos RF2-*/RS1-* acima.

| # | O quê | Por que ficou de fora do fix |
|---|---|---|
| RF2-4 | **A varredura lê a coleção inteira sem limite nem cursor.** `.where('resolvido','==',false).get()` num cron de 15 minutos, e pendência de espera **não se resolve sozinha**: esgotada, ela fica no result set para sempre. Com dez pedidos a passagem é trivial; com uma migração ruim em cima de um evento grande, é leitura ilimitada num agendado | Pré-existente ao RF2-1, mas o fix **multiplicou o gerador** — a espera por inscrito reversível virou rotina. Pede paginação por cursor e teto por passagem, com o que exceder voltando na próxima |
| RF2-5 | **`logger.warn('ingresso_inscrito_aguardando_confirmacao')` sai por inscrito e por passagem** — oito passagens × N inscritos por pedido segurado, e o ruído cresce com o mesmo gerador do RF2-4 | Custo de observabilidade, não de correção. Fecha junto do RF2-4: um registro por pedido por passagem, com a contagem no lugar da enumeração |
| RS1-4 | **O seed local não tem `codigoPedido`.** `functions/src/seed/pedidos.seed.ts` grava os onze pedidos sem código e sem reserva, e `inscritos.seed.ts` só espelha o código do ingresso. No emulador e no preview, **todo** campo "Pedido" mostra travessão e a busca por código não acha nada — a RN-475 funcionando e parecendo defeito na hora de validar | Território `functions/`, fora das lanes que precisavam dele (5d é `apps/painel`). **Bloqueia a conferência visual da 5c e da 5d**: sem rodar o backfill da 5b contra o emulador, ou sem dar código ao seed, a validação do dono não é conclusiva |
| RS1-5 | **`normalizarCodigoPedido` não come travessão nem meia-risca.** Ela tira `[\s-]+`; `–` e `—` sobrevivem, e o operador que colar `PED–A2B3C` de um WhatsApp com autocorreção não acha a compra | Não corrigido **de propósito**: `normalizarCodigoIngresso` tem exatamente o mesmo recorte, e divergir os dois quebra a única frase que o operador precisa aprender. **Entra nos dois normalizadores no mesmo commit, ou em nenhum** |
| RS1-6 | **A callable do reenvio não devolve o código.** `CreateInscricaoChargeResult` não carrega `codigoPedido`, então a 5c vai ter de reler o doc do pedido (a RN-469 autoriza) | Contrato para quem pegar a 5c, não defeito. Fica escrito para a task não descobrir isso no meio |
| RS1-7 | **Config de emulador com `"host": "::"` produz falso-vermelho.** Testes que derivam o host de `FIRESTORE_EMULATOR_HOST` recebem um endereço IPv6 e falham com "client is offline", 25 de 26 vermelhos **sem nenhuma regressão real**; com `127.0.0.1` os 26 passam | Ruído de gate que pode **mascarar regressão de verdade** numa próxima lane. Padronizar IPv4 explícito em todas as configs de emulador do repositório, não só nas de lane. Três lanes desta noite já subiram com IPv4 por conta própria |

## Ordem executável, resumida

1. **Agora:** 1a + 1b (S1225-T1/T2). Depois 1c.
2. **Assim que a REV-S1225 aterrissar:** 4a (o PDF do ingresso), que destrava sozinha e não
   espera nada além do território.
3. **Também agora, em outra árvore:** 5a (o código da compra no core e na criação do pedido),
   que não espera nenhuma frente desta rodada — só se serializa com os itens RF2 em
   `functions/`. Depois dela, 5b (a ferramenta de backfill), e então 5d em paralelo com 5c,
   esta última atrás da Frente 4 pelo território de `apps/landing`. A ordem interna importa
   numa coisa só: o backfill roda antes de 5c e 5d irem ao ar, para que nenhuma superfície
   estreie encontrando compra sem código.
4. **Na sequência (resposta da POSPAG-1):** a fila S1222/S1223 inteira, na ordem da
   ADMINSEP (S1221-T1 antes da B2). Quando a B2 subir: 1d (o CTA) e a aterrissagem da C1
   passa a Meus Ingressos. A B1/B2 nasce exibindo o código do pedido, nunca o id (RN-475).
5. **Depois dos vetos ARENA-1/2/3:** 3a → 3b ∥ 3c.
6. **Em paralelo, lanes técnicas próprias:** F2 (após BREVO-1) e F5.

## Fronteiras

- **`firestore.rules` é caminho de dinheiro e PII.** A 1a abre UMA leitura estreita e mais
  nada; review antagonista em contexto fresco obrigatória (⚔), com o caso de ataque
  nomeando a RN-469.
- **A fronteira cotar/cobrar (RN-440) não se move.** O feedback é pós-pagamento; nenhuma
  task desta fila cria cobrança, pedido ou inscrito em ponto novo.
- **Serialização por lane em `functions/` e `apps/landing/`** continua valendo enquanto
  houver lane em voo na mesma árvore (regra da fila ADMINSEP).
- **Dado sensível da Arena nunca em projeção pública** — se alguma task parecer pedir isso,
  a task está errada (RN-472).
- **O id do documento do pedido não se move.** Ele é a idempotência do checkout e a
  `externalReference` do gateway, com teto de 100 caracteres. A Frente 5 acrescenta um código
  ao lado; task que parecer pedir um id mais curto está errada (RN-474).
- **O código da compra não é chave de acesso.** A autorização do pedido continua sendo a
  RN-469, por campo. Superfície que aceitar o código como credencial está errada (RN-475).

## Critério de pronto do pacote

> Marcado em 05/08 pelo selo da noite. **Marcado quer dizer "provado por teste executável", não
> "no ar"** — nada deste pacote foi deployado.

- [x] comprador da sessão de compra e conta vinculada leem o próprio pedido; terceiro é
      negado com teste nomeando a RN-469; `write: if false` intocado — `bdc9a531`
- [x] a tela do PIX real mostra "Estamos confirmando o seu pedido" + orientação de e-mail, e
      nenhuma copy promete confirmação automática sem canal — `7f992e75`, com a varredura de
      copy virando teste
- [x] cartão distingue confirmado, recusado e indeterminado, sem "Estamos confirmando"
      sobre resposta já conhecida — e o estado terminal parou de dizê-lo, defeito achado pela
      review (`a769cfb9`)
- [x] o CTA "ver meus pedidos" só existe com a área do cliente no ar, e aterrissa em Meus
      Ingressos — `9fd12c74`, com o destino decidido num lugar só
- [ ] a Arena Social só nasce depois dos três vetos, com consentimento específico carimbado
      e default só-a-própria-pessoa
- [x] a página do ingresso oferece "Salvar como PDF" onde há QR, o arquivo desce com o nome
      `ingresso-<codigo>.pdf` e não carrega o token dentro dele; estado sem QR não gera —
      `dadb10a1`, os dois gates verdes
- [x] toda compra nova nasce com código de cinco símbolos, único por reserva, e o retry da
      mesma chave de idempotência devolve o mesmo código — `3acc6877`, provado com RNG trocado
      de propósito no replay
- [ ] nenhuma tela de comprador e nenhum e-mail imprime `pedidoId`, e o teste que cobra isso é
      executável — **falta a 5c**; do lado do operador o id já saiu da vista (`3d666d40`)
- [x] a busca de inscritos acha a compra pelo código, e o rótulo do campo diz que ela busca
      por ele — `3d666d40`, as duas metades com teste
- [ ] o backfill roda em dry-run com contadores antes de qualquer escrita, e o rerun converge
      para zero atualizações — **5b em execução**
- [x] review antagonista em contexto fresco em 1a, 1b e 5a — as três rodaram e as três voltaram
      aprovadas com fixes (`706d9b02`+`a769cfb9`, `b8c7c29e`). **Faltam 3a, 3c (gated pelos
      vetos da Arena) e 5b (em execução)**
