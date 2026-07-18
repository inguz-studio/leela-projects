# LEELA-E19 · CRM do organizador + hub de Comunicação

- **Superfície:** Painel (menu principal)
- **Horizonte:** H3 (Onda web-complete — antecipada 2026-07-18)
- **MoSCoW:** Could (proposto pelo Vitor 2026-07-18; a ratificar)
- **Estimativa:** XL
- **Status:** 📋 Novo (proposto no LOTE R9)
- **Depende de:** LEELA-E00 (fundação), LEELA-E01 (DS & Shell), identidade transacional (inscrições/pedidos ✅), LEELA-E11 (demografia RN-820, para idade/sexo)
- **Origem:** verbatim do Vitor 2026-07-18 (adendo 2). Spec: `02-rodadas/2026-07-18-ux-review/`.

## Objetivo

Dar ao **organizador** uma visão única dos seus clientes (atletas que compraram em qualquer evento seu), com informações gerais, número de eventos que participou, valor gasto, **LTV**, sexo, idade e data de aniversário — e um **hub central de Comunicação** que hoje não existe (a comunicação só existe por evento, E06, e por clube, E05). Possivelmente **unificado** com a Comunicação, conforme o desejo do Vitor.

**Decisão de épico (justificada):** épico próprio, **não** extensão de E11 (analytics) nem de E06 (comunicação). E11 é **agregado sem PII** (RN-820); o CRM é o oposto — **identidade individual cross-evento** (linking por CPF/e-mail), categoria de dado distinta que exige base legal, finalidade e Rules próprias. Fundi-lo em E11 contaminaria a disciplina "agregado sem PII". E06 é comunicação por evento; o hub central é superfície nova.

## Personas & JTBD

- **Persona primária:** Organizador (Marina Castelo).
- **JTBD (candidato P8, `02-jtbd.md §2`):** *"Quero conhecer meus clientes → ver todos os atletas que compraram, com LTV e histórico cross-evento → reter e ativar a própria base sem depender de planilha."* Doc mais próximo hoje: 04.4 *"Falo com patrocinador → ter dados na mão"*.

## Critérios de sucesso do épico

- Organizador vê a lista de clientes (cross-evento) com nome, nº de eventos, valor gasto, LTV, sexo, idade, aniversário; busca/filtro/EmptyState/paginação.
- Detalhe do cliente com histórico consolidado (eventos, valor) — cross-join server-side.
- Hub central de Comunicação (item `comunicacao` do sidebar deixa de ser placeholder) com disparo a segmentos do CRM, **sem apagar** a comunicação por evento (E06)/clube (E05).
- **PII/LGPD provada:** leitura só `isTenantWriter`; reader server-side com shape fechado; Rules fail-closed; expurgo na exclusão de conta.

## Regras de negócio aplicáveis

- **RN-172 (nova) · CRM individual do organizador (PII).** Cruza identidade do cliente cross-evento por chave (CPF quando presente, e-mail fallback — a ratificar). Base legal/finalidade declaradas (legítimo interesse sobre a base transacional própria / execução de contrato), finalidade limitada (gestão + comunicação), minimização (só nome, nº eventos, valor/LTV, sexo, idade, aniversário — **sem dado sensível**). Leitura só `isTenantWriter`; nunca afiliado/patrocinador/coordenador. **Categoria DISTINTA do RN-820** (agregado sem PII).
- **RN-144** — export de dados 90d + disclaimer em ações irreversíveis.
- **RN-820** ✅ — fonte de idade/sexo (agregado); o CRM individual é a camada de identidade, não o agregado.

## Modelo de dados tocado

- **`tenants/{tenantId}/crm/clientes/{clienteKey}`** (ou coleção equivalente) — mantido por Function via cross-join das inscrições/pedidos do tenant; campos: `nome`, `qtdEventos`, `valorGasto`, `ltv`, `genero?`, `idade?`/`nascimentoBucket?`, `aniversario?`. Escrita exclusiva de Function; Rules leitura só `isTenantWriter`.
- Chave de identidade (`clienteKey`): CPF quando presente, e-mail fallback (decisão a ratificar).

## Fora de escopo (Won't nesta fase)

- Comissionamento/segmentação avançada de marketing (fase futura).
- Perfil público do cliente (é E17).
- Campanha de aniversário automática — registrada como **oportunidade** (conectar ao gatilho `aniversario` das automações E06), não escopo obrigatório.

---

## User stories

### LEELA-S1900 · CRM: visão única de clientes com LTV

**Como** organizador, **quero** ver todos os meus clientes num lugar só com LTV e histórico, **para** conhecer e reter a minha base.

- **MoSCoW:** Could · **Estimativa:** XL · **Superfície:** Painel · **RNs:** RN-172, RN-144
- **JTBD servido:** S+T · candidato P8. Dimensão **Social + Transacional**.

**Critérios de aceite (Given/When/Then):**
- **Dado** o menu principal, **quando** abro a aba CRM, **então** vejo a lista de clientes (cross-evento) com nome, nº de eventos, valor gasto, LTV, sexo, idade, aniversário; busca/filtro/EmptyState/paginação (§2.5).
- **Dado** um cliente, **quando** abro o detalhe, **então** vejo o histórico consolidado (eventos, valor), montado server-side por identidade.
- **Dado** um usuário não-`isTenantWriter`, **quando** tenta ler o CRM, **então** as Rules negam (fail-closed).

**Tasks:** `S-R9-13-T1` (modelo/cross-join + RN-172), `S-R9-13-T2` (Rules/PII), `S-R9-13-T3` (aba + lista + detalhe). Detalhe em `02-rodadas/2026-07-18-ux-review/04-tasks.md`.

### LEELA-S1901 · Hub central de Comunicação (possível unificação com CRM)

**Como** organizador, **quero** um hub central de Comunicação, **para** falar com segmentos da minha base sem entrar evento a evento.

- **MoSCoW:** Could · **Estimativa:** L · **Superfície:** Painel · **RNs:** RN-172
- **JTBD servido:** T · 04.2 (família de comunicação). Dimensão **Transacional**.

**Inventário honesto (reconciliação "Comunicação"):** existe hoje comunicação **por evento** (campanhas/automações E06, construído) e **por clube** (comunicados E05, construído). **Não existe** hub central no menu principal (`comunicacao` = placeholder inerte, `sidebar.ts:29`). Esta story cria o hub, **sem apagar** o que já roda.

**Critérios de aceite (Given/When/Then):**
- **Dado** o menu principal, **quando** abro Comunicação, **então** o hub central existe (não é mais placeholder) e permite disparar a segmentos do CRM.
- **Dado** a comunicação por evento (E06)/clube (E05), **quando** o hub central sobe, **então** elas seguem funcionando (nada apagado).

**Tasks:** `S-R9-13-T4` (hub + decisão de unificação), `S-R9-13-T5` (oportunidade: gatilho `aniversario` no E06).

---

## Decisões abertas (bloqueiam código — ver `DECISOES-ABERTAS`)

1. **Base legal** exata (legítimo interesse vs execução de contrato) — ratificar com o Vitor.
2. **Unificação CRM + Comunicação** numa aba ou abas irmãs (default recomendado: hub "Clientes & Comunicação").
3. **Chave de linking** (CPF vs e-mail vs ambos — default: CPF quando presente, e-mail fallback).

## Ordem sugerida

`S1900 (CRM: modelo+Rules+tela) → S1901 (hub de Comunicação)`. **Gate obrigatório:** review antagonista (PII/LGPD) antes de qualquer código — categoria distinta do RN-820.
