# Handoff · lane BUILD-EXPURGO · trace `leela-pixreal-diag-20260804` · 2026-08-05

Employee: `sf-backend-engineer` (business `software-forge`). Repo `C:\dev\LEELA`, base `c03f6f1c` (== `origin/main` no início). Lane ⚔.

---

## 1. A resposta que o dono precisa

### Desde quando falha

**Desde a primeira madrugada em que o cron existiu em produção: 29/07/2026.** Oito execuções seguidas, todas com o mesmo erro.

A cadeia de datas:

| Quando | O quê |
|---|---|
| 2026-07-17 16:56 -03 | `expurgarSaude` nasce no commit `800f0d62`. `git log --follow` do arquivo tem **uma linha só** — nunca foi tocado depois. |
| 2026-07-28 | Primeira subida de functions para `leela-hub` (handoff DEPLOY-PREVIEW: **86/86 ACTIVE**, e o Firestore `(default)` foi criado nesse mesmo dia — antes disso não havia produção). |
| 2026-07-29 03:20 -03 | Primeira execução possível do cron. |
| 2026-08-05 06:20:07Z | A linha `E` que a lane DEPLOY-FINAL capturou — a mais recente da série, não a primeira. |

O cron roda `every day 03:20` em `America/Sao_Paulo`, que é 06:20 UTC. O carimbo de produção bate com o horário do agendamento, o que confirma que é a execução agendada e não um disparo manual.

O deploy de índices da madrugada de 05/08 **não** causou nada disto: o erro é anterior a ele (06:20 vs ~07:0x) e a lane DEPLOY-FINAL provou que aquele deploy não removeu composto nenhum (15 no servidor, 15 no arquivo, diferença vazia nos dois sentidos).

### O que deixou de ser expurgado

**Nada. Zero documentos.** E não por acerto do sistema.

A subcoleção `eventos/{e}/inscritos/{i}/saude/{current}` **nunca recebeu um documento em produção**, porque não existe superfície de escrita:

- **Rules:** `firestore.rules:936-941` — `match /saude/{saudeDocId}` tem `allow write: if false`. Escrita de cliente é negada de forma absoluta, sem exceção nem brecha de admin claim.
- **Código:** varredura em `functions/`, `apps/` e `packages/` por `SAUDE_SUBCOL`, `'saude'`, `atestadoUrl` e `parqRespostas` não encontra **nenhum writer**. As únicas referências à subcoleção em todo o repositório são as duas leituras do próprio `expurgarSaude`.
- **Produto:** a coleta de dado pleno de saúde (atestado/PAR-Q, flags `exigenciasSaude`) é declarada superfície FUTURA em `apps/landing/.../AceitesCompra.tsx:12` ("PAR-Q/atestado das flags de exigenciasSaude são superfície FUTURA — D-7"), e a Function que faria a coleta é de E12-S1207/E13, ainda não construída. O que o checkout coleta hoje é o **aceite** do termo de saúde (`pedidos/{id}.aceites.saude`), que é declaração de aptidão, não dado sensível do Art. 11.

Ou seja: **a exposição de LGPD hoje é zero, e o que a falha custou foi a garantia, não o dado.** O buraco é de tempo: no dia em que a coleta entrar no ar, um expurgo quebrado passa a reter dado sensível indefinidamente, calado. Essa é a parte que esta lane fecha.

**Item para o dono:** antes de ligar `exigenciasSaude` em qualquer evento, confirmar que o cron está verde. Está escrito no runbook.

Não houve caminho manual cobrindo o buraco, e não precisou haver: não há `saudeExpurgadaEm` carimbado em evento nenhum porque não há dado a expurgar. Nenhum script de expurgo manual existe no repo (`functions/scripts/` não tem nada do gênero).

---

## 2. A causa confirmada

Era o índice ausente, como o maestro supôs — **e havia um segundo, que a suposição não alcançava.**

### Causa 1 (a que estourava)

`functions/src/eventos/expurgarSaude.ts:55-57`:

```ts
.collection('eventos')
.where('status', '==', 'encerrado')
.where('data', '<', corte)
```

Igualdade em `status` mais desigualdade em `data` exige composto `eventos(status ASC, data ASC)`, escopo `COLLECTION`. O `create_composite` do erro decodifica exatamente para `collectionGroups/eventos/indexes/_ status data __name__`. O arquivo tinha um único composto de `eventos`, e era `tenantId, organizadorId, data`.

### Causa 2 (a que apareceria em seguida)

Linhas 70 e 77 do mesmo arquivo:

```ts
.collectionGroup(SAUDE_SUBCOL).where('eventoId', '==', evento.id)
```

Query de **collection group** com igualdade. O índice automático de campo único do Firestore é de escopo `COLLECTION` — collection group não é coberto por ele e exige `fieldOverride` explícito com `queryScope: COLLECTION_GROUP`. Não havia entrada nenhuma de `saude` no arquivo.

O próprio cabeçalho do arquivo já sabia disso desde 17/07, como comentário e não como conserto:

> `⚠️ PENDÊNCIA OPERACIONAL (deploy): collectionGroup com filtro de igualdade exige habilitar o índice de collection group do campo eventoId no console/firestore.indexes.json — o Emulator não exige.`

O precedente no próprio repo é a lane B4: `afiliados.responsavelUid`, `afiliados.tenantId`, `membros.atletaId`, `convites.email` e `afiliados.responsavelEmail` existem como override justamente porque as queries de grupo delas exigiram.

**Se eu tivesse consertado só o composto, o cron teria trocado de linha de erro, não de estado.** A primeira query passaria e a segunda estouraria no primeiro evento vencido — com o agravante de que aí a falha aconteceria depois de o carimbo `saudeExpurgadaEm` já ter sido escrito em zero eventos, indistinguível de sucesso para quem só olha contagem.

### Conferência de colisão (declarada, como pedido)

Rodei a checagem sobre o arquivo final:

```
compostos: 16 | duplicados: []
overrides: 8  | duplicados: []
overrides: lotes.fimEm, afiliados.responsavelUid, inscritos.pessoaRef, afiliados.tenantId,
           membros.atletaId, afiliados.responsavelEmail, saude.eventoId, convites.email
override que também aparece em composto: ['afiliados.tenantId']  ← PRÉ-EXISTENTE, não meu
```

- O composto `eventos(status, data)` **não colide** com `eventos(tenantId, organizadorId, data)` — conjuntos de campos diferentes são índices distintos — e **não há nenhum `fieldOverride` sobre `eventos`**, logo os índices automáticos de `status` e de `data` seguem intactos. A adição é puramente aditiva.
- O override `saude.eventoId` **não colide com nada**: não havia entrada de `saude` no arquivo, nem em `indexes` nem em `fieldOverrides`.
- O único cruzamento override×composto do arquivo é `afiliados.tenantId`, que já existia antes de mim e não foi tocado.
- `git diff --stat` do arquivo: **32 inserções, 0 remoções.** Nenhuma linha existente mudou.

### Regra D1 respeitada

O override novo re-lista `COLLECTION ASC` e `COLLECTION DESC` além do `COLLECTION_GROUP ASC`, exatamente como `membros.atletaId` depois do fix `32dd9966`. Não entrei em `SEM_ESCOPO_DE_COLECAO`: a varredura por `.collection('saude')` volta vazia hoje, mas a coleta futura (E12-S1207) vai ler `inscritos/{i}/saude` em escopo de coleção, e o custo de manter é um índice sobre um doc por inscrito. Escolhi o lado que não repete o D1 — com o agravante de que, se repetisse, ninguém estaria olhando, porque não há query hoje para ficar vermelha.

---

## 3. A falha silenciosa, fechada

Doutrina espelhada de `email/incidenteEmail.ts`, sem inventar formato novo. Toda falha do expurgo passa a gravar:

| Campo | Valor |
|---|---|
| `alerta` | `expurgo_lgpd_falhou` |
| `severidade` | `critico` |
| `canal` | `retencao` |
| `tipo` | `saude` |
| `causa` | `indice_ausente` \| `desconhecida` |
| `indiceUrl` | link de criação do índice, quando o erro traz um (campo próprio, inteiro) |
| `err` | mensagem truncada em 200 |

Nome do evento no log: `expurgo_saude_falhou`. Política casa o **campo**, não a mensagem — igual ao e-mail.

Três decisões que valem explicação:

1. **`causa` classificada.** As duas saídas do runbook são opostas: `indice_ausente` é conserto de arquivo e prova que **nada foi apagado** naquela execução (a query nem rodou); qualquer outra causa é investigação e o expurgo pode ter parado no meio. Classificar exige o par `FAILED_PRECONDITION` + "requires an index", porque o Firestore usa o mesmo código gRPC 9 para pré-condição de transação — código sozinho mandaria o plantão consertar o arquivo errado.
2. **`indiceUrl` em campo próprio.** O `err` trunca em 200 e a URL do `create_composite` passa de 300. Truncá-la junto do erro destruiria a única coisa acionável da linha. Testado com o erro real de produção.
3. **Relança depois de registrar.** Engolir deixaria a execução VERDE no Cloud Scheduler — trocaria falha silenciosa por falha invisível, que é pior. O `executarExpurgoSaude` existe separado do `onRun` porque o wrapper de pubsub v1 não é chamável sem `firebase-functions-test`, e o caminho de erro é justamente o que precisa de prova.

**O gancho está desligado, de propósito.** Não criei métrica, canal nem destino de plantão: custo de infra recorrente é decisão do CTO humano, mesma fronteira do runbook de e-mail. Filtro pronto: `jsonPayload.alerta="expurgo_lgpd_falhou"`.

---

## 4. Arquivos

| Arquivo | O quê |
|---|---|
| `firestore.indexes.json` | +composto `eventos(status ASC, data ASC)`; +override `saude.eventoId` (COLLECTION ASC/DESC + COLLECTION_GROUP ASC). 32 inserções, 0 remoções. |
| `functions/src/eventos/incidenteExpurgo.ts` | **novo** — formato do incidente, classificação de causa, extração do link. Tudo puro. |
| `functions/src/eventos/expurgarSaude.ts` | +`executarExpurgoSaude` (registra e relança); cron passa a chamá-lo; cabeçalho corrigido (a "pendência operacional" virou índice declarado). Núcleo intocado. |
| `functions/src/__tests__/expurgoIncidente.test.ts` | **novo** — 10 testes. |
| `functions/src/__tests__/firestoreIndexes.contract.test.ts` | +4 testes (3 do expurgo, 1 de composto duplicado) + helpers de leitura de compostos. |
| `leela-specs/04-engenharia/runbook-expurgo-lgpd.md` | **novo** — runbook. |
| `leela-specs/04-engenharia/onboarding-externo.md` | 1 frase: dizia "não existe runbook" com dois runbooks ao lado. |

`firebase.expurgo.json` ficou **fora do commit** (untracked), seguindo o que B4/REV-B4/RF2-1 fizeram — scaffolding de lane não entra na árvore.

---

## 5. Gates

```
$ npm run type-check          (functions)
> tsc --noEmit
[zero saída, exit 0]

$ npm run lint                (functions)
> eslint src --max-warnings 0
[zero saída, exit 0]

$ npm run build               (functions)
> tsc
[zero saída, exit 0]

$ npx prettier --check firestore.indexes.json
Checking formatting...
All matched files use Prettier code style!
```

Testes, arquivo a arquivo, emulator próprio (`firebase.expurgo.json` — firestore 8797, hub 4497, logging 4597, auth 9797, todos `127.0.0.1` explícito, todos verificados livres antes), JDK 21:

```
$ java -version
openjdk version "21.0.11" 2026-04-21 LTS

$ npx firebase-tools@13 emulators:exec --project demo-leela --config ../firebase.expurgo.json \
    "npx vitest run src/__tests__/expurgoIncidente.test.ts"
 ✓ src/__tests__/expurgoIncidente.test.ts (10 tests) 324ms
 Test Files  1 passed (1)
      Tests  10 passed (10)
+  Script exited successfully (code 0)

$ npx firebase-tools@13 emulators:exec --project demo-leela --config ../firebase.expurgo.json \
    "npx vitest run src/__tests__/firestoreIndexes.contract.test.ts"
 ✓ src/__tests__/firestoreIndexes.contract.test.ts (8 tests) 318ms
 Test Files  1 passed (1)
      Tests  8 passed (8)
+  Script exited successfully (code 0)
```

Suíte completa de functions **não** foi rodada, conforme instrução.

### O teste falharia hoje — provado, não afirmado

Troquei `firestore.indexes.json` pela versão de `HEAD` e rodei o contrato:

```
✓ a query de varredura continua sendo eventos(status ==, data <)
× o composto eventos(status ASC, data ASC) está declarado
  → expected [ …(15) ] to include 'eventos|COLLECTION|status:ASCENDING,data:ASCENDING'
× a busca dos docs de saúde é por collectionGroup e o override existe
  → override `saude.eventoId` ausente
× o override de saude.eventoId não apaga o escopo COLLECTION (regra D1)

Tests  3 failed | 5 passed (8)
```

Arquivo restaurado em seguida (`git diff --stat` de volta a 32 inserções).

---

## 6. O que NÃO está provado

1. **O índice no servidor.** O Emulator não cobra índice nenhum — nenhum teste de execução deste repositório é capaz de acusar índice faltante, e é exatamente por isso que o defeito viveu 8 dias. O contrato prova o **ARQUIVO**; só `firebase deploy --only firestore:indexes` seguido de estado `READY` prova o servidor. **Enquanto o deploy não sair, o cron continua falhando toda madrugada.**
2. **A query real contra índice real.** `expurgoIncidente.test.ts` usa um `db` de mentira que estoura — prova o caminho de erro e o formato do incidente, não a query. Não existe teste do caminho feliz do `expurgarSaudeCore` neste repo (não existia antes de mim e não criei um: exigiria seed de evento encerrado vencido + docs de saúde, e a lane pedia o mínimo).
3. **A ausência de dado de saúde em produção.** É inferida do código e das Rules (nenhum writer + `allow write: if false`), não de uma leitura do banco de produção. Não consultei produção: a lane proíbe deploy e eu não abri credencial. Se o dono quiser o número em vez do argumento, um `collectionGroup('saude').count()` no console fecha a questão — e vai precisar do override novo para rodar.
4. **O `onRun` do cron.** Testei `executarExpurgoSaude`, não o wrapper de pubsub. A ligação entre os dois é uma linha, verificável a olho, e não é coberta por teste.
5. **Os crons irmãos.** `recalcularStatusMembros` (03:00) e `coletaDiaria` (03:05) seguem **sem** incidente observável. Não os toquei — fora do território da lane. É a mesma classe de defeito esperando.

---

## 7. Vetores para a review antagonista ⚔

1. **O `fieldOverride` novo é o vetor número um.** Foi override que quase derrubou a plataforma na B4. Confira que `saude.eventoId` re-lista `COLLECTION ASC` **e** `DESC`, e que nenhum override pré-existente mudou. Meu argumento é que `git diff` mostra 0 remoções, mas a auditoria é sua.
2. **Ataque a classificação de causa.** `classificarCausaExpurgo` casa regex sobre mensagem de erro — exatamente o acoplamento que o runbook de e-mail proíbe para políticas de alerta. Defesa: o `alerta` (o que a política casa) é constante e independe da regex; a `causa` é conveniência de triagem e degrada para `desconhecida`, que é o comportamento seguro. Mas se a mensagem do SDK mudar, a triagem piora em silêncio, e não há teste contra o SDK real.
3. **`indiceUrl` sai de dentro da mensagem do provedor.** É a única coisa no payload que não é constante nossa. Verifique que não há como PII entrar por ali (a URL do Firestore é projeto + índice codificado em base64 do path — sem dado de usuário), e que o `slice(0,500)` não deixa passar coisa demais.
4. **Relançar é decisão discutível.** Alguém pode argumentar que a execução deveria terminar limpa para não poluir métrica de erro do GCF. Discordo: verde mentiroso é o defeito original desta rodada inteira. Mas é escolha, não fato.
5. **A afirmação "nada deixou de ser expurgado" é a mais cara do handoff.** Ela sustenta que não há incidente de LGPD a reportar. É baseada em varredura estática, não em leitura do banco. Se você achar **qualquer** caminho de escrita para `inscritos/{i}/saude` — script, seed, migração, Rules com claim especial, import — a conclusão inverte e vira caso de notificação.
6. **Escopo do `expurgarSaudeCore`.** Não o toquei, mas ele tem um comportamento que ninguém revisou nesta lane: o `probe` de `limit(1)` em evento já carimbado roda **uma query de grupo por evento carimbado, toda madrugada**. Com muitos eventos encerrados isso vira custo e prazo. Não é regressão minha; é dívida que a primeira execução verde vai revelar.
7. **Crons irmãos sem alarme** (item 5 da seção anterior) — se a doutrina vale para expurgo, por que não para os outros dois? Resposta honesta: território da lane. Vale virar item.

---

## 8. Restrições respeitadas

Não deployei nada (nem índices, nem functions). Não toquei `apps/**`, `packages/core`, nem `firestore.rules`. Não rodei a suíte completa. Não consultei nem alterei dado de produção. Commit com `--only`.

## 9. Itens do dono

1. **Deployar índices** — sem isso o cron continua falhando toda madrugada. Sequenciar com a review desta lane, como o maestro definiu.
2. **`git push`** — o item D-A do DEPLOY-FINAL segue de pé para os commits anteriores; este handoff acrescenta os desta lane.
3. **Antes de ligar `exigenciasSaude`** em qualquer evento, confirmar o cron verde.
4. **Política de alerta** (`jsonPayload.alerta="expurgo_lgpd_falhou"`) — custo de infra, decisão do CTO humano, junto com a de e-mail.
