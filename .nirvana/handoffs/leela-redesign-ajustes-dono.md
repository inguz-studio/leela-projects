---
trace: leela-redesign-v2-20260810
lane: AJUSTES-DONO (leva 3 · D-1008-R7..R14 · T1-T7)
alvo: branch redesign-engajamento-v2 · base 486ebaa4 → HEAD 50c369ba · C:/dev/leela-wt-redesign-v2
data: 2026-08-10
estado: EMERGENCY-STOP (PC desligando) — T1..T7 TODAS pagas e PUSHED (T4 = proposta, sem código); árvore LIMPA, zero órfão; gates: suítes+tsc+lint VERDES; FALTAM generate-tokens 2×, grep hex/px, grep L-021, rebuild + re-servir :4601
---

# AJUSTES-DONO · handoff vivo

Contrato: `.nirvana/briefs/leela-redesign-ajustes-dono-enriched.md`. Decisões-fonte:
`leela-specs/02-rodadas/2026-08-09-redesign-ds/01-decisoes-dono-1008-retomada.md` (leva 3).
Disciplina: `git commit --only` com pathspec por tarefa; push a cada 2 commits; pnpm com
`--config.verify-deps-before-run=false`; suítes em série; :4599 intocado; NENHUM deploy.

Estado inicial verificado: árvore LIMPA em `486ebaa4` (up to date com origin);
:4601 PID 22812 servindo `index-D-BqnPen.js`; :4599 PID 25384 intocado.

## Ordem de execução

T1 (R7 · CTA altura canônica) → T2 (R11 · kits sem contêiner) → T3 (R12 · tabela de
lotes) → T4-T7 conforme acoplamento de arquivos.

## T1 · R7 — CTA na altura canônica — PAGO (root cause provado)

**Root cause: NÃO era var quebrada.** `--v3-cta-h: 48px` / `--v3-cta-h-sm: 44px`
resolviam nos 3 temas (definidos em `tokens/component.json` grupo v3, gerados para
brasa/wine/dark-wine/index + rn-themes). O 48/44 era o size `cta`/`cta-sm`
DELIBERADO do HIFI-REC-FIX F3, fiel ao pin l.281 do protótipo. A decisão do dono
inverte o pin: a medida do protótipo perde para o padrão do DS.

**Fix (no canônico):** sizes `cta` e `cta-sm` passam a `h-[var(--btn-height-md)]`
(36px, a altura default que o painel inteiro usa — levantamento: 96 arquivos com
`<Button` são md default; `size="lg"` de Button real é raríssimo). Tokens
`v3.cta-h/-sm` MORRERAM na fonte (`component.json`) e em todos os gerados —
zero órfão. Nenhuma outra propriedade do CTA mudou (w-full, raio md, gap 2.5,
tipografia base-plus bold / base intactos).

**Default do maestro registrado (vetável):** o par 48/44 colapsou numa ÚNICA
altura canônica (md) para os dois sizes — a hierarquia primário/neutro segue
pelo variant (cor) e tipografia, não por 4px de altura. Se o dono quiser o CTA
primário em `lg` (48px canônico), é decisão nova — mas 48px foi exatamente o
que ele reprovou na tela.

**Pins atualizados com a anotação da decisão:** `Button.test.tsx` (2 pins →
`--btn-height-md`, comentário D-1008-R7), `rail-v3-tokens.test.ts` (pins dos 2
tokens removidos com nota apontando a decisão e onde vive o pin novo),
`Button/LLM.txt` (sizes + tokens consumidos), comentários de `variants.ts` e
`CartaoV3.tsx`.

- Testes: Button+rail-v3-tokens **88/88** ✔ · Countdown+ComunidadeResumo (consumidores CtaV3) **15/15** ✔ · generate-tokens rodado (gerados re-escritos sem cta-h)
- Commit `1e7cdfe9` (11 arquivos, +32/−43).

## T2 · R11 — kits sem contêiner — PAGO (root cause provado por teste)

**Root cause: mesma FAMÍLIA do R4, mecanismo distinto — e NÃO é "var não
resolve fora da VG".** Sob `[data-glass="on"]` (ligado em TODA rota do
organizador por `vidroDaRota`), `--surface-raised` remapeia para o FILME
translúcido do vidro (brasa `rgba(30,11,16,0.42)` · wine `rgba(255,255,255,0.62)`
· dark-wine `rgba(46,18,26,0.34)`), desenhado para ler como cartão SÓ com a
receita completa: backdrop-blur (`--card-blur`) + borda + elevação. Os
componentes CANÔNICOS carregam a receita (Card: bg+borda+sombra+blur;
KpiCard/CartaoV3/CardEvento/CardDesafio: bg+blur[+sombra]). `KitCard`/`ItemCard`
da KitsCadastroView eram `<article>` CRUS com `bg-[var(--surface-raised)]` e
nada mais (re-implementação pré-cânone do Card, L-021): filme sem pareamento
sobre a página escura = invisível. Antes do vidro a var era opaca
(neutral-900) — por isso "perderam" o fundo no tema novo, como o dono descreveu.
KitEditor NUNCA desenhou contêiner (form de tela cheia por design S206) — sem
regressão lá.

**Fix no canônico:** KitCard/ItemCard viram composição do `Card` do DS
(`role="article"` preserva a semântica de AT do `<article>`). Zero cor nova,
zero conserto por tela — a tela passou a consumir a receita do cânone.

**Prova por teste na cascata real:** novo
`kits/__tests__/superficie-cartoes.test.tsx` — (1) os dois cartões renderizam a
receita canônica (bg-card + border-border + shadow-elev-1 + backdrop-filter) e
o bg cru não volta; (2) resolvendo `themes/index.css` publicado (com strip do
fallback `@supports`, que devolve o opaco e mascararia o filme): sob o vidro
`--surface-raised` É rgba nos 3 temas, `--card` segue a MESMA superfície (o fix
é a receita, não outra cor), `--card-blur` resolve blur real; sem vidro a var é
opaca (por isso os cartões crus funcionavam pré-redesign). Helper do teste
existente (`closest('article')`) mudou SÓ o selector (`[role="article"], article`)
— asserções intactas.

- Testes kits: **98/98** (6 arquivos; 89 + 9 novos) ✔
- Commit `a60690c2` (3 arquivos, +215/−7). **Push feito (T1+T2).**

**⚠️ ACHADO NOVO (fila, lane própria):** ~40 telas legadas do painel consomem
`bg-[var(--surface-raised)]` cru sem a receita (clubes/assessorias, comunicação,
desafios, membros, parcerias, engajamento, conta, CRM, influenciadores…) — TODAS
com a mesma invisibilidade potencial sob o vidro. É a migração para o Card
canônico que o roadmap `leela-roadmap-componentes-20260810` já cobre — anexar
este inventário lá (grep: `bg-\[var\(--surface-raised\)\]` em
`apps/painel/src/routes`). Não coube no contrato desta lane (conserto pontual
R11 + cânone).

## T3 · R12 — tabela de lotes: três colunas — PAGO

A coluna única `Vagas (vendidas · disponíveis · total)` ("150 · 0 · 150" numa
célula) virou TRÊS colunas da Table canônica: **Vendidos · Disponíveis · Total**,
`align: right` + tabular-nums (alinhamento numérico do padrão), derivação
intacta do kernel (`capacidadeDoLote`). Ênfase visual preservada (disponível =
success semibold). Teste re-escrito: 3 columnheaders + asserto por CÉLULA
(regressão: a coluna única não volta).

- Testes lotes: **41/41** ✔ (pré T2-ext) → 8/8 no arquivo após T2-ext
- Commit `b38ec3a6` (2 arquivos, +55/−28).

## T2-ext · R11 na tela de lotes — PAGO (registrado, mesma decisão)

O `<section>` do bloco de modalidade em LotesView era outro consumidor CRU de
`bg-[var(--surface-raised)]` — filme invisível sob o vidro, na MESMA tela que o
dono re-valida em R12/R13. Virou `Card` canônico com `role="region"` +
aria-label (landmark preservado; queries `getByRole('region')` intactas) +
teste pinando a receita. **Extensão deliberada e registrada: só telas tocadas
por esta lane** — o resto do inventário (~40) fica para a lane do roadmap de
componentes.

- Commit `3ddb3c99` (2 arquivos, +20/−4). **Push feito (T3 + T2-ext).**

## T4 · R13 — modalidades antes de lotes — PROPOSTA (escalate_if DISPAROU)

**Specs lidas antes de decidir** (ordem do brief): rodada
`02-rodadas/2026-08-05-modalidade-e-kit/` (01-decisoes-dono · 04-fila-codigo) +
`ConfigGeraisForm`/`LotesView`/`EventoForm`/`subnav.ts` no código.

**Fatos que mudam o problema:**
1. Modalidades nascem UMA vez, na criação do evento (`EventoForm`), e **nenhuma
   superfície do painel edita a lista depois** — nem typo. A copy honesta de
   LotesView/ConfigGeraisForm (lane DIAG-PAINEL-LACUNAS) já conta isso.
2. A solução COMPLETA já está decidida e spec'ada: **D-0805-6** ("precisamos
   editar as modalidades", palavra do dono em 05/08) → fila **S316 T1..T6**
   (`04-fila-codigo.md`): callable transacional `editarModalidadesEvento`
   (RN-500), renomeação atômica de 5 alvos ⚔⚔ (RN-501), remoção que nomeia os
   bloqueadores (RN-502), a TELA da lista em Configurações reusando os chips da
   criação (S316-T4), recuperação de evento degradado (RN-505). Rota opus nas
   tarefas de servidor. **Nada foi construído** (zero hits de
   `editarModalidadesEvento` no repo).
3. (b) do dono ("modalidades primeiro, lotes depois") JÁ é a ordem do domínio —
   modalidades nascem ANTES, na criação. O que quebra a leitura dele é a
   INVISIBILIDADE: em Lotes não se vê nem se alcança a lista, e a sub-nav do
   evento não tem nenhuma entrada "Modalidades".

**Por que proposta e não código (escalate_if):** "configuração de modalidades
alcançável a partir de lotes" exige um DESTINO de navegação que não existe;
construí-lo é a fila S316 (servidor com integridade referencial de venda,
⚔⚔, rota opus) — reestrutura além de "reordenar navegação + visibilidade", e
com spec própria que esta lane não deve duplicar nem contrariar.

**Proposta (vetável do dono):**
- **Fase A — visibilidade (lane curta, painel-only):** a seção "Data e
  modalidades" de Configurações passa a LISTAR as modalidades do evento (hoje é
  só copy), e Lotes ganha affordance "Ver modalidades" apontando para lá
  (âncora SPA). Serve o "alcançável a partir de lotes" sem servidor.
- **Fase B — edição de verdade:** despachar a fila S316 frente 1 (T1..T5, rotas
  da própria fila); a seção de Configurações vira EDITOR e a affordance de
  Lotes passa a levar à edição. S317 (interruptor "inclui o kit da modalidade"
  no lote, D-0805-5) é vizinho e pode ir na mesma lane.
- **Ordem literal na sub-nav (se o dono quiser):** hoje é Visão geral ·
  Inscritos · Kits · Lotes · … · Configurações. Se modalidades ganharem
  superfície própria, entra ANTES de Lotes (entre Kits e Lotes) — decisão de
  IA junto com a Fase B.

## T5 · R9+R14 — menu secundário + indicador deslizante — PAGO (2 commits)

**R14 (DS, commit `8cb1631b`):** o indicador de seleção vira UM elemento que
DESLIZA. SubNav: morreu o `::after` por aba; nasceu `[data-subnav-indicador]`
(translateX + width por MEDIÇÃO de layout — **px de runtime declarado, não px
de design**; o gate de hex/px deve ler essa exceção). SidebarRail: o fundo
brasa+glow do item ativo virou o pill `[data-rail-indicador]` (translateY
medido; largura por insets `--rail-px` — acompanha o rail até DURANTE o
abrir/fechar de 650ms). Motion: `--motion-duration-normal` +
`--motion-easing-default`; `motion-reduce:transition-none` nos dois;
decorativos (aria-hidden + pointer-events-none); `aria-current` segue nos
itens. O elemento só nasce após a 1ª medição — entra em posição, sem animar do
zero. jsdom não faz layout: o teste pina ANATOMIA/ESTILO; o movimento real é
conferência renderizada. LLM.txt do SubNav re-sincronizado (divider e
assinatura do onClick estavam defasados — pagos junto). SubNav+SidebarRail:
**51/51** ✔.

**R9 (painel, commit `ea79e9b9`):** os 4 botões soltos do hub (Engajamento ·
Minhas afiliações · Influenciadores · Assessorias parceiras) viraram
`ClubesAreaNav` — SubNav canônica com fonte pura `clubesAreaNavTabs` (padrão
eventos/_lib/subnav) + `tabsComNavSpa` (âncoras de verdade, lei
navegacao-spa). Menu nas 5 superfícies da área (hub "Clubes" ativo + 4
destinos), então o indicador tem entre o que deslizar. Consequências
registradas (vetáveis): (1) props `onAbrir*` do HubClubes morreram — a view
recebe `areaNav` como node e segue presentational; (2) o botão "Voltar para
Clubes" de Influenciadores morreu — a entrada "Clubes" do menu é o caminho de
volta; (3) Assessorias renderiza o menu com `px-0` (a página já tem padding
próprio). Teste de tabela das 5 entradas; harness de MinhasAfiliacoes ganhou
MemoryRouter (a página agora monta navegação — asserções intactas). Clubes:
**367/367** ✔ · type-check painel exit 0. **Push feito (T5-R14 + T5-R9).**

## T6 · R10 — voltar do painel do club — PAGO

ClubeShell não tinha trilha nenhuma. Entrou o padrão canônico do EventoShell:
`Breadcrumb` do DS + `trilhaComNavSpa` — trilha "Clubes › {nome}" acima do
PageHeader, âncora REAL para `/clubes` (ctrl+clique/clique do meio/copiar
endereço vivem) com clique simples por SPA (lei navegacao-spa). Teste com o
helper da casa `clicarNoDom`: preventDefault no clique simples, default VIVO no
ctrl+clique, nome do club fecha a trilha como texto (não link).

- Testes ClubeShell: **6/6** ✔ · Commit `83eb1a12` (2 arquivos, +36/−2).

## T7 · R8 — corte de frases de apoio — PAGO (lista VETÁVEL abaixo)

Varredura nas superfícies do redesign, prioridade Clubs (a palavra do dono).
Método: cortar o REDUNDANTE (o que o conteúdo logo abaixo já diz), manter o
funcional (estado, dado, distinção de conceito). Commit `50c369ba`.

**CORTADAS (frase → tela):**

| # | Frase cortada | Tela |
|---|---|---|
| 1 | "Comunidades em torno dos seus eventos" (subtítulo do header) | `/clubes` (hub) |
| 2 | "A saúde da sua comunidade: quem está nos clubs, o que os move e como isso chega aos seus eventos." (subtítulo) — repetia as legendas das DUAS faixas da própria tela | `/clubes/engajamento` |
| 3 | "Seu negócio como divulgador — quanto você trouxe, quanto vai receber e qual link usar. Só o seu." (subtítulo) — o recorte "só o seu" segue garantido pelo DADO (RN-318), não por aviso | `/clubes/minhas-afiliacoes` |
| 4 | "Conversões e comissão de clubes-influenciadores e pessoas físicas por evento" (subtítulo) — a tabela abaixo tem as colunas | `/clubes/influenciadores` |
| 5 | "(E18)" — jargão interno de épico vazando para o usuário; o resto da frase FICA ("Clubs parceiros com condição de desconto exclusiva — sem comissão, sem split.", é a distinção assessoria≠influenciador) | `/clubes/assessorias` |

**MANTIDAS de propósito (registradas):** legendas das duas faixas do
engajamento ("A comunidade em si…" / "A ponte…" — com o subtítulo cortado, são
a única orientação de seção); leituras de dado ("{pilar} é o pilar com a maior
média…"); hints de KpiCard (contexto do número); textos de ESTADO ("Você ainda
não administra nenhum clube.", EmptyStates, em-breves honestos); os "?" de
ajuda do SecaoHead (JÁ são disclosure progressiva — rodada REFACTOR item 12);
subtítulo do ClubeShell (é dado: localização · membros · desde). A Visão Geral
v3 não foi tocada (protótipo ratificado D-1008-R3). Fora de clubs, nenhum corte
nesta lane — o intro de LotesView é copy honesta da DIAG-PAINEL-LACUNAS e
entra na proposta T4.

- Testes das telas tocadas: **146/146** ✔. **Push feito (T6+T7).**

## ⛔ EMERGENCY-STOP (ordem do maestro — PC desligando)

**Estado no corte:** árvore `C:/dev/leela-wt-redesign-v2` LIMPA (`git status`
vazio), HEAD `50c369ba`, `git push` = Everything up-to-date. **ZERO diff
órfão.** Nenhuma tarefa pela metade — as 7 estão pagas (T4 = proposta neste
handoff, decisão do escalate_if do brief).

**Commits da lane (todos pushed, base 486ebaa4 → 50c369ba):**
- `1e7cdfe9` T1 (R7 · CTA altura canônica) · `a60690c2` T2 (R11 · kits no Card)
- `b38ec3a6` T3 (R12 · 3 colunas) · `3ddb3c99` T2-ext (R11 na tela de lotes)
- `8cb1631b` T5-R14 (indicador desliza DS) · `ea79e9b9` T5-R9 (menu da área)
- `83eb1a12` T6 (R10 · trilha do club) · `50c369ba` T7 (R8 · corte de frases)

**Gates que RODARAM (números reais, pós-T7):**
| Gate | Resultado |
|---|---|
| Suíte DS completa | **1790/1790** (75 arquivos) ✔ |
| Suíte painel INTEIRA | **2474/2474** (231 arquivos) ✔ — lei de moldura satisfeita (T5 tocou o rail) |
| type-check | DS exit 0 ✔ · painel exit 0 ✔ |
| lint `--max-warnings 0` | DS exit 0 ✔ · painel exit 0 ✔ |

**Gates que NÃO chegaram a rodar (fila da retomada, nesta ordem):**
1. `generate-tokens` 2× sem diff (foi rodado DENTRO da T1 com gerados
   re-escritos e commitados; falta a prova formal 2× pós-lane).
2. Grep hex/px no diff de componentes `486ebaa4..50c369ba` — **exceção
   declarada:** os `px` de RUNTIME dos indicadores deslizantes
   (`translateX/Y(${n}px)` em SubNav.tsx e SidebarRail.tsx, medição de layout,
   não px de design) e asserções/comentários de teste.
3. Grep L-021 (controle cru / re-implementação) no diff do painel — nota: a
   lane REMOVEU re-implementações (kits/lotes → Card canônico).
4. **Rebuild `vite build --mode leela-hub` + matar PID 22812 + re-servir a
   MESMA :4601 via `.maestro-logs/serve-4601.js` + registrar PID novo e hash
   do bundle.** O :4601 ainda serve `index-D-BqnPen.js` (bundle PRÉ-lane — a
   validação do dono lá NÃO vê nada desta lane até o re-serve). `:4599`
   (PID 25384) INTOCADO. NENHUM deploy.
5. Conferência RENDERIZADA (maestro/dono): CTA 36px, cartões de kit/lotes
   desenhando, 3 colunas, menu da área com indicador DESLIZANDO, pill do rail
   deslizando, trilha do club, cortes de frase (lista vetável acima).

**Fila além dos gates:** proposta T4 aguarda decisão do dono (Fase A/Fase B +
S316); achado dos ~40 `bg-[var(--surface-raised)]` crus → roadmap
`leela-roadmap-componentes-20260810`; vetáveis: colapso 48/44→md único (T1),
morte dos props `onAbrir*`/botão "Voltar para Clubes" (T5-R9), cortes T7.
