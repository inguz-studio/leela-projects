# Handoff · NAV-MOBILE (17/08)

- **Trace:** `leela-redesign-v2-20260810` · lane `NAV-MOBILE`
- **Árvore:** worktree `C:\dev\leela-wt-navmobile`, branch `nav-mobile`
- **Merge:** `9ad1f3d5` na main, empurrado. Base da lane: `43ef9c7e`
- **Deploy:** NENHUM. O gate visual do maestro está pendente (lista no fim)

## O que entrou

A fala do dono na leva 20: *"Já o Menu no formato mobile, pode ser uma barra
flutuante, horizontal a ficar na parte inferior da tela. e a parte de logout,
configurações, na barra superior no lado direito, com o ícone de perfil."*

**Os quatro da barra:** Visão geral, Eventos, Clubs, CRM. **Parcerias é o
quinto** e ficou fora, com casa na Visão geral como bloco com caminho — só
abaixo de `lg`, porque acima disso o rail já o carrega e o bloco seria a
redundância que a RN-573 da mesma rodada proíbe. O caminho até ele segue
custando dois toques, o mesmo que custava pelo drawer: ninguém piorou.

**O perfil** subiu para o topo direito e abre **o popover que já existia** desde
a D-1008-R6, com os itens da leva 16 (Configurações e Sair, cada um com ícone,
Sair por último). Nenhum popover novo nasceu; ele só ganhou um segundo gatilho.

**O hambúrguer saiu do DOM** no produtor — não foi escondido por CSS. Um botão
que abre um drawer superado continua alcançável por teclado e por leitor de tela
enquanto estiver no documento, e essa é a pior das duas navegações.

## Reusado × criado

| | O quê |
|---|---|
| **Criado** | `BottomNav` no DS (peça + story + docs + LLM.txt + 21 testes), grupo de tokens `bottomnav`, `RESPIRO_BOTTOMNAV`, `shellBottomNavItems`, `ParceriasNoMobile`, teste de alcançabilidade, teste de custo na dobra |
| **Reusado** | o popover do perfil (D-1008-R6 + leva 16), `DropdownMenu`, `IconButton`, `DEFAULT_SIDEBAR_NAV_ICONS`, `onClickSpa`, a mecânica do indicador deslizante do `SidebarRail` (D-1008-R14), o `Drawer` inteiro (intacto, para o master) |

Três slots novos no `AppShell` (`bottomNav`, `topBarStart`, `topBarEnd`) e mais
nada: a barra **nasce no DS** e o painel só a consome.

## ⛔ O balanço de pixel em 375, e ele não é o que se queria ouvir

A armadilha (a) do handoff da carga cognitiva estava certa, e a régua confirma:
**esta lane custa dobra, não devolve.**

| | Antes | Com a barra |
|---|---|---|
| Espaço permanente no rodapé | 0 | **82 px** (116 com o entalhe do iPhone) |
| Dobra útil em 375 | 810 px | **728 px** |
| 1º número não duplicado da Visão geral do evento | 60 px abaixo da dobra | **142 px abaixo** |
| Altura da barra superior | 60 px + borda | **igual** (o logo tem 34 e o IconButton 36: quem manda continua sendo o botão) |

O Movimento 1 sozinho devolve 36 px. Contra os 82 da barra, fica **46 px no
vermelho** — quem paga o resto é o Movimento 3, que não é desta lane. **Nenhum
ganho de dobra pode ser anunciado por este trabalho.**

O ganho desta lane é de **toques**: quatro destinos caem de dois toques para um,
um empata (Parcerias), nenhum piora, e os 800 ms da abertura do drawer são
**eliminados em vez de encurtados** — que é a diretriz durável da S002 sobre
nunca consertar tempo com número menor.

**Método da medida:** os px vêm da resolução da cadeia de `var()` + `calc()` do
CSS gerado (`custo-na-dobra.test.ts`), a mesma aritmética que o navegador faz.
Não é estimativa sobre imagem. jsdom não tem motor de layout, então
`getBoundingClientRect` ali devolveria zero — o que falta é a conferência
visual, e ela é o gate do maestro. A linha de base (810, y=870) é a da rodada
`2026-08-17-carga-cognitiva`, medida por `getBoundingClientRect` dentro do
iframe.

## Alcançabilidade — nenhuma rota órfã

`alcancabilidade-mobile.test.tsx` fecha o círculo em vez de checar peça por
peça: monta o catálogo de destinos das **mesmas tabelas** que o shell consome
(`HREF_POR_ID` e `PLATFORM_NAV`) e exige que ele caiba no alcançável. Área nova
sem casa no mobile reprova ali sozinha, sem ninguém lembrar do teste.

Um teste que **não** foi escrito para isto deu a prova mais limpa: a sonda do véu
da vitrine (DEF-R1) conta os focáveis do fundo nominalmente, e ela não acha mais
o hambúrguer. A conta subiu de 8 para 12 controles, e o caso "com o aviso aberto,
nenhum controle do fundo continua alcançável" **seguiu verde a lane inteira** —
é ele que diz que a barra nova nasceu dentro da subárvore inerte.

## Gates, números reais

| Gate | Resultado |
|---|---|
| `tsc` painel | limpo |
| `tsc` DS | limpo |
| eslint painel | 0 (`--max-warnings 0`) |
| eslint DS | 0 (`--max-warnings 0`) |
| gate-canon | **PASS**, todos os contadores no baseline |
| Suíte DS completa | **2169 testes / 94 arquivos**, 0 falhas |
| Suíte painel completa (4 fatias seriais) | **2906 testes / 257 arquivos**, 0 falhas |
| Smoke pós-merge da main | refeito nas duas árvores |

Fatias do painel: shell+components+lib (376) · eventos (960) ·
plataforma+clubes (756) · overview+crm+conta+parcerias+onboarding+_system (814).

**Uma quebra real apareceu e foi consertada:** 3 casos da sonda do véu, pela
lista nominal de focáveis do fundo. Commit `275aadef`.

⚠️ **Armadilha do `dist/`.** A suíte do painel falhou 94 casos na main logo após
o merge, e não era regressão: `packages/design-system/dist/` é gitignorado e
estava velho, sem o `BottomNav`. `npm run build` no DS e os 423 voltaram a
passar. Quem for rodar a suíte do painel numa árvore recém-mergeada **rebuilda o
DS antes** — o painel consome o `dist`, não o `src`.

## ⛔ O que fica com o dono

| Item | Estado | Pergunta |
|---|---|---|
| NAV-MOBILE-1 | **fechado** pela leva 20 | barra flutuante inferior — construída |
| NAV-MOBILE-4 | **fechado** pela leva 20 | um ícone de perfil, popover que já existe — construído |
| **NAV-MOBILE-2** | ⛔ **VETÁVEL** — default aplicado | Os quatro são Visão geral, Eventos, Clubs e CRM? E **Parcerias vira bloco na Visão geral** (destino "a"), em vez de virar slot "Mais" (b) ou voltar para dentro de Clubs (c)? |
| **NAV-MOBILE-3** | ⛔ **VETÁVEL** — default aplicado | **Duas navegações mobile diferentes no mesmo produto**: barra no produtor, drawer no master. A assimetria vale o custo de aprendizado? (São doze destinos no master, e quatro slots não os comportam.) Isto **supersede a D-1008-R5** na superfície do produtor — a superação está escrita, nada foi apagado |
| **NAV-MOBILE-5** (novo, desta lane) | ⛔ **VETÁVEL** | A barra custa 82 px de dobra em 375 e os Movimentos 1 e 3 ainda não foram feitos. **Os dois entram na próxima onda junto**, ou a barra fica no ar cobrando altura enquanto o header ainda repete inscritos quatro vezes? |

## Gate visual do maestro — o que precisa ser visto

Nada desta lane foi visto renderizado. **375 e 768 no mínimo**, e o 375 é o que
julga.

1. **375 · Visão geral do produtor** — a barra flutuante inteira (respiro das
   três bordas, raio, sombra, vidro), o item ativo aceso, e o **bloco de
   Parcerias no fim da grade**
2. **375 · Visão geral do evento** — a tela do balanço de pixel: conferir que o
   último bloco **não** nasce escondido atrás da barra (é o `RESPIRO_BOTTOMNAV`
   em julgamento) e ver quanto da dobra sobrou de verdade
3. **375 · popover do perfil aberto** no topo direito, com Configurações e Sair
4. **375 · troca de aba** — o indicador deslizante viajando na horizontal, e a
   mesma troca com `prefers-reduced-motion` ligado
5. **375 · painel master** (`/plataforma/...`) — o drawer e o hambúrguer
   **continuam lá**, que é a assimetria do NAV-MOBILE-3 em carne
6. **768** — as mesmas telas: a barra ainda existe (o rail só volta em `lg`)
7. **≥ 1024** — conferir que a barra **sumiu** e o rail voltou, sem respiro
   sobrando no fim da página

Um aparelho com entalhe (ou o simulador com safe-area) vale a foto extra: a
pílula deve subir inteira acima do indicador de home, sem crescer de altura.
