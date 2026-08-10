# Pausa do maestro — 09/08 ~13h (dono saiu de casa)

> **Retomada lê este arquivo primeiro.** Ele aponta os handoffs vivos e a fila; o detalhe mora
> em cada handoff de lane e nas rodadas.

> **⛔ Adendo de ~14h30, escrito pela sessão Orkestra (o terminal desta pausa travou):**
> 1. A **DEPLOY-CORTE não deixou handoff** — o arquivo `leela-painel-corte-20260809-DEPLOY-CORTE.md`
>    não existe no disco. Vale o plano B já escrito abaixo: medir produção contra o baseline.
> 2. O dono **corrigiu a decisão de juros**: "até 3x sem juros" era exemplo, não decisão — juros é
>    operação manual dele pelo painel admin. **JUROS-ALINHAMENTO CANCELADO, JUROS-1 livre.** Registro
>    em `leela-specs/02-rodadas/2026-08-09-decisoes-dono/01-decisoes-dono.md`, correção no bloco 4.
> 3. Entrou o **REDESIGN-DS** (decisão do dono a executar): handoff de design em
>    `leela-specs/02-rodadas/2026-08-09-redesign-ds/` (copiado de Downloads, que é volátil).
>    Painel do organizador em **brasa com glass ligado**; painel admin com **glass desligado, fundo
>    preto**, para diferenciar. Detalhe em `00-decisao.md` da rodada.

## Estado no fechamento

- **Branch `main`**, HEAD ~`be15f18f` no momento da pausa. Push em dia até aqui.
- **DEPLOY-CORTE em voo no fechamento** (sf-platform-lead, orçamento 25 min): sobe functions
  (sexta recusa `38420cb6`) → painel (overlay+Modal `7b55d1b3` + fix crítico `d9394f51` + dezoito
  campos do parser `41bb7e8b`/`431c92ac`) → landing (frase da sexta recusa; é a cortável — sem
  ela a recusa degrada para a frase genérica, não 404). Handoff dela:
  `leela-painel-corte-20260809-DEPLOY-CORTE.md`. **A retomada confere esse handoff ANTES de
  qualquer coisa** — se a lane morreu no meio, o que subiu × não subiu está lá; se não estiver,
  medir produção contra o baseline (`leela-retomada-20260808-DEPLOY-FINAL.md`, deploy de ontem
  23:27/23:37) — nunca pela memória.
- **REV-CORTE**: vereditos no disco (`leela-painel-corte-20260809-REV-CORTE.md`) — os três alvos
  APROVADA COM RESSALVAS, pacote deployável só com `d9394f51` dentro. A notificação formal da
  lane não chegou antes da pausa; se aparecer commit de board dela depois, é docs, inofensivo.

## O dia até aqui (tudo pushed)

1. **Corte do painel** (ordem do dono: "67 decisões não é razoável"): 67 → 28 itens
   (23 decisões + 5 ações). Registro: `02-rodadas/2026-08-09-corte-painel/01-decisoes-maestro.md`
   (37 decididos pelo maestro com condição de reabertura) + `02-fila-execucao.md` (17 código,
   10 spec). **Regra permanente nova**: painel só carrega negócio e produto; duplicidades, CTAs
   inconsistentes, contrastes e calibragem com default óbvio o maestro decide e executa.
2. **Três builds da fila do corte, revisados**: OVERLAY (véu vira Modal do DS + inert + borda
   `--border-strong`), PONTE-RECUSA (sexta recusa `conta_inelegivel`; régua extraída para
   `elegibilidadeOrganizador.ts`), PARSE (18 campos com caminho de exibição; colar `1.234,56`
   parou de ser apagado; slot `hint` no Input do DS). REV-CORTE pagou o crítico `d9394f51`
   (inert não caía no sucesso do resgate — painel liberado nascia morto).
3. **Duas levas de decisões do dono registradas**:
   `02-rodadas/2026-08-09-decisoes-dono/01-decisoes-dono.md` + `02-fila-execucao.md`
   (21 blocos, 19 fecham, verbatim + esclarecimentos por AskUserQuestion). Também
   `94d2af45` (outra sessão do dono: radar-whatsapp + 4ª frente do LGPD-1).

## Decisões do dono de hoje (resumo operacional; verbatim na rodada)

SERV-1 (piso R$3 ok) · SERV-2 (pedido mínimo R$10 e parcela mínima R$10; parcela mínima JÁ roda
no código) · SERV-3 (Serviço = taxa da plataforma; destrava 34 strings do renome) · **JUROS: CORRIGIDO após a pausa
— "até 3x sem juros" era exemplo, não decisão; juros é operação manual do dono pelo painel admin
(RN-182 segue intacta)** · ESTOURO-1 (pendente segura vaga; volta ao expirar) ·
SEMKIT-1 (reparo autorizado, dados de teste; sem desconto sem kit, ponto final) · SEMKIT-2
(interruptor liga/desliga com aviso) · **PATROCINADOR-TOGGLE (decisão nova: patrocinador não se
apaga, desativa-se — metade já existe no modelo `StatusMarca`)** · PB-11 (sem arquivar) ·
ARENA-1 (visibilidade social futura; jurídico continua no LGPD-1) · ARENA-2 (lista deriva de
pilares/modalidades) · CLUBES-1 (CTA de inscrever-se) · ADMIN-USUARIOS-1 (cadastro aparece no
painel master; dono aprova por código OU liberação direta; modal na primeira AÇÃO — tensão com
RN-510 mapeada, vai para spec) · ADMINSEP-3 (super admin = inguzbuilders, demo nunca) ·
VITRINE-2 + COMPROMETIDO-1 (fecham pela PURGA) · item 69 (buscar bibliotecas de ícones) ·
item 12 (domínio) e CRM-1..4 SEGUEM com o dono.

## ⛔ Avisos que não podem se perder

- **⛔ JUROS — os três avisos que estavam aqui CAÍRAM com a correção do dono** (*"apenas dei um
  exemplo sobre as vezes sem juros, pode desconsiderar. Eu que decido como cobrarei juros pelo
  painel admin, manualmente."*). JUROS-ALINHAMENTO cancelado; o checkout a 2,89% de 2x em diante é
  o estado vigente sob controle manual dele, não divergência; JUROS-1 livre (o que ele salvar no
  painel é a decisão). Registro: rodada `2026-08-09-decisoes-dono`, bloco 4.
- **Tabela Asaas 1,89% a.m. CALCULADA** (na rodada): custo por parcela k = (V/N)×1,89%×k;
  **margem negativa a partir de 7x** (virada N=6,95). Alimenta `platform/config.custoGateway` e
  serve de insumo à escolha manual do dono no painel.
- **PURGA: seleção por LISTA EXPLÍCITA contra inventário congelado, nunca por padrão de nome** —
  o evento da compra real do dono chama-se `teste-taxa-repassada`, e `inguzbuilders@gmail.com`
  carrega o uid do antigo `admin@demo-leela.dev`. Preservar: PED-8CDHM, T93N7F, o evento, o uid.
  Matar: marina@/felipe@demo (vivas com senha válida). Reusar runner de
  `C:\dev\leela-apply-20260806\`. Inventário → review fria → apply.
- **SEMKIT-REPARO provavelmente sem objeto**: os dois kits `-15`/`-10` eram de eventos que o
  expurgo de 06/08 apagou (inferência com gate — medir produção antes da S318-T6). A tarefa
  que importa é a S318-T5 (seed ainda semeia os preços errados).
- **SEMKIT-2 × RN-503**: colisão de interruptores (o `incluiKitDaModalidade` do lote já existe
  com semântica oposta) — reconciliar antes da primeira linha.

## Fila da retomada, na ordem

1. **Conferir DEPLOY-CORTE** (o handoff dela **não existe** — a lane morreu sem registrar; medir
   produção contra o baseline `leela-retomada-20260808-DEPLOY-FINAL.md`, deploys de 23:27/23:37).
2. **REDESIGN-DS** (entrou no lugar do JUROS-ALINHAMENTO cancelado): aplicar o handoff de design de
   `leela-specs/02-rodadas/2026-08-09-redesign-ds/handoff/` — tema `dark-wine` + camada glass +
   tipografia do brasa (Exo 2 + Rubik) + telas Visão Geral v3/Engajamento. Painel do organizador em
   **brasa, glass ligado**; painel admin **glass desligado, fundo preto** (diferenciação; "se
   possível" — impedimento volta ao dono). Ordem do README §9, em duas conversas: tokens → tela.
   Gate: `pnpm generate-tokens` limpo, contraste passando, brasa/wine intocados além do pedido (L-011).
3. **PURGA-DADOS-TESTE ⚔⚔** (inventário congelado → review fria → apply; lista explícita).
4. **Builds**: SEMKIT-2-TOGGLE (após reconciliar RN-503) · PATROCINADOR-TOGGLE · CLUBES-CTA ·
   SERV-3-RENOME (34 strings) · SEMKIT-REPARO (após medição).
5. **Specs**: ESTOURO-RESERVA ⚔ (inclui agendar a varredura — `expirarPixPendente` é onCall e
   nunca roda sozinho) · ADMIN-USUARIOS-FLUXO (tensão RN-510) · ARENA-2-LISTA.
6. **Pesquisa**: ICONES (proposta ao dono antes de adotar).
7. Fila antiga do corte que sobrou: CONTA-2, INSCR-1, CONV-1, item 66, SENHA-1 deploy,
   REENVIO-PARCIAL-1, INSCRITO-APAGADO-1, RN469-PROJECAO-1, CTA-PIX-1, AREA-MUDA-1+TROCA-EMAIL-1,
   DEPLOY-1 (functions de convite inexistentes; **seed retido pelo LGPD-1**), ACUMULO-ESTOQUE-1.

## Pendências do dono (não bloqueiam)

Piso de R$10: sobre o total do pedido ou sobre o unitário? · gatilho exato do modal de liberação
(ação bloqueada × qualquer interação — spec vai propor) · item 12 (domínio) · CRM-1..4 ·
LGPD-1 (agora com 4 frentes; segura o seed do convite) · PCLIENTE-1 (retém ondas B/C) ·
password policy · PITR (sócio) · wine embed · tema novo no DS (Claude Design).

## Ressalvas de review não pagas (nenhuma urgente)

OVERLAY: prova de leitor de tela real é de navegador (jsdom não implementa inert) · subir o
`inert` para o Modal do DS beneficia 26 telas — decisão de arquitetura, lane própria ·
PONTE-RECUSA: duas afirmações do handoff mais fortes que a prova (detalhe no handoff da REV) ·
PARSE: régua de centavos em campo de % (fica como está por ora) · cinco-ou-sete campos com régua
(entregue cinco, virar sete custa duas linhas).
