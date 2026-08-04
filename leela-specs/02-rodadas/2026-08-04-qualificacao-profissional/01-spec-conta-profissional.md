---
tags: [leela, spec, rodada, onboarding, lgpd, qualificacao, identidade, painel-profissional]
trace: leela-build-2d6ee98d
lote: SPEC-QUALIFICACAO
data: 2026-08-04
---

# 01-spec · A conta profissional, a identidade e o Painel Profissional

> Três levas do dono no mesmo dia, e cada uma mexeu no desenho da anterior. A primeira pediu
> um formulário breve de qualificação e batizou o painel. A segunda tirou o CPF do formulário
> e transformou conta profissional em promoção de conta existente. A terceira definiu como se
> entra: e-mail ou CPF, mais login social por Apple e Google.
>
> Elas não são três ajustes. Somadas, elas redesenham a porta de entrada inteira do produto, e
> a spec foi escrita sobre as três juntas em vez de empilhar remendos.
>
> Zero código. Toda afirmação foi medida no repositório e o caminho está citado. **Uma
> premissa do dono foi falsificada e uma armadilha de identidade foi encontrada antes de virar
> código.** As duas estão em destaque, porque construir por cima delas em silêncio seria o
> erro mais caro desta rodada.

## O que o dono pediu

**Leva 1, verbatim:**

> "no workflow de cadastro do organizador, (como organizador), colocamos esse termos.
> Inclusive, como está esse onboarding? Quais informações pegamos? Vejo que é legal termos um
> breve formulário de qualificação. Chamaremos também o nosso painel de Painel Profissional.
> Para entrar e fazer o acesso, perguntaremos se a pessoa é profissional de bem-estar, (qual),
> organizador de eventos, quais modalidades a pessoa trabalha, tamanho de eventos, telefone de
> contato, CPF ou CNPJ e nome."

**Leva 2, verbatim:**

> "sobre o CNPJ ou CPF, quero rever. Por exemplo, só pode criar uma conta profissional, quem
> tem uma conta na Leela. Então já temos o CPF da pessoa. O que podemos colocar no painel
> profissional, é perguntar se a pessoa tem CNPJ. e se tiver, pedir, para criar o painel."

**Leva 3, verbatim:**

> "A cheers tem um bom fluxo de referência. E-mail ou CPF, para se cadastrar. Com a opção de
> login social, sendo Apple ID ou gmail."

Ele frisou **breve** na primeira e não retirou a palavra nas outras duas. Ela é restrição de
desenho, não recomendação, e aparece como critério em cada decisão abaixo.

**Ambiguidade que sobe ao painel, não vira premissa:** "fluxo de referência" tem duas
leituras. A natural, no contexto da frase, é *fluxo de exemplo*, algo que vale copiar a
decisão. A outra é *programa de indicação*, o "indique um amigo". As duas são gramaticais e a
segunda seria um épico inteiro que ninguém pediu. Está no painel como **QUALIF-4** em vez de
ser decidida por conta própria.

## Parte 1 · O que o sistema faz hoje

### O formulário da porta, campo a campo

`/cadastrar` (`apps/painel/src/routes/conta/auth/CadastrarPage.tsx`) coleta seis entradas e
uma caixa de seleção: nome, e-mail, telefone, nome da organização, senha e confirmação, mais
o consentimento LGPD. O contrato dos dados vive no core
(`packages/core/src/platform/cadastroOrganizador.ts:63-73`) e a senha nunca transita por ele,
vai direto ao Auth.

O mesmo validador puro roda em três lugares: a tela, a Rule de criação do doc e a Function de
resgate do convite. Essa unificação foi conquistada no fix DEF-A da ONBOARD-REV, e não pode
ser desfeita por acréscimo de campo só na tela.

Contando o que a pessoa efetivamente preenche, a porta já tem **sete interações**. É o número
que a palavra "breve" tem de enfrentar.

### Os três provedores de entrada existem, e nenhuma tela os usa

Medido, porque o brief pediu confirmação. `packages/api-client/src/auth.ts` declara os três:
e-mail e senha, Google (`GoogleAuthProvider`, `:47-48`) e Apple (`OAuthProvider('apple.com')`,
`:56-58`). Os dois sociais são exportados como `loginComGoogle` e `loginComApple`
(`:146`, `:163`) e reexportados do pacote (`packages/api-client/src/index.ts:409-410`).

**Consumidores em tela: zero.** Uma varredura por `loginComGoogle`, `loginComApple`,
`signInWithPopup`, `GoogleAuthProvider` e `OAuthProvider` em `apps/painel/src` e
`apps/landing` devolve apenas o pacote de build do Next, nenhum arquivo-fonte. O login social
existe na camada de API e não existe na interface.

O Apple carrega pendência declarada no próprio cabeçalho do arquivo (`auth.ts:9-13`): exige
Apple Developer Account com App ID e Service ID, chave `.p8` registrada no Console e
verificação de domínio. Sem isso o método lança `auth/invalid-oauth-provider`. Não é código a
escrever, é conta a abrir, e conta a abrir é do dono.

### Onde nasce uma conta na Leela

Três caminhos, e só um deles é um formulário:

| Caminho | O que a conta ganha | Tem CPF? |
|---|---|---|
| `/cadastrar` do painel | conta Auth + `profissionais/{uid}` + `atletas/{uid}` | **não** |
| Compra confirmada (`contaSemFriccao.ts:165-168`) | conta Auth sem senha + vínculo `pessoas/{ref}.contaUid` | sim, se houve CPF de pagador |
| `provisionTenant`, caminho manual do super-admin | conta Auth já elevada, sem doc de atleta (`onCreateUser.ts:88-95`) | **não** |

A landing **não tem rota de autenticação nenhuma**. Todo login do produto acontece no painel,
e o único formulário de criação de conta que existe é o do organizador.

### Onde o CPF vive, e quem alcança

O CPF do comprador é coletado no checkout, validado com dígito verificador
(`packages/core/src/eventos/dadosPessoais.ts:74`) e normalizado antes de persistir. Ele acaba
em dois lugares, **os dois em claro**:

1. `pessoas/{cpf_hmac32}.cpf` — o registro global de identidade. O docId é HMAC-SHA256 com o
   pepper de operação sobre `pessoa:cpf:{cpf}` (`functions/src/checkout/pessoaRegistry.ts:61`),
   então o caminho não carrega PII, mas o documento carrega, e a Function recupera. A Rule é
   `read, write: if false` para todo cliente (`firestore.rules:2557-2559`), inclusive
   `platform_admin`.
2. `eventos/{e}/inscritos/{id}.dadosPessoais.cpf` — condicional, só quando há nascimento,
   gênero ou telefone junto (`functions/src/checkout/createInscricaoCharge.ts:1627-1643`).

O CRM não guarda CPF: deriva o docId por hash, e a minimização está declarada no módulo
(`packages/core/src/crm/cliente.ts:18`). O CPF vai ao Asaas como `taxId`
(`createInscricaoCharge.ts:1940-1942`), onde o gateway o exige e recusa a cobrança sem ele
(`functions/src/payments/asaasProvider.ts:1086-1089`).

**Não existe cifra de CPF em lugar nenhum do repositório.** O `BANK_DATA_KEY` cifra
exclusivamente `{ conta, pix }` (`functions/src/finance/cifraDadosBancarios.ts:76-79`), em
AES-256-GCM com o `tenantId` como dado autenticado. Esse detalhe decide a Parte 5.

### O documento do profissional já é pedido, e já foi decidido que não se guarda

Isto não estava no brief e muda a pergunta. **O organizador já informa CPF ou CNPJ hoje**, no
cadastro de recebimento (`functions/src/finance/saveDadosBancarios.ts`), e o produto
deliberadamente **não retém o número**. Guarda só a máscara (`:162`), e a decisão está escrita
na ADR-014:

> CPF/CNPJ completo (NÃO é armazenado em lugar nenhum — só mascarado; minimização LGPD: o
> admin confere o favorecido por titular + final do documento).

Duas lacunas reais, achadas no caminho. Esse `cpfCnpj` **não passa por dígito verificador**: o
validador conta 11 ou 14 dígitos e aceita (`saveDadosBancarios.ts:136-144`), e o formulário do
painel também não confere (`apps/painel/src/routes/conta/recebimento/DadosBancariosForm.tsx:137-138`).
E o produto **não tem noção nenhuma de pessoa jurídica**: uma varredura por `tipoPessoa`,
`pessoaJuridica` e `companyType` devolve zero fora de `node_modules`.

### Quem lê o documento do profissional

`profissionais/{profId}` é lido por três públicos (`firestore.rules:2790-2800`):

```
allow read: if (isSignedIn() && request.auth.uid == profId)
            || (isSignedIn() && isTenantMember(resource.data.tenantId))
            || isPlatformAdmin();
```

O dono do uid, **qualquer membro do mesmo tenant** e o administrador de plataforma. Membro do
tenant inclui staff, promoter e um token de atleta que carregue aquele `tenantId` no claim. O
shape do auto-cadastro é fechado por `hasOnly` e não tem campo de documento
(`firestore.rules:2762-2765`).

Rules do Firestore não filtram campo. Um `cpf` ou `cnpj` gravado como campo desse documento
passa a ser legível por todo o tenant no mesmo instante em que é escrito. É a mesma armadilha
que a RN-417 já teve de desfazer uma vez.

### O que a casa já construiu e ninguém precisa reescrever

Cinco peças prontas. A diretriz de reaproveitamento manda inventariar antes de codar:

| Peça | Onde | O que resolve |
|---|---|---|
| `validarDocumento` | `packages/core/src/assessoria/documento.ts:125` | CPF **e CNPJ** com dígito verificador oficial, normalização, tipo por comprimento e formatação |
| `MODALIDADES_CLUBE` | `packages/core/src/clubs/clube-opcoes.ts:41` | vocabulário fechado de nove modalidades, já com "Bem-estar/Yoga" |
| `mascararCpfCnpj` | `functions/src/finance/cifraDadosBancarios.ts:181` | máscara canônica do documento |
| `consumirRateLimit` + `hashChave` | `functions/src/shared/rateLimit.ts:82`, `:58` | janela deslizante já usada pelo resgate de convite (`resgatarConviteOrganizador.ts:219`) |
| `pessoaDocIdDoCpf` | `functions/src/checkout/pessoaRegistry.ts:61` | identidade determinística por CPF, com pepper e domínio próprio |

O `documento.ts` é o único validador de CNPJ do produto. Nenhuma linha nova de dígito
verificador se justifica nesta rodada.

## Parte 2 · Identidade: credencial, conta e pessoa

A leva 3 obriga a separar três coisas que o produto vinha tratando como uma. Confundi-las é a
origem das duas armadilhas desta spec.

| Camada | O que é | Quantas por pessoa | Onde vive |
|---|---|---|---|
| **Credencial** | como você prova que é você | **várias**: senha, Google, Apple | Firebase Auth |
| **Conta** | a sessão e as permissões | **uma** | uid do Auth, claims |
| **Pessoa** | o ser humano, univocamente | **uma** | `pessoas/{cpf_hmac32}` |

O produto já construiu a terceira camada e ela está certa. `pessoas/{id}` tem docId
determinístico derivado do CPF, então dois checkouts com o mesmo CPF colidem no mesmo
documento por construção, e colisão significa mesma pessoa
(`packages/core/src/pedidos/pessoa.ts:7-11`). Isso é o padrão de unicidade estrutural que a
casa já usa no `@handle` e no cupom: empurrar o invariante para a chave e deixar o banco
garantir.

O que falta é a ponte entre as camadas 1 e 2 quando o login social entrar.

### A armadilha do Apple ID, medida e nomeada

> **⚠️ Achado.** Ligar o login social hoje, sem tratar vinculação de conta, produz pessoas com
> duas contas e uma delas cega para as próprias compras. Permanentemente.

A cadeia, passo a passo, cada elo com evidência:

1. O recurso "Ocultar meu e-mail" da Apple entrega um endereço de relay em
   `@privaterelay.appleid.com`, diferente do e-mail real da pessoa.
2. A conta sem fricção resolve o comprador **por igualdade de e-mail**:
   `getUidPorEmail(email)` e, se não existir, `criarConta` (`contaSemFriccao.ts:165-168`).
3. O vínculo `pessoas/{ref}.contaUid` é **first-claim com escritor único e nunca é
   sobrescrito**, por decisão anti-hijack da RN-174 (`contaSemFriccao.ts:194-207`).

Junte os três. Maria compra com `maria@gmail.com`, ganha a conta A e o vínculo
`pessoas/{cpf_maria}.contaUid = A`. Depois ela entra com Apple ocultando o e-mail, e o
Firebase cria a conta B, com outro endereço. A conta B nunca vai reivindicar a pessoa dela,
porque o first-claim recusa, e a recusa é silenciosa. Maria entra pela Apple e **não vê compra
nenhuma**, para sempre, sem mensagem de erro em lugar algum.

O anti-hijack está certo e não deve ser afrouxado. O que falta é o caminho de vinculação que
ele pressupõe e que ninguém construiu.

**Uma verificação que não pode ser presumida.** O Firebase tem a configuração "vincular contas
que usam o mesmo endereço de e-mail" no Console, e o comportamento do Google contra uma conta
de senha existente depende dela. O estado dessa chave não é legível do repositório. É passo de
conferência da fila, no mesmo molde da conferência de Authorized Domains que a SPEC-ADMINSEP
já declarou, e não é suposição desta spec.

### A regra de vinculação, e por que ela não pode ser automática

A tentação é resolver por merge automático: mesma pessoa, junta as contas. Isso abriria um
sequestro trivial, porque bastaria informar o CPF de outra pessoa para herdar as compras dela.

**A vinculação exige posse da outra credencial.** Quando uma conta autenticada informa um CPF
cuja pessoa já pertence a outro uid, o produto não junta e não recusa em silêncio. Ele oferece
o caminho: entrar pela credencial que já detém aquela conta, e a partir de lá adicionar a nova
credencial à conta existente, que é a operação nativa de linking do Auth. Uma pessoa, uma
conta, várias formas de entrar.

E a resposta é **uniforme**. Dizer "esse CPF já pertence a outra conta" transformaria o campo
num oráculo de quem tem conta na Leela, e CPF é adivinhável. A mensagem é a mesma quando o
CPF está tomado e quando o vínculo falha por qualquer outro motivo, no molde que o
`authErrors.ts` já pratica no login e na recuperação de senha. Some-se o `consumirRateLimit`
que o resgate de convite já usa, com a mesma janela deslizante.

## Parte 3 · A porta deixa de ser cadastro e vira promoção

### O que a leva 2 troca

"Só pode criar uma conta profissional quem tem uma conta na Leela" transforma o `/cadastrar`
em outra coisa. Hoje ele cria a conta **e** declara a pessoa organizadora no mesmo passo. Sob
a regra nova, são dois momentos: primeiro alguém tem conta na Leela, depois essa conta vira
profissional.

Isso encaixa com o que a SPEC-ADMINSEP já especificou sem saber que encaixaria. Lá, o botão
"criar conta de organizador" na área do cliente termina com o doc `profissionais/{uid}` em
`statusOnboarding: 'aguardando_convite'` e a pessoa no overlay bloqueante. Sob a leva 2 esse
botão deixa de ser atalho conveniente e vira **o caminho**, único e canônico.

Encaixa também com a conta sem fricção. Quem compra ganha conta automaticamente na
confirmação do pagamento, sem nunca ter preenchido formulário, e já satisfaz a pré-condição do
dono. Um comprador vira profissional sem jamais ter visto uma tela de cadastro, e o desenho
tem de suportar isso de saída.

### A circularidade que a regra cria

Se conta profissional exige conta prévia, e o único formulário de criação de conta é o do
organizador, a regra se morde. Quem nunca comprou nada e quer ser profissional não tem por
onde entrar.

| # | Saída | Custo | Veredito |
|---|---|---|---|
| A | `/cadastrar` deixa de ser "conta de organizador" e vira **criar conta na Leela**: nome, e-mail, senha e o termo, mais os dois botões sociais. Telefone e organização migram para a promoção | Baixo. Tira dois campos, muda título e texto do termo, e liga dois provedores que já existem no pacote | **Adotado.** Única saída que serve os dois públicos com uma tela só, e ela fica **mais curta** |
| B | Criar uma segunda tela de cadastro de participante na landing | Médio. Rota nova e duas telas que fazem a mesma coisa | Recusado. Duplicação sem ganho |
| C | Manter o `/cadastrar` como está e aceitar profissional cadastrado por fora da regra | Zero | Recusado. Revoga a frase do dono em silêncio |

A saída A tem um efeito colateral que joga a favor. A porta cai de sete interações para
quatro, e o formulário de qualificação nasce onde não disputa conversão com nada: quem chega
ali já tem conta e já decidiu ser profissional.

**Verificação feita antes de propor:** o resgate do convite lê `organizacao` do doc
`profissionais/{uid}` (`functions/src/platform/resgatarConviteOrganizador.ts:250`), não do
formulário, e já tem cadeia de fallback para nome e e-mail quando o campo falta (`:197`). Mover
a organização do cadastro para a promoção **não quebra a semente do slug do tenant**.

### Onde a qualificação roda

O dono disse "para entrar e fazer o acesso". Sob a arquitetura nova a frase deixa de ser
ambígua: o momento de fazer o acesso profissional é a promoção, e a promoção é o formulário de
qualificação. **Não são dois passos, são o mesmo passo.**

Isso resolve a tensão com "breve" por construção. A qualificação não é um questionário enfiado
no meio de um cadastro; ela é o próprio ato de virar profissional.

O overlay bloqueante da S1609 continua depois, intacto. Preencheu a qualificação, o documento
nasce em `aguardando_convite` e a pessoa encontra o overlay pedindo o código. A qualificação
**não substitui o convite** e não afrouxa o go-live controlado. Ela informa quem está pedindo
entrada, que é o que faltava para o time decidir a liberação com algo além do nome da
organização.

## Parte 4 · A premissa do CPF, falsificada, e o que a leva 3 muda

> **⚠️ Falsificação.** "Então já temos o CPF da pessoa" é verdade para uma fração das contas, e
> é falsa justamente para a fração que vai virar profissional.

1. **Conta criada pelo `/cadastrar` não tem CPF em lugar nenhum.** O doc `atletas/{uid}` nasce
   com `{ id, nome, email, avatarInit, criadoEm }` (`functions/src/auth/onCreateUser.ts:102-108`).
   O doc `profissionais/{uid}` tem shape fechado por `hasOnly` sem campo de documento
   (`firestore.rules:2762-2765`). As claims carregam `role`, `tenantId`, `demotedFromRole` e
   `eventos`, e nada mais (`packages/core/src/platform/roles.ts:35-55`). O Auth não guarda CPF.
2. **O CPF só existe quando houve compra confirmada.** O vínculo tem escritor único, e o
   escritor roda depois da confirmação do pagamento. Pedido não pago aborta em
   `contaSemFriccao.ts:143`.
3. **Mesmo tendo comprado, ler o CPF de volta é gated por três condições.** O leitor exige
   e-mail verificado e igual ao carimbo `contaEmail`
   (`functions/src/checkout/prefillCheckout.ts:92-95`), e **a conta sem fricção nasce não
   verificada**.
4. **O CPF gravado é o do responsável-inscrito, não necessariamente o do pagador**
   (`contaSemFriccao.ts:177-179`). Quem compra para a família sem se inscrever fica sem
   vínculo, limitação já documentada no arquivo.

A população com CPF conhecido e alcançável é "quem comprou, pagou, se inscreveu, definiu senha
e verificou o e-mail". A população que a regra nova mira tipicamente **não comprou nada**. Um
professor de ioga que quer vender a própria aula não passou pelo checkout de ninguém.

### A leva 3 quase conserta a premissa, e o login social a quebra de novo

Se o CPF virar identificador de cadastro, toda conta nasce com CPF e a premissa passa a valer.
Mas a mesma frase do dono liga Google e Apple, e **nenhum provedor social devolve documento**.
Os dois devolvem e-mail e nome. Uma conta criada por Apple nasce sem CPF por construção, e o
caso "profissional sem CPF conhecido" reabre no mesmo instante em que seria fechado.

Não há, portanto, um ponto único onde o CPF possa ser garantido. A conclusão que sobra é a que
esta spec adota:

**O CPF é pedido uma vez, no primeiro momento em que ele faz trabalho, e nunca antes.** Não
existe um lugar que sirva a todos os caminhos, então existe um lugar por caminho, e todos
convergem para a mesma pessoa.

| Caminho | Onde o CPF entra |
|---|---|
| Comprou primeiro | checkout, que já pede e já valida com dígito verificador |
| Virou profissional sem ter comprado | **a promoção**, no campo condicional que só aparece quando a pessoa ainda não tem pessoa vinculada |
| Só navega e nunca comprou nem promoveu | nunca, e está certo assim |

### Por que o CPF cabe na promoção, e por que isso não é preciosismo

O dono acertou tirando o CPF da porta do cadastro. Errou o motivo, e o motivo certo importa:
**o CPF não sai da porta porque já o temos; sai porque na porta ele ainda não trabalha.**

Na promoção ele trabalha, e por três razões concretas. A pessoa passa a poder receber dinheiro.
Ela passa a poder aparecer numa vitrine pública. E o time vai decidir se libera o acesso dela,
o que é decisão sobre um futuro contratante. Saber quem a pessoa legalmente é integra essa
decisão, e isso é procedimento preliminar de contrato, não curiosidade.

Ele também dedupe. O CPF informado na promoção resolve `pessoas/{cpf_hmac}` e liga a conta ao
histórico que já existir, o que é exatamente o que a leva 3 quer: a pessoa nunca fica com duas
identidades.

**Consequência para o cadastro de recebimento:** ele para de pedir o documento e passa a
**pré-preencher** a partir do registro de pessoa, no molde do `getCheckoutPrefill`. Pedir duas
vezes o mesmo documento ao mesmo profissional é a definição de fricção inútil.

## Parte 5 · CPF e CNPJ, onde cada documento mora

### São dois documentos, e eles não têm a mesma natureza

O CPF identifica a **pessoa**. O CNPJ identifica a **entidade sob a qual ela opera**. A mesma
pessoa pode operar como física hoje e jurídica amanhã, e pode ter CNPJ sem deixar de ter CPF.
Tratá-los como um campo só, "CPF ou CNPJ", é o que produz a impossibilidade de responder
depois quem é o titular de um repasse.

Por isso os dois moram em lugares diferentes, e o lugar de cada um decorre do que ele
identifica:

| Documento | Onde | Rule | Por quê |
|---|---|---|---|
| CPF | `pessoas/{cpf_hmac32}.cpf`, onde já vive | `read, write: if false` para todo cliente (`firestore.rules:2557-2559`) | é a pessoa, e a pessoa já é canônica ali |
| CNPJ, número | `profissionais/{uid}/documentoSecret/current` | `read: if isSignedIn() && request.auth.uid == profId`; escrita negada a cliente | é da conta profissional, não da pessoa |
| CNPJ, máscara | `profissionais/{uid}.documentoMascarado` | a Rule do doc pai, que o tenant lê | a equipe precisa conferir o favorecido, não o número |
| Tipo de pessoa | `profissionais/{uid}.tipoPessoa` | a Rule do doc pai | enum de dois valores, não identifica ninguém |

O subdocumento de leitura restrita não é invenção desta spec. `profissionais/{profId}/marcas`
já usa exatamente essa Rule (`firestore.rules:2876`), e `dashboard` também (`:2815`). O par
"completo no doc restrito, mascarado no doc de superfície ampla" é o que o
`cadastrarAssessoria` faz com o CPF/CNPJ do parceiro
(`functions/src/assessorias/cadastrarAssessoria.ts:352-355`), com o comentário registrando a
razão. São três precedentes, e o desenho aqui é o quarto uso de um padrão da casa.

### Cifrar, não. E o motivo importa

O brief perguntou se o documento do profissional fica em claro ou cifrado como o bancário. A
resposta é que a pergunta compara duas coisas diferentes.

O `BANK_DATA_KEY` cifra `{ conta, pix }` porque conta bancária e chave PIX são **instrumentos
de movimentação**: com eles se move dinheiro. Um CNPJ é dado que a Receita publica. Um CPF não
é público, mas também não movimenta nada sozinho. Cifrar aqui somaria gestão de chave, rotação
de versão, um caminho de decifra novo e um modo de falha novo, e compraria proteção contra um
risco que a Rule owner-only já cobre. Seria imitar a forma da solução bancária sem herdar o
problema que a justificou.

### O que muda entre pessoa física e jurídica

Medido, não suposto: **hoje não muda nada**, porque o produto não tem noção de pessoa
jurídica. O `cpfCnpj` do recebimento aceita 11 ou 14 dígitos sem ramificar
(`saveDadosBancarios.ts:136-144`), e o Asaas recebe `cpfCnpj` só na criação do cliente pagador
(`asaasProvider.ts:1094`). Subconta de recebedor não existe: `splitRules` está declarado como
não suportado (`asaasProvider.ts:1603-1612`) e o repasse na V1 é manual, por RN-356. **Nada
hoje exige CPF ou CNPJ do profissional para que ele receba.**

Então a virada de física para jurídica, hoje, é a troca de um campo, e a spec fixa que ela
**continue barata**: `tipoPessoa` é editável na conta, a troca sobrescreve o documento
mascarado junto, e nada de histórico é reescrito. O limite conhecido fica registrado: quando
existir emissão fiscal, a virada vai exigir corte por data, porque documento fiscal emitido
não muda retroativamente. Esse é o momento de voltar a este arquivo.

### O que a pergunta do dono vira, na prática

Ele quer "perguntar se a pessoa tem CNPJ, e se tiver, pedir". A spec adota a frase quase
literalmente, com uma correção de vocabulário que não é cosmética: a pergunta não é se a
pessoa **tem** CNPJ, é se ela **vai operar** como pessoa jurídica na Leela. Muita gente tem
CNPJ de outra atividade e vai operar como física aqui. A pergunta errada colhe o dado errado.

## Parte 6 · Quem não tem CPF

**Leva 4, verbatim:**

> "mas a regra pode ser se a pessoa for brasileira pegar CPF, e se for gringa, informar o
> documento (passaporte)."

### Isto já foi decidido, e a spec estende em vez de reabrir

A ideia não é nova no projeto e não deve ser especificada do zero. Ela já é regra registrada,
em três peças que se encaixam:

| RN | Onde | O que já cravou |
|---|---|---|
| **RN-175** | E04, `LEELA-E04-config-vendas.md:60` | toggle **por evento** "aceitar inscrição de estrangeiros", default OFF. Com o toggle desligado nada muda e o CPF segue exigido (`:1449`) |
| **RN-176** | E12, `LEELA-E12-landing.md:97` | o checkout pergunta a nacionalidade; estrangeiro usa **passaporte**, o CPF fica oculto, e o pagamento é **cartão internacional à vista**, sem PIX, sem boleto, sem parcelamento |
| **RN-177** | E19, `LEELA-E19-crm.md:38` | o registry de pessoas passa a chavear por **documento tipado**, e "CPF único" **generaliza** para "documento único". História `S1903`, marcada *especificar sem implementar* |

O que o dono pede agora é elevar o passaporte de paliativo de inscrição a **regra do modelo de
identidade**. As três RNs já sustentam isso. O que falta, e é o que esta parte entrega, são as
três pontas que a RN-177 deixou em aberto de propósito: a derivação exata da chave, o que
fazer sem dígito verificador, e o desenho de menor atrito no formulário.

**Estado do código: nada disso existe.** Uma varredura por `passaporte`, `estrangeiro` e
`documentoEstrangeiro` em `packages/core/src`, `functions/src`, `apps/landing/app` e
`apps/painel/src` devolve zero ocorrências. É spec pura, como a S1903 mandou.

### A chave já reservou o espaço, e ninguém migra nada

> **Achado que vale a parte inteira.** A derivação de hoje **já carrega o tipo do documento**,
> e por isso a extensão custa zero migração.

O docId é `cpf_{HMAC-SHA256(pepper, "pessoa:cpf:{cpf11}")[0:32]}`
(`functions/src/checkout/pessoaRegistry.ts:61-68`). O texto assinado não é o CPF cru: é
`pessoa:cpf:{cpf}`, com o tipo embutido no domínio da mensagem. Quem escreveu já separou o
espaço de nomes.

A extensão, portanto, é aritmética e não cirurgia:

| Tipo | Domínio assinado | Prefixo do docId |
|---|---|---|
| CPF | `pessoa:cpf:{11 dígitos}` | `cpf_` (`PESSOA_ID_PREFIXO_CPF`) |
| Passaporte | `pessoa:passaporte:{ISO-3166-1 alpha-2}:{número normalizado}` | `pass_` |

Três consequências, e as três são boas:

1. **Nenhum id existente muda.** O domínio `pessoa:cpf:` continua produzindo exatamente os
   mesmos digests. Quem já está no registro fica onde está, bit por bit. A resposta a "o que
   acontece com quem hoje já está no registro" é: nada, e isso é verificável reexecutando a
   função.
2. **Documentos de tipos diferentes nunca colidem**, que é o critério de aceite literal da
   S1903. Colidir exigiria colisão de HMAC-SHA256 sobre domínios distintos.
3. **O país entra na chave, não ao lado dela.** Passaporte `A1234567` da Argentina e
   `A1234567` de Portugal são duas pessoas, e precisam ser dois documentos. Deixar o país fora
   da chave fundiria as duas em silêncio.

A normalização do número é definida aqui porque sem ela a chave determinística não é
determinística: maiúsculas, e só caracteres alfanuméricos, descartando espaço, hífen e ponto.
Passaporte é alfanumérico e a máscara varia por país.

### Passaporte não tem dígito verificador, e a spec não finge que tem

CPF e CNPJ se autovalidam. Passaporte não: o formato varia por país emissor, não existe
algoritmo universal, e a Leela não vai integrar base consular. **Consequência direta: erro de
digitação vira pessoa nova, em silêncio.** Duplicata no registro, duplicata no CRM, e o
controle de inscritos deixando entrar duas fichas para o mesmo ser humano.

O tratamento tem três camadas, e nenhuma delas promete o que não dá:

1. **País emissor obrigatório**, de lista fechada ISO 3166-1 alpha-2. Reduz o espaço de
   colisão e é dado que a operação precisa de qualquer forma.
2. **Confirmação dupla do número no formulário**, o campo repetido que não aceita colar. É a
   mitigação padrão de quem não tem dígito verificador, e custa um campo que só aparece para
   quem não tem CPF.
3. **Tolerar a duplicata em vez de negá-la.** O registro aceita, e a fusão é operação
   administrativa posterior, com trilha. Bloquear na entrada seria pior: recusaria um
   passaporte legítimo que por acaso se parece com outro.

**O que não dá para garantir, dito com todas as letras:** unicidade real de pessoa por
passaporte. A plataforma garante unicidade de *documento informado*, não de *ser humano*. Duas
grafias do mesmo passaporte são duas pessoas para o sistema até que alguém funda as duas. Isso
é limitação do dado, não do desenho, e escondê-la produziria um CRM em que ninguém confia.

Um atenuante real, e é por isso que o risco é aceitável na V1: o caminho inteiro está atrás do
toggle por evento da RN-175, que nasce desligado. É superfície estreita e volume baixo.

### O passaporte resolve a inscrição, não resolve o pagamento

> **⚠️ Precisa estar escrito, para ninguém prometer uma jornada que trava no checkout.**

O Asaas **exige** CPF ou CNPJ para cobrar. O `resolverCliente` lança
`AsaasValidationError` quando o `taxId` vem vazio
(`functions/src/payments/asaasProvider.ts:1086-1089`), e o campo vai como `cpfCnpj` tanto na
busca quanto na criação do cliente (`:1094`, `:1106`). Passaporte não entra nesse campo.

É exatamente por isso que o **item 12b** existe no painel do dono, adiado por ele em 26/07: a
liberação de cobrança para cartão emitido no exterior depende de contato com o gerente de
contas do Asaas, leva cerca de seis dias úteis, cobre só cartão internacional, e **não cobre
parcelamento nem link de pagamento**. Nada disso foi pedido ainda.

Então a fotografia honesta é esta:

| Jornada | Funciona hoje? |
|---|---|
| Estrangeiro se inscreve com passaporte, **comprador brasileiro paga por ele** | **Sim**, é o paliativo de custo zero já registrado no item 12b, e não toca a RN-173 |
| Estrangeiro se inscreve **e paga** com cartão internacional | **Não**, e não vai funcionar até a liberação do item 12b sair |
| Estrangeiro paga com PIX, boleto ou parcelado | **Não**, e não vai funcionar nem depois da liberação |

A spec do modelo de identidade pode entrar antes da liberação, porque ela é modelo e não
cobrança. A **tela** de checkout de estrangeiro não pode, e continua onde a RN-176 a deixou:
lote `ESTRANGEIRO-CHECKOUT`, gated por ação externa do dono.

### O desenho de menor atrito, e por que ele refina a RN-176

A RN-176 diz que o checkout "pergunta a nacionalidade". Lida ao pé da letra, isso põe uma
pergunta na frente de todo mundo para servir uma minoria, e o dono pediu **breve**.

**Proposta: o campo de documento nasce CPF, com uma saída discreta.** Um link de texto abaixo
do campo, "não tenho CPF", que troca o campo por passaporte mais país emissor mais
confirmação. Ninguém responde nacionalidade; quem não tem CPF clica uma vez.

Três razões, e a terceira é a que decide:

1. A esmagadora maioria é brasileira. Cobrar um passo de 100% para servir uma fração é imposto
   regressivo de formulário.
2. A pergunta "qual sua nacionalidade" não é a pergunta certa. Um brasileiro naturalizado tem
   CPF, um estrangeiro residente também. **O que o sistema precisa saber não é de onde a
   pessoa é, é qual documento ela tem.** Perguntar nacionalidade colhe o dado errado e ainda
   força a pessoa a se classificar.
3. O link só aparece quando o toggle da RN-175 está ligado naquele evento. Com o toggle
   desligado, que é o default, a tela é exatamente a de hoje e nada muda.

Isso é refino da leitura de UI da RN-176, não revogação dela: a regra continua sendo
"estrangeiro usa passaporte, CPF oculto, cartão à vista". Muda como se chega lá. Fica
registrado como premissa vetável, porque a RN carrega verbatim do dono.

### Profissional estrangeiro: fora do escopo, e o motivo não é o formulário

Um profissional estrangeiro é possível de imaginar e **não entra nesta rodada**. O bloqueio não
é a identidade, que o documento tipado já resolveria. É o dinheiro.

`saveDadosBancarios` valida o documento do titular por comprimento, aceitando 11 ou 14 dígitos
(`functions/src/finance/saveDadosBancarios.ts:136-144`). Passaporte não tem 11 nem 14 dígitos e
não é numérico. Antes disso, o repasse na V1 é transferência manual para conta bancária
brasileira (RN-356), e conta bancária brasileira pressupõe CPF ou CNPJ de qualquer forma.

Ou seja: aceitar um profissional estrangeiro no formulário produziria alguém que consegue criar
evento, vender ingresso e **nunca conseguir sacar**. Isso é pior que recusar na porta.

**Vira item de fila, com a dependência declarada:** profissional estrangeiro depende de uma
decisão de recebimento internacional que ninguém tomou e que o produto não tem. O campo de
documento da promoção, portanto, aceita **só CPF** nesta rodada, e a mensagem de recusa diz a
verdade em vez de inventar um erro de formato.

## Parte 7 · O formulário, campo a campo

Duas telas, e as duas ficam mais curtas do que a única tela de hoje.

### Tela 1 · Criar conta na Leela (`/cadastrar`, reescopada)

| Campo | Obrigatório | Origem |
|---|---|---|
| Continuar com Google / Continuar com Apple | alternativa ao resto | provedores já existem, faltam os botões |
| Nome | sim | já existe |
| E-mail | sim | já existe |
| Senha e confirmação | sim | já existe |
| Termo de uso e privacidade | sim, nasce desmarcado | já existe, texto muda (Parte 7) |

Saem telefone e nome da organização, que migram para a promoção. A tela deixa de se chamar
"Criar conta de organizador". Quem entra por Google ou Apple pula tudo menos o termo, que
continua obrigatório e passa a ser exibido na própria tela antes do botão social, não depois.

**O CPF não entra aqui.** A leva 3 admite lê-lo como identificador de cadastro, e a Parte 4
explica por que ele não sobrevive a essa leitura: o login social não o entrega, então um campo
de CPF na porta seria obrigatório para uns e impossível para outros. A escolha entre as duas
leituras é do dono e está no painel como **QUALIF-2**.

### Tela 2 · Tornar-se profissional (a qualificação)

Ordem deliberada: primeiro quem a pessoa é, depois o que ela faz, o contato por último.

| # | Campo | Tipo | Obrigatório | Racional |
|---|---|---|---|---|
| 1 | Atuação | duas caixas, **acumuláveis**: "sou profissional de bem-estar" e "organizo eventos" | pelo menos uma | quem organiza também pratica; exclusividade produziria dado falso |
| 2 | Qual profissão | texto livre, ≤ 60 | só se marcou bem-estar | é a pergunta "(qual)" do dono; lista fechada aqui erraria mais do que acertaria |
| 3 | Modalidades | lista fechada, múltipla escolha, reusa `MODALIDADES_CLUBE` | sim | vira dado analisável e alimenta a vitrine; a lista já foi decidida pelo dono uma vez |
| 4 | Porte dos eventos | faixas, escolha única | só se marcou organizo eventos | segmentação comercial |
| 5 | Organização | texto, 2 a 80 | não | semente do slug do tenant; opcional porque autônomo não tem uma, e o resgate já tem fallback |
| 6 | Telefone | texto, reusa `telefoneValido` | sim | é como o time fala com quem pediu acesso |
| 7 | CPF | texto, reusa `validarDocumento` | **só quando a conta ainda não tem pessoa vinculada** | identidade e dedupe (Parte 4); some para quem já comprou. Sem saída para passaporte nesta rodada, pelo motivo da Parte 6 |
| 8 | Vai operar como pessoa jurídica? | sim/não; "sim" abre o campo de CNPJ | sim | vira `tipoPessoa`; o número usa o mesmo `validarDocumento` |
| 9 | Uso dos dados para recomendação e curadoria | caixa, nasce desmarcada | **não** | consentimento separado, e recusar não bloqueia (Parte 7) |

Quem já comprou e só organiza eventos responde **cinco**. Quem nunca comprou e só é
profissional de bem-estar responde **seis**. Nenhum caminho passa de sete. Isso é breve, e é
breve sem cortar nada do que o dono pediu.

### As três escolhas de vocabulário, com racional

**Modalidades: lista fechada.** O dono já tomou essa decisão uma vez, no clube, e o comentário
do módulo registra a razão dele: "o dono decidiu tirar o texto livre" (`clube-opcoes.ts:5`).
Texto livre em modalidade produz "yoga", "Yoga", "ioga" e "hatha yoga" como quatro coisas
diferentes, e nenhuma vitrine filtra por isso. A lista inicial é a `MODALIDADES_CLUBE`, nove
valores, já com "Bem-estar/Yoga" dentro.

Ela cresce por um caminho declarado, e o caminho não é um formulário: a lista é constante do
core, e acrescentar valor é commit. Para não perder o que não previmos, o último item é
**"Outra"**, e marcá-lo abre um campo de 40 caracteres que **não é modalidade**, é sinal para o
time. Sugestão que se repete vira valor da lista no lote seguinte. A lista captura o
desconhecido sem que o desconhecido suje o dado.

**Porte dos eventos: quatro faixas.** O corte cai onde a operação muda de natureza:

| Faixa | Por que este corte |
|---|---|
| até 100 participantes | opera na planilha; a plataforma é conveniência |
| 101 a 500 | precisa de lote, cupom e controle de entrada |
| 501 a 2.000 | precisa de equipe, e o repasse vira dinheiro que importa |
| acima de 2.000 | negociação de taxa e atendimento nomeado |

A escolha é sobre o **maior evento que a pessoa já fez**, não sobre uma média. Média de porte é
pergunta que ninguém sabe responder sobre o próprio negócio, e a resposta viria errada.

**Atuação: acumulável.** A leitura do dono já sugeria isso, e o produto confirma:
`profissionais/{uid}.papeis[]` já é lista (`packages/core/src/index.ts:69`), não escalar. O
modelo aceita acúmulo desde antes.

### Onde os campos de qualificação ficam guardados

Todos são de baixa sensibilidade e nenhum é documento. Vivem como campos de
`profissionais/{uid}`, legíveis pelo tenant, e isso está certo: modalidade e porte de quem
organiza um evento são justamente o que a equipe daquele tenant precisa enxergar. O `hasOnly`
da Rule de criação cresce para incluí-los, e nada mais. Os documentos seguem o desenho da
Parte 5 e não encostam nesse doc.

## Parte 8 · O termo, a finalidade e quem já aceitou

### O problema, nomeado

`TERMO_LGPD_FINALIDADE` diz hoje: "Criação e gestão da conta de organizador na plataforma
Leela e contato do time Leela sobre a liberação do acesso"
(`cadastroOrganizador.ts:39-41`). A base legal declarada no próprio código é o art. 7º, V, os
procedimentos preliminares de contrato, e o consentimento cobre a comunicação de onboarding.

Dados de qualificação não cabem nessa frase. Modalidade, porte e atuação servem a decidir a
liberação e a segmentar. Coletar além da finalidade declarada é limitação de finalidade, e é o
problema que o brief mandou resolver.

**Há um segundo problema, que as levas 2 e 3 criam e que ninguém tinha visto:** sob a
arquitetura de promoção, o `/cadastrar` deixa de criar conta de organizador e passa a criar
conta na Leela. A finalidade declarada fica **errada por outro motivo**, independente da
qualificação. O texto mudaria de qualquer forma.

### A decisão: dois termos, duas finalidades, dois carimbos

Não é um termo que sobe de versão para cobrir tudo. São dois momentos distintos, e cada um
carrega o seu.

**Termo da conta**, no `/cadastrar`. `TERMO_LGPD_VERSAO` sobe e a finalidade passa a ser a
criação e gestão da conta na Leela e a comunicação de serviço. Fica **mais estreita** que a de
hoje, porque não fala mais de liberação de acesso profissional.

**Termo do profissional**, na promoção. Constante nova, versão própria, finalidade própria:
avaliar e liberar o acesso profissional, e manter contato sobre essa liberação. Carimbado em
`profissionais/{uid}.consentimentoProfissional`, com versão, instante do servidor e finalidade,
no molde que a RN-446 já fixou e que a Rule já exige como `is timestamp`.

Por que dois e não um. Um termo só significaria que alguém que quer apenas comprar um ingresso
consente com curadoria comercial que nunca vai acontecer com ele. Finalidade é por finalidade,
não por formulário, e o produto tem dois formulários porque tem dois momentos.

### A base legal se divide, e é isso que mantém o formulário breve

Aqui está a distinção que evita transformar a qualificação num muro de caixas de seleção:

- **Qualificar para decidir o acesso** é procedimento preliminar de contrato, art. 7º, V. Não
  depende de consentimento, depende de transparência. Por isso os campos 1 a 8 podem ser
  obrigatórios sem que isso vire consentimento forçado, que seria consentimento inválido.
- **Usar a qualificação para recomendar, segmentar e exibir na vitrine** é outra finalidade,
  e essa depende de consentimento. É o campo 9, nasce desmarcada, e **recusar não bloqueia o
  acesso**. Consentimento que trava o serviço não é livre e portanto não é consentimento.

Uma caixa, não seis. O formulário segue breve porque a base legal foi partida no lugar certo,
não porque alguém decidiu perguntar menos.

### Uma regra durável para a constante de versão

A constante existe desde a RN-412 e ninguém escreveu quando um aumento dela obriga a
recoletar. Fica escrito agora, e vale daqui em diante:

**Versão que ESTREITA ou esclarece a finalidade não obriga recoleta.** Quem consentiu com o
mais amplo já cobriu o mais restrito. **Versão que ALARGA a finalidade obriga recoleta**, e
quem não recoletou não é tratado sob a finalidade nova.

O aumento do termo da conta é estreitamento: a finalidade nova é subconjunto da antiga.
Ninguém recoleta.

### Quem já aceitou a versão antiga

| Quem | O que acontece |
|---|---|
| Aceitou `2026-07-28` no `/cadastrar` | Nada. O aumento é estreitamento e o consentimento anterior cobre |
| Já é profissional e nunca viu o termo do profissional | Encontra a qualificação na primeira entrada no painel e carimba ali. Não é retroativo: é a primeira vez que essa finalidade existe |
| Tem doc de profissional **sem** `consentimentoLgpd`, o furo do LGPD-1 | Continua sendo o LGPD-1, e esta spec **não o resolve nem o contorna** |

A terceira linha merece nota. O LGPD-1 está aberto no painel do dono, sem default proposto,
porque a review se recusou a fabricar um carimbo de consentimento. Nada aqui muda isso. O que
muda é que a qualificação cria um **momento natural** para a recoleta que a primeira opção do
LGPD-1 propõe: quem passa pela promoção assina os dois termos ali, com carimbo de servidor
legítimo. Se o dono escolher "recoletar no resgate", esta spec já entrega a tela onde isso
cabe. Se escolher outra opção, nada aqui atrapalha.

**A população em risco hoje é conhecida e é pequena.** A porta do organizador nunca subiu para
produção (item DEPLOY-1 no painel), o `resgatarConviteOrganizador` responde 404 em produção e
nenhum convite foi semeado em ambiente nenhum. No emulador existem três contas nomeadas e
nenhuma acumula. Migração de dado real não é assunto desta rodada.

### O CPF pedido na promoção também tem finalidade própria

Ele não entra debaixo do guarda-chuva da qualificação. A finalidade do CPF é identificar a
pessoa e evitar identidade duplicada, o que serve à execução do contrato e à prevenção a
fraude, não à segmentação. Isso vai escrito no termo do profissional como item próprio, e é a
razão pela qual ele pode ser obrigatório enquanto a caixa de recomendação não pode.

E a ponta que o brief levantou fica respondida: **o CPF do checkout não é lido para dentro do
painel profissional.** O que a promoção faz é *escrever* na mesma identidade canônica quando a
pessoa informa o próprio documento, não *ler* um dado coletado para outra finalidade. A
diferença é real e é a que separa dedupe de vazamento de finalidade.

## Parte 9 · Painel Profissional

### O inventário, medido

O nome do painel aparece em três alturas, e elas custam coisas muito diferentes.

| Altura | Onde | Volume | Custo |
|---|---|---|---|
| Rótulo visível | 3 pontos canônicos + 12 de copy + 55 usos de "organizador" como rótulo | ~70 strings | Baixo. É texto |
| Identificador técnico | diretório `apps/painel`, `@leela/painel`, site `leela-hub`, `PAINEL_URL_PADRAO`, `basePainel`, `painelUrl`, `LEELA_PAINEL_URL`, projeto Sentry `leela-painel` | ~22 pontos, ~920 usos de "organizador" | **Alto e sem retorno.** Nada disso é visto por quem usa |
| Vocabulário de domínio | coleção `profissionais/{uid}`, campo `papeis[]`, claim `tenant_owner` | ~156 referências | Zero. Já está do lado certo |

Os três pontos canônicos, que sozinhos respondem pela maior parte da percepção:

1. `apps/painel/src/shell/RootShell.tsx:63` — "Painel do Organizador", a sub-linha da sidebar,
   presente em **toda tela do produto**;
2. `apps/painel/index.html:7` — `<title>Leela Painel</title>`, o único título do painel
   inteiro, sem título por rota;
3. `apps/painel/src/routes/conta/auth/CadastrarPage.tsx:145` e `EntrarPage.tsx:123` — a porta
   de entrada.

Somam-se os CTAs públicos da landing (`PublicHeader.tsx:71`, `PublicFooter.tsx:56` e `:67`),
oito strings de erro e estado, três testes que travam as strings e um assunto de e-mail
(`packages/core/src/platform/contatoOnboarding.ts:85`, "Liberar acesso ao painel Leela").

**Nada obrigatório em e-mails, manifest, coleções, claims ou rotas.** Os oito templates
transacionais não nomeiam o painel em lugar nenhum. Não existe arquivo de i18n: toda copy é
literal inline, então a troca é edição de literais espalhados, sem ponto central.

Dois achados de higiene, fora do escopo mas registrados porque a lane os encontrou: o favicon
do painel aponta para `/vite.svg`, que **não existe** em `apps/painel/public`, e não há
manifest nem tag `og:` nenhuma no painel.

### O juízo que o maestro pediu

Fortalece, e por um motivo mais específico que "combina com o posicionamento".

O produto já decidiu que a Leela é hub de experiências de bem-estar e que corrida é instância,
nunca categoria (D-0802-1). "Organizador" contradiz isso na raiz: a palavra descreve quem
produz um evento e deixa de fora o professor de ioga que vende a própria aula, a assessoria
que vende plano de treino e o clube que cobra mensalidade. Sob "organizador", esses três
públicos entram pela porta lendo um rótulo que não é sobre eles.

"Profissional" cobre os quatro, e não é palavra inventada para a ocasião: a coleção
`profissionais/{uid}` se chama assim desde o começo, o campo `papeis[]` já é lista e as
subcoleções `marcas`, `dashboard` e `analyticsSnapshots` já penduram nela. **O código sempre
soube que eram profissionais; foi a copy que ficou presa em organizador.** A troca alinha a
superfície ao modelo que já existe embaixo, o que é o oposto de um rebatismo cosmético.

O inventário confirma que a colisão é nula: "profissional" aparece hoje como rótulo visível em
**um único ponto** do produto inteiro (`apps/painel/src/routes/marcas/MarcasPage.tsx:350`).
Nenhuma rota contém a palavra. Nada precisa ser desocupado.

**`profissionais/{uid}` passa a ser o nome canônico**, e isso já era verdade de fato. O que esta
spec faz é parar de contradizê-lo na tela.

Um limite honesto: **"organizador" não morre.** Ele continua sendo o papel de quem produz
eventos, e continua correto onde se fala especificamente disso, como o convite de organizador,
o papel de evento (`PapelEvento`) e o campo `evento.organizadorId`. O que muda é que ele deixa
de ser o nome do lugar. Painel Profissional é a casa; organizador é uma das coisas que se é
dentro dela.

Uma ponta que precisa de decisão junto: `packages/core/src/perfil/perfil.ts:79-80` reserva os
handles públicos `organizador` e `organizadores`, e **não reserva `profissional`**. Se o
rebatismo entra, a reserva acompanha, senão alguém registra `@profissional` como perfil
público.

### Ordem, para a troca não custar duas vezes

O rebatismo encosta em três frentes vivas: a área do cliente da SPEC-ADMINSEP, que tem um botão
apontando para este painel; os oito e-mails que a IDENTIDADE-EMAIL acabou de padronizar; e a
porta de entrada, que ainda não subiu. A troca de copy entra **junto** com a reescopagem do
`/cadastrar`, num lote só. Fazer as duas separadas significa mexer nos mesmos arquivos duas
vezes, e a segunda passada conflita com a primeira.

## Premissas assumidas, com default profissional

Registradas para veto. Nenhuma foi ao dono, porque nenhuma é juízo dele.

1. **O `/cadastrar` reescopado é a saída A**, e telefone e organização migram para a promoção.
   É a única leitura que não deixa a regra do dono se morder.
2. **A qualificação é a promoção**, não um passo depois dela.
3. **A organização vira opcional.** Autônomo não tem uma, e o resgate já tem fallback para o
   slug (`resgatarConviteOrganizador.ts:197`).
4. **Modalidade é lista fechada com "Outra" ao lado.** Precedente do próprio dono no clube.
5. **Porte é sobre o maior evento já feito**, não sobre média.
6. **O CPF é pedido na promoção só quando a conta ainda não tem pessoa vinculada.** Campo
   condicional, não campo a mais para todo mundo.
7. **CPF e CNPJ não moram no mesmo campo.** Um identifica a pessoa, o outro a entidade.
8. **Nada é cifrado nesta rodada.** Cifra existe para instrumento de movimentação.
9. **O cadastro de recebimento para de pedir o documento e passa a pré-preencher.**
10. **A vinculação de contas exige posse da outra credencial**, nunca merge automático, e a
    resposta é uniforme com rate limit.
11. **O anti-hijack da RN-174 não é afrouxado.** O que nasce é o caminho de vinculação que ele
    pressupõe.
12. **RN-461 a RN-468 é a faixa consumida.** Varredura executada: RN-454 a RN-459 foram tomadas
    pela lane de juros e margem, RN-460 é um dos seis números reservados que nunca receberam
    enunciado (`indice-de-regras-de-negocio.md:71`), e RN-461 em diante tem zero ocorrência.
13. **O rebatismo é de rótulo, não de identificador.**
14. **O LGPD-1 não é resolvido aqui.** Esta spec cria o lugar onde a recoleta caberia.
15. **A qualificação não substitui o convite.** O overlay bloqueante continua.
16. **O login social entra no `/cadastrar` e no `/entrar` juntos.** Ligar só um dos dois
    produziria a pessoa que cria conta com Google e não consegue voltar.
17. **A chave de passaporte é `pessoa:passaporte:{ISO2}:{número}` com prefixo `pass_`**, e o
    país entra dentro da chave. Nenhum id de CPF existente muda.
18. **O formulário não pergunta nacionalidade.** O campo nasce CPF com saída discreta para
    "não tenho CPF". Refina a leitura de UI da RN-176 sem tocar a regra, e por isso é premissa
    vetável, não decisão silenciosa.
19. **Duplicata de passaporte é tolerada e fundida depois**, nunca bloqueada na entrada.
20. **Profissional estrangeiro fica fora desta rodada.** O bloqueio é o repasse, não a
    identidade.

## O que sobe ao dono

Cinco itens, e nada além disso. Detalhe e opções no painel.

- **QUALIF-1** — o número do CNPJ é pedido na promoção ou no cadastro de recebimento.
- **QUALIF-2** — CPF é identificador de **entrada** (login) ou de **identificação** (cadastro).
  A premissa "já temos o CPF" foi falsificada e a escolha decide o desenho da porta.
- **QUALIF-3** — a extensão do rebatismo: rótulo visível apenas, ou também identificador
  técnico.
- **QUALIF-4** — "fluxo de referência" era exemplo a copiar ou programa de indicação.
- **QUALIF-5** — o Apple Sign-In depende de conta e chaves que só o dono abre.
- **QUALIF-6** — o passaporte entra como modelo agora, mas a jornada do estrangeiro só fecha
  com a liberação do Asaas, que é o **item 12b** adiado por ele em 26/07. Reabrir ou seguir com
  o paliativo.
