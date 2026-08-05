---
lane: REV-CONTAS-MOTOR
trace: leela-pixreal-diag-20260804
employee: sf-qa-engineer (software-forge) — ANTAGONISTA
data: 2026-08-05
sob-review: 39a98908 · 6f5b7915 · a0f12500 · 23c644f2 · cb33344e
territorio: functions/**, packages/core/**, firestore.rules, testes
---

# Handoff · REV-CONTAS-MOTOR

**Veredito: APROVADO COM CORREÇÕES APLICADAS.** O desenho aguenta o ataque —
o teto de tentativas é exato, a prova de continuação não é uma segunda
superfície de credencial, o oráculo de conta não existe e o pepper é
fail-closed nas três portas. Seis achados entraram como fix-commit; nenhum
deles derruba o lote, e um deles (DEF-2) é fronteira de papel que estava
aberta numa superfície pública.

**A Rule `cb33344e` é segura para deployar, e NÃO precisa de mitigação para
token em cache.** A quantificação está na §4.

## Fix-commits desta review

| Commit | O que fecha |
|---|---|
| `59980b48` | DEF-3 · a falha do nono e-mail vira incidente observável |
| `8f7dfa36` | DEF-1, DEF-2, DEF-4, DEF-5, DEF-6 · ordem do consumo, RN-449d, prazo declarado, evidência do duplo desfazer, aborto de transação |
| `6da5bd7f` | as três suítes do construtor passam a rodar duas vezes seguidas |

## Vetor a vetor

| # | Vetor atacado | Resultado |
|---|---|---|
| 1 | Prova adivinhável? | **RESISTE** · 256 bits hex, 40 emissões sem repetição |
| 2 | Prova com uso único **provado**? | **RESISTE** · 8 conclusões simultâneas, um sucesso só |
| 3 | Prova atravessa endereço? | **RESISTE** · prova da Ana não conclui o Bruno (digest e docId ligados ao endereço); nada nasce |
| 4 | Prova sobrevive a código novo? | **RESISTE** · o `set` inteiro da emissão zera `provaDigest` |
| 5 | Prova pode ser pedida? | **RESISTE** · nenhuma resposta de negativa carrega prova |
| 6 | Prova expira junto com o código? | **CAI — DEF-4** · ganha 10 min NOVOS a partir do consumo; cadeia vive até 2× TTL |
| 7 | Prova de "primeiro acesso" cria conta (e vice-versa)? | **NÃO É DEFEITO** · o ramo é decidido pelo estado do Auth no servidor, nunca pela intenção declarada pelo cliente; as duas portas são a mesma função |
| 8 | `precisaCadastro` vaza existência de conta? | **RESISTE** · só existe depois do código correto |
| 9 | `tentativasRestantes` é oráculo de conta (valor)? | **RESISTE** · valores idênticos com conta e sem conta, nas três causas |
| 10 | Rollback: `deleteUser` também falha | **MEDIDO — DEF-5** · ver §3 |
| 11 | Rule (a): comprador anônimo recém-pago | **RESISTE** · 29 + 26 casos verdes |
| 12 | Rule (b): conta vinculada NÃO verificada | **RESISTE** · negada |
| 13 | Rule: token antigo em cache | **NÃO É RISCO** · ver §4 |
| 14 | Força bruta paralela (12 → 40 → 80) | **RESISTE** · comparações == `tentativas`, sempre ≤ 5 |
| 15 | Contador fora da transação | **RESISTE** · comparação e incremento são atômicos; aborto não conta e não julga |
| 16 | Fecho transitivo do pepper | **RESISTE — e mordeu** · ver §5 |
| 17 | Fail-closed sem pepper | **RESISTE** · as três portas lançam; nenhuma degrada para hash sem pepper |
| 18 | Código em log? | **RESISTE** · nem no `logger`, nem na mensagem do Brevo (opaca por construção) |
| 19 | Falha de envio é incidente? | **CAI — DEF-3** · era `logger.error` cru, sem o campo que a política casa |
| 20 | Prova queimada por erro de formulário | **CAI — DEF-1** |
| 21 | RN-449d na porta do participante | **CAI — DEF-2** |
| 22 | Sexta causa com código de erro próprio | **CAI — DEF-6** |
| 23 | Terceiro esgota as tentativas da vítima | **RISCO ACEITO** · ver §6 |
| 24 | `contaSemFriccao` no meio do fluxo (pede código → compra → usa código) | **RESISTE** · a pessoa cai no ramo "conta existe" e recebe a conta que guarda o pedido dela |

## Defeitos, com severidade

### DEF-2 · MÉDIO-ALTO — a conta de administração entrava pela porta do participante
`23c644f2` · fix em `8f7dfa36` · teste `revContasMotor.antagonista` → *"DEF-2 ·
platform_admin é RECUSADO"*

A RN-449d existe e está aplicada no `contaSemFriccao.ts:288`: conta
`platform_admin` nunca vira conta de comprador. A porta nova não tinha a
guarda. Uma callable **pública, anônima e sem App Check** trocava a senha da
conta de administração, carimbava `emailVerified` nela e devolvia token de
sessão. Gated por posse de caixa, sim — mas a mesma posse, na jornada certa,
passa pelo painel, e a RN-449d existe justamente porque "achou a conta pelo
e-mail" não é autorização para administrar a plataforma.

Aritmética que mantém isto em ALTO e não em CRÍTICO: 10 códigos/24h × 5
comparações = 50 palpites/dia contra 10⁶ — não é força bruta praticável, e o
administrador veria dez e-mails não solicitados por dia. A guarda entra ANTES
do consumo, então ninguém perde código por bater nesta porta.

### DEF-1 · MÉDIO — o erro de formulário custava o código
`23c644f2` · fix em `8f7dfa36` · teste → *"DEF-1 · falta de aceite NÃO queima a prova"*

A prova era consumida antes de o servidor saber que ramo percorrer. Sem o nome
ou sem o aceite, a chamada devolvia `failed-precondition` **e a pessoa perdia a
prova e o código** — tinha de pedir outro, com 3 pedidos por 15 minutos de
teto. É exatamente o desfecho que a separação em duas callables foi justificada
para evitar; ele só tinha mudado de passo. Com as telas B1–B3 ainda não
construídas, é também o defeito com maior chance de aparecer no primeiro dia.

### DEF-3 · MÉDIO — o nono e-mail fora da doutrina de incidente da rodada
`6f5b7915` · fix em `59980b48` · teste → *"DEF-3 · o log carrega o campo que a política casa"*

Resposta direta à pergunta da lane: **não, ele não entrava.** Era `logger.error`
cru, sem `alerta`/`severidade`. É o único e-mail da casa cuja falha deixa a
pessoa sem conseguir entrar — o incidente de 04/08 pronto para se repetir em
silêncio, desta vez com uma credencial no meio.

### DEF-6 · MÉDIO — a sexta causa escapava com código de erro próprio
`23c644f2` · fix em `8f7dfa36` · teste → *"DEF-6 · aborto de transação NÃO escapa"*

Ninguém escreveu o `throw`: sob contenção alta no mesmo endereço — a condição
de um ataque, não de um dia normal — o `runTransaction` aborta e o erro cru do
Firestore atravessava a callable inteira. Medido: com 80 palpites simultâneos e
o emulador sob carga, as comparações caíram de cinco para **duas**; as outras 78
foram abortos, **sem uma linha de log**. O teto continua exato (aborto não conta
tentativa e não produz veredito), mas a resposta era um erro distinguível numa
tela sem estado para ele. Agora é `unavailable` + log com `alerta`.

### DEF-5 · MÉDIO — o duplo desfazer, medido (correção da severidade do construtor)
`23c644f2` · evidência em `8f7dfa36` · dois testes em *"a conta órfã do duplo desfazer, medida"*

O construtor perguntou se a conta órfã pode logar e se ela tranca a pessoa. As
respostas, medidas:

- **Pode logar? SIM.** Ela nasce `emailVerified: true` e com a senha que a
  pessoa acabou de digitar. Ela é uma conta funcional, não um fantasma.
- **Tranca a pessoa? NÃO.** A segunda volta cai no ramo "conta existe"
  (`precisaCadastro: false`), define a senha e entra. Provado por teste.
- **O que realmente se perde:** o `atletas/{uid}` com o consentimento nunca é
  gravado, e o ramo "conta existe" **não grava consentimento nenhum** — o
  aceite LGPD que a pessoa deu some para sempre, em silêncio.

Portanto **não é o defeito ALTO de bloqueio que o construtor supôs; é um
defeito MÉDIO de artefato de conformidade.** Sem fila de compensação, o que
esta lane entrega é a evidência no formato que a política casa, com o `uid`
para limpeza à mão. **Fica para o dono/CTO:** decidir se o ramo "conta existe"
deve gravar consentimento quando `atletas/{uid}` não o tiver — é regra de
produto, não conserto de review.

### DEF-4 · BAIXO — "o mesmo prazo do código" era falso
`39a98908` · fix em `8f7dfa36` · teste → *"a prova NÃO tem o mesmo prazo do código"*

`provaExpiraEm` nasce de `agora + TTL` no instante do **consumo**. Quem confirma
aos 9min59s ganha dez minutos novos, e a cadeia código→prova vive até **2× TTL**.
O prazo fresco é a escolha certa (herdar dois segundos seria dead-end de tela);
o número declarado é que precisava ser o número real. Comportamento mantido,
afirmação corrigida.

### Extra · as três suítes do construtor não rodavam duas vezes
fix em `6da5bd7f`

`confirmarCodigoDeAcesso.integration` passa 19/19 na primeira execução e
**reprova na segunda** contra o mesmo emulator (`auth/email-already-exists`),
porque o endereço era montado com `seq`, que reinicia a cada processo. Importa
além da ergonomia: o verde do handoff foi colhido em execução única por
arquivo, então ele não distinguia "a suíte passa" de "a suíte passa uma vez".

## §4 · Veredito sobre a Rule `cb33344e` — é seguro deployar

**SIM, e sem mitigação para token em cache.** O construtor listou o cache como
ruído de suporte; a medição diz que ele não é nem isso, e a razão é mais forte
do que a que o handoff dá:

1. **O ramo (b) não tem consumidor de client SDK hoje.** Varredura de
   `apps/**`: as únicas leituras de `pedidos` por SDK são `CheckoutFlow.tsx`
   (landing — o próprio pedido, que casa pelo ramo **(a)**, `responsavel.atletaId`)
   e `apps/painel/.../queries.ts:837` (organizador, que passa por
   `isTenantWriter`). A área do cliente serve pedido por **callable**
   (`packages/api-client/src/cliente.ts`), e o `gateAreaCliente` **já exigia**
   e-mail verificado. A Rule está sendo alinhada ao que a aplicação já fazia.
2. **`email_verified` é claim de ID token; refresh o atualiza em ≤1h**, e todo
   `signInWithCustomToken` mina token novo. Quem estava verificado sempre teve
   `true`; quem não estava continua negado — e já era negado pelo gate da área
   do cliente.
3. **Quem tem conta criada pelo `contaSemFriccao` e nunca definiu senha não tem
   sessão nenhuma**, então não lê nada por Rule, com ou sem a mudança. Quem
   definiu senha pelo link do e-mail teve `emailVerified` carimbado pelo próprio
   Firebase no reset.

**População trancada pela mudança: nenhuma que hoje consiga autenticar e ler
pelo ramo (b).** Regressão coberta: `pedidoProprioRules` 29/29,
`pedidoProprioRulesAntagonista` 26/26, `areaDoCliente` 32/32 — duas passadas.

⚠ **O que sobra e é do dono:** a Rule fecha a ponta da leitura, mas **o vínculo
continua saindo de igualdade de e-mail**. Erro de digitação no checkout segue
carimbando a compra na conta errada; o que muda é que essa conta só lê se
também tiver provado posse. Está escrito na própria Rule — confirmado, não é
buraco novo.

## §5 · O pepper — fecho transitivo confirmado, e ele mordeu

`secretsBinding.contract` 23/23. O fecho é **real e transitivo**, e a prova é que
ele reprovou **o meu próprio fix**: importar `PAPEL_ADMIN_PLATAFORMA` do
`contaSemFriccao.ts` fez o contrato acusar
`confirmarCodigoDeAcesso → falta BREVO_API_KEY`. Uma importação por conveniência
teria dado a uma superfície pública de credencial acesso à chave do provedor de
e-mail sem ninguém pedir. Trocado pelo guard puro `isPlatformAdmin` do core.

Fail-closed exercido nas **três** portas: sem `CODIGO_ACESSO_PEPPER`, todas
lançam com a mensagem do segredo e nenhuma degrada para hash sem pepper —
nenhuma conta nasce no caminho degradado.

## §6 · Risco aceito, e o que ele exige antes das telas

**Um terceiro que conhece o endereço mata o código da vítima.** `confirmar` não
tem limitador próprio: cinco palpites errados matam o código, e o atacante só
precisa do endereço. Com 10 códigos/24h, dez ciclos e a vítima fica sem o
caminho do código por 24 horas (o ingresso segue pelo link assinado, RN-452).

É inerente a qualquer OTP com teto de tentativas e **não tem conserto dentro
deste território** — a defesa é volumétrica e é da borda. O `rateLimit.ts` já
tem a decisão escrita de não derivar IP em callable, e está certa. **Isto sobe
como pré-requisito, não como defeito.**

## O que precisa existir em produção ANTES do deploy

1. **`CODIGO_ACESSO_PEPPER` no Secret Manager** — confirmado pela review:
   alta entropia, nunca versionado. Sem ele as três callables lançam na
   primeira chamada. *(bloqueante)*
2. **App Check / Cloud Armor na borda** antes de as telas B1–B3 irem ao ar —
   §6. Enquanto não houver, o bloqueio de terceiro é explorável por quem
   souber um endereço. *(bloqueante para as telas, não para o motor)*
3. **Política de alerta no Cloud Logging** casando
   `jsonPayload.alerta="email_transacional_falhou"` — o gancho está pronto e
   agora inclui o nono e-mail; sem a política, a falha continua invisível.
   *(decisão de custo do CTO humano)*
4. **Sem deploy nesta lane.** O maestro sequencia.

## Decisões que sobem ao dono

- **Consentimento no ramo "conta existe"** (DEF-5): gravar o aceite quando
  `atletas/{uid}` não o tiver? É regra de produto.
- **Organizador/tenant na porta do participante**: a RN-449d nomeia
  `platform_admin` e só ele. Uma conta de organizador criada com o endereço de
  um participante continua atravessando. Ampliar a fronteira é regra nova.
- **CONTA-1 e CONTA-2** seguem abertos e não bloqueiam o motor.

## Gates

```
npm --prefix packages/core run type-check / lint / build   → 0 · 0 · ok
npm --prefix functions    run type-check / lint / build    → 0 · 0 · ok
npm --prefix functions    run email:render                 → 9 e-mails + index
```

Emulator EXCLUSIVO da review (`firebase.revcontas.json` — firestore **8399**,
auth **9399**, hub 4399, logging 4499, IPv4 explícito), JDK 21, com
`FIRESTORE_EMULATOR_HOST` **e** `LEELA_FS_EMU_PORT` exportados. Arquivo a
arquivo, **duas passadas completas**, ambas verdes:

```
codigoAcessoCore                            20 passed
codigoAcessoTemplate                         7 passed
secretsBinding.contract                     23 passed
codigoAcesso.integration                    18 passed
solicitarCodigoDeAcesso.integration         13 passed
confirmarCodigoDeAcesso.integration         19 passed
revContasMotor.antagonista                  18 passed   ← desta review
pedidoProprioRules.integration              29 passed
pedidoProprioRulesAntagonista.integration   26 passed
areaDoCliente.integration                   32 passed
emailIncidente.integration                   8 passed
```

`revContasMotor.antagonista` rodou **três vezes** em isolamento na caça ao
flake do teste de contenção — a asserção final é de IGUALDADE entre comparações
e `tentativas`, nunca de um valor fixo, porque o número de comparações depende
da carga e um valor fixo seria flaky por desenho.

**A suíte completa de functions NÃO foi rodada**, por instrução da lane.
`apps/**` e `leela-specs/` intocados; o `CapacidadeModal.tsx` de terceiro e as
demais mudanças vivas na árvore seguem exatamente como estavam
(`git commit --only` em todos os três commits).
