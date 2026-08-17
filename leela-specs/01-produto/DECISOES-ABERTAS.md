# Decisões em aberto — painel do Vitor

O que ainda é seu para decidir, e só isso. **8 itens abertos, contados à mão:** 6 em "Decisões que dependem de você" e 2 em "Ações que só você pode executar".
Nada aqui bloqueia código — tudo roda com um default defensável em vigor, ratificar é confirmar o default, e mudar é ajuste no próximo lote.
Histórico de fechamento não mora aqui: cada item que fecha vai para a rodada correspondente em `02-rodadas/`.

> **O padrão deste arquivo, que é contrato e não sugestão.**
> 1. Cabeçalho de no máximo 3 linhas: o que é o painel, a contagem atual contada à mão, e onde vive o histórico.
> 2. Depois do cabeçalho, só itens. Item = título · um parágrafo curto de contexto, no máximo 3 frases · caso de uso em uma linha · job story em uma linha · o que fica com você · opções com o default proposto · onde aterrissa. A seção "Ações que só você pode executar" segue a mesma régua.
> 3. Item fechado sai na mesma aterrissagem, e o registro do fechamento vai para a rodada. Narrativa de fechamento nunca vira parágrafo aqui.
>
> Personagens dos exemplos: Ana compra, Castelo organiza eventos, Marina opera o painel, Téo é influenciador afiliado. São ilustrativos, não pessoas do banco.

## Decisões que dependem de você

### 12 · domínio público

Todo endereço do produto ainda é o marcador `{DOMINIO_LEELA}`, e o remetente definitivo do e-mail depende dessa escolha. O produto já está no ar em `leela-landing.web.app` e o e-mail transacional sai por `vitoreldp@gmail.com`, que o DMARC do Gmail tende a jogar em spam quando a Brevo envia por ele.

- **Caso de uso:** o Castelo quer divulgar a página do evento no Instagram, e o endereço de hoje nasce para quebrar — é subdomínio de hospedagem e muda de nome no dia em que o domínio de verdade existir.
- **Job story:** quando eu divulgo a página do meu evento, eu quero um endereço que eu não tenha vergonha de colar e que continue funcionando depois, para não ter de reeditar cada post no dia em que o site mudar de casa.
- **O que fica com você:** cravar o domínio público da Leela.
- **Onde aterrissa:** env dos dois apps, substituição do marcador nas specs e verificação DKIM/SPF/DMARC na Brevo. Puxa junto o item 66 e o placeholder `contato@leela.app`, que a porta de entrada do organizador já usa como CTA de "Falar com o time Leela".

### CAIXA-1 · a tabela de inscrições da Caixa: o que ela deve contar

Você perguntou o intuito dela em 17/08, e a medição diz que ela não faz nenhuma das duas coisas que você supôs. Não é divisão de receita — não tem **nenhuma** coluna em reais, só Categoria, Item e Inscritos. E não é uma distribuição cruzada: são **três listas independentes empilhadas** (por kit, por modalidade, por status), então a coluna somada de ponta a ponta dá **3× o número do próprio cabeçalho**. Ela nasceu em 04/07 como substituto declarado da matriz que a spec pedia, e nunca mais foi tocada.

- **Caso de uso:** a Marina abre a Caixa para entender de onde veio o dinheiro do evento, e encontra uma tabela de contagem cujo total não bate com o título — enquanto o gráfico logo acima já mostra um terço daquelas linhas.
- **Job story:** quando eu abro a Caixa do meu evento, eu quero entender de onde veio a receita, para saber qual modalidade e qual kit sustentam o resultado.
- **O que fica com você:** o que essa faixa da tela deve contar — ou se ela deve sumir.
- **Opções:** **remover a tabela** (**default proposto** — modalidade já está no gráfico logo acima, e status e kit já existem *acionáveis* na tela de Inscritos, como filtro; sai uma tabela que soma errado e a dobra fica com os três números de dinheiro) · **trocar por divisão de receita de verdade**, que é o que você levantou primeiro e o que a spec original pedia — **bloqueada por dado**, não por trabalho de tela: exige o modelo de pagamento no inscrito (FABLE-A) e uma agregação por forma que ninguém escreve hoje · **redesenhar com propósito**, uma partição por vez com seletor e coluna de percentual, para a soma voltar a bater com o cabeçalho.
- **Onde aterrissa:** `apps/painel/.../financeiro/FinanceiroView.tsx:303-313` e a onda D de `02-rodadas/2026-08-17-leva22/04-fila-em-ondas.md`. Medição completa em `00-medicao-kits-caixa-e-terciario.md` §14.

### POPOVER-COR-1 · a cor do painel flutuante (o "modal" do perfil)

Você disse, em 13/08, que *"o modal está fora do design system também, quanto as cores"*. A varredura do componente inteiro achou **zero cor fora do sistema**: nenhum hex, nenhum rgba, nenhuma classe de paleta fixa, nenhum estilo inline de cor — tudo sai de token, e o painel flutuante inclusive já respeita a sua decisão anterior de nunca pintar o filme translúcido do vidro (D-1008-R4). Ou seja: a implementação está correta, e mesmo assim o que você viu na tela está certo também.

A explicação medida é de FAMÍLIA de cor, não de conformidade. No brasa, o painel flutuante é `#1C1C1C` e a superfície do rail é `#161616` — dois cinzas neutros puros, enquanto tudo em volta é atravessado pelo brilho de fundo e pelo vidro, que são quentes. O painel é a única superfície grande da tela sem esse tratamento, então ele lê como um retângulo cinza colado por cima de um ambiente que tem cor.

Isto não foi consertado de propósito: o token `--popover` é lido por TODO menu, seleção, busca e painel flutuante do produto. Trocar ele repinta o produto inteiro a partir de uma hipótese sobre o que você viu, e isso é lane própria com conferência visual própria.

- **Caso de uso:** você clica no seu nome no menu, o painel abre, e ele parece de outro produto — cinza chapado sobre uma tela que tem temperatura.
- **Job story:** quando um menu abre por cima da tela, eu quero que ele pareça da mesma casa que o resto, para não sentir que o sistema foi montado por duas pessoas que não se falaram.
- **O que fica com você:** confirmar se é isso mesmo que te incomodou, e aprovar (ou vetar) o pareamento proposto.
- **Opções:** **parear o painel flutuante com a família da superfície elevada de cada tema** (**default proposto** — `--surface-raised-opaque` como ponto de partida, com AA de texto e borda medido nos três temas antes de trocar) · manter como está, se o que te incomodou for outra coisa · escolher um tratamento próprio para painel flutuante, que aí é decisão de marca e não pareamento.
- **Onde aterrissa:** `--popover` em `packages/design-system/tokens/shadcn.json` e a conferência visual de menu, seleção e busca nos três temas. **Vale olhar primeiro no tema claro**, onde a distância é maior e mais visível (superfície elevada `#FFFFFF` contra painel `#F5F1EC`) — se você responder sobre o claro, a resposta provavelmente vale para os três.
- **Detalhe completo:** `02-rodadas/2026-08-13-decisoes-dono/01-decisoes-dono.md` §16.2.

### NAV-MOBILE-1 · a navegação mobile do produtor: o quinto item e as duas anatomias

Você cravou a barra flutuante inferior de quatro e o perfil no topo direito, e ela está construída. Sobraram duas escolhas que a sua fala não alcançou: o rail tem **cinco** áreas e a barra tem quatro slots, e o painel master tem **doze** destinos, que não cabem em quatro de jeito nenhum. O default em vigor deixa Parcerias fora da barra e mantém o menu antigo só no master — o que significa duas navegações mobile diferentes dentro do mesmo produto.

- **Caso de uso:** a Marina usa o painel no celular o dia todo e alcança Visão geral, Eventos, Clubs e CRM num toque; para abrir Parcerias ela desce até o fim da Visão geral e toca no bloco, dois toques, igual ao que custava antes.
- **Job story:** quando eu opero o painel pelo celular, eu quero as áreas do meu dia a um toque, para não pagar pedágio de menu dez vezes por dia.
- **O que fica com você:** confirmar quais quatro áreas ficam na barra, onde mora a quinta, e se o master pode continuar com o menu antigo.
- **Opções:** **(a) Parcerias como bloco na Visão geral** (**default proposto** — é a área mais nova e a única cujo trabalho não é diário; a barra fica com quatro destinos de verdade) · **(b) o quarto slot vira "Mais"**, abrindo uma folha com CRM e Parcerias — mas aí a barra tem três destinos e um menu, o que contraria "quatro botões" · **(c) Parcerias volta para dentro de Clubs**, o que desfaz a D-1008-R17 de 15/08. Para o master: **manter o menu antigo lá** (**default**, doze destinos não cabem em quatro) ou forçar a mesma anatomia nas duas superfícies.
- **Onde aterrissa:** `apps/painel/src/shell/sidebar.ts` (`ITENS_DA_BARRA_MOBILE`) — trocar a lista é uma linha. Supersede a D-1008-R5 no produtor, com a superação já escrita. Detalhe e balanço de pixel em `.nirvana/handoffs/leela-nav-mobile-20260817.md`.

### EVT-CARGA · a dobra do evento repete o mesmo número várias vezes

A medição de 17/08 achou "Inscritos" aparecendo 4× e a porcentagem de preenchimento 2× na primeira dobra da Visão geral do evento; em 375px isso empurra o primeiro número novo para 60px abaixo da dobra. A spec propõe três cortes na mesma tela, todos com default proposto; só a pill de inscritos da sub-nav não tem default meu — ela também é afordância de navegação, e a resposta vale para as 11 barras do painel (evento e clubes).

- **Caso de uso:** o Castelo abre a Visão geral do evento no celular e o primeiro número que ele ainda não viu nasce atrás de quatro repetições do mesmo "120 inscritos".
- **Job story:** quando eu abro o evento no celular, eu quero ver informação nova sem rolar, para não pagar pedágio por um número que já vi três vezes.
- **O que fica com você:** aprovar os três cortes (header, countdown, painéis de modalidade) e decidir se a pill de inscritos fica ou sai da sub-nav.
- **Opções:** **cortar os três** (**default proposto** — header larga inscritos e dias, countdown larga a porcentagem repetida no ministat, painéis de modalidade largam o trio e o total já mostrados no countdown) · para a pill: **manter** (o papel de afordância vira exceção nomeada na regra de casa única, vale para os clubes também) ou **cortar junto** (sub-nav fica só com rótulos, como as outras nove abas).
- **Onde aterrissa:** `EventoShell.tsx`, `CountdownHero.tsx`, `ModalidadesPanels.tsx`, `_lib/subnav.ts`. Detalhe completo em `02-rodadas/2026-08-17-carga-cognitiva/03-spec-reordenacao.md` (Movimentos 1 a 4).

### FILTRO-ALTURA-1 · as duas facetas da barra de filtro têm alturas diferentes

Os filtros em lista já ficam alinhados ao lado da pesquisa, numa fileira só, com o nome da faceta visível — a queixa de 17/08 está paga e medida. Sobrou uma diferença de forma que a sua fala não alcançou: a faceta de escolha única tem 40px (anatomia de campo) e a de escolha múltipla, 32px (anatomia de botão). Em Comunicados as três dividem a mesma fileira e a diferença aparece.

- **Caso de uso:** a Marina abre Comunicados e vê `Status: Todos` e `Todos` altos, com `Canal: Todos` mais baixo no meio deles, como se fossem controles de dois tipos diferentes.
- **Job story:** quando eu filtro uma lista, eu quero que os filtros pareçam a mesma coisa, para não ficar procurando diferença onde não há.
- **O que fica com você:** qual das duas alturas vira a altura da faceta.
- **Opções:** **subir a múltipla para 40px** (**default proposto** — o campo de busca ao lado tem 38px, então 40 é quem já está pareado; sobe só o gatilho do `FilterMenu`) · **descer a única para 32px**, barra mais leve mas descolada da busca · manter as duas, se a diferença de altura for leitura de tipo para você.
- **Onde aterrissa:** `FilterMenu.tsx` (o `size` do gatilho) ou `FilterChips.tsx` (a altura da faceta exclusiva), com `gate-visual-filtros` re-rodado nos dois temas. Puxa junto as duas facetas cruas de Inscritos (`Todos os kits`, `Todas as modalidades`), que são `Combobox` direto e não ganham o nome da faceta. Detalhe em `.nirvana/handoffs/leela-filtros-fix-20260817.md`.

## Ações que só você pode executar

### 69 · conferência visual das telas novas, no mesmo passeio

Sete coisas entraram no ar entre 02 e 03/08 e nenhuma delas tem gate de código que substitua o seu olho. Tudo está servido em produção, incluindo a página do produtor, e os vetos ficam mais caros depois que houver compra real em cima. Cada peça é troca barata.

- **Caso de uso:** alguém abre a página do produtor pela primeira vez e vê os três ícones de rede desenhados em casa, o menu Feed · Eventos · Clubs e os cartões de modalidade e kit.
- **Job story:** quando eu abro a página de um evento pela primeira vez, eu quero que ela pareça acabada, para me sentir seguro de digitar o meu cartão ali.
- **O que fica com você:** olhar e vetar o que não estiver certo.
- **Onde aterrissa — o passeio, tela a tela:**
  - `https://leela-landing.web.app/@castelo` — os três ícones de rede desenhados em casa (WhatsApp, TikTok e Strava não existem no lucide), o menu Feed · Eventos · Clubs, o respiro do rótulo nos grupos de escolha e o toque em qualquer ponto do cartão de modalidade e kit.
  - `.../meia-floripa-2026/inscricao` — os três consertos do checkout de 03/08: select de parcelas completo na primeira abertura, total que muda no ato, loader "Preparando código PIX" só depois do clique. A copy "Modalidades disponíveis" e "Modalidade oficial" está nas duas telas.
  - `/eventos/{slug}/lotes` — sete conferências: o aviso acende no campo da **vaga** e não no do preço; dois campos vazios acendem juntos e o cursor cai no primeiro da ordem visual; a recusa por janela sobreposta traz o **nome** do outro lote e as datas com hora; os três números (vendidas · disponíveis · total) aparecem na tabela e dentro do modal, e o disponível cai **na hora** quando você digita um total menor em `Ajustar capacidade`; um lote com venda abre com o preço cinza e o atalho de capacidade logo abaixo da vaga; `Desativar` num lote vigente para a venda e mantém válido quem já comprou; e o menu secundário do evento não tem barra de rolagem nenhuma em 320, 768 e 1024 pixels. **A janela de datas segue cinza de propósito** e tem tarefa própria — a trava vive numa regra de servidor.
  - Os oito e-mails, por arquivo e não por navegador: `.nirvana/outputs/leela-build-2d6ee98d/emails/` (`index.html` percorre os oito). O que vale olhar com cuidado é o **cabeçalho com a imagem bloqueada** — caso normal no Gmail, não a exceção, e é o `alt` estilizado que segura a marca ali.
  - As telas da porta de entrada do organizador entram no passeio quando o deploy subir. O botão de pagar você confere depois da S1219, que troca a frase "Atualizando o total…" pelo spinner que você aprovou.

### JUROS-1 · salvar os termos comerciais no painel, para selar o rastro

A escrita de 03/08 foi minimalista por ordem explícita, então o documento vigente ficou em `versao: 1` enquanto o retrato imutável `v1` ainda diz juros zero. Nada quebra por causa disso, mas o histórico da v1 deixou de ser fiel. O próximo save pelo painel grava a v2 já com 2,89% e sela o rastro pelo caminho canônico, que é o único jeito de o histórico voltar a bater.

- **Caso de uso:** você abre os termos comerciais do Castelo no painel e salva sem mudar nada; hoje quem for ler o histórico depois vai ler uma coisa que não aconteceu.
- **Job story:** quando eu preciso saber que condição comercial valia numa data passada, eu quero que o histórico mostre o que de fato estava valendo, para não defender um número que o próprio registro contradiz.
- **O que fica com você:** abrir os termos e salvar sem mudar nada.
- **Onde aterrissa:** `/plataforma` → Termos do tenant Castelo Produções.

> **Fila de construção.** Saiu daqui em 12/08 porque não é decisão sua — o conteúdo integral, com as pendências do CTO, vive em [[FILA-DE-CONSTRUCAO]] (`leela-specs/01-produto/FILA-DE-CONSTRUCAO.md`).
