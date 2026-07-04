# Lote VERIFY-FIX-E00 — verificação item a item da correção do E00
trace_id: leela-build-2d6ee98d · repo: C:\Users\Vitor Eduardo\Desktop\Vaults\Projetos\LEELA · modelo: Fable 5

## Contexto
REVIEW-E00 (Fable) reprovou o épico LEELA-E00 com 19 achados (1 crítica, 5 altas, 7 médias, 6 baixas).
FIX-E00 foi despachado e commitou uma série de correções (c9064c5..c56b747), mas a sessão morreu ANTES
de emitir gate. Sua missão: auditar se os 19 achados foram de fato corrigidos, fechar o que faltar e
devolver um veredito.

Achados nomeados no audit (~/.harness-logs/2026-07-03/audit.jsonl, evento gate_failed REVIEW-E00):
- E00-C1 gate de teste vermelho sem emulador + firebase-tools exige Java 21 (rules.test.ts skip condicional real)
- E00-A1 preview.yml `secrets` em job-if inválido
- E00-A2 ci.yml setup-java@v4 temurin 21 + pin firebase-tools (commit 033ed9d aparenta cobrir)
- E00-A3 painel não conecta ao emulador (initLeela morto) — commits 41b3667/744137c aparentam cobrir
- E00-A5 calcularSplit ignora regra do último recipient — ab41286
- E00-A6 handleWebhook ignora event type e aceita qualquer assinatura — 6654150
- Médias/baixas: refund (263fa1c), onCreateUser retry-safe (117957c + 7215815), turbo outputs, convenções, renames Leel→Leela.

## Tarefa
1. `git log --oneline 8bcef2f..HEAD` + diff dos commits de fix; mapear cada um dos 19 achados → commit que o corrige (ou marcar PENDENTE).
2. Para cada PENDENTE: corrigir você mesmo (1 achado ou grupo coeso = 1 commit atômico `fix(...): ... [LEELA-S000-x-Tx]`).
3. Rodar: `pnpm turbo build type-check lint test` na raiz + suíte Firestore Emulator (Java 21 já configurado; zero skip permitido).
4. Devolver: tabela achado→commit→status, resultado dos comandos (números reais), e veredito `pass` ou `needs_fixes` com o que falta.

## Regras
- Mutex para commit/install concorrente: `mkdir .forge-mutex` na raiz do repo antes de `git commit`/`pnpm install`; `rmdir` depois. Se existir, aguarde em loop curto.
- NÃO tocar em packages/design-system (outro lote FIX-E01 está trabalhando lá em paralelo).
- Sem chaves reais; Emulator-only. Não criar remote nem fazer push.
- Flaky = reprovado. Nada de skip/retry para esconder vermelho.
