---
tags: [leela, fila, rodada, checkout, pos-pagamento, area-do-cliente, arena-social]
trace: leela-pixreal-diag-20260804
lote: SPEC-POSPAG
data: 2026-08-04
---

# 04-fila-codigo · O pedido responde na tela, e a Arena Social

> Três frentes em ordem, mais o paralelo técnico do diagnóstico. Regras em
> `03-rns-delta.md` (canônicas no [[LEELA-E12-landing]]); spec em
> `02-spec-pos-pagamento-e-arena-social.md`. A fila da rodada ADMINSEP
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

## Ordem executável, resumida

1. **Agora:** 1a + 1b (S1225-T1/T2). Depois 1c.
2. **Na sequência (resposta da POSPAG-1):** a fila S1222/S1223 inteira, na ordem da
   ADMINSEP (S1221-T1 antes da B2). Quando a B2 subir: 1d (o CTA) e a aterrissagem da C1
   passa a Meus Ingressos.
3. **Depois dos vetos ARENA-1/2/3:** 3a → 3b ∥ 3c.
4. **Em paralelo, lanes técnicas próprias:** F2 (após BREVO-1) e F5.

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
- [ ] review antagonista em contexto fresco em 1a, 1b, 3a e 3c
