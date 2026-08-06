# SPEC-PAINEL-CLIENTE — handoff vivo

**Lane:** `SPEC-PAINEL-CLIENTE` · **Trace:** `leela-spec-painel-cliente-20260806` · **Employee:** `sf-cto`
**Repo:** `C:\dev\LEELA` (branch `main`) · alvo: `leela-specs/` — zero código de app

## Veredito

Spec entregue. O pedido do dono era a spec do painel do cliente com a ponte para o profissional,
e a varredura mudou o que a spec ia escrever: **sete das oito coisas da RN-451 já estão no ar** e
**a oitava está no ar e quebrada**. A rodada, portanto, não desenha superfície nova — ela conserta
a ponte, dá forma de painel ao que existe, e entrega o inventário de dezoito telas para o dono
simular no Claude Design.

## O achado que carrega a rodada

`PortasDaConta.tsx:67` manda a participante **logada** para `painelUrl('/cadastrar')`, e o
`CadastrarPage.tsx:119` chama `criarContaComEmail`. Quem lê aquele cartão está autenticada, logo o
e-mail dela já existe: a chamada volta `auth/email-already-in-use`, que o `authErrors.ts:47-54`
mascara na negativa única anti-enumeração — por disciplina correta. A pessoa clica em "criar conta
de organizador" e recebe uma frase genérica, sem caminho.

O desenho certo já estava escrito em 04/08 (SPEC-ADMINSEP §"Duas portas para virar organizador"):
a pessoa **ganha o doc** `profissionais/{uid}` em `aguardando_convite`. A construção pulou o gesto
de promoção. A rodada constrói o que a spec já dizia, e não inventa regra.

Segundo achado, de fronteira: **landing e painel são sites de Hosting distintos**, logo origens
distintas, logo a sessão do Auth não atravessa. O código já assume isso (aponta para `/entrar`); o
que falta é a tela dizer. Handoff por token custom recusado com razão — segunda superfície de
credencial para a mesma capacidade.

Terceiro achado, de vocabulário: a copy no ar diz *"Crie sua conta de organizador. Ela nasce
separada desta"*, e contradiz a **RN-450** — o que nasce separado é o documento de perfil, não a
conta. Some a RN-468, que rebatizou para **profissional**.

## Paths criados e tocados

| Arquivo | O que é |
|---|---|
| `leela-specs/02-rodadas/2026-08-06-painel-cliente/01-decisoes-dono.md` | verbatim, o que a varredura achou, as seis decisões vetáveis |
| `leela-specs/02-rodadas/2026-08-06-painel-cliente/02-spec-painel-cliente.md` | o que existe medido, JTBD, a ponte em fluxos, a fronteira, as histórias |
| `leela-specs/02-rodadas/2026-08-06-painel-cliente/03-rns-delta.md` | RN-511 a RN-514 + prova de não colisão |
| `leela-specs/02-rodadas/2026-08-06-painel-cliente/04-inventario-de-telas.md` | **o produto para o dono** — 18 telas para simular no Claude Design |
| `leela-specs/02-rodadas/2026-08-06-painel-cliente/05-fila-codigo.md` | três ondas, com a A destravada e a B retida pelo PCLIENTE-1 |
| `leela-specs/03-canon/epics/LEELA-E12-landing.md` | delta canônico: RN-511 a RN-514, S1233/S1234/S1235 |
| `leela-specs/03-canon/epics/LEELA-E16-plataforma-superadmin.md` | delta: a vitrine da RN-510 ganha um segundo público, sem mudar de enunciado |
| `leela-specs/03-canon/indice-de-regras-de-negocio.md` | faixa 511-514 consumida; livre passa a começar na 515 |
| `leela-specs/01-produto/DECISOES-ABERTAS.md` | **PCLIENTE-1** (painel 58 → 59) |
| `leela-specs/00-boards/V1-KANBAN.md` | três cards épico→história→tarefa |
| `leela-specs/00-boards/BOARD-EPICOS.md` | linha do E12 |

## Numeração

**RNs novas — RN-511 a RN-514.** Prova de não colisão: varredura por `RN-511` a `RN-517` em
`leela-specs`, `apps`, `packages`, `functions` e `firestore.rules`, fora de `node_modules` — zero
ocorrências nas sete. A faixa mais alta em uso era a 510 (ONBOARD-VITRINE, mesmo dia).

**Histórias — S1233, S1234, S1235** mintadas no E12; **S1236 e S1237 reservadas** (reembolso e
troca de titularidade, nomeadas no board, sem enunciado no épico até a rodada própria). Prova:
varredura por `S1233` a `S1237` nos mesmos alvos — zero ocorrências. A série mais alta do E12 em
uso era a S1232.

## Decisões vetáveis abertas

| ID | Onde | Default |
|---|---|---|
| **PCLIENTE-1** | [[DECISOES-ABERTAS]] — trava a próxima ação do dono | o painel do cliente é `/minha-conta` ganhando casca, na landing |
| PCLIENTE-2 | rodada | a ponte é promoção da conta que já existe, com destino na vitrine |
| PCLIENTE-3 | rodada | aceitar o segundo login na travessia e **dizer isso** antes do clique |
| PCLIENTE-4 | rodada | o rótulo nomeia o painel, não a conta, e diz "profissional" |
| PCLIENTE-5 | rodada | reembolso e troca de titularidade ficam mapeados e fora desta onda |
| PCLIENTE-6 | rodada | a Arena Social continua fora, agora por decisão e não por bloqueio |

Só o PCLIENTE-1 subiu ao painel canônico, pela disciplina de "só o que trava trabalho". O
**ADMINSEP-2** continua aberto e não foi reaberto: a spec constrói sobre o default de lá.

## Inventário de telas — a lista curta

Onze no ar, quatro especificadas e não construídas, três nascem.

| # | Tela | Estado |
|---|---|---|
| A1 | overlay de entrada | ✅ |
| A2 | primeiro acesso | 📋 |
| A3 | criar conta | 📋 |
| A4 | definir senha | ✅ |
| B1 | casca do painel do cliente | 🆕 |
| B2 | meus ingressos | ✅ |
| B3 | ingresso aberto | ✅ |
| B4 | minhas compras | ✅ |
| B5 | compra aberta | 📋 parcial |
| B6 | clubes e convites | ✅ |
| B7 | meus dados e senha | ✅ |
| C1 | porta para o profissional, quem já é | ✅ copy muda |
| C2 | porta para o profissional, quem ainda não é | 🆕 |
| C3 | travessia entre os painéis | 🆕 |
| C4 | painel profissional em vitrine | ✅ |
| C5 | aviso de boas-vindas com o código Leela | ✅ |
| D1 | sem sessão, a porta de entrada | ✅ |
| D2 | conta sem vínculo de compra | ✅ |
| D3 | falha de leitura | ✅ |

## Duas notas técnicas que a próxima lane precisa ler

**O boundary de cliente da landing.** `AppShell`, `PageHeader` e `Skeleton` existem no design
system e **não** atravessaram `apps/landing/app/_ds/ds.ts`, que hoje exporta vinte e um nomes. A
casca da S1233 precisa dos três. São três linhas no `export`, não componente novo.

**O comentário pinado.** `apps/landing/lib/portaOrganizador.ts:52-68` carrega uma advertência
deixada pela FRONTEIRA-AUTH: ali o papel literal está **certo**, porque a pergunta é *"esta conta
é SÓ da plataforma?"*. Trocar por `isPlatformAdmin` tira do dono — `tenant_owner` **com** a
capacidade — a porta de organizador na própria área de cliente. A promoção da RN-512 herda essa
leitura.

## Território e disciplina

`git commit --only` em cada arquivo desta lane. Não foram tocados `apps/**`, `functions/**`,
`packages/**`, `leela-specs/01-produto/DECISOES-ABERTAS-TRIAGEM.md` nem o handoff staged
`leela-pixreal-diag-20260804-REV-5B.md`, que segue staged. Havia um deploy rodando em paralelo na
mesma árvore; nenhum arquivo dele entra nos commits desta lane.

Zero código de aplicação. Leitura e escrita de markdown apenas.
