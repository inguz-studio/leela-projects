# Handoff — UXW-FIX · aplicação da revisão de UX writing do painel

- **trace_id:** `leela-redesign-v2-20260810` · lane UXW-FIX
- **worktree:** `C:\dev\leela-wt-redesign-v2` · branch `redesign-engajamento-v2` · base `f4cda04b` (árvore limpa confirmada no início)
- **fonte:** `.nirvana/handoffs/leela-uxw-review.md` (40 achados: 20 bloqueadores + 20 melhorias)
- **escopo pago:** 20 bloqueadores (20/20) + 6 melhorias (MEL-01, 02, 05, 07, 10, 20)
- **status:** PAGA. Gates verdes, bundle novo no ar em `:4601`, nenhum deploy.

---

## 1. Default do maestro registrado como VETÁVEL

**Grafia unificada da área = "Clubs" no plural, "club" no singular** (BLQ-20).

É a grafia do protótipo v3 ratificado, a do menu principal, a da vitrine e a que o dono usa quando
escreve. O defeito que ela fecha: menu e vitrine diziam "Clubs" enquanto SubNav, hub e trilha diziam
"Clubes" — e dentro de Engajamento as duas conviviam na MESMA dobra.

Superfícies alinhadas: menu secundário da área (`areaNav.ts`), `aria-label` do SubNav da área,
`aria-label` do SubNav do club, título e corpo do hub, os quatro KPIs do hub, trilha do club, tela de
criação, e o comentário de contrato de `areasDaVitrine.ts` — que já declarava "a mesma palavra que o
menu usa" e assistiu à deriva calado.

**As rotas `/clubes/*` NÃO mudaram.** URL não é copy; trocar rota é outra decisão, com redirect,
link salvo (RN-234) e custo próprio.

**Veto:** se o dono preferir "Clubes", a troca é mecânica — mesmos pontos, sentido inverso.

### Onde eu estiquei o escopo, e por quê (declarado)

A revisora listou quatro pontos divergentes. Estiquei para mais três, todos dentro da mesma área:

| Estendido | Motivo |
|---|---|
| `aria-label="Seções de clubs"` (SubNav da área) e `"Seções do club"` (SubNav do club) | é a mesma nav que a revisora nomeia; deixá-la em "clubes" recriava o defeito na voz do leitor de tela |
| corpo do hub além das l.127-128/176-177 (busca, skeleton, erro, CTA, headings de zona) | a revisora já pedia o singular nas linhas que citou; parar no meio deixaria "Clubs parceiros" ao lado de "Buscar clube parceiro" |
| tela de criação (`NovoClubePage`) — h1, botão e os 4 rótulos do formulário | o CTA que a abre passou a dizer "Criar club"; CTA e destino têm de concordar |

**Fora, na fila:** telas DENTRO de um club (membros, configurações, desafios) seguem com "clube" —
não estavam no diff da revisão e não são o defeito "um clique de distância".

---

## 2. Bloqueadores — 20/20 pagos

| # | O que era | O que ficou |
|---|---|---|
| BLQ-01 | KPI "Atletas alcançados" · hint "somados entre os clubes" | "Pessoas alcançadas" · "somadas entre os clubs" (campo interno `atletasAlcancados` intacto) |
| BLQ-02 | "Assim que o primeiro atleta usar o código…" | "Assim que a primeira pessoa entrar pelo código, por um convite ou pelo link do club, a porta dela aparece aqui." |
| BLQ-03 | "…não é interesse declarado pelo atleta, que o sistema não guarda —" (travessão duplo) | "A modalidade é a do club, não um interesse que o membro declarou: esse campo não existe. Uma pessoa ativa em dois clubs conta nos dois." |
| BLQ-04 | "os registros de atividade do atleta não são legíveis pelo organizador" | "os registros de atividade de cada participante não ficam disponíveis para o organizador" |
| BLQ-05 | "apontada para uma prova sua" | "apontada para um evento seu" |
| BLQ-06 | "transforma o treino da comunidade em preparação para a sua prova" | "transforma a atividade da comunidade em preparação para o seu evento" |
| BLQ-07 | legenda "ocupação das provas" | "ocupação dos eventos" |
| BLQ-08 | "condição de desconto aos atletas dela" | "…aos participantes dela" |
| BLQ-09 | "retido por 90 dias (RN-144) e não pode ser reativado — recadastro é…" | "retido por 90 dias e não pode ser reativado: recadastrar cria uma parceria nova." |
| BLQ-10 | keep "O histórico da parceria (retido 90 dias — RN-144)" | "O histórico da parceria, retido por 90 dias" |
| BLQ-11 | "Não foi possível identificar seu tenant." | "Não foi possível identificar o organizador desta conta." |
| BLQ-12 | título "Sessão sem organizador" | "Conta sem organizador vinculado" |
| BLQ-13 | `caption="Influenciadores do tenant"` | `caption="Influenciadores do organizador"` |
| BLQ-14 | "A ação é idempotente: reenviar não debita duas vezes." | "Se você reenviar, o valor não é debitado duas vezes." |
| BLQ-15 | "…vive no registro de cada atleta, e as Rules não abrem esse caminho… O agregado do desafio guarda…" | "…fica no registro pessoal de quem fez a atividade, e o organizador não tem acesso a esse registro. O que o desafio guarda é a média de pontos por pilar, nunca a contagem de ações." |
| BLQ-16 | "O doc de pagamento guarda a forma… nenhum agregado… chega ao cliente… não varre documentos" | "Cada pagamento registra se foi PIX ou cartão, mas ainda não existe um total por forma de pagamento. Quando ele existir, o gráfico aparece aqui." |
| BLQ-17 | "o cadastro de cliente não carrega o vínculo… seria chute com cara de número" | causa de uma frase, sem modelo de dados e sem voz de time (ver MEL-02) |
| **BLQ-18** | hint "visitantes → inscritos" sob um "—" permanente | **CORTE.** O card inteiro não renderiza sem denominador (RN-489 · CONV-1, default esconder). A faixa nasce com 3 colunas; com denominador, o card volta sozinho. |
| **BLQ-19** | `nomeDoPainelAtual` → "Painel do Organizador" | **"Painel Profissional"** (RN-468). "Painel Master" fica do outro lado. Toca a moldura → suíte COMPLETA rodada. |
| **BLQ-20** | "Clubs" × "Clubes" a um clique | grafia unificada em "Clubs"/"club" (seção 1) |

### Nota sobre BLQ-15 e MEL-03

A proposta literal da revisora para BLQ-15 apaga também a frase que descreve o bloco do estudo — isso
é **MEL-03**, que está na fila, não no escopo. Paguei só o contrato do bloqueador (fora "Rules",
"agregado", "atleta"); a descrição do bloco fica de pé, com o teste que a cobre. Se o maestro quiser
MEL-03, é uma linha.

---

## 3. Melhorias aplicadas — 6

| # | Entrega |
|---|---|
| MEL-01 | O bloco de erro do Engajamento ganhou saída: "Não foi possível carregar o engajamento da sua comunidade. Tente novamente." + botão **Tentar novamente**. A justificativa de projeto ("os números só aparecem completos") saiu. O retry é fiado de verdade: `useClubesDoTenant` e `useDadosDoEngajamento` passaram a expor `refetch`, e o container recarrega **as duas pontas** (o erro exibido é o primeiro que apareceu e não diz qual falhou). |
| MEL-02 | "Conversão da base" virou o `CardEmBreve` da casa — nome da métrica no `SecaoHead`, "Em breve" pelo componente, causa em UMA frase. Era o único dos seis em-breves da tela fora do padrão. |
| MEL-05 | Ajuda dos pilares em duas frases: "Quanto a comunidade acumulou em cada pilar, em média por participante, comparado ao mínimo do desafio. Desafios com mais gente pesam mais na média." |
| MEL-07 | `inativo`: "Sem registro (30 dias+)" → **"Parados há 30 dias ou mais"**. A D-2 segue respeitada: o rótulo não afirma a última atividade. |
| MEL-10 | Abertura de enchimento e promessa falsa cortadas: "Crie um club e esta tela passa a **mostrar quem está na sua comunidade**…" (antes: "O engajamento nasce da comunidade… passa a **contar quem aparece**", que a própria tela declara ausente em três blocos). |
| MEL-20 | Ticket médio indeterminado passa a dizer a causa no slot de apoio: **"sem venda confirmada ainda"**. A causa nomeada sem jargão é a troca do denominador da R19 — o ticket divide por quem PAGOU, então sem venda fechada não há número. |

---

## 4. Gates — números reais

Tudo em **foreground**, em série. `pnpm --config.verify-deps-before-run=false`.

| Gate | Resultado |
|---|---|
| Suíte painel COMPLETA (lei de moldura — BLQ-19 toca `RootShell`) | **235 arquivos · 2580 testes · 2580 passed, 0 failed** (424,30 s) |
| Suíte design-system COMPLETA | **75 arquivos · 1808 testes · 1808 passed, 0 failed** (49,71 s) |
| `type-check` painel | limpo (`tsc --noEmit`, exit 0) |
| `type-check` design-system | limpo |
| `lint` painel `--max-warnings 0` | limpo |
| `lint` design-system `--max-warnings 0` | limpo (`src` + `showcase/src`) |
| `generate-tokens` 2× | exit 0 nas duas; `git status` **vazio** após a segunda → determinístico |
| L-021 · zero hex/px/rgb/hsl no diff da lane | **0 ocorrências** nas linhas `+` de `f4cda04b..HEAD` |

### Grep final — superfície limpa

1. **atleta / prova / corrida como categoria** nas linhas de código adicionadas: as únicas ocorrências
   restantes são (a) asserções NEGATIVAS que provam a ausência, (b) o campo interno
   `kpis.atletasAlcancados`, (c) conteúdo do organizador nos fixtures ("Corrida de rua",
   "Corrida Perfeita Sul") — que a D-0802-1 preserva de propósito. A suíte tem um caso novo que varre
   `container.textContent` da tela inteira e cobra as duas metades ao mesmo tempo.
2. **RN-XXX / tenant / idempotente / Rules / doc / agregado** em prop de render (`label|title|titulo|
   description|descricao|ajuda|causa|caption|aria-label|legenda|hint|placeholder`) das 8 telas tocadas:
   **zero**. A única linha que casa é `value={formatInt(kpis.atletasAlcancados)}` — identificador, não string.

### Bundle servido (não o disco)

Baixado de `http://localhost:4601/assets/index-gP3Fk6z3.js` e conferido:

- presentes: `Painel Profissional`, `Pessoas alcançadas`, `Clubs parceiros`, `Parados há 30 dias ou mais`, `sem venda confirmada ainda`, `Tentar novamente`
- ausentes (0 ocorrências): `visitantes → inscritos`, `Painel do Organizador`, `Atletas alcançados`, `não é mensurável`

### Conferência renderizada (navegador, no :4601)

- `/clubes`: título **Clubs**, SubNav **Clubs · Engajamento**, KPIs **Clubs ativos · Pessoas alcançadas ("somadas entre os clubs") · Desafios ativos · Meus clubs**, zonas **MEUS CLUBS** / **CLUBS PARCEIROS**, CTA **+ Criar club**.
- rail aberto: **PAINEL PROFISSIONAL**, item de menu **Clubs** — as três superfícies do BLQ-20 e o BLQ-19 concordando na mesma tela.
- `/eventos/teste-taxa-repassada`: faixa de KPIs com `xl:grid-cols-3` e **3 cards** (Receita confirmada · Ticket médio · Repasse previsto). `Taxa de conversão` e `visitantes` não existem no texto da página. **BLQ-18 provado renderizado.**

---

## 5. Commits e push

Critério declarado: **um commit por superfície-tema**, com as melhorias viajando junto dos
bloqueadores que moram nas MESMAS strings (MEL-02 reescreve exatamente o bloco que BLQ-17 aponta;
MEL-01 exige a prop que o bloco de erro usa). Separá-las produziria um commit que deixa o arquivo num
estado que o commit seguinte reescreve na hora.

| Commit | Conteúdo |
|---|---|
| `f960a16d` | `fix(painel): Engajamento fala experiencia, nao corrida — e para de vazar jargao` · BLQ-02..07, 15, 16, 17 + MEL-01, 02, 05, 07, 10 |
| `e5ee7d21` | `fix(painel): Parcerias sem jargao interno e o card de conversao que nao mede nada` · BLQ-08..14, 18 + MEL-20 |
| `dec4c2cc` | `fix(painel+shell): Painel Profissional no rail e uma grafia so para a area de Clubs` · BLQ-01, 19, 20 |

Push feito após o 2º commit (`e5ee7d21`). O 3º precisa de push.

Todos com trailers `Constraint:` / `Rejected:` / `Confidence:` / `Scope-risk:` / `Directive:` / `Not-tested:`.

---

## 6. Servidor de conferência

| | |
|---|---|
| Build | `vite build --mode leela-hub` · 4011 módulos · exit 0 · 14,47 s |
| Bundle | `assets/index-gP3Fk6z3.js` — 2.286,73 kB (gzip 608,80 kB) · CSS `index-sDPZyP0B.css` 141,01 kB (gzip 20,87 kB) |
| SHA-256 do JS servido | `047d27d91c363023dd57bf0783e310eadf258ba9f332aee83f8d6c4fa103c6b3` |
| PID antigo (:4601) | `16464` — morto |
| **PID novo (:4601)** | **`23744`** — mesma porta, mesmo `.maestro-logs/serve-4601.js`, `HTTP 200`, 2.291.221 bytes |
| `:4599` | **intocado** — segue no PID `25384` (build do `leela-wt-bootreal2`) |
| Deploy | **NENHUM** |

---

## 7. Fila registrada

### ⛔ ACHADO NOVO — prioridade alta, fora do escopo desta lane

**Todo rótulo do eixo Y do `BarChart` do DS é truncado para UM caractere.**

`packages/design-system/src/components/charts/BarChart.tsx:130` passa `tickFormatter={truncarRotulo}`.
O Recharts chama o formatter com `(valor, índice)`, e o segundo parâmetro de `truncarRotulo(rotulo, max)`
é justamente `max` — então o índice da barra vira o limite de caracteres. Índice 0 → "N…", 1 → "A…",
2 → "P…".

Medido no build servido, na tela de Engajamento (`svg text` do gráfico "Membros por situação"):
`[{"txt":"N…","w":17},{"txt":"A…","w":17},{"txt":"P…","w":16}]`, com o contêiner em 505 px de largura
— não é falta de espaço. Reproduz com "Ativos", de 6 caracteres, o que descarta comprimento de rótulo
como causa.

**PRÉ-EXISTENTE**, introduzido em `a826dc3a` (`fix(ds): tick do BarChart trunca com reticencias`,
HIFI-REC-T4); o arquivo está intocado nesta lane (`git diff f4cda04b..HEAD` vazio nele). A suíte do DS
(1808 testes) não cobre a aridade do formatter.

Consequência para esta lane: **MEL-07 está pago no dado e invisível na tela** enquanto o defeito
existir — e o mesmo vale para todo rótulo de barra do painel. Conserto é uma linha
(`tickFormatter={(v) => truncarRotulo(v)}`) mais um teste de aridade, com gate visual próprio.

### As 15 melhorias não pagas (da revisão)

| # | Achado |
|---|---|
| MEL-03 | causa de "Check-ins realizados" tem 4 frases; o padrão da casa é uma |
| MEL-04 | Title Case em "Mapa de Check-ins" / "Volume de Check-ins" |
| MEL-06 | "recorte" é vocabulário do card e chega ao usuário, inclusive por leitor de tela |
| MEL-08 | "PAGOU" em caixa alta num modal de dinheiro |
| MEL-09 | hint `${n} seu(s)` — plural entre parênteses na tela |
| MEL-11 | "comparar os dois não compara coisas comparáveis" (circular) |
| MEL-12 | "barra zerada ocupa espaço e não informa" — razão de projeto endereçada ao designer |
| MEL-13 | "Um desafio ativo é o que dá à comunidade uma razão…" — estímulo sem ação |
| MEL-14 | "{pilar} é o pilar com a maior média…" repete em texto o que a barra desenha (**vetável do dono**) |
| MEL-15 | "split" (jargão de meios de pagamento) |
| MEL-16 | "outro escopo/parceria" no erro de cupom duplicado |
| MEL-17 | "neste organizador" — lê errado em português |
| MEL-18 | "Seções de **P**arcerias" e as outras três navs em sentence case (a de clubs já foi, via BLQ-20) |
| MEL-19 | `label: 'Visão Geral'` em Title Case no menu principal × "Visão geral" na vitrine |
| MEL-21 | **`be-hero.com.br` hardcoded** — `ClubeShell.tsx:56`. Fora do escopo por instrução do maestro. |

### Achados extras que encontrei durante a lane (mesma classe, fora do diff da revisão)

| Onde | O quê |
|---|---|
| `clubes/clube/configuracoes/ConfiguracoesView.tsx:400` e `DeletarClubeModal.tsx:85` | "(RN-144)" visível ao usuário — mesma classe de BLQ-09/10, provado no bundle servido |
| `ConfiguracoesView.tsx:343` e `NovoClubePage.tsx:210` | "(RN-141)" visível no checkbox de aprovação manual |
| `eventos/entrega/estados/EstadosBalcao.tsx:74` | "(idempotente)" visível — mesma classe de BLQ-14 |
| `NovoClubePage.tsx:113` | segundo `be-hero.com.br` hardcoded, irmão de MEL-21 |
| `packages/design-system/.../Sidebar.stories.tsx:49` e `Sidebar.test.tsx:309` | "Painel do Organizador" como texto de exemplo do DS — não é o painel, mas contradiz a RN-468 em superfície de showcase |
| `eventos/afiliados/AfiliadosPage.tsx:220`, `parcerias/afiliacoes/InfluenciadoresPage.tsx:187` | "Clube"/"Clubes" como TIPO de afiliado, fora da área de clubs — fica para a decisão de grafia se o dono ratificar "Clubs" |
| telas dentro de um club (membros, configurações, desafios) | seguem com "clube"; varredura de singular é o próximo passo do BLQ-20 se o default for ratificado |

---

## 8. O que precisa do dono

1. **Veto da grafia "Clubs"** (default aplicado, seção 1).
2. **RN-489 · CONV-1**: apliquei o default da regra (esconder o card). Se ele preferir manter o card
   com "—", é a alternativa que a própria regra prevê — mas sem rótulo de fonte, que a RN proíbe.
3. **MEL-14** segue vetável (cortar a frase do pilar líder, ou dar número a ela).
