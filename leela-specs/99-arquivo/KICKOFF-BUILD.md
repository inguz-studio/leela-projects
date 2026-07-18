---
tags: [leela, kickoff, build, harness, software-forge]
aliases: [Kickoff Build, Prompt de construção]
---

# Leela · Kickoff de construção (via harness / Software Forge)

> Prompt pronto para colar numa sessão nova do Claude Code na raiz do repositório LEELA. O modelo entra como maestro do Nirvana-OS e mobiliza a empresa **software-forge** para construir a partir dos specs. Complementa `IMPLEMENTATION-PLAN.md` (que tem a stack e a ordem das ondas) e `definition-of-done.md`.

## Sequência recomendada (não é front-first nem back-first — é fatia vertical)

Front-end entra cedo, mas na forma do **Design System** (Onda 0). Telas de feature vêm **depois** do contrato de dados delas (schema Zod em `core` → Function/Rules → tela), tudo no Firebase Emulator. Multi-tenancy (E16-S1600) vem antes de qualquer dado de domínio (ADR-009).

Ordem das ondas (de `IMPLEMENTATION-PLAN.md §4`):
- **Onda 0 · Fundação:** monorepo + Firebase/Emulator + CI + Sentry; Design System (E01); multi-tenancy (E16-S1600).
- **Onda 1 · Operar:** E03 operação · E02 dashboard · E05 clubs (núcleo) · E16-slim.
- **Onda 2 · Vender:** E04 vendas/afiliação/split · E08 promotor · E12 landing + checkout · E06 comunicação.
- **Onda 3 · App simples:** E13-slim (descobrir → comprar → ingresso QR → push → clube).

## Onde as 12 stories novas + ADR-011 se encaixam

| Story | Onda | Observação de dependência |
|---|---|---|
| **S209** tamanho por inscrito (E03) | Onda 1 | data-model; **bloqueia S210**; coletado por inscrito (ADR-011) |
| **S210** aprovisionamento encomenda→estoque (E03) | Onda 1 | depende de S209 |
| **S305** política de reembolso/transferência (E04) | Onda 2 | config; a execução é S904 |
| **S306** exigências de saúde + regulamento (E04) | Onda 2 | saúde mínima + flag; subcoleção `saude` LGPD |
| **S1206** ingresso + e-mail de marca + PDF (E12) | Onda 2 | dispara no webhook de confirmação; e-mail ao responsável do pedido |
| **S1207** aceite de regulamento + emergência (E12) | Onda 2 | coletado por inscrito no checkout |
| **S1208** portal público do organizador (E12) | Onda 2+ | greenfield — precisa de rodada de design antes |
| **S208** check-in por QR no balcão (E03) | Onda 2 | depende do `qrToken` de S1206 |
| **S904** máquina de reembolso + estorno + clawback (E09) | **decisão** | ver nota abaixo |
| **S1314** QR + check-in no app (E13) | Onda 3 | leitura espelhada |
| **S1315** reembolso/cancelar no app (E13) | Onda 3 | depende de S904 |
| **S1316** titularidade/troca no app (E13) | Onda 3 | depende de S904 |
| **ADR-011** pedido em grupo | Onda 2 | modelar `pedidos` quando o checkout for construído; corrige E13-S1306 |

> **Decisão pendente — S904.** O épico E09 (financeiro) está marcado como fora da V1 no `IMPLEMENTATION-PLAN.md`, mas a **execução de reembolso é juridicamente load-bearing** (CDC art. 49) e o QA a classificou como crítica. Recomendação: puxar a fatia S904 (política 7d/48h + estorno + clawback RN-346 + notificação) para a **Onda 2**, junto de S305, mesmo que o resto de E09 fique pós-V1.

---

## Prompt de kickoff (colar no Claude Code, na raiz do repo)

```
Use o nirvana-os (harness) e mobilize a empresa software-forge para COMEÇAR A CONSTRUIR o projeto LEELA a partir das especificações do próprio repositório. Você é o maestro: orquestra e despacha os executores da Software Forge; não escreve o código de produção você mesmo.

PROJETO
- Raiz: a pasta atual (workspace LEELA). App de ticketing para corridas, marketplace multi-tenant.
- Fonte da verdade = leela-specs/: IMPLEMENTATION-PLAN.md (stack + ordem das ondas), V1-CHECKLIST.md, KICKOFF-BUILD.md (encaixe das stories novas), epics/LEELA-E00..E16.md (stories ### LEELA-Sxxx com tasks #### T# AI-ready), modelo-de-dados-firestore.md, adr/ (ADR-004..011), definition-of-done.md, estrategia-testes.md.
- Stack: TypeScript strict; monorepo Turborepo+pnpm (apps/painel Vite+React Router; apps/landing Next.js; apps/mobile Expo; packages/core|design-system|api-client; functions/). Firebase (Firestore, Auth com claims role+tenantId, Cloud Functions) + Emulator. Tailwind+shadcn (tema brasa), React Hook Form+Zod (schema em core), TanStack Query. Testes Vitest+Testing Library, Emulator, Playwright.

FASE DE LEITURA (antes de despachar)
1. Leia IMPLEMENTATION-PLAN.md + V1-CHECKLIST.md + KICKOFF-BUILD.md para a ordem das ondas e o encaixe das stories novas.
2. Verifique o estado do repo. Se o monorepo NÃO está scaffoldado, o primeiro trabalho é a ONDA 0 (E00 fundação + E01 Design System + E16-S1600 multi-tenancy). Não pule a Onda 0. Multi-tenancy vem antes de qualquer dado de domínio (ADR-009).
3. Emita o target_plan no audit trail com a ordem de ataque.

EXECUÇÃO (via Software Forge, fatia vertical por feature)
- Respeite "Depende de"; paralelize só tasks de arquivos distintos. Uma task = um PR/commit atômico.
- Ordem dentro de cada feature: schema Zod em packages/core -> Cloud Function + Security Rules -> tela. Nunca a tela antes do contrato de dados.
- Cada executor: lê a task + RNs + modelo de dados + DoD do tipo dela; implementa; escreve testes (unit em core / integração de Rules e Functions no Emulator / e2e quando marcado); roda lint + type-check.
- Invariantes: tokens do design-system (zero hardcode); toda coleção nova cria Security Rules na mesma task; toda query/rule filtra por tenantId; agregados só por Function idempotente; webhook idempotente e assinado; nada de segredo no cliente nem localStorage para domínio; "kit" nunca "tier" (RN-216); PaymentProvider/EmailProvider como interfaces plugáveis (ADR-006). Inscrição = pedido em grupo (ADR-011).

QUALITY GATE (antes de dar qualquer coisa como pronta)
- Verifique em disco que os arquivos existem e os testes passam; rode o DoD (definition-of-done.md) item a item. "Done" é binário. Se falhar, re-despache revisão. Emita gate_passed/gate_failed no audit.

ENTREGA POR ONDA
- A cada onda (ou lote), reporte: o que foi construído, saída dos testes, pendências e a próxima fatia. Ao concluir cada task, marque a subtarefa em leela-specs/06-backlog/backlog/ e mova o status. Pare e pergunte quando precisar de uma chave real (Firebase Blaze, gateway, Apple/Google); o resto roda no Emulator.

Comece pela fase de leitura e me traga o plano de ondas + a primeira leva de tasks que vai despachar (Onda 0 primeiro se o repo não estiver scaffoldado), antes de escrever código.
```

## Pré-requisitos da máquina (SETUP.md)
Node LTS 20+, pnpm, Git, Firebase CLI, Java 17+ (Emulator do Firestore). Mobile (Onda 3): Xcode / Android Studio. Sem chaves para a Onda 0 — tudo no Emulator.
