---
tags: [leela, testes, qualidade, laudo, validacao-externa]
trace: leela-build-2d6ee98d
lote: AUDIT-TESTES
data: 2026-08-04
base: f37b8187
---

> Promovido para `leela-specs/` pela lane DOCS-EXTERNO. O original foi escrito em
> `.nirvana/outputs/leela-build-2d6ee98d/LAUDO-TESTES.md`, caminho que o `.gitignore` exclui:
> quem clonasse o repositório nunca o encontraria. O texto abaixo é o do autor, sem corte.
> As medidas retratam o commit `f37b8187` — leia-as como fotografia daquele ponto, não como
> estado permanente.

# Laudo · a postura de testes do LEELA

Lane `AUDIT-TESTES` · trace `leela-build-2d6ee98d` · 2026-08-04
Autor: sf-qa-engineer (software-forge), contexto fresco, mandato **read-only**.
Repositório `C:\dev\LEELA` em `f37b8187`. Zero mutação, zero commit, zero instalação.

**Pergunta do dono:** *"nosso desenvolvimento hoje está orientado à testes? Existem ferramentas de engenharia de software que podem nos ajudar nisso?"*

---

## Resposta curta

O projeto tem muito teste. Perto de **6.840 casos verdes** distribuídos em 489 arquivos, 109 mil linhas de código de teste contra 138 mil de produção. Isso não é pouco e não é enfeite: a suíte de Rules do Firestore é genuinamente boa, e o núcleo de regra de negócio é exercitado a sério.

E ainda assim a compra em produção nunca funcionou até 03/08, quatro compras do dono morreram em 29/07, e no commit que este laudo audita (`f37b8187`) o comprador que gera um PIX real de R$ 11,05 lê na tela **"Ambiente de simulação: nenhum PIX real é cobrado"** e recebe `internal` quando clica em confirmar. Os três defeitos passaram por um gate verde.

> **Nota de concorrência, escrita no fim da auditoria.** Enquanto eu media, uma lane `PIXREAL-FIX` estava no ar consertando os dois últimos, ainda sem commit na árvore de trabalho. O conserto dela chega, de forma independente, exatamente ao diagnóstico deste laudo: move a guarda para a porta da callable (o comentário dela diz *"A ORDEM É O CONSERTO"*), acrescenta `ASAAS_WEBHOOK_AUTH_TOKEN` ao `runWith`, faz o sinal de ambiente vir do servidor e não de variável de build, e escreve dois casos que exercitam o **invólucro**, não o núcleo. Isso não enfraquece nenhum número aqui; corrobora. E deixa a recomendação 1.1 mais afiada, não menos: é o **segundo** conserto manual da mesma classe de defeito, e nada ainda impede o terceiro.

Então a pergunta que importa não é quantos testes existem. É **o que eles provam**. A resposta medida: eles provam muito bem o miolo das funções e as regras de acesso ao banco, e não provam praticamente nada sobre a casca, sobre o artefato que sobe, e sobre o contrato com o gateway. É exatamente nessas três fronteiras que todo defeito de dinheiro desta trace nasceu.

---

# 1 · O desenvolvimento é orientado a testes hoje?

Três coisas costumam ser confundidas. Vou separar as três com número.

## 1.1 · Volume e distribuição

Números de execução, como os gates das lanes reportaram:

| Superfície | Casos verdes | Arquivos | Natureza |
|---|---|---|---|
| `functions` | **3.471** (+81 skipped) | 201 | 109 arquivos contra o Emulator; 811 casos são de Rules em 34 suítes |
| `apps/painel` | **1.822** | 194 | jsdom, RTL, dados mockados. Sem Emulator |
| `packages/design-system` | **1.098** | 59 | jsdom, RTL |
| `apps/landing` | **449** | 41 | jsdom, RTL. Sem Emulator |
| `e2e` (Playwright) | **2** | 1 | dois `/health`, escritos no dia 2 do projeto |
| `apps/mobile` | **0** | 0 | nenhum teste |
| `packages/core` | **0 no pacote** | 0 | 92 arquivos de fonte, 21.855 linhas, sem script `test` |
| `packages/api-client` | **0 no pacote** | 0 | 42 arquivos, 8.369 linhas, sem script `test` |

O `packages/core` merece nota, porque é o pacote onde o dinheiro é calculado. Ele não tem teste dentro de si, mas não está descoberto: os testes dele moram em `functions/src/__tests__/` e alcançam **474 dos 669 símbolos exportados (71%)** pelo menos uma vez. Seis arquivos do core não têm um único símbolo citado em teste algum (`assessoria/documento.ts`, `assessoria/parceria-assessoria.ts`, `clubs/clube-opcoes.ts`, `eventos/automacao.ts`, `eventos/capacidadeLote.ts`, `eventos/termoSaude.ts`).

A consequência prática de não ter script `test` é outra, e é operacional: `turbo run test`, que é o comando do CI, **pula core e api-client inteiros**. Qualquer meta de cobertura por pacote nasceria com os dois em zero por construção.

Sem teste nenhum, hoje: `apps/mobile`, e os **3.897 linhas** de `functions/scripts/` — que incluem o `redate.ts`, o código que decide as datas de todo o dado de produção. O `vitest.config.ts` do functions coleta só `src/**/*.test.ts`, o lint roda só `eslint src`, o tsconfig de build não cobre `scripts`. Duas reviews desta trace já registraram isso (R-1 da CKUX-REV, R-6 da KITCUPOM-REV) e ele segue fora.

**Proporção:** 0,79 linha de teste para cada linha de produção no repositório inteiro. Em `functions` a razão é 1,67. No painel, 0,51.

## 1.2 · Ordem de escrita: o teste vem antes do código?

Isto o repositório responde sozinho, porque tem histórico. Pareei cada arquivo de teste com o arquivo de produção de mesmo nome e comparei o commit em que cada um nasceu. Dos 266 pares que casam por nome:

| Ordem de nascimento | Pares | Fração |
|---|---|---|
| teste criado **antes** da fonte | **0** | 0% |
| teste criado **no mesmo commit** | 232 | 87% |
| teste criado **depois** da fonte | 34 | 13% (mediana de 62 commits de atraso; máximo 424) |

Zero. Em 1.296 commits e 32 dias de projeto, nenhum arquivo de teste jamais precedeu o arquivo que ele testa.

No nível do commit o quadro é mais generoso: dos **710 commits que tocam código de produção, 547 (77%) carregam teste no mesmo commit**, e nos últimos 200 commits a taxa sobe para 80,5%. Existem ainda 70 commits só de teste.

**Veredito honesto:** o projeto é *test-covered*, não *test-driven*. Teste e código nascem juntos, quase sempre, o que é uma disciplina real e bem acima da média. Mas o teste nasce depois de a solução já estar decidida, e isso muda o que ele consegue enxergar: um teste escrito junto com a implementação herda as premissas da implementação. O DEF-1 é o retrato disso, e volto a ele no item seguinte.

Há uma exceção, e ela é valiosa. As lanes de review deste projeto praticam **falsificação executada**: quebram a trava de propósito, rodam a suíte e exigem que a asserção morda. Isso é o teste vindo antes do fato, aplicado de trás para frente. Foi o que produziu, só nesta trace, **9 defeitos confirmados em 10 lanes de review** (DEF-1 e DEF-2 da ACHADOS-REV, D-1 e D-2 da CKUX-REV, D-1 e D-2 da KITCUPOM-REV, DEF-A, DEF-B e DEF-C da ONBOARD-REV). Quatro deles eram dinheiro na tela do comprador. É a prática mais forte de garantia que o projeto tem hoje, e ela roda depois do build, não dentro dele.

## 1.3 · Qualidade da asserção: caminho feliz ou falsificação?

Medi o corpo de todos os arquivos de teste. Doze mil seiscentos e oitenta e um `expect(` no total.

| Superfície | `expect` | Asserção negativa (`toThrow`/`rejects`) | Rules `assertFails` / `assertSucceeds` | `toHaveBeenCalled*` |
|---|---|---|---|---|
| `functions` | 7.346 | **908 (12,4%)** | **909 / 327** | 60 (0,8%) |
| `apps/painel` | 3.268 | **2 (0,1%)** | — | 256 (7,8%) |
| `packages/design-system` | 1.026 | 10 (1,0%) | — | 50 (4,9%) |
| `apps/landing` | 1.041 | **0 (0,0%)** | — | 91 (8,7%) |

A leitura é direta. **No backend a cultura é adversarial**: a suíte de Rules tem 909 asserções de recusa contra 327 de permissão, ou seja 74% do esforço é gasto provando que a porta fecha. Isso é raro e é bom. Nenhum snapshot em todo o repositório, nenhum `.only` esquecido, dois `skip`. Higiene alta.

**No frontend a cultura é do caminho feliz.** Duas asserções de exceção em 3.268 no painel; zero em 1.041 na landing, que é onde mora o checkout. Some-se a isso 22,4% de asserções fracas na landing (`toBeTruthy`, `toBeDefined`, `toBeGreaterThan(0)`), e o retrato é de uma suíte que confirma que a tela renderiza, não que ela recusa.

E há um padrão estrutural que explica quase todos os defeitos de dinheiro desta trace. **145 varreduras manuais, zero geradores.** O repositório não tem uma única biblioteca de teste por propriedade instalada. Onde uma propriedade precisa valer para todo entrada, o teste escolhe cinco entradas na mão. O exemplo é literal, em `functions/src/__tests__/rn347TaxaRepassada.test.ts`:

```ts
it('o juro é a diferença entre o total cobrado e o total à vista, e nunca é negativo', () => {
  for (const parcelas of [1, 2, 3, 6, 9]) {
    const sale = venda({ ..., installmentRules: RULES_COM_JUROS });
    const juros = roundMoney(sale.totalCobrado - sale.totalComprador);
    expect(juros).toBeGreaterThanOrEqual(0);
```

Cinco valores de parcela, **uma única configuração de taxa**, e essa configuração tem juros ligados. A propriedade é falsa exatamente no ramo que o teste não visita: com `jurosAoMes: 0`, R$ 35,00 em 6x cobrava R$ 34,98, menos que o principal. A reviewer da ACHADOS-REV precisou escrever à mão uma varredura de **512.039 combinações** para achar: 32,1% cobravam menos que o face, 41,2% cobravam mais, 26,7% batiam. E `jurosAoMes: 0` não é hipótese de laboratório, é o estado de produção, porque o seed é idempotente e todo tenant provisionado nasceu assim.

A propriedade foi testada exatamente onde ela vale. É o viés de confirmação em forma de código, e não é falha de quem escreveu: é o que acontece quando o teste nasce junto com a implementação e herda as premissas dela.

O mesmo padrão aparece no onboarding. A ONBOARD-REV registrou que o teste da build para o beco do item 57 (`falha ao gravar o perfil NÃO prende a pessoa fora da conta que já existe`) afere o passo imediato, a navegação para `/`, e nunca o login seguinte, que é onde a propriedade falha de fato.

## 1.4 · O que os gates garantem hoje

Os gates deste projeto são sérios e são cumpridos com rigor. Toda lane fecha com a mesma tabela: `tsc --noEmit` zero, `eslint --max-warnings 0` zero, suíte completa por superfície, Emulator do Firestore de pé, e as reviews acrescentam a falsificação executada. Isso pega, comprovadamente:

- erro de tipo e contrato entre pacotes;
- regressão de regra de negócio no núcleo (a falsificação da fórmula Price matou 8 casos em 3 arquivos);
- regra de acesso ao Firestore e ao Storage (7 falsificações de Rule executadas só na ONBOARD-REV, todas morderam);
- token de marca hardcoded no painel, por regra de lint própria (`leela-tokens/no-hardcoded-tokens`).

## 1.5 · O que os gates comprovadamente não pegam

Sete buracos, cada um com o defeito real que passou por ele.

### A · O gate testa o núcleo, o invólucro é onde produção quebra

Toda callable do projeto é escrita em duas peças: um `*Core(db, provider, input, ctx)` puro, e um invólucro `runWith({ secrets }).https.onCall(...)` que declara segredos, monta o provider e mapeia erro. **Os testes importam sempre o Core, com o provider injetado.** Medido: dos 88 símbolos exportados em `functions/src/index.ts`, **50 nunca são citados em arquivo de teste nenhum**. `asaasWebhook`, `resgatarConviteOrganizador`, `getOverview`, `saveDadosBancarios`, `registrarCheckin` e outros 45 existem, sobem para produção, e nenhum teste os nomeia.

Foi ali que o dinheiro sangrou, duas vezes:

**29/07** — `createInscricaoCharge` declarava só os dois segredos do Asaas, mas o caminho da compra passa por `travaCobrancaPix` e `pessoaRegistry`, que derivam identificador por HMAC com `CRM_ID_PEPPER`. Em produção o Cloud Functions injeta segredo apenas em quem o declara. A função morria em 500 antes de falar com o gateway. **Quatro compras do dono perdidas** (14:07:39, 14:07:45, 14:07:52 e 14:54:47 UTC). O QR nunca chegou a existir.

**03/08** — `confirmarPagamentoSandbox` declara `secrets: ['ASAAS_API_KEY']` e chama `selectPaymentProvider()`, que exige `ASAAS_WEBHOOK_AUTH_TOKEN`. Mesma família, cinco dias depois, no mesmo caminho de dinheiro. Aberto em `f37b8187`, linha 198 de `functions/src/checkout/confirmarPagamentoSandbox.ts`, e sendo consertado à mão pela `PIXREAL-FIX` enquanto eu escrevo. **Segundo conserto manual da mesma classe.**

O commit do primeiro fix (`78caacd3`) traz a lição escrita, palavra por palavra, no trailer:

> `Directive: toda function cujo grafo de import alcance um leitor de secret precisa declarar esse secret -- a suite no emulador nao pega essa classe de defeito, porque la a variavel vive no process.env do processo inteiro`

A diretriz estava certa e foi ignorada pela realidade cinco dias depois, porque **ela foi escrita em prosa e nada a transformou em verificação**. Este é o achado central deste laudo.

Há um detalhe que fecha o argumento. A função irmã `pagamentoWebhook` declara exatamente os mesmos `secrets: ['ASAAS_API_KEY']` e chama o mesmo `selectPaymentProvider()`, e **não** quebra, porque a guarda `hasAsaasKey(process.env)` roda antes da construção do provider e devolve 410. A diferença entre as duas é a ordem de avaliação de uma linha. Uma acertou, a outra errou, e a suíte está verde nas duas.

### B · O ambiente de teste garante justamente o que produção não garante

`functions/vitest.setup.ts`, linhas 18 a 22:

```ts
if (process.env['CRM_ID_PEPPER'] === undefined || process.env['CRM_ID_PEPPER'].length === 0) {
  process.env['CRM_ID_PEPPER'] = 'pepper-de-teste-vitest';
}
```

O segredo existe sempre, para todo mundo, no processo inteiro do vitest. Em produção ele existe só para quem declarou. **A suíte não pode falhar pela causa que derrubou produção**, por construção do próprio setup. O setup está certo em fazer o que faz; o que falta é a verificação separada que compara o grafo de import com a declaração.

### C · Nenhum teste olha o artefato que sobe

Os dois `vitest.config.ts` de aplicação carregam `css: false`. Os aliases de `@leela/core`, `@leela/api-client` e `@leela/design-system` apontam para `src`, nunca para `dist`. Consequência: **nada em 6.840 casos exercita o resultado do build.**

**DEF-C (ONBOARD-REV).** O véu do overlay bloqueante pedia `bg-[var(--surface-base)]/95`. O Tailwind descarta modificador de opacidade sobre valor arbitrário `var()`. O véu não existia: a home seguia visível atrás de um `role="dialog" aria-modal`, e o contraste do painel passava a depender do que estivesse por baixo. Só apareceu quando a reviewer mediu o CSS compilado do `vite build`. Nenhum dos 1.822 casos do painel viu.

O teste de regressão que fechou o DEF-C afere a *string de classe* (`expect(dialogo.className).toContain('bg-[var(--modal-overlay-bg)]')` e uma proibição por regex do padrão `var(--X)]/N`). É uma boa trava contra a repetição exata, e continua não provando que o CSS compilou. Outra classe que não compilasse passaria igual.

**Dist atrasado (DEPLOY-FINAL, 03/08).** `apps/landing/next.config.js` não declara `transpilePackages`, então o webpack resolve os pacotes de workspace pelo `dist`, e o script de deploy não constrói o `dist`. Medido antes do deploy: `@leela/api-client` de 01:47 contra fonte de 01:56, `@leela/design-system` de 02:10 contra fonte de 02:17. Os dois atrasados. Sem a reconstrução manual, a landing teria subido **sem a C4 no contrato de tipos e sem a frente D inteira**, e o release pareceria bem-sucedido, porque nada falha: o build simplesmente empacota o artefato velho.

### D · O número do gate inclui 81 casos que não avaliam asserção nenhuma

O gate do functions reporta `3471 passed · 81 skipped`. Os 81 são dois arquivos que morrem no `beforeAll`:

| Arquivo | Causa medida | Asserções avaliadas |
|---|---|---|
| `storageRules.integration.test.ts` | `ECONNREFUSED 127.0.0.1:9199` (exige o Emulator de Storage, que `--only firestore,auth` não sobe) | **0** (71 casos) |
| `estornarInscricao.e2e.review.test.ts` | `auth/user-not-found` (exige usuário semeado por bootstrap separado) | **0** (10 casos) |

Os 71 casos do Storage são as travas do teto de três fotos por kit, entre outras. Eles existem, são bons, e no comando que as lanes rodam eles não provam nada. Não é regressão desta trace, é uma condição estável há semanas.

### E · O verde é o da máquina de quem escreveu, e ele já mentiu

A `ONBOARD-BUILD` de 03/08 registrou, textualmente: *"lint do painel estava VERMELHO no pre-crash (`no-hardcoded-tokens` em `ConvitesView:76`) — o 'verde' do handoff anterior não era verdadeiro"*. Um gate declarado verde que estava vermelho, e a descoberta veio por acidente, depois de um crash de sessão.

A mesma lane registrou que `pnpm install` quebra com `ERR_PNPM_IGNORED_BUILDS` e **escreve um placeholder dentro do `pnpm-workspace.yaml`**. E a ACHADOS-REV perdeu o `node_modules` inteiro e 92 arquivos de `packages/core/src` num `git worktree remove --force` sobre link simbólico, precisando refazer o gate do zero.

Existe pipeline no repositório: `.github/workflows/ci.yml`, bem escrito, com Java 21, `firebase-tools` pinado, cache de Turbo e de emulador, e um job nightly de Playwright. **Ele foi escrito em 02 e 03/07 e nunca mais foi tocado**, enquanto a suíte crescia de zero a 6.840 casos. Três fatos medidos impedem que ele seja o gate hoje:

1. o step de teste sobe `emulators:exec --only firestore`, e **14 arquivos de teste do functions precisam do Auth**, 1 precisa do Storage;
2. `turbo run test` **pula `packages/core` e `packages/api-client`**, que não têm script `test`;
3. a suíte cheia do painel foi medida em **444 segundos**, e a do functions ficou **1h50 no ar sem terminar** antes de ser interrompida por disputa de CPU (registro da KITCUPOM-REV).

Não consegui verificar se o pipeline roda verde hoje: o repositório é privado e não há credencial nesta lane. O que é verificável é que nenhuma lane desta trace cita resultado de CI. O gate real é a máquina do dono.

### F · O teste de contrato do gateway existe, e teria passado

Este é o achado mais desconfortável do laudo.

O repositório tem um teste ponta a ponta contra a API sandbox real do Asaas: `functions/src/__tests__/asaasSandbox.e2e.test.ts`, 8 casos, PIX, cartão, boleto, estorno, replay idempotente, webhook. Ele é opt-in por `ASAAS_E2E=1`, tem pré-flight que aborta se a chave não for de homologação, e é bem construído. Foi escrito em **18/07** e não foi tocado desde. Nada o agenda: não aparece no CI, não aparece em script nenhum.

Entre 18/07 e 03/08 três defeitos de dinheiro nasceram exatamente na fronteira que ele cobre. E mesmo que estivesse rodando toda noite, **ele teria passado no maior deles**. A aritmética:

| | fixture do e2e | produção |
|---|---|---|
| `uid` | `'uid-e2e-ana'` (11 caracteres) | uid do Firebase (28) |
| chave de idempotência de entrada | `e2e-r6-pix-${Date.now()}` (24) | `chk-` + `randomUUID` (40) |
| `pedidoId` resultante | 40 | 73 |
| `externalReference` (`pedidoId::charge-pedidoId`) | **≈ 89** | **155** |
| teto do Asaas | 100 | 100 |

O e2e passa por **onze caracteres**. O defeito P0 que fez a compra em produção nunca funcionar até 03/08 estava fora de alcance do único teste que fala com o gateway de verdade, por causa do tamanho dos identificadores de mentira que ele usa.

Vale registrar o irmão desse defeito, medido pela KITCUPOM-REV e hoje item 65 no painel do dono: a **RN-333 publica chave de idempotência de 8 a 64 caracteres, e a plataforma recusa a partir de 50** (teto real medido: 49). Contrato publicado e contrato aplicado divergem no caminho do dinheiro, e nada no repositório pina a divergência.

### G · Nada verifica que o que subiu está de fato rodando

`expirarPixPendente` **nunca executou em produção**. Zero log, na história inteira. Cinco sentinelas em `cobrancasPixAtivas`, todas vencidas e não liberadas, duas delas órfãs de cobranças que falharam no bug do `externalReference`. Descoberto por investigação manual em 03/08.

`cotarInscricaoCheckout` estava **seis dias atrasada** em produção sem ninguém saber. Último `UpdateFunction` em 28/07, enquanto o resto foi deployado em 29/07 e 03/08. Descoberto no T1 da DEPLOY-FINAL, por leitura de audit log.

A prova de deploy hoje é contagem manual de marcadores ASCII no bundle servido. É um método honesto e caro, e é feito por uma pessoa a cada vez.

---

# 2 · Que ferramental ajuda, na ordem em que vale a pena

Regra que apliquei: nenhuma recomendação entra sem um defeito real desta trace que ela teria pego. O que não passa nesse teste eu descarto explicitamente no fim.

## 2.1 · Verificação estática do binding de segredo (o item número um)

**Defeito que teria pego:** os dois. `CRM_ID_PEPPER` em 29/07 (quatro compras perdidas) e `ASAAS_WEBHOOK_AUTH_TOKEN` em 03/08 (ainda aberto). É a única classe de defeito desta trace que chegou a produção **duas vezes**.

**O que é:** um script que percorre o grafo de import de cada função exportada em `functions/src/index.ts`, coleta todo leitor de `process.env` de segredo que ele alcança, e compara com o array `secrets:` do `runWith`. Diverge, falha. Cabe em cem linhas com o TypeScript compiler API, ou em menos com `ts-morph`.

**Custo:** meio dia. Sem dependência nova de peso, sem tocar em teste nenhum, roda em segundos.

**O que não resolve:** não pega a ordem de avaliação, que é a diferença entre `pagamentoWebhook` (certo) e `confirmarPagamentoSandbox` (errado). Para isso é preciso um caso que construa o invólucro com o ambiente incompleto e exija a recusa nomeada, e não `internal`.

## 2.2 · Fixtures em escala de produção no contrato do gateway, e o contrato agendado

**Defeito que teria pego:** o `externalReference` de 155 caracteres, o P0 que fez a compra nunca funcionar, **desde que a fixture cresça**. Do jeito que está, não pega.

**O que é:** duas coisas pequenas e uma de calendário.

1. trocar `uid: 'uid-e2e-ana'` por um uid de 28 caracteres e a chave de 24 por uma de 40, que é o que a landing emite. Uma linha cada;
2. um caso puro que afirme a propriedade do contrato: para todo uid válido e toda chave dentro da RN-333, o `externalReference` construído cabe em 100. Ele falharia hoje, e é a forma de fechar o item 65 do painel em vez de deixá-lo pinado numa contradição;
3. agendar o `ASAAS_E2E=1` para rodar toda noite ou antes de todo deploy de função de pagamento. O job nightly do CI já existe e já está escrito.

**Custo:** um dia, contando a rodada de validação contra a sandbox.

**O que não resolve:** a sandbox do Asaas não reproduz tudo (o estorno de PIX já devolveu `invalid_action` lá e funciona em produção). E ela nada diz sobre a conta de produção estar no titular certo, que é a pendência aberta com `FAROL SOLUCOES UNIVERSITARIAS LTDA` no BR Code.

## 2.3 · Teste por propriedade nas réguas de dinheiro (fast-check)

**Defeito que teria pego:** o DEF-1, o total parcelado abaixo do principal, vivo em produção em 73% das combinações de ticket e parcela. E o teto do `externalReference`. E, muito provavelmente, o resíduo de arredondamento antes de ele virar copy errada na tela.

**O que é:** `fast-check` gera as entradas em vez de você escolher. As 512.039 combinações que a reviewer varreu à mão viram três linhas, e a biblioteca ainda encolhe o contraexemplo até o menor caso legível, que aqui seria R$ 35,00 em 6x. Alvos por ordem: `packages/core/src/finance/calc.ts`, `buildInstallmentOptions`, `computeSaleState`, e o construtor do `externalReference`.

As propriedades já estão escritas em prosa nas specs e nos comentários. Duas delas, literais:

- *"para todo n da lista, parcela × n === total, exato em centavos"*;
- *"o juro nunca fica negativa, porque `buildInstallmentOptions` não emite opção abaixo do principal"* (esta, em `cotarInscricaoCheckout.ts:342`, era **falsa** quando foi escrita).

**Custo:** dois dias para as réguas de dinheiro. `fast-check` é uma devDependency única em `functions`, sem configuração.

**O que não resolve:** propriedade não descobre a regra de negócio, só a testa. Alguém precisa saber que o total nunca pode ficar abaixo do principal. E teste por propriedade é mais lento; ele mora na suíte pura, não no caminho crítico do Emulator.

## 2.4 · Verificação do artefato construído

**Defeito que teria pego:** o DEF-C (véu do overlay que não compilava) e o `dist` atrasado de dois pacotes que quase subiu sem a C4 e sem a frente D inteira.

**O que é:** duas verificações baratas, nenhuma delas glamourosa.

1. um teste que roda `vite build` do painel e afirma sobre o **CSS de saída**, não sobre a string de classe: para cada classe de overlay declarada, existe regra correspondente no bundle. É a prova que a reviewer fez à mão, virada em caso;
2. um passo de receita de deploy que reconstrói `core`, `api-client` e `design-system` antes de empacotar, e falha se o `dist` for mais velho que o commit mais novo do `src`. Hoje isso não está em script nenhum, e a DEPLOY-FINAL escreveu isso com todas as letras.

**Custo:** um dia. A verificação de frescor do `dist` é meia hora e paga sozinha.

**O que não resolve:** não prova aparência. Uma cor de token errada compila perfeitamente.

## 2.5 · Cobertura instrumentada, como medida e não como meta

**Defeito que teria pego:** nenhum, diretamente, e é por isso que ela vem em quinto e não em primeiro.

O que ela resolve é outra coisa: hoje **não se sabe o que não está coberto** sem uma auditoria manual do tamanho desta. Levei horas para descobrir que 50 dos 88 invólucros de função nunca são citados, que 3.897 linhas de `functions/scripts` estão fora de tudo, e que seis arquivos do core não têm um símbolo testado. Com `@vitest/coverage-v8` isso é um relatório de trinta segundos.

**Recomendação de forma:** instalar, publicar o número por pacote, **e não colocar limite mínimo no gate**. Meta de cobertura em projeto com esta cultura produz teste decorativo, e a landing já mostra o formato que ele teria: 22,4% de asserções fracas. O valor está no mapa, não na nota.

**Custo:** meio dia, mais uma linha por `package.json`. Requer dar script `test` ao core e ao api-client, o que também conserta o buraco do `turbo run test`.

## 2.6 · CI de verdade, como gate

**Defeito que teria pego:** o verde falso do lint do painel, declarado verde estando vermelho. E o incidente do `pnpm install` que escreve placeholder no `pnpm-workspace.yaml`, que é exatamente o tipo de coisa que uma máquina limpa expõe e a máquina de quem desenvolve esconde.

**O que muda:** o arquivo já existe e é bom. Faltam três consertos concretos, todos medidos acima:

1. subir `firestore,auth,storage` no `emulators:exec` em vez de só `firestore`, o que ressuscita os 81 casos hoje mudos;
2. dar script `test` a `packages/core` e `packages/api-client`;
3. partir o job por superfície, porque a suíte cheia não cabe num job só (painel 444 s, functions acima de 1h50 na máquina local).

**O que não resolve:** CI não melhora asserção. Ele torna verdadeiro o verde que hoje é declarado, e é tudo o que ele faz. Também não substitui a review antagonista, que é onde os 9 defeitos desta trace apareceram.

## 2.7 · Fumaça pós-deploy automatizada, e alarme de função que não roda

**Defeito que teria pego:** `expirarPixPendente` sem uma única execução em produção, com cinco sentinelas vencidas. E `cotarInscricaoCheckout` seis dias atrasada.

**O que é:** um script de pós-deploy que confere, para cada função crítica, a revisão ativa e o timestamp do último `UpdateFunction`, e um alerta no Cloud Monitoring para função agendada com zero execução na janela esperada. Os dois já têm precedente manual nas lanes: a contagem de marcadores no bundle e a leitura do audit log.

**Custo:** um a dois dias. Não depende de teste nenhum.

## 2.8 · Teste de mutação (Stryker) nos pacotes de dinheiro

**Defeito que teria pego:** não o DEF-1 diretamente, e prefiro ser exato: o DEF-1 era propriedade ausente, e mutação não inventa propriedade. O que o Stryker teria dito, e teria dito alto, é que o caso `o juro … nunca é negativo` **não distingue** o ramo `jurosAoMes: 0`, porque mutar o arredondamento naquele ramo não mata teste nenhum. Ele aponta a arma para o lugar certo antes de o defeito nascer.

**Onde:** `packages/core/src/finance`, `packages/core/src/checkout`, `functions/src/checkout`. Nunca no repositório inteiro.

**Custo:** dois a três dias na primeira rodada, e é caro para rodar. Só faz sentido depois que a cobertura instrumentada existir, porque mutação sobre código não coberto só devolve ruído.

**O que não resolve:** nada sobre invólucro, artefato ou gateway, que é onde os defeitos desta trace realmente nasceram. Por isso vem na terceira onda.

## 2.9 · Playwright na jornada de compra

**Defeito que teria pego:** o banner **"Ambiente de simulação: nenhum PIX real é cobrado"** servido em produção sobre um PIX real de R$ 11,05, com o botão "Já paguei, confirmar" que devolve `internal`. Em `f37b8187` ele está em `StepPagamento.tsx:218` sem uma única condição, e **nenhum dos 449 casos da landing cita esse texto**. Ele viveu incondicional desde o sandbox, atravessou todo o gate durante semanas, e só ficou visível quando o dono chegou nessa tela com dinheiro de verdade na mão. Mesmo agora, o conserto da `PIXREAL-FIX` é uma guarda de ambiente com casos em jsdom; o que continua sem prova é a tela **servida**.

O Playwright já está instalado (1.48), configurado com dois perfis (desktop e mobile 390), e tem job nightly no CI. O que ele tem hoje são dois `/health` escritos no segundo dia do projeto.

**O valor específico dele aqui não é achar bug de lógica.** A jsdom já pegou o D-2 da CKUX-REV ("a pessoa lê um valor e autoriza outro"). O valor é rodar contra **o artefato deployado**, que é onde o DEF-C e o `dist` atrasado moram, e onde a prova hoje é o dono clicando.

**Custo:** dois a três dias para a jornada de compra completa contra o preview, mais um para a porta do organizador.

**O que não resolve:** e2e de navegador é lento e é a camada mais frágil. Não deve virar gate de PR. Nightly e pré-deploy.

## 2.10 · O que eu descarto, e por quê

- **msw / nock.** O gateway já está atrás de uma porta (`PaymentProvider`), e os testes injetam duplos. Mockar HTTP não acrescenta prova nenhuma. O que falta é confrontar o contrato real, e para isso o `asaasSandbox.e2e` já existe.
- **Pact.** Contract testing bidirecional serve quando você controla os dois lados. O Asaas não negocia contrato com o LEELA. Sobra o teste contra a sandbox real, que é o item 2.2.
- **Detecção de flake e quarentena.** Procurei e não achei problema de flake para resolver. Zero `.only`, dois `skip`, e as reviews rodaram a suíte cheia 2 e 3 vezes sem variação. O risco real é outro e é de operação: rodar o painel em `--singleFork` produziu **67 falhas que não eram defeito de ninguém**, porque os tetos de tempo daquele `vitest.config.ts` foram dimensionados para processos paralelos. Isso se resolve com uma linha no `package.json` fixando o modo, não com ferramenta de quarentena.
- **Ferramental de Rules.** A pergunta do brief era se está sendo usado no potencial. Está. 811 casos em 34 suítes, 909 asserções de recusa contra 327 de permissão, e sete falsificações de Rule executadas só na última review, todas mordendo. É a superfície mais bem defendida do projeto. A única dívida é operacional: subir o Emulator de Storage no comando padrão, para os 71 casos pararem de ser decorativos.
- **Seed determinístico.** O `LEELA_CLOCK` e a re-datação idempotente já resolveram o problema que existia (o `574abaa9` fechou o deslocamento dobrado). A dívida aqui não é de determinismo, é de escopo: `functions/scripts/redate.ts` decide as datas de todo o dado de produção e está fora do `include` do vitest, do lint e do tsconfig de build. Mover para `functions/src/seed/redate.ts` com um teste de comportamento é meio dia e fecha as ressalvas R-1 e R-6, que já foram levantadas duas vezes.

---

# 3 · Veredito e caminho

## 3.1 · Veredito

O LEELA não é um projeto sem testes, e não é um projeto orientado a testes. É um projeto **fortemente coberto e fracamente falsificado**, e a diferença entre as duas coisas explica todo o histórico de defeito em produção desta trace. O código e o teste nascem juntos em 77% dos commits, o que é disciplina real, mas nenhum teste jamais nasceu antes do código, e teste escrito junto herda as premissas da implementação: a propriedade acaba testada exatamente onde ela vale. A garantia é sólida no miolo puro e nas regras de acesso ao banco, e é praticamente inexistente em três fronteiras, que são justamente as três onde o dinheiro passa: **o invólucro da função em produção** (segredo, ordem de avaliação, tradução de erro), **o artefato construído** (CSS compilado, `dist` de workspace, bundle deployado) e **o contrato com o gateway** (tamanho real de identificador, comportamento do Asaas). Nas três, o número que o gate exibe é verdadeiro e irrelevante. Somando: dos 6.840 casos verdes, 81 não avaliam asserção nenhuma, 50 dos 88 pontos de entrada de produção não são citados por teste algum, e o único teste que fala com o gateway de verdade não roda desde 18/07 e passaria no defeito que quebrou a compra.

A prática que hoje segura o produto de pé não é a suíte, é a **review antagonista com falsificação executada**: 10 lanes, 9 defeitos confirmados, 4 deles dinheiro na tela do comprador. Ela é cara, é humana em cada rodada, e não escala. O trabalho das três ondas abaixo é converter o que ela descobre em verificação que roda sozinha.

## 3.2 · Roadmap de três ondas

Ordenado pelo que protege dinheiro primeiro. Nenhum item cria card nesta lane.

### Onda 1 · fechar as duas feridas abertas (4 a 5 dias)

| # | Item | Esforço | Defeito real que fecha |
|---|---|---|---|
| 1.1 | Checagem estática do binding de segredo (grafo de import × `runWith`) | 0,5 d | `CRM_ID_PEPPER` (4 compras perdidas, 29/07) e `ASAAS_WEBHOOK_AUTH_TOKEN` (03/08, aberto) |
| 1.2 | Caso que constrói o invólucro com ambiente incompleto e exige recusa nomeada, não `internal` | 0,5 d | a diferença de ordem de avaliação entre `pagamentoWebhook` e `confirmarPagamentoSandbox` |
| 1.3 | Fixture de escala real no `asaasSandbox.e2e` (uid 28, chave 40) + propriedade do teto de 100 | 1 d | `externalReference` 155 > 100, o P0 que fez a compra nunca funcionar; e o item 65 do painel |
| 1.4 | `fast-check` em `finance/calc.ts` e `buildInstallmentOptions` | 2 d | DEF-1, total parcelado abaixo do principal, vivo em produção em 73% das combinações |

**Retorno:** as duas classes que já custaram compras reais deixam de depender de alguém lembrar. A onda inteira cabe numa semana e não exige mudar como o time trabalha.

Fora de escopo de ferramenta: os consertos C1, C2 e C3 que a `INV-PIX-INTERNAL` deixou propostos estão sendo aplicados agora pela `PIXREAL-FIX`, ainda sem commit. Enquanto eles não sobem em deploy, quem compra continua lendo que nada está sendo cobrado enquanto uma cobrança real de R$ 11,05 vence. E vale repetir o que a existência dessa lane prova: o item 1.1 desta tabela é justamente o que impede que exista uma quarta lane dessas.

### Onda 2 · tornar o verde verdadeiro (5 a 7 dias)

| # | Item | Esforço | Defeito real que fecha |
|---|---|---|---|
| 2.1 | CI como gate: emulador com `auth` e `storage`, script `test` no core e no api-client, job partido por superfície | 2 d | verde falso do lint do painel; os 81 casos que hoje não avaliam asserção; o incidente do `pnpm install` |
| 2.2 | Cobertura instrumentada por pacote, publicada, **sem limite mínimo** | 0,5 d | hoje não se sabe o que não está coberto sem auditoria manual |
| 2.3 | Verificação do artefato: asserção sobre o CSS compilado e guarda de frescor do `dist` na receita de deploy | 1 d | DEF-C (véu que não compilava) e o `dist` atrasado que quase subiu sem a frente D |
| 2.4 | Fumaça pós-deploy + alarme de função agendada com zero execução | 1,5 d | `expirarPixPendente` nunca executado; `cotarInscricaoCheckout` 6 dias atrasada |
| 2.5 | `functions/scripts/redate.ts` para dentro do `include` do vitest, com teste de comportamento | 0,5 d | 3.897 linhas fora de todo gate, incluindo o que decide as datas do dado de produção (R-1 e R-6, levantadas duas vezes) |

**Retorno:** o gate deixa de ser uma declaração e passa a ser um fato verificável por qualquer pessoa. É a onda que permite ao dono confiar no número sem confiar em quem o digitou.

### Onda 3 · subir o teto (6 a 9 dias)

| # | Item | Esforço | O que ganha |
|---|---|---|---|
| 3.1 | Playwright na jornada de compra e na porta do organizador, contra o preview, nightly e pré-deploy | 3 d | a prova de jornada deixa de ser o dono clicando; pega o banner de simulação e a família "ler um valor e autorizar outro" no artefato servido |
| 3.2 | Teste de mutação (Stryker) restrito a `core/finance`, `core/checkout` e `functions/checkout` | 2,5 d | nomeia qual teste de dinheiro é decorativo, como o `for (const parcelas of [1,2,3,6,9])` era |
| 3.3 | `fast-check` estendido às demais réguas (taxa, cupom, comissão, teto de parcela) | 2 d | mesma classe do DEF-1 nas superfícies que ainda não foram varridas |
| 3.4 | Fixar o modo de execução da suíte do painel no `package.json` | 0,2 d | mata o falso "67 falhas" do `--singleFork` |

**Retorno:** o projeto passa a descobrir sozinho a classe de defeito que hoje só a review antagonista encontra. A review continua valendo, e passa a gastar o tempo dela em desenho e regra de negócio em vez de gastar em aritmética de centavo.

---

## Anexo · como cada número foi medido

Tudo abaixo é reprodutível, read-only, sem rodar suíte.

| Afirmação | Método |
|---|---|
| 489 arquivos de teste, 5.971 `it/test` estáticos | varredura de `**/*.{test,spec}.{ts,tsx}` fora de `node_modules`, `dist`, `.next`, `lib` |
| 6.840 casos verdes | soma dos gates declarados nas lanes: painel 1.822, functions 3.471, DS 1.098, landing 449 |
| 109.487 linhas de teste × 138.363 de produção | contagem de linhas por raiz de pacote |
| ordem de escrita (0 antes / 232 junto / 34 depois) | `git log --reverse --diff-filter=A`, pareando teste e fonte por nome de arquivo |
| 547 de 710 commits de código com teste junto | `git log --name-only`, classificação por caminho |
| 12.681 `expect`, 908 `toThrow/rejects` no functions, 909 `assertFails` | contagem por expressão regular sobre o corpo dos arquivos de teste |
| 50 de 88 invólucros nunca citados | nomes exportados em `functions/src/index.ts` cruzados com o corpo de todos os arquivos de teste |
| 474 de 669 símbolos do core citados | `export function|const|class` por arquivo, cruzado com o corpo dos testes |
| 145 varreduras manuais, 0 `fast-check` | contagem de `for (const x of [` e de `fc.assert|fc.property` |
| 81 casos que não avaliam asserção | 71 em `storageRules.integration` (`ECONNREFUSED :9199`) + 10 em `estornarInscricao.e2e.review` (`auth/user-not-found`), conforme as duas últimas reviews |
| `externalReference` 89 × 155 | aritmética sobre a fixture (`uid-e2e-ana`, `e2e-r6-pix-${Date.now()}`) contra o identificador real de produção `ped-wNXRTvMM3vc7Boyi91vRgx3DBQy2-chk-1c675f35-...` |
| 568 `Not-tested:`, 1.046 `Confidence: high`, 0 `Confidence: low` | `git log --format=%B` filtrado por trailer |
| CI escrito em 02-03/07 e nunca tocado | `git log -- .github/workflows/ci.yml` |
| banner de simulação sem condição | `StepPagamento.tsx:218` e `:228` em `f37b8187`; nenhum arquivo em `apps/landing/test` cita o texto |

**Mandato cumprido.** O único arquivo que escrevi é este. `git status` no fim da lane mostra 11 arquivos rastreados modificados, e nenhum deles é meu: são a lane `PIXREAL-FIX`, em voo na mesma árvore de trabalho, aplicando C1, C2 e C3. Todas as medidas deste laudo foram tiradas do commit `f37b8187`, não da árvore suja. Zero commit, zero deploy, zero instalação de dependência, zero suíte executada.

Uma nota de calibração, e é a última. Em 1.296 commits este projeto declarou `Confidence: high` mil e quarenta e seis vezes, `medium` treze vezes e `low` **nenhuma**. Nas mesmas semanas, dez lanes de review confirmaram nove defeitos, quatro deles em dinheiro na tela do comprador, todos em commits declarados de alta confiança. O campo virou ritual. Vale reservá-lo para quando disser algo, ou aposentá-lo.
