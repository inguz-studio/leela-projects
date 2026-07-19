import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { EventoShell } from '../EventoShell';
import { linkEventoPublico } from '../../../../lib/linkPublico';
import { mkEvento } from '../../_test/fixtures';

describe('EventoShell', () => {
  it('renderiza header 96px com nome e badge de status', () => {
    render(
      <EventoShell evento={mkEvento()} ativa="overview">
        <p>conteúdo</p>
      </EventoShell>,
    );
    expect(screen.getByRole('heading', { level: 1, name: /Meia Maratona Floripa 2026/i })).toBeInTheDocument();
    expect(screen.getByText('Publicado')).toBeInTheDocument();
    expect(screen.getByText('453 inscritos')).toBeInTheDocument();
  });

  it('marca a aba ativa da sub-nav com aria-current', () => {
    render(
      <EventoShell evento={mkEvento()} ativa="inscritos">
        <p>conteúdo</p>
      </EventoShell>,
    );
    const inscritos = screen.getByRole('link', { name: /Inscritos/i });
    expect(inscritos).toHaveAttribute('aria-current', 'page');
    const overview = screen.getByRole('link', { name: 'Visão geral' });
    expect(overview).not.toHaveAttribute('aria-current');
  });

  it('mostra o contador pill de inscritos na sub-nav', () => {
    render(
      <EventoShell evento={mkEvento({ qtdInscritos: 453 })} ativa="overview">
        <p>c</p>
      </EventoShell>,
    );
    // O pill da sub-nav mostra "453" isolado (o metadata do header é "453 inscritos").
    expect(screen.getByText('453')).toBeInTheDocument();
  });

  it('renderiza o conteúdo (children)', () => {
    render(
      <EventoShell evento={mkEvento()} ativa="overview">
        <p>conteúdo do overview</p>
      </EventoShell>,
    );
    expect(screen.getByText('conteúdo do overview')).toBeInTheDocument();
  });

  it('aplica a divisória padrão na sub-nav (RN-229 · DEC-0719 item 21)', () => {
    render(
      <EventoShell evento={mkEvento()} ativa="overview">
        <p>c</p>
      </EventoShell>,
    );
    // A divisória é o border-b em --border-subtle do SubNav (mesmo token/padrão
    // das terciárias de eventos desde R9-A/PAINEL-S8-FIX).
    expect(screen.getByRole('navigation', { name: 'Seções do evento' })).toHaveClass('border-b');
  });

  it('mostra o breadcrumb "Eventos › {nome}" com link de volta', () => {
    render(
      <EventoShell evento={mkEvento()} ativa="overview">
        <p>c</p>
      </EventoShell>,
    );
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i });
    const voltar = within(nav).getByRole('link', { name: 'Eventos' });
    expect(voltar).toHaveAttribute('href', '/eventos');
    expect(within(nav).getByText('Meia Maratona Floripa 2026')).toBeInTheDocument();
  });

  it('expõe as ações do header: "Ver página pública" e menu "…"', () => {
    render(
      <EventoShell evento={mkEvento()} ativa="overview">
        <p>c</p>
      </EventoShell>,
    );
    expect(screen.getByRole('button', { name: /ver página pública/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mais ações do evento/i })).toBeInTheDocument();
  });

  describe('"Ver página pública" — link e honestidade por status', () => {
    afterEach(() => vi.restoreAllMocks());

    it('evento publicado: abre a landing na RAIZ (sem /e/), _blank + noopener', () => {
      const open = vi.spyOn(window, 'open').mockImplementation(() => null);
      render(
        <EventoShell evento={mkEvento({ status: 'publicado' })} ativa="overview">
          <p>c</p>
        </EventoShell>,
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
        <EventoShell evento={mkEvento({ status: 'rascunho' })} ativa="overview">
          <p>c</p>
        </EventoShell>,
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
