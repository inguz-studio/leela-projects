# Maestro — plano da noite 05/08 (trace leela-pixreal-diag-20260804)

**Ordem do dono (05/08, verbatim):** "siga o roadmap e todos os ajustes que conversamos, irei dormir, nao pare por nada até ter o que perciso revisar do seu trablaho. até mais tarde"

Regra de autonomia vigente: só parar por token real, regra não clara ou block duro. Marco = checkpoint-e-continua. Cada build ganha review antagonista antes de qualquer "resolvido"; deploy só de código revisado; lanes serializadas por território; alarme de 1h por lane; teto de modelo opus nas lanes.

## Estado ao selar o plano

- HEAD `bca95e71` (specs seladas; painel com 7 vetáveis, defaults em vigor).
- EM VOO: DEPLOY-POSPAG (rules+functions+landing revisados + reenvio oficial do pedido do dono `...ed77a161...` / T93N7F + prova delivered Brevo).
- Brevo destravada (200 provado). Ingresso do dono existe. Link LLIP1 validado em produção.

## DAG da noite (executar na ordem; ∥ = paralelo por territórios distintos)

1. **DEPLOY-POSPAG aterrissa** → conferir provas (releases, smoke, reenvio, delivered). Se reenvio falhar: diagnosticar e resolver (técnica de pagamento/e-mail não sobe ao dono), re-executar UMA vez com evidência.
2. **BUILD-PDF** (Frente 4, S1214-T5; apps/landing; sem ⚔ mas 2 gates nomeados: nome de arquivo sem dado cru; PDF para onde o QR para) ∥ **BUILD-COD5A** (Frente 5a, S1228-T1 geração+reserva `pedidoCodigos`; core+functions; ⚔). Despachar os dois juntos quando o deploy aterrissar.
3. REV do 5a (⚔, contexto fresco). PDF: gate executável no lugar de ⚔ (vira ⚔ só se criar Function nova/mover verificação de token — a spec proíbe).
4. **BUILD-COD5B** (backfill dry-run default; ⚔). CONSTRUIR + testar + rodar SÓ dry-run em produção (leitura). `--apply` é ATO DO DONO — deixa comando pronto no kanban, NÃO executar.
5. **Frente 2 — área do cliente** (a maior da noite): fila ADMINSEP como escrita (`02-rodadas/2026-08-02-retomada/11-fila-contas-e-area-cliente.md`), S1221-T1 (login na landing) antes da B2; C1 `/definir-senha`; C2 destino → Meus Ingressos; A-tasks conforme fila (ADMINSEP-2 default em vigor: botão → área do organizador, só para quem é organizador). Quando B2 subir: **S1225-T4** (CTA "ver meus pedidos") + **5c/5d** (superfícies do código PED- em landing/painel + e-mail). Reviews ⚔ conforme fila ADMINSEP.
6. **RF2-1** (webhook: lista parcial fecha com falhas:0) — lane própria + review (mexe no caminho do dinheiro).
7. **F6** (observação read-only): cobrança QA `pay_6e37hktx4xld12qf` vence HOJE 05/08 — conferir que a expiração materializa `pix_expirado` no pedido QA. Só leitura + registro.
8. **Deploy final da noite** (só pacotes revisados) + smoke + provas.
9. **Selo da manhã**: boards/épicos/painel atualizados; memória do projeto (Orkestra memory + MEMORY.md); relatório HTML do run (`build-report-html.ts`); RESUMO DE REVISÃO para o dono: o que mudou, provas, lista de conferência visual (4 itens da tela + PDF + área do cliente), vetáveis pendentes (7 + o que nascer), o que ficou de fora e por quê.

## O que NÃO fazer esta noite

- Frente 3 (Arena Social): BLOQUEADA pelos vetos ARENA-1/2/3 — não construir.
- POSSE-EMAIL-1: NÃO implementar o default (mudança de fronteira de segurança aguarda ratificação; item de painel).
- Backfill `--apply` em produção: ato do dono.
- Suíte completa de functions: NUNCA (colisão de emulator).
- Matar conta demo / ADMINSEP-3: ato do dono.
- Nenhuma skill externa de marketplace nas lanes (regra permanente).

## BLOQUEIO REAL (único da noite) — o reenvio oficial não sai

DEPLOY-POSPAG subiu tudo (5 functions, rules, landing, smoke ok) mas **não executou o reenvio**: `admin@demo-leela.dev` teve a senha rotacionada em 04/08T03:39Z (por sessão minha anterior) e **a senha nova não foi registrada em lugar nenhum** — falha minha. Verificado: conta viva, `role: platform_admin`, uid `FTqslV98itZUNGwL5ss6201d23Z2`; `demo1234` não vale mais; nenhum env local guarda a nova.

Tentativa técnica sem mexer em credencial: assinar custom token por IAM `signBlob` com as credenciais do dono → **403, o dono não tem `iam.serviceAccounts.signBlob`**. Conceder o papel seria alterar IAM de produção — não faço sem ele.

**NÃO resetar a senha**: é ato do dono por decisão já registrada (ADMINSEP-3, "só você pode fazer as duas coisas") e sobrescreveria em silêncio uma rotação deliberada. Fica como o item nº 1 do relatório da manhã, com duas saídas para ele: (a) definir a senha do admin no console Firebase (Authentication → usuário → redefinir) e me passar, ou (b) autorizar a redefinição por mim. Estado pronto para o disparo: pedido `pago`, `reenvioEmails: null`, extrato `reenviosEmail` vazio (⇒ `forcar` desnecessário), ingresso `T93N7F` confirmado com `qrToken` — a callable tem o que enviar nos dois alvos, falta só a credencial.

**Lição para a memória do projeto:** rotação de credencial sem registro = trabalho bloqueado depois. Toda rotação futura vai ao painel/handoff no mesmo ato.

## Pendências que o MAESTRO sequencia (não são de lane)

1. **⚔ CONFIRMADO PELA REV-COD5A (D-1, média) — o espelho do código é escrivível pelo cliente.** `codigoPedido` é o ÚNICO campo de Function do inscrito que um cliente escreve: medido contra o `firestore.rules` real, o mesmo `tenant_owner` que é NEGADO ao plantar `codigoIngresso` PASSA ao plantar e ao trocar `codigoPedido` — e como o escopo é global, o código plantado pode ser o de uma compra de outra produtora, justo o campo que a busca da 5d vai ler. Correção exata (um commit só, **depois que BUILD-AREACLIENTE aterrissar** — Rules é território dela agora):
   1. `firestore.rules:842` — `'codigoIngresso', 'codigoPedido',` em `semCamposDeFunctionInscrito()`
   2. `firestore.rules:867` — mesma adição em `camposDeFunctionIntocados()`
   3. `packages/core/src/eventos/inscrito.ts` — campo em `CAMPOS_FUNCTION_INSCRITO`; remover o comentário-âncora e o bloco ⚠️ que o fix `b8c7c29e` acrescentou
   4. `inscrito.test.ts:143` e `inscritoPedido.test.ts:124` — os dois `toEqual` exatos
   5. **Tripwire:** o bloco A5 do teste de ataque está vermelho DE PROPÓSITO (caracterização com contraste) — trocar `assertSucceeds` por `assertFails`. Se ficar verde sem a troca, a edição não pegou.
   ⛔ **A task 5d (superfícies do código) não vai a produção antes disto.**
1b. **`Math.random` no gerador de códigos ditados por humano** (REV-COD5A, painel): estado do PRNG do V8 é recuperável ⇒ quem compra prevê os próximos códigos. Doutrina idêntica já existe em `gerarCodigoIngresso`. É higiene técnica sem trade-off de produto (regra: não sobe ao dono) — trocar o default por `crypto.randomInt` nos DOIS geradores, com teste, junto do commit acima. Reportar ao dono no relatório, não perguntar.
2. **`"host": "::"` nas configs de emulator** produz falso-vermelho (a BUILD-COD5A mediu 25/26 → 26/26 só trocando para IPv4). Padronizar as configs = ruído de gate que pode mascarar regressão real. Fila técnica.
3. **Selo dos boards**: BUILD-PDF (S1214-T5), BUILD-COD5A (S1228-T1) e o que a AREACLIENTE entregar não editaram `leela-specs/` por ordem — marcar tudo no `V1-KANBAN.md` no selo da manhã, padrão épico→história→tarefa.
4. **Deploy final da noite**: só depois das reviews; landing (PDF + área do cliente) + functions/core (código PED-) + rules (FIX-D1 `48fc7116`). Provar por hash de chunk e `functions:log` limpo, como a DEPLOY-POSPAG fez.
   ⛔ **ORDEM OBRIGATÓRIA — índices ANTES das functions.** A BUILD-AREACLIENTE-2 criou `fieldOverride` COLLECTION_GROUP em `inscritos.pessoaRef`; o Emulator não cobra índice, então NENHUM teste da noite prova esse passo. Sequência: `firebase deploy --only firestore:indexes` → esperar os índices ficarem READY → functions → rules → landing. Se as functions subirem antes, "Meus Ingressos" quebra em produção com erro de índice ausente e o comprador vê tela vazia — o mesmo sintoma do incidente que originou a rodada.
5. **A4 (`S032-T4`) NÃO aterrissou e não está em lane nenhuma** — achado da BUILD-AREACLIENTE-2, que seguiu porque a dependência é de higiene e não de autorização (o defeito nasce no escritor). É o item de CÓDIGO mais urgente que sobra; ler a fila ADMINSEP e despachar quando houver território livre.
6. **B4 (`S1222-T4`, Meus Clubes + caixa de convites)** parou por teto de contexto: exige descoberta (lê `clubes/{id}/membros` e convites de duas máquinas, RN-316 + E18; decidir `collectionGroup` vs iteração, possível índice novo). Próxima lane de landing depois da REV-AREACLIENTE.

## Segredo criado em produção — 05/08 manhã (registro obrigatório)

**`CODIGO_ACESSO_PEPPER`, versão 1**, criado no Secret Manager do `leela-hub` pelo maestro (`projects/76126035891/secrets/CODIGO_ACESSO_PEPPER/versions/1`). É o pepper do HMAC do código de 6 dígitos (RN-476), pré-requisito bloqueante do deploy das três callables novas — sem ele elas sobem e falham fechado.

- **Origem do valor:** 48 bytes de entropia do sistema (`crypto.randomBytes`), gerados na hora, **nunca impressos** em terminal, log, handoff ou conversa; arquivo temporário apagado no mesmo comando.
- **Onde vive:** só no Secret Manager. Ninguém — nem eu — retém cópia.
- **Como recuperar:** não se recupera; se for preciso trocar, gera-se versão nova e redeploya as callables (o valor antigo invalida os códigos em voo, que morrem em 10 min de qualquer forma).
- **Por que está escrito aqui:** regra permanente nascida do incidente desta madrugada — credencial rotacionada/criada sem registro bloqueia trabalho depois ([[feedback-rotacao-credencial-sempre-registrada]]).

## ⛔ PENDENTE DE SELO (dono autorizou em 05/08, manhã) — POSSE-EMAIL-1

O dono respondeu **"pode aplicar o POSSE-EMAIL-1 na mesma onda"** (a onda = fluxos de conta com código de 6 dígitos, spec `7a2a2b26`). Efeitos a selar assim que `leela-specs/` liberar (a lane SPEC-METRICAS-SERVICO está em voo lá):
1. **Fechar POSSE-EMAIL-1 no painel** com o verbatim; o registro completo vai para o arquivo da rodada de contas.
2. **Desmarcar o GATED da tarefa C2** da fila de contas: a condição `&& request.auth.token.email_verified == true` no **ramo (b)** de `ehCompradorDoPedido` entra junto com o código. ⛔ Nunca no ramo (a) — ali o uid é o da sessão anônima do checkout e exigir verificação quebraria a S1225-T3.
3. Registrar o argumento que destravou a decisão (da SPEC-CONTAS-LANDING): exigir `email_verified` hoje trancaria quem comprou e nunca verificou; **com o código de 6 dígitos essa pessoa passa a ter caminho próprio**, então o remédio deixa de ter efeito colateral.
4. Ratificação de passagem: o piso do Serviço é **por pedido** (o dono confirmou de novo; a spec já nasceu assim, RN-491).

## Backfill — o veredito da review, que muda o card do dono

REV-5B **REPROVOU** a forma entregue (`d1d6582a`) e **APROVOU** depois de dois fix-commits (`eea10348`, `813a38c1`). Sete defeitos; o desenho central resistiu, a borda caiu. O que virou o veredito, medido e não deduzido: com `FIRESTORE_EMULATOR_HOST` no ambiente — **que é exatamente como o stack local desta casa roda** — `--apply` escrevia no EMULATOR imprimindo `Projeto: leela-hub · Modo: APLICAR · Aplicado: N` e saindo 0. O runbook inteiro convergiria para verde com produção intocada. Agora o destino sai impresso antes da primeira leitura (`Destino: PRODUÇÃO — Firestore real`).

**Três condições que o card do dono precisa carregar** (o selo anterior gravou só o comando):
1. `rebuild` imediatamente antes (o script importa `functions/lib` e houve lane em voo em `src/checkout`);
2. conferir a linha `Destino:` do ensaio ANTES de digitar `--apply`;
3. gravar a saída em arquivo — o mapa pedido→código só existe ali, e **carrega o uid do comprador**: é documento interno, não print de grupo.
Interrupção não corrompe (provado com `SIGKILL`), mas trava o pedido em voo por ~60-75s; basta repetir o comando.

Sem prova, declarado: o teto de 500 escritas por transação (o emulator não o aplica — 522 passaram).

## F6 — cobrança QA (observação, read-only)

`pay_6e37hktx4xld12qf`: `PENDING`, `dueDate 2026-08-05`, `paymentDate null`, R$ 11,05. Vence HOJE; a materialização de `pix_expirado` no pedido QA só pode ser conferida **depois do fim do dia** — fica para a próxima passada, registrado aqui para não se perder.

## Se o terminal cair

Reabrir por este arquivo + `git log --oneline -15` + handoffs `.nirvana/handoffs/leela-pixreal-diag-20260804-*.md` (cada lane tem o seu, vivo). Audit em `Orkestra/.nirvana/logs/harness/2026-08-05/audit.jsonl`. Retomar do passo mais avançado NÃO aterrissado; nunca re-despachar sem ler o handoff da lane (L-010).
