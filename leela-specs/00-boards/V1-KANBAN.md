---

kanban-plugin: board
tags:
  - leela
  - v1
  - kanban

---

> **Board de histórias.** Cada card é uma linha em linguagem de produto: `[E##] Título — o que a pessoa ganha` + estado + link para o detalhe. Hash de commit, teste, lote e review moram no arquivo linkado, nunca no card. Convenção: [[CONVENCAO-BOARDS]] · Visão de épicos: [[BOARD-EPICOS]] · Detalhe verbatim das entregas: [[BOARD-HISTORICO]].
> Estados: ✅ feito · 🔄 em execução · 📋 backlog · 🧊 gelado.

## 📋 Backlog

- [ ] **[E13] App do atleta** — descobrir, inscrever, ingresso com QR e clube no celular 📋 [[LEELA-E13-app-atleta]]
- [ ] **[E08] Afiliados** — influenciador tem link próprio e vê as próprias vendas 📋 [[LEELA-E08-influenciador]]
- [ ] **[E10] Marcas** — gerenciar patrocinadores reutilizáveis num lugar só 📋 [[LEELA-E10-marcas]]
- [ ] **[E11] Analytics** — análise de vendas e público unificada 📋 [[LEELA-E11-analytics]]
- [ ] **[E19] CRM** — conhecer e reter a base de contatos do organizador 📋 [[LEELA-E19-crm]]
- [ ] **[E17] Social no app** — feed, perfil e tema dinâmico por conta 📋 [[LEELA-E17-perfil-social]]
- [ ] **[Plano] Onda 3** — 5 lotes e 22 histórias planejadas (falta o app) 📋 [[ROADMAP-onda3]]
- [ ] **[Higiene] Follow-ups do gate** — pendências datadas que não bloqueiam a próxima onda 📋 [[BOARD-HISTORICO]]


## 🔄 Em execução

- [ ] **[E00] Telas de conta** — login, cadastro, recuperação e configurações 🔄 aguarda review [[LEELA-E00-fundacao-tecnica]]


## ✅ Feito

- [x] **[E00] Fundação técnica** — monorepo, Firebase, login e CI ✅ [[LEELA-E00-fundacao-tecnica]]
- [x] **[E01] Design System** — temas brasa/leela, showroom e telas-base ✅ [[LEELA-E01-design-system]]
- [x] **[E16] Multi-tenant** — isolamento e permissões da plataforma ✅ [[LEELA-E16-plataforma-superadmin]]
- [x] **[E02] Visão geral** — painel de abertura com os números do evento ✅ [[LEELA-E02-visao-geral]]
- [x] **[E03] Operação do evento** — inscritos, balcão, kits e financeiro ✅ [[LEELA-E03-operacao-evento]]
- [x] **[E05] Clubs** — membros, desafios, parcerias e comunicados ✅ [[LEELA-E05-clubs]]
- [x] **[E16] Onboarding de tenant** — cadastro e termos comerciais ✅ [[LEELA-E16-plataforma-superadmin]]
- [x] **[Fidelidade] Telas do evento** — fiéis ao mockup, com gráficos e feed ✅ [[BOARD-HISTORICO]]
- [x] **[E04] Config e vendas** — lotes, preços automáticos, cupons e equipe ✅ [[LEELA-E04-config-vendas]]
- [x] **[E12] Landing e checkout** — descobrir e inscrever em poucos cliques ✅ [[LEELA-E12-landing]]
- [x] **[E09] Financeiro** — saldo, dados bancários e repasse auditado ✅ [[LEELA-E09-financeiro-profissional]]
- [x] **[E07] Estados de sistema** — telas 404, 500 e 403 por papel ✅ [[LEELA-E07-estados-sistema]]
- [x] **[E06] Comunicação** — campanhas, lista, editor e envio ✅ [[LEELA-E06-marketing]]
- [x] **[Transversais] Coleta de analytics, backend do desafio e planos de cobrança** ✅ [[BOARD-HISTORICO]]
- [x] **[Consolidações] DS canônico e dívida técnica** — KpiCard, realtime, flaky resolvido ✅ [[BOARD-HISTORICO]]
- [x] **[Onda 3 · L1] Robustez financeira e legal** — política de vendas, reembolso, capacidade ✅ [[BOARD-HISTORICO]]
- [x] **[Onda 3 · L2] Descoberta web e link-na-bio** — perfil público compartilhável ✅ [[LEELA-E17-perfil-social]]
- [x] **[E18] Assessorias parceiras** — clube parceiro com desconto exclusivo ✅ [[LEELA-E18-assessorias-parceiras]]
- [x] **[Onda 3 · L4] Scheduler de campanhas** — automações por gatilho ✅ [[LEELA-E06-marketing]]
- [x] **[R1] Seed de demonstração** — lotes vigentes e hero mínimo do evento ✅ [[BOARD-HISTORICO]]
- [x] **[R2] Rules de clubes** — segurança própria e limite no aceite público ✅ [[BOARD-HISTORICO]]
- [x] **[R3] Miudezas do painel** — etiqueta "Automática" e nome no reembolso ✅ [[BOARD-HISTORICO]]
- [x] **[R4] Testes E2E** — jornada de aceite de assessoria e gatilhos ✅ [[BOARD-HISTORICO]]
- [x] **[R5] Upload real de imagem** — foto, capa e avatar direto do arquivo ✅ [[BOARD-HISTORICO]]
- [x] **[R6] Gateway Asaas em sandbox** — cobrança PIX, cartão e boleto de ponta a ponta ✅ [[BOARD-HISTORICO]]
- [x] **[R7] Página do evento** — sem linhas entre dobras, ritmo único e hero em blur ✅ [[BOARD-HISTORICO]]
- [x] **[R8] Dados de demonstração** — clubes da Marina e sistema web preenchidos ✅ [[BOARD-HISTORICO]]
- [x] **[R9] Spec da revisão UX** — 13 itens do Vitor virados em histórias prontas ✅ [[03-stories]]
- [x] **[R10] Ver página pública** — botão do evento abre a landing na URL certa (env), rascunho desabilitado ✅ [[BOARD-HISTORICO]]
- [x] **[R9-A] Conformidade de UI** — contraste por estado, divisórias iguais, foto só por upload, filtros no padrão do DS, sub-nav com rolagem própria e header do evento sem busca ✅ [[BOARD-HISTORICO]]
- [x] **[R9-A] Calendar no DS** — date-picker e seletor de intervalo shadcn para o filtro temporal ✅ [[BOARD-HISTORICO]]
- [x] **[R9-E] Afiliados, marcas e e-mail (completo)** — influenciador com link rastreado na venda (aba Afiliados + aba Clubs dos dois lados + aceite por e-mail), patrocinador reutilizável com logo 1:1, e-mail transacional pronto para ligar a chave ✅ [[BOARD-HISTORICO]]
- [x] **[UIAF] Conformidade das telas de afiliados** — seleção de patrocinador salvo passa a usar o Combobox do DS (shadcn §8) e as telas de influenciador da aba Clubs ganham testes de integração ✅ [[BOARD-HISTORICO]]
- [x] **[R12] Landing com identidade** — tipografia, bordas e ícones do DS, evento com modalidade, página-calendário do organizador e imagens mockadas em todo slot ✅ [[BOARD-HISTORICO]]
- [x] **[R13] Checkout com identidade** — etapas visíveis, formulário na vertical e kits com hierarquia e imagem ✅ [[BOARD-HISTORICO]]
- [x] **[R9-B] Análise financeira unificada** — filtro por evento na Análise, Análise vira a porta única (Analytics some) e Repasses declara o saldo consolidado de todos os eventos ✅ [[BOARD-HISTORICO]]
- [x] **[Decisões] Rodada de decisões do Vitor** — ratificadas e propagadas aos épicos ✅ [[BOARD-HISTORICO]]
- [x] **[Docs] Terminologia única** — Onda, Épico, História e Tarefa ✅ [[MODELO-ROADMAP]]


## 🧊 Fora da V1

- [ ] **[E14] Integrações de treino** — importar corrida do Strava e afins 🧊
- [ ] **[E15] Creator Studio** — criador monta conteúdo e produtos (MyDose) 🧊
- [ ] **[E13] Jornada heroica** — medalhas, rotina diária e sync 🧊 [[LEELA-E13-app-atleta]]
- [ ] **[Recortes] Pós-V1** — desafio anti-streak, mensalidade recorrente, campanhas avançadas 🧊




%% kanban:settings
```
{"kanban-plugin":"board","list-collapse":[false,false,true,false]}
```
%%
