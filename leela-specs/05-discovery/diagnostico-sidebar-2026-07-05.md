# Diagnóstico: por que o menu lateral não é fixo e não tem ícones

Data: 2026-07-05
Autor: liderança de design/frontend LEELA
Contexto: Vitor observou no preview que o menu lateral do painel some ao navegar e que nenhum item tem ícone. Este documento responde por quê, com evidência, e recomenda o que fazer.

## Resposta curta

| Aspecto | Veredito | Em uma frase |
|---|---|---|
| Menu não fixo | **Bug de integração** (não é bug do componente, nem decisão) | O componente funciona; o problema é que só a Visão Geral e a Plataforma montam o shell padrão. Eventos e Clubes renderizam sem menu nenhum. |
| Menu sem ícones | **Implementação incompleta** (o slot existe, ninguém preencheu) | O componente aceita ícone por item e a spec prevê Lucide, mas todos os 8 itens estão cadastrados com "ícone: nenhum". |

Nenhum dos dois foi decisão consciente. Os dois violam documentos que já existem no projeto.

## 1. Por que o menu não é fixo

### O que está acontecendo

O menu lateral (Sidebar) não tem "cola" própria na tela. Ele depende de um componente maior, o AppShell, que é a moldura padrão do painel: menu travado à esquerda, só o conteúdo rola. **Dentro do AppShell, o menu É fixo e funciona como deveria.**

O problema: apenas duas áreas do painel usam essa moldura.

- Visão Geral (`/`): usa AppShell. Menu fixo, tudo certo.
- Plataforma: usa AppShell. Menu fixo, tudo certo.
- **Eventos (`/eventos`): não usa AppShell. O menu simplesmente não existe nessas telas.**
- **Clubes (`/clubes`): idem. Zero menu.**

Ou seja: quando você navega da Visão Geral para Eventos, o menu não "descola e some por não ser fixo". Ele desaparece porque a tela de Eventos nem o desenha. Na prática a sensação é a mesma ("o menu não é fixo"), mas a causa é outra: falta de montagem da moldura padrão nas rotas principais do produto.

### Isso é bug, gap de spec ou decisão?

É bug de integração, com um gap de spec secundário:

- A spec do design system (E01) é omissa: entrega o Shell "montável em qualquer app" mas não diz "toda rota deve montá-lo". Nesse nível, gap de spec.
- Porém dois documentos superiores já exigem o comportamento correto:
  - O Definition of Done, item 18: toda tela "aplica o shell padrão (sidebar 8 itens, breadcrumb, header)".
  - O documento canônico de arquitetura de informação do Be Hero: "sidebar 240px fixo", "o sidebar permanece fixo", "permanece visível e imutável" ao trocar de módulo.

Conclusão: as telas de Eventos e Clubes foram entregues violando o DoD. Bug de integração, não decisão.

### Evidência

- `packages/design-system/src/components/AppShell/AppShell.tsx:35` e `:41` — a moldura trava o menu e faz só o conteúdo rolar.
- `packages/design-system/src/components/Sidebar/Sidebar.tsx:77-85` — o Sidebar em si não tem fixação própria; depende do AppShell (por design).
- `apps/painel/src/routes/overview/OverviewShell.tsx:22` e `apps/painel/src/routes/plataforma/_components/PlatformShell.tsx:46` — os únicos dois pontos do painel que montam o AppShell.
- Busca por AppShell/Sidebar em `routes/eventos` e `routes/clubes`: zero resultados. `EventoShell.tsx:26-37` é só um contêiner simples sem menu.
- `be-hero-docs/be-hero-ia-painel (2).md:20-34, 517` — "240px fixo", "permanece fixo", "visível e imutável".
- `be-hero-docs/definition-of-done.md:18` — shell padrão obrigatório em toda tela.
- `leela-specs/03-canon/epics/LEELA-E01-design-system.md:25, 112-114` — spec omissa sobre fixação e sobre obrigatoriedade por rota.

## 2. Por que não tem ícones

### O que está acontecendo

O componente Sidebar já foi construído esperando ícones: cada item tem um espaço reservado de 24x24 e o código renderiza o ícone quando existe. O próprio comentário do componente diz que o modo colapsado é "ícone-only". Só que:

- A lista padrão de itens do menu (que vive no design system) cadastra os 8 itens com `icon: null` ("sem ícone").
- O painel reaproveita essa lista sem preencher nada.
- A área Plataforma também passa `icon: null` explicitamente.

Efeito colateral sério: se alguém ativar o modo colapsado (menu estreito de 64px), os itens ficam completamente em branco, porque o texto some e não há ícone para mostrar. O modo colapsado hoje é inutilizável.

Detalhe que torna isso fácil de resolver: a biblioteca de ícones já está escolhida e instalada. A spec E01 define "ícones Lucide 24×24" e o pacote `lucide-react` já está no painel e na landing, com zero uso até agora. E o documento de IA do Be Hero já mapeia qual ícone vai em cada item.

### Isso é bug, gap de spec ou decisão?

Implementação incompleta (um tipo de bug de conteúdo). Não é gap de spec: a E01 fixa a biblioteca (Lucide) e o doc de IA fixa o mapeamento item a item. Não é decisão: nada documenta uma escolha por menu só texto, e o design do componente pressupõe ícones.

### Evidência

- `packages/design-system/src/components/Sidebar/Sidebar.tsx:23, 176-180` — o item aceita ícone e renderiza quando presente; `:8` — doc-comment "ícone-only quando collapsed"; `:50-62` — os 8 itens padrão com `icon: null`; `:182` — texto vira invisível no modo colapsado.
- `apps/painel/src/routes/overview/_lib/sidebar.ts:32-42` e `PlatformShell.tsx:32` — painel nunca injeta ícones.
- `apps/painel/package.json:22` e `apps/landing/package.json:18` — `lucide-react ^0.446.0` instalada; zero imports em todo o código.
- `LEELA-E01-design-system.md:49` — "ícones Lucide 24×24 stroke 1.75 currentColor".
- `be-hero-ia-painel (2).md:42-51` — tabela item → ícone.

## 3. O que NÃO precisa mexer

Os tokens de layout estão prontos e corretos: largura 240px, largura colapsada 64px e tamanho de ícone 24px definidos nos temas e consumidos pelo componente sem nenhum valor cravado no código. A infraestrutura visual está pronta; o gap é só de composição (moldura ausente em Eventos/Clubes) e de conteúdo (ícones nunca preenchidos).

## 4. Recomendação

**Corrigir agora, antes da Onda 2.** Motivos:

1. É higiene do shell base. A Onda 2 vai construir telas em cima dessa moldura; construir mais telas sem shell só aumenta o retrabalho.
2. O custo é baixo e o efeito propaga de graça. O Sidebar e o AppShell são compartilhados: preencher os ícones uma vez na lista padrão do design system faz TODAS as telas (Visão Geral, Eventos, Clubes, Plataforma e as futuras) ganharem ícones sem tocar em cada tela.
3. Duas telas já entregues (Eventos, Clubes) estão violando o Definition of Done. Isso é dívida, não feature nova.

### Lote proposto (3 tasks, pequeno)

| Task | O quê | Esforço |
|---|---|---|
| T1 — Layout raiz | Mover o AppShell para um layout raiz do painel envolvendo todas as rotas (App.tsx), em vez de cada área montar (ou esquecer de montar) o seu. Eventos e Clubes ganham o menu fixo automaticamente. | ~meio dia |
| T2 — Ícones no DS | Adicionar `lucide-react` como dependência (peer) do design system e preencher os 8 ícones no DEFAULT_SIDEBAR_SECTIONS conforme a tabela do doc de IA. Remover os `icon: null` do painel. | ~2h |
| T3 — Anatomia completa do sidebar (opcional) | Topo com logotipo e rodapé com card de upgrade + avatar + nome + cargo, conforme o mockup original. Não bloqueia nada. | Onda 2 |

T1 e T2 entram como higiene agora. T3 pode esperar a Onda 2 sem prejuízo.

### Risco

Baixo. T2 é aditivo (só preenche um slot que já existe). T1 mexe na composição de rotas, então pede um smoke test navegando pelas 4 áreas depois da mudança. Nenhuma alteração de token ou de API de componente.

## 5. Como fica na prática (esboço UX)

Com o lote aplicado, ao navegar entre qualquer área o menu fica travado à esquerda, sempre visível; só o conteúdo troca e rola. Cada item ganha seu ícone Lucide 24x24, seguindo o mapeamento já validado no doc de IA do Be Hero:

| Área | Ícone Lucide |
|---|---|
| Visão Geral | LayoutDashboard |
| Eventos | CalendarDays |
| Clubs | UsersRound |
| Financeiro | TrendingUp |
| Relatórios | BarChart3 |
| Comunicação | Bell |
| Serviços/Negócios | Briefcase |
| Configurações | Settings |

Bônus imediato: o modo colapsado (64px, só ícones) passa a funcionar, o que hoje é impossível.
