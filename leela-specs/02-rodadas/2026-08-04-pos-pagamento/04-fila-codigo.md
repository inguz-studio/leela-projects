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
| `B4 · S1222-T4` · meus clubes e convites | **entregue, ⚔ em review** | `4b72c556` (servidor, 22 casos) + `b3e51638` (tela, 14 casos) — `collectionGroup` keyed no trust anchor (molde `getMinhasAfiliacoes`), `orderBy(FieldPath.documentId())` porque ordenar por data **descartaria docs em silêncio** nesta coleção, e o aceite continua no link do e-mail porque o token só existe como hash. **Achado que muda a expectativa do produto:** não existe caminho pelo qual um participante entre num clube, então a tela nasce vazia para praticamente toda conta real (**CLUBES-1** no painel). Traz **três índices de grupo novos**. Lane REV-B4 em voo |
| `B5 · S1222-T5` · as duas portas ⚔ | **entregue** | `bdebe384` — nenhum caminho da área alcança `/plataforma`; a leitura corrente do **ADMINSEP-2** foi implementada com ponto de mudança único |
| `C1 · S1223-T1` · `/definir-senha` na landing ⚔ | **entregue** | `2d7f24d7` — nenhum seam novo, nenhum token inventado |
| `C2 · S1223-T2` · destino por origem ⚔ | **entregue** | `6d092619` |
| `C3 · S1223-T3` · domínio autorizado no Auth | **pendente** | passo de **operação**, fora da esteira — e agora mais urgente: é ele que faz a jornada de primeiro acesso terminar dentro da área |

**A frente B foi revisada em 05/08 — APROVADA-COM-FIXES** (lane REV-AREACLIENTE, `46a5eb8a` +
`40f094b1` + `a1486abe`). Os dezesseis vetores das duas lanes de construção foram atacados e **a
fronteira não quebrou**: o vínculo que autoriza o histórico se sustenta nos dois sentidos (uid
igual com e-mail diferente é filtrado em memória, e-mail igual com uid diferente nunca chega à
memória porque a query é por uid, e o campo não é forjável porque `pedidos` é `write: if false`),
e a área é **estritamente mais fechada que a Rule da RN-469**. O segundo vetor declarado era
**inalcançável** — o `in` de trinta nunca corta, porque o teto de pessoas por conta é dez —, e o
corte real acontece dez fichas antes, no `.limit(10)`, onde ele era mudo (D4).

O que caiu foram **quatro faltas caladas**, três delas da mesma classe que originou esta rodada.
A maior não estava em vetor nenhum, porque cada task estava certa sozinha: **a área foi
construída inteira e ficou sem rua** (D1, ALTA). Os únicos caminhos até `/minha-conta` eram os
dois momentos em que a pessoa acabou de chegar; o rótulo da conta no header era texto morto; e o
"não sei minha senha" que a `S1221-T1` registrou por escrito como pertencendo à C1 **nunca foi
ligado** — a prop existia e nenhum chamador a usava. Isso deixava sem saída exatamente quem esta
rodada existe para atender, porque a conta do comprador nasce sem senha e o link vai por e-mail;
com o e-mail quebrado — 04/08 — a porta de entrada mandava usar o mesmo e-mail da compra e não
oferecia caminho nenhum até uma senha, e é pior na **recompra**, em que o e-mail de "conta criada"
não é enviado de propósito. Os outros três: senha gravada com login falho virava beco (D2), a
falta da base pública deixava o cartão afirmar um caminho que não existe naquela configuração
(D3), e o corte de fichas era mudo (D4). Linha de base nova da suíte da landing: **53 arquivos /
665 testes**.

⚠️ **O nome do log mudou** e a política de alerta da operação tem de casar:
`area_cliente_qr_keyring_ausente` → **`area_cliente_link_ingresso_indisponivel`**, severidade
ERROR, `alerta: true`, com `keyringAusente` e `basePublicaAusente` no payload. São **duas**
variáveis a conferir antes do deploy, não uma.

**A dependência A4 foi paga na mesma noite** (`b1bd5dc4`, revisada em `8d779dce`+`d58caa5d`), sem
retrabalho na B1 — a decisão declarada de atravessar se confirmou correta, porque a dependência
era de higiene do vínculo e não de autorização.

**Pré-requisito de deploy que não é opcional:** `firebase deploy --only firestore:indexes`
**antes** do deploy das functions. O emulador não cobra índice, então nenhum teste desta frente
prova este passo; sem ele, `getMeusIngressos` degrada e quem foi presenteado não vê o próprio
ingresso.

**+05/08 · agora são QUATRO overrides de grupo, e o passo continua sendo um só.** A B4 acrescentou
três `fieldOverride` COLLECTION_GROUP ao `firestore.indexes.json`, e as três queries dela dependem
deles:

| collectionGroup | fieldPath | queryScope |
|---|---|---|
| `inscritos` | `pessoaRef` | COLLECTION_GROUP ASC (da BUILD-AREACLIENTE-2) |
| `membros` | `atletaId` | COLLECTION_GROUP ASC |
| `afiliados` | `responsavelEmail` | COLLECTION_GROUP ASC |
| `convites` | `email` | COLLECTION_GROUP ASC |

Sem o deploy de índices cada query lança `FAILED_PRECONDITION`, e o caminho **não engole**: cai no
`try/catch`, a lista volta vazia e a resposta traz o marcador de incompleta, que a tela diz, mais
`logger.error` com `alerta: true`. A pessoa vê um aviso honesto em vez de uma lista vazia mentindo
— mas **vê um aviso**, e é por isso que o passo não pode ser esquecido. **Política de alerta: três
nomes novos para casar** — `area_cliente_clubes_falhou`,
`area_cliente_convites_influenciador_falhou` e `area_cliente_convites_promotor_falhou`, todos ERROR
com `alerta: true` e todos sem PII.

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

**Estado em 05/08 · Frente 5 construída inteira, fora do ar. Falta a execução do retroativo (ato
do dono) e a review da 5c, em voo.**

| # | Task | Estado | Prova |
|---|---|---|---|
| 5a | `S1228-T1` ⚔ | **entregue e revisada** | `3acc6877` · review `b8c7c29e` (APROVADA-COM-FIXES) · defeito D-1 fechado em `48fc7116`, sorteio criptográfico em `d36afb64` |
| 5b | `S1228-T4` ⚔ | **entregue e revisada** | `d1d6582a` · review `eea10348`+`813a38c1` — **REPROVADO na forma entregue, APROVADO depois dos dois fix-commits**. Sete defeitos; o desenho central resistiu a tudo e caiu a borda. Testes 9 → **21** · ver §Saída da review antagonista REV-5B |
| 5c | `S1228-T2` | **entregue, ⚔ em review** | `6993a36a` · a tela mostra `PED-XXXXX` nos dois ramos e o e-mail ganhou o bloco "Código da compra" antes dos cartões de ingresso; cinco caminhos de ausência testados e asserção **tripla** de ausência do id. **ACHADO: a sexta superfície** — `Ticket.tsx` imprimia o `inscritoId`, que carrega o id do pedido inteiro. Suíte da landing 55/681, três execuções. Lane REV-5C em voo no fechamento do selo |
| 5d | `S1228-T3` | **entregue** | `3d666d40` · 85/85 nos alvos, 771/771 na vizinhança |

**A ordem da REV-COD5A foi cumprida.** A review escreveu que *"a 5d não deve ir para produção
antes"* do fix das Rules, porque ela é a superfície que transforma um código plantado em resposta
errada ao telefone. O `48fc7116` aterrissou **antes** da lane da 5d.

**A ordem interna que continua valendo:** o backfill (5b) roda antes de 5c e 5d irem ao ar. Sem
ele as duas estreiam mostrando ausência em toda compra que já existe — que é a RN-475 funcionando
e parecendo defeito.

**A conta do retroativo mudou, e a spec merece a correção.** A `06-spec-codigo-pedido.md` contou
onze pedidos de seed mais a compra real; o ensaio contra produção leu **17** — os onze de seed
mais **seis checkouts reais** de 03 e 04/08, todos do domínio do dono. A ordem de grandeza não
muda. Dois fatos que valem para quem sequenciar a execução: **`pedidoCodigos` em produção tem zero
documentos hoje** (a 5a não foi deployada, então o backfill entra num espaço limpo, sem reserva
viva com que colidir), e **a compra do incidente PIXREAL está na lista** — a do ingresso `T93N7F`,
paga em 04/08, ganha código na primeira execução real.

### Saída da review antagonista REV-5B (`eea10348` + `813a38c1`)

**REPROVADO na forma entregue · APROVADO depois dos dois fix-commits.** A review não era opcional
porque o script escreve em produção, e ela pagou o próprio custo: **sete defeitos**, um deles
decisivo para a execução do dono. O desenho central — transação por pedido, `create` na reserva,
porta do "já tem código", espelho autoritativo — resistiu a tudo que foi jogado contra ele. O que
caiu foi a borda: para onde a escrita vai, o que a ferramenta faz com dado torto, e o que ela
promete ao dono na saída.

**Defeito 1 (ALTA), medido e não deduzido.** Com `FIRESTORE_EMULATOR_HOST` no ambiente,
`node backfill --project leela-hub --apply` escreve no **emulador**, imprime `Projeto: leela-hub`,
`Modo: APLICAR`, `Aplicado: N pedido(s)` e sai **0**. Com o seed carregado, a execução inteira do
runbook — ensaio, aplicação, conferência — converge para zero e parece perfeita, com produção sem
receber uma letra: o dono marcaria o card, a 5c e a 5d subiriam, e as dezessete compras
continuariam sem código. É o acidente clássico que a obrigatoriedade do `--project` fechou pela
frente, entrando pela porta de trás — e a variável está no fluxo de trabalho desta casa, porque o
stack local do landing pede `FIRESTORE_EMULATOR_HOST=127.0.0.1:8180`. Agora o destino é declarado
nos dois sentidos e sai impresso antes da primeira leitura (`Destino: PRODUÇÃO — Firestore real`).

Os outros seis: `inscritoRefs` com id que não é caminho de documento derrubava a varredura
inteira; espelho com código canônico sobre pedido sem código era **re-sorteado**, apagando o
código já comunicado; reserva que já apontava para o pedido era ignorada e virava órfã;
interrupção deixava trava de 60-75 s e o relatório mandava investigar; o **ensaio saía 0 sempre**,
e o runbook usava o ensaio como conferência; e o teste de concorrência era flaky (~1 reprovação a
cada 4). Testes **9 → 21**, verdes em três execuções seguidas.

**As três condições da execução real** estão no card do dono em [[V1-KANBAN]] e não são
formalidade: rebuild imediatamente antes (o script importa `functions/lib`, e a árvore desta
madrugada teve lane em voo em `src/checkout`); conferir a linha `Destino:` do ensaio antes de
digitar `--apply`; e gravar a saída em arquivo, porque o mapa pedido→código só existe ali — com o
aviso de que esse arquivo carrega o **uid do comprador** e serve para chamado interno, não para
print em grupo. Interromper **não corrompe** (medido com o processo morto no meio: zero reserva
órfã, zero pedido com código sem reserva, zero espelho fora de sincronia), mas trava o pedido em
voo por cerca de um minuto.

**Auditoria somente-leitura contra `leela-hub`**, com credencial montada fora do repo e apagada em
seguida, zero escrita: as medições da construção batem (17 pedidos, 0 completos, 22 espelhos a
carimbar), e **nenhum** dos cenários de risco desta review existe na população de hoje —
`pedidoCodigos` vazia, zero pedido com código, zero id repetido, zero shape torto e **zero espelho
com código vivo**, que era o cenário de perda. O único defeito alcançável na execução real do dono
era o **1**, que é ambiental. Os outros são guarda de borda, o que não os torna opcionais: a
ferramenta fica no repo e a população cresce.

**O que não foi provado, e está declarado:** o teto de 500 escritas por transação (o emulador não
o aplica — 522 escritas commitaram sem erro, então a frase do handoff da 5b sobre a falha capturada
segue sem lastro executável; sem risco hoje, porque a maior compra tem três inscritos), o `--apply`
real contra produção (é ato do dono, por política) e a contenção com mais de duas execuções
simultâneas.

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
| RS1-8 | **O sorteio criptográfico não chegou ao caminho da venda.** `d36afb64` trocou o **default** de `gerarCodigoPedido`, mas o default nunca é alcançado: `createInscricaoChargeCore` → `criarDocsDeCheckout` → `sortearCodigoPedidoNaTx` → `gerarCodigoPedido` passam `random` explicitamente, todos com `= Math.random` escrito. **Toda compra nova continua sorteando com o PRNG do V8** — que é exatamente a ressalva R-1 da REV-COD5A e o motivo declarado do próprio commit | Achado da lane do backfill ao tentar reusar o mecanismo, e o território (`functions/src/checkout`) tinha lane em voo. **Conserto de três linhas**: `random: () => number = Math.random` vira `random?: () => number` nos três pontos, continuando a repassar o argumento — `gerarCodigoPedido(undefined)` já cai no sorteio criptográfico, e a injeção dos testes fica intacta. **✅ FECHADO em 05/08 (`61776052`)**, exatamente nas três linhas propostas, com vermelho medido antes (`expected 'AAAAA' not to be 'AAAAA'`) e 4/4 depois. E o achado cresceu duas vezes: o **mesmo** padrão estava vivo no código do INGRESSO (`8d779dce`, achado pela REV-A4) e nos **três** geradores de `packages/core` — convite de organizador, convite de clube e refCodigo de afiliado (`20a9c904`, lane FIX-RNG-CORE). Varredura final: **zero `= Math.random` como default de parâmetro no repositório inteiro** |
| RS1-9 | **Dois pedidos cancelados em produção apontam para inscrito que não existe.** Os dois PIX cancelados de 03/08 no `desafio-mtb-costa-lagoa-2026` listam em `inscritoRefs` um inscrito que não existe na coleção. É estado que a ADR-011 diz ser impossível — pedido e inscritos nascem no mesmo commit | Não é dano do backfill (ele lê antes de escrever e só carimba inscrito que existe **e** cujo `pedidoRef` bate; reporta "fora de alcance" e segue). **Higiene de dados, então não sobe ao dono** (R-0803B-1): pede investigação de quem tem o webhook de expiração e cancelamento na mão, **antes** de qualquer limpeza — o estado impossível é o sintoma, e limpar sem entender apaga a única evidência |
| RS1-10 | **`pnpm build` na raiz falha e MUTA `pnpm-workspace.yaml`.** O gate de instalação quebra por `@sentry/cli` e, ao quebrar, escreve `'@sentry/cli': set this to true or false` dentro de `allowBuilds`. Duas lanes desta noite reverteram a linha à mão | Ruído de ferramenta que volta em toda lane que rodar o comando da raiz. O contorno em uso é build por pacote. Fechar decidindo o valor do `allowBuilds` de uma vez, em vez de reverter toda noite.<br>**+06/08 · promovido de ruído a conserto, com o número.** O arquivo foi revertido à mão **três vezes** no dia 05/08, por lanes diferentes, e o contorno em uso já virou folclore repassado de brief em brief (`--config.verify-deps-before-run=false`). Uma lane inteira ficou sem conseguir rodar o gerador de tokens do design system por causa disso e teve de chamar o binário direto. **O arquivo que ele suja é o que descreve o workspace**, então quando ele suja o `pnpm install` quebra para todo mundo, não só para quem rodou o comando. Não é limpeza recorrente: é decidir o valor do `allowBuilds` uma vez, commitar, e deixar de gastar uma reversão por lane. Enquanto isso não acontece, **toda lane de deploy tem de conferir o arquivo no pré-flight** — a DEPLOY-TUDO-0805 conferiu, e foi por sorte que estava limpo |
| RS1-7 | **Config de emulador com `"host": "::"` produz falso-vermelho.** Testes que derivam o host de `FIRESTORE_EMULATOR_HOST` recebem um endereço IPv6 e falham com "client is offline", 25 de 26 vermelhos **sem nenhuma regressão real**; com `127.0.0.1` os 26 passam | Ruído de gate que pode **mascarar regressão de verdade** numa próxima lane. Padronizar IPv4 explícito em todas as configs de emulador do repositório, não só nas de lane. Três lanes desta noite já subiram com IPv4 por conta própria |

### Fila técnica das reviews da madrugada de 05/08 (REV-5B, REV-AREACLIENTE, REV-A4 e FIX-RNG-CORE)

Nenhum destes pede juízo de dono — o que pedia subiu ao painel. São os resíduos técnicos das
quatro lanes, no mesmo molde dos itens acima e sem repetir nenhum deles.

| # | O quê | Por que ficou de fora do fix |
|---|---|---|
| RS1-11 | **Não existe reprocesso do `contaSemFriccao`.** Quando a leitura de papel propaga uma falha do Auth, a conta **já nasceu** e a compra fica órfã: pedido sem carimbo, ficha sem vínculo, e-mail de senha nunca enviado. E não há caminho de volta — `reenviarEmailsPedido` gateia por `contaCriada === true` e o carimbo nem existe (devolve `nao_aplicavel`, medido), os três chamadores de `garantirContaSemFriccao` são os confirmadores e a confirmação é exactly-once, e não existe varredura equivalente ao `varrerIngressosOrfaos` | A classe é **anterior** à RN-449d — qualquer exceção entre o `criarConta` e o carimbo produz o mesmo estado. O que a A4 acrescentou é um gatilho novo no caminho **mais comum**, o do comprador de primeira viagem. Construir varredura agendada é feature, não fix de review. Mitigação que existe hoje e que faz disto MÉDIA: `solicitarRedefinicaoSenha` é público, neutro e funciona para conta sem senha. **O caso 1 do `revA4.antagonista` é o registro executável de que o reprocesso não existe** — quem o construir tem de fazer o caso mudar de desfecho, não apagá-lo |
| RS1-12 | **`lerPedidosDaConta` limita 200 SEM `orderBy`.** O Firestore devolve os 200 primeiros por `__name__`, não os 200 mais recentes, e a ordenação por data é feita **depois, em memória, sobre o conjunto errado**. Acima de 200 compras a mais recente pode simplesmente não estar no conjunto — o defeito de 04/08 outra vez. E não existe `listaCompleta` do lado das compras | É a **única** da leva com potencial de repetir o defeito desta rodada, e a única que precisa de passo de deploy: a correção é `.orderBy('criadoEm','desc')` mais um índice **composto** novo (`contaSemFriccao.contaUid` ASC, `criadoEm` DESC). Por isso a review não a aplicou. A B4 já nasceu imune, com `orderBy(__name__)` explícito e leitura de `TETO + 1` para saber que cortou |
| RS1-13 | **Seis suítes de `functions` gateiam por `FIRESTORE_EMULATOR_HOST` e não por `LEELA_FS_EMU_PORT`.** Rodar só com a porta faz a suíte inteira sair **skipped com exit 0**, que é indistinguível de verde para quem lê rápido | Armadilha **medida** nesta rodada, e é ruído de gate que mascara ausência de prova. Da mesma família do RS1-7 (o `"host": "::"`), e fecha junto: o gate tem de derivar de uma fonte só, e pular tem de ser visível na saída |
| RS1-14 | **`packages/core` não tem runner de teste próprio.** Não há `vitest` nas dependências dele nem `vitest.config.ts`, então os testes do core moram em `functions/src/__tests__/*Core.test.ts` e o core depende do runner de `functions` para provar qualquer coisa | Recusado **de propósito** pela FIX-RNG-CORE, com a razão escrita: criar o runner exige `pnpm install`, que reescreve o `pnpm-lock.yaml` da raiz e mexe em `node_modules` **enquanto duas lanes estão em voo** buildando e testando — um lockfile compartilhado colide muito mais do que três arquivos de teste que ninguém está tocando. O momento de resolver é com as lanes paradas |
| RS1-15 | **A árvore tem 14+ `firebase*.json` na raiz**, um por lane, e a tabela de portas é combinada de cabeça | Limpeza de fechamento de sprint. **Acrescentado pela REV-5B:** colisão de emulator é **indistinguível de regressão** — a primeira execução da suíte dela deu 8/9 e parecia regressão real, e era a porta de outra lane em voo; foi a terceira vez na rodada. Quem abrir lane tem de conferir a tabela de portas antes de escolher a sua, e **reservar `hub` e `logging` também**, não só firestore e auth |
| RS1-16 | **O pregamento global de `Math.random` nos testes de sorteio só é seguro enquanto `fileParallelism: false` valer** em `functions/vitest.config.ts`. Depois da FIX-RNG-CORE são **cinco** arquivos, não dois | Frágil, não quebrado: a janela é uma chamada e o `finally` cobre exceção. O risco é alguém ligar paralelismo de arquivo num dia distante, e quem for fazê-lo tem de olhar os cinco antes |
| RS1-17 | **A guarda de `NaN` não é uniforme entre os geradores.** `codigoPedido` e `codigoIngresso` ganharam `Number.isFinite` no clamp em `d36afb64`; `gerarCodigoOrganizador`, `gerarCodigoConvite` e `gerarRefCodigo` ainda têm o clamp antigo, e um `random()` que devolvesse `NaN` produziria a string `"undefined"` dentro do código | **Só alcançável por injeção explícita** (test-only) — o default novo nunca devolve `NaN` —, então é dívida de uniformidade e não defeito de produção. Ficou de fora porque o brief da lane mandava mudar **só o default**, e alargar sozinho é como uma correção vira duas |
| RS1-18 | **O teto de 500 escritas por transação do backfill não tem prova executável.** O emulador não o aplica: um pedido com 520 inscritos commitou **522** escritas sem erro, então a frase do handoff da 5b ("a falha é capturada, o pedido fica de fora e o relatório o nomeia") segue sem lastro | Sem risco hoje — a maior compra de produção tem três inscritos —, mas a frase está escrita e não tem prova. Fecha quando alguém tiver como forçar o limite fora do emulador, ou some do handoff |
| RS1-19 | **Quem não recebeu o e-mail do convite só consegue outro pelo organizador.** Reemitir token é `cadastrarAssessoria`/`salvarAfiliado`, as duas com gate de escritor do tenant, então o convidado não tem — e, pela regra da credencial, não **deve** ter — botão de reenviar dentro da área | Não é defeito: dar ao convidado um botão que reemite token criaria a segunda superfície de credencial que a spec proíbe. O que falta é o caminho **humano** — hoje a pessoa tem de pedir ao organizador por fora do produto, e nada na tela diz isso. O conserto barato é a caixa de convites dizer a quem pedir; o caro é uma solicitação de reenvio que passe pelo organizador. **CONVITE-1** |
| RS1-20 | **O gate "suíte da landing 2× verde" depende de quantas lanes estão rodando emulator na máquina.** A B4 mediu: a linha de base só reproduz com `--testTimeout=30000`, porque o primeiro render do barrel do design system leva cerca de 17 segundos sob CPU disputada — o que é lentidão de ambiente, não regressão | Ruído de gate que **mascara e fabrica** vermelho, da mesma família do RS1-7 e do RS1-13. A lane não mexeu no config de propósito: mudar o `testTimeout` do arquivo é decisão de quem conduz, não de quem constrói. Enquanto ela não for tomada, o gate da landing tem de ser lido junto do número de lanes vivas |
| — | **Higiene da REV-AREACLIENTE que não coube acima**, agrupada para não se perder: canal lateral de **tempo** na anti-enumeração do reenvio (o conteúdo é idêntico, provado; a latência não — piso de tempo fixo ou disparo sem `await`); `getClaims()` usando token em cache, o que faz um `platform_admin` com token velho ver a porta do organizador (nenhum caminho até `/plataforma`) e `tenantId: '   '` virar organizador; `salvarMeusDados` sem teto de tamanho no `nome` (sem XSS, porque o React escapa — o risco é doc inchado e nome absurdo denormalizado adiante); `montarIngresso` em silêncio quando `tenantId` está vazio; e o CTA do checkout vivendo **dentro** de `role="status" aria-live="polite"`, o que faz toda mudança nos irmãos re-anunciar a região inteira com o rótulo do CTA junto — ruído de leitor de tela no momento em que a pessoa mais precisa ouvir uma coisa só | Nenhuma bloqueia, nenhuma é regressão desta rodada, e todas são de uma linha a um parágrafo. Ficam listadas porque a review as mediu e ninguém deveria redescobri-las |

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
- [x] nenhuma tela de comprador e nenhum e-mail imprime `pedidoId`, e o teste que cobra isso é
      executável — `6993a36a` do lado do comprador (com asserção **tripla** de ausência: o id
      inteiro, o uid sozinho e o `inscritoId`, mais um canário que varre o diretório e vale para
      a tela que alguém escrever amanhã) e `3d666d40` do lado do operador. **A varredura da spec
      tinha deixado passar uma sexta superfície** — o `inscritoId` do cartão do ingresso, que
      carrega o id do pedido dentro de si —, e é ela que o terceiro ramo da asserção pega
- [x] a busca de inscritos acha a compra pelo código, e o rótulo do campo diz que ela busca
      por ele — `3d666d40`, as duas metades com teste
- [x] o backfill roda em dry-run com contadores antes de qualquer escrita — `d1d6582a`, com o
      ensaio contra produção executado em leitura pura. **A convergência do rerun para zero só
      pode ser provada depois do `--apply`, que é ato do dono**; no emulador ela está presa por
      teste de idempotência
- [x] review antagonista em contexto fresco em 1a, 1b, 5a e **5b** — as quatro rodaram
      (`706d9b02`+`a769cfb9`, `b8c7c29e`, `eea10348`+`813a38c1`), e a da 5b foi a única que
      **reprovou** antes de aprovar. **Faltam 3a e 3c**, gated pelos vetos da Arena, e a **5c**,
      que aterrissou e está em review no fechamento deste selo

### Fila técnica das reviews de 05/08 e 06/08 (REV-PARSE, REV-PAINEL, REV-MOTION, REV-CONTAS-MOTOR, DIAG-STORAGE-CAPA e SPEC-PROCESSO-DEPLOY)

Nenhum destes pede juízo de dono — o que pedia subiu ao painel como **PARSE-1**, **RESPIRO-1** e o
item de observabilidade que foi para o CTO humano. São os resíduos técnicos das lanes do dia,
no mesmo molde dos itens acima e sem repetir nenhum deles. O que já tem card no kanban fica
apontado, não duplicado.

| # | O quê | Por que ficou de fora do fix |
|---|---|---|
| RS1-21 | **`SolicitarRepasseModal.tsx:166` é campo numérico do navegador e ninguém declarou.** O handoff do parser de dinheiro afirma que "lote, kit, cupom e repasse usam `type="text" inputMode="decimal"`". Existem **dois** modais de repasse — o do influenciador, que é texto, e o do organizador, que não é —, e a lane conflacionou os dois. Consequência: o silêncio que a lane diz ter fechado ("o botão morria sem dizer por quê") **segue aberto nesse modal**, porque texto ilegível vira vazio, cai no motivo `vazio` e a dica continua nula | Achado da review por contagem, não por leitura do handoff. É decisão de tela, e a troca de tipo de campo é a mesma da **PARSE-1** item 2 — entra junto com os treze, não sozinha. O que **não** entra junto é a correção do handoff, que já está feita aqui |
| RS1-22 | **`automacaoForm.ts:88` afirma no comentário que o core acusa, e o core não acusa.** Quando o texto é ilegível ou o valor é menor que um, o campo do intervalo fica **ausente**, e o validador só olha o intervalo quando ele existe. A automação salva com o padrão de vinte e quatro horas, calada. Digitar `0` produz exatamente isso; acima de setecentos e vinte **é** acusado corretamente | **Não é regressão** — a forma anterior tinha o mesmo buraco. O que é novo é a alegação falsa escrita no comentário, e corrigi-la é lane de automação, não de parser: mexer no ramo sem entender a política de intervalo trocaria um silêncio por uma recusa que talvez o produto não queira. A frase de tela que fecha o lado do usuário é o item 5 da **PARSE-1** |
| RS1-23 | **Três arquivos de dinheiro ficaram fora do conserto do parser, e a premissa que os deixou de fora era falsa.** A lane declarou que "nenhum deles é caminho de dinheiro"; **três dos quatro são**. `TermsEditor.tsx` carrega taxa da plataforma, mensalidade, juros ao mês, parcela mínima e valor fixo; `RetencaoEditor.tsx` carrega o percentual de retenção do repasse; `politicaForm.ts` carrega a taxa de transferência. O pior é o primeiro: ele ainda usa a multiplicação por cem em ponto flutuante que esta rodada removeu de todo o resto, e **campo apagado grava zero** — `Number("")` é `0`, e o validador de termos comerciais aceita zero como legítimo, então apagar a taxa por engano grava taxa de 0% e mensalidade de R$ 0 sem uma linha de recusa | A razão declarada de ficar fora é válida: a família `plataforma/**` tem defeito próprio e outra régua, e mexer só na leitura deixaria o arquivo com duas. O que a review corrige é a **premissa**, não a decisão. **Pede lane própria, e ela vem antes de qualquer negociação comercial nova** — é a tela onde se digita quanto a plataforma cobra |
| RS1-24 | **O componente `Toolbar` ficou órfão no design system, junto de sete variáveis de layout sem consumidor.** Depois que a barra superior saiu do painel, a varredura devolve zero consumidores em todos os apps, no showcase e nos testes de ponta a ponta: sobram o próprio componente, o teste dele, as histórias e a documentação. Os sete tokens: `--layout-page-px`, `--layout-page-pt`, `--layout-page-pb`, `--layout-toolbar-pb`, `--toolbar-gap`, `--toolbar-end-gap` e `--toolbar-mb` | Apagar primitivo do design system é `packages/**`, outra alçada, e as duas lanes que o mediram estavam em `apps/painel`. A recomendação escrita é **deprecar, não deletar agora**: marcar com data e motivo, manter export, histórias e documentação, e remover numa janela de revisão do design system se ninguém aparecer. **Não é dívida de tamanho, é de sinal** — primitivo órfão vivo no catálogo é convite para alguém reintroduzir a barra sem saber que ela foi removida por decisão |
| RS1-25 | **O parser de dinheiro deixa vazar zero negativo e o irmão dele defende explicitamente contra isso.** `parseValorPtBr` devolve `-0` em centavos, em valor e na forma canônica; `parseContagemPtBr` defende e documenta por quê, com a frase "para não vazar num payload e voltar como `-0` de um documento". Assimetria entre irmãos que nasceram na mesma rodada | **Impacto real hoje é nulo e está medido**: a chamada serializa em JSON, e JSON normaliza zero negativo para zero, então o valor não chega ao documento; e a validação de preço deixa passar porque zero negativo não é menor que zero. Não foi consertado porque mexer na montagem do resultado numa review de dinheiro custa mais do que vale. Fecha quando alguém encostar no módulo por outra razão |
| RS1-26 | **A tela de upload repassa a mensagem crua do provedor, e a mensagem é ambígua por construção.** Quando a consulta entre serviços falha dentro da regra de arquivo, a negação sai com a **mesma frase** de uma negação legítima de permissão. Foi isso que fez o defeito do upload de imagem durar meses: quem lia não conseguia distinguir "você não pode" de "eu não consegui perguntar" | A tradução foi escrita pela lane do diagnóstico e devolvida para a lane de tela, que não a executou. Quatro frases, uma por código de erro, em `ImageUploadField.tsx:136-139`. **Barato, e é a única defesa contra a próxima ocorrência da mesma família** — a permissão está concedida hoje, e nada garante que um projeto novo nasça com ela |
| RS1-27 | **O runner de teste do painel resolve o design system pelo artefato buildado, não pelo código-fonte.** Não há alias no `vitest.config.ts` do painel, então quem mexe no design system e roda a suíte do painel sem buildar antes está testando a versão anterior. Da mesma família, o script de lint da landing cobre `app` e `lib` e **não cobre `test/`**, onde já morava um erro que ficou vermelho sem ninguém ver | Ruído de gate que **mascara ausência de prova**, exatamente como o `"host": "::"` do RS1-7 e o gate por variável de ambiente do RS1-13. Fecha junto: uma fonte só para o gate, e pular tem de ser visível na saída. Enquanto não fecha, quem encerra rodada com mudança no design system **tem de rodar o build do design system e reexecutar a suíte do painel** |

**Já tem card, não duplicar aqui:** ligar a conferência de prontidão a um comando nomeado e a um
passo de esteira é a **S040** no Backlog do [[V1-KANBAN]] (renumerada em 06/08 — nasceu `S034` e
colidia). O `pnpm-workspace.yaml` continua sendo o **RS1-10**, agora com o número de reversões e a
razão para ele deixar de ser limpeza recorrente. A tradução dos erros de upload nasceu na
DIAG-STORAGE-CAPA e está como `S036-T5` no card dela.
