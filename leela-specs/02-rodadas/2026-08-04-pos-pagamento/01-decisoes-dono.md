---
tags: [leela, decisoes, rodada, checkout, pos-pagamento, area-do-cliente, arena-social]
trace: leela-pixreal-diag-20260804
lote: SPEC-POSPAG
data: 2026-08-04
---

# Rodada de decisões do dono — 2026-08-04 (DEC-0804) · pós-pagamento em tela e Arena Social

O dono leu o diagnóstico do primeiro pagamento real (`.nirvana/outputs/leela-pixreal-diag-20260804/DIAG-PIXREAL-REPORT.md`; registro elo a elo em [[fluxo-pos-pagamento]]) e devolveu duas mensagens. A primeira corrige uma leitura minha sobre o E12 e define o feedback pós-compra em tela; a segunda responde a pergunta de esclarecimento sobre a Arena Social. As três decisões abaixo saem delas.

## Verbatim do dono

Mensagem 1:

> "mas precisamos dar o feedback do proprio pedido. acredito que possa ter rolado algum erro de interpretação, quanto ao e12. Mas o usuário pode ver o proprio pedido sim, mas após concluir a compra e também na área do cliente, e precisamos dar uma resposta para ele ou em tela, no caso de pix ou em cartao também. Mas de inicio podemos colocar a mensagem 'Estamos confirmando o seu pedido' e abaixo, um CTA para ele visualizar os proprios pedidos dentro do sistema, e uma orientação para confirmar a caixa de e-mail pois enviaremos o acesso do ingresso por lá. a ára do cliente ja foi especificada. Quero também ter uma área 'Arena Social', onde a pessoa pode informar os dados dela, como mini bio, genero, generos de interesse, interesses (dentro dos pilares de bem-estar), e uma foto. que é a mesma da conta."

Mensagem 2, respondendo à pergunta "gêneros de interesse significa o quê?":

> "sao duas coisas, experiencias e pessoas."

## As decisões, estruturadas

### D-0804-1 · o comprador PODE ler o próprio pedido — após concluir a compra e na área do cliente

O dono confirma que houve erro de interpretação quanto ao E12, e a leitura correta é: **o TODO das rules era sequenciamento, não intenção de produto.** O comentário em `firestore.rules:2528-2530` — *"TODO(E12/checkout): o responsável/atleta lê o PRÓPRIO pedido só na story do checkout, com teste (…) NÃO abrir antes"* — nunca proibiu o comprador de ver o pedido; ele adiava a abertura para a story certa, com teste. A story certa chegou: é a do feedback pós-compra (S1225), e a abertura da leitura entra **nela** (S1225-T1), nunca antes nem separada do teste.

O alcance é o que o dono disse, e só ele: o comprador lê o **próprio** pedido, **após concluir a compra** (a tela de confirmação do checkout) **e na área do cliente**. Terceiros continuam negados, a escrita continua `write: if false`, e nenhuma outra Rule de coleção tenant-scoped abre. Regra canônica: **RN-469** em [[LEELA-E12-landing]].

### D-0804-2 · feedback pós-pagamento em tela, para PIX e para cartão

A resposta ao comprador deixa de depender só do e-mail: **precisa existir em tela**, tanto no PIX quanto no cartão. A v1 que o dono fixou:

1. a mensagem **"Estamos confirmando o seu pedido"**;
2. abaixo, um **CTA para visualizar os próprios pedidos dentro do sistema**;
3. e uma **orientação para conferir a caixa de e-mail**, porque o acesso do ingresso vai por lá.

Consequência que a spec detalha: a copy atual do PIX promete *"a confirmação chega sozinha, em segundos — não é preciso avisar aqui"* (`StepPagamento.tsx:256-260`) sem nenhum canal em tela que cumpra a promessa; ela precisa parar de mentir na mesma entrega. Regra canônica: **RN-470** em [[LEELA-E12-landing]]. Story: **S1225**.

### D-0804-3 · Arena Social

Área nova onde a pessoa informa os dados dela:

| Campo | O que é |
|---|---|
| Mini bio | texto curto de apresentação |
| Gênero | o gênero da própria pessoa |
| Gêneros de interesse | **dois campos distintos**, pela mensagem 2: (a) gêneros de **pessoas** com quem tem interesse em se conectar nas experiências e (b) tipos de **experiência** de interesse |
| Interesses | dentro dos **pilares de bem-estar** |
| Foto | **a mesma da conta** — reaproveitada, não é upload separado |

Vocabulário D-0802-1 vale integralmente: experiência e participante, nunca evento/corrida/atleta na superfície. Regras canônicas: **RN-471** (escopo e campos) e **RN-472** (dado sensível e consentimento) em [[LEELA-E12-landing]]. Story: **S1226**.

Três coisas sobem ao painel como vetáveis, porque a frase do dono não as decide: quem vê o perfil (**ARENA-1**), a lista dos pilares de bem-estar, que não existe em nenhum doc do repo (**ARENA-2**), e onde a Arena Social mora — o default é a área do cliente, mas o E17 (perfil social) é sinal de outra intenção possível e a premissa não vai em silêncio (**ARENA-3**).

## Dependência dura, declarada

**O CTA "ver meus pedidos" só tem destino quando a área do cliente existir.** O destino é o Meus Ingressos/histórico da S1222, atrás do login da S1221 e do primeiro acesso da S1223. Enquanto a área não sobe, o CTA não pode nascer apontando para um 404 — mesma lição da ordem C1→C2 da fila ADMINSEP. A fila S1222/S1223 vira, portanto, **pré-requisito ou entrega conjunta** do CTA: a tela v1 pode subir antes com mensagem + orientação de e-mail, e o CTA entra quando a rota existir. A ordem executável está em `04-fila-codigo.md`.

## O que esta rodada fecha e abre no painel

- **POSPAG-1 · RESPONDIDA.** O item perguntava só a posição da fila S1222/S1223, e a resposta do dono foi além dela: a área do cliente é confirmada como destino do CTA ("a área do cliente já foi especificada"), o feedback em tela entra na frente, e a fila S1222/S1223 sobe para logo atrás dele — na prática, o default proposto ("puxar a frente para a próxima posição") ratificado e ampliado. O item sai do painel pela disciplina de limpeza; este arquivo é o registro completo.
- **BREVO-1 · segue aberta.** A trava de IPs da conta Brevo continua sendo ação do dono no dashboard, e o reenvio dos dois e-mails represados (F2 do diagnóstico) continua esperando por ela.
- **Nascem ARENA-1, ARENA-2 e ARENA-3** — os três vetáveis da Arena Social, no painel com contexto, default e destino.

## O que esta rodada NÃO decide

- Nada de F1 (trava Brevo), F2 (reenvio idempotente), F5 (alerta de falha de e-mail) e F6 (expiração da cobrança QA) do diagnóstico: são técnicas e correm nas lanes delas, em paralelo (registrado na fila).
- Nenhuma linha de código, Rule ou function: esta lane é de specs.
