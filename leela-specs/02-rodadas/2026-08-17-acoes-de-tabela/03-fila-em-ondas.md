# Ações de tabela por ícone · fila em ondas

> Decisão do dono em 2026-08-17, na íntegra: *"E nas ações, de tabelas, quero que ao invés de
> escritos, utilzemos ícones de ação, que ao clicar, abrimos modais, ou direcionamos para páginas.
> Como por exemplo 'detalhes'."*
>
> **O corte está declarado, e é isso que este arquivo existe para fazer.** O inventário mediu
> **39 ações em 20 sítios** (contagem da catraca; a leitura manual chega a 40 porque conta duas
> vezes a coluna que duas tabelas compartilham). A lane converteu **os 15 de Eventos** e deixou
> **24 em fila**. Converter os 39 num commit só não caberia numa revisão honesta — e a alternativa
> silenciosa, que é converter metade e não dizer, é a que a L-021 existe para impedir.

## Por que Eventos primeiro

Os mesmos três critérios do roadmap de 11/08: job servido ganha de dependência, que ganha de
densidade. Eventos é a superfície **de operação diária** — 04.1 *"vendo inscrições chegarem"* e
*"me inscrever em poucos cliques"*. É onde a mudança de padrão aparece para quem usa o produto
todo dia, e é o lugar certo para o padrão provar que serve antes de varrer o administrativo.

A fila abaixo é toda de área **administrativa ou de gestão**, usada por menos gente e com menos
frequência. Nenhuma onda depende de peça nova: o `RowActions` já está no DS, com vocabulário
fechado, story e teste. O que falta é execução.

## Fila

| Onda | O que serve | Sítios | Ações | Estado |
|---|---|---:|---:|---|
| **A0** | ✅ **feita nesta lane** — 04.1, operação do evento | 7 | 15 | concluída |
| **A1** | 04.4 *"comunidade com rosto e nome"* + parcerias | 4 | 8 | livre |
| **A2** | 04.1 *"processo repasse"* — dinheiro administrativo | 3 | 8 | livre |
| **A3** | plataforma — cadastro, acesso e visão macro | 6 | 8 | livre |

Total em fila: **24 ações em 13 sítios**. Cada onda é meia lane; nenhuma bloqueia a outra.

### A0 · Eventos (concluída)

| Arquivo | Ações |
|---|---:|
| `routes/eventos/lotes/LotesView.tsx` | 4 |
| `routes/eventos/pagina-vendas/_components/CuponsSection.tsx` | 3 |
| `routes/eventos/afiliados/AfiliadosPage.tsx` | 2 |
| `routes/eventos/financeiro/ReembolsosView.tsx` | 2 |
| `routes/eventos/inscritos/InscritosView.tsx` | 2 |
| `routes/eventos/kits/DistribuicaoView.tsx` | 1 |
| `routes/eventos/repasses/_components/HistoricoRepasses.tsx` | 1 |

### A1 · Clubes e parcerias

| Arquivo | Ações | Verbos previstos |
|---|---:|---|
| `routes/clubes/clube/parcerias/ParceriasView.tsx` | 3 | `copiar`, `ver`, `remover` |
| `routes/parcerias/afiliacoes/InfluenciadoresPage.tsx` | 2 | `ver`, `registrar` |
| `routes/parcerias/assessorias/AssessoriasPage.tsx` | 2 | `abrir`, `desativar` |
| `routes/parcerias/marcas/MarcasPage.tsx` | 1 | `editar` |

`MarcasPage` declara a ação como **coluna** (`key: 'acoes'`), não por `renderActions` — a catraca já
enxerga as duas formas, mas quem converter precisa saber que o alvo não está onde o hábito manda.

### A2 · Repasses e estornos

| Arquivo | Ações | Verbos previstos |
|---|---:|---|
| `routes/plataforma/repasses/RepassesFilaView.tsx` | 3 | `aprovar`, `recusar`, `registrar` |
| `routes/plataforma/tenants/_components/RepassesDoTenant.tsx` | 3 | `aprovar`, `recusar`, `registrar` |
| `routes/plataforma/estornos/EstornosFilaView.tsx` | 2 | `aprovar`, `recusar` |

**As duas telas de repasse têm a MESMA tripla de ações** e hoje a escrevem separadas. Quem pegar
esta onda decide, com a medição na mão, se elas viram um helper compartilhado — e se virar, o helper
é do painel, não do DS: o `RowActions` já é o componente, e uma segunda peça em cima dele seria a
duplicata batizada que a L-021 nomeia.

Atenção em `EstornosFilaView`: a célula de ações também hospeda um `<span>` de aviso *"Fecha sozinho
quando o gateway confirmar"*, que **não é ação** e não entra no `RowActions`.

### A3 · Plataforma

| Arquivo | Ações | Verbos previstos |
|---|---:|---|
| `routes/plataforma/planos/PlanosView.tsx` | 2 | `editar`, `aplicar` |
| `routes/plataforma/convites/ConvitesView.tsx` | 2 | `copiar`, `revogar` |
| `routes/plataforma/tenants/TenantsList.tsx` | 1 | `abrir` |
| `routes/plataforma/tenants/ClientesTab.tsx` | 1 | `ver` |
| `routes/plataforma/contas/ContasRoute.tsx` | 1 | `liberar` |
| `routes/plataforma/macro/MacroDashboard.tsx` | 1 | `abrir` |

`ContasRoute` tem uma segunda ação (`identificar`, verbo `identificar`) numa coluna **compartilhada
por duas tabelas** — converter uma vez paga as duas. `ClientesTab` também declara por coluna
(`key: 'ficha'`).

## O que trava a regressão enquanto a fila não anda

A catraca `acao-de-tabela-em-texto` do `scripts/gate-canon.mjs` mede as ações que ainda estão em
texto e **só desce**. Baseline armado em 39 (painel) / 0 (landing) e derrubado para 24 pela A0. Uma
tabela nova que nasça com `<Button>Detalhes</Button>` faz o número subir, e o gate reprova — que é
o mecanismo que impediu esta fila de virar uma lista que ninguém executa.

A régua olha dentro de **dois** lugares, porque o inventário achou as ações declaradas de dois
jeitos: o slot `renderActions` do `Table` e a coluna comum com `key` de ação
(`acao` · `acoes` · `ficha` · `identificacao`). Uma régua presa ao `renderActions` não veria quatro
tabelas, e a fila nasceria mentindo sobre o próprio tamanho.

## Onde o resto mora

| Assunto | Documento |
|---|---|
| A peça e o vocabulário fechado verbo→ícone | `03-canon/canone-de-componentes.md` §7 |
| Fonte do vocabulário | `packages/design-system/src/components/RowActions/RowActions.tsx` |
| Contrato visual dos 16 verbos | story `Organismos/RowActions` → `Vocabulario` |
| Molde desta fila | `02-rodadas/2026-08-12-conformidade-controles/03-fila-em-ondas.md` |
