---
tags: [leela, produto, pautas, handoff, nyx-social]
fontes:
  - "[[08-linhas-narrativas]]"
  - "[[01-tese-de-negocio]]"
atualizado: 2026-07-05
---

# 09 · Pautas — estrutura e handoff para a nyx-social

Esta pasta recebe as pautas de conteúdo produzidas pela agência nyx-social. Aqui vive só a estrutura e o brief de handoff. Nenhuma pauta foi produzida neste lote, de propósito: pauta é trabalho da agência, não do vault de produto.

## Estrutura esperada

```
09-pautas/
├── README.md                      # este arquivo
├── instagram/                     # pautas por canal
│   └── AAAA-MM-pauta-{slug}.md
├── linkedin/
│   └── AAAA-MM-pauta-{slug}.md
└── blog/
    └── AAAA-MM-pauta-{slug}.md
```

Convenção de nome: `AAAA-MM-pauta-{slug}.md`, slug em kebab-case sem acento. Toda pauta declara no frontmatter: `linha-narrativa` (wikilink para a linha em [[08-linhas-narrativas]]), `canal`, `status` (rascunho / aprovada / publicada) e `fontes`.

## Brief de handoff (nyx-social)

**Insumo primário:** [[08-linhas-narrativas]]. Cada linha traz tese, público-alvo, ângulos e provas com fonte. A pauta deriva de uma linha; não inventar linha nova sem registrar antes no 08.

**Contexto estratégico obrigatório:** ler [[01-tese-de-negocio]] antes da primeira pauta. Dois pontos são inegociáveis:

1. **O moat é psicológico + retenção**, não "unificamos 5 pilares". Conteúdo que vende o Leela como "super app que junta tudo" contradiz a tese aprovada pelo conselho ([[PARECER-CONSELHO]]).
2. **Gate anti-streak vale para copy de marketing.** Nenhuma pauta usa linguagem de perda, culpa ou sequência quebrada ("não perca", "você falhou", "streak de X dias"). A filosofia é "Volte amanhã" (RN-118, [[RELATORIO-DISCOVERY]]).

**Regras de produção:**

- Writing contract do CLAUDE.md da LEELA se aplica a toda pauta (sem dash stitching, sem filler, headings em sentence case).
- Todo dado citado em pauta precisa de fonte rastreável nos specs ou nos pilares do discovery ([[05-benchmarks]] indexa tudo). Dado sem fonte não entra.
- Números de mercado citáveis hoje: retenção ~2x em clube vs solo (Strava/NRC, benchmark emprestado, ainda não medido no Leela — dizer "dados de mercado", nunca "nossos dados"), Lally et al. 2010 sobre formação de hábito, Strava Year in Sport 2024 sobre conexão social como motivador.
- Público e tom por canal: Instagram fala com o atleta comum e o coordenador; LinkedIn fala com produtores de evento, coordenadores de assessoria e o ecossistema founder/tech; blog aprofunda as duas pontas.

**O que a nyx-social devolve:** pautas nos subdiretórios acima, cada uma linkando a linha narrativa de origem, mais um índice `_indice-pautas.md` quando o volume passar de 10.

## Volta para

[[00-MOC-produto]] · [[08-linhas-narrativas]]
