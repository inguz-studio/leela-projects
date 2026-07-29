# LEELA-E13 · App do Atleta (mobile Expo)

- **Superfície:** Mobile (Expo / React Native, publicado na App Store e Google Play)
- **Horizonte:** H1 (transacional: onboarding, descoberta, inscrição) → H2 (heroica diária: jornada, comunidade)
- **MoSCoW:** Must (H1/H2)
- **Estimativa:** XL
- **Status:** 📋 Backlog (épico novo; documento próprio — Onda 4)
- **Depende de:** LEELA-E00 (fundação técnica: monorepo, Firebase, Auth, Functions), LEELA-E01 (Design System & tokens — variante React Native), LEELA-E05 (domínio Clubs consumido: `clubes`, `membros`, `desafios`, `catalogoAcoes`, `parcerias`, `comunicados`), PaymentProvider (ADR-006), FCM/Push (integrações §2)
- **De-para:** (novo — não havia backlog `BH-` para o app; JTBD "Heroica Diária do Atleta" em `jobs-to-be-done.md`)

## Objetivo

Entregar ao **Atleta** o aplicativo mobile que unifica sua vida esportiva num só lugar: descobrir e inscrever-se em eventos, viver a jornada heroica diária (registrar ações dos 3 pilares e ver progresso em direção à próxima prova), pertencer à comunidade do clube e carregar uma identidade esportiva que cresce e dura. É a superfície que converte o lock-in emocional (comunidade + desafios) em uso diário, do lado do atleta, complementando o Painel do Profissional (E05) e a Landing pública (E12).

O app é React Native via Expo (EAS Build/Submit), reusa `packages/core` (regras de negócio RN-###, tipos, `PaymentProvider`) e `packages/design-system` na variante RN (mesmos tokens semânticos, tema `leela`), e consome o modelo de dados Firestore comum. Introduz as coleções que só o atleta escreve — registros de ação da jornada, participação em desafio, medalhas conquistadas, feed social do clube — sempre com Security Rules e agregados por Cloud Function na mesma task.

## Personas & JTBD

- **Persona primária:** Atleta — praticante esportivo urbano e/ou turista de bem-estar, 22-45 anos, corre/pedala/faz trilha/yoga/CrossFit em Florianópolis (morador ou visitante), 2-8 eventos/ano, usa Strava/Garmin/apps de meditação. Dor central (verbatim): *"Eu quero ser heroico todos os dias e que isso signifique algo. Hoje minha rotina e minhas provas vivem em apps diferentes que não conversam entre si."* Sem atleta-protagonista nomeado nas fontes; usar membros mock do clube **Corrida Perfeita Sul** (ver HANDOFF-05 §5) — ex.: Helena Bueno (novo membro, trigger de boas-vindas).
- **JTBD atendidos (de `jobs-to-be-done.md`):**
  - **Transacional (H1):** "Quando descubro um evento, quero me inscrever em poucos cliques e escolher meu kit sem fricção." · "Quando compro a inscrição, quero acompanhar kit, pagamento e resultado no mesmo lugar."
  - **Heroica diária (H2):** "Quando começo meu dia, quero ver o que preciso fazer para chegar na próxima prova." · "Quando completo um treino, quero registrar e ver o progresso em relação ao evento-alvo." · "Quando medito ou durmo bem, quero que conte como progresso, não só o treino." · "Quando a assessoria manda o treino, quero receber dentro do app." · "Quando vejo amigos ativos, quero sentir que estamos na mesma jornada."
  - **Social e identitária:** "Quando olho meu perfil, quero sentir que sou um atleta em progresso — identidade, não consumo." · "Quando passo pela largada, quero sentir que a rotina teve sentido."

## Critérios de sucesso do épico

- Atleta faz onboarding e login por **Apple (obrigatório na App Store)** ou **Google**, e no primeiro login o doc `atletas/{uid}` é criado.
- Navega pela Tab Bar de 5 itens (**Início · Eventos · Arena · Clubs · Perfil**) sem quebra de shell, com safe area e estados de carregando/erro/offline cobertos.
- Descobre eventos (feed + busca), abre a página do evento e completa **inscrição → pagamento → confirmação** via `PaymentProvider` (sandbox), com kit escolhido (nomenclatura "kit", nunca "tier" — RN-216) e cupom de afiliação aplicável.
- Registra ações dos 3 pilares (catálogo de 16 ações — RN-114), vê os pontos com os 2 bônus corretos (RN-115: +20% 3 pilares/dia, +10% 5+ dias/semana) e o progresso do desafio (modelos A/B/C — RN-110/111), respeitando o tom **Kepry / "Volte amanhã"** (nunca punir a falha).
- Conquista e coleciona **medalhas/recompensas** (RN-116) que persistem na identidade do atleta.
- Entra num clube por código (8A3K9) ou link, vê o **feed social que vive dentro do clube** (decisão v3.1) e recebe os **comunicados por push** (FCM), respeitando ≤160 chars (RN-134).
- Perfil mostra "quem ele é como atleta" (histórico, progresso, medalhas, clubes) com voz Leela.
- Build e submissão publicáveis por **EAS Build/Submit** (iOS + Android), com Sentry mobile ativo.
- Todas as telas consomem tokens e componentes de `packages/design-system` (variante RN, tema `leela`); nenhuma redefine estilo local; §2.16 (flat) respeitada.

## Regras de negócio aplicáveis

- **RN-101** — Código de convite do clube: 5 chars alfanuméricos maiúsculos, exclui `0/O/1/I/L` (ex.: 8A3K9). Entrada do atleta no clube.
- **RN-102** — Membro tem 3 status: ativo, novo (< 7 dias), inativo (30+ dias sem atividade).
- **RN-104** — Clube pago é promessa de produto: UI presente com "Chega em breve", lógica adiada.
- **RN-105** — Sub-afiliação de membros (atleta indica atleta) parkada para fase futura.
- **RN-110** — Desafio tem 3 modelos de conclusão: A (meta por ação), B (meta de pontos), C (equilíbrio mínimo).
- **RN-111** — Modelo C é o único que opera os 3 pilares simultaneamente (mínimo por pilar) — signature.
- **RN-113** — Desafio vinculado a evento exibe a copy "(Preparação para [evento])".
- **RN-114** — Catálogo de 16 ações em 3 pilares (7 Físico, 5 Mental, 4 Espiritual).
- **RN-115** — 2 bônus de pontuação: +20% se 3 pilares no mesmo dia, +10% se 5+ dias na semana.
- **RN-116** — Recompensa tem 4 tipos: medalha digital, cupom de evento, medalha física, custom.
- **RN-117** — Visibilidade do desafio: só membros, aberto por convite, público.
- **RN-133** — Limite de 4 comunicados push/semana por clube (volume de push que o atleta recebe).
- **RN-134** — Push tem limite de 160 caracteres no corpo.
- **RN-135** — Email suporta imagem de capa; push não.
- **RN-140** — Visibilidade da página do clube: pública, indexável, privada (governa o que o atleta anônimo/membro vê).
- **RN-141** — Aprovação manual de membros é opcional (entrada do atleta pode ficar pendente).
- **RN-144** — Deletar clube é irreversível (disclaimer LGPD, export 90 dias); relevante ao consentimento de dados do atleta.
- **RN-200** — Preço de evento bloqueado após a 1ª venda (o app lê preço vigente, nunca recalcula).
- **RN-202/216** — Kit tem tipos (kit_ouro/kit_prata/kit_basico/sem_kit); nomenclatura "kit" **nunca** "tier".
- **RN-204** — Inscrição tem status confirmado/pendente/cancelado (o app reflete o estado do pagamento).
- **RN-207** — Passo do chip suprimido quando `usaChip=false` (o app não coleta chip nesse caso).
- **RN-211** — "Sem kit" é kit válido e aceita preço negativo (desconto).
- **RN-125/311** — Link master de afiliação atribui a conversão dentro da janela (o app propaga `?c=[clube]` na inscrição).
- **RN-221** (herdada de E03/S208) — QR do ingresso é token de identificação/presença, não status de check-in concorrente: o app lê `qrToken`/`checkinEm` e exibe, nunca escreve status.
- **RN-222** (herdada de E03/S208) — Kit entregue antecipadamente: o QR na largada registra apenas `checkinEm` (presença), sem reabrir a entrega de kit; o app só reflete o estado.
- **RN-339** (herdada de E04/S305) — Corte de 48h: solicitações de reembolso a menos de 48h do evento são bloqueadas por padrão, salvo override do organizador.
- **RN-341** (herdada de E09/S904) — Máquina de estados de reembolso (`solicitado → aprovado_auto | em_analise → aprovado | recusado → estornado`); estado/estorno só por Function, nunca pelo cliente.
- **RN-342** (herdada de E09/S904) — Notificação obrigatória ao organizador na abertura da solicitação e ao atleta em cada transição.
- **RN-343** (herdada de E04/S305) — Troca de titularidade habilitada por flag do evento (`permiteTransferencia`); janela default 72h antes do evento; taxa de transferência configurável.
- **RN-344** (herdada de E04/S305) — Troca de ingresso (mesmo titular): upgrade cobra a diferença pelo lote vigente; downgrade sem reembolso por padrão; janela até 48h.
- **RN-345** (herdada de E09/S904) — Chip/kit na transferência: se o kit não foi entregue, recoleta o tamanho do novo titular; chip só vinculado na entrega (RN-203), sem impacto retroativo.
- **ADR-011** — Pedido em grupo: um responsável paga por N inscritos (pagamento único); reembolso, cancelamento, troca de titularidade e troca de ingresso operam **por inscrito** dentro do pedido; auto-inscrição é o caso de um pedido com um único inscrito (`ehResponsavel = true`).

## Modelo de dados tocado

Ver `modelo-de-dados-firestore.md`. O app **lê** coleções já criadas em E05/E03 e **cria** as coleções da jornada do atleta (todas com Security Rules e agregados por Cloud Function na mesma task):

- **Lê:** `atletas/{atletaId}` (identidade), `clubes/{clubId}` + `membros` + `desafios` + `acoes` + `comunicados`, `catalogoAcoes/{acaoId}` (16 ações global), `eventos/{eventoId}` + `kits` + `programaAfiliacao`.
- **Lê (pós-compra — ADR-011 / gaps fase 2):** `pedidos/{pedidoId}` (responsável + `inscritoRefs[]`, quando o atleta é responsável pelo pedido), `eventos/{id}/inscritos/{inscritoId}.{qrToken, checkinEm, pedidoRef, ehResponsavel}` (espelhados em `atletas/{uid}/inscricoes`), e o `estado` de `eventos/{id}/reembolsos` e `eventos/{id}/transferencias`.
- **Cria (novas nesta fase):**
  - `atletas/{atletaId}/registros/{registroId}` — log de ação da jornada: `acaoRef→catalogoAcoes`, `pilar`, `quantidade`, `unidade`, `pontos`(∑ calculado por Function), `data`, `desafioId?`, `origem`(manual/assessoria).
  - `clubes/{clubId}/desafios/{desafioId}/participantes/{atletaId}` — participação do atleta: `entrouEm`, ∑`pontos`, ∑`pontosPorPilar`, ∑`diasAtivosNaSemana`, `concluido`(bool). Agregado por Function no onWrite de `registros` (aplica bônus RN-115).
  - `atletas/{atletaId}/medalhas/{medalhaId}` — recompensa conquistada: `tipo`(RN-116), `origemDesafioId`, `titulo`, `icone`, `conquistadaEm`, `cupomCode?`.
  - `atletas/{atletaId}/inscricoes/{inscricaoId}` — espelho leve da inscrição do atleta (🔁 de `eventos/{id}/inscritos`), para a visão "minhas inscrições" no app.
  - `clubes/{clubId}/feed/{postId}` — **feed social que vive dentro do clube (decisão v3.1)**: `autorAtletaId`, 🔁`autorNome`, `texto`, `midiaUrl?`, `criadoEm`, ∑`curtidas`, ∑`comentarios`; subcoleção `comentarios/{comentarioId}`.
  - `atletas/{atletaId}/pushTokens/{tokenId}` — token FCM do dispositivo (registro/expurgo por device).
  - ➕ `pedidos/{pedidoId}` (ADR-011) — pedido em grupo: `responsavel`, `inscritoRefs[]`, `pagamentoRef`, `valorTotal`, `criadoEm`; criado via callable no checkout (S1306); `eventos/{id}/inscritos` ganha `pedidoRef` + `ehResponsavel`; estado financeiro só por Function.
  - ➕ `eventos/{id}/reembolsos/{reembolsoId}` — aberto via callable (S1315) com `estado=solicitado`, `origem=atleta`, **por inscrito** (ADR-011); a transição de estado/valor é só por Function (máquina de estados em E09-S904).
  - ➕ `eventos/{id}/transferencias/{transferenciaId}` — aberto via callable (S1316), `tipo` titularidade|ingresso, **por inscrito** (ADR-011); coleta dados/tamanho do novo titular; upgrade dispara `createCharge` da diferença; estado/`diffCobrada` só por Function; `inscritos.titularHistorico[]` append-only.

Agregados ∑ (pontos, progresso por pilar, dias ativos, curtidas, alcance) **apenas via Cloud Function** (Admin SDK), nunca no cliente. O cálculo de pontos e bônus é regra pura em `packages/core` (`calcularPontos`, reusado de E05-S106-T1) consumida pela Function.

## Fora de escopo (Won't nesta fase)

- Sub-afiliação de membros / atleta indica atleta (RN-105 — placeholder).
- Integração real com Strava/Garmin (import automático de treino) — registro é manual nesta fase.
- Clube pago / compra dentro do app além de inscrição de evento (RN-104 — só "Chega em breve").
- Chat 1:1 e mensagens diretas entre atletas (o feed do clube é o único canal social nesta fase).
- Criação/edição de desafio pelo atleta (é do Painel — E05); o atleta só participa.
- WhatsApp Business API (V2 — integrações §3); push é FCM.
- Gateway de pagamento concreto (fica no `PaymentProvider` + adapter de ADR-006; aqui usa sandbox/mock).
- Feed de atividade cross-clube global; ranking/leaderboard competitivo entre atletas.

---

## User stories

Stories `LEELA-S1300…S1316`. Persona em todas: **Atleta** (membros mock do Corrida Perfeita Sul; ex.: Helena Bueno). Tom de voz: `tom-de-voz.md` (Leela — Kepry/Raasa/Sangha, "Volte amanhã"; passado simples em microcopy, sem ponto final, sem emoji; anti-streak). Copy exata do `HANDOFF-07-glossario-copy.md`.

> Nota de referência de tela: não existem HTMLs de protótipo para o app do atleta (o protótipo `WEB-APPV2 (1)/` é do Painel). A fonte de UI é o **LEELA-E01** (Tab Bar 5 itens, Card Evento/Desafio, Banner Hero, variante RN dos componentes) + os JTBD/RNs acima. Cada task cita o componente do DS, não um arquivo `.html`.

---

### LEELA-S1300 · Setup do app Expo + pipeline EAS (release) · (de-para novo)

**Como** time, **quero** o app Expo configurado no monorepo com build e submissão por EAS, **para** que qualquer story do E13 rode em iOS/Android e o app seja publicável nas lojas.

- **MoSCoW:** Must · **Estimativa:** L · **Superfície:** Mobile · **RNs:** —

**Critérios de aceite (Given/When/Then):**
- **Dado** o monorepo Turborepo, **quando** rodo o app, **então** `apps/mobile` sobe no Expo consumindo `packages/core` e `packages/design-system` (variante RN) sem duplicar código.
- **Dado** `eas build`, **quando** disparo para iOS e Android, **então** gera artefatos assináveis com os identificadores de bundle definidos.
- **Dado** `eas submit`, **quando** configuro os canais, **então** o app é submetível à App Store e Google Play.
- **Dado** um erro em runtime, **quando** ocorre, **então** é capturado no Sentry (mobile) com contexto e sem dado sensível.

**Tasks:** LEELA-S1300-T1, LEELA-S1300-T2

#### LEELA-S1300-T1 · Bootstrap `apps/mobile` (Expo Router + consumo de core/design-system RN)

- **Tipo:** setup · **Depende de:** E00 (monorepo, Firebase), E01-S001-1-T2 (ThemeProvider RN) · **Bloqueia:** todas as demais tasks do E13 · **Estimativa:** M

**Objetivo**
Criar o app Expo (Expo Router, file-based) em `apps/mobile`, integrado ao Turborepo, consumindo `packages/core` e a variante RN de `packages/design-system` (tema `leela`), com Firebase (Auth + Firestore) inicializado.

**Contexto & referências**
- Stack: Expo (React Native) + EAS, Firebase Auth + Firestore (ADR-005/008), Turborepo (ADR-007)
- DS: `ThemeProvider` RN (E01-S001-1-T2), tokens semânticos tema `leela`
- Componentes DS RN a validar como consumíveis: Button, Card, Badge, Avatar, Toast

**Arquivos (criar/editar)**
- `apps/mobile/app/_layout.tsx` — root layout (ThemeProvider, SafeAreaProvider, providers)
- `apps/mobile/app.config.ts` — config Expo (nome, slug, bundle ids, ícones, splash, plugins)
- `apps/mobile/src/lib/firebase.ts` — init Firebase client (Auth + Firestore)
- `apps/mobile/package.json`, `apps/mobile/tsconfig.json` — workspaces + paths para `@leela/core` e `@leela/design-system`
- `turbo.json` — pipeline do `mobile` (dev/build/lint/type-check)

**Passos de implementação**
1. Scaffold Expo Router; configurar workspaces para importar `packages/core` e `packages/design-system` (RN entrypoint).
2. Montar `ThemeProvider` RN no root com tema `leela`; validar render de um Button/Card do DS.
3. Inicializar Firebase client (Auth + Firestore) via config de ambiente (sem segredo hardcoded).
4. Adicionar `SafeAreaProvider` e base de navegação (grupos de rota `(auth)` e `(tabs)`).

**Modelo de dados / contratos**
- Nenhuma coleção nova; só init de client SDK.

**Regras de negócio a respeitar**
- Sem segredo no cliente; configs via variáveis de ambiente/EAS secrets.

**Critérios de aceite (testáveis)**
- **Dado** o app rodando, **quando** abro, **então** renderiza um componente do DS (variante RN) com token do tema `leela`.
- **Dado** um import de `packages/core`, **quando** compilo, **então** type-check passa sem duplicar a lib.

**Testes a escrever**
- unit (componente RN): render de Button/Card do DS no app.
- smoke: app inicializa Firebase sem erro.

**Definition of Done**
- [ ] App sobe iOS + Android (simulador/emulador); consome core + DS RN
- [ ] Tokens do DS (nada hardcoded); tema `leela` aplicado
- [ ] Sem segredo no cliente; Sentry mobile inicializado
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Telas de domínio; auth (S1301); Tab Bar (S1302).

#### LEELA-S1300-T2 · Configuração EAS Build/Submit + Sentry mobile + credenciais das lojas

- **Tipo:** setup · **Depende de:** S1300-T1 · **Estimativa:** M

**Objetivo**
Configurar `eas.json` (perfis dev/preview/production), credenciais de assinatura iOS/Android, canais de submissão para App Store e Google Play, e Sentry mobile com upload de sourcemaps no build.

**Contexto & referências**
- Integrações §8 (Apple Developer + Google Play Console via EAS) e §5 (Sentry)
- Auth exige login social Apple + Google (App Store) — impacta capabilities do bundle iOS

**Arquivos (criar/editar)**
- `apps/mobile/eas.json` — perfis de build + submit
- `apps/mobile/app.config.ts` — plugins (Sentry, expo-apple-authentication, expo-notifications), bundle ids, permissões
- `apps/mobile/sentry.properties` / config de sourcemaps
- `.github/workflows/mobile-eas.yml` — CI que dispara `eas build` (opcional preview em PR)

**Passos de implementação**
1. Definir perfis `development` (dev client), `preview` (internal), `production` (store).
2. Configurar credenciais gerenciadas por EAS; declarar capability Sign in with Apple.
3. Configurar `eas submit` para os dois canais (App Store Connect + Google Play).
4. Integrar Sentry (DSN via secret) com upload de sourcemaps no build de produção.

**Modelo de dados / contratos**
- Nenhum.

**Regras de negócio a respeitar**
- Secrets via EAS/GitHub, nunca no repositório.

**Critérios de aceite (testáveis)**
- **Dado** `eas build --profile production` (iOS e Android), **quando** executo, **então** gera artefato assinado.
- **Dado** um crash forçado, **quando** ocorre, **então** aparece no Sentry com sourcemap resolvido.

**Testes a escrever**
- integração/CI: build `preview` compila; submit configurado (dry-run).

**Definition of Done**
- [ ] `eas build` iOS + Android verde; `eas submit` configurado para as 2 lojas
- [ ] Capability Sign in with Apple habilitada no bundle iOS
- [ ] Sentry com sourcemaps; secrets fora do repo
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Publicação real nas lojas (ação de release manual); assets finais de marketing.

---

### LEELA-S1301 · Onboarding + autenticação (Apple obrigatório + Google) · (de-para novo)

**Como** Atleta, **quero** conhecer o app em poucas telas e entrar com Apple ou Google, **para** começar a usar sem fricção e sem criar mais uma senha.

- **MoSCoW:** Must · **Estimativa:** L · **Superfície:** Mobile · **RNs:** (ADR-008 Auth)

**Critérios de aceite (Given/When/Then):**
- **Dado** o primeiro uso, **quando** abro o app deslogado, **então** vejo o onboarding (3 telas de valor com voz Leela: "Movimento que não precisa de motivo") e a tela de entrada.
- **Dado** a tela de entrada em iOS, **quando** carrega, **então** o botão **Entrar com Apple** está presente e proeminente (obrigatório na App Store).
- **Dado** a tela de entrada, **quando** escolho Google, **então** completo o fluxo OAuth e volto autenticado.
- **Dado** o primeiro login bem-sucedido, **quando** o auth resolve, **então** o doc `atletas/{uid}` é criado (nome, email, avatarInit, criadoEm) e vou para o Início.
- **Dado** que já logei antes, **quando** reabro o app, **então** a sessão persiste e caio direto no Início.
- **Dado** falha de auth (cancelado/rede), **quando** ocorre, **então** vejo mensagem clara sobre o que fazer, sem culpar ("Não deu para entrar agora. Tente de novo").

**Tasks:** LEELA-S1301-T1, LEELA-S1301-T2

#### LEELA-S1301-T1 · Provisionamento de atleta no 1º login + Function `onAtletaCreate` + Rules

- **Tipo:** api/function · **Depende de:** S1300-T1 · **Bloqueia:** S1301-T2, e toda story que lê `atletas/{uid}` · **Estimativa:** M

**Objetivo**
Garantir a criação idempotente do doc `atletas/{uid}` no primeiro login (qualquer provedor) e as Security Rules que restringem o atleta ao próprio doc + dados públicos.

**Contexto & referências**
- Modelo: `modelo-de-dados-firestore.md` → `atletas/{atletaId}` (uid = atletaId)
- Auth: Firebase Auth, papéis via custom claims (ADR-008)

**Arquivos (criar/editar)**
- `packages/core/src/atleta/atleta.ts` — `type Atleta` + factory `criarAtletaDeAuthUser(user)`
- `functions/src/atletas/onAuthUserCreate.ts` — cria `atletas/{uid}` (idempotente) + claim `atleta`
- `firestore.rules` — regras de `atletas/{atletaId}` e subcoleções do atleta
- `functions/src/seed/atletas.seed.ts` — atletas mock (membros do CPS) para emulator

**Passos de implementação**
1. `type Atleta` (`nome`, `email`, `avatarInit`, `criadoEm`) + derivação de `avatarInit` (iniciais).
2. Function no evento de criação de usuário Auth: cria doc se não existir (idempotente), seta custom claim `atleta`.
3. Rules: atleta lê/escreve só `atletas/{uid}` e suas subcoleções; lê `clubes`/`eventos` conforme visibilidade (RN-140); nunca escreve agregados ∑.
4. Seed dos membros mock.

**Modelo de dados / contratos**
- `atletas/{uid}` — campos acima; subcoleções `registros`, `medalhas`, `inscricoes`, `pushTokens`.

**Regras de negócio a respeitar**
- Atleta lê só o próprio doc + público; agregados só via Function.

**Critérios de aceite (testáveis)**
- **Dado** primeiro login, **quando** o usuário Auth é criado, **então** existe exatamente um `atletas/{uid}` (reprocessar não duplica).
- **Dado** atleta A logado, **quando** tenta ler `atletas/{B}`, **então** as rules negam.

**Testes a escrever**
- unit (core): `criarAtletaDeAuthUser` deriva avatarInit.
- integração (emulator): idempotência da Function; rules impedem leitura cruzada.

**Definition of Done**
- [ ] Doc criado idempotente; custom claim `atleta` setado
- [ ] Rules por dono testadas; agregados só via Function
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
UI de login (S1301-T2).

#### LEELA-S1301-T2 · Telas de onboarding + tela de entrada (Apple + Google) + gate de sessão

- **Tipo:** screen · **Depende de:** S1301-T1, S1300-T1 · **Estimativa:** M

**Objetivo**
Implementar o onboarding (carrossel de valor), a tela de entrada com Sign in with Apple (obrigatório iOS) e Google, e o gate de rota que direciona deslogado→`(auth)` e logado→`(tabs)`.

**Contexto & referências**
- Copy: tom Leela ("Movimento que não precisa de motivo"; "Vitalidade é uma escolha") — `tom-de-voz.md`
- DS: Button (Primary/Secondary), Banner Hero (E01), Avatar
- Libs: `expo-apple-authentication`, Google auth via Firebase

**Arquivos (criar/editar)**
- `apps/mobile/app/(auth)/onboarding.tsx`
- `apps/mobile/app/(auth)/login.tsx`
- `apps/mobile/src/features/auth/useAuth.ts` — hook de sessão + provedores
- `apps/mobile/src/features/auth/AuthGate.tsx` — redireciona por estado de sessão

**Passos de implementação**
1. Onboarding com 3 slides (valor + voz Leela); "Pular" e "Começar".
2. Tela de entrada: **Entrar com Apple** (proeminente em iOS) + **Entrar com Google**; erros claros e não punitivos.
3. `useAuth`: login/logout, persistência de sessão, exposição de `atleta`.
4. `AuthGate` no root: deslogado → `(auth)`, logado → `(tabs)`.

**Modelo de dados / contratos**
- Leitura: `atletas/{uid}` após login.

**Regras de negócio a respeitar**
- Apple obrigatório em iOS (política App Store).

**Critérios de aceite (testáveis)**
- **Dado** iOS deslogado, **quando** abro a entrada, **então** o botão Apple aparece.
- **Dado** login Google concluído, **quando** volto ao app, **então** estou no Início e a sessão persiste ao reabrir.
- **Dado** cancelamento do login, **quando** ocorre, **então** vejo mensagem clara e permaneço na entrada.

**Testes a escrever**
- unit (componente): render de entrada mostra Apple em iOS.
- e2e (Detox/Maestro): fluxo de login social (mock provider) → Início; sessão persiste.

**Definition of Done**
- [ ] Apple + Google funcionam; sessão persiste; gate correto
- [ ] Tokens do DS; voz Leela; erros não punitivos
- [ ] Estados carregando/erro cobertos; a11y (labels de botão, screen reader)
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Email/senha (não requerido nesta fase); edição de perfil (S1313).

---

### LEELA-S1302 · Shell mobile: Tab Bar 5 itens + navegação · (de-para novo)

**Como** Atleta, **quero** navegar por abas claras, **para** alcançar rapidamente onde quero (Início, Eventos, Arena, Clubs, Perfil).

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Mobile · **RNs:** —

**Critérios de aceite (Given/When/Then):**
- **Dado** que estou logado, **quando** abro o app, **então** vejo a **Tab Bar de 5 itens** (Início · Eventos · Arena · Clubs · Perfil) com a aba ativa destacada (tokens tema `leela`).
- **Dado** cada aba, **quando** toco, **então** navego para a stack correspondente mantendo estado por aba.
- **Dado** um deep link (ex.: push de comunicado), **quando** abro, **então** caio na tela-alvo dentro da aba certa.
- **Dado** qualquer tela, **quando** renderiza, **então** respeita safe area (notch/home indicator).

**Tasks:** LEELA-S1302-T1

#### LEELA-S1302-T1 · Tab navigator (Expo Router) + safe area + deep linking

- **Tipo:** ui-component · **Depende de:** S1300-T1, S1301-T2, E01-S001-3 (Tab Bar variante RN) · **Bloqueia:** S1303..S1313 (telas de aba) · **Estimativa:** M

**Objetivo**
Montar o navegador de abas com as 5 stacks, a Tab Bar do DS (variante RN, ícones Lucide), safe area e o esquema de deep linking para push/inscrição.

**Contexto & referências**
- DS: Tab Bar 5 itens (E01), ícones Lucide 24×24 stroke 1.75 currentColor
- Deep link targets: comunicado (S1312), evento (S1305), desafio (S1308)

**Arquivos (criar/editar)**
- `apps/mobile/app/(tabs)/_layout.tsx` — Tabs com 5 rotas
- `apps/mobile/app/(tabs)/{index,eventos,arena,clubs,perfil}/_layout.tsx` — stacks por aba
- `apps/mobile/src/lib/linking.ts` — mapa de deep links

**Passos de implementação**
1. Definir 5 abas (Início=`index`, Eventos, Arena, Clubs, Perfil) com ícones Lucide e rótulos.
2. Tab Bar consumindo tokens do DS (ativa/ inativa), safe area no bottom.
3. Mapa de deep linking (`leela://` + universal links) para as telas-alvo.

**Modelo de dados / contratos**
- Nenhum.

**Regras de negócio a respeitar**
- §2.16 (flat); tokens do DS.

**Critérios de aceite (testáveis)**
- **Dado** logado, **quando** abro, **então** as 5 abas aparecem e a ativa é destacada.
- **Dado** deep link de evento, **quando** abro, **então** caio na página do evento dentro da aba Eventos.

**Testes a escrever**
- unit (componente): render das 5 abas; aba ativa por rota.
- e2e: navegar entre abas mantém estado; deep link resolve.

**Definition of Done**
- [ ] Tab Bar do DS (5 itens); safe area; deep linking
- [ ] Tokens do DS; a11y (rótulos de aba)
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Conteúdo de cada aba (stories próprias).

---

### LEELA-S1303 · Início — dashboard heroico · (de-para novo)

**Como** Atleta, **quero** ver ao abrir o app o que preciso fazer para chegar na próxima prova, **para** ter uma rotina com propósito.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Mobile · **RNs:** RN-113, RN-115

**Critérios de aceite (Given/When/Then):**
- **Dado** o topo do Início, **quando** carrega, **então** vejo o **Banner Hero** com saudação personalizada ({nome}) e o próximo evento-alvo (ex.: "Meia Maratona Floripa 2026 · em 7 dias").
- **Dado** que participo de um desafio ativo, **quando** carrega, **então** vejo um Card Desafio com meu progresso (com a copy "(Preparação para Meia Maratona Floripa 2026)" quando vinculado — RN-113).
- **Dado** o resumo do dia, **quando** carrega, **então** vejo minhas ações registradas hoje e um atalho "Registrar ação" (→ Arena).
- **Dado** que não registrei nada hoje, **quando** carrega, **então** o estado convida sem punir ("Volte amanhã" é o espírito; nunca "você falhou").
- **Dado** um comunicado novo do clube, **quando** carrega, **então** vejo o acesso ao inbox (badge de não lidos).

**Tasks:** LEELA-S1303-T1

#### LEELA-S1303-T1 · Tela Início (Banner Hero + próximo evento + progresso + atalhos)

- **Tipo:** screen · **Depende de:** S1302-T1, S1308-T1 (progresso de desafio), S1306-T1 (inscrições) · **Estimativa:** M

**Objetivo**
Renderizar o dashboard heroico: Banner Hero com saudação e próximo evento, card(s) de desafio com progresso, resumo do dia e atalhos, com voz Leela e estados vazios não punitivos.

**Contexto & referências**
- DS: Banner Hero, Card Desafio (progress-bar Vitória, 100% elev-brand), Card Evento, Badge
- Copy: `tom-de-voz.md` (Kepry/anti-streak, "Volte amanhã"); microcopy em passado simples, sem ponto final, sem emoji
- Mocks: próximo evento Meia Floripa 2026 (27 Abr); desafio Preparação Meia Floripa 2026 (Modelo C, 62%)

**Arquivos (criar/editar)**
- `apps/mobile/app/(tabs)/index/index.tsx`
- `apps/mobile/src/features/home/HeroHeader.tsx`
- `apps/mobile/src/features/home/ProximaProvaCard.tsx`

**Passos de implementação**
1. Banner Hero com saudação {nome} + próximo evento-alvo (derivado de `inscricoes` + `eventos.data`).
2. Card(s) de desafio ativo com progresso do atleta (lê `participantes/{uid}`); copy de vínculo (RN-113).
3. Resumo do dia (ações de hoje em `registros`) + atalho "Registrar ação".
4. Acesso ao inbox de comunicados (badge de não lidos); estados vazios convidativos.

**Modelo de dados / contratos**
- Leitura: `atletas/{uid}/inscricoes`, `.../registros` (hoje), `desafios/{id}/participantes/{uid}`, `eventos/{id}`.

**Regras de negócio a respeitar**
- RN-113 (copy de vínculo); tom anti-streak (RN de marca, não punir a falha).

**Critérios de aceite (testáveis)**
- **Dado** inscrição na Meia Floripa, **quando** abro o Início, **então** o Banner Hero mostra o evento e a contagem regressiva.
- **Dado** nenhum registro hoje, **quando** abro, **então** o estado vazio convida sem culpar.

**Testes a escrever**
- unit (componente): saudação personalizada; card de progresso lê agregado.
- e2e: atalho "Registrar ação" abre a Arena.

**Definition of Done**
- [ ] Banner Hero + progresso + atalhos; voz Leela (anti-streak)
- [ ] Tokens do DS; §2.16; estados vazio/erro/carregando/offline
- [ ] a11y (screen reader nos cards)
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Registro de ação (Arena, S1307); leitura do comunicado (S1312).

---

### LEELA-S1304 · Descoberta de eventos (feed + busca) · (de-para novo)

**Como** Atleta, **quero** descobrir eventos e buscar por nome/modalidade/data, **para** encontrar minha próxima prova em poucos toques.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Mobile · **RNs:** RN-140

**Critérios de aceite (Given/When/Then):**
- **Dado** a aba Eventos, **quando** carrega, **então** vejo um feed de Cards Evento (media 16/10, gradiente por categoria, badge de modalidade) com contador "mostrando X de Y".
- **Dado** a busca, **quando** digito "Floripa", **então** só eventos que casam aparecem e o contador atualiza.
- **Dado** chips de filtro (modalidade 5k/10k/21k, data), **quando** seleciono, **então** o feed filtra por interseção.
- **Dado** filtro que zera, **quando** aplico, **então** EmptyState "Nenhum evento encontrado com os filtros aplicados".
- **Dado** um Card Evento, **quando** toco, **então** navego para a página do evento.

**Tasks:** LEELA-S1304-T1

#### LEELA-S1304-T1 · Feed de eventos + busca + filtros (aba Eventos)

- **Tipo:** screen · **Depende de:** S1302-T1, E01-S001-3-T4 (Card Evento) · **Estimativa:** M

**Objetivo**
Renderizar o feed de eventos com busca em tempo real, filtros combináveis, paginação e EmptyState, consumindo `eventos` públicos/publicados.

**Contexto & referências**
- DS: Card Evento (variante RN), Chip de filtro, Input de busca, EmptyState, Skeleton
- Mocks (HANDOFF-05): Meia Floripa 2026 (27 Abr, 5k/10k/21k), Trail Ratones 2026 (15 Mai), Corrida da Ponte 2026 (22 Jun)
- Regra: paginação obrigatória em listas densas (ADR-005)

**Arquivos (criar/editar)**
- `apps/mobile/app/(tabs)/eventos/index.tsx`
- `apps/mobile/src/features/eventos/EventoCard.tsx`
- `apps/mobile/src/features/eventos/EventosFilters.tsx`
- `packages/api-client/src/eventos.ts` — leitura tipada de `eventos` (se ainda não existir)

**Passos de implementação**
1. Query `eventos` com `status == publicado` (paginada).
2. Card Evento com gradiente por categoria + badge de modalidade + data.
3. Busca client-side + chips de modalidade/data (interseção); contador + EmptyState.
4. Skeleton no carregamento (nunca spinner solto).

**Modelo de dados / contratos**
- Leitura: `eventos` (público/publicado — RN-140 análogo para evento).

**Regras de negócio a respeitar**
- Paginação; §2.16.

**Critérios de aceite (testáveis)**
- **Dado** busca "Floripa", **quando** aplico, **então** só eventos que casam aparecem e o contador atualiza.
- **Dado** filtro que zera, **quando** aplico, **então** EmptyState com a copy padrão.

**Testes a escrever**
- unit (componente): busca + filtro por modalidade.
- e2e: tocar num card abre a página do evento.

**Definition of Done**
- [ ] Feed + busca + filtros + EmptyState + contador + paginação
- [ ] Card Evento do DS; tokens; §2.16; estados erro/carregando/offline
- [ ] a11y (labels de busca e chips)
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Página do evento (S1305); descoberta de clubes (S1310).

---

### LEELA-S1305 · Página do evento · (de-para novo)

**Como** Atleta, **quero** ver todos os detalhes de um evento e seus kits, **para** decidir me inscrever.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Mobile · **RNs:** RN-200, RN-202/216, RN-207, RN-211

**Critérios de aceite (Given/When/Then):**
- **Dado** a página do evento, **quando** carrega, **então** vejo Banner Hero, nome, data, local, modalidades e a lista de **kits** (nunca "tier" — RN-216) com preço vigente.
- **Dado** um kit, **quando** vejo, **então** mostra o que inclui e a capacidade; "Sem kit" aparece como opção válida (RN-211).
- **Dado** que cheguei por link master de clube (`?c=corrida-perfeita-sul`), **quando** abro, **então** o contexto de afiliação/cupom é preservado para o checkout (RN-125).
- **Dado** o botão "Inscrever-se", **quando** toco, **então** vou para o checkout com a modalidade/kit selecionados.

**Tasks:** LEELA-S1305-T1

#### LEELA-S1305-T1 · Tela de detalhe do evento + seleção de modalidade/kit

- **Tipo:** screen · **Depende de:** S1304-T1, E01-S001-3-T4 (Banner/Card) · **Bloqueia:** S1306-T2 · **Estimativa:** M

**Objetivo**
Renderizar o detalhe do evento com kits e modalidades, preservando o contexto de afiliação do link master, e encaminhar a seleção ao checkout.

**Contexto & referências**
- Modelo: `eventos/{id}` + `kits` (RN-202/216); preço bloqueado após 1ª venda (RN-200)
- Mocks: Meia Floripa 2026 — kits Ouro/Prata/Básico/Sem kit; cupom `CORRIDAPERFEITA10`; link `beh.ro/mfl26?c=cps`
- DS: Banner Hero, Card (kit), Badge de modalidade, Button

**Arquivos (criar/editar)**
- `apps/mobile/app/(tabs)/eventos/[slug]/index.tsx`
- `apps/mobile/src/features/eventos/KitSelector.tsx`
- `packages/core/src/eventos/afiliacao.ts` — captura/propagação de `?c=[clube]` (contexto de atribuição)

**Passos de implementação**
1. Carregar `eventos/{slug}` + `kits`; render Banner Hero + metadados + modalidades.
2. `KitSelector`: lista kits com inclui/capacidade; "Sem kit" válido (RN-211); preço vigente (RN-200, só leitura).
3. Capturar contexto de afiliação do deep link (`c`) e preservar para o checkout (RN-125).
4. Suprimir qualquer menção a chip se `usaChip=false` (RN-207).

**Modelo de dados / contratos**
- Leitura: `eventos/{slug}`, `kits`, `programaAfiliacao` (para validar cupom no checkout).

**Regras de negócio a respeitar**
- RN-216 ("kit"), RN-200 (preço só leitura), RN-207, RN-211.

**Critérios de aceite (testáveis)**
- **Dado** a Meia Floripa, **quando** abro, **então** vejo os 4 kits com preço e "Sem kit" como opção.
- **Dado** cheguei por `?c=corrida-perfeita-sul`, **quando** sigo para o checkout, **então** o contexto de afiliação é preservado.

**Testes a escrever**
- unit (core): parse/propagação do contexto de afiliação.
- e2e: selecionar kit + "Inscrever-se" abre o checkout com a seleção.

**Definition of Done**
- [ ] Detalhe + kits + modalidades; "kit" (RN-216); preço só leitura (RN-200)
- [ ] Contexto de afiliação preservado (RN-125); tokens do DS; §2.16
- [ ] Estados erro/carregando/offline; a11y
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Pagamento (S1306); página pública SSR (E12).

---

### LEELA-S1306 · Inscrição / checkout mobile (PaymentProvider) · (de-para novo)

**Como** Atleta responsável por um pedido, **quero** inscrever a mim e/ou outras pessoas num único pagamento, **para** garantir as vagas sem fricção e acompanhar tudo num lugar só. Auto-inscrição é o caso particular de um pedido com um único inscrito que é o próprio responsável (ADR-011).

- **MoSCoW:** Must · **Estimativa:** L · **Superfície:** Mobile · **RNs:** RN-125/311, RN-200, RN-204, RN-211, RN-216 · **ADR:** ADR-011 (pedido em grupo)

**Critérios de aceite (Given/When/Then):**
- **Dado** o checkout, **quando** carrega, **então** vejo um Stepper (evento/kit → participantes → pagamento → confirmação) com o resumo do **pedido** e os kits escolhidos.
- **Dado** que sou o responsável pelo pedido, **quando** toco "Novo participante", **então** adiciono um inscrito com **titular próprio** e coleto os dados dele (nome/CPF, modalidade/kit, tamanho quando o kit tem item tamanhado e, quando exigido, contato de emergência) — cada inscrito é independente (ADR-011).
- **Dado** um pedido com N inscritos, **quando** avanço para o pagamento, **então** o total soma todos os inscritos e há **um único pagamento** para o pedido inteiro (um `createCharge`, um webhook — ADR-011).
- **Dado** um cupom de afiliação (ex.: `CORRIDAPERFEITA10`), **quando** aplico, **então** o total reflete o desconto e a atribuição ao clube é registrada dentro da janela (RN-125/311).
- **Dado** o pagamento via `PaymentProvider` (Pix/cartão, sandbox), **quando** confirmo, **então** vejo estado "pendente" do pedido e, na confirmação do webhook, "confirmado" para todos os inscritos (RN-204).
- **Dado** a confirmação, **quando** conclui, **então** o app cria `pedidos/{pedidoId}` (responsável + `inscritoRefs[]`) e um `eventos/{id}/inscritos` por participante (com `pedidoRef` e `ehResponsavel`), espelhando em `atletas/{uid}/inscricoes` de cada titular; cada inscrição aparece em "Minhas inscrições" do seu titular (kit, pagamento, evento).
- **Dado** falha/recusa de pagamento, **quando** ocorre, **então** vejo mensagem clara e posso tentar de novo, sem duplicar cobrança nem inscritos (idempotência).

**Tasks:** LEELA-S1306-T1, LEELA-S1306-T2

#### LEELA-S1306-T1 · `inscricoes` do atleta + Function de conversão/split (via PaymentProvider) + Rules

- **Tipo:** api/function · **Depende de:** S1301-T1, S1305-T1, PaymentProvider (ADR-006) · **Bloqueia:** S1306-T2 · **Estimativa:** L

**Objetivo**
Implementar o fluxo transacional server-side de **pedido em grupo** (ADR-011): criar `pedidos/{pedidoId}` (um responsável + N inscritos), gerar **uma única cobrança** para o pedido via `PaymentProvider` (sandbox), tratar webhook idempotente de confirmação que confirma **todos os inscritos** do pedido, escrever `eventos/{id}/inscritos` (com `pedidoRef`/`ehResponsavel`) + espelho `atletas/{uid}/inscricoes` por titular, atualizar agregados do evento e registrar conversão/split de afiliação por inscrito dentro da janela.

**Contexto & referências**
- `PaymentProvider` (`createCharge`, `splitRules`, `handleWebhook`, `refund`) em `packages/core` (ADR-006)
- Modelo: `eventos/{id}/inscritos` (RN-204), `programaAfiliacao` (RN-311), `parcerias.conversoes/valorAReceber`
- Estratégia de testes: cobertura **máxima** na camada de pagamento (split, webhook, reembolso)

**Arquivos (criar/editar)**
- `packages/core/src/pagamento/PaymentProvider.ts` — interface (se ainda não existir de E04) + tipos
- `functions/src/inscricoes/criarCobranca.ts` — cria cobrança + splitRules (afiliação)
- `functions/src/inscricoes/onPagamentoWebhook.ts` — idempotente: confirma inscrito + agregados + conversão/split
- `functions/src/inscricoes/espelharInscricaoAtleta.ts` — mantém `atletas/{uid}/inscricoes` 🔁
- `firestore.rules` — `inscritos` (atleta lê a própria) + `atletas/{uid}/inscricoes`

**Passos de implementação**
1. Callable `criarPedido(eventoId, responsavel, inscritos[])` — cada inscrito com `{ titular (nome/CPF), modalidade, kit, tamanhos?, contatoEmergencia? }`: valida preço vigente de cada inscrito (RN-200), cria `pedidos/{pedidoId}` (`responsavel`, `inscritoRefs[]`, `valorTotal`) e um `inscritos` por participante (`pedidoRef`, `ehResponsavel`), monta `splitRules` por inscrito (comissão do clube — RN-311) e chama **um** `createCharge` do `valorTotal` (sandbox) — ADR-011.
2. Webhook idempotente: confirma **todos os `inscritos` do pedido** (status confirmado — RN-204), incrementa `eventos.qtdInscritos/receitaConfirmada` por inscrito, registra `parcerias.conversoes/valorAReceber` por inscrito se dentro da janela (RN-125/311).
3. Espelhar cada inscrição em `atletas/{uid}/inscricoes` do respectivo titular (🔁 kit, status, evento, `pedidoRef`).
4. Rules: atleta lê só as próprias inscrições e o próprio pedido (como responsável); agregados/financeiro só via Function; auto-inscrição = pedido de 1 inscrito com `ehResponsavel = true`.

**Modelo de dados / contratos**
- ➕ `pedidos/{pedidoId}` (`responsavel`, `inscritoRefs[]`, `pagamentoRef`, `valorTotal`, `criadoEm`); `eventos/{id}/inscritos/{inscritoId}` ganha `pedidoRef` + `ehResponsavel`; `atletas/{uid}/inscricoes/{id}`; conversão em `clubes/{clubId}/parcerias` (ADR-011).

**Regras de negócio a respeitar**
- RN-200, RN-204, RN-211, RN-216, RN-125/311; ADR-011 (pedido em grupo: pagamento único, split/conversão por inscrito).

**Critérios de aceite (testáveis)**
- **Dado** cupom válido dentro da janela, **quando** o pagamento confirma, **então** a conversão é atribuída ao clube uma única vez (webhook reprocessado não duplica).
- **Dado** "Sem kit" com preço negativo, **quando** cobro, **então** o total aplica o desconto (RN-211).
- **Dado** um pedido com 3 inscritos, **quando** o pagamento único confirma, **então** os 3 `inscritos` viram confirmado sob o mesmo `pedidoRef` e reprocessar o webhook não duplica inscritos nem conversão (ADR-011).

**Testes a escrever**
- integração (emulator + sandbox): criar pedido com N inscritos, cobrança única, split por inscrito, webhook idempotente, reembolso; rules por dono.

**Definition of Done**
- [ ] `pedidos/{pedidoId}` com responsável + N inscritos; pagamento único; confirmação por inscrito (ADR-011)
- [ ] Cobrança/split/webhook/reembolso idempotentes; conversão na janela (RN-311)
- [ ] Espelho `inscricoes` mantido por Function; agregados só via Function
- [ ] Cobertura máxima da camada de pagamento; Sentry sem dado sensível
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Gateway concreto (adapter ADR-006 futuro); UI (S1306-T2).

#### LEELA-S1306-T2 · Tela de checkout (Stepper + cupom + pagamento + confirmação) + Minhas inscrições

- **Tipo:** screen · **Depende de:** S1306-T1, S1305-T1, E01-S001-3-T4 (Stepper) · **Estimativa:** L

**Objetivo**
Implementar o checkout mobile de **pedido em grupo** (ADR-011): Stepper de etapas com "Novo participante" (o responsável adiciona N inscritos, cada um com titular e dados próprios), aplicação de cupom, **pagamento único** via `PaymentProvider`, estados de pagamento e a tela "Minhas inscrições".

**Contexto & referências**
- DS: Stepper (5 etapas), Card (resumo), Input (cupom/dados), Button (1 Primary), Toast
- Copy: voz Leela; "kit" (RN-216); microcopy em passado simples
- Mocks: Meia Floripa 2026, cupom `CORRIDAPERFEITA10` (−10%)

**Arquivos (criar/editar)**
- `apps/mobile/app/(tabs)/eventos/[slug]/checkout.tsx`
- `apps/mobile/app/(tabs)/perfil/inscricoes.tsx` — Minhas inscrições
- `apps/mobile/src/features/checkout/StepperCheckout.tsx`

**Passos de implementação**
1. Stepper: evento/kit → participantes → pagamento → confirmação; resumo do **pedido** (todos os inscritos + total) sempre visível.
2. "Novo participante": adiciona um inscrito com titular próprio; coleta nome/CPF, modalidade/kit, tamanho (quando o kit tem item tamanhado) e contato de emergência quando exigido; o responsável pode ser o primeiro inscrito (`ehResponsavel`) — ADR-011.
3. Aplicar cupom (chama validação server); total do pedido reflete o desconto.
4. Pagar **uma vez** o pedido inteiro via `PaymentProvider` (sandbox); refletir estados pendente/confirmado (RN-204) via listener.
5. Confirmação com CTA para "Minhas inscrições"; a tela lista `atletas/{uid}/inscricoes` do titular logado (kit, status, evento).
6. Falha de pagamento: mensagem clara + retry sem duplicar pedido/inscritos.

**Modelo de dados / contratos**
- Escrita via callable `criarPedido` (S1306-T1) → `pedidos` + `inscritos`; leitura de `atletas/{uid}/inscricoes`.

**Regras de negócio a respeitar**
- RN-204 (status), RN-216 ("kit"), RN-125 (cupom/afiliação); ADR-011 (pedido em grupo: "Novo participante", titular por inscrito, pagamento único).

**Critérios de aceite (testáveis)**
- **Dado** cupom `CORRIDAPERFEITA10`, **quando** aplico, **então** o total mostra −10%.
- **Dado** pagamento confirmado, **quando** conclui, **então** a inscrição aparece em Minhas inscrições como "confirmado".
- **Dado** que adiciono 2 participantes com "Novo participante", **quando** avanço, **então** cada inscrito tem dados próprios e o pagamento é único para o pedido (ADR-011).

**Testes a escrever**
- unit (componente): Stepper avança/valida; "Novo participante" coleta por inscrito; cupom recalcula total.
- e2e (Detox/Maestro): **pedido (1+ inscritos) → pagamento (sandbox) → confirmação** (fluxo crítico).

**Definition of Done**
- [ ] Stepper com "Novo participante" (N inscritos, titular próprio) + cupom + pagamento único + confirmação; Minhas inscrições (ADR-011)
- [ ] "kit" (RN-216); máx 1 Primary; tokens do DS; §2.16
- [ ] Estados pendente/erro/confirmado; a11y; Toast em ação de escrita
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Reembolso/cancelamento pela UI (agora em S1315); troca de titularidade/ingresso (S1316); recibo por email (integrações §6).

---

### LEELA-S1307 · Arena — registrar ações dos 3 pilares · (de-para novo)

**Como** Atleta, **quero** registrar o que fiz (correr, meditar, dormir bem) nos 3 pilares, **para** que minha rotina inteira conte como progresso.

- **MoSCoW:** Must · **Estimativa:** L · **Superfície:** Mobile · **RNs:** RN-114, RN-115

**Critérios de aceite (Given/When/Then):**
- **Dado** a aba Arena, **quando** abro "Registrar ação", **então** vejo as 16 ações organizadas em 3 pilares (Físico 7, Mental 5, Espiritual 4 — RN-114) com ícone Lucide e unidade.
- **Dado** uma ação (ex.: Correr, km), **quando** informo a quantidade e salvo, **então** o registro é criado e vejo os pontos calculados (2 pts/km).
- **Dado** que registrei os 3 pilares no mesmo dia, **quando** vejo o total, **então** o bônus +20% é aplicado (RN-115); com 5+ dias na semana, +10% (acumulam).
- **Dado** que vinculo o registro a um desafio ativo, **quando** salvo, **então** ele conta no progresso daquele desafio.
- **Dado** que não registrei hoje, **quando** volto amanhã, **então** o app celebra o retorno (Kepry), nunca pune a ausência.

**Tasks:** LEELA-S1307-T1, LEELA-S1307-T2

#### LEELA-S1307-T1 · Modelo `registros` + Function de agregação de progresso/pontos (bônus RN-115) + Rules

- **Tipo:** api/function · **Depende de:** S1301-T1, E05-S105-T1 (catalogoAcoes), E05-S106-T1 (`calcularPontos`) · **Bloqueia:** S1307-T2, S1308-T1, S1303-T1 · **Estimativa:** L

**Objetivo**
Criar `atletas/{uid}/registros`, a Function que ao gravar um registro calcula pontos (reusando `calcularPontos` de `core`, com os bônus RN-115) e agrega em `desafios/{id}/participantes/{uid}` e nos agregados do desafio, e as Security Rules.

**Contexto & referências**
- Modelo: `registros`, `participantes`; `calcularPontos` (RN-115) já existe em `packages/core` (E05-S106-T1)
- Catálogo: `catalogoAcoes` (16 ações, pontos base — HANDOFF-05)
- Testes: bônus são caso prioritário (estratégia de testes)

**Arquivos (criar/editar)**
- `packages/core/src/atleta/registro.ts` — `type Registro`, validação de quantidade/unidade por ação
- `functions/src/jornada/onRegistroWrite.ts` — agrega pontos/pilar/dias (idempotente) + aplica bônus RN-115
- `firestore.rules` — `atletas/{uid}/registros` (dono) + `desafios/{id}/participantes` (escrita só via Function)
- `functions/src/seed/registros.seed.ts` — registros mock para emulator

**Passos de implementação**
1. `type Registro` (`acaoRef`, `pilar`, `quantidade`, `unidade`, `data`, `desafioId?`, `origem`).
2. Function onWrite: calcula `pontos` do registro (pontosBase × quantidade) via `core`; agrega em `participantes/{uid}` (`pontos`, `pontosPorPilar`, `diasAtivosNaSemana`) aplicando +20% (3 pilares/dia) e +10% (5+ dias/semana) — RN-115; idempotente.
3. Atualiza agregados do desafio (progresso médio) e marca `concluido` conforme modelo (A/B/C — RN-110/111).
4. Rules: atleta escreve só os próprios `registros`; agregados/`participantes` só via Function.

**Modelo de dados / contratos**
- `atletas/{uid}/registros/{id}`; `desafios/{id}/participantes/{uid}`.

**Regras de negócio a respeitar**
- RN-114 (16 ações), RN-115 (bônus exatos), RN-110/111 (conclusão por modelo).

**Critérios de aceite (testáveis)**
- **Dado** registros em 3 pilares no mesmo dia, **quando** a Function agrega, **então** aplica +20%; com 5+ dias na semana, +10% (acumulam).
- **Dado** reprocessar o mesmo registro, **quando** ocorre, **então** os pontos não duplicam.

**Testes a escrever**
- unit (core): validação de registro por unidade de ação.
- integração (emulator): agregação idempotente com bônus; rules impedem escrita de `participantes` pelo cliente.

**Definition of Done**
- [ ] Registro cria pontos via `core`; bônus RN-115 corretos; idempotente
- [ ] Rules por dono; agregados só via Function
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
UI de registro (S1307-T2); import de Strava/Garmin.

#### LEELA-S1307-T2 · Tela de registro de ação (16 ações em 3 pilares + quantidade + feedback de pontos)

- **Tipo:** screen · **Depende de:** S1307-T1, S1302-T1 · **Estimativa:** M

**Objetivo**
Implementar o registro de ação na Arena: catálogo de 16 ações em tabs por pilar, entrada de quantidade por unidade, vínculo opcional a desafio e feedback dos pontos (com bônus), na voz Leela.

**Contexto & referências**
- DS: Tabs (§2.7 — todas no DOM/variante RN), Card de ação, Input numérico, Button, Toast
- Catálogo (HANDOFF-05): Correr `footprints` 2pt/km; Meditar `sparkles` 5pt/10min; Dormir 7h+ `moon` 3pt/noite; etc. (16 ações)
- Copy: microcopy em passado simples, sem ponto final, sem emoji ("registrou 5 km")

**Arquivos (criar/editar)**
- `apps/mobile/app/(tabs)/arena/registrar.tsx`
- `apps/mobile/src/features/jornada/PilarTabs.tsx`
- `apps/mobile/src/features/jornada/AcaoInput.tsx`

**Passos de implementação**
1. Tabs por pilar (Físico/Mental/Espiritual); cards de ação com ícone Lucide + unidade.
2. Selecionar ação → input de quantidade (por unidade); vínculo opcional a desafio ativo.
3. Salvar cria `registro`; Toast com pontos e bônus aplicados ("registrou 5 km · +10 pts").
4. Estado de sucesso celebra o retorno (Kepry), nunca menciona falha.

**Modelo de dados / contratos**
- Escrita: `atletas/{uid}/registros`.

**Regras de negócio a respeitar**
- RN-114 (16 ações), RN-115 (bônus exibidos), tom anti-streak.

**Critérios de aceite (testáveis)**
- **Dado** Correr 5 km, **quando** salvo, **então** vejo +10 pts e o registro persiste.
- **Dado** 3 pilares no mesmo dia, **quando** salvo o terceiro, **então** o feedback mostra o bônus +20%.

**Testes a escrever**
- unit (componente): render das 16 ações; input por unidade.
- e2e: registrar ação atualiza o progresso do desafio vinculado.

**Definition of Done**
- [ ] 16 ações em 3 pilares; feedback de pontos/bônus; voz Leela (anti-streak)
- [ ] §2.7 (tabs); tokens do DS; §2.16; estados erro/carregando
- [ ] a11y (labels de ação e input)
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Edição/remoção de registro histórico; gráficos avançados.

---

### LEELA-S1308 · Progresso de desafio + participação · (de-para novo)

**Como** Atleta, **quero** ver o progresso do desafio e o meu, **para** sentir consistência rumo à prova.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Mobile · **RNs:** RN-110, RN-111, RN-113, RN-115, RN-117

**Critérios de aceite (Given/When/Then):**
- **Dado** um desafio ativo do meu clube, **quando** abro, **então** vejo modelo (A/B/C), progresso coletivo e o meu (pontos e, no Modelo C, o mínimo por pilar — RN-111).
- **Dado** um desafio de que ainda não participo, **quando** toco "Participar", **então** entro como participante (respeitando visibilidade — RN-117).
- **Dado** um desafio vinculado a evento, **quando** carrega, **então** exibe "(Preparação para [evento])" (RN-113).
- **Dado** meu progresso, **quando** registro ações, **então** o progresso recalcula com os bônus (RN-115).

**Tasks:** LEELA-S1308-T1, LEELA-S1308-T2

#### LEELA-S1308-T1 · Participação em desafio (`participantes`) + Function de entrada + Rules

- **Tipo:** api/function · **Depende de:** S1307-T1, E05-S105-T1 (desafios) · **Bloqueia:** S1308-T2 · **Estimativa:** M

**Objetivo**
Permitir o atleta entrar num desafio (cria `participantes/{uid}`), respeitando a visibilidade (RN-117), e manter os agregados de participação por Function.

**Contexto & referências**
- Modelo: `desafios/{id}/participantes/{atletaId}`; visibilidade (RN-117); desafios mock (HANDOFF-05)

**Arquivos (criar/editar)**
- `packages/core/src/clubs/participacao.ts` — `podeParticipar(desafio, atleta, membro?)` (RN-117)
- `functions/src/jornada/entrarNoDesafio.ts` — cria `participantes/{uid}` + incrementa contador
- `firestore.rules` — `participantes` (leitura por membro/visibilidade; escrita de entrada validada)

**Passos de implementação**
1. `podeParticipar`: valida visibilidade (só membros / convite / público — RN-117).
2. Callable `entrarNoDesafio`: cria doc de participação (idempotente) + contador de participantes.
3. Rules: leitura conforme visibilidade; agregados só via Function.

**Modelo de dados / contratos**
- `desafios/{id}/participantes/{uid}` (∑ pontos/pilar/dias mantidos por S1307-T1).

**Regras de negócio a respeitar**
- RN-117 (visibilidade), RN-111 (mínimo por pilar na leitura de progresso).

**Critérios de aceite (testáveis)**
- **Dado** desafio "só membros" e atleta não membro, **quando** tenta participar, **então** é negado (RN-117).
- **Dado** entrada repetida, **quando** ocorre, **então** não duplica participação.

**Testes a escrever**
- unit (core): `podeParticipar` por visibilidade.
- integração (emulator): entrada idempotente; rules por visibilidade.

**Definition of Done**
- [ ] Entrada valida visibilidade (RN-117); idempotente; agregados só via Function
- [ ] Rules testadas · Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
UI (S1308-T2); cálculo de pontos (S1307-T1).

#### LEELA-S1308-T2 · Tela de detalhe do desafio (progresso coletivo + meu + participar)

- **Tipo:** screen · **Depende de:** S1308-T1, S1307-T2, E01-S001-3-T4 (Card Desafio) · **Estimativa:** M

**Objetivo**
Renderizar o detalhe do desafio com modelo, progresso coletivo e do atleta (mínimo por pilar no Modelo C), copy de vínculo de evento e ação "Participar".

**Contexto & referências**
- DS: Card Desafio (progress-bar Vitória, 100% elev-brand), Badge de modelo, Progress por pilar, Button
- Mocks: Preparação Meia Floripa 2026 (C, 62%; Físico 74% / Mental 68% / Espiritual 43%); Morro da Cruz (A, 47%); Marcha Mental (B, 78%)
- Copy: "(Preparação para Meia Maratona Floripa 2026)" (RN-113)

**Arquivos (criar/editar)**
- `apps/mobile/app/(tabs)/arena/desafios/[id].tsx`
- `apps/mobile/src/features/jornada/ProgressoPorPilar.tsx`

**Passos de implementação**
1. Carregar `desafios/{id}` + `participantes/{uid}`; render modelo (A/B/C) + progresso coletivo.
2. Modelo C: mostrar mínimo por pilar e o meu vs mínimo (RN-111).
3. Copy de vínculo de evento (RN-113); "Participar" chama `entrarNoDesafio`.
4. Progresso recalcula ao registrar (listener sobre `participantes/{uid}`).

**Modelo de dados / contratos**
- Leitura: `desafios/{id}`, `participantes/{uid}`, agregados.

**Regras de negócio a respeitar**
- RN-110/111 (modelo/mínimo), RN-113 (copy), RN-117 (participar).

**Critérios de aceite (testáveis)**
- **Dado** Preparação Meia Floripa (Modelo C), **quando** abro, **então** vejo o mínimo por pilar e meu progresso por pilar.
- **Dado** "Participar" num desafio público, **quando** toco, **então** entro e passo a ver meu progresso.

**Testes a escrever**
- unit (componente): render por modelo; progresso por pilar.
- e2e: participar → registrar ação → progresso sobe.

**Definition of Done**
- [ ] Detalhe + progresso coletivo/pessoal + participar; RN-111/113
- [ ] Card Desafio do DS; tokens; §2.16; estados vazio/erro/carregando
- [ ] a11y · Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Criação/edição de desafio (E05); ranking competitivo.

---

### LEELA-S1309 · Medalhas e recompensas · (de-para novo)

**Como** Atleta, **quero** conquistar e colecionar medalhas que duram, **para** que meu esforço vire identidade, não um kudos que some no dia seguinte.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Mobile · **RNs:** RN-116

**Critérios de aceite (Given/When/Then):**
- **Dado** que concluí um desafio, **quando** a conclusão é reconhecida, **então** recebo a recompensa do tipo definido (medalha digital / cupom de evento / medalha física / custom — RN-116).
- **Dado** uma recompensa do tipo cupom (ex.: "Cupom para evento vinculado · R$ 20 off"), **quando** conquisto, **então** o cupom fica disponível para usar na inscrição do evento vinculado.
- **Dado** a estante de medalhas no Perfil, **quando** abro, **então** vejo as medalhas conquistadas com título, ícone e data.
- **Dado** que ainda não conquistei nenhuma, **quando** abro, **então** o estado vazio convida sem punir ("Sua primeira medalha chega quando você voltar amanhã").

**Tasks:** LEELA-S1309-T1

#### LEELA-S1309-T1 · Concessão de recompensa (`medalhas`) por conclusão + Function + estante

- **Tipo:** api/function · **Depende de:** S1308-T1, E05-S105-T1 (recompensaTipo) · **Estimativa:** M

**Objetivo**
Conceder a recompensa quando o atleta conclui um desafio (cria `atletas/{uid}/medalhas`), mapeando o `recompensaTipo` do desafio (RN-116), e renderizar a estante de medalhas.

**Contexto & referências**
- Modelo: `atletas/{uid}/medalhas`; `desafios.recompensaTipo` (RN-116)
- Mock: recompensa padrão "Cupom para evento vinculado · R$ 20 off" (RN-216: "kit" na copy quando aplicável)
- DS: Card/Badge (medalha), EmptyState

**Arquivos (criar/editar)**
- `packages/core/src/atleta/medalha.ts` — `type Medalha` + mapeamento de recompensa
- `functions/src/jornada/onDesafioConcluido.ts` — concede medalha idempotente + emite cupom se tipo cupom
- `apps/mobile/src/features/perfil/EstanteMedalhas.tsx`
- `firestore.rules` — `atletas/{uid}/medalhas` (leitura do dono; escrita só via Function)

**Passos de implementação**
1. `type Medalha` (`tipo`, `titulo`, `icone`, `origemDesafioId`, `conquistadaEm`, `cupomCode?`).
2. Function ao marcar `participantes/{uid}.concluido = true`: cria medalha (idempotente); se `recompensaTipo=cupom`, gera `cupomCode` utilizável no evento vinculado.
3. Estante no Perfil (grid de medalhas) + EmptyState com voz Leela.

**Modelo de dados / contratos**
- `atletas/{uid}/medalhas/{id}`.

**Regras de negócio a respeitar**
- RN-116 (4 tipos), RN-216 (copy "kit").

**Critérios de aceite (testáveis)**
- **Dado** conclusão de desafio com recompensa cupom, **quando** concedida, **então** existe uma medalha com `cupomCode` (reprocessar não duplica).
- **Dado** a estante, **quando** abro sem medalhas, **então** vejo o EmptyState convidativo.

**Testes a escrever**
- integração (emulator): concessão idempotente por conclusão; rules impedem escrita pelo cliente.
- unit (componente): render da estante + EmptyState.

**Definition of Done**
- [ ] Recompensa concedida por tipo (RN-116); idempotente; cupom utilizável
- [ ] Estante + EmptyState (voz Leela); tokens do DS; §2.16
- [ ] Rules por dono · a11y · Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Logística de medalha física; compartilhamento social externo.

---

### LEELA-S1310 · Clubs — entrar no clube + página do clube · (de-para novo)

**Como** Atleta, **quero** entrar no meu clube por código ou link e ver sua página, **para** pertencer a uma comunidade local com rosto e nome.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Mobile · **RNs:** RN-101, RN-102, RN-140, RN-141

**Critérios de aceite (Given/When/Then):**
- **Dado** a aba Clubs sem clube, **quando** abro, **então** posso entrar por **código** (8A3K9) ou colar um **link** de convite.
- **Dado** um código válido, **quando** confirmo, **então** viro membro (ou fico "pendente" se o clube exige aprovação manual — RN-141) e recebo as boas-vindas.
- **Dado** um código inválido, **quando** tento, **então** vejo erro claro (formato 5 chars, exclui 0/O/1/I/L — RN-101).
- **Dado** que sou membro, **quando** abro o clube, **então** vejo a página (Banner, bio, membros com rosto/nome, desafios ativos) respeitando a visibilidade (RN-140).

**Tasks:** LEELA-S1310-T1

#### LEELA-S1310-T1 · Entrar no clube (código/link) + página do clube (membro)

- **Tipo:** screen · **Depende de:** S1301-T1, E05-S101-T1 (clubes), E05-S103-T1 (membros) · **Bloqueia:** S1311-T2 · **Estimativa:** M

**Objetivo**
Implementar a entrada no clube por código/link (criando `membros/{uid}` com `entrouVia`, respeitando aprovação manual) e a página do clube na visão do atleta membro.

**Contexto & referências**
- `core`: `validarCodigoConvite` (RN-101) já existe (E05-S101-T1); `derivarStatus` (RN-102)
- Modelo: `clubes/{clubId}/membros/{uid}`; visibilidade (RN-140), aprovação manual (RN-141)
- Mocks: Corrida Perfeita Sul (código 8A3K9, avatar CPS, bio); boas-vindas "Oi {nome}! Bem-vinda ao Corrida Perfeita Sul..."
- DS: Banner Hero, Avatar, Input (código), Card, Button

**Arquivos (criar/editar)**
- `apps/mobile/app/(tabs)/clubs/index.tsx` — entrar / lista dos meus clubes
- `apps/mobile/app/(tabs)/clubs/[slug]/index.tsx` — página do clube (membro)
- `functions/src/clubs/entrarNoClube.ts` — cria `membros/{uid}` (código/link) + aprovação (RN-141)
- `firestore.rules` — atleta cria a própria adesão; leitura de clube por visibilidade

**Passos de implementação**
1. Entrada por código (`validarCodigoConvite` — RN-101) ou link; callable `entrarNoClube` cria `membros/{uid}` com `entrouVia`.
2. Se `aprovacaoManual` (RN-141), status "pendente" até o coordenador aprovar; senão "novo" (RN-102).
3. Boas-vindas com copy do glossário ({nome}); página do clube: Banner, bio, membros (rosto/nome), desafios ativos, respeitando visibilidade (RN-140).

**Modelo de dados / contratos**
- Escrita: `clubes/{clubId}/membros/{uid}`; leitura de `clubes`, `membros`, `desafios`.

**Regras de negócio a respeitar**
- RN-101 (código), RN-102 (status), RN-140 (visibilidade), RN-141 (aprovação).

**Critérios de aceite (testáveis)**
- **Dado** código 8A3K9, **quando** confirmo, **então** viro membro do Corrida Perfeita Sul (ou "pendente" se aprovação manual).
- **Dado** código com `0/O/1/I/L`, **quando** tento, **então** vejo erro de formato (RN-101).

**Testes a escrever**
- unit (core): reuso de `validarCodigoConvite`.
- e2e: entrar por código → boas-vindas → página do clube.

**Definition of Done**
- [ ] Entrada por código/link; aprovação manual (RN-141); página do clube por visibilidade (RN-140)
- [ ] Boas-vindas (voz Leela); tokens do DS; §2.16; estados erro/carregando
- [ ] Rules por dono · a11y · Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Descoberta pública de clubes (marketplace); sub-afiliação (RN-105).

---

### LEELA-S1311 · Comunidade — feed social dentro do clube (decisão v3.1) · (de-para novo)

**Como** Atleta, **quero** um feed social que vive dentro do meu clube, **para** ver que a galera está na mesma jornada e interagir com rosto e nome.

- **MoSCoW:** Must · **Estimativa:** L · **Superfície:** Mobile · **RNs:** RN-102, RN-143 (comportamento do clube), RN-133 (contexto push)

> **Decisão v3.1:** o feed social **não** é global; ele **vive dentro do clube** (`clubes/{clubId}/feed`). Não há timeline cross-clube nesta fase.

**Critérios de aceite (Given/When/Then):**
- **Dado** que sou membro, **quando** abro a aba de comunidade do clube, **então** vejo o feed do clube (posts com autor/rosto/nome, texto, mídia opcional, curtidas, comentários).
- **Dado** o comportamento do clube (aberto/moderado/silencioso — RN-143), **quando** o clube é "silencioso", **então** membros não postam (só leem); "moderado" exige aprovação.
- **Dado** um post, **quando** curto ou comento, **então** o agregado (curtidas/comentários) atualiza (mantido por Function).
- **Dado** um feed vazio, **quando** abro, **então** o estado convida ("A galera ainda não postou. Comece a conversa").

**Tasks:** LEELA-S1311-T1, LEELA-S1311-T2

#### LEELA-S1311-T1 · Modelo `feed` do clube + Functions de agregado (curtidas/comentários) + Rules

- **Tipo:** data-model · **Depende de:** E05-S101-T1 (clubes), S1310-T1 (membro) · **Bloqueia:** S1311-T2 · **Estimativa:** M

**Objetivo**
Criar `clubes/{clubId}/feed/{postId}` + `comentarios`, as Functions de agregado (curtidas/comentários), e as Security Rules que respeitam o comportamento do clube (RN-143) e restringem posts a membros.

**Contexto & referências**
- Modelo: `clubes/{clubId}/feed` (novo — decisão v3.1); comportamento do clube (RN-143: aberto/moderado/silencioso)

**Arquivos (criar/editar)**
- `packages/core/src/clubs/feed.ts` — `type Post`, `type Comentario`, `podePostar(membro, comportamento)` (RN-143)
- `functions/src/clubs/onCurtidaWrite.ts`, `onComentarioWrite.ts` — agregados idempotentes
- `firestore.rules` — `feed`/`comentarios` (membro lê; postar conforme comportamento; agregados só via Function)
- `functions/src/seed/feed.seed.ts` — posts mock do CPS

**Passos de implementação**
1. `type Post` (`autorAtletaId`, 🔁`autorNome`, `texto`, `midiaUrl?`, `criadoEm`, ∑`curtidas`, ∑`comentarios`, `status` aprovado/pendente).
2. `podePostar`: valida comportamento (silencioso bloqueia; moderado → pendente; aberto → aprovado) — RN-143.
3. Functions de agregado idempotentes (curtidas/comentários).
4. Rules: só membro do clube lê/escreve; agregados só via Function.

**Modelo de dados / contratos**
- `clubes/{clubId}/feed/{postId}` + `comentarios/{id}`.

**Regras de negócio a respeitar**
- RN-143 (comportamento), RN-102 (só membro ativo/novo posta).

**Critérios de aceite (testáveis)**
- **Dado** clube "silencioso", **quando** membro tenta postar, **então** é negado (RN-143).
- **Dado** curtir duas vezes o mesmo post, **quando** ocorre, **então** o contador não duplica.

**Testes a escrever**
- unit (core): `podePostar` por comportamento.
- integração (emulator): agregados idempotentes; rules por membro/comportamento.

**Definition of Done**
- [ ] Feed dentro do clube (v3.1); comportamento (RN-143); agregados idempotentes só via Function
- [ ] Rules por membro · Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
UI (S1311-T2); timeline cross-clube; chat 1:1.

#### LEELA-S1311-T2 · Tela do feed do clube (posts + curtir + comentar + compor)

- **Tipo:** screen · **Depende de:** S1311-T1, S1310-T1 · **Estimativa:** M

**Objetivo**
Renderizar o feed do clube com posts (autor/rosto/nome), curtir/comentar, composição de post (respeitando comportamento) e EmptyState, na voz Leela (Sangha, "a galera").

**Contexto & referências**
- DS: Card (post), Avatar, Button, Input (comentário/compor), EmptyState, Skeleton
- Copy: voz Leela coletiva ("a galera", "nós"); microcopy em passado simples

**Arquivos (criar/editar)**
- `apps/mobile/app/(tabs)/clubs/[slug]/feed.tsx`
- `apps/mobile/src/features/comunidade/PostCard.tsx`
- `apps/mobile/src/features/comunidade/ComporPost.tsx`

**Passos de implementação**
1. Listar `feed` (paginado) com posts (autor, texto, mídia, curtidas, comentários).
2. Curtir/comentar (escrita → agregado por Function); atualização otimista.
3. Compor post (habilitado conforme comportamento — RN-143); moderado avisa "aguardando aprovação".
4. EmptyState convidativo; Skeleton no load.

**Modelo de dados / contratos**
- Leitura/escrita: `feed`, `comentarios` (agregados via Function).

**Regras de negócio a respeitar**
- RN-143 (comportamento na UI); §2.16.

**Critérios de aceite (testáveis)**
- **Dado** o feed com posts, **quando** curto, **então** o contador sobe e persiste.
- **Dado** clube "moderado", **quando** posto, **então** vejo "aguardando aprovação".

**Testes a escrever**
- unit (componente): render de post; curtir otimista.
- e2e: compor post em clube "aberto" aparece no feed.

**Definition of Done**
- [ ] Feed + curtir + comentar + compor; comportamento (RN-143); voz Leela (Sangha)
- [ ] Tokens do DS; §2.16; EmptyState + paginação; estados erro/carregando/offline
- [ ] a11y · Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Moderação/aprovação de posts pelo coordenador (Painel); denúncias.

---

### LEELA-S1312 · Comunicados recebidos + push (FCM) · (de-para novo)

**Como** Atleta, **quero** receber os comunicados do meu clube por push e relê-los num inbox, **para** não perder treino, aviso de kit ou lembrete.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Mobile · **RNs:** RN-131, RN-133, RN-134, RN-135

**Critérios de aceite (Given/When/Then):**
- **Dado** que autorizo notificações, **quando** o clube envia um comunicado push, **então** recebo a notificação (≤160 chars — RN-134) e, ao tocar, caio no comunicado (deep link).
- **Dado** o inbox, **quando** abro, **então** vejo os comunicados recebidos (push/email — RN-131) com título, trecho e data; email exibe capa (RN-135), push não.
- **Dado** um comunicado não lido, **quando** abro, **então** marca como lido e o badge atualiza.
- **Dado** que neguei permissão de push, **quando** abro, **então** vejo como reativar, sem bloquear o resto do app.

**Tasks:** LEELA-S1312-T1, LEELA-S1312-T2

#### LEELA-S1312-T1 · Registro de push token (FCM) + entrega de comunicado ao atleta + Rules

- **Tipo:** api/function · **Depende de:** S1301-T1, E05 (comunicados) · **Bloqueia:** S1312-T2 · **Estimativa:** M

**Objetivo**
Registrar o token FCM por dispositivo (`atletas/{uid}/pushTokens`), entregar os comunicados do clube ao atleta (fan-out por segmento) via push, e refletir no inbox, respeitando limites (RN-133/134).

**Contexto & referências**
- Integrações §2 (FCM); `comunicados` (E05): segmento, canal, push ≤160 (RN-134), ≤4/semana (RN-133)
- Modelo: `atletas/{uid}/pushTokens`; inbox derivado de `comunicados` entregues

**Arquivos (criar/editar)**
- `functions/src/comunicacao/onComunicadoEnviado.ts` — fan-out por segmento → FCM + registro de entrega
- `functions/src/comunicacao/registrarPushToken.ts` — callable de registro/expurgo de token
- `packages/core/src/comunicacao/push.ts` — truncamento/validação 160 (RN-134)
- `firestore.rules` — `pushTokens` (dono); leitura de comunicados entregues ao atleta

**Passos de implementação**
1. Callable registra/expurga token FCM por device (idempotente).
2. Na Function de envio do comunicado (E05), fan-out por segmento (todos/por_desafio/por_pilar/por_engajamento) → push (≤160 — RN-134) + email (capa — RN-135), respeitando ≤4/semana (RN-133).
3. Registrar entrega/alcance (∑ via Function) para o inbox.

**Modelo de dados / contratos**
- `atletas/{uid}/pushTokens/{id}`; leitura de `clubes/{id}/comunicados` entregues.

**Regras de negócio a respeitar**
- RN-131 (canais), RN-133 (≤4/semana), RN-134 (≤160), RN-135 (capa só email).

**Critérios de aceite (testáveis)**
- **Dado** comunicado push de 200 chars, **quando** entrego, **então** o corpo trunca em 160 (RN-134).
- **Dado** o 5º push do clube na semana, **quando** tento, **então** é bloqueado (RN-133).

**Testes a escrever**
- unit (core): truncamento 160.
- integração (emulator): fan-out por segmento; bloqueio do 5º push; token idempotente.

**Definition of Done**
- [ ] Token FCM registrado (idempotente); fan-out por segmento; RN-133/134/135
- [ ] Rules por dono · agregados só via Function · Sentry sem dado sensível
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
WhatsApp (V2); UI do inbox (S1312-T2); composição de comunicado (E05).

#### LEELA-S1312-T2 · Permissão de push + inbox de comunicados + leitura

- **Tipo:** screen · **Depende de:** S1312-T1, S1302-T1 · **Estimativa:** M

**Objetivo**
Implementar a solicitação de permissão de push (com registro do token), o inbox de comunicados recebidos, a leitura (marcar lido + badge) e o deep link do push para o comunicado.

**Contexto & referências**
- Lib: `expo-notifications`; deep link (S1302-T1)
- Copy: comunicados mock (HANDOFF-05) — boas-vindas, mobilidade, alerta de kit; voz Leela
- DS: Card (comunicado), Badge (não lido), EmptyState

**Arquivos (criar/editar)**
- `apps/mobile/src/features/notificacoes/usePush.ts` — permissão + registro de token + handler de deep link
- `apps/mobile/app/(tabs)/index/inbox.tsx` — inbox
- `apps/mobile/app/(tabs)/index/comunicado/[id].tsx` — leitura

**Passos de implementação**
1. Solicitar permissão de push; ao conceder, registrar token (S1312-T1); se negado, mostrar como reativar.
2. Handler de push → deep link para `comunicado/[id]`.
3. Inbox lista comunicados recebidos (push/email — RN-131); email mostra capa (RN-135).
4. Abrir marca como lido + atualiza badge; EmptyState convidativo.

**Modelo de dados / contratos**
- Leitura: comunicados entregues; escrita de "lido" no doc de entrega do atleta.

**Regras de negócio a respeitar**
- RN-131 (canais), RN-135 (capa só email), RN-134 (push já truncado).

**Critérios de aceite (testáveis)**
- **Dado** um push recebido, **quando** toco, **então** abro o comunicado e ele marca como lido.
- **Dado** permissão negada, **quando** abro o inbox, **então** vejo como reativar sem bloquear o app.

**Testes a escrever**
- unit (componente): inbox marca lido + badge.
- e2e: deep link de push abre o comunicado.

**Definition of Done**
- [ ] Permissão + registro de token; inbox + leitura + badge; deep link
- [ ] Canais (RN-131); capa só email (RN-135); voz Leela; tokens do DS; §2.16
- [ ] Estados vazio/erro; a11y · Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Preferências granulares de notificação por tipo; WhatsApp.

---

### LEELA-S1313 · Perfil / identidade do atleta · (de-para novo)

**Como** Atleta, **quero** um perfil que mostre quem eu sou como atleta, **para** sentir que sou um atleta em progresso, não um consumidor.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Mobile · **RNs:** RN-144 (LGPD), RN-116 (medalhas)

**Critérios de aceite (Given/When/Then):**
- **Dado** a aba Perfil, **quando** abro, **então** vejo minha identidade (avatar/iniciais, nome), clubes, estante de medalhas, histórico de inscrições e resumo de progresso.
- **Dado** editar perfil, **quando** salvo nome/avatar, **então** persiste em `atletas/{uid}` e reflete nas superfícies.
- **Dado** privacidade/dados, **quando** abro, **então** posso solicitar exportação e exclusão da conta (LGPD — disclaimer, export 90 dias — análogo RN-144).
- **Dado** logout, **quando** aciono, **então** encerro a sessão e volto para a entrada.

**Tasks:** LEELA-S1313-T1

#### LEELA-S1313-T1 · Tela de Perfil (identidade + clubes + medalhas + inscrições + configurações/LGPD/logout)

- **Tipo:** screen · **Depende de:** S1301-T1, S1309-T1 (medalhas), S1306-T2 (inscrições), S1310-T1 (clubes) · **Estimativa:** M

**Objetivo**
Renderizar o Perfil do atleta: identidade editável, clubes, estante de medalhas, histórico de inscrições, resumo de progresso, e as ações de conta (exportar/excluir dados — LGPD, logout).

**Contexto & referências**
- Modelo: `atletas/{uid}` + subcoleções (`medalhas`, `inscricoes`); clubes via `membros`
- Copy: voz Leela identitária ("um atleta em progresso"); LGPD (RN-144 análogo)
- DS: Header (avatar/nome), Card, Badge, Button (Destructive para excluir), ConfirmModal (§2.15 variante RN)

**Arquivos (criar/editar)**
- `apps/mobile/app/(tabs)/perfil/index.tsx`
- `apps/mobile/app/(tabs)/perfil/editar.tsx`
- `apps/mobile/app/(tabs)/perfil/privacidade.tsx`
- `functions/src/atletas/exportarDados.ts`, `excluirConta.ts` — LGPD (export/exclusão)

**Passos de implementação**
1. Perfil: identidade (avatar/iniciais, nome), clubes, estante de medalhas (S1309), inscrições (S1306), resumo de progresso.
2. Editar nome/avatar → escreve `atletas/{uid}`.
3. Privacidade: exportar dados (gera export) + excluir conta (ConfirmModal com preview + disclaimer LGPD; export 90 dias — RN-144).
4. Logout encerra a sessão.

**Modelo de dados / contratos**
- Escrita: `atletas/{uid}` (perfil); Functions de export/exclusão.

**Regras de negócio a respeitar**
- RN-144 (LGPD: disclaimer, export 90 dias), RN-116 (medalhas).

**Critérios de aceite (testáveis)**
- **Dado** editar o nome, **quando** salvo, **então** persiste e reflete no header.
- **Dado** excluir conta, **quando** confirmo no ConfirmModal, **então** vejo o preview de consequências + disclaimer LGPD antes de confirmar.

**Testes a escrever**
- unit (componente): render de identidade + medalhas + inscrições.
- e2e: editar nome persiste; logout volta à entrada.

**Definition of Done**
- [ ] Identidade + clubes + medalhas + inscrições + progresso; edição persiste
- [ ] LGPD (export/exclusão com ConfirmModal + disclaimer — RN-144); logout
- [ ] Tokens do DS; §2.16; voz Leela; a11y; estados erro/carregando
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Perfil público visível por outros atletas; integrações Strava/Garmin.

---

### LEELA-S1314 · QR do ingresso e estado de check-in no app · (de-para novo)

**Como** Atleta, **quero** ver meu QR do ingresso e saber se meu check-in já foi feito, **para** acompanhar kit, ingresso e presença no mesmo lugar e me identificar rápido no balcão.

- **MoSCoW:** Should · **Estimativa:** M · **Superfície:** Mobile · **RNs:** RN-221, RN-222 (herdadas de E03/S208)

> Tela de referência: `EVENTOS-MEUS INGRESSOS` (`39:605`), "Meus Qr Codes", estado "Check-in já realizado" (`39:6586`) — telas Be Hero a re-skinnar para tokens Leela. O `qrToken` é emitido na confirmação (E12-S1206 / RN-218) e o `checkinEm` é setado no balcão (E03-S208 / RN-221/222); o app apenas lê.

**Critérios de aceite (Given/When/Then):**
- **Dado** uma inscrição confirmada com `qrToken`, **quando** abro "Meus Qr Codes", **então** o app renderiza o QR a partir de `qrToken` (leitura do espelho; nunca gera o token no cliente).
- **Dado** `checkinEm != null` na minha inscrição espelhada, **quando** abro o ingresso, **então** vejo o estado "Check-in já realizado" (`39:6586`) como leitura, nunca uma escrita de status pelo cliente (RN-221).
- **Dado** `checkinEm == null`, **quando** abro o ingresso, **então** o QR fica disponível para identificação no balcão sem indicar check-in feito (RN-222).
- **Dado** que a inscrição ainda não emitiu ingresso (`qrToken` ausente), **quando** abro a tela, **então** vejo estado vazio/carregando coerente, sem QR quebrado.

**Tasks:** LEELA-S1314-T1, LEELA-S1314-T2

#### LEELA-S1314-T1 · Espelho de ingresso no atleta (`qrToken`/`checkinEm`) — leitura sem escrita de status

- **Tipo:** data-model/api · **Depende de:** S1306-T1 (espelho `inscricoes`), E12-S1206 (emissão de `qrToken`), E03-S208 (`checkinEm`) · **Bloqueia:** S1314-T2 · **Estimativa:** S

**Objetivo**
Garantir que o espelho `atletas/{uid}/inscricoes` propague `qrToken` e `checkinEm` (🔁 do `eventos/{id}/inscritos`) por Function, e que as Rules permitam ao atleta apenas ler esses campos, nunca escrever status de check-in.

**Contexto & referências**
- Modelo: `eventos/{id}/inscritos` ganha `qrToken` (RN-218, emitido na confirmação) e `checkinEm` (RN-221/222, setado no balcão E03-S208)
- Espelho `atletas/{uid}/inscricoes` (S1306-T1) — estende a Function de espelho

**Arquivos (criar/editar)**
- `functions/src/inscricoes/espelharInscricaoAtleta.ts` — incluir `qrToken`, `checkinEm`, `kitEntregueEm?` no espelho
- `firestore.rules` — `atletas/{uid}/inscricoes` leitura do dono; `checkinEm`/`qrToken` nunca escritos pelo cliente

**Passos de implementação**
1. Estender a Function de espelho para copiar `qrToken`, `checkinEm` (e `kitEntregueEm?`) no onWrite do inscrito.
2. Rules: negar escrita de `qrToken`/`checkinEm`/status pelo cliente; permitir só leitura do dono.

**Modelo de dados / contratos**
- Leitura: `atletas/{uid}/inscricoes/{id}` com `qrToken`, `checkinEm` (🔁 de `eventos/{id}/inscritos`).

**Regras de negócio a respeitar**
- RN-221 (QR = identificação/presença, não status concorrente), RN-222 (kit antecipado seta só `checkinEm`).

**Critérios de aceite (testáveis)**
- **Dado** o balcão seta `checkinEm`, **quando** a Function espelha, **então** `atletas/{uid}/inscricoes` reflete `checkinEm` sem o cliente escrever.
- **Dado** atleta logado, **quando** tenta escrever `checkinEm`/`qrToken`, **então** as Rules negam.

**Testes a escrever**
- integração (emulator): espelho propaga `checkinEm`; rules impedem escrita de status pelo cliente.

**Definition of Done**
- [ ] Espelho propaga `qrToken`/`checkinEm` por Function; cliente só lê
- [ ] Rules por dono testadas; nenhuma escrita de status pelo cliente
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Emissão do `qrToken` (E12-S1206); registro de check-in no balcão (E03-S208); UI (S1314-T2).

#### LEELA-S1314-T2 · Tela "Meus Qr Codes" (QR de `qrToken` + estado de check-in)

- **Tipo:** screen · **Depende de:** S1314-T1, S1302-T1 · **Estimativa:** S

**Objetivo**
Renderizar a tela "Meus Qr Codes" que exibe o QR a partir de `qrToken` e o estado "Check-in já realizado" (`39:6586`), com estados vazio/carregando quando o ingresso ainda não foi emitido.

**Contexto & referências**
- DS: Card (ingresso), Badge (estado), EmptyState, Skeleton; QR renderizado client-side a partir do token opaco (sem gerar token)
- Copy: voz Leela; microcopy em passado simples, sem ponto final, sem emoji ("check-in já realizado")

**Arquivos (criar/editar)**
- `apps/mobile/app/(tabs)/perfil/ingressos/[inscricaoId].tsx` — tela do ingresso/QR
- `apps/mobile/src/features/ingresso/QrIngresso.tsx` — render do QR a partir de `qrToken`
- `apps/mobile/src/features/ingresso/EstadoCheckin.tsx` — badge de estado

**Passos de implementação**
1. Ler `atletas/{uid}/inscricoes/{id}` (S1314-T1); render QR a partir de `qrToken`.
2. Se `checkinEm != null`, exibir "Check-in já realizado" (`39:6586`); senão QR ativo para identificação.
3. `qrToken` ausente → EmptyState/Skeleton coerente, sem QR quebrado.

**Modelo de dados / contratos**
- Leitura: `atletas/{uid}/inscricoes/{id}` (`qrToken`, `checkinEm`).

**Regras de negócio a respeitar**
- RN-221 (estado é leitura), RN-222; §2.16.

**Critérios de aceite (testáveis)**
- **Dado** `qrToken` presente, **quando** abro, **então** vejo o QR renderizado a partir do token.
- **Dado** `checkinEm != null`, **quando** abro, **então** vejo "Check-in já realizado" sem escrever status.

**Testes a escrever**
- unit (componente): render do QR; badge de check-in por `checkinEm`.
- e2e: abrir ingresso confirmado mostra QR; estado de check-in reflete o espelho.

**Definition of Done**
- [ ] QR de `qrToken`; estado "Check-in já realizado" (`39:6586`); estados vazio/carregando
- [ ] Tokens do DS; §2.16; voz Leela; a11y (label do QR e do estado)
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
PDF do ingresso (E12-S1206 / RN-220); leitura/scanner do QR no balcão (E03-S208).

---

### LEELA-S1315 · Solicitar reembolso / cancelar inscrição no app · (de-para novo)

**Como** Atleta, **quero** solicitar reembolso ou cancelar minha inscrição pelo app, **para** desistir da prova sem falar com o organizador, com um processo claro de reembolso.

- **MoSCoW:** Should · **Estimativa:** M · **Superfície:** Mobile · **RNs:** RN-339 (herdada de E04/S305), RN-341, RN-342 (herdadas de E09/S904) · **ADR:** ADR-011 (por inscrito)

> Tela greenfield (sem HTML de protótipo). A máquina de estados e o estorno vivem em E09-S904; o app só abre a solicitação por callable e lê o `estado`. Reembolso/cancelamento operam **por inscrito** dentro do pedido (ADR-011): cancelar um inscrito não cancela os demais.

**Critérios de aceite (Given/When/Then):**
- **Dado** uma inscrição minha dentro de um pedido em grupo, **quando** solicito reembolso, **então** a operação atua **por inscrito** (não pelo pedido inteiro) e cria `eventos/{id}/reembolsos/{reembolsoId}` com `estado=solicitado` e `origem=atleta` via callable (ADR-011).
- **Dado** a solicitação criada, **quando** ela abre, **então** a escrita de estado/financeiro é feita só por Function e o cliente não escreve valor nem estado (RN-341); a abertura notifica o organizador (RN-342).
- **Dado** uma solicitação em andamento, **quando** abro a tela, **então** leio o `estado` da máquina (`solicitado → aprovado_auto | em_analise → aprovado | recusado → estornado`) e cada transição me notifica (RN-342).
- **Dado** uma solicitação a menos de 48h do evento, **quando** tento abrir, **então** vejo o bloqueio por padrão (RN-339, salvo override do organizador) com mensagem clara.
- **Dado** que já existe uma solicitação aberta para a mesma inscrição, **quando** tento abrir outra, **então** a duplicidade é impedida.

**Tasks:** LEELA-S1315-T1, LEELA-S1315-T2

#### LEELA-S1315-T1 · Callable de abertura de reembolso/cancelamento por inscrito (`reembolsos/{id}` `estado=solicitado`)

- **Tipo:** api/function · **Depende de:** S1306-T1 (inscritos/pedido), E09-S904 (máquina de estados/estorno), E04-S305 (política) · **Bloqueia:** S1315-T2 · **Estimativa:** M

**Objetivo**
Expor a callable que o atleta usa para abrir um reembolso/cancelamento **por inscrito** (cria `eventos/{id}/reembolsos/{reembolsoId}` com `estado=solicitado`, `origem=atleta`), validando janela (RN-339) e unicidade, sem qualquer escrita financeira no cliente. A máquina de estados/estorno e as notificações de transição são de E09-S904.

**Contexto & referências**
- Modelo: `eventos/{id}/reembolsos/{reembolsoId}` (E09-S904): `inscritoId`, `motivo`, `estado`, `origem`, `valorSolicitado`, `transicoes[]`, `criadoEm`
- Política: `eventos/{id}/politicaVendas` (E04-S305) — `corteHoras:48` (RN-339)
- ADR-011: granularidade por inscrito dentro do pedido

**Arquivos (criar/editar)**
- `functions/src/reembolsos/abrirReembolso.ts` — callable: valida janela (RN-339), unicidade, cria `reembolsos/{id}` `estado=solicitado`
- `firestore.rules` — atleta cria solicitação da própria inscrição; estado/financeiro só por Function

**Passos de implementação**
1. Callable `abrirReembolso(eventoId, inscritoId, motivo?)`: verifica que o inscrito é do atleta, que não há solicitação aberta (unicidade) e que faltam >48h (RN-339, salvo override).
2. Cria `reembolsos/{id}` com `estado=solicitado`, `origem=atleta` (sem valor/estado financeiro pelo cliente); dispara notificação de abertura ao organizador (RN-342).
3. Rules: leitura da própria solicitação; transição de estado e valor só por Function (E09-S904).

**Modelo de dados / contratos**
- ➕ escrita inicial de `eventos/{id}/reembolsos/{reembolsoId}` (`estado=solicitado`), por inscrito (ADR-011); leitura do `estado`.

**Regras de negócio a respeitar**
- RN-339 (corte 48h), RN-341 (máquina de estados/estorno só por Function), RN-342 (notificação); ADR-011 (por inscrito).

**Critérios de aceite (testáveis)**
- **Dado** uma inscrição do atleta a >48h do evento, **quando** abro reembolso, **então** cria `reembolsos/{id}` `estado=solicitado` e o cliente não escreve valor/estado.
- **Dado** solicitação já aberta para o inscrito, **quando** tento outra, **então** é impedida (unicidade).
- **Dado** <48h do evento sem override, **quando** tento, **então** é bloqueada (RN-339).

**Testes a escrever**
- integração (emulator): criação por inscrito; unicidade; bloqueio de janela; rules impedem escrita financeira pelo cliente.

**Definition of Done**
- [ ] Callable cria `reembolsos/{id}` `estado=solicitado` por inscrito (ADR-011); sem escrita financeira no cliente
- [ ] Janela (RN-339) e unicidade validadas; notificação de abertura (RN-342) disparada
- [ ] Rules por dono; estado/valor só por Function (RN-341)
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Máquina de estados/execução de estorno e notificações de transição (E09-S904); política/janelas configuráveis (E04-S305); UI (S1315-T2).

#### LEELA-S1315-T2 · Tela de solicitação + leitura do `estado` (bloqueio de janela)

- **Tipo:** screen · **Depende de:** S1315-T1, S1306-T2 (Minhas inscrições) · **Estimativa:** M

**Objetivo**
Implementar a tela onde o atleta, a partir de uma inscrição, solicita reembolso/cancelamento (por inscrito), lê o `estado` da máquina em tempo real e vê o bloqueio de janela (RN-339) com mensagem clara.

**Contexto & referências**
- DS: Card (inscrição), Button (Destructive para cancelar), ConfirmModal (§2.15 variante RN), Badge (estado), Toast
- Copy: voz Leela, não punitiva; microcopy em passado simples
- Estado lido: `solicitado → aprovado_auto | em_analise → aprovado | recusado → estornado`

**Arquivos (criar/editar)**
- `apps/mobile/app/(tabs)/perfil/inscricoes/[id]/reembolso.tsx`
- `apps/mobile/src/features/reembolso/SolicitarReembolso.tsx`
- `apps/mobile/src/features/reembolso/EstadoReembolso.tsx`

**Passos de implementação**
1. A partir de "Minhas inscrições", ação "Solicitar reembolso/cancelar" por inscrito.
2. ConfirmModal com preview + motivo opcional; chama `abrirReembolso` (S1315-T1).
3. Listener no `estado` do `reembolsos/{id}`; badge/timeline de transições (RN-342).
4. <48h → bloqueio com mensagem clara (RN-339); solicitação já aberta → estado atual, sem duplicar.

**Modelo de dados / contratos**
- Escrita via callable (S1315-T1); leitura de `eventos/{id}/reembolsos/{id}.estado`.

**Regras de negócio a respeitar**
- RN-339 (bloqueio de janela), RN-341/342 (só leitura do estado; escrita por Function); ADR-011.

**Critérios de aceite (testáveis)**
- **Dado** inscrição elegível, **quando** confirmo, **então** vejo `estado=solicitado` e a atualização em tempo real das transições.
- **Dado** <48h do evento, **quando** tento, **então** vejo o bloqueio (RN-339) sem criar solicitação.

**Testes a escrever**
- unit (componente): render de estados; bloqueio de janela.
- e2e: solicitar reembolso → estado `solicitado` → transição reflete no app.

**Definition of Done**
- [ ] Solicitação por inscrito (ADR-011) + leitura do `estado` em tempo real; bloqueio de janela (RN-339)
- [ ] Tokens do DS; §2.16; voz Leela não punitiva; estados vazio/erro; a11y
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Aprovação/recusa pelo organizador (Painel E09-S904); execução do estorno; troca de titularidade (S1316).

---

### LEELA-S1316 · Transferir titularidade / trocar ingresso no app · (de-para novo)

**Como** Atleta titular de uma inscrição num pedido em grupo, **quero** transferir minha titularidade a outra pessoa ou trocar meu ingresso, **para** evitar reembolso + recompra quando não posso mais correr ou escolhi o kit errado.

- **MoSCoW:** Should · **Estimativa:** L · **Superfície:** Mobile · **RNs:** RN-343, RN-344 (herdadas de E04/S305), RN-345 (herdada de E09/S904), RN-203 (chip na entrega) · **ADR:** ADR-011 (por inscrito)

> Tela greenfield (fluxo de transferência no app). Titularidade e troca de ingresso operam **por inscrito** dentro do pedido (ADR-011). Upgrade dispara `createCharge` da diferença; a máquina de estado é registrada por Function.

**Critérios de aceite (Given/When/Then):**
- **Dado** o evento com `permiteTransferencia` habilitada, **quando** inicio a transferência de titularidade, **então** a operação atua **por inscrito** e cria `eventos/{id}/transferencias/{transferenciaId}` com `tipo=titularidade`, dentro da janela default de 72h antes do evento (RN-343).
- **Dado** uma transferência de titularidade, **quando** o novo titular preenche os dados, **então** coleto CPF, dados da prova, tamanho e (se exigido) saúde; se o kit ainda não foi entregue, o tamanho é recoletado do novo titular e o chip só é vinculado na entrega (RN-203/RN-345); se o kit já foi entregue, a transferência é bloqueada.
- **Dado** uma troca de ingresso (mesmo titular), **quando** faço upgrade (kit/modalidade mais caro), **então** cobro a diferença pelo lote vigente disparando `createCharge`; no downgrade não há reembolso da diferença por padrão, salvo política do organizador (RN-344).
- **Dado** a troca de ingresso, **quando** tento fora da janela (até 48h antes do evento), **então** a operação é bloqueada com mensagem clara.
- **Dado** a transferência aberta, **quando** ela é registrada, **então** a escrita de estado é feita por Function e o histórico de titularidade fica em `inscritos.titularHistorico[]` (append-only).

**Tasks:** LEELA-S1316-T1, LEELA-S1316-T2, LEELA-S1316-T3

#### LEELA-S1316-T1 · Callable de transferência (`transferencias/{id}` tipo titularidade|ingresso) por inscrito

- **Tipo:** api/function · **Depende de:** S1306-T1 (inscritos/pedido), E04-S305 (flags/janelas), E09-S904 (registro/estado) · **Bloqueia:** S1316-T2, S1316-T3 · **Estimativa:** M

**Objetivo**
Expor a callable que cria `eventos/{id}/transferencias/{transferenciaId}` (`tipo` titularidade|ingresso) **por inscrito**, validando a flag `permiteTransferencia` e as janelas (RN-343 titularidade 72h; RN-344 troca 48h), sem escrita de estado financeiro pelo cliente.

**Contexto & referências**
- Modelo: `eventos/{id}/transferencias/{transferenciaId}` (E09-S904): `tipo`, `inscritoId`, `titularAnteriorRef`, `novoTitularDados`, `diffCobrada?`, `estado`, `criadoEm`
- Política: `eventos/{id}/politicaVendas.transferencia{ habilitada, janelaHoras:72, taxa }`, `.trocaIngresso{ janelaHoras:48 }` (E04-S305)
- ADR-011: por inscrito dentro do pedido

**Arquivos (criar/editar)**
- `functions/src/transferencias/abrirTransferencia.ts` — valida flag/janela, cria `transferencias/{id}`
- `firestore.rules` — titular abre a própria transferência; estado/`diffCobrada` só por Function

**Passos de implementação**
1. Callable `abrirTransferencia(eventoId, inscritoId, tipo, dados?)`: valida `permiteTransferencia` (RN-343) e janela (72h titularidade / 48h troca — RN-344).
2. Cria `transferencias/{id}` com `estado` inicial; bloqueia se kit já entregue (titularidade) ou fora de janela.
3. Rules: só o titular do inscrito abre; estado e valor só por Function.

**Modelo de dados / contratos**
- ➕ `eventos/{id}/transferencias/{transferenciaId}` (por inscrito — ADR-011); `inscritos.titularHistorico[]` (append-only, escrito por Function).

**Regras de negócio a respeitar**
- RN-343 (flag + janela 72h + taxa), RN-344 (upgrade/downgrade + janela 48h); ADR-011.

**Critérios de aceite (testáveis)**
- **Dado** `permiteTransferencia=false`, **quando** tento, **então** é negado (RN-343).
- **Dado** titularidade a <72h ou troca a <48h, **quando** tento, **então** é bloqueada (RN-343/344).
- **Dado** kit já entregue, **quando** tento titularidade, **então** é bloqueada.

**Testes a escrever**
- integração (emulator): flag/janelas; bloqueio por kit entregue; rules por titular.

**Definition of Done**
- [ ] Callable cria `transferencias/{id}` por inscrito (ADR-011); flags/janelas validadas (RN-343/344)
- [ ] `titularHistorico[]` append-only por Function; estado/valor só por Function
- [ ] Rules por titular; Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Coleta do novo titular e cobrança da diferença (S1316-T2); UI (S1316-T3).

#### LEELA-S1316-T2 · Coleta do novo titular + regra de chip/kit + cobrança da diferença (upgrade)

- **Tipo:** api/function · **Depende de:** S1316-T1, S209 (tamanho por inscrito), PaymentProvider (ADR-006) · **Bloqueia:** S1316-T3 · **Estimativa:** M

**Objetivo**
Na transferência de titularidade, coletar/persistir os dados do novo titular (CPF, dados da prova, tamanho e, se exigido, saúde), aplicar a regra de chip/kit (RN-345/RN-203) e, na troca de ingresso com upgrade, disparar `createCharge` da diferença pelo lote vigente (RN-344).

**Contexto & referências**
- Tamanho por inscrito: `inscritos.tamanhos` (RN-223 / S209); saúde em subcoleção `saude` (E04-S306) quando exigido
- Chip: só vinculado na entrega (RN-203); RN-345 (recoleta tamanho do novo titular, sem impacto retroativo)
- `PaymentProvider.createCharge` (ADR-006) para a diferença

**Arquivos (criar/editar)**
- `functions/src/transferencias/aplicarTitularidade.ts` — grava `novoTitularDados`, recoleta tamanho (RN-345), atualiza `titularHistorico[]`
- `functions/src/transferencias/cobrarDiferenca.ts` — upgrade: `createCharge` da diferença pelo lote vigente (RN-344)
- `packages/core/src/eventos/transferencia.ts` — cálculo da diferença (lote vigente — RN-200/344)

**Passos de implementação**
1. Titularidade: persistir `novoTitularDados` (CPF, prova, tamanho, saúde se exigido); recoletar tamanho do novo titular; chip só na entrega (RN-203/345); bloquear se kit já entregue.
2. Troca de ingresso (upgrade): calcular diferença pelo lote vigente e disparar `createCharge`; downgrade sem reembolso por padrão (RN-344).
3. Registrar transição de estado e `diffCobrada?` só por Function.

**Modelo de dados / contratos**
- Escrita por Function: `inscritos` (novo titular, `tamanhos`, `titularHistorico[]`), `transferencias/{id}.diffCobrada`.

**Regras de negócio a respeitar**
- RN-345 (chip/kit), RN-203 (chip na entrega), RN-344 (diferença no upgrade), RN-200 (lote vigente).

**Critérios de aceite (testáveis)**
- **Dado** titularidade com kit não entregue, **quando** o novo titular preenche, **então** o tamanho é recoletado e o chip não é vinculado antes da entrega (RN-345/203).
- **Dado** upgrade de kit, **quando** confirmo, **então** `createCharge` cobra a diferença pelo lote vigente (RN-344).

**Testes a escrever**
- unit (core): cálculo da diferença pelo lote vigente.
- integração (emulator): recoleta de tamanho; cobrança da diferença; `titularHistorico[]` append-only.

**Definition of Done**
- [ ] Coleta/persistência do novo titular; regra chip/kit (RN-345/203); upgrade cobra diferença (RN-344)
- [ ] Estado e `diffCobrada` só por Function; cobertura da camada de pagamento
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
UI (S1316-T3); política/flags de transferência (E04-S305).

#### LEELA-S1316-T3 · Tela de transferência/troca no app (bloqueios + leitura do `estado`)

- **Tipo:** screen · **Depende de:** S1316-T1, S1316-T2, S1306-T2 · **Estimativa:** M

**Objetivo**
Implementar o fluxo no app: escolher titularidade ou troca de ingresso a partir de uma inscrição, coletar os dados do novo titular (titularidade) ou o novo kit/modalidade (troca), exibir bloqueios (kit entregue, fora de janela) e ler o `estado` da transferência.

**Contexto & referências**
- DS: Stepper/Form, Input (CPF/dados/tamanho), KitSelector (reuso S1305), ConfirmModal, Badge (estado), Toast
- Copy: voz Leela; microcopy em passado simples

**Arquivos (criar/editar)**
- `apps/mobile/app/(tabs)/perfil/inscricoes/[id]/transferir.tsx`
- `apps/mobile/src/features/transferencia/FormNovoTitular.tsx`
- `apps/mobile/src/features/transferencia/TrocaIngresso.tsx`

**Passos de implementação**
1. A partir de "Minhas inscrições", ação "Transferir titularidade" ou "Trocar ingresso" por inscrito.
2. Titularidade: `FormNovoTitular` (CPF, prova, tamanho, saúde se exigido) → `abrirTransferencia`/`aplicarTitularidade`; bloqueio se kit entregue.
3. Troca: `KitSelector`; upgrade mostra a diferença e dispara pagamento (`createCharge`); fora de janela bloqueia (RN-344).
4. Listener no `estado` da transferência; mensagens de bloqueio claras.

**Modelo de dados / contratos**
- Escrita via callables (S1316-T1/T2); leitura de `transferencias/{id}.estado`.

**Regras de negócio a respeitar**
- RN-343 (janela/flag), RN-344 (upgrade/janela), RN-345 (chip/kit); ADR-011; §2.16.

**Critérios de aceite (testáveis)**
- **Dado** `permiteTransferencia` e >72h, **quando** transfiro titularidade, **então** coleto os dados do novo titular e vejo o `estado`.
- **Dado** upgrade de kit, **quando** confirmo, **então** pago a diferença e o ingresso reflete o novo kit.
- **Dado** kit já entregue, **quando** tento titularidade, **então** vejo o bloqueio claro.

**Testes a escrever**
- unit (componente): form do novo titular; bloqueios de janela/kit.
- e2e: transferir titularidade (kit não entregue) → estado; upgrade cobra diferença.

**Definition of Done**
- [ ] Titularidade + troca por inscrito (ADR-011); bloqueios (kit entregue, fora de janela); leitura do `estado`
- [ ] Upgrade cobra diferença (RN-344); tokens do DS; §2.16; voz Leela; a11y
- [ ] Estados vazio/erro/carregando; Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Config de política/flags (E04-S305); execução de estado por Function (S1316-T1/T2); reembolso (S1315).

---

## Ordem sugerida

`S1300 (setup+EAS) → S1301 (auth) → S1302 (Tab Bar) → S1307-T1 (registros+pontos, base da jornada) → S1304/S1305/S1306 (descoberta→evento→checkout, valor transacional H1) → S1307-T2/S1308/S1309 (Arena, desafios, medalhas — heroica H2) → S1310/S1311 (clube+feed) → S1312 (push/inbox) → S1303 (Início, consome os agregados) → S1313 (Perfil)`.

Fluxos críticos para e2e (Detox/Maestro), alinhados a `estrategia-testes.md`: (1) login social → Início; (2) inscrição → pagamento (sandbox) → confirmação; (3) registrar ação nos 3 pilares → bônus RN-115 → progresso do desafio; (4) entrar no clube por código → boas-vindas → feed; (5) push de comunicado → deep link → leitura.

## Lacunas registradas

- Não há HTMLs de protótipo do app do atleta; a UI deriva do E01 (Tab Bar 5 itens, Card Evento/Desafio, Banner Hero, variante RN) e dos JTBD/RNs. Ao produzir mocks de tela dedicados, anexá-los como referência nas tasks de `screen`.
- Domínio Leela definido: nome do domínio público (`be-hero.com.br/c/...` nos mocks) deve ser substituído pelo domínio Leela quando fechado.
- Import automático de treino (Strava/Garmin) e ranking competitivo ficam para H2+.

---

*Fim do épico LEELA-E13.*

## Decisão de plataforma (Vitor 2026-07-18 · adendo 4)

**O app v1 (E13-slim) é um PWA.** Ratificado pelo Vitor: *"o app v1 pode ser um PWA, não tem problema."*

- **Gate de lojas destravado:** o enrollment das lojas (App Store/Play) **deixa de ser pré-requisito do E13-slim** — PWA não passa por loja. Passa a ser pré-requisito só de um eventual **E13 nativo v2** (H2 tardio); vira ação externa de **prioridade baixa**.
- **Ordem no roadmap:** o E13 segue **DEPOIS do web completo** (reorder de 2026-07-18, ver `MODELO-ROADMAP.md §3`). A decisão de PWA muda a plataforma, não a posição na fila.
- **Implicações técnicas mínimas (sem especificar stories agora — spec do E13 detalha depois):** a stack web existente (Next/React + DS temável) serve de base; **installable + service worker**; **push em iOS** suportado via web push moderno, com **limitações vs. nativo** (ressalva honesta); **offline** = escopo a decidir na spec futura do E13. A antiga fatia Expo/EAS (S1300-T2 enrollment) é reavaliada quando/se o nativo v2 entrar.
- Registro em `DECISOES-ABERTAS` (Ratificadas, 2026-07-18) junto da reordenação H3→antes→H2.

## RE-SPEC como PWA (ESPEC-SWEEP · 2026-07-19) — reavaliação das 9 stories do lote 5

**Onda 5.** A spec do E13-slim (lote 5 da trilha `next-trail-onda3`, 2026-07-17) foi escrita para **Expo nativo**. A decisão do Vitor de 2026-07-18 — *"o app v1 pode ser um PWA, não tem problema"* — invalida a base arquitetural dela: não há `apps/mobile`, EAS, credenciais de loja, Detox nem FCM nativo no caminho de um PWA.

**A arquitetura é decisão do Vitor, não desta lane.** A proposta está em `02-rodadas/2026-07-19-espec-sweep/03-adr-proposta-pwa.md` (recomendação: a landing vira instalável, área do atleta em `/app/*`, service worker com HTML sempre network-first). **Nada abaixo é despachável antes dessa ratificação** — o território de arquivos depende dela.

### Veredito story a story

| Story original (Expo) | Veredito | O que acontece |
|---|---|---|
| `S1300` setup Expo + EAS | **SAI e é substituída** | Não há bootstrap de Expo nem pipeline de loja. Vira `S1300-PWA`: manifest, service worker, jogo de ícones, splash, prompt de instalação. **O bloqueio de enrollment das lojas morre** — era o pré-requisito que segurava o lote inteiro. Sentry: reusa o do web, já configurado |
| `S1302` tab navigator + safe area + deep linking | **MUDA, encolhe** | Bottom-nav web com rotas do Next em vez de navigator nativo. Deep linking **sai de graça** — no web, link é URL. Safe area vira `env(safe-area-inset-*)` no CSS. Estimativa cai de M para S |
| `S1301` provisionamento + login Apple/Google | **MUDA pela metade** | `onAtletaCreate` + Rules **ficam intactas** — backend não sabe se o cliente é nativo ou web. O login **Apple deixa de ser obrigatório** (era exigência da App Store). E há reuso forte a respeitar: o produto **já cria conta na 1ª compra** (RN-155) e já resolve posse de identidade (RN-174). O app não inventa onboarding novo — ele entra na conta que a compra criou |
| `S1304` feed de eventos + busca | **MUDA para delta** | A descoberta pública já existe (página de evento S1201, portal do organizador S1208, perfil `@handle` S1700). O que falta é a visão **do atleta logado** — "eventos perto de mim e os que já são meus". Deixa de ser tela nova e vira recorte sobre o que existe |
| `S1305` detalhe do evento + seleção modalidade/kit | **SAI como story** | A página pública de evento já entrega detalhe, modalidade e kit com descrição, itens e imagem (R9-C + R12). No PWA é a mesma página. Resta ajuste de navegação dentro do escopo instalado, absorvido por `S1302-PWA` |
| `S1306` checkout + meus ingressos/QR | **PARTE-SE EM DUAS** | O **checkout já existe** na landing (S1203 + S1209) e o kernel de pedido também — essa metade some. Sobra o que nunca foi construído e é o coração do app: **"Meus ingressos" com QR**, na área logada do atleta |
| `S1310` entrar no clube por código/link + página do clube | **FICA, muda de território** | Mesma regra (RN-101/140), superfície web. O código de convite e o link já funcionam |
| `S1311` feed do clube (leitura) | **FICA** | Modelo de feed, Function de agregado e Rules são **idênticos** — backend não muda com a plataforma. Só a tela vira web |
| `S1312` push FCM + inbox | **MUDA e é o risco da decisão** | Web Push funciona no Android e no desktop; no iOS **só depois do usuário instalar** o app na tela de início, e sem as garantias do FCM nativo. O JTBD servido é central (*"assessoria manda treino, recebo no app, elimino o WhatsApp"*). Proposta: **inbox in-app é a fonte de verdade** e o **e-mail pelo Brevo** é o canal que não depende de instalação; push vira reforço. **Isso é decisão do Vitor** |

### O recorte resultante

De 9 stories e 15 tasks (Expo), o recorte PWA fica em **6 stories**:

| # | Story | O que é | Território (sob a opção A) | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 1 | `S1300-PWA` | manifest, service worker (HTML network-first), ícones, splash, prompt de instalação | `apps/landing` | ADR ratificada | **opus** xhigh | ⚔ |
| 1b | `S1300-PWA-T2` | jogo de ícones e splash nas medidas exigidas pelo manifest, a partir da arte-fonte | assets da `apps/landing` | S1300-PWA | **haiku** | — |
| 2 | `S1302-PWA` | shell da área do atleta: bottom-nav, safe area, rotas | `apps/landing/app` | S1300-PWA | **opus** xhigh | — |
| 3 | `S1301-PWA` | entrada do atleta reusando a conta criada na compra (RN-155/174); `onAtletaCreate` + Rules como já especificado | `functions/` · `apps/landing` | S1302-PWA | **opus** xhigh | ⚔ |
| 4 | `S1306-PWA` | **meus ingressos + QR**, com o ingresso disponível offline (é o único cache de conteúdo autorizado) | `apps/landing/app` | S1301-PWA · RN-221/222 | **opus** xhigh | ⚔ |
| 5 | `S1310-PWA` + `S1311-PWA` | entrar no clube por código/link, página do clube e feed de leitura | `apps/landing/app` · `functions/` (feed) | S1301-PWA · E05 ✅ | **opus** xhigh | — |
| 6 | `S1312-PWA` | inbox de comunicados como fonte de verdade + registro de push web + permissão | `apps/landing/app` · `functions/` | S1301-PWA · E05 ✅ | **opus** xhigh | ⚔ |
| — | `S1300-GATE-PWA` | gate visual e ponta a ponta em 390×844, **reusando o Playwright que já existe** em vez de Detox/Maestro | `apps/landing` | todas | **opus** xhigh (veredito) | — |

**A única task haiku do recorte** é a geração do jogo de ícones: é mecânica e tem gate determinístico — ou os arquivos existem nas dimensões exatas que o manifest declara, ou falha. Todo o resto toca sessão, dinheiro, Rules ou cache que pode servir conteúdo errado.

### O que o PWA ganha e o Expo não tinha

**O ingresso funciona sem rede.** Na largada de uma prova a rede cai — é a regra, não a exceção. Um service worker que cacheia o QR do atleta resolve um problema real que a versão nativa também teria que resolver, e resolve com menos máquina. É o único cache de conteúdo autorizado pela proposta de ADR.

### Critério de pronto do recorte

- [ ] o gate de SEO da landing continua verde **depois** do service worker subir — se o Google vê conteúdo diferente do usuário, o service worker sai
- [ ] nenhuma página de vendas, evento ou checkout é servida do cache (prova: alterar preço e recarregar mostra o novo)
- [ ] o app instalado abre e fecha a compra sem sair do escopo (o atleta nunca é jogado para o navegador no meio do pagamento)
- [ ] o QR abre sem rede depois de visto uma vez
- [ ] o inbox mostra o comunicado mesmo quando o push não chegou
- [ ] a área do atleta só lê o que é dele (Rules, no padrão RN-318)

### O que volta para o Vitor

Três perguntas, todas no ADR-proposta: a opção de arquitetura, se push sem garantia no iOS é aceitável na v1, e se o app instalável fica no mesmo domínio da landing. A segunda é a que pode reverter a decisão de 18/07.

---

## Delta fronteira com a página pública do ingresso (SPEC-INGPAGE · 2026-07-29)

O item 55 do painel criou uma **página pública do ingresso** na landing, aberta por link
tokenizado por inscrito (E12-S1214 · RN-418..424). Ela não é a área logada do atleta, e a
fronteira está escrita aqui para não ser redescoberta quando o E13 for construído.

**Por que ela não mora no E13.** O e-mail da compra vai ao **responsável do pedido**
(ADR-011), que muitas vezes comprou para a família e não é inscrito de nada. Exigir conta
para ver o ingresso trancaria justamente quem pagou. A página pública é o caminho **sem
login**, e continua existindo depois que o app existir.

**O que o E13 herda quando for construído.** O `S1306-PWA` ("meus ingressos + QR", o coração
do recorte PWA) e o `S1314` consomem a **mesma projeção** que a `S1214-T1` cria, em vez de
reimplementar a leitura do ingresso. O que muda é só a porta:

| | Página pública (E12-S1214) | Meus ingressos (E13-S1306-PWA / S1314) |
|---|---|---|
| Quem entra | quem tem o link | quem está logado |
| O que autoriza | token `LLIP1` verificado no servidor | sessão do atleta + Rules (RN-318) |
| O que vê | UM ingresso | TODOS os ingressos daquela conta |
| Estado de check-in | leitura (RN-421) | leitura (RN-221/222) |
| Escrita | nenhuma | nenhuma |

**O que NÃO muda no E13.** O espelho `atletas/{uid}/inscricoes` do `S1314-T1`, as Rules por
dono e a proibição de o cliente escrever `checkinEm`/`qrToken` seguem exatamente como estão.
O cache offline do ingresso, que o recorte PWA identificou como o único cache de conteúdo
autorizado, continua sendo assunto do E13: a página pública é dinâmica e `no-store` por
regra de privacidade (RN-422), então ela **não** resolve o QR sem rede — quem resolve é o
service worker do app.

**Uma ponta a mais para o ADR do PWA.** A terceira pergunta que volta para o Vitor ("se o
app instalável fica no mesmo domínio da landing") agora tem um vizinho: a rota `/ingresso/*`
já ocupa espaço nesse domínio e é `noindex` por regra. Quem responder o ADR precisa olhar as
duas rotas juntas.
