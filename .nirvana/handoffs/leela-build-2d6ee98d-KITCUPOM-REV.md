# Handoff vivo · lane KITCUPOM-REV · trace leela-build-2d6ee98d · 2026-08-02/03

Reviewer: sf-qa-engineer (software-forge), contexto fresco, sem participação na
construção. Brief: `.nirvana/briefs/leela-build-2d6ee98d-KITCUPOM-REV-enriched.md`.
Base: `main` em `4fe085b`. Sem push — o maestro pusha.

Alvos: pacote **KITCUPOM-BUILD** (frentes A e B + X1), o **código de dinheiro do
PIXFIX-EXTREF** e a decisão sobre o **defeito de re-cotação do cupom**.

Base medida no início, ANTES de qualquer edição minha:

| Suíte | Números |
|---|---|
| landing (cheia, single-fork) | **301/301** em 26 arquivos, 31,22 s |
| `storageRules.integration` (emulator 8080/9199) | **71/71** |
| `asaasProvider` + `webhookAsaas.integration` + `asaasTetoCheckout.integration` | **117 passed / 1 skipped** (118) |
| `afiliados.integration` + `afiliadoCore` + `parceriaCore` | **63/63** |
| `vendasRules.integration` | **36/36** |

Todos os números que os dois builders declararam bateram na minha máquina, com
emulator meu. Nenhum inflado.

## Veredito

**APROVADA COM RESSALVAS.** Dois defeitos confirmados, os dois no território de
dinheiro, os dois consertados nesta lane com teste que **falha antes e passa
depois** (falsificação executada e registrada). Nenhum deles invalida as lanes:
o D-1 é um buraco aberto pela própria mitigação que a B3 introduziu, e o D-2 é
herdado da S1209 — o builder da B2 o encontrou, escalou e não o corrigiu, e a
decisão que o brief delegou a mim é "é dinheiro exibido, conserta".

Os 12 vetores ⚔ da fila passam (o 12 passa **depois** do fix do D-1). Cinco
travas eu quebrei de propósito para ver se alguém reclamava: abri o gate da
RN-315, troquei o slot literal de foto por regex de dígito, abri a leitura de
`cupons` nas Rules, inverti a precedência do desempate de comissão e desliguei a
checagem de parceria ativa. Nos cinco a asserção mordeu, com a mensagem
transcrita abaixo. Teste que não morde quando o código quebra não é prova de
nada — e os dois fixes desta lane passaram pela mesma régua, revertidos para
provar que os testes novos reprovam a versão anterior.

---

## Bloco A · pacote KITCUPOM-BUILD — os 12 vetores ⚔

### ⚔ 1 · o kernel não foi tocado

`git show --name-only` dos **dez** commits da lane (`5a02f20`, `4809d5b`,
`637dd92`, `d63b703`, `fd1c6f2`, `ae7538f`, `ddb635d`, `2651bb4`, `ac92f33`,
`e4b2e3d`) filtrado por `functions/src/checkout/`: **zero arquivos nos dez**.
`firestore.rules`: **zero nos dez**. `storage.rules`: só em `4809d5b`, que é o
território declarado da A1 na fila.

**PASS.** A afirmação do builder ("`git diff --stat` vazio") era por commit; a
minha é por lane inteira, que é a pergunta que o vetor faz.

### ⚔ 2 · os dois desempates de comissão — falsificado

`afiliados.integration` D6/D7, **38/38** no arquivo, no meu emulator.

Falsificação: inverti a precedência no kernel (`if (cupomAfiliado !== null)` →
`if (cupomAfiliado !== null && refCodigoInput === null)`, isto é, o `?ref=`
passando a ganhar do cupom) e rodei só o D6:

```
× D6 (S1215-T1 · RN-433): link de A + cupom digitado de B ⇒ B leva a comissão
  → expected { afiliadoId: 'AFILIADOA', …(3) } to match object { afiliadoId: 'AFILIADOB', …(2) }
```

Kernel restaurado byte a byte (`git status` limpo em `functions/`). **PASS** —
a asserção morde, e morde no campo certo.

### ⚔ 3 · o gate da RN-315 continua fechando — falsificado

Falsificação: `if (!gateAberto) return null;` desligado em `leitor.ts`.

```
× ⚔ 7 — inexistente, expirado, esgotado, de outro evento e escopo não satisfeito respondem IGUAL
  → AssertionError: expected { codigo: 'ABAIXODOMIN', …(1) } to be null
```

O afiliado com `minimoInscricoes: 20, conversoes: 3` volta a vazar assim que o
gate abre. Retroativo: `descontoAfiliadoAtivo` é `conversoes >= minimoInscricoes`
sem histórico — a venda que cruza o mínimo não ganha desconto, as seguintes sim.
**PASS.**

### ⚔ 4 · nenhum domínio de terceiro sai do gerador

Duas coisas, medidas por leitura e por grep:

- `montarLinkPromocional` é o **único** produtor de link no repo. Varredura de
  `?ref=` / `` `${base} `` / `linkMaster` em `apps/painel/src`, `apps/landing`,
  `packages/core/src` fora de teste: os únicos hits que montam link são as
  linhas 102 e 115 do próprio gerador. O hit restante
  (`MinhasAfiliacoesPage.tsx:212`) é texto de instrução do caminho degradado, não
  URL.
- `basePromocional()` no painel **não tem fallback**: sem `VITE_LEELA_URL`, o
  gerador devolve `null` e a tela diz `MSG_SEM_LINK_PROMOCIONAL`. `beh.ro` só
  aparece em comentário.

**PASS**, com a ressalva R-2 abaixo (o `PUBLIC_BASE`, que serve navegação
interna, ainda tem `https://be-hero.com.br` cravado como fallback).

### ⚔ 5 · o apelido `c` entra e não sai

`montarLinkPromocional` só empurra `CHAVE_CUPOM_URL` (`'cupom'`); `c` só existe
em `cupomDaEntrada`, que é leitura. Provado nas três bordas que leem URL:
`cupom-banner-s1215` ("`?c=` também acende a faixa"), `cupom-link-s1215`
("aceita o apelido `?c=`") e `linkPromocional.test.ts`. **PASS.**

### ⚔ 6 · Rules intocadas e cliente sem ler `cupons` — falsificado

`firestore.rules` sem uma linha desta lane (vetor 1). `vendasRules.integration`
**36/36** no meu emulator.

Falsificação: `allow read` de `cupons` trocado por `if true;`.

```
× cupons — leitura SÓ writer (catch-all NÃO vaza — lição A-T2)
  → Expected request to fail, but it succeeded.
```

Rules restauradas. **PASS.**

### ⚔ 7 · sem oráculo

`new Set(respostas.map(JSON.stringify)).size === 1` para as sete recusas
(inexistente, expirado, esgotado, de outro tenant, escopo não satisfeito, gate
fechado, documento envenenado). Re-executado por mim: **18/18** no arquivo.
Código fora de forma custa **0 leituras**. **PASS**, com a ressalva R-3 (o canal
de tempo continua aberto e não é reivindicado por ninguém).

### ⚔ 8 · nada além do nome sai do afiliado

`Object.keys(r).sort() === ['codigo','promotor']` e o serializado sem documento,
e-mail, telefone, uid, percentual e estado do gate. Li o `resolverCupomDoLink`
linha a linha: o único campo que atravessa é `dados['nome']`. **PASS.**

### ⚔ 9 · escopo de club parceiro respeita a parceria — falsificado

Falsificação: checagem de `status !== 'ativa'` desligada.

```
× ⚔ 7 — … respondem IGUAL
  → AssertionError: expected { codigo: 'DOCLUBE', promotor: null } to be null
```

As duas guardas de path (prefixo dentro do tenant e profundidade exata de 4
segmentos) são independentes da de status e têm caso próprio. **PASS.**

### ⚔ 10 · a página do evento continua estática

`next build` da landing com as minhas correções dentro: exit **0**, rota
`/[eventSlug]` marcada **`ƒ`** — o mesmo marcador de `.nirvana/landing-build.log`.
`revalidate = 300` intocado; `package.json` da landing sem diff em toda a lane.
**PASS.**

### ⚔ 11 · o número continua sendo do servidor

A faixa não renderiza `R$` nem `%` (asserção no texto do `role="status"`). A
marca do resumo é `<span>` de texto dentro do `<dt>`; o `<dd>` continua sendo
`formatarPreco(cotacao.desconto)`, valor inteiro da cotação. Nenhuma soma no
cliente. **PASS** — e o D-2 abaixo reforça: depois do meu fix, remover o cupom
descarta a cotação em vez de manter um número velho na tela.

### ⚔ 12 · custo de raspagem — **FALHOU. Defeito D-1 confirmado e corrigido.**

O que o vetor pede: medir quantas leituras uma sequência de códigos inválidos
provoca. Isso o builder mediu e está certo (50 tentativas no mesmo código = **2
leituras**; re-executado por mim). O que ninguém mediu é o **preço em memória**
da mitigação, e é ali que ela cobra.

Ver "Defeitos confirmados · D-1".

### ⚔ extra · o teto de três fotos atacado pelo Storage — falsificado

O brief pede explicitamente. Falsificação: `slot == '2' || slot == '3'` trocado
pela regex de dígito que "facilitaria".

```
× QUARTA foto é impossível: slot fora de {2,3} NEGADO (teto estrutural)
  → Error: Expected request to fail, but it succeeded.
```

`storage.rules` restaurado; `storageRules.integration` volta a **71/71**.
**PASS** — o teto é estrutural mesmo, não combinado.

---

## Bloco B · o código de dinheiro do PIXFIX-EXTREF

Vetores mínimos do brief, um a um. Suítes re-executadas por mim: **117 passed /
1 skipped**.

### A idempotência sobrevive ao digest — PASS

Medido com id de tamanho real (uid 28 + chave 40 ⇒ `pedidoId` 73):

| Pergunta | Medido |
|---|---|
| mesma chave ⇒ mesmo `externalReference`? | sim, **91 chars**, estável |
| chaves distintas colidem? | **20.000 chaves ⇒ 20.000 digests distintos**, zero colisão |
| o lookup acontece antes do POST? | sim — `validarCreateCharge` → `buscarPorExternalReference` → POST, nessa ordem |

O sufixo nunca carregou informação (no único caller a chave é
`charge-${pedidoId}`, função pura do prefixo), então o digest não perde nada. E
o prefixo fica verbatim, que é de onde o webhook tira o `orderId`.

### O webhook resolve `orderId` no formato velho E no novo — PASS

| Entrada | `parseExternalReference` |
|---|---|
| `ped-…::<digest16>` (91 chars, formato novo) | `orderId` correto |
| `ped-…::charge-ped-…` (155 chars, formato antigo) | `orderId` correto |
| `cobranca-do-painel-asaas` (sem `::`) | `undefined` → ACK sem efeito |
| `''`, `'::'`, `'::x'` | `undefined` (o `idx <= 0` cobre os três) |
| `ped-…::a::b` | `orderId` correto (corta no PRIMEIRO `::`) |

Produção não tem dado velho (0 × 200 na janela da INV), mas o parser também não
explode com ele. **PASS.**

### A guarda recusa ANTES do POST — PASS

`asaasProvider.test.ts`: `orderId` de 83 chars ⇒
`AsaasExternalReferenceTooLongError` com `chamadas.length === 0`. Zero HTTP,
zero lookup. E a guarda reconstrói o valor com o **mesmo** `buildExternalReference`
do `createCharge`, então não tem como divergir do que seria enviado.

### Nenhum caminho re-imprime "internal" — PASS

Reencenação com 5xx sintético (`ProviderComApiError(500, [])`) ⇒
`code = 'unavailable'`, mensagem = `MSG_GATEWAY_RECUSOU` limpa. 429 ⇒
`resource-exhausted`. 400 verbatim de 02/08 ⇒ `failed-precondition`,
`gatewayCodigos = 'invalid_externalReference'`, e
`expect(e.message).not.toContain('exceeds the maximum size')`.

### O `err.message` cru fica só no log — PASS

A mensagem que atravessa a fronteira é a constante + os `codes` do provedor
(nomes de campo, não valores). O `detalhe: err.message` — que carrega o valor
recusado, e o valor carrega o uid — só aparece no `logger.error`. Li o ramo
inteiro: não há outro caminho de saída.

### Achado registrado (sem fix): RN-333 publica 8–64, a guarda aceita até 49

Aritmética medida, não deduzida: varri `n` de 8 a 64 montando
`ped-{uid28}-{'k'×n}` e reconstruindo o `externalReference`.

```
{"chaveMax":49,"rn333Max":64,"landingEmite":40}
```

Chave de **50 a 64 chars** é aceita pelo `IDEMPOTENCY_KEY_RE` na fronteira da
callable e recusada depois, no adapter. Hoje não há caminho vivo (a landing
emite 40 por construção, `chk-` + `randomUUID`), e a recusa é NOMEADA e anterior
ao POST — falha controlada, não cobrança dupla. Mas o contrato publicado e o
contrato aplicado divergem, e nada no repo pina a divergência.

Isto é exatamente a premissa 3 do builder, e ela é decisão do dono (apertar a
RN-333 para 49, ou encurtar o `pedidoId`). **VETO-DONO**, registrado abaixo.
Não escrevi teste pinando a divergência de propósito: um teste que afirma "49"
abençoaria a contradição em vez de fechá-la.

---

## Bloco C · o defeito da re-cotação do cupom — decidido: **é dinheiro exibido**

Ver "Defeitos confirmados · D-2". Decisão: **FIX nesta lane**, com quatro casos
de regressão.

---

## Defeitos confirmados

### D-1 · o cache do cupom do link crescia sem limite, com a chave vinda do chamador

Commit do fix: `f68b22b`.
Prova: `apps/landing/test/cupom-link-cache-teto.test.ts` (5 casos).

`verificarCupomLinkAction` é uma **ação de servidor**: qualquer um a endereça,
com os argumentos que quiser. O `codigoBruto` passava por `isCodigoCupomValido`;
o `eventoSlug` passava só por `trim().length === 0`. A chave do cache é
`${eventoSlug}|${codigo}`, o `Map` é módulo-level, e nada evictava — nem a
entrada vencida.

Medido com o duplo de Firestore, ANTES do fix:

| Ataque | Resultado |
|---|---|
| 2.000 códigos distintos + 2.000 slugs distintos | **4.000 entradas permanentes** no `Map` |
| slug de **200.000 caracteres** | aceito, 1 leitura, e a chave inteira guardada |
| slug `a/b/c` | aceito e guardado |

DEPOIS do fix, no mesmo probe: **500 entradas** (o teto) e **0 leituras / 0
entradas** para os slugs fora de forma.

O alvo do estrago é o `ssrleelalanding`, que serve **também** a página de compra:
estourar a memória da instância derruba o checkout junto. A ironia é que o cache
existe como mitigação de raspagem (⚔ 12) e era, ele próprio, o caminho barato de
negação de serviço — o sondador não precisava nem de códigos válidos.

Fix, três peças pequenas e nenhuma mudança de comportamento para tráfego real:

1. o **slug** passa pela mesma régua do código (não vazio, ≤ 100 chars, sem `/`)
   — entrada fora de forma não custa leitura nem entrada de cache;
2. teto de **500** entradas, com evicção da **mais antiga** (o `Map` do JS
   preserva ordem de inserção, então quem insere chave nova sem parar é o
   primeiro a ser despejado — o sondador);
3. `tamanhoCacheCupomLink()` exportado só para teste, porque o efeito tinha de
   continuar **medível** (que foi a razão declarada de não usar `unstable_cache`).

Errar o teto para baixo custa **uma leitura a mais**, nunca um número errado: o
valor do desconto não sai daqui.

Falsificação do meu próprio fix (revertidas as duas peças):

```
× mil códigos distintos não passam do teto de entradas       → expected 1000 to be 500
× slugs distintos também não fazem o Map crescer sem fim     → expected 1000 to be 500
× a evicção é da entrada mais ANTIGA                         → expected 501 to be 500
× slug fora de forma NÃO custa leitura nem entrada de cache  → expected [ …(3) ] to have a length of +0 but got 3
```

O quinto caso ("o MESMO código, 50 vezes, custa 2 leituras") passa nos dois
mundos de propósito: ele é a guarda de que o fix não desfez o ganho declarado.

### D-2 · "Remover" no step 0 deixava a tela prometendo um desconto que não existia mais

Commit do fix: `f249f33`.
Prova: `apps/landing/test/checkout-kitcupom-rev-remover.test.tsx` (4 casos).

Herdado da S1209 e escalado pelo builder da B2 (o brief me delegou a decisão).
Reproduzido, e é pior do que o relato:

```
ANTES:  Cupom FLORIPA10 aplicado — menos R$ 500,00
clique em "Remover"
DEPOIS: Cupom FLORIPA10 aplicado — menos R$ 500,00
CAMPO DE CUPOM VISIVEL? false
CHAMADAS DE COTACAO: 1
```

O mecanismo: `removerCupom` limpava o estado (`cupomAplicado`, `cupomDoLink`) e
**não** descartava a cotação. O `CupomCampo` do step 0 lê
`cotacao?.cupomAplicado?.codigo`, e o efeito de cotação só roda a partir do step
2 (`precisaCotar = step >= 2`) — logo nada substituía o número velho, **nunca**.
E como o campo de digitação só existe quando não há código aplicado, a pessoa
também não conseguia reaplicar: desligava o desconto, a tela seguia prometendo
desconto, e não havia caminho de volta sem recarregar a página.

Por que é dinheiro e não rótulo: o valor exibido (`menos R$ …`) é o desconto de
uma cotação que já não vale, na tela onde a pessoa decide se continua. No PAGAR
o servidor recota e cobra o valor cheio — quem leu o step 0 acredita que tem
desconto e paga sem ele. É a mesma família do D-2 da CKUX-REV ("ler um valor e
autorizar outro"), um passo antes.

Fix, duas linhas em `removerCupom`: `assinaturaCotadaRef.current = null` e
`setCotacao(null)`. A cotação velha é descartada, o campo volta, e no PAGAR o
efeito recota na hora — com o botão de pagar já travado por `totalDefasado`
(o fix da CKUX-REV) enquanto a nova cotação está no ar. No step 0 não há bloco
de totais, então descartar basta e **nenhum round-trip novo é gasto** (há um
caso pinando isso).

Falsificação do meu fix (as duas linhas removidas): 3 dos 4 casos caem.

```
× o rótulo "Cupom X aplicado — menos R$ …" some no ato do clique
× o campo de digitação VOLTA — sem ele a pessoa fica sem caminho de volta
× reaplicar depois de remover volta a funcionar, e o número vem do SERVIDOR
```

O quarto ("remover NÃO recota sozinho no step 0") passa nos dois mundos: é a
guarda de custo.

**Efeito colateral verificado:** no step 2 o mesmo `setCotacao(null)` faz o
resumo exibir o estado sem total por um instante em vez de exibir o total
**com** desconto que já não existe. `StepResumo` lê tudo por `cotacao?.` e tem
fallback `—`; a suíte cheia da landing continua verde.

---

## Premissas dos builders: endossadas vs VETO-DONO

### KITCUPOM-BUILD (18)

| # | Premissa | Veredito |
|---|---|---|
| 1 | upload não usa `slot = posicao` | **ENDOSSADA.** Li `slotDeUploadFotoKit`: o slot sai do sufixo do path dentro da downloadURL, com `endsWith` (e não `includes`, que faria `.../fotos/2` casar como principal). O defeito que ele descreve é real e alcançável em quatro cliques; fechar valia mais que embarcar. |
| 2 | `removerFotoPrincipal` no core | **ENDOSSADA.** Mesma propriedade da promoção — é capaz de violar a forma da RN-425. |
| 3 | vaga 3 só abre depois da 2 | **ENDOSSADA.** A ordem do array É a ordem de exibição (RN-425); vaga vazia no meio produz buraco na fita. |
| 4 | alt posicional na foto grande | **ENDOSSADA.** |
| 5 | `montarLinkAfiliado` removido do core | **ENDOSSADA.** Confirmei por grep que não havia chamador em `apps/**`, e o vetor 4 depende de haver **um** gerador. |
| 6 | `VITE_LEELA_URL` no `.env.leela-hub` | **ENDOSSADA**, com a R-2: a variável entrou, mas o fallback `https://be-hero.com.br` do `PUBLIC_BASE` continua no código. |
| 7 | fixture de parceria com `refCodigo` | **ENDOSSADA.** |
| 8 | chave de storage separada para o cupom | **ENDOSSADA.** Escrever no registro que decide comissão para guardar um claim de marketing seria trocar um risco de UX por um de dinheiro. |
| 9 | a marca do resumo carrega o código do cupom | **ENDOSSADA** (é texto; o número segue vindo da cotação). |
| 10 | "Remover" desliga o cupom do link | **ENDOSSADA** — e agora com o D-2 fechado ela está completa: remover desliga o cupom **e** a cotação que ele produziu. |
| 11 | cache é `Map` por instância, não `unstable_cache` | **ENDOSSADA na escolha, CORRIGIDA na execução.** A razão (o efeito precisa ser medível) está certa e é o que permitiu medir o D-1. O que faltava era o teto — ver D-1. |
| 12 | faixa alimentada por ação de servidor | **ENDOSSADA**, com a consequência que o D-1 expôs: ação de servidor É superfície pública, e os argumentos dela precisam da mesma disciplina de um handler. |
| 13 | `aposHero` é slot, não seção do registro | **ENDOSSADA.** |
| 14 | TTL de 60 s | **ENDOSSADA.** |
| 15 | 2º link de demonstração SEM cupom | **ENDOSSADA.** É a forma que a RN-429 nomeia, e o `RITMOFORTE10` é escopado. |
| 16 | `linkMaster` do seed vira string vazia | **ENDOSSADA.** |
| 17 | `alt=""` na galeria do evento | **ENDOSSADA.** Descrever com precisão reintroduziria a afirmação de corrida numa galeria de exemplo servida a qualquer evento; descrever vagamente descreveria errado. |
| 18 | tile "Largada" → "Início" | **ENDOSSADA.** |

### PIXFIX-EXTREF (5)

| # | Premissa | Veredito |
|---|---|---|
| 1 | digest no sufixo, prefixo verbatim | **ENDOSSADA.** Medida: mesma chave ⇒ mesmo ref; 20.000 chaves ⇒ 20.000 digests. A alternativa que ele recusou (`externalReference = orderId` puro) mataria o `::`, que é o discriminador do webhook. |
| 2 | `parseExternalReference` devolve `idempotencyDigest` | **ENDOSSADA.** Conferi os três consumidores (`webhookAsaas`, `webhookPagamento`, `index`): nenhum lê esse lado. |
| 3 | RN-333 (8–64) NÃO foi apertada | **VETO-DONO.** Consequência de deixar como está: o contrato publicado promete chave de até 64 e a plataforma recusa a partir de 50 — divergência silenciosa no caminho do dinheiro, hoje sem caminho vivo (a landing emite 40). |
| 4 | `MOTIVO_GATEWAY_RECUSOU` nasce em `functions/`, não no core | **ENDOSSADA** enquanto a UI renderizar `error.message`. Vira follow-up se o dono quiser tela própria. |
| 5 | a mensagem não afirma "nada foi cobrado" | **ENDOSSADA.** Num 5xx isso seria mentira, e uma frase que muda por status se perde na próxima edição. |

---

## Ressalvas (risco registrado, sem fix nesta lane)

- **R-1 · o teto do cache é por instância, e o número real de instâncias
  quentes ninguém conhece.** O fix do D-1 fecha o crescimento sem limite; o que
  continua verdadeiro é o que o builder já tinha escrito: com N instâncias, o
  teto de leituras por código por janela é N, não 1. Se um dia a raspagem virar
  problema de custo (e não de memória), a resposta é limite por origem, que não
  existe no ferramental e a RN-432 não reivindica.
- **R-2 · `PUBLIC_BASE` ainda cai em `https://be-hero.com.br`.** É navegação
  interna do organizador ("Ver página pública"), não link gerado, então o vetor
  4 não é violado. Mas é domínio de terceiro cravado no código depois da RN-423
  ter expulsado o mesmo domínio do e-mail da compra. Custo de fechar: trocar o
  fallback por `null` e a tela dizer que o ambiente não tem base — uma linha.
- **R-3 · a resposta é uniforme em conteúdo, não em tempo.** Um cupom que existe
  mas falha no escopo custa 3 leituras; um inexistente custa 2. A diferença é
  medível por amostragem e distingue "código existe" de "código não existe". A
  RN-432 declara que as mitigações são resposta uniforme + cache, e nada além —
  então isto é limitação conhecida, não regressão. Registro o número para quem
  reabrir o assunto.
- **R-4 · o `CupomTracker` guarda o cupom sem prazo.** Uma captura de meses
  atrás auto-aplica numa compra nova. O servidor revalida tudo e o pior caso é
  o banner honesto de recusa, mas o `?ref=` tem janela de atribuição e o cupom
  não tem nenhuma. Não é defeito de dinheiro (o valor nunca vem do storage);
  é assimetria entre os dois claims.
- **R-5 · erro que não é do adapter continua saindo como `internal`.** É o ramo
  `throw err` do `garantirCobrancaEMontarResultado`, e é intencional (a tradução
  não engorda). O vetor do brief é sobre recusa do gateway, e essa está fechada.
  Registro que a palavra `internal` ainda é alcançável na tela do dinheiro por
  um defeito nosso — só não por um do provedor.
- **R-7 · o botão de pagar não olha para `total === null`.** `disabled` é
  `criandoCharge || !aceitesOk || totalDefasado`; sem cotação o rótulo degrada
  para `Pagar` (sem número, `totalLabel` vazio — não há `NaN`) e o botão segue
  clicável. É pré-existente, e o caminho vivo é a cotação que **falhou**
  (`setCotacao(null); setErroCotacao(...)` com `cotando` em `false`). Não é
  mentira sobre dinheiro (não há número na tela para ler errado) e o servidor
  precifica sozinho, então não consertei. Registro a condição: **se alguém
  precisar que o PAGAR só aceite clique com número na tela, a linha é somar
  `total === null` ao `disabled` dos dois botões.**
- **R-6 · `functions/scripts/**` segue fora de todos os gates** (R-1 da
  CKUX-REV, ainda aberta). A B4 desta lane escreveu em
  `functions/scripts/preview-seed-clubes.ts`, e o `type-check` padrão do repo
  não cobre esse diretório — o builder precisou de um tsconfig estendido para
  provar. Continua sendo decisão de arquitetura do CTO, não de reviewer.

---

## Gate final

| Superfície | Resultado |
|---|---|
| landing · suíte cheia (`--pool=forks --singleFork`) | **310/310** em 28 arquivos, 30,02 s (301/26 na base; +9 dos meus dois arquivos) |
| landing · `tsc --noEmit` | exit **0** |
| landing · `eslint app lib test --max-warnings 0` | exit **0** |
| landing · `next build` | exit **0**, rota `/[eventSlug]` segue **`ƒ`** |
| painel · `tsc --noEmit` | exit **0** |
| painel · `eslint src --max-warnings 0` | exit **0** |
| painel · suíte cheia (pool padrão) | **1768/1768** em **190 arquivos**, 444,15 s |
| painel · `tsc --noEmit` | exit **0** |
| painel · `eslint src --max-warnings 0` | exit **0** |
| core · `tsc --noEmit` / `eslint src` | exit **0** / exit **0** |
| api-client · `tsc --noEmit` | exit **0** |
| functions · `tsc --noEmit` / `eslint src` | exit **0** / exit **0** |
| functions · suítes dirigidas no emulator (8080/9099/9199) | `storageRules` **71/71** · `vendasRules` **36/36** · `afiliados.integration`+`afiliadoCore`+`parceriaCore` **63/63** · `asaasProvider`+`webhookAsaas.integration`+`asaasTetoCheckout.integration` **117 passed / 1 skipped** |

Zero flake observado: a suíte cheia da landing rodou 2× em single-fork nesta
lane, sempre verde; cada teste de falsificação rodou 2× (com a trava e sem).

**Uma nota de método, para não inflar o gate.** Rodei o painel primeiro com
`--singleFork`, copiando a receita da landing, e isso está **errado** para este
app: o `vitest.config.ts` do painel diz por escrito que os tetos de tempo foram
dimensionados para a suíte rodando em **processos paralelos** (são 190 arquivos
contra 28 da landing). Serializado, o run passou de 12 minutos e começou a
estourar teto em teste que passa isolado — o retrato exato que o comentário
descreve. O número que vale é o de cima, do pool padrão. Registro porque um
"67 falhas" apareceu na tela nesse caminho e ele não era defeito de ninguém.

**O que eu NÃO rodei até o fim, de propósito:** a suíte CHEIA das functions. Ela
ficou ~1h50 no ar disputando CPU com o gate do painel (que é o exigido pelo
contrato) e foi interrompida por mim; nada do que ela chegou a imprimir tinha
falha. O contrato pede "functions **dirigidas** no emulador", e é o que a linha
acima entrega — com o detalhe que importa: **nenhuma linha desta lane toca
`functions/**`**, os dois fixes vivem inteiramente em `apps/landing/`. Quem
quiser o número cheio: `cd functions && FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199
npx vitest run`, com o emulator `firestore,storage,auth` de pé.

## Itens novos para o painel do dono

- **Item 65** — a RN-333 publica chave de 8–64 e a plataforma recusa a partir de
  50 (medido: teto real **49**). Nenhum caminho vivo hoje. Default proposto:
  apertar a regra publicada para 49. É a premissa 3 do PIXFIX, agora com número.
- **Item 66** — `PUBLIC_BASE` do painel ainda cai em `https://be-hero.com.br`
  quando falta `VITE_LEELA_URL`. Não é link gerado (o do afiliado já recusa sem
  base), é navegação interna. Conversa com o item 12 e some junto com ele.

Nada mais nasceu como decisão de dono. R-1, R-3, R-6 e R-7 são engenharia.

## Commits desta lane (sem push)

1. `f68b22b` — fix D-1 · o cache do cupom do link ganha teto e o slug ganha régua.
2. `f249f33` — fix D-2 · "Remover" descarta a cotação velha.
3. *(este)* — handoff + boards (kanban, checklist, painel de decisões).
