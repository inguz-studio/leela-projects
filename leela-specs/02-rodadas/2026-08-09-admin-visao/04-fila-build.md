---
tags: [leela, fila, build, rodada, admin, plataforma, super-admin, ondas]
trace: leela-admin-visao-20260809
lote: SPEC-ADMIN-VISAO
data: 2026-08-09
---

# 04-fila de build · ondas, territórios e dependências

> Cada onda é dimensionada para **uma lane**. Territórios declarados para que duas lanes vizinhas não
> se encontrem no mesmo arquivo — a árvore tem lanes de código em voo, e a regra de nunca usar
> `amend`/`stash` em árvore compartilhada continua valendo.
>
> Nada aqui sobe sem a spec ter passado. As ondas 3 e 5 **não saem sem resposta do dono** aos
> vetáveis correspondentes.

## O que segura a fila antes da primeira linha

### Dependência 1 · REDESIGN-DS, e ela é maior do que parece

A decisão do dono de 09/08 é: painel do organizador com tema **brasa** e **glass ligado**; painel
admin com **glass desligado e fundo preto**, para diferenciar à primeira vista
(`02-rodadas/2026-08-09-redesign-ds/00-decisao.md`).

O mecanismo do glass é um atributo na raiz do documento: `[data-glass="on"]` no `<html>` remapeia
`--surface-raised`, `--card-blur`, `--surface-overlay`, `--elevation-2` e `--page-glow`
(`packages/design-system/src/theme/generate.ts:286-303`). **Nenhum componente lê valor cru** — o que
é a parte boa, porque significa que desligar o glass numa área não exige tocar componente algum.

A parte que precisa ficar escrita: **o painel do organizador e o painel master são a mesma
aplicação**. Vivem no mesmo `apps/painel`, sob o mesmo `RootShell`, com um `<html>` só. Alternar o
atributo por rota é possível, e é o caminho natural, mas é **decisão de mecanismo que a rodada do
REDESIGN-DS tem de tomar** — não esta.

E há um segundo passo que "glass desligado" sozinho não entrega. Desligar o glass devolve os tokens
**opacos do tema vigente**; não produz **fundo preto**. Preto é outra coisa: ou uma variante de
superfície para a subárvore `/plataforma`, ou um quarto tema. O dono escreveu "se possível", e a
decisão dele foi explícita sobre o que fazer se o mecanismo não permitir: **propor alternativa a ele,
nunca decidir outra coisa em silêncio**.

**Consequência para esta fila.** As três ondas de tela (2, 3 e 5) dependem do REDESIGN-DS ter
entregue **duas** coisas: o mecanismo de superfície por área e a definição do fundo do admin. Subir
tela antes disso significa nascer com a identidade do painel do organizador e ser retocada depois,
tela por tela — e o número de telas novas desta spec é oito.

**A onda 1 não depende disso**, porque é backend e não tem pixel. Ela pode andar em paralelo com o
REDESIGN-DS, e é por isso que está primeiro.

### Dependência 2 · S1610, para a coluna de margem

A **S1610** (custo, markup e margem do parcelamento) já está especificada, tem oito tarefas na fila e
**nenhuma construída**. Ela é dona de `platform/config.custoGateway` (T3), do carimbo do custo na
venda (T4), do registro do custo real do gateway (T5) e do módulo `economiaParcelamento.ts` (T6).

Esta spec **não a duplica e não a antecipa**. A onda 2 entrega a aba Financeiro com a coluna de
margem no estado **"custo não configurado"**, que é exatamente o que a RN-455 já manda fazer quando o
dado não existe. Quando a S1610 subir, a coluna se preenche sem tela nova.

### Dependência 3 · os vetáveis

| Onda | Espera qual veto |
|---|---|
| 1 | nenhum |
| 2 | **V-1** (o que "faturamento" nomeia na tela) |
| 3 | **V-2** (clientes: comportamento ou contato) e **V-3** (responsável) |
| 4 | nenhum |
| 5 | **V-4** (CPF no diretório) e **V-5** (gatilho do aviso e saída da liberação direta) |

## Onda 1 · A base de servidor, sem pixel

**Lane:** backend · **Territórios:** `functions/src/platform/`, `functions/src/index.ts`,
`packages/api-client/src/platform/`, `functions/src/__tests__/`
**Não toca:** `apps/painel/`, `firestore.rules`, `packages/design-system/`
**Espera:** nada. Pode sair hoje, em paralelo com o REDESIGN-DS.

| # | Tarefa | História | Por que está na onda 1 |
|---|---|---|---|
| 1.1 | Agendamento do `recomputePlatformRollups` + `atualizadoEm` no contrato de leitura (RN-531) | `S1613-T3` | O número que o dono vai ler nas ondas seguintes é o do último clique. Sem isto, a tela nova nasce mentindo com precisão |
| 1.2 | Callable `listarClientesDoTenant` (Admin SDK, autorizado por `isPlatformAdmin` do core, com registro de acesso **e** de negativa) — RN-532 | `S1612-T5` | É a única leitura desta spec que não tem caminho pelo cliente. Sem ela, a aba Clientes não existe |
| 1.3 | Leitura por tenant de eventos e clubs no `api-client`, paginada | `S1612-T2` | Base das abas; sem tela, sem risco visual |
| 1.4 | Leitura por tenant de `pedidos` + `pagamentos`, paginada | `S1613-T1` | Idem, com a economia lida do carimbo |
| 1.5 | Leitura global paginada de `eventos` e `clubes`, com contagem honesta | `S1614-T1` | Idem, para a onda 4 |
| 1.6 | Canário de Rules: `platform_admin` **segue negado** em `crmClientes` pelo client SDK | `S1612-T7` | A negação mais consequente do `firestore.rules` não tem teste. Esta onda acrescenta um callable que a contorna legitimamente; o canário garante que ninguém "resolva" o problema abrindo a Rule |

**Dimensionamento.** Seis tarefas, uma delas com Admin SDK e registro de acesso. Uma lane.

**Gate da onda.** As leituras paginadas devolvem contagem honesta (nada de total truncado
apresentado como total); o callable nega quem não é administrador e registra a negativa; o canário de
`crmClientes` passa; suíte de rules verde.

## Onda 2 · A economia do tenant na ficha

**Lane:** frontend + dinheiro · **Territórios:**
`apps/painel/src/routes/plataforma/tenants/`, `apps/painel/src/lib/query/`
**Não toca:** `functions/`, `firestore.rules`, as rotas de outros hubs
**Espera:** onda 1 (leituras) · **REDESIGN-DS** (contrato visual) · **V-1**

| # | Tarefa | História | Nota |
|---|---|---|---|
| 2.1 | SubNav da ficha + rotas filhas, sem tocar no Resumo que já está no ar | `S1612-T1` | Habilita tudo que vem depois |
| 2.2 | Aba Vendas, com economia lida do carimbo e **mode-aware** (RN-182) ⚔ | `S1613-T2` | Território de dinheiro |
| 2.3 | Aba Financeiro: faturamento (rollup + idade + recompute manual) ⚔ | `S1613-T4` | Depende de 1.1 e da resposta do V-1 |
| 2.4 | Aba Financeiro: repasses e saldo do tenant, reusando os callables e o `RegistrarPagamentoModal` | `S1613-T5` | Reaproveitamento quase total |
| 2.5 | Plano aplicado + detecção de divergência entre termo vigente e estampa (RN-534) | `S1613-T6` | Zero campo novo |

⚔ = rota opus com review antagonista, pela regra da casa para dinheiro.

**Gate da onda.** Uma venda em modo `repassada` exibe o **face cheio** como líquido do produtor, e o
caso está travado por teste; pagamento sem `conciliacao` mostra campo vazio com rótulo, nunca zero;
a coluna de margem mostra "custo não configurado" e não um número; o `atualizadoEm` do rollup aparece
e o sinal de obsolescência funciona; contraste AA em número negativo; guia visual do admin como
régua (L-011 — gate de código não prova marca).

## Onda 3 · O que o tenant produz, e para quem

**Lane:** frontend · **Territórios:** `apps/painel/src/routes/plataforma/tenants/`
**Espera:** onda 1 · onda 2 (a SubNav de 2.1) · **REDESIGN-DS** · **V-2** e **V-3**

| # | Tarefa | História |
|---|---|---|
| 3.1 | Aba Eventos do tenant | `S1612-T3` |
| 3.2 | Aba Clubs do tenant | `S1612-T4` |
| 3.3 | Aba Clientes consumindo o callable de 1.2, sem campo além do que `crmClientes` guarda | `S1612-T6` |
| 3.4 | Responsável: tipagem de `telefone`/`organizacao` no `Profissional` **ou** campo novo `Tenant.responsavel` — conforme o V-3 | `S1612` / RN-535 |

**Por que depois da onda 2.** A ordem parece invertida — produção antes de economia seria a leitura
natural. Não é: a onda 2 constrói a SubNav, e a onda 3 é a que espera dois vetos. Colocar a 3
primeiro trava a 2 atrás de decisões que não a bloqueiam.

**Gate da onda.** Nenhuma linha da aba Clubs sugere receita de clube (não existe mensalidade de clube
no modelo); a aba Clientes não exibe CPF, e-mail, telefone nem endereço quando o V-2 for
"comportamento"; EmptyState do glossário nas três abas; contador honesto.

## Onda 4 · As listas globais

**Lane:** frontend · **Territórios:** `apps/painel/src/routes/plataforma/eventos/`,
`apps/painel/src/routes/plataforma/clubs/`, `apps/painel/src/routes/plataforma/_lib/nav.ts`,
`apps/painel/src/shell/sidebar.ts`
**Espera:** onda 1 (leitura global) · **REDESIGN-DS**. **Nenhum veto.**

| # | Tarefa | História |
|---|---|---|
| 4.1 | Tela `/plataforma/eventos` (tabela densa, filtros, coluna Tenant, paginação) | `S1614-T2` |
| 4.2 | Tela `/plataforma/clubs` | `S1614-T3` |
| 4.3 | Dois itens novos no `PLATFORM_NAV` + ícones Lucide + `activeNavId` | `S1614-T4` |

**Território compartilhado, e o cuidado.** `nav.ts` e `sidebar.ts` são arquivos que qualquer lane de
plataforma encosta. A 4.3 é a única tarefa desta rodada que os toca, e ela fecha a onda — se outra
lane estiver mexendo em navegação, esta espera.

**Gate da onda.** O contador nunca apresenta total truncado como total do sistema; filtro por tenant
e por status funciona com o contador acompanhando; 403 para quem não é administrador; nenhuma
tentativa de `collectionGroup` no código (a Rule não existe e o erro pareceria falta de índice).

## Onda 5 · O diretório de contas

**Lane:** fullstack · **Territórios:** `apps/painel/src/routes/plataforma/contas/`,
`functions/src/platform/`, `functions/src/__tests__/`
**Espera:** onda 1 · **REDESIGN-DS** · **V-4 e V-5** · e, para a metade de PII, a leitura do
**LGPD-1**

| # | Tarefa | História |
|---|---|---|
| 5.1 | Leitura do diretório (`profissionais` + `atletas`), paginada, campos mínimos — RN-533 | `S1615-T1` |
| 5.2 | Tela `/plataforma/contas`, dois modos, Fila como padrão | `S1615-T2` |
| 5.3 | Liberação direta como Function guardada, com registro de acesso e de negativa | `S1615-T3` |
| 5.4 | Delta na RN-510 conforme a resposta do V-5 | `S1615-T4` |
| 5.5 | Teste de Rules com crachá de administrador: `pessoas` segue negada; `collectionGroup` segue negado | `S1615-T5` |

**Por que é a última.** É a única frente que concentra PII de todo mundo numa superfície, é a única
que depende de dois vetos ao mesmo tempo, e é a única que pode mexer numa regra que está no ar e foi
medida há um dia (RN-510). Nenhuma das outras quatro ondas espera por ela.

**Gate da onda.** Não existe export, CSV nem download em lugar nenhum da tela; CPF não aparece
(salvo veto explícito no V-4, e nesse caso por callable auditado); a liberação direta passa por
Function e registra; o teste de `pessoas` com crachá de administrador prova a negação.

## Fora das ondas · a dívida da claim

**Item próprio, sem carona.** As Rules aceitam duas pernas de administrador
(`role == 'platform_admin'` **ou** `platformAdmin == true`, `firestore.rules:73-77`) e o core faz o
mesmo (`isPlatformAdmin`, `packages/core/src/platform/roles.ts:131`). As guardas de callable, quase
todas, comparam `claims.role` na mão — `assertPlatformAdmin`
(`functions/src/finance/atores.ts:45`), `aplicarPlano`, `setTaxaPlataformaGlobal`,
`transitionTenant`, `provisionTenant`, `recomputePlatformRollups`.

Uma conta com capacidade e sem o papel legado **lê** tudo e **é barrada** em quase toda escrita. Não
bloqueia esta rodada (a conta do dono tem o papel legado), e por isso não entra em onda nenhuma —
mas encosta em todas, porque cada onda acrescenta leitura e ação na mesma superfície. Vira card
próprio no board, sem prioridade cravada por esta lane.

## Resumo executável

| Onda | Lane | Espera | Tarefas | Território principal |
|---|---|---|---|---|
| 1 · base de servidor | backend | — | 6 | `functions/src/platform/`, `packages/api-client/src/platform/` |
| 2 · economia do tenant | frontend + dinheiro ⚔ | 1 · DS · V-1 | 5 | `routes/plataforma/tenants/` |
| 3 · produção e pessoas | frontend | 1 · 2 · DS · V-2 · V-3 | 4 | `routes/plataforma/tenants/` |
| 4 · listas globais | frontend | 1 · DS | 3 | `routes/plataforma/eventos\|clubs/`, `nav.ts` |
| 5 · diretório de contas | fullstack | 1 · DS · V-4 · V-5 · LGPD-1 | 5 | `routes/plataforma/contas/`, `functions/src/platform/` |

**Vinte e três tarefas, cinco lanes.** A onda 1 sai sem esperar nada. As quatro seguintes esperam o
REDESIGN-DS, e três delas esperam o dono.
