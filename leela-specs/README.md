# Leela · leela-specs · índice e estado

Plano executável por IA (Fable 5) para construir o ecossistema **Leela** — ingressos + clubs + comunicação + desafios gameficados + controle de vendas, em 3 superfícies (Painel web, Landing web, App mobile Expo).

## Como o Fable 5 deve ler

1. `ROADMAP.md` — visão, stack, horizontes, mapa de épicos, ondas de execução.
2. `00-TEMPLATE-spec.md` — o formato de cada spec.
3. `adr/ADR-stack.md` — decisões de stack (Next.js, Firestore, Firebase Auth, Turborepo, pagamento plugável).
4. `modelo-de-dados-firestore.md` — entidades, N:N, agregados por Function, coleções por épico.
5. `definition-of-done.md` + `estrategia-testes.md` — qualidade transversal.
6. `epics/` — na ordem das ondas.

## Épicos (14 · 77 stories · 172 tasks)

| Épico | Superfície | MoSCoW | Stories | Tasks | Onda |
|---|---|---|---|---|---|
| E00 Fundação Técnica | Todas | Must | 4 | 10 | 0 |
| E01 Design System temável | Todas | Must | 4 | 10 | 0 |
| E02 Visão Geral | Painel | Should | 3 | 7 | 1 |
| E03 Operação do Evento | Painel | Must | 8 | 20 | 1 |
| E04 Config & Vendas | Painel | Must | 5 | 19 | 2 |
| E05 Clubs | Painel | Must | 11 | 23 | 1 |
| E06 Marketing Unificado | Painel | Should | 4 | 12 | 3 |
| E07 Estados de Sistema | Todas | Should | 5 | 11 | 3 |
| E08 Influenciador | Painel | Could | 4 | 4 | 5 |
| E09 Financeiro do Profissional | Painel | Should | 4 | 11 | 3 |
| E10 Marcas | Painel | Could | 2 | 2 | 5 |
| E11 Analytics | Painel | Could | 3 | 4 | 5 |
| E12 Landing pública | Landing | Must | 6 | 18 | 2 |
| E13 App do Atleta (Expo) | Mobile | Must | 14 | 21 | 4 |

Ordem de construção: **Onda 0** (E00→E01) → **1** (E05, E03, E02) → **2** (E04, E12) → **3** (E07, E06, E09) → **4** (E13) → **5** (E08, E10, E11).

## Atualizações pós-discovery

- **Comece por aqui (fatia V1):** [[V1-PRODUTOR-web]] — produtor (web) + app simples + super-admin mínimo. É o que o Fable 5 constrói primeiro.
- **Arquitetura:** marketplace **multi-tenant** (ADR-009 · `adr/ADR-multitenancy.md`) — fundacional, nasce no E00.
- **Épicos adicionados** (além dos 14): **E14** Integrações de treino (`TrainingProvider`), **E15** Creator Studio (SaaS estilo MyDose), **E16** Plataforma & Super-Admin, **E17** Perfil social / link-in-bio, **E18** Assessorias parceiras (tração B2B). **Total: 19 épicos.**
- **Modelo do roadmap:** terminologia e hierarquia canônica (Onda → Épico → US → Task) em [[MODELO-ROADMAP]] — reconcilia "Wave/Onda/Épico".
- **Discovery** (benchmarks + validação) em `discovery/` — 7 pilares, relatório, parecer do conselho, nuvem de ~70 features e re-análise de roadmap.

## Referências de design

- **Design System v3** (tema `brasa`, Brasa #FF450C + Exo 2) — base atual das 36 telas do Painel (`../WEB-APPV2 (1)/`). O E01 o entrega como código + o tema `leela` (Oxblood/Lima) como alternativa.
- **Wireframes mobile (Figma, referência):** app Be Hero, fileKey `hsm4VVYLpjyB6faKUX6Ohc` (node `1-4`). Confirmam o escopo do E13 (onboarding, home, evento + ingresso QR, timers de pilar/meditação, comunidade, perfil). Usar como referência, não verdade final.

## Decisões em aberto (não bloqueiam Onda 0/1)

- **Domínio público do Leela** — os mocks usam `be-hero.com.br`/`beh.ro`; trocar pelo domínio Leela quando definido (marcado `{leela-domain}`/TBD nos specs).
- **Gateway de pagamento** (ADR-006) — specs usam a interface `PaymentProvider` + sandbox; escolher fornecedor (Pagar.me/Asaas/Stripe Connect) antes da Onda 2.
- **Identidade visual definitiva** — tema `brasa` é o default; confirmar se `leela` (Oxblood/Lima/Figtree/Syne) vira o tema oficial.
- **RN-320 (4 papéis de equipe)** — definição canônica proposta em E04, validar.
- **`config/system`** e demais coleções por épico — ver seção "Coleções adicionadas" no modelo de dados.

## Rastreabilidade

IDs `LEELA-E##` / `LEELA-S###` / `LEELA-S###-T#` mantêm coluna de-para com o backlog anterior `BH-`. RNs preservadas por número (RN-001…144, 200…217, 300…320, 330…337, etc.).

---

*Plano gerado a partir do corpus de documentação em `../be-hero-documentacao/`. Documento vivo.*
