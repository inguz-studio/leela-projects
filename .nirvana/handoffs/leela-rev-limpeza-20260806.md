# REV-LIMPEZA — review antagonista do `--apply`

**Lane:** `REV-LIMPEZA` · **Trace:** `leela-limpeza-prod-20260806` · **Employee:** `sf-qa-engineer` (antagonista)
**Data:** 2026-08-06 · **Repo:** `C:\dev\LEELA` · **Projeto:** `leela-hub`

- **Rodada 1** — alvo `d887528e` · veredito **BLOQUEAR** (4 bloqueadores, 6 ajustes)
- **Rodada 2** — alvo `8f3a569a`, `4a1eebce`, `73e2c593`, `5f36eecd` · plano congelado `8aa714b4…` (2.817 operações) · veredito **BLOQUEAR** (2 razões) — ver `## RODADA 2` no fim

---

# RODADA 1

## VEREDITO: **BLOQUEAR** o `--apply`

O plano apaga os agregados do evento **antes** dos 710 inscritos que os recriam, e nada nele sobrevive a uma queda no meio: uma segunda passada do mesmo comando deixa de enxergar o que já morreu e devolve "0 exclusões, 0 órfãos" sobre um banco pela metade.

Nada aqui é palpite: cada achado abaixo tem prova executada. Não rodei `--apply`, nem escrita de nenhum tipo. Leitura de produção, dado sintético e a função pura do próprio plano.

---

## Bloqueadores

### B1 · Os agregados morrem antes dos inscritos que os ressuscitam · CRÍTICO

`ORDEM.FOLHAS_EVENTO = 30` (`functions/src/limpeza/planoLimpeza.ts:85`) põe `aprovisionamento`, `demografia`, `financeiro` e `inscritos` no **mesmo grupo**, e o desempate é alfabético (`planoLimpeza.ts:375`). No plano real:

| subcoleção | operações |
|---|---|
| `comunicacoesResumo` | 827 |
| `aprovisionamento` | 959–962 |
| `demografia` | 967 |
| `financeiro` | 968 |
| **`inscritos`** | **1401–1862** |
| documento do evento | 2027 |

Cada um dos 462 deletes de inscrito de `meia-floripa-2026` dispara `agregarFinanceiro` (`tx.set` em `financeiro/current`, `agregarFinanceiro.ts:316`), `agregarEstoque` (`tx.set` por SKU, `agregarEstoque.ts:192`) e `agregarDemografia` (`tx.set`, `agregarDemografia.ts:162`). Os três só desistem se o documento do evento não existir — e ele só morre 165 operações depois. Não é corrida: é **determinístico**. Os agregados voltam, o evento é apagado em seguida, e eles ficam como documentos órfãos sob um pai inexistente — invisíveis no console e invisíveis para qualquer inventário futuro, porque `documents.list` não devolve pai que não existe.

Mesmo mecanismo em `comunicacoesResumo` (op 827, logo após as 820 `comunicacoes` que o recomputam via `agregarComunicacoes.ts:95`).

O que volta não é cópia do que morreu. `financeiro/current` renasce com a `receitaBruta` original e zero inscritos. `aprovisionamento/*` renasce com `estado` rebobinado para `'estimativa'`, `estoqueFisico: 0` e o `historico` append-only **zerado** — e `em_estoque` é estado terminal, então isso não se reconstrói.

**Prova:** ordenação extraída de `dryrun.txt` (2810 operações reais) cruzada com o código dos gatilhos.
**Correção:** dar aos agregados ordem **posterior** a `ORDEM.EVENTO`, para que o gate `if (!eventoSnap.exists) return null` mate o recompute; e drenar entre grupos de ordem.

### B2 · O plano não é retomável, e mente que está limpo · CRÍTICO

`eventosCondenados` e `tenantsCondenados` saem do que **ainda existe** no inventário (`planoLimpeza.ts:235-242`). Assim que a entidade é apagada, ela deixa de ser condenada — vira invisível. Toda a detecção de órfão e toda a poda de chave degradam para no-op silencioso depois de uma queda parcial.

**Prova executada** (dado sintético, função pura compilada, sem tocar em produção):

Queda depois do documento do evento (ordem 40), antes das raízes (ordem 50):

```
RODADA 1: 6 operações planejadas, 0 órfãos previstos
QUEDA — 2 operações feitas, 5 faltando
RODADA 2 (mesmo comando, mesmo alvo):
   [100] EDITAR tenants/vivo
   ORFAOS QUE O SCRIPT DENUNCIA: 0

   O que de fato sobrou apontando para um evento que não existe mais:
     pedidos/ped-1      {"eventoId":"ev-morto","status":"pago","valorTotal":510.3}
     pagamentos/pag-1   {"eventoId":"ev-morto","status":"confirmado"}
     carrinhos/c1       {"eventoId":"ev-morto"}
```

Um pedido **pago** de R$ 510,30 fica pendurado para sempre num evento que não existe, e o script sai com sucesso dizendo que não há órfão nenhum.

Segunda variante, queda entre a última exclusão (ordem 90) e as edições (ordem 100): a poda de `platform/rollups` **desaparece do plano** na rodada 2, e a chave do tenant morto — com nome e GMV — fica presa no rollup permanentemente.

O runner também não registra progresso: o laço de aplicação (`limpeza-prod-leela-hub.ts:352-360`) só imprime a cada 50 operações e não grava checkpoint. Depois de uma queda não existe nem a lista do que foi feito.

**Correção:** condenar por lista **literal e congelada** de ids (o `ALVO` já é literal — basta não derivar de `*Existentes`), gravar checkpoint por operação, e tornar a varredura de órfãos independente da existência do alvo.

### B3 · `uidsProtegidos` não protege nada · ALTO

`AlvoLimpeza.uidsProtegidos` (`limpeza-prod-leela-hub.ts:56-63`) é lido em exatamente um lugar: o filtro do relatório `contasSemLastro` (`planoLimpeza.ts:364-373`). **Nenhum passo de exclusão o consulta.** O nome promete uma garantia que o código não tem.

Não é teórico. Cruzando `dryrun.txt` com o grafo de produção, o plano apaga **14 documentos** do uid marcado como protegido `wNXRTvMM3vc7…` ("sessão que fez a compra real, pedido 8CDHM"): 3 `pedidos`, 3 `pagamentos`, 3 `cobrancasPixAtivas`, 2 `carrinhos` + 2 `ciclos`, 1 `inscritos`.

Hoje isso é inofensivo — são pedidos cancelados/falhos em eventos condenados, e a compra paga de verdade sobrevive. Mas a proteção que o operador acredita ter não existe: se a compra real estivesse num evento condenado, ela sairia sem um aviso. Nenhum dos 26 testes cobre isso — o único que cita `uidsProtegidos` (`limpezaProd.test.ts:286`) testa o relatório, não a exclusão.

**Correção:** um gate real no Passo 1 que recuse condenar documento cujo caminho ou campo aponte para uid protegido, e um teste que falhe se ele sair.

### B4 · Os contadores de dinheiro sobrevivem ao dado que contavam · ALTO

`platform/rollups` lido de produção agora:

```
tenantsAtivos      4
gmvTotal           364627
receitaLeelaTotal  39598.84
tenants.castelo-producoes = { gmv: 167277, receitaLeela: 17564.09, eventosAtivos: 5, ... }
```

`podarChavesCondenadas` remove as 5 chaves de tenant morto e **para ali** (`planoLimpeza.ts:458` — não desce depois de reescrever o ramo). Os três totais de raiz e os números do tenant sobrevivente ficam intactos. Depois da limpeza sobra 1 tenant com 2 eventos e uma venda real de R$ 10, e o painel do platform_admin segue exibindo R$ 364.627 de GMV, 4 tenants ativos e 5 eventos ativos.

`platform/rollups` só é reescrito por `recomputePlatformRollups` (`platform/rollups.ts:110`), que é **callable manual de platform_admin** — não há cron. Sem alguém chamar, o número errado é permanente.

Mitigação que existe, e é frágil: `tenants/castelo-producoes/saldo/current` (hoje `vendidoBruto: 167287`, `disponivel: 122756.65`) **se cura sozinho por acidente**. As 3 edições de `repasses` são as últimas operações do plano (ops 2808–2810) e disparam `onRepasseWrite` (`updateSaldoRepasse.ts:394-399`), que não tem guarda nenhuma e chama `recomputarSaldoRepasse` — já sobre o estado final, depois de todas as exclusões.

⚠️ **Essa cura desaparece se o ajuste A1 for aceito.** Tirar `dadosBancariosSnapshot` do renomeador remove as 3 escritas em `repasses`, e com elas o único recompute pós-limpeza do saldo. Quem corrigir A1 tem de acrescentar um recompute explícito de saldo ao runbook, ou troca um defeito por outro.

**Correção:** chamar `recomputePlatformRollups` como passo final do runbook, recomputar o saldo do tenant explicitamente, e conferir `gmvTotal`, `receitaLeelaTotal`, `tenantsAtivos`, `eventosAtivos` e `vendidoBruto` antes de declarar a lane fechada.

---

## Ajustes exigidos (não bloqueiam sozinhos, mas entram junto)

### A1 · Reescrever `titular` de snapshot financeiro é adulteração de registro, não renomeação

O plano troca, por substring cega:

```
tenants/castelo-producoes/dadosBancarios/current   titular = "Leela LTDA"
tenants/…/repasses/repasse-demo-0001               dadosBancariosSnapshot.titular = "Leela LTDA"
tenants/…/repasses/repasse-demo-0002               idem
tenants/…/repasses/repasse-demo-0003               idem
```

`dadosBancariosSnapshot` existe para registrar **o que era verdade na hora do repasse**. Reescrevê-lo apaga o registro. E "Leela LTDA" é razão social inventada por concatenação — `titular` é o nome do titular da conta bancária real, e ninguém decidiu que ele é esse.

**Correção:** tirar `repasses.*.dadosBancariosSnapshot` do escopo do renomeador (snapshot é histórico) e trocar `dadosBancarios/current.titular` por decisão explícita do dono, não por `split/join`.

### A2 · Das 20 superfícies do nome, o plano cobre 9

Confirmado contra produção. Ficam como estão, porque não contêm a string literal `Castelo Produções`:

```
perfis/castelo · handle          = "castelo"                                → URL pública /@castelo
perfis/castelo · linksExternos[0]= "https://instagram.com/casteloproducoes" → público
perfis/castelo · linksExternos[1]= "https://castelo-producoes.example.com"  → público
dadosBancarios/current · pixMascarado = "***@castelo***.com"                → organizador
```

Depois da limpeza a produtora se chama "Leela" e mora em `/@castelo` com Instagram `casteloproducoes`. É decisão pendente, não defeito — mas o handoff da construtora apresenta "20 superfícies medidas" de um jeito que se lê como "20 tratadas".

### A3 · O termo de saúde aceito não foi tratado como histórico nem como texto

`eventos/{id}/termoSaude` tem **zero documentos** em produção: o nome do organizador no termo vem de `perfis/castelo.nome`, renderizado na leitura. Trocar esse campo faz o termo **já aceito** pelo comprador real passar a exibir outra parte contratante, sem versão nova e sem snapshot. Existe maquinário para exatamente isso no repo (`versionarTermoSaude`, hash + bump), e ele não é acionado porque o campo alterado está fora do documento versionado.

**Correção:** decidir explicitamente — ou congelar o nome exibido nos aceites já existentes, ou registrar que a mudança é retroativa e assumida.

### A4 · O portão do `--backup` é decorativo

`limpeza-prod-leela-hub.ts:292-299` só checa string não vazia. `--backup=x` passa. O valor é impresso e nunca usado nem validado contra o bucket.

Conferi o export por fora: ele **existe** (`gs://leela-hub.firebasestorage.app/firestore-backups/leela-limpeza-prod-20260806`, `all_namespaces_all_kinds`, criado 2026-08-06T13:45:45Z). O portão é que não prova nada.

### A5 · O plano revisado já está vencido

`main()` reinventaria e replaneja do zero no `--apply` (`limpeza-prod-leela-hub.ts:307-312`). Não há plano congelado, hash ou diff contra o que foi aprovado. O `--apply` executa um plano que ninguém leu.

E ele **já difere**: a transferência de titularidade aterrissou depois do dry-run. Produção agora:

```
tenants/castelo-producoes            ownerUid      = QbqlSxanxlcFeHCy4g47Vp7jlgz1
eventos/corrida-inverno-floripa-2026 organizadorId = QbqlSxanxlcFeHCy4g47Vp7jlgz1
eventos/teste-taxa-repassada         organizadorId = QbqlSxanxlcFeHCy4g47Vp7jlgz1
```

O handoff da construtora diz que 5 documentos sobreviventes apontavam para `marina@demo-leela.dev`, "incluindo o `organizadorId` dos dois eventos que ficam". Pelo menos esses dois já mudaram. O `dryrun.txt` de 2810 operações descreve um banco que não existe mais.

**Correção:** serializar o plano aprovado em disco e fazer o `--apply` recusar se o plano recomputado divergir; ou refazer o dry-run e revisar imediatamente antes de aplicar.

### A6 · Custo e contenção da janela

Latência medida: **163 ms por chamada REST** (10 amostras) → ~7,6 min só de escrita para 2.810 operações, mais a leitura do inventário.

Amplificação por delete de inscrito: ~4+S escritas diretas e ~5–6+S com segunda ordem (S = SKUs de aprovisionamento). Para 710 inscritos, na ordem de **7.800 escritas** e **~1M leituras**, porque `agregarDemografia`, `virarLote`, `agregarFinanceiro` e `onEventoWriteDashboard` reescaneiam a coleção inteira a cada delete (Σ ≈ n²/2). Os 462 deletes de `meia-floripa-2026` disputam os **mesmos três documentos** em `runTransaction` — contenção garantida, `ABORTED` e retries que inflam ainda mais a conta.

`tokenDeAcesso()` é chamado a cada requisição (`limpeza-prod-leela-hub.ts:107`) e o refresh nunca é cacheado de volta: se o token do configstore vencer no meio, cada uma das 2.810 operações passa a fazer um POST extra em `oauth2.googleapis.com`. É o caminho mais provável para a queda parcial do B2.

---

## O que eu tentei derrubar e **não** consegui

Isto também é resultado. Cada item abaixo era hipótese de defeito e morreu contra evidência.

1. **"O delete dispara e-mail para 710 pessoas."** Falso, e falso na direção segura. `onInscritoWriteAutomacao` sai antes de qualquer trabalho: `if (depois !== 'confirmado' || antes === 'confirmado') return null` (`automacoesTriggers.ts:275`) — no delete `depois` é `null`. Varri os 19 gatilhos de Firestore: **exatamente um** alcança `email/` transitivamente, e é esse, que se protege sozinho. **Nenhum delete deste plano manda e-mail.** A ordem "automações antes dos inscritos" está certa por acidente: a justificativa registrada em `planoLimpeza.ts:13-15` e o nome do teste `limpezaProd.test.ts:111` afirmam uma causalidade que nenhum dos dois verifica.
2. **Crons de varredura mandando e-mail ou POST no Asaas no meio da janela.** Desarmados hoje: `ingressosPendentes` e `estornosOrfaosPendentes` **não existem** em produção (0 documentos), então `varrerIngressosOrfaos` e `varrerEstornosOrfaos` não têm linha para agir. O mecanismo é real — apagar `eventos/{e}/comunicacoes` na ordem 20 destrói o livro-caixa de idempotência da RN-219 enquanto os destinatários vivem até a ordem 30 e os pedidos até a 50 — mas o gatilho está vazio. Só volta a valer se tráfego real criar uma pendência durante a corrida.
2b. **`dispatchAutomacoes` (5 min, com `BREVO_API_KEY`) pegando uma automação viva no primeiro segundo da corrida.** Conferido documento a documento em produção. As únicas automações são duas, ambas em `meia-floripa-2026`: `auto-novo-inscrito` (gatilho `novo_inscrito` — servido pelo gatilho, **não** pelo cron, e o gatilho sai no delete) e `auto-vespera` (**`ativa: false`**, excluída pelo `where('ativa','==',true)`). Não existe nenhuma automação `kit_disponivel` no banco — que era a única classe que nunca vence (`automacoesTriggers.ts:381-383`). As 4 campanhas estão `vencido`, `rascunho`, `enviado`, `enviado`; nenhuma `agendado`, que é o único status que `dispatchCampanhasAgendadas` consulta. **Nenhum caminho de e-mail está armado.**
3. **Cirurgia no CRM errada ou faltando.** O plano faz 0 edições de CRM. Conferi os 736 documentos: 659 só têm inscrição de evento condenado (viram exclusão), 77 só têm inscrição de evento sobrevivente, **0 com ledger misto**, 0 com inscrição sem `eventoId`. Zero edição é o número certo.
4. **Chave de mapa condenada escondida nos sobreviventes.** Testei a brecha que suspeitei — o Passo 3 sai por `continue` (`planoLimpeza.ts:296`) quando a contagem de inscrições não muda, e o Passo 3b pula `crmClientes` (`planoLimpeza.ts:313`), então uma chave morta no mapa `eventos` escaparia dos dois e também de `orfaosPrevistos` (que casa valor, nunca chave). **0 ocorrências** nos 77 sobreviventes. Brecha real, dado limpo.
5. **`pedidoCodigos` separado do pedido.** Consistente. Os 3 pedidos que ficam mantêm seus 3 códigos (`8CDHM`, `N4FHP`, `Q57PA`); os 14 apagados saem com os 14 códigos. Nenhum código sem pedido, nenhum pedido sem código.
6. **O link do ingresso do dono quebra.** Não quebra. `eventos/teste-taxa-repassada/ingressoCodigos/T93N7F` sobrevive, aponta para o inscrito `…ed77a161…-i1`, que sobrevive, do pedido pago `8CDHM`, que sobrevive. O evento inteiro fica (8 documentos, 0 apagados).
7. **`emailVerified` destrava Meus Ingressos.** Pergunta não se aplica ao risco desta lane. O pedido pago do dono tem `responsavel.atletaId = wNXRTvMM3vc7…`, ou seja entra pelo **ramo (a)** de `ehCompradorDoPedido()` (`firestore.rules`), que não exige `email_verified` — a exigência está só no ramo (b). E a limpeza não toca em Auth.
8. **Órfãos sob os tenants apagados.** Nenhum. Varri as subcoleções dos 5 tenants condenados: cobertura total (`commercialTerms` 2+2+2, o resto vazio).
9. **`pessoas` deixando PII para trás.** A coleção tem **1 documento** — o do próprio dono. Os 710 inscritos de seed nunca geraram registro em `pessoas`. Não há PII residual de terceiro.
10. **`perfis` órfãos dos tenants mortos.** `perfis` tem 1 documento (`perfis/castelo`). Nenhum tenant morto tinha perfil público.
11. **A troca de nome forçando todo mundo a re-aceitar o regulamento.** Era o achado mais feio da lista: se o texto legal do evento sobrevivente contivesse "Castelo Produções", o PATCH da ordem 100 bumparia a versão (`versionarRegulamento.ts:87-91`) e, pela RN-149, marcaria **todos os inscritos do evento que fica — inclusive o comprador real — como precisando aceitar de novo**. Não acontece: nenhum dos dois eventos sobreviventes tem subcoleção `politicaVendas`, `termoSaude` ou `regulamento`, e nenhum dos dois documentos de evento contém a string. O `dryrun.txt` confirma — não há uma única operação `EDITAR` em `eventos/*`.
12. **`profissionais/{id}/dashboard/current` reescrito e órfão.** As duas contas de `profissionais` (`dugamer597`, `eusouojoaocalixto`, ambas criadas hoje, ambas protegidas) **não têm subcoleção nenhuma**. Não há dashboard para ressuscitar.

---

## Correção de fato no handoff da construtora

"PITR está DESLIGADO … Não existe 'voltar trinta minutos'." O primeiro pedaço é verdade, o segundo não. A API do banco devolve agora:

```
pointInTimeRecoveryEnablement  POINT_IN_TIME_RECOVERY_DISABLED
deleteProtectionState          DELETE_PROTECTION_DISABLED
versionRetentionPeriod         3600s
earliestVersionTime            2026-08-06T13:39:29Z
```

Há uma **janela de retenção de versão de 1 hora**, que existe mesmo sem PITR. Dentro dela dá para ler documentos num `readTime` passado e disparar `exportDocuments` com `snapshotTime` anterior à corrida. Isso transforma "sem volta" em "uma hora de volta" — vale confirmar operacionalmente e colocar no runbook antes de aplicar, porque é a rede mais barata disponível.

⚠️ E o export do T1 (13:45:45Z) é **anterior** à transferência de titularidade. Restaurar hoje desfaz a transferência junto.

---

## O que vira LIBERAR

1. Agregados (`financeiro`, `demografia`, `aprovisionamento`, `comunicacoesResumo`) reordenados para **depois** de `ORDEM.EVENTO`; drenagem entre grupos de ordem. **[B1]**
2. Condenação por lista literal congelada, checkpoint por operação e varredura de órfão que não dependa da entidade ainda existir. Reexecução do mesmo comando duas vezes tem de ser provada segura, com teste. **[B2]**
3. Gate real de `uidsProtegidos` no Passo 1, com teste que falhe quando um documento protegido entrar no plano. **[B3]**
4. `recomputePlatformRollups` no runbook, com conferência de `gmvTotal`, `receitaLeelaTotal`, `tenantsAtivos` e `eventosAtivos` depois da corrida. **[B4]**
5. `repasses.*.dadosBancariosSnapshot` fora do renomeador; `titular` decidido pelo dono — **e, junto, um recompute explícito do saldo do tenant no runbook**, porque tirar essas 3 escritas remove o recompute acidental que hoje conserta `saldo/current`. **[A1 + B4]**
6. Decisão explícita sobre `handle`, `linksExternos`, `pixMascarado` e sobre o termo de saúde já aceito. **[A2, A3]**
7. Dry-run refeito e revisado imediatamente antes do `--apply`, com plano serializado e recusa em caso de divergência. **[A5]**
8. Janela de baixa circulação, e a janela de 1 h de retenção de versão confirmada e anotada como plano de volta. **[A6, correção]**

---

*Nenhuma escrita em produção nesta lane. Nenhum `--apply`. `apps/painel` e `apps/landing` não foram tocados.*

---

# RODADA 2

**Alvo:** `8f3a569a`, `4a1eebce`, `73e2c593`, `5f36eecd` · plano congelado `8aa714b48f1794305ae668c9fde2233be19bb8dacd9116d6458c000c8696978a`, 2.817 operações.
Ordem resultante: `10:7 · 20:826 · 30:1182 · 40:16 · 50:60 · 60:38 · 70:1 · 80:665 · 90:5 · 100:7 · 110:10`.

## VEREDITO: **BLOQUEAR** o `--apply`

A retomada guarda o checkpoint por `tipo:caminho` e o plano tem dois pares de operações que compartilham essa chave, então uma queda entre elas faz o `--retomar` pular as duas; e a condenação não é transitiva sob `clubes/`, o que deixa 45 documentos de nível 2 vivos sob pai apagado enquanto o runner imprime "nenhuma referência pendurada NOVA prevista".

Dois dos quatro bloqueadores morreram como anunciado. Um morreu com ressalva. Um foi rebaixado, não fechado. E apareceu um defeito novo, da mesma família dos anteriores.

---

## Placar dos quatro

| # | Alegação | Veredito | Prova |
|---|---|---|---|
| B1 | Evento morre primeiro; os 4 agregadores compartilham o gate | **MORREU** | 4 guardas conferidas linha a linha; ordem 40 depois de 30 |
| B2 | Lista literal + checkpoint + `--retomar` | **NÃO MORREU** | colisão de chave provada executando o laço do runner |
| B3 | `intocavel()` é gate; proteção antes de conteúdo | **MORREU** (com ressalva) | leitura dos 3 caminhos de `condenar()` e do Passo 3c |
| B4 | Totais viram `recomputesObrigatorios` | **REBAIXADO** | os quatro números seguem errados depois do apply |

---

## B1 — morreu. Conferi a inversão, inclusive o que ela poderia ter quebrado.

As quatro guardas existem exatamente onde ela diz, com o mesmo texto:

```
agregarFinanceiro.ts:220    if (!eventoSnap.exists) return null;
agregarEstoque.ts:110       if (!eventoSnap.exists) return null;
agregarDemografia.ts:120    if (!eventoSnap.exists) return null;
agregarComunicacoes.ts:61   if (!eventoSnap.exists) return null;
versionarRegulamento.ts:109 if (!change.after.exists) return null;
```

Com `ORDEM.EVENTO=10`, os 1.182 deletes de folha da ordem 30 encontram o pai já morto e nenhum recompute acontece; os 16 agregados saem na ordem 40 e nada os ressuscita. O mecanismo do B1 está fechado.

Persegui o que a inversão poderia ter quebrado, porque apagar o pai antes dos filhos muda a semântica de tudo que lê o evento durante a corrida. Nenhum destes pegou:

- **`itensKit`** — `syncItemUsadoEm` abre com `if (!itemSnap.exists) return false` e escreve com `update()`, não `set()`. Deletar item não o ressuscita (`itemKitIndex.ts:40,70`).
- **Fantasmas novos criados pela própria corrida.** `onEventoWriteDashboard` e `onClubeWriteDashboard` fazem `.set()` incondicional (`aggregateProfessionalDashboard.ts:218`), e a ordem 10 dispara os dois. Medi os quatro uids que recebem escrita — `uid-marina-castelo` (organizador dos **7** eventos condenados), `uid-felipe-martins`, `uid-ritmo-forte` e o dono — e **os quatro já têm `dashboard/current`**. O `set` atualiza caminho existente; não nasce fantasma novo. Os 4 fantasmas × 31 documentos batem (10+10+10+1). A varredura na ordem 110, depois da 100, cobre o que precisa cobrir.
- **Profundidade.** Medida independente: o nível máximo materializado hoje é **2** (`clubes/{c}/desafios/{d}/acoes/{a}`), e o varredor para em 4. A medição dela está certa, com duas casas de folga.
- **Fantasma sob identidade protegida.** `profissionais/QbqlSxan…` é fantasma e fica de fora da varredura. Correto: o dono virou organizador dos dois eventos que ficam e ainda não tem documento em `profissionais` — é lacuna a preencher, não lixo.

**Ressalva sem gravidade:** a drenagem de 10 s entre grupos é constante chutada, não medida. Ela só é carga na fronteira 100 para 110: a edição de `clubes/ritmo-forte-assessoria` (ordem 100) dispara `onClubeWriteDashboard`, que faz `set` em `profissionais/uid-ritmo-forte/dashboard/current`. Se essa escrita chegar depois da varredura, o documento volta. É lixo invisível, não perda — mas 10 s é palpite.

---

## B2 — NÃO morreu. A metade consertada é a que estava testada.

A condenação literal está certa e os testes provam. O defeito mudou de lugar: foi para o runner, que **não tem teste nenhum**. Nenhum arquivo de teste menciona `checkpoint`, `chaveDaOp`, `--retomar`, `digitalDoPlano` ou `validarBackup`; os testes `[B2] retomada idempotente` exercitam `planejarLimpeza`, não o laço que retoma.

`chaveDaOp` (`limpeza-prod-leela-hub.ts:352`) é `${op.tipo}:${op.caminho}` — **não inclui o índice nem as mudanças**. E o plano tem dois pares que colidem:

```
#2 [100] editar:perfis/castelo        nome
#3 [100] editar:perfis/castelo        linksExternos
#4 [100] editar:platform/rollups      tenants
#5 [100] editar:platform/rollups      tenants.castelo-producoes.nome
```

`lerCheckpoint` devolve um `Set` (`:343-351`) e `feitas.has(chave)` (`:486`) casa as duas. Rodei o laço do runner contra dado sintético com a forma real, cortando entre as duas:

```
rodada 1 aplicou 3 operações; última = editar:perfis/castelo
rodada 2 (--retomar) aplicou: editar:platform/rollups, editar:platform/rollups,
                              editar:tenants/castelo-producoes

operações no plano: 7
execuções totais  : 6
*** uma operação editar:perfis/castelo nunca foi executada ***
```

A segunda edição do par é pulada e o runner termina anunciando sucesso. Na queda equivalente em `platform/rollups`, o que se perde é a troca do nome — e o rollup fica com "Castelo Produções" para sempre, que é justamente o B4 voltando pela porta do B2.

Sobre a pergunta da retentativa: o resto está certo. O checkpoint é gravado **depois** da operação (`:487-491`), então uma queda entre a escrita e o registro reexecuta a operação — e reexecutar é seguro, porque `DELETE` em documento ausente devolve 200 e o `PATCH` carrega corpo fixo vindo do plano congelado, com máscara e valores idênticos. Retentativa mais checkpoint **não** aplica duas vezes nada que importe. O buraco não é esse; é a chave.

**Vira LIBERAR com:** `chaveDaOp` incluindo o índice da operação no plano (ou o hash das mudanças), e um teste do laço de retomada — não do planejador — que corte em todos os limites e confira que a soma das execuções das duas rodadas é exatamente o plano.

---

## B3 — morreu, com uma ressalva de forma.

`intocavel()` é gate de verdade: `condenar()` (`planoLimpeza.ts:410-414`) checa o caminho protegido **antes** de qualquer outra coisa e sai. No Passo 3c a inversão que ela descreve está lá e está certa — `intocavel(pai)` na linha 520, antes do teste de conteúdo na 524.

Uma ressalva: no mesmo Passo 3c, a **terceira** checagem (`intocavel(doc.caminho)`, linha 525) continua **depois** do conteúdo. Um documento cujo caminho próprio é protegido, cujo pai não é, e que não aponta para condenado, sai pela linha 524 — preservado pelo conteúdo, não pela regra. O desfecho é o mesmo (não é apagado), então isto é forma, não risco: só não aparece na lista `intocaveis`. Vale mover, por simetria com o resto.

**Ressalva operacional que o runbook precisa registrar:** `conflitosDeProtecao` não impede a exclusão, ele trava a corrida (exit 4). Os 14 documentos de chave composta do dono (`ped-wNXRTvMM3vc7…`, `carrinhos/wNXRTvMM3vc7…__…`, `pagamentos/pag-wNXRTvMM3vc7…`) vão gerar conflito, então **o comando documentado no cabeçalho do script vai sair com exit 4**. Só anda com `--aceitar-conflitos-de-protecao`, que é uma liberação em bloco: aceita esses 14 e qualquer outro que apareça junto. Melhor que a rodada 1, onde eles sumiam calados — mas quem apertar precisa ter lido os 14 na tela.

---

## B4 — rebaixado, não fechado.

A poda funciona em qualquer profundidade agora. Mas a pergunta era o que acontece se ninguém rodar o recompute, e a resposta é: **exatamente o mesmo defeito da rodada 1.** Depois do apply, `platform/rollups` continua com `gmvTotal: 364627`, `receitaLeelaTotal: 39598.84`, `tenantsAtivos: 4` e `castelo-producoes.eventosAtivos: 5` para um tenant com 2 eventos e uma venda real de R$ 10. O único escritor é callable manual, sem cron.

O que melhorou é honestidade: o número forjado virou lacuna declarada, e o runner fecha com o aviso em vez de abrir com ele (`:496-497`). Para uma operação supervisionada isso é defensável, e por isso não bloqueio por ele sozinho.

Mas era barato transformar promessa em garantia, e não foi: o script já tem o mapa `tenants` podado nas mãos. Somar `gmv` e `receitaLeela` dos sobreviventes e contar `status === 'ativo'` fecha os quatro números num PATCH, sem depender de ninguém lembrar.

---

## ACHADO NOVO · N1 — a condenação não é transitiva sob `clubes/` · BLOQUEADOR

Sob `eventos/` e `tenants/`, `eventoDoDoc`/`tenantDoDoc` resolvem o dono pelo **caminho** (`idNoNivel(caminho, 0)`), então a condenação desce por prefixo em qualquer profundidade. Sob **qualquer outra raiz** — inclusive `clubes/` — o dono só sai de **campo** (`planoLimpeza.ts:191-204`). E o modelo carrega `tenantId` até o nível 1 e para ali.

Medido em produção: os documentos de nível 2 sob `clubes/` carregam só `{acaoRef, meta}` ou `{valor}`. Nenhum `tenantId`, nenhum `eventoId`. Resultado:

```
45 documentos de nível 2 sobrevivem sob pai apagado
   33  clubes/{c}/desafios/{d}/acoes/{a}
   12  clubes/{c}/parcerias/{p}/conversoes/{x}

   27  sob clubes/corrida-perfeita-sul   (o clube inteiro é apagado)
   18  sob clubes/floripa-run-coletivo   (o clube fica; desafios e parcerias morrem)
```

Prova contra a função pura, com a forma exata medida, e com um controle que isola a causa:

```
APAGA clubes/corrida-perfeita-sul/desafios/verao-leve-2026
FICA  clubes/corrida-perfeita-sul/desafios/verao-leve-2026/acoes/meditar    <<<< ORFAO
APAGA clubes/floripa-run-coletivo/desafios/rumo-meia-floripa
FICA  clubes/floripa-run-coletivo/desafios/rumo-meia-floripa/acoes/correr   <<<< ORFAO
APAGA clubes/floripa-run-coletivo/parcerias/parceria-meia-floripa-frc
FICA  .../parcerias/parceria-meia-floripa-frc/conversoes/c1                 <<<< ORFAO

controle — mesma profundidade, sob raiz `eventos`:
APAGA eventos/meia-floripa-2026/inscritos/i1/saude/config                   (correto)

O QUE O RUNNER IMPRIME:
  ÓRFÃOS QUE O PLANO PREVINE : "nenhuma referência pendurada NOVA prevista."
  DOCUMENTOS-FANTASMA        : "nenhum."
```

O controle fecha o diagnóstico: mesma profundidade, comportamento oposto, e a única diferença é a raiz do caminho.

Duas defesas passam reto, e é isso que faz disto um bloqueador e não uma nota. `orfaosPrevistos` casa **valor de string**, e estes documentos não contêm nenhum id condenado — então a lista sai vazia. E a varredura de fantasmas da ordem 110 exige `fantasma === true` **no inventário**; estes pais estão vivos na leitura e só morrem durante a corrida, então o plano não pode enxergá-los. A lane termina anunciando zero órfãos novos com 45 recém-criados, que é a mesma falha de honestidade que travou o B2 na rodada 1.

O dano é lixo invisível, não perda de dado: são referências inertes, sem PII e sem dinheiro. Mas o critério declarado da lane é "nenhum órfão novo", e o número real é 45.

**Vira LIBERAR com:** condenação por prefixo de caminho — se o documento ancestral está condenado, o descendente está condenado, em qualquer raiz e qualquer profundidade — e `orfaosPrevistos` passando a denunciar sobrevivente cujo caminho tem prefixo apagado, não só sobrevivente que cita id condenado.

---

## O que vira LIBERAR na rodada 2

1. `chaveDaOp` com índice ou hash das mudanças, e **teste do laço de retomada do runner**, cortando em todos os limites. **[B2]**
2. Condenação transitiva por prefixo de caminho, e `orfaosPrevistos` enxergando órfão estrutural além do órfão por referência. **[N1]**
3. Recomputar `gmvTotal`, `receitaLeelaTotal`, `tenantsAtivos` no próprio PATCH em vez de deixar recado. **[B4 — recomendado, não bloqueia]**
4. Terceira checagem do Passo 3c antes do teste de conteúdo, por simetria. **[B3 — forma]**
5. Runbook registrando que o `--apply` sai com exit 4 sem `--aceitar-conflitos-de-protecao`, e que os 14 documentos do dono precisam ser lidos na tela antes. **[B3]**
6. Medir a drenagem em vez de chutar 10 s, ao menos na fronteira 100 para 110. **[B1 — ressalva]**

*Nenhuma escrita em produção nesta rodada. Nenhum `--apply`. `apps/painel` e `apps/landing` não foram tocados.*
