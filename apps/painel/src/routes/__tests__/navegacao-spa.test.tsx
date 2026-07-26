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
import { MemoryRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';

import { EventoShell } from '../eventos/evento/EventoShell';
import { ClubeShell } from '../clubes/clube/ClubeShell';
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
  {
    nome: 'abas do clube',
    landmark: 'Seções do clube',
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
    montar: () =>
      void render(
        <MemoryRouter initialEntries={['/']}>
          <RootShell>
            <Sonda />
          </RootShell>
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
// A outra metade do padrão: as duas SubNavs nascidas na rodada IA-MENU navegam
// por `onClick` SEM `href`. Nunca recarregaram o documento — não são o defeito
// desta lane. Mas também não são links: sem ctrl+clique, sem clique do meio,
// sem "copiar endereço do link". É a ponta invertida (H7) que sobra depois de
// T1-T3 e que vale um card próprio; ficam registradas aqui para o inventário
// não mentir sobre o que está fiado e o que não está.
// ---------------------------------------------------------------------------

const SEM_ANCORA: Array<{ nome: string; landmark: string; abas: number; montar: () => void }> = [
  {
    nome: 'abas do CRM',
    landmark: 'Seções de CRM',
    abas: 3,
    montar: () =>
      void render(
        <MemoryRouter initialEntries={['/crm']}>
          <CrmSubNav />
        </MemoryRouter>,
      ),
  },
  {
    nome: 'abas do hub de Eventos',
    landmark: 'Seções de Eventos',
    abas: 2,
    montar: () =>
      void render(
        <MemoryRouter initialEntries={['/eventos']}>
          <EventosHubSubNav />
        </MemoryRouter>,
      ),
  },
];

describe('superfícies que navegam por onClick, sem href (padrão IA-MENU)', () => {
  it.each(SEM_ANCORA)(
    '$nome: nenhuma âncora — logo, nada a recarregar (mas também não é link)',
    ({ landmark, abas, montar }) => {
      montar();
      const nav = screen.getByRole('navigation', { name: landmark });
      expect(within(nav).queryAllByRole('link')).toHaveLength(0);
      expect(within(nav).getAllByRole('button')).toHaveLength(abas);
    },
  );
});
