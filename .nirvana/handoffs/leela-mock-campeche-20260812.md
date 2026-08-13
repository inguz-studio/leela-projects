# MOCK-CAMPECHE — `[Mock] - Campeche Run` no emulador

- **Trace:** `leela-redesign-v2-20260810` · lane `MOCK-CAMPECHE`
- **Commit:** `98b414f7` em `main` (pushed) — 5 arquivos, só script/config
- **Pedido do dono (12/08):** *"estou com um pouco de dificuldade de validar gráficos e telas, pois não estamos com dados mockados, conseguiria mockar eles em um evento [Mock] - Campeche Run"*

## Como subir e derrubar

```bash
# subir tudo (emulador + seed + painel). Devolve o terminal.
cd /c/dev/LEELA && bash scripts/mock-campeche.sh up

# derrubar tudo
cd /c/dev/LEELA && bash scripts/mock-campeche.sh down

# ver o que está de pé (inclui a :4601, que este script nunca toca)
cd /c/dev/LEELA && bash scripts/mock-campeche.sh status
```

Depois de um reboot, `up` refaz o seed do zero e reaproveita o bundle já
buildado (~3 min). Se mexer no código do painel, `bash scripts/mock-campeche.sh up --rebuild`
força o build de novo (~10 min nesta máquina).

## URL e contas

O painel **não tem tela de login** — a autenticação real é de outra superfície.
A sessão entra pelo `?preview=` da URL (auto-login do emulador). É por isso que
o link importa mais que a senha.

| Quem | Link | Conta |
|---|---|---|
| Organizador (Marina Castelo, dona do tenant do mock) | http://localhost:4602/?preview=castelo | `marina@demo-leela.dev` · `demo1234` |
| Admin da plataforma (as telas novas do admin) | http://localhost:4602/plataforma?preview=admin | `admin@demo-leela.dev` · `demo1234` |

Emulator UI (dado cru): http://127.0.0.1:4011

⚠️ As duas contas existem **só no Auth do emulador**, criadas pelo seed a cada
`up`. Não são conta de demonstração no produto — ver a distinção com o
ADMINSEP-3 no fim deste documento.

## O que o mock tem

Evento `[Mock] - Campeche Run` (rótulo do dono preservado), prova em 26/09/2026,
Campeche — Florianópolis/SC, **336 inscritos para 360 vagas** (93%, acima do
limiar de 90% que acende o alerta de lotação):

- **Vendas no tempo:** 336 inscrições espalhadas nos últimos 120 dias até hoje,
  o que dá as duas janelas que a tendência de inscrições compara (7d vs 7d).
- **PIX nos três estados:** confirmado, pendente (cobrança viva, dentro dos 30
  min da RN-157) e vencido (cancelado com `pix_expirado`).
- **Cartão:** 1×, 2×, 3×, 4×, 6×, 10× e 12×, com juros vindos do termo do tenant.
- **Estornos:** 2 pedidos estornados com a trilha completa de reembolso
  (solicitado → aprovado → estornado) na aba *Reembolsos e transferências*.
- **Inscritos:** nome, CPF válido, nascimento, gênero, telefone e contato de
  emergência. **121 com kit retirado e check-in.**
- **Bairros de Florianópolis** (Campeche, Rio Tavares, Morro das Pedras,
  Armação, Ribeirão da Ilha, Lagoa…) no endereço do pagador — ver a ressalva
  sobre geografia abaixo.
- **Lotes, kits e modalidades:** 9 lotes (3 modalidades × promocional encerrado
  / lote 2 vigente / lote final futuro), 4 kits e 1 item tamanhado com 6 tamanhos.
- **Clube com os 3 pilares:** 3 clubes da Marina em modalidades distintas
  (Corrida de rua · Trail · Bem-estar/Yoga), 47 membros e **308 registros de
  jornada** nos pilares físico, mental e espiritual.

**Nenhum agregado é chumbado.** Receita, contagens, demografia, aprovisionamento,
CRM e progresso por pilar saem das MESMAS rotinas que a Cloud Function roda em
produção. Rodar o seed 2× não duplica nada: docIds fixos e instantes ancorados
no dia civil — conferido três vezes, com os mesmos números.

## Telas conferidas renderizadas

Screenshots em `outputs/leela-mock-campeche-20260812/shots/`. Zero erro de
console em todas.

| Tela | Arquivo | O que está aceso |
|---|---|---|
| Visão geral | `01-visao-geral.png` | Indicadores (1.135 inscrições, **↑86,7% vs. 7 dias**, R$ 217.057, 685 vagas), Próximo evento, Clubs (57 membros · 4 desafios), Agenda, **Ocupação com o `[Mock] - Campeche Run` 336/360** |
| Engajamento | `02-engajamento.png` | **Equilíbrio dos pilares: Físico 375,0 · Mental 252,8 · Espiritual 181,2**, Situação dos membros (5/56/4), Como a comunidade entra (23/22/20), 5 clubs · 61 membros ativos · 4 desafios · 62 participações |
| Financeiro do evento | `03-financeiro-evento.png` | Receita total **R$ 49.780**, disponível para repasse R$ 37.870, **barra "Inscrições por modalidade"** (112/112/112) e **donut "Receita por modalidade"** (21k R$ 21.780 · 10k R$ 16.000 · 5k R$ 12.000) |
| CRM · Análise de vendas | `04-crm-analise.png` | **Faixa etária** (8 faixas, 36–39 cada), **Sexo** (299 compradores: 97/103/99), **cohort idade × sexo desenhado inteiro** — o mock foi dimensionado para passar o k-anonimato (k=5) em vez de nascer censurado |
| Admin da plataforma | `06-plataforma-admin.png` | Lista de tenants (6: 4 ativos · 1 aguardando · 1 suspenso) com saúde, eventos e GMV, e a navegação completa do admin |

## ⛔ Zero escrita em produção

- O emulador roda no projeto `demo-leela`, em bloco de portas próprio
  (`firebase.mockcampeche.json`: Firestore 8280 · Auth 9298 · Functions 5301 ·
  Storage 9399 · UI 4011 · hub 4411).
- O build do painel usa `--mode mock-emulador`, e o `.env.mock-emulador` **não
  carrega nenhuma credencial do `leela-hub`** — só `VITE_USE_EMULATOR=true` e
  endereços de loopback.
- Todo seed passa pelo guard `assertEmulatorOnly`, que aborta sem
  `FIRESTORE_EMULATOR_HOST`.
- A `:4601` não foi tocada: o mock builda em `apps/painel/dist-mock-campeche`,
  e o `dist/` que a :4601 serve continua com o carimbo de 12/08 12:44.

## ⚠️ Distinção com o ADMINSEP-3 ("não é pra ter admin demo")

Aquela decisão proíbe **conta de demonstração no produto/produção**. As contas
`marina@demo-leela.dev` e `admin@demo-leela.dev` existem só dentro do Auth do
emulador local, nascem e morrem com o `up`/`down`, e não têm par em produção.
São ferramenta de desenvolvimento, não conta demo. Nada aqui reabre o ADMINSEP-3.

## Ressalvas honestas — o que o mock NÃO consegue acender

O brief pedia gráfico de vendas no tempo, de formas de pagamento e de geografia
do CRM. Fui atrás do código: **esses gráficos não existem no painel hoje.** Não
é falta de dado, é tela que ainda não foi construída — e nenhum seed resolve:

1. **Formas de pagamento (PIX × cartão)** — a Visão geral e a Engajamento
   mostram um card fixo *"Em breve"*. O texto do próprio produto explica:
   nenhum agregado por forma de pagamento chega ao cliente. O dado do PIX e do
   cartão existe por pagamento (visível no slide-in de um inscrito), mas não há
   soma por forma em lugar nenhum.
2. **Presença por semana** — card fixo *"Em breve"*: o clube não registra
   presença; o único check-in é o do QR na largada.
3. **Vendas no tempo (série por data)** — o financeiro do evento tem **dois**
   gráficos, ambos por modalidade. Não há série temporal. No CRM, o filtro de
   *Período* está inerte de propósito: a própria tela avisa que os blocos somam
   agregados acumulados e que o recorte por período passa a valer quando houver
   histórico datado.
4. **Geografia (bairro/cidade)** — não existe gráfico geográfico no painel do
   organizador. `bairro` só aparece como **campo de texto** na ficha do cliente
   da área de plataforma (`obterFichaDoCliente`, só platform_admin). Semeei os
   bairros do Campeche lá, mas não há mapa nem distribuição para acender.
5. **Taxa de conversão / sparkline** — o servidor devolve `null` e `[]` por
   construção (não há dado de visitas). Fica em "—" mesmo com dado.
6. **Estornos** — existem e aparecem, mas em **tabela** (aba *Reembolsos e
   transferências*), não em gráfico.

Se o dono quiser esses gráficos, é trabalho de produto (backend de série
temporal + tela), não de mock.

## Achados que valem para além desta lane

1. **`capacidade` é o que acende a Ocupação.** É campo do evento e os eventos
   canônicos do seed base não o trazem — por isso o bloco parecia quebrado. O
   mock define `capacidade: 360` e a barra aparece.
2. **O relógio do painel é o real, não o `LEELA_CLOCK`.** `LEELA_CLOCK=2026-03-15`
   só é lido pelo checkout, sob o Functions Emulator. O dataset canônico do
   preview foi desenhado para março/2026 e hoje cai inteiro no passado: a
   tendência de inscrições zera e o feed de atividade recente morre. Este seed
   ancora em hoje de propósito.
3. **⛔ `JAVA_TOOL_OPTIONS` corrompe o rules runtime.** A JVM imprime
   "Picked up JAVA_TOOL_OPTIONS: …" na saída padrão de todo processo Java,
   inclusive o rules runtime, cujo handshake o firebase-tools lê por ali. Dá
   `Unexpected rules runtime error` + `firestore: Fatal error occurred`, e com o
   rules runtime morto **toda leitura de cliente é negada**: a tela fica girando
   com os blocos vazios, sem erro visível. **O `preview.sh` exporta essa
   variável e carrega o mesmo defeito** — vale conferir por lá.
4. **⛔ Semear com gatilhos ativos é inviável.** Cada inscrito dispara 6
   Functions e cada uma faz recompute completo do evento (~15s). Os ~800
   inscritos viram horas de fila e saturam a máquina. O script desliga os
   gatilhos pelo hub (`PUT :4411/functions/disableBackgroundTriggers`) durante o
   seed e religa depois.
5. **⛔ `firebase emulators:export` não distingue emuladores do mesmo projeto.**
   O CLI acha o emulador pelo hub indexado por *project id*. Com outra lane
   rodando `preview.sh` no mesmo `demo-leela`, o export saiu do emulador do
   vizinho — e como ele tinha o mesmo seed base, o arquivo **parecia certo** e
   vinha sem o Campeche inteiro. Falar com o hub por porta fixa não tem essa
   ambiguidade.
6. **`receitaPorModalidade` não tem Function dona.** O donut de receita por
   modalidade depende desse campo e nenhuma Cloud Function o escreve — ele
   precisa ser injetado por cima do `financeiro/current`. É dívida de backend.

## Nota de ambiente

A máquina estava com **três outras lanes rodando de worktrees**
(`leela-wt-responsivo`, `leela-wt-subnav`, `leela-wt-controles-c0`) e chegou a
**0,0 GB de RAM livre**. Nada foi derrubado: o mock ganhou bloco de portas
próprio justamente para conviver. O gate visual precisou sair pelo Playwright
(headless) porque a extensão do Chrome não conseguia injetar script na página
sob essa pressão de memória — as capturas são do navegador de verdade, com a
página renderizada.
