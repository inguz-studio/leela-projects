# LEELA

Plataforma ticketeira e marketplace multi-tenant para corridas e esportes.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Painel web | Vite + React Router (SPA) |
| Landing pública | Next.js App Router (SSR/ISR) |
| App mobile | Expo (React Native) |
| Backend | Firebase: Firestore + Auth + Functions |
| Monorepo | Turborepo + pnpm workspaces |
| UI | Tailwind CSS + shadcn/ui |
| Forms | React Hook Form + Zod |
| Estado de servidor | TanStack Query |

## Estrutura

```
leela/
├── apps/
│   ├── painel/       # Vite + React SPA (painel do produtor)
│   ├── landing/      # Next.js SSR/ISR (landing pública)
│   └── mobile/       # Expo (app do atleta)
├── packages/
│   ├── core/         # Tipos de domínio + PaymentProvider interface
│   ├── design-system/# Tokens + componentes compartilhados
│   └── api-client/   # Wrapper tipado Firebase
├── functions/        # Cloud Functions (TypeScript)
├── turbo.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Como rodar

### Pré-requisitos

- Node >= 20
- pnpm >= 9 (`npm i -g pnpm`)
- Firebase CLI (`npm i -g firebase-tools`)
- Java 17+ (para o Firestore Emulator)

### Instalar dependências

```bash
pnpm install
```

### Desenvolvimento local (com emuladores)

```bash
# Terminal 1 — Firebase Emulator Suite (Firestore + Auth + Functions)
firebase emulators:start

# Terminal 2 — apps web (painel + landing)
pnpm turbo run dev
```

### Build completo

```bash
pnpm turbo run build
```

### Lint e type-check

```bash
pnpm turbo run lint
pnpm turbo run type-check
```

### Testes

```bash
pnpm turbo run test
```

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha os valores. O arquivo `.env` nunca deve ser commitado.

```bash
cp .env.example .env
```

Em desenvolvimento com emuladores, `VITE_USE_FIREBASE_EMULATOR=true` e `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` apontam as apps para os emuladores locais — nenhuma chave real é necessária na Onda 0.

## Convenções

- TypeScript strict. Proibido `any` sem justificativa documentada.
- Paths `@leela/*` para importar entre pacotes do workspace.
- Commits convencionais: `feat(scope):`, `fix(scope):`, `chore(scope):`.
- 1 PR = 1 task (LEELA-S###-#-T#).
- Tokens do design-system obrigatórios; zero hardcode de cor, spacing ou radius.
