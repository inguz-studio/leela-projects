---
tags: [leela, v1, produtor, spec, roadmap, moc]
aliases: [V1 Produtor, MVP Produtor, Fatia V1]
---

# Leela · V1 — Produtor (web) + app simples

> A primeira fatia a construir. Alvo real: um **sócio produtor de eventos** precisa do sistema rodando ponta a ponta na web (tickets, clubs, vendas, landing, comunicação, dashboard) aderente às 36 telas do protótipo, mais a **versão mais simples do app** do atleta. Desafio anti-streak **fora** desta fatia. Deriva de [[ROADMAP]], [[NUVEM-FUNCIONALIDADES]] e [[ANALISE-ROADMAP-v2]].

---

## 0 · Por que esta fatia (e não a anterior)

O recorte "prova-de-moat / anti-streak" descrito em [[ANALISE-ROADMAP-v2]] fica **adiado**: há um sócio produtor concreto esperando o sistema operacional. Então a V1 é **produtor-first, operacional**: entregar o que faz um produtor rodar eventos e comunidade de verdade. O produtor também é o **canal de aquisição** (traz atletas), o que ataca o cold-start pelo lado da oferta.

A tese de retenção/comunidade continua válida como norte, mas a métrica de retenção vira **instrumentação de fundo** (medir, não bloquear a entrega desta fatia).

---

## PARTE A · Spec da fatia

### A.1 · Objetivo

Colocar no ar, aderente às telas, a operação completa do **produtor de eventos** na web + um app do atleta mínimo, de modo que:

- o produtor cria e publica um evento, vende ingressos, gere inscritos, entrega kits/check-in, comunica com a base, opera clubs e vê o dashboard do negócio;
- o atleta, no app simples, descobre o evento, compra o ingresso, recebe comunicados e acessa o ingresso (QR).

### A.2 · Escopo IN — o que entra (curadoria dos épicos existentes)

Referencia stories/tasks já escritas nos épicos; **não reescreve**. Recorte por épico:

| Área | Épico | Recorte para a V1 | Telas de referência (`WEB-APPV2 (1)/`) |
|---|---|---|---|
| Fundação técnica | [[LEELA-E00-fundacao-tecnica]] | Completo (monorepo, Next.js, Firestore, Auth, CI) | — |
| Design System | [[LEELA-E01-design-system]] | Completo, tema `brasa` | (design system) |
| Dashboard do produtor | [[LEELA-E02-visao-geral]] | Completo | Painel do Organizador |
| Operação do evento | [[LEELA-E03-operacao-evento]] | Eventos, criar/publicar, overview, inscritos, kits, entrega/check-in, financeiro do evento | Meus Eventos, Novo Evento, Overview/Detalhe do Evento, Inscritos, Kits-*, Entrega-* |
| Config & vendas | [[LEELA-E04-config-vendas]] | Página de vendas (lotes/cupons/percurso), promotores/afiliação + split, financeiro/repasse, equipe | PaginaVendas-Conteudo |
| Promotor (self-service) | [[LEELA-E08-influenciador]] | Painel próprio do promotor: eventos p/ divulgar, seu link/cupom rastreável, suas conversões, seu repasse (S701–S704, recorte V1) | (novo — web) |
| Clubs | [[LEELA-E05-clubs]] | Hub, overview, membros, convites, parcerias, **comunicação**, configurações. **Desafios em versão mínima** (listar/criar simples, sem a mecânica anti-streak completa) | Clubs, Club-* |
| Comunicação | [[LEELA-E06-marketing]] | Comunicação do evento (push/email segmentado) — subconjunto; sem automações avançadas | Comunicacao |
| Landing pública | [[LEELA-E12-landing]] | Página pública de evento + inscrição + checkout (via `PaymentProvider`) + SEO básico; página de clube | PaginaVendas-Conteudo |
| App simples (atleta) | recorte de [[LEELA-E13-app-atleta]] | Ver A.4 | (novo — Expo) |

Transversais nesta fatia: **pagamento** via `PaymentProvider` + 1 gateway (ADR-006; recomendação preliminar Pagar.me/Asaas — ver [[05-vendas-afiliacao]]); **notificações** push (FCM) + email; **auth** Firebase (Apple obrigatório no app).

### A.3 · Escopo OUT — adiado (explícito)

- **Desafio anti-streak completo** e a jornada heroica gameficada (fica para depois; o motor de desafio entra mínimo em E05).
- **Integrações de treino / `TrainingProvider`** (E14) — Strava/Garmin/Health. Fora da V1.
- **E10 Marcas, E11 Analytics** — adiados. (E08 Promotor **entra na V1** como painel self-service — ver A.2.)
- **Automações de marketing** (E06 avançado), landing além do essencial.
- **SaaS de creators (MyDose)** — é horizonte estratégico (ver C.1), não V1.

### A.4 · App simples do atleta (recorte de E13)

Mínimo para o atleta existir ao redor do evento do produtor. Expo (React Native), reusa `core` + `design-system`.

- Onboarding + login (Apple + Google) — `LEELA-S1301`.
- Descoberta: lista/busca de eventos + página do evento — `S1304/S1305`.
- Compra do ingresso (checkout mobile via `PaymentProvider`) — `S1306`.
- Meus ingressos (QR do ingresso para check-in) — recorte novo.
- Receber comunicados (push) do produtor/clube — `S1312`.
- Entrar no clube por código/link + ver mural do clube (leitura) — `S1310/S1311` (versão leitura).

**Fora do app V1:** registrar ações/pilares, progresso de desafio, medalhas, sync de treino.

### A.5 · Critério de pronto da fatia (o "sistema rodando")

Fluxo do **produtor** (web), ponta a ponta, sem intervenção técnica:
1. Cria evento → configura lotes/percursos/cupons → publica (gera URL + QR).
2. Landing pública vende → atleta se inscreve e paga → receita e inscrito aparecem.
3. Gere inscritos (busca/filtros/paginação), entrega kit + check-in.
4. Cria clube, importa/convida membros, comunica segmentado (push/email).
5. Vê o dashboard consolidado (inscrições, receita, próximos eventos, alertas).
6. Afiliação: define comissão para um promotor/clube; split acontece no pagamento.

Fluxo do **atleta** (app simples): descobre evento → compra → recebe comunicado → abre o ingresso (QR).

**Aderência visual:** cada tela web bate com a correspondente em `WEB-APPV2 (1)/` (tema `brasa`, §2.x) **em desktop 1440**. Emenda RESP-M1 (2026-07-11): o alvo deixou de ser desktop-first e passou a **responsivo com alvo mobile real 390×844** (JOB P4: o organizador opera o painel pelo celular no local do evento). A fidelidade ao mockup vale **acima do breakpoint de colapso do shell (`lg`, 1024px)**; abaixo dele o comportamento segue os padrões do DS (o export não tem referência mobile) — Sidebar vira drawer, grids colapsam, tabelas ganham scroll/empilhamento. O gate visual roda nos dois viewports (1440×900 + 390×844). Ver `handoff-claude-design.md` §5.

**Instrumentação (fundo, não gate):** eventos para medir retenção clube-vs-solo (Cloud Function), para acompanhar sem bloquear a entrega.

---

### A.6 · Arquitetura: marketplace multi-tenant (fundacional)

O Leela é uma **ticketeira multi-tenant**: N promotores, cada um dono da própria base/eventos/tickets/central de negócio, com **termos comerciais por tenant** (taxa, parcelamento, antecipação, mensalidade da comunidade, e a mensalidade SaaS que o Leela cobra do produtor — pode ser 0). Acima de todos, o **super-admin da plataforma** (você) configura termos e vê o macro. Isso é **fundacional** e entra no **E00 desde o dia 1** (isolamento por `tenantId` nas Security Rules; retrofit é proibitivo). Ver [[ADR-multitenancy]] e [[modelo-de-dados-firestore]].

A V1 inclui um **super-admin mínimo** ([[LEELA-E16-plataforma-superadmin]], recorte): onboard do produtor-sócio + configurar os termos comerciais dele + visão macro básica. Dashboards macro ricos, cobrança recorrente completa (mensalidade de comunidade + SaaS) e multi-tenant em escala: adensam depois.

## PARTE B · Roadmap de épicos (o que fazer primeiro)

Sequência da V1 Produtor. Só os épicos da fatia; cada um no recorte de A.2.

| Onda | Épicos | Entrega |
|---|---|---|
| **0 · Fundação** | E00 → E01 | Monorepo Next.js + Firestore + Auth + CI; Design System (tema brasa) + shell. Bloqueia tudo. |
| **1 · Operar** | E03 · E02 · E05(núcleo) · **E16-slim** | Criar/publicar evento, inscritos, kits, entrega/check-in; dashboard do produtor; clube com membros + comunicação; **super-admin mínimo** (onboard do tenant + termos comerciais). |
| **2 · Vender** | E04 · **E08** · E12 · E06(comunicação) | Página de vendas (lotes/cupons), checkout público, afiliação + split + **painel self-service do promotor**, comunicação do evento. Fecha o ciclo descobrir→pagar→receita. |
| **3 · App simples** | E13-slim | App do atleta mínimo (A.4): descobrir, comprar, ingresso/QR, comunicados, ler clube. |

Grafo de dependência (recorte):

```
E00 ─► E01 ─► E03 ─► E04 ─► E12 ─► (checkout)
              ├─► E02        ├─► E06 (comunicação)
              │              └─► E08 (promotor self-service)
              └─► E05 (núcleo) ─► E13-slim
```

Ordem de ataque recomendada dentro das ondas: fechar E03+E04+E12 (o ciclo de venda de ingresso, que é o que o sócio produtor precisa primeiro) **antes** de adensar E05 clubs e o app.

---

## PARTE C · Horizonte (manter em vista, não construir agora)

### C.1 · MyDose → Creator Studio (SaaS de desafios + conteúdo)

Visão do Vitor: transformar a lógica do **MyDose** (programas guiados por creator) num **SaaS onde empresas e profissionais criam seus próprios desafios/programas + ebooks + materiais**, com os produtores de evento como canal de aquisição de usuários.

Implicações para **não fechar portas** já na V1:
- Modelar `desafio`/programa de forma que um **autor** (clube, empresa, profissional) seja dono do conteúdo (já há dono no modelo — `clube_id`; generalizar para `autorId` no futuro).
- Prever, no domínio, anexos de **conteúdo** (ebook/material) a um desafio/programa — não implementar, só não impedir.
- Manter pagamento/split genéricos (o mesmo `PaymentProvider` serve venda de ingresso e, no futuro, venda de programa/ebook).

Provável épico futuro: **LEELA-E15 · Creator Studio** (desafios/programas + biblioteca de materiais + venda) — H2/H3. Fica registrado; não entra na V1.

### C.2 · O que espera atrás da V1

E14 (integrações de treino / `TrainingProvider`), desafio anti-streak completo, E08/E10/E11, automações — adensam depois que a V1 do produtor estiver no ar e validada.

---

### C.3 · Afiliação vs. E08, e hipóteses de integração futuras

- **Afiliação na V1 = link (E04) + painel self-service do promotor (E08).** Princípio: o promotor **sempre** é self-service. O produtor cria o programa/comissão (E04); o promotor entra no próprio painel (E08), pega seu link/cupom rastreável e acompanha conversões e repasse (S701–S704). Split e atribuição no pagamento (RN-310/311/312, RN-120/125).
- **E10 Marcas** (patrocinadores/ativações, RN-123/213/214) e **E11 Analytics** (métricas do PRD §7 cruzando eventos+clubs) são aprofundamentos pós-V1; o dashboard operacional básico já vem no E02.
- **Hipótese futura — integração de prescrição de treino/nutrição:** mesmo padrão de integração do `TrainingProvider`/E14, mas virado para *prescrição* (coach/nutricionista entrega plano dentro do Leela). Ferramentas: treino (TrainingPeaks, Trainerize, TrueCoach), nutrição (Nutrium, WebDiet/Dietbox BR). Casa com o Creator Studio (C.1 / E15). Registrar como hipótese; validar demanda antes de especificar.

## Referências
- [[V1-CHECKLIST]] — checklist executável desta fatia (142 tasks por onda)
- [[ROADMAP]] · [[README]] · [[NUVEM-FUNCIONALIDADES]] · [[ANALISE-ROADMAP-v2]] · [[PARECER-CONSELHO]] · [[ADR-multitenancy]]
- Épicos: [[LEELA-E00-fundacao-tecnica]] · [[LEELA-E01-design-system]] · [[LEELA-E02-visao-geral]] · [[LEELA-E03-operacao-evento]] · [[LEELA-E04-config-vendas]] · [[LEELA-E05-clubs]] · [[LEELA-E06-marketing]] · [[LEELA-E08-influenciador]] · [[LEELA-E12-landing]] · [[LEELA-E13-app-atleta]]
