---
tags: [leela, fila, rodada, contas, primeiro-acesso, cadastro, otp, executavel]
trace: leela-pixreal-diag-20260804
lote: SPEC-CONTAS-LANDING
data: 2026-08-05
---

# 04-fila · O primeiro acesso por código e a criação de conta na landing

> Uma tarefa, um commit. A ordem não é preferência: ela decorre de dependências reais, e onde
> houver dependência ela está escrita na linha. **⚔** marca o que exige review antagonista em
> contexto fresco.
>
> **Nada aqui foi executado.** Esta lane é de documento e o território dela foi `leela-specs/`.
> Regras em `03-rns-delta.md`, todas canônicas nos épicos; spec em `02-spec-contas-landing.md`.

## Por que a ordem é esta

Três ondas. A primeira constrói o motor de credencial e é onde mora todo o risco: o código de
seis dígitos não existe no produto, o Firebase não o oferece, e errar mecânica de credencial é
a categoria mais cara da casa. A segunda é tela e depende do motor inteiro. A terceira é
fronteira, e as duas tarefas dela estão liberadas — a C2 esperava o dono e **foi autorizada em
05/08**, verbatim *"pode aplicar o POSSE-EMAIL-1 na mesma onda"*; ela continua atrás da A4, que
é dependência técnica e não gate.

Quase tudo da Onda A leva **⚔**, e isso não é excesso de zelo. Cinco das sete regras novas são
de credencial, autorização ou dado pessoal, que é exatamente o perfil que a casa manda revisar
em contexto fresco.

## Três coisas que atravessam a fila e precisam estar visíveis antes

**Colisão de território, agora.** A lane `BUILD-MOTION` tem `packages/design-system` e
`apps/landing` em voo, e o `EntrarOverlay.tsx` está no caminho dela — a logo da Leela no modal,
que o dono pediu na mesma fala, é dela e **não** desta fila. A B1 abaixo toca o mesmo arquivo.
Ela não parte antes de a `BUILD-MOTION` aterrissar, e quando partir acrescenta só o rodapé, sem
tocar na moldura nem no cabeçalho do diálogo.

**Um segredo novo de operação.** A RN-476 exige um pepper para o HMAC do código, fail-closed
quando falta. É o terceiro segredo desse tipo na casa, ao lado do `CRM_ID_PEPPER` e das chaves
do QR, e ele precisa ser provisionado no Secret Manager **antes** do deploy das functions.
Nenhum teste do emulador cobra isso, pelo mesmo motivo que nenhum teste cobrou os quatro
índices de grupo da frente anterior.

**A borda continua desligada.** O pedido de código é superfície pública, anônima e que dispara
e-mail. App Check e Cloud Armor não estão ligados, e isso já é item de CTO no painel. Não
bloqueia a fila, e entra na conta de quando o pacote subir.

## Onda A · O motor da credencial

### A1 · `S1229-T1` — o núcleo do código de seis dígitos ⚔
**Superfície:** `functions/src/auth/codigoDeAcesso.ts` (novo) · constantes em `packages/core`
**Depende de:** nada · **Bloqueia:** A2, A3, A4, A5 · **Rota:** opus

Geração com a entropia do sistema, seis dígitos decimais com zeros à esquerda preservados.
Digest `HMAC-SHA256(pepper, "<e-mail normalizado>:<código>")`, fail-closed sem pepper. Prazo de
dez minutos, uso único consumido em transação, teto de cinco tentativas por código com morte do
código ao esgotar, um código vivo por endereço com invalidação do anterior ao emitir, e
comparação com `timingSafeEqual`.

O limitador é o `consumirRateLimit` que já existe, com chave derivada do e-mail: 3 em 15
minutos e 10 em 24 horas. **Nenhuma chave por origem**, pela decisão já escrita no
`rateLimit.ts` — repetir o motivo ali evita que alguém a acrescente por reflexo depois.

**O ponto que a review tem de atacar:** o teto de tentativas fora da transação é decoração. Dois
pedidos simultâneos leem o mesmo contador e o milhão de combinações volta a estar ao alcance.
Segundo alvo: SHA-256 puro no lugar do HMAC parece equivalente e não é, e o argumento tem de
estar no arquivo, não só na spec.

**Testes:** teto respeitado sob concorrência; código expirado negado; código consumido negado;
emitir novo mata o anterior; digest não recupera o código sem o pepper; ausência de pepper
lança; zeros à esquerda sobrevivem à ida e à volta.

**Coleção nova:** `codigosDeAcesso`, sem `match` nas Rules, deny-by-default, no mesmo tratamento
que `rateLimits` recebe.

### A2 · `S1229-T2` — o nono e-mail do catálogo
**Superfície:** `functions/src/email/templates.ts` · `leela-specs/04-engenharia/catalogo-de-emails.md`
**Depende de:** A1 · **Bloqueia:** A3 · **Rota:** opus

Template com a moldura de `identidade.ts`, etiqueta própria na Brevo, assunto e corpo neutros.
O texto serve os quatro desfechos da RN-477 e não revela se existe conta. Entra no
`npm --prefix functions run email:render` junto dos outros oito, e o catálogo passa a listar
nove, com a linha de estado dizendo a verdade sobre produção.

**Testes:** o render não vaza o endereço em texto de assunto; o código aparece uma vez e não
vira link.

### A3 · `S1229-T3` — a callable que pede o código ⚔
**Superfície:** `functions/src/auth/solicitarCodigoDeAcesso.ts` (nova) · `packages/api-client`
**Depende de:** A1, A2 · **Bloqueia:** B2, B3 · **Rota:** opus

Recebe o endereço, consome o limitador, gera, grava, envia. **Nenhuma consulta a "existe
conta?"** antes de enviar, que é o que garante a indistinguibilidade de resposta e de tempo da
RN-477. Escreve o documento **antes** do envio e o mata quando o provedor recusa, devolvendo
erro explícito (RN-482). Sem provedor, recusa antes de começar.

**O ponto que a review tem de atacar:** qualquer ramo que só exista quando a conta existe é
oráculo, mesmo que a mensagem seja igual, porque o tempo difere. O ataque é medir a diferença
de latência entre endereço conhecido e endereço inventado, com amostra grande.

**Testes:** endereço com conta e endereço sem conta produzem a mesma resposta; provedor
recusando produz erro e documento morto, nunca sucesso; limitador estourado devolve a frase
única do `rateLimit.ts`.

### A4 · `S1229-T4` — a callable que consome o código, ramo de conta existente ⚔
**Superfície:** `functions/src/auth/confirmarCodigoDeAcesso.ts` (nova) · `packages/api-client`
**Depende de:** A1 · **Bloqueia:** A5, B2 · **Rota:** opus

Compara em tempo constante dentro da transação, consome, e então: define a senha pelo Admin
SDK, **carimba `emailVerified: true`** e devolve um token para a sessão nascer. É esse carimbo
que faz o código valer como prova de posse, e é ele que a Parte 6 da spec usa para destravar a
recomendação do POSSE-EMAIL-1.

A ordem da RN-453 é herdada e é aceite: senha primeiro, sessão depois. Um caminho que abrisse
sessão sem senha reprova a tarefa.

**O ponto que a review tem de atacar:** o token devolvido é credencial e a resposta que o
carrega tem de ser tão cuidada quanto o código. Segundo alvo: código errado, vencido, já usado,
inexistente e esgotado precisam ser **a mesma** negativa saindo daqui, e é fácil um deles
escapar com código de erro próprio.

**Testes:** as cinco causas devolvem a mesma coisa; senha definida e sessão nascendo na mesma
chamada; `emailVerified` verdadeiro depois da chamada e falso antes; consumo duplo do mesmo
código produz um sucesso e uma negativa.

### A5 · `S1230-T1` — o ramo de criação de conta, com consentimento ⚔
**Superfície:** `functions/src/auth/confirmarCodigoDeAcesso.ts` · `packages/core` (contrato)
**Depende de:** A1, A4 · **Bloqueia:** B3 · **Rota:** opus

Quando o endereço provado não tem conta, o **servidor** cria: conta no Auth já com
`emailVerified: true`, `atletas/{uid}` com o consentimento carimbado, e **desfaz a conta do Auth
se a gravação falhar** (RN-478). Convive com o gatilho `onCreateUser` por merge, sem
sobrescrever.

O contrato de entrada — nome, e-mail, senha e termo — vive no **core**, com validador puro, e é
o mesmo que o `/cadastrar` vai consumir. A lição do DEF-A da `ONBOARD-REV` vale inteira: régua
de tela mais frouxa que a do servidor produz conta órfã, e nenhuma régua nova nasce na tela. A
constante de versão do termo é a **da conta** (RN-466), compartilhada, nunca uma cópia.

**Dependência declarada e não bloqueante:** a fila da `SPEC-QUALIFICACAO`
(`../2026-08-04-qualificacao-profissional/03-fila-codigo.md`, onda A) mexe no mesmo módulo do
core. Se ela rodar primeiro, esta tarefa consome o contrato dela; se rodar depois, ela consome
o desta. O que não pode acontecer é as duas escreverem contratos paralelos, e é isso que o
**CONTA-2** do painel resolve de vez.

**O ponto que a review tem de atacar:** o desfazer. Falha na gravação com a conta do Auth já
criada é o caminho que produziu a conta órfã do organizador, e ele precisa estar provado, não
descrito. Segundo alvo: o carimbo de consentimento tem de vir do servidor, e aceite datado pelo
cliente precisa ser recusado (RN-446).

**Testes:** gravação falhando não deixa conta no Auth; consentimento com instante do cliente é
negado; conta criada nasce com papel `athlete` e nada além disso.

## Onda B · As telas

### B1 · `S1229-T5` — as duas portas terciárias no modal
**Superfície:** `apps/landing/app/components/EntrarOverlay.tsx` e o rodapé
**Depende de:** **a aterrissagem da `BUILD-MOTION`** · **Bloqueia:** B2, B3 · **Rota:** opus

Dois botões `variant="ghost" size="sm"` lado a lado, "É meu primeiro acesso" e "Criar conta",
navegando para as rotas da B2 e da B3. O "Não sei minha senha" permanece como link discreto
abaixo deles.

**A logo do modal não é desta tarefa.** Ela é da `BUILD-MOTION` e tocar nela aqui é retrabalho
garantido nas duas lanes. Esta tarefa acrescenta o rodapé e nada mais.

**Testes:** os dois botões existem com nome acessível próprio; nenhum deles troca o conteúdo do
diálogo; o `data-slot="abrir-entrar"` e o `data-slot="esqueci-minha-senha"` continuam onde as
suítes existentes os procuram.

### B2 · `S1229-T6` — a rota `/primeiro-acesso`, com o campo de código e a guarda de volta
**Superfície:** `apps/landing/app/(public)/primeiro-acesso/`
**Depende de:** A3, A4, B1 · **Bloqueia:** B3 · **Rota:** opus

A tela em duas etapas na mesma rota: pede o endereço, depois pede o código, com o endereço
visível e caminho para corrigi-lo. Os seis estados da tabela de estados da spec, com a mesma
frase para as cinco negativas do servidor e a contagem de tentativas restantes. Depois do
código aceito, o formulário de senha.

Aqui nascem os dois componentes compartilhados que a B3 reusa: o campo de código e a **guarda
do caminho de volta**. A guarda aceita apenas caminho relativo da própria origem, confere a
forma contra lista conhecida e cai na home diante de qualquer outra coisa.

`noindex`, `no-store` e `disallow`, no tratamento que `/minha-conta` recebeu. O campo de código
sem autopreenchimento, fora de log e fora da URL.

**O ponto que a review tem de atacar:** a guarda de volta é a superfície de risco nova das
telas — redirecionamento aberto logo depois de autenticar alguém é o clássico da categoria.

**Testes:** caminho absoluto externo no parâmetro cai na home; as cinco negativas produzem a
mesma frase na tela; o código não aparece em nenhuma URL renderizada.

### B3 · `S1230-T2` — a rota `/criar-conta`
**Superfície:** `apps/landing/app/(public)/criar-conta/`
**Depende de:** A3, A5, B1, B2 · **Rota:** opus

Mesmo motor, moldura própria: nome, e-mail, senha e o checkbox do termo nascendo desmarcado,
com a finalidade declarada. Reusa o campo de código e a guarda da B2.

Os dois desfechos cruzados da RN-477 acontecem aqui e na B2, e nenhum deles é erro na tela:
quem já tem conta e veio por esta rota define a senha e entra; quem não tem e veio pela B2
ganha o campo de nome. **Nenhuma frase dizendo "e-mail já cadastrado" pode existir no código.**

**Testes:** endereço com conta existente completa o fluxo sem mensagem de conflito; checkbox
desmarcado impede o envio; o validador do core é o mesmo do servidor.

## Onda C · A fronteira

### C1 · `S1230-T3` — a prova de que nenhuma porta cria conta profissional ⚔
**Superfície:** `functions/src/__tests__/` (novo caso) · **Depende de:** A5 · **Rota:** opus

A RN-480 diz que a fronteira é provada por teste, não presumida. O caso percorre as duas portas
e afirma o negativo: nenhum `profissionais/{uid}`, nenhum claim de tenant, nenhum
`platform_admin`, papel `athlete` e nada além.

É teste e é barato, e mesmo assim leva ⚔, porque teste de fronteira que passa por acidente é
pior que teste ausente.

### C2 · `S1230-T4` — a condição de e-mail verificado no ramo (b) de `ehCompradorDoPedido` ⚔ · **AUTORIZADA**
**Superfície:** `firestore.rules` e a suíte de Rules · **Depende de:** A4 · **Rota:** opus

Uma linha: `&& request.auth.token.email_verified == true` **só no ramo (b)** de
`ehCompradorDoPedido()`, o do vínculo por conta (`contaSemFriccao.contaUid`).

⛔ **O ramo (a) nunca.** O `responsavel.atletaId` é o uid da sessão **anônima** do checkout, que
por construção não tem `email_verified`; a condição ali quebraria a `S1225-T3`, que está **em
produção** e é a primeira metade do conserto de 04/08. O caso 6 da suíte da BUILD-A4 fica
vermelho se alguém mover a fronteira, e ele é o que reprova a tarefa se o ramo errado for
tocado.

**O gate caiu em 05/08.** O dono autorizou, verbatim: *"pode aplicar o POSSE-EMAIL-1 na mesma
onda."* O registro completo — exposição medida, correção exata e o argumento que destravou —
está em `01-decisoes-dono.md` §"Fechamento do POSSE-EMAIL-1". O que resta é dependência
técnica: **a C2 vai atrás da A4**, porque é o carimbo de `emailVerified` dela que faz esta
condição parar de tirar acesso de quem comprou e nunca verificou.

## O que não está nesta fila

**A logo do modal**, que é da `BUILD-MOTION`.

**A fusão do "Não sei minha senha" com "É meu primeiro acesso"**, que sob esta spec são a mesma
máquina e continuam sendo duas linhas por decisão explícita. Vira uma tarefa de uma linha se o
dono escolher fundir no **CONTA-1**.

**O redirecionamento do `/cadastrar` do painel para a porta nova**, e o rebatismo do botão
"Criar conta de organizador" do header, que dependem do **CONTA-2** e da fila da
`SPEC-QUALIFICACAO`.

**Login social por Google e Apple**, que já está escrito no `api-client` e sem tela nenhuma. É
o **QUALIF-5** do painel e não entra por carona aqui: seria uma terceira porta no mesmo modal,
na mesma semana, sem o dono ter pedido.

## Estado

**Nada executado.** Onda A com cinco tarefas, Onda B com três, Onda C com duas, **nenhuma
gated**. A B1 espera a `BUILD-MOTION` aterrissar. A C2 espera a A4, que é dependência técnica —
o gate do dono caiu em 05/08.
