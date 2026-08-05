# HANDOFF · BUILD-PDF — o ingresso baixado como arquivo

trace: leela-pixreal-diag-20260804 · lane: BUILD-PDF · employee: sf-frontend-lead (software-forge)
escopo: **S1214-T5** (Frente 4 da `04-fila-codigo.md`) — botão "Salvar como PDF" e a rota que gera o arquivo
spec: `leela-specs/02-rodadas/2026-08-04-pos-pagamento/05-spec-pdf-ingresso.md` · RN-473 · D-0804-4
base: `bca95e71`

> Esta lane **não declara nada resolvido ao dono**. Sem deploy — o maestro sequencia.
> **Board não editado**: `leela-specs/` está sob lanes em voo, então marcar a S1214-T5 no card
> S1214 do `V1-KANBAN.md` fica para o selo do maestro. Os vetores para uma eventual review
> estão no fim.

---

## O que entrou

| Peça | Onde |
|---|---|
| Gerador do PDF (server-only) | `apps/landing/lib/ingressoPdf.ts` **novo** |
| Route Handler `/ingresso/{token}/pdf` | `apps/landing/app/(public)/ingresso/[token]/pdf/route.ts` **novo** |
| Botão "Salvar como PDF" | `apps/landing/app/(public)/ingresso/[token]/page.tsx` |
| Copy dos estados numa fonte só (`ESTADO_INGRESSO_UI`) | `apps/landing/lib/ingresso.ts` |
| Consumo da fonte única | `apps/landing/app/(public)/ingresso/[token]/IngressoView.tsx` |
| A copy da folha para de disputar o nome | `apps/landing/app/(public)/ingresso/[token]/imprimir/page.tsx` |
| 73 testes | `apps/landing/test/ingresso-pdf.test.tsx` **novo** |
| `pdf-lib@^1.17.1` (servidor da landing) | `apps/landing/package.json` + `pnpm-lock.yaml` |

**A decisão de engenharia da spec foi executada como está escrita** (caminho B): Route Handler na
própria landing, reusando `buscarIngressoPorLink`. Nenhuma Function nova. Nenhuma verificação de
token na landing. A task **não virou ⚔**.

### A biblioteca escolhida, e o que a spec deixou em aberto

A spec deixou "qual biblioteca de PDF entra" para a lane de build, com dois limites (sem navegador
headless, nada que rode no cliente). Escolhida: **`pdf-lib`**. Por quê, na ordem:

- **JavaScript puro, sem binário nativo e sem leitura de disco em runtime.** As fontes Standard 14
  vêm embutidas em `@pdf-lib/standard-fonts`; o webpack do Next embute tudo no bundle do servidor,
  que é a única forma que sobrevive ao deploy por integração de frameworks do Firebase Hosting.
  `pdfkit` reprovou aqui: ele lê `.afm` do disco, o que é justamente o que quebra empacotado.
- **Embute PNG direto**, que é o formato em que o QR já chega da Function (`qrDataUri`).
- Árvore de dependências de quatro pacotes (`@pdf-lib/standard-fonts`, `@pdf-lib/upng`, `pako`,
  `tslib`), todos sem script de instalação.

---

## Os dois gates nomeados

### Gate (a) · o cabeçalho não aceita dado cru — **VERDE**

`Content-Disposition` é montado por `contentDispositionIngresso()`, que chama
`nomeArquivoIngresso()`, que tem **uma porta só: o predicado `isCodigoIngressoValido` do core**
(RN-396). Sem sanitizador novo — a diferença não é estética: sanitizador escapa o que passou,
predicado decide quem passa. Como o alfabeto da RN-396 não tem aspas, ponto-e-vírgula, barra,
espaço, CR nem LF, o cabeçalho fica fechado a injeção **por construção**.

Como foi provado (`test/ingresso-pdf.test.tsx`, bloco `gate (a)`):

- **código ausente** — `undefined`, `null`, `''`, número → `ingresso.pdf`;
- **fora do formato** — minúscula, 5 símbolos, 7 símbolos, e um caso por caractere ambíguo que o
  alfabeto exclui (`0`, `1`, `I`, `O`, `L`), espaço, hífen → `ingresso.pdf`;
- **caractere de controle e injeção** — `CRLF + X-Injetado:`, LF sozinho, CR sozinho, NUL, aspas
  fechando o `filename`, ponto-e-vírgula, `../../etc/passwd`, barra invertida, string de 10.000
  caracteres → todos `attachment; filename="ingresso.pdf"`, e a asserção de que
  nenhum CR, LF ou NUL sobrevive no cabeçalho;
- **forma única** — para uma bateria de entradas hostis, o cabeçalho sempre casa
  `^attachment; filename="ingresso(-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6})?\.pdf"$`;
- **a porta é a do core, não um regex local que concorda por acaso** — para cada valor da amostra,
  `nomeArquivoIngresso(v) !== 'ingresso.pdf'` **se e somente se** `isCodigoIngressoValido(v)`. É
  este teste que quebra se alguém trocar a porta;
- **ponta a ponta pela rota** — projeção com `codigo: 'AB2CD3\r\nX-Injetado: sim'` desce 200 com
  `attachment; filename="ingresso.pdf"`.

### Gate (b) · o PDF para onde o QR para — **VERDE**

A guarda da rota é `estadoMostraQr` do core (RN-421) — **o mesmo predicado que a Function usa** para
decidir se projeta a imagem. Uma regra, um lugar. Provado chamando o Route Handler de verdade
(único ponto mockado em toda a suíte: `buscarIngressoPorLink`):

| Estado | Rota `/pdf` | Botão na página |
|---|---|---|
| `valido` | **200**, `%PDF-`, `ingresso-AB2CD3.pdf` | aparece |
| `credenciado` | **200**, com o carimbo | aparece |
| `emitindo` | **303** → `/ingresso/{token}` | ausente |
| `pendente` | **303** | ausente |
| `cancelado` | **303** | ausente |
| `estornado` | **303** | ausente |
| `encerrado` | **303** | ausente |
| `nao_encontrado` | **303** | ausente (e sem link de impressão) |
| `indisponivel` | **303** | ausente (e sem link de impressão) |

Mais quatro provas em volta:

- **sem oráculo**: as sete negativas (cinco estados sem QR + token que não verifica +
  indisponível) foram comparadas por assinatura (status + cabeçalhos ordenados + tamanho do corpo)
  e o conjunto tem **um elemento só**;
- **a regra é o ESTADO, não a presença do campo**: `cancelado` com `qrDataUri` preenchido continua
  303 — arquivo congela, e um PDF de ingresso cancelado seria mostrado no credenciamento sem
  nenhuma superfície capaz de corrigi-lo;
- **estado com QR mas sem imagem embutível** (ausente, vazia, data URI truncado, URL http) também
  volta 303 — nunca um 500, nunca um arquivo pela metade;
- **o estado é lido no ato**: duas chamadas seguidas com projeções diferentes devolvem 200 e depois
  303.

E o teste que **segura a deriva do segundo layout**, que é o que a spec pediu em troca: ele lê os
**bytes do PDF gerado** (infla os streams Flate e traduz as strings hexadecimais que as fontes
padrão produzem), com **controle positivo antes de qualquer "não contém"** — sem ele, um teste de
privacidade passaria mesmo com o leitor devolvendo string vazia. Com projeção contaminada, o
arquivo **não contém** CPF, telefone, e-mail, nascimento, endereço, contato de emergência, resposta
de formulário, valor pago, `qrToken` nem host de link; e **contém** exatamente o mínimo da RN-422.

---

## Os invariantes da ordem, um a um

- **O arquivo não carrega o link nem o token (RN-419 aplicada a arquivo).** Garantia de
  **assinatura**: `gerarPdfIngresso(ingresso)` recebe a projeção e só ela — o token não entra nem
  por engano, porque não existe parâmetro para ele. Além disso, teste ponta a ponta busca o token
  dentro dos bytes do arquivo baixado pela rota e não acha.
- **Nome `ingresso-<codigo>.pdf`**, `ingresso.pdf` na queda, **nome de pessoa nunca** — nem no
  arquivo, nem nos metadados (o `/Title` do documento é o genérico "Ingresso", pelo mesmo motivo
  que o `<title>` da página é genérico).
- **Nenhuma dependência nova no bundle público.** Provado de duas formas: (1) teste que caminha os
  fontes de `app/` e `lib/` e cobra que `pdf-lib` seja importado por **um arquivo só**
  (`lib/ingressoPdf.ts`), que o gerador seja alcançado por **um consumidor só** (o Route Handler) e
  que **nenhum arquivo com `use client`** encoste em qualquer um dos dois — com controle de que
  existem clientes na landing, para o filtro não passar vazio; (2) o build de verdade (abaixo).
- **Nenhuma Function nova, nenhuma verificação de token na landing.** A rota chama
  `buscarIngressoPorLink` como a página chama. Teste cobra o **código sem comentários** da rota:
  sem `QR_TOKEN_KEYS`, sem `process.env`, sem `firebase-admin`.
- **Território.** Só `apps/landing` (+ `package.json`/`pnpm-lock.yaml` pela dependência).
  `functions/`, `firestore.rules` e `leela-specs/` intocados.
- **Os três cabeçalhos da RN-422** cobrem a rota nova **sem uma linha de configuração**: o `source`
  do `next.config.js` é `/ingresso/:token*` e o `*` casa a rota filha, como já casava `/imprimir`.
  Mesmo assim a resposta do arquivo repete `no-store`, `no-referrer` e `noindex, nofollow` — um
  binário que vai para a pasta de downloads não pode depender de uma segunda camada para não ser
  cacheado por proxy.

### Acessibilidade e DS

- `<a href>` **de verdade**, não `<button>` com JavaScript: focável por teclado, abre com Enter,
  aceita ctrl+clique e "copiar endereço", funciona sem JavaScript e mantém a rota com zero cliente.
  Quem força o download é o `Content-Disposition`; o atributo `download` é reforço.
- `aria-label="Salvar ingresso como PDF"` com o texto visível **dentro** do nome acessível e na
  mesma ordem — WCAG 2.5.3 satisfeito, não quebrado. Testado.
- `buttonVariants({ variant: 'secondary', size: 'lg' })` do DS — a receita que o subpath
  server-safe exporta **exatamente** para link estilizado de botão em Server Component
  (ADR-017), sem arrastar Radix. `--btn-height-lg` = **48px** de alvo de toque (mínimo 44).
  Teste cobra `h-[var(--btn-height-lg)]`, `focus-visible:ring-ring` e ausência de hex cru.
- **Sem indicador próprio de progresso** — é a premissa **PDF-5** da spec, trade-off declarado, não
  esquecimento. Ver "Desvio declarado" abaixo.

---

## Gates executados

Comando canônico do repo, com `--config.verify-deps-before-run=false` (o repo tem
`ERR_PNPM_IGNORED_BUILDS` por `@sentry/cli`).

```
$ pnpm --filter @leela/landing exec tsc --noEmit
(sem saída — zero erro)

$ pnpm --filter @leela/landing exec eslint app lib --max-warnings 0
(sem saída — zero erro, zero warning)

$ pnpm --filter @leela/landing test          # execução 1
 Test Files  48 passed (48)
      Tests  603 passed (603)
   Duration  109.79s

$ pnpm --filter @leela/landing test          # execução 2, seguida
 Test Files  48 passed (48)
      Tests  603 passed (603)
   Duration  103.92s
```

**Linha de base medida antes de tocar o código**: 47 arquivos / 530 testes verdes. Depois: 48 / 603
— **+1 arquivo, +73 testes**, nenhum teste existente alterado e nenhum flake nas duas execuções
seguidas.

### Build, que é a prova de bundle

```
$ pnpm --filter @leela/landing build
Route (app)                              Size     First Load JS
├ ƒ /ingresso/[token]                    150 B           199 kB
├ ƒ /ingresso/[token]/imprimir           150 B           199 kB
├ ƒ /ingresso/[token]/pdf                0 B                0 B

$ grep -rl 'PDFDocument|pdf-lib|StandardFonts' .next/static   →  0 arquivos
$ grep -rl 'pdf-lib'                        .next/server      →  3 arquivos
```

A rota do ingresso segue em **150 B / 199 kB**, idêntica à folha de impressão — o botão não custou
um byte de cliente. A rota do arquivo é **0 B / 0 B** (Route Handler). E a biblioteca aparece em
três arquivos do bundle do **servidor** e em **zero** do cliente.

---

## Commits

| Commit | O que |
|---|---|
| `dadb10a1` | `feat(ingresso): o botao que salva o ingresso em PDF e a rota que gera o arquivo` — 9 arquivos, +1207/−57 |

Commit com `--only` nos paths tocados. **Não** entraram as mudanças de outras lanes que estavam na
árvore (`functions/src/checkout/`, `functions/src/__tests__/`, `packages/core/src/pedidos/`,
`packages/core/src/eventos/inscrito.ts`, `packages/core/src/index.ts` — Frente 5 / S1228-T1 em voo).

---

## Desvios declarados

1. **O botão não tem estado de carregamento nem de erro na tela.** A ordem da lane pediu "estado de
   carregamento e de erro honesto"; a **spec proíbe** o que isso exigiria. A premissa **PDF-5**
   ("sem JavaScript de cliente, sem indicador próprio de progresso") é trade-off declarado, e o
   critério de aceite da S1214 ("nenhuma dependência nova entra no bundle público") cai junto se a
   rota ganhar cliente. Segui a spec, que é lei. O que existe no lugar: o indicador de download do
   próprio navegador, o teto de 12s do `TIMEOUT_INGRESSO_MS` e o desfecho honesto do erro — 303 de
   volta à página, que sabe dizer a verdade daquele estado, em vez de 500 ou arquivo pela metade.
   **Se o dono quiser o spinner, isso reabre PDF-5 e a task muda de forma.**
2. **`ESTADO_INGRESSO_UI` saiu do `IngressoView.tsx` para o `lib/ingresso.ts`.** Não estava na
   ordem. Motivo: o arquivo virou a **terceira** superfície a renderizar o mesmo ingresso, e copy
   repetida em três lugares diverge no primeiro ajuste de texto — que é exatamente o risco que a
   spec nomeia como custo do segundo layout. Zero mudança de valor: o bloco é o mesmo, e os testes
   de página e de folha que já existiam continuam verdes sem uma linha alterada. Um teste novo
   cobra que o PDF lê rótulo e aviso **daquela** fonte.
3. **Redirecionamento é 303, e vale para TODAS as negativas** (os cinco estados sem QR, o token que
   não verifica e o indisponível). A spec separa "redireciona para a página" de "a mesma resposta
   única e genérica"; unifiquei nos dois casos porque redirecionar para a página **é** entregar a
   resposta da página, e ter dois desfechos possíveis em vez de três é o que garante zero oráculo —
   provado pela assinatura idêntica das sete negativas.
4. **`pnpm-lock.yaml` traz, além do `pdf-lib`, uma renormalização de chaves de peer do
   `eslint-import-resolver-typescript`** feita pelo próprio pnpm ao reescrever o arquivo. Nenhuma
   versão mudou. Não deu para evitar sem editar o lock à mão.
5. **`pnpm add` tentou escrever `'@sentry/cli': set this to true or false` no
   `pnpm-workspace.yaml`.** Revertido — é ruído do gerenciador, fora do território e o valor era um
   placeholder inválido. Fica o registro para quem rodar `pnpm add` na próxima e vir a mesma linha.

---

## Vetores para uma eventual review

A fila marcou a task **sem ⚔** e a implementação não saiu do caminho especificado, então a review
antagonista continua opcional. Se o maestro quiser rodá-la, estes são os pontos onde eu apontaria a
arma primeiro:

1. **A porta do cabeçalho.** `contentDispositionIngresso` confia que o alfabeto da RN-396 nunca vai
   ganhar um símbolo perigoso. Se alguém acrescentar, digamos, `-` ou `.` ao
   `ALFABETO_CODIGO_INGRESSO`, o cabeçalho continua seguro; se acrescentar `"` ou `;`, não. Vale
   perguntar se o core deveria carregar um teste que proíba símbolos de cabeçalho no alfabeto.
2. **A margem entre `estadoMostraQr` e a projeção.** A rota confia no estado, não no campo. Se a
   Function um dia projetar `qrDataUri` num estado terminal (ou parar de projetar em `valido`), o
   comportamento muda de lugar. O primeiro caso está coberto por teste; o segundo cai no 303.
3. **O texto que a fonte não escreve.** `textoParaPdf` troca por espaço tudo que a WinAnsi não
   codifica. Um nome inteiramente fora do Latin-1 (japonês, árabe, cirílico) vira uma linha em
   branco no arquivo, e a pessoa baixa um ingresso sem o próprio nome. Alternativa: embutir uma
   fonte Unicode via `fontkit` — custa centenas de quilobytes no bundle do servidor e não foi
   pedido. **Premissa vetável.**
4. **O segundo layout.** O PDF é A4 em primitivas, em escala de cinza, com o mesmo argumento que a
   folha de impressão registrou (não há paleta de impressão no DS; inventar hex de marca seria
   violar a governança §2). Ninguém validou o arquivo **visualmente** — o teste prova conteúdo e
   ausência, não beleza. **É a lacuna nº 1 desta lane**, e ela some quando o maestro (ou o Vitor)
   abrir um PDF gerado no ambiente de verdade.
5. **Fim de página.** O layout é de uma folha só e não pagina. Com evento e local muito longos, o
   aviso do rodapé pode chegar perto da margem inferior. O aviso quebra em linhas medidas, mas não
   há guarda de "acabou a folha".
6. **`Content-Length` explícito.** A rota declara o tamanho do corpo. Se alguma camada do Hosting
   recomprimir a resposta, um `Content-Length` errado seria pior que nenhum. Vale um `curl -I`
   pós-deploy.
7. **A cópia extra do buffer.** `Uint8Array → ArrayBuffer` por exigência de tipagem do DOM neste
   app. Custa uma cópia de dezenas de quilobytes por download. Aceitável, mas é um lugar onde uma
   tipagem melhor resolveria sem cópia.

## Lacunas / o que fica para o maestro

- **Board.** A S1214-T5 **não** foi marcada no card S1214 do `V1-KANBAN.md` — `leela-specs/` está
  sob lanes em voo e a ordem foi explícita. Fica para o selo.
- **Deploy.** Nenhum. O maestro sequencia.
- **Prova visual do arquivo.** Um download real, aberto num leitor de PDF, no ambiente de verdade.
  Nunca abri navegador por iniciativa própria (regra permanente do Vitor).
