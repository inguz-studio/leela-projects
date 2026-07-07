# Enriched brief — FID-EVT sub-lote 2: INSCRITOS (ancorado no JOB, não no mockup)

> Trace: leela-build-2d6ee98d · Banner: LEELA-FID-EVT · Modelo: Opus · Alvo: sf-frontend-engineer (software-forge)

## JOB — alvo PRIMÁRIO (o mockup é aparência; isto é o que serve)
- **Persona:** Organizador de Evento (mock canônico: Marina Castelo). 
- **JTBD (story S203):** "ver e filtrar a lista de inscritos com kit e chip, **para acompanhar o funil e gerenciar a operação em tempo real**."
- **Dor central declarada (personas.md):** "**inadimplência invisível — não sei quem pagou sem checar manualmente**" + "sem visibilidade de funil — não sei onde os atletas abandonam". O que mais serve esse job pesa mais que fidelidade de pixel.
- **Critérios de aceite S203 (Given/When/Then = o spec primário):**
  1. 453 inscritos → tabela densa (§2.5) ~18 linhas/página + paginação obrigatória com contador "mostrando X de Y".
  2. 4 tabs (Geral, **Pagamento**, Comunicação, Histórico) todas no DOM (§2.7), alternam sem recarregar.
  3. Coluna de kit → badge de kit (RN-202); `chipNumero` vazio até a entrega (RN-203).
  4. Busca/filtros sem correspondência → EmptyState.
  5. Clique numa linha → slide-in de detalhe (status RN-204).

## PASSO 1 — VALIDAR o que já existe (reuso-first; a auditoria foi só estado estático)
A tela `apps/painel/src/routes/eventos/inscritos/*` já existe (S203-T2 feito; UX-DADOS T5 migrou o hook p/ useQuery). ANTES de construir, valide AO VIVO (preview :5273, evento `meia-floripa-2026`, aba Inscritos) contra os 5 critérios: as 4 tabs existem e alternam? o slide-in abre no clique (`InscritoSlideIn.tsx` existe)? a paginação mostra "X de Y" com ~18/pág? Documente o que JÁ CUMPRE (não reconstruir) vs o que falta. A auditoria marcou slide-in e tabs como "talvez já existam" — confirme.

## PASSO 2 — Preencher as lacunas, priorizadas pelo JOB
Ordem por quanto serve a dor de inadimplência + funil:
1. **Visibilidade de pagamento (a dor #1):** garantir que o Organizador vê quem pagou/quem deve SEM checar manual — pela aba Pagamento e/ou coluna de valor/status. O mockup `Inscritos do Evento.html` mostra coluna VALOR + banner "N inscrições com pagamento pendente >72h". Isso serve o JTBD diretamente → alta prioridade. (Se conflitar com a S203, a S203 vence; o banner/coluna são adições que servem o job, não substituem o spec.)
2. **Gerenciar a operação:** seleção em massa (checkbox por linha + "selecionar todos") + barra de ação (Enviar mensagem / Exportar) — serve "gerenciar a operação em tempo real".
3. **Colunas fiéis ao job:** avatar/email (identificar), check-in/status, timestamp. Reusar DS `Table`, `Badge`, `Avatar`, `Pagination`, `Checkbox` (grep antes; documentar no showroom se criar padrão novo).
4. Fechar quaisquer dos 5 critérios S203 ainda abertos (paginação "X de Y", 4 tabs, EmptyState, slide-in).

## DIRETRIZES (Vitor, permanentes)
- **JOB primeiro, mockup como aparência.** Cada decisão traça a um critério S203 ou à dor do Organizador. Divergiu do mockup? a story vence.
- **Reuso-first:** grep antes de escrever; reusar DS, o hook `useQuery` de inscritos já migrado, `listarInscritos` (paginação por cursor provada — NÃO reescrever), tipos do core. Documentar no showroom qualquer componente/padrão novo.
- Autoridade de uso: `~/.claude/skills/harness/references/design-principles.md` (filtros como seleção; tabela densa; ação por linha em coluna final; seleção em massa via checkbox — tudo já no guia).

## GATE (provar ao vivo)
Screenshot 1440×900 da aba Inscritos viva vs `Inscritos do Evento.html`: os 5 critérios S203 cumpridos + visibilidade de pagamento presente. Evidência em `outputs/leela-build-2d6ee98d/fidelidade-eventos/pass-inscritos-*`. adr-conformance: usa `useQuery` (não fetch cru) e reusa `listarInscritos`. Suíte em blocos + tsc 0 + ESLint no-hardcoded 0 + build limpo. 1 task = 1 commit `[LEELA-FID-EVT-INS-T*]`, trailers, push por aterrissagem. Review antagonista antes de eu (maestro) fechar. `functions/src` read-only.

RETORNO: hashes, o que JÁ existia (validado) vs construído, mapa decisão→critério-S203/dor, resultado do gate vivo (evidência), reuso vs novo, adr-conformance, testes/tsc/ESLint. NÃO faça outras telas (Hub/Financeiro/Kits/Entrega).
