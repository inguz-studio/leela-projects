---
tags: [leela, handoff, build, checkout, email, ingresso, webhook]
trace: leela-pixreal-diag-20260804
lane: BUILD-RF2-1
data: 2026-08-05
papel: sf-backend-lead (software-forge)
---

# BUILD-RF2-1 · o caminho automático para de queimar a chave da RN-219 com lista parcial

**Estado: ENTREGUE.** Commit `5b8e4a77`, pushed. Território `functions/` apenas —
`firestore.rules`, `apps/` e `leela-specs/` intocados. Sem deploy, sem envio
real, sem escrita em produção.

## O defeito (RF2-1, achado da REV-F2F5)

`emitirIngressosDoPedido` devolvia `falhas: 0` para um pedido cuja lista de
ingressos estava incompleta: inscrito não-confirmado não era contado nem como
falha nem como recusa. Com isso `dispararEmissaoIngressosPosConfirmacao`
enxergava "emissão fechada", mandava o e-mail da compra com a lista PELA METADE
— queimando a chave at-most-once da RN-219 — e não abria pendência nenhuma. Como
a chave é at-most-once, quem ficou de fora nunca receberia o ingresso por e-mail,
e a varredura (`varrerIngressosOrfaos`) varria uma coleção que não tinha o
pedido. Reprodução original: vetor 6 de `reenvioEmailsPedido.ataque.test.ts`.

## A forma escolhida, e por quê

O código dos vizinhos revisados já respondia a pergunta, e a resposta não era
"segure sempre". Foi ela que decidiu o desenho:

**1 · A distinção que faltava sai da matriz canônica do core, não de uma lista
local.** "Não confirmado" escondia dois estados com consequências opostas:

| Estado do inscrito | O que significa | O que a lista sem ele é |
|---|---|---|
| `pendente` (e qualquer status fora do enum) | ainda pode confirmar — o organizador confirma no acerto manual, na transferência, no reprocesso | **PARCIAL** |
| `cancelado` / `estornado` | terminal na `TRANSICOES_STATUS_INSCRITO` (RN-204/RN-341): nunca volta a `confirmado` | **COMPLETA** |

`inscritoAindaPodeConfirmar()` lê a matriz do core em vez de nomear status aqui,
pela mesma disciplina que o módulo do inscrito já impõe ("Functions que mudam
status DEVEM consultar esta matriz — nunca re-derivar transições localmente"):
status novo no core não pode nascer valendo como terminal por omissão. Status
desconhecido é **fail-closed** — conta como reversível, porque o erro barato é
segurar um e-mail que a varredura manda 15 minutos depois, e o caro é queimar a
chave, que não tem volta.

**2 · A pendência é aberta no ponto da descoberta — a doutrina do reenvio manual
(`e6c96a1d`), não uma segunda.** `aguardando > 0` abre
`ingressosPendentes/{pedidoId}` na própria janela da confirmação, best-effort e
idempotente por `pedidoId` (a segunda detecção acumula `deteccoes`). É a mesma
forma que `reenviarIngresso` usa quando descobre `ingresso_incompleto`.

**3 · Quem autoriza o envio deixa de ser `falhas === 0` e passa a ser
`listaCompleta`, calculado no resultado da emissão.** O predicado mora no
contrato, e não na cabeça de cada chamador, porque os chamadores são **dois** (o
disparo do webhook e a varredura) e o defeito nasceu exatamente de um deles
re-derivando "está fechado" por conta própria. Recusa (`rejeitados`) fica fora do
predicado de propósito: inscrito de outro pedido não é deste e-mail, e inscrito
apagado não tem cura nem destinatário — segurar o e-mail do comprador por causa
deles seria trocar um defeito por outro.

**4 · Inscrito inexistente, que também sumia sem contagem, vira recusa com log de
erro.** Mesmo juízo do `pedido_divergente` que já estava no arquivo: re-tentar
não faz nascer doc que o organizador apagou (`allow delete` de inscrito existe
nas Rules para `isTenantWriter`), e a transação da confirmação recusa pedido com
inscrito inexistente (409) — chegar aqui é dado que mudou DEPOIS do dinheiro.

**5 · A espera continua limitada por construção.** Oito passagens de 15 minutos e
a varredura manda o que existe, com a pendência **aberta** e
`ingresso_orfao_esgotado` no log. É aí, e só aí, que lista parcial vira e-mail no
caminho automático: duas horas, alerta e extrato — não o envio calado que fechava
a janela na primeira passagem.

### Onde isso encosta no extrato

`ingressosPendentes/{pedidoId}` ganha `aguardando` (normalizado para `0` na
escrita, porque `merge: true` não apaga campo ausente e a segunda detecção
herdaria o contador da primeira). A coleção não tem `match` em
`firestore.rules` — deny-by-default —, então **nenhuma mudança de Rules é
necessária** e nenhum campo novo nasce visível ao comprador (a regra PROJPED-1 da
lane FIX-PROJECAO não é tocada: o doc de `pedidos` não recebeu campo nenhum).

## Prova: vermelho antes, verde depois

Teste novo: `functions/src/__tests__/emissaoListaParcial.integration.test.ts`
(9 casos). O vermelho foi medido restaurando as versões de HEAD dos três arquivos
de fonte e rodando o arquivo novo contra elas.

```
ANTES  → Test Files 1 failed (1) · Tests 9 failed (9)
DEPOIS → Test Files 1 passed (1) · Tests 9 passed (9)
```

Amostra do que estava vermelho e por quê:

| Asserção | Antes | Depois |
|---|---|---|
| `ingressosPendentes` tem o pedido após a confirmação | 0 | 1 |
| `pedidos/{id}.emailIngressos` ausente (envio nem tentado) | carimbado `pendente_chave` | ausente |
| `r.aguardando` / `r.listaCompleta` | `undefined` / `undefined` | `1` / `false` |
| inscrito apagado ⇒ `r.rejeitados` | 0 | 1 |
| esgotamento ⇒ `esgotados` | 0 | 1 |

A prova de "a chave NÃO foi queimada" é indireta de propósito e por isso mais
forte: com `BREVO_API_KEY` ausente (fail-closed RN-137), toda **tentativa** de
envio automático carimba `pedidos/{id}.emailIngressos.status = 'pendente_chave'`.
Campo ausente ⇒ o caminho automático não chegou a `enviarEmailIngressos`. Do
lado da varredura, com provider injetado, o envio acontece de verdade e o log de
comunicação (a chave da RN-219 em si) fica com **um** doc, com os **dois**
ingressos no corpo.

## Gates

Emulator próprio (`firebase.rf21.local.json`, firestore 8981 / auth 9981, IPv4
explícito — **não commitado**, como o `firebase.revf2f5.local.json` da review),
arquivo a arquivo, JDK 21:

```sh
export JAVA_HOME="C:/Users/Vitor Eduardo/.jdks/jdk-21.0.11+10"
export PATH="$JAVA_HOME/bin:$PATH"; export LEELA_FS_EMU_PORT=8981
npx firebase-tools@13 emulators:exec --config firebase.rf21.local.json \
  --project demo-leela --only firestore \
  "cd functions && npx vitest run src/__tests__/<arquivo>.test.ts"
```

| Suíte | Antes do fix | Depois |
|---|---|---|
| `emissaoListaParcial.integration` (novo) | **9 falharam** / 0 passaram | 9 passed |
| `emitirIngressos.integration` | — | 15 passed |
| `emailIngressos.integration` | — | 17 passed |
| `ingressosOrfaos.integration` | — | 5 passed |
| `webhookAsaas.integration` | — | 15 passed |
| `reenvioEmailsPedido.integration` | — | 9 passed |
| `reenvioEmailsPedido.ataque` | — | 7 passed |

`npm run build` (tsc) exit 0 · `tsc --noEmit` limpo · `eslint --max-warnings 0`
limpo nos sete arquivos da lane. **Nunca a suíte completa.**

## O que NÃO mudou (contratos preservados)

- **A chave at-most-once da RN-219 não foi relaxada.** Continua at-most-once por
  pedido, com o mesmo docId derivado de `inscritoRefs`. O objetivo era não
  gastá-la sobre entrega parcial, e é só isso que mudou.
- **Idempotência do webhook intocada.** `dispararEmissaoIngressosPosConfirmacao`
  segue recusando `duplicado`/`ignorado`/status ≠ `confirmed` antes de qualquer
  leitura; redelivery do Asaas continua `duplicado: true`. Nenhuma linha do
  `webhookAsaas.ts` / `webhookPagamento.ts` foi tocada.
- **O caminho manual do reenvio não regrediu**: `reenvioEmailsPedido.integration`
  (9) e `.ataque` (7) verdes. A única edição naquele arquivo é **comentário** — o
  aviso que descrevia o buraco no caminho automático passou a dizer que ele
  fechou, e por que o registro do lado do reenvio continua necessário (cobre
  pedido incompletado ANTES deste fix).
- **`lerIngressosVivosDoPedido` intacta** — assimetria deliberada, comentada no
  código: o reenvio manual segue ignorando `pendente` e entregando o que existe,
  porque ali nenhuma chave de uso único é gasta e um admin pediu explicitamente.
  Uniformizar isso seria inventar a segunda doutrina que o brief proíbe.
- **Nenhum campo novo em `pedidos`** (a projeção que o comprador lê desde a
  RN-469 segue como a lane FIX-PROJECAO a deixou) e **nenhuma mudança de Rules**.
- **Emissão segue idempotente por inscrito**: token nunca re-assinado, código
  nunca re-sorteado, reserva por `create`.

## Desvios e observações

1. **Lane vizinha em voo no MESMO território.** Enquanto esta lane rodava,
   outra estava editando `packages/core` (`aleatorio.ts`, `codigoPedido.ts`,
   `codigoIngresso.ts`, `inscrito.ts` — a FIX-D1 da REV-COD5A) e criando
   `functions/src/cliente/` + `functions/src/index.ts` (área do cliente). Commit
   feito com `--only` sobre os sete arquivos desta lane; `git show --stat`
   confere. **Aprendizado para a esteira: `git stash` não serve para medir o
   vermelho com lane concorrente na árvore** — usei uma cópia fora do repo e
   `git checkout --` só dos meus três arquivos. Um `git stash push -u --
   functions/` que fiz cedo chegou a levar arquivos da outra lane por alguns
   segundos (o `pop` devolveu tudo; nada se perdeu), e não deve ser repetido.
2. **`secretsBinding.contract` está VERMELHO por causa da outra lane, não desta.**
   `getMeusIngressos → falta QR_TOKEN_KEYS` (o arquivo
   `functions/src/cliente/meusIngressos.ts` ainda nem está commitado). Rodei por
   ser a guarda que a REV-F2F5 destacou; 22 passaram, 1 falhou, e o alvo é da
   lane da área do cliente. **Vale avisar aquela lane**: é a mesma classe de
   defeito do `QR_TOKEN_KEYS` ausente no `asaasWebhook` (PIXREAL-FIX T5, P0) — a
   function sobe, a keyring vem `null` e a tela não mostra ingresso nenhum.
3. **`firebase.rf21.local.json` está na raiz sem commit.** Apagar quando as
   portas padrão liberarem.

## Para o selo do maestro (não toquei `leela-specs/`)

Na `leela-specs/02-rodadas/2026-08-04-pos-pagamento/04-fila-codigo.md`, seção
"Saída da review antagonista REV-F2F5": **RF2-1 está fechado** por `5b8e4a77`,
com review antagonista pendente (esta lane é ⚔). Nada da linha RF2-2 (rate limit)
nem da RF2-3 (já fechada) foi tocado. Nenhum item novo para
`DECISOES-ABERTAS.md` — não saiu juízo de dono desta lane.

## Vetores declarados para a review antagonista (⚔)

1. **A trava nova vira o defeito novo.** Um pedido com inscrito `cancelado`
   (ou `estornado`) tem de mandar o e-mail NA HORA. Se `naoElegiveis` segurar
   alguma coisa, comprador legítimo espera 2h por um cancelamento que nunca
   volta. Coberto em `emissaoListaParcial` (caso "CANCELADO não segura nada"),
   mas o vetor é procurar outro caminho que segure sem precisar.
2. **Fail-closed no desconhecido vira negação de serviço.** Status corrompido em
   massa (migração malfeita, campo ausente em seed antigo) faz TODO pedido
   segurar e-mail e abrir pendência. A varredura aguenta? O alerta afoga?
3. **A chave da RN-219 sob a nova ordem.** Provar que `enviarEmailIngressos` não
   é alcançado por nenhum outro caminho automático com lista parcial — inclusive
   o `confirmarPagamentoSandbox` e o `pagamentoWebhook` (mock), que chamam o
   mesmo disparo e não foram exercitados nesta lane.
4. **Esgotamento com corrida.** Duas varreduras concorrentes sobre a mesma
   pendência: `carimbarTentativaIngresso` é transacional, mas as duas podem
   chegar ao ramo do esgotamento e mandar o e-mail. A RN-219 segura o segundo
   (mesmo docId) — provar, não supor.
5. **`aguardando` no extrato.** `merge: true` com campo normalizado: uma segunda
   detecção com `aguardando: 0` sobre pendência de `falhas > 0` mente sobre o
   estado? E o `detalhe`, que continua espalhado como opcional?
6. **A assimetria com o reenvio manual.** Depois deste fix, o automático segura o
   `pendente` e o manual entrega sem ele. Existe sequência de operador (segura →
   reenvia manual → confirma → varredura) que entregue DUAS credenciais ao mesmo
   destinatário, ou uma lista parcial que o comprador leia como completa?
7. **O inscrito apagado.** Recusa (não bloqueia o e-mail) é o juízo certo? Um
   organizador que apaga o inscrito por engano deixa o comprador com e-mail
   incompleto e nenhuma pendência aberta — só o `logger.error`.
8. **Compatibilidade do resultado.** `listaCompleta` é derivado; algum consumidor
   futuro (ou teste) que persista `ResultadoEmissaoIngressos` passa a gravar
   campo novo em coleção lida por cliente?
