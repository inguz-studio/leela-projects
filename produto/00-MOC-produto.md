---
tags: [leela, produto, moc, hub]
fontes:
  - "[[ROADMAP]]"
  - "[[PARECER-CONSELHO]]"
  - "[[RELATORIO-DISCOVERY]]"
atualizado: 2026-07-05
---

# 00 · MOC — produto Leela

Hub do vault de produto. Cada nota abaixo é síntese executiva com link para a fonte normativa em `leela-specs/`. A regra da casa: **este vault não duplica spec**; quem precisa do detalhe segue o wikilink até a verdade técnica. Afirmação sem fonte nos specs está marcada `#hipótese`.

## Mapa das áreas

| Nota | O que responde |
|---|---|
| [[01-tese-de-negocio]] | Por que o Leela existe, qual é o moat, como ganha dinheiro, quando matar a tese |
| [[organizador-produtor]] | Quem paga: o produtor de eventos (e a variante coordenador de assessoria) |
| [[atleta]] | Quem usa: o atleta comum, transacional hoje, heroico depois |
| [[super-admin]] | Quem opera a plataforma: o admin master do marketplace multi-tenant |
| [[03-jobs-to-be-done]] | O que cada persona contrata o produto para fazer, ligado aos épicos |
| [[04-user-stories]] | Índice navegável das user stories, por épico de origem |
| [[05-benchmarks]] | O que o discovery mapeou do mercado (7 pilares, ~130 fontes) e onde ler cada um |
| [[06-roadmap-visao]] | As ondas de execução em nível executivo: V1 vender, V1.5 engajar, o que vem depois |
| [[07-visao-de-futuro]] | Horizontes H2-H4: Creator Studio, Leela+, rede coordinator-first |
| [[08-linhas-narrativas]] | As linhas editoriais derivadas da tese, prontas para a agência de conteúdo |
| [[09-pautas/README]] | Estrutura de pautas + brief de handoff para a nyx-social |

## Entradas diretas na verdade técnica

- **Espinha do plano:** [[ROADMAP]] · [[V1-PRODUTOR-web]] · [[IMPLEMENTATION-PLAN]] · [[KICKOFF-BUILD]]
- **Discovery:** [[RELATORIO-DISCOVERY]] · [[PARECER-CONSELHO]] · [[ANALISE-ROADMAP-v2]] · [[NUVEM-FUNCIONALIDADES]]
- **Decisões vivas:** [[DECISOES-ABERTAS]] · [[decisoes-escopo-2026-07-04]] · [[proposta-revisao-escopo-2026-07-04]]
- **Arquitetura:** [[ADR-multitenancy]] · [[ADR-stack]] · [[ADR-pedido-em-grupo]] · [[modelo-de-dados-firestore]]
- **Execução:** [[V1-KANBAN]] · [[V1-CHECKLIST]]

## Como manter este vault

1. Nota nova entra na tabela acima e linka de volta para cá.
2. Frontmatter obrigatório: `tags`, `fontes`, `atualizado`.
3. Síntese, nunca cópia: se um trecho de spec parecer necessário aqui, o certo é linkar.
4. Decisão nova do Vitor (registrada em [[DECISOES-ABERTAS]] ou nas notas de decisão) atualiza a nota executiva correspondente.
