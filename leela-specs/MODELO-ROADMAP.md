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

> ### ⚖️ Decisão de reordenação (Vitor, 2026-07-18 — ratificada · LOTE R9)
> **O Horizonte 3 antecipa e vem ANTES do Horizonte 2.** Estratégia "finalizar por projeto": **completar o produto WEB inteiro** — E08 Influenciador, E10 Marcas, E11 Analytics completo — **antes do APP** (E13 jornada heroica, E17 in-app, E14 integrações de treino). **Exceção:** E15 Creator Studio permanece **depois** (não antecipa).
> **Efeito nas Ondas abaixo:** os épicos web da antiga Onda 5 (E08/E10/E11) sobem para a próxima Onda após a Onda 3 (a **Onda web-complete / H3**); a Onda do app/heroica (E13 completo, E17 in-app, E14) passa para DEPOIS; E15 fica por último. **Não apaguei a história** — as tabelas de Onda 4/5 abaixo trazem a anotação de reordenação em vez de serem reescritas.
> **Dependência atualizada (adendo 4, 2026-07-18):** o **E13-slim (app v1) = PWA** (decisão do Vitor). O *enrollment das lojas* **deixa de bloquear** o E13-slim (PWA não passa por loja) — passa a ser pré-requisito só de um eventual **E13 nativo v2** (H2 tardio), ação externa de **prioridade baixa**. Antecipar o web não bloqueia o app; e o app v1 nem depende mais das lojas.
> Recortes já antecipados pelo LOTE R9 (2026-07-18), coerentes com esta decisão: E08 afiliados (`S-R9-11`), E10 patrocinadores reutilizáveis (`S-R9-12`), E11 análise unificada + cohort (`S-R9-01/02`), e o novo **E19-CRM** (`S-R9-13`). Registro em `DECISOES-ABERTAS` (Ratificadas).


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

### Onda 2 · Vender — ✅ concluída (2026-07-13)
Vender ponta a ponta + as abas que fecham o ciclo do evento. Fechou: *atleta descobre → inscreve → paga → organizador vê receita, estorna com dignidade e solicita repasse.*

| Épico | JTBD-âncora (persona) | Horizonte | Estado |
|---|---|---|---|
| [[LEELA-E04-config-vendas]] -slim | 04.1 "configurar lotes e preços automáticos" (Organizador) | H1 | ✅ S300 T1-T5 + S304 T1-T3 + PAY-T1 (T6 superseded ADR-012; PAY-T2 parked KYC) |
| [[LEELA-E12-landing]] | 04.1 "descubro evento → me inscrever em poucos cliques" (Atleta) | H1 | ✅ superfícies públicas + checkout 5 etapas + refino Figma (SEO fino/afiliação = Onda 3) |
| [[LEELA-E09-financeiro-profissional]] -slim | 04.1 "processo repasse → ver saldo e disparar em lote" (Admin/Organizador) | H1 | ✅ L1-L4 (modelo+Rules+core, 6 Functions, telas org + fila admin auditada) |
| [[LEELA-E07-estados-sistema]] -web | 04.4 "parecer tão profissional quanto SP" (Organizador) | H1 | ✅ 404/500/403 (403 = matriz S304) |
| [[LEELA-E06-marketing]] (só campanhas) | 04.2 "receber no app → eliminar WhatsApp" (Organizador/Atleta) | H1 | ✅ backend + aba Comunicação + lista/editor + flip envio (scheduler = Onda 3) |
| Transversais: E11 coleta (S821) · backend desafio (S1307/S1308) · plano de cobrança (CB) | 04.4 "ter dados na mão" · 04.2 "meditação conta" | H1 / H2 | ✅ backend completo (+CB-T3 tela); telas do desafio = Onda 3 (E13) |

> Dívida técnica ex-"Wave D" (CONS-1..6): ✅ concluída junto (KpiCard canônico, showroom, flaky root-caused, mutations/useMutation, realtime onSnapshot provado E2E, G-001..004 nos pools).

### Onda 3 · App simples + alavancas — 🔜
App do atleta mínimo + robustez restante. **Recebe os 2 épicos novos** (ver §4).

| Épico | JTBD-âncora (persona) | Horizonte | Estado |
|---|---|---|---|
| [[LEELA-E13-app-atleta]] -slim | 04.1 "me inscrever em poucos cliques" + 04.4 "sou atleta em progresso" (Atleta) | H2 | 🔜 |
| **[[LEELA-E18-assessorias-parceiras]]** 🆕 | 04.1 "tração trazendo parceiros" (Organizador) + "condição+presença" (Assessoria) | H1→H2 | 📋 novo |
| **[[LEELA-E17-perfil-social]]** 🆕 (link-in-bio público) | 04.4 "identidade" + 04.3 "aparecer na vitrine" (Organizador/Atleta) | H2 | 📋 novo |

### Onda web-complete (H3) · Produto web inteiro — 🔜 (ANTECIPADA por decisão de 2026-07-18)
Entra ANTES da Onda heroica (reorder §3). Fecha o produto web para o profissional antes do app.

| Épico | JTBD-âncora (persona) | Horizonte | Estado |
|---|---|---|---|
| [[LEELA-E08-influenciador]] (completo; recorte afiliados já antecipado em R9) | 04.1/04.3 "link rastreável / promotor" (Promotor/Influenciador) | H3→antecipado | 🔜 |
| [[LEELA-E10-marcas]] (completo; listagem reutilizável já antecipada em R9) | 04.4 "gerenciar marcas num lugar só" (Organizador/Coordenador) | H3→antecipado | 🔜 |
| [[LEELA-E11-analytics]] (completo; análise unificada + cohort já antecipados em R9) | 04.4 "dados na mão" (Organizador) | H3→antecipado | 🔜 |
| **[[LEELA-E19-crm]]** 🆕 (CRM do organizador + hub de Comunicação) | 04.4 "conhecer/reter a base" (Organizador) · candidato P8 | H3 | 📋 novo (R9) |

### Onda heroica (ex-Onda 4) · Comunidade heroica + social completo — 🔜 (H2, agora DEPOIS do web por decisão de 2026-07-18)
Camada de engajamento diário e identidade social.

| Épico | JTBD-âncora (persona) | Horizonte | Estado |
|---|---|---|---|
| [[LEELA-E13-app-atleta]] (jornada heroica completa) | 04.2 "rotina com propósito" (Atleta) | H2 | 🧊 |
| **[[LEELA-E17-perfil-social]]** 🆕 (Feed·Eventos·Clubs in-app + tematização por-usuário) | 04.4 "identidade, não consumo" (Atleta/Organizador) | H2 | 📋 novo |
| E14 Integrações de treino · E09 completo | 04.2 "meditação/sono contam" (Atleta) | H2 | 🧊 |

### Onda 5 · Expansão / Marketplace — 🧊 (reordenada 2026-07-18)
> **Reorder 2026-07-18:** E08/E10/E11 **saíram** desta Onda e subiram para a "Onda web-complete" (antes da Onda heroica). Só **E15 Creator Studio** permanece por último (exceção explícita da decisão). Linha original preservada abaixo tachada para história.

| Épico | JTBD-âncora (persona) | Horizonte | Estado |
|---|---|---|---|
| [[LEELA-E15-creator-studio]] (permanece por último — exceção da decisão de 2026-07-18) | 04.3 Marketplace (Prestador/Marca) | H3 | 🧊 |
| ~~E08 Influenciador · E10 Marcas · E11 Analytics~~ → movidos p/ Onda web-complete (2026-07-18) | — | H3 | ➡️ antecipados |

> **Backlog transversal (dívida técnica, ex-"Wave D"):** CONS-1..6 (KpiCard canônico, teste flaky, mutations→useMutation, backend-deps, bugs do showroom). Entra interleaved em qualquer Onda; não é um degrau de release. Detalhe em [[V1-CHECKLIST]] §"Wave D".

---

## 4 · Os 2 épicos novos (planejados neste ponto)

Especificação completa nos arquivos de épico; resumo do encaixe:

- **[[LEELA-E17-perfil-social]] — Perfil social / link-in-bio.** Perfil público (Feed · Eventos · Clubs) com **link na bio** compartilhável, **tematização por-usuário** (tema dinâmico por conta sobre o DS) e **capas** de clube/evento. Benchmark Cheers. **Encaixe:** o **link-in-bio público** (superfície landing, barato) entra na **Onda 3**, reusando E12; o **Feed/Eventos/Clubs in-app + tematização** entra na **Onda 4**, com o app E13. JTBD: descoberta + identidade + retenção.
- **[[LEELA-E18-assessorias-parceiras]] — Assessorias parceiras (tração B2B).** Organizador cadastra assessorias como **clubes parceiros** com desconto exclusivo; cadastro por **CNPJ ou CPF**; responsável com conta → vincula; sem conta → **convite por e-mail → completa cadastro → cria conta Leela automaticamente → entra como club parceiro**. **Reusa** a mecânica de clube (E05 ✅), convite por e-mail (E05 S104 ✅), cupom (E04) e termos por-tenant (E16 ✅). **Encaixe:** **Onda 3** (depende do cupom/termos da Onda 2). JTBD: organizador ganha tração; assessoria ganha condição + presença.

### Regras de domínio novas → onde encaixam (2026-07-12)

| Regra nova | Épico / US | Como encaixa | RN (proposta) |
|---|---|---|---|
| **Cupom-only** (evento fechado, estilo TicketSports) | **E04 / S300** (modo de venda) | Novo modo `vendaSomentePorCupom` no evento: o checkout público só libera inscrição com cupom válido. Também consumido por E18 (cupom exclusivo do club parceiro). | RN-303 |
| **Taxa incorporada vs. repassada** (config do organizador por evento) | **E04 / S304-S305** `commercialTerms` · cálculo em **E09** · exibição em **E12** | **Incorporada:** comprador paga o preço de face, taxa descontada do repasse (débito no fluxo do organizador). **Repassada:** comprador paga face + taxa; a taxa vai à Leela e não entra no "a receber" do organizador. `computeSaleState` já calcula a taxa — o modo decide quem paga. | RN-347 |
| **Repasse D+N (default D+2 úteis) + retenção % ajustáveis** | **E09-slim** + **E16** `commercialTerms` | `commercialTerms.anticipation.repasseDiasUteis` (default 2) e `retencaoPct` (default 15) por tenant. "Valor disponível" = fundos fora da janela D+N; "a ser disponibilizado" = retenção **+** fundos ainda na janela. Hoje o FIX financeiro mostra aproximação estática; a janela real entra com a máquina de repasses. | RN-348 |

> ⚠️ Correção 2026-07-12: a versão anterior desta tabela propunha RN-345/338/339, que **já existem** (RN-345 = kit/chip na transferência S904-T4; RN-338/339 = política de reembolso S305). Números válidos: **RN-303, RN-347, RN-348** (blocos livres, registrados nos épicos E04/E09/E12).

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
