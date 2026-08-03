# Handoff · Lane JUROS-PROD-CONFIG · trace leela-build-2d6ee98d

- **Repo:** `C:\dev\LEELA` · **Branch:** `main` · **Base:** `4492cc39` · sem push.
- **Employee:** sf-backend-lead (software-forge)
- **Escopo:** micro-lane de DADO. Confirmação do achado B5/DEC-0802B — o dono
  autorizou simular o painel admin configurado em **2,89% a.m.**
- **Código:** nada mudou. Nenhum arquivo de `src/` tocado, nenhum deploy, nenhum
  redeploy. A lane escreveu **um campo** no Firestore de produção.
- **Navegador:** nunca aberto.

## A mutação (única autorizada)

| item | valor |
|---|---|
| Projeto | `leela-hub` (produção) |
| Path | `tenants/castelo-producoes/commercialTerms/current` |
| Campo | `installmentRules.jurosAoMes` |
| Antes | `0` |
| Depois | `2.89` |
| Método | Admin SDK, `ref.update({ 'installmentRules.jurosAoMes': 2.89 })` — field path pontilhado, uma folha só |
| Credencial | ADC `authorized_user` regenerado do refresh token do firebase-tools (`inguzbuilders@gmail.com`), fora do repo, apagado ao fim |
| Pré-condição verificada em runtime | abortava se o valor lido não fosse exatamente `0` |

## Unidade: 2.89, não 0.0289 — prova

Três fontes independentes dizem **percentual**:

1. `packages/core/src/finance/calc.ts:135` —
   `const i = rules.jurosAoMes > 0 ? rules.jurosAoMes / 100 : 0;`
   O cálculo divide por 100 para chegar à taxa mensal. Gravar `0.0289` daria
   0,0289% a.m. (fator 100 abaixo do pedido).
2. `apps/painel/src/routes/plataforma/tenants/termos/TermsEditor.tsx:274-281` —
   campo `jurosAoMes` com `label="Juros ao mês (%)"` e `step="0.1"`; o editor
   escreve `Number(v.jurosAoMes)` cru, sem conversão. O que o dono digita no
   painel é o que vai para o doc.
3. `packages/core/src/platform/commercialTerms.ts:205-215` —
   `DEFAULT_COMMERCIAL_TERMS.installmentRules.jurosAoMes: 2.89`, documentado no
   comentário como "2,89% a.m." (S314-T2 · RN-436 · D-ACH-8). O seed
   (`functions/src/seed/commercialTerms.seed.ts:81-86`) imprime
   `${jurosAoMes}% a.m.`.

O valor gravado (`2.89`) é byte a byte o mesmo que o `DEFAULT_COMMERCIAL_TERMS`
do código já carregava — o dado de produção só estava atrás do código.

## Prova verbatim — doc ANTES

```json
{
  "platformFeePct": 10.5,
  "installmentRules": { "maxParcelas": 12, "jurosAoMes": 0, "parcelaMinima": 10 },
  "anticipation": { "disponivel": false },
  "communityMonthlyEnabled": false,
  "saasMonthlyFee": 0,
  "versao": 1,
  "atualizadoPor": "uid-platform-admin",
  "atualizadoEm": "2026-07-29T00:06:46.691Z"
}
```

## Prova verbatim — doc DEPOIS

```json
{
  "platformFeePct": 10.5,
  "anticipation": { "disponivel": false },
  "communityMonthlyEnabled": false,
  "saasMonthlyFee": 0,
  "versao": 1,
  "atualizadoPor": "uid-platform-admin",
  "atualizadoEm": "2026-07-29T00:06:46.691Z",
  "installmentRules": { "maxParcelas": 12, "parcelaMinima": 10, "jurosAoMes": 2.89 }
}
```

Todo campo fora de `installmentRules.jurosAoMes` está idêntico, incluindo
`atualizadoEm` (mesmo epoch, `1785283606.691`) — o `update` por field path não
carimba timestamp. `maxParcelas` e `parcelaMinima` intactos; a reordenação das
chaves é só serialização do dump.

## Efeito medido ponta a ponta — sem criar compra

Rodado o **núcleo** da cotação de produção (`cotarInscricaoCheckoutCore`, o
mesmo que a callable chama) contra o Firestore de produção, com o build
deployado (`functions/lib`, mtime 05:10 de hoje, HEAD `4492cc39`). Escolhido
o núcleo e não a callable **de propósito**: a callable é
`cotarInscricaoCheckoutComCarrinho`, que grava `carrinho` best-effort (RN-158) —
isso seria uma segunda mutação em produção, fora da autorização. O núcleo é
read-only e provado assim no cabeçalho do arquivo.

Carrinho de leitura: evento `meia-floripa-2026` (tenant `castelo-producoes`),
1× inscrição `21k`, sem kit, sem cupom. Lote vigente = "Lote 2", **R$ 150,00**.

| cotação | ANTES (juros 0) | DEPOIS (juros 2,89% a.m.) |
|---|---|---|
| PIX à vista | R$ 150,00 | R$ 150,00 |
| Cartão 1x | R$ 150,00 | R$ 150,00 |
| Cartão 12x — parcela | R$ 12,50 | **R$ 14,97** |
| Cartão 12x — total | R$ 150,00 | **R$ 179,64** |
| `jurosParcelamento` (12x) | R$ 0,00 | **R$ 29,64** |
| 12x > 1x? | **false** | **true** |
| 1x cartão == PIX à vista? | true | true |

Escada completa do DEPOIS (n · parcela · total), tabela Price com
arredondamento na parcela (RN-436):

```
 1x  R$ 150,00 → R$ 150,00      7x  R$  23,98 → R$ 167,86
 2x  R$  78,27 → R$ 156,54      8x  R$  21,27 → R$ 170,16
 3x  R$  52,92 → R$ 158,76      9x  R$  19,17 → R$ 172,53
 4x  R$  40,25 → R$ 161,00     10x  R$  17,49 → R$ 174,90
 5x  R$  32,65 → R$ 163,25     11x  R$  16,11 → R$ 177,21
 6x  R$  27,59 → R$ 165,54     12x  R$  14,97 → R$ 179,64
```

Monotônica e estritamente crescente de 2x a 12x. O resíduo de arredondamento
que aparecia no ANTES (7x = R$ 150,01, 9x = R$ 150,03, 11x = R$ 150,04 — o
efeito descrito em `calc.ts` para termo sem juros) desapareceu: com juros
ligados o ramo do piso do principal nunca dispara.

Confere com a fórmula à mão: `150 × 0,0289 ÷ (1 − 1,0289⁻¹²) = 14,971` →
parcela R$ 14,97 → total R$ 179,64.

## O efeito vale sem redeploy

`functions/src/checkout/createInscricaoCharge.ts:1123-1129` monta o
`TermsProvider` **por invocação** com `{ ttlMs: 0 }` — cache desligado, leitura
direta de `tenants/{tid}/commercialTerms/current` a cada chamada. A function no
ar já enxerga o novo valor; nada a redeployar, nada a invalidar.

## Achados registrados (nenhuma ação tomada)

1. **Drift de auditoria no snapshot.** O contrato de versionamento
   (`packages/api-client/src/platform/commercialTerms.ts:63-104`) manda todo save
   bumpar `versao` e gravar `commercialTerms/v{versao}` imutável. A escrita desta
   lane foi minimalista por ordem explícita, então `current` continua `versao: 1`
   e o snapshot `v1` ainda diz `jurosAoMes: 0` — os dois divergem. Não quebra
   nada funcional (o próximo save do painel lê `versao 1`, bate o `expectedVersion`
   e grava `v2` normalmente), mas o histórico de v1 deixou de ser fiel.
   **Cura barata:** o dono abrir `/plataforma` → Termos do tenant Castelo e salvar
   sem mudar nada — isso escreve `v2` já com 2,89 e sela o rastro pelo caminho
   canônico.
2. **Outros tenants seguem com o motor desligado.** `na-passada-eventos` e
   `trilhas-do-sul` têm `jurosAoMes: 0`; `ritmo-run-assessoria` tem `1.2`.
   `corrida-perfeita` e `passo-certo` **não têm** `commercialTerms/current`
   (sem termo, sem venda — RN-406). Fora do escopo desta lane; nada tocado.

## Verificação do dono

`https://leela-landing.web.app/meia-floripa-2026/inscricao` → inscrição 21k →
cartão de crédito: a lista de parcelas deve mostrar 12x de R$ 14,97 (total
R$ 179,64), e o PIX à vista continua R$ 150,00.

## Bloqueios

Nenhum. A credencial permitiu a escrita; o caminho alternativo (dono editando
em `/plataforma`) não foi necessário. ADC apagado ao encerrar.
