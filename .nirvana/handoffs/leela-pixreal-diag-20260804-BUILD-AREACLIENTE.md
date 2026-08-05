---
trace: leela-pixreal-diag-20260804
lane: BUILD-AREACLIENTE
employee: sf-frontend-lead (software-forge)
territorio: apps/landing (+ packages/api-client)
---

# BUILD-AREACLIENTE — a área do cliente, o login da landing e o primeiro acesso

Fila canônica: `leela-specs/02-rodadas/2026-08-02-retomada/11-fila-contas-e-area-cliente.md`
(frentes B e C) + a reconciliação da Frente 2 de
`leela-specs/02-rodadas/2026-08-04-pos-pagamento/04-fila-codigo.md`.

## Ordem executada, e por que ela não é a da fila

A fila manda `S1221-T1 → B1 → B2 → …` e coloca a Frente C depois. A **BUILD-COD5A
estava em voo em `functions/` e `packages/core/src/pedidos/`** no início desta lane
(árvore suja em `functions/src/checkout/createInscricaoCharge.ts`,
`functions/src/__tests__/pedido.test.ts`, `packages/core/src/{index,eventos/inscrito,
pedidos/pedido}.ts`), e a regra de serialização por lane vale. Então a lane reordenou
DENTRO da fila: tudo que é `apps/landing` primeiro, `functions/` só se a outra lane
aterrissar.

## Estado por task

| Task | O quê | Estado | Commit |
|---|---|---|---|
| `S1221-T1` | O login vira overlay no meio da landing | ✅ | `20bd6874` |
| `C1 · S1223-T1` | `/definir-senha` na landing, com os três estados | ✅ | (abaixo) |

**A BUILD-COD5A aterrissou** em `3acc6877` no meio desta lane, o que liberou
`functions/`. A árvore tem, porém, trabalho de terceiro não versionado em
`functions/src/__tests__/codigoPedidoReserva.attack.test.ts` (review da COD5A, ao que
tudo indica) — todos os commits desta lane usam `--only`, arquivo a arquivo.

---

## `S1221-T1` — a entrada acontece na própria página

**O que mudou.** "Entrar" no header deixou de ser link para OUTRA origem
(`painelUrl('/entrar')`, o painel do organizador) e virou o botão que abre o overlay
de login da própria landing. Quem estava lendo a página de uma experiência entra e
continua exatamente onde estava. A landing não tinha autenticação nenhuma antes disto
— a varredura da spec por `signIn`/`useAuth`/`onAuthStateChanged` devolvia zero, e a
única sessão existente era a **anônima** do checkout.

**Arquivos**

- `packages/api-client/src/authMensagens.ts` (novo) — a copy honesta de erro de Auth e
  as validações de cliente, puras e sem SDK. Proveniência: cópia fiel de
  `apps/painel/src/routes/conta/auth/_lib/{authErrors,authValidation}.ts`, sem mudança
  de comportamento. Existe porque a regra ANTI-ENUMERAÇÃO não pode ter duas
  autoridades, e uma app não importa da outra.
- `packages/api-client/src/index.ts` — exporta o módulo novo.
- `apps/landing/lib/sessao.ts` (novo) — `useSessaoLeela()`. `nomeado` é campo próprio e
  **não** é `usuario !== null`: uid anônimo é sessão de verdade para o SDK e seria
  aceito por qualquer guarda escrita como "tem usuário?" (RN-451, 1ª linha).
- `apps/landing/app/components/EntrarOverlay.tsx` (novo) — o formulário, dentro do
  `Dialog` Radix-free do DS (ADR-017), o mesmo primitivo do regulamento e do kit.
- `apps/landing/app/components/ContaHeader.tsx` (novo) — o slot de conta: `Entrar` /
  conta + `Sair`. Único pedaço do header que atravessa o boundary de cliente.
- `apps/landing/app/components/PublicHeader.tsx` — troca o `<a>` pelo slot.
- `apps/landing/test/entrar-overlay-s1221.test.tsx` (novo) — 7 casos.
- `apps/landing/test/porta-organizador.test.tsx` — atualizado: o "Entrar" do header não
  é mais link, e o caso novo prova que ele não voltou a ser.

**Decisões que a review deve olhar**

1. **A porta do organizador não morreu, mudou de lugar.** O header mantém "Criar conta
   de organizador" → `painelUrl('/cadastrar')`; o rodapé mantém os DOIS caminhos sob a
   navegação "Organizador", incluindo `painelUrl('/entrar')`. O login é um só (mesmo
   Firebase Auth), então quem é organizador também entra pelo overlay — o botão para o
   painel a partir da área é a **B5**, que não está nesta entrega.
2. **Sem "esqueci minha senha" no overlay ainda.** Entra na C1, junto com a
   `/definir-senha` da landing, que é onde o reenvio neutro é especificado. Preferi não
   plantar um link morto agora.
3. **Estado de carregamento mostra "Entrar".** O `onAuthStateChanged` resolve async;
   esconder o slot até saber faria o header pular de largura em toda carga.

**Gates**

- `tsc --noEmit` (landing) — zero. `tsc --noEmit` (api-client) — zero.
  `tsc --noEmit` (painel, porque o barrel do api-client mudou) — zero.
- `eslint app lib --max-warnings 0` (landing) — zero.
- Suíte inteira da landing **2× seguidas**: `49 arquivos · 611 testes` verdes nas duas.
- Nenhum arquivo de `functions/`, `packages/core/` ou `firestore.rules` tocado.

**Achado da task (custo de gate).** O `PublicHeader` passou a puxar o barrel do DS pelo
slot de cliente, e o primeiro render de cada arquivo de teste passou a estourar o teto
default de 5 s do vitest **por import, não por comportamento**. Pior: um caso que
estoura pula o `cleanup` do RTL e contamina o seguinte com o DOM anterior — o sintoma
aparece como "found multiple elements", que parece defeito de componente. Os dois
arquivos passaram a declarar `vi.setConfig({ testTimeout: 20_000 })`, com a razão
escrita. É a mesma família do flake sob workers que o brief avisa.

---

## `C1 · S1223-T1` — o primeiro acesso termina onde o dono descreveu

**O que mudou.** Nasceu `/definir-senha` na landing. O comprador clica no link do
e-mail, define a senha e **já está dentro** — sem segundo login. Antes, o link caía no
handler hospedado do Firebase (e, depois da DEPLOY-EMAIL, no `/redefinir-senha` do
painel, onde a guarda de conta órfã derruba a sessão logo depois).

**Arquivos**

- `apps/landing/app/(public)/definir-senha/page.tsx` (novo) — Server Component fino:
  lê o `oobCode` da query, `noindex`, `force-dynamic`.
- `apps/landing/app/(public)/definir-senha/DefinirSenhaFlow.tsx` (novo) — os quatro
  estados. Consome os três seams que já existiam (`verificarCodigoResetSenha`,
  `confirmarResetSenha`, `loginComEmail`) e o `enviarResetSenha` para o reenvio.
  **Nenhum seam novo, nenhum token inventado.**
- `apps/landing/lib/areaDoCliente.ts` (novo) — ponto único de decisão do destino
  pós-entrada, com a trava `AREA_CLIENTE_NO_AR` que impede apontar para um 404
  enquanto a `S1222-T2` não existir.
- `apps/landing/app/robots.ts` — `disallow: /definir-senha`.
- `apps/landing/next.config.js` — `no-store` + `no-referrer` + `X-Robots-Tag` na rota.
- `functions/src/eventos/slug.ts` — `definir-senha` entra em `SLUGS_RESERVADOS`.
- `apps/landing/test/definir-senha-s1223.test.tsx` (novo) — 7 casos.

**Como se sabe que o link já foi usado (decisão que a review deve atacar).** O Firebase
não distingue "consumido" de "malformado": os dois voltam `auth/invalid-action-code`. A
RN-453 exige três estados distinguíveis. O sinal é **local**: ao confirmar com sucesso
gravamos uma marca do código neste navegador — um digest FNV-1a, nunca o `oobCode`, que
é credencial. Fora deste navegador o caso degrada para `invalido`, que também tem saída
(o reenvio). A marca é gravada **antes** do login: se o login falhar por rede o código
já foi consumido de verdade, e voltar para "link inválido" seria mentira. Há caso de
teste para exatamente isso.

**Destino pós-senha.** Onda 1 (esta entrega): confirmação "sua conta está pronta" com
CTA para a home. Quando a `S1222-T2` subir, `AREA_CLIENTE_NO_AR` vira `true` e as duas
jornadas (esta e a `S1225-T4`) passam a apontar para Meus Ingressos de uma vez só.

**Gates**

- `tsc --noEmit` (landing) — zero. `tsc --noEmit` (functions) — zero.
- `eslint app lib --max-warnings 0` (landing) — zero.
- Suíte inteira da landing **2× seguidas**: `50 arquivos · 618 testes` verdes nas duas.
- `functions`: rodado **só** `src/__tests__/slugReservado.test.ts` (7/7). A suíte
  completa de functions não foi executada, por gate do brief.
- `firestore.rules` intocado. Nenhuma Rule nova.

**O que esta task NÃO fez, de propósito.** A C2 (`actionCodeSettings` por origem) não
entrou aqui: a ordem da fila é inegociável e a C2 só sobe **depois** da C1 estar no ar.
Enquanto isso, o link continua caindo no painel — o comprador ainda não é mandado para
esta tela. A rota existe e está provada; falta o servidor apontar para ela.

## Para o maestro selar (não editei `leela-specs/`)

- **V1-KANBAN** · `S1221 · Login como overlay central da landing` → `S1221-T1` feito.
- **V1-CHECKLIST** · linha 823 (`S1221 · Login como overlay central da landing (E12/E00
  · item 57 b)`) → T1 entregue; a story só fecha com o resto da área.
- **`LEELA-E12-landing`** · registrar que a landing passou a ter sessão nomeada, o que
  desbloqueia a `S1222-T2` do lado do pré-requisito de login.
- **DECISOES-ABERTAS** · a entrada de 03/08 "o login no meio da landing" tem a metade
  construída.

## Pendência declarada (não é desta lane)

`apps/painel/src/routes/conta/auth/_lib/authErrors.ts` e `_lib/authValidation.ts` agora
DUPLICAM `@leela/api-client/authMensagens`. A convergência é um re-export de duas
linhas, mas o território é `apps/painel` e esta lane não o disputa. Fica registrado
para o maestro sequenciar junto da A1/A7, que já estão lá.
