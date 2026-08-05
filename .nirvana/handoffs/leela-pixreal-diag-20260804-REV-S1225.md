# HANDOFF · REV-S1225 — review antagonista da S1225 (contexto fresco)

- Lane: REV-S1225 · Employee: sf-qa-engineer (software-forge) · trace: `leela-pixreal-diag-20260804`
- Sob review: `bdc9a531` (T1 rules RN-469) · `7f992e75` (T2 tela+copy) · `0bf6f60c` (T3 estados por meio)
- Território tocado: `apps/landing` + teste de rules em `functions/src/__tests__/`. `firestore.rules` **não foi alterado**.
- Sem deploy. Sem escrita em produção. Sem navegador.

## VEREDITO: APROVADA-COM-FIXES

A abertura das rules está correta e é estreita. Os dois defeitos achados estão na
**tela** (T3), são da mesma família que a rodada veio matar (copy que afirma o
que a plataforma sabe ser falso), e foram corrigidos com teste que os pegaria.

| Commit | Papel |
|---|---|
| `706d9b02` | teste antagonista de rules — mede o que a suíte do construtor não mediu |
| `a769cfb9` | fix dos dois defeitos da T3 + teste |

## Ambiente (reprodutível)

Emulator Firestore EXCLUSIVO desta lane na **8631**, config fora do repo, JDK 21.
A suíte completa de `functions/` nunca foi rodada.

```bash
export JAVA_HOME="C:/Users/Vitor Eduardo/.jdks/jdk-21.0.11+10"; export PATH="$JAVA_HOME/bin:$PATH"
npx firebase-tools@13 emulators:start --only firestore --project demo-leela --config <scratchpad>/firebase.rev.json
cd functions && FIRESTORE_EMULATOR_HOST=127.0.0.1:8631 npx vitest run src/__tests__/pedidoProprioRulesAntagonista.integration.test.ts
```

## Vetor a vetor

| # | Vetor declarado | Resultado |
|---|---|---|
| 1 | query `responsavel.atletaId` virou capacidade de LISTAR | **CONFIRMADO e agora testado.** O trailer do `bdc9a531` afirmava isto sem teste. É provável, sim — e **atravessa tenants**. Só o dado do próprio comprador. Juízo: manter, com o fato registrado. |
| 2 | escritores de `responsavel.atletaId` | **FECHADO.** Único escritor de produção é `createInscricaoCharge.ts:1697` (`caller.uid`). `pedidos.seed.ts` é Admin SDK. Nenhum caminho aceita o campo do input. |
| 3 | `contaSemFriccao.contaUid` é vínculo por e-mail | **ACEITO COM RESSALVA (juízo do dono).** O valor sai de `getUidPorEmail` (`contaSemFriccao.ts:203`): conta preexistente é **reusada sem prova de posse**. Um campo derivado de e-mail virou **fronteira de autorização**. O código já trata hijack como risco do lado da `pessoa` (guard "first-claim"); não há equivalente no carimbo do pedido. Fronteira é RN-174, fora desta lane. |
| 4 | ordem dos disjuntos / `resource == null` em query | **FECHADO.** `tenantId` ausente não vira erro, vira `null`; `||` absorve erro do disjunto anterior. O que segura a porta é a **guarda de PAPEL** de `isTenantWriter`, não a de tenant — registrado como load-bearing (teste). Doc inexistente segue negado. |
| 5 | guardas `in` com `responsavel` não-map | **FECHADO, fail-closed.** `responsavel` string, `responsavel` sem `atletaId` e `contaSemFriccao` string: todos negam. E não derrubam o organizador (curto-circuito). |
| 6 | o que a leitura ENTREGA, campo a campo | **MEDIDO.** Entrega `endereco`, composição financeira, `aceites.origem` (`ipHash` + `userAgent` **em claro**, RN-442), `contaSemFriccao`, e os campos da lane paralela: `emailIngressos` e `reenvioEmails`. Decisão cross-lane abaixo. |
| 7 | `inscritoPedidoRules` e `repasseRules` não rodadas | **RODADAS, VERDES** (40 testes). |
| 8 | furo do strip de comentários da varredura | **PARCIALMENTE FALSO, medido.** O furo do `//` **não existe**: o regex exige início de linha, então URL no meio da linha não esconde copy. O furo REAL é o bloco: `/*` dentro de string apaga tudo até o próximo `*/`. Nenhuma ocorrência hoje; virou canário no teste. |
| 9 | varredura cobre só `checkout/*.tsx` | **VARRIDO À MÃO, LIMPO.** `apps/landing`, `apps/painel`, `functions/src/email` e `packages/core`: zero promessa de confirmação automática fora de comentários. Escopo estreito não está escondendo nada hoje. |
| 10 | "o acesso vai para {email}" | **DECISÃO JÁ TOMADA, não é pendência.** Brevo destravada pelo dono em 05/08 (prova 200). A tela promete um canal que existe. |
| 11 | `feedback-info` no tema brasa | **PROVADO POR FONTE, sem navegador.** `rn-themes.ts` define o trio nos quatro temas (brasa: `#F9619A` sobre `#351322` — o rosa heroico, como o construtor disse) e o par está na matriz AA do DS (`contrast.test.ts:123`). Falta só o olho do dono. |
| 12 | ausência do CTA varre só links | **VERDADE, e agora trancada.** `<button onClick={router.push}>` passaria pelo teste do construtor. Meu teste varre link **e** botão, por `href` e por texto. Nenhum controle leva a "meus pedidos" hoje. |
| 13 | `parsePedido` estrito derruba a consulta SEM sinal | **DEFEITO CONFIRMADO → corrigido (parte 2 do fix).** Existe doc que as Rules **deixam ler** e o `parsePedido` **recusa** (`aceites.origem.ipHash` fora do formato hex-64): a tela ficava muda sobre um pedido **pago**. Teste executável em `pedidoProprioRulesAntagonista`. |
| 14 | troca de uid anônimo entre compra e retorno | **MESMO DEFEITO, mesma correção.** O comprador vira terceiro do próprio pedido, `getPedido` dá `permission-denied`, e antes disso a tela não dizia nada. Agora o gesto responde. |
| 15 | duas fontes para um `pago` | **O "ou" é correto e fica.** No PIX real `confirmacao` é sempre `null` (quem confirma é o webhook); a consulta é a única fonte. Nenhuma das duas fabrica `pago`: as duas leem o servidor. |
| 16 | zero E2E do caminho real | **CONSTRUÍDO até onde dá sem produção.** `getPedido` REAL do api-client contra Rules REAIS no emulator, incluindo o webhook materializando `pago` por Admin SDK e o terceiro sendo barrado. |

## Defeitos reais

| # | Severidade | Defeito | Fix | Teste que o pegaria |
|---|---|---|---|---|
| D1 | **ALTA** | Estado TERMINAL virava espera. `falhou` e `cancelado` são terminais (`TRANSICOES_STATUS_PEDIDO`), e a T3 tratava "não é `pago`" como "em confirmação": o comprador de um pedido recusado/cancelado clicava em "Atualizar estado do pedido" e lia **"Estamos confirmando o seu pedido"** + "o acesso do seu ingresso vai por lá". Cobrança expirada caía no mesmo buraco pela tela de confirmação. Contraria o critério da própria spec ("nunca 'Estamos confirmando' sobre uma recusa já conhecida"). | `a769cfb9` — `AvisoPedidoEncerrado` + `pedidoEncerradoSemPagamento`; o botão de atualizar some no estado terminal | `checkout-s1225-rev-estados-terminais.test.tsx` (5 casos que falhavam antes do fix) |
| D2 | **MÉDIA** | Gesto que falha não respondia. A consulta engolia toda falha com `console.error`: o botão piscava "Consultando…" e não dizia nada — controle morto, no exato lugar em que o comprador não pode ficar no escuro. Modos de falha medidos: parse recusando doc legível, uid anônimo rotacionado, rede. | `a769cfb9` — uma linha honesta que não afirma nada sobre o dinheiro; carregamento segue silencioso | mesmo arquivo, 3 casos |

## Decisão cross-lane (`emailIngressos` / `reenvioEmails`) — FECHADA AQUI

O handoff `REV-F2F5` **não existia** no momento de fechar (só `BUILD-F2F5`). Decidi
e declaro a divergência para o maestro reconciliar, se a REV paralela discordar.

**Decisão: ACEITAR a exposição.** Motivos, medidos:

- Filtrar não é opção técnica: Rules autorizam **documentos**, não projeções. A
  alternativa seria mover os campos para um doc irmão server-only — mudança em
  `functions/`, território da lane paralela, e maior que o risco que evita.
- O conteúdo é a história operacional **do próprio pedido do comprador**: zero
  dado de terceiro, zero texto livre, zero identidade de operador. `emailIngressos`
  = enum + contadores + id opaco. `reenvioEmails.ultimoReenvioId` é validado
  server-side como slug `[A-Za-z0-9_-]{8,64}` (`reenviarEmailsPedido.ts:305`) — não
  cabe prosa de operador. `uid`/`papel` de quem reenviou vivem no registro de
  auditoria separado, não no pedido.
- O comprador ler "o e-mail falhou 3 vezes" é constrangedor, não perigoso — e é
  informação verdadeira sobre o serviço que ele comprou.

**A regra durável que fica** (é isto que precisa entrar no canon, não o veredito):
desde a RN-469, **todo campo novo no doc `pedidos/{id}` nasce visível ao comprador**.
Quem for gravar dado operacional ali decide, no momento de gravar, se aceita que o
cliente leia. O teste `campo a campo` de `pedidoProprioRulesAntagonista` é o lugar
onde essa conta é feita.

## Painel do dono (juízo dele, não fila técnica)

1. **A listagem cross-tenant** — o comprador passa a poder listar os próprios
   pedidos em qualquer produtora. Manter (é dado dele e destrava a área do cliente)
   ou estreitar por tenant? A spec não pediu nominalmente.
2. **RN-174 / posse do e-mail** — quem controla a conta do e-mail da compra lê o
   pedido inteiro. Hoje a conta é reusada por e-mail sem prova de posse. Isso deixou
   de ser vínculo administrativo e virou chave de leitura de PII.
3. **A regra durável acima** (campo novo em `pedidos` = campo público ao comprador).

## Fila técnica

1. `isTenantMember` compara `request.auth.token.tenantId` com o campo do doc; token
   **sem** claim de tenant faz a comparação **erroar**, e a negação chega ao cliente
   como texto interno do motor de rules em vez de `permission-denied` limpo.
   Pré-existente, vale para o arquivo inteiro, fora do escopo desta correção.
2. PIX que expira **só** pelo timer interno do `PixCobranca`, sem a ida ao servidor:
   a tela de confirmação ainda não sabe que o pedido morreu (declarado no fix).
3. Varredura de copy: `/*` dentro de string cega o gate. Canário no teste.

## Aguardando conferência VISUAL do dono (nada disto foi visto rodando)

1. `AvisoPedidoEmConfirmacao` (`feedback-info`) nos quatro temas — no brasa resolve
   para o rosa heroico. Tokens e contraste AA provados por fonte; o olho falta.
2. `AvisoPedidoEncerrado` (`feedback-warning`) nos quatro temas — componente **novo**,
   nunca visto. Mesma situação: tokens definidos e AA na matriz do DS.
3. A convivência dos dois blocos com o QR e o timer na tela de pagamento (empilhamento,
   espaçamento, foco).
4. A linha de falha da consulta (`text-text-secondary`) sob o botão "Atualizar estado
   do pedido".

## Gates no HEAD (`a769cfb9`)

```
rules (5 arquivos, 8631):  Test Files 5 passed   Tests 109 passed
  pedidoProprioRules.integration · pedidoProprioRulesAntagonista.integration
  pedidosRules · inscritoPedidoRules.integration · repasseRules.integration

landing INTEIRA, 2 execuções seguidas:
  Test Files 47 passed (47)   Tests 530 passed (530)
  Test Files 47 passed (47)   Tests 530 passed (530)

apps/landing: tsc --noEmit exit 0 · eslint app lib test --max-warnings 0 exit 0
functions:    tsc --noEmit exit 0 · eslint (arquivo novo) --max-warnings 0 exit 0
```

## O que esta lane NÃO afirma

Nada está no ar. Nenhuma tela foi vista por olho humano. `firestore.rules` não foi
tocado por esta review — a abertura da T1 passou. O deploy segue sequenciado pelo
maestro, depois da conferência visual dos quatro itens acima.
