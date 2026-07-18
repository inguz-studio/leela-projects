---
id: LEELA-S1205
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
# LEELA-S1205 · SEO técnico (metadata dinâmica, OpenGraph, sitemap, robots, JSON-LD)
**Como** organizador/afiliado, **quero** que as páginas públicas sejam bem indexadas e tenham preview rico ao compartilhar, **para** maximizar descoberta e conversão.

## Critérios de aceite
- Dado uma página de evento, quando o buscador/rede a lê, então há `<title>`, meta descrição, canonical e OpenGraph/Twitter com og:image do evento.
- Dado um clube `indexavel`, quando gero o sitemap, então ele aparece; `publica`/`privada` não aparecem / `noindex`.
- Dado `/sitemap.xml` e `/robots.txt`, quando acesso, então listam eventos publicados e clubes indexáveis e apontam o sitemap.
- Dado uma página de evento, quando valido, então há JSON-LD `Event` com data, local e ofertas.

## Subtarefas
- [ ] LEELA-S1205-T1 — `generateMetadata` dinâmica + OpenGraph/Twitter + JSON-LD Event
- [ ] LEELA-S1205-T2 — `sitemap.ts` + `robots.ts` (eventos publicados + clubes indexáveis)

## Links
Épico: [[LEELA-E12-landing]]
