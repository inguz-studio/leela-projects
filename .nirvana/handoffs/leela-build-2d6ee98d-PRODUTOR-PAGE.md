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
- [x] **E3 · S1707-T3** — menu secundário Feed · Eventos · Clubs com o `Tabs` do DS
- [x] **E4 · S1707-T4** — feed mockado e rotulado em preview, vazio digno em produção

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

Commit: `f188f146`.

---

## E3 · as três seções empilhadas viraram abas

Nenhum componente novo de design system. O `Tabs` já existia, já mantinha os painéis inativos no
documento e já entregava a fiação de acessibilidade — o trabalho foi ligá-lo, não construí-lo.

### A fronteira

`PerfilView` continua Server Component puro. `app/(public)/_perfil/PerfilTabs.tsx` é a casca de
cliente: recebe as três seções **já renderizadas no servidor** como props e as entrega ao `Tabs`. O
que atravessa para o cliente é a troca de aba, e só ela. Mesmo padrão que o repositório já usa para
o diálogo do regulamento.

O `Tabs` entrou no boundary único `app/_ds/ds.ts`, junto dos outros componentes do DS — não ganhou
import solto.

### O que o teste segura

`test/perfil-abas-s1707.test.tsx`, 9 casos. O que importa:

- **As três seções ficam no documento com a aba fechada.** O teste conta três `role="tabpanel"` e
  encontra o texto das três no `textContent` do container. É a asserção que reprova a troca de
  `forceMount` por render condicional — que é o jeito "óbvio" de fazer abas e que esconderia os
  eventos do produtor de quem chega por busca. Um link na bio existe exatamente para ser achado.
- **A aba inicial é Eventos** (D-ACH-16), com `aria-selected` medido, não presumido.
- **Setas e Home navegam.** O foco itinerante do Radix move o foco num `setTimeout`, então a
  asserção espera; sem o `waitFor` o teste mediria o estado de antes da tecla e passaria por acaso.
- **O card de clube não tem afordância de clique** (D-ACH-20): não é `<a>`, nenhum link da página
  aponta para rota de clube, e as classes não têm `cursor-pointer`, `hover:` nem `focus-visible:`.
  A regra estava só na spec; agora está no gate.

### Duas decisões de detalhe

**Títulos que repetiriam a aba viraram `sr-only`.** "Clubs" na aba e "Clubs" em `h2` logo abaixo é o
mesmo rótulo duas vezes coladas. O título continua no documento (estrutura para leitor de tela e
para buscador), só não na tela. A aba Eventos manteve o título visível "Próximos eventos", que não
repete a aba: nomeia a primeira das duas listas, e a segunda é "Já aconteceram". O `Rss` saiu do
import junto — ícone dentro de título invisível não tem função.

**Patrocinadores e compartilhar ficaram FORA das abas.** Não são conteúdo do produtor, são moldura
da página. A faixa de patrocinadores vem depois do bloco de abas e antes do compartilhar. Premissa
vetável: mover a faixa para cima do menu empurraria as abas para longe da identidade, que é onde o
dono pediu que elas ficassem.

**Vocabulário D-0802-1 pago de passagem.** O estado vazio de eventos dizia "quando este organizador
publicar uma **corrida**". Numa página de produtor de retiros, isso é a categoria errada. Virou
"publicar uma **experiência**", e o teste reprova a volta da palavra.

### Gate

| | |
|---|---|
| `tsc --noEmit` (landing) | **0** |
| `eslint app lib --max-warnings 0` | **0** |
| Suíte da landing (processo único) | **411/411**, 36 arquivos (+9 no arquivo novo) |
| `dist` do DS | já traz o `Tabs` restilizado — nenhum rebuild do pacote foi necessário |

Commit: `b1208717`.

---

## E4 · o feed é exemplo declarado no preview e vazio digno em produção

`app/(public)/_perfil/SecaoFeed.tsx` (novo) + três publicações de exemplo em `lib/mockImagem.ts`,
pelo mesmo degrau de preview que a imagem de kit, o patrocinador e a galeria já usam: a função
`ehPreview()`, nenhuma invenção nova de mecanismo.

**Produção** mostra estado vazio digno — diz o que vai aparecer ali e não pede desculpa. Nenhuma
publicação de exemplo cruza para lá. Página que alguém abre pelo link na bio não pode exibir texto
que o produtor não escreveu; é a mesma honestidade de superfície da cascata de imagem.

**Preview** mostra o formato: três publicações, uma delas com imagem, tudo reaproveitado do acervo de
exemplo que a galeria já versiona — zero asset novo.

O rótulo de exemplo aparece **duas vezes de propósito**: uma nota no topo da seção e um selo em cada
publicação. A nota explica; o selo de cada card sobrevive a um recorte de tela, que é exatamente como
o mock vaza para fora do contexto e vira "conteúdo real" na cabeça de quem vê.

O carimbo de tempo de cada publicação é texto fixo ("há 2 dias"), não conta a partir do relógio: um
valor calculado divergiria entre o render do servidor e o do cliente e não compraria nada num mock.

A imagem entra decorativa (`alt=""`), pela lição da X1: é imagem de exemplo servida a qualquer
perfil, então descrevê-la seria afirmar ao leitor de tela algo que não está na página.

Vocabulário conferido por teste, não por leitura: nenhuma das três publicações usa corrida, prova ou
atleta, e nenhuma usa "pequena vitória", que é termo interno e o cliente nunca lê.

### Gate

| | |
|---|---|
| `tsc --noEmit` (landing) | **0** |
| `eslint app lib --max-warnings 0` | **0** |
| Suíte da landing (processo único) | **420/420**, 37 arquivos (+9 no arquivo novo) |
| `next build` | **PASS** — 10/10 páginas estáticas geradas, 12 rotas |

O `next build` é o gate que os outros três não dão: ele é quem prova a fronteira de servidor/cliente
das abas de verdade. Os erros de credencial do Firestore no log do build são os esperados (build sem
emulator; o leitor os engole e devolve `[]`), e o build fecha.

Custo de interface medido depois da mudança: rota `/[eventSlug]` — que é quem serve `/@handle` — em
**10,6 kB** de bundle próprio e **222 kB** de primeiro carregamento. O `Tabs` traz Radix para o
grafo do cliente, mas o Radix já estava nessa rota (o diálogo do regulamento). O delta antes/depois
**não foi medido** e está listado nas pendências.

---

## Premissas assumidas, vetáveis

Continuam a numeração da spec, que vai até P20.

| # | Premissa | Custo de vetar |
|---|---|---|
| P21 | A E1 corrigiu os três comentários de índice nos leitores, além do território declarado (`firestore.indexes.json`) | Reverter três blocos de comentário; nenhuma linha de comportamento |
| P22 | Os SVGs de WhatsApp, TikTok e Strava são desenhos simplificados na grade do lucide, não os glifos oficiais das marcas | Trocar o `d` de cinco paths em `IconesRede.tsx` |
| P23 | Título que repetiria o nome da aba (Clubs, Feed) virou `sr-only` | Uma linha por aba, se o dono quiser o título visível |
| P24 | Patrocinadores e compartilhar ficam FORA das abas, depois do bloco de abas | Mover dois blocos; se a faixa subir, as abas descem e saem de perto da identidade |
| P25 | O feed de exemplo tem três publicações, uma com imagem, e reaproveita o acervo da galeria | Trocar textos e imagem em `lib/mockImagem.ts` |
| P26 | O carimbo de tempo do mock é texto fixo, não conta do relógio | Uma função de data, se alguém quiser tempo real num conteúdo falso |

## Pendências

1. **Conferência visual do dono.** O gate desta lane é de código. O que precisa de olho humano:
   a fileira de ícones (os três desenhos locais são a única peça visual autoral), o underline das
   abas e o feed de exemplo. Onde conferir: preview local com emulator, em `/@castelo` — a receita
   do preview está no handoff da rodada de compra.
2. **Delta de bundle antes/depois não medido.** A rota ganhou Radix Tabs no grafo de cliente. O
   número absoluto está acima; o comparativo com a base `4cc6a52d` exigiria um segundo build no
   commit anterior e não foi feito.
3. **Sem push e sem deploy.** Quatro commits em `main` local. O site no ar segue sendo o build da
   ACHADOS-0802 — a página do produtor no `leela-landing.web.app` ainda é a versão empilhada.
4. **Publicação real de feed segue épico futuro** (D-ACH-21), com o modelo de post do perfil e o do
   clube saindo no mesmo lote para não colidirem. Nada disso entrou aqui.
