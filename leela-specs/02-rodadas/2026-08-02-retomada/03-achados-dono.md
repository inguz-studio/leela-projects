# Rodada DEC-0802B — achados do dono no teste da jornada de compra (2026-08-02, noite)

O dono testou a jornada no ar (inclusive com usuário real observado) e devolveu dez achados. Verbatim integral ao final. Dois vetos colhidos na hora por pergunta curta: **aceites = AMBOS na inscrição** (termos de uso E declaração de saúde saem do PAGAR — supersede a decisão de 2026-07-18 "no PAGAR, 2 aceites" e ajusta o desenho do B1 da fase B); **Feed do produtor nasce mockado para o tester** (spec de feed real vira épico depois).

## Achados e destino

| # | Achado | Classe | Destino |
|---|---|---|---|
| B1 | Cálculo do pedido deve estar PRONTO quando o usuário chega na etapa de pagamento (inscrições + taxas pré-calculadas; hoje a cotação dispara tarde) | Regra/UX | Spec curta + lane ACHADOS-0802; conversa com item 62 do painel (function fria) e com o excesso de cotações já mapeado |
| B2 | Taxas de serviço explícitas e discriminadas no resumo, mesmo variando entre PIX e cartão | Regra/UX | Spec curta + lane ACHADOS-0802 |
| B3 | Ritmo vertical: título secundário grudado no select da modalidade (sobreviveu ao C3) | UX | Lane ACHADOS-0802 |
| B4 | Área de clique da modalidade e do kit = componente INTEIRO seleciona (comportamento observado do usuário; é o esperado), não só o radio circular | UX/a11y | Lane ACHADOS-0802 — verificar estado atual e garantir por teste de interação |
| B5 | Parcelas: simular painel admin configurado em **2,89% a.m.**. Premissa vetável: juros repassados ao comprador, tabela composta padrão de mercado; config real do admin vira spec | Regra (dinheiro) | Spec curta + lane ACHADOS-0802, review antagonista (mexe em preço exibido) |
| B6 | **Aceites: termos de uso E declaração de saúde migram do PAGAR para a etapa de INSCRIÇÃO** (veto do dono respondido: ambos). A prova de aceite carimbada na transação (RN-149/S306) continua valendo — a spec decide a fiação (coleta na inscrição, carimbo na compra) | Regra (supersede 2026-07-18) | Spec curta + lane ACHADOS-0802, review antagonista |
| B7 | **BUG produção: erro "internal" na tela ao clicar no código PIX** | Bug (dinheiro) | **INV-PIXINTERNAL despachada AGORA** (read-only, logs de produção + leitura de código; árvore ocupada pela KITCUPOM) |
| B8 | Copy: "Escolha seu percurso" → "Modalidades disponíveis" (coerente com D-0802-1 — "percurso" é vocabulário de corrida; caixa em sentence case pelo padrão da casa, vetável) | Copy | Lane ACHADOS-0802 |
| B9 | Visualização do kit com imagens REAIS (camisetas, kits fitness/yoga) para o usuário tester | Asset/preview | Complementa a cascata A4 da KITCUPOM-BUILD (fotos determinísticas em preview); assets entram na ACHADOS-0802 |
| B10 | Página do produtor vira mini rede social: botões de redes sociais reduzidos a ÍCONES + menu secundário **Feed / Eventos / Clubs**; Feed mockado no preview, estado vazio digno em produção; spec de publicação real = épico futuro | Feature | Spec curta + lane PRODUTOR-PAGE (território distinto do checkout; pode rodar após ACHADOS-0802) |

## Sequenciamento

KITCUPOM-BUILD está em voo no mesmo território (checkout/kit/página do evento) — nenhuma lane de escrita entra em paralelo na mesma árvore. Ordem: KITCUPOM-BUILD aterrissa → KITCUPOM-REV (⚔ B1/B3 da fila) → SPEC-ACHADOS-0802 (B1/B2/B5/B6 + B10) → ACHADOS-0802 (build) → PRODUTOR-PAGE. A INV-PIXINTERNAL roda agora por ser read-only; se o achado dela for defeito servido em produção que bloqueia compra, o fix fura a fila (decisão do maestro na volta da investigação).

## Verbatim do dono (2026-08-02)

> "reparei que voce nao está disparando a função de cálculo, antes, quando o usuário chega na etapa de pagamento, ele já deve ter os custos do pedido totalmente calculados (inscrições + taxas). e voce nao está deixando claro as taxas de serviço também, mesmo que a gente altere no pix e no cartão. voce vai corrigir os espaçamentos também? O ritmo vertical é prejudicado no componente de modalidade e kit, pois o espaço ali do titulo secundário está grudado no componente de select da modalidade. Em um teste com o usuário, reparei também que ele clicava com os dedos, nao na caixinha de seleção circular, mas no componente inteiro, e isso é o esperado, já que ele clica no componente da modalidade e do kit, para selecionar (ficou claro?) O calculo de parcelas ainda não está configurado? se não, pode simular como se o painel admin estivesse configurado em 2,89% a.m. os termos de uso devem aparecer na inscrição e nao na etapa pagamento. Quando cliquei no código pix, recebi o erro 'internal' na tela também. Em 'escolha seu percurso' ajuste a copy para 'Modalidades Disponiveis' e na visualização do kit, seria interessante voce colocar imagens reais, de camisetas ou kits fitness com de yoga, por exemplo, para ilustrar melhor para o usuário tester. já para a página dos produtores, reduza o tamanho dos botoes de rede sociais para os icones de rede social, e coloque um menu secundário para visualização de Feed, Eventos e Clubs, como se fosse uma mini rede social."

Vetos colhidos em seguida: aceites = ambos na inscrição; Feed = mock para o tester.
