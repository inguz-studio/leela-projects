---
tags: [leela, fila, rodada, checkout, taxa, parcelamento, aceites, perfil, build]
aliases: ["Fila dos achados 2026-08-02", "lane ACHADOS-0802", "lane PRODUTOR-PAGE"]
trace: leela-build-2d6ee98d
lote: SPEC-ACHADOS-0802
data: 2026-08-02
---

# Fila de código · achados da DEC-0802B

Dezesseis tarefas em duas lanes e cinco frentes. Todas `opus` pela Regra L do projeto (teto Opus,
nada de Sonnet no Leela). Autoridade: `04-spec-achados.md` (D-ACH-1..14), `05-rns-achados.md`
(RN-434..445) e `06-spec-produtor-page.md` (D-ACH-15..21).

## Ordem de entrada das lanes

```
PIXFIX-EXTREF  →  KITCUPOM-BUILD (frente B + X1)  →  ACHADOS-0802  →  PRODUTOR-PAGE
```

Nenhuma lane de escrita entra em paralelo com outra na mesma árvore. As duas primeiras já estão em
voo e detêm exatamente os arquivos que esta fila precisa abrir — a tabela de colisão abaixo diz
quais, um a um.

---

## Lane ACHADOS-0802

### Frente A · O total pronto e discriminado (E12 · `S1216`) — B1 e B2

| # | Task | O que é | Território | Dep | ⚔ |
|---|---|---|---|---|---|
| A1 | `S1216-T1` | Gatilho da cotação passa para a etapa de dados; os dois caminhos manuais de cupom passam a respeitar o número de sequência | `apps/landing/app/(public)/[eventSlug]/inscricao/checkout/CheckoutFlow.tsx` | — | ⚔ |
| A2 | `S1216-T2` | `jurosParcelamento` entra no contrato da cotação e nos valores da cobrança, calculado no servidor | `functions/src/checkout/cotarInscricaoCheckout.ts`, `functions/src/checkout/createInscricaoCharge.ts`, `packages/api-client/src/checkout.ts` | B1t | ⚔ |
| A3 | `S1216-T3` | Bloco de totais: taxa nomeada pelo meio, "inclusa no valor" no modo incorporada, linha própria de juros — no resumo e na confirmação | `.../checkout/StepResumo.tsx`, `.../checkout/StepConfirmacao.tsx` | A2 | ⚔ |
| A4 | `S1216-T4` | Total por opção sempre que os dois existirem; nota da etapa 0 ganha o ramo do modo incorporada | `.../checkout/StepResumo.tsx`, `.../checkout/StepModalidadeKit.tsx` | A3 | — |

### Frente B · O motor de juros (E04 · `S314`) — B5

| # | Task | O que é | Território | Dep | ⚔ |
|---|---|---|---|---|---|
| B1t | `S314-T1` | Tabela Price real em `buildInstallmentOptions`; `n = 1` sem juros; arredondamento na parcela e total = parcela × n | `packages/core/src/finance/calc.ts` + suíte do core | — | ⚔ |
| B2t | `S314-T2` | 2,89% a.m. no termo semeado e no default; correção dos comentários que documentam 3,49% | `functions/src/seed/commercialTerms.seed.ts`, `packages/core/src/platform/commercialTerms.ts`, `packages/core/src/pedidos/pagamento.ts`, `functions/src/seed/pedidos.seed.ts` | B1t | ⚔ |

### Frente C · Os aceites na inscrição (E12 · `S1217`) — B6

| # | Task | O que é | Território | Dep | ⚔ |
|---|---|---|---|---|---|
| C1 | `S1217-T1` | O bloco de aceites muda de etapa, gateia o "Continuar" da etapa de dados e continua travado quando a cobrança existe, inclusive no retorno | `.../checkout/CheckoutFlow.tsx`, `.../checkout/StepDados.tsx`, `.../checkout/StepPagamento.tsx` | A1 | ⚔ |
| C2 | `S1217-T2` | Nenhuma forma vem pré-selecionada; a cobrança PIX nasce na escolha do PIX | `.../checkout/CheckoutFlow.tsx`, `.../checkout/StepResumo.tsx`, `.../checkout/SeletorForma.tsx`, `.../checkout/tipos.ts` | C1 | ⚔ |
| C3 | `S1217-T3` | Terceiro aceite condicional (termo de saúde do organizador) ponta a ponta, e o payload deixa de afirmar `true` literal | `.../checkout/AceitesCompra.tsx`, `.../checkout/CheckoutFlow.tsx`, `apps/landing/lib/leitor.ts`, `apps/landing/lib/tipos.ts` | C1 | ⚔ |
| C4 | `S1217-T4` | A tela envia a versão exibida; o servidor confere contra a vigente e recusa em vez de carimbar outra | `packages/core/src/pedidos/aceites.ts`, `functions/src/checkout/createInscricaoCharge.ts`, `packages/api-client/src/checkout.ts`, `.../checkout/CheckoutFlow.tsx` | C1, A2 | ⚔ |
| C5 | `S1217-T5` | Origem da requisição na prova de aceite: endereço em hash e agente do navegador, lidos pelo servidor | `packages/core/src/pedidos/aceites.ts`, `functions/src/checkout/createInscricaoCharge.ts` | C4 | ⚔ |

### Frente D · Polimento da escolha (E12 · `S1218`) — B3, B4, B8 e B9

| # | Task | O que é | Território | Dep | ⚔ |
|---|---|---|---|---|---|
| D1 | `S1218-T1` | **B3** · o rótulo do grupo deixa de ficar grudado no primeiro cartão. Medir ANTES onde o espaço nasce: se for do `RadioGroup` do design system, é token e vale para o produto inteiro, então volta como decisão em vez de conserto local | `.../checkout/StepModalidadeKit.tsx` e, se o diagnóstico apontar, `packages/design-system/src/components/Radio/` | — | — |
| D2 | `S1218-T2` | **B4** · verificar o estado atual e garantir por teste de interação que o clique em qualquer ponto do cartão de modalidade e de kit seleciona, não só o círculo | `packages/design-system/src/components/Radio/` + suíte, `apps/landing/test/` | — | — |
| D3 | `S1218-T3` | **B8** · "Escolha seu percurso" vira "Modalidades disponíveis" na seção da página do evento, e o apoio da etapa 0 do checkout acompanha o vocabulário. A home e o texto do layout **não** são tocados (D-0802-1: o dono edita a landing depois) | `apps/landing/app/(public)/[eventSlug]/sections/ModalidadesSection.tsx`, `.../checkout/StepModalidadeKit.tsx` | — | — |
| D4 | `S1218-T4` | **B9** · fotos reais de kit no acervo local versionado (camiseta, kit fitness, ioga), consumidas pela cascata de preview. Sem link para fora | `apps/landing/public/mock/`, `apps/landing/lib/kitImagem.ts` | — | — |

---

## Lane PRODUTOR-PAGE (E17 · `S1707`) — B10

| # | Task | O que é | Território | Dep | ⚔ |
|---|---|---|---|---|---|
| E1 | `S1707-T1` | Índice composto de eventos por tenant e status — pré-requisito declarado, hoje faltando em produção | `firestore.indexes.json` | — | — |
| E2 | `S1707-T2` | Ícones de rede inferidos pelo endereço, com os três SVGs que o `lucide` não tem; rótulo vira nome acessível | `apps/landing/app/(public)/_perfil/` (mapa + ícones, arquivos novos), `.../_perfil/PerfilView.tsx` | — | — |
| E3 | `S1707-T3` | Menu secundário Feed · Eventos · Clubs com o `Tabs` do design system atrás de fronteira de cliente; as três seções continuam vindas do servidor; card de clube sem afordância de clique | `apps/landing/app/_ds/ds.ts`, `.../_perfil/` (componente de abas, arquivo novo), `.../_perfil/PerfilView.tsx` | E2 | — |
| E4 | `S1707-T4` | Feed mockado e rotulado em preview; estado vazio digno em produção | `.../_perfil/`, `apps/landing/lib/mockImagem.ts` | E3 | — |

---

## Disputa de território com as lanes vivas

A KITCUPOM-BUILD fechou a frente A (galeria do kit) e ainda deve as tarefas B1 a B4 e a X1. A
PIXFIX-EXTREF está em `functions/`. Onde os territórios se cruzam:

| Arquivo | Quem toca antes | Qual task desta fila colide | O que fazer |
|---|---|---|---|
| `.../checkout/StepResumo.tsx` | KITCUPOM `S1215-T2` — marca "(desconto aplicado)" na linha de desconto | A3, A4, C2 | Reler o arquivo depois da aterrissagem. A linha de desconto é da KITCUPOM; as linhas de taxa, juros e total são desta fila. Se a A3 precisar mexer na linha de desconto, a spec errou |
| `.../[eventSlug]/sections/` | KITCUPOM `S1215-T3` (faixa pós-Hero) e **X1** (vocabulário da página do evento) | D3 | A X1 pode já ter trocado a copy do B8. Nesse caso a D3 **vira verificação**, não edição, e o relatório registra que a task foi paga por outra lane |
| `apps/landing/lib/leitor.ts` | KITCUPOM `S1215-T3` | C3 | Territórios distintos dentro do arquivo (verificação de cupom × termo de saúde do evento). Reler antes de escrever |
| `functions/src/checkout/createInscricaoCharge.ts` | **PIXFIX-EXTREF** | A2, C4, C5 | A PIXFIX mexe na montagem da referência externa e na tradução do erro do gateway. Esta fila mexe em valores e no bloco de aceites. Não entrar antes de a PIXFIX aterrissar |
| `apps/landing/lib/kitImagem.ts` | KITCUPOM `S212-T4` (já pago, `fd1c6f2`) | D4 | A cascata acabou de ganhar o quarto degrau. A D4 acrescenta acervo, não reescreve a cascata |
| `packages/core/src/finance/calc.ts` | ninguém | B1t | Livre |

Regra que vale para as três tabelas: `git commit --only` por caminho, nunca `git add` amplo.

## Paralelismo interno

A frente B abre sozinha, porque a A2 depende do número que ela produz. Depois disso, A e C
disputam o mesmo `CheckoutFlow.tsx` e **precisam ser sequenciadas**: A1 → C1 → C2, com A2 podendo
correr em paralelo (é de servidor) e A3/A4 depois da A2. A frente D é independente das outras três
e pode correr a qualquer momento depois da KITCUPOM, exceto a D3, que espera o veredito da X1.

Serialização obrigatória: a B1t e a A2 tocam `packages/core` e `packages/api-client` — rodar o
build do core antes de qualquer suíte de landing ou de painel, pela lição registrada na NAV-FIX.

## Review antagonista em contexto fresco

Obrigatória nas tarefas **A1, A2, A3, B1t, B2t, C1, C2, C4 e C5**. Todas tocam o preço exibido ou
a prova legal da compra. As frentes D e a lane PRODUTOR-PAGE seguem o gate normal.

### Vetores do preço (A1, A2, A3, B1t, B2t)

1. ⚔ **A conta bate com Price, não com o modelo antigo.** Provar, com valores fechados, que
   R$ 300,00 a 2,89% a.m. em 12x dá **R$ 359,90** e não R$ 422,03. Falsificar restaurando a
   fórmula antiga e ver a asserção morder.
2. ⚔ **A parcela única do cartão não tem juros.** `1x` do cartão e o PIX à vista têm o mesmo valor
   quando a taxa por meio é a mesma. Provar com teste, e provar que `totalAVista` é igual ao
   `valorTotal` da primeira opção de parcelamento.
3. ⚔ **A soma fecha.** Para todo `n` da lista, `valorParcela × n === valorTotal`, exato em
   centavos. É a propriedade que faz a divisão do gateway coincidir com o número que a tela
   mostrou.
4. ⚔ **A interface não soma um centavo.** Provar que `jurosParcelamento` vem do servidor e que
   nenhuma subtração ou soma de dinheiro acontece no cliente. O caminho barato de derivar o juro
   por `totalCobrado − totalAVista` é o que esta regra proíbe.
5. ⚔ **O organizador não vê o juro.** Compra à vista e compra em 12x do mesmo carrinho produzem o
   **mesmo** líquido do produtor, o mesmo valor de face no razão e a mesma comissão de afiliado.
   Falsificar somando o juro à base e ver as três asserções morderem.
6. ⚔ **Percentual não vaza.** Nenhuma resposta pública carrega percentual de taxa, taxa fixa,
   percentual de juros nem termo comercial. Só valores em reais.
7. ⚔ **O modo incorporada não inventa número.** Com `taxaModo: 'incorporada'`, a resposta continua
   devolvendo taxa zero ao comprador e a tela diz "inclusa" sem valor. Nenhum caminho exibe
   "R$ 0,00" nem o valor real da taxa.
8. ⚔ **A cotação antecipada não muda o número, só a hora.** Mesmo carrinho, mesmo cupom, mesma
   forma: o total com o gatilho novo é idêntico ao total com o gatilho antigo, byte a byte.
9. ⚔ **Resposta obsoleta não aterrissa, inclusive pelo cupom.** Aplicar cupom e trocar de kit antes
   da resposta: o preço da seleção abandonada nunca chega à tela. Falsificar removendo o número de
   sequência do caminho do cupom e ver a asserção morder.
10. ⚔ **O item 64 continua de pé.** Com cotação em voo, os botões de pagar continuam desabilitados
    e o código PIX continua sem nascer. O B1 encurta a espera e não substitui a guarda.
11. ⚔ **Pedido antigo não é reprecificado.** Mudar a taxa de juros no termo não altera nenhum
    pedido já criado, pela mesma disciplina de congelamento da taxa.

### Vetores da prova de aceite (C1, C2, C4, C5)

12. ⚔ **Não existe compra sem os dois aceites.** Provar que o servidor continua recusando antes de
    qualquer escrita, e que o documento não existe depois da rejeição. Falsificar removendo o gate
    da tela e ver o servidor barrar mesmo assim.
13. ⚔ **O cliente não forja nada.** Versão, instante e hash continuam vindo só do servidor. Campo
    extra no payload é ignorado por construção. A versão exibida que a C4 acrescenta é dado de
    **conferência**: provar que ela nunca é gravada.
14. ⚔ **Nenhuma cobrança nasce na chegada.** Entrar na etapa de pagamento com os aceites já dados
    **não** cria pedido, não cria inscrito pendente e não chama o gateway. Falsificar
    pré-selecionando o PIX e ver a asserção morder.
15. ⚔ **Voltar não destrava a prova.** Com a cobrança criada, voltar à etapa de inscrição mostra os
    aceites travados. Nenhum caminho de teclado, formulário ou navegação os desmarca.
16. ⚔ **Divergência de versão recusa, e recusa por igual.** Publicar versão nova entre o aceite e a
    compra faz a compra ser recusada com motivo próprio, e a tela repõe o aceite. Provar que a
    recusa não vaza o conteúdo da versão nova nem o instante da publicação.
17. ⚔ **O termo do organizador fecha o defeito.** Evento com termo de saúde próprio ativo passa a
    ter compra possível. Provar que hoje ela falha e que depois da C3 ela conclui, com o terceiro
    carimbo no pedido.
18. ⚔ **A origem é do servidor e não é reversível.** O endereço nunca é gravado em claro e o
    cliente não influencia nem o endereço nem o agente. Provar que cabeçalho forjado no cliente não
    muda o que foi carimbado.
19. ⚔ **Nada de PII em log nem em URL.** Os campos novos não aparecem em log, em parâmetro de
    consulta nem em armazenamento local.

## Gates por task

- **Toda task:** `tsc --noEmit` em zero, `eslint` com zero avisos no pacote tocado, suíte do pacote
  verde, e a suíte da landing rodada em processo único (a convenção que a CKUX-REV deixou).
- **Task de interface:** o guia visual do projeto entra no aceite. Tela nova ou tela alterada passa
  pela verificação de marca antes de fechar; gate de código não prova marca.
- **Task de dinheiro (⚔):** teste que **reprova a versão anterior** e passa na nova, mais a
  falsificação declarada em cada vetor. Vetor sem falsificação não conta como provado.
- **D2 especificamente:** o aceite é teste de interação (clique em ponto do cartão fora do
  círculo), não inspeção visual.
- **Nada é fechado com suíte não executada.** Esta rodada é spec: cada critério acima é promessa a
  provar no build.

## Envelope de custo

**Cotação antecipada.** Uma chamada a mais por sessão que abandona no preenchimento. É callable de
leitura, sem escrita, sem coleção nova e sem índice novo. O ganho é o oposto do custo: o despertar
frio da function passa a acontecer enquanto a pessoa digita, o que é a resposta barata ao item 62
do painel — a cara é `minInstances`, e ela só volta à mesa depois desta medida.

**Juros e taxas.** Zero infra. Um campo a mais na resposta de duas callables que já existem, um
número no termo semeado e aritmética pura no core.

**Aceites.** Dois campos a mais no bloco de aceites do pedido, gravados na mesma transação que já
escreve. Nenhuma leitura nova: a política de vendas já é lida ali dentro. O termo custom acrescenta
uma leitura por compra **só nos eventos que o tenham ativo**.

**Página do produtor.** Um índice composto novo, que já deveria existir. Nenhuma leitura nova: as
três abas consomem os dados que a página já carrega numa chamada só. Os ícones e o feed mockado
são estáticos.

**Orçamento das lanes.** Só spec até aqui. Zero custo de execução até o build começar.

## Épicos futuros nomeados, não especificados

- **Configuração real da tabela de juros por organizador.** O campo existe no editor da plataforma;
  o que falta é a negociação por organizador, com congelamento no ato da compra pela mesma
  disciplina da taxa. Nasce em E04/E16 quando o dono decidir o modelo comercial.
- **Publicação de feed no perfil.** Já especificada no E17 (coleção de posts, RN-163, e a colisão
  declarada com o feed do clube do E13). Esta rodada consome só o estado vazio e o mock.
- **Página pública de clube.** Enquanto não existir, o card do perfil não vira link (D-ACH-20).
- **Aceite de regulamento por inscrito** (RN-148/S1207), que continua não construído e que, quando
  nascer, mora na mesma etapa que a RN-438 escolheu.
