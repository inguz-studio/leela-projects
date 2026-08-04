---
tags: [leela, spec, rodada, contas, seguranca, area-do-cliente, platform-admin]
trace: leela-build-2d6ee98d
lote: SPEC-ADMINSEP
data: 2026-08-04
---

# 09-spec · Contas separadas e a área do cliente

> Duas levas do dono na virada de 03 para 04/08, especificadas juntas porque são o mesmo
> assunto: quem é quem dentro de uma conta, e que porta cada um atravessa. A primeira
> corrige um registro meu que já tinha virado código. A segunda define a área do cliente,
> que deixou de ser backlog e virou pré-requisito da compra.
>
> Nada aqui é código. Toda afirmação abaixo foi medida no repositório, e o caminho está
> citado. Onde não deu para medir, está escrito que não deu.

## Parte 1 · O que o sistema faz hoje

### O papel é um escalar, e isso já decide muita coisa

`Role` tem cinco valores e a conta carrega exatamente um
(`packages/core/src/platform/roles.ts:22-27`): `platform_admin`, `tenant_owner`,
`tenant_staff`, `promoter`, `athlete`. Não existe lista de papéis na claim. O campo `papeis`
que aparece no código é outra coisa: vive no doc `profissionais/{uid}` e descreve o papel
profissional dentro do produto (`packages/core/src/index.ts:69`), não a autorização.

Disso decorre um fato que a RN-448 já tinha registrado e que continua verdadeiro: uma conta
não consegue carregar `platform_admin` e `tenant_owner` ao mesmo tempo. O
`setTenantClaims` põe `platform_admin` no conjunto dos papéis que não carregam tenant
(`functions/src/platform/setTenantClaims.ts:46`) e recusa `tenantId` para ele
(`:127-132`).

### Onde o acúmulo administrador × organizador já é recusado

Três guardas independentes, todas anteriores a esta lane, e todas medidas:

| Caminho | Guarda | Onde |
|---|---|---|
| Provisionar tenant para conta existente | Papel conflitante é rejeitado; as exceções estreitas exigem `athlete` | `functions/src/platform/provisionTenant.ts:196-256` |
| Resgatar convite de organizador | `platform_admin` é papel rejeitado de chamador | `functions/src/platform/resgatarConviteOrganizador.ts:180-181` |
| Trigger de conta nova | Papel existente diferente de `athlete` nunca é sobrescrito, e a conta não ganha doc de atleta | `functions/src/auth/onCreateUser.ts:88-95` |

A decisão do dono, portanto, **não pede uma trava nova nesse eixo**. Ela pede que a intenção
escrita pare de contradizer a trava que já existe, e que a trava ganhe caso de teste em nome
próprio. É o barato desta lane.

### Onde o acúmulo está aberto, e ninguém tinha olhado

O eixo administrador × cliente não tem guarda nenhuma.

1. **O checkout não olha papel.** `createInscricaoCharge` exige sessão e lê o provedor do
   token, e é só (`functions/src/checkout/createInscricaoCharge.ts:2447-2464`). Uma varredura
   por `role` em `functions/src/checkout/*.ts` devolve um único acerto, e é comentário
   (`webhookPagamento.ts:501`).
2. **A conta sem fricção amarra a compra pelo e-mail, cega a papel.** Depois da primeira
   compra confirmada, `garantirContaSemFriccao` resolve a conta do comprador por e-mail e
   reusa a que existir (`functions/src/checkout/contaSemFriccao.ts:153-160`). Se aquele
   e-mail for o do super-admin, a compra é amarrada ao uid do super-admin: o carimbo vai
   para `pedidos/{id}.contaSemFriccao.contaUid` (`:243-258`) e o vínculo de pessoa vai para
   `pessoas/{ref}.contaUid` (`:163-203`). Nada no arquivo lê `role`.
3. **O doc de atleta é do dono do uid, sem régua de papel.** `firestore.rules:2680-2683`
   deixa qualquer conta autenticada escrever o próprio `atletas/{uid}`.

Ou seja: hoje, comprar um ingresso com o e-mail da conta de administração transforma o
administrador em cliente, em silêncio, sem ninguém decidir nada. É exatamente o que o dono
acabou de proibir, e é o único ponto desta lane que exige trava nova de servidor.

### O que os dois commits fizeram, linha a linha

**`aa0e2183`** somou cinco linhas de comentário em
`apps/painel/src/routes/conta/auth/_lib/destinoPosLogin.ts:82-86`, imediatamente acima de um
`if (sessao.role === 'platform_admin')` que já existia desde o `1e4b3b2a`. O comentário diz
que papel acumulado resolve por precedência, chama isso de decisão do dono de 03/08 e
instrui quem for mexer a não transformar o `if` em seletor. O `numstat` do commit é `5 0`
nesse arquivo e `13 3` no arquivo de fila da rodada de onboarding. A própria mensagem
declara: "Nenhuma linha de comportamento muda".

**`d8d36697`** somou 27 linhas ao arquivo de teste
`apps/painel/src/routes/conta/auth/__tests__/destinoPosLogin.test.ts`, com dois casos:

- `conta admin + organizador vai para /plataforma por PRECEDÊNCIA (acesso único)` afirma que
  a sessão `{ role: 'platform_admin', tenantId: 'castelo-producoes', temPerfilProfissional:
  true }` aterrissa em `/plataforma`. **Este é o caso que codifica a decisão errada**, e o
  próprio comentário do teste admite que o estado é inalcançável hoje, chamando o caso de
  "defesa de contrato para o dia em que carregar". Defender contrato para um estado que a
  regra nova proíbe é defender a coisa errada.
- `o super-admin NUNCA é barrado na porta, com ou sem doc de profissional` afirma que
  `platform_admin` sem tenant aterrissa em `/plataforma` nos dois valores de
  `temPerfilProfissional`. **Este caso não é a decisão errada.** Ele trava a ordem de
  avaliação da guarda de conta órfã (`destinoPosLogin.ts:67-73` lê `role !== 'platform_admin'`
  antes de olhar o doc) e continua correto sob a regra nova, porque a conta de administração
  segue sem doc de profissional. Sobrevive, com a justificativa reescrita.

Superfícies tocadas: só o roteamento pós-login do painel. A guarda de rota
(`PlatformGuard`), as Rules e as claims ficaram intocadas pelos dois commits.

## Parte 2 · Por que a decisão do dono está certa, com fatos do próprio sistema

### O alcance de um `platform_admin`

O predicado é `isPlatformAdmin()` em `firestore.rules:44-46`, e ele **não recebe `tenantId`
nem avalia predicado de tenant**. Toda cláusula `|| isPlatformAdmin()` é, por construção,
cross-tenant. São 129 ocorrências no arquivo de Rules.

O que uma sessão com esse papel alcança:

- **PII de participante de todos os tenants, incluindo dado de saúde.**
  `firestore.rules:900` libera leitura de `eventos/{e}/inscritos/{id}`, cujo doc carrega
  `dadosPessoais.{cpf, telefone, restricoesMedicas}` (comentário em `:889-890`); `:937`
  libera a subcoleção `saude`. E a coleta em massa está indexada: existe índice de
  `collectionGroup` em `inscritos` (`firestore.indexes.json:82-93`), o que transforma a
  varredura cross-tenant em uma consulta.
- **Escrita e apagamento desses mesmos docs**, sem as guardas de shape aplicadas ao
  organizador (`firestore.rules:910`, `:918`, `:922`).
- **Dados bancários em claro** de qualquer organizador, via `getBankDetailsForPayout`
  (`functions/src/finance/getBankDetailsForPayout.ts:129`). Há auditoria de acesso, negado e
  concedido (`:84-101`), e há minimização (o repasse precisa estar `aprovado`, `:146-152`).
  Não há segundo fator, nem re-autenticação, nem aprovação de terceiro. E a pré-condição é
  fabricável pelo próprio papel, que aprova o repasse em `transicoesRepasse.ts:117`.
- **As máquinas de dinheiro.** Aprovar, recusar e marcar repasse como pago
  (`transicoesRepasse.ts:117`, `:212`), mudar a retenção do tenant (`:297`), abrir e decidir
  reembolso (`requestRefund.ts:555`, `:638`), estornar (`estornarInscricao.ts:973`),
  cancelar sem reembolso furando o corte da véspera (`cancelarInscricao.ts:208-224`), e
  operar sobre tenant suspenso, cuja guarda é deliberadamente pulada para o administrador
  (`operador.ts:79-86`).
- **A tabela global de taxa**, em `platform/config`
  (`functions/src/platform/setTaxaPlataformaGlobal.ts:5`, guarda em `:67`). É a mesma tabela
  que a RN-417 se recusou a expor à conta travada, e a recusa foi sustentada por
  falsificação executada na ONBOARD-REV.
- **Elevação de papel sem teto.** `setTenantClaims` só verifica que o chamador é
  `platform_admin` (`setTenantClaims.ts:98`), e `VALID_ROLES` inclui `platform_admin`
  (`:30-36`). Não há verificação de alvo diferente do chamador, nem limite de quantos
  administradores existem. Uma conta comprometida cunha outras, ou se instala como
  `tenant_owner` de qualquer tenant, e ao fazer isso **derruba todas as reservas** que foram
  desenhadas para segurar esse papel: `pessoas` (`firestore.rules:2558`), `crmClientes`
  (`:351`), `dadosBancariosSecret` (`:289`) e as escritas de Storage, que exigem
  `isTenantWriterRole()` e por isso hoje recusam o administrador.
- **Sem rastro consultável na elevação.** `setTenantClaims` produz um `logger.info`
  (`:161-166`) e nenhum documento de auditoria. As escritas cross-tenant feitas direto pelas
  Rules não carregam `TrilhaOperacao` nenhuma, então são indistinguíveis de uma escrita de
  organizador.

Uma nota de honestidade: o Storage não tem grant de administrador. Uma busca por
`platform_admin` em `storage.rules` devolve zero acertos, e o único helper de papel é
`isTenantWriterRole()` (`storage.rules:76-80`). Essa reserva é real, e é justamente uma das
que a elevação irrestrita derruba.

### Por que misturar a conta piora, e não é preciosismo

Três fatos de infraestrutura, medidos:

1. **O painel do organizador e o painel de plataforma são o mesmo artefato, na mesma
   origem.** `/plataforma/*` é uma rota do mesmo SPA, dentro do mesmo `RootShell`
   (`apps/painel/src/App.tsx:78`), servida pelo mesmo site de Hosting, com `**` reescrito
   para o mesmo `index.html` (`firebase.prod.json:16-21`). Não existe fronteira de origem
   entre operar um evento e operar a plataforma.
2. **A landing usa as mesmas credenciais de app web que o painel**, por reuso declarado no
   próprio arquivo de ambiente (`apps/landing/.env.leela-hub:26-28`), com `projectId`,
   `apiKey` e `appId` idênticos. Um só projeto, um só pool de contas do Auth, um só espaço
   de claims.
3. **Não existe segundo fator em lugar nenhum.** Uma varredura por `multiFactor`,
   `MFA` ou `Identity Platform` no repositório devolve zero. App Check e Cloud Armor estão
   desligados, o que já está registrado como pendência do CTO.

Junte com a mistura de papéis e o desenho fica: a mesma senha, no mesmo navegador, na mesma
origem, abre a compra de um ingresso e a tabela de taxa da plataforma inteira. O e-mail que
recebe link de recuperação de senha depois de uma compra
(`contaSemFriccao.ts:207-240`) é o mesmo que faz login no super-admin. Recuperar a senha do
cliente passa a ser o caminho de tomada da plataforma. É esse o desenho que a frase do dono
desmonta.

Há ainda um vazamento menor, achado no caminho e que vale card: o menu lateral troca de
conjunto olhando **o caminho da URL, não o papel** (`apps/painel/src/shell/sidebar.ts:148-157`).
Uma conta `tenant_owner` que digitar `/plataforma` recebe o 403 do `PlatformGuard`, correto,
mas com o menu completo de super-admin desenhado em volta. Vaza a taxonomia da área, não o
dado.

### As contas que existem hoje

Isto é dado, não teoria.

**No emulador** (`.emulator-data/auth_export/accounts.json`): `admin@demo-leela.dev` carrega
`{"role":"platform_admin"}` e nada mais; `marina@demo-leela.dev` e `felipe@demo-leela.dev`
carregam `tenant_owner` com `tenantId`; há duas contas de atleta sem e-mail. **Nenhuma
acumula.**

**Em produção (`leela-hub`)**, e este é o achado que mais pesa: a conta de super-admin de
produção é a conta de demonstração. O `prod-seed-leela-hub.ts` chama `seedPlatformAdmin`
contra o projeto real e grava nela a senha `demo1234` (`:127`, `:182-188`), que está
publicada no repositório. O login foi provado por REST na lane FIX-AUTHGUARD, com uid
`FTqslV98itZUNGwL5ss6201d23Z2` e `role: platform_admin` visíveis no token
(`.nirvana/handoffs/leela-build-2d6ee98d-FIX-AUTHGUARD.md:26`).

Somando com a Parte 2: existe hoje, em produção, uma conta de fator único, com senha
pública, que alcança PII e dado de saúde de todos os tenants, dados bancários em claro, as
máquinas de dinheiro e a elevação irrestrita de papel. Não é acúmulo de papéis, é pior.
Sobe ao dono como **ADMINSEP-3**.

**A conta de produção do dono não foi verificável desta lane.** Ler o Auth de produção exige
credencial e esta lane é de documentos. O que se sabe pelos registros: as duas compras de
teste dele em 03/08 saíram pela landing, que faz login anônimo no checkout
(`CheckoutFlow.tsx:527`), então elas não usaram conta nomeada. Se o e-mail informado na
compra for o mesmo de alguma conta de painel, o `contaSemFriccao` já a amarrou. A varredura
é tarefa da fila, e roda contra o dado real antes de qualquer conclusão.

## Parte 3 · O que "ambientes separados" pode significar

A palavra é do dono. Levantei quatro leituras, com custo e veredito.

| # | Leitura | O que compra | Custo | Veredito |
|---|---|---|---|---|
| A | Contas distintas, e-mails distintos, sem acúmulo, com recusa no servidor | Atende a frase do dono na letra. Mata o caminho "recuperar senha do cliente para tomar a plataforma" | Baixo. Uma guarda em `setTenantClaims`, uma no `contaSemFriccao`, testes | **Obrigatório.** É a decisão, não uma interpretação dela |
| B | Endereço e build próprios para o painel admin (site de Hosting `leela-admin`, saindo do mesmo repositório) | Fronteira de origem real. XSS no painel do organizador deixa de alcançar o token de administração. Permite App Check por site e URL de administração fora da superfície pública | Médio. Segundo alvo de build no Vite, quebra do roteador, segundo deploy, um arquivo de config no molde dos que já existem | **Recomendado, em segunda onda.** É a leitura honesta de "ambientes", e não bloqueia a onda A |
| C | Projeto Firebase separado para o painel admin | Isolamento de pool de contas | Alto e com perda. O administrador opera sobre o MESMO Firestore cross-tenant; um segundo projeto exigiria credencial cross-project ou re-fronting de tudo por Functions | **Recusado.** A fronteira que importa é o token, não o projeto, e esta troca custa muito para mover pouco |
| D | Segundo fator ou allowlist para `platform_admin` | Mata o fator único, que é o furo real de hoje | Allowlist server-side é baixo. Segundo fator exige subir para Identity Platform, que é tier pago | **Partido.** A allowlist entra na onda A. O segundo fator é julgamento de custo, e por precedente da casa (item 62, borda volumétrica) isso é do CTO humano |

**Recomendação:** A é obrigatório e entra agora. B é a segunda onda e sobe ao dono como
escolha, porque é gasto de tempo de produto e a frase dele admite as duas profundidades. C
fica registrado como recusado, com a razão. D entra partido, com a allowlist agora e o
segundo fator na pendência do CTO.

## Parte 4 · A área do cliente

### O escopo que o dono declarou

Oito coisas, e ele frisou simples: histórico de compras; convites para virar promotor ou
influenciador; Meus Clubes; Meus Ingressos, separados em próximos e passados; meus dados;
trocar senha; criar conta de organizador; botão para entrar na área de administrador.

Absorve o card `S1222` do backlog, que era "área do cliente com os próprios ingressos". O
card não ganha identidade nova, ganha corpo.

### A ambiguidade que precisa de resposta antes de virar código

**"botão para entrar na área de administrador".** A frase tem duas leituras, e elas mudam o
desenho.

- **Leitura 1, que adoto como premissa: é a área do organizador**, o painel de quem produz
  eventos. Racional: no mesmo despacho o dono acabou de determinar que o painel
  `platform_admin` vive em conta separada, então um botão da área do cliente para o painel
  de plataforma reconstruiria, na tela, exatamente o acúmulo que a outra metade da frase
  proíbe. Some a isso que o vocabulário do produto chama o painel do organizador de "painel
  admin" em vários lugares do próprio repositório, incluindo a ADR-009, que descreve o tenant
  operando "no próprio painel admin". Sob esta leitura o botão só aparece para a conta que
  também é organizadora, e leva ao painel do organizador.
- **Leitura 2: é o painel de plataforma.** Sob ela, o botão só existiria para o super-admin,
  e como a conta dele passa a ser outra, o botão nunca apareceria para um cliente. O
  resultado prático é um botão morto.

A leitura 1 é a única que produz um botão útil, e é a que está escrita na spec. Mas o erro
que originou esta lane foi exatamente presumir a intenção do dono em silêncio, então a
premissa sobe ao painel como **ADMINSEP-2** para ratificação, com o desenho da leitura 2
descrito ao lado.

### O que já existe, o que falta, e o furo que ninguém tinha visto

| Item pedido | Existe hoje | Falta |
|---|---|---|
| Meus Ingressos | A página do ingresso, por link assinado, sem login (`apps/landing/app/(public)/ingresso/[token]/page.tsx`) | A lista da conta, separada em próximos e passados |
| Histórico de compras | Nada de superfície | A lista, e o caminho de dado |
| Meus Clubes | Modelo de membro (`clubes/{id}/membros`) | A lista da conta |
| Convites para promotor ou influenciador | Aceite por token, público e sem login (`/convite/afiliado`, RN-316; `/convite`, E18) | A caixa de entrada dos convites dentro da área |
| Meus dados e trocar senha | Existe para o ORGANIZADOR, em `/conta` do painel (S020-T4), sobre `profissionais/{uid}` | O equivalente do cliente, sobre a identidade global de atleta |
| Criar conta de organizador | A porta por convite, construída pela ONBOARD-BUILD | A entrada a partir da área do cliente |
| Botão para a área de organizador | Nada | O botão, condicionado ao papel |

**O furo:** o cliente não consegue ler as próprias compras nem as próprias inscrições pelo
SDK. `pedidos` exige `isTenantWriter` ou `platform_admin` (`firestore.rules:2542`), e
`inscritos` exige administrador, escritor do tenant ou papel de equipe do evento
(`firestore.rules:900`). Um token `athlete` não lê nenhum dos dois, e isso é deliberado: são
coleções tenant-scoped com PII.

A saída não é abrir Rule. A saída é o molde que a casa já usa: um callable que devolve
**apenas o registro da própria conta**, como o `getCheckoutPrefill` já faz consultando
`pessoas.contaUid == caller.uid` (`functions/src/checkout/prefillCheckout.ts:99`) atrás da
guarda de sessão (`:170-180`). Abrir `pedidos` ao atleta entregaria dado de tenant a um
token de participante, que é o erro que a RN-417 já teve de desfazer uma vez.

Consequência que precisa estar escrita, porque muda a experiência: o vínculo entre conta e
compra é `pessoas/{ref}.contaUid`, escrito pelo `contaSemFriccao`, e o leitor exige e-mail
verificado (contrato declarado no cabeçalho de `contaSemFriccao.ts:30-34`). Então **a área
do cliente só mostra as compras de quem verificou o e-mail**, e a conta nasce não verificada.
Quem comprou para terceiros sem CPF de pagador não tem vínculo nenhum, limitação já
documentada no arquivo (`:163-170`).

### Ver o ingresso passa a exigir conta?

**Não, e a página de hoje não pode ser trancada.** A justificativa está escrita no próprio
arquivo: quem recebe o e-mail é o comprador, que frequentemente nem é o inscrito, porque o
pagador pode ter comprado para a família (ADR-011). Exigir conta ali trancaria a página
atrás de um épico inteiro. A página também é dinâmica por regra, não escreve nada, e carrega
`noindex`, `no-referrer` e `no-store` porque o token está na URL (RN-418, RN-422, D-ING-10).

O default que proponho: **a área do cliente é uma porta a mais, nunca a única.** O link
assinado do e-mail continua funcionando para quem não tem conta, e a área do cliente é onde
quem tem conta encontra tudo junto. As duas convivem, e nenhuma substitui a outra.

**Dependência declarada:** a lane INV-EMAIL-INGRESSO está apurando a cadeia do e-mail agora
e não aterrissou até o fechamento desta spec (o audit de 04/08 tem o `brief_received` e o
`dispatch_business` dela, sem `lane_completed`). Se o laudo mostrar que o e-mail promete algo
diferente do link assinado, a única coisa que muda aqui é a redação do e-mail, não o desenho:
trancar a página do ingresso continuaria proibido pelo caso do comprador-que-não-é-inscrito.
A hipótese contrária, para registro: se o produto decidir que ingresso só se vê logado, o
custo é criar conta obrigatória no checkout e resolver o caso da compra para terceiros, o
que é épico próprio e não cabe nesta rodada.

### Duas portas para virar organizador

Existem agora dois caminhos para o mesmo destino: o convite, que a ONBOARD-BUILD construiu,
e o "criar conta de organizador" que o dono pediu na área do cliente. Isso é decisão de
produto, e o default que proponho é o que preserva o que acabou de ser construído:

**Elas convivem, e a de auto-serviço termina no mesmo overlay travado.** O cliente que clica
em "criar conta de organizador" não vira organizador ali: ele ganha o doc
`profissionais/{uid}` com `statusOnboarding: 'aguardando_convite'`, que é exatamente o estado
que a RN-411 já define, e cai no overlay bloqueante pedindo o código ou o contato com o time.
O go-live segue controlado, o convite continua sendo a chave, e o botão novo só encurta o
caminho de quem já está dentro do produto.

A alternativa seria a aprovação self-service sem convite, que revoga a decisão de go-live
controlado do dono e não foi pedida. Fica registrada e não adotada.

Este é o ponto onde a regra das contas separadas encosta na área do cliente: **cliente e
organizador na mesma conta é o caso normal e desejado**, e é isso que a frase do dono diz. O
que a conta não pode acumular é administração de plataforma com qualquer um dos dois.

### Onde mora cada dado

| Dado da área | Documento | Observação |
|---|---|---|
| Meus dados do cliente | `atletas/{uid}` | Identidade global cross-tenant por ADR-009. Escrita do próprio dono do uid (`firestore.rules:2683`) |
| Meus dados do organizador | `profissionais/{uid}` | Já servido por `/conta` no painel (S020-T4). São documentos DIFERENTES, e uma conta que acumula cliente e organizador tem os dois |
| Trocar senha | Firebase Auth | Não é documento. O caminho é o oficial do Auth, o mesmo que o `contaSemFriccao` já usa |
| Histórico de compras | `pedidos`, via callable | Vínculo por `pessoas/{ref}.contaUid`; leitura direta continua fechada |
| Meus Ingressos | `eventos/{e}/inscritos/{id}`, via callable | Mesma disciplina. Próximos e passados são recorte por data do evento |
| Meus Clubes | `clubes/{id}/membros` | |
| Convites | `eventos/{e}/afiliados`, parcerias | O aceite continua sendo o link com token; a área lista o que já chegou |

## Parte 5 · O primeiro acesso do comprador

Decisão do dono em 04/08, verbatim:

> "sobre o primeiro acesso da pessoa, ela precisa definir a senha neste acesso, ok? Enviamos
> o link, ela entra define a senha e entra no sistema."

Isso ratifica o desenho que já está no código. Especifico em cima dele.

### O que já existe, e uma correção de leitura que importa

A conta do comprador nasce sozinha na **confirmação do pagamento**, não no checkout. O
`garantirContaSemFriccao` cria a conta sem senha e gera o link oficial do Firebase
(`generatePasswordResetLink`, `contaSemFriccao.ts:107`), com `oobCode` de uso único. Em
seguida **a Leela envia o próprio e-mail**, "Sua conta na Leela foi criada — defina sua
senha", renderizado por `renderContaCriadaEmail` (`functions/src/email/templates.ts:222`) e
despachado pelo provedor da casa (`contaSemFriccao.ts:207-240`).

Vale corrigir uma leitura que circulou: **o e-mail de primeiro acesso já é nosso**, com o
layout da Leela e o remetente da Leela, pela Brevo. O `generatePasswordResetLink` só
**gera** o link, não dispara e-mail do Firebase. O template genérico do Firebase, com
remetente `noreply@leela-hub.firebaseapp.com`, aparece em outro fluxo: o "esqueci minha
senha" do painel, que chama `sendPasswordResetEmail` (`packages/api-client/src/auth.ts:214`),
e aí sim quem envia é o Firebase. São dois caminhos distintos e só o segundo está fora da
marca. A decisão de trazê-lo para a Brevo sobe ao dono como **SENHA-1**.

### O defeito: o link não termina onde o dono descreveu

`actionCodeSettings` **não existe em lugar nenhum do código**. Varredura em `functions/src`,
`apps` e `packages`: zero ocorrências fora de artefatos de build. Os dois pontos de origem
chamam a API sem o parâmetro:

- `functions/src/checkout/contaSemFriccao.ts:107` — `generatePasswordResetLink(email)`;
- `packages/api-client/src/auth.ts:214` — `sendPasswordResetEmail(getLeelaAuth(), email)`.

Sem `actionCodeSettings.url`, o link cai no handler hospedado padrão
(`leela-hub.firebaseapp.com/__/auth/action`). A pessoa define a senha numa tela genérica do
Google e **não entra em sistema nenhum**. A `RedefinirSenhaPage` do painel, que existe e
funciona (`apps/painel/src/routes/conta/auth/RedefinirSenhaPage.tsx`), nunca é alcançada.

O próprio `auth.ts:209-212` já registrava a lacuna, e propunha resolvê-la pelo "Action URL"
do template no Console do Firebase. **Esse caminho não serve aqui**, e é importante dizer por
quê: o Action URL do Console é global, um só para o projeto inteiro. Ele não consegue
distinguir o comprador do organizador, e os dois precisam aterrissar em lugares diferentes. A
correção certa é `actionCodeSettings.url` **por chamada**.

### O destino, e por que não é o painel

Aqui há uma armadilha que precisa estar escrita. Mandar o comprador para o
`/redefinir-senha` do painel resolveria a tela e quebraria a frase do dono, porque logo
depois de definir a senha ele bateria na guarda de conta órfã: sem tenant e sem
`profissionais/{uid}`, o `destinoPosLogin.ts:67-73` barra a conta na porta com o aviso e
derruba a sessão. A pessoa definiria a senha e seria expulsa.

Então o destino se decide pela **origem do link**, e cada origem tem a sua casa:

| Origem | Continuação | Onde aterrissa depois de salvar |
|---|---|---|
| Compra confirmada (`contaSemFriccao`) | Landing, `/definir-senha` | Área do cliente, em Meus Ingressos |
| "Esqueci minha senha" do painel (`RecuperarSenhaPage`) | Painel, `/redefinir-senha` | Roteamento por papel do item 57, que já existe e não muda |

Concordo com a leitura de que o comprador aterrissa em Meus Ingressos, e o motivo é a origem:
ele clicou num e-mail sobre uma compra. Mandá-lo para uma home genérica depois disso seria
perder o assunto no meio do caminho.

A base de cada URL já está deployada e não precisa nascer: as Functions carregam
`LEELA_PUBLIC_URL = https://leela-landing.web.app` como variável de ambiente nas 88 funções,
e a landing carrega `NEXT_PUBLIC_PAINEL_URL` para o painel. Nenhum endereço novo é inventado
e nenhum é cravado no código.

**Verificação operacional que não pode ser presumida:** o domínio da continuação precisa
estar nos Authorized Domains do Auth. O projeto autoriza por default os domínios dele, mas
`leela-landing.web.app` é um **segundo** site de Hosting e pode não estar na lista. Se não
estiver, o Firebase recusa o `actionCodeSettings` com `auth/unauthorized-continue-uri`. Isso
é passo de conferência da fila, não suposição.

### O link usado duas vezes, ou tarde demais

O `oobCode` é de uso único e expira. O painel já resolve isso com honestidade:
`RedefinirSenhaPage` valida o código antes de mostrar o formulário e, quando ele não presta,
mostra "Link inválido" com o caminho de volta para solicitar uma nova redefinição. A tela da
landing herda o mesmo comportamento, e o caminho de volta **não pode ser "peça ajuda"**: é um
botão que reenvia o link para o mesmo e-mail.

O reenvio usa a mesma disciplina anti-enumeração que o painel já pratica: confirmação neutra,
a mesma mensagem exista ou não a conta, e `auth/user-not-found` engolido
(`RecuperarSenhaPage.tsx:5-9`). Dizer "esse e-mail não está cadastrado" numa tela pública
transformaria a tela num oráculo de quem comprou.

Há um segundo caso que precisa de estado próprio: a pessoa que **já definiu** a senha e clica
no link antigo. Para ela, "link inválido" é tecnicamente certo e humanamente errado. A tela
distingue e oferece entrar, em vez de oferecer redefinir.

### As duas portas para o mesmo ingresso continuam

Nada aqui tranca o link do ingresso, e a RN-452 vale integralmente.

| Porta | Quem usa | O que vê |
|---|---|---|
| Link assinado do e-mail, `/ingresso/{token}` | Qualquer pessoa que recebeu o e-mail, com ou sem conta, inclusive o inscrito que não comprou | Aquele ingresso, com o QR, imprimível |
| Área do cliente, autenticada | Quem tem conta e verificou o e-mail | Todos os ingressos da conta, próximos e passados, mais o histórico de compras |

As duas convivem, e por um motivo que não é conveniência: o pagador frequentemente não é o
inscrito (ADR-011), então o inscrito que ganhou a inscrição de presente **nunca** terá conta
ligada àquela compra. Trancar o ingresso atrás de login deixaria essa pessoa sem ingresso.

### Dependência de canal, declarada

O e-mail de primeiro acesso só sai com `BREVO_API_KEY` ligada no confirmador que roda. Hoje
apenas o `asaasWebhook` a carrega, o que cobre o caminho de produção. O bloqueio de IP da
Brevo caiu em 04/08 e o canal responde. O binding de segredos está sendo consertado em outra
lane, e a emissão de ingresso tem um P0 próprio (`QR_TOKEN_KEYS` ausente no `asaasWebhook`),
que é independente deste fluxo: a conta e o e-mail de senha não dependem do chaveiro do QR.
Nada disso muda o desenho, e por isso está aqui como dependência, não como tarefa.

## Premissas assumidas, com default profissional

Registradas para veto, no molde da casa. Nenhuma delas foi ao dono, porque nenhuma é juízo
dele.

1. **A RN-448 é superada, não apagada.** A RN-449 nasce e a RN-448 fica marcada como
   superada nos dois épicos, com a razão. Apagar regra registrada apaga o histórico do erro.
2. **O caso de teste do super-admin barrado na porta sobrevive**, com a justificativa
   reescrita. Ele nunca foi sobre acúmulo, e sim sobre ordem de avaliação da guarda de conta
   órfã.
3. **O `if` de `platform_admin` no `destinoPosLogin` fica.** A conta de administração cai em
   `/plataforma` porque é a única casa dela, não por vencer uma disputa de papéis. Muda o
   comentário, não o comportamento. O item 57 continua ratificado.
4. **A recusa de acúmulo é fail-closed e nomeada.** Erro tipado, com mensagem própria, nunca
   `internal`. É a lição do DEF-B da ONBOARD-REV.
5. **A trava do lado cliente não quebra a compra.** O `contaSemFriccao` é best-effort por
   contrato, e a recusa de vincular vira pendência carimbada no pedido, nunca exceção que
   derrube a confirmação.
6. **A varredura das contas de produção roda antes de qualquer migração**, e é read-only. Não
   se migra conta com base em teoria.
7. **A área do cliente mora na landing**, não no painel. O painel barra na porta quem não é
   organizador nem administrador (`destinoPosLogin.ts:67-73`), e mudar isso reabriria a porta
   que o item 57 fechou.
8. **A área do cliente é servida por callables do próprio dono da conta**, no molde do
   `getCheckoutPrefill`. Nenhuma Rule de coleção tenant-scoped é aberta a `athlete`.
9. **RN-449 a RN-453 são a faixa consumida.** Varredura executada: `RN-449` e `RN-450` não
   têm ocorrência no repositório fora de `node_modules`; a série 4xx vai até RN-448 com
   RN-460 e RN-499 isolados adiante.
10. **O destino do primeiro acesso é decidido pela origem do link**, e não por uma tela só
    servindo os dois públicos. Comprador aterrissa na área do cliente; organizador aterrissa
    no roteamento por papel que já existe. Uma tela única obrigaria a adivinhar quem é a
    pessoa depois de ela já ter definido a senha.
11. **O conserto do `actionCodeSettings` e a tela da landing sobem juntos.** Apontar a
    continuação para uma rota que ainda não existe é pior que o handler genérico de hoje:
    trocaria uma tela feia por um 404. Ordem declarada na fila.

## O que sobe ao dono

Quatro itens no painel, e nada além disso:

- **ADMINSEP-1** — até onde vai "ambientes separados". Contas distintas apenas, ou também
  endereço próprio para o painel de administração.
- **ADMINSEP-2** — o botão para "a área de administrador" na área do cliente é o painel do
  organizador, e não o de plataforma. Ratificação da premissa.
- **ADMINSEP-3** — a conta de super-admin de produção é a de demonstração, com senha
  publicada no repositório. Ele escolhe o e-mail real e define a senha; a de demonstração
  morre.
- **SENHA-1** — o e-mail de "esqueci minha senha" é o único do fluxo de conta que sai com
  template e remetente do Firebase. O de primeiro acesso já é nosso. Trazer o segundo para a
  Brevo é escolha de marca contra esforço.

Pendência do CTO humano, no molde do item 62: **segundo fator para `platform_admin`**, que
exige subir para Identity Platform e portanto é decisão de custo.
