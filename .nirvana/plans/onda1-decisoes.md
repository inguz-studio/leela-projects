# Onda 1 — Decisões do maestro (trace leela-build-2d6ee98d, 2026-07-03)
Vale para TODOS os lotes da Onda 1. Cada agente DEVE ler este arquivo antes de começar.

1. **Vite é canônico no painel.** ADR-004 revisado: apps/painel = Vite + React Router (SPA).
   Specs que citam `apps/painel/app/**/page.tsx` (Next App Router) estão desatualizadas — traduzir
   para `apps/painel/src/routes/**` seguindo o padrão já existente no repo. Landing continua Next.js.
2. **firestore.rules é recurso serializado.** Além do mutex de commit (`mkdir .forge-mutex`), existe
   `mkdir .rules-mutex` na raiz: adquira ANTES de editar firestore.rules, mantenha durante edição+teste+
   commit do bloco de rules, remova depois. Se existir, aguarde em loop (sleep 30) — nunca edite sem ele.
   Releia o arquivo do disco após adquirir (outro lote pode ter mudado).
3. **tenantLifecycle.ts já existe** (~106 linhas): E16-L1 audita/completa/testa em vez de reescrever.
4. **Bootstrap platform_admin entra no E16-L1**: script de seed Emulator-only, guardado contra prod
   (mesmo padrão do guard de seed existente).
5. **Escopo E03 na Onda 1 = S200–S207** (20T). S208/S209/S210 são extensão pós-núcleo; S209-T3 nem
   entra (toca checkout E12/E13).
6. **E05 sem protótipo para Desafios/Configurações**: fonte é SPEC-01 §2.5/§2.10 (S105-T2, S110-T1).
7. **E02 taxaConversaoPct = null** até existir dado de visitas (E12) — documentar no código, não bloquear.
8. Roteamento: lotes L1/L2 (dados, rules, Functions, claims, LGPD) = Fable. Lotes de telas = Opus.
   Review antagonista de TODO épico = Fable. Sonnet proibido.
9. Ritual: 1 task = 1 commit atômico [LEELA-S###-T#]; sem push (maestro faz push nos gates);
   Emulator Java 21 zero skip; relatório com números reais; review antagonista antes do gate do épico.
