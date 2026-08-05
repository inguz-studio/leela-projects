---
tags: [leela, handoff, review, antagonista, ingresso, email, rn-219]
trace: leela-pixreal-diag-20260804
lane: REV-RF2-1
data: 2026-08-05
papel: sf-qa-engineer (software-forge) — antagonista
sob_review: 5b8e4a77
---

# REV-RF2-1 · review antagonista da trava de lista parcial

**Veredito: APROVADA-COM-FIXES.** Fix-commit `bf3179c1`, território
`functions/` apenas. `firestore.rules`, `apps/**` e `leela-specs/` intocados.
Sem deploy, sem escrita em produção, sem envio real (`BREVO_API_KEY` removida
do processo durante toda a suíte).

O desenho do `5b8e4a77` está certo e sobreviveu aos oito vetores que o
construtor declarou — inclusive os dois que ele marcou `Not-tested`. Os dois
defeitos desta review saíram do **não declarado**, e os dois no mesmo ponto: o
extrato do RF2-1 não sobrevive ao próprio caminho de recuperação.

## Tabela vetor → resultado

| # | Vetor declarado | Resultado | Evidência |
|---|---|---|---|
| 1 | trava nova segurando e-mail legítimo | **SOBREVIVEU** | `estornado` que JÁ TINHA ingresso não segura e o QR dele NÃO viaja no e-mail (o `Not-tested` do commit); terminal + confirmado sai na hora; pedido só de terminais não vira pendência |
| 2 | fail-closed vira negação de serviço em massa | **SOBREVIVEU (com ressalva)** | 10 pedidos com status corrompido: 10 e-mails segurados, 10 pendências, varredura completa a passagem com `falhas: 0`. Ressalva de escala abaixo |
| 3 | outros caminhos automáticos não exercitados | **SOBREVIVEU** | `confirmarPagamentoSandboxCore` REAL de ponta a ponta (a mesma porta do `pagamentoWebhook` mock). Achado de realismo abaixo |
| 4 | duas varreduras concorrentes no esgotamento | **SOBREVIVEU** | `Promise.all` de duas varreduras na 8ª passagem: **1** e-mail, **1** doc no log de comunicação. A RN-219 segura, como o construtor supôs |
| 5 | `merge: true` e honestidade de `aguardando`/`detalhe` | **QUEBROU** | Defeito 2 — o extrato zera quem não mediu |
| 6 | operador × automático entregando credencial 2× | **SOBREVIVEU / achado de painel** | Nenhuma segunda credencial (tokens idênticos, RN-420 preservada). Mas o reenvio no meio da espera entrega lista PARCIAL — item de painel abaixo |
| 7 | inscrito apagado tratado como recusa | **SOBREVIVEU / achado de painel** | O juízo é defensável; o que falta é extrato. Item de painel abaixo |
| 8 | `listaCompleta` derivado sendo persistido | **SOBREVIVEU** | Nem `ingressosPendentes` nem `pedidos` ganham `listaCompleta`, `naoElegiveis` ou `aguardando` |
| **9** | **(não declarado)** o beco depois do esgotamento | **QUEBROU** | Defeito 1 — o achado desta review |

## Defeitos

### Defeito 1 · o beco depois do esgotamento — **ALTO** (dinheiro + credencial)

`esgotado === true` faz `varrerIngressosOrfaosCore` **pular a pendência para
sempre** (`conferenciaManual`), e nada nunca a desarma — `registrarIngressoPendente`
só escreve `esgotado`/`tentativasVarredura` no nascimento, então nem uma nova
detecção reabre.

O RF2-1 tornou a espera por inscrito reversível um gerador **rotineiro** de
pendência. E o que a destrava é uma ação **humana** do organizador (acerto
manual, transferência, reprocesso) — que passa das duas horas das oito
passagens sem esforço. Passado esse ponto:

1. o e-mail parcial já saiu no esgotamento, a chave da RN-219 já queimou;
2. o inscrito confirma na hora 3;
3. a varredura pula por `esgotado` — `emitirIngressosDoPedido` **nunca mais roda**;
4. `reenviarIngresso` recusa `ingresso_incompleto` apontando para a varredura,
   que não vai agir.

Resultado: a pessoa fica **confirmada e sem ingresso emitido** — sem `qrToken`,
sem `codigoIngresso`, sem QR no balcão, sem linha em `meusIngressos`. É o beco
que a REV-F2F5 fechou, reaberto 2h depois, e agora com a credencial nunca
emitida em vez de só não-enviada.

**Fix:** `reabrirIngressoPendente` (novo, em `ingressosPendentes.ts`), chamado
por `reenviarIngresso` quando ele detecta `semIngresso`. A doutrina "oito
passagens e vira conferência humana" não é relaxada — o gatilho é o humano.
Cada reabertura re-arma UMA janela de oito passagens e conta em `reaberturas`;
pendência já `resolvido` nunca ressuscita.

Teste: `revRF21.antagonista.test.ts` → vetor 9. Vermelho em HEAD
(`expected +0 to be 1` — nenhum ingresso emitido após o pedido do operador).

### Defeito 2 · o extrato zerando quem não mediu — **MÉDIO**

`aguardando: registro.aguardando ?? 0` consertou a mentira de herdar o contador
da primeira detecção e criou a simétrica. Os dois chamadores que **não medem**
`aguardando` escreviam `0` sobre uma pendência que seguia esperando:

- o `catch` do disparo (`disparo_falhou`) — só tem o erro na mão;
- `reenviarIngresso` — lê ingressos vivos, não status de inscrito.

O extrato passava a dizer "nada segurando este pedido" para um pedido cujo
e-mail estava segurado por um inscrito. É a mesma classe de defeito que a
normalização existia para impedir, com o sinal invertido.

**Fix:** escreve só quem mediu (`aguardando !== undefined`), com `0` carimbado
no nascimento para o campo nunca faltar. O defeito original continua fechado
porque o disparo pós-confirmação **sempre** passa o número medido, inclusive `0`.

Teste: vetor 5. Vermelho em HEAD (`expected +0 to be 1`).

## Achado de realismo (vetor 3) — onde o `aguardando` realmente nasce

A transação de confirmação do `processarWebhookPagamento` flipa **todo**
inscrito `pendente` → `confirmado` na mesma transação que marca o pedido como
pago. Exercitando `confirmarPagamentoSandboxCore` de ponta a ponta, o ramo
`aguardando` do RF2-1 **não é alcançado pelo caminho feliz**: os dois inscritos
saem emitidos e o e-mail é tentado na mesma janela.

O flip é `if (status === 'pendente')`. Logo, no caminho automático o `aguardando`
nasce por duas portas, e só por elas:

1. **status fora do enum** (dado corrompido, seed antigo, migração) — atravessa
   a confirmação intacto e cai no fail-closed. Provado com o caminho sandbox real.
2. **mutação do pedido depois do pagamento** — inscrito que entra em
   `inscritoRefs` já pago, ou que volta a `pendente` por fora.

Isso **não invalida o fix** (o buraco era real e a REV-F2F5 o reproduziu), mas
recalibra a prioridade: o gerador dominante é anomalia de dado, não operação
normal. E é exatamente por isso que o Defeito 1 importa — quando acontece, a
cura depende de um humano lento.

## Ressalvas

### Item de painel (decisão de dono)

1. **Reenvio manual no meio da espera entrega lista PARCIAL.** A assimetria com
   `lerIngressosVivosDoPedido` é declarada e comentada pelo construtor, e a
   mantive — mudá-la numa review seria trocar o juízo de quem construiu sem
   decisão de dono. Mas a consequência não foi declarada: o inscrito `pendente`
   some sem entrar em `semIngresso`, então o reenvio devolve `enviado` ao
   operador com a pendência ABERTA, entrega ao comprador uma lista pela metade e
   carimba `pedidos/{id}.emailIngressos.status = 'enviado'` num pedido a que
   ainda falta credencial. Nada no retorno diz "parcial" — o único sinal é
   `ingressos: 1` contra dois `inscritoRefs`. Dano limitado (a chave da RN-219
   não é queimada e a varredura ainda manda a lista inteira depois), mas um
   atendimento de rotina fecha o chamado achando que entregou. **Decisão pedida:
   o reenvio deve recusar enquanto houver pendência aberta, ou avisar o operador
   de que a lista está parcial?** Pinado em teste (vetor 6) para não derivar em
   silêncio.

2. **Inscrito apagado não deixa extrato consultável.** O juízo do construtor
   (recusa, não segura o e-mail) é o certo — não há cura nem destinatário. Mas o
   comprador pagou por 2 e recebeu 1, e isso só existe como `logger.error`: nem
   `ingressosPendentes`, nem campo no pedido, nem alerta contável. **Decisão
   pedida: anomalia de dado em pedido pago merece extrato?** Abrir pendência
   aqui é barato e auto-resolve na primeira passagem da varredura (recusa não
   entra em `listaCompleta`), deixando o registro para o humano.

### Fila técnica (sem decisão de dono)

3. **A varredura lê a coleção inteira sem limite nem cursor.**
   `.where('resolvido','==',false).get()` num cron de 15 min. Pendência de
   `aguardando` **não se resolve sozinha** e, esgotada, fica no result set para
   sempre. Pré-existente ao RF2-1, mas o fix multiplicou o gerador. Com 10
   pedidos a passagem é trivial; com uma migração ruim em cima de um evento
   grande, é uma leitura ilimitada num agendado.

4. **`logger.warn('ingresso_inscrito_aguardando_confirmacao')` sai por inscrito
   e por passagem** — 8 passagens × N inscritos por pedido segurado.

## Gates

Emulator próprio (`firebase.revrf21.local.json`, firestore **8781** / auth 9781,
host IPv4 explícito — **não commitado**), arquivo a arquivo, JDK 21. Nunca a
suíte completa.

| Suíte | Resultado |
|---|---|
| `revRF21.antagonista` (novo, 12 casos) | **12 passed** |
| `emissaoListaParcial.integration` | 9 passed |
| `emitirIngressos.integration` | 15 passed |
| `ingressosOrfaos.integration` | 5 passed |
| `emailIngressos.integration` | 17 passed |
| `reenvioEmailsPedido.integration` | 9 passed |
| `reenvioEmailsPedido.ataque` | 7 passed |
| `webhookAsaas.integration` | 15 passed |
| **`secretsBinding.contract`** | **23 passed — VERDE** |

`tsc --noEmit` exit 0 · `eslint --max-warnings 0` limpo nos três arquivos.

**Estado do `secretsBinding.contract`: VERDE (23/23).** Ele estava vermelho na
lane BUILD-RF2-1 por `functions/src/cliente/meusIngressos.ts` sem `QR_TOKEN_KEYS`.
A lane da área do cliente **fechou**: o arquivo está commitado com
`secrets: ['QR_TOKEN_KEYS']` no `runWith` e com o `detalhe` de fail-closed
quando a keyring vem `null`. Nada a reportar, nada a consertar em território
alheio.

### Medição do vermelho

Sem `git stash` (lane vizinha viva em `apps/landing`): cópia dos dois arquivos
de fonte para fora do repo, `git checkout --` só deles, execução, restauração.

```
HEAD  → vetor 5 FAIL (expected +0 to be 1) · vetor 9 FAIL (expected +0 to be 1)
        os outros 10 já passavam
FIX   → 12 passed
```

## Para o selo do maestro (não toquei `leela-specs/`)

Na `leela-specs/02-rodadas/2026-08-04-pos-pagamento/04-fila-codigo.md`, seção
"Saída da review antagonista REV-F2F5": **RF2-1 fechado por `5b8e4a77` +
`bf3179c1`, review antagonista CONCLUÍDA (APROVADA-COM-FIXES)**. Nada de RF2-2
(rate limit) nem RF2-3 foi tocado.

Dois itens novos para `DECISOES-ABERTAS.md` — os de painel acima (reenvio com
lista parcial; extrato para inscrito apagado). Os itens 3 e 4 são fila técnica,
não pedem juízo de dono.

## Limpeza

`firebase.revrf21.local.json` está na raiz **sem commit** — apagar quando as
portas padrão liberarem.
