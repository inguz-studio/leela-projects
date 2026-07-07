# Enriched brief — FID-EVT sub-lote 6 (última visual): ENTREGA / BALCÃO DE CREDENCIAMENTO

> Trace: leela-build-2d6ee98d · Banner: LEELA-FID-EVT · Modelo: Opus · Alvo: sf-frontend-engineer

## JOB — alvo primário
- **Persona:** Organizador / operador de balcão. **JTBD (S204):** "identificar o atleta, entregar o kit, **vincular o chip** e fechar o atendimento num fluxo único, para que a retirada seja rápida e sem erro no dia."
- **É AQUI que o chip é vinculado** (de-para chip↔participante = no credenciamento, RN-203/206/207 — decisão Vitor confirmada). No Geral dos inscritos o chip é read-only; a AÇÃO de vincular vive nesta tela.
- **Critérios S204:** layout 60/40 (atendimento à esquerda, painel operacional à direita) · fluxo 3 passos entregar kit → vincular chip → check-in (retirar kit = presença, RN-205) · `sem_kit` → passo kit pré-concluído · `usaChip=false` → passo chip suprimido (RN-207) · chip já vinculado a outro → confirmação de sobrescrita (RN-206) · estados especiais em galeria separada, nunca empilhados (RN-208).
- **Critérios S208 (QR):** escanear QR (câmera/leitor USB) carrega o inscrito → mesmo fluxo; validação de assinatura server-side; QR de outro evento / já com check-in → estado de erro sem duplicar.

## GAP da auditoria (o alvo visual)
Mockup `Entrega de Kit.html` + estados + `Entrega-Atendimento.html`: hoje falta (1) banner "Entrega ativa · Dia N de M" (data/local/horário); (2) coluna lateral do painel operacional — **Ritmo** (+sparkline), **Alertas do balcão** (estoque/chips/pendência), **Ações rápidas**; (3) barra de atalhos de teclado (⌘K/Enter/Tab/Esc); (4) o checklist de atendimento (8 itens do kit + confirmar entrega + vincular chip) — a auditoria marcou como "talvez exista, só não renderiza sem busca" → **VALIDAR ao vivo antes de reconstruir**.

## PASSO 1 — validar o existente (reuso-first)
`apps/painel/src/routes/eventos/entrega/*` já existe (S204). Rode o preview (`/eventos/meia-floripa-2026/entrega`), identifique um atleta (busca ou seed), e confirme o que JÁ cumpre S204/S208 (fluxo 3 passos, checklist, estados) — a auditoria foi estado estático. Documente JÁ-CUMPRE vs falta.

## PASSO 2 — fechar os gaps visuais
Banner de entrega ativa · coluna lateral do painel operacional (ritmo+sparkline reusando o Sparkline do DS, alertas do balcão, ações rápidas) · barra de atalhos de teclado · garantir o checklist de atendimento renderizado. Densidade/foco na operação (design-principles + L-005).

## DEPENDÊNCIA DE BACKEND (flag honesto)
As AÇÕES de escrita — `registrarEntrega`/`registrarCheckin` (setam kitEntregueEm/checkinEm), vincular chip, validação de QR server-side — são Functions que podem estar entre os ~13 módulos firebase-admin quebrados no emulator. A tela VISUAL (layout, painel, passos, banner, atalhos) é o alvo deste lote; se o botão "confirmar entrega"/"vincular chip" não efetiva no preview por causa do backend, NÃO force — deixe o fluxo visível e anote a dependência (entra no lote de backend consolidado). NÃO inventar sucesso de escrita.

## DIRETRIZES / GATE
JOB primeiro; mockup=aparência; cada decisão traça a S204/S208. Reuso-first (DS Sparkline/Table/Badge/EmptyState, `useQuery`; componente reusável novo → showroom + avisar p/ review). `functions/src` read-only. Autoridade: `design-principles.md`. Gate: screenshot 1440×900 do balcão vivo vs `Entrega de Kit.html` (layout 60/40 + banner + painel operacional + atalhos + checklist). Evidência `outputs/leela-build-2d6ee98d/fidelidade-eventos/entrega-pass-*`. adr-conformance `useQuery`. Suíte em blocos + tsc 0 + ESLint no-hardcoded 0 + build limpo. 1 task = 1 commit `[LEELA-FID-EVT-ENT-T*]`, trailers, push. Relatório `outputs/.../FID-EVT-ENTREGA-REPORT.md`; KANBAN/CHECKLIST.

RETORNO (maestro): hashes; JÁ-cumpria-S204/S208 (validado) vs construído; mapa decisão→critério; o que ficou dependência de backend (escritas/QR); componente reusável? (→ review); gate vivo (evidência); testes/tsc/ESLint. Esta é a ÚLTIMA tela visual — depois é o lote de backend consolidado.
