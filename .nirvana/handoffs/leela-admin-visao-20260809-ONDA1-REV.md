# Handoff · ADMIN-VISAO onda 1 — review antagonista (ONDA1-REV)

- **trace_id:** `leela-admin-visao-20260809`
- **lane:** ONDA1-REV · empresa software-forge · perfil `sf-backend-lead` (contexto fresco — não construí o que revisei)
- **sob review:** handoff `leela-admin-visao-20260809-ONDA1.md` + commits `7541ffdf`, `135978a9`, `69e70de8`, `354116a9`, `17f17088`, `e80ab899`, `73eae392`, `e4b78913`
- **data:** 2026-08-10
- **deploy:** nenhum (proibido). **Correção:** nenhuma (defeito vira fix list de lane própria).

## Veredito

**LIBERADA COM RESSALVAS.**

Nenhum bloqueador de segurança, isolamento de tenant ou dinheiro. A fronteira de PII do
`listarClientesDoTenant` está correta e provada por teste que eu mesmo rodei; o gate de papel usa as
duas pernas do RN-401 e paga a dívida da casa em vez de repeti-la; a auditoria é fail-closed nos dois
ramos. Os dois defeitos de severidade média são reais e merecem fix lane antes (ou junto) das ondas
3 e 4, porque os consumidores de tela vão herdá-los.

## Defeitos

### D-1 · MÉDIA · o agendamento não implementa o escalonamento que o próprio comentário promete

`functions/src/platform/rollups.ts:182` — `.schedule('every 1 hours')`.

O cabeçalho do arquivo (linhas 38-40) afirma: "Escalonamento: roda no minuto 15 para não colidir com
o bloco 03:00-03:20 dos crons noturnos". A sintaxe `every 1 hours` (App Engine cron) **não fixa
minuto nenhum** — o Cloud Scheduler escolhe o horário-base (na prática, derivado do deploy). Para
rodar no minuto 15 seria preciso cron: `15 * * * *`. Todos os quatro crons noturnos da casa fixam
horário explícito e `.timeZone('America/Sao_Paulo')` (`coletaDiaria.ts:223-224`,
`encerrarEventos.ts:155-156`, `expurgarSaude.ts:148-149`, `recalcularStatusMembros.ts:22-23`); este
não fixa nem um nem outro.

**Cenário concreto:** deploy às 03:07 → o cron horário pode aterrissar dentro do bloco 03:00-03:20,
com o full scan de `tenants/*` + leitura de termo por tenant rodando em cima de
coletaDiaria/encerramento/expurgo. Não corrompe dado (o `set()` integral é idempotente), mas a
garantia de não colisão existe só no comentário.

**Prova:** análise estática da sintaxe + contraste com os quatro crons da casa. Não provado em
scheduler real (deploy proibido nesta lane).

**Fix sugerido (1 linha):** `.schedule('15 * * * *')`.

### D-2 · MÉDIA · um doc de evento envenenado derruba a lista inteira do admin — contra a doutrina F1 da própria casa

`packages/api-client/src/platform/tenantEventosClubs.ts:94` e
`packages/api-client/src/platform/listasGlobais.ts:101` — `snap.docs.map((d) => parseEvento(...))`
sem isolamento por doc.

A casa já pagou esse defeito uma vez: F1 (review r1) em
`packages/api-client/src/eventos/queries.ts:117-133` escreveu "UM doc envenenado NÃO pode derrubar a
lista inteira do tenant" e envolveu `parseEvento` em try/catch por doc com placeholder degradado
(`eventoDegradado`) — na MESMA coleção, com o MESMO parser fail-fast (lança em janela/faixa/campo
malformado). Os dois readers novos de eventos ignoram esse precedente. O construtor aplicou o
princípio no callable (P-ONDA1-5, doc CRM corrompido loga e pula — testado), mas não nos readers que
as abas Eventos (onda 3) e a lista global `/plataforma/eventos` (onda 4) vão consumir.

**Cenário concreto:** um único evento com faixa malformada (o caso real que originou F1) e a lista
global inteira do painel master lança — a tela da onda 4 nasce quebrável por um doc de qualquer
tenant.

Nota de simetria: `tenantVendas.ts:91,117` (parsePedido/parsePagamento fail-fast) segue o precedente
igualmente fail-fast de `pedidos.ts:84` — inconsistência preexistente da casa, não introduzida por
esta onda; registro sem cobrar desta lane. `listarClubesDoTenantPaginado` usa spread sem parser e não
tem o problema.

**Prova:** análise estática + contraste com queries.ts. Não provado por teste novo (o defeito é
visível por leitura; teste de prova custaria mock de doc malformado no molde do teste do callable).

### D-3 · BAIXA · cursor de doc apagado degrada em silêncio para a primeira página

`functions/src/platform/listarClientesDoTenant.ts:163-171`. Se o doc do cursor sumiu entre páginas
(cliente reagregado/expurgado), a query recomeça da primeira página sem sinalizar nada ao chamador.
O consumidor da onda 3 que estiver seguindo `proxCursor` recebe de novo os itens da página 1 como se
fossem a continuação — duplicatas na UI e, num consumidor mecânico, loop (página 1 cheia devolve
`proxCursor` de novo). A escolha está documentada no código, mas o chamador não tem como distinguir
"recomeçou" de "continuou". Alternativa honesta: flag `cursorPerdido: true` na resposta, ou
`failed-precondition`.

### D-4 · BAIXA · input malformado de admin vira `internal` opaco em vez de `invalid-argument`

`functions/src/platform/listarClientesDoTenant.ts:155-171`. Dois caminhos, ambos alcançáveis só por
quem já passou o gate de papel:
- `cursor` contendo `/` em número par de segmentos ímpares (ex.: `"a/b"`) → `col.doc('a/b')` produz
  path de 5 segmentos, o Admin SDK lança `Error` cru → o callable responde `internal`.
- `pageSize` não numérico (ex.: `"abc"`) → `Math.max(1, NaN)` → `limit(NaN)` lança → `internal`.

Sem vazamento e sem alcance por não admin (a validação vem depois da autorização — ordem correta).
Só o código de erro errado na borda. Registro também: nesses dois caminhos o throw acontece antes do
registro `concedido`, então a tentativa não deixa rastro na trilha (nenhuma leitura de PII ocorreu;
coerente, mas vale saber).

### D-5 · BAIXA · negativa de não autenticado não é registrada — desvio consciente da letra da spec

`functions/src/platform/listarClientesDoTenant.ts:219-226`. O critério de aceite da S1612 diz
"invocado por quem não é platform_admin → negado e a negativa é registrada". Chamada sem auth é
negada SEM registro, por doutrina herdada de `getBankDetailsForPayout` ("auditoria é de acesso
identificado") — documentada no código e travada por teste. Defensável; registro para o maestro
porque é a letra da spec sendo estreitada por precedente, não por decisão desta rodada.

### D-6 · BAIXA · o canário falsifica `get`, não `list`

`functions/src/__tests__/adminVisaoOnda1.integration.test.ts:150-162`. As três pontas do canário usam
`getDoc`. Contra a mutação nomeada no brief (`|| isPlatformAdmin()` na Rule de `crmClientes`) ele
falsifica de verdade as DUAS pernas — rodei a mutação mentalmente: o contexto capacidade-pura
(`{role:'athlete', platformAdmin:true}`) passaria a ler e o `assertFails` quebraria. Mas uma mutação
que abrisse SÓ `allow list: if isPlatformAdmin()` (query, sem o get) passaria ilesa pelo canário.
Proposta de teste (não commitada, por contrato): acrescentar uma ponta com
`getDocs(query(collection(...)))` nas duas pernas.

### D-7 · BAIXA · corrida agendado × manual no rollup: dado velho com carimbo novo

`functions/src/platform/rollups.ts:95-135, 181-187`. Sem trava de execução única. Duas execuções
sobrepostas (cron + botão manual da onda 2) terminam em last-write-wins: cada `set()` é internamente
consistente, mas o run que LEU primeiro e ESCREVEU por último grava o retrato mais velho com
`atualizadoEm` mais novo — inversão de frescor pela duração do run. Hoje inofensivo (base pequena,
janela de segundos). No mesmo bloco: a leitura de termo é sequencial por tenant (`await` no loop,
linha 104) — N+1 com timeout default de 60s no v1; risco de estouro conforme `tenants/*` cresce.

### D-8 · BAIXA · três commits intermediários não compilam (bisect quebrado; HEAD íntegro)

`69e70de8` (23:06:21) adiciona ao barrel `packages/api-client/src/index.ts` os exports de
`tenantEventosClubs`, `tenantVendas` e `listasGlobais` — módulos que só nascem em `354116a9`
(23:06:35), `17f17088` e `e80ab899` (23:06:51). Checkout de qualquer um dos três SHAs intermediários
não passa `tsc`. Consequência direta do mecanismo descrito em P-ONDA1-6 (working tree com tudo
escrito + `--only` por pathspec). Nenhum efeito em HEAD; quebra `git bisect` nessa janela.

## Observações (não numeradas como defeito)

- **Spam de negativa sem rate limiting:** qualquer conta autenticada gera escrita ilimitada em
  `auditoriaAcessos` chamando o callable e sendo negada (1 write por tentativa). Mesmo perfil de
  `getBankDetailsForPayout` — padrão da casa, não desta lane. Custo/ruído de coleção, não segurança.
- **Ramo de falha da auditoria sem teste:** a semântica fail-closed (falha do `add()` na trilha
  derruba a resposta em vez de virar silêncio — `auditoriaAcessos.ts:48` sem catch, awaited nos dois
  ramos) está correta por construção, mas nenhum teste a prova. Não provado — análise estática.

## Vetores do brief — resultado

| # | Vetor | Resultado |
|---|---|---|
| 1 | Vazamento cross-tenant | **Sem defeito.** Callable: cursor resolvido DENTRO de `tenants/{tid}/crmClientes` — cursor forjado de outro tenant não existe ali e degrada (D-3), nunca vaza; path traversal por `/` no cursor não escapa da subárvore do tenant. api-client: `where('tenantId'==)` presente em TODA página, inclusive com cursor (cursor só reposiciona, o filtro permanece); Rules cobrem o resto. Isolamento provado por teste que rodei (12/12). |
| 2 | Gate de papel (duas pernas) | **Paga a dívida.** `isPlatformAdmin()` do core (roles.ts:131) nas duas pernas; teste prova que capacidade pura (sem papel legado) é autorizada. Único callable de plataforma no lado certo da dívida da Parte 4 da spec. |
| 3 | Registro de acesso e negativa | **Correto com ressalvas D-4/D-5.** Ambos os ramos registram ANTES da resposta; falha do registro derruba a resposta (fail-closed, sem silêncio) — por análise estática, sem teste do ramo. |
| 4 | Rollup agendado | **D-1 (minuto/timezone) e D-7 (corrida).** Idempotência ok: `set()` integral, duas execuções seguidas produzem o mesmo doc. |
| 5 | Canário | **Falsifica a mutação do brief nas duas pernas** (rodei mentalmente e rodei a suíte real). Lacuna D-6 (`list`). |
| 6 | Paginação honesta | Clamp [1,100] testado; página parcial → `proxCursor null`; múltiplo exato gera uma página extra vazia (sem mentira, um round-trip a mais). `startAfter` com doc apagado → D-3. |
| 7 | PII em logs | **Limpo.** Trilha: só ids/papel/desfecho. Log de doc corrompido: `clienteKey` (hash) + mensagem de parse com NOMES de campos, sem valores (`cliente.ts:349-469` conferido; confirmado no output real do run — `"CrmCliente ruim: \"eventos\" deve ser mapa"`). Rollup loga só agregados. |
| 8 | api-client | **Conforme.** Porta única (`package.json` exports `.`); seis funções + tipos no barrel raiz; imports `firebase/firestore`/`firebase/functions` no padrão dos vizinhos; zero `firebase-admin` no pacote. |

## O que EU rodei (máquina com 0,35 GB livres medidos — o emulator subiu mesmo assim)

| Comando | Resultado |
|---|---|
| `vitest run src/__tests__/adminVisaoOnda1Paginacao.test.ts` (sem emulator) | **17/17 verde**, 1,9s |
| `npx firebase-tools@13 emulators:exec --only firestore "... vitest run src/__tests__/adminVisaoOnda1.integration.test.ts"` | **12/12 verde**, 8,7s |
| `tsc --noEmit` em `functions/` e em `packages/api-client/` | limpo nos dois |
| `git show --stat` dos 8 commits | território honrado: só `functions/src/{platform,index.ts,__tests__}` + `packages/api-client/src/{platform,index.ts}`; zero linha em `firestore.rules`, `apps/painel/`, `packages/design-system/` |

## O que NÃO verifiquei, e por quê

- **Lint (eslint)** dos dois pacotes — não re-rodado (economia de máquina; `tsc` limpo reduz o risco;
  a claim do construtor segue sendo dele).
- **Regressões** `platformRollups.integration.test.ts` (8/8) e `crm.integration.test.ts` (17/17) —
  não re-rodadas por mim; NÃO as declaro verdes em meu nome. O canário legado citado no achado do
  construtor conferi por leitura do handoff e da Rule, não por execução.
- **Comportamento real do Cloud Scheduler** para `every 1 hours` (D-1) — análise de sintaxe e
  contraste com a casa; prova cabal exigiria deploy, proibido nesta lane.
- **Boards** — não conferi as marcações de kanban do construtor (fora dos vetores).

## Fix list sugerida (lane própria, nesta ordem)

1. D-1: `.schedule('15 * * * *')` em `rollups.ts:182` (1 linha).
2. D-2: try/catch por doc + `eventoDegradado` nos dois readers de eventos (molde já existe em
   `eventos/queries.ts`).
3. D-3/D-4: flag `cursorPerdido` + validação de `cursor`/`pageSize` com `invalid-argument`.
4. D-6: ponta `list` no canário (proposta de teste registrada aqui, não commitada).

## Self-score (contrato do perfil)

- delegation_quality: n/a (lane solo) · outcome_clarity: 0.95 (veredito + defeitos falsificáveis com
  arquivo:linha e cenário) · prioritization_call: 0.9 (fix list ordenada, 1 recomendação por defeito)
- escalation_compliance: 0.95 (zero correção, zero deploy, escrita só neste handoff).
