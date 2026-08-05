# HANDOFF · BUILD-S1225 — o feedback do pedido na tela

trace: leela-pixreal-diag-20260804 · lane: BUILD-S1225 · employee: sf-frontend-lead (software-forge)
brief: `.nirvana/briefs/leela-pixreal-diag-20260804-BUILD-S1225-enriched.md`
escopo: S1225-T1 (rules) · S1225-T2 (tela v1 + copy) · S1225-T3 (estados por meio)
**T4 (CTA) NÃO entra** — depende da S1222-T2 (área do cliente), que não existe.

> Esta lane **não declara nada resolvido ao dono**. A review antagonista (⚔ em T1 e T2)
> roda depois, em contexto fresco, despachada pelo maestro. Os vetores estão no fim.

## Ambiente da lane (para reproduzir)

O emulator do repo (8080) estava **ocupado pela lane paralela**. Esta lane subiu um
Firestore Emulator **exclusivo na 8531**, com config fora do repo (zero pegada):

```bash
export JAVA_HOME="C:\\Users\\Vitor Eduardo\\.jdks\\jdk-21.0.11+10"
export PATH="/c/Users/Vitor Eduardo/.jdks/jdk-21.0.11+10/bin:$PATH"   # firebase-tools exige JDK ≥ 21
npx firebase emulators:start --only firestore --project demo-leela \
  --config "<scratchpad>/firebase.s1225.json"      # firestore.port = 8531, host 127.0.0.1
# noutro shell:
cd C:/dev/LEELA/functions && FIRESTORE_EMULATOR_HOST=127.0.0.1:8531 \
  npx vitest run src/__tests__/pedidoProprioRules.integration.test.ts
```

O teste novo lê `FIRESTORE_EMULATOR_HOST` com o default do repo (`localhost:8080`) como
fallback — roda igual no comando canônico `pnpm --filter @leela/functions test:rules`
e numa porta exclusiva, sem editar nada.

---

## T1 · S1225-T1 — a leitura do próprio pedido nas rules (RN-469) ✅

**Commit `bdc9a531`** — `feat(rules): o comprador le o proprio pedido, e so ele`

Território: `firestore.rules` + `functions/src/__tests__/pedidoProprioRules.integration.test.ts`.

### O que mudou

`match /pedidos/{pedidoId}` ganhou UM disjunto de leitura, `ehCompradorDoPedido()`, e o
TODO E12 saiu do arquivo. Dois vínculos, ambos escritos pelo **servidor** e inforjáveis
pelo cliente (a coleção é `write: if false` — não há caminho de escrita por SDK):

- `responsavel.atletaId` — o uid da sessão que criou o pedido no checkout, **inclusive a
  anônima**. Carimbado de `caller.uid` na tx de venda (`createInscricaoCharge.ts:1697`).
- `contaSemFriccao.contaUid` — a conta vinculada pela confirmação (`contaSemFriccao.ts:261`,
  escritor único). É por aqui que a pessoa relê o pedido depois, já logada.

`write: if false` **intocado, byte por byte**. Nenhuma outra coleção abriu.

### Decisão de projeto que a review deve conferir

Guarda por **campo**, não por prefixo do docId. O id é `ped-{uid}-{chave}` e um
`startsWith('ped-' + uid + '-')` pareceria equivalente — mas transformaria o FORMATO DO ID
em fronteira de autorização, e um uid que seja prefixo de outro (uid customizado pode ter
`-`; o Auth não garante formato) leria o pedido alheio. **Há teste nomeado para esse
vetor** (`uid PREFIXO do uid do comprador NÃO lê o pedido dele`), e ele começa provando que
o `startsWith` daria `true` — isto é, o buraco existe e a Rule por campo o fecha.

### Gate (saída colada)

```
 ✓ src/__tests__/pedidoProprioRules.integration.test.ts  (26 tests) 7222ms
 Test Files  1 passed (1)
      Tests  26 passed (26)
```

Não-regressão nas suítes de rules pré-existentes que tocam `pedidos`/`inscritos`:

```
 ✓ src/__tests__/pedidosRules.test.ts  (21 tests) 1898ms
 Test Files  2 passed (2)
      Tests  59 passed (59)
```

`npx tsc --noEmit` em `functions/` → **exit 0**.
`npx eslint src/__tests__/pedidoProprioRules.integration.test.ts --max-warnings 0` → **exit 0**.

### Cobertura do teste (26 casos)

| Bloco | Casos |
|---|---|
| o que ABRIU | sessão anônima lê o próprio pedido pago; lê o próprio pedido **pendente sem `contaSemFriccao`** (campo ausente dá falso, não erro); conta vinculada lê; o comprador lê o próprio `endereco`/`valorTotal` |
| **ataque RN-469** | terceiro anônimo; terceiro nomeado; comprador do pedido B lê o A (e vice-versa); conta vinculada ao B lê o A; **uid PREFIXO**; não autenticado; `athlete` com `tenantId` forjado; query sem filtro; query forjada pelo uid alheio; doc inexistente segue `PERMISSION_DENIED` (não virou oráculo) |
| `write: if false` | o próprio comprador não marca pago, não muda valor/`pagamentoRef`, não reescreve `endereco`/`aceites`, não cria, não deleta; conta vinculada também não |
| não vazou | comprador não lê `pagamentos` do próprio pedido, nem `inscritos`, nem `pessoas` |
| não-regressão | owner/staff leem; promoter negado; platform_admin cruza; query tenant+evento segue provável |

### Desvio declarado

O brief proíbe tocar `functions/` (lane paralela em voo lá), mas o território da T1 exige
"testes de rules" — e no repo eles **só** existem em `functions/src/__tests__/`. Resolvido
pelo caminho de menor colisão: **arquivo NOVO** (`pedidoProprioRules.integration.test.ts`),
zero linha alterada em arquivo existente de `functions/`, commit com `--only` nos dois
paths. Motivo adicional para não estender `pedidosRules.test.ts`: as fixtures de lá nasceram
para o lado do organizador (`ped-castelo-1`, sem uid de comprador no id nem
`contaSemFriccao`) e não expressam o doc como o checkout realmente o grava.

---

## T2 · S1225-T2 — a tela v1 e a copy que para de mentir ✅

**Commit `7f992e75`** — `feat(checkout): a tela responde ao comprador, e a copy do PIX para de mentir`
(pushed junto do T1: `42aa3d4a..7f992e75`)

Território: `apps/landing/.../checkout` (`AvisoPedidoEmConfirmacao.tsx` novo, `StepConfirmacao.tsx`,
`StepPagamento.tsx`) + 3 arquivos de teste.

### Duas frases saíram, uma entrou

| Onde | O que dizia | Por que saiu |
|---|---|---|
| `StepPagamento` (PIX real) | *"a confirmação chega sozinha, em segundos — não é preciso avisar aqui"* | Não chega. Zero `onSnapshot`/polling em `apps/landing` — nada naquela tela mudava sozinho. Quem cumpriria era o e-mail, que quebrou na Brevo em 04/08 |
| `StepConfirmacao` (rodapé) | *"o envio de e-mail ainda não está ativo neste ambiente"* | Deixou de ser verdade (DEPLOY-EMAIL, `abf4b794`) e **contradizia frontalmente** a orientação que a mesma tela passa a dar |

Entrou o componente `AvisoPedidoEmConfirmacao`: a mensagem do dono verbatim
("Estamos confirmando o seu pedido") + a orientação de e-mail, `role="status"`
polite, par `feedback-info-*` (o mesmo trio de tokens já auditado na matriz de
contraste do DS e já usado pelo `ProcessandoPagamento` — zero cor literal, zero
par de contraste novo).

**Um componente e não a frase repetida em duas telas**, porque os dois estados
não-finais moram em arquivos diferentes (o PIX real espera o webhook na tela de
pagamento; o cartão indeterminado chega à tela de confirmação) e duas cópias da
mesma copy divergem na primeira revisão.

### O CTA não entrou, e a ausência tem teste

S1225-T4 depende da S1222-T2. `nenhum caminho para "meus pedidos" enquanto a área
do cliente não existe` varre os links renderizados. Apontar CTA para rota
inexistente repetiria o erro que a ordem C1→C2 da fila ADMINSEP já proibiu.

### A varredura de copy virou teste executável

O último Given/When/Then da S1225 ("quando varro a copy do checkout, então
nenhuma frase promete confirmação automática") é um teste que lê o **texto-fonte
de todo `checkout/*.tsx`**, remove comentários e reprova 5 padrões de promessa.
Tem controle do próprio teste (o diretório foi mesmo varrido) e **controle
positivo** (a frase do incidente, se voltar, é pega). Copy nova que prometa canal
inexistente reprova sozinha, sem ninguém lembrar da regra.

### Gate (saída colada)

```
 ✓ test/checkout-pixreal-banner-simulacao.test.tsx  (5 tests)  158ms
 ✓ test/checkout-s1225-feedback-pedido.test.tsx    (28 tests)  202ms
 Test Files  2 passed (2)      Tests  33 passed (33)

 ✓ test/checkout-s1209-pix-timer.test.tsx  (25 tests)  509ms
 Test Files  1 passed (1)      Tests  25 passed (25)
```

Suíte da landing INTEIRA (não-regressão): **494 testes**, 1 falha isolada e
corrigida no mesmo commit — `checkout-s1209-pix-timer.test.tsx:257` afirmava o
rótulo `/pagamento pendente/i`, que a T2 substituiu. Depois do fix: verde.

`npx tsc --noEmit` em `apps/landing/` → **exit 0**.
`npx eslint app lib --max-warnings 0` → **exit 0**.

## T3 · S1225-T3 — estados por meio ✅

**Commit `0bf6f60c`** — `feat(checkout): o estado do pedido deixa de ser suposto e passa a ser consultado`
(pushed: `803852b9..0bf6f60c`)

Território: `apps/landing/.../checkout` (`CheckoutFlow`, `StepPagamento`, `StepConfirmacao`,
`AvisoPedidoEmConfirmacao`) + 2 arquivos de teste + o card S1225 do `V1-KANBAN.md`.

### PIX real — o achado estrutural

Antes de escrever linha: **a tela de confirmação nunca era alcançada num PIX real.**
`setStep(3)` só acontece dentro de `confirmar()`, e `confirmar()` só é chamado pelo botão
"Já paguei" do sandbox e pelo `pagarCartao`. Com gateway real o comprador ficava na tela de
pagamento, com o QR, para sempre — é literalmente o incidente de 04/08, e não era só falta
de copy.

A T3 dá a ele um caminho: a tela **consulta o próprio pedido** (leitura aberta pela T1), em
duas ocasiões e só duas — o carregamento da cobrança e o gesto explícito `Atualizar estado
do pedido`. Quando a consulta traz `pago`, a tela de confirmação passa a ser alcançável no
PIX real pela primeira vez.

- O rótulo do botão **não diz "já paguei"** de propósito: a plataforma não passa a acreditar
  na palavra do comprador (o T3 da PIXREAL-FIX tirou esse botão do mundo real e continua
  valendo, com teste). Ele só LÊ o registro.
- "Estamos confirmando o seu pedido" **não aparece na chegada** — só depois do gesto. Na
  chegada o comprador pode nem ter pagado, e a frase afirmaria uma confirmação inexistente.
- A leitura é **acessória por construção**: Rules, rede ou parse falhando é engolido com log
  no console, e o pior caso é a tela seguir exatamente como antes da T3.

### Cartão — os três desfechos

| Desfecho | Face | Onde |
|---|---|---|
| confirmado | "Inscrição confirmada!" | `StepConfirmacao`, `statusPedido === 'pago'` |
| recusado | a recusa do servidor em `role="alert"`, botão de pagar vivo, **zero palavra de espera** | `StepPagamento`, `erroCharge` |
| indeterminado | "Estamos confirmando o seu pedido" + orientação de e-mail + a copy de dinheiro do DEC-0727 e a retomada, **dentro do mesmo bloco** | `StepPagamento`, `gatewaySemResposta && charge !== null` |

**Fronteira estreita, e é decisão:** teto na **criação** (sem cobrança) segue com "Processando
pagamento". Sem cobrança pode não haver dinheiro em trânsito, e "estamos confirmando o seu
pedido" afirmaria um pedido em confirmação que talvez nem tenha nascido. Só o cartão com a
cobrança **já criada** entra na exceção — que é exatamente o "timeout/queda entre criar e
responder" da spec.

### Gate (saída colada)

```
 ✓ test/checkout-s1225-estados-por-meio.test.tsx  (19 tests) 218ms
 ✓ test/checkout-s1225-consulta-pedido.test.tsx    (6 tests)
```

Suíte da landing INTEIRA, **duas execuções seguidas** (o teste de flakiness):

```
 Test Files  46 passed (46)        Tests  516 passed (516)
 Test Files  46 passed (46)        Tests  516 passed (516)
```

`npx tsc --noEmit` → **exit 0**. `npx eslint app lib --max-warnings 0` → **exit 0**.

Re-verificação final das rules contra o HEAD da lane (o paralelo commitou em `functions/`
mas **não tocou `firestore.rules`** — conferido com `git log -- firestore.rules`):

```
 Test Files  2 passed (2)          Tests  47 passed (47)
```

### Um flake foi encontrado e morto antes do commit

Na primeira execução da suíte cheia com o teste de integração novo, **8 testes falharam** —
2 meus e 6 da `checkout-ckux-rev-cotacao` (que passava sozinha). Causa: o arquivo novo montava
o `CheckoutFlow` inteiro **seis vezes** e o custo em CPU dos workers paralelos do vitest
estourava o debounce de 400 ms da suíte vizinha. Teste que derruba o vizinho é teste quebrado
(e teste flaky é reject). Correção: os casos foram agrupados por FLUXO (6 montagens → 3), a
espera de "não é polling" caiu de 1500 ms para 700 ms e os `waitFor` ganharam teto explícito.
Duas execuções cheias seguidas em verde depois disso.

---

## Vetores declarados para a review antagonista

### ⚔ T1 — `firestore.rules` (RN-469)

1. **O disjunto novo roda em TODO `read` de `pedidos`, inclusive em query.** Confirmar que
   `where('responsavel.atletaId','==',uid)` virou uma **capacidade nova e intencional**: o
   comprador agora consegue LISTAR os próprios pedidos, cross-tenant. Só o dado dele — mas é
   superfície que a spec não pediu nominalmente. Vale a pergunta: mantém ou fecha?
2. **`responsavel.atletaId` é o uid ou é um "atletaId"?** O nome do campo sugere entidade de
   domínio; o valor é `caller.uid` (`createInscricaoCharge.ts:1697`). Se algum caminho de
   escrita gravar ali um id de atleta que **não** seja o uid, a Rule libera errado. Varrer
   TODOS os escritores do campo, não só o checkout.
3. **`contaSemFriccao.contaUid` é vínculo por e-mail.** Duas pessoas físicas compartilhando
   uma caixa de e-mail → uma lê o pedido da outra. A fronteira é a RN-174, fora desta lane,
   mas a consequência agora é leitura de PII (endereço, aceites, composição).
4. **Ordem dos disjuntos e curto-circuito.** `isTenantWriter(resource.data.tenantId)` avalia
   primeiro; confirmar que nenhum caminho com `resource == null` passou a permitir em vez de
   erro (o teste de doc inexistente cobre `get` — e query?).
5. **Guardas `in` aninhadas.** `'atletaId' in resource.data.responsavel` erra se `responsavel`
   existir e **não for map**. Escrita é `if false`, então a forma vem do servidor — mas se um
   escritor Admin gravar shape torto, a avaliação vira erro (nega) e não falso. Aceitável?
6. **O que a leitura ENTREGA.** O doc carrega `endereco`, `aceites` (com `origem`, que hasheia
   IP/UA — RN-442), `contaSemFriccao` inteiro e a composição financeira. Revisar campo a campo
   se tudo isso é "dado dele" ou se algo ali é dado da plataforma sobre ele.
7. **Regressão silenciosa nas outras suítes de rules.** Rodei `pedidosRules` e `inscritosRules`.
   `inscritoPedidoRules` e `repasseRules` referenciam `pedidos` e **não foram rodadas** —
   atacar por aí.

### ⚔ T2 — a copy e a tela v1 (RN-470)

8. **A varredura de copy tem um furo conhecido:** ela remove comentários com regex
   (`/* */` e `//`) antes de varrer. Um `//` dentro de string (URL) truncaria a linha e
   esconderia copy do teste. Hoje não há URL na copy do checkout; a review deve decidir se o
   furo importa.
9. **A varredura só cobre `checkout/*.tsx`.** Copy que prometa confirmação automática em
   `PixCobranca`, nos e-mails, na página do ingresso ou no painel **não é pega**. A afirmação
   do critério é "a copy do checkout" — conferir se o dono quis o escopo maior.
10. **"O acesso do ingresso vai para {email}"** é agora uma promessa da tela sobre um canal
    que quebrou há horas (BREVO-1 ainda é ação do dono). A tela está honesta sobre o
    *desenho*; se a Brevo continuar travada, ela mente na *operação*. Isto é decisão do dono,
    não defeito de código — mas a review deve carimbar.
11. **`feedback-info` no tema brasa** resolve para o rosa heroico. Não houve gate visual
    executável nesta lane (nenhum navegador foi aberto — regra do Vitor). O par é o mesmo do
    `ProcessandoPagamento`, já auditado, mas ninguém VIU a tela nova.
12. **Ausência do CTA:** o teste varre `queryAllByRole('link')` e o texto. Um CTA que entrasse
    como `<button onClick={router.push}>` passaria pelo teste. Atacar.

### T3 — estados por meio (sem ⚔ na fila, mas vale olhar)

13. **`parsePedido` é o gargalo silencioso.** A consulta usa `getPedido` do api-client, que
    parseia com o core. Se o parser recusar um pedido real de produção (campo novo, shape
    velho), a consulta falha **em silêncio por design** e a tela volta ao comportamento
    pré-T3 — sem nenhum sinal ao comprador nem ao time. É o risco mais alto da T3.
14. **A consulta de carregamento roda com `authPronto`**, e a sessão anônima do checkout é
    quem lê. Se o Firebase renovar/trocar o uid anônimo entre a compra e o retorno à tela, a
    leitura passa a ser negada e o comprador vira "terceiro" do próprio pedido.
15. **Duas fontes para um `pago`** (`confirmacao.statusPedido` e `statusPedidoConsultado`).
    Elas podem discordar. Hoje basta UMA dizer `pago`. Confirmar que o "ou" é o desejado e
    não um "e".
16. **Nenhum teste E2E/Playwright** foi escrito — tudo é RTL + rules. O caminho real
    (webhook do Asaas materializa `pago` → o comprador clica em atualizar) nunca rodou ponta
    a ponta.

---

## Desvios da lane, com motivo

1. **Toquei `functions/`**, que o brief proíbe — apenas com um **arquivo NOVO** de teste de
   rules (`pedidoProprioRules.integration.test.ts`), porque o território da T1 exige "testes
   de rules" e no repo eles só existem lá. Zero linha alterada em arquivo existente de
   `functions/`. Verificado depois: a lane paralela commitou em `functions/` e **não houve
   conflito nem toque em `firestore.rules`**.
2. **Rodei a suíte INTEIRA da landing** (não só os arquivos-alvo). Motivo: a T2 removeu um
   rótulo (`Pagamento pendente`) que outra suíte afirmava — só a suíte cheia acharia isso, e
   ela achou. A suíte de `functions/` **nunca** foi rodada inteira, conforme a proibição.
3. **Config de emulator fora do repo.** A 8080 estava ocupada pela lane paralela; subi a 8531
   com um `firebase.s1225.json` no scratchpad (paths absolutos), sem criar arquivo no repo.
   O teste novo lê `FIRESTORE_EMULATOR_HOST` com o default do repo como fallback, então o
   comando canônico continua funcionando sem alteração.
4. **T4 não entrou** (CTA) — dependência dura da S1222-T2, como o brief manda. A ausência
   virou teste em vez de virar TODO.
5. **Nenhum deploy. Nenhum navegador aberto.**

## O que esta lane NÃO afirma

O código está em `main` e **não está no ar**. Nada aqui foi visto rodando por olho humano nem
por gate visual. A review antagonista (⚔ T1 e T2) roda em contexto fresco, e só depois dela o
maestro sequencia deploy.
