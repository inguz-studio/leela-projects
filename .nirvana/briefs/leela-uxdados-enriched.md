# Enriched brief — UX-DADOS (lote #1 da fila, ADR-priorizacao-fila)

> Trace: leela-build-2d6ee98d · Lote: LEELA-UXDADOS · Modelo: Opus 4.8 (Fable esgotado) · Alvo: sf-frontend-engineer (software-forge)

## Objetivo
Eliminar o "carregar do zero" a cada navegação no painel LEELA. Implementar a camada de estado de servidor **já ratificada no ADR-010** (`leela-specs/adr/ADR-stack.md` §ADR-010): **TanStack Query sobre o Firebase SDK** (cache, revalidação, listeners). Migração **strangler-fig, tela a tela** — estabelecer o seam antes de tocar consumidores (Fowler), para que cada tela seja tocada uma vez.

## Escopo (este lote = fundação + primeiras telas)
- **Fundação:** instalar `@tanstack/react-query` (+ devtools) no painel; `QueryClientProvider` na raiz com defaults sensatos (`staleTime`/`gcTime`); build limpo. 1 commit.
- **Gateway fino (narrow-waist, Fowler):** camada de query/mutation keyed por recurso em `packages/core`/`api-client`, **reusando o api-client e os tipos existentes** (`parseEvento` etc.) — NÃO reescrever fetch já provado. Consistência: read-your-writes / bounded staleness via cache-then-revalidate (Kleppmann); `onSnapshot` realtime SÓ em superfícies vivas (balcão, financeiro), não em tudo. 1 commit.
- **Migrar as primeiras telas de dados** para `useQuery`, uma por commit, removendo o fetch-on-mount cru: começar por Visão Geral → Hub de Eventos → Inscritos. (Telas restantes ficam para o próximo lote — este prova o padrão.)

## Critérios de aceite (gate)
1. **Journey gate (L-001):** navegar Visão Geral → Eventos → Visão Geral SEM refetch cego / SEM flash de skeleton (dado servido do cache, revalidação em background). Provar AO VIVO no preview.
2. **ADR-conformance:** grep prova `useQuery` nas telas migradas (não fetch-on-mount cru) e `@tanstack/react-query` instalado e em uso. Rodar a rubric `adr-conformance` contra `ADR-stack.md`.
3. **Zero regressão:** telas mostram os mesmos dados; suíte relevante passa (em blocos, máquina 8GB); tsc 0; ESLint no-hardcoded 0.
4. **Reuso-first (diretriz Vitor):** reusar api-client/tipos existentes; não duplicar lógica de fetch provada. Consultar o showroom/DS para qualquer UI tocada; documentar no showroom qualquer componente/padrão novo.

## Restrições
- 1 task = 1 commit `[LEELA-UXDADOS-T*]`, staging cirúrgico, trailers de decisão · push por aterrissagem.
- Máquina 8GB: suíte em blocos, preview serial (nunca suíte+preview+screenshots juntos); higiene de processos node/emulator órfãos antes de subir preview.
- `functions/src` read-only. Opus (Fable esgotado). Review antagonista antes do gate.
- Qualquer coisa que exija JULGAMENTO de arquitetura (além do que o ADR-010 já decidiu) volta ao maestro, não é decidida sozinha.

## Referências
`ADR-stack.md` §ADR-010 · `ADR-priorizacao-fila.md` · `~/.claude/skills/harness/references/design-principles.md` (p/ UI tocada) · `06-lessons.md` L-001 · HANDOFF §Regra vinculante nova.
