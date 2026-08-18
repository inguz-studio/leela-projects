# INSCRITOS-READ-FIX — a lista de inscritos deixa de morrer por um doc

**Trace:** leela-redesign-v2-20260810 · **Lane:** INSCRITOS-READ-FIX · **Branch:** `inscritos-read-fix`
**Data:** 17/08/2026 (madrugada de 18/08) · **Merge:** `2eee5b4c` (main)

---

## 1. A causa, em uma frase

`parseInscrito` recusa `status: 'estornado'` sem `estornadoEm` (RN-341/FABLE-B), 8 dos 336 docs
do seed do mock têm exatamente esse par, e `snap.docs.map(parseInscrito)` levava as outras 328
linhas junto — um doc derrubava a lista inteira do evento.

### Prova (leitura direta do emulador, antes do conserto)

```
### inscritos: 336 docs — ok=328 falha=8
  [8x] Inscrito {id}: status "estornado" sem estornadoEm — o estorno carimba estornadoEm
       no MESMO write (RN-341/FABLE-B)
      ex: mock-insc-0004, mock-insc-0051, mock-insc-0098
### lotes: 9 docs — ok=9 falha=0
```

Os 8 são `i % 47 === 3` (índices 3, 50, 97, 144, 191, 238, 285, 332) — determinístico, todo run
do seed produzia os mesmos.

### E o render, que é o gate de verdade

| rota | antes | depois |
|---|---|---|
| `/eventos/mock-campeche-run/inscritos` | 0 linhas · "Não foi possível carregar os inscritos." | **336 de 336 inscritos**, tabela com nomes reais, console limpo |
| `/eventos/mock-campeche-run/credenciamento` | 2 skeletons por 20s · `pageerror: Inscrito mock-insc-0286: status "estornado" sem estornadoEm` | busca viva ("Nome, CPF ou código"), digitar "Marina Bittencourt" devolve **Marina Bittencourt · 5k**, painel ao vivo (122/269 kits), console limpo |

Screenshots: `.nirvana/gate-visual/inscritos-read-fix/{antes,depois}/`.
Probes: `.nirvana/gate-visual/probe-inscritos-cred.mjs` e `probe-cred-busca-viva.mjs`.

### O silêncio do credenciamento tinha causa própria

A mesma exceção, mas dentro do callback `next` do `onSnapshot`. O canal de `error` do onSnapshot
só responde por falha de **transporte** — a exceção no mapeamento escapava sem passar por ele,
`handlers.next` nunca era chamado, `loading` nunca virava. Dois skeletons parados para sempre.
Defeito duplo, dois consertos.

---

## 2. Correção da linha do tempo do brief

**Os três merges da noite NÃO causaram isto.** O diff do caminho de leitura entre o estado
pré-merges e o HEAD é vazio:

```
git diff --stat 9c7f8188^1 HEAD -- packages/core/src packages/api-client/src \
                                   apps/painel/src/lib/query apps/painel/src/routes/eventos/_data
 apps/painel/src/lib/query/mutations.ts         |  36 ++++   (modalidades, escrita)
 packages/api-client/src/eventos/modalidades.ts |  76 ++++   (arquivo novo)
 packages/api-client/src/index.ts               |  10 ++     (barrel)
 packages/core/src/eventos/modalidades.ts       | 273 ++++   (arquivo novo)
 packages/core/src/index.ts                     |  21 ++     (barrel)
```

`parseInscrito`, `listarInscritos`, `observarInscritos`, `carregarTodosInscritos` e
`useInscritosRealtime`: byte a byte iguais. O que mudou foi **o dado**, não o código:

- a guarda de coerência do estorno entrou em `a7ffe944` — **12/07**;
- o seed do mock entrou em `98b414f7` — **13/08**;
- todo doc do mock no emulador carrega `createTime 2026-08-18T00:55:56Z` = **21:55 BRT de 17/08**,
  depois das 19h50 em que o dono usou a busca. O `firebase.mockcampeche.json` não declara import
  e o único `firebase-export-*` da árvore é de 13/08 02:14 (anterior ao próprio commit do seed),
  então esse carimbo é de um **run vivo do seed**, não de replay de export.

Ou seja: defeito latente desde 13/08, que apareceu quando o mock foi re-semeado hoje à noite.
As três lanes da noite são inocentes; o que elas fizeram foi trazer o dono à tela na hora certa.

---

## 3. Risco de produção: **SIM** — e não depende de nenhum bug de Function

O par exato do mock (`estornado` sem carimbo) **não** é produzível pelo caminho normal de
produção: `estornarInscricao` escreve `status`, `estornadoEm` e `atualizadoEm` na MESMA transação
(`functions/src/checkout/estornarInscricao.ts:785-790`), e é o único escritor do flip.

Mas a classe do defeito é estrutural, e produção alcança ela por uma porta sancionada.
**A escrita é mais larga que a leitura.** `firestore.rules`, match `eventos/{id}/inscritos`,
`allow create` de cliente exige:

- `tenantId` coerente com o evento pai, tenant ativo, `isTenantWriter`
- `kit` no enum, `status` no enum de cliente, `chipNumero` nulo/ausente
- nenhum campo de Function

e **não exige `atletaNome` nem `atletaId`** — que `parseInscrito` recusa vazios. Um organizador
(`isTenantWriter`) cria, pela porta que as Rules abrem para ele, um doc que a própria lista dele
não consegue mais ler — e que derruba junto os outros 300 inscritos do evento.

Isso está pinado contra o arquivo real de Rules, no Emulator, em
`functions/src/__tests__/inscritosRules.test.ts` → `doc que a Rule aceita e o parse recusa
(risco de produção)`:

1. a Rule **aceita** o create sem `atletaNome`;
2. a listagem **sobrevive** a ele: placeholder degradado nomeado, e o doc são ao lado intacto.

Somam-se as portas menores, todas reais: `platform_admin` escreve fora do enum
(`|| isPlatformAdmin()` no create e no update), e doc anterior a uma regra nova tropeça na regra
de hoje — a coerência do estorno é de 12/07, e inscrição estornada antes disso não tem carimbo.

**A conclusão não é apertar a Rule agora.** Mudar shape exigido em produção é decisão maior que o
defeito, e provavelmente quebraria escrita legítima. A conclusão é que a LISTA tem de sobreviver
ao doc — foi o que a lane fez.

⛔ **O que a lane NÃO conseguiu provar:** não há acesso de leitura a produção nesta lane, então o
veredito acima é por leitura do **contrato de escrita** (Rules + Functions), não por varredura dos
docs reais. Se o dono quiser a prova empírica, o instrumento já existe e roda em minutos: o probe
de parse (`scratchpad/probe-parse.mjs`, 40 linhas, REST + `parseInscrito`) apontado a um export
de produção diz exatamente quantos docs e quais campos.

---

## 4. O conserto

### (a) Tolerância na leitura — doutrina F1 (`packages/api-client/src/eventos/inscritos.ts`)

`parseInscrito` **continua fail-fast**: é o contrato do doc e a guarda do dinheiro. O que mudou é
a listagem, exatamente como os readers de evento já faziam desde a review r1
(`eventoDegradado` em `eventos/queries.ts`, reusado por `listasGlobais` e `tenantEventosClubs`):

- `inscritoDegradado(id, raw)` — identidade confiável (docId + subcoleção do evento), conteúdo
  best-effort pelos MESMOS validadores do parse;
- `inscritoDaLista(origem, id, raw)` — try/catch com `console.error` nomeando o doc;
- aplicado em `listarInscritos`, `listarInscritosRecentes` e `observarInscritos`.

Três escolhas do placeholder que não são óbvias e estão comentadas no código:

1. **`status` preservado** quando está no enum. O defeito é de coerência entre campos; trocar o
   status poria uma inscrição devolvida de volta no denominador de dinheiro (D-1008-R19). Fora do
   enum cai em `pendente` — o "não sei" honesto.
2. **`kitEntregueEm`/`checkinEm` preservados.** Zerá-los diria ao balcão que a pessoa não retirou
   o kit: degradação que vira entrega em dobro.
3. **`dadosPessoais`, `tamanhos` e `titularHistorico` fora.** São os blocos aninhados, as fontes
   mais prováveis do defeito — mesma decisão que a F1 já tinha tomado em cronograma/faixa.
   `codigoIngresso`/`codigoPedido` entram quando válidos: sem eles a pessoa some da busca por
   código e o balcão não a acha nem sabendo o número.

### (b) O silêncio (`observarInscritos` + `useInscritosRealtime` + as duas views)

- o corpo do `next` do onSnapshot inteiro dentro de try → qualquer falha desce pelo canal de erro;
- `useInscritosRealtime` ganhou `refetch`, que **religa o listener** (não existe refetch de
  onSnapshot) com o estado voltando a loading;
- `useTodosInscritos` ganhou `refetch` (`query.refetch`);
- os dois blocos de erro viraram `Alert` do cânone (tom `vulcao`, `live="alert"`) com
  "Tentar novamente" — antes eram um parágrafo solto sem saída nenhuma.

### (c) Segundo passo declarado: o seed (`functions/scripts/mock-campeche-seed.ts`)

O mock não devia produzir o doc impossível. `i % 47 === 3` marcava 8 estornados num evento com
DOIS pedidos estornados — seis inscrições com dinheiro "devolvido" sem pedido, sem pagamento e sem
reembolso. Agora o estornado do inscrito deriva de `DEFS_PEDIDOS` (fonte única) e o carimbo entra
no MESMO write do vínculo, como `estornarInscricao` faz. Depois do re-seed:

```
[mock-campeche] inscritos: 336 (confirmado 304 · pendente 19 · estornado 2 · cancelado 11)
### inscritos: 336 docs — ok=336 falha=0
```

---

## 5. Testes

| onde | o que afirma |
|---|---|
| `functions/src/__tests__/listarInscritosDegradado.test.ts` (7) | o doc do SEED sem retoque não derruba a página; identidade/status/carimbos preservados; `tamanhos` neutralizado; doc sem `atletaNome` vira marcador honesto; feed de recentes degrada igual; lista válida passa sem telemetria; **o balcão entrega o pool degradado**; falha inesperada no `next` vira erro visível; erro de transporte segue chegando |
| `functions/src/__tests__/inscritosRules.test.ts` (+2) | a Rule ACEITA create sem `atletaNome` **e** a listagem sobrevive a ele — os dois lados do risco de produção, contra o arquivo real de Rules |
| `apps/painel/src/routes/eventos/entrega/__tests__/BalcaoView.test.tsx` (4, novo) | skeleton anunciado; erro com "Tentar novamente" **e o skeleton fora da tela**; sem `onRetry`, nenhum botão morto |
| `apps/painel/.../inscritos/__tests__/InscritosView.test.tsx` (+2) | mesmo par de erro + saída |
| `apps/painel/src/lib/query/__tests__/realtime.test.tsx` (+2) | erro do listener vira estado de erro; `refetch` religa (unsub 1×, subscribe 2×, volta a loading) |

## 6. Gates

- `tsc --noEmit` core + api-client + painel + functions: **0**
- `eslint --max-warnings 0` core + api-client + painel + functions: **0**
- `gate-canon`: **PASS** (os dois blocos de erro nasceram como `<div role="alert">` e a catraca
  `superficie-crua.painel` subiu 107 → 109; trocados por `Alert` do cânone, voltou ao baseline)
- fatia inscritos + credenciamento + query + `_lib`: **411/411**
- suíte do painel completa, em 4 fatias SERIAIS: **261 arquivos · 3023 testes · 0 falha**
  (eventos 86/1035 · clubes+crm+conta 57/567 · overview+parcerias+plataforma+onboarding+_system
  92/1043 · lib+components+shell 26/378)
- `inscritosRules` contra Emulator efêmero (`emulators:exec`): **40/40**

⚠️ **Flake pré-existente, não introduzido por esta lane.** `inscritosRules.test.ts` falhou em 2 de
5 execuções, sempre no `beforeAll` do bloco `paginação de inscritos por cursor`, com
`seedVerified: canários ausentes após 4 tentativas (seed engolido pelo emulator?)` — o seed pesado
de 453 inscritos que o próprio arquivo documenta como a maior fonte de instabilidade (SUITE-STAB).
Os testes desta lane passaram em **todas** as execuções em que chegaram a rodar. Vale uma lane
própria para o helper `stability.ts`.

## 7. Estado para quem pegar depois

- `:4602` servindo `dist-mock-campeche` no bundle `index-iYIEx26W.js` (rebuild desta lane);
- `dist/` (produção, `--mode leela-hub`) também rebuildado para a `:4601` alinhar — a `:4601`
  estava **fora do ar** quando a lane começou (`curl` devolveu `000`), então o bundle está
  atualizado no disco mas ninguém o serve;
- emulador do mock (Firestore 8280, `demo-leela`) re-semeado com o seed corrigido, gatilhos
  desligados e religados em volta do run;
- ⛔ deploy segue TRAVADO pelo gate visual L-011 — esta lane não deployou nada.

### Fila que esta lane deixa aberta

1. **Varredura de produção com o probe de parse** (o dono decide se quer a prova empírica).
2. **Rule × parse: fechar a fenda pelo lado certo.** Exigir `atletaNome`/`atletaId` no create de
   cliente é a correção estrutural, mas mexe em escrita de produção — decisão do dono, não da lane.
3. **`stability.ts`**: o flake do seed de 453 inscritos.
