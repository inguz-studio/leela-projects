---
tags: [leela, roadmap, modelo, canonico, moc]
aliases: [Modelo do Roadmap, Modelo Único, Mapa do Roadmap, Terminologia]
atualizado: 2026-07-12
---

# 🧭 Modelo único do roadmap — Onda → Épico → User Story → Task

> **Este é o documento canônico de terminologia e hierarquia do roadmap da Leela.** Se um card, checklist ou diagrama usar um termo que não está aqui, este documento vence. Serve para um leigo abrir no Obsidian e entender, em uma tela: onde estamos, o que é cada Onda e Épico, e onde encaixa cada trabalho.
>
> Fontes que este modelo reconcilia: [[ROADMAP]] (§4 épicos, §5 ondas), [[V1-KANBAN]], [[V1-CHECKLIST]], [[EXPLICACAO-ONDE-ESTAMOS]] e a trilha `next-trail/`.

---

## 1 · A decisão (leia isto primeiro)

**Antes** o roadmap misturava três coisas diferentes nos mesmos cards: **Wave** (A/B/C/D), **Onda** (1/2) e **Épico**. Wave e Onda eram *dois eixos distintos* — um de execução, outro de release — usados como se fossem a mesma coisa. Isso confundia.

**Agora há uma hierarquia única, e só uma:**

> ## Onda → Épico → User Story → Task
> Cada nível é ancorado a um **Job To Be Done (JTBD) + persona**.

E há uma decisão de vocabulário fixa:

| Termo | O que é | Exemplo |
|---|---|---|
| **Onda** | **Eixo de RELEASE.** Um conjunto de épicos que vai ao mercado junto, ordenado por dependência. É o único eixo de "quando entrega". | Onda 2 · Vender |
| **Épico** | **Agrupamento de valor.** Uma capacidade do produto. | E12 Landing + checkout |
| **User Story (US)** | Uma fatia de valor para uma persona, com aceite Given/When/Then. Cada US cita **1 JTBD**. | S1203 Checkout de 5 etapas |
| **Task** | Unidade técnica = **1 PR = 1 commit**. | S1203-T3 Etapa Modalidade/Kit |
| **Lote de execução** | **Metadado de agenda, NÃO um nível da hierarquia.** Um punhado de tasks (de Épicos possivelmente diferentes) que o time despacha numa mesma sessão de trabalho. Antes se chamava "Wave A-D" / "Frente F1-F4". Sempre marcado como etiqueta, nunca como par de "Onda". | Lote "Fable kernel" (ex-Wave A) |

**Regra de ouro:** "Onda" e "Lote de execução" nunca mais aparecem lado a lado como se fossem o mesmo tipo de coisa. **Onda = o que/quando entrega. Lote = como agrupamos o trabalho numa sprint.**

### Etiquetas ortogonais (metadados, não níveis)

Estas descrevem qualquer item, mas **não** são degraus da árvore:

- **Horizonte** (H1–H4): horizonte de negócio do épico (ver [[ROADMAP]] §3). H1 = agora.
- **MoSCoW** (Must/Should/Could/Won't): prioridade dentro da Onda.
- **Fase** (V1 / V1.5): corte fino de release ("vender" vs "engajar").
- **Status**: ✅ Done · 🔄 Em progresso · 📋 Backlog · 🧊 Icebox · 🚫 Bloqueado.

---

## 2 · De-para: "Wave/Frente" → onde isso mora agora

A trilha `next-trail` (2026-07-10) organizou o trabalho em **Wave A-D** (também rotuladas **Frente F1-F4**). Isso era um **plano de sprint**, não um novo eixo de release. Aqui está a tradução para o modelo único — **sem perder nada do que já foi feito**:

| Rótulo antigo | O que era | Onde mora no modelo único | Estado |
|---|---|---|---|
| **Wave A** / Frente F1 (Fable kernel A-G) | Backend crítico em Fable (pedidos, estorno, QR, estoque, cronograma, logs) | **Lote de execução** que enriqueceu **Onda 1 / E03** (e semeou o kernel `pedidos` que a Onda 2 consome) | ✅ Completa (backend + UI) |
| **Wave B** / Frente F2 (RESP-MOBILE) | Passe mobile real 390×844 | **Lote de execução** transversal sobre **E01** (shell responsivo) | ✅ Completa |
| **Wave C** / Frente F3 (vender ponta a ponta) | E04-slim + E12 + E09-slim + E07-web + E06 + transversais | **É a Onda 2, literalmente** — o mesmo conjunto de épicos, com outro nome | 📋 Próxima / em abertura |
| **Wave D** / Frente F4 (Consolidações) | Dívida técnica / DS (CONS-1..6) | **Backlog transversal** de dívida técnica — não é uma Onda; entra interleaved | 📋 Interleave |

**Tradução em uma frase:** *o `next-trail` foi a sprint que terminou de enriquecer a Onda 1 (lotes Fable + mobile) e abriu a Onda 2 (vender), com dívida técnica intercalada.* "Wave C" e "Onda 2" são a mesma coisa — daqui em diante, chamamos só de **Onda 2**.

> Os relatórios e commits que citam "Wave A/B/C/D" continuam válidos como registro histórico. A etiqueta "Lote de execução: Fable kernel" preserva esse agrupamento sem confundir com o eixo de release.

---

## 3 · Mapa Onda → Épico (a fonte de verdade navegável)

Cada linha: o épico, sua persona/JTBD-âncora, o horizonte e o estado. Detalhe de tasks vive em [[V1-CHECKLIST]]; o board em [[V1-KANBAN]].

### Onda 0 · Fundação — ✅ concluída
Base técnica e visual. Bloqueia tudo.

| Épico | JTBD-âncora (persona) | Horizonte | Estado |
|---|---|---|---|
| [[LEELA-E00-fundacao-tecnica]] | (enabler — monorepo/Firebase/Auth/CI) | H1 | ✅ |
| [[LEELA-E01-design-system]] | (enabler — DS temável `brasa`/`leela` + shell) | H1 | ✅ |
| [[LEELA-E16-plataforma-superadmin]] · S1600 | "operar a plataforma multi-tenant" (Admin) | H1 | ✅ |

### Onda 1 · Operar — ✅ concluída
Núcleo do painel do organizador: operar evento, clube, dashboard, super-admin mínimo.

| Épico | JTBD-âncora (persona) | Horizonte | Estado |
|---|---|---|---|
| [[LEELA-E03-operacao-evento]] | 04.1 "acompanhar kit/pagamento no mesmo lugar" · P3/P5 inadimplência+estoque (Organizador) | H1 | ✅ (+ lote Fable A-G enriqueceu) |
| [[LEELA-E05-clubs]] | 04.4 "ter dados na mão" · mapa Clubs "comunidade com rosto e nome" (Coordenador) | H1 | ✅ |
| [[LEELA-E02-visao-geral]] | 04.4 "ter dados na mão" (Organizador) | H1 | ✅ |
| [[LEELA-E16-plataforma-superadmin]] · slim | "onboard de tenant + termos comerciais" (Admin) | H1 | ✅ |

### Onda 2 · Vender — 📋 próxima (= a antiga "Wave C")
Vender ponta a ponta + as abas que fecham o ciclo do evento. Fecha: *atleta descobre → inscreve → paga → organizador vê receita.*

| Épico | JTBD-âncora (persona) | Horizonte | Estado |
|---|---|---|---|
| [[LEELA-E04-config-vendas]] -slim | 04.1 "configurar lotes e preços automáticos" (Organizador) | H1 | 🔄 S300-T1 ✅; resto 📋 |
| [[LEELA-E12-landing]] | 04.1 "descubro evento → me inscrever em poucos cliques" (Atleta) | H1 | 🔄 superfícies públicas + checkout ✅; SEO/afiliação 📋 |
| [[LEELA-E09-financeiro-profissional]] -slim | 04.1 "processo repasse → ver saldo e disparar em lote" (Admin/Organizador) | H1 | 📋 |
| [[LEELA-E07-estados-sistema]] -web | 04.4 "parecer tão profissional quanto SP" (Organizador) | H1 | 📋 |
| [[LEELA-E06-marketing]] (só campanhas) | 04.2 "receber no app → eliminar WhatsApp" (Organizador/Atleta) | H1 | 📋 |
| Transversais: E11 coleta (S821) · backend desafio (S1307/S1308) | 04.4 "ter dados na mão" · 04.2 "meditação conta" | H1 / H2 | 📋 (S821 V1 · S1307/8 V1.5) |

### Onda 3 · App simples + alavancas — 🔜
App do atleta mínimo + robustez restante. **Recebe os 2 épicos novos** (ver §4).

| Épico | JTBD-âncora (persona) | Horizonte | Estado |
|---|---|---|---|
| [[LEELA-E13-app-atleta]] -slim | 04.1 "me inscrever em poucos cliques" + 04.4 "sou atleta em progresso" (Atleta) | H2 | 🔜 |
| **[[LEELA-E18-assessorias-parceiras]]** 🆕 | 04.1 "tração trazendo parceiros" (Organizador) + "condição+presença" (Assessoria) | H1→H2 | 📋 novo |
| **[[LEELA-E17-perfil-social]]** 🆕 (link-in-bio público) | 04.4 "identidade" + 04.3 "aparecer na vitrine" (Organizador/Atleta) | H2 | 📋 novo |

### Onda 4 · Comunidade heroica + social completo — 🔜 (H2)
Camada de engajamento diário e identidade social.

| Épico | JTBD-âncora (persona) | Horizonte | Estado |
|---|---|---|---|
| [[LEELA-E13-app-atleta]] (jornada heroica completa) | 04.2 "rotina com propósito" (Atleta) | H2 | 🧊 |
| **[[LEELA-E17-perfil-social]]** 🆕 (Feed·Eventos·Clubs in-app + tematização por-usuário) | 04.4 "identidade, não consumo" (Atleta/Organizador) | H2 | 📋 novo |
| E14 Integrações de treino · E09 completo | 04.2 "meditação/sono contam" (Atleta) | H2 | 🧊 |

### Onda 5 · Expansão / Marketplace — 🧊 (H2-H3)
| Épico | JTBD-âncora (persona) | Horizonte | Estado |
|---|---|---|---|
| [[LEELA-E08-influenciador]] · E10 Marcas · E11 Analytics · E15 Creator Studio | 04.3 Marketplace (Prestador/Marca/Promotor) | H3 | 🧊 |

> **Backlog transversal (dívida técnica, ex-"Wave D"):** CONS-1..6 (KpiCard canônico, teste flaky, mutations→useMutation, backend-deps, bugs do showroom). Entra interleaved em qualquer Onda; não é um degrau de release. Detalhe em [[V1-CHECKLIST]] §"Wave D".

---

## 4 · Os 2 épicos novos (planejados neste ponto)

Especificação completa nos arquivos de épico; resumo do encaixe:

- **[[LEELA-E17-perfil-social]] — Perfil social / link-in-bio.** Perfil público (Feed · Eventos · Clubs) com **link na bio** compartilhável, **tematização por-usuário** (tema dinâmico por conta sobre o DS) e **capas** de clube/evento. Benchmark Cheers. **Encaixe:** o **link-in-bio público** (superfície landing, barato) entra na **Onda 3**, reusando E12; o **Feed/Eventos/Clubs in-app + tematização** entra na **Onda 4**, com o app E13. JTBD: descoberta + identidade + retenção.
- **[[LEELA-E18-assessorias-parceiras]] — Assessorias parceiras (tração B2B).** Organizador cadastra assessorias como **clubes parceiros** com desconto exclusivo; cadastro por **CNPJ ou CPF**; responsável com conta → vincula; sem conta → **convite por e-mail → completa cadastro → cria conta Leela automaticamente → entra como club parceiro**. **Reusa** a mecânica de clube (E05 ✅), convite por e-mail (E05 S104 ✅), cupom (E04) e termos por-tenant (E16 ✅). **Encaixe:** **Onda 3** (depende do cupom/termos da Onda 2). JTBD: organizador ganha tração; assessoria ganha condição + presença.

### Regras de domínio novas → onde encaixam (2026-07-12)

| Regra nova | Épico / US | Como encaixa | RN (proposta) |
|---|---|---|---|
| **Cupom-only** (evento fechado, estilo TicketSports) | **E04 / S300** (modo de venda) | Novo modo `vendaSomentePorCupom` no evento: o checkout público só libera inscrição com cupom válido. Também consumido por E18 (cupom exclusivo do club parceiro). | RN-345 |
| **Repasse D+2 ajustável** | **E09-slim** + **E16** `commercialTerms` | `commercialTerms.anticipation.repasseDiasUteis` (default 2) por tenant. "Valor disponível" = fundos fora da janela D+N; "a ser disponibilizado" = retenção **+** fundos ainda na janela. Hoje o FIX financeiro mostra aproximação estática; a janela real entra com a máquina de repasses. | RN-338 |
| **Retenção 15% negociável** | **E09-slim** + **E16** `commercialTerms` | `commercialTerms.retencaoPct` (default 15) editável por `platform_admin` por tenant. Já parcialmente na UI (card financeiro); formaliza no E09. | RN-339 |

Estas três são pequenas e ficam **na Onda 2** (E04/E09 já estão lá). Só a *aplicação* delas ao E18 (desconto exclusivo do parceiro) vive na Onda 3.

---

## 5 · Como navegar isto no Obsidian

1. **Comece aqui** (este doc) para entender o modelo e onde tudo encaixa.
2. **Visão de helicóptero:** [[EXPLICACAO-ONDE-ESTAMOS]] — a história em 4 linhas + "você está aqui".
3. **Board vivo:** [[V1-KANBAN]] (colunas Backlog/Fazendo/Revisão/Feito).
4. **Checklist executável:** [[V1-CHECKLIST]] (tasks `[ ]`/`[x]` por Onda).
5. **Detalhe de um épico:** abra `[[LEELA-E##-...]]` (US com Given/When/Then + tasks).
6. **Diagramas:** [[ROADMAP-VISUAL]] (Gantt/grafo/timeline).

> **Convenção de leitura:** um card no kanban é sempre `Onda N · E## · <título>`. Se você vir "Wave X" num relatório antigo, traduza pela tabela do §2. A partir daqui, o vocabulário do §1 é o único válido.

---
Voltar: [[HOME]] · [[ROADMAP]] · [[EXPLICACAO-ONDE-ESTAMOS]]
