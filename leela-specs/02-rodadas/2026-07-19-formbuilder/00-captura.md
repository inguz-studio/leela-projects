---
tags: [leela, captura, backlog, analise-futura, checkout, clubes]
aliases: ["Construtor de formulário de perguntas personalizadas", "FORM-BUILDER-CAP", "CAP-FORMBUILDER"]
trace: leela-build-2d6ee98d
lote: FORM-BUILDER-CAP
data: 2026-07-19
fonte: pedido do Vitor (2026-07-19) ao analisar concorrentes
estado: NÃO-DECIDIDO · análise futura (não entra na fila executável)
identificador: CAP-FORMBUILDER
---

# Captura · Construtor de formulário de perguntas personalizadas (CAP-FORMBUILDER)

> Registro fiel de uma funcionalidade nova identificada pelo Vitor ao analisar concorrentes, **capturada para análise futura**. O próprio Vitor foi explícito: *"isso deve ser analisado depois"*. Este documento **não** decide escopo, **não** vira RN e **não** gera código. Ele preserva o verbatim, delimita o que está NÃO-DECIDIDO e registra as perguntas que a análise futura terá de responder.

## Verbatim do Vitor (preservado, 2026-07-19)

> *"ao analisar concorrentes, identifiquei uma funcionaldiade de construir formulários de perguntas personalizadas, para coletar no momento da inscrição, isso deve ser analisado depois, mas acho que precisamos de um construtor de formulário, que o organizador pode inserir no momento da compra ou inscrição em clubes e eventos. Podendo ser seleção multipla, ou unica, perguntas de sim ou nao ou anexo arquivos."*

## O que é (descrição do pedido)

Um **construtor de formulário** no painel: o organizador monta perguntas personalizadas que são exibidas **no momento da compra (eventos)** e **na inscrição em clubes**, para coletar dados extras do inscrito. Tipos de pergunta pedidos:

- **seleção múltipla** (várias respostas),
- **seleção única** (uma resposta),
- **sim / não** (booleano),
- **anexo de arquivo**.

Superfícies afetadas se um dia for construído: checkout público de evento (E12) e inscrição/entrada de clube (E05). Editor do formulário viveria no painel do organizador (E04/E05).

## Escopo NÃO-DECIDIDO (a análise futura decide)

Nada abaixo está definido. São lacunas deliberadamente em aberto:

- **Onde as respostas vivem** — no pedido, no inscrito, em subcoleção própria, ou noutro lugar.
- **Quem lê as respostas** — organizador, equipe, CRM; níveis de acesso.
- **Export** — se há exportação (CSV/planilha) e em que formato.
- **Obrigatoriedade por pergunta** — cada pergunta pode ser opcional ou obrigatória; regra por tipo.
- **Limite de perguntas** — teto de perguntas por formulário / por evento / por clube.

## Perguntas abertas para a análise futura (não são decisões)

Riscos a cobrir **quando a análise rodar** — registrados como perguntas, não como regra fechada:

1. **Anexo de arquivo = Storage + LGPD.** Um anexo pode ser dado **sensível de saúde** (ex.: atestado médico — LGPD Art. 11). Como tratar armazenamento, retenção, acesso e minimização?
   - Interage com o **termo de saúde** e o aceite versionado (**RN-149**) e com os dados plenos de saúde condicionais à flag do evento (**RN-146/147**, dado sensível Art. 11, isolados em `inscritos/{id}/saude`).
   - Interage com a disciplina de **minimização de PII** do CRM (**RN-172** — a chave CPF→e-mail; o CRM nunca agrega dado do pedido além do necessário).
   - Precisa de Security Rules próprias no Storage (fail-closed, teto de tamanho, allowlist de formato) no padrão já usado nas capas (RN-168/228).
2. **Onde a resposta é anexada:** ao **pedido** (1× por compra, do comprador) ou ao **inscrito** (1× por atleta)? Interage com o registry `pessoas`/checkout recém-decidido (**RN-173** CPF único, **RN-174** claim condicionado a pagamento + e-mail confirmado) — decidir isso muda quem "possui" a resposta e quem pode relê-la.
3. **Benchmark de concorrentes.** Mapear o padrão de mercado antes de especificar: **Sympla** (campos personalizados na inscrição), **TicketSports** (ficha de inscrição). Pode **reusar o padrão do BENCHMARK-REEMBOLSO** (`outputs/leela-build-2d6ee98d/BENCHMARK-REEMBOLSO-REPORT.md`) quando a análise rodar.

## Onde este item foi registrado

- **Canônico:** este documento (`02-rodadas/2026-07-19-formbuilder/00-captura.md`), identificador **CAP-FORMBUILDER**.
- **Board:** card BACKLOG/ANÁLISE-FUTURA em [[V1-KANBAN]] (coluna Backlog, estado 🧊 — não entra na fila executável).
- **Épicos tocados (seção "Análise futura"):** [[LEELA-E12-landing]] (checkout de evento) e [[LEELA-E05-clubs]] (inscrição/entrada de clube). O editor do construtor viveria no painel do organizador (E04/E05) — a definir na análise.

## Estado

**NÃO-DECIDIDO.** Análise futura. Não gera RN, não entra na fila de código, sem decisão pendente do Vitor neste momento (o próprio pediu para analisar depois). Quando a análise rodar, ela nasce de uma rodada própria (`02-rodadas/<data>-formbuilder-analise/`) e só então vira story/RN.
