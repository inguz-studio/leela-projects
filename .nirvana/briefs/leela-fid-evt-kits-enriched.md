# Enriched brief — FID-EVT sub-lote 5: KITS (foco no Estoque, ancorado no JOB)

> Trace: leela-build-2d6ee98d · Banner: LEELA-FID-EVT · Modelo: Opus · Alvo: sf-frontend-engineer

## JOB — alvo primário
- **Persona:** Organizador. **JTBD (S205):** "configurar os kits do evento e o catálogo de itens, para oferecer opções por modalidade com patrocinadores vinculados." **Dor servida:** "kit errado na entrega por falha de coleta de tamanho" + visibilidade de estoque.
- **Sub-nav interna dos Kits (S205):** Cadastro · Distribuição · **Estoque** · Entrega.
- **Gap da auditoria (o alvo deste lote):** a tela **ESTOQUE** — mockup `Kits-Estoque.html` tem **alerta + 4 KPIs + matriz tamanho×modalidade + movimentações**; o vivo é tabela plana de 4 linhas. É o que serve "não errar o kit / saber o que tem".

## PASSO 1 — VALIDAR o Cadastro contra S205 (reuso-first)
A área de Kits já existe (S205/S206). Valide AO VIVO (`/eventos/meia-floripa-2026/kits`) o que S205 já cumpre — sub-nav interna, cards de kit (incl. "Sem kit"), catálogo de itens com "Usado em" + badges tipo/origem, bloco de patrocinador + toggle, rodapé com 3 cards, nomenclatura "kit" nunca "tier" (RN-216). Documente o que JÁ cumpre (não reconstruir).

## PASSO 2 — Fechar o ESTOQUE (o gap real), grounded em S205 + mockup `Kits-Estoque.html`
- **Alerta** de estoque (ex.: "Kit tamanho M esgotado / baixo") no topo.
- **KPIs** de estoque (total, distribuídos, disponíveis, em risco — o que o dado suportar).
- **Matriz tamanho × modalidade** — a visão que serve "não errar o kit": reusar o DS `Table` (colunas = tamanhos, linhas = modalidade/kit, células = qtd) se servir; se um componente de matriz novo for reusável, documentar no showroom (→ review antagonista). Densidade/informação primeiro (design-principles + L-005).
- **Movimentações** (entradas/saídas) como tabela.
- Dados: reusar o `useQuery` de kits/estoque se existir; **se o dado de estoque não existe no agregado, EmptyState honesto** (dependência de backend, NÃO inventar) — mesmo padrão do Financeiro.

## DIRETRIZES (permanentes)
- JOB primeiro; mockup = aparência. Cada decisão traça a um critério S205 ou à dor "kit errado". Reuso-first (DS Table/KPI cards/Badge/charts, `useQuery`). Componente reusável novo → showroom + avisar p/ review. Autoridade: `design-principles.md`.
- `functions/src` read-only.

## GATE
Screenshot 1440×900 do Estoque vivo vs `Kits-Estoque.html`: alerta + KPIs + matriz + movimentações (ou EmptyState honesto onde faltar dado). Evidência `outputs/leela-build-2d6ee98d/fidelidade-eventos/kits-pass-*`. adr-conformance: `useQuery` (não fetch cru). Suíte em blocos + tsc 0 + ESLint no-hardcoded 0 + build limpo. 1 task = 1 commit `[LEELA-FID-EVT-KITS-T*]`, trailers, push. Relatório `outputs/.../FID-EVT-KITS-REPORT.md`; KANBAN/CHECKLIST.

RETORNO: hashes; o que JÁ cumpria S205 (validado) vs construído; mapa decisão→critério-S205; o que ficou dependência de backend; se tocou/criou componente reusável (→ review); gate vivo (evidência); testes/tsc/ESLint. NÃO faça Entrega (próximo/último visual).
