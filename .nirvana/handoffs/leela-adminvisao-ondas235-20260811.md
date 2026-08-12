---
trace: leela-redesign-v2-20260810
lane: ADMINVISAO-ONDAS-235 → ADMIN235-RESUME
data: 2026-08-11 (retomada em 2026-08-12)
branch: adminvisao-ondas-235
worktree: C:\dev\leela-wt-admin235
epico: LEELA-E16
historias: LEELA-S1612, LEELA-S1613, LEELA-S1615
estado: FECHADA
---

# ADMINVISAO-ONDAS-235 · as três ondas que os cinco vetáveis destravaram

> Handoff vivo. Atualizado por onda. Onda 4 já paga (`9c93dabe`), onda 1 no ar desde 10/08.
> **12/08 · ADMIN235-RESUME:** o PC reiniciou 01h30 com a lane em voo. A auditoria da retomada
> encontrou as ondas 2, 3 e 5 **inteiras na branch** — o que estava desatualizado era este
> documento, não o código. Detalhe na seção "A auditoria da retomada".

## O contrato desta lane

Os cinco ADMINVISAO fecharam juntos na leva 6 da noite de 11/08
(`02-rodadas/2026-08-11-decisoes-dono/03-leva6-tarde.md`), e com eles destravaram as ondas 2, 3 e 5
da fila (`02-rodadas/2026-08-09-admin-visao/04-fila-build.md`). As palavras do dono, que são o
contrato desta lane:

| Item | Na íntegra | O que vira código |
|---|---|---|
| ADMINVISAO-1 (V-1) | "faturamento gerado é para a leela, já que ficamos como que sobra do TPV menos custos operacionais e repasses dos organizadores" | o rótulo nomeia a receita da Leela — e o custo operacional **não existe em código** |
| ADMINVISAO-2 (V-2) | "tem que guardar cpf, e-mail, telefone, cidade, endereço, restrições, pedidos, tudo… a visao geral no individuo" | a aba Clientes mostra a ficha completa por indivíduo |
| ADMINVISAO-3 (V-3) | "Responsável é o dono da conta." | RN-542 **não nasce**; o trabalho é tipar e exibir |
| ADMINVISAO-4 (V-4) | "sim, identificação via CPF ou documento estrangeiro" | o diretório identifica por CPF, por callable auditado |
| ADMINVISAO-5 (V-5) | "é qualquer clique em botões, menus, para navegar ou mudar de tela ou ter ações" | ratifica a RN-510 como está no ar |

## A auditoria da retomada (12/08)

O relay da noite declarou "onda 5 completa, onda 2 parcial, onda 3 em voo" e nomeou um resíduo de
type-check em `EventosTabRoute`. A auditoria contra os commits reais — não contra a declaração —
devolveu outra coisa.

**As três ondas estão completas na branch**, em 19 commits de `5dec50bc` a `c4275310`, todos
pushed. A tabela de tarefa → commit está em cada seção abaixo. O que ficou para trás foi a
atualização deste handoff, que a lane fazia por onda e parou no meio da 2.

**O resíduo de `EventosTabRoute` não existe mais, e nunca esteve no arquivo.** O arquivo foi criado
em `05bd2cf6` e **nenhum commit o tocou depois** (`git log --all -- …/EventosTabRoute.tsx` devolve
um commit só) — se houvesse erro dentro dele, ele ainda estaria lá. O que havia era o estado
transitório declarado na 2.1: a aba existia e ainda não estava montada no roteador, e `0c7451fc`
fechou isso ao importar `EventosTabRoute`, `ClubsTabRoute`, `VendasTabRoute`, `FinanceiroTabRoute` e
`ContasRoute` no `PlataformaRoutes.tsx`. Prova do fecho: `tsc --noEmit` no painel sai **limpo**, com
os três pacotes reconstruídos na ordem (`core` → `design-system` → `api-client`) para que nenhum
`dist` velho mascarasse o resultado; e a suíte de `EventosTabRoute` passa com 10 casos.

### Achado: `@leela/mobile` reprova o type-check, e é dívida de `main`

Rodar `pnpm type-check` no monorepo inteiro reprova em `@leela/mobile`:

```
../../packages/core/src/eventos/evento.ts(48,15): error TS2339: Property 'protocol' does not exist on type 'URL'.
../../packages/core/src/eventos/evento.ts(48,46): error TS2339: Property 'protocol' does not exist on type 'URL'.
../../packages/core/src/eventos/evento.ts(49,14): error TS2339: Property 'hostname' does not exist on type 'URL'.
```

**Não é desta lane, e está provado.** `evento.ts` é idêntico a `main` (`git diff origin/main...HEAD`
sobre o arquivo é vazio), `apps/mobile` está intocado, e a única mudança da branch em
`packages/core` são dois campos opcionais em `Profissional` (`telefone`, `organizacao`) — o barril
já re-exportava `evento.ts` desde antes. A confirmação é empírica: o mesmo `tsc --noEmit` rodado em
`C:\dev\LEELA` (main, `7aa78e00`) devolve **os mesmos três erros**. Causa: o `tsconfig` do mobile
usa `"lib": ["ES2022"]` sem DOM, e o `URL` que sobra é o do React Native, que não declara
`protocol`/`hostname`. Vai para a fila como item próprio.

## Onda 2 · a economia do tenant

| # | Tarefa | História | Commit |
|---|---|---|---|
| 2.1 | SubNav da ficha + rotas filhas | `S1612-T1` | `5dec50bc` |
| 2.2 | Aba Vendas, economia lida do carimbo, mode-aware ⚔ | `S1613-T2` | `8dc92412` |
| 2.3 | Aba Financeiro: faturamento, idade do rollup, recompute manual ⚔ | `S1613-T4` | `18d709ee` + `c4275310` |
| 2.4 | Aba Financeiro: repasses e saldo do tenant | `S1613-T5` | `77fcc8c8` |
| 2.5 | Plano aplicado + divergência termo × estampa (RN-541) | `S1613-T6` | `e942660d` |

### 2.1 · SubNav da ficha (`S1612-T1`) — `5dec50bc`

A spec recusou sete rotas soltas por uma razão de trabalho: o dono não abre o painel para consultar
"os clubs do Castelo", ele abre para entender uma produtora, e a pergunta seguinte muda conforme a
primeira responde. É uma rota com abas.

Arquivos novos: `apps/painel/src/routes/plataforma/tenants/_lib/fichaSubnav.ts` (puros) e
`tenants/TenantFichaLayout.tsx` (a casca). `PlataformaRoutes.tsx` passa a montar
`tenants/:tenantId` como layout com filhas.

**Três decisões de desenho, e o porquê de cada uma.**

1. **O Resumo não foi tocado.** A tarefa proíbe, e a tela está no ar desde a S1601-T4 com o próprio
   `PageHeader`, os KPIs e a ação de ciclo de vida. Ele continua sendo a rota índice.
2. **A faixa de identidade aparece em todas as abas menos no Resumo.** Uma tabela de vendas sem o
   nome do tenant é uma tabela de vendas de ninguém; e no Resumo a mesma faixa seria o nome duas
   vezes na tela. A alternativa (mover o `PageHeader` do Resumo para o layout) é reescrever o Resumo,
   que a tarefa proíbe.
3. **A aba ativa deriva do primeiro segmento depois da base, não de `startsWith`.** `startsWith`
   sobre a string inteira casaria `/plataforma/tenants/abc-2/vendas` com o tenant `abc` e acenderia a
   aba de uma ficha vizinha. Travado por teste.

Sem leitura nova: o layout reusa `useTenantComOwner`, a mesma chave de cache que o Resumo já
consome. Montar a casca não acrescenta uma ida ao Firestore.

**Estado transitório declarado — e FECHADO.** A barra listou as sete abas desde este commit com
cinco caindo no `NotFound` do `PlatformShell`; `0c7451fc` montou quatro delas e `c4275310` montou a
Clientes. Nenhuma cai mais no `NotFound`, e nada foi publicado no meio.

Testes: 27 casos novos (19 nos puros, 8 na casca).

### 2.2 · Aba Vendas (`S1613-T2`) — `8dc92412`

**O líquido é lido, nunca recalculado.** `_lib/economia.ts` devolve
`pagamento.conciliacao?.repasseOrganizador ?? null` — não existe uma subtração `valorFinal − taxa`
no território inteiro. É o que a RN-182 exige no modo `repassada`, onde o produtor recebe o **face
cheio** e a taxa é cobrada por fora; refazer a conta na tela produziria um número menor que o
verdadeiro. Dois testes travam o caso, um puro e um de tela, e o de tela assere a ausência do número
errado (`R$ 180,00` não está no documento) além da presença do certo.

**Ausência nunca vira zero.** Sem `conciliacao`, a função devolve `null` e a célula mostra o rótulo
da causa — "Aguarda confirmação", "Não liquidou", "Cancelada", "Sem conciliação". Um teste assere
que **nenhum rótulo contém dígito**, e outro que `R$ 0,00` não aparece na tela do caso sem
conciliação. A distinção inversa também está travada: taxa zero **gravada** continua exibindo zero.

### 2.3 · Aba Financeiro, faturamento e idade do número (`S1613-T4`) — `18d709ee` + `c4275310`

**ADMINVISAO-1 virou um rótulo sem cifra.** O bloco chama-se "Faturamento gerado" e declara a
fórmula do dono junto da razão de estar vazio: o custo operacional não tem fonte hoje, e mostrar o
TPV ou o serviço com esse rótulo seria um número fingindo ser o total. Teste assere que não existe
`R$` dentro do bloco, e que o bloco vivo ao lado (TPV / Serviço acumulado) **não** carrega a palavra
"faturamento". A atribuição à Leela aparece no subtítulo da aba e no hint do KPI.

**A idade do número está à mostra.** "Retrato de {data}" em toda leitura, `Badge` de alerta quando
passa de 3h (`LIMIAR_ROLLUP_OBSOLETO_HORAS`), e carimbo ausente conta como obsoleto — a função pura
devolve `true` para `null`, que é a leitura conservadora. O recompute manual entrou em `c4275310`,
com read-your-writes por invalidação da família `['plataforma','rollups']` (ADR-010): o número volta
do doc reescrito, nunca remendado no cliente, que é o que a RN-537 exige.

### 2.4 · Repasses e saldo do tenant (`S1613-T5`) — `77fcc8c8`

Reaproveitamento quase total, como a fila previu: os callables e o `RegistrarPagamentoModal` da fila
global de repasses entram sem cópia, via `RepassesDoTenantSecao`. Nenhum dos cinco números do saldo
pode ser negativo por construção (`disponivel` é clamp em 0 pela RN-351, os outros são somatórios),
o que é o motivo de não haver tratamento de sinal nesta tela — ver a nota do gate abaixo.

### 2.5 · Plano aplicado e divergência (`S1613-T6`) — `e942660d`

`compararEstampa` confere os **quatro** eixos que o servidor usa (`taxaPorMetodo.credit_card`,
`.pix`, `tabelaTaxasParcela` linha a linha, `saasMonthlyFee`), reusando `planoParaTerms` do core.
Divergência é **sinal de leitura, não bloqueio** — um teste assere que a tela não ganha botão
nenhum. **Zero campo novo, provado por git:** o commit toca 6 arquivos, todos em `apps/painel`,
nenhum em `packages/core`, `packages/api-client` ou `functions`.

### Gate da onda 2

| Critério | Veredito |
|---|---|
| Venda `repassada` exibe face cheio como líquido, travado por teste | ✅ dois testes, um puro e um de tela |
| Pagamento sem `conciliacao` → vazio com rótulo, nunca zero | ✅ rótulo sem dígito, travado |
| Coluna de margem mostra "custo não configurado", não um número | ✅ por vacuidade — ver nota |
| `atualizadoEm` aparece e o sinal de obsolescência funciona | ✅ 5 casos puros + 4 de tela |
| Contraste AA em número negativo | ✅ por vacuidade — ver nota |
| Guia visual do admin como régua (L-011) | ⏳ pendente — exige navegador, e esta lane não faz deploy |

**Nota sobre os dois "por vacuidade", porque a diferença importa.** A spec põe custo real, margem e
economia do parcelamento **fora de escopo** desta história (`03-spec.md:285`) — são a S1610, que
continua dona disso. O critério é condicional: "quando olho **qualquer** coluna de margem". Não
existe coluna de margem no território desta lane, então não há onde o número mentir. E o único
número que a spec previa como negativo é justamente a margem (receita menos custo), que não existe:
os cinco valores de saldo são não-negativos por construção e as cifras de venda saem do carimbo.
Em vez de inventar uma coluna vazia fora do escopo, a lane declarou a ausência onde ela é sentida —
o bloco "Custos operacionais" nomeia `platform/config.custoGateway` e a S1610 como causa, com teste.
**Quando a S1610 subir, a régua de contraste em negativo passa a ter objeto e precisa ser feita lá.**

## Onda 3 · o que o tenant produz, e para quem

| # | Tarefa | História | Commit |
|---|---|---|---|
| 3.1 | Aba Eventos do tenant | `S1612-T3` | `05bd2cf6` |
| 3.2 | Aba Clubs do tenant | `S1612-T4` | `647a7d42` |
| 3.3 | Aba Clientes (callable da onda 1) | `S1612-T6` | `5b3f4814` + `3490deeb` + `3a4a56d0` |
| 3.4 | Responsável (V-3) | `S1612` / RN-542 | `37f866e1` |

**3.1 e 3.2 são reuso de casca.** As duas abas montam a `ListaGlobal` da onda 4 e as leituras por
tenant da onda 1 — zero reader novo, zero casca nova. A aba Eventos é a única lista do master com
coluna de dinheiro, e a onda 4 tinha escrito por que lá não entrou: falta a régua da RN-182
declarada na tela. Aqui a régua está do lado, nas abas Vendas e Financeiro. A coluna diz
**CONFIRMADA**, e a tela declara que `R$ 0,00` significa "nada confirmado" — porque `parseEvento`
transforma campo ausente em 0 e a tela não consegue separar evento antigo de evento sem venda.

**A aba Clubs não tem uma linha de dinheiro.** Oito colunas, nenhum `formatBRL` importado, e
`pago_em_breve` sai como "Pago (em breve)". O teste varre os cabeçalhos proibindo
`/receita|valor|mensalidade|faturamento/i` e assere que `R$` não aparece nos dois modelos de
entrada. O recorte diz na tela: clube não cobra mensalidade no modelo, entrada paga é promessa de
produto, ainda não cobrança.

**3.3 · a ficha do indivíduo, no eixo que o dono pediu.** ADMINVISAO-2 inverteu o gate antigo — que
proibia CPF, e-mail, telefone e endereço — e o código seguiu a decisão nova. O desenho separa os
dois riscos: **a lista mostra comportamento, a ficha mostra contato**, e a ficha vem por consulta
auditada de uma pessoa por vez. Os sete campos que o dono nomeou estão lá (CPF, e-mail, telefone,
cidade, endereço, restrições, pedidos), mais nascimento, gênero e contato de emergência. A tabela
continua sem PII **de propósito**, e isso não é resíduo do gate velho: é a defesa da RN-540 contra
saída em massa, preservando o eixo que o dono escreveu — "a visão geral **no indivíduo**".

**3.4 · responsável é o dono da conta, e a RN-542 não nasceu.** O trabalho foi tipar
`Profissional.telefone` e `Profissional.organizacao` — dados **gravados desde o auto-cadastro** e
até 11/08 fora do tipo, ilegíveis sem cast — e exibir. Nenhum campo `Tenant.responsavel`, nenhuma
coleção, nenhum índice; `Tenant` segue com `ownerUid` e nada mais.

### Gate da onda 3

| Critério | Veredito |
|---|---|
| Nenhuma linha da aba Clubs sugere receita de clube | ✅ travado por varredura de cabeçalhos |
| Aba Clientes conforme o V-2 decidido | ✅ os sete campos, com teste de conteúdo |
| EmptyState do glossário nas três abas | ✅ as três falam do tenant, não da plataforma |
| Contador honesto | ✅ `rotuloContagem` num lugar só; a forma "de N" não existe |

## Onda 5 · o diretório de contas

| # | Tarefa | História | Commit |
|---|---|---|---|
| 5.1 | Leitura do diretório, paginada, campos mínimos (RN-540) | `S1615-T1` | `214a718a` |
| 5.2 | Tela `/plataforma/contas`, dois modos, Fila como padrão | `S1615-T2` | `214145c9` + `0c7451fc` |
| 5.3 | Liberação direta como Function guardada, com registro | `S1615-T3` | `5ec7ae93` |
| 5.4 | Delta na RN-510 conforme o V-5 | `S1615-T4` | ratificação — RN-510 segue como está no ar |
| 5.5 | Teste de Rules com crachá de administrador | `S1615-T5` | `c06631ea` |

**V-4 virou consulta sob demanda, não coluna.** O CPF não sai na listagem: `647d27ec` traz o
callable `consultarDocumentoDaConta`, auditado por consulta, e `905cea7a` liga a identificação sob
demanda também no modo Fila. É o mesmo molde do `getBankDetailsForPayout` — quem, quando, qual
escopo, e a **negativa também** registrada. Sem export, sem CSV, sem download em lugar nenhum.

**V-5 não gerou delta.** O dono ratificou a RN-510 como está no ar ("qualquer clique em botões,
menus, para navegar ou mudar de tela ou ter ações"), então a 5.4 fecha sem mudança de código — o
que a decisão produziu foi a certeza de que a regra medida em 10/08 continua valendo.

## Gates

Baseline medido na branch, antes da primeira linha desta lane:
**suíte do painel 239 arquivos · 2646 testes · 0 falhas** (a main andou desde a onda 4, que media
2641). `tsc` limpo, `eslint --max-warnings 0` limpo.

**Fechamento da lane (12/08), rodado do zero em quatro fatias seriais, em primeiro plano:**

| Fatia | Arquivos | Testes | Duração |
|---|---|---|---|
| 1 | 64 | 806 | 398s |
| 2 | 64 | 654 | 418s |
| 3 | 64 | 715 | 466s |
| 4 | 62 | 680 | 446s |
| **Total** | **254** | **2855** | **~28min** |

**0 falhas.** Contra o baseline: +15 arquivos, +209 testes — o que as ondas 2, 3 e 5 acrescentaram.

`tsc --noEmit` limpo em `apps/painel`, `packages/core`, `packages/api-client` e `functions`.
`eslint --max-warnings 0` limpo nos mesmos quatro. Os pacotes foram reconstruídos na ordem
(`core` → `design-system` → `api-client`) antes dos gates, para que nenhum `dist` velho respondesse
no lugar do código.

Suíte de `functions` desta lane (os quatro arquivos de mock das ondas 3 e 5): **4 arquivos · 62
testes · 0 falhas**. Os `*.integration.test.ts` **não** foram rodados — exigem o emulador, e a
máquina tem JDK 17 enquanto o `firebase-tools` pede 21. É a mesma pendência que `c4275310` já
declarou; não é regressão desta retomada.

⚠️ `pnpm type-check` na raiz reprova em `@leela/mobile`, e isso é dívida de `main` provada acima —
não bloqueia esta lane.

### Segunda rodada de gates, depois de trazer a `main`

A `main` andou muito enquanto a lane estava parada: entraram o **SERV-3-RENOME** (a taxa da Leela
vira "Serviço" em toda superfície humana, super-admin incluído), a **Onda 0 Parte B** da fundação de
layout e a **leva 8** de decisões do dono. Merge de `origin/main` para dentro da branch em
`df782a3a`, **sem conflito**, e os gates rodaram **de novo, do zero**, com os três pacotes
reconstruídos antes:

| Fatia | Arquivos | Testes | Duração |
|---|---|---|---|
| 1 | 64 | 806 | 333s |
| 2 | 64 | 654 | 266s |
| 3 | 64 | 715 | 331s |
| 4 | 62 | 680 | 299s |
| **Total** | **254** | **2855** | **~20min** |

**0 falhas, os mesmos 2855.** O rename de "taxa" para "Serviço" não quebrou nenhuma asserção desta
lane porque as telas novas já nasciam com o glossário certo. `tsc` e `eslint --max-warnings 0`
limpos nos quatro pacotes; functions da lane 4 arquivos · 62 testes · 0 falhas.

### Achado que a `main` criou para a fila

A Onda 0 Parte B entregou os **primitivos de moldura que não existiam quando esta lane escreveu as
telas**: `Stack`, `SectionHeader`, `SplitPanel`, `MetricGrid`, `FormGrid`. Isso muda a leitura do
CANONE-1 para este território. A auditoria desta retomada mediu, dentro dos cinco componentes novos
da lane, **quatro receitas distintas de par rótulo/valor** (`ResponsavelCard`,
`FichaDoClienteDrawer`, `PlanoAplicadoCard` e a lista de divergências) e **três de cabeçalho de
seção** — todas inline, porque na hora em que foram escritas o design system publicava 50
componentes e nenhum de layout. Agora publica. **A ficha do tenant é candidata direta da adoção**,
e o `SectionHeader` cobre sozinho as três receitas de cabeçalho. Não é trabalho desta lane (o
código é anterior e está verde), é item da lane do roadmap de componentes.

## Notas de mecanismo para quem vier depois

**O worktree precisa de `pnpm`, não de `npm`.** O repositório não declara `workspaces` no
`package.json` — a resolução é do `pnpm` com store em `node_modules/.pnpm`, e os pacotes `@leela/*`
entram como links para o próprio worktree. Um `npm install` no worktree monta uma árvore
incompleta que compila até esbarrar nos tipos do `firebase`, e o erro (`TS2305: has no exported
member 'initializeApp'`) parece problema de código quando é problema de instalação. A sequência
correta é `pnpm install --frozen-lockfile` na raiz do worktree e depois `pnpm build` em
`packages/core`, `packages/design-system` e `packages/api-client`, nessa ordem.

**A suíte inteira não cabe numa janela de 600s em modo serial.** Com `--fileParallelism=false` os
239 arquivos levam cerca de 18 minutos; com paralelismo padrão, 8m41s. O protocolo anti-flaky desta
lane é rodar em **fatias seriais** (quatro fatias de ~60 arquivos, cada uma dentro da janela), e
nunca em background.

**A contenção é real e mede-se antes de culpar o código.** Na retomada de 12/08 uma fatia de 64
arquivos estourou a janela de 600s, e depois uma de 32 também. A causa não era a lane: sete workers
de `vitest` de **outros worktrees** (`leela-wt-fundacao` e `leela-wt-estouro`) estavam rodando os
gates deles na mesma máquina, com 350-450 MB cada. O diagnóstico que serve para a próxima vez é
listar a linha de comando dos processos, não só contá-los:

```
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.WorkingSetSize -gt 100MB } |
  Select-Object ProcessId, CommandLine
```

O caminho do worktree aparece no `CommandLine` e diz de quem é o processo. Fatia que estoura com
vizinho pesado se **re-roda**, não se conserta.
