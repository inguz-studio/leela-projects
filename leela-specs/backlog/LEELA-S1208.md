---
id: LEELA-S1208
type: story
epic: E12
epic_name: Landing Pública
onda: 2
surface: landing
moscow: Should
status: backlog
v1: false
tasks_total: 3
tags: [leela, story]
---
# LEELA-S1208 · Portal público do organizador (hub de eventos, agenda, fotos, blog, patrocinadores, newsletter)
**Como** Organizador de Evento, **quero** um portal público sob a plataforma com blocos configuráveis, **para** reunir meus eventos, agenda, fotos, blog, patrocinadores e captar newsletter num único endereço público, sem depender de domínio próprio.

> Greenfield. Precisa de rodada de design antes do plano de execução (sem HTML/Figma de referência). O escopo substitui a leitura anterior de "white-label / domínio próprio": é um portal público hospedado sob a plataforma (`tenants/{id}/portal`), não um domínio custom.

## Critérios de aceite
- Dado o tenant, quando configura o portal, então ativa e ordena blocos (`links de fotos`, `eventos + agenda`, `blog`, `patrocinadores`, `newsletter`) em `tenants/{id}/portal`; blocos desativados não aparecem (RN-152).
- Dado o portal, quando um visitante acessa, então vê o hub público com os eventos do organizador e a agenda, renderizado por SSR/ISR (RN-150).
- Dado que o portal não é domínio próprio nem white-label, quando publicado, então vive sob a plataforma (`tenants/{id}/portal`), sem custom domain (RN-150).
- Dado o portal não publicado, quando um visitante tenta acessar, então o gate por `status`/`visibilidade` resulta em 404 (reusa a fundação de leitura pública de S1200).
- Dado o campo de newsletter, quando um visitante submete o e-mail, então grava lead sob o tenant com registro de consentimento LGPD e finalidade declarada (RN-151).
- Dado o tema, quando qualquer bloco renderiza, então aplica `theme="leela"` do DS sem redefinir token localmente.

## Subtarefas
- [ ] LEELA-S1208-T1 — Modelo `tenants/{id}/portal` (blocos configuráveis, ordem, publicação) + leitor público SSR/ISR com gate de publicação (reusa S1200-T2)
- [ ] LEELA-S1208-T2 — Blocos do portal: hub de eventos + agenda, links de fotos, blog, patrocinadores
- [ ] LEELA-S1208-T3 — Captura de newsletter (form + `tenants/{id}/newsletterLeads` + consentimento LGPD)

## Links
Épico: [[LEELA-E12-landing]]
