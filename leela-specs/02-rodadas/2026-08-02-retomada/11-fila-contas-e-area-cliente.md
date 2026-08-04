---
tags: [leela, fila, rodada, contas, seguranca, area-do-cliente]
trace: leela-build-2d6ee98d
lote: SPEC-ADMINSEP
data: 2026-08-04
---

# 11-fila-codigo · Contas separadas e a área do cliente

> Três frentes. A **A** conserta o registro errado de acesso único e fecha o acúmulo entre
> administração e cliente (RN-449, RN-450). A **B** constrói a área do cliente (RN-451,
> RN-452), absorvendo o card `S1222` do backlog. A **C** conserta o primeiro acesso do
> comprador (RN-453), que hoje não termina onde o dono descreveu, e é a mais curta das três.
>
> Regras em `10-rns-contas-e-area-cliente.md`. Diagnóstico com evidência em
> `09-spec-contas-e-area-cliente.md`. **Leia as fronteiras antes de pegar qualquer card:
> quase tudo aqui está serializado atrás de uma lane em voo.**

## Frente A · a conta do painel de plataforma é outra (E00 · S032)

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| A1 | `S032-T1` | Desfaz a precedência escrita: troca o comentário de `destinoPosLogin.ts:82-86` e mata o caso de teste da precedência. | `apps/painel/src/routes/conta/auth` | — | opus | — |
| A2 | `S032-T2` | Recusa de acúmulo no `setTenantClaims` (RN-449a) + allowlist em `platform/configAdmin` (RN-449e). | `functions/src/platform`, `firestore.rules` | — | opus | ⚔ |
| A3 | `S032-T3` | Dá nome de RN-449 às três recusas que já existem (RN-449c). | `functions/src/__tests__` | A2 | opus | ⚔ |
| A4 | `S032-T4` | `contaSemFriccao` para de amarrar compra em conta de administração (RN-449d). | `functions/src/checkout` | — | opus | ⚔ |
| A5 | `S032-T5` | Varredura read-only das contas de produção: quem acumula, quem é administrador. | `functions/scripts` (script novo) | — | opus | — |
| A6 | `S032-T6` | O seed de produção para de semear administrador, e nasce o runbook da conta real. | `functions/scripts`, `leela-specs` | A5 | opus | ⚔ |
| A7 | `S032-T7` | O menu de plataforma para de aparecer para quem não é administrador. | `apps/painel/src/shell` | — | opus | — |

## Frente B · a área do cliente (E12 · S1222, absorvendo o card do backlog)

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| B1 | `S1222-T1` | Callables do próprio dono da conta: histórico de compras e ingressos. | `functions/src/cliente` (novo), `packages/api-client` | A4 | opus | ⚔ |
| B2 | `S1222-T2` | A área na landing: casa autenticada, Meus Ingressos em próximos e passados, histórico de compras. | `apps/landing/app`, `packages/api-client` | **S1221-T1**, B1 | opus | — |
| B3 | `S1222-T3` | Meus dados e trocar senha, sobre `atletas/{uid}` e o Auth. | `apps/landing/app`, `firestore.rules` | B2 | opus | — |
| B4 | `S1222-T4` | Meus Clubes e a caixa de convites de promotor e influenciador. | `apps/landing/app`, `functions/src/cliente` | B2 | opus | — |
| B5 | `S1222-T5` | As duas portas: botão para a área de organizador e "criar conta de organizador". | `apps/landing/app` | B2, A1 | opus | ⚔ |

## Frente C · o primeiro acesso do comprador (E12 · S1223)

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| C1 | `S1223-T1` | Tela `/definir-senha` na landing: valida o código, define a senha, autentica e aterrissa. | `apps/landing/app`, `packages/api-client` | — | opus | ⚔ |
| C2 | `S1223-T2` | `actionCodeSettings.url` nos dois pontos de origem, por origem. | `functions/src/checkout`, `packages/api-client` | C1 | opus | ⚔ |
| C3 | `S1223-T3` | Conferir e, se faltar, autorizar o domínio de continuação no Auth. | operação (Console/CLI) + `leela-specs` | C2 | opus | — |

---

## As tarefas, com critério de aceite falsificável

### A1 · `S032-T1` · desfazer a precedência escrita

Trocar o bloco de comentário de `apps/painel/src/routes/conta/auth/_lib/destinoPosLogin.ts:82-86`.
O `if (sessao.role === 'platform_admin')` **fica e não muda de comportamento**: a conta de
administração vai para `/plataforma` porque é a única casa dela, não porque vence uma disputa
de papéis. O item 57 continua ratificado.

Em `__tests__/destinoPosLogin.test.ts`:

- **matar** o caso `conta admin + organizador vai para /plataforma por PRECEDÊNCIA (acesso
  único)`. Ele afirma um estado que a RN-449 proíbe;
- **manter** o caso `o super-admin NUNCA é barrado na porta, com ou sem doc de profissional`,
  reescrevendo o comentário: ele trava a ordem de avaliação da guarda de conta órfã
  (`destinoPosLogin.ts:67-73`), nunca foi sobre acúmulo, e continua correto;
- **somar** um caso citando a RN-449: sessão `platform_admin` com `tenantId` preenchido é
  estado impossível pelo modelo, e esta função não é o lugar que o legitima.

**Aceite:** a busca por `PRECEDÊNCIA` no arquivo de teste devolve zero; a busca por
`ACESSO ÚNICO` no arquivo de código devolve zero; a suíte `conta/auth` fica verde com o
mesmo número de casos ou mais. **Falsificação:** restaurar o caso morto por índice de linha
faz a suíte continuar verde, o que prova que o caso não era propriedade e sim opinião. Por
isso o aceite é textual, não só de suíte.

### A2 · `S032-T2` · a recusa de acúmulo no `setTenantClaims`

Antes de gravar `role: 'platform_admin'`, a callable verifica o uid alvo e recusa quando
existir `profissionais/{uid}`, ou `atletas/{uid}`, ou um doc em `pessoas` com
`contaUid == uid`, ou quando a claim vigente for `tenant_owner`, `tenant_staff` ou
`promoter`. Erro `failed-precondition`, mensagem própria citando a RN-449 e o caminho
suportado. **Nunca `internal`.**

Allowlist (RN-449e): a concessão exige o e-mail do alvo em `platform/configAdmin`, doc
próprio, com Rule de leitura e escrita só para `platform_admin`, no molde de
`platform/configOnboarding`. Doc ausente ou lista vazia faz a callable recusar. O bootstrap
manual pelo Admin SDK não passa pela callable e segue funcionando, como
`platformAdmin.seed.ts:65` já declara.

O caminho inverso continua aberto: rebaixar ou promover um `platform_admin` para outro papel
segue permitido, porque é troca de lado e não acúmulo.

**Aceite:** quatro casos de recusa, um por marca, cada um afirmando o código do erro E o
texto da mensagem; um caso provando que a demoção de administrador continua passando; dois
casos de allowlist, dentro e fora. **Falsificação obrigatória:** remover a checagem de
acúmulo mata os quatro primeiros; esvaziar `platform/configAdmin` mata os de allowlist.

### A3 · `S032-T3` · dar nome às recusas que já existem

Nenhuma trava nova. Três casos de teste que citam a RN-449 sobre guardas já vigentes, para
que ninguém as desfaça achando que são acidente:

1. `provisionTenantCore` com e-mail de owner cuja conta é `platform_admin` recusa com
   `failed-precondition` (`provisionTenant.ts:196-256`);
2. `resgatarConviteOrganizador` chamado por `platform_admin` recusa
   (`resgatarConviteOrganizador.ts:180-181`);
3. `setTenantClaims` recusa `tenantId` junto de `platform_admin`
   (`setTenantClaims.ts:127-132`).

**Aceite:** os três casos verdes, cada um nomeando a RN-449 no título. **Falsificação:**
abrir cada guarda por índice de linha mata o caso correspondente e só ele.

### A4 · `S032-T4` · o lado cliente para de amarrar compra em conta de administração

Em `functions/src/checkout/contaSemFriccao.ts`, depois de resolver a conta pelo e-mail
(`:153-160`) e antes do vínculo (`:163`), ler o papel da conta. Sendo `platform_admin`:
não amarrar `pessoas/{ref}.contaUid`, não tratar a conta como conta de comprador, e carimbar
no pedido `contaSemFriccao: { contaUid: null, contaCriada: false, motivo:
'conta_admin_nao_vinculavel' }`.

**A compra é confirmada normalmente.** O arquivo é best-effort por contrato e nenhuma falha
dele derruba a confirmação. Dinheiro fail-open, identidade fail-closed. Nenhum e-mail de
definição de senha é disparado nesse caminho.

**Aceite:** um pedido pago cujo `responsavel.email` pertence a uma conta `platform_admin`
sai com `contaUid` nulo, com o motivo carimbado, com `pessoas/{ref}.contaUid` intocado e com
o pedido em `pago`. Um pedido de e-mail comum continua amarrando, sem regressão.
**Falsificação:** remover a leitura de papel faz o primeiro caso morrer e o vínculo voltar a
ser escrito.

### A5 · `S032-T5` · a varredura das contas de produção

Script **read-only**, no molde dos que já existem em `functions/scripts`, contra `leela-hub`,
com credencial por `GOOGLE_APPLICATION_CREDENTIALS` e a mesma trava de ambiente do
`prod-seed-leela-hub.ts:47-66`. Zero escrita, e o script deve abortar se qualquer
`*_EMULATOR_HOST` estiver no ambiente.

Devolve, por conta do Auth: uid, e-mail, papel da claim, se existe `profissionais/{uid}`, se
existe `atletas/{uid}`, e se existe `pessoas` com `contaUid` apontando para ela. Marca em
destaque toda conta que combine `platform_admin` com qualquer uma das outras três.

**Aceite:** o relatório existe, roda sem escrever nada, e responde de forma numérica quantas
contas acumulam. Se a resposta for zero, isso é resultado válido e fecha o item. **Nada de
migração antes deste número.** **Falsificação:** o script apontado a um projeto com uma conta
montada de propósito acusa a conta.

### A6 · `S032-T6` · a conta de administração de produção deixa de ser a de demonstração

Duas metades.

**Código:** `functions/scripts/prod-seed-leela-hub.ts` para de chamar `seedPlatformAdmin` e
para de gravar `PREVIEW_PASSWORD` na conta de administração (`:182-188`). Semear
administrador contra o projeto real, com senha publicada no repositório, é o furo, não a
conveniência. As contas de organizador de demonstração seguem como estão, porque são dado de
vitrine e não alcançam a plataforma.

**Runbook**, em `leela-specs`: criar a conta real com o e-mail que o dono escolher, aplicar a
claim pelo caminho manual de Admin SDK que já é o declarado para produção
(`platformAdmin.seed.ts:65`), pôr o e-mail na allowlist da A2, e só então **revogar a conta
de demonstração** com `revokeRefreshTokens` seguido de remoção da claim.

Depende do dono escolher o e-mail: está no painel como **ADMINSEP-3**. A metade de código
não depende dele e pode aterrissar antes.

**Aceite:** a busca por `seedPlatformAdmin` em `prod-seed-leela-hub.ts` devolve zero; o
runbook está escrito com os comandos exatos e a ordem. **Falsificação:** restaurar a chamada
faz o teste que afirma a ausência morrer.

### A7 · `S032-T7` · o menu de plataforma para de vazar

`apps/painel/src/shell/sidebar.ts:148-157` escolhe o conjunto de itens olhando
`pathname.startsWith('/plataforma')` e nada mais. Uma conta `tenant_owner` que digitar a URL
recebe o 403 correto do `PlatformGuard`, com o menu inteiro de super-admin desenhado em
volta. Passa a olhar o papel também: sem `platform_admin`, o menu de plataforma não é
montado. O `RootShell` precisa passar o papel adiante, e hoje `useShellSession`
(`apps/painel/src/shell/session.ts:11-16`) devolve só nome e foto.

Vaza taxonomia, não dado. É card de higiene, não de incidente.

**Aceite:** um caso renderizando o shell em `/plataforma` com sessão `tenant_owner` não
encontra nenhum dos nove itens de `PLATFORM_NAV`; o mesmo caso com `platform_admin` encontra
os nove. **Falsificação:** voltar a decidir só por `pathname` mata o primeiro caso.

### B1 · `S1222-T1` · os callables do próprio dono da conta

Dois callables novos, no molde exato do `getCheckoutPrefill`
(`functions/src/checkout/prefillCheckout.ts:99`, `:170-180`), que já resolve o mesmo problema:
devolver dado tenant-scoped a um participante sem abrir Rule nenhuma.

- **histórico de compras** — pedidos cuja pessoa tem `contaUid == caller.uid`, com e-mail
  verificado, devolvendo só o que o comprador precisa ver;
- **meus ingressos** — inscrições ligadas à mesma pessoa, com o recorte próximos e passados
  feito **no servidor**, pela data do evento.

Nenhuma Rule de `pedidos` ou de `inscritos` é tocada. Elas continuam fechadas ao papel
`athlete` (`firestore.rules:2542`, `:900`), e isso é propriedade a ser testada, não efeito
colateral.

**Aceite:** o callable devolve só o do chamador; chamado sem sessão devolve
`unauthenticated`; chamado por conta sem e-mail verificado devolve estado próprio e
distinguível de "não há compras"; um token `athlete` lendo `pedidos` direto pelo SDK
continua negado. **Falsificação:** trocar o filtro de `contaUid` por uma consulta sem filtro
faz o caso de isolamento morrer.

### B2 · `S1222-T2` · a área na landing

**Bloqueada por `S1221-T1`.** A landing não tem autenticação nenhuma hoje: uma varredura por
`signIn`, `createUserWithEmailAndPassword`, `useAuth` e `onAuthStateChanged` em
`apps/landing` devolve zero, e o único login existente é o anônimo do checkout
(`CheckoutFlow.tsx:527`). A área do cliente precisa de sessão nomeada, e a sessão nomeada é
justamente a `S1221` que o dono já pediu em 03/08 como overlay de login na landing. As duas
convergem, e a `S1221` deixa de ser card solto para virar pré-requisito desta.

A área entrega a casa autenticada com Meus Ingressos, separados em próximos e passados, e o
histórico de compras. Simples, como o dono frisou.

**Aceite:** a área é inalcançável por sessão anônima; com sessão nomeada e e-mail verificado
mostra os ingressos nos dois recortes; sem e-mail verificado mostra o estado honesto com o
reenvio, e não a lista vazia. Sem regressão nos indicadores de busca e velocidade da landing,
que é gate próprio (S1200).

### B3 · `S1222-T3` · meus dados e trocar senha

Sobre `atletas/{uid}`, que é a identidade global do cliente por ADR-009, e cuja escrita já é
do próprio dono do uid (`firestore.rules:2683`). **Não** sobre `profissionais/{uid}`, que é o
perfil do organizador e já tem casa própria em `/conta` no painel (S020-T4). Uma conta que
acumula cliente e organizador tem os dois documentos, e cada tela edita o seu.

Trocar senha usa o caminho oficial do Auth, o mesmo que o `contaSemFriccao` já usa para o
link de definição de senha.

**Aceite:** editar meus dados na área do cliente não altera `profissionais/{uid}`, e o
inverso também vale. Este caso é a materialização da RN-450 e precisa existir.

### B4 · `S1222-T4` · Meus Clubes e a caixa de convites

Lista dos clubes em que a conta é membro (`clubes/{id}/membros`) e a caixa de convites para
virar promotor ou influenciador.

O aceite do convite **continua sendo o link com token**, que já existe e é público:
`/convite/afiliado` (RN-316) e `/convite` (E18). A área lista o que chegou; ela não vira um
segundo mecanismo de aceite. Duplicar o aceite duplicaria a superfície de credencial.

**Aceite:** a caixa lista convites da própria conta; aceitar a partir da área leva ao mesmo
fluxo com token, sem caminho novo de credencial.

### B5 · `S1222-T5` · as duas portas

**Botão para a área de organizador.** Aparece **somente** para a conta que também é
organizadora e leva ao painel do organizador. Conta que é só cliente não vê o botão. **Nenhum
caminho da área do cliente leva ao painel de plataforma** — este é o ponto onde a RN-449 vira
tela, e o caso de teste tem de existir com esse nome.

Premissa que sustenta o desenho: "botão para entrar na área de administrador", na frase do
dono, é a área do **organizador**. Está no painel como **ADMINSEP-2**, aguardando
ratificação. Se o dono ratificar a outra leitura, esta task muda e nada mais desta fila muda.

**Criar conta de organizador.** Não provisiona tenant. Cria `profissionais/{uid}` com
`statusOnboarding: 'aguardando_convite'` (RN-411) e entrega a pessoa no overlay bloqueante da
ONBOARD-BUILD (RN-416). Uma máquina só, dois botões.

**Aceite:** conta só-cliente não encontra o botão de organizador; conta que acumula encontra
e chega ao painel do organizador; nenhuma das duas alcança `/plataforma`; "criar conta de
organizador" termina no overlay e não em tenant provisionado.

### C1 · `S1223-T1` · a tela de definir a senha, na landing

Rota `/definir-senha` em `apps/landing`, que lê o `oobCode` da URL e usa os três seams que o
api-client já exporta e o painel já consome: `verificarCodigoResetSenha`,
`confirmarResetSenha` e o login. Nenhum seam novo, nenhum token inventado.

**Por que na landing e não no painel:** a `RedefinirSenhaPage` do painel existe e funciona,
mas o comprador que definisse a senha ali seria expulso no passo seguinte. Sem tenant e sem
`profissionais/{uid}`, a guarda de conta órfã do `destinoPosLogin.ts:67-73` barra a conta e
derruba a sessão. A pessoa definiria a senha e seria mandada embora, que é exatamente o
oposto da frase do dono.

Três estados, distinguíveis, herdando a honestidade que o painel já pratica
(`RedefinirSenhaPage.tsx`, fases `verificando`, `invalido`, `pronto`):

- **código válido** — formulário de senha; ao salvar, autentica e aterrissa em Meus
  Ingressos;
- **código inválido ou expirado** — estado honesto com **botão de reenvio**, nunca "peça
  ajuda". A confirmação do reenvio é neutra: mesma mensagem exista ou não a conta, com
  `auth/user-not-found` engolido, pela disciplina anti-enumeração de
  `RecuperarSenhaPage.tsx:5-9`;
- **senha já definida** — estado próprio que oferece **entrar**, não redefinir. Mandar quem
  já resolveu de volta para "link inválido" é tecnicamente certo e humanamente errado.

**Onda 1, enquanto a área do cliente não existe:** aterrissar numa confirmação de conta
pronta com o link direto do ingresso que originou a conta. Uma tela a mais, nenhum épico a
mais. Quando a B2 subir, a aterrissagem passa a ser Meus Ingressos.

**Aceite:** os três estados existem e são alcançáveis; ao fim do caminho feliz a sessão é
**nomeada**, não anônima; nenhuma mensagem distingue e-mail cadastrado de não cadastrado.
**Falsificação:** remover o login pós-confirmação faz o caso do caminho feliz terminar em
tela de entrar; colapsar os três estados num só mata dois casos.

### C2 · `S1223-T2` · o link passa a cair na tela da Leela

Somar `actionCodeSettings` nos dois pontos de origem, com destino **por origem**:

- `functions/src/checkout/contaSemFriccao.ts:107` — continuação na landing, base vinda de
  `LEELA_PUBLIC_URL`, que já está deployada como variável de ambiente nas 88 funções;
- `packages/api-client/src/auth.ts:214` — continuação no painel, base vinda de
  `NEXT_PUBLIC_PAINEL_URL` ou do equivalente do painel. Nenhuma base cravada no código.

Corrigir junto o comentário de `auth.ts:209-212`, que hoje aponta o Action URL do Console
como solução. Ele é global para o projeto e não distingue comprador de organizador, então
não serve. Deixá-lo escrito faria alguém desfazer esta task achando que existe atalho.

**Aceite:** o link gerado por cada origem carrega `continueUrl` para o domínio certo, e o
teste afirma o domínio, não a string inteira. **Falsificação:** remover o parâmetro em cada
origem mata o caso correspondente e só ele.

**Ordem inegociável:** C2 sobe **depois** de C1 estar no ar. Apontar a continuação para uma
rota que ainda não existe troca uma tela genérica por um 404, o que é pior que o estado de
hoje.

### C3 · `S1223-T3` · o domínio de continuação autorizado

O Firebase recusa `actionCodeSettings` com `auth/unauthorized-continue-uri` quando o domínio
não está nos Authorized Domains do Auth. O projeto autoriza os próprios domínios por default,
mas `leela-landing.web.app` é um **segundo** site de Hosting e pode não estar na lista.

Conferir, autorizar se faltar, e registrar o estado encontrado no runbook. É passo de
operação, não de código.

**Aceite:** o estado anterior e o posterior registrados; um link de compra gerado em produção
abre a tela da Leela. **Falsificação:** não há teste automatizado para isto; a prova é o link
real abrindo, e é por isso que o passo existe separado em vez de embutido na C2.

## Ordem e paralelismo

1. **Agora, sem esperar nada:** A1 e A7. São os dois únicos cards em `apps/painel`, que é
   território livre.
2. **Assim que a PIXREAL-FIX aterrissar:** A2, A4, A5 e C1 partem juntos. Não dependem entre
   si.
3. A3 entra depois da A2, para reusar a mensagem de erro. A6 entra depois da A5, porque não
   se migra conta antes do número.
4. C2 espera C1 no ar, e C3 fecha a Frente C. **A Frente C é a mais curta e a que o dono está
   esperando**: ela conserta uma jornada que hoje não termina onde ele descreveu.
5. B1 entra depois da A4: o vínculo tem de estar correto antes de a área mostrar o que ele
   diz.
6. B2 espera `S1221-T1` e B1. Depois dela, B3 e B4 correm em paralelo; B5 espera B2 e A1.
   Quando a B2 subir, a aterrissagem da C1 passa de confirmação para Meus Ingressos.
7. **Jornada de aceite da Frente A:** conceder administração a uma conta que já comprou é
   recusado com mensagem nomeada; comprar com o e-mail da administração confirma a compra e
   não amarra; a varredura de produção devolve um número.
8. **Jornada de aceite da Frente B:** entrar na landing, ver os próprios ingressos separados
   em próximos e passados, abrir o histórico, editar meus dados sem tocar no perfil de
   organizador, e não encontrar nenhuma porta para o painel de plataforma.
9. **Jornada de aceite da Frente C:** comprar, receber o e-mail, clicar, definir a senha e
   **estar dentro**, sem segundo login. Clicar de novo no mesmo link e encontrar caminho de
   volta. Abrir o link do ingresso numa janela anônima e ele continuar funcionando.

## Fronteiras

- **`functions/` e `apps/landing/` estão DISPUTADOS.** A lane **PIXREAL-FIX** está em voo na
  mesma árvore de trabalho, sem commit, tocando `functions/` e `apps/landing/`. **Serializar
  por lane, nunca por task.** Isso segura A2, A3, A4, A5, A6 e a Frente B inteira. Só A1 e A7
  estão livres agora.
- **`contaSemFriccao` é caminho de dinheiro confirmado.** A A4 acrescenta uma leitura e um
  desvio; ela não pode introduzir nenhum caminho novo em que uma exceção escape do
  best-effort. O contrato do arquivo está no cabeçalho e vale mais que a conveniência.
- **`provisionTenantCore` continua sendo máquina única** (RN-403). A A3 só acrescenta caso de
  teste; não duplica nem bifurca provisionamento.
- **Nenhuma Rule de coleção tenant-scoped é aberta ao papel `athlete`.** Se alguma task
  parecer pedir isso, a task está errada: o molde é callable do próprio dono da conta. Abrir
  `platform/config` à conta travada já foi tentado uma vez e a RN-417 teve de ser
  reconciliada por causa disso.
- **A conta de demonstração ainda é a administração de produção** enquanto a A6 não fechar.
  Qualquer lane que mexa em Auth de produção antes disso precisa saber.
- **O laudo da INV-EMAIL-INGRESSO não aterrissou** até o fechamento desta fila. Ele não
  bloqueia nenhuma task: a RN-452 mantém o link assinado de pé em qualquer cenário. Se o
  laudo mostrar que o e-mail promete outra coisa, muda a redação do e-mail, não este desenho.

## Critério de pronto do pacote

**Frente A**

- [ ] conta que já é cliente ou organizadora nunca recebe `platform_admin`, e a recusa é
      nomeada, nunca `internal`
- [ ] conceder administração exige e-mail em allowlist de doc próprio, e a lista vazia recusa
- [ ] rebaixar ou promover administrador para outro papel continua funcionando
- [ ] comprar com o e-mail da administração confirma a compra e **não** cria vínculo
- [ ] as três recusas que já existiam têm caso citando a RN-449
- [ ] a varredura de produção devolveu um número, e a migração só começou depois dele
- [ ] a conta de administração de produção não é mais a de demonstração
- [ ] o menu de plataforma não aparece para conta sem `platform_admin`
- [ ] `PRECEDÊNCIA` e `ACESSO ÚNICO` não existem mais no roteamento pós-login nem no seu teste

**Frente B**

- [ ] a área é inalcançável por sessão anônima
- [ ] histórico e ingressos vêm por callable do próprio dono da conta, com Rules de `pedidos`
      e `inscritos` intocadas, e o ataque de leitura direta por token `athlete` é recusado
- [ ] conta sem e-mail verificado vê estado honesto, e não lista vazia mentindo
- [ ] editar meus dados do cliente não toca `profissionais/{uid}`, e o inverso também
- [ ] o aceite de convite continua sendo o link com token, sem segundo mecanismo
- [ ] nenhum caminho da área do cliente alcança `/plataforma`
- [ ] "criar conta de organizador" termina no overlay travado, e não em tenant provisionado
- [ ] o link assinado do ingresso continua funcionando sem conta (RN-452)

**Frente C**

- [ ] o link do e-mail abre tela da Leela, e não `/__/auth/action`
- [ ] definir a senha deixa a pessoa autenticada, sem segundo login
- [ ] link de compra e link do painel aterrissam em casas diferentes
- [ ] link usado, expirado ou de senha já definida tem três estados distinguíveis, cada um
      com saída própria
- [ ] o reenvio confirma de forma neutra e não vira oráculo de quem comprou
- [ ] o domínio de continuação está autorizado no Auth, com o estado anterior registrado
- [ ] nenhuma regressão na emissão nem no e-mail que já existem

**Todas as frentes**

- [ ] review antagonista em contexto fresco em A2, A4, B1 e C2
