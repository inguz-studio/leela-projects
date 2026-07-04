# Lote REVIEW-E01-b — re-review antagonista do Design System (pós-FIX-E01)
trace_id: leela-build-2d6ee98d · repo: C:\Users\Vitor Eduardo\Desktop\Vaults\Projetos\LEELA · modelo: Fable 5

## Contexto
O REVIEW-E01 original reprovou packages/design-system com 26 achados (2C/9A/9M/6B; destaques F01–F11
no audit ~/.harness-logs/2026-07-03/audit.jsonl). O lote FIX-E01 alega ter fechado tudo em 8 commits
(16fc9ca, 540d583, 1aa3013, b211255, eff92e5, c1461f4, 3650b7b, 3ee0744) com 489/489 testes e 95
asserts de contraste. Relatório do autor: .nirvana/outputs/leela-build-2d6ee98d/FIX-E01-relatorio.md.

Você é o revisor ANTAGONISTA e não escreveu nada disso. Sua missão é tentar REPROVAR — se não conseguir,
o gate passa. Não confie no relatório do autor: verifique em disco.

## Escopo obrigatório
1. Cada um dos achados F01–F11 + 6 de re-audit: de fato fechado no commit citado? Recalcule contraste
   por conta própria (script independente, não o do autor) nos pares críticos dos 2 temas.
2. Regressões: os fixes quebraram algo? (ThemeProvider precedência, Popover click-outside, Chip teclado,
   renames vulcao nos consumidores, entry ./rn nos 3 formatos).
3. Follow-up 2 do autor: identidade visual — warning.700 e texto escuro no Button primary brasa passam
   AA, mas avalie craft/coerência (Zhuo) e aponte se exige ajuste de design antes do gate.
4. Follow-up 6: Popover reposicionamento sem prova de layout (jsdom). Decida: bloqueia gate ou vira
   item Playwright na Onda 1? Justifique.
5. Varredura antagonista livre: a11y (roles, focus traps, keyboard), tokens hardcoded que o lint não pega,
   §2.16 flat, dark/light nos 2 temas, DoD do épico (leela-specs/definition-of-done.md + epics/LEELA-E01-*).
6. Rodar você mesmo: vitest do pacote, build, build-storybook, turbo type-check lint do pacote,
   lint de tokens. Números reais.

## Regras
- READ-mostly: você NÃO corrige — reprova com lista acionável (sev + arquivo + evidência) ou aprova.
  Exceção permitida: nada. Autor ≠ revisor.
- Sem push. Persistir seu relatório completo em
  .nirvana/outputs/leela-build-2d6ee98d/REVIEW-E01-b-relatorio.md (regra nova do trace: review sempre
  persiste no ato).
- Veredito binário no final: `pass` ou `needs_fixes` + findings {critica,alta,media,baixa}.
