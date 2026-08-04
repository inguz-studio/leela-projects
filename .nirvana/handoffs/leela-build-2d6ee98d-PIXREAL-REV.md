# Handoff · PIXREAL-REV (`leela-build-2d6ee98d`)

Review antagonista do caminho do dinheiro **já deployado**. Retomada após queda
da API (522) que matou a sessão anterior no meio do V3.

- **employee:** sf-qa-engineer (software-forge)
- **base:** `358a0471` → `52cc152d`, `d362d3d4`, `49a731ae`, `7ed383a8`
- **mandato cumprido:** **zero deploy, zero mutação em produção.** As três
  cobranças vivas do dono não foram tocadas. Toda leitura de produção foi
  read-only (API do Cloud Functions).
- **território respeitado:** nada escrito em `functions/src/email/`,
  `packages/api-client/src/auth.ts`, tela de senha do painel, `apps/landing`,
  `apps/painel`. Os fixes ficaram em checkout, webhooks e testes.

## Veredito por vetor

| Vetor | Assunto | Veredito |
|---|---|---|
| V1 | polaridade fail-safe do `gatewayReal` | **DEFEITO REAL — corrigido** (`49a731ae`) |
| V2 | guard na porta (T1), dois sentidos | **PASSA** — sem defeito |
| V3 | guarda estática de segredos | **2 DEFEITOS NOVOS — corrigidos** (`52cc152d`) |
| V4 | 15 bindings vs config DEPLOYADA | **1 DEFEITO — corrigido** (`d362d3d4`) + **2 vetos** |
| V5 | emissão do ingresso ponta a ponta | **PASSA** — lacuna de cobertura fechada (`7ed383a8`) |
| V6 | regressão de cotação/taxa/parcelamento/PIX | **PASSA** — 466/466 |
| V7 | poderes novos da varredura de órfãos | **PASSA** — não duplica |
| V8 | idempotência do e-mail | **PASSA** — não reenvia |

---

## V1 · a cobrança voltava a ser simulação depois de nascer real

O comentário no fonte prometia "do PROVIDER que emitiu esta cobrança". A linha
lia o **provider vivo**, o da invocação atual.

No caminho de **replay** (cobrança já existe, nada é criado) isso julga uma
cobrança velha pelo mundo de agora. E a cobrança sobrevive ao deploy que troca o
provider — a troca aconteceu **às 00h47 desta noite**. Um PIX **REAL** emitido
antes, reaberto com o mock ativo, ganhava de volta o banner de simulação e o
botão "Já paguei" **sobre dinheiro de verdade**. É o incidente original entrando
pela porta de trás: a reincidência que o brief mandou procurar.

**Por que sobreviveu:** nenhum teste do lado do servidor olhava `gatewayReal`.

**Conserto:** o ambiente virou atributo da cobrança, gravado na mesma transação
pelo provider que a emitiu, e lido do documento na volta.

**Falsificação executada:** revertida a linha, os dois casos do dinheiro caem —
`expected false to be true` (PIX real virando simulação) e `expected true to be
false` (QR de mentira apresentado como real).

---

## V2 · o guard na porta — PASSA

Fecha nos dois sentidos, com prova executada (`checkoutS1203.attack`, 21/21):

- **com gateway real:** recusa **tipada** `failed-precondition`, nunca
  `internal`, e nenhum centavo se move (`statusPedido` segue `pendente`,
  receita inalterada). O teste monta o ambiente EXATO do incidente e verifica
  antes que construir o provider ali realmente quebra.
- **com gateway mock:** a mesma porta segue funcionando (`statusPedido` vira
  `pago`) — o preview não morreu.

**Nota de baixa severidade (aceita, não é defeito):** o guard roda antes da
checagem de posse, então qualquer usuário autenticado descobre que existe chave
Asaas configurada. É o preço deliberado do conserto T1 — a recusa precisa ser
tipada *em qualquer configuração*, inclusive nas quebradas, e checar posse antes
reintroduziria o `internal` na cara do comprador. O fato de o site usar gateway
real não é segredo: o comprador vê um PIX de verdade.

---

## V3 · a guarda estática de segredos — 2 defeitos novos

### 3.1 · o conserto da sessão anterior não tinha rede nenhuma

Reintroduzi a `leEnv` porosa (a de antes do conserto) e a suíte passou **7/7,
verde**. Os casos rodam sobre o repositório real, e o repositório real não contém
ataque — então não distinguiam a guarda boa da guarda furada.

### 3.2 · o conserto repetia o próprio defeito em 2 das 3 formas

Ponto e desestruturação ficaram ancorados no **nome** do portador
(`…env`/`…Env`). Passavam verdes: `const cfg = process.env; cfg.QR_TOKEN_KEYS` e
`const { QR_TOKEN_KEYS } = cfg`. A lição do `ambiente[…]` era exatamente essa, e
valia para as três formas ou para nenhuma.

**Conserto:** portador irrelevante nas três + bloco `A PRÓPRIA GUARDA` (9 ataques
e 4 inocentes sobre fixture). Alargar custou **zero** detecções a mais nos 339
arquivos — medido, não estimado.

**Falsificação nas duas pontas:** `leEnv` porosa ⇒ 8 casos vermelhos; dispensa
nominal de volta ⇒ PORTA 5 vermelha.

---

## V4 · os bindings contra a config DEPLOYADA

Leitura read-only da config real de `leela-hub` (87 functions) confrontada com o
fonte.

**O que o brief procurava — conjunto pela metade — NÃO existe.** Todo par
`ASAAS_API_KEY` + `ASAAS_WEBHOOK_AUTH_TOKEN` está completo nas 9 functions que o
carregam. As 4 que emitem ingresso têm `QR_TOKEN_KEYS` + `BREVO_API_KEY`
completo.

### Defeito 4.1 · o sexto segredo já estava no ar, e a guarda dizia que não havia sexto

`BANK_DATA_KEY` sobe bindado em `saveDadosBancarios` e
`getBankDetailsForPayout`, ACTIVE em produção. A guarda nunca soube que ele
existia: entra no `runWith` como `secrets: [ENV_BANK_DATA_KEY]` e é lido como
`process.env[ENV_BANK_DATA_KEY]` — as duas pontas por constante.

O grave é a falsa garantia: o caso de sanidade prometia por escrito "falha no dia
em que o sexto segredo for amarrado a um runWith" e estava **verde com o sexto
segredo já no ar**. Guarda que promete cobertura que não tem é pior que guarda
nenhuma, porque ninguém confere de novo.

---

## VETOS AO DONO (não são meus para consertar)

### VETO 1 · `solicitarRedefinicaoSenha` não está deployada

Existe no fonte, declara `BREVO_API_KEY`, e **não existe em produção**. É a
function do e-mail de definir senha — o **primeiro acesso do comprador depois de
pagar**. Confirma no nível da config o que a DOCS-EXTERNO viu por fora ("o reset
cai no fallback do Firebase"). Assunto da IDENTIDADE-EMAIL + deploy: vedado aqui.

### VETO 2 · `resgatarConviteOrganizador` também não está deployada.

### VETO 3 · a suíte não roda como lote, e o comando documentado engana

66 arquivos de teste têm `port: 8080` **hardcoded** no `initializeTestEnvironment`
enquanto 43 leem `LEELA_FS_EMU_PORT`. Rodar com o comando documentado no
cabeçalho da `pixCarrinho` (`LEELA_FS_EMU_PORT=8480`) dá **cérebro dividido**: o
clear do `beforeEach` vai para 8080 e o Admin SDK escreve em 8480. O estado nunca
é limpo, acumula entre casos, e a suíte fica vermelha com números crescentes
(6 vs 2, 13 vs 1, 21 vs 8) — **parecendo defeito de produto quando não é**.

Quase virou laudo falso nesta lane. Padronizar a porta é uma decisão de infra de
teste, fora do meu mandato.

### Nota 4.3 · smell documentado

`ajustarCapacidadeLote` importa UMA constante (nome de coleção de auditoria) de
`getBankDetailsForPayout.ts` e arrasta o módulo de cifra bancária para o fecho.
Não precisa do segredo (a config deployada confirma: zero segredos). O conserto
certo é mudar a constante de casa — `finance/` e `eventos/` estão fora do
mandato.

---

## V5 · a emissão ponta a ponta — a lacuna que fechei

A emissão **não** mora dentro de `processarWebhookAsaas`. Acontece depois, no
handler HTTP, que passa o `r.resultado` para
`dispararEmissaoIngressosPosConfirmacao`. Os dois lados tinham suíte; **a costura
entre eles não tinha nenhuma**.

E a costura é um contrato estreito e silencioso: só emite se
`statusGateway === 'confirmed'` e `ignorado`/`duplicado` forem falsos. Um
`'CONFIRMED'` maiúsculo bastaria para a emissão retornar `null` **sem erro** — o
comprador paga e não recebe ingresso nem aviso. É a forma exata da falha de
04/08.

Pior: a suíte de órfãos, que é quem exercita o disparo, monta o `resultado` **à
mão** — ficaria verde mesmo que o webhook real devolvesse outro shape.

**Fechado:** dois casos com o objeto vindo do webhook de verdade. Falsificação
executada (trocando `'confirmed'` por `'CONFIRMED'` no fonte, o caso cai).

---

## V6 · V7 · V8 — verdes com prova

- **V6** — `apps/landing`: **43 arquivos, 466/466**. Cotação, taxa repassada e
  incorporada, parcelamento, PIX no clique, total na troca de opção e o banner de
  simulação. A lane mexeu na fronteira do provider e não empurrou nada.
- **V7** — `ingressosOrfaos` **5/5**: a varredura emite e manda e-mail **uma**
  vez; re-entrega do gateway depois não duplica nem token, nem código, nem
  e-mail; pedido que deixou de ser órfão fecha sem e-mail. Com poderes novos ela
  **não** emite duplicado nem reenvia.
- **V8** — `emailIngressos` **17/17**: UM e-mail por pedido, reprocesso do
  webhook não reenvia, e sem chave nada é enviado **nem registrado** (registrar
  queimaria a idempotência de um envio que nunca houve).

---

## A resposta

**O dono pode pagar o PIX de manhã com segurança: sim.** A cobrança vai nascer
real, a tela vai dizer que é real, o webhook confirma, o ingresso é emitido e o
e-mail sai uma vez só — cada um desses elos agora com prova executada.

Duas ressalvas honestas, nenhuma no caminho do pagamento:

1. **O conserto do V1 não está em produção** (deploy é vedado nesta lane). Na
   prática ele não muda a manhã do dono: em produção o provider vivo é o real, e
   uma cobrança nascida agora é lida como real com ou sem o fix. O fix protege o
   dia em que o provider trocar de novo.
2. **Depois de pagar, o primeiro acesso do comprador está quebrado** por fora
   desta lane: o e-mail de definir senha não tem function deployada (VETO 1) e o
   painel não está no canal de produção (PAINEL-404, outra lane). O dinheiro
   entra e o ingresso sai; o que trava é a conta.

---

## Adendo · o gate de lote, e um erro meu que quase virou laudo

O run único das 204 suítes de `functions` fechou **vermelho**: 29 arquivos, 136
testes, 931s, exit 1.

**Nenhum dos arquivos que eu toquei falhou.** Mas isso é necessário e não
suficiente — o meu fix mexe no documento de pagamento (campo novo
`gatewaySimulado`), e entre os vermelhos havia suítes de regras e do caminho do
PIX. Fui verificar.

### O erro

Rodei um A/B e afirmei, aqui mesmo, "meu fix quebrou a suíte, regressão minha":
sem o fix 19/19, com o fix 6 falhas. **Estava errado.** Repetindo com o MESMO
código o resultado virou 1 falha em vez de 6 — e a falha era
`seedVerified: canários ausentes (seed engolido pelo emulator?)`, um erro de
infraestrutura, não uma asserção. A variância provava que o experimento não era
controlado: o emulator estava degradado depois de levar 204 arquivos.

Tirar conclusão de experimento não controlado é a mesma classe de erro que eu
cobrei da sessão anterior. Registrei no audit.

### A verificação de verdade

Refeita com **emulator limpo por arquivo** (`emulators:exec`, que sobe e derruba
o próprio):

| suíte | resultado |
|---|---|
| `pixArbitragem.integration` | 19/19 |
| `pixArbitragem.ataque` | 20/20 |
| `pixCarrinhoRev.ataque` | 13/13 |
| `carrinhoPrazo` | 16/16 |
| `asaasTetoCheckout` | 11/11 |
| `inscritoPedidoRules` | 9/9 |
| `ingressoPorLink` | 17/17 |
| `precoBloqueado` | 21/21 |
| `checkoutModelo` (meu) | 15/15 |
| `webhookAsaas` (meu) | 15/15 |

**Todas as suítes do caminho do dinheiro que caíram no lote passam em emulator
limpo.** O fix do V1 não causa regressão.

### O mecanismo do vermelho

204 arquivos de integração dividem UM emulator com 13 workers em paralelo, vários
sob o mesmo `projectId` (`demo-leela`) — o `clearFirestore()` de um arquivo apaga
o seed de outro no meio do teste, e o emulator degrada sob carga. É exatamente o
problema que o cabeçalho de `helpers/stability.ts` documenta, e a razão de cada
suíte carregar seu próprio comando `emulators:exec`.

Confound adicional: **outra lane escreveu no repo durante o lote**
(`salvarAfiliado.ts`, `cadastrarAssessoria.ts`, `contaSemFriccao.ts`,
`linkDosEmails.contract.test.ts`) — arquivos mudando no meio do run.

Isto reforça o **VETO 3** com mecanismo medido em vez de suposto: a suíte de
functions não tem gate de lote confiável hoje. Quem for ler `29 failed` sem
re-rodar arquivo a arquivo vai concluir defeito de produto onde não há.
