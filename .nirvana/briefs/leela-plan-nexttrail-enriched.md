# ENRICHED BRIEF — Planejamento da próxima trilha da Leela (roadmap + stories + tasks, ancorado em JTBD)

> Trace: `leela-plan-nexttrail` · Parent build trace: `leela-build-2d6ee98d`
> Alvo: business **software-forge** · Lead: **sf-cto** (DNA Fowler/DHH/Kleppmann) consultando **sf-ux-engineer** (DNA Norman/Sierra/Zhuo, autoridade de JTBD)
> Tipo: **planejamento** (não é build). Produz artefatos de plano, não código de app.
> Project dir: `C:/Users/Vitor Eduardo/Desktop/Vaults/Antigravity/Projetos_Aprendizado/LEELA`

## Objetivo (nas palavras do Vitor)
"Planejar a próxima trilha — Fable (disponível de novo), responsividades, Onda 2, consolidações — atualizando o roadmap de épicos, o checklist de user stories e as tasks. Basear tudo nos Jobs-to-be-Done; e se algo for atualizado, refletir de volta nos JTBD."

## Contexto (leitura obrigatória antes de planejar — o job vem antes de tudo)
Leia, nesta ordem, e ancore o plano nestes documentos (não invente estado — o git + estes docs são a verdade):
1. `be-hero-documentacao/be-hero-docs/jobs-to-be-done.md` — os JTBD por dimensão (Transacional H1 / Heroica H2 / Marketplace H2-H3 / Social transversal). **Toda story precisa citar qual JTBD serve.**
2. `be-hero-documentacao/be-hero-docs/personas.md` — personas (Organizador, Atleta, Coordenador, Prestador, Marca).
3. `.nirvana/HANDOFF.md` — estado real do build (o que está PRONTO; a fila; as decisões travadas). **Não replaneje o que já está feito.**
4. `leela-specs/ROADMAP.md` — mapa de épicos (LEELA-E00..E16), horizontes H1-H4, ondas de execução, grafo de dependências, convenções de ID/status.
5. `leela-specs/V1-CHECKLIST.md` — o checklist executável atual (formato canônico das stories/tasks: `LEELA-S###`, `LEELA-S###-T#`, `[x]` done, hashes de commit).
6. `leela-specs/DECISOES-ABERTAS.md` — decisões pendentes/ratificadas do Vitor (parcelamento, taxa, Comunicar-por-evento, Strava, domínio).
7. `.nirvana/briefs/leela-fable-track-backend.md` — as **7 frentes Fable (A-G)** com critérios de aceite e o overlap com Onda 2.
8. `.nirvana/briefs/onda2-*.md` (E04, E06, E07web, E09slim, E12, transversais) — os lotes já esboçados da Onda 2.
9. `leela-specs/discovery/ANALISE-ROADMAP-v2.md` — proposta E14/E15 (integrações treino, creator studio).

## Escopo — as 4 frentes a planejar
**F1 · Trilha Fable (backend crítico).** As 7 frentes do brief Fable: A modelo pedido/pagamento no Inscrito · B Function de estorno (idempotente) · C QR server-side (ENCOLHIDA — firebase-admin já destravou as escritas; sobra validação de assinatura) · D estoque por tamanho + movimentações · E chave estável Kit↔enum · F cronograma do evento + faixa de chip · G logs de comunicação/histórico. Roteamento Fable (pagamento/segurança/transacional/rules).

**F2 · Responsividades (RESP-MOBILE).** O passe de responsividade adiado de propósito. Alvo decidido pelo Vitor = **mobile real 390×844** (não só colapso desktop). Insumo obrigatório: os 7 MAJOR do `outputs/leela-build-2d6ee98d/QA-LIVE-2-REPORT.md` (causa-raiz única = shell drawer M1). Ordem de fix já dimensionada no HANDOFF (M1→M3→M5→M4→M2/M6/M7). UI nova já nasce responsiva → o passe varre só o desktop-only.

**F3 · Onda 2.** **Reconciliar os dois sentidos conflitantes de "Onda 2"** e produzir uma definição única:
- ROADMAP.md §5: Onda 2 = "Vendas ponta a ponta" (E04 Config&Vendas + E12 Landing/checkout + PaymentProvider).
- HANDOFF: Onda 2 = "features novas" (E04 vendas/cupons/equipe/gateway, E06 comunicação, E08 promotores).
Entregue um mapa único de Onda 2 com épicos, dependências e as sub-abas que faltam na sub-nav do evento. Use os briefs `onda2-*` como insumo.

**F4 · Consolidações (baixa urgência, dívida técnica/DS).** KpiCard canônico no DS (G-004: 4 cópias hoje) · teste flaky `EventoLayout.test.tsx` · mutations de plataforma (`useTenantActions`/`useSaveCommercialTerms`) parked · backend-dep pequenos (nome do owner do tenant, nome canônico do evento na parceria, 5º segmento de comunicado) · adotar as 4 lacunas do ledger `~/.claude/skills/harness/references/07-org-scope-gaps.md` (G-001..G-004).

## Deliverables (3 — exatamente o que o Vitor pediu), como PROPOSTA revisável
Escrever em `leela-specs/next-trail/` (arquivos NOVOS — NÃO sobrescrever os canônicos `ROADMAP.md`/`V1-CHECKLIST.md` nesta passada). Um passo posterior promove após aval do Vitor.

1. **`ROADMAP-next.md`** — o delta do mapa de épicos: onde as 4 frentes entram nos épicos existentes (E03/E04/E05/E12/E16 etc.), novas ondas/sequenciamento, grafo de dependências atualizado, MoSCoW e estimativa T-shirt por item. Reconcilia a nomenclatura de Onda 2. Mantém as convenções de ID/status do ROADMAP atual.
2. **`STORIES-next.md`** — o checklist de user stories das 4 frentes, no formato canônico do `V1-CHECKLIST.md` (`LEELA-S###` / `LEELA-FID-*` / novos IDs coerentes), cada story em Given/When/Then quando fizer sentido, **com a coluna/linha "JTBD servido" obrigatória** (citando o JTBD específico de `jobs-to-be-done.md`). Marcar dependências entre stories.
3. **`TASKS-next.md`** — quebra AI-ready: 1 task = 1 PR (`LEELA-S###-T#`), com estimativa, dependência, roteamento sugerido (Fable p/ pagamento/segurança/rules; Opus p/ UI/mecânico) e a nota de review antagonista onde for reusável/sensível/segurança.

Mais 2 artefatos de suporte:
4. **`JTBD-TRACE.md`** — matriz de rastreabilidade story→JTBD→dimensão→horizonte, cobrindo as 4 frentes. **Bidirecional:** se o planejamento revelar um JTBD novo, ausente ou alterado (ex.: "estornar inscrição com dignidade", "conferir estoque por tamanho antes da largada"), listar aqui as **edições propostas a `jobs-to-be-done.md`** (seção, linha, texto novo) — para o Vitor ratificar. NÃO editar `jobs-to-be-done.md` diretamente nesta passada; propor a edição.
5. **`DECISOES-NECESSARIAS.md`** — os nós de decisão que dependem do Vitor, cada um com contexto + recomendação fundamentada + impacto. **Obrigatório incluir:** o overlap **Fable A/B × Onda 2** (E12 checkout / E04 vendas) — "abre parte da Onda 2 OU fica como enriquecimento da Onda 1 das telas já feitas?" — com recomendação. Incluir também: Comunicar-por-evento (DECISOES-ABERTAS §Para-o-final), gateway concreto (ADR-006 pendente), e o que mais o plano tornar decidível.

## Critérios de aceite (o gate vai medir isto)
- **JTBD primeiro:** 100% das stories novas citam um JTBD de `jobs-to-be-done.md`. Zero story órfã de job. Priorização pesa por JTBD servido + horizonte, não por ordem de tela (L-004).
- **Bidirecionalidade honrada:** `JTBD-TRACE.md` existe e, se algo mudou, traz as edições propostas ao doc de JTBD (não aplicadas, propostas).
- **Cobertura das 4 frentes:** F1(7 frentes A-G) · F2(RESP-MOBILE ancorado no QA-2) · F3(Onda 2 reconciliada) · F4(consolidações) — todas presentes no roadmap e com stories/tasks.
- **Fidelidade ao estado real:** nada replanejado que o HANDOFF marca como PRONTO; dependências corretas (ex.: A antes de B; multi-tenancy S1600 já é fundacional).
- **Formato canônico:** IDs, MoSCoW, T-shirt, status, grafo de dependência coerentes com ROADMAP.md/V1-CHECKLIST.md. Sem inventar entidades fora do domínio.
- **Decisão do overlap surfaçada** com recomendação (não deixada implícita).
- **Sem fabricar dado/escopo:** onde faltar insumo, dizer "depende de X" honestamente.
- **Não produzir código de app.** Só artefatos de plano em `leela-specs/next-trail/`.

## Restrições e lições vigentes (herdar — do HANDOFF e do ledger de lições)
- JOB é o alvo primário; mockup é aparência; divergiu, a story vence (L-004).
- Reuso-first + showroom fonte-de-verdade; grep antes de propor componente novo.
- Não inventar dado — dependência de backend = EmptyState honesto.
- Decisão ratificada precisa de gate de conformidade (L-001: ADR-010 existia e não era aplicado).
- Roteamento: Opus (UI/mecânico/QA) · Fable (pagamento/segurança/gate/root-cause). Sonnet proibido.
- V1 = vender · V1.5 = engajar (fasear stories por isso).
- 1 task = 1 commit `[LEELA-*]`; review antagonista em reusável/sensível/segurança.

## Saída esperada (retorno do agente ao maestro)
Ao terminar: escrever `outputs/leela-build-2d6ee98d/NEXT-TRAIL-PLAN-SUMMARY.md` (o que foi produzido, decisões surfaçadas, JTBD tocados) e retornar ao maestro: paths dos 5 arquivos, contagem de épicos/stories/tasks por frente, e a lista de decisões que aguardam o Vitor. Registrar `## Premissas assumidas` para qualquer default adotado.
