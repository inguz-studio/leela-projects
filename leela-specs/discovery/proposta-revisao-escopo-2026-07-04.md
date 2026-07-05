# Proposta de revisão de escopo — V1 Leela

> Data: 2026-07-04 · Síntese das análises de 8 scouts sobre E06/E07/E09/E11/E13/E14/E15/LEELA+
> Base: ROADMAP.md (ondas 0-5), V1-KANBAN, HANDOFFs da Onda 1
> Decisor: Vitor. Este documento propõe; a seção 6 lista o que só ele pode cravar.

---

## 1 · Resumo executivo

A Onda 1 (operar) está fechando com gate. A revisão avaliou 8 candidatos a entrar na V1 e a conclusão central é: quase nada deve entrar na rota de "vender", mas um bloco coeso de engajamento deve ser formalizado logo depois dela. A proposta é declarar dois marcos: **V1 = vender** (Onda 2: E04 → E12 → E08 promotor + E06 comunicação, com adição mínima de ~1 lote em estados de sistema web) e **V1.5 = engajar** (Onda 3: E13-slim + loop GymRats + perfil + repasse + analytics histórico, ~6 lotes novos além do slim já planejado, mais 2 lotes gated de Strava). O Creator Studio (E15) não é um épico, é uma visão de horizonte sem spec; fica fora, com hygiene de domínio de custo quase zero dentro do E05 agora para não fechar portas. LEELA+ (benefícios ao membro) depende do app do atleta existir e é realisticamente H2. O E07 deixa de ser épico monolítico e vira fatias distribuídas nas ondas onde cada superfície nasce. O E09 ganha um carve-out "repasse workflow" executável já, porque suas dependências (E16, E03) estão prontas. O E11 entra só como coleta de snapshot mensal, porque histórico não é backfillável e cada mês adiado é dado perdido. A data de "vender" quase não se move; a de "engajar" fica explícita em vez de implícita e otimista.

---

## 2 · O que é o Creator Studio (E15), afinal

Resposta direta: **hoje não é um épico, é um parágrafo.** O E15 existe como uma seção de visão (V1-PRODUTOR-web.md, parte C.1) e uma linha do roadmap (Could, H2/H3, XL, congelado). Não tem spec, stories nem tasks.

A ideia: transformar a lógica do MyDose num SaaS de creator economy. Personal trainers, médicos, nutricionistas e coaches criariam seus próprios desafios e programas de hábito, anexariam ebooks e materiais, publicariam numa biblioteca e venderiam, usando os produtores de evento como canal de aquisição. O público não é o produtor que paga a V1 hoje: é o creator de wellness que quer monetizar comunidade, com o atleta como consumidor final.

Por que fica fora: exigiria ~12 lotes, discovery e spec do zero, um tipo novo de SKU (produto digital), infra de conteúdo (Storage, entitlement, consumo mobile), marketplace de dois lados com cold-start próprio, e um modelo de negócio não validado (nem o preço do MyDose foi encontrado na pesquisa). Antecipar rouba foco do cliente concreto que espera a V1 produtor.

O que fazer agora (custo quase zero): dentro do E05, generalizar o dono do desafio de `clube_id` para `autorId` e prever no tipo (sem implementar) um campo opcional de anexo de conteúdo. Desafio hoje é subcoleção de clube; migrar esse acoplamento depois é caro, prever o campo agora é barato. Se houver pressão para provar a tese cedo, o único recorte defensável é uma biblioteca de materiais gated por membership (1-2 lotes), e mesmo esse só depois da V1 no ar.

---

## 3 · Tabela: épico → recorte → lotes → onda → dependências

| Épico | Recorte proposto | Lotes | Onda recomendada | Dependências-chave |
|---|---|---|---|---|
| **E07 Estados de sistema** | Split, não épico único. (a) `SystemStateScreen` + 404/500 web (painel via catch-all/ErrorBoundary React Router; landing via not-found + upgrade do `global-error.tsx` existente). (b) 404/500/offline mobile como DoD do E13-slim. Fora: 403, manutenção, offline-web | ~1.5 total (0.5-1 na Onda 2, resto na 3) | (a) Onda 2 · (b) Onda 3 · resto V1.1 | E01 pronto (EmptyState é ~70% do componente); Sentry pronto; `config/system` já em Rules. Atenção: spec assume Next no painel, mas painel é Vite+React Router, ~metade das tasks precisa de equivalente |
| **E09-slim Repasse** | Workflow apenas: coleção `repasses` com máquina de estados, `solicitarRepasse` (calcula disponível da receita líquida de eventos encerrados, E03), `decidirRepasse` (super-admin), tela do produtor + fila no PlatformShell. "Pago" é registro, sem transferência real (ADR-006). Fora: painel consolidado, ledger, split | 2 | Onda 3 (executável já se quiser antecipar como fatia decimal) | E16 e E03-S207 prontos (deps duras satisfeitas). Pontos de migração diferida: fonte do "disponível" → E09-S902; clawback RN-346 e split de afiliação quando E04/E09 chegarem |
| **E11 Analytics** | Recorte S "histórico do que já temos": Function de rollup que persiste o snapshot do E02 em `analytics/{YYYY-MM}` + rolling-30d, seletor de período + gráfico de linha. GMV, inscritos, membros, novos atletas/mês, % GMV parcerias. Fora: coorte/churn (M), conversão link vs direto (L, depende de E04+E12) | 1 | Onda 3 (rollup de coleta vale antecipar: histórico não é backfillável) | Reusa E02/E03/E05/E16 prontos. Infra nova: primeiro cron agendado do repo (alinhar com scheduler já previsto para E12); componente de gráfico no DS |
| **E13 loop GymRats + perfil** | Tier A: `registros` + `onRegistroWrite` (keystone, reusa `calcularPontos` do E05) + `entrarNoDesafio` + leaderboard (ranking 1224 sobre `participantes`) + telas Arena, detalhe do desafio, Início e Perfil. Fora: medalhas (S1309 cortada), foto no check-in, social por check-in | 2.5-3 (backend ~1 pode adiantar p/ fim da Onda 2, é surface-agnostic) | Onda 3, junto do E13-slim (sem isso o slim é só ticketing no mobile) | E05 pronto (motor, catálogo 16 ações, RN-115). Depende do shell do slim (S1300-S1302). Riscos: idempotência do agregado, DS variante RN imaturo, tensão leaderboard × anti-streak |
| **E14 Strava-only** | Camada 2 apenas: interface `TrainingProvider` + StravaProvider (OAuth + webhook) + conectar conta + bridge importar atividade → registro (dado próprio Leela alimenta o desafio). Fora: HealthKit, agregador, Garmin, backfill | ~2 (gated) | Onda 3.1, fast-follow gated por spike de compliance + OAuth | Pré-requisito duro: S1307-T1 (pipeline de registros) do Tier A acima. Externo: registro do app na Strava + review (gate >10 atletas, semanas de latência). Agreement 2024/26: dado Strava é self-view, ranking usa só o registro Leela |
| **E15 Creator Studio** | Fora. Só hygiene de domínio no E05: `autorId` + campo opcional de anexo no tipo | ~0 agora (12 se completo) | Reavaliar V1.1/H2 pós-validação da V1 produtor | Sem spec; exigiria discovery, SKU digital, entitlement, E13 no ar |
| **LEELA+ (ex-E06 parceiros)** | Capability nova (candidata E17), não reuso de S400. V1 "mostrar e resgatar": CRUD de parceiro/benefício no painel, carteirinha + browse no app, resgate com código one-time validado por Function. Sem cashback, sem mensalidade | 6 | Onda 4/V1.1 no mínimo, realista Onda 5/H2 | Dependência dura de E13 no ar. Decisões abertas: elegibilidade/billing, namespacing `parceirosAfiliacao` vs `parceirosBeneficio`. Cold-start de marketplace de dois lados |
| **E06 automações (S402)** | Mantém na Onda 2 como já planejado (comunicação); o motor gatilho→mensagem é reusável depois pelo LEELA+ | (já na Onda 2) | Onda 2 | E03, E04 |

---

## 4 · Roadmap revisado em ondas

Lógica preservada: vender antes de gamificar; Strava, perfil e GymRats andam juntos porque se alimentam (treino → registro → pontos → leaderboard → perfil); LEELA+ só depois do checkout e do app.

### Onda 1 · Operar (fechando)
E02, E03, E05, E16 + gate. **Adição antes de fechar o gate:** hygiene E15 dentro do E05 (`autorId` + campo de anexo no tipo). Custo marginal, evita migração cara.

### Onda 2 · Vender = **V1**
- E04 Config & Vendas → E12 Landing/checkout → E08 promotor + E06 comunicação (como planejado).
- **+ E07 fatia web** (~0.5-1 lote): `SystemStateScreen` (web) + 404/500 no painel (catch-all + ErrorBoundary React Router) e na landing (not-found + upgrade do global-error stub). Entra aqui porque um URL quebrado na landing pública custa SEO e primeira impressão, e porque sem o componente único cada superfície criaria estado ad-hoc.
- **Opcional, fim da onda em paralelo:** backend do desafio (S1307-T1 + S1308-T1 + ranking puro, ~1 lote). É surface-agnostic, só depende do E05 pronto, e destrava a Onda 3. É transferência da Onda 3, não adição.

### Onda 3 · Engajar = **V1.5**
- E13-slim (14T já planejadas) **+ Tier A GymRats/perfil** (~2.5-3 lotes, ou ~1.5-2 se o backend adiantou): Arena, detalhe do desafio, Início, Perfil, leaderboard. Sem medalhas.
- **+ E07 fatia mobile** como DoD do slim (~0.5): 404/500/offline. App sem ErrorBoundary e offline não é publicável.
- **+ E09-slim repasse** (2 lotes): solicitar + fila super-admin + histórico. Deps já prontas; pode antecipar como fatia decimal se o Vitor quiser antes.
- **+ E11 recorte S** (1 lote): rollup de coleta + gráfico de período. Compartilha superfície financeira e o padrão de scheduler com o E09.

### Onda 3.1 · Strava (gated)
- E14 Strava-only (~2 lotes), só após: spike de compliance/OAuth, registro do app na Strava (iniciar cedo, lead time externo de semanas) e S1307-T1 no ar. Se escorregar por dependência externa, o loop roda com registro manual e nada quebra.

### Onda 4 · V1.1
- E07 resto: 403 (casar com papéis E04-S304), manutenção, offline-web.
- Medalhas (S1309), foto e social no check-in, E11 recorte M (coorte/churn, após 2-3 meses de histórico de membros).

### Onda 5 · H2
- LEELA+ (6 lotes, após decisão de elegibilidade/billing). E15 Creator Studio (discovery + spec antes de qualquer build). E11 recorte L (S822, após E04+E12 gerarem atribuição). E14 camadas 1 e 3. E09 painel consolidado + ledger. E10 Marcas.

---

## 5 · Impacto em lotes e a pergunta-chave

| Onda | Antes | Depois | Delta |
|---|---|---|---|
| Onda 2 (vender) | E04+E12+E08+E06 | + E07 web | **+0.5-1 lote** |
| Onda 3 (engajar) | E13-slim | + Tier A + E07 mobile + E09-slim + E11-S | **+6 a 6.5 lotes** |
| Onda 3.1 (gated) | — | E14 Strava | +2 lotes (condicionais) |
| Fora da V1/V1.5 | — | E15 (0 agora), LEELA+ (6, H2) | 0 |

**Total puxado para o horizonte V1+V1.5: ~7 a 9.5 lotes**, dos quais só ~1 toca a rota de vender.

A resposta honesta: **a data da V1 como "capaz de vender" quase não muda** (+0.5-1 lote de estados web, que é seguro e barato). O que muda é admitir que "V1 completa com app engajando" nunca caberia na mesma data. A recomendação é formalizar o corte: **V1 = vender** (fim da Onda 2, produtor opera e recebe inscrição paga ponta a ponta) e **V1.5 = engajar** (fim da Onda 3, atleta registra, pontua, compete e vê perfil; produtor solicita repasse e vê histórico). Isso protege a data de receita, dá um marco de marketing intermediário e evita que os 6 lotes de engajamento entrem disfarçados de "acabamento" e empurrem o checkout. Se os 6 lotes da Onda 3 fossem espremidos na V1 única, a data de vender escorregaria ~3-4 semanas sem nenhum ganho de receita.

---

## 6 · Decisões que só o Vitor pode tomar

1. **Aceitar o corte V1/V1.5?** V1 = vender (Onda 2), V1.5 = engajar (Onda 3). É a decisão-mãe; tudo abaixo assume que sim.
2. **Leaderboard × anti-streak:** a spec E13 marca ranking como fora de escopo pelo posicionamento anti-streak, mas a decisão sinalizada é incluí-lo. Cravar o enquadramento ("board de consistência", nunca placar que envergonha o último) e mandar atualizar a spec (remover S1309, adicionar story de leaderboard) antes de qualquer build.
3. **Confirmar corte de medalhas (S1309)** e o contrato do Perfil com estante vazia/"em breve".
4. **E09-slim repasse: quando?** Onda 3 (proposta) ou antecipar já como fatia decimal na onda corrente, dado que E16 e E03 estão prontos. Confirmar também que a UI deixará explícito que "pago" é registro, sem transferência bancária real na V1.
5. **Strava: autorizar o registro do app OAuth na Strava agora?** O review externo leva semanas e limita a <10 atletas até aprovação; iniciar cedo não custa dev. Confirmar também o gate: Strava só entra se a coorte-piloto pedir "treino vira ponto", senão o loop roda manual.
6. **E11: aprovar o rollup de coleta já na Onda 3**, mesmo com UI mínima? Snapshot mensal não é backfillável; cada mês sem coleta é histórico perdido. Decidir junto onde nasce o padrão de cron (E12 ou E11/E09).
7. **E15: aprovar só o hygiene** (`autorId` + campo de anexo no E05, agora) e congelar o resto até a V1 validar? Ou encomendar o recorte "biblioteca de materiais gated por membership" (1-2 lotes) como teste da tese pós-V1?
8. **LEELA+: definir elegibilidade e billing** (grátis para todo atleta, restrito a membro, ou tier pago). Muda o esforço em 1-2 lotes e ativa ou não o ADR-006. Sem essa decisão, nem o planejamento de H2 fecha. Confirmar namespacing `parceirosAfiliacao` vs `parceirosBeneficio` para o nome "parceiros" não significar duas coisas opostas.
9. **E07 403 e manutenção:** confirmar que 403 espera os papéis (E04-S304) e manutenção/offline-web ficam V1.1.
10. **Backend do desafio adiantado:** autorizar o lote surface-agnostic (S1307-T1 + S1308-T1 + ranking) rodando em paralelo no fim da Onda 2, para a Onda 3 começar com o keystone pronto e testado?

---

*Documento de proposta. Nada aqui altera specs ou KANBAN até decisão registrada.*
