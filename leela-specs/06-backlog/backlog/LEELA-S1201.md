---
id: LEELA-S1201
type: story
epic: E12
epic_name: Landing Pública
onda: 2
surface: landing
moscow: Must
status: backlog
v1: true
tasks_total: 3
tags: [leela, story]
---
# LEELA-S1201 · Página pública de evento (SSR/SEO, seções publicadas, CTA de inscrição, URL+QR)
**Como** atleta anônimo, **quero** abrir a página pública de um evento e ver tudo que preciso para decidir (data, local, modalidades, kits, retirada, FAQ, percurso, patrocinadores, depoimentos), **para** me inscrever com confiança e baixa fricção.

## Critérios de aceite
- Dado um evento publicado, quando abro `{leela-domain}/{eventSlug}`, então vejo o Hero e as seções ativas na ordem publicada, renderizadas no servidor.
- Dado uma seção desativada no painel, quando renderizo, então ela não aparece.
- Dado o Hero, quando clico em "Garantir inscrição", então vou ao checkout preservando parâmetros de atribuição.
- Dado um evento `rascunho`, quando acesso a URL, então recebo 404 público.
- Dado vendas encerradas/esgotado, quando abro, então o CTA fica desabilitado com mensagem e o conteúdo informativo permanece.

## Subtarefas
- [ ] LEELA-S1201-T1 — Rota SSR/ISR do evento + renderizador de seções orientado por configuração
- [ ] LEELA-S1201-T2 — Componentes de seção (Hero, Modalidades, Kits, Retirada, Info/FAQ, Percurso, Patrocinadores, Depoimentos)
- [ ] LEELA-S1201-T3 — Estados públicos do evento (rascunho→404, vendas encerradas, esgotado) + bloco compartilhar/QR

## Links
Épico: [[LEELA-E12-landing]]
