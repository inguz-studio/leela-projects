---
tags: [leela, decisoes, fila, rodada, formulario]
trace: leela-build-2d6ee98d
lote: FORMBUILDER-SPEC
data: 2026-07-19
---

# 03-fila-codigo · Lote de código derivado da rodada FORMBUILDER

> Card de fila **SEM implementar** (esta lane é só documentação/spec). Vira brief de execução num lote próprio. **Estado: 📋 executável.** Não é dinheiro/gateway — **rota normal + review** (o único ponto sensível é o gate de obrigatoriedade, que **reusa** o fence de aceite já existente e é server-side; ver fronteira com o checkout abaixo).

| # | Lote | Escopo | RNs | Dep / Nota |
|---|---|---|---|---|
| (k) | **FORMBUILDER** (📋 executável) | (1) **Core/modelo (dono, único):** `packages/core/src/forms/` — `type Formulario`, `type Pergunta` (tipos `unica\|multipla\|sim_nao`), `opcoes`, `obrigatoria`, `versao`; tetos como constante única (RN-184/187); helper de versionamento (carimbo — RN-188). (2) **Modelo Firestore + Rules:** subcoleção de formulário sob o evento (E04) e sob o clube (E05); resposta gravada no **inscrito/membro** (RN-185), escrita server-only (Rules fail-closed). (3) **Builder (painel):** tela de config no evento (E04/S310-T2) e no clube (E05/S112-T1) — criar/editar/ordenar perguntas, marcar obrigatória, editar versiona (RN-188). (4) **Render na compra (E12/S1212):** exibe as perguntas no checkout, grava resposta no inscrito na tx da confirmação (RN-185), **obrigatória bloqueia o pagar no fence dos aceites** (RN-186, reuso do fence S1207). (5) **Render no clube (E05/S112-T2):** exibe na inscrição/entrada, grava no membro (RN-185/186). (6) **Leitura/export:** resposta viaja como coluna do inscrito na **lista/export já existente** (RN-189 — reuso, sem relatório novo). | RN-184, RN-185, RN-186, RN-187, RN-188, RN-189 | **Executável.** Modelo/core **novo território** (`packages/core/src/forms/`) — disjunto de TAXA-FLEX. Fronteira sensível = a **tela de checkout** (ver abaixo). Anexo (fase 2) FORA. Reuso-primeiro: fence de aceite (S1207/S306), lista de inscritos (export), padrão de versionamento (RN-149/S306-T3). |

## Territórios e fronteira com as lanes de checkout (TAXA-FLEX)

Declaração para permitir paralelismo seguro ou mandar serializar, por território:

- **Core (`packages/core`)** — FORMBUILDER cria `packages/core/src/forms/` (módulo novo). TAXA-FLEX mexe em `computeTaxaPlataforma`/`computeSaleState`/`computeLiquidoProdutor` (dinheiro). **Disjunto ⇒ paralelizável sem risco.**
- **`firestore.rules`** — ambos **acrescentam blocos** ao mesmo arquivo, em coleções distintas (FORMBUILDER: formulário sob evento/clube + resposta no inscrito; TAXA-FLEX: `platform/config` + `commercialTerms`). Mesmo arquivo, blocos distintos ⇒ **baixo risco de colisão**; regra operacional: **quem aterrissar depois faz rebase do bloco** (append, não sobrescreve).
- **Builder no painel (E04 config do evento / E05 config do clube)** — território **próprio** do FORMBUILDER (telas de config de formulário). TAXA-FLEX não toca aqui (a config da taxa é super-admin/E16). **Disjunto ⇒ paralelizável.**
- **Tela de checkout (E12, `apps/painel` checkout)** — **FRONTEIRA SENSÍVEL.** TAXA-FLEX/S1210 toca a **exibição de total por meio** (pagamento); FORMBUILDER/S1212 toca **campos de formulário + gate de obrigatoriedade no fence dos aceites**. Concerns diferentes, mas **mesma árvore de arquivos do checkout**. Recomendação: **serializar os toques na tela de checkout** — S1212 (render do formulário) entra **DEPOIS** que S1210 (exibição da taxa) aterrissar, para não editar os mesmos arquivos em paralelo. As tasks de **modelo/core/builder** (S310, S112, S1212-T1 modelo) rodam **em paralelo** livremente.

## Ordem relativa a TAXA-FLEX (resumo)

1. **Paralelo livre agora:** FORMBUILDER core/modelo (S310-T1) + builder de evento (S310-T2) + builder/render de clube (S112) — disjuntos de TAXA-FLEX.
2. **Serializar só na tela de checkout:** o render de formulário no checkout (S1212 camada de tela) entra **após** a exibição de taxa por meio (S1210) para não colidir nos arquivos do checkout. O **modelo** da resposta no inscrito (S1212-T1) não depende disso e pode adiantar.
3. FORMBUILDER **não é dinheiro** ⇒ rota normal + review; o gate de obrigatoriedade reusa o fence de aceite (server-side) e entra com testes negativos ("obrigatória sem resposta bloqueia o pagar"; "resposta carimba a versão vigente").

## Não-cards (fronteiras / fase 2)

- **Anexo de arquivo (fase 2)** — fora do v1. Uma linha de backlog na história dona (E04/S310); detalhar quando for priorizado. Sem escopo de Storage/retenção/compliance nesta rodada.
- **Resposta no CRM** — o CRM (RN-172) não agrega respostas por default (P-FB-4); incluir exige decisão explícita do Vitor (mesma disciplina do endereço, P-CKMOD-1/E19).

> **SUPERSEDE PARCIAL (2026-07-28 · DEC-0728B).** A superfície do builder mudou: o
> formulário virou template com casa própria no menu principal. A fila revisada vive em
> `02-rodadas/2026-07-28-formbuilder-templates/03-fila-codigo.md`. Esta fila continua
> correta em corte de v1, tetos, fence de obrigatoriedade, gravação da resposta e export.
