# Lane KITCUPOM-REV · review antagonista do pacote KITCUPOM + código de dinheiro do PIXFIX

- **Trace:** leela-build-2d6ee98d · **Lane:** KITCUPOM-REV · **Data:** 2026-08-02/03 · **Rota:** opus
- **Reviewer:** sf-qa-engineer (software-forge), CONTEXTO FRESCO — você não participou da construção e não deve ler transcript nenhum de builder; seus insumos são artefatos em disco.
- **Repo:** `C:\dev\LEELA` (main, HEAD `4fe085b`) · **Handoff vivo:** `.nirvana/handoffs/leela-build-2d6ee98d-KITCUPOM-REV.md`
- **Território:** a árvore está LIVRE (nenhuma outra lane em voo). Fix-commits permitidos em qualquer território, sempre com teste de regressão junto, `git commit --only`, sufixo `[leela-build-2d6ee98d]`, SEM push.

## Alvo A — pacote KITCUPOM-BUILD (frentes A e B + X1)

Commits de código: `4809d5b`, `637dd92`, `d63b703`, `fd1c6f2` (frente A · galeria) e
`ae7538f`, `ddb635d`, `2651bb4`, `ac92f33`, `e4b2e3d` (frente B · link/cupom + X1).

Autoridade de aceite:
- `leela-specs/02-rodadas/2026-07-29-checkout-ux/02-spec-kitcupom.md` (D-KC-1..12)
- `.../03-rns-kitcupom.md` (RN-425..433)
- `.../04-fila-kitcupom.md` — os **12 vetores ⚔** nomeados para a REV. O builder alega 7
  já medidos por teste (7, 8, 9, 11, 12 + kernel e Rules por diff): re-verifique
  INDEPENDENTE; os restantes exigem **falsificação ativa** (ex.: abrir o gate da RN-315
  e provar que a asserção morde; afrouxar uma Rule e ver o teste morrer; teto de 3 fotos
  atacado pelo Storage).
- Handoff do builder (artefato, não transcript): `.nirvana/handoffs/leela-build-2d6ee98d-KITCUPOM-BUILD.md`
  — desafie as premissas assumidas (4 da frente A + as 18 da frente B listadas lá).

## Alvo B — código de dinheiro do PIXFIX-EXTREF

Commits: `34ed0e7` (formato digest do externalReference), `3e056ec` (guarda >100),
`7b5ba3e` (tradução AsaasError→HttpsError). Diagnóstico de origem:
`.nirvana/outputs/leela-build-2d6ee98d/INV-PIXINTERNAL-REPORT.md`. Handoff:
`.nirvana/handoffs/leela-build-2d6ee98d-PIXFIX-EXTREF.md`.

Vetores mínimos: idempotência sobrevive ao digest? (mesma chave ⇒ mesmo digest ⇒ mesma
cobrança; chaves distintas não colidem); o webhook continua resolvendo `orderId` com
formato velho E novo? (produção não tem dado velho, mas o parser não pode explodir);
a guarda recusa ANTES do POST; nenhum caminho re-imprime "internal" (falsifique com um
erro 5xx sintético); o `err.message` cru com uid fica SÓ no log.

## Alvo C — defeito pré-existente apontado pelo builder (decida você)

No step 0, "Remover" cupom não re-cota — o `CupomCampo` segue exibindo "Cupom X aplicado"
com base na cotação velha (vale também para `?cupom=` da URL; território de dinheiro,
herdado da S1209). Avalie gravidade com a jornada real: se for defeito de dinheiro
exibido, FIX-COMMIT nesta lane com teste; se for cosmético de rótulo, registre com
reprodução exata e severidade no handoff para a fila ACHADOS-0802.

## Contrato

1. Por vetor: veredito PASS/FAIL com prova executada (comando + números), não opinião.
2. Defeito real confirmado ⇒ fix-commit + teste de regressão na mesma lane (padrão
   CKUX-REV). Defeito de spec/desenho ⇒ registrado com reprodução, sem fix.
3. Premissas dos builders: endosse ou marque VETO-DONO com uma linha de consequência.
4. Gate final: suíte CHEIA da landing e do painel + `tsc`/`eslint` das 4 superfícies +
   functions dirigidas no emulador. Números no handoff.
5. Handoff vivo atualizado por bloco (A, B, C); commit por bloco.
6. O dono dorme: nada bloqueia em pergunta — registre e siga.
