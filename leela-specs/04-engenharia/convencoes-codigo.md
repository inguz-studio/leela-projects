# Convenções de código — Leela

> Documento vivo. Toda dúvida de padrão aqui é lei. Atualizar junto com a task que muda o padrão.

---

## 1. Estrutura de pastas

```
leela/
├── apps/
│   ├── painel/          # Web SPA — Vite + React + React Router
│   ├── landing/         # Web SSR — Next.js App Router
│   └── mobile/          # App — Expo + React Native
├── packages/
│   ├── core/            # Tipos de domínio + interfaces plugáveis (PaymentProvider, etc.)
│   ├── design-system/   # Tokens + componentes compartilhados
│   └── api-client/      # Wrapper Firebase client SDK + helpers tipados
├── functions/           # Cloud Functions (Firebase Functions v2, Node 20, TS)
├── leela-specs/         # Especificações, ADRs, DoD, backlog
├── e2e/                 # Testes Playwright (E2E cross-app)
├── firebase.json        # Config Firebase + Emulators
├── firestore.rules      # Security Rules (deny-by-default; isolamento tenant em S1600-T3)
├── firestore.indexes.json
├── turbo.json           # Pipeline Turborepo
└── pnpm-workspace.yaml
```

### Regras de localização

| O que vai onde | Onde |
|---|---|
| Tipo de domínio puro (interface, type, enum) | `packages/core/src/` |
| Interface plugável (PaymentProvider, EmailProvider) | `packages/core/src/{domínio}/` |
| Lógica de cálculo de domínio (RNs) | `packages/core/src/{domínio}/` |
| Firebase client init + emulator connect | `packages/api-client/src/firebase.ts` |
| Auth helpers client-side | `packages/api-client/src/auth.ts` |
| Cloud Function de domínio | `functions/src/{domínio}/{nomeFunction}.ts` |
| Componente visual | `packages/design-system/src/` |
| Tela/rota web painel | `apps/painel/src/routes/` |
| Tela/rota web landing | `apps/landing/app/` |
| Tela/rota mobile | `apps/mobile/app/` |

---

## 2. Nomenclatura

### Idioma

| Contexto | Idioma | Exemplos |
|---|---|---|
| Domínio de negócio (entidades, campos Firestore) | **PT-BR** | `atleta`, `clube`, `criadoEm`, `papelMembro` |
| UI (labels, textos, copy) | **PT-BR** | `"Novo evento"`, `"Inscrever-me"` |
| Código (variáveis, funções, classes, tipos TS) | **EN** | `createCharge`, `splitRules`, `onCreateUser` |
| Nomes de arquivo | **EN kebab-case** | `on-create-user.ts`, `mock-provider.ts` |
| Nomes de function Cloud | **EN camelCase** | `onCreateUser`, `setTenantClaims` |
| Paths de rota web | **PT-BR kebab-case** | `/meus-eventos`, `/novo-clube` |
| IDs de coleção Firestore | **PT-BR camelCase** | `atletas`, `clubes`, `profissionais` |

### Arquivos e módulos

- Componentes React: `PascalCase.tsx` (`EventoCard.tsx`)
- Hooks: `use{Nome}.ts` (`useAuth.ts`)
- Helpers/utils: `camelCase.ts` (`formatCurrency.ts`)
- Tipos/interfaces: exportados como `PascalCase` (`interface Atleta {}`)
- Constantes globais: `SCREAMING_SNAKE_CASE` (`MAX_PUSH_POR_SEMANA = 4`)

### Proibições de nome

- Nunca `tier` — sempre `kit` (RN-216).
- Nunca `be-hero.com.br` ou `beh.ro` — sempre `{DOMINIO_LEELA}`.
- Nunca nomes de gateway concreto no domínio (`stripe`, `pagarme`) — sempre `PaymentProvider`.

---

## 3. Conventional Commits

Formato: `<tipo>(<escopo>): <descrição imperativa em EN> [LEELA-<ID>]`

| Tipo | Quando usar |
|---|---|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `refactor` | Refator sem mudar comportamento |
| `test` | Adicionar ou corrigir testes |
| `docs` | Documentação |
| `chore` | Setup, tooling, dependências |
| `perf` | Melhoria de performance |
| `ci` | CI/CD |

**Escopo** = pacote ou domínio afetado: `firebase`, `auth`, `payments`, `core`, `api-client`, `painel`, `landing`, `mobile`, `functions`, `specs`, `ci`.

Exemplos:
```
feat(firebase): init Firestore+Functions+Auth + Emulator Suite [LEELA-S000-2-T1]
feat(auth): onCreateUser + custom claims role + helpers de sessão [LEELA-S000-2-T2]
docs(specs): convenções de código [LEELA-S000-4-T1]
feat(payments): mock PaymentProvider com split e webhook idempotente [LEELA-S000-4-T2]
```

---

## 4. Regra 1 PR = 1 task

- Cada task do checklist (`V1-CHECKLIST.md`) resulta em exatamente 1 commit atômico.
- O commit só é feito DEPOIS que `pnpm turbo run build type-check lint` + testes da task passam.
- Nenhum commit mistura duas tasks (nem "enquanto estou aqui" adjacente).
- Merge direto em `main` proibido — sempre PR + review.

---

## 5. Design System: tokens obrigatórios

- **Zero valor hardcoded** de cor, spacing, radius ou tipografia no código de UI.
- Sempre usar tokens do `packages/design-system`:
  - Cores: `var(--color-*)` / token CSS
  - Spacing: `var(--spacing-*)` / classe Tailwind mapeada ao token
  - Radius: `var(--radius-*)`
- Exceções documentadas em `packages/design-system/GOVERNANCE.md` (a criar em E01).
- Lint de tokens (`pnpm turbo run lint`) falha em violação — gate automático.

---

## 6. Proibições de armazenamento

### localStorage

`localStorage` é **proibido para estado de domínio**. Exemplos proibidos:

```ts
// PROIBIDO
localStorage.setItem('atletaId', uid);
localStorage.setItem('currentTenantId', tenantId);
localStorage.setItem('role', claims.role);
```

Alternativas permitidas:

| Caso | Alternativa |
|---|---|
| Sessão do usuário | Firebase Auth (persiste automaticamente via `indexedDB`) |
| Estado de UI (preferência de tema) | `localStorage` é OK — não é dado de domínio |
| Cache de dados | TanStack Query (gerencia cache e stale time) |
| Estado entre rotas | Context / URL search params |

### Segredos no cliente

- Zero chaves de API, tokens de gateway ou secrets em arquivos de app.
- Variáveis de ambiente de cliente: prefixo `VITE_` (painel) ou `NEXT_PUBLIC_` (landing).
- Variáveis de ambiente de servidor/Functions: `process.env` sem prefixo público.
- `.env` nunca commitado. `.env.example` sempre atualizado com as variáveis necessárias.

---

## 7. Mutex e operações no monorepo

### Quando usar mutex

Operações que modificam estado compartilhado em execuções paralelas:

- `pnpm install` na raiz (modifica `node_modules` e `pnpm-lock.yaml`)
- `git add` + `git commit` (modifica o índice e o histórico)
- Atualização de `V1-CHECKLIST.md` e `leela-specs/06-backlog/backlog/LEELA-S***.md`

### Como adquirir/liberar

```bash
# Adquirir — loop até mkdir ter sucesso
until mkdir .forge-mutex 2>/dev/null; do
  powershell -NoProfile -Command "Start-Sleep 5"
done

# ... fazer operação crítica ...

# Liberar
rmdir .forge-mutex
```

### Instalação de dependências

```bash
# Sempre com mutex
until mkdir .forge-mutex 2>/dev/null; do sleep 5; done
pnpm install
rmdir .forge-mutex
```

---

## 8. TypeScript strict

- `strict: true` em todos os pacotes (herda `tsconfig.base.json`).
- `any` é **proibido** sem comentário `// eslint-disable-next-line @typescript-eslint/no-explicit-any` + justificativa.
- Prefira `unknown` sobre `any` em boundaries externos (webhooks, payloads de API).
- `noUncheckedIndexedAccess: true` — sempre verificar `undefined` em acessos de array/objeto.

---

## 9. Validação de input no servidor

- Toda Cloud Function valida o input antes de processar (Zod ou validação manual).
- Nunca confiar em dados do cliente para estado financeiro ou papéis.
- Webhook de pagamento: verificar assinatura HMAC antes de processar (invariante).

---

## 10. Agregados e idempotência

- Agregados `∑` (contadores, totais financeiros) são mantidos **exclusivamente por Cloud Functions**.
- Clientes nunca escrevem diretamente em campos agregados.
- Toda Function que atualiza contador usa **transação Firestore** ou **distributed counter** (para alta concorrência).
- Webhooks são idempotentes: reprocessar o mesmo payload não duplica estado (use `idempotencyKey` ou docId determinístico).

---

## 11. Multi-tenancy

- Todo agregado tenant-scoped carrega `tenantId` no documento.
- Toda query de coleção tenant-scoped filtra por `tenantId`.
- Security Rules de isolamento por tenant estão em `LEELA-S1600-T3` — não antecipar.
- `atletas` e `catalogoAcoes` são globais (cross-tenant).

---

## 12. Tarefas agendadas (cron/scheduler) — ADR-015

- **Wrapper v1 fino:** `pubsub.schedule('…').timeZone('America/Sao_Paulo').onRun()`; log via `firebase-functions/logger`. Precedente: `recalcularStatusMembros`.
- **Núcleo puro separado:** toda a lógica em `*Core(db, agora, …)` exportada e testável no Emulator **sem** o scheduler (o Emulator `--only firestore,auth` não sobe pubsub — o teste chama o Core direto).
- **Horários escalonados por dependência** (a ordem é aceite): `03:00` recalcularStatusMembros (RN-102) → `03:05` coletaDiaria (E11 — lê status já envelhecidos) → `03:10` encerrarEventos (RN-350). Cron novo = próximo múltiplo de 5 min, sempre depois das dependências; registrar o slot no ADR-015.
- **Idempotente sempre:** rerun do mesmo dia/estado produz o mesmo resultado (substituição total/recontagem — nunca increment cego).
- Sem registry de crons por ora (reavaliar com ~6 tarefas). Detalhe completo: `leela-specs/03-canon/adr/ADR-015-scheduler-cron.md`.

---

*Dúvida não coberta aqui → abrir issue no backlog antes de inventar padrão novo.*
