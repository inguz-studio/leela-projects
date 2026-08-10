---
tags: [leela, inventario, rodada, admin, usuarios, onboarding, vitrine, aprovacao]
trace: leela-admin-usuarios-20260810
lote: SPEC-ADMIN-USUARIOS
data: 2026-08-10
---

# 02-inventário de código · o que existe hoje, linha a linha

> Medição desta lane sobre a árvore de `C:\dev\LEELA`, 10/08. Zero leitura de produção — onde um
> fato é de produção e não de código, ele vem citado do registro que o mediu, com a fonte nomeada.

## Parte 1 · O cadastro: o que nasce quando alguém entra pela porta

A rota `/cadastrar` vive **no painel**, fora do shell autenticado
(`apps/painel/src/App.tsx:46`); a landing apenas aponta para lá
(`apps/landing/app/components/PublicHeader.tsx:75`, `PublicFooter.tsx:79`, com o tipo
`RotaPainel = '/entrar' | '/cadastrar'` em `apps/landing/lib/painel.ts:26`).

O formulário coleta **nome, e-mail, telefone, organização, senha e o consentimento LGPD**
(`apps/painel/src/routes/conta/auth/CadastrarPage.tsx:60-67`, campos em `:163-240`); CPF/CNPJ não
é coletado de propósito (`:13-14`). A validação é compartilhada com a Rule
(`validarCadastroOrganizador`, `packages/core/src/platform/cadastroOrganizador.ts:115`).

**O submit não chama Function nenhuma.** São três gestos de client SDK
(`CadastrarPage.tsx:113-146`): `criarContaComEmail` (`packages/api-client/src/auth.ts:107`),
`atualizarNomeExibicao` (`auth.ts:337`) e `criarPerfilOrganizador` — um write direto em
**`profissionais/{uid}`** com `statusOnboarding: 'aguardando_convite'` e o carimbo de
consentimento (`packages/api-client/src/platform/profissionais.ts:113-127`), dentro de um
`try/catch` deliberadamente vazio (`:135-137`, best-effort; é esta a folga que o **LGPD-1** já
carrega no painel). A Rule congela o formato: create com `hasOnly` e
`statusOnboarding == 'aguardando_convite'` (`firestore.rules:2892-2917`, `:2908`), update de
cliente negado (`:2927-2930`).

Em paralelo, o trigger `onCreateUser` cria **`atletas/{uid}`**
(`functions/src/auth/onCreateUser.ts:102-108`) e dá a claim **`role: 'athlete'`**
(`:125-128`). Ao final a pessoa navega para a home logada (`ROTA_POS_CADASTRO = '/'`,
`CadastrarPage.tsx:56`, `:141`) — e é o `ContaTravadaGate` que a recebe em vitrine (Parte 3).

**Consequência para o diretório:** todo cadastro já deixa um doc legível em `profissionais` com
a PII que a fila precisa (nome, e-mail, telefone, organização, quando) e o estado
`aguardando_convite`. A fila do painel master é **leitura de estado que já existe** — nenhum
dado novo nasce para ela. A ressalva é o best-effort: quando o write do perfil falha, a conta
existe no Auth e **não** existe em `profissionais` — é a "conta órfã" que o login barra
(`destinoPosLogin.ts:95`, Parte 3) e que nenhuma lista baseada em `profissionais` verá.

## Parte 2 · As duas portas que existem hoje, e o estado que elas produzem

### A porta do código: `resgatarConviteOrganizador`

`functions/src/platform/resgatarConviteOrganizador.ts` (export em `functions/src/index.ts:63`;
wrapper de cliente em `packages/api-client/src/platform/onboarding.ts:66-69`). Contrato:
`{ codigo } → { tenantId, replay }` (`:102-110`).

Ordem literal de validação: sessão (`:415-417`), e-mail no token (`:418-426`), **rate-limit de
5/hora antes de tudo** (`:230-240`; constantes em
`packages/core/src/platform/conviteOrganizador.ts:42,45` — RN-415), formato do código
(`:243-249`), elegibilidade da conta (`contaElegivelParaResgate`, `:184-187`, lendo o Auth
Admin), e dentro da transação: existência (`:279`), replay (`:286-288`), resgatabilidade
(`:290`), elegibilidade de novo (`:298`). Anti-enumeração: toda recusa é o mesmo
`permission-denied` com a frase `'Código inválido ou já utilizado.'`
(`:116-118`; `conviteOrganizador.ts:52` — RN-414).

O que escreve: o convite vira `usado` com `usadoPor`, `usadoEm`, `tenantId`
(`:300-305`, com compensação em `:336-347`), e a transação chama `provisionTenantCore`
(`:400-402`), que é quem produz o **estado aprovado**:

- **`tenants/{slug}`** nasce `status: 'ativo'` (`functions/src/platform/provisionTenant.ts:380-392`);
- **`profissionais/{uid}`** vira `statusOnboarding: 'ativo'` + `tenantId` + `papeis`
  (`:423-431` no caminho do auto-cadastro; `:401-410` quando o doc não existia);
- **claims**: `role: 'tenant_owner'` + `tenantId`, com `revokeRefreshTokens`
  (`:468` → `setTenantClaims.ts:230-234`, `:256-257`); a promoção `athlete → tenant_owner` só é
  legal para o próprio uid que resgata (`ProvisionOptions.autoCadastroUid`,
  `provisionTenant.ts:108-123`).

Do lado do cliente, o resgate bem-sucedido força a releitura do crachá — `getClaims(true)` em
`apps/painel/src/routes/onboarding/_data/onboarding.ts:236` — e a vitrine cai **por sessão**,
sem passar por "fechar" (delta REV-CORTE no E16).

**Ressalva de produção, citada e não medida:** o registro do corte de 09/08 diz que
`resgatarConviteOrganizador` **responde 404 em produção**
(`02-rodadas/2026-08-09-corte-painel/02-fila-execucao.md` §PONTE-ELEGIVEL-1, "a porta sim, o
resgate não"). Medir deploy não é território desta lane; a fila (04) carrega a conferência como
gate antes de qualquer build que dependa da porta 1 viva.

### A meia-porta da ponte: `promoverParaProfissional`

`functions/src/platform/promoverParaProfissional.ts` (export em `index.ts:69`; chamada real na
landing em `apps/landing/app/(public)/minha-conta/PortasDaConta.tsx:194`). Contrato:
`{ aceiteTermo: true } → { statusOnboarding: 'aguardando_convite', jaExistia }` (`:102-112`).
**Não toca claims** (declarado em `:26-27`; zero `setCustomUserClaims` no arquivo), não cria
tenant: só cria `profissionais/{uid}` em `aguardando_convite` dentro de transação
(`:290-307`). Ou seja: a ponte **entrega gente na fila** — quem passa por ela fica em vitrine
esperando exatamente a mesma aprovação (RN-512).

As recusas dela são **nomeadas** (`MotivoRecusaPromocao`, `:119-125`) enquanto as do resgate são
uma só e genérica — e as duas réguas de elegibilidade compartilham
`contaElegivelParaPapelDeOrganizador` (`functions/src/platform/elegibilidadeOrganizador.ts:76-82`),
uma lendo o token, outra o Auth Admin. A sexta recusa que falta na porta é o
**PONTE-ELEGIVEL-1** (corte de 09/08, lane própria) — esta rodada **cita e não resolve**.

### A emissão do convite: write direto, sem Function

`/plataforma/convites` existe e opera (`apps/painel/src/App.tsx:87`,
`PlataformaRoutes.tsx:43`, `ConvitesRoute.tsx:22`, `ConvitesView.tsx:49`). A geração é
**client SDK com transação** — `gerarConviteOrganizador`
(`packages/api-client/src/platform/convites.ts:75-78`, re-sorteio em colisão `:89-101`), código
sorteado no cliente (`packages/core/src/platform/conviteOrganizador.ts:147`, nota em
`:130-136`). Coleção `convitesOrganizador`, docId = o próprio código, com
`status: 'ativo' | 'usado' | 'revogado' | 'expirado'` (`conviteOrganizador.ts:74`, modelo em
`:81-98`). Rules: leitura só admin (`firestore.rules:484`), create só nascendo ativo
(`:457-465`), update só `ativo → revogado` (`:473-482`), delete nunca (`:487`).

**O rastro da porta 1 já existe pela metade:** convite usado guarda `usadoPor`, `usadoEm`,
`tenantId` (RN-447), e a tela mostra "quem usou" (`ConvitesView.tsx:92-97`). O que ele não
guarda é o ato do **aprovador**: `criadoPor` diz quem emitiu o código, mas emissão não é
aprovação — o código pode ser entregue a qualquer pessoa por fora.

## Parte 3 · Onde mora o estado "aprovado/pendente" — e onde ele NÃO mora

**Não existe campo de aprovação.** Greps por `aprovado|aprovada|aprovacao`, `pendente|'pending'`
de conta, `ativo: boolean` em pessoa, claim de aprovação e callable
`aprovarConta|liberarConta|acessoLiberado` sobre `packages/core`, `packages/api-client`,
`functions/src`, `apps/painel`, `apps/landing`: **zero** no escopo de conta — os hits são de
reembolso (`refund-machine.ts:38-71`), repasse (`repasse-types.ts:50-57`), membro de clube
(`clubs/clube.ts:68`) e `TenantStatus` (`platform/tenant.ts:22`, que é estado do tenant, não da
pessoa). Não existe coleção `usuarios`/`contas`; `pessoas` é o registry de CPF do checkout
(`packages/core/src/pedidos/pessoa.ts:53`), não um cadastro de aprovação.

O que existe é isto, e é suficiente:

| Peça | Valores | Onde |
|---|---|---|
| `profissionais/{uid}.statusOnboarding` | `'aguardando_convite' \| 'ativo'` | tipo em `packages/core/src/platform/cadastroOrganizador.ts:53`; escrito em `profissionais.ts:119`, `promoverParaProfissional.ts:299`; promovido só em `provisionTenant.ts:407`/`:425` |
| claims | `role` + `tenantId?` (+ `platformAdmin?`, `demotedFromRole?`) | `packages/core/src/platform/roles.ts:22-76`; escritores completos: `onCreateUser.ts:125,:211`, `setTenantClaims.ts:153,:256`, `setPlatformAdminCapability.ts:245,:295`, `setClaimsEquipe.ts:287`, seeds |

**A conclusão que a spec consome:** neste sistema, "aprovada" não é um campo — é a **posse da
claim `tenantId`** (com `role: 'tenant_owner'`); "pendente" é a ausência dela com o doc
`profissionais` em `aguardando_convite`. O `Profissional` tipado nem declara `statusOnboarding`
e `consentimentoLgpd`, que são escritos sem estar na interface
(`packages/core/src/index.ts:61-72`) — a mesma folga de tipagem que a RN-542 já registrou para
`telefone`/`organizacao`.

## Parte 4 · A vitrine (RN-510): o que decide, o que dispara, o que o aviso diz

### A decisão de estar em vitrine

`ContaTravadaGate` envolve **todas** as rotas autenticadas (`apps/painel/src/App.tsx:69-91`;
contrato provado por `gate-de-papel.test.ts:125`). A condição é
`emVitrine = contaTravada(sessao) && !rotaDaPessoa` (`ContaTravadaGate.tsx:96`), com
`ROTAS_LIBERADAS = ['/conta']` (`:73`) e o predicado `contaTravada` lendo **só o crachá**:
autenticada + `tenantId === null` + não-admin
(`apps/painel/src/routes/onboarding/_data/onboarding.ts:54-62`). Nenhum campo de banco entra na
decisão. A leitura pendurada tem prazo de 12s e aterrissa fail-closed em vitrine
(`onboarding.ts:133`, `:157-166`).

A `VitrinePainel` não tem hook de dados nenhum (`VitrinePainel.tsx:44-70`, propriedade provada
por `vitrine-sem-query.test.tsx:149-260`) e resolve o conteúdo por rota
(`areasDaVitrine.ts:82-94`). Texto do estado vazio, na íntegra: título *"Esta área abre com o
código Leela"*, descrição *"Você já está dentro e pode circular à vontade. Para trabalhar com
seus dados aqui, fale com o nosso time e receba o código Leela."*, CTA *"Como receber o código
Leela"* (`VitrinePainel.tsx:57-62`).

### A régua da interação, como está implementada

`useAvisoNaPrimeiraInteracao` (`_lib/primeiraInteracao.ts:94-137`, consumido em
`ContaTravadaGate.tsx:100`). **Dois eventos só, em captura no `document`**: `click`
(`:125`) e `keydown` (`:126`) — captura no documento porque a sidebar é do `RootShell`, acima do
gate (`:10-15`). O alvo tem de casar `SELETOR_INTERATIVO` (`:40-53`):
`a[href]`, `button`, `summary`, `input`, `select`, `textarea`, `[role="button"|"link"|"menuitem"|"tab"|"switch"]`,
`[tabindex]:not([tabindex="-1"])` — via `closest` (`ehTentativaDeUso`, `:64-68`). Teclado:
`Enter`, espaço (`TECLAS_DE_USO`, `:71`), exigindo tecla **e** alvo acionável (`:120-121`).
**Foco puro (Tab) não dispara** — não há handler de `focus`/`focusin`/`pointerdown`. Isenção
por `data-vitrine-isento` (`:61`, `:66`), aplicada ao conteúdo do próprio aviso
(`OverlayConvite.tsx:188`).

Rearme (P14): com o aviso aberto os ouvintes saem do documento (`:112`); fechar
(`:133`) reinscreve os dois — fecha e volta na interação seguinte, sem "uma vez por sessão" e
sem persistência. As quatro saídas do gesto convergem em `fecharAviso`
(`ContaTravadaGate.tsx:117-120`). Tudo medido por `vitrine-interacao.test.tsx` (`:75-215` —
menu, botão, Enter, espaço, moldura, rearme pelas quatro saídas). **P11/P12/P14 são premissas
de spec, não nomes de caso**: zero ocorrências dos tokens em código.

### O aviso, e o que ele diz hoje

`OverlayConvite.tsx` sobre o `Modal` do DS (`:173-180`). Copy na íntegra: título *"Boas-vindas
à Leela"* (`:122`); descrição *"Você já entrou e pode circular pelo painel à vontade. Para
trabalhar com os seus dados aqui, fale com o nosso time e receba o código Leela."* (`:125-126`);
parágrafo do participante *"Veio participar de uma experiência? Seus ingressos ficam na área do
cliente, no site da Leela."* (`:190-193`); campo *"Já tem o código Leela?"* (`:207`); submit
*"Liberar acesso"* (`:218`); *"Falar com o time Leela"* (`:229`); *"Continuar olhando"*
(`:232`); *"Minha conta"* (`:236`); *"Sair"* (`:239`). **O aviso conhece uma espera só: a do
código.** Não existe menção a liberação direta — nem poderia, a porta não existe.

### Como a tela descobre que foi liberada — e a resposta é: não descobre

**Não há listener em tempo real.** `onSnapshot` e `onIdTokenChanged` no fluxo da vitrine:
**zero ocorrências** (`routes/onboarding`, `shell`, `api-client/src/auth.ts`). A sessão vem de
`onAuthStateChanged` puro (`onboarding.ts:150` → `auth.ts:76-78`), que **não reemite** em
refresh de token. O único destrave sem reload é `sessao.recarregar()` (`onboarding.ts:179`),
chamado num único lugar: depois do resgate bem-sucedido (`ContaTravadaGate.tsx:141-144`, com
`getClaims(true)` em `onboarding.ts:236`). **Se o admin liberar server-side, a vitrine não cai
sozinha** — é exatamente o buraco que o ADMINVISAO-5(b) pergunta e a RN-550 propõe fechar.

### Uma ponta que a varredura achou, e que não é desta decisão

`shellSidebarSections` troca para a nav de plataforma em qualquer pathname `/plataforma*`
**sem olhar claim** (`apps/painel/src/shell/sidebar.ts:148-157`): uma conta em vitrine que
digite `/plataforma` vê a **barra do super-admin** (nove itens, `_lib/nav.ts:17-31`) com a
vitrine de "Plataforma" no conteúdo. Dado nenhum vaza (a vitrine não consulta e as Rules
trancam), mas a moldura mente o papel. Vai à fila como conserto pequeno, sem carona em decisão.

## Parte 5 · O painel master hoje: o que já lista contas, e o que não lista

Rotas vivas (`PlataformaRoutes.tsx:29-59`): `tenants` (lista, detalhe, termos), `planos`,
`convites`, `taxa`, `repasses`, `estornos`, `macro`. **Não existe rota de contas/pessoas/
pendentes.** Guard: `PlatformGuard.tsx:34-42` (403 sem capacidade).

O que já lista alguma coisa de gente:

- **Tenants** (`TenantsList.tsx:135-137`, dados em `tenants.ts:52-70`) — produtores já
  provisionados, com owner resolvido por uid (`profissionais.ts:70-80`). Quem está esperando
  não tem tenant, logo não aparece.
- **Convites** (`ConvitesView.tsx:120-122`) — códigos e "quem usou" (`:92-97`). Lista
  **códigos**, não contas: só aparece quem **já** resgatou. A fila de espera é invisível aqui
  por construção.
- **Onda 1 do ADMIN-VISAO, camada de dados sem tela** (nenhum consumidor em `apps/` — grep
  zero): `listarClientesDoTenant` (callable Admin SDK sobre `crmClientes`, tenant-scoped,
  campos mínimos, auditoria de concessão e negativa —
  `functions/src/platform/listarClientesDoTenant.ts:133-261`, export `index.ts:496`);
  `listarEventosGlobalPaginado`/`listarClubesGlobalPaginado`
  (`packages/api-client/src/platform/listasGlobais.ts:92-131`, `:137-154`); leituras por tenant
  de eventos/clubs/pedidos/pagamentos (`tenantEventosClubs.ts:82`, `:124`;
  `tenantVendas.ts:78`, `:104`); cron do rollup (`functions/src/index.ts:72`, `:77`).
  **Nada disso lista quem espera** — `listarClientesDoTenant` é CRM de um tenant, outra
  população.

O que **não** existe, confirmado por busca e não por inferência:

- **Nenhum reader lista a coleção `profissionais`** — grep `collection(db, 'profissionais')`
  em `api-client` e `apps`: zero; só `getProfissional` por uid (`profissionais.ts:49-56`). As
  Rules **permitiriam** ao admin (`firestore.rules:2920-2922`); ninguém escreveu o reader — é a
  `S1615-T1`, ainda aberta no kanban.
- Nenhum callable `listarContas`/`listarPessoas`/`diretorio`/`listarUsuarios`: zero no repo.
- Nenhum `admin.auth().listUsers()` fora de teste.
- Grep `aguardando_convite` em `apps/painel/src/routes/plataforma`: **zero** — o painel master
  não lê, não filtra e não mostra o estado que a fila precisa mostrar.
- `pessoas` totalmente fechada: `allow read, write: if false` (`firestore.rules:2687-2689`),
  com o comentário canônico em `:2676-2686` — CPF em claro, cross-tenant, nem `platform_admin`
  via client SDK. Qualquer coisa ali é callable com Admin SDK, e é decisão do dono (V-4).

**Veredito da medição:** o dono está certo duas vezes. O cadastro de 06/08 é invisível porque
nenhuma superfície lê `profissionais` como lista; e a aprovação não tem ato administrativo —
existe emissão de código (write de cliente, `convites.ts:75-78`) e existe resgate (Function),
mas não existe "aprovar" como gesto do painel. A S1615 constrói a tela; esta spec dá a ela o
contrato de convergência, o rastro e a saída da vitrine.
