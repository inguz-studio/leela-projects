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
- Java 21+ Temurin (para o Firestore Emulator — firebase-tools 15.x exige 21)

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

## Observabilidade (Sentry)

O Sentry é **env-gated**: sem DSN configurado, o init vira no-op silencioso e as apps sobem normalmente.

### Ativar o Sentry

1. Crie três projetos no [Sentry](https://sentry.io): `leela-painel`, `leela-landing`, `leela-mobile`.
2. Copie o DSN de cada projeto (Settings → Projects → Client Keys).
3. Adicione ao `.env` (nunca commitar):

```bash
VITE_SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<id>
NEXT_PUBLIC_SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<id>
EXPO_PUBLIC_SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<id>
```

4. Para verificar: rode a app, execute `reportError(new Error('teste'))` no console e confirme que o erro aparece no Sentry dashboard com release e ambiente corretos.

### Source maps (CI/CD)

Adicione `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` e `SENTRY_PROJECT` como secrets no CI. Com eles definidos, o build gera source maps e os envia automaticamente.

### Sentry: ativar crash reporting nativo no app mobile

Para crash reports nativos (crashes de código iOS/Android, não apenas JS):

1. Adicione o plugin ao `apps/mobile/app.json`:

```json
{
  "expo": {
    "plugins": [["@sentry/react-native/expo", { "organization": "<org>", "project": "leela-mobile" }]]
  }
}
```

2. Configure as credenciais EAS com `SENTRY_AUTH_TOKEN`.
3. Faça um build EAS: `eas build --platform all`.

Sem esse passo, apenas erros JS são capturados — suficiente para a Onda 0.

---

## Convenções

- TypeScript strict. Proibido `any` sem justificativa documentada.
- Paths `@leela/*` para importar entre pacotes do workspace.
- Commits convencionais: `feat(scope):`, `fix(scope):`, `chore(scope):`.
- 1 PR = 1 task (LEELA-S###-#-T#).
- Tokens do design-system obrigatórios; zero hardcode de cor, spacing ou radius.
