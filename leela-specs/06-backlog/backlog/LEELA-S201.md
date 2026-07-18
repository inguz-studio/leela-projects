---
id: LEELA-S201
type: story
epic: E03
epic_name: Operação do Evento
onda: 1
surface: painel
moscow: Must
status: backlog
v1: true
tasks_total: 3
tags: [leela, story]
---
# LEELA-S201 · Criar e publicar evento
**Como** Organizador de Evento, **quero** criar um evento com nome, data, local, modalidades e preços e publicar uma página compartilhável, **para** ter minha página no ar em menos de 15 minutos sem suporte técnico.

## Critérios de aceite
- Dado o formulário, quando preencho os campos e envio, então o evento é criado como `rascunho`.
- Dado um rascunho, quando publico, então o sistema gera URL pública (`beh.ro/{slug}`) + QR (RN-201) e o status vira `publicado`.
- Dado um evento com ≥1 venda, quando tento editar preço, então o campo está bloqueado com aviso (RN-200).
- Dado campo obrigatório faltando, quando envio, então vejo validação inline e não avanço.

## Subtarefas
- [ ] LEELA-S201-T1 — Tela "Novo evento" (formulário + upload capa/regulamento + pré-visualização)
- [ ] LEELA-S201-T2 — Function `criarEvento` + `publicarEvento` (slug, URL, QR)
- [ ] LEELA-S201-T3 — Bloqueio de edição de preço após 1ª venda (RN-200)

## Links
Épico: [[LEELA-E03-operacao-evento]]
