# Handoff vivo · lane PRODUTOR-PAGE · trace leela-build-2d6ee98d · 2026-08-03

Executor: sf-frontend-lead (software-forge). Brief: `.nirvana/briefs/leela-build-2d6ee98d-PRODUTOR-PAGE-enriched.md`.
Autoridade: `leela-specs/02-rodadas/2026-08-02-retomada/06-spec-produtor-page.md` (D-ACH-15..21),
`07-fila-achados.md` (lane PRODUTOR-PAGE · E1..E4), `05-rns-achados.md` (RN-443/444/445),
`03-achados-dono.md` (verbatim do B10).

Base: `main` em `4cc6a52d`, árvore limpa. Sem push — o maestro pusha. `git commit --only` por caminho,
um commit por task, sufixo `[leela-build-2d6ee98d]`.

Gate de entrada medido antes de tocar em nada: tsc **0**, eslint **0**, suíte da landing
**376/376** (34 arquivos, processo único).

## Estado da fila

- [x] **E1 · S1707-T1** — medir a consulta de eventos por tenant e status; índice só se reprovar
- [x] **E2 · S1707-T2** — ícones de rede inferidos pelo endereço + os três SVGs que faltam
- [ ] **E3 · S1707-T3** — menu secundário Feed · Eventos · Clubs com o `Tabs` do DS
- [ ] **E4 · S1707-T4** — feed mockado e rotulado em preview, vazio digno em produção

---

## E1 · o índice não precisou, e a medição diz por quê

**Veredito: `firestore.indexes.json` não muda.** A consulta `eventos where tenantId == X and status in
['publicado','ao_vivo']` roda em produção, hoje, sem índice composto. O que estava escrito no código
era o contrário, e era palpite.

### Prova 1 — a lista de índices que o projeto de produção realmente tem

`npx firebase-tools@13 firestore:indexes --project leela-hub` (exit 0, autenticado como
`inguzbuilders@gmail.com`) devolve **15 índices compostos**. Os de `eventos` são um só:

```
eventos    [COLLECTION]         tenantId + organizadorId + data
parcerias  [COLLECTION_GROUP]   status + tenantId + tipo
```

Não existe `eventos(tenantId, status)`. Não existe nenhum índice de `clubes`. E os 15 batem
exatamente com o `firestore.indexes.json` da árvore — inclusive o de `parcerias`, o que confirma
que o deploy do `597d499` chegou ao projeto.

### Prova 2 — a página serve os eventos assim mesmo, num render de servidor novo

```
GET https://leela-landing.web.app/@castelo
HTTP=200   bytes=60700   t=2,00 s
```

No HTML servido: **5 links de evento** na linha do tempo (`/corrida-inverno-floripa-2026`,
`/desafio-mtb-costa-lagoa-2026`, `/meia-floripa-2026`, `/noturna-beira-mar-2026`,
`/retiro-bem-estar-rio-vermelho-2026`) e **2 clubes** (`membros ativos` × 2). Zero ocorrência de
"Nenhum evento à vista" e zero de "Nenhum club" — os dois estados vazios que apareceriam se as
consultas tivessem reprovado, porque os dois leitores engolem o erro e devolvem `[]`.

E o render foi novo, não cache: o log da função registra o cold start disparado por essa
requisição.

```
2026-08-03T07:36:14.730347Z I ssrleelalanding: Starting new instance. Reason: AUTOSCALING ...
2026-08-03T07:36:16.004200Z I ssrleelalanding: Default STARTUP TCP probe succeeded ...
2026-08-03T07:36:25.593354Z I ssrleelalanding:
2026-08-03T07:36:36.674568Z I ssrleelalanding:
```

Nenhuma linha de erro depois do boot.

### Prova 3 — o controle: no mesmo código, no mesmo request, uma das três consultas reprovava

`getPublicPerfil` dispara as três leituras num `Promise.all`, atrás da mesma guarda
(`tenantId.length > 0`). Nas últimas 400 entradas do log de `ssrleelalanding`
(2026-07-29T12:34:20Z → 2026-08-03T03:18:18Z):

| Consulta | Escopo | Falhas registradas |
|---|---|---|
| `listarEventosPublicadosDoTenant` | coleção `eventos`, 2 igualdades | **0** |
| `listarClubesPublicosDoTenant` | coleção `clubes`, 2 igualdades | **0** |
| `listarPatrocinadoresPublicosDoTenant` | **collectionGroup** `parcerias`, 3 igualdades | **9** |

As nove são todas `9 FAILED_PRECONDITION: The query requires an index`, e o link de criação que o
Firestore devolve nomeia `collectionGroups/parcerias`. É o controle perfeito: mesmo request, mesmo
instante, mesmo padrão de filtro — e só a consulta de `collectionGroup` reprovou.

### Por que, e a regra que fica

Falta de índice é erro de PLANEJAMENTO da consulta: o Firestore devolve `FAILED_PRECONDITION` antes
de olhar o dado, então uma consulta que responde (mesmo com zero resultado) provou que tem plano.
Consulta de **coleção** só com filtros de igualdade é servida pela combinação dos índices
automáticos de campo único. Em **collectionGroup** o Firestore não cria índice de campo único
sozinho — por isso `parcerias` reprovou, e por isso o arquivo já tinha `fieldOverrides` de
`afiliados` com `queryScope: COLLECTION_GROUP`. A regra prática: declarar composto para
collectionGroup e para igualdade + faixa/ordenação; não declarar para igualdade pura em coleção.

### O que mudou no commit

Nada em `firestore.indexes.json`. O que mudou foram os três avisos que mandavam no contrário —
território estendido para além do declarado na fila, e por isso registrado como premissa vetável:

- `apps/landing/lib/leitor.ts` — "⚠️ Deploy real exige índice composto `eventos(tenantId, status)`"
  era falso; saiu, e no lugar ficou a medição com a data e a razão.
- `apps/landing/lib/leitorPerfil.ts` — o mesmo aviso para `clubes(tenantId, visibilidade)`, também
  falso, também substituído pela medição.
- `apps/landing/lib/leitorPerfil.ts` — a pendência operacional de `parcerias` estava aberta no
  comentário e já tinha sido paga em `597d499`; agora diz que foi.

Um comentário que manda criar índice desnecessário é exatamente o mecanismo que a E1 existe para
cortar: alguém lê, acredita e declara o índice "por via das dúvidas".

### Gate

| | |
|---|---|
| `tsc --noEmit` (landing) | **0** |
| `eslint app lib --max-warnings 0` | **0** |
| Suíte da landing (processo único) | **376/376**, 34 arquivos |
| `firestore.indexes.json` | intocado (`git status` limpo para o caminho) |

Commit: `c2fa043f`.

---

## E2 · os links viram ícones, e o rótulo digitado não se perde

Dois arquivos novos e uma troca no hero. A fileira de pílulas de texto de largura inteira virou uma
fileira de ícones de 44px.

### A inferência

`app/(public)/_perfil/redes.ts` — função pura `inferirRede(url)`, mapa de 17 domínios para 10 redes
mais o genérico `site`. O casamento é por igualdade **ou por sufixo de rótulo** (`host === d` ou
`host.endsWith('.' + d)`), que é o que separa `br.instagram.com` — legítimo — de
`instagram.com.golpe.net`, que é hostname de outro dono. Endereço fora de http(s), endereço que não
parseia e endereço não reconhecido caem todos em `site` e **continuam na fileira**, com ícone
genérico de link (Postel na leitura, D-ACH-17).

Nenhum campo novo entrou no modelo, na validação, na projeção pública, na Function ou no editor do
painel. O organizador continua cadastrando rótulo e endereço.

### Os ícones

`app/(public)/_perfil/IconesRede.tsx` — sete vêm do `lucide` que a landing já usa (Instagram,
Facebook, Twitter, YouTube, LinkedIn, GitHub, Twitch), o genérico é o `Link` do mesmo pacote, e os
três que o `lucide` não tem entram como SVG local: **WhatsApp, TikTok e Strava** (D-ACH-18). Os três
são desenhados na mesma grade do lucide — 24×24, `currentColor`, sem preenchimento, ponta
arredondada, traço 1,75 — para a fileira ter um peso visual só.

Eles são desenhos SIMPLIFICADOS, não os glifos oficiais das três empresas. Está escrito no topo do
arquivo e é premissa vetável: trocar os `d` dos três paths não mexe em mais nada.

### Onde o rótulo foi parar

O `<a>` carrega `aria-label` e `title` com o rótulo que o organizador digitou; o `<svg>` é sempre
`aria-hidden`. Um nome só por alvo — dois fariam o leitor de tela anunciar duas vezes. Rótulo vazio
(que a projeção do core já não deixa passar) cai no hostname, nunca em link mudo.

O alvo tem 44×44px. WCAG 2.2 §2.5.8 pede 24px como mínimo AA, e uma fileira de ícones colados é
exatamente o padrão que costuma reprovar ali.

### Gate

| | |
|---|---|
| `tsc --noEmit` (landing) | **0** |
| `eslint app lib --max-warnings 0` | **0** |
| Suíte da landing (processo único) | **402/402**, 35 arquivos (+26 no arquivo novo) |
| Tokens do DS | zero hex, zero valor arbitrário — o `leela-tokens/no-hardcoded-tokens` roda em `apps/*/app/**` e passou |
