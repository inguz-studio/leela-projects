# Handoff · Lane E08-REPASSE · trace leela-build-2d6ee98d

- **Employee:** `sf-backend-lead` (software-forge)
- **Escopo:** posição 2 da fila (DEC-0728A) — repasse parcial na TELA (S705) e
  aviso ao afiliado (S706). RN-385 e RN-386. **Fechada nas cinco tarefas.**
- **Repo:** `C:\dev\LEELA`, branch `main`. **SEM push** — 5 commits locais.

## Achado que a lane herdou (SPECS-0728, confirmado por leitura)

`registrarRepasseComissaoCore` já aceitava `valor` parcial, com guarda de saldo
**dentro da mesma transação** que grava o ledger e incrementa
`comissaoRepassada`, e idempotência estrutural por `repasseId` (o id É o docId).
A F5 já provava teto, cent-exatidão e replay. Quem quitava o saldo inteiro era a
tela. **Nenhuma linha de contabilidade foi reescrita nesta lane.**

## Placar

| Task | Estado | Commit |
|---|---|---|
| `S705-T1` prova dos dois parciais consecutivos | ✅ | `1cd6274` |
| `S705-T2` campo de valor no modal ⚔ | ✅ | `3b063d4` |
| `S705-T3` extrato com uma linha por repasse | ✅ | `8be358b` |
| `S706-T1` gatilho e chave dos avisos ⚔ | ✅ | `444effc` |
| `S706-T2` textos no catálogo de templates | ✅ | `684501e` |
| Boards (épico → história → tarefa) | ✅ | commit `[LEELA-E08-BOARDS]` |

## Gates (comando + exit literal)

| Gate | Comando | Exit |
|---|---|---|
| core lint | `npm --prefix packages/core run lint` | 0 |
| core tsc | `npm --prefix packages/core run type-check` | 0 |
| core build | `npm --prefix packages/core run build` (tsup) | 0 |
| functions build | `npm --prefix functions run build` | 0 |
| functions lint | `npm --prefix functions run lint` | 0 |
| functions tsc | `npm --prefix functions run type-check` | 0 |
| painel tsc | `npm --prefix apps/painel run type-check` | 0 |
| painel lint | `npm --prefix apps/painel run lint` | 0 |
| painel · influenciadores + comunicação | `npx vitest run src/routes/clubes/influenciadores src/routes/eventos/comunicacao` | 0 · **68/68** |
| functions · suítes tocadas (emulador) | `npx firebase-tools@13 emulators:exec --only firestore,auth --project demo-leela "cd functions && npx vitest run src/__tests__/afiliados.integration.test.ts src/__tests__/marcoComissaoCore.test.ts src/__tests__/avisoAfiliadoTemplates.test.ts src/__tests__/comunicacoesLog.integration.test.ts src/__tests__/logComunicacaoCore.test.ts src/__tests__/emailIngressos.integration.test.ts"` | 0 · **141/141** |
| F5 INTACTA | dentro da corrida acima, `afiliados.integration` 33/33 (era 28) | ✅ |

Emulador exclusivo em 8080/9099, `--only firestore,auth` como o cabeçalho da
própria suíte manda. Preview do dono (5273/8180/3000) intocado; sem re-seed;
sem navegador; `BREVO_API_KEY`/`ASAAS_API_KEY` seguem vazias (a suíte de
afiliados apaga as duas no `beforeAll`; o e-mail entra por injeção).

## Decisões técnicas para a review antagonista (E08-REV)

1. **A chave da spec era impossível de gravar.** `repasse_{repasseId}` viola
   `CHAVE_LOG_COMUNICACAO_RE` (proíbe `_`, que é o separador do docId
   `{ref}_{chave}_{canal}`, e limita a 64; `REPASSE_ID_RE` aceita `_` e até 64).
   Sanear `_`→`-` colapsaria `a_b` e `a-b` na mesma chave e mataria o aviso do
   segundo repasse. Virou **digest sha256 do repasseId** (`repasse-{32 hex}`):
   determinístico, sempre válido, recomputável por quem tem o repasseId.
   **Custo declarado:** o docId do log não é mais legível de bate-pronto.
2. **`faixaCruzada` devolve a mesma faixa no recruzamento de propósito.** Quem
   cala o segundo e-mail é a chave `marco-100` que já existe no log. Não há
   campo "último marco avisado" no afiliado — seria contabilidade paralela.
3. **O replay do repasse também tenta avisar.** Pular no `duplicado` viraria
   silêncio permanente quando a primeira passagem morre entre a transação e o
   envio. No replay o valor do e-mail sai do **ledger**, não do input.
4. **`type="number"` foi trocado por `type="text"` no campo de valor.** Num
   campo de centavos controlado, `"700."` não é número válido, o `value` volta
   vazio e o campo se apaga quando a pessoa digita o separador.
5. **Handler de `onOpenChange` memoizado não é estética.** `useDialogBehavior`
   tem `onClose` nas dependências do efeito e devolve o foco ao botão de fechar
   toda vez que ele roda: com handler inline, só o primeiro caractere entrava.
6. **ConfirmModal não ganhou prop nova.** O bloqueio do valor inválido mora no
   consumidor + `errorMessage` do `Input` (aria-invalid + borda-danger +
   `role="alert"`), para não mexer em componente compartilhado por fluxos
   destrutivos de outras lanes.

## Riscos e pontas soltas

- **Falha PRÉ-EXISTENTE, fora do meu território:** `checkout2Modelo.integration`
  → `CK2-T5 ... PIX expira em 30 min` falha com
  `expected 'retardatario_pos_cancelamento' to be 'estado_ja_final'`. **Provado
  pré-existente**: reproduz no tree limpo do commit `8be358b`, sem nenhum código
  desta lane (`git stash push -u -- functions/src packages/core/src`). É o
  caminho do estorno órfão (item 27 · RN-379) — território da lane ESTORNO.
- `ultimosRepasses` é "últimos N" da projeção do reader, não o histórico
  completo. Se o histórico virar requisito, o corte está em `repassesDoAfiliado`.
- A chave de linha do extrato usa `criadoEmMillis+valor+observacao` (a projeção
  não expõe o id do repasse). Dois repasses idênticos no mesmo segundo com a
  mesma observação colidiriam como chave React. Não corrigi para não mexer no
  contrato do reader/api-client.
- Marco em pedido com várias inscrições cruzando **duas** faixas de uma vez está
  coberto por unit (`faixaCruzada`), não pelo caminho integrado.
- Entrega real de e-mail continua não provada nesta lane (chave vazia por
  disciplina). Depende do remetente de domínio próprio (item 12).

## Disciplina em vigor

- `git add` com caminho explícito, nunca `-A`. `git fetch` antes de cada commit;
  `HEAD..origin/main` = 0 nas cinco aterrissagens.
- `functions/src/email/templates.ts` recebeu ACRÉSCIMO no fim do arquivo; zero
  bloco existente tocado. `packages/core/src/comms/logComunicacao.ts` ganhou
  `afiliado` no enum de destinatário (acréscimo, mesmo precedente do
  `organizador` da S904-T3).
- Core tocado ⇒ `tsup` rodado antes da suíte do painel.
