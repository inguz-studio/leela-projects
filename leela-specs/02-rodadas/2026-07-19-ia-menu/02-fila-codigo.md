---
tags: [leela, rodada, ia-menu, fila, execucao]
aliases: [Fila de código da IA do menu, Lote IA-MENU]
trace: leela-build-2d6ee98d
lote: IA-MENU
data: 2026-07-19
---

# 02 · Fila de código — lote IA-MENU

> Tarefas 1-PR, com território de arquivos, dependência, rota de modelo e gate de aceite. Esta lane **não implementou nada**; cada linha vira um brief de execução. Mapa das mudanças em [[01-mapa-de-para]].

## Regras da casa que valem em todas as tarefas

- **Reaproveitar antes de criar.** Toda tarefa começa inventariando o que já existe (SubNav do DS, `useFinanceiroSession`/`useCrmSession`, `AppErrorBoundary`, `NotFound`). O report da tarefa diz o que foi reaproveitado e o que foi criado.
- **shadcn/DS-first.** Nenhum componente feito à mão quando existe o oficial. Tokens semânticos, nunca hex nem px cru.
- **AA por estado.** Contraste conferido em repouso, hover, foco e ativo — não só no estado padrão.
- **SubNav no padrão §2.14** — underline 2px na aba ativa, divisória, rolagem lateral própria em tela estreita. É o mesmo componente do DS que Eventos, Clubs e o antigo Financeiro já usam.
- **Preview local intocado.** Há emulador em 8180/9198 e painel em 5273 rodando enquanto o Vitor olha. Nenhuma tarefa deste lote sobe emulador nem mexe em porta.
- **Nada de contrato de dado.** Se uma tarefa deste lote precisar tocar `functions/`, `firestore.rules` ou um callable, ela está fora do escopo e volta para a spec.

## As tarefas

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 1 | `IAM-T1` · menu de 6 áreas | remove `financeiro` e `analytics` dos itens default do DS, renomeia `comunicacao` → `crm` (rótulo "CRM"); no painel, atualiza `HREF_POR_ID` e `painelActiveId` e deleta `IDS_SUPRIMIDOS`; reconcilia stories, docs e `LLM.txt` do Sidebar | `packages/design-system/src/components/Sidebar/**` · `apps/painel/src/shell/sidebar.ts` | — | **sonnet** | — |
| 2 | `IAM-T2` · análise vira CRM › Visão geral | move `routes/financeiro/analise/**` para `routes/crm/visao-geral/**` sem alterar comportamento; a página passa a usar `crm/_data/session.ts` | `apps/painel/src/routes/financeiro/analise` → `apps/painel/src/routes/crm/visao-geral` | — | **opus** xhigh | ⚔ |
| 3 | `IAM-T3` · CRM ganha as 3 subdivisões | `CrmLayout` + `CrmSubNav` (Visão geral \| Clientes \| Comunicação); `/crm` índice = Visão geral, `/crm/clientes` = lista, `/crm/clientes/:clienteKey` = ficha, `/crm/comunicacao` = estado honesto até o E19 · S1901-T4c | `apps/painel/src/routes/crm/**` | T2 | **opus** xhigh | ⚔ |
| 4 | `IAM-T4` · repasses viram subdivisão de Eventos | `EventosHubLayout` com SubNav (Eventos \| Repasses) sobre `/eventos`; move `routes/financeiro/repasses/**` e o hook de sessão para `routes/eventos/repasses/**`; a rota `/eventos/repasses` nasce fora de `:slug` | `apps/painel/src/routes/eventos/**` · `apps/painel/src/routes/financeiro/repasses` | — | **opus** xhigh | ⚔ |
| 5 | `IAM-T5` · dados de recebimento em Configurações | move a `DadosBancariosSection` de Repasses para `/conta` (Dados de recebimento); o item `configuracoes` do menu ganha destino; Repasses passa a checar o pré-requisito e a apontar o caminho quando faltar, em vez de esconder o botão | `apps/painel/src/routes/conta/recebimento/**` · `apps/painel/src/routes/eventos/repasses` · `apps/painel/src/shell/sidebar.ts` | T4 | **opus** xhigh | ⚔ |
| 6 | `IAM-T6` · rotas antigas não quebram | redirects `/financeiro` → `/crm`, `/financeiro/repasses` → `/eventos/repasses`, `/financeiro/*` → `/crm`, `/crm/:legado` → `/crm/clientes/:legado`; remove o módulo `financeiro` do `App.tsx` | `apps/painel/src/App.tsx` · `apps/painel/src/routes/_system/` | T3, T4 | **sonnet** | — |
| 7 | `IAM-T7` · Caixa do evento com o repasse daquele evento | rótulo "Resumo" → "Caixa"; a tela passa a mostrar a linha de repasse **do próprio evento**, lendo o reader `repassesPorEvento` que já existe (RN-349, fim do "repassado R$ 0,00" genérico), com atalho para a visão macro; URL e `area="financeiro"` intactas | `apps/painel/src/routes/eventos/financeiro/**` | T4 | **opus** xhigh | ⚔ |

⚔ = review antagonista em contexto fresco antes do merge.

## Por que cada rota de modelo

**T2, T3 e T4 são opus xhigh porque tocam dinheiro ou PII, não porque são grandes.**

- **T2** move a tela que exibe receita, ticket e o cohort idade × sexo com supressão k=5. Um "move" que perde a supressão, a nota de cobertura ou a exclusão do `aguardandoReprocesso` vira exposição de dado demográfico e número financeiro errado — nenhum linter pega isso.
- **T3** coloca, sob a mesma casca de menu, o agregado sem identidade (RN-820/822) e a identidade individual (RN-172). A fronteira entre as duas camadas passa a ser uma decisão de layout, e layout que borra fronteira de dado é como vazamento começa. O gate de PII/LGPD que o E19 já exige por regra própria continua valendo aqui.
- **T4** move saldo, dados bancários e o botão de saque. É a superfície onde o organizador tira dinheiro do sistema.

**T5 e T7 entraram em opus xhigh depois da ratificação do Vitor.** T5 tira o cadastro bancário de perto do botão de saque — o pré-requisito do repasse deixa de ser garantido por proximidade e passa a ser garantido de propósito; errar isso é abrir um modal de saque que o servidor vai recusar, na tela onde a pessoa tira dinheiro. T7 põe número de repasse dentro da tela de um evento específico, e número de dinheiro no lugar errado é o pior modo de falha que este painel tem.

**T1 e T6 são sonnet porque têm gate determinístico real** — a suíte do Sidebar e a suíte de rotas provam o resultado sem juízo humano. **Nenhuma é haiku**: T1 mexe num componente compartilhado com stories, docs e `LLM.txt` para reconciliar (não é troca de string); T6 é a tarefa cuja falha silenciosa é justamente o 404 que ninguém vê no build.

## Ordem e paralelismo

```
IAM-T1 (menu) ──────────────────────────────────────────────┐
IAM-T2 (análise → CRM) ──► IAM-T3 (CRM 3 subdivisões) ───────┤
IAM-T4 (repasses → Eventos) ──┬──► IAM-T5 (dados de recebimento) ──┴──► IAM-T6 (redirects)
                              └──► IAM-T7 (Caixa do evento)
```

T1, T2 e T4 correm em paralelo (territórios disjuntos: design system, `routes/crm`, `routes/eventos`). T6 é a última porque só faz sentido quando os destinos existem. T5 e T7 dependem só de T4, e correm em paralelo entre si.

**Conflito de território a vigiar:** T2 e T4 esvaziam o mesmo diretório (`routes/financeiro`), mas em ramos diferentes dele. T2 leva `analise/`; T4 leva `repasses/` e `_data/session.ts`. Quem chegar por último apaga `FinanceiroRoutes.tsx` e `_components/FinanceiroSubNav.tsx` — combinado explicitamente no brief das duas, para não haver arquivo órfão nem deleção duplicada.

## Gates de aceite

### Valem para o lote inteiro

- [ ] `tsc` e `eslint` zerados em `packages/design-system` e `apps/painel`
- [ ] suíte do painel verde **sem asserção reescrita** nas telas movidas — se um teste de `AnaliseVendasView`, `CohortIdadeSexo`, `RepassesView`, `ClientesPage` ou `ClienteDetailPage` precisou mudar de expectativa, o move alterou comportamento e o gate reprova
- [ ] nenhum arquivo em `apps/painel/src/routes/financeiro/` ao final do lote
- [ ] nenhuma alteração em `functions/`, `firestore.rules`, `packages/core` ou `packages/api-client`
- [ ] emulador e painel do preview local não foram tocados

### Por tarefa

**T1** — a sidebar renderiza 6 itens; nenhum item sem rota; `/crm` marca "CRM" como ativo; `/financeiro` (durante a janela em que ainda responde) não marca nada; stories e docs do Sidebar batem com o inventário novo.

**T2** — a Visão geral abre em `/crm` com os mesmos quatro blocos de hoje; o cohort continua suprimindo célula com menos de 5 pessoas e continua arrastando a linha companheira; a nota de cobertura honesta continua no lugar; o filtro por evento e o seletor temporal seguem com o mesmo comportamento (inclusive a lacuna declarada).

**T3** — as três abas navegam e a ativa deriva do pathname; `/crm/clientes` abre a lista (nunca cai no redirect legado); a ficha individual abre por `/crm/clientes/{chave}`; `/crm/comunicacao` mostra estado honesto, nunca tela vazia parecendo funcional; contraste AA conferido nos quatro estados da SubNav.

**T4** — `/eventos` mantém a lista intacta sob a SubNav nova; `/eventos/repasses` mostra saldo, saque, a quebra por evento (RN-349) e o consolidado declarado (RN-358) exatamente como hoje; a rota não colide com `/eventos/{slug}` (teste explícito com um evento de slug `repasses`, resolvendo para a subdivisão — a precedência declarada e testada, nunca deixada ao acaso).

**T5** — o cadastro bancário abre em `/conta` e salva pelo mesmo callable, devolvendo só o mascarado (RN-354 intacta); em Repasses, sem dados salvos, o caminho para Configurações aparece e o modal de saque não abre; com dados salvos, o saque funciona igual a hoje, inclusive a escolha do evento (RN-349); o item Configurações do menu leva a `/conta`.

**T6** — cada redirect do mapa tem um teste; `/financeiro/repasses` cai em `/eventos/repasses` (não em `/crm`); `/crm/clientes` não redireciona; nenhum laço de redirecionamento.

**T7** — a aba lê "Caixa"; a URL não mudou; o teste da matriz de papéis passa **sem edição**; a linha de repasse do evento vem do reader existente e bate com o mesmo número que a linha daquele evento mostra em `/eventos/repasses` (reconciliação entre as duas telas, não recálculo); sem repasse, estado honesto — nunca R$ 0,00 sugerindo que houve movimento; o atalho para a visão macro aparece para quem tem acesso a repasse e some para quem não tem.

## Não-cards e dependências

- **Nada nesta lane espera decisão do Vitor.** Os três pontos que iam voltar como pergunta foram ratificados em 2026-07-19 e estão em [[00-decisao]] §5 a §8.
- **Repasses do clube pago** não têm card. Nascem quando o clube pago existir; o desenho por origem é o que garante que essa entrada não vai exigir demolição — e o cadastro bancário único (T5) é o que garante que ela não vai duplicar dado do titular.
- **`/crm/comunicacao` de verdade** é o E19 · S1901-T4a/T4b/T4c, que continua travado na chave do Brevo. T3 entrega só a casca honesta.
