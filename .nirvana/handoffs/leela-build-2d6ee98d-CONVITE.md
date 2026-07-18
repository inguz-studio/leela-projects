# Handoff — Lote CONVITE (trace leela-build-2d6ee98d)

employee: sf-frontend-engineer · 2026-07-18 · rota `/convite/afiliado` (landing)

## Estado: VERIFICADO (deliverable pré-existente, gates verdes)

O deliverable já existia e está commitado desde o lote **R9-E** (`eccfbd0`). Esta lane fez a **passada de verificação** que o brief pede como critério de aceite. Nada foi reescrito.

## Critérios de aceite × evidência

- [x] **Path do e-mail conferido** — `salvarAfiliado.ts:448` gera `/convite/afiliado?e&a&t`; a rota casa.
- [x] **Página viva na :3200 · estados provados** — gate Playwright `CONVITE/convite-afiliado-shots.mjs` PASS: estado inválido/honesto + estado form (desktop+mobile, sem overflow, theme brasa). PNGs em `CONVITE/shots/`.
- [x] **Fluxo de aceite completo contra emulator com doc de teste** — núcleo REAL `provisionAfiliadoCore` contra Firestore :8180 / Auth :9198 vivos, seed ADITIVO (nunca clearFirestore): 4 asserções verdes (inválido opaco · inexistente opaco · expirado · aceito→replay). Teardown limpou docs+users. Prova canônica R9-E: `afiliados.integration` 22 passed.
- [x] **verify:brand verde** — PASS.
- [x] **tsc/lint 0** — 0/0 na landing.
- [x] **L-012** — rota compilada on-demand na :3200; sem `next build`.

## Pendências / achados (para o orquestrador → Vitor)

1. **Brief desatualizado**: pedia "criar" a página; ela já existe (R9-E). Este lote = verificação. Considerar fechar o lote como duplicado/verificação.
2. **AC "nome do clube/evento" NÃO implementado** (fora da lane): exigiria callable de preview OU read público do evento + Rules (`functions/**`/rules proibidos aqui). Página espelha o E18 (texto genérico); nome já vai no e-mail. **Decidir**: aceitar como está (espelho E18) OU abrir tarefa de backend p/ endpoint de preview do convite.
3. **Emulator de Functions do preview (:5201) roda build ANTIGO** sem `provisionAfiliadoAccount` (404) → o aceite não pode ser dirigido pelo browser ao vivo até rebuild+restart do emulator do Vitor (fora da lane). Por isso a prova foi via núcleo real in-process.
4. **Toolchain**: Java 17 na máquina; firebase-tools exige JDK 21+ → não sobe Firestore emulator novo/isolado. Preview é `singleProjectMode:true` (não rodar suíte com clearFirestore contra :8180).

## Git

Sem mudança no deliverable. Commit só de artefatos de evidência sob `outputs/leela-build-2d6ee98d/CONVITE/` + report + este handoff. Board central `V1-KANBAN` intocado (já ✅ para R9-E; outra lane tem WIP lá).
