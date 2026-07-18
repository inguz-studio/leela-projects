# Plano shadcn + sidebar fixa — recomendação de decisão

> Data: 2026-07-05
> Autor: liderança de design system LEELA
> Insumos: análise do projeto de referência (WEB-APPV2 + docs Be Hero), auditoria de compatibilidade shadcn x DS brasa, análise de impacto no shell do painel
> Decide: Vitor

---

## 1. Resposta direta

**Sim, dá para adotar shadcn sem jogar fora nada do E01. E é adição, não reescrita.**

O motivo é simples: o E01 já foi construído com as mesmas peças que o shadcn usa por dentro. O shadcn não é uma biblioteca que se instala, é um catálogo de componentes que se copia para o projeto, e esses componentes são feitos de Radix (comportamento), Tailwind (estilo) e uma função utilitária chamada `cn()`. As três coisas já existem no nosso design system, e componentes como Button, Modal e Tabs já são, na prática, indistinguíveis de componentes shadcn. Até o arquivo de configuração do shadcn (`components.json`) já existe no painel, só nunca foi usado.

Um achado de honestidade que importa: o projeto de referência (os mockups "Painel do Organizador") **não usa shadcn de verdade**. São telas estáticas de HTML e CSS feitas à mão que imitam o visual shadcn e os ícones Lucide. Isso não muda o plano, muda o papel dos mockups: eles são o **contrato visual** (cores, espaçamentos, comportamento do menu), não código para copiar. A documentação do Be Hero, essa sim, pede Lucide como biblioteca de ícones e já mapeia cada item do menu a um ícone com nome.

O único vão real entre o shadcn e o nosso tema brasa é de tradução de nomes: o shadcn procura variáveis chamadas `--background`, `--primary`, `--ring`; as nossas se chamam `--surface-base`, `--action-primary`, `--border-focus`. É uma camada fina de apelidos (~15 linhas de CSS + ~15 entradas na configuração do Tailwind), gerada pelo nosso pipeline de tokens para valer nos dois temas. Sem ela, qualquer componente shadcn nasce cinza. Com ela, nasce brasa de fábrica.

## 2. Estratégia recomendada: opção C

As três opções na mesa:

| Opção | O que é | Veredito |
|---|---|---|
| A | Adotar shadcn ao lado e migrar tela a tela | Desnecessária: não há o que migrar, o E01 já segue o padrão |
| B | Rebase do E01 sobre shadcn | Perigosa: reescreve o que já passou no gate sem ganho funcional |
| **C** | **Só o que foi pedido: sidebar fixa com ícones + configurar o shadcn para os próximos componentes nascerem shadcn+brasa** | **Recomendada** |

**Por que C.** O gate do E01 já foi pago: 502 testes passando, 48 pares de contraste AA validados, ~33 telas auditadas usando esses componentes. A opção B jogaria esse investimento fora para trocar componentes aprovados por cópias genéricas que reintroduzem cores hardcoded (bloqueadas pelo nosso ESLint) e furam a matriz de contraste, uma regressão de acessibilidade silenciosa. A opção A resolve um problema que não existe: não há "lado antigo" para migrar, porque o DS já é arquiteturalmente shadcn.

A opção C entrega exatamente o valor pedido com o menor risco: o menu vira o dos mockups, e todo componente novo daqui em diante (DropdownMenu, Tooltip, Sheet, Command...) pode ser gerado pelo CLI do shadcn e sair com cara brasa, dentro das regras do DS.

**"Adotar shadcn" no LEELA passa a significar:** usar o padrão shadcn (que já usamos) para componentes novos, com o CLI configurado. Não significa substituir componentes existentes.

## 3. O menu lateral

O que os mockups e a doc definem, e que vamos replicar:

- Sidebar **fixa** (sempre visível, altura da tela toda, largura fixa), fundo escuro, com ícone + texto em cada item. Não é o menu que colapsa para só ícones, e não some ao navegar: entrar num evento ou clube troca só a área principal.
- 8 itens, cada um com seu ícone Lucide já definido na doc: Visão geral (LayoutDashboard), Eventos (CalendarDays), Clubs (UsersRound), Financeiro (BarChart3), Comunicação (Bell), Marcas (Briefcase), Analytics (TrendingUp), Configurações (Settings).
- Itens agrupados por seção ("Operação" / "Conta"), badge numérico em Eventos e Comunicação, rodapé com avatar + nome.

**Não é "muda 1 arquivo, ganha 35 telas".** O shell compartilhado (AppShell + Sidebar) hoje só é montado em 2 pontos: Visão geral e Plataforma. As telas de eventos e clubes (~29) nunca tiveram sidebar; dar sidebar a elas é trabalho novo de layout, não propagação automática. Esse é o custo real escondido do pedido, e é bom que apareça agora e não no meio da Onda 2.

Há também um bug latente que vira bloqueio: hoje todos os itens de menu estão com `icon: null`. Numa sidebar com ícones, item sem ícone fica invisível. Preencher os ícones é pré-requisito, não polimento.

### Dimensionamento em tasks

**Lote A — fundação shadcn brasa (pequeno, ~4 tasks)**

1. Gerar o bloco de apelidos shadcn (`--background`, `--primary`, `--ring`, `--radius`...) no pipeline de tokens, valendo para os temas brasa e leela.
2. Adicionar as ~15 entradas de cor correspondentes no preset do Tailwind (sem deixar o CLI reescrever a config, o formato dele quebraria as nossas variáveis).
3. Apontar o `components.json` para o destino decidido (ver decisão 1) e registrar a política de colisão de nomes (ver decisão 2).
4. Prova real: gerar 1 componente novo via CLI (ex.: Tooltip), confirmar que nasce brasa, passa no ESLint de zero-hardcode e entra na matriz de contraste.

**Lote B — sidebar fixa com ícones (médio, ~6 tasks)**

1. Adotar `lucide-react` no design system (já está instalada no painel, ociosa) e mapear os 8 ícones por área usando os tokens de ícone que já existem (tamanho 24, traço 1.75).
2. Preencher os ícones nos 3 pontos que hoje passam `icon: null` (default do DS, Visão geral, Plataforma).
3. Nova variante do Sidebar: fixa, ícone + label + badge + seções + rodapé com avatar, preservando os contratos de acessibilidade (landmark "Navegação principal" e marcação de página ativa), o que mantém os testes do painel intactos.
4. Atualizar ~5 ou 6 testes do Sidebar ligados ao modo colapsável (conforme decisão 3).
5. Envolver as rotas de eventos e clubes no AppShell, verificando as ~29 telas (é aqui que mora a maior parte do esforço).
6. Gate visual: screenshots antes/depois das telas afetadas + contraste dos pares novos.

## 4. Sequência e timing

**Entra como higiene agora, antes da Onda 2.** O shell é a base de todas as telas: cada tela da Onda 2 construída sobre o shell antigo vira retrabalho depois. Fazer os dois lotes agora custa 2 lotes; fazer depois custa os mesmos 2 lotes mais o retrofit de tudo que a Onda 2 tiver produzido no meio.

Ordem: Lote A primeiro (destrava o CLI e é onde nasce a governança), Lote B em seguida. O Lote A é pequeno o bastante para rodar como lote de higiene isolado; o Lote B é um lote normal.

**O que não tocar (o gate já foi pago):**

- Button, Modal, Tabs, Badge, Toast, Avatar, Divider e demais componentes aprovados no E01. Não substituir por versões stock do shadcn. Eles já são o padrão.
- As ~33 telas que consomem esses componentes. Nenhuma reauditoria sem motivo.
- A matriz de contraste e os testes existentes do painel (o Lote B foi desenhado para preservá-los).
- O CSS artesanal dos mockups: serve de contrato visual, não se porta linha a linha.

## 5. Governança: como o brasa não se perde

Quatro travas, três delas já existentes:

1. **Apelidos gerados, nunca escritos à mão.** A camada de tradução shadcn→brasa sai do pipeline de tokens, então vale automaticamente para os dois temas e para temas futuros.
2. **ESLint zero-hardcode (já ativo, nível erro).** Qualquer componente copiado do shadcn com cor genérica (`bg-primary` stock, cinza slate) não compila o lint. Todo componente novo passa por uma adaptação curta: trocar classes stock pelas classes-token.
3. **Matriz de contraste AA.** Todo par de cor novo introduzido por componente shadcn entra na matriz (hoje 48 pares). Regra de lote: componente novo sem pares na matriz não fecha.
4. **Gate visual do harness.** Screenshot diff das telas afetadas em cada lote que toca o shell ou traz componente novo. Cobre a regressão que teste unitário não vê.

Um cuidado específico: componentes shadcn copiados às vezes trazem estilos `dark:`. No LEELA o brasa **é** o tema escuro (ativado por `data-theme`, não pela classe `dark`), então esses trechos são revisados na adaptação, não colados às cegas.

## 6. Decisões que dependem do Vitor

| # | Decisão | Recomendação |
|---|---|---|
| 1 | Onde moram os componentes gerados pelo CLI: no design system (`packages/design-system`) ou no app painel? | No design system, por causa da regra "DS obrigatório" do E01. O `components.json` atual aponta para o app e precisa ser realocado. |
| 2 | Colisão de nomes: Button, Tabs, Badge, Avatar, Table e Skeleton já existem no DS. O CLI criaria duplicatas. | Manter os nossos, usar o CLI só para componentes que ainda não existem. |
| 3 | A sidebar fixa substitui o modo colapsável atual ou os dois convivem como variantes? | Substituir. O mockup é fixo, ninguém usa o colapso em produção, e manter os dois é código e teste a mais para sempre. |
| 4 | Timing: aprovar os 2 lotes (A: fundação shadcn, B: sidebar + shell nos domínios) como higiene antes da Onda 2? | Sim. Adiar transforma custo fixo em retrofit. |
