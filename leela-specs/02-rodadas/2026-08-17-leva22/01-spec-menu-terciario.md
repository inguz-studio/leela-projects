---
tags: [leela, spec, leva22, menu-terciario, design-system, e01, rn-574]
aliases: [Spec do menu terciário, Abas fixas]
atualizado: 2026-08-17
---

# Spec — o menu terciário vira padrão da casa, com abas fixas

> Cobre a **RN-574**. Medição em `00-medicao-kits-caixa-e-terciario.md` §10, §11 e §12.
> Constrói na **onda B**. ⛔ Zero código nesta lane.

## O que o dono pediu, e o que a medição corrigiu

Ele pediu duas coisas numa frase: que o terciário dos Clubs **vire padrão** e que ele
**pare de rolar a página**. A medição concorda com as duas e desmonta a premissa de que
seria propagação barata.

**O que ele elogiou é o único menu do painel que não é canônico.** Os três níveis acima
dele — área, dentro do club, dentro do evento — já usam `AreaSubNav`. O quarto, dentro de
Configurações do club, é `<ul>` de `<button>` escrita à mão dentro da rota
(`ConfiguracoesView.tsx:160-179`), com `IntersectionObserver` de scroll spy e
`scrollIntoView`. Ele escapa da catraca `menu-secundario-cru` por não parecer um `SubNav`.

E o cânone já diz que essa variante não deveria existir: *"Área, sub-área e terciária são o
mesmo componente com a mesma aparência: não existe variante por nível de profundidade"*
(`03-canon/canone-de-componentes.md:234-235`).

**Então o pedido dele não é "espalhe o que existe". É "o que existe ali está certo de
comportamento e errado de procedência — publique-o".**

Uma segunda diferença que a spec precisa carregar: o molde dos Clubs é uma **coluna vertical
sticky** (`lg:grid-cols-[1fr_3fr]`), e os outros três níveis são **barras horizontais**. Ele
elogiou a coluna. A decisão abaixo trata as duas como orientações do mesmo componente, e não
como componentes diferentes.

## A decisão de desenho

**Nasce `TabsPanel`** — nome provisório, o cânone crava na aterrissagem da onda — como o
padrão nomeado de **navegação terciária com painel**. Ele não substitui o `SubNav`: os dois
respondem perguntas diferentes, e a diferença passa a ser escrita.

| | `SubNav` / `AreaSubNav` | `TabsPanel` (novo) |
|---|---|---|
| O que é | navegação entre **rotas** | troca de **painel** dentro de uma rota |
| Semântica | `nav` + links, `aria-current="page"` | `tablist` / `tab` / `tabpanel` |
| A URL muda? | sim, é o ponto | sim, mas por **query param** — o endereço continua compartilhável |
| A página rola? | remonta a rota | **não rola: troca no lugar** |
| Quando usar | área, sub-área, seções que são páginas | seções de uma mesma página |

**Compõe do que existe.** O `Tabs` do DS já troca conteúdo no lugar sem rolar, mantém todos
os painéis no DOM com `forceMount` e tem a11y de tablist completa
(`Tabs.tsx:137-152`, `:17`). Faltam três peças, e nenhuma é invenção:

1. **Estado na URL.** Hoje é `defaultTab` ou controlado pelo pai (`Tabs.tsx:37-46`). Passa a
   sincronizar com um query param (`?secao=`), para que o endereço de uma seção continue
   colável — que é a única coisa que o formato âncora fazia bem e que a troca no lugar
   perderia em silêncio.
2. **Indicador deslizante.** Hoje é `::after` por aba, que aparece e some (`Tabs.tsx:111-115`).
   A **D-1008-R14** exige que ele deslize. A mecânica já está escrita e testada no
   `SubNav.tsx:98-112` e `:268-281` — é código para **promover ao componente comum**, não
   para inventar.
3. **Orientação.** `horizontal` (default) e `vertical` (o molde dos Clubs, coluna sticky).
   Mesma anatomia, mesmo estado, mesma a11y; muda o eixo e a tecla de navegação, que o Radix
   já trata por `orientation`.

### A decisão de fundo, e ela não é livre

Hoje `SubNav` e `Tabs` divergem **de propósito**: o `SubNav` perdeu o fundo de pílula e a
borda inferior pela **D-1008-R18**, e aquela decisão **escopou-se explicitamente** para a
barra de navegação de área, deixando o `Tabs` de fora (`SubNav.tsx:19-25`); o `Tabs` mantém
`border-b` na lista (`Tabs.tsx:74`).

**Default proposto:** o `TabsPanel` segue a régua do `SubNav` — **sem fundo, sem borda
inferior**, indicador deslizante direto sobre a página. Razão: ele vai aparecer em
Configurações do evento logo abaixo de uma `AreaSubNav` que já é transparente, e duas barras
empilhadas com tratamentos diferentes é exatamente a incongruência que a leva 17 mediu.
Contraste AA por estado (ativo · inativo · hover) medido contra o fundo da **página**, nos
três temas — o mesmo gate que a D-1008-R18 criou.

⚠️ Isto **estende** a D-1008-R18 a um componente que ela deixou de fora de propósito. Está
escrito aqui em vez de aplicado em silêncio, porque revogação por silêncio já quase custou a
RN-470.

## O vetável — TERCIARIO-1

Ele escreveu *"me fiz claro?"*, e a resposta é que sim, com uma ressalva que vale a
confirmação: **"abas fixas" está lido como "o formato âncora morre"**. As duas leituras
possíveis não são equivalentes.

- **Leitura adotada (default):** as seções deixam de ser um documento longo rolável e passam
  a ser painéis exclusivos. Só o painel ativo existe na tela. É o que "não movimentar a tela
  inteira" descreve melhor.
- **Leitura alternativa:** as seções continuam empilhadas e roláveis, e o que se fixa é a
  **barra** (sticky), que já é o caso hoje. Aqui "abas fixas" seria sobre a barra, não sobre
  o conteúdo.

A adotada é a que resolve a queixa; a alternativa é a que a palavra "fixas" também admite. O
default entra na onda B e o veto fica aberto até ele responder.

**Efeito colateral honesto da adotada:** com painéis exclusivos, `Ctrl+F` do navegador
deixa de achar texto que está em outra seção. É o preço real da troca no lugar, e o
`forceMount` do `Tabs` (que mantém tudo no DOM, só `hidden`) **não** o evita, porque o
navegador não busca em conteúdo oculto. Fica registrado para não ser descoberto depois como
defeito.

## Aplicação 1 · Configurações de eventos

**Não é o mesmo caso do molde.** Configurações do evento **já é** sub-nav por rota-filha —
`AreaSubNav` mais `<Outlet>`, com a aba ativa derivada do pathname
(`ConfiguracoesLayout.tsx:94-95`, `:78-79`). Não há seções empilhadas para desempilhar: há
quatro rotas para converter em painéis.

Quatro sub-áreas hoje: Geral · Política de vendas · Exigências e regulamento · Equipe e
permissões (`:51-66`), com gate por papel aba a aba (`_lib/gateEvento.ts:28-35`) e
`EmptyState` para papel sem nenhuma aba (`:69-76`).

⚠️ **O gate por papel não pode virar decoração na conversão.** Hoje cada aba é uma rota com
`RequirePapel` próprio; virando painel no lugar, o conteúdo de todas as abas passa a existir
no DOM ao mesmo tempo. **Painel escondido não é painel proibido.** A régua: a lista de abas
continua filtrada por papel *e* o conteúdo de aba não autorizada não é montado — `hidden`
não é autorização.

### A página de vendas entra em Configurações

Ela é hoje rota **irmã** (`EventosRoutes.tsx:149-156`), alcançada pelo menu secundário do
evento (`_lib/subnav.ts:37`). O movimento tem cinco pontos, e o quarto é o único que não é
mecânico:

1. Sai do menu secundário — `_lib/subnav.ts:37` e o membro do union em `:18`
2. Testes de ordem das abas — `__tests__/subnav.test.ts:56`, `:87-88`
3. A rota passa a ser filha do bloco de configurações. O contrato de contexto muda de
   `EventoOutletContext` para `ConfiguracoesOutletContext`, que é **superconjunto**
   (`ConfiguracoesLayout.tsx:22-25`, `:81`): edit de tipo, não de arquitetura
4. ⚠️ **Colisão de permissão.** As duas áreas divergem na matriz: o papel `financeiro` tem
   `pagina_vendas: false`, com comentário explícito *"aceite E04-L4: financeiro edita página
   → NEGA"* (`packages/core/src/eventos/equipe.ts:107,116,125,134`). Herdar o
   `RequirePapel area="configuracoes"` do pai **mudaria quem entra**. A filha mantém o guard
   próprio `area="pagina_vendas"`, e a aba entra na lista com `visivel:` por papel
5. Redirect da RN-234 para o endereço antigo — molde em `EventosRoutes.tsx:53-58`

**O menu secundário do evento perde um item e ganha coerência:** hoje tem dez, e "Página de
vendas" era o único que é configuração morando fora de Configurações.

## Aplicação 2 · Credenciamento em duas abas

O corte que ele pediu **já existe no espaço** — 60/40, com `AtendimentoPanel` (ação) à
esquerda e `PainelOperacional` (análise) à direita (`BalcaoView.tsx:63-77`). Virar duas abas
é mover blocos, não redesenhar.

**Aba 1 · Check-in** (ação): `BalcaoBanner` + `AtendimentoPanel` + `AtalhosBalcao`.
**Aba 2 · Análise**: os três cards de leitura do `PainelOperacional` — Retirada de kits,
Alertas do balcão, Últimos atendimentos.

⚠️ **A impureza que a mudança tem de resolver, não carregar:** o card 4 do painel de análise
é de **ação** — "Ações rápidas" (`PainelOperacional.tsx:152-165`), com três `<Button>` **sem
`onClick`** (`:155`, `:158`, `:161`). São botões mortos na tela hoje. Eles não podem ir para
a aba de análise (são ação) nem para a de check-in (não fazem nada). **Ou ganham
comportamento na onda B, ou saem da tela.** Manter botão morto atrás de uma aba nova é
esconder o defeito, não corrigi-lo.

**A simplificação do check-in é outra coisa, e é maior.** Ele pediu para *"simplificar mais
a ação"*. O corte em abas não tira nenhum toque: o caminho continua 4 toques e 2 digitações
com chip, 3 e 1 sem chip. A gordura real está medida em §12 e nenhuma parte dela é layout:

- **Não existe scanner em lugar nenhum do painel.** O ingresso tem QR na landing e no balcão
  o operador **digita** o código na mesma caixa do nome. Ler o QR é o que elimina a busca
  inteira — 2 toques e 1 digitação viram 1 leitura. É trabalho novo, não ajuste.
- **A barra de atalhos mente:** promete quatro teclas (⌘K, Enter, Tab, Esc) e implementa
  duas (`AtalhosBalcao.tsx:13-18` contra `AtendimentoPanel.tsx:61-78`). "Enter confirma" não
  tem handler — e é o atalho que tiraria um toque de cada atendimento.
- **O `Stepper` de três passos é decorativo:** o passo "kit" nunca é acionável e o carimbo
  nasce no fechamento (`_lib/balcao.ts:65-70`). Três passos desenhados para uma ação.

**CRED-1 vai ao dono:** o corte em duas abas sobe na onda B de qualquer forma; o scanner é
decisão de escopo dele, porque é a diferença entre arrumar a tela e mudar o trabalho do
balcão.

## Onde mais isto se aplica, e onde não se aplica

O dono disse *"para outras áreas que demandem isos"*. A régua que a RN-574 escreve, para
não virar propagação cega:

**Usa `TabsPanel`** quando as seções são partes de uma mesma coisa, o usuário compara entre
elas, e nenhuma delas é destino de link externo — configurações de qualquer entidade,
credenciamento, ficha com abas.

**Continua `AreaSubNav`** quando cada seção é um lugar com vida própria, com dado que carrega
sozinho e endereço que as pessoas compartilham — as dez abas do evento, as seis do club, as
áreas do rail. Converter essas em painel no lugar seria carregar dez telas para mostrar uma.

**Candidatos imediatos além dos dois pedidos**, para a onda B avaliar e a spec **não**
decidir: a ficha de tenant (`plataforma/tenants/TenantFichaLayout.tsx:77`), Kits
(`KitsLayout.tsx:65`, hoje duas abas por rota) e o Financeiro do evento
(`FinanceiroLayout.tsx:48`). Nenhum deles entra sem o dono ver o primeiro pronto.

## Aceite

1. O componente existe no design system, com story e teste, e o cânone
   `03-canon/canone-de-componentes.md` ganha a linha do padrão nomeado no **mesmo commit**
   (RN-558: instância de padrão nomeado usa o componente do cânone).
2. Trocar de aba **não move o scroll da página** — provado por teste, não por olho.
3. O endereço de uma aba é colável e volta na mesma aba (query param).
4. O indicador **desliza** entre posições, respeitando `motion-reduce` (D-1008-R14).
5. Contraste AA por estado contra o fundo da página, nos três temas (D-1008-R18 estendida).
6. a11y: `tablist`/`tab`/`tabpanel`, setas, Home/End, e nome acessível em cada aba.
7. Configurações do evento roda no componente novo, com a página de vendas dentro, **sem
   afrouxar a matriz de papéis** — teste que prova que `financeiro` continua sem acesso à
   página de vendas.
8. Credenciamento em duas abas, e o card de botões mortos **resolvido**, não escondido.
9. O gate visual do maestro (L-019) roda nas duas superfícies antes de "no ar".

## Vizinhos

`00-medicao-kits-caixa-e-terciario.md` §10-12 para o estado medido.
`04-fila-em-ondas.md` para o tamanho. `05-rns-delta.md` para a RN-574.
