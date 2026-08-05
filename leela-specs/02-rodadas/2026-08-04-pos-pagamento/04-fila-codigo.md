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

## Frente 2 · a área do cliente e o primeiro acesso (S1222/S1223) — logo atrás, resposta da POSPAG-1

Roda a fila ADMINSEP como está escrita (frentes B e C da `11-fila-contas-e-area-cliente.md`),
com as duas reconciliações desta rodada:

- **B2 ganha um consumidor novo:** quando subir, a S1225-T4 destrava e o CTA entra no
  checkout. O bloqueio da B2 pela `S1221-T1` (login na landing) continua.
- **C1/C2 com o interim da DEPLOY-EMAIL:** `actionCodeSettings` já existe no servidor
  (`abf4b794`) apontando para o painel; a C1 constrói a `/definir-senha` da landing e a C2
  vira a troca de uma linha do destino, terminando em Meus Ingressos.

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
| RF2-1 | **O caminho automático queima a chave da RN-219 com lista parcial.** `emitirIngressosDoPedido` não conta inscrito `nao_confirmado` nem como falha nem como recusa, então `dispararEmissaoIngressosPosConfirmacao` fecha com `falhas: 0`, manda o e-mail com a lista incompleta e não abre pendência — o oposto do que o cabeçalho do módulo promete. Reprodução pronta no vetor 6 do teste de ataque | Muda o comportamento do **webhook**; pede lane e review próprias. O beco do lado do reenvio já foi fechado (a pendência passa a ser aberta ali) |
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

- [ ] comprador da sessão de compra e conta vinculada leem o próprio pedido; terceiro é
      negado com teste nomeando a RN-469; `write: if false` intocado
- [ ] a tela do PIX real mostra "Estamos confirmando o seu pedido" + orientação de e-mail, e
      nenhuma copy promete confirmação automática sem canal
- [ ] cartão distingue confirmado, recusado e indeterminado, sem "Estamos confirmando"
      sobre resposta já conhecida
- [ ] o CTA "ver meus pedidos" só existe com a área do cliente no ar, e aterrissa em Meus
      Ingressos
- [ ] a Arena Social só nasce depois dos três vetos, com consentimento específico carimbado
      e default só-a-própria-pessoa
- [ ] a página do ingresso oferece "Salvar como PDF" onde há QR, o arquivo desce com o nome
      `ingresso-<codigo>.pdf` e não carrega o token dentro dele; estado sem QR não gera
- [ ] toda compra nova nasce com código de cinco símbolos, único por reserva, e o retry da
      mesma chave de idempotência devolve o mesmo código
- [ ] nenhuma tela de comprador e nenhum e-mail imprime `pedidoId`, e o teste que cobra isso é
      executável
- [ ] a busca de inscritos acha a compra pelo código, e o rótulo do campo diz que ela busca
      por ele
- [ ] o backfill roda em dry-run com contadores antes de qualquer escrita, e o rerun converge
      para zero atualizações
- [ ] review antagonista em contexto fresco em 1a, 1b, 3a, 3c, 5a e 5b
