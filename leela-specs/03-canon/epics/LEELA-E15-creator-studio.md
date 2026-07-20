# LEELA-E15 · Creator Studio

- **Superfície:** Painel (área nova)
- **Horizonte:** H2/H3 — **Onda 7, o último épico do roadmap**
- **MoSCoW:** Could
- **Estimativa:** XL
- **Status:** 🧊 esqueleto — objetivo, fronteiras e dependências. **Sem quebra em histórias e tarefas até a onda chegar**
- **Depende de:** LEELA-E05 (motor de desafio), LEELA-E04 (venda), `PaymentProvider`, LEELA-E13 (superfície onde o programa é consumido)
- **De-para:** (novo)

> **Por que este épico é o último, e por decisão explícita.** O Vitor, em 2026-07-18: *"adiante o H3 para antes do H2, para finalizarmos por projeto, **exceto o creator-studio, que vai entrar depois**."* Não é falta de valor — é sequência. O Creator Studio é um segundo produto sobre a mesma base, e abrir um segundo produto antes de o primeiro estar fechado é a forma mais cara de errar.

## Objetivo

Transformar a lógica do MyDose — programas guiados por um criador — num espaço onde empresas e profissionais montam os **próprios desafios e programas**, com ebooks e materiais anexos, e vendem. Os produtores de evento são o canal de aquisição: quem já organiza corrida já tem público, e esse público é o mercado do criador.

## O que já foi feito para não fechar a porta

A V1 pagou, de propósito, três antecipações baratas para que este épico não exija reescrita:

- **`autorId` obrigatório no desafio** (lote S105-hig, `97af827`) — o dono do conteúdo deixou de ser implicitamente o clube. Um criador pessoa física ou empresa cabe no modelo sem migração.
- **`anexo?` previsto no tipo** — o lugar onde ebook e material vão morar já existe no domínio, vazio.
- **`PaymentProvider` genérico** — o mesmo motor que vende ingresso vende programa e ebook. Não haverá segundo caminho de dinheiro.

Isso é o inventário de reuso deste épico, e ele é maior do que parece: **o motor de desafio, o de pagamento e o de comunidade já existem.** O Creator Studio é, em boa medida, uma superfície nova sobre máquinas prontas.

## Fronteiras

**Dentro:** criação de desafio ou programa por um autor que não é o clube; biblioteca de materiais (ebook, PDF, vídeo) anexada ao programa; venda do programa; e a distribuição via produtor de evento.

**Fora, e é bom que fique claro agora:**
- Não é um LMS. Não há trilha com pré-requisito, certificado ou avaliação.
- Não é marketplace com curadoria, ranking algorítmico ou descoberta paga.
- Não substitui o clube. O clube continua sendo a unidade de comunidade; o programa é conteúdo que atravessa clubes.
- Não abre um segundo motor de pagamento nem uma segunda contabilidade.

## Dependências

| Depende de | Por quê |
|---|---|
| E05 · motor de desafio | o programa **é** um desafio com autor e conteúdo; reusar, não reimplementar |
| E04 + `PaymentProvider` | venda do programa passa pelo mesmo caminho do ingresso |
| E13 (PWA ou nativo) | é onde o atleta consome o programa; sem superfície de consumo, o Studio vende para o vazio |
| E16 · termos comerciais | a taxa sobre a venda de programa precisa caber na tabela que já existe (RN-178), não numa nova |

## Perguntas que precisam de resposta antes de virar backlog

Registradas agora para não serem redescobertas na Onda 7:

1. **Quem é o criador?** Um tenant novo, um papel dentro de um tenant existente, ou uma pessoa física com conta própria? A resposta define isolamento, Rules e cobrança.
2. **Como o produtor de evento é remunerado** por trazer o público? É o mesmo mecanismo de afiliação do E08, ou outro? Se for o mesmo, o Studio quase não traz contabilidade nova.
3. **Qual a taxa sobre a venda de programa?** Cabe na tabela por meio de pagamento do RN-178 ou é uma linha própria?
4. **O material anexo fica no Firebase Storage** com as mesmas regras de upload (ADR-016), ou conteúdo pago exige entrega assinada e expirável?

Nenhuma delas é decisão desta lane. Todas são type-1 e ficam em `02-rodadas/2026-07-19-espec-sweep/01-decisoes-abertas.md` como **perguntas de escopo futuro** — sem urgência, mas registradas.

## Critério para sair do gelo

O épico só vira backlog quando a V1 do produtor estiver no ar e validada, e quando as quatro perguntas acima tiverem resposta. Antes disso, planejar em detalhe é escrever spec que a realidade vai reescrever.
