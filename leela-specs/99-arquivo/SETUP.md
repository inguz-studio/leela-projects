---
tags: [leela, setup, prerequisitos]
aliases: [Setup, Pré-requisitos, Contas e chaves]
---

# Leela · Setup & pré-requisitos (começando do zero)

> Você **não precisa** de repo, Firebase ou API keys para começar. A Onda 0 monta tudo isso, e o desenvolvimento roda contra o **Firebase Emulator** (local, sem chaves). Este guia diz o que instalar, o que criar (passos humanos) e **quando** cada chave é necessária.

## 1 · Ferramentas para instalar (na sua máquina)

- **Node.js LTS** (20+), **pnpm** (`npm i -g pnpm`)
- **Git**
- **Firebase CLI** (`npm i -g firebase-tools`) — inclui o Emulator Suite
- **Java 17+** (o Emulator do Firestore precisa)
- (Mobile, só na Onda 3) **Xcode** (iOS) / **Android Studio** (Android) para o Expo

## 2 · Contas a criar (passos humanos — a IA não faz por você)

| Conta | Quando precisa | Observação |
|---|---|---|
| **GitHub** (repositório) | Agora ou logo após o scaffold | Pode `git init` local agora e criar o remoto depois |
| **Firebase** (projeto) + plano **Blaze** | Só ao sair do emulador (deploy/preview) | Blaze é exigido para Cloud Functions; tem free tier generoso |
| **Gateway de pagamento** (Pagar.me/Asaas) | Onda 2 (vendas) | Há **sandbox/mock** antes; decisão em ADR-006 |
| **Sentry** | Quando quiser erros em ambiente real | Opcional no início |
| **Apple Developer + Google Play** | Onda 3 (publicar o app) | Só para distribuir o Expo |

## 3 · Emulator-first (o que dá para fazer sem chave)

Contra o **Firebase Emulator Suite** (`firebase emulators:start`), local e grátis:
- Firestore (dados + Security Rules), Auth (login fake), Cloud Functions.
- **Toda a Onda 0** e boa parte da Onda 1 rodam assim. Você só aponta o app para o emulador via `.env` de dev.

Chaves reais entram quando: for testar num ambiente hospedado, fazer deploy de preview, ou usar serviços externos (pagamento, push real, Sentry).

## 4 · Onde as chaves ficam (segurança)

- Em arquivos **`.env`** por app (ex.: `apps/painel/.env.local`), **no `.gitignore`** — nunca commitadas.
- Um **`.env.example`** (sem valores) fica versionado, documentando quais variáveis existem.
- Config pública do Firebase (apiKey do client) pode ir no `.env` do front — não é segredo forte, mas a segurança real vem das **Security Rules** (ADR-009).
- **Service account** (chave privada, para CI/Functions admin) vai em **GitHub Secrets**, nunca no repo.
- Chaves de pagamento (secret key do gateway) só no servidor/Functions — nunca no cliente.

## 5 · Sequência recomendada

1. **Agora:** instale as ferramentas (seção 1) e `git init` na pasta do projeto.
2. **Onda 0 (Fable 5):** scaffold do monorepo + Firebase config + Emulator + CI. Roda tudo local.
3. **Quando quiser um backend real / preview:** crie o projeto Firebase (console), ative Blaze, baixe a config e coloque no `.env`. Configure GitHub Secrets para o CI.
4. **Onda 2:** escolha o gateway (ADR-006), pegue as **chaves de sandbox** e ligue no `PaymentProvider`.
5. **Onda 3:** contas Apple/Google para publicar o app.

---

## Resposta curta

**Dá para começar já.** O que trava a Onda 0 é só ter Node/pnpm/git/Firebase CLI instalados. Repo remoto, projeto Firebase e API keys você provisiona ao longo do caminho, cada um no momento em que é necessário — e o emulador cobre o resto.

Ver: [[IMPLEMENTATION-PLAN]] · [[V1-CHECKLIST]] · [[HOME]]
