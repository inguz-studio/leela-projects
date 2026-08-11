// =============================================================================
// GATE ANTI-REGRESSÃO DA NAVEGAÇÃO DE SPA (LEELA-NAVFIX-T3).
//
// Este arquivo É a condição da task. A tabela abaixo lista TODAS as superfícies
// de navegação interna do painel, e a regra é uma só:
//
//   toda âncora renderizada por uma superfície de navegação tem de CANCELAR o
//   default no clique simples.
//
// `defaultPrevented === false` num `<a href>` significa uma coisa e só uma: o
// navegador vai fazer navegação de DOCUMENTO. O app reinicia — `main.tsx` roda
// de novo, o QueryClient evapora, a sessão do Firebase volta a ser restaurada do
// IndexedDB e a tela pinta o esqueleto inteiro. É o "parece que entrei num site
// novo" (PAINEL-NAV-DIAG-REPORT). Reintroduzir `href` sem `onClick` em qualquer
// linha desta tabela quebra aqui, não em produção.
//
// Mesma disciplina do `RotasLegadas.test.tsx`: a tabela é o contrato, não a boa
// intenção. `ancoras` é contagem EXATA de propósito — sem ela, uma superfície
// que parasse de renderizar links passaria no laço por vacuidade.
// =============================================================================

import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';

import { EventoShell } from '../eventos/evento/EventoShell';
import { ClubeShell } from '../clubes/clube/ClubeShell';
import { ClubesAreaLayout } from '../clubes/ClubesAreaLayout';
import { ParceriasAreaLayout } from '../parcerias/ParceriasAreaLayout';
import { AfiliacoesLayout } from '../parcerias/afiliacoes/AfiliacoesLayout';
import { KitsLayout } from '../eventos/kits/KitsLayout';
import { KitEditor } from '../eventos/kits/KitEditor';
import { FinanceiroLayout } from '../eventos/financeiro/FinanceiroLayout';
import { ConfiguracoesLayout } from '../eventos/configuracoes/ConfiguracoesLayout';
import { CrmSubNav } from '../crm/_components/CrmSubNav';
import { EventosHubSubNav } from '../eventos/EventosHubLayout';
import { RootShell } from '../../shell/RootShell';
import { mkEvento } from '../eventos/_test/fixtures';
import { mkClube } from '../clubes/_test/fixtures';
import { clicarNoDom } from '../../test/clique';
import { nomeAcessivel } from '../../test/nomeAcessivel';
import type { EventoOutletContext } from '../eventos/evento/EventoLayout';

// Sessão + claims sem Firebase (mesma dublagem de RootShell.test.tsx); o
// `uploadImagemKit` entra porque o KitEditor importa o api-client.
vi.mock('@leela/api-client', () => ({
  onSessionChange: (cb: (user: { uid: string; displayName: string | null } | null) => void) => {
    cb({ uid: 'uid-marina', displayName: 'Marina Castelo' });
    return () => {};
  },
  getClaims: () => Promise.resolve({ tenantId: 'castelo', role: 'tenant_admin' }),
  getLeelaDb: () => ({}),
  listarEventosDoOrganizador: () => Promise.resolve([]),
  uploadImagemKit: vi.fn(),
}));

// O papel decide QUAIS sub-abas de Configurações aparecem; organizador vê todas.
vi.mock('../eventos/_data/papelEvento', () => ({
  usePapelEvento: () => ({ papel: 'organizador', loading: false }),
}));

const SLUG = 'meia-floripa-2026';
const EVENTO = mkEvento();

/**
 * Sonda de rota — LEELA-NAVFIX-REV.
 *
 * O gate original media só `defaultPrevented`, que prova a METADE do contrato:
 * que a aba parou de recarregar o documento. Um handler que só chamasse
 * `preventDefault()` e nunca navegasse passaria verde com a aba MORTA. A sonda
 * fecha a outra metade: depois do clique, a rota do router tem de ser o `href`
 * da própria âncora.
 */
function Sonda(): JSX.Element {
  const { pathname } = useLocation();
  return <div data-testid="rota-gate">{pathname}</div>;
}

/** Provedor de Outlet context para as cascas terciárias do evento. */
function ComContextoDoEvento({ ctx }: { ctx: EventoOutletContext }): JSX.Element {
  return <Outlet context={ctx} />;
}

/**
 * Monta uma casca terciária do evento sob o Outlet context que ela espera.
 *
 * A rota é `*` de propósito: o laço do gate CLICA em todas as âncoras, e uma
 * delas sai da própria seção (a aba "Entrega" de Kits aponta para
 * `/eventos/{slug}/entrega`). Com um padrão estreito, esse clique desmontaria a
 * casca e os cliques seguintes falhariam por ordem da tabela, não por defeito.
 * Nenhuma dessas cascas lê `useParams` — o slug vem do context.
 */
function montarSobContexto(rota: string, elemento: JSX.Element): void {
  render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route element={<ComContextoDoEvento ctx={{ evento: EVENTO }} />}>
          <Route path="*" element={elemento} />
        </Route>
      </Routes>
      <Sonda />
    </MemoryRouter>,
  );
}

interface SuperficieNav {
  /** Nome que aparece no relatório do teste. */
  nome: string;
  /** `aria-label` do landmark de navegação que delimita a superfície. */
  landmark: string;
  /** Quantas âncoras a superfície renderiza. Contagem EXATA. */
  ancoras: number;
  /**
   * Texto do ÚNICO elemento com `aria-current="page"` dentro do landmark
   * (LEELA-NAVFIX-REV). É a asserção que este tipo de mudança regride calada:
   * a fiação copia a aba com spread, e basta alguém montar o objeto novo em vez
   * de espalhá-lo para o marcador de "onde estou" sumir sem nenhum teste cair.
   * Nos breadcrumbs o marcador está no `<span>` da página atual, não num link —
   * por isso a busca é por atributo, não por role.
   */
  atual: string;
  /**
   * `<button>` que a superfície pode conter por NÃO ser destino de navegação
   * (LEELA-DEBT-T4). A lista é a exceção declarada, NOME ACESSÍVEL por nome
   * acessível (HIFI-REC-FIX — o rail duplica rótulo no textContent via
   * sr-only+tooltip; o nome acessível é o que a AT anuncia e é imune a isso):
   * quem acrescentar um botão aqui está afirmando que ele abre um menu ou
   * dispara uma ação, e não que leva a uma rota. Destino em `<button>` é o
   * defeito que este arquivo existe para pegar — a pessoa não consegue abrir
   * em nova aba nem copiar o endereço.
   */
  botoesQueNaoSaoDestino?: string[];
  montar: () => void;
}

const SUPERFICIES: SuperficieNav[] = [
  {
    nome: 'abas do evento',
    landmark: 'Seções do evento',
    ancoras: 10,
    atual: 'Visão geral',
    montar: () =>
      void render(
        <MemoryRouter initialEntries={[`/eventos/${SLUG}`]}>
          <EventoShell evento={EVENTO} ativa="overview">
            <p>c</p>
          </EventoShell>
          <Sonda />
        </MemoryRouter>,
      ),
  },
  {
    nome: 'breadcrumb do evento',
    landmark: 'Breadcrumb',
    ancoras: 1,
    atual: EVENTO.nome,
    montar: () =>
      void render(
        <MemoryRouter initialEntries={[`/eventos/${SLUG}`]}>
          <EventoShell evento={EVENTO} ativa="overview">
            <p>c</p>
          </EventoShell>
          <Sonda />
        </MemoryRouter>,
      ),
  },
  // ---------------------------------------------------------------------------
  // D-1008-R16/R17 — as MOLDURAS de área (layout routes donos do menu
  // secundário). Montam-se sozinhas: derivam a aba ativa do pathname e não
  // leem dado nenhum. Clicar numa aba re-deriva a ativa — a sonda prova a ida.
  // ---------------------------------------------------------------------------
  {
    nome: 'menu da área de clubs',
    landmark: 'Seções de clubs',
    ancoras: 2,
    atual: 'Clubs',
    montar: () =>
      void render(
        <MemoryRouter initialEntries={['/clubes']}>
          <Routes>
            <Route element={<ClubesAreaLayout />}>
              <Route path="*" element={<p>c</p>} />
            </Route>
          </Routes>
          <Sonda />
        </MemoryRouter>,
      ),
  },
  {
    nome: 'menu da área de Parcerias',
    landmark: 'Seções de Parcerias',
    ancoras: 3,
    atual: 'Marcas',
    montar: () =>
      void render(
        <MemoryRouter initialEntries={['/parcerias']}>
          <Routes>
            <Route element={<ParceriasAreaLayout />}>
              <Route path="*" element={<p>c</p>} />
            </Route>
          </Routes>
          <Sonda />
        </MemoryRouter>,
      ),
  },
  {
    nome: 'sub-abas de Afiliações',
    landmark: 'Seções de afiliações',
    ancoras: 2,
    atual: 'Influenciadores',
    montar: () =>
      void render(
        <MemoryRouter initialEntries={['/parcerias/afiliacoes']}>
          <Routes>
            <Route element={<AfiliacoesLayout />}>
              <Route path="*" element={<p>c</p>} />
            </Route>
          </Routes>
          <Sonda />
        </MemoryRouter>,
      ),
  },
  {
    nome: 'abas do club',
    landmark: 'Seções do club',
    ancoras: 6,
    atual: 'Overview',
    montar: () =>
      void render(
        <MemoryRouter initialEntries={['/clubes/corrida-perfeita-sul']}>
          <ClubeShell clube={mkClube()} ativa="overview" onCopiarCodigo={() => {}}>
            <p>c</p>
          </ClubeShell>
          <Sonda />
        </MemoryRouter>,
      ),
  },
  {
    nome: 'sub-abas de Kits',
    landmark: 'Seções de kits',
    ancoras: 4,
    atual: 'Cadastro',
    montar: () =>
      montarSobContexto(`/eventos/${SLUG}/kits`, <KitsLayout />),
  },
  {
    nome: 'sub-abas do Financeiro',
    landmark: 'Seções do financeiro',
    ancoras: 2,
    atual: 'Caixa',
    montar: () =>
      montarSobContexto(`/eventos/${SLUG}/financeiro`, <FinanceiroLayout />),
  },
  {
    nome: 'sub-abas de Configurações',
    landmark: 'Seções de configurações',
    ancoras: 4,
    atual: 'Geral',
    montar: () =>
      montarSobContexto(`/eventos/${SLUG}/configuracoes`, <ConfiguracoesLayout />),
  },
  {
    nome: 'breadcrumb do editor de kit',
    landmark: 'Breadcrumb',
    // 5 níveis, o último é a página atual (span, não link) → 4 âncoras.
    ancoras: 4,
    atual: 'Novo kit',
    montar: () =>
      void render(
        <MemoryRouter initialEntries={[`/eventos/${SLUG}/kits/novo`]}>
          <ToastProvider>
            <KitEditor
              evento={EVENTO}
              kit={null}
              itens={[]}
              onSalvarKit={vi.fn()}
              onSalvarItem={vi.fn()}
              onConcluir={vi.fn()}
            />
          </ToastProvider>
          <Sonda />
        </MemoryRouter>,
      ),
  },
  {
    // O defeito ESPELHADO (H7 do diagnóstico): o menu navegava por onClick mas
    // não era link. Agora é link E navega por SPA — as duas coisas medidas aqui.
    nome: 'menu lateral do produtor',
    landmark: 'Navegação principal',
    ancoras: 6,
    atual: 'Visão Geral',
    // A moldura ≥ lg é o SidebarRail (HIFI-REC), e ele traz DOIS botões que
    // não são destino:
    //   · 'Abrir menu' — o toggle que abre/recolhe o rail. Ação pura.
    //   · 'Marina Castelo' — o rodapé de perfil, TRIGGER do popover do perfil
    //     (DELTA-UX-T4 · D-1008-R6): aria-haspopup/aria-expanded + aria-label
    //     com o nome da sessão, rail fechado E aberto. A dívida F5 morreu
    //     aqui pelas duas metades: o botão deixou de ser destino de navegação
    //     (abre menu, semântica certa de button) e deixou de ficar SEM nome
    //     acessível fechado (a entrada '' que este inventário declarava).
    botoesQueNaoSaoDestino: ['Abrir menu', 'Marina Castelo'],
    montar: () =>
      void render(
        <MemoryRouter initialEntries={['/']}>
          <RootShell>
            <Sonda />
          </RootShell>
        </MemoryRouter>,
      ),
  },
  // ---------------------------------------------------------------------------
  // LEELA-DEBT-T4 — as duas últimas superfícies fora da tabela (H7).
  //
  // Nasceram na rodada IA-MENU navegando por `onClick` sem `href`: nunca
  // recarregaram o documento, e por isso a lane NAV-FIX as deixou de fora, num
  // bloco separado que só registrava "zero âncoras". Esse bloco some agora, e
  // ele era a parte FRACA da prova — afirmava a ausência de links. Como abas
  // de verdade, as duas passam pelas cinco asserções da tabela: contagem exata,
  // cancelar o default, apontar para rota interna, LEVAR ao destino do próprio
  // href e marcar um único "onde estou". O inventário para de registrar
  // 0-âncoras nelas porque elas deixaram de ter zero.
  // ---------------------------------------------------------------------------
  {
    nome: 'abas do CRM',
    landmark: 'Seções de CRM',
    ancoras: 3,
    atual: 'Visão geral',
    montar: () =>
      void render(
        <MemoryRouter initialEntries={['/crm']}>
          <CrmSubNav />
          <Sonda />
        </MemoryRouter>,
      ),
  },
  {
    nome: 'abas do hub de Eventos',
    landmark: 'Seções de Eventos',
    ancoras: 2,
    atual: 'Eventos',
    montar: () =>
      void render(
        <MemoryRouter initialEntries={['/eventos']}>
          <EventosHubSubNav />
          <Sonda />
        </MemoryRouter>,
      ),
  },
];

describe('gate de navegação SPA — nenhuma superfície recarrega o documento', () => {
  it.each(SUPERFICIES)('$nome: renderiza exatamente $ancoras âncora(s)', ({ landmark, ancoras, montar }) => {
    montar();
    const nav = screen.getByRole('navigation', { name: landmark });
    expect(within(nav).getAllByRole('link')).toHaveLength(ancoras);
  });

  it.each(SUPERFICIES)(
    '$nome: TODA âncora cancela o default no clique simples',
    ({ landmark, montar }) => {
      montar();
      const nav = screen.getByRole('navigation', { name: landmark });
      for (const ancora of within(nav).getAllByRole('link')) {
        const evento = clicarNoDom(ancora);
        expect(
          evento.defaultPrevented,
          `"${ancora.textContent ?? ''}" (${ancora.getAttribute('href') ?? '?'}) tem href sem ` +
            'onClick que faça preventDefault — o clique recarrega o documento inteiro',
        ).toBe(true);
      }
    },
  );

  it.each(SUPERFICIES)('$nome: toda âncora aponta para uma rota interna', ({ landmark, montar }) => {
    montar();
    const nav = screen.getByRole('navigation', { name: landmark });
    for (const ancora of within(nav).getAllByRole('link')) {
      const href = ancora.getAttribute('href');
      // Rota interna começa com "/" — o par href↔navigate é o mesmo destino, e
      // é o href que faz ctrl+clique e "copiar endereço do link" funcionarem.
      expect(href, `âncora "${ancora.textContent ?? ''}" sem href`).toMatch(/^\//);
    }
  });

  // -------------------------------------------------------------------------
  // LEELA-NAVFIX-REV — as duas metades que faltavam ao gate.
  // -------------------------------------------------------------------------

  it.each(SUPERFICIES)(
    '$nome: TODA âncora LEVA ao destino do próprio href (aba viva, não só silenciada)',
    ({ landmark, montar }) => {
      montar();
      const nav = screen.getByRole('navigation', { name: landmark });
      for (const ancora of within(nav).getAllByRole('link')) {
        const href = ancora.getAttribute('href') ?? '?';
        clicarNoDom(ancora);
        // `defaultPrevented` sozinho não distingue "navega por SPA" de "clique
        // não faz nada": um handler que só cancelasse o default passaria no
        // teste acima com a aba MORTA. Aqui a rota do router tem de virar o
        // href — as duas metades do contrato, medidas separadamente.
        expect(
          screen.getByTestId('rota-gate').textContent,
          `"${ancora.textContent ?? ''}" cancela o default mas não navega para ${href}`,
        ).toBe(href);
      }
    },
  );

  it.each(SUPERFICIES)(
    '$nome: exatamente um "aria-current=page", e é "$atual"',
    ({ landmark, atual, montar }) => {
      montar();
      const nav = screen.getByRole('navigation', { name: landmark });
      const marcados = Array.from(nav.querySelectorAll('[aria-current="page"]'));
      expect(
        marcados.map((e) => e.textContent),
        'a superfície tem de dizer ONDE a pessoa está — uma marca, nem zero nem duas',
      ).toHaveLength(1);
      expect(marcados[0]?.textContent).toContain(atual);
    },
  );
});

// ---------------------------------------------------------------------------
// LEELA-NAVFIX-REV — o menu lateral era a metade ESPELHADA do defeito e é a
// superfície mais usada do painel. As duas pontas do conserto ficavam provadas
// só por composição: a tabela de dublê no construtor puro (shell/sidebar.ts) e
// a presença do `href` no DOM, em testes diferentes. Aqui elas se encontram no
// mesmo elemento renderizado.
// ---------------------------------------------------------------------------

describe('menu lateral do produtor — as duas pontas no mesmo elemento', () => {
  function itemDoMenu(rotulo: string): HTMLElement {
    render(
      <MemoryRouter initialEntries={['/']}>
        <RootShell>
          <Sonda />
        </RootShell>
      </MemoryRouter>,
    );
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    return within(nav).getByRole('link', { name: new RegExp(rotulo) });
  }

  it('clique simples: cancela o default E troca a rota sem recarregar', () => {
    const item = itemDoMenu('Eventos');
    expect(item).toHaveAttribute('href', '/eventos');
    const evento = clicarNoDom(item);
    expect(evento.defaultPrevented).toBe(true);
    // Igualdade exata, não `toHaveTextContent`: substring deixaria "/" passar
    // por "/eventos" e a asserção ficaria decorativa.
    expect(screen.getByTestId('rota-gate').textContent).toBe('/eventos');
  });

  it.each([
    ['ctrl+clique', { ctrlKey: true }],
    ['cmd+clique', { metaKey: true }],
    ['shift+clique', { shiftKey: true }],
    ['clique do meio', { button: 1 }],
  ])('%s: nada interceptado — o href é quem abre a aba/janela nova', (_nome, init) => {
    // Nota de leitura do log: o jsdom emite "Not implemented: navigation" aqui.
    // É esperado e é a PROVA de que o default sobreviveu ao handler — num
    // navegador de verdade é este o ponto em que a aba nova abre.
    const item = itemDoMenu('Eventos');
    const evento = clicarNoDom(item, init);
    expect(evento.defaultPrevented).toBe(false);
    // A rota da SPA não mudou: quem abre em outro lugar é o navegador, não nós.
    expect(screen.getByTestId('rota-gate').textContent).toBe('/');
  });
});

// ---------------------------------------------------------------------------
// LEELA-DEBT-T4 — não sobra superfície de navegação fora da tabela.
//
// As duas SubNavs da rodada IA-MENU eram a última exceção: navegavam por
// `onClick` sem `href` e viviam num bloco à parte que só media a AUSÊNCIA de
// links. Elas entraram na tabela acima como abas de verdade. Esta asserção é o
// que impede a exceção de voltar: um `<button>` dentro de uma barra de
// navegação é, por definição, um destino que a pessoa não consegue abrir em
// outra aba nem copiar.
// ---------------------------------------------------------------------------

describe('nenhuma superfície de navegação navega por botão', () => {
  it.each(SUPERFICIES)(
    '$nome: todo destino é âncora — só sobram os botões declarados',
    ({ landmark, botoesQueNaoSaoDestino = [], montar }) => {
      montar();
      const nav = screen.getByRole('navigation', { name: landmark });
      expect(
        within(nav).queryAllByRole('button').map((b) => nomeAcessivel(b)),
        'destino de navegação em <button> não abre em nova aba nem copia endereço — ' +
          'se este botão realmente não é destino, declare-o em botoesQueNaoSaoDestino',
      ).toEqual(botoesQueNaoSaoDestino);
    },
  );
});

// ---------------------------------------------------------------------------
// A-7 (LEELA-DEBT-T5) — clicar na aba ATIVA não empilha histórico.
//
// O sintoma era do lado de fora do app: a pessoa clicava algumas vezes na aba
// em que já estava (por hábito, ou porque a tela demorou), e o Voltar do
// navegador passava a repetir a MESMA tela uma vez por clique antes de
// finalmente sair dali. Nenhum teste de handler pega isso — só um histórico de
// verdade. Por isso este caso monta um router com pilha e volta nela.
// ---------------------------------------------------------------------------

/** Botão que aciona o voltar do router — o histórico é medido, não presumido. */
function Voltar(): JSX.Element {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(-1)}>
      voltar
    </button>
  );
}

describe('A-7 — clicar na aba ativa não empilha histórico', () => {
  it('três cliques na aba ativa do CRM: um Voltar já sai da tela', () => {
    render(
      // A pessoa veio de /eventos e está em /crm — o topo da pilha é /crm.
      <MemoryRouter initialEntries={['/eventos', '/crm']} initialIndex={1}>
        <CrmSubNav />
        <Voltar />
        <Sonda />
      </MemoryRouter>,
    );
    const abaAtiva = screen.getByRole('link', { name: 'Visão geral' });
    clicarNoDom(abaAtiva);
    clicarNoDom(abaAtiva);
    clicarNoDom(abaAtiva);
    expect(screen.getByTestId('rota-gate').textContent).toBe('/crm');

    clicarNoDom(screen.getByRole('button', { name: 'voltar' }));
    // Com push, os três cliques teriam empilhado /crm três vezes e este Voltar
    // devolveria /crm. Com replace, o passo anterior é o de verdade.
    expect(screen.getByTestId('rota-gate').textContent).toBe('/eventos');
  });

  it('aba NÃO ativa segue empilhando — o Voltar continua desfazendo a ida', () => {
    render(
      <MemoryRouter initialEntries={['/crm']}>
        <CrmSubNav />
        <Voltar />
        <Sonda />
      </MemoryRouter>,
    );
    clicarNoDom(screen.getByRole('link', { name: 'Clientes' }));
    expect(screen.getByTestId('rota-gate').textContent).toBe('/crm/clientes');

    clicarNoDom(screen.getByRole('button', { name: 'voltar' }));
    expect(screen.getByTestId('rota-gate').textContent).toBe('/crm');
  });

  it('menu lateral: clicar no item da rota atual também não empilha', () => {
    render(
      <MemoryRouter initialEntries={['/clubes', '/eventos']} initialIndex={1}>
        <RootShell>
          <Voltar />
          <Sonda />
        </RootShell>
      </MemoryRouter>,
    );
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    const itemAtivo = within(nav).getByRole('link', { name: /Eventos/ });
    clicarNoDom(itemAtivo);
    clicarNoDom(itemAtivo);
    expect(screen.getByTestId('rota-gate').textContent).toBe('/eventos');

    clicarNoDom(screen.getByRole('button', { name: 'voltar' }));
    expect(screen.getByTestId('rota-gate').textContent).toBe('/clubes');
  });
});
