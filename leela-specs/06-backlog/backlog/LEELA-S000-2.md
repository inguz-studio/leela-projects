---
id: LEELA-S000-2
type: story
epic: E00
epic_name: Fundação Técnica
onda: 0
surface: todas
moscow: Must
status: done
v1: true
tasks_total: 2
tasks_done: 2
tags: [leela, story]
---

# LEELA-S000-2 · Backend Firebase (Firestore + Auth + Functions + Emulators)
**Como** time de engenharia, **quero** o projeto Firebase configurado com emulador local, **para** desenvolver e testar backend sem tocar produção.

## Critérios de aceite
- Dado o emulador, quando rodo `firebase emulators:start`, então Firestore, Auth e Functions sobem localmente e o painel conecta neles em dev.
- Dado as Security Rules, quando um cliente tenta ler coleção sem permissão, então é negado (deny-by-default).

## Subtarefas
- [x] LEELA-S000-2-T1 — Inicializar Firebase (Firestore + Functions + Auth) + Emulator Suite
- [x] LEELA-S000-2-T2 — Firebase Auth (email/senha + Google + Apple) + custom claims de papel

## Artefatos entregues
- `firebase.json` — portas Firestore 8080, Auth 9099, Functions 5001, UI 4000
- `.firebaserc` — projeto `demo-leela` (emulator-only)
- `firestore.rules` — deny-by-default (`allow read, write: if false`)
- `firestore.indexes.json` — vazio, pronto para S1600-T3
- `functions/` — workspace TS/Node 20, firebase-functions v6, firebase-admin v13
- `functions/src/auth/onCreateUser.ts` — trigger v1 Auth: cria `atletas/{uid}`, seta `role=athlete`
- `functions/src/__tests__/rules.test.ts` — teste de integração (requer emulador; pendente Java/PATH)
- `packages/api-client/src/firebase.ts` — `initLeela()` idempotente + conexão com emuladores
- `packages/api-client/src/auth.ts` — helpers de sessão (email, Google, Apple, logout, getClaims)
- `.env.example` — vars `VITE_USE_EMULATOR`, `NEXT_PUBLIC_USE_EMULATOR`, `LEELA_USE_EMULATOR`

## Pendências conhecidas
- Apple Sign-In requer Apple Developer Account + Service ID em produção (stub funcional para dev)
- `test:rules` (Firestore Security Rules) requer emulador rodando: `export JAVA_HOME="/c/Program Files/Microsoft/jdk-17.0.19.10-hotspot" && export PATH="$JAVA_HOME/bin:$PATH"` antes de `firebase emulators:start --only firestore`

## Links
Épico: [[LEELA-E00-fundacao-tecnica]]
