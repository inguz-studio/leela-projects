# Onda 2 · E06 — Comunicação do evento (só Campanhas) · brief de lotes

Recorte V1 = **Campanhas** apenas: shell mínimo de Comunicação + modelo `campanhas` + estimativa de alcance (count sobre inscritos) + editor + `enviarCampanha` idempotente com limite push. Dep: E03 (Evento/Inscrito, feito), E01 (DS/shell), E05-L1/L2 (motor de comunicado/segmentação do clube, feito — insumo de reuso). E04-slim é vizinho de onda (toca o MESMO `_lib/subnav.ts` — ver barreira).

Roteamento: **Fable** = core/Functions/rules/segurança · **Opus** = telas painel (DS + api-client). 1 task = 1 commit atômico; staging seletivo (worktree com agentes paralelos).

---

## Cortes da spec original (registrados no topo, vinculantes)

A spec `LEELA-E06-marketing.md` é XL e unifica **Campanhas + Automações + Parceiros**. As decisões de escopo do Vitor (2026-07-04) e o recorte deste épico ("só Campanhas") cortam a maior parte dela:

1. **S400 Parceiros + `programaAfiliacao` → CORTADO.** Decisão adicional do Vitor: "Sem afiliados neste início". E08 (promotor self-service) adiado; split plugável fica só como desenho (ADR-006), sem UI. Toda a subcoleção `parceiros`, o doc `programaAfiliacao` write-side, link master, convite e detalhe de parceiro saem da V1. As Rules legadas de `parcerias`/`programaAfiliacao` já existentes (firestore.rules linhas 734/748) ficam como estão — não expando nem construo UI sobre elas.
2. **S402 Automações → CORTADO da V1.** É "Could" e está fora do recorte ("só Campanhas"). Automações por gatilho (novo inscrito, kit disponível, véspera, pós-evento) reusam `enviarCampanha`, então voltam barato na Onda 3 (V1.5 = engajar). Modelo/Function/tela de automação NÃO entram agora.
3. **S403 "9 → 8 tabs" → REFRAMED.** A premissa "unificar Promotores + Comunicação" morreu com o corte de afiliação: "Promotores" nunca existiu como aba na V1. A sub-nav real hoje (`_lib/subnav.ts`) tem 5 abas (Visão geral · Inscritos · Kits · Entrega · Financeiro) e é ADITIVA — E04 acrescenta Página de Vendas + Configurações, E06 acrescenta a aba de Comunicação. Mantenho só o pedaço aditivo (nova aba + rota + guard de que ela existe e roteia); descarto o framing de redução e a guarda de regressão contra "9 tabs / abas Promotores+Comunicação isoladas" (não se aplica).
4. **aberturasPct + "reenviar para quem não abriu" → DEFERIDO.** Sem provider de entrega/open-tracking em V1 (o disparo físico de push/email é mock, mesmo padrão do PaymentProvider/ADR-006). `alcance` (contagem real de destinatários) fica; `aberturasPct` e reenvio-para-não-abriu saem para quando existir provider de entrega.
5. **Segmento `por_engajamento` → CORTADO da taxonomia de campanha V1.** Inscrito não tem fonte de dado de engajamento na V1 (engajamento é E11/E13, não construído). Taxonomia de segmento de campanha = `todos_inscritos | por_modalidade | por_kit | por_status`. (No clube, `por_engajamento` existe porque o clube mantém `ativosPorJanela` — o evento não.)

O que sobra e é construído aqui = **S401 (Campanhas) integral** + shell mínimo (fatia de S400-T2) + fatia aditiva de sub-nav (fatia de S403-T1/T2).

---

## Reuso do motor de comunicado/segmentação do clube (E05-L2) — recomendação

O clube já tem, verde e no baseline (531/531): `core/clubs/comunicado.ts`, `core/clubs/comunicado-validacao.ts`, `core/clubs/segmentacao.ts` e `functions/clubs/onComunicadoEnvio.ts`. Auditei linha a linha. O código separa em três camadas com aptidão de reuso muito diferente:

- **Camada A — primitivas 100% agnósticas de domínio (idênticas nos dois lados).** Literais `CanalComunicado` (push/email), `StatusComunicado` (rascunho/agendado/enviado), `OrigemComunicado` (manual/automatizada) + arrays const + type guards; constantes de segurança `PUSH_MAX_CHARS = 160` e `PUSH_SEMANA_MAX = 4`; helpers `temCanalPush`, `truncarPush` (corte por code point), `contarChars`; e o miolo de `validarComunicado` (título ≥5, conteúdo ≥10, canal 1..2 sem duplicata, push ≤160, capa só-email) — tudo exceto o check da taxonomia de segmento.
  - **Gênero do `status` (verificado no código, resolvido):** o clube já persiste os códigos **masculinos** `rascunho`/`agendado`/`enviado` (`core/clubs/comunicado.ts` L26; Rules 651-704 checam `'enviado'`; baseline 531 verde). A spec E06 escreve a campanha no feminino (`agendada`/`enviada`) porque "campanha" é feminina — mas isso é **rótulo de UI, não código de dados**. Recomendo a campanha **reusar os códigos masculinos compartilhados** (uma fonte, um literal nas Rules/Function dos dois lados) e renderizar "Enviada/Agendada" só via glossário/label na tela. Evita um segundo enum gendered que derive do primeiro. Registrado como decisão em aberto (item 9) — se o Vitor exigir o código feminino no dado da campanha, `status` vira Camada C (enum próprio) e a extração compartilha só canal/origem/constantes/helpers/validação.
- **Camada B — envelope da Function de envio.** Guarda de idempotência (`status === 'enviado'` → no-op), janela deslizante de 7 dias do limite push (`contarPushNaJanela`, hoje amarrada ao path `clubes/{id}/comunicados`) e o carimbo `status='enviado' + enviadoEm + alcance`.
- **Camada C — genuinamente específica de domínio (DEVE divergir).** A taxonomia de segmento (clube: `por_desafio|por_pilar|por_engajamento`; evento: `por_modalidade|por_kit|por_status`) **e** a fonte do alcance: no clube `estimarAlcance` é PURO, mapeando segmento → número sobre agregados que o clube já mantém; no evento **não existem** agregados por-modalidade/por-kit, então a estimativa é uma **contagem `count()` on-demand sobre `inscritos`** (uma Function, não uma função pura). Além do path pai (`eventos/{id}/campanhas`) e da recontagem de `todos` (membros não-inativos vs. inscritos não-cancelados).

**Recomendação: extrair as camadas A e B para módulos compartilhados; reimplementar a camada C por domínio (duplicação consciente da FORMA, nunca dos valores).**

O argumento decisivo para extrair (e não duplicar) A/B: `PUSH_MAX_CHARS` e `PUSH_SEMANA_MAX` são constantes de segurança que batem no celular real de um usuário. Se derivarem entre os dois canais, uma superfície passa a permitir 5 push/semana ou 161 chars — isso é bug, não estilo. Uma fonte única elimina a classe inteira de drift.

- **A** → novo módulo core agnóstico `packages/core/src/comunicacao/` (`canal.ts` com literais/constantes/guards/helpers + `validacao-base.ts` com o miolo de validação parametrizado pelo predicado de segmento). O clube re-exporta desses caminhos para NÃO quebrar nenhum caller existente (`core/clubs/comunicado.ts` vira re-export fino + só a taxonomia dele).
- **B** → helper genérico em `functions/src/shared/comunicacaoEnvio.ts`: `contarPushNaJanela(collectionRef, agora, exceto)` + guarda de idempotência + carimbo, recebendo `collectionRef` e um callback `calcularAlcanceTodos()`. `onComunicadoEnvio` (clube) e `enviarCampanha` (evento) passam a ser cascas finas sobre ele.
- **C** → `core/eventos/campanha.ts` define a taxonomia do evento; `functions/eventos/estimarAlcance.ts` faz o `count()` sobre `inscritos`.

**Custo/risco honesto que isto joga para o consolidador:** extrair A/B **toca código E05 já verde** (parte do baseline 531) e potencialmente em voo (as telas E05 L3/L4/L5 ainda não existem — `routes/clubs` está vazio). Mitigação: fazer a extração como PRIMEIRA task Fable do épico, mantendo a API pública do clube 100% estável via re-export (nenhum import de clube muda), sob `.index-mutex` para os barrels e re-teste do baseline antes do commit. **Fallback** se o consolidador julgar o refactor cross-épico arriscado demais para esta onda: duplicar A dentro de `core/eventos/campanha.ts` **com um teste-guarda** que afirma `PUSH_MAX_CHARS`/`PUSH_SEMANA_MAX` iguais entre os módulos (drift de constante de segurança → build vermelho). A decisão de apetite de risco fica registrada abaixo.

---

## Lote E06-L1 · Núcleo compartilhado de comunicação + modelo de campanhas — FABLE

- Tasks: **E06-L1-T1** (extração camadas A+B → `core/comunicacao/*` + `functions/shared/comunicacaoEnvio.ts`, re-point do clube por re-export); **E06-L1-T2** (S401-T1 · `core/eventos/campanha.ts` + taxonomia de segmento do evento + Rules `eventos/{id}/campanhas` + `api-client/eventos/campanhas.ts` CRUD/query por estado + seed)
- Superfície: `packages/core/src/comunicacao/*`, `packages/core/src/clubs/comunicado*.ts` (só re-export), `functions/src/shared/comunicacaoEnvio.ts`, `functions/src/clubs/onComunicadoEnvio.ts` (vira casca), `packages/core/src/eventos/campanha.ts`, `packages/api-client/src/eventos/campanhas.ts`, `firestore.rules` (bloco `eventos/{id}/campanhas`), `functions/src/seed/campanhas.seed.ts`, barrels `index.ts`
- Dep: E05-L1/L2 (feito), E03-S200-T1 (Evento) e E03-S203-T1 (Inscrito, feito). **Bloqueia** todo o resto do épico (L2 e L3).
- Roteamento: FABLE.
- Aceite (falsificável por teste):
  - **T1:** `PUSH_MAX_CHARS === 160` e `PUSH_SEMANA_MAX === 4` importados de `@leela/core` (comunicacao) e usados pelo clube E pelo evento — um só símbolo, sem literal duplicado (grep não acha `160`/`4` hardcoded fora do módulo). `truncarPush('a'.repeat(161))` devolve 160 code points; emoji não é cortado no meio. Baseline do clube permanece **531/531 verde** após o re-point (nenhum teste E05 muda de resultado; imports do clube inalterados).
  - **T2:** `validarCampanha` reusa o miolo agnóstico e adiciona só a taxonomia de evento: segmento `por_kit` sem `referencia` → erro; `referencia='kit_ouro'` → válido (usa `isKitInscrito` de `core/eventos/inscrito`). Rule nega leitura/escrita de `eventos/{id}/campanhas` por não-owner do evento (não-membro do tenant); cliente que cria doc com `status='enviado'` (código compartilhado; UI mostra "Enviada") ou com `alcance != 0`/`enviadoEm`/`aberturasPct` é NEGADO (espelha o padrão do clube, `CAMPOS_FUNCTION_COMUNICADO` + firestore.rules 651-704); update que toca `alcance`/`enviadoEm` é negado. `capaUrl` presente sem `email` no canal → shape inválido (RN-135). Seed cria as campanhas canônicas da Meia Floripa (ex.: "kit pronto para retirada" → 48; "cupom para amigos").

## Lote E06-L2 · Estimativa de alcance + envio idempotente — FABLE

- Tasks: **E06-L2-T1** (`functions/eventos/estimarAlcance.ts` · callable que conta `inscritos` por segmento, on-demand); **E06-L2-T2** (S401-T4 · `functions/eventos/enviarCampanha.ts` idempotente + limite push RN-133, casca sobre `functions/shared/comunicacaoEnvio.ts`)
- Superfície: `functions/src/eventos/estimarAlcance.ts`, `functions/src/eventos/enviarCampanha.ts`, `firestore.rules` (`alcance`/`enviadaEm` só via Function — coberto em L1-T2, aqui só se ajusta se preciso)
- Dep: E06-L1-T2 (modelo/Rules), E03-S203-T1 (Inscrito). **Bloqueia** L3-T3 (editor consome estimativa ao vivo) e L3-T2 (lista mostra alcance).
- Roteamento: FABLE.
- Aceite (falsificável por teste, emulator):
  - **T1:** `estimarAlcance(eventoId, {tipo:'por_kit', referencia:'kit_ouro'})` retorna a contagem de inscritos com `kit==kit_ouro` E `status != 'cancelado'` (reusa `inscritoAtivo` de core); `por_modalidade='21k'` conta os do percurso; `por_status='pendente'` conta os pendentes; `todos_inscritos` conta todos os não-cancelados; `referencia` inexistente → `0`. É `count()` no servidor, nunca cálculo no cliente.
  - **T2:** disparar campanha de segmento de 48 inscritos → `status='enviado'` (código compartilhado; UI "Enviada"), `enviadoEm` carimbado, `alcance==48` (para `todos_inscritos`, recontagem real via `count()` de inscritos não-cancelados; para segmento específico, fotografia `segmento.tamanhoEstimado`). Reenviar campanha já `enviado` → no-op idempotente (não duplica alcance, não consome cota) — espelha o guard `motivo:'ja_enviado'` de `onComunicadoEnvio`. 5º push na janela deslizante de 7 dias → retorna `{bloqueado:'limite_push'}` e NÃO carimba (RN-133); email-only não consome cota (RN-131). Disparo físico é mock (registro/máquina de estados só, padrão ADR-006). Autorização por `organizadorId == uid`; erro sem PII.

## Lote E06-L3 · Aba Comunicação + shell mínimo + lista + editor — OPUS

- Tasks: **E06-L3-T1** (fatia de S403 + S400-T2 · adiciona aba "Comunicação" em `_lib/subnav.ts`, monta rota em `EventosRoutes.tsx`, shell fino do módulo + teste-guarda da aba); **E06-L3-T2** (S401-T2 · lista de campanhas por estado + filtros + popover de linha); **E06-L3-T3** (S401-T3 · editor "Nova campanha" com canal/capa/segmento/estimativa ao vivo/limite/160)
- Superfície: `apps/painel/src/routes/eventos/_lib/subnav.ts` (+ `__tests__/subnav.test.ts`), `apps/painel/src/routes/eventos/EventosRoutes.tsx`, `apps/painel/src/routes/eventos/comunicacao/*` (shell + `CampanhasList.tsx` + `CampanhaEditor.tsx` + `_data/campanhas.ts` + `_lib/`), consumindo DS + `api-client/eventos/campanhas` + callable `estimarAlcance`
- Dep: E06-L1-T2 (contrato/dados), E06-L2 (estimativa ao vivo + envio), E03-S202-T1 (layout/sub-nav do evento, feito), E01 (Table densa/Modal/Toast). L3-T3 ← L3-T2 (editor entra pela lista).
- Roteamento: OPUS.
- Aceite (falsificável por teste/e2e):
  - **T1:** qualquer rota do evento mostra a aba "Comunicação" na sub-nav com a ativa marcada (underline Brasa 2px, §2.14); `/eventos/{slug}/comunicacao` renderiza o módulo (default = lista de Campanhas). Teste-guarda: `subnav.test.ts` afirma que a aba de comunicação existe e roteia para o segmento correto (não é a guarda de "9 tabs" da spec — essa foi cortada). O shell é fino/extensível (sem sub-nav interna enquanto só há Campanhas — ver decisão em aberto).
  - **T2:** campanhas mistas → 3 grupos por estado (enviadas com `alcance`, agendadas com "disparo em", rascunhos com "criado em" — RN-130); filtro sem match → EmptyState "Nenhuma campanha encontrada com os filtros aplicados"; contador "mostrando X de Y"; popover de linha (ver/duplicar → Toast `Comunicado "[título]" duplicado · rascunho criado`). Tabela densa §2.5, flat §2.16, zero hardcode de token.
  - **T3:** canal push + corpo com 161 chars → aviso de truncamento (RN-134, usa `truncarPush`); `capaUrl` só habilita com email selecionado (RN-135); trocar segmento para `por_modalidade=21k` → estimativa de alcance atualiza ao vivo (callable `estimarAlcance`, debounced); dados válidos + "Salvar rascunho" → Toast `Rascunho salvo`; tentar enviar o 5º push da semana → bloqueia com aviso (RN-133, erro vindo de `enviarCampanha`). Upload dashed da capa é a única exceção de borda (§2.16).

---

## Sequência interna E06

`L1-T1 → L1-T2 → (L2-T1 ∥ L2-T2) → L3-T1 → L3-T2 → L3-T3`. L1-T1 (extração) primeiro para o clube e o evento partilharem a fonte única antes de qualquer código novo depender dela. L2 depende do modelo/Rules de L1-T2. As telas L3 dependem de L1 (contrato) e L2 (estimativa/envio); L3-T3 entra pela lista de L3-T2.

## Paralelismo entre épicos (Onda 2)

- **Barreira 1 = `_lib/subnav.ts`** (arquivo compartilhado): E04-slim adiciona "Página de Vendas" + "Configurações", E06 adiciona "Comunicação" — os DOIS editam a lista `ABAS` no mesmo arquivo. Análogo à barreira `firestore.rules` da Onda 1: serializar por ordem do consolidador ou fazer merge coordenado (cada épico acrescenta sua entrada, sem reordenar as do outro). Só L3-T1 do E06 toca este arquivo.
- **Barreira 2 = `firestore.rules`**: E06-L1-T2 adiciona o bloco `eventos/{id}/campanhas`; E04-slim adiciona cupons/equipe/vendas. Coordenar via `.rules-mutex` (reler do disco ao adquirir).
- **Barreira 3 = código E05 verde** (extração A/B em L1-T1): manter API do clube estável via re-export; re-testar baseline antes do commit. Sem colisão de tela — `routes/eventos/comunicacao` não colide com `routes/clubs`/`routes/plataforma`.
- `functions/src/seed/*` por coleção (um seed por task → baixo risco).

## Riscos / entidades compartilhadas

- **Inscrito** (E03-S203-T1) é lido por `estimarAlcance` e por `enviarCampanha` (segmento/alcance) — dependência de leitura só, sem escrita. Se a forma de `inscrito.status`/`kit`/`modalidade` mudar, a taxonomia de segmento acompanha.
- **Constantes de push** viram fonte única em L1-T1 — qualquer épico futuro que envie push (Automações Onda 3, Notificações) DEVE importar de `core/comunicacao`, nunca redeclarar.

## Decisões pendentes (para o consolidador ou o Vitor)

1. **Nome da aba: "Comunicação" (recomendo) vs "Marketing" (spec).** A spec chama o módulo de "Marketing" porque unificava Campanhas + Automações + Parceiros. Com Parceiros e Automações cortados, a V1 só tem Campanhas — "Comunicação" é honesto ao conteúdo. Rótulo é barato de renomear quando Automações voltar. **Consolidador/Vitor decide.**
2. **Extração A/B vs duplicação consciente (apetite de risco).** Recomendo extrair para módulo compartilhado com re-point do clube por re-export (fonte única das constantes de segurança). Isso toca código E05 verde/baseline. Fallback = duplicar com teste-guarda de sincronia de constantes. **Consolidador decide o apetite** (extração = mais DRY, toca E05; duplicação = isola E06, aceita guarda contra drift).
3. **Sub-nav interna do módulo.** Com só Campanhas na V1, recomendo o módulo SEM sub-nav interna (aba → lista direta), com o shell deixado extensível para Automações/Parceiros (Onda 3) reintroduzirem a sub-nav Campanhas·Automações·Parceiros. Alternativa: já montar a sub-nav de 1 item para forward-compat. **Confirmar.**
4. **Agendamento (`status='agendada'`).** V1 persiste `agendada` + `agendadaPara` e permite "Enviar agora" e "Salvar rascunho" plenamente. O gatilho time-based automático (scheduler/cron lendo `agendadaPara` e chamando `enviarCampanha`) é o único pedaço deferível se a onda apertar. **Decidir se o scheduler entra na V1 ou fica para Onda 3** (o estado `agendada` fica no modelo de qualquer forma).
5. **`aberturasPct` + "reenviar para quem não abriu" deferidos** (corte 4): confirmar que a ausência de métrica de abertura na V1 é aceita (sem provider de entrega, o dado não é real). `alcance` (count) fica.
6. **Segmento `por_engajamento` cortado da campanha V1** (corte 5): confirmar. Inscrito não tem agregado de engajamento até E11/E13; a taxonomia V1 é `todos_inscritos|por_modalidade|por_kit|por_status`.
7. **Disparo físico mockado** (padrão PaymentProvider/ADR-006): confirmar que `enviarCampanha` em V1 é só registro/máquina de estados + `alcance`, sem integração real de push/email (mesma lógica do "pago é registro" do E09-slim). Integração de canal (WhatsApp/APNs/FCM) fica pós-V1.
8. **Estimativa ao vivo = round-trip de callable** (não cálculo puro no cliente como no clube), porque o evento não mantém agregados por segmento. O editor chama `estimarAlcance` debounced a cada troca de segmento. Aceitável para o volume (453 inscritos), mas é uma diferença de UX/custo vs. o clube — registrar.
9. **Gênero do código de `status` da campanha (verificado no código).** O clube persiste `rascunho/agendado/enviado` (masculino) e as Rules/baseline dependem disso. A spec E06 escreve a campanha no feminino (`agendada/enviada`). Recomendo a campanha **reusar o código masculino compartilhado** (dado é gênero-neutro por convenção; label feminino "Enviada/Agendada" só na UI/glossário) — uma fonte, um literal nas Rules dos dois lados, zero risco de drift de enum. Se o Vitor exigir código feminino no dado, `status` sai da Camada A e vira enum próprio da campanha (Camada C). **Consolidador/Vitor decide** — afeta o literal checado nas Rules de `eventos/{id}/campanhas` e o mapeamento de label.

---

## Verificação do planner (auditoria linha a linha, 2026-07-05)

Confirmei contra o código real antes de assinar o brief:
- `core/clubs/{comunicado,comunicado-validacao,segmentacao}.ts` e `functions/clubs/onComunicadoEnvio.ts` existem e têm exatamente a estrutura A/B/C descrita; `PUSH_MAX_CHARS=160`/`PUSH_SEMANA_MAX=4` moram em `comunicado.ts` (L134/137), `truncarPush` corta por code point, `contarPushNaJanela(db, clubId, agora, exceto)` é a janela deslizante de 7 dias a genericizar (passar `collectionRef` + callback de alcance-todos).
- `_lib/subnav.ts` tem hoje **5 abas** (`overview·inscritos·kits·entrega·financeiro`) e é aditiva — o framing "9→8 tabs / Promotores" da spec de fato não se aplica (corte 3 correto).
- `core/eventos/inscrito.ts` expõe `isKitInscrito`, `inscritoAtivo`, `StatusInscrito='confirmado'|'pendente'|'cancelado'`, `kit: KitInscrito`, `modalidade: string` — a taxonomia de segmento do evento é implementável sobre esses campos sem novo dado.
- Rules: bloco do clube `match /comunicados/{comunicadoId}` na L651; legado de `parcerias`/`programaAfiliacao` nas L734/L748 (ficam intocados — corte 1 correto). `CAMPOS_FUNCTION_COMUNICADO=['alcance','aberturasPct','enviadoEm']` é o padrão a espelhar para a campanha.
- `packages/api-client/src/eventos/` tem `inscritos·kits·mutations·queries` — `campanhas.ts` é novo (L1-T2), sem colisão.
- Ressalva de coordenação — **RESOLVIDA (consolidador, 2026-07-05):** confirmado que E04 edita `_lib/subnav.ts` (L3 adiciona "Página de vendas", L5 adiciona "Configurações" — agora explícito no brief do E04). Ordem canônica de merge: **E04 primeiro, E06 depois**; cada épico só acrescenta a própria entrada, sem reordenar as existentes.
