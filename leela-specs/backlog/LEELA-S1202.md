---
id: LEELA-S1202
type: story
epic: E12
epic_name: Landing Pública
onda: 2
surface: landing
moscow: Must
status: backlog
v1: true
tasks_total: 2
tags: [leela, story]
---
# LEELA-S1202 · Página pública de clube (visibilidade, desafios públicos, eventos afiliados, CTA)
**Como** atleta anônimo, **quero** abrir a página pública de um clube e entender o que ele é, seus desafios públicos e eventos que promove, **para** decidir entrar (via app) ou me inscrever num evento associado.

## Critérios de aceite
- Dado um clube `publica`/`indexavel`, quando abro `{leela-domain}/c/{clubSlug}`, então vejo nome, bio, KPIs públicos, desafios públicos e eventos que o clube promove.
- Dado um clube `privada`, quando acesso a URL, então recebo 404 público.
- Dado desafios do clube, quando renderizo, então só os de `visibilidade == 'publico'` aparecem.
- Dado clube com aprovação manual, quando vejo o CTA, então ele informa que a entrada aguarda liberação e direciona ao app.
- Dado um evento afiliado, quando clico, então vou à página pública do evento preservando a atribuição do clube.

## Subtarefas
- [ ] LEELA-S1202-T1 — Rota SSR/ISR do clube com gate de visibilidade (RN-140)
- [ ] LEELA-S1202-T2 — Conteúdo da página do clube (hero, bio, KPIs, desafios públicos, eventos afiliados, CTA)

## Links
Épico: [[LEELA-E12-landing]]
