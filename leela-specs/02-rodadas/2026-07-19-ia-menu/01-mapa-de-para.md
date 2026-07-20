---
tags: [leela, rodada, ia-menu, navegacao, de-para]
aliases: [Mapa DE-PARA do menu, Para onde foi cada tela]
trace: leela-build-2d6ee98d
lote: IA-MENU
data: 2026-07-19
---

# 01 · Mapa DE → PARA

> Cada linha diz de onde a coisa saiu, para onde vai e o que a execução tem de fazer para não quebrar nada no caminho. Decisão em [[00-decisao]]; execução em [[02-fila-codigo]].

## Menu principal

| DE (hoje) | PARA (novo) | Nota |
|---|---|---|
| `visao-geral` → `/` | inalterado | — |
| `eventos` → `/eventos` | `eventos` → `/eventos` **com SubNav** (Eventos \| Repasses) | ganha subdivisão |
| `clubs` → `/clubes` | inalterado | a subdivisão de repasses do clube nasce só quando o clube pago existir |
| `financeiro` → `/financeiro` | **deixa de existir** | os dois filhos se mudaram |
| `comunicacao` → `/crm` | `crm`, rótulo **CRM** → `/crm` | mesmo destino, id e rótulo novos |
| `marcas` → `/marcas` | inalterado | — |
| `analytics` (sem rota, suprimido no painel) | **deixa de existir** | sai do `DEFAULT_SIDEBAR_SECTIONS` do DS; `IDS_SUPRIMIDOS` morre junto |
| `configuracoes` (sem rota, inerte) | `configuracoes` → `/conta` | deixa de ser inerte: é onde passam a viver os dados de recebimento (RN-366), e a RN-233 proíbe item sem rota |

**Resultado:** 6 itens. OPERAÇÃO = Visão geral · Eventos · Clubs · CRM · Marcas; CONTA = Configurações.

## Rotas

| DE (rota atual) | PARA (rota nova) | O que acontece com a tela | Redirect |
|---|---|---|---|
| `/financeiro` (índice · `AnaliseVendasPage`) | `/crm` (índice · Visão geral) | a tela migra inteira: `AnaliseVendasPage` + `AnaliseVendasView` + `CohortIdadeSexo` + `_lib/{demografia,desempenho,modalidades}` + `_data/analise` + testes | `/financeiro` → `/crm` |
| `/financeiro/repasses` (`RepassesPage`) | `/eventos/repasses` | a tela migra inteira: `RepassesPage` + `RepassesView` + `_data/{repasses,repassesPorEvento}` + `_lib/erros` + testes | `/financeiro/repasses` → `/eventos/repasses` |
| `/financeiro/*` (qualquer outro) | — | 404 do módulo deixa de existir junto com o módulo | `/financeiro/*` → `/crm` |
| `/crm` (índice · `ClientesPage`) | `/crm/clientes` | mesma tela, um nível abaixo | `/crm` passa a ser a Visão geral (ver linha 1) |
| `/crm/:clienteKey` (`ClienteDetailPage`) | `/crm/clientes/:clienteKey` | mesma tela, um nível abaixo | `/crm/:algumaCoisa` → `/crm/clientes/:algumaCoisa`, **só** quando o segmento não é `clientes`, `comunicacao` nem `visao-geral` |
| — (não existe) | `/crm/comunicacao` | superfície nova, entregue pelo E19 · S1901-T4c; nesta rodada nasce como estado honesto ("ainda não disponível"), nunca como tela vazia fingindo funcionar | — |
| `/eventos` (índice · hub/lista) | `/eventos` (índice, dentro de um layout com SubNav) | a lista não muda; ganha a moldura | — |
| `/eventos/:slug/financeiro` (SubNav Resumo \| Reembolsos) | **mesma URL**, SubNav **Caixa** \| Reembolsos | rótulo muda e a tela ganha a linha de repasse **daquele** evento (fecha a lacuna da RN-349 do lado do evento); `RequirePapel area="financeiro"` intacto | — |
| `/conta` (`ContaPage`, sem entrada no menu) | `/conta` — destino do item **Configurações**, com a seção **Dados de recebimento** | recebe a `DadosBancariosSection` que hoje mora dentro de Repasses (RN-354 inalterada: só o mascarado volta do servidor) | — |
| `/eventos/:slug/comunicacao` (E06) | inalterado | a comunicação por evento não se move | — |
| `/clubes/*` comunicados (E05) | inalterado | a comunicação por clube não se move | — |

### Por que os redirects não são opcionais

O Vitor usa o preview local com URL na mão, e há links salvos apontando para `/financeiro`. Um redirect ausente não dá erro visível no build — dá 404 na cara de quem clicou. Cada redirect da tabela acima é um **teste de rota**, não uma boa intenção.

A armadilha específica é `/crm/:clienteKey`: a rota legada casa com qualquer segmento, inclusive `clientes` e `comunicacao`. A ordem de declaração tem de colocar as subdivisões nomeadas **antes** do parâmetro, e o teste tem de provar que `/crm/clientes` abre a lista e não um redirect em laço.

## Arquivos

| DE | PARA | Tipo de mudança |
|---|---|---|
| `packages/design-system/src/components/Sidebar/Sidebar.tsx` (itens default) | idem | remove `financeiro` e `analytics`; `comunicacao` vira `crm` / "CRM" |
| `packages/design-system/src/components/Sidebar/{Sidebar.stories.tsx, Sidebar.docs.mdx, LLM.txt, __tests__}` | idem | reconciliar o inventário de 8 itens para 6 |
| `apps/painel/src/shell/sidebar.ts` | idem | `HREF_POR_ID` (sai `financeiro`, entra `crm`), `painelActiveId` (`/crm` → `crm`, some `/financeiro`), `IDS_SUPRIMIDOS` deletado |
| `apps/painel/src/App.tsx` | idem | sai `<Route path="/financeiro/*">`; entram os redirects legados |
| `apps/painel/src/routes/financeiro/analise/**` | `apps/painel/src/routes/crm/visao-geral/**` | move |
| `apps/painel/src/routes/financeiro/repasses/**` | `apps/painel/src/routes/eventos/repasses/**` | move |
| `apps/painel/src/routes/financeiro/_data/session.ts` (+ teste) | `apps/painel/src/routes/eventos/repasses/_data/session.ts` | move; a Visão geral passa a usar o `crm/_data/session.ts` que já existe (mesmo contrato: `status`/`uid`/`tenantId`) |
| `apps/painel/src/routes/financeiro/_components/FinanceiroSubNav.tsx` (+ teste) | `apps/painel/src/routes/crm/_components/CrmSubNav.tsx` | reescrito para 3 abas |
| `apps/painel/src/routes/financeiro/FinanceiroRoutes.tsx` | — | deletado |
| `apps/painel/src/routes/crm/CrmRoutes.tsx` | idem | ganha `CrmLayout` + as 3 subdivisões |
| — | `apps/painel/src/routes/eventos/EventosHubLayout.tsx` | novo: SubNav Eventos \| Repasses sobre `/eventos` e `/eventos/repasses` |
| `apps/painel/src/routes/eventos/financeiro/FinanceiroLayout.tsx` + `FinanceiroView.tsx` | idem | rótulo "Resumo" → "Caixa"; linha de repasse do evento |
| `.../repasses/DadosBancariosSection` (dentro de `RepassesView`) | `apps/painel/src/routes/conta/recebimento/**` | move a seção; `useDadosBancarios`/`useSaveDadosBancarios` continuam os mesmos |

### Detalhe que a execução precisa ver antes de mover

`useFinanceiroSession` é consumido pelas **duas** telas que se separam (`AnaliseVendasPage` e `RepassesPage`). Como `crm/_data/session.ts` já existe com o mesmo contrato, a saída limpa é: a Visão geral passa a importar o hook do CRM; o hook de financeiro viaja junto com Repasses. Nenhum arquivo fica órfão e nenhuma cópia nova nasce — o inventário antes de codar é obrigatório aqui.

### A dependência escondida do saque

Hoje o modal de solicitar repasse só é montado quando existem dados bancários salvos — o formulário está a dois centímetros do botão, então a checagem é trivial. Com o cadastro em Configurações, essa proximidade acaba. A tela de Repasses continua exigindo o mesmo pré-requisito, e quando ele faltar mostra o caminho ("cadastre seus dados de recebimento em Configurações") em vez de abrir um modal que o servidor recusaria. A regra do servidor não muda; muda quem avisa.

## O que continua exatamente igual

- Todos os agregados, callables e Rules. Esta rodada é de navegação; **nenhum contrato de dado muda**.
- A matriz de papéis do evento (`RequirePapel`). A aba Caixa mantém `area="financeiro"`.
- A comunicação por evento (E06) e por clube (E05).
- A supressão k=5 do cohort idade × sexo e a nota de cobertura honesta viajam com a tela, sem uma vírgula de diferença. Se um teste do cohort precisou mudar de asserção durante o move, o move deixou de ser um move — e isso é motivo de reprovação no gate.
