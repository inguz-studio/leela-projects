---
trace: leela-pixreal-diag-20260804
lane: REV-AREACLIENTE
employee: sf-qa-engineer (software-forge) — ANTAGONISTA, contexto fresco
territorio: apps/landing · functions/src/cliente · packages/api-client · testes
revisa: 20bd6874 2d7f24d7 6d092619 9acb8fb5 5ffb69e0 3acfe7a8 9fd12c74 cdef2987 bdebe384
---

# REV-AREACLIENTE — a área do cliente sob ataque

## Veredito: **APROVADA-COM-FIXES**

A autorização é sólida e os dois isolamentos que a lane declarou se sustentaram
sob ataque nos dois sentidos. O que quebrou não foi a fronteira: foram **quatro
faltas caladas**, e três delas são a mesma classe de defeito que originou esta
rodada — a tela que não diz o que não sabe. A quarta é maior e não estava em
nenhum dos 16 vetores declarados: **a área foi construída inteira e ficou sem
rua**.

Três fix-commits aterrissados, cada um com o teste que o teria pegado.

---

## Tabela vetor → resultado

### Os 8 vetores da BUILD-AREACLIENTE

| # | Vetor | Resultado |
|---|---|---|
| 1 | Marca de código usado (`localStorage`, FNV-1a) | **PASSOU.** Nenhum caminho concede acesso; a marca só escolhe qual das duas telas sem-acesso aparece. Storage bloqueado degrada para `invalido`, que tem saída. Colisão FNV-1a troca "reenviar" por "entrar" — as duas válidas |
| 2 | `origem` forjada na callable pública (C2) | **PASSOU.** Valor desconhecido cai no default; o `oobCode` continua sendo o que autoriza |
| 3 | Degradação sem `LEELA_PUBLIC_URL` (base × rota) | **PASSOU** no link de senha. ⚠️ **FALHOU em outro lugar** — ver D3 |
| 4 | `contaSemFriccao` sem catch de `unauthorized-continue-uri` | **CONFIRMADO** (fora do território). C3 segue pré-requisito de deploy |
| 5 | Sessão nomeada vs. anônima (`lib/sessao.ts`) | **PASSOU.** `nomeado` é campo próprio; uid anônimo nunca passa. Provedor sem e-mail cai em `email_nao_verificado` no servidor — ver R2 |
| 6 | Anti-enumeração nas duas telas novas | **PASSOU** no conteúdo. Canal lateral de TEMPO permanece — ver F2 |
| 7 | Boundary de cliente no header | **PASSOU.** Só o slot atravessa; nenhuma prop não-serializável |
| 8 | `porta-organizador.test.tsx` enfraquecido? | **PASSOU.** O rodapé mantém os dois caminhos |

### Os 8 vetores da BUILD-AREACLIENTE-2

| # | Vetor | Resultado |
|---|---|---|
| 1 | O vínculo que autoriza o histórico (`leituraArea.ts`) | **PASSOU nos dois sentidos.** Ver "O ataque à autorização" |
| 2 | Fonte (b), `in` de 30 e o `slice` | **O VETOR DECLARADO É INALCANÇÁVEL** — e o corte real, dez fichas antes, estava mudo. **D4, corrigido** |
| 3 | `linksDisponiveis` e a escolha de não lançar | **A ESCOLHA ESTÁ CERTA. A MEDIÇÃO ESTAVA PELA METADE.** **D3, corrigido** |
| 4 | Guarda de sessão da área (`AreaDoCliente.tsx`) | **PASSOU.** O `vivo` fecha a corrida, inclusive no `tentarDeNovo` |
| 5 | `portaDaConta` (B5) | **PASSOU.** `__proto__` não vira papel; nenhum caminho até `/plataforma`. Ver F3 |
| 6 | `salvarMeusDados` (B3) | **PASSOU** no seam (objeto literal fixo, uid da sessão). Ver F4 |
| 7 | CTA do checkout (S1225-T4) | **PASSOU** tecnicamente. Ver P2 (juízo de dono) |
| 8 | Superfície pública nova (`/minha-conta`) | **PASSOU.** `noindex` + `no-store` + `no-referrer` + `disallow` |

### Vetores obrigatórios do brief

| Vetor | Resultado |
|---|---|
| 4 estados de `/definir-senha` | **3 OK, 1 QUEBRADO.** O caminho "senha gravada, login falhou" virava beco — **D2, corrigido** |
| Clique duplo no mesmo link | **PASSOU.** Segunda vez oferece entrar |
| Overlay: foco, Esc, retorno de foco | **PASSOU** por contrato do `Dialog` do DS. Conferência visual do dono |
| Overlay sobre rota que não deveria | **SEM DEFEITO.** `PublicHeader` está no `(public)/layout.tsx`, logo o overlay existe em toda rota pública, inclusive `/ingresso/{token}`. Ele não navega e não muda estado da página |
| CTA do checkout com pessoa deslogada | **P2** — aterrissa na porta de entrada. Era parede antes do D1; agora tem saída |
| `AREA_CLIENTE_NO_AR` de volta a `false` | **Resposta abaixo** |
| RN-469 campo a campo | **P1** — a diretriz não é cumprida pela área |

---

## O ataque à autorização (o vetor nº 1, em detalhe)

A query é `pedidos.where('contaSemFriccao.contaUid','==',uid)` com o filtro de
`responsavel.email` em memória, contra o e-mail **verificado** do token.

- **uid igual, e-mail diferente** → filtrado em memória. Fail-closed. ✅
- **e-mail igual, uid diferente** → nunca chega à memória: a query é por uid. ✅
- **e-mail trocado depois do claim** → a pessoa perde a leitura. Fail-closed
  deliberado, igual ao prefill, e o carimbo se auto-cura na próxima compra. É
  decisão, não defeito — mas é uma decisão que ninguém avisa a quem perdeu.
- **`contaSemFriccao.contaUid` forjável?** Não: `pedidos` é `write: if false` e
  o escritor é único.
- **maiúsculas/espaços** → normalizados nos dois lados (`trim().toLowerCase()`). ✅
- **`email` não-string/objeto** → `typeof !== 'string'` descarta. ✅
- **`callerDoToken` sem provedor** → tratado como anônimo (fail-closed). ✅

**A área é estritamente mais fechada que a Rule da RN-469.** A afirmação da lane
se confirma — e é justamente por isso que a exposição está do lado da Rule, não
do callable. Ver "Correção de Rule para o maestro".

---

## Defeitos

| # | Severidade | Defeito | Hash | Teste que o teria pegado |
|---|---|---|---|---|
| **D1** | **ALTA** | A área não tinha porta nem saída | `46a5eb8a` | `entrar-overlay-s1221` ⚔ "o rótulo da conta LEVA à área do cliente" + "o overlay oferece caminho para quem NÃO sabe a senha"; `minha-conta-s1222` ⚔ "a porta de entrada oferece saída a quem não sabe a senha" |
| **D2** | **MÉDIA-ALTA** | Senha gravada + login falho = beco | `40f094b1` | `definir-senha-s1223` ⚔ "senha gravada e login falho NÃO deixa a pessoa no formulário" |
| **D3** | **MÉDIA** | `linksDisponiveis` cego para a base pública ausente | `a1486abe` | `areaDoCliente.integration` ⚔ "keyring presente e base AUSENTE não pode devolver `linksDisponiveis: true`" |
| **D4** | **MÉDIA-BAIXA** | Corte de fichas de pessoa mudo (o corte real é 10, não 30) | `a1486abe` | `areaDoCliente.integration` ⚔ "doze fichas para um teto de dez devolve `listaCompleta: false`" |

### D1 · A área foi construída inteira e ficou sem rua (ALTA)

**Não estava em nenhum dos 16 vetores declarados** — é invisível para quem lê o
diff de cada task isolada, porque cada uma está certa sozinha.

Os únicos caminhos até `/minha-conta` eram o CTA da confirmação de compra e o
fim do `/definir-senha`: os dois momentos em que a pessoa **acabou de chegar**.
No header, o rótulo da conta era um `<span>`. Quem voltasse ao site no dia
seguinte, já logado, não tinha por onde entrar na própria casa.

A conferência visual do dono, na palavra do próprio construtor, abre com
"`/minha-conta` **entrando pelo header**". Não existia.

**A segunda metade é pior.** A `S1221-T1` registrou por escrito: *"Sem 'esqueci
minha senha' no overlay ainda. Entra na C1, junto com a `/definir-senha`, que é
onde o reenvio neutro é especificado."* A C1 aterrissou. O link nunca foi ligado
— o `EntrarOverlay` tem a prop `rodape` e nenhum chamador a usa.

O efeito é a parede na cara de quem esta rodada existe para atender: a conta do
comprador **nasce sem senha** (`contaSemFriccao`) e o link vai por e-mail; quando
o e-mail quebra — 04/08 — a porta de entrada da área diz *"se você já comprou
alguma vez, a conta existe — use o mesmo e-mail da compra"* e não oferece nenhum
caminho até uma senha. É pior no caso comum da **recompra**, em que o e-mail de
"conta criada" não é enviado de propósito (seria phishing).

Fix: o rótulo vira link (pela mesma trava `ctaMeusPedidos`, não por uma quarta
opinião sobre a rota) e o "Não sei minha senha" aparece no overlay e na porta de
entrada, apontando para `/definir-senha` — que já tinha o reenvio neutro provado.
`/definir-senha` **sem código** deixou de acusar "este link não vale mais" (quem
nunca teve link não teve link expirado) e ganhou o estado `sem_codigo`.

### D2 · Senha gravada, login falho, beco (MÉDIA-ALTA)

`salvar` cobria `confirmarResetSenha` **e** `loginComEmail` com um `catch` só.
Falha de rede no login: a senha já está gravada, o `oobCode` já foi queimado, e
a pessoa fica no **mesmo formulário** com uma mensagem de erro. O gesto natural é
salvar de novo — e a segunda tentativa bate em `auth/invalid-action-code`: *"este
link expirou"* sobre uma senha que existe.

A lane pensou neste caso e resolveu **metade**: a marca é gravada antes do login,
o que conserta o **reload**. O caso de teste existente (`falha de login depois de
confirmar não desfaz a marca do código`) fazia `cleanup()` e re-renderizava — ou
seja, provava o reload e nunca a tela. Ninguém recarrega uma página que acabou de
dar erro.

Fix: `catch` próprio para cada chamada. Falha ao entrar cai no estado `usado`,
que já é a tela certa ("sua senha já foi definida, é só entrar").

### D3 · A falha de configuração que continuou calada (MÉDIA)

**Julgamento pedido no brief:** servir ingresso sem link em vez de falhar alto é
**a lição do 04/08 aplicada certo**. Derrubar a leitura inteira apagaria da tela
o ingresso que a pessoa pagou por causa de uma variável de ambiente. Mantenha.

Mas a medição estava pela metade. São **duas** configurações e **um** buraco na
tela: sem `LEELA_PUBLIC_URL`/`NEXT_PUBLIC_LEELA_URL`, `urlIngressoPorLink`
devolve `null` para **todos** os itens — sem log, sem `alerta`, e com
`linksDisponiveis: true`. O cartão então dizia *"O ingresso está no e-mail da
compra"*, que é falso **exatamente nessa configuração**: sem base o e-mail também
sai sem link (D-ING-8). Falha de configuração calada, com a tela afirmando um
caminho que não existe. É o 04/08 inteiro de novo, um andar abaixo.

Fix: `linksDisponiveis = keyring !== null && basePublica() !== null`, e o log de
erro nomeia qual das duas faltou.

⚠️ **O nome do log mudou**: `area_cliente_qr_keyring_ausente` →
`area_cliente_link_ingresso_indisponivel` (com `keyringAusente` e
`basePublicaAusente` no payload). A política de alerta do item 2 da operação tem
de casar o nome novo.

### D4 · O corte que ninguém contou (MÉDIA-BAIXA)

O vetor declarado — `pessoaIds` com mais de 30 e o `slice` que corta calado — é
**inalcançável**: `resolverContaDoCliente` já limita a `TETO_PESSOAS_POR_CONTA`
(10), e 10 < 30. O `slice` nunca cortou nada.

O corte real acontece dez fichas antes, no `.limit(10)`, e **esse** era mudo: a
fonte (b) perdia linhas e a resposta se declarava `listaCompleta: true`. Quem tem
mais de dez fichas (correções de CPF ao longo dos anos, que é a razão declarada
do teto existir) deixava de ver ingresso que recebeu de presente, sem aviso.

Fix: o gate lê `TETO + 1` para **saber** que cortou; `listaCompleta` passa a
carregar as duas metades. O teto não mudou.

---

## Correção de Rule para o maestro (`firestore.rules` — NÃO TOCADO)

**Exposição medida (POSSE-EMAIL-1, sem implementar o default).**

A Rule da RN-469 autoriza a leitura do doc de pedido por
`contaSemFriccao.contaUid == request.auth.uid` **sem exigir `email_verified`**.
O callable da área exige. A Rule é, portanto, a superfície mais frouxa das duas.

Cadeia completa do ataque:

1. Atacante registra `vitima@x.com` no Auth (o `/cadastrar` do painel é aberto) e
   **nunca verifica** o e-mail.
2. A vítima compra usando o próprio `vitima@x.com`.
3. Na confirmação, `contaSemFriccao` faz `getUidPorEmail` → acha a conta do
   atacante → carimba `contaSemFriccao.contaUid = uidDoAtacante`.
4. **Área do cliente: NEGADO** (sem `email_verified`). O gate segura. ✅
5. **Rule: PERMITIDO.** O atacante lê o pedido inteiro — `responsavel`
   (nome/e-mail/telefone), `endereco`, `aceites`, `itens`, valores. ❌

Atenuante: exige conhecer o `pedidoId` (`ped-{uid}-{chave}`, com o uid da sessão
do checkout — não enumerável). Severidade real: **MÉDIA**, não crítica.

Agravante que **não** depende de conhecer o id: a vítima fica **permanentemente
trancada fora da própria compra**. Não consegue criar conta (o e-mail está
tomado), não recebe o e-mail de "conta criada" (`nao_aplicavel` de propósito) e,
antes do D1, não tinha nenhum caminho até uma senha. **O fix D1 remove essa
metade**: com o "Não sei minha senha", a vítima pede o link, o Firebase prova
posse do e-mail e ela retoma a conta.

**Correção exata (decisão do dono — é literalmente o POSSE-EMAIL-1):**

```
      function ehCompradorDoPedido() {
        return isSignedIn()
          && (
            ('responsavel' in resource.data
              && 'atletaId' in resource.data.responsavel
              && resource.data.responsavel.atletaId == request.auth.uid)
            ||
            ('contaSemFriccao' in resource.data
              && 'contaUid' in resource.data.contaSemFriccao
              && resource.data.contaSemFriccao.contaUid == request.auth.uid
              && request.auth.token.email_verified == true)   // ← a linha nova
          );
      }
```

Só o ramo **(b)** ganha a condição. O ramo (a) (`responsavel.atletaId`) **não
pode** ganhá-la: ele é o uid da sessão **anônima** do checkout, que nunca tem
`email_verified`, e exigi-la ali quebraria a consulta do próprio pedido logo
depois de pagar — a S1225-T3, que é a primeira metade do conserto de 04/08.

Custo do fix: a conta vinculada mas ainda não verificada perde a leitura direta
do doc até confirmar o e-mail. Ela já não vê nada na área hoje, então a perda é
de superfície, não de função.

---

## Ressalvas — juízo de dono (viram item de painel)

**P1 · A RN-469 ("todo campo novo em `pedidos/{id}` nasce visível ao comprador")
não é cumprida pela área.**
`PainelCompras` mostra 6 fatos: nome do evento, dia, participantes,
`codigoPedido`, `valorTotal`, `status`. O doc tem 16 campos. Ficam invisíveis ao
comprador, **para sempre**: `itens` (a decomposição monetária por inscrito —
valorBase, desconto, valorFinal, taxaRepassada), `endereco`, `aceites`,
`parcelas`, `pagamentoRef`, `responsavel.telefone`, `tenantId`.
O comentário do `PainelCompras` diz que o detalhe "continua onde já mora — a tela
do checkout (S1225), que lê o próprio pedido pela RN-469". **Isso não é
verdade**: a consulta do S1225 lê `charge?.pedidoId` do estado do componente e
não há rota, query param ou link que a alcance depois. Fechou o navegador,
acabou. E `formaPagamento` atravessa a fronteira do callable e não é renderizado
por ninguém — contradiz o princípio escrito no cabeçalho do próprio
`minhasCompras.ts`.
**Decisão do dono:** ou a linha da compra ganha caminho até o detalhe, ou a
diretriz permanente da RN-469 vira "todo campo novo nasce **autorizado** ao
comprador", que é coisa diferente do que está escrito.

**P2 · O CTA do checkout aponta para uma porta que a pessoa talvez não consiga
abrir.** No PIX pendente a sessão é a **anônima**; "Ver meus ingressos" leva à
porta de entrada. Com o D1 ela deixou de ser parede, mas a promessa do rótulo
("ingressos") e a entrega (formulário de login) continuam distantes no pior
momento possível. Alternativas: rotular condicionalmente, ou só mostrar o CTA
para sessão nomeada.

**P3 · A conta de administração vê a área inteira.** A B5 tira as duas portas
(RN-449), mas `/minha-conta` renderiza ingressos, compras e meus dados para um
`platform_admin`. A lane registrou isso como "verdade, não vazamento" — é uma
leitura defensável e é do dono ratificar, junto do ADMINSEP-2.

**P4 · Quem trocou de e-mail depois do claim perde o histórico, em silêncio.** O
fail-closed é o certo. O que falta é a tela dizer alguma coisa: hoje a pessoa vê
"você ainda não tem ingressos", que é exatamente a lista vazia que mente e que a
RN-451 proíbe. Distinguir exige um sinal novo do servidor.

---

## Fila técnica (não bloqueia)

- **F1 · `lerPedidosDaConta` limita 200 SEM `orderBy`.** O Firestore devolve os
  200 primeiros por `__name__`, não os 200 mais recentes; a ordenação por data é
  feita **depois**, em memória, sobre o conjunto errado. Acima de 200 compras a
  mais recente pode simplesmente não estar no conjunto — o defeito de 04/08 outra
  vez. E não existe `listaCompleta` no lado das compras. Correção:
  `.orderBy('criadoEm','desc')` + índice composto
  (`contaSemFriccao.contaUid` ASC, `criadoEm` DESC) — exige passo de deploy, por
  isso não foi aplicada por esta lane.
- **F2 · Canal lateral de tempo na anti-enumeração.** O reenvio aguarda
  `enviarResetSenha` antes de confirmar; conta existente e inexistente têm
  latências diferentes. O conteúdo é idêntico (provado). Correção: piso de tempo
  fixo, ou disparo sem `await`.
- **F3 · `getClaims()` usa token em cache** (`forceRefresh = false`). Um
  `platform_admin` com token velho carregando `tenant_owner` vê a porta do
  organizador. Nenhum caminho até `/plataforma`; o painel decide o resto.
  `tenantId: '   '` (só espaços) também vira `organizador`.
- **F4 · `salvarMeusDados` não limita o tamanho do `nome`.** A Rule de
  `atletas/{uid}` é `write` livre para o dono, sem validação de shape. O React
  escapa a renderização, então não há XSS; o risco é doc inchado e nome absurdo
  denormalizado adiante.
- **F5 · `montarIngresso` fica em silêncio quando `tenantId` está vazio** (doc de
  inscrito sem tenant e evento inexistente): sem link, sem `warn`, sem sinal.
- **F6 · Duplicação pendente** de `authErrors`/`authValidation` em `apps/painel`
  — herdada, não desta lane.

---

## Gates colados

**`tsc --noEmit`**

- `apps/landing` — **zero**.
- `packages/api-client` — **zero**.
- `functions` — **zero em `src/cliente/**` e em todo arquivo desta lane.** A
  saída fechou em zero na primeira medição; numa medição posterior apareceram 4
  erros de `papelDaConta` em `functions/src/checkout/contaSemFriccao.ts` e em
  três testes — **trabalho não versionado de OUTRA lane em voo** (a A4; o
  arquivo novo `functions/src/__tests__/contaAdminSemVinculo.integration.test.ts`
  é dela). Nenhuma linha de `functions/src/cliente/**` em nenhuma das saídas.

**`eslint --max-warnings 0`** — `apps/landing` (`app lib`), `packages/api-client`
(`src`), `functions` (`src/cliente` + o teste da área): **zero em todos**.

**Suíte da landing INTEIRA**

| Momento | Resultado |
|---|---|
| Linha de base recebida | `53 · 660` |
| Baseline confirmada antes de tocar em nada | **`53 · 660`** ✅ |
| Depois dos fixes, 2× seguidas | **`53 · 665`** · **`53 · 665`** ← linha de base nova |

**O flake declarado pela lane anterior NÃO reapareceu** em nenhuma das execuções
desta lane (3 execuções completas da suíte + 2 execuções dos arquivos tocados).
Nome do caso segue **não capturado** — o achado da lane anterior continua aberto.

**Functions — só os arquivos tocados**, emulator próprio desta lane
(`firebase.revareacli.json`, `127.0.0.1:8584` / `9702`, IPv4 explícito, JDK 21):

```
areaDoCliente.integration.test.ts + secretsBinding.contract.test.ts
 Test Files  2 passed (2)
      Tests  55 passed (55)
+  Script exited successfully (code 0)
```

`areaDoCliente.integration` foi de 29 para **32 casos**.
**`secretsBinding.contract` — 23/23**, como pedido no brief.
A suíte completa de functions **não** foi executada, por gate do brief.

**`firestore.rules` INTOCADO. Nenhuma Rule nova.** `apps/painel`,
`functions/scripts`, `packages/core` e `leela-specs/` intocados. Todos os commits
usam `git commit --only`, arquivo a arquivo — a árvore tem trabalho de terceiro
não versionado (`functions/src/checkout/contaSemFriccao.ts`,
`functions/src/__tests__/contaAdminSemVinculo.integration.test.ts`,
`functions/lib/`) que **não** entrou em nenhum commit.

---

## O interruptor: o que quebra se `AREA_CLIENTE_NO_AR` voltar a `false`

Resposta medida, agora com quatro consumidores em vez de três:

- `destinoPosEntrada()` → volta para a home (`/definir-senha` fica coerente);
- `ctaMeusPedidos()` → `null`, o CTA do checkout some (nunca botão quebrado);
- **o rótulo da conta no header volta a ser `<span>`** — o fix D1 entrou pela
  mesma trava de propósito, para não criar uma quarta opinião sobre a rota;
- **a rota `/minha-conta` continua no ar.** A trava governa as *jornadas*, não a
  existência da página: `page.tsx` não a consulta. Com o interruptor em `false` a
  área fica viva e sem link — alcançável por URL direta e por link antigo colado
  em conversa. Não é defeito (a guarda de sessão continua valendo e o `robots.ts`
  a exclui), mas é o fato que o nome "interruptor" não sugere.

---

## Conferência VISUAL do dono (nenhuma lane abriu navegador)

O que a REV acrescenta às listas das duas lanes anteriores, que continuam
valendo:

1. **O rótulo da conta no header, agora clicável** — em 320px, com nome longo e
   com e-mail no lugar do nome (conta sem `displayName`): o `truncate` segura, o
   alvo de toque é grande o bastante, e o header não quebra em duas linhas com os
   quatro itens disputando espaço.
2. **"Não sei minha senha"** — dentro do overlay (alcançável só com teclado, sem
   fechar o modal) e abaixo do botão na porta de entrada da área. Contraste AA do
   link sublinhado sobre `surface-base` e sobre a superfície do diálogo.
3. **`/definir-senha` sem código na URL** — a tela nova "Receba seu link de
   acesso". É a primeira tela de quem ficou sem e-mail; vale ler a frase inteira
   em voz alta.
4. **A jornada completa do beco (D2)** — definir a senha com a rede caindo no
   instante do login: a tela tem de dizer "sua senha já foi definida", e não
   voltar ao formulário.
5. **`/minha-conta` com o keyring OU a base pública faltando** — o aviso do topo
   da lista aparece uma vez só e não briga com o aviso de lista incompleta quando
   os dois acontecem juntos.
6. **A jornada real, depois do deploy E da C3** — comprar, receber o e-mail,
   clicar, definir a senha, cair em Meus Ingressos, **fechar o navegador, voltar
   no dia seguinte e chegar na área pelo header**. Este último passo é novo, e é
   o que o D1 destravou.

---

## Para o maestro selar (não editei `leela-specs/`)

- **Painel do dono** — abrir/atualizar: **POSSE-EMAIL-1** com a exposição medida
  e a correção de Rule exata acima; **P1** (a RN-469 e o caminho até o detalhe da
  compra); **P2** (o CTA no PIX pendente); **P3** (a área inteira para conta de
  administração, junto do ADMINSEP-2); **P4** (troca de e-mail e o histórico que
  some calado).
- **Política de alerta** — o log mudou de nome:
  `area_cliente_link_ingresso_indisponivel`, severidade ERROR, `alerta: true`,
  com `keyringAusente`/`basePublicaAusente`. Ele cobre as duas faltas, e a
  operação passa a ter **duas** variáveis para conferir antes do deploy, não uma.
- **V1-KANBAN** — as nove tasks sob review seguem entregues; nenhum commit foi
  revertido. Acrescentar os três fix-commits: `46a5eb8a`, `40f094b1`, `a1486abe`.
- **Fila técnica** — F1 (o `orderBy` das compras, com índice composto novo) é a
  única que precisa de passo de deploy e a única com potencial de repetir o
  defeito de 04/08. As demais são higiene.
- **Linha de base nova da suíte da landing: `53 arquivos · 665 testes`.**
