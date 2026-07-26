# LEELA-E19 · CRM — a área do organizador para conhecer e falar com a base

> **Nota de IA (2026-07-19 · rodada IA-MENU):** este épico deixou de ser "um hub dentro do item Comunicação" e passou a ser **uma área do menu principal, chamada CRM, com três subdivisões** — Visão geral · Clientes · Comunicação. A leitura correta do épico começa por §Arquitetura da área (IA-MENU); tudo que vem antes descreve o desenho anterior e continua válido como histórico e como spec das regras de dado.

- **Superfície:** Painel (menu principal)
- **Horizonte:** H3 (Onda web-complete — antecipada 2026-07-18)
- **MoSCoW:** Could (proposto pelo Vitor 2026-07-18; a ratificar)
- **Estimativa:** XL
- **Status:** 🔨 Backend construído (S-R9-13-T1/T2 + api-client) + **UI T3 entregue** (lote CRM-COMISSAO-UI, trace leela-build-2d6ee98d): hub "Clientes & Comunicação" no menu (item `comunicacao` da sidebar ativo), lista paginada por cursor + busca por prefixo + ordenação, detalhe 1-read com histórico por evento, aniversário mm-dd e idade ao vivo. **Falta T4** (disparo de comunicação a segmentos do CRM — reusa `executarDisparoCampanha`)
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
- **RN-173 (nova · DEC-0719, Vitor 2026-07-19, item 24d)** — **CPF é ÚNICO no sistema (unicidade global de pessoa por CPF).** Verbatim: *"só podemos ter CPF's únicos no sistema, importante isso."* Colisão no checkout/cadastro = **mesma pessoa: linka, não duplica**. É a garantia que sustenta a **chave de linking do CRM** (RN-172, CPF→e-mail): com CPF único, a agregação cross-evento por CPF é determinística e não cria perfis-fantasma. Implica **constraint de unicidade** (índice/guard no cadastro de pessoa) + **fluxo de colisão** (checkout que reconhece CPF existente e associa, em vez de criar duplicata). Constraint + fluxo são **lote de código** (fila `cpf-unico`); aqui fica a regra. A disciplina de PII da RN-172 permanece: o CPF nunca em claro em path/doc/log (docId por HMAC com pepper).
- **RN-174 (nova · DEC-0719-ret, Vitor 2026-07-19) · Claim da ficha de pessoa condicionado a pagamento + e-mail correspondente + e-mail confirmado.** O vínculo (`contaUid`) do registry `pessoas/{cpf}` a uma conta só ocorre quando as **três** condições valem juntas: **(a)** o pedido daquele CPF tem **pagamento CONFIRMADO**; **(b)** o e-mail da conta é **igual** ao e-mail registrado na compra daquele CPF; **(c)** o e-mail da conta está **CONFIRMADO** (verificação nativa do Firebase Auth — sem Brevo). Enquanto as três não valem, `dadosConhecidos`/prefill (RN-154, `getCheckoutPrefill`) **nunca** são lidos pela conta — o que fecha o vazamento **F1** (ordem "vítima compra anônima primeiro → atacante reivindica o CPF dela"). Verbatim do Vitor: *"pode ser e-mail confirmado + pagamento, mas acredito que seria importante enviarmos um e-mail de confirmação para a pessoa, quando ela fizer o primeiro login, ou receber os ingressos pela primeira vez."* É a **Direção B** (claim segue o pagamento) do report CHECKOUT2-MODELO, endurecida com o gate de e-mail correspondente + confirmado. **F2** (conta Auth para e-mail de terceiro) fica mitigado pelo MESMO desenho: a conta só ganha acesso a QUALQUER dado da pessoa depois de confirmar o e-mail — **premissa registrada**. A **Direção A** (prova de posse de CPF/código via verificação externa) é **REFORÇO pré-go-live**, backlog com gatilho "antes de produção com dado real" (recomendação do lead mantida). É **lote de código** (fila `CLAIM-FIX`, executável já); aqui fica a regra.
- **RN-177 (nova · DEC-0719-ret, Vitor 2026-07-19) · Documento tipado no registry de pessoas; "CPF único" (RN-173) generaliza para "documento único".** A chave de pessoa do registry `pessoas/{…}` passa a suportar **documento tipado**: `cpf` (11 dígitos) **ou** `passaporte` + **país emissor**. A unicidade global da RN-173 deixa de ser "CPF único" e passa a ser **"documento único"** — duas inscrições com o mesmo documento tipado são a MESMA pessoa (linka, não duplica); documentos de tipos diferentes nunca colidem. É a base de dados que sustenta o checkout de estrangeiro (RN-175/RN-176, E04/E12): estrangeiro sem CPF entra pelo passaporte sem quebrar a integridade "documento do pagador = inscrito". **Especificar SEM implementar** — o modelo do registry, a derivação de docId por tipo e a migração de `cpf-unico` para `documento-unico` são **lote de código GATED** (fila `ESTRANGEIRO-CHECKOUT`), condicionado à liberação externa da conta Asaas (ver E04/RN-175 e DECISOES-ABERTAS §Ações externas). RN-173 segue vigente e paga como o caso `cpf`; RN-177 é a generalização, não a revogação.

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

> Histórias novas das rodadas de 2026-07-19 (DEC-0719-ret). Detalhe/verbatim em `02-rodadas/2026-07-19-decisoes/01-decisoes.md`; regras em §Regras de negócio aplicáveis (RN-174/RN-177). Molde igual ao de S1900.

### LEELA-S1902 · Posse de identidade por CPF — claim condicionado a pagamento + e-mail confirmado (CLAIM-FIX) · ✅ ENTREGUE

**Como** plataforma, **quero** que o vínculo de uma conta à ficha de uma pessoa só ocorra com pagamento confirmado e e-mail correspondente + confirmado, **para** fechar o vazamento F1 (reivindicar o CPF de terceiro) e o abuso F2.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Checkout/Auth (efeito em E12) · **RNs:** RN-174 (regra-mãe aqui), efeito em RN-154/RN-155/RN-173
- **Origem:** rodada DEC-0719-ret (Vitor, 2026-07-19) — Direção B endurecida do report CHECKOUT2-MODELO. Fila `03-fila-codigo (h)`; report `outputs/leela-build-2d6ee98d/CLAIM-FIX-REPORT.md`.

**Critérios de aceite (Given/When/Then):**
- **Dado** um pedido não pago, **quando** ele é criado, **então** nenhum `contaUid` é vinculado (o claim saiu da criação do pedido).
- **Dado** um pagamento confirmado, **quando** a conta é resolvida pelo e-mail da compra, **então** o vínculo nasce com o carimbo `contaEmail` (escritor único = confirmação).
- **Dado** um `getCheckoutPrefill`, **quando** o token não tem e-mail verificado **ou** o e-mail difere do `contaEmail`, **então** devolve `prefill: null` no mesmo shape de "sem ficha" (anti-oráculo de CPF).
- **Dado** a ordem "vítima anônima compra primeiro → atacante autenticado tenta reivindicar", **quando** o atacante chama o prefill, **então** é negado (F1 fechado).

**Tasks:** `S1902-T1` (first-claim removido da criação do pedido e movido para escritor único na confirmação de pagamento + carimbo `contaEmail` + auto-cura blindada — `ca9ec6a`) ✅, `S1902-T2` (gate de leitura no `getCheckoutPrefill`: `email_verified` + e-mail igual ao `contaEmail`, deny = `prefill: null` — `222dc3b`) ✅, `S1902-T3` (suíte `claimFix.integration`: negativos F1/F2, corridas, replay, auto-cura legítima + hostil — `71c32d1`+`18d4fbb`) ✅. **Status:** ✅ ENTREGUE 2026-07-19 (review antagonista Fable APROVADO COM FIXES; detalhe em §Estado de implementação). Residual: prova de posse do CPF (Direção A) = reforço pré-go-live no backlog.

### LEELA-S1903 · Documento tipado no registry de pessoas (CPF | passaporte) — "documento único" · GATED · (DEC-0719-ret)

**Como** plataforma, **quero** que o registry de pessoas chaveie por documento tipado (CPF de 11 dígitos ou passaporte + país), **para** sustentar o checkout de estrangeiro sem quebrar a integridade "documento do pagador = inscrito".

- **MoSCoW:** Could · **Estimativa:** S · **Superfície:** Modelo/registry (base de E04/E12 estrangeiro) · **RNs:** RN-177 (documento único generaliza RN-173)
- **Origem:** rodada DEC-0719-ret (Vitor, 2026-07-19). **Especificar SEM implementar** — a migração `cpf-unico`→`documento-unico` é lote GATED pela liberação Asaas. Fila `03-fila-codigo (i)`.

**Critérios de aceite (Given/When/Then):**
- **Dado** o registry `pessoas/{…}`, **quando** especifico a chave, **então** ela suporta `cpf` (11 dígitos) **ou** `passaporte` + país emissor, com docId derivado por tipo (HMAC com pepper, sem PII em claro).
- **Dado** duas inscrições com o mesmo documento tipado, **quando** colidem, **então** são a **mesma pessoa** (linka, não duplica); documentos de tipos diferentes nunca colidem.
- **Dado** a RN-173 (CPF único) vigente, **quando** RN-177 entra, **então** ela **generaliza** (não revoga) — o caso `cpf` segue pago e o `passaporte` é a extensão.

**Tasks:** `S1903-T1` (modelo do registry de documento tipado + derivação de docId por tipo + spec da migração `cpf-unico`→`documento-unico` — SEM implementar; código só após liberação Asaas). Detalhe em `02-rodadas/2026-07-19-decisoes/01-decisoes.md` §DEC-0719-ret. **Não despachar antes da liberação externa (ver E04/RN-175).**

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

### Confirmações da rodada DEC-0719 (Vitor, 2026-07-19, item 24)

- **(a) Base legal LGPD — "pode relevar agora".** Segue sem bloqueio com o default de **legítimo interesse** (RN-172, P-E19-2), MAS com **nota explícita de REVISITAR antes do go-live**: a pendência de PII não é apagada, só teve a severidade rebaixada de bloqueadora para revisão pré-produção. O gate antagonista PII/LGPD do lote de UI (T3/T4) permanece obrigatório.
- **(b) Hub unificado "Clientes & Comunicação" = CONFIRMADO** (ratifica P-E19-3). O item `comunicacao` do sidebar deixa de ser placeholder; a comunicação por evento (E06) e por clube (E05) seguem intactas.
- **(c) Chave de linking CPF→e-mail = CONFIRMADA** (ratifica P-E19-1). Reforçada pela **RN-173** (CPF único global): a chave CPF torna-se determinística sem risco de duplicata.
- **(d) RN-173 (nova): CPF único no sistema** — ver §Regras de negócio aplicáveis. Vira lote de código `cpf-unico` (constraint + fluxo de colisão).

## Estado de implementação (backend — trace leela-build-2d6ee98d, 2026-07-18)

**Entregue e provado no emulator de TESTE (:8080, emulators:exec fb-tools@13):**
- **T1 core** (`packages/core/src/crm/cliente.ts`, `9006a47`): identidade CPF→email→atletaId + `computeCrmCliente` (agregado fechado a partir do ledger `inscricoes`) + parse. 14 unit tests.
- **T2 function** (`functions/src/crm/agregarClientes.ts`, `463e22a`): `onInscritoWriteCrm` — transação idempotente (replay = no-op, `atualizadoEm` intocado), migração de chave com expurgo do doc vazio, fail-closed p/ pedido de outro tenant.
- **T3 rules** (`firestore.rules`, `2e864f0`): `tenants/{tid}/crmClientes` read só `isTenantWriter`, write negada a QUALQUER cliente (inclusive owner e platform_admin via client SDK). Suíte de ataques no emulator.
- **api-client** (`packages/api-client/src/crm.ts`, `a7a4bb7`): readers tipados — lista paginada, busca por prefixo, detalhe 1-read.
- **Review antagonista (gate PII/LGPD, rodada final em contexto fresco): APROVADO COM RESSALVAS** — nenhum bloqueador (sem bypass de auth, sem PII cross-tenant, sem escrita de cliente). Fixes aplicados e re-provados (`ef23ee9` + `9519f38`): A1 guarda `eventoCoerente` fail-closed; A2 fence de monotonicidade (redelivery fora de ordem não regride estorno — LTV não ressuscita dinheiro devolvido); A4 clamp [1,100] no pageSize; A5 trava de regressão collectionGroup comentada nas rules. Report completo: `outputs/leela-build-2d6ee98d/E19-CRM-REPORT.md`.

**✅ A3 PAGO (hardening aplicado — lote COMISSIONAMENTO-F2, 2026-07-18):** o docId trocou de `sha256(tenantId:tipo:valor)` para **HMAC-SHA256 com pepper secreto (`CRM_ID_PEPPER`)**, fail-closed em QUALQUER ambiente (pepper ausente/vazio ⇒ o gatilho LANÇA; emulator/testes setam env explícita de teste). A força bruta offline do CPF (~10⁹ valores) morre: sem o pepper, o espaço de busca é o da chave do HMAC. Aplicado ANTES de produção — sem dado real, zero migração de chaves. Testes atualizados (suite CRM + 3 testes A3: fail-closed, pepper distinto ⇒ chave distinta, determinismo por tenant). **Resta SÓ a ação de ops no deploy:** provisionar `CRM_ID_PEPPER` no Secret Manager (valor forte, nunca logado; trocar o pepper depois de haver dado real = migração de todas as chaves).

**Caminho real do modelo:** `tenants/{tenantId}/crmClientes/{clienteKey}` (subcoleção direta — não `crm/clientes`). Sem índice composto novo (`firestore.indexes.json` intocado).

**✅ RN-173 CPF único global PAGO (lote CHECKOUT2-MODELO, 2026-07-19, `872e100`):** o `cpf-unico` saiu de fila para código. Registry de unicidade em **`pessoas/{cpf_<hmac32>}`** (coleção RAIZ, distinta do `crmClientes` por tenant): docId = `HMAC-SHA256(CRM_ID_PEPPER, "pessoa:cpf:{cpf11}")[0:32]` — MESMO pepper do CRM (A3), domínio de mensagem próprio (`pessoa:cpf:`) para a chave de pessoa e a do CRM nunca correlacionarem por igualdade. Unicidade **à prova de corrida**: o upsert roda DENTRO da transação do checkout (leitura na fase de leitura + escrita na fase de escrita; retry otimista serializa duas compras simultâneas do mesmo CPF — nunca nascem 2 docs). Escrita SÓ por Function; **Rules `pessoas` deny-all** (get/list/create/update/delete). CPF em claro FICA no doc (Function-only, necessário p/ prefill/gateway); o CRM (`crmClientes`) NUNCA lê este doc em claro — minimização RN-172 intacta. O inscrito ganhou `pessoaRef` (O(1) inscrito→pessoa). Prova: `checkout2Modelo.integration` (corrida concorrente real) + `pessoaCore` + `ck2Rules`.

**✅ DECISÃO F1/F2 (identidade) — RESOLVIDA por Vitor (2026-07-19) ⇒ RN-174.** O first-claim que a review antagonista Fable apontou (vínculo de `contaUid` na CRIAÇÃO do pedido não-pago, sem prova de posse do CPF, com a ordem "vítima compra anônima 1º → atacante reivindica o CPF dela → herda o PII via `getCheckoutPrefill`") **deixa de existir**: o claim passa a exigir **pagamento confirmado + e-mail da conta igual ao e-mail da compra + e-mail confirmado no Firebase** (RN-174 · Direção B endurecida). Verbatim do Vitor: *"pode ser e-mail confirmado + pagamento, mas acredito que seria importante enviarmos um e-mail de confirmação para a pessoa, quando ela fizer o primeiro login, ou receber os ingressos pela primeira vez."* **F2** (conta/e-mail para terceiro) fica mitigado pelo mesmo desenho (a conta só acessa dado após confirmar o e-mail) — **premissa registrada** em RN-174. **Direção A** (prova de posse de CPF por verificação externa) segue como **REFORÇO pré-go-live** (backlog com gatilho "antes de produção com dado real"), não como bloqueador agora. O fix é executável já: **lote de código `CLAIM-FIX`** (checkout/auth), que move o first-claim para a confirmação e adiciona o gate de e-mail correspondente + confirmado na leitura de prefill; testes negativos ("não reivindico CPF que não é meu"; "e-mail do responsável ≠ caller") entram junto. Detalhe do achado em `outputs/leela-build-2d6ee98d/CHECKOUT2-MODELO-REPORT.md` §Review; consolidação em `02-rodadas/2026-07-19-decisoes/`.

**✅ RN-174 IMPLEMENTADA (lote CLAIM-FIX, 2026-07-19, `ca9ec6a`+`222dc3b`+`71c32d1`+`18d4fbb`):** o claim de `contaUid` saiu da criação do pedido e virou **escritor único na confirmação de pagamento** (`garantirContaSemFriccao`): pedido PAGO + conta resolvida PELO e-mail da compra (condições a+b por construção) + carimbo novo **`contaEmail`** gravado junto do vínculo. O leitor (`getCheckoutPrefill`) exige as três condições: vínculo (que já implica pago + e-mail da compra) + **`email_verified` do token (Firebase nativo)** + e-mail do token IGUAL ao `contaEmail`; qualquer deny devolve `{prefill: null}` no MESMO shape de "sem ficha" (anti-oráculo de CPF). `pessoaRegistry` mantém só o merge de `dadosConhecidos` com anti-hijack (`callerUid` — dono atualiza os próprios dados; criação NUNCA reivindica). Auto-cura: claim legado da MESMA conta sem carimbo ganha `contaEmail` na próxima compra confirmada (blindada: conta distinta NUNCA carimba — teste hostil dedicado). **Review antagonista Fable (contexto fresco): APROVADO COM FIXES** — escritor único confirmado por varredura (nenhum outro write de `contaUid`), superfície de leitura confinada ao prefill, sem oráculo/PII em log; único fix requerido (teste da auto-cura hostil) aplicado e re-provado. Residuais documentados: squat pago pré-claim (aceito — fecha na Direção A pré-go-live), envenenamento de `dadosConhecidos` de pessoa não-reivindicada (herdado, integridade leve), lockout de prefill p/ conta que troca de e-mail (fail-closed). Prova: `claimFix.integration` (8 testes: negativos 1-4, corridas 5a/5b, auto-cura legítima+hostil) + `checkout2Modelo`/`pessoaCore` realinhadas. E-mail de verificação: nativo do Firebase no 1º login (client-side); hook de "1ª entrega de ingressos" entra no lote que criar esse fluxo de e-mail (inexistente hoje). Report `outputs/leela-build-2d6ee98d/CLAIM-FIX-REPORT.md`.

**Reconciliação E06 (adendo do Vitor 09:14):** NADA mudou em enviarCampanha/estimarAlcance/automações — audiência por EVENTO segue dona do fluxo. O CRM vira a FONTE DE AUDIÊNCIA do hub central (S-R9-13-T4, lote de UI): o mapa `eventos` por cliente segmenta "participou do evento X" e o disparo REUSARÁ o pipeline único `executarDisparoCampanha` por evento.

**Limitação documentada:** entrega fora de ordem de eventos ANTIGOS do trigger pode deixar entrada órfã na chave antiga até o próximo write do inscrito (mesma classe da limitação do agregarDemografia).

## Ordem sugerida

`S1900 (CRM: modelo+Rules ✅ → tela) → S1901 (hub de Comunicação)`. **Gate obrigatório:** review antagonista (PII/LGPD) antes de qualquer código — categoria distinta do RN-820. Backend passou pelo gate; a UI (T3/T4) repete o gate no próprio lote.

## Plano de execução (ESPEC-SWEEP · 2026-07-19)

**Onda 4 · item 4.** Este épico carrega a dependência de maior alavancagem da onda: a chave do Brevo destrava, ao mesmo tempo, o disparo daqui e o convite PF do E08.

### Estado real

Backend inteiro pago e provado: identidade cross-evento com HMAC e pepper fail-closed (T1/T2/T3 + A3), readers tipados, Rules com suíte de ataques, RN-173 (CPF único, à prova de corrida) e RN-174 (claim condicionado). A UI T3 subiu no lote CRM-COMISSAO-UI — o hub "Clientes & Comunicação" existe no menu, com lista paginada, busca por prefixo, detalhe de 1 leitura, aniversário e idade ao vivo.

Falta **T4**: o hub sabe quem são os clientes, mas ainda não fala com eles.

### O que resta

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 1 | `S1901-T4a` | segmentação: core puro que deriva os segmentos a partir do mapa `eventos` por cliente já mantido pelo agregador (participou de um evento, faixa de valor gasto, aniversariantes do mês), mais o reader server-side de shape fechado que resolve o segmento em destinatários | `packages/core/src/crm` · `functions/src/crm` | E19 backend ✅ | **opus** xhigh | ⚔ |
| 2 | `S1901-T4b` | disparo: **reusa** `executarDisparoCampanha`/`enviarCampanha` do E06 e o log de envio; nenhum pipeline novo. Idempotência por campanha, estimativa de alcance antes de enviar | `functions/src/eventos` (consumidor) · `functions/src/crm` | T4a · **RN-137** | **opus** xhigh | ⚔ |
| 3 | `S1901-T4c` | tela do disparo dentro do hub: escolher segmento, ver o alcance estimado, confirmar com preview do que vai sair | `apps/painel` · hub Clientes & Comunicação | T4b | **opus** xhigh | — |
| 4 | `S1901-T5` | oportunidade, não obrigatório: ligar o gatilho `aniversario` das automações do E06 ao segmento de aniversariantes | `functions/` (automações) | T4a · E06 ✅ | **opus** xhigh | — |

**Dependência dura, e ela é externa.** Sem `BREVO_API_KEY` o `selectEmailProvider` é fail-closed por desenho — o envio lança em vez de falhar em silêncio. T4a e T4c podem ser construídos e testados sem a chave (segmentação e tela são verificáveis com o provider mockado); T4b só fecha de verdade com a chave. Ação do Vitor: conta Brevo, verificação de domínio (depende da decisão de domínio, item 12) e a chave no Secret Manager.

**Por que tudo em opus.** Segmentar é escolher quem recebe e-mail a partir de identidade individual — é a superfície de PII do produto inteiro. Um segmento que vaze cliente de outro tenant, ou que inclua quem nunca comprou, é incidente de LGPD, não bug de tela. O gate antagonista de PII já era obrigatório neste épico por regra própria; ele continua valendo em cada task deste bloco.

### O que não pode ser esquecido no lote

- **Minimização RN-172 intacta.** O segmento lê o agregado de cliente, nunca o pedido. Endereço continua fora do CRM (P-CKMOD-1) — incluir exige decisão explícita do Vitor.
- **Nada é apagado.** A comunicação por evento (E06) e por clube (E05) seguem funcionando; o hub central soma, não substitui.
- **`CRM_ID_PEPPER` no Secret Manager** antes do primeiro deploy com dado real. Trocar o pepper depois obriga migração de todas as chaves.
- **Base legal a revisitar antes do go-live.** O default de legítimo interesse segue vigente; a pendência não foi apagada, só teve a severidade rebaixada.

### Ordem interna

`T4a → T4b → T4c`, com `T5` opcional ao final. Se a chave do Brevo demorar, despachar `T4a` e `T4c` contra o provider mockado e deixar `T4b` como a última milha — assim o épico não fica parado esperando uma ação externa.

### Critério de pronto

- [ ] o reader de segmento devolve shape fechado e nega para quem não é `isTenantWriter` (fail-closed provado no emulador)
- [ ] nenhum destinatário de outro tenant entra em nenhum segmento — teste de ataque explícito
- [ ] disparar a mesma campanha duas vezes não envia duas vezes (idempotência provada, no padrão do scheduler ADR-015)
- [ ] a estimativa de alcance bate com o número realmente enviado no ambiente de teste
- [ ] sem a chave, o comportamento é fail-closed e visível na tela — nunca "enviado" mentindo
- [ ] review antagonista de PII/LGPD em contexto fresco antes do merge

---

## Arquitetura da área (IA-MENU · Vitor 2026-07-19)

Rodada `02-rodadas/2026-07-19-ia-menu/`. O Vitor observou que análise de vendas e comunicação estavam se misturando: *"No financeiro tenho a visão de perfil dos compradores, e comunicação tenho clientes e comunicação. Acho que poderíamos simplificar essas duas rotas em uma só, tendo subdivisões."* Verbatim completo e desenho em `00-decisao.md`.

### O que muda neste épico

O **hub "Clientes & Comunicação"**, montado no item `comunicacao` do menu, vira a **área CRM** — item próprio (`crm`, rótulo "CRM", destino `/crm`), com três subdivisões em SubNav §2.14:

| Subdivisão | Rota | Conteúdo | Origem |
|---|---|---|---|
| **Visão geral** | `/crm` (índice) | desempenho de vendas, perfil demográfico dos compradores, cohort idade × sexo | vinha de `Financeiro › Análise` (E11 · RN-820/821/822) |
| **Clientes** | `/crm/clientes` e `/crm/clientes/:clienteKey` | lista cross-evento com LTV, ficha individual, histórico, aniversário | era o índice de `/crm` (S1900, entregue) |
| **Comunicação** | `/crm/comunicacao` | disparo por segmento da base | é a S1901-T4c, ainda travada na chave do Brevo |

O item de menu `Financeiro` deixa de existir (RN-233, dona no E01) e o item `Analytics` sai do design system.

### A fronteira de PII passa a ser explícita

A área junta, sob a mesma casca, duas categorias de dado que o épico sempre tratou como distintas e que **continuam distintas**:

- **Visão geral** é agregado **sem identidade** — RN-820/RN-822, contagens por bucket, cohort com supressão k=5 (`cohortPrivacidade.ts`), nunca a pessoa.
- **Clientes** é **identidade individual** — RN-172, chave HMAC com pepper, leitura só `isTenantWriter`, minimização (endereço fora, P-CKMOD-1).

**A fronteira é de dado, não de tela.** Estar sob o mesmo item de menu não autoriza cruzar as camadas: nenhum componente da Visão geral pode consumir `crmClientes`, e nenhum componente de Clientes pode desagregar o cohort. O risco novo que a reorganização cria é justamente esse — a proximidade convidar a um "filtro de clientes por faixa etária" que reintroduz a diferenciação que a supressão k=5 fecha. Isso vale como **gatilho de bloqueio** no gate antagonista de PII que este épico já exige por regra própria.

### Reconciliação com o que estava escrito

- O título do épico e a S1901 falavam em "hub de Comunicação" no item `comunicacao`. Passa a ser a subdivisão **Comunicação** da área **CRM**. O critério de aceite "Dado o menu principal, quando abro Comunicação" lê-se agora "quando abro CRM › Comunicação".
- A decisão **P-E19-3** (hub unificado "Clientes & Comunicação"), confirmada pelo Vitor em 24(b) da DEC-0719, **não é revogada — é ampliada**: a unificação passou a incluir também a análise de vendas, que ele identificou como a terceira peça da mesma conversa.
- **Nada é apagado**, e isso continua sendo regra do épico: a comunicação por evento (E06) e por clube (E05) seguem intactas nas próprias telas.
- As tasks `S1901-T4a/T4b/T4c` seguem exatamente como planejadas na Onda 4; muda só o endereço da tela do T4c, que passa a ser `/crm/comunicacao`.

### Execução

`IAM-T2` (a análise migra para CRM › Visão geral) → `IAM-T3` (a área ganha as 3 subdivisões), ambas **opus xhigh com review antagonista**, em `02-rodadas/2026-07-19-ia-menu/02-fila-codigo.md`. São tarefas de navegação: **nenhum contrato de dado, Rule ou callable é tocado**. Se a execução precisar mexer em `functions/` ou `firestore.rules`, saiu do escopo e volta para a spec.

**Gate específico do move:** a suíte das telas movidas (`ClientesPage`, `ClienteDetailPage`, `AnaliseVendasView`, `CohortIdadeSexo`) tem de passar **sem asserção reescrita**. Um teste que precisou mudar de expectativa é a prova de que o move alterou comportamento — e o comportamento inclui a supressão k=5 e a nota de cobertura honesta.

### Apêndice de execução IA-MENU (2026-07-26 · lane IAMENU-EXEC)

**A área CRM está construída.** `IAM-T2` `c1f6f03` → `IAM-T3` `7b78538`, ambas opus xhigh. ⚔ reviews antagonistas **pendentes**.

**As 3 subdivisões.** `CrmLayout` + `CrmSubNav` (Visão geral | Clientes | Comunicação), sucedendo a `FinanceiroSubNav` de 2 abas. Rotas: `/crm` índice = Visão geral, `/crm/visao-geral` = alias explícito, `/crm/clientes` = lista, `/crm/clientes/:clienteKey` = ficha, `/crm/comunicacao` = estado honesto.

**A armadilha de ordem, fechada.** As subdivisões nomeadas são rotas **reais**, declaradas antes de qualquer parâmetro, com teste sobre a árvore real provando que `/crm/clientes` abre a LISTA e nunca a ficha de um cliente de chave "clientes". `visao-geral` entrou como rota declarada e não só como índice: o mapa DE→PARA exige que o redirect legado ignore `clientes`, `comunicacao` e `visao-geral`, e rota real torna a exclusão **estrutural** em vez de uma lista de strings que alguém esquece de atualizar. Sem essa base, o redirect do `IAM-T6` entraria em laço.

**`/crm/comunicacao`.** Reusa o `SystemStateScreen` do DS na variante `maintenance` — zero componente novo. Não é vazio decorativo: declara o que não existe, declara o que JÁ existe (comunicação por evento, E06) e leva até lá. A RN-233 pede que o item tenha rota; não pede que ele finja funcionar. O S1901-T4a/b/c segue travado na chave do Brevo e é quem substitui esta casca.

**Gate do move honrado, com prova.** Os 6 arquivos de teste da Visão geral (`AnaliseVendasView`, `CohortIdadeSexo`, `demografia`, `desempenho`, `modalidades`, `tamanhos`) saíram do `git diff -M --stat` com **`| 0`** — zero inserções, zero deleções. E `ClientesPage.test.tsx` e `ClienteDetailPage.test.tsx` **nem aparecem no diff**: a ficha desceu um nível (`ClientesPage` navega para `/crm/clientes/{chave}`, o "voltar" aponta para `/crm/clientes`) e nenhum dos dois testes precisou mudar, porque nenhum deles assertava alvo de navegação.

**Sessão.** A Visão geral passou a usar o `useCrmSession` que já existia no módulo (contrato idêntico `status`/`uid`/`tenantId`); o `useFinanceiroSession` viajou com Repasses. Nenhum arquivo órfão, nenhuma cópia nova.

⚠️ **A fronteira de PII é o único dos 8 riscos da rodada SEM prova executável.** Visão geral (agregado, k=5, RN-820/822) e Clientes (identidade individual, RN-172) passaram a dividir a casca de menu. A fronteira está declarada como diretriz de código no `CrmSubNav` e no `AnaliseVendasPage`, e nenhum recorte demográfico foi adicionado à lista — mas **nada no código impede** que alguém acrescente um "filtro de clientes por faixa etária", que reintroduziria exatamente a diferenciação que o k-anonimato fecha. Isso é vigilância, não garantia: segue como gatilho de bloqueio do gate antagonista de PII deste épico, e é o item que a review antagonista tem de atacar primeiro.
