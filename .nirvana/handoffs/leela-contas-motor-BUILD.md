---
lane: BUILD-CONTAS-MOTOR
trace: leela-pixreal-diag-20260804
employee: sf-backend-lead (software-forge)
data: 2026-08-05
territorio: functions/**, packages/core/**, packages/api-client/**, firestore.rules, firebase.contas.json
rodada: SPEC-CONTAS-LANDING (leela-specs/02-rodadas/2026-08-05-contas-landing/)
---

# Handoff · BUILD-CONTAS-MOTOR

O motor dos dois fluxos de conta do participante. **Onda A inteira (A1–A5) e a C2**, que
deixou de ser gated quando o dono autorizou o POSSE-EMAIL-1. **Nenhuma tela**: `apps/**` está
com duas lanes em voo e não foi tocada.

## Commits, por tarefa

| Commit | Tarefa | O que entrou |
|---|---|---|
| `39a98908` | **A1** · `S1229-T1` | o núcleo do código de seis dígitos |
| `6f5b7915` | **A2** · `S1229-T2` | o nono e-mail do catálogo (+ conserto do `email:render`) |
| `a0f12500` | **A3** · `S1229-T3` | a callable que pede o código |
| `23c644f2` | **A4 + A5** · `S1229-T4` · `S1230-T1` | consumir, definir a senha e criar a conta |
| `cb33344e` | **C2** · `S1230-T4` | a condição de e-mail verificado no ramo (b) da Rule |

Push feito para `origin/main`. **Sem deploy** — o maestro sequencia.

## O segredo que precisa existir em produção ANTES do deploy

**`CODIGO_ACESSO_PEPPER`** — o sétimo segredo da casa, ao lado do `CRM_ID_PEPPER` e das
chaves do QR. Sem ele, as três callables novas levantam na primeira chamada (fail-closed
deliberado: com 10⁶ valores, digest sem pepper é enumerável offline em milissegundos).

Quem o declara no `runWith`: `solicitarCodigoDeAcesso`, `confirmarCodigoDeAcesso` e
`concluirAcessoComProva`. **Nenhum teste de emulador cobra o provisionamento** — local, o
`process.env` é do processo inteiro e todo mundo enxerga todo mundo. Quem cobra é o
`secretsBinding.contract.test.ts`, e a guarda foi **exercida**: removendo a linha do
`runWith`, ela acusa `solicitarCodigoDeAcesso → falta CODIGO_ACESSO_PEPPER`.

Valor: aleatório, alta entropia, nunca versionado. Trocá-lo invalida os códigos vivos — o
prazo de dez minutos é o limite do dano, então a rotação é barata.

## O que ficou pronto, tarefa a tarefa

**A1 · o núcleo.** `functions/src/auth/codigoDeAcesso.ts` e a parte pura em
`packages/core/src/auth/codigoDeAcesso.ts`. Sorteio com a entropia do sistema (reusa o
`sorteioUniforme` que os outros cinco geradores da casa já usam — nenhum `Math.random`
nasceu aqui, nem como default de parâmetro), digest `HMAC-SHA256(pepper, "<e-mail>:<código>")`,
dez minutos, uso único em transação, cinco tentativas com morte do código, um código vivo por
endereço e `timingSafeEqual`. A coleção `codigosDeAcesso` nasceu **sem `match`** nas Rules.

**A2 · o nono e-mail.** `renderCodigoDeAcessoEmail` em `templates.ts`, moldura de
`identidade.ts`, etiqueta `codigo-de-acesso` na Brevo, assunto e corpo neutros. O código vai
como texto, nunca como link.

**A3 · pedir o código.** `solicitarCodigoDeAcesso.ts`. Limitador por alvo primeiro, sorteio,
gravação, envio. **Nenhuma consulta a "existe conta?"** antes de enviar.

**A4 · consumir e definir a senha.** `confirmarCodigoDeAcesso.ts`. Comparação em tempo
constante dentro da transação, consumo, e depois a senha pelo Admin SDK com `emailVerified`
carimbado no mesmo gesto — senha primeiro, sessão depois (RN-453).

**A5 · a conta que falta.** No mesmo arquivo: conta no Auth já verificada, `atletas/{uid}`
por merge com o consentimento carimbado pelo servidor, e **desfazer a conta do Auth se a
gravação falhar**. O contrato de entrada vive em `packages/core/src/platform/contaParticipante.ts`
e a versão do termo é **reexportada** de `TERMO_LGPD_VERSAO`, nunca copiada.

**C2 · a Rule.** `&& request.auth.token.email_verified == true` no ramo (b), e só nele.

## A decisão de desenho que a review precisa atacar primeiro

**Existem DUAS callables depois do código, não uma.** A fila descreve a A4 como uma chamada
só ("consome, define a senha, devolve o token"), e o que subiu foi:

1. `confirmarCodigoDeAcesso({ email, codigo })` → consome o código e devolve a **prova** e a
   divergência (`precisaCadastro`, `nome`);
2. `concluirAcessoComProva({ email, prova, senha, nome?, consentimentoLgpd? })` → define a
   senha ou cria a conta e devolve o token.

**Por quê:** a tabela de estados da spec (§Parte 7) escreve *"código aceito → o formulário de
senha, com o nome quando ele fizer falta"*. A senha é pedida DEPOIS do código aceito, e o
campo de nome só aparece para quem não tem conta — informação que, pela RN-477, só pode
existir depois da prova. Numa chamada só, a pessoa que veio pelo "primeiro acesso" e não tem
conta teria o código consumido e receberia "falta o nome", precisando pedir OUTRO código.

**A prova não é uma segunda superfície de credencial**, e este é o ponto a atacar: 256 bits da
entropia do sistema, digest com pepper no MESMO documento, domínio separado do código, uso
único, mesmo prazo. Ela não prova posse de e-mail nenhum, não pode ser pedida, não chega por
e-mail e não vale nada sem alguém ter acertado o código. O uso único do código continua
literal, e o teste do consumo duplo é o gate disso.

## Os testes de ataque, e o que cada um pega

| Ataque | Onde | Resultado |
|---|---|---|
| **Força bruta esgotando o teto** — 12 tentativas **em paralelo** | `codigoAcesso.integration` | `tentativas ≤ 5`, código morto; pega contador fora da transação |
| **Cinco erros sequenciais** | idem | `[4,3,2,1,0]` e o código certo já não entra |
| **Código expirado** | idem + `confirmar` | negado, `restantes: 0` |
| **Reuso** — mesmo código correto duas vezes | idem | um sucesso, uma negativa |
| **Reuso sob concorrência** — duas simultâneas | idem | exatamente um sucesso |
| **Dois códigos para o mesmo endereço** | idem | o novo mata o anterior e **zera** o contador |
| **As cinco causas indistinguíveis** | `confirmarCodigoDeAcesso.integration` | mesmo `permission-denied`, mesma frase, nas cinco |
| **Oráculo de conta na resposta** | `solicitarCodigoDeAcesso.integration` | mesma resposta, mesmo documento, mesmas chaves |
| **Oráculo de conta no TEMPO** | idem | medição por amostra: mediana com conta ≤ 3× a sem conta |
| **Digest enumerável offline** | `codigoAcessoCore` | o digest não é `sha256` do material; pepper errado nunca bate |
| **Envio falhando devolve "enviamos"** | `solicitarCodigoDeAcesso.integration` | erro explícito + documento morto |
| **Aceite datado pelo cliente** (RN-446) | `confirmarCodigoDeAcesso.integration` | três formas forjadas, todas recusadas, e nada nasce |
| **Rollback da criação** (RN-478) | idem | com a gravação quebrada, **não sobra conta no Auth** |
| **Fronteira de conta** (RN-480) | idem | sem `profissionais/{uid}`, sem claim de tenant, sem `platform_admin` |
| **POSSE-EMAIL-1** — conta vinculada e NÃO verificada | `pedidoProprioRules.integration` | negada; e `email_verified: false` explícito também |
| **Fronteira (a)/(b) das Rules** | idem | o comprador **anônimo** recém-pago continua lendo, pago e pendente |
| **E-mail verificado como passe livre** | idem | terceiro verificado e conta de OUTRO pedido seguem negados |

## Gates

```
npm --prefix packages/core   run type-check   → 0
npm --prefix packages/core   run lint         → 0 (--max-warnings 0)
npm --prefix packages/core   run build        → ok
npm --prefix packages/api-client run type-check → 0
npm --prefix packages/api-client run lint     → 0
npm --prefix packages/api-client run build    → ok
npm --prefix functions run type-check         → 0
npm --prefix functions run lint               → 0
npm --prefix functions run build              → ok
npm --prefix functions run email:render       → 9 e-mails + index
```

Testes **arquivo a arquivo**, emulator EXCLUSIVO da lane (`firebase.contas.json` —
firestore **8388**, auth **9388**, hub 4388, logging 4488, todos IPv4 explícito), JDK 21, com
`FIRESTORE_EMULATOR_HOST` **e** `LEELA_FS_EMU_PORT` exportados (as seis suítes que gateiam
pelo primeiro sairiam *skipped* com exit 0 se só a porta fosse setada):

```
codigoAcessoCore.test.ts                         20 passed
codigoAcessoTemplate.test.ts                      7 passed
secretsBinding.contract.test.ts                  23 passed
codigoAcesso.integration.test.ts                 18 passed
solicitarCodigoDeAcesso.integration.test.ts      13 passed
confirmarCodigoDeAcesso.integration.test.ts      19 passed
pedidoProprioRules.integration.test.ts           29 passed
pedidoProprioRulesAntagonista.integration.test.ts 26 passed
areaDoCliente.integration.test.ts                32 passed   (não-regressão da Rule)
```

**A suíte completa de functions NÃO foi rodada**, por instrução da lane.

## Desvios, declarados

**1. A4 e A5 num commit só (`23c644f2`).** São os dois ramos da MESMA chamada, no mesmo
arquivo. Separá-los exigiria um commit intermediário com o ramo de criação declarado como
buraco, o que é pior para a review do que o diff único. Cada tarefa tem os próprios casos de
teste, nomeados pela RN.

**2. Duas callables onde a fila descreve uma.** Motivo acima, na seção de desenho.

**3. O catálogo de e-mails NÃO foi atualizado.** A A2 lista
`leela-specs/04-engenharia/catalogo-de-emails.md` como superfície, e `leela-specs/` está
**proibido** para esta lane (uma lane de selo em voo). **Pendência para quem tiver o
território:** a seção do nono e-mail existe na spec e precisa passar a dizer que ele está
CONSTRUÍDO, com a etiqueta `codigo-de-acesso` e o render em `9-codigo-de-acesso.html`.

**4. Conserto fora do escopo, dentro do território: o `email:render` estava MORTO.** Desde
`6993a36a` (S1228-T2), `templates.ts` importa `formatarCodigoPedido` do core e o script, que
compilava só dois arquivos para um temporário, morria com `MODULE_NOT_FOUND`. O entregável que
existe para o dono conferir a estética dos e-mails **não rodava**, e nenhum teste cobria isso
porque nenhum teste chama o script. Sem consertar, a A2 não teria como cumprir "entra no
`email:render` junto dos outros oito".

**5. `firebase.contas.json` na raiz.** Config de emulador da lane, aditivo, portas livres
conferidas contra os 19 configs existentes.

**6. `SENHA_MIN` do `api-client` passou a derivar do core.** Era `6` escrito à mão; agora é
`SENHA_CONTA_MIN`. Mesmo número, uma autoridade só. Sem isso, o servidor teria uma régua e a
tela outra, que é o DEF-A da ONBOARD-REV.

## Vetores para a review antagonista

1. **A prova de continuação** — o desenho novo desta lane. Atacar: dá para obtê-la sem passar
   pelo código? Dá para reusá-la? Ela sobrevive a um código emitido depois? (o `set` inteiro da
   emissão zera `provaDigest`, mas confirme.)
2. **O contador de tentativas** — está na mesma transação da comparação, e o teste de 12 em
   paralelo prova o teto. Atacar por outro caminho: dois processos, duas instâncias de Function.
3. **`tentativasRestantes` na resposta** — decisão da spec (§Parte 7). Ele distingue código
   VIVO de código MORTO. Isso é oráculo de alguma coisa que importe? A afirmação desta lane é
   que não, porque pedir sempre grava, exista ou não a conta.
4. **A latência** — o teste mede mediana com tolerância de 3×. Uma consulta ao Auth não cabe
   nisso, mas a medição é do Emulator e é ruidosa. Vale reexecutar com amostra maior.
5. **`precisaCadastro` e `nome` na resposta** — divergência autorizada pela RN-477 **depois**
   da prova. Confirmar que nenhum caminho os expõe antes.
6. **O rollback** — o teste quebra a gravação com um Proxy. Falta o caso em que o
   `deleteUser` do rollback TAMBÉM falha (hoje: `.catch(() => undefined)`, e a conta órfã
   volta). Não há caminho melhor sem fila de compensação, mas o buraco é real e está aqui.
7. **A fronteira (a)/(b) da Rule** — ler os dois casos novos e tentar movê-la.
8. **Token antigo em cache depois do deploy da C2** — `email_verified` só entra no token após
   refresh. Sessões já abertas antes do deploy precisam de um ciclo de token para continuar
   lendo o pedido pelo ramo (b). Não trancam ninguém (o ingresso segue pelo link assinado,
   RN-452), mas é ruído de suporte no dia do deploy.

## O que NÃO foi feito, e por quê

**B1, B2 e B3 (as telas)** — `apps/**` está com a `BUILD-MOTION` em voo. Elas consomem, do
`api-client`: `solicitarCodigoDeAcesso`, `confirmarCodigoDeAcesso` e `concluirAcessoComProva`.
O wrapper do `concluir` já troca o token por sessão (`signInWithCustomToken`) e **não devolve
o token** ao chamador.

**C1 (a prova da fronteira por teste)** — não estava na minha ordem (A1–A5 + C2). O caso
`FRONTEIRA (RN-480)` do `confirmarCodigoDeAcesso.integration` já afirma o negativo para a
porta de criação; a C1 pede o percurso pelas DUAS portas.

**Nenhum deploy.**

## O que sobe ao dono

Nada novo desta lane. O **CONTA-1** (o código convive com o link do e-mail da compra?) e o
**CONTA-2** (uma porta de criar conta ou duas?) continuam abertos e não bloqueiam o motor. O
item da borda de força bruta ganhou o consumidor novo previsto na spec — continua sendo do
CTO humano.
