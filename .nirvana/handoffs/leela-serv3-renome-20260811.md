---
trace: leela-redesign-v2-20260810
lane: SERV3-RENOME
alvo: branch serv3-renome (mergeada, deletada) → main · worktree C:/dev/leela-wt-serv3 (removido)
data: 2026-08-11/12
estado: CONCLUÍDA — 3 commits pagos e pushed; merge --no-ff em f1f5e95c na main; push origin/main OK; worktree removido; gates verdes; NENHUM deploy
---

# SERV3-RENOME · handoff vivo

Decisão-fonte: SERV-3, adendo da noite de 11/08 em
`leela-specs/02-rodadas/2026-08-11-decisoes-dono/03-leva6-tarde.md`. Verbatim do
dono: *"serv3 -> é somente quando falar da taxa Leela, que chamaremos 'serviço'
para referenciar o que é essa cobrança."* RN-495 (em `LEELA-E12-landing.md`) ganhou
o alcance: **"Serviço" nomeia a cobrança da Leela em TODA superfície onde ela
aparece** — comprador, organizador e super-admin. A recomendação de 09/08 de manter
"Serviço da plataforma" no super-admin foi **explicitamente derrubada** pelo
próprio texto do épico: a desambiguação vem da regra (só a taxa Leela vira
"Serviço"), sem sufixo.

## Passo 1 · re-inventário fresco (obrigatório, feito ANTES de trocar)

O inventário de 09/08 ("34 strings", tarefas 4a/4b/4c de
`02-rodadas/2026-08-05-metricas-e-servico/04-fila-codigo.md`) mirava caminhos que
o rename de Parcerias (`b51cdcd9`, 11/08) matou — `routes/marcas/*` e as entradas
de clubs foram para `routes/parcerias/*`. Grep fresco na main mergeada
(`654271d1`) por `Taxa de serviço`, `Taxa da plataforma`, `taxa Leela`, `Taxa Be
Hero` e `Serviço` (variações de caixa) em `apps/landing`, `apps/painel`,
`packages/*` e `functions/src` (e-mails incluídos).

**Resultado: nenhum dos caminhos antigos (`routes/marcas/*`) sobrevive — as
strings do renome vivem todas em território que a Parcerias NÃO tocou**
(checkout, eventos, crm, plataforma/taxa, plataforma/tenants, plataforma/estornos,
plataforma/macro). A contagem mudou não pelo rename de Parcerias, mas porque o
código evoluiu desde 08/05: `TaxaGlobalRoute.tsx` perdeu o bloco do piso (SERV-1/2
ainda não construído), `TermsEditor.tsx` ganhou uma mensagem de erro de validação
e um subtítulo que não existiam, e alguns itens do inventário antigo (nav.ts:24 →
hoje :32) só mudaram de linha.

**Contagem fresca: 24 arquivos, 26 strings de usuário trocadas** (11 comprador +
10 organizador + 15 super-admin — números diferem do "34" de 09/08 porque a régua
mudou: nem toda linha antiga sobrevive e apareceram 2 novas no super-admin
[`TermsEditor.tsx:96` erro de validação, `:210` subtítulo] que a spec de 08/05 não
podia prever).

Confirmado limpo (zero strings, igual 08/05): e-mail (`functions/src/email/*`),
PDF do ingresso, CSV financeiro/inscritos, área do cliente. `packages/core`,
`packages/api-client` e `functions/src` só têm "taxa" em JSDoc/comentários de
código e `describe`/`it` — nenhum é string de usuário, nenhum foi tocado.

## Tabela arquivo:linha → string atual → veredito

### 4a · Comprador (`apps/landing`) — 11

| Arquivo:linha | String antes | Veredito |
|---|---|---|
| StepResumo.tsx:384 | `Taxa de serviço ({meioDaTaxa})` | → `Serviço ({meioDaTaxa})` |
| StepResumo.tsx:390 | `Taxa de serviço` | → `Serviço` |
| StepConfirmacao.tsx:255 | `` `Taxa de serviço (${meioDaTaxa})` : 'Taxa de serviço' `` | → `Serviço (${meioDaTaxa})` : `Serviço` |
| StepConfirmacao.tsx:262 | `Taxa de serviço` | → `Serviço` |
| StepModalidadeKit.tsx:223 | "Este evento repassa a taxa de serviço: ela varia…" | → "…repassa o Serviço: ele varia…" |
| StepModalidadeKit.tsx:224 | "Não há taxa adicional…a taxa de serviço já está inclusa…" | → "Não há valor adicional…o Serviço já está incluso…" |
| LotesSection.tsx:36 | ` + taxa de serviço` | → ` + Serviço` |
| HeroMinimo.tsx:77 | ` + taxa de serviço` | → ` + Serviço` |
| HeroSection.tsx:114 | ` + taxa de serviço` | → ` + Serviço` |
| CheckoutCtaSection.tsx:45 | ` + taxa de serviço` | → ` + Serviço` |
| page.tsx:255 | ` + taxa de serviço` (SEO/metadata) | → ` + Serviço` |

### 4b · Organizador (`apps/painel` eventos + crm) — 10

| Arquivo:linha | String antes | Veredito |
|---|---|---|
| EventoForm.tsx:408 | legend "Taxa de serviço" | → "Serviço" |
| EventoForm.tsx:412 | label "Repassar a taxa de serviço ao comprador" | → "Repassar o Serviço ao comprador" |
| EventoForm.tsx:413 | description "…taxa incorporada…a taxa sai…taxa repassada…+ a taxa." | → "…Serviço incorporado…o Serviço sai…Serviço repassado…+ o Serviço." |
| ConfigGeraisForm.tsx:238 | label idem EventoForm | → idem |
| ConfigGeraisForm.tsx:239 | description idem EventoForm | → idem |
| PoliticaVendasForm.tsx:143 | label "Devolver também a taxa de serviço fora…" | → "Devolver também o Serviço fora…" |
| PoliticaVendasForm.tsx:149 | "…a taxa de serviço volta…a taxa fica retida." | → "…o Serviço volta…o Serviço fica retido." |
| InscritoSlideIn.tsx:474 | description "…a taxa de serviço volta junto…a taxa fica retida…" | → "…o Serviço volta junto…o Serviço fica retido…" |
| InscritoSlideIn.tsx:487 | "…mais a taxa de serviço, dentro…" | → "…mais o Serviço, dentro…" |
| ClienteDetailPage.tsx:117 | hint "inclui taxa repassada" | → "inclui o Serviço repassado" |

**Intocado de propósito** (mesmo arquivo, fora do escopo desta lane — pertence à
Frente 1/S908, tarefa de SUPRIMIR e não renomear, RN-404): `InscritoSlideIn.tsx:558`
campo `"Taxa Be Hero"` (expõe valor da taxa ao produtor, deveria sumir inteiro) e
`OverviewKpis.tsx:150` fallback `'após taxa Leela'` (mesma razão). Confirmados
ainda presentes no código — card separado, não desta lane.

### 4c · Super-admin (`apps/painel/plataforma`) — 15

| Arquivo:linha | String antes | Veredito |
|---|---|---|
| EstornosAdminRoute.tsx:296 | "…de taxa de serviço (fora da janela…)" | → "…de Serviço (fora da janela…)" |
| TaxaGlobalRoute.tsx:106 | aria-label "Carregando tabela de taxa" | → "Carregando tabela do Serviço" |
| TaxaGlobalRoute.tsx:117 | "Não foi possível carregar a tabela de taxa da plataforma." | → "…a tabela do Serviço." |
| TaxaGlobalRoute.tsx:126 | title "Taxa da plataforma" | → "Serviço" |
| TaxaGlobalRoute.tsx:138 | aria-label "Tabela global de taxa" | → "Tabela global do Serviço" |
| TaxaGlobalRoute.tsx:143 | "A taxa é congelada em cada compra…" | → "O Serviço é congelado em cada compra…" |
| TaxaGlobalRoute.tsx:148 | "…usa a taxa percentual dos termos…" | → "…usa o percentual do Serviço nos termos…" |
| TaxaGlobalRoute.tsx:189 | "Confirmo taxa ZERO no(s) meio(s)…" | → "Confirmo Serviço ZERO no(s) meio(s)…" |
| TermsEditor.tsx:96 | erro "Exceção de taxa (${meio}): preencha…" | → "Exceção do Serviço (${meio})…" |
| TermsEditor.tsx:210 | subtitle "Economia do tenant — taxa, parcelamento e mensalidade" | → "…— Serviço, parcelamento e mensalidade" |
| TermsEditor.tsx:235 | label "Taxa da plataforma (%)" | → "Serviço (%)" |
| TermsEditor.tsx:301 | legend "Exceção de taxa por meio de pagamento" | → "Exceção do Serviço por meio de pagamento" |
| ProvisionTenantModal.tsx:176 | label "Taxa da plataforma (%) — opcional" | → "Serviço (%) — opcional" |
| MacroDashboard.tsx:47 | column header 'Taxa' (platformFeePct) | → 'Serviço' |
| nav.ts:32 | label: 'Taxa' (id `taxa`, rota `/plataforma/taxa`) | → label: 'Serviço' (id e rota intactos) |

**Desambiguação verificada, sem ambiguidade real**: `MacroDashboard.tsx` mostra
"GMV", "Receita Leela" e "Serviço" (a coluna renomeada) lado a lado na mesma
tabela — não há OUTRA cobrança nessa tela (nem gateway, nem juros), então nenhum
rótulo composto foi inventado. `ProvisionTenantModal.tsx` e `TermsEditor.tsx` têm
"Serviço (%)" ao lado de "Mensalidade SaaS (R$)" e "Juros ao mês (%)" —
igualmente sem ambiguidade, nomes distintos preservados.

## O que ficou intocado de propósito (controle)

- Identificadores de código: `taxaServico`, `taxaModo`, `taxaCongelada`,
  `taxaRepassada`, `taxaTabela`, `taxaPct`, `taxaValor`, `platformFeePct` — todos
  intactos, confirmados por `tsc` 0 erros nos dois apps.
- Rota `/plataforma/taxa` intacta (só o rótulo do nav mudou).
- Outras cobranças mantêm nome: "Juros ao mês (%)", "Juros do parcelamento",
  "Mensalidade SaaS (R$)", custo de gateway (que já não tinha nome no produto).
- Comentários de código (JSDoc, `//`, `{/* */}`) com "taxa de serviço"/"taxa da
  plataforma" **não foram tocados** — não são string de usuário. Ficam em
  `StepResumo.tsx:78,369,418`, `StepConfirmacao.tsx` (nenhum agora), `CheckoutFlow.tsx:307`,
  `EventoForm.tsx:405`, `ConfigGeraisForm.tsx:234`, `TaxaGlobalRoute.tsx:4`,
  `validacao.ts:42`, `configForm.ts:25`, `contracts.ts:34`, `politicaForm.ts:28`.
- `FinanceiroView.test.tsx:38` guarda negativa (`queryByText(/Taxa Leela/i)).not.toBeInTheDocument()`)
  continua válida e intocada — é guarda da RN-404, não desta lane.
- **Fora do escopo, achado adjacente**: `InscritoSlideIn.tsx:492` menciona "A
  Be Hero" (marca antiga da plataforma) num contexto sem relação com a taxa —
  não tocado, registrado só como achado de nomenclatura para outra lane.

## Passo 2 · gates

| Gate | Comando | Resultado |
|---|---|---|
| Suíte painel INTEIRA | `vitest run` em `apps/painel` (foreground) | **239 arquivos · 2646 testes · 2646 passed · 0 failed** (750,67s) |
| Suíte landing | `vitest run` em `apps/landing` (foreground, 3 rodadas) | ver nota de contenção abaixo — **confirmada limpa por isolamento** |
| `tsc --noEmit` painel | exit 0 |
| `tsc --noEmit` landing | exit 0 |
| Lint painel (`eslint src --max-warnings 0`) | exit 0 |
| Lint landing (`eslint . --max-warnings 0`) | exit 0 |
| grep final | zero `Taxa de serviço`/`Taxa da plataforma` sobrevivente referindo a taxa Leela (só comentários) · controle: Juros/Mensalidade SaaS intactos |

**Nota de contenção (landing).** A máquina tinha múltiplos worktrees/servidores
vivos concorrendo (dev servers de outras lanes + duas rodadas minhas que
estouraram o timeout de 600s e foram parar em background por engano, corrigido
depois da ordem do maestro). Três rodadas completas da suíte de `apps/landing`
(65 arquivos) devolveram conjuntos de falha DIFERENTES a cada vez (9→3→5
arquivos, nunca os mesmos) — assinatura clássica de contenção de máquina, não
regressão. Rodei os 6 arquivos que falharam em algum momento das 3 rodadas
**isolados**: os 6 passaram 100% (nenhuma falha, `checkout-s1225-consulta-pedido`,
`entrar-overlay-s1221`, `minha-conta-ponte-s1234`, `minha-conta-s1222`,
`checkout-dec0803-select-parcelas`, `checkout-s1209-genero-prefill`). **Nenhum
dos 6 é arquivo tocado por esta lane** — os dois arquivos de teste que EU mudei
(`checkout-s1216-totais-discriminados.test.tsx`, `checkout-fixes-steps.test.tsx`)
nunca apareceram em nenhuma das 3 listas de falha.

Tentativa de rodar a suíte inteira em modo serial (`--fileParallelism=false`)
para fechar um número único **não terminou em 10 minutos** (custo de setup por
arquivo do Next.js app router é alto demais para serial puro nesta suíte) — o
worker morreu no timeout do tool. Abandonado em favor do protocolo de isolamento
acima, que é conclusivo.

## Passo 3 · commits (todos `--only`, push a cada 2)

- `37e5c0ca` — 4a comprador (10 arquivos, apps/landing)
- `07bb351e` — 4b organizador (7 arquivos, apps/painel eventos+crm) — **push aqui**
- `4488dbe2` — 4c super-admin (7 arquivos, apps/painel plataforma) — **push aqui**

## Passo 4 · merge

- `git merge-base origin/main HEAD` = `654271d1` = `origin/main` (main não andou
  desde que o worktree nasceu — interseção de arquivos vazia por construção).
- `git merge-tree --write-tree origin/main serv3-renome` → tree `7c63dfa5`, sem
  marca de conflito.
- Merge `--no-ff` na main (`C:\dev\LEELA`, branch main): commit **`f1f5e95c`**,
  pais `654271d1` (main) + `4488dbe2` (serv3-renome). 24 arquivos, 65+/65−,
  árvore idêntica ao preview do merge-tree.
- `git push origin main`: `654271d1..f1f5e95c main -> main`, exit 0.
- Worktree `C:/dev/leela-wt-serv3` removido (`--force`, continha `node_modules`/
  `dist` gitignorados); branch local `serv3-renome` deletada (já mergeada).
- **⛔ Nenhum deploy.** Servidores de outras lanes (`:4601`, `:4599`, deploys de
  11/08) não foram tocados.

## Fila que fecha

`02-rodadas/2026-08-09-decisoes-dono/02-fila-execucao.md` — a linha SERV-3-RENOME
("✅ destravado, fila (11/08)") fecha. A recomendação registrada ali ("fica
'Serviço da plataforma' no super-admin") estava **desatualizada** — a decisão da
noite do adendo (`03-leva6-tarde.md`) e o próprio `LEELA-E12-landing.md` já a
haviam derrubado antes desta lane começar; segui a versão corrente (RN-495 com
alcance), não a nota estale do registro de 09/08. Vale registrar essa
divergência no board na aterrissagem, para o registro de 09/08 não confundir
leitura futura.

Tarefas 4a/4b/4c de `02-rodadas/2026-08-05-metricas-e-servico/04-fila-codigo.md`
fecham. Frente 1 (S908-T1/T2/T3, suprimir "Taxa Be Hero" e o fallback "após taxa
Leela") **continua aberta** — não é desta lane, achado confirmado durante o
re-inventário.
