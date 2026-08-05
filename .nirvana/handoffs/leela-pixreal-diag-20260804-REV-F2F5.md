---
tags: [leela, handoff, review, antagonista, checkout, email]
trace: leela-pixreal-diag-20260804
lane: REV-F2F5
data: 2026-08-04
papel: sf-qa-engineer (software-forge) — antagonista, contexto fresco
---

# REV-F2F5 · review antagonista da F2 (reenvio) e da F5 (incidente de e-mail)

**Veredito: APROVADA-COM-FIXES.** Quatro defeitos reais, todos consertados no
commit `e6c96a1d` com teste que os teria pegado. Nenhum envio real, nenhum
deploy, nenhuma escrita em produção. `firestore.rules` e `apps/landing`
intocadas.

Sob review: `9abe8396` (F2) e `9d980bae` (F5).

## Vetor → resultado

| # | Vetor declarado | Resultado |
|---|---|---|
| 1 | Papel forjado | **Sobreviveu.** Cinco formas negadas com prova: `role`/`claims`/`auth.token` dentro do `data` do request, `tenant_staff` do tenant dono, equipe do evento com papel `organizador`, token sem `role`, e `platform_admin_readonly` (prefixo). Zero envios, zero reservas criadas, cinco negações na trilha com o papel REAL do token |
| 2 | Mutação de `responsavel.email` pós-pagamento | **Sobreviveu.** Não existe caminho. `pedidos` é `write: if false` nas Rules (negado até a platform_admin via client SDK) e `responsavel` só é escrito dentro da transação que cria o pedido (`createInscricaoCharge.ts:1696-1703`); nenhum `update` toca o campo em `functions/`. Virou Directive no commit: o dia em que existir "corrigir e-mail do pedido", este callable passa a redirecionar o QR de terceiro |
| 3 | `forcar: true` sem rate limit | **Juízo: aceitável agora, item registrado.** Não é regressão da F2 — `getBankDetailsForPayout` tem a MESMA forma (escrita em `auditoriaAcessos` na negação, sem limite, alcançável por qualquer autenticado). O que a F2 acrescenta é amplificação de envio por admin comprometido, que já teria poderes piores. Fila `RF2-2`, com a proposta pronta |
| 4 | At-most-once queima a chave; crash entre commit e entrega | **FALSIFICADO.** Ver defeito 2 |
| 5 | Concorrência real de dois admins | **FALSIFICADO — e foi o pior achado.** Ver defeito 1 |
| 6 | `ingresso_incompleto` como beco permanente | **FALSIFICADO.** Ver defeito 4 |
| 7 | `inscritoRefs` adulterado | **Sobreviveu.** Inscrito de outro pedido com `qrToken` próprio na lista: não entra no e-mail, não vira `semIngresso`, não trava o reenvio. `pedidoRef === pedidoId` vem antes do status, como o comentário promete |
| 8 | Fecho transitivo dos secrets | **Sobreviveu, com a guarda mutada para provar que ela enxerga esta function.** `secretsBinding.contract.test.ts` fecha o grafo de imports por Function; removi `QR_TOKEN_KEYS` do `runWith` e o teste ficou vermelho na hora, então o verde é informativo. `QR_TOKEN_KEYS` + `BREVO_API_KEY` bastam |
| 9 | `registrarStatusEmailIngressos` engole erro | **Sobreviveu no ingresso; falsificado no gêmeo da CONTA**, que o construtor não declarou. `update()` nunca cria doc — pedido inexistente não é ressuscitado e nada escapa. Ver defeito 3 |

## Defeitos reais

Todos em `e6c96a1d` · teste `functions/src/__tests__/reenvioEmailsPedido.ataque.test.ts`.

### 1 · ALTA — a janela de 10 min não segurava o segundo operador

Dois admins em paralelo, chaves diferentes: **os dois executaram e os dois
e-mails com o QR de todo mundo saíram** (`reenvioEmails.total: 2`, duas
entregas no espião). É exatamente o caso que a tranca 2 existe para cobrir — o
próprio commit diz que "a chave sozinha só protege contra retry, não contra um
segundo operador".

Causa: `agora` é o relógio de quem chama, capturado ANTES da transação;
`ultimoEm` é `serverTimestamp()` escrito no commit do primeiro. Na corrida, o
perdedor re-lê o doc no retry e enxerga um `ultimoEm` POSTERIOR ao próprio
`agora` — e o guard `decorrido >= 0` pulava a janela inteira. Provei o mesmo
sem corrida nenhuma: `agora` cinco minutos atrás atravessa sem `forcar`.

Descartei a hipótese fácil antes de acusar: rodei uma sonda de duas transações
read-then-write no mesmo doc contra o Emulator, e ele **serializa
corretamente** (B repetiu e viu a escrita de A). O isolamento está certo; o
furo era a aritmética.

Fix: timestamp no futuro conta como DENTRO da janela (fail-closed), `forcar`
segue como a saída consciente.

### 2 · ALTA — escape na entrega deixava a operação presa em `reservado`

A etapa 4 faz quatro leituras do Firestore FORA dos try/catch de cada alvo (os
ingressos vivos, o destinatário, o pedido e o evento do e-mail da conta). Um
`UNAVAILABLE`/`DEADLINE_EXCEEDED` ali — rotina em Cloud Functions — escapava
com a reserva JÁ commitada e a janela do pedido JÁ queimada: extrato sem
desfecho, replay da mesma chave devolvendo `{}`, e o único caminho de volta era
`forcar` com chave nova — que DUPLICA a credencial se a entrega tinha
acontecido. Reproduzido com um `db` que falha nas leituras de `eventos` depois
da reserva.

Fix: o bloco fecha o extrato como `falhou` com a causa antes de propagar, e
`estado` viaja no resultado. "Já processado" com `resultados` vazio deixa de
ser indistinguível de "terminou sem nada a enviar".

### 3 · MÉDIA-ALTA — o carimbo da conta invertia o veredito de um e-mail entregue (não declarado)

O `update` pós-envio dividia o `catch` com o envio: falhar ali devolvia
`falha_envio` para uma credencial que JÁ tinha saído. E `falha_envio` é o
gatilho do incidente crítico da própria F5 e a deixa que leva o runbook a
reenviar — mentir para o lado do "não entregou" custa uma SEGUNDA entrega do
link de definir senha. Assimétrico com `registrarStatusEmailIngressos`, que
engole de propósito, e contra a Directive do commit da F5 ("o carimbo é
ACESSÓRIO"). Fix: carimbo fora do try, erro engolido com log.

### 4 · ALTA — `ingresso_incompleto` era beco permanente

A mensagem manda o operador para a varredura. A varredura só enxerga
`ingressosPendentes`. E o gerador mais provável do estado não abre pendência
nenhuma: `emitirIngressosDoPedido` não conta inscrito `nao_confirmado` nem como
falha nem como recusa, então o disparo fecha com `falhas: 0` e nada é
registrado. Se o inscrito confirmar depois (transferência, acerto manual,
reprocesso), ele fica confirmado e sem ingresso, o cron varre uma coleção que
não tem o pedido, e o reenvio recusa **para sempre**. Provado: `pendentes: 0`.

Fix: a pendência passa a ser aberta no ponto em que o sistema descobre o
buraco — best-effort (Directive da F5) e idempotente por `pedidoId`. O teste
segue o caminho inteiro: reenvio recusa → varredura emite o que faltava →
reenvio entrega os dois ingressos.

## Prova

Emulator próprio (`firebase.revf2f5.local.json`, firestore 8581, hub 4712 —
**não commitado**), arquivo a arquivo, JDK 21:

```sh
export JAVA_HOME="C:/Users/Vitor Eduardo/.jdks/jdk-21.0.11+10"
export PATH="$JAVA_HOME/bin:$PATH"; export LEELA_FS_EMU_PORT=8581
npx firebase-tools@13 emulators:exec --config firebase.revf2f5.local.json \
  --project demo-leela --only firestore \
  "cd functions && npx vitest run src/__tests__/<arquivo>.test.ts"
```

| Suíte | Antes do fix | Depois |
|---|---|---|
| `reenvioEmailsPedido.ataque` (novo) | **4 falharam** / 3 passaram | 7 passed |
| `reenvioEmailsPedido.integration` | — | 9 passed |
| `emailIngressos.integration` | — | 17 passed |
| `emailIncidente.integration` | — | 8 passed |
| `ingressosOrfaos.integration` | — | 5 passed |
| `emitirIngressos.integration` | — | 15 passed |
| `bankAccess.integration` | — | 5 passed |
| `secretsBinding.contract` | — | 23 passed |

`tsc --noEmit` limpo; `eslint --max-warnings 0` limpo nos dois arquivos.

## O que fica para o maestro

1. **Fila técnica registrada em `leela-specs/.../04-fila-codigo.md`** (painel
   canônico da rodada, sem arquivo paralelo): `RF2-1` (o caminho automático
   queima a RN-219 com lista parcial — lane e review próprias, reprodução já
   escrita), `RF2-2` (rate limit do callable, junto com o gêmeo bancário),
   `RF2-3` (projeção do pedido).
2. **Cross-lane com a S1225-T1:** a RN-469 abre o doc do pedido ao comprador, e
   a F2/F5 acrescentou `emailIngressos` e `reenvioEmails` a ele. Nada é PII nem
   credencial; `emailIngressos.status` é legitimamente do comprador. Os dois que
   não são: `reenvioEmails.ultimoReenvioId` (string escolhida pelo OPERADOR) e
   `emailIngressos.comunicacaoId` (handle de coleção server-only).
   **Recomendação:** tirar esses dois do doc do pedido — custo zero, nenhum
   caminho os lê, a janela só usa `ultimoEm` e o extrato `reenviosEmail` já
   guarda ambos. Forma durável: estado operacional em subcoleção server-only.
   **Não mexi em rules.** A review da S1225 fecha o ponto junto.
3. **Nada de juízo de dono saiu daqui** — nenhum item novo para
   `DECISOES-ABERTAS.md`. BREVO-1 segue como estava.
4. `firebase.revf2f5.local.json` está na raiz sem commit, como o
   `firebase.f2f5.local.json` da lane de build. Apagar quando as portas padrão
   liberarem.

## Se o terminal cair

O fix está commitado (`e6c96a1d`) com os gates rodados. Produção intocada:
sem deploy, sem envio real, sem escrita fora do emulator.
