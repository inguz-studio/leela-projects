---
tags: [leela, design, carga-cognitiva, medicao, evento, e01, e03]
rodada: 2026-08-17-carga-cognitiva
lane: CARGA-COGNITIVA-SPEC
---

# Medição · redundância de informação na área interna do evento

> Parte 2 do brief. Mede antes de propor. Nada aqui é conserto: é a conta do que
> a tela mostra duas vezes, com arquivo e linha de cada fonte.

## Como a medição foi feita

Build do painel em `apps/painel`, duas vezes, pelo motivo que está escrito abaixo.

1. `npx vite build --mode leela-hub` — o build que o brief pede, exit 0, 4039 módulos,
   `index-CRoaNsxO.js` (2.346,40 kB). É o artefato de produção, e é dele que a
   régua fala.
2. `pnpm exec vite build --mode mock-emulador --outDir dist-mock-campeche` — o
   mesmo código, apontado ao emulador, servido em `127.0.0.1:4602`.

**Por que os dois, escrito sem maquiagem:** o build `leela-hub` aponta ao projeto
real e o painel não tem tela de login própria, então ele não renderiza nada sem
uma sessão de verdade. Fotografar o estado atual exige o modo mock, que carrega
autologin de preview e o dataset Campeche. O `dist-mock-campeche` que estava no ar
era de 13/08 e tanto o `EventoShell.tsx` quanto o `EngajamentoView.tsx` mudaram
depois disso, então ele foi **rebuildado do HEAD** antes de qualquer foto. Medir
numa cópia velha das duas telas que estão em julgamento seria medir outra coisa.

**Viewports.** A janela do Chrome estava travada em maximizada e o redimensionamento
foi recusado pelo sistema (viewport fixa em 2133 px CSS). O desktop foi fotografado
assim. Os 768 e os 375 foram obtidos renderizando o próprio app dentro de um iframe
de largura fixa na mesma origem: media query dentro de iframe avalia contra o
viewport do iframe, então o que a foto mostra é o layout real daquela largura, não
uma simulação. As medidas de pixel abaixo foram lidas por `getBoundingClientRect`
dentro do iframe, não estimadas na foto.

**Evento medido:** `desafio-mtb-costa-lagoa-2026` (120 inscritos, capacidade 300,
39 dias para a prova). Escolhido por ter os três números que o dono citou com
valores distintos entre si, o que torna a repetição visível a olho.

## O caso que o dono apontou · header × KPI card

As quatro coisas que ele nomeou — número de inscritos, data, nome do evento e dias
para o evento — estão todas no header. Todas reaparecem abaixo, na mesma dobra.

| Fato | 1ª aparição | 2ª aparição | 3ª aparição | 4ª | Papel distinto? |
|---|---|---|---|---|---|
| Nome do evento | `EventoShell.tsx:98` (breadcrumb) | `EventoShell.tsx:164` (h1) | — | — | não |
| Data do evento | `EventoShell.tsx:169-173` (meta) | `CountdownHero.tsx:87-91` (`dataLinha`) | — | — | não |
| Dias para o evento | `EventoShell.tsx:178-186` (`faltamDiasLabel`) | `CountdownHero.tsx:50-58`, `:81` (número grande) | `_lib/alertas.ts:146-153` → `OverviewDashboard.tsx:141` | — | não |
| Inscritos (120) | `EventoShell.tsx:174-177` | `_lib/subnav.ts:84-86` (pill da aba) | `CountdownHero.tsx:102-106` (ministat) | `ModalidadesPanels.tsx:66-68`, `:75` | não |
| Capacidade (300) | `CountdownHero.tsx:97-101` | `ModalidadesPanels.tsx:67`, `:75` | — | — | não |
| Ocupação (40%) | `CountdownHero.tsx:104` | `CountdownHero.tsx:119-125`, `:132-134` (barra + rótulo) | `ModalidadesPanels.tsx:65-67` | — | não |
| Vagas restantes (180) | `CountdownHero.tsx:107-111` | `CountdownHero.tsx:97-106` (os dois operandos ao lado) | — | — | não |
| Receita (R$ 34.800) | `OverviewKpis.tsx:106` | `ModalidadesPanels.tsx:79` | `ModalidadesPanels.tsx:84`, `:88` (centro do donut) | — | não |

Caminhos relativos a `apps/painel/src/routes/eventos/`.

Oito fatos, vinte e uma aparições, numa única dobra. Treze delas são cópia.

Duas observações que a tabela sozinha não entrega:

- **A contagem de inscritos aparece quatro vezes** e a quarta (`ModalidadesPanels`)
  chega junto com a capacidade e a porcentagem, ou seja, o mesmo trio do
  `CountdownHero` reescrito como legenda de outro card.
- **Receita tem duas fontes diferentes para o mesmo rótulo.** O KPI lê
  `evento.receitaConfirmada` e o painel de modalidades lê `fin.receitaBruta`
  (`OverviewPage.tsx:45` e `:58`). Hoje elas batem; nada garante que continuem
  batendo, e quando divergirem a tela vai mostrar dois números com o mesmo nome.

## O custo em pixel, por viewport

Medido no `Desafio MTB Costa da Lagoa 2026`, aba Visão geral, sem rolagem.

| Viewport | Altura do header | Linha duplicada | Altura do countdown | Topo do 1º KPI | 1º número **não** duplicado visível sem rolar? |
|---|---|---|---|---|---|
| 1437 × 897 (desktop) | 136 px | 18 px | 169 px | y = 439 | sim |
| 765 × 1022 (768) | 180 px | 18 px | 258 px | y = 633 | sim |
| 373 × 810 (375) | **345 px** | **36 px** | 330 px | y = **870** | **não** |

A linha duplicada é o `<p>` de `EventoShell.tsx:174-186`, com o texto
`120 inscritos · Faltam 39 dias para o evento`. Em 375 ela quebra em duas linhas
e dobra de altura.

O número que fecha o argumento do dono está na última coluna. **Em 375, header e
countdown juntos ocupam 675 px de uma dobra de 810 px — 83% —, e o primeiro número
que a tela não repetiu (Receita confirmada) nasce em y = 870, isto é, 60 px abaixo
da dobra.** Quem abre um evento no celular rola a tela inteira para encontrar a
primeira informação nova. Em desktop o mesmo desenho custa 439 px e passa
despercebido, que é exatamente por que o defeito sobreviveu.

Capturas: `capturas/01-evento-overview-desktop.jpg`,
`capturas/02-evento-overview-768.jpg`, `capturas/03-evento-overview-375.jpg`.

## Varredura das outras telas internas do evento

Mesma régua, todas as abas. O `EventoShell` é o layout de todas elas, então tudo
que o header mostra já conta como primeira aparição em qualquer tela interna.

| Tela | Redundância pura | Linhas varridas |
|---|---|---|
| Visão geral | 9 | 9 |
| Inscritos (+ slide-in, QR, estorno) | 5 | 10 |
| Kits · Gerenciamento | 2 | 2 |
| Kits · Distribuição | 5 | 9 |
| Lotes (+ modais) | 2 | 7 |
| Credenciamento | 6 | 8 |
| Financeiro · Caixa | 4 | 4 |
| Financeiro · Reembolsos | 1 | 1 |
| Configurações · Geral | 2 | 4 |
| Configurações · Equipe | 1 | 2 |
| Configurações · Política de vendas | 0 | 0 |
| Configurações · Saúde e regulamento | 0 | 0 |
| Comunicação · Campanhas | 3 | 5 |
| Comunicação · Histórico | 0 | 2 |
| Comunicação · Automações | 1 | 2 |
| Comunicação · Editor | 2 | 4 |
| Página de vendas (+ Cupons) | 1 | 5 |
| Afiliados | 0 | 0 |
| Editor de kit | 3 | 3 |
| **Total** | **44** | **77** |

"Redundância pura" = o mesmo fato duas vezes ou mais na mesma dobra, sem papel
distinto. As 33 linhas restantes têm papel declarado (alvo de modal destrutivo,
campo editável, prévia, log de sessão) e ficam de fora da fila.

### Os focos, fora do header

1. **Contagem de inscritos, 4× por dobra.** Em Inscritos: `EventoShell.tsx:174-177`,
   `_lib/subnav.ts:84-86`, `InscritosView.tsx:391-397` (ResultCount) e
   `InscritosView.tsx:415-417` (chip "Todos · N"). Em Financeiro repete o padrão:
   header, pill, `FinanceiroView.tsx:272` e `FinanceiroView.tsx:305`.
2. **O trio capacidade/inscritos/vagas do `CountdownHero`.** São dois números
   independentes (120 e 300) renderizados em cinco lugares, porque vagas e
   porcentagem são derivações dos mesmos dois.
3. **`KitEditor` com dois breadcrumbs empilhados.** `EventoShell.tsx:98` já monta a
   trilha e `KitEditor.tsx:323-334` monta outra por cima, com dois itens ("Kits" e
   "Gerenciamento") apontando para o mesmo href.

### Achados que não são redundância, mas nasceram da mesma varredura

- **Credenciamento mostra dois números de gente, vizinhos e diferentes**, sem nada
  dizendo que um é subconjunto do outro: inscritos no header/pill
  (`EventoShell.tsx:174-177`) e confirmados como denominador em
  `PainelOperacional.tsx:60-65` (`_lib/balcao.ts:113-122`).
- **Configurações mostra o status do evento em duas grafias.**
  `EventoShell.tsx:167` usa o rótulo humano de `_lib/status.ts`; 
  `ConfigGeraisForm.tsx:301-303` mostra o enum cru. "Rascunho" e "rascunho" na
  mesma dobra.
- **Página de vendas usa o mesmo rótulo para dois fatos.** `EventoShell.tsx:167` é
  o status do evento; `PaginaVendasView.tsx:174-176` é o estado da página. Os dois
  dizem "Rascunho" ou "Publicado" na mesma tela. Papel distinto, leitura dupla
  garantida.

Estes três entram na fila como **ambiguidade**, não como cópia, e o conserto é
qualificar, não apagar.
