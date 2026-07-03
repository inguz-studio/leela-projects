# LEELA-E07 · Estados de Sistema

- **Superfície:** Todas (Painel · Landing · Mobile)
- **Horizonte:** H1 (Onda 3)
- **MoSCoW:** Should
- **Estimativa:** L
- **Status:** 📋 Backlog (especificado — BH-500 a BH-504)
- **Depende de:** LEELA-E01 (DS: `SystemStateScreen`, EmptyState, Skeleton, shell), LEELA-E00 (rotas, Sentry, Firebase, Auth/custom claims)
- **De-para:** BH-E07 (EP-00.5 · Estados de Sistema · BH-500 a BH-504)

## Objetivo

Quando algo sai do trilho — página inexistente, acesso negado, erro do servidor, queda de conexão, janela de manutenção — o usuário precisa entender o que aconteceu e qual é o próximo passo, sem beco sem saída e sem jargão técnico. Este épico entrega as cinco telas de estado do sistema como um conjunto coeso, servido pelas três superfícies (Painel Next.js, Landing Next.js, App Expo) a partir de um único componente do Design System. Cada estado combina ilustração ou ícone Lucide, mensagem clara na voz da marca e ação de recuperação (voltar, tentar novamente, contato), mantendo o shell quando o contexto permite.

O valor é robustez percebida: o produto continua confiável mesmo quando falha. Uma queda de rede vira "recarrego assim que você voltar" em vez de tela branca; um erro 500 vira "já avisamos a equipe" com um id rastreável em vez de stack trace. É o acabamento que separa protótipo de produto.

## Personas & JTBD

Todas as personas, em qualquer superfície. O estado do sistema é agnóstico de papel: serve o Organizador no Painel, o Atleta anônimo na Landing e o Atleta logado no App.

- **Qualquer usuário do Painel** (Organizador, Coordenador). JTBD: "Quando um link falha ou perco acesso, quero saber por quê e voltar a operar sem recarregar tudo na mão."
- **Atleta anônimo na Landing.** JTBD: "Se a página do evento não abre, quero entender e achar o caminho certo, não uma tela quebrada."
- **Atleta no App.** JTBD: "Sem sinal no meio do treino, quero saber que é a conexão e que o app volta sozinho quando eu voltar."

## Critérios de sucesso do épico

- Um único componente `SystemStateScreen` no `packages/design-system` (React + variante React Native) serve os cinco estados nas três superfícies; nenhuma superfície redesenha estado localmente.
- Cada estado tem: ilustração/ícone Lucide, título + mensagem na voz da marca (copy do glossário HANDOFF-07), e ao menos uma ação de recuperação navegável.
- O shell padrão (sidebar + breadcrumb + header §2.1/§2.14 do E01) é mantido quando o contexto autenticado permite (404 e 403 dentro do Painel, erro de segmento); estados de raiz/boot (global error, manutenção) ocupam a tela cheia sem shell.
- Offline e manutenção recuperam sozinhos: ao restaurar conexão / sair da janela de manutenção, a tela recarrega o conteúdo pretendido sem ação manual obrigatória.
- Erros 500 geram evento no Sentry com id exibido ao usuário; nenhum dado sensível vaza para a tela.
- Acessibilidade AA em todos: foco inicial na ação primária, severidade nunca só por cor (ícone + texto), contraste conforme.

## Regras de negócio aplicáveis

- **RF-50…54** — estados de sistema (404, 403, 500, offline, manutenção), do PRD via ROADMAP §6.
- **RN-320** — modelo de 4 papéis de permissão do evento alimenta a decisão de acesso negado (403); a tela só lê o veredito de autorização, nunca decide no cliente.
- **§2.16** — flat, sem borda decorativa (exceção permitida: card crítico com `border-left` Vulcão no estado de erro 500).
- **§2.12** — interativo por padrão: toda ação de recuperação é funcional; estados de carregando (Skeleton) e vazio reusam os componentes do E01.
- **§2.1/§2.14** — header/shell e sub-nav do E01; mantidos quando o estado ocorre dentro de uma área com layout (regra de "mantém shell quando aplicável").
- **Copy** — voz da marca via HANDOFF-07 (tom neutro-positivo, do coordenador, não institucional; sem emoji; frases curtas). Manifesto/campanha aprovados: "Vitalidade é uma escolha." · "Volte amanhã."
- **Segurança** — decisão de manutenção e de autorização vêm do servidor (flag remota / custom claims); o cliente nunca é a fonte de verdade.

## Modelo de dados tocado

Épico majoritariamente de apresentação. Nenhuma coleção de domínio é escrita. Introduz um singleton de configuração de sistema:

- **`config/system`** (novo, singleton) — `{ maintenanceMode: boolean, maintenanceMessage?: string, maintenanceUntil?: Timestamp, statusUrl?: string }`. Leitura pública (ou espelhado em Firebase Remote Config para o boot do App); escrita **apenas** por admin/Function (Admin SDK). Consumido pelo middleware do web e pelo boot do mobile para acionar o estado de manutenção. Ver `modelo-de-dados-firestore.md` (a acrescentar seção `config`).
- **Auth / custom claims** — o estado 403 lê o veredito de autorização (papel do usuário no recurso, RN-320); nenhuma escrita.
- Offline, 404 e 500 não tocam dados.

## Fora de escopo (Won't nesta fase)

- Página de status pública/incidentes (statuspage próprio); o estado de manutenção apenas aponta para `statusUrl` externo quando existir.
- Retry automático com backoff em chamadas de dados de domínio (mora nas camadas de fetch de cada épico); aqui, "tentar novamente" é uma ação explícita + recuperação ao voltar a rede.
- Fila offline de escritas (outbox / sync de mutações do App) — capacidade do E13, não deste épico.
- Ilustrações finais de marca (assets definitivos): E07 entrega o slot de ilustração e um fallback de ícone Lucide; a arte final entra pelo DS quando disponível.
- i18n multi-idioma das mensagens (só pt-BR nesta fase).
- Telas de estado específicas de fluxo (ex.: "pagamento recusado", "evento esgotado") — pertencem aos seus épicos (E04/E12), não a este.

---

## User stories

### LEELA-S500 · Página não encontrada (404) · (de-para BH-500)

**Como** usuário de qualquer superfície, **quero** uma tela clara quando o endereço não existe, **para** entender que o link quebrou e achar o caminho de volta sem tela branca.

- **MoSCoW:** Must (dentro do épico) · **Estimativa:** M · **Superfície:** Todas
- **Tela(s) de referência:** `WEB-APPV2 (1)/404.html`
- **RNs:** §2.1, §2.12, §2.16, copy HANDOFF-07

**Critérios de aceite (Given/When/Then):**
- **Dado** uma URL inexistente no Painel autenticado, **quando** a rota resolve, **então** vejo o `SystemStateScreen` de 404 **dentro do shell** (sidebar/header preservados), com título "Essa página saiu para correr", mensagem "O link que você seguiu não existe ou mudou de lugar" e ações "Voltar" + "Ir para a Visão Geral".
- **Dado** uma URL inexistente na Landing pública, **quando** resolve, **então** vejo o mesmo componente em layout mínimo (sem shell de painel), com ação "Ir para a página inicial".
- **Dado** uma rota inexistente no App, **quando** navego, **então** o fallback de rota mostra o estado 404 com ação "Voltar" que retorna à tela anterior ou à home da aba.
- **Dado** o estado 404, **quando** ele renderiza, **então** o foco inicial vai para a ação primária e a ilustração/ícone tem `aria-hidden`.

**Tasks:** LEELA-S500-T1, LEELA-S500-T2, LEELA-S500-T3

---

#### LEELA-S500-T1 · Componente `SystemStateScreen` no Design System (web + RN)

- **Tipo:** ui-component · **Depende de:** E01-S001-2 (Button, ícones Lucide), E01-S001-3-T4 (Skeleton) · **Bloqueia:** S500-T2, S500-T3, S501-*, S502-*, S503-*, S504-* · **Estimativa:** M

**Objetivo**
Criar o componente único de estado de sistema que renderiza ilustração/ícone, título, mensagem e de 1 a 3 ações de recuperação, reutilizado por todos os cinco estados nas três superfícies. É a fundação do épico.

**Contexto & referências**
- Telas protótipo: `WEB-APPV2 (1)/404.html`, `403.html`, `500.html`, `Offline.html`, `Manutencao.html` (layout comum: bloco central com ícone, título, texto, botões).
- RNs: §2.16 (flat; exceção card crítico Vulcão para variante de erro), §2.12, copy HANDOFF-07.
- Componentes DS: Button (Primary/Secondary/Ghost), ícones Lucide 24×24 stroke 1.75, tipografia H2/H3 + texto secundário, tokens semânticos. Reusa EmptyState/Skeleton do E01 como pares deste componente (mesma família visual).

**Arquivos (criar/editar)**
- `packages/design-system/src/components/SystemStateScreen/SystemStateScreen.tsx` — variante web (React).
- `packages/design-system/src/components/SystemStateScreen/SystemStateScreen.native.tsx` — variante React Native.
- `packages/design-system/src/components/SystemStateScreen/types.ts` — contrato de props compartilhado.
- `packages/design-system/src/components/SystemStateScreen/index.ts` — barrel + export.
- Story/catálogo: `packages/design-system/src/components/SystemStateScreen/SystemStateScreen.stories.tsx` (nos 2 temas).

**Passos de implementação**
1. Definir o contrato de props (ver "Modelo de dados / contratos"): `variant`, `icon`, `title`, `message`, `actions[]`, `detail?` (ex.: id de erro), `illustration?`, `layout` (`shell` | `fullscreen`).
2. Layout central responsivo: slot de ilustração (usa `illustration` se fornecida; senão ícone Lucide por `variant`), título (H2/H3, sentence case), mensagem (texto secundário), fileira de ações (máx 1 Primary, §DS).
3. Variante `danger` (500) pode usar `border-left` Vulcão (exceção permitida §2.16); demais variantes flat.
4. Acessibilidade: `role="alert"` quando severidade for erro; foco programático na ação primária ao montar; ícone/ilustração `aria-hidden`; severidade por ícone + texto, nunca só cor.
5. Espelhar tudo na variante `.native.tsx` com os mesmos props (sem `<a>`; usa handlers de navegação passados por prop).
6. Stories nos temas `brasa` e `leela` cobrindo as 5 variantes.

**Modelo de dados / contratos**
- `type SystemStateAction = { label: string; onPress: () => void; variant: 'primary'|'secondary'|'ghost'; href?: string }`
- `type SystemStateVariant = 'notFound'|'forbidden'|'error'|'offline'|'maintenance'`
- `type SystemStateScreenProps = { variant: SystemStateVariant; title: string; message: string; actions: SystemStateAction[]; icon?: LucideIcon; illustration?: ReactNode; detail?: string; layout?: 'shell'|'fullscreen' }`
- Nenhum acesso a dados; componente puro de apresentação.

**Regras de negócio a respeitar**
- §2.16 flat (exceção `danger`); tokens semânticos do DS, zero hardcoded.
- Máx 1 ação Primary por tela; copy vem de fora (prop), nunca embutida no componente.

**Critérios de aceite (testáveis)**
- **Dado** `variant="notFound"` com 2 ações, **quando** renderizo, **então** vejo título, mensagem, ícone Lucide e exatamente 1 botão Primary + 1 Secondary, com foco na ação primária.
- **Dado** `variant="error"` com `detail="abc123"`, **quando** renderizo, **então** o id aparece como texto auxiliar e o card usa a exceção `border-left` Vulcão.
- **Dado** troca de tema brasa↔leela, **quando** re-renderiza, **então** cores/tipografia mudam sem alterar markup.

**Testes a escrever**
- unit (componente): render por variante; foco na ação primária; `role="alert"` só em erro; máx 1 Primary; ícone `aria-hidden`.

**Definition of Done**
- [ ] Critérios de aceite passam
- [ ] Testes escritos e verdes
- [ ] Usa tokens do DS (zero hardcoded); flat §2.16 (exceção danger justificada)
- [ ] Cobre as 5 variantes + estados; documentado no catálogo (2 temas)
- [ ] Acessibilidade AA (foco, `role`, contraste, ícone `aria-hidden`)
- [ ] Variante RN paritária com a web
- [ ] Lint + type-check limpos
- [ ] (ver `definition-of-done.md` — DoD Componente)

**Fora de escopo**
Wiring nas rotas/superfícies (tasks seguintes); ilustrações de marca finais (slot pronto, arte entra depois).

---

#### LEELA-S500-T2 · 404 no web (Painel com shell + Landing mínima)

- **Tipo:** screen · **Depende de:** S500-T1, E01-S001-3-T1 (Shell) · **Estimativa:** S

**Objetivo**
Ligar o `SystemStateScreen` de 404 às rotas Next.js do Painel e da Landing usando os arquivos especiais do App Router, mantendo o shell no Painel e um layout mínimo na Landing.

**Contexto & referências**
- Tela protótipo: `WEB-APPV2 (1)/404.html`.
- Next.js App Router: `not-found.tsx` por segmento + helper `notFound()`.
- Copy HANDOFF-07 (voz da marca); DS: `SystemStateScreen` (`variant="notFound"`, ícone `MapPinOff`/`Compass`).

**Arquivos (criar/editar)**
- `apps/painel/app/not-found.tsx` — 404 do Painel dentro do layout autenticado (shell preservado).
- `apps/landing/app/not-found.tsx` — 404 da Landing em layout mínimo.
- `apps/painel/app/(overview)/_lib/routes.ts` (ou similar) — helper de destino "Ir para a Visão Geral" (reuso).

**Passos de implementação**
1. Painel: `not-found.tsx` no root do segmento autenticado, renderizando `SystemStateScreen` com `layout="shell"`, título/mensagem canônicos e ações "Voltar" (history back) + "Ir para a Visão Geral" (`/`).
2. Landing: `not-found.tsx` com `layout="fullscreen"` e ação única "Ir para a página inicial".
3. Garantir que `notFound()` chamado em rotas dinâmicas (ex.: evento/clube inexistente na Landing) cai neste componente.
4. Copy exata do glossário; foco na ação primária.

**Modelo de dados / contratos**
- Nenhum. Somente navegação.

**Regras de negócio a respeitar**
- Mantém shell no Painel (§2.1/§2.14); Landing sem shell. §2.16 flat.

**Critérios de aceite (testáveis)**
- **Dado** `/painel/rota-inexistente` autenticado, **quando** carrego, **então** vejo o 404 com sidebar/header visíveis e as duas ações.
- **Dado** um slug de evento inexistente na Landing, **quando** `notFound()` dispara, **então** vejo o 404 mínimo com "Ir para a página inicial".

**Testes a escrever**
- e2e (Playwright): rota inexistente no Painel mostra shell + 404; slug inválido na Landing mostra 404 mínimo.

**Definition of Done**
- [ ] Critérios de aceite passam
- [ ] Testes escritos e verdes
- [ ] Shell mantido no Painel; §2.16 flat; tokens do DS
- [ ] Copy do glossário; acessibilidade AA
- [ ] Lint + type-check limpos
- [ ] (ver `definition-of-done.md` — DoD Tela/rota)

**Fora de escopo**
404 do App (T3); estados de erro/offline (outras stories).

---

#### LEELA-S500-T3 · 404 no App (Expo — fallback de rota desconhecida)

- **Tipo:** screen · **Depende de:** S500-T1 · **Estimativa:** S

**Objetivo**
Prover o fallback de rota inexistente no App Expo (expo-router), reutilizando a variante RN do `SystemStateScreen`.

**Contexto & referências**
- Tela protótipo: `WEB-APPV2 (1)/404.html` (adaptada a mobile).
- expo-router: arquivo `+not-found.tsx`.
- DS: `SystemStateScreen` (`.native`).

**Arquivos (criar/editar)**
- `apps/mobile/app/+not-found.tsx` — rota de captura de caminho desconhecido.

**Passos de implementação**
1. Criar `+not-found.tsx` renderizando a variante RN com `variant="notFound"`.
2. Ação "Voltar": `router.back()` quando houver histórico; senão "Ir para o início" → home da aba.
3. Copy do glossário; foco/leitura por leitor de tela.

**Modelo de dados / contratos**
- Nenhum.

**Regras de negócio a respeitar**
- §2.16 flat; copy HANDOFF-07; tokens do DS (tema mobile).

**Critérios de aceite (testáveis)**
- **Dado** navegação para rota inexistente no App, **quando** resolve, **então** vejo o 404 RN com ação de retorno funcional.

**Testes a escrever**
- unit/integração (RN): render do `+not-found` e ação de voltar.

**Definition of Done**
- [ ] Critérios de aceite passam
- [ ] Testes escritos e verdes
- [ ] Tokens do DS (mobile); §2.16 flat; copy do glossário
- [ ] Acessibilidade (leitor de tela, foco)
- [ ] Lint + type-check limpos
- [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Demais estados no App (stories seguintes).

---

### LEELA-S501 · Sem permissão (403) · (de-para BH-501)

**Como** usuário autenticado sem direito de acesso, **quero** uma tela que explique a falta de permissão, **para** saber que não é um erro meu e como pedir acesso, em vez de uma página que quebra.

- **MoSCoW:** Should (dentro do épico) · **Estimativa:** M · **Superfície:** Todas
- **Tela(s) de referência:** `WEB-APPV2 (1)/403.html`
- **RNs:** RN-320 (papéis de permissão), §2.1, §2.12, §2.16, copy HANDOFF-07

**Critérios de aceite (Given/When/Then):**
- **Dado** um usuário autenticado sem papel para o recurso (RN-320), **quando** acesso a rota protegida no Painel, **então** vejo o 403 **dentro do shell**, título "Esse espaço ainda não é seu", mensagem "Você não tem permissão para ver esta área" e ações "Voltar" + "Falar com o organizador".
- **Dado** que a verificação de autorização vem de custom claims/servidor, **quando** o cliente renderiza, **então** ele apenas reflete o veredito — nunca decide acesso localmente.
- **Dado** a mesma situação no App, **quando** ocorre, **então** vejo o 403 RN com ação de contato/voltar.
- **Dado** um usuário não autenticado tentando área privada, **quando** ocorre, **então** o fluxo é de login (E00), não 403 (distinção clara entre "não logado" e "logado sem permissão").

**Tasks:** LEELA-S501-T1, LEELA-S501-T2

---

#### LEELA-S501-T1 · 403 no web (guard de autorização + página, com shell)

- **Tipo:** screen · **Depende de:** S500-T1, E00 (Auth/custom claims), E01-S001-3-T1 (Shell) · **Estimativa:** M

**Objetivo**
Renderizar o estado 403 no Painel/Landing quando a autorização por papel (RN-320) nega o recurso, mantendo o shell no contexto autenticado e reusando o `SystemStateScreen`.

**Contexto & referências**
- Tela protótipo: `WEB-APPV2 (1)/403.html`.
- Next.js: `forbidden()` + `forbidden.tsx` (authInterrupts) quando habilitado; fallback: guard em server component que renderiza `SystemStateScreen`.
- RN-320 (4 papéis); DS: `SystemStateScreen` (`variant="forbidden"`, ícone `Lock`/`ShieldOff`).

**Arquivos (criar/editar)**
- `apps/painel/app/forbidden.tsx` — página 403 (ou componente `Forbidden` reutilizável se authInterrupts não estiver ativo).
- `packages/core/src/auth/authorize.ts` — helper puro `canAccess(role, resource)` derivando o veredito de RN-320 a partir das claims.
- `packages/api-client/src/auth.ts` — leitura das claims do usuário (se não existir do E00).
- `apps/painel/app/(...)/layout.tsx` ou middleware de segmento — dispara `forbidden()` quando `canAccess` retorna falso.

**Passos de implementação**
1. `authorize.ts` (core, puro): mapear papel × recurso → boolean conforme RN-320 (4 papéis). Testável sem I/O.
2. No segmento protegido, ler claims (servidor) e, se negado, disparar `forbidden()` (ou renderizar `Forbidden`).
3. `forbidden.tsx`: `SystemStateScreen` `layout="shell"`, título/mensagem canônicos, ações "Voltar" + "Falar com o organizador" (contato: mailto/deep-link definido em copy).
4. Distinguir não autenticado (→ login, E00) de autenticado-sem-permissão (→ 403).

**Modelo de dados / contratos**
- Lê custom claims do usuário (papel). Nenhuma escrita.
- `canAccess(role: Role, resource: ResourceRef) -> boolean` em `packages/core`.

**Regras de negócio a respeitar**
- RN-320 — 4 papéis; decisão no servidor, cliente só reflete.
- §2.16 flat; mantém shell; copy do glossário.

**Critérios de aceite (testáveis)**
- **Dado** usuário com papel sem acesso ao recurso, **quando** acesso, **então** 403 dentro do shell com as duas ações.
- **Dado** usuário não autenticado, **quando** acesso área privada, **então** vou para login (não 403).
- **Dado** `canAccess` para cada um dos 4 papéis, **quando** avalio, **então** o veredito bate com RN-320.

**Testes a escrever**
- unit (core): `canAccess` por papel/recurso (RN-320).
- integração (Emulator): claims negam → `forbidden()`; não logado → login.
- e2e: acesso negado mostra 403 com shell.

**Definition of Done**
- [ ] Critérios de aceite passam
- [ ] Testes escritos e verdes
- [ ] Autorização no servidor; cliente só reflete (RN-320)
- [ ] Shell mantido; §2.16 flat; copy do glossário
- [ ] Acessibilidade AA; sem dado sensível na tela
- [ ] Lint + type-check limpos
- [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Fluxo completo de "solicitar acesso" com aprovação (só link/contato aqui); 403 no App (T2).

---

#### LEELA-S501-T2 · 403 no App (Expo)

- **Tipo:** screen · **Depende de:** S500-T1, S501-T1 (`canAccess`), E00 (Auth) · **Estimativa:** S

**Objetivo**
Exibir o estado 403 no App quando a autorização nega, reutilizando `canAccess` do core e a variante RN do componente.

**Contexto & referências**
- Tela protótipo: `WEB-APPV2 (1)/403.html` (adaptada).
- DS: `SystemStateScreen` (`.native`, `variant="forbidden"`); core `authorize.ts`.

**Arquivos (criar/editar)**
- `apps/mobile/src/screens/ForbiddenScreen.tsx` — tela 403 RN.
- `apps/mobile/src/navigation/guards.ts` — guard que redireciona a rota negada para `ForbiddenScreen`.

**Passos de implementação**
1. Guard de navegação usa `canAccess` (core) com as claims do usuário.
2. Rota negada → `ForbiddenScreen` com ações "Voltar" e "Falar com o organizador" (deep-link/contato).
3. Não autenticado segue para o fluxo de login, não 403.

**Modelo de dados / contratos**
- Lê claims; `canAccess` do core. Nenhuma escrita.

**Regras de negócio a respeitar**
- RN-320; decisão no servidor; §2.16 flat; copy do glossário.

**Critérios de aceite (testáveis)**
- **Dado** papel sem acesso, **quando** navego à rota protegida, **então** vejo `ForbiddenScreen` com ações.
- **Dado** não autenticado, **quando** tento, **então** vou ao login.

**Testes a escrever**
- unit/integração (RN): guard roteia negado → 403; usa `canAccess`.

**Definition of Done**
- [ ] Critérios de aceite passam
- [ ] Testes escritos e verdes
- [ ] Reusa `canAccess` do core (sem duplicar RN-320)
- [ ] Tokens do DS (mobile); §2.16 flat; copy do glossário
- [ ] Acessibilidade; sem dado sensível
- [ ] Lint + type-check limpos
- [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Solicitação de acesso com aprovação.

---

### LEELA-S502 · Erro interno (500) · (de-para BH-502)

**Como** usuário que topou com uma falha do servidor, **quero** uma tela que reconheça o erro e ofereça recuperação, **para** tentar de novo sabendo que a equipe foi avisada, sem ver stack trace.

- **MoSCoW:** Should (dentro do épico) · **Estimativa:** M · **Superfície:** Todas
- **Tela(s) de referência:** `WEB-APPV2 (1)/500.html`
- **RNs:** §2.12, §2.16 (exceção card crítico Vulcão), copy HANDOFF-07, Sentry (ROADMAP §2)

**Critérios de aceite (Given/When/Then):**
- **Dado** um erro não tratado dentro de um segmento do Painel, **quando** o `error.tsx` captura, **então** vejo o 500 **dentro do shell** com título "Tropeçamos aqui, não foi você", mensagem "Algo quebrou do nosso lado e a equipe já foi avisada", ação "Tentar novamente" (que chama `reset()`) + "Voltar", e um id de erro auxiliar.
- **Dado** um erro na raiz da aplicação, **quando** o `global-error.tsx` captura, **então** vejo o 500 em tela cheia (sem shell, substitui `html/body`) com "Tentar novamente".
- **Dado** qualquer erro capturado, **quando** a tela monta, **então** o evento é enviado ao Sentry e o `eventId` é exibido como id de erro; nenhum detalhe técnico sensível aparece.
- **Dado** o App, **quando** um erro derruba uma tela, **então** o ErrorBoundary mostra o 500 RN com "Tentar novamente" e registra no Sentry.

**Tasks:** LEELA-S502-T1, LEELA-S502-T2

---

#### LEELA-S502-T1 · 500 no web (`error.tsx` de segmento + `global-error.tsx` + Sentry)

- **Tipo:** screen · **Depende de:** S500-T1, E00 (Sentry), E01-S001-3-T1 (Shell) · **Estimativa:** M

**Objetivo**
Capturar erros de runtime no Painel e na Landing via App Router, exibindo o `SystemStateScreen` de erro (com shell no segmento, tela cheia na raiz), registrando no Sentry e mostrando o `eventId` ao usuário.

**Contexto & referências**
- Tela protótipo: `WEB-APPV2 (1)/500.html`.
- Next.js: `error.tsx` (client component, recebe `error` + `reset`) por segmento; `global-error.tsx` na raiz (substitui `html/body`, sem shell).
- Sentry: `captureException` → `eventId`. DS: `SystemStateScreen` (`variant="error"`, ícone `TriangleAlert`, exceção `border-left` Vulcão §2.16).

**Arquivos (criar/editar)**
- `apps/painel/app/(...)/error.tsx` — erro de segmento (mantém shell).
- `apps/painel/app/global-error.tsx` — erro de raiz (tela cheia).
- `apps/landing/app/error.tsx` e `apps/landing/app/global-error.tsx` — equivalentes na Landing.
- `packages/api-client/src/observability.ts` (ou reuso do E00) — wrapper de `captureException` retornando `eventId`.

**Passos de implementação**
1. `error.tsx`: client component; no `useEffect`, `captureException(error)` e guardar `eventId`; renderizar `SystemStateScreen` `variant="error"`, `layout="shell"`, ações "Tentar novamente" (`reset()`) + "Voltar", `detail={eventId}`.
2. `global-error.tsx`: idêntico porém `layout="fullscreen"` e reconstruindo `html/body`.
3. Sanitizar: nunca exibir `error.message`/stack ao usuário; só o `eventId` e a copy canônica.
4. Copy do glossário; foco na ação primária.

**Modelo de dados / contratos**
- Nenhum dado de domínio; envia evento a Sentry, recebe `eventId: string`.

**Regras de negócio a respeitar**
- §2.16 (exceção card crítico Vulcão permitida); sem dado sensível; erro observável no Sentry com contexto.

**Critérios de aceite (testáveis)**
- **Dado** um erro lançado num segmento, **quando** `error.tsx` captura, **então** vejo o 500 com shell, `eventId` visível e "Tentar novamente" chamando `reset()`.
- **Dado** um erro de raiz, **quando** `global-error.tsx` captura, **então** vejo o 500 em tela cheia.
- **Dado** qualquer captura, **quando** monta, **então** `captureException` foi chamado e nenhum stack aparece na UI.

**Testes a escrever**
- unit (componente): `error.tsx` chama `captureException` e mostra `eventId`; `reset` religado à ação primária; ausência de stack na UI.
- e2e: rota que lança erro mostra o 500 com shell + id.

**Definition of Done**
- [ ] Critérios de aceite passam
- [ ] Testes escritos e verdes
- [ ] Erro no Sentry com contexto; sem dado sensível na tela
- [ ] Shell no segmento / tela cheia na raiz; §2.16 (exceção justificada)
- [ ] Copy do glossário; acessibilidade AA (`role="alert"`)
- [ ] Lint + type-check limpos
- [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Retry automático de dados; 500 no App (T2).

---

#### LEELA-S502-T2 · 500 no App (ErrorBoundary + Sentry)

- **Tipo:** screen · **Depende de:** S500-T1, E00 (Sentry mobile) · **Estimativa:** S

**Objetivo**
Envolver a árvore de navegação do App num ErrorBoundary que exibe o `SystemStateScreen` RN de erro e registra a exceção no Sentry.

**Contexto & referências**
- Tela protótipo: `WEB-APPV2 (1)/500.html` (adaptada).
- Sentry React Native; DS `SystemStateScreen` (`.native`, `variant="error"`).

**Arquivos (criar/editar)**
- `apps/mobile/src/components/AppErrorBoundary.tsx` — boundary com fallback 500.
- `apps/mobile/app/_layout.tsx` — envolver o root com o boundary.

**Passos de implementação**
1. ErrorBoundary captura erro de render, chama Sentry (`eventId`), renderiza o fallback com ação "Tentar novamente" (reset do boundary / recarregar tela).
2. Não expor detalhes técnicos; mostrar `eventId` como id de erro.
3. Copy do glossário.

**Modelo de dados / contratos**
- Envia a Sentry, recebe `eventId`. Nenhum dado de domínio.

**Regras de negócio a respeitar**
- §2.16 flat (exceção danger); sem dado sensível; observável no Sentry.

**Critérios de aceite (testáveis)**
- **Dado** um erro de render numa tela, **quando** o boundary captura, **então** vejo o 500 RN com `eventId` e "Tentar novamente" que recompõe a árvore.

**Testes a escrever**
- unit/integração (RN): boundary captura erro, chama Sentry, mostra fallback e reseta.

**Definition of Done**
- [ ] Critérios de aceite passam
- [ ] Testes escritos e verdes
- [ ] Erro no Sentry; sem dado sensível
- [ ] Tokens do DS (mobile); §2.16 (exceção justificada); copy do glossário
- [ ] Acessibilidade
- [ ] Lint + type-check limpos
- [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Recuperação de estado de navegação profundo pós-crash.

---

### LEELA-S503 · Offline · (de-para BH-503)

**Como** usuário que perdeu a conexão, **quero** saber que estou offline e que o app volta sozinho, **para** não achar que o produto quebrou e retomar sem recarregar na mão.

- **MoSCoW:** Should (dentro do épico) · **Estimativa:** M · **Superfície:** Todas
- **Tela(s) de referência:** `WEB-APPV2 (1)/Offline.html`
- **RNs:** §2.12, §2.16, copy HANDOFF-07

**Critérios de aceite (Given/When/Then):**
- **Dado** perda de conexão no web, **quando** `navigator.onLine` vira falso, **então** vejo um aviso de offline não bloqueante (banner) mantendo o shell; navegação para conteúdo indisponível cai no `SystemStateScreen` de offline com "Tentar novamente".
- **Dado** que a conexão volta, **quando** o evento `online` dispara, **então** o aviso some e o conteúdo pretendido recarrega sozinho, sem ação manual obrigatória.
- **Dado** um PWA sem rede acessando rota não cacheada, **quando** o service worker responde, **então** serve a página de fallback offline (mesmo componente).
- **Dado** o App sem rede, **quando** o NetInfo detecta offline, **então** mostra o estado offline (banner + tela quando a ação exige rede) e recupera ao voltar a conexão.

**Tasks:** LEELA-S503-T1, LEELA-S503-T2

---

#### LEELA-S503-T1 · Offline no web (detecção + banner + fallback PWA)

- **Tipo:** integration · **Depende de:** S500-T1, E00 (config PWA/service worker) · **Estimativa:** M

**Objetivo**
Detectar estado offline no web, exibir aviso não bloqueante mantendo o shell, servir a página de fallback offline via service worker e recuperar automaticamente ao voltar a rede.

**Contexto & referências**
- Tela protótipo: `WEB-APPV2 (1)/Offline.html`.
- API `navigator.onLine` + eventos `online`/`offline`; service worker (fallback de navegação offline).
- DS: `SystemStateScreen` (`variant="offline"`, ícone `WifiOff`) + Banner/Toast do E01 (aviso não bloqueante).

**Arquivos (criar/editar)**
- `packages/core/src/system/useOnlineStatus.ts` — hook de status de conexão (web) + subject observável.
- `apps/painel/app/_components/OfflineBanner.tsx` e `apps/landing/app/_components/OfflineBanner.tsx` — banner não bloqueante.
- `apps/painel/public/offline.html` (ou rota `/offline`) — fallback do service worker.
- `apps/painel/app/offline/page.tsx` — página de fallback usando `SystemStateScreen`.
- Config do service worker (E00) — rota de fallback offline.

**Passos de implementação**
1. `useOnlineStatus`: lê `navigator.onLine`, escuta `online`/`offline`, expõe estado reativo.
2. Banner: quando offline, mostra aviso persistente (não bloqueia navegação em conteúdo já carregado); some ao voltar online.
3. Service worker: navegação a rota não cacheada sem rede → responde `/offline` (fallback com `SystemStateScreen`).
4. Recuperação: no evento `online`, revalidar/recarregar a rota pretendida automaticamente.
5. Copy do glossário; ação "Tentar novamente" força revalidação.

**Modelo de dados / contratos**
- Nenhum dado de domínio. `useOnlineStatus() -> { online: boolean }`.

**Regras de negócio a respeitar**
- §2.12 (recuperação automática ao voltar rede); §2.16 flat; copy do glossário.

**Critérios de aceite (testáveis)**
- **Dado** `offline` disparado, **quando** ocorre, **então** o banner aparece e o shell permanece.
- **Dado** navegação a rota não cacheada offline, **quando** o SW responde, **então** vejo o fallback offline.
- **Dado** `online` disparado, **quando** volta, **então** o banner some e a rota pretendida recarrega sem clique obrigatório.

**Testes a escrever**
- unit (core): `useOnlineStatus` reage a `online`/`offline`.
- e2e: simular offline → banner/fallback; voltar → recuperação automática.

**Definition of Done**
- [ ] Critérios de aceite passam
- [ ] Testes escritos e verdes
- [ ] Recuperação automática ao voltar rede (§2.12)
- [ ] §2.16 flat; tokens do DS; copy do glossário
- [ ] Acessibilidade AA (aviso perceptível por leitor de tela)
- [ ] Sem `localStorage` para estado de domínio
- [ ] Lint + type-check limpos
- [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Fila offline de escritas / sync de mutações (E13); cache de dados de domínio por rota.

---

#### LEELA-S503-T2 · Offline no App (NetInfo + banner + tela)

- **Tipo:** integration · **Depende de:** S500-T1 · **Estimativa:** S

**Objetivo**
Detectar conectividade no App via NetInfo, exibir aviso não bloqueante e a tela offline quando a ação exigir rede, recuperando ao reconectar.

**Contexto & referências**
- Tela protótipo: `WEB-APPV2 (1)/Offline.html` (adaptada).
- `@react-native-community/netinfo`; DS `SystemStateScreen` (`.native`, `variant="offline"`).

**Arquivos (criar/editar)**
- `packages/core/src/system/onlineStatus.native.ts` — wrapper de NetInfo expondo o mesmo contrato do hook web.
- `apps/mobile/src/components/OfflineBanner.tsx` — banner não bloqueante.
- `apps/mobile/src/screens/OfflineScreen.tsx` — tela offline para ações que exigem rede.

**Passos de implementação**
1. Assinar NetInfo; expor `online` reativo (mesmo contrato do web).
2. Banner quando offline; `OfflineScreen` quando a ação depende de rede.
3. Ao reconectar, disparar recarga do conteúdo pretendido.
4. Copy do glossário; ação "Tentar novamente".

**Modelo de dados / contratos**
- Nenhum. Contrato paritário com `useOnlineStatus` do web.

**Regras de negócio a respeitar**
- §2.12; §2.16 flat; copy do glossário.

**Critérios de aceite (testáveis)**
- **Dado** NetInfo offline, **quando** ocorre, **então** vejo o banner; ação que exige rede leva à `OfflineScreen`.
- **Dado** reconexão, **quando** volta, **então** o banner some e o conteúdo recarrega.

**Testes a escrever**
- unit/integração (RN): wrapper reage a NetInfo; banner/tela conforme estado.

**Definition of Done**
- [ ] Critérios de aceite passam
- [ ] Testes escritos e verdes
- [ ] Recuperação ao reconectar; tokens do DS (mobile)
- [ ] §2.16 flat; copy do glossário; acessibilidade
- [ ] Lint + type-check limpos
- [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Outbox/sync offline (E13).

---

### LEELA-S504 · Manutenção · (de-para BH-504)

**Como** usuário que acessa durante uma janela de manutenção, **quero** uma tela que avise que é temporário, **para** entender que não é falha e voltar depois.

- **MoSCoW:** Should (dentro do épico) · **Estimativa:** M · **Superfície:** Todas
- **Tela(s) de referência:** `WEB-APPV2 (1)/Manutencao.html`
- **RNs:** §2.12, §2.16, copy HANDOFF-07 (campanha "Volte amanhã."), flag de servidor

**Critérios de aceite (Given/When/Then):**
- **Dado** `config/system.maintenanceMode = true`, **quando** acesso qualquer rota do web, **então** o middleware me leva ao `/manutencao` em tela cheia (sem shell), com título "Estamos em manutenção", mensagem (usa `maintenanceMessage` se houver; senão a copy padrão) e ação "Tentar novamente".
- **Dado** que a flag volta a `false`, **quando** recarrego, **então** volto ao conteúdo normal automaticamente.
- **Dado** o App no boot, **quando** a flag remota indica manutenção, **então** vejo a tela de manutenção RN antes de entrar no app, com "Tentar novamente" e, se houver, link de status.
- **Dado** que a flag é do servidor, **quando** o cliente avalia, **então** ele apenas reflete o estado — nunca decide manutenção localmente.

**Tasks:** LEELA-S504-T1, LEELA-S504-T2

---

#### LEELA-S504-T1 · Manutenção no web (middleware + flag `config/system` + `/manutencao`)

- **Tipo:** integration · **Depende de:** S500-T1, E00 (Firestore/Remote Config, middleware) · **Estimativa:** M

**Objetivo**
Acionar a tela de manutenção em todo o web quando a flag de servidor estiver ligada, via middleware Next.js, e recuperar automaticamente ao desligar.

**Contexto & referências**
- Tela protótipo: `WEB-APPV2 (1)/Manutencao.html`.
- Next.js middleware; `config/system` (Firestore / espelho em Remote Config / edge config).
- DS: `SystemStateScreen` (`variant="maintenance"`, ícone `Wrench`/`Construction`); copy HANDOFF-07 (campanha "Volte amanhã.").

**Arquivos (criar/editar)**
- `apps/painel/middleware.ts` e `apps/landing/middleware.ts` — checam a flag e reescrevem para `/manutencao` (exceto a própria rota e assets).
- `apps/painel/app/manutencao/page.tsx` e `apps/landing/app/manutencao/page.tsx` — tela cheia com `SystemStateScreen`.
- `packages/api-client/src/system.ts` — leitura de `config/system` (cacheável).
- `firestore.rules` — `config/system` leitura pública, escrita negada ao cliente.

**Passos de implementação**
1. Middleware lê a flag (fonte cacheada de baixa latência — edge config/Remote Config espelhando `config/system`) e, se `true`, reescreve toda navegação para `/manutencao` (exceto assets e a própria página).
2. `/manutencao`: `SystemStateScreen` `layout="fullscreen"`, título/mensagem (usa `maintenanceMessage` se presente), ação "Tentar novamente" e link `statusUrl` se houver.
3. Ao desligar a flag, o middleware para de reescrever → conteúdo normal (recuperação automática).
4. Security Rules: `config/system` público para leitura, escrita só Admin SDK.

**Modelo de dados / contratos**
- `config/system` — `{ maintenanceMode, maintenanceMessage?, maintenanceUntil?, statusUrl? }`. Leitura; nunca escrita pelo cliente.

**Regras de negócio a respeitar**
- Decisão no servidor; cliente só reflete. §2.16 flat; copy do glossário.

**Critérios de aceite (testáveis)**
- **Dado** `maintenanceMode = true`, **quando** acesso qualquer rota, **então** sou reescrito para `/manutencao` em tela cheia.
- **Dado** `maintenanceMessage` definido, **quando** renderizo, **então** a mensagem custom aparece; senão a padrão.
- **Dado** `maintenanceMode = false`, **quando** recarrego, **então** volto ao conteúdo normal.
- **Dado** cliente tentando escrever `config/system`, **quando** a regra avalia, **então** nega.

**Testes a escrever**
- integração (Emulator): Security Rules de `config/system` (lê público, cliente não escreve).
- e2e: flag on → todos os caminhos caem em `/manutencao`; flag off → normal.

**Definition of Done**
- [ ] Critérios de aceite passam
- [ ] Testes escritos e verdes
- [ ] Flag no servidor; cliente só reflete; Security Rules cobrindo `config/system`
- [ ] Tela cheia sem shell; §2.16 flat; copy do glossário
- [ ] Recuperação automática ao desligar a flag
- [ ] Acessibilidade AA
- [ ] Lint + type-check limpos
- [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Painel de admin para ligar/desligar a flag (operação manual/Function nesta fase); statuspage próprio (só `statusUrl` externo).

---

#### LEELA-S504-T2 · Manutenção no App (flag remota no boot)

- **Tipo:** integration · **Depende de:** S500-T1, E00 (Remote Config/Firestore) · **Estimativa:** S

**Objetivo**
Bloquear a entrada do App com a tela de manutenção quando a flag remota estiver ligada, checando no boot e recuperando ao desligar.

**Contexto & referências**
- Tela protótipo: `WEB-APPV2 (1)/Manutencao.html` (adaptada).
- Firebase Remote Config (ou leitura de `config/system`); DS `SystemStateScreen` (`.native`, `variant="maintenance"`).

**Arquivos (criar/editar)**
- `apps/mobile/src/screens/MaintenanceScreen.tsx` — tela de manutenção RN.
- `apps/mobile/app/_layout.tsx` — gate de boot que checa a flag antes de entrar no app.
- `packages/core/src/system/maintenance.ts` — parsing/contrato compartilhado da flag.

**Passos de implementação**
1. No boot, ler a flag remota (Remote Config espelhando `config/system`).
2. Se ligada, renderizar `MaintenanceScreen` (mensagem custom se houver; ação "Tentar novamente" re-checa a flag; link `statusUrl` se houver).
3. Ao desligar, o "Tentar novamente" (ou próximo boot) libera o app — recuperação.

**Modelo de dados / contratos**
- Lê `config/system`/Remote Config. Nenhuma escrita. Contrato compartilhado em `maintenance.ts`.

**Regras de negócio a respeitar**
- Decisão no servidor; §2.16 flat; copy do glossário.

**Critérios de aceite (testáveis)**
- **Dado** flag ligada no boot, **quando** abro o App, **então** vejo `MaintenanceScreen` antes do conteúdo.
- **Dado** flag desligada, **quando** re-checo ("Tentar novamente"), **então** entro no app normalmente.

**Testes a escrever**
- unit/integração (RN): gate de boot mostra/oculta manutenção conforme a flag; parsing em `maintenance.ts`.

**Definition of Done**
- [ ] Critérios de aceite passam
- [ ] Testes escritos e verdes
- [ ] Flag no servidor; cliente só reflete
- [ ] Tokens do DS (mobile); §2.16 flat; copy do glossário
- [ ] Acessibilidade; recuperação ao desligar
- [ ] Lint + type-check limpos
- [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Admin para alternar a flag; statuspage próprio.

---

## Copy canônica dos estados (voz da marca · HANDOFF-07)

> Tom neutro-positivo, do coordenador, não institucional. Sem emoji. Frases curtas. Título em sentence case. Copy definitiva revisável com o glossário; abaixo, o padrão aprovado para este épico.

| Estado | Título | Mensagem | Ações |
|---|---|---|---|
| 404 | Essa página saiu para correr | O link que você seguiu não existe ou mudou de lugar. | Voltar · Ir para a Visão Geral (Painel) / página inicial (Landing) |
| 403 | Esse espaço ainda não é seu | Você não tem permissão para ver esta área. | Voltar · Falar com o organizador |
| 500 | Tropeçamos aqui, não foi você | Algo quebrou do nosso lado e a equipe já foi avisada. | Tentar novamente · Voltar · (id do erro) |
| Offline | Você está sem conexão | Assim que a internet voltar, a gente recarrega para você. | Tentar novamente |
| Manutenção | Estamos em manutenção | Ajustes rápidos para deixar tudo melhor. Volte em instantes. | Tentar novamente · Ver status (se houver) |

---

## Ordem sugerida

`S500-T1 (componente base) → S500-T2/T3 (404 web + app) → S502-T1/T2 (500) → S501-T1/T2 (403) → S503-T1/T2 (offline) → S504-T1/T2 (manutenção)`. O componente base (S500-T1) bloqueia todo o resto.

## Rastreabilidade

| Story | Estado | De-para | Tasks |
|---|---|---|---|
| LEELA-S500 | Página não encontrada (404) | BH-500 (`404.html`) | T1 componente base DS · T2 web (Painel+Landing) · T3 App |
| LEELA-S501 | Sem permissão (403) | BH-501 (`403.html`) | T1 web (guard + shell) · T2 App |
| LEELA-S502 | Erro interno (500) | BH-502 (`500.html`) | T1 web (`error`+`global-error`+Sentry) · T2 App (ErrorBoundary) |
| LEELA-S503 | Offline | BH-503 (`Offline.html`) | T1 web (onLine+PWA) · T2 App (NetInfo) |
| LEELA-S504 | Manutenção | BH-504 (`Manutencao.html`) | T1 web (middleware+flag) · T2 App (boot+flag) |

> Nota de-para: BH-500 a BH-504 são especificados no backlog como um bloco de 5 telas de estado com critérios de aceite comuns (ilustração/ícone, mensagem clara, ação de recuperação, mantém shell quando aplicável). Aqui cada estado vira uma story própria, decomposta em tasks por superfície (web/mobile) sobre um componente único do Design System (`SystemStateScreen`), preservando a rastreabilidade BH-### → LEELA-S###.
