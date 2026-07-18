# Definition of Done · Leela (fase de código)

> Consolida `be-hero-documentacao/be-hero-docs/definition-of-done.md` adaptado da prototipagem para a fase de desenvolvimento real (Next.js + Firebase). Toda task só fecha com o DoD do seu tipo satisfeito. **"Done" nunca é parcial.**

---

## DoD · Task (padrão, toda task herda)

- [ ] Todos os critérios de aceite (Given/When/Then) da task passam.
- [ ] Testes escritos e verdes no nível apropriado (ver `estrategia-testes.md`).
- [ ] Comportamento bate com a tela de referência do protótipo e com `SPEC-02-comportamentos.md`.
- [ ] Sem regressão em código adjacente.
- [ ] Lint + type-check limpos; sem `any` não justificado.
- [ ] Sem novo erro no Sentry ao exercitar o fluxo.
- [ ] Copy exata do glossário (`HANDOFF-07`); nomenclatura "kit" nunca "tier" (RN-216).
- [ ] Code review aprovado (ou revisão automatizada equivalente).

## DoD · Componente (design system)

- [ ] Usa tokens do `packages/design-system` — zero valor hardcoded (cor, spacing, radius, tipo).
- [ ] Cobre todas as variantes e estados (default/hover/pressed/disabled/focus/invalid conforme o componente).
- [ ] Flat por padrão (§2.16) — sem borda decorativa; exceções só as permitidas (input, divider, card selecionado, upload dashed, card crítico).
- [ ] Acessível: contraste WCAG AA, navegação por teclado, foco visível, ARIA quando aplicável.
- [ ] Documentado (props, variantes, exemplos) — story/exemplo no catálogo.
- [ ] Testado isoladamente (render + interações principais).

## DoD · Tela/rota

- [ ] Shell padrão (sidebar 8 itens, breadcrumb, header 96px §2.1) quando aplicável.
- [ ] Sub-nav §2.14 (underline Brasa 2px na ativa + contador pill) quando aplicável.
- [ ] Interativa, não estática (§2.12): navegação, toggles, filtros funcionais.
- [ ] Seletor/filtro/calendário abre um painel DO DS (Combobox/Popover/Calendar), não a caixa do SO — `<select>` nativo só em formulário simples de baixa cardinalidade (governança §8 · S-R9-05).
- [ ] Estado vazio em toda lista filtrável + contador "mostrando X de Y".
- [ ] Estados de carregando (skeleton, nunca spinner solto em lista) e erro cobertos.
- [ ] Ações destrutivas com `ConfirmModal` + preview de consequências (§2.15).
- [ ] Modais com 4 vias de fechamento (cancelar / X / overlay / Esc).
- [ ] Paginação em listas densas (ex.: inscritos ≥ 50).
- [ ] Feedback via Toast em toda ação de escrita.

## DoD · API / Cloud Function

- [ ] Validação de input no servidor (nunca confiar no cliente).
- [ ] Security Rules / autorização por papel (custom claims) cobrindo a operação.
- [ ] Agregados ∑ atualizados de forma idempotente (reprocessar não duplica).
- [ ] Webhooks (pagamento) idempotentes e assinados/verificados.
- [ ] Erros observáveis no Sentry com contexto (sem dado sensível).

## DoD · Épico

- [ ] Todas as stories Must do épico estão Done.
- [ ] Fluxo navegável ponta a ponta (do mapa de navegação / fluxos-de-uso).
- [ ] Métricas de sucesso do épico instrumentadas.
- [ ] Documentação atualizada (spec do épico reflete o construído).
- [ ] Demonstrável sem explicação verbal.

## Conformidade transversal (sempre)

- [ ] LGPD: ações irreversíveis com disclaimer; export de dados de membro por 90 dias após deleção (RN-144).
- [ ] Segurança: sem segredo no cliente; sem `localStorage` para estado de domínio; regras de acesso testadas.
- [ ] Design tokens respeitados; tom de voz aplicado (ver `tom-de-voz` — voz do coordenador, não institucional).

---

*"Done" é binário. Se um item acima não está marcado, a task não fechou.*
