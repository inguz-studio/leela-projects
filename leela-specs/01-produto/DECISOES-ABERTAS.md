# Decisões em aberto — painel do Vitor

O que ainda é seu para decidir, e só isso. **4 itens abertos, contados à mão:** 2 em "Decisões que dependem de você" e 2 em "Ações que só você pode executar".
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

### MODALIDADES-1 · visibilidade agora ou editor completo na tela de lotes

As modalidades do evento nascem uma vez, na criação, e nenhuma tela do painel as mostra ou edita depois — quem configura lotes não enxerga a lista nem tem caminho até ela. A proposta que resolve isso está desenhada desde 05/08 (D-1008-R13) e nunca saiu do papel, presa dentro do épico E04. Você voltou a pedir por ela em 10/08 e de novo no chat de 12/08 (*"Sobre a tela de lotes, nós colocamos o cadastro de modalidade por lá?"*), e a sua resposta no chat pode fechar direto, sem esperar nova rodada.

- **Caso de uso:** o Castelo abre a tela de lotes para configurar preço e vaga, e não encontra onde ver as modalidades do evento — a informação existe, mas fica atrás de nenhuma porta.
- **Job story:** quando eu configuro os lotes de um evento, eu quero enxergar e alcançar as modalidades dele no mesmo caminho, para não precisar adivinhar onde essa configuração mora.
- **O que fica com você:** o ritmo da entrega — visibilidade agora, edição de verdade depois, ou as duas juntas — e se as modalidades ganham aba própria.
- **Opções:** **fase A agora + fase B como onda seguinte já especificada** (**default proposto** — fase A é tela apenas, sem servidor: a seção de data e modalidades passa a listar as modalidades do evento e a tela de lotes ganha um caminho até lá; fase B sobe depois como onda própria, com a fila da S316 inteira — servidor, com integridade entre modalidade, lote, kit e campanha) · as duas fases de uma vez, pagando o custo de servidor já nesta entrada · modalidades ganhando aba própria entre kits e lotes, opção independente que soma a qualquer uma das duas de cima.
- **Onde aterrissa:** S316 inteira em [[LEELA-E04-config-vendas]] §"S316 recebe a leva 3 inteira (D-1008-R13)".

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
