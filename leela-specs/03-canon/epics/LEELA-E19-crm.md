# LEELA-E19 · CRM do organizador + hub de Comunicação

- **Superfície:** Painel (menu principal)
- **Horizonte:** H3 (Onda web-complete — antecipada 2026-07-18)
- **MoSCoW:** Could (proposto pelo Vitor 2026-07-18; a ratificar)
- **Estimativa:** XL
- **Status:** 🔨 Backend construído (S-R9-13-T1/T2 + api-client · trace leela-build-2d6ee98d E19); UI (T3/T4) em lote posterior
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

## Decisões — RESOLVIDAS por defaults autorizados (Vitor, 2026-07-18 10:24)

As 3 decisões abertas foram fechadas pelos defaults P-E19-1..3; P-E19-4..6 são premissas
de minimização assumidas na implementação (registradas no handoff do trace):

1. **P-E19-2 · Base legal** = legítimo interesse sobre a base transacional própria; finalidade = gestão + comunicação (RN-172).
2. **P-E19-3 · Unificação CRM + Comunicação** = hub "Clientes & Comunicação" (decisão de UI — lote posterior; o backend já entrega a fonte de audiência: mapa `eventos` por cliente).
3. **P-E19-1 · Chave de linking** = CPF normalizado (11 dígitos) quando válido; fallback e-mail do responsável (só quando o inscrito É o responsável do pedido — o [reg] não tem e-mail); último recurso `atletaId`. DocId = `{tipo}_{sha256(tenantId:tipo:valor)[0:32]}` — CPF/e-mail NUNCA em claro em path/doc/log; salt por tenant impede correlação cross-tenant.
4. **P-E19-4 · Dado mínimo** = armazenar `nascimento` (date-only) em vez de idade pré-calculada (idade envelhece no doc; aniversário deriva mm-dd).
5. **P-E19-5 · Dinheiro** = `valorGasto` = Σ(valorFinal+taxaRepassada) das confirmadas; `ltv` = Σ valorFinal (consistente com `receitaConfirmada`). Estornada fica no histórico fora dos dois números.
6. **P-E19-6 · Só quem comprou** = apenas inscrição confirmada/estornada entra no CRM; pendente/cancelada não constrói perfil.
7. **P-CKMOD-1 (2026-07-19) · Endereço NUNCA entra no CRM** — o checkout novo (lote CHECKOUT-MODELO) passou a coletar endereço do comprador em `pedidos/{id}.endereco`; por minimização RN-172, a allowlist do doc de cliente **não ganha endereço** (nem cidade/UF derivadas dele). A agregação do CRM segue lendo INSCRITOS (nunca o pedido). Incluir endereço no CRM exige decisão explícita do Vitor registrada aqui.

## Estado de implementação (backend — trace leela-build-2d6ee98d, 2026-07-18)

**Entregue e provado no emulator de TESTE (:8080, emulators:exec fb-tools@13):**
- **T1 core** (`packages/core/src/crm/cliente.ts`, `9006a47`): identidade CPF→email→atletaId + `computeCrmCliente` (agregado fechado a partir do ledger `inscricoes`) + parse. 14 unit tests.
- **T2 function** (`functions/src/crm/agregarClientes.ts`, `463e22a`): `onInscritoWriteCrm` — transação idempotente (replay = no-op, `atualizadoEm` intocado), migração de chave com expurgo do doc vazio, fail-closed p/ pedido de outro tenant.
- **T3 rules** (`firestore.rules`, `2e864f0`): `tenants/{tid}/crmClientes` read só `isTenantWriter`, write negada a QUALQUER cliente (inclusive owner e platform_admin via client SDK). Suíte de ataques no emulator.
- **api-client** (`packages/api-client/src/crm.ts`, `a7a4bb7`): readers tipados — lista paginada, busca por prefixo, detalhe 1-read.
- **Review antagonista (gate PII/LGPD, rodada final em contexto fresco): APROVADO COM RESSALVAS** — nenhum bloqueador (sem bypass de auth, sem PII cross-tenant, sem escrita de cliente). Fixes aplicados e re-provados (`ef23ee9` + `9519f38`): A1 guarda `eventoCoerente` fail-closed; A2 fence de monotonicidade (redelivery fora de ordem não regride estorno — LTV não ressuscita dinheiro devolvido); A4 clamp [1,100] no pageSize; A5 trava de regressão collectionGroup comentada nas rules. Report completo: `outputs/leela-build-2d6ee98d/E19-CRM-REPORT.md`.

**✅ A3 PAGO (hardening aplicado — lote COMISSIONAMENTO-F2, 2026-07-18):** o docId trocou de `sha256(tenantId:tipo:valor)` para **HMAC-SHA256 com pepper secreto (`CRM_ID_PEPPER`)**, fail-closed em QUALQUER ambiente (pepper ausente/vazio ⇒ o gatilho LANÇA; emulator/testes setam env explícita de teste). A força bruta offline do CPF (~10⁹ valores) morre: sem o pepper, o espaço de busca é o da chave do HMAC. Aplicado ANTES de produção — sem dado real, zero migração de chaves. Testes atualizados (suite CRM + 3 testes A3: fail-closed, pepper distinto ⇒ chave distinta, determinismo por tenant). **Resta SÓ a ação de ops no deploy:** provisionar `CRM_ID_PEPPER` no Secret Manager (valor forte, nunca logado; trocar o pepper depois de haver dado real = migração de todas as chaves).

**Caminho real do modelo:** `tenants/{tenantId}/crmClientes/{clienteKey}` (subcoleção direta — não `crm/clientes`). Sem índice composto novo (`firestore.indexes.json` intocado).

**Reconciliação E06 (adendo do Vitor 09:14):** NADA mudou em enviarCampanha/estimarAlcance/automações — audiência por EVENTO segue dona do fluxo. O CRM vira a FONTE DE AUDIÊNCIA do hub central (S-R9-13-T4, lote de UI): o mapa `eventos` por cliente segmenta "participou do evento X" e o disparo REUSARÁ o pipeline único `executarDisparoCampanha` por evento.

**Limitação documentada:** entrega fora de ordem de eventos ANTIGOS do trigger pode deixar entrada órfã na chave antiga até o próximo write do inscrito (mesma classe da limitação do agregarDemografia).

## Ordem sugerida

`S1900 (CRM: modelo+Rules ✅ → tela) → S1901 (hub de Comunicação)`. **Gate obrigatório:** review antagonista (PII/LGPD) antes de qualquer código — categoria distinta do RN-820. Backend passou pelo gate; a UI (T3/T4) repete o gate no próprio lote.
