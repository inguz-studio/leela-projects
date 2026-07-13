import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { secoesVendasPadrao, type SeoVendas } from '@leela/core';
import { PaginaVendasView } from '../PaginaVendasView';
import { mkEvento } from '../../_test/fixtures';

const SEO: SeoVendas = {
  titulo: 'Meia Maratona Floripa 2026',
  descricao: 'A prova mais bonita do sul.',
  slugAmigavel: '{DOMINIO_LEELA}/meia-floripa-2026',
};

function renderView(over: Partial<Parameters<typeof PaginaVendasView>[0]> = {}) {
  return render(
    <PaginaVendasView
      evento={mkEvento()}
      loading={false}
      error={null}
      secoes={secoesVendasPadrao()}
      seo={SEO}
      publicada={false}
      isNovo={false}
      onToggleSecao={vi.fn()}
      onSalvarSeo={vi.fn()}
      onPublicar={vi.fn()}
      onDespublicar={vi.fn()}
      {...over}
    />,
  );
}

describe('PaginaVendasView', () => {
  it('mostra os 3 grupos de seções (essenciais, landing, sistema)', () => {
    renderView();
    expect(screen.getByRole('region', { name: /Essenciais/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Só landing pública/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /^Sistema$/i })).toBeInTheDocument();
  });

  it('trava o checkout: switch desabilitado e marcado como sempre ativa', () => {
    renderView();
    const sistema = screen.getByRole('region', { name: /^Sistema$/i });
    expect(within(sistema).getByText(/Sempre ativa/i)).toBeInTheDocument();
    const checkoutSwitch = within(sistema).getByRole('switch', { name: /não pode desligar/i });
    expect(checkoutSwitch).toBeDisabled();
  });

  it('toggle de uma seção não travada chama onToggleSecao', () => {
    const onToggleSecao = vi.fn();
    renderView({ onToggleSecao });
    // "Depoimentos" nasce desligada (canal landing) → ligar dispara handler.
    const toggle = screen.getByRole('switch', { name: /Ativar seção Depoimentos/i });
    fireEvent.click(toggle);
    expect(onToggleSecao).toHaveBeenCalledWith('depoimentos', true);
  });

  it('SEO: URL amigável read-only usa {DOMINIO_LEELA} e nunca be-hero', () => {
    renderView();
    const url = screen.getByText(/\{DOMINIO_LEELA\}\/meia-floripa-2026/);
    expect(url).toBeInTheDocument();
    expect(screen.queryByText(/be-hero/i)).not.toBeInTheDocument();
  });

  it('SEO: editar um campo habilita Salvar e envia o payload', () => {
    const onSalvarSeo = vi.fn();
    renderView({ onSalvarSeo });
    const salvar = screen.getByRole('button', { name: /Salvar SEO/i });
    // Sem alteração, o botão nasce desabilitado (nada sujo).
    expect(salvar).toBeDisabled();
    const titulo = screen.getByLabelText(/Título da página/i);
    fireEvent.change(titulo, { target: { value: 'Novo título' } });
    expect(salvar).toBeEnabled();
    fireEvent.click(salvar);
    expect(onSalvarSeo).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Novo título', descricao: SEO.descricao }),
    );
  });

  it('publicação: rascunho mostra Publicar; publicada mostra Despublicar', () => {
    const onPublicar = vi.fn();
    const { rerender } = renderView({ onPublicar });
    const publicar = screen.getByRole('button', { name: /Publicar página/i });
    fireEvent.click(publicar);
    expect(onPublicar).toHaveBeenCalled();

    rerender(
      <PaginaVendasView
        evento={mkEvento()}
        loading={false}
        error={null}
        secoes={secoesVendasPadrao()}
        seo={SEO}
        publicada
        isNovo={false}
        onToggleSecao={vi.fn()}
        onSalvarSeo={vi.fn()}
        onPublicar={vi.fn()}
        onDespublicar={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /Despublicar/i })).toBeInTheDocument();
  });

  it('estado de carregamento mostra skeleton', () => {
    renderView({ loading: true });
    expect(
      screen.getByRole('status', { name: /Carregando página de vendas/i }),
    ).toBeInTheDocument();
  });

  it('erro mostra EmptyState honesto', () => {
    renderView({ error: new Error('falha') });
    expect(screen.getByText(/Não foi possível carregar a página de vendas/i)).toBeInTheDocument();
  });
});
