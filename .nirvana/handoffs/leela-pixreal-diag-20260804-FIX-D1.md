# FIX-D1 · o espelho do código da compra vira Function-only, e os dois sorteios passam a ser criptográficos

- **Trace:** `leela-pixreal-diag-20260804` · **Lane:** FIX-D1
- **Employee:** sf-backend-engineer (software-forge)
- **Entrada:** D-1 da `leela-pixreal-diag-20260804-REV-COD5A.md` (severidade média) + R-1 da mesma review, promovida a higiene técnica por decisão do maestro
- **Veredito:** **FECHADO** — o buraco foi medido antes, medido depois, e o tripwire fez o trabalho dele

## Parte 1 — `codigoPedido` sai da lista dos campos que o cliente escreve

O defeito, na medição da review: dos catorze campos de Function do inscrito,
treze estavam nas duas listas `hasAny` do `firestore.rules` e um não. O mesmo
`tenant_owner` que era NEGADO ao plantar `codigoIngresso` PASSAVA ao plantar
`codigoPedido`, e passava de novo ao trocá-lo. Como o escopo do código da compra
é GLOBAL, o organizador plantava no próprio inscrito o código de uma compra de
outra produtora — e o espelho é exatamente o que a busca da 5d (RN-475) vai ler
quando alguém ditar um código pelo telefone.

Quatro edições, um commit, porque separá-las esvaziaria os testes que comparam a
constante do core com as Rules:

| Onde | O quê |
|---|---|
| `firestore.rules:842` | `'codigoPedido'` ao lado de `'codigoIngresso'` em `semCamposDeFunctionInscrito()` |
| `firestore.rules:867` | idem em `camposDeFunctionIntocados()` |
| `packages/core/src/eventos/inscrito.ts` | `'codigoPedido'` em `CAMPOS_FUNCTION_INSCRITO`; comentário-âncora de 11 linhas e bloco `⚠️ AINDA NÃO É "escrita só por Function"` REMOVIDOS (descreviam o estado defeituoso) |
| `inscrito.test.ts` / `inscritoPedido.test.ts` | os dois `toEqual` exatos ganharam o campo |

A edição das Rules é de **duas linhas**, de propósito: a lane
`BUILD-AREACLIENTE-2` pode precisar do mesmo arquivo depois.

### O tripwire, medido

O bloco A5 de `codigoPedidoReserva.attack.test.ts` estava verde de propósito
(caracterização com contraste). A sequência, com o teste INTACTO entre os dois
primeiros passos:

| Passo | Estado do código | A5 |
|---|---|---|
| 1 · baseline | Rules como estavam | **3 passed** — o plantio SUCEDIA |
| 2 · Rules editadas, **teste sem tocar** | `codigoPedido` nas duas listas | **2 failed / 1 passed** — o `assertSucceeds` do create e o do update quebraram |
| 3 · tripwire trocado | `assertSucceeds` → `assertFails`, títulos ajustados | **3 passed** |

O passo 2 é a prova de que a edição pegou: se ele tivesse ficado verde, o
problema seria a Rule, não o teste.

**Um ajuste além da troca literal:** o segundo teste do A5 (o update) dependia do
doc criado pelo primeiro. Com o create agora negado, o doc não existiria e o
`assertFails` passaria de graça — update em doc inexistente é negado por
ausência, não pela regra que se quer medir. O inscrito passou a entrar pelo Admin
SDK, e um **controle positivo** (`updateDoc({ status })` que SUCEDE) prova que o
`assertFails` do `codigoPedido` mede `camposDeFunctionIntocados`, e não falta de
permissão de escrita.

## Parte 2 — o sorteio dos dois códigos deixa de ser `Math.random`

`Math.random` é o xorshift128+ do V8: o estado interno é recuperável a partir de
poucas saídas consecutivas, então quem compra e vê o próprio código consegue
prever os próximos. O código não é credencial (RN-469 autoriza por campo), mas
ele é o que o operador BUSCA quando alguém dita um número — prever o código de
outra pessoa é conseguir ser atendido como ela. Trocado nos DOIS geradores,
porque a doutrina é a mesma e divergir os dois seria pior que não mexer.

### `node:crypto` ou Web Crypto? Web Crypto — e a prova é do consumidor

`@leela/core` é dependência de `apps/landing` (Next 14), `apps/painel` (Vite 5) e
`apps/mobile` (Expo/React Native). A verificação, em vez do palpite:

1. Um arquivo de teste com `import { randomInt } from 'node:crypto'` compilado
   pelo tsup do core **não falha** — ele emite `import { randomInt } from 'crypto'`
   no bundle publicado, porque builtins do Node ficam externos. O tsup não é
   onde isso quebra.
2. É no CONSUMIDOR que quebra. Com o **mesmo Vite 5.4.21 do `apps/painel`**:
   - entrada que importa `packages/core/dist/index.mjs` (Web Crypto) → `✓ built in 257ms`
   - entrada que importa `crypto` → **falha de build no rollup**, `parseAst` error na linha do import
3. E o bundle real do core, depois da mudança: **zero** ocorrências de `node:` ou
   `from 'crypto'` em `dist/index.mjs` e `dist/index.js`; `getRandomValues`
   aparece 3×. Build `--platform browser` do `src/index.ts` inteiro: sucesso.

A casa já dizia isso por escrito, aliás: a metade `node:crypto` de `qrToken` e de
`linkIngresso` mora em `functions/`, nunca no core (`qrToken.ts:25`,
`linkIngresso.ts:32`). A escolha só cumpriu a doutrina existente.

### O que foi escrito

`packages/core/src/aleatorio.ts` (novo, interno — **não** exportado no
`index.ts`) com `sorteioUniforme(faces)`, e os dois geradores passando
`ALFABETO.length` para ele. Invariantes:

- **Injeção intacta.** Só o *default* mudou; `random` continua parâmetro, e é
  por ele que os testes pregam o sorteio e forçam colisão.
- **Sem viés de módulo.** Rejection sampling sobre uint32: descarta o que cai
  acima do maior múltiplo de `faces` em 2³² (com 31 faces, 4 valores em
  4.294.967.296). O que volta é o CENTRO do balde, `(k + 0,5) / faces`, para que
  o `Math.floor(r * faces)` do chamador devolva `k` sem depender de
  arredondamento na borda.
- **Acesso preguiçoso.** `globalThis.crypto` só é tocado no primeiro sorteio —
  importar `@leela/core` num runtime sem Web Crypto continua funcionando.
- **Ausência é erro, não fallback.** Cair de volta em `Math.random` esconderia o
  defeito justamente onde ele importa; o módulo lança e manda injetar uma fonte.
- **Tipo estrutural, não `Crypto`.** `functions/tsconfig.json` compila com
  `lib: ["ES2022"]` (sem DOM) — nomear `Crypto` quebrava o type-check do
  servidor. Erro pego pelo gate, não pela sorte.
- **Pool de 256 uint32.** Os testes de propriedade fazem ~100 mil sorteios cada;
  uma chamada de sistema por símbolo custaria ~1,7µs. Mesmos bytes, em bloco.
- **Zero mudança de formato.** Mesmos alfabetos, mesmos tamanhos, mesmos
  predicados, mesmo prefixo.

## Gates

Emulator **próprio**: firestore **8681**, host `127.0.0.1` explícito (o `::` é
falso-vermelho conhecido), JDK 21. Teste **arquivo a arquivo**; a suíte completa
de functions **não** foi rodada, por política. Sem deploy.

| Gate | Resultado |
|---|---|
| `tsc --noEmit` core / functions | 0 / 0 |
| `eslint --max-warnings 0` core / functions | 0 / 0 |
| `npm run build` core (tsup, cjs+esm+dts) | success |
| tsup `--platform browser` do core inteiro | success |
| vite 5.4.21 (consumidor real) importando o core | success |
| `codigoPedidoCore` / `codigoIngressoCore` | 26 / 11 (+3 testes novos) |
| `inscrito` / `inscritoPedido` | 19 / 36 |
| `codigoPedidoReserva.attack` (com o tripwire trocado) | **12/12** |
| `codigoPedidoReserva.integration` | 14/14 |
| `pedidoProprioRules` / `pedidoProprioRulesAntagonista` | 26 / 23 |
| `inscritosRules` (Rules do inscrito) | 38/38 |
| `inscritoPedidoRules` | 9/9 |
| `emitirIngressos.integration` | 15/15 |

### Testes acrescentados (o default mudou; sem prova ele não muda)

- `codigoPedidoCore`: os 31 símbolos aparecem numa amostra de 20 mil códigos e
  nenhum índice cai fora da faixa; 50 códigos seguidos são 50 códigos distintos
  (rede contra o modo de falha burro — fonte travada gerando `AAAAA` para todo
  mundo e colidindo em toda venda).
- `codigoIngressoCore`: o mesmo par, no alfabeto do ingresso.

## Desvios do roteiro

1. **`inscritosRules.test.ts` ganhou uma linha.** Ele fixava a porta 8080 no
   código e por isso não rodava em emulator de lane — e ele é justamente o teste
   de Rules do inscrito que o gate pede. Passou a honrar `LEELA_FS_EMU_PORT`,
   copiando o recorte que o irmão `inscritoPedidoRules` já usava, com fallback
   8080 para o gate consolidado. Sem isso, o gate exigiria subir um segundo
   emulator na porta compartilhada com as lanes em voo.
2. **O A5 ganhou seed pelo Admin SDK e um controle positivo** (justificado
   acima) — a troca literal `assertSucceeds`→`assertFails` teria deixado o teste
   do update passando por ausência de doc.
3. **`firebase.fixd1.json` não foi commitado.** O emulator da lane subiu com uma
   cópia de `firebase.revcod5a.json` trocando as portas para 8681/9681; o arquivo
   é território de configuração, fora do recorte desta lane, e foi apagado no
   fim. Para reproduzir: copie `firebase.revcod5a.json`, troque as portas, e rode
   os testes com `LEELA_FS_EMU_PORT=8681 FIRESTORE_EMULATOR_HOST=127.0.0.1:8681`.

## O que NÃO foi tocado

Nada em `apps/`. Nada em `leela-specs/`. Nada nos arquivos das lanes em voo
(`BUILD-RF2-1` em `functions/src/eventos|email|checkout`, `BUILD-AREACLIENTE-2`
em `apps/landing`) — os commits são `--only`, com os arquivos nomeados um a um.
As ressalvas R-2 e R-4 a R-8 da REV-COD5A continuam abertas onde estavam.
