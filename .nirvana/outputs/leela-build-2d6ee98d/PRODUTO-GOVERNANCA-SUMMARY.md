# Sumário · Governança de produto LEELA (vault produto/)

trace: leela-build-2d6ee98d · trilha PARALELA · executor: squad nirvana-wiki-brain (Fable) · data: 2026-07-05

## Árvore criada (12 notas)

```
produto/
├── 00-MOC-produto.md               # hub central, linka as 11 notas + entradas na verdade técnica
├── 01-tese-de-negocio.md           # tese, moat psicológico+retenção, oferta coordinator-first, monetização, kill-criteria
├── 02-personas/
│   ├── organizador-produtor.md     # persona V1 + variante coordenador de assessoria, verbatims do discovery
│   ├── atleta.md                   # transacional V1 → heroico V1.5, contrato anti-streak
│   └── super-admin.md              # platform_admin, plano de cobrança, repasses, visão macro
├── 03-jobs-to-be-done.md           # job único do conselho + 4 dimensões Be Hero, ligados a épicos/stories
├── 04-user-stories.md              # índice navegável de 95 stories em 15 épicos (contagem 2026-07-05)
├── 05-benchmarks.md                # índice executivo: 7 pilares (~130 fontes), Cheers, Leela+ refs, lacunas
├── 06-roadmap-visao.md             # V1=vender · V1.5=engajar, ondas, cortes, decisões comerciais, histórico de re-sequenciamento
├── 07-visao-de-futuro.md           # H1-H4, Creator Studio E15, rede coordinator-first, Leela+, E14 agregação
├── 08-linhas-narrativas.md         # 6 linhas editoriais com tese, público, ângulos e provas → insumo nyx-social
└── 09-pautas/
    └── README.md                   # estrutura + handoff brief nyx-social (sem pautas, por design)
```

## Commits (SEM push, staging cirúrgico só de produto/ + este sumário)

| Hash | Mensagem |
|---|---|
| 6e2a2b5 | [LEELA-PRODUTO-T1] estrutura do vault produto/ — MOC inicial + esqueleto de pautas c/ handoff nyx-social |
| 11a06c9 | [LEELA-PRODUTO-T2] notas de estratégia — tese de negócio, 3 personas e JTBD ligados aos épicos |
| d2943d8 | [LEELA-PRODUTO-T3] notas de produto — índice de 95 stories, benchmarks (7 pilares), roadmap executivo V1/V1.5 e visão de futuro |
| 0884011 | [LEELA-PRODUTO-T4] linhas narrativas p/ nyx-social + MOC final + lint verde (12 notas, 0 orfa, 0 link quebrado) |
| (T5) | este sumário |

## Resultado do lint (wiki-brain lint-guardian)

- **Órfãs: 0** (toda nota tem ≥1 inlink interno; MOC com 11 inlinks, tese com 10).
- **Wikilinks quebrados: 0** (validados contra basenames do vault inteiro, incluindo leela-specs/ e be-hero-documentacao/).
- **Frontmatter: 12/12** com `tags`, `fontes`, `atualizado`.
- Writing contract aplicado: separadores de heading normalizados para `·` (orçamento de travessão respeitado), headings em sentence case, sem filler/emoji decorativo.

## Critérios do brief

1. Frontmatter + wikilinks + zero órfã: OK.
2. Zero duplicação normativa: notas são síntese com link para spec de origem; índice de stories lista só ID+título.
3. Fatos estratégicos vinculantes refletidos sem reabrir: moat psicológico+retenção (não "5 pilares"), coordinator-first ("rodo sua comunidade e seu evento; você paga quando arrecada"), multi-tenant ADR-009, V1=vender/V1.5=engajar, Strava gated/evolução, TrainingProvider agregação, sem afiliados na V1 (cupons sim), Leela+ pago 100% Leela, 12x Price 3,49% a.m. repassado, taxa percentual+fixa por tenant.
4. 08-linhas-narrativas pronto para a nyx-social: 6 linhas (L1 constância compassiva, L2 clube>solo, L3 coordenador game master, L4 economia do produtor, L5 jornada do atleta comum, L6 build in public), cada uma com tese, público, 4-5 ângulos e provas com fonte; prioridade sugerida.
5. leela-specs/ intocado (somente leitura); packages/, apps/, functions/, package.json intocados; nenhuma suíte de teste executada.

## Lacunas encontradas no material-fonte (registradas nas notas)

- **Retenção 2x é benchmark emprestado (Strava/NRC), não medida no Leela** — tratada como fragilidade nº 1 da tese e regra de citação para a nyx-social ("dado de mercado, nunca nosso dado").
- **Contagem de stories divergente:** brief e docs históricos citam 77; contagem real em epics/ em 2026-07-05 é 95 (stories greenfield + E16). Registrado no 04 com data.
- **E14 e E15 sem arquivo de épico** em epics/ (E14 formalizado só em ANALISE-ROADMAP-v2; E15 é "um parágrafo").
- **Taxas de concorrentes BR opacas** e métricas de retenção dos SaaS BR ausentes de fonte pública (herdado do discovery, mantido como lacuna declarada).
- `#hipótese` usados: eficácia de build in public para atrair coordenadores-piloto (L6); ordem de prioridade das linhas narrativas; prescrição de treino/nutrição futura (já era hipótese em V1-PRODUTOR-web §C.3).

## Handoff nyx-social

**Pronto.** Insumo primário: `produto/08-linhas-narrativas.md`. Regras de produção e estrutura de entrega: `produto/09-pautas/README.md` (gate anti-streak em copy, writing contract, dado só com fonte, canais Instagram/LinkedIn/blog).
