---
id: LEELA-S300
type: story
epic: E04
epic_name: Configuração e Vendas do Evento
onda: 2
surface: painel
moscow: Must
status: backlog
v1: true
tasks_total: 6
tags: [leela, story]
---
# LEELA-S300 · Página de vendas (seções, lotes, percursos, cupons, SEO)
**Como** Organizador de Evento, **quero** configurar a página pública de vendas do evento (seções web/app, lotes, percursos, cupons, SEO), **para** maximizar a conversão de visitante em inscrito.

## Critérios de aceite
- Dado o editor, quando abro, então vejo as seções agrupadas por canal (Essenciais, Só landing, Sistema/Checkout travada).
- Dado uma seção não travada, quando alterno o toggle, então ativa/desativa; Checkout permanece sempre travada.
- Dado um lote, quando configuro virada por data ou quantidade, então vira automaticamente pelo critério que ocorrer primeiro (RN-300).
- Dado um percurso, quando defino o preço, então cada percurso tem preço independente (RN-301) e bloqueado após a 1ª venda (RN-200).
- Dado um cupom, quando crio, então fica disponível no checkout; código duplicado é rejeitado.
- Dado o card SEO, quando edito, então salvo; URL amigável read-only com `{DOMINIO_LEELA}`.
- Dado a página, quando publico/despublico, então vejo estado e Toast; despublicar via ConfirmModal (§2.15).

## Subtarefas
- [ ] LEELA-S300-T1 — Modelo `paginaVendas` + `lotes` + `cupons` + tipos + Rules + seed
- [ ] LEELA-S300-T2 — Function de virada de lote (RN-300) + preço vigente por percurso (RN-301)
- [ ] LEELA-S300-T3 — Tela editor de conteúdo da página (seções web/app + SEO + publicar)
- [ ] LEELA-S300-T4 — Modal de lote (virada por data/quantidade, preços por percurso)
- [ ] LEELA-S300-T5 — Modal de cupom (código, tipo, valor, teto, validade)
- [ ] LEELA-S300-T6 — Modal de percurso (preço independente por percurso)

## Links
Épico: [[LEELA-E04-config-vendas]]
