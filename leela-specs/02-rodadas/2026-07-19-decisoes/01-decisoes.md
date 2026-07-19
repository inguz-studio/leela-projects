---
tags: [leela, decisoes, rodada, produto]
aliases: ["Rodada de decisões 2026-07-19", "DEC-0719"]
trace: leela-build-2d6ee98d
lote: DECISOES-0719
data: 2026-07-19
fonte: respostas do Vitor ao painel DECISOES-ABERTAS + CHECKOUT-UX-REPORT (seção Decisões)
---

# Rodada de decisões do Vitor — 2026-07-19 (DEC-0719)

Arquivo canônico da rodada. Preserva o **verbatim** do Vitor onde ele existe e registra a consolidação nos épicos, ADR e RNs. O painel curto vive em [[DECISOES-ABERTAS]]; a versão longa argumentada em [[DECISOES-EM-ABERTO]]. Delta de RNs em `02-rns-delta.md`; fila de código derivada em `03-fila-codigo.md`.

## Decisões (verbatim preservado onde indicado)

### Item 18 · ADR-016 RATIFICADA
Firebase Storage confirmado. Status da ADR: **proposta → aceita**. Doc atualizado em `03-canon/adr/ADR-016-firebase-storage-upload.md`.

### Item 19 · Upload-only = TUDO
Morre o "colar URL" em TODAS as superfícies de imagem. **RN-168** confirmada/ampliada (supersede o fallback de URL da ADR-016 globalmente).

> Verbatim: *"com a opção de trocar imagens, não se esqueça; se tiver imagem na proporção diferente, a gente mesmo ajusta para caber."*

⇒ **RN-170 (nova):** toda superfície de imagem tem ação **TROCAR** imagem + **ajuste automático de proporção** (fit/crop client-side para a proporção da superfície — ex.: capa 1.9:1, logo 1:1). Vira lote de código (fila): sweep upload-only + troca + ajuste de proporção.

### Item 21 · Divisórias = TODO SubNav
Não só as terciárias de eventos. **RN-229 ampliada**; supersede a decisão "SubNav plano" de 2026-07-11 **globalmente**.

### Item 22 · Clube-influenciador = DIREÇÃO retroativa, implementação PARKED

> Verbatim: *"o desconto ativa com retroativo, pois todos devem ter desconto, mas podemos deixar isso como prioridade um pouco mais baixa agora, para eu revisar como funciona na ticketsports."*

- Direção decidida = **retroativo** (todos devem ter desconto ao cruzar o mínimo).
- **RN-315 (sem retroativo) SEGUE EM VIGOR** até o Vitor revisar o benchmark Ticketsports.
- Quando destravar, é dinheiro ⇒ **rota Fable + review antagonista obrigatória**.
- HIP-R9-01 (group-buy / pré-compra em lote) permanece hipótese separada, ainda pendente de validação com organizador.

### Item 23 · Desembolso = REPASSE MANUAL ratificado; split NÃO (fase 3 não abre)
Racional de negócio (estratégia, registrado na versão longa): o controle dos repasses fica com a **plataforma** para manejar **ANTECIPAÇÕES** e aumentar margem. A antecipação não é padrão aos olhos do Asaas, mas é oferecida ao cliente; **os juros de antecipação são markup nosso**. O split automático mataria essa linha de receita.

**Reembolso:** a priori **NÃO devolve a taxa de serviço** — decisão CONDICIONADA ao benchmark (lane BENCHMARK-REEMBOLSO; report em `outputs/leela-build-2d6ee98d/BENCHMARK-REEMBOLSO-REPORT.md`). Registrado como **pendente-de-confirmação**, não como RN fechada.

### Item 24 · CRM / E19
- **(a) LGPD:** *"pode relevar agora"* ⇒ segue sem bloqueio com o default de **legítimo interesse**, registrando nota explícita de **REVISITAR antes do go-live** (severidade rebaixada, pendência não apagada).
- **(b) Hub unificado "Clientes & Comunicação" = confirmado.**
- **(c) Chave CPF→e-mail = confirmada.**
- **(d) RN-173 (nova): CPF é ÚNICO no sistema.**

> Verbatim: *"só podemos ter CPF's únicos no sistema, importante isso."*

⇒ Unicidade global de pessoa por CPF; colisão no checkout = **mesma pessoa, linka, não duplica**. Vira lote de código (fila): constraint de unicidade + fluxo de colisão.

### D-2 · Cards por atleta + botão "+ adicionar atleta"
Ratificada via AskUserQuestion (opção recomendada). Supersessão da tela 2 do wireframe 112-4622 registrada.

### D-4 · Campo de código/cupom no INÍCIO do fluxo
Paridade com a referência (move/duplica o input do cupom para o step 0).

### D-5 · Pix|Cartão na etapa de pagamento como BOTÕES, sem toggle

> Verbatim: *"pix e cartao na etapa de pagamento, mas em botões, sem toggle."*

### D-6 · PIX: QR na tela com TIMER de 30 min + copia-e-cola auto (**RN-157 nova**)
QR na tela com timer de validade de 30 minutos; botão que **copia automaticamente** e dispara toast *"a chave para pagamento foi copiada"*.

**Premissa registrada (não perguntada):** QR + copiar valem enquanto o PIX estiver pendente — tela de pagamento **E** tela do pedido pendente (essência do D-6 original). Timer de 30 min = validade da cobrança PIX (expiração da charge, não só UI) ⇒ implicação no PaymentProvider/Asaas (`expiresIn`) para o lote de código.

### D-7 · Exigências de saúde = OBRIGATÓRIAS (**RN-156 nova**)
Termo de saúde BASE da plataforma sempre presente no checkout; organizador PODE personalizar/adicionar o seu.

> Verbatim: *"é um termo base que teremos, mas deixamos também o organizador ter os seus, para personalizar, caso deseje."*

Reconciliar com **RN-146/147** e o aceite versionado do CHECKOUT-MODELO (termo modelo Sympla já landed): deixa de ser condicional a flag; a flag do organizador passa a **ADICIONAR** termo custom. Os dados plenos de saúde (atestado/PAR-Q, RN-146/147) seguem condicionais à flag do evento.

### Gênero no checkout + conta sem fricção (**RN-154 + RN-155 novas**)
Gênero coletado no checkout; se a pessoa JÁ comprou antes, pré-preenche sozinho (via CPF único, item 24d / RN-173); na PRIMEIRA compra, cria conta automaticamente sem fricção e **ENVIA LINK por e-mail** avisando que a conta foi criada, para definir senha e visualizar a compra.

**Dependência registrada:** o envio do link depende do **EmailProvider** (`BREVO_API_KEY`, ação externa pendente — RN-137).

## Premissas assumidas nesta consolidação
- **P-DEC0719-1** · RN-170 fica alojada na política de imagem (E17, casa da RN-168) + referência nas superfícies consumidoras (E12). Não editei o épico E03 (kit/capa) para não colidir com a lane TAMANHOS-GRADE ativa; a capa 1.9:1 (RN-228) e o kit 1:1 (RN-227) apenas ganham a semântica "troca + fit/crop" por referência à RN-170.
- **P-DEC0719-2** · D-2, D-4 e D-5 tratados como decisões de UI/fluxo (supersessão de wireframe registrada), sem RN formal — são mecânica de tela, não regra de negócio. Entram nos cards de fila.
- **P-DEC0719-3** · D-6 virou RN-157 porque o timer de 30 min é validade da CHARGE (money/lifecycle), não só UI.
- **P-DEC0719-4** · Reembolso (não devolve taxa) = pendente-de-confirmação (aguarda BENCHMARK-REEMBOLSO), não RN fechada.
- **P-DEC0719-5** · LGPD do CRM (item 24a) rebaixada de bloqueadora a nota "REVISITAR antes do go-live" — não apagada.
