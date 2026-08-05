# Handoff · lane REV-EXPURGO · trace `leela-pixreal-diag-20260804` · 2026-08-05

Employee: `sf-qa-engineer` (business `software-forge`), antagonista, contexto fresco.
Repo `C:\dev\LEELA`, base `e0a930a8` (== `origin/main`). Sob review: `4804e5c2`, `a776628a`, `c2d4cbc3`.

---

## 1. Veredito

**APROVADA COM DEFEITO CORRIGIDO.** Um defeito real, severidade média, consertado nesta lane
(`f66808b9`). Os dois índices estão certos e o deploy é seguro. A frase "nada deixou de ser
expurgado" **sobrevive** ao ataque — com uma correção de evidência que não muda a conclusão.

**É seguro deployar os índices: SIM.** Detalhe na seção 5.

---

## 2. Tabela vetor → resultado

| # | Vetor declarado | Resultado |
|---|---|---|
| 1 | `fieldOverride` novo repete o D1 | **SOBREVIVE.** `saude.eventoId` re-lista `COLLECTION ASC` + `COLLECTION DESC` + `COLLECTION_GROUP ASC`, idêntico ao molde de `membros.atletaId` pós-`32dd9966`. Zero query em escopo COLLECTION sobre `saude` no repo inteiro — não há o que quebrar. Nenhum override pré-existente mudou. |
| 2 | `classificarCausaExpurgo` casa regex sobre a mensagem | **SOBREVIVE, degrada honestamente.** Mensagem em outro idioma/formato ⇒ `desconhecida`, que é o caminho de investigação do runbook. O `alerta` — o campo que a política casa — é constante e não depende da regex. |
| 3 | `indiceUrl` sai da mensagem do provedor; PII? `slice(0,500)`? | **DEFEITO ACHADO, mas no campo vizinho.** `indiceUrl` está limpo. Quem vazava era o `err`. Ver D-EXP-1. |
| 4 | Relançar depois de registrar | **ESCOLHA CORRETA.** Mantida. |
| 5 | "Nada deixou de ser expurgado" | **SOBREVIVE.** Nenhum caminho de escrita para `inscritos/{i}/saude` em produção. Uma imprecisão de evidência corrigida abaixo. |
| 6 | Probe `limit(1)` por evento carimbado | **DÍVIDA CONFIRMADA**, não regressão. Dimensionada abaixo. |
| — | Data de início 29/07 | **CONFIRMADA por caminho independente.** |
| — | Diff aditivo, zero colisão | **CONFIRMADO.** `32 0` no numstat. |
| — | Vermelho do contrato com o JSON anterior | **REPRODUZIDO.** `3 failed | 5 passed`, exato. |

---

## 3. Defeito

### D-EXP-1 · média · `err` copiava a mensagem do provedor com PII dentro

Corrigido em **`f66808b9`**.

O módulo prometia em três lugares o que não entregava:

- `incidenteExpurgo.ts`, cabeçalho: "PII NUNCA entra";
- `a776628a`, trailer: `Constraint: PII nunca no log`;
- runbook: "Conteúdo de saúde nunca entra no log."

E o código fazia `err: mensagemDoErro(erro).slice(0, 200)`. **Truncar não é redigir** — `slice(200)`
corta o fim da frase, não o conteúdo dela, e o `err` de um incidente de LGPD é texto de TERCEIRO
copiado inteiro para o Cloud Logging. Erro que cite `atestadoUrl` (o link do atestado médico) ou o
e-mail do participante fazia o incidente vazar exatamente o dado que o expurgo existe para apagar.

**O teste que guardava a promessa não podia falhar.** `nenhum campo de dado de saúde vaza para o
log` montava o payload a partir de `'...atestadoUrl=https://x/atestado.pdf de fulano@x.com'` e então
assertava `Object.keys(p)` — as chaves são constantes NOSSAS, nunca vão se chamar `atestadoUrl` — e
`not.toContain('"email"')`, uma chave JSON que o código nunca emite. Verde por construção.

Prova executada contra o código anterior ao fix:

```
× e-mail na mensagem do provedor NÃO chega ao log
  AssertionError: expected '{"alerta":"expurgo_lgpd_falhou",…}' not to contain
  'ana.souza@exemplo.com.br'
  Received: …"err":"falha ao apagar saude de ana.souza@exemplo.com.br"

× URL de dado (atestado) NÃO chega ao log; o link do índice continua chegando
  Received: …"err":"delete falhou: https://storage.googleapis.com/leela/atestado-ana-souza.pdf"

Tests  2 failed | 10 passed (12)
```

E o teste antigo passava nessa mesma rodada.

**Fix:** `higienizarMensagem` (pura, exportada) roda ANTES do truncamento e some com e-mail e com
qualquer URL http(s). O console do Google é exceção declarada em `URL_CONSOLE` — é o link do índice,
a única coisa acionável da linha, e carrega só projeto mais a definição do índice em base64. A
extração de `indiceUrl` segue lendo a mensagem CRUA; a ordem importa e está comentada. O runbook
ganhou o parágrafo correspondente.

Depois do fix: **12 passed** no arquivo, `tsc` e `eslint` limpos.

---

## 4. Achados sem fix (itens, não bloqueios)

**A-1 · baixa · a evidência de "nenhum writer" está errada por um arquivo.** O handoff BUILD afirma:
"As únicas referências à subcoleção em todo o repositório são as duas leituras do próprio
`expurgarSaude`." Não é verdade. `functions/src/__tests__/saudeRegulamento.integration.test.ts`
**escreve** docs de saúde em quatro pontos (linhas 84, 324, 366 e o `setDoc` de ataque na 223).

A conclusão não muda: o arquivo aponta para `demo-leela-saude` via `initializeTestEnvironment`
(rules-unit-testing = Emulator por construção) e seta `FIRESTORE_EMULATOR_HOST` antes de
`admin.initializeApp`. Verifiquei o grafo de imports — nada nele chama `initializeApp` em escopo de
módulo, e `vitest.config.ts` não usa `isolate: false`, então `admin.apps.length` é 0 e o guard
sempre entra. Mas a frase que vai ao dono precisa ser a verdadeira: **nenhum writer em código de
produção**, não "nenhuma referência no repositório".

**A-2 · baixa · o guard do emulator naquele arquivo é frágil por construção.** O
`process.env['FIRESTORE_EMULATOR_HOST']` está DENTRO do `if (!admin.apps.length)`. No dia em que
alguém importar `../index` (que chama `admin.initializeApp()`) numa cadeia daquele arquivo, o guard
não entra, o env não é setado e o Admin SDK escreve **dado de saúde** no que o ADC resolver. Fora do
território desta lane. Fix de uma linha: mover o `process.env` para fora do `if`. Ele também usa
`host: 'localhost'` na porta 8080 — o `::1` que o maestro proíbe.

**A-3 · baixa · `indiceUrl` é extraído mesmo quando `causa` é `desconhecida`.** Se um erro
qualquer trouxer um link de console, o campo aparece e sugere conserto de índice onde não há. O
runbook manda ler `causa` primeiro, o que fecha o buraco pela ordem — mas é ordem de leitura, não
garantia de código.

**A-4 · dívida confirmada · o probe custa uma query de grupo por evento carimbado, toda madrugada.**
Dimensionando: hoje são 8 eventos em produção, custo desprezível. O gatilho é o encerramento
automático (`encerrarEventos`, 03:10), que empurra eventos para `encerrado` sem teto — a varredura
do expurgo não tem `.limit()` e o probe é por evento. Com centenas de eventos encerrados vencidos,
vira uma query de grupo por evento por noite, indefinidamente, porque o carimbo nunca dispensa o
probe. O runbook já manda escalar quando "o expurgo passar a estourar prazo por volume".

**A-5 · os crons irmãos seguem sem incidente observável.** `recalcularStatusMembros` (03:00),
`coletaDiaria` (03:05) e `encerrarEventos` (03:10). Mesma classe de defeito, declarada pelo
construtor, fora do território. `encerrarEventos` é o mais caro dos três: é ele que produz o
`status='encerrado'` de que o expurgo depende — se ele morrer calado, o expurgo fica verde varrendo
zero e a garantia some de novo, agora sem erro nenhum no log.

---

## 5. É seguro deployar os índices?

**SIM.** Quatro razões, todas verificadas sobre o arquivo:

1. **O diff é puramente aditivo.** `git show --numstat 4804e5c2 -- firestore.indexes.json` ⇒
   `32 0`. Nenhuma linha existente mudou; nenhum índice ou override foi removido.
2. **Zero colisão.** 16 compostos e 8 overrides, nenhum duplicado. O único cruzamento
   override×composto do arquivo é `afiliados.tenantId`, pré-existente e intocado. `eventos` não tem
   override nenhum, logo os índices automáticos de `status` e `data` seguem de pé.
3. **O override novo não pode repetir o D1.** Ele re-lista `COLLECTION ASC` e `DESC`, e a varredura
   do repositório não encontra **nenhuma** query sobre `saude` em escopo COLLECTION para quebrar.
4. **O backfill é grátis.** `eventos` tem 8 documentos em produção e a subcoleção `saude` tem zero.
   Os dois índices ficam `READY` em segundos, não em minutos.

**A única checagem que eu não pude fazer** — porque exige o servidor, e a lane proíbe deploy — é se
existe `fieldOverride` **no servidor** que não está no arquivo. O deploy reverteria. É o cenário
exato contra o qual o runbook avisa (índice criado pelo link do console). O último deploy de índices
foi por volta das 07:0x de hoje e a janela desde então é curta, mas se alguém clicou no link do erro
nesse intervalo, o override manual some. Um `gcloud firestore indexes fields list` antes do deploy
fecha a questão em dez segundos.

**Depois do deploy:** o cron só volta a ficar verde na próxima execução das 03:20. Confirmar com
`firebase functions:log --only expurgarSaude` — `expurgo_saude_diario` com as três contagens.

---

## 6. "Nada deixou de ser expurgado" sobrevive?

**Sobrevive.** Ataquei por seis frentes e nenhuma inverteu a conclusão:

| Frente | O que achei |
|---|---|
| Rules | `firestore.rules:936-941` — `match /saude/{saudeDocId}` com `allow write: if false`. Absoluto, sem exceção de claim, sem brecha de admin. |
| Functions | Varredura por `SAUDE_SUBCOL`, `SAUDE_DOC_ID`, `atestadoUrl`, `parqRespostas`: as únicas referências em `functions/src` fora de teste são as **duas leituras** do `expurgarSaude`. |
| Seeds | Os 20 `*.seed.ts` de `functions/src/seed/` não tocam `saude`. |
| Scripts | `functions/scripts/` (incluindo `prod-seed-leela-hub.ts`, `preview-seed*.ts`, os dois backfills) não tem uma ocorrência de `saude`. |
| Migração/import | Não existe. |
| Testes apontando para prod | Só `saudeRegulamento.integration.test.ts` escreve, e ele é Emulator por construção (ver A-1/A-2). |

A conclusão continua **inferida de código e Rules, não lida do banco** — o construtor já declarou
isso e eu confirmo. Se o dono quiser o número em vez do argumento, `collectionGroup('saude').count()`
no console fecha, e vai precisar do override novo para rodar.

**A frase correta para o relatório do dono:** entre 29/07 e 05/08 nenhum documento de saúde deixou
de ser expurgado, porque nenhum jamais foi gravado em produção — não existe superfície de escrita,
nem de cliente (Rules negam) nem de servidor (a Function de coleta E12-S1207/E13 não foi
construída). A falha custou a garantia, não o dado.

---

## 7. A data de 29/07, por caminho independente

Não me apoiei na cadeia do construtor. Refiz:

| Evidência | Fonte |
|---|---|
| `expurgarSaude` nasce 2026-07-17 16:56 e nunca foi tocado | `git log --follow` do arquivo: duas linhas só, `800f0d62` e o `a776628a` de hoje |
| Exportado desde o mesmo commit | `git log -S "expurgarSaude" -- functions/src/index.ts` devolve **só** `800f0d62` |
| Não havia produção antes de 28/07 | Firestore `(default)` foi CRIADO em 28/07 (a API estava desligada) — handoff DEPLOY-PREVIEW |
| O deploy de functions de 28/07 terminou **depois das 20:51** | O fix de bundle que destravou a subida é `792f58f9`, carimbado `2026-07-28 20:51`; o deploy 86/86 veio depois dele |
| Logo a primeira execução possível do agendamento das 03:20 é **29/07** | O job de Cloud Scheduler nasce no deploy; 20:51 já passou das 03:20 do dia 28 |
| A execução observada bate com o agendamento | `2026-08-05T06:20:07.579486Z` = 03:20 -03, não é disparo manual |

De 29/07 a 05/08, inclusive, são **8 execuções**. A conta fecha.

**Ressalva honesta que o dono precisa ouvir:** existe **uma única linha de log observada**, a de
05/08. As outras sete são inferência — mas inferência forte, porque o composto nunca esteve no
arquivo e a lane DEPLOY-FINAL provou que o servidor tinha exatamente os 15 do arquivo. Sem o índice,
toda execução falha no planejamento da query, antes de olhar documento. Não é "provavelmente
falhou": é "não havia como passar".

---

## 8. Gates

```
$ npm run type-check   (functions)   → exit 0, zero saída
$ npm run lint         (functions)   → exit 0, zero saída
```

Emulator próprio, portas livres reservadas e IPv4 explícito
(`firebase.revexpurgo.json`, untracked: firestore 8677, hub 4677, logging 4777, auth 9677),
JDK 21.0.11+10:

```
$ npx firebase-tools@13 emulators:exec --project demo-leela --config ../firebase.revexpurgo.json \
    "npx vitest run src/__tests__/expurgoIncidente.test.ts src/__tests__/firestoreIndexes.contract.test.ts"
 ✓ src/__tests__/firestoreIndexes.contract.test.ts (8 tests) 307ms
 ✓ src/__tests__/expurgoIncidente.test.ts (12 tests) 329ms
 Test Files  2 passed (2)
      Tests  20 passed (20)
+  Script exited successfully (code 0)
```

Suíte completa de functions **não** foi rodada. Nada foi deployado. `apps/**`, `packages/core` e
`firestore.rules` intocados. Commit com `--only`, sem `--amend`.

### Reprodução do vermelho, como pedido

Restaurei `firestore.indexes.json` de `4804e5c2^` e rodei o contrato:

```
× o composto eventos(status ASC, data ASC) está declarado
× a busca dos docs de saúde é por collectionGroup e o override existe
× o override de saude.eventoId não apaga o escopo COLLECTION (regra D1)
Tests  3 failed | 5 passed (8)
```

Exatamente o que o construtor afirmou. Arquivo restaurado em seguida e conferido por hash:
`git hash-object` == `git rev-parse HEAD:firestore.indexes.json` == `b06d27af…`.

---

## 9. Itens do dono

1. **Deployar os índices** — liberado por esta review. Opcionalmente conferir antes se há
   `fieldOverride` no servidor fora do arquivo (§5).
2. **Confirmar o cron verde na madrugada seguinte ao deploy**, e só então considerar a obrigação de
   LGPD restaurada.
3. **`git push`** — `origin/main` segue atrás; agora com os quatro commits desta frente.
4. **A-2**: mover o `process.env['FIRESTORE_EMULATOR_HOST']` para fora do `if` em
   `saudeRegulamento.integration.test.ts`. É o único arquivo do repo que escreve dado de saúde.
5. **A-5**: decidir se a doutrina de incidente observável vale para `encerrarEventos`,
   `recalcularStatusMembros` e `coletaDiaria`. O primeiro alimenta o expurgo.
6. **Política de alerta** (`jsonPayload.alerta="expurgo_lgpd_falhou"`) — custo de infra, CTO humano.

---

## 10. Commits desta lane

| Hash | O quê |
|---|---|
| `f66808b9` | `fix(lgpd)`: higieniza a mensagem do provedor antes do log; dois testes que teriam pego o vazamento; runbook corrigido |
