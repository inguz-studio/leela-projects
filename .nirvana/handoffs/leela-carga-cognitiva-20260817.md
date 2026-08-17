# Handoff · CARGA-COGNITIVA-SPEC (17/08)

- **Trace:** `leela-redesign-v2-20260810` · lane `CARGA-COGNITIVA-SPEC`
- **Árvore:** `main` de `C:\dev\LEELA`
- **Entrega:** registro (levas 17, 18, 19) + medição + spec vetável + processo permanente
- **⛔ Zero código de produto.** Nenhum arquivo de `apps/` ou `packages/` foi tocado.

## O que esta lane fez

Quatro partes, na ordem do brief, mais duas adições do maestro que chegaram
durante a execução (levas 18 e 19).

| Parte | Entrega | Onde |
|---|---|---|
| 1 · Registro | Levas 17, 18 e 19 com a fala na íntegra e a confissão de captura | `leela-specs/02-rodadas/2026-08-17-decisoes-dono/01-decisoes-dono.md` |
| 2 · Medição | Área interna do evento, mapa do Engajamento, amostra de controle | `02-rodadas/2026-08-17-carga-cognitiva/00-`, `01-`, `02-` |
| 3 · Spec | Oito movimentos vetáveis, com antes/depois, custo e ganho | `…/03-spec-reordenacao.md` |
| 4 · Processo | Critério `§9`, RN-573, fila R0-R6 | `04-engenharia/governanca-design.md`, épico E01, `…/04-fila-em-ondas.md` |

## ⛔ A confissão que entra no registro

A queixa do header duplicado **já tinha sido feita e não existe em registro
nenhum**. Procurei antes de escrever: não há card, item de painel, linha de rodada
nem RN. Não dá para dizer que estava numa fila despriorizada, porque não houve
fila — ela foi ouvida no meio de outra conversa e morreu ali.

A regra de conserto nasce vinculante: **fala do dono sobre produto sempre vira
item registrado na mesma janela**, mesmo chegando no meio de outro assunto.
Registrar primeiro, priorizar depois. Item registrado que espera é decisão; item
não registrado é perda.

Ela foi exercitada na própria lane: as levas 18 e 19 chegaram no meio desta
execução e estão registradas, com os cards apontando para a lane que as constrói.

## Método da medição, e onde ele foi torto

**Os dois builds.** `npx vite build --mode leela-hub` rodou como o brief pede
(exit 0, 4039 módulos). Ele aponta ao projeto real e o painel não tem tela de
login própria, então não renderiza sem sessão. Para fotografar usei
`--mode mock-emulador` no `dist-mock-campeche`, servido em `:4602`.

⚠️ **O mock servido era de 13/08 e tanto o `EventoShell.tsx` quanto o
`EngajamentoView.tsx` mudaram depois disso.** Rebuildei do HEAD antes de qualquer
foto. Medir numa cópia velha das duas telas em julgamento seria medir outra coisa.

⚠️ **A janela do Chrome estava travada em maximizada e recusou redimensionar** —
`resize_window` respondia sucesso e o viewport ficava em 2133 px CSS. O desktop foi
fotografado assim. Os 768 e os 375 saíram renderizando o próprio app dentro de um
iframe de largura fixa na mesma origem: media query dentro de iframe avalia contra
o viewport do iframe, então a foto é o layout real daquela largura. As medidas de
pixel vieram de `getBoundingClientRect` dentro do iframe, não de estimativa sobre
a imagem. O método está declarado na medição, não escondido.

## Os números

**Primeira dobra da Visão geral do evento:** 8 fatos, 21 aparições, 13 delas cópia.
Inscritos aparece **4×** (header `EventoShell.tsx:174-177`, pill
`_lib/subnav.ts:84-86`, ministat `CountdownHero.tsx:102-106`, legenda
`ModalidadesPanels.tsx:66-68`).

**Custo em pixel:**

| Viewport | Header | Countdown | Topo do 1º número não duplicado | Cabe sem rolar? |
|---|---|---|---|---|
| 1437 × 897 | 136 px | 169 px | y = 439 | sim |
| 765 × 1022 | 180 px | 258 px | y = 633 | sim |
| 373 × 810 | 345 px | 330 px | y = **870** | **não** |

Em 375, header e countdown ocupam **83% da dobra** e o primeiro número novo nasce
60 px abaixo dela. É o argumento do dono provado, e é por isso que o defeito
sobreviveu: no desktop ele cabe folgado.

**Varredura completa:** 44 redundâncias puras em 77 pares nas 19 abas internas.
**Amostra de controle:** 15 duras em 31 telas, clubes concentrando 11.

**Três casos de fonte dupla**, que é o que torna isto regra de negócio:
receita no evento (`evento.receitaConfirmada` × `fin.receitaBruta`), membros no
clube (lista carregada × agregado gravado), bruto do tenant
(`platform/rollups` × soma viva de `repasse.ts`).

## O achado que barateia a segunda pergunta

A banda "Eventos" do Engajamento **não é bloco daquela tela**. É o
`OcupacaoEventos` da Visão geral, importado (`EngajamentoView.tsx:52`), e **a Visão
geral já o monta** (`OverviewContent.tsx:191`). Tirá-la não migra nada: apaga uma
segunda montagem. O mockup original que o dono lembra sempre esteve certo.

É também a única banda que o seletor de clube não recorta, e isso está declarado
no código (`EngajamentoPage.tsx:54-56`) como se fosse desenho. O critério que saiu
daí serve para qualquer tela com filtro: **bloco que o filtro da tela não alcança
não pertence àquela tela.**

## RN e faixa

**RN-573** no [[LEELA-E01-design-system]]: nenhum fato aparece 2× na mesma dobra
sem papel distinto **declarado**. Índice refeito na mesma aterrissagem, conta de
303 → 304, **próxima livre = 574**. Faixa conferida por grep de `RN-573` a
`RN-577` imediatamente antes do commit: zero definições.

As levas 18 e 19 **não consomem número** — desenho com vetável aberto, mesmo molde
da leva 10 e do ARENA-1.

## ⛔ O que fica com o dono (10 vetáveis)

| Item | Pergunta |
|---|---|
| EVT-CARGA-1 | O header cede inscritos e dias? |
| EVT-CARGA-2 | A pill de inscritos fica ou sai? Vale para as 11 barras |
| EVT-CARGA-3 | O countdown larga a porcentagem repetida? |
| EVT-CARGA-4 | Os painéis de modalidade largam o trio e o total? |
| ENG-CARGA-1 | A banda Eventos sai? **Supersede a D-1008-R15** |
| ENG-CARGA-2 | A ponte vira bloco canônico com recorte? |
| NAV-MOBILE-1 | "Menu horizontal" é barra inferior? Governa os outros três |
| NAV-MOBILE-2 | Quais quatro dos cinco, e onde fica Parcerias? |
| NAV-MOBILE-3 | Drawer sai no profissional e fica no master? **Supersede a D-1008-R5** |
| NAV-MOBILE-4 | Perfil sozinho, ou perfil e configurações separados? |

## Armadilhas para a próxima lane

- ⛔ **A barra mobile e o corte do header brigam pelo mesmo recurso.** A barra
  inferior ocupa altura permanente, que é exatamente o que os Movimentos 1 e 3
  querem liberar em 375. As duas frentes precisam ser medidas **juntas**, ou uma
  devolve o que a outra ganhou. A tabela de pixel acima é a linha de base.
- ⛔ **O Movimento 1 sozinho não resolve o celular.** Ele devolve 36 px e o
  primeiro número novo continua abaixo da dobra. Quem paga é o Movimento 3.
  Anunciar ganho de mobile só com o header cortado seria anunciar o que a régua
  não sustenta.
- ⛔ **A frente R1-c é de julgamento, não de corte.** A maioria dos pares de
  Kits · Distribuição e Financeiro · Caixa é **branda** pela régua (total ao lado
  da decomposição). Tratá-la como poda cega apaga desenho legítimo.
- ⛔ **A leva 18 carrega a trava da S002.** Abrir e fechar não são o mesmo
  movimento (800 ms e 250 ms, em par), e encurtar duração nunca conserta corrida.
  Saída animada foi o que abriu a janela dos dois overlays disputando a página.
- ⛔ **Ícone sem texto precisa de nome acessível.** A leva 18 troca ação escrita por
  ícone; o gate de UI reprova o que não tiver.
- ⚠️ **O `dist-mock-campeche` desta árvore agora é do HEAD de 17/08.** Quem for
  fotografar depois confere de novo: ele envelhece a cada merge.

## Capturas

`02-rodadas/2026-08-17-carga-cognitiva/capturas/` — desktop, 768 e 375 da Visão
geral do evento, mais as duas bandas do Engajamento. A `05` é a que mostra o
seletor em "Todos os clubs" ao lado de uma lista de cinco eventos que ele não
recorta.
