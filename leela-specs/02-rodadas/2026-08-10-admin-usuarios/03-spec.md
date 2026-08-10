---
tags: [leela, spec, rodada, admin, usuarios, onboarding, vitrine, aprovacao, pii]
trace: leela-admin-usuarios-20260810
lote: SPEC-ADMIN-USUARIOS
data: 2026-08-10
---

# 03-spec · O cadastro no painel master, e a vitrine que descobre

> Zero código. Toda afirmação sobre o repositório foi medida e o caminho está em
> [[02-inventario-codigo]]. Seis regras novas, uma história, e os vetáveis no fim — dois deles
> atualizando itens que o painel já carrega, sem duplicar.
>
> **Prova de não colisão.** O [[indice-de-regras-de-negocio]] anuncia a próxima faixa livre na
> **547** (a mais alta em uso é a RN-546, SPEC-ESTOURO-RESERVA de 10/08). Varredura desta lane
> por `RN-547` a `RN-560` sobre `leela-specs`, `apps`, `packages`, `functions` e
> `firestore.rules`, fora do índice e desta rodada: **zero ocorrências**. Esta lane consome
> **RN-547 a RN-552**, e a conferência é refeita imediatamente antes do commit — a lição do
> 537-542 e do 516 continua valendo.
>
> Numeração de histórias: a mais alta do E16 é a **S1615** (SPEC-ADMIN-VISAO, 09/08). Esta lane
> consome **S1616** (varredura repo-wide por `S1616` e `S1617`: zero ocorrências).

## Parte 1 · O desenho, antes das regras

### As duas frases do dono são do mesmo autor, e não colidem

A RN-510 nasceu do verbatim de 06/08: *"Ela entra no sistema e ao tentar clicar em **qualquer
botão, ou aba de menu**, sobe o aviso"*. A decisão de 09/08 diz: *"O modal de liberar acesso
deve aparecer depois que a pessoa já entra no sistema e **tenta fazer alguma ação**"*. A
segunda frase cabe inteira na primeira — e a primeira **inclui a aba de menu por escrito**, que
é exatamente o ponto onde as duas leituras poderiam divergir.

Há um segundo argumento, e ele é de construção. Na vitrine **não existe ação que funcione**: a
tela não tem hook de dados (P15, provado por `vitrine-sem-query.test.tsx`), cada área é um
`EmptyState` e cada acionável é inerte. Um gesto sobre algo acionável, na vitrine, **é** uma
tentativa de ação que não pode acontecer — os dois conjuntos são o mesmo conjunto, salvo a
navegação, que o verbatim de 06/08 incluiu de propósito. Por isso a proposta desta spec é
**ratificar a RN-510 como está** (custo zero, medida em 08/08), com a régua escrita na RN-549
para a frase nunca mais precisar de exegese. A decisão continua sendo do dono
(ADMINVISAO-5 (a)) — esta spec propõe, não fecha.

### Aprovação não é campo: é a claim, e as duas portas têm de produzi-la igual

A medição da Parte 3 do inventário é a fundação de tudo: neste sistema **"aprovada" é a posse
da claim `tenantId`** (com `role: 'tenant_owner'`), e "pendente" é a ausência dela com
`profissionais/{uid}.statusOnboarding: 'aguardando_convite'`. O resgate do código já produz o
estado inteiro num ato só, via `provisionTenantCore` (tenant ativo + doc `'ativo'` + claims +
`revokeRefreshTokens`).

A liberação direta, então, **não inventa estado**: ela é o mesmo destino por outra porta. O
que a RN-548 exige é que a porta nova **reuse o mesmo núcleo** e termine byte a byte onde o
resgate termina — nunca um "aprovado sem tenant", nunca um terceiro valor de
`statusOnboarding`, nunca claim sem doc. Um teste compara os dois terminais em vez de repetir a
lista à mão, no mesmo molde que o PONTE-ELEGIVEL-1 pediu para as recusas (interação citada:
aquela lane iguala as **recusas** das duas guardas; esta iguala os **desfechos** das duas
portas — as duas fecham a mesma tesoura por lados opostos, e nenhuma resolve a outra).

### A fila é leitura, a tela é da S1615, e esta spec dá o contrato

Quem se cadastra **já** deixa tudo que a fila precisa: doc em `profissionais` com nome,
e-mail, telefone, organização, consentimento carimbado e `aguardando_convite` — preso pela
Rule. O que falta é só quem leia isso como lista (grep: nenhum reader de coleção, nenhuma tela
com `aguardando_convite` no painel master). A tela é a **S1615** da SPEC-ADMIN-VISAO (uma
rota, dois modos, Fila como padrão) e esta spec **não a redesenha**: entrega o que faltava a
ela — o contrato de convergência (RN-548), o rastro (RN-551), a saída da vitrine (RN-550) e a
régua do gatilho (RN-549).

### O que esta spec não faz, e é deliberado

Não desenha tela — S1615 é a dona. Não abre Security Rule nenhuma: a fila lê `profissionais`
pelo caminho que a Rule já permite ao admin, `pessoas` continua `if false` (V-4 é do dono), e
a liberação direta é Function. Não resolve o PONTE-ELEGIVEL-1 nem pega carona nele. Não decide
recusa nem revogação — vai ao painel como ADMIN-USUARIOS-2. E não conserta o best-effort do
cadastro (o write do perfil que falha em silêncio é frente do **LGPD-1**); apenas declara a
consequência: conta órfã não aparece em fila baseada em `profissionais`, e a fila diz isso em
vez de fingir completude.

## Parte 2 · Regras de negócio novas

Todas donas em [[LEELA-E16-plataforma-superadmin]], faixa RN-547 a RN-552. Consolidadas no
épico nesta mesma aterrissagem.

### RN-547 · Quem espera aparece: a fila do painel master lê o estado que já existe

Verbatim do dono (ADMIN-USUARIOS-1, 09/08): *"esse cadastro deve aparecer no painel master"*.

Toda conta com `profissionais/{uid}.statusOnboarding: 'aguardando_convite'` **aparece na fila**
do painel master (modo Fila da S1615) a partir do instante do cadastro, sem nenhum gesto da
pessoa além do próprio cadastro. As duas origens entram na mesma fila: o `/cadastrar` (RN-411)
e a ponte participante→profissional (RN-512, `promoverParaProfissional`) — a fila não distingue
por onde a pessoa chegou, e **pode** exibir a origem como coluna, nunca como filtro de entrada.

A fila mostra o mínimo que o trabalho de aprovar exige, e nada além (RN-540): nome, e-mail,
telefone, organização e quando se cadastrou — os campos que o doc já guarda. Nenhum estado
novo nasce: `'aguardando_convite' | 'ativo'` continua sendo o vocabulário inteiro
(`StatusOnboarding`, `packages/core/src/platform/cadastroOrganizador.ts:53`), e sair da
fila é **consequência** de `statusOnboarding` virar `'ativo'` pelo provisionamento, nunca um
gesto separado de "remover da fila".

A fila declara a própria borda: conta cujo write de perfil falhou (o best-effort do
`/cadastrar`) não tem doc e **não aparece** — a tela diz que lista cadastros registrados, não
"todas as contas do Auth". O conserto dessa borda é do LGPD-1, não desta regra.

**Épico dono:** E16 · **consome:** RN-411, RN-512, RN-540 · **conecta:** S1615 (modo Fila).

### RN-548 · Aprovar tem duas portas e um destino só

Verbatim do dono: *"que lá eu aprovarei, passando um código. Ou liberando diretamente o
acesso."*

As duas portas terminam **no mesmo estado terminal**, produzido pelo mesmo núcleo
(`provisionTenantCore`): tenant `ativo`, `profissionais/{uid}` com `statusOnboarding: 'ativo'`
+ `tenantId` + `papeis`, claims `role: 'tenant_owner'` + `tenantId` com refresh tokens
revogados. A liberação direta **não** cria estado intermediário — não existe "aprovada sem
tenant", não existe terceiro valor de `statusOnboarding`, não existe claim sem doc nem doc sem
claim.

As duas portas obedecem à **mesma régua de elegibilidade**
(`contaElegivelParaPapelDeOrganizador` — a régua única que resgate e ponte já compartilham):
conta de plataforma não é liberável, papel conflitante não é liberável, e a recusa da porta
administrativa **nomeia o motivo ao admin** (que é o operador, não um atacante — a
anti-enumeração da RN-414 protege a porta pública e não se aplica ao painel).

O que **não** muda: o mecanismo do resgate (RN-414 — atômico, anti-enumeração, rate-limit
RN-415) e a emissão de códigos (`/plataforma/convites`, RN-447). A porta do código continua
existindo por inteiro — a liberação direta é a segunda porta, não a substituta.

**Prova exigida:** um teste compara os dois desfechos (resgate × liberação direta) campo a
campo — doc, tenant, claims — em vez de repetir a lista à mão, no molde do teste de recusas
que o PONTE-ELEGIVEL-1 pediu.

**Épico dono:** E16 · **consome:** RN-403, RN-414, RN-415, RN-447 · **conecta:** S1615-T3.

### RN-549 · "Tenta fazer alguma ação" tem régua escrita — **condicionada ao veto do dono (ADMINVISAO-5 a)**

**Se o dono ratificar o default proposto** (a leitura de que a frase de 09/08 e a RN-510 são a
mesma régua), esta RN não muda comportamento nenhum: ela **escreve a régua** que já está no ar
para a frase nunca mais precisar de interpretação. O aviso sobe na primeira interação, e
interação é:

- **dispara** — clique, `Enter` ou espaço sobre alvo acionável: `a[href]`, `button`,
  `summary`, `input`, `select`, `textarea`, `[role="button"|"link"|"menuitem"|"tab"|"switch"]`,
  `[tabindex]` focável (o `SELETOR_INTERATIVO` de `primeiraInteracao.ts:40-53`) — o que inclui
  **aba de menu**, pelo verbatim de 06/08;
- **não dispara** — clique em texto ou moldura, foco puro (Tab), tecla própria de widget,
  qualquer gesto dentro do próprio aviso (`data-vitrine-isento`) e qualquer gesto em `/conta`
  (P16);
- **rearma** — fechado por qualquer das quatro saídas do gesto, a interação seguinte o traz de
  volta (P14); a quinta saída, por sessão (resgate ou liberação), não rearma porque a vitrine
  caiu.

**Se ele restringir a "ação bloqueada"**, a régua muda para: navegação de menu deixa de
disparar e o aviso passa a subir só no gesto sobre acionável **de conteúdo** — o custo é
reescrever P11 e P14, tocar `primeiraInteracao.ts` e derrubar parte do que a REV-VITRINE mediu
em 08/08, e ele está declarado no vetável. Nenhuma linha muda antes da resposta.

**Épico dono:** E16 · **é o delta declarado da RN-510** (o enunciado dela não muda no default;
muda só se o dono escolher a segunda leitura).

### RN-550 · A liberação chega a quem espera, sem F5 — **condicionada ao veto do dono (ADMINVISAO-5 b)**

O buraco, medido: a vitrine não tem nenhum caminho de destrave que não passe pelo resgate na
própria tela (`sessao.recarregar()` é chamado num único lugar; `onSnapshot` e `onIdTokenChanged`
não existem no fluxo). Liberada server-side, a conta continua vendo vitrine até recarregar.

**Se o dono ratificar o default proposto**, três peças fecham o circuito:

1. **O sinal é o doc próprio.** Com a conta em vitrine, o painel assina
   `profissionais/{uid}` — leitura que a Rule **já permite** ao dono do doc
   (`firestore.rules:2920-2922`, `request.auth.uid == profId`), zero Rule nova. Quando
   `statusOnboarding` vira `'ativo'`, a tela força a releitura do crachá (`getClaims(true)`)
   e recarrega a sessão — a vitrine cai pela **mesma saída por sessão** do resgate, com todas
   as travas devolvidas (a regra de mecanismo do REV-CORTE vale por inteiro: trava devolvida
   em toda saída, antes do desmonte).
2. **A allowlist cresce em um nome, declarado.** A propriedade da RN-510 é medida por
   allowlist fechada sobre o api-client; a assinatura do doc próprio entra **nomeada** nessa
   lista (uma porta nova, tenant-free, de doc próprio) — nunca por fora da medição. Qualquer
   outro nome novo continua derrubando o caso.
3. **O aviso passa a cobrir as duas esperas, numa linha.** A copy de hoje conhece só o código
   ("fale com o nosso time e receba o código Leela"). Ganha a segunda espera sem virar
   labirinto — na direção de: *"Nosso time também pode liberar seu acesso diretamente — se já
   pediu, é só aguardar: o painel abre sozinho."* A frase final é da lane de build, sob o gate
   de voz; o contrato desta RN é que o aviso **não minta** para quem espera liberação direta,
   e que o campo de resgate continue ali (RN-414 intocada).

**Se ele escolher outra saída** (exigir recarregar, ou polling), a RN nasce nessa forma — as
alternativas e os custos estão no vetável. Nenhuma linha muda antes da resposta.

**Épico dono:** E16 · **consome:** RN-510 (saída por sessão, allowlist), RN-414 ·
**conecta:** S1615-T4.

### RN-551 · Todo ato de aprovação deixa rastro: quem, quando, por qual porta, sobre quem

A aprovação é ato administrativo sobre conta de terceiro, e nenhuma das duas portas pode ser
anônima:

- **Porta do código:** o rastro já existe pela metade — o convite queimado guarda `usadoPor`,
  `usadoEm`, `tenantId` (RN-447) e `criadoPor` diz quem emitiu. O que a regra acrescenta:
  emissão **não** é aprovação (o código circula por fora), então o registro canônico do ato é
  o **resgate** — e ele passa a registrar no mesmo livro que a porta 2 usa, para o dono ter
  **um** lugar onde lê "quem entrou, quando, por onde".
- **Porta direta:** nasce com registro no molde que `listarClientesDoTenant` já pratica
  (`auditoriaAcessos` — concessão **e negativa**): uid do admin, uid e e-mail da conta
  liberada, hora do servidor, porta `'liberacao_direta'`, e o tenant provisionado.

O registro é de servidor, fora do alcance de escrita de qualquer cliente, e a fila do painel
pode exibi-lo ("liberada por X em Y"), mas a exibição é tela, não contrato. Sem export — a
RN-540 vale para o rastro também.

**Épico dono:** E16 · **consome:** RN-447, RN-540 · **estende:** o molde de auditoria de
`getBankDetailsForPayout`/`listarClientesDoTenant`.

### RN-552 · Recusar e revogar — **condicionada ao veto do dono (ADMIN-USUARIOS-2)**

A frase do dono cobre aprovar; não cobre o resto do ciclo. Hoje não existe recusa (a fila só
cresce) nem revogação de conta liberada (a única revogação do sistema é a de **convite ainda
não usado** — `ativo → revogado`, `firestore.rules:473-482`).

Esta RN nasce **na forma da resposta** do ADMIN-USUARIOS-2 e o número fica consumido de
qualquer jeito, para não virar buraco — o mesmo desenho da RN-546. O que já fica cravado,
qualquer que seja a resposta: recusa e revogação, se existirem, são atos administrativos com o
mesmo rastro da RN-551, e revogação **nunca** é delete de dados — no máximo suspende
(`transitionTenant` já sabe suspender tenant), porque apagar histórico de vendas de um tenant
vivo é outra conversa, com o LGPD-1 no meio.

**Épico dono:** E16 · **consome:** RN-551 · **conecta:** S1616-T5 (só nasce com a resposta).

## Parte 3 · História

### LEELA-S1616 · A aprovação converge, e a vitrine descobre

**Job story.** Quando eu aprovo alguém no painel master — passando um código ou liberando
direto —, eu quero que a pessoa termine exatamente no mesmo lugar pelas duas portas e veja o
painel abrir sem precisar recarregar, para a liberação ser um gesto meu e não um chamado de
suporte ("já liberei, dá F5").

- **MoSCoW:** Must (convergência e rastro) / Should (descoberta sem F5) · **Estimativa:** M ·
  **Superfície:** Functions + vitrine do painel · **Épico:** E16
- **RNs:** RN-548, RN-549, RN-550, RN-551, RN-510, RN-414, RN-540
- **Depende de:** **veto do dono no ADMINVISAO-5 (a) e (b)** · S1615-T3 (a Function da
  liberação direta — esta história dá o contrato dela) · e, para a T5, o **ADMIN-USUARIOS-2**
- **Origem:** decisão ADMIN-USUARIOS-1 de 09/08, formalizada nesta rodada

**Critérios de aceite (Given/When/Then)**

- **Dado** uma conta em `aguardando_convite`, **quando** o admin a libera diretamente,
  **então** o desfecho é idêntico ao do resgate de código — tenant `ativo`,
  `statusOnboarding: 'ativo'`, claims `tenant_owner` + `tenantId`, refresh revogado — e um
  teste compara os dois desfechos campo a campo em vez de repetir a lista à mão (RN-548).
- **Dado** que a conta é inelegível (papel conflitante, conta de plataforma), **quando** o
  admin tenta liberar, **então** a recusa **nomeia o motivo** ao admin e é registrada
  (RN-548, RN-551).
- **Dado** que quem chama a Function não é `platform_admin`, **quando** chama, **então** é
  negado e a negativa é registrada (RN-551).
- **Dado** uma liberação por qualquer porta, **quando** ela acontece, **então** o registro diz
  quem, quando, sobre quem e por qual porta, é escrito por servidor e não tem export (RN-551).
- **Dado** a pessoa com a vitrine aberta, **quando** o admin a libera diretamente, **então** a
  vitrine cai sem F5 pela saída por sessão, com todas as travas devolvidas — e o caso está
  travado por teste com o atributo medível, como o REV-CORTE ensinou (RN-550, conforme veto).
- **Dado** a conta em vitrine, **quando** ela espera liberação direta em vez de código,
  **então** o aviso não mente: a copy cobre as duas esperas numa linha, e o campo de resgate
  continua ali (RN-550, RN-414).
- **Dado** a allowlist da vitrine, **quando** a assinatura do doc próprio entra, **então** ela
  entra **nomeada** na lista fechada, e qualquer outro nome novo continua derrubando o caso
  (RN-510).
- **Dado** o gatilho do aviso, **quando** o dono ratificar o ADMINVISAO-5 (a), **então**
  nenhum comportamento muda e a régua da RN-549 passa a ser o texto canônico; **e quando** ele
  restringir, **então** a mudança é a tarefa T4, nunca um efeito colateral.

**Tarefas**

| Task | O que é | Tipo |
|---|---|---|
| `S1616-T1` | Contrato de convergência: a liberação direta reusa `provisionTenantCore` e um teste compara os dois desfechos (resgate × direta) campo a campo ⚔ | api/function |
| `S1616-T2` | A saída da vitrine sem resgate: assinatura do doc próprio + releitura do crachá + travas devolvidas na saída por sessão + allowlist com o nome novo ⚔ · **aguarda ADMINVISAO-5 (b)** | screen |
| `S1616-T3` | A copy do aviso cobre as duas esperas, numa linha, sob o gate de voz · **aguarda ADMINVISAO-5 (b)** | screen |
| `S1616-T4` | A régua do gatilho vira texto canônico (ratificação: só doc) **ou** muda para ação bloqueada (reescreve P11/P14 + `primeiraInteracao.ts`) · **aguarda ADMINVISAO-5 (a)** | spec / screen |
| `S1616-T5` | Recusa e revogação · **só nasce com o ADMIN-USUARIOS-2 respondido** (RN-552) | api/function |

⚔ = mexe em claims e acesso: rota opus com review antagonista.

**Fora de escopo.** A tela da fila e do diretório (S1615-T1/T2). CPF (V-4). Export. A sexta
recusa da ponte (PONTE-ELEGIVEL-1, lane própria). O best-effort do write de perfil (LGPD-1).

## Parte 4 · As cinco perguntas do brief, respondidas

**(a) O que é "AÇÃO" para o modal.** A régua está escrita na RN-549, com os pontos de disparo
enumerados do código real (`SELETOR_INTERATIVO` + `TECLAS_DE_USO` + isenção + `/conta`). A
proposta é ratificar a RN-510 — os dois textos do dono cabem um no outro, e na vitrine todo
acionável é uma ação que não pode acontecer, então as duas leituras só divergem na navegação,
que o verbatim de 06/08 incluiu por escrito. O custo da leitura restritiva está declarado no
vetável. **Quem decide é o dono (ADMINVISAO-5 a).**

**(b) Os dois caminhos convergindo.** RN-548: mesmo núcleo (`provisionTenantCore`), mesmo
estado terminal, mesma régua de elegibilidade, prova por comparação de desfechos. A porta
administrativa nomeia motivo de recusa (o operador não é atacante); a porta pública continua
anti-enumeração (RN-414). Nenhum estado intermediário nasce.

**(c) Onde o painel lista pendentes e o gesto de aprovar.** A tela é a **S1615** (uma rota,
dois modos, Fila como padrão) — esta spec conecta e não duplica. A fila lê
`profissionais.statusOnboarding == 'aguardando_convite'` pelo reader que a S1615-T1 cria (a
Rule já permite ao admin); o gesto de aprovar é: **emitir código** (existe em
`/plataforma/convites`) ou **liberar direto** (S1615-T3, com o contrato da S1616-T1). A ressalva
de produção fica citada: o registro do corte de 09/08 diz que o resgate responde 404 em
produção — conferir o deploy da porta 1 é gate da fila (04), não desta spec.

**(d) Recusa/revogação.** Não existe e o dono nunca decidiu — vira **ADMIN-USUARIOS-2** no
painel, com default proposto conservador (fila sem recusa por ora; revogação não nasce nesta
fase) e a RN-552 condicionada.

**(e) Auditoria do ato de aprovar.** RN-551: quem, quando, sobre quem, por qual porta, com
negativa registrada, no livro que a Onda 1 já abriu (`auditoriaAcessos`), sem export.

## Parte 5 · Vetáveis — o que vai ao painel, sem duplicar

> Dois movimentos no [[DECISOES-ABERTAS]], nenhum item novo além de um: o **ADMINVISAO-5** é
> **atualizado no lugar** (era dele que as perguntas (a) e (b) já eram; ganham agora defaults
> propostos com custo medido), e o **ADMIN-USUARIOS-1 sai** (decidido em 09/08, formalizado
> aqui) dando lugar ao **ADMIN-USUARIOS-2** (recusa/revogação), que é a única pergunta que a
> frase do dono não alcança. A conta do painel não muda.

### ADMINVISAO-5 · atualizado — agora com defaults propostos dos dois lados

**(a) o gatilho:** default proposto **ratificar a RN-510** — a frase de 09/08 cabe na regra em
vigor, o verbatim de 06/08 incluía "aba de menu", e na vitrine todo acionável é uma ação que
não pode acontecer. Custo de ratificar: zero. Custo de restringir: reescrever P11/P14, tocar
`primeiraInteracao.ts` e derrubar parte da medição de 08/08.

**(b) a liberação direta:** default proposto **doc próprio como sinal** — a vitrine assina
`profissionais/{uid}` (leitura que a Rule já permite, zero Rule nova), relê o crachá quando o
estado vira `'ativo'` e cai pela mesma saída por sessão do resgate; o aviso ganha a linha da
segunda espera. Custo: um listener, um nome novo **declarado** na allowlist da RN-510, uma
linha de copy. Alternativas: exigir recarregar (custo zero, e a liberação vira chamado de
suporte) · polling (custo parecido com o listener e pior em tudo).

### ADMIN-USUARIOS-2 · novo — aprovar existe; recusar e revogar, não

Hoje a fila só cresce (não há gesto de recusa) e conta liberada não tem caminho de volta pelo
painel (a única revogação é a de convite não usado). Default proposto: **fila sem recusa por
ora** (cadastro indesejado simplesmente não é aprovado) e **revogação não nasce nesta fase**
(suspender tenant já existe pelo lifecycle, e nenhum caso real pediu revogação de conta).
Texto completo do item, com caso de uso e opções, no painel.
