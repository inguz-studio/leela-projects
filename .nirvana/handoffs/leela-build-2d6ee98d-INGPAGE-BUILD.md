# Handoff vivo · lane INGPAGE-BUILD · trace leela-build-2d6ee98d · 2026-07-29

Executor: sf-backend-lead (software-forge). Brief: `.nirvana/briefs/leela-build-2d6ee98d-INGPAGE-BUILD-enriched.md`.
Autoridade de escopo: `leela-specs/02-rodadas/2026-07-29-pagina-ingresso/03-fila-codigo.md` (5 tasks, série T1→T5).

## Estado

- [x] **T1 · `S1214-T1`** — token `LLIP1` no core + assinatura/verificação nas Functions + `ingressoPorLink`
      · gate VERDE: `tsup` do core, `tsc --noEmit` em core e functions, ESLint zero-warning,
      **54 testes passando** (38 unit + 16 no emulador) via
      `npx firebase-tools@13 emulators:exec --project demo-leela "npx vitest run …"`
- [x] **T2 · `S1214-T2`** — rota `/ingresso/{token}` na landing
      · gate VERDE: `tsc --noEmit` da landing e das functions, ESLint zero-warning (incl. a regra
      de tokens do DS), **24 testes** da landing + **38** das functions (slug + criarEvento),
      `next build` verde com a rota `ƒ /ingresso/[token]` em **146 B** — o mesmo peso do
      `_not-found`, ou seja **nenhuma dependência nova no bundle público**
- [ ] **T3 · `S1214-T3`** — base pública por ambiente + link por inscrito no e-mail + morte do `beh.ro`
- [ ] **T4 · `S1214-T4`** — versão imprimível A4
- [ ] **T5 · `S1206-T7`** — fecho de board + épico
- [ ] Deploy de preview (landing + functions tocadas) com provas curl

## Inventário do reconhecimento (o que existe e não se reescreve)

| Peça | Onde | Uso nesta lane |
|---|---|---|
| Keyring HMAC com rotação | `functions/src/eventos/qrToken.ts` (`carregarQrKeyring`, `obterQrKeyring`) | Reusado inteiro pelo `LLIP1` — nenhum segundo segredo |
| Parte pura do `LLQR1` (base64url, UTF-8, payload canônico, `kidQrValido`) | `packages/core/src/eventos/qrToken.ts` | Reusada pelo módulo do link |
| Gerador de QR server-side | `gerarQrDataUrl` em `functions/src/eventos/publicarEvento.ts` | Reusado para o `qrDataUri` da projeção |
| Leitor público server-side (Admin SDK, gate no código) | `apps/landing/lib/leitor.ts` | Doutrina reusada; a página não lê `inscritos` direto |
| Entrada server-safe do DS (ADR-017) | `@leela/design-system/server` | Único caminho de UI da página |
| Base pública da landing | `apps/landing/lib/seo.ts:baseUrl()` | Espelhada nas Functions pela T3 |
| Template do e-mail da compra | `functions/src/email/templates.ts:renderIngressosCompraEmail` | Acrescido, nunca reescrito |
| Deploy da landing | `node apps/landing/scripts/deploy-leela-hub.mjs` | Receita do preview ao final |

## Premissas assumidas

Ordenadas por peso. Vetar a primeira muda contrato; as demais mudam comportamento.

### P-INGPAGE-1 · Só quem tem ingresso emitido recebe link (a linha "emitindo" da matriz não é alcançável por link real)

**A tensão, escrita por inteiro porque a review vai bater aqui.** A D-ING-4 manda a assinatura
cobrir o `qrToken` vigente. A matriz da RN-421 tem a linha *"`confirmado`, sem `qrToken` ⇒
estamos emitindo seu ingresso"*, e o GWT da S1214 diz *"dado um pedido pago cuja emissão ainda
não fechou, quando abro o link…"*. As duas coisas não fecham sozinhas: sem `qrToken` gravado não
existe material de binding, logo não existe assinatura a recomputar.

**As três saídas e por que duas morrem:**

| Saída | Consequência | Veredito |
|---|---|---|
| Assinar sobre `qrToken ?? ''` e mintar link para todo inscrito | O link abre antes da emissão e **morre no instante em que o ingresso fica pronto** — a pessoa clica no momento do sucesso e vê a negativa genérica | Recusada |
| Aceitar `''` **ou** o token vigente como binding | O link pré-emissão vira ineternamente irrevogável: a re-emissão deixa de matá-lo | Recusada (buraco de revogação) |
| **Binding estrito: link só existe com `qrToken` gravado** | A linha "emitindo" fica implementada e testada na projeção e na página, mas não é produzida por um link real | **Escolhida** |

**Por que a escolhida é honesta e não uma varredura para debaixo do tapete.** O e-mail da compra
já trata esse caso hoje, e trata melhor: `emitirIngressosDoPedido` só devolve inscrito COM token,
e o bloco de quem ficou de fora sai com *"Ingresso ainda sendo emitido — o código chega em
seguida"*. Quem não tem ingresso não fica sem informação: fica sem LINK, que é diferente. A cura
continua sendo a varredura de 15 minutos da RN-382, e o e-mail de quem foi curado sai depois, com
link.

**Se o dono vetar:** o binding precisa de um segundo material estável por inscrito (um `linkNonce`
gravado na criação da inscrição, por exemplo), e aí a re-emissão deixa de revogar de graça — vira
campo novo, migração e uma alavanca de revogação a mais para operar.

### P-INGPAGE-2 · O endpoint é `onRequest` com POST, e o token viaja no corpo

Um GET poria o token na query string, e query string entra no log de request do Cloud Run — o
mesmo vazamento que a RN-419 evita ao tirar a credencial do QR de dentro da URL. Quem chama é o
SSR da landing, nunca o navegador: não há CORS a resolver e o protocolo callable não paga o
próprio peso aqui. **Se o dono vetar:** vira callable, e o token passa a viajar em
`{data:{token}}` — mesma privacidade, mais cerimônia.

## Provas

### T1 · `S1214-T1`

Gate deterministic-first, na ordem: `tsup` do core (build success, DTS incluído) → `tsc --noEmit`
em `packages/core` e em `functions` (saída vazia nos dois) → ESLint `--max-warnings 0` nos seis
arquivos tocados (saída vazia) → `npm run build` das functions → suíte, **sozinha na máquina**,
no emulador exclusivo da lane:

```
cd functions && npx firebase-tools@13 emulators:exec --project demo-leela \
  "npx vitest run src/__tests__/linkIngressoToken.test.ts src/__tests__/ingressoPorLink.integration.test.ts"

+  functions: Loaded functions definitions from source: … varrerIngressosOrfaos, ingressoPorLink, …
 ✓ src/__tests__/ingressoPorLink.integration.test.ts (16 tests) 23847ms
 ✓ src/__tests__/linkIngressoToken.test.ts (38 tests) 341ms
 Test Files  2 passed (2)
      Tests  54 passed (54)
+  Script exited successfully (code 0)
```

O `ingressoPorLink` aparecer na lista de definições carregadas prova o wire do `index.ts`, não só
a compilação.

**Vetores ⚔ cobertos pela T1** (o roteiro do que a review vai tentar falsificar):

| ⚔ | Onde a asserção mora | O que morde se afrouxarem |
|---|---|---|
| 1 · Rules intocadas | `ingressoPorLink.integration` › *Rules intocadas* | `assertFails` no `getDoc` anônimo de `eventos/{id}/inscritos/{id}` — abrir a Rule quebra o teste |
| 2 · Sem oráculo | idem › *as quatro causas de falha devolvem a MESMA resposta* | `new Set(respostas.map(JSON.stringify)).size === 1` — qualquer negativa diferenciada vira 2 |
| 3 · Rotação × revogação em massa | idem › *rotação NÃO mata* + *tirar o kid do ring REVOGA* | dois rings reais (`k1`/`k1+k2`/`só k2`) |
| 4 · Separação de domínio | `linkIngressoToken` › bloco de separação + integração › *`qrToken` colado na URL não abre* | `parseQrToken(link)` e `parseLinkIngressoToken(qr)` ambos falsos; guarda de carga em `linkIngresso.ts` explode no import se as versões colidirem |
| 5 · Binding × rotação | idem › *as duas propriedades são independentes* + integração › *re-emitir invalida o link antigo* | as duas provas estão no MESMO teste, de propósito: trocar uma pela outra no código derruba |
| 6 · Estornado/cancelado sem QR | integração › `it.each(['cancelado','estornado'])` | `qrDataUri` tem de ser `undefined`; a guarda está no SERVIDOR (`estadoMostraQr`), não na página |
| 7 · Privacidade | integração › *nenhum campo proibido pela RN-422* | o seed grava CPF, telefone, e-mail, nascimento, contato de emergência, respostas e valor pago **de propósito**, e a asserção varre o JSON da projeção atrás dos oito valores; o `qrToken` em texto também não pode aparecer |
| 8 · Base pública | — | é da T3 |

Extras que a fila não pediu e a review agradece: `ingressoPorLinkCore` não escreve nada (o doc sai
byte a byte igual — asserção própria); kid herdado de `Object.prototype` não resolve para membro
herdado; adulteração de cada uma das quatro partes do token recusa; sem keyring é fail-closed e
colapsa na mesma negativa; tenant divergente entre payload e doc recusa (ADR-009).

### T2 · `S1214-T2`

```
cd apps/landing && npx vitest run test/ingresso-pagina.test.tsx test/ingresso-privacidade-rota.test.ts
 ✓ test/ingresso-pagina.test.tsx (18 tests)
 ✓ test/ingresso-privacidade-rota.test.ts (6 tests)
 Tests  24 passed (24)

cd functions && npx firebase-tools@13 emulators:exec --project demo-leela \
  "npx vitest run src/__tests__/slugReservado.test.ts src/__tests__/criarPublicarEvento.integration.test.ts"
 Tests  38 passed (38)          ← criarEvento continua verde com o slug reservado no laço

cd apps/landing && npx next build
├ ƒ /ingresso/[token]                    146 B           199 kB
```

**As duas linhas do build que são a prova, não enfeite.** O `ƒ` diz que a rota é
server-rendered on demand — nunca pré-renderizada, nunca revalidada em cache (RN-418). Os
**146 B** são o peso do JS de cliente da rota: o mesmo do `_not-found`, que não tem nada. O QR
chega pronto do servidor, então nada de `qrcode` no bundle público e a landing segue Radix-free.

**Onde cada cabeçalho da RN-422 mora, e por quê:**

| Cabeçalho | Onde | Por que não podia ser em outro lugar |
|---|---|---|
| `noindex, nofollow` | `metadata.robots` da rota + `X-Robots-Tag` no `next.config.js` + `disallow: '/ingresso'` no `robots.txt` | três tranças: `<meta>` para quem lê o HTML, header para quem só lê o header, `robots.txt` para quem nem pede |
| `Referrer-Policy: no-referrer` | `headers()` do `next.config.js` | é cabeçalho de RESPOSTA; não sai de dentro de um Server Component |
| `Cache-Control: no-store` | idem | idem, e o token está na URL: CDN e proxy no caminho não podem guardar |

O `source: '/ingresso/:token*'` cobre a rota e a versão imprimível da T4 de uma vez. O teste lê
o `next.config.js` de verdade (`require`), não uma cópia da intenção.

**Slug reservado (RN-418).** `SLUGS_RESERVADOS` nasceu em `functions/src/eventos/slug.ts` com as
rotas estáticas que a landing já tem (`ingresso`, `convite`, `health`, `robots.txt`,
`sitemap.xml`, `api`, `_next`) e `criarEvento` trata reservado como slug OCUPADO: um evento
chamado "Ingresso" vira `ingresso-2`. Recusar a criação seria pior — o organizador não tem como
saber quais palavras a landing usa.

**Título genérico de propósito.** `metadata.title` é "Seu ingresso · Leela", sem nome de pessoa:
título com nome vaza no histórico do navegador e na aba compartilhada em tela.

## Reaproveitado vs criado

**T1 · reaproveitado:** keyring inteiro (`carregarQrKeyring`/`obterQrKeyring`/`QrKeyring`) — nenhum
segundo segredo, nenhuma segunda rotação; payload canônico `{i,e,t}` (`codificarPayloadQr`);
base64url e UTF-8 portáveis do core; `kidQrValido` (o mesmo critério de kid, porque o ring é o
mesmo); `timingSafeEqual` e a blindagem `Object.hasOwn` do `verificarQrToken`; `gerarQrDataUrl`
(nenhuma segunda implementação de QR); `isCodigoIngressoValido`; helpers de estabilidade de suíte
(`clearFirestoreDrained`, `withTriggersPaused`) e o molde de seed do `emailIngressos.integration`.

**T1 · criado:** `packages/core/src/tickets/linkIngresso.ts` (formato `LLIP1`, parse estrutural,
enum `EstadoIngressoPagina` + `estadoMostraQr`); `functions/src/eventos/linkIngresso.ts` (assinar,
verificar, material de binding); `functions/src/http/ingressoPorLink.ts` (projeção + endpoint);
dois arquivos de teste; um export block no `packages/core/src/index.ts` e um no
`functions/src/index.ts`.

**T2 · reaproveitado:** entrada server-safe do DS (`Badge`, `Card`, `CardContent`) — nenhum
componente novo nasceu na tela, como manda a governança §7; tokens semânticos do tema brasa (zero
valor cru — a regra `leela-tokens/no-hardcoded-tokens` passou); molde de rota pública com token
(`app/(public)/convite/page.tsx`: `force-dynamic` + `metadata.robots`); `Ticket.tsx` do checkout
como referência de forma; `slugify`/`slugCandidato`/`MAX_TENTATIVAS_SLUG`; `robots.ts` existente
(acréscimo de uma entrada, não reescrita); molde de teste RTL da landing, inclusive o
`afterEach(cleanup)` que o `globals: false` exige.

**T2 · criado:** `apps/landing/lib/ingresso.ts` (leitor server-side + formatação);
`app/(public)/ingresso/[token]/page.tsx` e `IngressoView.tsx`; bloco `headers()` no
`next.config.js`; `SLUGS_RESERVADOS`/`slugReservado` em `functions/src/eventos/slug.ts`; três
arquivos de teste.
