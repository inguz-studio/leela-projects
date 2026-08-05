---
trace: leela-pixreal-diag-20260804
lane: REV-B4
employee: sf-qa-engineer (software-forge) — ANTAGONISTA, contexto fresco
sob-review: 4b72c556 (callable + índices + 22 casos) · b3e51638 (tela + 14 casos)
territorio: apps/landing/**/minha-conta/** · functions/src/cliente/** · packages/api-client · testes
---

# REV-B4 — "Meus Clubes e a caixa de convites" (S1222-T4)

## Veredito: **REPROVADA-E-CORRIGIDA** — 3 defeitos, 3 fix-commits

O isolamento está correto e a superfície de credencial está fechada: os dois
vetores que o brief chamou de mais perigosos **passaram**, e passaram com
prova. O que derrubou a entrega foi, de novo, **o não declarado** — e o pior
dos três não está em nenhuma linha de TypeScript: está no `firestore.indexes.json`,
no passo de deploy que o próprio handoff manda o maestro rodar primeiro.

| Fix | O quê | Severidade | Commit |
|---|---|---|---|
| **D1** | `fieldOverride` COLLECTION_GROUP **apaga** o índice de coleção do campo — o deploy de índices derrubaria `entrarNoDesafio` | **ALTA** | `32dd9966` |
| **D2** | a caixa diz "Você já aceitou este convite" para quem nunca foi convidado; e o `getAll` de nomes fora do `try` derrubava a área inteira | **MÉDIA** | `8694d59b` |
| **D3** | a aba mais nova, dentro do `Promise.all` cru, apagava "Minhas compras" ao falhar | **MÉDIA-ALTA** | `2cdc5629` |

---

## Tabela vetor → resultado

### Os 7 vetores obrigatórios do brief

| # | Vetor | Resultado |
|---|---|---|
| 1 | **Isolamento por uid** (`membros.atletaId`) | **PASSOU.** `atletaId` é o uid de Auth (confirmado nos 3 escritores + `entrarNoDesafio.ts:77`). Rule `clubes/{id}/membros`: `create/update` exigem `isTenantWriter` — token `athlete` **não escreve**, e há caso provando que nem lê. Dado plantado do Bruno no mesmo clube da Ana não atravessa. ⚠️ Ver R6: um tenant writer pode carimbar `atletaId` de terceiro — polui, não vaza |
| 2 | **Isolamento por e-mail** (`afiliados.responsavelEmail`, `convites.email`) | **PASSOU, e o argumento do construtor se sustenta.** Não existe caminho em que o e-mail venha do `data`: o callable ignora o payload (`_data: unknown`), `callerDoToken` lê só `auth.token`, e `resolverContaDoCliente` exige `email_verified` **nativo**. Normalização: os quatro pontos coincidem em `trim().toLowerCase()` (`salvarAfiliado.ts:136`, `cadastrarAssessoria.ts:170`, `enviarConvites.ts:88`, `gateAreaCliente.ts:114`). Colisão por `+alias`/ponto do Gmail/maiúscula: **impossível** — é igualdade exata de string e o Firebase Auth já garante e-mail único por conta; as variantes são strings diferentes, logo produzem MISS, nunca HIT alheio |
| 3 | **Credencial** | **PASSOU.** Nem `token`, nem `tokenAceiteHash`, nem `refCodigo`, nem `parceriaId` atravessam (caso serializa a resposta inteira). A tela não tem `<a>` nem `<button>` de aceite. `chave` é SHA-256 do CAMINHO truncado em 16 hex — não reconstitui path e só cobre docs que a pessoa já vê. Logs: `uid`, contagens e flags. Ver R7 |
| 4 | **Os três índices / degradação** | **PARCIAL → virou D1.** A degradação declarada existe e foi **provada com o caminho de erro forçado** (não dava para provar no Emulator, que não cobra índice — usei um `Db` de mentira). Mas havia um ramo **não coberto**: o `getAll` de nomes ficava FORA do `try`, e a falha ali matava as três listas e a área. Corrigido em `8694d59b`. E o próprio arquivo de índices trazia o D1 |
| 5 | **Corte e ordenação** | **PASSOU.** As três queries nascem com `orderBy(FieldPath.documentId())` + `limit(TETO+1)`; `completa` é calculado por `snap.size <= TETO`; a tela mostra `clubes-lista-parcial`/`convites-lista-parcial`. A F1 da REV-AREACLIENTE não se repete. ⚠️ Ver R1: o corte é honesto, mas é gasto por linhas que a caixa nem mostra |
| 6 | **Estados vazios** | **PASSOU, sem promessa falsa.** "Você ainda não faz parte de nenhum clube / Quem administra um clube na Leela é quem inclui os participantes" é verdade hoje (varri os escritores de `membros`: painel, agregado e seed — o achado CLUBES-1 confere). Nenhum botão de entrar, nenhum CTA morto |
| 7 | **Aceite** | **REPROVOU → D2.** Convite aceito por outra pessoa: **impossível** (os dois aceites resolvem a conta por `getUserByEmail(emailKey)`). Revogado: **some** da caixa (ver R4, decisão). Expirado: aparece com estado próprio ✔. **Mas** `status:'ativo'` no afiliado PF **não é** prova de aceite — o vínculo direto da RN-316 nasce ativo, sem convite e sem token, e a caixa afirmava um ato que nunca houve |

### O não declarado que o brief mandou caçar

| Alvo | Resultado |
|---|---|
| **Header / rotas da área** | **SEM REGRESSÃO.** A B4 não cria rota: é uma quarta aba dentro de `/minha-conta`, que ganhou porta no fix D1 da REV-AREACLIENTE (`ctaMeusPedidos`). O interruptor `AREA_CLIENTE_NO_AR` não ganhou consumidor novo |
| **Conta de administração** | **SEM CAMINHO NOVO.** A aba não consulta claim nenhuma; um `platform_admin` roda as mesmas três queries sobre o próprio uid/e-mail e vê a própria caixa. A RN-449 vive em `PortasDaConta`, fora das abas, e não foi tocada |
| **Gate igual às outras callables** | **IGUAL, e provado.** Mesmo `callerDoToken` + `resolverContaDoCliente`; três casos (anônimo, e-mail não verificado, token sem provedor). Única diferença: `getMeusIngressos` declara `runWith({secrets:['QR_TOKEN_KEYS']})` — o novo **não toca segredo nenhum**, e o `secretsBinding.contract` 23/23 é a prova, não a suposição |
| **`collectionGroup` de mesmo nome** | **FECHADO.** Só existem `clubes/{}/membros` (nenhum outro grupo `membros` no banco) e as duas `convites`. O pai é conferido explicitamente. Em produção o desafio mora em `clubes/{c}/desafios/{d}/convites` — `parent.parent.parent.id === 'desafios'`, também excluído. Ver R5 (fidelidade do caso) |

---

## D1 · O `fieldOverride` que apaga o índice que já existia (ALTA) — `32dd9966`

**Não estava em nenhum dos 8 vetores do construtor, e é o defeito mais caro
desta lane.** Ele não quebra nada no deploy do código: quebra no deploy dos
**índices**, que é o passo que o handoff da BUILD manda rodar **antes**.

Em `firestore.indexes.json`, um item de `fieldOverrides` **não é "mais um
índice"**: é uma **isenção** da política automática de índice de campo único
daquele campo, e o array `indexes` é a lista **completa** do que passa a
existir. A `4b72c556` declarou os três assim:

```json
{ "collectionGroup": "membros", "fieldPath": "atletaId",
  "indexes": [ { "order": "ASCENDING", "queryScope": "COLLECTION_GROUP" } ] }
```

Isso habilita a query de grupo **e remove** os índices de escopo `COLLECTION`
que o Firestore mantinha sozinho para `atletaId`.

**O que quebra:** `functions/src/jornada/entrarNoDesafio.ts:74-79`

```ts
const snap = await db
  .collection('clubes').doc(clubeId)
  .collection('membros')
  .where('atletaId', '==', uid)   // escopo COLLECTION
  .limit(1)
  .get();
```

`resolverMembroAtivo` **não tem `try/catch`**: o `FAILED_PRECONDITION` sobe,
`entrarNoDesafioCore` estoura, e **ninguém entra em desafio nenhum na
plataforma** — por causa de um deploy de índices motivado por uma tela de
leitura. Causa e efeito ficam separados por quanto tempo o maestro quiser.

**O precedente estava no próprio arquivo:** `lotes.fimEm` e
`inscritos.pessoaRef` re-listam as entradas `COLLECTION` justamente porque o
override substitui em vez de somar. Os overrides novos não seguiram.

**Correção aplicada** — os três passaram a re-listar `COLLECTION ASC` +
`COLLECTION DESC` + `COLLECTION_GROUP ASC`.

**Teste que o teria pegado** — `functions/src/__tests__/firestoreIndexes.contract.test.ts`
(estático, 3 casos, não sobe Emulator, roda em 317 ms). Regra **fail-closed**:
todo `fieldOverride` mantém escopo `COLLECTION` a menos que esteja em
`SEM_ESCOPO_DE_COLECAO` com a varredura de `where('<campo>'` feita e escrita.
Mais um caso ancora a query de `entrarNoDesafio.ts` no arquivo real, para o
invariante não virar comentário.

**Falsificação executada:** com o `firestore.indexes.json` de `4b72c556`,
2 dos 3 casos falham com a mensagem exata; com o fix, 3/3 verdes.

---

## D2 · "Você já aceitou este convite" para quem nunca foi convidado (MÉDIA) — `8694d59b`

Dois defeitos no mesmo leitor, ambos da família que esta rodada existe para
não repetir.

**(a) `status: 'ativo'` não é prova de aceite.** `salvarAfiliado.ts:165-193 +
318-324` cria o afiliado PF **já ativo, sem token e sem convite**, quando o
e-mail já tem conta **verificada** — o ramo `vinculoImediato`, que a própria
RN-316 chama de "caso legítimo". É exatamente o perfil de quem abre
`/minha-conta`. O leitor mapeava `status === 'ativo'` → `estado: 'aceito'`, e a
tela imprimia:

> **Convite para influenciador** · Aceito · *"Você já aceitou este convite."*

para alguém que nunca recebeu convite nenhum e nunca aceitou nada. Não é
detalhe de copy: é o cartão inteiro afirmando um ato que não houve — e, no
caso comum, é a **maioria** dos cartões de influenciador.

O discriminador honesto já existia no dado: `aceitoEm` só é carimbado pelo
aceite por token (`provisionAfiliado.ts`, na mesma tx que muda o status). O
leitor passou a exigi-lo. O vínculo direto continua visível onde ele é —
`getMinhasAfiliacoes`, que é a tela do influenciador.

**(b) A resolução de NOMES ficava fora do `try`.** `lerNomesDeClubes` /
`lerNomesDeEventos` (`db.getAll`) rodavam **depois** do bloco protegido. Uma
indisponibilidade ali subia pelo `Promise.all` do núcleo, o callable devolvia
`internal` e a área inteira caía — contradizendo, na mesma função, o
comentário que promete o contrário ("são duas leituras independentes, e
derrubar as duas por causa de uma esconderia o convite que a pessoa precisa
ver"). Agora degrada declarada: a linha fica, sem nome (a tela já resolve com
"Clube"/"Leela"), e sai `area_cliente_nomes_falhou` ERROR com `alerta: true`.
A lista **não** é marcada incompleta — faltou enfeite, não dado; dizer o
contrário seria outro tipo de mentira.

**Falsificação executada** para (a): sem a linha do `aceitoEm`, o caso falha com
`expected [ 'influenciador:aceito', …(1) ] to deeply equal [ 'influenciador:aceito' ]`.

---

## D3 · A aba mais nova apagava "Minhas compras" ao cair (MÉDIA-ALTA) — `2cdc5629`

`AreaDoCliente.tsx` punha as três leituras no mesmo `Promise.all` **sem rede**.
`getMeusClubesEConvites` é a function **mais nova** — a única que pode não estar
deployada quando a landing sobe, e a única cujo índice de grupo ainda está
pendente. Qualquer rejeição dela mandava a **área inteira** para
`FalhaDeLeitura`, apagando **"Minhas compras"**: a superfície que só existe
porque em 04/08 um PIX real do dono não apareceu em lugar nenhum.

O sintoma já estava escrito — no arquivo de teste da própria B4:

> *"sem este seam no mock, o `Promise.all` rejeita e a área inteira cai no
> estado de falha"*

A conclusão de produção é que faltava. Agora a leitura de clubes degrada
declarada (`clubesCompletos`/`convitesCompletos: false` → os dois avisos que a
tela já sabe mostrar). **Ingressos e compras continuam derrubando a área de
propósito**: ali, lista vazia por falha seria a mentira que a RN-451 proíbe.

**Falsificação executada:** com o `Promise.all` cru, o caso novo falha.

---

## Correção de Rule para o maestro

**NENHUMA.** `firestore.rules` não foi tocado por esta lane nem pela BUILD, e a
varredura confirma que nenhuma Rule precisa mudar: `clubes/{}/membros`,
`clubes/{}/convites` (catch-all `read, write: if false`) e
`eventos/{}/afiliados` (`write: if false`) já estão fechadas ao `athlete`, e o
molde callable não pede nada delas. Três casos do arquivo provam a negação pelo
SDK.

---

## É seguro deployar isto?

**SIM — depois de `32dd9966`. ANTES dele, NÃO.**

O `firebase deploy --only firestore:indexes` com o `firestore.indexes.json` de
`4b72c556` teria derrubado a entrada em desafio da plataforma. Confira que o
HEAD que vai ao deploy contém os três commits desta lane.

**Ordem obrigatória, e ela mudou de motivo:**

1. **`firebase deploy --only firestore:indexes`** — agora são **quatro**
   overrides pendentes (`inscritos.pessoaRef` da BUILD-AREACLIENTE-2 + os três
   da B4). Sem eles a área degrada declarada; **com o arquivo errado**, a
   jornada quebra. Confira antes: `membros.atletaId` precisa ter `COLLECTION` na
   lista.
2. **`firebase deploy --only functions`** — inclui `getMeusClubesEConvites`.
3. **landing.** Com `2cdc5629` a ordem 2↔3 deixou de ser fatal: se a function
   não existir, a aba mostra os dois avisos e o resto da área funciona. Ainda
   assim, deploye functions antes.

Índice de grupo leva tempo para construir. Enquanto constrói, a resposta vem
com `clubesCompletos:false` / `convitesCompletos:false` e três `logger.error`
com `alerta: true` — comportamento correto, não incidente.

---

## Ressalvas e fila técnica (não bloqueiam o deploy)

- **R1 · o teto é gasto por linhas que a caixa nem mostra.** O `limit(50)` do
  `collectionGroup('convites')` roda **antes** do filtro `origem ==
  assessoria_parceira`. Convite de **membro comum** de clube (E05-S104) mora na
  mesma coleção, é o tipo mais comum e é emitido em lote de até 50 e-mails.
  Uma pessoa convidada para muitos clubes pode ver `convitesCompletos:false`
  **permanentemente** e nunca ver o convite de promotor. Consertar exige índice
  **composto** novo (`email` ASC + `origem` ASC) — decisão de sequenciamento do
  maestro, igual à F1.
- **R2 · dois `fieldOverride` PRÉ-EXISTENTES têm a mesma omissão** —
  `afiliados.responsavelUid` e `afiliados.tenantId`. Hoje **não há** query de
  coleção sobre esses campos, então nada quebra; ficaram declarados no
  contrato (`SEM_ESCOPO_DE_COLECAO`) em vez de alterados, porque são de outra
  lane. Se alguém escrever `eventos/{id}/afiliados.where('tenantId', …)`, quebra.
- **R3 · constante duplicada.** `meusClubes.ts` redeclara
  `ORIGEM_ASSESSORIA = 'assessoria_parceira'` em vez de importar
  `ORIGEM_CONVITE_ASSESSORIA` (`assessorias/cadastrarAssessoria.ts:114`). Duas
  fontes para o mesmo discriminador é como o filtro morre calado no dia em que
  a marca mudar.
- **R4 · convite REVOGADO some sem dizer.** `encerrarParceria.ts:139` marca o
  convite como `cancelado`; o leitor o descarta. Quem teve o convite revogado
  vê a caixa vazia — e o construtor escolheu mostrar `expirado` e `aceito`
  justamente para não fazer isso. É decisão de produto, não defeito: vale
  ratificar com o dono.
- **R5 · fidelidade de um caso.** O teste planta o convite de desafio em
  `desafios/{id}/convites` (top-level); em produção ele é
  `clubes/{c}/desafios/{d}/convites`. A checagem de pai cobre as duas formas —
  conferi —, mas o caso prova a que não existe.
- **R6 · poluição por tenant writer.** As Rules de `membros` permitem que um
  organizador crie o vínculo com `atletaId` de terceiro. Não é vazamento (o
  dado é do próprio clube), mas um clube pode **aparecer** em "Meus clubes" de
  alguém que nunca pediu. Pré-existente à B4 (S103-T2); item de painel.
- **R7 · `err.message` nos três logs de erro é campo livre.** Hoje as mensagens
  do Firestore não carregam o valor da query (só a definição do índice), então
  não há PII. Nada garante isso para um erro de outra natureza.
- **R8 · corte e falha são o mesmo sinal na tela.** Já declarado pelo
  construtor; continua verdade. A pessoa não distingue "faltou porque é muito"
  de "faltou porque quebrou".
- **F1..F7 da REV-AREACLIENTE** seguem abertas; **F1** (`lerPedidosDaConta` com
  `limit(200)` sem `orderBy`) continua em `functions/src/cliente/leituraArea.ts`,
  território desta lane, **não corrigida aqui** pelo mesmo motivo que a BUILD
  deu: exige índice composto novo e é sequenciamento do maestro.
- **CLUBES-1 e CONVITE-1** confirmados por varredura independente. CLUBES-1 é
  real: não existe `entrarNoClube`, o `codigoConvite` (RN-101) não é consumido
  fora do seed, e o convite de membro comum de clube **não tem máquina de
  aceite** — o e-mail sai, o doc nasce, e nada o transforma em membro.

---

## Gates colados

**`tsc --noEmit`** — `apps/landing`: **zero**. `functions`: **zero**.
`packages/api-client`: **zero**. (Rodados **depois** dos três fixes.)

**`eslint --max-warnings 0`** — `apps/landing` (`app lib`, escopo do script):
**zero**. `apps/landing` (os dois arquivos de teste tocados): **zero**.
`packages/api-client` (`src`): **zero**. `functions`
(`src/cliente src/__tests__/clubesEConvites… src/__tests__/firestoreIndexes… src/index.ts`):
**zero**.
> ⚠️ `eslint app lib test` (escopo mais largo que o do script) acusa **1 erro
> HERDADO** em `apps/landing/test/ingresso-pdf.test.tsx:30`
> (`consistent-type-imports`). Arquivo não tocado por esta lane e fora do
> `lint` declarado do pacote. Fica registrado.

**Suíte da landing INTEIRA, 2× seguidas**, com `--testTimeout=30000` (o teto que
a BUILD mediu como necessário — **declarado**, como o brief pediu):

```
Test Files  57 passed (57)
     Tests  700 passed (700)      ← 1ª   (exit 0)
Test Files  57 passed (57)
     Tests  700 passed (700)      ← 2ª   (exit 0)
```

**Linha de base: `57 arquivos · 700 testes`** (era `57 · 697`; +1 desta lane,
+2 da REV-5C, que aterrissou `2b3b8810` com o `checkout-s1228-codigo-obsoleto`
já versionado).

**Functions — arquivo a arquivo**, emulator DESTA lane
(`firebase.revb4.json`, **não commitado**, `127.0.0.1:8793`/`9793`, hub `4493`,
logging `4593`, IPv4 explícito; JDK 21 confirmado por `java -version` →
`21.0.11+10`):

```
clubesEConvites.integration.test.ts + firestoreIndexes.contract.test.ts
                                    + secretsBinding.contract.test.ts
 Test Files  3 passed (3)
      Tests  51 passed (51)
+  Script exited successfully (code 0)
```

A suíte completa de functions **não** foi executada (gate do brief).

**`secretsBinding.contract` 23/23** com os fixes aplicados — o callable novo
continua sem tocar acessor de segredo.

**Falsificações executadas** (cada fix reprovado antes de ser aprovado):

| Fix | Reversão | Resultado |
|---|---|---|
| D1 | `firestore.indexes.json` de `4b72c556` | 2 de 3 casos **falham** |
| D2 (a) | remover a linha do `aceitoEm` | caso **falha** com a mensagem exata |
| D3 | `Promise.all` cru | caso **falha** |

**Território.** Nada tocado em `apps/landing/**/checkout/**`,
`functions/src/email/**`, `firestore.rules`, `packages/core`,
`functions/scripts`, `apps/painel`, `leela-specs/`. Todos os commits com
`git commit --only`, arquivo a arquivo; **nenhum `--amend`**. Sem deploy, sem
navegador.

---

## Conferência VISUAL do dono

A lista da BUILD continua valendo inteira. Esta review acrescenta **dois itens
novos**, ambos criados pelos fixes:

1. **A aba "Clubes e convites" quando a function falha** (D3) — os **dois**
   avisos de lista parcial aparecem **junto** com os **dois** estados vazios.
   São quatro blocos de texto empilhados na mesma aba. É a tela que o dono verá
   se abrir `/minha-conta` **antes** do deploy dos índices terminar de
   construir, e o juízo de "isso lê como aviso honesto ou como tela quebrada?"
   é dele. Há caso automatizado provando que os quatro convivem; ele não julga
   estética.
2. **O cartão de convite ACEITO ficou mais raro** (D2) — só aparece para quem
   aceitou por link. Vale conferir com uma conta de influenciador de vínculo
   direto que a aba não fica **estranhamente vazia** para quem *é* influenciador
   (ela fica: a tela dele é o painel de afiliações, não esta caixa).

---

## Para o maestro selar (não editei `leela-specs/`)

- **V1-KANBAN · `S1222-T4`** — entregue em `4b72c556` + `b3e51638`, **revisada e
  corrigida** em `32dd9966` + `8694d59b` + `2cdc5629`. A `S1222` fecha e a
  frente B da fila `11-*.md` está no repo.
- ⛔ **NÃO deployar índices a partir de `4b72c556`.** Ver "É seguro deployar
  isto?". O HEAD precisa conter `32dd9966`.
- **Política de alerta — um log novo** além dos três da BUILD:
  `area_cliente_nomes_falhou` (ERROR, `alerta: true`, sem PII).
- **Contrato novo de arquivo:** `firestoreIndexes.contract.test.ts`. Todo
  `fieldOverride` futuro passa por ele. Vale para **qualquer** lane, não só a
  área do cliente.
- **Painel do dono, abrir:** **R1** (o teto da caixa gasto por convite que ela
  não mostra), **R4** (convite revogado some sem dizer), **R6** (organizador
  pode inserir alguém num clube sem pedir). **CLUBES-1** e **CONVITE-1**
  confirmados.
- **Fila técnica:** R2, R3, R5, R7, R8 + as F1..F7 da REV-AREACLIENTE.
- **Gate da suíte da landing** — o `--testTimeout=30000` continua sendo decisão
  de quem roda. Duas lanes seguidas agora declararam o mesmo teto; vale
  promovê-lo a config.
