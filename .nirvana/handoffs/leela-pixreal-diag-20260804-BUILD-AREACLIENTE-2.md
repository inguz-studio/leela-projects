---
trace: leela-pixreal-diag-20260804
lane: BUILD-AREACLIENTE-2
employee: sf-frontend-lead (software-forge)
territorio: apps/landing (+ functions/src/cliente, packages/api-client)
continua: leela-pixreal-diag-20260804-BUILD-AREACLIENTE.md
---

# BUILD-AREACLIENTE-2 — a Frente B, o interruptor e o CTA do checkout

Fila canônica: `leela-specs/02-rodadas/2026-08-02-retomada/11-fila-contas-e-area-cliente.md`
(frente **B**, B1..B5) + a `S1225-T4` da Frente 2 de
`leela-specs/02-rodadas/2026-08-04-pos-pagamento/04-fila-codigo.md`.

## Estado por task

| Task | O quê | Estado | Commit |
|---|---|---|---|
| `B1 · S1222-T1` | Callables do próprio dono da conta | ✅ | `9acb8fb5` |
| — | Binding de `QR_TOKEN_KEYS` (achado cross-lane) | ✅ | `5ffb69e0` |
| `B2 · S1222-T2` | A área na landing + **interruptor virado** | ✅ | `3acfe7a8` |
| `S1225-T4` | CTA "ver meus pedidos" na confirmação | ✅ | `9fd12c74` |
| `B3 · S1222-T3` | Meus dados e trocar senha | ✅ | `cdef2987` |
| `B5 · S1222-T5` | As duas portas | ✅ | `bdebe384` |
| `B4 · S1222-T4` | Meus Clubes e a caixa de convites | ⛔ **não feita** | — |

**O interruptor virou** (`AREA_CLIENTE_NO_AR = true`, dentro do commit da B2) e a
**`S1225-T4` entrou**. Tudo aterrissado e **pushado**; a árvore não tem meia-task.

### Por que a B4 não foi feita

A lane parou em TASK INTEIRA, por teto de contexto, e não no meio de nada. A B4
é a única das cinco que precisa de descoberta ainda não feita: ela lê
`clubes/{id}/membros` e a caixa de convites de **duas** máquinas distintas
(`/convite/afiliado` · RN-316 e `/convite` · E18), o que implica um callable
novo em `functions/src/cliente`, decisão entre `collectionGroup` e iteração de
clubes (o repo prefere iterar — ver `membrosAggregates.ts`) e possivelmente um
índice de grupo. Começar isso com o contexto no fim produziria meia-área no
repo, que é exatamente o que o brief proíbe.

Ordem sugerida para quem pegar: **B4** é auto-contida e não bloqueia nada; a
**A4** (abaixo) é mais urgente que ela.

## Uma dependência da fila que NÃO estava paga

A fila escreve a `B1` como dependente da **A4** (`S032-T4` — o `contaSemFriccao`
para de amarrar compra em conta de administração). A varredura no início desta
lane devolveu **zero** para `platform_admin` em
`functions/src/checkout/contaSemFriccao.ts`: **a A4 não aterrissou**, e ela não
está em nenhuma lane em voo.

A B1 seguiu assim mesmo, e a razão é que a dependência é de HIGIENE, não de
autorização: sem a A4, uma conta de administração que comprasse veria a própria
compra na área — o que é verdade, não vazamento. O que a A4 conserta é o
vínculo nascer errado, e isso acontece do lado do ESCRITOR. Registrado para o
maestro sequenciar a A4 sem achar que a B1 a substituiu.

---

## `B1 · S1222-T1` — os dois callables do próprio dono da conta

**Arquivos**

- `functions/src/cliente/gateAreaCliente.ts` (novo) — o gate e as três
  respostas (`resolverContaDoCliente`, `callerDoToken`).
- `functions/src/cliente/leituraArea.ts` (novo) — as leituras compartilhadas
  (pedidos da conta, resumo dos eventos).
- `functions/src/cliente/minhasCompras.ts` (novo) — `getMinhasCompras`.
- `functions/src/cliente/meusIngressos.ts` (novo) — `getMeusIngressos`.
- `functions/src/index.ts` — exporta os dois.
- `packages/api-client/src/cliente.ts` (novo) + barrel — wrappers tipados.
- `firestore.indexes.json` — `fieldOverride` COLLECTION_GROUP de
  `inscritos.pessoaRef`.
- `functions/src/__tests__/areaDoCliente.integration.test.ts` (novo) — 29 casos.
- `firebase.areacli.json` (novo) — emulator DESTA lane, **IPv4 explícito**
  (`127.0.0.1`), portas 8580/9698. As configs existentes usam `::`.

**Decisões que a review deve atacar**

1. **Qual vínculo autoriza a leitura do pedido.** Existem dois e não são
   equivalentes: `pedidos/{id}.contaSemFriccao.contaUid` (carimbado sempre que
   o e-mail da compra resolve uma conta) e `pessoas/{ref}.contaUid` (que o
   anti-hijack pode ter RECUSADO). A lista usa o PRIMEIRO, porque o segundo
   sozinho apagaria a compra para terceiros — quem paga para a família sem se
   inscrever não tem CPF de pagador no pedido e veria zero compras depois de
   gastar o dinheiro (o defeito de 04/08 com outra roupa). Mas o primeiro **não
   é usado cru**: exige-se ainda que `responsavel.email` seja o e-mail
   VERIFICADO do token. A área fica **estritamente mais fechada que a Rule da
   RN-469**, que autoriza o mesmo doc sem checar verificação nenhuma — é a
   leitura que não piora o POSSE-EMAIL-1.
2. **Os ingressos vêm de DUAS fontes unidas.** (a) inscritos dos pedidos desta
   conta; (b) inscritos cuja `pessoaRef` é ficha reivindicada por ela. Só (a)
   apagaria quem foi presenteado; só (b) apagaria o pagador que não se
   inscreveu. Dedupe por `{eventoId}/{inscritoId}`.
3. **A fonte (b) exige ÍNDICE DE GRUPO NOVO.** O `fieldOverride` está no
   `firestore.indexes.json`, mas o Emulator **não cobra índice** — o teste verde
   não prova o deploy. Sem `firebase deploy --only firestore:indexes` a query
   lança `FAILED_PRECONDITION` em produção. Ela está isolada num try/catch que
   **não engole**: a lista continua com a fonte (a) e o resultado vem
   `listaCompleta: false`, que a tela DIZ.
4. **O recorte próximos/passados é do servidor.** Deixar o navegador decidir "já
   passou?" põe o fuso e o relógio de quem lê dentro de uma regra de negócio.
5. **O link do ingresso é cunhado dentro do callable**, com o mesmo token que o
   e-mail já entrega. Há caso provando que o `qrToken` cru nunca aparece no link.

## `5ffb69e0` — o achado cross-lane da BUILD-RF2-1 (PIXREAL-FIX T5)

`getMeusIngressos` assina o link do ingresso e **não declarava `QR_TOKEN_KEYS`
no `runWith`**. Era a mesma classe do P0 que originou esta rodada: a function
sobe verde, o keyring vem `null`, e a tela do dono mostra ingresso sem caminho —
como o `asaasWebhook` de 04/08, que engoliu o dinheiro sem emitir ingresso nem
erro. Corrigido: `runWith({ secrets: ['QR_TOKEN_KEYS'] })`.

`getMinhasCompras` **não precisa de binding** — o fecho transitivo dele não
toca nenhum acessor de segredo, e o contrato confirma.

O binding sozinho não bastava, e a lane foi além do pedido: se o ring faltar
mesmo assim, o caminho **grita** — `logger.error('area_cliente_qr_keyring_ausente',
{ alerta: true })` (uma vez por chamada, não por item) e o campo
`linksDisponiveis: false` na resposta, que o `PainelIngressos` renderiza como
aviso na tela.

**A escolha que a review deve atacar:** o caminho **não** lança
`failed-precondition`. Derrubar a leitura inteira apagaria da tela os ingressos
que a pessoa pagou por causa de uma variável de ambiente — o incidente de 04/08
visto do outro lado. A pessoa vê o ingresso e o código; o que falta é o atalho,
e a tela diz que falta. Se o maestro preferir fail-closed, é uma linha, e a
decisão é dele.

**Prova colada (`secretsBinding.contract`, na porta desta lane):**

```
 Test Files  1 passed (1)
      Tests  23 passed (23)
```

(Antes do fix: `1 failed | 22 passed`, com a mensagem
`getMeusIngressos → falta QR_TOKEN_KEYS`.)

---

## `B2 · S1222-T2` — a área na landing, e o interruptor

**Arquivos**

- `apps/landing/app/(public)/minha-conta/page.tsx` (novo) — Server Component
  fino, `noindex`, `force-dynamic`.
- `.../AreaDoCliente.tsx` (novo) — as três guardas + as abas.
- `.../EstadosDaArea.tsx` (novo) — porta de entrada, e-mail não verificado (com
  reenvio), falha de leitura.
- `.../PainelIngressos.tsx`, `.../PainelCompras.tsx` (novos).
- `apps/landing/lib/areaDoCliente.ts` — **`AREA_CLIENTE_NO_AR = true`**.
- `apps/landing/app/robots.ts` — `disallow: /minha-conta`.
- `apps/landing/next.config.js` — `no-store` + `no-referrer` + `X-Robots-Tag`.
- `functions/src/eventos/slug.ts` — `minha-conta` em `SLUGS_RESERVADOS`.
- `packages/api-client/src/auth.ts` + barrel — `enviarVerificacaoEmail()` (seam
  novo; o reenvio é aceite escrito da B2).
- `apps/landing/test/minha-conta-s1222.test.tsx` (novo) — 14 casos.

**Três guardas, nesta ordem, e a ordem é a regra.** Sessão que ainda não
resolveu não afirma nada; sessão não NOMEADA vê a porta (o uid anônimo do
checkout é sessão de verdade para o SDK — RN-451, primeira linha); e o estado
que o servidor devolveu vale como resposta, com `email_nao_verificado` tendo
tela própria e reenvio, nunca a lista vazia.

**Fronteira tocada fora do território, e por quê.** `functions/src/eventos/slug.ts`
recebeu **uma linha**. A BUILD-RF2-1 está em `functions/src/eventos`, mas este
arquivo não estava modificado por ela (conferido no `git status`), o commit é
`--only`, e o precedente é a lane anterior tendo feito o mesmo por
`definir-senha`. Sem a reserva, um evento com slug `minha-conta` ficaria
inalcançável (a rota estática vence a dinâmica no App Router) e o organizador
não teria como saber por quê.

**Higiene do commit (registro honesto).** `AreaDoCliente.tsx` e
`PainelIngressos.tsx` entraram no commit do secret (`5ffb69e0`) e não no da B2
(`3acfe7a8`), porque eram os arquivos que carregavam o `linksDisponiveis`. Os
dois commits são da mesma lane e do mesmo território; a B2 está inteira no
repo, distribuída em dois commits em vez de um.

---

## `S1225-T4` — o CTA que fecha a D-0804-2

**Arquivos**

- `apps/landing/lib/areaDoCliente.ts` — `ctaMeusPedidos()`, sobre a MESMA trava
  que decide o destino do `/definir-senha`.
- `.../checkout/AvisoPedidoEmConfirmacao.tsx` — o CTA, dentro do mesmo bloco da
  mensagem e da orientação de e-mail (é como o dono os descreveu).
- `.../checkout/StepConfirmacao.tsx` — comentário de fronteira atualizado.
- `apps/landing/test/checkout-s1225-feedback-pedido.test.tsx` — o bloco que
  afirmava a AUSÊNCIA do CTA foi **reescrito**, não apagado: ele agora prova a
  presença E o destino, e mantém a propriedade que importa (botão sem destino
  nunca). A afirmação anterior era temporária por contrato — a fila escreve
  "quando a B2 subir, a S1225-T4 destrava".

**Duas escolhas para a review.** (1) O rótulo diz "ingressos", não "pedidos": é
para a lista de ingressos que ele aterrissa. (2) O estado **PAGO segue sem o
CTA** — ali o ingresso com QR já está na tela, e mandar a pessoa para uma lista
no momento em que ela chegou ao destino é tirá-la de onde ela queria estar.

---

## `B3 · S1222-T3` — meus dados e trocar senha

**Arquivos**: `packages/api-client/src/atletas.ts` (novo) + barrel;
`.../minha-conta/PainelMeusDados.tsx` (novo); aba nova no `AreaDoCliente`;
`apps/landing/test/minha-conta-dados-s1222.test.tsx` (novo) — 9 casos.

**`firestore.rules` INTOCADO.** A fila lista `firestore.rules` no território da
B3, mas a Rule vigente (`match /atletas/{atletaId}` — `allow write: if
isSignedIn() && request.auth.uid == atletaId`) já cobre o caso inteiro. Nenhuma
Rule nova ⇒ nenhum teste de ataque de Rules ⇒ **a lane não disputou o arquivo
com a FIX-D1**. Isto é resultado, não omissão.

**A trava está no SEAM:** o uid vem de `currentUser`, nunca de parâmetro. As
Rules já negariam o doc alheio, mas um parâmetro de uid é um canal de input
onde não precisa haver nenhum — sem canal, o vetor "passar o uid de outra
pessoa" não existe para ser testado.

**A RN-450 é provada em DOIS níveis**: comportamento (o seam chamado recebe só
o nome) e varredura de texto-fonte (nenhuma superfície da área menciona
`profissionais`). Um caso de comportamento sozinho passaria verde no dia em que
alguém acrescentasse um segundo write ao lado.

---

## `B5 · S1222-T5` — as duas portas

**Arquivos**: `apps/landing/lib/portaOrganizador.ts` (novo, PURO);
`.../minha-conta/PortasDaConta.tsx` (novo);
`apps/landing/test/minha-conta-portas-s1222.test.tsx` (novo) — 15 casos.

**A regra não mora no componente.** `portaDaConta(claims)` é pura e falsificável
sem montar nada. Três respostas: `organizador` (conta que acumula),
`criar` (só cliente) e **`null` para `platform_admin`** — a RN-449 virando tela.

**O caso com o nome que a fila pede existe**: "nenhum caminho da área do cliente
alcança `/plataforma`", provado por três vias — nenhum `href` renderizado sob
QUALQUER papel, a string ausente de todas as superfícies da área, e o tipo
`RotaPainel` (`'/entrar' | '/cadastrar'`) tornando a proibição do COMPILADOR.

**Premissa que sustenta o desenho**: "botão para entrar na área de
administrador", na frase do dono, é a área do **organizador** (painel como
**ADMINSEP-2**, aguardando ratificação). Se o dono ratificar a outra leitura,
muda em `portaOrganizador.ts` e em nenhum outro lugar.

---

## Gates colados

**`tsc --noEmit`**

- `packages/api-client` — **zero**.
- `apps/landing` — **zero**.
- `functions` — **zero** na medição final. Durante a lane a saída teve 1 erro,
  e ele não era desta lane: `../packages/core/src/aleatorio.ts(52,28): error
  TS2304: Cannot find name 'Crypto'`, num arquivo **não versionado** de outra
  lane em voo. Ele sumiu quando aquela lane aterrissou. Em nenhum momento uma
  linha de `functions/src/cliente/**` apareceu na saída.

**`eslint --max-warnings 0`**

- `apps/landing`: `eslint app lib` — **zero**.
- `packages/api-client`: `eslint src` — **zero**.
- `functions`: `eslint src/cliente src/__tests__/areaDoCliente.integration.test.ts
  src/index.ts src/eventos/slug.ts` — **zero**.

**Suíte da landing INTEIRA, 2× seguidas por task**

| Momento | Resultado |
|---|---|
| Linha de base recebida | `50 arquivos · 618 testes` |
| B1 (2×) | `50 · 618` · `50 · 618` |
| B2 + S1225-T4 (2×) | `51 · 632` · `51 · 632`, depois `51 · 636` · `51 · 636` |
| B3 (2×) | `52 · 645` · `52 · 645` |
| B5 (2×) | **`53 · 660`** · **`53 · 660`** ← linha de base nova |

**⚠️ Um flake observado, e ele fica declarado.** Entre o commit da B2 e o da
S1225-T4, UMA execução deu `1 failed | 635 passed` e as **quatro** execuções
seguintes da mesma árvore deram verde. O nome do caso não foi capturado (a
saída foi filtrada), então não afirmo qual foi. É a mesma família de flake que
a lane anterior documentou (o teto de tempo do primeiro render por causa do
import do barrel do DS). Não repetiu em nenhuma das 10 execuções posteriores.

**Functions — SÓ os arquivos tocados, no emulator DESTA lane**
(`firebase.areacli.json`, `127.0.0.1:8580` / `9698`, JDK 21 em
`C:\Users\Vitor Eduardo\.jdks\jdk-21.0.11+10`):

```
areaDoCliente.integration.test.ts + slugReservado.test.ts + secretsBinding.contract.test.ts
 Test Files  3 passed (3)
      Tests  59 passed (59)
+  Script exited successfully (code 0)
```

A suíte completa de functions **não** foi executada, por gate do brief.

**`firestore.rules` intocado. Nenhuma Rule nova em nenhuma das cinco tasks.**

**Fronteira de território.** Nenhum arquivo de
`functions/src/eventos/{emitirIngressos,ingressosPendentes,varrerIngressosOrfaos}.ts`,
`functions/src/email/**`, `functions/src/checkout/webhookAsaas.ts`,
`firestore.rules` ou `packages/core/**` foi tocado. Todos os commits usam
`git commit --only`, arquivo a arquivo — a árvore tem trabalho de terceiro não
versionado (`packages/core/src/aleatorio.ts`,
`functions/src/__tests__/emissaoListaParcial.integration.test.ts`).

---

## Para o maestro selar (não editei `leela-specs/`)

- **V1-KANBAN · `S1222`** → `T1` ✅ `9acb8fb5`, `T2` ✅ `3acfe7a8`, `T3` ✅
  `cdef2987`, `T5` ✅ `bdebe384`, **`T4` ABERTA** (Meus Clubes e convites).
- **V1-KANBAN · `S1225`** → `T4` ✅ `9fd12c74`. **A S1225 fecha**: a decisão
  D-0804-2 do dono está inteira em código.
- **V1-KANBAN · `S1223`** → `T1` continua ✅, e agora a jornada **termina em
  Meus Ingressos** (o interruptor virou). `T3` segue aberta (operação — ver
  abaixo).
- **`LEELA-E12-landing`** — a landing passou a ter uma ÁREA AUTENTICADA
  (`/minha-conta`), com quatro superfícies novas e três seams novos no
  api-client. É premissa nova da spec.
- **DECISOES-ABERTAS** — a entrada de 03/08 "o login no meio da landing" está
  **fechada**: login (lane anterior) + área (esta). A entrada da D-0804-2 (o
  feedback pós-compra) também fecha.
- **`firestore.indexes.json` mudou** — o `fieldOverride` COLLECTION_GROUP de
  `inscritos.pessoaRef` é NOVO e o deploy de índices é **pré-requisito do deploy
  destas functions**. Ver "operação", abaixo.
- **Painel do dono** — a **C3** da lane anterior (autorizar
  `leela-landing.web.app` nos Authorized Domains do Auth) continua aberta e
  ficou MAIS urgente: agora ela é o que faz a jornada de primeiro acesso
  terminar na área.
- **ADMINSEP-2** (o "botão de administrador" é a área do organizador) — a B5
  implementou a leitura corrente; a ratificação do dono continua pendente e o
  ponto de mudança é único.
- **A4 (`S032-T4`) não aterrissou** e é a dependência declarada da B1. É o item
  de código mais urgente que sobra desta frente.

## Operação (o maestro sequencia; a lane não deploya)

1. **`firebase deploy --only firestore:indexes` ANTES** do deploy das functions.
   Sem ele, `getMeusIngressos` degrada para `listaCompleta: false` e quem foi
   presenteado não vê o próprio ingresso. O Emulator não cobra índice, então
   nenhum teste desta lane prova este passo.
2. **`QR_TOKEN_KEYS` precisa estar no Secret Manager** e o binding já está
   declarado. Se o segredo faltar, o log `area_cliente_qr_keyring_ausente`
   (severidade ERROR, com `alerta: true`) é o sinal — vale casá-lo na política
   de alerta junto dos outros incidentes de e-mail.
3. **C3 (Authorized Domains)** antes do deploy da C2, como a lane anterior já
   registrou.

---

## Vetores para a review antagonista (contexto fresco)

Esta lane é ⚔. Em ordem de risco:

1. **O vínculo que autoriza o histórico (`leituraArea.ts`).** A query é
   `contaSemFriccao.contaUid == uid` e o filtro de e-mail é em MEMÓRIA. Vetores:
   um pedido cujo `responsavel.email` tenha maiúsculas/espaços; `email` não-string
   ou objeto; e a pergunta-mãe — existe combinação em que a lista devolva pedido
   de outra conta? A resposta pretendida é não (a igualdade de uid é o
   isolamento; o e-mail é re-checagem). Atacar também o caminho inverso: alguém
   que DEVERIA ver e não vê (conta que trocou de e-mail depois do claim — o
   fail-closed é deliberado e igual ao do prefill, mas é uma decisão).
2. **A fonte (b) dos ingressos (`collectionGroup('inscritos').where('pessoaRef','in',…)`).**
   Vetores: `pessoaIds` com mais de 30 (o `slice` corta silenciosamente — isso é
   perda de linha sem `listaCompleta: false`?); ficha reivindicada por esta conta
   mas com `contaEmail` de outra; e o caso em que a fonte (a) e a (b) discordam
   sobre o MESMO inscrito.
3. **`linksDisponiveis` e a escolha de não lançar.** Atacar a decisão de servir
   ingresso sem link quando o keyring falta. Medir se o log de ERRO realmente
   produz pendência observável, e se a frase da tela não induz a pessoa a achar
   que o ingresso não existe.
4. **A guarda de sessão da área (`AreaDoCliente.tsx`).** Vetores: `nomeado`
   verdadeiro com `uid` nulo; a corrida entre `onSessionChange` reemitindo e o
   `Promise.all` em voo (o `vivo` fecha isso? e no `tentarDeNovo`?); e o caso do
   provedor sem e-mail, que o servidor classifica como `email_nao_verificado` e a
   tela oferece reenviar verificação para uma conta que talvez não tenha e-mail.
5. **`portaDaConta` (B5).** Vetores: claim `role` com `__proto__`/`constructor`;
   `tenantId` string de espaços; um `platform_admin` cujo token esteja velho e
   ainda traga `tenant_owner`. E a pergunta que a fila nomeia: existe QUALQUER
   caminho da área até `/plataforma`?
6. **`salvarMeusDados` (B3).** A Rule de `atletas/{uid}` é `write` livre para o
   dono, sem validação de shape. Vetores: nome gigante, nome com HTML, e o
   grande: existe caminho por onde esta tela escreva campo que o cliente não
   deveria escrever (o `merge` protege o que existe, mas não proíbe campo novo)?
7. **O CTA do checkout (S1225-T4).** Vetor: o link dentro de uma
   `role="status"`/`aria-live` — ele é re-anunciado? E a jornada: clicar nele no
   PIX pendente tira a pessoa da tela do QR (por isso é `<a>`, mas vale medir se
   a perda do QR acontece na prática).
8. **A superfície pública nova.** `/minha-conta` é `noindex` + `no-store` +
   `disallow`, mas é rota nova na landing e o S1200 (busca e velocidade) é gate
   próprio. Vetor: o peso do bundle do DS chegando por mais um boundary de
   cliente.

## Conferência VISUAL do dono (nenhuma lane abriu navegador)

1. **`/minha-conta` entrando pelo header**: as quatro superfícies — a lista de
   ingressos em próximos e passados, o histórico de compras, "meus dados" e as
   portas do rodapé. Contraste AA por estado (foco, erro, desabilitado) e o
   comportamento em **320px** (os cartões viram coluna; as abas com contagem
   podem estourar a linha).
2. **A tela de "confirme seu e-mail"** — só aparece para conta sem
   `email_verified`. Vale forçar uma para ver a frase e o botão de reenvio.
3. **O CTA "Ver meus ingressos" na confirmação do checkout**, no bloco azul de
   "Estamos confirmando o seu pedido": posição, contraste do botão sobre
   `feedback-info-surface` no tema brasa, e se ele não briga com o QR do PIX
   logo abaixo.
4. **A jornada real, depois do deploy E da C3**: comprar → receber o e-mail →
   clicar → definir a senha → **cair em Meus Ingressos com o ingresso na tela**.
   É o aceite que o dono espera desde o PIX real de 04/08, e agora ele tem as
   duas pontas.
5. **A porta do organizador** com uma conta que acumula (exige conta com tenant
   no ambiente): ela aparece, leva ao painel, e a conta só-cliente vê a outra.
6. **O vazio honesto**: entrar com uma conta sem nenhuma compra e conferir que a
   frase é "você ainda não tem ingressos", e não uma tela de erro.

## Pendências declaradas (não são desta lane)

- **B4 · `S1222-T4`** — Meus Clubes e a caixa de convites. Não iniciada.
- **A4 · `S032-T4`** — dependência declarada da B1, ainda aberta.
- **C3 · `S1223-T3`** — operação, herdada da lane anterior e agora mais urgente.
- `apps/painel/src/routes/conta/auth/_lib/{authErrors,authValidation}.ts`
  continuam DUPLICANDO `@leela/api-client/authMensagens` — pendência da lane
  anterior, território `apps/painel`, não disputada aqui.
