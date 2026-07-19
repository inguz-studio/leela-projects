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

## Retomada DEC-0719-ret (2026-07-19) — fecha F1/F2 + estrangeiro

### Claim da ficha de CPF = RESOLVIDO (fecha F1/F2 do CHECKOUT2-MODELO) (**RN-174 nova**)
O claim do registry `pessoas/{cpf}` (vínculo `contaUid`) só ocorre com **(a) pagamento CONFIRMADO**, **(b) e-mail da conta == e-mail registrado na compra daquele CPF** e **(c) e-mail da conta CONFIRMADO** (verificação nativa do Firebase Auth — sem Brevo). Enquanto as três não valem, `dadosConhecidos`/prefill nunca são lidos por aquela conta ⇒ fecha o vazamento **F1** ("vítima anônima primeiro"). **F2** mitigado pelo mesmo desenho (conta só acessa dado após confirmar e-mail) — premissa registrada.

> Verbatim: *"pode ser e-mail confirmado + pagamento, mas acredito que seria importante enviarmos um e-mail de confirmação para a pessoa, quando ela fizer o primeiro login, ou receber os ingressos pela primeira vez."*

- É a **Direção B** (claim segue o pagamento) do report CHECKOUT2-MODELO, endurecida com o gate de e-mail correspondente + confirmado.
- Alinha a **RN-155**: o e-mail de confirmação dispara no **primeiro login OU na primeira entrega de ingressos** (o que vier primeiro), não no ato da compra. Consumidor do EmailProvider fail-closed (pendente `BREVO_API_KEY` só para o template próprio da marca; a verificação de e-mail em si é Firebase nativo).
- **Direção A** (prova de posse de CPF/código) = **REFORÇO pré-go-live**, backlog com gatilho "antes de produção com dado real" (recomendação do lead mantida).
- ⇒ Vira lote de código **executável já**: fila `CLAIM-FIX` (checkout/auth). Consolidado no épico **E19** (§Decisão F1/F2) + efeito no **E12**.

### Estrangeiro sem CPF = DECIDIDO / GATED-EXTERNO (modelo Doity/Sympla sobre o Asaas) (**RN-175 + RN-176 + RN-177 novas**)

> Verbatim: *"pesquisei na sympla, o produtor pode habilitar a compra para estrangeiros, mas somente mediante passaporte, nesse caso a compra pode passar via cartao internacional, Mas o asaas permite isso. acredito que seja no modelo doity"*

- **RN-175 (E04):** toggle POR EVENTO "aceitar inscrição de estrangeiros" (default OFF).
- **RN-176 (E12):** com o toggle ligado, o checkout pergunta nacionalidade; estrangeiro → **documento = PASSAPORTE** (formato/validação), **CPF oculto**, **pagamento restrito a CARTÃO internacional À VISTA** (sem PIX/boleto/parcelamento — restrição do caminho Asaas de cobrança avulsa liberada).
- **RN-177 (E19):** registry de pessoas com **documento tipado** (cpf | passaporte+país); a RN-173 "CPF único" **generaliza para "documento único"** — especificar SEM implementar.
- **GATED por ação externa:** liberação da conta Asaas para pagador estrangeiro (gerente de contas, ~6 dias úteis) — registrada como **ação do Vitor** (DECISOES-ABERTAS item 12b). Código só depois da liberação + sandbox provada ⇒ fila `ESTRANGEIRO-CHECKOUT` (gated).
- **Paliativo já válido (documentado):** brasileiro compra para estrangeiro inscrito com passaporte — cobrado quando a spec do inscrito-estrangeiro existir.
- Fonte de fatos: `outputs/leela-build-2d6ee98d/ESTRANGEIRO-PAGAMENTO-REPORT.md` (Doity roda esse fluxo em produção sobre o mesmo Asaas; Sympla replica com processador próprio; lacunas L1/L6 a reconfirmar com o gerente de contas antes do código).

## Premissas assumidas nesta consolidação
- **P-DEC0719-1** · RN-170 fica alojada na política de imagem (E17, casa da RN-168) + referência nas superfícies consumidoras (E12). Não editei o épico E03 (kit/capa) para não colidir com a lane TAMANHOS-GRADE ativa; a capa 1.9:1 (RN-228) e o kit 1:1 (RN-227) apenas ganham a semântica "troca + fit/crop" por referência à RN-170.
- **P-DEC0719-2** · D-2, D-4 e D-5 tratados como decisões de UI/fluxo (supersessão de wireframe registrada), sem RN formal — são mecânica de tela, não regra de negócio. Entram nos cards de fila.
- **P-DEC0719-3** · D-6 virou RN-157 porque o timer de 30 min é validade da CHARGE (money/lifecycle), não só UI.
- **P-DEC0719-4** · Reembolso (não devolve taxa) = pendente-de-confirmação (aguarda BENCHMARK-REEMBOLSO), não RN fechada.
- **P-DEC0719-5** · LGPD do CRM (item 24a) rebaixada de bloqueadora a nota "REVISITAR antes do go-live" — não apagada.
- **P-DEC0719-6** (ret) · RN-174 alocada em E19 (identidade/pessoas, casa da RN-172/173), com efeito referenciado no E12 (checkout). É a Direção B do report endurecida com o gate de e-mail; a Direção A (verificação externa) não foi adotada agora, só registrada como reforço pré-go-live.
- **P-DEC0719-7** (ret) · Cluster estrangeiro numerado contíguo (RN-175/176/177) na banda de identidade/pessoas (estende RN-172/173), apesar de a RN-175 morar em E04 — a coerência do cluster "documento/estrangeiro" pesou mais que a série por épico (a série é hint temático, não regra rígida; RN-156 já é E04/E12 na banda 150s, RN-173 é E19/E12 na banda 170s). Toggle default OFF ⇒ com o padrão, nada muda no checkout atual.
- **P-DEC0719-8** (ret) · Registry de documento tipado (RN-177) especificado SEM implementar; a migração `cpf-unico`→`documento-unico` e a UI do toggle são lote GATED (Asaas), não executável já. Só o `CLAIM-FIX` (RN-174) é executável imediato.
