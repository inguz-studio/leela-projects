---
tags: [leela, spec, rodada, admin, plataforma, super-admin, tenants, pii, lgpd]
trace: leela-admin-visao-20260809
lote: SPEC-ADMIN-VISAO
data: 2026-08-09
---

# 03-spec · A visão master dos tenants

> Zero código. Toda afirmação sobre o repositório foi medida e o caminho está em
> [[02-inventario-gap-map]]. Quatro histórias novas, seis regras novas, e uma seção única de
> vetáveis no fim para o dono decidir de uma vez.
>
> **Prova de não colisão, e a colisão que houve.** A primeira varredura desta lane achou a faixa
> livre a partir de **RN-530**, com o 5xx terminando em 529. Durante a aterrissagem, a lane
> **RADAR-REPARO-0809** publicou o E20 consumindo **RN-520 a RN-536** — ou seja, a faixa que esta
> spec tinha reservado deixou de estar livre entre a varredura e o commit. As seis regras foram
> **renumeradas de RN-530..535 para RN-537..542** antes do fecho, e a varredura foi refeita: por
> `RN-537` a `RN-560` em `leela-specs`, `apps`, `packages`, `functions` e `firestore.rules`, fora
> desta rodada, **zero ocorrências**. Esta lane consome **RN-537 a RN-542**.
>
> Fica a lição de mecanismo, porque ela vale para toda lane de spec: **varredura de faixa vale no
> instante em que roda**, e com lanes vizinhas em voo o intervalo entre reservar e commitar é onde a
> colisão nasce. A conferência tem de ser refeita imediatamente antes da aterrissagem, não só no
> começo.
>
> Numeração de histórias: a mais alta em uso no E16 é a **S1611** (tornar-se profissional, no
> kanban). Esta lane consome **S1612 a S1615**.

## Parte 1 · O desenho, antes das histórias

### A ficha do tenant é uma tela, não sete

O dono nomeou oito coisas para o drill-down. A tentação é fazer oito rotas. A spec recusa isso por
uma razão de trabalho: ele não abre o painel para consultar "os clubs do Castelo"; ele abre para
**entender uma produtora**, e a pergunta seguinte muda conforme o que a primeira responde. Sete
cliques entre eventos e faturamento é sete oportunidades de perder o fio.

O desenho é **uma rota, `/plataforma/tenants/:tenantId`, com abas**. A rota já existe e já carrega
perfil, owner, quatro KPIs e as ações de lifecycle
(`apps/painel/src/routes/plataforma/tenants/TenantDetailRoute.tsx`). Ela ganha uma `SubNav` e as abas
entram como filhas. Nada do que está no ar é reescrito.

```
/plataforma/tenants/:tenantId              → Resumo (o que já existe hoje + plano + responsável)
/plataforma/tenants/:tenantId/eventos      → eventos do tenant
/plataforma/tenants/:tenantId/clubs        → clubs do tenant
/plataforma/tenants/:tenantId/clientes     → clientes do tenant (via callable)
/plataforma/tenants/:tenantId/vendas       → vendas do tenant
/plataforma/tenants/:tenantId/financeiro   → faturamento + repasses + saldo
/plataforma/tenants/:tenantId/termos       → JÁ EXISTE, entra na SubNav sem mudar
```

O padrão de SubNav já é da casa: a IA-MENU o usa nos hubs do painel do organizador, e a fila de
repasses já mistura duas superfícies numa página. Nada de componente novo.

### As listas globais são duas telas, e a terceira é outra coisa

"Todos os eventos" e "todos os clubs" são a mesma tela duas vezes: coleção raiz, tabela densa,
filtro, paginação, coluna de tenant. Elas nascem juntas e caem na mesma lane.

"Todos os usuários" não é a terceira irmã. É PII concentrada, quatro entidades diferentes por baixo,
e uma decisão de alcance que a frase do dono não toma. Ela tem história própria, entra por último, e
**não sobe sem o veto dele**.

### O que esta spec não faz, e é deliberado

Não propõe automação de juros — a decisão de 09/08 é explícita, e o comportamento vigente já é o que
ele pediu. Não abre nenhuma Security Rule. Não desenha pixel. Não propõe export, CSV nem relatório
enviado por e-mail. E não inventa nenhum número de dinheiro que não esteja gravado: onde o custo do
gateway não existir, a coluna fica **vazia com rótulo**, nunca zero.

## Parte 2 · Regras de negócio novas

Todas donas em [[LEELA-E16-plataforma-superadmin]], faixa RN-537 a RN-542.

### RN-537 · A visão master lê o carimbo, nunca recalcula dinheiro

Toda cifra exibida no painel master deriva do que já está gravado: `conciliacao.taxaValor` e
`conciliacao.repasseOrganizador` por venda (congelados na confirmação — RN-179), `gmvAcumulado` por
tenant, e os agregados de `platform/rollups`. O cliente **não** recompõe taxa, líquido nem receita a
partir de percentual, e **não** soma venda a venda para produzir total.

A consequência que a regra existe para impedir é aritmética e cara. A RN-182 é **mode-aware**: no
modo `incorporada` o líquido do produtor é `face − taxa(meio)`; no modo `repassada` o comprador pagou
a taxa por fora e o líquido do produtor é o **face cheio**. Uma tela que aplicasse `face − taxa` a
todo mundo erraria o número de **todo evento em modo repassada** — e `Evento.taxaModo` existe por
evento, `commercialTerms.modoTaxaDefault` existe por tenant, então a mistura é o caso normal, não a
exceção.

Quando a fonte gravada não existir, o campo aparece **vazio com rótulo explicativo** ("custo não
configurado", "sem termo comercial"), nunca como zero e nunca como estimativa silenciosa. Espelha a
RN-455, que já decidiu isso para a coluna de margem.

**Épico dono:** E16 · **consome:** E09 (RN-179, RN-182, RN-183), E04 (RN-178).

### RN-538 · Agregado macro tem idade declarada, e uma atualização confiável

`platform/rollups` é o único agregado cross-tenant do sistema, e hoje ele tem um único escritor:
`recomputePlatformRollups`, um `https.onCall` **sem nenhum agendamento**. A tela `/plataforma/macro`
mostra o retrato da última vez que alguém clicou, sem dizer que é isso que está mostrando.

Duas metades, e as duas valem:

**A idade é parte do número.** Toda superfície que exiba valor vindo de `platform/rollups` mostra o
`atualizadoEm` ao lado, e sinaliza visualmente quando o retrato passou do limiar de frescor. O
`/plataforma/macro` já imprime `Atualizado em …`; a regra estende isso a toda tela nova e acrescenta
o sinal de obsolescência.

**A atualização deixa de depender de lembrança.** O recompute passa a ter execução agendada, com a
invocação manual preservada. É recompute integral e idempotente por construção (`set()` completo
sobre a varredura de `tenants`), então o agendamento não introduz risco de dupla contagem.

**Épico dono:** E16 · **estende:** RN-409.

### RN-539 · Perfil de cliente cruza a fronteira por servidor, nunca por Rule

`tenants/{tid}/crmClientes/{clienteKey}` é a única coleção tenant-scoped do sistema cujo `allow read`
**omite `isPlatformAdmin()` de propósito** (`firestore.rules:382`), e a própria Rule escreve a razão
no comentário acima dela: é perfil comportamental individual com LTV, e o back-office deve chegar
nele por Admin SDK.

A regra canoniza essa escolha em vez de contorná-la. A visão de clientes do painel master é servida
por **callable com Admin SDK**, autorizado pelo predicado `isPlatformAdmin` do core, e a Rule
permanece exatamente como está. Nenhuma leitura de `crmClientes` pelo client SDK é acrescentada.

O callable devolve os campos que o CRM já minimiza (`nome`, `qtdEventos`, `qtdInscricoes`,
`valorGasto`, `ltv`, `eventos`) e **não** enriquece com nada que o doc não guarda: sem CPF, sem
e-mail, sem telefone, sem endereço. A minimização da RN-172 vale igual do lado do administrador.

**Épico dono:** E16 · **preserva:** RN-172, RN-400.

### RN-540 · O diretório de contas é do administrador, é mínimo e não sai da tela

A visão global de pessoas no painel master obedece a quatro restrições, e nenhuma delas é
negociável por conveniência de tela:

**Escopo.** Só `platform_admin` (conta separada, ADMINSEP/RN-449 — hoje `inguzbuilders@gmail.com`).
Não há modo degradado para outro papel.

**Alcance mínimo.** O diretório mostra as contas que existem em `atletas` e em `profissionais`, com
os campos que essas coleções já guardam. A coleção **`pessoas` permanece fechada** — `read: false`
para todo cliente (`firestore.rules:2688`) — e **CPF não aparece no painel master**. Se o dono quiser
CPF, é decisão dele e vem com abertura própria, justificada e testada; não entra por tabela.

**Sem saída em massa.** Nenhum export, CSV, download ou envio por e-mail. A consulta serve o
trabalho de olhar e agir sobre uma conta; extração de base é outra conversa, e é do dono.

**Rastro.** Toda leitura que atravesse a fronteira por servidor registra acesso, no molde que
`getBankDetailsForPayout` já usa: quem, quando, qual escopo, e a **negativa também** é registrada.

**Épico dono:** E16 · **consome:** RN-449 (conta separada), RN-400/401 · **frente jurídica:** LGPD-1.

### RN-541 · Plano aplicado é estampa, e a tela declara a divergência

Aplicar um plano de cobrança **copia** os números do plano para `commercialTerms/current` e grava
`planoAplicadoId` + `planoAplicadoEm`. Não existe vínculo vivo — o próprio `AplicarPlanoModal` já diz
isso ao administrador na hora de aplicar.

A consequência que ninguém escreveu ainda: se o termo for editado à mão depois, `planoAplicadoId`
continua apontando para um plano que **não descreve mais** o que está cobrando. A ficha do tenant
mostra o plano aplicado **junto** da versão do termo, e quando os números vigentes divergem do plano
estampado, a tela **diz que divergiu** em vez de exibir o nome do plano como se fosse a verdade.

O sinal é de leitura, não de bloqueio: nada impede a edição manual, que é legítima. O que a regra
impede é o dono ler "plano Padrão" e cobrar com número diferente do Padrão.

**Épico dono:** E16 · **consome:** RN-404, RN-178.

### RN-542 · Responsável do tenant · **condicionada ao veto do dono (V-3)**

Existe hoje um único elo de pessoa no tenant: `ownerUid`, que aponta para `profissionais/{ownerUid}`
(`nome`, `email`, e — gravados sem tipagem — `telefone` e `organizacao`). Isso responde "quem é o
dono da conta". Não responde "com quem eu falo sobre esta produtora" quando essas duas pessoas não
são a mesma.

**Se o dono escolher que responsável é o owner** (opção A do V-3), esta RN não nasce: o que falta é
tipagem e exibição, e o trabalho é de tela.

**Se ele escolher um contato próprio** (opção B), a regra passa a valer:
`Tenant.responsavel?: { nome: string; email: string; telefone?: string }`, campo opcional, ausência
significando "o responsável é o owner". Escrita exclusiva do `platform_admin` (RN-404), validação de
e-mail no core, sem coleção nova e sem índice novo. A ficha exibe o responsável e, quando o campo
está ausente, exibe o owner com o rótulo dizendo que é o owner.

**Épico dono:** E16 · **consome:** RN-404.

## Parte 3 · Histórias

### LEELA-S1612 · A ficha do tenant: o que ele produz e para quem

**Job story.** Quando eu abro uma produtora no painel master para entender o que ela está fazendo na
plataforma, eu quero ver os eventos, os clubs e os clientes dela na mesma ficha, para decidir se ela
está saudável sem pedir relatório para ninguém nem abrir o Console.

- **MoSCoW:** Must · **Estimativa:** L · **Superfície:** Painel master · **Épico:** E16
- **RNs:** RN-537, RN-539, RN-400, RN-401, §2.5, §2.12, §2.16
- **Depende de:** REDESIGN-DS (contrato visual do admin — ver [[04-fila-build]])

**Critérios de aceite (Given/When/Then)**

- **Dado** que sou `platform_admin` e abro `/plataforma/tenants/:tenantId`, **quando** a ficha
  carrega, **então** vejo uma SubNav com Resumo, Eventos, Clubs, Clientes, Vendas, Financeiro e
  Termos, e o Resumo é o que já existe hoje.
- **Dado** a aba Eventos, **quando** abro, **então** vejo tabela densa com nome, data, status,
  modalidades, inscritos e receita confirmada, filtrada por `tenantId`, com contador "mostrando X de
  Y" e EmptyState do glossário quando não há evento.
- **Dado** a aba Clubs, **quando** abro, **então** vejo nome, categoria, modalidade, localização,
  visibilidade, modelo de entrada, membros ativos e desafios ativos.
- **Dado** que `modeloEntrada` só admite `gratuito` e `pago_em_breve`, **quando** renderizo a coluna,
  **então** nenhuma linha sugere receita de clube (não existe mensalidade de clube no modelo).
- **Dado** a aba Clientes, **quando** abro, **então** os dados vêm de **callable com Admin SDK**
  (RN-539) e mostram nome, eventos, inscrições, valor gasto e LTV — **sem** CPF, e-mail, telefone ou
  endereço.
- **Dado** que sou `tenant_owner` e não `platform_admin`, **quando** acesso qualquer aba,
  **então** vejo o 403 do `PlatformGuard`, não a ficha.
- **Dado** que o callable de clientes é invocado por quem não é `platform_admin`, **quando** chega,
  **então** é negado e a negativa é registrada.

**Tarefas**

| Task | O que é | Tipo |
|---|---|---|
| `S1612-T1` | SubNav da ficha + rotas filhas dentro de `tenants/[tenantId]`, sem tocar no Resumo existente | screen |
| `S1612-T2` | Leitura por tenant de eventos e clubs no `api-client` (query por `tenantId`, paginada) | api-client |
| `S1612-T3` | Aba Eventos (tabela densa, filtros de status, contador, EmptyState) | screen |
| `S1612-T4` | Aba Clubs (mesma casca, colunas próprias) | screen |
| `S1612-T5` | Callable `listarClientesDoTenant` (Admin SDK, autorizado por `isPlatformAdmin` do core, com registro de acesso e de negativa) — RN-539 | api/function |
| `S1612-T6` | Aba Clientes consumindo o callable; nenhum campo além do que `crmClientes` guarda | screen |
| `S1612-T7` | Teste de Rules: `platform_admin` **continua negado** em `crmClientes` pelo client SDK (o canário que hoje não existe) | integration |

**Fora de escopo.** Qualquer contato do cliente (e-mail/telefone) — é vetável V-2. Ação sobre evento
ou clube a partir da ficha; esta história é leitura.

---

### LEELA-S1613 · A ficha do tenant: a economia dele

**Job story.** Quando eu preciso saber quanto uma produtora gerou, quanto eu ganhei com ela e quanto
ela tem a receber, eu quero os três números na mesma tela com a régua declarada, para decidir preço e
repasse sem montar planilha e sem desconfiar do número.

- **MoSCoW:** Must · **Estimativa:** L · **Superfície:** Painel master · **Épico:** E16
- **RNs:** RN-537, RN-538, RN-541, RN-182, RN-179, RN-455, RN-356
- **Depende de:** S1612-T1 (SubNav), REDESIGN-DS

**Critérios de aceite (Given/When/Then)**

- **Dado** a aba Vendas, **quando** abro, **então** vejo tabela densa com código do pedido, data,
  responsável, forma, parcelas, valor final, taxa da plataforma e líquido do produtor — **todos lidos
  de `conciliacao`**, nenhum recalculado no cliente (RN-537).
- **Dado** uma venda de evento em modo `repassada`, **quando** renderizo a coluna de líquido,
  **então** exibo o **face cheio** e não `face − taxa` (RN-182 mode-aware).
- **Dado** um pagamento sem `conciliacao` (pendente, falhado), **quando** renderizo, **então** as
  colunas de economia ficam vazias com rótulo, nunca zero.
- **Dado** a aba Financeiro, **quando** abro, **então** vejo o GMV e a receita Leela do tenant vindos
  de `platform/rollups`, com o `atualizadoEm` ao lado e o sinal de obsolescência quando o retrato
  passou do limiar (RN-538).
- **Dado** que o rollup está obsoleto, **quando** olho a tela, **então** consigo disparar o recompute
  dali mesmo e o número atualiza.
- **Dado** a aba Financeiro, **quando** abro, **então** vejo o `SaldoRepasse` do tenant — vendido
  bruto, retido, disponível, comprometido, dentro da janela D+N e eventos sem termo — e a lista de
  repasses dele com as mesmas ações da fila global.
- **Dado** um repasse em estado `pago`, **quando** renderizo, **então** a tela diz que "pago" é
  registro manual, sem transferência bancária pelo sistema (RN-356).
- **Dado** que o custo do gateway não está configurado, **quando** olho qualquer coluna de margem,
  **então** ela mostra "custo não configurado" e **não** um número (RN-455, RN-537).
- **Dado** o Resumo da ficha, **quando** abro, **então** vejo o plano de cobrança aplicado com a
  versão do termo; **e quando** o termo divergiu da estampa do plano, **então** a tela declara a
  divergência (RN-541).

**Tarefas**

| Task | O que é | Tipo |
|---|---|---|
| `S1613-T1` | Leitura por tenant de `pedidos` + `pagamentos` no `api-client` (paginada, por `tenantId`) | api-client |
| `S1613-T2` | Aba Vendas — colunas de economia lidas do carimbo, mode-aware, vazio com rótulo ⚔ | screen |
| `S1613-T3` | Agendamento do `recomputePlatformRollups` + `atualizadoEm` como parte do contrato de leitura — RN-538 | api/function |
| `S1613-T4` | Aba Financeiro: bloco de faturamento (rollup + idade + recompute manual) ⚔ | screen |
| `S1613-T5` | Aba Financeiro: bloco de repasses e saldo do tenant, reusando `RegistrarPagamentoModal` e os callables existentes | screen |
| `S1613-T6` | Plano aplicado + detecção de divergência entre termo vigente e estampa — RN-541 | screen |

⚔ = território de dinheiro: rota opus com review antagonista.

**Fora de escopo.** Custo real, margem e economia do parcelamento — são a **S1610**, que já está
especificada e continua sendo dona disso. Esta história **consome** o que a S1610 entregar e, sem
ela, mostra o estado "custo não configurado". Antecipação de recebíveis, que segue pós-V1 (RN-410).

---

### LEELA-S1614 · Todos os eventos e todos os clubs do sistema

**Job story.** Quando eu quero saber o que está acontecendo na plataforma inteira, e não numa
produtora, eu quero varrer todos os eventos e todos os clubs numa lista só, para achar o que precisa
da minha atenção sem abrir tenant por tenant.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Painel master · **Épico:** E16
- **RNs:** RN-400, RN-401, §2.5, §2.12, §2.16
- **Depende de:** REDESIGN-DS

**Critérios de aceite (Given/When/Then)**

- **Dado** que sou `platform_admin` e abro `/plataforma/eventos`, **quando** a lista carrega,
  **então** vejo todos os eventos do sistema com coluna **Tenant**, e a leitura passa pela Rule que
  já permite (`firestore.rules:744`) — sem Rule nova e sem `collectionGroup`.
- **Dado** a lista, **quando** filtro por status ou por tenant, **então** o resultado e o contador
  acompanham.
- **Dado** que a lista é paginada, **quando** há mais itens do que a página, **então** o contador diz
  a verdade sobre o que está sendo mostrado e **nunca** apresenta um total truncado como se fosse o
  total do sistema.
- **Dado** uma linha, **quando** clico, **então** vou para a ficha do tenant dono do evento.
- **Dado** `/plataforma/clubs`, **quando** abro, **então** vejo a mesma mecânica para clubs.
- **Dado** que não sou `platform_admin`, **quando** acesso qualquer das duas, **então** 403.

**Tarefas**

| Task | O que é | Tipo |
|---|---|---|
| `S1614-T1` | Leitura global paginada de `eventos` e `clubes` no `api-client`, com contagem honesta | api-client |
| `S1614-T2` | Tela `/plataforma/eventos` (tabela densa, filtros, coluna Tenant, paginação) | screen |
| `S1614-T3` | Tela `/plataforma/clubs` | screen |
| `S1614-T4` | Dois itens novos no `PLATFORM_NAV` + ícones Lucide + `activeNavId` | screen |

**Fora de escopo.** Ação sobre evento ou clube a partir da lista global. Listagem de inscritos ou de
membros cross-tenant — **não tem caminho pelo cliente** (não há Rule de `collectionGroup`, e a
subcoleção de clube é fechada até para admin em `firestore.rules:2464`); se um dia for pedida, é
backend e é história própria.

**A armadilha nomeada, para quem construir.** Os índices `COLLECTION_GROUP` **existem** em
`firestore.indexes.json` para `inscritos`, `membros` e outros — servindo consumidores server-side. As
Rules **não** têm nenhuma regra de collection group. Uma tentativa de `collectionGroup()` no painel
devolve `permission-denied`, e o erro vai parecer problema de índice. Não é. Não crie regra de CG
para contornar: seria abrir leitura de dado por um caminho novo, o que a própria base de código já
recusou por escrito.

---

### LEELA-S1615 · O diretório de contas no painel master

**Job story.** Quando alguém se cadastra na Leela e some do meu radar, eu quero ver essa pessoa no
painel master e agir sobre ela dali, para liberar acesso sem abrir o Console do Firebase, que é
ferramenta de engenharia.

- **MoSCoW:** Must (a metade da fila) / Should (o diretório completo) · **Estimativa:** M ·
  **Superfície:** Painel master · **Épico:** E16
- **RNs:** RN-540, RN-449, RN-400, RN-401, RN-510 (tensão declarada), RN-414
- **Depende de:** **veto do dono nos itens V-4 e V-5** · REDESIGN-DS
- **Origem dupla:** esta ordem ("preciso ter a visão de todos os usuários") **e** a decisão
  ADMIN-USUARIOS-1 de 09/08 ("esse cadastro deve aparecer no painel master")

**O desenho: uma tela, dois modos**

As duas ordens pedem coisas que se sobrepõem sem serem iguais. Construir duas telas duplica lista de
pessoas no mesmo painel. Construir uma tela só, sem separar os modos, transforma diretório em painel
de ação e expõe mais gente do que o trabalho exige.

A saída é **uma rota com dois modos**, e o modo padrão é o mais fechado:

- **Modo Fila** (padrão): só contas em `statusOnboarding: 'aguardando_convite'`. É o recorte da
  ADMIN-USUARIOS-1 — quem está esperando. Traz as ações: emitir código (já existe em
  `/plataforma/convites`) e liberar acesso diretamente.
- **Modo Diretório**: todas as contas. É o recorte desta ordem. É **leitura**, sem ação em massa.

**Critérios de aceite (Given/When/Then)**

- **Dado** que sou `platform_admin` e abro `/plataforma/contas`, **quando** carrega, **então** o modo
  Fila está ativo e vejo só quem aguarda liberação.
- **Dado** o modo Fila, **quando** olho uma linha, **então** vejo nome, e-mail, organização, telefone
  e quando se cadastrou — a PII que o trabalho de liberar exige, e nada além.
- **Dado** o modo Diretório, **quando** ativo, **então** vejo as contas de `atletas` e de
  `profissionais` com o papel de cada uma, e **nenhuma linha mostra CPF** (RN-540).
- **Dado** qualquer modo, **quando** procuro por export, CSV ou download, **então** não existe
  (RN-540).
- **Dado** que não sou `platform_admin`, **quando** acesso, **então** 403.
- **Dado** que libero uma conta diretamente, **quando** confirmo, **então** a operação passa por
  Function, o acesso é registrado, e a pessoa sai da vitrine sem ter digitado código.
- **Dado** que a pessoa está com a tela da vitrine aberta quando eu libero, **quando** ela interage,
  **então** o produto se comporta conforme a resposta do dono ao V-5 (ver vetáveis) — esta spec
  **não** escolhe.

**Tarefas**

| Task | O que é | Tipo |
|---|---|---|
| `S1615-T1` | Leitura do diretório: `profissionais` + `atletas`, paginada, campos mínimos — RN-540 | api-client |
| `S1615-T2` | Tela `/plataforma/contas` com os dois modos, Fila como padrão | screen |
| `S1615-T3` | Liberação direta como Function guardada, com registro de acesso e de negativa | api/function |
| `S1615-T4` | Delta na RN-510 conforme a resposta do V-5 (o gatilho do aviso e a saída sem resgate) | spec + screen |
| `S1615-T5` | Teste de Rules com crachá de `platform_admin`: `pessoas` segue negada, e `collectionGroup` segue negado | integration |

**Fora de escopo.** CPF no painel (V-4 do dono). Qualquer export. Edição de dado pessoal de terceiro
pelo administrador. A frente jurídica continua sendo o **LGPD-1**, que é do dono e não desta lane.

## Parte 4 · A dívida que a rodada encontrou e não conserta

Registrada aqui para não virar surpresa de quem construir, e para não pegar carona em história de
produto.

**A claim de administrador tem duas leituras que não conversam.** As Security Rules aceitam **as
duas** pernas (`role == 'platform_admin'` **ou** `platformAdmin == true` —
`firestore.rules:73-77`), e o core faz o mesmo (`isPlatformAdmin`,
`packages/core/src/platform/roles.ts:131`). Mas quase toda guarda de callable compara
`claims.role !== 'platform_admin'` na mão: `assertPlatformAdmin`
(`functions/src/finance/atores.ts:45`), `aplicarPlano`, `setTaxaPlataformaGlobal`,
`transitionTenant`, `provisionTenant`, `recomputePlatformRollups`. Só `setPlatformAdminCapability`
usa o predicado.

O efeito prático: uma conta que tenha **capacidade** e não o papel legado **lê** tudo pelas Rules e
**é barrada** em quase toda escrita de plataforma. Telas carregam, ações falham, e o erro não explica
por quê. Isso não bloqueia esta spec — a conta do dono tem o papel legado —, mas encosta em toda
história daqui, porque cada uma acrescenta leitura e ação na mesma superfície. Vira item próprio em
[[04-fila-build]].

## Parte 5 · Vetáveis consolidados — o dono decide de uma vez

> Cinco decisões. Três são de PII, uma é de modelo, uma é de mecanismo. Nenhuma delas tem default
> silencioso em vigor: onde há default proposto, ele está marcado, e onde não há, está escrito que
> não há. Nada desta lista sobe sem resposta.

### V-1 · Dinheiro · o que "faturamento gerado" quer dizer na tela

A palavra `faturamento` **não existe no código** — nem como campo, nem como função. O que existe são
quatro números diferentes, e três deles já estão gravados: `gmvAcumulado` (valor de face confirmado
do tenant), `receitaLeela` (`GMV × taxa`, receita **bruta** da plataforma) e o líquido do produtor
carimbado por venda. O quarto — a receita da plataforma **depois** do custo do gateway — **não existe
em lugar nenhum**: `custoGateway`, `custoReal`, `receitaPlataforma` e qualquer cálculo de margem têm
zero ocorrências no código.

- **Caso de uso:** você abre a ficha do Castelo para decidir se a taxa dele está certa. A tela diz
  "faturamento gerado: R$ 120 mil". Se isso for GMV, é o que os compradores pagaram e não tem nada a
  ver com o que sobrou para você. Se for receita Leela, é o que você faturou antes de pagar o
  gateway. Os dois números são verdadeiros e levam a decisões opostas.
- **Job story:** quando eu olho uma produtora para decidir preço, eu quero saber exatamente qual
  dinheiro cada número representa, para não negociar taxa olhando para a cifra errada.
- **O que fica com você:** qual dos três a ficha chama de "faturamento gerado" — e se a tela mostra
  os três com nomes distintos.
- **Opções:** exibir **os três, nomeados** — GMV do produtor, receita da plataforma (bruta) e líquido
  do produtor —, com a coluna de margem vazia e rotulada "custo não configurado" até a S1610 subir
  (**default proposto**, porque não esconde nem inventa) · exibir **só GMV**, e deixar receita e
  margem para depois da S1610 · esperar a S1610 inteira antes de qualquer número de faturamento na
  ficha, o que atrasa os dez outros itens por causa de um.
- **Onde aterrissa:** RN-537; `S1613-T4`.

### V-2 · PII · a visão de clientes mostra contato, ou só comportamento

O CRM guarda, de propósito, **muito pouco** de cada cliente: nome, gênero, nascimento, quantidade de
eventos e inscrições, valor gasto e LTV. Não guarda CPF, e-mail, telefone, cidade, endereço, contato
de emergência nem restrição médica, e o `docId` é hash. Isso é a RN-172, e é desenho, não sorte.

O contato existe em outro lugar: `pedidos.responsavel` tem e-mail e telefone, e
`inscritos.dadosPessoais` tem CPF, telefone, nascimento, cidade e UF.

- **Caso de uso:** você abre a aba Clientes do Castelo para entender quem compra dele. Se a tela
  mostrar só comportamento, você vê padrão de consumo e não vê pessoa. Se mostrar contato, o painel
  master passa a ser uma agenda de e-mails e telefones de todos os participantes de todos os
  produtores, num lugar só.
- **Job story:** quando eu analiso a base de uma produtora, eu quero entender o comportamento de
  compra dela sem virar depositário do contato de gente que nunca falou comigo.
- **O que fica com você:** se a aba Clientes é comportamento ou é contato.
- **Por que agora:** as duas custam a mesma tela e fronteiras completamente diferentes. Comportamento
  usa o callable sobre `crmClientes` e não abre nada. Contato exige ler `pedidos` e `inscritos`
  cross-tenant, o que a Rule já permite, e concentra PII de participante no painel master — que é
  frente do **LGPD-1**.
- **Opções:** **só comportamento**, sobre `crmClientes` (**default proposto** — atende "clientes" com
  a menor superfície de PII possível, e não fecha porta nenhuma) · comportamento **e** contato, com
  o contato entrando como frente do LGPD-1 antes de subir · comportamento agora, contato como item
  separado quando você tiver um caso de uso concreto.
- **Onde aterrissa:** RN-539; `S1612-T5`, `S1612-T6`. Frente jurídica: **LGPD-1**.

### V-3 · Modelo · "responsável" é o dono da conta, ou é outra pessoa

Hoje o tenant tem `ownerUid` e nada mais de pessoa. A ficha já mostra o nome do owner. Telefone e
organização **já estão gravados** no doc do profissional, sem estarem no tipo.

- **Caso de uso:** o Castelo tem a Marina como dona da conta, mas quem responde sobre nota fiscal e
  repasse é o financeiro da produtora. Você precisa falar com o segundo e a tela só conhece a
  primeira.
- **Job story:** quando eu preciso resolver algo de uma produtora, eu quero saber com quem falar,
  para não descobrir depois de duas mensagens que a pessoa da conta não é a pessoa do assunto.
- **O que fica com você:** se "responsável" é o owner ou é um contato próprio.
- **Opções:** **é o owner** — nada de campo novo, o trabalho é tipar `telefone`/`organizacao` e
  exibir (**default proposto**, porque é o que o dado já diz e custa uma tela) · é um **contato
  próprio**, e nasce `Tenant.responsavel?: { nome, email, telefone? }`, opcional, ausência
  significando "é o owner", escrita só do `platform_admin` — campo novo, mas mínimo.
- **Onde aterrissa:** RN-542 (só nasce na opção B); `S1612` ou tarefa própria conforme a resposta.

### V-4 · PII · o diretório de contas mostra CPF

A coleção `pessoas` guarda **CPF em claro** e é cross-tenant. As Rules a fecham para **todo mundo**,
inclusive para o `platform_admin` (`firestore.rules:2688`). Isso não é omissão: é a escolha mais
conservadora do arquivo inteiro.

- **Caso de uso:** duas pessoas se cadastram com nomes parecidos e você precisa saber se são a mesma.
  Com CPF, a resposta é imediata. Sem CPF, você compara e-mail e telefone e às vezes não resolve.
- **Job story:** quando eu vou liberar o acesso de alguém, eu quero ter certeza de quem é a pessoa,
  para não liberar a conta errada.
- **O que fica com você:** manter `pessoas` fechada, ou abrir uma leitura de CPF para o painel
  master.
- **Por que agora:** abrir depois é a mesma decisão com uma tela já construída em cima, e a fronteira
  fica mais difícil de defender quando alguém já se acostumou a ver o número.
- **Opções:** **manter fechada** — o diretório usa nome, e-mail, telefone e organização (**default
  proposto**, e é o que a base de código já decidiu por escrito) · abrir leitura de CPF **só** por
  callable auditado, com registro de cada consulta, no molde de `getBankDetailsForPayout` · abrir a
  Rule para `platform_admin` — a opção mais barata de construir e a mais cara de defender, porque
  transforma a coleção de CPF do sistema inteiro em leitura de painel.
- **Onde aterrissa:** RN-540; `S1615-T1`, `S1615-T5`. Frente jurídica: **LGPD-1**.

### V-5 · Mecanismo · o que "tenta fazer alguma ação" quer dizer, e como a liberação direta termina

Esta pergunta veio da sua própria decisão de 09/08 (ADMIN-USUARIOS-1) e o registro daquele dia já
disse que ela viria a spec. Não é pergunta nova; é a mesma, com o custo medido.

A **RN-510**, que está no ar, diz que a conta sem código entra em vitrine e o aviso sobe na
**primeira interação** — contando como interação qualquer gesto sobre algo acionável, botão, link,
item de menu ou campo, inclusive por teclado; fechado, ele rearma. Sua frase foi "depois que a pessoa
já entra no sistema e tenta fazer alguma ação".

- **Caso de uso:** a pessoa entra, navega pelo menu para conhecer o painel e não clica em nada que
  faça coisa alguma. Pela regra em vigor, o aviso já subiu no primeiro item de menu. Pela leitura
  estrita da sua frase, ele só sobe quando ela tentar uma ação **bloqueada**.
- **Job story:** quando eu chego num sistema novo sem acesso liberado, eu quero entender o que fazer
  sem ser interrompido antes de ter olhado nada.
- **O que fica com você:** duas perguntas ligadas.
  **(a)** "Ação" é qualquer gesto (ratifica a RN-510 como está, custo zero) ou é ação **bloqueada**
  (muda P11 e P14 e derruba parte do que a review de 08/08 mediu)?
  **(b)** Quando você libera alguém **diretamente**, sem código: o que tira a conta da vitrine, o que
  o aviso passa a dizer para quem espera liberação em vez de código, e como a tela descobre que foi
  liberada sem a pessoa recarregar?
- **Opções para (a):** ratificar a RN-510 (**default proposto** — é o que está no ar, foi medido, e
  sua frase cabe nela) · restringir a ação bloqueada, com o custo de reescrever P11/P14.
- **Opções para (b):** **sem default proposto.** A liberação direta é caminho que a RN-510 não prevê,
  e inventar o comportamento aqui seria decidir por você numa superfície que você acabou de rever.
- **Onde aterrissa:** delta na RN-510 em [[LEELA-E16-plataforma-superadmin]]; `S1615-T3`, `S1615-T4`.
