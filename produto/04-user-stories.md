---
tags: [leela, produto, user-stories, indice]
fontes:
  - "[[ROADMAP]]"
  - "leela-specs/epics/ (15 arquivos LEELA-E00…E16)"
atualizado: 2026-07-05
---

# 04 · User stories — índice navegável

Índice de navegação, não cópia: cada story vive no arquivo do épico de origem, com Given/When/Then e tasks. Contagem em 2026-07-05: **95 stories** em 15 épicos (a contagem histórica "77 stories" antecede as stories greenfield S208-S210, S305-S306, S904, S1206-S1208, S1314-S1316 e o épico E16). Convenção de IDs em [[ROADMAP]] §7.

## E00 · Fundação técnica — [[LEELA-E00-fundacao-tecnica]]

| ID | Story |
|---|---|
| S000-1 | Monorepo e apps scaffolding |
| S000-2 | Backend Firebase (Firestore + Auth + Functions + Emulators) |
| S000-3 | CI/CD e observabilidade |
| S000-4 | Convenções e `PaymentProvider` (interface) |

## E01 · Design system — [[LEELA-E01-design-system]]

| ID | Story |
|---|---|
| S001-1 | Tokens em 3 tiers + temas trocáveis |
| S001-2 | Componentes átomos |
| S001-3 | Moléculas e organismos |
| S001-4 | Governança e catálogo |

## E02 · Visão geral — [[LEELA-E02-visao-geral]]

| ID | Story |
|---|---|
| S600 | Rota de visão geral, shell e KPIs agregados |
| S601 | Eventos ativos e últimas inscrições |
| S602 | Coluna lateral: próximo evento, ações rápidas e alertas |

## E03 · Operação do evento — [[LEELA-E03-operacao-evento]]

| ID | Story |
|---|---|
| S200 | Hub de eventos |
| S201 | Criar e publicar evento |
| S202 | Overview do evento (shell + dashboard) |
| S203 | Gestão de inscritos |
| S204 | Balcão de entrega e check-in |
| S205 | Cadastro de kits e catálogo de itens |
| S206 | Editar kit em tela cheia |
| S207 | Financeiro do evento |
| S208 | Identificação e check-in por QR no balcão |
| S209 | Persistência de tamanho por inscrito + coleta no checkout |
| S210 | Aprovisionamento de kit (encomenda → estoque) |

## E04 · Config e vendas — [[LEELA-E04-config-vendas]]

| ID | Story |
|---|---|
| S300 | Página de vendas (seções, lotes, percursos, cupons, SEO) |
| S301 | Promotores e programa de afiliação — **fora da V1** ([[decisoes-escopo-2026-07-04]]) |
| S302 | Financeiro do evento com repasses de afiliados |
| S303 | Comunicação do evento |
| S304 | Configurações e equipe do evento (4 papéis) |
| S305 | Política de reembolso e transferência |
| S306 | Exigências de saúde e versionamento de regulamento |

## E05 · Clubs — [[LEELA-E05-clubs]]

| ID | Story |
|---|---|
| S101 | Hub de clubes |
| S102 | Dashboard do clube |
| S103 | Gestão de membros |
| S104 | Convidar membros |
| S105 | Listar e gerir desafios |
| S106 | Criar/editar desafio |
| S107 | Gestão de parcerias |
| S108 | Listar comunicados |
| S109 | Criar/editar comunicado |
| S110 | Configurações do clube |
| S111 | Sub-afiliação de membros (placeholder) |

## E06 · Marketing — [[LEELA-E06-marketing]]

| ID | Story |
|---|---|
| S400 | Parceiros de marketing |
| S401 | Campanhas |
| S402 | Automações |
| S403 | Patch retroativo de sub-nav (9 → 8 tabs) |

## E07 · Estados de sistema — [[LEELA-E07-estados-sistema]]

| ID | Story |
|---|---|
| S500 | Página não encontrada (404) |
| S501 | Sem permissão (403) |
| S502 | Erro interno (500) |
| S503 | Offline |
| S504 | Manutenção |

## E08 · Influenciador — [[LEELA-E08-influenciador]] · **épico adiado** ([[decisoes-escopo-2026-07-04]])

| ID | Story |
|---|---|
| S701 | Hub do influenciador |
| S702 | Eventos disponíveis para divulgar |
| S703 | Minhas conversões |
| S704 | Financeiro do influenciador |

## E09 · Financeiro do profissional — [[LEELA-E09-financeiro-profissional]]

| ID | Story |
|---|---|
| S900 | Painel financeiro consolidado |
| S901 | Agregação financeira por Cloud Function |
| S902 | Split de afiliação e saldo consolidado |
| S903 | Últimas transações + export CSV (LGPD 90 dias) |
| S904 | Máquina de estados de reembolso + estorno + clawback (RN-346) |

Na V1 entra o recorte E09-slim de repasses (spec vinculante do Vitor em [[decisoes-escopo-2026-07-04]]), não o épico inteiro.

## E10 · Marcas — [[LEELA-E10-marcas]]

| ID | Story |
|---|---|
| S811 | Gestão de marcas e patrocinadores |
| S812 | Ativações da marca |

## E11 · Analytics — [[LEELA-E11-analytics]]

| ID | Story |
|---|---|
| S821 | Dashboard analítico consolidado |
| S822 | Conversão e afiliação |
| S823 | Comunidade e retenção |

Rollup de coleta aprovado para entrar cedo (histórico não é backfillável, [[decisoes-escopo-2026-07-04]]).

## E12 · Landing pública — [[LEELA-E12-landing]]

| ID | Story |
|---|---|
| S1200 | Superfície landing SSR/ISR + shell público |
| S1201 | Página pública de evento (SSR/SEO, CTA, URL+QR) |
| S1202 | Página pública de clube |
| S1203 | Checkout do atleta anônimo (stepper 5 etapas + PaymentProvider) |
| S1204 | Atribuição via link master/cupom — **link de afiliado fora da V1**; cupom fica |
| S1205 | SEO técnico (metadata, OpenGraph, sitemap, JSON-LD) |
| S1206 | Ingresso digital + e-mail transacional + PDF |
| S1207 | Aceite de regulamento + contato de emergência |
| S1208 | Portal público do organizador |

## E13 · App do atleta — [[LEELA-E13-app-atleta]]

| ID | Story |
|---|---|
| S1300 | Setup do app Expo + pipeline EAS |
| S1301 | Onboarding + autenticação (Apple obrigatório + Google) |
| S1302 | Shell mobile: tab bar 5 itens |
| S1303 | Início — dashboard heroico |
| S1304 | Descoberta de eventos (feed + busca) |
| S1305 | Página do evento |
| S1306 | Inscrição / checkout mobile |
| S1307 | Arena — registrar ações dos 3 pilares |
| S1308 | Progresso de desafio + participação |
| S1309 | Medalhas e recompensas — **cortada** (sem medalhas, [[decisoes-escopo-2026-07-04]]) |
| S1310 | Clubs — entrar no clube + página do clube |
| S1311 | Comunidade — feed social dentro do clube |
| S1312 | Comunicados recebidos + push (FCM) |
| S1313 | Perfil / identidade do atleta |
| S1314 | QR do ingresso e estado de check-in |
| S1315 | Solicitar reembolso / cancelar inscrição |
| S1316 | Transferir titularidade / trocar ingresso |

## E16 · Plataforma e super-admin — [[LEELA-E16-plataforma-superadmin]]

| ID | Story |
|---|---|
| S1600 | Modelo multi-tenant, claims e isolamento (fundacional) |
| S1601 | Onboarding e lifecycle do tenant |
| S1602 | Termos comerciais por tenant (`commercialTerms`) |
| S1603 | Recorrência da comunidade (pós-V1) |
| S1604 | Recorrência SaaS (pós-V1) |
| S1605 | Visão macro do super-admin (V1-slim parcial) |

## Épicos sem arquivo de stories

E14 (integrações de treino, `TrainingProvider`) está formalizado em [[ANALISE-ROADMAP-v2]]; E15 (Creator Studio) é visão sem spec ([[07-visao-de-futuro]]). Nenhum dos dois tem arquivo em `epics/` hoje.

## Relacionadas

[[00-MOC-produto]] · [[03-jobs-to-be-done]] · [[06-roadmap-visao]]
