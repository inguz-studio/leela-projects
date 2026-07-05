# Protocolo de handoff — Claude Design → LEELA

> Data: 2026-07-05
> Contexto: intake real do export WEB-APPV2 (36 telas + be-hero.css) e lição da Onda 1, onde o mockup entrou como referência decorativa e as discrepâncias de layout (sidebar ausente em ~29 telas, ícones nunca preenchidos) passaram sem alarme.
> Objetivo: toda entrega futura do Claude Design nasce como contrato executável, não como pilha de HTML pra arqueologia.

## 1. O que o export atual JÁ entrega bem (medido, não estimado)

O diagnóstico "HTML feito à mão que imita shadcn" era verdade para a componentização, mas subestimava o resto:

| Camada | Estado no export | Aproveitamento |
|---|---|---|
| Tokens | `be-hero.css` tem arquitetura real: primitivos (`--brasa-*`, `--neutro-*`) → semânticos (`--surface-base`, `--action-primary`, `--border-focus`) + elevação, motion, radius, type. 501 usos de `var(--)`, só 35 hex únicos (todos no bloco de primitivos). Os nomes semânticos batem 1:1 com o DS. | ALTO — diff mecânico contra os tokens do DS |
| Ícones | SVGs inline com viewBox 24, stroke 1.75 — são paths Lucide literais | ALTO — mapear path → nome lucide-react |
| Layout | `.app { grid-template-columns: 240px 1fr }`, sidebar fixa, min-width 1280px — a spec de composição está no CSS | ALTO — vira requisito vinculante no épico |
| Vocabulário de classes | Consistente entre telas (`.nav-item`, `.kpi-value`, `.badge badge-vitoria`, `.sidebar-footer`...) — um sistema de componentes de facto | MÉDIO — vira mapa classe → componente DS |
| Código dos componentes | HTML estático, sem estados/aria/comportamento; ~922 `style=""` inline no total (~26/tela) para ajustes pontuais | BAIXO — não portar; usar como contrato visual |

Divergência real encontrada no intake (exemplo do porquê do diff): `--action-primary-hover` = `#FF6520` no export vs `#FF6640` no DS. Sem diff formal, esse tipo de deriva fica invisível.

## 2. Regras de pedido no Claude Design (lado de lá)

Colar no início de todo projeto/iteração no Claude Design:

1. **Tokens são lei.** Cole o bloco `:root` gerado pelo pipeline do DS (fonte: `packages/design-system` — saída do generate de tokens) e exija: todo estilo via `var(--*)`; proibido hex/px/ms literal fora do bloco de primitivos; proibido criar variável nova sem prefixá-la `--proposta-*` (para o diff capturar como proposta, não como fato).
2. **Zero `style=""` inline.** Ajuste pontual vira classe utilitária nomeada no CSS. Inline style é onde a deriva se esconde (922 casos no export atual).
3. **Tela de inventário obrigatória** (`_inventario.html`): todos os componentes em todos os estados — botão default/hover/focus/disabled, input com erro, empty/loading/skeleton, toast, modal, tabela com paginação, badges por variante. É a tela mais valiosa do pacote.
4. **Ícones com nome.** Todo SVG acompanhado do nome Lucide num comentário (`<!-- lucide: calendar-days -->`) ou `data-lucide="calendar-days"`. Elimina a engenharia reversa de paths.
5. **Anotações de comportamento por tela**, num bloco `<!-- SPEC ... -->` no topo do HTML ou `.md` par: o que é fixo vs rola, breakpoints, navegação (o que persiste ao trocar de módulo), estados não visíveis no estático (hover, focus, drag), dados reais vs placeholder.
6. **Nomenclatura shadcn quando houver correspondência** (dialog, tabs, dropdown-menu, card, table) — a correspondência estrutural 1:1 com o DS elimina a etapa de adivinhar qual componente é o quê.

## 3. Pipeline de intake (lado de cá) — 5 passos, nessa ordem

1. **Diff de tokens** — extrair o `:root` do export e diffar contra os tokens gerados do DS. Toda divergência vira decisão registrada (aceitar no DS / rejeitar e corrigir no mockup), nunca silêncio. Owner: magic-ds (`validate-tokens-json` / `diff-snapshots`).
2. **Specs de layout → requisitos no épico** — o que o CSS afirma sobre composição (grid 240px 1fr, o que é fixo, larguras mínimas) é transcrito como requisito vinculante NO ÉPICO da tela, não em doc paralelo. A Onda 1 provou que doc paralelo (DoD item 18, doc de IA) não é lido pelos lotes de build.
3. **Mapa classe → componente DS** — tabela `vocabulário do export → componente nosso` (ex.: `.nav-item` → `Sidebar.Item`, `.kpi-*` → `CardKPI`, `.badge badge-vitoria` → `Badge variant=success`). Componente sem correspondente vira candidato a componente novo via CLI shadcn. Owner: magic-ds (`map-components`).
4. **Ícones → lucide-react** — extrair os paths, resolver o nome Lucide de cada um, atualizar o mapeamento item→ícone. Com a regra 4 do §2, esse passo vira leitura direta.
5. **Screenshots → baseline do gate visual** — cada tela renderizada vira PNG de referência do gate visual (browser real, desktop 1440×900 + mobile 390×844). O gate roda em todo lote que toca shell ou componente novo e é BLOQUEANTE. É a trava que faz o mockup ser contrato, não sugestão.

## 4. Definition of done do intake

Um handoff só está "ingerido" quando: diff de tokens zerado (ou divergências decididas e registradas), requisitos de layout transcritos no épico da tela, mapa de componentes escrito, ícones resolvidos por nome, e baselines do gate visual salvos. Sem esses 5, o pacote é referência, e referência não bloqueia gate — que é exatamente o buraco por onde a Onda 1 derrapou.
