---
tags: [leela, decisoes, dono, navegacao, design-system]
aliases: [Leva 14, Leva 15, Leva 16, Decisões do dono 13/08]
atualizado: 2026-08-13
---

# Decisões do dono — 13/08 madrugada (levas 14, 15 e 16)

As três falas desta madrugada são sobre a mesma coisa vista de três ângulos: a
navegação do painel tem peças que deviam ser uma só e não são. Elas chegaram
separadas e estão registradas separadas, mas quem for reabrir qualquer uma
precisa ler as três — foi uma lane só que as pagou (`SUBNAV-UNIFICA`), e as
decisões se apoiam.

**Classe padronização — terceira cobrança.** Esta é a marcação que importa mais
que o conteúdo de qualquer uma delas. As duas primeiras foram o cânone de
componentes (11/08, leva 7: *"Se um componente nao existe, precisamos documentar
e padronizar o componente para nao ficar refazendo ele."*) e a bronca de 10/08
que criou a L-021. A terceira chegou apontando um traço de 1px numa barra de
menu, e o diagnóstico dele foi o mesmo dos anteriores. Uma classe que reincide
três vezes não se paga com conserto; ela pede catraca, e é por isso que a
`menu-secundario-cru` nasceu junto.

---

## 14 · O menu secundário vira um só, e a linha morre na origem

**Na íntegra:** *"o menu secundário de clubs está coreto, mas nas outras telas, a
linha esta aparecendo, aonde os seletores laranja ficam. Isso é um exemplo de que
voce naoe stá retulizando e padronizando os componentes."*

### O que a linha era, medido

O `SubNav` do design system tinha uma prop `divider` (RN-229 · S-R9-10) que
desenhava `border-b` em `--border-subtle`. Esse traço assenta no **mesmo
`bottom: 0`** do indicador Brasa deslizante (D-1008-R14). Onde o laranja está,
ele fica escondido atrás; onde o laranja não está — o resto da barra — ele
aparece. É exatamente a descrição dele: a linha aparecendo *aonde os seletores
laranja ficam*.

O inventário dos **onze** menus secundários do painel, com a divergência ao lado:

| # | Menu | Arquivo:linha (antes) | `divider` | Divergência contra clubs |
|---|---|---|---|---|
| 1 | Área de clubs (**a referência**) | `clubes/_components/ClubesAreaNav.tsx:21` | não | — é o correto |
| 2 | Área de parcerias | `parcerias/_components/ParceriasAreaNav.tsx:21` | não | nenhuma visual; montagem duplicada |
| 3 | Ficha do tenant (plataforma) | `plataforma/tenants/TenantFichaLayout.tsx:79` | não | `onClick` à mão — **matava ctrl+clique** |
| 4 | Abas do clube | `clubes/clube/ClubeShell.tsx:110` | **sim** | a linha |
| 5 | Abas do evento | `eventos/evento/EventoShell.tsx:212` | **sim** | a linha |
| 6 | Hub de eventos | `eventos/EventosHubLayout.tsx:47` | **sim** | a linha |
| 7 | CRM | `crm/_components/CrmSubNav.tsx:58` | **sim** | a linha |
| 8 | Financeiro do evento | `eventos/financeiro/FinanceiroLayout.tsx:53` | **sim** | a linha |
| 9 | Kits | `eventos/kits/KitsLayout.tsx:37` | **sim** | a linha |
| 10 | Configurações do evento | `eventos/configuracoes/ConfiguracoesLayout.tsx:99` | **sim** | a linha |
| 11 | Afiliações | `parcerias/afiliacoes/AfiliacoesLayout.tsx:47` | **sim** | a linha |

**Oito de onze** passavam a prop. Clubs, que não passava, era o único que ele
aprovou — e a razão de clubs não passar não foi decisão, foi acaso de quem
escreveu primeiro.

### O que ele acertou e a gente não tinha visto

O diagnóstico dele (*"não está reutilizando e padronizando os componentes"*)
parece contrariado pelo código: os **onze** já importavam o `SubNav` do design
system. Nenhuma tela tinha componente próprio, e qualquer gate de procedência
daria verde.

Só que o que estava duplicado não era o primitivo, era a **montagem**. Onze
pontos de render repetiam o mesmo trio (`useNavigate` + `useLocation` +
`tabsComNavSpa`) e cada um escolhia as props da barra por conta própria. Reuso de
primitivo sem reuso de montagem produz telas diferentes com o import certo — e é
uma forma de divergência que o cânone de 11/08 ainda não cobria, porque ele
julga procedência.

A prova de que isso não é teoria: o item 3 da tabela. `TenantFichaLayout`
escrevia o `onClick` à mão e chamava `preventDefault()` **sem conferir tecla nem
botão do mouse**. Naquela barra — e só naquela — ctrl/cmd+clique, clique do meio
e "abrir em nova aba" não funcionavam. Ninguém decidiu isso; foi o que acontece
quando a mesma montagem é escrita onze vezes.

### DECIDIDO — o que passa a valer

1. **A prop `divider` não existe mais.** A borda inferior do `SubNav` é travada
   em `border-b-0` depois do `className`, pela mesma mecânica de `twMerge` da
   trava de rolagem que já vivia no arquivo. Tirar a prop conserta os oito de
   hoje; a trava fecha a porta de trás (`<SubNav className="border-b …">`), que
   é o mesmo raciocínio que criou a RN-229 em primeiro lugar.
2. **Área, sub-área e terciária são o mesmo menu, com a mesma aparência.** Não
   existe mais variante por nível de profundidade. Isto **supersede a RN-229**.
3. **`AreaSubNav` é o consumidor único no painel** (`apps/painel/src/components/nav/AreaSubNav.tsx`).
   As onze áreas passam por ele, **clubs incluído** — é essa a prova de que não
   houve reescrita paralela: a área correta consome o mesmo componente que as
   outras, e não uma versão própria preservada por ser a boa.
4. **Catraca `menu-secundario-cru`, baseline zero.** Conta `<SubNav>` renderizado
   direto em `apps/` fora do consumidor único, e a barra reescrita à mão (`flex`
   com borda inferior de 2px ou no token de marca). Entrada nova reprova.

**Não consome RN.** É conserto de divergência e regra de componente; o lugar
disso é o cânone (§9), que ganhou a linha no mesmo commit.

### Por que não nasceu um componente `AreaNav` novo no DS

Foi a primeira ideia e está registrada como rejeitada, porque o próprio cânone
a proíbe: `SubNav` **já é** o canônico de "navegação de área" (§9), e a regra 2
do gate trata nome sinônimo de componente existente como divergência — foi assim
que `Grid` e `Surface` ficaram barrados como nomes. Publicar `AreaNav` ao lado de
`SubNav` seria criar o segundo nome para um padrão só, na mesma semana em que o
cânone nasceu para impedir isso.

O `AreaSubNav` que nasceu **não é componente visual**: não tem uma linha de
estilo, e existe para fiar `react-router`, que o design system não tem como
dependência e não deve ter (o pacote é consumido também pela landing Next e pelo
mobile). A fronteira ficou escrita no topo do arquivo: aparência, a11y e anatomia
são do `SubNav`; roteamento é do `AreaSubNav`. No dia em que ele precisar de
`className`, o que mudou é o contrato visual e o conserto é no DS.

---

## 15 · Configurações sai do menu principal

**Na íntegra:** *"configuraç~eos também está redundante no menu pricnipal, já que
ao clicar no nome 'ver perfil' aparecem as configurações."*

**Leitura declarada** (era vetável e o veto não veio antes da execução): a
entrada redundante é a do **menu principal (o rail)**; o caminho natural fica no
popover do perfil.

### A medição que autorizou a remoção

A ordem não foi executada antes de medir os dois destinos, porque "redundante"
tem dois desfechos muito diferentes:

| Caminho | Arquivo:linha | Rota | Tela |
|---|---|---|---|
| Rail | `apps/painel/src/shell/sidebar.ts:51` | `/conta` | `ContaRoutes` → `ContaPage` |
| Popover do perfil | `apps/painel/src/shell/RootShell.tsx:60` | `/conta` | `ContaRoutes` → `ContaPage` |

**Mesma rota, mesma tela.** A redundância é pura, e é isso que autoriza tirar a
entrada. `/conta` é conta **pessoal** — perfil, senha, foto, dados de recebimento
do titular e logout; a própria tela declara o escopo no subtítulo (*"Dados
pessoais e acesso. As configurações do organizador e dos eventos ficam em áreas
próprias."*). Não havia um segundo escopo de "configurações da organização" para
o rail guardar. As configurações **por objeto** (de um evento, de um clube) vivem
dentro do objeto e nunca estiveram no menu principal.

Se a medição tivesse dado destinos diferentes, isto seria um achado com proposta
neste registro, e não uma remoção.

### DECIDIDO

- A entrada sai do **catálogo do design system** (`DEFAULT_SIDEBAR_NAV_ICONS`), e
  não por filtro no app: filtro é a deriva que o comentário do próprio catálogo
  existe para impedir, e já produziu uma lista paralela mentindo sobre o menu.
- A seção `CONTA` foi junto — ela hospedava só este item, e seção com rótulo e
  nenhum filho é cabeçalho de nada.
- O menu do produtor vai de **6 para 5** itens.
- `/conta` sai da tabela de item ativo, pela mesma régua já aplicada a `/marcas`
  e `/financeiro`: rota que não é destino de menu não acende item nenhum.

**Reverte um default do maestro.** O comentário em `RootShell.tsx:54-55` dizia
*"Default do maestro (registrado, vetável): Configurações CONTINUA também como
item do rail — o popover soma um caminho, não rouba o existente"*, e havia teste
travando os dois caminhos. O default era vetável e foi vetado; o teste agora
guarda os dois lados da troca (sumiu do rail, continua no popover), para meio
conserto reprovar.

**Condição de reabertura:** se ele pedir "configurações da organização", isso é
**rota nova**, não é reabrir este item — o que saiu apontava para conta pessoal.

**Rail é MOLDURA:** vale a lei F2, e a suíte completa do painel rodou nos gates
finais desta lane.

---

## 16 · O popover do perfil ganha Sair, os dois itens ganham ícone, e a cor vira achado

**Na íntegra:** *"neste caso, ao clicar no nome do usuário, na barra demenu devo
visualizar 'sair' como opção de logou e configurações. Ambos com pequenos icones.
na hora do componente modal aparecer. e o modal está fora do design system
também, quanto as cores."*

### 16.1 · DECIDIDO — os dois itens, com ícone

O popover listava **Configurações** e (condicionalmente) o alternador de painel.
**Não tinha Sair.** O logout existia num lugar só e escondido: um botão dentro de
`/conta` — ou seja, atrás do próprio item de configurações que a leva 15 acabou
de tirar do rail. Sair de verdade estava a dois cliques e uma adivinhação.

- **Configurações** com `Settings`, **Sair** com `LogOut` (Lucide, o vocabulário
  da casa).
- **Sair é o último item**, de propósito: ação que encerra tudo no meio da lista
  é onde se clica sem querer.
- O logout virou `useSair` e as duas superfícies leem a mesma implementação. O
  que se copiaria junto é o *fail-safe*: se `logout()` lançar, ainda assim
  navegamos para `/entrar`, porque quem clicou pediu para sair e o erro mais
  provável (rede caindo no meio do `signOut`) é justamente o que prenderia a
  pessoa numa sessão encerrada.
- **"Pequenos ícones" virou token**, não número solto: `--popover-icon-size:
  16px`, um degrau abaixo do ícone de busca porque o item tem altura de botão
  pequeno e o ícone acompanha o rótulo em vez de competir com ele. Sem token, a
  próxima tela escolhe outro tamanho — foi assim que o rail acabou com três.
- O ícone é **decorativo**: o rótulo ao lado já nomeia a ação, então o wrapper
  leva `aria-hidden` e o leitor de tela não ouve o nome duas vezes.

### 16.2 · ⚠️ ACHADO, com proposta — a cor do popover NÃO está fora do DS

Esta é a parte da fala que **não virou conserto**, e a razão está medida.

A varredura do popover (`DropdownMenu.tsx` inteiro, 415 linhas, mais o rodapé do
rail que o dispara) achou **zero cor fora do design system**: nenhum `#hex`,
nenhum `rgba()`, nenhum `bg-white`/`bg-zinc-*`, nenhum `style` inline de cor,
nenhum `className` de consumidor sobrescrevendo superfície. O componente é o
`DropdownMenu` canônico (não há popover artesanal), e cada cor sai de token:

| Papel | Classe | Token | Brasa (o tema do painel) |
|---|---|---|---|
| Superfície | `bg-popover` | `--popover` → `--surface-overlay-opaque` | `#1C1C1C` |
| Texto | `text-popover-foreground` | `--text-primary` | `#F9F9F9` |
| Borda | `border-border` | `--border-default` | `#383838` |
| Hover | `bg-accent` | `--action-ghost-hover` | `#292929` |

O token `--surface-overlay-opaque` inclusive **existe por causa de uma decisão
anterior dele** (D-1008-R4): o painel flutuante nunca pinta o filme translúcido
do vidro, e há teste travando isso (`superficie-portal.test.tsx`).

**Então o que ele está vendo.** A hipótese medida, e o motivo de virar decisão em
vez de commit: em brasa, o popover (`#1C1C1C`) e a superfície do rail
(`--surface-raised`, `#161616`) são dois **cinzas neutros puros**, enquanto tudo
em volta deles é atravessado pelo `--page-glow` e pelo filme de vidro, que são
quentes. O painel flutuante é a única superfície grande da tela sem esse
tratamento, e lê como um retângulo cinza colado por cima de um ambiente com cor.
A divergência é de **família de cor**, não de conformidade.

**Por que não mexi.** `--popover` é lido por todo `DropdownMenu`, `Select`,
`Combobox`, `FilterMenu` e `Popover` do produto. Trocar o token repinta o produto
inteiro a partir de uma hipótese sobre o que ele viu, e isso é lane própria com
gate visual próprio. Repintar no escuro é como se produz a quarta cobrança.

**Proposta (default vetável dele):** parear `--popover` com a família da
superfície elevada de cada tema em vez do neutro solto —
`--surface-raised-opaque` como ponto de partida, medindo AA de texto e borda nos
três temas antes de trocar. **Vai para o painel de decisões do dono**, com a
observação de que no tema claro (`wine`) a distância é maior e mais visível
(`#FFFFFF` na superfície elevada contra `#F5F1EC` no popover) — se ele responder
sobre o tema claro, a resposta provavelmente vale para os três.

**Um defeito objetivo achado junto, e que não é cor:** os raios do painel e dos
itens usam `rounded-md`/`rounded-sm` (o default do Tailwind) em vez dos tokens de
raio do DS. É pequeno, é real, e é de outra família — vira card próprio para não
se misturar à pergunta de cor que está no dono.

---

## Onde aterrissa

| O quê | Onde |
|---|---|
| Lane | `SUBNAV-UNIFICA` · branch `subnav-unifica` |
| Regra de componente | `03-canon/canone-de-componentes.md` §9 |
| Catraca | `scripts/gate-canon.mjs` · `menu-secundario-cru`, baseline 0/0 |
| Consumidor único | `apps/painel/src/components/nav/AreaSubNav.tsx` |
| Card | V1-KANBAN, épico `LEELA-E01-design-system` |
| No dono | a cor do `--popover` (16.2) |

**Nenhuma destas três consome RN.** As levas 14 e 15 são conserto de divergência
e IA de navegação; a 16 é comportamento de um componente já existente mais um
achado. Número de regra de negócio não se gasta com isso.
