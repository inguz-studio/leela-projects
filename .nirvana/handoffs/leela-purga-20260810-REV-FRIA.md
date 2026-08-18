# PURGA-DADOS-TESTE · fase 2 — REVIEW FRIA (antagonista) — COMPLETA

**Lane:** `REV-FRIA` · **Trace:** `leela-purga-20260810` · **Employee:** `sf-backend-lead` (contexto fresco)
**Data:** 2026-08-10 · **Disciplina cumprida:** 100% read-only — toda chamada a produção foi GET de documento, list de coleção ou `accounts:batchGet`. Zero writes, zero `--apply`, zero deploy. Scripts Node leves e sequenciais (RAM irrelevante), sem emulator, sem build.

## VEREDITO: LIBERA COM CONDIÇÕES

Tentei derrubar o plano nos sete vetores e não consegui: a preservação está provada por replay e por checagem independente, a ordem sobrevive à leitura dos triggers no código-fonte, a titularidade de 06/08 não se repete, e o frescor foi conferido contra produção às 16:44:55Z com divergência ZERO. O que segue são condições de execução — verificáveis — e duas correções de registro que mudam recomendação (não mudam o plano).

---

## 1 · PRESERVAÇÃO — provada, por dois caminhos independentes

**Replay determinístico** (`scripts/gerar-plano.mjs` sobre o `inventario-congelado.json`, saída em scratchpad, artefatos congelados intocados):

- digital das operações reproduzida na bala: `87d6289c15ab307205154467a0f3ec4047286ff75987742ac10a75e1324fd5c1` ✔
- sha256 do arquivo congelado conferido por hash direto: `db98441dd6395902eee4664e735899ad3bc8063157275ddf98676c1455a50b77` ✔
- lista legível regenerada = idêntica à congelada, fora a linha do sha do arquivo ✔
- Nota de método (não é defeito): o sha256 do ARQUIVO não é reproduzível por replay porque `carimbo.planoGeradoEm` é carimbo de relógio. O que se reproduz é a digital das operações (regra R1 de 06/08); o sha do arquivo é pino de integridade do artefato, verificado por hash, e os dois bateram.

**Checador independente** (escrito nesta lane, sem reusar os asserts do gerador — `checar-antagonista.mjs` no scratchpad da sessão):

- digital recomputada das operações DO ARQUIVO = campo `digital` ✔
- triagem total: 247 + 77 = 324, zero duplicatas, todo caminho do plano é doc real do inventário ✔
- nenhum intocável no plano — caminhos exatos (PED-8CDHM/ped-…ed77a161, `pedidoCodigos/8CDHM`, `T93N7F`, `eventos/teste-taxa-repassada`, `pessoas/cpf_…`, `crmClientes/cpf_d72f3f9c…`, tenant, perfis, platform, saldo, dadosBancarios, auditoria, atletas do dono/wNXRT/MOXZ/4LdgQ09W) E padrões (`ed77a161`, `effd4232`, `MOXZpvp8…`, `FTqslV98…`, `8CDHM`, `T93N7F`, `Q57PA`, `pessoas/`, `cpf_d72f3f9c`, subtree inteiro de `teste-taxa-repassada`) ✔
- cobertura de subtree: nenhum filho sobrevivente sob pai condenado (evento, 2 clubes, fantasma ritmo-forte) ✔
- fantasmas fora do plano ✔ · pares código↔pedido consistentes (N4FHP morre com o pedido 68fcbd20; 8CDHM e Q57PA ficam com os seus) ✔
- **órfãos entre os 77 sobreviventes: ZERO** — varri os fields de todos os sobreviventes contra os IDs condenados (evento, clubes, uids demo, uid-ritmo-forte, 68fcbd20, N4FHP, repasses, itensKit, parceiro, desafio): nenhuma referência sobrevive ✔

## 2 · ORDEM E TRIGGERS — a lição B1 foi paga, com o código na mão

Li os triggers em `C:\dev\LEELA\functions\src`, não confiei no handoff:

- **Evento-primeiro (10) desarma os 3 agregadores**: `agregarFinanceiro.ts:220`, `agregarDemografia.ts:120`, `agregarEstoque.ts:110` — todos `if (!eventoSnap.exists) return null` dentro da transação. Com o pai morto, os deletes dos 91 inscritos não reescrevem nada.
- **Nenhum e-mail em delete**: `onInscritoWriteAutomacao` (automacoesTriggers.ts:273-275) só dispara na transição PARA `confirmado`; em delete, `after` não existe → retorna. E corrida-inverno não tem nenhuma automação pendurada (conferência o). Dupla proteção.
- **CRM não ressuscita**: `agregarClientes` guarda `clienteBeforeSnap.exists` (crm/agregarClientes.ts:336) — trigger atrasado aterrissando depois da ordem 80 encontra o doc morto e não escreve.
- **Membros/desafios (60) antes do clube (70)**: `sincronizarMembro`/`sincronizarDesafio` reescrevem o DOC DO CLUBE, que morre depois. Ordem certa.
- **Fantasma uid-ritmo-forte morre DEPOIS da causa** — mas a causa é DUPLA, e o handoff da fase 1 contou só metade: `descobrirProfissionais` (analytics/coletaDiaria.ts:131-149) é a UNIÃO de (1) `profissionais` via `listDocuments()` — **que enxerga pai-fantasma com subcoleção** —, (2) `eventos.organizadorId`, (3) `clubes.ownerId`. Matar o clube corta a fonte 3; a fonte 1 continua alimentando o fantasma **enquanto restar UM doc sob `profissionais/uid-ritmo-forte`**. O plano está correto (o grupo 110 varre o subtree inteiro e o fantasma desaparece do `listDocuments`), mas a consequência operacional é dura: **grupo 110 parcial = ressurreição diária para sempre, mesmo com o clube morto**. Vira condição 3a.
- **Delete de clube reescreve dashboards por fan-out** (aggregateProfessionalDashboard.ts:263-268, `before ∪ after`): ritmo-forte → dashboard do fantasma renasce após a ordem 70 (por isso 110 por último com drenagem de 90 s — correto); floripa-run → dashboard do dono reescrito por gatilho (declarado como intocável reescrito, não é toque do plano). Confere.
- **Drenagens**: 20 s entre grupos e 90 s antes dos fantasmas são os valores do runner (`DRENAGEM_PADRAO_MS=20_000`, `DRENAGEM_ANTES_DOS_FANTASMAS_MS=90_000`, limpeza-prod-leela-hub.js:461-462). Bastam para o caso comum; o rabo da distribuição (cold start tardio) é coberto pela verificação pós-apply (condição 3), não pela espera.
- **Crons de 5/15 min não brigam com o apply**: `expirarCarrinhosAbandonados` só toca `status=='aberto'` (os 2 carrinhos condenados são `expirado_sem_concluir`); `estornarPagamentoOrfao` só `cancelado` (o condenado é `falhou`); `virarLote` no-op em `!eventoSnap.exists` (virarLote.ts:152); `varrerIngressosOrfaos` varre pendências `resolvido==false` que não existem. Risco residual anotado: webhook do PSP para o pagamento morto `pag-…68fcbd20` chegando pós-delete — último evento foi 05/08, probabilidade desprezível.

## 3 · TITULARIDADE — a armadilha de 06/08 não se repete

Varredura MINHA (fields + paths de todos os 324 docs): **exatamente 6 referências** a `uid-marina-castelo`/`uid-felipe-martins` (desafio, membro, parceiro, 3 repasses) — **todas dentro do plano** (ordens 60/80). `eventos/teste-taxa-repassada.organizadorId = QbqlSxanxlcFeHCy4g47Vp7jlgz1` (o dono) — nada que sobrevive pertence a marina@. Nenhum tenant `corrida-perfeita` existe (a claim do felipe@ aponta para tenant já morto em 06/08). Órfãos criados entre os 77: zero (seção 1).

## 4 · AUTH — sequência correta, com um parafuso a apertar

`authAcoes` declara `revokeRefreshTokens` antes do delete para as duas contas, e o plano manda Auth DEPOIS do Firestore e do backup duplo. As 6 referências morrem nas ordens 60/80, bem antes. Condição 2g torna binding o re-check de zero referências antes de puxar o gatilho (a REV3 de 09/08 já tinha mandado exatamente isso).

## 5 · FRESCOR — conferido contra produção às 16:44:55Z: DIVERGÊNCIA ZERO

Sonda read-only (23 min depois do congelamento): **20/20 docs da amostra** com `updateTime` idêntico ao congelado (10 preservados + 10 condenados, incluindo o snapshot de hoje do fantasma), **16/16 contagens de coleção** idênticas (pedidos 3, pagamentos 3, eventos 2, atletas 18, carrinhos 4, pix 3, clubes 2, códigos 3, pessoas 1, repasses 3, crmClientes 77, snapshots ritmo-forte 13, inscritos 91, rateLimits 5, reenvios 1, auditoria 1), **18/18 coleções-raiz** (nenhuma nova, nenhuma sumida), **Auth 21/21**. O plano congelado de 16:21Z continua verdadeiro.

**A borda do cron**: o cron das 06:05Z (03:05 América/São_Paulo) de HOJE já está DENTRO do inventário (snapshots 2026-08-10 congelados). O próximo é **2026-08-11T06:05Z** — e ele grava `analyticsSnapshots/2026-08-11` sob o fantasma, que NÃO está no plano. Vira condição 1.

## 6 · DÚVIDAS D1-D6 — defaults conferidos, recomendação por dúvida

Todos os seis defaults aplicados são os conservadores (fica vivo / fica fora) — conferido no plano, não no texto:

- **D1** (atleta anônimo 4LdgQ09W de 05/08): FORA do plano ✔ (está nos 77). Recomendo: manter fora desta purga; se o dono quiser matar, entra na segunda leva da D2. A prova é circunstancial (criado 1 min após teste de reset de senha) — circunstancial não apaga.
- **D2** (13 contas Auth anônimas): FORA ✔ (`authAcoes` tem só marina@ e felipe@ — verificado). Recomendo: segunda leva própria, DEPOIS desta purga aterrissar, como mini-plano congelado Auth-only; 12 delas ficarão sem lastro nenhum pós-purga; `wNXRT…` e `MOXZ…` nunca entram (lastro da compra real e do diagnóstico). Delete de conta Auth não tem trigger Firestore (onCreateUser é create-only) — barato, mas é decisão do dono.
- **D3** (trilha R$63 do dono, 9 docs DENTRO como conflito declarado): **precedente VERIFICADO e sólido** — abri `C:\dev\leela-apply-20260806\plano-apply.json`: os 19 conflitos de 06/08 eram EXATAMENTE esta classe (pedidos/pagamentos/carrinhos/cobranças `falhou` do uid wNXRT contra eventos condenados — chk `1c675f35`, `60f7487f`, `963e27d7`), aceitos (`apply.log:74`) e apagados com autoridade do dono. Três pedidos falhados do wNXRT morreram lá. A trilha R$63 nunca moveu dinheiro (status `falhou`, nunca cobrado) e o diagnóstico que importa (PIX de 04/08) é a trilha MOXZ, preservada. **Recomendo: MANTER no plano**, com duas travas: (i) os 9 docs só passam pelo gate explícito de conflitos, (ii) o ack pré-apply ao dono NOMEIA a trilha R$63 numa linha — é dado de dinheiro do dono; a linha custa nada, o veto dele custa regenerar o plano (nunca editar o arquivo à mão).
- **D4** (trilha MOXZ, R$10): FICA ✔ — verificado por padrão no checador: zero caminhos MOXZ no plano. Recomendo: confirmar que fica; mora no subtree do evento preservado e é o diagnóstico PIX.
- **D5** (números macro): o plano não edita nada ✔ (247 exclusões, 0 edições — conferido). **Correção de registro que muda a recomendação**: `platform/rollups` NÃO é órfão de mantenedor no código — `agendarRecomputePlatformRollups` (platform/rollups.ts:188-198) recomputa o doc TODA HORA (`'15 * * * *'`, América/São_Paulo) a partir de `tenants/*.gmvAcumulado` e `.eventosAtivos`. Ele não está vivo em produção (updateTime do rollups parado em 06/08 21:29 — consistente com "Onda 1 selada SEM deploy"), mas no dia em que a Onda 1 subir, qualquer patch direto em `platform/rollups` será sobrescrito em menos de uma hora e os números do seed (`gmvAcumulado=167277`, `eventosAtivos=5`) voltarão sozinhos ao rollup. **Recomendo: lane própria pós-purga, mirando os CAMPOS DO TENANT (`tenants/castelo-producoes.gmvAcumulado`/`.eventosAtivos`), não o doc de rollups**; o número final continua decisão do dono (veto A6 de 06/08 segue de pé).
- **D6** (5 rateLimits + 1 auditoriaAcessos): FICAM ✔. Recomendo: manter — `auditoriaAcessos/2H7rfYuA…` é trilha da compra REAL (ação do admin sobre o PED-8CDHM) e é evidência, não resíduo; rateLimits são resíduo operacional inócuo.

---

## CONDIÇÕES (numeradas, verificáveis — o apply só roda com todas)

1. **Janela**: o apply — até a ÚLTIMA operação do grupo 110 e o pós-check 3a — termina **antes de 2026-08-11T06:05Z**. Se não der, NÃO estica: recongela (re-rodar `inventario.mjs` + `gerar-plano.mjs` + o checador desta review) — o grupo 110 congelado não conhece o snapshot que o próximo cron grava. Evitar também o bloco 03:00-03:20 América/São_Paulo (quatro crons noturnos). Verificação: carimbo do log do apply.
2. **Contrato do executor da fase 3** (o runner de 06/08 em modo normal REPLANEJA via `montarPlano`, que não representa este alvo — clubes, crmClientes por data, atletas avulsos, subtree de fantasma; a digital divergiria POR CONSTRUÇÃO e o portão abortaria). O executor executa o ARQUIVO congelado, sem replanejar, com TODOS os itens:
   a. **Portão de digital**: recomputar sha256 do texto canônico de `plano.operacoes` do arquivo e exigir `== 87d6289c…`; conferir sha256 do arquivo `== db98441d…` antes de começar. Abortar em divergência.
   b. **Checkpoint indexado**: chave `${indice}:${op.tipo}:${op.caminho}` sobre o array CONGELADO (`chaveDaOp`, execucaoLimpeza), gravado DEPOIS de cada op; retomada lê arquivo + checkpoint e NUNCA replaneja (R2). Reexecução é segura (delete de ausente = 200).
   c. **Drenagens**: 20 s entre grupos de ordem; 90 s antes do grupo 110; drenagem pulada só se o grupo anterior não escreveu nada (retomada).
   d. **Aceite explícito dos 11 conflitos**: a lista aceita tem de bater com `conflitosDeProtecao` do arquivo — contagem E caminhos. Conflito não listado = aborta.
   e. **Backup DUPLO com régua**: export Firestore + export Auth tirados JUNTOS, validados por `validarReguaDoBackup` (tirado ≥ mínimo, idade ≤ teto) antes do primeiro delete. PITR desligado, retenção 1 h — o export é a única volta, e restaurar um sem o outro é o incidente de 06/08 de manhã.
   f. **Portão de frescor substituto** (o executor perde o replanejamento, que era o gate implícito de frescor do runner): pré-flight read-only re-lendo os 247 alvos (updateTime idêntico ao congelado) + contagens de coleção + contagem Auth (a mesma sonda desta review, `frescor.mjs`); QUALQUER divergência aborta e manda recongelar.
   g. **Auth por último**: só depois do apply Firestore verificado + re-check read-only de ZERO referências a `uid-marina-castelo`/`uid-felipe-martins` (re-rodar a conferência f; tem de dar 0); então `revokeRefreshTokens` ANTES de cada delete, na ordem declarada em `authAcoes`.
   h. **Nada fora da lista**: o executor recusa qualquer operação que não esteja no array congelado. Resíduo descoberto no meio = anotar, terminar o plano, novo mini-plano congelado. Nunca "aproveitar que está aqui".
3. **Verificações pós-apply** (read-only, no mesmo ato):
   a. `profissionais/uid-ritmo-forte`: `listCollectionIds` devolve ZERO subcoleções — com um doc restante o cron ressuscita o fantasma TODO DIA (fonte 1 do `descobrirProfissionais`, seção 2). Se algo reapareceu (gatilho tardio/cron), é mini-plano novo, não delete improvisado.
   b. Subtree de `eventos/corrida-inverno-floripa-2026`: re-listagem devolve zero docs (pega ressurreição por gatilho tardio, improvável pelos guards mas barata de conferir).
   c. `saldo/current`: `vendidoBruto=10` e `comprometido=0` (recomposição esperada por `onFinanceiroEventoWrite`/`onRepasseWrite`).
   d. Sobreviventes = 77 e os intocáveis re-sondados idênticos (mesma amostra desta review). Dashboard do dono reescrito por gatilho é ESPERADO, não defeito.
4. **D3 no ack do dono**: a linha nomeando a trilha R$63 (9 docs, conflito aceito, precedente 06/08) entra na confirmação pré-apply. Veto do dono = regenerar plano congelado (nova digital) + rodar o checador desta review no diff; jamais edição manual do arquivo.
5. **Report pós-purga fecha VITRINE-2 e SEMKIT (S318-T6) no painel** como sem-objeto, junto — como a rodada de 09/08 mandou (registro, não execução).

## Base dos scripts da fase 1 para o executor

`scripts/` da fase 1 dá base REAL para a fase 3: `gtok.mjs` (token provado), `frescor`-style probe (esta review deixou `frescor.mjs` e `checar-antagonista.mjs` prontos no scratchpad da sessão — copiá-los para o diretório do apply antes de rodar), e o runner de 06/08 fornece as primitivas certas (`digitalDoPlano`, `chaveDaOp`, `executarPlano` com drenagem condicional, `validarReguaDoBackup` — tudo em `C:\dev\leela-apply-20260806\build\`). O que NÃO existe pronto: o modo "executa arquivo sem replanejar fora da retomada" com aceite de conflitos desta lista e o passo Auth. É trabalho de montagem, não de invenção — e nada disso se improvisa no dia.

## Artefatos desta review

- Este handoff.
- Scratchpad da sessão (`…\scratchpad\replay\`): `checar-antagonista.mjs` (checagens independentes), `frescor.mjs` (sonda read-only reutilizável no pré-flight), `plano-replay.json`/`plano-replay-legivel.txt` (replay, digital idêntica).
- Nenhum artefato congelado da fase 1 foi alterado; nenhum write em produção.
