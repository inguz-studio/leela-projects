# LEELA-E17 · Perfil social / link-in-bio

- **Superfície:** Landing (perfil público SSR/ISR) + App mobile (Feed · Eventos · Clubs)
- **Horizonte:** H2 (transversal — a fatia link-in-bio pública é barata e antecipável)
- **MoSCoW:** Should (link-in-bio público) · Could (social in-app completo)
- **Estimativa:** XL
- **Status:** 📋 novo (planejado 2026-07-12)
- **Depende de:** LEELA-E01 (DS temável + ThemeProvider), LEELA-E12 (superfície landing SSR/ISR + leitor público server-side), LEELA-E05 (clubes), LEELA-E03 (eventos), LEELA-E13 (app do atleta — para as abas in-app)
- **De-para:** novo (sem BH- direto). Benchmark: [[benchmark-cheers]] (página de entidade + resgate + perfil "Meu Clube").
- **Onda:** **Onda 3** (link-in-bio público, reusa E12) · **Onda 4** (Feed·Eventos·Clubs in-app + tematização por-usuário, com E13)

## Objetivo

Dar a cada **organizador e atleta** um **perfil público próprio** — um "link na bio" único e compartilhável — que reúne, num só lugar temático, o que a pessoa é na Leela: seu **Feed**, seus **Eventos** e seus **Clubs**. É a porta de descoberta orgânica (o link que vai no Instagram/WhatsApp) e o tecido de identidade que transforma inscrição pontual em pertencimento contínuo. Diferente da página de evento (E12, transacional) e da página de clube (E12-S1202, institucional), o perfil é **da pessoa/marca**, personalizável na identidade dela: um **tema dinâmico por conta** (accent + capa) aplicado **sobre** o Design System, sem redefinir componente localmente.

O épico tem duas fatias com custos muito diferentes, por isso entram em Ondas diferentes:

1. **Link-in-bio público (Onda 3, barato):** uma rota SSR/ISR `{leela-domain}/@{handle}` que renderiza o perfil público com as três abas (Feed leitura · Eventos que a pessoa organiza/participa · Clubs), capa + tema da conta, e CTAs para os eventos/clubes. Reusa integralmente a fundação da landing (E12-S1200) e o leitor público server-side.
2. **Social in-app + tematização por-usuário (Onda 4):** as abas Feed · Eventos · Clubs no app (bottom-nav já previsto no wireframe Figma `112-4622`), a composição de posts no feed (write), o editor de tema/capa da conta e a aplicação do tema por-usuário em runtime sobre o DS.

Benchmark **Cheers**: a Cheers dá a cada entidade "sua página oficial" e um perfil "Meu Clube" no app. O Leela faz melhor ao dar **perfil da pessoa** (organizador *e* atleta) com feed/eventos/clubs unificados e tema próprio — identidade, não só uma página de vendas.

## Personas & JTBD

- **Organizador (persona primária, fatia link-in-bio).** JTBD Social/Identitária (`jobs-to-be-done.md` 04.4) *"Falo com patrocinador → ter dados na mão / ser visto como profissional"* e Marketplace (04.3) *"Aparecer na vitrine → ganhar visibilidade"*. O perfil é o link único que ele põe na bio e que agrega todos os eventos que organiza.
- **Atleta (persona primária, fatia in-app).** JTBD Social/Identitária (04.4) *"Olho meu perfil → sentir que sou atleta em progresso (identidade, não consumo)"* e Heroica (04.2) *"Vejo amigos ativos → sentir que estamos na mesma jornada (pertencimento)"*.
- **Atleta anônimo / visitante (persona secundária).** JTBD Transacional (04.1) *"Descubro evento → me inscrever em poucos cliques"* — chega ao perfil por um link compartilhado e navega para um evento/clube.

> **JTBD proposto (candidato, seguindo o precedente P1-P5 de `next-trail/JTBD-TRACE.md`):**
> `| Compartilho quem eu sou | Um link único com meu feed, eventos e clubs | Ser descoberto e reter público sem depender do algoritmo de terceiros | Organizador / Atleta |`
> — a inserir em `04.4 · Social e Identitária` após ratificação do dono. Até lá, as US citam a âncora doc mais próxima (04.4 identidade / 04.3 vitrine).

## Critérios de sucesso do épico

- Uma URL pública `{leela-domain}/@{handle}` de perfil ativo abre sem login, renderizada no servidor, com capa + tema da conta e as abas Feed · Eventos · Clubs, e passa em Core Web Vitals (LCP do hero < 2,5s).
- Um perfil com `visibilidade = privada` responde 404 público; `handle` inexistente responde 404.
- O tema por-usuário (accent + capa) é aplicado como **camada sobre** o token semântico do DS (nunca redefine componente localmente — governança E01), e degrada para o tema base (`brasa`/`leela`) quando a conta não personalizou.
- No app, as três abas (Feed · Eventos · Clubs) do bottom-nav abrem e listam o conteúdo real da conta; o Feed lê (V1) e compõe posts (V1.5+).
- Clubes e eventos exibem **capa** própria em todas as superfícies onde aparecem (perfil, página do clube, card de evento).
- Todo dado exposto no perfil público respeita a visibilidade da entidade de origem (clube `privada` não vaza; evento `rascunho` não aparece).

## Regras de negócio aplicáveis (propostas — bloco RN-160..175)

- **RN-160 (proposta)** — todo perfil tem um `handle` único, imutável após criação (formato `@[a-z0-9_]{3,30}`, exclui reservados); o `handle` é a chave da URL pública.
- **RN-161 (proposta)** — visibilidade do perfil: `publica` (link direto), `indexavel` (aparece em buscadores), `privada` (404 público) — espelha RN-140 (clube).
- **RN-162 (proposta)** — tema por-usuário = `perfilTema { accent, capaUrl?, base('brasa'|'leela') }`; o `accent` é uma cor da conta aplicada como override de tokens semânticos de destaque **sobre** o tema base; nunca cria token/componente novo. Contraste AA validado no gerador (o accent precisa passar em AA sobre a superfície do tema base — senão cai para o accent do tema base).
- **RN-163 (proposta)** — o Feed público é **leitura**; composição de post é in-app e restrita ao dono do perfil (V1.5+). Posts respeitam a visibilidade do perfil.
- **RN-164 (proposta)** — a aba Eventos do perfil lista (a) eventos que a conta **organiza** (se organizador) e (b) eventos em que **participa** (se atleta, e se o atleta permitir exibir — opt-in LGPD); só eventos publicados/públicos aparecem.
- **RN-165 (proposta)** — a aba Clubs do perfil lista clubes que a conta administra ou dos quais é membro, respeitando `visibilidade` de cada clube (RN-140); clube `privada` não aparece no perfil público.
- **RN-166 (reconciliada 2026-07-17 · O3-L2SEC)** — **capa** é atributo de clube e de evento, com fallback para o gradiente por categoria (padrão já usado no DS/landing quando não há URL). **Nome canônico do campo = `imagemUrl`** (o mesmo que o evento já persiste desde RN-153 e que a landing lê): este épico nascera nomeando `capaUrl`, mas renomear o campo vivo do evento não paga o custo. `capaUrl` permanece EXCLUSIVO da capa de email de campanha/comunicado (RN-135) — conceito distinto. Decisão registrada no commit `c345834`.
- **RN-167 (proposta)** — exibição de participação de atleta em eventos/clubs no perfil público é **opt-in** por parte do atleta (consentimento LGPD; default = não exibir dados de participação de terceiros).

## Modelo de dados tocado

Ver `modelo-de-dados-firestore.md` (coleções a acrescentar). Leitura pública server-side; escrita pelo dono via app/painel.

- ➕ **`perfis/{handle}`** (nova coleção top-level, docId = handle) — `handle` (único, imutável — RN-160), `tipo`(`organizador`|`atleta`), `ownerUid→(profissionais|atletas)`, `nome`, `bio?`(≤280), `avatarUrl?`, `visibilidade`(publica/indexavel/privada — RN-161), `perfilTema { accent, capaUrl?, base }` (RN-162), `linksExternos?[]`, `criadoEm`. Escrita só pelo dono; leitura pública gated por `visibilidade`.
- ➕ **`perfis/{handle}/posts/{postId}`** (Feed) — `autorUid`(=dono), `texto`, `midiaUrl?`, `tipo`(texto/conquista/evento_ref/clube_ref), `visibilidade`, `criadoEm`. Escrita só pelo dono (RN-163); leitura conforme visibilidade. Agregados (∑ curtidas/comentários) por Function, se/quando houver interação social.
- **`eventos/{eventoId}`** — `imagemUrl?` (RN-166/RN-153 — nome canônico reconciliado; já persiste e há gradiente por categoria como fallback). Leitura pública só publicado.
- **`clubes/{clubId}`** — ➕ `imagemUrl?` (RN-166 — ✅ core+Rules em `c345834`, O3-L2SEC). Leitura pública gated por `visibilidade` (RN-140), já existente. Upload no painel = pendência do lote de painel.
- **Projeção de "Eventos/Clubs do perfil":** derivada por Function/consulta a partir de `eventos` (por `organizadorId`), `membros` (por `atletaId`) e `inscritos` (por `atletaId`, opt-in RN-167) — nunca escrita à mão; o perfil só lê a projeção pública.
- **Tokens (E01):** o `perfilTema.accent` gera um override de CSS vars **escopado ao nó do perfil** (`[data-perfil-accent]`), consumindo o pipeline de `tokens.json`/`generate.ts` — sem novo token de componente.

## Reuso (o que já existe e este épico aproveita)

- **Fundação da landing (E12-S1200):** `apps/landing` Next App Router SSR/ISR + `ThemeProvider theme="leela"` + convenção de revalidação por tag → a rota `/@{handle}` nasce sobre ela.
- **Leitor público server-side (E12-S1200-T2):** o padrão `getPublicX(slug) → X | null` com gate por status/visibilidade (Admin SDK bypassa Rules, gate no código) → reusar para `getPublicPerfil(handle)`.
- **ThemeProvider + tokens.json 3 tiers (E01):** troca de tema em runtime via `data-theme`; a tematização por-usuário estende isso com um override de `accent` escopado — **não** um sistema de tema novo.
- **Card de Evento / Card de Desafio / BannerHero (E01 + E12):** reusados nas abas Eventos/Clubs do perfil.
- **Página pública de clube (E12-S1202):** o perfil linka para ela; a capa (RN-166) é compartilhada.
- **Bottom-nav Feed·Eventos·Clubs·Perfil (wireframe Figma `112-4622`, E13):** a estrutura de navegação in-app já está prevista; este épico preenche as três abas sociais.

## Fora de escopo (Won't nesta fase)

- Grafo social (seguir/seguidores), curtidas/comentários e notificações sociais — só perfil + feed de leitura/composição própria na V1/V1.5.
- Mensageria direta entre usuários.
- Domínio/white-label próprio do perfil (segue sob `{leela-domain}`, coerente com RN-150).
- Descoberta algorítmica / busca de perfis (a lista pública fica em Onda 5, junto do marketplace).
- Monetização do perfil (assinatura/tip) — decisão pós-V1.

---

## User stories

Stories: **S1700** (perfil público link-in-bio) · **S1701** (tematização por-usuário) · **S1702** (capas de clube/evento) · **S1703** (Feed in-app leitura) · **S1704** (Feed in-app composição) · **S1705** (abas Eventos/Clubs in-app).

---

### LEELA-S1700 · Perfil público / link-in-bio (SSR/ISR, abas Feed·Eventos·Clubs)

**Como** organizador (ou atleta), **quero** um perfil público em `{leela-domain}/@{handle}` que reúna meu feed, meus eventos e meus clubs, **para** ter um único link compartilhável que me faz descoberto e retém quem me segue.

**JTBD:** 04.4 "ser visto como profissional / identidade" + 04.3 "aparecer na vitrine" (proposto: "compartilho quem eu sou → link único"). **Persona:** Organizador / Atleta.
- **MoSCoW:** Should · **Estimativa:** L · **Superfície:** Landing · **Onda:** 3

**Critérios de aceite (Given/When/Then):**
- **Dado** um perfil `publica`/`indexavel` com handle `@corrida-perfeita`, **quando** abro `{leela-domain}/@corrida-perfeita`, **então** vejo capa + nome + bio + as abas Feed · Eventos · Clubs renderizadas no servidor.
- **Dado** um perfil `privada`, **quando** acesso a URL, **então** recebo 404 público.
- **Dado** um handle inexistente, **quando** acesso, **então** 404.
- **Dado** a aba Eventos, **quando** renderizo, **então** só aparecem eventos publicados que a conta organiza (e participações opt-in — RN-164/167); cada card leva à página pública do evento (E12).
- **Dado** a aba Clubs, **quando** renderizo, **então** só aparecem clubes com `visibilidade` compatível (RN-165); clube `privada` não aparece.

**Tasks:** S1700-T1, S1700-T2, S1700-T3

> **Status O3-L2SEC (2026-07-17, `36cb756`+`afcf639`):** T1 ✅ COMPLETO no
> recorte backend+rota — registry `salvarPerfil` (unicidade global
> case-insensitive por docId normalizado, handle imutável, reservados, 1
> perfil/tenant DN-1), Rules `perfis/{handle}` (write:false; leitura
> client-SDK só dono/admin — review antagonista fechou a leitura pública do
> doc para não expor `ownerUid`), leitor Admin SDK sem PII
> (`apps/landing/lib/leitorPerfil.ts` — o wrapper em `packages/api-client`
> NÃO foi criado: território de outro lote) e rota `/@{handle}` DENTRO do
> segmento `[eventSlug]` (App Router não aceita segmento dinâmico irmão com
> outro nome; `@` desambigua). T2 parcialmente coberto pela própria página
> (3 seções com estados vazios honestos; Feed = EmptyState até a Onda 4);
> T3 ✅ (ShareBlock+QR reusados). **Pendências de painel:** editor de
> perfil do organizador (DN-1-T1 form) + wrapper api-client.

#### LEELA-S1700-T1 · Rota SSR/ISR `/@{handle}` + leitor público `getPublicPerfil`
- **Tipo:** screen + api/function · **Depende de:** E12-S1200-T2 (leitor público) · **Bloqueia:** S1700-T2/T3 · **Estimativa:** M

**Objetivo** Criar `app/(public)/@[handle]/page.tsx` que carrega o perfil público via leitor server-side (gate RN-161), com ISR (tag `perfil:{handle}`), e trata `privada`/inexistente → 404.

**Arquivos (criar/editar)**
- `apps/landing/app/(public)/[handle]/page.tsx` (segmento com `@`), `notFound()` quando `null`.
- `packages/api-client/src/public/getPublicPerfil.ts` — `getPublicPerfil(handle): PublicPerfil | null`.
- `packages/core/src/public/perfil.ts` — tipo `PublicPerfil` (só campos públicos) + derivação das listas de Eventos/Clubs.
- `firestore.rules` — leitura pública de `perfis/{handle}` gated por `visibilidade`.

**Critérios de aceite (testáveis)**
- **Dado** perfil `privada`, **quando** chamo `getPublicPerfil`, **então** retorna `null`.
- **Dado** perfil `indexavel`, **quando** chamo, **então** retorna o perfil sem campos privados (uid/links não públicos).

**Testes:** unit (mapeamento omite campos privados) · integração emulador (Rules bloqueiam perfil privado a anônimo).

#### LEELA-S1700-T2 · Componentes das 3 abas (Feed leitura · Eventos · Clubs) + navegação por aba
- **Tipo:** ui-component · **Depende de:** S1700-T1 · **Estimativa:** M

**Objetivo** Renderizar as abas: Feed (leitura dos `posts` públicos), Eventos (cards reusando E12), Clubs (cards reusando E12-S1202/Card de Desafio), com estados vazios honestos por aba.

**Critérios de aceite (testáveis)**
- **Dado** perfil sem posts, **quando** renderizo o Feed, **então** EmptyState (sem spinner solto).
- **Dado** 1 evento publicado + 1 rascunho, **quando** renderizo Eventos, **então** só o publicado aparece.

**Testes:** unit (filtro por visibilidade/status por aba).

#### LEELA-S1700-T3 · Estados públicos + bloco compartilhar (URL curta + QR)
- **Tipo:** screen · **Depende de:** S1700-T1 · **Estimativa:** S

**Objetivo** Bloco "compartilhar meu perfil" (copiar link + QR da URL pública) e estados (perfil sem conteúdo, participação oculta por opt-out). Reusa o `ShareBlock` do E12-S1201-T3.

**Critérios de aceite (testáveis)**
- **Dado** o perfil, **quando** copio o link, **então** toast "Link do perfil copiado" + QR da URL.

---

### LEELA-S1701 · Tematização por-usuário (tema dinâmico por conta sobre o DS)

**Como** dono de um perfil, **quero** escolher um accent e uma capa que deem a minha cara ao meu perfil, **para** que ele pareça meu sem quebrar a consistência do produto.

**JTBD:** 04.4 "identidade, não consumo". **Persona:** Organizador / Atleta.
- **MoSCoW:** Could · **Estimativa:** M · **Superfície:** App (editor) + DS (pipeline) + Landing (aplicação) · **Onda:** 4

**Critérios de aceite (Given/When/Then):**
- **Dado** que escolho um accent no editor, **quando** salvo, **então** o perfil (público e in-app) re-tematiza o destaque **sem** alterar markup de componente e **sem** criar token local (governança E01).
- **Dado** um accent que reprova no contraste AA sobre a superfície do tema base, **quando** salvo, **então** sou avisado e o sistema cai para o accent do tema base (RN-162).
- **Dado** que não personalizei, **quando** abro meu perfil, **então** ele usa o tema base (`brasa`/`leela`) sem override.

**Tasks:** S1701-T1 (pipeline de accent escopado sobre `tokens.json`/`generate.ts` + validação AA), S1701-T2 (editor de tema/capa in-app + persistência em `perfilTema`).

**Nota de arquitetura (eixo brasa/leela + tokens):** o accent NÃO é um terceiro tema; é um **override de tokens semânticos de destaque** escopado ao nó do perfil (`[data-perfil-accent]`), gerado pelo mesmo pipeline dos temas `brasa`/`leela`. O tema base continua sendo escolhido pelo consumidor (identidade DARK `brasa` por padrão); o accent só re-pinta o destaque da conta por cima. Isso mantém o §2.16 (flat) e a matriz AA.

---

### LEELA-S1702 · Capas de clube e de evento

**Como** organizador/coordenador, **quero** subir uma capa para meu clube e meus eventos, **para** que apareçam com identidade visual em todas as superfícies (perfil, página pública, cards).

**JTBD:** 04.4 "ser visto como profissional". **Persona:** Organizador / Coordenador.
- **MoSCoW:** Should · **Estimativa:** S · **Superfície:** Painel (upload) + todas (render) · **Onda:** 3 (habilita já as capas na landing E12)

**Critérios de aceite (Given/When/Then):**
- **Dado** um clube/evento com `capaUrl`, **quando** ele aparece em qualquer superfície, **então** a capa é exibida; **sem** `capaUrl`, cai para o gradiente por categoria (RN-166).
- **Dado** o upload de capa, **quando** salvo, **então** persiste `capaUrl` no doc do clube/evento e revalida as páginas públicas afetadas.

**Tasks:** S1702-T1 (campo `capaUrl` + upload no painel, clube e evento) · S1702-T2 (render da capa nos componentes de card/hero, com fallback gradiente).

> **Sinergia:** fecha o follow-up do E12 ("hero cover = placeholder gradiente quando sem URL") ao dar a fonte real da capa.

---

### LEELA-S1703 · Feed in-app (leitura)
**Como** atleta/organizador, **quero** ver meu feed no app, **para** acompanhar minha atividade e a da minha comunidade.
**JTBD:** 04.2 "vejo amigos ativos → pertencimento". **Persona:** Atleta. · **MoSCoW:** Could · **Est.:** M · **Superfície:** App · **Onda:** 4
- Aceite: aba Feed do bottom-nav lista `posts` visíveis (leitura), com EmptyState; sem composição ainda. **Task:** S1703-T1.

### LEELA-S1704 · Feed in-app (composição do dono)
**Como** dono do perfil, **quero** compor um post, **para** contar uma conquista/atualização. **JTBD:** 04.4 identidade. **Persona:** Atleta/Organizador. · **MoSCoW:** Could · **Est.:** M · **Superfície:** App · **Onda:** 4 (V1.5+)
- Aceite: só o dono compõe (RN-163); post respeita a visibilidade do perfil; escrita via Function. **Task:** S1704-T1.

### LEELA-S1705 · Abas Eventos/Clubs in-app do perfil
**Como** atleta, **quero** minhas abas Eventos e Clubs no app, **para** chegar rápido ao que participo. **JTBD:** 04.1 + 04.4. **Persona:** Atleta. · **MoSCoW:** Could · **Est.:** S · **Superfície:** App · **Onda:** 4
- Aceite: reusa a projeção de S1700-T1; opt-in de participação (RN-167). **Task:** S1705-T1.

---

## Ordem sugerida e encaixe nas Ondas

**Onda 3 (barato, sobre E12):** `S1702 (capas)` → `S1700 (perfil público link-in-bio)`. Entrega o link compartilhável e as capas reusando a landing — a maior parte do valor de descoberta com o menor custo.

**Onda 4 (com E13/app):** `S1701 (tematização por-usuário)` ∥ `S1703 (feed leitura)` → `S1705 (abas in-app)` → `S1704 (composição, V1.5+)`.

Dependências: `E12-S1200 ✅→ S1700`; `E01 ThemeProvider ✅→ S1701`; `E13 (app) → S1703/S1704/S1705`. Nenhum termo comercial é definido aqui.

## Regras de negócio novas (R9 · revisão UX do Vitor 2026-07-18)

- **RN-168 · Inputs de imagem do painel são upload-only.** O campo "cole uma URL" é removido dos inputs de imagem. Começa pela foto de perfil da conta (`ContaPage.tsx:251-290` — remove o `Input` "Ou cole uma URL" l.272 + estado/validação/botão). **Supersede** o fallback de URL da ADR-016 (item 5). Decisão de escopo (default recomendado = morre em TODAS as superfícies: perfil público avatar/capa, capa de clube, capa de evento) registrada em `DECISOES-ABERTAS`. Story `S-R9-07`. Spec: `02-rodadas/2026-07-18-ux-review/`.

## Regras de negócio novas (R12 · página-calendário do organizador 2026-07-18)

- **RN-169 · A página pública do organizador é um CALENDÁRIO/linha do tempo.** A superfície `/@{handle}` (organizador) apresenta os eventos como uma **timeline vertical por data** no padrão Luma (`luma.com/foundersrc`): **Próximos eventos** (data ≥ relógio do servidor, ascendente — o mais próximo primeiro) e, quando houver, **Já aconteceram** (descendente, **sem link** — a página do evento encerrado é 404 público honesto). Abaixo, a **faixa de patrocinadores** (RN-171 · logos 1:1 com fallback de monograma; some sem estado vazio quando não há patrocinador ativo), os **Clubs** (RN-165) e o **Feed** (RN-163, leitura). O split próximos/passados é derivado no leitor server-side (campo `futuro` do `EventoResumo`, relógio único) — a view não consulta relógio. Só dado público/gateado (RN-161/164/165); a projeção de patrocinadores é allowlist (`nome`, `logoUrl?` — nada comercial). Entregue em `LEELA-R12-F3` (`PerfilView` timeline + `resolverOrganizadorPublico` no leitor de evento p/ o bloco "Organizado por" da página de evento, que linka de volta para `/@{handle}`).

## Story de arquitetura (PARCIALMENTE executada · lote MODAL-ADR 2026-07-18 · ADR-017)

- **LEELA-S1706 · Primitivos server-safe no DS + gate de conformidade da landing.** *Como* time, *quero* extrair os primitivos estáticos (Button/Badge/Card **sem estado/sem `createContext`**) do `@leela/design-system` num subpath **server-safe** (sem `'use client'` no topo, sem barrel que avalie `createContext`), consumível tanto pelo painel (client) quanto pela **landing (Server Components, SSR puro)**, *para* eliminar a divergência entre os componentes da landing e o showroom sem re-importar o barrel de cliente. Hoje (R12) a landing replica os VALORES do showroom LOCALMENTE (`apps/landing/app/(public)/[eventSlug]/sections/marca.tsx` — selo/badge flat + tipografia + iconografia Lucide de apoio) porque o barrel do DS avalia `createContext` no topo e só entra pelo boundary `'use client'` de `_ds/ds.ts`. **Aceite:** (a) subpath `@leela/design-system/server` exporta Button/Badge/Card estáticos server-safe (tokens semânticos, flat §2.16, radius do DS); (b) a landing consome o subpath e **remove** as réplicas locais de `marca.tsx`; (c) **gate de conformidade** que compara o HTML SSR da landing com as specs do showroom (escala tipográfica, radius, pesos, iconografia) — flag na CI se a landing divergir do showroom. **Dep:** encadear **pós-R9-A** (o DS está em obra na lane R9-A — Combobox/Popover/Command). Fora do escopo do R12 (que preserva SSR com réplica local).

  **STATUS (lote MODAL-ADR, 2026-07-18 · [[ADR-017]]):** aceite **(a) FEITO com alcance ampliado** — subpath `@leela/design-system/server` exporta Badge/Card/CardEvento/DateBadge/EmptyState/`buttonVariants` server-safe, com **teste de pureza executável** no DS (grafo sem `@radix-ui`/`createContext`/hooks); NOVO subpath `@leela/design-system/dialog` entrega o `Dialog` Radix-free (o modal a11y da landing promovido a primitivo do DS). Aceite **(b) PARCIAL por decisão** — home e PerfilView já consomem o subpath (estáticos sem hydration); as réplicas de `marca.tsx` de escala própria da landing (selo hero, título com ícone) permanecem como composição de app DE PROPÓSITO (promover padrão de consumidor único mudaria visual aprovado sem QA — racional no ADR-017). Aceite **(c) PENDENTE** (gate CI de conformidade SSR×showroom).
