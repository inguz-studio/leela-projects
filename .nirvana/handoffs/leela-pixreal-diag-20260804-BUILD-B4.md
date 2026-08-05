---
trace: leela-pixreal-diag-20260804
lane: BUILD-B4
employee: sf-frontend-lead (software-forge)
territorio: apps/landing/**/minha-conta/** · functions/src/cliente/** · packages/api-client
continua: leela-pixreal-diag-20260804-BUILD-AREACLIENTE-2.md
---

# BUILD-B4 — Meus Clubes e a caixa de convites (`S1222-T4`)

Fila canônica: `leela-specs/02-rodadas/2026-08-02-retomada/11-fila-contas-e-area-cliente.md`
(frente **B**, linha `B4`). É a última das cinco; as outras quatro estão entregues
(`9acb8fb5 3acfe7a8 cdef2987 bdebe384`) e revisadas (`46a5eb8a 40f094b1 a1486abe`).

---

## Parte 1 · A DESCOBERTA (feita ANTES de codar, por ordem do brief)

A lane anterior parou aqui porque a B4 lê de **duas máquinas de convite
distintas** e de um vínculo de clube que ninguém tinha mapeado. Segue o mapa,
com caminho de arquivo e linha, para que a review não precise refazê-lo.

### 1.1 · Onde mora o vínculo de MEMBRO DE CLUBE

| Fato | Evidência |
|---|---|
| Documento | `clubes/{clubeId}/membros/{membroId}` — `packages/core/src/clubs/membro.ts` |
| Chave do vínculo | campo **`atletaId`** (o uid da conta; `atletas/{uid}` é a identidade global por ADR-009). **O docId NÃO é o uid** — `membrosMutations.ts:127` usa um `membroId` próprio, e o seed (`membros.seed.ts:170`) grava `id`/`atletaId` como campos separados |
| Campos úteis | `atletaNome`, `papel` (`owner\|admin\|membro`), `entrouEm`, `entrouVia`, `status` (`ativo\|novo\|inativo`, DERIVADO por Function — RN-102), `tenantId` |
| Rule vigente | `firestore.rules` (bloco `match /clubes/{clubeId}/membros/{membroId}`): `allow read: if isPlatformAdmin() \|\| isTenantMember(tenantDoClubePai())`. **Um token `athlete` não lê o próprio vínculo de membro.** Comentário na própria Rule: *"Membros NUNCA são públicos, mesmo em clube com visibilidade 'publica'"* |
| Consequência | callable obrigatório, exatamente como `pedidos`/`inscritos` na B1. Nenhuma Rule é tocada |
| O doc do clube | `clubes/{id}` é legível pelo cliente **só** se `visibilidade in ['publica','indexavel']`. Clube privado ⇒ o nome do clube tem de vir pelo callable (Admin SDK), senão a lista sai sem nome |

> ⚠️ **Achado que muda a expectativa do dono (não é defeito desta lane).**
> **Não existe hoje nenhum caminho pelo qual um participante ENTRE num clube.**
> A varredura por escritores de `membros` no repo inteiro devolve **três**, e
> nenhum é do participante: `membrosAggregates.ts:70` (∑ de Function),
> `membrosMutations.ts:127`/`:171` (remover/transferir — painel do organizador)
> e `seed/membros.seed.ts`. Não há `entrarNoClube`, não há consumo de
> `codigoConvite` (RN-101) fora do seed, e `functions/src/index.ts` não exporta
> nada do gênero. **"Meus Clubes" nasce estruturalmente vazio em produção** —
> só vê clube quem foi posto lá pelo painel ou pelo seed. O estado vazio desta
> tela, portanto, não é um caso de borda: é o caso NORMAL, e ele não pode
> prometer um botão de entrar que não existe.

### 1.2 · As DUAS máquinas de convite, lado a lado

A spec (`09-*.md`, tabela "Onde mora cada dado") nomeia as duas pela rota
pública de aceite. Elas não compartilham nem coleção nem chave:

| | **Influenciador** (`/convite/afiliado` · RN-316) | **Promotor / assessoria parceira** (`/convite` · E18) |
|---|---|---|
| Doc do convite | `eventos/{eventoId}/afiliados/{refCodigo}` | **DOIS** docs: `tenants/{tenantId}/parceirosAssessoria/{parceriaId}` **+** `clubes/{clubeId}/convites/{emailLowercase}` |
| Entidade | `packages/core/src/affiliation/afiliado.ts` | `packages/core/src/assessoria/parceria-assessoria.ts` + `packages/core/src/clubs/convite.ts` |
| docId | o `refCodigo` normalizado (unicidade por chave) | o **e-mail em minúsculas** (RN-106) no doc de convite |
| Chave do convidado | `responsavelEmail` (só PF; `tipo: 'pessoa_fisica'`) | `responsavelEmail` na parceria; `email` no convite |
| Estado pendente | `status: 'convite_pendente'` | parceria `'convite_pendente'` + convite `'pendente'` |
| Estado aceito | `status: 'ativo'` + `responsavelUid` carimbado | parceria `'ativa'` + convite `'aceito'`/`aceitoEm` (`provisionAssessoria.ts:278`, `:285`) |
| Credencial | `tokenAceiteHash` (SHA-256) + `expiraEm` | `tokenAceiteHash` + `expiraEm` no doc de convite |
| Escritor | `salvarAfiliado.ts:388` (organizador) | `cadastrarAssessoria.ts:400` (organizador) |
| Aceite | `provisionAfiliadoAccount` (público, token) | `provisionAssessoriaAccount` (público, token) |
| Link | `/convite/afiliado?e={eventoId}&a={afiliadoId}&t={token}` | `/convite?tenantId=&parceriaId=&token=` |

**Três consequências que decidem o desenho:**

1. **O token NÃO é recuperável.** Os dois docs guardam apenas o **hash**
   (`createHash('sha256')`, comparado em tempo constante —
   `provisionAfiliado.ts:121`, `provisionAssessoria.ts:143`). A área **não pode
   cunhar o link de aceite**, e é bom que não possa: cunhá-lo seria criar a
   segunda superfície de credencial que a spec proíbe em letra
   (*"Duplicar o aceite duplicaria a superfície de credencial"*). A caixa
   **lista**; o aceite continua no link do e-mail. Isto não é limitação
   contornada, é o aceite da fila cumprido.
2. **O convite pendente é endereçado a um E-MAIL, não a um uid.** `responsavelUid`
   só é carimbado NO ACEITE. Não existe leitura possível do convite pendente por
   uid — e essa é a razão de a B4 precisar de descoberta antes de código.
3. **Não há reenvio pelo lado do convidado.** Reemitir token é
   `cadastrarAssessoria`/`salvarAfiliado`, os dois com gate de escritor do
   tenant. A área não tem, e não deve ter, botão de reenviar.

### 1.3 · A fronteira POSSE-EMAIL-1, que o brief manda não mover

O brief ordena "uid da sessão; nada de e-mail como chave". A caixa de convites é
o único lugar da área onde o dado **só existe endereçado a e-mail**. A leitura
por e-mail aqui **não afrouxa nada**, e a razão é precisa:

- o gate é o **mesmo** das outras callables (`resolverContaDoCliente`): sessão
  anônima recusada, `email_verified` **nativo do Firebase** exigido, e-mail do
  token normalizado (`gateAreaCliente.ts:112-117`);
- o e-mail usado na query é o **do token verificado**, nunca um parâmetro. Não
  há canal de input onde o chamador escolha o escopo;
- o POSSE-EMAIL-1 é uma exposição do **escritor** (`contaSemFriccao` carimba
  `contaUid` por e-mail **não verificado** — a cadeia está medida na
  REV-AREACLIENTE). Aqui o Firebase já provou posse antes da primeira leitura.
  A caixa é **estritamente mais fechada** que aquela fronteira, exatamente como
  a B1 é mais fechada que a Rule da RN-469;
- o que a caixa revela a quem provou posse do e-mail é o que já foi **enviado
  àquele mesmo e-mail**. Nenhuma informação nova atravessa.

Registro explícito para a review: **nenhum campo novo em `pedidos/{id}`**,
**`firestore.rules` intocado**, nenhuma Rule nova ⇒ nenhum teste de ataque de
Rule devido, e a lane não disputou o arquivo com ninguém.

### 1.4 · A forma escolhida: `collectionGroup`, e por quê

A lane anterior anotou que "o repo prefere iterar — ver `membrosAggregates.ts`".
A leitura do código mostra que **os dois padrões convivem e servem a jobs
diferentes**, e que o precedente correto para a B4 é o outro:

| Padrão | Onde | Por que ali |
|---|---|---|
| **Iterar clubes** | `membrosAggregates.ts:150`, `parceriasEspelho.ts:71` | São **cron/trigger de agregação**, que precisam varrer TODOS os clubes de qualquer maneira. O comentário justifica: "dispensa índice de grupo e mantém a recontagem por clube no mesmo passo". Iterar é grátis quando varrer tudo já é o trabalho |
| **`collectionGroup` keyed em trust anchor** | `affiliation/readers.ts:222` — `getMinhasAfiliacoes` | É **exatamente o caso da B4**: um participante lendo os PRÓPRIOS registros espalhados por tenants, numa callable de request. O comentário no arquivo é a regra: *"collectionGroup keyed no TRUST ANCHOR `responsavelUid` (estampado SÓ por Function) — o caller nunca escolhe o escopo da query"*. O índice CG dele já está no `firestore.indexes.json` e já foi deployado |

**Decisão: `collectionGroup`.** Iterar aqui custaria, **por abertura de tela**,
uma leitura de toda a coleção `clubes` mais uma subconsulta por clube (e, para
os convites de influenciador, uma varredura de todos os `eventos`) — custo que
cresce com a plataforma inteira para devolver os dois ou três registros de uma
pessoa. Um cron pode pagar isso à noite; uma tela do comprador não. O molde
`getMinhasAfiliacoes` já provou a forma nesta casa, com a mesma classe de dado.

**Cada query é filtrada por um campo que só Function escreve, e o chamador
nunca escolhe o escopo** — o invariante que o readers.ts declara é preservado
literalmente.

### 1.5 · `orderBy` — e a razão de ser `__name__` (F1 não se repete)

A F1 da REV-AREACLIENTE é ordem direta do brief: *limite sempre com `orderBy`*.
O defeito real da F1 é `limit(200)` **sem** `orderBy`, porque o Firestore
devolve os 200 primeiros **por `__name__`** e a ordenação por data acontece
depois, em memória, **sobre o conjunto errado**.

As três queries desta lane usam `.orderBy(FieldPath.documentId())` explícito com
`limit(TETO + 1)`, e a escolha do campo é deliberada:

- **`orderBy` sobre um campo de data descartaria docs em silêncio.** No Firestore,
  documento sem o campo do `orderBy` **não entra no resultado**. `clubes/{}/convites`
  é escrita por **duas** máquinas (`enviarConvites.ts:107` grava `criadoEm` só no
  create; `cadastrarAssessoria.ts:293` faz `merge` de reenvio sem `criadoEm`), e
  `membros` tem doc de seed e doc de mutation. Ordenar por data aqui trocaria um
  corte declarado por uma **perda calada** — o defeito que esta rodada existe
  para não repetir;
- **`__name__` existe em todo documento.** O corte passa a ser determinístico e,
  acima de tudo, **contável**: lê-se `TETO + 1` para SABER que cortou (o mesmo
  truque que a REV-AREACLIENTE aplicou no D4), e a resposta carrega
  `listaCompleta: false`, que a tela DIZ;
- **a ordenação de exibição é feita em memória sobre o conjunto COMPLETO**
  (quando não truncado), então o vício da F1 — ordenar o conjunto errado — não
  existe aqui. Quando truncado, a tela avisa antes de a pessoa tirar conclusão;
- bônus: `where(igualdade) + orderBy(__name__)` é servido pelo índice de campo
  único, sem índice COMPOSTO novo. Menos passo de deploy, menos risco.

Tetos declarados: **50 clubes**, **50 convites por máquina**. Uma pessoa com mais
que isso é caso de paginação, e a lista diz que cortou.

### 1.6 · ⚠️ A armadilha do `collectionGroup('convites')`

Existem **DUAS** subcoleções chamadas `convites` no banco, de entidades
diferentes:

- `clubes/{clubeId}/convites/{email}` — convite por e-mail (E05-S104 + E18);
- `desafios/{desafioId}/convites/{uid}` — convite de desafio
  (`jornada/entrarNoDesafio.ts:129`), **com docId = uid e sem campo `email`**.

Um `collectionGroup('convites')` alcança as duas. A query desta lane filtra
`where('email','==',…)`, o que já exclui a segunda por construção — mas a
exclusão é **acidental**, e por isso o código também confere o `origem` e o
`parceriaRef` antes de montar a linha, e o teste tem caso nomeado plantando um
convite de desafio para provar que ele não vaza para a caixa. Fica registrado
para quem for criar o terceiro `convites`.

### 1.7 · O terceiro tipo de convite, que a B4 NÃO mostra (decisão declarada)

`clubes/{id}/convites/{email}` guarda, na mesma coleção, o convite de
**membro comum de clube** (E05-S104, `enviarConvites.ts`) — distinguível só pela
**ausência** de `origem: 'assessoria_parceira'`.

A B4 **não** o lista, por duas razões: a fila nomeia a caixa como sendo de
"promotor ou influenciador", e — a razão dura — **esse convite não tem máquina de
aceite**. Não há Function que transforme `convites/{email}` em `membros/{id}`
(§1.1). Listá-lo produziria um cartão que promete uma entrada que o produto não
tem: a lista que mente, com outra roupa. **Vira item de painel do dono**, não
código desta lane.

---

## Parte 2 · O que foi construído

| Task | O quê | Estado | Commit |
|---|---|---|---|
| `B4 · S1222-T4` (servidor) | `getMeusClubesEConvites` + índices + 22 casos | ✅ | `4b72c556` |
| `B4 · S1222-T4` (tela) | Aba "Clubes e convites" + seam + 14 casos | ✅ | `b3e51638` |

**A frente B fecha.** As cinco tasks estão no repo.

### Arquivos

- `functions/src/cliente/meusClubes.ts` (novo) — o callable, as três leituras e
  os dois filtros de máquina.
- `functions/src/index.ts` — exporta `getMeusClubesEConvites`.
- `firestore.indexes.json` — **três `fieldOverride` COLLECTION_GROUP novos**
  (ver "Operação").
- `functions/src/__tests__/clubesEConvites.integration.test.ts` (novo) — 22 casos.
- `packages/api-client/src/cliente.ts` + barrel — wrapper tipado e os 7 tipos.
- `apps/landing/app/(public)/minha-conta/PainelClubes.tsx` (novo) — as duas seções.
- `.../minha-conta/AreaDoCliente.tsx` — a quarta aba, na MESMA leitura paralela.
- `apps/landing/test/minha-conta-clubes-s1222.test.tsx` (novo) — 14 casos.
- `apps/landing/test/minha-conta-s1222.test.tsx` — o seam novo entrou no mock
  (sem ele o `Promise.all` rejeita e a área inteira cai no estado de falha, o
  que mataria os 15 casos daquele arquivo por um motivo que não é o deles).
- `firebase.b4.json` (novo, **NÃO commitado**) — emulator DESTA lane, IPv4
  explícito, portas 8791/9791 + hub 4491 + logging 4591.

### As decisões que a review deve atacar

1. **A caixa lista e não aceita.** Não há botão nem link de aceite na tela, e o
   servidor não devolve token, hash, `refCodigo` nem `parceriaId` — há caso
   provando as quatro ausências por serialização da resposta inteira. A razão
   está na §1.2: o token só existe como hash, então o link não é
   reconstituível **nem no servidor**. Atacar por dois lados: (a) isto é
   suficiente para o aceite da fila ("aceitar a partir da área leva ao mesmo
   fluxo com token")? (b) a frase da tela — "abra o link do convite no e-mail
   que você recebeu" — resolve a pessoa que **não recebeu o e-mail**? Hoje ela
   fica sabendo que o convite existe e tem de pedir um novo a quem convidou.
   Não há reenvio pelo lado do convidado, e criar um seria callable pública
   nova com rate-limit próprio — escopo que a fila não abriu.
2. **`expirado` e `aceito` aparecem na caixa.** Some com eles seria a lista
   vazia que mente (quem recebeu convite e não o vê conclui que ele nunca
   chegou). O custo é uma caixa que nunca esvazia. Alternativa não adotada:
   esconder aceito depois de N dias.
3. **`orderBy(FieldPath.documentId())` em vez de data** — a §1.5 tem o
   raciocínio inteiro. O vetor: a ordenação do CORTE é por caminho, então quem
   passar do teto perde linhas que não são necessariamente as mais antigas. A
   tela avisa; a escolha é trocar perda calada por corte declarado.
4. **Uma leitura, três queries em `Promise.all`, e elas não morrem juntas.**
   Cada uma tem `try/catch` próprio e alimenta `clubesCompletos` /
   `convitesCompletos`. Índice de grupo faltando derruba **uma** lista e a tela
   diz — não derruba a aba.
5. **A contagem da aba é de convite PENDENTE**, não de clube. Somar as duas
   coisas viraria aviso permanente para quem só faz parte de clubes.
6. **O convite de membro comum de clube não é listado** (§1.7). É a decisão de
   produto mais discutível desta lane e está declarada como item de painel.

---

## Gates colados

**`tsc --noEmit`** — `packages/api-client`: **zero**. `apps/landing`: **zero**.
`functions`: **zero**.

**`eslint --max-warnings 0`** — `apps/landing` (`app lib`): **zero**.
`packages/api-client` (`src`): **zero**. `functions`
(`src/cliente src/__tests__/clubesEConvites.integration.test.ts src/index.ts`):
**zero**.

**Suíte da landing INTEIRA, 2× seguidas**

```
Test Files  57 passed (57)
     Tests  697 passed (697)      ← 1ª
Test Files  57 passed (57)
     Tests  697 passed (697)      ← 2ª
```

**Linha de base nova: `57 arquivos · 697 testes`.**

⚠️ **A linha de base recebida no brief (`55 · 681`) precisou ser reconstruída, e
o achado importa para a próxima lane.** A primeira medição desta lane, com o
teto de tempo DEFAULT do vitest (5 s), deu `4 arquivos · 6 testes falhando`; a
segunda, na mesma árvore intocada, deu **11 arquivos** com falha, incluindo os
dois de `minha-conta`. Rodado isolado, `minha-conta-s1222` passa `15/15` — com
o **primeiro render levando 17 s**, porque ele puxa o barrel do DS. Não é
regressão: é o flake que as duas lanes anteriores declararam sem conseguir
nomear, e ele fica **determinístico sob carga** — havia um `java` de emulator de
outra lane em **94% de CPU** durante a medição.

Com `--testTimeout=30000` (opção de CLI; **nenhum arquivo de config foi
tocado**) a árvore intocada fechou em **`55 arquivos · 681 testes`, exatamente
o número do brief**, com um único arquivo falhando: 
`test/checkout-s1228-codigo-obsoleto.test.tsx` — **não versionado, da lane
REV-5C**, e falhando na COLETA (não chegava a rodar caso nenhum). Durante esta
lane a REV-5C aterrissou e aquele arquivo passou a coletar, o que explica o
salto de `55·681` para `57·697` (56 + o meu; 681 + 14 meus + 2 daquele arquivo).

**Recomendação para o maestro:** o teto de 5 s é curto demais para o primeiro
render de qualquer arquivo que importe o barrel do DS nesta máquina, e é isso
que faz o gate "suíte 2× verde" virar moeda ao ar quando há lanes concorrentes.
Ou o `testTimeout` sobe no config da landing (mudança de 1 linha em arquivo
compartilhado, que esta lane não fez de propósito), ou o gate passa a declarar
o teto na linha de comando. Hoje ele é uma decisão implícita de quem roda.

**Functions — SÓ os arquivos tocados**, no emulator DESTA lane
(`firebase.b4.json`, `127.0.0.1:8791` / `9791`, IPv4 explícito, JDK 21 em
`C:\Users\Vitor Eduardo\.jdks\jdk-21.0.11+10`):

```
clubesEConvites.integration.test.ts + secretsBinding.contract.test.ts
 Test Files  2 passed (2)
      Tests  45 passed (45)
+  Script exited successfully (code 0)
```

A suíte completa de functions **não** foi executada, por gate do brief.

**`secretsBinding.contract` 23/23 com o callable novo já no `index.ts`.** A
guarda lê o index e calcula o fecho transitivo de segredos por function: ela
passar significa que `getMeusClubesEConvites` **não toca acessor de segredo
nenhum** e por isso não precisa de `runWith`. É prova, não suposição — foi
exatamente essa a classe do achado `5ffb69e0` da lane anterior.

**`firestore.rules` INTOCADO. Nenhuma Rule nova ⇒ nenhum teste de ataque de
Rule devido.** Três casos provam o contrário do que uma Rule aberta faria: token
`athlete` continua NEGADO em `clubes/{id}/membros`, `clubes/{id}/convites` e
`eventos/{id}/afiliados` pelo SDK.

**Nenhum campo novo em `pedidos/{id}`** — esta lane não escreve nada, em lugar
nenhum. Todas as leituras.

**Fronteira de território.** Nada tocado em `apps/landing/**/checkout/**`,
`functions/src/email/**`, `functions/src/checkout`, `functions/src/eventos`,
`functions/scripts`, `apps/painel`, `packages/core` ou `leela-specs/`. Todos os
commits usam `git commit --only`, arquivo a arquivo — a árvore tem trabalho de
terceiro não versionado (`CheckoutFlow.tsx` modificado,
`leela-specs/00-boards/V1-KANBAN.md` modificado, `HANDOFF.json`,
`checkout-s1228-codigo-obsoleto.test.tsx`) que **não** entrou em commit nenhum.

---

## ⚠️ Operação — TRÊS ÍNDICES NOVOS, e eles são passo de deploy

`firestore.indexes.json` ganhou **três `fieldOverride` COLLECTION_GROUP**, e
**as três queries desta lane dependem deles**:

| collectionGroup | fieldPath | queryScope |
|---|---|---|
| `membros` | `atletaId` | COLLECTION_GROUP ASC |
| `afiliados` | `responsavelEmail` | COLLECTION_GROUP ASC |
| `convites` | `email` | COLLECTION_GROUP ASC |

**`firebase deploy --only firestore:indexes` ANTES do deploy das functions.**
Esta lane **soma** à pendência que a BUILD-AREACLIENTE-2 já deixou (o
`fieldOverride` COLLECTION_GROUP de `inscritos.pessoaRef`): agora são **quatro**
overrides aguardando o mesmo passo, e ele é um só.

Sem o deploy de índices, cada query lança `FAILED_PRECONDITION`. O caminho
**não engole**: cai no `try/catch`, a lista vem vazia e a resposta traz
`clubesCompletos: false` / `convitesCompletos: false`, que a tela DIZ, mais
`logger.error` com `alerta: true` (`area_cliente_clubes_falhou`,
`area_cliente_convites_influenciador_falhou`,
`area_cliente_convites_promotor_falhou`). A pessoa vê um aviso honesto, não uma
lista vazia mentindo — mas **vê um aviso**, e isso é ruim o bastante para o
passo de deploy não poder ser esquecido.

**O Emulator não cobra índice de grupo**, então os 22 casos verdes desta lane
**não provam** este passo. É a mesma ressalva que a lane anterior escreveu, e
ela continua valendo palavra por palavra.

**Política de alerta:** três nomes novos de log para casar, todos severidade
ERROR com `alerta: true`, e todos sem PII (só uid, contagens e flags).

---

## Vetores para a review antagonista (contexto fresco)

Em ordem de risco:

1. **O isolamento das três queries.** `membros.atletaId == uid`,
   `afiliados.responsavelEmail == emailVerificado`, `convites.email ==
   emailVerificado`.
   **Normalização já conferida por leitura nos TRÊS escritores** (é igualdade
   exata de string, então um lado normalizado e o outro não produziria uma caixa
   silenciosamente vazia): `salvarAfiliado.ts:136` grava
   `input.responsavelEmail.trim().toLowerCase()`; `cadastrarAssessoria.ts` usa o
   mesmo `emailKey`; `enviarConvites.ts:88` faz `trim().toLowerCase()` no lote.
   O leitor normaliza igual (`gateAreaCliente.ts:114`). Os quatro pontos
   coincidem.
   Vetores que sobram: um doc LEGADO gravado antes dessa disciplina (a query
   não o acha e a caixa fica vazia sem avisar — é o fail-closed do prefill com
   outra roupa); conta cujo e-mail verificado bate com convite endereçado a
   quem trocou de e-mail; e a pergunta-mãe: existe combinação em que a caixa
   devolva convite endereçado a outro e-mail?
2. **A leitura por e-mail e o POSSE-EMAIL-1.** A §1.3 argumenta que a caixa é
   estritamente mais fechada que a fronteira aberta. Atacar o argumento: existe
   caminho em que `email_verified` seja `true` sem que o Firebase tenha provado
   posse (provedor federado que devolve `email_verified` do IdP, por exemplo)?
   Se existir, ele já afeta as outras três leituras da área, e o achado é maior
   que esta lane.
3. **O `collectionGroup('convites')` de duas entidades.** O pai é conferido
   (`parent.parent?.parent.id !== 'clubes'`) e há caso plantando um convite de
   desafio. Vetores: uma terceira subcoleção `convites` em outro lugar do banco;
   e um doc de desafio que ganhe campo `email` no futuro.
4. **`origem` como único discriminador entre promotor e membro comum.** Um
   convite de membro comum que ganhasse `origem: 'assessoria_parceira'` viraria
   cartão de promotor. O código exige TAMBÉM `parceriaRef` string — atacar se
   isso basta, e se existe escritor que grave um sem o outro.
5. **O corte por `__name__`.** Vetores: conta com 51 clubes (o 51º some e a tela
   avisa — a ordem de quem sobra é por caminho, não por data de entrada); e a
   interação entre `clubesCompletos: false` por CORTE e por FALHA, que hoje são
   o mesmo sinal na tela. A pessoa não distingue "faltou porque é muito" de
   "faltou porque quebrou". É decisão, e é atacável.
6. **A chave opaca de render.** SHA-256 do caminho, truncado em 16 hex. Vetores:
   colisão entre duas linhas (probabilidade desprezível, mas o React silencia
   chave duplicada); e se o hash de um caminho conhecido permite confirmar a
   EXISTÊNCIA de um doc por comparação — o atacante precisaria já saber o
   caminho, e ele só vê a própria caixa.
7. **A aba nova no `Tabs` com `forceMount`.** Os painéis de todas as abas
   existem no documento desde o primeiro render. Vetores: o peso a mais no
   boundary de cliente (o S1200 é gate próprio) e o comportamento do contador
   quando `convites` é grande.
8. **O estado vazio de clubes.** Ele afirma "quem administra um clube na Leela é
   quem inclui os participantes". Atacar a frase: ela é verdade hoje (§1.1), mas
   é uma afirmação de produto numa tela pública, e o dono não a ratificou.

---

## Para o maestro selar (não editei `leela-specs/`)

- **V1-KANBAN · `S1222`** → **`T4` ✅ `4b72c556` + `b3e51638`**. Com ela,
  `T1`..`T5` estão entregues e **a `S1222` fecha**. A **frente B inteira** da
  fila `11-*.md` está no repo.
- **`firestore.indexes.json` mudou de novo** — três overrides novos, somando
  quatro no total pendentes de `firebase deploy --only firestore:indexes`. Ver
  "Operação". É o passo de deploy mais fácil de esquecer desta rodada, porque
  não quebra nada visivelmente: só degrada.
- **ACHADO DE PRODUTO · não existe caminho para entrar num clube.** §1.1. Os
  únicos escritores de `clubes/{id}/membros` são o painel do organizador, a
  Function de agregado e o seed. Não há `entrarNoClube` nem consumo do
  `codigoConvite` (RN-101). Consequência: **"Meus Clubes" nasce vazio para
  praticamente toda conta real**, e o convite de membro comum de clube
  (`enviarConvites`, E05-S104) **é um convite sem máquina de aceite** — o e-mail
  sai, o doc é criado, e não existe função que o transforme em membro. É item
  de painel do dono, e é maior que esta lane.
- **Painel do dono** — abrir: **CLUBES-1** (o achado acima: ou entra o caminho
  de entrada no clube, ou a aba fica declaradamente informativa); **CONVITE-1**
  (quem não recebeu o e-mail do convite não tem, hoje, como pedir reenvio pelo
  produto — só pelo organizador).
- **Política de alerta** — três logs novos, ERROR + `alerta: true`:
  `area_cliente_clubes_falhou`, `area_cliente_convites_influenciador_falhou`,
  `area_cliente_convites_promotor_falhou`.
- **Gate da suíte da landing** — a decisão sobre o `testTimeout` (ver "Gates
  colados"). Enquanto ela não for tomada, "suíte 2× verde" depende de quantas
  lanes estão rodando emulator na máquina.
- **A4 (`S032-T4`)** aterrissou nesta madrugada (`b1bd5dc4`, revisada em
  `1d264533`) — a dependência que a BUILD-AREACLIENTE-2 registrou como aberta
  está paga.

---

## Conferência VISUAL do dono (nenhuma lane abriu navegador)

O que a B4 acrescenta às listas das três lanes anteriores, que continuam
valendo:

1. **A aba "Clubes e convites" em `/minha-conta`** — o contador ao lado do
   rótulo conta convite PENDENTE. Com quatro abas, conferir se a linha do
   `Tabs` não estoura em **320px** (era o risco já apontado com três).
2. **As duas seções na mesma aba** — "Meus clubes" em cima, "Convites" embaixo,
   com o respiro entre elas. Conferir se a hierarquia lê como duas coisas
   diferentes e não como uma lista só.
3. **O cartão de convite pendente** — a frase "abra o link do convite no e-mail
   que você recebeu. O link vale até dd/mm/aaaa". Vale ler em voz alta: é a
   única instrução que a pessoa recebe, porque não há botão.
4. **Os três estados do convite** lado a lado (pendente, vencido, aceito):
   contraste AA do `Badge` em cada variante sobre `surface-raised`, no tema
   brasa, e se "Prazo vencido" não parece erro do sistema.
5. **O vazio dos dois lados** — "Você ainda não faz parte de nenhum clube" e
   "Nenhum convite por aqui". É o que a maioria das contas vai ver (§1.1), então
   é a tela mais importante desta task, não a menos.
6. **Os avisos de lista parcial** — dá para forçá-los ANTES do deploy dos
   índices: em produção sem os índices, os dois aparecem. Conferir que eles não
   brigam com o estado vazio quando acontecem juntos (há caso automatizado
   provando que os dois convivem, mas o juízo visual é do dono).

---

## Pendências declaradas (não são desta lane)

- **CLUBES-1 / CONVITE-1** — os dois itens de painel acima.
- **F1..F7 da REV-AREACLIENTE** seguem abertas. A **F1** (`lerPedidosDaConta`
  com `limit(200)` sem `orderBy`) **não foi corrigida aqui** — é
  `functions/src/cliente/leituraArea.ts`, território desta lane, mas o conserto
  exige índice COMPOSTO novo (`contaSemFriccao.contaUid` ASC, `criadoEm` DESC) e
  é decisão de sequenciamento do maestro, não carona de uma task de UI. **O que
  esta lane fez foi não repetir o padrão**: as três queries novas nascem com
  `orderBy` e com corte declarado.
- `apps/painel/src/routes/conta/auth/_lib/{authErrors,authValidation}.ts`
  continuam DUPLICANDO `@leela/api-client/authMensagens` — herdada, território
  `apps/painel`, não disputada aqui.
