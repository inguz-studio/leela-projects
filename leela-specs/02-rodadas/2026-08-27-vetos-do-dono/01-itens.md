# Rodada 2026-08-27 · Vetos e observações do dono (sessão de aprovação da landing)

> Fala do dono transcrita na sessão de 27/08, itemizada na mesma janela (regra da casa).
> Aprovação registrada: **PR #2 (landing awwwards) aprovado e mergeado** — "aprovo as landings, depois eu evoluo".
> Lanes despachadas a partir desta rodada: DS-BORDAS-E-BENTO · TERCIARIO-E-NAV · EVENTOS-POLIMENTO · CHECKIN-ENTREGA.

## Itens

- **V2708-01 · Numeral cortado em Eventos** — o número de "dias para o evento" está sendo cortado
  no painel. Conserto visual. → lane EVENTOS-POLIMENTO
- **V2708-02 · Componentes flutuando sem bento card** — "existem vários componentes que estão
  flutuando sem bento cards no sistema inteiro", exemplo citado: **Kits**. Varredura + enquadrar. → lane DS-BORDAS-E-BENTO
- **V2708-03 · Padrão terciário aprovado e vira lei no desktop** — "o formato de menu em clubs,
  configurações ficou bom, pois o menu terciário se encaixa melhor no formato web. **Padronize
  isso no desktop**." Mandato aberto para a melhor solução de UX na responsividade. → lane TERCIARIO-E-NAV
- **V2708-04 · Bottom bar mobile menor** — "revise o tamanho do menu bar de footer, pois está
  muito grande". ✅ **Isto decide a NAV-MOBILE-5 na direção compacta** (a barra cobrava 82px de
  dobra, 116 com entalhe). → lane TERCIARIO-E-NAV
- **V2708-05 · Animações de troca de menu quebrando o layout** — consertar. → lane TERCIARIO-E-NAV
- **V2708-06 · Cadastro de modalidade não é descobrível** — "ainda não sei aonde posso cadastrar
  uma modalidade nova, isso não está claro na interface". → lane EVENTOS-POLIMENTO
- **V2708-07 · ⛔ REGRA REAFIRMADA: sem linhas de borda — em todo o design system** — "não
  estamos com consistência de bentocard e tabelas, com algumas tendo linhas de borda e outras
  não, **sendo que fui explícito outras vezes para não termos linhas de borda em todo o design
  system**". Varredura completa + catraca para não reincidir. → lane DS-BORDAS-E-BENTO
- **V2708-08 · Auditoria de duplicação de componentes** — pergunta direta do dono: "tenho a
  sensação de que nossos componentes não estão padronizados… sempre criando novos componentes
  em vez de reaproveitar. Estou enganado?" Responder com inventário e números, sem defesa. → lane DS-BORDAS-E-BENTO
- **V2708-09 · ⛔ REGRA NOVA de UX writing: sem textos descritivos de apoio por padrão** —
  "existem muitos textos, como em modalidades, dentro de eventos, com descritivo, sendo que não
  pedi esse tipo de UX writing. Pode **sugerir** depois algum tooltip de dúvida explicando, mas
  **nunca colocar sempre textos assim de apoio**." Remover os existentes; tooltip é proposta,
  não default. → lane EVENTOS-POLIMENTO
- **V2708-10 · Revisão de carga cognitiva** — "quero uma revisão de carga cognitiva também para
  simplificarmos as ações por parte do usuário". Conecta às ondas R1/R3 (que esperam EVT-CARGA);
  os itens V2708-09 e -04 já dão direção parcial. → lane EVENTOS-POLIMENTO (proposta) + perguntas
  EVT-CARGA remanescentes sobem no handoff
- **V2708-11 · Vendas entra no terciário de Eventos** — "configurações pode unificar a página de
  vendas no menu terciário, em eventos". → lane TERCIARIO-E-NAV
- **V2708-12 · Formulários personalizados — resposta registrada** — status: **backlog, sem uma
  linha escrita** (S313/S310/S112/S1212, Onda 4.0 do roadmap). Não foi desenvolvido.
- **V2708-13 · Check-in: voltar nas 3 etapas** — "no check-in não tem ação de voltar às 3
  etapas". → lane CHECKIN-ENTREGA
- **V2708-14 · Check-in: tamanho dos itens por participante** — "não estamos mostrando o tamanho
  dos participantes quanto aos itens". → lane CHECKIN-ENTREGA
- **V2708-15 · Régua entrega→estoque precisa ser clara e visível** — "não sei se temos uma regra
  clara que está contabilizando as entregas e abatendo do estoque, para que todos tenham esse
  controle". Os boards citam régua própria ("camiseta entregue"); a lane confirma no código e
  expõe o controle na UI. ⚠️ Se a régua não existir no servidor, **não inventar** — vira decisão
  de domínio no handoff. → lane CHECKIN-ENTREGA
- **V2708-17 · Credenciamento simplifica: dados de visão migram para a Visão geral do evento** —
  fala complementar do dono na mesma sessão: "os dados de visão geral quanto a retirada de kits,
  chips, alertas de credenciamento e últimos atendimentos e ações rápidas podem ir para visão
  geral também, para simplificarmos o credenciamento". O credenciamento fica focado na operação
  de balcão; o panorama (retiradas, chips, alertas, últimos atendimentos, ações rápidas) mora na
  Visão geral do evento. → lane CHECKIN-ENTREGA
- **V2708-16 · Governança (registrados no merge do PR #2, como manda a regra)** —
  (a) o preset Tailwind entrega cor como `var(--token)` crua e o modificador de **alpha é
  descartado em silêncio** (CTA da landing estava transparente; o painel pode ter os seus);
  (b) o lint `leela-tokens/no-hardcoded-tokens` tem **furo em arbitrary values com `_`**.
  → lane DS-BORDAS-E-BENTO (a catraca do V2708-07 deve cobrir os dois)

## Adendo de 28/08 — a segunda fala do dono

- **V2708-18 · ⛔ REGRA GLOBAL: reuso primeiro + componente documentado no DS + showroom +
  Storybook** — "quero que você transforme em regra global sobre reutilização de componentes,
  documentação no design system, showroom, e storybook". Registrada como §10 da
  `04-engenharia/governanca-design.md`. → enforcement na lane REUSO-E-SHOWROOM
- **V2708-19 · Aprovações desta fala** — (a) os **5 PRs da rodada** (#6 #7 #8 #9 #10)
  aprovados e mergeados em 28/08, ordem #10→#7→#6→#8→#9; a catraca do cânone pegou 1
  superfície crua na soma (consertada em `45f1d074`); (b) **"pode tocar as regras
  terciárias"** → emenda da RN-574 efetivada (ver LEELA-E01, seção da RN-574) e fase 2 do
  terciário despachada (as 6 áreas candidatas); (c) tooltips: o dono não encontrou as
  propostas — coladas no chat; o padrão ainda espera o veto dele.
- **V2708-20 · Confusões a desfazer no processo** — o dono não entendeu (a) o que a ação 69
  pede dele, (b) o que são os backfills, (c) onde validar as mudanças ("localmente não vi as
  atualizações, apenas constatei") — causa real: os PRs ainda não estavam mergeados e as
  réplicas locais serviam builds velhos. Consertado: merges + rebuild da :4601 e :4602.
  Lição de processo: **toda entrega em PR precisa dizer explicitamente que o local só muda
  depois do merge + rebuild.**
