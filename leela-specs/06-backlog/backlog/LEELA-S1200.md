---
id: LEELA-S1200
type: story
epic: E12
epic_name: Landing Pública
onda: 2
surface: landing
moscow: Must
status: backlog
v1: true
tasks_total: 2
tags: [leela, story]
---
# LEELA-S1200 · Superfície landing SSR/ISR + shell público + leitura pública de dados
**Como** time, **quero** o app `apps/landing` em Next.js App Router com SSR/ISR, tema `leela` e um leitor server-side de dados publicados, **para** que todas as páginas públicas tenham fundação comum, seguras e rápidas.

## Critérios de aceite
- Dado o app landing, quando faço build, então as rotas públicas são Server Components com ISR e nenhum segredo Firebase vaza no bundle do cliente.
- Dado um documento não publicado/privado, quando o leitor server-side tenta lê-lo, então o gate por `status`/`visibilidade` resulta em 404.
- Dado o tema, quando renderizo qualquer página pública, então aplica `theme="leela"` do DS sem redefinir token localmente.

## Subtarefas
- [ ] LEELA-S1200-T1 — Scaffold `apps/landing` (App Router, SSR/ISR) + layout público + ThemeProvider
- [ ] LEELA-S1200-T2 — Leitor público server-side (Admin SDK) com gate de publicação/visibilidade + revalidação

## Links
Épico: [[LEELA-E12-landing]]
