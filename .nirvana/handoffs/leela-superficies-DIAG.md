# Handoff · lane DIAG-SUPERFICIES

Trace `leela-pixreal-diag-20260804` · employee `sf-ux-engineer` (software-forge) · repo `C:\dev\LEELA`
Tipo: **investigação**. Zero escrita em código, spec ou token. Artefato único: o relatório.

Relatório: `.nirvana/outputs/leela-pixreal-diag-20260804/SUPERFICIES-REPORT.md`

## Veredito em uma linha

São as duas coisas, e a proporção decide o trabalho: **o descumprimento explica por que cada tela está diferente da outra; a ausência de regra explica por que nenhuma delas se separa do fundo.** Migrar as 124 superfícies para o `Card` do DS deixaria o painel uniforme, não visível — a separação máxima que o DS oferece hoje é 1,668:1 no brasa e 1,456:1 no wine.

## Os cinco números que sustentam tudo

1. `--surface-raised` sobre `--surface-base` = **1,081:1 no brasa e 1,040:1 no wine**. O limiar de componente não-textual (WCAG 1.4.11) é 3:1. O único token da casa que cruza 3:1 contra o fundo nos dois temas é `--border-strong` (4,125 / 3,598).
2. O `Card` do DS existe, está documentado com "quando usar" que cobre o caso dos kits, e tem **2 consumidores em todo o produto** (`conta/auth/AuthCard.tsx`, `landing/.../IngressoView.tsx`). As telas desenham **124 superfícies à mão**, em **78 arquivos**, em **34 rotas**; **65 (52%)** sem borda e sem sombra.
3. O grupo `card` do `component.json` tem **duas** entradas (`radius`, `critical-border`). Não há token de superfície, borda, sombra ou padding de contêiner. A única regra escrita sobre separação é a §2.16 — "flat, sem borda decorativa" — que proíbe o separador.
4. O gate de contraste **isentou o par de propósito**: `contrast.test.ts:189` declara a borda do frame "decorativa, fora do gate 1.4.11", e os pares `surface-raised × sunken` (1,09:1) e `sunken × base` (1,01:1) foram medidos, falharam, e **saíram** da matriz em vez de as superfícies serem corrigidas.
5. Os tokens `--layout-*` (a gramática de ritmo, com nomes semânticos e valores certos) têm **8 consumidores no repositório inteiro** — **6 deles na rota `overview`**, a única que o dono não reclamou. Quatro dos oito tokens (`page-pt/px/pb`, `main-gap`, `stack-gap`, `section-gap`) têm **zero**.

## Ritmo vertical (escopo acrescentado pelo maestro)

- **Confirmado por leitura direta**: escala base 4 com 17 degraus (0·2·4·6·8·10·12·14·16·20·24·32·40·48·64·80·96), meios-passos com racional do mockup; 7 degraus de raio (none·4·6·8·12·16·pill); paridade total entre brasa e wine; lint duro contra px cru (`leela-tokens/no-hardcoded-tokens`).
- **A hipótese do maestro está certa e agora tem número.** A mesma relação semântica "seção → seção" usa **sete valores diferentes** nas 122 telas: 16px (46%), 24px (19%), 12px (11%), 8px (10%), 4px, 32px, 20px. `eventos/kits` sozinha usa 12, 16, 20 e 24 em quatro arquivos da mesma aba. Cabeçalho de seção → conteúdo tem **seis** respostas.
- **A hipótese "px cru travestido" NÃO se confirmou**: o painel está **98,5% ancorado em token** (1065 de 1081 utilitários); só 9 crus, todos `gap-1`. O DS está em 83%. O problema não é px cru — é escolha de passo sem gramática, e `gap-[var(--spacing-3)]` passa em todos os gates existentes.
- **Existe regra escrita de ritmo, mas é da landing**: `LEELA-E12-landing.md:123` fixa 24px entre blocos maiores e 16px dentro de bloco. Nunca atravessou para o painel nem para `governanca-design.md`. Os números coincidem com `--layout-main-gap` (24) e `--layout-stack-gap` (16).

## A prova positiva (o controle)

`overview` é a única rota que usa `shadow-elev-1` no repouso, `--card-radius`, tokens de padding de componente (`--kpi-padding`, `--sidepanel-padding`) e a gramática `--layout-*`. É a tela que o dono acha certa. As que ele acha erradas são as que não seguem esse padrão — que nunca foi escrito como regra.

Duas telas-alvo estão em **100% solto**: `eventos/kits` (6/6) e `eventos/configuracoes` (4/4). Evidência literal: `KitsCadastroView.tsx:123` e `:168` — `rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-[var(--spacing-4)]`, sem borda, sem sombra, raio pelo token errado (`--radius-lg` em vez de `--card-radius`) e padding 16px contra os 24px do `Card`.

## O mockup tinha o padrão

Três rastros: o anel hairline dentro de `--elevation-1` do brasa; o comentário em `KpiRow.tsx:106` ("Elevação do mockup (fecha m1)"); e a landing, que redescobriu o padrão sozinha e o repete **43 vezes em 30 arquivos** (`rounded-ds-lg border border-border-default bg-surface-raised p-4|p-5|p-6`), várias vezes extraído para constante local — sinal de que a equipe sentiu falta do primitivo e criou o dela.

Achado colateral que muda a opção "só sombra": no brasa o anel de `--elevation-1` (branco 4% sobre `#0C0C0C`) compõe para **`#161616`, idêntico ao preenchimento do card** — 1,000:1 contra a própria superfície. No brasa a elevação não separa. No wine separa mais (1,252:1), porque lá é drop shadow puro.

## Proposta (insumo, não veredito)

Nada de linguagem visual nova. Quatro opções, todas já em uso em alguma tela que funciona, com o número à vista no relatório §8.2. **A recomendada é adotar o `Card` do DS como está** (borda `--border-default` + `shadow-elev-1` + `--card-radius` + padding 24/16): é a única que não exige mudar token nenhum e resolve as duas metades de uma vez — passa a usar o primitivo (descumprimento) e o primitivo vira a regra (ausência de regra).

Fecha o buraco de token expandindo `card` de 2 para 6 entradas (surface, border, shadow, radius, padding, padding-compact), todas com valor já existente. Ritmo vertical: escrever na governança a convenção de dois degraus que a landing já ratificou e que os `--layout-*` já implementam.

**Trava para não regredir**: recolocar o par contêiner × fundo na matriz de contraste, caso novo no lint plugin para contêiner desenhado à mão, e emenda na §2.16 distinguindo borda decorativa (segue proibida) de borda de contêiner (é signifier).

## Custo

Mínimo viável (só as 65 soltas): 48 arquivos, 24 rotas. Completo (as 124): 78 arquivos, 34 rotas. Ritmo: 122 telas, das quais 66 (54%) mudam de valor, com diffs de 1 a 3 linhas. DS: 4 tokens × 2 temas, 2 componentes, 2 arquivos de gate, 2 de spec.

Ordem recomendada: DS (token + gate + spec) → **`eventos/kits` sozinha como piloto** (6 ocorrências, 5 arquivos) → veto visual do dono → resto em lote por rota.

## Bloqueios e decisões que precisam do dono

1. **Borda ou sombra.** É decisão de marca; as duas cumprem o mesmo trabalho perceptivo com o mesmo custo. Não avanço sem o veto.
2. **A §2.16 precisa de emenda.** "Flat, sem borda decorativa" é a regra vigente e ela proíbe o separador. Há diretriz gravada em token proibindo recolocar borda sem nova decisão do Vitor (`GATE-DS-W1`, 2026-07-18) — aquela decisão foi sobre **campo de formulário**, não sobre **contêiner**, mas na prática virou a leitura de "flat" para tudo.
3. **Conflito interno do DS sem dono.** `Card` tem borda e sombra; `KpiCard` não tem nem uma nem outra. Dois primitivos de contêiner do mesmo DS com anatomias opostas, e nenhum documento que resolva.

## Limites desta lane (o que só o olho resolve)

Não abri navegador (regra permanente). Tudo é leitura de token, classe declarada e composição aritmética de cor. jsdom não faz layout nem pintura: não provo o pixel renderizado, o meio-pixel do anel em telas não-retina, nem contraste percebido — 1,081:1 pode ler em OLED e sumir num notebook a 40% de brilho.

**Ressalva que evita conclusão errada sobre o wine:** o painel está preso em brasa (`apps/painel/src/main.tsx:31` passa `theme="brasa"`, anulando o `localStorage`) e a landing também (`app/layout.tsx:56`). Os números do wine são **previsão para quando ele subir, não sintoma vivo** — e a previsão é pior que o brasa (1,040:1 contra 1,081:1).

**O que o dono precisa olhar:** `/eventos/{slug}/kits` × `/` (overview) lado a lado — é o A/B que decide se sombra basta ou se precisa de borda; `/eventos/{slug}/kits` × qualquer tela de `minha-conta` da landing (a landing usa borda); e o showroom em wine (`#/tokens`, seção Elevação) para ver 1,040:1 com os próprios olhos antes de o wine chegar a cliente.

## Lanes vizinhas (nada tocado)

`apps/painel` + `design-system` (rolagem), `functions/` e `leela-specs/` estão em voo. Esta lane não escreveu em nenhum deles.
