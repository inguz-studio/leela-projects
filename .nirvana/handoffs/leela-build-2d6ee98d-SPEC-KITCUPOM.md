# Handoff · Lane SPEC-KITCUPOM · trace leela-build-2d6ee98d

- **Employee:** `sf-cto` (software-forge) · DNA Fowler / DHH / Kleppmann
- **Escopo:** MINI-SPEC de duas features da DEC-0729 — galeria do kit (D-0729-4) e cupom
  pré-aplicado por link (D-0729-5). **Zero código de aplicação.**
- **Território:** `leela-specs/**` + este handoff. Nada fora disso.
- **Repo:** `C:\dev\LEELA`, branch `main`. Commits `[LEELA-SPEC-KITCUPOM]`. **SEM push** (o maestro pusha).
- **Painel `DECISOES-ABERTAS.md`:** intocado (é do maestro).
- **Suítes e emulador:** não rodados (contrato da lane — outra lane pode deter a máquina).

## Placar

| # | Task | Estado | Commit |
|---|---|---|---|
| T0 | Inventário + abertura do handoff | ✅ | `a1984f9` |
| T1 | Rodada · decisões e premissas (`02-spec-kitcupom.md`) | ✅ | `e268cd0` |
| T2 | Rodada · RNs (`03-rns-kitcupom.md`) | ✅ | `e450adb` |
| T3 | Stories nos épicos (E03 galeria, E12 cupom) + deltas de fronteira | ✅ | (este) |
| T4 | Fila de código com ⚔ + boards | ⏳ | — |
| T5 | Selo · resumo executivo + self-score | ⏳ | — |

## Inventário antes de especificar (reaproveitado vs criado)

Feito ANTES de qualquer proposta, lendo os arquivos — não por memória.

### Galeria do kit · já existe e a spec REUSA

| Peça | Onde | O que a spec aproveita |
|---|---|---|
| Modelo do kit com visão de compra | `packages/core/src/eventos/kit.ts` (RN-227/RN-230) | `imagemUrl?`, `isUrlImagemKitValida` (delega em `isUrlCapaValida`), `normalizarItensKit` como PADRÃO Postel de campo decorativo, tetos `KIT_*_MAX` |
| Upload real de imagem de kit | `packages/api-client/src/storage.ts` (`uploadImagemKit`) + `apps/painel/.../kits/KitEditor.tsx` | O fluxo de upload, a semântica `undefined`=não tocado / `null`=removido no payload do `salvarKit`, o `FileInput` do DS e a prévia |
| Rules de Storage do kit | `storage.rules` §`eventos/{eventoId}/kits/{kitId}` | `kitObjetoValido`, `eventoDoMeuTenant` (cross-service `firestore.get`, fail-closed), `imagemValida()`, e a propriedade "nome de objeto fixo ⇒ re-upload sobrescreve, zero órfão" |
| Cascata de imagem nas superfícies públicas | `apps/landing/lib/kitImagem.ts` + `app/components/KitImagem.tsx` | Os três níveis (real → mock de PREVIEW → placeholder Leela em produção) e os assets locais `KITS_MOCK` |
| Detalhe do kit no checkout | `apps/landing/.../checkout/KitDetalhe.tsx` + `kitDetalheDados.ts` | Já consome `KitPublico.imagemUrl` e já tem lightbox (`test/kit-imagem-lightbox.test.tsx`) |
| Listagens públicas do kit | `sections/KitsSection.tsx`, `checkout/StepModalidadeKit.tsx` | Leem `imagemUrl` — permanecem intocadas pela decisão de shape |
| Primitivo de miniatura | `packages/design-system/src/components/Thumb` (exportado no `index.ts`) | As miniaturas da galeria; **nenhum componente novo de DS** |
| Padrão de galeria | `sections/GaleriaSection.tsx` | O formato visual (grid, `figure`, lazy, dimensão intrínseca) e a lição "mock é app-side, rotulado como exemplo" |

### Cupom por link · já existe e a spec REUSA

| Peça | Onde | O que a spec aproveita |
|---|---|---|
| **Auto-apply do cupom da URL** | `apps/landing/.../checkout/CheckoutFlow.tsx` (efeito A-2, `cupomUrlPendente`/`erroCupomUrl`) | **Já existe e funciona.** A spec não recria: consolida e alimenta |
| Campo de cupom do step 0 | `checkout/CupomCampo.tsx` (S1209 · D-4) | O componente único; o estado "Cupom X aplicado — menos R$ Y"; a lógica fica no `CheckoutFlow` |
| Propagação da atribuição no CTA | `[eventSlug]/CtaInscricao.tsx` + `ctaStyles.ts` (`ATRIBUICAO_KEYS`) | O CTA já copia `cupom`/`ref`/`utm_*` da página para o checkout |
| Captura e persistência do `?ref=` | `[eventSlug]/RefTracker.tsx` | A disciplina inteira: normalização, primeiro-clique-vence para o mesmo código, last-click-wins para código diferente, claim do cliente, storage indisponível degrada |
| **Kernel de atribuição** | `functions/src/checkout/createInscricaoCharge.ts` §"Atribuição de afiliado" (RN-313/315) | Precedência `cupom de afiliado > ?ref=`, `origem: 'cupom'\|'ref'`, clamp do `clicadoEmMillis`, `dentroDaJanelaAtribuicao`, gate `descontoAfiliadoAtivo`, re-checagem na confirmação. **Nada disso muda** |
| Cotação pública | `functions/src/checkout/cotarInscricaoCheckout.ts` | Autoridade do número; anônima com login anônimo; já é a fronteira que diz se o cupom cola |
| Modelo do cupom | `packages/core/src/eventos/cupom.ts` | `normalizarCodigoCupom`, `CODIGO_CUPOM_RE`, `cupomVigente`, `descontoDoCupom`, escopo `club_parceiro` (E18) |
| Modelo do afiliado e da parceria | `packages/core/src/affiliation/afiliado.ts`, `packages/core/src/clubs/parceria.ts` | `refCodigo` (docId), `cupomCodigo`, `janelaAtribuicaoDias`, `linkMaster` espelhado, `dentroDaJanelaAtribuicao` |
| Leitura server-side da landing | `apps/landing/lib/leitor.ts` + `lib/firebaseAdmin.ts` | O padrão "Admin SDK no servidor, gate no código, Rules intocadas" (doutrina desde a S1200-T2) |
| Base pública única | RN-423 (SPEC-INGPAGE → INGPAGE-BUILD) | O link do afiliado passa a nascer da MESMA base; `beh.ro` morre em mais um lugar |
| Cupons de demonstração | `functions/scripts/preview-seed-clubes.ts` (`FLORIPARUN10` afiliado, `RITMOFORTE10` assessoria) | Os dois cupons do meia-floripa já existem — a demonstração é de LINK, não de cupom novo |

### Criado por esta spec (o que não existia)

- Campo `fotosSecundarias[]` no `Kit` e o acessor canônico de galeria, mais o pareamento
  "promover a principal" como função pura.
- Dois slots fixos de Storage por kit para a 2ª e a 3ª foto.
- Galeria no detalhe do kit (principal + miniaturas) e três slots no `KitEditor`.
- Geração do link de afiliado/assessoria com cupom embutido (hoje `linkMaster` é texto livre).
- Persistência do cupom do link pela jornada, em simetria com o `?ref=`.
- Banner pós-Hero e a verificação server-side que o alimenta.
- Marca "(desconto aplicado)" na linha de desconto do resumo.

### Achados do inventário (entram na spec, não são opinião)

1. **O auto-apply de cupom por URL JÁ EXISTE** no `CheckoutFlow` (efeito A-2). O pedido do dono
   não é uma máquina nova: é o link do afiliado que nunca carregou o cupom, mais a comunicação
   (banner e marca no valor). Especificar isso como feature nova seria reconstruir o que roda.
2. **`?c=` é chave morta.** `ATRIBUICAO_KEYS` preserva `'c'` do primeiro clique até o checkout, e
   **nenhum arquivo do repo lê `'c'`**. O seed grava `parceria.linkMaster = 'beh.ro/mfl26?c=frc'`.
   Logo o "link master" da assessoria hoje entrega **nada**: nem cupom, nem atribuição — e ainda
   aponta para `beh.ro`, o domínio dos mocks Be Hero que a RN-423 acabou de expulsar do e-mail.
3. **A pergunta "quem ganha a comissão" já tem resposta no código**, e ela não é neutra: cupom de
   afiliado vence `?ref=` (`origem: 'cupom'`), e quando o cupom aplicado é de OUTRO afiliado o
   `clicadoEmMillis` do clique original é descartado (vira `agora`). Um cupom manual digitado por
   cima do link rouba a comissão do dono do link. Isso é comportamento VIGENTE — a spec ratifica
   e escreve, não inventa regra nova.
4. **O seed não pode "simular 3 fotos" como o pedido sugere.** A guarda `isUrlImagemKitValida`
   exige http(s), e a lição LEELA-R14 (`preview-seed-r14.ts`: "NÃO seedamos `imagemUrl` — a
   landing resolve app-side") é explícita. Seedar URL absoluta amarraria a porta do preview.
   A simulação tem de ser app-side, na cascata que já existe.
5. **A leitura de cupom é fechada por design.** `firestore.rules` restringe cupom ao organizador
   ("enumerar cupons = vazar descontos"). O banner, portanto, não pode ler cupom no cliente — e
   quem já responde a anônimo hoje é a `cotarInscricaoCheckout`.
6. **Nada no repo valida 1:1 de imagem.** `isUrlImagemKitValida` só olha a URL, e as Rules
   registram a limitação ("Rules não decodificam imagem"). O "1:1" da RN-227 é dica de painel e
   enquadramento de CSS. A spec não pode fingir que existe validação de proporção.
7. **O bucket de Storage não existe no ambiente online** (handoff DEPLOY-PREVIEW, pendência 3 do
   dono). Isso já bloqueia a PRIMEIRA foto; a 2ª e a 3ª herdam a mesma pendência — a galeria não
   cria dependência nova.

## Premissas assumidas

Tabela completa e vetável em `leela-specs/02-rodadas/2026-07-29-checkout-ux/02-spec-kitcupom.md`
(P1..P12, maior peso primeiro). As quatro que mudam desenho se o dono vetar:

- **P1** — a principal continua no campo `imagemUrl`; as outras duas vão num campo separado
  (`fotosSecundarias[]`). Não existe `fotos[]` unificado nem sinalizador de principal.
- **P2** — a comissão do desempate segue o que o código já faz: cupom manual de outro afiliado
  rouba a atribuição do link.
- **P3** — o nome da pessoa física afiliada aparece no banner público de quem tiver o código.
- **P4** — o banner some quando o cupom não se aplica, em vez de avisar na landing.

## Pontos ⚔ declarados para a review antagonista do build

Ver `04-fila-kitcupom.md` da rodada.

## Disciplina em vigor

- `git commit --only <arquivos>` sempre; nunca `git add` amplo (outras lanes trabalham no repo).
- Épicos compartilhados: só ACRESCENTAR seção; edição cirúrgica apenas no ponteiro que evitaria
  contradição no canônico.
- `DECISOES-ABERTAS.md` intocado.
