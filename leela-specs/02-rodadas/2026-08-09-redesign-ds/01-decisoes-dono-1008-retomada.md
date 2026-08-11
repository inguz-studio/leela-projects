# Decisões do dono — 10/08 (retomada noturna do redesign)

> Registradas no mesmo ato, via chat da retomada `/harness`. Trace `leela-redesign-v2-20260810`.

## D-1008-R1 · chart.accent do brasa = #FF450C
Na íntegra: "chart.accent = #FF450C". Aplicada em `e64b8c47` (FLIP-ACCENT: `{primary.400}` →
`{primary.500}`, primitivo pré-existente; wine/dark-wine intactos).

## D-1008-R2 · Handoff v2 do claude design é o ativo
O pacote anterior trazia `Visao Geral v3.dc.html` de carona e o H1 do protótipo/netlify diz
"Visão Geral" por herança do shell — **duas armadilhas que causaram a leitura errada** (a
lane HIFI-REC recriou a Visão Geral a partir do arquivo que não era deste trabalho). O
pacote v2 (copiado de Downloads para `handoff-v2/` nesta rodada) fecha as causas: seção
"Qual tela é esta", arquivo de design ÚNICO `engajamento-referencia.dc.html` (o protótipo do
heatmap agora implementa min-max + monocromático do item 7), limite explícito do Grupo C
("se você se pegar editando routes/overview/, pare") e 3º bloco no PROMPTS.md (guardrail
anti-recriação). **Briefs futuros do Grupo C citam o handoff-v2, nunca o antigo.**

## D-1008-R3 · Visão Geral v3 + rail flutuante FICAM
Pergunta feita ao dono com as três opções (ficam / reverter VG / reverter tudo). Resposta:
**"Ficam os dois"**. O que nasceu da leitura errada virou decisão de produto ratificada —
nenhum retrabalho; E02 segue valendo (analytics aprofundado fora da VG).

## D-1008-R4 · Menus secundários: fundo preto é defeito
Na íntegra: "me refiro ao background dos menus secundários, que estão em preto." Os
componentes canônicos (DropdownMenu/FilterMenu/Popover/Select/Combobox) passam a usar a
superfície do DS por tema. Entra na lane DELTA-UX.

## D-1008-R5 · Menu mobile no DS novo
Na íntegra: "o menu no formato mobile também nao está no DS novo." O drawer < lg
re-estilizado no chrome v3 (anatomia off-canvas fica; a pele muda).

## D-1008-R6 · Alternador de painel: rótulos novos, flat, dentro do popover do perfil
Na íntegra: "o botão ir para o painel master e ir para o painel do organizador pode mudar
para Acessar painel master e Acessar painel profissional, estilo flat button. e essas opções
devem estar ao clicar no componente que tem meu nome com 'ver perfil' aonde eu clico ele,
abre um pequeno modal com as opções de configurações e alternar painel."
→ Perfil (rail, fechado e aberto) abre popover pequeno com **Configurações + alternador**;
alternador sai do corpo do rail; rótulos **"Acessar painel master"/"Acessar painel
profissional"** (consistente com RN-468 "Painel Profissional"). **Default do maestro,
vetável:** Configurações continua TAMBÉM como item do rail (ícone existe no protótipo v3
ratificado).

---

> **Leva 3 — validação do dono no :4601 (10/08, retomada pós-travamento).** Registradas no
> mesmo ato. Viram a lane AJUSTES-DONO (roda após a DELTA-UX-RESUME aterrissar — mesma
> árvore, nunca em paralelo).

## D-1008-R7 · CTA "Gerenciar evento" fora do padrão de altura do DS
Na íntegra: "no localhost ja peguei de cara o botao que voce agora deixou fora do padrão de
altura, porra toda hora quebrando o design system!!! 'Gerenciar Evento'."
→ **Regressão do FIX F3** (sizes `cta` 48px / `cta-sm` 44px vindos do protótipo v3). A régua
do dono: altura de botão é a do padrão canônico do Button — a medida do protótipo PERDE para
o padrão do DS aqui (decisão explícita; inverte o pin l.281 do protótipo). Investigar
root-cause primeiro (é o 48px deliberado, ou var `--v3-cta-h` não resolvendo?); o destino é
o CTA na altura canônica.

## D-1008-R8 · Frases de apoio desnecessárias — cortar (principalmente Clubs)
Na íntegra: "Vejo que existem muitas frases de apoio que nao precisam existir,
princiaplemnte em clubs."
→ Inventariar microcopy de apoio nas superfícies do redesign (prioridade Clubs), cortar as
redundantes (carga cognitiva, L-021), **lista do que foi cortado no handoff — vetável**.

## D-1008-R9 · Afiliações/Assessorias/Engajamento viram menu secundário
Na íntegra: "Já os botões de afiliações influenciadores, assessorias parceiras e
engajamento, podem ser manejadas. Análise geral dosclubes em engajamento, por exemplo, ter
um menu secundário ao invés de botões."
→ Os três acessos (afiliações influenciadores · assessorias parceiras · engajamento) saem
de botões soltos e viram **menu secundário** (componente canônico do DS — Tabs/nav
secundária), na área de clubs/engajamento.

## D-1008-R10 · Voltar do painel de um club para a aba geral
Na íntegra: "e a opção de voltar, já que os clubs eu posso acessar um painel, mas depois nao
consigo retornar a aba geral dos clubs."
→ Dentro do painel de um club específico, affordance de retorno à listagem geral de clubs
(voltar/breadcrumb — padrão canônico, com rota SPA de verdade, âncora navegável).

## D-1008-R11 · Kits em eventos: contêineres não renderizam (informação flutuante)
Na íntegra: "Ao registrar kits também em eventos, nao consigo visualizar os bento cards, ou
conteineres de informação, estao todas as informações flutuantes."
→ Defeito de superfície: os cartões/contêineres da tela de registro de kits perderam o
fundo/borda no tema novo — a informação fica solta. **Root-cause primeiro** (mesma família
do D-1008-R4/popover? var de superfície não resolvendo fora da VG?), conserto no
token/componente canônico, nunca por tela.

## D-1008-R12 · Tabela de lotes: 3 colunas — Vendidos, Disponíveis, Total
Na íntegra: "A tabela de lotes em vagas venvidas -disponiveis e total está meio quebrada,
esquisita como coluna unica, simplifique para vendidos, disponiveis e total."
→ A tabela renderiza os números amontoados como coluna única; simplificar para **três
colunas: Vendidos · Disponíveis · Total**.

## D-1008-R13 · Modalidades ANTES de lotes (fluxo + visibilidade)
Na íntegra: "Nao consigo ver a configuração de modalidades em lotes. Está consufo, pois eu
precisaria primeiramente configurar as modalidades e depois os lotes."
→ Dois problemas: (a) a configuração de modalidades não está visível/alcançável a partir de
lotes; (b) a ordem do fluxo está invertida — **modalidades se configuram primeiro, lotes
depois**. Ler as specs existentes de modalidades/kit antes de mexer (JTBD primeiro); se a
correção for reestrutura pesada de IA, a lane devolve proposta em vez de código
(escalate_if).

> **Leva 4 — 11/08 (dono de volta, validando o :4601).** Registradas no mesmo ato.
> Viram a lane PARCERIAS-NAV (roda após a ENGAJAMENTO-DASH — mesma árvore, nunca paralelo).

## D-1008-R16 · Rotas de clubs: menu secundário não pode abandonar, layout não pode quebrar
Na íntegra: "identifiquei que voce precisa revisar as rotas de clubs, para que o menu
secundário nao leve a abas sem menu e que voce nao quebre o layout, como em assessorias
parceiras."
→ Defeito da implementação do R9: aba alcançada pelo menu secundário (`ClubesAreaNav`)
que renderiza SEM o menu = abandono de navegação; layout quebrado em assessorias
parceiras nomeado como exemplo. Régua: **toda rota da área mantém o menu secundário
presente e o layout íntegro** — auditoria rota a rota, com prova por teste de moldura da
área.

## D-1008-R17 · "Marcas" vira "Parcerias" e absorve as assessorias parceiras
Na íntegra: "vejo que Marcas no Menu principal pode alterar para 'Parcerias' onde
incluimos tanto marcas quanto assessorias parceiras. faz mas sentido do que deixar em
clubs."
→ Item do menu principal **Marcas → Parcerias**; a área Parcerias passa a conter
**marcas + assessorias parceiras**; assessorias parceiras SAI da área de clubs (o
`ClubesAreaNav` perde essa aba).
**Adendo do dono (mesmo ato):** "o mesmo se aplica para minhas afiliações e
influenciadores" → **minhas afiliações / influenciadores TAMBÉM migram para Parcerias**.
A área de clubs fica com o que é comunidade (engajamento/análise geral); Parcerias
concentra as três frentes: **Marcas · Assessorias parceiras · Afiliações
(influenciadores)**. Defaults do maestro (registrados, vetáveis): rotas antigas ganham
redirect SPA (link salvo não morre); "Parcerias" ocupa o slot que era de "Marcas" no
rail; dentro de Parcerias, menu secundário canônico com as três abas no mesmo padrão do
R9.

## D-1008-R15 · REGISTRO DO DONO: dashboard do estudo de Engajamento NÃO implementado
Na íntegra (ao embarcar, 10/08): "para fins de registro, voce nao implementou o dashboard da
visao geral que estava no claude design na página engajamento estudo."
→ O dashboard desenhado na página "Engajamento estudo" do claude design (hoje
`handoff-v2/design/engajamento-referencia.dc.html` — heatmap min-max + monocromático do
item 7 etc.) **não chegou ao código**: a tela de Engajamento recebeu só o restyle no vidro
(HIFI-REC T3; `EngajamentoView.tsx` = styling/Cascata, testes C2 intocados — confirmado
pela REV). Coerente com a raiz da leitura errada que a D-1008-R2 fecha: a lane implementou
a VG v3 no lugar do estudo de Engajamento. **Vira lane ENGAJAMENTO-DASH na retomada**
(sequência do maestro: antes do re-gate REV, para uma review só cobrir tudo; guardrails do
handoff-v2 valem — "se você se pegar editando routes/overview/, pare").

## D-1008-R14 · Animação de seleção deslizante no menu
Na íntegra: "ao trocar também o menu, quero uma animação do select, como se ele estivesse
deslizando na barra. para dar maior dinamismo ao sistema."
→ Indicador de item ativo **desliza** entre as posições ao trocar a seleção (rail e menu
secundário novo do R9) — tokens de motion do DS, respeitando `motion-reduce`.
