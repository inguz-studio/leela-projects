---
tags: [leela, rns, rodada, contas, seguranca, area-do-cliente]
trace: leela-build-2d6ee98d
lote: SPEC-ADMINSEP
data: 2026-08-04
---

# 10-rns · Contas separadas e a área do cliente

> **Prova de não colisão (2026-08-04).** A série de plataforma e identidade é a **4xx**.
> Varredura por `RN-449` e `RN-450` em todo o repositório fora de `node_modules`: zero
> ocorrências. A faixa ocupada vai até `RN-448` (nascida na ONBOARD-REV), com `RN-460` e
> `RN-499` isolados adiante e sem relação com este assunto. **Esta lane consome RN-449 a
> RN-452.**
>
> Diagnóstico com evidência em `09-spec-contas-e-area-cliente.md`. Fila em
> `11-fila-contas-e-area-cliente.md`.

## Novas

| RN | Regra | Épico | Lote |
|---|---|---|---|
| **RN-449** | **A conta do painel de plataforma é outra. Uma conta nunca acumula `platform_admin` com organizador ou com cliente.** Decisão do dono em 03/08, verbatim: "É uma conta só somente para quem é organizador e cliente. A conta do painel admin, deve ser outra. os ambientes devem ser separados, por questões de segurança." Supera a RN-448. Detalhamento testável abaixo. | E00 (dona) · E16 (consome) | SPEC-ADMINSEP |
| **RN-450** | **Organizador e cliente cabem na MESMA conta, e é assim que tem de ser.** A outra metade da frase do dono. Uma conta pode carregar, ao mesmo tempo, o perfil de organizador (`profissionais/{uid}`) e a identidade de cliente (`atletas/{uid}` + vínculo de compra em `pessoas/{ref}.contaUid`). Os dois são documentos DIFERENTES e nenhum sobrescreve o outro. A identidade de cliente de quem já é organizador nasce **sob demanda** (primeira compra ou primeira visita à área do cliente), nunca pelo gatilho de criação de conta, que segue sem criar doc de atleta para papel profissional (`onCreateUser.ts:88-95`). Não existe seletor de papel e não existe tela de escolha: a pessoa está nas duas casas e navega entre elas por link. | E00 (dona) · E12 (consome) | SPEC-ADMINSEP |
| **RN-451** | **A área do cliente: escopo fechado, na landing, servida por callable.** Área autenticada em `apps/landing` com exatamente oito coisas, declaradas pelo dono e sem inflar: histórico de compras; convites para virar promotor ou influenciador; Meus Clubes; Meus Ingressos separados em próximos e passados; meus dados; trocar senha; criar conta de organizador; e o botão para a área de organizador. Toda leitura de dado tenant-scoped é servida por **callable que devolve só o registro da própria conta**, no molde do `getCheckoutPrefill` (`prefillCheckout.ts:99`, `:170-180`). **Nenhuma Rule de coleção tenant-scoped é aberta ao papel `athlete`** — `pedidos` e `inscritos` continuam fechados ao cliente pelo SDK (`firestore.rules:2542`, `:900`), porque abri-los entregaria PII de tenant a um token de participante. O vínculo entre conta e compra é `pessoas/{ref}.contaUid`, e o leitor exige e-mail verificado: a área mostra as compras de quem verificou o e-mail, e a conta nasce não verificada. | E12 (dona) · E00 e E19 (consomem) | SPEC-ADMINSEP |
| **RN-452** | **Ver o ingresso não exige conta, e a área do cliente não tranca o link.** A página `/ingresso/{token}` continua pública e sem login, servida pelo link assinado do e-mail, porque quem recebe o e-mail é o comprador e ele frequentemente não é o inscrito (ADR-011: o pagador compra para a família). A área do cliente é **porta adicional**, nunca substituta: quem tem conta encontra tudo junto; quem não tem continua entrando pelo link. Ficam intactas a RN-418 (página sempre dinâmica), a RN-422 (`noindex`, `no-referrer`, `no-store`) e a D-ING-10 (abrir ingresso não escreve nada). | E12 (dona) | SPEC-ADMINSEP |
| **RN-453** | **Primeiro acesso: o link define a senha e entra no sistema.** Decisão do dono em 04/08, verbatim: "sobre o primeiro acesso da pessoa, ela precisa definir a senha neste acesso, ok? Enviamos o link, ela entra define a senha e entra no sistema." A conta nasce na **confirmação do pagamento** (RN-155) e o e-mail da Leela leva o link oficial do Firebase, de uso único. O link **aterrissa em tela da Leela**, nunca no handler hospedado padrão, e o destino é decidido pela **origem**: link de compra continua na landing e termina na área do cliente, em Meus Ingressos; link de "esqueci minha senha" do painel continua no painel e termina no roteamento por papel do item 57. Depois de salvar a senha a pessoa fica **autenticada**, sem segundo login. Link já usado, expirado ou inválido tem caminho de volta que reenvia, nunca "peça ajuda", e a confirmação do reenvio é neutra pela mesma disciplina anti-enumeração do painel. | E12 (dona) · E00 (consome) | SPEC-ADMINSEP |

## RN-449 · a forma testável

O que se recusa, quem recusa, e com que erro. Cada linha é um caso executável.

### (a) Conceder `platform_admin` a uma conta que já tem o outro lado

`setTenantClaims` recusa `role: 'platform_admin'` quando o uid alvo carrega qualquer marca
do lado organizador ou do lado cliente:

| Marca no alvo | Como se detecta | Resultado |
|---|---|---|
| Perfil de organizador | `profissionais/{uid}` existe | `failed-precondition`, mensagem própria citando RN-449 |
| Identidade de cliente | `atletas/{uid}` existe | idem |
| Compra amarrada | existe `pessoas` com `contaUid == uid` | idem |
| Papel de tenant vigente | claim atual em `tenant_owner`, `tenant_staff` ou `promoter` | idem |

A mensagem nomeia a regra e o caminho suportado, e **nunca** é `internal`. Lição do DEF-B da
ONBOARD-REV: erro genérico em cima de pré-condição legítima vira oráculo e queima o chamador.

**Falsificação que prova a guarda:** remover a checagem faz morrer os quatro casos acima.

### (b) O caminho inverso continua aberto, e isso é de propósito

Rebaixar um `platform_admin` para `athlete` ou promovê-lo a `tenant_owner` **segue
permitido**. Não é acúmulo, é troca de lado, e o marcador `demotedFromRole` já existe
exatamente para distinguir a demoção deliberada do artefato de corrida
(`setTenantClaims.ts` · `mergeTenantClaims`). Depois da troca, a conta é do lado novo e as
guardas de (a) passam a valer no sentido novo.

### (c) As três recusas que já existem ganham nome

Nenhuma trava nova. O que muda é que passam a ter caso citando a RN-449, para que ninguém as
desfaça achando que são acidente:

| Caminho | Guarda existente | Onde |
|---|---|---|
| Provisionar tenant para conta `platform_admin` | papel conflitante rejeitado | `provisionTenant.ts:196-256` |
| Resgatar convite de organizador sendo `platform_admin` | chamador rejeitado | `resgatarConviteOrganizador.ts:180-181` |
| Claim carregar admin e `tenantId` juntos | `ROLES_WITHOUT_TENANT` recusa `tenantId` | `setTenantClaims.ts:46`, `:127-132` |

### (d) O lado cliente para de amarrar compra em conta de administração

`garantirContaSemFriccao` passa a olhar o papel da conta que resolveu pelo e-mail. Quando a
conta for `platform_admin`:

- **não** amarra o vínculo (`pessoas/{ref}.contaUid` fica intocado);
- **não** cria nem reusa a conta como conta de comprador;
- carimba no pedido `contaSemFriccao: { contaUid: null, motivo: 'conta_admin_nao_vinculavel' }`;
- **a compra é confirmada normalmente.** O arquivo é best-effort por contrato e nenhuma falha
  dele derruba a confirmação. Dinheiro fail-open, identidade fail-closed.

Comprar continua permitido a qualquer pessoa, inclusive ao administrador: a regra proíbe o
**vínculo**, não a venda. Quem administra a plataforma e quiser comprar usa o outro e-mail,
que é justamente o que a decisão do dono determina.

**Falsificação:** um pedido pago cujo `responsavel.email` pertence a uma conta
`platform_admin` deve sair com `contaUid` nulo e o motivo carimbado; remover a guarda faz o
caso morrer e o vínculo voltar a ser escrito.

### (e) Allowlist de administração · premissa vetável P-ADMINSEP-1

Conceder `platform_admin` exige que o e-mail do alvo esteja numa allowlist da plataforma,
em **doc próprio** `platform/configAdmin`. O doc é próprio pela mesma razão que a RN-417
teve de reconciliar: Rules do Firestore não filtram campo, e pendurar a allowlist em
`platform/config` a colocaria ao lado da tabela global de taxa.

Fail-closed: doc ausente ou lista vazia faz a **callable** recusar a concessão. Isso não
tranca ninguém para fora, porque o bootstrap do primeiro administrador em produção já é
operação manual pelo Admin SDK, fora do repositório e fora da callable, e está declarado
assim em `functions/src/seed/platformAdmin.seed.ts:65`.

Premissa vetável: o dono não pediu allowlist. É default profissional meu, barato, e serve
diretamente a frase "os ambientes devem ser separados, por questões de segurança". Se ele
vetar, cai só este item e o resto da RN-449 fica de pé.

## RN-451 · a forma testável

- A área vive atrás de sessão autenticada e **não** é alcançável por conta anônima. Sessão
  anônima do checkout (`CheckoutFlow.tsx:527`) não é sessão de área do cliente.
- Conta autenticada **sem** e-mail verificado entra na área e vê estado honesto no histórico
  e nos ingressos: a área explica que falta verificar o e-mail e oferece o reenvio. Não
  mente dizendo que não há compras.
- O callable de histórico devolve **somente** pedidos cuja pessoa tem `contaUid` igual ao
  chamador. Falsificação: pedir o histórico com o uid de outra conta devolve vazio, nunca o
  dado alheio.
- Um token `athlete` que tente ler `pedidos` ou `eventos/{e}/inscritos/{id}` direto pelo SDK
  continua recebendo negativa das Rules. Este caso é de ataque e tem de existir.
- "Meus Ingressos" separa por data do evento, e o recorte é do servidor, não da tela.
- O botão para a área de organizador **só aparece** para a conta que também é organizadora, e
  leva ao painel do organizador. Conta que é só cliente não vê o botão.
- Nenhum caminho da área do cliente leva ao painel de plataforma. Este caso é a materialização
  da RN-449 na tela.
- "Criar conta de organizador" a partir da área **não** provisiona tenant. Cria
  `profissionais/{uid}` com `statusOnboarding: 'aguardando_convite'` (RN-411) e entrega a
  pessoa no overlay bloqueante que a ONBOARD-BUILD construiu (RN-416). O convite continua
  sendo a chave, e o go-live segue controlado.

## RN-453 · a forma testável

Cada linha é um passo da jornada e um caso executável.

1. **A conta nasce e o e-mail sai.** Já existe: pedido `pago` faz `garantirContaSemFriccao`
   criar a conta sem senha, gerar o link (`contaSemFriccao.ts:107`) e disparar o e-mail da
   Leela (`renderContaCriadaEmail`). **Aceite:** já coberto; a lane só não pode regredir.
2. **O link vai para tela da Leela.** `actionCodeSettings.url` presente nos dois pontos de
   origem, com a base vindo de ambiente e nunca cravada: `LEELA_PUBLIC_URL` para o comprador,
   `NEXT_PUBLIC_PAINEL_URL` para o organizador. **Aceite:** o link gerado contém
   `continueUrl` apontando para o domínio certo de cada origem. **Falsificação:** remover o
   parâmetro faz o caso morrer, e o link volta a `/__/auth/action`.
3. **Definir a senha autentica.** Depois de `confirmPasswordReset`, a pessoa fica com sessão
   ativa, sem segundo login, e aterrissa em Meus Ingressos. **Aceite:** ao fim do fluxo a
   sessão é nomeada, não anônima, e a rota é a área do cliente. **Falsificação:** remover o
   login pós-confirmação faz o caso terminar em tela de entrar, que é o que o dono descreveu
   como errado.
4. **Link usado duas vezes tem saída.** Código inválido ou expirado mostra estado honesto com
   **botão de reenvio**, e a confirmação do reenvio é neutra: mesma mensagem exista ou não a
   conta, `auth/user-not-found` engolido (disciplina de `RecuperarSenhaPage.tsx:5-9`). Quem
   **já definiu** a senha vê estado próprio, que oferece entrar, e não redefinir. **Aceite:**
   três estados distinguíveis (válido, inválido ou expirado, já definida) com três telas.
   **Falsificação:** colapsar os três num "link inválido" mata dois casos.
5. **O ingresso continua alcançável sem conta.** RN-452 intacta: o caso que prova
   `/ingresso/{token}` respondendo sem sessão tem de continuar verde depois de tudo isso.

**Conferência operacional, não presumível:** o domínio de continuação precisa estar nos
Authorized Domains do Auth. `leela-landing.web.app` é um segundo site de Hosting e pode não
estar autorizado; sem isso o Firebase recusa com `auth/unauthorized-continue-uri`. É passo de
verificação da fila.

**Fora do escopo da RN:** o Action URL global do Console do Firebase não resolve, e não deve
ser usado como atalho. Ele é único para o projeto inteiro e não distingue comprador de
organizador, que precisam aterrissar em lugares diferentes. O comentário em
`packages/api-client/src/auth.ts:209-212`, que propunha esse caminho, fica superado por esta
RN e deve ser corrigido junto.

## Ampliadas e reconciliadas, sem número novo

- **RN-448 · SUPERADA pela RN-449.** A regra registrou "acesso único por precedência: uma
  conta, uma casa", com a leitura de que administrador e organizador cabiam juntos. A parte
  errada é essa. **O que sobrevive** da RN-448, e agora vive na RN-449 e na RN-450: o destino
  pós-login por papel (item 57, ratificado pelo dono e não revogado), a reconciliação com a
  RN-411 para a conta em onboarding, e o deep-link guardado vencendo o default. A RN-448 fica
  marcada como superada nos épicos, com a razão, e não é apagada: apagar regra registrada
  apaga o histórico do erro.
- **RN-411** — ampliada com um segundo ponto de entrada. Além do `/cadastrar` da landing, o
  botão "criar conta de organizador" da área do cliente leva ao MESMO estado
  `aguardando_convite`. Uma máquina só, dois botões.
- **RN-155 / RN-173 / RN-174** — inalteradas no contrato, ampliadas na guarda: o escritor
  único do vínculo passa a recusar conta de administração (RN-449d). O anti-hijack de
  primeiro-vínculo continua valendo para todos os demais casos.
- **RN-401** — inalterada. A claim segue sendo a fonte única de papel, e o cliente nunca
  eleva o próprio papel.
- **RN-417** — citada como precedente de forma, não alterada. O doc próprio para a allowlist
  (RN-449e) segue a mesma razão que moveu o contato do CTA para `platform/configOnboarding`.
- **RN-418 / RN-422 / D-ING-10** — inalteradas e reafirmadas pela RN-452.
- **S1222 (E12)** — o card de backlog "área do cliente com os próprios ingressos" é
  **absorvido** pela RN-451 e ganha corpo de história. Não nasce identidade nova.

## Fora desta rodada

- **Segundo fator para `platform_admin`.** Exige subir para Identity Platform, que é tier
  pago. Julgamento de custo, portanto pendência do CTO humano, no mesmo molde do item 62.
- **Endereço e build próprios para o painel de administração.** É a leitura profunda de
  "ambientes separados" e está no painel como **ADMINSEP-1**. Não bloqueia nada desta fila.
- **Projeto Firebase separado para administração.** Recusado com razão registrada na spec:
  o administrador opera sobre o MESMO Firestore cross-tenant, e a fronteira que importa é o
  token, não o projeto.
- **Verificação obrigatória de e-mail no checkout.** Mudaria a jornada de compra inteira e
  não foi pedida. O que existe hoje é o link de definição de senha enviado depois da primeira
  compra confirmada (RN-155).
