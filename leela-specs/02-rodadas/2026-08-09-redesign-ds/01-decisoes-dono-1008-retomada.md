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
