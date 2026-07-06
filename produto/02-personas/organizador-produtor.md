---
tags: [leela, produto, persona, organizador, produtor, coordenador]
fontes:
  - "[[be-hero-documentacao/be-hero-docs/personas|personas (Bíblia Be Hero)]]"
  - "[[PARECER-CONSELHO]]"
  - "[[V1-PRODUTOR-web]]"
  - "[[ADR-multitenancy]]"
atualizado: 2026-07-05
---

# Persona · organizador / produtor de eventos

Persona prioritária da V1 e dona do painel web. No modelo multi-tenant é o `tenant_owner`: dono da própria base, eventos, tickets e central de negócio ([[ADR-multitenancy]]). É também o canal de aquisição de atletas da plataforma ([[V1-PRODUTOR-web]]).

## Perfil

Produtor de evento esportivo mid-market, 30-45 anos. Organiza 2 a 10 eventos por ano (corrida de rua, triathlon, wellness), fatura R$ 80K-800K por evento. Pessoa física (treinador que virou produtor) ou pequena empresa. Usa Ticket Sports ou Sympla e sente que essas plataformas foram feitas para as grandes produtoras. Mock canônico: Marina Castelo (Castelo Produções, Meia Floripa 2026). Fonte: [[be-hero-documentacao/be-hero-docs/personas|personas (Bíblia Be Hero)]].

**Dor central (verbatim do discovery):** "Eu sei organizar um evento. O que me trava é a tecnologia, a inadimplência e a logística de kit."

## Dores

- Inadimplência invisível: não sabe quem pagou sem checar manualmente.
- Promotores que trazem venda mas são impossíveis de rastrear sem planilha.
- Lotes virados manualmente de madrugada quando esgotam.
- Kit errado na entrega por coleta manual de tamanho.
- Sem visibilidade de funil; comunicação fragmentada entre WhatsApp, e-mail e Instagram.
- Relatório de patrocinador feito no Excel.

## Ganhos que ele compra

Dormir tranquilo na semana do evento. Dados na mão na reunião com patrocinador. Vendas em tempo real sem exportar planilha. 100% do kit certo na entrega. Parecer tão profissional quanto um evento de São Paulo. Métricas de sucesso definidas no discovery: primeiro evento publicado em menos de 1 hora, 70%+ repetem na edição seguinte, NPS ≥ 50.

## Variante: coordenador de assessoria

O coordenador (dono/treinador de assessoria, 50-200 alunos, mock Felipe Martins do Corrida Perfeita Sul) é a persona primária do módulo Clubs e o centro do enquadramento coordinator-first da tese. Dor central verbatim: "Gero tráfego qualificado para eventos, mas não capturo valor e engajo meus alunos por WhatsApp e planilha." Ele quer desafios alinhados ao planejamento de treino (papel de game master, mecânica que nenhum concorrente tem, [[02-comunidade-clubs]]), comunicação segmentada e comissão formalizada do tráfego que já gera. O conselho apontou o risco: se desenhar desafio der trabalho, o lado escasso não usa; a mitigação são templates de 1 clique ([[PARECER-CONSELHO]], round 4).

Nota de escopo: com a decisão "sem afiliados na V1" ([[decisoes-escopo-2026-07-04]]), a captura de comissão do coordenador fica adiada junto com o E08; cupom por clube segue vivo.

## O que a V1 entrega para ele

Fluxo ponta a ponta sem intervenção técnica: criar e publicar evento, lotes e percursos, cupons, landing pública vendendo, gestão de inscritos, kits e check-in, comunicação segmentada, dashboard consolidado e solicitação de repasse (E09-slim). Detalhe normativo em [[V1-PRODUTOR-web]] e nos épicos [[LEELA-E03-operacao-evento]], [[LEELA-E04-config-vendas]], [[LEELA-E05-clubs]].

## Relacionadas

[[00-MOC-produto]] · [[01-tese-de-negocio]] · [[03-jobs-to-be-done]] · [[atleta]] · [[super-admin]]
