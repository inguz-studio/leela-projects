# Enriched brief — FIDELIDADE-EVENTOS (balde B), sub-lote 1: shell + fundação de gráficos + Overview

> Trace: leela-build-2d6ee98d · Banner: LEELA-FID-EVT · Modelo: Opus · Alvo: sf-frontend-engineer (software-forge)
> Prioridade: à frente do firebase-admin (decisão Vitor). Executar como SEQUÊNCIA de sub-lotes por tela; ESTE é o sub-lote 1.

## Fonte-de-verdade e diagnóstico (LER ANTES)
- Auditoria completa: `outputs/leela-build-2d6ee98d/FIDELIDADE-EVENTOS-REPORT.md` (24 MAJOR / 17 minor, com componente provável e pares de screenshot em `outputs/leela-build-2d6ee98d/fidelidade-eventos/`).
- Mockup "Claude Design" = HTMLs em `WEB-APPV2 (1)/` (abrir via file:// no viewport 1440×900). Telas deste sub-lote: `Detalhe do Evento.html` + `Overview do Evento.html`.
- Preview vivo: `http://127.0.0.1:5273` (suba com `bash preview.sh` se caiu; higiene de órfãos antes). Evento real de teste: slug `meia-floripa-2026` (o do primeiro card do hub; `meia-maratona-floripa-2026` NÃO existe no seed).

## FORA DE ESCOPO (não construir)
- **Balde A (features Onda 2):** as abas que faltam na sub-nav — Página de Vendas, Promotores, Comunicação, Configurações — são E04/E06/E08 da Onda 2. NÃO criar. O shell recebe só o enriquecimento do header (abaixo), não novas abas de feature.
- Hub, Financeiro, Inscritos, Kits, Entrega = sub-lotes seguintes, não este.

## ESCOPO DESTE SUB-LOTE (1 task = 1 commit `[LEELA-FID-EVT-T*]`)
- **T1 — Shell do evento (header, causa-raiz #1 parcial):** `EventoShell.tsx`/`EventoLayout.tsx` — enriquecer o header do evento p/ fidelidade ao `Detalhe do Evento.html`: tile/breadcrumb, "Ver página pública", menu de ações. NÃO adicionar abas de feature (Onda 2). Reusar componentes do DS existentes.
- **T2 — Fundação de gráficos (reuso-first + adr-conformance):** instalar **Recharts** (o ADR-010/ADR-stack §complementos JÁ decidiu Recharts — prove por grep que é a lib decidida, não outra). Criar componentes de gráfico no DESIGN SYSTEM (`packages/design-system`): **BarChart** e **DonutChart** tokenizados (cores/tipografia por token do DS, tema brasa/leela, WCAG AA). **CONSULTE a skill `dataviz`** para as boas práticas (paleta categórica acessível, eixos, legenda, tooltip). **DOCUMENTAR ambos no showroom** (`packages/design-system/showcase`) no mesmo commit — diretriz permanente do Vitor: componente novo é documentado no showroom no ato.
- **T3 — Overview drill à fidelidade** (`routes/eventos/evento/overview/*`) contra `Overview do Evento.html`: (a) hero de contagem regressiva (dias restantes, capacidade, % preenchimento); (b) cards de métrica fiéis — restaurar Taxa de conversão e Repasse previsto, com sparkline/delta (reusar Sparkline do DS, já existe); (c) painel **bar** "Inscrições por modalidade" (usa T2); (d) painel **donut** "Receita por modalidade" (usa T2); (e) "Atividade recente" como feed rico (não lista de nomes reaproveitada). Reusar os dados já disponíveis via os hooks `useQuery` do UX-DADOS (não refazer fetch); se um dado não existir no seed/agregado, popular o seed de preview (arquivo de preview, NÃO functions/src).

## DIRETRIZES PERMANENTES (Vitor)
1. **Reuso-first:** grep antes de escrever; reusar DS (Sparkline, Card, Badge, EventRow...), api-client, hooks `useQuery` já migrados, tipos do core. Recharts é a lib decidida — não trazer outra.
2. **Showroom fonte-de-verdade:** consultar o DS/showroom antes de criar UI; qualquer componente/padrão novo (BarChart, DonutChart) é DOCUMENTADO no showroom no mesmo lote.
3. Autoridade de correção de uso: `~/.claude/skills/harness/references/design-principles.md`. Skill `dataviz` para os gráficos.

## GATE (provar, não alegar)
- **Fidelidade:** screenshot vivo 1440×900 do Overview vs `Overview do Evento.html` lado a lado — os 5 itens (hero, cards, bar, donut, feed) presentes e fiéis. Evidência em `outputs/leela-build-2d6ee98d/fidelidade-eventos/pass2-*`.
- **adr-conformance:** grep prova Recharts (não outra lib de chart); charts vivem no DS e estão no showroom.
- **Reuso:** relatório lista o que foi reusado vs novo.
- Suíte em blocos (8GB) + tsc 0 + ESLint no-hardcoded 0 + build limpo. 1 task = 1 commit, trailers, push por aterrissagem. `functions/src` read-only. Review antagonista antes do gate.

## Referências
`FIDELIDADE-EVENTOS-REPORT.md` · `ADR-stack.md` §ADR-010 (Recharts) · mockup `WEB-APPV2 (1)/` · `design-principles.md` · skill `dataviz` · HANDOFF §Regra vinculante (showroom/reuso).

RETORNO: hashes T1-T3, reuso vs novo, resultado do gate de fidelidade (com evidência), prova adr-conformance (Recharts + showroom), testes/tsc/ESLint. Telas restantes do balde B ficam para os próximos sub-lotes (Hub híbrido → Financeiro → Inscritos → Kits/Entrega); os 2 itens a validar (slide-in inscrito, checklist balcão) valida-se no sub-lote da respectiva tela.
