# Handoff · CAIXASIMPLES-REV (review antagonista) · trace leela-build-2d6ee98d

Alvo: lane CAIXA-SIMPLES (DEC-0727C) — `15c7121`, `74b855d`, `49b44b8`, `9e74f24`.
Postura: contexto fresco, adversarial. Emulador exclusivo (8080/9099/5001);
preview do dono (3000/5273/8180) intocado. Sem navegador, sem rede real, sem push.

## Estado: CONCLUÍDA

Veredito da lane: **APROVADA COM RESSALVAS**.
O guard RN-368 e a base única RN-367 sobreviveram a todos os ataques; os dois
defeitos achados eram de CONTRATO e de REDE DE TESTE, não da regra de dinheiro.
Dois escalados vão ao dono.

## Commits desta review

| Hash | O quê |
|------|-------|
| `2595465` | 8 casos de ataque (corrida no mesmo evento, ordem das validações, bordas, resíduo E-2 medido) |
| `db76363` | FIX — `@leela/api-client` volta a espelhar a callable + `repasseContrato.test.ts` |
| `aa75a03` | FIX — guarda de entrada de `computeDisponivelPorEvento` volta a ter rede |

## Veredito por vetor

| # | Vetor | Veredito |
|---|-------|----------|
| 1 | Corrida no MESMO evento com folga no tenant | **REFUTADO** — o guard serializa; Σ dos vivos ≤ liberado em 2 e 3 pedidos simultâneos |
| 2 | `commercialTerms` lido pelo organizador × Rules | **REFUTADO** na Rule; achado MEDIA no tratamento do erro de leitura (escalado) |
| 3 | Convergência nas bordas (termo ≠ 15%, centavos, legado, encerrado, estorno) | **REFUTADO** — 3 casos novos, todos verdes |
| 4 | Σ por evento × disponível do tenant | **CONFIRMADO** (MEDIA) — janela D+N abre gap de R$ 4.475 no cenário medido; escalado |
| 5 | `packages/api-client` desalinhado | **CONFIRMADO** (MEDIA) — CONSERTADO em `db76363` |
| 6 | Ordem das validações → mensagem no painel | **REFUTADO** — genérica no tenant, tipada no evento |
| 7 | Falsificação dos guards | Os dois MORDEM (server 9 e 4 vermelhos; painel 16 e 29) |
| 8 | Auditoria de asserções | **CONFIRMADO** (MEDIA) — 1 proteção sem substituta; CONSERTADO em `aa75a03` |

## Escalados (sem fix — decisão não é da review)

1. **Resíduo E-2, agora medido.** A Caixa é POR EVENTO e não conhece a janela
   D+N, que é do TENANT. Cenário: pagamento confirmado hoje segura R$ 4.475 →
   card mostra 8.500, saque aceita 4.025. Pergunta ao dono: *o card "Disponível
   para Repasse" passa a exibir `min(teto do evento, saldo do tenant)`, ou o
   número por evento continua sendo o exibido e a janela só aparece na
   recusa?* Cenário travado em teste (`V4`), que fica vermelho de propósito se
   alguém mudar o comportamento sem decidir.
2. **A Caixa engole o erro de leitura do termo.** `FinanceiroPage` ignora
   `termos.error`; com a leitura falhando e um termo negociado (ex.: 30%), o
   card cai no default 15 e volta a prometer mais do que o saque aceita — em
   silêncio. A MESMA lane fez o erro do histórico chegar à tela
   (`repasseErro={historico.error}`) por esse exato raciocínio, e não aplicou
   aqui. Pergunta: *o erro do termo vira ressalva na tela como o do histórico?*

## Achado BAIXA (registrado, não consertado)

`FinanceiroPage` aceita a % do termo com `typeof pct === 'number'`, que passa
`NaN`; o consumidor irmão (`useRepassesPorEvento`) usa `Number.isFinite`. Com
`NaN` no termo, a Caixa lança RangeError no render em vez de cair no default.
Gatilho exige dado corrompido (Rule e callable barram `NaN` nos dois caminhos de
escrita). Conserto de uma linha: trocar por `Number.isFinite(pct)`.

## Gates literais (após os 3 commits)

- `emulators:exec --project demo-leela --only firestore,auth` +
  `vitest run` de repasseCore · requestRepasse.integration · repasseContrato ·
  repasseRules · repasseAdmin · commercialTermsRules · bankAccess →
  **7 arquivos, 158 testes, verde**
- `apps/painel`: `vitest run src/routes/eventos src/lib/query` →
  **78 arquivos, 701 testes, verde** (após `tsup` do api-client)
- `tsc --noEmit`: functions, api-client, painel → **verde nos três**
- `eslint --max-warnings 0`: `packages/api-client/src`, testes tocados → **verde**

## Território

Tocado: `functions/src/__tests__/` (3 arquivos), `packages/api-client/src/finance.ts`.
NÃO tocado: `functions/src/finance/` (regra intacta), `packages/core`,
`functions/src/payments`, `functions/src/checkout`, landing, DS, `leela-specs`.
