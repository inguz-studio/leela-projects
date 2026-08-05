# BUILD-SUPRIMIR-TOOLBAR — a barra superior saiu do painel inteiro

- **Lane:** BUILD-SUPRIMIR-TOOLBAR
- **Trace:** leela-pixreal-diag-20260804
- **Employee:** sf-frontend-lead (software-forge)
- **Repo:** C:\dev\LEELA · branch `main`
- **Commit:** `2332bebb` — `refactor(painel): suprime a barra superior do shell (Adendo 13)`

## A ordem

> "reparei que a barra superior onde fica um um botao de duvida e outro de alerta, nao está tendo utilidade, podemos suprimir esse componente de headbar do sistema inteiro."

Executada como escrita: a barra saiu, não só os botões.

## O que mudou

`apps/painel/src/shell/RootShell.tsx` — saíram o `<Toolbar>`, o wrapper que existia
só para hospedá-lo, a condicional `produtor` que o ligava e os imports órfãos
(`Toolbar`, `IconButton`, `Bell`, `CircleHelp`). A área principal virou uma linha:

```tsx
<div className="flex flex-col flex-1 overflow-y-auto">{children}</div>
```

O `RootShell` é o layout raiz de **todas** as rotas do painel (`App.tsx`, rota
`/*`), então "do sistema inteiro" acontece num arquivo só.

### Varredura — quem mais renderizava a barra

Nenhuma tela. Varri `apps/`, `packages/`, `e2e/` e o showcase do DS:

| Onde | Ocorrências de `Toolbar` |
|---|---|
| `apps/painel/src` | só o `RootShell` (removido) |
| `apps/landing`, `apps/mobile` | 0 |
| `e2e/` | 0 |
| `packages/design-system/showcase/src` | 0 |
| `packages/design-system/src` | o próprio componente + stories/docs/teste |

`CircleHelp`, `HelpCircle` e `<Bell` também não aparecem em nenhum outro app —
os dois stubs existiam apenas ali. Não houve nada fora do shell para parar e
perguntar.

## O ponto de atenção: o que a remoção fez com o espaçamento

**Horizontal: zero mudança, e isso é verificável.** O wrapper removido carregava
`px-[var(--layout-page-px)]` (40px), mas era **irmão** de `{children}`, não pai.
O padding lateral das telas sempre veio de cada página (`PageHeader` traz
`px-[var(--spacing-6)]` = 24px; os contêineres de conteúdo repetem os mesmos
24px). Nenhuma tela dependia do wrapper para largura.

**Vertical: sai o bloco acima do primeiro elemento da página.** Soma removida:

| Peça | Desktop (lg+) | Mobile (<lg, toolbar empilhava) |
|---|---|---|
| `pt-[var(--layout-page-pt)]` do wrapper | 32px | 32px |
| altura da toolbar (`--iconbtn-size` 36) | 36px | 48px (linha vazia do slot `start` + `--toolbar-gap`) |
| `pb-[var(--layout-toolbar-pb)]` | 16px | 16px |
| hairline `border-b` | 1px | 1px |
| `mb-[var(--toolbar-mb)]` | 4px | 4px |
| **total** | **89px** | **101px** |

**Por que não recompus esse espaço com um `pt` na moldura.** As rotas de
`/plataforma` **nunca** tiveram a toolbar e já entregam o `PageHeader` rente ao
topo do contêiner de rolagem — é o padrão em produção hoje, numa área inteira do
produto. O `PageHeader` do DS tem `min-h-[var(--header-height)]` (96px) com
`items-center`: o título fica centrado nessa faixa, o que já dá ~18px de respiro
acima dele sem nenhum padding externo. Suprimir a barra deixa o produtor
**igual** a esse padrão, em vez de recriar uma barra invisível para segurar
espaço. Telas que trazem respiro próprio seguem intactas (`EventoShell` abre com
`pt-[var(--spacing-5)]` no breadcrumb).

Evidência adicional de que a moldura já não era a dona do espaçamento: dos seis
tokens do frame `.main` do mockup, **quatro já estavam órfãos antes desta lane**
(`--layout-page-pb`, `--layout-main-gap`, `--layout-stack-gap`,
`--layout-section-gap`, todos com 0 consumidores). O wrapper da toolbar era o
último consumidor de `--layout-page-pt` e `--layout-page-px` — e aplicava 40px
laterais numa tela cujas páginas usam 24px, drift que a barra escondia.

### Rotas afetadas (todas do produtor)

Perdem os 89px de topo: `/` (Visão Geral) · `/eventos` e sub-rotas
(`/eventos/:slug/*`) · `/clubes` e sub-rotas · `/crm` e sub-rotas · `/marcas` ·
`/conta` · rotas legadas. **Sem mudança:** `/plataforma/*` (já não tinha a
barra), `/entrar`, `/cadastrar`, `/recuperar-senha`, `/redefinir-senha` (fora do
shell, no `AuthLayout`).

## Testes que viraram canário

`apps/painel/src/shell/__tests__/RootShell.test.tsx` — o bloco
`RootShell (T3 — toolbar global)` afirmava a **presença** da barra e dos dois
botões. Virou `RootShell (Adendo 13 — sem barra superior)`, afirmando a
**ausência**: qualquer remontagem da headbar sem decisão nova quebra a suíte.

| Caso | O que trava |
|---|---|
| `rotas do produtor NÃO montam barra superior alguma` | `queryByRole('toolbar')` nulo em `/` |
| `os stubs Ajuda e Notificações saíram do shell` | os dois `aria-label` e o pip |
| `busca do header segue suprimida (Adendo 12)` | nenhum `searchbox` volta pelo shell |
| `"Novo evento" não volta pelo shell` | o CTA continua morando em `/eventos` |
| `/plataforma segue sem barra superior` | o super-admin não herda a barra |
| `o conteúdo da rota é o PRIMEIRO filho da área de rolagem` | nada se insere acima da página |

Também corrigi prosa velha que ainda mandava o leitor para a barra:
`Countdown.tsx` (comentário) e o nome do caso em `Countdown.test.tsx` — o "Novo
evento" saíra da toolbar no Adendo 12 e o texto nunca foi atualizado.

## Dívida no DS — reportada, não executada

**Não deletei nada do design system.** Apagar primitivo é decisão de outra
alçada.

| Componente | Consumidores fora do DS | Recomendação |
|---|---|---|
| `Toolbar` | **0** (apps 0 · showcase 0 · e2e 0) | **Deprecar, não deletar agora.** Marcar `@deprecated` no `Toolbar.tsx` com data e motivo (Adendo 13), manter export, stories e docs. Se em uma janela de revisão do DS nenhum consumidor aparecer, aí sim remover junto com o bloco `toolbar` de `tokens/component.json` e o `--layout-toolbar-pb`. Motivo de não deletar já: o DS é publicado como pacote e o showcase o documenta; o custo de manter um layout puro de 30 linhas é quase zero, o de quebrar um consumidor externo não. |
| `IconButton` | **11** (8 telas do painel + 3 componentes internos do DS, incl. o hambúrguer do `AppShell`) | Fica. Sem ação. |
| `SearchInput` | **12 telas do painel** (clubes, CRM, eventos, marcas, afiliados, atendimento…) | Fica. Sem ação. |

Tokens que ficaram sem consumidor com esta lane: `--layout-page-pt` e
`--layout-page-px`. Juntam-se aos quatro do frame `.main` que já estavam órfãos.
**Recomendação:** não remover isoladamente — vale uma varredura própria dos
tokens `layout.*`, decidindo se o frame do mockup volta a ser aplicado na moldura
(e as páginas param de repetir `px-6`) ou se o bloco sai do `component.json`. É
decisão de arquitetura de layout, não subproduto desta remoção.

## Gates

```
$ tsc --noEmit            (apps/painel)   EXIT=0
$ eslint src --max-warnings 0             EXIT=0

$ vitest run src/shell src/routes/overview
  Test Files  18 passed (18)
       Tests  169 passed (169)

$ vitest run src/routes/__tests__ src/routes/eventos/hub \
             src/routes/plataforma/tenants src/routes/crm src/routes/marcas
  Test Files  19 passed (19)
       Tests  223 passed (223)
```

Amostra escolhida: os arquivos tocados, a vizinhança do shell (`src/shell/**`) e
rotas que herdam o layout nas quatro áreas do produtor + uma de `/plataforma`
(controle: a área que **não** deveria mudar). Sem `--singleFork`. Não toquei em
nada que dependa do DS buildado, então não houve `tsup`.

**Sem deploy** — o maestro sequencia.

## Conferência visual do dono

Roda o painel e olha o **topo** destas telas — o que mudou é só isso:

1. `/` (Visão Geral) — a barra sumiu; a saudação "Visão Geral" agora é a
   primeira coisa da área de conteúdo.
2. `/eventos` — o header "Eventos" com o botão "+ Novo evento" subiu ~89px.
   Confirma que criar evento continua fácil de achar sem a barra.
3. `/eventos/{um-evento}/inscritos` — tela interna: o breadcrumb subiu, mas
   mantém o respiro próprio de 20px.
4. `/clubes`, `/crm`, `/marcas` — mesmo efeito de topo.
5. `/conta` — configurações da conta.
6. `/plataforma/tenants` — **controle**: tem de estar idêntico ao de antes.
   Se mudou alguma coisa aí, me avisa.
7. Uma tela em janela estreita (< 1024px) — o hambúrguer do menu mobile continua
   na barrinha do `AppShell` e **não** foi afetado; ele nunca esteve na toolbar.

A pergunta que quero de volta: **o topo ficou apertado?** Se ficou, o conserto é
uma linha na moldura (`pt` por token no contêiner de rolagem), mas ela também
mexe em `/plataforma` e soma ao respiro próprio do `EventoShell` — por isso não
apliquei sem tua palavra.
