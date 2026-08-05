# REV-MOTION — review em contexto fresco (antagonista)

**Lane:** REV-MOTION · `leela-pixreal-diag-20260804`
**Sob review:** `bf93ed51` (motion no DS) · `60c50382` (unificação do "Entrar") · `bf507396` (gate de lint) · `8cfe56bb` (logo no modal)
**Revisor:** sf-qa-engineer (software-forge) — Testing Trophy + destructive + bias-check
**Data:** 05/08/2026

---

## Veredito

**APROVADO COM FIX.** O mecanismo da saída animada está correto e o problema-raiz que o
construtor descreveu era real (as classes `animate-out` existiam desde a A2 e nunca rodaram um
frame). O ataque derrubou **dois defeitos na janela de coexistência** que a própria lane abriu —
nenhum deles declarado — e ambos foram corrigidos com teste que os teria pegado.

O que NÃO se sustentou como defeito, e por quê, está em "hipóteses falsificadas". Nove reviews
antes desta acharam defeito no não declarado; aqui o não declarado foi a janela de 800ms em que
dois overlays existem ao mesmo tempo.

---

## O número que o dono pediu (item 2 — inércia da página no fechar)

Medido, não opinado. Teste `overlayMotion.rev.test.tsx › o custo do fechar é EXATAMENTE a duração
do token`.

| Momento depois do "fechar" | Cortina cobre a tela | `body` rola | `aria-modal` |
|---|---|---|---|
| 0 ms | sim | não | `true` |
| 400 ms | sim | não | `true` |
| **799 ms** | **sim** | **não** | **`true`** |
| 800 ms | não | sim | — (nó fora do DOM) |

**A página fica inerte por exatamente 800 ms — a duração inteira do token `--motion-overlay-duration`.**
Nem 1 ms a mais (o desmonte é no mesmo tick do fim do timer), nem 1 ms a menos.

Durante esses 800 ms, quem clica em algo atrás **não alcança o alvo**: o clique cai na cortina
(`fixed inset-0 z-50`), que chama `onOpenChange(false)` de novo — um no-op. A pessoa clica e nada
acontece; ela não é levada para outra tela por engano, mas também não é atendida. O foco continua
preso dentro do painel que está saindo, e Esc continua sendo escutado.

O número é ancorado no token: trocar `800ms` por `250ms` em `tokens/component.json` move a medida
junto (provado no segundo caso do mesmo describe). **A decisão da duração é do dono; o custo dela
agora tem um teste que o mede.** A recomendação técnica registrada pelo construtor (200–300 ms para
diálogo e toast) é a mesma que eu daria, e o argumento é o custo, não o gosto: os 800 ms são pagos
em TODO fechamento — inclusive nos acidentais, em que a pessoa fecha por engano e precisa esperar
quase um segundo para poder reabrir. Fechar é o gesto de quem quer voltar a mexer na página; é o
pior lugar do produto para gastar tempo.

---

## Defeitos encontrados

### D-1 · A rolagem da página volta com um overlay ainda aberto — ALTA
**Onde:** `packages/design-system/src/components/Dialog/useDialogBehavior.ts`
**Vetor:** overlay A fecha; 100 ms depois, dentro da saída de A, o overlay B abre; 800 ms depois A
desmonta.
**O que acontecia:** cada diálogo salvava e restaurava `document.body.style.overflow` por conta
própria. Enquanto o fechamento era seco isso nunca aparecia — o nó saía no mesmo tick e nunca havia
dois diálogos vivos. Com a saída animada, o desmonte de A (800 ms depois) devolvia `overflow: ''`
**com B ainda aberto na tela**: a página voltava a rolar POR TRÁS de um modal.
**Evidência:** teste vermelho em `bf93ed51`, verde depois do fix — `expected '' to be 'hidden'`.
**Fix:** contador compartilhado de travas. O primeiro que entra guarda o valor original e trava; o
ÚLTIMO que sai destrava.

### D-2 · O overlay em saída arranca o foco de dentro do overlay aberto — ALTA
**Onde:** mesmo arquivo, mesmo `cleanup`.
**Vetor:** o mesmo de D-1.
**O que acontecia:** ao desmontar, A chamava `back.focus()` e jogava o foco de volta no abridor
DELE — arrancando o foco de dentro de B, que estava aberto e é `aria-modal`. A pessoa ficava
tabulando a página com um painel modal na frente.
**Evidência:** teste vermelho em `bf93ed51`, verde depois do fix.
**Fix:** pilha de diálogos — devolve o foco quem estava no **topo**, não quem foi o último.

> ⚠️ **O primeiro conserto que escrevi para D-2 estava errado, e o meu próprio teste o pegou.**
> A regra intuitiva ("só o último diálogo devolve o foco") conserta a coexistência e **quebra o
> caso empilhado**: uma confirmação aberta POR CIMA de um diálogo nunca é a última a fechar, então
> o foco ficaria largado no `<body>` em vez de voltar ao botão que a abriu. Provado: com a regra do
> "último", o caso empilhado falha com `expected <body> to be <button>`. A regra da PILHA separa as
> duas situações pela ordem de abertura e passa nas duas. O caso empilhado virou teste permanente
> (`⛔ o caso EMPILHADO não pode ser vítima do conserto da coexistência`) justamente para que o
> próximo que mexer aqui não repita o atalho.

### D-3 · Retorno de foco para um nó já removido do documento — MÉDIA (endurecimento)
**Onde:** mesmo `cleanup`, expressão `returnFocusRef?.current ?? openerRef.current`.
**O que acontecia:** `focus()` num nó desconectado **não falha e não faz nada** — o foco cai
silenciosamente no `<body>` e quem navega por teclado recomeça do topo do documento (WCAG 2.4.3).
O `??` aceitava um alvo morto sem nunca tentar o abridor vivo. A espera de 800 ms tornou isso
alcançável: entre o `open=false` e o desmonte cabe uma re-renderização inteira do consumidor.
**Fix:** `primeiroConectado(...)` — pula candidatos fora do documento.
**Residual honesto:** quando os DOIS candidatos morrem (ver R-1) não há alvo dentro do DS. Isso é
decisão do consumidor, não do primitivo.

Fix-commit único, com os quatro testes de ciclo de vida (3 que pegam D-1/D-2/D-3 + 1 que protege o
caso empilhado do conserto).

---

## Tabela vetor → resultado

| # | Vetor de ataque | Resultado |
|---|---|---|
| 1 | Abrir/fechar rápido em sequência (5 toggles em 50 ms) | **OK** — 1 nó, 1 cortina, 0 timers órfãos |
| 2 | `open` alternando várias vezes dentro do mesmo tick | **OK** — ajuste em render-phase cancela a saída corretamente |
| 3 | Desmontar o pai no meio da saída | **OK** — `clearTimeout` no cleanup; 0 timers vivos, 0 warning de setState pós-unmount |
| 4 | Abrir um 2º overlay enquanto o 1º sai (rolagem) | **D-1** — trava da rolagem perdida |
| 5 | Abrir um 2º overlay enquanto o 1º sai (foco) | **D-2** — foco arrancado de dentro do aberto |
| 6 | Retorno de foco com o gatilho fora do documento | **D-3** — foco largado no `<body>` |
| 7 | Dois nós coexistindo / vazamento de nó | **OK** — nunca mais de 1 por primitivo |
| 7b | Diálogo EMPILHADO (confirmação por cima) fechando | **OK depois do fix** — foco volta ao botão de dentro do diálogo de baixo; o primeiro conserto que escrevi quebrava isto |
| 8 | Inércia da página no fechar (medida) | **800 ms exatos** — ver seção acima |
| 9 | `prefers-reduced-motion` nos 5 primitivos | **OK** — desmonte no mesmo tick nos 5 (só 2 tinham prova; agora 5) |
| 10 | `prefers-reduced-motion` deixa espera sobrando? | **OK** — 0 ms; a rolagem volta no mesmo tick |
| 11 | Toda classe de animação gated por `motion-safe:` | **OK** — 5/5 (só Dialog e Modal tinham prova; agora Drawer, Toast e Menu também) |
| 12 | Esc, clique fora, X, trava de rolagem | **OK** — sem regressão (suíte inteira do DS verde) |
| 13 | Esc/clique na cortina DURANTE a saída | **Aceito** — dispara `onOpenChange(false)` de novo; no-op para consumidor bem-comportado (ver R-3) |
| 14 | Portal + presença nova se compõem | **OK** — `presente` governa só o render; o portal não muda |
| 15 | `z-index` acima do header e da barra fixa | **OK** — overlay `z-50` em portal no fim do `body`; header e barra de inscrição são `z-40` |
| 16 | Fronteira do "Entrar" (6 pontos, um a um) | **OK** — nenhum acesso de cliente fora do overlay; nenhum ponto de organizador puxado para dentro |
| 17 | Renome do rodapé fiel ao destino | **OK** — "Entrar como organizador" → `painelUrl('/entrar')`, que é o login do painel |
| 18 | Logo: contraste, `alt`/`aria`, 320 px | **OK** — decorativa e correta; não duplica o nome acessível |
| 19 | `bf507396` silenciou regra de lint? | **NÃO** — mudança de tipo, zero regra desabilitada, `eslint.config.mjs` intocado |

---

## Hipóteses que eu levantei e a evidência falsificou

Registrado porque um "achado" errado custa tanto quanto um defeito perdido.

- **"O `returnFocusRef` fica pendurado num nó morto quando o gatilho é desmontado."** Falso: o React
  zera `ref.current` no desmonte, então o `??` cai no abridor. O buraco real de D-3 é mais estreito
  (ref que aponta para um nó arrancado sem passar pelo React) — e foi ele que virou teste.
- **"O token não resolve na landing porque ela usa outro tema."** Falso: a landing fixa
  `data-theme="brasa"` e importa `themes/brasa.css`, que define `--motion-overlay-duration: 800ms`.
  O `content` do Tailwind da landing inclui `packages/design-system/src/**`, então as classes
  `motion-safe:data-[state=closed]:*` entram no bundle.
- **"O `<img>` da logo duplica o nome acessível."** Falso: o SVG traz `role="img" aria-label="LEELA"`
  internamente, mas referenciado por `<img src>` a árvore interna dele não é exposta. `alt=""` +
  `aria-hidden` bastam. Aspecto do viewBox é 3.52:1 → `h-8` dá ~113 px de largura: cabe em 320 px.

---

## Ressalvas (não são defeito; são decisão ou dívida)

- **R-1 · Depois do login bem-sucedido o foco termina no `<body>`.** `ContaHeader` troca de ramo
  quando a sessão vira nomeada: o botão "Entrar" (o `returnFocusRef`) e o próprio `EntrarOverlay`
  somem juntos. Os dois candidatos de retorno morrem, e não há alvo. Quem usa teclado ou leitor de
  tela recomeça do topo, sem nenhum anúncio de que entrou. **É anterior a esta lane** (S1221) e o fix
  é de produto, não de primitivo: dar foco ao rótulo da conta e anunciar a entrada em `aria-live`.
  Recomendo abrir na SPEC-CONTAS-LANDING.
- **R-2 · O fechamento mais importante do modal não anima.** No login bem-sucedido o `EntrarOverlay`
  é desmontado pela troca de sessão antes dos 800 ms — o modal some por CORTE, que é exatamente o
  defeito que o dono viu. Entra na lista de conferência visual.
- **R-3 · Durante a saída o diálogo continuar sendo `role="dialog" aria-modal="true"`** por 800 ms.
  Com dois overlays na janela de coexistência, o leitor de tela vê dois modais. Não dá para pôr
  `aria-hidden` no que sai (o foco está dentro dele, por decisão declarada da lane). Custo do número
  do dono; encolhe junto com a duração.
- **R-4 · `DropdownMenu` em saída (120 ms) segue com `role="menu"` e `menuitem` focáveis**, enquanto
  o gatilho já diz `aria-expanded="false"`. `pointer-events-none` cobre o mouse, não o teclado.
  Janela de 120 ms — baixo. Não mexi: `aria-hidden` no nó em saída quebraria o teste da lane que
  consulta o menu por papel durante a saída.
- **R-5 · O gate de lint da landing não cobre `test/`.** O script é `eslint app lib --max-warnings 0`.
  O erro que `bf507396` conserta vive em `test/ingresso-pdf.test.tsx` — `turbo run lint` nunca o
  teria pegado, e a mesma classe de erro volta calada. Rodei `eslint app lib test --max-warnings 0`:
  **verde**. Sugiro incluir `test` no script.
- **R-6 · A varredura de pontos de entrada tem um sétimo caso não registrado.**
  `apps/landing/app/(public)/convite/ConviteForm.tsx:88` diz "Você já pode entrar com seu e-mail e
  senha" e oferece como única ação um link para a home — a mesma parede que a lane derrubou em
  `/definir-senha`. É superfície de assessoria (profissional), então **não viola a fronteira**, mas o
  teste `entrar-pontos-de-entrada` é a "lista viva" e não o registra de nenhum dos dois lados.
- **R-7 · `packages/design-system/dist/` é gitignorado.** O `Directive` do construtor está certo e
  vale repetir: sem `pnpm --filter @leela/design-system build` antes do deploy, o bundle sai sem a
  saída animada E sem este fix.
- **R-8 · O painel consome o DS por `dist/`, a landing por `src/`.** `apps/landing/vitest.config.ts`
  tem alias explícito para `packages/design-system/src`; `apps/painel/vitest.config.ts` NÃO tem, então
  resolve pelo `exports` do `package.json` → `dist/`. Consequência prática: **a suíte do painel não
  enxerga o fix de D-1/D-2 até alguém rodar o build do DS.** Eu não rodei o `tsup` (`clean: true`)
  porque a REV-LOTES esteve com trabalho vivo em `apps/painel` e em
  `packages/design-system/src/components/SubNav/**` durante toda esta review — apagar o `dist/` no
  meio da suíte deles destruiria uma lane verde. **Quem fechar a rodada precisa rodar o build do DS e
  reexecutar a suíte do painel** (`Modal` e `Drawer` são os consumidores do hook alterado).
- **R-9 · `onOpenChange` recriado a cada render re-roda o efeito inteiro do diálogo.** As deps do
  `useDialogBehavior` incluem `onClose`, que deriva de `onOpenChange`. Um consumidor que passe uma
  arrow inline faz o efeito rodar cleanup + setup em TODA re-renderização: o foco pula para o
  abridor e volta para o painel, e a trava de rolagem é refeita. Descobri isso porque meu próprio
  teste usava `vi.fn()` inline e o foco não parava onde devia. **Os consumidores reais estão
  corretos** (`ContaHeader` passa `setAberto`, que é estável), mas nada no DS impede o contrário —
  candidato a um `useEvent`/ref para o `onClose` numa próxima lane.

### Coordenação de lane (o que eu NÃO toquei)

`apps/painel`, `functions/**`, `firestore.rules` e `leela-specs/` ficaram intactos. Nada de
`git commit --amend`, nada de `git stash`, nenhum `git push`: os commits de terceiros continuam
locais. O fix-commit saiu por `git commit --only` com quatro caminhos nomeados — o
`leela-pixreal-diag-20260804-REV-5B.md` que já estava no índice de outra lane ficou de fora.
A REV-LOTES commitou `c2b19244` em `SubNav.tsx` no meio desta review; conferi que não encosta em
`useDialogBehavior.ts`, então não houve sobrescrita.

---

## Gates

| Gate | Base declarada | Resultado |
|---|---|---|
| `tsc --noEmit` (DS) | zero | **zero** |
| `tsc --noEmit` (landing) | zero | **zero** |
| `eslint src --max-warnings 0` (DS) | zero | **zero** |
| `eslint app lib --max-warnings 0` (landing) | zero | **zero** |
| `eslint app lib test --max-warnings 0` (landing) | — | **zero** (fora do script; ver R-5) |
| Suíte DS | 60 arquivos / 1133 testes | **62 / 1154, todos verdes** |
| Suíte landing — passe 1 | 58 / 715 | **58 / 715, todos verdes** (491,7 s) |
| Suíte landing — passe 2 | 58 / 715 | **58 / 715, todos verdes** (402,1 s) |

**A base do DS mudou no meio da review e a diferença tem dono.** Medi 60/1133 na árvore limpa às
09:44. O fechamento dá 62/1154: **+2 arquivos e +15 testes meus** (4 de coexistência + 11 de
reduced-motion, gate `motion-safe`, a medida da inércia e o relógio da saída) e **+5 testes da
REV-LOTES**, que commitou `c2b19244` em `SubNav.tsx` enquanto eu revisava. 60+2 = 62 e
1133+15+5 = 1153 — o 1154º é o quarto caso de coexistência, escrito depois da primeira contagem.
Nenhum teste da lane sob review foi removido ou alterado.

`--no-file-parallelism` usado e declarado nos dois passes: em paralelo o timeout pula o `cleanup()`,
o DOM vaza e falha real vira falha fantasma. Vi isso na prática — um primeiro passe rodado com o
resto dos gates disputando CPU devolveu **11 falhas de timeout em `checkout-asaas-teto` e
`checkout-s1225-rev-estados-terminais`**, todas fantasmas: descartei o passe e refiz com a máquina
ociosa, verde nas duas execuções. **Contenção de CPU falsifica esta suíte; quem rodar sozinho tem
sinal, quem rodar junto não tem.** Não rodei `tsup` em paralelo com suíte (`clean: true`).

---

## Lista de conferência visual do dono

Coisas que jsdom não fecha — precisam de olho humano no navegador. Nenhuma delas é bloqueio de
deploy; são a calibragem do movimento.

1. **A duração.** Abrir e fechar o "Entrar" no header. 800 ms no fechar são visíveis: a cortina
   permanece quase um segundo depois do clique. Comparar com 250 ms (uma linha em
   `tokens/component.json`) antes de fixar o número.
2. **O toast.** Ele já vive 4 s na tela; com 800 ms de saída o canto fica ocupado ~4,8 s por aviso.
   Disparar dois avisos seguidos e julgar.
3. **O menu (120 ms).** Abrir o menu de ações no painel e clicar rápido num item — o alvo não pode
   estar se movendo quando o dedo chega.
4. **O bottom-sheet no celular.** Abrir o "Entrar" do cabeçalho numa tela de 320 px: a folha sobe da
   borda de baixo com a marca dentro, e o corpo do formulário continua rolando. (O wordmark tem
   proporção 3,52:1, então em `h-8` ocupa ~113 px de largura — não é ele que aperta a caixa.)
5. **O fechamento pós-login.** Entrar de verdade pelo modal: hoje ele some por CORTE, não animado
   (R-2). Julgar se incomoda.
6. **Movimento reduzido.** Com "reduzir movimento" ligado no sistema, tudo aparece e some seco —
   confirmar que nada fica preso na tela.
7. **A porta do rodapé.** "Entrar como organizador" — conferir se o rótulo mais longo não quebra a
   linha no celular.

---

## É seguro deployar?

**Sim, com uma condição.** Os quatro commits mais o fix-commit estão verdes nos gates e não
introduzem risco de dado, de sessão ou de pagamento. A condição é operacional e não é opinião:

> **`packages/design-system/dist/` é gitignorado.** Quem deploya PRECISA rodar o build do DS antes.
> Sem isso o bundle sai sem a saída animada e sem o fix de D-1/D-2 — e o sintoma (página rolando
> atrás de um modal) só aparece em produção.

Se o dono quiser mudar a duração, **mude antes do deploy**: é uma linha em `tokens/component.json`
seguida de `pnpm generate-tokens`, e o teste da inércia acompanha o novo número sozinho.
