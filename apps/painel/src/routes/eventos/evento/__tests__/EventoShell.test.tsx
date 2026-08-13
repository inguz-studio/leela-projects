import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
// LEELA-NAVFIX-T2: a casca passou a fiar `preventDefault` + `navigate` nas abas
// e no breadcrumb, então precisa de um Router em volta. As asserções abaixo são
// as mesmas de antes — só o invólucro mudou.
import { MemoryRouter, useLocation } from 'react-router-dom';
import { EventoShell } from '../EventoShell';
import { linkEventoPublico } from '../../../../lib/linkPublico';
import { mkEvento } from '../../_test/fixtures';
import type { EventoAbaId } from '../../_lib/subnav';
import { clicarNoDom } from '../../../../test/clique';

describe('EventoShell', () => {
  it('renderiza header 96px com nome e badge de status', () => {
    render(
      <MemoryRouter>
        <EventoShell evento={mkEvento()} ativa="overview">
          <p>conteúdo</p>
        </EventoShell>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: /Meia Maratona Floripa 2026/i })).toBeInTheDocument();
    expect(screen.getByText('Publicado')).toBeInTheDocument();
    expect(screen.getByText('453 inscritos')).toBeInTheDocument();
  });

  it('marca a aba ativa da sub-nav com aria-current', () => {
    render(
      <MemoryRouter>
        <EventoShell evento={mkEvento()} ativa="inscritos">
          <p>conteúdo</p>
        </EventoShell>
      </MemoryRouter>,
    );
    const inscritos = screen.getByRole('link', { name: /Inscritos/i });
    expect(inscritos).toHaveAttribute('aria-current', 'page');
    const overview = screen.getByRole('link', { name: 'Visão geral' });
    expect(overview).not.toHaveAttribute('aria-current');
  });

  it('mostra o contador pill de inscritos na sub-nav', () => {
    render(
      <MemoryRouter>
        <EventoShell evento={mkEvento({ qtdInscritos: 453 })} ativa="overview">
          <p>c</p>
        </EventoShell>
      </MemoryRouter>,
    );
    // O pill da sub-nav mostra "453" isolado (o metadata do header é "453 inscritos").
    expect(screen.getByText('453')).toBeInTheDocument();
  });

  it('renderiza o conteúdo (children)', () => {
    render(
      <MemoryRouter>
        <EventoShell evento={mkEvento()} ativa="overview">
          <p>conteúdo do overview</p>
        </EventoShell>
      </MemoryRouter>,
    );
    expect(screen.getByText('conteúdo do overview')).toBeInTheDocument();
  });

  // LEVA 14 — a divisoria MORREU. O dono, na integra: *"o menu secundario de
  // clubs esta coreto, mas nas outras telas, a linha esta aparecendo, aonde os
  // seletores laranja ficam."* Este teste guardava a RN-229; agora guarda o
  // contrario, para a linha nao voltar por esta area.
  it('a sub-nav NÃO tem divisória — a linha morreu na Leva 14', () => {
    render(
      <MemoryRouter>
        <EventoShell evento={mkEvento()} ativa="overview">
          <p>c</p>
        </EventoShell>
      </MemoryRouter>,
    );
    // A divisória é o border-b em --border-subtle do SubNav (mesmo token/padrão
    // das terciárias de eventos desde R9-A/PAINEL-S8-FIX).
    const nav = screen.getByRole('navigation', { name: 'Seções do evento' });
    expect(nav).not.toHaveClass('border-b');
    expect(nav).toHaveClass('border-b-0');
  });

  it('o menu secundário do evento não mostra barra de rolagem em tablet/celular (frente F)', () => {
    // O dono pegou barra horizontal E vertical justamente NESTE menu ao
    // encolher o navegador — e já tinha pedido o conserto uma vez. A trava da
    // causa vive no primitivo (packages/design-system SubNav, com a nota da
    // cascata que fabricava a barra vertical); esta aqui garante que a barra
    // que ELE vê é a que recebeu o conserto — se alguém trocar o SubNav por
    // outro container nesta casca, o defeito volta sem tocar no DS.
    render(
      <MemoryRouter>
        <EventoShell evento={mkEvento()} ativa="overview">
          <p>c</p>
        </EventoShell>
      </MemoryRouter>,
    );
    const subnav = screen.getByRole('navigation', { name: 'Seções do evento' });
    expect(subnav).toHaveClass('overflow-x-auto');
    expect(subnav).toHaveClass('[scrollbar-width:none]');
    expect(subnav).toHaveClass('[&::-webkit-scrollbar]:hidden');
    expect(subnav).toHaveClass('overflow-y-hidden');
  });

  it('mostra o breadcrumb "Eventos › {nome}" com link de volta', () => {
    render(
      <MemoryRouter>
        <EventoShell evento={mkEvento()} ativa="overview">
          <p>c</p>
        </EventoShell>
      </MemoryRouter>,
    );
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i });
    const voltar = within(nav).getByRole('link', { name: 'Eventos' });
    expect(voltar).toHaveAttribute('href', '/eventos');
    expect(within(nav).getByText('Meia Maratona Floripa 2026')).toBeInTheDocument();
  });

  it('expõe as ações do header: "Ver página pública" e menu "…"', () => {
    render(
      <MemoryRouter>
        <EventoShell evento={mkEvento()} ativa="overview">
          <p>c</p>
        </EventoShell>
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /ver página pública/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mais ações do evento/i })).toBeInTheDocument();
  });

  describe('"Ver página pública" — link e honestidade por status', () => {
    afterEach(() => vi.restoreAllMocks());

    it('evento publicado: abre a landing na RAIZ (sem /e/), _blank + noopener', () => {
      const open = vi.spyOn(window, 'open').mockImplementation(() => null);
      render(
        <MemoryRouter>
          <EventoShell evento={mkEvento({ status: 'publicado' })} ativa="overview">
            <p>c</p>
          </EventoShell>
        </MemoryRouter>,
      );
      const botao = screen.getByRole('button', { name: /ver página pública/i });
      expect(botao).not.toBeDisabled();
      fireEvent.click(botao);
      const urlAberta = linkEventoPublico('meia-floripa-2026');
      expect(open).toHaveBeenCalledWith(urlAberta, '_blank', 'noopener');
      expect(urlAberta).not.toContain('/e/');
    });

    it('evento rascunho: botão desabilitado, com tooltip explicando (a landing daria 404)', () => {
      const open = vi.spyOn(window, 'open').mockImplementation(() => null);
      render(
        <MemoryRouter>
          <EventoShell evento={mkEvento({ status: 'rascunho' })} ativa="overview">
            <p>c</p>
          </EventoShell>
        </MemoryRouter>,
      );
      const botao = screen.getByRole('button', { name: /ver página pública/i });
      expect(botao).toBeDisabled();
      expect(botao.closest('[title]')).toHaveAttribute(
        'title',
        'Publique o evento para ver a página pública.',
      );
      fireEvent.click(botao);
      expect(open).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// LEELA-NAVFIX-T2 — a casca com as DUAS superfícies de navegação (sub-nav do
// evento + breadcrumb). Era daqui que saía o "parece que entrei num site novo":
// cada aba era `<a href>` cru e o clique recarregava o documento inteiro.
// ---------------------------------------------------------------------------

describe('EventoShell — navegação SPA (LEELA-NAVFIX-T2)', () => {
  const SLUG = 'meia-floripa-2026';

  function Sonda(): JSX.Element {
    const { pathname } = useLocation();
    return <div data-testid="rota">{pathname}</div>;
  }

  function montar(ativa: EventoAbaId = 'overview'): void {
    render(
      <MemoryRouter initialEntries={[`/eventos/${SLUG}`]}>
        <EventoShell evento={mkEvento()} ativa={ativa}>
          <p>c</p>
        </EventoShell>
        <Sonda />
      </MemoryRouter>,
    );
  }

  it('clique numa aba navega por SPA — o default é cancelado, sem carga de documento', () => {
    montar();
    const aba = screen.getByRole('link', { name: /Inscritos/i });
    const evento = clicarNoDom(aba);

    // `defaultPrevented` é a prova: o `<a href>` só recarrega a página quando o
    // default sobrevive ao handler.
    expect(evento.defaultPrevented).toBe(true);
    expect(screen.getByTestId('rota')).toHaveTextContent(`/eventos/${SLUG}/inscritos`);
    // E o href continua lá — a aba não virou botão.
    expect(aba).toHaveAttribute('href', `/eventos/${SLUG}/inscritos`);
  });

  it('ctrl+clique numa aba preserva o comportamento de link (nada interceptado)', () => {
    // Nota de leitura do log: o jsdom emite "Not implemented: navigation" nos
    // dois casos de ctrl/cmd+clique deste arquivo. É esperado e é a PROVA de
    // que o default sobreviveu ao handler — num navegador de verdade esse é o
    // ponto em que a aba nova abre. Emitido fora do tick do teste (setTimeout
    // interno do jsdom), então não dá para silenciar por spy sem mentir.
    montar();
    const aba = screen.getByRole('link', { name: /Inscritos/i });
    const evento = clicarNoDom(aba, { ctrlKey: true });

    expect(evento.defaultPrevented).toBe(false);
    // A rota da SPA não mudou: quem abre a aba nova é o navegador, não nós.
    expect(screen.getByTestId('rota')).toHaveTextContent(`/eventos/${SLUG}`);
  });

  it('breadcrumb "Eventos" navega por SPA — mesmo contrato das abas', () => {
    montar();
    const trilha = screen.getByRole('navigation', { name: /breadcrumb/i });
    const voltar = within(trilha).getByRole('link', { name: 'Eventos' });
    const evento = clicarNoDom(voltar);

    expect(evento.defaultPrevented).toBe(true);
    expect(screen.getByTestId('rota')).toHaveTextContent('/eventos');
    expect(voltar).toHaveAttribute('href', '/eventos');
  });

  it('cmd+clique no breadcrumb idem — o link continua link', () => {
    montar();
    const trilha = screen.getByRole('navigation', { name: /breadcrumb/i });
    const evento = clicarNoDom(within(trilha).getByRole('link', { name: 'Eventos' }), {
      metaKey: true,
    });

    expect(evento.defaultPrevented).toBe(false);
    expect(screen.getByTestId('rota')).toHaveTextContent(`/eventos/${SLUG}`);
  });

  it('TODA aba da sub-nav é link E cancela o default (nenhuma sobra crua)', () => {
    montar();
    const subnav = screen.getByRole('navigation', { name: 'Seções do evento' });
    const abas = within(subnav).getAllByRole('link');
    // As 10 abas do evento (subnav.ts) — se alguém acrescentar uma sem fiação,
    // o laço abaixo acusa.
    expect(abas).toHaveLength(10);
    for (const aba of abas) {
      const evento = clicarNoDom(aba);
      expect(evento.defaultPrevented, `aba "${aba.textContent ?? ''}" recarrega o documento`).toBe(
        true,
      );
    }
  });
});
