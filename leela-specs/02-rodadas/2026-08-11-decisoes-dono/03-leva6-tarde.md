# Decisões do dono — 11/08 tarde (leva 6, pós-relatório das janelas)

> Registradas no mesmo ato. Palavras do dono citadas em cada item.

## CKPIX-1 · DECIDIDO — a tela reage sozinha ao resultado do pagamento

Na íntegra: "a tela precisa receber o webhook de volta do gateway de pagamento. Após
reeber confirmação, direcionamos para a área interna com o cliente logado, para visualizar
as proprias compras na área do cliente. Outra alternativa é: se o pix nao foi pago, ser
redirecionado avisando que o pix foi canelado após o prazo evncer, e levar tambem para a
area do cliente. cartao recusado, da mensagem de erro e fala para revisar os dados de
cartao, e volta para o checkout. cartao aceito, mostra mensagem de sucesso e depois já
loader redirecinando para aread o cliente também."

→ A RN-470 (tela passiva, v1 de custo) está REVOGADA pelo dono. O fluxo pós-pagamento
decidido, nos 4 ramos:

1. **PIX confirmado** → a tela detecta sozinha (o webhook chega ao servidor; a tela
   OBSERVA o pedido — mecanismo técnico é decisão de engenharia com registro) →
   redireciona para a área do cliente logado (Meus ingressos/compras).
2. **PIX vencido sem pagamento** → redireciona com o aviso "o PIX foi cancelado após o
   prazo vencer" → também para a área do cliente.
3. **Cartão recusado** → mensagem de erro pedindo revisão dos dados do cartão → volta ao
   checkout.
4. **Cartão aceito** → mensagem de sucesso → loader → área do cliente.

Âncora: E12/E04; RNs novas a partir do índice vigente (conferir; ≥560). Vira lane
CKPIX-FLOW.

## CKENDERECO-1 · DECIDIDO — endereço FICA, com a razão agora escrita

Na íntegra: "ck endereço, nao mude nada, mantém pedindo o endereço, pois isso pe
importante para segurança e cadastro dos usários."

→ Nenhuma mudança de tela. A exigência ganha RN com a razão do dono (segurança e cadastro
dos usuários) — o que era passo de arquitetura sem dono vira regra declarada. Reabertura:
só por ordem dele.

## EXCEDENTES · PRINCÍPIO RATIFICADO — "nao podemos ter excedentes de ingressos jamais"

→ Ratifica o coração da spec ESTOURO-RESERVA (RN-543..546: pendente segura vaga via
reserva na criação da cobrança + varredura de PIX vencido) e a PRIORIZA para build — a
spec está pronta desde 10/08 (S322/S323, 11 tarefas) e ainda não virou código. Vira lane
ESTOURO-BUILD. **ESTOURO-2 (teto da reserva do pendente de cartão) segue ABERTO** — a
frase não responde o número; default do maestro 30min continua registrado.

## ADMINVISAO-1 · DECIDIDO — "faturamento gerado" é o da Leela

Na íntegra: "faturamento gerado é para a leela, já que ficamos como que sobra do TPV
menos custos operacionais e repasses dos organizadores."
→ A ficha da produtora chama de "faturamento gerado" a receita da LEELA: TPV menos custos
operacionais menos repasses dos organizadores.

## ADMINVISAO-2 · DECIDIDO — ficha geral completa, com contato E comportamento

Na íntegra: "tem que guardar cpf, e-mail, telefone, cidade, endereço, restrições,
pedidos, tudo. É a ficha geral de clientes, membros, participantes dos clubs, e a visao
geral no individuo, para analisarmos como organizadores."
→ A aba de clientes do admin mostra a ficha COMPLETA por indivíduo: CPF, e-mail,
telefone, cidade, endereço, restrições, pedidos — clientes, membros e participantes de
clubs, visão no indivíduo.

## ADMINVISAO-3 · DECIDIDO — "Responsável é o dono da conta."

## ADMINVISAO-4 · DECIDIDO — "sim, identificação via CPF ou documento estrangeiro."
→ O diretório mostra CPF; estrangeiro identifica por documento estrangeiro.

## ADMINVISAO-5 · DECIDIDO — atividade = qualquer clique de navegação ou ação

Na íntegra: "é qualquer clique em botões, menus, para navegar ou mudar de tela ou ter
ações."
→ O gatilho de "tenta fazer alguma ação" cobre qualquer clique em botão ou menu para
navegar, mudar de tela ou executar ação.

**Os cinco ADMINVISAO fecham juntos → as ondas 2, 3 e 5 do ADMIN-VISAO DESTRAVAM.**

## ADMINSEP-3 · DECIDIDO — não existe conta demo

Na íntegra: "nao é pra ter admin demo ja falei isso antes também."
→ A conta de super-admin de produção NÃO é conta de demonstração e não haverá conta demo
de nenhum tipo (coerente com a purga das contas demo de 10/08). A sugestão do maestro de
conta demo para teste de checkout está RETIRADA; teste ponta a ponta de compra em
produção só pelo caminho do dono.

## SEMKIT-1 e SEMKIT-2 · RESÍDUOS REMOVIDOS

O dono perguntou "as decisoes sem kit acho que ja resolvemos né?" — sim: decididos no
lote 1 de 09/08 (`02-rodadas/2026-08-09-decisoes-dono/01-decisoes-dono.md`), e o SEMKIT-
REPARO fechou sem objeto na purga. Os dois blocos seguiam no painel por falha da limpeza
daquela aterrissagem (mesma classe do resíduo CLUBES-1). Saem agora.

## CANONE-1 · SEGUE ABERTO — reexplicado ao dono em português comum

O dono: "caralho nao entendi PORRA NENHUMA QUE VOCE DISSE." → A reexplicação foi feita no
chat (versão curta: o kit de peças prontas tem 50 peças e NENHUMA é de moldura/layout; 106
lugares montam moldura na mão de 23 jeitos; a pergunta é se o kit ganha as peças oficiais
de moldura — algumas semanas de fundação, bagunça para de nascer — ou se moldura continua
cada tela fazendo a sua). O bloco no painel ganha uma linha-resumo em linguagem simples.

## Ordem operacional

"atualize o kanban, épicos, e me apersente a visao atualizada. limpe as decisoes que já
foram decididas." → lane REGISTRO-BOARDS (painel 25→15, kanban, épicos, RNs novas,
VISAO-DE-PROJETO refresh) + lanes de build CKPIX-FLOW e ESTOURO-BUILD + ondas 2/3/5 do
ADMIN-VISAO na sequência.

## Adendo da noite — SERV-3 e TICKET-1

**SERV-3 · DECIDIDO.** Na íntegra: "serv3 -> é somente quando falar da taxa Leela, que
chamaremos 'serviço' para referenciar o que é essa cobrança."
→ A palavra **"Serviço" nomeia exatamente a cobrança da Leela (a taxa da plataforma)**,
em toda superfície onde ELA aparece — checkout do comprador, painel do organizador e
super-admin. Outras cobranças (gateway, juros etc.) mantêm seus nomes; a desambiguação no
admin é essa: só a taxa Leela vira "Serviço". O renome das 34 strings DESTRAVA — com o
aviso da lane de merge: o inventário de 09/08 mira caminhos que o rename de Parcerias
matou; re-inventariar ANTES de trocar.

**TICKET-1 · RATIFICADO.** Na íntegra: "E o ticket-1. ok."
→ Compra estornada fora do denominador do ticket médio, como implementado (emenda da
D-1008-R19 já protegia contra conserto-de-volta; agora é decisão do dono, não default).
