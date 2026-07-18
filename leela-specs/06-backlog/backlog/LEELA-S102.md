---
id: LEELA-S102
type: story
epic: E05
epic_name: Módulo Clubs
onda: 1
surface: painel
moscow: Must
status: backlog
v1: true
tasks_total: 2
tags: [leela, story]
---
# LEELA-S102 · Dashboard do clube
**Como** Coordenador de Assessoria, **quero** um dashboard de visão geral ao entrar no clube, **para** entender a saúde da comunidade sem abrir cada seção.

## Critérios de aceite
- Topo carrega → vejo 4 KPIs: membros ativos, desafios ativos, conversão em eventos, receita de parcerias.
- Header 96px → avatar, nome + badge categoria, metadados e código 8A3K9 copiável (RN-101).
- Clico no copy do código → toast "Código de convite copiado" (sem navegação).
- Seção "Novos membros" → tabela densa (§2.5) com popover (Ver perfil / Dar boas-vindas / Promover Admin).
- Clico "Gerenciar →" em Parcerias → navego para Parcerias.
- Sub-nav do clube → tab Overview ativa (underline Brasa 2px + contador pill).

## Subtarefas
- [ ] LEELA-S102-T1 — Shell do contexto de clube (layout + header 96px + sub-nav 6 tabs + breadcrumb)
- [ ] LEELA-S102-T2 — Conteúdo do Overview (4 KPIs + atividade + parcerias em destaque + tabela de novos membros)

## Links
Épico: [[LEELA-E05-clubs]]
