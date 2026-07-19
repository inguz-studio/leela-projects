# Handoff — PROMOTOR (trace leela-build-2d6ee98d)

business: software-forge · employee: sf-frontend-engineer · model: Opus (UI)
project: C:\dev\LEELA · branch: main · lote: E08-PROMOTOR

## Missão

Dashboard próprio do PROMOTOR/influenciador — a visão "meu negócio como
afiliado". Triage do que o épico E08 / stories S-R9-11 pedem vs o que
`/clubes/minhas-afiliacoes` já entrega; entregar o DELTA real sem duplicar tela
(reuso-primeiro). RN-318 (projeção fechada) é lei.

## Triage — evoluído vs criado vs já existia

- **JÁ EXISTIA (não refeito):** `MinhasAfiliacoesPage.tsx` (`/clubes/minhas-afiliacoes`)
  já é a visão own-business do influenciador — cartões por evento com KPIs
  (inscrições/valor atribuído), gate de desconto RN-315, bloco de comissão
  (acumulada/repassada/saldo, dívida sem clamp), extrato de conversões e de
  repasses. Isso materializa **S703 (conversões)** e **S704 (financeiro)** do
  épico no recorte R9-E. Também intactos: aba Afiliados do organizador
  (`AfiliadosPage`), Influenciadores do organizador (`InfluenciadoresPage`,
  RN-319), aceite PF na landing.
- **EVOLUÍDO (o DELTA, `fb6f58a`):** a mesma tela ganhou o que faltava do "hub"
  (S701):
  1. **Resumo consolidado cross-eventos** — `<section>` de KpiCards no topo:
     afiliações ativas · inscrições no total · valor total (bruto) · comissão a
     receber (só quando há comissão configurada). Somado SÓ do array do reader
     (keyed no uid) → RN-318 preservada. Comissão a receber = Σ max(0, saldo)
     (dívida não abate).
  2. **Copiar código de indicação** por cartão — Button ghost do DS + toast;
     copia o refCodigo (JTBD "qual link uso").
- **NÃO criado (decisão reuso-primeiro):** rota `/promotor` dedicada — duplicaria
  a tela. App/superfície dedicada do promotor segue **Won't nesta fase** (épico
  "Fora de escopo"). Split automático de repasse = fase 3 (decisão aberta).

## Gates

- **tsc (minhas superfícies clubes/influenciadores): 0.**
- **eslint --max-warnings 0 (os 2 arquivos): 0.**
- **RTL MinhasAfiliacoesPage: 10/10** (vazio/erro/loading/dados escopados/gate
  RN-315/resumo somado 2 eventos/comissão-a-receber c/ dívida clampada/copiar
  clipboard/projeção RN-318/sem-comissão).
- **Suíte das superfícies tocadas: 22/22** (clubes/influenciadores +
  eventos/afiliados) — sem regressão.
- **Suíte completa do painel:** rodada como verificação; ver nota cross-lane.

## Nota cross-lane (honesta — não é regressão minha)

- O `tsc` do painel INTEIRO acusa 7 erros em `financeiro/analise/_lib/demografia.ts`
  + testes de demografia. São a **WIP não-commitada da lane E11-COHORT-BACKEND**
  na árvore de trabalho (rebucketização RN-822 de `packages/core/.../demografia.ts`
  para bandas de 5 anos, ainda não propagada ao consumidor do painel). Território
  PROIBIDO para esta lane — não toquei, não commitei (git commit --only nos meus
  2 arquivos). Meu diff é tsc-clean.
- Havia 1 stash pré-existente + a WIP demografia — **intocados** (sem stash).

## Reaproveitado vs criado

- **Reaproveitado (DS shadcn):** KpiCard, Button, Table, Badge, EmptyState,
  Skeleton, PageHeader, useToast. Padrão de resumo por KpiCards espelhado da
  `InfluenciadoresPage` (lado organizador). **Zero componente novo.**
- **Editado:** `apps/painel/src/routes/clubes/influenciadores/MinhasAfiliacoesPage.tsx`
  + seu teste RTL.

## Premissas / decisões

- Resumo só soma o que o reader devolve (próprio uid) — nunca varre nem cruza
  dado de terceiro (RN-318). Comissão a receber usa clamp de positivos igual ao
  lado do organizador (dívida = verdade, não abate o a-pagar).
- Rótulos do resumo distintos dos dos cartões ("Inscrições no total" vs
  "Inscrições atribuídas"; "Valor total" vs "Valor atribuído") — clareza +
  evita colisão de query nos testes; valores escopados por `within` no RTL.

## Pendências / follow-ups (registrados)

- **Copiar URL completa (backend, 1 campo):** `getMinhasAfiliacoes`
  (`functions/src/affiliation/readers.ts`) projeta `eventoNome` mas não
  `eventoSlug`; por isso hoje copia o CÓDIGO. Expor `eventoSlug` no reader
  destrava copiar `${landing}/${slug}?ref=${refCodigo}` como a `AfiliadosPage`
  do organizador já faz. Fora desta lane (functions = território E11-COHORT).
- **Repasse PARCIAL** (herdado do CRM-COMISSAO-UI) segue pendente.
- **App/superfície dedicada do promotor** e **split automático (fase 3)** = H3.

## Onde o Vitor confere

- Conta de influenciador → **Clubes → Minhas afiliações**: topo mostra o resumo
  consolidado (soma dos eventos dele); cada cartão de evento tem o botão
  **"Copiar código"**. (Prova visual do preview pendente de rebuild/restart —
  provado por RTL; não abri navegador por iniciativa própria — diretriz.)

## Commits

- `fb6f58a` `[LEELA-PROMOTOR-T1]` — feat(painel): visão consolidada do promotor +
  copiar código na Minhas afiliações (2 arquivos; pushed).
