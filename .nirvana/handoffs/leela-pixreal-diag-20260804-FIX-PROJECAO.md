# FIX-PROJECAO — o estado operacional sai do doc que o comprador lê

- **Trace:** `leela-pixreal-diag-20260804` · **Lane:** FIX-PROJECAO
- **Employee:** `sf-backend-lead` (software-forge)
- **Território:** `functions/` apenas. `leela-specs/` (lane SPEC-CODPEDIDO em voo), `apps/landing` e `firestore.rules` intocados.
- **Sem deploy, sem envio real, sem escrita em produção.**

## A decisão executada

O maestro reconciliou duas reviews antagonistas que divergiram sobre os dois campos que a
lane F2/F5 (`9abe8396` + `9d980bae`, fixes `e6c96a1d`) acrescentou ao doc do pedido.

A REV-S1225 mediu uma coisa certa: **Rules não filtram campo**. Elas decidem o DOCUMENTO,
não a projeção. Daí ela concluiu "aceitar a exposição". A conclusão não segue da medição.
Se a regra durável é "todo campo novo em `pedidos/{id}` nasce visível ao comprador" — e é —,
então a saída não é filtrar no lado errado da porta, é **não gravar ali**. Foi o que a
REV-F2F5 tinha proposto, a custo zero, e é o que esta lane fez.

Saíram do doc do pedido:

| Campo | Por que sai | Onde continua vivo |
|---|---|---|
| `reenvioEmails.ultimoReenvioId` | String escolhida pelo OPERADOR. Quem nomear a chave por chamado (`reenvio-ticket-4471`, `reenvio-reclamacao-procon`) publica vocabulário interno na tela de quem comprou. | Extrato `reenviosEmail/{pedidoId}__{reenvioId}` — no docId **e** no campo `reenvioId` — e em `auditoriaAcessos`. Nenhuma das duas tem `match` nas Rules. |
| `emailIngressos.comunicacaoId` | Handle de coleção server-only; o comprador não tem como usá-lo nem deveria enxergá-lo. | O próprio doc `eventos/{id}/comunicacoes/{comunicacaoId}` (Rules: leitura só de gestão — platform_admin, tenant writer, organizador/administrador). O docId é determinístico (`{destinatario}_{chave}_{canal}`), e o resultado da função ainda devolve o valor a quem chamou. |

**FICA no doc:** `reenvioEmails.ultimoEm` (a janela de idempotência da tranca 2 lê ele
dentro da transação — tirar quebraria a proteção contra dois operadores), `reenvioEmails.total`
(contador opaco), e `emailIngressos.status`/`atualizadoEm`/`falhaEm`/`falhas`, que são
legitimamente sobre o pedido do comprador. A consulta operacional da F5 ("quem pagou e não
recebeu") usa `status`, nunca o handle — o runbook não precisou de ajuste.

## Nenhum caminho lia os dois campos — como verifiquei

Grep repo-wide (`ultimoReenvioId`, `comunicacaoId`, `emailIngressos`, `reenvioEmails`),
excluindo `node_modules` e artefatos de build:

- **`ultimoReenvioId`** — exatamente 1 escrita (`reenviarEmailsPedido.ts:273`), 0 leituras
  em produção. As duas únicas outras ocorrências em código eram o seed e a asserção do teste
  de Rules; o resto era handoff e spec.
- **`comunicacaoId` no doc do pedido** — 1 escrita (`enviarIngressos.ts:119`), 0 leituras.
  Todas as demais ocorrências do identificador são do módulo do log de comunicação
  (`logComunicacao.ts`, `avisoAfiliado.ts`), que trabalha com o docId da subcoleção e nunca
  passa pelo doc do pedido.
- **`apps/`** (landing e painel) — **zero** ocorrências de qualquer um dos dois. A projeção
  do comprador na T3 usa `parsePedido`, que ignora campo desconhecido (trancado pelo teste
  E2E do bloco E da suíte de Rules).
- O único consumidor do parâmetro `comunicacaoId` de `registrarStatusEmailIngressos` era a
  própria escrita. Removi o **parâmetro**, não só a linha: as três chamadas passaram a 3
  argumentos e não existe mais caminho de código capaz de reintroduzir o campo por descuido.

## Os testes viraram o guardião da regra

Não bastava remover a asserção — ela foi **invertida**, e a inversão foi provada por mutação.

- `reenvioEmailsPedido.integration.test.ts` — depois de um reenvio REAL: `ultimoEm` presente,
  `total` correto, `ultimoReenvioId` **undefined**, e `JSON.stringify(pedido)` não contém a
  chave. No mesmo teste, o extrato passou a asserir `reenvioId` — a prova de que o valor não
  sumiu do sistema, só mudou de endereço.
- `emailIncidente.integration.test.ts` — `carimbo.comunicacaoId` **undefined**, e logo
  abaixo a prova de que o log de comunicação existe em `eventos/{id}/comunicacoes/{id}` com
  aquele docId.
- `pedidoProprioRulesAntagonista.integration.test.ts` — o seed passou a espelhar o que a
  plataforma grava de verdade (seed que inventa campo mede projeção que não existe), os dois
  testes de entrega perderam o `⚠` porque o que sobrou é legítimo, e entrou um teste novo
  (`⚠ REGRA DURÁVEL`) que assere a AUSÊNCIA dos dois campos na leitura do comprador com as
  Rules reais.

**Mutação (prova executável):** reintroduzi as duas escritas no código e rodei. Os dois
guardiões reprovaram — `expected 'reenvio-t93n7f-001' to be undefined` e
`expected 'mutante-voltou' to be undefined`. Mutação revertida, suítes verdes de novo.

## Gates

| Gate | Resultado |
|---|---|
| `tsc --noEmit` | 0 erros |
| `eslint src --max-warnings 0` | 0 |
| `npm run build` | ok |
| `reenvioEmailsPedido.integration` | **9 passed** |
| `reenvioEmailsPedido.ataque` | **7 passed** |
| `emailIncidente.integration` | **8 passed** |
| `emailIngressos.integration` | **17 passed** |
| `webhookAsaas.integration` | **15 passed** |
| `pedidoProprioRulesAntagonista.integration` | **23 passed** |
| Mutação dos dois campos | 2 failed (o esperado), revertida |

**79 testes**, arquivo a arquivo, `emulators:exec` em porta própria (firestore 8681, JDK 21).
Suíte completa não foi rodada de propósito — colisão de emulator é indistinguível de
regressão nela.

## Surpresas e pontas soltas

1. **A REV-F2F5 disse "o extrato/auditoria já guarda ambos". Para `reenvioId` é literal; para
   `comunicacaoId` não é.** O extrato `reenviosEmail` nunca guardou `comunicacaoId`, e o
   caminho do reenvio nem chegava a passá-lo (`registrarStatusEmailIngressos` era chamado com
   3 argumentos ali). Quem guarda o `comunicacaoId` é a subcoleção `comunicacoes`, que é o
   registro canônico dele e é server-only para o comprador. Funcionalmente o resultado é o
   mesmo — nada foi perdido —, mas a frase da review era imprecisa e fica corrigida aqui.
2. **`leela-specs/02-rodadas/2026-08-04-pos-pagamento/04-fila-codigo.md`** já documenta esta
   decisão como item 1 do "mínimo para o gate da S1225". Não toquei — é território da lane
   SPEC-CODPEDIDO, que está em voo. Quem fechar aquela lane pode marcar o item como feito.
3. **O runbook não precisou mudar.** `runbook-email-transacional.md` já apontava para
   `reenviosEmail/{pedidoId}__{reenvioId}` e `auditoriaAcessos`, e cita `emailIngressos.status`
   e `.falhas` — nenhum dos dois campos removidos. Conferido campo a campo.
4. **Janitorial:** removidos os configs de emulator não commitados que as lanes anteriores
   deixaram na raiz (`firebase.f2f5.local.json`, `firebase.revf2f5.local.json`) e o desta lane
   (`firebase.fixproj.local.json`).
