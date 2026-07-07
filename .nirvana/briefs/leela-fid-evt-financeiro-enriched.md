# Enriched brief — FID-EVT sub-lote 4: FINANCEIRO (só gráficos, per-evento, ancorado no JOB)

> Trace: leela-build-2d6ee98d · Banner: LEELA-FID-EVT · Modelo: Opus · Alvo: sf-frontend-engineer

## JOB — alvo primário
- **Persona:** Organizador. **JTBD (S207):** "ver o financeiro DO EVENTO (receita bruta, líquida, taxas, repasses), **para acompanhar o resultado e planejar saques**."
- **Critérios S207 (spec primário):** (1) receita bruta + taxa Leela + receita líquida; (2) breakdown por modalidade E por lote E inscrições por forma de pagamento; (3) status de repasse (organizador); (4) Exportar CSV.
- **Dor servida:** "chegar na reunião com dados na mão", "relatório em tempo real sem exportar planilha".

## CORREÇÃO DE ESCOPO (story vence mockup — JÁ DECIDIDO)
O mockup `Financeiro.html` mostra financeiro **multi-evento/mensal**; a S207 pede **DO EVENTO**. **NÃO reconstruir para multi-evento** — o build por-evento está CERTO. O gap real é só de VISUALIZAÇÃO: hoje tabelas planas onde o mockup tem gráficos. Este lote adiciona os GRÁFICOS, mantendo o escopo per-evento.

## ESCOPO (só visual, sobre dados existentes)
- **Reusar os gráficos do DS** (BarChart + DonutChart, criados no Overview — grep, NÃO recriar): 
  - **Donut** "Receita por modalidade" (o agregado já existe — mesmo padrão do Overview).
  - **Bar** por lote e/ou inscrições por dia (o que o agregado `financeiro/current` já tiver).
- Manter/organizar os KPIs bruto/taxa/líquido/repasse (S207-T1 já feito) + o breakdown existente.
- **DEPENDE DE BACKEND (flag, não construir agora):** "inscrições por **forma de pagamento**" precisa do modelo de pagamento (mesmo débito do slide-in rico S203-T3 e do lote de backend consolidado). Se o dado não existe no agregado, **NÃO invente** — deixe o painel/placeholder honesto (EmptyState "disponível com o módulo de pagamento") e registre o follow-up. Repasse de **afiliados** é Onda 2 (cortado) — só repasse do organizador.
- **CSV export:** se já existe export no Financeiro, garanta que passa pela **neutralização anti-fórmula** (reusar `neutralizarFormula`/`celula` do padrão já implementado em `inscritosCsv.ts` — não reimplementar; extrair p/ util compartilhado se fizer sentido).

## DIRETRIZES (permanentes)
- **JOB primeiro; mockup = aparência.** Cada decisão traça a um critério S207. Per-evento vence o multi-evento do mockup.
- **Reuso-first:** BarChart/DonutChart do DS, o `useQuery` de financeiro (UX-DADOS/`useFinanceiro`), a neutralização de CSV. Componente/padrão novo → showroom no ato.
- Autoridade de uso: `design-principles.md` + skill `dataviz` (para os gráficos).

## GATE
Screenshot 1440×900 do Financeiro vivo vs `Financeiro.html` (referência de aparência): gráficos de breakdown presentes, escopo per-evento, KPIs bruto/taxa/líquido. Evidência `outputs/leela-build-2d6ee98d/fidelidade-eventos/financeiro-pass-*`. adr-conformance: Recharts (via os charts do DS) + `useQuery`. CSV export anti-injeção (teste). Suíte em blocos + tsc 0 + ESLint no-hardcoded 0 + build limpo. **Review antagonista** se tocar componente reusável (charts já existem; se só consumir, meu gate basta — decido no retorno). 1 task = 1 commit `[LEELA-FID-EVT-FIN-T*]`, trailers, push. `functions/src` read-only. Relatório `outputs/.../FID-EVT-FINANCEIRO-REPORT.md`; KANBAN/CHECKLIST.

RETORNO: hashes; reuso vs novo; mapa decisão→critério-S207; o que ficou como dependência de backend (por forma de pagamento); gate vivo (evidência); CSV anti-injeção; testes/tsc/ESLint. NÃO faça Kits/Entrega (próximos).
