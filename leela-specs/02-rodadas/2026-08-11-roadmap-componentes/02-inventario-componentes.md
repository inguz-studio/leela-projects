# Inventário componente ↔ tela — a medição

> Paga **S005-T2** do épico `LEELA-E01-design-system`. Medido em `main` @ `b0f979e5`, com o
> redesign inteiro dentro. Medir antes do merge seria medir tela morta, e essa era a condição de
> disparo da lane.
>
> Escopo varrido: `apps/painel/src` (344 arquivos `.tsx`, 205 fora de `__tests__/`),
> `apps/landing` (132 `.tsx`) e `packages/design-system/src` (50 componentes). Método: ripgrep com
> padrão explícito, depois leitura dirigida para classificar. Todo número abaixo tem arquivo e
> linha por trás.

## 1. O resultado em uma tabela

| Classificação | Instâncias | O que quer dizer |
|---|---|---|
| **Conforme** | 237 arquivos importam componente do DS (208 no painel, 29 na landing) | o padrão tem canônico e a tela usa |
| **Divergente** | **223 instâncias** | o padrão tem canônico publicado e a tela reconstruiu à mão |
| **Sem cânone** | **106 instâncias** em layout composto, mais 4 famílias órfãs | não há canônico contra o que reprovar |

O total de 223 divergências se divide assim:

| Família | Instâncias | Onde |
|---|---|---|
| Cartão e superfície reconstruídos à mão | **192** | 141 no painel (86 arquivos), 51 na landing (37 arquivos) |
| Botão e CTA replicando variante publicada | **17** | 5 no painel, 12 na landing |
| Estado vazio artesanal | **8** | painel |
| Controle nativo cru com canônico publicado | **5** | 2 no painel, 1 na landing, **2 dentro do próprio DS** |
| Typeahead sem `Combobox` | **1** | painel |

## 2. A correção que a medição impôs

O handoff `leela-redesign-ajustes-dono.md` registrou "cerca de 40 telas legadas com background cru
sob o filme glass", e esse número virou a prova da tarefa S005-T2 no board e no épico. **A
varredura não o confirma, e a diferença importa mais que o número.**

Background cru literal — `bg-white`, `bg-gray-*`, `bg-slate-*`, `bg-neutral-*`, `bg-zinc-*`,
`bg-black`, `bg-[#hex]` — tem **zero ocorrências** no painel e **zero** na landing. As 199
ocorrências de `bg-[var(--…)]` no painel (98 arquivos) foram auditadas uma a uma, sem amostragem:
**100% apontam para token semântico** (`surface-raised`, `surface-base`, `surface-overlay`,
`surface-sunken`, `surface-high`, `feedback-*-surface`, `action-*`, `border-*`), nenhuma para
primitivo. O único `style={{ background }}` inline do painel
(`crm/visao-geral/CohortIdadeSexo.tsx:77`) também resolve para token.

O gate de marca está verde e não está mentindo. **O defeito é outro, e é exatamente o que a L-021
descreve.** O mesmo trio de classes arbitrárias — `rounded-[var(--card-radius)]` +
`bg-[var(--surface-raised)]` + `p-[var(--spacing-5)]` — foi reescrito à mão **192 vezes** em vez de
`<Card>`. Tokens corretos, marca conforme, procedência errada. Um combobox artesanal construído
100% com tokens passa nos três gates antigos: aqui está ele, 192 vezes, na forma de cartão.

Correção a aplicar na aterrissagem: a prova de S005-T2 no épico e o texto do card no kanban
trocam "cerca de 40 telas com superfície crua" por "192 superfícies reconstruídas à mão em 123
arquivos". O número é maior e a natureza é diferente.

## 3. Controle nativo cru — 5 instâncias

A notícia boa vem primeiro, porque ela muda a leitura do resto: a §8 shadcn-first **pegou**. Zero
`<input>` cru, zero `<textarea>` cru, zero `type="checkbox"`, `type="radio"` ou `type="file"`
nativos no painel. Zero `<select>` na landing. Zero menus artesanais (`role="menu"`,
`role="listbox"`, painel flutuante com `absolute` + `z-index` fora do DS) nos dois apps. A varredura
de 2026-07-19 e o SHADCN-SWEEP fizeram o trabalho e ele se manteve.

O que sobrou:

| arquivo:linha | O que é | Canônico |
|---|---|---|
| `apps/painel/src/routes/plataforma/tenants/ProvisionTenantModal.tsx:150-158` | `<select>` cru + dois `<option>` (156, 157) | `Select` (baixa cardinalidade) |
| `apps/painel/src/routes/plataforma/convites/ConvitesView.tsx:142-148` | `<Input type="date">` — o calendário do sistema operacional, proibido pela governança §8 | `DateField` do próprio painel, que existe **para isto** |
| `apps/landing/app/(public)/[eventSlug]/ShareBlock.tsx:47` | `<input readOnly>` de link copiável | `Input` |
| `packages/design-system/src/components/Modal/ConfirmModal.tsx:198` | `<textarea>` cru **dentro do DS** | `Textarea`, que o DS publica |
| `packages/design-system/src/components/Modal/ConfirmModal.tsx:226-228` | `<input type="checkbox">` cru **dentro do DS** | `Checkbox`, que o DS publica |

As duas últimas são as mais graves da lista inteira, e não pela contagem. **O DS duplica o próprio
motor.** O `ConfirmModal` reconstrói Textarea e Checkbox em vez de compô-los, o que significa que
o componente que serve de referência para todo o repositório carrega, por dentro, o defeito que a
governança proíbe nas telas. Toda tela que usa `ConfirmModal` herda estados que não passaram pelo
AA por estado do `Checkbox`.

O `ConvitesView.tsx:142` merece nota própria: o `DateField` em
`apps/painel/src/components/fields/DateField.tsx` foi criado exatamente para matar o
`<Input type="date">` cru — o comentário no topo do arquivo cita "F-01 do GATE-DS-W1". O
adaptador existe, está pronto, e esta tela não o usa. É a assinatura do mecanismo: o conserto
aconteceu, o cânone não foi declarado, e a instância seguinte nasceu igual.

## 4. Botão e CTA replicando variante publicada — 17 instâncias

| arquivo:linha | O que é | Canônico |
|---|---|---|
| `apps/painel/src/routes/plataforma/tenants/TenantsList.tsx:41-58` (`FiltroChips`) | `<button aria-pressed>` com fundo ativo/inativo, hover e raio à mão | `Chip` com `active` — a lógica é a mesma de `Chip.tsx` |
| `apps/painel/src/routes/plataforma/repasses/RepassesFilaView.tsx:65-80` (`EstadoChips`) | idem, duplicata do anterior | `Chip` |
| `apps/painel/src/routes/overview/_components/AgendaCard.tsx:92-105` | botão-ícone "Mês anterior", anel de foco e hover manuais | `IconButton` |
| `apps/painel/src/routes/overview/_components/AgendaCard.tsx:109-122` | botão-ícone "Mês seguinte", idem | `IconButton` |
| `apps/painel/src/routes/clubes/clube/ClubeShell.tsx:45-52` | botão-ícone "Copiar código de convite" | `IconButton` |
| `apps/landing` · 12 arquivos | `rounded-ds-pill` com padding e cor à mão, replicando `buttonVariants` | `buttonVariants` de `@leela/design-system/server`, hoje importado em **um** arquivo só |

Os 12 da landing: `DefinirSenhaFlow.tsx:231` · `PainelIngressos.tsx:27` · `PortasDaConta.tsx:138` ·
`page.tsx:88` · `AvisoPedidoEmConfirmacao.tsx:118` · `HeroMinimo.tsx:57` · `HeroSection.tsx:94` ·
`KitsSection.tsx:58` · `marca.tsx:71` · `PerfilView.tsx:84` · `PublicHeader.tsx:76,84`.

`buttonVariants` é a entrada Radix-free ratificada pelo ADR-017 e serve a landing sem custo de
bundle. Ela existe, está exportada, e doze superfícies públicas a ignoram — incluindo o CTA do
hero, que é o botão mais caro do produto.

**Fora desta contagem, e deliberadamente:** 16 ocorrências de `<button>` cru no painel foram lidas
e classificadas como legítimas — link de texto sem variante equivalente no `Button` (que publica
`primary`, `secondary`, `ghost`, `destructive`, `neutral`), item de navegação vertical, célula de
grade de calendário, linha de lista clicável. Nenhum trigger de Popover cru foi encontrado; os
existentes já usam `Button asChild` ou `PopoverTrigger`. Esta distinção é a razão de `<button>`
não entrar na regra dura do gate (ver `05-gate-leela-canon.md §4`).

## 5. Cartão e superfície reconstruídos à mão — 192 instâncias

A família maior, e a que o dono viu.

### Painel · 141 instâncias em 86 arquivos

| Rota | Instâncias | Exemplos |
|---|---|---|
| `routes/eventos/**` | 61 | `eventos/financeiro/FinanceiroView.tsx:345`, `:384` · `eventos/comunicacao/ComunicacaoView.tsx:290` |
| `routes/plataforma/**` | 26 | `plataforma/tenants/TenantDetail.tsx:62`, `:117` · `plataforma/repasses/RepassesFilaView.tsx:78` |
| `routes/clubes/**` | 23 | `clubes/hub/ClubeCard.tsx:72` · `clubes/hub/HubClubes.tsx:130` · `clubes/clube/desafios/DesafiosList.tsx:184` |
| `routes/crm/**` | 10 | `crm/ClientesPage.tsx:164` · `crm/ClienteDetailPage.tsx:92` · `crm/visao-geral/AnaliseVendasView.tsx:298` |
| `routes/parcerias/**` | 7 | `parcerias/marcas/MarcasPage.tsx:307` · `parcerias/afiliacoes/MinhasAfiliacoesPage.tsx:65` · `parcerias/assessorias/ParceriaDetailPage.tsx:42` |
| `routes/conta/**` | 6 | `conta/recebimento/DadosBancariosSection.tsx:109` · `conta/perfil/ContaPage.tsx:40` · `conta/auth/AuthAlert.tsx:24` |
| `routes/overview/**` | 5 | `overview/_components/AgendaCard.tsx:99` · `overview/_components/AlertsPanel.tsx:100` · `overview/_components/PanelError.tsx:23` |
| `components/**` | 2 | `components/CartaoV3.tsx:70` · `components/upload/ImageUploadField.tsx:149` |
| `routes/onboarding/**` | 1 | `onboarding/VitrinePainel.tsx:54` |

Sete dessas instâncias usam `<article>` cru como cartão ou item de lista, e é aqui que o achado do
handoff de parcerias aterrissa com a linha exata:

`clubes/hub/ClubeCard.tsx:67` · `clubes/clube/parcerias/ParceriasView.tsx:55`, `:88` ·
`clubes/clube/comunicacao/ComunicadosList.tsx:58` ·
**`parcerias/afiliacoes/MinhasAfiliacoesPage.tsx:65`** (o achado, confirmado) ·
`eventos/comunicacao/CampanhasList.tsx:81` · `eventos/comunicacao/AutomacoesPage.tsx:240`.

Os sete têm a mesma causa, e ela é de cânone e não de descuido: **o DS publica `CardEvento` e
`CardDesafio` e mais nenhum cartão de domínio.** Não existe `CardClube`, `CardComunicado`,
`CardCampanha`, `CardParceria` nem `CardAfiliacao`. Cada `<article>` cru está preenchendo essa
lacuna à mão. Ver §7.

O contraexemplo está no próprio repositório e é a prova de que o time sabe:
`eventos/kits/KitsCadastroView.tsx:123` carrega o comentário "Card CANÔNICO do DS, não `<article>`
cru com bg (D-1008-R11)". A lane S005-T1 consertou dois pontos. A generalização é que nunca
aconteceu, porque não havia cânone escrito para generalizar contra.

### Landing · 51 instâncias em 37 arquivos

`Card` é importado em **um** arquivo da landing (via `@leela/design-system/server`, entrada
server-safe ratificada pelo ADR-017), e a anatomia dele é recriada 51 vezes. A concentração está no
checkout e nas seções da página pública: `checkout/PixCobranca.tsx:116`, `:263`, `:288`, `:307` ·
`checkout/StepConfirmacao.tsx:196`, `:233` · `checkout/AceitesCompra.tsx:129` ·
`checkout/KitDetalhe.tsx:55` · `checkout/CupomCampo.tsx:58` · `sections/HeroSection.tsx:129` ·
`sections/KitsSection.tsx:46` · `sections/ModalidadesSection.tsx:36` ·
`minha-conta/PainelIngressos.tsx:24`, `:112`, `:126` — e mais 36.

Como no painel, todas usam token; nenhuma usa cor crua.

## 6. Estado vazio artesanal — 8 instâncias

`EmptyState` do DS tem **84 usos em 46 arquivos** e `Skeleton` **131 usos em 68 arquivos**. Nenhum
spinner solto, nenhum `animate-pulse` à mão, nenhum "Carregando…" hardcoded fora do DS. A adoção é
boa e o gap é pontual — oito blocos pequenos de painel que escreveram a mesma receita
(`<p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">`):

`eventos/hub/HubEventos.tsx:137` · `overview/_components/Countdown.tsx:76` ·
`overview/_components/RecentRegistrations.tsx:143` · `eventos/kits/DistribuicaoView.tsx:112` ·
`eventos/kits/KitEditor.tsx:377`, `:455`, `:564` · `crm/ClienteDetailPage.tsx:134`.

Nota de DoD: o DoD de Tela exige "estado vazio em toda lista filtrável". Os oito passam no DoD
escrito (há estado vazio) e falham no cânone (não é o componente). É a mesma assinatura do resto.

## 7. Sem cânone — o que não tem contra o que reprovar

Esta seção é a resposta à segunda metade da frase do dono: "em alguns lugares do sistema nao existe
um padrão definido disso". Ela não vira onda de conversão; vira decisão (documento `03`).

### 7.1 Layout composto — 106 ocorrências, 23 receitas, zero componente

O DS publica 50 componentes e **nenhum é layout**. Não há `Grid`, `Bento`, `Stack`, `Section` nem
`Surface` no barrel. Bento e slot, dois dos padrões que o dono nomeou, estão inteiramente nesta
faixa.

Consequência medida: 106 ocorrências de `grid grid-cols-*` no painel, com **23 assinaturas
distintas**, para o que são três famílias de layout apenas.

| Família real | Receitas distintas em uso | Exemplos de assinatura |
|---|---|---|
| Grade de formulário (1 → 2/3 colunas) | 8 | `grid-cols-1 sm:grid-cols-2` (30×) · `grid-cols-1 sm:grid-cols-3` (10×) · `grid-cols-1 lg:grid-cols-2` (10×) |
| Grade de indicador (2 → 4 colunas) | 7 | `grid-cols-2 lg:grid-cols-4` (12×) · `grid-cols-2 md:grid-cols-4` (6×) · `grid-cols-1 xs:grid-cols-2 lg:grid-cols-4` (4×) |
| Bento assimétrico de dois painéis | 5 | `grid-cols-1 lg:grid-cols-[3fr_2fr]` (4×) · `grid-cols-1 lg:grid-cols-[7fr_3fr]` (3×) · `grid-cols-1 lg:grid-cols-[1fr_3fr]` (1×) |
| Casos próprios (calendário, cohort, planos) | 3 | `grid-cols-7` · `grid-cols-[var(--spacing-16)_1fr_var(--spacing-12)]` · `grid-cols-3 sm:grid-cols-4 md:grid-cols-6` |

Vinte e três receitas para três famílias quer dizer que cada tela reinventou a fração e o
breakpoint. Não é erro de ninguém: não havia o que importar.

A evidência mais limpa da lacuna vem de dentro do próprio DS. O showroom precisou escrever o
**próprio** `Section` local, em `packages/design-system/showcase/src/ui.tsx:27`, porque o design
system não oferece um. E o `AppShell` (`AppShell.tsx:73`, `:123`, `:127`) compõe o layout do shell
com Tailwind inline, sem primitivo reutilizável por baixo.

### 7.2 Cartão de domínio — 5 famílias órfãs

`CardEvento` e `CardDesafio` existem. Clube, comunicado, campanha, parceria e afiliação não têm
componente, e produzem os sete `<article>` crus da §5.

### 7.3 Cabeçalho de bloco

`PageHeader` do DS é de página. Cabeçalho de bloco interno (título + ação à direita, dentro de um
cartão) não tem canônico. O painel resolveu localmente em `components/SecaoHead.tsx`, e o
comentário do arquivo registra que a extração aconteceu **depois** de duas cópias
(`ActiveEvents`, `RecentRegistrations`) — o padrão nasceu duplicado e foi consolidado por
iniciativa de quem passou por ali, não por regra.

### 7.4 Typeahead inline

`apps/painel/src/routes/eventos/entrega/AtendimentoPanel.tsx:264-291` (`BuscaAtleta`) monta uma
`<ul>` de resultados abaixo do `SearchInput`, em fluxo normal, sem sobrepor. Não é menu artesanal
(não usa `absolute` nem `z-index`, e por isso ficou fora da §3), mas cumpre o papel do `Combobox`
sem ser ele. O `Combobox` do DS assume painel flutuante; typeahead em fluxo é um modo que ele não
tem.

## 8. O estado do próprio design system

| Medida | Resultado |
|---|---|
| Componentes publicados | 50 diretórios em `src/components/`, **50 exports no barrel** — zero componente morto ou privado |
| Componentes com story | **40 de 50**. Sem story: `charts`, `Checkbox`, `Dialog`, `Field`, `InputSenha`, `Radio`, `Select`, `SidebarRail`, `Switch`, `Textarea` |
| Componentes com teste | **49 de 50**. Sem teste algum: `Command` |
| Controle cru interno indevido | 2 (`ConfirmModal`, §3) |
| Componente de layout | nenhum (§7.1) |

As dez lacunas de story importam mais do que parecem, e a lista denuncia por si: **sete dos dez são
controles de formulário** — `Checkbox`, `Field`, `InputSenha`, `Radio`, `Select`, `Switch`,
`Textarea`. A governança §7 manda conferir toda alteração visual nos dois temas pelo toggle do
Storybook, e o catálogo do showroom é o lugar onde alguém descobre que o componente existe antes de
escrever o seu. Um controle sem story é um controle que a próxima pessoa não encontra. Sete
controles de formulário sem vitrine, num sistema onde formulário é metade da superfície, é causa
plausível de reincidência, não detalhe de documentação.

## 9. Achados herdados que entram no inventário

Cinco handoffs da noite de 10/08 deixaram pendências de mesma família. Nenhuma se conserta aqui;
todas viram item de onda no documento `04`.

| Origem | Achado | Onde entra |
|---|---|---|
| `leela-redesign-ajustes-dono.md` | "~40 telas com bg cru" | **medido e corrigido** — §2: são 192 superfícies reconstruídas à mão, e zero bg cru |
| `leela-redesign-parcerias-nav.md` | `<article>` cru em MinhasAfiliações | confirmado em `MinhasAfiliacoesPage.tsx:65` (§5) |
| `leela-redesign-engajamento-dash.md` | primeiro import cross-route do painel: `clubes/engajamento` consome `overview/_components/OcupacaoEventos`, `overview/_components/EmBreveV3` e `overview/_lib/ocupacao` (`EngajamentoPage.tsx:19`, `EngajamentoView.tsx:51-53`) | onda da comunidade — promover para `src/components/` exige tocar a VG ratificada (D-1008-R3) |
| `leela-redesign-hifi-rec-FIX.md` | **F4** tooltip do rail é hover-only, teclado não vê · **F5** rodapé do rail navega por `<button>` + `navigate` em vez de âncora, e fica sem nome acessível · **F6** grade da Agenda usa `role="grid"` sem `row`/`gridcell` | os três não foram pagos; F4 e F5 são do shell, F6 é da Agenda |
| `leela-uxw-fix.md` | `be-hero.com.br` hardcoded · jargão `RN-141`/`RN-144`/"idempotente" visível ao usuário · 15 melhorias de copy | copy e domínio, não procedência — entram como carona das ondas que tocam as mesmas telas (§10) |

Correção de escopo na fila do `leela-uxw-fix`: `be-hero.com.br` **não** aparece na landing. As
ocorrências estão todas no painel, e são **seis**, não duas:
`clubes/clube/ClubeShell.tsx:56` (o MEL-21) · `clubes/novo/NovoClubePage.tsx:113-114` ·
`lib/linkPublico.ts:22` (fallback) · `clubes/clube/desafios/DesafiosPage.tsx:34` ·
`ConviteModal.tsx:47` · `clubes/clube/configuracoes/ConfiguracoesView.tsx:304`.

Achado de prioridade alta que não é desta família, registrado para não se perder:
`packages/design-system/src/components/charts/BarChart.tsx:130` passa `tickFormatter={truncarRotulo}`,
e o Recharts chama essa função com `(valor, índice)` — o índice vira o limite de caracteres e
trunca todo rótulo do eixo para um caractere. Pré-existente, introduzido em `a826dc3a`. É defeito
de dado exibido, não de cânone, e precisa de lane própria.

## 10. O que a medição diz, em três frases

A §8 shadcn-first funcionou para **controle**: sobraram cinco instâncias em todo o repositório, e
duas delas estão dentro do próprio DS. Ela nunca alcançou **superfície e layout**, onde estão 192
das 223 divergências, porque cartão tem canônico que ninguém foi obrigado a usar e layout não tem
canônico nenhum. O gate de marca está verde e continuará verde enquanto isso durar, o que é a
definição exata do furo que a L-021 nomeou.
