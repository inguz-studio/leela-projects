# Decisões do dono — 11/08 manhã (pós-noite do redesign)

> Registradas no mesmo ato, via chat. Na íntegra: "### PCLIENTE-1  ja existe. serv1-
> foda-se, segue o que eu falei, venda minima é de 10 reais. Deopis volto a decidir tudo,
> quero que voce continue fazendo o maximo que puder de coisas pelas próximas 8 horas, que
> nao dependam das minash decisões e cumpra o roadmap"

## PCLIENTE-1 · FECHADO — "já existe"

O painel do cliente É o `/minha-conta` de hoje ganhando casca de painel, no mesmo endereço
e na mesma landing (o default proposto, agora confirmado pelo dono). Consequências:

- A simulação das 18 telas no Claude Design parte do `/minha-conta` vigente
  (`02-rodadas/2026-08-06-painel-cliente/04-inventario-de-telas.md`).
- As ondas B/C da fila do painel-cliente (`05-fila-codigo.md`) DESTRAVAM.
- **Condição de reabertura:** se o dono decidir unificar cliente+profissional num painel
  só (a opção recusada), a fronteira de auth precisa ser re-provada — é reforma, não ajuste.

## SERV-1 · FECHADO — piso de R$ 3,00 RATIFICADO

Na íntegra: "foda-se, segue o que eu falei". O piso do Serviço fica em **R$ 3,00**
(RN-491), com o efeito na venda barata aceito de olhos abertos — a conta estava na mesa
(numa venda de R$ 10,00 o Serviço é 30% da face; com a venda mínima abaixo, o pior caso é
exatamente esse). Decisão de dinheiro, do dono, com medição prévia.

- **Condição de reabertura:** parecer dele próprio; a alternativa "piso por modo de taxa"
  fica anotada como a candidata se o 30% doer na prática.

## SERV-2 · FECHADO — venda mínima de R$ 10,00 (a regra nova)

Na íntegra: "venda minima é de 10 reais". É a opção 2 do próprio item ("preço mínimo de
venda acima do piso, que resolve na origem"): com face mínima de R$ 10,00 e piso de
R$ 3,00, o líquido do organizador nunca é negativo (mínimo R$ 7,00) — o caso da venda de
R$ 2,00 deixa de existir na origem, sem clamp escondendo divergência.

- **RN-559** (consome a próxima livre do índice): **venda PAGA tem face mínima de
  R$ 10,00**; a validação vive na origem (criação/edição de lote/preço), recusa nomeada
  na tela e no servidor.
- **Default do maestro (registrado, vetável):** inscrição GRATUITA (R$ 0,00) continua
  permitida — a frase do dono fala de "venda", e gratuidade não é venda; o mínimo vale
  para qualquer face > 0. Se o dono quiser mínimo também no gratuito → 1 linha.
- **Default do maestro 2 (registrado):** lotes JÁ EXISTENTES com face entre R$ 0,01 e
  R$ 9,99 em produção: nenhum existe hoje (purga deixou 1 evento, face 10). A regra nasce
  sem migração; se aparecer legado, a validação barra na PRÓXIMA edição, não retroage.
- **Onde aterrissa:** RN-494 (o clamp "Serviço nunca ultrapassa a face" PERMANECE como
  cinto de segurança de camada — defesa em profundidade, não substituto), RN-559 nova em
  [[LEELA-E04-config-vendas]]; build → lane SERV1-BUILD desta manhã.
- **Condição de reabertura:** mudança do valor mínimo pelo dono.

## Ordem operacional — 2ª janela de 8h

Autonomia renovada: executar o MÁXIMO que não dependa de decisões dele + **cumprir o
roadmap** (ondas do roadmap de componentes + fila destravada). Vetáveis restantes
aguardam ("Depois volto a decidir tudo"). SERV-3 segue ABERTO (as 34 strings do renome
continuam retidas pela decisão, não pelo merge).
