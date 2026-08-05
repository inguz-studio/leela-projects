# DIAG-CLUBES — a rota de clubes não carregava os clubes

**Lane:** DIAG-CLUBES · **Trace:** `leela-pixreal-diag-20260804` · **Employee:** sf-backend-lead
**Data:** 2026-08-05 · **Repo:** `C:\dev\LEELA` (branch `main`)

---

## 1. Causa-raiz (provada, não inferida)

**Falta o índice composto `clubes: tenantId ASC, criadoEm DESC`.** A consulta do painel
(`packages/api-client/src/clubs.ts:73-86`, `listClubesByTenant`) combina
`where('tenantId','==',X)` com `orderBy('criadoEm','desc')`, e esse par nunca existiu nem no
`firestore.indexes.json` nem no servidor.

### Correção do diagnóstico de entrada

O brief dizia que a consulta devolvia **"0 docs, e SEM erro"**. **Não é o que acontece.** Rodando a
mesma consulta contra `leela-hub` com credencial de owner:

```
### C. where + orderBy (a consulta do painel)
  http 400 | docs: 0
  ERR: [{"error":{"code":400,
        "message":"The query requires an index. You can create it here: ...",
        "status":"FAILED_PRECONDITION"}}]
```

O Firestore **grita**. O silêncio era do instrumento de medição: em erro, o `runQuery` devolve um
array `[{"error":{…}}]`, e contar elementos com `.document` dá zero sem nunca olhar o campo `error`.
Isso muda o alvo da investigação: **não existe caminho silencioso no Firestore**, nem por REST vs SDK,
nem por escopo COLLECTION vs COLLECTION_GROUP. Quem engole a rejeição é a camada de cima.

### Hipóteses do brief, todas testadas e DESCARTADAS

Li os três documentos campo a campo em produção:

| doc | `tenantId` (valor exato) | `criadoEm` (tipo) |
|---|---|---|
| `corrida-perfeita-sul` | `"corrida-perfeita"` | `timestampValue` |
| `floripa-run-coletivo` | `"castelo-producoes"` | `timestampValue` |
| `ritmo-forte-assessoria` | `"castelo-producoes"` | `timestampValue` |

- **Tipo divergente em `criadoEm`** — descartado: os três são `timestampValue`, nenhum ausente.
- **`tenantId` com espaço/caixa diferente** — descartado: valores exatos, sem padding.
- **`fieldOverride` desabilitando índice de campo único em `clubes`** — descartado: a API de fields
  com `filter=indexConfig.usesAncestorConfig:false` devolve `{}` para `clubes` (zero overrides).
- **Regra de segurança** — descartado como no brief se supunha: o sintoma seria `permission-denied`,
  e a query falha antes disso, no planejamento, com `FAILED_PRECONDITION`.
- **Índice ausente devolvendo vazio em vez de erro** — descartado: erra sempre, em toda variação.

### Evidência final: o próprio Firestore dita o índice

Decodificando o token `create_composite=` da mensagem de erro:

```
clubes   ->  tenantId:ASCENDING , criadoEm:DESCENDING , __name__:DESCENDING
tenants  ->  status:ASCENDING   , criadoEm:DESCENDING , __name__:DESCENDING
```

Foi exatamente isso que declarei (`__name__` é implícito no `firestore.indexes.json`).

---

## 2. Segundo defeito, da mesma classe, ainda não reportado

`packages/api-client/src/platform/tenants.ts:46-63` — `listTenants({ status })` monta
`where('status','==',X) + orderBy('criadoEm','desc')` sobre `tenants`. Confirmado em produção:
**HTTP 400 FAILED_PRECONDITION**.

O que o torna traiçoeiro: o filtro é **opcional**. Sem `status` a query ordena por um campo só
(índice automático) e funciona; com `status` ela quebra. A variante que funciona esconde a que não
funciona. Atinge a tela de lista de tenants do platform_admin (S1601-T3).

---

## 3. O que foi corrigido

`firestore.indexes.json` — **dois índices compostos acrescentados**, nada mais:

```json
{ "collectionGroup": "clubes",  "queryScope": "COLLECTION",
  "fields": [ {"fieldPath":"tenantId","order":"ASCENDING"},
              {"fieldPath":"criadoEm","order":"DESCENDING"} ] }

{ "collectionGroup": "tenants", "queryScope": "COLLECTION",
  "fields": [ {"fieldPath":"status","order":"ASCENDING"},
              {"fieldPath":"criadoEm","order":"DESCENDING"} ] }
```

`fieldOverrides` **não foi tocado** (segue com os mesmos 8) — a REV-B4 já provou que override não é
aditivo e que um COLLECTION_GROUP apaga o escopo COLLECTION do campo (defeito D1).

Comentário de acoplamento nos dois sites (`clubs.ts`, `tenants.ts`): quem mexer na query vê, ali
mesmo, que existe um índice preso a ela e que o emulador não vai avisar.

### ⛔ Pendente de você: o deploy

Índice declarado **não é** índice ativo. A rota de clubes só volta depois de:

```
firebase deploy --only firestore:indexes
```

Não deployei nada, como combinado. Nenhuma escrita em produção nesta lane — só leitura.

---

## 4. Guarda contra reincidência

`packages/api-client/scripts/auditar-indices-firestore.mjs`, ligado em
`packages/api-client/package.json` como `"test"` (entra no `turbo run test` sozinho).

Lê o AST de `packages/api-client/src`, reconstrói cada query do SDK cliente — inclusive as montadas
com `const constraints: QueryConstraint[]` mais `push`/`unshift`/`splice` — decide quais exigem
índice composto e confere contra `firestore.indexes.json`. Sem rede, sem emulador, sem dependência
nova (usa o `typescript` que o pacote já declara).

**Constraint condicional vira variante.** Foi o que pegou o `listTenants`: a auditoria enumera os
subconjuntos de filtros opcionais e cobra índice para cada um, em vez de só para o caminho feliz.

**Validado pelo defeito real**, não só pelo verde: removendo os dois índices novos, ele acusa

```
· packages/api-client/src/clubs.ts:84
    precisa de: [clubes] tenantId:ASC , criadoEm:DESC
· packages/api-client/src/platform/tenants.ts:62
    precisa de: [tenants] status:ASC , criadoEm:DESC
```

e sai com código 1. Com os índices, passa. Site que ele não consegue resolver estaticamente vira
erro `INDETERMINADO` — nunca silêncio, que é a doença que estamos tratando.

A regra de exigência foi calibrada contra o comportamento REAL do Firestore (44 sondagens REST),
não contra a documentação. Duas surpresas que a doc não entrega e a sondagem sim: `in` se comporta
como igualdade para índice, e **igualdade + `array-contains` é servido por merge de índices de campo
único, sem composto** (`itensKit: eventoId== + kits array-contains` roda sem índice nenhum).

### O que a guarda NÃO prova (está escrito no cabeçalho do próprio script)

1. **Não prova que o índice está deployado** — confere o arquivo, não o servidor. É a lacuna que
   sobra, e ela é humana.
2. Não cobre `functions/` (Admin SDK, encadeamento `.where().orderBy()`).
3. Não valida `fieldOverrides`.
4. Não prova que a query devolve o dado certo — só que ela é planejável.
5. Não enxerga query montada por string ou reflexão.

---

## 5. Varredura de consultas irmãs

Método: extração por AST de todos os sites de query + **sondagem de cada forma contra o Firestore de
produção**. Controle de sensibilidade: uma query `where+orderBy` numa coleção **inexistente** também
devolve 400 — ou seja, a checagem é do **plano**, não dos dados, e um `docs=0` num "ok" não é falso
negativo por coleção vazia.

### `packages/api-client` — 2 quebradas, ambas corrigidas

| arquivo:linha | consulta | índice | prod |
|---|---|---|---|
| `src/clubs.ts:84` | `clubes` tenantId== + orderBy criadoEm desc | **faltava → declarado** | 400 |
| `src/platform/tenants.ts:62` | `tenants` status== + orderBy criadoEm desc | **faltava → declarado** | 400 |
| `src/clubs.ts:103` | `clubes` tenantId== + ownerId== | não precisa (merge) | ok |
| `src/clubs.ts:137` | `membros` status/papel + orderBy atletaNome | existe (3 combos) | ok |
| `src/eventos/queries.ts:108` | `eventos` tenantId==+organizadorId==+orderBy data | existe | ok |
| `src/pedidos.ts:75` | `pedidos` tenantId==+eventoId==+orderBy criadoEm | existe | ok |
| `src/pedidos.ts:114` | `pedidos` 2 igualdades + array-contains | existe | ok |
| `src/public/getPublicPerfil.ts:86` | `clubes` tenantId== + visibilidade in | não precisa | ok |
| `src/public/getPublicPerfil.ts:122` | `eventos` tenantId== + status in | não precisa | ok |
| `src/eventos/kits.ts:134` | `itensKit` tenantId== + eventoId== | não precisa | ok |
| `src/crm.ts:103,125` · `src/eventos/inscritos.ts:83,112,143` · `clubs.ts:235,395,480` · `assessorias.ts:216` · `brands.ts:85` · `finance.ts:453` · `platform/convites.ts:53` · `platform/planosCobranca.ts:41` · `eventos/{equipe,lotes,reembolsos,aprovisionamento,comunicacoes,campanhas}` | orderBy de campo único, ou só igualdade | não precisa | ok |

### `functions/` — nenhuma pendência

Só 5 sites com `orderBy` no total; todos sondados, todos ok.

| arquivo:linha | consulta | índice | prod |
|---|---|---|---|
| `cliente/meusClubes.ts:257` | CG `membros` atletaId== + orderBy `__name__` | fieldOverride CG existe | ok |
| `cliente/meusClubes.ts:328` | CG `afiliados` responsavelEmail== + `__name__` | fieldOverride CG existe | ok |
| `cliente/meusClubes.ts:403` | CG `convites` email== + `__name__` | fieldOverride CG existe | ok |
| `affiliation/readers.ts:105,133` | subcoleção, orderBy de campo único | não precisa | ok |
| `shared/comunicacaoEnvio.ts:86` | `comunicados`/`campanhas` status==+canal[]+enviadoEm>= | existe | ok |
| `eventos/expurgarSaude.ts:70` | `eventos` status== + data< | existe | ok |
| `checkout/expirarCarrinhosAbandonados.ts:78` | `carrinhos` status== + expiraEmMillis<= | existe | ok |
| `eventos/dispatchCampanhasAgendadas.ts:134` | CG `campanhas` status== + agendadoPara<= | existe | ok |
| `eventos/virarLote.ts:311` | CG `lotes` fimEm<= | fieldOverride CG existe | ok |
| `eventos/automacoesTriggers.ts:308` | CG `automacoes` ativa== + gatilho in | existe | ok |
| `eventos/itemKitIndex.ts:82` | `itensKit` eventoId== + kits array-contains | não precisa (merge) | ok |
| `overview/aggregateProfessionalDashboard.ts:154-160` | `inscritos` range só em criadoEm | não precisa | ok |
| `cliente/{gateAreaCliente:122, leituraArea:112}` · `checkout/prefillCheckout:98` | igualdade única em coleção | não precisa | ok |

⚠️ Nota de método: quatro desses eu **cheguei a marcar como quebrados** numa primeira passada, porque
sondei em escopo COLLECTION_GROUP o que o código faz em escopo COLLECTION. Reli o código, refiz a
sondagem no escopo certo, e os quatro passaram. Registro porque a lição vale para a próxima
varredura: **a sondagem tem de espelhar o escopo do código, ou ela inventa defeito.**

---

## 6. Decisões que ficam com você

1. **Deploy dos índices** (`firebase deploy --only firestore:indexes`). A rota de clubes continua
   vazia até lá. Construção de índice em coleção com 3 documentos é praticamente instantânea.
2. **Nenhum reparo de dado é necessário** — os três documentos de `clubes` estão íntegros. Não há o
   que decidir aqui, e não toquei em nada.
3. **O painel engole a rejeição.** O Firestore devolve erro alto e claro; a tela mostra lista vazia.
   Isso é tratamento de erro em `apps/painel`, território da lane `FIX-PARSE-MILHAR-RET` — **não
   toquei**. Enquanto ficar assim, o próximo índice faltante vai se apresentar de novo como "tela
   vazia" em vez de "erro", que é o que custou esta investigação.
4. **`functions/` não tem guarda equivalente.** Hoje está limpo (verificado contra produção), mas
   nada impede a próxima query de nascer sem índice. Se quiser, estendo a auditoria para o
   encadeamento do Admin SDK numa próxima lane.

---

## 7. Gates

```
tsc --noEmit           (@leela/api-client)  EXIT=0
eslint src --max-warnings 0                 EXIT=0
test (auditar-indices-firestore.mjs)        EXIT=0
   39 variantes de query analisadas · 18 índices compostos declarados
   validação negativa: sem os 2 índices → EXIT=1 apontando os 2 sites certos
prettier --check (arquivo novo)             ok
```

Prettier segue falhando em todo o repo por config (`singleQuote: false` contra um código todo em
aspas simples) — pré-existente, não mexi.

Produção: **somente leitura**. Nenhuma escrita, nenhum deploy.
